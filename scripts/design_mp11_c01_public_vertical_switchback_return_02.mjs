#!/usr/bin/env node
/**
 * MP11 C01 public-vertical switchback / independent-return design 02.
 *
 * This is intentionally a source-bound, read-only design record.  It binds
 * two full 5-wide × 5-clear-high future vertical lanes, their retained public
 * landing connectors, and exact endpoint-interface source volumes.  It does
 * not write an operation file, release manifest, RCON command, or mutation
 * authority.  The return lane is designed first so the protected current
 * switchback is never the sole route during any future construction package.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z');
const PHYSICAL_DESIGN = option('--physical-design', 'data/world-review/mp11-c01-dimension-physical-01-c01-08-post-20260828T040000Z/mp11-c01-dimension-physical-01.json');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-00-c01-08-post-20260828T040000Z/bkr-survey-00.json');
const OUT = option('--out', 'data/world-review/mp11-c01-public-vertical-switchback-return-02-c01-08-post-20260828T040000Z');
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11 C01 public-vertical switchback/return design rejected: ${message}`); };
const key = (point) => point.join(',');
const pointHash = (points) => sha(points.map(key).sort().join('\n'));
const orderedHash = (points) => sha(points.map(key).join('\n'));
const cellHash = (cells) => sha(cells.map((cell) => `${key(cell.point)}=${cell.state}`).sort().join('\n'));
const stateName = (state) => String(state).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone']);
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const gravity = (state) => GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isAir = (state) => AIR.has(stateName(state));
const inside = (point, bounds) => point[0] >= bounds.minX && point[0] <= bounds.maxX && point[1] >= bounds.minY && point[1] <= bounds.maxY && point[2] >= bounds.minZ && point[2] <= bounds.maxZ;

const snapshotRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `missing complete immutable source member ${member}`);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not a complete immutable capture');
const physicalBytes = fs.readFileSync(abs(PHYSICAL_DESIGN)); const physical = JSON.parse(physicalBytes);
const surveyBytes = fs.readFileSync(abs(SURVEY)); const survey = JSON.parse(surveyBytes);
fail(physical.id === 'MP11-C01-DIMENSION-PHYSICAL-01' && physical.mutationAuthority === false, 'prior public defect design is not a read-only C01 design');
fail(physical.source?.captureId === capture.captureId && physical.source?.snapshot === rel(SNAPSHOT), 'prior public defect design is not bound to this exact post-C01-08 source');
fail(survey.source?.snapshot?.captureId === capture.captureId && survey.source.snapshot.rootDirectory === rel(SNAPSHOT), 'BKR survey is not bound to this exact post-C01-08 source');
const publicRoute = survey.namedSurveyBoxes?.find((box) => box.boxId === 'publicC01')?.routes?.find((route) => route.routeId === 'TE-ROUTE-C01-PUBLIC-VERTICAL');
fail(publicRoute?.stationCount === 89 && publicRoute.connectivity === 'PASS' && publicRoute.routePass === false, 'current protected public vertical route identity drift');
fail(publicRoute.programStandard?.minWidth === 5 && publicRoute.programStandard?.minHeight === 5, 'public common 5×5 standard drift');

// Both lanes descend eighteen levels.  A single level landing at the fold
// makes the reversal physically legible while preserving normal-walk rises.
const makeVerticalLane = (id, firstFlightZ, foldOffset) => {
  const stations = [];
  for (let index = 0; index <= 8; index += 1) stations.push({ point: [839 + index, 43 - index, firstFlightZ], axis: 'x', role: 'descent-east' });
  stations.push({ point: [848, 35, firstFlightZ], axis: 'x', role: 'fold-landing' });
  stations.push({ point: [849, 35, firstFlightZ], axis: 'x', role: 'fold-landing' });
  for (let index = 1; index <= Math.abs(foldOffset); index += 1) stations.push({ point: [849, 35, firstFlightZ + Math.sign(foldOffset) * index], axis: 'z', role: 'fold-landing' });
  const secondFlightZ = firstFlightZ + foldOffset;
  stations.push({ point: [848, 35, secondFlightZ], axis: 'x', role: 'fold-landing' });
  stations.push({ point: [847, 35, secondFlightZ], axis: 'x', role: 'fold-landing' });
  for (let index = 1; index <= 10; index += 1) stations.push({ point: [847 - index, 35 - index, secondFlightZ], axis: 'x', role: 'descent-west' });
  fail(stations[0].point[0] === 839 && stations[0].point[1] === 43 && stations.at(-1).point[0] === 837 && stations.at(-1).point[1] === 25, `${id} endpoint geometry drift`);
  for (let index = 1; index < stations.length; index += 1) {
    const previous = stations[index - 1].point; const station = stations[index].point;
    const horizontal = Math.abs(station[0] - previous[0]) + Math.abs(station[2] - previous[2]);
    fail(horizontal === 1 && Math.abs(station[1] - previous[1]) <= 1, `${id} contains a non-normal-walk transition at station ${index}`);
  }
  return { id, firstFlightZ, secondFlightZ, foldOffset, stations };
};
const main = makeVerticalLane('C01-PUBLIC-SWITCHBACK-MAIN-02', -47, -7);
const returning = makeVerticalLane('C01-PUBLIC-INDEPENDENT-RETURN-02', -64, -5);

// The exact future geometry is deliberately stored as geometry, not as an
// operation.  A later physical compiler must still choose scopes/orders and
// prove a complete forward/inverse change set from a fresh capture.
const stairState = (facing) => `minecraft:polished_blackstone_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`;
function addTarget(targets, point, state, role) {
  const existing = targets.get(key(point));
  if (existing && existing.state !== state) {
    const foldTransition = [existing.role, role].includes('fold-landing') && [existing.role, role].includes('five-wide-tread') && !isAir(existing.state) && !isAir(state);
    fail(foldTransition, `candidate geometry assigns conflicting states at ${key(point)}`);
    targets.set(key(point), { point, state: 'minecraft:polished_blackstone', role: 'fold-landing-transition' });
    return;
  }
  fail(!existing || existing.role === role || (existing.state === state && existing.role === 'fold-landing-transition'), `candidate geometry assigns conflicting roles at ${key(point)}`);
  targets.set(key(point), { point, state, role });
}
function laneGeometry(lane) {
  const targets = new Map();
  for (const station of lane.stations) {
    const [x, y, z] = station.point;
    const supportState = station.role === 'descent-east' ? stairState('east') : station.role === 'descent-west' ? stairState('west') : 'minecraft:polished_blackstone';
    for (let cross = -2; cross <= 2; cross += 1) {
      const dx = station.axis === 'z' ? cross : 0; const dz = station.axis === 'x' ? cross : 0;
      addTarget(targets, [x + dx, y - 1, z + dz], supportState, station.role === 'fold-landing' ? 'fold-landing' : 'five-wide-tread');
      for (let dy = 0; dy < 5; dy += 1) addTarget(targets, [x + dx, y + dy, z + dz], 'minecraft:air', 'five-clear-high-envelope');
    }
    // Guard/handrail target states are deliberately not inferred here. The
    // exact 5×5 walk geometry is bound, while a later physical compiler must
    // add a compatible guard treatment without stealing a clear-face cell.
  }
  return [...targets.values()].sort((a, b) => key(a.point).localeCompare(key(b.point)) || a.state.localeCompare(b.state));
}
const mainGeometry = laneGeometry(main); const returnGeometry = laneGeometry(returning);
const pointSet = (cells) => new Set(cells.map((cell) => key(cell.point)));
const expandOne = (cells) => {
  const points = new Map();
  for (const cell of cells) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) points.set(key([cell.point[0] + dx, cell.point[1] + dy, cell.point[2] + dz]), [cell.point[0] + dx, cell.point[1] + dy, cell.point[2] + dz]);
  return points;
};
const mainPoints = pointSet(mainGeometry); const returnPoints = pointSet(returnGeometry);
const mainInteraction = expandOne(mainGeometry); const returnInteraction = expandOne(returnGeometry);
const intersections = (left, right) => [...left].filter((item) => right.has(item));
fail(intersections(mainPoints, returnPoints).length === 0, 'main and return candidate geometry overlap');
fail(intersections(new Set(mainInteraction.keys()), new Set(returnInteraction.keys())).length === 0, 'main and return interaction halos overlap');

const reader = new AnvilReader(path.join(snapshotRoot, 'region')); const blockCache = new Map();
async function block(point) { const id = key(point); if (!blockCache.has(id)) blockCache.set(id, stateToCommandString(await reader.blockState(...point))); return blockCache.get(id); }
const sourceCells = async (points) => Promise.all(points.map(async (point) => ({ point, state: await block(point) })));
function facePoints(point) {
  const values = [];
  for (let z = point[2] - 2; z <= point[2] + 2; z += 1) {
    values.push([point[0], point[1] - 1, z]);
    for (let y = point[1]; y <= point[1] + 4; y += 1) values.push([point[0], y, z]);
  }
  return values;
}
async function interfaceContract(id, point, ownerRole, direction) {
  const cells = await sourceCells(facePoints(point));
  const supports = cells.filter((cell) => cell.point[1] === point[1] - 1);
  const clears = cells.filter((cell) => cell.point[1] >= point[1]);
  fail(supports.length === 5 && clears.length === 25 && supports.every((cell) => !isAir(cell.state) && !fluid(cell.state) && !gravity(cell.state)), `${id} lacks five exact supported feet cells`);
  fail(clears.every((cell) => isAir(cell.state) && !fluid(cell.state) && !gravity(cell.state)), `${id} lacks a source-clear five-wide × five-high face`);
  return { id, role: ownerRole, direction, point, clearFace: { width: 5, height: 5, cellCount: clears.length, sourceStateSha256: cellHash(clears), cells: clears }, supportRow: { width: 5, cellCount: supports.length, sourceStateSha256: cellHash(supports), cells: supports }, allSourceCellsSha256: cellHash(cells) };
}
const interfaces = {
  mainUpper: await interfaceContract('C01-PUBLIC-MAIN-UPPER-5X5-02', main.stations[0].point, 'C01 Public Upper Landing Interface Owner', 'upper-public-landing → main switchback'),
  mainLower: await interfaceContract('C01-PUBLIC-MAIN-LOWER-5X5-02', main.stations.at(-1).point, 'C01 Public Lower Arrival Interface Owner', 'main switchback → lower-public-landing'),
  returnUpper: await interfaceContract('C01-PUBLIC-RETURN-UPPER-5X5-02', returning.stations[0].point, 'C01 Public Upper Landing Interface Owner', 'upper-public-landing → independent return'),
  returnLower: await interfaceContract('C01-PUBLIC-RETURN-LOWER-5X5-02', returning.stations.at(-1).point, 'C01 Public Lower Arrival Interface Owner', 'independent return → lower-public-landing'),
};

// Existing retained landing connectors link the two separate interfaces to the
// public landing system.  They are source-proven 5×5 corridors, not target
// cells.  The vertical lanes themselves remain mutually isolated.
function connectorPoints(centerX, y, zStart, zEnd) {
  const values = [];
  for (let z = zStart; z <= zEnd; z += 1) for (let cross = -2; cross <= 2; cross += 1) {
    const x = centerX + cross;
    values.push([x, y - 1, z]);
    for (let dy = 0; dy < 5; dy += 1) values.push([x, y + dy, z]);
  }
  return [...new Map(values.map((point) => [key(point), point])).values()];
}
async function retainedConnector(id, centerX, y, zStart, zEnd, purpose) {
  const cells = await sourceCells(connectorPoints(centerX, y, zStart, zEnd));
  const supports = cells.filter((cell) => cell.point[1] === y - 1);
  const clears = cells.filter((cell) => cell.point[1] >= y);
  fail(supports.every((cell) => !isAir(cell.state) && !fluid(cell.state) && !gravity(cell.state)), `${id} support surface drift`);
  fail(clears.every((cell) => isAir(cell.state) && !fluid(cell.state) && !gravity(cell.state)), `${id} clear envelope drift`);
  return { id, purpose, stationCount: zEnd - zStart + 1, profile: '5-wide × 5-clear-high retained existing public landing connector', sourceCellCount: cells.length, sourceStateSha256: cellHash(cells), cells };
}
const retainedConnectors = [
  await retainedConnector('C01-PUBLIC-RETAINED-UPPER-LANDING-CONNECTOR-02', 839, 43, -64, -47, 'Connects the two upper 5×5 interfaces through existing public landing fabric.'),
  await retainedConnector('C01-PUBLIC-RETAINED-LOWER-LANDING-CONNECTOR-02', 837, 25, -69, -54, 'Connects the independent-return lower interface to the lower public arrival landing without using either vertical lane interior.'),
];

const relevantBounds = { minX: 832, maxX: 853, minY: 23, maxY: 49, minZ: -74, maxZ: -42 };
const entities = [];
for (let cx = Math.floor(relevantBounds.minX / 16); cx <= Math.floor(relevantBounds.maxX / 16); cx += 1) for (let cz = Math.floor(relevantBounds.minZ / 16); cz <= Math.floor(relevantBounds.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
    if (inside(point, relevantBounds)) entities.push({ point, id: String(entity.id ?? 'unknown') });
  }
}
entities.sort((a, b) => key(a.point).localeCompare(key(b.point)) || a.id.localeCompare(b.id));
const targetAndInteraction = new Map([...mainInteraction, ...returnInteraction]);
fail(entities.every((entity) => !targetAndInteraction.has(key(entity.point))), 'a block entity is inside a future-lane interaction set');
const interactionStates = async (interaction) => sourceCells([...interaction.values()]);
const mainHaloCells = await interactionStates(mainInteraction); const returnHaloCells = await interactionStates(returnInteraction);
const unsafe = (cells) => cells.filter((cell) => fluid(cell.state) || gravity(cell.state));
fail(unsafe(mainHaloCells).length === 0 && unsafe(returnHaloCells).length === 0, 'future lane or one-cell interaction halo contains fluid/waterlogging/gravity');

const currentInteriorHalo = new Set();
for (const station of publicRoute.stations.slice(1, -1)) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) currentInteriorHalo.add(key([station.point[0] + dx, station.point[1] + dy, station.point[2] + dz]));
const returnVsCurrent = intersections(new Set(returnInteraction.keys()), currentInteriorHalo);
fail(returnVsCurrent.length === 0, 'independent return overlaps the current protected switchback interior halo');
const mainVsCurrent = intersections(new Set(mainInteraction.keys()), currentInteriorHalo);
fail(mainVsCurrent.length > 0, 'main redesign must explicitly identify its protected-route overlap');

const geometrySummary = (lane, geometry, interaction) => ({
  id: lane.id,
  stationCount: lane.stations.length,
  stations: lane.stations,
  orderedStationSha256: orderedHash(lane.stations.map((station) => station.point)),
  stationSetSha256: pointHash(lane.stations.map((station) => station.point)),
  maxStepRiseOrDrop: 1,
  foldLanding: { stationCount: lane.stations.filter((station) => station.role === 'fold-landing').length, sourceLevel: 35, targetFloorLevel: 34, geometry: 'five-wide east-flight approach, protected 5-wide lateral fold, and five-wide west-flight departure' },
  publicClearance: { width: 5, clearHeight: 5, profile: 'five support/tread cells across; five clear cells above each station' },
  candidateTargetGeometry: { cellCount: geometry.length, targetStateSha256: sha(geometry.map((cell) => `${key(cell.point)}=${cell.state}`).sort().join('\n')), cells: geometry },
  sourceInteractionHalo: { cellCount: interaction.size, sourceStateSha256: cellHash(lane.id === main.id ? mainHaloCells : returnHaloCells), fluidOrGravityCount: unsafe(lane.id === main.id ? mainHaloCells : returnHaloCells).length },
});
const base = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-VERTICAL-SWITCHBACK-RETURN-DESIGN-02',
  generatedAtUtc: new Date().toISOString(),
  status: 'SOURCE_BOUND_5X5_PUBLIC_SWITCHBACK_AND_INDEPENDENT_RETURN_DESIGN_ONLY',
  mode: 'READ_ONLY_CANDIDATE_TARGET_GEOMETRY_AND_INTERFACE_CONTRACTS',
  mutationAuthority: false,
  safetyBoundary: { liveWorldMutated: false, liveCallsPerformed: false, rconCallsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  source: {
    snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId,
    predecessorPhysicalDesign: { path: rel(PHYSICAL_DESIGN), sha256: sha(physicalBytes), identity: physical.decisionIdentitySha256 },
    bkrSurvey: { path: rel(SURVEY), sha256: sha(surveyBytes) },
  },
  program: { routeId: publicRoute.routeId, currentStationCount: publicRoute.stationCount, currentProtectedRouteStatus: 'CONNECTED_BUT_DIMENSIONALLY_NONCONFORMING', requiredClearance: '5-wide × 5-high public common' },
  endpointInterfaceContracts: interfaces,
  retainedPublicLandingConnectors: retainedConnectors,
  candidateGeometry: { mainSwitchback: geometrySummary(main, mainGeometry, mainInteraction), independentReturn: geometrySummary(returning, returnGeometry, returnInteraction) },
  independentReturnProof: {
    status: 'GEOMETRICALLY_AND_SOURCE-INTERACTION_INDEPENDENT_FROM_CURRENT_SWITCHBACK',
    mainAndReturnTargetCellIntersectionCount: intersections(mainPoints, returnPoints).length,
    mainAndReturnInteractionCellIntersectionCount: intersections(new Set(mainInteraction.keys()), new Set(returnInteraction.keys())).length,
    returnVsCurrentProtectedInteriorHaloIntersectionCount: returnVsCurrent.length,
    retainedConnectorsAreOutsideVerticalLaneTargetGeometry: true,
    directedDesignRoutes: [
      { id: 'C01-PUBLIC-MAIN-DOWN-02', from: interfaces.mainUpper.point, to: interfaces.mainLower.point, stationCount: main.stations.length, orderedStationSha256: orderedHash(main.stations.map((station) => station.point)), use: 'future main public vertical path' },
      { id: 'C01-PUBLIC-INDEPENDENT-RETURN-UP-02', from: interfaces.returnLower.point, to: interfaces.returnUpper.point, stationCount: returning.stations.length, orderedStationSha256: orderedHash([...returning.stations].reverse().map((station) => station.point)), use: 'future independently constructed public return path' },
    ],
    constructionSequence: [
      'Phase A design gate: bind fresh source and owner acceptance for the separate return lane and its four 5×5 interface faces; compile only the return lane if every guarded kernel condition passes.',
      'Phase B functional gate: immutable post-state QA must prove the return lane, both retained landing connectors, both return interface faces, dry/gravity-safe interaction halo, and directed lower-to-upper normal-walk route before any protected current-switchback change.',
      'Phase C design gate: only with the verified return retained may a separate fresh compiler consider the main switchback replacement; the main lane deliberately overlaps current protected route fabric and has no authority here.',
    ],
  },
  sourceSafetyInventory: { bounds: relevantBounds, blockEntitiesInBounds: entities, blockEntitiesInFutureInteractionSet: 0, mainFluidOrGravityInteractionCells: 0, returnFluidOrGravityInteractionCells: 0 },
  explicitBlockersBeforeAnyPhysicalRelease: [
    'This record is target geometry and source evidence, not an operation compiler. A separate compiler must emit complete canonical forward and exact inverse operations from a fresh source.',
    'All four 5×5 endpoint-interface owners must accept the exact source-state face hashes after a fresh rebind; this design assigns accountable internal roles but does not substitute a release acceptance.',
    'The independent return must be its own guarded release and immutable-post functional proof before the current protected main switchback is touched.',
    'Each future release still requires source snapshot, entity clearance, protected-core review, strict-noop forward/rollback checks, journal, post snapshot, rollback post-state preflight, and scoped route QA.',
  ],
  nonClaims: ['No route has been built, opened, commissioned, or declared usable.', 'No source block has been changed and no RCON/live-world call was made.', 'No operation, manifest, rollback package, entity clearance, acceptance signature, or release authority is emitted.'],
};
const report = { ...base, designIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };

const planX = (x) => 70 + (x - 834) * 47; const planZ = (z) => 104 + (-50 - z) * 18;
const lanePath = (stations) => stations.map(({ point }, index) => `${index ? 'L' : 'M'}${planX(point[0])} ${planZ(point[2])}`).join(' ');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="690" viewBox="0 0 960 690"><rect width="960" height="690" fill="#0d1523"/><style>.h{font:700 24px system-ui;fill:#eff7ff}.s{font:13px ui-monospace,monospace;fill:#c7d8e7}.t{font:11px ui-monospace,monospace;fill:#dceaf4}</style><text x="32" y="39" class="h">C01 public vertical — 5×5 protected switchback and independent return</text><text x="32" y="64" class="s">post-C01-08 source-bound design only · no operation or mutation authority</text><rect x="70" y="104" width="800" height="420" fill="#142238" stroke="#5b738b"/><path d="${lanePath(main.stations)}" fill="none" stroke="#65c7ff" stroke-width="38" opacity=".27"/><path d="${lanePath(returning.stations)}" fill="none" stroke="#68d391" stroke-width="38" opacity=".27"/><path d="${lanePath(main.stations)}" fill="none" stroke="#65c7ff" stroke-width="5"/><path d="${lanePath(returning.stations)}" fill="none" stroke="#68d391" stroke-width="5"/><path d="M${planX(839)} ${planZ(-64)} L${planX(839)} ${planZ(-47)}" fill="none" stroke="#eab968" stroke-width="5" stroke-dasharray="8 5"/><path d="M${planX(837)} ${planZ(-69)} L${planX(837)} ${planZ(-54)}" fill="none" stroke="#eab968" stroke-width="5" stroke-dasharray="8 5"/><circle cx="${planX(839)}" cy="${planZ(-47)}" r="9" fill="#65c7ff"/><circle cx="${planX(837)}" cy="${planZ(-54)}" r="9" fill="#65c7ff"/><circle cx="${planX(839)}" cy="${planZ(-64)}" r="9" fill="#68d391"/><circle cx="${planX(837)}" cy="${planZ(-69)}" r="9" fill="#68d391"/><text x="32" y="562" class="s"><tspan fill="#65c7ff">Blue</tspan>: 30-station future main protected switchback. <tspan fill="#68d391">Green</tspan>: 28-station separately built independent return; both are 5-wide × 5-clear-high.</text><text x="32" y="589" class="s"><tspan fill="#eab968">Gold dashed</tspan>: retained existing 5-wide × 5-clear-high upper/lower landing connectors. Main and return target cells and one-cell interaction halos do not intersect.</text><text x="32" y="616" class="s">The return target is disjoint from the current protected switchback’s 3D interior halo; it must be post-state-proven before any main-route replacement package.</text><text x="32" y="654" class="t">Main interfaces: [839,43,-47] / [837,25,-54] · return interfaces: [839,43,-64] / [837,25,-69]</text></svg>\n`;
const elevation = (lane) => lane.stations.map(({ point }, index) => `${index ? 'L' : 'M'}${105 + index * 24} ${515 - (point[1] - 25) * 19}`).join(' ');
const section = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="610" viewBox="0 0 900 610"><rect width="900" height="610" fill="#0d1523"/><style>.h{font:700 24px system-ui;fill:#eff7ff}.s{font:13px ui-monospace,monospace;fill:#c7d8e7}</style><text x="32" y="39" class="h">C01 5×5 public vertical design elevation</text><text x="32" y="64" class="s">30-station main / 28-station return; every transition is a normal-walk max-one-rise/drop and each fold holds at y=35</text><rect x="80" y="92" width="750" height="430" fill="#142238" stroke="#5b738b"/>${[25, 28, 31, 34, 37, 40, 43].map((y) => `<line x1="80" y1="${515 - (y - 25) * 19}" x2="830" y2="${515 - (y - 25) * 19}" stroke="#3b5268"/><text x="40" y="${519 - (y - 25) * 19}" class="s">y=${y}</text>`).join('')}<path d="${elevation(main)}" fill="none" stroke="#65c7ff" stroke-width="10"/><path d="${elevation(returning)}" fill="none" stroke="#68d391" stroke-width="5" stroke-dasharray="8 5"/><text x="80" y="558" class="s">Blue: main path, retained until a separately guarded return release passes immutable-post functionality. Green dashed: independent return design.</text><text x="80" y="584" class="s">Every future station reserves five tread/support cells and five clear cells above; a later physical compiler must add guard treatment without consuming that clear envelope.</text></svg>\n`;

const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh destination'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02-plan.svg'), map);
fs.writeFileSync(path.join(out, 'mp11-c01-public-vertical-switchback-return-02-elevation.svg'), section);
fs.writeFileSync(path.join(out, 'MP11-C01-PUBLIC-VERTICAL-SWITCHBACK-RETURN-02.md'), `# MP11 C01 public vertical switchback / independent return design 02\n\n**Status:** \`${report.status}\`  \n**Authority:** source-bound design only; no operations or mutation authority.\n\n![Plan](mp11-c01-public-vertical-switchback-return-02-plan.svg)\n\n![Elevation](mp11-c01-public-vertical-switchback-return-02-elevation.svg)\n\nThis record binds separate **30-station** main and **28-station** independent-return **5-wide × 5-clear-high** vertical-lane geometries from the exact post-C01-08 source. The main protected-switchback candidate runs through \`[839,43,-47]\` and \`[837,25,-54]\`; the independent-return candidate runs through \`[839,43,-64]\` and \`[837,25,-69]\`. Each interface has a source-bound 25-cell 5×5 clear face and five supported feet cells.\n\nThe main and return future target volumes, their one-cell interaction halos, and the return’s interaction halo versus the current protected-switchback interior are all disjoint. Existing source-proven 5-wide × 5-clear-high upper and lower landing connectors tie their distinct interfaces into the public landing fabric. This is a **future construction sequence**, not a claim that a replacement route exists today: the return must be compiled, guarded, and independently proven from immutable post-state before the main protected route may change.\n`);
console.log(JSON.stringify({ status: report.status, mutationAuthority: false, sourceCaptureId: capture.captureId, mainTargetCells: mainGeometry.length, returnTargetCells: returnGeometry.length, mainInteractionCells: mainInteraction.size, returnInteractionCells: returnInteraction.size, independentReturnCurrentHaloIntersectionCells: returnVsCurrent.length, out: rel(out) }, null, 2));
