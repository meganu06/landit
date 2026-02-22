import { Router } from 'express';
import { addBookmark, removeBookmark, getBookmarks } from '../controllers/bookmark.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getBookmarks);
router.post('/:placementId', requireAuth, addBookmark);
router.delete('/:placementId', requireAuth, removeBookmark);

export default router;
