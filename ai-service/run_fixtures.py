#!/usr/bin/env python3
"""
SachCheck AI Service - Fixture Verification Script
Runs all 6 sample messages from AI_PIPELINE.md and outputs detailed results.
"""

import sys
import json
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.schemas.analysis import AnalyzeRequest
from app.pipeline.orchestrator import AnalysisOrchestrator


async def run_all():
    fixtures_path = Path(__file__).parent / "app" / "tests" / "fixtures.json"
    with open(fixtures_path, "r", encoding="utf-8") as f:
        fixtures = json.load(f)

    orchestrator = AnalysisOrchestrator()
    print("=" * 80)
    print("SACHCHECK AI PIPELINE - FIXTURE VERIFICATION RUN")
    print("=" * 80)

    passed_count = 0

    for item in fixtures:
        msg_id = item["id"]
        desc = item["description"]
        text = item["text"]
        expected_verdict = item["expected_verdict"]

        print(f"\n[Test #{msg_id}] {desc}")
        print(f"Message: \"{text}\"")

        req = AnalyzeRequest(text=text, nudge_threshold=0.70)
        res = await orchestrator.analyze_text(req)

        print(f" -> Gate: is_claim={res.gate.is_claim}, language={res.gate.language}")
        print(f" -> Verdict: {res.verdict} (Confidence: {res.confidence:.2f}) [Expected: {expected_verdict}]")
        print(f" -> Should Nudge: {res.should_nudge}")

        if res.tactics:
            tactics_str = ", ".join(f"{t.code} ({t.explanation})" for t in res.tactics)
            print(f" -> Tactics: {tactics_str}")

        if res.sources:
            print(f" -> Grounded Sources ({len(res.sources)}):")
            for s in res.sources:
                print(f"    * {s.title} [{s.publisher}] -> {s.url}")

        if res.reply_variants:
            print(f" -> Reply Variants ({len(res.reply_variants)}):")
            for r in res.reply_variants:
                print(f"    [{r.tone.upper()}]: {r.text}")

        # Verification
        assert_ok = (res.verdict == expected_verdict)
        if assert_ok:
            passed_count += 1
            print(" -> STATUS: PASS ✅")
        else:
            print(" -> STATUS: FAIL ❌")

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed_count}/{len(fixtures)} tests passed successfully.")
    print("=" * 80)

    if passed_count != len(fixtures):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all())

