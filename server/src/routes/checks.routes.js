import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { Check } from '../models/Check.js';
import { processIncomingMessage, retryCheck } from '../services/orchestrator.service.js';
import { emitCheckUpdated } from '../services/socket.service.js';

const router = Router();

const createCheckSchema = z.object({
  text: z.string().min(1, 'Message text is required'),
  platform: z.enum(['telegram', 'whatsapp', 'web']).default('web'),
  groupId: z.string().optional().nullable(),
});

const listChecksSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  verdict: z.enum(['likely_false', 'misleading', 'likely_true', 'unverified', 'not_a_claim']).optional(),
  groupId: z.string().optional(),
});

const approveCheckSchema = z.object({
  tone: z.enum(['gentle', 'factual', 'short']),
  editedText: z.string().optional(),
});

// POST /api/checks - Submit a message manually (web paste/upload)
router.post('/checks', validateBody(createCheckSchema), async (req, res, next) => {
  try {
    const { text, platform, groupId } = req.body;
    const check = await processIncomingMessage({
      platform: platform || 'web',
      groupId: groupId || null,
      text,
    });

    return res.status(202).json({
      checkId: check._id.toString(),
      status: check.status,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/checks - List checks
router.get('/checks', validateQuery(listChecksSchema), async (req, res, next) => {
  try {
    const { limit, verdict, groupId } = req.query;
    const filter = {};
    if (verdict) filter.verdict = verdict;
    if (groupId) filter.groupId = groupId;

    const checks = await Check.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.json(checks);
  } catch (err) {
    next(err);
  }
});

// GET /api/checks/:id - Full check detail
router.get('/checks/:id', async (req, res, next) => {
  try {
    const check = await Check.findById(req.params.id);
    if (!check) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Check not found' },
      });
    }
    return res.json(check);
  } catch (err) {
    next(err);
  }
});

// POST /api/checks/:id/approve - Approve a reply variant; posts to the group
router.post('/checks/:id/approve', validateBody(approveCheckSchema), async (req, res, next) => {
  try {
    const { tone, editedText } = req.body;
    const check = await Check.findById(req.params.id);
    if (!check) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Check not found' },
      });
    }

    // Rule: returns 409 if check is not in nudged or completed state
    if (!['nudged', 'completed'].includes(check.status)) {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot approve a check in '${check.status}' state. Expected 'nudged' or 'completed'.`,
        },
      });
    }

    // Determine reply text to send
    let replyText = editedText;
    if (!replyText) {
      const variant = check.replyVariants?.find((v) => v.tone === tone);
      replyText = variant ? variant.text : '';
    }

    // Rule: returns 422 if reply contains a URL that is not in sources
    const allowedUrls = new Set((check.sources || []).map((s) => s.url.trim()));
    const urlMatches = replyText.match(/https?:\/\/[^\s)\]>]+/g) || [];
    for (const url of urlMatches) {
      if (!allowedUrls.has(url)) {
        return res.status(422).json({
          error: {
            code: 'UNGROUNDED_SOURCE',
            message: `Reply contains ungrounded URL '${url}' which is not in verified sources.`,
          },
        });
      }
    }

    const postedAt = new Date();
    check.status = 'approved';
    check.approvedReply = {
      tone,
      text: replyText,
      edited: Boolean(editedText),
      postedAt,
    };
    await check.save();

    // If check belongs to a Telegram group, post reply to group
    if (check.platform === 'telegram' && check.groupId) {
      try {
        const { Group } = await import('../models/Group.js');
        const { sendToGroup } = await import('../adapters/telegram.adapter.js');
        const group = await Group.findById(check.groupId);
        if (group?.externalId) {
          await sendToGroup(group.externalId, replyText, check.messageId);
        }
      } catch (postErr) {
        console.error('[Approve Route] Failed to post reply to Telegram group:', postErr.message);
      }
    }

    emitCheckUpdated(check);

    return res.json({
      status: 'approved',
      postedAt: postedAt.toISOString(),
      reply: check.approvedReply,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checks/:id/dismiss - Dismiss the nudge; nothing is posted
router.post('/checks/:id/dismiss', async (req, res, next) => {
  try {
    const check = await Check.findById(req.params.id);
    if (!check) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Check not found' },
      });
    }

    check.status = 'dismissed';
    await check.save();
    emitCheckUpdated(check);

    return res.json({
      status: 'dismissed',
      id: check._id.toString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checks/:id/retry - Re-run a failed check
router.post('/checks/:id/retry', async (req, res, next) => {
  try {
    const check = await retryCheck(req.params.id);
    return res.json({
      status: 'analyzing',
      id: check._id.toString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

