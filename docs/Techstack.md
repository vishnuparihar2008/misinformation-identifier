# Tech Stack: SachCheck

MERN for the product, plus a small Python (FastAPI) service for the AI/ML work. Everything below is free-tier friendly for a hackathon. Verify current free-tier limits and API names before you build, since they change.

## 1. Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, React Router, Recharts | Fast setup, clean dashboard, simple charts |
| Backend | Node.js 20 + Express | Core MERN API and bot orchestration |
| Database | MongoDB Atlas (free tier) + Mongoose | Flexible documents for checks, evidence, tactics |
| Realtime | Socket.IO | Dashboard updates live when a check finishes |
| Messaging (safe path) | grammY (or node-telegram-bot-api) | Official Telegram Bot API; privacy mode off to see group messages |
| Messaging (demo path) | whatsapp-web.js (or Baileys) | Spare number joins the test group; unofficial, ToS risk |
| AI service | Python 3.11 + FastAPI + Uvicorn | Your Python/ML strength; keeps ML code out of Node |
| LLM | Provider-agnostic wrapper (Gemini or Claude API) | Structured JSON output, multilingual, Hinglish friendly |
| Fact-check source | Google Fact Check Tools API (`claims:search`) | Real, existing fact-checks to cite |
| Reverse image search | Google Cloud Vision Web Detection (alt: SerpAPI Google Lens, TinEye) | Finds earliest known appearances of an image |
| OCR | Gemini/Claude vision, or pytesseract as a fallback | Read text from screenshots |
| Embeddings | `sentence-transformers` multilingual model (e.g. paraphrase-multilingual-MiniLM-L12-v2) | Claim matching in Hindi/English/Hinglish |
| Vector search | In-memory cosine similarity for MVP; MongoDB Atlas Vector Search as stretch | No extra infra needed |
| Language detection | `langdetect` or `lingua-py` | Reply in the same language |
| Web search (optional) | Tavily or Serper API | Extra evidence when fact-check API has no match |
| Validation | zod (Node), Pydantic (Python) | Strict schema for LLM JSON output |
| Hosting | Vercel (frontend), Render or Railway (Node + FastAPI) | Quick deploys; ngrok for local webhooks during the demo |
| Tooling | ESLint, Prettier, dotenv, Postman or Bruno | Standard hygiene |

## 2. Service layout

```
sachcheck/
  client/        React + Vite dashboard
  server/        Express API, bot adapters, job orchestration
  ai-service/    FastAPI: claim gate, verdict, tactics, reply, image check, embeddings
  docs/          these MD files
```

Node calls the AI service over HTTP (`POST /analyze`, `POST /analyze-image`). Keep the two decoupled so the AI service can be swapped or scaled alone.

## 3. LLM and AI/ML components

| Component | Technique | Notes |
|---|---|---|
| Claim gate | LLM classifier (cheap/fast model) returning `is_claim` plus a reason | Skip chit-chat to save quota and avoid false accusations |
| Verdict engine | LLM with retrieved evidence in the prompt (RAG-style grounding) | Output must follow a JSON schema; reject unretrieved URLs |
| Manipulation tactics | LLM tagging against a fixed taxonomy | Taxonomy in `AI_PIPELINE.md` |
| Reply generator | LLM with tone variants, same language as input | Hinglish in, Hinglish out |
| Image check | OCR plus reverse image search plus LLM summary of "what it really showed" | Demo hero feature |
| Claim matching | Embeddings plus cosine similarity against cached fact-checks | Stretch |
| Caching | Hash of normalised message text to stored result | Saves quota and speeds the demo |

## 4. Environment variables

```
# server/.env
PORT=5000
MONGODB_URI=
AI_SERVICE_URL=http://localhost:8000
TELEGRAM_BOT_TOKEN=
NUDGE_THRESHOLD=0.70
JWT_SECRET=

# ai-service/.env
LLM_PROVIDER=gemini            # or claude
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
FACT_CHECK_API_KEY=
VISION_API_KEY=
SEARCH_API_KEY=                # optional (Tavily/Serper)
```

Never commit `.env` files. Add them to `.gitignore`.

## 5. Quick-start commands

```bash
# frontend
npm create vite@latest client -- --template react
cd client && npm i axios react-router-dom recharts socket.io-client && npm i -D tailwindcss

# backend
mkdir server && cd server && npm init -y
npm i express mongoose cors dotenv zod socket.io grammy whatsapp-web.js axios

# ai service
cd ../ai-service && python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv httpx langdetect sentence-transformers pillow pytesseract
```

## 6. Alternatives and trade-offs

- **Telegram only**: simplest and fully legit, but the demo is not on WhatsApp.
- **Forward-to-bot tipline**: best real-world story; needs the official WhatsApp Business API and approval, so treat it as the roadmap item.
- **Next.js instead of Vite + Express**: fewer moving parts, but it leaves the MERN structure your prompt asked for.
- **Node-only AI calls**: skip FastAPI if the team has no Python time; move F10 (embeddings) to the stretch list.

## 7. Cost and quota notes

- Check free-tier request limits for your LLM, Vision and Fact Check keys before demo day.
- Cache by message hash and pre-run the three demo examples so the demo never depends on live quota.
