import os
import re
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel
from app.schemas.analysis import Source

FACT_CHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

# Curated mock fact checks for standard viral hoaxes when API key is not present or offline
CURATED_MOCK_FACT_CHECKS: List[Dict[str, Any]] = [
    {
        "keywords": ["whatsapp", "charging", "chargeable", "paid", "forward to 10", "logo will turn blue", "blue logo"],
        "claim": "WhatsApp will become chargeable unless forwarded to 10 people to turn logo blue.",
        "sources": [
            {
                "title": "Fact Check: No, WhatsApp is not becoming paid or turning blue after 10 forwards",
                "url": "https://www.boomlive.in/fact-check/whatsapp-paid-forward-chain-message-hoax-factcheck",
                "publisher": "BOOM Live",
                "rating": "False",
            },
            {
                "title": "Viral hoax falsely claims WhatsApp will start charging users",
                "url": "https://www.vishvasnews.com/english/fact-check/viral-claim-whatsapp-paid-subscription-hoax/",
                "publisher": "Vishvas News",
                "rating": "False",
            }
        ],
    },
    {
        "keywords": ["free laptop", "free laptops", "govt giving free", "aadhaar", "free-gov-laptops"],
        "claim": "Government is giving free laptops to all students in 2026 via viral link.",
        "sources": [
            {
                "title": "Fact Check: PIB debunked fraudulent website offering free laptops under government scheme",
                "url": "https://factcheck.pib.gov.in/free-laptop-scheme-hoax",
                "publisher": "PIB Fact Check",
                "rating": "False",
            }
        ],
    },
    {
        "keywords": ["earthquake", "delhi", "50 buildings", "collapsed"],
        "claim": "Massive earthquake hit Delhi today causing 50 buildings to collapse.",
        "sources": [
            {
                "title": "Old footage falsely circulated as recent Delhi earthquake damage",
                "url": "https://www.altnews.in/delhi-earthquake-building-collapse-rumour-debunked/",
                "publisher": "Alt News",
                "rating": "Misleading",
            }
        ],
    },
]


class FactCheckProvider:
    """
    Client for Google Fact Check Tools API with fallback to Curated Mock.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FACT_CHECK_API_KEY", "")

    async def search_claims(self, query: str) -> List[Source]:
        """
        Search for fact checks matching the claim query.
        Returns a list of grounded Source objects.
        """
        if not query or not query.strip():
            return []

        # If live API key is available, attempt Google Fact Check API
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        FACT_CHECK_API_URL,
                        params={"query": query, "key": self.api_key, "languageCode": "en"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        claims = data.get("claims", [])
                        sources: List[Source] = []
                        for item in claims:
                            for review in item.get("claimReview", []):
                                url = review.get("url")
                                title = review.get("title") or item.get("text") or "Fact Check Report"
                                publisher = review.get("publisher", {}).get("name", "Fact Checker")
                                rating = review.get("textualRating", "Unverified")
                                if url:
                                    sources.append(
                                        Source(
                                            title=title,
                                            url=url,
                                            publisher=publisher,
                                            rating=rating,
                                        )
                                    )
                        if sources:
                            return sources
            except Exception:
                # Fall back to mock on network error or quota failure
                pass

        # Fallback to curated mock database
        return self._search_curated_mock(query)

    def _search_curated_mock(self, query: str) -> List[Source]:
        query_lower = query.lower()
        for item in CURATED_MOCK_FACT_CHECKS:
            for kw in item["keywords"]:
                if kw in query_lower:
                    return [
                        Source(
                            title=s["title"],
                            url=s["url"],
                            publisher=s["publisher"],
                            rating=s["rating"],
                        )
                        for s in item["sources"]
                    ]
        return []

