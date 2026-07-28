#!/usr/bin/env node
/**
 * Recombine PASS-only scoped guarded-preflight shards.
 *
 * Recombination is deliberately evidence reuse, not final acceptance. Every
 * shard must bind the same complete operation file, exact immutable snapshot,
 * and optional transition policy, and the selected group ranges must cover the
 * operation file exactly once with no overlaps or gaps. The output never
 * substitutes for the final consolidated preflight/parser dry-run.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { parseOperationText } from './qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolveRoot(filename) {
  return path.isAbsolute(filename) ? filename : path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function samePath(left, right) {
  return resolveRoot(left) === resolveRoot(right);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boxesIntersect(left, right) {
  return !(
    left[3] < right[0] || right[3] < left[0]
    || left[4] < right[1] || right[4] < left[1]
    || left[5] < right[2] || right[5] < left[2]
  );
}

function chunksForBox(box) {
  const output = [];
  for (let chunkX = Math.floor(box[0] / 16); chunkX <= Math.floor(box[3] / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(box[2] / 16); chunkZ <= Math.floor(box[5] / 16); chunkZ += 1) {
      output.push(`${chunkX},${chunkZ}`);
    }
  }
  return output;
}

function projectionDependencyIndexes(operations, start, end) {
  if (start === 1) return [];
  const neededByChunk = new Map();
  const addNeeded = (box) => {
    for (const key of chunksForBox(box)) {
      const boxes = neededByChunk.get(key) ?? [];
      boxes.push(box);
      neededByChunk.set(key, boxes);
    }
  };
  for (const operation of operations.slice(start - 1, end)) addNeeded(operation.box);
  const dependencies = [];
  for (let index = start - 2; index >= 0; index -= 1) {
    const operation = operations[index];
    const depends = chunksForBox(operation.box).some((key) => (
      (neededByChunk.get(key) ?? []).some(
        (needed) => boxesIntersect(operation.box, needed),
      )
    ));
    if (!depends) continue;
    dependencies.push(index + 1);
    addNeeded(operation.box);
  }
  return dependencies.sort((left, right) => left - right);
}

function groupPlanSha256(operations, groupIndexes) {
  const plan = groupIndexes.map((groupIndex) => {
    const operation = operations[groupIndex - 1];
    assert(operation, `group ${groupIndex} is outside the operation file`);
    return {
      groupIndex,
      line: operation.line,
      box: operation.box,
      expected: operation.sources,
      replacement: operation.desired,
    };
  });
  return sha256(JSON.stringify(plan));
}

/**
 * Validate and combine already-loaded shard reports.
 */
