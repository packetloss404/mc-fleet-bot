import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r11b_c1_west_highway_extension.mjs',
);
const BASENAME = 'combined-zones-r11b-c1-west-highway-extension';
const STABILIZATION_KEY = 'c1-west-gravity-stabilization';
const PAVEMENT_KEY = 'c1-west-highway-extension';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11b-c1-highway-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Operation {
  cell: [number, number, number];
  sourceState: string;
  targetState: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    sourceLedgerCompletedReleaseIdentitySha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
  };
  scope: {
    stations: { start: number; end: number; count: number; treatment: string };
    geometry: {
      fullFrozenCrossSectionCandidate: ExactSet;
      inheritedAcceptedR11ASurface: ExactSet;
      inheritedAcceptedR11AHeadroom: ExactSet;
      inheritedAcceptedR11AFunctionalEnvelope: ExactSet;
      pavementSurface: ExactSet;
      carriageway: ExactSet;
      outerShoulders: ExactSet;
      medianSurface: ExactSet;
      exactGravityStabilization: ExactSet;
      exactFoundationFill: ExactSet;
      exactHeadroomCuts: ExactSet;
      fullTwoBlockHeadroom: ExactSet;
      operatedUnion: ExactSet;
      stableFoundationContacts: ExactSet & { unsupportedCellCount: number };
      connectedSurfaceComponentCount: number;
      newTargetComponentCountBeforeAcceptedR11AFill: number;
      r11aSeam: {
        acceptedSurfaceExactTargetStateCount: number;
        adjacentPairCount: number;
        seamComponentCount: number;
        maximumVerticalStep: number;
        combinedSurfaceComponentCount: number;
      };
    };
    sourcePartition: {
      orderedTransitionCount: number;
      orderedOverlap: ExactSet;
      exactPartition: boolean;
    };
  };
  target: {
    operatedUnion: ExactSet;
    desiredStateCensus: Record<string, number>;
    packageTargetsDisjoint: boolean;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    targetCellCount: number;
    targetCoordinateSetSha256: string;
    exactInverse: boolean;
  } | string>;
  isolation: Record<string, number | unknown[] | Record<string, number>>;
  compileGuards: Record<string, number | string>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
}

