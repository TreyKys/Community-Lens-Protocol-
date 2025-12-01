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

// ALWAYS use Cloud Functions in production
const API_BASE_URL = 'https://us-central1-community-lens-dd945.cloudfunctions.net/api';

const callFunction = async (endpoint, data) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
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

export const createBounty = (data) => callFunction('/createBounty', data);
export const fetchGrokSource = (data) => callFunction('/fetchGrokSource', data);
export const fetchConsensus = (data) => callFunction('/fetchConsensus', data);
export const analyzeDiscrepancy = (data) => callFunction('/analyzeDiscrepancy', data);
export const verifyAndMint = (data) => callFunction('/verifyAndMint', data);
export const mintCommunityNote = (data) => callFunction('/mintCommunityNote', data);
export const agentGuard = (data) => callFunction('/agentGuard', data);

export const getBounties = async () => {
  const url = `${API_BASE_URL}/getBounties`;
  
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
