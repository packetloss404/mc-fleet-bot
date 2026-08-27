#!/usr/bin/env node
/**
 * Compile CZ-R07J: grounded B07 surface deck and fail-closed headhouse.
 *
 * The accepted 7x7 B07 shaft is already void below its Y=72 top face, so an
 * in-footprint pier would not reach terrain. This compiler instead uses four
 * surveyed columns in the one-cell B07 coordination ring. Each column starts
 * immediately above its first stable, non-fluid, non-gravity ground block and
 * continues without a gap to a 9x9 Y=72 deck. A separate 7x7, three-block-
 * headroom polished-diorite shell then closes the surface interface without a
 * door, shaft opening, mechanism, or commissioned route.
 *
 * Offline only: reads immutable evidence and emits guarded operations.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  dilateCells,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T19:20:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08s-post-20260821T191247Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08s-live-20260821T191247Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08s-live-20260821T191247Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r07j-b07-supported-surface-headhouse',
);

const RELEASE_ID = 'CZ-R07J-P1-B07-SUPPORTED-SURFACE-HEADHOUSE';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const FOUNDATION_KEY = 'b07-grounded-pier-and-deck';
const HEADHOUSE_KEY = 'b07-fail-closed-surface-headhouse';
const TARGET_STATE = 'minecraft:polished_diorite';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID_NAMES = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY_NAMES = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const REPLACEABLE_SUPPORT_STATES = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
  'minecraft:snow[layers=1]',
]);
const FORBIDDEN_SOURCE_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:chiseled_bookshelf', 'minecraft:crafter',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07iPostQa:
    'data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.json',
  r07iPostSnapshot:
    'data/worldsnap-combined-zones-r07i-post-20260821T190347Z',
});

const PRIOR_MANIFESTS = Object.freeze([
  'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
  'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
  'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
  'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
]);

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64',
  sourceRegionSha256:
    'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2',
  sourceLedgerSha256:
    'e5661df1e2f1c5354c2de701e11d4a02da335e55662a95d9c0965335474684f9',
  sourceCompletedReleaseIdentitySha256:
    '97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3',
  r07iSurfaceReviewStateSetSha256:
    'f80439d963f47292be8ef1a75831f9bb04d32a667a4a88943a1b6b140f853267',
  b07ConstructionCount: 8134,
  b07ConstructionSha256:
    'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCount: 13608,
  b07InteractionSha256:
    'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07J B07 surface-headhouse compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID_NAMES.has(blockName(state)) || state.includes('waterlogged=true');
const isWoody = (state) => /(?:_leaves|_log|_wood|_stem|_hyphae|bamboo|mangrove_roots)$/.test(
  blockName(state).slice('minecraft:'.length),
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const intersection = (left, right) => {
  const keys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => keys.has(cellKey(cell))));
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const stateCensus = (records) => {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const stateSetSha256 = (records) => sha256(
  `${records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  )).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`,
);

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const [x, y, z] = pending.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) pending.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, componentSizes: sizes };
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function operationTargetIntersection(filename, targetCells) {
  const hits = [];
  const targetBounds = boundsOf(targetCells);
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] !== 'REPL') continue;
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const coordinates = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(coordinates[0], coordinates[3]),
      maxX: Math.max(coordinates[0], coordinates[3]),
      minY: Math.min(coordinates[1], coordinates[4]),
      maxY: Math.max(coordinates[1], coordinates[4]),
      minZ: Math.min(coordinates[2], coordinates[5]),
      maxZ: Math.max(coordinates[2], coordinates[5]),
    };
    if (bounds.maxX < targetBounds.minX || bounds.minX > targetBounds.maxX
      || bounds.maxY < targetBounds.minY || bounds.minY > targetBounds.maxY
      || bounds.maxZ < targetBounds.minZ || bounds.minZ > targetBounds.maxZ) continue;
    hits.push(...targetCells.filter((cell) => insideBounds(cell, bounds)));
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceLedgerSha256 = sha256(fs.readFileSync(absolute(SOURCE_LEDGER)));
const mechanisms = readJson(INPUTS.mechanisms);
const releaseContract = readJson(INPUTS.releaseContract);
const authorization = readJson(INPUTS.standingAuthorization);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r07iPostQa = readJson(INPUTS.r07iPostQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the complete immutable R08S post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedgerSha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT),
'source ledger is not the accepted R08S terminal state');
const regionIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(regionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && absolute(regionIdentity.directory) === absolute(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B07'),
'standing authorization does not cover R07/P1-B07');
const r07Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r07Node?.activeScope?.includes('B07')
  && r07Node.activeScope.includes('headhouses'),
'R07 active scope does not expressly include B07 headhouse work');
const currentStateText = fs.readFileSync(absolute(INPUTS.currentState), 'utf8');
invariant(currentStateText.includes('B07 surface support/headhouse')
  && currentStateText.includes('R08S established the latest accepted immutable baseline'),
'CURRENT-STATE does not retain the B07 surface support/headhouse direction');
invariant(r07iPostQa.status.startsWith('PASS_')
  && r07iPostQa.summary?.passed === true
  && r07iPostQa.summary?.failCount === 0,
'accepted R07I post QA is not PASS');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === EXPECTED.b07ConstructionCount
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionSha256
  && b07.interaction.length === EXPECTED.b07InteractionCount
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionSha256,
'canonical B07 construction/interaction identity drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const r07iReader = new AnvilReader(absolute(path.join(INPUTS.r07iPostSnapshot, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function readStates(cells, selectedReader = reader) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(
        await selectedReader.blockState(cell.x, cell.y, cell.z),
      ),
    });
  }
  return records;
}

const surfaceReview = cellsIn({
  minX: 2101, maxX: 2115, minY: 50, maxY: 80, minZ: -405, maxZ: -391,
});
const surfaceReviewRecords = await readStates(surfaceReview);
const r07iSurfaceReviewRecords = await readStates(surfaceReview, r07iReader);
invariant(stateSetSha256(surfaceReviewRecords)
    === EXPECTED.r07iSurfaceReviewStateSetSha256
  && stateSetSha256(r07iSurfaceReviewRecords)
    === EXPECTED.r07iSurfaceReviewStateSetSha256,
'B07 surface prism drifted during the disjoint R07I-to-R08S rebase');

const exactTopFace = cellsIn({
  minX: 2105, maxX: 2111, minY: 72, maxY: 72, minZ: -401, maxZ: -395,
});
const deck = cellsIn({
  minX: 2104, maxX: 2112, minY: 72, maxY: 72, minZ: -402, maxZ: -394,
});
const supportSeeds = [
  { id: 'west', x: 2104, z: -398 },
  { id: 'north', x: 2107, z: -402 },
  { id: 'south', x: 2107, z: -394 },
  { id: 'east-tree-avoidance', x: 2112, z: -401 },
];

const supports = [];
const supportProofs = [];
for (const seed of supportSeeds) {
  let ground = null;
  const skipped = [];
  for (let y = 71; y >= 50; y -= 1) {
    const state = stateToCommandString(await reader.blockState(seed.x, y, seed.z));
    if (REPLACEABLE_SUPPORT_STATES.has(state)) {
      if (!AIR_STATES.has(blockName(state))) skipped.push({ y, state });
      continue;
    }
    ground = { x: seed.x, y, z: seed.z, state };
    break;
  }
  invariant(ground, `${seed.id} support has no surveyed ground through Y50`);
  invariant(!isFluid(ground.state)
    && !GRAVITY_NAMES.has(blockName(ground.state))
    && !isWoody(ground.state)
    && !FORBIDDEN_SOURCE_NAMES.has(blockName(ground.state)),
  `${seed.id} first ground is not stable/static: ${ground.state}`);
  const column = cellsIn({
    minX: seed.x, maxX: seed.x,
    minY: ground.y + 1, maxY: 71,
    minZ: seed.z, maxZ: seed.z,
  });
  const columnRecords = await readStates(column);
  invariant(columnRecords.every(({ state }) => REPLACEABLE_SUPPORT_STATES.has(state)),
    `${seed.id} support column contains a non-replaceable obstruction`);
  invariant(columnRecords.every(({ state }) => !isWoody(state)),
    `${seed.id} support column would cut tree fabric`);
  invariant(deck.some((cell) => (
    cell.x === seed.x && cell.y === 72 && cell.z === seed.z
  )), `${seed.id} support does not contact the deck by a vertical face`);
  supports.push(...column);
  supportProofs.push({
    id: seed.id,
    column: classManifest(column),
    stableGround: ground,
    replacedSurfaceStates: skipped,
    continuousToDeck: true,
    deckContact: { x: seed.x, y: 72, z: seed.z },
  });
}

const foundation = uniqueCells([...supports, ...deck]);
const walls = cellsIn({
  minX: 2105, maxX: 2111, minY: 73, maxY: 75, minZ: -401, maxZ: -395,
}).filter((cell) => (
  cell.x === 2105 || cell.x === 2111 || cell.z === -401 || cell.z === -395
));
const roof = cellsIn({
  minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395,
});
const headhouse = uniqueCells([...walls, ...roof]);
const headroom = cellsIn({
  minX: 2106, maxX: 2110, minY: 73, maxY: 75, minZ: -400, maxZ: -396,
});
const surfacePrismExtension = cellsIn({
  minX: 2105, maxX: 2111, minY: 74, maxY: 76, minZ: -401, maxZ: -395,
});
const operatedUnion = uniqueCells([...foundation, ...headhouse]);
invariant(deck.length === 81 && exactTopFace.length === 49
  && supports.length === 35 && foundation.length === 116
  && walls.length === 72 && roof.length === 49 && headhouse.length === 121
  && headroom.length === 75 && surfacePrismExtension.length === 147
  && operatedUnion.length === 237,
'foundation/headhouse partition count drifted');
invariant(intersection(foundation, headhouse).length === 0,
'foundation and headhouse targets overlap');

const deckConnectivity = connectedComponents(deck);
const headroomConnectivity = connectedComponents(headroom);
invariant(deckConnectivity.componentCount === 1
  && headroomConnectivity.componentCount === 1,
'deck or headroom is not a single connected component');
const headroomKeys = new Set(headroom.map(cellKey));
const faceBoundary = uniqueCells(headroom.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !headroomKeys.has(cellKey(cell))));
const projectedShellKeys = new Set([...exactTopFace, ...headhouse].map(cellKey));
invariant(faceBoundary.length === 110
  && faceBoundary.every((cell) => projectedShellKeys.has(cellKey(cell))),
'headhouse does not close every interior face');

const foundationRecords = await readStates(foundation);
const headhouseRecords = await readStates(headhouse);
const headroomRecords = await readStates(headroom);
const targetRecords = [...foundationRecords, ...headhouseRecords];
invariant(foundationRecords.every(({ state }) => REPLACEABLE_SUPPORT_STATES.has(state))
  && headhouseRecords.every(({ state }) => AIR_STATES.has(blockName(state)))
  && headroomRecords.every(({ state }) => AIR_STATES.has(blockName(state))),
'target or preserved headroom source has an unexpected state');
invariant(targetRecords.every(({ state }) => !isFluid(state)
  && !GRAVITY_NAMES.has(blockName(state))
  && !isWoody(state)
  && !FORBIDDEN_SOURCE_NAMES.has(blockName(state))),
'target source intersects fluid/gravity/tree/container/control state');

const woodyRecords = surfaceReviewRecords.filter(({ state }) => isWoody(state));
const snowRecords = surfaceReviewRecords.filter(({ state }) => blockName(state) === 'minecraft:snow');
invariant(woodyRecords.length > 0
  && intersection(operatedUnion, woodyRecords.map(({ cell }) => cell)).length === 0,
'tree preservation set is empty or target-intersected');
const retainedWoodyStateSetSha256 = stateSetSha256(woodyRecords);

const constructionIntersection = intersection(operatedUnion, b07.construction);
const interactionIntersection = intersection(operatedUnion, b07.interaction);
const outsideInteraction = operatedUnion.filter((cell) => !interactionKeys.has(cellKey(cell)));
const extensionOperated = intersection(operatedUnion, surfacePrismExtension);
invariant(constructionIntersection.length === 49
  && interactionIntersection.length === 140
  && outsideInteraction.length === 97
  && extensionOperated.length === 97
  && outsideInteraction.every((cell) => (
    surfacePrismExtension.some((candidate) => cellKey(candidate) === cellKey(cell))
  )),
'target ownership partition is not exact B07 + named surface-prism extension');

const priorReleaseProof = [];
const priorHits = [];
for (const manifestPath of PRIOR_MANIFESTS) {
  const manifest = readJson(manifestPath);
  const hits = [];
  for (const pkg of manifest.packages ?? []) {
    hits.push(...operationTargetIntersection(pkg.forward, operatedUnion));
  }
  const exactHits = uniqueCells(hits);
  priorHits.push(...exactHits);
  priorReleaseProof.push({
    transactionId: manifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: exactHits.length,
  });
}
invariant(uniqueCells(priorHits).length === 0,
'new targets overlap an accepted prior guarded-operation target');

const halo = dilateCells(operatedUnion, 1);
const haloRecords = await readStates(halo);
const targetBounds = boundsOf(halo);
const touchedChunks = [];
for (let cx = Math.floor(targetBounds.minX / 16); cx <= Math.floor(targetBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(targetBounds.minZ / 16); cz <= Math.floor(targetBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const point of touchedChunks) {
  const chunk = await reader.chunk(point.x, point.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (insideBounds(cell, targetBounds)) blockEntityIntersections.push({ id: entity.id, cell });
  }
  const entityChunk = await entityReader.chunk(point.x, point.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, targetBounds)) {
      savedEntityIntersections.push({ id: entity.id, position: entity.Pos.slice(0, 3) });
    }
  }
}
invariant(blockEntityIntersections.length === 0,
'operation halo intersects a block entity');
invariant(savedEntityIntersections.length === 0,
'operation halo intersects a saved entity');
const protectedRelicIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = halo.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedRelicIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedRelicIntersections.length === 0,
'operation halo intersects a protected relic');

const packages = [
  { key: FOUNDATION_KEY, records: foundationRecords },
  { key: HEADHOUSE_KEY, records: headhouseRecords },
];
const packageEntries = [];
const operations = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const pkg of packages) {
  const forwardBody = `${pkg.records.map(({ cell, state }) => (
    replLine(cell, state, TARGET_STATE)
  )).join('\n')}\n`;
  const rollbackBody = `${pkg.records.slice().reverse().map(({ cell, state }) => (
    replLine(cell, TARGET_STATE, state)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetCells = pkg.records.map(({ cell }) => cell);
  const forward = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID}/${pkg.key} (${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${hashCells(targetCells)}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageEntries.push({ key: pkg.key, forward: relative(forward), rollback: relative(rollback) });
  operations[pkg.key] = {
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: pkg.records.length,
    rollbackCommandCount: pkg.records.length,
    targetCellCount: pkg.records.length,
    targetCoordinateSetSha256: hashCells(targetCells),
    sourceStateCensus: stateCensus(pkg.records),
    desiredStateCensus: { [TARGET_STATE]: pkg.records.length },
    exactInverse: true,
    oneCellGuards: true,
  };
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_R08S_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B07-SURFACE-SUPPORT', 'P1-B07-SURFACE-HEADHOUSE'],
  packages: packageEntries,
  executionOrder: {
    forward: [FOUNDATION_KEY, HEADHOUSE_KEY],
    rollback: [HEADHOUSE_KEY, FOUNDATION_KEY],
    rationale: 'Grounded support and deck precede the supported shell; rollback removes the shell before its deck and piers.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'P1-B07',
    anchor: { x: 2108, y: 72, z: -398, surveyedTerrainY: 63 },
    material: TARGET_STATE,
    engineeringBasis: {
      rejectedInFootprintPiers:
        'The accepted 7x7 shaft is void beneath terrain, so an in-footprint pier would not reach stable ground.',
      foundation:
        'Four tree-avoiding columns in the canonical one-cell coordination ring rise continuously from first stable non-gravity/non-fluid ground to a connected 9x9 Y=72 deck.',
      headhouse:
        'A 7x7 perimeter with three connected interior headroom layers and a full roof remains doorless and fail-closed.',
      rollback:
        'Exact reverse order restores every air and one-layer-snow source state; no terrain, tree, fluid, entity, block entity, or relic is migrated.',
    },
    geometry: {
      canonicalB07Construction: classManifest(b07.construction),
      canonicalB07Interaction: classManifest(b07.interaction),
      exactSevenBySevenTopFace: classManifest(exactTopFace),
      nineByNineDeck: {
        ...classManifest(deck),
        ...deckConnectivity,
      },
      groundedPiers: classManifest(supports),
      supportProofs,
      foundation: classManifest(foundation),
      headhouseWalls: classManifest(walls),
      headhouseRoof: classManifest(roof),
      headhouseShell: classManifest(headhouse),
      preservedConnectedHeadroom: {
        ...classManifest(headroom),
        ...headroomConnectivity,
        stateCensus: stateCensus(headroomRecords),
      },
      completeInteriorFaceBoundary: classManifest(faceBoundary),
    },
    ownership: {
      targetConstructionCellCount: constructionIntersection.length,
      targetInteractionCellCount: interactionIntersection.length,
      targetInteractionOnlyCellCount: interactionIntersection.length - constructionIntersection.length,
      targetOutsideHistoricalInteractionCellCount: outsideInteraction.length,
      namedReviewedExtension: {
        id: 'P1-B07-SURFACE-ARCHITECTURE-PRISM-EXTENSION-R07J',
        authority:
          'CURRENT-STATE Remaining R07 B07 surface support/headhouse + release-contract R07 activeScope + standing scoped build authorization',
        disposition: 'REVIEWED_EXACT_EXTENSION_FOR_CLOSED_SURFACE_ARCHITECTURE_ONLY',
        prism: classManifest(surfacePrismExtension),
        operatedCells: classManifest(extensionOperated),
        preservedInteriorAirCellCount:
          surfacePrismExtension.length - extensionOperated.length,
        priorTargetIntersectionCount: 0,
      },
    },
    operationalBoundary: {
      shaftInterfaceClosedByExactTopFace: true,
      exactTopFaceTargetState: TARGET_STATE,
      exteriorDoorInstalled: false,
      shaftOrEgressOpeningCreated: false,
      stairOrLiftInstalled: false,
      smokePowerDrainageOrControlsInstalled: false,
      publicRouteCommissioned: false,
      r09RetainedUpperHoldPreserved: true,
      futureOpeningDeferred: true,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: regionIdentity.sha256,
    intakeAudit: fileBinding(INTAKE_AUDIT),
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    disjointRebaseProof: {
      baseline: 'R07I_POST',
      terminal: 'R08S_POST',
      reviewPrism: classManifest(surfaceReview),
      baselineBlockStateSetSha256: stateSetSha256(r07iSurfaceReviewRecords),
      terminalBlockStateSetSha256: stateSetSha256(surfaceReviewRecords),
      mismatchCount: surfaceReviewRecords.filter((record, index) => (
        record.state !== r07iSurfaceReviewRecords[index].state
      )).length,
    },
    sourceStateCensus: stateCensus(targetRecords),
    sourceBlockStateSetSha256: stateSetSha256(targetRecords),
    touchedChunks,
  },
  target: {
    operatedUnion: classManifest(operatedUnion),
    desiredStateCensus: { [TARGET_STATE]: operatedUnion.length },
    packageTargetsDisjoint: true,
    sourceStateCensus: stateCensus(targetRecords),
  },
  operations,
  preservation: {
    surfaceReview: classManifest(surfaceReview),
    retainedWoodyCells: {
      ...classManifest(woodyRecords.map(({ cell }) => cell)),
      blockStateSetSha256: retainedWoodyStateSetSha256,
      targetIntersectionCount: 0,
    },
    contextualSnowCells: {
      ...classManifest(snowRecords.map(({ cell }) => cell)),
      targetIntersectionCount:
        intersection(operatedUnion, snowRecords.map(({ cell }) => cell)).length,
      exactRollbackRestoredTargetSnowCellCount:
        targetRecords.filter(({ state }) => blockName(state) === 'minecraft:snow').length,
    },
    acceptedPriorReleaseTargetProof: priorReleaseProof,
    acceptedPriorReleaseTargetIntersectionCount: 0,
    r09RetainedHoldTargetIntersectionCount: 0,
  },
  safetyAudit: {
    operatedHalo: classManifest(halo),
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    targetGravityCount:
      targetRecords.filter(({ state }) => GRAVITY_NAMES.has(blockName(state))).length,
    targetWoodyCount: targetRecords.filter(({ state }) => isWoody(state)).length,
    targetForbiddenContainerOrControlCount:
      targetRecords.filter(({ state }) => FORBIDDEN_SOURCE_NAMES.has(blockName(state))).length,
    haloFluidCount: haloRecords.filter(({ state }) => isFluid(state)).length,
    haloGravityCount:
      haloRecords.filter(({ state }) => GRAVITY_NAMES.has(blockName(state))).length,
    haloWoodyCount: haloRecords.filter(({ state }) => isWoody(state)).length,
    haloBlockEntityCount: blockEntityIntersections.length,
    haloSavedEntityCount: savedEntityIntersections.length,
    haloProtectedRelicCount: protectedRelicIntersections.length,
    everyPierContinuousToDeck: supportProofs.every(({ continuousToDeck }) => continuousToDeck),
    everyPierGroundStable: supportProofs.every(({ stableGround }) => (
      !isFluid(stableGround.state)
      && !GRAVITY_NAMES.has(blockName(stableGround.state))
      && !isWoody(stableGround.state)
    )),
    deckConnected: deckConnectivity.componentCount === 1,
    headroomConnected: headroomConnectivity.componentCount === 1,
    headroomFullyEnclosed: faceBoundary.every((cell) => projectedShellKeys.has(cellKey(cell))),
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    mechanisms: fileBinding(INPUTS.mechanisms),
    connectorGeometry: fileBinding(INPUTS.connectorGeometry),
    currentState: fileBinding(INPUTS.currentState),
    releaseContract: fileBinding(INPUTS.releaseContract),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
    r07iPostQa: fileBinding(INPUTS.r07iPostQa),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and exact package-order source preflight',
    'fresh live-entity clearance over each exact package halo',
    'strict-noop forward and rollback parser checks',
    'journaled strict execution foundation then headhouse with reverse compensation',
    'fresh post snapshot and reverse-order rollback post-state preflight',
    'post-release tree, support/contact, enclosure, cap, R09-hold, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    shaftOpened: false,
    routeCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity,
  source: manifest.source.snapshotRoot,
  packageCounts: Object.fromEntries(Object.entries(operations).map(([key, record]) => (
    [key, record.targetCellCount]
  ))),
  totalTargetCount: operatedUnion.length,
  sourceStateCensus: stateCensus(targetRecords),
  priorTargetIntersectionCount: uniqueCells(priorHits).length,
  treeTargetIntersectionCount: 0,
  liveCallsPerformed: false,
}, null, 2));
