#!/usr/bin/env node
/**
 * Compile the exact EE-PF-05 flow-ordered containment liner.
 *
 * PF05 has no source water in its platform halo. Its 25 exact flowing-water
 * cells form one acyclic dependency fan fed by a retained falling-water cell
 * immediately above the halo. Forward operations follow a proven
 * downstream-to-upstream topological order, so no remaining strict source
 * guard depends on water that has already been replaced. Rollback reverses
 * that order, restoring the original states upstream-to-downstream.
 *
 * This is a PF05-only compiler. The generic source-fluid compiler remains
 * source-only and fail-closed. No live call or world mutation is performed.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:18:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08i-post-20260821T171300Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08i-live-20260821T171300Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08-empty-eight-platform-05-flow-ordered-liner',
);

const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const RELEASE_ID = 'CZ-R08J-EE-PF-05-FLOW-ORDERED-LINER';
const PLATFORM_ID = 'EE-PF-05';
const PACKAGE_KEY = 'ee-pf-05-flow-ordered-liner';
const LINER_STATE = 'minecraft:deepslate_tiles';
const FACE_NEIGHBOURS_2D = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const EXPECTED = Object.freeze({
  fluidCellCount: 25,
  fluidCoordinateSetSha256: '27dfe6936a03a2a6120d54a8c07b6b5c93f4fac2e04da94deaaf7f774a9807f0',
  insideFluidCellCount: 19,
  containmentFluidCellCount: 6,
  dependencyEdgeCount: 34,
  dependencyEdgeSetSha256: 'a2abb19c912d844b53f1eb0af93eb18599a9170022b9e202c2c6ed71686d5b11',
  forwardOrderedSha256: '8e4a3c5c8901d59412ee5c521287b0ac631b2c11be8b725dcdb6c0a69236e46b',
  sourceStateCensus: {
    'minecraft:water[level=3]': 5,
    'minecraft:water[level=2]': 4,
    'minecraft:water[level=1]': 3,
    'minecraft:water[level=5]': 3,
    'minecraft:water[level=6]': 3,
    'minecraft:water[level=7]': 3,
    'minecraft:water[level=4]': 2,
    'minecraft:water[level=8]': 2,
  },
});
const RETAINED_FEED = Object.freeze([
  { cell: { x: 1702, y: 48, z: 108 }, state: 'minecraft:water[level=8]', role: 'falling-boundary-feed' },
  { cell: { x: 1702, y: 49, z: 108 }, state: 'minecraft:water[level=1]', role: 'source-adjacent-feed' },
  { cell: { x: 1702, y: 49, z: 109 }, state: 'minecraft:water[level=0]', role: 'retained-source' },
]);
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  acceptedPriorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  ],
});
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08 PF05 flow-ordered compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const boxesOverlap = (left, right) => !(
  left.maxX < right.minX || left.minX > right.maxX
  || left.maxY < right.minY || left.minY > right.maxY
  || left.maxZ < right.minZ || left.minZ > right.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, field) => {
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
const waterLevel = (state) => {
  const match = state.match(/^minecraft:water\[level=(\d+)\]$/);
  return match ? Number(match[1]) : null;
};

function targetIntersections(filename, targets) {
  const targetBounds = boundsOf(targets);
  const hits = new Map();
  for (const [lineIndex, raw] of fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename}:${lineIndex + 1} is not a guarded REPL operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename}:${lineIndex + 1} has an invalid coordinate`);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    const operationBounds = {
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
    };
    if (!boxesOverlap(targetBounds, operationBounds)) continue;
    for (const cell of targets) {
      if (insideBounds(cell, operationBounds)) hits.set(cellKey(cell), cell);
    }
  }
  return uniqueCells([...hits.values()]);
}

const emptyEight = readJson(INPUTS.emptyEight);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const intake = readJson(INTAKE_AUDIT);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not bound to the selected snapshot');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
'source snapshot is missing level.dat');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
invariant(platform?.assignedTrack === 5, 'frozen PF05 platform metadata drifted');
const floorBounds = platform.surface.bounds;
const chamberBounds = {
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: floorBounds.minY,
  maxY: floorBounds.minY + 5,
  minZ: floorBounds.minZ,
  maxZ: floorBounds.maxZ,
};
const haloBounds = {
  minX: chamberBounds.minX - 1,
  maxX: chamberBounds.maxX + 1,
  minY: chamberBounds.minY - 1,
  maxY: chamberBounds.maxY + 1,
  minZ: chamberBounds.minZ - 1,
  maxZ: chamberBounds.maxZ + 1,
};
const interactionBounds = { ...haloBounds, maxY: 49 };
const chamberKeys = new Set(cellsIn(chamberBounds).map(cellKey));
const halo = cellsIn(haloBounds);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

const fluidRecords = [];
const forbiddenInteractionBlocks = [];
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) {
    stateCache.set(key, stateToCommandString(
      await reader.blockState(cell.x, cell.y, cell.z),
    ));
  }
  return stateCache.get(key);
}
for (const cell of cellsIn(interactionBounds)) {
  const sourceState = await stateAt(cell);
  if (insideBounds(cell, haloBounds) && waterLevel(sourceState) !== null) {
    fluidRecords.push({
      cell,
      sourceState,
      level: waterLevel(sourceState),
      targetState: LINER_STATE,
      insideChamber: chamberKeys.has(cellKey(cell)),
    });
  }
  if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    forbiddenInteractionBlocks.push({ cell, sourceState });
  }
}
const fluidCells = fluidRecords.map(({ cell }) => cell);
const targetByKey = new Map(fluidRecords.map((record) => [cellKey(record.cell), record]));
const insideFluidCells = fluidRecords
  .filter(({ insideChamber }) => insideChamber).map(({ cell }) => cell);
const containmentFluidCells = fluidRecords
  .filter(({ insideChamber }) => !insideChamber).map(({ cell }) => cell);
const sourceStateCensus = census(fluidRecords, 'sourceState');
invariant(fluidRecords.length === EXPECTED.fluidCellCount
  && hashCells(fluidCells) === EXPECTED.fluidCoordinateSetSha256,
'PF05 flow set drifted from the reviewed exact 25-cell fan');
invariant(JSON.stringify(sourceStateCensus) === JSON.stringify(EXPECTED.sourceStateCensus),
  `PF05 exact flow-level census drifted: ${JSON.stringify(sourceStateCensus)}`);
invariant(fluidRecords.every(({ level }) => Number.isInteger(level) && level >= 1 && level <= 8),
'PF05 target set includes a source, non-waterlogged state, or invalid flow level');
invariant(insideFluidCells.length === EXPECTED.insideFluidCellCount
  && containmentFluidCells.length === EXPECTED.containmentFluidCellCount,
'PF05 interior/containment flow partition drifted');
invariant(forbiddenInteractionBlocks.length === 0,
'PF05 feed interaction bounds intersect a container or control block');

const feedRecords = [];
for (const expected of RETAINED_FEED) {
  const observedState = await stateAt(expected.cell);
  invariant(observedState === expected.state,
    `PF05 retained ${expected.role} drifted: ${observedState}`);
  feedRecords.push({ ...expected, observedState });
}

// Derive exact target dependencies. A horizontal level n depends on level
// n-1; horizontal level 1 depends on a source/falling neighbour; falling
// level 8 depends on the water directly above it.
const dependencyEdges = [];
const externalUpstream = new Map();
for (const record of fluidRecords) {
  const candidateCells = record.level === 8
    ? [{ x: record.cell.x, y: record.cell.y + 1, z: record.cell.z }]
    : FACE_NEIGHBOURS_2D.map(([dx, dz]) => ({
      x: record.cell.x + dx,
      y: record.cell.y,
      z: record.cell.z + dz,
    }));
  const upstream = [];
  for (const cell of candidateCells) {
    const state = await stateAt(cell);
    const level = waterLevel(state);
    const accepted = level !== null && (
      record.level === 8
      || (record.level === 1 && [0, 8].includes(level))
      || (record.level >= 2 && record.level <= 7 && level === record.level - 1)
    );
    if (!accepted) continue;
    upstream.push({ cell, state, target: targetByKey.has(cellKey(cell)) });
    if (targetByKey.has(cellKey(cell))) {
      dependencyEdges.push({ downstream: record.cell, upstream: cell });
    } else {
      externalUpstream.set(cellKey(cell), { cell, state });
    }
  }
  invariant(upstream.length > 0,
    `PF05 flow cell ${cellKey(record.cell)} has no exact upstream dependency`);
}
const dependencyEdgeLines = dependencyEdges
  .map(({ downstream, upstream }) => `${cellKey(downstream)}>${cellKey(upstream)}`)
  .sort();
const dependencyEdgeSetSha256 = sha256(`${dependencyEdgeLines.join('\n')}\n`);
invariant(dependencyEdges.length === EXPECTED.dependencyEdgeCount
  && dependencyEdgeSetSha256 === EXPECTED.dependencyEdgeSetSha256,
'PF05 exact flow-dependency graph drifted');
invariant(externalUpstream.size === 1
  && externalUpstream.get('1702,48,108')?.state === 'minecraft:water[level=8]',
'PF05 target graph is not fed solely by the reviewed retained boundary feed');

// Edges point downstream -> upstream. Kahn order begins with cells that have
// no downstream dependents, producing the required downstream-first sequence.
const incoming = new Map(fluidRecords.map(({ cell }) => [cellKey(cell), 0]));
const outgoing = new Map(fluidRecords.map(({ cell }) => [cellKey(cell), []]));
for (const { downstream, upstream } of dependencyEdges) {
  const downstreamKey = cellKey(downstream);
  const upstreamKey = cellKey(upstream);
  outgoing.get(downstreamKey).push(upstreamKey);
  incoming.set(upstreamKey, incoming.get(upstreamKey) + 1);
}
const ready = [...incoming.entries()]
  .filter(([, count]) => count === 0).map(([key]) => key).sort();
const forwardKeys = [];
while (ready.length) {
  const key = ready.shift();
  forwardKeys.push(key);
  for (const upstreamKey of outgoing.get(key)) {
    incoming.set(upstreamKey, incoming.get(upstreamKey) - 1);
    if (incoming.get(upstreamKey) === 0) {
      ready.push(upstreamKey);
      ready.sort();
    }
  }
}
const forwardOrderedSha256 = sha256(`${forwardKeys.join('\n')}\n`);
invariant(forwardKeys.length === fluidRecords.length
  && forwardOrderedSha256 === EXPECTED.forwardOrderedSha256,
'PF05 flow graph is cyclic or its downstream-first order drifted');
const forwardRecords = forwardKeys.map((key) => targetByKey.get(key));

const blockEntityIntersections = [];
const savedEntityIntersections = [];
const touchedChunks = [];
for (let cx = Math.floor(interactionBounds.minX / 16);
  cx <= Math.floor(interactionBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(interactionBounds.minZ / 16);
    cz <= Math.floor(interactionBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, interactionBounds)) {
        blockEntityIntersections.push({ id: entity.id ?? null, point });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, interactionBounds)) {
        savedEntityIntersections.push({
          id: entity.id ?? null,
          position: entity.Pos.slice(0, 3).map(Number),
        });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0,
'PF05 feed interaction bounds intersect a block entity');
invariant(savedEntityIntersections.length === 0,
'PF05 feed interaction bounds intersect a saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = fluidCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'PF05 targets intersect a protected relic core');

const priorIntersections = [];
for (const manifestPath of INPUTS.acceptedPriorManifests) {
  invariant(fs.existsSync(absolute(manifestPath)), `missing accepted prior manifest ${manifestPath}`);
  const prior = readJson(manifestPath);
  for (const pkg of prior.packages) {
    const cells = targetIntersections(pkg.forward, fluidCells);
    if (cells.length) priorIntersections.push({
      transactionId: prior.transactionId,
      packageKey: pkg.key,
      manifestPath,
      ...classManifest(cells),
    });
  }
}
invariant(priorIntersections.length === 0,
  `PF05 targets intersect accepted prior operations: ${JSON.stringify(priorIntersections)}`);

const forwardBody = `${forwardRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackBody = `${forwardRecords.slice().reverse()
  .map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState))
  .join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${PACKAGE_KEY} ${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(fluidCells)}`,
  `# flow-order SHA-256: ${forwardOrderedSha256}`,
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
  scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    intraPackageForward: 'DOWNSTREAM_TO_UPSTREAM_TOPOLOGICAL',
    intraPackageRollback: 'UPSTREAM_TO_DOWNSTREAM_EXACT_REVERSE',
    rationale: 'Remove every downstream dependent before its upstream guard; recreate the original equilibrium from the retained feed toward the fan edge.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    platformId: PLATFORM_ID,
    assignedTrack: platform.assignedTrack,
    purpose: 'Create a fail-closed dry PF05 work liner from one exact acyclic flowing-water fan without modifying its retained upstream source.',
    geometry: {
      chamber: classManifest(cellsIn(chamberBounds)),
      exactHalo: classManifest(halo),
      retainedFeedInteractionBounds: interactionBounds,
      flowTargets: classManifest(fluidCells),
      temporaryInteriorLiner: classManifest(insideFluidCells),
      retainedContainmentLiner: classManifest(containmentFluidCells),
      retainedUpstreamFeed: classManifest(RETAINED_FEED.map(({ cell }) => cell)),
    },
    sourceStateDoctrine: {
      exactAcceptedStates: Object.keys(EXPECTED.sourceStateCensus).sort(),
      exactAcceptedStateCensus: EXPECTED.sourceStateCensus,
      sourceWaterTargeted: false,
      flowingWaterLevelsAccepted: [1, 2, 3, 4, 5, 6, 7, 8],
      waterloggedStateAccepted: false,
      lavaAccepted: false,
      undeclaredFluidStateAccepted: false,
    },
    operationalBoundary: {
      platformFitoutPerformed: false,
      trackCommissioned: false,
      futureLineOpeningCreated: false,
      retainedUpstreamSourceModified: false,
      rollbackRestoresEveryOriginalState: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
    sourceStateCensus,
    retainedFeed: feedRecords,
  },
  flowDependencyContract: {
    status: 'PASS_ACYCLIC_SINGLE_RETAINED_FEED',
    targetCount: fluidRecords.length,
    edgeCount: dependencyEdges.length,
    edgeSetSha256: dependencyEdgeSetSha256,
    externalUpstreamTargetBoundaryCount: externalUpstream.size,
    forwardOrder: {
      semantic: 'downstream-to-upstream',
      orderedCellKeySha256: forwardOrderedSha256,
      firstCell: forwardRecords[0].cell,
      lastCell: forwardRecords.at(-1).cell,
    },
    rollbackOrder: {
      semantic: 'upstream-to-downstream',
      exactReverseOfForward: true,
      firstCell: forwardRecords.at(-1).cell,
      lastCell: forwardRecords[0].cell,
    },
  },
  target: {
    operatedUnion: classManifest(fluidCells),
    desiredStateCensus: { [LINER_STATE]: fluidRecords.length },
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: fluidRecords.length,
      rollbackCommandCount: fluidRecords.length,
      targetCellCount: fluidRecords.length,
      targetCoordinateSetSha256: hashCells(fluidCells),
      forwardOrderedCellKeySha256: forwardOrderedSha256,
      exactInverse: true,
    },
  },
  isolation: {
    undeclaredFluidStateCount: 0,
    forbiddenContainerOrControlInteractionCount: forbiddenInteractionBlocks.length,
    blockEntityInteractionCount: blockEntityIntersections.length,
    savedEntityInteractionCount: savedEntityIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    undeclaredPriorReleaseIntersectionCount: priorIntersections.length,
  },
  physicsContract: {
    status: 'PASS_FAIL_CLOSED_TOPOLOGICAL_FLOW_ORDER',
    forwardRiskControl: 'Every downstream dependent is replaced before every target that supplies it; the final target is the falling boundary cell directly below the retained feed.',
    rollbackRiskControl: 'Exact reverse order recreates the equilibrium from the retained boundary feed outward; every guarded source is solid until its restoration command.',
    residualRuntimeTickRisk: 'A scheduled tick that changes any not-yet-operated exact flow state causes strict-noop failure and mandatory compensating rollback; continuation or source-family substitution is forbidden.',
    irreducibleUnsafeTickRace: false,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  hardSafetyKernelNext: [
    'independent manifest/exact-inverse and authored-order QA',
    'fresh complete-save and exact ordered source preflight',
    'strict-noop parser checks and projected exact rollback preflight',
    'block-entity and fresh live-entity clearance',
    'journaled execution with immediate stop and compensating rollback on any tick-driven strict guard drift',
    'fresh post save and exact rollback post-state preflight',
    'compile the PF05 fit-out only from the accepted dry-liner post save',
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
  platformId: PLATFORM_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  sourceStateCensus,
  flowTargetCellCount: fluidRecords.length,
  dependencyEdgeCount: dependencyEdges.length,
  forwardOrderedSha256,
  retainedFeedCellCount: RETAINED_FEED.length,
  irreducibleUnsafeTickRace: false,
  forward,
  rollback,
}, null, 2));
