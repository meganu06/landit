import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import cvRoutes from './routes/cv.routes';
import placementRoutes from './routes/placement.routes';
import matchRoutes from './routes/match.routes';
import bookmarkRoutes from './routes/bookmark.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'LandIt backend is running 🚀' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default app;
