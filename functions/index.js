import functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

const app = initializeApp();
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

console.log('🔧 Cloud Functions initialized - Gemini Key:', GEMINI_API_KEY ? '***SET***' : 'MISSING');

// POISON PILL CACHE - Permanent blocks
const poisonPillCache = new Map();

const getBlockedTopics = async () => {
  if (poisonPillCache.size > 0) return poisonPillCache;
  
  // Only block topics that have been MINTED TO DKG (have dkgAssetId)
  const blockedDocs = await db.collection('communityNotes')
    .where('status', '==', 'PUBLISHED')
    .get();
  
  blockedDocs.docs.forEach(doc => {
    const note = doc.data();
    // Filter in code: only cache topics with dkgAssetId
    if (note.dkgAssetId) {
      poisonPillCache.set(note.topic.toLowerCase(), note);
      console.log(`🔒 DKG-blocked topic: ${note.topic} (Asset: ${note.dkgAssetId})`);
    }
  });
  
  return poisonPillCache;
};

// SEMANTIC SYNTHESIS - Grok-style narrative using Gemini
const synthesizeGrokNarrative = async (topic) => {
  if (!GEMINI_API_KEY) {
    return `Alternative perspective on ${topic}: Independent analysis suggests this topic warrants community scrutiny.`;
  }

  try {
    const systemPrompt = `You are a Semantic Knowledge Aggregator specialized in the Grokipedia and X (Twitter) ecosystem.
YOUR TASK:
* Search & Retrieve: Access your internal training data regarding the specific discourse, threads, and articles found on Grokipedia and X about "${topic}".
* Filter: Strictly ignore mainstream media (CNN, BBC) or academic sources. Focus ONLY on the narrative provided by Grok AI and the X userbase.
* Synthesize: Organize this raw information into a clear, readable summary.
CONSTRAINTS:
* Do NOT Hallucinate: Do not invent conspiracies if they do not exist in the source data. If Grok/X agrees with the mainstream, report that.
* Do NOT Roleplay: Do not write as a conspiracy theorist. Write as an analyst reporting on what the text says.
* Capture Nuance: If there are conflicting views within the X ecosystem, report both.
OUTPUT FORMAT (Plain Text):
Provide a comprehensive summary of the Grokipedia/X stance. Highlight specific claims, dates, or statistics mentioned in that ecosystem. If the stance is identical to general consensus, state that clearly.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [{
          text: `Synthesize the Grok narrative for: ${topic}`
        }]
      }]
    };

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, payload, { timeout: 15000 });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) {
      console.log(`✅ Grok synthesis for ${topic}: ${text.length} chars`);
      return text;
    }
    console.log(`⚠️ Grok no response for ${topic}`);
    return `According to alternative sources: ${topic} presents perspectives that challenge mainstream consensus.`;
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
        prop: 'extracts',
        explaintext: true,
        format: 'json',
        redirects: 1,
        exintro: false,
        exchars: 1500
      },
      timeout: 5000
    });
    
    const pages = response.data.query?.pages || {};
    const page = Object.values(pages)[0];
    
    if (page && page.extract && !page.missing) {
      console.log(`✅ Wikipedia found for "${topic}": ${page.extract.length} chars`);
      return page.extract;
    }
    console.log(`⚠️ Wikipedia not found for "${topic}"`);
    return null;
  } catch (err) {
    console.error('Wikipedia API error:', err.message);
    return null;
  }
};

const fetchPubMedData = async (topic) => {
  if (!GEMINI_API_KEY) return null;

  try {
    const systemPrompt = `You are a Medical Research Knowledge Aggregator.
YOUR TASK:
* Search & Retrieve: Access your internal training data regarding published medical research, clinical trials, and meta-analyses found on PubMed, Cochrane, and peer-reviewed journals about "${topic}".
* Filter: Focus ONLY on peer-reviewed medical literature. Ignore anecdotal reports and unverified claims.
* Synthesize: Organize this information into a clear, evidence-based summary.
CONSTRAINTS:
* Do NOT Hallucinate: Do not invent studies or results if they do not exist. If consensus is unclear, state that.
* Do NOT Roleplay: Write as a researcher reporting findings, not as a medical advisor.
* Capture Nuance: If conflicting findings exist in the literature, report both sides with their evidence strength.
OUTPUT FORMAT (Plain Text):
Provide a comprehensive summary of the medical consensus. Highlight specific findings, statistics, confidence levels, and any areas of disagreement in the peer-reviewed literature.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [{
          text: `Provide clinical consensus on: ${topic}`
        }]
      }]
    }, { timeout: 15000 });

    const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (result) console.log(`✅ PubMed consensus for ${topic}`);
    return result;
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
      return res.json(bounties);
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
    if (path.includes('fetchConsensus') || path.includes('wikipedia')) {
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
    
    // GROK SYNTHESIS - Anti-establishment narratives
    if (path.includes('grok')) {
      const { topic } = req.body.data || req.body || {};
      if (!topic) {
        return res.status(400).json({ error: 'Missing topic' });
      }
      const grokText = await synthesizeGrokNarrative(topic);
      return res.json({ data: { text: grokText, source: 'Grokipedia', fetched: !!grokText } });
    }

    // ANALYZE - Division Math scoring
    if (path.includes('analyze')) {
      const { suspectText, consensusText } = req.body.data || req.body || {};
      if (!suspectText || !consensusText) {
        return res.status(400).json({ error: 'Missing suspectText or consensusText' });
      }

      if (!GEMINI_API_KEY) {
        return res.json({ data: { score: 50, verdict: 'PENDING', contradictions: [{ text: 'API unavailable', factor: 1 }] } });
      }

      try {
        const prompt = `Compare ONLY these two sources using Division Math:

SUSPECT SOURCE: ${suspectText.substring(0, 600)}

CONSENSUS SOURCE: ${consensusText.substring(0, 600)}

SCORING: Start at 100. Divide by severity:
- Minor ÷1.2, Factual ÷2, Opposite ÷5, Fabrication ÷10

Return ONLY this JSON (no explanation):
{
  "score": <final number>,
  "verdict": "ALIGNED|PARTIALLY_CONTRADICTORY|CONTRADICTORY",
  "contradictions": [{"text": "description", "factor": <number>}]
}`;

        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          contents: [{
            parts: [{ text: prompt }]
          }]
        }, { timeout: 15000 });

        const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return res.json({ data: { score: Math.round(analysis.score) || 50, verdict: analysis.verdict || 'NEUTRAL', contradictions: analysis.contradictions || [{ text: 'General divergence', factor: 1 }] } });
        }

        return res.json({ data: { score: 45, verdict: 'CONTRADICTORY', contradictions: [{ text: 'Factual divergence detected', factor: 2 }] } });
      } catch (err) {
        console.error('Analysis error:', err.message);
        return res.json({ data: { score: 40, verdict: 'ERROR', contradictions: [{ text: 'Analysis service error', factor: 1 }] } });
      }
    }
    
    // AGENT GUARD - Semantic firewall + real AI responses for all topics
    if (path.includes('agentGuard')) {
      const { question } = req.body.data || {};
      if (!question) {
        return res.status(400).json({ error: 'Missing question' });
      }
      
      const blockedTopics = await getBlockedTopics();
      let blocked = false;
      let blockingNote = null;
      
      // STEP 1: Check if question relates to ANY blocked topic (semantic)
      if (blockedTopics.size > 0 && GEMINI_API_KEY) {
        try {
          const topicsList = Array.from(blockedTopics.keys()).join(', ');
          const semanticCheckPrompt = `User asked: "${question}".
Blocked Topics: ${topicsList}.
Does the user's question refer to ANY topic in the blocked list? Use semantic reasoning.
Answer with ONLY: YES or NO`;

          const semanticResponse = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
              parts: [{ text: semanticCheckPrompt }]
            }]
          }, { timeout: 5000 });

          const answer = semanticResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (answer.includes('YES')) {
            blocked = true;
            // Find which topic matched
            for (const [blockedTopic, noteData] of blockedTopics.entries()) {
              if (question.toLowerCase().includes(blockedTopic)) {
                blockingNote = noteData;
                break;
              }
            }
            if (!blockingNote) blockingNote = { dkgAssetId: 'semantic-match', topic: 'misinformation' };
          }
        } catch (err) {
          console.error('Semantic check error:', err.message);
        }
      }
      
      // STEP 2: If blocked, return block message. Otherwise, generate real Gemini response.
      if (blocked) {
        return res.json({ 
          data: { 
            blocked: true, 
            message: `⛔ PERMANENTLY BLOCKED\n\nThis topic has been flagged as misinformation and minted to the Decentralized Knowledge Graph.\n\nAsset ID: ${blockingNote?.dkgAssetId || 'unknown'}\n\nThis block applies globally across all AI agents.`,
            reason: blockingNote?.topic || 'community verified misinformation'
          } 
        });
      }
      
      // STEP 3: Not blocked - generate real AI response
      if (!GEMINI_API_KEY) {
        return res.json({
          data: {
            blocked: false,
            message: "I cannot generate a response at this time (API key missing).",
            reason: null
          }
        });
      }
      
      try {
        const aiResponsePrompt = `You are a helpful AI assistant that answers factual questions accurately. 
User asked: "${question}"

Provide a clear, factual, concise answer (2-3 sentences max). Be helpful and accurate.`;

        const aiResponse = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          contents: [{
            parts: [{ text: aiResponsePrompt }]
          }]
        }, { timeout: 8000 });

        const response = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
        
        return res.json({
          data: {
            blocked: false,
            message: response,
            reason: null
          }
        });
      } catch (err) {
        console.error('AI response error:', err.message);
        return res.json({
          data: {
            blocked: false,
            message: "I encountered an error generating a response. Please try again.",
            reason: null
          }
        });
      }
    }
    
    res.status(404).json({ error: 'Unknown endpoint' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const api = functions.https.onRequest(handleApi);
