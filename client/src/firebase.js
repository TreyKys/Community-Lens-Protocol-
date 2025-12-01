import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloud Functions for core features (bounties, DKG, consensus)
const CLOUD_FUNCTIONS_URL = 'https://us-central1-community-lens-dd945.cloudfunctions.net/api';

// Replit backend for Gemini features (stays permanently online, port 8000)
const REPLIT_BACKEND_URL = 'https://2192a4ea-d452-48bf-b57d-69c6eafeba86-00-1cm2falbtp98y.kirk.replit.dev:8000';

const callFunction = async (endpoint, data) => {
  const url = `${CLOUD_FUNCTIONS_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API error at ${endpoint}:`, error);
    throw error;
  }
};

const callReplitBackend = async (endpoint, data) => {
  const url = `${REPLIT_BACKEND_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Replit backend error at ${endpoint}:`, error);
    throw error;
  }
};

export const createBounty = (data) => callFunction('/createBounty', data);
export const fetchGrokSource = (data) => callReplitBackend('/api/grok', data);
export const fetchConsensus = (data) => callFunction('/fetchConsensus', data);
export const analyzeDiscrepancy = (data) => callReplitBackend('/api/analyze', data);
export const verifyAndMint = (data) => callFunction('/verifyAndMint', data);
export const mintCommunityNote = (data) => callFunction('/mintCommunityNote', data);
export const agentGuard = (data) => callFunction('/agentGuard', data);

export const getBounties = async () => {
  const url = `${CLOUD_FUNCTIONS_URL}/getBounties`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Bounties error:', error);
    throw error;
  }
};

export { db };
