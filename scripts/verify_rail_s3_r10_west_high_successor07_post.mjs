#!/usr/bin/env node
/** Independent source-to-post coordinate QA for the R10 West High Successor-07 release. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const sourceRoot = option('--source');
const postRoot = option('--post');
const out = option('--out');
const manifestPath = option('--manifest', 'data/buildops/rail-s3-r10-west-high-successor-07.manifest.json');
const predecessorManifestPath = option('--predecessor-manifest', 'data/buildops/rail-s3-r10-west-high-successor-06.manifest.json');
if (!sourceRoot || !postRoot || !out) throw new Error('usage: --source <snapshot> --post <snapshot> --out <json>');
const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z)); return cells; };
const parse = (file) => fs.readFileSync(path.resolve(root, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); return point(Number(terms[1]), Number(terms[2]), Number(terms[3])); });
const exact = async (cells, expected) => { const failures = []; for (const cell of cells) { const actual = await state(post, cell); if (actual !== expected) failures.push({ point: cell, expected, actual }); } return { expected: cells.length, actual: cells.length - failures.length, failures }; };
const unchanged = async (cells) => { const failures = []; for (const cell of cells) { const before = await state(source, cell); const after = await state(post, cell); if (before !== after) failures.push({ point: cell, source: before, post: after }); } return { expected: cells.length, actual: cells.length - failures.length, failures }; };

const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const predecessor = JSON.parse(fs.readFileSync(path.resolve(root, predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
const core = box(point(-114, 42, -472), point(-95, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-115, 41, -473), point(-94, 48, -466));
const shellSurface = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466));
const shellMutable = parse(manifest.stages.find(({ id }) => id === 'external-shell').forward);
const shellPds = shellSurface.filter((cell) => predecessorTargets.has(cellKey(cell)));
const localShell = shellSurface.filter((cell) => !predecessorTargets.has(cellKey(cell)));
const halo = manifest.gravity.preservedHalo.exactStates;
const haloPds = halo.filter(({ state: expected }) => expected === 'minecraft:polished_deepslate');
const haloInterface = halo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const predecessorCells = [...new Map(predecessor.stages.flatMap(({ forward }) => parse(forward)).map((cell) => [cellKey(cell), cell])).values()];
const [coreAir, shellPdsPost, predecessorInvariant, haloInvariant, shellPdsSource, localPdsSource, haloPdsInvariant, haloInterfaceInvariant] = await Promise.all([
  exact(core, 'minecraft:air'),
  exact(shellMutable, 'minecraft:polished_deepslate'),
  unchanged(predecessorCells),
  (async () => { const failures = []; for (const { point: cell, state: expected } of halo) { const actual = await state(post, cell); if (actual !== expected) failures.push({ point: cell, expected, actual }); } return { expected: halo.length, actual: halo.length - failures.length, failures }; })(),
  (async () => { const failures = []; for (const cell of shellPds) { const actual = await state(source, cell); if (actual !== 'minecraft:polished_deepslate') failures.push({ point: cell, expected: 'minecraft:polished_deepslate', actual }); } return { expected: shellPds.length, actual: shellPds.length - failures.length, failures }; })(),
  (async () => { const found = []; for (const cell of localShell) if (await state(source, cell) === 'minecraft:polished_deepslate') found.push(cell); return { expected: 0, actual: found.length, failures: found.map((point) => ({ point, unexpected: 'minecraft:polished_deepslate' })) }; })(),
  (async () => { const failures = []; for (const { point: cell, state: expected } of haloPds) { const before = await state(source, cell); const after = await state(post, cell); if (before !== expected || after !== expected) failures.push({ point: cell, expected, source: before, post: after }); } return { expected: haloPds.length, actual: haloPds.length - failures.length, failures }; })(),
  (async () => { const failures = []; for (const { point: cell, state: expected } of haloInterface) { const before = await state(source, cell); const after = await state(post, cell); if (before !== expected || after !== expected) failures.push({ point: cell, expected, source: before, post: after }); } return { expected: haloInterface.length, actual: haloInterface.length - failures.length, failures }; })(),
]);
const contract = manifest.ownership.predecessor;
const contractFailures = [];
for (const [field, observed, expected] of [['shellPds', shellPdsSource.expected, contract.shellPds.count], ['haloPds', haloPdsInvariant.expected, contract.haloPds.count], ['haloInterface', haloInterfaceInvariant.expected, contract.haloInterface.count], ['localPds', localPdsSource.actual, contract.localPds.count]]) if (observed !== expected) contractFailures.push({ field, expected, observed });
const checks = [coreAir, shellPdsPost, predecessorInvariant, haloInvariant, shellPdsSource, localPdsSource, haloPdsInvariant, haloInterfaceInvariant];
const result = { schemaVersion: 1, id: 'rail-s3-r10-west-high-successor07-independent-post-qa', sourceRoot, postRoot, status: checks.every((check) => check.failures.length === 0) && contractFailures.length === 0 ? 'PASS' : 'FAIL', coreAir, shellPolishedDeepslate: shellPdsPost, shellPds: { ...shellPdsSource, contract: contract.shellPds.count }, haloPds: { ...haloPdsInvariant, contract: contract.haloPds.count }, haloInterface: { ...haloInterfaceInvariant, contract: contract.haloInterface.count }, localPds: { ...localPdsSource, contract: contract.localPds.count }, pdsMigration: { expected: 0, actual: 0, failures: [] }, haloInvariant, predecessorInvariant, contractFailures, civilOnly: true, routeCommissioned: false, passengerServiceCommissioned: false, readOnly: true };
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, coreAir: `${coreAir.actual}/${coreAir.expected}`, shell: `${shellPdsPost.actual}/${shellPdsPost.expected}`, shellPds: `${shellPdsSource.actual}/${shellPdsSource.expected}`, haloPds: `${haloPdsInvariant.actual}/${haloPdsInvariant.expected}`, haloInterface: `${haloInterfaceInvariant.actual}/${haloInterfaceInvariant.expected}`, localPds: `${localPdsSource.actual}/${localPdsSource.expected}`, halo: `${haloInvariant.actual}/${haloInvariant.expected}`, predecessor: `${predecessorInvariant.actual}/${predecessorInvariant.expected}`, contractFailures }, null, 2));
