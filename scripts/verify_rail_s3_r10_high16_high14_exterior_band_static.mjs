#!/usr/bin/env node
/** Independent read-only post-style projection QA for the High-14 exterior band. */
import fs from 'node:fs';
import path from 'node:path';
import { cellKey, hashCells } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const arg = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : ''; };
const manifestPath = arg('--manifest');
const out = arg('--out');
if (!manifestPath || !out) throw new Error('usage: --manifest <manifest> --out <report>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z)); return cells; };
const core = box(point(-240, 54, -480), point(-235, 59, -461));
const ingress = box(point(-240, 54, -460), point(-235, 59, -460));
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation ${line}`); return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[7], to: terms[8] }; });
const stages = manifest.stages.map((stage) => ({ ...stage, ops: parse(stage.forward), rollbackOps: parse(stage.rollback) }));
const allOps = stages.flatMap(({ ops }) => ops);
const byKey = new Map(allOps.map((operation) => [cellKey(operation.point), operation]));
const duplicateOps = allOps.length - byKey.size;
const expectedMigration = box(point(-240, 54, -461), point(-235, 59, -461));
const migration = manifest.ownership.migration.cells.map(({ point: cell }) => cell);
const routeCells = [...ingress, ...core];
const routeKeys = new Set(routeCells.map(cellKey));
const seen = new Set([cellKey(ingress[0])]);
const queue = [ingress[0]];
for (let index = 0; index < queue.length; index += 1) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
  const cell = queue[index]; const next = point(cell.x + dx, cell.y + dy, cell.z + dz);
  if (routeKeys.has(cellKey(next)) && !seen.has(cellKey(next))) { seen.add(cellKey(next)); queue.push(next); }
}
const inverse = stages.every(({ ops, rollbackOps }) => ops.length === rollbackOps.length && ops.every((operation) => rollbackOps.some((rollback) => cellKey(rollback.point) === cellKey(operation.point) && rollback.from === operation.to && rollback.to === operation.from)));
const checks = {
  identity: manifest.id === 'rail-s3-r10-high16-high14-exterior-band-static-design' && manifest.status === 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  geometry: manifest.geometry.core.count === 720 && manifest.geometry.core.coordinateSetSha256 === hashCells(core) && manifest.geometry.shell.count === 552 && manifest.geometry.shell.coordinateSetSha256 === '3f42d626c30ecaca4114a9ba90873f7bd583d70bc667cfaec7d2c7a4b5d16bfd' && manifest.geometry.halo.count === 680 && manifest.geometry.halo.coordinateSetSha256 === 'f0451967f419adc5b048f89a56247d29bc43ca323907b5d1fbdcff2845405eb1',
  route: manifest.route.crossSection === '6x6' && manifest.route.continuous === true && manifest.route.existingIngress.coordinateSetSha256 === hashCells(ingress) && seen.size === routeCells.length && core.every((cell) => byKey.get(cellKey(cell))?.to === 'minecraft:air'),
  ownership: manifest.ownership.high15Overlap.length === 0 && manifest.ownership.cobaltOverlap.length === 0 && manifest.ownership.migration.count === 36 && manifest.ownership.migration.coordinateSetSha256 === hashCells(expectedMigration) && manifest.ownership.migration.high14Count === 30 && manifest.ownership.migration.high13Count === 6 && hashCells(migration) === hashCells(expectedMigration),
  preservedAir: manifest.ownership.preservedRouteAir.count === 84 && manifest.ownership.preservedRouteAir.shellCount === 36 && manifest.ownership.preservedRouteAir.haloCount === 48 && manifest.ownership.preservedRouteAir.cells.every(({ point: cell }) => !byKey.has(cellKey(cell))),
  hazards: manifest.hazards.fluidCount === 0 && manifest.hazards.gravityCount === 0 && manifest.hazards.unownedAir.length === 0 && manifest.hazards.blockEntities.length === 0 && manifest.hazards.savedEntities.length === 0,
  operations: stages.length === 2 && duplicateOps === 0 && allOps.length === manifest.stages.reduce((sum, stage) => sum + stage.count, 0) && inverse && manifest.exactInverse === true,
  civilBoundary: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { schemaVersion: 1, id: 'rail-s3-r10-high16-high14-exterior-band-independent-static-qa', status: failures.length ? 'FAIL' : 'PASS', manifestPath, checks, failures, geometry: { core: core.length, shell: manifest.geometry.shell.count, halo: manifest.geometry.halo.count }, route: { stations: 2, crossSection: '6x6', connectedCells: seen.size, expectedCells: routeCells.length }, operations: Object.fromEntries(stages.map(({ id, ops, rollbackOps }) => [id, { forward: ops.length, rollback: rollbackOps.length }])), readOnly: true };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
