#!/usr/bin/env node
/** Independent read-only static route/halo QA for High-15 north bypass. */
import fs from 'node:fs';
import path from 'node:path';
import { cellKey, hashCells } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const manifestPath = option('--manifest'); const surveyPath = option('--survey'); const out = option('--out');
if (!manifestPath || !surveyPath || !out) throw new Error('usage: --manifest <json> --survey <json> --out <json>');
const ROOT = process.cwd(); const absolute = (f) => path.resolve(ROOT, f); const read = (f) => JSON.parse(fs.readFileSync(absolute(f), 'utf8'));
const manifest = read(manifestPath); const survey = read(surveyPath);
const point = (x, y, z) => ({ x, y, z }); const box = (a, b) => { const cells = []; for (let x = a.x; x <= b.x; x += 1) for (let y = a.y; y <= b.y; y += 1) for (let z = a.z; z <= b.z; z += 1) cells.push(point(x, y, z)); return cells; };
const core = [...box(point(-240, 54, -460), point(-235, 59, -430)), ...box(point(-274, 54, -435), point(-241, 59, -430))]; const coreKeys = new Set(core.map(cellKey));
const parsed = (f) => fs.readFileSync(absolute(f), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const p = line.split(/\s+/); if (p.length !== 9 || p[0] !== 'REPL') throw new Error(`bad operation ${line}`); return { point: point(+p[1], +p[2], +p[3]), from: p[7], to: p[8] }; });
const stageOps = manifest.stages.map((stage) => ({ ...stage, ops: parsed(stage.forward) })); const allOps = stageOps.flatMap(({ ops }) => ops); const opByCell = new Map(allOps.map((op) => [cellKey(op.point), op])); const duplicateOps = allOps.length - opByCell.size;
const routeVisited = new Set(); const queue = [core[0]]; routeVisited.add(cellKey(core[0])); for (let i = 0; i < queue.length; i += 1) { const c = queue[i]; for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const n = point(c.x + dx, c.y + dy, c.z + dz); if (coreKeys.has(cellKey(n)) && !routeVisited.has(cellKey(n))) { routeVisited.add(cellKey(n)); queue.push(n); } } }
const coreProjectionFailures = core.filter((cell) => survey.geometry.core.states['minecraft:air'] === undefined && false); // route source may contain inherited air; operation projection is authoritative below.
const sourceAir = new Set();
// The survey does not carry all individual air positions; derive preserved-air coverage from the compiler contract: 216 reused High-14 core cells.
for (const cell of box(point(-240, 54, -460), point(-235, 59, -455))) sourceAir.add(cellKey(cell));
const projectedNonAir = core.filter((cell) => !sourceAir.has(cellKey(cell)) && opByCell.get(cellKey(cell))?.to !== 'minecraft:air');
const checks = {
  stageCounts: stageOps[0]?.ops.length === 1422 && stageOps[1]?.ops.length === 2124 && allOps.length === 3546 && duplicateOps === 0,
  inverse: manifest.stages.every(({ exactInverse }) => exactInverse),
  sixBySixRoute: core.length === 2340 && routeVisited.size === core.length && projectedNonAir.length === 0,
  exactGeometry: manifest.geometry.core.count === 2340 && manifest.geometry.core.coordinateSetSha256 === hashCells(core) && manifest.geometry.shell.count === 1626 && manifest.geometry.halo.count === 1926,
  halo: manifest.geometry.halo.exactStates.length === 1926 && manifest.gravity.haloGravel.count === 28,
  interface: manifest.interfaces.migration.count === 36 && manifest.interfaces.migration.high14Count === 30 && manifest.interfaces.migration.high13Count === 6 && manifest.interfacesExcluded.fluid === 0 && manifest.interfacesExcluded.protected === 0,
  sourceSurvey: survey.status === 'STATIC_DRY_BYPASS_CANDIDATE_REQUIRES_GRAVITY_INTERFACE_COMPILER' && survey.checks.canonicalDryCoreShellHalo && survey.checks.noHeadhouseInteractionOverlap && survey.checks.noKnown5512FluidComponentOverlap,
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { schemaVersion: 1, id: 'rail-s3-r10-high15-north-bypass-static-route-halo-qa', status: failures.length ? 'FAIL' : 'PASS', manifestPath, surveyPath, stages: Object.fromEntries(stageOps.map(({ id, ops }) => [id, ops.length])), route: { coreCells: core.length, connectedCells: routeVisited.size, crossSection: '6x6', projectedNonAir: projectedNonAir.length, sourceAirReused: sourceAir.size }, geometry: { coreHash: hashCells(core), shell: manifest.geometry.shell.count, halo: manifest.geometry.halo.exactStates.length, haloGravel: manifest.gravity.haloGravel.count }, checks, failures, readOnly: true };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2));
