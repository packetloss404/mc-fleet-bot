#!/usr/bin/env node
/**
 * Read-only first physical-design gate for the C01 portal gravity boundary.
 *
 * It selects one materially sized, dry, fully finite gravity component whose
 * full one-cell interaction halo is outside both post-source return paths and
 * both endpoint volumes. It binds canonical source/target states and a
 * support-safe forward/rollback sequence, but intentionally emits neither
 * operation files nor a release manifest.
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
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-02-c01-independent-return-post-20260827T014500Z/bkr-survey-00.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp11-bkr-c01-portal-topology-second-return-05-independent-return-post-20260827T014500Z/mp11-bkr-c01-portal-topology-second-return-03.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-finite-gravity-liner-design-01-independent-return-post-20260827T014500Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR C01 finite gravity liner design rejected: ${message}`); };
const key = (point) => point.join(',');
const nameOf = (state) => String(state).split('[', 1)[0];
const stateHash = (cells) => sha256(cells.map((cell) => `${key(cell.point)}=${cell.state}`).sort().join('\n'));
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const orderedHash = (cells) => sha256(cells.map((cell) => `${key(cell.point)}=${cell.sourceState}=>${cell.targetState}`).join('\n'));
const INITIAL = { minX: 680, maxX: 812, minY: 40, maxY: 75, minZ: -90, maxZ: -40 };
const MAX_COMPONENT_CELLS = 100000;
const MIN_COMPONENT_CELLS = 16;
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone']);
const FLUID = new Set(['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column']);
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PROTECTED = new Set(['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway']);
const sixNeighbors = ([x, y, z]) => [[x - 1, y, z], [x + 1, y, z], [x, y - 1, z], [x, y + 1, z], [x, y, z - 1], [x, y, z + 1]];
const inInitial = ([x, y, z]) => x >= INITIAL.minX && x <= INITIAL.maxX && y >= INITIAL.minY && y <= INITIAL.maxY && z >= INITIAL.minZ && z <= INITIAL.maxZ;
const onInitialBoundary = ([x, y, z]) => x === INITIAL.minX || x === INITIAL.maxX || y === INITIAL.minY || y === INITIAL.maxY || z === INITIAL.minZ || z === INITIAL.maxZ;
const isGravity = (state) => GRAVITY.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const isFluid = (state) => FLUID.has(nameOf(state)) || state.includes('waterlogged=true');
const isStableSupport = (state) => !AIR.has(nameOf(state)) && !isFluid(state) && !isGravity(state) && !nameOf(state).endsWith('_carpet') && !nameOf(state).endsWith('_torch');
const boundsFor = (points) => ({
  minX: Math.min(...points.map((point) => point[0])), maxX: Math.max(...points.map((point) => point[0])),
  minY: Math.min(...points.map((point) => point[1])), maxY: Math.max(...points.map((point) => point[1])),
  minZ: Math.min(...points.map((point) => point[2])), maxZ: Math.max(...points.map((point) => point[2])),
});
const inBox = (point, box) => point[0] >= box[0] && point[0] <= box[3] && point[1] >= box[1] && point[1] <= box[4] && point[2] >= box[2] && point[2] <= box[5];

const snapshotRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `missing immutable source member ${member}`);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'selected snapshot is not an immutable complete save');
const surveyPath = abs(SURVEY); const surveyBytes = fs.readFileSync(surveyPath); const survey = JSON.parse(surveyBytes);
fail(survey.source?.snapshot?.rootDirectory === rel(SNAPSHOT) && survey.source.snapshot.captureId === capture.captureId, 'BKR survey is not exactly bound to selected snapshot');
const topologyPath = abs(TOPOLOGY); const topologyBytes = fs.readFileSync(topologyPath); const topology = JSON.parse(topologyBytes);
fail(topology.id === 'MP11-BKR-C01-PORTAL-TOPOLOGY-SECOND-RETURN-03', 'wrong topology report');
fail(topology.source?.snapshot === rel(SNAPSHOT) && topology.source.captureId === capture.captureId, 'topology report is not exactly bound to selected snapshot');
fail(topology.status === 'TOPOLOGY_FINITE_AND_SECOND_RETURN_EVIDENCED_DESIGN_INPUT_ONLY', 'finite topology and independent-return prerequisite has not passed');
fail(topology.expandedGravityTopology?.finiteComponentCount === topology.expandedGravityTopology?.expandedComponentCount
  && topology.expandedGravityTopology?.unboundedComponentCount === 0, 'topology still contains unbounded gravity');
const routeBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal');
const currentRoute = routeBox?.routes?.find((route) => route.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
fail(currentRoute?.connectivity === 'PASS' && currentRoute.stations?.length === topology.currentReturn?.stationCount, 'current route inventory drifted from topology');
const independentRoute = topology.independentReturnSurvey;
fail(independentRoute?.status === 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND' && independentRoute.stations?.length > 0 && independentRoute.independentFromCurrentInteriorHalo === true, 'disjoint return prerequisite absent');
const outputDir = abs(OUT); fail(!fs.existsSync(outputDir), '--out must be a fresh directory');

const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const cache = new Map();
async function block(point) {
  const cacheKey = key(point);
  if (!cache.has(cacheKey)) cache.set(cacheKey, stateToCommandString(await reader.blockState(...point)));
  return cache.get(cacheKey);
}
async function blockEntities(bounds) {
  const result = [];
  for (let chunkX = Math.floor(bounds.minX / 16); chunkX <= Math.floor(bounds.maxX / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(bounds.minZ / 16); chunkZ <= Math.floor(bounds.maxZ / 16); chunkZ += 1) {
      const chunk = await reader.chunk(chunkX, chunkZ);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
        if (point[0] >= bounds.minX && point[0] <= bounds.maxX && point[1] >= bounds.minY && point[1] <= bounds.maxY && point[2] >= bounds.minZ && point[2] <= bounds.maxZ) result.push({ point, id: String(entity.id ?? 'unknown') });
      }
    }
  }
  return result.sort((left, right) => key(left.point).localeCompare(key(right.point)) || left.id.localeCompare(right.id));
}

const initialGravity = new Map();
for (let x = INITIAL.minX; x <= INITIAL.maxX; x += 1) for (let y = INITIAL.minY; y <= INITIAL.maxY; y += 1) for (let z = INITIAL.minZ; z <= INITIAL.maxZ; z += 1) {
  const point = [x, y, z]; const state = await block(point); if (isGravity(state)) initialGravity.set(key(point), { point, state });
}
const unseen = new Set(initialGravity.keys()); const boundarySeeds = [];
while (unseen.size) {
  const first = unseen.values().next().value; const stack = [initialGravity.get(first)]; const component = []; unseen.delete(first);
  while (stack.length) {
    const cell = stack.pop(); component.push(cell);
    for (const point of sixNeighbors(cell.point)) { const neighborKey = key(point); if (unseen.delete(neighborKey)) stack.push(initialGravity.get(neighborKey)); }
  }
  if (component.some((cell) => onInitialBoundary(cell.point))) boundarySeeds.push(...component.filter((cell) => onInitialBoundary(cell.point)));
}
fail(boundarySeeds.length === topology.expandedGravityTopology.originalBoundarySeedCellCount, 'initial boundary seed set drifted from topology');

const visited = new Set(); const components = [];
for (const seed of boundarySeeds) {
  if (visited.has(key(seed.point))) continue;
  const stack = [seed]; const cells = []; visited.add(key(seed.point)); let capped = false;
  while (stack.length) {
    const cell = stack.pop(); cells.push(cell);
    if (cells.length > MAX_COMPONENT_CELLS) { capped = true; break; }
    for (const point of sixNeighbors(cell.point)) {
      const neighborKey = key(point); if (visited.has(neighborKey)) continue;
      const state = await block(point); if (!isGravity(state)) continue;
      visited.add(neighborKey); stack.push({ point, state });
    }
  }
  components.push({ cells, capped, bounds: boundsFor(cells.map((cell) => cell.point)) });
}
components.sort((left, right) => left.bounds.minX - right.bounds.minX || left.bounds.minY - right.bounds.minY || left.bounds.minZ - right.bounds.minZ || left.cells.length - right.cells.length);
components.forEach((component, index) => { component.componentId = `EXP-G${String(index + 1).padStart(2, '0')}`; component.cellSetSha256 = stateHash(component.cells); });
fail(components.length === topology.expandedGravityTopology.expandedComponentCount, 'expanded component count drifted from topology');
for (const component of components) {
  const expected = topology.expandedGravityTopology.components.find((entry) => entry.componentId === component.componentId);
  fail(expected?.cellSetSha256 === component.cellSetSha256 && expected.cellCount === component.cells.length && expected.classification === 'FINITE_IN_COMPLETE_IMMUTABLE_SOURCE', `${component.componentId} no longer matches finite topology evidence`);
}

const routeHalo = new Set();
for (const point of [...currentRoute.stations.map((station) => station.point), ...independentRoute.stations]) {
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) routeHalo.add(key([point[0] + dx, point[1] + dy, point[2] + dz]));
}
const endpointCells = [];
for (const endpoint of [currentRoute.startAnchor, currentRoute.endAnchor]) for (let x = endpoint[0]; x <= endpoint[3]; x += 1) for (let y = endpoint[1]; y <= endpoint[4]; y += 1) for (let z = endpoint[2]; z <= endpoint[5]; z += 1) endpointCells.push([x, y, z]);
const endpointSet = new Set(endpointCells.map(key));

async function assess(component) {
  const componentSet = new Set(component.cells.map((cell) => key(cell.point)));
  const halo = new Map();
  for (const cell of component.cells) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const point = [cell.point[0] + dx, cell.point[1] + dy, cell.point[2] + dz]; halo.set(key(point), point);
  }
  const haloPoints = [...halo.values()]; const haloBounds = boundsFor(haloPoints);
  const haloStates = [];
  for (const point of haloPoints) haloStates.push({ point, state: await block(point) });
  const fluids = haloStates.filter((cell) => isFluid(cell.state));
  // A diagonally/orthogonally adjacent but separate gravity component is not
  // part of this finite liner. Leaving it in the full interaction halo makes
  // the later guarded compiler reject the package, and more importantly means
  // a supposedly dry, stable containment edge still has falling material in
  // its safety envelope. Exclude it at design time rather than discovering it
  // only during package preparation.
  const externalGravity = haloStates.filter((cell) => isGravity(cell.state) && !componentSet.has(key(cell.point)));
  const protectedCells = haloStates.filter((cell) => PROTECTED.has(nameOf(cell.state)));
  const routeIntersections = haloPoints.filter((point) => routeHalo.has(key(point)));
  const endpointIntersections = haloPoints.filter((point) => endpointSet.has(key(point)));
  const entities = await blockEntities(haloBounds);
  const rollbackChecks = [];
  for (const cell of component.cells) {
    const below = [cell.point[0], cell.point[1] - 1, cell.point[2]];
    const belowKey = key(below); const belowState = await block(below);
    rollbackChecks.push({ point: cell.point, below, belowIsComponentCell: componentSet.has(belowKey), belowState, supportSafeAtRestore: componentSet.has(belowKey) || isStableSupport(belowState) });
  }
  const distanceToReturn = Math.min(...component.cells.flatMap((cell) => [...currentRoute.stations.map((station) => station.point), ...independentRoute.stations]
    .map((point) => Math.abs(cell.point[0] - point[0]) + Math.abs(cell.point[1] - point[1]) + Math.abs(cell.point[2] - point[2]))));
  const reasons = [];
  if (component.capped) reasons.push('scan-cap');
  if (component.cells.length < MIN_COMPONENT_CELLS) reasons.push(`below-${MIN_COMPONENT_CELLS}-cell-minimum`);
  if (fluids.length) reasons.push('fluid-in-full-interaction-halo');
  if (externalGravity.length) reasons.push('separate-gravity-in-full-interaction-halo');
  if (protectedCells.length) reasons.push('protected-core-indicator-in-full-interaction-halo');
  if (entities.length) reasons.push('block-entity-in-full-interaction-halo');
  if (routeIntersections.length) reasons.push('verified-return-halo-intersection');
  if (endpointIntersections.length) reasons.push('endpoint-volume-intersection');
  if (rollbackChecks.some((check) => !check.supportSafeAtRestore)) reasons.push('unsupported-source-gravity-on-rollback');
  return { ...component, haloPoints, haloBounds, fluids, externalGravity, protectedCells, entities, routeIntersections, endpointIntersections, rollbackChecks, distanceToReturn, reasons, eligible: reasons.length === 0 };
}
const assessed = [];
for (const component of components) assessed.push(await assess(component));
const eligible = assessed.filter((component) => component.eligible).sort((left, right) => left.distanceToReturn - right.distanceToReturn || right.cells.length - left.cells.length || left.componentId.localeCompare(right.componentId));
fail(eligible.length > 0, 'no materially sized dry, supported, return-disjoint finite component qualifies for a static liner design');
const selected = eligible[0];
const targetState = 'minecraft:smooth_stone';
const forward = [...selected.cells].sort((left, right) => left.point[1] - right.point[1] || left.point[0] - right.point[0] || left.point[2] - right.point[2])
  .map((cell, index) => ({ sequence: index + 1, point: cell.point, sourceState: cell.state, targetState, role: 'permanent-gravity-liner', orderReason: 'bottom-up: every lower selected cell becomes stable liner before any selected cell above it can update' }));
const rollback = [...forward].reverse().map((cell, index) => ({ ...cell, sequence: index + 1, sourceState: cell.targetState, targetState: cell.sourceState, role: 'exact-source-restoration', orderReason: 'top-down: every lower selected cell remains smooth-stone liner until the higher source gravity cell is restored' }));
fail(forward.every((cell, index) => rollback[rollback.length - 1 - index].point.join(',') === cell.point.join(',') && rollback[rollback.length - 1 - index].targetState === cell.sourceState), 'rollback sequence is not exact forward reversal');
fail(selected.rollbackChecks.every((check) => check.supportSafeAtRestore), 'no-falling rollback support proof failed');
const canonicalTargetStates = forward.map(({ point, targetState: state, role }) => ({ point, state, role }));

const planBounds = {
  minX: Math.min(INITIAL.minX, selected.bounds.minX, ...currentRoute.stations.map((station) => station.point[0]), ...independentRoute.stations.map((point) => point[0]), ...assessed.map((component) => component.bounds.minX)),
  maxX: Math.max(INITIAL.maxX, selected.bounds.maxX, ...currentRoute.stations.map((station) => station.point[0]), ...independentRoute.stations.map((point) => point[0]), ...assessed.map((component) => component.bounds.maxX)),
  minZ: Math.min(INITIAL.minZ, selected.bounds.minZ, ...currentRoute.stations.map((station) => station.point[2]), ...independentRoute.stations.map((point) => point[2]), ...assessed.map((component) => component.bounds.minZ)),
  maxZ: Math.max(INITIAL.maxZ, selected.bounds.maxZ, ...currentRoute.stations.map((station) => station.point[2]), ...independentRoute.stations.map((point) => point[2]), ...assessed.map((component) => component.bounds.maxZ)),
};
const left = 78; const top = 118; const width = 1050; const height = 530;
const project = ([x, , z]) => [left + ((x - planBounds.minX) / (planBounds.maxX - planBounds.minX || 1)) * width, top + ((planBounds.maxZ - z) / (planBounds.maxZ - planBounds.minZ || 1)) * height];
const routePath = (points) => points.map((point, index) => `${index ? 'L' : 'M'}${project(point).map((value) => value.toFixed(1)).join(' ')}`).join(' ');
const componentBoxes = assessed.map((component) => {
  const start = project([component.bounds.minX, 0, component.bounds.maxZ]); const end = project([component.bounds.maxX, 0, component.bounds.minZ]);
  const selectedClass = component.componentId === selected.componentId;
  return `<rect x="${start[0].toFixed(1)}" y="${start[1].toFixed(1)}" width="${Math.max(4, end[0] - start[0]).toFixed(1)}" height="${Math.max(4, end[1] - start[1]).toFixed(1)}" fill="${selectedClass ? '#e4a84f' : '#566c83'}" fill-opacity="${selectedClass ? '.75' : '.38'}" stroke="${selectedClass ? '#ffe0a2' : '#93a9bc'}"/><text x="${(start[0] + 3).toFixed(1)}" y="${(start[1] + 13).toFixed(1)}" class="tag">${component.componentId}</text>`;
}).join('');
const plan = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c6d7e7}.tag{font:10px ui-monospace,monospace;fill:#eff7ff}</style><text x="40" y="42" class="head">C01 finite gravity liner — static design selection</text><text x="40" y="68" class="sub">Gold ${selected.componentId}: ${selected.cells.length} canonical gravity cells → permanent smooth-stone liner; no physical operations emitted</text><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#152238" stroke="#40566e"/>${componentBoxes}<path d="${routePath(currentRoute.stations.map((station) => station.point))}" fill="none" stroke="#65c7ff" stroke-width="4"/><path d="${routePath(independentRoute.stations)}" fill="none" stroke="#69d391" stroke-width="4"/><text x="78" y="684" class="sub">Blue: current ${currentRoute.stations.length}-station trace. Green: verified disjoint ${independentRoute.stations.length}-station return. Gold: selected dry, return-disjoint finite liner component.</text><text x="78" y="710" class="sub">Grey: other finite former-boundary components. This is containment design only: it does not widen or open either endpoint.</text></svg>\n`;
const sectionCells = [...selected.cells].sort((leftCell, rightCell) => leftCell.point[1] - rightCell.point[1] || leftCell.point[0] - rightCell.point[0] || leftCell.point[2] - rightCell.point[2]);
const section = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560"><rect width="1200" height="560" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c6d7e7}.cell{font:11px ui-monospace,monospace;fill:#142238}</style><text x="40" y="42" class="head">${selected.componentId} — no-falling forward / rollback design</text><text x="40" y="68" class="sub">Forward is bottom-up smooth stone. Exact rollback is top-down source restoration while lower liner remains support.</text>${sectionCells.map((cell, index) => `<rect x="${54 + (index % 8) * 140}" y="${110 + Math.floor(index / 8) * 55}" width="126" height="42" rx="5" fill="#e4a84f"/><text x="${62 + (index % 8) * 140}" y="${128 + Math.floor(index / 8) * 55}" class="cell">F${String(index + 1).padStart(3, '0')} / R${String(sectionCells.length - index).padStart(3, '0')}</text><text x="${62 + (index % 8) * 140}" y="${144 + Math.floor(index / 8) * 55}" class="cell">${key(cell.point)}</text>`).join('')}<text x="54" y="${150 + Math.ceil(sectionCells.length / 8) * 55}" class="sub">${selected.rollbackChecks.length}/${selected.rollbackChecks.length} source-gravity restorations have either a selected lower liner cell or an exact stable source support below.</text><text x="54" y="${178 + Math.ceil(sectionCells.length / 8) * 55}" class="sub">No endpoint cube, return halo, fluid, protected-core indicator, or block entity intersects the selected full one-cell halo.</text></svg>\n`;

const base = {
  schemaVersion: 1,
  id: 'MP11-BKR-C01-FINITE-GRAVITY-LINER-DESIGN-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'STATIC_DESIGN_COMPLETE_PHYSICAL_OPERATIONS_REMAIN_DENIED',
  mode: 'READ_ONLY_EXACT_CELL_AND_NO_FALLING_INVERSE_DESIGN',
  mutationAuthority: false,
  safetyBoundary: { liveWorldMutated: false, liveCallsPerformed: false, rconCallsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, survey: { path: rel(SURVEY), sha256: sha256(surveyBytes) }, topology: { path: rel(TOPOLOGY), sha256: sha256(topologyBytes), decisionIdentitySha256: topology.decisionIdentitySha256 } },
  selectionPolicy: { minimumComponentCells: MIN_COMPONENT_CELLS, selectedBy: 'nearest eligible component to either verified return; tie-break larger component then component identifier', selectionDoesNotAuthorizeMutation: true },
  prerequisites: { originalBoundaryComponentCount: topology.expandedGravityTopology.originalBoundaryComponentCount, expandedFiniteComponentCount: topology.expandedGravityTopology.finiteComponentCount, unboundedComponentCount: topology.expandedGravityTopology.unboundedComponentCount, currentReturnStations: currentRoute.stations.length, independentReturnStations: independentRoute.stations.length, independentReturnDisjointFromCurrentInteriorHalo: independentRoute.independentFromCurrentInteriorHalo },
  candidateAssessments: assessed.map((component) => ({ componentId: component.componentId, cellCount: component.cells.length, cellSetSha256: component.cellSetSha256, bounds: component.bounds, fullHaloCellCount: component.haloPoints.length, fullHaloCellSetSha256: pointHash(component.haloPoints), distanceToVerifiedReturn: component.distanceToReturn, fluidCellCount: component.fluids.length, separateGravityInFullHaloCellCount: component.externalGravity.length, protectedIndicatorCount: component.protectedCells.length, blockEntityCount: component.entities.length, returnHaloIntersectionCount: component.routeIntersections.length, endpointVolumeIntersectionCount: component.endpointIntersections.length, unsupportedRollbackSourceCellCount: component.rollbackChecks.filter((check) => !check.supportSafeAtRestore).length, eligible: component.eligible, ineligibleReasons: component.reasons })),
  selectedFiniteLiner: {
    componentId: selected.componentId, purpose: 'Permanent dry gravity containment at a finite, return-disjoint portal-approach boundary; no corridor carve, widening, endpoint change, or access-class change.', sourceComponentCellCount: selected.cells.length, sourceComponentCellSetSha256: selected.cellSetSha256, sourceBounds: selected.bounds,
    fullInteractionHalo: { cellCount: selected.haloPoints.length, cellSetSha256: pointHash(selected.haloPoints), fluidCellCount: selected.fluids.length, separateGravityInFullHaloCellCount: selected.externalGravity.length, protectedIndicatorCount: selected.protectedCells.length, blockEntityCount: selected.entities.length, verifiedReturnHaloIntersectionCount: selected.routeIntersections.length, endpointVolumeIntersectionCount: selected.endpointIntersections.length },
    canonicalTargetStates: { targetState, cellCount: canonicalTargetStates.length, cellSetSha256: stateHash(canonicalTargetStates), cells: canonicalTargetStates },
    forwardDesign: { operationCount: forward.length, orderedCellSetSha256: orderedHash(forward), order: forward, noFallingRule: 'bottom-up source-to-liner order; lower selected cells become stable smooth stone before higher selected cells are touched' },
    rollbackDesign: { operationCount: rollback.length, orderedCellSetSha256: orderedHash(rollback), exactReverseOfForward: true, order: rollback, noFallingRule: 'top-down liner-to-source order; every lower selected cell remains smooth stone until restoration above it is complete', supportChecks: selected.rollbackChecks, supportCheckPassCount: selected.rollbackChecks.filter((check) => check.supportSafeAtRestore).length },
  },
  endpointInterfaceNonclaims: [
    'The selected component and its full one-cell halo do not intersect either surveyed portal/L1 endpoint volume; this design neither changes nor opens an endpoint.',
    'The selected component and its full one-cell halo do not intersect either verified return halo; this design does not widen, carve, reclassify, or commission either return.',
    'No water, lava, bubble column, waterlogged state, separate gravity component, block entity, or protected-core indicator is in the selected full interaction halo; this does not authorize an inference about any other C01 cell.',
  ],
  requiredBeforeAnyPhysicalOperations: [
    'Assign an exact C01 portal-containment scope owner and counterpart endpoint/interface reviewer for every target and interaction-halo cell; accept the exact target/halo cell set without wildcard ownership.',
    'Run a fresh complete source capture and re-run this static design. Any source, component, return, endpoint, fluid, block-entity, protected-core, or support drift rejects the later compiler.',
    'A dedicated compiler must turn this design-only ordered mapping into complete forward and rollback operation files, then prove parser strict-noop, exact source/preflight, protected-core and block-entity clearance, fresh live-entity clearance, journaled execution, fresh post capture, rollback post-state preflight, and independent containment/return QA.',
  ],
  nonClaims: ['No operation files or release manifest emitted.', 'No RCON, Minecraft, fleet API, or live-world action.', 'No liner placed, dry bypass carved, endpoint opened, route widened, access reclassified, public access commissioned, or egress approved.'],
};
const report = { ...base, designIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'mp11-bkr-c01-finite-gravity-liner-design-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'mp11-bkr-c01-finite-gravity-liner-plan.svg'), plan);
fs.writeFileSync(path.join(outputDir, 'mp11-bkr-c01-finite-gravity-liner-order.svg'), section);
fs.writeFileSync(path.join(outputDir, 'MP11-BKR-C01-FINITE-GRAVITY-LINER-DESIGN-01.md'), `# MP11 / BKR C01 finite gravity liner design 01\n\n**Status:** \`${report.status}\`  \n**Authority:** static, read-only exact-cell design; no physical operation or mutation authority.\n\n![Coordinate selection plan](mp11-bkr-c01-finite-gravity-liner-plan.svg)\n\n![No-falling order map](mp11-bkr-c01-finite-gravity-liner-order.svg)\n\nThe design selects **${selected.componentId}**: **${selected.cells.length}** fully finite, dry, return-disjoint gravity cells. Its source cells are mapped one-for-one to permanent smooth stone in a bottom-up forward order; the exact inverse is top-down source restoration, with **${selected.rollbackChecks.length}/${selected.rollbackChecks.length}** rollback support checks passing. Its complete one-cell halo has zero fluid, block-entity, protected-indicator, verified-return-halo, and endpoint-volume intersections.\n\nThis is a static containment design only. It emits no RCON operations or release manifest, does not touch either endpoint or return, and does not authorize a liner, bypass, widening, opening, commissioning, or egress claim.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(outputDir), mutationAuthority: false, selectedComponent: selected.componentId, selectedCells: selected.cells.length, forwardDesignCells: forward.length, rollbackDesignCells: rollback.length, rollbackSupportPasses: selected.rollbackChecks.filter((check) => check.supportSafeAtRestore).length, candidateCount: assessed.length }, null, 2));
