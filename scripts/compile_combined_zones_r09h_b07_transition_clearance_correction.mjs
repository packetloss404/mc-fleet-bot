#!/usr/bin/env node
/** Compile CZ-R09H: exact two-cell B07 transition-clearance correction. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T02:15:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r09g-post-20260822T020232Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/evidence-ledger.json',
);
const SOURCE_QA = value(
  '--source-qa',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/r09g-post-release-qa.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r09h-b07-transition-clearance-correction',
);
const ENTITY_REPORT = value(
  '--entity-report',
  'data/world-review/combined-zones-r09h-b07-transition-clearance-correction-offline-20260822T021500Z/immutable-entity-clearance.json',
);

const RELEASE_ID = 'CZ-R09H-P1-B07-TRANSITION-CLEARANCE-CORRECTION';
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-r09e-r09f-transition-clearance-correction';
const AIR = 'minecraft:air';
const CONTAINMENT = 'minecraft:polished_diorite';
const TOP_SLAB = 'minecraft:smooth_stone_slab[type=top,waterlogged=false]';
const LIGHT = 'minecraft:sea_lantern';
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:granite',
  'minecraft:diorite', 'minecraft:andesite', 'minecraft:deepslate', 'minecraft:tuff',
  'minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:coal_ore',
  'minecraft:polished_andesite', CONTAINMENT, LIGHT,
]);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston',
  'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:hopper',
]);
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jManifest: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
  r09gManifest: 'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00',
  sourceRegion: 'a8ac3a94c0b5ec5167857abdabf212a8b4539b3f9ce675c3527a27fa5eec4379',
  sourceLedger: 'd48df08b9161cf9e0e5591581d96ebcdcfbedcc3948b1ae40b4729d10852d624',
  sourceCompleted: '6777fdf8c9629c32de06ef11348da49976fa8a9143560f34b7a0890645d18bf1',
  sourceQa: '44d60780a3643538b62d1d0f7b1b63e9b245247e83662198b711ef9d8b735b00',
  sourceQaPayload: '601a83d4ed8bed0e5e26abd28bb7b0f44fba99554f80223a94e7f0f3ae585fe0',
  r02Manifest: 'd880ccfe4a2a70c7be91f4a0d2e9462df131ff8b160650097cf85db68d7db88b',
  r06Manifest: 'b671d1f88137951ca0b1e25cf3e2c93e7db4d87b30db614223925af28e12bf07',
  r07jManifest: '7714a583c3e659b0f9d2efac228ad8a1c1fb050a3b78b9010ee40c2ed519f223',
  r09eManifest: '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
  r09fManifest: 'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
  r09gManifest: '4df5a9df25c56e4c0145e0a566354ecbd8d489fdde00cd585000c8328ebc67bb',
  b07ConstructionHash: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionHash: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  targetHash: '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09H B07 transition compiler rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const stateCensus = (records, field = 'state') => Object.fromEntries([...records.reduce((counts, record) => {
  counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const cubeHalo = (cells) => uniqueCells(cells.flatMap(({ x, y, z }) => {
  const output = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) output.push({ x: x + dx, y: y + dy, z: z + dz });
    }
  }
  return output;
}));
const intersection = (left, right) => {
  const keys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => keys.has(cellKey(cell))));
};

function operationIntersection(filename, targetCells) {
  const hits = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    const box = fields.slice(1, 7).map(Number);
    for (const cell of targetCells) {
      if (cell.x >= Math.min(box[0], box[3]) && cell.x <= Math.max(box[0], box[3])
        && cell.y >= Math.min(box[1], box[4]) && cell.y <= Math.max(box[1], box[4])
        && cell.z >= Math.min(box[2], box[5]) && cell.z <= Math.max(box[2], box[5])) hits.push(cell);
    }
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
const mechanisms = readJson(INPUTS.mechanisms);
const relics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.authorization);
const contract = readJson(INPUTS.releaseContract);
const manifests = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest')).map(([key, filename]) => [key, readJson(filename)]));
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT),
'source intake is not the accepted immutable R09G post');
invariant(sha256(fs.readFileSync(abs(SOURCE_LEDGER))) === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT),
'source ledger is not the accepted R09G terminal');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && abs(sourceIdentity.directory) === abs(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(sha256(fs.readFileSync(abs(SOURCE_QA))) === EXPECTED.sourceQa
  && sourceQa.status === 'PASS_R09G_B07_PASSIVE_WAYFINDING_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayload,
'R09G independent post-release acceptance is absent or drifted');
for (const [key, expected] of [
  ['r02Manifest', EXPECTED.r02Manifest],
  ['r06Manifest', EXPECTED.r06Manifest], ['r07jManifest', EXPECTED.r07jManifest],
  ['r09eManifest', EXPECTED.r09eManifest], ['r09fManifest', EXPECTED.r09fManifest],
  ['r09gManifest', EXPECTED.r09gManifest],
]) invariant(manifests[key].manifestIdentity === expected, `${key} identity drifted`);
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
invariant(contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
  ?.canonicalOwners.includes('Z06-PUBLIC-SHAFT-FITOUT'),
'release contract does not bind the B07 fit-out owner');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R09G · B07 upper-stair passive wayfinding'),
'CURRENT-STATE does not accept R09G');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionHash
  && b07.interaction.length === 13608
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionHash,
'canonical B07 geometry drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const targets = [{ x: 2108, y: 62, z: -395 }, { x: 2109, y: 62, z: -395 }];
invariant(hashCells(targets) === EXPECTED.targetHash
  && targets.every((cell) => constructionKeys.has(cellKey(cell)) && interactionKeys.has(cellKey(cell))),
'exact target set or ownership drifted');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const readState = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const records = async (cells) => {
  const output = [];
  for (const cell of cells) output.push({ cell, state: await readState(cell) });
  return output;
};
const targetRecords = await records(targets);
invariant(targetRecords.every(({ state }) => state === CONTAINMENT),
'target source is not exact R09F polished-diorite containment');

const r09eLanding = targets.map(({ x, z }) => ({ x, y: 60, z }));
const landingVoid = targets.map(({ x, z }) => ({ x, y: 61, z }));
const retainedCeiling = targets.map(({ x, z }) => ({ x, y: 63, z }));
const r09fSteps = [
  { x: 2108, y: 61, z: -396, state: 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]', surfaceY2: 123 },
  { x: 2109, y: 61, z: -396, state: TOP_SLAB, surfaceY2: 124 },
];
invariant((await records(r09eLanding)).every(({ state }) => state === TOP_SLAB)
  && (await records(landingVoid)).every(({ state }) => AIR_NAMES.has(stateName(state)))
  && (await records(retainedCeiling)).every(({ state }) => state === CONTAINMENT),
'backed transition floor/void/ceiling state drifted');
for (const step of r09fSteps) invariant(await readState(step) === step.state, 'R09F transition step drifted');
const maximumExposedSurfaceDropHalfBlocks = Math.max(...r09fSteps.map(({ surfaceY2 }) => surfaceY2 - 122));
invariant(maximumExposedSurfaceDropHalfBlocks === 2,
'backed transition exceeds one full-block downward exposure');

// Rebuild the exact R09E/R09F clearance and containment boundary partition.
const outerRing = [];
for (let x = 2105; x <= 2111; x += 1) outerRing.push({ x, z: -401, ox: x, oz: -402 });
for (let z = -400; z <= -395; z += 1) outerRing.push({ x: 2111, z, ox: 2112, oz: z });
for (let x = 2110; x >= 2105; x -= 1) outerRing.push({ x, z: -395, ox: x, oz: -394 });
for (let z = -396; z >= -400; z -= 1) outerRing.push({ x: 2105, z, ox: 2104, oz: z });
const stairs = [];
for (let index = 0; index < 84; index += 1) {
  const point = outerRing[index % 24]; const y = 19 + Math.floor(index / 2);
  stairs.push({ cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz } });
}
for (let offset = 0; offset < 4; offset += 1) {
  const point = outerRing[(84 + offset) % 24];
  stairs.push({ cell: { x: point.x, y: 60, z: point.z }, outer: { x: point.ox, y: 60, z: point.oz } });
}
const innerRing = [];
for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
for (let step = 1; step <= 20; step += 1) {
  const point = innerRing[(step + 1) % 16]; const y = Math.floor((121 + step) / 2);
  stairs.push({ cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz } });
}
stairs.push(
  { cell: { x: 2109, y: 71, z: -397 }, outer: null },
  { cell: { x: 2108, y: 71, z: -397 }, outer: null },
  { cell: { x: 2108, y: 72, z: -398 }, outer: null },
);
const route = stairs.map(({ cell }) => cell);
const routeKeys = new Set(route.map(cellKey));
const clearance = uniqueCells(route.flatMap((cell) => [
  { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !routeKeys.has(cellKey(cell)));
const barrier = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z }, { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
invariant(route.length === 111 && clearance.length === 222 && barrier.length === 216
  && intersection(clearance, targets).length === 2 && intersection(barrier, targets).length === 2,
'route/clearance/barrier partition drifted');
const projectedClearance = [];
for (const cell of clearance) projectedClearance.push({
  cell, state: targets.some((target) => cellKey(target) === cellKey(cell)) ? AIR : await readState(cell),
});
invariant(projectedClearance.every(({ state }) => AIR_NAMES.has(stateName(state))),
'projected 222-cell clearance is not all air');
const projectedBarrier = [];
for (const cell of barrier) projectedBarrier.push({
  cell, state: targets.some((target) => cellKey(target) === cellKey(cell)) ? AIR : await readState(cell),
});
const collisionBarrier = projectedBarrier.filter(({ state }) => (
  FULL_SOLID_NAMES.has(stateName(state)) || GRAVITY_NAMES.has(stateName(state))
));
const backedApertures = projectedBarrier.filter(({ state }) => AIR_NAMES.has(stateName(state)));
invariant(collisionBarrier.length === 214 && backedApertures.length === 2
  && hashCells(backedApertures.map(({ cell }) => cell)) === EXPECTED.targetHash,
'projected barrier does not resolve to 214 solids plus two backed apertures');

const lowerDeck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
invariant((await records(lowerDeck)).every(({ state }) => state === CONTAINMENT),
'lower wet containment deck is not closed');
const r09gFixtures = manifests.r09gManifest.scope.fixtureAssociations.map(({ fixture }) => fixture);
invariant((await records(r09gFixtures)).every(({ state }) => state === LIGHT),
'accepted R09G fixtures drifted');

const gravityFaces = targets.map(({ x, y }) => ({ x, y, z: -394 }));
const gravitySupports = gravityFaces.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const gravitySecondSupports = gravityFaces.map(({ x, y, z }) => ({ x, y: y - 2, z }));
const gravityTerminals = gravityFaces.map(({ x, y, z }) => ({ x, y: y - 3, z }));
invariant((await records(gravityFaces)).every(({ state }) => state === 'minecraft:sand')
  && (await records(gravitySupports)).every(({ state }) => state === 'minecraft:sand')
  && (await records(gravitySecondSupports)).every(({ state }) => state === 'minecraft:sand')
  && (await records(gravityTerminals)).every(({ state }) => state === 'minecraft:dirt'),
'adjacent sand dependency chain is not exact and durably supported');
const gravitySupportKeys = new Set([
  ...gravitySupports, ...gravitySecondSupports, ...gravityTerminals,
].map(cellKey));
invariant(targets.every((cell) => !gravitySupportKeys.has(cellKey(cell))),
'target removes an adjacent gravity support');

const halo = cubeHalo(targets);
const haloRecords = await records(halo);
const haloFluid = haloRecords.filter(({ state }) => stateName(state) === 'minecraft:water'
  || stateName(state) === 'minecraft:lava' || state.includes('waterlogged=true'));
const haloGravity = haloRecords.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const haloMechanism = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateName(state)));
const haloWoody = haloRecords.filter(({ state }) => ['_log', '_wood', '_leaves', '_stem', '_hyphae']
  .some((suffix) => stateName(state).endsWith(suffix)));
const haloGravityDependencies = [];
const unsupportedHaloGravity = [];
for (const record of haloGravity) {
  let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  for (let depth = 0; depth < 16; depth += 1) {
    const supportState = await readState(support);
    haloGravityDependencies.push({ gravityCell: record.cell, support, supportState, depth: depth + 1 });
    if (!GRAVITY_NAMES.has(stateName(supportState))) {
      if (!FULL_SOLID_NAMES.has(stateName(supportState))) {
        unsupportedHaloGravity.push({ gravityCell: record.cell, support, supportState });
      }
      break;
    }
    support = { x: support.x, y: support.y - 1, z: support.z };
  }
}
invariant(halo.length === 36 && haloFluid.length === 0 && haloGravity.length === 6
  && unsupportedHaloGravity.length === 0
  && haloMechanism.length === 0 && haloWoody.length === 0,
`target halo hazard census drifted: cells=${halo.length} fluid=${haloFluid.length} gravity=${haloGravity.length} mechanism=${haloMechanism.length} woody=${haloWoody.length}`);
const haloBounds = boundsOf(halo);
const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) blockEntities.push(blockEntity);
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (x >= haloBounds.minX && x < haloBounds.maxX + 1
        && y >= haloBounds.minY && y < haloBounds.maxY + 1
        && z >= haloBounds.minZ && z < haloBounds.maxZ + 1) savedEntities.push(entity);
    }
  }
}
const relicHits = relics.relics.filter((relic) => targets.some((cell) => (
  cell.x >= relic.declaredInclusiveBounds.minX && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ && cell.z <= relic.declaredInclusiveBounds.maxZ
)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0,
'target intersects entity, block entity, or protected relic');

// Bind preservation to the predecessor's frozen provenance set, not to a live
// directory census. Unrelated compilers may publish new manifests while this
// release is being reviewed; those artifacts are not part of the accepted
// R09G physical source and must not change R09H's identity.
const predecessorPriorProof = manifests.r09gManifest.preservation?.acceptedPriorReleaseTargetProof;
invariant(Array.isArray(predecessorPriorProof) && predecessorPriorProof.length > 0,
'R09G predecessor does not expose a frozen prior-release provenance set');
const priorPaths = [...new Set([
  ...predecessorPriorProof.map(({ manifest }) => manifest?.path),
  INPUTS.r09gManifest,
])].filter((filename) => typeof filename === 'string').sort();
invariant(priorPaths.every((filename) => fs.existsSync(abs(filename))),
'R09G frozen prior-release provenance contains a missing manifest');
const priorProof = [];
const allPriorHits = [];
const unreviewedPriorHits = [];
const reviewedPriorTransactions = new Set([
  manifests.r02Manifest.transactionId,
  manifests.r09fManifest.transactionId,
]);
for (const filename of priorPaths) {
  const manifest = readJson(filename);
  const hits = uniqueCells((manifest.packages ?? []).flatMap(({ forward }) => (
    forward && fs.existsSync(abs(forward)) ? operationIntersection(forward, targets) : []
  )));
  allPriorHits.push(...hits);
  if (!reviewedPriorTransactions.has(manifest.transactionId)) unreviewedPriorHits.push(...hits);
  priorProof.push({ transactionId: manifest.transactionId, manifest: fileBinding(filename), targetIntersectionCount: hits.length });
}
const r02Hits = uniqueCells(manifests.r02Manifest.packages
  .flatMap(({ forward }) => operationIntersection(forward, targets)));
const r09fHits = uniqueCells(manifests.r09fManifest.packages
  .flatMap(({ forward }) => operationIntersection(forward, targets)));
invariant(uniqueCells(allPriorHits).length === 2 && uniqueCells(unreviewedPriorHits).length === 0
  && r02Hits.length === 2 && r09fHits.length === 2,
'prior overlap is not exactly the reviewed R02-to-R09F correction chain');

const forwardBody = `${targetRecords.map(({ cell, state }) => replLine(cell, state, AIR)).join('\n')}\n`;
const rollbackBody = `${targetRecords.slice().reverse().map(({ cell, state }) => replLine(cell, AIR, state)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(targets)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const entityReport = {
  schemaVersion: 1,
  id: 'combined-zones-r09h-b07-transition-clearance-correction-immutable-entity-clearance',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  snapshotRoot: rel(SNAPSHOT),
  reviewBounds: haloBounds,
  targetCellCount: targets.length,
  interactionHaloCellCount: halo.length,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  liveEntityClearanceStillRequiredByWrapper: true,
  liveCallPerformed: false,
};
fs.mkdirSync(path.dirname(abs(ENTITY_REPORT)), { recursive: true });
fs.writeFileSync(abs(ENTITY_REPORT), `${JSON.stringify(entityReport, null, 2)}\n`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R09G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT', 'P1-B07-R09E-R09F-TRANSITION-CLEARANCE'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY],
    rationale: 'Clear only the two exact R09F containment cells that conflict with R09E headroom; exact reverse rollback restores the prior fail-closed state.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Correct the exact two-cell R09E/R09F clearance conflict while retaining a floor-backed internal transition, durable gravity support, exterior closure, and lower wet separation.',
    geometry: {
      exactTwoCellCorrection: classManifest(targets),
      acceptedOrderedStairConstruction: classManifest(route),
      projectedCompleteHeadClearance: { ...classManifest(clearance), projectedAirCellCount: 222 },
      projectedFallBoundary: {
        ...classManifest(barrier),
        retainedCollisionBarrierCellCount: collisionBarrier.length,
        exactFloorBackedInternalApertureCellCount: backedApertures.length,
        exactFloorBackedInternalApertures: classManifest(backedApertures.map(({ cell }) => cell)),
      },
      transitionBackingFloors: classManifest(r09eLanding),
      transitionLowerVoid: classManifest(landingVoid),
      retainedTransitionCeiling: classManifest(retainedCeiling),
      adjacentR09fSteps: classManifest(r09fSteps),
      retainedLowerWetContainmentDeck: classManifest(lowerDeck),
      retainedR09gFixtures: classManifest(r09gFixtures),
    },
    transitionSafety: {
      orderedPrimarySeamRiseHalfBlocks: 1,
      maximumFloorBackedLateralSurfaceDropHalfBlocks: maximumExposedSurfaceDropHalfBlocks,
      maximumFloorBackedLateralSurfaceDropBlocks: maximumExposedSurfaceDropHalfBlocks / 2,
      everyClearedCellHasExactTopSlabFloorTwoBlocksBelow: true,
      everyClearedCellHasExactAirLowerVoid: true,
      everyClearedCellHasRetainedFullCubeCeiling: true,
      fallToUnflooredVoidCreated: false,
      exteriorOpeningCreated: false,
    },
    ownership: {
      canonicalB07ConstructionCellCount: b07.construction.length,
      canonicalB07ConstructionSha256: EXPECTED.b07ConstructionHash,
      canonicalB07InteractionCellCount: b07.interaction.length,
      canonicalB07InteractionSha256: EXPECTED.b07InteractionHash,
      targetConstructionCellCount: targets.length,
      targetOutsideInteractionCellCount: 0,
      reviewedR09fContainmentCorrectionCellCount: targets.length,
      reviewedR02ExcavationRestorationCellCount: r02Hits.length,
      unreviewedPriorTargetIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    },
    operationalBoundary: {
      exactTwoCellClearanceConflictResolved: true,
      lowerWetInterfaceOpened: false,
      r07jExteriorWallRoofOrDoorChanged: false,
      exteriorOpeningCreated: false,
      mechanismOrFixtureChanged: false,
      powerControlsSmokeDrainageLiftTouched: false,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      routeCommissioningRequiresSeparateFunctionalPostAcceptance: true,
    },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      postQa: fileBinding(SOURCE_QA),
      postQaPayloadSha256: sourceQa.qaPayloadSha256,
    },
    sourceStateCensus: stateCensus(targetRecords),
    immutableEntityClearance: fileBinding(ENTITY_REPORT),
  },
  target: {
    operatedUnion: classManifest(targets),
    desiredStateCensus: { [AIR]: targets.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256, rollbackSha256,
      forwardCommandCount: targets.length, rollbackCommandCount: targets.length,
      targetCellCount: targets.length, targetCoordinateSetSha256: hashCells(targets),
      sourceStateCensus: stateCensus(targetRecords), desiredStateCensus: { [AIR]: targets.length },
      exactInverse: true, reverseOrderInverse: true, oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    reviewedR02ExcavationRestoration: classManifest(r02Hits),
    reviewedR09fContainmentCorrection: classManifest(targets),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    retainedR09gFixtures: classManifest(r09gFixtures),
    retainedLowerWetContainmentDeck: classManifest(lowerDeck),
    adjacentGravityFaces: { ...classManifest(gravityFaces), sourceStateCensus: stateCensus(await records(gravityFaces)) },
    durableGravitySupportChain: classManifest(haloGravityDependencies.map(({ support }) => support)),
    gravitySupportRemovalCount: 0,
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) },
    targetFluidCount: 0,
    haloFluidCount: haloFluid.length,
    haloGravityCount: haloGravity.length,
    supportedHaloGravityCount: haloGravity.length,
    unsupportedHaloGravityCount: unsupportedHaloGravity.length,
    gravitySupportRemovalCount: 0,
    haloActiveMechanismCount: haloMechanism.length,
    haloWoodyCount: haloWoody.length,
    haloBlockEntityCount: blockEntities.length,
    haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    targetToAirOnly: true,
    projectedClearanceComplete: true,
    projectedFallBoundarySafeByCollisionOrBackedTransition: true,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.authorization), authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: Object.fromEntries(Object.entries(INPUTS)
    .filter(([key]) => key !== 'currentState').map(([key, filename]) => [key, fileBinding(filename)])),
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight', 'fresh live entity clearance',
    'strict parser checks', 'journaled strict execution', 'fresh post and rollback preflight',
    'independent 222-cell clearance, 214-plus-2 boundary, gravity, route, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    exteriorOrWetInterfaceOpened: false,
    publicOrFireServiceRouteCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: payload.status, manifest: rel(manifestPath), manifestIdentity,
  targets: targets.length, projectedClearanceAir: projectedClearance.length,
  projectedCollisionBarrier: collisionBarrier.length, backedTransitionApertures: backedApertures.length,
  haloCells: halo.length, supportedHaloGravity: haloGravity.length,
  liveCallsPerformed: false,
}, null, 2)}\n`);
