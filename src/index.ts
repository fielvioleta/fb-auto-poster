import type { Server } from 'http';
import { createApp } from './app';
import { getContainer } from './container';
import { startScheduler, stopScheduler } from './scheduler/scheduler';
import { createLogger } from './utils/logger';

const log = createLogger('main');

function bootstrap(): void {
  let container;
  try {
    container = getContainer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Startup failed (check your .env): ${message}`);
    process.exit(1);
    return;
  }

  const app = createApp();
  const server: Server = app.listen(container.config.port, () => {
    log.info(`HTTP server listening on port ${container.config.port}.`);
  });

  startScheduler();

  // Keep the process alive on unexpected errors instead of crashing.
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    log.error(`Unhandled promise rejection: ${message}`);
  });
  process.on('uncaughtException', (error) => {
    log.error(`Uncaught exception: ${error.message}`);
  });

  const shutdown = (signal: string): void => {
    log.info(`${signal} received, shutting down gracefully...`);
    stopScheduler();
    server.close(() => {
      log.info('HTTP server closed. Bye!');
      process.exit(0);
    });
    // Force-exit if close hangs.
    setTimeout(() => process.exit(0), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
