import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r11d_c1_at_grade_island_521_546.mjs',
);
const BASENAME = 'combined-zones-r11d-c1-at-grade-island-521-546';
const PAVEMENT_KEY = 'c1-island-521-546-at-grade-pavement';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11d-c1-island-'),
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

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[]; rationale: string };
  source: Record<string, string | number>;
  scope: {
    stations: Record<string, unknown>;
    geometry: Record<string, unknown> & {
      retainedLeafDecayAudit: Record<string, ExactSet | number | boolean | string>;
    };
    sourcePartition: Record<string, ExactSet | number | boolean>;
  };
  target: { operatedUnion: ExactSet; packageTargetsDisjoint: boolean };
  operations: Record<string, unknown>;
  isolation: Record<string, unknown>;
  compileGuards: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

const artifactNames = [
  `${BASENAME}.${PAVEMENT_KEY}.forward.txt`,
  `${BASENAME}.${PAVEMENT_KEY}.rollback.txt`,
  `${BASENAME}.release-manifest.json`,
];
let firstCompile: Buffer[] = [];

function manifest(filename = MANIFEST): Manifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Manifest;
}

function operations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const from = fields.slice(1, 4).map(Number) as [number, number, number];
      expect(fields.slice(4, 7).map(Number)).toEqual(from);
      return { cell: from, sourceState: fields[7], targetState: fields[8] };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T19:10:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r11c-post-20260821T185813Z',
    '--intake-audit',
    'data/world-review/combined-zones-r11c-live-20260821T185813Z/post-complete-save-intake.json',
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

