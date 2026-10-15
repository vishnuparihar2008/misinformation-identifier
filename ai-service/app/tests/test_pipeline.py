import json
import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.analysis import AnalyzeRequest
from app.pipeline.orchestrator import AnalysisOrchestrator

FIXTURES_PATH = Path(__file__).parent / "fixtures.json"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def fixtures():
    with open(FIXTURES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_fixtures_end_to_end(client, fixtures):
    """
    Test each illustrative message from AI_PIPELINE.md through POST /analyze.
    """
    for item in fixtures:
        msg_id = item["id"]
        text = item["text"]
        expected_verdict = item["expected_verdict"]
        expected_is_claim = item["expected_is_claim"]

        response = client.post("/analyze", json={"text": text, "nudge_threshold": 0.70})
        assert response.status_code == 200, f"Fixture #{msg_id} failed with status {response.status_code}: {response.text}"
        data = response.json()

        # 1. Gate check
        assert data["gate"]["is_claim"] == expected_is_claim, (
            f"Fixture #{msg_id} is_claim mismatch: got {data['gate']['is_claim']}, expected {expected_is_claim}"
        )

        # 2. Verdict check
        assert data["verdict"] == expected_verdict, (
            f"Fixture #{msg_id} verdict mismatch: got {data['verdict']}, expected {expected_verdict}"
        )

        # 3. Grounding checks per ANTIGRAVITY_RULES.md
        # If not_a_claim or unverified, should never nudge
        if data["verdict"] in {"not_a_claim", "unverified"}:
            assert data["should_nudge"] is False, (
                f"Fixture #{msg_id} with verdict {data['verdict']} must never trigger a nudge"
            )

        # 4. Check tactics if specified
        if "expected_tactics" in item:
            detected_codes = [t["code"] for t in data["tactics"]]
            for expected_tactic in item["expected_tactics"]:
                assert any(expected_tactic in code for code in detected_codes), (
                    f"Fixture #{msg_id} missing expected tactic {expected_tactic} in {detected_codes}"
                )

        # 5. Language check if specified
        if "expected_language" in item:
            assert data["gate"]["language"] == item["expected_language"], (
                f"Fixture #{msg_id} language mismatch: got {data['gate']['language']}, expected {item['expected_language']}"
            )

        # 6. Safety check: replies must exist for claims and have 3 tone variants
        if data["gate"]["is_claim"]:
            assert len(data["reply_variants"]) >= 3
            tones = {r["tone"] for r in data["reply_variants"]}
            assert {"gentle", "factual", "short"}.issubset(tones)

