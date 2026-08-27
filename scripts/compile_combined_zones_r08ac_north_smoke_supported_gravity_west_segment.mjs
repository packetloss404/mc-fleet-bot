#!/usr/bin/env node
/** Compile the maximal durably supported gravity-adjacent segment of EE-SMOKE-N. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, D06_CELL_PREAMBLE, boundsOf, cellKey, cellsIn, hashCells,
  rawCoordinateHash, replLine, sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const VARIANT = value('--variant', 'r08ac');
const IS_AD = VARIANT === 'r08ad';
invariantVariant(VARIANT === 'r08ac' || IS_AD, `unsupported variant ${VARIANT}`);
const GENERATED_AT = value('--generated-at', IS_AD ? '2026-08-22T01:24:00Z' : '2026-08-22T01:15:00Z');
const SNAPSHOT = value('--snapshot', IS_AD
  ? 'data/worldsnap-combined-zones-r08ac-post-20260822T011245Z'
  : 'data/worldsnap-combined-zones-r08ab-post-20260822T005922Z');
const INTAKE_AUDIT = value('--intake-audit',
  IS_AD ? 'data/world-review/combined-zones-r08ac-live-20260822T011245Z/post-complete-save-intake.json'
    : 'data/world-review/combined-zones-r08ab-live-20260822T005922Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger',
  IS_AD ? 'data/world-review/combined-zones-r08ac-live-20260822T011245Z/evidence-ledger.json'
    : 'data/world-review/combined-zones-r08ab-live-20260822T005922Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', IS_AD
  ? 'combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment'
  : 'combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment');
const RELEASE_ID = IS_AD
  ? 'CZ-R08AD-EMPTY-EIGHT-NORTH-SMOKE-SUPPORTED-GRAVITY-EAST-SEGMENT'
  : 'CZ-R08AC-EMPTY-EIGHT-NORTH-SMOKE-SUPPORTED-GRAVITY-WEST-SEGMENT';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const WALL_KEY = IS_AD
  ? 'ee-smoke-n-supported-gravity-east-compartment-wall'
  : 'ee-smoke-n-supported-gravity-west-compartment-wall';
const WALL_STATE = 'minecraft:stone_bricks';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
  ...['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
    'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
    .map((colour) => `minecraft:${colour}_concrete_powder`),
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const CONTROL_PATTERN = /(?:redstone|repeater|comparator|piston|observer|lever|button|pressure_plate|tripwire|rail)/;
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  layerB: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  n06Finding: 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
  priorManifest: IS_AD
    ? 'data/buildops/combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment.release-manifest.json'
    : 'data/buildops/combined-zones-r08ab-empty-eight-north-smoke-far-east-segment.release-manifest.json',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
function invariantVariant(condition, message) {
  if (!condition) throw new Error(`north-smoke supported-gravity compiler rejected: ${message}`);
}
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${IS_AD ? 'R08AD north-smoke supported-gravity-east-segment' : 'R08AC north-smoke supported-gravity-west-segment'} compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const isForbidden = (state) => FORBIDDEN.has(blockName(state))
  || /_shulker_box$/.test(blockName(state)) || CONTROL_PATTERN.test(blockName(state));
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const census = (records, selector = (record) => record.state) => {
  const counts = new Map();
  for (const record of records) {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseOperations(filename) {
  const output = [];
  for (const [index, raw] of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename}:${index + 1} malformed`);
    const c = fields.slice(1, 7).map(Number);
    output.push({ bounds: { minX: Math.min(c[0], c[3]), maxX: Math.max(c[0], c[3]),
      minY: Math.min(c[1], c[4]), maxY: Math.max(c[1], c[4]),
      minZ: Math.min(c[2], c[5]), maxZ: Math.max(c[2], c[5]) },
    fromState: fields[7], toState: fields[8] });
  }
  return output;
}
function components(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0,
    componentSizes: sizes };
}

const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const layerB = readJson(INPUTS.layerB);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const n06 = readJson(INPUTS.n06Finding);
const priorManifest = readJson(INPUTS.priorManifest);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake does not bind the selected snapshot');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === (IS_AD
    ? 'combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment'
    : 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment')
  && absolute(sourceLedger.postSnapshot.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'terminal R08AB ledger/post identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const smokeSource = emptyEight.d06.lifeSafety.smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-N');
const smokeAlternative = lifeSafety.d06EmptyEightLifeSafety.failClosedBarriersAndSmokeInterfaces
  .smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-N');
const interfaceContract = layerB.contracts.find(({ contractId }) => (
  contractId === 'IF-D06-EE-SMOKE-N-COMPARTMENT'
));
invariant(smokeSource && smokeAlternative && smokeSource.smokeDoorMechanismAuthorized === false
  && smokeAlternative.smokeDoorMechanism === null && smokeAlternative.operationallyAuthorized === false
  && interfaceContract?.acceptance?.accepted === true,
'frozen passive EE-SMOKE-N doctrine drifted');
const openingCells = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: 50, maxZ: 50,
}));
const openingKeys = new Set(openingCells.map(cellKey));
const fullPlane = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const fullWall = fullPlane.filter((cell) => !openingKeys.has(cellKey(cell)));
invariant(fullWall.length === 1336 && openingCells.length === 36 && fullPlane.length === 1372
  && rawCoordinateHash(fullWall) === smokeSource.boundaryPlane.cellSetSha256
  && rawCoordinateHash(openingCells) === smokeSource.smokeDoorOpeningReservations.cellSetSha256
  && hashCells(fullWall, D06_CELL_PREAMBLE) === smokeAlternative.retainedBoundaryPlane.coordinateSetSha256
  && hashCells(openingCells, D06_CELL_PREAMBLE) === smokeAlternative.staticOpeningCaps.coordinateSetSha256
  && hashCells(fullPlane, D06_CELL_PREAMBLE) === smokeAlternative.completeFailClosedBoundary.coordinateSetSha256,
'frozen north-smoke geometry drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key,
    stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
}
async function records(cells) {
  const output = [];
  for (const cell of cells) output.push({ cell, state: await stateAt(cell) });
  return output;
}
async function faceHalo(cells) {
  const keys = new Set(cells.map(cellKey));
  return uniqueCells(cells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))).filter((cell) => !keys.has(cellKey(cell))));
}

const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
const n06Keys = new Set(n06Cells.map(cellKey));
async function gravitySupportClosure(cell) {
  const dependency = [{ cell, state: await stateAt(cell) }];
  let cursor = { x: cell.x, y: cell.y - 1, z: cell.z };
  for (let depth = 0; depth < 64; depth += 1) {
    const state = await stateAt(cursor);
    dependency.push({ cell: cursor, state });
    if (isGravity(state)) {
      cursor = { x: cursor.x, y: cursor.y - 1, z: cursor.z };
      continue;
    }
    return { sourceCell: cell, dependency,
      terminalSupport: { cell: cursor, state },
      durablySupported: state !== 'minecraft:air' && !isFluid(state) && !isForbidden(state) };
  }
  invariant(false, `gravity support below ${cellKey(cell)} did not terminate`);
}

// Rank every still-air full-height x-column whose face halo contains gravity
// but no fluid/control state. Every retained gravity cell must have a complete
// downward dependency chain terminating on durable exact-source support; the
// four suspended N06 source cells and every unstable chain are default-deny.
const columnFindings = [];
for (let x = 1652; x <= 1847; x += 1) {
  const cells = cellsIn({ minX: x, maxX: x, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
  const halo = await faceHalo(cells);
  const targetRecords = await records(cells);
  const haloRecords = await records(halo);
  const targetHazards = targetRecords.filter(({ state }) => isFluid(state)
    || isGravity(state) || isForbidden(state));
  const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
  const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
  const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
  const gravityClosures = [];
  for (const { cell } of haloGravity) gravityClosures.push(await gravitySupportClosure(cell));
  const n06Intersections = halo.filter((cell) => n06Keys.has(cellKey(cell)));
  const eligible = targetRecords.every(({ state }) => state === 'minecraft:air')
    && targetHazards.length === 0 && haloFluid.length === 0 && haloForbidden.length === 0
    && haloGravity.length > 0 && gravityClosures.every(({ durablySupported }) => durablySupported)
    && n06Intersections.length === 0;
  columnFindings.push({ x, eligible, targetHazardCount: targetHazards.length,
    haloFluidCount: haloFluid.length, haloGravityCount: haloGravity.length,
    haloForbiddenCount: haloForbidden.length, n06IntersectionCount: n06Intersections.length,
    stableGravityClosureCount: gravityClosures.filter(({ durablySupported }) => durablySupported).length });
}
const supportedGravityRuns = [];
let runStart = null;
for (const finding of [...columnFindings, { x: 1848, eligible: false }]) {
  if (finding.eligible && runStart === null) runStart = finding.x;
  if (!finding.eligible && runStart !== null) {
    supportedGravityRuns.push({ minX: runStart, maxX: finding.x - 1,
      widthCells: finding.x - runStart });
    runStart = null;
  }
}
supportedGravityRuns.sort((a, b) => b.widthCells - a.widthCells || a.minX - b.minX);
const expectedSupportedRuns = IS_AD
  ? [{ minX: 1796, maxX: 1797, widthCells: 2 }]
  : [{ minX: 1787, maxX: 1791, widthCells: 5 }, { minX: 1796, maxX: 1797, widthCells: 2 }];
invariant(JSON.stringify(supportedGravityRuns) === JSON.stringify(expectedSupportedRuns),
  'maximal durably supported gravity-adjacent runs drifted');

const selectedRun = supportedGravityRuns[0];
const selected = cellsIn({ minX: selectedRun.minX, maxX: selectedRun.maxX,
  minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const selectedKeys = new Set(selected.map(cellKey));
const capCells = openingCells.filter((cell) => selectedKeys.has(cellKey(cell)));
const capKeys = new Set(capCells.map(cellKey));
const wallCells = selected.filter((cell) => !capKeys.has(cellKey(cell)));
const wallRecords = await records(wallCells);
const capRecords = await records(capCells);
const targetCells = [...wallCells, ...capCells];
const targetKeys = new Set(targetCells.map(cellKey));
const halo = await faceHalo(targetCells);
const haloRecords = await records(halo);
const selectedHaloFluid = haloRecords.filter(({ state }) => isFluid(state));
const selectedHaloGravity = haloRecords.filter(({ state }) => isGravity(state));
const selectedHaloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
const selectedGravityClosures = [];
for (const { cell } of selectedHaloGravity) {
  selectedGravityClosures.push(await gravitySupportClosure(cell));
}
const selectedGravityDependencyCells = uniqueCells(selectedGravityClosures.flatMap(
  ({ dependency }) => dependency.filter(({ state }) => isGravity(state)).map(({ cell }) => cell),
));
invariant(selected.length === (IS_AD ? 14 : 35) && wallCells.length === selected.length && capCells.length === 0
  && wallRecords.every(({ state }) => state === 'minecraft:air')
  && capRecords.every(({ state }) => state === 'minecraft:air')
  && halo.length === (IS_AD ? 46 : 94) && selectedHaloFluid.length === 0
  && selectedHaloGravity.length === (IS_AD ? 8 : 22) && selectedHaloForbidden.length === 0
  && selectedGravityClosures.every(({ durablySupported }) => durablySupported)
  && selectedGravityDependencyCells.length === selectedHaloGravity.length
  && selectedGravityDependencyCells.every((cell) => !targetKeys.has(cellKey(cell))),
`selected supported-gravity segment or durable gravity closure drifted: ${JSON.stringify({
  selected: selected.length, wall: wallCells.length, cap: capCells.length, halo: halo.length,
  haloFluid: selectedHaloFluid.length, haloGravity: selectedHaloGravity.length,
  haloForbidden: selectedHaloForbidden.length, dependencyGravity: selectedGravityDependencyCells.length,
})}`);
invariant(components(selected).componentCount === 1 && components(wallCells).componentCount === 1
  && capCells.length === 0,
'selected supported-gravity west segment topology drifted');

const n06Intersections = [...targetCells, ...halo].filter((cell) => (
  n06Cells.some((candidate) => cellKey(candidate) === cellKey(cell))
));
const fullPlaneRecords = await records(fullPlane);
const fullPlaneFluids = fullPlaneRecords.filter(({ state }) => isFluid(state));
invariant(n06Cells.length === 4 && n06Intersections.length === 0 && fullPlaneFluids.length === 6,
'selected segment did not isolate the wet/N06 interface');

const blockEntities = [];
const savedEntities = [];
const envelopeKeys = new Set([...targetCells, ...halo].map(cellKey));
const envelopeBounds = boundsOf([...targetCells, ...halo]);
const touchedChunks = uniqueCells(targetCells.map((cell) => ({
  x: Math.floor(cell.x / 16), y: 0, z: Math.floor(cell.z / 16),
}))).map(({ x, z }) => ({ x, z }));
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entities = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'selected interaction envelope contains a block entity or saved movable entity');
const protectedHits = protectedRelics.relics.flatMap((relic) => {
  const hits = [...targetCells, ...halo].filter((cell) => inside(cell, relic.declaredInclusiveBounds));
  return hits.length ? [{ relic: relic.key, ...exactSet(hits) }] : [];
});
const futureSealKeys = new Set(emptyEight.d06.futureInterfaces.interfaces.flatMap(
  ({ sealDesign }) => cellsIn(sealDesign.bounds),
).map(cellKey));
const futureSealHits = [...targetCells, ...halo].filter((cell) => futureSealKeys.has(cellKey(cell)));
invariant(protectedHits.length === 0 && futureSealHits.length === 0,
'selected interaction envelope intersects a protected relic or future line seal');

const priorPaths = [...new Set([
  ...priorManifest.isolation.acceptedPriorManifestChecks.map(({ path: filename }) => filename),
  INPUTS.priorManifest,
])];
const priorChecks = [];
const priorHits = [];
for (const manifestPath of priorPaths) {
  const prior = readJson(manifestPath);
  const hits = new Map();
  for (const pkg of prior.packages ?? []) {
    const declared = prior.operations?.[pkg.key]
      ?? ((prior.packages?.length ?? 0) === 1 && prior.operations?.forwardSha256 ? prior.operations : null);
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `prior operation body drifted: ${prior.transactionId}/${pkg.key}`);
    for (const operation of parseOperations(pkg.forward)) {
      for (const cell of targetCells) {
        if (inside(cell, operation.bounds)) hits.set(cellKey(cell), {
          cell, desiredPriorState: operation.toState, transactionId: prior.transactionId,
        });
      }
    }
  }
  priorChecks.push({ path: manifestPath, transactionId: prior.transactionId,
    manifestIdentity: prior.manifestIdentity, targetIntersectionCount: hits.size });
  priorHits.push(...hits.values());
}
const r02Hits = priorHits.filter(({ transactionId }) => transactionId === 'combined-zones-r02-d06-shell');
const undeclaredPriorHits = priorHits.filter(({ transactionId }) => transactionId !== 'combined-zones-r02-d06-shell');
invariant(priorPaths.length === (IS_AD ? 53 : 52) && r02Hits.length === selected.length
  && r02Hits.every(({ desiredPriorState }) => desiredPriorState === 'minecraft:air')
  && undeclaredPriorHits.length === 0,
`prior release ownership is not the exact declared R02 air-reservation supersession: ${JSON.stringify({
  priorPathCount: priorPaths.length, r02HitCount: r02Hits.length,
  r02States: census(r02Hits, (record) => record.desiredPriorState),
  undeclaredCount: undeclaredPriorHits.length,
  undeclaredTransactions: census(undeclaredPriorHits, (record) => record.transactionId),
})}`);

const wallOps = wallRecords.map(({ cell, state }) => ({ cell, fromState: state, toState: WALL_STATE }))
  .sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x);
const canonicalFile = (key, role) => `data/buildops/${BASENAME}.${key}.${role}.txt`;
const outputFile = (key, role) => path.join(OUT_DIR, `${BASENAME}.${key}.${role}.txt`);
const writeOperations = (key, operations) => {
  const header = [
    `# release: ${RELEASE_ID}`,
    `# release_node: ${RELEASE_NODE_ID}`,
    `# package: ${key}`,
    `# source_snapshot: ${SNAPSHOT}`,
    '# offline_compiler: true',
  ];
  const forward = `${header.join('\n')}\n${operations.map(({ cell, fromState, toState }) => (
    replLine(cell, fromState, toState)
  )).join('\n')}\n`;
  const reverse = operations.slice().reverse().map(({ cell, fromState, toState }) => (
    replLine(cell, toState, fromState)
  ));
  const rollback = `${header.join('\n')}\n# operation_role: rollback\n${reverse.join('\n')}\n`;
  fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
  fs.writeFileSync(absolute(outputFile(key, 'forward')), forward);
  fs.writeFileSync(absolute(outputFile(key, 'rollback')), rollback);
  return { key, forward: canonicalFile(key, 'forward'), rollback: canonicalFile(key, 'rollback'),
    forwardSha256: sha256(`${operations.map(({ cell, fromState, toState }) => (
      replLine(cell, fromState, toState)
    )).join('\n')}\n`), rollbackSha256: sha256(`${reverse.join('\n')}\n`),
    commandCount: operations.length, targetCoordinateSetSha256: hashCells(operations.map(({ cell }) => cell)) };
};
const emitted = [writeOperations(WALL_KEY, wallOps)];

const manifest = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: BASENAME,
  status: `COMPILED_FROM_ACCEPTED_${IS_AD ? 'R08AC' : 'R08AB'}_POST_AWAITING_FRESH_EXECUTION_KERNEL`,
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'OWN-D06-SMOKE',
    masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
    mvpScope: true,
    purpose: 'Build the maximal contiguous full-height wall segment beside a source-proven durably supported gravity halo while retaining every gravel state and excluding wet, suspended-gravity, and N06 interfaces.',
    materialDoctrine: { wall: { paletteId: 'EE-P01', block: WALL_STATE } },
    geometry: { fullFrozenNorthBoundary: exactSet(fullPlane),
    [IS_AD ? 'selectedSupportedGravityEastSegment' : 'selectedSupportedGravityWestSegment']: {
      ...exactSet(selected), widthCells: selectedRun.widthCells, heightCells: 7,
      topology: components(selected) }, selectedWallField: exactSet(wallCells),
    selectedOpeningReservationIntersection: exactSet(capCells),
    interactionHalo: exactSet(halo) },
    operationalBoundary: { boundedStaticConstructionAccepted: true,
      completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
      poweredSmokeDoorMechanismAuthorized: false, wetInterfaceTouched: false,
      n06OrGravityInterfaceTouched: false, retainedSupportedGravityInterfaceVerified: true,
      tenantOpeningCreated: false,
      publicRouteCommissioned: false },
  },
  scopeSelection: {
    doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_DURABLY_SUPPORTED_GRAVITY_ADJACENT_RUN',
    rankedSupportedGravityRuns: supportedGravityRuns,
    selectedRun: supportedGravityRuns[0],
    exactColumnFindingCount: columnFindings.length,
    rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
      exactPlaneFluidCount: fullPlaneFluids.length, exactN06BlockedCellCount: n06Cells.length,
      sourcePhysicsFinding: `${IS_AD ? 'R08AD' : 'R08AC'} admits only retained gravity with a complete durable exact-source support chain. Wet bands, suspended gravel, N06, and other non-air source-state cells remain outside this release.` },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    intakeAudit: INTAKE_AUDIT,
    terminalReleaseLedger: { path: SOURCE_LEDGER, transactionId: sourceLedger.transactionId,
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256 },
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    exactTargetStateCensus: census([...wallRecords, ...capRecords]),
  },
  isolation: {
    targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
    targetContainerOrControlIntersectionCount: 0,
    interactionHalo: exactSet(halo), interactionHaloFluidCount: selectedHaloFluid.length,
    interactionHaloGravityCount: selectedHaloGravity.length,
    interactionHaloContainerOrControlCount: selectedHaloForbidden.length,
    retainedGravitySupportClosure: { sourceGravityCellSet: exactSet(selectedHaloGravity.map(({ cell }) => cell)),
      dependencyGravityCellSet: exactSet(selectedGravityDependencyCells),
      closureCount: selectedGravityClosures.length,
      durableTerminalSupportCount: selectedGravityClosures.filter(
        ({ durablySupported }) => durablySupported,
      ).length,
      targetOrOperationIntersectionCount: selectedGravityDependencyCells.filter(
        (cell) => targetKeys.has(cellKey(cell)),
      ).length,
      closures: selectedGravityClosures },
    blockEntityInteractionEnvelopeIntersectionCount: blockEntities.length,
    savedEntityInteractionEnvelopeIntersectionCount: savedEntities.length,
    protectedRelicInteractionEnvelopeIntersectionCount: protectedHits.length,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: futureSealHits.length,
    isolatedN06Exception: { sourcePath: INPUTS.n06Finding,
      sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.n06Finding))),
      exactBlockedCellCount: n06Cells.length, interactionEnvelopeIntersectionCount: n06Intersections.length,
      remainsFailClosedAndUnchanged: true },
    r02AirReservationSupersession: { transactionId: 'combined-zones-r02-d06-shell',
      cellCount: r02Hits.length, desiredPriorStates: census(r02Hits, (record) => record.desiredPriorState) },
    checkedPriorManifestCount: priorChecks.length,
    acceptedPriorManifestChecks: priorChecks,
    undeclaredPriorReleaseIntersectionCount: undeclaredPriorHits.length,
  },
  executionOrder: {
    forward: [WALL_KEY], rollback: [WALL_KEY],
    withinPackage: 'bottom-up forward; exact reverse-line rollback',
    rationale: 'Build the connected passive wall bottom-up beside 22 retained, durably supported gravel cells. No gravity state or support changes. Exact reverse rollback restores source air top-down without removing any gravity support.',
  },
  operations: Object.fromEntries(emitted.map((record) => [record.key, {
    forwardSha256: record.forwardSha256, rollbackSha256: record.rollbackSha256,
    forwardCommandCount: record.commandCount, rollbackCommandCount: record.commandCount,
    targetCoordinateSetSha256: record.targetCoordinateSetSha256, exactInverse: true,
  }])),
  packages: emitted.map((record) => ({ key: record.key, forward: record.forward,
    rollback: record.rollback })),
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
    requireRetainedGravitySupportClosureExactAndStable: true,
    forbidFullNorthBoundaryCommissioningFromThisPartialScope: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
fs.writeFileSync(absolute(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)),
  `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status,
  manifest: `data/buildops/${BASENAME}.release-manifest.json`,
  manifestIdentity: manifest.manifestIdentity, releaseNodeId: RELEASE_NODE_ID,
  targetCellCount: targetCells.length, wallCellCount: wallCells.length, capCellCount: capCells.length,
  haloCellCount: halo.length, selectedRun: supportedGravityRuns[0],
  retainedSupportedGravityCellCount: selectedHaloGravity.length,
  fullPlaneFluidCount: fullPlaneFluids.length,
  packages: emitted.map(({ key, commandCount, forwardSha256, rollbackSha256 }) => ({
    key, commandCount, forwardSha256, rollbackSha256,
  })), liveCallsPerformed: false, worldEditsPerformed: false }, null, 2)}\n`);
