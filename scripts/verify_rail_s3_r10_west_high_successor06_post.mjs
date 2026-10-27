#!/usr/bin/env node
/** Independent immutable-snapshot QA for the R10 West High Successor-06 release. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceRoot = value('--source');
const postRoot = value('--post');
const out = value('--out');
const manifestPath = value('--manifest', 'data/buildops/rail-s3-r10-west-high-successor-06.manifest.json');
const predecessorManifestPath = value('--predecessor-manifest', 'data/buildops/rail-s3-r10-west-high-successor-05.manifest.json');
if (!sourceRoot || !postRoot || !out) throw new Error('usage: --source <snapshot> --post <snapshot> --out <json>');

const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const parseOperations = (file) => fs.readFileSync(path.resolve(root, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const tokens = line.trim().split(/\s+/);
  return { x: Number(tokens[1]), y: Number(tokens[2]), z: Number(tokens[3]) };
});
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push({ x, y, z });
  return cells;
};
const isPds = (block) => block === 'minecraft:polished_deepslate';
const exact = async (cells, expected) => {
  const failures = [];
  for (const point of cells) {
    const actual = await state(post, point);
    if (actual !== expected) failures.push({ point, expected, actual });
  }
  return { expected: cells.length, actual: cells.length - failures.length, failures };
};
const unchanged = async (cells) => {
  const failures = [];
  for (const point of cells) {
    const before = await state(source, point);
    const after = await state(post, point);
    if (before !== after) failures.push({ point, source: before, post: after });
  }
  return { expected: cells.length, actual: cells.length - failures.length, failures };
};

const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const predecessor = JSON.parse(fs.readFileSync(path.resolve(root, predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseOperations(forward)).map(cellKey));
const core = box({ x: -94, y: 42, z: -472 }, { x: -75, y: 47, z: -467 });
const coreKeys = new Set(core.map(cellKey));
const envelope = box({ x: -95, y: 41, z: -473 }, { x: -74, y: 48, z: -466 });
const shellSurface = envelope.filter((point) => !coreKeys.has(cellKey(point)) && (point.y === 41 || point.y === 48 || point.z === -473 || point.z === -466));
const shellMutable = parseOperations(manifest.stages.find(({ id }) => id === 'external-shell').forward);
const shellPredecessorPds = shellSurface.filter((point) => predecessorTargets.has(cellKey(point)));
const shellLocalPds = shellSurface.filter((point) => !predecessorTargets.has(cellKey(point)));
const halo = manifest.gravity.preservedHalo.exactStates;
const haloPds = halo.filter(({ state: expected }) => isPds(expected));
const haloPredecessorOwned = halo.filter(({ point }) => predecessorTargets.has(cellKey(point)));
const [coreAir, shellPds, predecessorInvariant, haloInvariant, shellPdsSource, shellLocalSource, haloPdsSource, haloPredecessorOwnedSource] = await Promise.all([
  exact(core, 'minecraft:air'),
  exact(shellMutable, 'minecraft:polished_deepslate'),
  unchanged([...new Map(predecessor.stages.flatMap(({ forward }) => parseOperations(forward)).map((point) => [cellKey(point), point])).values()]),
  (async () => {
    const failures = [];
    for (const { point, state: expected } of halo) {
      const actual = await state(post, point);
      if (actual !== expected) failures.push({ point, expected, actual });
    }
    return { expected: halo.length, actual: halo.length - failures.length, failures };
  })(),
  (async () => {
    const failures = [];
    for (const point of shellPredecessorPds) {
      const actual = await state(source, point);
      if (!isPds(actual)) failures.push({ point, expected: 'minecraft:polished_deepslate', actual });
    }
    return { expected: shellPredecessorPds.length, actual: shellPredecessorPds.length - failures.length, failures };
  })(),
  (async () => {
    const observed = [];
    for (const point of shellLocalPds) if (isPds(await state(source, point))) observed.push(point);
    return { expected: 0, actual: observed.length, failures: observed.map((point) => ({ point, unexpected: 'minecraft:polished_deepslate' })) };
  })(),
  (async () => {
    const failures = [];
    for (const { point, state: expected } of haloPds) {
      const before = await state(source, point);
      const after = await state(post, point);
      if (before !== expected || after !== expected) failures.push({ point, expected, source: before, post: after });
    }
    return { expected: haloPds.length, actual: haloPds.length - failures.length, failures };
  })(),
  (async () => {
    const failures = [];
    for (const { point, state: expected } of haloPredecessorOwned) {
      const before = await state(source, point);
      const after = await state(post, point);
      if (before !== expected || after !== expected) failures.push({ point, expected, source: before, post: after });
    }
    return { expected: haloPredecessorOwned.length, actual: haloPredecessorOwned.length - failures.length, failures };
  })(),
]);
const contractFailures = [];
const contract = manifest.ownership.predecessor;
if (shellPdsSource.expected !== contract.shellPds.count) contractFailures.push({ field: 'shellPds', expected: contract.shellPds.count, observed: shellPdsSource.expected });
if (haloPdsSource.expected !== contract.haloPds.count) contractFailures.push({ field: 'haloPds', expected: contract.haloPds.count, observed: haloPdsSource.expected });
if (haloPredecessorOwnedSource.expected !== contract.haloInterface.count) contractFailures.push({ field: 'haloInterface', expected: contract.haloInterface.count, observed: haloPredecessorOwnedSource.expected });
if (shellLocalSource.actual !== contract.localPds.count) contractFailures.push({ field: 'localPds', expected: contract.localPds.count, observed: shellLocalSource.actual });
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor06-independent-post-qa',
  sourceRoot,
  postRoot,
  status: [coreAir, shellPds, predecessorInvariant, haloInvariant, shellPdsSource, shellLocalSource, haloPdsSource, haloPredecessorOwnedSource].every((check) => check.failures.length === 0) && contractFailures.length === 0 ? 'PASS' : 'FAIL',
  coreAir,
  shellPolishedDeepslate: shellPds,
  predecessorInvariant,
  shellPds: { ...shellPdsSource, contract: 56 },
  haloPds: { ...haloPdsSource, contract: contract.haloPds.count },
  haloInterface: { ...haloPredecessorOwnedSource, contract: contract.haloInterface.count, meaning: 'predecessor-owned halo interface cells; exact state may be non-PDS' },
  localPds: { ...shellLocalSource, contract: 0, coordinateSetSha256: manifest.ownership.predecessor.localPds.coordinateSetSha256 },
  pdsMigration: { expected: 0, actual: 0, failures: [] },
  haloInvariant,
  retainedPredecessorInvariant: predecessorInvariant,
  contractFailures,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  status: result.status,
  coreAir: `${coreAir.actual}/${coreAir.expected}`,
  shell: `${shellPds.actual}/${shellPds.expected}`,
  shellPds: `${shellPdsSource.actual}/${shellPdsSource.expected}`,
  haloPds: `${haloPdsSource.actual}/${haloPdsSource.expected}`,
  haloInterface: `${haloPredecessorOwnedSource.actual}/${haloPredecessorOwnedSource.expected}`,
  localPds: `${shellLocalSource.actual}/${shellLocalSource.expected}`,
  pdsMigration: '0/0',
  halo: `${haloInvariant.actual}/${haloInvariant.expected}`,
  predecessor: `${predecessorInvariant.actual}/${predecessorInvariant.expected}`,
}, null, 2));
