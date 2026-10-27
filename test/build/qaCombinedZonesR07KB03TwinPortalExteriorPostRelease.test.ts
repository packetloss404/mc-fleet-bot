import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07k_b03_twin_portal_exterior_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r07k-live-20260821T195128Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07k-post-qa-'),
);
const OUTPUT = path.join(temporaryDirectory, 'qa.json');
const MARKDOWN = path.join(temporaryDirectory, 'qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  ledger: { sha256: string };
  manifest: { sha256: string };
  sourceSnapshot: Record<string, string>;
  postSnapshot: Record<string, string>;
  releaseIdentity: Record<string, string>;
  exactPostState: Record<string, unknown> & {
    targetCellCount: number;
    exactTransitionPassCount: number;
    exactTransitionFailureCount: number;
    targetConnectivity: { componentCount: number; componentSizes: number[] };
  };
  preservation: Record<string, number | boolean | string>;
  execution: Record<string, number | boolean>;
  evidence: Record<string, number | string>;
  disposition: Record<string, boolean | string>;
  summary: { checkCount: number; passCount: number; failCount: number; passed: boolean };
}

let report: QaReport;

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--ledger', LEDGER,
    '--generated-at', '2026-08-21T19:55:00Z',
    '--out', OUTPUT,
    '--markdown', MARKDOWN,
  ], { cwd: ROOT, stdio: 'pipe' });
  report = JSON.parse(fs.readFileSync(OUTPUT, 'utf8')) as QaReport;
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07K B03 twin portal exterior post-release QA', () => {
  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status: 'PASS_EXACT_POSTSTATE_PRESERVED_APERTURES_REVERSIBLE',
      qaPayloadSha256:
        'a685e12e5ded202fc81f712c169e1c09b32bc57a95f544264b812d05c4aef94e',
      ledger: {
        sha256: '519120464779019e089052995c2d5a860e723000d13727acc6deac41658b5974',
      },
      manifest: {
        sha256: 'e4f09879d5a4770b8950aa9f21b0d095bcb365a696b8c91e5cc1c9f55b6cbd5c',
      },
      sourceSnapshot: {
        completeSaveSha256:
          '56b189023fc10ab0c74918afd7fc01640046736dd08d9ad2bc30ce97c282a0b5',
      },
      postSnapshot: {
        completeSaveSha256:
          '1d9b5eaccbadd887581a831481117916c1b4c681551b32d234db0405cb77280a',
        regionSha256:
          'c4a9a291f84b23a7b9112196e4e09d1fc66096b9c10b6d313f42293a7ee0429a',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '359374cbac2459d139d7b24b9b0430169f0e2ea91c9e2fd9537b8a1f48458600',
      },
    });
  });

  it('proves all 72 exact targets and both connected frame components', () => {
    expect(report.exactPostState).toMatchObject({
      targetCellCount: 72,
      targetCoordinateSetSha256:
        'a2ce627591b2e58dd4f20bd28d24e975aaf517ec30a5ac540ebc7617f0358e0b',
      exactTransitionPassCount: 72,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:stone_bricks',
      targetConnectivity: { componentCount: 2, componentSizes: [36, 36] },
    });
  });

  it('preserves all apertures, supports, portal interfaces, and undeclared cells', () => {
    expect(report.preservation).toMatchObject({
      reviewCellCount: 1560,
      declaredDifferenceCount: 72,
      undeclaredDifferenceCount: 0,
      preservedApertureCellCount: 80,
      preservedApertureState: 'minecraft:air',
      preservedSupportCellCount: 8,
      preservedSupportState: 'minecraft:polished_diorite',
      routeApertureChanged: false,
      tubeMountainViaductChangedOutsideTargets: false,
      activeMechanismOrCommissioningChange: false,
    });
  });

  it('accepts strict execution, exact rollback readiness, and all evidence bindings', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 72,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      rollbackPoststatePassCount: 72,
      rollbackPoststateFailCount: 0,
      allTemporaryChunksReleased: true,
    });
    expect(report.evidence).toMatchObject({
      requiredStageCount: 17,
      requiredStagePassCount: 17,
      evidenceBindingFailureCount: 0,
      manifestQa: 'PASS',
      blockEntityClearance: 'PASS',
      liveEntityClearance: 'PASS',
      sameMomentEntityClearance: 'PASS',
    });
  });

  it('seals R07 architecture without commissioning transport or mechanisms', () => {
    expect(report.disposition).toEqual({
      r07ArchitectureWaveComplete: true,
      acceptedScope: 'dry twin B03 portal-exterior collars only',
      railPowerBrakeControlDrainageAndRouteCommissioningRemainDeferred: true,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      checkCount: 10,
      passCount: 10,
      failCount: 0,
      passed: true,
    });
    expect(fs.readFileSync(MARKDOWN, 'utf8')).toContain('R07 architecture wave: complete');
  });
});
