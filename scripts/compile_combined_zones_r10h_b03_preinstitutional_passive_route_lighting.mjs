#!/usr/bin/env node
/**
 * Compile the exact passive-lighting enabler for the already enclosed B03
 * route between the retained index-187 obstruction hold and R10G.
 */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T04:05:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r10g-post-20260822T031853Z');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/combined-zones-r10g-live-20260822T031853Z/evidence-ledger.json');
const SOURCE_QA = value('--source-qa', 'data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json');
const INTAKE = value('--intake-audit', 'data/world-review/combined-zones-r10g-live-20260822T031853Z/post-complete-save-intake.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r10h-b03-preinstitutional-passive-route-lighting');
const ENTITY_REPORT = value('--entity-report', 'data/world-review/combined-zones-r10h-b03-preinstitutional-passive-route-lighting-offline-20260822T040500Z/immutable-entity-clearance.json');
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const RELEASE_ID = 'CZ-R10H-P1-B03-PREINSTITUTIONAL-PASSIVE-ROUTE-LIGHTING';
const PACKAGE_KEY = 'b03-preinstitutional-passive-route-lighting';
const SOURCE_STATE = 'minecraft:polished_diorite';
const TARGET_STATE = 'minecraft:sea_lantern';

const INPUTS = Object.freeze({
  geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  contract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r07aManifest: 'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  r10aManifest: 'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  r10gManifest: 'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
  r12mSeal: 'data/world-review/combined-zones-r12m-b03-institutional-route-commissioning-20260822T034000Z/r12m-commissioning.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: '5710be3be4e9d9706e35373ab56e892aaae00a546033e986fe56d4ed4ba38f57',
  qaSha256: '934a0759dbc336ac124356bc04de8bfe3b83cf83632c732512c163452130d79d',
  qaPayloadSha256: '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
  intakeSha256: 'ff0c9079cee37a2a43176d6cf35cbf1d1bd913691ba46752e9c3c749092555cf',
  completedReleaseIdentitySha256: '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
  completeSaveSha256: 'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
  regionSha256: '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
  geometrySha256: '216ca18a7dd2a4e06b258dcc817c786b294ac8ebd992dfdb5ab5dba1f46829b1',
  contractSha256: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorizationSha256: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  r07aManifestSha256: 'c6d78582e2f278bb54dcc0e835aa3790e04963f833b230233e8c7a03e903f136',
  r10aManifestSha256: 'd4ad3c70a5454c6cf95262aa006a4c27cd0b7955a32d732ff07005a0e95a00cb',
  r10gManifestSha256: 'a7a078df110d10160fb47dcb538067769739db79cc3ba765757b4d4fdf28a73e',
  r12mSealSha256: '81b87d67c45d085fe44115fd5e29762b4c1e2af08c175145b079e6329e5d2db8',
  targetCount: 48,
  targetHash: '328bd79832501e5a3532e73abe9fa97e3bd06e01c6fc6634ffa653d1dfd4144b',
  haloCount: 1296,
  haloHash: '22cdaea3fc7883336c17939f9fac027b65c0131f3aaf0a96f04f4f70fdc3b023',
  routeCount: 12212,
  routeHash: 'd176926aa1f7710617b93769eab140bc529da4ad71aeb4e4462e7b9a7f3c7d01',
  clearanceCount: 5505,
  clearanceHash: '1df5ba4c9c7a36308a60aaacee659d1b82d482ef154962e0df74b31370989e42',
  floorCount: 3053,
  floorHash: '1be45f3e8a611106daddbbd2e67903d41a26b4f643e837cdeca2a9181a0fd146',
  ceilingCount: 3053,
  ceilingHash: 'ce5246deb30e88e7041a02460b37fb6bda1013d3917e64876e9d3da81dc5d612',
  upstreamHash: 'fe849893315aa56f6e1aebb80fa3dc7aef9870b6cf8d675fd93e4cf66a35b95b',
  earlyRouteCount: 3760,
  earlyRouteObstructionCount: 63,
  earlyFloorCount: 940,
  earlyFloorAirCount: 14,
});

