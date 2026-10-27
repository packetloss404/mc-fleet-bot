import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09h_b07_transition_clearance_correction_post_release.mjs',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09h-post-release-qa.json',
);

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, unknown>;
  bindings: Record<string, unknown>;
  exactState: Record<string, unknown>;
  geometry: Record<string, Record<string, unknown> | unknown>;
  drift: Record<string, unknown>;
  preservation: Record<string, unknown>;
  executionEvidence: Record<string, unknown>;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

let output = '';
let report: QaReport;

beforeAll(() => {
  output = execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as QaReport;
}, 30_000);

describe('CZ-R09H B07 transition-clearance correction independent post-release QA', () => {
  it('seals the completed release and immutable source/post identities', () => {
    expect(JSON.parse(output)).toMatchObject({
      status: 'PASS_R09H_B07_TRANSITION_CLEARANCE_POSTSTATE_VERIFIED_REVERSIBLE',
      qaPayloadSha256:
        '798da0552e482a230f98047b36be294b936ae96d8c3ef1c29ee2a36038ef1a47',
    });
    expect(report).toMatchObject({
      release: {
        manifestIdentity: 'bd6956937446fa89b119df85e6daca21415ff2892f72195966d8d0d0259904e4',
        completedReleaseIdentitySha256:
          'dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5',
      },
      bindings: {
        sourceCompleteSaveSha256:
          'a84b68b846a9bbac480a07a48bdc8de9374b601ce189cd3413d8c53912b88f01',
        postCompleteSaveSha256:
          'ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684',
      },
    });
  });

  it('verifies both exact diorite-to-air transitions and their inverse', () => {
    expect(report.exactState).toMatchObject({
      targetCellCount: 2,
      sourceMatchingCellCount: 2,
      postMatchingCellCount: 2,
      sourceState: 'minecraft:polished_diorite',
      targetState: 'minecraft:air',
      exactReverseOrderInverse: true,
    });
    expect(report.geometry.correctedClearanceCells).toMatchObject({
      cellCount: 2,
      coordinateSetSha256:
        '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
    });
  });

  it('proves route continuity, complete clearance, and the backed apertures', () => {
    expect(report.geometry).toMatchObject({
      orderedStairRoute: {
        cellCount: 111,
        cardinallyContiguous: true,
        maximumRiseHalfBlocks: 1,
      },
      headClearance: { cellCount: 222, airCellCount: 222 },
      fallBoundary: {
        cellCount: 216,
        collisionCellCount: 214,
        floorBackedInternalApertureCount: 2,
      },
      transitionBackingFloors: { cellCount: 2 },
      transitionLowerVoid: { cellCount: 2 },
      transitionCeiling: { cellCount: 2 },
    });
  });

  it('classifies the only off-target transition as normal pier-shadow lifecycle', () => {
    expect(report.drift).toMatchObject({
      haloChangedCellCount: 3,
      haloDeclaredOperationChangedCellCount: 2,
      haloAcceptedLifecycleChangedCellCount: 1,
      haloUnclassifiedChangedCellCount: 0,
      b07InteractionCellCount: 13608,
      b07InteractionChangedCellCount: 3,
      b07InteractionUnclassifiedChangedCellCount: 0,
      lifecycleTransitionCellCount: 1,
      lifecycleCausality: {
        classification: 'NORMAL_GRASS_TO_DIRT_UNDER_LONG_STANDING_OPAQUE_R07J_PIER',
        operationTargetIntersectionCount: 0,
        supportLossCreated: false,
      },
      mechanismChangedCellCount: 0,
    });
  });

  it('preserves the wet/exterior envelope, supported sand, fixtures, entities, and prior state', () => {
    expect(report.preservation).toMatchObject({
      lowerWetContainmentDeckCellCount: 49,
      doorlessHeadhouseWallCellCount: 72,
      headhouseRoofCellCount: 49,
      passiveFixtureCellCount: 8,
      supportedSandCellCount: 6,
      priorR07jR09efgUnionCellCount: 1617,
      retainedPriorCellCount: 1615,
      retainedPriorChangedCellCount: 0,
      sourceMechanismCellCount: 0,
      postMechanismCellCount: 0,
      sourceBlockEntityCount: 0,
      postBlockEntityCount: 0,
      sourceSavedEntityCount: 0,
      postSavedEntityCount: 0,
    });
  });

  it('passes all 16 checks with strict execution, rollback, and commissioning holds', () => {
    expect(report.executionEvidence).toMatchObject({
      stageCount: 17,
      evidenceBindingCount: 17,
      evidenceBindingFailureCount: 0,
      successfulGroupCount: 2,
      noopCommandCount: 0,
      journalEntryCount: 10,
      journalComplete: true,
      rollbackPassed: 2,
      rollbackFailed: 0,
    });
    expect(report.summary).toMatchObject({
      passed: true,
      checkCount: 16,
      passCount: 16,
      failCount: 0,
      rollbackReadyCellCount: 2,
    });
    expect(report.safetyBoundary).toMatchObject({
      lowerWetInterfaceOpened: false,
      exteriorOpeningCreated: false,
      mechanismOrControlCommissioned: false,
      publicRouteCommissionedByThisQa: false,
      commissioningRequiresSeparateBoundedFunctionalSeal: true,
      liveCallsPerformedByQa: false,
      worldMutationPerformedByQa: false,
    });
  });
});
