// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to call backend functions
const callFunction = async (name, data) => {
  // Production: use Firebase Cloud Functions URL
  // Development: use relative URLs (Vite proxy)
  const isProduction = import.meta.env.PROD;
  let backendUrl = '';
  
  if (isProduction) {
    // Firebase Cloud Functions URLs
    backendUrl = 'https://us-central1-community-lens-dd945.cloudfunctions.net';
  }
  
  const url = backendUrl ? `${backendUrl}/${name}` : `/${name}`;

  console.log('API Call:', { url, data, isProduction });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }), // Wrap data to match httpsCallable expectations or backend logic
    });

    console.log('API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('API Success:', result);
    return result; // Backend returns { data: ... }
  } catch (error) {
    console.error('API Fetch Error:', error.message);
    throw error;
  }
};

// Export wrappers that match the httpsCallable signature (returning a Promise that resolves to { data: ... })
export const createBounty = (data) => callFunction('api/createBounty', data);
export const fetchGrokSource = (data) => callFunction('api/fetchGrokSource', data);
export const fetchConsensus = (data) => callFunction('api/fetchConsensus', data);
export const analyzeDiscrepancy = (data) => callFunction('api/analyzeDiscrepancy', data);
export const mintCommunityNote = (data) => callFunction('api/mintCommunityNote', data);
export const agentGuard = (data) => callFunction('api/agentGuard', data);

// Get bounties from backend
export const getBounties = async () => {
  const isProduction = import.meta.env.PROD;
  let url = '/api/getBounties';
  
  if (isProduction) {
    url = 'https://us-central1-community-lens-dd945.cloudfunctions.net/api/getBounties';
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return { data: [] };
  }
};

export { db };
