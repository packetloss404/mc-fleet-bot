import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09d_b07_terminal_crown_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09d-live-20260821T181124Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09d-post-qa-'),
);
const temporaryArtifacts = [
  path.join(temporaryDirectory, 'qa.json'),
  path.join(temporaryDirectory, 'qa.md'),
  path.join(temporaryDirectory, 'seal.json'),
  path.join(temporaryDirectory, 'seal.md'),
];

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string>;
  bindings: Record<string, unknown>;
  exactState: Record<string, unknown>;
  preservation: Record<string, Record<string, unknown>>;
  containment: Record<string, unknown>;
  reachability: Record<string, unknown>;
  drift: Record<string, unknown>;
  executionEvidence: Record<string, Record<string, unknown>>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

interface Seal {
  status: string;
  commissioningSealSha256: string;
  completedReleaseIdentitySha256: string;
  postQaPayloadSha256: string;
  commissionedRoute: Record<string, unknown>;
  holdDisposition: Record<string, unknown>;
  excludedCommissioning: Record<string, boolean>;
  safetyBoundary: Record<string, boolean>;
}

const readJson = <T>(filename: string): T => JSON.parse(
  fs.readFileSync(filename, 'utf8'),
) as T;
const report = () => readJson<QaReport>(path.join(EVIDENCE, 'r09d-post-release-qa.json'));
const seal = () => readJson<Seal>(path.join(
  EVIDENCE,
  'r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.json',
));

