import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')) as T;
}

function sha256File(relativePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

function hashRegionDirectory(relativePath: string): {
  sha256: string;
  regionFileCount: number;
  bytes: number;
} {
  const directory = path.join(ROOT, relativePath);
  const filenames = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  let bytes = 0;

  for (const filename of filenames) {
    const buffer = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(buffer);
    hash.update('\0');
    bytes += buffer.length;
  }

  return {
    sha256: hash.digest('hex'),
    regionFileCount: filenames.length,
    bytes,
  };
}

interface ArtifactBinding {
  path: string;
  sha256: string;
}

interface SnapshotBinding {
  path: string;
  declaredSha256: string;
  observedSha256: string;
  regionFileCount: number;
  bytes: number;
  integrity: string;
  constructionUse?: string;
  contentsPresent?: string[];
  contentsAbsent?: string[];
}

interface SiteGateAudit {
  schemaVersion: number;
  status: string;
  worldEditAuthorized: boolean;
  scope: {
    planToDevelop: string;
    operationsProhibitedAndNotPerformed: string[];
  };
  inputs: {
    masterplan: ArtifactBinding;
    coordinateRegistry: ArtifactBinding;
    authorityReconciliation: ArtifactBinding;
    phase0Evidence: ArtifactBinding;
    corridorClearance: ArtifactBinding;
    durableWorldCatalog: ArtifactBinding & {
      openedReadOnly: boolean;
      featureCount: number;
      completeFeatureCount: number;
      removedFeatureCount: number;
      featureUnion: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
      };
    };
  };
  snapshotIntegrity: {
    acceptedConstructionBaseline: SnapshotBinding;
    phase0Pre: SnapshotBinding;
    phase0Post: SnapshotBinding;
  };
  subsequentRemediationEvidence: Array<ArtifactBinding & {
    status: string;
    effect: string;
  }>;
  observedEvidence: {
    phase0Siting: {
      status: string;
      allElevenSitingGates: boolean;
      atlasFullChunks: number;
      reserveFullChunks: number;
    };
    surfaceAndFluidCensus: {
      reserve: {
        columns: number;
        waterColumns: number;
        lavaColumns: number;
      };
      emptyEight: {
        columns: number;
        waterColumns: number;
        lavaColumns: number;
        coldBiomeColumns: number;
        columnsMeetingEightBlockCover: number;
      };
    };
    generatedStructures: {
      atlasStructureStarts: number;
      reservePlanIntersections: number;
      gatewayApproachPlanIntersections: number;
      mountainPlanIntersections: number;
      urbanCorePlanIntersections: number;
      emptyEightPlanIntersections: number;
      emptyEightVerticalShellConflicts: number;
      reserveIntersectionsByType: Record<string, number>;
    };
    protectedSurfaceRelics: {
      status: string;
      count: number;
      exactDefaultDenyCoreCellSetsFrozen: boolean;
      coreCoordinateSetSha256ByRelic: Record<string, string>;
      exactBufferCellSetsFrozen: boolean;
      currentBlockPreservationVerified: boolean;
      observationAccessAuthorized: boolean;
    };
    catalogGeometry: {
      status: string;
      surfaceFeaturesIntersectingC1Reservation: number;
      eastReserveCatalogIntersection: boolean;
      catalogEastMaxX: number;
      reserveMinX: number;
      separationBlocks: number;
    };
  };
  gates: Array<{
    id: string;
    status: 'PASS' | 'HOLD';
    scope?: string;
    basis: string;
  }>;
  requiredEvidence: Array<{
    order: number;
    phase: string;
    artifact: string;
    requirement: string;
  }>;
  decision: {
    phase0SiteSelection: string;
    phase1DetailedDesignMayProceedOffline: boolean;
    phase1Exit: string;
    constructionReadiness: string;
    liveBuildMayProceed: boolean;
  };
}

interface Phase0Evidence {
  status: string;
  chunkCoverage: {
    atlas: Record<string, number>;
    reserve: Record<string, number>;
  };
  areaCensuses: {
    revisedCombinedZonesReserve: {
      columns: number;
      waterColumns: number;
      lavaColumns: number;
    };
    gatewayExpansionTerminalFootprint: {
      columns: number;
      waterColumns: number;
      lavaColumns: number;
      coldBiomeColumns: number;
      columnsMeetingEightBlockSolidCover: number;
    };
  };
  generatedStructureStarts: Array<{
    id: string;
    intersectsReserve: boolean;
    intersectsZ02: boolean;
    intersectsTerminalFootprint: boolean;
    intersectsMountainFootprint: boolean;
    intersectsUrbanCore: boolean;
  }>;
  protectedSurfaceRelics: unknown[];
  terminalVerticalStructureConflicts: unknown[];
  sitingGates: Record<string, boolean>;
}

