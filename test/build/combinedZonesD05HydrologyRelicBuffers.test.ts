import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-'));
const regeneratedJson = path.join(tempDir, 'd05.json');
const regeneratedMarkdown = path.join(tempDir, 'd05.md');

interface CellSet {
  cellCount: number;
  coordinateSetSha256: string;
  blockStateSetSha256: string;
}

interface ComponentFamily {
  componentCount: number;
  manifestSha256: string;
  components: Array<{ cellCount: number }>;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  constructionOwnershipAuthorized: boolean;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  materialCellCount: number;
  sourceBindings: Record<string, {
    path: string;
    sha256: string;
    regionFileCount?: number;
  }>;
  scope: {
    mountainCoordinationVolume: {
      bounds: Record<string, number>;
      dimensions: Record<string, number>;
      cellCount: number;
      constructionOwnership: boolean;
    };
    fullHeightHydrologySurveyPrism: {
      bounds: Record<string, number>;
      dimensions: Record<string, number>;
      cellCount: number;
      constructionOwnership: boolean;
    };
  };
  immutableThreeDimensionalCensus: {
    status: string;
    families: Record<'water' | 'lava' | 'frozen' | 'snow', CellSet>;
    waterComponents: ComponentFamily;
    lavaComponents: ComponentFamily;
  };
  protectedRelicBufferCandidates: Array<{
    relicKey: string;
    presentCellFinding: string;
    minimumAdjacencyBufferCandidate: CellSet & {
      status: string;
      positiveMarginBlocks: number;
      constructionOwnership: boolean;
      operationAuthorization: boolean;
    };
    exactReviewedBufferCellSet: null;
  }>;
  drainageCoordinationModel: {
    status: string;
    currentlyAssignedOwnerCount: number;
    constructionOwnershipFrozen: boolean;
    exactDefaultDenySets: Array<CellSet & {
      id: string;
      status: string;
      futureCanonicalOwner: null;
      constructionOwnership: boolean;
    }>;
    topographicRoutingCandidate: {
      status: string;
      columnCount: number;
      routesToBoundary: { columnCount: number };
      routesToInternalSink: { columnCount: number };
    };
  };
  d05Disposition: {
    status: string;
    passedSubgates: string[];
    holdSubgates: string[];
  };
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      '--expose-gc',
      '--max-old-space-size=4096',
      'scripts/audit_combined_zones_d05_hydrology_relic_buffers.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
  );
}, 180_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05 hydrology and protected-relic buffer design', () => {
  it('regenerates byte-identical JSON and Markdown from immutable evidence', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN))).toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-hydrology-relic-buffer-design',
      status: 'PARTIAL_PASS_EXACT_BASELINE_AND_BUFFER_CANDIDATES_D05_HOLD',
      constructionOwnershipAuthorized: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
    });
    for (const binding of Object.values(report.sourceBindings)) {
      if (binding.regionFileCount !== undefined) continue;
      expect(sha256File(path.join(ROOT, binding.path)), binding.path).toBe(binding.sha256);
    }
  });

  it('binds the full-height 3D census and exact connected-component manifests', () => {
    const report = readReport();
    expect(report.scope.mountainCoordinationVolume).toEqual(expect.objectContaining({
      bounds: { minX: 1648, maxX: 2447, minY: 72, maxY: 303, minZ: -1128, maxZ: -529 },
      dimensions: { x: 800, y: 232, z: 600 },
      cellCount: 111_360_000,
      constructionOwnership: false,
    }));
    expect(report.scope.fullHeightHydrologySurveyPrism).toEqual(expect.objectContaining({
      bounds: { minX: 1648, maxX: 2447, minY: -64, maxY: 319, minZ: -1128, maxZ: -529 },
      dimensions: { x: 800, y: 384, z: 600 },
      cellCount: 184_320_000,
      constructionOwnership: false,
    }));

    const census = report.immutableThreeDimensionalCensus;
    expect(census.status).toBe('PASS_EXACT_CURRENT_FULL_HEIGHT_SURVEY_PRISM_BASELINE');
    expect(census.families).toMatchObject({
      water: {
        cellCount: 1_929_621,
        coordinateSetSha256: '1c6e3d25121884eb4baba8da8f8713a014360643f78aa30686f8c9785127b04e',
        blockStateSetSha256: 'be8c186b10aaa898812eee4ce551b57eb129219b51c31adc642ba8ab1e28cfed',
      },
      lava: {
        cellCount: 85_088,
        coordinateSetSha256: '6b414c16d0e5965d2c22c899a1fe2523de39f4564d775433745b983ba313ec18',
        blockStateSetSha256: '9b64f3ef5b63fa5dc31ba011b033fcb68888f06891d5857d35b198e8351fb927',
      },
      frozen: {
        cellCount: 182_791,
        coordinateSetSha256: 'c230a0ed3582c466736101c7c209dda071070645a2c81381408a8a3bc496a071',
        blockStateSetSha256: '773c78254b317177ebf5aaae2ac673c56e0c06fc0f51d1ef05555d342fd48a4a',
      },
      snow: {
        cellCount: 359_830,
        coordinateSetSha256: '0a0af937ba1634ace4d925341465dfa1b1f0a017332744341f9a2cb1a25f4c9b',
        blockStateSetSha256: 'b85622438fc9610c1c7a467ac17cd3e46a82e727368204a70bab5c88c671bc63',
      },
    });
    expect(census.waterComponents).toMatchObject({
      componentCount: 5_234,
      manifestSha256: '827aa11b7e8b583949ad9d2f86bb8457417e3d46b2d4a58de0174bedf5018105',
    });
    expect(census.lavaComponents).toMatchObject({
      componentCount: 941,
      manifestSha256: '707b8be407c2c6492cdc34a79ec5401849058c363c004da4ae4cc05bf0d432f4',
    });
    expect(census.waterComponents.components.reduce((sum, item) => sum + item.cellCount, 0))
      .toBe(census.families.water.cellCount);
    expect(census.lavaComponents.components.reduce((sum, item) => sum + item.cellCount, 0))
      .toBe(census.families.lava.cellCount);
  });

  it('keeps exact one-cell relic shells as unreviewed default-deny candidates', () => {
    const report = readReport();
    expect(report.protectedRelicBufferCandidates.map((relic) => ({
      relicKey: relic.relicKey,
      finding: relic.presentCellFinding,
      cellCount: relic.minimumAdjacencyBufferCandidate.cellCount,
      coordinateSetSha256: relic.minimumAdjacencyBufferCandidate.coordinateSetSha256,
    }))).toEqual([
      {
        relicKey: 'igloo-east',
        finding: 'NO_PRESENT_CELLS_IN_DECLARED_BOUNDING_VOLUME',
        cellCount: 350,
        coordinateSetSha256: '359fbd6462c5554a49f8c293df1f3645626f83dc286cc3dbf6973942090dc3aa',
      },
      {
        relicKey: 'igloo-west',
        finding: 'PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME',
        cellCount: 350,
        coordinateSetSha256: '1b10c46805ad61b02194d171d8c89a6cbc0d0c9d85eb28dc015ed8ebda196d20',
      },
      {
        relicKey: 'shipwreck',
        finding: 'PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME',
        cellCount: 1_362,
        coordinateSetSha256: '9e9a497cc8cac69eaa7ea9a173a953610a33638ec51ca2783f98e7ace3f21874',
      },
    ]);
    for (const relic of report.protectedRelicBufferCandidates) {
      expect(relic.minimumAdjacencyBufferCandidate).toMatchObject({
        status: 'EXACT_CANDIDATE_NOT_REVIEWED',
        positiveMarginBlocks: 1,
        constructionOwnership: false,
        operationAuthorization: false,
      });
      expect(relic.exactReviewedBufferCellSet).toBeNull();
    }
  });

  it('keeps drainage ownership unassigned and D05 closed', () => {
    const report = readReport();
    const coordination = report.drainageCoordinationModel;
    expect(coordination).toMatchObject({
      status: 'PARTIAL_PASS_EXACT_COORDINATION_PARTITION_OWNERS_UNASSIGNED',
      currentlyAssignedOwnerCount: 0,
      constructionOwnershipFrozen: false,
    });
    expect(coordination.exactDefaultDenySets).toHaveLength(8);
    for (const cellSet of coordination.exactDefaultDenySets) {
      expect(cellSet).toMatchObject({
        status: 'UNASSIGNED_DEFAULT_DENY_COORDINATION_SET',
        futureCanonicalOwner: null,
        constructionOwnership: false,
      });
    }
    const byId = Object.fromEntries(
      coordination.exactDefaultDenySets.map((cellSet) => [cellSet.id, cellSet.cellCount]),
    );
    expect(byId['water-boundary-interface']
      + byId['water-contained-subsurface']
      + byId['water-contained-surface']).toBe(1_929_621);
    expect(byId['lava-boundary-interface']
      + byId['lava-contained-subsurface']
      + byId['lava-contained-surface']).toBe(85_088);

    const routing = coordination.topographicRoutingCandidate;
    expect(routing.status).toBe('EXACT_SNAPSHOT_D8_CANDIDATE_NOT_A_FLOW_SIMULATION');
    expect(routing.routesToBoundary.columnCount + routing.routesToInternalSink.columnCount)
      .toBe(routing.columnCount);
    expect(routing.columnCount).toBe(480_000);
    expect(report.d05Disposition.status).toBe('HOLD');
    expect(report.d05Disposition.passedSubgates).toHaveLength(5);
    expect(report.d05Disposition.holdSubgates).toHaveLength(7);
  });
});
