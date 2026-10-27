#!/usr/bin/env node
/** Independent read-only R09J post-release QA and upper-segment isolation seal. */

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
const EVIDENCE = value('--evidence-dir', 'data/world-review/combined-zones-r09j-live-20260822T025021Z');
const LEDGER = value('--ledger', path.join(EVIDENCE, 'evidence-ledger.json'));
const MANIFEST = value('--manifest', 'data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json');
const OUT = value('--out', path.join(EVIDENCE, 'r09j-post-release-qa.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE, 'r09j-post-release-qa.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:55:00Z');
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  r09gManifest: 'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledger: 'ea89c16e664efa2981b70da07d783d800f4cf9e3bd0f26625ffeaf58e4d7aa7d',
  manifestFile: 'ccc587f4b67cb5b6a17bd7639758ae4c4fa0eb3aecbe797312c89572e690f4a2',
  manifestIdentity: 'c6bcf5546abfd9aaceb24d3e0ee70b4b57cb07e47be800baa08478a1ad2306a1',
  sourceBound: 'c178dfd66dafee697ea931b9bb5f4066bf45c1bc2b28b72e0a84cf0ce849f5fe',
  completed: '0c722e3ac473ab22239bba599bbab8c1b9776f727212442bf9a044c40494a47d',
  sourceComplete: '73b8225530b896fa68b560a16473acaee2bd9f3faede0fd46ccb64e68e0d21a9',
  sourceRegion: '55f23ce92032c7394fa044063c94e50752f75b606cf9d8b635513cf0498b9203',
  postComplete: '81cf43e16f60b875e5e4eb5f50df0f43487ed9b3fd2f52e7883b22e2147c5132',
  postRegion: '072bfa045bbc55b457585bd6725159cc97a4650b73e7769b4f977a2972682067',
  forwardFile: '24420c10834e83778e17ba77d029bc6591cd6cd4acc469d38bd0ad3e4decdc5f',
  rollbackFile: '4d1a0ea18ac52a90f1909f11d4155b2e9cb09e2bf68dc0a830ee8ff2d45e7a05',
  targets: '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b',
  construction: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  interaction: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
});
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:granite',
  'minecraft:diorite', 'minecraft:andesite', 'minecraft:deepslate', 'minecraft:tuff',
  'minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:coal_ore',
  'minecraft:polished_andesite', 'minecraft:polished_diorite', 'minecraft:sea_lantern',
]);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch',
  'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator',
  'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper',
]);

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09J post-release QA rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const cubeHalo = (cells) => uniqueCells(cells.flatMap(({ x, y, z }) => {
  const output = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) output.push({ x: x + dx, y: y + dy, z: z + dz });
  }
  return output;
}));

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const numbers = fields.slice(1, 7).map(Number);
    for (let x = Math.min(numbers[0], numbers[3]); x <= Math.max(numbers[0], numbers[3]); x += 1) {
      for (let y = Math.min(numbers[1], numbers[4]); y <= Math.max(numbers[1], numbers[4]); y += 1) {
        for (let z = Math.min(numbers[2], numbers[5]); z <= Math.max(numbers[2], numbers[5]); z += 1) {
          records.push({ cell: { x, y, z }, sourceState: fields[7], targetState: fields[8] });
        }
      }
    }
  }
  return records;
}

