import { createLogger } from './logger';

const log = createLogger('retry');

export interface RetryOptions {
  /** Total number of attempts (not counting nothing). 3 means try up to 3 times. */
  retries: number;
  /** Base delay in ms; grows exponentially with each attempt. */
  baseDelayMs?: number;
  /** Human-readable label for logging. */
  label: string;
}

/** Sleeps for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async operation with exponential-backoff retries.
 * Never throws until all attempts are exhausted, then rethrows the last error.
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelayMs = 500, label } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      log.warn(`Attempt ${attempt}/${retries} failed for "${label}": ${message}`);

      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        await sleep(delay);
      }
    }
  }

  log.error(`All ${retries} attempts failed for "${label}".`);
  throw lastError instanceof Error
    ? lastError
    : new Error(`Operation "${label}" failed after ${retries} attempts.`);
}
