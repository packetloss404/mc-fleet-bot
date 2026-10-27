import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIR = path.join(ROOT, 'data/world-review/combined-zones-r08aj-live-20260822T024118Z');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r08aj_empty_eight_eg_b_passive_illumination_post_release.mjs',
);
const read = (filename: string) => JSON.parse(fs.readFileSync(path.join(DIR, filename), 'utf8'));

beforeAll(() => execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' }), 30_000);

describe('R08AJ post-release QA', () => {
  it('binds executed identity', () => {
    expect(read('r08aj-post-release-qa.json')).toMatchObject({
      status: 'PASS_R08AJ_EMPTY_EIGHT_EG_B_PASSIVE_ILLUMINATION_POST_RELEASE_ACCEPTED',
      release: {
        manifestIdentity: 'ca665afef01803f8fd35a4c07bd660c9a1e9bf8434bd6cab5e2a822d3566201f',
        completedReleaseIdentitySha256: '0305e47fbdc23239338a31dfa335cc2332f68bcdde423cce2d09cfe34478d791',
      },
      bindings: { stages: 17, evidence: 17 },
    });
  });

  it('verifies exact fixtures and complete retained closure', () => {
    expect(read('r08aj-post-release-qa.json')).toMatchObject({
      geometry: {
        targetSet: { cellCount: 9 },
        roofCap: { cellCount: 49 },
        retainedRoofCap: { cellCount: 40 },
        halo: { cellCount: 42 },
      },
      postState: {
        exactTransitions: { expected: 9, matching: 9, mismatches: 0 },
        fixtureStateCensus: { 'minecraft:sea_lantern': 9 },
        retainedCapStateCensus: { 'minecraft:smooth_stone': 40 },
        fullCubeClosedCapCells: 49,
        haloStateCensus: { 'minecraft:smooth_stone': 24, 'minecraft:air': 18 },
        boundedDiff: { reviewCells: 646, declared: 9, observed: 9, lifecycle: 0, undeclared: 0 },
      },
    });
  });

  it('verifies all prior R08 and R02 state', () => {
    expect(read('r08aj-post-release-qa.json')).toMatchObject({
      prior: {
        previousR08: {
          manifestCount: 34,
          unionCells: 44687,
          targetIntersections: 0,
          preservedCells: 44687,
          drift: 0,
        },
        r02: {
          unionCells: 17380,
          targetSupersessionCells: 9,
          smoothStoneTargetCells: 9,
          undeclaredSourcePostDiff: 0,
        },
      },
    });
  });

  it('verifies strict execution, inverse, and narrow commissioning', () => {
    expect(read('r08aj-post-release-qa.json')).toMatchObject({
      execution: { stages: 17, journalEvents: 24, success: 9, failed: 0, noops: 0, inverseGuards: 9 },
      commissioning: {
        passiveNormalIlluminationAccepted: true,
        roofCapClosed: true,
        photometricValidationClaimed: false,
        emergencyPowerOrLightingCommissioned: false,
        egressCommissioned: false,
        accessibleRouteCommissioned: false,
        externalOpeningAuthorized: false,
      },
    });
  });

  it('seals bounded work', () => {
    expect(read('r08aj-bounded-eg-b-passive-illumination-seal.json')).toMatchObject({
      status: 'PASS_R08AJ_BOUNDED_EG_B_PASSIVE_ILLUMINATION_ACCEPTED',
      scope: {
        targets: 9,
        retainedCapCells: 40,
        fullCubeClosedCapCells: 49,
        halo: 42,
        preservedPriorR08Cells: 44687,
        preservedNonTargetR02Cells: 17371,
      },
      rollback: { guards: 9, passed: true },
      noLiveCalls: true,
      noWorldEdits: true,
    });
  });
});
