/**
 * Shared derivation and packaging helpers for Combined Zones physical
 * releases (T01 support library).
 *
 * The geometry functions are faithful copies of the proven implementations in
 * compile_combined_zones_g03_canonical_setout.mjs and the Anvil reader from
 * compile_combined_zones_r01_ga_j1_discovery_cue_pilot.mjs. They are copied,
 * not imported, so the byte-compare-tested originals stay untouched; every
 * derived set must be verified against the committed G03 identity hashes
 * before use, which makes silent copy drift impossible.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

export const STANDARD_CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
export const D06_CELL_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
export const CIVIL_CELL_PREAMBLE = 'combined-zones-civil-life-safety-domain-closure-cell-set-v1';

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
export const compareCells = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;

export function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

export function hashCells(cells, preamble = STANDARD_CELL_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

export function boundsOf(cells) {
  const bounds = {
    minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity,
  };
  for (const cell of cells) {
    bounds.minX = Math.min(bounds.minX, cell.x);
    bounds.maxX = Math.max(bounds.maxX, cell.x);
    bounds.minY = Math.min(bounds.minY, cell.y);
    bounds.maxY = Math.max(bounds.maxY, cell.y);
    bounds.minZ = Math.min(bounds.minZ, cell.z);
    bounds.maxZ = Math.max(bounds.maxZ, cell.z);
  }
  return bounds;
}

export function rasterLine(from, to) {
  let x = from.x;
  let z = from.z;
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  const sx = from.x < to.x ? 1 : -1;
  const sz = from.z < to.z ? 1 : -1;
  let error = dx - dz;
  const points = [];
  for (;;) {
    points.push({ x, z });
    if (x === to.x && z === to.z) break;
    const doubled = 2 * error;
    if (doubled > -dz) {
      error -= dz;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      z += sz;
    }
  }
  return points;
}

/**
 * Re-derive the accepted 299-station Grand Avenue centerline profile and
 * verify it against the accepted centerline identity before returning it.
 */
