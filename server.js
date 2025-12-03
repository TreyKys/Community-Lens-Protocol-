import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import {
  initAI,
  createBountyLogic,
  fetchGrokSourceLogic,
  fetchConsensusLogic,
  analyzeDiscrepancyLogic,
  mintCommunityNoteLogic,
  agentGuardLogic
} from './functions/core.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// --- FIREBASE SETUP ---
let db;
try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore(firebaseApp);
    console.log('🔥 Firebase Admin Initialized (Service Account)');
  } else {
    const firebaseApp = initializeApp();
    db = getFirestore(firebaseApp);
    console.log('🔥 Firebase Admin Initialized (Default Creds)');
  }
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  console.error("⚠️ Firebase Init Error:", e.message);
}

// --- AI SETUP ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const model = initAI(GEMINI_API_KEY, 'gemini-2.5-flash');
if (model) console.log('🤖 Gemini Model Initialized');

// --- ROUTES ---
const normalizeBody = (req, res, next) => {
  if (req.body.data) req.body = req.body.data;
  next();
};

app.post('/api/createBounty', normalizeBody, async (req, res) => {
  try { res.json({ data: await createBountyLogic(db, model, req.body.userQuery) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/grok', normalizeBody, async (req, res) => {
  try { res.json({ data: { text: await fetchGrokSourceLogic(model, req.body.topic) } }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wikipedia', normalizeBody, async (req, res) => {
  try {
    const text = await fetchConsensusLogic(model, req.body.topic, req.body.mode);
    res.json({ data: { consensusText: text, text } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/analyze', normalizeBody, async (req, res) => {
  try { res.json({ data: await analyzeDiscrepancyLogic(model, req.body.suspectText, req.body.consensusText) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mintCommunityNote', normalizeBody, async (req, res) => {
  try { res.json({ data: await mintCommunityNoteLogic(db, req.body.topic, req.body.analysis, req.body.claim) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/verifyAndMint', normalizeBody, async (req, res) => {
    try { res.json({ data: await mintCommunityNoteLogic(db, req.body.topic, req.body.analysis, req.body.claim) }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agentGuard', normalizeBody, async (req, res) => {
  try { res.json({ data: await agentGuardLogic(db, model, req.body.question) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/getBounties', async (req, res) => {
  try {
    if (!db) return res.json({ data: [] });
    const snap = await db.collection('bounties').orderBy('createdAt', 'desc').get();
    res.json({ data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
