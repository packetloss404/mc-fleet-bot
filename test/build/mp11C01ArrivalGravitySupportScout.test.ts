import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z';
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-arrival-gravity-support-'));
const OUT = path.join(TEMP, 'out');
let report: any;

describe('MP11 C01 arrival gravity-support scout', () => {
  it('finds only a finite dry safety candidate and preserves the cadence interface gate', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/scout_mp11_c01_arrival_gravity_support_01.mjs', '--snapshot', SOURCE, '--out', OUT], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }));
    report = JSON.parse(fs.readFileSync(path.join(OUT, 'mp11-c01-arrival-gravity-support-scout-01.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'CANDIDATE_FINITE_DRY_C01_ARRIVAL_GRAVITY_SUPPORT_REQUIRES_INTERFACE_CONTRACT', componentCellCount: 33, interactionHaloCellCount: 219, cadenceHaloIntersectionCount: 4, staticSourceSafetyPass: true, mutationAuthority: false });
    expect(report.scope.finiteGravityComponent).toMatchObject({ cellCount: 33, bounds: { minX: 751, maxX: 758, minY: 41, maxY: 42, minZ: -84, maxZ: -78 }, boundaryContactCount: 0 });
    expect(report.scope.interactionHalo).toMatchObject({ cellCount: 219, fluidCount: 0, forbiddenBlockCount: 0, blockEntityCount: 0, savedEntityCount: 0 });
    expect(report.scope.floorSupportContacts).toHaveLength(7);
    expect(report.protectedInterfaces.acceptedArrivalCadence).toMatchObject({ oneCellHaloIntersectionCount: 4, operatedTargetIntersectionCount: 0 });
    expect(report.protectedInterfaces.requiredNewContract.state).toBe('MISSING_NOT_AUTHORIZATION');
    expect(report.readiness.independentlyReleasableNow).toBe(false);
    expect(report.disposition).toMatchObject({ operationsEmitted: false, releaseManifestEmitted: false, executionAuthorized: false, liveCallsPerformed: false, worldMutated: false });
    expect(fs.readFileSync(path.join(OUT, 'mp11-c01-arrival-gravity-support-scout-01-map.svg'), 'utf8')).toContain('protected target-halo intersection');
  });
});

afterAll(() => fs.rmSync(TEMP, { recursive: true, force: true }));
