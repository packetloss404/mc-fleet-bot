#!/usr/bin/env node
/**
 * Compile CZ-R07D: the sealed B09 lower-station rough shell.
 *
 * This is the smallest complete physical partition of the frozen B09 lower
 * station that does not touch the exact B08 portal interface. It installs a
 * non-gravity polished-diorite shell around a preserved air void and closes
 * both ends. Rail, guideway continuation, openings, mechanisms, power,
 * drainage, rescue, and the summit interface remain deferred and untouched.
 *
 * The compiler reads only the accepted R08B post save. It performs no RCON
 * call, service call, or world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:35:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08b-live-20260821T162429Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r07d-b09-lower-station-shell';
const RELEASE_ID = 'CZ-R07D-P1-B09-LOWER-STATION-SHELL';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b09-lower-station-shell';
const SOURCE_STATE = 'minecraft:air';
const TARGET_STATE = 'minecraft:polished_diorite';

const INPUTS = Object.freeze({
  b09Technical:
    'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectorGeometry:
    'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05Alternatives:
    'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r08bLedger:
    'data/world-review/combined-zones-r08b-live-20260821T162429Z/evidence-ledger.json',
  r08bQa:
    'data/world-review/combined-zones-r08b-live-20260821T162429Z/r08b-post-release-qa.json',
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
  sourceCompleteSaveSha256:
    'db8be11127b00fc779a7e70afa400c3e2a3f7782f4d7a95d8ef2374c2a1c8ce7',
  sourceRegionSha256:
    '6bc43a2d419aad4fbedb5a32d8e9949dd13899187f1657a67a30d8f5fc59d87d',
  r08bCompletedReleaseIdentitySha256:
    '70261e609d25e24269ae1aea226f05817cba8f00649ed0cd6f802a766fa9fa5b',
  b09TechnicalIdentitySha256:
    'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  selectedModelIdentitySha256:
    '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  minimumAccommodationCellCount: 7800,
  minimumAccommodationSha256:
    'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  lowerStationCellCount: 132,
  lowerStationSha256:
    'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
  b08PortalSeamCellCount: 36,
  b08PortalSeamSha256:
    'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  summitCapCellCount: 12,
  summitCapSha256:
    'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  lowerStationResidualCellCount: 96,
  shellCellCount: 84,
  interiorVoidCellCount: 12,
  operationBandCount: 6,
});

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
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07D B09 lower-station compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const samePath = (left, right) => absolute(left) === absolute(right);
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
const difference = (left, right) => {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
};
const intersection = (left, right) => {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) {
    census.set(state, (census.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  const exact = records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  ));
  return sha256(`combined-zones-current-block-state-set-v1\n${exact
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
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
            intersections.set(cellKey(cell), { cell, kind: fields[0] });
          }
        }
      }
    }
  }
  return [...intersections.values()];
}

const intake = readJson(INTAKE_AUDIT);
const authorization = readJson(INPUTS.standingAuthorization);
const technical = readJson(INPUTS.b09Technical);
const connectors = readJson(INPUTS.connectorGeometry);
const d05 = readJson(INPUTS.d05Alternatives);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r08bLedger = readJson(INPUTS.r08bLedger);
const r08bQa = readJson(INPUTS.r08bQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot');
invariant(intake.packageIdentity?.completeSaveSha256
  === EXPECTED.sourceCompleteSaveSha256,
'accepted R08B complete-save identity drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(r08bLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && r08bLedger.stages?.every(({ status }) => status === 'PASS')
  && samePath(r08bLedger.postSnapshot?.root, SNAPSHOT)
  && r08bLedger.postSnapshot?.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256,
'R08B terminal execution ledger is not the source-state predecessor');
const sourceRegionIdentity = readJson(r08bLedger.postSnapshot.identity.path);
invariant(sourceRegionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceRegionIdentity.directory, path.join(SNAPSHOT, 'region')),
'R08B post region identity drifted');
invariant(r08bQa.status === 'PASS_R08B_EMPTY_EIGHT_PLATFORM_08_POST_RELEASE_ACCEPTED'
  && r08bQa.release?.completedReleaseIdentitySha256
    === EXPECTED.r08bCompletedReleaseIdentitySha256,
'R08B post-release acceptance identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover the R07 release node');
invariant(!authorization.mvpBoundary.excludedScopeIds.includes('P1-B09'),
'P1-B09 is excluded from the authorized MVP boundary');
invariant(technical.reportIdentitySha256 === EXPECTED.b09TechnicalIdentitySha256,
'frozen B09 technical-system identity drifted');

const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel?.modelIdentitySha256 === EXPECTED.selectedModelIdentitySha256,
'selected FM-01 model identity drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
invariant(accommodation.length === EXPECTED.minimumAccommodationCellCount
  && hashCells(accommodation) === EXPECTED.minimumAccommodationSha256,
'frozen B09 minimum accommodation drifted');

const lowerStationRailAndHeadroom = [];
for (let offset = 0; offset <= 8; offset += 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    lowerStationRailAndHeadroom.push({
      x: endpoints.from.x + offset,
      y: endpoints.from.y + dy,
      z: endpoints.from.z,
    });
  }
}
const lowerStation = dilateCells(lowerStationRailAndHeadroom, 1);
invariant(lowerStation.length === EXPECTED.lowerStationCellCount
  && hashCells(lowerStation) === EXPECTED.lowerStationSha256,
'frozen B09 lower-station envelope drifted');
const b08PortalSeam = lowerStation.filter(({ x }) => x <= 2049);
invariant(b08PortalSeam.length === EXPECTED.b08PortalSeamCellCount
  && hashCells(b08PortalSeam) === EXPECTED.b08PortalSeamSha256,
'exact B08/B09 portal seam drifted');
const lowerStationResidual = difference(lowerStation, b08PortalSeam);
invariant(lowerStationResidual.length === EXPECTED.lowerStationResidualCellCount,
'lower-station residual count drifted');
const interiorVoid = cellsIn({
  minX: 2051, maxX: 2056,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const shell = difference(lowerStationResidual, interiorVoid);
invariant(shell.length === EXPECTED.shellCellCount
  && interiorVoid.length === EXPECTED.interiorVoidCellCount
  && intersection(shell, interiorVoid).length === 0
  && uniqueCells([...shell, ...interiorVoid]).length === lowerStationResidual.length,
'shell and preserved interior do not exactly partition the lower-station residual');

const summitCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
invariant(summitCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitCap) === EXPECTED.summitCapSha256,
'summit sealed-interface cap drifted');
invariant(intersection(shell, b08PortalSeam).length === 0
  && intersection(shell, summitCap).length === 0,
'rough shell touches a deferred sealed interface');
const accommodationKeys = new Set(accommodation.map(cellKey));
invariant(shell.every((cell) => accommodationKeys.has(cellKey(cell))),
'rough shell leaves the frozen B09 minimum accommodation');

const westIsolationCap = shell.filter(({ x }) => x === 2050);
const eastIsolationCap = shell.filter(({ x }) => x === 2057);
const floor = shell.filter(({ x, y }) => x >= 2051 && x <= 2056 && y === 129);
const roof = shell.filter(({ x, y }) => x >= 2051 && x <= 2056 && y === 132);
const northWall = shell.filter(({ x, y, z }) => (
  x >= 2051 && x <= 2056 && y >= 130 && y <= 131 && z === -749
));
const southWall = shell.filter(({ x, y, z }) => (
  x >= 2051 && x <= 2056 && y >= 130 && y <= 131 && z === -747
));
const shellParts = [floor, northWall, southWall, roof, eastIsolationCap, westIsolationCap];
invariant(shellParts.reduce((sum, cells) => sum + cells.length, 0) === shell.length
  && uniqueCells(shellParts.flat()).length === shell.length,
'rough-shell construction bands overlap or leave gaps');

const interactionHalo = dilateCells(shell, 1);
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

const accommodationRecords = await readStates(accommodation);
const shellKeys = new Set(shell.map(cellKey));
const lowerStationKeys = new Set(lowerStation.map(cellKey));
const seamKeys = new Set(b08PortalSeam.map(cellKey));
const interiorKeys = new Set(interiorVoid.map(cellKey));
const summitKeys = new Set(summitCap.map(cellKey));
const shellRecords = accommodationRecords.filter(({ cell }) => (
  shellKeys.has(cellKey(cell))
));
const lowerStationRecords = accommodationRecords.filter(({ cell }) => (
  lowerStationKeys.has(cellKey(cell))
));
const seamRecords = lowerStationRecords.filter(({ cell }) => (
  seamKeys.has(cellKey(cell))
));
const interiorRecords = lowerStationRecords.filter(({ cell }) => (
  interiorKeys.has(cellKey(cell))
));
const summitRecords = accommodationRecords.filter(({ cell }) => (
  summitKeys.has(cellKey(cell))
));
const unexpectedShellStates = shellRecords.filter(({ state }) => state !== SOURCE_STATE);
const obstructedInterior = interiorRecords.filter(({ state }) => state !== SOURCE_STATE);
invariant(unexpectedShellStates.length === 0,
  `rough-shell source is not exact air: ${JSON.stringify(unexpectedShellStates.slice(0, 20))}`);
invariant(obstructedInterior.length === 0,
  `preserved station interior is obstructed: ${JSON.stringify(obstructedInterior.slice(0, 20))}`);

const haloRecords = await readStates(interactionHalo);
const haloViolations = haloRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
));
invariant(haloViolations.length === 0,
  `fluid/gravity/container/control state exists in the exact shell halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);

const haloBounds = boundsOf(interactionHalo);
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
'rough-shell interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'rough-shell interaction halo intersects a saved movable entity');

const protectedRelicHaloIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = interactionHalo.filter((cell) => (
    insideBounds(cell, relic.declaredInclusiveBounds)
  ));
  if (cells.length) protectedRelicHaloIntersections.push({
    relic: relic.key,
    ...classManifest(cells),
  });
}
invariant(protectedRelicHaloIntersections.length === 0,
'rough-shell interaction halo intersects a protected relic core');

const targetKeys = new Set(shell.map(cellKey));
const priorReleaseIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const declaredHash = manifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${manifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const intersections = priorOperationIntersections(pkg.forward, targetKeys, boundsOf(shell));
    if (intersections.length) priorReleaseIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      operationPath: pkg.forward,
      ...classManifest(intersections.map(({ cell }) => cell)),
    });
  }
}
invariant(priorReleaseIntersections.length === 0,
  `rough shell intersects prior release targets: ${JSON.stringify(priorReleaseIntersections)}`);

const bands = [
  { key: 'floor', bounds: boundsOf(floor) },
  { key: 'north-wall', bounds: boundsOf(northWall) },
  { key: 'south-wall', bounds: boundsOf(southWall) },
  { key: 'roof', bounds: boundsOf(roof) },
  { key: 'east-isolation-cap', bounds: boundsOf(eastIsolationCap) },
  { key: 'west-isolation-cap', bounds: boundsOf(westIsolationCap) },
];
invariant(bands.length === EXPECTED.operationBandCount,
'operation-band count drifted');
const line = (bounds, fromState, toState) => (
  `REPL ${bounds.minX} ${bounds.minY} ${bounds.minZ} ${bounds.maxX} ${bounds.maxY} ${bounds.maxZ} ${fromState} ${toState}`
);
const forwardBody = `${bands.map(({ bounds }) => (
  line(bounds, SOURCE_STATE, TARGET_STATE)
)).join('\n')}\n`;
const rollbackBody = `${bands.slice().reverse().map(({ bounds }) => (
  line(bounds, TARGET_STATE, SOURCE_STATE)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(shell)}`,
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
  scopeIds: ['P1-B09'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static shell package; rollback reverses its six non-overlapping construction bands.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
    purpose: 'Build the smallest complete dry lower-station shell while retaining physical isolation from B08 and the unbuilt guideway.',
    geometry: {
      minimumPlanningAccommodation: classManifest(accommodation),
      lowerStationEnvelope: classManifest(lowerStation),
      b08PortalSeam: classManifest(b08PortalSeam),
      lowerStationResidual: classManifest(lowerStationResidual),
      roughShell: classManifest(shell),
      preservedInteriorVoid: classManifest(interiorVoid),
      floor: classManifest(floor),
      roof: classManifest(roof),
      northWall: classManifest(northWall),
      southWall: classManifest(southWall),
      westIsolationCap: classManifest(westIsolationCap),
      eastIsolationCap: classManifest(eastIsolationCap),
      summitInterfaceCap: classManifest(summitCap),
      interactionHalo: classManifest(interactionHalo),
    },
    materialDoctrine: {
      shellState: TARGET_STATE,
      reason: 'Static non-gravity enclosure fabric matching the accepted R07 B03 and B08 polished-diorite framework.',
    },
    operationalBoundary: {
      b08PortalSeamTouched: false,
      b08PortalOpeningCreated: false,
      guidewayContinuationOpened: false,
      summitInterfaceCapTouched: false,
      summitInterfaceOpened: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      shellEndsPhysicallyCapped: true,
      exactRollbackRestoresR08BAir: true,
    },
    sourcePartition: {
      design: classManifest(lowerStationResidual),
      operated: classManifest(shell),
      preservedInterior: classManifest(interiorVoid),
      sourceStateCensus: stateCensus(shellRecords),
      exactPartition: uniqueCells([...shell, ...interiorVoid]).length
        === lowerStationResidual.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceRegionIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    predecessor: {
      transactionId: r08bLedger.transactionId,
      executionLedger: fileBinding(INPUTS.r08bLedger),
      completedReleaseIdentitySha256: r08bQa.release.completedReleaseIdentitySha256,
      postReleaseQa: fileBinding(INPUTS.r08bQa),
    },
    b09CurrentStateInventory: {
      minimumAccommodation: {
        ...classManifest(accommodation),
        stateCensus: stateCensus(accommodationRecords),
        blockStateSetSha256: stateSetSha256(accommodationRecords),
      },
      lowerStation: {
        ...classManifest(lowerStation),
        stateCensus: stateCensus(lowerStationRecords),
        blockStateSetSha256: stateSetSha256(lowerStationRecords),
      },
      b08PortalSeam: {
        ...classManifest(b08PortalSeam),
        stateCensus: stateCensus(seamRecords),
        blockStateSetSha256: stateSetSha256(seamRecords),
      },
      summitInterfaceCap: {
        ...classManifest(summitCap),
        stateCensus: stateCensus(summitRecords),
        blockStateSetSha256: stateSetSha256(summitRecords),
      },
    },
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(shell),
    desiredStateCensus: { [TARGET_STATE]: shell.length },
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: bands.length,
      rollbackCommandCount: bands.length,
      targetCellCount: shell.length,
      targetCoordinateSetSha256: hashCells(shell),
      exactInverse: true,
      constructionBands: bands.map(({ key, bounds }) => ({ key, bounds })),
    },
  },
  isolation: {
    fluidTargetIntersectionCount: shellRecords.filter(({ state }) => isFluid(state)).length,
    fluidHaloIntersectionCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloIntersectionCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: priorReleaseIntersections.length,
    b08PortalSeamTargetIntersectionCount: intersection(shell, b08PortalSeam).length,
    summitInterfaceCapTargetIntersectionCount: intersection(shell, summitCap).length,
    preservedInteriorTargetIntersectionCount: intersection(shell, interiorVoid).length,
  },
  compileGuards: {
    exactTargetSourceState: SOURCE_STATE,
    unexpectedTargetStateViolationCount: unexpectedShellStates.length,
    obstructedPreservedInteriorViolationCount: obstructedInterior.length,
    fluidTargetViolationCount: shellRecords.filter(({ state }) => isFluid(state)).length,
    fluidHaloViolationCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloViolationCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloViolationCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    priorReleaseTargetViolationCount: priorReleaseIntersections.length,
    b08PortalSeamViolationCount: intersection(shell, b08PortalSeam).length,
    summitInterfaceCapViolationCount: intersection(shell, summitCap).length,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    b09Technical: {
      ...fileBinding(INPUTS.b09Technical),
      reportIdentitySha256: technical.reportIdentitySha256,
    },
    d05Alternatives: {
      ...fileBinding(INPUTS.d05Alternatives),
      selectedModelIdentitySha256: selectedModel.modelIdentitySha256,
    },
    connectorGeometry: fileBinding(INPUTS.connectorGeometry),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'fresh block/live-entity clearance',
    'exact source preflight',
    'strict-noop forward and rollback parser checks',
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
  sourceRegionSha256: sourceRegionIdentity.sha256,
  b09CurrentStateCensus: stateCensus(accommodationRecords),
  targetCellCount: shell.length,
  commandCount: bands.length,
  sourceStateCensus: stateCensus(shellRecords),
  desiredStateCensus: { [TARGET_STATE]: shell.length },
  preservedInteriorCellCount: interiorVoid.length,
  b08PortalSeamTargetIntersectionCount: 0,
  summitInterfaceCapTargetIntersectionCount: 0,
  priorReleaseTargetIntersectionCount: 0,
  fluidHaloIntersectionCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  protectedRelicHaloIntersectionCount: 0,
  forward,
  rollback,
  forwardSha256,
  rollbackSha256,
}, null, 2));
