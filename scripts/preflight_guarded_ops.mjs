#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import {
  loadNaturalStateTransitionPolicy,
  policyAllowsTransition,
} from './lib/natural_state_transition_policy.mjs';
import {
  canonicalBlockState,
  isPropertyOrderOnlyBlockStateNoop,
} from './lib/canonical_block_state.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opsPath = path.resolve(ROOT, args[0] ?? '');
const regionsIndex = args.indexOf('--regions');
const regions = path.resolve(
  ROOT,
  regionsIndex >= 0 ? args[regionsIndex + 1] : 'data/worldsnap/region',
);
const reportIndex = args.indexOf('--report');
const outIndex = args.indexOf('--out');
const reportArgumentIndex = reportIndex >= 0 ? reportIndex : outIndex;
const reportPath = reportArgumentIndex >= 0
  ? path.resolve(ROOT, args[reportArgumentIndex + 1])
  : null;
const transitionPolicyIndex = args.indexOf('--natural-transition-policy');
const transitionPolicyPath = transitionPolicyIndex >= 0
  ? path.resolve(ROOT, args[transitionPolicyIndex + 1])
  : null;
const sourceOverlayPaths = args.flatMap((value, index) => (
  value === '--source-overlay-ops' && args[index + 1]
    ? [path.resolve(ROOT, args[index + 1])]
    : []
));
const groupStartIndex = args.indexOf('--group-start');
const groupEndIndex = args.indexOf('--group-end');
const hasScopedGroupRange = groupStartIndex >= 0 || groupEndIndex >= 0;

if (!args[0] || !fs.existsSync(opsPath)) {
  console.error(
    'usage: node scripts/preflight_guarded_ops.mjs <ops.txt> '
    + '[--regions <dir>] [--report <json>] '
    + '[--natural-transition-policy <json>] '
    + '[--source-overlay-ops <exact-guarded-ops.txt>] '
    + '[--group-start <1-based-group> --group-end <inclusive-group>]',
  );
  process.exit(2);
}

