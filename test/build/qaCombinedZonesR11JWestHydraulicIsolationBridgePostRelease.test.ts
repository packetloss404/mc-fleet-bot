import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE = path.join(
  ROOT, 'data/world-review/combined-zones-r11j-live-20260822T041217Z',
);
const LEDGER = path.join(LIVE, 'evidence-ledger.json');
const QA = path.join(LIVE, 'r11j-post-release-qa.json');
const SEAL = path.join(LIVE, 'r11j-bridge-commissioning-seal.json');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11j-post-qa-'),
);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R11J post-release QA and bounded bridge seal', () => {
  it('reproduces the canonical QA and seal independently of output paths', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    const seal = path.join(temporaryDirectory, 'seal.json');
    const sealMd = path.join(temporaryDirectory, 'seal.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11j_c1_west_hydraulic_isolation_bridge_post_release.mjs',
      '--ledger', LEDGER,
      '--out', out,
      '--md-out', md,
      '--seal-out', seal,
      '--seal-md-out', sealMd,
      '--generated-at', '2026-08-22T04:25:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(seal)).toEqual(fs.readFileSync(SEAL));
  });

  it('accepts every target, support, hydraulic, preservation, and execution gate', () => {
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
        'f8346331f08e6732f6aef66601460c8d893ab59c538feef2b12ac174a68ce82a',
      release: {
        manifestSha256:
          '176b16fa7c20d28aa79353dac70d436237032311b7dc0917968519a89b80ccbb',
        completedReleaseIdentitySha256:
          '55a1d48d0573daeee857ba163a97ae24b6e9d772cd4876686ec844c25bb8e5ac',
      },
      checks: {
        exactTargetCount: 411,
        exactInverseReadyCount: 411,
        supportOperationCellCount: 273,
        supportFrameworkCellCount: 344,
        retainedSupportCellCount: 71,
        supportFrameworkFaceComponentCount: 1,
        durableAnchorCount: 102,
        sourceGravityCellCount: 4,
        durableGravityTerminalCount: 4,
        surfaceCellCount: 94,
        stableSurfaceCellCount: 94,
        fullHeadroomAirCount: 188,
        interactionHaloCellCount: 1_792,
        boundedDiffCount: 411,
        boundedOffTargetDiffCount: 0,
        sourceHaloFluidCount: 0,
        postHaloFluidCount: 0,
        retainedGenericFluidCount: 38,
        retainedGenericFluidDriftCount: 0,
        minimumFluidVerticalIsolationBlocks: 23,
        priorR11TargetCellCount: 8_409,
        priorR11DriftCount: 0,
        boundedR11JR11HSurfaceCellCount: 449,
        boundedR11JR11HSurfaceComponentCount: 1,
        boundedR11JR11HMaximumStep: 1,
        combinedAcceptedSurfaceCellCount: 620,
        combinedAcceptedSurfaceComponentCount: 1,
        ledgerStageCount: 24,
        ledgerFailedStageCount: 0,
        executionJournalLineCount: 834,
        liveEntityBlockingCount: 0,
        blockEntityBlockingCount: 0,
      },
      acceptance: {
        exactPhysicalStateAccepted: true,
        exactRollbackReady: true,
        r11hFailedSafeChainPreserved: true,
        snapshotBoundRetainedHydraulicBaselinePreserved: true,
        boundedAcceptedIslandConnectivityPresent: true,
        wholeRouteCommissioned: false,
        hydraulicCapacityCommissioned: false,
      },
    });
  });

  it('seals the bounded bridge without overclaiming hydraulic or route commission', () => {
    const seal = JSON.parse(fs.readFileSync(SEAL, 'utf8')) as {
      status: string;
      sealPayloadSha256: string;
      acceptedGeometry: Record<string, number>;
      acceptedRetainedHydraulicBaseline: Record<string, number | string>;
      nonClaims: string[];
    };
    expect(seal).toMatchObject({
      status: 'R11J_BOUNDED_STATIC_HYDRAULIC_ISOLATION_BRIDGE_POST_QA_PASS',
      sealPayloadSha256:
        'b4b8221d3e5e479f89627daf439d929c594a77393eefbabb4ab19df6505b803b',
      acceptedGeometry: {
        targetCellCount: 411,
        supportFrameworkCellCount: 344,
        surfaceCellCount: 94,
        fullHeadroomCellCount: 188,
        boundedR11JR11HSurfaceCellCount: 449,
        boundedR11JR11HSurfaceMaximumStep: 1,
        combinedSurfaceCellCount: 620,
        combinedSurfaceComponentCount: 1,
      },
      acceptedRetainedHydraulicBaseline: {
        fluidCellCount: 38,
        fluidCoordinateSetSha256:
          '9420c2416b642efada997f299f1e0127636c6dbd8bed750bb10de78984c09ce8',
        minimumVerticalIsolationBlocks: 23,
      },
    });
    expect(seal.nonClaims).toContain('whole C1 corridor commissioning');
    expect(seal.nonClaims).toContain('hydraulic capacity');
  });
});
