import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z',
);
const SEAL = path.join(EVIDENCE, 'r12o-commissioning.json');
const report = JSON.parse(fs.readFileSync(SEAL, 'utf8')) as Record<string, any>;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r12o-commissioning-'));
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R12O B03 complete enclosed-route commissioning', () => {
  it('reproduces the canonical as-built commissioning seal', () => {
    const out = path.join(temp, 'commissioning.json');
    const markdown = path.join(temp, 'commissioning.md');
    execFileSync(process.execPath, [
      path.join(ROOT, 'scripts/commission_combined_zones_r12o_b03_complete_enclosed_route.mjs'),
      '--out', out,
      '--markdown', markdown,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(sha256(out)).toBe(sha256(SEAL));
    expect(sha256(SEAL)).toBe('e4ee22264c73fbac7e1f3c6640a78fe452f693d5a9daf05bb2f929c90210b1d4');
  }, 30_000);

  it('binds only the accepted R10H immutable post', () => {
    expect(report).toMatchObject({
      status: 'PASS_R12O_B03_INDICES_188_800_PASSIVE_INTERNAL_CIRCULATION_COMMISSIONED',
      commissioningPayloadSha256: '50216adf73f91511cb652204239df58a0fb5fbade16d64ce8426a9918971ec96',
      release: {
        releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
        sourceCompletedReleaseIdentitySha256: '731d4b4c669ac1bccf3c1f2fd32dc5f67c2f70922700d8fb7f3c1ac50f62b364',
      },
      bindings: {
        latestPhysicalState: {
          completeSaveSha256: '86bdbd6875a18cffc2707334633f79c9089aecb9fb45074fb16111bfd87fda4b',
          regionSnapshotSha256: '4a05db8475820894ad5c5043b84f13c27611acf0899cc41e5a1f4b9f17878268',
        },
      },
    });
  });

  it('proves the complete 613-station enclosed route geometry', () => {
    expect(report.geometry).toMatchObject({
      centerline: { firstIndex: 188, lastIndex: 800, stationCount: 613, stepCount: 612 },
      route: { cellCount: 12212 },
      upstreamSeam: { cellCount: 20 },
      routeWithUpstream: { cellCount: 12232 },
      centralClearance: { cellCount: 5505 },
      floor: { cellCount: 3053 },
      ceiling: { cellCount: 3053 },
      fallBoundary: { cellCount: 4856 },
      cheyenneTerminusCap: { cellCount: 20 },
      interactionDomain: { cellCount: 41652 },
    });
    expect(report.observedState.route).toMatchObject({
      airCellCount: 12212,
      mismatchCellCount: 0,
      componentCount: 1,
      largestComponentCellCount: 12212,
    });
  });

  it('proves support, enclosure, cadence, seam, cap, and hazard clearance', () => {
    expect(report.observedState.centralClearance).toEqual({ airCellCount: 5505, mismatchCellCount: 0 });
    expect(report.observedState.floor.hazardCellCount).toBe(0);
    expect(report.observedState.ceiling.hazardCellCount).toBe(0);
    expect(report.observedState.fallBoundary.hazardCellCount).toBe(0);
    expect(report.observedState.fixtures).toMatchObject({
      cellCount: 102,
      maximumLongitudinalSpacing: 6,
    });
    expect(report.observedState.seamsAndCap).toEqual({
      upstreamAirCellCount: 20,
      cheyenneTerminusStoneCellCount: 20,
    });
    expect(report.observedState.interactionDomain).toEqual({
      cellCount: 41652,
      hazardCellCount: 0,
      blockEntityCount: 0,
      savedEntityCount: 0,
    });
  });

  it('preserves the explicit upstream obstruction hold and nonclaims', () => {
    expect(report.explicitUpstreamHold).toMatchObject({
      excludedCenterlineRange: { firstIndex: 0, lastIndex: 187, pointCount: 188 },
      exactRouteCellCount: 3760,
      exactRouteObstructionCount: 63,
      exactFloorCellCount: 940,
      exactUnsupportedFloorAirCellCount: 14,
      commissioned: false,
    });
    expect(report.boundary).toMatchObject({
      secureRouteCommissioned: false,
      publicRouteCommissioned: false,
      accessControlCommissioned: false,
      activeMechanismCommissioned: false,
      chamberOpenedOrOccupied: false,
      directTerminalLinkOpened: false,
    });
  });

  it('proves the exact disjoint 5,988-guard reverse chain', () => {
    expect(report.rollbackReadiness).toMatchObject({
      totalOperationCount: 5988,
      passedGuardCount: 5988,
      failedGuardCount: 0,
      crossPackageIntersectionCount: 0,
      exactCurrentPostState: true,
    });
    expect(report.summary).toMatchObject({
      passed: true,
      checkCount: 13,
      passCount: 13,
      failCount: 0,
      stationCount: 613,
      routeAirCellCount: 12212,
      fixtureCellCount: 102,
      rollbackGuardPassCount: 5988,
    });
    expect(report.safetyBoundary).toMatchObject({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      serviceMutationsPerformed: false,
    });
  });
});
