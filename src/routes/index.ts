import { Router } from 'express';
import { healthRouter } from './health';
import { generateRouter } from './generate';
import { publishRouter } from './publish';
import { historyRouter } from './history';
import { photosRouter } from './photos';

/** Aggregates all application routers under a single root router. */
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(generateRouter);
apiRouter.use(publishRouter);
apiRouter.use(historyRouter);
apiRouter.use(photosRouter);
