import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r11c_c1_east_highway_completion.mjs',
);
const BASENAME = 'combined-zones-r11c-c1-east-highway-completion';
const PAVEMENT_KEY = 'c1-east-at-grade-completion';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11c-c1-highway-'),
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
  executionOrder: { forward: string[]; rollback: string[]; rationale: string };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    sourceLedgerCompletedReleaseIdentitySha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
  };
  scope: {
    stations: { start: number; end: number; count: number; treatment: string };
    geometry: Record<string, ExactSet | number | Record<string, unknown>> & {
      retainedLeafDecayAudit: {
        ownedLogRemovals: ExactSet;
        removalInfluencedRetainedLeaves: ExactSet;
        provenDecayRisk: ExactSet;
        requiredPropertyOnlyTransitions: ExactSet;
        unrelatedCanopyTransitionCount: number;
        exactSourceBound: boolean;
      };
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
    '2026-08-21T18:45:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08p-live-20260821T184147Z/post-complete-save-intake.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactNames.map((name) => fs.readFileSync(path.join(temporaryDirectory, name)));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11C C1 east highway completion compiler', () => {
  it('regenerates all and only the committed execution artifacts byte-for-byte', () => {
    const regenerated = artifactNames.map((name) => (
      fs.readFileSync(path.join(temporaryDirectory, name))
    ));
    expect(regenerated).toEqual(firstCompile);
    const committed = artifactNames.map((name) => (
      fs.readFileSync(path.join(ROOT, 'data/buildops', name))
    ));
    expect(regenerated.slice(0, 2)).toEqual(committed.slice(0, 2));
    const regeneratedManifest = JSON.parse(regenerated[2].toString()) as ReleaseManifest;
    const committedManifest = JSON.parse(committed[2].toString()) as ReleaseManifest;
    regeneratedManifest.packages = committedManifest.packages;
    const { manifestIdentity: regeneratedIdentity, ...regeneratedPayload } = regeneratedManifest;
    const { manifestIdentity: committedIdentity, ...committedPayload } = committedManifest;
    expect(regeneratedIdentity).not.toBe('');
    expect(committedIdentity).not.toBe('');
    expect(regeneratedPayload).toEqual(committedPayload);
    expect(fs.existsSync(path.join(
      ROOT,
      'data/buildops',
      `${BASENAME}.c1-east-leaf-decay-stabilization.forward.txt`,
    ))).toBe(false);
    expect(fs.existsSync(path.join(
      ROOT,
      'data/buildops',
      `${BASENAME}.c1-east-leaf-decay-stabilization.rollback.txt`,
    ))).toBe(false);
  });

  it('binds the accepted R08P terminal post and authorized R11 node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      mvpScope: true,
      scopeIds: ['C1-HIGHWAY'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
        completeSaveSha256:
          'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
        sourceLedgerCompletedReleaseIdentitySha256:
          'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 9,
      },
    });
  });

  it('freezes the complete 24-station run and explicit preserved exceptions', () => {
    const { scope } = readManifest();
    expect(scope.stations).toEqual({
      start: 494,
      end: 517,
      count: 24,
      treatment: 'AT_GRADE_COORDINATION_PASS',
      startReference: expect.any(Object),
      endReference: expect.any(Object),
    });
    expect(scope.geometry).toMatchObject({
      fullFrozenCrossSectionCandidate: {
        cellCount: 462,
        coordinateSetSha256:
          '7327893494b7d4645001b7351d26e073acce37629935acb8b079743fe96ecc4c',
      },
      inheritedAcceptedR11AFunctionalEnvelope: { cellCount: 23 },
      inheritedAcceptedR11AEnvelopeConflict: { cellCount: 1 },
      inheritedAcceptedR11BEnvelopeConflict: {
        cellCount: 23,
        coordinateSetSha256:
          '8db2a18a7e2f445bc5d4fa1d0787689cdbb823f49a276563f1d5f78b02977632',
      },
      preservedUtilityReservationConflict: {
        cellCount: 3,
        coordinateSetSha256:
          '454d9ed2fbaf386c10b244a593027fc3b34b8a8fa7a7be3c262df00adfdaa058',
      },
      preservedGradeShadowedDisconnectedCandidate: {
        cellCount: 13,
        coordinateSetSha256:
          'cec12d7786e2d8a0e165f463910fc11f9ce07fabbaf5d745ac1cc34b9c155766',
      },
      preservedIntrinsicNineCellGradeShadow: {
        cellCount: 9,
        coordinateSetSha256:
          'ec9a9fbfafbd3bcabd18d35a4fd9b8417d499bcef8a39e6df0a910da6c3cee21',
      },
      preservedR11BEnvelopeInducedGradeShadow: {
        cellCount: 8,
        coordinateSetSha256:
          '850d16a1ec086a302cdb4aa55148da5c7b2dce9b6a83ae3fc89de55c6e45d43a',
      },
      preservedCandidateExceptions: { cellCount: 63 },
      completeCandidatePartition: {
        cellCount: 462,
        coordinateSetSha256:
          '7327893494b7d4645001b7351d26e073acce37629935acb8b079743fe96ecc4c',
      },
      pavementSurface: {
        cellCount: 399,
        coordinateSetSha256:
          'd290098f6186f7ed133b1448e4738c37a0e62f42fb7e74755583b6271db87239',
      },
      exactFoundationFill: { cellCount: 68 },
      exactHeadroomCuts: { cellCount: 642 },
      fullTwoBlockHeadroom: { cellCount: 798 },
      stableFoundationContacts: { cellCount: 399, unsupportedCellCount: 0 },
      connectedSurfaceComponentCount: 1,
      r11aSeam: {
        acceptedSurfaceExactTargetStateCount: 109,
        adjacentPairCount: 93,
        seamComponentCount: 3,
        maximumVerticalStep: 1,
        combinedSurfaceComponentCount: 1,
      },
    });
  });

  it('proves zero gravity and zero leaf-property dependency mutations', () => {
    const manifest = readManifest();
    expect(manifest.packages).toEqual([{
      key: PAVEMENT_KEY,
      forward: `data/buildops/${BASENAME}.${PAVEMENT_KEY}.forward.txt`,
      rollback: `data/buildops/${BASENAME}.${PAVEMENT_KEY}.rollback.txt`,
    }]);
    expect(manifest.scope.geometry).toMatchObject({
      exactGravityStabilization: { cellCount: 0 },
      retainedLeafDecayAudit: {
        ownedLogRemovals: { cellCount: 27 },
        removalInfluencedRetainedLeaves: { cellCount: 235 },
        provenDecayRisk: { cellCount: 0 },
        requiredPropertyOnlyTransitions: { cellCount: 0 },
        unrelatedCanopyTransitionCount: 0,
        exactSourceBound: true,
      },
    });
    expect(manifest.isolation).toMatchObject({
      gravityHaloIntersectionCount: 2,
      declaredGravityStabilizationCount: 0,
      residualStableUntouchedGravityCount: 2,
      ownedLogRemovalCount: 27,
      retainedLeafRemovalInfluenceCount: 235,
      retainedLeafProvenDecayRiskCount: 0,
      declaredLeafPropertyTransitionCount: 0,
      unresolvedGravityHazardCount: 0,
    });
  });

  it('emits one 1,109-cell exact package and its record-reversed inverse', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder).toEqual({
      forward: [PAVEMENT_KEY],
      rollback: [PAVEMENT_KEY],
      rationale: expect.any(String),
    });
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    expect(forward).toHaveLength(1_109);
    expect(new Set(forward.map(({ cell }) => cell.join(','))).size).toBe(1_109);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      cell: operation.cell,
      sourceState: operation.targetState,
      targetState: operation.sourceState,
    })));
    const operationManifest = manifest.operations[PAVEMENT_KEY];
    expect(typeof operationManifest).toBe('object');
    if (typeof operationManifest === 'object') {
      expect(bodySha256(forwardPath)).toBe(operationManifest.forwardSha256);
      expect(bodySha256(rollbackPath)).toBe(operationManifest.rollbackSha256);
      expect(operationManifest.exactInverse).toBe(true);
    }
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 1_109,
        coordinateSetSha256:
          '2e671a5ae94babdc29c518bacdc167f9e71a23db32b539f98b023903c7bd2a74',
      },
      packageTargetsDisjoint: true,
    });
  });

  it('fails closed on prior releases and every undeclared interface', () => {
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
      r11aFunctionalEnvelopeIntersectionCount: 0,
      r11bPreservedEnvelopeConflictCellCount: 23,
      utilityReservationPreservedConflictCellCount: 3,
      preservedCandidateExceptionCellCount: 63,
      completeCandidatePartitionCellCount: 462,
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

  it('binds the manifest identity to the complete payload', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });

  it('retains single-package scoped-wrapper print-plan compatibility', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node',
      'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [PAVEMENT_KEY],
    });
  });
});
