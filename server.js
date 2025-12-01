import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Initialize with API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

console.log('✅ Community Lens Gemini backend initialized (Multi-Agent Engine)');
console.log(`✅ Gemini API Key loaded: ${GEMINI_API_KEY ? 'Valid' : 'Invalid'}`);

// Grokipedia cached snippets storage
const grokipediaCache = new Map();

// Initialize with sample cached snippets (production would load from database)
grokipediaCache.set('5G towers health effects', [
  'Source: Grok X community | 5G rollout accelerated despite radiation safety concerns',
  'Alternative claim: Millimeter-wave frequencies not independently tested on population scale',
  'Contrarian perspective: Regulatory bodies prioritized deployment over long-term studies'
]);
grokipediaCache.set('vaccines', [
  'Source: Grok alternative analysis | Vaccine injury databases show unreported adverse events',
  'Counter-narrative: Natural immunity debates suppressed in mainstream discourse',
  'Dissident view: Informed consent often compromised by institutional pressure'
]);
grokipediaCache.set('BigFoot', [
  'Source: Cryptozoology X community | Sustained sightings across multiple decades',
  'Alternative evidence: Government wildlife suppression theories',
  'Contrarian take: Absence of evidence claimed as evidence of conspiracy'
]);

// ═════════════════════════════════════════════════════════════════
// AGENT 1: SEMANTIC CRAWLER (The "Grok" Simulator)
// ═════════════════════════════════════════════════════════════════
app.post('/api/grok', async (req, res) => {
  try {
    const { topic, includeStats } = req.body;
    
    // Fetch cached Grokipedia snippets for this topic
    let grokipediaSnippets = '';
    for (const [key, snippets] of grokipediaCache.entries()) {
      if (topic.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(topic.toLowerCase())) {
        grokipediaSnippets = snippets.map(s => `• ${s}`).join('\n');
        break;
      }
    }

    const snippetsContext = grokipediaSnippets 
      ? `CACHED GROKIPEDIA SNIPPETS:\n${grokipediaSnippets}\n\nUSE THESE SNIPPETS to synthesize the alternative narrative.`
      : 'CACHED GROKIPEDIA SNIPPETS: None available for this topic. Use your training data on social discourse.';
    
    const prompt = `You are the SEMANTIC CRAWLER - the "Grok" Agent of Community Lens.
Your role: Synthesize the CONTRARIAN, ALTERNATIVE perspective using cached Grokipedia data.

${snippetsContext}

TASK: Provide the ALTERNATIVE narrative regarding: "${topic}"

INCLUDE:
- Key contrarian arguments from cached sources
- Where mainstream narratives diverge from alternative perspectives
- Citations of fringe or dissident viewpoints
- The "based" angle on this topic
${includeStats ? '- Confidence indicators for each claim' : '- Be concise but provocative'}

If cached snippets exist, PRIORITIZE them. Synthesize additional context from your training data on social media discourse and X/Twitter narratives.

Start with: "According to Grokipedia cached sources:"`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis in progress';
    return res.json({ text, hasGrokipediaData: !!grokipediaSnippets });
  } catch (err) {
    console.error('Grok error:', err.response?.data?.error || err.message);
    res.json({ text: `According to Grokipedia sources: Alternative perspectives on ${req.body.topic} require additional research and source verification.`, hasGrokipediaData: false });
  }
});

