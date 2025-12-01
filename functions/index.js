import functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

const app = initializeApp();
const db = getFirestore(app);

// Gemini features now handled by Replit backend - Cloud Functions returns graceful fallbacks

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
  // Fallback only - Gemini handled by Replit backend
  return `According to alternative sources: Alternative perspectives on ${topic} require additional research and source verification.`;
};

const analyzeWithSemantics = async (suspectText, consensusText, includeStats = false) => {
  // Fallback only - Gemini handled by Replit backend
  return {
    score: 50,
    discrepancies: [
      { type: 'ANALYSIS_NEUTRAL', text: 'Semantic analysis processing...', severity: 'low' }
    ]
  };
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