const artifactNames = [
  `${BASENAME}.${STABILIZATION_KEY}.forward.txt`,
  `${BASENAME}.${STABILIZATION_KEY}.rollback.txt`,
  `${BASENAME}.${PAVEMENT_KEY}.forward.txt`,
  `${BASENAME}.${PAVEMENT_KEY}.rollback.txt`,
  `${BASENAME}.release-manifest.json`,
];
let firstCompile: Buffer[] = [];

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
      return { cell: from, sourceState: fields[7], targetState: fields[8] };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:35:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r09b-post-20260821T173228Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09b-live-20260821T173228Z/post-complete-save-intake.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactNames.map((name) => (
    fs.readFileSync(path.join(temporaryDirectory, name))
  ));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11B C1 west highway extension compiler', () => {
  it('regenerates every committed guarded artifact byte-for-byte', () => {
    expect(artifactNames.map((name) => fs.readFileSync(path.join(temporaryDirectory, name))))
      .toEqual(firstCompile);
  });

  it('binds the accepted R09B post state and authorized R11 node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      mvpScope: true,
      scopeIds: ['C1-HIGHWAY'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09b-post-20260821T173228Z',
        completeSaveSha256:
          '9be9ed738ea806ddeb729d5681a890f77830f03ed49987e4129d18a2138040a4',
        sourceLedgerCompletedReleaseIdentitySha256:
          'cdd7df171ea63e5a04801f04929204c1b8d6c565a1b7e338717f80bbc6aed65a',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 9,
      },
    });
  });

  it('freezes the full eight-station run while preserving inherited R11A cells', () => {
    expect(readManifest().scope).toMatchObject({
      stations: {
        start: 481,
        end: 488,
        count: 8,
        treatment: 'AT_GRADE_COORDINATION_PASS',
      },
      geometry: {
        fullFrozenCrossSectionCandidate: {
          cellCount: 184,
          coordinateSetSha256:
            '9293cac69f7aed6d9c0d202c9908d8380dc412a2b2351053f5f7831fd118914b',
        },
        inheritedAcceptedR11ASurface: {
          cellCount: 18,
          coordinateSetSha256:
            '397e865ec2a2984c2e89ae2cb882633125ac3f337bff2e6bdc42036354f1ac4e',
        },
        inheritedAcceptedR11AHeadroom: {
          cellCount: 2,
          coordinateSetSha256:
            '6c2271b07ee6107250b5665f17ef80c4b8a8ca6ed2d09bd33b25531293d540cf',
        },
        inheritedAcceptedR11AFunctionalEnvelope: {
          cellCount: 20,
          coordinateSetSha256:
            '86196fed13df69ed1273f8d8f4726c66e8c74b1ad4bb695414bc714e3408143f',
        },
        pavementSurface: {
          cellCount: 164,
          coordinateSetSha256:
            'e48819e8b7e60794cf8707c4073749ab4d79a588a20f4f1ebcd811d507bd9bc1',
        },
        carriageway: { cellCount: 104 },
        outerShoulders: { cellCount: 43 },
        medianSurface: { cellCount: 17 },
        exactFoundationFill: { cellCount: 31 },
        exactHeadroomCuts: { cellCount: 290 },
        fullTwoBlockHeadroom: { cellCount: 328 },
        stableFoundationContacts: { cellCount: 164, unsupportedCellCount: 0 },
        connectedSurfaceComponentCount: 1,
        newTargetComponentCountBeforeAcceptedR11AFill: 8,
        r11aSeam: {
          acceptedSurfaceExactTargetStateCount: 109,
          adjacentPairCount: 94,
          seamComponentCount: 1,
          maximumVerticalStep: 1,
          combinedSurfaceComponentCount: 1,
        },
      },
    });
  });

  it('freezes the complete affected gravel closure and proves residual gravel stable', () => {
    const manifest = readManifest();
    const stabilizationPackage = manifest.packages.find(({ key }) => (
      key === STABILIZATION_KEY
    ));
    expect(stabilizationPackage).toBeDefined();
    const stabilization = parseOperations(path.join(ROOT, stabilizationPackage!.forward));
    expect(stabilization).toEqual([
      {
        cell: [904, 105, 74],
        sourceState: 'minecraft:gravel',
        targetState: 'minecraft:stone_bricks',
      },
      {
        cell: [904, 105, 75],
        sourceState: 'minecraft:gravel',
        targetState: 'minecraft:stone_bricks',
      },
      {
        cell: [906, 105, 75],
        sourceState: 'minecraft:gravel',
        targetState: 'minecraft:stone_bricks',
      },
    ]);
    expect(manifest.scope.geometry.exactGravityStabilization).toMatchObject({
      cellCount: 3,
      coordinateSetSha256:
        '4f235d6c0198856e1a968519433925cfdf6ac6bd386e54b29e679cad067409db',
    });
    expect(manifest.isolation).toMatchObject({
      gravityHaloIntersectionCount: 25,
      declaredGravityStabilizationCount: 3,
      residualStableUntouchedGravityCount: 22,
      unresolvedGravityHazardCount: 0,
      unsupportedGravityKindCount: 0,
      residualGravitySupportProof: {
        cellCount: 22,
        proofEntryCount: 22,
        unsupportedCount: 0,
        touchedCount: 0,
      },
    });
  });

  it('uses two disjoint exact packages and exact reverse inverses', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder).toEqual({
      forward: [STABILIZATION_KEY, PAVEMENT_KEY],
      rollback: [PAVEMENT_KEY, STABILIZATION_KEY],
      rationale: expect.any(String),
    });
    const targetKeys = new Set<string>();
    let transitionCount = 0;
    for (const pkg of manifest.packages) {
      const forwardPath = path.join(ROOT, pkg.forward);
      const rollbackPath = path.join(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        cell: operation.cell,
        sourceState: operation.targetState,
        targetState: operation.sourceState,
      })));
      for (const operation of forward) {
        const key = operation.cell.join(',');
        expect(targetKeys.has(key)).toBe(false);
        targetKeys.add(key);
      }
      transitionCount += forward.length;
      const operationManifest = manifest.operations[pkg.key];
      expect(typeof operationManifest).toBe('object');
      if (typeof operationManifest === 'object') {
        expect(bodySha256(forwardPath)).toBe(operationManifest.forwardSha256);
        expect(bodySha256(rollbackPath)).toBe(operationManifest.rollbackSha256);
        expect(operationManifest.exactInverse).toBe(true);
      }
    }
    expect(transitionCount).toBe(488);
    expect(targetKeys.size).toBe(488);
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 488,
        coordinateSetSha256:
          '36473b2e69b1e4ca5100060ae2b3493ae5981efc8d0b85122d48ce6a026c73ee',
      },
      packageTargetsDisjoint: true,
    });
  });

  it('fails closed on all undeclared interfaces and performs no live mutation', () => {
    const manifest = readManifest();
    expect(manifest.compileGuards).toMatchObject({
      unstableFoundationViolationCount: 0,
      fluidHaloViolationCount: 0,
      gravityDependencyClosureMissingCount: 0,
      residualGravityUnsupportedCount: 0,
      residualGravityTouchedCount: 0,
      unsupportedGravityKindViolationCount: 0,
      forbiddenContainerOrControlHaloViolationCount: 0,
      blockEntityHaloViolationCount: 0,
      savedEntityHaloViolationCount: 0,
      protectedRelicHaloViolationCount: 0,
      c01DefaultDenyHaloViolationCount: 0,
      priorReleaseViolationCount: 0,
      r11aSurfaceTargetStateViolationCount: 0,
      r11aHeadroomAirStateViolationCount: 0,
      r11aFunctionalEnvelopeIntersectionCount: 0,
      undeclaredR11aTargetOverlapCount: 0,
    });
    expect(manifest.isolation).toMatchObject({
      railReserveOperatedPlanIntersectionCount: 0,
      railCollectionOperatedPlanIntersectionCount: 0,
      utilityReserveOperatedPlanIntersectionCount: 0,
      roadCollectionOperatedPlanIntersectionCount: 0,
      undeclaredPriorReleaseIntersectionCount: 0,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('binds its manifest identity to the payload', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
