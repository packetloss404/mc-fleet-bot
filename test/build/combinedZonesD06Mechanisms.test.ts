import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-mechanisms.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-mechanisms.md',
);
const D05_CONTRACT_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d06-mechanisms-'));
const regeneratedJson = path.join(tempDir, 'mechanisms.json');
const regeneratedMarkdown = path.join(tempDir, 'mechanisms.md');

interface Manifest {
  sourcePath?: string;
  jsonPointer?: string;
  cellCount: number;
  bounds: Record<string, number> | null;
  coordinateSetSha256?: string;
  cellSetSha256?: string;
}

interface ReferenceValidation extends Manifest {
  logicalPath: string;
  sourcePath: string;
  jsonPointer: string;
  coordinateSetSha256: string;
  result: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  mechanismDevelopmentPayload: {
    acceptedPlanningIdentity: Record<string, unknown>;
    immutableSnapshotIdentity: {
      regionOnly: { sha256: string };
      crossSourceIdentityMatched: boolean;
      completeSameMomentSaveAvailable: boolean;
    };
    exactReservationReferenceContract: {
      referenceCount: number;
      passedReferenceCount: number;
      failedReferenceCount: number;
      allPassed: boolean;
      references: ReferenceValidation[];
    };
    protectedEgressAndLiftSystems: Array<{
      coreId: string;
      combinedProtectedCoreReservation: Manifest;
      protectedStairReservation: Manifest;
      accessibleLiftReservation: Manifest;
      exactExternalContinuationReference: {
        cellCount: number;
        protectedStairReservation: Manifest;
        accessibleLiftReservation: Manifest;
        d05Status: string;
      };
      candidateMechanismManifests: Record<string, null>;
      physicalOpeningAuthorized: boolean;
      commissionedEgress: boolean;
      commissionedAccessibleRoute: boolean;
    }>;
    ventSystems: Array<{
      ventId: string;
      exactRiserReservation: Manifest;
      currentSnapshotAudit: Record<string, number>;
      candidateMechanismManifests: Record<string, null>;
      exteriorOutletOpened: boolean;
      commissioned: boolean;
    }>;
    smokeAndBarrierSystems: {
      smokeBoundaries: Array<{
        retainedBoundaryPlane: Manifest;
        staticOpeningCaps: Manifest;
        completeFailClosedBoundary: Manifest;
        smokeDoorMechanism: null;
      }>;
      platformBarriers: Array<{
        retainedClosedBarrierReservation: Manifest;
        staticGateBayCap: Manifest;
        completeFailClosedBarrier: Manifest;
        poweredGateMechanism: null;
      }>;
      smokeOpeningStaticCapCellCount: number;
      platformGateStaticCapCellCount: number;
      physicalOpeningCount: number;
    };
    lightingAndPowerSystem: {
      exactFixtureReservations: Array<{ platformId: string; reservation: Manifest }>;
      exactFixtureReservationCount: number;
      fixtureBlock: string;
      circuitSlots: Array<{
        id: string;
        exactCircuitCellManifest: null;
        exactSourceManifest: null;
      }>;
      transferAndFailureLogic: null;
      commissioned: boolean;
    };
    cappedDrainageSystem: {
      localCaps: Array<{ id: string; cap: Manifest }>;
      exactCapUnion: Manifest;
      retainedUnconnectedHeaderReservation: Manifest;
      retainedExternalBoundaryCap: Manifest;
      candidateMechanismManifests: Record<string, null>;
      d02MinecraftDomainAcceptanceContract: Record<string, unknown>;
      d05ExternalContract: Record<string, unknown>;
      externalDischargePoint: null;
      commissioned: boolean;
    };
    fireServiceSystem: {
      selectedAlternativeId: string;
      internalSpineReservation: Manifest;
      internalTransferReservation: Manifest;
      normallyClosedSpineInterfaceCap: Manifest;
      surfaceCompoundReservation: Manifest;
      sealedSurfaceApproachInterface: Manifest;
      candidateMechanismManifests: Record<string, null>;
      commissioned: boolean;
    };
    b07WestTwoSystem: {
      candidateId: string;
      centerline: { pointCount: number };
      exactExcavationReservation: Manifest;
      exactInteractionUnion: Manifest;
      immutableSnapshotFacts: Record<string, number>;
      candidateMechanismManifests: Record<string, null>;
      waterTreatmentContract: Record<string, unknown>;
      physicalOpeningAuthorized: boolean;
      commissioned: boolean;
    };
    controlOwnershipInterfaceContract: {
      register: Array<{
        canonicalOwnerId: null;
        acceptedInterfaceContractIds: string[];
      }>;
      acceptedCanonicalOwnerCount: number;
      acceptedInterfaceContractCount: number;
      acceptedControlManifestCount: number;
      acceptedFailureLogicCount: number;
    };
    completeSaveDependency: Record<string, unknown>;
    availableD02D05Contracts: Record<string, unknown> & {
      d05MechanismDependency: { id: string; status: string };
    };
    commissioningTestRegister: Array<{
      id: string;
      classification: string;
      prerequisites: string[];
      failureStimulus: string;
      requiredResult: string;
      evidenceRequired: string;
      operation: null;
      currentStatus: string;
    }>;
    acceptanceMatrix: Array<{
      id: string;
      result: 'PASS' | 'HOLD';
      scope: string;
    }>;
  };
  mechanismDevelopmentPayloadSha256: string;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, unknown>;
}