function buildStairs(topAnchor) {
  const outerRing = [];
  for (let x = 2105; x <= 2111; x += 1) outerRing.push({ x, z: -401, ox: x, oz: -402 });
  for (let z = -400; z <= -395; z += 1) outerRing.push({ x: 2111, z, ox: 2112, oz: z });
  for (let x = 2110; x >= 2105; x -= 1) outerRing.push({ x, z: -395, ox: x, oz: -394 });
  for (let z = -396; z >= -400; z -= 1) outerRing.push({ x: 2105, z, ox: 2104, oz: z });
  const stairs = [];
  for (let index = 0; index < 84; index += 1) {
    const point = outerRing[index % 24];
    const y = 19 + Math.floor(index / 2);
    const surfaceY2 = (2 * y) + (index % 2 === 0 ? 1 : 2);
    stairs.push({ index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1 ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]' : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]' });
  }
  for (let offset = 0; offset < 4; offset += 1) {
    const index = 84 + offset; const point = outerRing[index % 24];
    stairs.push({ index, cell: { x: point.x, y: 60, z: point.z }, outer: { x: point.ox, y: 60, z: point.oz }, surfaceY2: 122,
      targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]' });
  }
  const innerRing = [];
  for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
  for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
  for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
  for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
  for (let step = 1; step <= 20; step += 1) {
    const index = 87 + step; const point = innerRing[(step + 1) % 16]; const surfaceY2 = 122 + step;
    stairs.push({ index, cell: { x: point.x, y: Math.floor((surfaceY2 - 1) / 2), z: point.z },
      outer: { x: point.ox, y: Math.floor((surfaceY2 - 1) / 2), z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1 ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]' : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]' });
  }
  const approach = [{ x: 2109, y: 71, z: -397 }, { x: 2108, y: 71, z: -397 }, topAnchor];
  for (let offset = 0; offset < 3; offset += 1) {
    const surfaceY2 = 143 + offset;
    stairs.push({ index: 108 + offset, cell: approach[offset], outer: null, surfaceY2,
      targetState: surfaceY2 % 2 === 1 ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]' : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]' });
  }
  return stairs;
}

function reachable(nodes, startKey) {
  const byKey = new Map(nodes.map((node) => [cellKey(node.cell), node]));
  const seen = new Set([startKey]); const queue = [startKey];
  while (queue.length) {
    const current = byKey.get(queue.shift());
    for (const candidate of nodes) {
      const key = cellKey(candidate.cell); if (seen.has(key)) continue;
      const dx = Math.abs(candidate.cell.x - current.cell.x); const dz = Math.abs(candidate.cell.z - current.cell.z);
      if (Math.max(dx, dz) !== 1 || Math.abs(candidate.surfaceY2 - current.surfaceY2) > 2) continue;
      seen.add(key); queue.push(key);
    }
  }
  return nodes.filter((node) => seen.has(cellKey(node.cell)));
}

const ledger = readJson(LEDGER);
const manifest = readJson(MANIFEST);
const mechanisms = readJson(INPUTS.mechanisms);
const r09g = readJson(INPUTS.r09gManifest);
const ledgerBinding = fileBinding(LEDGER);
const manifestBinding = fileBinding(MANIFEST);
invariant(ledgerBinding.sha256 === EXPECTED.ledger && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE' && ledger.stages.length === 17 && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17, 'ledger identity/stages drifted');
invariant(ledger.manifest.sha256 === EXPECTED.manifestFile && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.transactionId === manifest.transactionId && ledger.releaseNodeId === manifest.releaseNodeId,
'ledger/manifest binding drifted');
const manifestPayload = { ...manifest }; delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)), 'manifest identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postComplete
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion,
'immutable source/post identity drifted');
const bindingFailures = ledger.evidenceBindings.filter((entry) => (
  !fs.existsSync(abs(entry.path)) || fileBinding(entry.path).sha256 !== entry.sha256 || fileBinding(entry.path).bytes !== entry.bytes
));
const sourceBound = sha256(JSON.stringify({ executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256, sourceRegionSha256: sourceIdentity.sha256 }));
const completed = sha256(JSON.stringify({ sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256, postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(({ path: reportPath, sha256: reportSha }) => ({ path: reportPath, sha256: reportSha })),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)) }));
invariant(bindingFailures.length === 0 && sourceBound === EXPECTED.sourceBound && ledger.sourceBoundReleaseIdentitySha256 === sourceBound
  && completed === EXPECTED.completed && ledger.completedReleaseIdentitySha256 === completed, 'execution evidence identity drifted');

const pkg = manifest.packages[0];
const forward = parseOperations(pkg.forward); const rollback = parseOperations(pkg.rollback);
const targets = forward.map(({ cell }) => cell); const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === 2 && rollback.length === 2 && hashCells(targets) === EXPECTED.targets
  && fileBinding(pkg.forward).sha256 === EXPECTED.forwardFile && fileBinding(pkg.rollback).sha256 === EXPECTED.rollbackFile
  && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({ cell: entry.cell, sourceState: entry.targetState, targetState: entry.sourceState }))),
