import { Router, type Request, type Response } from 'express';
import { getContainer } from '../container';
import { createLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const log = createLogger('route:publish');

interface PublishBody {
  id?: string;
}

export const publishRouter = Router();

/**
 * POST /publish
 * Publishes a post to Facebook. If a body `{ id }` is provided, publishes that
 * stored draft; otherwise generates a fresh post and publishes it immediately.
 */
publishRouter.post(
  '/publish',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { content } = getContainer();
      const body = req.body as PublishBody;

      const post = body?.id
        ? await content.publishPost(body.id)
        : await content.generateAndPublish();

      const ok = post.status === 'published';
      res.status(ok ? 200 : 502).json({ success: ok, post });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Publish failed: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }),
);
