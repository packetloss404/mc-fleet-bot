#!/usr/bin/env node
/**
 * Compile CZ-R07G: sealed surface headhouses for Empty Eight EG-A and EG-B.
 *
 * Each headhouse uses the frozen 7x7 D06 surface-core footprint and its exact
 * surveyed landing Y. The accepted R02 landing/cap fabric is preserved. This
 * release adds only the missing three-block-high perimeter and roof, leaving
 * the 75-cell internal headroom as air and every shaft/route/lift interface
 * physically closed and uncommissioned.
 *
 * This compiler is offline only. It reads immutable evidence and an immutable
 * complete save, then emits guarded exact one-cell operations and inverses.
 */

import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T18:13:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r09d-post-20260821T181124Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09d-live-20260821T181124Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r09d-live-20260821T181124Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');

const BASENAME = 'combined-zones-r07g-empty-eight-egress-headhouses';
const RELEASE_ID = 'CZ-R07G-P1-D06-EMPTY-EIGHT-EGRESS-HEADHOUSES';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const TARGET_STATE = 'minecraft:polished_deepslate';
const SOURCE_STATE = 'minecraft:air';
const FLOOR_STATES = new Set(['minecraft:polished_deepslate', 'minecraft:smooth_stone']);
const HEADROOM_HEIGHT = 3;

const INPUTS = Object.freeze({
  egressGeometry:
    'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  materialDecision:
    'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r02ReleaseNote:
    'docs/masterplans/05-combined-zones/phase1-r02-d06-shell-release.md',
  r02ScopeAmendment:
    'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-amendment.md',
  beeTreatment:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
  beeDestination:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
  beeExecution:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-relocation-executed.md',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac',
  sourceRegionSha256:
    '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
  sourceCompletedReleaseIdentitySha256:
    '39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0',
  egressGeometryFileSha256:
    '25a1d65c6fd076abd2842f2800b5d721a5557b546f70a6f18806235535279beb',
  materialDecisionIdentitySha256:
    'b6e97dbccdaf58b2b13ade4554f6b0bb5cbcd0d2fc24ad755f15a8ec18dcf7ff',
  beeTreatmentIdentitySha256:
    '5da120ff767269074beaee41870a6d019063d5bdbd00ba36a75e9d46a3c7648d',
  beeDestinationIdentitySha256:
    '72ee98dfc1508b1afb75c7c7e38cb7652e2a4bcd3176240cc86ba702802fea52',
  beeExecutionFileSha256:
    '46c5c6b126f3cc4ae591a33afbb76f6a6d151a5d9041c85952da947d4d31560f',
  cores: {
    'EG-A': {
      endpoint: { x: 1652, y: 80, z: 148 },
      naturalTerrainY: 72,
      minimumTerrainY: 66,
      maximumTerrainY: 79,
      surfaceColumnSetSha256:
        'b7b0adbb43b7de8b9c34e2cad4e4c099ed4fb6f4a505337838cbe99a292a0f11',
      continuationCellCount: 1274,
      continuationSha256:
        'da0d3c3a2db61ea29efe64b55e13a977cc5c36a8773c1030af8cd91e856b2213',
      floorStateCensus: {
        'minecraft:polished_deepslate': 30,
        'minecraft:smooth_stone': 19,
      },
      preservedWallCellCount: 0,
      operationCellCount: 121,
    },
    'EG-B': {
      endpoint: { x: 1852, y: 71, z: 148 },
      naturalTerrainY: 62,
      minimumTerrainY: 62,
      maximumTerrainY: 70,
      surfaceColumnSetSha256:
        '1df221c9a0486958322241ce50e719f17c72add1a60b47a6cf0eb80674627af8',
      continuationCellCount: 833,
      continuationSha256:
        '8c5e784edcafe9355e0a4986616e5289264112b455e0b280962895a1a036c70a',
      floorStateCensus: {
        'minecraft:polished_deepslate': 34,
        'minecraft:smooth_stone': 15,
      },
      preservedWallCellCount: 14,
      operationCellCount: 107,
    },
  },
});

