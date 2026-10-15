# Build Plan: SachCheck

Assumption: you did not say how much time or how many teammates you have, so this plan uses **relative phases** and a flexible role split. Scale the phases to your deadline and keep the MVP cut line from `PRD.md`.

## 1. Phases

| Phase | Goal | Done when |
|---|---|---|
| 0. Setup | Repo, folders, env files, keys, MongoDB Atlas cluster | `client`, `server`, `ai-service` all start locally |
| 1. Core engine | AI service: language detect, claim gate, verdict with evidence, tactics, replies | `POST /analyze` returns valid JSON for the 6 fixture messages |
| 2. Backend + DB | Express API, Mongoose models, orchestrator, caching, Socket.IO | A manual check from Postman is stored and returned |
| 3. Channel | Telegram bot with private nudge and Approve / Edit / Dismiss buttons | A message in a test group produces a nudge; Approve posts the reply |
| 4. Dashboard | React list of checks, detail view, copy reply, manual paste box | Live updates appear when a check finishes |
| 5. Hero feature | Image check (OCR + reverse image search) | An old photo with a false caption shows its earliest appearance |
| 6. Demo path | WhatsApp adapter (spare number, test group), caching of demo examples | Same flow works on WhatsApp for the demo |
| 7. Polish | Disclosure message, delete-data action, error states, README, pitch | Demo script runs twice in a row with no failures |

Cut order if time runs short: embeddings (F10), Hinglish extras (F9), image check (F8), WhatsApp adapter (use Telegram for the demo).

## 2. Role split (adapt to team size)

| Role | Owns | Main files |
|---|---|---|
| **AI / ML owner** (you, strong Python/ML) | `ai-service/`: prompts, schemas, evidence retrieval, image check, test fixtures | `AI_PIPELINE.md` |
| **Backend owner** | `server/`: API, models, orchestrator, bot adapters | `API_SPEC.md`, `ARCHITECTURE.md` |
| **Frontend / demo owner** | `client/`: dashboard, copy buttons, pitch deck, demo script | `PRD.md`, `DEMO_SCRIPT.md` |

Team of 2: merge backend and frontend. Team of 4: add a dedicated "bots and integrations" owner for Telegram plus WhatsApp.

## 3. Checkpoints

- **Checkpoint A (end of Phase 2):** contract frozen; everyone codes against `API_SPEC.md`.
- **Checkpoint B (end of Phase 3):** full text flow works end to end on Telegram. This is your safe demo; record a backup video now.
- **Checkpoint C (end of Phase 5):** image flow works. Freeze features after this.
- **Final 20% of time:** no new features; fix bugs, rehearse, record a backup demo video.

## 4. Definition of done (per feature)

1. Matches the acceptance criteria in `PRD.md`.
2. Handles the failure modes in `ARCHITECTURE.md`.
3. No hardcoded secrets; `.env.example` updated.
4. Works on the fixture messages; no invented source URLs.

## 5. Risk checklist before demo day

- [ ] Telegram backup demo works with no WhatsApp dependency
- [ ] Spare WhatsApp number is warmed up and in the test group
- [ ] Demo examples are cached so quota or latency cannot break the demo
- [ ] Disclosure message is shown in the test group
- [ ] Backup screen recording is saved locally
