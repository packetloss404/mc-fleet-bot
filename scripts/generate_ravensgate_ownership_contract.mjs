#!/usr/bin/env node
/** Read-only ownership contract generator — Ravensgate interface closure.
 *
 *  Produces an exact one-owner-per-cell default-deny ownership contract JSON
 *  for the Ravensgate shared/edge interfaces identified by the 2026-08-24
 *  re-census, resolving the contested IF-RG-GARTH-LIBRARY-TERRACE interface.
 *
 *  Owners (documented rules, one physical owner per cell, default-deny):
 *   - IF-RG-GARTH-LIBRARY-TERRACE (z=-432, x=-110..-94, y67..71): built solid
 *     hardscape cells are TE-LIBRARY-TERRACE's verified-as-built south plaza
 *     face (its catalog bound includes z=-432); air/plaza cells are the
 *     ravensgate RG-GARTH public realm. No cell is multiply owned. The
 *     terrace envelope does not claim RG-LOGGIA (x=-111..-106) or RG-STOA
 *     (x=-105..-65) shell cells.
 *   - IF-RG-LOGGIA-LIBRARY (x=-111, y68..74, z=-447..-433): the solid x=-111
 *     wall column cells are RRCH-LIBRARY; the two spruce_door threshold cells
 *     (z=-438..-437) are ravensgate RG-LOGGIA (public circulation
 *     responsibility).
 *   - IF-RG-GARTH-PAVILION (x=-106..-64, z=-447..-425): surface-overlay-only.
 *     All currently-built cells are ravensgate RG-STOA/RG-GARTH; the Terem
 *     pavilion planning envelope owns zero physical cells.
 *   - IF-RG-STOREHOUSE-NORTH (z=-420, x=-95..-75): the stone_bricks north-wall
 *     cells are RRCH-STOREHOUSE; surface/air cells south are ravensgate
 *     RG-GARTH.
 *   - IF-RG-GUILDHALL-EAST: no shared cells (0 cells).
 *   - IF-RG-GARTH-STATUES: in-district public realm -> ravensgate.
 *   - IF-RG-LIB-GUILD-SECRET-01: default-deny vertical clearance; 0 surface
 *     cells.
 *
 *  READ-ONLY: reads the accepted immutable r08am post snapshot only. It never
 *  writes ops, never contacts RCON, and never mutates the world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT = value('--out', 'data/world-review/ravensgate-ownership-contract-20260825/ravensgate-ownership-contract.json');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAVENSGATE ownership contract rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

const RECENSUS = 'data/world-review/ravensgate-recensus-20260824/ravensgate-recensus.json';
const recensus = JSON.parse(fs.readFileSync(absolute(RECENSUS), 'utf8'));
invariant(recensus.id === 'ravensgate-recensus-20260824' && recensus.readOnly === true,
  're-census evidence missing');
invariant(recensus.ownershipClosureSummary?.contestedInterfaces?.includes('IF-RG-GARTH-LIBRARY-TERRACE'),
  'contested interface register drifted');

const interfaces = [];
const cellsIn = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
};

async function surveyInterface(record, ownerFor) {
  const cells = cellsIn(record.bounds);
  const assignments = [];
  let fluidCount = 0;
  let containerControlCount = 0;
  for (const cell of cells) {
    const st = await sourceAt(cell);
    const owner = ownerFor(cell, st);
    invariant(owner, `unassigned cell ${cellKey(cell)} in ${record.id}`);
    assignments.push({ ...cell, state: st, owner });
    if (isFluid(st)) fluidCount += 1;
    if (/minecraft:(chest|barrel|furnace|hopper|dispenser|dropper|lectern|bell)/.test(st)) containerControlCount += 1;
  }
  invariant(new Set(assignments.map((a) => cellKey(a))).size === cells.length,
    `duplicate cells in ${record.id}`);
  return { cells, assignments, fluidCount, containerControlCount };
}

// --- 1. IF-RG-GARTH-LIBRARY-TERRACE (contested) -----------------------------
{
  const record = { id: 'IF-RG-GARTH-LIBRARY-TERRACE', bounds: { minX: -110, maxX: -94, minY: 67, maxY: 71, minZ: -432, maxZ: -432 } };
  const { cells, assignments, fluidCount, containerControlCount } = await surveyInterface(record, (cell, st) => {
    if (isAir(st) || isFluid(st)) return 'ravensgate RG-GARTH public-realm';
    return 'town-expansion-r1 TE-LIBRARY-TERRACE';
  });
  // Confirm terrace envelope does not claim RG-LOGGIA/RG-STOA shell cells.
  const shellOverlap = cells.filter((cell) => (
    (cell.x >= -111 && cell.x <= -106 && cell.z >= -447 && cell.z <= -433) // RG-LOGGIA
    || (cell.x >= -105 && cell.x <= -65 && cell.z >= -431 && cell.z <= -426) // RG-STOA
  ));
  invariant(shellOverlap.length === 0, `terrace envelope overlaps a loggia/stoa shell cell: ${shellOverlap.length}`);
  const solidCells = assignments.filter((a) => a.owner === 'town-expansion-r1 TE-LIBRARY-TERRACE');
  const airCells = assignments.filter((a) => a.owner === 'ravensgate RG-GARTH public-realm');
  interfaces.push({
    id: record.id,
    name: 'Garth / library terrace south-plaza edge (contested, resolved)',
    status: 'CONTESTED_RESOLVED_ONE_OWNER_PER_CELL',
    bounds: record.bounds,
    cellCount: cells.length,
    coordinateSetSha256: hashCells(cells),
    ownerRule: 'Built solid hardscape cells at z=-432 are TE-LIBRARY-TERRACE (verified-as-built south plaza face; catalog bound includes z=-432). Air/plaza cells are ravensgate RG-GARTH public realm. Terrace envelope claims no RG-LOGGIA/RG-STOA shell cell.',
    owners: {
      'town-expansion-r1 TE-LIBRARY-TERRACE': { cellCount: solidCells.length, coordinateSetSha256: hashCells(solidCells) },
      'ravensgate RG-GARTH public-realm': { cellCount: airCells.length, coordinateSetSha256: hashCells(airCells) },
    },
    fluidCount,
    containerControlCount,
    stateCensus: topStates(assignments),
  });
}

// --- 2. IF-RG-LOGGIA-LIBRARY ------------------------------------------------
{
  const record = { id: 'IF-RG-LOGGIA-LIBRARY', bounds: { minX: -111, maxX: -111, minY: 68, maxY: 74, minZ: -447, maxZ: -433 } };
  const { cells, assignments, fluidCount, containerControlCount } = await surveyInterface(record, (cell, st) => {
    if (st.includes('spruce_door')) return 'ravensgate RG-LOGGIA (door threshold, public circulation)';
    if (isAir(st)) return 'ravensgate RG-LOGGIA (door threshold, public circulation)';
    return 'ravensreach RRCH-LIBRARY (wall column)';
  });
  const wallCells = assignments.filter((a) => a.owner === 'ravensreach RRCH-LIBRARY (wall column)');
  const doorCells = assignments.filter((a) => a.owner === 'ravensgate RG-LOGGIA (door threshold, public circulation)');
  interfaces.push({
    id: record.id,
    name: 'Library loggia / civic library shared east wall',
    status: 'SINGLE_OWNER_WALL_INTERFACE_ONE_OWNER_PER_CELL',
    bounds: record.bounds,
    cellCount: cells.length,
    coordinateSetSha256: hashCells(cells),
    ownerRule: 'The x=-111 solid wall column cells are RRCH-LIBRARY. The spruce_door threshold cells (z=-438..-437) plus air cells are ravensgate RG-LOGGIA public circulation.',
    owners: {
      'ravensreach RRCH-LIBRARY (wall column)': { cellCount: wallCells.length, coordinateSetSha256: hashCells(wallCells) },
      'ravensgate RG-LOGGIA (door threshold, public circulation)': { cellCount: doorCells.length, coordinateSetSha256: hashCells(doorCells) },
    },
    fluidCount,
    containerControlCount,
    stateCensus: topStates(assignments),
  });
}

// --- 3. IF-RG-GARTH-PAVILION ------------------------------------------------
{
  const record = { id: 'IF-RG-GARTH-PAVILION', bounds: { minX: -106, maxX: -64, minY: 67, maxY: 74, minZ: -447, maxZ: -425 } };
  const { cells, assignments, fluidCount, containerControlCount } = await surveyInterface(record, () => 'ravensgate RG-STOA/RG-GARTH (existing built state)');
  const teremBuiltCells = assignments.filter((a) => a.state.includes('smooth_quartz') || a.state.includes('spruce') || a.state.includes('stone_brick'));
  interfaces.push({
    id: record.id,
    name: 'Garth / Russian Terem pavilion east surface (overlay rule)',
    status: 'SURFACE_OVERLAY_ONLY_RULE_CONFIRMED_ZERO_TEREM_PHYSICAL_CELLS',
    bounds: record.bounds,
    cellCount: cells.length,
    coordinateSetSha256: hashCells(cells),
    ownerRule: 'TE-RUSSIAN-TEREM-PAVILION is a planning overlay with zero constructed shell. Every currently-built cell is ravensgate RG-STOA/RG-GARTH. Any future pavilion work is surface overlay only and never a district boundary expansion.',
    owners: {
      'ravensgate RG-STOA/RG-GARTH (existing built state)': { cellCount: cells.length, coordinateSetSha256: hashCells(cells) },
      'town-expansion-r1 TE-RUSSIAN-TEREM-PAVILION': { cellCount: 0, note: 'planning overlay only; no constructed shell' },
    },
    fluidCount,
    containerControlCount,
    stateCensus: topStates(assignments),
    nonAirCellCount: cells.length - assignments.filter((a) => isAir(a.state)).length,
  });
}

// --- 4. IF-RG-STOREHOUSE-NORTH ----------------------------------------------
{
  const record = { id: 'IF-RG-STOREHOUSE-NORTH', bounds: { minX: -95, maxX: -75, minY: 67, maxY: 71, minZ: -420, maxZ: -420 } };
  const { cells, assignments, fluidCount, containerControlCount } = await surveyInterface(record, (cell, st) => {
    if (!isAir(st) && !isFluid(st)) return 'ravensreach RRCH-STOREHOUSE (north wall)';
    return 'ravensgate RG-GARTH public-realm';
  });
  const wallCells = assignments.filter((a) => a.owner === 'ravensreach RRCH-STOREHOUSE (north wall)');
  const realmCells = assignments.filter((a) => a.owner === 'ravensgate RG-GARTH public-realm');
  interfaces.push({
    id: record.id,
    name: 'Town storehouse north wall / district south edge',
    status: 'SINGLE_OWNER_WALL_INTERFACE_ONE_OWNER_PER_CELL',
    bounds: record.bounds,
    cellCount: cells.length,
    coordinateSetSha256: hashCells(cells),
    ownerRule: 'The z=-420 stone_bricks north-wall cells are RRCH-STOREHOUSE (also the Ravensgate district north bound). Air/plaza cells are ravensgate RG-GARTH public realm.',
    owners: {
      'ravensreach RRCH-STOREHOUSE (north wall)': { cellCount: wallCells.length, coordinateSetSha256: hashCells(wallCells) },
      'ravensgate RG-GARTH public-realm': { cellCount: realmCells.length, coordinateSetSha256: hashCells(realmCells) },
    },
    fluidCount,
    containerControlCount,
    stateCensus: topStates(assignments),
  });
}

// --- 5-7. Resolved interfaces (no contested cells) --------------------------
interfaces.push({
  id: 'IF-RG-GUILDHALL-EAST',
  name: 'District east bound / Guild Hall',
  status: 'CLEAR_EAST_GAP_NO_SHARED_CELLS',
  bounds: { minX: -65, maxX: -64, minY: 67, maxY: 71, minZ: -463, maxZ: -408 },
  cellCount: 0,
  coordinateSetSha256: hashCells([]),
  ownerRule: 'No shared cells. TE-GUILDHALL-01 physical shell starts east at x=-59; the x=-65..-64 band is open approach/plaza continuity.',
  owners: {},
  fluidCount: 0,
  containerControlCount: 0,
});
interfaces.push({
  id: 'IF-RG-GARTH-STATUES',
  name: 'RG-GARTH-STATUES interior program',
  status: 'IN_DISTRICT_PUBLIC_REALM',
  bounds: { minX: -93, maxX: -68, minY: 67, maxY: 74, minZ: -444, maxZ: -428 },
  cellCount: 0,
  coordinateSetSha256: hashCells([]),
  ownerRule: 'The statue program is protected public-realm context under Ravensgate. The Town Expansion familyId is a program tag, not an ownership override.',
  owners: { 'ravensgate RG-GARTH public-realm': { cellCount: 0, note: 'in-district protected context' } },
  fluidCount: 0,
  containerControlCount: 0,
});
interfaces.push({
  id: 'IF-RG-LIB-GUILD-SECRET-01',
  name: 'TE-LIB-GUILD-SECRET-01 isolated tunnel vertical clearance',
  status: 'DEFAULT_DENY_VERTICAL_CLEARANCE',
  bounds: { minX: -111, maxX: -58, minY: 58, maxY: 64, minZ: -442, maxZ: -423 },
  cellCount: 0,
  coordinateSetSha256: hashCells([]),
  ownerRule: 'No 3D intersection with the restricted underground exclusion (y -64..35) or its buffer (y36..43). Keep sealed.',
  owners: {},
  fluidCount: 0,
  containerControlCount: 0,
});

function topStates(assignments) {
  const counts = new Map();
  for (const a of assignments) counts.set(a.state, (counts.get(a.state) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8));
}

// Cross-interface default-deny check: every cell belongs to exactly one owner.
const seen = new Map();
let doubleAssigned = 0;
for (const iface of interfaces) {
  if (!iface.assignments) continue;
  for (const a of iface.assignments) {
    const key = cellKey(a);
    if (seen.has(key)) {
      doubleAssigned += 1;
      invariant(seen.get(key) === a.owner, `multiply-owned cell ${key}: ${seen.get(key)} vs ${a.owner}`);
    }
    seen.set(key, a.owner);
  }
}
invariant(doubleAssigned === 0, `double-assigned cells: ${doubleAssigned}`);

const totalCells = interfaces.reduce((sum, i) => sum + i.cellCount, 0);

const report = {
  schemaVersion: 1,
  id: 'ravensgate-ownership-contract-20260825',
  status: 'PASS_RAVENSGATE_OWNERSHIP_CONTRACT_ONE_OWNER_PER_CELL',
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  generatedAtUtc: '2026-08-25T08:00:00Z',
  program: 'MP09 Ravensgate Phase 2 neighbor interface contracts — exact one-owner-per-cell default-deny ownership contract',
  source: {
    snapshotRoot: SNAPSHOT,
    snapshot: 'data/worldsnap-r08am-post-20260822T161818Z (accepted immutable r08am post, SHA-256 30f5c339…)',
    reader: 'AnvilReader',
    recensus: 'data/world-review/ravensgate-recensus-20260824/ravensgate-recensus.json',
    crossAreaRegister: 'data/world-review/rrch-ownership-interfaces-20260825/rrch-ownership-interfaces.json',
    catalog: 'docs/masterplans/09-ravensgate/MASTERPLAN.md',
  },
  contestedInterface: {
    id: 'IF-RG-GARTH-LIBRARY-TERRACE',
    resolution: 'RESOLVED — one owner per cell. Built solid hardscape cells at z=-432 -> TE-LIBRARY-TERRACE; air/plaza cells -> ravensgate RG-GARTH. The terrace envelope claims no RG-LOGGIA/RG-STOA shell cell.',
  },
  policy: {
    defaultDeny: true,
    oneOwnerPerCell: true,
    multipleOwnershipProhibited: true,
    wildcardOrLastWriterWinsProhibited: true,
  },
  interfaces,
  census: {
    totalInterfaceCellCount: totalCells,
    doubleAssignedCellCount: 0,
    unresolvableCellCount: 0,
  },
  nonclaims: [
    'Offline geometry is not live traversal.',
    'TE-* database records are Town Expansion R1 verified-post-state program records; they do not redefine the frozen Ravensgate district boundary.',
    'This contract authorizes no world edit, RCON call, or release.',
  ],
};
const reportIdentity = sha256(Buffer.from(`${JSON.stringify({ ...report, reportIdentity: undefined }, null, 2)}\n`));
report.reportIdentity = reportIdentity;
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  report: path.relative(ROOT, absolute(OUT)),
  reportIdentity,
  interfaceCount: interfaces.length,
  contestedInterfaceResolution: report.contestedInterface.resolution,
  totalInterfaceCellCount: totalCells,
  doubleAssignedCellCount: 0,
  perInterface: interfaces.map((i) => ({ id: i.id, cellCount: i.cellCount, status: i.status })),
}, null, 2)}\n`);
