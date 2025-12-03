import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

// --- LIGHTWEIGHT MOCK DKG (Simulates Blockchain) ---
class MockDKG {
  async createAsset(data, keywords) {
    console.log("🔗 [Mock DKG] Creating asset...", keywords);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const hash = Math.random().toString(36).substring(7);
    return {
      UAL: `did:dkg:otp:2043/0x${hash}`,
      status: "FINALIZED"
    };
  }
}
const dkgClient = new MockDKG();

// --- CONFIG ---
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Using latest flash model

export const initAI = (apiKey) => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- LOGIC FUNCTIONS ---

export const createBountyLogic = async (db, aiClient, userQuery) => {
  if (!aiClient) return { error: "AI not initialized" };

  try {
    const result = await aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract Topic, Category, and Claim from: '${userQuery}'. Return JSON only.`
    });

    let text = result.response?.text() || result.text || "{}";
    // Clean markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(text);

    const bounty = {
      topic: data.Topic || "Unknown",
      claim: data.Claim || userQuery,
      createdAt: new Date(),
      status: 'OPEN'
    };

    if (db) await db.collection('bounties').add(bounty);
    return bounty;
  } catch (e) {
    console.error(e);
    return { error: "AI Processing Failed", details: e.message };
  }
};

export const fetchGrokSourceLogic = async (aiClient, topic) => {
  if (!aiClient) return "AI Unavailable";
  try {
    const result = await aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: `Summarize X/Twitter discourse on: ${topic}`
    });
    return result.response?.text() || result.text || "No data found.";
  } catch (e) { return "Error fetching source."; }
};

export const fetchConsensusLogic = async (aiClient, topic, mode) => {
  let consensus = "";
  // 1. Wikipedia
  try {
    const wiki = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
    consensus += `[Wikipedia] ${wiki.data.extract}\n`;
  } catch (e) {
    consensus += "[Wikipedia] Entry not found.\n";
  }

  // 2. AI Consensus
  if (aiClient) {
    try {
      const result = await aiClient.models.generateContent({
        model: MODEL_NAME,
        contents: `Provide scientific consensus on: ${topic}`
      });
      consensus += `\n[AI Analysis] ${result.response?.text() || result.text}`;
    } catch (e) { console.error(e); }
  }
  return consensus;
};

export const analyzeDiscrepancyLogic = async (aiClient, suspect, consensus) => {
  if (!aiClient) return { score: 0 };
  try {
    const result = await aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: `Compare these texts. Return strictly JSON {score: number, notes: string}. \nText 1: ${suspect}\nText 2: ${consensus}`
    });
    let text = result.response?.text() || result.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) { return { score: 0, error: e.message }; }
};

export const mintCommunityNoteLogic = async (db, topic, analysis) => {
  // Uses the Mock Client defined at the top
  const asset = await dkgClient.createAsset({}, [topic]);

  if (db) {
    await db.collection('poison_pills').add({
      topic, 
      assetId: asset.UAL,
      analysis,
      timestamp: new Date()
    });
  }
  return { status: "MINTED", assetId: asset.UAL };
};

export const agentGuardLogic = async (db, aiClient, question) => {
  if (aiClient) {
     try {
       const result = await aiClient.models.generateContent({
         model: MODEL_NAME,
         contents: `Answer this question: ${question}`
       });
       return { message: result.response?.text() || result.text };
     } catch (e) { return { message: "Error" }; }
  }
  return { message: "System Offline" };
};
