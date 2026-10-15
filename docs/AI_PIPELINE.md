# AI Pipeline: SachCheck

All outputs from the LLM must be **strict JSON** validated with Pydantic. Reject and retry once on schema failure.

## 1. Stages

1. **Language detect** (`langdetect`/`lingua`): `en`, `hi`, `hinglish` (Latin-script Hindi), other.
2. **Claim gate**: is this a checkable factual claim? If not, stop.
3. **Evidence retrieval**: Google Fact Check Tools `claims:search`, optional web search, optional embedding match to cached fact-checks.
4. **Verdict + tactics**: LLM reasons over the message plus retrieved evidence only.
5. **Reply generation**: 3 tone variants in the same language as the message.
6. **Image branch** (when an image is present): OCR the text, run reverse image search, summarise the earliest appearance and what the image really showed, then feed the extracted claim into stages 2-5.

## 2. Verdict labels and trigger rule

| Label | Meaning |
|---|---|
| `likely_false` | Evidence contradicts the claim |
| `misleading` | Partly true, missing context, or old content reused |
| `likely_true` | Evidence supports the claim |
| `unverified` | Not enough evidence either way |
| `not_a_claim` | Chit-chat, greeting, opinion |

**Nudge if** `verdict in {likely_false, misleading}` **and** `confidence >= NUDGE_THRESHOLD` (default 0.70) **and** at least one valid retrieved source exists.

## 3. Manipulation tactic taxonomy

| Code | Tactic | Typical sign |
|---|---|---|
| `fake_authority` | Invented or vague expert/official source | "Doctors at a top hospital say...", "NASA confirmed..." with no link |
| `fear_appeal` | Triggers panic | Threats of harm, disease, loss |
| `urgency` | Time pressure | "Share within 1 hour", "Last chance" |
| `chain_forward` | Asks to spread | "Forward to 10 people" |
| `miracle_claim` | Too-good-to-be-true cure or reward | Instant cure, free money/gadgets |
| `us_vs_them` | Outrage against a group | Blame, hate framing |
| `missing_source` | No verifiable origin | No date, link, or named author |
| `old_content_reused` | Real but outdated or misattributed media | Old photo with new caption |

Return only tactics that are actually present, each with a one-line plain-language explanation.

## 4. Output schemas

### 4.1 Claim gate
```json
{
  "is_claim": true,
  "claim_text": "the core claim in one sentence",
  "language": "en | hi | hinglish | other",
  "reason": "short"
}
```

### 4.2 Verdict
```json
{
  "verdict": "likely_false | misleading | likely_true | unverified",
  "confidence": 0.0,
  "summary": "2-3 sentence plain-language explanation",
  "tactics": [{"code": "fear_appeal", "explanation": "..."}],
  "sources": [{"title": "...", "url": "...", "publisher": "...", "rating": "..."}],
  "uncertainty_note": "what could not be verified, or null"
}
```

### 4.3 Reply variants
```json
{
  "language": "same as input",
  "variants": [
    {"tone": "gentle", "text": "..."},
    {"tone": "factual", "text": "..."},
    {"tone": "short", "text": "..."}
  ]
}
```

## 5. Prompt templates

### 5.1 Claim gate
```
You decide whether a chat message contains a checkable factual claim.
Ignore greetings, jokes, opinions, wishes, and religious/festival greetings.
Message: """{message}"""
Return JSON: {is_claim, claim_text, language, reason}.
```

### 5.2 Verdict (grounded)
```
You are a careful fact-checking assistant. Use ONLY the evidence provided.
Never invent sources or URLs. If evidence is missing or conflicting, return "unverified".
Message: """{message}"""
Claim: {claim_text}
Evidence (retrieved): {evidence_json}
Tactics taxonomy: {taxonomy}
Return JSON matching the Verdict schema. Confidence must reflect evidence strength,
not your general knowledge.
```

### 5.3 Reply generator
```
Write short WhatsApp-style replies correcting a relative's forwarded message.
Rules: warm, respectful, never shaming, never naming the sender; reply in {language};
one key fact plus one link from the provided sources; max 3 sentences (short tone: 1 sentence);
no jargon; no emojis overload (max 1).
Verdict: {verdict_json}
Return JSON matching the Reply schema.
```

## 6. Grounding and safety checks (post-processing)

1. Remove any `sources[].url` not present in the retrieved evidence list.
2. If no valid source remains, force `verdict = unverified` and `confidence <= 0.5`.
3. Reject reply text containing a URL not in the valid sources.
4. Strip personal names of the original sender from replies.
5. Log every decision (gate result, evidence count, final label) for the dashboard.

## 7. Image check details

1. Preprocess: resize to a max dimension, strip EXIF location before storing anything.
2. OCR: vision model (preferred) or `pytesseract` fallback.
3. Reverse image search: Vision Web Detection returns pages and similar images; pick the earliest dated page where available.
4. LLM summary: "This image appeared earlier on {site}, {date}, and showed {description}" using only retrieved results.
5. If nothing is found, say so; do not guess the origin.

## 8. Illustrative test messages (verify each with the fact-check API before the demo)

| # | Message type | Expected |
|---|---|---|
| 1 | "Good morning, have a blessed day" | `not_a_claim` |
| 2 | Chain message claiming a messaging app will start charging users unless forwarded | `likely_false`, tactics: `chain_forward`, `urgency` |
| 3 | "Govt giving free laptops, click this link and enter your details" | `likely_false` or `misleading`, tactics: `miracle_claim`, `urgency` |
| 4 | Old disaster photo captioned as a current event | `misleading`, tactic: `old_content_reused` |
| 5 | Obscure local rumour with no coverage | `unverified` |
| 6 | Hinglish version of message #2 | Same label, Hinglish reply |

Build a `tests/fixtures.json` from these and run it after every prompt change.