describe('Combined Zones Phase 1 site-gate audit', () => {
  const audit = readJson<SiteGateAudit>(
    'masterplans/05-combined-zones/phase1-site-gate-audit.json',
  );
  const phase0 = readJson<Phase0Evidence>(
    'masterplans/05-combined-zones/phase0-survey-evidence.json',
  );

  it('binds every source artifact and immutable region identity exactly', () => {
    const artifactBindings = [
      audit.inputs.masterplan,
      audit.inputs.coordinateRegistry,
      audit.inputs.authorityReconciliation,
      audit.inputs.phase0Evidence,
      audit.inputs.corridorClearance,
      audit.inputs.durableWorldCatalog,
    ];

    for (const binding of artifactBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
    }
    expect(audit.subsequentRemediationEvidence).toHaveLength(7);
    for (const binding of audit.subsequentRemediationEvidence) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
    }

    for (const snapshot of [
      audit.snapshotIntegrity.acceptedConstructionBaseline,
      audit.snapshotIntegrity.phase0Pre,
      audit.snapshotIntegrity.phase0Post,
    ]) {
      const observed = hashRegionDirectory(snapshot.path);
      expect(snapshot.integrity).toBe('PASS');
      expect(snapshot.declaredSha256).toBe(snapshot.observedSha256);
      expect(observed).toEqual({
        sha256: snapshot.observedSha256,
        regionFileCount: snapshot.regionFileCount,
        bytes: snapshot.bytes,
      });
    }

    expect(audit.snapshotIntegrity.phase0Post.contentsPresent).toEqual(['region']);
    expect(audit.snapshotIntegrity.phase0Post.contentsAbsent).toEqual([
      'entities',
      'poi',
      'level.dat identity package',
    ]);
    expect(audit.snapshotIntegrity.phase0Post.constructionUse).toContain('HOLD');
  });

  it('matches the durable catalog without treating geometric separation as ownership', () => {
    const database = new Database(
      path.join(ROOT, audit.inputs.durableWorldCatalog.path),
      { readonly: true, fileMustExist: true },
    );

    try {
      const counts = database.prepare(`
        SELECT
          COUNT(*) AS featureCount,
          SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS completeFeatureCount,
          SUM(CASE WHEN status = 'removed' THEN 1 ELSE 0 END) AS removedFeatureCount,
          MIN(min_x) AS minX,
          MAX(max_x) AS maxX,
          MIN(min_z) AS minZ,
          MAX(max_z) AS maxZ
        FROM world_features
      `).get() as {
        featureCount: number;
        completeFeatureCount: number;
        removedFeatureCount: number;
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
      };

      expect(audit.inputs.durableWorldCatalog.openedReadOnly).toBe(true);
      expect(counts).toEqual({
        featureCount: audit.inputs.durableWorldCatalog.featureCount,
        completeFeatureCount: audit.inputs.durableWorldCatalog.completeFeatureCount,
        removedFeatureCount: audit.inputs.durableWorldCatalog.removedFeatureCount,
        ...audit.inputs.durableWorldCatalog.featureUnion,
      });
    } finally {
      database.close();
    }

    expect(audit.observedEvidence.catalogGeometry).toMatchObject({
      status: 'PASS_LIMITED_GEOMETRIC_SCOPE',
      surfaceFeaturesIntersectingC1Reservation: 0,
      eastReserveCatalogIntersection: false,
      catalogEastMaxX: 1300,
      reserveMinX: 1500,
      separationBlocks: 200,
    });
    expect(audit.gates.find((gate) => (
      gate.id === 'current-ownership-and-interface-contracts'
    ))?.status).toBe('HOLD');
  });

  it('recomputes terrain, fluid, structure, and relic counts from Phase 0', () => {
    const reserveStarts = phase0.generatedStructureStarts.filter(
      (structure) => structure.intersectsReserve,
    );
    const byType = Object.fromEntries([...new Set(
      reserveStarts.map((structure) => structure.id),
    )].sort().map((id) => [
      id,
      reserveStarts.filter((structure) => structure.id === id).length,
    ]));

    expect(phase0.status).toBe('PASS_REVISED_SITING_PHASE0');
    expect(Object.values(phase0.sitingGates)).toHaveLength(11);
    expect(Object.values(phase0.sitingGates).every(Boolean)).toBe(true);
    expect(audit.observedEvidence.phase0Siting).toMatchObject({
      status: 'PASS',
      allElevenSitingGates: true,
      atlasFullChunks: phase0.chunkCoverage.atlas['minecraft:full'],
      reserveFullChunks: phase0.chunkCoverage.reserve['minecraft:full'],
    });
    expect(audit.observedEvidence.surfaceAndFluidCensus.reserve).toMatchObject({
      columns: phase0.areaCensuses.revisedCombinedZonesReserve.columns,
      waterColumns: phase0.areaCensuses.revisedCombinedZonesReserve.waterColumns,
      lavaColumns: phase0.areaCensuses.revisedCombinedZonesReserve.lavaColumns,
    });
    expect(audit.observedEvidence.surfaceAndFluidCensus.emptyEight).toMatchObject({
      columns: phase0.areaCensuses.gatewayExpansionTerminalFootprint.columns,
      waterColumns: phase0.areaCensuses.gatewayExpansionTerminalFootprint.waterColumns,
      lavaColumns: phase0.areaCensuses.gatewayExpansionTerminalFootprint.lavaColumns,
      coldBiomeColumns: phase0.areaCensuses.gatewayExpansionTerminalFootprint.coldBiomeColumns,
      columnsMeetingEightBlockCover:
        phase0.areaCensuses.gatewayExpansionTerminalFootprint
          .columnsMeetingEightBlockSolidCover,
    });
    expect(audit.observedEvidence.generatedStructures).toMatchObject({
      atlasStructureStarts: phase0.generatedStructureStarts.length,
      reservePlanIntersections: reserveStarts.length,
      gatewayApproachPlanIntersections: phase0.generatedStructureStarts.filter(
        (structure) => structure.intersectsZ02,
      ).length,
      mountainPlanIntersections: phase0.generatedStructureStarts.filter(
        (structure) => structure.intersectsMountainFootprint,
      ).length,
      urbanCorePlanIntersections: phase0.generatedStructureStarts.filter(
        (structure) => structure.intersectsUrbanCore,
      ).length,
      emptyEightPlanIntersections: phase0.generatedStructureStarts.filter(
        (structure) => structure.intersectsTerminalFootprint,
      ).length,
      emptyEightVerticalShellConflicts:
        phase0.terminalVerticalStructureConflicts.length,
      reserveIntersectionsByType: byType,
    });
    expect(audit.observedEvidence.protectedSurfaceRelics).toMatchObject({
      status: 'PARTIAL_PASS_ZERO_MARGIN_CORES_FROZEN_DEFAULT_DENY',
      count: phase0.protectedSurfaceRelics.length,
      exactDefaultDenyCoreCellSetsFrozen: true,
      exactBufferCellSetsFrozen: false,
      currentBlockPreservationVerified: false,
      observationAccessAuthorized: false,
    });
    expect(Object.values(
      audit.observedEvidence.protectedSurfaceRelics.coreCoordinateSetSha256ByRelic,
    )).toHaveLength(3);
  });

  it('fails closed on every unproven Phase 1 exit requirement', () => {
    const statuses = Object.fromEntries(
      audit.gates.map((gate) => [gate.id, gate.status]),
    );

    expect(audit.schemaVersion).toBe(1);
    expect(audit.status).toBe('HOLD_PHASE1_EXIT_NOT_SATISFIED');
    expect(audit.worldEditAuthorized).toBe(false);
    expect(audit.scope.planToDevelop).toBe(
      'masterplans/05-combined-zones/MASTERPLAN.md',
    );
    expect(statuses).toEqual({
      'phase0-terrain-siting': 'PASS',
      'archival-artifact-integrity': 'PASS',
      'catalog-geometric-separation': 'PASS',
      'fresh-release-source-identity': 'HOLD',
      'hydrology-and-three-dimensional-fluids': 'HOLD',
      'generated-and-protected-structure-clearance': 'HOLD',
      'current-ownership-and-interface-contracts': 'HOLD',
      'entity-clearance': 'HOLD',
      'civil-vertical-and-life-safety-design': 'HOLD',
      'exact-source-guards-and-rollback': 'HOLD',
      'bounded-bidirectional-pilot': 'HOLD',
      'phase1-exit': 'HOLD',
    });
    expect(audit.requiredEvidence.map((item) => item.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(audit.decision).toMatchObject({
      phase0SiteSelection: 'PASS',
      phase1DetailedDesignMayProceedOffline: true,
      phase1Exit: 'HOLD',
      constructionReadiness: 'HOLD',
      liveBuildMayProceed: false,
    });
    expect(audit.scope.operationsProhibitedAndNotPerformed).toContain('RCON');
    expect(audit.scope.operationsProhibitedAndNotPerformed).toContain(
      'live world mutation',
    );
  });
});
