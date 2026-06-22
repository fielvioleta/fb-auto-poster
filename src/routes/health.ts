import { Router, type Request, type Response } from 'express';
import { getContainer } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

/**
 * GET /health
 * Lightweight liveness + optional Facebook connectivity check.
 */
healthRouter.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const { facebook } = getContainer();
    const facebookConnected = await facebook.verifyConnection();

    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      facebookConnected,
    });
  }),
);
