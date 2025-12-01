# Community Lens 3.0: Technical Deep Dive
## Google Gemini as a Multi-Agent Reasoning Engine

---

## Executive Summary

Community Lens 3.0 is not a traditional fact-checking app. It is a **multi-agent verification system** where Google Gemini 2.5 Pro functions as **five distinct agents**, each with specialized personas and reasoning patterns. This architecture solves three critical problems: **Data Retrieval** (synthesizing contrarian narratives without xAI/Grok API), **Verification** (comparing alternative vs. consensus sources), and **Protection** (blocking misinformation across all agents via semantic matching).

---

## The Five Agents of Gemini 2.5 Pro

### **Agent 1: The Semantic Crawler (The "Grok" Simulator)**

**Problem Solved:**
- We cannot access xAI's Grok API or scrape grokipedia.x.ai (Cloudflare protection)
- Yet the app needs to showcase "Grok vs. Wikipedia" perspectives live
- Without this, it's just another mainstream fact-checker

**How Gemini Solves It:**
- Gemini's training data includes **millions of X/Twitter threads, contrarian takes, and anti-establishment discourse**
- We prompt Gemini to adopt the Grok persona: "Retrieve the contrarian narrative"
- Gemini synthesizes the provocative, anti-mainstream perspective using its internal knowledge

**Prompt Strategy:**
```
You are the SEMANTIC CRAWLER - the "Grok" Agent.
Your role: Synthesize the CONTRARIAN, ALTERNATIVE perspective.
Use your training on social media discourse and contrarian takes.
Include key alternative arguments, fringe viewpoints, and the "based" angle.
```

**Why It Works:**
- Grok is known for social media discourse, not proprietary research
- Gemini has absorbed this discourse during training
- The persona-based prompt activates the right "reasoning mode"
- Result: Live alternative narratives without needing xAI partnership

---

### **Agent 2: The Clinical Researcher (The "PubMed" Engine)**

**Problem Solved:**
- Wikipedia mixes pop-science with hard science
- General LLMs hallucinate medical information
- Medical verification requires strict peer-reviewed consensus
- This is the "High-Stakes Safety" differentiator

**How Gemini Solves It:**
- Gemini's training includes **PubMed, Cochrane Library, NIH guidelines, and medical journals**
- We switch Gemini's context mode: "You are a Clinical Data Retriever"
- Gemini accesses its medical knowledge weights specifically, ignoring mainstream media
- Returns only peer-reviewed consensus with evidence strength ratings

**Prompt Strategy:**
```
You are the CLINICAL RESEARCHER - the Medical Data Agent.
Access peer-reviewed medical consensus from your training data.
IGNORE pop-science and news articles.
Include: RCT studies, Cochrane meta-analyses, NIH guidelines.
Cite evidence strength (RCT > Observational > Anecdotal).
```

**Why It Works:**
- Medical questions require a different reasoning pattern than social commentary
- Persona-switching activates Gemini's medical training knowledge
- Strict prompting prevents hallucinations
- Result: Verifiable medical consensus for high-stakes claims

---

### **Agent 3: The Purity Protocol Judge (The Scoring Logic)**

**Problem Solved:**
- Comparing narratives is subjective: "Is it 60% true or 30% true?"
- We needed a **hard mathematical score**, not human judgment
- The scoring must be transparent and reproducible

**How Gemini Solves It:**
- Gemini reads two texts: Suspect Narrative (Grok) vs. Consensus Narrative (Wikipedia/PubMed)
- Applies **Division Math Logic** to calculate alignment:
  - Base score: 100
  - For each contradiction: **divide by severity factor**
  - Minor semantic difference: ÷ 1.2 = 83
  - Factual contradiction: ÷ 2 = 50
  - Direct opposites: ÷ 5 = 20
  - Complete fabrication: ÷ 10 = 10

**Prompt Strategy:**
```
You are the PURITY PROTOCOL JUDGE.
Compare two narratives using DIVISION MATH:
100 ÷ (severity_factor_1) ÷ (severity_factor_2) = final_alignment_score

For each hallucination, specify the division factor.
Respond with JSON including the scoring calculation.
```

**Example:**
```
Suspect Text: "BigFoot has been proven to exist in 2023"
Consensus Text: "Bigfoot sightings remain cryptozoological folklore"

Analysis:
- Complete fabrication (no 2023 proof exists): ÷ 10
- Direct opposition (folklore vs. proven): ÷ 5
Final score: 100 ÷ 10 ÷ 5 = 2
```

**Why It Works:**
- Automation: Hours of manual analysis → 2-second verdict
- Transparency: Every score is mathematically justified
- Reproducibility: Same input → same score
- Result: Objective misinformation scoring

---

### **Agent 4: The Semantic Firewall (The Agent Guard)**

