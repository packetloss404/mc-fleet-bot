import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 / MP11 C01 arrival-wayfinding frontier scout', () => {
  it('finds one finite dry non-container candidate beyond C01-NEXT-01 without emitting authority', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-mp11-c01-arrival-frontier-'));
    made.push(temp);
    const out = path.join(temp, 'frontier');
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/scout_sys03_mp11_c01_arrival_wayfinding_frontier_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'SOURCE_VALID_UNBUILT_FINITE_DRY_NONCONTAINER_CANDIDATE_ONLY', candidateCellCount: 3, mutationAuthority: false, liveCallsPerformed: false, worldMutated: false });
    expect(report.source.captureId).toBe('combined-zones-cacae8c7c06e4ac681538303f5fead54');
    expect(report.candidate.sourceOnlySiteCells).toEqual([{ x: 744, y: 42, z: -81 }, { x: 748, y: 42, z: -81 }, { x: 760, y: 42, z: -81 }]);
    expect(report.candidate.localInteractionHalo).toMatchObject({ blockEntityCount: 0, savedEntityCount: 0, fluidCount: 0, gravityCount: 0, forbiddenBlockCount: 0 });
    expect(report.candidate.retainedAsBuiltBoundary.retainedSeaLanternCells).toHaveLength(9);
    expect(report.candidate.excludedSourceSites).toContainEqual(expect.objectContaining({ site: { x: 752, y: 42, z: -81 } }));
    expect(report.disposition).toMatchObject({ readOnly: true, operationsEmitted: false, releaseManifestEmitted: false, executionAuthorized: false, liveCallsPerformed: false, worldMutated: false });
    expect(fs.existsSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01-plan.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-frontier-01-section.svg'))).toBe(true);
  });

  it('fails closed when a stale unrelated snapshot is supplied', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-mp11-c01-arrival-frontier-stale-'));
    made.push(temp);
    expect(() => execFileSync(process.execPath, [
      'scripts/scout_sys03_mp11_c01_arrival_wayfinding_frontier_01.mjs',
      '--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750', '--out', path.join(temp, 'frontier'),
    ], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' })).toThrow(/C01-NEXT-01 inlay drift|missing complete immutable source member|immutable source member drift/);
  });
});
