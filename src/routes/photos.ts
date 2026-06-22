import { Router, type Request, type Response } from 'express';
import { getContainer } from '../container';
import { createLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const log = createLogger('route:photos');

export const photosRouter = Router();

/**
 * GET /photos
 * Lists cached Page photos and their Vision tags.
 */
photosRouter.get(
  '/photos',
  asyncHandler(async (_req: Request, res: Response) => {
    const { photoLibrary } = getContainer();
    if (!photoLibrary) {
      res.status(503).json({ success: false, error: 'Page photo matching is disabled.' });
      return;
    }

    const photos = await photoLibrary.listCached();
    res.json({ success: true, count: photos.length, photos });
  }),
);

/**
 * POST /photos/sync
 * Forces a Facebook sync + Vision tagging of new photos.
 */
photosRouter.post(
  '/photos/sync',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const { photoLibrary } = getContainer();
      if (!photoLibrary) {
        res.status(503).json({ success: false, error: 'Page photo matching is disabled.' });
        return;
      }

      const synced = await photoLibrary.syncFromFacebook();
      const tagged = await photoLibrary.tagUntaggedPhotos();
      const photos = await photoLibrary.listCached();

      res.json({ success: true, synced, tagged, count: photos.length, photos });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Photo sync failed: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }),
);
