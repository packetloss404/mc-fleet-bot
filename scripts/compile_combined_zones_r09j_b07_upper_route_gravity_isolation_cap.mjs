#!/usr/bin/env node
/** Compile CZ-R09J: exact two-cell B07 upper-route gravity isolation cap. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T02:35:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r09h-post-20260822T022248Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/evidence-ledger.json',
);
const SOURCE_QA = value(
  '--source-qa',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09h-post-release-qa.json',
);
const COMMISSIONING_BLOCKER = value(
  '--commissioning-blocker',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09i-b07-enclosed-dry-upper-route-commissioning-blocker.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r09j-b07-upper-route-gravity-isolation-cap',
);
const ENTITY_REPORT = value(
  '--entity-report',
  'data/world-review/combined-zones-r09j-b07-upper-route-gravity-isolation-cap-offline-20260822T023500Z/immutable-entity-clearance.json',
);
const RELEASE_ID = 'CZ-R09J-P1-B07-UPPER-ROUTE-GRAVITY-ISOLATION-CAP';
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-upper-route-gravity-isolation-cap';
const AIR = 'minecraft:air';
const CONTAINMENT = 'minecraft:polished_diorite';
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:granite',
  'minecraft:diorite', 'minecraft:andesite', 'minecraft:deepslate', 'minecraft:tuff',
  'minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:coal_ore',
  'minecraft:polished_andesite', CONTAINMENT, 'minecraft:sea_lantern',
]);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch',
  'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator',
  'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper',
]);
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
  r09gManifest: 'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
  r09hManifest: 'data/buildops/combined-zones-r09h-b07-transition-clearance-correction.release-manifest.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: 'ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684',
  sourceRegion: 'e3690299faa02ae153600028e1b276e1b6bdd844aff0a6037798be3b13484b8b',
  sourceLedger: '224c6075450e1e1b3ed259c723ae3c4152687e4ff5d3a71f7493ea25c1856ae8',
  sourceCompleted: 'dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5',
  sourceQa: '4fa5d36d01317e1803a4eb14c3a5e138e61633ccacc6078bca95056d4a76f8e8',
  sourceQaPayload: '798da0552e482a230f98047b36be294b936ae96d8c3ef1c29ee2a36038ef1a47',
  blocker: '9e6503ac12db59d3bea5d56d1bd8bbaa7c8524f389f01967605e6082069b708c',
  blockerIdentity: 'e05264b91ddf7dbeb5b4247a443ca22b94907bbacf12a602e67c2e81f31b751b',
  r09hManifest: 'bd6956937446fa89b119df85e6daca21415ff2892f72195966d8d0d0259904e4',
  r02Manifest: 'd880ccfe4a2a70c7be91f4a0d2e9462df131ff8b160650097cf85db68d7db88b',
  b07ConstructionHash: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionHash: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  targetHash: '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09J gravity-isolation compiler rejected: ${message}`);
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
function buildStairs(topAnchor) {
  const outerRing = [];
  for (let x = 2105; x <= 2111; x += 1) outerRing.push({ x, z: -401, ox: x, oz: -402 });
  for (let z = -400; z <= -395; z += 1) outerRing.push({ x: 2111, z, ox: 2112, oz: z });
  for (let x = 2110; x >= 2105; x -= 1) outerRing.push({ x, z: -395, ox: x, oz: -394 });
  for (let z = -396; z >= -400; z -= 1) outerRing.push({ x: 2105, z, ox: 2104, oz: z });
  const stairs = [];
  for (let index = 0; index < 84; index += 1) {
    const point = outerRing[index % 24]; const y = 19 + Math.floor(index / 2);
    stairs.push({ index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2) });
  }
  for (let offset = 0; offset < 4; offset += 1) {
    const index = 84 + offset; const point = outerRing[index % 24];
    stairs.push({ index, cell: { x: point.x, y: 60, z: point.z }, outer: { x: point.ox, y: 60, z: point.oz }, surfaceY2: 122 });
  }
  const innerRing = [];
  for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
  for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
  for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
  for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
  for (let step = 1; step <= 20; step += 1) {
    const point = innerRing[(step + 1) % 16]; const surfaceY2 = 122 + step;
    stairs.push({ index: 87 + step, cell: { x: point.x, y: Math.floor((surfaceY2 - 1) / 2), z: point.z }, outer: { x: point.ox, y: Math.floor((surfaceY2 - 1) / 2), z: point.oz }, surfaceY2 });
  }
  const approach = [{ x: 2109, y: 71, z: -397 }, { x: 2108, y: 71, z: -397 }, topAnchor];
  for (let offset = 0; offset < 3; offset += 1) stairs.push({ index: 108 + offset, cell: approach[offset], outer: null, surfaceY2: 143 + offset });
  return stairs;
}
function reachable(nodes, startKey) {
  const byKey = new Map(nodes.map((node) => [cellKey(node.cell), node]));
  const seen = new Set([startKey]);
  const queue = [startKey];
  while (queue.length > 0) {
    const current = byKey.get(queue.shift());
    for (const candidate of nodes) {
      const key = cellKey(candidate.cell);
      if (seen.has(key)) continue;
      const dx = Math.abs(candidate.cell.x - current.cell.x);
      const dz = Math.abs(candidate.cell.z - current.cell.z);
      if (Math.max(dx, dz) !== 1 || Math.abs(candidate.surfaceY2 - current.surfaceY2) > 2) continue;
      seen.add(key); queue.push(key);
    }
  }
  return nodes.filter((node) => seen.has(cellKey(node.cell)));
}

const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const blocker = readJson(COMMISSIONING_BLOCKER);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
const mechanisms = readJson(INPUTS.mechanisms);
const relics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.authorization);
const contract = readJson(INPUTS.releaseContract);
const manifests = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest')).map(([key, filename]) => [key, readJson(filename)]));
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT),
'source intake is not the accepted immutable R09H post');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT),
'source ledger is not accepted R09H');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && abs(sourceIdentity.directory) === abs(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(fileBinding(SOURCE_QA).sha256 === EXPECTED.sourceQa
  && sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayload
  && sourceQa.status === 'PASS_R09H_B07_TRANSITION_CLEARANCE_POSTSTATE_VERIFIED_REVERSIBLE',
'R09H independent QA is absent or drifted');
invariant(fileBinding(COMMISSIONING_BLOCKER).sha256 === EXPECTED.blocker
  && blocker.blockerIdentitySha256 === EXPECTED.blockerIdentity
  && blocker.status === 'BLOCKED_R09I_FULL_B07_UPPER_ROUTE_UNSUPPORTED_GRAVITY_BOUNDARY',
'full-route gravity blocker is absent or drifted');
invariant(manifests.r09hManifest.manifestIdentity === EXPECTED.r09hManifest,
'R09H manifest identity drifted');
invariant(manifests.r02Manifest.manifestIdentity === EXPECTED.r02Manifest,
'R02 manifest identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
invariant(contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
  ?.canonicalOwners.includes('Z06-PUBLIC-SHAFT-FITOUT'),
'release contract does not bind B07 owner');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionHash
  && b07.interaction.length === 13608
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionHash,
'canonical B07 geometry drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const targets = [{ x: 2105, y: 30, z: -397 }, { x: 2105, y: 31, z: -397 }];
invariant(hashCells(targets) === EXPECTED.targetHash
  && targets.every((cell) => constructionKeys.has(cellKey(cell)) && interactionKeys.has(cellKey(cell))),
'target ownership or exact geometry drifted');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const readState = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const records = async (cells) => {
  const output = [];
  for (const cell of cells) output.push({ cell, state: await readState(cell) });
  return output;
};
const targetRecords = await records(targets);
invariant(targetRecords.every(({ state }) => AIR_NAMES.has(stateName(state))),
'target source is not exact air');

const stairs = buildStairs(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.anchors.top);
const blocked = stairs[20];
const lowerSegment = stairs.slice(0, 20);
const upperHold = { cell: { x: 2108, y: 72, z: -399 }, surfaceY2: 146, role: 'upper-hold' };
const upperSegment = [...stairs.slice(21).map((entry) => ({ ...entry, role: 'upper-route' })), upperHold];
invariant(blocked.cell.x === 2105 && blocked.cell.y === 29 && blocked.cell.z === -397
  && hashCells(targets) === hashCells([
    { x: blocked.cell.x, y: blocked.cell.y + 1, z: blocked.cell.z },
    { x: blocked.cell.x, y: blocked.cell.y + 2, z: blocked.cell.z },
  ]) && lowerSegment.length === 20 && upperSegment.length === 91,
'isolation partition drifted');
const graphNodes = [...lowerSegment.map((entry) => ({ ...entry, role: 'excluded-lower' })), ...upperSegment];
const reachableUpper = reachable(graphNodes, cellKey(upperHold.cell));
invariant(reachableUpper.length === 91 && reachableUpper.every(({ role }) => role !== 'excluded-lower'),
'two-cell cap does not isolate the upper segment under permissive diagonal reachability');

const upperRouteKeys = new Set(upperSegment.map(({ cell }) => cellKey(cell)));
const upperClearance = uniqueCells(upperSegment.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !upperRouteKeys.has(cellKey(cell)));
invariant(intersection(upperClearance, targets).length === 0,
'cap intrudes into retained upper-route clearance');
const upperBoundary = uniqueCells(stairs.slice(21).flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z }, { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const upperBoundaryRecords = await records(upperBoundary);
const upperBoundaryGravity = upperBoundaryRecords.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const unsupportedUpperGravity = [];
for (const record of upperBoundaryGravity) {
  let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  let terminal = null;
  for (let depth = 1; depth <= 32; depth += 1) {
    const supportState = await readState(support);
    if (!GRAVITY_NAMES.has(stateName(supportState))) { terminal = { cell: support, state: supportState, depth }; break; }
    support = { ...support, y: support.y - 1 };
  }
  if (!terminal || !FULL_SOLID_NAMES.has(stateName(terminal.state))) unsupportedUpperGravity.push({ cell: record.cell, terminal });
}
invariant(unsupportedUpperGravity.length === 0,
'retained upper segment still depends on unsupported gravity');

const faceAdjacent = [];
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
for (const target of targets) {
  for (const [dx, dy, dz] of directions) {
    const cell = { x: target.x + dx, y: target.y + dy, z: target.z + dz };
    faceAdjacent.push({ cell, state: await readState(cell) });
  }
}
const faceAdjacentGravity = faceAdjacent.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const halo = cubeHalo(targets);
const haloRecords = await records(halo);
const haloFluid = haloRecords.filter(({ state }) => stateName(state) === 'minecraft:water'
  || stateName(state) === 'minecraft:lava' || state.includes('waterlogged=true'));
const haloGravity = haloRecords.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const haloMechanism = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateName(state)));
invariant(halo.length === 36 && haloFluid.length === 0 && faceAdjacentGravity.length === 0
  && haloMechanism.length === 0,
'cap halo has fluid, face-adjacent gravity, or mechanism hazard');

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

const predecessorPriorProof = manifests.r09hManifest.preservation?.acceptedPriorReleaseTargetProof;
invariant(Array.isArray(predecessorPriorProof) && predecessorPriorProof.length > 0,
'R09H does not expose frozen prior provenance');
const priorPaths = [...new Set([
  ...predecessorPriorProof.map(({ manifest }) => manifest?.path), INPUTS.r09hManifest,
])].filter((filename) => typeof filename === 'string').sort();
const priorProof = [];
const priorHits = [];
const unreviewedPriorHits = [];
for (const filename of priorPaths) {
  invariant(fs.existsSync(abs(filename)), `missing frozen prior manifest ${filename}`);
  const priorManifest = readJson(filename);
  const hits = uniqueCells((priorManifest.packages ?? []).flatMap(({ forward }) => (
    forward && fs.existsSync(abs(forward)) ? operationIntersection(forward, targets) : []
  )));
  priorHits.push(...hits);
  if (priorManifest.transactionId !== manifests.r02Manifest.transactionId) {
    unreviewedPriorHits.push(...hits);
  }
  priorProof.push({ transactionId: priorManifest.transactionId, manifest: fileBinding(filename), targetIntersectionCount: hits.length });
}
invariant(uniqueCells(priorHits).length === 2 && uniqueCells(unreviewedPriorHits).length === 0,
'isolation cap overlap is not exactly the reviewed R02 air reservation');

const forwardBody = `${targetRecords.map(({ cell, state }) => replLine(cell, state, CONTAINMENT)).join('\n')}\n`;
const rollbackBody = `${targetRecords.slice().reverse().map(({ cell, state }) => replLine(cell, CONTAINMENT, state)).join('\n')}\n`;
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
  id: 'combined-zones-r09j-b07-upper-route-gravity-isolation-cap-immutable-entity-clearance',
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
  status: 'COMPILED_FROM_ACCEPTED_R09H_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT', 'P1-B07-R09J-GRAVITY-ISOLATION-CAP'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY],
    rationale: 'Install one exact two-cell collision cap above stair index 20; reverse order restores the two air cells without touching or updating the inherited floating-gravity columns.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Fail-close below the inherited unsupported-gravity boundary so the disjoint upper route can be commissioned after exact post acceptance.',
    geometry: {
      isolationCap: classManifest(targets),
      blockedStairIndex: 20,
      excludedUnsupportedBoundaryStairIndex: 19,
      excludedLowerStairIndexRange: { min: 0, max: 20, cellCount: 21 },
      retainedUpperStairIndexRange: { min: 21, max: 110, stairCellCount: 90 },
      retainedUpperRouteWithHeadhouseHold: classManifest(upperSegment.map(({ cell }) => cell)),
      retainedUpperHeadClearance: classManifest(upperClearance),
      retainedUpperFallBoundary: classManifest(upperBoundary),
    },
    isolationProof: {
      conservativeGraphPolicy: 'EIGHT_NEIGHBOUR_WITH_ABSOLUTE_MAXIMUM_ONE_BLOCK_SURFACE_STEP',
      reachableUpperSurfaceCount: reachableUpper.length,
      reachableExcludedLowerSurfaceCount: reachableUpper.filter(({ role }) => role === 'excluded-lower').length,
      capTargetIntersectionWithUpperClearanceCount: intersection(upperClearance, targets).length,
      upperBoundaryGravityCellCount: upperBoundaryGravity.length,
      unsupportedUpperBoundaryGravityCellCount: unsupportedUpperGravity.length,
    },
    operationalBoundary: {
      fullUpperRouteCommissioned: false,
      retainedUpperSegmentCommissioned: false,
      postReleaseFunctionalCommissioningRequired: true,
      lowerWetInterfaceOpened: false,
      exteriorOpeningCreated: false,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      mechanismOrFixtureChanged: false,
      unsupportedGravityTouchedOrSupported: false,
    },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      postQa: fileBinding(SOURCE_QA),
      postQaPayloadSha256: sourceQa.qaPayloadSha256,
      commissioningBlocker: fileBinding(COMMISSIONING_BLOCKER),
      commissioningBlockerIdentitySha256: blocker.blockerIdentitySha256,
    },
    sourceStateCensus: stateCensus(targetRecords),
    immutableEntityClearance: fileBinding(ENTITY_REPORT),
  },
  target: {
    operatedUnion: classManifest(targets),
    desiredStateCensus: { [CONTAINMENT]: targets.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256, rollbackSha256,
      forwardCommandCount: targets.length, rollbackCommandCount: targets.length,
      targetCellCount: targets.length, targetCoordinateSetSha256: hashCells(targets),
      sourceStateCensus: stateCensus(targetRecords),
      desiredStateCensus: { [CONTAINMENT]: targets.length },
      exactInverse: true, reverseOrderInverse: true, oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    reviewedR02AirReservationRestoration: classManifest(priorHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    inheritedUnsupportedBoundaryCells: blocker.exactBlocker.affectedBoundaryCells,
    unsupportedGravityTargetIntersectionCount: 0,
    unsupportedGravitySupportCellTargetIntersectionCount: 0,
    faceAdjacentGravityCellCount: faceAdjacentGravity.length,
    retainedUpperBoundary: classManifest(upperBoundary),
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) },
    targetFluidCount: 0,
    haloFluidCount: haloFluid.length,
    haloGravityCount: haloGravity.length,
    faceAdjacentGravityCount: faceAdjacentGravity.length,
    gravitySupportRemovalCount: 0,
    haloActiveMechanismCount: haloMechanism.length,
    haloBlockEntityCount: blockEntities.length,
    haloSavedEntityCount: savedEntities.length,
    targetProtectedRelicCount: relicHits.length,
    exactAirToFullCubeContainmentOnly: true,
    rollbackRestoresAirWithoutRemovingGravitySupport: true,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: Object.fromEntries(Object.entries(INPUTS)
    .filter(([key]) => key !== 'currentState').map(([key, filename]) => [key, fileBinding(filename)])),
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight', 'fresh live entity clearance',
    'strict parser checks', 'journaled strict execution', 'fresh post and rollback preflight',
    'independent cap, gravity isolation, upper segment, no-drift, and rollback QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    fullRouteCommissioned: false,
    retainedUpperSegmentCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: payload.status, manifest: rel(manifestPath), manifestIdentity,
  targets: targets.length, retainedUpperSurfaces: upperSegment.length,
  retainedUpperClearance: upperClearance.length, retainedUpperBoundary: upperBoundary.length,
  upperBoundaryGravity: upperBoundaryGravity.length,
  unsupportedUpperBoundaryGravity: unsupportedUpperGravity.length,
  liveCallsPerformed: false,
}, null, 2)}\n`);
