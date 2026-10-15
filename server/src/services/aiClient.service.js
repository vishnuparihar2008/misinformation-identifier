import axios from 'axios';
import { config } from '../config/env.js';

const aiHttp = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 15000, // 15-second timeout per ARCHITECTURE.md
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function analyzeTextWithAI({ text, languageHint, nudgeThreshold }) {
  try {
    const payload = {
      text,
      language_hint: languageHint || null,
      nudge_threshold: nudgeThreshold !== undefined ? nudgeThreshold : config.nudgeThreshold,
    };

    const response = await aiHttp.post('/analyze', payload);
    const data = response.data;

    // Convert snake_case from AI service to camelCase for Node
    return {
      gate: {
        isClaim: Boolean(data.gate?.is_claim),
        claimText: data.gate?.claim_text || '',
        language: data.gate?.language || 'en',
        reason: data.gate?.reason || '',
      },
      verdict: data.verdict || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : null,
      summary: data.summary || '',
      tactics: Array.isArray(data.tactics)
        ? data.tactics.map((t) => ({ code: t.code, explanation: t.explanation }))
        : [],
      sources: Array.isArray(data.sources)
        ? data.sources.map((s) => ({
            title: s.title,
            url: s.url,
            publisher: s.publisher || '',
            rating: s.rating || '',
          }))
        : [],
      uncertaintyNote: data.uncertainty_note || null,
      replyVariants: Array.isArray(data.reply_variants)
        ? data.reply_variants.map((r) => ({ tone: r.tone, text: r.text }))
        : [],
      shouldNudge: Boolean(data.should_nudge),
    };
  } catch (error) {
    const errorDetails = error.response?.data?.detail || error.message;
    console.error(`[AI Client] Error calling AI service: ${errorDetails}`);
    throw new Error(`AI service failure: ${errorDetails}`);
  }
}