export function recombineGuardedPreflightShards({
  shards,
  operationText,
  operationPath,
  operationSha256 = sha256(operationText),
  regionsPath,
  snapshotIdentity,
  transitionPolicy = null,
  sourceOverlays = [],
}) {
  assert(Array.isArray(shards) && shards.length > 0, 'at least one shard is required');
  const parsed = parseOperationText(operationText, operationPath);
  assert(parsed.unsupported.length === 0, 'operation file has unsupported lines');
  assert(parsed.commands.length === 0, 'scoped recombination supports REPL groups only');
  const operationCount = parsed.repl.length;
  assert(operationCount > 0, 'operation file has no REPL groups');
  const expectedPolicySha256 = transitionPolicy?.sha256 ?? null;
  const expectedOverlayPlanSha256 = sourceOverlays.length > 0
    ? sha256(JSON.stringify(sourceOverlays.map((entry) => ({
      sha256: entry.sha256,
      operationCount: entry.operationCount,
    }))))
    : null;

  const normalized = shards.map((entry, index) => {
    const shard = entry.report ?? entry;
    const source = entry.file ?? `<shard-${index + 1}>`;
    const scope = shard.scopedEvidence;
    assert(
      shard.schemaVersion === 4
        && scope?.kind === 'guarded-preflight-operation-shard',
      `${source}: not a schema-v4 guarded-preflight shard`,
    );
    assert(
      shard.status === 'PASS'
        && shard.failed === 0
        && shard.passed === shard.operationCount
        && shard.failures?.length === 0,
      `${source}: shard is not an exact PASS`,
    );
    assert(
      scope.reusableEvidenceOnly === true
        && scope.satisfiesFinalConsolidatedPreflight === false
        && shard.failurePointsComplete === false,
      `${source}: shard acceptance boundary drift`,
    );
    assert(
      shard.opsSha256 === operationSha256
        && samePath(shard.opsPath, operationPath),
      `${source}: operation identity mismatch`,
    );
    assert(
      scope.sourceOperationCount === operationCount,
      `${source}: source operation count mismatch`,
    );
    assert(
      shard.regionsSnapshot?.sha256 === snapshotIdentity.sha256
        && samePath(shard.regions, regionsPath),
      `${source}: immutable snapshot identity mismatch`,
    );
    assert(
      scope.exactSnapshotIdentityRequiredForReuse === true
        && scope.unaffectedSnapshotDeltaProof === null,
      `${source}: unsupported snapshot reuse mode`,
    );
    assert(
      scope.transitionPolicySha256 === expectedPolicySha256,
      `${source}: transition policy identity mismatch`,
    );
    if (expectedPolicySha256 === null) {
      assert(
        shard.naturalStateTransitionPolicy === null,
        `${source}: undeclared transition policy`,
      );
    } else {
      assert(
        shard.naturalStateTransitionPolicy?.sha256 === expectedPolicySha256,
        `${source}: transition policy report mismatch`,
      );
    }
    if (sourceOverlays.length === 0) {
      assert(shard.sourceOverlays === null, `${source}: undeclared source overlay`);
    } else {
      assert(
        shard.sourceOverlays?.kind === 'exact-guarded-logical-source-overlay'
          && shard.sourceOverlays.physicalExecutionEvidenceRequired === true
          && shard.sourceOverlays.satisfiesImmutableSnapshotEquality === false
          && shard.sourceOverlays.operationCount
            === sourceOverlays.reduce(
              (sum, overlay) => sum + overlay.operationCount,
              0,
            )
          && shard.sourceOverlays.passed === shard.sourceOverlays.operationCount
          && shard.sourceOverlays.failed === 0
          && shard.sourceOverlays.failures?.length === 0
          && shard.sourceOverlays.combinedPlanSha256
            === expectedOverlayPlanSha256
          && JSON.stringify(
            shard.sourceOverlays.artifacts.map((entry) => ({
              path: relativeRoot(resolveRoot(entry.path)),
              sha256: entry.sha256,
              operationCount: entry.operationCount,
            })),
          ) === JSON.stringify(sourceOverlays.map((entry) => ({
            path: relativeRoot(resolveRoot(entry.path)),
            sha256: entry.sha256,
            operationCount: entry.operationCount,
          }))),
        `${source}: source overlay identity mismatch`,
      );
    }

    const range = scope.groupRange;
    assert(
      Number.isSafeInteger(range?.start)
        && Number.isSafeInteger(range?.end)
        && Number.isSafeInteger(range?.count)
        && range.start >= 1
        && range.end >= range.start
        && range.end <= operationCount
        && range.count === range.end - range.start + 1
        && shard.operationCount === range.count,
      `${source}: invalid group range`,
    );
    const selectedIndexes = Array.from(
      { length: range.count },
      (_, offset) => range.start + offset,
    );
    assert(
      range.lineStart === parsed.repl[range.start - 1].line
        && range.lineEnd === parsed.repl[range.end - 1].line
        && scope.selectedGroupPlanSha256
          === groupPlanSha256(parsed.repl, selectedIndexes),
      `${source}: selected group/line plan mismatch`,
    );
    const dependencies = scope.projectionDependencies;
    const dependencyIndexes = dependencies?.groupIndexes;
    const expectedDependencyIndexes = projectionDependencyIndexes(
      parsed.repl,
      range.start,
      range.end,
    );
    assert(
      Array.isArray(dependencyIndexes)
        && JSON.stringify(dependencyIndexes)
          === JSON.stringify(expectedDependencyIndexes)
        && dependencyIndexes.every(
          (groupIndex, dependencyIndex) => (
            Number.isSafeInteger(groupIndex)
            && groupIndex >= 1
            && groupIndex < range.start
            && (dependencyIndex === 0
              || dependencyIndexes[dependencyIndex - 1] < groupIndex)
          ),
        )
        && dependencies.groupCount === dependencyIndexes.length
        && dependencies.passed === dependencyIndexes.length
        && dependencies.failed === 0
        && shard.projectionDependencyFailures?.length === 0
        && dependencies.groupPlanSha256
          === groupPlanSha256(parsed.repl, dependencyIndexes),
      `${source}: projection dependency proof mismatch`,
    );
    return {
      source,
      sourceSha256: entry.sha256 ?? null,
      start: range.start,
      end: range.end,
      count: range.count,
      lineStart: range.lineStart,
      lineEnd: range.lineEnd,
      selectedGroupPlanSha256: scope.selectedGroupPlanSha256,
      dependencyGroupCount: dependencyIndexes.length,
      dependencyGroupPlanSha256: dependencies.groupPlanSha256,
    };
  }).sort((left, right) => left.start - right.start);

  let expectedStart = 1;
  for (const shard of normalized) {
    assert(
      shard.start === expectedStart,
      shard.start < expectedStart
        ? `overlapping shard coverage at group ${shard.start}`
        : `gap in shard coverage before group ${shard.start}`,
    );
    expectedStart = shard.end + 1;
  }
  assert(
    expectedStart === operationCount + 1,
    `shard coverage ends at group ${expectedStart - 1}; expected ${operationCount}`,
  );
  return {
    schemaVersion: 1,
    id: 'guarded-preflight-shard-recombination',
    status: 'PASS',
    passed: true,
    acceptanceClass:
      'SCOPED_EVIDENCE_RECOMBINED_FINAL_CONSOLIDATED_PREFLIGHT_REQUIRED',
    reusableEvidenceOnly: true,
    satisfiesFinalConsolidatedPreflight: false,
    operation: {
      path: relativeRoot(resolveRoot(operationPath)),
      sha256: operationSha256,
      groupCount: operationCount,
    },
    snapshot: {
      path: relativeRoot(resolveRoot(regionsPath)),
      sha256: snapshotIdentity.sha256,
      regionFileCount: snapshotIdentity.regionFileCount ?? null,
      reuseMode: 'exact-immutable-snapshot-identity',
      unaffectedSnapshotDeltaProof: null,
    },
    transitionPolicy: transitionPolicy
      ? {
        path: relativeRoot(resolveRoot(transitionPolicy.path)),
        sha256: transitionPolicy.sha256,
      }
      : null,
    sourceOverlays: sourceOverlays.length > 0
      ? {
        combinedPlanSha256: expectedOverlayPlanSha256,
        artifacts: sourceOverlays,
        physicalExecutionEvidenceRequired: true,
        satisfiesImmutableSnapshotEquality: false,
      }
      : null,
    coverage: {
      firstGroup: 1,
      lastGroup: operationCount,
      coveredGroups: normalized.reduce((sum, shard) => sum + shard.count, 0),
      expectedGroups: operationCount,
      overlapCount: 0,
      gapCount: 0,
      exactOneToOneCoverage: true,
    },
    shards: normalized,
    requiredFinalGate:
      'Run one consolidated full preflight and the complete strict-noop parser '
      + 'dry-run before release acceptance or execution.',
  };
}

