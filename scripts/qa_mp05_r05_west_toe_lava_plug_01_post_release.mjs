#!/usr/bin/env node
/** Independent post-release proof for the finite R05 west-toe lava plug. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const argv = process.argv.slice(2);
const value = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', '');
const MANIFEST = value('--manifest', 'data/buildops/mp05-r05-west-toe-lava-plug-01.release-manifest.json');
const OUT = value('--out', 'data/world-review/mp05-r05-west-toe-lava-plug-01-post-qa.json');
const abs = (f) => path.resolve(ROOT, f); const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`R05 west-toe lava QA rejected: ${message}`); };
fail(SNAPSHOT, '--snapshot must be a fresh immutable post-release snapshot');
const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST), 'utf8'));
fail(manifest.releaseNodeId === 'CZ-MP05-R05-WEST-TOE-LAVA-PLUG', 'wrong manifest');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(abs(path.join(SNAPSHOT, member))), `post snapshot missing ${member}`);
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const forward = fs.readFileSync(abs(manifest.packages[0].forward), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
const targets = forward.map((line) => { const p = line.split(/\s+/); return { cell: { x: Number(p[1]), y: Number(p[2]), z: Number(p[3]) }, expected: p[8] }; });
const post = await Promise.all(targets.map(async ({ cell, expected }) => ({ cell, expected, observed: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const mismatches = post.filter(({ expected, observed }) => expected !== observed);
const chunks = new Set(targets.map(({ cell }) => `${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`)); const blockEntities = []; const entities = [];
for (const id of chunks) { const [cx, cz] = id.split(',').map(Number); const chunk = await reader.chunk(cx, cz); for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) if (targets.some(({ cell }) => cellKey(cell) === `${be.x},${be.y},${be.z}`)) blockEntities.push(be); const entityChunk = await entityReader.chunk(cx, cz); for (const entity of entityChunk?.Entities ?? []) { const p = entity.Pos?.slice(0, 3).map(Number); if (p?.length === 3 && targets.some(({ cell }) => Math.floor(p[0]) === cell.x && Math.floor(p[1]) === cell.y && Math.floor(p[2]) === cell.z)) entities.push({ id: entity.id ?? null, position: p }); } }
const report = { schemaVersion: 1, id: 'MP05-R05-WEST-TOE-LAVA-PLUG-01-POST-QA', status: mismatches.length || blockEntities.length || entities.length ? 'FAIL' : 'PASS_EXECUTED_FINITE_LAVA_PLUG', postSnapshot: SNAPSHOT, manifest: MANIFEST, targetCount: targets.length, exactDesiredTargets: targets.length - mismatches.length, mismatches, targetBlockEntityCount: blockEntities.length, targetSavedEntityCount: entities.length, retainedNoRouteCommissioning: manifest.scope.routeOrAccessCommissioned === false };
report.reportIdentitySha256 = sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`); fail(report.status.startsWith('PASS'), 'post state or entity condition failed'); console.log(JSON.stringify({ status: report.status, out: OUT, targetCount: targets.length }, null, 2));
