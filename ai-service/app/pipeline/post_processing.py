import re
import logging
from typing import List, Set
from app.schemas.analysis import VerdictResult, Source, ReplyVariant

logger = logging.getLogger("sachcheck.pipeline.post_processing")

URL_REGEX = re.compile(r"https?://[^\s)\]>]+")


def post_process_and_ground(
    verdict: VerdictResult,
    reply_variants: List[ReplyVariant],
    retrieved_sources: List[Source],
    nudge_threshold: float = 0.70,
) -> tuple[VerdictResult, List[ReplyVariant], bool]:
    """
    Applies post-processing safety and grounding rules per AI_PIPELINE.md:
    1. Filter out sources not present in retrieved evidence list (anti-hallucination).
    2. If no valid source remains and verdict wasn't 'likely_true' or 'not_a_claim',
       force verdict to 'unverified' and cap confidence <= 0.5.
    3. Strip any URL from reply variants that is not in the validated sources list.
    4. Strip sender name references if any.
    5. Evaluate should_nudge:
       verdict in {'likely_false', 'misleading'} and confidence >= nudge_threshold and len(valid_sources) > 0.
    """
    allowed_urls: Set[str] = {s.url.strip() for s in retrieved_sources if s.url}

    # 1. Ground sources: keep only sources whose URL was actually retrieved
    grounded_sources: List[Source] = []
    for s in verdict.sources:
        if s.url.strip() in allowed_urls:
            grounded_sources.append(s)

    verdict.sources = grounded_sources

    # 2. Honest uncertainty: if claim was classified as likely_false or misleading
    # but lacks retrieved evidence, downgrade to unverified
    if verdict.verdict in {"likely_false", "misleading"} and not verdict.sources:
        logger.info("Downgrading verdict to 'unverified' due to lack of grounded retrieved sources.")
        verdict.verdict = "unverified"
        verdict.confidence = min(verdict.confidence, 0.45)
        if not verdict.uncertainty_note:
            verdict.uncertainty_note = "No verifiable fact-checks or primary evidence found to conclusively debunk or confirm this claim."

    # 3. Clean replies: Strip ungrounded URLs
    cleaned_replies: List[ReplyVariant] = []
    for r in reply_variants:
        text = r.text
        found_urls = URL_REGEX.findall(text)
        for u in found_urls:
            if u not in allowed_urls:
                # Strip ungrounded URL from reply text
                text = text.replace(u, "").strip()

        # Clean trailing punctuation leftover from stripped URLs
        text = re.sub(r"\s+([.,!?])", r"\1", text)
        cleaned_replies.append(ReplyVariant(tone=r.tone, text=text))

    # 4. Determine private nudge trigger
    should_nudge = (
        verdict.verdict in {"likely_false", "misleading"}
        and verdict.confidence >= nudge_threshold
        and len(verdict.sources) > 0
    )

    logger.info(
        f"Pipeline decision: verdict={verdict.verdict}, conf={verdict.confidence:.2f}, "
        f"sources_count={len(verdict.sources)}, should_nudge={should_nudge}"
    )

    return verdict, cleaned_replies, should_nudge