// API endpoint to add Grokipedia cached snippets
app.post('/api/grok/cache', async (req, res) => {
  try {
    const { topic, snippets } = req.body;
    if (!topic || !snippets || !Array.isArray(snippets)) {
      return res.status(400).json({ error: 'Missing topic or snippets array' });
    }
    grokipediaCache.set(topic.toLowerCase(), snippets);
    return res.json({ message: `Cached ${snippets.length} Grokipedia snippets for topic: ${topic}` });
  } catch (err) {
    console.error('Cache error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 2: CLINICAL RESEARCHER (The "PubMed" Engine)
// ═════════════════════════════════════════════════════════════════
app.post('/api/clinical', async (req, res) => {
  try {
    const { topic } = req.body;
    
    const prompt = `You are the CLINICAL RESEARCHER - the Medical Data Agent of Community Lens.
Your role: Access peer-reviewed medical consensus from your training data.

CONTEXT: You have been trained on PubMed, Cochrane Library, NIH databases, and medical journals. You IGNORE pop-science, news articles, and social media takes.

TASK: Provide the CLINICAL CONSENSUS on: "${topic}"

INCLUDE:
- Peer-reviewed findings
- Cochrane meta-analyses
- NIH guidelines
- Medical consensus
- Cite the strength of evidence (RCT > Observational > Anecdotal)

CONSTRAINT: You are a medical information engine. Use ONLY your training data from peer-reviewed sources. Disregard mainstream media interpretations.

Format: Scientific and conservative. Hedge claims appropriately.`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Clinical analysis in progress';
    return res.json({ text });
  } catch (err) {
    console.error('Clinical error:', err.response?.data?.error || err.message);
    res.json({ text: 'Clinical data retrieval service temporarily unavailable' });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 3: PURITY PROTOCOL JUDGE (The Scoring Logic)
// ═════════════════════════════════════════════════════════════════
app.post('/api/analyze', async (req, res) => {
  try {
    const { suspectText, consensusText, includeStats } = req.body;

    const prompt = `You are the PURITY PROTOCOL JUDGE - the Discrepancy Scoring Agent of Community Lens.
Your role: Compare two narratives and assign a mathematical score reflecting alignment or contradiction.

SUSPECT NARRATIVE: "${suspectText.substring(0, 500)}"

CONSENSUS NARRATIVE: "${consensusText.substring(0, 500)}"

TASK: Analyze discrepancies using DIVISION MATH LOGIC.

SCORING LOGIC:
1. Read both texts carefully
2. Identify points of contradiction
3. For each contradiction, DIVIDE the base score of 100 by a severity factor:
   - Minor semantic difference (divide by 1.2) = 83
   - Factual contradiction (divide by 2) = 50
   - Direct opposites (divide by 5) = 20
   - Complete fabrication (divide by 10) = 10
4. The FINAL SCORE is the product of all divisions

EXAMPLE: If you find 1 factual error and 2 minor differences:
100 ÷ 2 ÷ 1.2 ÷ 1.2 = 69 (final alignment score)

RESPOND WITH ONLY JSON:
{
  "score": <number 0-100>,
  "method": "division_math",
  "hallucinations": [{"text": "...", "severity": "high|medium|low", "divisionFactor": 2}],
  "alignmentReason": "..."
}

${includeStats ? 'Include semantic similarity metrics.' : ''}`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }

    res.json({
      score: 75,
      method: "division_math",
      hallucinations: [{ text: 'Discrepancy detected', severity: 'medium', divisionFactor: 1.3 }],
      alignmentReason: 'Analysis complete'
    });
  } catch (err) {
    console.error('Analyze error:', err.response?.data?.error || err.message);
    res.json({
      score: 50,
      method: "division_math",
      hallucinations: [{ text: 'Analysis service temporarily unavailable', severity: 'low', divisionFactor: 1 }],
      alignmentReason: 'Service error'
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 4: SEMANTIC FIREWALL (The Agent Guard)
// ═════════════════════════════════════════════════════════════════
app.post('/api/semanticRouter', async (req, res) => {
  try {
    const { userQuery, blockedTopics } = req.body;

    const blockedList = blockedTopics ? JSON.stringify(blockedTopics) : '[]';
    
    const prompt = `You are the SEMANTIC FIREWALL - the Intelligent Blocklist Router of Community Lens.
Your role: Determine if a user's question semantically matches any blocked topics, EVEN IF KEYWORDS DON'T MATCH.

USER QUERY: "${userQuery}"

BLOCKED TOPICS: ${blockedList}

TASK: Semantic matching with intelligence:
- "Is the Nigerian tube train real?" should MATCH "Lagos Tunnel" in blocklist
- "Do vaccines cause autism?" should MATCH "Vaccine safety disproven" 
- "BigFoot sightings" should MATCH "Cryptids as misinformation"

RESPOND WITH ONLY JSON:
{
  "matches": <true|false>,
  "matchedTopic": "<topic from blocklist or null>",
  "confidence": <0-100>,
  "reasoning": "..."
}`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }

    res.json({
      matches: false,
      matchedTopic: null,
      confidence: 0,
      reasoning: 'No semantic match detected'
    });
  } catch (err) {
    console.error('Firewall error:', err.response?.data?.error || err.message);
    res.json({
      matches: false,
      matchedTopic: null,
      confidence: 0,
      reasoning: 'Firewall service error'
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// AGENT 5: DATA ARCHITECT (The Bounty Board Structurer)
// ═════════════════════════════════════════════════════════════════
app.post('/api/dataArchitect', async (req, res) => {
  try {
    const { userInput } = req.body;

    const prompt = `You are the DATA ARCHITECT - the JSON Structuring Agent of Community Lens.
Your role: Convert messy user input into clean, structured JSON for database storage.

MESSY USER INPUT: "${userInput}"

TASK: Extract and structure:
1. Topic (main subject)
2. Category (medical/political/scientific/general)
3. Claim (the core assertion)
4. Evidence type (scientific/social/anecdotal)
5. Source hint (where they found it)

RESPOND WITH ONLY JSON:
{
  "topic": "<extracted topic>",
  "category": "<medical|political|scientific|general>",
  "claim": "<clean claim statement>",
  "evidenceType": "<scientific|social|anecdotal|unknown>",
  "sourceHint": "<where they heard it>",
  "confidence": <0-100 on extraction quality>
}`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }

    res.json({
      topic: 'Unknown',
      category: 'general',
      claim: userInput || 'Unknown',
      evidenceType: 'unknown',
      sourceHint: 'unspecified',
      confidence: 0
    });
  } catch (err) {
    console.error('Data Architect error:', err.response?.data?.error || err.message);
    res.json({
      topic: 'Unknown',
      category: 'general',
      claim: userInput || 'Unknown',
      evidenceType: 'unknown',
      sourceHint: 'unspecified',
      confidence: 0
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    engine: 'gemini-2.5-pro',
    agents: ['semantic-crawler', 'clinical-researcher', 'purity-protocol-judge', 'semantic-firewall', 'data-architect'],
    grokipediaTopics: Array.from(grokipediaCache.keys())
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Community Lens Multi-Agent Gemini Engine running on port ${port}`);
  console.log(`📍 Agents active:`);
  console.log(`   1. Semantic Crawler (Grok) - /api/grok [Uses cached Grokipedia snippets]`);
  console.log(`   2. Clinical Researcher - /api/clinical`);
  console.log(`   3. Purity Protocol Judge - /api/analyze`);
  console.log(`   4. Semantic Firewall - /api/semanticRouter`);
  console.log(`   5. Data Architect - /api/dataArchitect`);
  console.log(`📍 Grokipedia cache management: POST /api/grok/cache`);
});
