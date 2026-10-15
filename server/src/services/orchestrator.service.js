import crypto from 'crypto';
import { Check } from '../models/Check.js';
import { Group } from '../models/Group.js';
import { Cache } from '../models/Cache.js';
import { analyzeTextWithAI } from './aiClient.service.js';
import {
  emitCheckCreated,
  emitCheckUpdated,
  emitCheckFailed,
} from './socket.service.js';

/**
 * Normalizes text and generates a SHA-256 hash for deduplication and caching.
 */
export function hashText(text) {
  if (!text) return '';
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Anonymizes sender identity via SHA-256 hash per privacy requirements.
 */
export function hashSender(senderId) {
  if (!senderId) return 'anon_' + crypto.randomBytes(4).toString('hex');
  return crypto.createHash('sha256').update(String(senderId)).digest('hex').substring(0, 16);
}

/**
 * Coordinates end-to-end check lifecycle:
 * Dedupe -> Cache -> Analyzing -> AI Call -> Grounding/Nudge Decision -> Persistence -> Socket Broadcast.
 */
export async function processIncomingMessage({
  platform = 'web',
  groupId = null,
  messageId = null,
  senderRef = null,
  text = '',
  hasImage = false,
  languageHint = null,
}) {
  const generatedMsgId = messageId || `web_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const hashedSender = hashSender(senderRef);
  const textHash = hashText(text);

  // 1. Check idempotency for existing (platform, groupId, messageId)
  if (groupId && messageId) {
    const existing = await Check.findOne({ platform, groupId, messageId });
    if (existing) {
      return existing;
    }
  }

  // 2. Fetch Group if available to read customized nudgeThreshold
  let threshold = 0.70;
  if (groupId) {
    const group = await Group.findById(groupId);
    if (group?.nudgeThreshold) {
      threshold = group.nudgeThreshold;
    }
  }

  // 3. Create initial Check document in DB
  const check = new Check({
    platform,
    groupId,
    messageId: generatedMsgId,
    senderRef: hashedSender,
    textHash,
    text,
    hasImage,
    status: 'analyzing',
  });
  await check.save();

  emitCheckCreated(check);

  // 4. Run analysis (asynchronous background flow)
  runAnalysisPipeline(check, text, languageHint, threshold).catch((err) => {
    console.error(`[Orchestrator] Error processing check ${check._id}:`, err);
  });

  return check;
}

/**
 * Background worker executing cache lookup, AI call, and status transitions.
 */
async function runAnalysisPipeline(check, text, languageHint, threshold) {
  try {
    let aiResult = null;

    // A. Check cache by textHash
    if (check.textHash) {
      const cached = await Cache.findOne({ textHash: check.textHash });
      if (cached?.result) {
        aiResult = cached.result;
      }
    }

    // B. Call AI service if not cached
    if (!aiResult) {
      aiResult = await analyzeTextWithAI({
        text,
        languageHint,
        nudgeThreshold: threshold,
      });

      // Cache result for 7 days
      if (check.textHash) {
        await Cache.findOneAndUpdate(
          { textHash: check.textHash },
          { textHash: check.textHash, result: aiResult },
          { upsert: true, new: true }
        ).catch((err) => console.warn('[Cache] Could not persist cache:', err.message));
      }
    }

    // C. Map status based on claim gate and nudge rule
    let nextStatus = 'completed';
    if (!aiResult.gate.isClaim) {
      nextStatus = 'ignored';
    } else if (aiResult.shouldNudge) {
      nextStatus = 'nudged';
    }

    // D. Update Check document
    check.status = nextStatus;
    check.gate = aiResult.gate;
    check.verdict = aiResult.verdict;
    check.confidence = aiResult.confidence;
    check.summary = aiResult.summary;
    check.tactics = aiResult.tactics;
    check.sources = aiResult.sources;
    check.uncertaintyNote = aiResult.uncertaintyNote;
    check.replyVariants = aiResult.replyVariants;
    check.language = aiResult.gate?.language || 'en';
    check.failureReason = null;

    await check.save();
    emitCheckUpdated(check);

    // E. Dispatch private nudge to Telegram installer if applicable
    if (check.status === 'nudged' && check.groupId && check.platform === 'telegram') {
      try {
        const group = await Group.findById(check.groupId);
        if (group?.installerChatId) {
          const { sendPrivateNudge } = await import('../adapters/telegram.adapter.js');
          await sendPrivateNudge(check, group);
        }
      } catch (nudgeErr) {
        console.error('[Orchestrator] Failed to dispatch private nudge:', nudgeErr.message);
      }
    }
  } catch (error) {
    // Failure handling per ARCHITECTURE.md: mark failed, emit socket, never nudge
    check.status = 'failed';
    check.failureReason = error.message || 'AI service failure';
    await check.save();
    emitCheckFailed(check._id, check.failureReason);
    emitCheckUpdated(check);
  }
}

/**
 * Re-runs analysis on a failed check.
 */
export async function retryCheck(checkId) {
  const check = await Check.findById(checkId);
  if (!check) {
    throw new Error('Check not found');
  }

  check.status = 'analyzing';
  check.failureReason = null;
  await check.save();
  emitCheckUpdated(check);

  runAnalysisPipeline(check, check.text, check.language, 0.70).catch((err) => {
    console.error(`[Orchestrator] Error retrying check ${check._id}:`, err);
  });

  return check;
}

