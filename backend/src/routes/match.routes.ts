import { Router } from 'express';
import { runMatching, getMatchResults, getGapAnalysis } from '../controllers/match.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/run', requireAuth, runMatching);
router.get('/results', requireAuth, getMatchResults);
router.get('/gap-analysis/:placementId', requireAuth, getGapAnalysis);

export default router;
