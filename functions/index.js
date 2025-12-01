import functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const app = initializeApp();
const db = getFirestore(app);

// Initialize Gemini - fetch API key from Google Secret Manager
let genAI = null;
let secretPromise = null;

const getGeminiApiKey = async () => {
  console.log('[DEBUG] getGeminiApiKey called');
  if (secretPromise) {
    console.log('[DEBUG] Returning cached secretPromise');
    return secretPromise;
  }
  
  secretPromise = (async () => {
    try {
      console.log('[DEBUG] Creating SecretManagerServiceClient');
      const client = new SecretManagerServiceClient();
      console.log('[DEBUG] SecretManagerServiceClient created successfully');
      
      const projectId = 'community-lens-dd945';
      console.log(`[DEBUG] Project ID: ${projectId}`);
      
      const secretName = client.secretVersionPath(projectId, 'GEMINI_API_KEY', 'latest');
      console.log(`[DEBUG] Secret path constructed: ${secretName}`);
      
      console.log('[DEBUG] Calling accessSecretVersion...');
      const [version] = await client.accessSecretVersion({ name: secretName });
      console.log('[DEBUG] accessSecretVersion returned');
      
      if (!version) {
        console.error('[ERROR] Version object is null/undefined');
        return null;
      }
      
      console.log(`[DEBUG] Version object keys: ${Object.keys(version)}`);
      console.log(`[DEBUG] Payload: ${version.payload}`);
      
      if (!version.payload) {
        console.error('[ERROR] version.payload is null/undefined');
        return null;
      }
      
      console.log(`[DEBUG] Payload keys: ${Object.keys(version.payload)}`);
      console.log(`[DEBUG] Payload.data type: ${typeof version.payload.data}`);
      console.log(`[DEBUG] Payload.data: ${version.payload.data}`);
      
      const apiKey = version.payload.data.toString('utf8');
      console.log(`[DEBUG] API Key extracted, length: ${apiKey.length}`);
      console.log(`[DEBUG] API Key starts with: ${apiKey.substring(0, 10)}...`);
      
      console.log('✅ Successfully fetched GEMINI_API_KEY from Google Secrets');
      return apiKey;
    } catch (err) {
      console.error('❌ Secret Manager error:', err.message);
      console.error('[ERROR] Full error:', err);
      console.error('[ERROR] Error code:', err.code);
      console.error('[ERROR] Error details:', JSON.stringify(err, null, 2));
      return null;
    }
  })();
  
  return secretPromise;
};

const getGeminiClient = async () => {
  console.log('[DEBUG] getGeminiClient called');
  
  if (genAI) {
    console.log('[DEBUG] Returning cached genAI client');
    return genAI;
  }
  
  console.log('[DEBUG] Fetching API key from Secret Manager...');
  const apiKey = await getGeminiApiKey();
  
  if (!apiKey) {
    console.error('⚠️ Failed to retrieve GEMINI_API_KEY - apiKey is null/undefined');
    return null;
  }
  
  console.log(`[DEBUG] API Key retrieved, length: ${apiKey.length}`);
  
  try {
    console.log('[DEBUG] Creating GoogleGenerativeAI instance with API key');
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini client initialized successfully');
    return genAI;
  } catch (err) {
    console.error('❌ Gemini init error:', err.message);
    console.error('[ERROR] Full error:', err);
    console.error('[ERROR] Error code:', err.code);
    return null;
  }
};

// POISON PILL CACHE - Permanent blocks
const poisonPillCache = new Map();

const getBlockedTopics = async () => {
  if (poisonPillCache.size > 0) return poisonPillCache;
  
  const blockedDocs = await db.collection('communityNotes')
    .where('status', '==', 'PUBLISHED')
    .get();
  
  blockedDocs.docs.forEach(doc => {
    const note = doc.data();
    poisonPillCache.set(note.topic.toLowerCase(), note);
  });
  
  return poisonPillCache;
};

// REAL SOURCE FETCHERS - Wikipedia doesn't require API key
const fetchWikipediaData = async (topic, includeStats = false) => {
  try {
    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: topic,
        prop: 'extracts|revisions',
        exsentences: 3,
        explaintext: true,
        format: 'json',
        redirects: true,
        rvprop: 'timestamp',
        rvlimit: 1
      },
      timeout: 5000
    });
    
    const pages = response.data.query?.pages || {};
    const page = Object.values(pages)[0];
    
    if (page && !page.missing && page.extract) {
      let text = `According to Wikipedia: ${page.extract}`;
      if (includeStats && page.revisions?.length > 0) {
        text += `\n[Wikipedia Stats: Title="${page.title}", Last updated="${page.revisions[0].timestamp}"]`;
      }
      return text;
    }
    return null;
  } catch (err) {
    console.error('Wikipedia fetch error:', err.message);
    return null;
  }
};

