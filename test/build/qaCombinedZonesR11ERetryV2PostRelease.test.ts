import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE_DIRECTORY = path.join(
  ROOT, 'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z',
);
const LEDGER = path.join(LIVE_DIRECTORY, 'evidence-ledger.json');
const CANONICAL_QA = path.join(LIVE_DIRECTORY, 'r11e-retry-v2-post-release-qa.json');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11e-retry-v2-post-qa-'),
);
const temporaryQa = path.join(temporaryDirectory, 'post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'post-release-qa.md');

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11E retry-v2 post-release seal', () => {
  it('reproduces the immutable read-only QA report byte-for-byte', () => {
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_post_release.mjs',
      '--ledger', LEDGER,
      '--out', temporaryQa,
      '--markdown', temporaryMarkdown,
      '--generated-at', '2026-08-21T23:40:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
  });

  it('seals all targets, six islands, exclusions, journals, and rollback guards', () => {
    const report = JSON.parse(fs.readFileSync(CANONICAL_QA, 'utf8')) as {
      status: string;
      qaPayloadSha256: string;
      release: Record<string, string>;
      checks: Record<string, number | boolean>;
      acceptedNaturalLifecycleTransition: {
        cell: { x: number; y: number; z: number };
        classification: string;
        operatedTarget: boolean;
      };
      islands: Array<{
        connectedSurfaceComponentCount: number;
        routeCommissioned: boolean;
      }>;
      protectedSheep: Array<{ completeNbtSha256: string }>;
    };
    expect(report).toMatchObject({
      status: 'PASS_WITH_ONE_EXACT_BENIGN_SHADED_GRASS_LIFECYCLE_TRANSITION',
      release: {
        manifestSha256:
          'db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee',
        manifestIdentitySha256:
          '29b5c6fe848a1f9396de052ffda7b431357b78d676621d0307848b7b40f8f2bd',
        completedReleaseIdentitySha256:
          '33ef91973427f9f93a5cd4af5bfa4d059979064a43fd0eb9d2fa6db4f2af3ffb',
      },
      checks: {
        ledgerStageCount: 80,
        ledgerEvidenceBindingCount: 89,
        packageCount: 10,
        includedIslandCount: 6,
        exactSourceStateCount: 1_593,
        exactTargetStateCount: 1_593,
        exactInverseRecordCount: 1_593,
        connectedSurfaceComponentCount: 6,
        interactionHaloCellCount: 8_348,
        declaredNaturalLifecycleHaloTransitionCount: 1,
        undeclaredHaloDriftCount: 0,
        omittedSheepIslandTargetCount: 2_389,
        omittedSheepIslandHaloCellCount: 10_238,
        omittedSheepIslandHaloDriftCount: 0,
        protectedSheepCount: 3,
        protectedSheepNbtDriftCount: 0,
        excludedWetRangeCount: 2,
        heldTreatmentMutationCount: 0,
        successfulExecutionGroupCount: 1_593,
        executionJournalCount: 10,
        rollbackGuardPassCount: 1_593,
        liveEntityBlockingHitCount: 0,
        blockEntityBlockingHitCount: 0,
        corridorConnectivityClaimed: false,
        liveCallsPerformed: false,
        worldEditsPerformed: false,
      },
      acceptedNaturalLifecycleTransition: {
        cell: { x: 938, y: 96, z: 32 },
        classification: 'BENIGN_NATURAL_GRASS_DECAY_UNDER_DECLARED_OPAQUE_FOUNDATION',
        operatedTarget: false,
      },
    });
    expect(report.qaPayloadSha256)
      .toBe('899982da972ee6f08f483ab04d1de9e2091ee286008b6d5f2dead7ffca73a975');
    expect(report.islands).toHaveLength(6);
    expect(report.islands.every(
      ({ connectedSurfaceComponentCount, routeCommissioned }) => (
        connectedSurfaceComponentCount === 1 && routeCommissioned === false
      ),
    )).toBe(true);
    expect(report.protectedSheep).toHaveLength(3);
    expect(new Set(report.protectedSheep.map(({ completeNbtSha256 }) => (
      completeNbtSha256
    ))).size).toBe(3);
  });
});
