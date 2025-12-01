import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Initialize Gemini with API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD1DcF24HWQKslGkN4mwXJK8Bviqnnp_8M';
let genAI = null;

try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini initialized on Replit backend');
} catch (err) {
  console.error('❌ Gemini init error:', err.message);
}

// Fetch alternative narrative (Grok)
app.post('/api/grok', async (req, res) => {
  try {
    const { topic, includeStats } = req.body;
    
    if (!genAI) {
      return res.json({ text: `According to alternative sources: Alternative perspectives on ${topic} require additional research and source verification.` });
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Provide a brief alternative or contrarian perspective on: "${topic}"
Include: key alternative claims, credible sources, timeline. Keep factual.
${includeStats ? 'Include confidence levels.' : 'Be concise.'} Start with: "According to alternative sources:"`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return res.json({ text: `According to alternative sources: ${text}` });
  } catch (err) {
    console.error('Grok error:', err.message);
    res.json({ text: `According to alternative sources: Alternative perspectives on ${req.body.topic} require additional research and source verification.` });
  }
});

// Analyze discrepancy with Gemini
app.post('/api/analyze', async (req, res) => {
  try {
    const { suspectText, consensusText, includeStats } = req.body;
    
    if (!genAI) {
      return res.json({
        score: 50,
        discrepancies: [{ type: 'ANALYSIS_NEUTRAL', text: 'Semantic analysis unavailable', severity: 'low' }]
      });
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analyze discrepancies between these texts. Rate alignment 0-100.
SUSPECT: "${suspectText.substring(0, 300)}"
CONSENSUS: "${consensusText.substring(0, 300)}"
${includeStats ? 'Include semantic similarity score and entity overlap.' : ''}
Format as JSON: {score: number, discrepancies: [{type: string, text: string, severity: string}]}`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return res.json(JSON.parse(jsonMatch[0]));
    }
    
    res.json({
      score: 50,
      discrepancies: [{ type: 'ANALYSIS_INCOMPLETE', text: 'Could not parse response', severity: 'medium' }]
    });
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.json({
      score: 50,
      discrepancies: [{ type: 'ANALYSIS_ERROR', text: 'Analysis failed', severity: 'low' }]
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gemini: genAI ? 'active' : 'inactive' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Community Lens Gemini backend running on port ${port}`);
  console.log(`📍 Publicly accessible at: https://2192a4ea-d452-48bf-b57d-69c6eafeba86-00-1cm2falbtp98y.kirk.replit.dev:${port}`);
  console.log(`📍 Gemini features: /api/grok and /api/analyze`);
});
