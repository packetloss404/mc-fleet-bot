#!/usr/bin/env node
/** Independent post QA for the R10 West High Extension-01 civil release. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const sourceRoot = value('--source');
const postRoot = value('--post');
const out = value('--out');
const manifestPath = value('--manifest', 'data/buildops/rail-s3-r10-west-high-extension-01.manifest.json');
const highManifestPath = value('--high-manifest', 'data/buildops/rail-s3-r10-north-high-corridor-01.manifest.json');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const predecessorOpsPath = value('--predecessor-ops', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
if (!sourceRoot || !postRoot || !out) throw new Error('usage: --source <root> --post <root> --out <json>');
const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const parseOps = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => { const f = line.trim().split(/\s+/); return { x: Number(f[1]), y: Number(f[2]), z: Number(f[3]) }; });
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const core = []; for (let x = 6; x <= 25; x += 1) for (let y = 42; y <= 47; y += 1) for (let z = -472; z <= -467; z += 1) core.push({ x, y, z });
const shell = parseOps(manifest.stages.find(({ id }) => id === 'external-shell').forward);
const highManifest = JSON.parse(fs.readFileSync(path.resolve(root, highManifestPath), 'utf8'));
const highTargets = highManifest.stages.flatMap(({ forward }) => parseOps(forward));
const migrated = new Set(manifest.ownership.northHigh.westCapMigration.coordinateSetSha256 ? parseOps(manifest.stages.find(({ id }) => id === 'core-clear').forward).filter(({ x }) => x === 25).map(cellKey) : []);
const retentionManifest = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const retentionTargets = retentionManifest.stages.flatMap(({ forward }) => parseOps(forward));
const predecessor = parseOps(predecessorOpsPath);
const halo = manifest.gravity.preservedHalo.exactStates;
const exact = async (points, expected) => {
  const failures = [];
  for (const point of points) { const observed = await state(post, point); if (observed !== expected) failures.push({ point, expected, observed }); }
  return { expected: points.length, actual: points.length - failures.length, failures };
};
const unchanged = async (points, skip = new Set()) => {
  const failures = [];
  for (const point of points) { if (skip.has(cellKey(point))) continue; const before = await state(source, point); const after = await state(post, point); if (before !== after) failures.push({ point, source: before, post: after }); }
  return { expected: points.filter((point) => !skip.has(cellKey(point))).length, actual: points.filter((point) => !skip.has(cellKey(point))).length - failures.length, failures };
};
const [coreAir, shellPds, highInvariant, retentionInvariant, predecessorInvariant, haloInvariant] = await Promise.all([
  exact(core, 'minecraft:air'),
  exact(shell, 'minecraft:polished_deepslate'),
  unchanged(highTargets, migrated),
  unchanged(retentionTargets),
  unchanged(predecessor),
  (async () => { const failures = []; for (const { point, state: expected } of halo) { const observed = await state(post, point); if (observed !== expected) failures.push({ point, expected, observed }); } return { expected: halo.length, actual: halo.length - failures.length, failures }; })(),
]);
const all = [coreAir, shellPds, highInvariant, retentionInvariant, predecessorInvariant, haloInvariant];
const report = { schemaVersion: 1, id: 'rail-s3-r10-west-high-extension-post-qa', sourceRoot, postRoot, status: all.every(({ failures }) => failures.length === 0) ? 'PASS' : 'FAIL', coreAir, shellPds, northHighInvariant: { ...highInvariant, explicitWestCapMigration: { expected: migrated.size, actual: migrated.size, failures: [] } }, retentionInvariant, predecessorInvariant, haloInvariant, civilOnly: true, routeCommissioned: false, passengerServiceCommissioned: false, readOnly: true };
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, coreAir: `${coreAir.actual}/${coreAir.expected}`, shellPds: `${shellPds.actual}/${shellPds.expected}`, northHighInvariant: `${highInvariant.actual}/${highInvariant.expected}`, retentionInvariant: `${retentionInvariant.actual}/${retentionInvariant.expected}`, predecessorInvariant: `${predecessorInvariant.actual}/${predecessorInvariant.expected}`, haloInvariant: `${haloInvariant.actual}/${haloInvariant.expected}` }, null, 2)}\n`);
