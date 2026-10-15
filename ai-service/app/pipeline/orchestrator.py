import logging
from app.schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    ClaimGateResult,
    VerdictResult,
)
from app.pipeline.claim_gate import ClaimGate
from app.pipeline.evidence import EvidenceRetriever
from app.pipeline.verdict import VerdictEngine
from app.pipeline.reply import ReplyGenerator
from app.pipeline.post_processing import post_process_and_ground
from app.providers.llm import LLMClient
from app.providers.fact_check import FactCheckProvider

logger = logging.getLogger("sachcheck.orchestrator")


class AnalysisOrchestrator:
    """
    Coordinates the multi-stage fact-checking pipeline:
    Language Detect -> Claim Gate -> Evidence Retrieval -> Verdict + Tactics -> Reply Variants -> Post-Processing.
    """

    def __init__(
        self,
        llm_client: LLMClient | None = None,
        fact_check_provider: FactCheckProvider | None = None,
    ):
        self.llm = llm_client or LLMClient()
        self.fact_check = fact_check_provider or FactCheckProvider()
        self.claim_gate = ClaimGate(self.llm)
        self.evidence_retriever = EvidenceRetriever(self.fact_check)
        self.verdict_engine = VerdictEngine(self.llm)
        self.reply_generator = ReplyGenerator(self.llm)

    async def analyze_text(self, request: AnalyzeRequest) -> AnalyzeResponse:
        logger.info(f"Analyzing message: {request.text[:60]}...")

        # Stage 1 & 2: Language detection and Claim Gate
        gate_res: ClaimGateResult = await self.claim_gate.evaluate(
            request.text, language_hint=request.language_hint
        )

        # Non-claim short circuit
        if not gate_res.is_claim:
            logger.info("Message evaluated as not a claim. Short-circuiting pipeline.")
            return AnalyzeResponse(
                gate=gate_res,
                verdict="not_a_claim",
                confidence=1.0,
                summary="This message is conversational or an opinion and does not contain a verifiable factual claim.",
                tactics=[],
                sources=[],
                uncertainty_note=None,
                reply_variants=[],
                should_nudge=False,
            )

        # Stage 3: Evidence Retrieval
        retrieved_sources = await self.evidence_retriever.retrieve(
            claim_text=gate_res.claim_text, original_message=request.text
        )

        # Stage 4: Verdict + Tactics
        raw_verdict: VerdictResult = await self.verdict_engine.analyze(
            message=request.text,
            claim_text=gate_res.claim_text,
            retrieved_sources=retrieved_sources,
        )

        # If verdict didn't keep sources or found extra, ensure retrieved_sources are merged if validated
        if not raw_verdict.sources and retrieved_sources:
            raw_verdict.sources = retrieved_sources

        # Stage 5: Reply Generation
        reply_variants = await self.reply_generator.generate_replies(
            message=request.text,
            verdict=raw_verdict,
            language=gate_res.language,
        )

        # Stage 6: Grounding & Safety Checks (Post-Processing)
        grounded_verdict, grounded_replies, should_nudge = post_process_and_ground(
            verdict=raw_verdict,
            reply_variants=reply_variants,
            retrieved_sources=retrieved_sources,
            nudge_threshold=request.nudge_threshold,
        )

        return AnalyzeResponse(
            gate=gate_res,
            verdict=grounded_verdict.verdict,
            confidence=grounded_verdict.confidence,
            summary=grounded_verdict.summary,
            tactics=grounded_verdict.tactics,
            sources=grounded_verdict.sources,
            uncertainty_note=grounded_verdict.uncertainty_note,
            reply_variants=grounded_replies,
            should_nudge=should_nudge,
        )

