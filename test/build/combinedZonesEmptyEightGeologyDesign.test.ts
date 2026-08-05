import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T16:18:57Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-empty-eight-'));
const regeneratedJson = path.join(tempDir, 'design.json');
const regeneratedMarkdown = path.join(tempDir, 'design.md');

interface CellSet {
  bounds: Record<string, number> | null;
  cellCount: number;
  cellSetSha256: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    offlineOnly: boolean;
    worldEditAuthorized: boolean;
    constructionPackageExists: boolean;
    operationCellCount: number;
    operationsEmitted: boolean;
  };
  d06: {
    status: string;
    exactDesignFrozen: boolean;
    commissionedLifeSafetySystem: boolean;
    shell: { bounds: Record<string, number>; railY: number };
    architecturalLanguage: { palette: Array<{ id: string; block: string }> };
    discoverySequence: {
      exactCueCells: CellSet;
      sourceGuards: null;
      physicalCueAuthorized: boolean;
    };
    platforms: Array<{
      assignedTrack: number;
      trackCenterlineZ: number;
      surface: CellSet;
      barrier: { closedBarrierDesign: CellSet; gatesOperationallyAuthorized: boolean };
    }>;
    concourseAndRetail: {
      retailShellCount: number;
      retailShells: Array<{ id: string; bounds: Record<string, number>; state: string }>;
      tenantFitOutAuthorized: boolean;
    };
    lifeSafety: {
      designBasisOnlyNotCodeCompliance: boolean;
      internalCoreReservationsDisjoint: boolean;
      minimumClearHorizontalCellsBetweenCoreEnvelopes: number;
      egressCores: Array<{
        anchor: { x: number; y: null; z: number };
        surfaceEndpoint: null;
        commissionedEgress: boolean;
        commissionedAccessibleRoute: boolean;
      }>;
      smokeBoundaries: Array<{ boundaryPlane: CellSet; smokeDoorMechanismAuthorized: boolean }>;
      ventilation: { plantAndDuctReservations: unknown[]; exteriorOutletCount: number; smokeModelValidated: boolean };
      platformBarriers: { exactBarrierCount: number; gateMechanismSelected: boolean; commissioned: boolean };
      drainage: { trackDrainAndSumpReservations: unknown[]; externalDischargePoint: null; commissioned: boolean };
      fireAndServiceAccess: { externalConnection: null; emergencyServiceAcceptance: boolean };
    };
    futureInterfaces: {
      count: number;
      allSealCellSetsDisjoint: boolean;
      everyInterfaceSeparatelyOwned: boolean;
      interfaces: Array<{
        owner: string;
        assignedTrack: number;
        sealDesign: CellSet;
        consumerOwner: null;
        sourceGuard: null;
        rollbackOperation: null;
        openingAuthorized: boolean;
      }>;
    };
    designClosureHoldGates: string[];
    releaseLifecycleValidation: {
      gateRange: string;
      resolvesD06: boolean;
      requirements: string[];
    };
  };
  d07: {
    status: string;
    geologicalWordingStatus: string;
    resolution: {
      approvedPlaquePanels: Array<{ order: number; text: string }>;
      forbiddenClaims: string[];
      sources: Array<{ authority: string; url: string; supports: string[] }>;
    };
    c2Portal: {
      status: string;
      activeMechanism: null;
      landingCoordinates: unknown[];
      mechanismBlocks: unknown[];
      commands: unknown[];
      targetCellCount: number;
      operationsEmitted: boolean;
    };
  };
  gateDecision: {
    d06InternalDesignFreezePassed: boolean;
    d06CompleteLifeSafetyGatePassed: boolean;
    d07WordingGatePassed: boolean;
    c2ActivationGatePassed: boolean;
    phase1Exit: string;
    advanceToPhysicalPhase: boolean;
    liveBuildMayProceed: boolean;
  };
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_empty_eight_geology_design.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones Empty Eight and geology design', () => {
  it('regenerates the committed machine-readable and Markdown records exactly', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('freezes the exact internal architectural schedule without emitting operations', () => {
    const report = readReport();

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-empty-eight-geology-design',
      status: 'D06_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_HOLD_D07_WORDING_RESOLVED_C2_OMITTED',
      authority: {
        offlineOnly: true,
        worldEditAuthorized: false,
        constructionPackageExists: false,
        operationCellCount: 0,
        operationsEmitted: false,
      },
      d06: {
        status: 'PARTIAL_RESOLUTION_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_INTERFACES_HOLD',
        exactDesignFrozen: true,
        commissionedLifeSafetySystem: false,
        shell: {
          bounds: { minX: 1632, maxX: 1872, minY: 38, maxY: 54, minZ: 40, maxZ: 160 },
          railY: 40,
        },
      },
    });

    expect(report.d06.architecturalLanguage.palette).toHaveLength(14);
    expect(report.d06.discoverySequence.exactCueCells).toMatchObject({ cellCount: 5 });
    expect(report.d06.discoverySequence.sourceGuards).toBeNull();
    expect(report.d06.discoverySequence.physicalCueAuthorized).toBe(false);
    expect(report.d06.platforms).toHaveLength(8);
    expect(report.d06.platforms.map(({ trackCenterlineZ }) => trackCenterlineZ)).toEqual([
      54, 67, 80, 93, 106, 119, 132, 145,
    ]);
    expect(report.d06.platforms.every(({ surface }) => surface.cellCount === 707)).toBe(true);
    expect(report.d06.platforms.every(({ barrier }) => (
      barrier.closedBarrierDesign.cellCount === 178 && !barrier.gatesOperationallyAuthorized
    ))).toBe(true);
  });

  it('schedules exactly 24 distinct capped tenant shells', () => {
    const retail = readReport().d06.concourseAndRetail;

    expect(retail).toMatchObject({ retailShellCount: 24, tenantFitOutAuthorized: false });
    expect(retail.retailShells).toHaveLength(24);
    expect(new Set(retail.retailShells.map(({ id }) => id)).size).toBe(24);
    expect(retail.retailShells.filter(({ id }) => id.startsWith('EE-R-N'))).toHaveLength(12);
    expect(retail.retailShells.filter(({ id }) => id.startsWith('EE-R-S'))).toHaveLength(12);
    expect(retail.retailShells.every(({ state }) => state === 'CAPPED_EMPTY_FUTURE_TENANT_SHELL')).toBe(true);
  });

  it('freezes internal safety reservations but fails closed at every external endpoint', () => {
    const lifeSafety = readReport().d06.lifeSafety;

    expect(lifeSafety).toMatchObject({
      designBasisOnlyNotCodeCompliance: true,
      internalCoreReservationsDisjoint: true,
      minimumClearHorizontalCellsBetweenCoreEnvelopes: 193,
      ventilation: {
        exteriorOutletCount: 0,
        smokeModelValidated: false,
      },
      platformBarriers: {
        exactBarrierCount: 8,
        gateMechanismSelected: false,
        commissioned: false,
      },
      drainage: {
        externalDischargePoint: null,
        commissioned: false,
      },
      fireAndServiceAccess: {
        externalConnection: null,
        emergencyServiceAcceptance: false,
      },
    });
    expect(lifeSafety.egressCores).toHaveLength(2);
    expect(lifeSafety.egressCores.every(({ anchor, surfaceEndpoint }) => (
      anchor.y === null && surfaceEndpoint === null
    ))).toBe(true);
    expect(lifeSafety.egressCores.every(({ commissionedEgress, commissionedAccessibleRoute }) => (
      !commissionedEgress && !commissionedAccessibleRoute
    ))).toBe(true);
    expect(lifeSafety.smokeBoundaries).toHaveLength(2);
    expect(lifeSafety.smokeBoundaries.every(({ smokeDoorMechanismAuthorized }) => !smokeDoorMechanismAuthorized)).toBe(true);
    expect(lifeSafety.ventilation.plantAndDuctReservations).toHaveLength(4);
    expect(lifeSafety.drainage.trackDrainAndSumpReservations).toHaveLength(8);
  });

  it('defines eight disjoint separately owned seals and opens none', () => {
    const future = readReport().d06.futureInterfaces;

    expect(future).toMatchObject({
      count: 8,
      allSealCellSetsDisjoint: true,
      everyInterfaceSeparatelyOwned: true,
    });
    expect(future.interfaces).toHaveLength(8);
    expect(new Set(future.interfaces.map(({ owner }) => owner)).size).toBe(8);
    expect(future.interfaces.map(({ assignedTrack }) => assignedTrack)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(future.interfaces.every(({ sealDesign }) => sealDesign.cellCount === 25)).toBe(true);
    expect(future.interfaces.every((contract) => (
      contract.consumerOwner === null
      && contract.sourceGuard === null
      && contract.rollbackOperation === null
      && !contract.openingAuthorized
    ))).toBe(true);
  });

  it('resolves factual analogue wording from official primary technical sources', () => {
    const d07 = readReport().d07;
    const plaque = d07.resolution.approvedPlaquePanels.map(({ text }) => text).join(' ');

    expect(d07).toMatchObject({
      status: 'RESOLVED_WORDING_ONLY_PORTAL_OMITTED',
      geologicalWordingStatus: 'RESOLVED_AUTHORITATIVE_SOURCE_BACKED_ARCHITECTURAL_COMPOSITE',
    });
    expect(d07.resolution.approvedPlaquePanels).toHaveLength(6);
    expect(plaque).toContain('Pikes Peak Granite analogue');
    expect(plaque).toContain('Bethany Falls Limestone analogue');
    expect(plaque).toContain('Architectural composite');
    expect(plaque).not.toMatch(/270 Ma|thrust|overthrust|laccolith/i);
    expect(d07.resolution.forbiddenClaims.join(' ')).toMatch(/270 million|thrust|laccolith/i);
    expect(d07.resolution.sources).toHaveLength(4);
    expect(d07.resolution.sources.every(({ authority, url, supports }) => (
      /U\.S\. Geological Survey|Kansas Geological Survey/.test(authority)
      && /^https:\/\/(www\.)?(usgs\.gov|pubs\.usgs\.gov|kgs\.ku\.edu)\//.test(url)
      && supports.length > 0
    ))).toBe(true);
  });

  it('omits C2 completely and keeps the physical phase gate closed', () => {
    const report = readReport();

    expect(report.d07.c2Portal).toMatchObject({
      status: 'NO_ACTIVE_C2_PORTAL',
      activeMechanism: null,
      landingCoordinates: [],
      mechanismBlocks: [],
      commands: [],
      targetCellCount: 0,
      operationsEmitted: false,
    });
    expect(report.gateDecision).toEqual(expect.objectContaining({
      d06InternalDesignFreezePassed: true,
      d06CompleteLifeSafetyGatePassed: false,
      d07WordingGatePassed: true,
      c2ActivationGatePassed: false,
      phase1Exit: 'HOLD',
      advanceToPhysicalPhase: false,
      liveBuildMayProceed: false,
    }));
    expect(report.d06.designClosureHoldGates).toHaveLength(4);
    expect(report.d06.designClosureHoldGates.join(' ')).not.toMatch(
      /\b(operations?|source guards?|manifests?|preflights?|live[- ]entity|pilots?|rollbacks?|route[- ]qa|post[- ]state)\b/i,
    );
    expect(report.d06.releaseLifecycleValidation).toMatchObject({
      gateRange: 'G03-G19',
      resolvesD06: false,
    });
  });
});
