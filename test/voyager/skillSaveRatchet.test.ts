import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SkillLibrary } from '../../src/voyager/SkillLibrary';

/**
 * `save()` used to return boolean, discarding the `_vN` name it actually
 * stored under. Callers then credited success to the BASE name while failures
 * landed on the versioned one — a one-way ratchet that left all 246 versioned
 * skills at exactly 0 successes / 5,688 failures.
 */
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('SkillLibrary.save returns the stored name', () => {
  it('returns the base name on first save', async () => {
    const lib = new SkillLibrary(dir, 100);
    expect(await lib.save('mine_oak', 'mine an oak log', ['oak'], 'code')).toBe('mine_oak');
  });

  it('returns the VERSIONED name on collision, so success can be credited correctly', async () => {
    const lib = new SkillLibrary(dir, 100);
    await lib.save('mine_oak', 'd', ['oak'], 'code1');
    const second = await lib.save('mine_oak', 'd', ['oak'], 'code2');
    expect(second).toBe('mine_oak_v2');

    // Crediting the returned name must land on the NEW entry, not the old one.
    lib.recordOutcome(second!, true);
    const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    const entries = Array.isArray(idx) ? idx : idx.skills ?? [];
    const v2 = entries.find((e: any) => e.name === 'mine_oak_v2');
    const base = entries.find((e: any) => e.name === 'mine_oak');
    expect(v2?.successCount).toBe(1);
    expect(base?.successCount ?? 0).toBe(0);
  });
});

describe('SkillLibrary eviction at cap', () => {
  it('evicts the worst entry instead of refusing the save', async () => {
    const lib = new SkillLibrary(dir, 2);
    const proven = await lib.save('good', 'd', ['k'], 'c');
    lib.recordOutcome(proven!, true);
    const junk = await lib.save('junk', 'd', ['k'], 'c');
    lib.recordOutcome(junk!, false);
    lib.recordOutcome(junk!, false);

    // At cap. The old code returned false here and learning stopped.
    const fresh = await lib.save('brand_new', 'd', ['k'], 'c');
    expect(fresh).toBe('brand_new');

    const names = lib.getSkillNames();
    expect(names).toContain('brand_new');
    expect(names).toContain('good');   // proven skill survives
    expect(names).not.toContain('junk'); // zero-success, most-failed evicted
  });
});
