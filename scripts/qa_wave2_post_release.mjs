#!/usr/bin/env node
/**
 * Read-only post-release acceptance for the Wave 2 guarded transaction.
 *
 * Required evidence is supplied explicitly. The script reads immutable Anvil
 * snapshots and SQLite in read-only mode; it never connects to Minecraft and
 * never changes the world or database.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const args = process.argv.slice(2);

function value(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function required(flag) {
  const result = value(flag);
  if (!result) {
    throw new Error(
      `missing ${flag}; use --contract to print the post-release evidence contract`,
    );
  }
  return path.resolve(ROOT, result);
}

const manifestPath = path.resolve(
  ROOT,
  value(
    '--manifest',
    'data/buildops/redevelopment-wave2-release-manifest.json',
  ),
);
const databasePath = path.resolve(
  ROOT,
  value('--database', 'data/world-map.db'),
);
const outputPath = path.resolve(
  ROOT,
  value(
    '--out',
    'data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json',
  ),
);

const contract = {
  command: [
    'node scripts/qa_wave2_post_release.mjs',
    '--post <immutable-post-region-directory>',
    '--transaction <atomic-transaction-ledger.json>',
    '--route-report <bidirectional-route-report.json>',
    '--raven-after-report <raven-after-capture-report.json>',
    '--mainstreet-after-report <mainstreet-after-capture-report.json>',
    '--database data/world-map.db',
    '--out data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json',
  ].join(' '),
  transaction: {
    status: 'committed-pending-post-qa',
    packageOrder: ['ravenrock-t2b', 'mainstreet-r08'],
    packageStatus: 'committed',
    hashesMustMatchManifest: true,
  },
  routes: [
    {
      id: 'RR-T2B-W2-BIDIRECTIONAL',
      aliases: ['ravenrock-t2b', 'rr-t2b-w2'],
      endpointA: [-145, 3, 187],
      endpointB: [-136, 2, 182],
      directions: 2,
    },
    {
      id: 'MSA-R08-WEST-EAST-BIDIRECTIONAL',
      aliases: ['mainstreet-r08', 'r08-west-east'],
      endpointA: [-57, 65, -124],
      endpointB: [56, 65, -124],
      directions: 2,
    },
  ],
  routeReport: {
    status: 'PASS',
    postSnapshotSha256Required: true,
    packageHashesRequired: true,
    eachTest: {
      passed: true,
      forwardAndReverseRequired: true,
      movementPolicyViolations: 0,
    },
  },
  media: {
    ravenrock: 6,
    mainstreet: 8,
    sameManifestHash: true,
    sameCameraParameters: true,
    postSnapshotHashRequired: true,
    currentPngHashRequired: true,
  },
  database: {
    proposedExternalIdsRequired: 51,
    readonlyAudit: true,
  },
};

if (args.includes('--contract')) {
  console.log(JSON.stringify(contract, null, 2));
  process.exit(0);
}

const postRegions = required('--post');
const transactionPath = required('--transaction');
const routeReportPath = required('--route-report');
const ravenAfterReportPath = required('--raven-after-report');
const mainstreetAfterReportPath = required('--mainstreet-after-report');

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256File(filename) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filename))
    .digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function normalizeState(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return state;
  const properties = state
    .slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort()
    .join(',');
  return `${state.slice(0, bracket)}[${properties}]`;
}

function baseName(state) {
  return String(state).split('[', 1)[0];
}

function key(point) {
  return point.join(',');
}

function pointFromKey(pointKey) {
  return pointKey.split(',').map(Number);
}

function splitMasks(mask) {
  const output = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === '[') depth += 1;
    else if (mask[index] === ']') depth -= 1;
    else if (mask[index] === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output.filter(Boolean).map(normalizeState);
}

function parseOperations(filename) {
  const repl = [];
  const commands = [];
  const cells = new Map();
  for (const [lineIndex, rawLine] of fs
    .readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .entries()) {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    const line = lineIndex + 1;
    if (fields[0] === 'CMD') {
      const match = raw.match(
        /^CMD execute if block (-?\d+) (-?\d+) (-?\d+) (minecraft:\S+) run data merge block (-?\d+) (-?\d+) (-?\d+) (.+)$/,
      );
      if (!match) throw new Error(`${filename}:${line}: malformed CMD`);
      commands.push({
        line,
        guardPoint: match.slice(1, 4).map(Number),
        guardState: normalizeState(match[4]),
        mergePoint: match.slice(5, 8).map(Number),
        nbt: match[8],
        text: [...match[8].matchAll(/"text":"([^"]*)"/g)]
          .map((entry) => entry[1]),
      });
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      throw new Error(`${filename}:${line}: unsupported operation`);
    }
    const box = fields.slice(1, 7).map(Number);
    const sources = splitMasks(fields[7]);
    const desired = normalizeState(fields[8]);
    const operation = { line, box, sources, desired, cells: [] };
    const [rx1, ry1, rz1, rx2, ry2, rz2] = box;
    for (let y = Math.min(ry1, ry2); y <= Math.max(ry1, ry2); y += 1) {
      for (let z = Math.min(rz1, rz2); z <= Math.max(rz1, rz2); z += 1) {
        for (let x = Math.min(rx1, rx2); x <= Math.max(rx1, rx2); x += 1) {
          const cell = { point: [x, y, z], line, sources, desired };
          const pointKey = key(cell.point);
          if (cells.has(pointKey)) {
            throw new Error(`${filename}:${line}: duplicate target ${pointKey}`);
          }
          cells.set(pointKey, cell);
          operation.cells.push(cell);
        }
      }
    }
    repl.push(operation);
  }
  return {
    path: filename,
    sha256: sha256File(filename),
    repl,
    commands,
    cells,
  };
}

function parseState(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return { name: state, properties: {} };
  return {
    name: state.slice(0, bracket),
    properties: Object.fromEntries(
      state
        .slice(bracket + 1, -1)
        .split(',')
        .filter(Boolean)
        .map((property) => property.split('=')),
    ),
  };
}

function formatState(name, properties) {
  const names = Object.keys(properties).sort();
  return names.length === 0
    ? name
    : `${name}[${names.map((name_) => `${name_}=${properties[name_]}`).join(',')}]`;
}

function updateFenceProperty(state, property, connected) {
  const parsed = parseState(state);
  if (!parsed.name.endsWith('_fence') || !(property in parsed.properties)) {
    return state;
  }
  parsed.properties[property] = connected ? 'true' : 'false';
  return formatState(parsed.name, parsed.properties);
}

const DIRECTIONS = [
  { offset: [-1, 0, 0], neighbor: 'east' },
  { offset: [1, 0, 0], neighbor: 'west' },
  { offset: [0, 0, -1], neighbor: 'south' },
  { offset: [0, 0, 1], neighbor: 'north' },
];

async function stateAt(snapshot, states, point) {
  const pointKey = key(point);
  if (!states.has(pointKey)) {
    states.set(pointKey, normalizeState(await snapshot.getBlock(...point)));
  }
  return states.get(pointKey);
}

async function applyCell(snapshot, states, cell) {
  const current = await stateAt(snapshot, states, cell.point);
  if (!cell.sources.includes(current)) {
    return {
      passed: false,
      point: cell.point,
      line: cell.line,
      current,
      sources: cell.sources,
    };
  }
  states.set(key(cell.point), cell.desired);
  const oldFence = baseName(current).endsWith('_fence');
  const newFence = baseName(cell.desired).endsWith('_fence');
  if (oldFence === newFence) return { passed: true };
  for (const direction of DIRECTIONS) {
    const neighborPoint = cell.point.map(
      (coordinate, index) => coordinate + direction.offset[index],
    );
    const neighbor = await stateAt(snapshot, states, neighborPoint);
    if (!baseName(neighbor).endsWith('_fence')) continue;
    states.set(
      key(neighborPoint),
      updateFenceProperty(neighbor, direction.neighbor, newFence),
    );
  }
  return { passed: true };
}

function artifact(filename) {
  return {
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function closePoint(left, right, tolerance = 1.5) {
  return (
    Array.isArray(left)
    && left.length === 3
    && left.every(
      (coordinate, index) => Math.abs(coordinate - right[index]) <= tolerance,
    )
  );
}

function directionEndpoints(direction) {
  const start = direction.start ?? direction.from ?? null;
  const legs = direction.legs ?? [];
  const end = direction.to
    ?? (legs.length > 0 ? legs[legs.length - 1].target : null);
  return { start, end };
}

function validateRouteTest(test, expected) {
  if (!test || test.passed !== true) {
    return { passed: false, reason: 'missing-or-failed-test' };
  }
  const directions = test.directions ?? [];
  const pairs = directions.map((direction) => ({
    ...directionEndpoints(direction),
    passed: direction.passed === true,
    violations: [
      ...(direction.violations ?? []),
      ...(direction.movementPolicyViolations ?? []),
    ],
  }));
  const forward = pairs.find((entry) => (
    entry.passed
    && entry.violations.length === 0
    && closePoint(entry.start, expected.endpointA)
    && closePoint(entry.end, expected.endpointB)
  ));
  const reverse = pairs.find((entry) => (
    entry.passed
    && entry.violations.length === 0
    && closePoint(entry.start, expected.endpointB)
    && closePoint(entry.end, expected.endpointA)
  ));
  return {
    passed: Boolean(forward && reverse),
    directionCount: directions.length,
    forwardFound: Boolean(forward),
    reverseFound: Boolean(reverse),
  };
}

function findRouteTest(report, expected) {
  const normalized = [expected.id, ...expected.aliases]
    .map((entry) => entry.toLowerCase());
  return (report.tests ?? []).find((test) => (
    normalized.some((candidate) => (
      String(test.id).toLowerCase() === candidate
      || String(test.id).toLowerCase().includes(candidate)
    ))
  ));
}

function reportPackageHashes(routeReport) {
  return Object.values(routeReport.packageHashes ?? {})
    .map((entry) => entry?.sha256)
    .filter(Boolean);
}

function cameraParameters(capture) {
  return JSON.stringify(capture.camera ?? null);
}

function validateAfterMedia({
  manifestPath: cameraManifestPath,
  beforeReportPath,
  afterReportPath,
  expectedCount,
  postSha256,
}) {
  const manifest = readJson(cameraManifestPath);
  const before = readJson(beforeReportPath);
  const after = readJson(afterReportPath);
  const beforeById = new Map(before.captures.map((entry) => [entry.id, entry]));
  const afterById = new Map(after.captures.map((entry) => [entry.id, entry]));
  const captures = manifest.cameras.map((camera) => {
    const beforeCapture = beforeById.get(camera.id);
    const afterCapture = afterById.get(camera.id);
    const output = afterCapture?.output
      ? path.resolve(ROOT, afterCapture.output)
      : null;
    const actualSha256 = output && fs.existsSync(output)
      ? sha256File(output)
      : null;
    return {
      id: camera.id,
      primaryFeatureId: camera.primaryFeatureId,
      output: output ? relative(output) : null,
      exists: Boolean(output && fs.existsSync(output)),
      reportSha256: afterCapture?.sha256 ?? null,
      actualSha256,
      sameCameraParameters:
        cameraParameters(beforeCapture) === cameraParameters(afterCapture),
      changedFromBefore:
        beforeCapture?.sha256 !== afterCapture?.sha256,
      passed: Boolean(
        beforeCapture
        && afterCapture
        && output
        && fs.existsSync(output)
        && afterCapture.sha256 === actualSha256
        && beforeCapture.primaryFeatureId === camera.primaryFeatureId
        && afterCapture.primaryFeatureId === camera.primaryFeatureId
        && cameraParameters(beforeCapture) === cameraParameters(afterCapture)
      ),
    };
  });
  return {
    manifest: artifact(cameraManifestPath),
    beforeReport: artifact(beforeReportPath),
    afterReport: artifact(afterReportPath),
    expectedCount,
    captureCount: captures.length,
    changedCaptures: captures.filter((capture) => capture.changedFromBefore).length,
    captures,
    passed: (
      captures.length === expectedCount
      && after.status === 'PASS'
      && after.passed === true
      && after.captureCount === expectedCount
      && after.snapshot?.sha256 === postSha256
      && after.sourceManifestSha256 === sha256File(cameraManifestPath)
      && captures.every((capture) => capture.passed)
      && captures.some((capture) => capture.changedFromBefore)
    ),
  };
}

const gates = [];
function gate(id, passed, details = {}) {
  gates.push({ id, passed: Boolean(passed), details });
}

const manifest = readJson(manifestPath);
const preRegions = path.resolve(ROOT, manifest.baselineRegions);
const preDigest = hashSnapshotDirectory(preRegions);
const postDigest = hashSnapshotDirectory(postRegions);
const preSnapshot = new DetailedAnvilSnapshot(preRegions);
const postSnapshot = new DetailedAnvilSnapshot(postRegions);
gate('pre-and-post-snapshot-identity',
  preDigest.sha256 === manifest.baselineSha256
    && postDigest.sha256 !== preDigest.sha256,
  {
    pre: {
      path: relative(preRegions),
      sha256: preDigest.sha256,
      regionFileCount: preDigest.regionFileCount,
      bytes: preDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    },
    post: {
      path: relative(postRegions),
      sha256: postDigest.sha256,
      regionFileCount: postDigest.regionFileCount,
      bytes: postDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    },
  });

const packages = [];
for (const definition of manifest.packages) {
  const forwardPath = path.resolve(ROOT, definition.forward);
  const rollbackPath = path.resolve(ROOT, definition.rollback);
  const forward = parseOperations(forwardPath);
  const rollback = parseOperations(rollbackPath);
  const reactive = new Set((definition.reactiveCells ?? []).map(key));

  const projection = new Map();
  const projectionFailures = [];
  for (const operation of forward.repl) {
    for (const cell of operation.cells) {
      const result = await applyCell(preSnapshot, projection, cell);
      if (!result.passed) projectionFailures.push(result);
    }
  }

  const explicitPostMismatches = [];
  const rollbackGuardMismatches = [];
  for (const [target, forwardCell] of forward.cells) {
    const actual = normalizeState(await postSnapshot.getBlock(...forwardCell.point));
    if (actual !== forwardCell.desired) {
      explicitPostMismatches.push({
        point: forwardCell.point,
        expected: forwardCell.desired,
        actual,
      });
    }
    const rollbackCell = rollback.cells.get(target);
    if (!rollbackCell?.sources.includes(actual)) {
      rollbackGuardMismatches.push({
        point: forwardCell.point,
        actual,
        rollbackSources: rollbackCell?.sources ?? [],
      });
    }
  }
  const reactivePostMismatches = [];
  for (const target of reactive) {
    const point = pointFromKey(target);
    const expected = projection.get(target);
    const actual = normalizeState(await postSnapshot.getBlock(...point));
    if (actual !== expected) {
      reactivePostMismatches.push({ point, expected, actual });
    }
  }

  const rollbackProjection = new Map();
  for (const target of new Set([...forward.cells.keys(), ...reactive])) {
    rollbackProjection.set(
      target,
      normalizeState(await postSnapshot.getBlock(...pointFromKey(target))),
    );
  }
  const rollbackSimulationFailures = [];
  for (const operation of rollback.repl) {
    for (const cell of operation.cells) {
      const result = await applyCell(postSnapshot, rollbackProjection, cell);
      if (!result.passed) rollbackSimulationFailures.push(result);
    }
  }
  const restorationMismatches = [];
  for (const target of new Set([...forward.cells.keys(), ...reactive])) {
    const point = pointFromKey(target);
    const expected = normalizeState(await preSnapshot.getBlock(...point));
    const projected = rollbackProjection.get(target);
    if (projected !== expected) {
      restorationMismatches.push({ point, expected, projected });
    }
  }

  const bounds = [
    Math.min(...[...forward.cells.values()].map((cell) => cell.point[0])),
    Math.min(...[...forward.cells.values()].map((cell) => cell.point[1])),
    Math.min(...[...forward.cells.values()].map((cell) => cell.point[2])),
    Math.max(...[...forward.cells.values()].map((cell) => cell.point[0])),
    Math.max(...[...forward.cells.values()].map((cell) => cell.point[1])),
    Math.max(...[...forward.cells.values()].map((cell) => cell.point[2])),
  ];
  const postBlockEntities = await postSnapshot.blockEntitiesInBox(bounds);
  const blockEntitiesByPoint = new Map(
    postBlockEntities.map((entity) => [
      `${entity.x},${entity.y},${entity.z}`,
      entity,
    ]),
  );
  const commandChecks = forward.commands.map((command) => {
    const entity = blockEntitiesByPoint.get(key(command.guardPoint));
    const serialized = JSON.stringify(entity ?? {});
    return {
      point: command.guardPoint,
      guardState: command.guardState,
      text: command.text,
      entityPresent: Boolean(entity),
      allTextPresent: command.text.every((text) => serialized.includes(text)),
      passed: Boolean(
        entity
        && command.text.length === 4
        && command.text.every((text) => serialized.includes(text))
      ),
    };
  });

  const result = {
    key: definition.key,
    forward: artifact(forwardPath),
    rollback: artifact(rollbackPath),
    explicitTargetCells: forward.cells.size,
    reactiveCells: [...reactive].map(pointFromKey),
    projectionFailures,
    explicitPostMismatches,
    reactivePostMismatches,
    rollbackGuardMismatches,
    rollbackMatched: forward.cells.size - rollbackGuardMismatches.length,
    rollbackSimulationFailures,
    restorationMismatches,
    commandChecks,
    passed: (
      projectionFailures.length === 0
      && explicitPostMismatches.length === 0
      && reactivePostMismatches.length === 0
      && rollbackGuardMismatches.length === 0
      && rollbackSimulationFailures.length === 0
      && restorationMismatches.length === 0
      && commandChecks.every((entry) => entry.passed)
    ),
  };
  packages.push(result);
  gate(`post-state-and-rollback-${definition.key}`, result.passed, {
    explicitTargetCells: result.explicitTargetCells,
    reactiveCells: result.reactiveCells.length,
    explicitPostMismatches: explicitPostMismatches.length,
    reactivePostMismatches: reactivePostMismatches.length,
    rollbackMatched: result.rollbackMatched,
    rollbackGuardMismatches: rollbackGuardMismatches.length,
    rollbackSimulationFailures: rollbackSimulationFailures.length,
    restorationMismatches: restorationMismatches.length,
    guardedCommands: commandChecks.length,
    guardedCommandFailures: commandChecks.filter((entry) => !entry.passed).length,
  });
}

const transaction = readJson(transactionPath);
const transactionByKey = new Map(
  (transaction.packages ?? []).map((entry) => [entry.key, entry]),
);
const transactionPackageChecks = manifest.packages.map((definition) => {
  const entry = transactionByKey.get(definition.key);
  const localEntityPackage = entry?.preExecutionEntityGateResult?.packages?.[0];
  return {
    key: definition.key,
    status: entry?.status ?? null,
    forwardHashMatched:
      entry?.forwardSha256 === sha256File(path.resolve(ROOT, definition.forward)),
    rollbackHashMatched:
      entry?.rollbackSha256 === sha256File(path.resolve(ROOT, definition.rollback)),
    executionPassed: (
      entry?.execution?.status === 'complete'
      && entry?.execution?.strictNoop === true
      && entry?.execution?.failedGroups === 0
      && entry?.execution?.failedCommands === 0
      && entry?.execution?.operationSha256 === entry?.forwardSha256
    ),
    localEntityGatePassed: (
      entry?.preExecutionEntityGateResult?.status === 'PASS'
      && entry?.preExecutionEntityGateResult?.passed === true
      && localEntityPackage?.passed === true
      && localEntityPackage?.file === definition.forward
      && localEntityPackage?.operationSha256 === entry?.forwardSha256
    ),
    passed: Boolean(
      entry?.status === 'committed'
      && entry?.forwardSha256
        === sha256File(path.resolve(ROOT, definition.forward))
      && entry?.rollbackSha256
        === sha256File(path.resolve(ROOT, definition.rollback))
      && entry?.execution?.status === 'complete'
      && entry?.execution?.strictNoop === true
      && entry?.execution?.failedGroups === 0
      && entry?.execution?.failedCommands === 0
      && entry?.execution?.operationSha256 === entry?.forwardSha256
      && entry?.preExecutionEntityGateResult?.status === 'PASS'
      && entry?.preExecutionEntityGateResult?.passed === true
      && localEntityPackage?.passed === true
      && localEntityPackage?.file === definition.forward
      && localEntityPackage?.operationSha256 === entry?.forwardSha256
    ),
  };
});
const liveEntityGatePath = path.resolve(ROOT, transaction.liveEntityGate);
const liveEntityGate = readJson(liveEntityGatePath);
const liveEntityByFile = new Map(
  (liveEntityGate.packages ?? []).map((entry) => [entry.file, entry]),
);
const liveEntityPackageChecks = manifest.packages.map((definition) => {
  const entry = liveEntityByFile.get(definition.forward);
  return {
    key: definition.key,
    passed: Boolean(
      entry?.passed === true
      && entry?.operationSha256
        === sha256File(path.resolve(ROOT, definition.forward))
      && (entry?.blockers ?? []).length === 0
      && (entry?.queryErrors ?? []).length === 0
    ),
  };
});
gate('all-package-live-entity-gate',
  liveEntityGate.status === 'PASS'
    && liveEntityGate.passed === true
    && liveEntityGate.blockOrEntityMutation === false
    && liveEntityPackageChecks.every((entry) => entry.passed),
  {
    artifact: artifact(liveEntityGatePath),
    status: liveEntityGate.status,
    packageChecks: liveEntityPackageChecks,
    blockOrEntityMutation: liveEntityGate.blockOrEntityMutation,
  });
gate('atomic-transaction-committed',
  transaction.transactionId === manifest.transactionId
    && transaction.status === 'committed-pending-post-qa'
    && transaction.releaseManifestSha256 === sha256File(manifestPath)
    && path.resolve(transaction.preReleaseRegions) === preRegions
    && JSON.stringify((transaction.packages ?? []).map((entry) => entry.key))
      === JSON.stringify(manifest.packages.map((entry) => entry.key))
    && transactionPackageChecks.every((entry) => entry.passed)
    && (transaction.events ?? []).some(
      (event) => event.event === 'transaction-committed',
    ),
  {
    artifact: artifact(transactionPath),
    transactionId: transaction.transactionId,
    status: transaction.status,
    releaseManifestSha256: transaction.releaseManifestSha256,
    packageChecks: transactionPackageChecks,
  });

const routeReport = readJson(routeReportPath);
const routeHashes = reportPackageHashes(routeReport);
const routeChecks = contract.routes.map((expected) => ({
  id: expected.id,
  ...validateRouteTest(findRouteTest(routeReport, expected), expected),
}));
gate('bidirectional-live-routes',
  routeReport.status === 'PASS'
    && routeReport.postSnapshot?.sha256 === postDigest.sha256
    && packages.every((entry) => routeHashes.includes(entry.forward.sha256))
    && routeChecks.every((entry) => entry.passed),
  {
    artifact: artifact(routeReportPath),
    status: routeReport.status,
    postSnapshotSha256: routeReport.postSnapshot?.sha256 ?? null,
    operationHashesBound:
      packages.filter((entry) => routeHashes.includes(entry.forward.sha256)).length,
    routeChecks,
  });

const mainstreetDefinition = manifest.packages.find(
  (entry) => entry.key === 'mainstreet-r08',
);
const ravenDefinition = manifest.packages.find(
  (entry) => entry.key === 'ravenrock-t2b',
);
const mainstreetReport = readJson(path.resolve(
  ROOT,
  mainstreetDefinition.forward.replace(/\.txt$/, '.report.json'),
));
const ravenReport = readJson(path.resolve(
  ROOT,
  ravenDefinition.forward.replace(/\.txt$/, '.report.json'),
));
const mainstreetManifestPath = path.resolve(ROOT, mainstreetReport.media.manifest);
const ravenManifestPath = path.resolve(ROOT, ravenReport.cameras.manifest);

function findBeforeReport(cameraManifestPath) {
  const manifestSha256 = sha256File(cameraManifestPath);
  const parent = path.dirname(cameraManifestPath);
  const candidates = [
    path.join(parent, 'before-capture-report.json'),
    path.join(parent, 'before', 'capture-report.json'),
    path.join(parent, 'before-prerelease', 'capture-report.json'),
  ];
  const result = candidates.find((filename) => (
    fs.existsSync(filename)
    && readJson(filename).sourceManifestSha256 === manifestSha256
  ));
  if (!result) throw new Error(`no authoritative before report for ${cameraManifestPath}`);
  return result;
}

const mainstreetMedia = validateAfterMedia({
  manifestPath: mainstreetManifestPath,
  beforeReportPath: findBeforeReport(mainstreetManifestPath),
  afterReportPath: mainstreetAfterReportPath,
  expectedCount: 8,
  postSha256: postDigest.sha256,
});
const ravenMedia = validateAfterMedia({
  manifestPath: ravenManifestPath,
  beforeReportPath: findBeforeReport(ravenManifestPath),
  afterReportPath: ravenAfterReportPath,
  expectedCount: 6,
  postSha256: postDigest.sha256,
});
gate('matched-after-media',
  mainstreetMedia.passed && ravenMedia.passed,
  { mainstreet: mainstreetMedia, ravenrock: ravenMedia });

const ravenProposal = readJson(path.resolve(
  ROOT,
  ravenReport.databaseFeatures.proposalPath,
));
const proposedIds = [
  ...mainstreetReport.databaseFeatures.features.map((entry) => entry.external_id),
  ...ravenProposal.features.map((entry) => entry.externalId),
];
const databaseSha256BeforeRead = sha256File(databasePath);
const database = new Database(databasePath, {
  readonly: true,
  fileMustExist: true,
});
const importedRows = database.prepare(
  `SELECT id, project_id, external_id, name, kind, status, tags_json, attributes_json
   FROM world_features
   WHERE external_id IN (${proposedIds.map(() => '?').join(',')})`,
).all(...proposedIds);
database.close();
const databaseSha256AfterRead = sha256File(databasePath);
const importedIds = new Set(importedRows.map((entry) => entry.external_id));
const missingIds = proposedIds.filter((externalId) => !importedIds.has(externalId));
gate('database-import',
  proposedIds.length === 51
    && new Set(proposedIds).size === 51
    && importedRows.length === 51
    && missingIds.length === 0
    && databaseSha256BeforeRead === databaseSha256AfterRead,
  {
    database: relative(databasePath),
    sha256BeforeRead: databaseSha256BeforeRead,
    sha256AfterRead: databaseSha256AfterRead,
    expectedExternalIds: proposedIds.length,
    importedRows: importedRows.length,
    missingExternalIds: missingIds,
    readonlyAudit: true,
  });

const failures = gates.filter((entry) => !entry.passed);
const passed = failures.length === 0;
const report = {
  schemaVersion: 1,
  id: 'redevelopment-wave2-post-release-qa',
  generatedAtUtc: new Date().toISOString(),
  status: passed ? 'PASS' : 'FAIL',
  passed,
  readOnly: true,
  liveWorldMutated: false,
  databaseMutated: false,
  manifest: artifact(manifestPath),
  transaction: artifact(transactionPath),
  liveEntityGate: artifact(liveEntityGatePath),
  routeReport: artifact(routeReportPath),
  snapshots: {
    pre: {
      path: relative(preRegions),
      sha256: preDigest.sha256,
      regionFileCount: preDigest.regionFileCount,
      bytes: preDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    },
    post: {
      path: relative(postRegions),
      sha256: postDigest.sha256,
      regionFileCount: postDigest.regionFileCount,
      bytes: postDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    },
  },
  totals: {
    packages: packages.length,
    explicitTargetCells: packages.reduce(
      (sum, entry) => sum + entry.explicitTargetCells,
      0,
    ),
    reactiveCells: packages.reduce(
      (sum, entry) => sum + entry.reactiveCells.length,
      0,
    ),
    rollbackMatched: packages.reduce(
      (sum, entry) => sum + entry.rollbackMatched,
      0,
    ),
    guardedCommands: packages.reduce(
      (sum, entry) => sum + entry.commandChecks.length,
      0,
    ),
    routes: routeChecks.length,
    directions: routeChecks.reduce(
      (sum, entry) => sum + (entry.directionCount ?? 0),
      0,
    ),
    matchedAfterCameras:
      mainstreetMedia.captureCount + ravenMedia.captureCount,
    importedDatabaseFeatures: importedRows.length,
  },
  packages,
  routeChecks,
  media: {
    mainstreet: mainstreetMedia,
    ravenrock: ravenMedia,
  },
  database: {
    path: relative(databasePath),
    sha256: databaseSha256AfterRead,
    importedRows: importedRows.length,
    missingIds,
  },
  gates,
  failures,
  decision: passed
    ? {
      release: 'ACCEPTED',
      rationale:
        'Atomic transaction, immutable installed state, reactive fence state, '
        + 'rollback postflight, routes, matched after media, and database import '
        + 'all pass.',
    }
    : {
      release: 'REJECTED_OR_INCOMPLETE',
      rationale: `Failed gates: ${failures.map((entry) => entry.id).join(', ')}`,
    },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: relative(outputPath),
  totals: report.totals,
  failedGates: failures.map((entry) => entry.id),
}, null, 2));
process.exitCode = passed ? 0 : 1;
