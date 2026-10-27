#!/usr/bin/env node
/**
 * Compile CZ-R09A: the first independently releasable public-core fit-out.
 *
 * The accepted B07-C-WEST-2 shaft geometry contains a dry 9x7 lower lobby at
 * Y=-59..-53. This package installs only its supported Y=-59 floor, using the
 * authored Houston lobby palette. It leaves the wet observation transfer,
 * shaft mechanisms, walls, headroom, entities, containers, fluids, and relics
 * untouched. Rollback restores the exact R02-achieved air state.
 *
 * This compiler is offline. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  deriveD06DetailedMechanismLayers,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:45:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08b-live-20260821T162429Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r09-b07-lower-lobby-floor';
const RELEASE_ID = 'CZ-R09A-P1-B07-LOWER-LOBBY-FLOOR';
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-lower-lobby-floor';
const SOURCE_STATE = 'minecraft:air';
const PRIMARY_STATE = 'minecraft:polished_andesite';
const SECONDARY_STATE = 'minecraft:polished_diorite';

const INPUTS = Object.freeze({
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  houstonContractorBrief: 'docs/masterplans/03-houston-tunnel-system/06-contractor/contractor-brief.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
  ],
});

const EXPECTED = Object.freeze({
  b07ConstructionCellCount: 8134,
  b07D06ConstructionSha256:
    'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  floorCellCount: 63,
  floorCoordinateSetSha256:
    '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
  primaryCellCount: 36,
  secondaryCellCount: 27,
  intentionalR02OverlapCellCount: 63,
});

const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
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
  if (!condition) throw new Error(`R09 B07 lower-lobby compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const samePath = (left, right) => absolute(left) === absolute(right);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function sourceCensus(records) {
  const census = new Map();
  for (const { sourceState } of records) {
    census.set(sourceState, (census.get(sourceState) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function targetCensus(records) {
  const census = new Map();
  for (const { targetState } of records) {
    census.set(targetState, (census.get(targetState) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const intersections = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(
        /(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g,
      )) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        if (targetKeys.has(cellKey(cell))) {
          intersections.set(cellKey(cell), { cell, kind: 'CMD', operation: raw });
        }
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const [rx1, ry1, rz1, rx2, ry2, rz2] = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(rx1, rx2), maxX: Math.max(rx1, rx2),
      minY: Math.min(ry1, ry2), maxY: Math.max(ry1, ry2),
      minZ: Math.min(rz1, rz2), maxZ: Math.max(rz1, rz2),
    };
    const minX = Math.max(bounds.minX, targetBounds.minX);
    const maxX = Math.min(bounds.maxX, targetBounds.maxX);
    const minY = Math.max(bounds.minY, targetBounds.minY);
    const maxY = Math.min(bounds.maxY, targetBounds.maxY);
    const minZ = Math.max(bounds.minZ, targetBounds.minZ);
    const maxZ = Math.min(bounds.maxZ, targetBounds.maxZ);
    if (minX > maxX || minY > maxY || minZ > maxZ) continue;
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) {
            intersections.set(cellKey(cell), {
              cell,
              kind: 'REPL',
              sourceState: fields[7],
              targetState: fields[8],
            });
          }
        }
      }
    }
  }
  return [...intersections.values()];
}

const mechanisms = readJson(INPUTS.d06Mechanisms);
const detailed = readJson(INPUTS.d06Detailed);
const emptyEight = readJson(INPUTS.emptyEight);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const houstonBrief = readJson(INPUTS.houstonContractorBrief);
const r03Manifest = readJson(INPUTS.r03Manifest);
const r06Manifest = readJson(INPUTS.r06Manifest);
const intake = readJson(INTAKE_AUDIT);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover the R09 release node');
invariant(!authorization.mvpBoundary.excludedScopeIds.includes('P1-B07'),
'P1-B07 is excluded from the authorized MVP boundary');
invariant(houstonBrief.block_palette?.lobby_floor?.primary === 'polished_andesite'
  && houstonBrief.block_palette?.lobby_floor?.secondary === 'polished_diorite',
'Houston lobby-floor palette drifted');
invariant(r03Manifest.manifestIdentity
  === 'a9fd5777da7b0d0769f55240007eed0a54f0aa36a4954883cf98bfc2f7a080f8',
'accepted R03/R04 tunnel manifest identity drifted');
invariant(r06Manifest.manifestIdentity
  === 'b671d1f88137951ca0b1e25cf3e2c93e7db4d87b30db614223925af28e12bf07',
'accepted R06 support/liner manifest identity drifted');

const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const b07 = deriveB07WestTwo(b07System);
invariant(b07.construction.length === EXPECTED.b07ConstructionCellCount
  && hashCells(b07.construction, 'combined-zones-d06-life-safety-cell-set-v1')
    === EXPECTED.b07D06ConstructionSha256,
'accepted B07-C-WEST-2 construction identity drifted');

const floor = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -59, maxY: -59,
  minZ: -431, maxZ: -425,
});
const floorKeys = new Set(floor.map(cellKey));
const b07Keys = new Set(b07.construction.map(cellKey));
invariant(floor.length === EXPECTED.floorCellCount
  && hashCells(floor) === EXPECTED.floorCoordinateSetSha256,
'lower-lobby floor identity drifted');
invariant(floor.every((cell) => b07Keys.has(cellKey(cell))),
'lower-lobby floor leaves the accepted B07 construction reservation');

const materialDesign = floor.map((cell) => ({
  cell,
  targetState: cell.z >= -429 && cell.z <= -427
    ? SECONDARY_STATE : PRIMARY_STATE,
}));
const primaryCells = materialDesign
  .filter(({ targetState }) => targetState === PRIMARY_STATE)
  .map(({ cell }) => cell);
const secondaryCells = materialDesign
  .filter(({ targetState }) => targetState === SECONDARY_STATE)
  .map(({ cell }) => cell);
invariant(primaryCells.length === EXPECTED.primaryCellCount
  && secondaryCells.length === EXPECTED.secondaryCellCount,
'lower-lobby palette partition drifted');

const haloBounds = {
  minX: 2102, maxX: 2112,
  minY: -60, maxY: -58,
  minZ: -432, maxZ: -424,
};
const halo = cellsIn(haloBounds);
const support = floor.map(({ x, z }) => ({ x, y: -60, z }));
const standingPlane = floor.map(({ x, z }) => ({ x, y: -58, z }));
const headPlane = floor.map(({ x, z }) => ({ x, y: -57, z }));

const { proposalUnion: d06MechanismUnion } = deriveD06DetailedMechanismLayers(
  mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  detailed,
);
const mechanismKeys = new Set(d06MechanismUnion.map(cellKey));
const mechanismHaloIntersections = halo.filter((cell) => mechanismKeys.has(cellKey(cell)));
invariant(mechanismHaloIntersections.length === 0,
'lower-lobby interaction halo intersects a frozen D06 mechanism cell');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const haloViolations = [];
for (const cell of halo) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = blockName(sourceState);
  if (isFluid(sourceState) || GRAVITY_BLOCKS.has(name) || FORBIDDEN_SOURCE_BLOCKS.has(name)) {
    haloViolations.push({
      cell,
      sourceState,
      fluid: isFluid(sourceState),
      gravity: GRAVITY_BLOCKS.has(name),
      forbiddenContainerOrControl: FORBIDDEN_SOURCE_BLOCKS.has(name),
    });
  }
}
invariant(haloViolations.length === 0,
  `fluid/gravity/container/control state exists in the exact floor halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);

const supportRecords = [];
for (const cell of support) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  supportRecords.push({ cell, sourceState });
}
const supportViolations = supportRecords.filter(({ sourceState }) => (
  AIR_BLOCKS.has(blockName(sourceState))
  || isFluid(sourceState)
  || GRAVITY_BLOCKS.has(blockName(sourceState))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))
));
invariant(supportViolations.length === 0,
  `lower-lobby floor lacks exact stable support: ${JSON.stringify(supportViolations.slice(0, 20))}`);

const headroomViolations = [];
for (const cell of [...standingPlane, ...headPlane]) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (!AIR_BLOCKS.has(blockName(sourceState))) headroomViolations.push({ cell, sourceState });
}
invariant(headroomViolations.length === 0,
  `lower-lobby standing/head plane is obstructed: ${JSON.stringify(headroomViolations.slice(0, 20))}`);

const operations = [];
for (const design of materialDesign) {
  const sourceState = stateToCommandString(await reader.blockState(
    design.cell.x, design.cell.y, design.cell.z,
  ));
  invariant(sourceState === SOURCE_STATE,
    `floor target ${cellKey(design.cell)} is ${sourceState}, expected exact R02 air`);
  operations.push({ ...design, sourceState });
}

const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityHaloIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (insideBounds(point, haloBounds)) {
      blockEntityHaloIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
'lower-lobby interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'lower-lobby interaction halo intersects a saved movable entity');

const protectedRelicHaloIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = halo.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedRelicHaloIntersections.push({
    relic: relic.key,
    ...classManifest(cells),
  });
}
invariant(protectedRelicHaloIntersections.length === 0,
'lower-lobby interaction halo intersects a protected relic core');

const priorReleaseIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const declaredHash = manifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${manifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const intersections = priorOperationIntersections(pkg.forward, floorKeys, boundsOf(floor));
    if (intersections.length) {
      priorReleaseIntersections.push({
        packageId: `${manifest.transactionId}/${pkg.key}`,
        operationPath: pkg.forward,
        ...classManifest(intersections.map(({ cell }) => cell)),
        transitionCensus: Object.fromEntries([...intersections.reduce((census, entry) => {
          const transition = entry.kind === 'REPL'
            ? `${entry.sourceState}->${entry.targetState}` : 'CMD';
          census.set(transition, (census.get(transition) ?? 0) + 1);
          return census;
        }, new Map()).entries()].sort()),
      });
    }
  }
}
invariant(priorReleaseIntersections.length === 1
  && priorReleaseIntersections[0].packageId
    === 'combined-zones-r02-d06-shell/d06-reservations'
  && priorReleaseIntersections[0].cellCount === EXPECTED.intentionalR02OverlapCellCount
  && priorReleaseIntersections[0].coordinateSetSha256
    === EXPECTED.floorCoordinateSetSha256
  && Object.keys(priorReleaseIntersections[0].transitionCensus)
    .every((transition) => transition.endsWith(`->${SOURCE_STATE}`)),
'prior-release overlap is not exactly the declared R02 air reservation');

// Three exact rectangular bands preserve the complete source-state guards
// while reducing 63 floor cells to three deterministic operations.
const operationBands = [
  { minX: 2103, maxX: 2111, minZ: -431, maxZ: -430, targetState: PRIMARY_STATE },
  { minX: 2103, maxX: 2111, minZ: -429, maxZ: -427, targetState: SECONDARY_STATE },
  { minX: 2103, maxX: 2111, minZ: -426, maxZ: -425, targetState: PRIMARY_STATE },
];
const expandedBandCells = uniqueCells(operationBands.flatMap((band) => cellsIn({
  minX: band.minX, maxX: band.maxX,
  minY: -59, maxY: -59,
  minZ: band.minZ, maxZ: band.maxZ,
})));
invariant(expandedBandCells.length === floor.length
  && hashCells(expandedBandCells) === hashCells(floor),
'merged operation bands do not exactly cover the floor');

const forwardBody = `${operationBands.map((band) => (
  `REPL ${band.minX} -59 ${band.minZ} ${band.maxX} -59 ${band.maxZ} ${SOURCE_STATE} ${band.targetState}`
)).join('\n')}\n`;
const rollbackBody = `${operationBands.slice().reverse().map((band) => (
  `REPL ${band.minX} -59 ${band.minZ} ${band.maxX} -59 ${band.maxZ} ${band.targetState} ${SOURCE_STATE}`
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${EXPECTED.floorCoordinateSetSha256}`,
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
  status: 'COMPILED_FROM_ACCEPTED_R08B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B07', 'Z06-PUBLIC-SHAFT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static, independently reversible floor package.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    mvpScope: true,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Turn the exact dry B07 lower-lobby base into a supported, walkable public-core landing without commissioning shaft transport.',
    geometry: {
      acceptedB07Construction: classManifest(b07.construction),
      lowerLobbyFloor: classManifest(floor),
      primaryFinish: classManifest(primaryCells),
      secondaryAisle: classManifest(secondaryCells),
      stableFoundationContacts: {
        ...classManifest(support),
        sourceStateCensus: sourceCensus(supportRecords),
        unsupportedCellCount: supportViolations.length,
      },
      clearStandingPlane: classManifest(standingPlane),
      clearHeadPlane: classManifest(headPlane),
      interactionHalo: classManifest(halo),
    },
    materialDoctrine: {
      primary: PRIMARY_STATE,
      secondary: SECONDARY_STATE,
      pattern: 'Nine-by-seven floor with a three-block-wide east-west polished-diorite aisle and polished-andesite shoulders.',
      source: `${INPUTS.houstonContractorBrief}#/block_palette/lobby_floor`,
    },
    operationalBoundary: {
      shaftTransportCommissioned: false,
      liftOrStairMechanismInstalled: false,
      observationTransferTouched: false,
      wetLinerTouched: false,
      wallsOrCeilingTouched: false,
      exactRollbackRestoresR02Void: true,
    },
    sourcePartition: {
      design: classManifest(floor),
      operated: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest([]),
      sourceStateCensus: sourceCensus(operations),
      exactPartition: operations.length === floor.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(operations.map(({ cell }) => cell)),
    desiredStateCensus: targetCensus(operations),
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: operationBands.length,
      rollbackCommandCount: operationBands.length,
      targetCellCount: floor.length,
      targetCoordinateSetSha256: hashCells(floor),
      exactInverse: true,
    },
    mergedBandSemantics: 'Each REPL is one exact air-source material band; rollback reverses the band order and restores air.',
  },
  isolation: {
    fluidHaloIntersectionCount: haloViolations.filter(({ fluid }) => fluid).length,
    gravityHaloIntersectionCount: haloViolations.filter(({ gravity }) => gravity).length,
    forbiddenContainerOrControlHaloCount: haloViolations
      .filter(({ forbiddenContainerOrControl }) => forbiddenContainerOrControl).length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    d06MechanismHaloIntersectionCount: mechanismHaloIntersections.length,
    intentionalPriorReleaseIntersections: priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: 0,
  },
  compileGuards: {
    exactTargetSourceState: SOURCE_STATE,
    unexpectedTargetStateViolationCount: 0,
    fluidHaloViolationCount: 0,
    gravityHaloViolationCount: 0,
    forbiddenContainerOrControlHaloViolationCount: 0,
    unstableFoundationViolationCount: supportViolations.length,
    headroomViolationCount: headroomViolations.length,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    mechanismHaloViolationCount: mechanismHaloIntersections.length,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    d06MechanismsPath: INPUTS.d06Mechanisms,
    d06MechanismsSha256: sha256(fs.readFileSync(absolute(INPUTS.d06Mechanisms))),
    d06DetailedPath: INPUTS.d06Detailed,
    d06DetailedReportIdentitySha256: detailed.reportIdentitySha256,
    r03ManifestPath: INPUTS.r03Manifest,
    r03ManifestIdentity: r03Manifest.manifestIdentity,
    r06ManifestPath: INPUTS.r06Manifest,
    r06ManifestIdentity: r06Manifest.manifestIdentity,
    houstonContractorBriefPath: INPUTS.houstonContractorBrief,
    houstonContractorBriefSha256: sha256(
      fs.readFileSync(absolute(INPUTS.houstonContractorBrief)),
    ),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'exact source preflight and strict-noop forward/rollback parser checks',
    'fresh block-entity and same-moment live-entity clearance',
    'journaled strict-noop execution',
    'fresh post snapshot and rollback post-state preflight',
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
  targetCellCount: floor.length,
  commandCount: operationBands.length,
  sourceStateCensus: sourceCensus(operations),
  desiredStateCensus: targetCensus(operations),
  intentionalR02OverlapCellCount: priorReleaseIntersections[0].cellCount,
  fluidHaloIntersectionCount: 0,
  gravityHaloIntersectionCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  protectedRelicHaloIntersectionCount: 0,
  d06MechanismHaloIntersectionCount: 0,
  forward,
  rollback,
  forwardSha256,
  rollbackSha256,
}, null, 2));
