#!/usr/bin/env node
/**
 * Compile exact, source-limited proposal domains for the remaining D02/D06
 * civil and life-safety G03 geometry gaps.
 *
 * This is an offline coordination compiler. Its construction-domain records
 * are reservation/proposal unions, not accepted construction targets. Its
 * influence-domain records are only the exact extents already established by
 * source evidence; they are not expert influence margins. No receiver, flow,
 * power source, functional state, material, operation, or acceptance is
 * inferred.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T05:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.md',
));

const INPUTS = Object.freeze({
  d02Technical: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02C01: 'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  immutableRegionEvidence: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  completeSaveAudit: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const D06_CELL_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const OUTPUT_CELL_PREAMBLE = 'combined-zones-civil-life-safety-domain-closure-cell-set-v1';
const OUTPUT_PAYLOAD_PREAMBLE = 'combined-zones-civil-life-safety-domain-closure-payload-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`Civil/life-safety domain closure rejected: ${message}`);
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

function canonicalJson(valueToSerialize) {
  if (valueToSerialize === null || typeof valueToSerialize !== 'object') {
    return JSON.stringify(valueToSerialize);
  }
  if (Array.isArray(valueToSerialize)) {
    return `[${valueToSerialize.map(canonicalJson).join(',')}]`;
  }
  return `{${Object.keys(valueToSerialize).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(valueToSerialize[key])}`
  )).join(',')}}`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const bytes = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes), role };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
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

function coordinateHash(cells, preamble = OUTPUT_CELL_PREAMBLE) {
  const digest = crypto.createHash('sha256').update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cellKey(cell)}\n`);
  return digest.digest('hex');
}

function rawCoordinateHash(cells) {
  return sha256(uniqueCells(cells).map(cellKey).join('\n'));
}

function d02CoordinateHash(cells, preamble) {
  const digest = crypto.createHash('sha256').update(`${preamble}-coordinates\n`);
  for (const cell of [...cells].sort(compareCells)) digest.update(`${cellKey(cell)}\n`);
  return digest.digest('hex');
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  const directions = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first.split(',').map(Number)];
    let size = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y, z] = queue[index];
      size += 1;
      for (const [dx, dy, dz] of directions) {
        const neighbor = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbor)) queue.push([x + dx, y + dy, z + dz]);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return {
    componentCount: sizes.length,
    largestComponentCellCount: sizes[0] ?? 0,
    componentSizeMultisetSha256: sha256(`${sizes.join('\n')}\n`),
  };
}

function domainRecord(cells, derivation, semantics, sourceIdentities = {}) {
  const exact = uniqueCells(cells);
  return {
    status: 'PASS_EXACT_SOURCE_LIMITED_PROPOSAL_GEOMETRY_UNACCEPTED',
    representation: 'EXACT_DETERMINISTIC_INTEGER_CELL_SET_HASH_ONLY',
    derivation,
    semantics,
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinatePreamble: `${OUTPUT_CELL_PREAMBLE}\n`,
    coordinateSetSha256: coordinateHash(exact),
    ...connectedComponents(exact),
    sourceIdentities,
    accepted: false,
    acceptedConstructionCellCount: 0,
    acceptedInfluenceCellCount: 0,
    acceptedMaterialCellCount: 0,
    operationCellCount: 0,
  };
}

function resolveJsonPointer(document, pointer) {
  invariant(typeof pointer === 'string' && pointer.startsWith('/'), `invalid JSON pointer ${pointer}`);
  return pointer.slice(1).split('/').reduce((current, encoded) => {
    const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    invariant(current !== null && current !== undefined
      && Object.prototype.hasOwnProperty.call(current, key), `missing JSON pointer ${pointer}`);
    return current[key];
  }, document);
}

const d02 = readJson(INPUTS.d02Technical);
const d02C01 = readJson(INPUTS.d02C01);
const lifeSafety = readJson(INPUTS.d06LifeSafety);
const mechanisms = readJson(INPUTS.d06Mechanisms);
const detailed = readJson(INPUTS.d06Detailed);
const emptyEight = readJson(INPUTS.emptyEight);
const regionEvidence = readJson(INPUTS.immutableRegionEvidence);
const completeSave = readJson(INPUTS.completeSaveAudit);

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, sourcePath]) => [
  key,
  binding(sourcePath, {
    d02Technical: 'ten exact D02 candidate envelopes, inlet references, and ROAD-LOW-001 no-build set',
    d02C01: 'exact bounded C01 loading/D02 precedence and sealed directional interface',
    d06LifeSafety: 'selected B07 and fail-closed D06 reservation geometry',
    d06Mechanisms: '73-reference D06 source ledger and retained functional HOLDs',
    d06Detailed: '31-layer exact D06 detailed proposal and precedence identity',
    emptyEight: 'frozen fixture, barrier, core, drainage, and fire/service source geometry',
    immutableRegionEvidence: 'immutable region-only audit and complete-save limitation',
    completeSaveAudit: 'current same-moment complete-save intake result',
  }[key]),
]));

invariant(d02.status === 'PARTIAL_PASS_EXACT_D02_TECHNICAL_DEVELOPMENT_D02_G02_HOLD',
  'D02 technical status drift');
invariant(d02C01.status
  === 'PARTIAL_PASS_EXACT_BOUNDED_D02_C01_PROPOSAL_D02_G03_G04_G05_HOLD',
  'D02/C01 proposal status drift');
invariant(lifeSafety.status
  === 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
  'D06 life-safety status drift');
invariant(mechanisms.status
  === 'PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD',
  'D06 mechanism contract status drift');
invariant(detailed.status
  === 'PARTIAL_PASS_EXACT_D06_DETAILED_MECHANISM_CIRCUIT_SETOUT_FUNCTIONAL_ACCEPTANCE_HOLD',
  'D06 detailed-setout status drift');
invariant(completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save status changed; re-audit before reuse');
invariant(completeSave.requiredDirectories.find(({ name }) => name === 'region')?.path
  === regionEvidence.selectedRegionOnlyEvidence.identity.path,
  'immutable region path drift between audits');
invariant(completeSave.summary.autonomousEngineeringMayUseAsCompleteSaveEvidence === false,
  'a complete-save candidate now exists; this source-limited compiler must be regenerated');
invariant(mechanisms.summary.acceptedMechanismManifestCount === 0
  && mechanisms.summary.operationCellCount === 0
  && detailed.safetyBoundary.acceptedConstructionCellCount === 0,
  'upstream evidence unexpectedly claims an accepted mechanism or construction set');

// D02: reproduce all ten candidate envelopes and every exact inlet. The sole
// exact C01 vertical D02/loading interface contributes its nine lower loading
// cells; no generic halo or engineering margin is invented. ROAD-LOW-001 is a
// separate exact preservation influence reservation.
const d02SourceManifest = d02.technicalDevelopmentPayload.selectedBasis
  .exactAggregateCandidateCellManifest;
const d02Construction = uniqueCells(d02SourceManifest.cells);
invariant(d02Construction.length === 432, 'D02 aggregate candidate count drift');
invariant(d02CoordinateHash(d02Construction, 'combined-zones-d02-s04-alt-d')
  === d02SourceManifest.coordinateSetSha256,
  'D02 aggregate candidate coordinate identity drift');
const d02Inlets = uniqueCells(d02.technicalDevelopmentPayload.exactAssetDesigns.flatMap(
  ({ collectionInlet }) => collectionInlet.cellManifest.cells,
));
invariant(d02Inlets.length === d02.summary.collectionInletCellCount,
  'D02 inlet union count drift');
invariant(intersection(d02Inlets, d02Construction).length === d02Inlets.length,
  'D02 inlet escaped the candidate envelope');
const loadingInterface = d02C01.proposalPayload.directionalSealedInterfaces.exactFaceAdjacentContracts
  .find(({ contractId }) => contractId === 'IF-C1-LOADING-SEPARATION-TO-D02-CAPPED-SUMP-CAPS');
invariant(loadingInterface?.transitionPairCount === 9
  && loadingInterface.interfaceCellSet.cellCount === 18,
  'D02/C01 exact vertical interface drift');
const d02C01InterfaceCells = cellsIn(loadingInterface.interfaceCellSet.bounds);
invariant(coordinateHash(d02C01InterfaceCells, 'combined-zones-coordinate-cell-set-v1')
  === loadingInterface.interfaceCellSet.coordinateSetSha256,
  'D02/C01 exact interface-cell identity drift');
const d02Interaction = union(d02Construction, d02Inlets, d02C01InterfaceCells);
const d02NoBuildManifest = d02.technicalDevelopmentPayload.roadLow001NoBuildHold
  .exactPreservationCellManifest;
const d02NoBuild = uniqueCells(d02NoBuildManifest.cells);
invariant(d02CoordinateHash(d02NoBuild, 'combined-zones-d02-s04-alt-d-held-preservation')
  === d02NoBuildManifest.coordinateSetSha256,
  'ROAD-LOW-001 no-build identity drift');
const d02Influence = union(d02Interaction, d02NoBuild);

// B07: independently reproduce the selected west-two dogleg. Its exact
// interaction union is the strongest source-bound influence reservation. It
// is deliberately not enlarged into an unevidenced geotechnical/hydraulic
// margin.
const b07 = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const { top, observationLanding: observation, lowerLobby: lower } = b07.anchors;
const shiftedX = observation.x - 2;
const b07Construction = union(
  cellsIn({ minX: top.x - 3, maxX: top.x + 3, minY: observation.y, maxY: top.y, minZ: top.z - 3, maxZ: top.z + 3 }),
  cellsIn({ minX: shiftedX - 3, maxX: observation.x + 3, minY: observation.y - 3, maxY: observation.y + 3, minZ: observation.z - 3, maxZ: observation.z + 3 }),
  cellsIn({ minX: shiftedX - 3, maxX: shiftedX + 3, minY: observation.y - 3, maxY: observation.y + 3, minZ: lower.z - 3, maxZ: observation.z + 3 }),
  cellsIn({ minX: shiftedX - 3, maxX: shiftedX + 3, minY: lower.y, maxY: observation.y, minZ: lower.z - 3, maxZ: lower.z + 3 }),
  cellsIn({ minX: shiftedX - 3, maxX: lower.x + 3, minY: lower.y - 3, maxY: lower.y + 3, minZ: lower.z - 3, maxZ: lower.z + 3 }),
);
function cubeDilateOne(cells) {
  const result = [];
  for (const { x, y, z } of cells) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) result.push({ x: x + dx, y: y + dy, z: z + dz });
      }
    }
  }
  return uniqueCells(result);
}
const b07Interaction = cubeDilateOne(b07Construction);
invariant(coordinateHash(b07Construction, D06_CELL_PREAMBLE)
  === b07.exactExcavationReservation.coordinateSetSha256,
  'B07 excavation identity drift');
invariant(coordinateHash(b07Interaction, D06_CELL_PREAMBLE)
  === b07.exactInteractionUnion.coordinateSetSha256,
  'B07 interaction identity drift');
const b07Influence = b07Interaction;

const payload = mechanisms.mechanismDevelopmentPayload;
const referenceLedger = payload.exactReservationReferenceContract.references;
invariant(referenceLedger.length === 73
  && payload.exactReservationReferenceContract.allPassed === true,
  'D06 73-reference contract drift');

function referenceCells(reference) {
  const logical = reference.logicalPath;
  if (reference.cellCount === 0 && reference.bounds === null) return [];
  if (logical === 'b07WestTwo/excavationReservation') return b07Construction;
  if (logical === 'b07WestTwo/interactionUnion') return b07Interaction;
  if (logical === 'smokeVentilationAndBarriers/localVentUnion') {
    return union(...payload.ventSystems.map(({ exactRiserReservation }) => (
      cellsIn(exactRiserReservation.bounds)
    )));
  }
  const platformMatch = logical.match(/platformBarriers\/(\d+)\/(retainedClosedBarrierReservation|staticGateBayCap)$/);
  if (platformMatch) {
    const platform = payload.smokeAndBarrierSystems.platformBarriers[Number(platformMatch[1])];
    const z = platform.staticGateBayCap.bounds.minZ;
    const gates = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
      minX, maxX: minX + 2, minY: 42, maxY: 43, minZ: z, maxZ: z,
    }));
    if (platformMatch[2] === 'staticGateBayCap') return gates;
    return difference(cellsIn(platform.retainedClosedBarrierReservation.bounds), gates);
  }
  const smokeMatch = logical.match(/smokeBoundaries\/(\d+)\/(retainedBoundaryPlane|staticOpeningCaps)$/);
  if (smokeMatch) {
    const boundary = payload.smokeAndBarrierSystems.smokeBoundaries[Number(smokeMatch[1])];
    const z = boundary.staticOpeningCaps.bounds.minZ;
    const openings = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: z, maxZ: z,
    }));
    if (smokeMatch[2] === 'staticOpeningCaps') return openings;
    return difference(cellsIn(boundary.retainedBoundaryPlane.bounds), openings);
  }
  const fixtureMatch = logical.match(/fixtureReservations\/(\d+)\/reservation$/);
  if (fixtureMatch) {
    const z = payload.lightingAndPowerSystem.exactFixtureReservations[
      Number(fixtureMatch[1])
    ].reservation.bounds.minZ;
    return [1660, 1676, 1692, 1708, 1724, 1740, 1748].map((x) => ({ x, y: 46, z }));
  }
  if (logical === 'cappedDrainage/capUnion') {
    return union(...payload.cappedDrainageSystem.localCaps.map(({ cap }) => cellsIn(cap.bounds)));
  }
  return cellsIn(reference.bounds);
}

const lifeSafetyDocument = lifeSafety;
const sourceDocuments = new Map([
  [INPUTS.d06LifeSafety, lifeSafetyDocument],
  [INPUTS.emptyEight, emptyEight],
]);
const reproducedReferences = referenceLedger.map((reference) => {
  const source = sourceDocuments.get(reference.sourcePath);
  invariant(source, `unsupported D06 source ${reference.sourcePath}`);
  const sourceManifest = resolveJsonPointer(source, reference.jsonPointer);
  const cells = referenceCells(reference);
  const expectedHash = sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256;
  const actualHash = reference.sourcePath === INPUTS.emptyEight
    ? rawCoordinateHash(cells)
    : coordinateHash(cells, D06_CELL_PREAMBLE);
  invariant(cells.length === reference.cellCount, `${reference.logicalPath} cell-count drift`);
  invariant(JSON.stringify(boundsOf(cells)) === JSON.stringify(reference.bounds),
    `${reference.logicalPath} bounds drift`);
  invariant(actualHash === expectedHash && actualHash === reference.coordinateSetSha256,
    `${reference.logicalPath} coordinate identity drift`);
  return { reference, cells };
});

// The construction-domain proposal excludes the explicit B07 interaction
// record. It still consists of reservations and caps—not build targets. The
// interaction-domain proposal is the exact union of all 73 references. The
// influence-domain proposal intentionally equals that source-limited union;
// no extra expert margin is fabricated.
const d06ReservationConstruction = union(...reproducedReferences
  .filter(({ reference }) => reference.logicalPath !== 'b07WestTwo/interactionUnion')
  .map(({ cells }) => cells));
const d06ReservationInteraction = union(...reproducedReferences.map(({ cells }) => cells));
const d06ReservationInfluence = d06ReservationInteraction;
const rawReservationMembershipCount = reproducedReferences.reduce(
  (sum, { cells }) => sum + cells.length, 0,
);
const reservationDuplicateCoordinates = new Map();
for (const { reference, cells } of reproducedReferences) {
  for (const cell of cells) {
    const key = cellKey(cell);
    if (!reservationDuplicateCoordinates.has(key)) reservationDuplicateCoordinates.set(key, []);
    reservationDuplicateCoordinates.get(key).push(reference.logicalPath);
  }
}
const duplicateReservationCoordinateCount = [...reservationDuplicateCoordinates.values()]
  .filter((memberships) => memberships.length > 1).length;

// Reproduce all 31 detailed mechanism proposal layers. Their raw union is the
// exact D06-MECHANISMS construction-domain proposal and also the strongest
// source-limited influence reservation. It remains neither a physical
// mechanism manifest nor an expert influence kernel.
const rawLayers = new Map();
function addLayer(id, cells) {
  invariant(!rawLayers.has(id), `duplicate detailed layer ${id}`);
  rawLayers.set(id, uniqueCells(cells));
}

for (const system of payload.protectedEgressAndLiftSystems) {
  const prefix = system.coreId.toLowerCase().replace('-', '');
  const combined = cellsIn(system.combinedProtectedCoreReservation.bounds);
  const stair = cellsIn(system.protectedStairReservation.bounds);
  const lift = cellsIn(system.accessibleLiftReservation.bounds);
  const bottom = cellsIn({
    ...system.combinedProtectedCoreReservation.bounds,
    maxY: system.combinedProtectedCoreReservation.bounds.minY,
  });
  const roof = cellsIn(system.roofTransitionCap.bounds);
  const surface = cellsIn(system.surfaceOutletCap.bounds);
  addLayer(`${prefix}TransferLandings`, union(bottom, roof, surface));
  addLayer(`${prefix}LiftEquipmentCaps`, union(
    cellsIn({ ...system.accessibleLiftReservation.bounds, maxY: system.accessibleLiftReservation.bounds.minY }),
    cellsIn({ ...system.accessibleLiftReservation.bounds, minY: system.accessibleLiftReservation.bounds.maxY }),
  ));
  addLayer(`${prefix}StairEquipmentCaps`, union(
    cellsIn({ ...system.protectedStairReservation.bounds, maxY: system.protectedStairReservation.bounds.minY }),
    cellsIn({ ...system.protectedStairReservation.bounds, minY: system.protectedStairReservation.bounds.maxY }),
  ));
  addLayer(`${prefix}LiftEnvelope`, lift);
  addLayer(`${prefix}StairEnvelope`, stair);
  invariant(intersection(union(stair, lift), combined).length === union(stair, lift).length,
    `${system.coreId} component escaped core`);
}

const ventFans = [];
const ventOutlets = [];
const ventDucts = [];
for (const system of payload.ventSystems) {
  const bounds = system.exactRiserReservation.bounds;
  const riser = cellsIn(bounds);
  const fan = cellsIn({ ...bounds, maxY: bounds.minY });
  const outlet = cellsIn({ ...bounds, minY: bounds.maxY });
  ventFans.push(...fan);
  ventOutlets.push(...outlet);
  ventDucts.push(...difference(riser, union(fan, outlet)));
}
addLayer('ventFanEquipmentBays', ventFans);
addLayer('ventOutletCaps', ventOutlets);
addLayer('ventDuctEnvelopes', ventDucts);

const smokeDoorBays = payload.smokeAndBarrierSystems.smokeBoundaries.flatMap((boundary) => (
  [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
    minX, maxX: minX + 2, minY: 49, maxY: 51,
    minZ: boundary.staticOpeningCaps.bounds.minZ,
    maxZ: boundary.staticOpeningCaps.bounds.maxZ,
  }))
));
const platformGateBays = payload.smokeAndBarrierSystems.platformBarriers.flatMap((barrier) => (
  [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
    minX, maxX: minX + 2, minY: 42, maxY: 43,
    minZ: barrier.staticGateBayCap.bounds.minZ,
    maxZ: barrier.staticGateBayCap.bounds.maxZ,
  }))
));
addLayer('smokeDoorMechanismBays', smokeDoorBays);
addLayer('platformGateMechanismBays', platformGateBays);

const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
const fixtureZ = payload.lightingAndPowerSystem.exactFixtureReservations.map(
  ({ reservation }) => reservation.bounds.minZ,
);
const fixtureCells = fixtureZ.flatMap((z) => fixtureX.map((x) => ({ x, y: 46, z })));
addLayer('lightingFixtureReservations', fixtureCells);

function circuitSetout(id, y) {
  const trunk = cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 54, maxZ: 153 });
  const branches = fixtureZ.flatMap((z) => cellsIn({
    minX: Math.min(...fixtureX), maxX: 1750, minY: y, maxY: y, minZ: z, maxZ: z,
  }));
  const approach = union(
    cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 154, maxZ: 157 }),
    cellsIn({ minX: 1751, maxX: 1753, minY: y, maxY: y, minZ: 157, maxZ: 157 }),
  );
  addLayer(`${id}Carrier`, union(trunk, branches, approach));
  addLayer(`${id}Equipment`, cellsIn({
    minX: 1754, maxX: 1756, minY: y, maxY: y, minZ: 156, maxZ: 158,
  }));
}
circuitSetout('normalCircuit', 44);
circuitSetout('emergencyCircuitA', 45);
circuitSetout('emergencyCircuitB', 47);

const localDrainCaps = payload.cappedDrainageSystem.localCaps.flatMap(({ cap }) => cellsIn(cap.bounds));
const localSumpPumpBays = payload.cappedDrainageSystem.localCaps.flatMap(({ cap }) => cellsIn({
  minX: cap.bounds.minX - 1,
  maxX: cap.bounds.maxX + 1,
  minY: cap.bounds.minY + 1,
  maxY: cap.bounds.maxY + 1,
  minZ: cap.bounds.minZ,
  maxZ: cap.bounds.maxZ,
}));
addLayer('localDrainageInterfaceCaps', localDrainCaps);
addLayer('localSumpPumpEquipmentBays', localSumpPumpBays);
addLayer('unconnectedDrainHeaderReservation',
  cellsIn(payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation.bounds));
addLayer('externalDrainBoundaryCap',
  cellsIn(payload.cappedDrainageSystem.retainedExternalBoundaryCap.bounds));

const fire = payload.fireServiceSystem;
addLayer('fireServiceInterfaceCap', cellsIn(fire.normallyClosedSpineInterfaceCap.bounds));
addLayer('fireSurfaceApproachCap', cellsIn(fire.sealedSurfaceApproachInterface.bounds));
addLayer('fireSurfaceCompoundReservation', cellsIn(fire.surfaceCompoundReservation.bounds));
addLayer('fireServiceSpineReservation', cellsIn(fire.internalSpineReservation.bounds));
addLayer('fireServiceControlPanels', emptyEight.d06.platforms.map(({ trackCenterlineZ }) => ({
  x: 1846, y: 52, z: trackCenterlineZ,
})));

invariant(rawLayers.size === detailed.deterministicSetoutContract.proposalLayerCount,
  'D06 detailed proposal-layer count drift');
for (const [id, cells] of rawLayers) {
  const source = detailed.exactDetailedProposalLayers.proposalLayers[id];
  invariant(source, `missing D06 detailed layer ${id}`);
  invariant(source.rawProposalCellSet.cellCount === cells.length,
    `${id} raw proposal count drift`);
  invariant(source.rawProposalCellSet.coordinateSetSha256
    === coordinateHash(cells, D06_CELL_PREAMBLE), `${id} raw proposal identity drift`);
}
const d06MechanismConstruction = union(...rawLayers.values());
invariant(d06MechanismConstruction.length
  === detailed.exactDetailedProposalLayers.uniqueRawProposalCellCount,
  'D06 detailed proposal union count drift');
const d06MechanismInfluence = d06MechanismConstruction;

const proposalDomains = {
  'P1-B07': {
    influence: domainRecord(
      b07Influence,
      'Exact selected B07-C-WEST-2 interaction union, independently reproduced from the three frozen anchors and 7x7 dogleg primitives.',
      'SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_EQUALS_KNOWN_INTERACTION_UNION_NOT_AN_EXPERT_MARGIN',
      { sourceCoordinateSetSha256: b07.exactInteractionUnion.coordinateSetSha256 },
    ),
  },
  D02: {
    interaction: domainRecord(
      d02Interaction,
      'Union of all ten exact candidate envelopes, all ten exact inlet references, and the exact bounded C01 loading-to-D02 vertical interface cells.',
      'WHOLE_D02_KNOWN_INTERACTION_PROPOSAL_NO_GENERIC_HALO_FLOW_OR_LOADING_CREDIT',
      {
        candidateEnvelopeSha256: d02SourceManifest.coordinateSetSha256,
        c01InterfaceSha256: loadingInterface.interfaceCellSet.coordinateSetSha256,
      },
    ),
    influence: domainRecord(
      d02Influence,
      'Known D02 interaction proposal plus the exact ROAD-LOW-001 24-cell no-build preservation reservation.',
      'SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_HYDRAULIC_STRUCTURAL_OR_GEOTECHNICAL_KERNEL',
      { roadLow001NoBuildSha256: d02NoBuildManifest.coordinateSetSha256 },
    ),
  },
  'D06-RESERVATIONS': {
    construction: domainRecord(
      d06ReservationConstruction,
      'Canonical union of the exact D06 source references except the explicit B07 interaction-union reference; duplicates merge by coordinate.',
      'RESERVATION_AND_CAP_CONSTRUCTION_DOMAIN_PROPOSAL_NOT_PHYSICAL_CONSTRUCTION_TARGETS',
      { exactReferenceCount: 73, excludedInteractionOnlyReferenceCount: 1 },
    ),
    interaction: domainRecord(
      d06ReservationInteraction,
      'Canonical coordinate union of all 73 independently reproduced D06 reservation references, including the selected B07 interaction union.',
      'SOURCE_REFERENCE_INTERACTION_PROPOSAL_DUPLICATES_MERGED_NO_FUNCTIONAL_CREDIT',
      { exactReferenceCount: 73 },
    ),
    influence: domainRecord(
      d06ReservationInfluence,
      'The exact 73-reference interaction union reused as the strongest source-limited influence reservation; no cell margin is added.',
      'SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_LIFE_SAFETY_SMOKE_FIRE_LIFT_POWER_OR_DRAINAGE_KERNEL',
      { exactReferenceCount: 73, addedUnevidencedMarginCellCount: 0 },
    ),
  },
  'D06-MECHANISMS': {
    construction: domainRecord(
      d06MechanismConstruction,
      'Canonical union of all 31 exact detailed proposal layers before functional precedence; every raw layer identity is independently reproduced.',
      'DETAILED_FUNCTIONAL_CONSTRUCTION_DOMAIN_PROPOSAL_NOT_ACCEPTED_MECHANISM_OR_BUILD_TARGET',
      { detailedSetoutManifestSha256: detailed.deterministicSetoutContract.setoutManifestSha256 },
    ),
    influence: domainRecord(
      d06MechanismInfluence,
      'The exact detailed proposal union reused as the strongest source-limited influence reservation; no expert margin is added.',
      'SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_SMOKE_FIRE_LIFT_VENT_DRAINAGE_LIGHTING_OR_POWER_KERNEL',
      { addedUnevidencedMarginCellCount: 0 },
    ),
  },
};

const geometricallyClosedDomains = Object.entries(proposalDomains).flatMap(
  ([scopeId, domains]) => Object.keys(domains).map((domain) => ({ scopeId, domain })),
);
invariant(geometricallyClosedDomains.length === 8, 'expected exactly eight geometry-domain proposals');

const genuineExternalHolds = [
  {
    id: 'CLS-H01-COMPLETE-SAME-MOMENT-SAVE',
    status: 'HOLD_EXTERNAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'A same-moment save containing region, entities, poi, level.dat, and an ordered capture manifest, followed by entity/POI/block-entity/fluid/generated-start clearance against every final influence set.',
  },
  {
    id: 'CLS-H02-D02-HYDRAULIC-STORAGE-RECEIVER-AND-OUTFALL',
    status: 'HOLD_EXTERNAL_TECHNICAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'Accepted source/future fluid accounting, catchments, peak storage/freeboard, recovery, pump/control states, receiver, outfall, and directional flow interfaces.',
  },
  {
    id: 'CLS-H03-STRUCTURAL-GEOTECHNICAL-AND-MATERIAL-DESIGN',
    status: 'HOLD_EXTERNAL_TECHNICAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'Accepted loads, lining/support, foundations, penetrations, geotechnical margins, material/future states, quantities, and construction method.',
  },
  {
    id: 'CLS-H04-D06-LIFE-SAFETY-FUNCTIONAL-ENGINEERING',
    status: 'HOLD_EXTERNAL_TECHNICAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'Accepted egress endpoints, lift/stair behavior, smoke model, ventilation mode/capacity, barriers, fire-service access, controls, failure logic, and emergency-service review.',
  },
  {
    id: 'CLS-H05-POWER-DRAINAGE-RECEIVERS-AND-COMMISSIONING',
    status: 'HOLD_EXTERNAL_TECHNICAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'Before R00, accept independent sources, loads, circuits, drainage hydraulics/receiver, mechanism design states, all 29 commissioning test methods and pass criteria, and common-cause analysis. Actual commissioning results are post-build G17/G19 evidence and cannot close G02.',
  },
  {
    id: 'CLS-H06-OWNER-INTERFACE-AND-IMMUTABLE-TECHNICAL-ACCEPTANCE',
    status: 'HOLD_ACCEPTANCE_AFTER_TECHNICAL_EVIDENCE',
    exactProposalDomain: null,
    requirement: 'Final one-owner cell assignments, direction-specific interfaces, independent technical review, and sole-owner acceptance of one immutable technical identity.',
  },
];

const payloadForIdentity = {
  immutableSnapshot: regionEvidence.selectedRegionOnlyEvidence.identity,
  sourceBindings,
  proposalDomains,
  referenceUnionAudit: {
    exactReferenceCount: 73,
    reproducedReferenceCount: reproducedReferences.length,
    rawMembershipCount: rawReservationMembershipCount,
    uniqueInteractionCellCount: d06ReservationInteraction.length,
    duplicateCoordinateCount: duplicateReservationCoordinateCount,
  },
  detailedLayerAudit: {
    layerCount: rawLayers.size,
    rawMembershipCount: [...rawLayers.values()].reduce((sum, cells) => sum + cells.length, 0),
    uniqueProposalCellCount: d06MechanismConstruction.length,
    sourceSetoutManifestSha256: detailed.deterministicSetoutContract.setoutManifestSha256,
  },
  geometricallyClosedDomains,
  genuineExternalHolds,
};
const canonicalPayloadSha256 = sha256(
  `${OUTPUT_PAYLOAD_PREAMBLE}\n${canonicalJson(payloadForIdentity)}\n`,
);

const report = {
  schemaVersion: 1,
  id: 'COMBINED-ZONES-PHASE1-CIVIL-LIFE-SAFETY-DOMAIN-CLOSURE-V1',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EIGHT_SOURCE_LIMITED_PROPOSAL_DOMAINS_EXACT_ALL_FUNCTIONAL_AND_RELEASE_GATES_HOLD',
  purpose: 'Replace eight geometry-null G03 proposal domains with exact source-limited unions while retaining every technical, functional, complete-save, ownership, acceptance, commissioning, and release HOLD.',
  immutableSnapshot: regionEvidence.selectedRegionOnlyEvidence.identity,
  sourceBindings,
  proposalDomains,
  referenceUnionAudit: payloadForIdentity.referenceUnionAudit,
  detailedLayerAudit: payloadForIdentity.detailedLayerAudit,
  closureAccounting: {
    requestedDomainCount: 8,
    exactSourceLimitedProposalDomainCount: 8,
    geometryNullDomainCountAfterThisCompiler: 0,
    expertInfluenceKernelAcceptedCount: 0,
    acceptedPhysicalSystemCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    operationCellCount: 0,
    geometricallyClosedDomains,
  },
  genuineExternalHolds,
  authorityBoundary: {
    reservationGeometryIsConstructionAcceptance: false,
    sourceLimitedInfluenceReservationIsExpertInfluenceKernel: false,
    receiverInferred: false,
    flowInferred: false,
    powerSourceInferred: false,
    functionalStateInferred: false,
    expertMarginInferred: false,
    technicalAcceptanceClaimed: false,
    ownerAcceptanceClaimed: false,
    commissioningClaimed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureCellCount: 0,
    physicalBuildAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
  canonicalPayloadSha256,
};

const domainRows = geometricallyClosedDomains.map(({ scopeId, domain }) => {
  const item = proposalDomains[scopeId][domain];
  return `| ${scopeId} | ${domain} | ${item.cellCount.toLocaleString('en-US')} | \`${item.coordinateSetSha256}\` | ${item.semantics} |`;
}).join('\n');
const holdRows = genuineExternalHolds.map((hold) => (
  `| ${hold.id} | ${hold.status} | ${hold.requirement} |`
)).join('\n');
const markdown = `# Combined Zones civil/life-safety proposal-domain closure\n\n`
  + `Status: **${report.status}**\n`
  + `Generated: \`${GENERATED_AT}\`\n`
  + `Payload SHA-256: \`${canonicalPayloadSha256}\`\n\n`
  + `## Result\n\n`
  + `Eight previously null geometry domains now have exact, deterministic, source-limited proposal unions. This is geometry closure only. Reservation geometry is not accepted construction, and a source-limited influence reservation is not an expert hydraulic, structural, geotechnical, smoke, fire, lift, ventilation, drainage, lighting, or power influence kernel.\n\n`
  + `| Scope | Domain | Cells | Coordinate SHA-256 | Meaning |\n|---|---|---:|---|---|\n`
  + `${domainRows}\n\n`
  + `The D06 reservation compiler independently reproduced all 73 references before merging duplicates. Raw membership is ${rawReservationMembershipCount.toLocaleString('en-US')}; the interaction union contains ${d06ReservationInteraction.length.toLocaleString('en-US')} unique cells and ${duplicateReservationCoordinateCount.toLocaleString('en-US')} coordinates occur in more than one source reference. The D06 mechanism compiler independently reproduced all ${rawLayers.size} detailed layers and their ${d06MechanismConstruction.length.toLocaleString('en-US')}-cell union.\n\n`
  + `## Genuine external HOLDs\n\n`
  + `| ID | Status | Required evidence |\n|---|---|---|\n${holdRows}\n\n`
  + `## Safety boundary\n\n`
  + `Accepted construction, material, future-state, mechanism, expert-influence, receiver, commissioning, and operation counts remain zero. No live service, Minecraft world, RCON endpoint, database, systemd unit, or deployment target was contacted.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  canonicalPayloadSha256,
  exactSourceLimitedProposalDomainCount: 8,
  genuineExternalHoldCount: genuineExternalHolds.length,
  operationCellCount: 0,
}, null, 2));
