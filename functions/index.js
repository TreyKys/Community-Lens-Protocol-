import functions from 'firebase-functions';

const handleApi = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const path = req.path || req.url || '';
  
  if (path.includes('getBounties')) {
    return res.json({ data: [
      { id: '1', topic: 'Malaria Vaccine R21', claim: 'WHO approved vaccine', reward: 500, status: 'OPEN', context: 'Medical' },
      { id: '2', topic: 'Lagos-Abuja Hyperloop', claim: 'Transit project', reward: 100, status: 'OPEN', context: 'Infrastructure' }
    ]});
  }
  
  if (path.includes('createBounty')) {
    return res.json({ success: true });
  }
  
  if (path.includes('fetchGrokSource')) {
    return res.json({ data: { text: 'According to Grokipedia: This is sample content from the alternative source being fact-checked.' }});
  }
  
  if (path.includes('fetchConsensus')) {
    return res.json({ data: { consensusText: 'According to Wikipedia and peer-reviewed sources: This is the consensus view from trusted sources.' }});
  }
  
  if (path.includes('analyzeDiscrepancy')) {
    return res.json({ data: { 
      score: 72, 
      discrepancies: [
        { type: 'CONTRADICTION', text: 'Timeline: Source says 2023, consensus says 2024' },
        { type: 'INCOMPLETE', text: 'Missing context about regulatory approval' }
      ]
    }});
  }
  
  if (path.includes('mintCommunityNote')) {
    return res.json({ data: { assetId: 'did:dkg:otp:2043/0xCommunityNote12345' }});
  }
  
  if (path.includes('agentGuard')) {
    return res.json({ data: { blocked: false, message: 'This topic is not blocked by any Community Note.' }});
  }
  
  res.status(404).json({ error: 'Unknown endpoint: ' + path });
};

export const api = functions.https.onRequest(handleApi);
