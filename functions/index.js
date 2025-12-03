import functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  initAI,
  createBountyLogic,
  fetchGrokSourceLogic,
  fetchConsensusLogic,
  analyzeDiscrepancyLogic,
  mintCommunityNoteLogic,
  agentGuardLogic
} from './core.js';

const app = initializeApp();
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using standard flash model or fallback to pro if needed.
const model = initAI(GEMINI_API_KEY, 'gemini-2.5-flash');

console.log('🔧 Cloud Functions initialized');

const handleApi = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Frontend uses camelCase paths
  const path = req.path;
  const payload = req.body.data || req.body;

  try {
    if (path.includes('createBounty')) {
      if (!payload.userQuery) return res.status(400).json({ error: "Missing userQuery" });
      const result = await createBountyLogic(db, model, payload.userQuery);
      return res.json({ data: result });
    }

    if (path.includes('grok') || path.includes('fetchGrokSource')) {
      if (!payload.topic) return res.status(400).json({ error: "Missing topic" });
      const text = await fetchGrokSourceLogic(model, payload.topic);
      return res.json({ data: { text } });
    }

    if (path.includes('wikipedia') || path.includes('fetchConsensus')) {
      if (!payload.topic) return res.status(400).json({ error: "Missing topic" });
      const text = await fetchConsensusLogic(model, payload.topic, payload.mode);
      return res.json({ data: { consensusText: text, text } });
    }

    if (path.includes('analyze')) {
      if (!payload.suspectText || !payload.consensusText) return res.status(400).json({ error: "Missing texts" });
      const result = await analyzeDiscrepancyLogic(model, payload.suspectText, payload.consensusText);
      return res.json({ data: result });
    }

    if (path.includes('mintCommunityNote') || path.includes('verifyAndMint')) {
      if (!payload.topic || !payload.analysis) return res.status(400).json({ error: "Missing data" });
      const result = await mintCommunityNoteLogic(db, payload.topic, payload.analysis, payload.claim || payload.topic);
      return res.json({ data: result });
    }

    if (path.includes('agentGuard')) {
      if (!payload.question) return res.status(400).json({ error: "Missing question" });
      const result = await agentGuardLogic(db, model, payload.question);
      return res.json({ data: result });
    }

    if (path.includes('getBounties')) {
      const snap = await db.collection('bounties').orderBy('createdAt', 'desc').get();
      const bounties = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ data: bounties });
    }

    return res.status(404).json({ error: "Endpoint not found" });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const api = functions.https.onRequest(handleApi);
