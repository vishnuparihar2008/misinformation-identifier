# API Spec and Data Model: SachCheck

Base URL (server): `/api`. JSON in and out. Validate every body with `zod`. Errors use `{ "error": { "code": "string", "message": "string" } }`.

## 1. Data model (MongoDB / Mongoose)

### `groups`
```js
{
  _id, platform: "telegram" | "whatsapp" | "web",
  externalId: String,            // chat id from the platform
  name: String,
  installerRef: String,          // hashed id of the person who installed the bot
  disclosureSentAt: Date | null,
  nudgeThreshold: Number,        // default 0.70
  createdAt, updatedAt
}
```

### `checks`
```js
{
  _id,
  groupId: ObjectId,
  platform, messageId: String,   // unique together with groupId
  senderRef: String,             // hashed, never the display name
  textHash: String,              // for cache / dedupe
  text: String | null,
  hasImage: Boolean,
  language: "en" | "hi" | "hinglish" | "other",
  status: "received" | "ignored" | "analyzing" | "completed" | "nudged" | "approved" | "dismissed" | "failed",
  gate: { isClaim: Boolean, claimText: String, reason: String },
  verdict: "likely_false" | "misleading" | "likely_true" | "unverified" | "not_a_claim" | null,
  confidence: Number | null,
  summary: String,
  tactics: [{ code: String, explanation: String }],
  sources: [{ title: String, url: String, publisher: String, rating: String }],
  uncertaintyNote: String | null,
  imageFindings: { earliestSeen: { url, date }, whatItShowed: String } | null,
  replyVariants: [{ tone: "gentle" | "factual" | "short", text: String }],
  approvedReply: { tone: String, text: String, edited: Boolean, postedAt: Date } | null,
  createdAt, updatedAt
}
```
Indexes: unique `(groupId, messageId)`, index on `textHash`, index on `createdAt` descending.

### `cache` (optional)
`{ textHash, result, createdAt }` with a TTL index (e.g. 7 days).

## 2. Server REST endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/checks` | Submit a message manually (web paste/upload) |
| GET | `/api/checks` | List checks (`?limit=20&verdict=likely_false&groupId=`) |
| GET | `/api/checks/:id` | Full check detail |
| POST | `/api/checks/:id/approve` | Approve a reply variant; posts to the group |
| POST | `/api/checks/:id/dismiss` | Dismiss the nudge; nothing is posted |
| POST | `/api/checks/:id/retry` | Re-run a `failed` check |
| GET | `/api/groups` | List connected groups |
| PATCH | `/api/groups/:id` | Update threshold or name |
| POST | `/api/groups/:id/disclose` | Send the disclosure message to the group |
| DELETE | `/api/groups/:id/data` | Delete all stored data for a group |
| GET | `/api/health` | Liveness check |

### `POST /api/checks`
Request (JSON or multipart with an `image` file):
```json
{ "text": "string (optional if image)", "platform": "web", "groupId": "optional" }
```
Response `202`:
```json
{ "checkId": "string", "status": "analyzing" }
```

### `POST /api/checks/:id/approve`
```json
{ "tone": "gentle", "editedText": "optional override" }
```
Response `200`: `{ "status": "approved", "postedAt": "ISO" }`.
Rules: returns `409` if the check is not in `nudged` or `completed` state; returns `422` if the reply contains a URL that is not in `sources`.

## 3. Socket.IO events (server to client)

| Event | Payload |
|---|---|
| `check:created` | `{ id, status, textPreview }` |
| `check:updated` | Full check document |
| `check:failed` | `{ id, reason }` |

## 4. AI service endpoints (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/analyze` | Gate, evidence, verdict, tactics, replies for text |
| POST | `/analyze-image` | OCR, reverse image search, then the same pipeline |
| POST | `/embed` | (stretch) Return embeddings for claim matching |

### `POST /analyze`
Request:
```json
{ "text": "string", "language_hint": "optional", "nudge_threshold": 0.7 }
```
Response:
```json
{
  "gate": { "is_claim": true, "claim_text": "...", "language": "hinglish", "reason": "..." },
  "verdict": "likely_false",
  "confidence": 0.82,
  "summary": "...",
  "tactics": [{ "code": "urgency", "explanation": "..." }],
  "sources": [{ "title": "...", "url": "...", "publisher": "...", "rating": "..." }],
  "uncertainty_note": null,
  "reply_variants": [{ "tone": "gentle", "text": "..." }],
  "should_nudge": true
}
```

### `POST /analyze-image`
Multipart: `image` (file) plus optional `caption`.
Response: same as `/analyze` plus `"image_findings": { "earliest_seen": { "url": "...", "date": "..." }, "what_it_showed": "..." }`.

## 5. Bot commands (Telegram, private chat with the Installer)

| Command / action | Behaviour |
|---|---|
| `/start` | Link the Installer to the group; show how it works |
| `/threshold 0.8` | Change the nudge threshold for the linked group |
| `/pause`, `/resume` | Stop or restart analysis for the group |
| Inline button **Send polite correction** | Calls `approve` with the chosen tone |
| Inline button **Edit** | Lets the Installer reply with edited text, then approve |
| Inline button **Dismiss** | Calls `dismiss` |