const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const ACTIVE = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston',
  'minecraft:sticky_piston', 'minecraft:observer',
]);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10H B03 passive route lighting rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => (
  counts.set(record[field], (counts.get(record[field]) ?? 0) + 1)
), new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));

function geometryFor(points) {
  const route = [];
  const clearance = [];
  const floor = [];
  const ceiling = [];
  const walls = [];
  for (const point of points) {
    const lateralX = point.tangent === 'NORTH' || point.tangent === 'SOUTH';
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) route.push({ x, y: point.y + dy, z });
      floor.push({ x, y: point.y - 1, z });
      ceiling.push({ x, y: point.y + 4, z });
    }
    for (let offset = -1; offset <= 1; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 2; dy += 1) clearance.push({ x, y: point.y + dy, z });
    }
    for (const offset of [-3, 3]) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) walls.push({ x, y: point.y + dy, z });
    }
  }
  return {
    route: uniqueCells(route),
    clearance: uniqueCells(clearance),
    floor: uniqueCells(floor),
    ceiling: uniqueCells(ceiling),
    walls: uniqueCells(walls),
  };
}

function connectivity(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

function operationIntersection(filename, targets) {
  const targetKeys = new Set(targets.map(cellKey));
  const hits = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) hits.set(cellKey(cell), cell);
        }
      }
    }
  }
  return uniqueCells([...hits.values()]);
}

const ledger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const intake = readJson(INTAKE);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
const geometry = readJson(INPUTS.geometry);
const contract = readJson(INPUTS.contract);
const relics = readJson(INPUTS.relics);
const authorization = readJson(INPUTS.authorization);
const r07a = readJson(INPUTS.r07aManifest);
const r10g = readJson(INPUTS.r10gManifest);
const r12m = readJson(INPUTS.r12mSeal);

invariant(binding(SOURCE_LEDGER).sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.completeSaveSha256
  && absolute(ledger.postSnapshot.root) === absolute(SNAPSHOT),
'accepted R10G terminal ledger drifted');
invariant(binding(SOURCE_QA).sha256 === EXPECTED.qaSha256
  && sourceQa.status === 'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_POSTSTATE_VERIFIED_REVERSIBLE_UNCOMMISSIONED'
  && sourceQa.qaPayloadSha256 === EXPECTED.qaPayloadSha256
  && sourceQa.summary.passed === true,
'accepted R10G post QA drifted');
invariant(binding(INTAKE).sha256 === EXPECTED.intakeSha256
  && intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.completeSaveSha256
  && absolute(intake.input.suppliedWorldRoot) === absolute(SNAPSHOT)
  && sourceIdentity.sha256 === EXPECTED.regionSha256,
'immutable R10G post intake or region identity drifted');
invariant(binding(INPUTS.geometry).sha256 === EXPECTED.geometrySha256
  && binding(INPUTS.contract).sha256 === EXPECTED.contractSha256
  && binding(INPUTS.authorization).sha256 === EXPECTED.authorizationSha256
  && binding(INPUTS.r07aManifest).sha256 === EXPECTED.r07aManifestSha256
  && binding(INPUTS.r10aManifest).sha256 === EXPECTED.r10aManifestSha256
  && binding(INPUTS.r10gManifest).sha256 === EXPECTED.r10gManifestSha256
  && binding(INPUTS.r12mSeal).sha256 === EXPECTED.r12mSealSha256,
'frozen geometry, authority, or predecessor binding drifted');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z08-CONTACT-SEQUENCE-FITOUT')
  && authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R10 release node or standing authority drifted');
invariant(r07a.manifestIdentity === 'ee64005564179da374f4dd2847927363d7b875fcb5a2d4db6421fd1ba87391e8'
  && r10g.manifestIdentity === 'f4cba8ea0e4fdb3a8c5e036675c9ca9fac1842b8cffe1a4605e2297fc5d52ea4'
  && r12m.status === 'PASS_R12M_B03_INSTITUTIONAL_ROUTE_PASSIVE_INTERNAL_CIRCULATION_COMMISSIONED'
  && r12m.commissioningPayloadSha256 === '7dd8bf69850cd661d4e912579be5fd6870c6c795f78e99634a51b12756cb7628',
'accepted predecessor identity or R12M seal drifted');

