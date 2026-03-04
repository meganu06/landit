import { Router } from 'express';
import { gapHandler } from '../controllers/gap.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/gap
// body: { jobId: string, cvUrl: string }
router.post('/', requireAuth, gapHandler);

export default router;