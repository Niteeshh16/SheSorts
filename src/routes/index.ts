import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import { checkDbConnection } from '../config/db';

const router = Router();

// Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  const isDbHealthy = await checkDbConnection();
  
  res.status(isDbHealthy ? 200 : 503).json({
    status: isDbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: isDbHealthy ? 'connected' : 'disconnected',
  });
});

// Authentication routes
router.use('/auth', authRoutes);

export default router;
