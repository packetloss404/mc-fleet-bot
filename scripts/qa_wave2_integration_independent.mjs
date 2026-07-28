#!/usr/bin/env node
/**
 * Independent, offline integration audit for the Wave 2 guarded release.
 *
 * This script reads immutable Anvil files, operation artifacts, JSON evidence,
 * and world-map.db in SQLite read-only mode. It never connects to Minecraft and
 * never mutates the database or live world.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const minecraftData = require('minecraft-data')('1.21.11');
const args = process.argv.slice(2);

function value(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const manifestPath = path.resolve(
  ROOT,
  value(
    '--manifest',
    'data/buildops/redevelopment-wave2-release-manifest.json',
  ),
);
const outputPath = path.resolve(
  ROOT,
  value(
    '--out',
    'data/world-review/redevelopment-wave2-integration-independent-qa-2026-07-28.json',
  ),
);
const r1ManifestPath = path.resolve(
  ROOT,
  'data/buildops/redevelopment-r1-release-manifest.json',
);
const databasePath = path.resolve(ROOT, 'data/world-map.db');

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

function key(point) {
  return point.join(',');
}

function pointFromKey(value_) {
  return value_.split(',').map(Number);
}

function normalizeState(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return state;
  const name = state.slice(0, bracket);
  const properties = state
    .slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function baseName(state) {
  return String(state).split('[', 1)[0];
}

function splitMasks(mask) {
  const masks = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === '[') depth += 1;
    else if (mask[index] === ']') depth -= 1;
    else if (mask[index] === ',' && depth === 0) {
      masks.push(mask.slice(start, index));
      start = index + 1;
    }
    if (depth < 0) throw new Error(`malformed finite union: ${mask}`);
  }
  if (depth !== 0) throw new Error(`malformed finite union: ${mask}`);
  masks.push(mask.slice(start));
  return masks.filter(Boolean).map(normalizeState);
}

function stateCompleteness(state) {
  const normalized = normalizeState(state);
  const bracket = normalized.indexOf('[');
  const name = (
    bracket < 0 ? normalized : normalized.slice(0, bracket)
  ).replace(/^minecraft:/, '');
  const definition = minecraftData.blocksByName[name];
  if (!definition) {
    return { state: normalized, complete: false, reason: 'unknown-block' };
  }
  const required = (definition.states ?? []).map(({ name: property }) => property).sort();
  const provided = bracket < 0
    ? []
    : normalized
      .slice(bracket + 1, -1)
      .split(',')
      .filter(Boolean)
      .map((property) => property.split('=', 1)[0])
      .sort();
  return {
    state: normalized,
    complete: (
      required.length === provided.length
      && required.every((property, index) => property === provided[index])
    ),
    required,
    provided,
  };
}

function parseOperations(filename) {
  const repl = [];
  const commands = [];
  const cells = new Map();
  const errors = [];
  let finiteUnionGroups = 0;
  let duplicateTargetCells = 0;
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const raw = lines[lineIndex].trim();
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    const line = lineIndex + 1;
    if (fields[0] === 'CMD') {
      const match = raw.match(
        /^CMD execute if block (-?\d+) (-?\d+) (-?\d+) (minecraft:\S+) run data merge block (-?\d+) (-?\d+) (-?\d+) (.+)$/,
      );
      if (!match) {
        errors.push({ line, reason: 'unguarded-or-malformed-command', raw });
        continue;
      }
      commands.push({
        line,
        raw,
        guardPoint: match.slice(1, 4).map(Number),
        guardState: normalizeState(match[4]),
        mergePoint: match.slice(5, 8).map(Number),
        nbt: match[8],
      });
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      errors.push({ line, reason: 'unsupported-or-malformed-operation', raw });
      continue;
    }
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((coordinate) => !Number.isSafeInteger(coordinate))) {
      errors.push({ line, reason: 'invalid-coordinate', raw });
      continue;
    }
    let sources;
    try {
      sources = splitMasks(fields[7]);
    } catch (error) {
      errors.push({ line, reason: error.message, raw });
      continue;
    }
    const desired = normalizeState(fields[8]);
    if (new Set(sources).size !== sources.length) {
      errors.push({ line, reason: 'duplicate-finite-union-source', sources });
    }
    if (sources.length > 1) finiteUnionGroups += 1;
    for (const state of [...sources, desired]) {
      const completeness = stateCompleteness(state);
      if (!completeness.complete) {
        errors.push({
          line,
          reason: 'incomplete-block-state',
          ...completeness,
        });
      }
    }
    const operation = {
      line,
      sources,
      desired,
      box: coordinates,
      cells: [],
    };
    const [rx1, ry1, rz1, rx2, ry2, rz2] = coordinates;
    for (let y = Math.min(ry1, ry2); y <= Math.max(ry1, ry2); y += 1) {
      for (let z = Math.min(rz1, rz2); z <= Math.max(rz1, rz2); z += 1) {
        for (let x = Math.min(rx1, rx2); x <= Math.max(rx1, rx2); x += 1) {
          const point = [x, y, z];
          const pointKey = key(point);
          if (cells.has(pointKey)) duplicateTargetCells += 1;
          const cell = { point, line, sources, desired };
          cells.set(pointKey, cell);
          operation.cells.push(cell);
        }
      }
    }
    repl.push(operation);
  }
  for (const command of commands) {
    const samePoint = key(command.guardPoint) === key(command.mergePoint);
    const target = cells.get(key(command.guardPoint));
    if (!samePoint) {
      errors.push({ line: command.line, reason: 'command-points-differ' });
    } else if (!target) {
      errors.push({ line: command.line, reason: 'command-has-no-repl-target' });
    } else if (target.desired !== command.guardState) {
      errors.push({
        line: command.line,
        reason: 'command-guard-does-not-equal-forward-desired',
      });
    }
  }
  return {
    filename,
    sha256: sha256File(filename),
    repl,
    commands,
    cells,
    finiteUnionGroups,
    duplicateTargetCells,
    errors,
  };
}

function parseTargetUnion(filename) {
  return new Set(parseOperations(filename).cells.keys());
}

function intersections(left, right) {
  const [smaller, larger] = left.size <= right.size
    ? [left, right]
    : [right, left];
  return [...smaller].filter((entry) => larger.has(entry)).sort();
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
  const keys = Object.keys(properties).sort();
  return keys.length === 0
    ? name
    : `${name}[${keys.map((property) => `${property}=${properties[property]}`).join(',')}]`;
}

const DIRECTIONS = [
  { offset: [-1, 0, 0], current: 'west', neighbor: 'east' },
  { offset: [1, 0, 0], current: 'east', neighbor: 'west' },
  { offset: [0, 0, -1], current: 'north', neighbor: 'south' },
  { offset: [0, 0, 1], current: 'south', neighbor: 'north' },
];

function updateFenceProperty(state, property, connected) {
  const parsed = parseState(state);
  if (!parsed.name.endsWith('_fence') || !(property in parsed.properties)) {
    return state;
  }
  parsed.properties[property] = connected ? 'true' : 'false';
  return formatState(parsed.name, parsed.properties);
}

async function loadState(snapshot, states, point) {
  const pointKey = key(point);
  if (!states.has(pointKey)) {
    states.set(pointKey, normalizeState(await snapshot.getBlock(...point)));
  }
  return states.get(pointKey);
}

async function applyFenceAwareCell(snapshot, states, cell) {
  const pointKey = key(cell.point);
  const current = await loadState(snapshot, states, cell.point);
  const sourceMatched = cell.sources.includes(current);
  if (!sourceMatched) {
    return {
      passed: false,
      point: cell.point,
      line: cell.line,
      current,
      allowedSources: cell.sources,
    };
  }
  states.set(pointKey, cell.desired);
  const oldFence = baseName(current).endsWith('_fence');
  const newFence = baseName(cell.desired).endsWith('_fence');
  if (oldFence === newFence) return { passed: true, selectedSource: current };
  for (const direction of DIRECTIONS) {
    const neighborPoint = cell.point.map(
      (coordinate, index) => coordinate + direction.offset[index],
    );
    const neighborKey = key(neighborPoint);
    const neighborState = await loadState(snapshot, states, neighborPoint);
    if (!baseName(neighborState).endsWith('_fence')) continue;
    states.set(
      neighborKey,
      updateFenceProperty(neighborState, direction.neighbor, newFence),
    );
  }
  return { passed: true, selectedSource: current };
}

function packageBounds(parsed) {
  const points = [...parsed.cells.values()].map((cell) => cell.point);
  return [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.min(...points.map((point) => point[2])),
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[2])),
  ];
}

function artifactSummary(filename) {
  return {
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function validateDryRun(filename, parsed) {
  const report = readJson(filename);
  const expectedGroups = parsed.repl.length + parsed.commands.length;
  const expectedExpanded = expectedGroups + parsed.finiteUnionGroups;
  return {
    artifact: artifactSummary(filename),
    status: report.status,
    strictNoop: report.strictNoop,
    sourceGroupCount: report.sourceGroupCount,
    finiteUnionGroupCount: report.finiteUnionGroupCount,
    expandedCommandCount: report.expandedCommandCount,
    worldEditLeftoverCount: report.worldEditLeftoverCount,
    operationSha256: report.operationSha256,
    passed: (
      report.status === 'dry_run'
      && report.dryRun === true
      && report.strictNoop === true
      && report.sourceGroupCount === expectedGroups
      && report.finiteUnionGroupCount === parsed.finiteUnionGroups
      && report.expandedCommandCount === expectedExpanded
      && report.worldEditLeftoverCount === 0
      && report.operationSha256 === parsed.sha256
    ),
  };
}

function validatePreflight(filename, parsed, baselinePath) {
  const report = readJson(filename);
  return {
    artifact: artifactSummary(filename),
    regions: report.regions,
    operationCount: report.operationCount,
    passedOperations: report.passed,
    failedOperations: report.failed,
    passed: (
      report.failed === 0
      && report.operationCount === parsed.repl.length
      && report.passed === parsed.repl.length
      && path.resolve(ROOT, report.regions) === baselinePath
      && path.resolve(ROOT, report.opsPath) === parsed.filename
    ),
  };
}

function validateCameraEvidence({
  manifest,
  captureReport,
  expectedCount,
  baselineSha256,
  rejectedEvidence = [],
}) {
  const cameraManifest = readJson(manifest);
  const report = readJson(captureReport);
  const ids = cameraManifest.cameras.map((camera) => camera.id);
  const outputs = cameraManifest.cameras.map((camera) => camera.output);
  const reportById = new Map(
    report.captures.map((capture) => [capture.id, capture]),
  );
  const captureChecks = cameraManifest.cameras.map((camera) => {
    const capture = reportById.get(camera.id);
    const output = capture?.output ? path.resolve(ROOT, capture.output) : null;
    return {
      id: camera.id,
      primaryFeatureId: camera.primaryFeatureId ?? null,
      output: output ? relative(output) : null,
      reportSha256: capture?.sha256 ?? null,
      actualSha256: output && fs.existsSync(output) ? sha256File(output) : null,
      exists: Boolean(output && fs.existsSync(output)),
      passed: Boolean(
        capture
        && output
        && fs.existsSync(output)
        && capture.sha256 === sha256File(output)
        && path.basename(capture.output) === path.basename(camera.output)
        && capture.primaryFeatureId === camera.primaryFeatureId
      ),
    };
  });
  const afterPaths = cameraManifest.cameras.map((camera) => (
    camera.afterOutput
      ? path.resolve(ROOT, camera.afterOutput)
      : null
  ));
  return {
    manifest: artifactSummary(manifest),
    captureReport: artifactSummary(captureReport),
    rejectedEvidence: rejectedEvidence
      .filter((filename) => fs.existsSync(filename))
      .map(artifactSummary),
    expectedCount,
    cameraCount: cameraManifest.cameras.length,
    uniqueIds: new Set(ids).size,
    uniqueOutputs: new Set(outputs).size,
    exactPrimaryRelations: cameraManifest.cameras.filter(
      (camera) => camera.primaryFeatureId,
    ).length,
    reportStatus: report.status,
    reportPassed: report.passed,
    reportSnapshotSha256: report.snapshot?.sha256 ?? null,
    manifestSnapshotSha256:
      cameraManifest.sourceSnapshot?.sha256
      ?? cameraManifest.baseline?.sha256
      ?? null,
    reportManifestSha256: report.sourceManifestSha256,
    captures: captureChecks,
    matchedAfterPresent: afterPaths.filter(
      (filename) => filename && fs.existsSync(filename),
    ).length,
    matchedAfterRequired: true,
    passed: (
      cameraManifest.cameras.length === expectedCount
      && new Set(ids).size === expectedCount
      && new Set(outputs).size === expectedCount
      && cameraManifest.cameras.every((camera) => camera.primaryFeatureId)
      && report.status === 'PASS'
      && report.passed === true
      && report.captureCount === expectedCount
      && report.snapshot?.sha256 === baselineSha256
      && report.sourceManifestSha256 === sha256File(manifest)
      && captureChecks.every((capture) => capture.passed)
    ),
  };
}

const gates = [];
function gate(id, passed, details = {}) {
  gates.push({ id, passed: Boolean(passed), details });
}

const manifest = readJson(manifestPath);
const baselinePath = path.resolve(ROOT, manifest.baselineRegions);
const baselineDigest = hashSnapshotDirectory(baselinePath);
const snapshot = new DetailedAnvilSnapshot(baselinePath);

gate('manifest-schema-and-identity',
  manifest.schemaVersion === 1
    && manifest.transactionId === 'redevelopment-atomic-release-wave2-2026-07-28'
    && ['candidate-integration', 'prerelease-integration'].includes(manifest.state)
    && manifest.packages.length === 2,
  {
    schemaVersion: manifest.schemaVersion,
    transactionId: manifest.transactionId,
    state: manifest.state,
    packageKeys: manifest.packages.map((entry) => entry.key),
  });
gate('immutable-baseline-hash',
  baselineDigest.sha256 === manifest.baselineSha256
    && baselineDigest.regionFileCount === 26
    && baselineDigest.members.reduce((sum, member) => sum + member.bytes, 0) > 0,
  {
    path: relative(baselinePath),
    declaredSha256: manifest.baselineSha256,
    observedSha256: baselineDigest.sha256,
    regionFileCount: baselineDigest.regionFileCount,
    bytes: baselineDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    algorithm: baselineDigest.algorithm,
  });

const packages = [];
for (const definition of manifest.packages) {
  const forwardPath = path.resolve(ROOT, definition.forward);
  const rollbackPath = path.resolve(ROOT, definition.rollback);
  const forward = parseOperations(forwardPath);
  const rollback = parseOperations(rollbackPath);
  const errors = [...forward.errors, ...rollback.errors];
  const bijectionErrors = [];
  for (const [target, forwardCell] of forward.cells) {
    const rollbackCell = rollback.cells.get(target);
    if (!rollbackCell) {
      bijectionErrors.push({ target, reason: 'missing-rollback-target' });
      continue;
    }
    if (
      rollbackCell.sources.length !== 1
      || rollbackCell.sources[0] !== forwardCell.desired
    ) {
      bijectionErrors.push({
        target,
        reason: 'rollback-source-does-not-equal-forward-desired',
      });
    }
    if (!forwardCell.sources.includes(rollbackCell.desired)) {
      bijectionErrors.push({
        target,
        reason: 'rollback-desired-not-in-forward-sources',
      });
    }
  }
  for (const target of rollback.cells.keys()) {
    if (!forward.cells.has(target)) {
      bijectionErrors.push({ target, reason: 'rollback-only-target' });
    }
  }

  const baselineMismatches = [];
  for (const [target, cell] of forward.cells) {
    const observed = normalizeState(await snapshot.getBlock(...cell.point));
    if (!cell.sources.includes(observed)) {
      baselineMismatches.push({
        target,
        observed,
        allowedSources: cell.sources,
      });
    }
  }

  const reactive = new Set((definition.reactiveCells ?? []).map(key));
  const states = new Map();
  const forwardSimulationFailures = [];
  const selectedFiniteUnionSources = [];
  for (const operation of forward.repl) {
    for (const cell of operation.cells) {
      const result = await applyFenceAwareCell(snapshot, states, cell);
      if (!result.passed) forwardSimulationFailures.push(result);
      if (cell.sources.length > 1 && result.passed) {
        selectedFiniteUnionSources.push({
          point: cell.point,
          line: cell.line,
          selectedSource: result.selectedSource,
          alternativeIndex: cell.sources.indexOf(result.selectedSource),
        });
      }
    }
  }
  const targetKeys = new Set(forward.cells.keys());
  const observedReactive = new Set();
  for (const [target, state] of states) {
    if (targetKeys.has(target)) continue;
    const point = pointFromKey(target);
    const original = normalizeState(await snapshot.getBlock(...point));
    if (state !== original) observedReactive.add(target);
  }
  const reactiveProjection = [...reactive].map((target) => ({
    point: pointFromKey(target),
    baseline: null,
    projected: states.get(target) ?? null,
  }));
  for (const entry of reactiveProjection) {
    entry.baseline = normalizeState(await snapshot.getBlock(...entry.point));
  }

  const rollbackSimulationFailures = [];
  for (const operation of rollback.repl) {
    for (const cell of operation.cells) {
      const result = await applyFenceAwareCell(snapshot, states, cell);
      if (!result.passed) rollbackSimulationFailures.push(result);
    }
  }
  const restorationMismatches = [];
  for (const target of new Set([...targetKeys, ...reactive])) {
    const point = pointFromKey(target);
    const original = normalizeState(await snapshot.getBlock(...point));
    const restored = states.get(target) ?? original;
    if (restored !== original) {
      restorationMismatches.push({ point, original, restored });
    }
  }

  const blockEntities = await snapshot.blockEntitiesInBox(packageBounds(forward));
  const targetedBlockEntities = blockEntities.filter(
    (entity) => targetKeys.has(`${entity.x},${entity.y},${entity.z}`),
  );

  const stem = forwardPath.replace(/\.txt$/, '');
  const firstExisting = (filenames) => filenames.find(
    (filename) => fs.existsSync(filename),
  );
  const preflightPath = firstExisting([
    path.resolve(`${stem}.prerelease-preflight.json`),
    path.resolve(`${stem}.preflight.json`),
  ]);
  const forwardDryRunPath = firstExisting([
    path.resolve(`${stem}.forward-dry-run.json`),
    path.resolve(`${stem}.dry-run.json`),
  ]);
  const rollbackDryRunPath = firstExisting([
    path.resolve(`${stem}.rollback-dry-run.json`),
    path.resolve(`${stem}.rollback.dry-run.json`),
  ]);
  const preflight = validatePreflight(preflightPath, forward, baselinePath);
  const forwardDryRun = validateDryRun(forwardDryRunPath, forward);
  const rollbackDryRun = validateDryRun(rollbackDryRunPath, rollback);

  const packageResult = {
    key: definition.key,
    forward: {
      path: relative(forwardPath),
      sha256: forward.sha256,
      replGroups: forward.repl.length,
      commandGroups: forward.commands.length,
      finiteUnionGroups: forward.finiteUnionGroups,
      uniqueTargetCells: forward.cells.size,
      duplicateTargetCells: forward.duplicateTargetCells,
    },
    rollback: {
      path: relative(rollbackPath),
      sha256: rollback.sha256,
      replGroups: rollback.repl.length,
      commandGroups: rollback.commands.length,
      finiteUnionGroups: rollback.finiteUnionGroups,
      uniqueTargetCells: rollback.cells.size,
      duplicateTargetCells: rollback.duplicateTargetCells,
    },
    reactiveCells: [...reactive].sort().map(pointFromKey),
    errors,
    bijectionErrors,
    baselineMismatches,
    forwardSimulationFailures,
    selectedFiniteUnionSources,
    observedReactiveCells: [...observedReactive].sort().map(pointFromKey),
    reactiveProjection,
    rollbackSimulationFailures,
    restorationMismatches,
    blockEntitiesInEnvelope: blockEntities.length,
    targetedBlockEntities,
    preflight,
    forwardDryRun,
    rollbackDryRun,
    targetKeys,
    interactionKeys: new Set([...targetKeys, ...reactive]),
    passed: (
      errors.length === 0
      && bijectionErrors.length === 0
      && baselineMismatches.length === 0
      && forward.duplicateTargetCells === 0
      && rollback.duplicateTargetCells === 0
      && forwardSimulationFailures.length === 0
      && rollbackSimulationFailures.length === 0
      && restorationMismatches.length === 0
      && intersections(observedReactive, reactive).length === reactive.size
      && observedReactive.size === reactive.size
      && targetedBlockEntities.length === 0
      && preflight.passed
      && forwardDryRun.passed
      && rollbackDryRun.passed
    ),
  };
  packages.push(packageResult);
}

for (const packageResult of packages) {
  gate(`package-${packageResult.key}-exact-state-and-reversibility`,
    packageResult.passed,
    {
      forwardGroups:
        packageResult.forward.replGroups + packageResult.forward.commandGroups,
      forwardCells: packageResult.forward.uniqueTargetCells,
      rollbackCells: packageResult.rollback.uniqueTargetCells,
      finiteUnionGroups: packageResult.forward.finiteUnionGroups,
      reactiveCells: packageResult.reactiveCells.length,
      selectedFiniteUnionSources: packageResult.selectedFiniteUnionSources,
      errors: packageResult.errors.length,
      bijectionErrors: packageResult.bijectionErrors.length,
      baselineMismatches: packageResult.baselineMismatches.length,
      forwardSimulationFailures: packageResult.forwardSimulationFailures.length,
      rollbackSimulationFailures: packageResult.rollbackSimulationFailures.length,
      restorationMismatches: packageResult.restorationMismatches.length,
      targetedBlockEntities: packageResult.targetedBlockEntities.length,
    });
}

const crossPackage = [];
for (let left = 0; left < packages.length; left += 1) {
  for (let right = left + 1; right < packages.length; right += 1) {
    const shared = intersections(
      packages[left].interactionKeys,
      packages[right].interactionKeys,
    );
    if (shared.length > 0) {
      crossPackage.push({
        left: packages[left].key,
        right: packages[right].key,
        cells: shared.map(pointFromKey),
      });
    }
  }
}
gate('wave2-cross-package-intersections-zero',
  crossPackage.length === 0,
  { intersections: crossPackage });

const r1Manifest = readJson(r1ManifestPath);
const r1Targets = new Set();
const r1Packages = [];
for (const definition of r1Manifest.packages) {
  const filename = path.resolve(ROOT, definition.forward);
  const targets = parseTargetUnion(filename);
  for (const target of targets) r1Targets.add(target);
  r1Packages.push({
    key: definition.key,
    path: relative(filename),
    sha256: sha256File(filename),
    targetCells: targets.size,
  });
}
const r1Intersections = packages.map((packageResult) => ({
  package: packageResult.key,
  cells: intersections(packageResult.interactionKeys, r1Targets).map(pointFromKey),
}));
gate('wave2-to-accepted-r1-intersections-zero',
  r1Intersections.every((entry) => entry.cells.length === 0),
  {
    r1Packages,
    r1TargetUnion: r1Targets.size,
    intersections: r1Intersections,
  });

const databaseSha256Before = sha256File(databasePath);
const database = new Database(databasePath, {
  readonly: true,
  fileMustExist: true,
});
const protectedFeatures = database.prepare(
  `SELECT id, external_id, name, kind, min_x, max_x, min_z, max_z
   FROM world_features
   WHERE kind IN ('building', 'room', 'driveway', 'landscape')
     AND status != 'removed'`,
).all();
const protectedIntersections = [];
for (const packageResult of packages) {
  for (const target of packageResult.interactionKeys) {
    const [x, y, z] = pointFromKey(target);
    for (const feature of protectedFeatures) {
      if (
        x < feature.min_x
        || x > feature.max_x
        || z < feature.min_z
        || z > feature.max_z
      ) continue;
      protectedIntersections.push({
        package: packageResult.key,
        point: [x, y, z],
        feature: {
          id: feature.id,
          externalId: feature.external_id,
          name: feature.name,
          kind: feature.kind,
        },
      });
    }
  }
}
const mainstreetPackage = manifest.packages.find(
  (entry) => entry.key === 'mainstreet-r08',
);
const ravenrockPackage = manifest.packages.find(
  (entry) => entry.key === 'ravenrock-t2b',
);
const r08ReportPath = path.resolve(
  ROOT,
  mainstreetPackage.forward.replace(/\.txt$/, '.report.json'),
);
const r08Report = readJson(r08ReportPath);
const ravenReportPath = path.resolve(
  ROOT,
  ravenrockPackage.forward.replace(/\.txt$/, '.report.json'),
);
const ravenReport = readJson(ravenReportPath);
const ravenDatabasePath = path.resolve(
  ROOT,
  ravenReport.databaseFeatures.proposalPath,
);
const ravenDatabase = readJson(ravenDatabasePath);
const proposedIds = [
  ...r08Report.databaseFeatures.features.map((feature) => feature.external_id),
  ...ravenDatabase.features.map((feature) => feature.externalId),
];
const existingProposedIds = database.prepare(
  `SELECT project_id, external_id, name
   FROM world_features
   WHERE external_id IN (${proposedIds.map(() => '?').join(',')})`,
).all(...proposedIds);
database.close();
const databaseSha256After = sha256File(databasePath);
gate('protected-database-intersections-zero-and-readonly',
  protectedIntersections.length === 0
    && databaseSha256Before === databaseSha256After,
  {
    database: relative(databasePath),
    sha256Before: databaseSha256Before,
    sha256After: databaseSha256After,
    protectedFeatureRows: protectedFeatures.length,
    intersections: protectedIntersections,
  });
const databaseProposalState = existingProposedIds.length === 0
  ? 'not-imported'
  : (
    existingProposedIds.length === proposedIds.length
      ? 'fully-imported'
      : 'partial-or-conflicting'
  );
gate('database-proposals-unique-and-no-partial-import',
  proposedIds.length === 51
    && new Set(proposedIds).size === proposedIds.length
    && [0, proposedIds.length].includes(existingProposedIds.length),
  {
    proposedFeatures: proposedIds.length,
    uniqueExternalIds: new Set(proposedIds).size,
    existingIdConflicts: existingProposedIds,
    observedImportState: databaseProposalState,
    auditMutationPerformed: false,
  });

gate('package-reports-remain-offline-only',
  r08Report.releaseDecision.offlineEngineering === 'GO'
    && r08Report.releaseDecision.liveExecution
      === 'NOT_AUTHORIZED_OFFLINE_PACKAGE_ONLY'
    && ravenReport.exclusions.liveWorldMutation === false
    && ravenReport.exclusions.databaseWrites === false
    && ravenReport.status === 'generated-awaiting-independent-qa-and-live-gates',
  {
    mainstreet: r08Report.releaseDecision,
    ravenrock: {
      status: ravenReport.status,
      liveWorldMutation: ravenReport.exclusions.liveWorldMutation,
      databaseWrites: ravenReport.exclusions.databaseWrites,
      mandatoryLiveGates: ravenReport.mandatoryLiveGates,
    },
  });

function findCaptureReportForManifest(cameraManifestPath) {
  const manifestSha256 = sha256File(cameraManifestPath);
  const parent = path.dirname(cameraManifestPath);
  const candidates = [
    path.join(parent, 'before-capture-report.json'),
    path.join(parent, 'before', 'capture-report.json'),
    path.join(parent, 'before-prerelease', 'capture-report.json'),
  ];
  return candidates.find((filename) => (
    fs.existsSync(filename)
    && readJson(filename).sourceManifestSha256 === manifestSha256
  ));
}

const mainstreetCameraManifestPath = path.resolve(ROOT, r08Report.media.manifest);
const ravenCameraManifestPath = path.resolve(ROOT, ravenReport.cameras.manifest);
const mainstreetCamera = validateCameraEvidence({
  manifest: mainstreetCameraManifestPath,
  captureReport: findCaptureReportForManifest(mainstreetCameraManifestPath),
  expectedCount: 8,
  baselineSha256: manifest.baselineSha256,
});
const ravenCamera = validateCameraEvidence({
  manifest: ravenCameraManifestPath,
  captureReport: findCaptureReportForManifest(ravenCameraManifestPath),
  expectedCount: 6,
  baselineSha256: manifest.baselineSha256,
});
gate('camera-contracts-and-before-evidence',
  mainstreetCamera.passed && ravenCamera.passed,
  {
    mainstreet: mainstreetCamera,
    ravenrock: ravenCamera,
  });

const controllerPath = path.resolve(
  ROOT,
  'scripts/run_redevelopment_atomic_release.py',
);
const controllerProbe = spawnSync(
  'python3',
  [
    '-c',
    [
      'import importlib.util,json',
      `p=${JSON.stringify(controllerPath)}`,
      "s=importlib.util.spec_from_file_location('wave2_controller',p)",
      'm=importlib.util.module_from_spec(s)',
      's.loader.exec_module(m)',
      `print(json.dumps(m.load_release_plan(${JSON.stringify(manifestPath)})))`,
    ].join(';'),
  ],
  { cwd: ROOT, encoding: 'utf8' },
);
let loadedPlan = null;
try {
  loadedPlan = JSON.parse(controllerProbe.stdout);
} catch {
  loadedPlan = null;
}
const controllerSource = fs.readFileSync(controllerPath, 'utf8');
const controllerCompatible = (
  controllerProbe.status === 0
  && loadedPlan?.transactionId === manifest.transactionId
  && loadedPlan?.manifestSha256 === sha256File(manifestPath)
  && JSON.stringify(loadedPlan?.packages.map((entry) => entry.key))
    === JSON.stringify(manifest.packages.map((entry) => entry.key))
  && controllerSource.includes("command.append('--strict-noop')")
  && controllerSource.includes('package-entity-gate-started')
  && controllerSource.includes('list(reversed(completed))')
);
gate('release-controller-manifest-compatibility',
  controllerCompatible,
  {
    controller: relative(controllerPath),
    controllerSha256: sha256File(controllerPath),
    probeExitCode: controllerProbe.status,
    loadedTransactionId: loadedPlan?.transactionId ?? null,
    loadedManifestSha256: loadedPlan?.manifestSha256 ?? null,
    loadedPackageKeys: loadedPlan?.packages?.map((entry) => entry.key) ?? [],
    strictNoopForward: controllerSource.includes("command.append('--strict-noop')"),
    perPackageEntityGate: controllerSource.includes('package-entity-gate-started'),
    reverseCompensatingRollback:
      controllerSource.includes('list(reversed(completed))'),
  });

const prereleasePreflights = manifest.packages.map((definition) => {
  const filename = path.resolve(
    ROOT,
    definition.forward.replace(/\.txt$/, '.prerelease-preflight.json'),
  );
  return { path: relative(filename), exists: fs.existsSync(filename) };
});
const routeContracts = {
  ravenrock: {
    id: 'RR-T2B-W2-BIDIRECTIONAL',
    from: [-145, 3, 187],
    to: [-136, 2, 182],
    movementPolicy: {
      sprint: false,
      jump: false,
      crouch: false,
      dig: false,
      tower: false,
    },
    requiredAfterLiveExecution: true,
  },
  mainstreet: {
    id: 'MSA-R08-WEST-EAST-BIDIRECTIONAL',
    from: r08Report.geometry.bidirectionalEndpoints.west,
    to: r08Report.geometry.bidirectionalEndpoints.east,
    directions: r08Report.geometry.routeDirections,
    requiredAfterLiveExecution: true,
  },
};
const liveGateReadiness = {
  liveEntityGatePresent: fs.existsSync(path.resolve(
    ROOT,
    'data/world-review/redevelopment-wave2-live-entity-gate-2026-07-28.json',
  )),
  sameMomentSnapshotPresent: true,
  prereleasePreflights,
  routeContracts,
  routeResultsPresent: fs.existsSync(path.resolve(
    ROOT,
    'data/world-review/redevelopment-wave2-route-qa-2026-07-28.json',
  )),
  afterMediaPresent: (
    mainstreetCamera.matchedAfterPresent + ravenCamera.matchedAfterPresent
  ) > 0,
  databaseImportPresent: databaseProposalState === 'fully-imported',
};
gate('prerelease-live-gate-inputs-remain-consistent',
  prereleasePreflights.every((entry) => entry.exists)
    && mainstreetCamera.passed
    && ravenCamera.passed,
  liveGateReadiness);

const failures = gates.filter((entry) => !entry.passed);
const passed = failures.length === 0 && packages.every((entry) => entry.passed);
const report = {
  schemaVersion: 1,
  id: 'redevelopment-wave2-integration-independent-audit',
  generatedAtUtc: new Date().toISOString(),
  status: passed ? 'PASS_OFFLINE_GO_LIVE_GATES_PENDING' : 'FAIL',
  passed,
  offlineOnly: true,
  liveWorldMutated: false,
  databaseMutated: false,
  decision: {
    offlineIntegration: passed ? 'GO' : 'NO_GO',
    liveExecution: 'NO_GO_LIVE_GATES_PENDING',
    rationale: passed
      ? (
        'The complete two-package candidate is exact-state guarded, reversible, '
        + 'non-intersecting, camera-bound, and controller-compatible. Same-moment '
        + 'snapshot, live entity, transaction, route, after-media, and database '
        + 'import gates remain mandatory.'
      )
      : `Failed gates: ${failures.map((entry) => entry.id).join(', ')}`,
  },
  manifest: artifactSummary(manifestPath),
  baseline: {
    path: relative(baselinePath),
    sha256: baselineDigest.sha256,
    regionFileCount: baselineDigest.regionFileCount,
    bytes: baselineDigest.members.reduce((sum, member) => sum + member.bytes, 0),
    algorithm: baselineDigest.algorithm,
  },
  totals: {
    packages: packages.length,
    forwardSourceGroups: packages.reduce(
      (sum, entry) => sum + entry.forward.replGroups + entry.forward.commandGroups,
      0,
    ),
    forwardReplGroups: packages.reduce(
      (sum, entry) => sum + entry.forward.replGroups,
      0,
    ),
    forwardCommandGroups: packages.reduce(
      (sum, entry) => sum + entry.forward.commandGroups,
      0,
    ),
    finiteUnionGroups: packages.reduce(
      (sum, entry) => sum + entry.forward.finiteUnionGroups,
      0,
    ),
    explicitTargetCells: packages.reduce(
      (sum, entry) => sum + entry.forward.uniqueTargetCells,
      0,
    ),
    reactiveTargetCells: packages.reduce(
      (sum, entry) => sum + entry.reactiveCells.length,
      0,
    ),
    completeProjectedStateCells: packages.reduce(
      (sum, entry) => (
        sum + entry.forward.uniqueTargetCells + entry.reactiveCells.length
      ),
      0,
    ),
    proposedDatabaseFeatures: proposedIds.length,
    beforeCameras: mainstreetCamera.cameraCount + ravenCamera.cameraCount,
    crossPackageIntersections: crossPackage.reduce(
      (sum, entry) => sum + entry.cells.length,
      0,
    ),
    r1Intersections: r1Intersections.reduce(
      (sum, entry) => sum + entry.cells.length,
      0,
    ),
    protectedFeatureIntersections: protectedIntersections.length,
  },
  packages: packages.map(({
    targetKeys,
    interactionKeys,
    ...entry
  }) => entry),
  intersections: {
    crossPackage,
    acceptedR1: r1Intersections,
    protectedFeatures: protectedIntersections,
  },
  cameras: {
    mainstreet: mainstreetCamera,
    ravenrock: ravenCamera,
  },
  controller: {
    compatible: controllerCompatible,
    liveGateReadiness,
  },
  gates,
  failures,
  remainingLiveGates: [
    'pause builders and clear players/free entities',
    'save-all and freeze a same-moment immutable snapshot',
    'require same-moment hash/guard/fluid-neighbor preflights',
    'capture or confirm all 14 exact before views against that baseline',
    'run the fresh all-package live entity gate',
    'execute the two packages through the fixed atomic controller order',
    'freeze the immutable post snapshot and validate 887 explicit plus 2 reactive states',
    'require 887/887 rollback guards against the post snapshot',
    'normal-walk Raven Rock and MainStreet routes in both directions',
    'capture all 14 matched after views and verify hashes/cameras',
    'import 51 database features only after physical and route PASS',
    'run scripts/qa_wave2_post_release.mjs and require PASS',
  ],
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
