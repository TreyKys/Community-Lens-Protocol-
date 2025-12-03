// 1. IMPORT FROM V2
import { onRequest } from 'firebase-functions/v2/https';
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY missing!");

const model = initAI(GEMINI_API_KEY);

const handleApi = async (req, res) => {
  // CORS is handled by the onRequest options below, but we keep this for safety
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  const path = req.path;
  const data = req.body.data || req.body;

  try {
    if (path.includes('createBounty')) {
      const result = await createBountyLogic(db, model, data.userQuery);
      return res.json({ data: result });
    }
    if (path.includes('grok')) {
      const text = await fetchGrokSourceLogic(model, data.topic);
      return res.json({ data: { text } });
    }
    if (path.includes('consensus')) {
      const text = await fetchConsensusLogic(model, data.topic, data.mode);
      return res.json({ data: { text } });
    }
    if (path.includes('analyze')) {
      const result = await analyzeDiscrepancyLogic(model, data.suspectText, data.consensusText);
      return res.json({ data: result });
    }
    if (path.includes('mint')) {
      const result = await mintCommunityNoteLogic(db, data.topic, data.analysis);
      return res.json({ data: result });
    }
    if (path.includes('agentGuard')) {
      const result = await agentGuardLogic(db, model, data.question);
      return res.json({ data: result });
    }

    res.status(404).json({ error: "Not Found" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// 2. EXPORT USING V2 SYNTAX (Built-in CORS support)
export const api = onRequest({ cors: true }, handleApi);
