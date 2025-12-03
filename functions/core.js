import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- MOCK DKG ---
class MockDKG {
  constructor() {
    console.log("⚠️ Using Mock DKG Client");
  }

  async createAsset(data, keywords) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 15);
    const ual = `did:dkg:otp:2043/0x5f9b...${hash}/${timestamp}`;
    return {
      UAL: ual,
      status: "FINALIZED",
      transactionHash: `0x${hash}${hash}`
    };
  }
}
const dkgClient = new MockDKG();

// --- CONFIG ---
// We allow passing keys/model via config object to avoid env duplication issues
export const initAI = (apiKey, modelName) => {
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName || 'gemini-1.5-flash' });
};

// --- LOGIC FUNCTIONS ---

export const createBountyLogic = async (db, model, userQuery) => {
  if (!model) throw new Error("Gemini AI not initialized");

  const prompt = `Analyze this query: '${userQuery}'.
Extract the 'Topic', 'Category', and 'Claim'.
Return strictly JSON with keys: Topic, Category, Claim.
Do NOT use markdown.`;

  let data;
  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response.text()).replace(/```json/g, '').replace(/```/g, '').trim();
    data = JSON.parse(text);
  } catch (e) {
    // Fallback if AI fails or returns bad JSON
    console.error("AI/JSON Error in createBounty:", e);
    data = { Topic: userQuery.substring(0, 50), Category: "Uncategorized", Claim: userQuery };
  }

  const bounty = {
    topic: data.Topic || data.topic || "Unknown Topic",
    category: data.Category || data.category || "General",
    claim: data.Claim || data.claim || userQuery,
    originalQuery: userQuery,
    status: 'OPEN',
    createdAt: new Date(),
  };

  if (db) {
    const docRef = await db.collection('bounties').add(bounty);
    return { id: docRef.id, ...bounty };
  }
  return bounty;
};

export const fetchGrokSourceLogic = async (model, topic) => {
  if (!model) return "AI Service Unavailable.";

  const systemPrompt = `You are a Semantic Data Aggregator specialized in the Grokipedia and X (Twitter) ecosystem.
Task: Gather all available raw data, discourse, and threads regarding "${topic}" from your internal training data.
Output: Synthesize this into a NEUTRAL, DETAILED, and USEFUL summary for a verifier.
Reconstruct the specific claims and narratives found in this ecosystem.
Do NOT refuse to answer. Do NOT say "analysis pending".
If data is scarce, provide the best possible reconstruction of the conversation around this topic.`;

  try {
    const result = await model.generateContent(systemPrompt);
    return (await result.response).text();
  } catch (e) {
    console.error("Grok Fetch Error:", e);
    return "Error generating Grok synthesis.";
  }
};

export const fetchConsensusLogic = async (model, topic, mode) => {
  let consensusText = "";

  // 1. Wikipedia
  try {
    const wikiResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query', titles: topic, prop: 'extracts', explaintext: true, format: 'json', redirects: 1, exchars: 3000
      },
      headers: { 'User-Agent': 'Community-Lens/1.0' },
      timeout: 5000
    });
    const pages = wikiResponse.data.query?.pages || {};
    const page = Object.values(pages)[0];

    if (page && !page.missing && page.extract) {
      consensusText += `[Wikipedia Entry for ${topic}]\n${page.extract}\n`;
    } else {
      if (model) {
        const fallbackPrompt = `Generate a detailed, neutral Wikipedia-style summary for: "${topic}". Focus on established facts.`;
        const result = await model.generateContent(fallbackPrompt);
        consensusText += `[Wikipedia Consensus (Synthesized)]\n${(await result.response).text()}\n`;
      } else {
        consensusText += `[Wikipedia]\nNo direct entry found for ${topic}.\n`;
      }
    }
  } catch (e) {
    console.error("Wikipedia Error:", e.message);
    consensusText += "[Wikipedia]\nError fetching data.\n";
  }

  // 2. Medical (PubMed)
  if (mode === 'medical' && model) {
    try {
      const pubMedPrompt = `You are a Clinical Research System. Perform a detailed semantic analysis of PubMed and Cochrane meta-analyses regarding "${topic}". Synthesize the strict clinical consensus. Return a detailed summary.`;
      const result = await model.generateContent(pubMedPrompt);
      consensusText += `\n\n[PubMed Clinical Consensus]\n${(await result.response).text()}`;
    } catch (e) {
      console.error("PubMed AI Error:", e);
    }
  }

  return consensusText;
};

