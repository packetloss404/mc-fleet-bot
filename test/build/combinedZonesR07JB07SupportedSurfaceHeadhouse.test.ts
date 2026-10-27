import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07j_b07_supported_surface_headhouse.mjs',
);
const BASENAME = 'combined-zones-r07j-b07-supported-surface-headhouse';
const PACKAGE_KEYS = [
  'b07-grounded-pier-and-deck',
  'b07-fail-closed-surface-headhouse',
];
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07j-b07-supported-surface-headhouse-offline-20260821T192000Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07j-b07-headhouse-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
  componentCount?: number;
  componentSizes?: number[];
}

interface OperationRecord {
  forwardSha256: string;
  rollbackSha256: string;
  forwardCommandCount: number;
  rollbackCommandCount: number;
  targetCellCount: number;
  targetCoordinateSetSha256: string;
  sourceStateCensus: Record<string, number>;
  exactInverse: boolean;
  oneCellGuards: boolean;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    canonicalOwner: string;
    anchor: Record<string, number>;
    material: string;
    geometry: Record<string, ExactSet | Array<Record<string, unknown>>>;
    ownership: {
      targetConstructionCellCount: number;
      targetInteractionCellCount: number;
      targetInteractionOnlyCellCount: number;
      targetOutsideHistoricalInteractionCellCount: number;
      namedReviewedExtension: Record<string, unknown> & {
        prism: ExactSet;
        operatedCells: ExactSet;
        preservedInteriorAirCellCount: number;
        priorTargetIntersectionCount: number;
      };
    };
    operationalBoundary: Record<string, boolean | string>;
  };
  source: Record<string, unknown> & {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    predecessor: Record<string, unknown>;
    disjointRebaseProof: Record<string, number | string>;
  };
  target: {
    operatedUnion: ExactSet;
    sourceStateCensus: Record<string, number>;
    desiredStateCensus: Record<string, number>;
    packageTargetsDisjoint: boolean;
  };
  operations: Record<string, OperationRecord>;
  preservation: Record<string, unknown> & {
    retainedWoodyCells: ExactSet & {
      targetIntersectionCount: number;
      blockStateSetSha256: string;
    };
    contextualSnowCells: ExactSet & {
      targetIntersectionCount: number;
      exactRollbackRestoredTargetSnowCellCount: number;
    };
    acceptedPriorReleaseTargetProof: Array<{ targetIntersectionCount: number }>;
    acceptedPriorReleaseTargetIntersectionCount: number;
  };
  safetyAudit: Record<string, number | boolean | ExactSet>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const from = fields.slice(1, 4).map(Number) as [number, number, number];
      const to = fields.slice(4, 7).map(Number) as [number, number, number];
      expect(to).toEqual(from);
      return { point: from, fromState: fields[7], toState: fields[8] };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function artifactPaths(directory: string): string[] {
  return [
    ...PACKAGE_KEYS.flatMap((key) => [
      `${BASENAME}.${key}.forward.txt`,
      `${BASENAME}.${key}.rollback.txt`,
    ]),
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T19:20:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08s-live-20260821T191247Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08s-live-20260821T191247Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07J B07 supported surface headhouse', () => {
  it('regenerates the two exact packages and manifest byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R08S post and proves the R07I B07 prism did not drift', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_R08S_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      scopeIds: ['P1-B07-SURFACE-SUPPORT', 'P1-B07-SURFACE-HEADHOUSE'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z',
        completeSaveSha256:
          '71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64',
        regionSnapshotSha256:
          'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2',
        predecessor: {
          transactionId: 'combined-zones-r08s-n07-fluid-ordered-capped-retail-shell',
          completedReleaseIdentitySha256:
            '97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3',
        },
        disjointRebaseProof: {
          baseline: 'R07I_POST',
          terminal: 'R08S_POST',
          baselineBlockStateSetSha256:
            'f80439d963f47292be8ef1a75831f9bb04d32a667a4a88943a1b6b140f853267',
          terminalBlockStateSetSha256:
            'f80439d963f47292be8ef1a75831f9bb04d32a667a4a88943a1b6b140f853267',
          mismatchCount: 0,
        },
      },
    });
  });

  it('builds four continuous grounded piers, one connected deck, and one enclosed headhouse', () => {
    const manifest = readManifest();
    const geometry = manifest.scope.geometry;
    expect(geometry).toMatchObject({
      exactSevenBySevenTopFace: { cellCount: 49 },
      nineByNineDeck: { cellCount: 81, componentCount: 1, componentSizes: [81] },
      groundedPiers: { cellCount: 35 },
      foundation: {
        cellCount: 116,
        coordinateSetSha256:
          'babae111a2defaeeff84ceefd8db15a445aeff76b6203dbb64bf07ca7a9d0fb2',
      },
      headhouseWalls: { cellCount: 72 },
      headhouseRoof: { cellCount: 49 },
      headhouseShell: {
        cellCount: 121,
        coordinateSetSha256:
          'aac7871c818084b698c26b8eb4529be5dd1c0ea7abca317eb0437d24333caf3b',
      },
      preservedConnectedHeadroom: {
        cellCount: 75,
        componentCount: 1,
        componentSizes: [75],
      },
      completeInteriorFaceBoundary: { cellCount: 110 },
    });
    const supports = geometry.supportProofs as Array<Record<string, unknown> & {
      stableGround: { state: string };
      continuousToDeck: boolean;
      deckContact: { y: number };
    }>;
    expect(supports).toHaveLength(4);
    expect(supports.every((support) => support.continuousToDeck)).toBe(true);
    expect(supports.every((support) => support.deckContact.y === 72)).toBe(true);
    expect(supports.every((support) => (
      support.stableGround.state.startsWith('minecraft:grass_block[')
    ))).toBe(true);
    expect(manifest.safetyAudit).toMatchObject({
      everyPierContinuousToDeck: true,
      everyPierGroundStable: true,
      deckConnected: true,
      headroomConnected: true,
      headroomFullyEnclosed: true,
    });
  });

  it('binds the reviewed above-Y73 ownership extension and has zero prior-target overlap', () => {
    const manifest = readManifest();
    expect(manifest.scope).toMatchObject({
      canonicalOwner: 'P1-B07',
      anchor: { x: 2108, y: 72, z: -398, surveyedTerrainY: 63 },
      material: 'minecraft:polished_diorite',
      ownership: {
        targetConstructionCellCount: 49,
        targetInteractionCellCount: 140,
        targetInteractionOnlyCellCount: 91,
        targetOutsideHistoricalInteractionCellCount: 97,
        namedReviewedExtension: {
          id: 'P1-B07-SURFACE-ARCHITECTURE-PRISM-EXTENSION-R07J',
          disposition: 'REVIEWED_EXACT_EXTENSION_FOR_CLOSED_SURFACE_ARCHITECTURE_ONLY',
          prism: { cellCount: 147 },
          operatedCells: { cellCount: 97 },
          preservedInteriorAirCellCount: 50,
          priorTargetIntersectionCount: 0,
        },
      },
    });
    expect(manifest.preservation.acceptedPriorReleaseTargetProof).toHaveLength(40);
    expect(manifest.preservation.acceptedPriorReleaseTargetProof
      .every(({ targetIntersectionCount }) => targetIntersectionCount === 0)).toBe(true);
    expect(manifest.preservation.acceptedPriorReleaseTargetIntersectionCount).toBe(0);
  });

  it('preserves tree, fluid, relic, entity, and retained-route boundaries', () => {
    const manifest = readManifest();
    expect(manifest.preservation).toMatchObject({
      retainedWoodyCells: {
        cellCount: 241,
        targetIntersectionCount: 0,
      },
      contextualSnowCells: {
        cellCount: 180,
        targetIntersectionCount: 4,
        exactRollbackRestoredTargetSnowCellCount: 4,
      },
      r09RetainedHoldTargetIntersectionCount: 0,
    });
    expect(manifest.safetyAudit).toMatchObject({
      targetFluidCount: 0,
      targetGravityCount: 0,
      targetWoodyCount: 0,
      targetForbiddenContainerOrControlCount: 0,
      haloFluidCount: 0,
      haloBlockEntityCount: 0,
      haloSavedEntityCount: 0,
      haloProtectedRelicCount: 0,
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      shaftInterfaceClosedByExactTopFace: true,
      exteriorDoorInstalled: false,
      shaftOrEgressOpeningCreated: false,
      stairOrLiftInstalled: false,
      publicRouteCommissioned: false,
      r09RetainedUpperHoldPreserved: true,
      futureOpeningDeferred: true,
    });
  });

  it('proves exact inverse guards and all focused offline gates', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder).toEqual({
      forward: PACKAGE_KEYS,
      rollback: PACKAGE_KEYS.slice().reverse(),
      rationale: expect.any(String),
    });
    let total = 0;
    for (const pkg of manifest.packages) {
      const forward = path.join(ROOT, pkg.forward);
      const rollback = path.join(ROOT, pkg.rollback);
      const forwardOperations = parseOperations(forward);
      const rollbackOperations = parseOperations(rollback);
      const declared = manifest.operations[pkg.key];
      total += forwardOperations.length;
      expect(bodySha256(forward)).toBe(declared.forwardSha256);
      expect(bodySha256(rollback)).toBe(declared.rollbackSha256);
      expect(forwardOperations).toHaveLength(declared.targetCellCount);
      expect(rollbackOperations).toHaveLength(declared.targetCellCount);
      expect(declared).toMatchObject({ exactInverse: true, oneCellGuards: true });
      expect(rollbackOperations).toEqual(forwardOperations.slice().reverse().map((operation) => ({
        point: operation.point,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      const source = JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, `${pkg.key}.forward-source-preflight.json`),
        'utf8',
      )) as Record<string, number | string>;
      const inverse = JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, `${pkg.key}.projected-rollback-preflight.json`),
        'utf8',
      )) as Record<string, number | string>;
      for (const report of [source, inverse]) {
        expect(report.status).toBe('PASS');
        expect(report.operationCount).toBe(declared.targetCellCount);
        expect(report.passed).toBe(declared.targetCellCount);
        expect(report.failed).toBe(0);
      }
      for (const role of ['forward', 'rollback']) {
        const dry = JSON.parse(fs.readFileSync(
          path.join(EVIDENCE, `${pkg.key}.${role}-strict-dry-run.json`),
          'utf8',
        )) as Record<string, number | string | boolean>;
        expect(dry).toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          sourceOperationCount: declared.targetCellCount,
          commandCount: declared.targetCellCount,
          worldEditLeftoverCount: 0,
        });
      }
    }
    expect(total).toBe(237);
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 237 },
      sourceStateCensus: {
        'minecraft:air': 233,
        'minecraft:snow[layers=1]': 4,
      },
      desiredStateCensus: { 'minecraft:polished_diorite': 237 },
      packageTargetsDisjoint: true,
    });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS',
        totals: {
          packages: 2,
          passedPackages: 2,
          uniqueTargetCells: 237,
          crossPackageIntersectionCells: 0,
        },
      });
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'),
      'utf8',
    ))).toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
  });
});
