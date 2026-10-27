#!/usr/bin/env node
/** Compile CZ-R09D: complete upper-core crown for the B07 spiral hold. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:08:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08n-post-20260821T180151Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08n-live-20260821T180151Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08n-live-20260821T180151Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r09d-b07-terminal-crown');
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-terminal-crown';
const SOURCE_STATE = 'minecraft:air';
const TARGET_STATE = 'minecraft:polished_andesite';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r09aManifest: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bManifest: 'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09cManifest:
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c',
  sourceRegionSha256:
    '6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e',
  sourceLedgerSha256:
    'f65dcb8181519a505bf608bb2b08fcda41741f484a2774eb60540cc8e2dd7dfb',
  sourceLedgerCompletedReleaseIdentitySha256:
    '3b223d0482b9acabea43b864b41a9a72ddc285766dcbffe12e69d52ac142c70a',
  b07ConstructionCount: 8134,
  b07ConstructionSha256:
    'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCount: 13608,
  b07InteractionSha256:
    'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  crownCount: 16,
  crownSha256: '656002eadbb3714eab9d99016a59f63ffaf7d1fdce899242219746c7fb32ef01',
  r09bCount: 1705,
  r09cCount: 127,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09D B07 terminal crown compiler rejected: ${message}`);
};
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
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const stateName = (state) => state.split('[', 1)[0];
const stateCensus = (records, field = 'state') => {
  const counts = new Map();
  for (const record of records) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};
const surfaceKey = ({ x, z }) => `${x},${z}`;

function reachableSurfaceGraph(nodes, starts) {
  const byPoint = new Map(nodes.map((node) => [surfaceKey(node), node]));
  const reachable = new Set(starts.map(surfaceKey));
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = byPoint.get(queue.shift());
    invariant(current, 'reachability graph start is not a declared surface');
    for (const candidate of nodes) {
      const key = surfaceKey(candidate);
      if (reachable.has(key)) continue;
      const dx = Math.abs(candidate.x - current.x);
      const dz = Math.abs(candidate.z - current.z);
      if (Math.max(dx, dz) !== 1) continue;
      // Admit every diagonal move, even when a real corner would impede it.
      // This deliberately over-approximates player reachability. A two-block
      // rise cannot be mounted from the landing by ordinary step/jump motion.
      if (candidate.surfaceY2 - current.surfaceY2 > 2) continue;
      reachable.add(key);
      queue.push(key);
    }
  }
  return nodes.filter((node) => reachable.has(surfaceKey(node)));
}

function expandOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]);
      x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]);
        y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]);
          z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          records.push({
            cell: { x, y, z },
            sourceState: fields[7],
            targetState: fields[8],
          });
        }
      }
    }
  }
  return records;
}

function manifestRecords(manifest) {
  return manifest.packages.flatMap(({ forward }) => expandOperations(forward));
}

function cubeHalo(cells) {
  return uniqueCells(cells.flatMap(({ x, y, z }) => {
    const output = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) output.push({ x: x + dx, y: y + dy, z: z + dz });
      }
    }
    return output;
  }));
}

const mechanisms = readJson(INPUTS.mechanisms);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const r06Manifest = readJson(INPUTS.r06Manifest);
const r09aManifest = readJson(INPUTS.r09aManifest);
const r09bManifest = readJson(INPUTS.r09bManifest);
const r09cManifest = readJson(INPUTS.r09cManifest);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceLedgerSha256 = sha256(fs.readFileSync(absolute(SOURCE_LEDGER)));
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not the selected complete immutable R08N post save');
invariant(sourceLedgerSha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceLedgerCompletedReleaseIdentitySha256
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT),
'source ledger is not the accepted R08N terminal post state');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
const sourceIdentityPath = path.join(path.dirname(INTAKE_AUDIT), 'post-snapshot-identity.json');
const sourceIdentity = readJson(sourceIdentityPath);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && absolute(sourceIdentity.directory) === absolute(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
const r09Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r09Node?.canonicalOwners?.includes('Z06-PUBLIC-SHAFT-FITOUT'),
'release contract does not bind Z06 to R09');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === EXPECTED.b07ConstructionCount
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionSha256
  && b07.interaction.length === EXPECTED.b07InteractionCount
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionSha256,
'canonical B07 construction/interaction identity drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));

const crown = [];
for (let x = 2104; x <= 2108; x += 1) {
  crown.push({ x, y: 5, z: -430 }, { x, y: 5, z: -426 });
}
for (let z = -429; z <= -427; z += 1) {
  crown.push({ x: 2104, y: 5, z }, { x: 2108, y: 5, z });
}
const targetCells = uniqueCells(crown);
invariant(targetCells.length === EXPECTED.crownCount
  && hashCells(targetCells) === EXPECTED.crownSha256
  && targetCells.every((cell) => constructionKeys.has(cellKey(cell)))
  && targetCells.every((cell) => interactionKeys.has(cellKey(cell))),
'terminal crown is not the exact all-construction B07 perimeter');

const ring = [];
for (let x = 2103; x <= 2109; x += 1) ring.push({ x, z: -431 });
for (let z = -430; z <= -425; z += 1) ring.push({ x: 2109, z });
for (let x = 2108; x >= 2103; x -= 1) ring.push({ x, z: -425 });
for (let z = -426; z >= -430; z -= 1) ring.push({ x: 2103, z });
const stairs = [];
for (let index = 0; index < 124; index += 1) {
  const point = ring[index % ring.length];
  const y = -58 + Math.floor(index / 2);
  stairs.push({
    index,
    cell: { x: point.x, y, z: point.z },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 124 + offset;
  const point = ring[index % ring.length];
  stairs.push({ index, cell: { x: point.x, y: 3, z: point.z }, surfaceY2: 8 });
}
const stairClearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
invariant(intersection(targetCells, stairClearance).length === 0,
  'terminal crown intersects stair clearance');

const coreTop = cellsIn({
  minX: 2104, maxX: 2108,
  minY: 4, maxY: 4,
  minZ: -430, maxZ: -426,
});
const coreInteriorTop = cellsIn({
  minX: 2105, maxX: 2107,
  minY: 4, maxY: 4,
  minZ: -429, maxZ: -427,
});
const terminalRoute = stairs.filter(({ surfaceY2 }) => surfaceY2 >= 8);
const projectedCrownSurfaceY2 = 12;
const coreInteriorSurfaceY2 = 10;
const capSurfaceY2 = 12;
const directCoreEntryBefore = [];
for (const stair of terminalRoute) {
  for (const coreCell of coreTop) {
    const horizontal = Math.max(
      Math.abs(stair.cell.x - coreCell.x),
      Math.abs(stair.cell.z - coreCell.z),
    );
    if (horizontal <= 1 && coreInteriorSurfaceY2 - stair.surfaceY2 <= 2) {
      directCoreEntryBefore.push({ stairIndex: stair.index, coreCell });
    }
  }
}
const directForbiddenEntryAfter = [];
for (const stair of terminalRoute) {
  for (const crownCell of targetCells) {
    const horizontal = Math.max(
      Math.abs(stair.cell.x - crownCell.x),
      Math.abs(stair.cell.z - crownCell.z),
    );
    if (horizontal <= 1 && projectedCrownSurfaceY2 - stair.surfaceY2 <= 2) {
      directForbiddenEntryAfter.push({ stairIndex: stair.index, crownCell });
    }
  }
}
const routeSurfaces = terminalRoute.map(({ cell, surfaceY2, index }) => ({
  ...cell,
  surfaceY2,
  role: 'route',
  index,
}));
const beforeCoreSurfaces = coreTop.map((cell) => ({
  ...cell,
  surfaceY2: coreInteriorSurfaceY2,
  role: 'core',
}));
const crownSurfaces = targetCells.map((cell) => ({
  ...cell,
  surfaceY2: projectedCrownSurfaceY2,
  role: 'crown',
}));
const interiorSurfaces = coreInteriorTop.map((cell) => ({
  ...cell,
  surfaceY2: coreInteriorSurfaceY2,
  role: 'core-interior',
}));
const capSurfaces = [{
  x: 2109,
  y: 5,
  z: -429,
  surfaceY2: capSurfaceY2,
  role: 'cap',
}];
const beforeSurfaceGraph = [...routeSurfaces, ...beforeCoreSurfaces, ...capSurfaces];
const projectedSurfaceGraph = [
  ...routeSurfaces,
  ...crownSurfaces,
  ...interiorSurfaces,
  ...capSurfaces,
];
const reachableBefore = reachableSurfaceGraph(beforeSurfaceGraph, routeSurfaces);
const reachableAfter = reachableSurfaceGraph(projectedSurfaceGraph, routeSurfaces);
const reachableForbiddenBefore = reachableBefore.filter(({ role }) => role !== 'route');
const reachableForbiddenAfter = reachableAfter.filter(({ role }) => role !== 'route');
invariant(directCoreEntryBefore.length > 0
  && directForbiddenEntryAfter.length === 0
  && projectedCrownSurfaceY2 - terminalRoute.at(-1).surfaceY2 === 4
  && capSurfaceY2 - terminalRoute.at(-1).surfaceY2 === 4
  && reachableForbiddenBefore.length > 0
  && reachableForbiddenAfter.length === 0,
'terminal reachability closure does not eliminate all one-block entries');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const transitions = [];
for (const cell of targetCells) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  invariant(sourceState === SOURCE_STATE,
    `crown source drift at ${cellKey(cell)}: ${sourceState}`);
  transitions.push({ cell, sourceState, targetState: TARGET_STATE });
}
for (const cell of stairClearance) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  invariant(AIR_STATES.has(state), `stair clearance drift at ${cellKey(cell)}: ${state}`);
}
for (const cell of coreTop) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  invariant(state === TARGET_STATE, `R09B core top drift at ${cellKey(cell)}: ${state}`);
}
const existingCap = cellsIn({
  minX: 2109, maxX: 2109,
  minY: 3, maxY: 5,
  minZ: -429, maxZ: -429,
});
for (const cell of existingCap) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  invariant(state === 'minecraft:polished_diorite',
    `R09C cap drift at ${cellKey(cell)}: ${state}`);
}
const r09bRecords = manifestRecords(r09bManifest);
const r09cRecords = manifestRecords(r09cManifest);
invariant(r09bRecords.length === EXPECTED.r09bCount
  && r09cRecords.length === EXPECTED.r09cCount,
'accepted R09B/R09C operation counts drifted');
for (const record of [...r09bRecords, ...r09cRecords]) {
  const state = stateToCommandString(await reader.blockState(record.cell.x, record.cell.y, record.cell.z));
  invariant(state === record.targetState,
    `accepted prior state drift at ${cellKey(record.cell)}: ${state}`);
}

const halo = cubeHalo(targetCells);
const targetKeys = new Set(targetCells.map(cellKey));
const haloFluids = [];
const haloGravity = [];
for (const cell of halo) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = stateName(state);
  if (name === 'minecraft:water' || name === 'minecraft:lava'
    || state.includes('waterlogged=true')) haloFluids.push({ cell, state });
  if (GRAVITY_NAMES.has(name) || name.endsWith('_concrete_powder')) {
    haloGravity.push({ cell, state });
  }
}
invariant(haloFluids.every(({ cell }) => !targetKeys.has(cellKey(cell)))
  && haloGravity.every(({ cell }) => !targetKeys.has(cellKey(cell))),
'crown targets intersect fluid or gravity');
const haloBounds = boundsOf(halo);
const blockEntities = [];
const savedEntities = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, haloBounds)) blockEntities.push({ id: entity.id, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) {
        savedEntities.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
      }
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'crown halo intersects a block entity or saved entity');
const protectedIntersections = protectedRelics.relics.filter((relic) => (
  targetCells.some((cell) => insideBounds(cell, relic.declaredInclusiveBounds))
));
invariant(protectedIntersections.length === 0,
'crown intersects a protected relic');

const r06Overlap = intersection(targetCells, manifestRecords(r06Manifest).map(({ cell }) => cell));
const r09aOverlap = intersection(targetCells, manifestRecords(r09aManifest).map(({ cell }) => cell));
const r09bOverlap = intersection(targetCells, r09bRecords.map(({ cell }) => cell));
const r09cOverlap = intersection(targetCells, r09cRecords.map(({ cell }) => cell));
invariant(r06Overlap.length === 0 && r09aOverlap.length === 0
  && r09bOverlap.length === 0 && r09cOverlap.length === 0,
'crown intersects a prior operated set');

const forwardBody = `${transitions.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackBody = `${transitions.slice().reverse().map(({
  cell, sourceState, targetState,
}) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - CZ-R09D B07 terminal crown (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(targetCells)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Install the complete upper-core perimeter crown; inverse removes its 16 cells in exact reverse order.',
  },
  scope: {
    releaseId: 'CZ-R09D-P1-B07-TERMINAL-CROWN',
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Close every one-block and diagonal upper-core bypass around the R09C retained cap without touching the stair path or headroom.',
    geometry: {
      terminalCrown: classManifest(targetCells),
      preservedCoreTop: classManifest(coreTop),
      enclosedCoreInteriorTop: classManifest(coreInteriorTop),
      preservedStairClearance: classManifest(stairClearance),
      existingRetainedCap: classManifest(existingCap),
      interactionHalo: classManifest(halo),
    },
    ownership: {
      canonicalB07ConstructionCellCount: b07.construction.length,
      canonicalB07ConstructionSha256: hashCells(b07.construction, D06_CELL_PREAMBLE),
      canonicalB07InteractionCellCount: b07.interaction.length,
      canonicalB07InteractionSha256: hashCells(b07.interaction, D06_CELL_PREAMBLE),
      crownConstructionCellCount: targetCells.length,
      crownInteractionOnlyCellCount: 0,
      crownOutsideInteractionCellCount: 0,
    },
    reachabilityClosure: {
      model: 'CONSERVATIVE_EIGHT_NEIGHBOUR_PLAYER_SURFACE_GRAPH_WITH_ONE_BLOCK_MAX_RISE_AND_ALL_DIAGONALS_ADMITTED',
      diagonalPolicy: 'ADMIT_ALL_DIAGONALS_AS_CONSERVATIVE_OVER_APPROXIMATION',
      terminalRouteSurfaceCount: terminalRoute.length,
      beforeSurfaceGraphNodeCount: beforeSurfaceGraph.length,
      projectedSurfaceGraphNodeCount: projectedSurfaceGraph.length,
      directCoreEntryEdgeCountBeforeCrown: directCoreEntryBefore.length,
      directForbiddenEntryEdgeCountAfterCrown: directForbiddenEntryAfter.length,
      reachableCoreOrCapSurfaceCountBeforeProjection: reachableForbiddenBefore.length,
      crownSurfaceY2: projectedCrownSurfaceY2,
      coreInteriorSurfaceY2,
      capSurfaceY2,
      maximumTerminalRouteSurfaceY2: Math.max(...terminalRoute.map(({ surfaceY2 }) => surfaceY2)),
      minimumBarrierRiseHalfBlocks: 4,
      reachableCoreOrCapSurfaceCountAfterProjection: 0,
      diagonalBypassCountAfterProjection: 0,
      crownCompletePerimeter: true,
    },
    sourcePartition: {
      sourceStateCensus: stateCensus(transitions, 'sourceState'),
      desiredStateCensus: stateCensus(transitions, 'targetState'),
      exactPartition: true,
    },
    materialDoctrine: {
      crown: TARGET_STATE,
      rationale: 'Continue the accepted non-reactive polished-andesite core with a full perimeter rather than a local patch.',
    },
    operationalBoundary: {
      stairPathTouched: false,
      stairHeadroomTouched: false,
      existingCoreTouched: false,
      retainedCapTouched: false,
      r09aFloorTouched: false,
      r06TreatmentTouched: false,
      r09bOperatedTouched: false,
      r09cOperatedTouched: false,
      wetZoneLiftSmokePowerDrainageTouched: false,
      exactRollbackRestoresAllCrownCellsToAir: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedCellCount: targetCells.length,
    operatedCoordinateSetSha256: hashCells(targetCells),
    sourceStateCensus: stateCensus(transitions, 'sourceState'),
    desiredStateCensus: stateCensus(transitions, 'targetState'),
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: transitions.length,
      rollbackCommandCount: transitions.length,
      targetCellCount: transitions.length,
      targetCoordinateSetSha256: hashCells(targetCells),
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  priorReleaseInterfaces: {
    r06TreatmentOverlap: classManifest(r06Overlap),
    r09aFloorOverlap: classManifest(r09aOverlap),
    r09bOperatedOverlap: classManifest(r09bOverlap),
    r09cOperatedOverlap: classManifest(r09cOverlap),
  },
  safetyBoundary: {
    targetFluidCount: haloFluids.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    haloFluidCount: haloFluids.length,
    targetGravityCount: haloGravity.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    haloGravityCount: haloGravity.length,
    gravitySupportRemovedCount: 0,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
    protectedRelicIntersectionCount: protectedIntersections.length,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    status: authorization.status,
  },
  upstreamIdentities: {
    b07ConstructionSha256: EXPECTED.b07ConstructionSha256,
    b07InteractionSha256: EXPECTED.b07InteractionSha256,
    r06ManifestIdentity: r06Manifest.manifestIdentity,
    r09aManifestIdentity: r09aManifest.manifestIdentity,
    r09bManifestIdentity: r09bManifest.manifestIdentity,
    r09cManifestIdentity: r09cManifest.manifestIdentity,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact source preflight and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop execution with compensating rollback',
    'immutable post save and exact rollback-poststate preflight',
    'independent conservative player-reachability QA before scoped pedestrian commissioning',
  ],
};
const manifest = {
  ...manifestWithoutIdentity,
  manifestIdentity: sha256(JSON.stringify(manifestWithoutIdentity)),
};
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity: manifest.manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  crownCellCount: targetCells.length,
  crownConstructionCellCount: targetCells.length,
  directCoreEntryEdgeCountBeforeCrown: directCoreEntryBefore.length,
  directForbiddenEntryEdgeCountAfterCrown: directForbiddenEntryAfter.length,
  reachableCoreOrCapSurfaceCountAfterProjection: 0,
  forward,
  rollback,
}, null, 2));