const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY_BLOCKS = new Set([
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
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner',
  'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon',
  'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:crafter', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07G Empty Eight egress-headhouse compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true');
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
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});

function stateCensus(records) {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`combined-zones-current-block-state-set-v1\n${records.slice()
    .sort((left, right) => (
      left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
    ))
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
}

function geometryHash(cells, preamble) {
  return sha256(`${preamble}\n${uniqueCells(cells).map(cellKey).join('\n')}`);
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const key = pending.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) pending.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
}

function operationTargetCells(filename) {
  const cells = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a non-exact or malformed operation`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    invariant(x1 === x2 && y1 === y2 && z1 === z2,
      `${filename} contains a non-one-cell guard`);
    cells.push({ x: x1, y: y1, z: z1 });
  }
  return uniqueCells(cells);
}

const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const geometry = readJson(INPUTS.egressGeometry);
const materialDecision = readJson(INPUTS.materialDecision);
const r02Manifest = readJson(INPUTS.r02Manifest);
const beeTreatment = readJson(INPUTS.beeTreatment);
const beeDestination = readJson(INPUTS.beeDestination);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not bound to the accepted R09D terminal post');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.stages?.every(({ status }) => status === 'PASS')
  && samePath(sourceLedger.postSnapshot?.root, SNAPSHOT)
  && sourceLedger.postSnapshot?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256,
'R09D execution ledger is not the accepted terminal predecessor');
const regionIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(regionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(regionIdentity.directory, path.join(SNAPSHOT, 'region')),
'R09D post region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary?.excludedScopeIds?.includes('D06-EGRESS-HEADHOUSES'),
'standing authorization does not cover this R07 architecture package');

