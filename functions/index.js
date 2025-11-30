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
  
  if (path === '/fetchGrokSource' || path === '/api/fetchGrokSource') {
    return res.json({ data: { text: 'According to Grokipedia sources: This is sample content from the alternative source being fact-checked.' }});
  }
  
  if (path === '/fetchConsensus' || path === '/api/fetchConsensus') {
    return res.json({ data: { consensusText: 'According to Wikipedia and peer-reviewed sources: This is the consensus view from trusted sources.' }});
  }
  
  if (path === '/analyzeDiscrepancy' || path === '/api/analyzeDiscrepancy') {
    return res.json({ data: { 
      score: 72, 
      discrepancies: [
        { type: 'CONTRADICTION', text: 'Timeline mismatch: Source claims 2023, consensus says 2024' },
        { type: 'INCOMPLETE', text: 'Missing context about regulatory approval process' }
      ]
    }});
  }
  
  if (path === '/mintCommunityNote' || path === '/api/mintCommunityNote') {
    return res.json({ data: { assetId: 'did:dkg:otp:2043/0xCommunityNote' }});
  }
  
  if (path === '/agentGuard' || path === '/api/agentGuard') {
    return res.json({ data: { blocked: false, message: 'This information is not blocked by any poison pill.' }});
  }
  
  res.json({ error: 'Unknown endpoint' });
});
