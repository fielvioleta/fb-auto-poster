import { Router, type Request, type Response } from 'express';
import { getContainer } from '../container';
import { createLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const log = createLogger('route:generate');

export const generateRouter = Router();

/**
 * POST /generate
 * Generates and stores a new draft post (does not publish).
 */
generateRouter.post(
  '/generate',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const { content } = getContainer();
      const post = await content.generatePost();
      res.status(201).json({ success: true, post });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Generate failed: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }),
);
