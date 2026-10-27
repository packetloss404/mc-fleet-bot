#!/usr/bin/env node
/**
 * Compile the first visible post-R06 Combined Zones architecture release.
 *
 * CZ-R07A encloses the exposed middle of the already-bored P1-B03 Cheyenne
 * J-curve with a one-block polished-diorite tube, then opens its two exact
 * five-wide mountain plugs.  The design is deliberately source-limited:
 *
 * - the route void is the frozen R03 surface-deferral class;
 * - the tube is only the frozen B03 face-interaction shell touching that
 *   route void;
 * - shell operations may replace exact air or one-layer snow only;
 * - opening operations may reverse exact R05 polished-diorite portal plugs
 *   or clear one-layer snow from the route void only;
 * - every other state, fluid, container, block entity, protected relic, or
 *   saved entity in the operation halo aborts the compile.
 *
 * Two packages preserve a safe order: build the enclosing shell first, then
 * open the route.  Rollback closes the openings before removing the shell.
 * This script is offline: it performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  compareCells,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T15:35:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-mvp-pre-20260821T152926Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-mvp-complete-save-intake-20260821T153100Z.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r07-b03-portal-tube';
const RELEASE_ID = 'CZ-R07A-PHASE1-B03-PORTAL-TUBE-FRAMEWORK';
const TARGET_SHELL_STATE = 'minecraft:polished_diorite';
const TARGET_ROUTE_STATE = 'minecraft:air';
const SAFE_TRANSIENT_STATE = 'minecraft:snow[layers=1]';
const WORLD_MAX_Y = 320;

const EXPECTED = Object.freeze({
  b03ConstructionCellCount: 15972,
  b03ConstructionSha256: '82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15',
  b03InteractionCellCount: 14418,
  b03InteractionSha256: '3fea0d42c8f41dde895ac31258bfa06ed5cacea11f2d719e02551f3989a8966f',
  frozenSurfaceCellCount: 8532,
  frozenSurfaceSha256: '16bc4e50ded34ee3947005783707de1801c6147067077ef16f10952b5262da92',
  tubeDesignCellCount: 7682,
  tubeDesignSha256: 'eb2c21a45b3299ca8a5afa183d3ec4be834b5629a411c434bc95bae39845a63f',
  portalPlugCellCount: 50,
  portalPlugSha256: 'dd13e1a6f5d7326e6a9f163938dc8d484dcba17e95404f00133738ec4b69397c',
});

const INPUTS = Object.freeze({
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r05Manifest: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  ],
});

const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
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
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07 B03 portal-tube compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const isAirState = (state) => AIR_BLOCKS.has(blockName(state));
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

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parseColumnOperations(filename) {
  const byColumn = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a non-REPL or malformed operation`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    invariant(x1 === x2 && z1 === z2,
      `${filename} contains a non-column operation`);
    const key = `${x1},${z1}`;
    if (!byColumn.has(key)) byColumn.set(key, []);
    byColumn.get(key).push({
      minY: Math.min(y1, y2),
      maxY: Math.max(y1, y2),
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return byColumn;
}

function operationAt(operationMap, cell) {
  return (operationMap.get(`${cell.x},${cell.z}`) ?? [])
    .find(({ minY, maxY }) => cell.y >= minY && cell.y <= maxY) ?? null;
}

async function deriveSurfaceDeferral(reader, construction) {
  const columns = new Map();
  for (const cell of construction) {
    const key = `${cell.x},${cell.z}`;
    if (!columns.has(key)) columns.set(key, { x: cell.x, z: cell.z, cells: [] });
    columns.get(key).cells.push(cell);
  }
  const exposed = [];
  for (const column of columns.values()) {
    const lowestCellY = Math.min(...column.cells.map(({ y }) => y));
    let highestNonAirY = null;
    for (let y = WORLD_MAX_Y; y > lowestCellY; y -= 1) {
      const state = await reader.blockState(column.x, y, column.z);
      if (!AIR_BLOCKS.has(state.Name)) {
        highestNonAirY = y;
        break;
      }
    }
    for (const cell of column.cells) {
      if (highestNonAirY === null || highestNonAirY <= cell.y) exposed.push(cell);
    }
  }
  return uniqueCells(exposed);
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
  components.sort((left, right) => right.length - left.length
    || cellKey(left[0]).localeCompare(cellKey(right[0])));
  return {
    componentCount: components.length,
    largestComponentCellCount: components[0]?.length ?? 0,
    componentSetSha256: sha256(components
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort()
      .join('\n')),
  };
}

function savedEntityTouchesTarget(entity, targets) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return targets.some((cell) => (
    cell.x - 1 <= x && x <= cell.x + 2
    && cell.y - 2 <= y && y <= cell.y + 3
    && cell.z - 1 <= z && z <= cell.z + 2
  ));
}

const b03 = readJson(INPUTS.b03Geometry);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const relics = readJson(INPUTS.protectedRelics);
const r03 = readJson(INPUTS.r03Manifest);
const r05 = readJson(INPUTS.r05Manifest);
const intake = readJson(INTAKE_AUDIT);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot root');
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'region')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'entities')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'poi')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
'source snapshot is not a complete saved-world root');

const construction = uniqueCells(b03.design.excavationReservation.cells);
const interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
const constructionKeys = new Set(construction.map(cellKey));
invariant(construction.length === EXPECTED.b03ConstructionCellCount
  && hashCells(construction) === EXPECTED.b03ConstructionSha256,
'B03 construction geometry drifted');
invariant(interaction.length === EXPECTED.b03InteractionCellCount
  && hashCells(interaction) === EXPECTED.b03InteractionSha256,
'B03 face-interaction geometry drifted');
invariant(interaction.every((cell) => !constructionKeys.has(cellKey(cell))),
'B03 construction and face-interaction sets are not disjoint');

const g03B03 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B03');
invariant(g03B03?.construction?.coordinateSetSha256 === hashCells(construction)
  && g03B03?.interaction?.coordinateSetSha256 === hashCells(interaction),
'B03 geometry does not reproduce the canonical G03 identities');

// Freeze the R03 surface class from its own bound source rather than allowing
// present-day snow to change the architecture design domain.
const r03SourceReader = new AnvilReader(absolute(path.join(r03.source.snapshotRoot, 'region')));
const frozenSurface = await deriveSurfaceDeferral(r03SourceReader, construction);
const frozenSurfaceKeys = new Set(frozenSurface.map(cellKey));
invariant(frozenSurface.length === EXPECTED.frozenSurfaceCellCount
  && hashCells(frozenSurface) === EXPECTED.frozenSurfaceSha256
  && r03.partition?.['b03-jcurve']?.surfaceDeferral?.cellCount
    === EXPECTED.frozenSurfaceCellCount
  && r03.partition?.['b03-jcurve']?.surfaceDeferral?.coordinateSetSha256
    === EXPECTED.frozenSurfaceSha256,
'frozen R03 surface-deferral class does not reproduce');

const tubeDesign = uniqueCells(interaction.filter((cell) => (
  FACE_NEIGHBOURS.some(([dx, dy, dz]) => (
    frozenSurfaceKeys.has(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`)
  ))
)));
invariant(tubeDesign.length === EXPECTED.tubeDesignCellCount
  && hashCells(tubeDesign) === EXPECTED.tubeDesignSha256,
'derived portal-tube shell design drifted');
const frozenSurfaceConnectivity = connectedComponentManifest(frozenSurface);
invariant(frozenSurfaceConnectivity.componentCount === 1
  && frozenSurfaceConnectivity.largestComponentCellCount === frozenSurface.length,
'frozen exposed route void is not one face-connected component');
const exposedCenterlineIndices = b03.design.centerline.points
  .filter((point) => frozenSurfaceKeys.has(cellKey(point)))
  .map(({ index }) => index);
invariant(exposedCenterlineIndices.length === 425
  && exposedCenterlineIndices[0] === 188
  && exposedCenterlineIndices.at(-1) === 612
  && exposedCenterlineIndices.every((index, offset) => index === 188 + offset),
'exposed centerline is not the exact continuous index range 188..612');
let externalBoundaryFaceCount = 0;
const externalBoundaryCells = [];
for (const cell of frozenSurface) {
  for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    if (!constructionKeys.has(cellKey(neighbour))) {
      externalBoundaryFaceCount += 1;
      externalBoundaryCells.push(neighbour);
    }
  }
}
const externalBoundaryUnique = uniqueCells(externalBoundaryCells);
invariant(externalBoundaryUnique.length === tubeDesign.length
  && hashCells(externalBoundaryUnique) === hashCells(tubeDesign),
'tube design does not close every external face of the exposed route void');

const r05Finish = r05.packages.find(({ key }) => key === 'b10-finish');
invariant(r05Finish, 'R05 finish package is missing');
const r05FinishOperation = r05.operations?.['b10-finish'];
invariant(sha256(operationBody(r05Finish.forward)) === r05FinishOperation.forwardSha256,
'R05 finish operation body drifted from its manifest');
const r05FinishMap = parseColumnOperations(r05Finish.forward);
const portalPlugDesign = frozenSurface.filter((cell) => {
  const operation = operationAt(r05FinishMap, cell);
  return operation?.toState === TARGET_SHELL_STATE;
});
const portalPlugKeys = new Set(portalPlugDesign.map(cellKey));
invariant(portalPlugDesign.length === EXPECTED.portalPlugCellCount
  && hashCells(portalPlugDesign) === EXPECTED.portalPlugSha256,
'exact R05 portal-plug intersection drifted');

const currentReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const currentEntityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const compileViolations = [];
const shellOperations = [];
const shellAlreadyTarget = [];
const shellAlreadyEnclosing = [];
for (const cell of tubeDesign) {
  const state = stateToCommandString(await currentReader.blockState(cell.x, cell.y, cell.z));
  if (isAirState(state) || state === SAFE_TRANSIENT_STATE) {
    shellOperations.push({ cell, fromState: state, toState: TARGET_SHELL_STATE });
  } else if (state === TARGET_SHELL_STATE) {
    shellAlreadyTarget.push(cell);
  } else if (state === 'minecraft:stone') {
    shellAlreadyEnclosing.push(cell);
  } else {
    compileViolations.push({ cell, class: 'tube-shell', sourceState: state });
  }
}

const openingOperations = [];
const portalAlreadyOpen = [];
const routeAlreadyClear = [];
const transientRouteClearance = [];
for (const cell of frozenSurface) {
  const state = stateToCommandString(await currentReader.blockState(cell.x, cell.y, cell.z));
  if (portalPlugKeys.has(cellKey(cell))) {
    if (state === TARGET_SHELL_STATE) {
      openingOperations.push({ cell, fromState: state, toState: TARGET_ROUTE_STATE });
    } else if (isAirState(state)) {
      portalAlreadyOpen.push(cell);
    } else {
      compileViolations.push({ cell, class: 'portal-plug', sourceState: state });
    }
  } else if (isAirState(state)) {
    routeAlreadyClear.push(cell);
  } else if (state === SAFE_TRANSIENT_STATE) {
    transientRouteClearance.push(cell);
    openingOperations.push({ cell, fromState: state, toState: TARGET_ROUTE_STATE });
  } else {
    compileViolations.push({ cell, class: 'route-clearance', sourceState: state });
  }
}

for (const violation of compileViolations) {
  const name = blockName(violation.sourceState);
  violation.fluid = FLUID_BLOCKS.has(name) || violation.sourceState.includes('waterlogged=true');
  violation.gravity = GRAVITY_BLOCKS.has(name);
  violation.forbiddenContainer = FORBIDDEN_SOURCE_BLOCKS.has(name);
}
invariant(compileViolations.length === 0,
  `${compileViolations.length} unsafe or unexpected source state(s): `
  + JSON.stringify(compileViolations.slice(0, 20)));

shellOperations.sort((left, right) => compareCells(left.cell, right.cell));
openingOperations.sort((left, right) => compareCells(left.cell, right.cell));
const shellTargets = shellOperations.map(({ cell }) => cell);
const openingTargets = openingOperations.map(({ cell }) => cell);
const allTargets = uniqueCells([...shellTargets, ...openingTargets]);
invariant(allTargets.length === shellTargets.length + openingTargets.length,
  'shell and opening packages intersect');
invariant(shellTargets.length > 0 && openingTargets.length > 0,
  'release compiled to an empty package');
invariant(shellOperations.length + shellAlreadyTarget.length + shellAlreadyEnclosing.length
  === tubeDesign.length,
'tube design source classes do not form an exact partition');
invariant(openingOperations.length + portalAlreadyOpen.length + routeAlreadyClear.length
  === frozenSurface.length,
'route source classes do not form an exact partition');

// Exact block-entity and saved-entity screens from the same complete save.
const targetKeys = new Set(allTargets.map(cellKey));
const touchedChunkKeys = [...new Set(allTargets.map((cell) => (
  `${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`
)))].sort((left, right) => {
  const [lx, lz] = left.split(',').map(Number);
  const [rx, rz] = right.split(',').map(Number);
  return lx - rx || lz - rz;
});
const blockEntityIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkKey of touchedChunkKeys) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await currentReader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await currentEntityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityTouchesTarget(entity, allTargets)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: Array.isArray(entity.Pos) ? entity.Pos.slice(0, 3).map(Number) : null,
        chunk: { x: cx, z: cz },
      });
    }
  }
}
invariant(blockEntityIntersections.length === 0,
  'operation target intersects a source block entity');
invariant(savedEntityHaloIntersections.length === 0,
  'operation target halo intersects a saved entity');

const protectedIntersections = [];
for (const relic of relics.relics) {
  const cells = allTargets.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
  'operation targets intersect a protected relic core');

// Prove isolation from every earlier physical package.  The only permitted
// overlap is the exact R05 finish plug class that this release intentionally
// opens; one of those 50 plugs is already air in the current source.
const priorPackages = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    priorPackages.push({
      id: `${manifest.transactionId}/${pkg.key}`,
      manifestPath,
      operationPath: pkg.forward,
      operationMap: parseColumnOperations(pkg.forward),
    });
  }
}
const priorIntersections = [];
for (const pkg of priorPackages) {
  const cells = allTargets.filter((cell) => operationAt(pkg.operationMap, cell));
  if (cells.length) priorIntersections.push({
    packageId: pkg.id,
    manifestPath: pkg.manifestPath,
    operationPath: pkg.operationPath,
    ...classManifest(cells),
  });
}
invariant(priorIntersections.length === 1
  && priorIntersections[0].packageId === 'combined-zones-r05-mountain/b10-finish'
  && priorIntersections[0].cellCount === portalPlugDesign.length - portalAlreadyOpen.length
  && priorIntersections[0].coordinateSetSha256
    === hashCells(openingTargets.filter((cell) => portalPlugKeys.has(cellKey(cell)))),
'prior-release overlap is not exactly the currently present R05 portal plugs');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [
  { key: 'b03-tube-shell', operations: shellOperations },
  { key: 'b03-portal-openings', operations: openingOperations },
];
const packageArtifacts = [];
for (const pkg of packages) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => (
    replLine(cell, fromState, toState)
  )).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.map(({ cell, fromState, toState }) => (
    replLine(cell, toState, fromState)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = classManifest(pkg.operations.map(({ cell }) => cell));
  const forward = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${pkg.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# package target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageArtifacts.push({
    key: pkg.key,
    forward,
    rollback,
    forwardSha256,
    rollbackSha256,
    commandCount: pkg.operations.length,
    targetIdentity,
    sourceStateCensus: sourceCensus(pkg.operations),
  });
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_FRESH_COMPLETE_SAVE_AWAITING_HARD_SAFETY_KERNEL',
  releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  mvpScope: true,
  scopeIds: ['P1-B03'],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({
    key, forward, rollback,
  })),
  executionOrder: {
    forward: ['b03-tube-shell', 'b03-portal-openings'],
    rollback: ['b03-portal-openings', 'b03-tube-shell'],
    rationale: 'Enclose the route before opening it; close the route before removing its enclosure.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
    mvpScope: true,
    scopeIds: ['P1-B03'],
    purpose: 'Complete the visible exposed B03 J-curve as an enclosed polished-diorite portal tube and open its two exact five-wide mountain plugs.',
    materialDoctrine: {
      shell: TARGET_SHELL_STATE,
      basis: 'Matches the accepted R05 exposed finish above y=130 and the existing portal seam fabric.',
      routeVoid: TARGET_ROUTE_STATE,
    },
    geometry: {
      frozenR03SurfaceDeferral: classManifest(frozenSurface),
      tubeDesign: classManifest(tubeDesign),
      portalPlugDesign: classManifest(portalPlugDesign),
      tubeBounds: boundsOf(tubeDesign),
      routeCrossSectionContinuity: {
        projectedPostState: TARGET_ROUTE_STATE,
        projectedClearCellCount: frozenSurface.length,
        faceConnectedComponentCount: frozenSurfaceConnectivity.componentCount,
        largestFaceConnectedComponentCellCount:
          frozenSurfaceConnectivity.largestComponentCellCount,
        componentSetSha256: frozenSurfaceConnectivity.componentSetSha256,
        exposedCenterlineFirstIndex: exposedCenterlineIndices[0],
        exposedCenterlineLastIndex: exposedCenterlineIndices.at(-1),
        exposedCenterlinePointCount: exposedCenterlineIndices.length,
        exposedCenterlineContiguous: true,
        externalBoundaryFaceCount,
        externalBoundaryUniqueCellCount: externalBoundaryUnique.length,
        externalBoundaryCoordinateSetSha256: hashCells(externalBoundaryUnique),
        everyExternalBoundaryCellEnclosedAfterShellPackage: true,
      },
    },
    sourcePartition: {
      tubeShell: {
        operated: classManifest(shellTargets),
        alreadyTarget: classManifest(shellAlreadyTarget),
        alreadyEnclosingStone: classManifest(shellAlreadyEnclosing),
        exactPartition: true,
      },
      routeVoid: {
        operated: classManifest(openingTargets),
        portalPlugsOperated: classManifest(
          openingTargets.filter((cell) => portalPlugKeys.has(cellKey(cell))),
        ),
        transientSnowOperated: classManifest(transientRouteClearance),
        portalPlugsAlreadyOpen: classManifest(portalAlreadyOpen),
        alreadyClearAir: classManifest(routeAlreadyClear),
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
    touchedChunkCount: touchedChunkKeys.length,
    packageSourceStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => [
      pkg.key, pkg.sourceStateCensus,
    ])),
  },
  target: {
    operatedUnion: classManifest(allTargets),
    packageTargetsDisjoint: true,
    desiredStateCensus: {
      'b03-tube-shell': { [TARGET_SHELL_STATE]: shellOperations.length },
      'b03-portal-openings': { [TARGET_ROUTE_STATE]: openingOperations.length },
    },
  },
  operations: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, {
    forwardSha256: pkg.forwardSha256,
    rollbackSha256: pkg.rollbackSha256,
    forwardCommandCount: pkg.commandCount,
    rollbackCommandCount: pkg.commandCount,
    targetCoordinateSetSha256: pkg.targetIdentity.coordinateSetSha256,
    exactInverse: true,
  }])),
  isolation: {
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    blockEntityTargetIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    priorReleaseIntersections: priorIntersections,
    intentionalPriorReleaseOverlap: {
      packageId: 'combined-zones-r05-mountain/b10-finish',
      design: classManifest(portalPlugDesign),
      operatedNow: classManifest(
        openingTargets.filter((cell) => portalPlugKeys.has(cellKey(cell))),
      ),
      alreadyOpenNow: classManifest(portalAlreadyOpen),
      doctrine: 'The exact R05 finish intersection is the two designed B03 portal plugs; rollback restores every currently present plug exactly.',
    },
    undeclaredPriorReleaseIntersectionCount: 0,
  },
  compileGuards: {
    unexpectedSourceStateViolationCount: compileViolations.length,
    fluidSourceStateViolationCount: compileViolations.filter(({ fluid }) => fluid).length,
    gravitySourceStateViolationCount: compileViolations.filter(({ gravity }) => gravity).length,
    forbiddenContainerSourceStateViolationCount: compileViolations
      .filter(({ forbiddenContainer }) => forbiddenContainer).length,
    shellAllowedSourceStates: [
      'minecraft:air',
      SAFE_TRANSIENT_STATE,
      TARGET_SHELL_STATE,
      'minecraft:stone',
    ],
    portalPlugAllowedSourceStates: [TARGET_SHELL_STATE, TARGET_ROUTE_STATE],
    remainingRouteAllowedSourceStates: [TARGET_ROUTE_STATE, SAFE_TRANSIENT_STATE],
  },
  upstreamIdentities: {
    b03GeometryPath: INPUTS.b03Geometry,
    b03GeometrySha256: sha256(fs.readFileSync(absolute(INPUTS.b03Geometry))),
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    r03ManifestPath: INPUTS.r03Manifest,
    r03ManifestIdentity: r03.manifestIdentity,
    r05ManifestPath: INPUTS.r05Manifest,
    r05ManifestIdentity: r05.manifestIdentity,
    protectedRelicClearancePath: INPUTS.protectedRelics,
    protectedRelicClearanceSha256: sha256(fs.readFileSync(absolute(INPUTS.protectedRelics))),
  },
  hardSafetyKernelNext: [
    'independent guarded-manifest QA',
    'exact forward preflight against this source snapshot',
    'strict-noop forward and rollback parser dry-runs',
    'same-moment live entity clearance bound to both operation hashes',
    'strict-noop execution in declared order with journal',
    'fresh post snapshot and exact rollback preflight',
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
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  packages: packageArtifacts.map((pkg) => ({
    key: pkg.key,
    forward: pkg.forward,
    rollback: pkg.rollback,
    commandCount: pkg.commandCount,
    forwardSha256: pkg.forwardSha256,
    rollbackSha256: pkg.rollbackSha256,
    sourceStateCensus: pkg.sourceStateCensus,
  })),
  protectedRelicCoreIntersectionCount: protectedIntersections.length,
  blockEntityTargetIntersectionCount: blockEntityIntersections.length,
  savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
  undeclaredPriorReleaseIntersectionCount: 0,
}, null, 2));