let firstRun: Buffer[];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T18:16:00Z',
    '--evidence-dir', 'data/world-review/combined-zones-r09d-live-20260821T181124Z',
    '--ledger',
    'data/world-review/combined-zones-r09d-live-20260821T181124Z/evidence-ledger.json',
    '--manifest',
    'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
    '--source-root', 'data/worldsnap-combined-zones-r09d-source-20260821T181124Z',
    '--post-root', 'data/worldsnap-combined-zones-r09d-post-20260821T181124Z',
    '--out', temporaryArtifacts[0],
    '--markdown', temporaryArtifacts[1],
    '--seal-out', temporaryArtifacts[2],
    '--seal-markdown', temporaryArtifacts[3],
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstRun = temporaryArtifacts.map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09D B07 terminal crown post-release QA', () => {
  it('regenerates the QA and commissioning artifacts byte-for-byte', () => {
    expect(temporaryArtifacts.map((filename) => fs.readFileSync(filename))).toEqual(firstRun);
    expect(firstRun).toEqual([
      fs.readFileSync(path.join(EVIDENCE, 'r09d-post-release-qa.json')),
      fs.readFileSync(path.join(EVIDENCE, 'r09d-post-release-qa.md')),
      fs.readFileSync(path.join(
        EVIDENCE,
        'r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.json',
      )),
      fs.readFileSync(path.join(
        EVIDENCE,
        'r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.md',
      )),
    ]);
  });

  it('binds the completed R09D execution and immutable source/post states', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R09BCD_B07_PEDESTRIAN_ROUTE_COMMISSIONABLE_TO_RETAINED_UPPER_HOLD',
      qaPayloadSha256:
        '4b0ad0de583c16b7d32b9829ee3ac8e31afa25c7b03be6aa930087f837e81584',
      release: {
        manifestIdentity:
          'eba26411e7076fd30899c891b57677a48e8daba8772897bb998e42f8bf1d58a0',
        sourceBoundReleaseIdentitySha256:
          'e25c7b13d89bc4d8844ab7af9ab82051e9938ef874660ef821d1ea2a0bd32eda',
        completedReleaseIdentitySha256:
          '39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0',
      },
      bindings: {
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            'e1cb5bedd1e3418369f180dcaf33f5255e2ba0c1475e98f183a8d1d4ea6703e5',
          regionSnapshotSha256:
            '0f9ed0124674574786428a5d1b83350142f4f4b576bfa64a6dbb84a1a8674bdc',
        },
        postCompleteSave: {
          completeSaveSha256:
            '899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac',
          regionSnapshotSha256:
            '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
        },
      },
    });
  });

  it('proves exact R09D state and preserves every R09B/R09C cell', () => {
    expect(report()).toMatchObject({
      exactState: {
        sourceCrownCensus: { 'minecraft:air': 16 },
        postCrownCensus: { 'minecraft:polished_andesite': 16 },
        sourceMatchingCellCount: 16,
        sourceMismatchCount: 0,
        postMatchingCellCount: 16,
        postMismatchCount: 0,
        exactReverseOrderInverse: true,
      },
      preservation: {
        r09c: { unchangedCellCount: 127, changedCellCount: 0, desiredStateMismatchCount: 0 },
        r09b: { unchangedCellCount: 1705, changedCellCount: 0, desiredStateMismatchCount: 0 },
        r09aFloor: { unchangedCellCount: 63, changedCellCount: 0 },
        r06: { unchangedCellCount: 1530, changedCellCount: 0 },
      },
      drift: {
        verificationDomainChangedCellCount: 16,
        declaredCrownChangedCellCount: 16,
        undeclaredChangedCellCount: 0,
      },
    });
  });

  it('proves full containment, headroom, and zero all-diagonals hold bypass', () => {
    expect(report()).toMatchObject({
      containment: {
        containedStairPositionCount: 128,
        uncontainedStairPositionCount: 0,
        controlledLowClearanceOverhangCount: 1,
        headClearanceAirCellCount: 256,
        headClearanceMismatchCount: 0,
      },
      reachability: {
        model:
          'CONSERVATIVE_EIGHT_NEIGHBOUR_PLAYER_SURFACE_GRAPH_WITH_ONE_BLOCK_MAX_RISE_AND_ALL_DIAGONALS_ADMITTED',
        diagonalPolicy: 'ADMIT_ALL_DIAGONALS_AS_CONSERVATIVE_OVER_APPROXIMATION',
        terminalRouteSurfaceCount: 5,
        directCoreEntryEdgeCountBeforeCrown: 11,
        reachableForbiddenSurfaceCountBeforeCrown: 26,
        directForbiddenEntryEdgeCountAfterCrown: 0,
        reachableForbiddenSurfaceCountAfterCrown: 0,
        reachableForbiddenSurfacesAfterCrown: [],
        crownMinimumRiseAboveLandingHalfBlocks: 4,
        noCoreCapOrBarrierBypass: true,
      },
      summary: {
        passed: true,
        checkCount: 19,
        passCount: 19,
        failCount: 0,
        routeCommissionableToRetainedUpperHold: true,
      },
    });
    expect(report().checks.every(({ status }) => status === 'PASS')).toBe(true);
  });

  it('binds strict journaled execution, rollback, and containment gates', () => {
    expect(report().executionEvidence).toMatchObject({
      strictForwardExecution: {
        operationSha256:
          '153b7df51c39981a2c15bb2e2f49130ea83f176eeb8740fb4cf6313233b3d05b',
        successfulGroups: 16,
        failedGroups: 0,
        noopCommands: 0,
        unknownReplyCommands: 0,
        streamJournalSha256:
          'a2bce18261ef76a165129c633fdd91f77d09efb62f46e46650cf5a51d8505bb2',
        passed: true,
      },
      rollbackPoststatePreflight: {
        opsSha256:
          '320826cfd8438dab06855e5ee666fe2090cbd517712a50fdc353b5006362bb56',
        passedGuards: 16,
        failedGuards: 0,
        regionSnapshotSha256:
          '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
        passed: true,
      },
      containmentGates: { passed: true },
    });
    expect(report().safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });

  it('lifts only the scoped route hold and retains every excluded system hold', () => {
    expect(seal()).toMatchObject({
      status: 'COMMISSIONED_R09BCD_B07_PEDESTRIAN_CIRCULATION_TO_RETAINED_UPPER_HOLD',
      commissioningSealSha256:
        'ef8c5882dca854ff67f107597ae62ad74453f6eb656e3f390d0307c9052ca85b',
      completedReleaseIdentitySha256:
        '39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0',
      postQaPayloadSha256:
        '4b0ad0de583c16b7d32b9829ee3ac8e31afa25c7b03be6aa930087f837e81584',
      commissionedRoute: {
        containedStairPositionCount: 128,
        headClearanceAirCellCount: 256,
        reachableForbiddenCoreOrCapSurfaceCount: 0,
        terminalHoldBypassable: false,
      },
      holdDisposition: {
        liftedHoldId: 'R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER',
        liftedOnlyFor: 'PEDESTRIAN_CIRCULATION_FROM_LOWER_LOBBY_TO_RETAINED_UPPER_HOLD',
        remainsClosedBeyondUpperHold: true,
      },
      excludedCommissioning: {
        wetZone: true,
        lift: true,
        smokeSystem: true,
        powerSystem: true,
        drainageOrOutfall: true,
        upperShaftOrSurfaceOpening: true,
      },
      safetyBoundary: {
        issuedFromReadOnlyPostQa: true,
        liveCallsPerformed: false,
        worldEditsPerformed: false,
      },
    });
  });
});
