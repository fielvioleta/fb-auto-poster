import { Router, type Request, type Response } from 'express';
import { getContainer } from '../container';
import { createLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const log = createLogger('route:history');

export const historyRouter = Router();

/**
 * GET /history?limit=50
 * Returns recently generated posts (newest first).
 */
historyRouter.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { store } = getContainer();
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 50;
      const posts = await store.recent(limit);
      res.json({ success: true, count: posts.length, posts });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`History failed: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }),
);

/**
 * GET /analytics — bonus endpoint exposing monthly analytics.
 */
historyRouter.get(
  '/analytics',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const { analytics } = getContainer();
      const data = await analytics.monthly();
      res.json({ success: true, analytics: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Analytics failed: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }),
);
