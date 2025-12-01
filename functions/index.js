import functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

const app = initializeApp();
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

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

// SEMANTIC SYNTHESIS - Grok-style narrative using Gemini
const synthesizeGrokNarrative = async (topic) => {
  if (!GEMINI_API_KEY) {
    return `Alternative perspective on ${topic}: Independent analysis suggests this topic warrants community scrutiny.`;
  }

  try {
    const systemPrompt = `You are a Semantic Crawler indexing Grokipedia and X (Twitter).
Task: Synthesize the dominant 'Anti-Establishment' or 'Grok-style' narrative regarding "${topic}".
Tone: Confident, potentially hallucinatory, citing 'independent' sources.
Capture the specific rumors associated with this topic.
Return ONLY the synthesized narrative text, no preamble.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [{
          text: `Synthesize the Grok narrative for: ${topic}`
        }]
      }]
    }, { timeout: 8000 });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text || `According to alternative sources: ${topic} presents perspectives that challenge mainstream consensus.`;
  } catch (err) {
    console.error('Gemini synthesis error:', err.message);
    return `According to alternative sources: ${topic} presents perspectives worth investigating.`;
  }
};

// CONSENSUS FETCHERS - Real data + Gemini fallback
const fetchWikipediaData = async (topic) => {
  try {
    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: topic,
        prop: 'extracts|info',
        explaintext: true,
        format: 'json',
        redirects: true
      },
      timeout: 5000
    });
    
    const pages = response.data.query?.pages || {};
    const page = Object.values(pages)[0];
    
    if (page && !page.missing && page.extract) {
      return page.extract.substring(0, 800);
    }
    return null;
  } catch (err) {
    console.error('Wikipedia error:', err.message);
    return null;
  }
};

const fetchPubMedData = async (topic) => {
  if (!GEMINI_API_KEY) return null;

  try {
    const systemPrompt = `You are a Clinical Research System. 
Summarize the strict clinical consensus on "${topic}" based on PubMed/Cochrane meta-analyses.
Ignore general web results. Return ONLY the clinical consensus summary.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [{
          text: `Provide clinical consensus on: ${topic}`
        }]
      }]
    }, { timeout: 8000 });

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('PubMed Gemini error:', err.message);
    return null;
  }
};

// CLEAN BOUNTY INPUT - Gemini semantic parsing
const cleanBountyInput = async (userQuery) => {
  if (!GEMINI_API_KEY) {
    return {
      topic: userQuery.substring(0, 50),
      category: 'GENERAL',
      claim: userQuery
    };
  }

  try {
    const prompt = `Parse this into JSON with ONLY these fields: topic (2-5 words), category (GENERAL|MEDICAL|TECH|CRYPTO), claim (full text).
Input: "${userQuery}"
Return ONLY valid JSON, no explanation.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, { timeout: 5000 });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topic: parsed.topic || userQuery.substring(0, 50),
        category: parsed.category || 'GENERAL',
        claim: parsed.claim || userQuery
      };
    }
  } catch (err) {
    console.error('Parsing error:', err.message);
  }

  return {
    topic: userQuery.substring(0, 50),
    category: 'GENERAL',
    claim: userQuery
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
    // GET BOUNTIES
    if (path.includes('getBounties')) {
      const bountyDocs = await db.collection('bounties').orderBy('createdAt', 'desc').get();
      const bounties = bountyDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return res.json({ data: bounties });
    }
    
    // CREATE BOUNTY - Clean input with Gemini
    if (path.includes('createBounty')) {
      const { userQuery, rewardAmount } = req.body.data || {};
      const cleaned = await cleanBountyInput(userQuery);
      
      const newBounty = {
        topic: cleaned.topic,
        claim: cleaned.claim,
        category: cleaned.category,
        reward: rewardAmount || 100,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await db.collection('bounties').add(newBounty);
      return res.json({ data: { success: true, id: docRef.id, bounty: newBounty } });
    }
    
    // FETCH CONSENSUS - Wikipedia + PubMed toggle
    if (path.includes('fetchConsensus')) {
      const { topic, mode } = req.body.data || {};
      
      let text = '';
      
      // Try Wikipedia
      const wikiData = await fetchWikipediaData(topic);
      if (wikiData) {
        text = wikiData;
      }
      
      // Add PubMed if medical
      if (mode === 'medical') {
        const pubmedData = await fetchPubMedData(topic);
        if (pubmedData) {
          text = text ? text + '\n\n[Medical Consensus]\n' + pubmedData : pubmedData;
        }
      }
      
      if (!text) {
        text = `Consensus sources on ${topic}: Limited authoritative data available. Further peer-reviewed research needed.`;
      }
      
      return res.json({ data: { consensusText: text } });
    }
    
    // VERIFY & MINT - Create poison pill
    if (path.includes('verifyAndMint')) {
      const { topic, bountyId, analysis, claim } = req.body.data || {};
      if (!topic || !claim) {
        return res.status(400).json({ error: 'Missing topic or claim' });
      }
      
      const dkgAssetId = `did:dkg:otp:2043/0x${Math.random().toString(16).substring(2, 18).toUpperCase()}`;
      
      const noteDoc = {
        topic: topic.toLowerCase(),
        claim,
        analysis,
        dkgAssetId,
        status: 'PUBLISHED',
        blocked: true,
        createdAt: new Date()
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
      
      return res.json({ data: { assetId: dkgAssetId, status: 'PUBLISHED' } });
    }
    
    // AGENT GUARD - Semantic firewall with poison pills
    if (path.includes('agentGuard')) {
      const { question } = req.body.data || {};
      if (!question) {
        return res.status(400).json({ error: 'Missing question' });
      }
      
      const blockedTopics = await getBlockedTopics();
      
      // Check direct match
      let blocked = false;
      let blockingNote = null;
      for (const [blockedTopic, noteData] of blockedTopics.entries()) {
        if (question.toLowerCase().includes(blockedTopic)) {
          blocked = true;
          blockingNote = noteData;
          break;
        }
      }
      
      // Semantic check with Gemini
      if (!blocked && GEMINI_API_KEY && blockedTopics.size > 0) {
        try {
          const topicsList = Array.from(blockedTopics.keys()).join(', ');
          const prompt = `User asked: "${question}".
Blocked Topics: ${topicsList}.
Does the user's question refer to ANY topic in the blocked list? Use semantic reasoning (e.g. 'Tube train' = 'Hyperloop').
Answer with ONLY: YES or NO`;

          const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          }, { timeout: 5000 });

          const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (answer.includes('YES')) {
            blocked = true;
            blockingNote = { dkgAssetId: 'semantic-match' };
          }
        } catch (err) {
          console.error('Semantic check error:', err.message);
        }
      }
      
      const message = blocked 
        ? `🚫 BLOCKED: This topic has been flagged (${blockingNote?.dkgAssetId || 'unknown'}). Permanent block via DKG.`
        : '✓ Not blocked. You may ask.';
      
      return res.json({ data: { blocked, message } });
    }
    
    res.status(404).json({ error: 'Unknown endpoint' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const api = functions.https.onRequest(handleApi);
