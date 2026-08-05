import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_d06_owner_acceptance_packet.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.md',
);

interface FileBinding {
  path: string;
  sha256: string;
  bytes: number;
  role: string;
}

interface ExactSetReference {
  sourcePath: string;
  jsonPointer: string;
  cellCount: number;
  bounds: Record<string, number>;
  coordinateSetSha256: string;
}

interface AcceptanceCriterion {
  id: string;
  subject: string;
  status: 'PASS' | 'HOLD';
  currentEvidence: Record<string, unknown>;
  passWhenAll: string[];
  holdReason: string | null;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: Record<string, unknown>;
  sourceBindings: Record<string, FileBinding>;
  acceptanceBasisSha256: string;
  soleOwnerAcceptanceStatementTemplate: {
    acceptanceBasisSha256: string;
    copyableStatement: string;
    accepts: string[];
    doesNotAccept: string[];
    recordingBoundary: string;
  };
  b07WestTwo: {
    candidateId: string;
    centerline: { pointCount: number; orderedSha256: string };
    excavationReservation: ExactSetReference;
    interactionUnion: ExactSetReference;
    immutableSnapshotFacts: Record<string, number>;
    technicalDisposition: string;
  };
  protectedEgressAndAccessibleLiftCores: {
    selectedLayouts: Array<{
      coreId: string;
      selectedLayoutId: string;
      protectedStairReservation: ExactSetReference;
      accessibleLiftReservation: ExactSetReference;
      surfaceOutletCap: ExactSetReference;
      mechanismSelected: boolean;
      commissionedEgress: boolean;
      commissionedAccessibleRoute: boolean;
    }>;
    protectedCoreSetsDisjoint: boolean;
    mechanismSelectedCount: number;
    commissionedEgressRouteCount: number;
    commissionedAccessibleRouteCount: number;
  };
  smokeVentilationAndBarriers: {
    localVentAlternativeId: string;
    localVentRisers: Array<{
      id: string;
      reservation: ExactSetReference;
      currentSnapshotAudit: Record<string, number>;
      exteriorOutletOpened: boolean;
      commissioned: boolean;
    }>;
    localVentUnion: ExactSetReference;
    exteriorOutletCountOpened: number;
    smokeModelValidated: boolean;
    mechanismSelected: boolean;
    commissioned: boolean;
    platformBarriers: Array<{
      id: string;
      staticGateBayCap: ExactSetReference;
      poweredGateMechanism: null;
      operationallyAuthorized: boolean;
    }>;
    smokeBoundaries: Array<{
      id: string;
      staticOpeningCaps: ExactSetReference;
      smokeDoorMechanism: null;
      operationallyAuthorized: boolean;
    }>;
    totals: {
      platformStaticGateCapCells: number;
      smokeOpeningCapCells: number;
    };
  };
  emergencyLightingAndPower: Record<string, unknown> & {
    fixtureReservations: Array<{ platformId: string; reservation: ExactSetReference }>;
    exactFixtureReservationCount: number;
    normalCircuitReservation: null;
    emergencyCircuitAReservation: null;
    emergencyCircuitBReservation: null;
    emergencyPowerSource: null;
    transferAndFailureLogic: null;
    photometricOrEmergencyPowerValidation: false;
    commissioned: false;
  };
  cappedDrainage: {
    selectedAlternativeId: string;
    localSumpInterfaceCaps: Array<{ id: string; cap: ExactSetReference }>;
    capUnion: ExactSetReference;
    externalDischargePoint: null;
    pumpMechanismSelected: false;
    hydraulicModelValidated: false;
    commissioned: false;
  };
  fireAndServiceAccess: Record<string, unknown> & {
    selectedAlternativeId: string;
    internalSpineReservation: ExactSetReference;
    normallyClosedSpineInterfaceCap: ExactSetReference;
    surfaceCompoundReservation: ExactSetReference;
    externalApproachRoute: null;
    emergencyServiceAcceptance: false;
    externalApproachRouteProven: false;
    commissioned: false;
  };
  ownershipAndInterfaces: {
    register: Array<{
      slotId: string;
      canonicalOwnerId: null;
      acceptedInterfaceContractIds: string[];
      status: string;
    }>;
    acceptedCanonicalOwnerCount: number;
    acceptedInterfaceContractCount: number;
  };
  acceptanceCriteria: AcceptanceCriterion[];
  disposition: Record<string, unknown> & {
    passCount: number;
    holdCount: number;
    ownerPlanningBasisSelected: boolean;
    ownerTechnicalAcceptanceRecorded: boolean;
    d06Resolved: boolean;
    r00G02Passed: boolean;
    sealed: boolean;
    commissioned: boolean;
    operationCellCount: number;
    materialCellCount: number;
    worldEditAuthorized: boolean;
  };
  releaseBoundary: Record<string, unknown>;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function resolvePointer(document: unknown, pointer: string): unknown {
  expect(pointer).toMatch(/^\//);
  return pointer.slice(1).split('/').reduce<unknown>((value, token) => {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    expect(value).not.toBeNull();
    expect(typeof value).toBe('object');
    return (value as Record<string, unknown>)[key];
  }, document);
}

function expectExactReference(reference: ExactSetReference): void {
  const source = JSON.parse(
    fs.readFileSync(path.join(ROOT, reference.sourcePath), 'utf8'),
  ) as unknown;
  const exact = resolvePointer(source, reference.jsonPointer) as Record<string, unknown>;
  expect(exact.cellCount).toBe(reference.cellCount);
  expect(exact.bounds).toEqual(reference.bounds);
  expect(exact.coordinateSetSha256 ?? exact.cellSetSha256)
    .toBe(reference.coordinateSetSha256);
}

let tempDir: string;
let regeneratedJson: string;
let regeneratedMarkdown: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d06-owner-'));
  regeneratedJson = path.join(tempDir, 'packet.json');
  regeneratedMarkdown = path.join(tempDir, 'packet.md');
  const result = spawnSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-04T23:30:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D06 sole-owner technical-acceptance packet', () => {
  it('regenerates byte-identical hash-bound JSON and Markdown', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d06-owner-acceptance-packet',
      status: 'READY_FOR_SOLE_OWNER_REVIEW_PLANNING_BASIS_BOUND_D06_AND_G02_HOLD',
      authority: {
        soleHumanAuthority: true,
        additionalHumanDecisionMakerRequired: false,
        planningSelectionsAlreadyDelegatedAndRecorded: true,
        technicalAcceptanceRecorded: false,
        executable: false,
        constructionAuthorized: false,
        worldEditAuthorized: false,
        operationCellCount: 0,
        materialCellCount: 0,
        commissioned: false,
        codeComplianceClaimed: false,
      },
    });
    expect(report.acceptanceBasisSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(report.soleOwnerAcceptanceStatementTemplate).toMatchObject({
      acceptanceBasisSha256: report.acceptanceBasisSha256,
    });
    expect(report.soleOwnerAcceptanceStatementTemplate.copyableStatement)
      .toContain(report.acceptanceBasisSha256);
    expect(report.soleOwnerAcceptanceStatementTemplate.copyableStatement)
      .toContain('I do not mark any current HOLD as PASS');
    expect(report.soleOwnerAcceptanceStatementTemplate.doesNotAccept).toContain(
      'opening, commissioning, operation generation, construction, release advancement, or world edits',
    );
    for (const source of Object.values(report.sourceBindings)) {
      expect(sha256File(path.join(ROOT, source.path)), source.path).toBe(source.sha256);
      expect(fs.statSync(path.join(ROOT, source.path)).size).toBe(source.bytes);
      expect(source.path).not.toMatch(/phase1-r00-readiness-audit/);
    }
  });

  it('binds B07 west-two while holding its 38 water cells and mechanisms', () => {
    const b07 = readReport().b07WestTwo;
    expect(b07).toMatchObject({
      candidateId: 'B07-C-WEST-2',
      centerline: {
        pointCount: 163,
        orderedSha256: '58ad6b7fe2de1a24717d0d495b2530047866d5611cc5e20f945c87eabeff133e',
      },
      excavationReservation: {
        cellCount: 8_134,
        coordinateSetSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
      },
      interactionUnion: { cellCount: 13_608 },
      immutableSnapshotFacts: {
        excavationWaterCellCount: 38,
        excavationWaterloggedCellCount: 1,
        excavationLavaCellCount: 0,
        interactionWaterCellCount: 109,
        interactionWaterloggedCellCount: 2,
        generatedStructureExcavationIntersectionCount: 0,
        generatedStructureInteractionIntersectionCount: 0,
        protectedRelicInteractionIntersectionCount: 0,
        blockEntityInteractionIntersectionCount: 0,
      },
      technicalDisposition: 'HOLD_38_WATER_CELLS_AND_MECHANISMS_OWNERS_INTERFACES_UNACCEPTED',
    });
    expectExactReference(b07.excavationReservation);
    expectExactReference(b07.interactionUnion);
  });

  it('binds sealed stairs, lifts, vents, barriers, smoke caps, and emergency fixtures', () => {
    const report = readReport();
    const cores = report.protectedEgressAndAccessibleLiftCores;
    expect(cores.selectedLayouts.map(({ selectedLayoutId }) => selectedLayoutId)).toEqual([
      'EG-A-LAYOUT-A-PRESERVE-FROZEN',
      'EG-B-LAYOUT-A-PRESERVE-FROZEN',
    ]);
    expect(cores.selectedLayouts.map(({ protectedStairReservation }) => protectedStairReservation.cellCount))
      .toEqual([819, 630]);
    expect(cores.selectedLayouts.map(({ accessibleLiftReservation }) => accessibleLiftReservation.cellCount))
      .toEqual([351, 270]);
    expect(cores).toMatchObject({
      protectedCoreSetsDisjoint: true,
      mechanismSelectedCount: 0,
      commissionedEgressRouteCount: 0,
      commissionedAccessibleRouteCount: 0,
    });
    for (const core of cores.selectedLayouts) {
      expect(core.mechanismSelected).toBe(false);
      expect(core.commissionedEgress).toBe(false);
      expect(core.commissionedAccessibleRoute).toBe(false);
      expectExactReference(core.protectedStairReservation);
      expectExactReference(core.accessibleLiftReservation);
      expectExactReference(core.surfaceOutletCap);
    }

    const smoke = report.smokeVentilationAndBarriers;
    expect(smoke).toMatchObject({
      localVentAlternativeId: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
      localVentUnion: { cellCount: 900 },
      exteriorOutletCountOpened: 0,
      smokeModelValidated: false,
      mechanismSelected: false,
      commissioned: false,
      totals: {
        platformStaticGateCapCells: 192,
        smokeOpeningCapCells: 72,
      },
    });
    expect(smoke.localVentRisers.map(({ id }) => id)).toEqual([
      'EE-VENT-NW',
      'EE-VENT-NE',
      'EE-VENT-SW',
      'EE-VENT-SE',
    ]);
    expect(smoke.localVentRisers.map(({ reservation }) => reservation.cellCount))
      .toEqual([279, 432, 99, 90]);
    for (const riser of smoke.localVentRisers) {
      expect(riser.currentSnapshotAudit).toMatchObject({
        waterCellCount: 0,
        waterloggedCellCount: 0,
        lavaCellCount: 0,
        generatedStructureExcavationIntersectionCount: 0,
        generatedStructureInteractionIntersectionCount: 0,
        blockEntityInteractionCount: 0,
      });
      expect(riser.exteriorOutletOpened).toBe(false);
      expect(riser.commissioned).toBe(false);
      expectExactReference(riser.reservation);
    }
    expect(smoke.platformBarriers).toHaveLength(8);
    expect(smoke.platformBarriers.every(({ staticGateBayCap, poweredGateMechanism, operationallyAuthorized }) => (
      staticGateBayCap.cellCount === 24
        && poweredGateMechanism === null
        && !operationallyAuthorized
    ))).toBe(true);
    expect(smoke.smokeBoundaries).toHaveLength(2);
    expect(smoke.smokeBoundaries.every(({ staticOpeningCaps, smokeDoorMechanism, operationallyAuthorized }) => (
      staticOpeningCaps.cellCount === 36
        && smokeDoorMechanism === null
        && !operationallyAuthorized
    ))).toBe(true);

    const power = report.emergencyLightingAndPower;
    expect(power.exactFixtureReservationCount).toBe(56);
    expect(power.fixtureReservations.map(({ reservation }) => reservation.cellCount))
      .toEqual([7, 7, 7, 7, 7, 7, 7, 7]);
    expect(power).toMatchObject({
      normalCircuitReservation: null,
      emergencyCircuitAReservation: null,
      emergencyCircuitBReservation: null,
      emergencyPowerSource: null,
      transferAndFailureLogic: null,
      photometricOrEmergencyPowerValidation: false,
      commissioned: false,
    });
  });

  it('keeps drainage, fire/service, owners, and interfaces closed and null', () => {
    const report = readReport();
    const drainage = report.cappedDrainage;
    expect(drainage).toMatchObject({
      selectedAlternativeId: 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS',
      capUnion: { cellCount: 24 },
      externalDischargePoint: null,
      pumpMechanismSelected: false,
      hydraulicModelValidated: false,
      commissioned: false,
    });
    expect(drainage.localSumpInterfaceCaps).toHaveLength(8);
    expect(drainage.localSumpInterfaceCaps.every(({ cap }) => cap.cellCount === 3)).toBe(true);
    drainage.localSumpInterfaceCaps.forEach(({ cap }) => expectExactReference(cap));

    expect(report.fireAndServiceAccess).toMatchObject({
      selectedAlternativeId: 'FIRE-EG-B',
      internalSpineReservation: { cellCount: 3_025 },
      normallyClosedSpineInterfaceCap: { cellCount: 35 },
      externalApproachRoute: null,
      emergencyServiceAcceptance: false,
      externalApproachRouteProven: false,
      commissioned: false,
    });
    expect(report.ownershipAndInterfaces.register).toHaveLength(9);
    expect(report.ownershipAndInterfaces).toMatchObject({
      acceptedCanonicalOwnerCount: 0,
      acceptedInterfaceContractCount: 0,
    });
    expect(report.ownershipAndInterfaces.register.every((item) => (
      item.canonicalOwnerId === null
        && item.acceptedInterfaceContractIds.length === 0
        && item.status === 'HOLD_OWNER_AND_INTERFACES_UNASSIGNED'
    ))).toBe(true);
  });

  it('reports only bounded planning PASSes and leaves D06/G02 on HOLD with zero work', () => {
    const report = readReport();
    expect(report.acceptanceCriteria.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'D06-AC-01', status: 'PASS' },
      { id: 'D06-AC-02', status: 'PASS' },
      { id: 'D06-AC-03', status: 'HOLD' },
      { id: 'D06-AC-04', status: 'HOLD' },
      { id: 'D06-AC-05', status: 'HOLD' },
      { id: 'D06-AC-06', status: 'HOLD' },
      { id: 'D06-AC-07', status: 'HOLD' },
      { id: 'D06-AC-08', status: 'HOLD' },
      { id: 'D06-AC-09', status: 'HOLD' },
      { id: 'D06-AC-10', status: 'HOLD' },
      { id: 'D06-AC-11', status: 'HOLD' },
    ]);
    expect(report.acceptanceCriteria.filter(({ status }) => status === 'HOLD').every((item) => (
      item.passWhenAll.length > 0 && item.holdReason !== null
    ))).toBe(true);
    expect(report.disposition).toMatchObject({
      passCount: 2,
      holdCount: 9,
      ownerPlanningBasisSelected: true,
      ownerTechnicalAcceptanceRecorded: false,
      d06Resolved: false,
      r00G02Passed: false,
      sealed: true,
      commissioned: false,
      operationCellCount: 0,
      materialCellCount: 0,
      worldEditAuthorized: false,
    });
    const serialized = fs.readFileSync(COMMITTED_JSON, 'utf8');
    expect(serialized).not.toContain('"worldEditAuthorized": true');
    expect(serialized).not.toContain('"commissioned": true');
    expect(serialized).not.toContain('"technicalAcceptanceRecorded": true');
  });
});
