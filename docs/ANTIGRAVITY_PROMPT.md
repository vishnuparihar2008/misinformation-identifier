# Antigravity Prompt Pack: SachCheck

Put all the `.md` files from this pack in the project's `docs/` folder (or attach them to the prompt). Then paste the **Master prompt** below, followed by one **Phase prompt** at a time.

## Files in this pack

| File | Purpose |
|---|---|
| `PRD.md` | What to build and why; features, acceptance criteria, MVP cut line |
| `Techstack.md` | MERN plus Python AI service, libraries, env vars, commands |
| `ARCHITECTURE.md` | Components, sequence flow, status lifecycle, failure modes |
| `API_SPEC.md` | Data model, REST endpoints, AI service contracts, bot commands |
| `AI_PIPELINE.md` | Stages, tactic taxonomy, JSON schemas, prompts, grounding checks, test messages |
| `BUILD_PLAN.md` | Phases, role split, checkpoints, definition of done |
| `DEMO_SCRIPT.md` | 60-second demo, pitch, judge Q&A |
| `ANTIGRAVITY_RULES.md` | Rules the agent must follow |

## Master prompt

```
You are the lead engineer on a hackathon project called SachCheck.

First read these files in /docs, in this order: ANTIGRAVITY_RULES.md, PRD.md, Techstack.md,
ARCHITECTURE.md, API_SPEC.md, AI_PIPELINE.md, BUILD_PLAN.md.

Then:
1. Summarise the product, the MVP cut line, and the three rules you consider most important
   (max 10 lines) so I can confirm you understood.
2. Propose the exact folder structure and a task list for Phase 0 only.
3. Wait for my "go" before writing code.

Work one phase at a time. After each phase, stop and report: what changed, how to run it,
how to test it, and any mocks to replace. Follow ANTIGRAVITY_RULES.md strictly: never auto-post
to a group, never invent source URLs, prefer "unverified" over guessing, stay inside the
tech stack unless you ask first.
```

## Phase prompts

**Phase 0: Setup**
```
Do Phase 0 from BUILD_PLAN.md. Create client/, server/, ai-service/ with the structure in
ANTIGRAVITY_RULES.md, .env.example files, .gitignore, and a root README with run steps.
Each service must start and expose a health endpoint. Stop and report.
```

**Phase 1: AI core**
```
Do Phase 1. Build the FastAPI service per AI_PIPELINE.md: language detection, claim gate,
evidence retrieval (Google Fact Check Tools API, with a mock when no key), grounded verdict,
tactic tagging, reply variants, and post-processing checks. Add tests/fixtures.json from the
sample messages and a script that runs them. Stop and report.
```

**Phase 2: Backend and database**
```
Do Phase 2. Build the Express API, Mongoose models, orchestrator (dedupe, cache, AI call with
timeout, nudge decision), and Socket.IO per API_SPEC.md and ARCHITECTURE.md. Include zod
validation and error middleware. Stop and report with curl examples.
```

**Phase 3: Telegram channel**
```
Do Phase 3. Build the Telegram adapter with grammY: group message ingestion, disclosure
message, private nudge to the Installer with inline buttons (Send polite correction, Edit,
Dismiss), /start, /threshold, /pause, /resume. Only the approve handler may post to the group.
Stop and report.
```

**Phase 4: Dashboard**
```
Do Phase 4. Build the React dashboard: checks list with verdict badges and filters, detail
view with summary, tactics and sources, copy-reply button, manual paste/upload box, live
updates via Socket.IO, loading and error states. Clean, simple, mobile-friendly. Stop and report.
```

**Phase 5: Image check**
```
Do Phase 5. Add /analyze-image per AI_PIPELINE.md section 7: OCR, reverse image search
(Vision Web Detection, mock if no key), earliest appearance summary, then the normal pipeline.
Add upload to the dashboard and the Telegram adapter. Stop and report.
```

**Phase 6: WhatsApp demo adapter**
```
Do Phase 6. Add a whatsapp-web.js adapter behind the same adapter interface, for demo use only.
Keep the human-approval rule. Add a clear warning in the README that this approach is
unofficial and against WhatsApp ToS. Stop and report.
```

**Phase 7: Polish**
```
Do Phase 7. Add the delete-data endpoint and dashboard action, error and empty states,
caching of the three demo examples, and finalize the README. Then run the fixture messages
and the failure-mode checks in ARCHITECTURE.md and report the results.
```

## Tips for using the pack

- Keep the master prompt and `ANTIGRAVITY_RULES.md` in the project so the agent re-reads them each session.
- Review each phase report before saying "go" to the next phase.
- Keep your own API keys out of prompts; set them only in `.env` files.
- If the agent drifts, reply: "Re-read ANTIGRAVITY_RULES.md and PRD.md section 6, then fix."
