import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import placementRoutes from './routes/placement.routes';
import cvRoutes from './routes/cv.routes';
import matchRoutes from './routes/match.routes';
import bookmarkRoutes from './routes/bookmark.routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

export default app;