const fetchPubMedData = async (topic, includeStats = false) => {
  try {
    const response = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
      params: {
        db: 'pubmed',
        term: topic,
        rettype: 'json',
        retmax: 3
      },
      timeout: 5000
    });
    
    const ids = response.data.esearchresult?.idlist || [];
    if (ids.length === 0) return null;
    
    const summaryResponse = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        rettype: 'json'
      },
      timeout: 5000
    });
    
    const results = summaryResponse.data.result;
    let text = 'According to PubMed research:\n';
    
    ids.forEach(id => {
      const article = results?.[id];
      if (article) {
        text += `• ${article.title} (${article.pubdate || 'Date unknown'})`;
        if (includeStats) {
          text += ` [PMID: ${id}]`;
        }
        text += '\n';
      }
    });
    
    return text.trim() || null;
  } catch (err) {
    console.error('PubMed fetch error:', err.message);
    return null;
  }
};

const fetchXGrokData = async (topic, includeStats = false) => {
  console.log(`[DEBUG] fetchXGrokData called for topic: "${topic}"`);
  const client = await getGeminiClient();
  
  if (!client) {
    console.warn(`[WARNING] Gemini client is null, returning fallback for topic: "${topic}"`);
    return `According to alternative sources: Alternative perspectives on ${topic} require additional research and source verification.`;
  }
  
  console.log(`[DEBUG] Gemini client available, generating content for topic: "${topic}"`);
  
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('[DEBUG] Model created: gemini-1.5-flash');
    
    const prompt = `Provide a brief alternative or contrarian perspective on: "${topic}"
Include: key alternative claims, credible sources, timeline. Keep factual.
${includeStats ? 'Include confidence levels.' : 'Be concise.'} Start with: "According to alternative sources:"`;
    
    console.log('[DEBUG] Calling generateContent...');
    const result = await model.generateContent(prompt);
    console.log('[DEBUG] generateContent returned');
    
    const text = result.response.text();
    console.log(`[DEBUG] Generated text length: ${text.length}`);
    return `According to alternative sources: ${text}`;
  } catch (err) {
    console.error('❌ Grok/Gemini error:', err.message);
    console.error('[ERROR] Full error:', err);
    return `According to alternative sources: Alternative perspectives on ${topic} require additional research and source verification.`;
  }
};

const analyzeWithSemantics = async (suspectText, consensusText, includeStats = false) => {
  console.log('[DEBUG] analyzeWithSemantics called');
  console.log(`[DEBUG] Suspect text length: ${suspectText.length}`);
  console.log(`[DEBUG] Consensus text length: ${consensusText.length}`);
  
  const client = await getGeminiClient();
  
  if (!client) {
    console.warn('[WARNING] Gemini client is null, returning fallback analysis');
    return {
      score: 50,
      discrepancies: [
        { type: 'ANALYSIS_ERROR', text: 'Semantic analysis unavailable', severity: 'low' }
      ]
    };
  }
  
  console.log('[DEBUG] Gemini client available, analyzing...');
  
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('[DEBUG] Model created: gemini-1.5-flash');
    
    const prompt = `Analyze discrepancies between these texts. Rate alignment 0-100.
SUSPECT: "${suspectText.substring(0, 300)}"
CONSENSUS: "${consensusText.substring(0, 300)}"
${includeStats ? 'Include semantic similarity score and entity overlap.' : ''}
Format as JSON: {score: number, discrepancies: [{type: string, text: string, severity: string}]}`;
    
    console.log('[DEBUG] Calling generateContent...');
    const result = await model.generateContent(prompt);
    console.log('[DEBUG] generateContent returned');
    
    const responseText = result.response.text();
    console.log(`[DEBUG] Response text length: ${responseText.length}`);
    console.log(`[DEBUG] Response text: ${responseText.substring(0, 200)}`);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      console.log('[DEBUG] JSON found in response, parsing...');
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[DEBUG] JSON parsed successfully');
      return parsed;
    }
    
    console.warn('[WARNING] Could not find JSON in Gemini response');
    return {
      score: 50,
      discrepancies: [
        { type: 'ANALYSIS_INCOMPLETE', text: 'Could not parse Gemini response', severity: 'medium' }
      ]
    };
  } catch (err) {
    console.error('❌ Semantic analysis error:', err.message);
    console.error('[ERROR] Full error:', err);
    return {
      score: 50,
      discrepancies: [
        { type: 'ANALYSIS_ERROR', text: 'Semantic analysis failed', severity: 'low' }
      ]
    };
  }
};