function valuesAfter(args, flag) {
  return args.flatMap((value, index) => (
    value === flag && args[index + 1] ? [args[index + 1]] : []
  ));
}

function valueAfter(args, flag, required = false) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : null;
  if (required && (!value || value.startsWith('--'))) {
    throw new Error(`${flag} is required`);
  }
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const operationPath = resolveRoot(valueAfter(args, '--ops', true));
  const regionsPath = resolveRoot(valueAfter(args, '--regions', true));
  const outputPath = resolveRoot(valueAfter(args, '--out', true));
  const shardPaths = valuesAfter(args, '--shard').map(resolveRoot);
  assert(shardPaths.length > 0, 'at least one --shard is required');
  assert(!fs.existsSync(outputPath), `refusing to overwrite ${outputPath}`);
  const operationBytes = fs.readFileSync(operationPath);
  const policyArgument = valueAfter(args, '--natural-transition-policy');
  const transitionPolicy = policyArgument
    ? {
      path: resolveRoot(policyArgument),
      sha256: sha256(fs.readFileSync(resolveRoot(policyArgument))),
    }
    : null;
  const sourceOverlays = valuesAfter(args, '--source-overlay-ops').map(
    (filename) => {
      const resolved = resolveRoot(filename);
      const operationText = fs.readFileSync(resolved, 'utf8');
      const parsed = parseOperationText(operationText, resolved);
      assert(
        parsed.unsupported.length === 0
          && parsed.commands.length === 0
          && parsed.repl.length > 0,
        `source overlay is not exact REPL-only operations: ${filename}`,
      );
      return {
        path: relativeRoot(resolved),
        sha256: sha256(operationText),
        operationCount: parsed.repl.length,
      };
    },
  );
  const snapshotIdentity = hashSnapshotDirectory(regionsPath);
  const shards = shardPaths.map((filename) => ({
    file: relativeRoot(filename),
    sha256: sha256(fs.readFileSync(filename)),
    report: JSON.parse(fs.readFileSync(filename, 'utf8')),
  }));
  const report = recombineGuardedPreflightShards({
    shards,
    operationText: operationBytes.toString('utf8'),
    operationPath,
    operationSha256: sha256(operationBytes),
    regionsPath,
    snapshotIdentity,
    transitionPolicy,
    sourceOverlays,
  });
  report.generatedAtUtc = new Date().toISOString();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    output: relativeRoot(outputPath),
    outputSha256: sha256(fs.readFileSync(outputPath)),
    coverage: report.coverage,
    satisfiesFinalConsolidatedPreflight: false,
  }, null, 2)}\n`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
