import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r08_north_galleria_retail_shells_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r08n-live-20260821T180151Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r08n-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r08n-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08n-post-qa-'));
const temporaryJson = path.join(temporaryDirectory, 'r08n-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r08n-post-release-qa.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: {
    transactionId: string;
    releaseNodeId: string;
    canonicalOwner: string;
    manifestIdentity: string;
    executionBindingSha256: string;
    completedReleaseIdentitySha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string };
    sourceCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    postCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    ledgerEvidence: { declaredBindingCount: number; matchingBindingCount: number; mismatchCount: number };
  };
  geometry: {
    fullShellUnion: ExactSet;
    operatedUnion: ExactSet;
    completeBoundaryUnion: ExactSet;
    connectedInteriorUnion: ExactSet;
    closedTenantFaceUnion: ExactSet;
    interactionHalo: ExactSet;
    floorContacts: ExactSet;
    shellTopology: {
      shells: { componentCount: number; largestComponentCellCount: number };
      boundaries: { componentCount: number; largestComponentCellCount: number };
      interiors: { componentCount: number; largestComponentCellCount: number };
    };
  };
  postState: {
    operatedTargets: { matchingCellCount: number; mismatchCellCount: number };
    fullTargets: { matchingCellCount: number; mismatchCellCount: number; stateCensus: Record<string, number> };
    shells: Array<{
      completeBoundary: { cellCount: number; lightGrayConcreteCount: number; openingCount: number; connectivity: { componentCount: number } };
      connectedInteriorVoid: { cellCount: number; airCount: number; nonAirCount: number; connectivity: { componentCount: number } };
      closedTenantFace: { cellCount: number; lightGrayConcreteCount: number; openingCount: number };
    }>;
    tenantBoundary: Record<string, number | boolean>;
    floorStability: Record<string, number | boolean>;
    retainedGravityHalo: Record<string, number>;
    preservedInteraction: Record<string, number>;
    postBlockEntityIntersectionCount: number;
    postSavedEntityIntersectionCount: number;
  };
  executionEvidence: {
    stageOrder: { expectedStageCount: number; actualStageCount: number; exact: boolean; allPass: boolean };
    packageOrder: { forward: string[]; rollback: string[] };
    packages: Array<{ commandCount: number; successfulCommands: number; rollbackGuardCount: number; strictNoop: boolean; zeroNoops: boolean }>;
    strictForwardExecution: { packageCount: number; successfulCommandCount: number; failedCommandCount: number; noopCommandCount: number; passed: boolean };
    reverseRollbackPoststatePreflight: { packageCount: number; passedGuardCount: number; failedGuardCount: number; regionSnapshotSha256: string; passed: boolean };
  };
  summary: Record<string, number>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    serviceMutationsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

