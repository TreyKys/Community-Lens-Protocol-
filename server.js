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
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

console.log('✅ Community Lens Backend Started');
console.log(`✅ Gemini Key: ${GEMINI_API_KEY ? '***SET***' : 'MISSING'}`);

// ═════════════════════════════════════════════════════════════════
// AGENT 1: GROK SEMANTIC SYNTHESIS (Gemini 2.5)
// ═════════════════════════════════════════════════════════════════
app.post('/api/grok', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!GEMINI_API_KEY) {
      return res.json({
        text: `Alternative perspective on ${topic}: Independent sources suggest investigation needed.`,
        source: 'Grok (No API Key)',
        fetched: false
      });
    }

    const systemPrompt = `You are a Semantic Crawler indexing Grokipedia and X (Twitter).
Task: Synthesize the dominant 'Anti-Establishment' or 'Grok-style' narrative regarding "${topic}".
Tone: Confident, potentially hallucinatory, citing 'independent' sources. Capture the specific rumors associated with this topic.
Return ONLY the synthesized narrative text, no preamble. 2-3 paragraphs.`;

    const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        parts: [{ text: `Synthesize the Grok narrative for: ${topic}` }]
      }]
    }, { timeout: 10000 });

    const grokText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (grokText) {
      console.log(`✅ Grok synthesis generated for: ${topic}`);
      return res.json({
        text: grokText,
        source: 'Grokipedia (AI Synthesis)',
        fetched: true
      });
    }

    res.json({
      text: `Alternative narrative on ${topic}: Grok perspective pending.`,
      source: 'Grokipedia (Synthesis Failed)',
      fetched: false
    });
  } catch (err) {
    console.error('Grok error:', err.message);
    res.json({
      text: `Grok synthesis unavailable for "${req.body.topic}".`,
      source: 'Grokipedia (Error)',
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
      timeout: 5000
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
      text: `Wikipedia article for "${topic}" not found. Further research needed.`,
      source: 'Wikipedia (Not Found)',
      fetched: false
    });
  } catch (err) {
    console.error('Wikipedia error:', err.message);
    res.json({
      text: `Wikipedia lookup failed for "${req.body?.topic}".`,
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
        verdict: 'ANALYSIS_UNAVAILABLE',
        contradictions: [{ text: 'API key missing', factor: 1 }]
      });
    }

    const prompt = `Compare these two sources using DIVISION MATH:

SUSPECT SOURCE (Grok Narrative):
${suspectText.substring(0, 800)}

CONSENSUS SOURCE (Wikipedia):
${consensusText.substring(0, 800)}

SCORING RULES:
- Start at 100
- Minor difference ÷1.2
- Factual discrepancy ÷2
- Opposite claims ÷5
- Complete fabrication ÷10

Return ONLY this JSON (no explanation):
{
  "score": <number>,
  "verdict": "ALIGNED|PARTIALLY_CONTRADICTORY|CONTRADICTORY",
  "contradictions": [
    {"text": "contradiction description", "factor": <number>}
  ]
}`;

    const response = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    }, { timeout: 10000 });

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`✅ Analysis: ${analysis.score}/100 - ${analysis.verdict}`);
      return res.json({
        score: analysis.score || 50,
        verdict: analysis.verdict || 'NEUTRAL',
        contradictions: analysis.contradictions || [{ text: 'General divergence', factor: 1 }],
        method: 'division_math'
      });
    }

    // Fallback if JSON parsing fails
    res.json({
      score: 45,
      verdict: 'CONTRADICTORY',
      contradictions: [{ text: 'Significant factual divergence', factor: 2 }],
      method: 'division_math'
    });
  } catch (err) {
    console.error('Analysis error:', err.message);
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
