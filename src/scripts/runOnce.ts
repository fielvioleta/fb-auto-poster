import { getContainer } from '../container';
import { createLogger } from '../utils/logger';

const log = createLogger('runOnce');

/**
 * One-shot CLI utility for manual runs / cron-on-VPS setups.
 *
 *   npm run generate   -> generate a draft only
 *   npm run publish    -> generate AND publish immediately
 */
async function main(): Promise<void> {
  const mode = (process.argv[2] ?? 'generate').toLowerCase();
  const { content } = getContainer();

  if (mode === 'publish') {
    const post = await content.generateAndPublish();
    log.info(`Done. Post ${post.id} status=${post.status}.`);
  } else {
    const post = await content.generatePost();
    log.info(`Done. Draft ${post.id} generated for topic "${post.topic}".`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`runOnce failed: ${message}`);
    process.exit(1);
  });
