import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/commission_combined_zones_r09k_b07_bounded_upper_route.mjs');
const REPORT = path.join(
  ROOT,
  'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09k-b07-bounded-upper-route-commissioning-seal.json',
);

interface Report {
  status: string;
  commissioningIdentitySha256: string;
  bindings: Record<string, unknown>;
  commissionedScope: Record<string, unknown>;
  retainedHolds: Record<string, boolean | number>;
  laneDisposition: Record<string, boolean>;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

let output = '';
let report: Report;

beforeAll(() => {
  output = execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as Report;
}, 30_000);

describe('CZ-R09K bounded B07 upper-route commissioning', () => {
  it('deterministically seals the accepted R09J terminal evidence', () => {
    expect(JSON.parse(output)).toMatchObject({
      status: 'PASS_R09K_B07_BOUNDED_UPPER_SEGMENT_COMMISSIONED_TO_CLOSED_HOLDS',
      commissioningIdentitySha256: 'b8eaa177b111c25f1e7faa51b5b450dec9610b4d0fcd0e63f2b3447d4434ef21',
    });
    expect(report.bindings).toMatchObject({
      completedReleaseIdentitySha256: '0c722e3ac473ab22239bba599bbab8c1b9776f727212442bf9a044c40494a47d',
      postCompleteSaveSha256: '81cf43e16f60b875e5e4eb5f50df0f43487ed9b3fd2f52e7883b22e2147c5132',
      postRegionSha256: '072bfa045bbc55b457585bd6725159cc97a4650b73e7769b4f977a2972682067',
    });
  });

  it('commissions only the exact 91-surface closed upper component', () => {
    expect(report.commissionedScope).toMatchObject({
      useClass: 'PASSIVE_INTERNAL_INSPECTION_CIRCULATION_WITHIN_CLOSED_B07_ENVELOPE',
      surfaceCellCount: 91,
      stairIndexStart: 21,
      stairIndexEnd: 110,
      closedUpperEndpoint: 'DOORLESS_R07J_HEADHOUSE_INTERIOR_HOLD',
      closedLowerEndpoint: 'R09J_TWO_CELL_GRAVITY_ISOLATION_CAP_AT_STAIR_INDEX_20',
      clearanceCellCount: 182,
      clearanceAirCellCount: 182,
      boundaryCellCount: 174,
      collisionBoundaryCellCount: 172,
      floorBackedApertureCount: 2,
      supportedGravityBoundaryCellCount: 8,
      unsupportedGravityBoundaryCellCount: 0,
      internallyReachableSurfaceCount: 91,
      reachableExcludedLowerSurfaceCount: 0,
    });
  });

  it('keeps every exact local through-route and system hold closed', () => {
    expect(report.retainedHolds).toMatchObject({
      fullB07ThroughRouteCommissioned: false,
      lowerStairIndices0Through20Excluded: true,
      inheritedUnsupportedGravelBoundaryCellCount: 2,
      unsupportedGravelStabilizedOrRemoved: false,
      lowerWetInterfaceOpened: false,
      exteriorDoorOrOpeningCreated: false,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      accessibleRouteCommissioned: false,
      liftCommissioned: false,
      smokeControlCommissioned: false,
      powerOrDrainageCommissioned: false,
    });
  });

  it('closes the R09 physical MVP lane without authorizing cosmetic follow-ons', () => {
    expect(report.laneDisposition).toMatchObject({
      r09PhysicalFitoutLaneClosedForMvp: true,
      usefulBoundedUpperSegmentAccepted: true,
      completeThroughRouteDeferredByExactLocalGravityHold: true,
      nextWorkMustNotBeTinyCosmeticB07Scope: true,
    });
  });

  it('passes all 12 criteria as an evidence-only seal', () => {
    expect(report.summary).toMatchObject({
      passed: true,
      criterionCount: 12,
      passCount: 12,
      failCount: 0,
      commissionedSurfaceCellCount: 91,
      retainedLocalHoldCount: 3,
    });
    expect(report.safetyBoundary).toMatchObject({
      evidenceOnly: true,
      liveCallsPerformed: false,
      worldMutationPerformed: false,
      publicOrFireServiceCommissioningClaimed: false,
      fullThroughRouteCommissioningClaimed: false,
    });
  });
});
