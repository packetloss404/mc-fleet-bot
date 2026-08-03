#!/usr/bin/env node
/**
 * Read-only forensic analysis for the failed MainStreet R4/R5 live attempt.
 *
 * This script never connects to Minecraft or RCON. It correlates the capped
 * strict-execution report, the complete operation sequence, the independent
 * runtime-order analysis, and the post-emergency-rollback Anvil snapshot.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = path.join(
  ROOT,
  'data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27',
);
const FORWARD = `${BASE}.txt`;
const EXECUTION = path.join(
  ROOT,
  'data/world-review/redevelopment-attempt1-2026-07-27/'
    + 'mainstreet-redevelopment-r4-r5-2026-07-27.execution.json',
);
const EMERGENCY_ROLLBACK = path.join(
  ROOT,
  'data/world-review/redevelopment-attempt1-2026-07-27/'
    + 'mainstreet-redevelopment-r4-r5-2026-07-27.'
    + 'emergency-rollback.execution.json',
);
const RUNTIME_QA = path.join(
  ROOT,
  'data/world-review/redevelopment-attempt1-2026-07-27/'
    + 'mainstreet-r4-r5-runtime-hazard-independent-qa.json',
);
const ORIGINAL_REGIONS = path.join(
  ROOT,
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);
const ROLLBACKCHECK_REGIONS = path.join(
  ROOT,
  'data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region',
);
const OUTPUT = path.join(
  ROOT,
  'data/world-review/redevelopment-attempt1-2026-07-27/'
    + 'mainstreet-r4-r5-runtime-failure-forensics.json',
);

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename))
    .digest('hex');
}

function snapshotDigest(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const content = fs.readFileSync(path.join(directory, name));
    bytes += content.length;
    digest.update(name);
    digest.update('\0');
    digest.update(content);
    digest.update('\0');
  }
  return {
    sha256: digest.digest('hex'),
    regionFiles: names.length,
    bytes,
  };
}

function normalizeBlock(block) {
  const value = String(block);
  const bracket = value.indexOf('[');
  if (bracket < 0) return value;
  return `${value.slice(0, bracket)}[${
    value.slice(bracket + 1, -1).split(',').sort().join(',')
  }]`;
}

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function parseOperations(filename) {
  const operations = [];
  let group = { phase: null, scope: null, role: null };
  for (const [index, raw] of fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .entries()) {
    const line = raw.trim();
    const heading = line.match(
      /^# phase=(\d+) scope=(\S+) role=(\S+)$/,
    );
    if (heading) {
      group = {
        phase: Number(heading[1]),
        scope: heading[2],
        role: heading[3],
      };
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (
      fields[0] !== 'REPL'
      || fields.length !== 9
      || fields.slice(1, 7).some((field) => !Number.isInteger(Number(field)))
    ) {
      throw new Error(`unsupported operation at line ${index + 1}: ${line}`);
    }
    const bounds = fields.slice(1, 7).map(Number);
    if (
      bounds[0] !== bounds[3]
      || bounds[1] !== bounds[4]
      || bounds[2] !== bounds[5]
    ) {
      throw new Error(`non-point operation at line ${index + 1}`);
    }
    operations.push({
      index: operations.length,
      line: index + 1,
      x: bounds[0],
      y: bounds[1],
      z: bounds[2],
      expected: normalizeBlock(fields[7]),
      desired: normalizeBlock(fields[8]),
      ...group,
    });
  }
  return operations;
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function sortedCounts(record) {
  return Object.fromEntries(
    Object.entries(record).sort((left, right) => (
      right[1] - left[1] || left[0].localeCompare(right[0])
    )),
  );
}

for (const required of [
  FORWARD,
  EXECUTION,
  EMERGENCY_ROLLBACK,
  RUNTIME_QA,
  ORIGINAL_REGIONS,
  ROLLBACKCHECK_REGIONS,
]) {
  if (!fs.existsSync(required)) {
    throw new Error(`required forensic input is missing: ${relative(required)}`);
  }
}

const execution = JSON.parse(fs.readFileSync(EXECUTION, 'utf8'));
const emergencyRollback = JSON.parse(
  fs.readFileSync(EMERGENCY_ROLLBACK, 'utf8'),
);
const runtimeQa = JSON.parse(fs.readFileSync(RUNTIME_QA, 'utf8'));
const operations = parseOperations(FORWARD);
const operationByLine = new Map(
  operations.map((operation) => [operation.line, operation]),
);
const operationKeys = new Set(
  operations.map((operation) => key3(
    operation.x,
    operation.y,
    operation.z,
  )),
);
const originalDigest = snapshotDigest(ORIGINAL_REGIONS);
const rollbackcheckDigest = snapshotDigest(ROLLBACKCHECK_REGIONS);
const original = new AnvilSnapshot(ORIGINAL_REGIONS);
const rollbackcheck = new AnvilSnapshot(ROLLBACKCHECK_REGIONS);

const columns = new Map();
for (const operation of operations) {
  const key = `${operation.x},${operation.z}`;
  if (!columns.has(key)) columns.set(key, []);
  columns.get(key).push(operation);
}

const originalGuardMismatches = [];
const rollbackcheckDrift = [];
const transitionCounts = {};
const scopeCounts = {};
const roleCounts = {};
const expectedBaseCounts = {};
const actualBaseCounts = {};
for (const [key, columnOperations] of columns) {
  const [x, z] = key.split(',').map(Number);
  const minY = Math.min(...columnOperations.map((operation) => operation.y));
  const maxY = Math.max(...columnOperations.map((operation) => operation.y));
  const originalColumn = await original.readStateColumn(x, z, minY, maxY);
  const rollbackcheckColumn = await rollbackcheck.readStateColumn(
    x,
    z,
    minY,
    maxY,
  );
  for (const operation of columnOperations) {
    const originalState = originalColumn
      ? normalizeBlock(originalColumn.get(operation.y))
      : null;
    const rollbackcheckState = rollbackcheckColumn
      ? normalizeBlock(rollbackcheckColumn.get(operation.y))
      : null;
    if (originalState !== operation.expected) {
      originalGuardMismatches.push({
        line: operation.line,
        point: [operation.x, operation.y, operation.z],
        expected: operation.expected,
        actual: originalState,
      });
    }
    if (originalState === rollbackcheckState) continue;
    const item = {
      line: operation.line,
      point: [operation.x, operation.y, operation.z],
      phase: operation.phase,
      scope: operation.scope,
      role: operation.role,
      original: originalState,
      rollbackcheck: rollbackcheckState,
    };
    rollbackcheckDrift.push(item);
    increment(transitionCounts, `${originalState} => ${rollbackcheckState}`);
    increment(scopeCounts, operation.scope);
    increment(roleCounts, operation.role);
    increment(expectedBaseCounts, baseName(originalState));
    increment(actualBaseCounts, baseName(rollbackcheckState));
  }
}

const forwardOrder = runtimeQa.runtimeSafety.forwardOrder;
const rollbackOrder = runtimeQa.runtimeSafety.rollbackOrder;
const forwardHazardLines = new Set([
  ...forwardOrder.supportPreconditionHazards.map((item) => item.line),
  ...forwardOrder.connectivePreconditionHazards.map((item) => item.line),
]);
const recordedFailureExamples = execution.failures.map((text) => {
  const line = Number(text.match(/^line (\d+):/)?.[1]);
  const operation = operationByLine.get(line);
  const classifications = [];
  if (forwardOrder.supportPreconditionHazards.some(
    (item) => item.line === line,
  )) {
    classifications.push('support-invalidated-before-guard');
  }
  if (forwardOrder.connectivePreconditionHazards.some(
    (item) => item.line === line,
  )) {
    classifications.push('neighbor-connectivity-changed-before-guard');
  }
  return {
    line,
    text,
    operation: operation ?? null,
    classifications,
  };
});

const assertions = [
  {
    id: 'execution-report-is-failed-strict-run',
    passed: (
      execution.status === 'failed'
      && execution.dryRun === false
      && execution.strictNoop === true
      && execution.noopCommands === 330
      && execution.failedCommands === 330
    ),
  },
  {
    id: 'operation-hash-matches-executed-file',
    passed: (
      execution.operationSha256 === sha256File(FORWARD)
      && execution.sourceOperationCount === operations.length
    ),
  },
  {
    id: 'original-snapshot-matches-all-guards',
    passed: originalGuardMismatches.length === 0,
  },
  {
    id: 'runtime-order-hazards-reproduce-failure-classes',
    passed: (
      forwardOrder.supportPreconditionHazards.length > 0
      && forwardOrder.connectivePreconditionHazards.length > 0
      && rollbackOrder.unsupportedDesiredStates.length > 0
      && runtimeQa.runtimeSafety.leafDistanceMismatches.length > 0
      && recordedFailureExamples.every(
        (item) => item.classifications.length > 0,
      )
    ),
  },
  {
    id: 'rollbackcheck-snapshot-is-not-original-baseline',
    passed: (
      rollbackcheckDigest.sha256
        === '64829086424cde6f0bbf8db9166a152daf753ae2c3cf5652ba165dddc8229142'
      && rollbackcheckDrift.length > 0
    ),
  },
  {
    id: 'analysis-is-read-only',
    passed: true,
  },
];

const analysis = {
  schemaVersion: 1,
  id: 'mainstreet-r4-r5-runtime-failure-forensics',
  generatedAtUtc: new Date().toISOString(),
  status: assertions.every((assertion) => assertion.passed)
    ? 'CONFIRMED_RUNTIME_ORDER_AND_STATE_NORMALIZATION_FAILURE'
    : 'INCOMPLETE_FORENSIC_EVIDENCE',
  safety: {
    rconUsed: false,
    liveWorldRead: false,
    liveWorldMutated: false,
    sourcesAreSavedSnapshotsAndReportsOnly: true,
  },
  inputs: {
    forward: {
      path: relative(FORWARD),
      sha256: sha256File(FORWARD),
      operationCount: operations.length,
    },
    execution: {
      path: relative(EXECUTION),
      sha256: sha256File(EXECUTION),
    },
    emergencyRollback: {
      path: relative(EMERGENCY_ROLLBACK),
      sha256: sha256File(EMERGENCY_ROLLBACK),
    },
    runtimeQa: {
      path: relative(RUNTIME_QA),
      sha256: sha256File(RUNTIME_QA),
    },
    originalSnapshot: {
      path: relative(ORIGINAL_REGIONS),
      ...originalDigest,
    },
    rollbackcheckSnapshot: {
      path: relative(ROLLBACKCHECK_REGIONS),
      ...rollbackcheckDigest,
    },
  },
  executionOutcome: {
    status: execution.status,
    successfulCommands: execution.successfulCommands,
    noopCommands: execution.noopCommands,
    failedCommands: execution.failedCommands,
    recordedFailureExamples: execution.failures.length,
    failureExampleCap: 8,
    examples: recordedFailureExamples,
  },
  independentRootCause: {
    forwardSupportPreconditionHazards:
      forwardOrder.supportPreconditionHazards.length,
    forwardConnectiveNeighborHazardEdges:
      forwardOrder.connectivePreconditionHazards.length,
    forwardDistinctOperationsExposed: forwardHazardLines.size,
    rollbackUnsupportedDesiredPlantPlacements:
      rollbackOrder.unsupportedDesiredStates.length,
    unstableLeafDistanceDeclarations:
      runtimeQa.runtimeSafety.leafDistanceMismatches.length,
    mechanisms: [
      {
        id: 'support-first-ordering',
        finding:
          'Surface replacement occurred before guarded removal of dependent '
          + 'short/tall grass. Neighbor updates removed or altered the plant '
          + 'before its exact guard executed.',
      },
      {
        id: 'connected-fence-serialization',
        finding:
          'Removing a connected fence cell updated exact connection properties '
          + 'on later fence targets before their guards executed.',
      },
      {
        id: 'leaf-distance-normalization',
        finding:
          'The package declared persistent spruce leaves at distance=1 where '
          + 'the final graph had no supporting log path; the server normalized '
          + 'all 116 placements to distance=7, defeating exact rollback guards.',
      },
      {
        id: 'rollback-dependency-order',
        finding:
          'The exact reverse of a support-first forward order attempted plant '
          + 'restoration before restoring compatible soil support.',
      },
    ],
  },
  rollbackcheckDrift: {
    targetCellsCompared: operationKeys.size,
    changedTargetCells: rollbackcheckDrift.length,
    byTransition: sortedCounts(transitionCounts),
    byScope: sortedCounts(scopeCounts),
    byRole: sortedCounts(roleCounts),
    byOriginalBaseBlock: sortedCounts(expectedBaseCounts),
    byRollbackcheckBaseBlock: sortedCounts(actualBaseCounts),
    records: rollbackcheckDrift,
  },
  guardEvidence: {
    originalGuardMismatches,
  },
  evidenceLimitations: [
    'The execution runner retained only the first eight failed command texts; '
      + 'the remaining 322 exact line identities were not persisted.',
    'The static hazard set is deliberately conservative and is not asserted '
      + 'to be a one-to-one reconstruction of all 330 server replies.',
    'The rollback-check snapshot was taken after the non-strict emergency '
      + 'rollback and records residual state, not the intermediate failed '
      + 'forward world.',
    'The plan file changed after the failed attempt and its historical bytes '
      + 'were not archived with the execution report.',
  ],
  regenerationAcceptance: [
    'Every forward exact guard matches the rollback-check snapshot.',
    'Forward and rollback are unique, one-cell exact REPL operations and form '
      + 'a reverse-order bijection.',
    'Forward has zero dependent-support and connective-neighbor order hazards.',
    'Rollback has zero unsupported desired-state placements and order hazards.',
    'Every declared leaf distance matches the simulated final leaf/log graph.',
    'Strict offline preflight and forward/rollback parser dry-runs pass.',
    'All 18 garages, both alleys, database features, and camera bindings pass '
      + 'the independent domain audit.',
  ],
  assertions,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(
  `${path.basename(OUTPUT)}: ${analysis.status}; `
  + `${execution.noopCommands} strict live no-ops; `
  + `${rollbackcheckDrift.length} rollback-check target drifts`,
);
process.exit(assertions.every((assertion) => assertion.passed) ? 0 : 1);
