import { Router } from 'express';
import multer from 'multer';
import { uploadCV, getMyCV, extractSkills, deleteCV } from '../controllers/cv.controller';
import { requireAuth } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();

router.post('/upload', requireAuth, upload.single('cv'), uploadCV);
router.post('/extract-skills', requireAuth, extractSkills);
router.get('/me', requireAuth, getMyCV);
router.delete('/:id', requireAuth, deleteCV);

export default router;