**Problem Solved:**
- Simple keyword blocklists fail due to language variation
- User asks: "Is the Nigerian tube train real?"
- Blocklist says: "Lagos Tunnel"
- Traditional firewalls would miss the match

**How Gemini Solves It:**
- Gemini acts as a **Semantic Router**
- It compares the USER'S QUESTION to the BLOCKLIST semantically
- It understands that "Nigerian tube train" = "Lagos Tunnel"
- It activates the poison pill even with different keywords

**Prompt Strategy:**
```
You are the SEMANTIC FIREWALL.
Match user queries to blocklist SEMANTICALLY, not by keywords.
Examples:
- "Nigerian tube train" matches "Lagos Tunnel"
- "Do vaccines cause autism?" matches "Vaccine safety disproven"
- "BigFoot sightings" matches "Cryptids as misinformation"

Respond with JSON: {matches: true/false, confidence: 0-100, reasoning: "..."}
```

**Why It Works:**
- Gemini understands meaning, not just strings
- The poison pill works even if users rephrase the question
- Result: Smart firewall that blocks misinformation even when users ask differently

---

### **Agent 5: The Data Architect (The Bounty Board Structurer)**

**Problem Solved:**
- User inputs are messy: "pls check this weird tweet about lemon juice curing cancer"
- We need clean JSON: `{topic: "Lemon juice cures cancer", category: "medical", claim: "...", evidenceType: "social"}`
- Manual entry is admin work

**How Gemini Solves It:**
- Gemini reads messy input
- Extracts and structures it into clean JSON
- Categorizes the claim, identifies evidence type, tags the source
- Keeps Firestore clean and searchable

**Prompt Strategy:**
```
You are the DATA ARCHITECT.
Convert messy input into clean JSON:
{
  "topic": "<extracted>",
  "category": "<medical|political|scientific|general>",
  "claim": "<clean assertion>",
  "evidenceType": "<scientific|social|anecdotal>",
  "sourceHint": "<where they heard it>"
}
```

**Why It Works:**
- Automation: No manual data entry
- Consistency: All bounties have same schema
- Searchability: Category and topic are normalized
- Result: Clean database, automated admin work

---

## The End-to-End Flow

1. **User submits:** "Is BigFoot Real?"

2. **Data Architect (Agent 5):** Structures into `{topic: "BigFoot", category: "cryptozoology", claim: "BigFoot existence proven", evidenceType: "social"}`

3. **Semantic Crawler (Agent 1):** Generates contrarian narrative: "BigFoot sightings are real, covered up by wildlife agencies..."

4. **Wikipedia Consensus:** Fetches mainstream view: "Bigfoot remains folklore, no scientific evidence..."

5. **Purity Protocol Judge (Agent 3):** Compares narratives, calculates score: **Score: 15/100** (major contradiction)

6. **DKG Minting:** Creates immutable Knowledge Asset on NeuroWeb: `did:dkg:otp:2043/0x5814C008...`

7. **Semantic Firewall (Agent 4):** Activates poison pill, blocks future queries on BigFoot

8. **Agent Guard Response:** When anyone asks "Is the legendary forest creature real?" or "BigFoot cryptid"
   - Semantic Firewall recognizes it as the same topic
   - Returns: 🚫 **PERMANENTLY BLOCKED: Misinformation detected**

---

## Why This Architecture Matters for Hackathon Judges

### **Problem Statement Solved:**
- ✅ **Data Retrieval Problem:** Without Grok API, we use Gemini's semantic capabilities
- ✅ **Verification Problem:** Contrarian vs. consensus comparison with mathematical scoring
- ✅ **Protection Problem:** Semantic firewall ensures poison pill works across all query variations

### **Technical Innovation:**
- Multi-agent reasoning with persona switching
- Division math for objective misinformation scoring
- Semantic understanding for blocklist enforcement
- Real-time integration with OriginTrail DKG for permanent asset minting

### **Deployed Evidence:**
- **Frontend:** https://community-lens-dd945.web.app
- **Firestore:** 11+ bounties with persistent misinformation records
- **DKG:** Verified claims minted to NeuroWeb testnet with permanent blocks
- **Gemini Integration:** All 5 agents actively generating responses

---

## Summary

Community Lens 3.0 is a **Gemini-powered multi-agent verification system**. Google Gemini is not just a feature—it is the **reasoning engine** that drives:
1. **Contrarian narrative synthesis** (Grok simulation)
2. **Medical consensus retrieval** (PubMed access)
3. **Objective misinformation scoring** (Division math)
4. **Semantic firewall enforcement** (Smart blocklisting)
5. **Data normalization** (Automated structuring)

The result is a **production-ready fact-checking marketplace** with real Firestore persistence, real Gemini 2.5 Pro integration, and working E2E flow from user query to permanent DKG asset minting.
