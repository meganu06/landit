import { Router } from 'express';
import { applyToPlacement, getDashboardStats } from '../controllers/application.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /apply — submit an application (authenticated students only)
router.post('/apply', requireAuth, applyToPlacement);

// GET /dashboard/stats — fetch activity counts for the logged-in user
router.get('/dashboard/stats', requireAuth, getDashboardStats);

export default router;
