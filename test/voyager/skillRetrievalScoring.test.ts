import { describe, it, expect } from 'vitest';

/**
 * Regression cover for the retrieval collapse: an unbounded popularity term
 * let one heavily-used skill outrank every content signal, so the library
 * returned `walk_to_the_nearest_shore` for unrelated queries and the bot
 * regenerated skills it already had (observed up to `_v35`).
 *
 * These pin the SHAPE of the scoring contribution rather than the whole
 * pipeline: popularity must be bounded and must not exceed content signals.
 */
const POPULARITY_WEIGHT = 6;
const RELIABILITY_PENALTY = 8;
const POPULARITY_HALF_LIFE = 5;

const popularity = (successes: number) =>
  POPULARITY_WEIGHT * (successes / (successes + POPULARITY_HALF_LIFE));
const penalty = (failures: number) =>
  RELIABILITY_PENALTY * (failures / (failures + POPULARITY_HALF_LIFE));

/** Max achievable from content: keyword hits + description + both embeddings. */
const MAX_CONTENT_SIGNAL = 20 + 25;

describe('skill retrieval popularity weighting', () => {
  it('is bounded no matter how popular a skill gets', () => {
    expect(popularity(522)).toBeLessThan(POPULARITY_WEIGHT);
    expect(popularity(10_000)).toBeLessThan(POPULARITY_WEIGHT);
    // The old linear term: 522 * 0.5 = +261, which is what broke retrieval.
    expect(522 * 0.5).toBeGreaterThan(MAX_CONTENT_SIGNAL * 5);
  });

  it('can never outweigh the content signals', () => {
    expect(popularity(Number.MAX_SAFE_INTEGER)).toBeLessThan(MAX_CONTENT_SIGNAL);
    expect(penalty(Number.MAX_SAFE_INTEGER)).toBeLessThan(MAX_CONTENT_SIGNAL);
  });

  it('still rewards a working skill over an unproven one', () => {
    expect(popularity(20)).toBeGreaterThan(popularity(1));
    expect(popularity(1)).toBeGreaterThan(popularity(0));
  });

  it('still penalises a failing skill, and more than it rewards', () => {
    expect(penalty(20)).toBeGreaterThan(penalty(0));
    expect(penalty(50)).toBeGreaterThan(popularity(50));
  });
});