invariant(fileBinding(INPUTS.egressGeometry).sha256 === EXPECTED.egressGeometryFileSha256
  && geometry.status === 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN'
  && geometry.egressDesigns?.length === 2,
'frozen D06 egress geometry drifted');
invariant(materialDecision.reportIdentitySha256
  === EXPECTED.materialDecisionIdentitySha256
  && materialDecision.decisionPayload?.mechanismLayerStates?.fireSurfaceCompoundReservation
    ?.state === 'minecraft:smooth_stone'
  && materialDecision.decisionPayload?.mechanismLayerStates?.fireSurfaceApproachCap
    ?.state === TARGET_STATE
  && materialDecision.decisionPayload?.mechanismLayerStates?.egaLiftEquipmentCaps
    ?.state === TARGET_STATE,
'frozen Empty Eight landing/cap palette drifted');
invariant(beeTreatment.reportIdentitySha256 === EXPECTED.beeTreatmentIdentitySha256
  && beeDestination.reportIdentitySha256 === EXPECTED.beeDestinationIdentitySha256
  && fileBinding(INPUTS.beeExecution).sha256 === EXPECTED.beeExecutionFileSha256,
'accepted bee treatment, destination, or executed-relocation evidence drifted');
invariant(beeTreatment.treatmentPayload?.sourceCell?.bounds?.minX === 1849
  && beeTreatment.treatmentPayload?.sourceCell?.bounds?.minY === 66
  && beeTreatment.treatmentPayload?.sourceCell?.bounds?.minZ === 145
  && beeDestination.surveyPayload?.selectedPlanningCandidate?.point?.x === 1811
  && beeDestination.surveyPayload?.selectedPlanningCandidate?.point?.y === 67
  && beeDestination.surveyPayload?.selectedPlanningCandidate?.point?.z === 378,
'bee source or accepted destination coordinate drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function readStates(cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}

const coreDesigns = [];
for (const design of geometry.egressDesigns) {
  const expected = EXPECTED.cores[design.id];
  invariant(expected, `unexpected egress design ${design.id}`);
  const endpoint = design.surveyedSurfaceEndpoint;
  invariant(endpoint.x === expected.endpoint.x
    && endpoint.y === expected.endpoint.y
    && endpoint.z === expected.endpoint.z
    && endpoint.naturalTerrainY === expected.naturalTerrainY
    && design.sevenBySevenSurfaceReview.minimumTerrainY === expected.minimumTerrainY
    && design.sevenBySevenSurfaceReview.maximumTerrainY === expected.maximumTerrainY
    && design.sevenBySevenSurfaceReview.surfaceColumnSetSha256
      === expected.surfaceColumnSetSha256
    && design.sevenBySevenSurfaceReview.surfaceDry === true,
  `${design.id} exact dry surveyed endpoint or terrain review drifted`);
  const continuation = cellsIn(design.externalContinuationDesign.bounds);
  invariant(continuation.length === expected.continuationCellCount
    && geometryHash(continuation, 'combined-zones-d06-egress-continuation-v1')
      === expected.continuationSha256
    && design.externalContinuationDesign.coordinateSetSha256
      === expected.continuationSha256
    && design.externalContinuationDesign.surfaceLandingY === endpoint.y,
  `${design.id} frozen continuation reservation drifted`);

  const footprint = {
    minX: endpoint.x - 3, maxX: endpoint.x + 3,
    minZ: endpoint.z - 3, maxZ: endpoint.z + 3,
  };
  invariant(design.externalContinuationDesign.bounds.minX === footprint.minX
    && design.externalContinuationDesign.bounds.maxX === footprint.maxX
    && design.externalContinuationDesign.bounds.minZ === footprint.minZ
    && design.externalContinuationDesign.bounds.maxZ === footprint.maxZ,
  `${design.id} headhouse footprint is not the exact frozen 7x7 continuation`);
  const floor = cellsIn({ ...footprint, minY: endpoint.y, maxY: endpoint.y });
  const walls = cellsIn({
    ...footprint,
    minY: endpoint.y + 1,
    maxY: endpoint.y + HEADROOM_HEIGHT,
  }).filter((cell) => (
    cell.x === footprint.minX || cell.x === footprint.maxX
    || cell.z === footprint.minZ || cell.z === footprint.maxZ
  ));
  const roof = cellsIn({
    ...footprint,
    minY: endpoint.y + HEADROOM_HEIGHT + 1,
    maxY: endpoint.y + HEADROOM_HEIGHT + 1,
  });
  const headroom = cellsIn({
    minX: endpoint.x - 2, maxX: endpoint.x + 2,
    minY: endpoint.y + 1, maxY: endpoint.y + HEADROOM_HEIGHT,
    minZ: endpoint.z - 2, maxZ: endpoint.z + 2,
  });
  const completeShell = uniqueCells([...floor, ...walls, ...roof]);
  const envelope = uniqueCells([...completeShell, ...headroom]);
  invariant(floor.length === 49 && walls.length === 72 && roof.length === 49
    && headroom.length === 75 && completeShell.length === 170
    && envelope.length === 245,
  `${design.id} 7x7 shell partition is incomplete`);
  const headroomConnectivity = connectedComponents(headroom);
  invariant(headroomConnectivity.componentCount === 1
    && headroomConnectivity.largestComponentCellCount === headroom.length,
  `${design.id} preserved headroom is not one connected volume`);
  const headroomKeys = new Set(headroom.map(cellKey));
  const faceBoundary = uniqueCells(headroom.flatMap((cell) => (
    FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
      x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
    }))
  )).filter((cell) => !headroomKeys.has(cellKey(cell))));
  const completeShellKeys = new Set(completeShell.map(cellKey));
  invariant(faceBoundary.every((cell) => completeShellKeys.has(cellKey(cell))),
    `${design.id} complete shell does not enclose every headroom face`);

  const floorRecords = await readStates(floor);
  invariant(floorRecords.every(({ state }) => FLOOR_STATES.has(state))
    && JSON.stringify(stateCensus(floorRecords)) === JSON.stringify(expected.floorStateCensus),
  `${design.id} accepted landing/cap source state drifted`);
  const wallAndRoofRecords = await readStates([...walls, ...roof]);
  const unexpectedWallOrRoof = wallAndRoofRecords.filter(({ state }) => (
    state !== SOURCE_STATE && state !== TARGET_STATE
  ));
  invariant(unexpectedWallOrRoof.length === 0,
    `${design.id} wall/roof source is neither air nor accepted cap: ${JSON.stringify(unexpectedWallOrRoof.slice(0, 20))}`);
  const preservedWall = wallAndRoofRecords
    .filter(({ state }) => state === TARGET_STATE).map(({ cell }) => cell);
  const operated = wallAndRoofRecords
    .filter(({ state }) => state === SOURCE_STATE).map(({ cell }) => cell);
  invariant(preservedWall.length === expected.preservedWallCellCount
    && operated.length === expected.operationCellCount,
  `${design.id} accepted-cap/new-shell partition drifted`);
  const headroomRecords = await readStates(headroom);
  invariant(headroomRecords.every(({ state }) => state === SOURCE_STATE),
    `${design.id} preserved headroom is obstructed`);
  const roofTransitionCap = cellsIn({ ...footprint, minY: 54, maxY: 54 });
  const roofTransitionRecords = await readStates(roofTransitionCap);
  invariant(roofTransitionRecords.every(({ state }) => state === 'minecraft:smooth_stone'),
    `${design.id} accepted 49-cell roof-transition cap drifted`);
  const continuationRecords = await readStates(continuation);
  invariant(continuationRecords.every(({ state }) => !isFluid(state)),
    `${design.id} frozen continuation has acquired a fluid state`);

  coreDesigns.push({
    id: design.id,
    packageKey: `${design.id.toLowerCase()}-sealed-surface-headhouse`,
    design,
    endpoint,
    continuation,
    continuationRecords,
    floor,
    floorRecords,
    walls,
    roof,
    headroom,
    headroomRecords,
    headroomConnectivity,
    faceBoundary,
    completeShell,
    envelope,
    preservedWall,
    operated,
    roofTransitionCap,
    roofTransitionRecords,
  });
}

