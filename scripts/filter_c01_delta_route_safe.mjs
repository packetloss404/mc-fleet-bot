#!/usr/bin/env node
/**
 * Derive a conservative C01 finishing package from an already compiled delta.
 * Route cells, their immediate movement neighborhood, and stair/clearance
 * changes are held for a separately authored route package.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const INPUT = path.resolve(ROOT, argValue('--input', 'data/buildops/c01-current-snapshot-delta-2026-08-08.txt'));
const ROLLBACK_INPUT = path.resolve(ROOT, argValue('--rollback-input', 'data/buildops/c01-current-snapshot-delta-2026-08-08.rollback.txt'));
const REGIONS = path.resolve(ROOT, argValue('--regions', 'data/worldsnap/c01-current-delta-rollback-post-20260808/region'));
const OUT = path.resolve(ROOT, argValue('--out', 'data/buildops/c01-route-safe-finish-2026-08-08.txt'));
const ROLLBACK_OUT = path.resolve(ROOT, argValue('--rollback-out', 'data/buildops/c01-route-safe-finish-2026-08-08.rollback.txt'));
const REPORT_OUT = path.resolve(ROOT, argValue('--report', 'data/world-review/c01-route-safe-finish-2026-08-08.json'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function base(state) {
  return state.split('[', 1)[0];
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function parseOperations(filename) {
  const operations = [];
  let context = {};
  for (const [index, raw] of fs.readFileSync(filename, 'utf8').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line.startsWith('# phase=')) {
      const match = line.match(/^# phase=(\S+)\s+scope=(\S+)\s+role=(.+)$/);
      context = match ? { phase: Number(match[1]), scope: match[2], role: match[3] } : {};
      continue;
    }
    if (!line.startsWith('REPL ')) continue;
    const fields = line.split(/\s+/);
    if (fields.length !== 9) throw new Error(`invalid operation at ${filename}:${index + 1}`);
    const [x, y, z, x2, y2, z2] = fields.slice(1, 7).map(Number);
    if (x !== x2 || y !== y2 || z !== z2) throw new Error('route-safe filter requires one-cell operations');
    operations.push({
      ...context,
      x, y, z,
      expected: fields[7],
      replacement: fields[8],
    });
  }
  return operations;
}

function operationLine(operation) {
  return [
    'REPL', operation.x, operation.y, operation.z,
    operation.x, operation.y, operation.z,
    operation.expected, operation.replacement,
  ].join(' ');
}

const neighborhoodRadius = Number(argValue('--neighborhood-radius', '1'));
const holdClearance = argValue('--hold-clearance', 'true') !== 'false';
const holdStairs = argValue('--hold-stairs', 'true') !== 'false';
const yMin = argValue('--y-min', null);
const yMax = argValue('--y-max', null);

function neighborhood(points) {
  const output = new Set();
  for (const [x, y, z] of points) {
    for (let dx = -neighborhoodRadius; dx <= neighborhoodRadius; dx += 1) {
      for (let dy = -neighborhoodRadius; dy <= neighborhoodRadius; dy += 1) {
        for (let dz = -neighborhoodRadius; dz <= neighborhoodRadius; dz += 1) output.add(pointKey(x + dx, y + dy, z + dz));
      }
    }
  }
  return output;
}

const routeReport = await verifyTownExpansionRoutes({
  manifest: 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json',
  regions: REGIONS,
  noWrite: true,
});
const routePoints = routeReport.routes
  .filter((route) => route.domain === 'c01-bunker')
  .flatMap((route) => route.directions)
  .flatMap((direction) => direction.path ?? []);
const heldPoints = neighborhood(routePoints);
const source = parseOperations(INPUT);
const safe = source.filter((operation) => (
  (yMin === null || operation.y >= Number(yMin))
  && (yMax === null || operation.y <= Number(yMax))
  && !heldPoints.has(pointKey(operation.x, operation.y, operation.z))
  && (!holdClearance || !['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(base(operation.replacement)))
  && (!holdStairs || (
    base(operation.expected) !== 'minecraft:polished_blackstone_stairs'
    && base(operation.expected) !== 'minecraft:stone_stairs'
    && base(operation.replacement) !== 'minecraft:polished_blackstone_stairs'
    && base(operation.replacement) !== 'minecraft:stone_stairs'
  ))
));
const safeRollback = [...safe].reverse().map((operation) => ({
  ...operation,
  expected: operation.replacement,
  replacement: operation.expected,
}));
const forwardText = [
  '# GENERATED — C01 conservative route-safe finish',
  `# source_delta_sha256: ${sha256(fs.readFileSync(INPUT))}`,
  `# source_snapshot_sha256: ${routeReport.postSnapshot.sha256}`,
  `# held_route_cells: ${heldPoints.size}`,
  `# changed_cells: ${safe.length}`,
  '',
  ...safe.map(operationLine),
  '',
].join('\n');
const rollbackText = [
  '# GENERATED — exact inverse of C01 conservative route-safe finish',
  `# forward_sha256: ${sha256(forwardText)}`,
  `# source_snapshot_sha256: ${routeReport.postSnapshot.sha256}`,
  `# changed_cells: ${safeRollback.length}`,
  '',
  ...safeRollback.map(operationLine),
  '',
].join('\n');
const report = {
  schemaVersion: 1,
  status: routeReport.routes.filter((route) => route.domain === 'c01-bunker').every((route) => route.passed)
    ? 'ROUTE_SAFE_FILTER_READY_FOR_PROJECTED_QA'
    : 'ROUTE_SAFE_FILTER_BLOCKED_BY_BASE_ROUTE_QA',
  sourceDelta: { file: INPUT, sha256: sha256(fs.readFileSync(INPUT)), operationCount: source.length },
  sourceRollback: { file: ROLLBACK_INPUT, sha256: sha256(fs.readFileSync(ROLLBACK_INPUT)) },
  sourceSnapshot: routeReport.postSnapshot,
  heldRouteNeighborhoodCells: heldPoints.size,
  routeBaseResults: routeReport.routes
    .filter((route) => route.domain === 'c01-bunker')
    .map((route) => ({ id: route.id, passed: route.passed })),
  safeOperationCount: safe.length,
  filteredOut: source.length - safe.length,
  rules: [
    `hold every C01 route path cell and movement neighborhood radius ${neighborhoodRadius}`,
    ...(holdClearance ? ['hold all air/clearance replacements'] : []),
    ...(holdStairs ? ['hold all stair source or replacement states'] : []),
  ],
  forwardSha256: sha256(forwardText),
  rollbackSha256: sha256(rollbackText),
};
if (report.status !== 'ROUTE_SAFE_FILTER_READY_FOR_PROJECTED_QA') {
  throw new Error(`route-safe filter blocked: ${JSON.stringify(report.routeBaseResults)}`);
}
for (const filename of [OUT, ROLLBACK_OUT, REPORT_OUT]) fs.mkdirSync(path.dirname(filename), { recursive: true });
fs.writeFileSync(OUT, forwardText);
fs.writeFileSync(ROLLBACK_OUT, rollbackText);
fs.writeFileSync(REPORT_OUT, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