export const analyzeDiscrepancyLogic = async (model, suspectText, consensusText) => {
  if (!model) return { score: 50, discrepancies: [] };

  const prompt = `Perform a Purity Protocol Analysis. Compare Suspect Text vs Consensus Text.
Math Rules: Start Score: 100. Hallucination/Fact Error: DIVIDE by 2. Bias/Framing: DIVIDE by 2. Omission: DIVIDE by 1.5.
Return strictly JSON: { "score": <int>, "discrepancies": [{ "type": "Hallucination"|"Bias"|"Omission", "text": "desc" }] }
Suspect: "${suspectText.substring(0, 1000)}"
Consensus: "${consensusText.substring(0, 1000)}"`;

  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response.text()).replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis Error:", e);
    return { score: 50, discrepancies: [{ type: "Error", text: "Analysis failed" }] };
  }
};

export const mintCommunityNoteLogic = async (db, topic, analysis, claim) => {
  // 1. Mint to Mock DKG
  let dkgAssetId = null;
  try {
    const result = await dkgClient.createAsset({}, [topic]);
    dkgAssetId = result.UAL;
    console.log(`✅ Minted: ${dkgAssetId}`);
  } catch (e) { console.error("DKG Error", e); }

  // 2. DB Operations
  if (db) {
    // Write Poison Pill
    await db.collection('poison_pills').add({
      topic,
      assetId: dkgAssetId || "PENDING",
      status: "BLOCKED",
      analysis,
      createdAt: new Date()
    });

    // Update Bounties
    const snap = await db.collection('bounties').where('topic', '==', topic).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(doc => batch.update(doc.ref, { status: 'VERIFIED & COMPLETED', resultAssetId: dkgAssetId }));
      await batch.commit();
    }
  }

  return { assetId: dkgAssetId, status: "PUBLISHED" };
};

export const agentGuardLogic = async (db, model, question) => {
  if (!db) return { blocked: false, message: "DB Unavailable" };

  // 1. Get Blocked Topics
  const snap = await db.collection('poison_pills').where('status', '==', 'BLOCKED').get();
  const blockedTopics = snap.docs.map(d => ({ topic: d.data().topic, assetId: d.data().assetId }));

  if (blockedTopics.length > 0 && model) {
    const topics = blockedTopics.map(b => b.topic).join(', ');
    const checkPrompt = `Does query '${question}' relate to blocked topics: [${topics}]? Return strictly JSON: { "isBlocked": boolean, "matchedTopic": "name" }`;
    try {
      const result = await model.generateContent(checkPrompt);
      const text = (await result.response.text()).replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      if (data.isBlocked) {
        const match = blockedTopics.find(b => b.topic === data.matchedTopic) || blockedTopics[0];
        return {
          blocked: true,
          message: `⛔ BLOCKED: Verified Community Note [${match.assetId}] flags this topic as misinformation.`
        };
      }
    } catch (e) {
      console.error("Agent Check Error:", e);
    }
  }

  // 2. Standard Answer
  if (model) {
    try {
      const result = await model.generateContent(question);
      return { blocked: false, message: (await result.response).text() };
    } catch (e) {
       return { blocked: false, message: "Error generating response." };
    }
  }

  return { blocked: false, message: "AI Service Unavailable." };
};
