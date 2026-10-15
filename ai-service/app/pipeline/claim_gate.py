from app.schemas.analysis import ClaimGateResult
from app.providers.llm import LLMClient
from app.pipeline.language import detect_language


CLAIM_GATE_PROMPT = """You decide whether a chat message contains a checkable factual claim.
Ignore greetings, jokes, opinions, personal feelings, wishes, and religious/festival greetings.
A factual claim is an assertion about events, government schemes, corporate policies, health cures, or historical facts that can be verified as true or false.

Message: \"\"\"{message}\"\"\"

Return a valid JSON object matching this schema:
{{
  "is_claim": true or false,
  "claim_text": "the core factual claim in one clear sentence, or empty string if not a claim",
  "language": "en | hi | hinglish | other",
  "reason": "short explanation of why this is or is not a factual claim"
}}
"""


class ClaimGate:
    def __init__(self, llm_client: LLMClient | None = None):
        self.llm = llm_client or LLMClient()

    async def evaluate(self, message: str, language_hint: str | None = None) -> ClaimGateResult:
        # Pre-detect language
        detected_lang = detect_language(message, language_hint=language_hint)

        prompt = CLAIM_GATE_PROMPT.format(message=message.strip())
        result = await self.llm.generate_json(prompt, ClaimGateResult)

        # Ensure language matches detected if hint or detector was confident
        if not result.language or result.language == "other":
            result.language = detected_lang

        return result