const allPoints = geometry.design.centerline.points;
invariant(allPoints.length === 801
  && geometry.design.excavationReservation.cellCount === 15972
  && geometry.design.excavationReservation.coordinateSetSha256
    === '82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15',
'frozen complete B03 centerline/excavation drifted');
const selectedPoints = allPoints.filter(({ index }) => index >= 188 && index <= 800);
const earlyPoints = allPoints.filter(({ index }) => index <= 187);
const fixturePoints = selectedPoints.filter(({ index }) => index >= 188
  && index <= 470 && (index - 188) % 6 === 0);
invariant(selectedPoints.length === 613 && earlyPoints.length === 188
  && fixturePoints.length === EXPECTED.targetCount
  && fixturePoints[0].index === 188 && fixturePoints.at(-1).index === 470,
'selected route or passive fixture cadence drifted');

const selected = geometryFor(selectedPoints);
const early = geometryFor(earlyPoints);
const full = geometryFor(allPoints);
const upstream = geometryFor([allPoints[187]]);
invariant(full.route.length === geometry.design.excavationReservation.cellCount
  && hashCells(full.route) === geometry.design.excavationReservation.coordinateSetSha256,
'independently rebuilt full route does not reproduce frozen excavation');
invariant(selected.route.length === EXPECTED.routeCount && hashCells(selected.route) === EXPECTED.routeHash
  && selected.clearance.length === EXPECTED.clearanceCount && hashCells(selected.clearance) === EXPECTED.clearanceHash
  && selected.floor.length === EXPECTED.floorCount && hashCells(selected.floor) === EXPECTED.floorHash
  && selected.ceiling.length === EXPECTED.ceilingCount && hashCells(selected.ceiling) === EXPECTED.ceilingHash
  && upstream.route.length === 20 && hashCells(upstream.route) === EXPECTED.upstreamHash,
'selected route, clearance, floor, ceiling, or upstream seam geometry drifted');
const routeTopology = connectivity(selected.route);
invariant(routeTopology.componentCount === 1
  && routeTopology.largestComponentCellCount === EXPECTED.routeCount,
'selected route is not one connected component');

const targets = fixturePoints.map(({ index, x, y, z }) => ({
  index,
  cell: { x, y: y + 4, z },
  fromState: SOURCE_STATE,
  toState: TARGET_STATE,
}));
invariant(hashCells(targets.map(({ cell }) => cell)) === EXPECTED.targetHash,
'fixture target identity drifted');
const halo = uniqueCells(targets.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
}));
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash,
'exact sparse interaction halo drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const observedTargets = [];
for (const operation of targets) {
  const state = stateToCommandString(await reader.blockState(
    operation.cell.x, operation.cell.y, operation.cell.z,
  ));
  observedTargets.push({ ...operation, observedState: state });
}
invariant(observedTargets.every(({ observedState }) => observedState === SOURCE_STATE),
'one or more fixture sources are not exact polished diorite');

const haloKeys = new Set(halo.map(cellKey));
const haloHazards = [];
for (const cell of halo) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = stateName(state);
  if (name === 'minecraft:water' || name === 'minecraft:lava'
    || state.includes('waterlogged=true') || GRAVITY.has(name)
    || FORBIDDEN.has(name) || ACTIVE.has(name)) haloHazards.push({ cell, state });
}
const blockEntities = [];
const savedEntities = [];
const chunks = [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
for (const chunkKey of chunks) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (haloKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    const cell = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    if (haloKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
  }
}
const relicHits = relics.relics.filter((relic) => targets.some(({ cell }) => (
  inside(cell, relic.declaredInclusiveBounds)
)));
invariant(haloHazards.length === 0 && blockEntities.length === 0
  && savedEntities.length === 0 && relicHits.length === 0,
'exact target halo contains a fluid, gravity, container, control, entity, or relic hazard');

const selectedRouteMismatches = [];
for (const cell of selected.route) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== 'minecraft:air') selectedRouteMismatches.push({ cell, state });
}
const upstreamMismatches = [];
for (const cell of upstream.route) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== 'minecraft:air') upstreamMismatches.push({ cell, state });
}
const earlyRouteObstructions = [];
for (const cell of early.route) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state !== 'minecraft:air') earlyRouteObstructions.push({ cell, state });
}
const earlyFloorAir = [];
for (const cell of early.floor) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (state === 'minecraft:air') earlyFloorAir.push({ cell, state });
}
invariant(selectedRouteMismatches.length === 0 && upstreamMismatches.length === 0
  && early.route.length === EXPECTED.earlyRouteCount
  && earlyRouteObstructions.length === EXPECTED.earlyRouteObstructionCount
  && early.floor.length === EXPECTED.earlyFloorCount
  && earlyFloorAir.length === EXPECTED.earlyFloorAirCount,
'selected route or explicit upstream obstruction boundary drifted');

