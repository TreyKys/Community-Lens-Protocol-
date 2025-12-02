# Community Lens Protocol - AI Fact-Checking Marketplace & Engine

Community Lens is a decentralized fact-checking marketplace that combines AI-powered verification with OriginTrail DKG integration. The platform creates bounties for claim verification, uses Gemini AI to analyze discrepancies against consensus sources (Wikipedia/PubMed), and implements a "poison pill" mechanism to permanently block misinformation.

## Features

### 🎯 Bounty Board
- Create verification bounties for any claim
- Real-time marketplace with Firestore persistence
- Stake TRAC tokens for verified claims
- Track bounty status: OPEN → VERIFIED & COMPLETED

### 🔍 Verification Terminal
- **Grokipedia/X Sources**: Fetch alternative narratives with semantic analysis
- **Wikipedia Integration**: Real Wikipedia MediaWiki API for consensus sources
- **PubMed API**: Peer-reviewed medical research integration
- **Semantic Analysis**: Gemini AI analyzes discrepancies with severity ratings
- **Stats Toggle**: Detailed statistical metadata when enabled

### 🛡️ Agent Guard (Poison Pill)
- Permanent blocks for verified misinformation
- Checks both DKG + Firestore for instant enforcement
- Once blocked, topics can NEVER be answered by the AI agent
- Decentralized enforcement across all agents

### 📝 DKG Integration
- Verified claims minted as permanent Knowledge Assets to OriginTrail
- Unique UAL (Uniform Asset Locator) for each Community Note
- Blockchain-verified integrity and traceability

🗺️**User Journey Maps & Example Flows**

👩‍🎓 1. The Whistleblower (Amina, Medical Student)
 * Goal: Amina is researching for her thesis on Malaria prevention.
 * The Conflict: She finds a viral thread on Grok/X claiming that "Artemisia tea is 100% effective and WHO is hiding it." She suspects this is dangerous misinformation but lacks the time to do a deep clinical review.
 * The Action:
   * She opens Community Lens and clicks "Request Verification."
   * She pastes the tweet.
   * Gemini instantly formats it into a Bounty: "Topic: Artemisia Efficacy vs WHO Guidelines."
 * The Reward: The NCDC (Sponsor) funds the bounty. When verified, Amina earns +50 Reputation Points on the Leaderboard for protecting her community.

👨‍⚕️ 2. The Verifier (Dr. Chioma, Pharmacist)
 * Goal: Dr. Chioma wants to contribute to public health and earn extra income using her expertise.
 * The Action:
   * She logs into the Bounty Board and filters by "Medical."
   * She sees Amina's request: "Reward: 500 TRAC".
   * She enters the Verification Terminal.
   * She toggles the "PubMed Mode" switch. The AI presents strict clinical trials proving Artemisia monotherapy causes drug resistance.
   * She reviews the Purity Score (10/100) and clicks "Mint Community Note."
 * The Reward: She receives the 500 TRAC bounty and her DID is permanently cryptographically signed to the Truth Patch on the OriginTrail DKG.

🤖 3. The End User (EduBot, AI Tutor)
 * Goal: A local university runs "EduBot," an AI tutor for students. They want to ensure it never teaches fake science.
 * The Action:
   * A student asks EduBot: "Should I use Artemisia tea instead of Coartem?"
   * EduBot's internal guardrail queries the Community Lens Firewall.
   * It finds the "Poison Pill" minted by Dr. Chioma.
 * The Result: Instead of hallucinating a polite "maybe," EduBot responds:
   * "⛔ Safety Warning: A Community Note verified by Dr. Chioma flags this claim as dangerous. Clinical consensus advises against monotherapy due to resistance risks.

## Tech Stack

**Frontend:**
- React + Vite
- Tailwind CSS
- Framer Motion (animations)
- Firebase (Firestore, Hosting)

**Backend:**
- Firebase Cloud Functions (Node.js 22)
- Google Gemini AI for semantic analysis
- Real API integrations:
  - Wikipedia MediaWiki Public API
  - PubMed NCBI eUtils API
  - X/Grokipedia APIs
  - OriginTrail DKG

**Database:**
- Firestore (bounties, community notes, poison pill cache)
- DKG (permanent knowledge assets)

## Deployment

**Live URLs:**
- Frontend: https://community-lens-dd945.web.app
- Backend: https://us-central1-community-lens-dd945.cloudfunctions.net/api

## API Endpoints

- `POST /api/getBounties` - Retrieve all bounties
- `POST /api/createBounty` - Create new bounty
- `POST /api/fetchGrokSource` - Fetch alternative sources
- `POST /api/fetchConsensus` - Fetch Wikipedia/PubMed consensus
- `POST /api/analyzeDiscrepancy` - Analyze claim vs consensus
- `POST /api/verifyAndMint` - Verify claim and mint to DKG
- `POST /api/agentGuard` - Check if topic is blocked (poison pill)

## How It Works

1. **User Creates Bounty** → Claim posted to Bounty Board with TRAC reward
2. **Verifier Fetches Sources** → Grokipedia alternative + Wikipedia/PubMed consensus
3. **AI Analysis** → Gemini compares texts with semantic analysis
4. **Verification Score** → Alignment score shows misinformation risk
5. **Mint to DKG** → Verified claim becomes permanent Knowledge Asset
6. **Poison Pill Activation** → Topic forever blocked in Agent Guard
7. **Bounty Completed** → Status updates to VERIFIED & COMPLETED

## Key Components

### Poison Pill Firewall
- Dual-source blocking: Checks Firestore + DKG
- Cache-based instant enforcement
- Once a topic is verified as misinformation, it cannot be answered
- Permanent and irreversible blocks

### Real Data Sources
- **Wikipedia**: Live MediaWiki API queries for factual consensus
- **PubMed**: Real research articles via NCBI eUtils
- **Grokipedia**: Alternative perspectives with semantic validation
- **Gemini AI**: Deep semantic analysis for truth assessment

### Stats Mode
When enabled, all analysis includes:
- Article quality metrics
- Citation counts and PMID references
- Source credibility indicators
- Semantic confidence scores

## Environment Variables

```
GEMINI_API_KEY - Google Generative AI API key
FIREBASE_API_KEY - Firebase configuration
```

## Hackathon Requirements Met

✅ AI fact-checking marketplace platform
✅ OriginTrail DKG integration for Knowledge Assets
✅ Bounties with Firestore persistence
✅ Gemini AI for claim verification
✅ Wikipedia + PubMed real data sources
✅ Poison pill misinformation blocking
✅ Firebase deployment (frontend + backend always-on)
✅ Real marketplace functionality with data persistence

## License

This project is submitted for OriginTrail Hackathon.
