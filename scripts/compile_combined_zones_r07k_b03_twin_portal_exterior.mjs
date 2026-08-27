#!/usr/bin/env node
/**
 * Compile CZ-R07K: twin B03 portal-exterior collars.
 *
 * The accepted R07A route has two five-wide, four-high openings where its
 * polished-diorite tube leaves the mountain. This exact package adds a
 * two-block-deep stone-brick U collar around each opening without changing
 * the route void, tube shell, mountain seam, viaduct, rail, power, drainage,
 * or commissioning state. Offline only: no RCON or world mutation.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T19:48:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08t-post-20260821T194152Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08t-live-20260821T194152Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08t-live-20260821T194152Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r07k-b03-twin-portal-exterior',
);

const RELEASE_ID = 'CZ-R07K-P1-B03-TWIN-PORTAL-EXTERIOR';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b03-twin-portal-collars';
const TARGET_STATE = 'minecraft:stone_bricks';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const ALLOWED_TARGET_SOURCE_STATES = new Set([
  ...AIR_STATES,
  'minecraft:snow[layers=1]',
]);
const FLUID_NAMES = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY_NAMES = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
]);
const FORBIDDEN_SOURCE_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:chiseled_bookshelf', 'minecraft:crafter',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const INPUTS = Object.freeze({
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07aManifest: 'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  r07aPostQa:
    'data/world-review/combined-zones-r07a-live-20260821T154500Z/r07a-post-release-qa.json',
  r07jPostSnapshot: 'data/worldsnap-combined-zones-r07j-post-20260821T193306Z',
});

const PRIOR_MANIFESTS = Object.freeze([
  'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
  'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
  'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
  'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
  'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
  'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08t-empty-eight-south-smoke-boundary.release-manifest.json',
  'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
  'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
]);

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    'fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec',
  sourceRegionSha256:
    '42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023',
  sourceLedgerSha256:
    'ee64b2008872e1508636074ef3e62e1f8bb0053a26bfaf540d0e554db0872293',
  sourceCompletedReleaseIdentitySha256:
    '0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f',
  b03ConstructionCellCount: 15972,
  b03ConstructionSha256:
    '82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15',
  b03InteractionCellCount: 14418,
  b03InteractionSha256:
    '3fea0d42c8f41dde895ac31258bfa06ed5cacea11f2d719e02551f3989a8966f',
  r07jPortalReviewStateSetSha256:
    '1e5832df51ffa74b75d476ffd65d04ba4a0306cd574a7eea4241674dd62fa5bf',
  operatedCellCount: 72,
  operatedCoordinateSetSha256:
    'a2ce627591b2e58dd4f20bd28d24e975aaf517ec30a5ac540ebc7617f0358e0b',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07K B03 portal-exterior compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID_NAMES.has(blockName(state)) || state.includes('waterlogged=true');
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const stateCensus = (records) => {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const stateSetSha256 = (records) => sha256(
  `${records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  )).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`,
);

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const [x, y, z] = pending.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) pending.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, componentSizes: sizes };
}

function faceDilate(cells) {
  return uniqueCells(cells.flatMap((cell) => [
    cell,
    ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
      x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
    })),
  ]));
}

function operationTargetIntersection(filename, targetCells) {
  const targetBounds = boundsOf(targetCells);
  const hits = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const coordinates = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(coordinates[0], coordinates[3]),
      maxX: Math.max(coordinates[0], coordinates[3]),
      minY: Math.min(coordinates[1], coordinates[4]),
      maxY: Math.max(coordinates[1], coordinates[4]),
      minZ: Math.min(coordinates[2], coordinates[5]),
      maxZ: Math.max(coordinates[2], coordinates[5]),
    };
    if (bounds.maxX < targetBounds.minX || bounds.minX > targetBounds.maxX
      || bounds.maxY < targetBounds.minY || bounds.minY > targetBounds.maxY
      || bounds.maxZ < targetBounds.minZ || bounds.minZ > targetBounds.maxZ) continue;
    hits.push(...targetCells.filter((cell) => insideBounds(cell, bounds)));
  }
  return uniqueCells(hits);
}

function savedEntityTouchesHalo(entity, haloKeys) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number).map(Math.floor);
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (haloKeys.has(`${x + dx},${y + dy},${z + dz}`)) return true;
      }
    }
  }
  return false;
}

const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceLedgerSha256 = sha256(fs.readFileSync(absolute(SOURCE_LEDGER)));
const sourceRegionIdentity = readJson(sourceLedger.postSnapshot.identity.path);
const b03 = readJson(INPUTS.b03Geometry);
const releaseContract = readJson(INPUTS.releaseContract);
const authorization = readJson(INPUTS.standingAuthorization);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r07aManifest = readJson(INPUTS.r07aManifest);
const r07aPostQa = readJson(INPUTS.r07aPostQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the accepted complete immutable R08T post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedgerSha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT),
'source ledger is not the accepted R08T terminal state');
invariant(sourceRegionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && absolute(sourceRegionIdentity.directory) === absolute(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B03'),
'standing authorization does not cover R07/P1-B03');
const r07Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r07Node?.activeScope?.includes('Remaining portal/viaduct exterior'),
'R07 active scope does not expressly include remaining portal exterior');
const currentStateText = fs.readFileSync(absolute(INPUTS.currentState), 'utf8');
invariant(currentStateText.includes('remaining portal exterior'),
'CURRENT-STATE does not retain remaining portal exterior as active work');
invariant(r07aManifest.releaseNodeId === RELEASE_NODE_ID
  && r07aManifest.scopeIds.includes('P1-B03')
  && r07aPostQa.status.startsWith('PASS_')
  && r07aPostQa.summary?.passed === true
  && r07aPostQa.summary?.failCount === 0,
'accepted R07A portal-tube evidence is not PASS');

const construction = uniqueCells(b03.design.excavationReservation.cells);
const interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
invariant(construction.length === EXPECTED.b03ConstructionCellCount
  && hashCells(construction) === EXPECTED.b03ConstructionSha256
  && interaction.length === EXPECTED.b03InteractionCellCount
  && hashCells(interaction) === EXPECTED.b03InteractionSha256,
'canonical B03 construction/interaction identity drifted');
const constructionKeys = new Set(construction.map(cellKey));
const interactionKeys = new Set(interaction.map(cellKey));

const endpointIndices = [188, 612];
const endpoints = endpointIndices.map((index) => (
  b03.design.centerline.points.find((point) => point.index === index)
));
invariant(endpoints.every(Boolean)
  && endpoints.every(({ x, y }) => x === 2236 && y === 166)
  && endpoints.map(({ z }) => z).join(',') === '-748,-868',
'accepted exposed-route portal endpoints drifted');

function portalCollar(endpoint) {
  const cells = [];
  for (const x of [endpoint.x, endpoint.x + 1]) {
    const columnBaseY = x === endpoint.x ? endpoint.y + 1 : endpoint.y;
    for (const z of [endpoint.z - 4, endpoint.z + 4]) {
      for (let y = columnBaseY; y <= endpoint.y + 4; y += 1) cells.push({ x, y, z });
    }
    for (let z = endpoint.z - 4; z <= endpoint.z + 4; z += 1) {
      cells.push({ x, y: endpoint.y + 5, z });
    }
  }
  return uniqueCells(cells);
}

function routeAperture(endpoint) {
  return cellsIn({
    minX: endpoint.x, maxX: endpoint.x + 1,
    minY: endpoint.y, maxY: endpoint.y + 3,
    minZ: endpoint.z - 2, maxZ: endpoint.z + 2,
  });
}

const collars = endpoints.map((endpoint) => portalCollar(endpoint));
const targets = uniqueCells(collars.flat());
const routeApertures = uniqueCells(endpoints.flatMap(routeAperture));
invariant(collars.every((cells) => cells.length === 36)
  && targets.length === EXPECTED.operatedCellCount
  && hashCells(targets) === EXPECTED.operatedCoordinateSetSha256
  && connectedComponents(targets).componentCount === 2
  && connectedComponents(targets).componentSizes.join(',') === '36,36',
'twin portal-collar geometry drifted');
invariant(routeApertures.length === 80
  && routeApertures.every((cell) => constructionKeys.has(cellKey(cell)))
  && targets.every((cell) => !constructionKeys.has(cellKey(cell)))
  && targets.every((cell) => !interactionKeys.has(cellKey(cell))),
'collar/aperture ownership partition drifted');
const targetKeys = new Set(targets.map(cellKey));
invariant(routeApertures.every((cell) => !targetKeys.has(cellKey(cell))),
'portal collar narrows the accepted route aperture');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const baselineReader = new AnvilReader(absolute(path.join(INPUTS.r07jPostSnapshot, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function readStates(cells, selectedReader = reader) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await selectedReader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}

const reviewPrism = uniqueCells(endpoints.flatMap((endpoint) => cellsIn({
  minX: 2234, maxX: 2239, minY: 164, maxY: 173,
  minZ: endpoint.z - 6, maxZ: endpoint.z + 6,
})));
const reviewRecords = await readStates(reviewPrism);
const baselineReviewRecords = await readStates(reviewPrism, baselineReader);
const reviewMismatchCount = reviewRecords.filter((record, index) => (
  record.state !== baselineReviewRecords[index].state
)).length;
invariant(reviewPrism.length === 1560
  && stateSetSha256(reviewRecords) === EXPECTED.r07jPortalReviewStateSetSha256
  && stateSetSha256(baselineReviewRecords) === EXPECTED.r07jPortalReviewStateSetSha256
  && reviewMismatchCount === 0,
'portal review prism drifted between accepted R07J and R08T posts');

const targetRecords = await readStates(targets);
const apertureRecords = await readStates(routeApertures);
invariant(targetRecords.every(({ state }) => ALLOWED_TARGET_SOURCE_STATES.has(state)),
'portal collar target has an unsafe or unexpected source state');
invariant(apertureRecords.every(({ state }) => AIR_STATES.has(blockName(state))),
'accepted portal aperture is not completely clear air');
invariant(targetRecords.every(({ state }) => !isFluid(state)
  && !GRAVITY_NAMES.has(blockName(state))
  && !FORBIDDEN_SOURCE_NAMES.has(blockName(state))),
'portal collar target intersects fluid, gravity, container, or control state');

const supports = uniqueCells(endpoints.flatMap((endpoint) => [
  { x: endpoint.x, y: endpoint.y, z: endpoint.z - 4 },
  { x: endpoint.x, y: endpoint.y, z: endpoint.z + 4 },
  { x: endpoint.x + 1, y: endpoint.y - 1, z: endpoint.z - 4 },
  { x: endpoint.x + 1, y: endpoint.y - 1, z: endpoint.z + 4 },
]));
const supportRecords = await readStates(supports);
invariant(supports.length === 8
  && supportRecords.every(({ state }) => state === 'minecraft:polished_diorite'),
'portal collar does not have eight exact polished-diorite support contacts');

const faceHalo = faceDilate(targets);
const haloRecords = await readStates(faceHalo);
const polishedDioriteContacts = uniqueCells(haloRecords.filter(({ cell, state }) => (
  !targetKeys.has(cellKey(cell)) && state === 'minecraft:polished_diorite'
)).map(({ cell }) => cell));
invariant(polishedDioriteContacts.length === 60,
'portal collar does not reproduce 60 exact polished-diorite face contacts');

const priorReleaseProof = [];
const priorHits = [];
for (const manifestPath of PRIOR_MANIFESTS) {
  invariant(fs.existsSync(absolute(manifestPath)), `missing prior manifest ${manifestPath}`);
  const manifest = readJson(manifestPath);
  const hits = uniqueCells((manifest.packages ?? []).flatMap((pkg) => (
    operationTargetIntersection(pkg.forward, targets)
  )));
  priorHits.push(...hits);
  priorReleaseProof.push({
    transactionId: manifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
invariant(uniqueCells(priorHits).length === 0,
'portal collar overlaps an accepted prior guarded-operation target');

const haloKeys = new Set(faceHalo.map(cellKey));
const touchedChunks = [...new Set(faceHalo.map(({ x, z }) => (
  `${Math.floor(x / 16)},${Math.floor(z / 16)}`
)))].sort().map((key) => {
  const [x, z] = key.split(',').map(Number);
  return { x, z };
});
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const { x: cx, z: cz } of touchedChunks) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (haloKeys.has(cellKey(cell))) blockEntityIntersections.push({ id: entity.id, cell });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityTouchesHalo(entity, haloKeys)) {
      savedEntityIntersections.push({ id: entity.id, position: entity.Pos.slice(0, 3) });
    }
  }
}
invariant(blockEntityIntersections.length === 0, 'portal face halo intersects a block entity');
invariant(savedEntityIntersections.length === 0, 'portal face halo intersects a saved entity');
const relicIntersections = protectedRelics.relics.flatMap((relic) => {
  const hits = faceHalo.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  return hits.length ? [{ relic: relic.key, ...classManifest(hits) }] : [];
});
invariant(relicIntersections.length === 0, 'portal face halo intersects a protected relic');
invariant(haloRecords.every(({ state }) => !isFluid(state))
  && haloRecords.every(({ state }) => !GRAVITY_NAMES.has(blockName(state))),
'portal face halo contains fluid or gravity state');

const forwardBody = `${targetRecords.map(({ cell, state }) => (
  replLine(cell, state, TARGET_STATE)
)).join('\n')}\n`;
const rollbackBody = `${targetRecords.slice().reverse().map(({ cell, state }) => (
  replLine(cell, TARGET_STATE, state)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(targets)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_R08T_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B03-PORTAL-EXTERIOR'],
  packages: [{ key: PACKAGE_KEY, forward: relative(forward), rollback: relative(rollback) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One dry/static exact package; rollback reverses all per-cell operations.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'P1-B03',
    material: TARGET_STATE,
    engineeringBasis: {
      form:
        'Twin two-block-deep U collars frame the exact R07A five-wide/four-high openings without narrowing them.',
      material:
        'Stone bricks continue the accepted R07B viaduct exterior while leaving the polished-diorite tube legible and untouched.',
      support:
        'Each frame column starts immediately above exact polished-diorite bearing; each lintel directly contacts the accepted tube roof.',
      rollback:
        'Every exact source air state is restored in reverse order; no mountain, tube, route, fluid, entity, block entity, or relic is migrated.',
    },
    geometry: {
      portalEndpoints: endpoints,
      northPortalCollar: { ...classManifest(collars[0]), ...connectedComponents(collars[0]) },
      southPortalCollar: { ...classManifest(collars[1]), ...connectedComponents(collars[1]) },
      twinPortalCollars: { ...classManifest(targets), ...connectedComponents(targets) },
      preservedRouteApertures: {
        ...classManifest(routeApertures),
        ...connectedComponents(routeApertures),
        stateCensus: stateCensus(apertureRecords),
      },
      supportContacts: {
        ...classManifest(supports),
        sourceStateCensus: stateCensus(supportRecords),
      },
      polishedDioriteFaceContacts: classManifest(polishedDioriteContacts),
    },
    ownership: {
      historicalB03ConstructionIntersectionCount: 0,
      historicalB03InteractionIntersectionCount: 0,
      namedReviewedExtension: {
        id: 'P1-B03-TWIN-PORTAL-EXTERIOR-COLLAR-EXTENSION-R07K',
        authority:
          'CURRENT-STATE remaining portal exterior + release-contract R07 activeScope + standing scoped build authorization',
        disposition: 'REVIEWED_EXACT_EXTENSION_FOR_DRY_PORTAL_ARCHITECTURE_ONLY',
        operatedCells: classManifest(targets),
        priorTargetIntersectionCount: 0,
        everyTargetFaceConnectedToAcceptedPortalFabric:
          targets.every((cell) => FACE_NEIGHBOURS.some(([dx, dy, dz]) => {
            const key = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
            return targetKeys.has(key) || polishedDioriteContacts.some((contact) => cellKey(contact) === key);
          })),
      },
    },
    operationalBoundary: {
      routeApertureChanged: false,
      tubeShellChanged: false,
      mountainSeamChanged: false,
      viaductChanged: false,
      railPowerBrakeControlsInstalled: false,
      drainageOrFluidChanged: false,
      routeCommissioned: false,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceRegionIdentity.sha256,
    intakeAudit: fileBinding(INTAKE_AUDIT),
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    disjointRebaseProof: {
      baseline: 'R07J_POST',
      terminal: 'R08T_POST',
      reviewPrism: classManifest(reviewPrism),
      baselineBlockStateSetSha256: stateSetSha256(baselineReviewRecords),
      terminalBlockStateSetSha256: stateSetSha256(reviewRecords),
      mismatchCount: reviewMismatchCount,
    },
    sourceStateCensus: stateCensus(targetRecords),
    sourceBlockStateSetSha256: stateSetSha256(targetRecords),
    touchedChunks,
  },
  target: {
    operatedUnion: classManifest(targets),
    sourceStateCensus: stateCensus(targetRecords),
    desiredStateCensus: { [TARGET_STATE]: targets.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: targets.length,
      rollbackCommandCount: targets.length,
      targetCellCount: targets.length,
      targetCoordinateSetSha256: hashCells(targets),
      sourceStateCensus: stateCensus(targetRecords),
      desiredStateCensus: { [TARGET_STATE]: targets.length },
      exactInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    routeApertures: classManifest(routeApertures),
    polishedDioritePortalFabric: classManifest(polishedDioriteContacts),
    acceptedPriorReleaseTargetProof: priorReleaseProof,
    acceptedPriorReleaseTargetIntersectionCount: 0,
  },
  safetyAudit: {
    faceHalo: classManifest(faceHalo),
    targetFluidCount: 0,
    targetGravityCount: 0,
    targetForbiddenContainerOrControlCount: 0,
    haloFluidCount: 0,
    haloGravityCount: 0,
    haloBlockEntityCount: blockEntityIntersections.length,
    haloSavedEntityCount: savedEntityIntersections.length,
    haloProtectedRelicCount: relicIntersections.length,
    frameComponentCount: connectedComponents(targets).componentCount,
    routeApertureComponentCount: connectedComponents(routeApertures).componentCount,
    supportContactCount: supports.length,
    allSupportsExactPolishedDiorite: true,
    allAperturesClearAir: true,
    routeClearancePreserved: true,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    b03Geometry: fileBinding(INPUTS.b03Geometry),
    currentState: fileBinding(INPUTS.currentState),
    releaseContract: fileBinding(INPUTS.releaseContract),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
    r07aManifest: fileBinding(INPUTS.r07aManifest),
    r07aPostQa: fileBinding(INPUTS.r07aPostQa),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and exact source preflight',
    'fresh live-entity clearance over the exact target halo',
    'strict-noop forward and rollback parser checks',
    'journaled strict execution with automatic exact compensation',
    'fresh post snapshot and rollback post-state preflight',
    'post-release aperture, frame-support, interface-preservation, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    routeCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity,
  source: manifest.source.snapshotRoot,
  targetCellCount: targets.length,
  sourceStateCensus: stateCensus(targetRecords),
  preservedRouteApertureCellCount: routeApertures.length,
  polishedDioriteFaceContactCount: polishedDioriteContacts.length,
  priorTargetIntersectionCount: uniqueCells(priorHits).length,
  liveCallsPerformed: false,
}, null, 2));
