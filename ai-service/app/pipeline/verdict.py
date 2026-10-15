import json
from typing import List
from app.schemas.analysis import VerdictResult, Source
from app.providers.llm import LLMClient

TAXONOMY_DESCRIPTION = """
- fake_authority: Invented or vague expert/official source ("Doctors at a top hospital say...", "NASA confirmed..." without a valid link)
- fear_appeal: Triggers panic (threats of harm, loss, account blocking)
- urgency: Time pressure ("Share within 1 hour", "Last chance", "Starting tomorrow")
- chain_forward: Asks to spread ("Forward to 10 people", "Share with all groups")
- miracle_claim: Too-good-to-be-true cure, gift, or reward (free money, free laptops, miracle cures)
- us_vs_them: Outrage against a specific group or community
- missing_source: No verifiable origin (no date, link, or verifiable organization)
- old_content_reused: Real but outdated or misattributed media/incident
"""

VERDICT_PROMPT = """You are a careful fact-checking assistant. Use ONLY the evidence provided.
Never invent sources or URLs. If evidence is missing, conflicting, or inconclusive, return "unverified" with confidence <= 0.5.

Message: \"\"\"{message}\"\"\"
Claim: {claim_text}
Evidence (retrieved):
{evidence_json}

Tactics taxonomy:
{taxonomy}

Return a valid JSON object matching this schema:
{{
  "verdict": "likely_false" | "misleading" | "likely_true" | "unverified",
  "confidence": float between 0.0 and 1.0,
  "summary": "2-3 sentence plain-language explanation of why this verdict was reached",
  "tactics": [
    {{"code": "tactic_code", "explanation": "one-line plain explanation"}}
  ],
  "sources": [
    {{"title": "title", "url": "url", "publisher": "publisher", "rating": "rating"}}
  ],
  "uncertainty_note": "what could not be verified, or null if conclusive"
}}
"""


class VerdictEngine:
    def __init__(self, llm_client: LLMClient | None = None):
        self.llm = llm_client or LLMClient()

    async def analyze(
        self,
        message: str,
        claim_text: str,
        retrieved_sources: List[Source],
    ) -> VerdictResult:
        # Prepare evidence JSON
        evidence_dicts = [s.model_dump() for s in retrieved_sources]
        evidence_json = json.dumps(evidence_dicts, indent=2) if evidence_dicts else "[] (No verified fact checks found)"

        prompt = VERDICT_PROMPT.format(
            message=message.strip(),
            claim_text=claim_text,
            evidence_json=evidence_json,
            taxonomy=TAXONOMY_DESCRIPTION.strip(),
        )

        verdict_res = await self.llm.generate_json(prompt, VerdictResult)
        return verdict_res

