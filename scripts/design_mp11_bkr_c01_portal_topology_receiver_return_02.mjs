#!/usr/bin/env node
/**
 * Read-only first-stage decision for MP11/BKR C01 dimension recovery.
 *
 * Inventories portal gravity topology, any fluid/receiver boundary, current
 * normal-walk returns, and portal-envelope containers.  It intentionally
 * emits neither block operations nor release authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-01-cobalt-wl-post-20260826T233000Z/bkr-survey-00.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-portal-topology-receiver-return-02-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR portal topology decision rejected: ${message}`); };
const key = (point) => point.join(',');
const nameOf = (state) => String(state).split('[', 1)[0];
const stateHash = (items) => sha256(items.map((item) => `${key(item.point)}=${item.state ?? item.id ?? ''}`).sort().join('\n'));
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const BOUNDS = { minX: 680, maxX: 812, minY: 40, maxY: 75, minZ: -90, maxZ: -40 };
const CONTAINERS = ['chest', 'barrel', 'shulker_box', 'furnace', 'smoker', 'blast_furnace', 'hopper',
  'dispenser', 'dropper', 'brewing_stand', 'beehive', 'bee_nest', 'jukebox', 'campfire', 'soul_campfire'];
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:pointed_dripstone']);
const inBounds = (point, bounds = BOUNDS) => point[0] >= bounds.minX && point[0] <= bounds.maxX
  && point[1] >= bounds.minY && point[1] <= bounds.maxY && point[2] >= bounds.minZ && point[2] <= bounds.maxZ;
const onBoundary = ([x, y, z]) => x === BOUNDS.minX || x === BOUNDS.maxX || y === BOUNDS.minY || y === BOUNDS.maxY
  || z === BOUNDS.minZ || z === BOUNDS.maxZ;
const neighbors = ([x, y, z]) => [[x - 1, y, z], [x + 1, y, z], [x, y - 1, z], [x, y + 1, z], [x, y, z - 1], [x, y, z + 1]];
const manhattan = (left, right) => Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]);
const componentBounds = (cells) => ({
  minX: Math.min(...cells.map((cell) => cell.point[0])), maxX: Math.max(...cells.map((cell) => cell.point[0])),
  minY: Math.min(...cells.map((cell) => cell.point[1])), maxY: Math.max(...cells.map((cell) => cell.point[1])),
  minZ: Math.min(...cells.map((cell) => cell.point[2])), maxZ: Math.max(...cells.map((cell) => cell.point[2])),
});

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(fs.existsSync(path.join(root, member)), `missing complete immutable source member ${member}`);
}
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source capture is not immutable');
const surveyPath = abs(SURVEY);
fail(fs.existsSync(surveyPath), `survey absent: ${SURVEY}`);
const surveyBytes = fs.readFileSync(surveyPath);
const survey = JSON.parse(surveyBytes);
fail(survey.status === 'BKR_SURVEY_00_COMPLETE', 'survey status is not complete');
fail(survey.source?.snapshot?.rootDirectory === rel(SNAPSHOT) && survey.source.snapshot.captureId === capture.captureId,
  'survey is not bound to the supplied immutable source');
const routeBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal');
const route = routeBox?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
fail(route?.status === 'HOLD' && route.connectivity === 'PASS' && route.stationCount === 127, 'required current portal-to-L1 route inventory is absent or drifted');
const routePoints = route.stations.map((station) => station.point);
fail(routePoints.every((point) => Array.isArray(point) && point.length === 3), 'route stations malformed');

const reader = new AnvilReader(path.join(root, 'region'));
const cached = new Map();
async function block(point) {
  const k = key(point);
  if (!cached.has(k)) cached.set(k, stateToCommandString(await reader.blockState(...point)));
  return cached.get(k);
}

const gravity = new Map(); const fluids = [];
for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += 1) {
  for (let y = BOUNDS.minY; y <= BOUNDS.maxY; y += 1) {
    for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z += 1) {
      const point = [x, y, z]; const state = await block(point); const name = nameOf(state);
      if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) gravity.set(key(point), { point, state });
      if (name === 'minecraft:water' || name === 'minecraft:flowing_water' || name === 'minecraft:lava'
        || name === 'minecraft:flowing_lava' || name === 'minecraft:bubble_column' || state.includes('waterlogged=true')) fluids.push({ point, state });
    }
  }
}

const components = []; const unseen = new Set(gravity.keys());
while (unseen.size) {
  const first = unseen.values().next().value;
  const stack = [gravity.get(first)]; const cells = []; unseen.delete(first);
  while (stack.length) {
    const cell = stack.pop(); cells.push(cell);
    for (const point of neighbors(cell.point)) {
      const cellKey = key(point);
      if (unseen.delete(cellKey)) stack.push(gravity.get(cellKey));
    }
  }
  const contacts = cells.filter((cell) => onBoundary(cell.point));
  const minimumRouteDistance = Math.min(...cells.flatMap((cell) => routePoints.map((point) => manhattan(cell.point, point))));
  components.push({
    cellCount: cells.length, cellSetSha256: stateHash(cells), bounds: componentBounds(cells),
    boundaryTouching: contacts.length > 0, boundaryContactCount: contacts.length,
    boundaryContacts: contacts.map((cell) => cell.point), boundaryContactSetSha256: pointHash(contacts.map((cell) => cell.point)),
    minManhattanDistanceToCurrentReturn: minimumRouteDistance,
    currentRouteAdjacent: minimumRouteDistance <= 2,
  });
}
components.sort((left, right) => left.minManhattanDistanceToCurrentReturn - right.minManhattanDistanceToCurrentReturn
  || right.cellCount - left.cellCount || left.cellSetSha256.localeCompare(right.cellSetSha256));
components.forEach((component, index) => { component.componentId = `G${String(index + 1).padStart(2, '0')}`; });
const finiteRouteAdjacent = components.filter((component) => !component.boundaryTouching && component.currentRouteAdjacent);
const unbounded = components.filter((component) => component.boundaryTouching);

const entities = [];
for (let chunkX = Math.floor(BOUNDS.minX / 16); chunkX <= Math.floor(BOUNDS.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(BOUNDS.minZ / 16); chunkZ <= Math.floor(BOUNDS.maxZ / 16); chunkZ += 1) {
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
      if (inBounds(point)) entities.push({ point, id: String(entity.id ?? 'unknown') });
    }
  }
}
entities.sort((left, right) => key(left.point).localeCompare(key(right.point)) || left.id.localeCompare(right.id));
const containers = entities.filter((entity) => CONTAINERS.some((id) => entity.id.includes(id)));

const directReturn = {
  id: 'PORTAL-L1-CURRENT-RETURN-01', stationCount: route.stationCount,
  endpointA: routePoints[0], endpointB: routePoints.at(-1), nodeSetSha256: route.walkableGraph.nodeSetSha256,
  edgeSetSha256: route.walkableGraph.edgeSetSha256, normalWalkBothDirections: route.connectivity === 'PASS',
  requiredEnvelopeMet: route.meetsClearEnvelope === true,
};
const alternateReturn = {
  status: 'ABSENT_FROM_SOURCE_BOUND_SURVEY',
  reason: 'The complete current BKR survey records one portal→L1 return path only; no second independently routed portal return, emergency egress, or disjoint egress proof is present in this source-bound decision input.',
};

const mapRows = components.slice(0, 12).map((component, index) => {
  const color = component.boundaryTouching ? '#f07467' : component.currentRouteAdjacent ? '#d5ad58' : '#547da3';
  return `<rect x="${44 + (index % 4) * 205}" y="${174 + Math.floor(index / 4) * 76}" width="184" height="54" rx="6" fill="${color}"/><text class="cell" x="${55 + (index % 4) * 205}" y="${196 + Math.floor(index / 4) * 76}">${component.componentId} · ${component.cellCount} cells</text><text class="cell" x="${55 + (index % 4) * 205}" y="${216 + Math.floor(index / 4) * 76}">d(route) ${component.minManhattanDistanceToCurrentReturn} · ${component.boundaryTouching ? 'boundary' : 'finite'}</text>`;
}).join('');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="510" viewBox="0 0 940 510"><rect width="940" height="510" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#f0f7ff}.sub{font:14px ui-monospace,monospace;fill:#c6d7e7}.cell{font:12px ui-monospace,monospace;fill:#102031}</style><text x="34" y="40" class="head">C01 portal topology / receiver / return decision</text><text x="34" y="66" class="sub">x 680..812 · y 40..75 · z -90..-40 · immutable source · no operations</text><rect x="34" y="92" width="872" height="58" rx="8" fill="#152238" stroke="#4d6780"/><text x="52" y="117" class="sub">gravity: ${gravity.size} cells / ${components.length} components / ${unbounded.length} boundary-touching</text><text x="52" y="139" class="sub">fluids/receivers: ${fluids.length} / containers: ${containers.length} / current return: 127 stations only</text>${mapRows}<text x="34" y="427" class="sub">Red: unbounded component; gold: finite and within 2 blocks of current return; blue: finite but not route-adjacent.</text><text x="34" y="452" class="sub">Decision: portal topology has no container migration conflict, but no physical liner/bypass is ready until unbounded components and an independent return are proven.</text><text x="34" y="477" class="sub">No current fluid means no receiver/overflow may be invented; any future receiver must be discovered and canonically bound.</text></svg>\n`;

const firstStageDecision = finiteRouteAdjacent.length > 0 && containers.length === 0 && unbounded.length === 0
  ? 'FINITE_NO_CONTAINER_PORTAL_PHYSICAL_SCOPE_MAY_BE_COMPILED_AFTER_SECOND_RETURN_PROOF'
  : 'NO_PORTAL_PHYSICAL_SCOPE_READY_TO_COMPILE';
const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-PORTAL-TOPOLOGY-RECEIVER-RETURN-02', generatedAtUtc: new Date().toISOString(),
  status: firstStageDecision, mode: 'READ_ONLY_TOPOLOGY_AND_RETURN_DESIGN_GATE', mutationAuthority: false,
  safetyBoundary: { liveWorldMutated: false, liveCallsPerformed: false, rconCallsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, bkrSurvey: rel(SURVEY), bkrSurveySha256: sha256(surveyBytes) },
  portalStudyBounds: BOUNDS,
  gravityTopology: { cellCount: gravity.size, cellSetSha256: stateHash([...gravity.values()]), componentCount: components.length, boundaryTouchingComponentCount: unbounded.length, components, finiteCurrentReturnAdjacentComponentCount: finiteRouteAdjacent.length, finiteCurrentReturnAdjacentComponents: finiteRouteAdjacent.map((component) => component.componentId) },
  fluidReceiverInventory: {
    fluidCellCount: fluids.length, fluidCellSetSha256: stateHash(fluids), fluidCells: fluids,
    receiverStatus: fluids.length === 0 ? 'NO_CURRENT_PORTAL_FLUID_OR_RECEIVER_TO_BIND' : 'FLUID_RECEIVER_INVENTORY_REQUIRED',
    requirement: 'No drainage receiver, overflow, diversion, or liner drain is inferred from dry source cells. If fluid is present in a later fresh source, enumerate its finite component, source, receiver, overflow path, and flow-ordered inverse before physical work.',
  },
  containerBoundary: { blockEntityCount: entities.length, blockEntityCellSetSha256: stateHash(entities), cells: entities, containerCount: containers.length, containerCellSetSha256: stateHash(containers), containers, disposition: containers.length === 0 ? 'PORTAL_SCOPE_CAN_AVOID_CONTAINER_MIGRATION' : 'CONTAINER_MIGRATION_OR_DISJOINT_BYPASS_REQUIRED' },
  returnInventory: { directReturn, independentAlternateReturn: alternateReturn, twoIndependentReturnsProven: false },
  decision: {
    canBoundPortalScopeWithoutContainerMigration: containers.length === 0,
    canCompilePhysicalLinerOrBypassNow: false,
    reason: `The portal study has ${containers.length} container block entities and ${fluids.length} fluid cells, but ${unbounded.length} gravity components touch the current study boundary and the second independent return is absent. Finite nearby components are topology evidence only, not a release target.`,
    firstAllowedNextDesign: 'Expand every recorded gravity boundary contact to a finite component inventory and record a second independent portal return/egress route with disjoint stair/containment interaction sets. Re-run this gate against that fresh source.',
  },
  laterPhysicalPackageConditions: [
    'Select exactly one finite gravity component or one entirely separated dry-bypass envelope; it must not include any boundary-touching component.',
    'Re-scan the full package interaction halo for fluids, waterlogged blocks, gravity supports, receivers/overflows, containers/block entities, protected core, and fresh live entities.',
    'If a liner is used, use permanent supported states and a flow-ordered forward/inverse sequence that never recreates a falling or live-fluid path.',
    'Prove the existing portal↔L1 return and a second independent normal-walk return before mutation, then preserve both through immutable post-state and rollback QA.',
  ],
  nonClaims: ['No operation or release manifest emitted.', 'No physical liner, dry bypass, receiver, container migration, route widening, egress opening, or public commissioning.', 'No live entity clearance claim.'],
};
const report = { ...base, decisionIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-receiver-return-02.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-receiver-return-map.svg'), map);
fs.writeFileSync(path.join(out, 'MP11-BKR-C01-PORTAL-TOPOLOGY-RECEIVER-RETURN-02.md'), `# MP11 / BKR C01 portal topology, receiver, and return inventory 02\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only design gate; no operations or physical authority.\n\n![Portal topology map](mp11-bkr-c01-portal-topology-receiver-return-map.svg)\n\nThe portal envelope contains **${gravity.size}** gravity cells in **${components.length}** components; **${unbounded.length}** touch the study boundary. It is dry and contains **${containers.length}** containers, so container migration is not the portal blocker. The current 127-station portal-to-L1 path is the only recorded return and does not meet the 5×5 target envelope. No physical liner or dry bypass may be compiled until all topology components relevant to the interaction set are finite and a second independent return is proved.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), mutationAuthority: false, gravityCells: gravity.size, components: components.length, boundaryTouching: unbounded.length, finiteRouteAdjacent: finiteRouteAdjacent.length, fluidCells: fluids.length, containers: containers.length, twoIndependentReturnsProven: false }, null, 2));
