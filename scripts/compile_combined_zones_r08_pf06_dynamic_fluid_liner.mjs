#!/usr/bin/env node
/**
 * Compile the exact EE-PF-06 dynamic-fluid containment liner.
 *
 * PF06 contains 99 stable source-water cells and one exact waterlogged glow
 * lichen. The lichen is attached to a granite cell immediately south of the
 * normal platform halo. This compiler does not broaden the generic fluid
 * policy: it admits only that exact point/state and brings its one support
 * cell into the reversible package. Forward execution removes the lichen
 * before replacing the support; rollback restores the support before the
 * lichen. No flowing water, other waterlogged state, or inferred fluid state
 * is accepted.
 *
 * This compiler is offline. It performs no live call or world mutation.
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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:03:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08g-post-20260821T170100Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08g-live-20260821T170100Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner',
);

const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const RELEASE_ID = 'CZ-R08H-EE-PF-06-DYNAMIC-FLUID-LINER';
const PLATFORM_ID = 'EE-PF-06';
const FLUID_PACKAGE_KEY = 'ee-pf-06-dynamic-fluid-liner';
const SUPPORT_PACKAGE_KEY = 'ee-pf-06-lichen-support-anchor';
const LINER_STATE = 'minecraft:deepslate_tiles';
const SOURCE_WATER_STATE = 'minecraft:water[level=0]';
const LICHEN_STATE = 'minecraft:glow_lichen[down=false,east=false,north=false,south=true,up=false,waterlogged=true,west=false]';
const LICHEN_CELL = Object.freeze({ x: 1658, y: 46, z: 128 });
const SUPPORT_CELL = Object.freeze({ x: 1658, y: 46, z: 129 });
const SUPPORT_SOURCE_STATE = 'minecraft:granite';
const EXPECTED = Object.freeze({
  fluidCellCount: 100,
  sourceWaterCellCount: 99,
  waterloggedLichenCellCount: 1,
  fluidCoordinateSetSha256: '99e9ce70744b295160fa12cdeea18f111d8c6c5e3623b6711597f34ebc6e7d07',
  insideFluidCellCount: 58,
  insideFluidCoordinateSetSha256: '6a6815b7e0fc8edf375c0e9a4ec1986c8655d4556a632d974b709a7bd0012754',
  containmentFluidCellCount: 42,
  containmentFluidCoordinateSetSha256: '1ae90b7b23107254c67aebb805d99a531f61e15e6a3a0ad393b145a7678bad51',
  operatedCellCount: 101,
});
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
  if (!condition) throw new Error(`R08 PF06 dynamic-fluid compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  ['minecraft:water', 'minecraft:lava'].includes(blockName(state))
  || state.includes('waterlogged=true')
);
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
invariant(platform?.assignedTrack === 6, 'frozen PF06 platform metadata drifted');
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
const interactionBounds = { ...haloBounds, maxZ: SUPPORT_CELL.z };
const chamberKeys = new Set(cellsIn(chamberBounds).map(cellKey));
const halo = cellsIn(haloBounds);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

const fluidRecords = [];
const forbiddenInteractionBlocks = [];
for (const cell of cellsIn(interactionBounds)) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (insideBounds(cell, haloBounds) && isFluid(sourceState)) {
    fluidRecords.push({
      cell,
      sourceState,
      targetState: LINER_STATE,
      insideChamber: chamberKeys.has(cellKey(cell)),
    });
  }
  if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    forbiddenInteractionBlocks.push({ cell, sourceState });
  }
}
fluidRecords.sort((left, right) => (
  right.cell.y - left.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const fluidCells = fluidRecords.map(({ cell }) => cell);
const insideFluidCells = fluidRecords
  .filter(({ insideChamber }) => insideChamber).map(({ cell }) => cell);
const containmentFluidCells = fluidRecords
  .filter(({ insideChamber }) => !insideChamber).map(({ cell }) => cell);
const sourceWaterRecords = fluidRecords.filter(({ sourceState }) => sourceState === SOURCE_WATER_STATE);
const lichenRecords = fluidRecords.filter(({ sourceState }) => sourceState === LICHEN_STATE);
const undeclaredDynamicRecords = fluidRecords.filter(({ sourceState, cell }) => !(
  sourceState === SOURCE_WATER_STATE
  || (cellKey(cell) === cellKey(LICHEN_CELL) && sourceState === LICHEN_STATE)
));
invariant(fluidRecords.length === EXPECTED.fluidCellCount
  && hashCells(fluidCells) === EXPECTED.fluidCoordinateSetSha256,
'PF06 fluid set drifted from the reviewed exact 100-cell pocket');
invariant(sourceWaterRecords.length === EXPECTED.sourceWaterCellCount
  && lichenRecords.length === EXPECTED.waterloggedLichenCellCount
  && cellKey(lichenRecords[0]?.cell ?? {}) === cellKey(LICHEN_CELL),
'PF06 source-water/waterlogged-lichen partition drifted');
invariant(undeclaredDynamicRecords.length === 0,
  `undeclared flowing or waterlogged states: ${JSON.stringify(undeclaredDynamicRecords.slice(0, 20))}`);
invariant(insideFluidCells.length === EXPECTED.insideFluidCellCount
  && hashCells(insideFluidCells) === EXPECTED.insideFluidCoordinateSetSha256,
'PF06 interior fluid partition drifted');
invariant(containmentFluidCells.length === EXPECTED.containmentFluidCellCount
  && hashCells(containmentFluidCells) === EXPECTED.containmentFluidCoordinateSetSha256,
'PF06 retained-containment fluid partition drifted');
invariant(forbiddenInteractionBlocks.length === 0,
'PF06 extended interaction bounds intersect a container or control block');

const supportSourceState = stateToCommandString(await reader.blockState(
  SUPPORT_CELL.x, SUPPORT_CELL.y, SUPPORT_CELL.z,
));
invariant(supportSourceState === SUPPORT_SOURCE_STATE,
  `waterlogged lichen south support drifted: ${supportSourceState}`);
const supportRecord = {
  cell: SUPPORT_CELL,
  sourceState: SUPPORT_SOURCE_STATE,
  targetState: LINER_STATE,
};
const operatedCells = uniqueCells([...fluidCells, SUPPORT_CELL]);
invariant(operatedCells.length === EXPECTED.operatedCellCount,
'fluid and support targets are not an exact disjoint 101-cell union');

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
'PF06 extended interaction bounds intersect a block entity');
invariant(savedEntityIntersections.length === 0,
'PF06 extended interaction bounds intersect a saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = operatedCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'PF06 targets intersect a protected relic core');

const priorIntersections = [];
for (const manifestPath of INPUTS.acceptedPriorManifests) {
  invariant(fs.existsSync(absolute(manifestPath)), `missing accepted prior manifest ${manifestPath}`);
  const prior = readJson(manifestPath);
  for (const pkg of prior.packages) {
    const cells = targetIntersections(pkg.forward, operatedCells);
    if (cells.length) priorIntersections.push({
      transactionId: prior.transactionId,
      packageKey: pkg.key,
      manifestPath,
      ...classManifest(cells),
    });
  }
}
invariant(priorIntersections.length === 0,
  `PF06 targets intersect accepted prior operations: ${JSON.stringify(priorIntersections)}`);

const fluidForwardBody = `${fluidRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const fluidRollbackBody = `${fluidRecords.slice().reverse()
  .map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState))
  .join('\n')}\n`;
const supportForwardBody = `${replLine(
  supportRecord.cell, supportRecord.sourceState, supportRecord.targetState,
)}\n`;
const supportRollbackBody = `${replLine(
  supportRecord.cell, supportRecord.targetState, supportRecord.sourceState,
)}\n`;
const operations = {
  [FLUID_PACKAGE_KEY]: {
    forwardBody: fluidForwardBody,
    rollbackBody: fluidRollbackBody,
    targetCells: fluidCells,
  },
  [SUPPORT_PACKAGE_KEY]: {
    forwardBody: supportForwardBody,
    rollbackBody: supportRollbackBody,
    targetCells: [SUPPORT_CELL],
  },
};

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [];
const operationManifest = {};
for (const [key, definition] of Object.entries(operations)) {
  const forwardSha256 = sha256(definition.forwardBody);
  const rollbackSha256 = sha256(definition.rollbackBody);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${hashCells(definition.targetCells)}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${definition.forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${definition.rollbackBody}`);
  packages.push({ key, forward, rollback });
  operationManifest[key] = {
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: definition.targetCells.length,
    rollbackCommandCount: definition.targetCells.length,
    targetCellCount: definition.targetCells.length,
    targetCoordinateSetSha256: hashCells(definition.targetCells),
    exactInverse: true,
  };
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
  packages,
  executionOrder: {
    forward: [FLUID_PACKAGE_KEY, SUPPORT_PACKAGE_KEY],
    rollback: [SUPPORT_PACKAGE_KEY, FLUID_PACKAGE_KEY],
    rationale: 'Remove the exact waterlogged lichen while its granite support remains; then own that support. Restore granite before restoring the exact waterlogged lichen.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    platformId: PLATFORM_ID,
    assignedTrack: platform.assignedTrack,
    purpose: 'Create a fail-closed dry PF06 work liner while preserving exact rollback of its one reviewed waterlogged-lichen point and support.',
    geometry: {
      chamber: classManifest(cellsIn(chamberBounds)),
      exactHalo: classManifest(halo),
      extendedInteractionBounds: interactionBounds,
      dynamicFluidTargets: classManifest(fluidCells),
      temporaryInteriorLiner: classManifest(insideFluidCells),
      retainedContainmentLiner: classManifest(containmentFluidCells),
      lichenSupportAnchor: classManifest([SUPPORT_CELL]),
      operatedUnion: classManifest(operatedCells),
    },
    materialDoctrine: {
      linerState: LINER_STATE,
      stableSourceWaterState: SOURCE_WATER_STATE,
      stableSourceWaterAccepted: true,
      flowingWaterAccepted: false,
      broadWaterloggedStateAccepted: false,
      exactWaterloggedException: {
        cell: LICHEN_CELL,
        sourceState: LICHEN_STATE,
        supportDirection: 'south',
        supportCell: SUPPORT_CELL,
        supportSourceState: SUPPORT_SOURCE_STATE,
        exceptionCount: 1,
      },
    },
    operationalBoundary: {
      platformFitoutPerformed: false,
      trackCommissioned: false,
      futureLineOpeningCreated: false,
      rollbackRestoresEveryOriginalState: true,
      rollbackRestoresSupportBeforeWaterloggedLichen: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
    fluidSourceStateCensus: census(fluidRecords, 'sourceState'),
    supportSourceState: SUPPORT_SOURCE_STATE,
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: { [LINER_STATE]: EXPECTED.operatedCellCount },
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  isolation: {
    undeclaredDynamicFluidStateCount: undeclaredDynamicRecords.length,
    forbiddenContainerOrControlInteractionCount: forbiddenInteractionBlocks.length,
    blockEntityInteractionCount: blockEntityIntersections.length,
    savedEntityInteractionCount: savedEntityIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    undeclaredPriorReleaseIntersectionCount: priorIntersections.length,
  },
  physicsContract: {
    status: 'PASS_EXACT_ORDERED_WATERLOGGED_POINT_WITH_OWNED_SUPPORT',
    forwardRiskControl: 'The lichen-to-liner transition precedes the support transition, so the lichen cannot lose attachment before its exact source guard executes.',
    rollbackRiskControl: 'The support rollback executes first, so the exact south=true waterlogged lichen state is restored only after granite attachment exists.',
    otherDynamicStatesAccepted: false,
    irreduciblePhysicsRisk: 'NONE_BEYOND_SOURCE_DRIFT_CAUGHT_BY_EXACT_STRICT_GUARDS',
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  hardSafetyKernelNext: [
    'independent manifest/exact-inverse QA for both disjoint packages',
    'fresh complete-save and exact source preflight for both packages',
    'ordered projected rollback: support-anchor rollback then dynamic-fluid rollback',
    'strict-noop parser checks, block-entity clearance, and live-entity clearance',
    'journaled execution, fresh post save, and ordered rollback post-state preflight',
    'compile the PF06 fit-out only from the accepted dry-liner post save',
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
  sourceStateCensus: census(fluidRecords, 'sourceState'),
  fluidTargetCellCount: fluidCells.length,
  supportAnchorCellCount: 1,
  operatedCellCount: operatedCells.length,
  executionOrder: manifestWithoutIdentity.executionOrder,
}, null, 2));
