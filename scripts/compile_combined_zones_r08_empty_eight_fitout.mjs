#!/usr/bin/env node
/**
 * Compile the first independently releasable Empty Eight fit-out package.
 *
 * R08 turns one frozen Empty Eight platform prism into a dry, enclosed,
 * illuminated platform chamber while leaving the uncommissioned track and
 * every future-line interface sealed.  The package is deliberately bounded
 * to the exact platform geometry already committed by the D06 design:
 *
 * The platform is selected with --platform-id (EE-PF-03 by default). Its
 * exact floor, barrier, ceiling, lights, and carrier intersections are read
 * from the accepted D06 design rather than copied into a second compiler.
 *
 * The R02 power carriers and seven exact lighting fixtures are preserved.
 * The four uncommissioned gate bays become exact polished-deepslate static
 * caps, so this fit-out does not commission transport or open a future line.
 * Enclosure/finish is applied before excavation; rollback reverses that order.
 *
 * This compiler is offline.  It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  assignD06CanonicalLayers,
  boundsOf,
  cellKey,
  cellsIn,
  deriveD06DetailedMechanismLayers,
  hashCells,
  rawCoordinateHash,
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
const values = (flag) => argv.flatMap((entry, index) => (
  entry === flag && argv[index + 1] ? [argv[index + 1]] : []
));

const GENERATED_AT = value('--generated-at', '2026-08-21T16:05:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07a-live-20260821T154500Z/post-complete-save-intake.json',
);
const SOURCE_LINER_MANIFESTS = values('--source-liner-manifest');
const SOURCE_RELEASE_LEDGER = value('--source-release-ledger', '');
const OUT_DIR = value('--out-dir', 'data/buildops');
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const PLATFORM_ID = value('--platform-id', 'EE-PF-03');
const PLATFORM_CODE = PLATFORM_ID.match(/^EE-PF-(\d{2})$/)?.[1];
const PLATFORM_RELEASE_LABEL = PLATFORM_ID === 'EE-PF-03'
  ? 'R08A'
  : PLATFORM_ID === 'EE-PF-08' ? 'R08B' : `R08-${PLATFORM_CODE ?? 'UNKNOWN'}`;
const BASENAME = value(
  '--basename',
  `combined-zones-r08-empty-eight-platform-${PLATFORM_CODE ?? 'unknown'}-fitout`,
);
const PACKAGE_RELEASE_ID = value(
  '--package-release-id',
  `CZ-${PLATFORM_RELEASE_LABEL}-${PLATFORM_ID}-ENCLOSED-FITOUT`,
);
const MANIFEST_STATUS = value(
  '--manifest-status',
  'COMPILED_FROM_ACCEPTED_R07A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
);
const ENCLOSURE_PACKAGE_KEY = `${PLATFORM_ID.toLowerCase()}-enclosure-finish`;
const CLEARANCE_PACKAGE_KEY = `${PLATFORM_ID.toLowerCase()}-interior-clearance`;

const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  detailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  materialDecision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
});

const MATERIALS = Object.freeze({
  mainFinish: 'minecraft:polished_diorite',
  darkAccent: 'minecraft:polished_deepslate',
  centralAisle: 'minecraft:smooth_stone',
  retainedBarrier: 'minecraft:polished_blackstone',
  staticGateCap: 'minecraft:polished_deepslate',
  light: 'minecraft:sea_lantern',
  clear: 'minecraft:air',
});
const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
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
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08 Empty Eight fit-out compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
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
const samePath = (left, right) => absolute(left) === absolute(right);

function difference(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !rightKeys.has(cellKey(cell))));
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parsePointOperations(filename) {
  const points = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed or non-REPL operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          points.set(`${x},${y},${z}`, { fromState: fields[7], toState: fields[8] });
        }
      }
    }
  }
  return points;
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

function savedEntityInsideHalo(entity, haloBounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= haloBounds.minX && x < haloBounds.maxX + 1
    && y >= haloBounds.minY && y < haloBounds.maxY + 1
    && z >= haloBounds.minZ && z < haloBounds.maxZ + 1;
}

const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const mechanisms = readJson(INPUTS.mechanisms);
const detailed = readJson(INPUTS.detailedSetout);
const materialDecision = readJson(INPUTS.materialDecision);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const r02Manifest = readJson(INPUTS.r02Manifest);
const intake = readJson(INTAKE_AUDIT);
const sourceReleaseLedger = SOURCE_RELEASE_LEDGER ? readJson(SOURCE_RELEASE_LEDGER) : null;
const sourceLinerManifests = SOURCE_LINER_MANIFESTS.map((manifestPath) => ({
  manifestPath,
  manifest: readJson(manifestPath),
}));

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
'standing authorization does not cover the R08 release node');
invariant(!authorization.mvpBoundary.excludedScopeIds.includes(PLATFORM_ID),
'selected platform is excluded from the authorized MVP boundary');
if (sourceReleaseLedger) {
  invariant(sourceReleaseLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && samePath(sourceReleaseLedger.postSnapshot?.root, SNAPSHOT)
    && sourceReleaseLedger.postSnapshot?.completeSaveSha256
      === intake.packageIdentity.completeSaveSha256
    && sourceLinerManifests.some(({ manifestPath }) => (
      samePath(manifestPath, sourceReleaseLedger.manifest?.path)
    ))
    && sourceReleaseLedger.manifest?.sha256
      === sha256(fs.readFileSync(absolute(sourceReleaseLedger.manifest.path))),
  'source release ledger is not an accepted terminal execution bound to the selected post save and source liner');
}

const sourceLinerTransitions = new Map();
for (const { manifestPath, manifest: sourceLinerManifest } of sourceLinerManifests) {
  const linerPayload = { ...sourceLinerManifest };
  delete linerPayload.manifestIdentity;
  invariant(sourceLinerManifest.manifestIdentity === sha256(JSON.stringify(linerPayload))
    && (sourceLinerManifest.releaseNodeId === RELEASE_NODE_ID
      || sourceLinerManifest.transactionId === 'combined-zones-r06-support-liner')
    && (!sourceLinerManifest.scope?.platformId
      || sourceLinerManifest.scope.platformId === PLATFORM_ID),
  'source liner manifest identity or platform binding drifted');
  for (const pkg of sourceLinerManifest.packages) {
    const declared = sourceLinerManifest.operations[pkg.key];
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `source liner ${pkg.key} operation body drifted`);
    for (const [key, transition] of parsePointOperations(pkg.forward)) {
      const existing = sourceLinerTransitions.get(key);
      invariant(!existing || existing.toState === transition.toState,
        `source liners disagree at target ${key}`);
      sourceLinerTransitions.set(key, { ...transition, manifestPath });
    }
  }
}

const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
const barrierRecord = lifeSafety.d06EmptyEightLifeSafety
  .failClosedBarriersAndSmokeInterfaces.platformBarriers.find(({ id }) => id === PLATFORM_ID);
const platformNumber = Number(PLATFORM_CODE);
invariant(platform && Number.isInteger(platformNumber)
  && platform.assignedTrack === platformNumber
  && platform.trackCenterlineZ === platform.surface.bounds.minZ - 2,
`frozen ${PLATFORM_ID} track assignment drifted`);
invariant(platform.surface.cellCount === 707
  && rawCoordinateHash(cellsIn(platform.surface.bounds)) === platform.surface.cellSetSha256,
`frozen ${PLATFORM_ID} surface identity does not reproduce`);

const floorBounds = platform.surface.bounds;
invariant(floorBounds.minX === 1652 && floorBounds.maxX === 1752
  && floorBounds.minY === 41 && floorBounds.maxY === 41
  && floorBounds.maxZ - floorBounds.minZ === 6,
`${PLATFORM_ID} platform dimensions drifted`);
const platformMinZ = floorBounds.minZ;
const platformMaxZ = floorBounds.maxZ;
const ceilingY = floorBounds.minY + 5;
const interiorMinY = floorBounds.minY + 1;
const interiorMaxY = ceilingY - 1;

const gateBays = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
  minX,
  maxX: minX + 2,
  minY: interiorMinY,
  maxY: interiorMinY + 1,
  minZ: platformMinZ,
  maxZ: platformMinZ,
}));
const fullBarrier = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: interiorMinY,
  maxY: interiorMinY + 1,
  minZ: platformMinZ,
  maxZ: platformMinZ,
});
const retainedBarrier = difference(fullBarrier, gateBays);
invariant(retainedBarrier.length === barrierRecord.retainedClosedBarrierReservation.cellCount
  && hashCells(retainedBarrier, 'combined-zones-d06-life-safety-cell-set-v1')
    === barrierRecord.retainedClosedBarrierReservation.coordinateSetSha256,
`retained ${PLATFORM_ID} barrier identity does not reproduce`);
invariant(gateBays.length === barrierRecord.staticGateBayCap.cellCount
  && hashCells(gateBays, 'combined-zones-d06-life-safety-cell-set-v1')
    === barrierRecord.staticGateBayCap.coordinateSetSha256,
`${PLATFORM_ID} static gate-cap identity does not reproduce`);
invariant(hashCells(fullBarrier, 'combined-zones-d06-life-safety-cell-set-v1')
  === barrierRecord.completeFailClosedBarrier.coordinateSetSha256,
`complete ${PLATFORM_ID} barrier identity does not reproduce`);

const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
const fixtures = fixtureX.map((x) => ({ x, y: ceilingY, z: platformMaxZ }));
invariant(fixtures.length === platform.emergencyLightingDesign.cellCount
  && rawCoordinateHash(fixtures) === platform.emergencyLightingDesign.cellSetSha256,
`${PLATFORM_ID} fixture identity does not reproduce`);

const floor = cellsIn(platform.surface.bounds);
const ceiling = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: ceilingY,
  maxY: ceilingY,
  minZ: platformMinZ,
  maxZ: platformMaxZ,
});
const interior = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: interiorMinY,
  maxY: interiorMaxY,
  minZ: platformMinZ,
  maxZ: platformMaxZ,
});
const chamber = uniqueCells([...floor, ...interior, ...ceiling]);
const haloBounds = {
  minX: floorBounds.minX - 1,
  maxX: floorBounds.maxX + 1,
  minY: floorBounds.minY - 1,
  maxY: ceilingY + 1,
  minZ: platformMinZ - 1,
  maxZ: platformMaxZ + 1,
};

// Reproduce R02 mechanism ownership so the live carrier bands and the
// seven light fixtures remain exact. Gate bays become their frozen static
// caps; an uncommissioned lift-envelope void is also capped only where it
// would otherwise puncture the fail-closed track barrier.
const { layers, proposalUnion } = deriveD06DetailedMechanismLayers(
  mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  detailed,
);
const layerOwner = assignD06CanonicalLayers(layers, detailed);
const layerStates = materialDecision.decisionPayload.mechanismLayerStates;
const chamberKeys = new Set(chamber.map(cellKey));
const mechanismInChamber = proposalUnion.filter((cell) => chamberKeys.has(cellKey(cell)));
const gateKeys = new Set(gateBays.map(cellKey));
const fixtureKeys = new Set(fixtures.map(cellKey));
const barrierKeys = new Set(fullBarrier.map(cellKey));
// A platform fit-out closes any R02-reserved-but-uncommissioned lift-envelope
// void that lands directly in the fail-closed track barrier. Equipment caps,
// landing slabs, and every other EGA/mechanism cell remain untouched.
const closedLiftEnvelopeCaps = mechanismInChamber.filter((cell) => (
  barrierKeys.has(cellKey(cell))
  && layerOwner.get(cellKey(cell)) === 'egaLiftEnvelope'
));
const closedLiftEnvelopeCapKeys = new Set(closedLiftEnvelopeCaps.map(cellKey));
const preservedMechanisms = mechanismInChamber.filter((cell) => (
  !gateKeys.has(cellKey(cell)) && !closedLiftEnvelopeCapKeys.has(cellKey(cell))
));
const carrierLayers = new Set([
  'normalCircuitCarrier',
  'emergencyCircuitACarrier',
  'emergencyCircuitBCarrier',
]);
const preservedCarrierCells = preservedMechanisms.filter((cell) => (
  carrierLayers.has(layerOwner.get(cellKey(cell)))
));
const preservedNonFixtureKeys = new Set(preservedMechanisms
  .filter((cell) => !fixtureKeys.has(cellKey(cell)))
  .map(cellKey));

const desiredEnclosure = new Map();
for (const cell of floor) {
  if (preservedNonFixtureKeys.has(cellKey(cell))) continue;
  const target = cell.z === platformMinZ || cell.z === platformMaxZ
    ? MATERIALS.darkAccent
    : cell.z === platformMinZ + 3 ? MATERIALS.centralAisle : MATERIALS.mainFinish;
  desiredEnclosure.set(cellKey(cell), { cell, toState: target, layer: 'platform-floor' });
}
for (const cell of ceiling) {
  if (preservedNonFixtureKeys.has(cellKey(cell))) continue;
  const target = fixtureKeys.has(cellKey(cell)) ? MATERIALS.light : MATERIALS.mainFinish;
  desiredEnclosure.set(cellKey(cell), { cell, toState: target, layer: 'platform-ceiling' });
}
for (const cell of retainedBarrier) {
  if (preservedNonFixtureKeys.has(cellKey(cell))) continue;
  desiredEnclosure.set(cellKey(cell), {
    cell, toState: MATERIALS.retainedBarrier, layer: 'retained-fail-closed-barrier',
  });
}
for (const cell of gateBays) {
  desiredEnclosure.set(cellKey(cell), {
    cell, toState: MATERIALS.staticGateCap, layer: 'static-gate-cap',
  });
}

const preservedKeys = new Set(preservedMechanisms.map(cellKey));
const clearDesign = interior.filter((cell) => (
  !barrierKeys.has(cellKey(cell)) && !preservedKeys.has(cellKey(cell))
));
const nominalEnclosure = uniqueCells([...floor, ...ceiling, ...fullBarrier]);
const preservedEnclosureCells = nominalEnclosure.filter((cell) => (
  preservedNonFixtureKeys.has(cellKey(cell))
));
invariant(desiredEnclosure.size + preservedEnclosureCells.length === 1616,
  'enclosure design/preserved-system partition drifted');
const nominalClearDesign = interior.filter((cell) => !barrierKeys.has(cellKey(cell)));
const preservedClearCells = nominalClearDesign.filter((cell) => preservedKeys.has(cellKey(cell)));
invariant(clearDesign.length + preservedClearCells.length === nominalClearDesign.length,
  'interior-clearance design/preserved-system partition drifted');
const preservedBarrierCells = fullBarrier.filter((cell) => preservedKeys.has(cellKey(cell)));
invariant(preservedBarrierCells.every((cell) => {
  const expected = layerStates[layerOwner.get(cellKey(cell))]?.state;
  return expected && !AIR_BLOCKS.has(blockName(expected)) && !FLUID_BLOCKS.has(blockName(expected));
}), 'a preserved R02 mechanism would leave the fail-closed barrier open');
invariant(fullBarrier.every((cell) => (
  desiredEnclosure.has(cellKey(cell)) || preservedKeys.has(cellKey(cell))
)), 'fail-closed barrier is not fully covered by finish or a preserved solid mechanism');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

// Fluid inside the chamber is a local hard stop. Fluid elsewhere in the
// one-cell halo is admissible only when every face-adjacent chamber cell is an
// already-solid enclosure boundary that remains solid after fit-out. This
// permits an exact, existing lava pocket behind a solid fail-closed barrier
// without draining it or weakening the barrier.
const fluidHaloViolations = [];
const containedExternalFluidFindings = [];
const forbiddenHaloBlocks = [];
for (const cell of cellsIn(haloBounds)) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = blockName(state);
  if (FLUID_BLOCKS.has(name) || state.includes('waterlogged=true')) {
    const adjacentChamberCells = FACE_NEIGHBOURS
      .map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))
      .filter((neighbour) => chamberKeys.has(cellKey(neighbour)));
    const boundaryChecks = [];
    for (const neighbour of adjacentChamberCells) {
      const key = cellKey(neighbour);
      const sourceState = stateToCommandString(await reader.blockState(
        neighbour.x, neighbour.y, neighbour.z,
      ));
      const finalState = desiredEnclosure.get(key)?.toState
        ?? (preservedKeys.has(key) ? layerStates[layerOwner.get(key)]?.state : null);
      const sourceName = blockName(sourceState);
      const finalName = finalState ? blockName(finalState) : null;
      boundaryChecks.push({
        cell: neighbour,
        sourceState,
        finalState,
        sealed: Boolean(finalState)
          && !AIR_BLOCKS.has(sourceName)
          && !FLUID_BLOCKS.has(sourceName)
          && !sourceState.includes('waterlogged=true')
          && !AIR_BLOCKS.has(finalName)
          && !FLUID_BLOCKS.has(finalName)
          && !finalState.includes('waterlogged=true'),
      });
    }
    const containedOutsideChamber = !chamberKeys.has(cellKey(cell))
      && boundaryChecks.every(({ sealed }) => sealed);
    const finding = { cell, sourceState: state, adjacentChamberBoundary: boundaryChecks };
    if (containedOutsideChamber) containedExternalFluidFindings.push(finding);
    else fluidHaloViolations.push(finding);
  }
  if (FORBIDDEN_SOURCE_BLOCKS.has(name)) {
    forbiddenHaloBlocks.push({ cell, sourceState: state });
  }
}
invariant(fluidHaloViolations.length === 0,
  `uncontained fluid exists in the exact chamber halo: ${JSON.stringify(fluidHaloViolations.slice(0, 20))}`);
invariant(forbiddenHaloBlocks.length === 0,
  `container/control block exists in the exact chamber halo: ${JSON.stringify(forbiddenHaloBlocks.slice(0, 20))}`);

// Existing system states are a prerequisite. A separately bound wet-liner may
// temporarily occupy a formerly wet mechanism reservation; in that one exact
// case the fit-out restores the frozen R02 mechanism state.
const preservedMechanismViolations = [];
const restoredMechanismRecords = [];
for (const cell of preservedMechanisms) {
  const key = cellKey(cell);
  const layer = layerOwner.get(key);
  const expected = layerStates[layer]?.state;
  const actual = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (actual === expected) continue;
  const linerTransition = sourceLinerTransitions.get(key);
  if (expected && linerTransition?.toState === actual) {
    restoredMechanismRecords.push({ cell, layer, expected, actual, linerTransition });
    desiredEnclosure.set(key, {
      cell,
      toState: expected,
      layer: 'restored-r02-mechanism',
    });
  } else {
    preservedMechanismViolations.push({ cell, layer, expected, actual });
  }
}
invariant(preservedMechanismViolations.length === 0,
  `R02 system state drift inside chamber: ${JSON.stringify(preservedMechanismViolations.slice(0, 20))}`);

const enclosureOperations = [];
const enclosureAlreadyTarget = [];
for (const record of desiredEnclosure.values()) {
  const fromState = stateToCommandString(await reader.blockState(
    record.cell.x, record.cell.y, record.cell.z,
  ));
  if (fromState === record.toState) enclosureAlreadyTarget.push(record.cell);
  else enclosureOperations.push({ ...record, fromState });
}
const clearanceOperations = [];
const clearanceAlreadyAir = [];
for (const cell of clearDesign) {
  const fromState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (AIR_BLOCKS.has(blockName(fromState))) clearanceAlreadyAir.push(cell);
  else clearanceOperations.push({ cell, fromState, toState: MATERIALS.clear, layer: 'clear-room' });
}

// Enclosure targets are ordered roof, barrier, floor. Interior excavation is
// top-down per column so gravity blocks cannot invalidate later guards.
enclosureOperations.sort((left, right) => (
  (right.cell.y === ceilingY) - (left.cell.y === ceilingY)
  || (right.cell.y >= interiorMinY && right.cell.y <= interiorMinY + 1)
    - (left.cell.y >= interiorMinY && left.cell.y <= interiorMinY + 1)
  || left.cell.x - right.cell.x || left.cell.z - right.cell.z || right.cell.y - left.cell.y
));
clearanceOperations.sort((left, right) => (
  left.cell.x - right.cell.x || left.cell.z - right.cell.z || right.cell.y - left.cell.y
));
const operatedTargets = uniqueCells([
  ...enclosureOperations.map(({ cell }) => cell),
  ...clearanceOperations.map(({ cell }) => cell),
]);
invariant(operatedTargets.length === enclosureOperations.length + clearanceOperations.length,
'enclosure and clearance package targets intersect');
invariant(enclosureOperations.length > 0 && clearanceOperations.length > 0,
'fit-out compiled to an empty package');
invariant(enclosureOperations.length + enclosureAlreadyTarget.length === desiredEnclosure.size,
'enclosure source partition is incomplete');
invariant(clearanceOperations.length + clearanceAlreadyAir.length === clearDesign.length,
'clearance source partition is incomplete');

// Bound source liners may include containment cells immediately outside the
// chamber. Those cells are not fit-out targets: require their exact executed
// liner state in the post save and prove target disjointness. PF01 additionally
// binds its retained water feed/root and the external lava-source edge.
const operatedTargetKeys = new Set(operatedTargets.map(cellKey));
const sourceLinerRetainedBoundaryRecords = [];
for (const [key, transition] of sourceLinerTransitions) {
  const [x, y, z] = key.split(',').map(Number);
  const cell = { x, y, z };
  if (!insideBounds(cell, haloBounds) || chamberKeys.has(key)) continue;
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  invariant(actual === transition.toState,
    `retained source-liner boundary ${key} drifted: ${actual}`);
  invariant(!operatedTargetKeys.has(key),
    `fit-out targets retained source-liner boundary ${key}`);
  sourceLinerRetainedBoundaryRecords.push({ cell, actual, ...transition });
}

let pf01RetentionContract = null;
if (PLATFORM_ID === 'EE-PF-01') {
  const orderedTransactions = sourceLinerManifests
    .map(({ manifest }) => manifest.transactionId);
  invariant(JSON.stringify(orderedTransactions) === JSON.stringify([
    'combined-zones-r06-support-liner',
    'combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner',
  ]), 'PF01 source liners are not bound in support-then-fluid execution order');
  invariant(sourceReleaseLedger?.transactionId
    === 'combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner',
  'PF01 fit-out is not bound to the executed partitioned-fluid liner ledger');
  const pf01Liner = sourceLinerManifests[1].manifest;
  const pf01LinerPath = sourceLinerManifests[1].manifestPath;
  const retained = sourceLinerRetainedBoundaryRecords.filter(({ manifestPath }) => (
    samePath(manifestPath, pf01LinerPath)
  ));
  const retainedLava = retained.filter(({ fromState }) => (
    fromState === 'minecraft:lava[level=0]'
  ));
  const retainedWater = retained.filter(({ fromState }) => (
    blockName(fromState) === 'minecraft:water'
  ));
  invariant(retained.length === 21
    && hashCells(retained.map(({ cell }) => cell))
      === '258c990049ba981fb5cfd964dbe140b3197d24d1fdb84d84fd1f008cb8dc4ddc',
  'PF01 retained 21-cell liner boundary drifted');
  invariant(retainedLava.length === 16
    && hashCells(retainedLava.map(({ cell }) => cell))
      === pf01Liner.scope.geometry.retainedOuterLavaContainmentLiner.coordinateSetSha256
    && retainedLava.every(({ cell, actual }) => cell.z === 63
      && actual === 'minecraft:deepslate_tiles'),
  'PF01 retained outer lava containment drifted');
  invariant(retainedWater.length === 5
    && hashCells(retainedWater.map(({ cell }) => cell))
      === pf01Liner.scope.geometry.flowOrderedWaterBoundaryTargets.coordinateSetSha256
    && retainedWater.every(({ actual }) => actual === 'minecraft:deepslate_tiles'),
  'PF01 retained water boundary liner drifted');

  const retainedWaterFeed = [];
  for (const expected of pf01Liner.source.retainedWaterFeed) {
    const actual = stateToCommandString(await reader.blockState(
      expected.cell.x, expected.cell.y, expected.cell.z,
    ));
    invariant(actual === expected.observedState
      && !operatedTargetKeys.has(cellKey(expected.cell)),
    `PF01 retained water feed ${cellKey(expected.cell)} drifted or is targeted`);
    retainedWaterFeed.push({ cell: expected.cell, state: actual });
  }
  const expectedWaterRoot = pf01Liner.source.retainedWaterRoot;
  const retainedWaterRootState = stateToCommandString(await reader.blockState(
    expectedWaterRoot.cell.x, expectedWaterRoot.cell.y, expectedWaterRoot.cell.z,
  ));
  invariant(retainedWaterRootState === expectedWaterRoot.observedState
    && !operatedTargetKeys.has(cellKey(expectedWaterRoot.cell)),
  'PF01 retained water root drifted or is targeted');

  const externalLavaSourceMap = new Map();
  const retainedBoundaryKeys = new Set(retained.map(({ cell }) => cellKey(cell)));
  for (const { cell } of retainedLava) {
    for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      if (retainedBoundaryKeys.has(cellKey(neighbour))) continue;
      const state = stateToCommandString(await reader.blockState(
        neighbour.x, neighbour.y, neighbour.z,
      ));
      if (state === 'minecraft:lava[level=0]') {
        externalLavaSourceMap.set(cellKey(neighbour), neighbour);
      }
    }
  }
  const retainedExternalLavaSources = uniqueCells([...externalLavaSourceMap.values()]);
  invariant(retainedExternalLavaSources.length
      === pf01Liner.scope.geometry.retainedExternalLavaSources.cellCount
    && hashCells(retainedExternalLavaSources)
      === pf01Liner.scope.geometry.retainedExternalLavaSources.coordinateSetSha256
    && retainedExternalLavaSources.every((cell) => (
      cell.z === 64 && !operatedTargetKeys.has(cellKey(cell))
    )), 'PF01 retained external lava-source edge drifted or is targeted');

  pf01RetentionContract = {
    status: 'PASS_EXACT_RETAINED_CONTAINMENT_AND_FEEDS',
    retainedOuterLavaContainment: classManifest(retainedLava.map(({ cell }) => cell)),
    retainedWaterBoundaryLiner: classManifest(retainedWater.map(({ cell }) => cell)),
    retainedDirectWaterFeed: classManifest(retainedWaterFeed.map(({ cell }) => cell)),
    retainedWaterRoot: {
      cell: expectedWaterRoot.cell,
      state: retainedWaterRootState,
    },
    retainedExternalLavaSources: classManifest(retainedExternalLavaSources),
    fitoutTargetIntersectionCount: 0,
  };
}

// Saved block entities and movable entities are checked over the entire halo,
// stronger than target-only clearance.
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
'source chamber halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'source chamber halo intersects a saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = operatedTargets.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'fit-out targets intersect a protected relic core');

const futureSealCells = uniqueCells(emptyEight.d06.futureInterfaces.interfaces
  .flatMap((entry) => cellsIn(entry.sealDesign.bounds)));
const futureSealKeys = new Set(futureSealCells.map(cellKey));
const futureSealIntersections = operatedTargets.filter((cell) => futureSealKeys.has(cellKey(cell)));
invariant(futureSealIntersections.length === 0,
'fit-out targets intersect a deferred future-line seal');

// R08 is intentionally downstream of the R02 shell. Bind the exact overlap
// with its two guarded packages and reject any unaccounted prior owner.
const priorIntersections = [];
for (const pkg of r02Manifest.packages) {
  const operation = r02Manifest.operations[pkg.key];
  invariant(sha256(operationBody(pkg.forward)) === operation.forwardSha256,
    `R02 ${pkg.key} operation body drifted from its manifest`);
  const points = parsePointOperations(pkg.forward);
  const cells = operatedTargets.filter((cell) => points.has(cellKey(cell)));
  if (cells.length) priorIntersections.push({
    packageId: `${r02Manifest.transactionId}/${pkg.key}`,
    operationPath: pkg.forward,
    ...classManifest(cells),
  });
}
invariant(priorIntersections.length === 2,
'R08 overlap is not exactly the two declared R02 Empty Eight packages');
const sourceLinerIntersections = operatedTargets.filter((cell) => (
  sourceLinerTransitions.has(cellKey(cell))
));
if (sourceLinerManifests.length) {
  const expectedSourceLinerIntersections = [...sourceLinerTransitions.keys()]
    .filter((key) => chamberKeys.has(key));
  invariant(sourceLinerIntersections.length === expectedSourceLinerIntersections.length,
    'fit-out does not consume the complete chamber portion of the bound source liner');
}

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packageSpecs = [
  { key: ENCLOSURE_PACKAGE_KEY, operations: enclosureOperations },
  { key: CLEARANCE_PACKAGE_KEY, operations: clearanceOperations },
];
const packageArtifacts = [];
for (const pkg of packageSpecs) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => (
    replLine(cell, fromState, toState)
  )).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.slice().reverse().map(({ cell, fromState, toState }) => (
    replLine(cell, toState, fromState)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = classManifest(pkg.operations.map(({ cell }) => cell));
  const forward = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${PACKAGE_RELEASE_ID} (${pkg.key} ${role})`,
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
    desiredStateCensus: targetCensus(pkg.operations),
  });
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: MANIFEST_STATUS,
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({ key, forward, rollback })),
  executionOrder: {
    forward: [ENCLOSURE_PACKAGE_KEY, CLEARANCE_PACKAGE_KEY],
    rollback: [CLEARANCE_PACKAGE_KEY, ENCLOSURE_PACKAGE_KEY],
    rationale: 'Install the dry enclosure and closed barrier before clearing the room; restore the source volume before removing its enclosure.',
  },
  scope: {
    releaseId: PACKAGE_RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    mvpScope: true,
    platformId: PLATFORM_ID,
    assignedTrack: platform.assignedTrack,
    purpose: 'Deliver one exact, enclosed, illuminated Empty Eight platform chamber without commissioning track or opening a future-line interface.',
    geometry: {
      frozenPlatformSurface: classManifest(floor),
      chamberPrism: classManifest(chamber),
      floor: classManifest(floor),
      clearInterior: classManifest(clearDesign),
      ceiling: classManifest(ceiling),
      completeFailClosedBarrier: classManifest(fullBarrier),
      retainedBarrier: classManifest(retainedBarrier),
      staticGateCaps: classManifest(gateBays),
      existingLightingFixtures: classManifest(fixtures),
      preservedR02Mechanisms: classManifest(preservedMechanisms),
      preservedR02CarrierBands: classManifest(preservedCarrierCells),
      preservedSolidBarrierMechanisms: classManifest(preservedBarrierCells),
      closedUncommissionedLiftEnvelopeCaps: classManifest(closedLiftEnvelopeCaps),
      restoredR02MechanismsFromSourceLiner: classManifest(
        restoredMechanismRecords.map(({ cell }) => cell),
      ),
      exactDryHalo: {
        ...haloBounds,
        fluidCellCount: fluidHaloViolations.length,
        observedFluidCellCount:
          fluidHaloViolations.length + containedExternalFluidFindings.length,
        containedExternalFluidCellCount: containedExternalFluidFindings.length,
      },
    },
    materialDoctrine: MATERIALS,
    transportBoundary: {
      trackCenterlineZ: platform.trackCenterlineZ,
      trackCommissioned: false,
      poweredGateMechanismInstalled: false,
      futureLineSealCellCount: futureSealCells.length,
      futureLineSealIntersectionCount: futureSealIntersections.length,
      nearestFutureLineSealX: 1872,
      fitoutMaxX: floorBounds.maxX,
      minimumXSeparationBlocks: 1872 - floorBounds.maxX,
      futureLineOpeningsDeferred: true,
    },
    sourcePartition: {
      enclosure: {
        design: classManifest([...desiredEnclosure.values()].map(({ cell }) => cell)),
        operated: classManifest(enclosureOperations.map(({ cell }) => cell)),
        alreadyTarget: classManifest(enclosureAlreadyTarget),
        exactPartition: true,
      },
      interiorClearance: {
        design: classManifest(clearDesign),
        operated: classManifest(clearanceOperations.map(({ cell }) => cell)),
        alreadyAir: classManifest(clearanceAlreadyAir),
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
    sourceReleaseLedger: sourceReleaseLedger ? {
      path: SOURCE_RELEASE_LEDGER,
      sha256: sha256(fs.readFileSync(absolute(SOURCE_RELEASE_LEDGER))),
      status: sourceReleaseLedger.status,
      completedReleaseIdentitySha256: sourceReleaseLedger.completedReleaseIdentitySha256,
    } : null,
    touchedChunkCount: touchedChunks.length,
    packageSourceStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => (
      [pkg.key, pkg.sourceStateCensus]
    ))),
  },
  target: {
    operatedUnion: classManifest(operatedTargets),
    packageTargetsDisjoint: true,
    packageDesiredStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => (
      [pkg.key, pkg.desiredStateCensus]
    ))),
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
    fluidHaloIntersectionCount: fluidHaloViolations.length,
    containedExternalFluidHaloCount: containedExternalFluidFindings.length,
    forbiddenContainerOrControlHaloCount: forbiddenHaloBlocks.length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    deferredFutureLineSealIntersectionCount: futureSealIntersections.length,
    preservedMechanismStateViolationCount: preservedMechanismViolations.length,
    sourceLinerRestoredMechanismCount: restoredMechanismRecords.length,
    retainedSourceLinerBoundary: classManifest(
      sourceLinerRetainedBoundaryRecords.map(({ cell }) => cell),
    ),
    pf01RetentionContract,
    intentionalPriorReleaseIntersections: priorIntersections,
    intentionalSourceLinerIntersection: sourceLinerManifests.length ? {
      manifests: sourceLinerManifests.map(({ manifestPath, manifest }) => ({
        transactionId: manifest.transactionId,
        manifestPath,
        manifestIdentity: manifest.manifestIdentity,
      })),
      ...classManifest(sourceLinerIntersections),
    } : null,
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
    emptyEightPath: INPUTS.emptyEight,
    emptyEightSha256: sha256(fs.readFileSync(absolute(INPUTS.emptyEight))),
    lifeSafetyPath: INPUTS.lifeSafety,
    lifeSafetySha256: sha256(fs.readFileSync(absolute(INPUTS.lifeSafety))),
    detailedSetoutPath: INPUTS.detailedSetout,
    detailedSetoutReportIdentitySha256: detailed.reportIdentitySha256,
    r02ManifestPath: INPUTS.r02Manifest,
    r02ManifestIdentity: r02Manifest.manifestIdentity,
    sourceLinerManifests: sourceLinerManifests.map(({ manifestPath, manifest }) => ({
      path: manifestPath,
      manifestIdentity: manifest.manifestIdentity,
    })),
    sourceReleaseLedger: sourceReleaseLedger ? {
      path: SOURCE_RELEASE_LEDGER,
      sha256: sha256(fs.readFileSync(absolute(SOURCE_RELEASE_LEDGER))),
      completedReleaseIdentitySha256: sourceReleaseLedger.completedReleaseIdentitySha256,
    } : null,
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and deterministic recompile',
    'block-entity audit and exact source preflight for both packages',
    'strict-noop forward and rollback parser dry-runs',
    'fresh live entity clearance bound to both operation hashes',
    'journaled strict-noop execution in declared order',
    'fresh post snapshot, exact post-state QA, and reverse-order rollback preflight',
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
  packages: packageArtifacts.map((pkg) => ({
    key: pkg.key,
    forward: pkg.forward,
    rollback: pkg.rollback,
    commandCount: pkg.commandCount,
    forwardSha256: pkg.forwardSha256,
    rollbackSha256: pkg.rollbackSha256,
  })),
  operatedCellCount: operatedTargets.length,
  fluidHaloIntersectionCount: fluidHaloViolations.length,
  containedExternalFluidHaloCount: containedExternalFluidFindings.length,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  deferredFutureLineSealIntersectionCount: 0,
}, null, 2));
