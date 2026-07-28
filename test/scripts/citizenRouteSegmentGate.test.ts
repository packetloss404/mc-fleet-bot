import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildSegmentCacheBinding,
  createOrRotateSegmentCache,
  firstFailedRouteCheckpoint,
  parseSegmentSelector,
  recordSegmentWindowPasses,
  segmentWindowPlan,
} from '../../scripts/lib/citizen-route-segment-gate.mjs';

const ROOT = path.resolve(__dirname, '../..');
const ROUTE = [
  [0, 64, 0],
  [0, 64, 1],
  [0, 65, 2],
  [0, 66, 3],
  [0, 65, 4],
];

function binding(overrides = {}) {
  return buildSegmentCacheBinding({
    bot: 'Surveyor',
    snapshotSha256: 'snapshot-a',
    routeReportSha256: 'route-report-a',
    exactPathSha256: 'exact-path-a',
    routineWaypoints: ROUTE,
    relevantCodePolicySha256: 'code-policy-a',
    serviceBuildSha256: 'service-build-a',
    serviceInstance: {
      mainPid: 123,
      execMainStartTimestamp: 'Mon 2026-07-28 18:00:00 UTC',
    },
    movementPolicy: {
      parkour: false,
      digging: false,
      towering: false,
      goalNearRange: 1,
    },
    ...overrides,
  });
}

describe('citizen route resumable segment gate', () => {
  it('plans the failed checkpoint and both adjacent seams', () => {
    expect(parseSegmentSelector('reverse:2')).toEqual({
      direction: 'reverse',
      index: 2,
    });
    const plan = segmentWindowPlan(ROUTE, 'reverse:2');
    expect(plan).toMatchObject({
      selector: 'reverse:2',
      direction: 'reverse',
      failedCheckpointIndex: 2,
      failedCheckpointTarget: [0, 65, 2],
      stagingIndex: 0,
      checkpointIndices: [1, 2, 3],
      endToEndAcceptanceEligible: false,
      remainingGate: 'fresh uncached PASS_BIDIRECTIONAL full-route live walk',
    });
    expect(plan.checkpoints.map((entry) => entry.role)).toEqual([
      'entry-adjacent-seam',
      'failed-segment',
      'exit-adjacent-seam',
    ]);
  });

  it('binds cache validity to every requested world, route, code, and service identity', () => {
    const original = binding();
    const cache = createOrRotateSegmentCache(null, original);
    cache.current.passes['reverse:2'] = { passedAtUtc: 'now' };

    const same = createOrRotateSegmentCache(cache, binding());
    expect(same.current.passes['reverse:2']).toBeDefined();
    expect(same.staleGenerations).toHaveLength(0);

    const changes = [
      { snapshotSha256: 'snapshot-b' },
      { routeReportSha256: 'route-report-b' },
      { exactPathSha256: 'exact-path-b' },
      { relevantCodePolicySha256: 'code-policy-b' },
      { serviceBuildSha256: 'service-build-b' },
      {
        serviceInstance: {
          mainPid: 124,
          execMainStartTimestamp: 'Mon 2026-07-28 19:00:00 UTC',
        },
      },
    ];
    for (const change of changes) {
      const rotated = createOrRotateSegmentCache(cache, binding(change));
      expect(rotated.current.passes).toEqual({});
      expect(rotated.staleGenerations).toHaveLength(1);
      expect(rotated.current.bindingSha256).not.toBe(original.bindingSha256);
      expect(rotated.current.endToEndAcceptanceEligible).toBe(false);
    }
  });

  it('records only passing checkpoints without elevating cached coverage to acceptance', () => {
    const runtimeBinding = binding();
    const cache = createOrRotateSegmentCache(null, runtimeBinding);
    const plan = segmentWindowPlan(ROUTE, 'reverse:2');
    const audit = {
      generatedAtUtc: '2026-07-28T18:30:00Z',
      auditFile: 'data/runtime-audits/segment.json',
      runtimeBinding,
      window: {
        checkpoints: plan.checkpoints.map((checkpoint, index) => ({
          index: checkpoint.index,
          passed: index !== 1,
          arrival: checkpoint.point,
          controlledWalkStatus: { status: index !== 1 ? 'succeeded' : 'failed' },
        })),
      },
    };
    const updated = recordSegmentWindowPasses(cache, plan, audit);
    expect(Object.keys(updated.current.passes)).toEqual(['reverse:1', 'reverse:3']);
    expect(updated.current.passes['reverse:2']).toBeUndefined();
    expect(updated.current.endToEndAcceptanceEligible).toBe(false);
    expect(updated.current.remainingGate).toContain('PASS_BIDIRECTIONAL');
  });

  it('selects only failed forward/reverse checkpoints for resumable diagnosis', () => {
    expect(firstFailedRouteCheckpoint({
      staging: { checkpoints: [{ passed: false, index: 0 }] },
      forward: { checkpoints: [{ passed: true, index: 0 }] },
      reverse: {
        checkpoints: [
          { passed: true, index: 12 },
          { passed: false, index: 13, target: [-83, 72, 1] },
        ],
      },
    })).toEqual({
      direction: 'reverse',
      index: 13,
      target: [-83, 72, 1],
    });
  });

  it('prints the exact reverse checkpoint 13 diagnostic plan without live access', () => {
    const output = JSON.parse(execFileSync(
      process.execPath,
      [
        'scripts/run_citizen_route_live_walk.mjs',
        '--segment-plan',
        'reverse:13',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    ));
    expect(output).toMatchObject({
      status: 'PASS_SEGMENT_PLAN_ONLY',
      liveWorldRead: false,
      liveWorldMutated: false,
      serviceRestarted: false,
      selector: 'reverse:13',
      stagingIndex: 11,
      stagingPoint: [-82, 70, 3],
      checkpointIndices: [12, 13, 14],
      failedCheckpointTarget: [-83, 72, 1],
      endToEndAcceptanceEligible: false,
    });
    expect(output.checkpoints.map(
      (checkpoint: { point: number[] }) => checkpoint.point,
    )).toEqual([
      [-83, 71, 2],
      [-83, 72, 1],
      [-83, 73, 0],
    ]);
  });
});