const r07aShell = r07a.packages.find(({ key }) => key === 'b03-tube-shell');
const r07aHits = operationIntersection(r07aShell.forward, targets.map(({ cell }) => cell));
const r10gHits = uniqueCells(r10g.packages.flatMap((pkg) => (
  operationIntersection(pkg.forward, targets.map(({ cell }) => cell))
)));
const r10aManifest = readJson(INPUTS.r10aManifest);
const r10aHits = uniqueCells(r10aManifest.packages.flatMap((pkg) => (
  operationIntersection(pkg.forward, targets.map(({ cell }) => cell))
)));
invariant(r07aHits.length === EXPECTED.targetCount && r10gHits.length === 0 && r10aHits.length === 0,
'accepted release target lineage/intersection drifted');

const ordered = targets.slice().sort((left, right) => left.index - right.index);
const forwardBody = `${ordered.map(({ cell, fromState, toState }) => (
  replLine(cell, fromState, toState)
)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, fromState, toState }) => (
  replLine(cell, toState, fromState)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${EXPECTED.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${EXPECTED.targetHash}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const entityReport = {
  schemaVersion: 1,
  id: `${BASENAME}-immutable-entity-clearance`,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  snapshotRoot: relative(SNAPSHOT),
  exactSparseInteractionHalo: classManifest(halo),
  targetCellCount: targets.length,
  interactionHaloCellCount: halo.length,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  liveEntityClearanceStillRequiredByWrapper: true,
  liveCallPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(ENTITY_REPORT)), { recursive: true });
fs.writeFileSync(absolute(ENTITY_REPORT), `${JSON.stringify(entityReport, null, 2)}\n`);

const packageRecord = { key: PACKAGE_KEY, forward: relative(forwardPath), rollback: relative(rollbackPath) };
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R10G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z08-CONTACT-SEQUENCE-FITOUT', 'P1-B03-PREINSTITUTIONAL-PASSIVE-ROUTE-LIGHTING'],
  packages: [packageRecord],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Install only the exact source-proven passive ceiling fixtures; rollback restores each original polished-diorite cell in exact reverse cell order.',
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    completeSaveSha256: EXPECTED.completeSaveSha256,
    regionSnapshotSha256: EXPECTED.regionSha256,
    intakeAudit: binding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: binding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      postQa: binding(SOURCE_QA),
      postQaPayloadSha256: sourceQa.qaPayloadSha256,
    },
    immutableEntityClearance: binding(ENTITY_REPORT),
    sourceStateCensus: census(observedTargets, 'observedState'),
  },
  target: {
    operatedUnion: classManifest(targets.map(({ cell }) => cell)),
    packageTargetsDisjoint: true,
    desiredStateCensus: { [TARGET_STATE]: targets.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: targets.length,
      rollbackCommandCount: targets.length,
      targetCellCount: targets.length,
      targetCoordinateSetSha256: EXPECTED.targetHash,
      sourceStateCensus: { [SOURCE_STATE]: targets.length },
      desiredStateCensus: { [TARGET_STATE]: targets.length },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z08-CONTACT-SEQUENCE-FITOUT',
    purpose: 'Complete deterministic passive illumination across the already enclosed dry B03 run so a larger bounded inspection route can be accepted without opening any active or public system.',
    acceptedCenterlineRange: {
      firstIndex: 188,
      lastIndex: 800,
      pointCount: selectedPoints.length,
      centerlineCoordinateSetSha256: hashCells(selectedPoints.map(({ x, y, z }) => ({ x, y, z }))),
    },
    passiveLighting: {
      firstFixtureIndex: 188,
      lastNewFixtureIndex: 470,
      interval: 6,
      newFixtureIndices: fixturePoints.map(({ index }) => index),
      newFixtures: classManifest(targets.map(({ cell }) => cell)),
      acceptedDownstreamFixtureCount: 54,
      proposedCompleteFixtureCount: 102,
      proposedCompleteMaximumCenterlineSpacing: 6,
    },
    routeReadinessGeometry: {
      route: classManifest(selected.route),
      centralClearance: classManifest(selected.clearance),
      floor: classManifest(selected.floor),
      ceiling: classManifest(selected.ceiling),
      upstreamIndex187AirSeam: classManifest(upstream.route),
      routeComponentCount: routeTopology.componentCount,
      routeLargestComponentCellCount: routeTopology.largestComponentCellCount,
    },
    explicitUpstreamHold: {
      excludedCenterlineRange: { firstIndex: 0, lastIndex: 187, pointCount: earlyPoints.length },
      exactRouteCellCount: early.route.length,
      exactRouteObstructionCount: earlyRouteObstructions.length,
      exactRouteObstructionStateCensus: census(earlyRouteObstructions, 'state'),
      exactFloorCellCount: early.floor.length,
      exactUnsupportedFloorAirCellCount: earlyFloorAir.length,
      interpretation: 'The lighting package and paired commissioning readiness stop at index 188. They do not clear, support, commission, or otherwise claim the obstructed indices 0..187 portal approach.',
    },
    operationalBoundary: {
      passiveLightingOnly: true,
      routePhysicallyOpened: false,
      secureOrPublicRouteCommissioned: false,
      accessControlMechanismCommissioned: false,
      activeSystemInstalled: false,
      exteriorOpeningCreated: false,
      chamberOpened: false,
      directTerminalLinkOpened: false,
      rescueOrEgressCommissioned: false,
    },
  },
  preservation: {
    exactCurrentSourceStateGuardCount: targets.length,
    routeOperationIntersectionCount: 0,
    floorOperationIntersectionCount: 0,
    priorReleaseIntersections: {
      r07aPortalTubeShellCellCount: r07aHits.length,
      r10gCellCount: r10gHits.length,
      r10aCellCount: r10aHits.length,
      interpretation: 'Every target is an accepted R07A ceiling cell; no R10G or R10A target is changed.',
    },
    haloHazardCount: haloHazards.length,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
    protectedRelicIntersectionCount: relicHits.length,
    indices0Through187Untouched: true,
  },
  safetyAudit: {
    exactSparseInteractionHalo: classManifest(halo),
    fluidCellCount: 0,
    gravityCellCount: 0,
    forbiddenContainerOrControlCellCount: 0,
    activeMechanismCellCount: 0,
    blockEntityCount: blockEntities.length,
    savedEntityCount: savedEntities.length,
    protectedRelicCount: relicHits.length,
    exactStaticSourceFamilyOnly: true,
    exactAirRoutePreserved: true,
  },
  upstreamIdentities: Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => (
    [key, binding(filename)]
  ))),
  standingAuthorization: {
    ...binding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  hardSafetyKernelNext: [
    'fresh complete source and exact forward preflight',
    'fresh live-entity clearance over the exact interaction halo',
    'strict forward and rollback parsers',
    'journaled strict execution',
    'fresh post snapshot and reverse rollback preflight',
    'independent exact fixture, route, halo, no-drift, and inverse QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    routeCommissionedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: payload.status,
  manifest: relative(manifestPath),
  manifestIdentity,
  targets: targets.length,
  route: selected.route.length,
  clearance: selected.clearance.length,
  fixturesAfterExecution: 102,
  explicitEarlyRouteObstructions: earlyRouteObstructions.length,
  halo: halo.length,
  liveCallsPerformed: false,
}, null, 2)}\n`);
