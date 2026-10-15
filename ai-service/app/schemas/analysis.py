from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ClaimGateResult(BaseModel):
    is_claim: bool = Field(description="Whether the message contains a checkable factual claim")
    claim_text: str = Field(default="", description="The core factual claim summarized in one sentence")
    language: Literal["en", "hi", "hinglish", "other"] = Field(default="en", description="Detected language")
    reason: str = Field(default="", description="Short reason for the claim gate decision")


class Tactic(BaseModel):
    code: Literal[
        "fake_authority",
        "fear_appeal",
        "urgency",
        "chain_forward",
        "miracle_claim",
        "us_vs_them",
        "missing_source",
        "old_content_reused",
    ] = Field(description="Taxonomy code of manipulation tactic")
    explanation: str = Field(description="One-line plain-language explanation of how the tactic appears")


class Source(BaseModel):
    title: str = Field(description="Title of the fact check or source article")
    url: str = Field(description="Verified URL of the source")
    publisher: str = Field(default="", description="Publisher or fact-checking organization")
    rating: str = Field(default="", description="Original rating from fact checker e.g. False, Misleading")


class ReplyVariant(BaseModel):
    tone: Literal["gentle", "factual", "short"] = Field(description="Tone style for the family reply")
    text: str = Field(description="The proposed message text to send to the group")


class VerdictResult(BaseModel):
    verdict: Literal["likely_false", "misleading", "likely_true", "unverified", "not_a_claim"] = Field(
        description="Verdict classification"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    summary: str = Field(description="2-3 sentence plain-language explanation")
    tactics: List[Tactic] = Field(default_factory=list, description="Detected manipulation tactics")
    sources: List[Source] = Field(default_factory=list, description="Retrieved and grounded sources")
    uncertainty_note: Optional[str] = Field(default=None, description="Note on what could not be verified")


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, description="Message text to analyze")
    language_hint: Optional[str] = Field(default=None, description="Optional caller hint for language")
    nudge_threshold: float = Field(default=0.70, ge=0.0, le=1.0, description="Threshold above which to nudge installer")


class AnalyzeResponse(BaseModel):
    gate: ClaimGateResult
    verdict: Literal["likely_false", "misleading", "likely_true", "unverified", "not_a_claim"]
    confidence: float
    summary: str
    tactics: List[Tactic]
    sources: List[Source]
    uncertainty_note: Optional[str] = None
    reply_variants: List[ReplyVariant] = Field(default_factory=list)
    should_nudge: bool = Field(default=False, description="Whether installer should receive a private nudge")