export function deriveB11Profile(acceptedGrandAvenue) {
  const plan = rasterLine(acceptedGrandAvenue.start, acceptedGrandAvenue.end);
  const profile = plan.map((point, station) => ({
    station,
    x: point.x,
    y: 68 + Math.round((4 * station) / (plan.length - 1)),
    z: point.z,
  }));
  const orderedManifest = `${profile.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;
  if (profile.length !== acceptedGrandAvenue.centerlinePointCount) {
    throw new Error('B11 profile point-count drift against accepted centerline');
  }
  if (sha256(orderedManifest) !== acceptedGrandAvenue.centerlineSha256) {
    throw new Error('B11 profile coordinate identity drift against accepted centerline');
  }
  return profile;
}

/** Expand the profile into the exact eight-wide construction cells with the
 * originating station and Z-offset retained for material mapping. */
export function deriveB11ConstructionCells(profile) {
  const cells = [];
  for (const point of profile) {
    for (let dz = -3; dz <= 4; dz += 1) {
      cells.push({
        x: point.x, y: point.y, z: point.z + dz, station: point.station, zOffset: dz,
      });
    }
  }
  return cells;
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`Unsupported Anvil compression type ${type}`);
}

function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
  if (input && typeof input === 'object' && 'high' in input) {
    return (BigInt(input.high | 0) << 32n) | BigInt(input.low >>> 0);
  }
  return BigInt(input);
}

function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((longToBig(values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}

export class AnvilReader {
  constructor(directory) {
    this.directory = directory;
    this.regions = new Map();
    this.chunks = new Map();
  }

  region(rx, rz) {
    const id = `${rx},${rz}`;
    if (!this.regions.has(id)) {
      const file = path.join(this.directory, `r.${rx}.${rz}.mca`);
      this.regions.set(id, fs.existsSync(file) ? fs.readFileSync(file) : null);
    }
    return this.regions.get(id);
  }

  async chunk(cx, cz) {
    const id = `${cx},${cz}`;
    if (this.chunks.has(id)) return this.chunks.get(id);
    const region = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!region) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const offsetSectors = region.readUIntBE(index, 3);
    const sectorCount = region[index + 3];
    if (!offsetSectors || !sectorCount) return null;
    const offset = offsetSectors * 4096;
    const size = region.readUInt32BE(offset);
    const compression = region.readUInt8(offset + 4);
    const compressed = region.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const result = nbt.simplify(parsed);
    this.chunks.set(id, result);
    return result;
  }

  async blockState(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const section = chunk?.sections?.find(({ Y }) => Number(Y) === Math.floor(y / 16));
    const states = section?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const bits = Math.max(4, Math.ceil(Math.log2(states.palette.length)));
    return states.palette[packedValue(states.data, bits, index)] ?? { Name: 'minecraft:air' };
  }
}

/** Render an Anvil block-state object as a guarded-op command state string. */
export function stateToCommandString(state) {
  if (!state || !state.Name) return 'minecraft:air';
  const properties = state.Properties && Object.keys(state.Properties).length
    ? `[${Object.keys(state.Properties).sort()
      .map((name) => `${name}=${state.Properties[name]}`).join(',')}]`
    : '';
  return `${state.Name}${properties}`;
}

/** One per-cell REPL guarded operation line. */
export function replLine(cell, fromState, toState) {
  return `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${fromState} ${toState}`;
}

/* ------------------------------------------------------------------------ *
 * D06 (Empty Eight deep shell) derivation support for CZ-R02.
 *
 * The functions below are faithful copies of the proven derivations in
 * compile_combined_zones_civil_life_safety_domain_closure.mjs (73-reference
 * D06-RESERVATIONS reproduction) and
 * compile_combined_zones_g03_canonical_setout.mjs buildD06DetailedSetout()
 * (31-layer D06-MECHANISMS reproduction). Every derived set is verified
 * against its committed identity before use, so silent copy drift fails
 * closed instead of compiling.
 * ------------------------------------------------------------------------ */

function d06Invariant(condition, message) {
  if (!condition) throw new Error(`D06 derivation rejected: ${message}`);
}

/** Inclusive integer bounds expansion (copy of the G03/civil-closure cellsIn). */
export function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

export function unionCells(...sets) {
  return uniqueCells(sets.flat());
}

export function differenceCells(left, right) {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
}

export function intersectionCells(left, right) {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
}

/** Preamble-free coordinate hash used by the Empty Eight source manifests. */
export function rawCoordinateHash(cells) {
  return sha256(uniqueCells(cells).map(cellKey).join('\n'));
}

export function resolveJsonPointer(document, pointer) {
  d06Invariant(typeof pointer === 'string' && pointer.startsWith('/'),
    `invalid JSON pointer ${pointer}`);
  return pointer.slice(1).split('/').reduce((current, encoded) => {
    const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    d06Invariant(current !== null && current !== undefined
      && Object.prototype.hasOwnProperty.call(current, key), `missing JSON pointer ${pointer}`);
    return current[key];
  }, document);
}

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

/** Reproduce and verify the selected B07-C-WEST-2 dogleg from its anchors. */
export function deriveB07WestTwo(b07System) {
  const { top, observationLanding: observation, lowerLobby: lower } = b07System.anchors;
  const shiftedX = observation.x - 2;
  const construction = unionCells(
    cellsIn({
      minX: top.x - 3, maxX: top.x + 3, minY: observation.y, maxY: top.y,
      minZ: top.z - 3, maxZ: top.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: observation.x + 3, minY: observation.y - 3,
      maxY: observation.y + 3, minZ: observation.z - 3, maxZ: observation.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: shiftedX + 3, minY: observation.y - 3,
      maxY: observation.y + 3, minZ: lower.z - 3, maxZ: observation.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: shiftedX + 3, minY: lower.y, maxY: observation.y,
      minZ: lower.z - 3, maxZ: lower.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: lower.x + 3, minY: lower.y - 3, maxY: lower.y + 3,
      minZ: lower.z - 3, maxZ: lower.z + 3,
    }),
  );
  const interaction = cubeDilateOne(construction);
  d06Invariant(hashCells(construction, D06_CELL_PREAMBLE)
    === b07System.exactExcavationReservation.coordinateSetSha256,
  'B07 excavation identity drift');
  d06Invariant(hashCells(interaction, D06_CELL_PREAMBLE)
    === b07System.exactInteractionUnion.coordinateSetSha256,
  'B07 interaction identity drift');
  return { construction, interaction };
}

/**
 * Reproduce the exact P1-B08 service-tunnel excavation reservation from the
 * inline centerline (faithful copy of G03 buildB08): each centerline point
 * expands per orientation into a 6-wide (lateral -2..3) by 6-tall
 * (vertical -1..4) section. The caller must verify the returned set against
 * the committed G03 identity before use.
 */
export function deriveB08ServiceTunnelConstruction(connectorsDoc) {
  const excavation = [];
  for (const point of connectorsDoc.serviceTunnelCenterline.centerline.points) {
    for (const orientation of point.orientations) {
      for (let lateral = -2; lateral <= 3; lateral += 1) {
        for (let vertical = -1; vertical <= 4; vertical += 1) {
          excavation.push(orientation === 'x'
            ? { x: point.x, y: point.y + vertical, z: point.z + lateral }
            : { x: point.x + lateral, y: point.y + vertical, z: point.z });
        }
      }
    }
  }
  return uniqueCells(excavation);
}

/**
 * Independently reproduce all 73 exact D06 reservation references from the
 * ledger in phase1-d06-mechanisms.json, each verified against its source
 * manifest and the ledger identity (count, bounds, coordinate hash).
 *
 * `lifeSafetyPath` / `emptyEightPath` are the repo-relative paths the ledger
 * uses as sourcePath discriminators.
 */
export function deriveD06ReservationReferences({
  mechanismsPayload, lifeSafetyDoc, emptyEightDoc, lifeSafetyPath, emptyEightPath,
}) {
  const payload = mechanismsPayload;
  const ledger = payload.exactReservationReferenceContract.references;
  d06Invariant(ledger.length === 73
    && payload.exactReservationReferenceContract.allPassed === true,
  'D06 73-reference contract drift');
  const b07 = deriveB07WestTwo(payload.b07WestTwoSystem);

  function referenceCells(reference) {
    const logical = reference.logicalPath;
    if (reference.cellCount === 0 && reference.bounds === null) return [];
    if (logical === 'b07WestTwo/excavationReservation') return b07.construction;
    if (logical === 'b07WestTwo/interactionUnion') return b07.interaction;
    if (logical === 'smokeVentilationAndBarriers/localVentUnion') {
      return unionCells(...payload.ventSystems.map(({ exactRiserReservation }) => (
        cellsIn(exactRiserReservation.bounds)
      )));
    }
    const platformMatch = logical
      .match(/platformBarriers\/(\d+)\/(retainedClosedBarrierReservation|staticGateBayCap)$/);
    if (platformMatch) {
      const platform = payload.smokeAndBarrierSystems.platformBarriers[Number(platformMatch[1])];
      const z = platform.staticGateBayCap.bounds.minZ;
      const gates = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
        minX, maxX: minX + 2, minY: 42, maxY: 43, minZ: z, maxZ: z,
      }));
      if (platformMatch[2] === 'staticGateBayCap') return gates;
      return differenceCells(cellsIn(platform.retainedClosedBarrierReservation.bounds), gates);
    }
    const smokeMatch = logical
      .match(/smokeBoundaries\/(\d+)\/(retainedBoundaryPlane|staticOpeningCaps)$/);
    if (smokeMatch) {
      const boundary = payload.smokeAndBarrierSystems.smokeBoundaries[Number(smokeMatch[1])];
      const z = boundary.staticOpeningCaps.bounds.minZ;
      const openings = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
        minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: z, maxZ: z,
      }));
      if (smokeMatch[2] === 'staticOpeningCaps') return openings;
      return differenceCells(cellsIn(boundary.retainedBoundaryPlane.bounds), openings);
    }
    const fixtureMatch = logical.match(/fixtureReservations\/(\d+)\/reservation$/);
    if (fixtureMatch) {
      const z = payload.lightingAndPowerSystem.exactFixtureReservations[
        Number(fixtureMatch[1])
      ].reservation.bounds.minZ;
      return [1660, 1676, 1692, 1708, 1724, 1740, 1748].map((x) => ({ x, y: 46, z }));
    }
    if (logical === 'cappedDrainage/capUnion') {
      return unionCells(...payload.cappedDrainageSystem.localCaps
        .map(({ cap }) => cellsIn(cap.bounds)));
    }
    return cellsIn(reference.bounds);
  }

  const sourceDocuments = new Map([
    [lifeSafetyPath, lifeSafetyDoc],
    [emptyEightPath, emptyEightDoc],
  ]);
  return ledger.map((reference) => {
    const source = sourceDocuments.get(reference.sourcePath);
    d06Invariant(source, `unsupported D06 source ${reference.sourcePath}`);
    const sourceManifest = resolveJsonPointer(source, reference.jsonPointer);
    const cells = referenceCells(reference);
    const expectedHash = sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256;
    const actualHash = reference.sourcePath === emptyEightPath
      ? rawCoordinateHash(cells)
      : hashCells(cells, D06_CELL_PREAMBLE);
    d06Invariant(cells.length === reference.cellCount,
      `${reference.logicalPath} cell-count drift`);
    d06Invariant(JSON.stringify(cells.length ? boundsOf(cells) : null)
      === JSON.stringify(reference.bounds),
    `${reference.logicalPath} bounds drift`);
    d06Invariant(actualHash === expectedHash && actualHash === reference.coordinateSetSha256,
      `${reference.logicalPath} coordinate identity drift`);
    return { reference, cells };
  });
}

/**
 * The exact D06-RESERVATIONS construction-domain proposal: canonical union of
 * the reproduced source references except the explicit B07 interaction-union
 * reference; duplicates merge by coordinate.
 */
export function deriveD06ReservationConstruction(reproducedReferences) {
  return unionCells(...reproducedReferences
    .filter(({ reference }) => reference.logicalPath !== 'b07WestTwo/interactionUnion')
    .map(({ cells }) => cells));
}

/**
 * Reproduce the 31 exact D06 detailed mechanism proposal layers and their
 * canonical union (faithful copy of G03 buildD06DetailedSetout), each layer
 * verified against the committed detailed-setout raw-proposal identity.
 * Returns { layers: Map(layerId -> cells), proposalUnion }.
 */
export function deriveD06DetailedMechanismLayers(mechanismsPayload, emptyEightDoc, detailedDoc) {
  const payload = mechanismsPayload;
  const layers = new Map();
  const add = (id, cells) => {
    d06Invariant(!layers.has(id), `duplicate D06 detailed layer ${id}`);
    const exact = uniqueCells(cells);
    const source = detailedDoc.exactDetailedProposalLayers.proposalLayers[id]
      ?.rawProposalCellSet;
    d06Invariant(source, `D06 detailed source layer ${id} missing`);
    d06Invariant(exact.length === source.cellCount, `D06 detailed ${id} count drift`);
    d06Invariant(JSON.stringify(boundsOf(exact)) === JSON.stringify(source.bounds),
      `D06 detailed ${id} bounds drift`);
    d06Invariant(hashCells(exact, D06_CELL_PREAMBLE) === source.coordinateSetSha256,
      `D06 detailed ${id} hash drift`);
    layers.set(id, exact);
  };

  for (const system of payload.protectedEgressAndLiftSystems) {
    const prefix = system.coreId.toLowerCase().replace('-', '');
    const stair = cellsIn(system.protectedStairReservation.bounds);
    const lift = cellsIn(system.accessibleLiftReservation.bounds);
    const bottom = cellsIn({
      ...system.combinedProtectedCoreReservation.bounds,
      maxY: system.combinedProtectedCoreReservation.bounds.minY,
    });
    const transfer = unionCells(
      bottom,
      cellsIn(system.roofTransitionCap.bounds),
      cellsIn(system.surfaceOutletCap.bounds),
    );
    const stairBounds = system.protectedStairReservation.bounds;
    const liftBounds = system.accessibleLiftReservation.bounds;
    const stairEquipmentCaps = unionCells(
      cellsIn({ ...stairBounds, maxY: stairBounds.minY }),
      cellsIn({ ...stairBounds, minY: stairBounds.maxY }),
    );
    const liftEquipmentCaps = unionCells(
      cellsIn({ ...liftBounds, maxY: liftBounds.minY }),
      cellsIn({ ...liftBounds, minY: liftBounds.maxY }),
    );
    add(`${prefix}TransferLandings`, transfer);
    add(`${prefix}LiftEquipmentCaps`, liftEquipmentCaps);
    add(`${prefix}StairEquipmentCaps`, stairEquipmentCaps);
    add(`${prefix}LiftEnvelope`, lift);
    add(`${prefix}StairEnvelope`, stair);
  }

  const ventDucts = [];
  const ventFans = [];
  const ventOutlets = [];
  for (const system of payload.ventSystems) {
    const bounds = system.exactRiserReservation.bounds;
    const riser = cellsIn(bounds);
    const fan = cellsIn({ ...bounds, maxY: bounds.minY });
    const outlet = cellsIn({ ...bounds, minY: bounds.maxY });
    ventFans.push(...fan);
    ventOutlets.push(...outlet);
    ventDucts.push(...differenceCells(riser, unionCells(fan, outlet)));
  }
  add('ventFanEquipmentBays', ventFans);
  add('ventOutletCaps', ventOutlets);
  add('ventDuctEnvelopes', ventDucts);

  const smokeDoorBays = payload.smokeAndBarrierSystems.smokeBoundaries.flatMap((boundary) => (
    [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 49,
      maxY: 51,
      minZ: boundary.staticOpeningCaps.bounds.minZ,
      maxZ: boundary.staticOpeningCaps.bounds.maxZ,
    }))
  ));
  const platformGateBays = payload.smokeAndBarrierSystems.platformBarriers.flatMap((barrier) => (
    [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 42,
      maxY: 43,
      minZ: barrier.staticGateBayCap.bounds.minZ,
      maxZ: barrier.staticGateBayCap.bounds.minZ,
    }))
  ));
  add('smokeDoorMechanismBays', smokeDoorBays);
  add('platformGateMechanismBays', platformGateBays);

  const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
  const fixtureZ = [];
  const fixtureCells = [];
  for (const fixture of payload.lightingAndPowerSystem.exactFixtureReservations) {
    const z = fixture.reservation.bounds.minZ;
    fixtureZ.push(z);
    fixtureCells.push(...fixtureX.map((x) => ({ x, y: 46, z })));
  }
  add('lightingFixtureReservations', fixtureCells);

  const circuit = (id, y) => {
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
      minX: 1754, maxX: 1756, minY: y, maxY: y, minZ: 156, maxZ: 158,
    });
    const approach = unionCells(
      cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 154, maxZ: 157 }),
      cellsIn({ minX: 1751, maxX: 1753, minY: y, maxY: y, minZ: 157, maxZ: 157 }),
    );
    add(`${id}Carrier`, unionCells(trunk, branches, approach));
    add(`${id}Equipment`, equipment);
  };
  circuit('normalCircuit', 44);
  circuit('emergencyCircuitA', 45);
  circuit('emergencyCircuitB', 47);

  const localDrainCaps = [];
  const localSumpPumpBays = [];
  for (const item of payload.cappedDrainageSystem.localCaps) {
    localDrainCaps.push(...cellsIn(item.cap.bounds));
    localSumpPumpBays.push(...cellsIn({
      minX: item.cap.bounds.minX - 1,
      maxX: item.cap.bounds.maxX + 1,
      minY: item.cap.bounds.minY + 1,
      maxY: item.cap.bounds.maxY + 1,
      minZ: item.cap.bounds.minZ,
      maxZ: item.cap.bounds.maxZ,
    }));
  }
  add('localDrainageInterfaceCaps', localDrainCaps);
  add('localSumpPumpEquipmentBays', localSumpPumpBays);
  add('unconnectedDrainHeaderReservation',
    cellsIn(payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation.bounds));
  add('externalDrainBoundaryCap',
    cellsIn(payload.cappedDrainageSystem.retainedExternalBoundaryCap.bounds));

  const fire = payload.fireServiceSystem;
  add('fireServiceControlPanels', emptyEightDoc.d06.platforms.map(({ trackCenterlineZ }) => ({
    x: 1846, y: 52, z: trackCenterlineZ,
  })));
  add('fireServiceInterfaceCap', cellsIn(fire.normallyClosedSpineInterfaceCap.bounds));
  add('fireSurfaceApproachCap', cellsIn(fire.sealedSurfaceApproachInterface.bounds));
  add('fireSurfaceCompoundReservation', cellsIn(fire.surfaceCompoundReservation.bounds));
  add('fireServiceSpineReservation', cellsIn(fire.internalSpineReservation.bounds));

  const sourcePriority = detailedDoc.deterministicSetoutContract.priority;
  d06Invariant(layers.size === sourcePriority.length
    && sourcePriority.every((id) => layers.has(id)),
  'D06 detailed layer reproduction does not cover source priority exactly');
  const rawMembershipCount = [...layers.values()].reduce((sum, cells) => sum + cells.length, 0);
  d06Invariant(rawMembershipCount
    === detailedDoc.exactDetailedProposalLayers.rawProposalMembershipCount,
  'D06 detailed raw membership count drift');
  const proposalUnion = unionCells(...sourcePriority.map((id) => layers.get(id)));
  const unionSource = detailedDoc.crossScopeAudit.d06DetailedProposalUnion;
  d06Invariant(proposalUnion.length === unionSource.cellCount, 'D06 detailed union count drift');
  d06Invariant(JSON.stringify(boundsOf(proposalUnion)) === JSON.stringify(unionSource.bounds),
    'D06 detailed union bounds drift');
  d06Invariant(hashCells(proposalUnion, D06_CELL_PREAMBLE) === unionSource.coordinateSetSha256,
    'D06 detailed union hash drift');
  return { layers, proposalUnion };
}

/**
 * Adjudicate the 242 duplicate coordinates across the 31 raw layers into a
 * single canonical owning layer per cell using the frozen explicit priority
 * list (highest first — never last-writer-wins). Every canonical per-layer
 * set is verified against the committed canonicalProposalCellSetAfterPrecedence
 * identity, and all committed precedence records are reproduced exactly.
 * Returns Map(cellKey -> layerId) covering the whole canonical union.
 */
export function assignD06CanonicalLayers(layers, detailedDoc) {
  const priority = detailedDoc.deterministicSetoutContract.priority;
  const claimed = new Set();
  const owner = new Map();
  const canonicalByLayer = new Map();
  let canonicalTotal = 0;
  for (const id of priority) {
    const canonical = layers.get(id).filter((cell) => !claimed.has(cellKey(cell)));
    for (const cell of canonical) {
      claimed.add(cellKey(cell));
      owner.set(cellKey(cell), id);
    }
    canonicalByLayer.set(id, canonical);
    canonicalTotal += canonical.length;
    const source = detailedDoc.exactDetailedProposalLayers.proposalLayers[id]
      .canonicalProposalCellSetAfterPrecedence;
    d06Invariant(canonical.length === source.cellCount,
      `D06 canonical ${id} count drift ${canonical.length} != ${source.cellCount}`);
    d06Invariant(JSON.stringify(canonical.length ? boundsOf(canonical) : null)
      === JSON.stringify(source.bounds),
    `D06 canonical ${id} bounds drift`);
    d06Invariant(hashCells(canonical, D06_CELL_PREAMBLE) === source.coordinateSetSha256,
      `D06 canonical ${id} hash drift`);
  }
  d06Invariant(canonicalTotal
    === detailedDoc.exactDetailedProposalLayers.canonicalProposalCellCountAfterPrecedence,
  'D06 canonical total count drift');
  const audit = detailedDoc.internalDuplicateAndPrecedenceAudit;
  for (const record of audit.precedenceRecords) {
    const conflict = intersectionCells(
      canonicalByLayer.get(record.winningLayerId),
      layers.get(record.yieldingLayerId),
    );
    d06Invariant(priority.indexOf(record.winningLayerId)
      < priority.indexOf(record.yieldingLayerId),
    `precedence record ${record.precedenceId} contradicts the frozen priority order`);
    d06Invariant(conflict.length === record.exactConflictCellSet.cellCount
      && hashCells(conflict, D06_CELL_PREAMBLE)
        === record.exactConflictCellSet.coordinateSetSha256,
    `precedence record ${record.precedenceId} conflict-set drift`);
  }
  return owner;
}
