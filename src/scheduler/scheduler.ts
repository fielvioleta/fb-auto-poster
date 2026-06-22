import cron, { type ScheduledTask } from 'node-cron';
import { getContainer } from '../container';
import { createLogger } from '../utils/logger';

const log = createLogger('scheduler');

let task: ScheduledTask | null = null;

/**
 * Starts the daily cron job. Defaults to 11:00 AM Asia/Manila. The job never
 * throws — failures are caught and logged so the process stays alive.
 */
export function startScheduler(): void {
  const { config, content } = getContainer();

  if (!config.scheduler.enabled) {
    log.info('Scheduler is disabled (SCHEDULER_ENABLED=false).');
    return;
  }

  const { cronSchedule, autoPublish } = config.scheduler;

  if (!cron.validate(cronSchedule)) {
    log.error(`Invalid CRON_SCHEDULE "${cronSchedule}"; scheduler not started.`);
    return;
  }

  task = cron.schedule(
    cronSchedule,
    () => {
      void runDailyJob();
    },
    { timezone: config.timezone },
  );

  log.info(
    `Scheduler started: "${cronSchedule}" (${config.timezone}), autoPublish=${autoPublish}.`,
  );

  async function runDailyJob(): Promise<void> {
    log.info('Daily job triggered.');
    try {
      if (autoPublish) {
        const post = await content.generateAndPublish();
        log.info(`Daily job complete. Post ${post.id} status=${post.status}.`);
      } else {
        const post = await content.generatePost();
        log.info(`Daily job generated draft ${post.id} (auto-publish disabled).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Daily job failed: ${message}`);
    }
  }
}

/** Stops the scheduler (used during graceful shutdown). */
export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    log.info('Scheduler stopped.');
  }
}
