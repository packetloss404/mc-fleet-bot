import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  atomicWriteJson,
  atomicWriteJsonSync,
  atomicWriteTextSync,
} from '../../src/util/atomicWrite';

/**
 * A FIXED `<file>.tmp` is not atomic when more than one writer targets the
 * same path. All 5 bot workers hold their own StatsTracker / SocialMemory /
 * PlanLibrary / SkillLibrary over the SAME files, so two writers shared one
 * temp file and tore each other's output — the source of the corrupt
 * qa_cache.json. These pin that each write is self-contained.
 */
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('atomic write temp-file isolation', () => {
  it('never uses a predictable shared <file>.tmp', () => {
    const target = path.join(dir, 'store.json');
    atomicWriteJsonSync(target, { a: 1 });
    expect(fs.existsSync(target + '.tmp')).toBe(false);
    expect(JSON.parse(fs.readFileSync(target, 'utf8'))).toEqual({ a: 1 });
  });

  it('leaves no temp litter behind after writing', () => {
    const target = path.join(dir, 'store.json');
    for (let i = 0; i < 5; i++) atomicWriteJsonSync(target, { i });
    expect(fs.readdirSync(dir).filter((f) => f.includes('.tmp'))).toEqual([]);
  });

  it('concurrent async writers each produce a VALID file, never a torn one', async () => {
    const target = path.join(dir, 'shared.json');
    await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        atomicWriteJson(target, { writer: i, payload: 'x'.repeat(2000) }),
      ),
    );
    // Last-writer-wins is expected; a PARSE FAILURE is the bug.
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    expect(typeof parsed.writer).toBe('number');
    expect(parsed.payload).toHaveLength(2000);
    expect(fs.readdirSync(dir).filter((f) => f.includes('.tmp'))).toEqual([]);
  });

  it('applies to text writes too (skill .js files)', () => {
    const target = path.join(dir, 'skill.js');
    atomicWriteTextSync(target, 'async function f(){}');
    expect(fs.existsSync(target + '.tmp')).toBe(false);
    expect(fs.readFileSync(target, 'utf8')).toBe('async function f(){}');
  });
});
