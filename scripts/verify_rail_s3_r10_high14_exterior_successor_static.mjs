#!/usr/bin/env node
/** Independent offline QA for the High-14 exterior-band direct successor. */
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
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z)); return cells; };
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation ${line}`); return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[7], to: terms[8] }; });
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const core = box(point(-240, 54, -490), point(-235, 59, -481));
const ingress = box(point(-240, 54, -480), point(-235, 59, -480));
const migration = box(point(-240, 54, -481), point(-235, 59, -481));
const haloAir = box(point(-240, 54, -479), point(-235, 59, -479));
const stages = manifest.stages.map((stage) => ({ ...stage, ops: parse(stage.forward), rollbackOps: parse(stage.rollback) }));
const allOps = stages.flatMap(({ ops }) => ops);
const byKey = new Map(allOps.map((operation) => [cellKey(operation.point), operation]));
const duplicateOps = allOps.length - byKey.size;
const routeCells = [...ingress, ...core];
const routeKeys = new Set(routeCells.map(cellKey));
const seen = new Set([cellKey(ingress[0])]);
const queue = [ingress[0]];
for (let index = 0; index < queue.length; index += 1) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
  const cell = queue[index]; const next = point(cell.x + dx, cell.y + dy, cell.z + dz);
  if (routeKeys.has(cellKey(next)) && !seen.has(cellKey(next))) { seen.add(cellKey(next)); queue.push(next); }
}
const inverse = stages.every(({ ops, rollbackOps }) => ops.length === rollbackOps.length && ops.every((operation) => rollbackOps.some((rollback) => cellKey(rollback.point) === cellKey(operation.point) && rollback.from === operation.to && rollback.to === operation.from)));
const preservedAir = manifest.ownership.preservedRouteAir.cells.map(({ point: cell }) => cell);
const preservedPds = manifest.ownership.preservedHaloPds.cells.map(({ point: cell }) => cell);
const checks = {
  identity: manifest.id === 'rail-s3-r10-high14-exterior-successor-static-design' && manifest.status === 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  geometry: manifest.geometry.core.count === 360 && manifest.geometry.core.coordinateSetSha256 === hashCells(core) && manifest.geometry.shell.count === 312 && manifest.geometry.shell.coordinateSetSha256 === '0c770be7b24edce22731351d9476bfcb5ed4430a362c1b41218ce121219d953c' && manifest.geometry.halo.count === 400 && manifest.geometry.halo.coordinateSetSha256 === 'ef344efd31014271a61c80cc1a0be15d98ee6ce4fa1f6a94a05f5e908ad55097',
  route: manifest.route.crossSection === '6x6' && manifest.route.continuous === true && manifest.route.existingIngress.coordinateSetSha256 === hashCells(ingress) && manifest.route.continuousIngressAndCore === 396 && seen.size === routeCells.length && core.every((cell) => byKey.get(cellKey(cell))?.to === 'minecraft:air'),
  ownership: Object.values(manifest.ownership.forbiddenOverlap).every((cells) => cells.length === 0) && manifest.ownership.migration.count === 36 && manifest.ownership.migration.coordinateSetSha256 === hashCells(migration) && hashCells(manifest.ownership.migration.cells.map(({ point: cell }) => cell)) === hashCells(migration),
  preservedAir: manifest.ownership.preservedRouteAir.count === 72 && manifest.ownership.preservedRouteAir.shellCount === 36 && manifest.ownership.preservedRouteAir.haloCount === 36 && hashCells(preservedAir) === hashCells([...ingress, ...haloAir]) && preservedAir.every((cell) => !byKey.has(cellKey(cell))),
  preservedHaloPds: manifest.ownership.preservedHaloPds.count === 24 && preservedPds.every((cell) => !byKey.has(cellKey(cell))),
  hazards: manifest.hazards.fluidCount === 0 && manifest.hazards.gravityCount === 0 && manifest.hazards.unownedAir.length === 0 && manifest.hazards.blockEntities.length === 0 && manifest.hazards.savedEntities.length === 0,
  operations: stages.length === 2 && stages[0].count === 276 && stages[1].count === 360 && duplicateOps === 0 && allOps.length === 636 && inverse && manifest.exactInverse === true,
  civilBoundary: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { schemaVersion: 1, id: 'rail-s3-r10-high14-exterior-successor-independent-static-qa', status: failures.length ? 'FAIL' : 'PASS', manifestPath, checks, failures, geometry: { core: core.length, shell: manifest.geometry.shell.count, halo: manifest.geometry.halo.count }, route: { stations: 2, crossSection: '6x6', connectedCells: seen.size, expectedCells: routeCells.length }, operations: Object.fromEntries(stages.map(({ id, ops, rollbackOps }) => [id, { forward: ops.length, rollback: rollbackOps.length }])), readOnly: true };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
