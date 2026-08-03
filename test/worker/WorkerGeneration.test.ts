import { describe, expect, it } from 'vitest';
import type { Worker } from 'worker_threads';

import {
  getWorkerHeartbeatAgeMs,
  isCurrentWorkerGeneration,
} from '../../src/worker/WorkerHandle';

describe('WorkerHandle generation ownership', () => {
  it('accepts events only from the exact active generation and worker', () => {
    const oldWorker = {} as Worker;
    const replacementWorker = {} as Worker;

    expect(isCurrentWorkerGeneration(2, 2, replacementWorker, replacementWorker))
      .toBe(true);
    expect(isCurrentWorkerGeneration(2, 1, replacementWorker, oldWorker))
      .toBe(false);
    expect(isCurrentWorkerGeneration(2, 2, replacementWorker, oldWorker))
      .toBe(false);
  });

  it('ages startup from generation start until the first heartbeat arrives', () => {
    expect(getWorkerHeartbeatAgeMs(100_000, 10_000, 0)).toBe(90_000);
    expect(getWorkerHeartbeatAgeMs(100_000, 10_000, 80_000)).toBe(20_000);
  });

  it('fails safely for an unstarted generation and clock skew', () => {
    expect(getWorkerHeartbeatAgeMs(100_000, 0, 0)).toBe(0);
    expect(getWorkerHeartbeatAgeMs(50_000, 60_000, 0)).toBe(0);
  });
});