invariant(intersection(coreDesigns[0].envelope, coreDesigns[1].envelope).length === 0
  && intersection(coreDesigns[0].operated, coreDesigns[1].operated).length === 0,
'EG-A and EG-B surface headhouses are not disjoint');

const operatedUnion = uniqueCells(coreDesigns.flatMap(({ operated }) => operated));
const operatedKeys = new Set(operatedUnion.map(cellKey));
const interactionHalo = dilateCells(operatedUnion, 1);
const interactionRecords = await readStates(interactionHalo);
const hazardRecords = interactionRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
  || isWoody(state)
));
invariant(hazardRecords.length === 0,
  `operated interaction halo contains a fluid/gravity/container/control/woody hazard: ${JSON.stringify(hazardRecords.slice(0, 20))}`);

const haloBounds = coreDesigns.map(({ operated }) => boundsOf(dilateCells(operated, 1)));
const touchedChunks = new Map();
for (const bounds of haloBounds) {
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
      touchedChunks.set(`${cx},${cz}`, { x: cx, z: cz });
    }
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks.values()) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (haloBounds.some((bounds) => insideBounds(point, bounds))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point, chunk: chunkPoint });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (haloBounds.some((bounds) => savedEntityInside(entity, bounds))) {
      savedEntityIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityIntersections.length === 0,
  'operated interaction halo intersects a block entity');
invariant(savedEntityIntersections.length === 0,
  'operated interaction halo intersects a saved entity');

const protectedRelicIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = interactionHalo.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedRelicIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedRelicIntersections.length === 0,
  'operated interaction halo intersects a protected relic core');

