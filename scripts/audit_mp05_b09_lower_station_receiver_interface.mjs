#!/usr/bin/env node
/**
 * Read-only MP05-B09 lower-station receiver/interface design gate.
 *
 * This is deliberately not a release compiler. It binds one complete immutable
 * snapshot, inventories the lower B09 interface, and refuses to emit guarded
 * operations unless the whole required receiver design is already exact. The
 * present source is expected to hold: the existing closed shell and R12R
 * maintenance shuttle are evidence, not a substitute for a station retrofit.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  buildB09MinimumReservation,
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp08-rr-t1b-wayfinding-post-20260826T104858Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b09-lower-station-receiver-interface-design-20260826T111500Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T11:15:00Z');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/mp08-rr-t1b-wayfinding-live-20260826T104858Z/evidence-ledger.json');

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
  if (!condition) throw new Error(`MP05 B09 receiver/interface audit rejected: ${message}`);
};
const binding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1),
  new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice().sort((left, right) => left.cell.x - right.cell.x
    || left.cell.y - right.cell.y || left.cell.z - right.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const boundsOf = (cells) => ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});
const cellRecord = (cells) => ({
  cellCount: cells.length,
  bounds: boundsOf(cells),
  coordinateSetSha256: hashCells(cells),
});

function hashRegion(directory) {
  const digest = crypto.createHash('sha256');
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) {
    digest.update(name);
    digest.update('\0');
    digest.update(fs.readFileSync(path.join(directory, name)));
    digest.update('\0');
  }
  return { sha256: digest.digest('hex'), regionFileCount: names.length };
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
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
  invariant(throatX !== null, 'the selected B09 east-face throat cannot be reproduced');
  const points = [];
  for (let distance = 0; distance <= throatX - portal.x; distance += 1) {
    points.push({ x: portal.x + distance, y: portal.y, z: portal.z });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset });
  }
  for (let distance = 1; distance <= throatX - portal.x; distance += 1) {
    const x = throatX - distance;
    points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z });
  }
  return points.map((point, index) => ({ ...point, index }));
}

function components(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const seen = new Set();
  const result = [];
  for (const cell of byKey.values()) {
    const start = cellKey(cell);
    if (seen.has(start)) continue;
    const component = [];
    const queue = [cell];
    seen.add(start);
    while (queue.length) {
      const current = queue.pop();
      component.push(current);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const candidate = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
        const key = cellKey(candidate);
        if (byKey.has(key) && !seen.has(key)) {
          seen.add(key);
          queue.push(candidate);
        }
      }
    }
    result.push(uniqueCells(component));
  }
  return result.sort((left, right) => right.length - left.length || cellKey(left[0]).localeCompare(cellKey(right[0])));
}

async function records(reader, cells) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    result.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return result;
}

async function entitiesIn(entityReader, bounds) {
  const result = [];
  const minChunkX = Math.floor(bounds.minX / 16);
  const maxChunkX = Math.floor(bounds.maxX / 16);
  const minChunkZ = Math.floor(bounds.minZ / 16);
  const maxChunkZ = Math.floor(bounds.maxZ / 16);
  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ += 1) {
      const chunk = await entityReader.chunk(chunkX, chunkZ);
      for (const entity of chunk?.Entities ?? chunk?.entities ?? []) {
        const [x, y, z] = entity.Pos ?? entity.pos ?? [];
        if (![x, y, z].every((part) => typeof part === 'number')) continue;
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
          && z >= bounds.minZ && z <= bounds.maxZ) {
          result.push({
            id: entity.id ?? entity.Id ?? 'unknown',
            position: { x, y, z },
            tags: entity.Tags ?? entity.tags ?? [],
            uuid: entity.UUID ?? entity.uuid ?? null,
          });
        }
      }
    }
  }
  return result.sort((left, right) => `${left.id}:${left.position.x}:${left.position.y}:${left.position.z}`
    .localeCompare(`${right.id}:${right.position.x}:${right.position.y}:${right.position.z}`));
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

invariant(capture.immutableCopy === true && capture.captureProtocol?.restorationAction === 'SAVE_ON_CONFIRMED',
  'snapshot is not a complete immutable capture with save restoration');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'the supplied source is not the ledger-bound current post snapshot');
invariant(ledgerPostRegionSha256(ledger) === region.sha256, 'source region hash diverges from the ledger');
invariant(r12r.commissionedSystem.activeShuttleCommissioned === true
  && r12r.nonclaims.passengerTransportCommissioned === false, 'R12R maintenance boundary drifted');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model, 'FM-01 B09 model absent');
const centerline = buildCenterline(model.formula, connectors.funicularFaceComparison.designEndpoints);
invariant(centerline.length === 561, 'B09 centerline length drifted');
const accommodation = buildB09MinimumReservation(model.formula, connectors.funicularFaceComparison.designEndpoints);
// The technical document stores the 7,800 cell identity in deterministicGeometryContract,
// while older revisions exposed it through a proposal layer; bind the canonical expected hash.
invariant(accommodation.length === 7800
  && hashCells(accommodation) === 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  'B09 accommodation hash is not the accepted 7,800-cell set');

const lowerEnvelope = cellsIn(r07d.scope.geometry.lowerStationEnvelope.bounds);
const lowerInterior = cellsIn(r07d.scope.geometry.preservedInteriorVoid.bounds);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const maintenanceReservation = [];
for (const point of centerline) {
  const tangents = [];
  if (point.index > 0) tangents.push(direction(centerline[point.index - 1], point));
  if (point.index < centerline.length - 1) tangents.push(direction(point, centerline[point.index + 1]));
  for (const tangent of new Map(tangents.map((item) => [`${item.x},${item.z}`, item])).values()) {
    for (const side of [{ x: -tangent.z, z: tangent.x }, { x: tangent.z, z: -tangent.x }]) {
      maintenanceReservation.push(
        { x: point.x + side.x, y: point.y, z: point.z + side.z },
        { x: point.x + side.x, y: point.y + 1, z: point.z + side.z },
      );
    }
  }
}
const maintenanceCells = uniqueCells(maintenanceReservation);
invariant(maintenanceCells.length === 2250 && hashCells(maintenanceCells)
  === '352ad477cd96fc6ff9d460847c1e756d448bda4c899e77ade258d4dc63a5a4d5',
  'B09 maintenance/egress reservation identity drifted');
const powerCells = uniqueCells(centerline.map(({ x, y, z }) => ({ x, y: y + 2, z })));
const drainageCells = uniqueCells(centerline.map(({ x, y, z }) => ({ x, y: y - 1, z })));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const [accommodationRecords, lowerRecords, interiorRecords, capRecords, maintenanceRecords, powerRecords, drainageRecords] = await Promise.all([
  records(reader, accommodation), records(reader, lowerEnvelope), records(reader, lowerInterior),
  records(reader, lowerCap), records(reader, maintenanceCells), records(reader, powerCells), records(reader, drainageCells),
]);
const reviewBounds = { minX: 2046, maxX: 2290, minY: 128, maxY: 307, minZ: -830, maxZ: -746 };
const savedEntities = await entitiesIn(entityReader, reviewBounds);
const lowerAir = lowerRecords.filter(({ state }) => state === 'minecraft:air').map(({ cell }) => cell);
const maintenanceAir = maintenanceRecords.filter(({ state }) => state === 'minecraft:air').map(({ cell }) => cell);
const maintenanceComponents = components(maintenanceAir).map((cells) => ({ ...cellRecord(cells), cells }));
const lowerInteriorExact = interiorRecords.every(({ state }) => state === 'minecraft:air');
const capExact = capRecords.every(({ state }) => state === 'minecraft:polished_diorite');
const r12rCart = savedEntities.filter(({ id, tags }) => id === 'minecraft:minecart'
  && tags.includes('cz_r12_7464210e11d51e28eb4e133e2d40fd0b'));
const poweredRailCount = accommodationRecords.filter(({ state }) => stateBase(state) === 'minecraft:powered_rail').length;
const leverCount = accommodationRecords.filter(({ state }) => stateBase(state) === 'minecraft:lever').length;

const requirementChecks = [
  {
    id: 'B09-RX-01-PUBLIC_OR_RESTRICTED_RECEIVER',
    status: 'HOLD',
    evidence: 'The 12-cell west isolation cap remains fully polished diorite; no opened B08/B09 transfer, owned receiver, service door, or accepted boundary exists.',
    exact: { lowerCap: cellRecord(lowerCap), allTwelveRemainClosed: capExact },
  },
  {
    id: 'B09-RX-02-PLATFORM_EDGE_AND_SEPARATION',
    status: 'HOLD',
    evidence: 'The lower-shell clear interior is exactly 6×2×1 (12 cells), not a platform plus independent normal-walk route and physical edge barrier. No barrier/gate state is present.',
    exact: {
      lowerInterior: cellRecord(lowerInterior),
      lowerInteriorExact,
      lowerInteriorAirCellCount: interiorRecords.filter(({ state }) => state === 'minecraft:air').length,
      lowerEnvelopeCurrentAirCellCount: lowerAir.length,
    },
  },
  {
    id: 'B09-RX-03-CONTINUOUS_SEPARATED_SERVICE_ROUTE',
    status: 'HOLD',
    evidence: 'The deterministic maintenance/egress reservation is one-cell lateral by two-cell high, not a 6×6 corridor. Its current air cells form disconnected components and cannot be credited as a separated route.',
    exact: {
      reservation: cellRecord(maintenanceCells),
      currentAirCellCount: maintenanceAir.length,
      components: maintenanceComponents.map(({ cells, ...record }) => record),
      requiredClearCrossSection: { width: 6, height: 6 },
    },
  },
  {
    id: 'B09-RX-04-DRIVE_BRAKE_POWER_AND_CONTROL',
    status: 'HOLD',
    evidence: 'Fifteen powered rails and two fail-closed levers belong only to the authenticated R12R maintenance shuttle; no drive/brake/overspeed, recovery, independent feed, control-room, or failure-state design is exact.',
    exact: {
      poweredRailCount,
      leverCount,
      powerCarrier: { ...cellRecord(powerCells), currentStateCensus: stateCensus(powerRecords) },
      maintenanceBoundary: r12r.commissionedSystem.scope,
    },
  },
  {
    id: 'B09-RX-05-DRAINAGE_AND_RECEIVER',
    status: 'HOLD',
    evidence: 'The under-rail carrier is an exact reservation only. Its observed states prove neither a drain/sump, a flow path, capacity, outfall, nor a contracted receiver.',
    exact: {
      drainageCarrier: { ...cellRecord(drainageCells), currentStateCensus: stateCensus(drainageRecords) },
      technicalNullHold: 'B09-NULL-05-SUMPS-FLOW-PATHS-OUTFALL-AND-RECEIVER',
    },
  },
  {
    id: 'B09-RX-06-RESCUE_EGRESS',
    status: 'HOLD',
    evidence: 'Neither cap is an accepted rescue discharge and no protected continuous egress or independently accepted receiver is present.',
    exact: {
      lowerCapClosed: capExact,
      technicalNullHold: 'B09-NULL-03-INTERMEDIATE-REFUGE-PASSING-AND-RESCUE-ROUTE',
    },
  },
  {
    id: 'B09-RX-07-R12R_ENTITY_PRESERVATION',
    status: 'HOLD_FOR_ANY_MUTATION',
    evidence: 'One authenticated R12R minecart is inside the current B09 review halo. Any future mutation must use an exact migration or live clearance transaction; it cannot be ignored.',
    exact: { reviewBounds, authenticatedMinecartCount: r12rCart.length, entities: r12rCart },
  },
];
const allDesignNeedsProven = requirementChecks.every(({ status }) => status === 'PASS');
const report = {
  schemaVersion: 1,
  id: 'MP05-B09-LOWER-STATION-RECEIVER-INTERFACE-DESIGN-GATE',
  generatedAtUtc: GENERATED_AT,
  status: allDesignNeedsProven
    ? 'ALL_FUNCTIONAL_DESIGN_GATES_PROVEN__STATIC_OPS_ELIGIBLE_FOR_SEPARATE_COMPILER'
    : 'HOLD__NO_STATIC_OR_LIVE_OPERATION_PACKAGE_PERMITTED',
  disposition: {
    staticOperationsCompiled: false,
    liveCallsPerformed: false,
    worldMutationsPerformed: false,
    passiveRailOrCosmeticSubstituteAccepted: false,
    reason: allDesignNeedsProven
      ? 'This audit is a design gate only; a separate exact source-bound compiler is still required.'
      : 'At least one mandatory receiver/interface functional design input remains unproven or physically absent.',
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: region.sha256,
    regionFileCount: region.regionFileCount,
    capture: binding(capturePath),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    sourceLedger: binding(SOURCE_LEDGER),
    designInputs: [binding(technicalPath), binding(connectorPath), binding(d05Path), binding(r07dPath), binding(r12rPath)],
  },
  observedCurrentState: {
    accommodation: { ...cellRecord(accommodation), currentStateSetSha256: stateSetHash(accommodationRecords), currentStateCensus: stateCensus(accommodationRecords) },
    lowerStationEnvelope: { ...cellRecord(lowerEnvelope), currentStateSetSha256: stateSetHash(lowerRecords), currentStateCensus: stateCensus(lowerRecords) },
    lowerInterior: { ...cellRecord(lowerInterior), allAir: lowerInteriorExact },
    b08IsolationCap: { ...cellRecord(lowerCap), allPolishedDiorite: capExact },
    savedEntitiesInReviewHalo: savedEntities,
  },
  requiredFunctionalDesignChecks: requirementChecks,
  requiredFutureDeliverables: [
    'Exact B08-to-B09 interface owner, receiver, controlled door state, and forward/inverse migration plan.',
    'Lower-station platform, edge barrier/gates, normal-walk public or restricted approach, and physically independent service route.',
    'Continuous 6×6 separated service corridor with 3×3 lockable cross-passages and controlled exits at both stations and no more than 128 blocks apart.',
    'Drive/brake/overspeed/recovery design, independent power/control/failure states, and exact R12R minecart isolation or migration transaction.',
    'Drain/sump/flow/outfall/receiver design with exact ownership and hydrology acceptance.',
    'Protected rescue/egress route with two independently proven discharges and an acceptance test plan.',
  ],
  nonclaims: {
    passengerOrPublicServiceCommissioned: false,
    rescueTransportCommissioned: false,
    fullFunicularCommissioned: false,
    b08ToB09TransferOpened: false,
    lowerStationCommissioned: false,
  },
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'source-bound-design-hold.json')), `${JSON.stringify(report, null, 2)}\n`);
const rows = requirementChecks.map(({ id, status, evidence }) => `| ${id} | ${status} | ${evidence} |`).join('\n');
const md = `# MP05-B09 lower-station receiver/interface design gate\n\n`
  + `Status: **${report.status}**\n\n`
  + `This is a read-only, source-bound functional design gate. It does not open B08, move the R12R cart, compile an operation, or count passive rail/lighting as station work.\n\n`
  + `## Source\n\n`
  + `- Immutable complete snapshot: \`${report.source.snapshotRoot}\`\n`
  + `- Complete-save SHA-256: \`${report.source.completeSaveSha256}\`\n`
  + `- Region SHA-256: \`${report.source.regionSha256}\` (${report.source.regionFileCount} files)\n`
  + `- Capture: \`${report.source.capture.path}\`, capture ID \`${report.source.captureId}\`\n\n`
  + `## Current physical facts\n\n`
  + `- Lower shell clear interior: **${lowerInterior.length} air cells**, exact 6×2×1 interior (the surrounding 132-cell envelope contains ${lowerAir.length} air cells total).\n`
  + `- B08 isolation cap: **${capExact ? '12/12 polished-diorite cells closed' : 'SOURCE DRIFT'}**.\n`
  + `- R12R authenticated minecart in review halo: **${r12rCart.length}**.\n`
  + `- Maintenance reservation current air: **${maintenanceAir.length} cells in ${maintenanceComponents.length} disconnected components**; its planned cross-section remains 1×2, not 6×6.\n\n`
  + `## Mandatory design gates\n\n| Gate | Result | Current source evidence |\n|---|---|---|\n${rows}\n\n`
  + `## Required before any compiler exists\n\n${report.requiredFutureDeliverables.map((item) => `- ${item}`).join('\n')}\n\n`
  + `No static operations were emitted because these gates are conjunctive and the current source does not pass them.\n`;
fs.writeFileSync(abs(path.join(OUT_DIR, 'source-bound-design-hold.md')), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT_DIR), staticOperationsCompiled: false, mandatoryHoldCount: requirementChecks.filter(({ status }) => status !== 'PASS').length }, null, 2)}\n`);
