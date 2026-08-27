#!/usr/bin/env node
/** Compile the next maximal dry full-height center segment of EE-SMOKE-N. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:40:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08z-post-20260822T003120Z');
const INTAKE_AUDIT = value('--intake-audit',
  'data/world-review/combined-zones-r08z-live-20260822T003120Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger',
  'data/world-review/combined-zones-r08z-live-20260822T003120Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08aa-empty-eight-north-smoke-center-segment');
const RELEASE_ID = 'CZ-R08AA-EMPTY-EIGHT-NORTH-SMOKE-CENTER-SEGMENT';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const WALL_KEY = 'ee-smoke-n-center-compartment-wall';
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
  r08zManifest: 'data/buildops/combined-zones-r08z-empty-eight-north-smoke-central-east-segment.release-manifest.json',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AA north-smoke center-segment compiler rejected: ${message}`);
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
const r08zManifest = readJson(INPUTS.r08zManifest);
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
  && sourceLedger.transactionId === 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment'
  && absolute(sourceLedger.postSnapshot.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'terminal R08Z ledger/post identity drifted');
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

// Rank every full-height x-column by the same strict zero-hazard rule. A
// selected column and its face halo must contain no fluid, gravity, container,
// control, or block-entity state. This deliberately excludes the wet and N06
// interaction bands rather than attempting a partial physics migration.
const columnFindings = [];
for (let x = 1652; x <= 1847; x += 1) {
  const cells = cellsIn({ minX: x, maxX: x, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
  const halo = await faceHalo(cells);
  const targetRecords = await records(cells);
  const haloRecords = await records(halo);
  const targetHazards = targetRecords.filter(({ state }) => isFluid(state)
    || isGravity(state) || isForbidden(state));
  const haloHazards = haloRecords.filter(({ state }) => isFluid(state)
    || isGravity(state) || isForbidden(state));
  columnFindings.push({ x, clean: targetRecords.every(({ state }) => state === 'minecraft:air')
    && targetHazards.length === 0 && haloHazards.length === 0,
    targetHazardCount: targetHazards.length, haloHazardCount: haloHazards.length });
}
const cleanRuns = [];
let runStart = null;
for (const finding of [...columnFindings, { x: 1848, clean: false }]) {
  if (finding.clean && runStart === null) runStart = finding.x;
  if (!finding.clean && runStart !== null) {
    cleanRuns.push({ minX: runStart, maxX: finding.x - 1, widthCells: finding.x - runStart });
    runStart = null;
  }
}
cleanRuns.sort((a, b) => b.widthCells - a.widthCells || a.minX - b.minX);
invariant(JSON.stringify(cleanRuns) === JSON.stringify([
  { minX: 1740, maxX: 1753, widthCells: 14 },
  { minX: 1842, maxX: 1843, widthCells: 2 },
]), 'maximal clean full-height column runs drifted');

const selected = cellsIn({ minX: 1740, maxX: 1753, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
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
invariant(selected.length === 98 && wallCells.length === 98 && capCells.length === 0
  && wallRecords.every(({ state }) => state === 'minecraft:air')
  && capRecords.every(({ state }) => state === 'minecraft:air')
  && halo.length === 238 && haloRecords.every(({ state }) => (
    !isFluid(state) && !isGravity(state) && !isForbidden(state)
  )), 'selected center segment or exact zero-hazard census drifted');
invariant(components(selected).componentCount === 1 && components(wallCells).componentCount === 1
  && capCells.length === 0,
'selected center segment topology drifted');

const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
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
  ...r08zManifest.isolation.acceptedPriorManifestChecks.map(({ path: filename }) => filename),
  INPUTS.r08zManifest,
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
invariant(priorPaths.length === 50 && r02Hits.length === 86
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
  status: 'COMPILED_FROM_ACCEPTED_R08Z_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'OWN-D06-SMOKE',
    masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
    mvpScope: true,
    purpose: 'Build the next maximal contiguous full-height zero-hazard center segment of the frozen north passive smoke plane while leaving every wet/gravity interaction band untouched.',
    materialDoctrine: { wall: { paletteId: 'EE-P01', block: WALL_STATE } },
    geometry: { fullFrozenNorthBoundary: exactSet(fullPlane), selectedCenterSegment: {
      ...exactSet(selected), widthCells: 14, heightCells: 7,
      topology: components(selected) }, selectedWallField: exactSet(wallCells),
    selectedOpeningReservationIntersection: exactSet(capCells),
    interactionHalo: exactSet(halo) },
    operationalBoundary: { boundedStaticConstructionAccepted: true,
      completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
      poweredSmokeDoorMechanismAuthorized: false, wetInterfaceTouched: false,
      n06OrGravityInterfaceTouched: false, tenantOpeningCreated: false,
      publicRouteCommissioned: false },
  },
  scopeSelection: {
    doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
    rankedCleanRuns: cleanRuns,
    selectedRun: cleanRuns[0],
    exactColumnFindingCount: columnFindings.length,
    rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
      exactPlaneFluidCount: fullPlaneFluids.length, exactN06BlockedCellCount: n06Cells.length,
      sourcePhysicsFinding: 'Full-plane completion would require a separately proven complete fluid dependency closure and exact durable treatment of suspended gravel interactions; those cells are outside R08AA.' },
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
    interactionHalo: exactSet(halo), interactionHaloFluidCount: 0,
    interactionHaloGravityCount: 0, interactionHaloContainerOrControlCount: 0,
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
    rationale: 'Build the connected passive center wall field. Rollback restores every point to the exact R02-era source-air state in reverse line order.',
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
  haloCellCount: halo.length, selectedRun: cleanRuns[0], fullPlaneFluidCount: fullPlaneFluids.length,
  packages: emitted.map(({ key, commandCount, forwardSha256, rollbackSha256 }) => ({
    key, commandCount, forwardSha256, rollbackSha256,
  })), liveCallsPerformed: false, worldEditsPerformed: false }, null, 2)}\n`);

