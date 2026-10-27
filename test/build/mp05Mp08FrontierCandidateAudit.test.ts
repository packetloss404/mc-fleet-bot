import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-mp08-frontier-'));
const OUT = path.join(TEMP, 'out');
let report: any;

describe('MP05/MP08 finite frontier candidate audit', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/audit_mp05_mp08_frontier_candidate_01.mjs', '--out', OUT], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    report = JSON.parse(fs.readFileSync(path.join(OUT, 'mp05-mp08-frontier-candidate-audit-01.json'), 'utf8'));
  }, 190_000);
  afterAll(() => fs.rmSync(TEMP, { recursive: true, force: true }));
  it('rejects source-valid historical deltas when later completion evidence makes them stale', () => {
    expect(report.status).toBe('NO_GENUINELY_UNBUILT_FINITE_DRY_NON_CONTAINER_CANDIDATE');
    expect(report.finiteHistoricalCandidatesRejectedAsStale).toHaveLength(2);
    for (const candidate of report.finiteHistoricalCandidatesRejectedAsStale) {
      expect(candidate).toMatchObject({ fluidOrWaterloggedHaloCount: 0, gravityHaloCount: 0, blockEntityCount: 0, savedEntityCount: 0 });
      expect(candidate.sourceGuardExactCount + candidate.acceptedTargetExactCount).toBe(candidate.targetCount);
    }
    expect(report.finiteHistoricalCandidatesRejectedAsStale.map((candidate: any) => candidate.reconciliationDisposition)).toEqual([
      'REJECTED_ALREADY_BUILT_IN_FRONTIER_SOURCE',
      'REJECTED_ALREADY_BUILT_IN_FRONTIER_SOURCE',
    ]);
  });
  it('retains the C1 correction and emits only a finite numeric decision map', () => {
    expect(report.mp08RejectedCosmeticReplay).toMatchObject({ fixtureBaselineCellCount: 8, allRestoredTo: 'minecraft:polished_deepslate' });
    const map = fs.readFileSync(path.join(OUT, 'mp05-mp08-frontier-candidate-map.svg'), 'utf8');
    expect(map).not.toMatch(/NaN|Infinity/);
    expect(report.mutationAuthority).toBe(false);
  });
});
