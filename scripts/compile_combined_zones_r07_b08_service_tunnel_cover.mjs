#!/usr/bin/env node
/**
 * Compile the CZ-R07C P1-B08 service-tunnel cover from the accepted R07A
 * post-state. The already-bored 6x6 route is wrapped with a one-cell
 * polished-diorite shell, except for its exact west entrance and its exact
 * five-wide B03 connection. The shell is built before the remaining exact
 * snow/vegetation/terrain cells are cleared from the route and entrance.
 *
 * This is an offline compiler. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  compareCells,
  deriveB08ServiceTunnelConstruction,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:10:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07a-live-20260821T154500Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r07c-b08-service-tunnel-cover');
const SOURCE_STAGE = value('--source-stage', 'accepted-r07a-post');
const COMPARISON_SNAPSHOT = value('--comparison-snapshot', '');
const RELEASE_ID = 'CZ-R07C-PHASE1-B08-SERVICE-TUNNEL-COVER';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const SHELL_STATE = 'minecraft:polished_diorite';
const VOID_STATE = 'minecraft:air';

const EXPECTED = Object.freeze({
  constructionCellCount: 7878,
  constructionSha256: '967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882',
  externalBoundaryCellCount: 5327,
  externalBoundarySha256: '83c7bae09d31a562de9cf0d1c31d35ad68b04438545270ee592e462e6c657994',
  westEntranceCellCount: 24,
  westEntranceSha256: 'b7a6d1173b904243df812c16c7465c081211e30a2f4599d2f858bf0ddffda49f',
  b03ConnectionCellCount: 20,
  b03ConnectionSha256: '95b1b86fa537ebc6aae1bdefae200a218971ba5643cf2f8e1a19f347b8fa0e85',
  shellDesignCellCount: 5283,
  shellDesignSha256: 'e61aca484f2ff44d2ace64d1b9948236c7c59586743ef79d159dc0a776e7ce79',
  shellOperationCount: 5252,
  clearanceOperationCount: 28,
  operatedUnionSha256: '961edbe920f3433803868318af0b1ed59806d278fa18a798602fc466679c74e6',
  recoveryDifferenceCount: 8,
  recoveryDifferenceSha256: 'fe28c3b64ce7fe2c1c38a76eb61096eb5cc8afc363934dc07e43794de9730d2b',
  recoveryR03TransientOverlapCount: 3,
  recoveryR03TransientOverlapSha256:
    '57e73520da779b7926d91941d8edc40058b234fae7d3b4a55553c65902ed374d',
});
const expectedShellOperationCount = Number(value(
  '--expected-shell-operation-count',
  String(EXPECTED.shellOperationCount),
));
const expectedClearanceOperationCount = Number(value(
  '--expected-clearance-operation-count',
  String(EXPECTED.clearanceOperationCount),
));
const expectedOperatedUnionSha256 = value(
  '--expected-operated-union-sha256',
  EXPECTED.operatedUnionSha256,
);

const INPUTS = Object.freeze({
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  ],
});

const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
]);
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const SHELL_REPLACEABLE_STATES = new Set([
  'minecraft:air',
  'minecraft:snow[layers=1]',
]);
const SHELL_PRESERVED_ENCLOSURE_STATES = new Set([
  SHELL_STATE,
  'minecraft:stone',
  'minecraft:dirt',
  'minecraft:grass_block[snowy=true]',
  'minecraft:grass_block[snowy=false]',
]);
const CLEARANCE_REPLACEABLE_STATES = new Set([
  'minecraft:snow[layers=1]',
  'minecraft:short_grass',
  'minecraft:dirt',
  'minecraft:grass_block[snowy=true]',
  'minecraft:grass_block[snowy=false]',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07C B08 cover compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAirState = (state) => AIR_BLOCKS.has(blockName(state));
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

invariant(['accepted-r07a-post', 'rollback-recovery'].includes(SOURCE_STAGE),
  `unsupported source stage ${SOURCE_STAGE}`);
invariant(Number.isSafeInteger(expectedShellOperationCount)
  && expectedShellOperationCount > 0,
'expected shell operation count must be a positive safe integer');
invariant(Number.isSafeInteger(expectedClearanceOperationCount)
  && expectedClearanceOperationCount > 0,
'expected clearance operation count must be a positive safe integer');
invariant(/^[a-f0-9]{64}$/.test(expectedOperatedUnionSha256),
  'expected operated-union SHA-256 is malformed');

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
    invariant(x1 === x2 && z1 === z2, `${filename} contains a non-column operation`);
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

const connectors = readJson(INPUTS.connectors);
const b03 = readJson(INPUTS.b03Geometry);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const relics = readJson(INPUTS.protectedRelics);
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

const construction = deriveB08ServiceTunnelConstruction(connectors);
invariant(construction.length === EXPECTED.constructionCellCount
  && hashCells(construction) === EXPECTED.constructionSha256,
'B08 construction geometry drifted');
const g03B08 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B08');
invariant(g03B08?.construction?.coordinateSetSha256 === hashCells(construction),
  'B08 geometry does not reproduce the canonical G03 identity');

const constructionKeys = new Set(construction.map(cellKey));
const externalBoundary = uniqueCells(construction.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))
)).filter((cell) => !constructionKeys.has(cellKey(cell))));
invariant(externalBoundary.length === EXPECTED.externalBoundaryCellCount
  && hashCells(externalBoundary) === EXPECTED.externalBoundarySha256,
'B08 external face boundary drifted');

const westEntrance = [];
for (let y = 72; y <= 75; y += 1) {
  for (let z = -630; z <= -625; z += 1) westEntrance.push({ x: 1947, y, z });
}
invariant(westEntrance.length === EXPECTED.westEntranceCellCount
  && hashCells(westEntrance) === EXPECTED.westEntranceSha256,
'B08 west entrance aperture drifted');

const b03ConstructionKeys = new Set(
  uniqueCells(b03.design.excavationReservation.cells).map(cellKey),
);
const b03Connection = externalBoundary.filter((cell) => (
  b03ConstructionKeys.has(cellKey(cell))
));
invariant(b03Connection.length === EXPECTED.b03ConnectionCellCount
  && hashCells(b03Connection) === EXPECTED.b03ConnectionSha256,
'B08-to-B03 continuation aperture drifted');

const westEntranceKeys = new Set(westEntrance.map(cellKey));
const b03ConnectionKeys = new Set(b03Connection.map(cellKey));
const shellDesign = externalBoundary.filter((cell) => (
  !westEntranceKeys.has(cellKey(cell)) && !b03ConnectionKeys.has(cellKey(cell))
));
invariant(shellDesign.length === EXPECTED.shellDesignCellCount
  && hashCells(shellDesign) === EXPECTED.shellDesignSha256,
'B08 shell design drifted');
invariant(shellDesign.length + westEntrance.length + b03Connection.length
  === externalBoundary.length,
'shell and the two aperture sets do not exactly partition the boundary');

const projectedVoid = uniqueCells([...construction, ...westEntrance]);
const projectedConnectivity = connectedComponentManifest(projectedVoid);
invariant(projectedConnectivity.componentCount === 1
  && projectedConnectivity.largestComponentCellCount === projectedVoid.length,
'projected B08 route and west entrance are not one face-connected component');

const currentReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const currentEntityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const compileViolations = [];
const shellOperations = [];
const shellAlreadyEnclosing = [];
for (const cell of shellDesign) {
  const state = stateToCommandString(await currentReader.blockState(cell.x, cell.y, cell.z));
  if (SHELL_REPLACEABLE_STATES.has(state)) {
    shellOperations.push({ cell, fromState: state, toState: SHELL_STATE });
  } else if (SHELL_PRESERVED_ENCLOSURE_STATES.has(state)) {
    shellAlreadyEnclosing.push({ cell, state });
  } else {
    compileViolations.push({ cell, class: 'cover-shell', sourceState: state });
  }
}

const clearanceOperations = [];
const clearanceAlreadyAir = [];
for (const cell of projectedVoid) {
  const state = stateToCommandString(await currentReader.blockState(cell.x, cell.y, cell.z));
  if (isAirState(state)) {
    clearanceAlreadyAir.push(cell);
  } else if (CLEARANCE_REPLACEABLE_STATES.has(state)) {
    clearanceOperations.push({ cell, fromState: state, toState: VOID_STATE });
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
clearanceOperations.sort((left, right) => compareCells(left.cell, right.cell));
const shellTargets = shellOperations.map(({ cell }) => cell);
const clearanceTargets = clearanceOperations.map(({ cell }) => cell);
const allTargets = uniqueCells([...shellTargets, ...clearanceTargets]);
invariant(shellTargets.length === expectedShellOperationCount,
  `shell operation count ${shellTargets.length} drifted`);
invariant(clearanceTargets.length === expectedClearanceOperationCount,
  `clearance operation count ${clearanceTargets.length} drifted`);
invariant(allTargets.length === shellTargets.length + clearanceTargets.length,
  'shell and clearance operation targets intersect');
invariant(hashCells(allTargets) === expectedOperatedUnionSha256,
  'operated target union drifted');
invariant(shellOperations.length + shellAlreadyEnclosing.length === shellDesign.length,
  'shell source classes do not exactly partition the design');
invariant(clearanceOperations.length + clearanceAlreadyAir.length === projectedVoid.length,
  'clearance source classes do not exactly partition the projected void');

let recoveryComparison = null;
if (SOURCE_STAGE === 'rollback-recovery') {
  invariant(COMPARISON_SNAPSHOT, 'rollback-recovery requires --comparison-snapshot');
  invariant(fs.existsSync(absolute(path.join(COMPARISON_SNAPSHOT, 'region'))),
    'comparison snapshot has no region directory');
  const comparisonReader = new AnvilReader(
    absolute(path.join(COMPARISON_SNAPSHOT, 'region')),
  );
  const sourceDifferences = [];
  const designUnion = uniqueCells([...shellDesign, ...projectedVoid]);
  for (const cell of designUnion) {
    const priorState = stateToCommandString(
      await comparisonReader.blockState(cell.x, cell.y, cell.z),
    );
    const recoveryState = stateToCommandString(
      await currentReader.blockState(cell.x, cell.y, cell.z),
    );
    if (priorState !== recoveryState) {
      sourceDifferences.push({
        cell,
        priorState,
        recoveryState,
        designClass: constructionKeys.has(cellKey(cell))
          || westEntranceKeys.has(cellKey(cell))
          ? 'route-and-entrance'
          : 'cover-shell',
      });
    }
  }
  const nonSnowDifferences = sourceDifferences.filter(({ priorState, recoveryState }) => !(
    (isAirState(priorState) && recoveryState === 'minecraft:snow[layers=1]')
    || (priorState === 'minecraft:snow[layers=1]' && isAirState(recoveryState))
  ));
  invariant(sourceDifferences.length === EXPECTED.recoveryDifferenceCount
    && hashCells(sourceDifferences.map(({ cell }) => cell))
      === EXPECTED.recoveryDifferenceSha256,
  'recovery source difference set drifted from the reviewed eight snow transitions');
  invariant(nonSnowDifferences.length === 0,
    'recovery source includes a non-snow state transition');
  recoveryComparison = {
    priorSnapshotRoot: COMPARISON_SNAPSHOT,
    priorCompleteSaveSha256:
      '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
    exactDesignCellCountCompared: designUnion.length,
    sourceDifferenceIdentity: classManifest(sourceDifferences.map(({ cell }) => cell)),
    sourceDifferences: sourceDifferences.map(({ cell, ...difference }) => ({
      ...cell,
      ...difference,
    })),
    oneLayerSnowOrAirTransitionCount: sourceDifferences.length,
    nonSnowTransitionCount: nonSnowDifferences.length,
    noOtherTargetOrDesignDrift: true,
  };
} else {
  invariant(!COMPARISON_SNAPSHOT,
    '--comparison-snapshot is valid only with --source-stage rollback-recovery');
}

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

const priorIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const operationMap = parseColumnOperations(pkg.forward);
    const cells = allTargets.filter((cell) => operationAt(operationMap, cell));
    if (cells.length) priorIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      manifestPath,
      operationPath: pkg.forward,
      everyPriorTargetWasClearedToAir: cells.every((cell) => (
        operationAt(operationMap, cell)?.toState === VOID_STATE
      )),
      ...classManifest(cells),
    });
  }
}
let recoveryPriorOverlapCells = [];
let recoveryPriorOverlapStatesAreSnow = false;
if (SOURCE_STAGE === 'rollback-recovery' && priorIntersections.length === 1) {
  const recoveryPriorOperationMap = parseColumnOperations(
    priorIntersections[0].operationPath,
  );
  recoveryPriorOverlapCells = clearanceTargets.filter((cell) => (
    operationAt(recoveryPriorOperationMap, cell)
  ));
  recoveryPriorOverlapStatesAreSnow = true;
  for (const cell of recoveryPriorOverlapCells) {
    const state = stateToCommandString(
      await currentReader.blockState(cell.x, cell.y, cell.z),
    );
    if (state !== 'minecraft:snow[layers=1]') {
      recoveryPriorOverlapStatesAreSnow = false;
      break;
    }
  }
}
const intentionalRecoveryPriorOverlap = SOURCE_STAGE === 'rollback-recovery'
  && priorIntersections.length === 1
  && priorIntersections[0].packageId
    === 'combined-zones-r03-tunnels-v2/b08-service-tunnel'
  && priorIntersections[0].cellCount === EXPECTED.recoveryR03TransientOverlapCount
  && priorIntersections[0].coordinateSetSha256
    === EXPECTED.recoveryR03TransientOverlapSha256
  && priorIntersections[0].everyPriorTargetWasClearedToAir === true
  && recoveryPriorOverlapCells.length === EXPECTED.recoveryR03TransientOverlapCount
  && recoveryPriorOverlapStatesAreSnow;
invariant(priorIntersections.length === 0 || intentionalRecoveryPriorOverlap,
  `operation targets intersect prior releases: ${JSON.stringify(priorIntersections)}`);

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [
  { key: 'b08-cover-shell', operations: shellOperations },
  { key: 'b08-route-openings', operations: clearanceOperations },
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
  status: SOURCE_STAGE === 'rollback-recovery'
    ? 'COMPILED_FROM_COMPLETE_ROLLBACK_RECOVERY_SAVE_AWAITING_FRESH_LIVE_KERNEL'
    : 'COMPILED_FROM_ACCEPTED_R07A_POSTSTATE_AWAITING_HARD_SAFETY_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B08'],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({
    key, forward, rollback,
  })),
  executionOrder: {
    forward: ['b08-cover-shell', 'b08-route-openings'],
    rollback: ['b08-route-openings', 'b08-cover-shell'],
    rationale: 'Complete the cover before clearing its route and west entrance; restore the closures before removing the cover.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    purpose: 'Cover the already-bored P1-B08 service route while preserving its west entrance and exact B03 connection.',
    materialDoctrine: {
      shell: SHELL_STATE,
      routeVoid: VOID_STATE,
      basis: 'Matches the accepted R07A portal-tube fabric and keeps one deterministic Phase 3 architecture palette.',
    },
    geometry: {
      frozenB08Construction: classManifest(construction),
      externalBoundary: classManifest(externalBoundary),
      shellDesign: classManifest(shellDesign),
      westEntrance: classManifest(westEntrance),
      b03Connection: classManifest(b03Connection),
      projectedRouteAndEntranceVoid: classManifest(projectedVoid),
      routeContinuity: {
        projectedClearCellCount: projectedVoid.length,
        faceConnectedComponentCount: projectedConnectivity.componentCount,
        largestFaceConnectedComponentCellCount:
          projectedConnectivity.largestComponentCellCount,
        componentSetSha256: projectedConnectivity.componentSetSha256,
        everyExternalBoundaryCellResolved: true,
        apertureCount: 2,
        apertureCellCount: westEntrance.length + b03Connection.length,
      },
    },
    sourcePartition: {
      coverShell: {
        operated: classManifest(shellTargets),
        alreadyEnclosing: classManifest(shellAlreadyEnclosing.map(({ cell }) => cell)),
        alreadyEnclosingStateCensus: sourceCensus(shellAlreadyEnclosing.map(({ cell, state }) => ({
          cell, fromState: state, toState: state,
        }))),
        exactPartition: true,
      },
      routeAndEntrance: {
        operated: classManifest(clearanceTargets),
        alreadyAir: classManifest(clearanceAlreadyAir),
        exactPartition: true,
      },
    },
  },
  source: {
    stage: SOURCE_STAGE,
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunkKeys.length,
    packageSourceStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => [
      pkg.key, pkg.sourceStateCensus,
    ])),
    recoveryComparison,
  },
  target: {
    operatedUnion: classManifest(allTargets),
    packageTargetsDisjoint: true,
    desiredStateCensus: {
      'b08-cover-shell': { [SHELL_STATE]: shellOperations.length },
      'b08-route-openings': { [VOID_STATE]: clearanceOperations.length },
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
    intentionalRecoveryPriorReleaseOverlap: intentionalRecoveryPriorOverlap
      ? {
        packageId: priorIntersections[0].packageId,
        ...classManifest(recoveryPriorOverlapCells),
        doctrine: 'One-layer snow reoccupied three exact R03 cells whose accepted desired state is air; this package clears only that transient snow.',
      }
      : null,
    undeclaredPriorReleaseIntersectionCount:
      priorIntersections.length - (intentionalRecoveryPriorOverlap ? 1 : 0),
  },
  compileGuards: {
    unexpectedSourceStateViolationCount: compileViolations.length,
    fluidSourceStateViolationCount: compileViolations.filter(({ fluid }) => fluid).length,
    gravitySourceStateViolationCount: compileViolations.filter(({ gravity }) => gravity).length,
    forbiddenContainerSourceStateViolationCount: compileViolations
      .filter(({ forbiddenContainer }) => forbiddenContainer).length,
    shellReplaceableSourceStates: [...SHELL_REPLACEABLE_STATES],
    shellPreservedEnclosureStates: [...SHELL_PRESERVED_ENCLOSURE_STATES],
    clearanceReplaceableSourceStates: [...CLEARANCE_REPLACEABLE_STATES],
  },
  upstreamIdentities: {
    connectorGeometryPath: INPUTS.connectors,
    connectorGeometrySha256: sha256(fs.readFileSync(absolute(INPUTS.connectors))),
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    b03GeometryPath: INPUTS.b03Geometry,
    b03GeometrySha256: sha256(fs.readFileSync(absolute(INPUTS.b03Geometry))),
    protectedRelicClearancePath: INPUTS.protectedRelics,
    protectedRelicClearanceSha256: sha256(fs.readFileSync(absolute(INPUTS.protectedRelics))),
  },
  hardSafetyKernelNext: [
    'independent guarded-manifest QA',
    'exact forward preflight against the accepted R07A post snapshot',
    'strict-noop forward and rollback parser dry-runs',
    'fresh same-moment live entity clearance bound to both operation hashes',
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
  undeclaredPriorReleaseIntersectionCount:
    priorIntersections.length - (intentionalRecoveryPriorOverlap ? 1 : 0),
}, null, 2));
