#!/usr/bin/env node
/**
 * Read-only B09 C02/C03 route and rescue dependency mapper.
 *
 * This is a source-bound geometry and conflict study.  It creates no guarded
 * operations, never opens a sealed interface, and never talks to RCON or a
 * running Minecraft server.  In particular, its six-by-six corridor is an
 * explicit future-design envelope, not evidence of clearance, ownership,
 * egress, or rescue commissioning.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  cellsIn,
  hashCells,
  mountainSurfaceY,
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/mp10-bell-penthouse-live-20260826T122519Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b09-c02-c03-route-rescue-study-20260826T123537Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T12:35:47.601Z');

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const ledgerPostRegionSha256 = (ledger) => {
  if (typeof ledger.postSnapshot?.regionSha256 === 'string') return ledger.postSnapshot.regionSha256;
  const identityPath = ledger.postSnapshot?.identity?.path;
  if (typeof identityPath !== 'string') return null;
  return readJson(identityPath).sha256 ?? null;
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`MP05 B09 C02/C03 route-rescue mapper rejected: ${message}`);
};
const binding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const stateBase = (state) => state.split('[', 1)[0];
const boundsOf = (cells) => cells.length === 0 ? null : ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});
const exactSet = (cells, includeCells = false) => ({
  cellCount: cells.length,
  bounds: boundsOf(cells),
  coordinateSetSha256: hashCells(cells),
  ...(includeCells ? { cells: cells.slice().sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z) } : {}),
});
const intersection = (left, right) => {
  const rightKeys = new Set(right.map(cellKey));
  return left.filter((cell) => rightKeys.has(cellKey(cell)));
};
const census = (records) => Object.fromEntries([...records.reduce((counts, { state }) => (
  counts.set(state, (counts.get(state) ?? 0) + 1)
), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const isFluid = (state) => /:(water|lava|bubble_column)(\[|$)/.test(state);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil',
  'minecraft:damaged_anvil', 'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const isGravity = (state) => GRAVITY.has(stateBase(state));

function hashRegion(directory) {
  const digest = crypto.createHash('sha256');
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) {
    digest.update(name); digest.update('\0');
    digest.update(fs.readFileSync(path.join(directory, name))); digest.update('\0');
  }
  return { sha256: digest.digest('hex'), regionFileCount: names.length };
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurfaceY(portal.x, climbZ - 1, model)
    !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'FM-01 east-face throat cannot be reproduced');
  const points = [];
  for (let distance = 0; distance <= throatX - portal.x; distance += 1) {
    points.push({
      x: portal.x + distance, y: portal.y, z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat',
    });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= throatX - portal.x; distance += 1) {
    const x = throatX - distance;
    points.push({
      x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === Math.abs(summit.z - climbZ) ? 'summit-interface' : 'summit-ascent',
    });
  }
  return points.map((point, index) => ({ ...point, index }));
}

function tangentAt(centerline, index) {
  const current = centerline[index];
  const next = centerline[Math.min(index + 1, centerline.length - 1)];
  const previous = centerline[Math.max(index - 1, 0)];
  // At a cardinal curve, use the outgoing tangent; only the terminal point
  // falls back to the incoming tangent.  Mixing the two creates a diagonal
  // vector and would conceal the corner condition this study must preserve.
  const outgoingX = Math.sign(next.x - current.x);
  const outgoingZ = Math.sign(next.z - current.z);
  const dx = outgoingX || outgoingZ ? outgoingX : Math.sign(current.x - previous.x);
  const dz = outgoingX || outgoingZ ? outgoingZ : Math.sign(current.z - previous.z);
  invariant(Math.abs(dx) + Math.abs(dz) === 1, `index ${index} lacks a cardinal tangent`);
  // The stable "right" side keeps the lower run north of the R12R controls.
  return { x: dx, z: dz, right: { x: dz, z: -dx } };
}

function corridorSlice(point, tangent) {
  const cells = [];
  // Offset one is deliberately retained as a guideway separation buffer.
  // The six by six walkable design volume occupies offsets two through seven.
  for (let lateral = 2; lateral <= 7; lateral += 1) {
    for (let y = point.y; y <= point.y + 5; y += 1) {
      cells.push({ x: point.x + tangent.right.x * lateral, y, z: point.z + tangent.right.z * lateral });
    }
  }
  return cells;
}

function crossPassage(point, tangent) {
  const cells = [];
  // A 3x3 lockable crossing study: three cells along local tangent, three
  // outward cells from the retained guideway buffer, and three high.
  for (let along = -1; along <= 1; along += 1) {
    for (let lateral = 1; lateral <= 3; lateral += 1) {
      for (let y = point.y; y <= point.y + 2; y += 1) {
        cells.push({
          x: point.x + tangent.x * along + tangent.right.x * lateral,
          y,
          z: point.z + tangent.z * along + tangent.right.z * lateral,
        });
      }
    }
  }
  return uniqueCells(cells);
}

async function records(reader, cells) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    result.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return result;
}

async function blockEntitiesIn(reader, cells) {
  const target = new Set(cells.map(cellKey));
  const chunks = new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
  const result = [];
  for (const key of chunks) {
    const [cx, cz] = key.split(',').map(Number);
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const x = Number(entity.x ?? entity.X);
      const y = Number(entity.y ?? entity.Y);
      const z = Number(entity.z ?? entity.Z);
      if (Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z)
        && target.has(cellKey({ x, y, z }))) {
        result.push({ x, y, z, id: entity.id ?? entity.Id ?? 'unknown' });
      }
    }
  }
  return result.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z || a.id.localeCompare(b.id));
}

function setFinding(id, role, cells, recordMap, sets) {
  const recordsForSet = cells.map((cell) => ({ cell, state: recordMap.get(cellKey(cell)) }));
  const nonAir = recordsForSet.filter(({ state }) => state !== 'minecraft:air');
  return {
    id,
    role,
    exactEnvelope: exactSet(cells),
    currentStateCensus: census(recordsForSet),
    nonAir: exactSet(nonAir.map(({ cell }) => cell)),
    fluidCells: exactSet(recordsForSet.filter(({ state }) => isFluid(state)).map(({ cell }) => cell), true),
    gravityCells: exactSet(recordsForSet.filter(({ state }) => isGravity(state)).map(({ cell }) => cell), true),
    overlaps: Object.fromEntries(sets.map(({ id: setId, cells: setCells }) => [setId, exactSet(intersection(cells, setCells))])),
  };
}

function overviewSvg(centerline, corridorAnchors, crossPassages) {
  const xMin = 2038; const xMax = 2294; const zMin = -835; const zMax = -738;
  const scale = 3.5; const left = 58; const top = 58;
  const px = (x) => left + (x - xMin) * scale;
  const py = (z) => top + (zMax - z) * scale;
  const route = centerline.map(({ x, z }) => `${px(x)},${py(z)}`).join(' ');
  const corridor = corridorAnchors.map(({ x, z }) => `${px(x)},${py(z)}`).join(' ');
  const dots = crossPassages.map(({ index, anchor }) => `<circle cx="${px(anchor.x)}" cy="${py(anchor.z)}" r="5" fill="#f59e0b"/><text x="${px(anchor.x) + 7}" y="${py(anchor.z) - 6}" class="label">${index}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="440" viewBox="0 0 1020 440">\n<style>.title{font:700 16px sans-serif;fill:#111827}.sub{font:11px sans-serif;fill:#374151}.label{font:10px monospace;fill:#78350f}.axis{font:10px monospace;fill:#64748b}</style>\n<rect width="100%" height="100%" fill="#f8fafc"/><text x="18" y="25" class="title">MP05 B09 C03 six-by-six separated-corridor study — plan geometry</text><text x="18" y="44" class="sub">Blue = existing B09 rail centerline; green = candidate corridor centreline (right-side offset four); orange = 3×3 cross-passage study indices. Geometry only.</text>\n<polyline points="${route}" fill="none" stroke="#2563eb" stroke-width="3"/><polyline points="${corridor}" fill="none" stroke="#16a34a" stroke-width="5" opacity=".8"/>${dots}\n<circle cx="${px(centerline[0].x)}" cy="${py(centerline[0].z)}" r="5" fill="#1d4ed8"/><text x="${px(centerline[0].x) + 8}" y="${py(centerline[0].z) - 8}" class="label">lower / B08 study</text><circle cx="${px(centerline.at(-1).x)}" cy="${py(centerline.at(-1).z)}" r="5" fill="#1d4ed8"/><text x="${px(centerline.at(-1).x) + 8}" y="${py(centerline.at(-1).z) + 16}" class="label">summit / Z11 study</text>\n<text x="18" y="420" class="axis">Plan bounds x=${xMin}..${xMax}; z=${zMin}..${zMax}. The map does not show clearance, excavation, ownership, drainage, or a completed path.</text>\n</svg>\n`;
}

function profileSvg(centerline, crossings) {
  const width = 1020; const height = 340; const left = 58; const bottom = 287;
  const x = (index) => left + index * 1.6;
  const y = (level) => bottom - (level - 120) * 0.85;
  const route = centerline.map(({ index, y: level }) => `${x(index)},${y(level)}`).join(' ');
  const markers = crossings.map(({ index, point }) => `<line x1="${x(index)}" y1="60" x2="${x(index)}" y2="${bottom}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 3"/><text x="${x(index) + 3}" y="75" class="label">${index}</text><circle cx="${x(index)}" cy="${y(point.y)}" r="4" fill="#f59e0b"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<style>.title{font:700 16px sans-serif;fill:#111827}.sub{font:11px sans-serif;fill:#374151}.label{font:10px monospace;fill:#78350f}.axis{font:10px monospace;fill:#64748b}</style>\n<rect width="100%" height="100%" fill="#f8fafc"/><text x="18" y="25" class="title">MP05 B09 C03 corridor study — guideway index / elevation profile</text><text x="18" y="44" class="sub">Blue rail datum, with corridor volume from rail Y through rail Y+5. Orange lines identify cross-passage studies at a maximum 112-index spacing.</text>\n<polyline points="${route}" fill="none" stroke="#2563eb" stroke-width="3"/>${markers}<line x1="${left}" y1="${bottom}" x2="${width - 30}" y2="${bottom}" stroke="#64748b"/><text x="18" y="${bottom + 4}" class="axis">Y 120</text><text x="18" y="${y(300) + 4}" class="axis">Y 300</text><text x="${left}" y="${bottom + 24}" class="axis">0</text><text x="${x(560) - 12}" y="${bottom + 24}" class="axis">560 index</text>\n</svg>\n`;
}

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
const technicalPath = 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json';
const connectorPath = 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const d05Path = 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const r07dPath = 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json';
const r12rPath = 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json';
const capture = readJson(capturePath);
const ledger = readJson(SOURCE_LEDGER);
const technical = readJson(technicalPath);
const connectors = readJson(connectorPath);
const d05 = readJson(d05Path);
const r07d = readJson(r07dPath);
const r12r = readJson(r12rPath);
const region = hashRegion(abs(path.join(SNAPSHOT, 'region')));

invariant(capture.immutableCopy === true && capture.captureProtocol?.restorationAction === 'SAVE_ON_CONFIRMED', 'source is not a restored immutable complete-save capture');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger does not authenticate this snapshot');
invariant(ledgerPostRegionSha256(ledger) === region.sha256, 'source region hash drifted');
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model, 'FM-01 compact east-face model missing');
const centerline = buildCenterline(model.formula, connectors.funicularFaceComparison.designEndpoints);
const centerlineHash = sha256(`combined-zones-ordered-centerline-v1\n${centerline.map(({ index, x, y, z, kind }) => `${index}:${x},${y},${z}:${kind}`).join('\n')}\n`);
invariant(centerline.length === 561 && centerlineHash === technical.deterministicGeometryContract.orderedCenterlineSha256, 'canonical B09 centerline identity drifted');

const r12rRails = cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 });
const r12rStops = [{ x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }];
const r12rControls = [{ x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 }];
const r12rProtected = uniqueCells([...r12rRails, ...r12rStops, ...r12rControls]);
invariant(r12rProtected.length === 19 && r12r.commissionedSystem.activeShuttleCommissioned === true, 'R12R protected system binding drifted');
const lowerShell = cellsIn(r07d.scope.geometry.lowerStationEnvelope.bounds);
const b08Interface = cellsIn(technical.exactSealedInterfaceProposals.interfaces.find(({ interfaceId }) => interfaceId === 'IF-B08-B09-PORTAL').exactCellSet.bounds);
const z11Interface = cellsIn(technical.exactSealedInterfaceProposals.interfaces.find(({ interfaceId }) => interfaceId === 'IF-B09-Z11-SUMMIT').exactCellSet.bounds);
const b09Accommodation = cellsIn(technical.deterministicGeometryContract.minimumPlanningAccommodation.bounds);

const tangents = centerline.map((_, index) => tangentAt(centerline, index));
const corridorSlices = centerline.map((point, index) => corridorSlice(point, tangents[index]));
const c03Corridor = uniqueCells(corridorSlices.flat());
const c03Anchors = centerline.map((point, index) => ({
  index,
  x: point.x + tangents[index].right.x * 4,
  y: point.y + 2,
  z: point.z + tangents[index].right.z * 4,
}));
const crossingSchedule = [0, 112, 224, 336, 448, 560];
const crossings = crossingSchedule.map((index) => ({
  id: `C03-XP-${String(index).padStart(3, '0')}`,
  index,
  point: centerline[index],
  tangent: tangents[index],
  anchor: c03Anchors[index],
  cells: crossPassage(centerline[index], tangents[index]),
}));
const c02Receiver = cellsIn({ minX: 2048, maxX: 2053, minY: 130, maxY: 135, minZ: -755, maxZ: -750 });
const c02PortalStudy = cellsIn({ minX: 2048, maxX: 2050, minY: 130, maxY: 132, minZ: -750, maxZ: -748 });
const lowerRescueStudy = uniqueCells([...c02Receiver, ...c02PortalStudy, ...crossings[0].cells]);
const summitRescueStudy = crossings.at(-1).cells;
const allCells = uniqueCells([
  ...c03Corridor, ...c02Receiver, ...c02PortalStudy, ...crossings.flatMap(({ cells }) => cells),
  ...lowerShell, ...b08Interface, ...z11Interface, ...r12rProtected,
]);
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const allRecords = await records(reader, allCells);
const recordMap = new Map(allRecords.map(({ cell, state }) => [cellKey(cell), state]));
const protectedSets = [
  { id: 'B08-B09-DEFAULT-DENY-INTERFACE', cells: b08Interface },
  { id: 'B09-LOWER-STATION-SHELL', cells: lowerShell },
  { id: 'B09-Z11-DEFAULT-DENY-INTERFACE', cells: z11Interface },
  { id: 'R12R-PROTECTED-BLOCKS', cells: r12rProtected },
];
const c03Finding = setFinding('C03-SIX-BY-SIX-SEPARATED-CORRIDOR-STUDY', 'Six-wide, six-high right-side swept corridor from guideway index 0 through 560; one-cell guideway buffer retained.', c03Corridor, recordMap, protectedSets);
const c02Finding = setFinding('C02-LOWER-RECEIVER-STUDY', 'Six-wide, six-high lower receiver volume north of the lower station; geometric staging only.', c02Receiver, recordMap, protectedSets);
const c02PortalFinding = setFinding('C02-LOWER-PORTAL-AND-DISCHARGE-STUDY', 'Three-wide by three-high connection study from C02 toward the sealed B08/B09 interface.', c02PortalStudy, recordMap, protectedSets);
const crossingFindings = crossings.map((crossing) => setFinding(crossing.id, `3×3 lockable cross-passage study at guideway index ${crossing.index}.`, crossing.cells, recordMap, protectedSets));
const blockEntities = await blockEntitiesIn(reader, uniqueCells([...c03Corridor, ...c02Receiver, ...c02PortalStudy, ...crossings.flatMap(({ cells }) => cells)]));
const accommodationKeys = new Set(b09Accommodation.map(cellKey));
const outsideAccommodation = c03Corridor.filter((cell) => !accommodationKeys.has(cellKey(cell)));
const nonAirC03 = c03Corridor.filter((cell) => recordMap.get(cellKey(cell)) !== 'minecraft:air');
const existingRailC03 = nonAirC03.filter((cell) => /:(powered_rail|rail|detector_rail|activator_rail)(\[|$)/.test(recordMap.get(cellKey(cell))));
const lowerEndpoint = { point: centerline[0], corridorCentre: c03Anchors[0], crossPassage: crossings[0].id };
const summitEndpoint = { point: centerline.at(-1), corridorCentre: c03Anchors.at(-1), crossPassage: crossings.at(-1).id };

const report = {
  schemaVersion: 1,
  id: 'MP05-B09-C02-C03-ROUTE-RESCUE-DEPENDENCY-STUDY',
  generatedAtUtc: GENERATED_AT,
  status: 'DESIGN_HOLD__GEOMETRY_IDENTIFIED__NO_ROUTE_OR_RESCUE_DISCHARGE_ACCEPTED',
  disposition: {
    readOnly: true,
    operationsCompiled: false,
    liveCallsPerformed: false,
    worldMutationsPerformed: false,
    authority: 'None. This report is a design dependency model and cannot authorize excavation, interface opening, entity movement, control changes, or release compilation.',
  },
  source: {
    snapshotRoot: rel(SNAPSHOT), completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: region.sha256, regionFileCount: region.regionFileCount,
    capture: binding(capturePath), captureId: capture.captureId, sourceLedger: binding(SOURCE_LEDGER),
    designInputs: [binding(technicalPath), binding(connectorPath), binding(d05Path), binding(r07dPath), binding(r12rPath)],
  },
  canonicalGuideway: {
    pointCount: centerline.length, orderedCenterlineSha256: centerlineHash,
    points: centerline, curveIndices: technical.deterministicGeometryContract.curveIndices,
  },
  c03SeparatedCorridor: {
    classification: 'GEOMETRY_ONLY',
    crossSection: { width: 6, height: 6, retainedGuidewayBufferBlocks: 1, side: 'local right tangent; north of lower east-west R12R run' },
    exactEnvelope: exactSet(c03Corridor),
    centerline: c03Anchors,
    endpoints: { lower: lowerEndpoint, summit: summitEndpoint },
    currentSourceFinding: {
      ...c03Finding,
      outsideB09MinimumAccommodation: exactSet(outsideAccommodation),
      existingRailCells: exactSet(existingRailC03),
      blockEntities,
      consequence: 'The envelope is not a present air route. Every non-air, fluid, gravity, protected, out-of-accommodation, or block-entity finding is a hard design input for a later exact package; no block state is proposed here.',
    },
  },
  c02LowerReceiver: {
    classification: 'GEOMETRY_ONLY',
    receiver: c02Finding,
    portalConnectionStudy: c02PortalFinding,
    endpoint: lowerEndpoint,
    consequence: 'C02 geometrically meets the C03 lower end, but its B08-facing connection intersects the sealed default-deny interface and the existing lower shell. It supplies no owner, door, platform, barrier, approach, drainage, or discharge acceptance.',
  },
  lockableCrossPassageStudies: {
    requiredMaximumSpacingBlocks: 128,
    selectedIndexSchedule: crossingSchedule,
    maximumIndexInterval: 112,
    studies: crossingFindings.map((finding, i) => ({
      ...finding, index: crossings[i].index, point: crossings[i].point, corridorCentre: crossings[i].anchor,
      classification: 'GEOMETRY_ONLY__NOT_A_LOCKABLE_CROSS_PASSAGE_OR_CONTROLLED_EXIT',
    })),
  },
  rescueDischargeStudies: [
    {
      id: 'RD-LOWER-B08', endpoint: lowerEndpoint,
      candidateChain: ['C03-XP-000', 'C02 lower receiver', 'C02 lower portal study', 'IF-B08-B09-PORTAL'],
      exactInterface: exactSet(b08Interface), interfaceStatus: 'SEALED_DEFAULT_DENY__ZERO_ACCEPTED_INTERFACE_CELLS',
      independentDischargeAccepted: false,
      blocker: 'No B08/B09 directional owner, controlled exit state, B08 receiver, protected continuation, or rescue acceptance test exists.',
    },
    {
      id: 'RD-SUMMIT-Z11', endpoint: summitEndpoint,
      candidateChain: ['C03-XP-560', 'IF-B09-Z11-SUMMIT'],
      exactInterface: exactSet(z11Interface), interfaceStatus: 'SEALED_DEFAULT_DENY__ZERO_ACCEPTED_INTERFACE_CELLS',
      independentDischargeAccepted: false,
      blocker: 'No Z11 directional owner, controlled exit state, exterior/safe receiver, protected continuation, or rescue acceptance test exists.',
    },
  ],
  dependencyDecisionModel: {
    currentAcceptedIndependentDischarges: 0,
    requiredIndependentDischarges: 2,
    geometricEndpointStudiesIdentified: 2,
    conclusion: 'Two distinct endpoint studies can be located geometrically (B08 lower and Z11 summit), but neither is an accepted discharge. Geometry is not authority or functional readiness.',
    gatesBeforeAnyCompiler: [
      'Accept exact directional ownership, source/post states, failure state, inverse, and circulation test for IF-B08-B09-PORTAL.',
      'Accept exact directional ownership, source/post states, failure state, inverse, and exterior/safe receiver test for IF-B09-Z11-SUMMIT.',
      'Design C02 platform, physical edge barrier/gates, normal-walk approach, drainage, liner/foundation, smoke separation, power/control, and a bounded material/state package.',
      'Convert C03 geometry into a fully owned and structurally/hydrologically reviewed corridor with exact 6×6 clear state, 3×3 lockable cross-passages, controlled exits, refuge/passing arrangement, and two independent end-to-end rescue tests.',
      'Protect R12R: demonstrate exact non-overlap with its 19 protected blocks and fresh live minecart clearance, or design an entity-first migration plus inverse migration transaction.',
      'After those decisions, use a fresh complete immutable snapshot and the full guarded physical-release kernel; this bound snapshot cannot be reused as a release source.',
    ],
  },
  nonclaims: {
    c02ReceiverBuilt: false, c03CorridorBuilt: false, corridorClear: false, interfaceOpeningAuthorized: false,
    rescueRouteCommissioned: false, rescueDischargeAccepted: false, r12rEntityClearanceProved: false,
  },
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'b09-c03-corridor-plan.svg')), overviewSvg(centerline, c03Anchors, crossings));
fs.writeFileSync(abs(path.join(OUT_DIR, 'b09-c03-corridor-profile.svg')), profileSvg(centerline, crossings));
fs.writeFileSync(abs(path.join(OUT_DIR, 'c02-c03-route-rescue-dependency-study.json')), `${JSON.stringify(report, null, 2)}\n`);
const crossingRows = report.lockableCrossPassageStudies.studies.map(({ id, index, point, corridorCentre, exactEnvelope, overlaps }) => (
  `| ${id} | ${index} | (${point.x}, ${point.y}, ${point.z}) | (${corridorCentre.x}, ${corridorCentre.y}, ${corridorCentre.z}) | ${exactEnvelope.cellCount} | ${overlaps['B08-B09-DEFAULT-DENY-INTERFACE'].cellCount + overlaps['B09-Z11-DEFAULT-DENY-INTERFACE'].cellCount} | ${overlaps['R12R-PROTECTED-BLOCKS'].cellCount} |`
)).join('\n');
const md = `# MP05 B09 C02/C03 route and rescue dependency study\n\n`
  + `Status: **${report.status}**\n\n`
  + `This is a read-only source-bound map. It emits no operation file, performs no live call, and does not authorize excavation, a door, a cart move, a corridor, a cross-passage, or a rescue route.\n\n`
  + `## Bound source\n\n- Immutable complete snapshot: \`${report.source.snapshotRoot}\`\n- Complete-save SHA-256: \`${report.source.completeSaveSha256}\`\n- Region SHA-256: \`${report.source.regionSha256}\` (${report.source.regionFileCount} files)\n- Capture ID: \`${report.source.captureId}\`\n\n`
  + `## Maps\n\n- [Plan geometry](b09-c03-corridor-plan.svg)\n- [Index/elevation profile](b09-c03-corridor-profile.svg)\n\n`
  + `Blue is the canonical B09 guideway. Green is a **design-only** C03 corridor centreline, placed four blocks on the locally right-hand side of the guideway with a one-block retained guideway buffer; the actual study volume is six wide by six high. Orange marks 3×3 cross-passage studies.\n\n`
  + `## C02 lower receiver and C03 separated corridor\n\n`
  + `C03 reproduces the canonical ${report.canonicalGuideway.pointCount}-point guideway, then sweeps a deterministic 6×6 right-side volume at every point. Its exact envelope contains ${report.c03SeparatedCorridor.exactEnvelope.cellCount} cells, hash \`${report.c03SeparatedCorridor.exactEnvelope.coordinateSetSha256}\`. Its lower centre is \`(${lowerEndpoint.corridorCentre.x}, ${lowerEndpoint.corridorCentre.y}, ${lowerEndpoint.corridorCentre.z})\`; its summit centre is \`(${summitEndpoint.corridorCentre.x}, ${summitEndpoint.corridorCentre.y}, ${summitEndpoint.corridorCentre.z})\`. C02 is the 216-cell lower receiver study, hash \`${report.c02LowerReceiver.receiver.exactEnvelope.coordinateSetSha256}\`.\n\n`
  + `The corridor is not clear or owned: ${report.c03SeparatedCorridor.currentSourceFinding.nonAir.cellCount} cells are currently non-air; ${report.c03SeparatedCorridor.currentSourceFinding.fluidCells.cellCount} are fluid; ${report.c03SeparatedCorridor.currentSourceFinding.gravityCells.cellCount} are gravity-sensitive; ${report.c03SeparatedCorridor.currentSourceFinding.outsideB09MinimumAccommodation.cellCount} sit outside the existing minimum B09 planning accommodation; and ${report.c03SeparatedCorridor.currentSourceFinding.blockEntities.length} stored block entities occur inside its study envelope. These are design conflicts, not an instruction to alter them.\n\n`
  + `## Cross-passage studies\n\n| Study | Index | Guideway point | Corridor centre | Cells | Sealed-interface overlap | R12R protected overlap |\n|---|---:|---|---|---:|---:|---:|\n${crossingRows}\n\n`
  + `The schedule is 0 → 112 → 224 → 336 → 448 → 560, so its largest interval is 112—inside the required 128-block maximum. Each entry is only a three-wide by three-high geometric study, not a door, lock, barrier, exit, or protected passage.\n\n`
  + `## Two rescue-discharge studies, not two accepted discharges\n\n`
  + `1. **RD-LOWER-B08** follows the lower C03 crossing through C02 toward the 36-cell \`IF-B08-B09-PORTAL\` study interface. That interface is sealed/default-deny with zero accepted cells.\n2. **RD-SUMMIT-Z11** follows the summit C03 crossing toward the 12-cell \`IF-B09-Z11-SUMMIT\` study interface. That interface is sealed/default-deny with zero accepted cells.\n\n`
  + `They are geographically distinct endpoint studies, so they can guide future design work. They are **not independent rescue discharges**: neither has an accepted receiver, owner, controlled exit, continuous protected continuation, or functional rescue test. The accepted discharge count therefore remains **0 of 2**.\n\n`
  + `## Exact dependencies before a release compiler\n\n${report.dependencyDecisionModel.gatesBeforeAnyCompiler.map((gate) => `- ${gate}`).join('\n')}\n\n`
  + `No physical scope is ready.\n`;
fs.writeFileSync(abs(path.join(OUT_DIR, 'MP05-B09-C02-C03-ROUTE-RESCUE-DEPENDENCY-STUDY.md')), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT_DIR), operationsCompiled: false, routeCells: c03Corridor.length, rescueDischargesAccepted: 0 }, null, 2)}\n`);
