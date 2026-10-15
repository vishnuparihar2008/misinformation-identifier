# PRD: SachCheck (working name, rename freely)

> One-liner: **We don't just detect fake news, we help people correct it without fighting with family.**

## 1. Problem

Misinformation spreads fastest through forwarded messages in private family groups. Existing tools (fact-check sites, tiplines, browser extensions) share the same gaps:

- They are English-first and weak on Hinglish / code-mixed text.
- They give a verdict but do not change behaviour: nobody knows how to correct a relative politely.
- They handle text better than screenshots, old photos with false captions, or voice notes.
- They depend on a human fact-checker having already covered the claim.

## 2. Target users

| Persona | Description | Need |
|---|---|---|
| **The Installer** (primary) | A young adult in a family WhatsApp/Telegram group who keeps seeing dubious forwards | Quick verdict plus a polite reply to send, without starting a fight |
| **The Forwarder** (secondary) | An elder or relative who forwards messages in good faith | Gentle correction with a clear, simple explanation |
| **The Judge / Demo viewer** | Evaluates the hackathon demo | Understands the problem and sees it work live in under 60 seconds |

## 3. Goals and non-goals

**Goals**
1. Detect checkable claims in group messages and give a verdict with cited evidence.
2. Explain *why* the message feels believable (manipulation tactics).
3. Generate a short, respectful reply in the same language as the original message.
4. Keep a human in the loop: nothing is posted to the group without the Installer's approval.
5. Be honest about uncertainty ("can't verify yet") instead of forcing true/false.

**Non-goals (for the hackathon)**
- Fully autonomous public posting in the group.
- Training our own fake-news classifier from scratch.
- Supporting video deepfake detection.
- Production-grade scale, multi-tenant billing, or user accounts beyond a simple login.

## 4. Core user flow

1. Installer adds the bot to the family group (Telegram for the safe path; a spare number via whatsapp-web.js for the WhatsApp demo). The bot posts a one-time **disclosure message** that it is present and how it works.
2. A member posts a message (text, link, or image/screenshot).
3. The **claim gate** decides whether it is a checkable factual claim. Greetings, chit-chat and "good morning" images are ignored.
4. For a claim, the **verdict engine** gathers evidence and returns a verdict, confidence, sources and manipulation tactics.
5. If the verdict is `likely_false` or `misleading` with confidence >= 0.70, the bot sends a **private nudge** to the Installer with the verdict, reasons, sources and 2-3 draft replies.
6. The Installer taps **Send polite correction** (or edits it first). Only then is the reply posted to the group.
7. All checks appear on the web dashboard with a one-click copy of the reply.

## 5. Feature list

| ID | Feature | Priority | Acceptance criteria |
|---|---|---|---|
| F1 | Message ingestion (Telegram bot, WhatsApp adapter, web paste/upload fallback) | MVP | A message in a test group reaches the backend within 2 s; the web fallback works with no bot at all |
| F2 | Claim gate | MVP | Greetings/chit-chat return `not_a_claim`; a sample set of 20 messages is classified with no obvious misses |
| F3 | Verdict engine with evidence | MVP | Returns `verdict`, `confidence`, and at least one real source URL for any non-`unverified` verdict; no invented URLs |
| F4 | Manipulation tactic breakdown | MVP | Lists detected tactics (fake authority, fear, urgency, "forward to 10 people", miracle cure, etc.) each with a one-line explanation |
| F5 | Family reply generator | MVP | 2-3 tone variants (Gentle, Factual, Short); reply is in the same language as the original and includes a proof link |
| F6 | Private nudge + approve-and-send | MVP | Nothing posts to the group without an explicit approve action |
| F7 | Honest uncertainty state | MVP | Low-confidence or no-evidence cases return `unverified` with the sources consulted, never a hard fake label |
| F8 | Image / screenshot check (OCR + reverse image search) | MVP (demo hero) | Given an old photo with a false caption, shows the earliest known appearance and what it really depicted |
| F9 | Hinglish and regional language support | Stretch | Hinglish test messages are detected and answered in Hinglish |
| F10 | Claim matching against existing fact-checks (embeddings) | Stretch | A paraphrased viral claim matches an existing fact-check with a similarity score shown |
| F11 | Dashboard (React) | MVP | Lists recent checks with verdict badge, tactics, sources and a copy-reply button |

## 6. Detection and trigger rules

- **Claim gate first.** Only run the full pipeline on messages that contain a checkable factual claim.
- **Verdict labels:** `likely_false`, `misleading`, `likely_true`, `unverified`, `not_a_claim`.
- **Nudge threshold:** private nudge when verdict is `likely_false` or `misleading` and confidence >= 0.70. This threshold is a tunable config value, not a hard truth.
- **Below threshold:** show `unverified` in the dashboard only; do not nudge.
- **Evidence grounding:** a verdict may only cite URLs that were actually retrieved by a tool (fact-check API, web search, reverse image search). Never generate URLs from model memory.

## 7. Safety, privacy and ethics requirements

- Human in the loop for every group post.
- Disclosure message when the bot joins a group so every member knows it is present.
- Store only what is needed (message text, verdict, timestamps); provide a "delete my data" action; no long-term storage of images beyond the check.
- Replies must be polite and non-shaming; never name or mock the original sender.
- Be honest in the pitch: the WhatsApp group-member approach is unofficial and violates WhatsApp ToS; Telegram and the forward-to-bot tipline are the production-safe paths.

## 8. Success metrics

**Hackathon**
- Live demo runs end to end (message in, verdict, polite reply approved, posted) in under 60 seconds.
- At least 3 prepared examples: a text hoax, an out-of-context image, and an "unverified" case.

**Product (post-hackathon)**
- Share of nudges the Installer approves (proxy for reply quality).
- False-positive rate on a labelled sample (target: low enough that the Installer trusts nudges).
- Median time from message to nudge (target under 10 s).

## 9. MVP cut line

If time runs short, keep: F1 (Telegram + web paste), F2, F3, F4, F5, F6, F7, F11. Cut in this order: F10, F9, F8.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| WhatsApp number banned during demo | Use a spare number; keep a Telegram backup demo ready |
| LLM hallucinates evidence | Ground verdicts in retrieved sources only; reject outputs with unretrieved URLs |
| False accusations | Claim gate, threshold, `unverified` state, human approval |
| API quotas or latency | Cache results by message hash; pre-warm the demo examples |
| Privacy concerns | Disclosure message, minimal storage, delete action |

## 11. Open questions

- Which language set must the demo cover (English + Hinglish only, or also Hindi/other)?
- Which LLM provider will the team use (check free-tier limits before the demo)?
- Is the demo on WhatsApp, Telegram, or both?
