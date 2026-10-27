#!/usr/bin/env node
/**
 * Compile an exact source-fluid liner for one Empty Eight platform halo.
 *
 * The first release uses EE-PF-04. Every fluid cell in its one-cell chamber
 * halo is a stable source block. The package replaces only those exact cells
 * with deepslate tiles. Cells inside the chamber become a temporary dry work
 * liner consumed by the later fit-out; halo-only cells remain its containment
 * boundary. No drain, flowing-fluid inference, or broad fill is permitted.
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
const GENERATED_AT = value('--generated-at', '2026-08-21T16:45:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r10a-live-20260821T163935Z/post-complete-save-intake.json',
);
const PLATFORM_ID = value('--platform-id', 'EE-PF-04');
const PLATFORM_CODE = PLATFORM_ID.match(/^EE-PF-(\d{2})$/)?.[1];
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  `combined-zones-r08-empty-eight-platform-${PLATFORM_CODE ?? 'unknown'}-wet-liner`,
);
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const PACKAGE_KEY = `${PLATFORM_ID.toLowerCase()}-source-fluid-liner`;
const LINER_STATE = 'minecraft:deepslate_tiles';
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
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
  if (!condition) throw new Error(`R08 wet-platform liner compiler rejected: ${message}`);
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
  for (const record of records) {
    counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  }
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
invariant(platform && PLATFORM_CODE && platform.assignedTrack === Number(PLATFORM_CODE),
  'selected frozen platform is missing or has a mismatched track assignment');
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
const chamberKeys = new Set(cellsIn(chamberBounds).map(cellKey));
const halo = cellsIn(haloBounds);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const fluidRecords = [];
const forbiddenHaloBlocks = [];
for (const cell of halo) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (isFluid(sourceState)) {
    fluidRecords.push({
      cell,
      sourceState,
      targetState: LINER_STATE,
      insideChamber: chamberKeys.has(cellKey(cell)),
    });
  }
  if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    forbiddenHaloBlocks.push({ cell, sourceState });
  }
}
invariant(fluidRecords.length > 0, 'selected platform halo has no fluid to line');
const unstableFluidRecords = fluidRecords.filter(({ sourceState }) => (
  !['minecraft:water[level=0]', 'minecraft:lava[level=0]'].includes(sourceState)
));
invariant(unstableFluidRecords.length === 0,
  `flowing or waterlogged state requires a different liner strategy: ${JSON.stringify(unstableFluidRecords.slice(0, 20))}`);
invariant(forbiddenHaloBlocks.length === 0,
  'platform liner halo intersects a container or control block');

fluidRecords.sort((left, right) => (
  right.cell.y - left.cell.y
  || left.cell.x - right.cell.x
  || left.cell.z - right.cell.z
));
const targetCells = fluidRecords.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(targetKeys.size === fluidRecords.length, 'fluid target list contains duplicates');
const insideTargets = fluidRecords.filter(({ insideChamber }) => insideChamber).map(({ cell }) => cell);
const containmentTargets = fluidRecords.filter(({ insideChamber }) => !insideChamber).map(({ cell }) => cell);

const blockEntityIntersections = [];
const savedEntityIntersections = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, haloBounds)) blockEntityIntersections.push({ id: entity.id, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) {
        savedEntityIntersections.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0,
  'platform liner halo intersects a block entity');
invariant(savedEntityIntersections.length === 0,
  'platform liner halo intersects a saved movable entity');
const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = targetCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
  'platform liner targets intersect a protected relic core');

const forwardBody = `${fluidRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackBody = `${fluidRecords.slice().reverse().map(({ cell, sourceState, targetState }) => (
  replLine(cell, targetState, sourceState)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - R08 ${PLATFORM_ID} source-fluid liner (${role})`,
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
  status: 'COMPILED_FROM_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Replace exact stable source-fluid cells with a reversible dry work liner.',
  },
  scope: {
    releaseId: `CZ-R08-${PLATFORM_ID}-SOURCE-FLUID-LINER`,
    releaseNodeId: RELEASE_NODE_ID,
    platformId: PLATFORM_ID,
    assignedTrack: platform.assignedTrack,
    purpose: 'Create an exact dry work liner for the selected platform without draining or opening any transport interface.',
    geometry: {
      chamber: classManifest(cellsIn(chamberBounds)),
      exactHalo: classManifest(halo),
      fluidSourceTargets: classManifest(targetCells),
      temporaryInteriorLiner: classManifest(insideTargets),
      retainedContainmentLiner: classManifest(containmentTargets),
    },
    materialDoctrine: {
      linerState: LINER_STATE,
      onlyStableSourceFluidAccepted: true,
      flowingFluidAccepted: false,
      waterloggedStateAccepted: false,
    },
    operationalBoundary: {
      platformFitoutPerformed: false,
      trackCommissioned: false,
      futureLineOpeningCreated: false,
      rollbackRestoresExactFluidStates: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
    sourceStateCensus: census(fluidRecords, 'sourceState'),
  },
  target: {
    operatedUnion: classManifest(targetCells),
    desiredStateCensus: census(fluidRecords, 'targetState'),
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: fluidRecords.length,
      rollbackCommandCount: fluidRecords.length,
      targetCellCount: fluidRecords.length,
      targetCoordinateSetSha256: hashCells(targetCells),
      exactInverse: true,
    },
  },
  isolation: {
    unstableFluidStateCount: unstableFluidRecords.length,
    forbiddenContainerOrControlHaloCount: forbiddenHaloBlocks.length,
    blockEntityHaloIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    undeclaredPriorReleaseIntersectionCount: 0,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  hardSafetyKernelNext: [
    'independent manifest/exact-inverse QA',
    'fresh complete-save and exact source preflight',
    'strict-noop parser checks and live entity clearance',
    'journaled execution, fresh post save, and rollback post-state preflight',
    'compile the platform fit-out only from the accepted dry-liner post save',
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
  fluidSourceCellCount: fluidRecords.length,
  temporaryInteriorLinerCellCount: insideTargets.length,
  retainedContainmentLinerCellCount: containmentTargets.length,
  sourceStateCensus: census(fluidRecords, 'sourceState'),
  forward,
  rollback,
}, null, 2));
