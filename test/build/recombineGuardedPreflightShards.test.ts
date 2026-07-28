import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

import {
  recombineGuardedPreflightShards,
} from '../../scripts/recombine_guarded_preflight_shards.mjs';
import { parseOperationText } from '../../scripts/qa_town_expansion_post_release.mjs';

const OPERATION_PATH = '/evidence/rollback.txt';
const REGIONS_PATH = '/evidence/snapshot/region';
const SNAPSHOT = {
  sha256: 'a'.repeat(64),
  regionFileCount: 3,
};
const OPERATION_TEXT = [
  'REPL 1 64 1 1 64 1 minecraft:stone minecraft:air',
  'REPL 2 64 1 2 64 1 minecraft:stone minecraft:air',
  'REPL 1 64 1 1 64 1 minecraft:air minecraft:dirt',
  'REPL 4 64 1 4 64 1 minecraft:stone minecraft:air',
  '',
].join('\n');
const OPERATIONS = parseOperationText(OPERATION_TEXT).repl;

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function groupPlan(groupIndexes: number[]) {
  return sha256(JSON.stringify(groupIndexes.map((groupIndex) => {
    const operation = OPERATIONS[groupIndex - 1];
    return {
      groupIndex,
      line: operation.line,
      box: operation.box,
      expected: operation.sources,
      replacement: operation.desired,
    };
  })));
}

function shard(start: number, end: number, dependencies: number[]) {
  const selected = Array.from(
    { length: end - start + 1 },
    (_, offset) => start + offset,
  );
  return {
    schemaVersion: 4,
    status: 'PASS',
    opsPath: OPERATION_PATH,
    opsSha256: sha256(OPERATION_TEXT),
    regions: REGIONS_PATH,
    regionsSnapshot: { ...SNAPSHOT },
    failurePointsComplete: false,
    operationCount: selected.length,
    passed: selected.length,
    failed: 0,
    failures: [],
    projectionDependencyFailures: [],
    naturalStateTransitionPolicy: null,
    sourceOverlays: null,
    scopedEvidence: {
      kind: 'guarded-preflight-operation-shard',
      reusableEvidenceOnly: true,
      satisfiesFinalConsolidatedPreflight: false,
      sourceOperationCount: OPERATIONS.length,
      groupRange: {
        start,
        end,
        count: selected.length,
        lineStart: OPERATIONS[start - 1].line,
        lineEnd: OPERATIONS[end - 1].line,
      },
      selectedGroupPlanSha256: groupPlan(selected),
      projectionDependencies: {
        groupCount: dependencies.length,
        groupIndexes: dependencies,
        groupPlanSha256: groupPlan(dependencies),
        passed: dependencies.length,
        failed: 0,
      },
      exactSnapshotIdentityRequiredForReuse: true,
      unaffectedSnapshotDeltaProof: null,
      transitionPolicySha256: null,
    },
  };
}

function combine(
  shards: unknown[],
  options: {
    sourceOverlays?: Array<{
      path: string;
      sha256: string;
      operationCount: number;
    }>;
  } = {},
) {
  return recombineGuardedPreflightShards({
    shards,
    operationText: OPERATION_TEXT,
    operationPath: OPERATION_PATH,
    regionsPath: REGIONS_PATH,
    snapshotIdentity: SNAPSHOT,
    sourceOverlays: options.sourceOverlays ?? [],
  });
}

describe('guarded preflight shard recombination', () => {
  it('accepts exact one-to-one coverage with a proven projection dependency', () => {
    const result = combine([
      shard(1, 2, []),
      shard(3, 4, [1]),
    ]);
    expect(result).toMatchObject({
      status: 'PASS',
      passed: true,
      reusableEvidenceOnly: true,
      satisfiesFinalConsolidatedPreflight: false,
      coverage: {
        firstGroup: 1,
        lastGroup: 4,
        coveredGroups: 4,
        expectedGroups: 4,
        overlapCount: 0,
        gapCount: 0,
        exactOneToOneCoverage: true,
      },
    });
    expect(result.requiredFinalGate).toMatch(/consolidated full preflight/);
  });

  it('rejects both gaps and overlaps', () => {
    expect(() => combine([
      shard(1, 2, []),
      shard(4, 4, []),
    ])).toThrow(/gap in shard coverage/);
    expect(() => combine([
      shard(1, 3, []),
      shard(3, 4, [1]),
    ])).toThrow(/overlapping shard coverage/);
  });

  it('rejects snapshot or transition-policy identity drift', () => {
    const snapshotDrift = shard(1, 4, []);
    snapshotDrift.regionsSnapshot.sha256 = 'b'.repeat(64);
    expect(() => combine([snapshotDrift])).toThrow(/snapshot identity mismatch/);

    const policyDrift = shard(1, 4, []);
    policyDrift.scopedEvidence.transitionPolicySha256 = 'c'.repeat(64);
    expect(() => combine([policyDrift])).toThrow(/transition policy identity mismatch/);
  });

  it('recomputes and requires the complete backward projection dependency closure', () => {
    expect(() => combine([
      shard(1, 2, []),
      shard(3, 4, []),
    ])).toThrow(/projection dependency proof mismatch/);
  });

  it('binds an exact logical-source overlay plan across every shard', () => {
    const overlay = {
      path: '/evidence/recovery.txt',
      sha256: 'd'.repeat(64),
      operationCount: 2,
    };
    const overlayPlanSha256 = sha256(JSON.stringify([{
      sha256: overlay.sha256,
      operationCount: overlay.operationCount,
    }]));
    const withOverlay = [
      shard(1, 2, []),
      shard(3, 4, [1]),
    ].map((report) => ({
      ...report,
      sourceOverlays: {
        kind: 'exact-guarded-logical-source-overlay',
        physicalExecutionEvidenceRequired: true,
        satisfiesImmutableSnapshotEquality: false,
        artifacts: [overlay],
        operationCount: 2,
        passed: 2,
        failed: 0,
        failures: [],
        combinedPlanSha256: overlayPlanSha256,
      },
    }));
    expect(combine(withOverlay, { sourceOverlays: [overlay] })).toMatchObject({
      status: 'PASS',
      sourceOverlays: {
        combinedPlanSha256: overlayPlanSha256,
        physicalExecutionEvidenceRequired: true,
      },
    });
    withOverlay[1].sourceOverlays.combinedPlanSha256 = '0'.repeat(64);
    expect(() => combine(withOverlay, { sourceOverlays: [overlay] })).toThrow(
      /source overlay identity mismatch/,
    );
  });
});
