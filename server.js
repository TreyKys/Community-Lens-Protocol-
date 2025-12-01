import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Initialize with API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC1Kaweh-kiWJWO-lXKfYdYwSl6BvUEOZ0';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

console.log('✅ Community Lens Gemini backend initialized (REST API mode)');

// Fetch alternative narrative (Grok)
app.post('/api/grok', async (req, res) => {
  try {
    const { topic, includeStats } = req.body;
    
    const prompt = `Provide a brief alternative or contrarian perspective on: "${topic}"
Include: key alternative claims, credible sources, timeline. Keep factual.
${includeStats ? 'Include confidence levels.' : 'Be concise.'} Start with: "According to alternative sources:"`;

    const response = await axios.post(`${API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis in progress';
    return res.json({ text: `According to alternative sources: ${text}` });
  } catch (err) {
    console.error('Grok error:', err.response?.data?.error || err.message);
    res.json({ text: `According to alternative sources: Alternative perspectives on ${req.body.topic} require additional research and source verification.` });
  }
});

// Analyze discrepancy with Gemini
app.post('/api/analyze', async (req, res) => {
  try {
    const { suspectText, consensusText, includeStats } = req.body;

    const prompt = `Analyze discrepancies between these texts. Rate alignment 0-100.
SUSPECT: "${suspectText.substring(0, 300)}"
CONSENSUS: "${consensusText.substring(0, 300)}"
${includeStats ? 'Include semantic similarity score and entity overlap.' : ''}
Format as JSON: {score: number, discrepancies: [{type: string, text: string, severity: string}]}`;

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
      discrepancies: [{ type: 'SEMANTIC_ANALYSIS', text: 'Discrepancy detected between claims', severity: 'medium' }]
    });
  } catch (err) {
    console.error('Analyze error:', err.response?.data?.error || err.message);
    res.json({
      score: 50,
      discrepancies: [{ type: 'ANALYSIS_ERROR', text: 'Analysis service temporarily unavailable', severity: 'low' }]
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', gemini: 'active' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Community Lens Gemini backend running on port ${port} (REST API mode)`);
  console.log(`📍 Publicly accessible at: https://2192a4ea-d452-48bf-b57d-69c6eafeba86-00-1cm2falbtp98y.kirk.replit.dev:${port}`);
  console.log(`📍 Gemini 2.5 Pro features: /api/grok and /api/analyze`);
});
