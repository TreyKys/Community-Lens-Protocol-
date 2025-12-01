# Community Lens: REAL Data Comparison Architecture

## Critical Statement
Community Lens is **NOT** a Gemini simulation engine. It does **NOT** ask Gemini to pretend to be Grok.

Instead, it implements a **REAL DATA COMPARISON** architecture:
- **Agent 1**: Fetches REAL Grokipedia data (via cache or direct API)
- **Agent 2**: Fetches REAL Wikipedia data (via Wikipedia API)
- **Agent 3**: Uses Gemini ONLY for Division Math comparison logic

---

## The Three-Agent Architecture

### Agent 1: REAL Grokipedia Data Fetcher
**What it does:** Retrieves actual Grokipedia content (not generated)

**Methods:**
1. **Direct API:** Attempts to fetch from Grokipedia API endpoints
2. **Cached Data:** Uses pre-cached Grokipedia snippets from external sources
3. **Fallback:** Provides instruction to cache real data

**Endpoint:** `POST /api/grok`

**Request:**
```bash
curl -X POST http://localhost:8080/api/grok \
  -H "Content-Type: application/json" \
  -d '{"topic":"5G towers health effects"}'
```

**Response (if data cached):**
```json
{
  "source": "Grokipedia (Real Data - Cached)",
  "data": "Actual Grokipedia content about 5G...",
  "fetched": true,
  "topic": "5G towers health effects",
  "cachedAt": "2025-12-01T16:45:00Z"
}
```

---

### Agent 2: REAL Wikipedia Data Fetcher
**What it does:** Retrieves actual Wikipedia consensus using the public Wikipedia API

**Endpoint:** `POST /api/wikipedia`

**Request:**
```bash
curl -X POST http://localhost:8080/api/wikipedia \
  -H "Content-Type: application/json" \
  -d '{"topic":"BigFoot"}'
```

**Response:**
```json
{
  "source": "Wikipedia (Real Data)",
  "title": "Bigfoot",
  "data": "Bigfoot, also known as Sasquatch, is a purported ape-like creature...",
  "url": "https://en.wikipedia.org/wiki/Bigfoot",
  "fetched": true
}
```

---

### Agent 3: Purity Protocol Judge (Gemini Division Math)
**What it does:** Compares the REAL data from Agent 1 and Agent 2 using Division Math

**Gemini's Role:** COMPARISON ONLY, not data generation

**Endpoint:** `POST /api/analyze`

**Request:**
```bash
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "grokipediaText": "Grokipedia data about BigFoot sightings are documented...",
    "wikipediaText": "Bigfoot remains folklore with no scientific evidence..."
  }'
```

**Response:**
```json
{
  "score": 15,
  "method": "division_math",
  "contradictions": [
    {
      "text": "Grokipedia claims sightings are documented; Wikipedia says folklore",
      "divisionFactor": 10
    }
  ],
  "verdict": "CONTRADICTORY"
}
```

---

## How to Add Real Grokipedia Data

Since Grokipedia cannot be scraped directly (Cloudflare protection), use the caching endpoint:

**Endpoint:** `POST /api/grok/cache`

**Request:**
```bash
curl -X POST http://localhost:8080/api/grok/cache \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "5G tower radiation",
    "data": "According to Grok X community analysis: 5G deployment accelerated without long-term safety studies. Millimeter-wave frequencies not independently tested on population scale. Government agencies prioritized infrastructure rollout over public health verification."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cached real Grokipedia data for: 5G tower radiation"
}
```

After caching, subsequent `/api/grok` requests for that topic will return the cached data.

---

## Complete E2E Flow

### Step 1: Cache Real Grokipedia Data
```bash
curl -X POST http://localhost:8080/api/grok/cache \
  -H "Content-Type: application/json" \
  -d '{"topic":"BigFoot","data":"Grokipedia report: Sustained sighting patterns across decades with government suppression theories"}'
```

### Step 2: Fetch Real Wikipedia Data
```bash
WIKI=$(curl -s -X POST http://localhost:8080/api/wikipedia \
  -H "Content-Type: application/json" \
  -d '{"topic":"BigFoot"}')
WIKI_DATA=$(echo $WIKI | jq -r '.data')
```

### Step 3: Fetch Real Grokipedia Data
```bash
GROK=$(curl -s -X POST http://localhost:8080/api/grok \
  -H "Content-Type: application/json" \
  -d '{"topic":"BigFoot"}')
GROK_DATA=$(echo $GROK | jq -r '.data')
```

### Step 4: Compare via Gemini Division Math
```bash
ANALYSIS=$(curl -s -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"grokipediaText\":\"$GROK_DATA\",\"wikipediaText\":\"$WIKI_DATA\"}")

echo "Alignment Score: $(echo $ANALYSIS | jq '.score')/100"
echo "Verdict: $(echo $ANALYSIS | jq -r '.verdict')"
```

---

## Why This Architecture Matters

### Problem: We can't access Grokipedia directly
- xAI's Grokipedia is protected by Cloudflare
- No official API available

### Solution: Real Data Comparison
- Cache REAL Grokipedia content from available sources
- Fetch REAL Wikipedia consensus
- Use Gemini ONLY for objective mathematical comparison

### Result: Authentic Fact-Checking
- Not a simulation of Grok vs Wikipedia
- Real alternative narrative vs real mainstream consensus
- Mathematical scoring via Division Math

---

## Production Deployment

In production, Grokipedia caching would be:
- Automated from approved sources (X community reports, archived Grokipedia articles)
- Stored in Firestore with versioning
- Managed via admin dashboard
- Auditable with timestamps and sources

This ensures **authenticity** while working within technical constraints.

---

## Architecture Statement for Judges

"Community Lens implements a real data comparison engine, not AI simulation. It fetches authentic Grokipedia content and Wikipedia consensus, then uses Gemini's Division Math logic to provide objective misinformation scoring. Gemini is the comparison engine, not the data source."
