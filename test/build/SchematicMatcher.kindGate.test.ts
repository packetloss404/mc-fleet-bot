import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { SchematicMatcher } from '../../src/build/SchematicMatcher';

/**
 * Regression tests for the "tent instead of a well" incident (Ravensreach,
 * 2026-07-24).
 *
 * TownBrain planned a `well` with schematicQuery 'medieval stone well'. The LLM
 * designer was unavailable ("AI is disabled (kill switch)"), so the library
 * fallback ran — and matched `medieval-tent.schem`, scoring purely on the shared
 * descriptor "medieval" (5 for the intent hit + 3 for the style hit) with zero
 * match on the noun "well", which had no synonym bucket at all. The town then
 * pasted a red canvas tent onto the town hall's stone-brick apron and recorded it
 * in its own registry as a completed well.
 *
 * The filenames below are the real ones from `schematics/`, reproduced in a temp
 * fixture so the test stays deterministic if the library changes. Note there is
 * no well schematic in the real library — so refusing to build is the correct
 * outcome, and these tests assert exactly that.
 */
let dir: string;
let matcher: SchematicMatcher;

const FILES = [
  'medieval-tent.schem',
  'medieval-tower.schem',
  'small medieval town hall.schem',
  'city-hall.schem',
  'camping-tents.schem',
  'birch house.schem',
  'cottage_01.schem',
  'medieval-storehouse.schem',
];

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schem-match-'));
  for (const f of FILES) fs.writeFileSync(path.join(dir, f), '');
  matcher = new SchematicMatcher(dir);
  matcher.refresh();
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('SchematicMatcher kind gate', () => {
  it('does NOT satisfy a well request with a tent — the exact historical bug', () => {
    const m = matcher.match('medieval stone well', { style: 'medieval-communal', kind: 'well' });
    expect(m?.filename).not.toBe('medieval-tent.schem');
  });

  it('refuses entirely when nothing in the library is the requested kind', () => {
    // No well schematic exists. Returning null makes TownBrain skip and log
    // design:no-match, which is the safe outcome — a missing well is visible,
    // a tent recorded AS a well is silent registry corruption.
    expect(matcher.match('medieval stone well', { style: 'medieval-communal', kind: 'well' })).toBeNull();
  });

  it('still matches the right thing when the library does have it', () => {
    const m = matcher.match('small medieval town hall', { style: 'medieval-communal', kind: 'town_hall' });
    expect(m).not.toBeNull();
    expect(m!.filename).toBe('small medieval town hall.schem');
  });

  it('matches a kind through its synonym bucket, not just its literal name', () => {
    // kind 'storage' must reach 'medieval-storehouse.schem' via the storage bucket.
    const m = matcher.match('medieval storehouse', { style: 'medieval-communal', kind: 'storage' });
    expect(m?.filename).toBe('medieval-storehouse.schem');
  });

  it('a shared style adjective alone never wins a match', () => {
    // 'medieval' + 'rustic' are pure descriptors; with a kind that nothing
    // satisfies, no amount of adjective overlap should produce a result.
    expect(matcher.match('medieval rustic', { style: 'medieval-communal', kind: 'well' })).toBeNull();
  });

  it('does not confuse a tower with a well', () => {
    const m = matcher.match('medieval stone well', { style: 'medieval', kind: 'well' });
    expect(m?.filename).not.toBe('medieval-tower.schem');
  });

  it('prefers the noun match over descriptor matches when ranking', () => {
    // 'medieval-tower.schem' shares the descriptor; only it shares the noun.
    const m = matcher.match('medieval tower', { style: 'medieval-communal', kind: 'tower' });
    expect(m?.filename).toBe('medieval-tower.schem');
  });

  it('remains usable with no kind supplied (backward compatibility)', () => {
    const m = matcher.match('house');
    expect(m).not.toBeNull();
    expect(['birch house.schem', 'cottage_01.schem']).toContain(m!.filename);
  });

  it('rejects a descriptor-only query even when no kind is supplied', () => {
    // Without a kind, a match still requires at least one non-descriptor hit,
    // so "medieval" on its own cannot select an arbitrary medieval file.
    expect(matcher.match('medieval')).toBeNull();
    expect(matcher.match('small stone')).toBeNull();
  });

  it('reports which token satisfied the kind, for debuggability', () => {
    const m = matcher.match('medieval storehouse', { kind: 'storage' });
    expect(m!.reason).toContain('kind:');
  });
});
