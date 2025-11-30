import functions from 'firebase-functions';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// getBounties - return demo data
app.get('/api/getBounties', async (req, res) => {
  res.json({ data: [
    { id: '1', topic: 'Malaria Vaccine R21', claim: 'WHO approved vaccine', reward: 500, status: 'OPEN', context: 'Medical' },
    { id: '2', topic: 'Lagos-Abuja Hyperloop', claim: 'Operational transit project', reward: 100, status: 'OPEN', context: 'Infrastructure' }
  ]});
});

// Export as single Cloud Function
export const api = functions.https.onRequest(app);