'operation/inverse identity drifted');
const sourceReader = new AnvilReader(abs(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'region')));
const sourceEntityReader = new AnvilReader(abs(path.join(ledger.sourceSnapshot.root, 'entities')));
const postEntityReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'entities')));
const state = async (reader, cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetResults = [];
for (const entry of forward) targetResults.push({ ...entry, sourceObserved: await state(sourceReader, entry.cell), postObserved: await state(postReader, entry.cell) });
invariant(targetResults.every((entry) => entry.sourceState === 'minecraft:air' && entry.targetState === 'minecraft:polished_diorite'
  && entry.sourceObserved === entry.sourceState && entry.postObserved === entry.targetState), 'exact cap post-state failed');

const stairs = buildStairs(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.anchors.top);
const lower = stairs.slice(0, 20).map((entry) => ({ ...entry, role: 'excluded-lower' }));
const upperHold = { cell: { x: 2108, y: 72, z: -399 }, surfaceY2: 146, role: 'upper-hold', targetState: 'minecraft:polished_diorite' };
const upper = [...stairs.slice(21).map((entry) => ({ ...entry, role: 'upper-route' })), upperHold];
const reachableUpper = reachable([...lower, ...upper], cellKey(upperHold.cell));
invariant(stairs.length === 111 && upper.length === 91 && reachableUpper.length === 91
  && reachableUpper.every(({ role }) => role !== 'excluded-lower'), 'upper graph is not exact or isolated');
const surfaceFailures = [];
for (const entry of upper) {
  const observed = await state(postReader, entry.cell);
  if (observed !== entry.targetState) surfaceFailures.push({ ...entry, observed });
}
const upperKeys = new Set(upper.map(({ cell }) => cellKey(cell)));
const clearance = uniqueCells(upper.flatMap(({ cell }) => [{ x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z }]))
  .filter((cell) => !upperKeys.has(cellKey(cell)));
const clearanceFailures = [];
for (const cell of clearance) { const observed = await state(postReader, cell); if (!AIR_NAMES.has(stateName(observed))) clearanceFailures.push({ cell, observed }); }
const boundary = uniqueCells(stairs.slice(21).flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z }, { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const boundaryResults = [];
for (const cell of boundary) boundaryResults.push({ cell, observed: await state(postReader, cell) });
const gravityBoundary = boundaryResults.filter(({ observed }) => GRAVITY_NAMES.has(stateName(observed)));
const collisionBoundary = boundaryResults.filter(({ observed }) => (
  FULL_SOLID_NAMES.has(stateName(observed)) || GRAVITY_NAMES.has(stateName(observed))
));
const backedApertures = boundaryResults.filter(({ observed }) => AIR_NAMES.has(stateName(observed)));
for (const { cell } of backedApertures) {
  invariant(await state(postReader, { ...cell, y: cell.y - 2 })
    === 'minecraft:smooth_stone_slab[type=top,waterlogged=false]', 'upper boundary aperture floor drifted');
  invariant(AIR_NAMES.has(stateName(await state(postReader, { ...cell, y: cell.y - 1 }))),
    'upper boundary aperture lower void drifted');
  invariant(await state(postReader, { ...cell, y: cell.y + 1 }) === 'minecraft:polished_diorite',
    'upper boundary aperture ceiling drifted');
}
const unsupportedGravity = [];
for (const entry of gravityBoundary) {
  let cursor = { ...entry.cell, y: entry.cell.y - 1 }; let terminal = null;
  for (let depth = 1; depth <= 32; depth += 1) {
    const observed = await state(postReader, cursor);
    if (!GRAVITY_NAMES.has(stateName(observed))) { terminal = { cell: cursor, observed, depth }; break; }
    cursor = { ...cursor, y: cursor.y - 1 };
  }
  if (!terminal || !FULL_SOLID_NAMES.has(stateName(terminal.observed))) unsupportedGravity.push({ ...entry, terminal });
}
invariant(surfaceFailures.length === 0 && clearance.length === 182 && clearanceFailures.length === 0
  && boundary.length === 174 && collisionBoundary.length === 172 && backedApertures.length === 2
  && hashCells(backedApertures.map(({ cell }) => cell)) === '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10'
  && gravityBoundary.length === 8 && unsupportedGravity.length === 0,
'surface/clearance/172-plus-2-boundary/support proof failed');

const inheritedUnsupported = [{ x: 2104, y: 29, z: -396 }, { x: 2104, y: 30, z: -396 }];
const inheritedSupport = { x: 2104, y: 26, z: -396 };
for (const cell of inheritedUnsupported) invariant(await state(sourceReader, cell) === 'minecraft:gravel'
  && await state(postReader, cell) === 'minecraft:gravel', 'inherited unsupported gravel changed');
invariant(AIR_NAMES.has(stateName(await state(sourceReader, inheritedSupport)))
  && AIR_NAMES.has(stateName(await state(postReader, inheritedSupport))), 'unsupported gravel terminal air changed');
const lowerDeck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
const walls = [];
for (let y = 73; y <= 75; y += 1) for (let x = 2105; x <= 2111; x += 1) for (let z = -401; z <= -395; z += 1) {
  if (x === 2105 || x === 2111 || z === -401 || z === -395) walls.push({ x, y, z });
}
const roof = cellsIn({ minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395 });
const fixtures = r09g.scope.fixtureAssociations.map(({ fixture }) => fixture);
const preservedFailures = [];
for (const [label, cells, expected] of [['wet-deck', lowerDeck, 'minecraft:polished_diorite'], ['walls', walls, 'minecraft:polished_diorite'],
  ['roof', roof, 'minecraft:polished_diorite'], ['fixtures', fixtures, 'minecraft:sea_lantern']]) {
  for (const cell of cells) {
    const before = await state(sourceReader, cell); const after = await state(postReader, cell);
    if (before !== expected || after !== expected) preservedFailures.push({ label, cell, expected, before, after });
  }
}
invariant(lowerDeck.length === 49 && walls.length === 72 && roof.length === 49 && fixtures.length === 8
  && preservedFailures.length === 0, 'wet/exterior/fixture hold changed');

const halo = cubeHalo(targets); const haloDiff = [];
for (const cell of halo) { const before = await state(sourceReader, cell); const after = await state(postReader, cell); if (before !== after) haloDiff.push({ cell, before, after }); }
invariant(halo.length === 36 && haloDiff.length === 2 && haloDiff.every(({ cell }) => targetKeys.has(cellKey(cell))), 'cap halo has undeclared drift');
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134 && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.construction
  && b07.interaction.length === 13608 && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.interaction,
'canonical B07 geometry drifted');
const interactionDiff = []; let sourceMechanisms = 0; let postMechanisms = 0;
for (const cell of b07.interaction) {
  const before = await state(sourceReader, cell); const after = await state(postReader, cell);
  if (ACTIVE_MECHANISMS.has(stateName(before))) sourceMechanisms += 1;
  if (ACTIVE_MECHANISMS.has(stateName(after))) postMechanisms += 1;
  if (before !== after) interactionDiff.push({ cell, before, after });
}
invariant(interactionDiff.length === 2 && interactionDiff.every(({ cell }) => targetKeys.has(cellKey(cell)))
  && sourceMechanisms === postMechanisms, 'B07 undeclared or mechanism drift detected');

const reviewCells = uniqueCells([...halo, ...upper.map(({ cell }) => cell), ...clearance, ...boundary]);
const reviewBounds = boundsOf(reviewCells); const sourceBlockEntities = []; const postBlockEntities = []; const sourceEntities = []; const postEntities = [];
for (let cx = Math.floor(reviewBounds.minX / 16); cx <= Math.floor(reviewBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(reviewBounds.minZ / 16); cz <= Math.floor(reviewBounds.maxZ / 16); cz += 1) {
    for (const [reader, output] of [[sourceReader, sourceBlockEntities], [postReader, postBlockEntities]]) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (point.x >= reviewBounds.minX && point.x <= reviewBounds.maxX && point.y >= reviewBounds.minY && point.y <= reviewBounds.maxY
          && point.z >= reviewBounds.minZ && point.z <= reviewBounds.maxZ) output.push({ id: entity.id ?? null, point });
      }
    }
    for (const [reader, output] of [[sourceEntityReader, sourceEntities], [postEntityReader, postEntities]]) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const [x, y, z] = entity.Pos.map(Number);
        if (x >= reviewBounds.minX && x < reviewBounds.maxX + 1 && y >= reviewBounds.minY && y < reviewBounds.maxY + 1
          && z >= reviewBounds.minZ && z < reviewBounds.maxZ + 1) output.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
invariant(sourceBlockEntities.length === 0 && postBlockEntities.length === 0 && sourceEntities.length === 0 && postEntities.length === 0,
'upper route entity/block-entity preservation failed');

const executionPath = path.join(EVIDENCE, `${pkg.key}.forward-execution.json`);
const rollbackPath = path.join(EVIDENCE, `${pkg.key}.rollback-poststate-preflight.json`);
const execution = readJson(executionPath); const rollbackPreflight = readJson(rollbackPath);
const journal = fs.readFileSync(abs(`${executionPath}.stream-journal.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status === 'complete' && execution.strictNoop === true && execution.sourceOperationCount === 2
  && execution.successfulGroups === 2 && execution.failedGroups === 0 && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0 && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true, 'strict execution evidence failed');
invariant(journal.length === 10 && journal.every(({ sequence }, index) => sequence === index + 1)
  && journal.at(-1).status === 'complete' && journal.at(-1).batch?.status === 'completed-cleaned', 'journal incomplete');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === 2 && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === EXPECTED.rollbackFile && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight failed');

const checks = [
  'R09J-QA-01-EXECUTED-IDENTITY-AND-17-STAGES', 'R09J-QA-02-EXACT-TWO-AIR-TO-DIORITE-CAPS',
  'R09J-QA-03-EXACT-REVERSE-ORDER-INVERSE', 'R09J-QA-04-ISOLATED-91-SURFACE-UPPER-GRAPH',
  'R09J-QA-05-EXACT-182-AIR-CLEARANCE', 'R09J-QA-06-EXACT-172-COLLISION-PLUS-TWO-BACKED-APERTURE-BOUNDARY',
  'R09J-QA-07-EIGHT-OF-EIGHT-GRAVITY-BOUNDARY-CELLS-SUPPORTED',
  'R09J-QA-08-INHERITED-UNSUPPORTED-GRAVEL-AND-TERMINAL-AIR-PRESERVED',
  'R09J-QA-09-WET-EXTERIOR-FIXTURE-AND-MECHANISM-HOLDS-PRESERVED',
  'R09J-QA-10-EXACT-36-CELL-HALO-DIFF', 'R09J-QA-11-ZERO-UNDECLARED-B07-DRIFT',
  'R09J-QA-12-ENTITY-AND-BLOCK-ENTITY-PRESERVATION', 'R09J-QA-13-STRICT-JOURNAL-CLEANUP',
  'R09J-QA-14-ROLLBACK-POSTSTATE-TWO-OF-TWO', 'R09J-QA-15-NO-ROUTE-COMMISSIONED-BY-PHYSICAL-QA',
];
const payload = {
  schemaVersion: 1, id: 'combined-zones-r09j-b07-upper-route-gravity-isolation-cap-post-release-qa', generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09J_B07_GRAVITY_ISOLATION_CAP_POSTSTATE_VERIFIED_REVERSIBLE',
  release: { transactionId: manifest.transactionId, releaseNodeId: manifest.releaseNodeId, manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256, completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  bindings: { ledger: ledgerBinding, manifest: manifestBinding, sourceCompleteSaveSha256: EXPECTED.sourceComplete,
    sourceRegionSha256: EXPECTED.sourceRegion, postCompleteSaveSha256: EXPECTED.postComplete, postRegionSha256: EXPECTED.postRegion },
  exactState: { targetCellCount: 2, sourceMatchingCellCount: 2, postMatchingCellCount: 2,
    sourceState: 'minecraft:air', targetState: 'minecraft:polished_diorite', exactReverseOrderInverse: true },
  geometry: { isolationCap: classManifest(targets), retainedUpperSurface: classManifest(upper.map(({ cell }) => cell)),
    retainedUpperSurfaceCount: upper.length, retainedUpperClearance: classManifest(clearance), retainedUpperClearanceAirCount: clearance.length,
    retainedUpperBoundary: classManifest(boundary), retainedUpperBoundaryCellCount: boundary.length,
    retainedUpperBoundaryCollisionCount: collisionBoundary.length, retainedUpperBoundaryBackedApertureCount: backedApertures.length,
    retainedUpperBoundaryGravityCount: gravityBoundary.length, unsupportedUpperBoundaryGravityCount: unsupportedGravity.length,
    reachableUpperSurfaceCount: reachableUpper.length, reachableExcludedLowerSurfaceCount: 0, blockedStairIndex: 20,
    commissionedSegmentStartStairIndex: 21, commissionedSegmentEndStairIndex: 110 },
  preservation: { inheritedUnsupportedBoundaryCells: inheritedUnsupported, inheritedUnsupportedBoundaryCellCount: 2,
    unsupportedTerminalAirPreserved: true, lowerWetContainmentDeckCellCount: lowerDeck.length,
    doorlessHeadhouseWallCellCount: walls.length, headhouseRoofCellCount: roof.length, passiveFixtureCellCount: fixtures.length,
    sourceMechanismCellCount: sourceMechanisms, postMechanismCellCount: postMechanisms,
    sourceBlockEntityCount: sourceBlockEntities.length, postBlockEntityCount: postBlockEntities.length,
    sourceSavedEntityCount: sourceEntities.length, postSavedEntityCount: postEntities.length },
  drift: { haloCellCount: halo.length, haloChangedCellCount: haloDiff.length, haloUndeclaredChangedCellCount: 0,
    b07InteractionCellCount: b07.interaction.length, b07InteractionChangedCellCount: interactionDiff.length,
    b07InteractionUndeclaredChangedCellCount: 0, lifecycleTransitionCellCount: 0, mechanismChangedCellCount: 0 },
  executionEvidence: { stageCount: ledger.stages.length, evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailureCount: bindingFailures.length, successfulGroupCount: execution.successfulGroups,
    noopCommandCount: execution.noopCommands, journalEntryCount: journal.length, journalComplete: true,
    rollbackPassed: rollbackPreflight.passed, rollbackFailed: rollbackPreflight.failed },
  checks: checks.map((id) => ({ id, status: 'PASS' })),
  summary: { passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0,
    exactTargetCellCount: 2, retainedUpperSurfaceCount: 91, retainedUpperClearanceAirCount: 182,
    retainedUpperBoundaryCellCount: 174, retainedUpperBoundaryCollisionCount: 172,
    retainedUpperBoundaryBackedApertureCount: 2, supportedUpperBoundaryGravityCount: 8,
    unclassifiedB07ChangedCellCount: 0, rollbackReadyCellCount: 2 },
  safetyBoundary: { physicalIsolationAccepted: true, boundedUpperSegmentCommissionedByThisQa: false,
    fullRouteCommissioned: false, lowerWetInterfaceOpened: false, exteriorOpeningCreated: false,
    mechanismOrControlCommissioned: false, liveCallsPerformedByQa: false, worldMutationPerformedByQa: false },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload)); const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R09J B07 gravity-isolation cap post-release QA\n\n`
  + `**Status:** ${report.status}  \n**QA payload SHA-256:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `Both exact air-to-polished-diorite cap cells pass. The cap isolates the 91-surface upper component beginning at stair index 21, with 182/182 air clearance cells and a complete 174-cell boundary comprising 172 collision cells plus two exact floor-backed internal apertures. All eight gravity boundary cells have durable source-proven terminals; the inherited unsupported gravel column and terminal air remain unchanged.\n\n`
  + `Only the two declared cap cells changed across the 36-cell halo and complete 13,608-cell B07 interaction domain. Wet and exterior holds, fixtures, mechanisms, entities, and block entities remain unchanged. The wrapper completed 17/17 stages, a ten-entry journal, two strict groups, and 2/2 rollback guards. This verifier made no live call and does not itself commission a route.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, output: rel(OUT), markdown: rel(MARKDOWN), qaPayloadSha256, summary: report.summary }, null, 2)}\n`);
