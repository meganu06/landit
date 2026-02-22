import { Router } from 'express';
import { runMatching, getMatchResults } from '../controllers/match.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/run', requireAuth, runMatching);
router.get('/results', requireAuth, getMatchResults);

export default router;
