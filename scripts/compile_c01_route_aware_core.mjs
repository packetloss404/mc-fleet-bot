#!/usr/bin/env node
/**
 * Compile the held C01 core into a route-aware stair redesign.
 *
 * Route supports become east-facing polished-blackstone stairs. Route feet and
 * head cells remain air. This is intentionally derived from the accepted
 * pre-build path cells and emits a new exact inverse; it does not mutate the
 * full-model compiler or silently waive the route contract.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EAST_STAIRS = 'minecraft:polished_blackstone_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]';
const AIR = 'minecraft:air';

function arg(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function required(args, flag) {
  const result = arg(args, flag);
  if (!result) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, result);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parse(line) {
  const fields = line.trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) return null;
  return {
    fields,
    key: `${fields[1]},${fields[2]},${fields[3]}`,
    expected: fields[7],
    replacement: fields[8],
  };
}

function lineFor(op, replacement, expected = op.expected) {
  const fields = [...op.fields];
  fields[7] = expected;
  fields[8] = replacement;
  return fields.join(' ');
}

const args = process.argv.slice(2);
const forwardInput = required(args, '--forward-input');
const rollbackInput = required(args, '--rollback-input');
const routeQa = required(args, '--route-qa');
const out = required(args, '--out');
const rollbackOut = required(args, '--rollback-out');
const reportOut = required(args, '--report');
const qa = JSON.parse(fs.readFileSync(routeQa, 'utf8'));
const roleByKey = new Map();
for (const route of qa.tests.filter((test) => /^TE-ROUTE-C01-(PUBLIC|OWNER)-VERTICAL$/.test(test.id))) {
  for (const direction of route.directions) {
    for (const [x, y, z] of direction.path ?? []) {
      for (const [deltaY, role] of [[-1, 'support'], [0, 'feet'], [1, 'head']]) {
        const key = `${x},${y + deltaY},${z}`;
        const previous = roleByKey.get(key);
        if (previous && previous !== role) {
          throw new Error(`route interface role conflict at ${key}: ${previous}/${role}`);
        }
        roleByKey.set(key, role);
      }
    }
  }
}
if (roleByKey.size === 0) throw new Error('route QA has no C01 vertical path interface');

const forward = fs.readFileSync(forwardInput, 'utf8').split(/\r?\n/).map(parse).filter(Boolean);
const rollback = fs.readFileSync(rollbackInput, 'utf8').split(/\r?\n/).map(parse).filter(Boolean);
const finalForward = [];
const selected = new Map();
const dispositionCounts = {};
for (const operation of forward) {
  const role = roleByKey.get(operation.key);
  if (!role) throw new Error(`held operation is outside route interface: ${operation.key}`);
  const desired = role === 'support' ? EAST_STAIRS : AIR;
  if (desired === operation.expected) {
    dispositionCounts[`${role}:noop`] = (dispositionCounts[`${role}:noop`] ?? 0) + 1;
    continue;
  }
  finalForward.push(lineFor(operation, desired));
  selected.set(operation.key, { operation, desired, role });
  dispositionCounts[`${role}:changed`] = (dispositionCounts[`${role}:changed`] ?? 0) + 1;
}
const rollbackByKey = new Map(rollback.map((operation) => [operation.key, operation]));
const finalRollback = [];
for (const [key, entry] of selected) {
  const inverse = rollbackByKey.get(key);
  if (!inverse) throw new Error(`missing inverse for ${key}`);
  finalRollback.push(lineFor(inverse, inverse.replacement, entry.desired));
}
const sourceSnapshot = fs.readFileSync(forwardInput, 'utf8').split(/\r?\n/)
  .find((line) => line.startsWith('# source_snapshot_sha256:')) ?? '# source_snapshot_sha256: unknown';
const forwardText = [
  '# GENERATED — C01 route-aware stair-core redesign',
  '# route supports become east-facing stairs; feet/head cells remain air',
  sourceSnapshot,
  `# changed_cells: ${finalForward.length}`,
  '',
  ...finalForward,
  '',
].join('\n');
const rollbackText = [
  '# GENERATED — exact inverse of C01 route-aware stair-core redesign',
  `# forward_sha256: ${sha256(forwardText)}`,
  sourceSnapshot,
  `# changed_cells: ${finalRollback.length}`,
  '',
  ...finalRollback,
  '',
].join('\n');
for (const file of [out, rollbackOut, reportOut]) fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(out, forwardText);
fs.writeFileSync(rollbackOut, rollbackText);
const report = {
  status: 'C01_ROUTE_AWARE_STAIR_CORE_READY_FOR_GUARDED_PREFLIGHT',
  routeQa,
  routeQaSha256: sha256(fs.readFileSync(routeQa)),
  inputOperationCount: forward.length,
  routeInterfaceCells: roleByKey.size,
  outputOperationCount: finalForward.length,
  dispositions: dispositionCounts,
  forwardSha256: sha256(forwardText),
  rollbackSha256: sha256(rollbackText),
  contract: {
    supportReplacement: EAST_STAIRS,
    feetReplacement: AIR,
    headReplacement: AIR,
    sourceRouteProof: 'both directions of C01 public and owner vertical routes',
  },
};
fs.writeFileSync(reportOut, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
