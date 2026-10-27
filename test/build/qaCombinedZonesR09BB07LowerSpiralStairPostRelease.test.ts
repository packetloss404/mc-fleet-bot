import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09b_b07_lower_spiral_stair_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09b-live-20260821T173228Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r09b-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r09b-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09b-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string | string[]>;
  bindings: Record<string, unknown>;
  geometry: Record<string, ExactSet>;
  exactState: Record<string, unknown>;
  walkability: Record<string, number | boolean | string>;
  cap: Record<string, number | boolean | string | Record<string, number>>;
  interfaces: Record<string, Record<string, number | string | Record<string, number>>>;
  drift: Record<string, number>;
  executionEvidence: Record<string, Record<string, unknown>>;
  checks: Array<{ id: string; status: string }>;
  functionalHold: Record<string, boolean | string>;
  summary: Record<string, number | boolean>;
  safetyBoundary: Record<string, boolean>;
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T17:45:00Z',
    '--ledger', path.join(EVIDENCE, 'evidence-ledger.json'),
    '--post-root', path.join(
      ROOT,
      'data/worldsnap-combined-zones-r09b-post-20260821T173228Z',
    ),
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R09B B07 lower spiral stair post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte with parameterized bindings', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the completed ledger, manifest, and immutable saves', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R09B_EXACT_BUILD_POSTSTATE_VERIFIED_ROUTE_COMMISSIONING_HOLD',
      qaPayloadSha256:
        'cbc3a98e84234b2762b6e8ede97e297eec0b09ed6add7bbcc41460ce8a93e565',
      release: {
        transactionId: 'combined-zones-r09b-b07-lower-spiral-stair',
        releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
        manifestIdentity:
          '3ce00f8f00830ea82894c64c8d6a7c72bf29e24c2d9a6b1414ff675cacf8f472',
        sourceBoundReleaseIdentitySha256:
          '9d4452e9fe9799e4e621083d5ba4489e0e7e67003c1b6a30a79308ef60380687',
        completedReleaseIdentitySha256:
          'cdd7df171ea63e5a04801f04929204c1b8d6c565a1b7e338717f80bbc6aed65a',
      },
      bindings: {
        ledger: {
          sha256: '31ff63f830fee58cd14c629cd54f0be477c58c2b0c8f422316a5a6c60c3c8dc3',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'bc54ba091e1535ca49a2d844cb5ae0c6e2511a2c7dcb6fe18d0a5d2bccd0be86',
        },
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            'ba530de5a6d2148da8766d94dc817c92c845a7542a2625db3c5a4ba881f9feee',
          regionSnapshotSha256:
            '1cfd7970184bb9f944df472a1702a3328e03eb61020b77540ba42384b09fa6bc',
        },
        postCompleteSave: {
          completeSaveSha256:
            '9be9ed738ea806ddeb729d5681a890f77830f03ed49987e4129d18a2138040a4',
          regionSnapshotSha256:
            '12af0520adee3bff309cb2f21a160419776e178ae833f0d7b5a20c3d184ed1cf',
        },
      },
    });
  });

  it('proves exact state, helix progression, clearance, and zero undeclared drift', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      staticCore: { cellCount: 1575 },
      slabHelixAndLanding: {
        cellCount: 128,
        coordinateSetSha256:
          'cd994ef33913e8565b11c59e0e89155bdac015266a9d3ac006af3b68b28d2640',
      },
      upperHoldMarker: { cellCount: 2 },
      operatedUnion: {
        cellCount: 1705,
        coordinateSetSha256:
          '7397619da80fe765bffa55e4698f327597d9f6c2adf8e65ac20b171cd352799c',
      },
      helixClearance: { cellCount: 256 },
      r09aDeclaredStairInterface: { cellCount: 54 },
      r09aRetainedOpenPlanes: { cellCount: 72 },
    });
    expect(report.exactState).toMatchObject({
      sourceOperatedCensus: { 'minecraft:air': 1705 },
      postOperatedCensus: {
        'minecraft:polished_andesite': 1575,
        'minecraft:smooth_stone_slab[type=top,waterlogged=false]': 66,
        'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]': 62,
        'minecraft:polished_diorite': 2,
      },
      sourceMatchingCellCount: 1705,
      sourceMismatchCount: 0,
      postMatchingCellCount: 1705,
      postMismatchCount: 0,
      exactReverseOrderInverse: true,
    });
    expect(report.walkability).toMatchObject({
      orderedCellCount: 128,
      orderedCellSha256:
        '0fee56a61014f8f5efdf3f6307056af29b35720cd58791c452cbd948241b4ed8',
      cardinallyContiguous: true,
      minimumSurfaceY2: -115,
      maximumSurfaceY2: 8,
      maximumRiseHalfBlocks: 1,
      clearanceCellCount: 256,
      clearanceAirCellCount: 256,
      clearanceMismatchCount: 0,
    });
    expect(report.drift).toEqual({
      dryEnvelopeChangedCellCount: 1705,
      dryEnvelopeUndeclaredChangedCellCount: 0,
      interactionHaloChangedCellCount: 1705,
      interactionHaloUndeclaredChangedCellCount: 0,
    });
  });

  it('proves R09A/R06 preservation and execution/rollback integrity', () => {
    const report = readReport();
    expect(report.interfaces).toMatchObject({
      r09a: {
        floorUnchangedCellCount: 63,
        floorChangedCellCount: 0,
        declaredPriorAirInterfaceCellCount: 54,
        retainedOpenCellCount: 72,
        retainedOpenMismatchCount: 0,
      },
      r06: {
        operatedCellCount: 1530,
        targetIntersectionCellCount: 0,
        unchangedCellCount: 1530,
        changedCellCount: 0,
      },
    });
    expect(report.executionEvidence).toMatchObject({
      strictForwardExecution: {
        successfulGroups: 1705,
        failedGroups: 0,
        noopCommands: 0,
        unknownReplyCommands: 0,
        worldEditLeftoverCount: 0,
        allTemporaryChunksReleased: true,
        forceLoadSetRestored: true,
        passed: true,
      },
      rollbackPoststatePreflight: {
        passedGuards: 1705,
        failedGuards: 0,
        passed: true,
      },
      containment: {
        blockingBlockEntityCount: 0,
        blockingEntityHitCount: 0,
        passed: true,
      },
    });
    expect(report.checks).toHaveLength(16);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
  });

  it('keeps the route uncommissioned until fall protection and cap are corrected', () => {
    const report = readReport();
    expect(report.walkability).toMatchObject({
      outwardAirCellCount: 67,
      materialOutwardDropCount: 61,
      fallProtectionComplete: false,
    });
    expect(report.cap).toMatchObject({
      exactPolishedDioriteCellCount: 2,
      climbSpaceStateCensus: { 'minecraft:air': 2 },
      physicallyUnclimbable: false,
      classification: 'EXACT_TWO_CELL_MARKER_NOT_A_FAIL_CLOSED_PLAYER_BARRIER',
    });
    expect(report.functionalHold).toMatchObject({
      active: true,
      id: 'R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER',
      worldCorrectionPerformed: false,
      routeCommissioned: false,
    });
    expect(report.summary).toMatchObject({
      exactConstructionPassed: true,
      routeCommissionable: false,
      outwardDropHazardCount: 61,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
