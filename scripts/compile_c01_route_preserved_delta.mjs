#!/usr/bin/env node
/**
 * Compile the next C01 tranche while preserving the exact live route
 * interface.  The route verifier supplies the accepted feet/head/support
 * cells; any model delta touching that interface is held for a later
 * coordinated stair-core redesign.  The remaining cells are emitted as a
 * normal one-cell guarded package with an exact inverse.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function absolute(filename) {
  return path.resolve(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--input') options.input = argv[++index];
    else if (token === '--rollback-input') options.rollbackInput = argv[++index];
    else if (token === '--regions') options.regions = argv[++index];
    else if (token === '--manifest') options.manifest = argv[++index];
    else if (token === '--out') options.out = argv[++index];
    else if (token === '--rollback-out') options.rollbackOut = argv[++index];
    else if (token === '--report') options.report = argv[++index];
    else throw new Error(`unknown argument ${token}`);
  }
  for (const field of ['input', 'rollbackInput', 'regions', 'manifest', 'out', 'rollbackOut', 'report']) {
    if (!options[field]) throw new Error(`missing --${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  return options;
}

function parseOperation(line) {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'REPL' || tokens.length < 9) return null;
  return {
    line,
    key: `${tokens[1]},${tokens[2]},${tokens[3]}`,
  };
}

function operationKeys(filename) {
  return fs.readFileSync(absolute(filename), 'utf8')
    .split('\n')
    .map(parseOperation)
    .filter(Boolean);
}

function routeInterface(report) {
  const protectedCells = new Set();
  const routes = [];
  for (const test of report.tests) {
    if (!/^TE-ROUTE-C01-(PUBLIC|OWNER)-VERTICAL$/.test(test.id)) continue;
    const cells = new Set();
    for (const direction of test.directions) {
      if (!Array.isArray(direction.path)) {
        throw new Error(`${test.id} ${direction.direction} has no accepted path`);
      }
      for (const [x, y, z] of direction.path) {
        for (const deltaY of [-1, 0, 1]) {
          const key = `${x},${y + deltaY},${z}`;
          cells.add(key);
          protectedCells.add(key);
        }
      }
    }
    routes.push({ id: test.id, pathInterfaceCells: cells.size });
  }
  if (routes.length !== 2) throw new Error('expected both C01 vertical route proofs');
  return { protectedCells, routes };
}

function replaceHeader(lines, header) {
  return [
    `# GENERATED — ${header}`,
    ...lines.filter((line) => !line.startsWith('# GENERATED')),
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputLines = fs.readFileSync(absolute(options.input), 'utf8').trim().split('\n');
  const rollbackLines = fs.readFileSync(absolute(options.rollbackInput), 'utf8').trim().split('\n');
  const routeReport = await verifyTownExpansionRoutes({
    manifest: options.manifest,
    regions: options.regions,
    noWrite: true,
  });
  if (!routeReport.tests.filter((test) => /^TE-ROUTE-C01-(PUBLIC|OWNER)-VERTICAL$/.test(test.id))
    .every((test) => test.passed)) {
    throw new Error('live C01 vertical route proof is not passing');
  }
  const { protectedCells, routes } = routeInterface(routeReport);
  const forwardOps = operationKeys(options.input);
  const rollbackOps = operationKeys(options.rollbackInput);
  const selectedKeys = new Set();
  const heldKeys = new Set();
  const selectedForward = [];
  for (const operation of forwardOps) {
    if (protectedCells.has(operation.key)) heldKeys.add(operation.key);
    else {
      selectedKeys.add(operation.key);
      selectedForward.push(operation.line);
    }
  }
  const selectedRollback = rollbackOps
    .filter((operation) => selectedKeys.has(operation.key))
    .map((operation) => operation.line);
  if (selectedRollback.length !== selectedForward.length) {
    throw new Error(`forward/rollback selection mismatch ${selectedForward.length}/${selectedRollback.length}`);
  }
  const sourceSha = inputLines.find((line) => line.startsWith('# source_snapshot_sha256:')) ?? '';
  const forwardBody = replaceHeader(
    [sourceSha, `# held_route_interface_cells: ${heldKeys.size}`, `# changed_cells: ${selectedForward.length}`, ...selectedForward],
    'C01 route-preserved exact delta',
  );
  const forwardText = `${forwardBody.join('\n')}\n`;
  const forwardSha = sha256(forwardText);
  const rollbackBody = replaceHeader(
    [sourceSha, `# held_route_interface_cells: ${heldKeys.size}`, `# changed_cells: ${selectedRollback.length}`, ...selectedRollback],
    'exact inverse of C01 route-preserved exact delta',
  );
  const rollbackText = `${rollbackBody.join('\n')}\n`;
  fs.mkdirSync(path.dirname(absolute(options.out)), { recursive: true });
  fs.mkdirSync(path.dirname(absolute(options.rollbackOut)), { recursive: true });
  fs.writeFileSync(absolute(options.out), forwardText);
  fs.writeFileSync(absolute(options.rollbackOut), `${rollbackBody.slice(0, 3).join('\n')}\n${selectedRollback.join('\n')}\n`);
  const report = {
    status: 'C01_ROUTE_PRESERVED_DELTA_READY',
    input: relative(absolute(options.input)),
    rollbackInput: relative(absolute(options.rollbackInput)),
    regions: relative(absolute(options.regions)),
    regionsSha256: routeReport.postSnapshot.sha256,
    manifest: relative(absolute(options.manifest)),
    manifestSha256: routeReport.manifest.sha256,
    sourceSnapshotSha256: sourceSha.split(': ')[1] ?? null,
    inputOperationCount: forwardOps.length,
    selectedOperationCount: selectedForward.length,
    heldOperationCount: heldKeys.size,
    forwardSha256: forwardSha,
    rollbackSha256: sha256(`${rollbackBody.slice(0, 3).join('\n')}\n${selectedRollback.join('\n')}\n`),
    routeInterface: {
      definition: 'all accepted C01 vertical-route feet, head, and support cells from both directions',
      cells: protectedCells.size,
      routes,
    },
    heldKeys: [...heldKeys].sort(),
  };
  fs.mkdirSync(path.dirname(absolute(options.report)), { recursive: true });
  fs.writeFileSync(absolute(options.report), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    inputOperationCount: report.inputOperationCount,
    selectedOperationCount: report.selectedOperationCount,
    heldOperationCount: report.heldOperationCount,
    forwardSha256: report.forwardSha256,
  }, null, 2)}\n`);
}

await main();
