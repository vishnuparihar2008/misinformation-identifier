# Rules for the Coding Agent (Antigravity): SachCheck

Read this file first, every session. These rules override convenience.

## 1. Source of truth

Read in this order before writing code: `PRD.md`, `Techstack.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `AI_PIPELINE.md`, `BUILD_PLAN.md`. If two files disagree, `PRD.md` wins for behaviour and `API_SPEC.md` wins for contracts. Ask before deviating.

## 2. Non-negotiable product rules

1. **Never auto-post to a group.** Only the approve handler may call the adapter's `sendToGroup`.
2. **Never invent sources or URLs.** Any URL in a verdict or reply must come from a retrieved tool result. Strip anything else in post-processing.
3. **Prefer `unverified` over a guess.** No evidence means no hard verdict.
4. **Reply in the same language as the original message.** Never name or shame the sender.
5. **Store minimum data.** Hash sender IDs; do not store images beyond the check unless the user opts in.
6. **Disclose the bot's presence** when it joins a group.

## 3. Code conventions

- **Node:** ES modules, async/await, `zod` validation on every request body, centralised error middleware, no business logic in route files (use services).
- **Python:** type hints, Pydantic models for every LLM output, `httpx` for external calls, timeouts on every call.
- **React:** functional components and hooks, Tailwind for styling, API calls in one `api/` module, loading and error states for every list.
- **Config:** all secrets and thresholds from environment variables; update `.env.example` whenever you add one.
- **Naming:** `camelCase` in JS, `snake_case` in Python and JSON fields returned by the AI service; convert at the Node boundary.
- **Comments:** explain why, not what.

## 4. Project structure (do not reorganise without asking)

```
sachcheck/
  client/src/{api,components,pages,hooks}
  server/src/{routes,services,adapters,models,middleware,config}
  ai-service/app/{main.py,pipeline/,providers/,schemas/,tests/}
  docs/
```

## 5. Working style

- Build **one phase at a time** from `BUILD_PLAN.md`. After each phase, stop, summarise what changed, list how to run and test it, and wait for confirmation.
- Make small, reviewable commits with clear messages.
- Do not add dependencies outside `Techstack.md` without asking; if one is needed, explain why.
- Write a small test or fixture check for each pipeline stage; run the fixture messages from `AI_PIPELINE.md` after any prompt change.
- If an external API is unavailable or a key is missing, create a clearly marked mock so work can continue, and list it under "Mocks to replace".

## 6. Security and privacy

- Never log secrets, full message bodies at info level, or raw sender IDs.
- Validate and size-limit uploads (images only, e.g. max 5 MB).
- Enable CORS only for the known client origin.
- Rate-limit public endpoints.
- Provide the delete-data endpoint as specified.

## 7. Definition of done

A task is done only when: acceptance criteria in `PRD.md` are met, failure modes in `ARCHITECTURE.md` are handled, no secrets are hardcoded, and the app runs from a clean clone using the README steps.

## 8. When unsure

Ask a short, specific question instead of guessing. Prefer the simplest implementation that satisfies the MVP cut line.