const beeSource = { x: 1849, y: 66, z: 145 };
const beeDestinationPoint = { x: 1811, y: 67, z: 378 };
const beeSourceState = stateToCommandString(
  await reader.blockState(beeSource.x, beeSource.y, beeSource.z),
);
const beeDestinationState = stateToCommandString(
  await reader.blockState(beeDestinationPoint.x, beeDestinationPoint.y, beeDestinationPoint.z),
);
const beeSourceChunk = await reader.chunk(
  Math.floor(beeSource.x / 16), Math.floor(beeSource.z / 16),
);
const beeDestinationChunk = await reader.chunk(
  Math.floor(beeDestinationPoint.x / 16), Math.floor(beeDestinationPoint.z / 16),
);
const blockEntityAt = (chunk, point) => (
  (chunk?.block_entities ?? chunk?.blockEntities ?? []).filter((entity) => (
    Number(entity.x) === point.x && Number(entity.y) === point.y && Number(entity.z) === point.z
  ))
);
const beeSourceBlockEntities = blockEntityAt(beeSourceChunk, beeSource);
const beeDestinationBlockEntities = blockEntityAt(beeDestinationChunk, beeDestinationPoint);
const relocatedNestEntity = beeDestinationBlockEntities[0] ?? null;
invariant(beeSourceState === SOURCE_STATE && beeSourceBlockEntities.length === 0,
'executed bee-relocation source is not clear in the R09D terminal post');
invariant(beeDestinationState === 'minecraft:bee_nest[facing=south,honey_level=0]'
  && beeDestinationBlockEntities.length === 1
  && relocatedNestEntity?.id === 'minecraft:beehive'
  && relocatedNestEntity?.bees?.length === 3,
'executed bee-relocation destination no longer preserves the three-member colony');
invariant(!operatedKeys.has(cellKey(beeSource))
  && !operatedKeys.has(cellKey(beeDestinationPoint))
  && !interactionHalo.some((cell) => cellKey(cell) === cellKey(beeDestinationPoint)),
'headhouse operation would touch accepted bee-relocation source or destination');

const r02OperationCells = [];
for (const pkg of r02Manifest.packages) {
  const declaredHash = r02Manifest.operations?.[pkg.key]?.forwardSha256;
  invariant(declaredHash && sha256(operationBody(pkg.forward)) === declaredHash,
    `R02 ${pkg.key} forward operation body drifted`);
  r02OperationCells.push(...operationTargetCells(pkg.forward));
}
const r02Targets = uniqueCells(r02OperationCells);
const acceptedSurfaceFabric = uniqueCells(coreDesigns.flatMap(({ floor, preservedWall }) => (
  [...floor, ...preservedWall]
)));
invariant(intersection(acceptedSurfaceFabric, r02Targets).length === acceptedSurfaceFabric.length
  && acceptedSurfaceFabric.length === 112,
'accepted landing/approach fabric is not exactly traceable to R02');
invariant(intersection(operatedUnion, r02Targets).length === 0,
'new surface-headhouse targets intersect accepted R02 operation cells');

