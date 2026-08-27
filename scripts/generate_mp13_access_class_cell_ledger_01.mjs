#!/usr/bin/env node
/**
 * MP13-ACCESS-CLASS-CELL-LEDGER-01
 *
 * Produce the exact, source-bound, *default-deny* cell ledger required before
 * any MP13 public/staff partition or west-tower changeover may be designed.
 * This tool deliberately emits neither guarded operations nor an acceptance.
 * It only turns the current I05/I06 diagnostic traces into a reviewable 3-D
 * cell/edge inventory.  Ownership is left UNASSIGNED until an exact owner
 * review closes it; treating a catalog envelope as an ownership transfer is
 * explicitly forbidden.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const stable = (valueToSerialize) => JSON.stringify(valueToSerialize);
const pointKey = ([x, y, z]) => `${x},${y},${z}`;
const comparePoint = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
const FLUIDS = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const CONTAINERS = new Set([
  'minecraft:barrel', 'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:shulker_box',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:brewing_stand', 'minecraft:lectern',
]);

const SNAPSHOT_VALUE = required('--snapshot');
const CONTRACT_VALUE = required('--contract');
const SURVEY_VALUE = required('--survey');
const OUT_VALUE = required('--out');
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const SNAPSHOT_ROOT = absolute(SNAPSHOT_VALUE);
const REGION_DIRECTORY = fs.existsSync(path.join(SNAPSHOT_ROOT, 'region'))
  ? path.join(SNAPSHOT_ROOT, 'region') : SNAPSHOT_ROOT;
const OUT = absolute(OUT_VALUE);
const CONTRACT_PATH = absolute(CONTRACT_VALUE);
const SURVEY_PATH = absolute(SURVEY_VALUE);

function fail(condition, message) {
  if (!condition) throw new Error(`MP13 access-class ledger rejected: ${message}`);
}

function snapshotIdentity(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename); hash.update('\0'); hash.update(content); hash.update('\0');
    bytes += content.length;
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: hash.digest('hex'), regionFileCount: files.length, bytes,
  };
}

function readJson(file, label) {
  fail(fs.existsSync(file), `${label} does not exist: ${relative(file)}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function boundsOf(points) {
  return points.reduce((bounds, [x, y, z]) => ({
    minX: Math.min(bounds.minX, x), maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y), maxY: Math.max(bounds.maxY, y),
    minZ: Math.min(bounds.minZ, z), maxZ: Math.max(bounds.maxZ, z),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
}

function hashPoints(points) {
  const digest = crypto.createHash('sha256');
  digest.update('mp13-access-class-cell-ledger-01\n');
  for (const [x, y, z] of [...points].sort(comparePoint)) digest.update(`${x},${y},${z}\n`);
  return digest.digest('hex');
}

function requireRoute(survey, routeId) {
  const route = survey.routes?.find(({ id }) => id === routeId);
  fail(route && route.status === 'NORMAL_WALK_PATH_SURVEYED_NOT_ACCEPTED',
    `${routeId} must be a current unaccepted normal-walk source trace`);
  fail(Array.isArray(route.path) && route.path.length >= 2, `${routeId} has no exact path`);
  for (let index = 1; index < route.path.length; index += 1) {
    const previous = route.path[index - 1];
    const next = route.path[index];
    const dx = Math.abs(next[0] - previous[0]);
    const dy = Math.abs(next[1] - previous[1]);
    const dz = Math.abs(next[2] - previous[2]);
    fail((dx + dz) === 1 && dy <= 1,
      `${routeId} has a non-normal-walk edge at station ${index - 1}->${index}`);
  }
  return route;
}

function addRouteEnvelope(cellMap, route, interfaceId, designation) {
  for (let station = 0; station < route.path.length; station += 1) {
    const [x, y, z] = route.path[station];
    // A 3×4×3 exact protection halo includes the support, feet, head, and
    // overhead clearance around every normal-walk station. It is a review
    // envelope, not a construction volume or an implied ownership transfer.
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 2; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const point = [x + dx, y + dy, z + dz];
      const id = pointKey(point);
      if (!cellMap.has(id)) cellMap.set(id, { point, interfaceIds: new Set(), roles: new Set(), stations: [] });
      const cell = cellMap.get(id);
      cell.interfaceIds.add(interfaceId);
      cell.roles.add(`${designation}-halo`);
      cell.stations.push({ routeId: route.id, station, role: 'protection-halo' });
    }
    for (const [dy, role] of [[-1, 'support'], [0, 'feet'], [1, 'head']] ) {
      const point = [x, y + dy, z]; const id = pointKey(point);
      const cell = cellMap.get(id);
      cell.roles.add(`${designation}-${role}`);
      cell.stations.push({ routeId: route.id, station, role });
    }
  }
}

function addVolume(cellMap, volume, interfaceId) {
  for (let x = volume.minX; x <= volume.maxX; x += 1) for (let y = volume.minY; y <= volume.maxY; y += 1) for (let z = volume.minZ; z <= volume.maxZ; z += 1) {
    const point = [x, y, z]; const id = pointKey(point);
    if (!cellMap.has(id)) cellMap.set(id, { point, interfaceIds: new Set(), roles: new Set(), stations: [] });
    const cell = cellMap.get(id);
    cell.interfaceIds.add(interfaceId); cell.roles.add('I06-changeover-review-volume');
  }
}

function routeEdges(route, interfaceId, transitionClass) {
  const edges = [];
  for (let index = 1; index < route.path.length; index += 1) {
    edges.push({
      id: `${interfaceId}:${route.id}:${String(index - 1).padStart(3, '0')}`,
      interfaceId, routeId: route.id, transitionClass,
      from: route.path[index - 1], to: route.path[index],
      directions: ['FORWARD', 'REVERSE'],
      currentSourceState: 'EXISTS_UNACCEPTED',
      normalState: 'DEFAULT_DENY_PENDING_ACCEPTED_OWNERSHIP_AND_ACCESS_CLASS',
      failureState: 'DENY_AND_ABORT_ANY_PHYSICAL_PACKAGE',
      receiverLandingId: index === route.path.length - 1 ? `${route.id}:receiver` : null,
    });
  }
  return edges;
}

function inclusiveOverlap(bounds, point) {
  return point[0] >= bounds.minX && point[0] <= bounds.maxX
    && point[1] >= bounds.minY && point[1] <= bounds.maxY
    && point[2] >= bounds.minZ && point[2] <= bounds.maxZ;
}

async function blockEntityPositions(regionReader, bounds) {
  const positions = new Map();
  const minChunkX = Math.floor(bounds.minX / 16); const maxChunkX = Math.floor(bounds.maxX / 16);
  const minChunkZ = Math.floor(bounds.minZ / 16); const maxChunkZ = Math.floor(bounds.maxZ / 16);
  for (let cx = minChunkX; cx <= maxChunkX; cx += 1) for (let cz = minChunkZ; cz <= maxChunkZ; cz += 1) {
    const chunk = await regionReader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
      if (inclusiveOverlap(bounds, point)) positions.set(pointKey(point), { id: entity.id ?? null, point });
    }
  }
  return positions;
}

async function savedEntityPositions(entityReader, bounds) {
  const positions = new Map();
  const minChunkX = Math.floor(bounds.minX / 16); const maxChunkX = Math.floor(bounds.maxX / 16);
  const minChunkZ = Math.floor(bounds.minZ / 16); const maxChunkZ = Math.floor(bounds.maxZ / 16);
  for (let cx = minChunkX; cx <= maxChunkX; cx += 1) for (let cz = minChunkZ; cz <= maxChunkZ; cz += 1) {
    const chunk = await entityReader.chunk(cx, cz);
    for (const entity of chunk?.Entities ?? chunk?.entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const point = entity.Pos.slice(0, 3).map((number) => Math.floor(Number(number)));
      if (inclusiveOverlap(bounds, point)) positions.set(pointKey(point), { id: entity.id ?? null, point });
    }
  }
  return positions;
}

fail(fs.existsSync(REGION_DIRECTORY), `snapshot region directory does not exist: ${relative(REGION_DIRECTORY)}`);
fail(fs.existsSync(path.join(SNAPSHOT_ROOT, 'entities')), 'complete saved-world entities plane is required');
fail(fs.existsSync(path.join(SNAPSHOT_ROOT, 'poi')), 'complete saved-world POI plane is required');
fail(fs.existsSync(path.join(SNAPSHOT_ROOT, 'level.dat')), 'complete saved-world level.dat is required');
fail(!fs.existsSync(OUT), `out must be a fresh directory: ${relative(OUT)}`);

const contract = readJson(CONTRACT_PATH, 'contract');
const survey = readJson(SURVEY_PATH, 'survey');
const identity = snapshotIdentity(REGION_DIRECTORY);
fail(contract.id === 'MP13-WESTLIGHT-EGRESS-ACCESS-CONTRACT-03', 'wrong MP13 contract');
fail(contract.status === 'PROPOSED_SOURCE_BOUND_CONTRACT_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY', 'contract status must remain proposed design-only');
fail(contract.worldMutationPerformed === false, 'contract must declare zero world mutation');
fail(contract.sourceSnapshot?.sha256 === identity.sha256, 'snapshot hash differs from source-bound contract');
fail(contract.sourceSnapshot?.regionFileCount === identity.regionFileCount, 'snapshot region count differs from contract');
fail(survey.sourceSnapshot?.sha256 === identity.sha256, 'survey source differs from ledger source');
fail(survey.worldMutationPerformed === false, 'survey must be read-only');
const contractSurveyEvidence = contract.evidence?.circulationSurvey;
fail(contractSurveyEvidence?.sha256 === sha256(fs.readFileSync(SURVEY_PATH)), 'survey bytes differ from contract evidence hash');

const i05 = contract.interfaceClasses?.find(({ id }) => id === 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION');
const i06 = contract.interfaceClasses?.find(({ id }) => id === 'I06-WEST-SERVICE-TOWER-CHANGEOVER');
fail(i05?.transition === 'P1 <-> S1', 'I05 must retain P1 <-> S1 classification');
fail(i06?.transition === 'S1 -> S1', 'I06 must retain S1 -> S1 classification');
fail(i06?.reviewVolume, 'I06 review volume is missing');

const publicToBackstage = requireRoute(survey, 'theatre-public-to-backstage');
const backstageToBase = requireRoute(survey, 'backstage-to-west-service-base');
const towerToConcourse = requireRoute(survey, 'west-service-base-to-concourse');
const cells = new Map();
addRouteEnvelope(cells, publicToBackstage, 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION', 'I05-public-staff-boundary');
addRouteEnvelope(cells, backstageToBase, 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION', 'I05-staff-continuity');
addRouteEnvelope(cells, towerToConcourse, 'I06-WEST-SERVICE-TOWER-CHANGEOVER', 'I06-staff-only-tower');
addVolume(cells, i06.reviewVolume, 'I06-WEST-SERVICE-TOWER-CHANGEOVER');
const points = [...cells.values()].map(({ point }) => point).sort(comparePoint);
const reviewBounds = boundsOf(points);
const regionReader = new AnvilReader(REGION_DIRECTORY);
const entityReader = new AnvilReader(path.join(SNAPSHOT_ROOT, 'entities'));
const [blockEntities, savedEntities] = await Promise.all([
  blockEntityPositions(regionReader, reviewBounds),
  savedEntityPositions(entityReader, reviewBounds),
]);

const ledgerCells = [];
for (const cell of [...cells.values()].sort((left, right) => comparePoint(left.point, right.point))) {
  const source = stateToCommandString(await regionReader.blockState(...cell.point));
  const sourceBlock = source.split('[', 1)[0];
  const blockEntity = blockEntities.get(pointKey(cell.point)) ?? null;
  const savedEntity = savedEntities.get(pointKey(cell.point)) ?? null;
  ledgerCells.push({
    point: cell.point,
    interfaceIds: [...cell.interfaceIds].sort(),
    routeRoles: [...cell.roles].sort(),
    stationReferences: cell.stations.sort((left, right) => left.routeId.localeCompare(right.routeId) || left.station - right.station || left.role.localeCompare(right.role)),
    sourceState: source,
    // U0 is an explicit access class, not a missing string: it means that
    // no player, route, or future compiler may treat the cell as authorised.
    owner: 'U0_UNASSIGNED_OWNER_DEFAULT_DENY',
    accessClass: 'U0',
    normalState: 'DENY_PENDING_EXACT_OWNER_AND_ACCESS_REVIEW',
    failureState: 'DENY_ABORT_NO_GEOMETRY_OR_OPERATION_EMISSION',
    receivingRouteOrLandingId: null,
    exclusions: {
      protectedRetained: true,
      sourceFluid: FLUIDS.has(sourceBlock),
      sourceContainerLike: CONTAINERS.has(sourceBlock),
      sourceBlockEntity: blockEntity,
      savedEntityAtCell: savedEntity,
      liveEntityClearance: 'NOT_EVALUATED_BY_READ_ONLY_LEDGER__REQUIRED_ON_ANY_FUTURE_RELEASE_SOURCE',
    },
    reviewerAcceptance: null,
  });
}

const edges = [
  ...routeEdges(publicToBackstage, 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION', 'P1_TO_S1_UNSAFE_CURRENT_TRACE'),
  ...routeEdges(backstageToBase, 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION', 'S1_CONTINUITY_TO_NAMED_SPINE'),
  ...routeEdges(towerToConcourse, 'I06-WEST-SERVICE-TOWER-CHANGEOVER', 'S1_TO_S1_STAFF_ONLY_TOWER'),
];
const sourceFluidCount = ledgerCells.filter(({ exclusions }) => exclusions.sourceFluid).length;
const sourceContainerCount = ledgerCells.filter(({ exclusions }) => exclusions.sourceContainerLike).length;
const sourceBlockEntityCount = ledgerCells.filter(({ exclusions }) => exclusions.sourceBlockEntity).length;
const savedEntityCount = ledgerCells.filter(({ exclusions }) => exclusions.savedEntityAtCell).length;
const unreviewedFaces = edges.length * 2;
const ledger = {
  schemaVersion: 1,
  id: 'MP13-ACCESS-CLASS-CELL-LEDGER-01',
  status: 'PROPOSED_SOURCE_BOUND_DEFAULT_DENY_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY',
  generatedAtUtc: GENERATED_AT,
  mode: 'read-only exact-cell ownership/access-class prerequisite',
  worldMutationPerformed: false,
  rconCalled: false,
  databaseMutated: false,
  operationFiles: [],
  mutationAuthorityGranted: false,
  sourceSnapshot: {
    root: relative(SNAPSHOT_ROOT), regions: relative(REGION_DIRECTORY),
    completeSaveCapture: relative(path.join(SNAPSHOT_ROOT, 'combined-zones-complete-save-capture.json')),
    ...identity,
  },
  upstream: {
    contract: { path: relative(CONTRACT_PATH), sha256: sha256(fs.readFileSync(CONTRACT_PATH)) },
    circulationSurvey: { path: relative(SURVEY_PATH), sha256: sha256(fs.readFileSync(SURVEY_PATH)) },
  },
  accessClassVocabulary: {
    P0: 'public arrival / district approach', P1: 'venue public egress and circulation',
    S1: 'staff service only', C1: 'controlled members access', X0: 'protected retained fabric',
    U0: 'unassigned / default deny',
  },
  interfaces: [
    {
      id: i05.id, transition: i05.transition,
      purpose: 'Exact source inventory of the unsafe current P1-to-S1 trace and required S1 continuity to the named west-service base.',
      routeIds: [publicToBackstage.id, backstageToBase.id],
      sourceFacts: { publicToBackstageStations: publicToBackstage.path.length, staffContinuityStations: backstageToBase.path.length },
      requiredAcceptance: [
        'every exact I05 cell must have one accepted owner and P1/S1/X0 class',
        'P1 must be proven unable to reach S1 after a separately accepted design',
        'S1 must retain a continuous 3-by-3 clear route to the named staff spine',
        'every controlled aperture must name normal and failure state',
      ],
    },
    {
      id: i06.id, transition: i06.transition,
      purpose: 'Exact source inventory of the current staff-only west tower and its bounded changeover review volume; it is never public egress.',
      routeIds: [towerToConcourse.id], reviewVolume: i06.reviewVolume,
      sourceFacts: { staffOnlyTowerStations: towerToConcourse.path.length, publicUseProhibited: true },
      requiredAcceptance: [
        'every exact I06 cell must have one accepted owner and S1/X0 class',
        'a separately adopted route must be lit, continuous, 3-by-3 clear, no-jump, and bidirectional',
        'public bypass exclusion must be independently demonstrated',
      ],
    },
  ],
  protectionEnvelope: {
    definition: 'For every source normal-walk station: x/z ±1 and y -1..+2; plus the inclusive I06 review volume.',
    cells: { count: ledgerCells.length, coordinateSetSha256: hashPoints(points), bounds: reviewBounds },
    recordedSourceExclusions: {
      sourceFluidCount, sourceContainerLikeCount: sourceContainerCount,
      sourceBlockEntityCount, savedEntityAtExactCellCount: savedEntityCount,
      liveEntityClearance: 'DEFERRED_TO_FRESH_PHYSICAL_RELEASE_KERNEL',
    },
  },
  transitions: edges,
  cells: ledgerCells,
  acceptanceGates: {
    exactCellCoverage: true,
    ownerPerCellAccepted: false,
    accessClassPerCellAccepted: false,
    unreviewedCellCount: ledgerCells.length,
    unreviewedDirectionalFaceCount: unreviewedFaces,
    zeroUnreviewedCrossOwnerFaces: false,
    defaultDenyEnforced: true,
    continuousSourceTransitions: true,
    i06StaffOnlyTowerRetained: true,
    sourceMutationAttempted: false,
    acceptanceRule: 'No later compiler may use this ledger until all cells and directional faces are independently accepted; unresolved U0 cells or any unreviewed cross-owner face fail closed.',
  },
  nonClaims: [
    'This ledger grants no ownership transfer, player permission, credentialed door behavior, or access-control commissioning.',
    'This ledger does not certify public egress, accessibility, event readiness, or a staff tower changeover.',
    'This ledger emits no operation, rollback, manifest, RCON call, or world mutation.',
  ],
};
ledger.ledgerIdentitySha256 = sha256(stable({
  sourceSnapshot: ledger.sourceSnapshot, upstream: ledger.upstream,
  protectionEnvelope: ledger.protectionEnvelope.cells, transitions: ledger.transitions,
  cells: ledger.cells.map(({ point, sourceState, owner, accessClass, interfaceIds, routeRoles }) => ({ point, sourceState, owner, accessClass, interfaceIds, routeRoles })),
}));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp13-access-class-cell-ledger-01.json'), `${JSON.stringify(ledger, null, 2)}\n`);
const markdown = `# MP13 access-class cell ledger 01\n\n**Status:** \`${ledger.status}\`  \n**Mode:** source-bound, read-only default-deny prerequisite; no world mutation.\n\nThis packet inventories **${ledgerCells.length.toLocaleString('en-US')} exact 3-D cells** and **${edges.length.toLocaleString('en-US')} directed source transition edges** across I05 and I06. Every cell is currently \`U0\` / \`U0_UNASSIGNED_OWNER_DEFAULT_DENY\`; that is intentional. Catalog envelopes do not create ownership.\n\n- I05 records the current unsafe ${publicToBackstage.path.length}-station P1→S1 trace and the ${backstageToBase.path.length}-station required staff-continuity trace.\n- I06 records the ${towerToConcourse.path.length}-station **staff-only** tower trace plus review volume \`x=${i06.reviewVolume.minX}..${i06.reviewVolume.maxX}, y=${i06.reviewVolume.minY}..${i06.reviewVolume.maxY}, z=${i06.reviewVolume.minZ}..${i06.reviewVolume.maxZ}\`. It is not public egress.\n- The exact protection envelope has SHA-256 \`${ledger.protectionEnvelope.cells.coordinateSetSha256}\`.\n- Acceptance remains blocked: ${ledger.acceptanceGates.unreviewedCellCount.toLocaleString('en-US')} cells and ${ledger.acceptanceGates.unreviewedDirectionalFaceCount.toLocaleString('en-US')} directional faces have no accepted owner/access review.\n\n## Default-deny rule\n\nAny \`U0\` cell, missing reviewer acceptance, or unreviewed directional face blocks any future geometry/compiler step. A later accepted ledger must be source-rebound and close every cell/face without relabelling the tower as public.\n\n## Non-claims\n\nNo ownership transfer, public egress, access-control commissioning, operation file, RCON call, or world edit is created by this artifact.\n`;
fs.writeFileSync(path.join(OUT, 'MP13-ACCESS-CLASS-CELL-LEDGER-01.md'), markdown);
process.stdout.write(`${JSON.stringify({ status: ledger.status, out: relative(OUT), cells: ledgerCells.length, transitions: edges.length, identity: ledger.ledgerIdentitySha256 }, null, 2)}\n`);
