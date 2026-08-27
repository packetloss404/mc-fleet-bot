import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/seal_combined_zones_r10_bounded_mvp_closure.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r10-mvp-closure');
const SEAL = path.join(EVIDENCE, 'r10-mvp-closure.json');
const RELEASE_CONTRACT = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r10-closure-'));
const CURRENT = path.join(temp, 'current-r10-mvp-closure.json');
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const historicalSealSha256 = sha256(SEAL);
let report: Record<string, any>;

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--out', CURRENT,
    '--markdown', path.join(temp, 'current-r10-mvp-closure.md'),
  ], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  report = JSON.parse(fs.readFileSync(CURRENT, 'utf8')) as Record<string, any>;
});

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R10 bounded MVP closure', () => {
  it('reproduces the current-state read-only seal without rewriting historical evidence', () => {
    const out = path.join(temp, 'reproduced-r10-mvp-closure.json');
    const markdown = path.join(temp, 'reproduced-r10-mvp-closure.md');
    execFileSync(process.execPath, [SCRIPT, '--out', out, '--markdown', markdown], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    expect(sha256(out)).toBe(sha256(CURRENT));
    expect(report.bindings.releaseContract.sha256).toBe(sha256(RELEASE_CONTRACT));
    expect(sha256(SEAL)).toBe(historicalSealSha256);
  });

  it('binds the exact R10 node and accepted R10H/R12O physical-post anchor', () => {
    expect(report).toMatchObject({
      status: 'PASS_R10_BOUNDED_MVP_FITOUT_AND_PASSIVE_CIRCULATION_CLOSURE_ACCEPTED',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      mvpScope: true,
      bindings: {
        acceptedR10hPost: {
          completeSaveSha256: '86bdbd6875a18cffc2707334633f79c9089aecb9fb45074fb16111bfd87fda4b',
          regionSnapshotSha256: '4a05db8475820894ad5c5043b84f13c27611acf0899cc41e5a1f4b9f17878268',
          completedReleaseIdentitySha256: '731d4b4c669ac1bccf3c1f2fd32dc5f67c2f70922700d8fb7f3c1ac50f62b364',
        },
      },
    });
  });

  it('accepts only the exact bounded Cheyenne, B09 static, and B03 circulation result', () => {
    expect(report.acceptedBoundedMvp).toEqual({
      cheyenne: {
        linerCellCount: 594,
        routeAirCellCount: 660,
        terminusCapCellCount: 20,
        circulationToFailClosedHoldAccepted: true,
      },
      b09Summit: {
        connectedStaticRouteAirCellCount: 1116,
        completeBoundaryCellCount: 3346,
        passiveFixtureCount: 39,
        laterPassiveRailCellCount: 489,
        staticFitoutAccepted: true,
        transportCommissioned: false,
      },
      b03ContactSequence: {
        commissionedFirstIndex: 188,
        commissionedLastIndex: 800,
        stationCount: 613,
        linerTargetCellCount: 5940,
        routeAirCellCount: 12212,
        centralClearanceAirCellCount: 5505,
        passiveFixtureCount: 102,
        currentPostRollbackGuardPassCount: 5988,
        passiveInternalInspectionCirculationAccepted: true,
      },
    });
  });

  it('keeps every secure, public, active, chamber, terminal, and exterior hold false', () => {
    expect(report.exactRetainedHolds).toMatchObject({
      b03Indices0Through187: {
        commissioned: false,
        routeObstructionCount: 63,
        unsupportedFloorAirCellCount: 14,
      },
      secureRouteCommissioned: false,
      publicRouteCommissioned: false,
      accessControlCommissioned: false,
      activeMechanismCommissioned: false,
      b09TransportOrFunicularCommissioned: false,
      cheyenneChamberOpenedOrOccupied: false,
      directTerminalLinkOpened: false,
      exteriorOpeningCommissioned: false,
      rescueOrEgressCommissioned: false,
      powerSignalDriveBrakeVehicleDrainageCommissioned: false,
    });
    expect(report.evidenceLimits).toEqual({
      globalTerminalSnapshotClaimed: false,
      fullSecureOrPublicRouteClaimed: false,
      activeSystemClaimed: false,
      closureNeedsPhysicalMutation: false,
    });
  });

  it('passes all checks while preserving a complete read-only safety boundary', () => {
    expect(report.checks).toHaveLength(12);
    expect(report.checks.every((check: any) => check.status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 12,
      passCount: 12,
      waitingCount: 0,
      boundedMvpClosureAccepted: true,
      retainedHoldCount: 11,
    });
    expect(report.safetyBoundary).toEqual({
      readOnly: true,
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      canonicalBuildopsReadOrModified: false,
      serviceMutationsPerformed: false,
      publicationPerformed: false,
    });
  });
});
