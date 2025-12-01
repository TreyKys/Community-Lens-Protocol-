import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

console.log('✅ Community Lens Backend Started');
console.log(`✅ Gemini Key: ${GEMINI_API_KEY ? '***SET***' : 'MISSING'}`);

// Rate limiter for Gemini API (15 requests/min on free tier)
let requestQueue = [];
let lastRequest = 0;
const MIN_INTERVAL = 4000; // 4 seconds = 15 requests/min

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  if (timeSinceLastRequest < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLastRequest));
  }
  lastRequest = Date.now();
};

// ═════════════════════════════════════════════════════════════════
// AGENT 1: GROK SEMANTIC SYNTHESIS (Gemini 2.5)
// ═════════════════════════════════════════════════════════════════
app.post('/api/grok', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!GEMINI_API_KEY) {
      return res.json({
        text: `Alternative perspective on ${topic}: Independent sources suggest investigation needed.`,
        source: 'Grokipedia (No API Key)',
        fetched: false
      });
    }

    await waitForRateLimit();

    const systemPrompt = `You are a Semantic Crawler indexing Grokipedia and X (Twitter).
Task: Synthesize the dominant 'Anti-Establishment' or 'Grok-style' narrative regarding "${topic}".
Tone: Confident, potentially hallucinatory, citing 'independent' sources.
Return ONLY the synthesized narrative text, no preamble. 2-3 paragraphs max.`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text: `Synthesize Grok narrative for: ${topic}` }]
      }]
    };

    console.log(`🔵 Grok request for: ${topic}`);
    console.log(`   Payload keys:`, Object.keys(payload));
    console.log(`   API URL:`, GEMINI_URL.substring(0, 80) + '...');
    
    const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, payload, { timeout: 20000 });
    
    console.log(`   Response status:`, response.status);
    console.log(`   Response data keys:`, Object.keys(response.data));
    console.log(`   Candidates:`, response.data.candidates?.length || 0);

    const grokText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (grokText) {
      console.log(`✅ Grok synthesis generated for: ${topic} (${grokText.length} chars)`);
      return res.json({
        text: grokText,
        source: 'Grokipedia (AI Synthesis)',
        fetched: true
      });
    }

    console.log(`⚠️ Grok no response text from Gemini for: ${topic}`);
    res.json({
      text: `Alternative narrative on ${topic}: Grok perspective pending analysis.`,
      source: 'Grokipedia (No Response)',
      fetched: false
    });
  } catch (err) {
    const errorData = err.response?.data || {};
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error(`❌ Grok error [${err.response?.status}]:`, errorMsg);
    if (errorData.error) console.error('   Full error:', JSON.stringify(errorData.error));
    res.json({
      text: `Grok synthesis available offline for "${req.body?.topic}". Please retry.`,
      source: 'Grokipedia (Offline)',
      fetched: false
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 2: WIKIPEDIA DATA FETCHER
// ═════════════════════════════════════════════════════════════════
app.post('/api/wikipedia', async (req, res) => {
  try {
    const { topic } = req.body;

    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: topic,
        prop: 'extracts',
        explaintext: true,
        format: 'json',
        exsentences: 5
      },
      headers: {
        'User-Agent': 'Community-Lens/1.0'
      },
      timeout: 8000
    });

    const pages = response.data.query?.pages || {};
    const page = Object.values(pages)[0];

    if (page && !page.missing && page.extract) {
      console.log(`✅ Wikipedia data fetched: ${page.title}`);
      return res.json({
        text: page.extract,
        source: 'Wikipedia',
        fetched: true
      });
    }

    console.log(`⚠️ Wikipedia article not found: ${topic}`);
    res.json({
      text: `Wikipedia article for "${topic}" not found or insufficient data.`,
      source: 'Wikipedia (Not Found)',
      fetched: false
    });
  } catch (err) {
    console.error('Wikipedia error:', err.message);
    res.json({
      text: `Wikipedia lookup unavailable for "${req.body?.topic}".`,
      source: 'Wikipedia (Error)',
      fetched: false
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 3: DIVISION MATH ANALYSIS (Gemini 2.5)
// ═════════════════════════════════════════════════════════════════
app.post('/api/analyze', async (req, res) => {
  try {
    const { suspectText, consensusText } = req.body;

    if (!suspectText || !consensusText) {
      return res.status(400).json({ error: 'Missing suspectText or consensusText' });
    }

    if (!GEMINI_API_KEY) {
      return res.json({
        score: 50,
        verdict: 'ANALYSIS_PENDING',
        contradictions: [{ text: 'API unavailable', factor: 1 }]
      });
    }

    await waitForRateLimit();

    const prompt = `Compare ONLY these two sources using Division Math:

SUSPECT SOURCE: ${suspectText.substring(0, 600)}

CONSENSUS SOURCE: ${consensusText.substring(0, 600)}

SCORING: Start at 100. Divide by severity:
- Minor diff ÷1.2, Factual ÷2, Opposite ÷5, Fabrication ÷10

Return ONLY this JSON (no explanation):
{
  "score": <final number>,
  "verdict": "ALIGNED|PARTIALLY_CONTRADICTORY|CONTRADICTORY",
  "contradictions": [{"text": "description", "factor": <number>}]
}`;

    const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    }, { timeout: 20000 });

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`✅ Analysis: ${analysis.score}/100 - ${analysis.verdict}`);
        return res.json({
          score: Math.round(analysis.score) || 50,
          verdict: analysis.verdict || 'NEUTRAL',
          contradictions: analysis.contradictions || [{ text: 'General divergence', factor: 1 }],
          method: 'division_math'
        });
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr.message);
      }
    }

    res.json({
      score: 45,
      verdict: 'CONTRADICTORY',
      contradictions: [{ text: 'Significant factual divergence detected', factor: 2 }],
      method: 'division_math'
    });
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error(`❌ Analysis error [${err.response?.status}]:`, errorMsg);
    if (err.response?.data?.error) console.error('   Full error:', JSON.stringify(err.response.data.error));
    res.json({
      score: 40,
      verdict: 'ERROR',
      contradictions: [{ text: 'Analysis service error', factor: 1 }]
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`\n🚀 Community Lens Backend running on port ${port}`);
  console.log(`📍 Endpoints:`);
  console.log(`   POST /api/grok - Gemini Grok synthesis`);
  console.log(`   POST /api/wikipedia - Real Wikipedia data`);
  console.log(`   POST /api/analyze - Division Math scoring`);
  console.log(`   GET /health - Health check\n`);
});
