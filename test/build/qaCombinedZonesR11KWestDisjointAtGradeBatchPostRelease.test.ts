import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LIVE = path.join(
  ROOT, 'data/world-review/combined-zones-r11k-live-20260822T043931Z',
);
const LEDGER = path.join(LIVE, 'evidence-ledger.json');
const QA = path.join(LIVE, 'r11k-post-release-qa.json');
const SEAL = path.join(LIVE, 'r11k-bounded-at-grade-commissioning-seal.json');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11k-post-qa-'),
);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R11K post-release QA and bounded at-grade seal', () => {
  it('reproduces canonical QA and seal independently of output paths', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    const seal = path.join(temporaryDirectory, 'seal.json');
    const sealMd = path.join(temporaryDirectory, 'seal.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11k_c1_west_disjoint_at_grade_batch_post_release.mjs',
      '--ledger', LEDGER,
      '--out', out,
      '--md-out', md,
      '--seal-out', seal,
      '--seal-md-out', sealMd,
      '--generated-at', '2026-08-22T04:50:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(seal)).toEqual(fs.readFileSync(SEAL));
  });

  it('accepts exact state, route, support, preservation, and execution evidence', () => {
    const report = JSON.parse(fs.readFileSync(QA, 'utf8'));
    expect(report).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        'aa52f2210028ce74b674666d5615bc1b94f27681a319a25fc0efe527861d5938',
      release: {
        manifestSha256:
          '626492caa4467beae7240f6dae106adebe4618c7e0fa74cd03361920ec81295f',
        completedReleaseIdentitySha256:
          '21b76f66a745138f0d977585675b9d03aa8ed590c2f2f5ff5f7987993fd28508',
      },
      checks: {
        exactTargetCount: 336,
        exactInverseReadyCount: 336,
        pavementSurfaceCellCountPerScope: [84, 27],
        walkableSurfaceComponentCountPerScope: [1, 1],
        maximumWalkableSurfaceStepPerScope: [1, 1],
        routeSpineComponentCountPerScope: [1, 1],
        stationCenterlineMaximumStepPerScope: [1, 0],
        stableSurfaceCellCount: 111,
        exactFoundationFillCount: 105,
        headroomCutCount: 71,
        fullHeadroomAirCount: 222,
        leafStabilizationTransitionCount: 49,
        interactionHaloCellCount: 1_883,
        boundedDiffCount: 336,
        boundedOffTargetDiffCount: 0,
        priorR11TargetCellCount: 8_820,
        priorR11TargetDriftCount: 0,
        newToPriorStepSafeSeamEdgeCount: 0,
        netAcceptedSurfaceComponentDelta: 2,
        ledgerStageCount: 24,
        ledgerFailedStageCount: 0,
        executionJournalLineCount: 684,
      },
      closureEffect: {
        effect: 'TWO_INDEPENDENT_SOURCE_PROVEN_AT_GRADE_ISLANDS_ADDED',
        priorComponentsJoined: 0,
        newIndependentComponents: 2,
        wholeRouteClosureCreated: false,
      },
      acceptance: {
        exactPhysicalStateAccepted: true,
        exactRollbackReady: true,
        perScopeStepSafeWalkabilityAccepted: true,
        acceptedPriorR11ChainPreserved: true,
        boundedOffTargetDriftAbsent: true,
        wholeRouteCommissioned: false,
      },
    });
  });

  it('records the sole raw two-block contact as non-route and seals no corridor claim', () => {
    const report = JSON.parse(fs.readFileSync(QA, 'utf8'));
    expect(report.routeUsability.excludedRawPlanAdjacency).toEqual({
      left: { x: 1475, y: 67, z: -197, station: 1142, offset: -5 },
      right: { x: 1476, y: 65, z: -198, station: 1144, offset: -4 },
      stationDelta: 2,
      classification: 'CURVE_GENERATED_NON_ROUTE_LATERAL_CONTACT',
      bothOutsideThreeCellRouteSpine: true,
      successiveStationProgression: false,
    });
    const seal = JSON.parse(fs.readFileSync(SEAL, 'utf8'));
    expect(seal).toMatchObject({
      status: 'R11K_BOUNDED_DISJOINT_AT_GRADE_POST_QA_PASS',
      sealPayloadSha256:
        '574329dcded8b310326965af5f1ca6ccccbb16664dec146c0c39b3ce2e7bce55',
      acceptedGeometry: {
        targetCellCount: 336,
        surfaceCellCountPerScope: [84, 27],
        maximumWalkableStepPerScope: [1, 1],
      },
      acceptedClosureEffect: {
        priorComponentsJoined: 0,
        newIndependentComponents: 2,
        wholeRouteClosureCreated: false,
      },
    });
    expect(seal.nonClaims).toContain('whole C1 corridor commissioning');
  });
});