const operations = {};
const packages = [];
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const core of coreDesigns) {
  const forwardBody = `${core.operated.map((cell) => (
    replLine(cell, SOURCE_STATE, TARGET_STATE)
  )).join('\n')}\n`;
  const rollbackBody = `${core.operated.slice().reverse().map((cell) => (
    replLine(cell, TARGET_STATE, SOURCE_STATE)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const forward = path.join(OUT_DIR, `${BASENAME}.${core.packageKey}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${core.packageKey}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID}/${core.id} (${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${hashCells(core.operated)}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packages.push({ key: core.packageKey, forward, rollback });
  operations[core.packageKey] = {
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: core.operated.length,
    rollbackCommandCount: core.operated.length,
    targetCellCount: core.operated.length,
    targetCoordinateSetSha256: hashCells(core.operated),
    exactInverse: true,
    oneCellGuards: true,
  };
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const forwardOrder = coreDesigns.map(({ packageKey }) => packageKey);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R09D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['D06-EGRESS-HEADHOUSE-EG-A', 'D06-EGRESS-HEADHOUSE-EG-B'],
  packages,
  executionOrder: {
    forward: forwardOrder,
    rollback: forwardOrder.slice().reverse(),
    rationale: 'The headhouses are disjoint; the declared order and exact reverse rollback remain deterministic.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwners: ['OWN-D06-EG-A', 'OWN-D06-EG-B'],
    purpose: 'Complete two dry, sealed surface headhouse shells around the accepted landing caps without opening or commissioning either egress system.',
    engineeringBasis: {
      footprint: 'Exact frozen 7x7 external-continuation footprint for each core.',
      baseY: 'Exact surveyed surfaceLandingY and already-built R02 landing/cap fabric.',
      headroom: 'Three preserved air blocks above the accepted landing, bounded by a static perimeter and roof.',
      material: 'EE-P13 polished_deepslate default-closed cap fabric from the frozen R02 Empty Eight palette.',
      gradingAndSupport: 'No grading or below-landing support is operated: the accepted solid landing caps remain the exact base, avoiding shaft and terrain ownership overlap.',
    },
    cores: Object.fromEntries(coreDesigns.map((core) => [core.id, {
      canonicalOwner: `OWN-D06-${core.id}`,
      surveyedSurfaceEndpoint: core.endpoint,
      frozenTerrainReview: {
        naturalTerrainY: core.endpoint.naturalTerrainY,
        minimumTerrainY: core.design.sevenBySevenSurfaceReview.minimumTerrainY,
        maximumTerrainY: core.design.sevenBySevenSurfaceReview.maximumTerrainY,
        reliefBlocks: core.design.sevenBySevenSurfaceReview.reliefBlocks,
        dry: core.design.sevenBySevenSurfaceReview.surfaceDry,
        surfaceColumnSetSha256:
          core.design.sevenBySevenSurfaceReview.surfaceColumnSetSha256,
      },
      frozenExternalContinuation: {
        ...classManifest(core.continuation),
        frozenCoordinateSetSha256:
          core.design.externalContinuationDesign.coordinateSetSha256,
      },
      completeSurfaceEnvelope: classManifest(core.envelope),
      completeStaticShell: classManifest(core.completeShell),
      acceptedLandingCap: {
        ...classManifest(core.floor),
        stateCensus: stateCensus(core.floorRecords),
        blockStateSetSha256: stateSetSha256(core.floorRecords),
      },
      acceptedR02ApproachCapWall: classManifest(core.preservedWall),
      newWallAndRoof: classManifest(core.operated),
      preservedConnectedHeadroom: {
        ...classManifest(core.headroom),
        ...core.headroomConnectivity,
        stateCensus: stateCensus(core.headroomRecords),
      },
      enclosedHeadroomFaceBoundary: classManifest(core.faceBoundary),
      preservedRoofTransitionCapY54: {
        ...classManifest(core.roofTransitionCap),
        stateCensus: stateCensus(core.roofTransitionRecords),
      },
      currentContinuationInventory: {
        ...classManifest(core.continuation),
        stateCensus: stateCensus(core.continuationRecords),
        blockStateSetSha256: stateSetSha256(core.continuationRecords),
        fluidCellCount: core.continuationRecords.filter(({ state }) => isFluid(state)).length,
        contextualWoodyCellCount:
          core.continuationRecords.filter(({ state }) => isWoody(state)).length,
      },
    }])),
    operationalBoundary: {
      acceptedLandingCapsPreserved: true,
      acceptedRoofTransitionCapsPreserved: true,
      internalHeadroomPreservedAsAir: true,
      shaftsOpened: false,
      stairRoutesInstalled: false,
      liftsInstalled: false,
      exteriorDoorsInstalled: false,
      controlsOrPowerInstalled: false,
      egressCommissioned: false,
      accessibleRouteCommissioned: false,
      futureInterfacesRemainSealed: true,
      exactRollbackRestoresR09DPostAir: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: regionIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    touchedChunks: [...touchedChunks.values()],
  },
  target: {
    operatedUnion: classManifest(operatedUnion),
    desiredStateCensus: { [TARGET_STATE]: operatedUnion.length },
    packageTargetsDisjoint: true,
    acceptedR02SurfaceFabricPreserved: classManifest(acceptedSurfaceFabric),
  },
  operations,
  isolation: {
    operatedInteractionHalo: classManifest(interactionHalo),
    fluidTargetIntersectionCount: 0,
    fluidHaloIntersectionCount:
      interactionRecords.filter(({ state }) => isFluid(state)).length,
    gravityHaloIntersectionCount: interactionRecords
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloCount: interactionRecords
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    woodyHaloIntersectionCount: interactionRecords.filter(({ state }) => isWoody(state)).length,
    blockEntityHaloIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicIntersections.length,
    r02AcceptedSurfaceFabricCellCount: acceptedSurfaceFabric.length,
    r02AcceptedSurfaceFabricProvenanceIntersectionCount:
      intersection(acceptedSurfaceFabric, r02Targets).length,
    r02NewTargetIntersectionCount: intersection(operatedUnion, r02Targets).length,
    coreCrossTargetIntersectionCount:
      intersection(coreDesigns[0].operated, coreDesigns[1].operated).length,
  },
  beeRelocationPreservation: {
    source: {
      point: beeSource,
      currentState: beeSourceState,
      blockEntityCount: beeSourceBlockEntities.length,
      targetIntersectionCount: operatedKeys.has(cellKey(beeSource)) ? 1 : 0,
    },
    destination: {
      point: beeDestinationPoint,
      currentState: beeDestinationState,
      blockEntityId: relocatedNestEntity.id,
      embeddedBeeCount: relocatedNestEntity.bees.length,
      targetIntersectionCount: operatedKeys.has(cellKey(beeDestinationPoint)) ? 1 : 0,
      interactionHaloIntersectionCount:
        interactionHalo.some((cell) => cellKey(cell) === cellKey(beeDestinationPoint)) ? 1 : 0,
    },
    acceptedExecutedRelocationBound: true,
  },
  compileGuards: {
    exactTargetSourceState: SOURCE_STATE,
    targetSourceViolationCount: 0,
    fluidTargetViolationCount: 0,
    fluidHaloViolationCount: 0,
    gravityHaloViolationCount: 0,
    forbiddenContainerOrControlHaloViolationCount: 0,
    woodyHaloViolationCount: 0,
    blockEntityHaloViolationCount: blockEntityIntersections.length,
    savedEntityHaloViolationCount: savedEntityIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicIntersections.length,
    r02NewTargetViolationCount: intersection(operatedUnion, r02Targets).length,
    acceptedLandingCapViolationCount: 0,
    roofTransitionCapViolationCount: 0,
    preservedHeadroomViolationCount: 0,
    beeRelocationViolationCount: 0,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    egressGeometry: fileBinding(INPUTS.egressGeometry),
    materialDecision: {
      ...fileBinding(INPUTS.materialDecision),
      reportIdentitySha256: materialDecision.reportIdentitySha256,
    },
    r02Manifest: {
      ...fileBinding(INPUTS.r02Manifest),
      manifestIdentity: r02Manifest.manifestIdentity,
    },
    r02ReleaseNote: fileBinding(INPUTS.r02ReleaseNote),
    r02ScopeAmendment: fileBinding(INPUTS.r02ScopeAmendment),
    beeTreatment: {
      ...fileBinding(INPUTS.beeTreatment),
      reportIdentitySha256: beeTreatment.reportIdentitySha256,
    },
    beeDestination: {
      ...fileBinding(INPUTS.beeDestination),
      reportIdentitySha256: beeDestination.reportIdentitySha256,
    },
    beeExecution: fileBinding(INPUTS.beeExecution),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'fresh live-entity clearance for both exact packages',
    'exact source preflight for both packages',
    'strict-noop forward and rollback parser checks',
    'journaled strict-noop execution in manifest order',
    'fresh post snapshot and rollback post-state preflight in reverse order',
    'post-release verification of both sealed shells, headroom, caps, and bee relocation',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: regionIdentity.sha256,
  sourceCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
  coreOperationCounts: Object.fromEntries(
    coreDesigns.map(({ id, operated }) => [id, operated.length]),
  ),
  targetCellCount: operatedUnion.length,
  acceptedR02SurfaceFabricPreservedCellCount: acceptedSurfaceFabric.length,
  preservedHeadroomCellCount: coreDesigns.reduce((sum, core) => sum + core.headroom.length, 0),
  preservedRoofTransitionCapCellCount:
    coreDesigns.reduce((sum, core) => sum + core.roofTransitionCap.length, 0),
  beeRelocation: {
    sourceState: beeSourceState,
    destinationState: beeDestinationState,
    destinationEmbeddedBeeCount: relocatedNestEntity.bees.length,
  },
  isolation: manifestWithoutIdentity.isolation,
  operations,
}, null, 2));
