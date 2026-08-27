#!/usr/bin/env node
/** Read-only ownership and local-structure classification for the High-15 L-bypass. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const snapshot = option('--snapshot');
const bypassAnalysisPath = option('--bypass-analysis');
const high14ManifestPath = option('--high14-manifest');
const headhouseManifestPath = option('--headhouse-manifest');
const out = option('--out');
if (!snapshot || !bypassAnalysisPath || !high14ManifestPath || !headhouseManifestPath || !out) {
  throw new Error('usage: --snapshot <post> --bypass-analysis <json> --high14-manifest <json> --headhouse-manifest <json> --out <json>');
}
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 9 || parts[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
  return { point: { x: Number(parts[1]), y: Number(parts[2]), z: Number(parts[3]) }, from: parts[7], to: parts[8] };
});
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
const analysis = readJson(bypassAnalysisPath);
const high14 = readJson(high14ManifestPath);
const headhouse = readJson(headhouseManifestPath);
const high14Ops = high14.stages.flatMap(({ forward }) => parseOps(forward));
const high14Targets = new Set(high14Ops.map(({ point }) => cellKey(point)));
const headhouseOps = headhouse.packages.flatMap(({ forward }) => parseOps(forward));
const headhouseOpsByKey = new Map(headhouseOps.map((operation) => [cellKey(operation.point), operation]));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const pds = analysis.dryBypass.sourceInterfaces;
const migrationCells = pds.predecessorOwnedPds.map(({ point }) => point);
const headhouseCells = pds.unownedPds.map(({ point }) => point);
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const components = (cells) => {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const visited = new Set();
  const out = [];
  for (const cell of cells) {
    const root = cellKey(cell);
    if (visited.has(root)) continue;
    const queue = [cell];
    const component = [];
    visited.add(root);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      component.push(current);
      for (const [dx, dy, dz] of directions) {
        const adjacent = byKey.get(cellKey({ x: current.x + dx, y: current.y + dy, z: current.z + dz }));
        if (adjacent && !visited.has(cellKey(adjacent))) {
          visited.add(cellKey(adjacent));
          queue.push(adjacent);
        }
      }
    }
    out.push({ count: component.length, coordinateSetSha256: hashCells(component), cells: component });
  }
  return out.sort((left, right) => left.coordinateSetSha256.localeCompare(right.coordinateSetSha256));
};
const classifyMigration = [];
for (const cell of migrationCells) {
  const current = await stateAt(cell);
  classifyMigration.push({
    point: cell,
    current,
    high14ForwardTarget: high14Targets.has(cellKey(cell)),
    role: 'HIGH14_SOUTH_SHELL_INTERFACE',
    bypassRole: 'CORE_CONFLICT_REQUIRES_PDS_TO_AIR_MIGRATION',
    status: current === 'minecraft:polished_deepslate' && high14Targets.has(cellKey(cell)) ? 'CONDITIONALLY_MIGRATABLE_WITH_REPLACEMENT_SHELL_AND_EXACT_INVERSE' : 'FAIL_SOURCE_OR_OWNERSHIP_DRIFT',
  });
}
const classifyHeadhouse = [];
for (const cell of headhouseCells) {
  const current = await stateAt(cell);
  const operation = headhouseOpsByKey.get(cellKey(cell));
  classifyHeadhouse.push({
    point: cell,
    current,
    headhouseForwardTarget: Boolean(operation),
    headhouseForwardTo: operation?.to ?? null,
    canonicalOwner: headhouse.scope.canonicalOwner,
    role: 'COBALT_WL_HEADHOUSE_SEALED_SHAFT_SLEEVE',
    bypassRole: 'CORE_CONFLICT',
    status: current === 'minecraft:polished_deepslate' && operation?.to === 'minecraft:polished_deepslate'
      ? 'MUST_PRESERVE__BYPASS_ALIGNMENT_REJECTED' : 'FAIL_SOURCE_OR_OWNERSHIP_DRIFT',
  });
}
const migrationComponents = components(migrationCells);
const headhouseComponents = components(headhouseCells);
const checks = {
  migrationCount: migrationCells.length === 36,
  migrationCurrentAndOwner: classifyMigration.every(({ status }) => status === 'CONDITIONALLY_MIGRATABLE_WITH_REPLACEMENT_SHELL_AND_EXACT_INVERSE'),
  headhouseCount: headhouseCells.length === 72,
  headhouseCurrentAndOwner: classifyHeadhouse.every(({ status }) => status === 'MUST_PRESERVE__BYPASS_ALIGNMENT_REJECTED'),
  headhouseManifestIdentity: headhouse.transactionId === 'cobalt-wl-headhouse-01'
    && headhouse.scope.canonicalOwner === 'PASSENGER-RAILWAY',
};
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high15-l-bypass-pds-interface-classification',
  status: checks.migrationCount && checks.migrationCurrentAndOwner && checks.headhouseCount && checks.headhouseCurrentAndOwner
    ? 'PASS_CLASSIFIED__CURRENT_L_BYPASS_REJECTED_BY_MUST_PRESERVE_HEADHOUSE_SLEEVE' : 'FAIL_CLASSIFICATION_DRIFT',
  source: { snapshot, completeSaveCaptureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))).digest('hex') },
  bypassAnalysis: bypassAnalysisPath,
  migration: {
    count: migrationCells.length,
    coordinateSetSha256: hashCells(migrationCells),
    components: migrationComponents,
    owner: { release: high14.transactionId, manifest: high14ManifestPath, role: 'High-14 civil high-alignment south shell' },
    targetRole: 'new L-bypass core conflict; not a halo cell',
    safeStatus: 'CONDITIONALLY_MIGRATABLE_ONLY_WITH_REPLACEMENT_SHELL_EXACT_INVERSE',
    cells: classifyMigration,
  },
  headhouseSleeve: {
    count: headhouseCells.length,
    coordinateSetSha256: hashCells(headhouseCells),
    components: headhouseComponents,
    owner: { release: 'COBALT-WL-HEADHOUSE-01', manifest: headhouseManifestPath, canonicalOwner: headhouse.scope.canonicalOwner, purpose: headhouse.scope.purpose },
    localStructure: { shaftInterior: { x: [-250, -248], y: [18, 65], z: [-444, -442] }, sleevePanelLevel: { y: [54, 59] }, targetPanels: 4 },
    targetRole: 'new L-bypass core conflict; existing sealed-shaft structural sleeve, not a halo cell',
    safeStatus: 'MUST_PRESERVE__NO_MIGRATION_AUTHORITY_IN_THIS_BYPASS',
    cells: classifyHeadhouse,
  },
  decision: 'The five-water direct envelope remains held. The surveyed L-bypass is dry but structurally conflicts with 72 exact Cobalt-WL-Headhouse sleeve cells, so this alignment is rejected; pursue a disjoint route around the headhouse interaction envelope.',
  checks,
  readOnly: true,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, migration: { count: result.migration.count, hash: result.migration.coordinateSetSha256, components: result.migration.components.map(({ count, coordinateSetSha256 }) => ({ count, coordinateSetSha256 })) }, headhouseSleeve: { count: result.headhouseSleeve.count, hash: result.headhouseSleeve.coordinateSetSha256, components: result.headhouseSleeve.components.map(({ count, coordinateSetSha256 }) => ({ count, coordinateSetSha256 })) }, decision: result.decision }, null, 2));
