import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE = path.join(
  ROOT, 'data/world-review/combined-zones-r11i-live-20260822T034802Z',
);
const LEDGER = path.join(LIVE, 'evidence-ledger.json');
const QA = path.join(LIVE, 'r11i-post-release-qa.json');
const SEAL = path.join(LIVE, 'r11i-connectivity-commissioning-seal.json');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11i-post-qa-'),
);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R11I post-release QA and bounded connectivity seal', () => {
  it('reproduces the canonical QA and seal independently of output paths', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    const seal = path.join(temporaryDirectory, 'seal.json');
    const sealMd = path.join(temporaryDirectory, 'seal.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11i_c1_retained_cut_connectivity_closure_post_release.mjs',
      '--ledger', LEDGER,
      '--out', out,
      '--md-out', md,
      '--seal-out', seal,
      '--seal-md-out', sealMd,
      '--generated-at', '2026-08-22T04:15:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(seal)).toEqual(fs.readFileSync(SEAL));
  });

  it('accepts every exact target, seam, preservation, and execution gate', () => {
    const report = JSON.parse(fs.readFileSync(QA, 'utf8')) as {
      status: string;
      qaPayloadSha256: string;
      release: Record<string, string>;
      checks: Record<string, number | boolean>;
      acceptance: Record<string, boolean>;
    };
    expect(report).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        '7606aa39bfd0f86f90ad2ccda41c2753713409a76e2ed58b35eb7502cc63bfa3',
      release: {
        manifestSha256:
          'ff8502ee21dc50e5fc1aedd997ae5b978e562a9e86115c874323dfa41981d22f',
        completedReleaseIdentitySha256:
          '2f9cebbd4bed2103d36381bce65a301023960a823ef402010e63b9cd06bb0e11',
      },
      checks: {
        exactTargetCount: 317,
        exactInverseReadyCount: 317,
        surfaceCellCount: 106,
        stableSurfaceCellCount: 106,
        fullHeadroomAirCount: 212,
        sourceGravityCellCount: 15,
        interactionHaloCellCount: 1_531,
        boundedDiffCount: 317,
        boundedOffTargetDiffCount: 0,
        sourceHaloFluidCount: 0,
        postHaloFluidCount: 0,
        combinedAcceptedSurfaceCellCount: 526,
        combinedAcceptedSurfaceComponentCount: 1,
        r11hTargetCellCount: 1_666,
        r11hTargetDriftCount: 0,
        r11hOperatedHaloDriftCount: 80,
        r11hOperatedHaloOffR11ITargetDriftCount: 0,
        r11hHydraulicSourceFluidCount: 45,
        r11hHydraulicPostFluidCount: 45,
        r11hHydraulicDiffCount: 80,
        r11hHydraulicOffR11ITargetDiffCount: 0,
        priorR11TargetCellCount: 8_092,
        priorR11DriftCount: 0,
        ledgerStageCount: 24,
        ledgerFailedStageCount: 0,
        executionJournalLineCount: 646,
        liveEntityBlockingCount: 0,
        blockEntityBlockingCount: 0,
      },
      acceptance: {
        exactPhysicalStateAccepted: true,
        exactRollbackReady: true,
        r11hFailedSafeChainPreserved: true,
        r11hSnapshotBoundHydraulicBaselinePreserved: true,
        boundedAcceptedIslandConnectivityPresent: true,
        wholeRouteCommissioned: false,
      },
    });
  });

  it('seals bounded construction without overclaiming the whole corridor', () => {
    const seal = JSON.parse(fs.readFileSync(SEAL, 'utf8')) as {
      status: string;
      sealPayloadSha256: string;
      acceptedGeometry: Record<string, number>;
      acceptedR11HHydraulicBaseline: Record<string, number | string>;
      nonClaims: string[];
    };
    expect(seal).toMatchObject({
      status: 'R11I_BOUNDED_STATIC_CONNECTIVITY_POST_QA_PASS',
      sealPayloadSha256:
        '545a8168e4b6b414514dfba3e4e25983c5bc760732be503adecca0d19a3b06a3',
      acceptedGeometry: {
        targetCellCount: 317,
        surfaceCellCount: 106,
        fullHeadroomCellCount: 212,
        combinedSurfaceCellCount: 526,
        combinedSurfaceComponentCount: 1,
      },
      acceptedR11HHydraulicBaseline: {
        reviewCellCount: 7_561,
        fluidCellCount: 45,
        fluidCoordinateSetSha256:
          'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8',
      },
    });
    expect(seal.nonClaims).toContain('whole C1 corridor commissioning');
    expect(seal.nonClaims).toContain('hydraulic capacity');
  });
});