const readReport = (filename = CANONICAL_JSON): QaReport => (
  JSON.parse(fs.readFileSync(filename, 'utf8')) as QaReport
);

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T18:08:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08N north-galleria post-release QA seal', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds every terminal ledger, manifest, evidence, and snapshot identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R08N_NORTH_GALLERIA_RETAIL_SHELLS_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: 'ebf20922db949c22581b04aea64cb44c48801b2b9b21ecba4c4db8d229c1d585',
      release: {
        transactionId: 'combined-zones-r08-north-galleria-capped-retail-shells',
        releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
        canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
        manifestIdentity: '67c8cc3edbb6b534932e9169b5f2126e74ba2405ae7ead635f88e2ef90d19778',
        executionBindingSha256: '65705b7cd348f8dadce1a3abf4a776b169f220951b85c4fe91d2816a4e569edd',
        completedReleaseIdentitySha256: '3b223d0482b9acabea43b864b41a9a72ddc285766dcbffe12e69d52ac142c70a',
      },
      bindings: {
        ledger: {
          sha256: 'f65dcb8181519a505bf608bb2b08fcda41741f484a2774eb60540cc8e2dd7dfb',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'a3aa07124982d48dab0463f68f9c02df4ef7a1b30c14b81c6474ec25f52d11b0',
        },
        sourceCompleteSave: {
          completeSaveSha256: '379c8c52b9629f3ae7c3aeb22796051ae7ba8ff01983790692475926d36a912b',
          regionSnapshotSha256: '9286b06baf3cb2135c2daf13bf119a1928f08c12f67cee3c1ff300cbcc5f5356',
        },
        postCompleteSave: {
          completeSaveSha256: '083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c',
          regionSnapshotSha256: '6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e',
        },
        ledgerEvidence: { declaredBindingCount: 81, matchingBindingCount: 81, mismatchCount: 0 },
      },
    });
  });

  it('proves all nine complete boundaries, connected air voids, and closed tenant faces', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      fullShellUnion: {
        cellCount: 3888,
        coordinateSetSha256: '0d303b5f35a5d52c51139395b1463d77f4953cdd091393b69a49438869d49a46',
      },
      operatedUnion: {
        cellCount: 3878,
        coordinateSetSha256: '167ba260735dd809e64fc2f8eef7760dc91e29145e55ccbb88cbd150297a3ab9',
      },
      completeBoundaryUnion: { cellCount: 2628 },
      connectedInteriorUnion: { cellCount: 1260 },
      closedTenantFaceUnion: { cellCount: 108 },
      shellTopology: {
        shells: { componentCount: 9, largestComponentCellCount: 432 },
        boundaries: { componentCount: 9, largestComponentCellCount: 292 },
        interiors: { componentCount: 9, largestComponentCellCount: 140 },
      },
    });
    expect(report.postState.fullTargets).toEqual({
      matchingCellCount: 3888,
      mismatchCellCount: 0,
      stateCensus: {
        'minecraft:light_gray_concrete': 2628,
        'minecraft:air': 1260,
      },
    });
    expect(report.postState.shells).toHaveLength(9);
    expect(report.postState.shells.every((shell) => (
      shell.completeBoundary.cellCount === 292
      && shell.completeBoundary.lightGrayConcreteCount === 292
      && shell.completeBoundary.openingCount === 0
      && shell.completeBoundary.connectivity.componentCount === 1
      && shell.connectedInteriorVoid.cellCount === 140
      && shell.connectedInteriorVoid.airCount === 140
      && shell.connectedInteriorVoid.nonAirCount === 0
      && shell.connectedInteriorVoid.connectivity.componentCount === 1
      && shell.closedTenantFace.cellCount === 12
      && shell.closedTenantFace.lightGrayConcreteCount === 12
      && shell.closedTenantFace.openingCount === 0
    ))).toBe(true);
  });

  it('proves stable unchanged floor/halo contacts and zero undeclared drift', () => {
    expect(readReport().postState).toMatchObject({
      operatedTargets: { matchingCellCount: 3878, mismatchCellCount: 0 },
      tenantBoundary: {
        completeBoundaryLightGrayConcreteCount: 2628,
        completeBoundaryOpeningCount: 0,
        closedTenantFaceLightGrayConcreteCount: 108,
        tenantFaceOpeningCount: 0,
        tenantFitOutAuthorized: false,
      },
      floorStability: {
        unchangedContactCount: 972,
        driftCount: 0,
        hazardousContactCount: 0,
        airContactCount: 14,
        nonAirContactCount: 958,
        staticConcreteBoundaryRequiresGravitySupport: false,
      },
      retainedGravityHalo: {
        gravelCount: 2,
        unchangedGravelCount: 2,
        stoneSupportCount: 2,
        faceAdjacentTargetCount: 0,
        violationCount: 0,
      },
      preservedInteraction: {
        haloUnchangedCount: 4428,
        haloDriftCount: 0,
        nonOperatedTargetUnchangedCount: 10,
        observedChangedCellCount: 3878,
        declaredChangedCellCount: 3878,
        undeclaredDriftCount: 0,
      },
      postBlockEntityIntersectionCount: 0,
      postSavedEntityIntersectionCount: 0,
    });
  });

  it('binds strict execution and reverse-order rollback readiness for all packages', () => {
    const evidence = readReport().executionEvidence;
    expect(evidence.stageOrder).toEqual({
      expectedStageCount: 73,
      actualStageCount: 73,
      exact: true,
      allPass: true,
    });
    expect(evidence.packageOrder.rollback).toEqual(evidence.packageOrder.forward.slice().reverse());
    expect(evidence.packages).toHaveLength(9);
    expect(evidence.packages.every((pkg) => (
      pkg.commandCount === pkg.successfulCommands
      && pkg.commandCount === pkg.rollbackGuardCount
      && pkg.strictNoop && pkg.zeroNoops
    ))).toBe(true);
    expect(evidence.strictForwardExecution).toEqual({
      packageCount: 9,
      successfulCommandCount: 3878,
      failedCommandCount: 0,
      noopCommandCount: 0,
      passed: true,
    });
    expect(evidence.reverseRollbackPoststatePreflight).toEqual({
      packageCount: 9,
      passedGuardCount: 3878,
      failedGuardCount: 0,
      regionSnapshotSha256: '6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e',
      passed: true,
    });
  });

  it('binds the QA payload and records a read-only seal', () => {
    const report = readReport();
    const { qaPayloadSha256, ...payload } = report;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(qaPayloadSha256);
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      serviceMutationsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
