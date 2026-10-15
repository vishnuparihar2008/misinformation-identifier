import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="SachCheck AI Service",
    description="Stateless fact-checking pipeline for claims, evidence, verdict, and polite family replies",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Liveness probe for the AI service."""
    return {
        "status": "ok",
        "service": "ai-service",
        "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
    }

