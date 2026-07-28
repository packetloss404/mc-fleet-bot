const MAX_RETRY_BACKOFF_MS = 10_000;

/**
 * Delay before a one-indexed execution attempt.
 *
 * The initial attempt is immediate. Every subsequent attempt doubles from
 * two seconds and caps at ten seconds. Keeping this arithmetic pure avoids
 * off-by-one drift between logs, tests, and the retry loop.
 */
export function retryBackoffMs(nextAttempt: number): number {
  if (!Number.isSafeInteger(nextAttempt) || nextAttempt < 1) {
    throw new RangeError(`nextAttempt must be a positive safe integer, got ${nextAttempt}`);
  }
  if (nextAttempt === 1) return 0;
  return Math.min(1000 * 2 ** (nextAttempt - 1), MAX_RETRY_BACKOFF_MS);
}