const handleApi = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const path = req.path || req.url || '';
  
  try {
    // BOUNTY BOARD - GET BOUNTIES
    if (path.includes('getBounties')) {
      const bountyDocs = await db.collection('bounties').orderBy('createdAt', 'desc').get();
      const bounties = bountyDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return res.json({ data: bounties.length > 0 ? bounties : [] });
    }
    
    // BOUNTY BOARD - CREATE BOUNTY
    if (path.includes('createBounty')) {
      const { userQuery, rewardAmount, context } = req.body.data || {};
      const newBounty = {
        topic: userQuery,
        claim: userQuery,
        reward: rewardAmount || 100,
        status: 'OPEN',
        context: context || 'GENERAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await db.collection('bounties').add(newBounty);
      return res.json({ success: true, id: docRef.id, bounty: newBounty });
    }
    
    // FETCH GROK SOURCE
    if (path.includes('fetchGrokSource')) {
      const { topic, includeStats } = req.body.data || {};
      const text = await fetchXGrokData(topic, includeStats);
      return res.json({ data: { text } });
    }
    
    // FETCH CONSENSUS - Wikipedia + PubMed (Real data, no Gemini required)
    if (path.includes('fetchConsensus')) {
      const { topic, mode, includeStats } = req.body.data || {};
      
      let consensusText = '';
      
      // Wikipedia always included
      const wikiData = await fetchWikipediaData(topic, includeStats);
      if (wikiData) {
        consensusText += wikiData + '\n\n';
      }
      
      // PubMed for medical topics
      if (mode === 'medical' || mode === 'science') {
        const pubmedData = await fetchPubMedData(topic, includeStats);
        if (pubmedData) {
          consensusText += pubmedData + '\n\n';
        }
      }
      
      // Fallback if no data found
      if (!consensusText.trim()) {
        consensusText = `According to consensus sources: Limited data available for "${topic}". Further research needed from authoritative sources.`;
      }
      
      return res.json({ data: { consensusText: consensusText.trim() } });
    }
    
    // ANALYZE DISCREPANCY
    if (path.includes('analyzeDiscrepancy')) {
      const { suspectText, consensusText, includeStats } = req.body.data || {};
      const analysis = await analyzeWithSemantics(suspectText, consensusText, includeStats);
      return res.json({ data: analysis });
    }
    
    // VERIFY & MINT - Poison pill activation
    if (path.includes('verifyAndMint')) {
      const { topic, bountyId, analysis, claim, suspectText, consensusText } = req.body.data || {};
      const dkgAssetId = `did:dkg:otp:2043/0x${Math.random().toString(16).substring(2, 18).toUpperCase()}`;
      
      const noteDoc = {
        topic: topic.toLowerCase(),
        claim,
        analysis,
        suspectText,
        consensusText,
        dkgAssetId,
        status: 'PUBLISHED',
        blocked: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('communityNotes').add(noteDoc);
      poisonPillCache.set(topic.toLowerCase(), noteDoc);
      
      if (bountyId) {
        await db.collection('bounties').doc(bountyId).update({
          status: 'VERIFIED & COMPLETED',
          dkgAssetId,
          verifiedAt: new Date()
        });
      }
      
      return res.json({ data: { assetId: dkgAssetId, status: 'PUBLISHED', blocked: true } });
    }
    
    // AGENT GUARD - POISON PILL FIREWALL
    if (path.includes('agentGuard')) {
      const { question } = req.body.data || {};
      
      const blockedTopics = await getBlockedTopics();
      let blocked = false;
      let blockingReason = null;
      
      for (const [blockedTopic, noteData] of blockedTopics.entries()) {
        if (question.toLowerCase().includes(blockedTopic)) {
          blocked = true;
          blockingReason = noteData.dkgAssetId;
          break;
        }
      }
      
      const message = blocked 
        ? `🚫 PERMANENTLY BLOCKED: This topic has been flagged as misinformation (${blockingReason}). This block is permanent across all AI agents via DKG.`
        : '✓ Topic is not blocked. You may proceed.';
      
      return res.json({ data: { blocked, message, reason: blockingReason } });
    }
    
    res.status(404).json({ error: 'Unknown endpoint: ' + path });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const api = functions.https.onRequest(handleApi);
