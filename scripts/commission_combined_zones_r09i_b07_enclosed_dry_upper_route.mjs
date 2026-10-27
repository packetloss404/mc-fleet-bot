#!/usr/bin/env node
/** Read-only R09I commissioning seal for the enclosed dry B07 upper route. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z',
);
const LEDGER = value('--ledger', path.join(EVIDENCE, 'evidence-ledger.json'));
const R09H_QA = value('--r09h-qa', path.join(EVIDENCE, 'r09h-post-release-qa.json'));
const OUT = value(
  '--out',
  path.join(EVIDENCE, 'r09i-b07-enclosed-dry-upper-route-commissioning-blocker.json'),
);
const MARKDOWN = value(
  '--markdown',
  path.join(EVIDENCE, 'r09i-b07-enclosed-dry-upper-route-commissioning-blocker.md'),
);
const GENERATED_AT = value('--generated-at', '2026-08-22T02:31:00Z');
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  r07jManifest: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
  r09gManifest: 'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
  r09hManifest: 'data/buildops/combined-zones-r09h-b07-transition-clearance-correction.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: '224c6075450e1e1b3ed259c723ae3c4152687e4ff5d3a71f7493ea25c1856ae8',
  completedReleaseIdentity: 'dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5',
  postComplete: 'ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684',
  postRegion: 'e3690299faa02ae153600028e1b276e1b6bdd844aff0a6037798be3b13484b8b',
  r09hQaFile: '4fa5d36d01317e1803a4eb14c3a5e138e61633ccacc6078bca95056d4a76f8e8',
  r09hQaPayload: '798da0552e482a230f98047b36be294b936ae96d8c3ef1c29ee2a36038ef1a47',
  r09hManifestIdentity: 'bd6956937446fa89b119df85e6daca21415ff2892f72195966d8d0d0259904e4',
  routeHash: 'd28444dc36da803dc74c78b363d0f8249223802f68e9883ec1e07f3f78eda894',
  fallBoundaryHash: 'bc7850cf1831a671cc7ede5bdf64f0a3c2420e6171ba74efa806ee2d9abeccc0',
});
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:granite',
  'minecraft:diorite', 'minecraft:andesite', 'minecraft:deepslate', 'minecraft:tuff',
  'minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:coal_ore',
  'minecraft:polished_andesite', 'minecraft:polished_diorite', 'minecraft:sea_lantern',
]);
const GRAVITY_NAMES = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
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
  if (!condition) throw new Error(`R09I bounded commissioning rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};

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
    stairs.push({
      index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  for (let offset = 0; offset < 4; offset += 1) {
    const index = 84 + offset;
    const point = outerRing[index % 24];
    stairs.push({
      index, cell: { x: point.x, y: 60, z: point.z }, outer: { x: point.ox, y: 60, z: point.oz },
      surfaceY2: 122, targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  const innerRing = [];
  for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
  for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
  for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
  for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
  for (let step = 1; step <= 20; step += 1) {
    const index = 87 + step;
    const point = innerRing[(step + 1) % 16];
    const surfaceY2 = 122 + step;
    const y = Math.floor((surfaceY2 - 1) / 2);
    stairs.push({
      index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  const approach = [{ x: 2109, y: 71, z: -397 }, { x: 2108, y: 71, z: -397 }, topAnchor];
  for (let offset = 0; offset < 3; offset += 1) {
    const index = 108 + offset;
    const surfaceY2 = 143 + offset;
    stairs.push({
      index, cell: approach[offset], outer: null, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  return stairs;
}

const ledger = readJson(LEDGER);
const r09hQa = readJson(R09H_QA);
const inputs = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [key, readJson(filename)]));
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(fileBinding(LEDGER).sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentity
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && postIdentity.sha256 === EXPECTED.postRegion,
'accepted R09H terminal post binding drifted');
invariant(fileBinding(R09H_QA).sha256 === EXPECTED.r09hQaFile
  && r09hQa.status === 'PASS_R09H_B07_TRANSITION_CLEARANCE_POSTSTATE_VERIFIED_REVERSIBLE'
  && r09hQa.qaPayloadSha256 === EXPECTED.r09hQaPayload
  && r09hQa.release.manifestIdentity === EXPECTED.r09hManifestIdentity
  && r09hQa.summary.headClearanceAirCellCount === 222
  && r09hQa.summary.unclassifiedB07ChangedCellCount === 0,
'independent R09H post QA is absent or drifted');

const postReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'region')));
const entityReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'entities')));
const state = async (cell) => stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
const stairs = buildStairs(inputs.mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.anchors.top);
const lowerHold = { cell: { x: 2105, y: 18, z: -400 }, surfaceY2: 38, role: 'closed-lower-deck-hold' };
const upperHold = { cell: { x: 2108, y: 72, z: -399 }, surfaceY2: 146, role: 'doorless-headhouse-hold' };
const orderedRoute = [lowerHold, ...stairs.map(({ cell, surfaceY2, index }) => ({
  cell, surfaceY2, role: 'ordered-stair', stairIndex: index,
})), upperHold];
invariant(stairs.length === 111 && hashCells(stairs.map(({ cell }) => cell)) === EXPECTED.routeHash
  && orderedRoute.length === 113 && uniqueCells(orderedRoute.map(({ cell }) => cell)).length === 113,
'bounded route geometry drifted');
for (let index = 1; index < orderedRoute.length; index += 1) {
  const previous = orderedRoute[index - 1];
  const current = orderedRoute[index];
  invariant(Math.abs(previous.cell.x - current.cell.x) + Math.abs(previous.cell.z - current.cell.z) === 1
    && Math.abs(current.surfaceY2 - previous.surfaceY2) <= 1,
  `route is not cardinal half-step continuous at ordered index ${index}`);
}
invariant(await state(lowerHold.cell) === 'minecraft:polished_diorite'
  && await state(upperHold.cell) === 'minecraft:polished_diorite',
'closed endpoint landing states drifted');
for (const stair of stairs) invariant(await state(stair.cell) === stair.targetState,
  `stair state drifted at index ${stair.index}`);

const routeKeys = new Set(orderedRoute.map(({ cell }) => cellKey(cell)));
const clearance = uniqueCells(orderedRoute.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !routeKeys.has(cellKey(cell)));
const clearanceFailures = [];
for (const cell of clearance) {
  const observed = await state(cell);
  if (!AIR_NAMES.has(stateName(observed))) clearanceFailures.push({ cell, observed });
}
invariant(clearance.length === 226 && clearanceFailures.length === 0,
'bounded route does not have 226/226 air-clearance cells');

const fallBoundary = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z }, { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const collisionBoundary = [];
const backedTransitionApertures = [];
for (const cell of fallBoundary) {
  const observed = await state(cell);
  if (FULL_SOLID_NAMES.has(stateName(observed)) || GRAVITY_NAMES.has(stateName(observed))) {
    collisionBoundary.push(cell);
  } else if (AIR_NAMES.has(stateName(observed))) {
    backedTransitionApertures.push(cell);
  }
}
invariant(fallBoundary.length === 216 && hashCells(fallBoundary) === EXPECTED.fallBoundaryHash
  && collisionBoundary.length === 214 && backedTransitionApertures.length === 2
  && hashCells(backedTransitionApertures) === r09hQa.geometry.correctedClearanceCells.coordinateSetSha256,
'route fall boundary is not exact 214 collision plus two backed apertures');

const landingApron = cellsIn({ minX: 2106, maxX: 2110, minY: 72, maxY: 72, minZ: -400, maxZ: -396 });
const expectedLandingApertures = [
  { x: 2108, y: 72, z: -397 }, { x: 2109, y: 72, z: -397 },
  { x: 2110, y: 72, z: -397 }, { x: 2110, y: 72, z: -396 },
];
const landingFloors = [];
const landingApertures = [];
for (const cell of landingApron) {
  const observed = await state(cell);
  if (observed === 'minecraft:polished_diorite'
    || observed.startsWith('minecraft:smooth_stone_slab[')) landingFloors.push(cell);
  else if (AIR_NAMES.has(stateName(observed))) landingApertures.push(cell);
}
const landingBackings = landingApertures.map((cell) => {
  const backing = stairs.filter(({ cell: stairCell, surfaceY2 }) => (
    stairCell.x === cell.x && stairCell.z === cell.z && surfaceY2 < 146
  )).sort((left, right) => right.surfaceY2 - left.surfaceY2)[0];
  return { aperture: cell, backing, dropHalfBlocks: backing ? 146 - backing.surfaceY2 : null };
});
invariant(landingFloors.length === 21 && landingApertures.length === 4
  && hashCells(landingApertures) === hashCells(expectedLandingApertures)
  && landingBackings.every(({ backing, dropHalfBlocks }) => backing && dropHalfBlocks <= 5),
'headhouse landing apron has an unbacked or excessive-drop opening');

const lowerDeck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
const walls = [];
for (let y = 73; y <= 75; y += 1) {
  for (let x = 2105; x <= 2111; x += 1) {
    for (let z = -401; z <= -395; z += 1) {
      if (x === 2105 || x === 2111 || z === -401 || z === -395) walls.push({ x, y, z });
    }
  }
}
const roof = cellsIn({ minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395 });
for (const [name, cells] of [['lower deck', lowerDeck], ['doorless walls', walls], ['roof', roof]]) {
  for (const cell of cells) invariant(await state(cell) === 'minecraft:polished_diorite', `${name} drifted`);
}
invariant(lowerDeck.length === 49 && walls.length === 72 && roof.length === 49,
'closed endpoint geometry drifted');

const fixtures = inputs.r09gManifest.scope.fixtureAssociations.map(({ fixture, index }) => ({ fixture, index }));
for (const { fixture } of fixtures) invariant(await state(fixture) === 'minecraft:sea_lantern',
  'passive fixture state drifted');
const fixtureOrderedIndices = fixtures.map(({ index }) => index + 1);
const maximumRouteIndexDistanceToFixture = Math.max(...orderedRoute.map((_, index) => (
  Math.min(...fixtureOrderedIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(fixtures.length === 8 && maximumRouteIndexDistanceToFixture === 8,
'passive fixture cadence no longer covers the bounded route');

const functionalDomain = uniqueCells([
  ...orderedRoute.map(({ cell }) => cell), ...clearance, ...fallBoundary,
  ...lowerDeck, ...landingApron, ...walls, ...roof, ...fixtures.map(({ fixture }) => fixture),
]);
const domainRecords = [];
for (const cell of functionalDomain) domainRecords.push({ cell, state: await state(cell) });
const fluids = domainRecords.filter(({ state: observed }) => (
  stateName(observed) === 'minecraft:water' || stateName(observed) === 'minecraft:lava'
  || observed.includes('waterlogged=true')
));
const mechanisms = domainRecords.filter(({ state: observed }) => ACTIVE_MECHANISMS.has(stateName(observed)));
const gravity = domainRecords.filter(({ state: observed }) => GRAVITY_NAMES.has(stateName(observed)));
const unsupportedGravity = [];
for (const { cell } of gravity) {
  let support = { x: cell.x, y: cell.y - 1, z: cell.z };
  let terminal = null;
  for (let depth = 1; depth <= 32; depth += 1) {
    const supportState = await state(support);
    if (!GRAVITY_NAMES.has(stateName(supportState))) {
      terminal = { cell: support, state: supportState, depth };
      break;
    }
    support = { ...support, y: support.y - 1 };
  }
  if (!terminal || !FULL_SOLID_NAMES.has(stateName(terminal.state))) unsupportedGravity.push({ cell, terminal });
}
invariant(fluids.length === 0 && mechanisms.length === 0,
`functional domain hazards: fluid=${fluids.length} mechanism=${mechanisms.length}`);
if (unsupportedGravity.length > 0) {
  const isolationCap = [
    { x: 2105, y: 30, z: -397 },
    { x: 2105, y: 31, z: -397 },
  ];
  const isolationCapSourceStates = [];
  const faceAdjacentGravity = [];
  const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const cell of isolationCap) {
    isolationCapSourceStates.push({ cell, state: await state(cell) });
    for (const [dx, dy, dz] of directions) {
      const adjacent = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const adjacentState = await state(adjacent);
      if (GRAVITY_NAMES.has(stateName(adjacentState))) {
        faceAdjacentGravity.push({ target: cell, adjacent, state: adjacentState });
      }
    }
  }
  invariant(unsupportedGravity.length === 2
    && unsupportedGravity.every(({ cell }) => cell.x === 2104 && cell.z === -396
      && [29, 30].includes(cell.y))
    && isolationCapSourceStates.every(({ state: observed }) => AIR_NAMES.has(stateName(observed)))
    && faceAdjacentGravity.length === 0,
  'unsupported-boundary blocker or disjoint isolation-cap candidate drifted');
  const blockerPayload = {
    schemaVersion: 1,
    id: 'combined-zones-r09i-b07-enclosed-dry-upper-route-commissioning-blocker',
    generatedAtUtc: GENERATED_AT,
    status: 'BLOCKED_R09I_FULL_B07_UPPER_ROUTE_UNSUPPORTED_GRAVITY_BOUNDARY',
    releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
    bindings: {
      r09hLedger: fileBinding(LEDGER),
      r09hPostQa: { ...fileBinding(R09H_QA), qaPayloadSha256: r09hQa.qaPayloadSha256 },
      r09hCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
      postRegionSha256: postIdentity.sha256,
    },
    provenRoute: {
      orderedSurfaceCount: orderedRoute.length,
      headClearanceAirCellCount: clearance.length,
      fallBoundaryCellCount: fallBoundary.length,
      collisionBoundaryCellCount: collisionBoundary.length,
      backedTransitionApertureCount: backedTransitionApertures.length,
      upperLandingFloorCount: landingFloors.length,
      upperLandingStairBackedApertureCount: landingApertures.length,
    },
    exactBlocker: {
      class: 'INHERITED_FLOATING_GRAVEL_IN_ROUTE_FALL_BOUNDARY',
      affectedBoundaryCells: unsupportedGravity,
      affectedStairIndex: 19,
      floatingColumn: {
        x: 2104, z: -396, minY: 27, maxY: 30,
        terminalSupportCell: { x: 2104, y: 26, z: -396 },
        terminalSupportState: 'minecraft:air',
      },
      inheritedEvidence:
        'R09E release note identifies source-floating gravel at (2104,27,-396); the full post read proves the route boundary depends on the same unsupported column.',
      directStabilizationRejected:
        'Adding/removing support or replacing the floating column cannot retain an exact inverse rollback because restoring unsupported gravel can trigger falling-block physics.',
      fullRouteCommissioned: false,
    },
    nextPhysicalPackage: {
      purpose: 'Fail-close below the unsupported boundary and retain the exact safe upper route beginning at stair index 21.',
      targetCells: classManifest(isolationCap),
      sourceState: 'minecraft:air',
      targetState: 'minecraft:polished_diorite',
      blockedStairIndex: 20,
      retainedUpperSegmentStartStairIndex: 21,
      faceAdjacentGravityCellCount: faceAdjacentGravity.length,
      independentlyReversible: true,
    },
    safetyBoundary: {
      physicalPackageRequired: true,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      lowerWetInterfaceOpened: false,
      exteriorOpeningCreated: false,
      liveCallsPerformed: false,
      worldMutationPerformed: false,
    },
  };
  const blockerIdentitySha256 = sha256(JSON.stringify(blockerPayload));
  const blocker = { ...blockerPayload, blockerIdentitySha256 };
  fs.writeFileSync(abs(OUT), `${JSON.stringify(blocker, null, 2)}\n`);
  const blockerMarkdown = `# R09I full B07 upper-route commissioning blocker\n\n`
    + `**Status:** ${blocker.status}  \n`
    + `**Blocker identity:** \`${blockerIdentitySha256}\`\n\n`
    + `The 113-surface route, 226/226 clearance cells, 214+2 fall boundary, and upper landing all pass. Full-route commissioning still fails closed because boundary cells (2104,29,-396) and (2104,30,-396) belong to a four-cell gravel column whose terminal support at (2104,26,-396) is air. R09E already recorded the bottom source-floating gravel.\n\n`
    + `Direct support or gravity replacement is rejected because exact rollback would restore unsupported gravel and can trigger falling-block physics. The smallest safe physical response is a disjoint two-cell polished-diorite isolation cap at (2105,30..31,-397), which has exact air source states and zero face-adjacent gravity. It would fail-close stair index 20 and retain a commissionable upper segment from index 21 to the still-doorless headhouse hold. No live call or world mutation was made.\n`;
  fs.writeFileSync(abs(MARKDOWN), blockerMarkdown);
  process.stdout.write(`${JSON.stringify({
    status: blocker.status, output: rel(OUT), markdown: rel(MARKDOWN), blockerIdentitySha256,
    unsupportedBoundaryCellCount: unsupportedGravity.length,
    nextPhysicalTargetCellCount: isolationCap.length,
  }, null, 2)}\n`);
  process.exit(0);
}

const domainBounds = boundsOf(functionalDomain);
const domainKeys = new Set(functionalDomain.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(domainBounds.minX / 16); cx <= Math.floor(domainBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(domainBounds.minZ / 16); cz <= Math.floor(domainBounds.maxZ / 16); cz += 1) {
    const chunk = await postReader.chunk(cx, cz);
    for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      if (domainKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) blockEntities.push(blockEntity);
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (x >= domainBounds.minX && x < domainBounds.maxX + 1
        && y >= domainBounds.minY && y < domainBounds.maxY + 1
        && z >= domainBounds.minZ && z < domainBounds.maxZ + 1) savedEntities.push(entity);
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'functional domain contains a block entity or saved entity');

const checks = [
  'R09I-01-ACCEPTED-R09H-TERMINAL-AND-INDEPENDENT-QA-BOUND',
  'R09I-02-EXACT-113-SURFACE-CLOSED-HOLD-TO-CLOSED-HOLD-ROUTE',
  'R09I-03-CARDINAL-BIDIRECTIONAL-HALF-STEP-CONTINUITY',
  'R09I-04-EXACT-226-OF-226-AIR-CLEARANCE',
  'R09I-05-EXACT-214-COLLISION-PLUS-TWO-FLOOR-BACKED-APERTURES',
  'R09I-06-HEADHOUSE-APRON-21-FLOORS-PLUS-FOUR-STAIR-BACKED-OPENINGS',
  'R09I-07-LOWER-WET-DECK-CLOSED',
  'R09I-08-DOORLESS-72-CELL-WALL-AND-49-CELL-ROOF-CLOSED',
  'R09I-09-EIGHT-PASSIVE-FIXTURES-MAXIMUM-DISTANCE-EIGHT',
  'R09I-10-ZERO-FLUID-MECHANISM-BLOCK-ENTITY-OR-SAVED-ENTITY',
  'R09I-11-ALL-GRAVITY-IN-FUNCTIONAL-DOMAIN-DURABLY-SUPPORTED',
  'R09I-12-PUBLIC-FIRE-WET-EXTERIOR-LIFT-POWER-SMOKE-DRAINAGE-REMAIN-CLOSED',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09i-b07-enclosed-dry-upper-route-commissioning-seal',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09I_B07_ENCLOSED_DRY_UPPER_ROUTE_COMMISSIONED_BETWEEN_FAIL_CLOSED_HOLDS',
  releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  milestoneId: 'CZ-R09I-B07-ENCLOSED-DRY-UPPER-ROUTE-COMMISSIONING',
  bindings: {
    r09hLedger: fileBinding(LEDGER),
    r09hPostQa: { ...fileBinding(R09H_QA), qaPayloadSha256: r09hQa.qaPayloadSha256 },
    r09hManifest: fileBinding(INPUTS.r09hManifest),
    r09hCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
    postRegionSha256: postIdentity.sha256,
    designManifests: Object.fromEntries(Object.entries(INPUTS)
      .filter(([key]) => key.endsWith('Manifest') && key !== 'r09hManifest')
      .map(([key, filename]) => [key, fileBinding(filename)])),
  },
  route: {
    orderedSurfaceCount: orderedRoute.length,
    orderedSurfaceCoordinateSet: classManifest(orderedRoute.map(({ cell }) => cell)),
    lowerFailClosedHold: { ...lowerHold, state: 'minecraft:polished_diorite' },
    upperFailClosedHold: { ...upperHold, state: 'minecraft:polished_diorite' },
    stairSurfaceCount: stairs.length,
    cardinallyContiguous: true,
    bidirectionalMaximumStepHalfBlocks: 1,
    headClearance: { ...classManifest(clearance), airCellCount: clearance.length },
    fallBoundary: {
      ...classManifest(fallBoundary), collisionCellCount: collisionBoundary.length,
      floorBackedInternalApertureCount: backedTransitionApertures.length,
    },
    upperLandingApron: {
      ...classManifest(landingApron), floorCellCount: landingFloors.length,
      stairBackedApertureCount: landingApertures.length,
      maximumDropToBackedRouteHalfBlocks: Math.max(...landingBackings.map(({ dropHalfBlocks }) => dropHalfBlocks)),
      backingProofs: landingBackings,
    },
  },
  functionalDomain: {
    ...classManifest(functionalDomain),
    fluidCellCount: fluids.length,
    activeMechanismCellCount: mechanisms.length,
    gravityCellCount: gravity.length,
    supportedGravityCellCount: gravity.length - unsupportedGravity.length,
    unsupportedGravityCellCount: unsupportedGravity.length,
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
  },
  passiveWayfinding: {
    fixtureCellCount: fixtures.length,
    stairIndices: fixtures.map(({ index }) => index),
    maximumOrderedRouteIndexDistanceToFixture,
    emergencyOrLifeSafetyLightingCommissioned: false,
  },
  closures: {
    lowerWetContainmentDeckCellCount: lowerDeck.length,
    lowerWetContainmentDeckClosed: true,
    doorlessHeadhouseWallCellCount: walls.length,
    headhouseRoofCellCount: roof.length,
    exteriorDoorInstalled: false,
    exteriorOpeningCreated: false,
  },
  commissioningBoundary: {
    enclosedDryUpperPedestrianCirculationBetweenHoldsCommissioned: true,
    lowerWetInterfaceCommissioned: false,
    exteriorOrSurfaceAccessCommissioned: false,
    publicRouteCommissioned: false,
    fireServiceRouteCommissioned: false,
    liftCommissioned: false,
    powerOrControlsCommissioned: false,
    smokeSystemCommissioned: false,
    drainageOrOutfallCommissioned: false,
    mechanismOrVehicleCommissioned: false,
  },
  checks: checks.map((id) => ({ id, status: 'PASS' })),
  summary: {
    passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0,
    commissionedOrderedSurfaceCount: orderedRoute.length,
    commissionedHeadClearanceAirCellCount: clearance.length,
    lowerHoldClosed: true, upperHoldClosed: true,
    publicRouteCommissioned: false, fireServiceRouteCommissioned: false,
  },
  safetyBoundary: {
    readOnlyImmutablePostEvidence: true,
    liveCallsPerformed: false,
    worldMutationPerformed: false,
    physicalPackageRequired: false,
  },
};
const commissioningIdentitySha256 = sha256(JSON.stringify(payload));
const report = { ...payload, commissioningIdentitySha256 };
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R09I B07 enclosed dry upper-route commissioning seal\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Commissioning identity:** \`${commissioningIdentitySha256}\`  \n`
  + `**Immutable post:** \`${ledger.postSnapshot.completeSaveSha256}\`\n\n`
  + `R09I commissions only the enclosed dry upper pedestrian circulation between the still-closed lower containment-deck hold and the still-doorless internal headhouse hold. The 113 ordered surfaces are cardinally continuous with a maximum half-block step, and all 226 conservative clearance cells are air.\n\n`
  + `The route retains 214 collision-boundary cells plus two exact floor-backed transition apertures. The 25-cell headhouse landing apron contains 21 floors and four stair-backed openings; the largest drop to the retained route is five half-blocks. The complete functional domain contains no fluid, active mechanism, block entity, saved entity, or unsupported gravity.\n\n`
  + `The 49-cell lower wet deck, 72-cell doorless wall, and 49-cell roof remain closed. This seal does not commission lower wet access, exterior or surface access, a public or fire-service route, lift, power, controls, smoke, drainage, vehicles, or mechanisms. No physical package is required, and this verifier made no live call or world mutation.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  commissioningIdentitySha256, summary: report.summary,
}, null, 2)}\n`);
