import functions from 'firebase-functions';

export const api = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const path = req.path;
  
  if (path === '/getBounties' || path === '/api/getBounties') {
    return res.json({ data: [
      { id: '1', topic: 'Malaria Vaccine R21', claim: 'WHO approved vaccine', reward: 500, status: 'OPEN', context: 'Medical' },
      { id: '2', topic: 'Lagos-Abuja Hyperloop', claim: 'Transit project', reward: 100, status: 'OPEN', context: 'Infrastructure' }
    ]});
  }
  
  if (path === '/createBounty' || path === '/api/createBounty') {
    return res.json({ success: true });
  }
  
  if (path === '/analyzeDiscrepancy' || path === '/api/analyzeDiscrepancy') {
    return res.json({ data: { match: 85 } });
  }
  
  if (path === '/agentGuard' || path === '/api/agentGuard') {
    return res.json({ data: { blocked: false } });
  }
  
  res.json({ error: 'Unknown endpoint' });
});
