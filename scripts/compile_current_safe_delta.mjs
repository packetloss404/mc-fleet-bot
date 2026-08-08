#!/usr/bin/env node
/** Compile only source-state or target-state cells from a guarded operation file. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { completeBlockState } from './lib/complete_block_state.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function arg(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`${name} is required`);
  return args[index + 1];
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolve(file) {
  return path.resolve(ROOT, file);
}

function parseOperations(text) {
  const operations = [];
  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== 'REPL') continue;
    if (parts.length !== 9) throw new Error(`unsupported REPL at line ${lineIndex + 1}`);
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    operations.push({
      line: lineIndex + 1,
      x1,
      y1,
      z1,
      x2,
      y2,
      z2,
      expected: parts[7],
      replacement: parts[8],
    });
  }
  return operations;
}

const args = process.argv.slice(2);
const sourceOpsPath = resolve(arg(args, '--source-ops'));
const regions = resolve(arg(args, '--regions'));
const forwardPath = resolve(arg(args, '--forward'));
const rollbackPath = resolve(arg(args, '--rollback'));
const reportPath = resolve(arg(args, '--report'));
const sourceBytes = fs.readFileSync(sourceOpsPath);
const sourceOperations = parseOperations(sourceBytes.toString());
const snapshot = new DetailedAnvilSnapshot(regions);
const safe = [];
const unsafe = [];
let targetAlreadyPresent = 0;
let sourceCellCount = 0;

for (const operation of sourceOperations) {
  for (let y = Math.min(operation.y1, operation.y2); y <= Math.max(operation.y1, operation.y2); y += 1) {
    for (let z = Math.min(operation.z1, operation.z2); z <= Math.max(operation.z1, operation.z2); z += 1) {
      for (let x = Math.min(operation.x1, operation.x2); x <= Math.max(operation.x1, operation.x2); x += 1) {
        sourceCellCount += 1;
        const actual = completeBlockState(await snapshot.getBlock(x, y, z));
        const cell = { line: operation.line, x, y, z, expected: operation.expected, replacement: operation.replacement };
        if (actual === operation.replacement) {
          targetAlreadyPresent += 1;
        } else if (actual === operation.expected) {
          safe.push({ ...cell, expected: actual });
        } else {
          unsafe.push({ ...cell, actual });
        }
      }
    }
  }
}

const forwardText = [
  '# GENERATED — current-state-safe supplemental delta',
  `# source_operation_sha256: ${sha256(sourceBytes)}`,
  `# source_snapshot_sha256: ${hashSnapshotDirectory(regions).sha256}`,
  `# source_operations: ${sourceCellCount}`,
  `# safe_operations: ${safe.length}`,
  `# target_already_present: ${targetAlreadyPresent.length}`,
  `# unsafe_operations: ${unsafe.length}`,
  '',
  ...safe.map((operation) => [
    'REPL', operation.x, operation.y, operation.z, operation.x,
    operation.y, operation.z, operation.expected, operation.replacement,
  ].join(' ')),
  '',
].join('\n');
const rollbackText = [
  '# GENERATED — exact inverse of current-state-safe supplemental delta',
  `# forward_sha256: ${sha256(forwardText)}`,
  `# source_snapshot_sha256: ${hashSnapshotDirectory(regions).sha256}`,
  `# safe_operations: ${safe.length}`,
  '',
  ...[...safe].reverse().map((operation) => [
    'REPL', operation.x, operation.y, operation.z, operation.x,
    operation.y, operation.z, operation.replacement, operation.expected,
  ].join(' ')),
  '',
].join('\n');

fs.mkdirSync(path.dirname(forwardPath), { recursive: true });
fs.writeFileSync(forwardPath, forwardText);
fs.writeFileSync(rollbackPath, rollbackText);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({
  schemaVersion: 1,
  status: unsafe.length === 0 ? 'READY_FOR_GUARDED_EXECUTION' : 'BLOCKED_UNSAFE_DRIFT',
  sourceOps: sourceOpsPath,
  sourceOpsSha256: sha256(sourceBytes),
  sourceSnapshot: { directory: regions, ...hashSnapshotDirectory(regions) },
  counts: {
    source: sourceCellCount,
    safe: safe.length,
    targetAlreadyPresent: targetAlreadyPresent.length,
    unsafe: unsafe.length,
  },
  unsafe: unsafe.slice(0, 100),
  forward: { path: forwardPath, sha256: sha256(forwardText) },
  rollback: { path: rollbackPath, sha256: sha256(rollbackText) },
}, null, 2)}\n`);

if (unsafe.length > 0) process.exitCode = 1;
