from typing import List
from app.schemas.analysis import Source
from app.providers.fact_check import FactCheckProvider


class EvidenceRetriever:
    """
    Retrieves evidence from Fact Check Tools API and search tools.
    """

    def __init__(self, provider: FactCheckProvider | None = None):
        self.provider = provider or FactCheckProvider()

    async def retrieve(self, claim_text: str, original_message: str) -> List[Source]:
        """
        Gathers evidence. Tries claim_text first, falls back to original_message if needed.
        Deduplicates by URL.
        """
        sources: List[Source] = []
        seen_urls = set()

        # Search by core claim text
        if claim_text:
            results = await self.provider.search_claims(claim_text)
            for s in results:
                if s.url not in seen_urls:
                    seen_urls.add(s.url)
                    sources.append(s)

        # If few or no results, try searching with relevant parts of original message
        if len(sources) < 2 and original_message and original_message != claim_text:
            extra = await self.provider.search_claims(original_message[:120])
            for s in extra:
                if s.url not in seen_urls:
                    seen_urls.add(s.url)
                    sources.append(s)

        return sources

