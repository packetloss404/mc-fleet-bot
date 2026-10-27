import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-public-vertical-return-'));
const out = path.join(temp, 'design');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11 C01 public vertical switchback / independent return design', () => {
  it('binds two disjoint 5×5 future lanes and denies all mutation authority', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp11_c01_public_vertical_switchback_return_02.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8' }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.status).toBe('SOURCE_BOUND_5X5_PUBLIC_SWITCHBACK_AND_INDEPENDENT_RETURN_DESIGN_ONLY');
    expect(report.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
    expect(report.candidateGeometry.mainSwitchback.stationCount).toBe(30);
    expect(report.candidateGeometry.independentReturn.stationCount).toBe(28);
    expect(report.candidateGeometry.mainSwitchback.publicClearance).toMatchObject({ width: 5, clearHeight: 5 });
    expect(report.endpointInterfaceContracts.mainUpper.clearFace.cellCount).toBe(25);
    expect(report.endpointInterfaceContracts.returnLower.clearFace.cellCount).toBe(25);
    expect(report.independentReturnProof.mainAndReturnTargetCellIntersectionCount).toBe(0);
    expect(report.independentReturnProof.mainAndReturnInteractionCellIntersectionCount).toBe(0);
    expect(report.independentReturnProof.returnVsCurrentProtectedInteriorHaloIntersectionCount).toBe(0);
    expect(report.sourceSafetyInventory.blockEntitiesInFutureInteractionSet).toBe(0);
    expect(fs.existsSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02-plan.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02-elevation.svg'))).toBe(true);
  });
});
