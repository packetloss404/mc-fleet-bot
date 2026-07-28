import { describe, expect, it } from 'vitest';

import { retryBackoffMs } from '../../src/voyager/RetryPolicy';

describe('retryBackoffMs', () => {
  it('uses the documented one-indexed exponential schedule and cap', () => {
    expect([1, 2, 3, 4, 5, 8].map(retryBackoffMs))
      .toEqual([0, 2_000, 4_000, 8_000, 10_000, 10_000]);
  });

  it('rejects invalid attempt numbers instead of silently changing timing', () => {
    expect(() => retryBackoffMs(0)).toThrow(RangeError);
    expect(() => retryBackoffMs(1.5)).toThrow(RangeError);
    expect(() => retryBackoffMs(Number.NaN)).toThrow(RangeError);
  });
});
