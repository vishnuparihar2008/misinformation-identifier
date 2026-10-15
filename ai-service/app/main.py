import os
import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.schemas.analysis import AnalyzeRequest, AnalyzeResponse
from app.pipeline.orchestrator import AnalysisOrchestrator

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sachcheck.main")

app = FastAPI(
    title="SachCheck AI Service",
    description="Stateless fact-checking pipeline for claims, evidence, verdict, tactics, and polite family replies",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = AnalysisOrchestrator()


@app.get("/health")
def health_check():
    """Liveness probe for the AI service."""
    return {
        "status": "ok",
        "service": "ai-service",
        "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
    }


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze a text message through the full SachCheck pipeline",
)
async def analyze_message(request: AnalyzeRequest):
    """
    Stateless analysis endpoint:
    1. Language detection (en, hi, hinglish, other)
    2. Claim gate (filters chit-chat and greetings)
    3. Evidence retrieval (Fact Check Tools API)
    4. Verdict + Manipulation tactics breakdown
    5. Family reply generator (3 tones, same language)
    6. Grounding and safety post-processing
    """
    try:
        response = await orchestrator.analyze_text(request)
        return response
    except Exception as e:
        logger.error(f"Error during message analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error: {str(e)}",
        )