describe('Combined Zones CZ-R11D C1 at-grade island compiler', () => {
  it('regenerates every committed artifact byte-for-byte', () => {
    const regenerated = artifactNames.map((name) => fs.readFileSync(
      path.join(temporaryDirectory, name),
    ));
    expect(regenerated).toEqual(firstCompile);
    const committed = artifactNames.map((name) => fs.readFileSync(
      path.join(ROOT, 'data/buildops', name),
    ));
    expect(regenerated.slice(0, 2)).toEqual(committed.slice(0, 2));
    const regeneratedManifest = JSON.parse(regenerated[2].toString()) as Manifest;
    const committedManifest = JSON.parse(committed[2].toString()) as Manifest;
    regeneratedManifest.packages = committedManifest.packages;
    const { manifestIdentity: regeneratedIdentity, ...regeneratedPayload } = regeneratedManifest;
    const { manifestIdentity: committedIdentity, ...committedPayload } = committedManifest;
    expect(regeneratedIdentity).not.toBe('');
    expect(committedIdentity).not.toBe('');
    expect(regeneratedPayload).toEqual(committedPayload);
  });

  it('binds accepted R11C post and the authorized R11 node', () => {
    expect(manifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R11C_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      mvpScope: true,
      scopeIds: ['C1-HIGHWAY'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r11c-post-20260821T185813Z',
        completeSaveSha256:
          'a4e7f8a9066ef0818436b4d3c92e594daa91fb4136cd8d7603988bed565ce219',
        sourceLedgerCompletedReleaseIdentitySha256:
          'f2c37e1c70a8829981352a0d64d1e69edb556a19359d1afd56061e9fe2169bb9',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
      },
    });
  });

  it('freezes the maximal 26-station island and all 23 exceptions', () => {
    const scope = manifest().scope;
    expect(scope.stations).toMatchObject({
      start: 521,
      end: 546,
      count: 26,
      treatment: 'AT_GRADE_COORDINATION_PASS',
    });
    expect(scope.geometry).toMatchObject({
      fullFrozenCrossSectionCandidate: { cellCount: 499 },
      preservedPriorC1ReleaseEnvelopeConflict: { cellCount: 18 },
      preservedRailReservationConflict: { cellCount: 2 },
      preservedUtilityReservationConflict: { cellCount: 2 },
      preservedRoadCollectionConflict: { cellCount: 0 },
      preservedDisconnectedGradeShadow: {
        cellCount: 1,
        coordinateSetSha256:
          '885f1e701f79da32ad063d9ceaa248c9a706bde1e640cdd40e346046f7824a1f',
      },
      preservedCandidateExceptions: { cellCount: 23 },
      completeCandidatePartition: { cellCount: 499 },
      pavementSurface: {
        cellCount: 476,
        coordinateSetSha256:
          'da65f25faf781762ba9ee631a6f67a0cdbfc71316d60410eb4ef9ad4f3522dd4',
      },
      connectedSurfaceComponentCount: 1,
      heldEnds: {
        west: { startStation: 518, endStation: 520, mutatedCellCount: 0 },
        east: { startStation: 547, endStation: 547, mutatedCellCount: 0 },
        routeCommissioned: false,
      },
    });
  });

  it('proves complete foundations/headroom with no gravity or leaf transition', () => {
    expect(manifest().scope.geometry).toMatchObject({
      exactFoundationFill: { cellCount: 329 },
      exactHeadroomCuts: { cellCount: 479 },
      fullTwoBlockHeadroom: { cellCount: 952 },
      stableFoundationContacts: { cellCount: 476, unsupportedCellCount: 0 },
      exactGravityStabilization: { cellCount: 0 },
      retainedLeafDecayAudit: {
        ownedLogRemovals: { cellCount: 105 },
        removalInfluencedRetainedLeaves: { cellCount: 292 },
        provenDecayRisk: { cellCount: 0 },
        requiredPropertyOnlyTransitions: { cellCount: 0 },
        unrelatedCanopyTransitionCount: 0,
        exactSourceBound: true,
      },
    });
  });

  it('emits one 1,284-cell exact package and its record-reversed inverse', () => {
    const release = manifest();
    expect(release.packages).toEqual([{
      key: PAVEMENT_KEY,
      forward: `data/buildops/${BASENAME}.${PAVEMENT_KEY}.forward.txt`,
      rollback: `data/buildops/${BASENAME}.${PAVEMENT_KEY}.rollback.txt`,
    }]);
    const forwardPath = path.join(ROOT, release.packages[0].forward);
    const rollbackPath = path.join(ROOT, release.packages[0].rollback);
    const forward = operations(forwardPath);
    const rollback = operations(rollbackPath);
    expect(forward).toHaveLength(1_284);
    expect(new Set(forward.map(({ cell }) => cell.join(','))).size).toBe(1_284);
    expect(rollback).toEqual(forward.slice().reverse().map((record) => ({
      cell: record.cell,
      sourceState: record.targetState,
      targetState: record.sourceState,
    })));
    const operation = release.operations[PAVEMENT_KEY] as Record<string, unknown>;
    expect(bodySha256(forwardPath)).toBe(operation.forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(operation.rollbackSha256);
    expect(release.target).toEqual(expect.objectContaining({
      operatedUnion: {
        cellCount: 1_284,
        bounds: expect.any(Object),
        coordinateSetSha256:
          'a61619cae131093b5cfe8ff6ac8ccf22577754d703d9e9129167855c8f91aced',
      },
      packageTargetsDisjoint: true,
    }));
  });

  it('fails closed on prior releases and every undeclared interface', () => {
    expect(manifest()).toMatchObject({
      isolation: {
        fluidHaloIntersectionCount: 0,
        gravityHaloIntersectionCount: 0,
        declaredGravityStabilizationCount: 0,
        retainedLeafProvenDecayRiskCount: 0,
        declaredLeafPropertyTransitionCount: 0,
        forbiddenContainerOrControlHaloCount: 0,
        blockEntityHaloIntersectionCount: 0,
        savedEntityHaloIntersectionCount: 0,
        protectedRelicHaloIntersectionCount: 0,
        c01DefaultDenyHaloIntersectionCount: 0,
        railReserveOperatedPlanIntersectionCount: 0,
        utilityReserveOperatedPlanIntersectionCount: 0,
        undeclaredPriorReleaseIntersectionCount: 0,
      },
      compileGuards: {
        priorC1EnvelopePreservedConflictCellCount: 18,
        railReservationPreservedConflictCellCount: 2,
        utilityReservationPreservedConflictCellCount: 2,
        disconnectedGradeShadowPreservedCellCount: 1,
        preservedCandidateExceptionCellCount: 23,
        connectedSurfaceComponentCount: 1,
        heldStationMutationCount: 0,
        routeCommissioned: false,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        executionAuthorizedByThisManifest: false,
      },
    });
  });

  it('binds the manifest identity to the complete payload', () => {
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });

  it('passes independent immutable-source route, headroom, and leaf QA', () => {
    const out = path.join(temporaryDirectory, 'r11d-offline-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_offline.mjs',
      '--out', out,
      '--generated-at', '2026-08-21T19:10:00Z',
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      mode: 'OFFLINE_READ_ONLY',
      checks: {
        exactSourceGuardMatches: 1_284,
        exactReverseRollbackCount: 1_284,
        connectedSurfaceCellCount: 476,
        connectedSurfaceComponentCount: 1,
        foundationFillCount: 329,
        fullTwoBlockHeadroomCount: 952,
        preservedCandidateExceptionCount: 23,
        removalInfluencedRetainedLeafCount: 292,
        provenDecayRiskCount: 0,
        heldStationMutationCount: 0,
        routeCommissioned: false,
        liveCallsPerformed: false,
        worldEditsPerformed: false,
      },
    });
  });

  it('retains single-package scoped-wrapper print-plan compatibility', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [PAVEMENT_KEY],
    });
  });
});
