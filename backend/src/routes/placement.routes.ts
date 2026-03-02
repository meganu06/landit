import { Router } from 'express';
import {
  getPlacements,
  getPlacementById,
  createPlacement,
  updatePlacement,
  deletePlacement,
} from '../controllers/placement.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getPlacements);
router.get('/:id', requireAuth, getPlacementById);
router.post('/', requireAuth, requireAdmin, createPlacement);
router.put('/:id', requireAuth, requireAdmin, updatePlacement);
router.delete('/:id', requireAuth, requireAdmin, deletePlacement);

export default router;
