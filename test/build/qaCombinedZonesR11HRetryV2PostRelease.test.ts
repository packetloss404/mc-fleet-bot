import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE_DIRECTORY = path.join(
  ROOT,
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z',
);
const LEDGER = path.join(LIVE_DIRECTORY, 'evidence-ledger.json');
const CANONICAL_QA = path.join(LIVE_DIRECTORY, 'r11h-retry-v2-post-release-qa.json');
const CANONICAL_SEAL = path.join(
  LIVE_DIRECTORY,
  'r11h-retry-v2-bridge-commissioning-seal.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11h-retry-v2-post-qa-'),
);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11H retry-v2 post-release QA and commissioning seal', () => {
  it('reproduces the canonical QA and seal byte-for-byte outside their output directory', () => {
    const temporaryQa = path.join(temporaryDirectory, 'qa.json');
    const temporaryMd = path.join(temporaryDirectory, 'qa.md');
    const temporarySeal = path.join(temporaryDirectory, 'seal.json');
    const temporarySealMd = path.join(temporaryDirectory, 'seal.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11h_retry_v2_c1_hydraulic_isolation_bridge_post_release.mjs',
      '--ledger', LEDGER,
      '--out', temporaryQa,
      '--md-out', temporaryMd,
      '--seal-out', temporarySeal,
      '--seal-md-out', temporarySealMd,
      '--generated-at', '2026-08-22T03:40:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(fs.readFileSync(temporarySeal)).toEqual(fs.readFileSync(CANONICAL_SEAL));
  });

  it('accepts all exact geometry, hydraulic, compensation, and rollback gates', () => {
    const report = JSON.parse(fs.readFileSync(CANONICAL_QA, 'utf8')) as {
      status: string;
      qaPayloadSha256: string;
      release: Record<string, string>;
      checks: Record<string, number | boolean>;
      compensationAndRetryChain: Record<string, string | number>;
      acceptance: Record<string, boolean>;
    };
    expect(report).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        '5ccd20fbb3ec4c89465e09f17f09cccc1922340d234f3ea59bef16dd34e433c5',
      release: {
        manifestSha256:
          '6a4dd03ff84d1e0af05e0c3f5f81aa5b2347abc05f363dd4657959a3c9d48d79',
        manifestIdentitySha256:
          'bfc9064f966a8032c38f70eb13e52eec6995470cde7cd97b37f42ccf90253d67',
        ledgerSha256:
          'f5c1e52b479bba19329e5b39d253d4c43f5fbff6344effefc92a43cfb89b9e85',
        completedReleaseIdentitySha256:
          '04f9c6e7ae2b7734da2cfbf85d5f37cd3ba15fea257ace636f601c5acdbe815e',
      },
      compensationAndRetryChain: {
        failedLedgerStatus: 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW',
        retryLifecycleReboundCount: 2,
      },
      checks: {
        exactFinalTargetCount: 1_666,
        exactInverseReadyCount: 1_666,
        surfaceCellCount: 355,
        surfaceComponentCount: 1,
        maxSurfaceStep: 1,
        stableSupportedSurfaceCellCount: 355,
        fullHeadroomCellCount: 710,
        headroomCutCount: 667,
        foundationCellCount: 636,
        beamCellCount: 5,
        dependencyCellCount: 3,
        supportComponentCount: 11,
        durableAnchoredSupportComponentCount: 11,
        interactionHaloCellCount: 7_120,
        boundedDiffCount: 1_666,
        boundedOffTargetDiffCount: 0,
        sourceHaloFluidCount: 0,
        postHaloFluidCount: 0,
        hydraulicReviewCellCount: 7_561,
        retainedSourceFluidCount: 45,
        retainedPostFluidCount: 45,
        retainedFluidComponentCount: 1,
        retainedFluidMinimumTargetDistance: 2,
        hydraulicOffTargetDiffCount: 0,
        priorR11TargetCellCount: 6_426,
        priorR11DriftCount: 0,
        ledgerStageCount: 24,
        ledgerFailedStageCount: 0,
        executionJournalCount: 2,
        executionJournalLineCount: 3_344,
        liveEntityBlockingCount: 0,
        blockEntityBlockingCount: 0,
        liveCallsPerformedByQa: false,
        worldEditsPerformedByQa: false,
      },
      acceptance: {
        bridgePhysicalStateAccepted: true,
        routeSegmentCommissioned: false,
        hydraulicBaselinePreserved: true,
        exactRollbackReady: true,
        safeSourceForNextDisjointR11Engineering: true,
      },
    });
  });

  it('seals only the bounded static segment and its snapshot-bound fluid baseline', () => {
    const seal = JSON.parse(fs.readFileSync(CANONICAL_SEAL, 'utf8')) as {
      status: string;
      sealPayloadSha256: string;
      acceptedGeometry: Record<string, number>;
      acceptedHydraulicBaseline: Record<string, number | string>;
      nonClaims: string[];
      safetyBoundary: Record<string, boolean>;
    };
    expect(seal).toMatchObject({
      status: 'COMMISSIONED_STATIC_BRIDGE_SEGMENT_POST_QA_PASS',
      sealPayloadSha256:
        'c95112fae1eee22daea368be66e72a49e745f4304d206176148934cc430c9788',
      acceptedGeometry: {
        targetCellCount: 1_666,
        surfaceCellCount: 355,
        headroomCellCount: 710,
        foundationCellCount: 636,
        beamCellCount: 5,
      },
      acceptedHydraulicBaseline: {
        fluidCellCount: 45,
        componentCount: 1,
        coordinateSetSha256:
          'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8',
        minimumTargetChebyshevDistance: 2,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
      },
    });
    expect(seal.nonClaims).toContain('hydraulic capacity');
    expect(seal.nonClaims).toContain('whole-corridor connectivity');
  });
});
