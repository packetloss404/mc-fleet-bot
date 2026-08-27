import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-main-runner-'));
const out = path.join(temp, 'prepared');
const snapshot = 'data/worldsnap-masterplan-frontier-refresh-20260827T053500Z';
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('C01 main-switchback guarded runner', () => {
  it('rebinds, compiles, and passes every offline kernel gate without entering live execution', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp11_c01_main_switchback_transition_01_release.mjs',
      '--source-snapshot-root', snapshot, '--out-dir', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-main-switchback-transition-01-guarded-release-ledger.json'), 'utf8'));
    expect(result.status).toBe('PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_AUTHORIZATION_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION');
    expect(result.mutationAuthority).toBe(false);
    expect(ledger.mode).toBe('PREPARE_ONLY');
    expect(ledger.stages.map((stage: { stage: string }) => stage.stage)).toEqual([
      'source-complete-save-intake', 'fresh-main-switchback-transition-rebind', 'fresh-main-switchback-compiler',
      'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser',
      'projected-rollback-preflight', 'block-entity-and-protected-core-clearance',
    ]);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ id: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01', mutationAuthority: false, scope: { stationCount: 30, canonicalTargetUnion: { cellCount: 928 }, currentProtectedRouteRetirementTargetCellCount: 0 }, retainedReturn02: { canonicalStateGeometry: { cellCount: 768 }, mainAndGuardIntersectionCount: 0 }, projectedFunctionalQa: { status: 'PASS_PROJECTED_MAIN_AND_RETURN02_TWO_WAY_NORMAL_WALK' } });
  }, 60_000);

  it('accepts only the constrained scoped execution authorization before live gates', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp11_c01_main_switchback_transition_01_release.mjs', '--validate-execution-authorization',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(result).toMatchObject({ status: 'SCOPED_EXECUTION_AUTHORIZATION_ACCEPTED_LIVE_GATES_NOT_ENTERED', releaseId: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01', mutationAuthority: false });
  });
});
