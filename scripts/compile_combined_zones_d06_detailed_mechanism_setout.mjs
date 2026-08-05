#!/usr/bin/env node
/**
 * Compile a deterministic, offline D06 detailed mechanism/circuit setout.
 *
 * The output converts already-frozen D06 reservation geometry into exact
 * proposal layers and an explicit same-coordinate precedence audit. It does
 * not accept mechanisms, material/future states, owners, interfaces,
 * construction cells, operations, or commissioning evidence.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-05T03:05:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.md',
));

const INPUTS = Object.freeze({
  d06Mechanisms: 'masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06LifeSafety: 'masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  emptyEight: 'masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  completeSaveAudit:
    'masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const CELL_HASH_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const SETOUT_MANIFEST_PREAMBLE = 'combined-zones-d06-detailed-mechanism-setout-v1';
const PRECEDENCE_MANIFEST_PREAMBLE =
  'combined-zones-d06-detailed-mechanism-precedence-v1';
const OWNER_ADJACENCY_CELL_PREAMBLE = 'combined-zones-phase1-proposed-owner-cell-set-v1';
const OWNER_ADJACENCY_PAIR_PREAMBLE =
  'combined-zones-phase1-directional-interface-pairs-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`Combined Zones D06 detailed setout rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data), role };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  const result = new Map();
  for (const cell of cells) result.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...result.values()].sort(compareCells);
}

function boundsOf(cells) {
  if (cells.length === 0) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CELL_HASH_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cellKey(cell)}\n`);
  return digest.digest('hex');
}

function setRecord(cells, derivation, extra = {}) {
  const exact = uniqueCells(cells);
  return {
    representation: 'EXACT_DETERMINISTIC_CELL_SET_HASH_ONLY',
    derivation,
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: coordinateHash(exact),
    proposalAccepted: false,
    acceptedCellCount: 0,
    acceptedMechanismCellCount: 0,
    ...extra,
  };
}

function ownerAdjacencyCellSet(cells, derivation) {
  const exact = uniqueCells(cells);
  const digest = crypto.createHash('sha256').update(`${OWNER_ADJACENCY_CELL_PREAMBLE}\n`);
  for (const cell of exact) digest.update(`${cellKey(cell)}\n`);
  return {
    representation: 'EXACT_DETERMINISTIC_CELL_SET_HASH_ONLY',
    derivation,
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: digest.digest('hex'),
    proposalAccepted: false,
    acceptedCellCount: 0,
  };
}

function ownerAdjacencyPairHash(pairs) {
  const sorted = [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ));
  const digest = crypto.createHash('sha256').update(`${OWNER_ADJACENCY_PAIR_PREAMBLE}\n`);
  for (const pair of sorted) digest.update(`${cellKey(pair.from)}>${cellKey(pair.to)}\n`);
  return digest.digest('hex');
}

function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function union(...sets) {
  return uniqueCells(sets.flat());
}

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
}

function intersection(left, right) {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
}

function boundsDisjoint(left, right) {
  return left.maxX < right.minX || right.maxX < left.minX
    || left.maxY < right.minY || right.maxY < left.minY
    || left.maxZ < right.minZ || right.maxZ < left.minZ;
}

function validateSourceSet(record, cells, label, hashMode = 'D06_LIFE_SAFETY') {
  const exact = uniqueCells(cells);
  invariant(exact.length === record.cellCount, `${label} source cell-count drift`);
  invariant(JSON.stringify(boundsOf(exact)) === JSON.stringify(record.bounds),
    `${label} source bounds drift`);
  const actualHash = hashMode === 'EMPTY_EIGHT_RAW'
    ? sha256(exact.map(cellKey).join('\n'))
    : coordinateHash(exact);
  invariant(actualHash === record.coordinateSetSha256,
    `${label} source coordinate identity drift`);
}

const d06 = readJson(INPUTS.d06Mechanisms);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const emptyEight = readJson(INPUTS.emptyEight);
const completeSaveAudit = readJson(INPUTS.completeSaveAudit);

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, sourcePath]) => [
  key,
  binding(sourcePath, {
    d06Mechanisms: 'owner-bound exact D06 reservation, failure, and commissioning contract',
    d06LifeSafety: 'exact selected reservation and retained-cap references',
    emptyEight: 'frozen internal terminal geometry and fixture positions',
    completeSaveAudit: 'current complete-save evidence boundary',
  }[key]),
]));

invariant(d06.status
  === 'PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD',
  'D06 mechanism contract status drift');
invariant(d06.mechanismDevelopmentPayload.exactReservationReferenceContract.allPassed === true
  && d06.mechanismDevelopmentPayload.exactReservationReferenceContract.referenceCount === 73,
  'D06 exact reservation reference contract is incomplete');
invariant(d06.sourceBindings.d06LifeSafety.sha256 === sourceBindings.d06LifeSafety.sha256,
  'D06 life-safety source binding drift');
invariant(d06.sourceBindings.emptyEight.sha256 === sourceBindings.emptyEight.sha256,
  'Empty Eight source binding drift');
invariant(d06.summary.acceptedMechanismManifestCount === 0
  && d06.summary.operationCellCount === 0 && d06.summary.materialCellCount === 0,
  'D06 source unexpectedly claims accepted mechanisms or operations');
invariant(completeSaveAudit.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save evidence boundary changed; re-review required');

const payload = d06.mechanismDevelopmentPayload;
const rawLayers = new Map();
const layerMeta = new Map();

function addLayer(id, group, proposedFunction, cells, derivation, basis = 'DERIVED_PROPOSAL') {
  invariant(!rawLayers.has(id), `duplicate layer id ${id}`);
  rawLayers.set(id, uniqueCells(cells));
  layerMeta.set(id, { group, proposedFunction, derivation, basis });
}

// Egress cores: reproduce exact stair/lift envelopes, then derive transfer and
// end-equipment caps wholly inside those frozen combined reservations.
for (const system of payload.protectedEgressAndLiftSystems) {
  const prefix = system.coreId.toLowerCase().replace('-', '');
  const combined = cellsIn(system.combinedProtectedCoreReservation.bounds);
  const stair = cellsIn(system.protectedStairReservation.bounds);
  const lift = cellsIn(system.accessibleLiftReservation.bounds);
  const separator = cellsIn(system.compartmentSeparatorCap.bounds);
  const roof = cellsIn(system.roofTransitionCap.bounds);
  const surface = cellsIn(system.surfaceOutletCap.bounds);
  validateSourceSet(system.combinedProtectedCoreReservation, combined,
    `${system.coreId} combined core`);
  validateSourceSet(system.protectedStairReservation, stair, `${system.coreId} stair`);
  validateSourceSet(system.accessibleLiftReservation, lift, `${system.coreId} lift`);
  validateSourceSet(system.compartmentSeparatorCap, separator, `${system.coreId} separator`);
  validateSourceSet(system.roofTransitionCap, roof, `${system.coreId} roof cap`);
  validateSourceSet(system.surfaceOutletCap, surface, `${system.coreId} surface cap`);
  const bottom = cellsIn({
    ...system.combinedProtectedCoreReservation.bounds,
    maxY: system.combinedProtectedCoreReservation.bounds.minY,
  });
  const transfer = union(bottom, roof, surface);
  const stairBounds = system.protectedStairReservation.bounds;
  const liftBounds = system.accessibleLiftReservation.bounds;
  const stairEquipmentCaps = union(
    cellsIn({ ...stairBounds, maxY: stairBounds.minY }),
    cellsIn({ ...stairBounds, minY: stairBounds.maxY }),
  );
  const liftEquipmentCaps = union(
    cellsIn({ ...liftBounds, maxY: liftBounds.minY }),
    cellsIn({ ...liftBounds, minY: liftBounds.maxY }),
  );
  for (const [label, cells] of Object.entries({
    transfer,
    stairEquipmentCaps,
    liftEquipmentCaps,
  })) {
    invariant(intersection(cells, combined).length === cells.length,
      `${system.coreId} ${label} escapes the combined core`);
  }
  addLayer(`${prefix}TransferLandings`, 'STAIR_LIFT_AND_TRANSFER',
    `${system.coreId}_LOWER_ROOF_AND_SURFACE_TRANSFER_LANDINGS`, transfer,
    'Union of the frozen lower combined-core plane, roof-transition cap, and surface-outlet cap.');
  addLayer(`${prefix}LiftEquipmentCaps`, 'STAIR_LIFT_AND_TRANSFER',
    `${system.coreId}_LIFT_END_EQUIPMENT_RESERVATION`, liftEquipmentCaps,
    'Bottom and top planes of the exact accessible-lift reservation.');
  addLayer(`${prefix}StairEquipmentCaps`, 'STAIR_LIFT_AND_TRANSFER',
    `${system.coreId}_STAIR_END_EQUIPMENT_RESERVATION`, stairEquipmentCaps,
    'Bottom and top planes of the exact protected-stair reservation.');
  addLayer(`${prefix}LiftEnvelope`, 'STAIR_LIFT_AND_TRANSFER',
    `${system.coreId}_ACCESSIBLE_LIFT_ENVELOPE`, lift,
    'Exact selected accessible-lift reservation from the D06 contract.', 'EXACT_SOURCE_REFERENCE');
  addLayer(`${prefix}StairEnvelope`, 'STAIR_LIFT_AND_TRANSFER',
    `${system.coreId}_PROTECTED_STAIR_ENVELOPE`, stair,
    'Exact selected protected-stair reservation from the D06 contract.', 'EXACT_SOURCE_REFERENCE');
}

// Vent systems: partition each exact riser into a lower fan-equipment plane,
// interior duct cells, and a retained upper outlet cap.
const ventDucts = [];
const ventFans = [];
const ventOutlets = [];
for (const system of payload.ventSystems) {
  const bounds = system.exactRiserReservation.bounds;
  const riser = cellsIn(bounds);
  validateSourceSet(system.exactRiserReservation, riser, `${system.ventId} riser`);
  const fan = cellsIn({ ...bounds, maxY: bounds.minY });
  const outlet = cellsIn({ ...bounds, minY: bounds.maxY });
  const duct = difference(riser, union(fan, outlet));
  invariant(union(fan, outlet, duct).length === riser.length,
    `${system.ventId} riser partition drift`);
  ventFans.push(...fan);
  ventOutlets.push(...outlet);
  ventDucts.push(...duct);
}
addLayer('ventFanEquipmentBays', 'VENTILATION', 'FOUR_LOCAL_FAN_EQUIPMENT_BAYS',
  ventFans, 'Bottom 3x3 plane of each exact local vent riser.');
addLayer('ventOutletCaps', 'VENTILATION', 'FOUR_SEALED_EXTERIOR_OUTLET_CAPS',
  ventOutlets, 'Top 3x3 plane of each exact local vent riser.');
addLayer('ventDuctEnvelopes', 'VENTILATION', 'FOUR_LOCAL_DUCT_ENVELOPES',
  ventDucts, 'Exact local vent risers after subtracting their bottom fan and top outlet planes.');

// Smoke-door and platform-gate mechanism bays reproduce the exact static caps.
const smokeDoorBays = [];
for (const boundary of payload.smokeAndBarrierSystems.smokeBoundaries) {
  const cells = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
    minX,
    maxX: minX + 2,
    minY: 49,
    maxY: 51,
    minZ: boundary.staticOpeningCaps.bounds.minZ,
    maxZ: boundary.staticOpeningCaps.bounds.maxZ,
  }));
  validateSourceSet(boundary.staticOpeningCaps, cells, `${boundary.id} smoke opening caps`);
  smokeDoorBays.push(...cells);
}
const platformGateBays = [];
for (const barrier of payload.smokeAndBarrierSystems.platformBarriers) {
  const z = barrier.staticGateBayCap.bounds.minZ;
  const cells = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
    minX,
    maxX: minX + 2,
    minY: 42,
    maxY: 43,
    minZ: z,
    maxZ: z,
  }));
  validateSourceSet(barrier.staticGateBayCap, cells, `${barrier.id} gate caps`);
  platformGateBays.push(...cells);
}
addLayer('smokeDoorMechanismBays', 'SMOKE_AND_BARRIERS',
  'TWO_FAIL_CLOSED_SMOKE_DOOR_BAY_GROUPS', smokeDoorBays,
  'Exact union of all retained static smoke-opening caps.', 'EXACT_SOURCE_REFERENCE');
addLayer('platformGateMechanismBays', 'SMOKE_AND_BARRIERS',
  'EIGHT_FAIL_CLOSED_PLATFORM_GATE_BAY_GROUPS', platformGateBays,
  'Exact union of all retained static platform gate-bay caps.', 'EXACT_SOURCE_REFERENCE');

// Reproduce exact fixture cells, then route three physically separated carrier
// layers to three separate proposed equipment reservations. These are carrier
// reservations only; sources, controls, transfer logic, and functional states
// stay null.
const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
const fixtureCells = [];
const fixtureZ = [];
for (const fixture of payload.lightingAndPowerSystem.exactFixtureReservations) {
  const z = fixture.reservation.bounds.minZ;
  fixtureZ.push(z);
  const cells = fixtureX.map((x) => ({ x, y: 46, z }));
  validateSourceSet(
    fixture.reservation,
    cells,
    `${fixture.platformId} fixture reservation`,
    'EMPTY_EIGHT_RAW',
  );
  fixtureCells.push(...cells);
}
addLayer('lightingFixtureReservations', 'POWER_AND_CONTROLS',
  'FROZEN_NORMAL_AND_EMERGENCY_LIGHTING_FIXTURE_RESERVATIONS', fixtureCells,
  'Exact union of the eight frozen seven-cell fixture sets.', 'EXACT_SOURCE_REFERENCE');

function circuitSetout(id, y, role) {
  const trunk = cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 54, maxZ: 153 });
  const branches = fixtureZ.flatMap((z) => cellsIn({
    minX: Math.min(...fixtureX),
    maxX: 1750,
    minY: y,
    maxY: y,
    minZ: z,
    maxZ: z,
  }));
  const equipment = cellsIn({
    minX: 1754,
    maxX: 1756,
    minY: y,
    maxY: y,
    minZ: 156,
    maxZ: 158,
  });
  const approach = union(
    cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 154, maxZ: 157 }),
    cellsIn({ minX: 1751, maxX: 1753, minY: y, maxY: y, minZ: 157, maxZ: 157 }),
  );
  const carrier = union(trunk, branches, approach);
  const shell = emptyEight.d06.shell.bounds;
  invariant(boundsDisjoint(boundsOf(carrier), shell) === false
    && carrier.every((cell) => cell.x >= shell.minX && cell.x <= shell.maxX
      && cell.y >= shell.minY && cell.y <= shell.maxY
      && cell.z >= shell.minZ && cell.z <= shell.maxZ), `${id} carrier escapes Empty Eight`);
  invariant(intersection(carrier, equipment).length === 0, `${id} carrier overlaps equipment bay`);
  addLayer(`${id}Carrier`, 'POWER_AND_CONTROLS', `${role}_CARRIER`, carrier,
    `Dedicated Y=${y} trunk, eight fixture rows, and a sealed equipment-bay approach.`);
  addLayer(`${id}Equipment`, 'POWER_AND_CONTROLS', `${role}_EQUIPMENT_RESERVATION`, equipment,
    `Dedicated 3x3 equipment reservation at Y=${y}; source and control states remain null.`);
}

circuitSetout('normalCircuit', 44, 'NORMAL_LIGHTING');
circuitSetout('emergencyCircuitA', 45, 'INDEPENDENT_EMERGENCY_A');
circuitSetout('emergencyCircuitB', 47, 'INDEPENDENT_EMERGENCY_B');

// Local drainage: retain all caps and the unconnected header, and derive one
// 3x1x3 local sump/pump equipment bay immediately inside each cap.
const localDrainCaps = [];
const localSumpPumpBays = [];
for (const item of payload.cappedDrainageSystem.localCaps) {
  const cap = cellsIn(item.cap.bounds);
  validateSourceSet(item.cap, cap, item.id);
  localDrainCaps.push(...cap);
  localSumpPumpBays.push(...cellsIn({
    minX: item.cap.bounds.minX - 1,
    maxX: item.cap.bounds.maxX + 1,
    minY: item.cap.bounds.minY + 1,
    maxY: item.cap.bounds.maxY + 1,
    minZ: item.cap.bounds.minZ,
    maxZ: item.cap.bounds.maxZ,
  }));
}
const drainHeader = cellsIn(payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation.bounds);
const drainBoundaryCap = cellsIn(payload.cappedDrainageSystem.retainedExternalBoundaryCap.bounds);
validateSourceSet(payload.cappedDrainageSystem.exactCapUnion, localDrainCaps, 'local drain cap union');
validateSourceSet(payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation,
  drainHeader, 'retained drain header');
validateSourceSet(payload.cappedDrainageSystem.retainedExternalBoundaryCap,
  drainBoundaryCap, 'external drain boundary cap');
addLayer('localDrainageInterfaceCaps', 'DRAINAGE', 'EIGHT_SEALED_LOCAL_DRAINAGE_CAPS',
  localDrainCaps, 'Exact union of the eight retained local drainage caps.', 'EXACT_SOURCE_REFERENCE');
addLayer('localSumpPumpEquipmentBays', 'DRAINAGE', 'EIGHT_LOCAL_SUMP_PUMP_EQUIPMENT_BAYS',
  localSumpPumpBays, 'One 3x1x3 equipment bay one block above and centered on each exact local cap.');
addLayer('unconnectedDrainHeaderReservation', 'DRAINAGE', 'SEALED_UNCONNECTED_DRAIN_HEADER',
  drainHeader, 'Exact retained unconnected header reservation.', 'EXACT_SOURCE_REFERENCE');
addLayer('externalDrainBoundaryCap', 'DRAINAGE', 'SEALED_EXTERNAL_DRAIN_BOUNDARY_CAP',
  drainBoundaryCap, 'Exact retained external drainage boundary cap.', 'EXACT_SOURCE_REFERENCE');

// Fire/service: retain exact internal geometry and add one control-panel cell
// per platform datum within the frozen spine.
const fire = payload.fireServiceSystem;
const fireSpine = cellsIn(fire.internalSpineReservation.bounds);
const fireInterfaceCap = cellsIn(fire.normallyClosedSpineInterfaceCap.bounds);
const fireSurfaceCompound = cellsIn(fire.surfaceCompoundReservation.bounds);
const fireApproachCap = cellsIn(fire.sealedSurfaceApproachInterface.bounds);
validateSourceSet(fire.internalSpineReservation, fireSpine, 'fire/service spine');
validateSourceSet(fire.normallyClosedSpineInterfaceCap, fireInterfaceCap,
  'fire/service spine interface cap');
validateSourceSet(fire.surfaceCompoundReservation, fireSurfaceCompound,
  'fire/service surface compound');
validateSourceSet(fire.sealedSurfaceApproachInterface, fireApproachCap,
  'fire/service surface approach cap');
const fireControlPanels = emptyEight.d06.platforms.map(({ trackCenterlineZ }) => ({
  x: 1846,
  y: 52,
  z: trackCenterlineZ,
}));
invariant(intersection(fireControlPanels, fireSpine).length === fireControlPanels.length,
  'fire control panels escape the exact spine');
addLayer('fireServiceControlPanels', 'FIRE_AND_SERVICE',
  'EIGHT_INTERNAL_FIRE_SERVICE_CONTROL_PANEL_RESERVATIONS', fireControlPanels,
  'One control-panel cell in the frozen internal spine at each track centerline datum.');
addLayer('fireServiceInterfaceCap', 'FIRE_AND_SERVICE', 'NORMALLY_CLOSED_SPINE_INTERFACE_CAP',
  fireInterfaceCap, 'Exact normally closed fire/service spine interface cap.', 'EXACT_SOURCE_REFERENCE');
addLayer('fireSurfaceApproachCap', 'FIRE_AND_SERVICE', 'SEALED_SURFACE_APPROACH_CAP',
  fireApproachCap, 'Exact sealed surface approach interface.', 'EXACT_SOURCE_REFERENCE');
addLayer('fireSurfaceCompoundReservation', 'FIRE_AND_SERVICE', 'SURFACE_COMPOUND_RESERVATION',
  fireSurfaceCompound, 'Exact frozen EG-B surface compound reservation.', 'EXACT_SOURCE_REFERENCE');
addLayer('fireServiceSpineReservation', 'FIRE_AND_SERVICE', 'INTERNAL_FIRE_SERVICE_SPINE',
  fireSpine, 'Exact frozen internal fire/service spine reservation.', 'EXACT_SOURCE_REFERENCE');

// Explicit priority, highest first. It is a proposal-layer adjudication only:
// no owner, interface, mechanism, state, construction, or operation acceptance.
const priority = [
  'smokeDoorMechanismBays',
  'platformGateMechanismBays',
  'externalDrainBoundaryCap',
  'fireSurfaceApproachCap',
  'fireServiceInterfaceCap',
  'egaLiftEquipmentCaps',
  'egbLiftEquipmentCaps',
  'egaStairEquipmentCaps',
  'egbStairEquipmentCaps',
  'egaTransferLandings',
  'egbTransferLandings',
  'ventOutletCaps',
  'ventFanEquipmentBays',
  'fireServiceControlPanels',
  'normalCircuitEquipment',
  'emergencyCircuitAEquipment',
  'emergencyCircuitBEquipment',
  'localSumpPumpEquipmentBays',
  'localDrainageInterfaceCaps',
  'lightingFixtureReservations',
  'egaLiftEnvelope',
  'egbLiftEnvelope',
  'egaStairEnvelope',
  'egbStairEnvelope',
  'ventDuctEnvelopes',
  'normalCircuitCarrier',
  'emergencyCircuitACarrier',
  'emergencyCircuitBCarrier',
  'unconnectedDrainHeaderReservation',
  'fireSurfaceCompoundReservation',
  'fireServiceSpineReservation',
];
invariant(priority.length === rawLayers.size
  && priority.every((id) => rawLayers.has(id)), 'precedence list does not cover every layer once');

const memberships = new Map();
for (const id of priority) {
  for (const cell of rawLayers.get(id)) {
    const key = cellKey(cell);
    if (!memberships.has(key)) memberships.set(key, { cell, layers: [] });
    memberships.get(key).layers.push(id);
  }
}
const duplicateEntries = [...memberships.values()].filter(({ layers }) => layers.length > 1);
const canonicalCells = new Map(priority.map((id) => [id, []]));
const conflictPairs = new Map();
for (const entry of memberships.values()) {
  const winner = entry.layers[0];
  canonicalCells.get(winner).push(entry.cell);
  for (const loser of entry.layers.slice(1)) {
    const id = `${winner}->${loser}`;
    if (!conflictPairs.has(id)) conflictPairs.set(id, { winner, loser, cells: [] });
    conflictPairs.get(id).cells.push(entry.cell);
  }
}
const precedenceRecords = [...conflictPairs.values()]
  .map(({ winner, loser, cells }) => ({
    precedenceId: `D06-PREC-${winner}-OVER-${loser}`,
    winningLayerId: winner,
    yieldingLayerId: loser,
    exactConflictCellSet: setRecord(cells,
      `Exact same-coordinate conflict; ${winner} wins over ${loser} under the frozen priority list.`),
    rule: 'EXPLICIT_FUNCTIONAL_PRECEDENCE_NO_LAST_WRITER_WINS',
    accepted: false,
  }))
  .sort((left, right) => left.precedenceId.localeCompare(right.precedenceId));
const rawMembershipCount = [...rawLayers.values()].reduce((sum, cells) => sum + cells.length, 0);
const canonicalCellCount = [...canonicalCells.values()].reduce((sum, cells) => sum + cells.length, 0);
invariant(canonicalCellCount === memberships.size, 'canonical proposal partition is incomplete');
const extraMembershipCount = duplicateEntries.reduce((sum, { layers }) => sum + layers.length - 1, 0);
invariant(rawMembershipCount - extraMembershipCount === canonicalCellCount,
  'duplicate membership accounting drift');

const proposalLayers = Object.fromEntries(priority.map((id, priorityIndex) => {
  const meta = layerMeta.get(id);
  const raw = rawLayers.get(id);
  const canonical = canonicalCells.get(id);
  return [id, {
    layerId: id,
    priority: priorityIndex + 1,
    group: meta.group,
    proposedFunction: meta.proposedFunction,
    basis: meta.basis,
    rawProposalCellSet: setRecord(raw, meta.derivation),
    canonicalProposalCellSetAfterPrecedence: setRecord(
      canonical,
      'Raw proposal cell set after subtracting every exact higher-priority same-coordinate membership.',
    ),
    proposalAccepted: false,
    acceptedMechanismCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedConstructionCellCount: 0,
  }];
}));

const canonicalOwnerForLayer = (layerId) => {
  if (layerId === 'smokeDoorMechanismBays') return 'OWN-D06-SMOKE';
  if (layerId === 'platformGateMechanismBays') return 'OWN-D06-BARRIER';
  if (layerId.startsWith('ega')) return 'OWN-D06-EG-A';
  if (layerId.startsWith('egb')) return 'OWN-D06-EG-B';
  if (layerId.startsWith('vent')) return 'OWN-D06-VENT';
  if (layerId.startsWith('normal') || layerId.startsWith('emergency')
    || layerId.startsWith('lighting')) return 'OWN-D06-POWER';
  if (layerId.startsWith('externalDrain') || layerId.startsWith('local')
    || layerId.startsWith('unconnectedDrain')) return 'OWN-D06-DRAIN';
  if (layerId.startsWith('fire')) return 'OWN-D06-FIRE';
  throw new Error(`Combined Zones D06 detailed setout rejected: unmapped owner layer ${layerId}`);
};
const canonicalOwnerMap = new Map();
for (const [layerId, cells] of canonicalCells) {
  const ownerId = canonicalOwnerForLayer(layerId);
  for (const cell of cells) canonicalOwnerMap.set(cellKey(cell), ownerId);
}
invariant(canonicalOwnerMap.size === canonicalCellCount,
  'canonical owner map does not cover every detailed cell once');
const ownerAdjacencyGroups = new Map();
for (const [key, fromOwnerId] of canonicalOwnerMap) {
  const [x, y, z] = key.split(',').map(Number);
  for (const offset of [
    { dx: 1, dy: 0, dz: 0, direction: 'POSITIVE_X' },
    { dx: 0, dy: 1, dz: 0, direction: 'POSITIVE_Y' },
    { dx: 0, dy: 0, dz: 1, direction: 'POSITIVE_Z' },
  ]) {
    const to = { x: x + offset.dx, y: y + offset.dy, z: z + offset.dz };
    const toOwnerId = canonicalOwnerMap.get(cellKey(to));
    if (!toOwnerId || toOwnerId === fromOwnerId) continue;
    const groupId = `${fromOwnerId}>${toOwnerId}:${offset.direction}`;
    if (!ownerAdjacencyGroups.has(groupId)) ownerAdjacencyGroups.set(groupId, {
      fromOwnerId,
      toOwnerId,
      direction: offset.direction,
      pairs: [],
    });
    ownerAdjacencyGroups.get(groupId).pairs.push({ from: { x, y, z }, to });
  }
}
const ownerAdjacencyRecords = [...ownerAdjacencyGroups.values()]
  .sort((left, right) => (
    `${left.fromOwnerId}>${left.toOwnerId}:${left.direction}`
      .localeCompare(`${right.fromOwnerId}>${right.toOwnerId}:${right.direction}`)
  ))
  .map((group, index) => {
    invariant(group.pairs.every(({ from, to }) => (
      canonicalOwnerMap.get(cellKey(from)) === group.fromOwnerId
      && canonicalOwnerMap.get(cellKey(to)) === group.toOwnerId
    )), 'canonical owner adjacency endpoint drift');
    return {
      interfaceId: `IF-D06-ADJ-${String(index + 1).padStart(2, '0')}`,
      fromOwnerId: group.fromOwnerId,
      toOwnerId: group.toOwnerId,
      direction: group.direction,
      relationship: 'EXACT_FACE_ADJACENCY_DEFAULT_DENY_NO_TRANSFER',
      exactInterfaceCellSet: ownerAdjacencyCellSet(
        group.pairs.flatMap(({ from, to }) => [from, to]),
        'Exact endpoints of a canonical D06 detailed-owner face adjacency.',
      ),
      transitionPairCount: group.pairs.length,
      transitionPairManifestSha256: ownerAdjacencyPairHash(group.pairs),
      defaultDeny: true,
      wildcardAllowed: false,
      lastWriterWinsAllowed: false,
      accepted: false,
      acceptedBy: null,
      status: 'HOLD_EXACT_DIRECTIONAL_ADJACENCY_PROPOSAL_NOT_ACCEPTED',
    };
  });
invariant(ownerAdjacencyRecords.length === 4
  && ownerAdjacencyRecords.reduce((sum, item) => sum + item.transitionPairCount, 0) === 59,
  'canonical D06 detailed-owner adjacency accounting drift');
const exactCanonicalOwnerAdjacency = {
  status: 'PASS_EXACT_FOUR_GROUPS_SEALED_TECHNICAL_ACCEPTANCE_HOLD',
  canonicalOwnerCellCount: canonicalOwnerMap.size,
  contractCount: ownerAdjacencyRecords.length,
  transitionPairCount: ownerAdjacencyRecords.reduce(
    (sum, item) => sum + item.transitionPairCount,
    0,
  ),
  records: ownerAdjacencyRecords,
  acceptedContractCount: 0,
  acceptedInterfaceCellCount: 0,
};

const setoutManifestSha256 = sha256([
  SETOUT_MANIFEST_PREAMBLE,
  ...priority.map((id) => {
    const item = proposalLayers[id];
    return `${id}\t${item.priority}\t${item.group}\t${item.rawProposalCellSet.cellCount}\t`
      + `${item.rawProposalCellSet.coordinateSetSha256}\t`
      + `${item.canonicalProposalCellSetAfterPrecedence.cellCount}\t`
      + `${item.canonicalProposalCellSetAfterPrecedence.coordinateSetSha256}`;
  }),
  '',
].join('\n'));
const precedenceManifestSha256 = sha256([
  PRECEDENCE_MANIFEST_PREAMBLE,
  ...precedenceRecords.map((item) => (
    `${item.precedenceId}\t${item.winningLayerId}\t${item.yieldingLayerId}\t`
    + `${item.exactConflictCellSet.cellCount}\t${item.exactConflictCellSet.coordinateSetSha256}`
  )),
  '',
].join('\n'));

// The new setout is confined to the already-known D06 Empty Eight component.
// Compare that exact proposal union against every other known scope component.
const proposalUnion = [...memberships.values()].map(({ cell }) => cell);
// These are the frozen convergence bounds previously reduced from their
// independent exact source packets. They are embedded here to avoid a cyclic
// byte binding between this D06 artifact and the downstream ownership registry.
const externalScopeComponents = Object.entries({
  'D02/C01': [
    { minX: 432, maxX: 1535, minY: 57, maxY: 109, minZ: -276, maxZ: 58 },
    { minX: 430, maxX: 718, minY: -36, maxY: 101, minZ: 32, maxZ: 58 },
  ],
  D05: [
    { minX: 1789, maxX: 2368, minY: 61, maxY: 306, minZ: -1068, maxZ: -588 },
  ],
  'P1-B11/P1-B12': [
    { minX: 1750, maxX: 2048, minY: 60, maxY: 71, minZ: -331, maxZ: -296 },
    { minX: 1750, maxX: 2048, minY: 68, maxY: 72, minZ: -331, maxZ: -296 },
    { minX: 1750, maxX: 2048, minY: 66, maxY: 71, minZ: -332, maxZ: -295 },
  ],
});
for (const [scope, components] of externalScopeComponents) {
  invariant(components.every((bounds) => boundsDisjoint(boundsOf(proposalUnion), bounds)),
    `D06 detailed setout bounds intersect ${scope}`);
}
const b07Bounds = payload.b07WestTwoSystem.exactInteractionUnion.bounds;
invariant(boundsDisjoint(boundsOf(proposalUnion), b07Bounds),
  'D06 detailed Empty Eight setout intersects the separate B07 component');

const crossScopeAudit = {
  status: 'PASS_KNOWN_CROSS_SCOPE_AND_B07_COMPONENTS_DISJOINT_BY_EXACT_BOUNDS',
  d06DetailedProposalUnion: setRecord(
    proposalUnion,
    'Exact union of all raw D06 detailed proposal layers before precedence.',
  ),
  comparedExternalScopeCount: externalScopeComponents.length,
  comparedExternalComponentCount: externalScopeComponents.reduce(
    (sum, [, components]) => sum + components.length,
    0,
  ),
  comparedExternalScopes: externalScopeComponents.map(([scope]) => scope),
  separateB07ComponentCompared: true,
  observedKnownCrossScopeConflictCellCount: 0,
  externalScopeComponentManifestSha256: sha256(JSON.stringify(externalScopeComponents)),
  qualification: 'This proves disjointness from the frozen D02/C01, D05, P1-B11/P1-B12, and B07 convergence bounds without binding the downstream registry back into this source artifact. Missing external routes, receivers, construction influence, and complete-save entities/POI/all-start sets remain unknown.',
};

const nullHeldSystems = [
  {
    id: 'D06-SET-H01-EXTERNAL-EGRESS-AND-SAFE-ENDPOINTS',
    exactCellSet: null,
    status: 'HOLD_EXTERNAL_ROUTE_AND_EXPERT_ACCEPTANCE',
    requirement: 'Exact protected exterior routes, accessible discharge, refuge/rescue behavior, and accepted safe endpoints for EG-A and EG-B.',
  },
  {
    id: 'D06-SET-H02-VENT-EXTERIOR-DISCHARGE-AND-SMOKE-MODEL',
    exactCellSet: null,
    status: 'HOLD_EXTERNAL_ROUTE_SMOKE_MODEL_AND_EXPERT_ACCEPTANCE',
    requirement: 'Exterior outlet geometry beyond retained caps, supply/extract mode, capacity, smoke control, weather protection, and accepted discharge effects.',
  },
  {
    id: 'D06-SET-H03-ACTUAL-MECHANISM-STATES-CONTROLS-AND-FAILURE-LOGIC',
    exactCellSet: null,
    status: 'HOLD_MECHANISM_ENGINEERING',
    requirement: 'Exact block states and functional logic for stairs/lifts, fans, smoke doors, platform gates, manual releases, detectors, barriers, and reset/failure behavior.',
  },
  {
    id: 'D06-SET-H04-CIRCUIT-SOURCES-CONTROLS-TRANSFER-AND-INDEPENDENCE',
    exactCellSet: null,
    status: 'HOLD_ELECTRICAL_AND_FAILURE_ENGINEERING',
    requirement: 'Normal and two genuinely independent emergency sources, controls, transfer logic, state traces, protection, load/coverage results, and common-cause proof.',
  },
  {
    id: 'D06-SET-H05-DRAINAGE-HYDRAULICS-PUMP-STATES-AND-RECEIVER',
    exactCellSet: null,
    status: 'HOLD_HYDROLOGY_D02_D05_AND_RECEIVER_ACCEPTANCE',
    requirement: 'Catchments, source/future fluids, inflow, storage, freeboard, pump/control states, recovery, outfall, external discharge, and accepted receiver contract.',
  },
  {
    id: 'D06-SET-H06-EXTERNAL-FIRE-SERVICE-ROUTE-AND-EMERGENCY-SERVICE',
    exactCellSet: null,
    status: 'HOLD_EXTERNAL_ROUTE_AND_EMERGENCY_SERVICE_ACCEPTANCE',
    requirement: 'Exact exterior approach, vehicle/personnel access, internal transfer behavior, access controls, and emergency-service acceptance.',
  },
  {
    id: 'D06-SET-H07-STRUCTURAL-GEOTECHNICAL-AND-MATERIAL-STATES',
    exactCellSet: null,
    status: 'HOLD_STRUCTURAL_GEOTECHNICAL_AND_MATERIAL_ACCEPTANCE',
    requirement: 'Loads, support/lining, foundations, penetrations, material/future states, construction influence, quantities, and exact source guards.',
  },
  {
    id: 'D06-SET-H08-COMPLETE-SAVE-ENTITY-POI-ALL-START',
    exactCellSet: null,
    status: 'HOLD_COMPLETE_SAVE',
    requirement: 'One same-moment complete save and final entity, POI, block-entity, fluid, and generated-start clearance against every influence set.',
  },
  {
    id: 'D06-SET-H09-OWNER-INTERFACE-TECHNICAL-ACCEPTANCE-AND-COMMISSIONING',
    exactCellSet: null,
    status: 'HOLD_OWNER_INTERFACE_TECHNICAL_ACCEPTANCE_AND_COMMISSIONING',
    requirement: 'Accepted one-owner assignments, directional interfaces, technical review, all 29 commissioning results, and one immutable accepted D06 identity.',
  },
];

const passHoldMatrix = [
  {
    id: 'D06-SET-G01-SOURCE-AND-REFERENCE-CONTRACT',
    status: 'PASS',
    result: 'The D06 contract and all 73 passed exact reservation references are hash-bound with technical acceptance retained as false.',
  },
  {
    id: 'D06-SET-G02-STAIR-LIFT-TRANSFER-EQUIPMENT',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: 'Both egress cores now have exact stair/lift envelopes, transfer landings, and end-equipment proposal caps.',
  },
  {
    id: 'D06-SET-G03-VENT-SMOKE-AND-PLATFORM-MECHANISMS',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: 'Four risers are partitioned into duct/fan/outlet proposals, and every smoke-door/platform-gate bay has an exact fail-closed mechanism reservation.',
  },
  {
    id: 'D06-SET-G04-NORMAL-AND-EMERGENCY-CIRCUITS',
    status: 'PASS_EXACT_CARRIER_PROPOSAL_FUNCTIONAL_HOLD',
    result: 'Three physically separated carrier/equipment proposals and all 56 fixture cells are exact; sources, controls, transfer, coverage, and independence remain unaccepted.',
  },
  {
    id: 'D06-SET-G05-DRAINAGE-AND-FIRE-SERVICE-CONTROLS',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: 'Eight local pump/cap bays, retained header/cap geometry, fire spine/caps, and eight internal control-panel reservations are exact.',
  },
  {
    id: 'D06-SET-G06-INTERNAL-DUPLICATE-PRECEDENCE',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: `${duplicateEntries.length.toLocaleString('en-US')} same-coordinate duplicate proposal cells are adjudicated by ${precedenceRecords.length} exact layer-pair records with no wildcard or last-writer rule.`,
  },
  {
    id: 'D06-SET-G07-CROSS-SCOPE-CONFLICT',
    status: 'PASS_KNOWN_SCOPE_GEOMETRY_COMPLETE_SAVE_HOLD',
    result: 'The detailed Empty Eight proposal is disjoint from known D02, D05, P1-B12, and separate B07 components; missing external/influence sets remain unknown.',
  },
  {
    id: 'D06-SET-G07A-CANONICAL-OWNER-ADJACENCY',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: `${exactCanonicalOwnerAdjacency.contractCount} canonical-owner adjacency groups and ${exactCanonicalOwnerAdjacency.transitionPairCount} face pairs are exact, directional, default-deny, and unaccepted.`,
  },
  {
    id: 'D06-SET-G08-FUNCTIONAL-TECHNICAL-AND-COMMISSIONING',
    status: 'HOLD',
    result: `${nullHeldSystems.length} functional/external/technical/complete-save/acceptance classes remain explicit null/HOLD.`,
  },
  {
    id: 'D06-SET-G09-G03-D06-ACCEPTANCE',
    status: 'HOLD',
    result: 'G03/D06 proposal geometry is more complete, but accepted mechanism/material/construction/owner/interface/operation cells and commissioning results remain zero.',
  },
];

const report = {
  schemaVersion: 2,
  id: 'combined-zones-phase1-d06-detailed-mechanism-circuit-setout-proposal',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_D06_DETAILED_MECHANISM_CIRCUIT_SETOUT_FUNCTIONAL_ACCEPTANCE_HOLD',
  purpose: 'Remove D06/G03 setout ambiguity with exact bounded mechanism, circuit-carrier, drainage, and control proposal layers while preserving every functional, external-route, complete-save, technical, owner/interface, and commissioning gate.',
  sourceBindings,
  authorityBoundary: {
    ownerAcceptedPlanningPolicyPreserved: true,
    technicalAcceptanceClaimed: false,
    mechanismAcceptanceClaimed: false,
    materialOrFutureStateAcceptanceClaimed: false,
    constructionAcceptanceClaimed: false,
    ownerOrInterfaceAcceptanceClaimed: false,
    commissioningClaimed: false,
    operationAuthorityClaimed: false,
  },
  deterministicSetoutContract: {
    coordinateOrder: 'numeric x, then y, then z',
    coordinateSetPreamble: `${CELL_HASH_PREAMBLE}\\n`,
    exactSourceReferenceCount: 73,
    exactSourceReferencePassCount: 73,
    proposalLayerCount: priority.length,
    priorityRule: 'Explicit ordered functional precedence, highest first; never wildcard, shared canonical ownership, or last-writer-wins.',
    priority,
    setoutManifestSha256,
    precedenceManifestSha256,
  },
  exactDetailedProposalLayers: {
    status: 'PASS_EXACT_PROPOSAL_ONLY_FUNCTIONAL_AND_TECHNICAL_ACCEPTANCE_HOLD',
    rawProposalMembershipCount: rawMembershipCount,
    uniqueRawProposalCellCount: memberships.size,
    duplicateCoordinateCount: duplicateEntries.length,
    extraMembershipCount,
    canonicalProposalCellCountAfterPrecedence: canonicalCellCount,
    proposalLayers,
    acceptedMechanismCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedConstructionCellCount: 0,
  },
  internalDuplicateAndPrecedenceAudit: {
    status: 'PASS_EXACT_EXPLICIT_PRECEDENCE_PROPOSAL_ONLY',
    duplicateCoordinateCount: duplicateEntries.length,
    extraMembershipCount,
    precedenceRecordCount: precedenceRecords.length,
    precedenceRecords,
    wildcardPrecedenceCount: 0,
    lastWriterWinsCount: 0,
    sharedCanonicalAssignmentCount: 0,
    acceptedPrecedenceRecordCount: 0,
  },
  exactCanonicalOwnerAdjacency,
  crossScopeAudit,
  nullHeldSystems,
  passHoldMatrix,
  ambiguityRemoved: [
    'Both egress cores now have exact proposed stair, lift, transfer-landing, and equipment-cap layers rather than four null mechanism slots.',
    'Each local vent riser is exactly divided into duct, fan-equipment, and sealed outlet-cap cells.',
    'All smoke-door and platform-gate mechanism bays are exact and remain fail-closed.',
    'Normal, emergency A, and emergency B now have physically separated exact carrier and equipment proposal cells, while source/control/transfer/independence evidence remains null.',
    'Eight local sump/pump equipment bays and caps, the retained drainage header/boundary cap, and internal fire/service control positions are exact.',
    'Every internal same-coordinate duplicate has a deterministic exact precedence result, and known cross-scope components are conflict-free.',
    'Four canonical logical-owner adjacency groups covering 59 exact face pairs are endpoint-validated, directional, sealed, and unaccepted.',
  ],
  genuineResidualBlockers: nullHeldSystems.map(({ id, status, requirement }) => ({
    id,
    status,
    requirement,
  })),
  disposition: {
    exactG03D06SetoutProposalCompiled: true,
    exactInternalDuplicatePrecedenceCompiled: true,
    exactCanonicalOwnerAdjacencyCompiled: true,
    knownCrossScopeConflictAuditPassed: true,
    externalRoutesAccepted: false,
    acceptedReceiverOrDischargePresent: false,
    functionalMechanismStatesAccepted: false,
    circuitsFunctionallyAccepted: false,
    controlsAndFailureLogicAccepted: false,
    completeSaveAccepted: false,
    technicalAcceptanceRecorded: false,
    commissioningPassed: false,
    d06Resolved: false,
    g03Accepted: false,
    r00Passed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    acceptedMechanismCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedOwnerAssignmentCount: 0,
    acceptedInterfaceCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    executable: false,
  },
};

report.reportIdentitySha256 = sha256(JSON.stringify({
  id: report.id,
  sourceBindings: report.sourceBindings,
  authorityBoundary: report.authorityBoundary,
  deterministicSetoutContract: report.deterministicSetoutContract,
  exactDetailedProposalLayers: report.exactDetailedProposalLayers,
  internalDuplicateAndPrecedenceAudit: report.internalDuplicateAndPrecedenceAudit,
  exactCanonicalOwnerAdjacency: report.exactCanonicalOwnerAdjacency,
  crossScopeAudit: report.crossScopeAudit,
  nullHeldSystems: report.nullHeldSystems,
}));

const layersByGroup = new Map();
for (const layer of Object.values(proposalLayers)) {
  if (!layersByGroup.has(layer.group)) layersByGroup.set(layer.group, []);
  layersByGroup.get(layer.group).push(layer);
}
const groupCounts = [...layersByGroup.entries()].map(([group, layers]) => ({
  group,
  layerCount: layers.length,
  rawMembershipCount: layers.reduce((sum, layer) => sum + layer.rawProposalCellSet.cellCount, 0),
  canonicalCellCount: layers.reduce(
    (sum, layer) => sum + layer.canonicalProposalCellSetAfterPrecedence.cellCount,
    0,
  ),
})).sort((left, right) => left.group.localeCompare(right.group));
const groupRow = (item) => (
  `| ${item.group} | ${item.layerCount} | ${item.rawMembershipCount.toLocaleString('en-US')} | ${item.canonicalCellCount.toLocaleString('en-US')} |`
);
const gateRow = (item) => `| ${item.id} | ${item.status} | ${item.result} |`;
const markdown = `# Combined Zones Phase 1 D06 detailed mechanism/circuit setout proposal

Status: **${report.status}**

This artifact turns the frozen D06 reservations into exact detailed proposal
layers. It does not assert that any mechanism, circuit, route, drain, control,
material state, owner/interface assignment, construction package, or
commissioning result has been accepted.

## Exact proposal accounting

- Exact source references bound: **73 / 73**
- Detailed proposal layers: **${priority.length}**
- Raw proposal memberships: **${rawMembershipCount.toLocaleString('en-US')}**
- Unique proposal cells: **${memberships.size.toLocaleString('en-US')}**
- Duplicate coordinates: **${duplicateEntries.length.toLocaleString('en-US')}**
- Exact precedence records: **${precedenceRecords.length}**
- Canonical proposal cells after precedence: **${canonicalCellCount.toLocaleString('en-US')}**
- Canonical-owner adjacency groups / face pairs: **${exactCanonicalOwnerAdjacency.contractCount} / ${exactCanonicalOwnerAdjacency.transitionPairCount}**
- Accepted mechanisms / materials / construction / operations: **0 / 0 / 0 / 0**

| Group | Layers | Raw memberships | Canonical cells |
|---|---:|---:|---:|
${groupCounts.map(groupRow).join('\n')}

Functional layers may overlap in the raw proposal. The published priority list
adjudicates each exact duplicate before canonical proposal accounting. No
wildcard, shared canonical assignment, or last-writer-wins behavior is used.

## G03 / D06 ambiguity removed

${report.ambiguityRemoved.map((item) => `- ${item}`).join('\n')}

## Genuine residual blockers

${report.genuineResidualBlockers.map((item) => `- **${item.id}** — ${item.requirement}`).join('\n')}

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
${passHoldMatrix.map(gateRow).join('\n')}

## Safety boundary

This was a deterministic offline compilation. Accepted mechanisms, functional
states, materials, construction cells, owners, interfaces, operations, and
commissioning results remain zero. Report identity:
\`${report.reportIdentitySha256}\`.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  reportIdentitySha256: report.reportIdentitySha256,
  setoutManifestSha256,
  precedenceManifestSha256,
  proposalLayerCount: priority.length,
  rawProposalMembershipCount: rawMembershipCount,
  uniqueProposalCellCount: memberships.size,
  duplicateCoordinateCount: duplicateEntries.length,
  extraMembershipCount,
  precedenceRecordCount: precedenceRecords.length,
  canonicalProposalCellCountAfterPrecedence: canonicalCellCount,
  canonicalOwnerAdjacencyContractCount: exactCanonicalOwnerAdjacency.contractCount,
  canonicalOwnerAdjacencyTransitionPairCount: exactCanonicalOwnerAdjacency.transitionPairCount,
  nullHeldSystemCount: nullHeldSystems.length,
  acceptedMechanismCellCount: 0,
  acceptedMaterialCellCount: 0,
  acceptedConstructionCellCount: 0,
  operationCellCount: 0,
}, null, 2));
