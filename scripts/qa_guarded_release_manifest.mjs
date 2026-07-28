#!/usr/bin/env node
/**
 * Independently validate a schema-1 guarded release manifest.
 *
 * This is an offline structural gate. It expands every REPL target, validates
 * complete Minecraft block states, proves forward/rollback bijection, checks
 * guarded block-data commands, and rejects target overlap between packages.
 * Snapshot preflight, live entities, execution, and post-state QA remain
 * separate gates.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const minecraftData = require('minecraft-data')('1.21.11');
const args = process.argv.slice(2);

function value(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function required(flag) {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, result);
}

const manifestPath = required('--manifest');
const outputPath = path.resolve(
  ROOT,
  value(
    '--out',
    'data/world-review/guarded-release-manifest-qa.json',
  ),
);

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function normalizeState(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return state;
  if (!state.endsWith(']')) throw new Error(`malformed block state: ${state}`);
  const name = state.slice(0, bracket);
  const properties = state.slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function splitMasks(mask) {
  const output = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const character = mask[index];
    if (character === '[') depth += 1;
    else if (character === ']') depth -= 1;
    else if (character === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
    if (depth < 0) throw new Error(`malformed finite-state mask: ${mask}`);
  }
  if (depth !== 0) throw new Error(`malformed finite-state mask: ${mask}`);
  output.push(mask.slice(start));
  return output.filter(Boolean).map(normalizeState);
}

function stateCompleteness(state) {
  const normalized = normalizeState(state);
  const bracket = normalized.indexOf('[');
  const blockName = (
    bracket < 0 ? normalized : normalized.slice(0, bracket)
  ).replace(/^minecraft:/, '');
  const definition = minecraftData.blocksByName[blockName];
  if (!definition) {
    return {
      state: normalized,
      complete: false,
      reason: 'unknown-block',
    };
  }
  const requiredProperties = (definition.states ?? [])
    .map(({ name }) => name)
    .sort();
  const providedProperties = bracket < 0
    ? []
    : normalized.slice(bracket + 1, -1)
      .split(',')
      .filter(Boolean)
      .map((property) => property.split('=', 1)[0])
      .sort();
  return {
    state: normalized,
    complete: (
      requiredProperties.length === providedProperties.length
      && requiredProperties.every(
        (property, index) => property === providedProperties[index],
      )
    ),
    reason: requiredProperties.length === providedProperties.length
      ? 'property-name-mismatch'
      : 'incomplete-properties',
    requiredProperties,
    providedProperties,
  };
}

function parseOperations(filename) {
  const cells = new Map();
  const errors = [];
  const guardedCommands = [];
  let replGroups = 0;
  let finiteUnionGroups = 0;
  let commandGroups = 0;
  let duplicateTargetCells = 0;
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);

  lines.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const fields = trimmed.split(/\s+/);
    const line = index + 1;
    if (fields[0] === 'CMD') {
      commandGroups += 1;
      const match = trimmed.match(
        /^CMD execute ((?:if block -?\d+ -?\d+ -?\d+ minecraft:\S+ )+)run data merge block (-?\d+) (-?\d+) (-?\d+) \{.*\}$/,
      );
      if (!match) {
        errors.push({
          line,
          reason: 'command-is-not-exact-state-guarded-data-merge',
          operation: trimmed,
        });
        return;
      }
      const guards = [...match[1].matchAll(
        /if block (-?\d+) (-?\d+) (-?\d+) (minecraft:\S+) /g,
      )].map((guard) => ({
        point: guard.slice(1, 4).map(Number),
        state: normalizeState(guard[4]),
      }));
      if (guards.length === 0) {
        errors.push({
          line,
          reason: 'command-has-no-exact-state-guard',
          operation: trimmed,
        });
        return;
      }
      for (const guard of guards) {
        const completeness = stateCompleteness(guard.state);
        if (!completeness.complete) {
          const { reason: completenessReason, ...details } = completeness;
          errors.push({
            line,
            reason: 'incomplete-command-guard-state',
            completenessReason,
            ...details,
          });
        }
      }
      guardedCommands.push({
        line,
        guards,
        mergePoint: match.slice(2, 5).map(Number),
      });
      return;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      errors.push({
        line,
        reason: 'unsupported-or-malformed-operation',
        operation: trimmed,
      });
      return;
    }
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((coordinate) => !Number.isSafeInteger(coordinate))) {
      errors.push({ line, reason: 'invalid-coordinate', operation: trimmed });
      return;
    }
    let sources;
    let desired;
    try {
      sources = splitMasks(fields[7]);
      desired = normalizeState(fields[8]);
    } catch (error) {
      errors.push({ line, reason: error.message, operation: trimmed });
      return;
    }
    if (sources.length === 0) {
      errors.push({ line, reason: 'empty-source-mask', operation: trimmed });
      return;
    }
    if (sources.length > 1) finiteUnionGroups += 1;
    const duplicateSources = sources.filter(
      (source, sourceIndex) => sources.indexOf(source) !== sourceIndex,
    );
    if (duplicateSources.length > 0) {
      errors.push({
        line,
        reason: 'duplicate-finite-union-source',
        states: [...new Set(duplicateSources)],
      });
    }
    for (const state of [...sources, desired]) {
      const completeness = stateCompleteness(state);
      if (!completeness.complete) {
        const { reason: completenessReason, ...details } = completeness;
        errors.push({
          line,
          reason: 'incomplete-block-state',
          completenessReason,
          ...details,
        });
      }
    }
    replGroups += 1;
    const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = coordinates;
    const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
    const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
    const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          const key = `${x},${y},${z}`;
          if (cells.has(key)) {
            duplicateTargetCells += 1;
            cells.get(key).transitions.push({ sources, desired, line });
          } else {
            cells.set(key, {
              point: [x, y, z],
              transitions: [{ sources, desired, line }],
            });
          }
        }
      }
    }
  });

  for (const command of guardedCommands) {
    const destinationGuard = command.guards.at(-1);
    const guardKey = destinationGuard.point.join(',');
    const target = cells.get(guardKey);
    if (
      destinationGuard.point.some(
        (coordinate, index) => coordinate !== command.mergePoint[index],
      )
    ) {
      errors.push({
        line: command.line,
        reason: 'command-guard-and-merge-point-differ',
      });
    } else if (!target) {
      command.externalMerge = true;
    } else {
      const priorTransitions = target.transitions.filter(
        (transition) => transition.line < command.line,
      );
      const expectedStatesAtCommand = priorTransitions.length > 0
        ? [priorTransitions.at(-1).desired]
        : target.transitions[0].sources;
      if (!expectedStatesAtCommand.includes(destinationGuard.state)) {
        errors.push({
          line: command.line,
          reason: 'command-guard-does-not-equal-state-at-command',
          guardState: destinationGuard.state,
          expectedStatesAtCommand,
        });
      }
    }
  }

  return {
    filename,
    sha256: sha256(filename),
    replGroups,
    commandGroups,
    finiteUnionGroups,
    uniqueTargetCells: cells.size,
    duplicateTargetCells,
    guardedCommands,
    commandInteractionKeys: new Set(guardedCommands.flatMap((command) => [
      command.mergePoint.join(','),
      ...command.guards.map((guard) => guard.point.join(',')),
    ])),
    cells,
    errors,
  };
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestErrors = [];
if (manifest.schemaVersion !== 1) manifestErrors.push('schemaVersion-must-equal-1');
if (
  typeof manifest.transactionId !== 'string'
  || manifest.transactionId.trim() === ''
) {
  manifestErrors.push('transactionId-required');
}
if (!Array.isArray(manifest.packages) || manifest.packages.length === 0) {
  manifestErrors.push('packages-required');
}

const packages = [];
const packageKeys = new Set();
const operationPaths = new Set();
for (const [index, definition] of (manifest.packages ?? []).entries()) {
  const key = definition?.key;
  const forwardPath = path.resolve(ROOT, definition?.forward ?? '');
  const rollbackPath = path.resolve(ROOT, definition?.rollback ?? '');
  const errors = [];
  if (typeof key !== 'string' || key.trim() === '') errors.push('key-required');
  if (packageKeys.has(key)) errors.push('duplicate-package-key');
  packageKeys.add(key);
  for (const filename of [forwardPath, rollbackPath]) {
    if (operationPaths.has(filename)) errors.push('operation-path-reused');
    operationPaths.add(filename);
    if (!fs.existsSync(filename)) errors.push(`missing:${relative(filename)}`);
  }
  if (errors.length > 0) {
    packages.push({ index, key, errors });
    continue;
  }

  const forward = parseOperations(forwardPath);
  const rollback = parseOperations(rollbackPath);
  const reactiveCells = [];
  const reactiveKeys = new Set();
  for (const [reactiveIndex, point] of (
    definition.reactiveCells ?? []
  ).entries()) {
    if (
      !Array.isArray(point)
      || point.length !== 3
      || point.some((coordinate) => !Number.isSafeInteger(coordinate))
    ) {
      errors.push(`invalid-reactive-cell:${reactiveIndex}`);
      continue;
    }
    const keyValue = point.join(',');
    if (reactiveKeys.has(keyValue)) {
      errors.push(`duplicate-reactive-cell:${keyValue}`);
      continue;
    }
    reactiveKeys.add(keyValue);
    reactiveCells.push(point);
  }
  const cellErrors = [];
  const forwardKeys = new Set(forward.cells.keys());
  const rollbackKeys = new Set(rollback.cells.keys());
  for (const target of forwardKeys) {
    const forwardCell = forward.cells.get(target);
    const rollbackCell = rollback.cells.get(target);
    if (!rollbackCell) {
      cellErrors.push({ target, reason: 'missing-rollback-target' });
      continue;
    }
    for (
      let transitionIndex = 1;
      transitionIndex < forwardCell.transitions.length;
      transitionIndex += 1
    ) {
      const prior = forwardCell.transitions[transitionIndex - 1];
      const current = forwardCell.transitions[transitionIndex];
      if (!current.sources.includes(prior.desired)) {
        cellErrors.push({
          target,
          reason: 'forward-staged-transition-is-not-contiguous',
          priorLine: prior.line,
          priorDesired: prior.desired,
          line: current.line,
          sources: current.sources,
        });
      }
    }
    if (
      rollbackCell.transitions.length
      !== forwardCell.transitions.length
    ) {
      cellErrors.push({
        target,
        reason: 'rollback-transition-count-mismatch',
        forwardTransitionCount: forwardCell.transitions.length,
        rollbackTransitionCount: rollbackCell.transitions.length,
      });
      continue;
    }
    for (
      let rollbackIndex = 0;
      rollbackIndex < rollbackCell.transitions.length;
      rollbackIndex += 1
    ) {
      const rollbackTransition = rollbackCell.transitions[rollbackIndex];
      const forwardTransition = forwardCell.transitions[
        forwardCell.transitions.length - rollbackIndex - 1
      ];
      if (
        rollbackTransition.sources.length !== 1
        || rollbackTransition.sources[0] !== forwardTransition.desired
      ) {
        cellErrors.push({
          target,
          reason: 'rollback-source-does-not-invert-forward-desired',
          forwardLine: forwardTransition.line,
          forwardDesired: forwardTransition.desired,
          rollbackLine: rollbackTransition.line,
          rollbackSources: rollbackTransition.sources,
        });
      }
      if (!forwardTransition.sources.includes(
        rollbackTransition.desired,
      )) {
        cellErrors.push({
          target,
          reason: 'rollback-desired-does-not-invert-forward-source',
          forwardLine: forwardTransition.line,
          forwardSources: forwardTransition.sources,
          rollbackLine: rollbackTransition.line,
          rollbackDesired: rollbackTransition.desired,
        });
      }
    }
  }
  for (const target of rollbackKeys) {
    if (!forwardKeys.has(target)) {
      cellErrors.push({ target, reason: 'rollback-only-target' });
    }
  }
  const reactiveTargetOverlap = [...reactiveKeys]
    .filter((target) => forwardKeys.has(target));
  if (reactiveTargetOverlap.length > 0) {
    cellErrors.push(...reactiveTargetOverlap.map((target) => ({
      target,
      reason: 'reactive-cell-is-already-an-explicit-target',
    })));
  }
  const interactionKeys = new Set([
    ...forwardKeys,
    ...reactiveKeys,
    ...forward.commandInteractionKeys,
    ...rollback.commandInteractionKeys,
  ]);

  packages.push({
    index,
    key,
    forward: {
      path: relative(forwardPath),
      sha256: forward.sha256,
      replGroups: forward.replGroups,
      commandGroups: forward.commandGroups,
      finiteUnionGroups: forward.finiteUnionGroups,
      uniqueTargetCells: forward.uniqueTargetCells,
      duplicateTargetCells: forward.duplicateTargetCells,
      guardedCommandCount: forward.guardedCommands.length,
      externalGuardedCommandCount: forward.guardedCommands.filter(
        (command) => command.externalMerge,
      ).length,
      errors: forward.errors,
    },
    rollback: {
      path: relative(rollbackPath),
      sha256: rollback.sha256,
      replGroups: rollback.replGroups,
      commandGroups: rollback.commandGroups,
      finiteUnionGroups: rollback.finiteUnionGroups,
      uniqueTargetCells: rollback.uniqueTargetCells,
      duplicateTargetCells: rollback.duplicateTargetCells,
      guardedCommandCount: rollback.guardedCommands.length,
      externalGuardedCommandCount: rollback.guardedCommands.filter(
        (command) => command.externalMerge,
      ).length,
      errors: rollback.errors,
    },
    reactiveCells,
    reactiveCellCount: reactiveCells.length,
    definitionErrors: errors,
    cellErrors,
    targetKeys: forwardKeys,
    interactionKeys,
    passed: (
      errors.length === 0
      && forward.errors.length === 0
      && rollback.errors.length === 0
      && cellErrors.length === 0
    ),
  });
}

const intersections = [];
for (let leftIndex = 0; leftIndex < packages.length; leftIndex += 1) {
  const left = packages[leftIndex];
  if (!left.interactionKeys) continue;
  for (
    let rightIndex = leftIndex + 1;
    rightIndex < packages.length;
    rightIndex += 1
  ) {
    const right = packages[rightIndex];
    if (!right.interactionKeys) continue;
    const [smaller, larger] = (
      left.interactionKeys.size <= right.interactionKeys.size
    )
      ? [left.interactionKeys, right.interactionKeys]
      : [right.interactionKeys, left.interactionKeys];
    const shared = [];
    for (const target of smaller) {
      if (larger.has(target)) shared.push(target);
    }
    if (shared.length > 0) {
      intersections.push({
        left: left.key,
        right: right.key,
        count: shared.length,
        sample: shared.slice(0, 100),
      });
    }
  }
}

const passed = (
  manifestErrors.length === 0
  && packages.length > 0
  && packages.every((entry) => entry.passed === true)
  && intersections.length === 0
);
const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: passed ? 'PASS' : 'FAIL',
  passed,
  offline: true,
  manifest: {
    path: relative(manifestPath),
    sha256: sha256(manifestPath),
    transactionId: manifest.transactionId ?? null,
    errors: manifestErrors,
  },
  packages: packages.map(({
    targetKeys,
    interactionKeys,
    ...entry
  }) => entry),
  intersections,
  totals: {
    packages: packages.length,
    passedPackages: packages.filter((entry) => entry.passed).length,
    uniqueTargetCells: packages.reduce(
      (sum, entry) => sum + (entry.forward?.uniqueTargetCells ?? 0),
      0,
    ),
    declaredReactiveCells: packages.reduce(
      (sum, entry) => sum + (entry.reactiveCellCount ?? 0),
      0,
    ),
    crossPackageIntersectionCells: intersections.reduce(
      (sum, entry) => sum + entry.count,
      0,
    ),
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: relative(outputPath),
  totals: report.totals,
}, null, 2));
process.exitCode = passed ? 0 : 1;
