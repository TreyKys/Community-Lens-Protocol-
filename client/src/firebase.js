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

// Endpoints - use local backend in dev, Cloud Functions in production
const CLOUD_FUNCTIONS_URL = 'https://us-central1-community-lens-dd945.cloudfunctions.net/api';
const LOCAL_BACKEND_URL = 'http://localhost:8080/api';
const API_URL = import.meta.env.DEV ? LOCAL_BACKEND_URL : CLOUD_FUNCTIONS_URL;

const callFunction = async (endpoint, data) => {
  const url = `${API_URL}${endpoint}`;
  
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
export const fetchGrokSource = (data) => callFunction('/grok', data);
export const fetchConsensus = (data) => callFunction('/wikipedia', data);
export const analyzeDiscrepancy = (data) => callFunction('/analyze', data);
export const verifyAndMint = (data) => callFunction('/verifyAndMint', data);
export const mintCommunityNote = (data) => callFunction('/mintCommunityNote', data);
export const agentGuard = (data) => callFunction('/agentGuard', data);

export const getBounties = async () => {
  const url = `${API_URL}/getBounties`;
  
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
