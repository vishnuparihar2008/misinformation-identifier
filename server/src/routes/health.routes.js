import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sachcheck-server',
    timestamp: new Date().toISOString(),
  });
});

export default router;

