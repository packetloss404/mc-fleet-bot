#!/usr/bin/env node
/** Compile the complete remaining dry B03 institutional-leg fit-out. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T03:05:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r12j-post-20260822T025647Z');
const INTAKE = value('--intake-audit', 'data/world-review/combined-zones-r12j-live-20260822T025647Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/combined-zones-r12j-live-20260822T025647Z/evidence-ledger.json');
const SOURCE_QA = value('--source-qa', 'data/world-review/combined-zones-r12j-live-20260822T025647Z/r12j-post-release-qa.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r10g-b03-institutional-contact-sequence-fitout');
const ENTITY_REPORT = value('--entity-report', 'data/world-review/combined-zones-r10g-b03-institutional-contact-sequence-fitout-offline-20260822T030500Z/immutable-entity-clearance.json');
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const RELEASE_ID = 'CZ-R10G-P1-B03-INSTITUTIONAL-CONTACT-SEQUENCE-FITOUT';
const CONTACT_KEY = 'z08-institutional-contact-sequence-liner';
const CHEYENNE_KEY = 'z10-cheyenne-approach-extension-liner';
const INPUTS = Object.freeze({
  geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  sites: 'docs/masterplans/05-combined-zones/site-coordinates.json',
  contract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r05Manifest: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  r10aManifest: 'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledger: 'eb800fa74fad3d8227e355b83c12ac6f19d996cc898ed02ae077c4f6e8d6a75a',
  qaFile: 'ab5d7134a7e93c2e45d922352bd38dd3eec52d9b6b94eef1c726e7c00f628f2f',
  qaPayload: 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1',
  completed: '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
  sourceComplete: 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9',
  sourceRegion: 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb',
  geometryIdentity: '216ca18a7dd2a4e06b258dcc817c786b294ac8ebd992dfdb5ab5dba1f46829b1',
  r03Identity: 'a9fd5777da7b0d0769f55240007eed0a54f0aa36a4954883cf98bfc2f7a080f8',
  r05Identity: '854603ddcd740480f83ecc27bc51a94748eaf5e1659cc287b2a43dc24c9a00eb',
  r10aIdentity: '3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c',
  allTargets: 5346,
  contactTargets: 5202,
  cheyenneTargets: 144,
  route: 5940,
});
const MATERIALS = Object.freeze({
  wallAndCeiling: 'minecraft:polished_granite',
  floor: 'minecraft:smooth_stone',
  securityFrame: 'minecraft:polished_blackstone_bricks',
  light: 'minecraft:sea_lantern',
  route: 'minecraft:air',
});
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const ACTIVE = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail', 'minecraft:activator_rail',
  'minecraft:redstone_wire', 'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston',
  'minecraft:observer', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper',
]);

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10G institutional contact fit-out rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => {
  counts.set(record[field], (counts.get(record[field]) ?? 0) + 1); return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const overlap = (left, right) => !(left.maxX < right.minX || left.minX > right.maxX
  || left.maxY < right.minY || left.minY > right.maxY || left.maxZ < right.minZ || left.minZ > right.maxZ);

function operationIntersection(filename, targets) {
  const hits = new Map(); const targetBounds = boundsOf(targets);
  const byColumn = new Map();
  for (const cell of targets) {
    const key = `${cell.x},${cell.z}`; if (!byColumn.has(key)) byColumn.set(key, []); byColumn.get(key).push(cell);
  }
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/); const values = fields.slice(1, 7).map(Number);
    const box = { minX: Math.min(values[0], values[3]), maxX: Math.max(values[0], values[3]),
      minY: Math.min(values[1], values[4]), maxY: Math.max(values[1], values[4]),
      minZ: Math.min(values[2], values[5]), maxZ: Math.max(values[2], values[5]) };
    if (!overlap(box, targetBounds)) continue;
    for (let x = Math.max(box.minX, targetBounds.minX); x <= Math.min(box.maxX, targetBounds.maxX); x += 1) {
      for (let z = Math.max(box.minZ, targetBounds.minZ); z <= Math.min(box.maxZ, targetBounds.maxZ); z += 1) {
        for (const cell of byColumn.get(`${x},${z}`) ?? []) if (cell.y >= box.minY && cell.y <= box.maxY) hits.set(cellKey(cell), cell);
      }
    }
  }
  return uniqueCells([...hits.values()]);
}

const intake = readJson(INTAKE); const ledger = readJson(SOURCE_LEDGER); const sourceQa = readJson(SOURCE_QA);
const geometry = readJson(INPUTS.geometry); const sites = readJson(INPUTS.sites); const contract = readJson(INPUTS.contract);
const relics = readJson(INPUTS.relics); const authorization = readJson(INPUTS.authorization);
const r03 = readJson(INPUTS.r03Manifest); const r05 = readJson(INPUTS.r05Manifest); const r10a = readJson(INPUTS.r10aManifest);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(binding(SOURCE_LEDGER).sha256 === EXPECTED.ledger && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completed && ledger.postSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'accepted R12J terminal ledger drifted');
invariant(binding(SOURCE_QA).sha256 === EXPECTED.qaFile
  && sourceQa.status === 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_FOURTEEN_CELL_TOPOLOGY_PRESERVED'
  && sourceQa.qaPayloadSha256 === EXPECTED.qaPayload && sourceQa.summary.passed === true,
'accepted R12J post QA drifted');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT) && sourceIdentity.sha256 === EXPECTED.sourceRegion,
'immutable source intake/region identity drifted');
invariant(binding(INPUTS.geometry).sha256 === EXPECTED.geometryIdentity
  && r03.manifestIdentity === EXPECTED.r03Identity && r05.manifestIdentity === EXPECTED.r05Identity
  && r10a.manifestIdentity === EXPECTED.r10aIdentity, 'frozen geometry or predecessor identity drifted');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners.includes('Z08-CONTACT-SEQUENCE-FITOUT')
  && node.canonicalOwners.includes('Z10-CHEYENNE-FITOUT'), 'release contract owners drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID), 'standing authority does not cover R10');

const points = geometry.design.centerline.points.filter(({ index }) => index >= 471 && index <= 767);
const contactPoints = points.filter(({ index }) => index <= 759);
const cheyennePoints = points.filter(({ index }) => index >= 760);
invariant(points.length === 297 && contactPoints.length === 289 && cheyennePoints.length === 8
  && points.every((point, offset) => point.index === 471 + offset && point.phase === 'LEG-3-INSTITUTIONAL'
    && point.tangent === 'WEST' && point.y === 166 && point.z === -868), 'exact institutional datum drifted');
const z10 = sites.zones.find(({ id }) => id === 'Z10');
invariant(z10 && contactPoints.every(({ x }) => x > z10.bounds.maxX)
  && cheyennePoints.every((point) => inside(point, { ...z10.bounds, minY: Math.ceil(z10.bounds.minY), maxY: Math.floor(z10.bounds.maxY) })),
'Z08/Z10 ownership split no longer matches exact Z10 bounds');

function geometryFor(centerline) {
  const route = []; const liner = [];
  for (const point of centerline) {
    for (let y = point.y; y <= point.y + 3; y += 1) for (let z = point.z - 2; z <= point.z + 2; z += 1) route.push({ x: point.x, y, z });
    for (let z = point.z - 2; z <= point.z + 2; z += 1) liner.push({ x: point.x, y: point.y - 1, z }, { x: point.x, y: point.y + 4, z });
    for (let y = point.y; y <= point.y + 3; y += 1) liner.push({ x: point.x, y, z: point.z - 3 }, { x: point.x, y, z: point.z + 3 });
  }
  return { route: uniqueCells(route), liner: uniqueCells(liner) };
}
const contact = geometryFor(contactPoints); const cheyenne = geometryFor(cheyennePoints);
const allRoute = uniqueCells([...contact.route, ...cheyenne.route]); const allLiner = uniqueCells([...contact.liner, ...cheyenne.liner]);
const upstreamPoint = geometry.design.centerline.points.find(({ index }) => index === 470);
const downstreamPoint = geometry.design.centerline.points.find(({ index }) => index === 768);
invariant(upstreamPoint?.x === 2378 && downstreamPoint?.x === 2080
  && upstreamPoint.y === 166 && downstreamPoint.y === 166
  && upstreamPoint.z === -868 && downstreamPoint.z === -868,
'adjacent centerline seam datums drifted');
const upstreamSeam = geometryFor([upstreamPoint]); const downstreamSeam = geometryFor([downstreamPoint]);
const seamRoute = uniqueCells([...upstreamSeam.route, ...downstreamSeam.route]);
invariant(contact.liner.length === EXPECTED.contactTargets && cheyenne.liner.length === EXPECTED.cheyenneTargets
  && allLiner.length === EXPECTED.allTargets && allRoute.length === EXPECTED.route,
'route/liner geometry count drifted');
const r10aTargets = operationIntersection(r10a.packages[0].forward, allLiner);
invariant(r10aTargets.length === 0 && contactPoints.at(-1).x === 2089 && cheyennePoints.at(-1).x === 2081
  && r10a.scope.geometry.acceptedCenterlineRange.firstIndex === 768, 'R10A seam overlap or index drifted');

const desired = new Map();
const lights = new Set(); for (let x = 2084; x <= 2374; x += 6) lights.add(x);
for (const cell of allLiner) {
  let toState = cell.y === 165 ? MATERIALS.floor : MATERIALS.wallAndCeiling;
  let layer = cell.y === 165 ? 'floor' : cell.y === 170 ? 'ceiling' : 'wall';
  if (cell.x === 2377) { toState = MATERIALS.securityFrame; layer = 'security-frame'; }
  else if (cell.y === 170 && cell.z === -868 && lights.has(cell.x)) { toState = MATERIALS.light; layer = 'lighting'; }
  desired.set(cellKey(cell), { cell, toState, layer, packageKey: cell.x >= 2089 ? CONTACT_KEY : CHEYENNE_KEY });
}
invariant(lights.size === 49 && desired.size === EXPECTED.allTargets, 'material/cadence map drifted');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const operations = []; const routeViolations = []; const seamRouteViolations = [];
for (const cell of allRoute) {
  const observed = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (observed !== MATERIALS.route) routeViolations.push({ cell, observed });
}
for (const cell of seamRoute) {
  const observed = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (observed !== MATERIALS.route) seamRouteViolations.push({ cell, observed });
}
for (const record of desired.values()) {
  const fromState = stateToCommandString(await reader.blockState(record.cell.x, record.cell.y, record.cell.z));
  invariant(fromState === 'minecraft:stone' || fromState === 'minecraft:polished_diorite',
    `non-static liner source at ${cellKey(record.cell)}: ${fromState}`);
  invariant(fromState !== record.toState, `target already equals desired state at ${cellKey(record.cell)}`);
  operations.push({ ...record, fromState });
}
invariant(routeViolations.length === 0 && seamRouteViolations.length === 0 && operations.length === EXPECTED.allTargets,
'route void, adjacent seam clearance, or target source drifted');
const layerOrder = new Map([['ceiling', 0], ['lighting', 0], ['wall', 1], ['security-frame', 1], ['floor', 2]]);

const targetBounds = boundsOf(allLiner);
const haloBounds = { minX: targetBounds.minX - 1, maxX: targetBounds.maxX + 1, minY: targetBounds.minY - 1,
  maxY: targetBounds.maxY + 1, minZ: targetBounds.minZ - 1, maxZ: targetBounds.maxZ + 1 };
const haloHazards = []; const blockEntities = []; const savedEntities = [];
for (let x = haloBounds.minX; x <= haloBounds.maxX; x += 1) for (let y = haloBounds.minY; y <= haloBounds.maxY; y += 1) {
  for (let z = haloBounds.minZ; z <= haloBounds.maxZ; z += 1) {
    const observed = stateToCommandString(await reader.blockState(x, y, z)); const name = stateName(observed);
    if (name === 'minecraft:water' || name === 'minecraft:lava' || observed.includes('waterlogged=true')
      || ['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand'].includes(name)
      || FORBIDDEN.has(name) || ACTIVE.has(name)) haloHazards.push({ cell: { x, y, z }, observed });
  }
}
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (inside(point, haloBounds)) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (x >= haloBounds.minX && x < haloBounds.maxX + 1 && y >= haloBounds.minY && y < haloBounds.maxY + 1
        && z >= haloBounds.minZ && z < haloBounds.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
const relicHits = relics.relics.filter((relic) => allLiner.some((cell) => inside(cell, relic.declaredInclusiveBounds)));
invariant(haloHazards.length === 0 && blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0,
'halo contains fluid/gravity/mechanism/container/entity/relic hazard');

const r03RouteHits = operationIntersection(r03.packages.find(({ key }) => key === 'b03-jcurve').forward, allRoute);
const r05BulkHits = operationIntersection(r05.packages.find(({ key }) => key === 'b10-bulk').forward, allLiner);
const r05FinishHits = operationIntersection(r05.packages.find(({ key }) => key === 'b10-finish').forward, allLiner);
const provenanceUnion = uniqueCells([...r05BulkHits, ...r05FinishHits]);
invariant(r03RouteHits.length === 3060 && r05BulkHits.length === 2754 && r05FinishHits.length === 25
  && provenanceUnion.length === 2779,
`historical R03/R05 footprint intersections drifted: R03 route=${r03RouteHits.length}, R05 bulk=${r05BulkHits.length}, R05 finish=${r05FinishHits.length}, liner union=${provenanceUnion.length}`);

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
const packageRecords = {};
for (const [key, owned] of [[CONTACT_KEY, contact], [CHEYENNE_KEY, cheyenne]]) {
  const packageOps = operations.filter((entry) => entry.packageKey === key).sort((left, right) => (
    (layerOrder.get(left.layer) ?? 9) - (layerOrder.get(right.layer) ?? 9)
    || right.cell.x - left.cell.x || right.cell.y - left.cell.y || left.cell.z - right.cell.z
  ));
  const forwardBody = `${packageOps.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${packageOps.slice().reverse().map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody); const rollbackSha256 = sha256(rollbackBody);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`); const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = (role, operationSha) => [`# GENERATED FILE - ${RELEASE_ID}/${key} (${role})`, `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${EXPECTED.sourceComplete}`, `# target coordinate-set SHA-256: ${hashCells(packageOps.map(({ cell }) => cell))}`,
    `# operation SHA-256: ${operationSha}`, ''].join('\n');
  fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageRecords[key] = { key, forward: rel(forwardPath), rollback: rel(rollbackPath), packageOps, forwardSha256, rollbackSha256, geometry: owned };
}

const entityReport = { schemaVersion: 1, id: `${BASENAME}-immutable-entity-clearance`, generatedAtUtc: GENERATED_AT,
  status: 'PASS', snapshotRoot: rel(SNAPSHOT), reviewBounds: haloBounds, targetCellCount: allLiner.length,
  interactionHaloCellCount: 21528, blockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0,
  liveEntityClearanceStillRequiredByWrapper: true, liveCallPerformed: false };
fs.mkdirSync(path.dirname(abs(ENTITY_REPORT)), { recursive: true });
fs.writeFileSync(abs(ENTITY_REPORT), `${JSON.stringify(entityReport, null, 2)}\n`);

const packages = [CONTACT_KEY, CHEYENNE_KEY].map((key) => ({ key, forward: packageRecords[key].forward, rollback: packageRecords[key].rollback }));
const payload = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R12J_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID, mvpScope: true,
  scopeIds: ['Z08-CONTACT-SEQUENCE-FITOUT', 'Z10-CHEYENNE-FITOUT', 'P1-B03-LEG3-INSTITUTIONAL-LINER'], packages,
  executionOrder: { forward: [CONTACT_KEY, CHEYENNE_KEY], rollback: [CHEYENNE_KEY, CONTACT_KEY],
    rationale: 'Fit the long Z08 institutional contact sequence first, then close its exact eight-point Z10 continuation to the accepted R10A seam; rollback reverses owner order and every cell.' },
  source: { snapshotRoot: rel(SNAPSHOT), completeSaveSha256: EXPECTED.sourceComplete, regionSnapshotSha256: EXPECTED.sourceRegion,
    intakeAudit: binding(INTAKE), predecessor: { transactionId: ledger.transactionId, executionLedger: binding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256, postQa: binding(SOURCE_QA), postQaPayloadSha256: sourceQa.qaPayloadSha256 },
    immutableEntityClearance: binding(ENTITY_REPORT), sourceStateCensus: census(operations, 'fromState') },
  target: { operatedUnion: classManifest(allLiner), packageTargetsDisjoint: true,
    desiredStateCensus: census(operations, 'toState'), routeVoid: classManifest(allRoute) },
  operations: Object.fromEntries([CONTACT_KEY, CHEYENNE_KEY].map((key) => {
    const record = packageRecords[key]; const cells = record.packageOps.map(({ cell }) => cell);
    return [key, { forwardSha256: record.forwardSha256, rollbackSha256: record.rollbackSha256,
      forwardCommandCount: cells.length, rollbackCommandCount: cells.length, targetCellCount: cells.length,
      targetCoordinateSetSha256: hashCells(cells), sourceStateCensus: census(record.packageOps, 'fromState'),
      desiredStateCensus: census(record.packageOps, 'toState'), exactInverse: true, reverseOrderInverse: true, oneCellGuards: true }];
  })),
  scope: { releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID,
    purpose: 'Complete the source-proven polished-institutional fit-out of the remaining 297-point B03 leg while keeping both route ends open only to already accepted interior continuations.',
    acceptedCenterlineRange: { firstIndex: 471, lastIndex: 767, pointCount: points.length, firstPoint: points[0], lastPoint: points.at(-1) },
    ownership: { contact: { canonicalOwner: 'Z08-CONTACT-SEQUENCE-FITOUT', firstIndex: 471, lastIndex: 759,
      pointCount: contactPoints.length, liner: classManifest(contact.liner), routeVoid: classManifest(contact.route) },
    cheyenneApproachExtension: { canonicalOwner: 'Z10-CHEYENNE-FITOUT', firstIndex: 760, lastIndex: 767,
      pointCount: cheyennePoints.length, liner: classManifest(cheyenne.liner), routeVoid: classManifest(cheyenne.route) },
    ownershipOverlapCellCount: 0, exactSplitAtZ10MinimumX: true },
    geometry: { completeInstitutionalLiner: classManifest(allLiner), preservedRouteVoid: classManifest(allRoute),
      upstreamOpenInteriorSeam: { centerlineIndex: 470, routeVoid: classManifest(upstreamSeam.route), statePreserved: true },
      downstreamAcceptedR10aInteriorSeam: { centerlineIndex: 768, routeVoid: classManifest(downstreamSeam.route), statePreserved: true },
      securityFrame: classManifest(allLiner.filter(({ x }) => x === 2377)),
      passiveFixtures: classManifest(allLiner.filter((cell) => cell.y === 170 && cell.z === -868 && lights.has(cell.x))) },
    materialDoctrine: { source: 'FROZEN_LEG3_POLISHED_INSTITUTIONAL_CHARACTER_AND_ACCEPTED_R10A_PALETTE', ...MATERIALS },
    operationalBoundary: { routeVoidPreserved: true, secureOrPublicRouteCommissioned: false, accessControlMechanismCommissioned: false,
      activeSystemInstalled: false, exteriorOpeningCreated: false, chamberOpened: false, rescueOrEgressCommissioned: false } },
  preservation: { historicalAcceptedFootprintIntersections: { r03RouteCells: classManifest(r03RouteHits),
    r05BulkLinerCells: classManifest(r05BulkHits), r05FinishLinerCells: classManifest(r05FinishHits),
    r05LinerUnion: classManifest(provenanceUnion), interpretation: 'Historical accepted operations explain only their exact intersecting cells; current source states and frozen B03 geometry, not a fabricated whole-run lineage claim, guard the complete scope.' },
    completeCurrentSourceStateGuardCount: operations.length,
    acceptedR10aTargetIntersectionCount: 0, routeOperationIntersectionCount: 0, haloHazardCount: 0,
    blockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0, protectedRelicIntersectionCount: 0 },
  safetyAudit: { halo: { ...haloBounds, cellCount: 21528 }, fluidCellCount: 0, gravityCellCount: 0,
    forbiddenContainerOrControlCellCount: 0, activeMechanismCellCount: 0, blockEntityCount: 0, savedEntityCount: 0,
    exactStaticSourceFamiliesOnly: true, exactAirRoutePreserved: true },
  upstreamIdentities: Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [key, binding(filename)])),
  standingAuthorization: { ...binding(INPUTS.authorization), authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true },
  hardSafetyKernelNext: ['fresh complete source and exact ordered preflight', 'fresh live-entity clearance',
    'strict forward/rollback parsers', 'journaled strict execution', 'fresh post and reverse rollback preflight',
    'independent exact liner, route, ownership, halo, seam, no-drift, and inverse QA'],
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false,
    activeMechanismOrRouteCommissioned: false },
};
const manifestIdentity = sha256(JSON.stringify(payload));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: payload.status, manifest: rel(manifestPath), manifestIdentity,
  packages: packages.length, targets: allLiner.length, route: allRoute.length, contactTargets: contact.liner.length,
  cheyenneTargets: cheyenne.liner.length, fixtures: lights.size, halo: 21528, liveCallsPerformed: false }, null, 2)}\n`);
