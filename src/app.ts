import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { apiRouter } from './routes';
import { createLogger } from './utils/logger';

const log = createLogger('app');

/** Builds and configures the Express application. */
export function createApp(): Application {
  const app = express();

  app.use(express.json());

  // Lightweight request logging.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    log.debug(`${req.method} ${req.path}`);
    next();
  });

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'restaurant-fb-autopost',
      endpoints: [
        'GET /health',
        'POST /generate',
        'POST /publish',
        'GET /history',
        'GET /analytics',
        'GET /photos',
        'POST /photos/sync',
      ],
    });
  });

  app.use(apiRouter);

  // 404 handler.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Centralized error handler — ensures the server never crashes on a route error.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Unhandled route error: ${message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}
