import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE_DIRECTORY = path.join(
  ROOT, 'data/world-review/combined-zones-r11f-live-20260821T234824Z',
);
const LEDGER = path.join(LIVE_DIRECTORY, 'evidence-ledger.json');
const CANONICAL_QA = path.join(LIVE_DIRECTORY, 'r11f-post-release-qa.json');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11f-post-qa-'),
);
const temporaryQa = path.join(temporaryDirectory, 'post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'post-release-qa.md');

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11F post-release seal', () => {
  it('reproduces the immutable read-only QA report byte-for-byte', () => {
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_post_release.mjs',
      '--ledger', LEDGER,
      '--out', temporaryQa,
      '--markdown', temporaryMarkdown,
      '--generated-at', '2026-08-22T00:10:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
  });

  it('seals all targets, two islands, exclusions, journals, and rollback guards', () => {
    const report = JSON.parse(fs.readFileSync(CANONICAL_QA, 'utf8')) as {
      status: string;
      qaPayloadSha256: string;
      release: Record<string, string>;
      checks: Record<string, number | boolean>;
      acceptedNaturalLifecycleTransitions: Array<{
        classification: string;
        operatedTarget: boolean;
        rollbackOperationReadinessAffected: boolean;
      }>;
      islands: Array<{
        connectedSurfaceComponentCount: number;
        routeCommissioned: boolean;
      }>;
      exclusions: {
        protectedSheep: Array<{ completeNbtSha256: string }>;
        heldTreatmentReviewEnvelopes: Array<{
          driftCount: number;
          targetIntersectionCount: number;
        }>;
      };
    };
    expect(report).toMatchObject({
      status: 'PASS_WITH_FOUR_EXACT_BENIGN_SHADED_GRASS_LIFECYCLE_TRANSITIONS',
      release: {
        manifestSha256:
          '96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584',
        manifestIdentitySha256:
          'dac26f1c94dd1abb7f00ecf18e99d88dda5d8184b290d2fb06986a4c25b5bbd2',
        completedReleaseIdentitySha256:
          'a7f8c5d9f9fa81df360c146e79287ed4eba03b2128f6af428490943d3d565c86',
      },
      checks: {
        ledgerStageCount: 31,
        ledgerEvidenceBindingCount: 33,
        packageCount: 3,
        includedIslandCount: 2,
        exactSourceStateCount: 1_639,
        exactTargetStateCount: 1_639,
        exactInverseRecordCount: 1_639,
        connectedSurfaceCellCount: 551,
        connectedSurfaceComponentCount: 2,
        interactionHaloCellCount: 4_419,
        declaredNaturalLifecycleHaloTransitionCount: 4,
        undeclaredHaloDriftCount: 0,
        excludedEarlyHaloCellCount: 2_873,
        excludedEarlyHaloDriftCount: 0,
        wetRangeReviewCellCount: 464_168,
        wetRangeReviewDriftCount: 0,
        omittedSheepIslandTargetCount: 2_389,
        omittedSheepIslandHaloCellCount: 10_238,
        omittedSheepIslandHaloDriftCount: 0,
        protectedSheepCount: 3,
        protectedSheepNbtDriftCount: 0,
        heldTreatmentReviewCellCount: 50_444,
        heldTreatmentReviewDriftCount: 0,
        heldTreatmentTargetIntersectionCount: 0,
        successfulExecutionGroupCount: 1_639,
        executionJournalCount: 3,
        rollbackGuardPassCount: 1_639,
        liveEntityBlockingHitCount: 0,
        blockEntityBlockingHitCount: 0,
        corridorConnectivityClaimed: false,
        liveCallsPerformed: false,
        worldEditsPerformed: false,
      },
    });
    expect(report.qaPayloadSha256)
      .toBe('8ac43bc608ce9fdc00e1b5cacf410be6bb6f31319230e176f4aa405cd59a0596');
    expect(report.islands).toHaveLength(2);
    expect(report.islands.every(
      ({ connectedSurfaceComponentCount, routeCommissioned }) => (
        connectedSurfaceComponentCount === 1 && routeCommissioned === false
      ),
    )).toBe(true);
    expect(report.acceptedNaturalLifecycleTransitions).toHaveLength(4);
    expect(report.acceptedNaturalLifecycleTransitions.every((transition) => (
      transition.classification
        === 'BENIGN_NATURAL_GRASS_DECAY_UNDER_DECLARED_OPAQUE_FOUNDATION'
      && transition.operatedTarget === false
      && transition.rollbackOperationReadinessAffected === false
    ))).toBe(true);
    expect(report.exclusions.protectedSheep).toHaveLength(3);
    expect(new Set(report.exclusions.protectedSheep.map(({ completeNbtSha256 }) => (
      completeNbtSha256
    ))).size).toBe(3);
    expect(report.exclusions.heldTreatmentReviewEnvelopes).toHaveLength(3);
    expect(report.exclusions.heldTreatmentReviewEnvelopes.every((held) => (
      held.driftCount === 0 && held.targetIntersectionCount === 0
    ))).toBe(true);
  });
});
