import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/design_mp11_c01_main_switchback_transition_return02_preservation_05.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-main-transition-05-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('C01 main-switchback transition / Return-02 preservation 05', () => {
  it('selects exact endcaps, landing preservation, guards and a no-retirement transition without operations', () => {
    const out = path.join(temp, 'contract');
    execFileSync(process.execPath, [SCRIPT, '--out', out, '--generated-at', '2026-08-27T05:35:00.000Z'], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    const contract = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-main-switchback-transition-return02-preservation-05.json'), 'utf8'));
    expect(contract).toMatchObject({
      id: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05',
      status: 'SOURCE_BOUND_TRANSITION_SEMANTICS_SELECTED__NO_COMPILER_OR_RELEASE_AUTHORITY',
      mutationAuthority: false,
      selectedGeometry: {
        mainLane: { stationCount: 30, targetDesignGeometry: { cellCount: 828 } },
        upperEndcap: { station: { x: 839, y: 43, z: -47 }, treadDesign: expect.any(Array) },
        lowerEndcap: { station: { x: 837, y: 25, z: -54 }, treadDesign: expect.any(Array) },
        handrailAndGuard: { canonicalState: 'minecraft:polished_deepslate_wall', geometry: { cellCount: 100 } },
      },
      retainedReturn: { verifiedAgainstFreshSource: true, currentCanonicalStateMismatchCount: 0, mainTargetIntersectionCount: 0 },
      controlledRouteTransition: { currentProtectedRouteTargetCellCount: 0, selectedRouteClosureState: 'NONE' },
      safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(contract.selectedGeometry.upperEndcap.treadDesign).toHaveLength(5);
    expect(contract.selectedGeometry.lowerEndcap.treadDesign).toHaveLength(5);
    expect(contract.selectedGeometry.handrailAndGuard.upperEndcapCells).toHaveLength(4);
    expect(contract.selectedGeometry.handrailAndGuard.lowerEndcapCells).toHaveLength(4);
    expect(contract.selectedGeometry.handrailAndGuard.collisionResolution).toEqual({
      nominalTreadCollisionCells: [[846, 35, -48], [846, 35, -49]],
      outboardReplacementCells: [[845, 35, -48], [845, 35, -49]],
      preservedGuardCellCount: 100,
      rule: 'replace only the two observed east-fold bottom guard/tread collisions with disjoint outboard cells; retain all other guard cells',
    });
    const guardPoints = new Set(contract.selectedGeometry.handrailAndGuard.cells.map((cell: { point: number[] }) => cell.point.join(',')));
    expect(guardPoints.has('846,35,-48')).toBe(false);
    expect(guardPoints.has('846,35,-49')).toBe(false);
    expect(guardPoints.has('845,35,-48')).toBe(true);
    expect(guardPoints.has('845,35,-49')).toBe(true);
    expect(contract.controlledRouteTransition.selectedSemantics).toHaveLength(4);
    expect(contract.stillRequiredBeforeCompiler.length).toBeGreaterThanOrEqual(7);
    expect(fs.existsSync(path.join(out, 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05.md'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-c01-main-switchback-transition-return02-preservation-05.svg'))).toBe(true);
  }, 120_000);
});
