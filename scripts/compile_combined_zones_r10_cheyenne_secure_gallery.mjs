#!/usr/bin/env node
/**
 * Compile the first independently releasable R10 secure-core fit-out.
 *
 * The package lines the final 33 level points of the accepted P1-B03
 * Cheyenne J-curve (centerline indices 768..800). It changes only the
 * one-cell exterior shell: the complete R03 5x4 route void stays air and the
 * exact stone terminus cap stays intact. This creates a finished secure
 * approach gallery without excavating the Cheyenne chamber, opening a secure
 * boundary, or depending on any summit framework.
 *
 * This compiler is offline. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:35:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r09a-post-20260821T163535Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09a-live-20260821T163535Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r10-cheyenne-secure-gallery';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_RELEASE_ID = 'CZ-R10A-CHEYENNE-SECURE-APPROACH-GALLERY';
const PACKAGE_KEY = 'cheyenne-secure-gallery-liner';
const FIRST_CENTERLINE_INDEX = 768;
const LAST_CENTERLINE_INDEX = 800;

const INPUTS = Object.freeze({
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  siteCoordinates: 'docs/masterplans/05-combined-zones/site-coordinates.json',
  funicular: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
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
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  ],
});

const MATERIALS = Object.freeze({
  wallAndCeiling: 'minecraft:polished_granite',
  floor: 'minecraft:smooth_stone',
  securityFrame: 'minecraft:polished_blackstone_bricks',
  light: 'minecraft:sea_lantern',
  preservedRoute: 'minecraft:air',
  preservedTerminusCap: 'minecraft:stone',
});
const SECURITY_FRAME_X = new Set([2048, 2080]);
const LIGHT_X = new Set([2054, 2060, 2066, 2072, 2078]);
const EXPECTED = Object.freeze({
  b03ConstructionCellCount: 15972,
  b03ConstructionSha256: '82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15',
  b03InteractionCellCount: 14418,
  b03InteractionSha256: '3fea0d42c8f41dde895ac31258bfa06ed5cacea11f2d719e02551f3989a8966f',
  centerlinePointCount: 33,
  routeCellCount: 660,
  linerCellCount: 594,
  terminusCapCellCount: 20,
});
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
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
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10 Cheyenne secure-gallery compiler rejected: ${message}`);
};
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

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function sourceCensus(operations) {
  const census = new Map();
  for (const operation of operations) {
    census.set(operation.fromState, (census.get(operation.fromState) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function targetCensus(operations) {
  const census = new Map();
  for (const operation of operations) {
    census.set(operation.toState, (census.get(operation.toState) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function connectedComponentManifest(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length);
  return {
    componentCount: components.length,
    largestComponentCellCount: components[0]?.length ?? 0,
    componentSetSha256: sha256(components
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort()
      .join('\n')),
  };
}

function savedEntityInsideHalo(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function targetIntersections(filename, targets) {
  const byColumn = new Map();
  for (const cell of targets) {
    const key = `${cell.x},${cell.z}`;
    if (!byColumn.has(key)) byColumn.set(key, []);
    byColumn.get(key).push(cell);
  }
  const targetBounds = boundsOf(targets);
  const hits = new Map();
  for (const [lineIndex, raw] of fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename}:${lineIndex + 1} contains a malformed prior operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename}:${lineIndex + 1} contains an invalid prior coordinate`);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    const operationBounds = {
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
    };
    if (!boxesOverlap(operationBounds, targetBounds)) continue;
    for (let x = Math.max(operationBounds.minX, targetBounds.minX);
      x <= Math.min(operationBounds.maxX, targetBounds.maxX); x += 1) {
      for (let z = Math.max(operationBounds.minZ, targetBounds.minZ);
        z <= Math.min(operationBounds.maxZ, targetBounds.maxZ); z += 1) {
        for (const cell of byColumn.get(`${x},${z}`) ?? []) {
          if (cell.y >= operationBounds.minY && cell.y <= operationBounds.maxY) {
            hits.set(cellKey(cell), cell);
          }
        }
      }
    }
  }
  return uniqueCells([...hits.values()]);
}

const b03 = readJson(INPUTS.b03Geometry);
const siteCoordinates = readJson(INPUTS.siteCoordinates);
const funicular = readJson(INPUTS.funicular);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
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
'standing authorization does not cover the R10 release node');
invariant(!authorization.mvpBoundary.excludedScopeIds.includes('Z10-CHEYENNE-FITOUT'),
'Cheyenne fit-out is excluded from the authorized MVP boundary');

const construction = uniqueCells(b03.design.excavationReservation.cells);
const interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
const constructionKeys = new Set(construction.map(cellKey));
const interactionKeys = new Set(interaction.map(cellKey));
invariant(construction.length === EXPECTED.b03ConstructionCellCount
  && hashCells(construction) === EXPECTED.b03ConstructionSha256,
'accepted B03 construction identity drifted');
invariant(interaction.length === EXPECTED.b03InteractionCellCount
  && hashCells(interaction) === EXPECTED.b03InteractionSha256,
'accepted B03 interaction-shell identity drifted');

const centers = b03.design.centerline.points.filter(({ index }) => (
  index >= FIRST_CENTERLINE_INDEX && index <= LAST_CENTERLINE_INDEX
));
invariant(centers.length === EXPECTED.centerlinePointCount
  && centers.every((point, offset) => (
    point.index === FIRST_CENTERLINE_INDEX + offset
    && point.x === 2080 - offset
    && point.y === 166
    && point.z === -868
    && point.tangent === 'WEST'
    && point.phase === 'LEG-3-INSTITUTIONAL'
  )), 'secure-gallery centerline is not the exact level LEG-3 terminal run');

const route = [];
const liner = [];
for (const point of centers) {
  for (let z = point.z - 2; z <= point.z + 2; z += 1) {
    for (let y = point.y; y <= point.y + 3; y += 1) route.push({ x: point.x, y, z });
    liner.push({ x: point.x, y: point.y - 1, z });
    liner.push({ x: point.x, y: point.y + 4, z });
  }
  for (let y = point.y; y <= point.y + 3; y += 1) {
    liner.push({ x: point.x, y, z: point.z - 3 });
    liner.push({ x: point.x, y, z: point.z + 3 });
  }
}
const exactRoute = uniqueCells(route);
const exactLiner = uniqueCells(liner);
const terminusCap = [];
const upstreamContinuation = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) {
    terminusCap.push({ x: 2047, y, z });
    upstreamContinuation.push({ x: 2081, y, z });
  }
}
invariant(exactRoute.length === EXPECTED.routeCellCount
  && exactRoute.every((cell) => constructionKeys.has(cellKey(cell))),
'secure-gallery route does not reproduce inside accepted B03 construction');
invariant(exactLiner.length === EXPECTED.linerCellCount
  && exactLiner.every((cell) => interactionKeys.has(cellKey(cell))),
'secure-gallery liner does not reproduce inside accepted B03 interaction shell');
invariant(terminusCap.length === EXPECTED.terminusCapCellCount
  && terminusCap.every((cell) => interactionKeys.has(cellKey(cell))),
'secure terminus cap does not reproduce inside accepted B03 interaction shell');
invariant(upstreamContinuation.every((cell) => constructionKeys.has(cellKey(cell))),
'upstream route continuation does not reproduce inside accepted B03 construction');
const routeConnectivity = connectedComponentManifest(exactRoute);
invariant(routeConnectivity.componentCount === 1
  && routeConnectivity.largestComponentCellCount === exactRoute.length,
'preserved gallery route is not one face-connected volume');

const z10 = siteCoordinates.zones.find(({ id }) => id === 'Z10');
const galleryBounds = boundsOf(exactLiner);
invariant(z10 && exactLiner.every((cell) => insideBounds(cell, {
  minX: z10.bounds.minX,
  maxX: z10.bounds.maxX,
  minY: Math.ceil(z10.bounds.minY),
  maxY: Math.floor(z10.bounds.maxY),
  minZ: z10.bounds.minZ,
  maxZ: z10.bounds.maxZ,
})), 'secure gallery is not wholly inside the accepted Z10 envelope');
const summitProposalLayers = Object.values(
  funicular.exactTechnicalReservationProposals.proposalLayers,
);
const summitProposalBoundsIntersections = summitProposalLayers.filter(({ bounds }) => (
  boxesOverlap(galleryBounds, bounds)
));
invariant(summitProposalBoundsIntersections.length === 0,
'secure gallery intersects a B09/summit proposal envelope');

const desired = new Map();
for (const cell of exactLiner) {
  let toState = cell.y === 165 ? MATERIALS.floor : MATERIALS.wallAndCeiling;
  let layer = cell.y === 165 ? 'floor' : cell.y === 170 ? 'ceiling' : 'wall';
  if (SECURITY_FRAME_X.has(cell.x)) {
    toState = MATERIALS.securityFrame;
    layer = 'security-frame';
  } else if (cell.y === 170 && cell.z === -868 && LIGHT_X.has(cell.x)) {
    toState = MATERIALS.light;
    layer = 'lighting';
  }
  desired.set(cellKey(cell), { cell, toState, layer });
}
invariant(desired.size === exactLiner.length, 'secure-gallery material map is incomplete');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const haloBounds = {
  minX: galleryBounds.minX - 1,
  maxX: galleryBounds.maxX + 1,
  minY: galleryBounds.minY - 1,
  maxY: galleryBounds.maxY + 1,
  minZ: galleryBounds.minZ - 1,
  maxZ: galleryBounds.maxZ + 1,
};
const fluidHaloViolations = [];
const forbiddenHaloBlocks = [];
const unexpectedHaloStates = [];
for (let x = haloBounds.minX; x <= haloBounds.maxX; x += 1) {
  for (let y = haloBounds.minY; y <= haloBounds.maxY; y += 1) {
    for (let z = haloBounds.minZ; z <= haloBounds.maxZ; z += 1) {
      const cell = { x, y, z };
      const state = stateToCommandString(await reader.blockState(x, y, z));
      const name = blockName(state);
      if (FLUID_BLOCKS.has(name) || state.includes('waterlogged=true')) {
        fluidHaloViolations.push({ cell, sourceState: state });
      }
      if (FORBIDDEN_SOURCE_BLOCKS.has(name)) {
        forbiddenHaloBlocks.push({ cell, sourceState: state });
      }
      if (!['minecraft:stone', 'minecraft:air'].includes(state)) {
        unexpectedHaloStates.push({ cell, sourceState: state });
      }
    }
  }
}
invariant(fluidHaloViolations.length === 0, 'fluid exists in the exact secure-gallery halo');
invariant(forbiddenHaloBlocks.length === 0,
'container/control block exists in the exact secure-gallery halo');
invariant(unexpectedHaloStates.length === 0,
'unexpected block state exists in the exact secure-gallery halo');

const routeStateViolations = [];
for (const cell of exactRoute) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== MATERIALS.preservedRoute) routeStateViolations.push({ cell, state });
}
const capStateViolations = [];
for (const cell of terminusCap) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== MATERIALS.preservedTerminusCap) capStateViolations.push({ cell, state });
}
const upstreamStateViolations = [];
for (const cell of upstreamContinuation) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== MATERIALS.preservedRoute) upstreamStateViolations.push({ cell, state });
}
invariant(routeStateViolations.length === 0, 'accepted R03 route void drifted in the gallery');
invariant(capStateViolations.length === 0, 'fail-closed Cheyenne terminus cap drifted');
invariant(upstreamStateViolations.length === 0, 'upstream B03 route connection drifted');

const operations = [];
const alreadyTarget = [];
for (const record of desired.values()) {
  const fromState = stateToCommandString(await reader.blockState(
    record.cell.x, record.cell.y, record.cell.z,
  ));
  if (fromState === record.toState) alreadyTarget.push(record.cell);
  else {
    invariant(fromState === 'minecraft:stone',
      `liner source is not exact R05 stone at ${cellKey(record.cell)}: ${fromState}`);
    operations.push({ ...record, fromState });
  }
}
const layerOrder = new Map([
  ['ceiling', 0], ['lighting', 0], ['wall', 1], ['security-frame', 1], ['floor', 2],
]);
operations.sort((left, right) => (
  (layerOrder.get(left.layer) ?? 9) - (layerOrder.get(right.layer) ?? 9)
  || right.cell.x - left.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
));
const operatedTargets = operations.map(({ cell }) => cell);
invariant(operations.length === EXPECTED.linerCellCount && alreadyTarget.length === 0,
'secure gallery is not an exact 594-cell source transition');
const routeKeys = new Set(exactRoute.map(cellKey));
const capKeys = new Set(terminusCap.map(cellKey));
invariant(operatedTargets.every((cell) => (
  !routeKeys.has(cellKey(cell)) && !capKeys.has(cellKey(cell))
)), 'liner operation intersects the preserved route or secure cap');

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
    if (savedEntityInsideHalo(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
'secure-gallery halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'secure-gallery halo intersects a saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = operatedTargets.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'secure-gallery targets intersect a protected relic core');

const priorIntersections = [];
for (const manifestPath of INPUTS.acceptedPriorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const operation = manifest.operations[pkg.key]
      ?? (manifest.packages.length === 1 ? manifest.operations : null);
    invariant(operation && sha256(operationBody(pkg.forward)) === operation.forwardSha256,
      `${manifest.transactionId}/${pkg.key} operation body drifted`);
    const cells = targetIntersections(pkg.forward, operatedTargets);
    if (cells.length) priorIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      manifestPath,
      operationPath: pkg.forward,
      ...classManifest(cells),
    });
  }
}
invariant(priorIntersections.length === 1
  && priorIntersections[0].packageId === 'combined-zones-r05-mountain/b10-bulk'
  && priorIntersections[0].cellCount === EXPECTED.linerCellCount
  && priorIntersections[0].coordinateSetSha256 === hashCells(operatedTargets),
'prior-release overlap is not exactly the R05 stone shell being fit out');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const forwardBody = `${operations.map(({ cell, fromState, toState }) => (
  replLine(cell, fromState, toState)
)).join('\n')}\n`;
const rollbackBody = `${operations.slice().reverse().map(({ cell, fromState, toState }) => (
  replLine(cell, toState, fromState)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetIdentity = classManifest(operatedTargets);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${PACKAGE_RELEASE_ID} (${PACKAGE_KEY} ${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# package target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R09A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z10-CHEYENNE-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Install the source-guarded exterior liner without changing the route void or secure terminus; rollback reverses every point to exact R05 stone.',
  },
  scope: {
    releaseId: PACKAGE_RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    mvpScope: true,
    purpose: 'Fit out the final 33-block Cheyenne institutional approach gallery while preserving its accepted route and fail-closed chamber boundary.',
    geometry: {
      acceptedCenterlineRange: {
        firstIndex: FIRST_CENTERLINE_INDEX,
        lastIndex: LAST_CENTERLINE_INDEX,
        pointCount: centers.length,
        firstPoint: centers[0],
        lastPoint: centers.at(-1),
      },
      galleryRouteVoid: classManifest(exactRoute),
      galleryRouteConnectivity: routeConnectivity,
      exteriorLiner: classManifest(exactLiner),
      securityFrames: classManifest(exactLiner.filter((cell) => SECURITY_FRAME_X.has(cell.x))),
      lightingFixtures: classManifest(exactLiner.filter((cell) => (
        cell.y === 170 && cell.z === -868 && LIGHT_X.has(cell.x)
      ))),
      preservedTerminusCap: classManifest(terminusCap),
      preservedUpstreamContinuation: classManifest(upstreamContinuation),
      exactDryHalo: { ...haloBounds, fluidCellCount: 0 },
    },
    materialDoctrine: MATERIALS,
    secureBoundary: {
      routeVoidPreservedCellCount: exactRoute.length,
      routeStateViolationCount: routeStateViolations.length,
      terminusCapPreservedCellCount: terminusCap.length,
      terminusCapStateViolationCount: capStateViolations.length,
      routeOrCapOperationIntersectionCount: 0,
      chamberExcavatedOrOpened: false,
      accessControlMechanismCommissioned: false,
      currentDisposition: 'FAIL_CLOSED_STONE_TERMINUS_RETAINED',
    },
    summitIndependence: {
      summitProposalLayerCount: summitProposalLayers.length,
      summitProposalBoundsIntersectionCount: summitProposalBoundsIntersections.length,
      galleryMaxZ: galleryBounds.maxZ,
      nearestB09ProposalMinZ: Math.min(...summitProposalLayers.map(({ bounds }) => bounds.minZ)),
      minimumClearZBlocks: Math.min(...summitProposalLayers.map(({ bounds }) => bounds.minZ))
        - galleryBounds.maxZ - 1,
      summitFrameworkRequired: false,
    },
    sourcePartition: {
      liner: {
        design: classManifest(exactLiner),
        operated: classManifest(operatedTargets),
        alreadyTarget: classManifest(alreadyTarget),
        exactPartition: true,
      },
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
    packageSourceStateCensus: { [PACKAGE_KEY]: sourceCensus(operations) },
  },
  target: {
    operatedUnion: targetIdentity,
    packageTargetsDisjoint: true,
    packageDesiredStateCensus: { [PACKAGE_KEY]: targetCensus(operations) },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: operations.length,
      rollbackCommandCount: operations.length,
      targetCoordinateSetSha256: targetIdentity.coordinateSetSha256,
      exactInverse: true,
    },
  },
  isolation: {
    fluidHaloIntersectionCount: fluidHaloViolations.length,
    forbiddenContainerOrControlHaloCount: forbiddenHaloBlocks.length,
    unexpectedHaloStateCount: unexpectedHaloStates.length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    acceptedR03RouteTargetIntersectionCount: operatedTargets
      .filter((cell) => constructionKeys.has(cellKey(cell))).length,
    summitProposalBoundsIntersectionCount: summitProposalBoundsIntersections.length,
    intentionalPriorReleaseIntersections: priorIntersections,
    undeclaredPriorReleaseIntersectionCount: 0,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    b03GeometryPath: INPUTS.b03Geometry,
    b03GeometrySha256: sha256(fs.readFileSync(absolute(INPUTS.b03Geometry))),
    acceptedPriorManifestIdentities: Object.fromEntries(
      INPUTS.acceptedPriorManifests.map((manifestPathValue) => {
        const manifest = readJson(manifestPathValue);
        return [manifest.transactionId, manifest.manifestIdentity];
      }),
    ),
    funicularTechnicalSystemPath: INPUTS.funicular,
    funicularReportIdentitySha256: funicular.reportIdentitySha256,
    protectedRelicClearancePath: INPUTS.protectedRelics,
    protectedRelicClearanceSha256: sha256(fs.readFileSync(absolute(INPUTS.protectedRelics))),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and deterministic recompile',
    'block-entity audit and exact source preflight',
    'strict-noop forward and rollback parser dry-runs',
    'fresh live entity clearance bound to both operation hashes',
    'journaled strict-noop execution',
    'fresh post snapshot, exact post-state/route/cap QA, and rollback preflight',
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
  mvpScope: true,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  package: {
    key: PACKAGE_KEY,
    forward,
    rollback,
    commandCount: operations.length,
    forwardSha256,
    rollbackSha256,
    sourceStateCensus: sourceCensus(operations),
    desiredStateCensus: targetCensus(operations),
  },
  preservedRouteCellCount: exactRoute.length,
  preservedTerminusCapCellCount: terminusCap.length,
  fluidHaloIntersectionCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  summitProposalBoundsIntersectionCount: 0,
}, null, 2));