function hashSnapshotDirectory(directory) {
  const files = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  if (files.length === 0) {
    throw new Error(`no Anvil region files found in ${directory}`);
  }
  const digest = crypto.createHash('sha256');
  const members = [];
  for (const name of files) {
    const bytes = fs.readFileSync(path.join(directory, name));
    digest.update(name);
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
    members.push({
      file: name,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: members.length,
    members,
  };
}

function splitMasks(mask) {
  const output = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const char = mask[index];
    if (char === '[') depth += 1;
    else if (char === ']') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output.filter(Boolean);
}

function normalizeBlock(block) {
  return canonicalBlockState(block);
}

function blockMatches(expected, actual) {
  if (expected.includes('[')) return expected === actual;
  return actual.split('[', 1)[0] === expected;
}

function normalizedBox(box) {
  return [
    Math.min(box[0], box[3]),
    Math.min(box[1], box[4]),
    Math.min(box[2], box[5]),
    Math.max(box[0], box[3]),
    Math.max(box[1], box[4]),
    Math.max(box[2], box[5]),
  ];
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

function groupPlanSha256(scopedOperations) {
  const plan = scopedOperations.map((operation) => ({
    groupIndex: operation.groupIndex,
    line: operation.line,
    box: operation.normalizedBox,
    expected: operation.expected,
    replacement: operation.replacement,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

const rawLines = fs.readFileSync(opsPath, 'utf8').split(/\r?\n/);
const opsSha256 = crypto
  .createHash('sha256')
  .update(fs.readFileSync(opsPath))
  .digest('hex');
const operations = [];
for (let index = 0; index < rawLines.length; index += 1) {
  const fields = rawLines[index].trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length < 9) continue;
  const authoredExpected = splitMasks(fields[7]);
  const box = fields.slice(1, 7).map(Number);
  operations.push({
    groupIndex: operations.length + 1,
    line: index + 1,
    box,
    normalizedBox: normalizedBox(box),
    authoredExpected,
    authoredReplacement: fields[8],
    expected: authoredExpected.map(normalizeBlock),
    replacement: normalizeBlock(fields[8]),
  });
}
const sourceOverlayOperations = [];
const sourceOverlayArtifacts = [];
for (const [overlayIndex, overlayPath] of sourceOverlayPaths.entries()) {
  if (!fs.existsSync(overlayPath)) {
    throw new Error(`source overlay does not exist: ${overlayPath}`);
  }
  const overlayBytes = fs.readFileSync(overlayPath);
  const overlayLines = overlayBytes.toString('utf8').split(/\r?\n/);
  let operationCount = 0;
  for (let index = 0; index < overlayLines.length; index += 1) {
    const fields = overlayLines[index].trim().split(/\s+/);
    if (!fields[0] || fields[0].startsWith('#')) continue;
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      throw new Error(
        `${overlayPath}:${index + 1}: source overlays permit exact REPL lines only`,
      );
    }
    const authoredExpected = splitMasks(fields[7]);
    const box = fields.slice(1, 7).map(Number);
    operationCount += 1;
    sourceOverlayOperations.push({
      sourceOverlay: true,
      overlayIndex,
      overlayGroupIndex: operationCount,
      line: index + 1,
      box,
      normalizedBox: normalizedBox(box),
      authoredExpected,
      authoredReplacement: fields[8],
      expected: authoredExpected.map(normalizeBlock),
      replacement: normalizeBlock(fields[8]),
    });
  }
  if (operationCount === 0) {
    throw new Error(`${overlayPath}: source overlay has no REPL operations`);
  }
  sourceOverlayArtifacts.push({
    path: path.relative(ROOT, overlayPath),
    sha256: crypto.createHash('sha256').update(overlayBytes).digest('hex'),
    bytes: overlayBytes.length,
    operationCount,
  });
}
const propertyOrderSemanticNoops = [
  ...sourceOverlayOperations,
  ...operations,
].flatMap((operation) => (
  operation.authoredExpected
    .filter((expected) => isPropertyOrderOnlyBlockStateNoop(
      expected,
      operation.authoredReplacement,
    ))
    .map((expected) => ({
      line: operation.line,
      expected,
      replacement: operation.authoredReplacement,
      canonicalState: operation.replacement,
    }))
));
if (propertyOrderSemanticNoops.length > 0) {
  console.error(
    `${path.basename(opsPath)}: rejected `
    + `${propertyOrderSemanticNoops.length} property-order semantic no-op REPL guard(s)`,
  );
  for (const failure of propertyOrderSemanticNoops.slice(0, 12)) {
    console.error(
      `  line ${failure.line}: replacement ${failure.replacement} is semantically `
      + `identical to guarded source ${failure.expected} `
      + `(canonical ${failure.canonicalState})`,
    );
  }
  process.exit(1);
}
const transitionPolicy = transitionPolicyPath
  ? loadNaturalStateTransitionPolicy(transitionPolicyPath, {
    operationSha256: opsSha256,
    operationPath: opsPath,
    operations,
  })
  : null;

if (
  hasScopedGroupRange
  && (
    groupStartIndex < 0
    || groupEndIndex < 0
    || !args[groupStartIndex + 1]
    || !args[groupEndIndex + 1]
  )
) {
  throw new Error('--group-start and --group-end must be supplied together');
}
const groupStart = hasScopedGroupRange
  ? Number.parseInt(args[groupStartIndex + 1], 10)
  : 1;
const groupEnd = hasScopedGroupRange
  ? Number.parseInt(args[groupEndIndex + 1], 10)
  : operations.length;
if (
  !Number.isSafeInteger(groupStart)
  || !Number.isSafeInteger(groupEnd)
  || groupStart < 1
  || groupEnd < groupStart
  || groupEnd > operations.length
) {
  throw new Error(
    `invalid group range ${groupStart}..${groupEnd}; operation count is ${operations.length}`,
  );
}
const selectedOperations = operations.slice(groupStart - 1, groupEnd);
const evaluationIndexes = new Set(
  selectedOperations.map((operation) => operation.groupIndex),
);
if (hasScopedGroupRange && groupStart > 1) {
  // Compute the exact backward projection dependency closure. A prior group is
  // included whenever its target box intersects any selected/dependency box;
  // its full box then joins the closure. This preserves order-aware semantics
  // without evaluating unrelated earlier groups.
  const neededByChunk = new Map();
  const addNeeded = (box) => {
    for (const key of chunksForBox(box)) {
      const boxes = neededByChunk.get(key) ?? [];
      boxes.push(box);
      neededByChunk.set(key, boxes);
    }
  };
  for (const operation of selectedOperations) addNeeded(operation.normalizedBox);
  for (let index = groupStart - 2; index >= 0; index -= 1) {
    const operation = operations[index];
    const depends = chunksForBox(operation.normalizedBox).some((key) => (
      (neededByChunk.get(key) ?? []).some(
        (needed) => boxesIntersect(operation.normalizedBox, needed),
      )
    ));
    if (!depends) continue;
    evaluationIndexes.add(operation.groupIndex);
    addNeeded(operation.normalizedBox);
  }
}
const evaluationOperations = operations.filter(
  (operation) => evaluationIndexes.has(operation.groupIndex),
);
const dependencyOperations = evaluationOperations.filter(
  (operation) => operation.groupIndex < groupStart,
);
const projectionOperations = [
  ...sourceOverlayOperations,
  ...evaluationOperations,
];

const bounds = projectionOperations.reduce(
  (current, operation) => [
    Math.min(current[0], operation.box[0], operation.box[3]),
    Math.min(current[1], operation.box[1], operation.box[4]),
    Math.min(current[2], operation.box[2], operation.box[5]),
    Math.max(current[3], operation.box[0], operation.box[3]),
    Math.max(current[4], operation.box[1], operation.box[4]),
    Math.max(current[5], operation.box[2], operation.box[5]),
  ],
  [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ],
);

// A single overall census is catastrophically expensive for sparse, multi-site
// packages: 3,000 one-cell operations spread between Raven Rock and Westlight
// previously expanded into a 44-million-cell box. Group the required cells by
// chunk and census only each chunk's occupied sub-box. This preserves exact block
// state checks while making world-wide guarded packages practical on the 2-vCPU
// host.
const chunkBounds = new Map();
for (const operation of projectionOperations) {
  const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = operation.box;
  const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
  const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
  const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
  for (let chunkX = Math.floor(x1 / 16); chunkX <= Math.floor(x2 / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(z1 / 16); chunkZ <= Math.floor(z2 / 16); chunkZ += 1) {
      const clipped = {
        minX: Math.max(x1, chunkX * 16),
        minY: y1,
        minZ: Math.max(z1, chunkZ * 16),
        maxX: Math.min(x2, chunkX * 16 + 15),
        maxY: y2,
        maxZ: Math.min(z2, chunkZ * 16 + 15),
      };
      const key = `${chunkX},${chunkZ}`;
      const current = chunkBounds.get(key);
      if (!current) chunkBounds.set(key, clipped);
      else {
        current.minX = Math.min(current.minX, clipped.minX);
        current.minY = Math.min(current.minY, clipped.minY);
        current.minZ = Math.min(current.minZ, clipped.minZ);
        current.maxX = Math.max(current.maxX, clipped.maxX);
        current.maxY = Math.max(current.maxY, clipped.maxY);
        current.maxZ = Math.max(current.maxZ, clipped.maxZ);
      }
    }
  }
}
const blocks = new Map();
async function censusChunk(chunkBox) {
  const child = spawn(
    process.execPath,
    [
      path.join(ROOT, 'scripts', 'block_census.mjs'),
      '--regions',
      regions,
      '--box',
      String(chunkBox.minX),
      String(chunkBox.minY),
      String(chunkBox.minZ),
      String(chunkBox.maxX),
      String(chunkBox.maxY),
      String(chunkBox.maxZ),
      '--include-air',
      '--states',
      '--list',
    ],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    if (stdout.length > 32 * 1024 * 1024) child.kill('SIGTERM');
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (status !== 0) {
    throw new Error(
      `block census failed (${status}) for ${JSON.stringify(chunkBox)}: ${stderr}`,
    );
  }
  return stdout;
}

const pendingChunkBoxes = [...chunkBounds.values()];
let censusCursor = 0;
const censusConcurrency = Math.max(
  1,
  Math.min(8, Number.parseInt(process.env.PREFLIGHT_CENSUS_CONCURRENCY ?? '4', 10) || 4),
);
await Promise.all(Array.from({ length: censusConcurrency }, async () => {
  while (censusCursor < pendingChunkBoxes.length) {
    const index = censusCursor;
    censusCursor += 1;
    const stdout = await censusChunk(pendingChunkBoxes[index]);
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^\s+(-?\d+) (-?\d+) (-?\d+)\s+(minecraft:\S+)\s*$/);
      if (!match) continue;
      blocks.set(
        `${match[1]},${match[2]},${match[3]}`,
        normalizeBlock(match[4]),
      );
    }
  }
}));

const partialMasks = new Set([
  '-94,62,-389,-93,62,-377',
  '-94,63,-389,-93,63,-377',
  '-84,63,-374,-84,63,-363',
  '-84,63,-358,-71,63,-358',
]);
const results = [];
const projectedBlocks = new Map(blocks);
const policyPointResults = new Map();
for (const operation of projectionOperations) {
  const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = operation.box;
  const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
  const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
  const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
  let matched = 0;
  const matchedKeys = [];
  const unexpected = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const target = `${x},${y},${z}`;
        const actual = projectedBlocks.get(target) ?? 'MISSING_CHUNK';
        const exactMatch = operation.expected.some(
          (expected) => blockMatches(expected, actual),
        );
        const transitionMatch = (
          !exactMatch
          && !operation.sourceOverlay
          && transitionPolicy
          && policyAllowsTransition(
            transitionPolicy,
            operation,
            [x, y, z],
            actual,
          )
        );
        if (exactMatch || transitionMatch) {
          matched += 1;
          matchedKeys.push(target);
          const rule = operation.sourceOverlay
            ? null
            : transitionPolicy?.ruleByLine.get(operation.line);
          if (rule?.points.some((point) => point.join(',') === target)) {
            policyPointResults.set(`${operation.line}:${target}`, {
              ruleId: rule.id,
              line: operation.line,
              point: [x, y, z],
              canonicalSource: rule.canonicalSource,
              actual,
              disposition: transitionMatch
                ? 'accepted-natural-transition'
                : 'canonical-exact',
            });
          }
        }
        else unexpected.push({ point: [x, y, z], actual });
      }
    }
  }
  const volume = (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
  const partial = partialMasks.has(operation.box.join(','));
  const passed = partial ? matched > 0 : matched === volume;
  if (passed) {
    for (const target of matchedKeys) {
      projectedBlocks.set(target, operation.replacement);
    }
  }
  results.push({
    groupIndex: operation.groupIndex ?? null,
    sourceOverlay: operation.sourceOverlay === true,
    overlayIndex: operation.overlayIndex ?? null,
    overlayGroupIndex: operation.overlayGroupIndex ?? null,
    line: operation.line,
    box: operation.box,
    expected: operation.expected,
    replacement: operation.replacement,
    volume,
    matched,
    partialMask: partial,
    passed,
    unexpectedCount: unexpected.length,
    unexpectedComplete: true,
    // Recovery tooling must be able to distinguish the direct source drift
    // from later order-projection cascades. A truncated sample cannot do that
    // safely, so every failed target is retained in the machine report.
    unexpected: passed ? [] : unexpected,
  });
}

const selectedResults = results.filter(
  (result) => (
    !result.sourceOverlay
    && result.groupIndex >= groupStart
    && result.groupIndex <= groupEnd
  ),
);
const dependencyResults = results.filter(
  (result) => !result.sourceOverlay && result.groupIndex < groupStart,
);
const sourceOverlayResults = results.filter((result) => result.sourceOverlay);
const sourceOverlayFailures = sourceOverlayResults.filter(
  (result) => !result.passed,
);
const selectedPassed = selectedResults.filter((result) => result.passed).length;
const selectedFailed = selectedResults.length - selectedPassed;
const dependencyFailures = dependencyResults.filter((result) => !result.passed);
const scopedEvidence = hasScopedGroupRange
  ? {
    kind: 'guarded-preflight-operation-shard',
    reusableEvidenceOnly: true,
    satisfiesFinalConsolidatedPreflight: false,
    sourceOperationCount: operations.length,
    groupRange: {
      start: groupStart,
      end: groupEnd,
      count: selectedOperations.length,
      lineStart: selectedOperations[0].line,
      lineEnd: selectedOperations.at(-1).line,
    },
    selectedGroupPlanSha256: groupPlanSha256(selectedOperations),
    projectionDependencies: {
      groupCount: dependencyOperations.length,
      groupIndexes: dependencyOperations.map((operation) => operation.groupIndex),
      groupPlanSha256: groupPlanSha256(dependencyOperations),
      passed: dependencyResults.length - dependencyFailures.length,
      failed: dependencyFailures.length,
    },
    exactSnapshotIdentityRequiredForReuse: true,
    unaffectedSnapshotDeltaProof: null,
    transitionPolicySha256: transitionPolicy?.sha256 ?? null,
  }
  : null;
const report = {
  schemaVersion:
    hasScopedGroupRange || sourceOverlayPaths.length > 0
      ? 4
      : (transitionPolicy ? 3 : 2),
  status:
    selectedFailed === 0
      && dependencyFailures.length === 0
      && sourceOverlayFailures.length === 0
      ? 'PASS'
      : 'FAIL',
  generatedAt: new Date().toISOString(),
  opsPath: path.relative(ROOT, opsPath),
  opsSha256,
  regions: path.relative(ROOT, regions),
  regionsSnapshot: hashSnapshotDirectory(regions),
  bounds,
  censusChunks: chunkBounds.size,
  censusConcurrency,
  orderAwareProjection: true,
  // A scoped PASS is complete for its declared range and dependency closure,
  // but deliberately cannot be consumed as a full failed-preflight evidence
  // source by policy/recovery generators.
  failurePointsComplete: !hasScopedGroupRange,
  operationCount: selectedResults.length,
  passed: selectedPassed,
  failed: selectedFailed,
  partialMasks: selectedResults
    .filter((result) => result.partialMask)
    .map(({ line, box, volume, matched }) => ({ line, box, volume, matched })),
  failures: selectedResults.filter((result) => !result.passed),
  scopedEvidence,
  projectionDependencyFailures: dependencyFailures,
  sourceOverlays: sourceOverlayPaths.length > 0
    ? {
      kind: 'exact-guarded-logical-source-overlay',
      physicalExecutionEvidenceRequired: true,
      satisfiesImmutableSnapshotEquality: false,
      artifacts: sourceOverlayArtifacts,
      operationCount: sourceOverlayResults.length,
      passed: sourceOverlayResults.length - sourceOverlayFailures.length,
      failed: sourceOverlayFailures.length,
      failures: sourceOverlayFailures,
      combinedPlanSha256: crypto.createHash('sha256').update(JSON.stringify(
        sourceOverlayArtifacts.map((entry) => ({
          sha256: entry.sha256,
          operationCount: entry.operationCount,
        })),
      )).digest('hex'),
    }
    : null,
  naturalStateTransitionPolicy: transitionPolicy
    ? {
      path: path.relative(ROOT, transitionPolicy.path),
      sha256: transitionPolicy.sha256,
      bytes: transitionPolicy.bytes,
      operationSha256: transitionPolicy.operationSha256,
      executionRole: 'rollback',
      matchMode: 'exact-declared-points',
      propertyPolicy: 'identical',
      evidence: {
        preflightPath: path.relative(
          ROOT,
          transitionPolicy.evidence.preflightPath,
        ),
        preflightSha256: transitionPolicy.evidence.preflightSha256,
        snapshotSha256: transitionPolicy.evidence.snapshotSha256,
        observedTransitionCells:
          transitionPolicy.evidence.observedTransitionCells,
      },
      ruleCount: transitionPolicy.rules.length,
      declaredPointCount: transitionPolicy.declaredPointCount,
      encounteredDeclaredPoints: policyPointResults.size,
      acceptedTransitionCells: [...policyPointResults.values()]
        .filter((entry) => entry.disposition === 'accepted-natural-transition')
        .length,
      canonicalExactCells: [...policyPointResults.values()]
        .filter((entry) => entry.disposition === 'canonical-exact')
        .length,
      unmatchedDeclaredPoints:
        transitionPolicy.declaredPointCount - policyPointResults.size,
      pointResults: [...policyPointResults.values()],
    }
    : null,
};

console.log(
  `${path.basename(opsPath)}: ${report.passed}/${report.operationCount} guards pass; `
  + `${report.failed} fail`,
);
for (const partial of report.partialMasks) {
  console.log(
    `  partial line ${partial.line}: ${partial.matched}/${partial.volume} source cells match`,
  );
}
for (const failure of report.failures.slice(0, 12)) {
  console.log(
    `  FAIL line ${failure.line}: ${failure.matched}/${failure.volume} match `
    + `${failure.expected.join('|')}`,
  );
  for (const entry of failure.unexpected.slice(0, 3)) {
    console.log(`    ${entry.point.join(' ')} -> ${entry.actual}`);
  }
}
for (const failure of sourceOverlayFailures.slice(0, 12)) {
  console.log(
    `  FAIL source overlay ${failure.overlayIndex + 1} line ${failure.line}: `
    + `${failure.matched}/${failure.volume} match ${failure.expected.join('|')}`,
  );
}

if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  report: ${reportPath}`);
}
process.exit(report.status === 'PASS' ? 0 : 1);