function sha256(data: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readReport(filename = JSON_PATH): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function resolveJsonPointer(document: unknown, pointer: string): unknown {
  return pointer.slice(1).split('/').reduce<unknown>((current, encodedPart) => {
    const part = encodedPart.replace(/~1/g, '/').replace(/~0/g, '~');
    expect(current).toBeTypeOf('object');
    expect(current).not.toBeNull();
    return (current as Record<string, unknown>)[part];
  }, document);
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d06_mechanisms.mjs',
      '--generated-at', '2026-08-05T02:05:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D06 candidate mechanism/reservation contract', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds all ten direct sources, the complete payload, and one immutable region identity', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'ownerAcceptance',
      'd06OwnerPacket',
      'd06LifeSafety',
      'd06Egress',
      'connectorGeometry',
      'emptyEight',
      'd02TechnicalDesign',
      'd05FutureStateContract',
      'd05OwnerPacket',
      'immutableRegionEvidence',
    ]);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(fs.readFileSync(filename)));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
    expect(report.mechanismDevelopmentPayloadSha256).toBe(sha256(
      `${JSON.stringify(report.mechanismDevelopmentPayload)}\n`,
    ));
    expect(report.mechanismDevelopmentPayload.immutableSnapshotIdentity).toEqual({
      regionOnly: expect.objectContaining({
        sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      }),
      crossSourceIdentityMatched: true,
      completeSameMomentSaveAvailable: false,
    });
    expect(report.mechanismDevelopmentPayload.acceptedPlanningIdentity).toMatchObject({
      d06AcceptanceBasisSha256:
        'c827566760f439ef5e4794dcb405f8a89bfe8f03370f033d49590f7039510d57',
      planningPolicyAccepted: true,
      technicalHoldPassedCount: 0,
      independentTechnicalAcceptanceRecorded: false,
      completeTechnicalIdentityOwnerAcceptanceRecorded: false,
    });
  });

  it('reproduces every one of the 73 exact source manifest references', () => {
    const contract = readReport().mechanismDevelopmentPayload
      .exactReservationReferenceContract;
    expect(contract).toMatchObject({
      referenceCount: 73,
      passedReferenceCount: 73,
      failedReferenceCount: 0,
      allPassed: true,
    });
    expect(new Set(contract.references.map(({ logicalPath }) => logicalPath)).size).toBe(73);
    expect(new Set(contract.references.map(({ sourcePath }) => sourcePath))).toEqual(new Set([
      'masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
      'masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
    ]));
    for (const reference of contract.references) {
      const source = JSON.parse(
        fs.readFileSync(path.join(ROOT, reference.sourcePath), 'utf8'),
      ) as unknown;
      const sourceManifest = resolveJsonPointer(source, reference.jsonPointer) as Manifest;
      expect(sourceManifest.cellCount, reference.logicalPath).toBe(reference.cellCount);
      expect(sourceManifest.bounds ?? null, reference.logicalPath).toEqual(reference.bounds);
      expect(
        sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256,
        reference.logicalPath,
      ).toBe(reference.coordinateSetSha256);
      expect(reference.result).toBe('PASS_EXACT_REFERENCE_REPRODUCED');
    }
  });

  it('separates exact stairs, lifts, vents, smoke boundaries, barriers, and fixtures from absent mechanisms', () => {
    const payload = readReport().mechanismDevelopmentPayload;
    expect(payload.protectedEgressAndLiftSystems.map((system) => ({
      coreId: system.coreId,
      core: system.combinedProtectedCoreReservation.cellCount,
      stair: system.protectedStairReservation.cellCount,
      lift: system.accessibleLiftReservation.cellCount,
      external: system.exactExternalContinuationReference.cellCount,
      externalStair: system.exactExternalContinuationReference.protectedStairReservation.cellCount,
      externalLift: system.exactExternalContinuationReference.accessibleLiftReservation.cellCount,
    }))).toEqual([
      { coreId: 'EG-A', core: 1911, stair: 819, lift: 351, external: 1274, externalStair: 546, externalLift: 234 },
      { coreId: 'EG-B', core: 1470, stair: 630, lift: 270, external: 833, externalStair: 357, externalLift: 153 },
    ]);
    for (const system of payload.protectedEgressAndLiftSystems) {
      expect(Object.values(system.candidateMechanismManifests)).toEqual([null, null, null, null]);
      expect(system.exactExternalContinuationReference.d05Status)
        .toBe('REFERENCE_RESERVATION_NOT_CONSTRUCTION_OR_HYDROLOGY_OWNERSHIP');
      expect(system.physicalOpeningAuthorized).toBe(false);
      expect(system.commissionedEgress).toBe(false);
      expect(system.commissionedAccessibleRoute).toBe(false);
    }
    expect(payload.ventSystems.map(({ exactRiserReservation }) => (
      exactRiserReservation.cellCount
    ))).toEqual([279, 432, 99, 90]);
    expect(payload.ventSystems.every((system) => (
      Object.values(system.candidateMechanismManifests).every((value) => value === null)
      && system.exteriorOutletOpened === false
      && system.commissioned === false
    ))).toBe(true);
    expect(payload.smokeAndBarrierSystems).toMatchObject({
      smokeOpeningStaticCapCellCount: 72,
      platformGateStaticCapCellCount: 192,
      physicalOpeningCount: 0,
    });
    expect(payload.smokeAndBarrierSystems.smokeBoundaries).toHaveLength(2);
    expect(payload.smokeAndBarrierSystems.platformBarriers).toHaveLength(8);
    expect(payload.smokeAndBarrierSystems.smokeBoundaries.every((system) => (
      system.smokeDoorMechanism === null
      && system.completeFailClosedBoundary.cellCount === 1372
    ))).toBe(true);
    expect(payload.smokeAndBarrierSystems.platformBarriers.every((system) => (
      system.poweredGateMechanism === null
      && system.completeFailClosedBarrier.cellCount === 202
    ))).toBe(true);
    expect(payload.lightingAndPowerSystem).toMatchObject({
      exactFixtureReservationCount: 56,
      fixtureBlock: 'minecraft:sea_lantern',
      transferAndFailureLogic: null,
      commissioned: false,
    });
    expect(payload.lightingAndPowerSystem.circuitSlots.map(({ id }) => id)).toEqual([
      'D06-CIRCUIT-NORMAL',
      'D06-CIRCUIT-EMERGENCY-A',
      'D06-CIRCUIT-EMERGENCY-B',
    ]);
    expect(payload.lightingAndPowerSystem.circuitSlots.every((slot) => (
      slot.exactCircuitCellManifest === null && slot.exactSourceManifest === null
    ))).toBe(true);
  });

  it('keeps eight drainage caps, fire access, and B07 water exact and fail-closed', () => {
    const payload = readReport().mechanismDevelopmentPayload;
    expect(payload.cappedDrainageSystem).toMatchObject({
      exactCapUnion: { cellCount: 24 },
      retainedUnconnectedHeaderReservation: { cellCount: 9 },
      retainedExternalBoundaryCap: { cellCount: 9 },
      externalDischargePoint: null,
      commissioned: false,
      d02MinecraftDomainAcceptanceContract: {
        acceptedFutureFluidCellCount: 0,
        acceptedReceiverCount: 0,
        dischargeExceptionCount: 0,
      },
      d05ExternalContract: {
        futureStateInputsReady: false,
        futureCellCount: 0,
        hydrologyExpertInputsComplete: 'HOLD',
        d05OwnerTechnicalInputsComplete: false,
        exactReceiverAccepted: false,
      },
    });
    expect(payload.cappedDrainageSystem.localCaps).toHaveLength(8);
    expect(payload.cappedDrainageSystem.localCaps.every(({ cap }) => cap.cellCount === 3))
      .toBe(true);
    expect(Object.values(payload.cappedDrainageSystem.candidateMechanismManifests))
      .toEqual([null, null, null]);
    expect(payload.fireServiceSystem).toMatchObject({
      selectedAlternativeId: 'FIRE-EG-B',
      internalSpineReservation: { cellCount: 3025 },
      internalTransferReservation: { cellCount: 0 },
      normallyClosedSpineInterfaceCap: { cellCount: 35 },
      surfaceCompoundReservation: { cellCount: 49 },
      sealedSurfaceApproachInterface: { cellCount: 21 },
      commissioned: false,
    });
    expect(Object.values(payload.fireServiceSystem.candidateMechanismManifests))
      .toEqual([null, null, null]);
    expect(payload.b07WestTwoSystem).toMatchObject({
      candidateId: 'B07-C-WEST-2',
      centerline: { pointCount: 163 },
      exactExcavationReservation: { cellCount: 8134 },
      exactInteractionUnion: { cellCount: 13608 },
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
      waterTreatmentContract: {
        exactSourceToFutureDispositionManifest: null,
        acceptedReceiverId: null,
        dischargeExceptionCellCount: 0,
      },
      physicalOpeningAuthorized: false,
      commissioned: false,
    });
    expect(Object.values(payload.b07WestTwoSystem.candidateMechanismManifests))
      .toEqual([null, null, null, null, null]);
    expect(payload.availableD02D05Contracts.d05MechanismDependency).toMatchObject({
      id: 'DEP-D06-MECHANISM-CELL-SETS',
      status: 'HOLD',
    });
    const d05 = JSON.parse(fs.readFileSync(D05_CONTRACT_PATH, 'utf8')) as {
      readinessDisposition: { futureCellCount: number; constructionCellCount: number };
    };
    expect(d05.readinessDisposition).toMatchObject({
      futureCellCount: 0,
      constructionCellCount: 0,
    });
  });

  it('freezes 29 non-executable commissioning contracts and retains every closure HOLD', () => {
    const report = readReport();
    const payload = report.mechanismDevelopmentPayload;
    expect(payload.commissioningTestRegister).toHaveLength(29);
    expect(new Set(payload.commissioningTestRegister.map(({ id }) => id)).size).toBe(29);
    for (const test of payload.commissioningTestRegister) {
      expect(test.classification).toBe('OFFLINE_COMMISSIONING_CONTRACT_ONLY');
      expect(test.prerequisites).toHaveLength(4);
      expect(test.failureStimulus.length).toBeGreaterThan(20);
      expect(test.requiredResult.length).toBeGreaterThan(20);
      expect(test.evidenceRequired.length).toBeGreaterThan(20);
      expect(test.operation).toBeNull();
      expect(test.currentStatus).toBe('HOLD_NOT_EXECUTABLE_NO_COMMISSIONING_EVIDENCE');
    }
    expect(payload.controlOwnershipInterfaceContract).toMatchObject({
      acceptedCanonicalOwnerCount: 0,
      acceptedInterfaceContractCount: 0,
      acceptedControlManifestCount: 0,
      acceptedFailureLogicCount: 0,
    });
    expect(payload.controlOwnershipInterfaceContract.register).toHaveLength(9);
    expect(payload.controlOwnershipInterfaceContract.register.every((slot) => (
      slot.canonicalOwnerId === null && slot.acceptedInterfaceContractIds.length === 0
    ))).toBe(true);
    expect(payload.acceptanceMatrix).toHaveLength(25);
    expect(payload.acceptanceMatrix.filter(({ result }) => result === 'PASS')).toHaveLength(10);
    expect(payload.acceptanceMatrix.filter(({ result }) => result === 'HOLD')).toHaveLength(15);
    expect(payload.acceptanceMatrix.slice(10).every(({ result }) => result === 'HOLD'))
      .toBe(true);
    expect(payload.completeSaveDependency).toMatchObject({
      auditedCopiedSaveCandidateCount: 56,
      completeCopiedSaveCandidateCount: 0,
      currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_COPIED_SAVE',
    });
  });

  it('cannot authorize mechanisms, openings, commissioning, operations, or compliance', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d06-mechanisms',
      status: 'PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD',
      executable: false,
      summary: {
        acceptanceCriterionCount: 25,
        passCount: 10,
        holdCount: 15,
        exactManifestReferenceCount: 73,
        protectedEgressAndLiftSystemCount: 2,
        cappedVentSystemCount: 4,
        smokeBoundaryCount: 2,
        platformBarrierCount: 8,
        exactFixtureReservationCount: 56,
        circuitSlotCount: 3,
        exactCircuitManifestCount: 0,
        localDrainageCapCount: 8,
        b07ExcavationWaterCellCount: 38,
        acceptedMechanismManifestCount: 0,
        physicalOpeningCount: 0,
        acceptedReceiverCount: 0,
        commissioningTestContractCount: 29,
        passedCommissioningTestCount: 0,
        completeCopiedSaveCandidateCount: 0,
        acceptedOwnerCount: 0,
        acceptedInterfaceContractCount: 0,
        operationCellCount: 0,
        materialCellCount: 0,
        d06Resolved: false,
        r00G02Passed: false,
        independentTechnicalAcceptanceClaimed: false,
        realWorldComplianceClaimed: false,
      },
    });
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      databasesOpened: [],
      operations: [],
      operationCellCount: 0,
      materialCells: [],
      materialCellCount: 0,
      futureCellsEmitted: [],
      futureCellCount: 0,
      mechanismCellsEmitted: [],
      mechanismCellCount: 0,
      receiverInvented: false,
      outfallInvented: false,
      dischargeInvented: false,
      capOpeningAuthorized: false,
      commissioningAuthorized: false,
      operationsAuthorized: false,
      constructionAuthorized: false,
      physicalBuildAuthorized: false,
      worldEditAuthorized: false,
      realWorldCodeOrLifeSafetyComplianceClaimed: false,
    });
  });
});
