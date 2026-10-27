import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('MP11 C01 arrival gravity-support permanent design', () => {
  it('binds polished-deepslate material and exact no-falling forward/inverse orders without operations', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-gravity-design-')); made.push(root);
    const out = path.join(root, 'out');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp11_c01_arrival_gravity_support_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    expect(result).toMatchObject({ componentCellCount: 33, forwardTransitionCount: 33, inverseTransitionCount: 33, targetState: 'minecraft:polished_deepslate', cadenceHaloOverlapCount: 4, mutationAuthority: false });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-design-01.json'), 'utf8'));
    expect(report.materialDecision.noTemporaryAirState).toBe(true);
    expect(report.noFallingSequence.forward.transitions.slice(0, 32).every((entry: { cell: { y: number } }) => entry.cell.y === 41)).toBe(true);
    expect(report.noFallingSequence.forward.transitions[32].cell.y).toBe(42);
    expect(report.noFallingSequence.inverse.transitions[0].cell.y).toBe(42);
    expect(report.cadencePreservation).toMatchObject({ acceptedCadenceTargets: { componentTargetIntersectionCount: 0, sourceStateVerified: true }, exactHaloOverlap: { cells: { cellCount: 4 } } });
    expect(fs.readdirSync(out).filter((file) => file.endsWith('.txt')).length).toBe(0);
    expect(fs.readFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-design-01-map.svg'), 'utf8')).not.toMatch(/(?:NaN|Infinity)/);
  }, 30_000);
});
