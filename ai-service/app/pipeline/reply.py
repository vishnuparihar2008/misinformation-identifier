import json
from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.analysis import ReplyVariant, VerdictResult
from app.providers.llm import LLMClient


class ReplyVariantsOutput(BaseModel):
    language: str
    variants: List[ReplyVariant] = Field(description="Gentle, factual, and short reply variants")


REPLY_PROMPT = """Write short WhatsApp-style replies correcting a relative's forwarded message.
Rules:
1. Warm, respectful, never shaming, never naming the original sender.
2. Reply strictly in {language}. (If hinglish, write in natural conversational Latin-script Hindi).
3. If valid sources are available, cite at most one source URL from the provided list. Do NOT invent any URL.
4. Max 3 sentences (short tone: 1 concise sentence).
5. No jargon; max 1 tasteful emoji.

Message: \"\"\"{message}\"\"\"
Verdict Details:
{verdict_json}

Available Sources:
{sources_json}

Return a valid JSON object matching this schema:
{{
  "language": "{language}",
  "variants": [
    {{"tone": "gentle", "text": "polite, empathetic explanation with source link if available"}},
    {{"tone": "factual", "text": "direct, objective fact correction with source link if available"}},
    {{"tone": "short", "text": "one-sentence concise heads-up with source link if available"}}
  ]
}}
"""


class ReplyGenerator:
    def __init__(self, llm_client: LLMClient | None = None):
        self.llm = llm_client or LLMClient()

    async def generate_replies(
        self,
        message: str,
        verdict: VerdictResult,
        language: Literal["en", "hi", "hinglish", "other"] = "en",
    ) -> List[ReplyVariant]:
        """
        Generates 3 tone variants (gentle, factual, short) adhering to safety rules.
        """
        sources_list = [s.model_dump() for s in verdict.sources]
        sources_json = json.dumps(sources_list, indent=2) if sources_list else "None"
        verdict_json = json.dumps(verdict.model_dump(exclude={"sources"}), indent=2)

        prompt = REPLY_PROMPT.format(
            language=language,
            message=message.strip(),
            verdict_json=verdict_json,
            sources_json=sources_json,
        )

        try:
            output = await self.llm.generate_json(prompt, ReplyVariantsOutput)
            if output.variants and len(output.variants) >= 3:
                return output.variants
        except Exception:
            pass

        # Fallback template generator ensuring non-shaming, grounded output
        return self._fallback_variants(verdict, language)

    def _fallback_variants(
        self,
        verdict: VerdictResult,
        language: str,
    ) -> List[ReplyVariant]:
        primary_link = verdict.sources[0].url if verdict.sources else ""
        link_str = f" Read more: {primary_link}" if primary_link else ""

        if language == "hinglish":
            if verdict.verdict in {"likely_false", "misleading"}:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text=f"Aapki jaankari ke liye, yeh message sahi nahi lag raha hai. Fact-checkers ne isko fake bataya hai.{link_str} 🙏",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text=f"Yeh dawa galat paya gaya hai. Official reporting ke mutabik isme koi sachai nahi hai.{link_str}",
                    ),
                    ReplyVariant(
                        tone="short",
                        text=f"Yeh viral message galat hai, kripya aage share na karein.{link_str}",
                    ),
                ]
            else:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text="Maine yeh check kiya par koi official khabar nahi mili iske baare mein. Behtar hoga hum verify hone tak forward na karein 🙏",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text="Is khabar ki abhi tak koi official pushti nahi mili hai.",
                    ),
                    ReplyVariant(
                        tone="short",
                        text="Yeh unverified lag raha hai, aage forward mat kijiye.",
                    ),
                ]
        elif language == "hi":
            if verdict.verdict in {"likely_false", "misleading"}:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text=f"सादर, यह संदेश सही प्रतीत नहीं होता। फैक्ट-चेक में यह दावा गलत पाया गया है।{link_str} 🙏",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text=f"यह जानकारी भ्रामक है। आधिकारिक स्रोतों के अनुसार ऐसा कोई निर्णय नहीं हुआ है।{link_str}",
                    ),
                    ReplyVariant(
                        tone="short",
                        text=f"यह संदेश गलत है, कृपया आगे साझा न करें।{link_str}",
                    ),
                ]
            else:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text="इस संदेश की पुष्टि किसी आधिकारिक स्रोत से नहीं हो सकी है। कृपया अग्रसारित न करें।",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text="इस दावे की पुष्टि के लिए कोई आधिकारिक साक्ष्य मौजूद नहीं है।",
                    ),
                    ReplyVariant(
                        tone="short",
                        text="यह अपुष्ट जानकारी है, आगे न भेजें।",
                    ),
                ]
        else:  # en / other
            if verdict.verdict in {"likely_false", "misleading"}:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text=f"Just wanted to share a quick heads-up that this message appears to be inaccurate.{link_str} Thought I'd pass it along! 🙏",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text=f"This claim has been checked by independent fact-checkers and found to be false.{link_str}",
                    ),
                    ReplyVariant(
                        tone="short",
                        text=f"This is a known hoax, please don't forward it.{link_str}",
                    ),
                ]
            else:
                return [
                    ReplyVariant(
                        tone="gentle",
                        text="I tried verifying this claim, but couldn't find any official announcements or reputable reporting on it. Might be wise to hold off forwarding it 🙏",
                    ),
                    ReplyVariant(
                        tone="factual",
                        text="There is currently no official evidence or credible reporting to corroborate this claim.",
                    ),
                    ReplyVariant(
                        tone="short",
                        text="This claim is currently unverified from official sources.",
                    ),
                ]

