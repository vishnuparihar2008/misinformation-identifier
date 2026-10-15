import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { Group } from '../models/Group.js';
import { Check } from '../models/Check.js';

const router = Router();

const updateGroupSchema = z.object({
  name: z.string().optional(),
  nudgeThreshold: z.number().min(0.0).max(1.0).optional(),
});

// GET /api/groups - List connected groups
router.get('/groups', async (req, res, next) => {
  try {
    const groups = await Group.find().sort({ updatedAt: -1 }).lean();
    return res.json(groups);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:id - Update threshold or name
router.patch('/groups/:id', validateBody(updateGroupSchema), async (req, res, next) => {
  try {
    const { name, nudgeThreshold } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Group not found' },
      });
    }

    if (name !== undefined) group.name = name;
    if (nudgeThreshold !== undefined) group.nudgeThreshold = nudgeThreshold;

    await group.save();
    return res.json(group);
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/disclose - Send/record disclosure message to the group
router.post('/api/groups/:id/disclose', async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Group not found' },
      });
    }

    group.disclosureSentAt = new Date();
    await group.save();

    return res.json({
      status: 'disclosed',
      disclosureSentAt: group.disclosureSentAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id/data - Delete all stored data for a group per privacy mandate
router.delete('/groups/:id/data', async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Group not found' },
      });
    }

    // Delete all checks associated with this group
    const deletedChecks = await Check.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(group._id);

    return res.json({
      status: 'deleted',
      deletedChecksCount: deletedChecks.deletedCount,
      groupId: group._id.toString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

