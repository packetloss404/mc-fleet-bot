#!/usr/bin/env node
/**
 * Compile the first capped-retail-shell architecture wave in Empty Eight.
 *
 * The nine selected 12x4x9 volumes come only from the frozen D06 geology
 * design. Every exterior cell becomes the palette's light-gray-concrete
 * retail lining and every internal cell becomes air. The entrance plane is
 * part of the complete boundary, so this release does not open or fit out a
 * tenant space.
 *
 * This compiler is offline. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  rawCoordinateHash,
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
const values = (flag) => argv.flatMap((entry, index) => (
  entry === flag && argv[index + 1] ? [argv[index + 1]] : []
));

const GENERATED_AT = value('--generated-at', '2026-08-21T17:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r09c-post-20260821T175500Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09c-live-20260821T175500Z/post-complete-save-intake.json',
);
const SOURCE_RELEASE_LEDGER = value(
  '--source-release-ledger',
  'data/world-review/combined-zones-r09c-live-20260821T175500Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08-north-galleria-capped-retail-shells',
);
const RELEASE_ID = value(
  '--release-id',
  'CZ-R08N-NORTH-GALLERIA-CAPPED-RETAIL-SHELLS',
);
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CANONICAL_OWNER = 'Z02-U1-CONCOURSE-MALL';
const MANIFEST_STATUS = value(
  '--manifest-status',
  'COMPILED_FROM_ACCEPTED_R09C_POST_AWAITING_FRESH_EXECUTION_KERNEL',
);
const DEFAULT_SHELL_IDS = Object.freeze([
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
]);
const explicitShellIds = [
  ...values('--shell-id'),
  ...values('--shell-ids').flatMap((entry) => entry.split(',').filter(Boolean)),
];
const SHELL_IDS = Object.freeze(explicitShellIds.length > 0
  ? explicitShellIds
  : [...DEFAULT_SHELL_IDS]);
const ISOLATE_TARGET_GRAVITY = argv.includes('--isolate-target-gravity');
const ISOLATE_TARGET_FLUID = argv.includes('--isolate-target-fluid');

const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  priorManifests: [
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
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
    'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
    'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
    ...values('--prior-manifest'),
  ],
});

const MATERIALS = Object.freeze({
  retailShellLining: 'minecraft:light_gray_concrete',
  emptyInterior: 'minecraft:air',
});
const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08 north-galleria retail compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR_BLOCKS.has(blockName(state));
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const isGravity = (state) => GRAVITY_BLOCKS.has(blockName(state));
const isForbidden = (state) => (
  FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
  || /_shulker_box$/.test(blockName(state))
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .join('\n')}\n`;

function census(records, stateSelector = (record) => record.state) {
  const counts = new Map();
  for (const record of records) {
    const state = stateSelector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function connectedComponents(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let size = 0;
    while (queue.length > 0) {
      const key = queue.pop();
      size += 1;
      const [x, y, z] = key.split(',').map(Number);
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (!remaining.delete(neighbour)) continue;
        queue.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return {
    componentCount: sizes.length,
    largestComponentCellCount: sizes[0] ?? 0,
    componentSizeCensus: Object.fromEntries(
      [...new Set(sizes)].sort((left, right) => right - left)
        .map((size) => [String(size), sizes.filter((entry) => entry === size).length]),
    ),
  };
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const intersections = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#') || raw.startsWith('CMD ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `prior operation ${filename} contains a malformed line`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `prior operation ${filename} contains invalid coordinates`);
    const minX = Math.max(Math.min(coordinates[0], coordinates[3]), targetBounds.minX);
    const maxX = Math.min(Math.max(coordinates[0], coordinates[3]), targetBounds.maxX);
    const minY = Math.max(Math.min(coordinates[1], coordinates[4]), targetBounds.minY);
    const maxY = Math.min(Math.max(coordinates[1], coordinates[4]), targetBounds.maxY);
    const minZ = Math.max(Math.min(coordinates[2], coordinates[5]), targetBounds.minZ);
    const maxZ = Math.min(Math.max(coordinates[2], coordinates[5]), targetBounds.maxZ);
    if (minX > maxX || minY > maxY || minZ > maxZ) continue;
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const key = `${x},${y},${z}`;
          if (targetKeys.has(key)) intersections.add(key);
        }
      }
    }
  }
  return [...intersections].map((key) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  });
}

function savedEntityInsideAnyEnvelope(entity, envelopes) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return envelopes.some((bounds) => (
    x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1
  ));
}

const emptyEight = readJson(INPUTS.emptyEight);
const releaseContract = readJson(INPUTS.releaseContract);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_RELEASE_LEDGER);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
  'source intake is not bound to the requested snapshot');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot?.completeSaveSha256 === intake.packageIdentity.completeSaveSha256
  && sourceLedger.manifest?.sha256
    === sha256(fs.readFileSync(absolute(sourceLedger.manifest.path))),
'source ledger is not the accepted terminal execution bound to this post save');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary?.excludedScopeIds?.includes(CANONICAL_OWNER),
'standing authorization does not cover this R08 MVP owner');
const releaseNode = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(releaseNode?.canonicalOwners?.includes(CANONICAL_OWNER),
'release contract does not assign the concourse-mall owner to R08');

const paletteEntry = emptyEight.d06.architecturalLanguage.palette.find(
  ({ id }) => id === 'EE-P04',
);
invariant(paletteEntry?.block === MATERIALS.retailShellLining
  && paletteEntry.role === 'quiet wall panels and retail-shell lining',
'frozen EE-P04 retail-lining material drifted');
const shellById = new Map(
  emptyEight.d06.concourseAndRetail.retailShells.map((shell) => [shell.id, shell]),
);
const shells = SHELL_IDS.map((id) => shellById.get(id));
invariant(shells.length > 0 && shells.every(Boolean)
  && new Set(SHELL_IDS).size === SHELL_IDS.length,
'one or more selected frozen retail shells are absent or duplicated');
invariant(emptyEight.d06.concourseAndRetail.tenantFitOutAuthorized === false,
'tenant fit-out unexpectedly became authorized');

const shellDesigns = shells.map((shell) => {
  const full = cellsIn(shell.bounds);
  const boundary = full.filter((cell) => (
    cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
    || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
    || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ
  ));
  const boundaryKeys = new Set(boundary.map(cellKey));
  const interior = full.filter((cell) => !boundaryKeys.has(cellKey(cell)));
  const entranceCap = cellsIn({
    minX: shell.entrancePlane.minX,
    maxX: shell.entrancePlane.maxX,
    minY: shell.entrancePlane.y,
    maxY: shell.entrancePlane.y,
    minZ: shell.entrancePlane.z,
    maxZ: shell.entrancePlane.z,
  });
  const envelopeBounds = {
    minX: shell.bounds.minX - 1,
    maxX: shell.bounds.maxX + 1,
    minY: shell.bounds.minY - 1,
    maxY: shell.bounds.maxY + 1,
    minZ: shell.bounds.minZ - 1,
    maxZ: shell.bounds.maxZ + 1,
  };
  invariant(shell.state === 'CAPPED_EMPTY_FUTURE_TENANT_SHELL'
    && shell.tenantFitOutAuthorized === false
    && shell.cellCount === 432
    && shell.bounds.maxX - shell.bounds.minX + 1 === 12
    && shell.bounds.maxY - shell.bounds.minY + 1 === 4
    && shell.bounds.maxZ - shell.bounds.minZ + 1 === 9
    && rawCoordinateHash(full) === shell.cellSetSha256,
  `${shell.id} frozen 12x4x9 identity drifted`);
  invariant(boundary.length === 292 && interior.length === 140
    && entranceCap.length === 12
    && entranceCap.every((cell) => boundaryKeys.has(cellKey(cell)))
    && connectedComponents(boundary).componentCount === 1
    && connectedComponents(interior).componentCount === 1,
  `${shell.id} does not reproduce a complete connected cap around one connected void`);
  return { shell, full, boundary, boundaryKeys, interior, entranceCap, envelopeBounds };
});

const fullUnion = uniqueCells(shellDesigns.flatMap(({ full }) => full));
const boundaryUnion = uniqueCells(shellDesigns.flatMap(({ boundary }) => boundary));
const interiorUnion = uniqueCells(shellDesigns.flatMap(({ interior }) => interior));
const entranceCapUnion = uniqueCells(shellDesigns.flatMap(({ entranceCap }) => entranceCap));
const fullUnionKeys = new Set(fullUnion.map(cellKey));
const desiredFullStateByKey = new Map([
  ...boundaryUnion.map((cell) => [cellKey(cell), MATERIALS.retailShellLining]),
  ...interiorUnion.map((cell) => [cellKey(cell), MATERIALS.emptyInterior]),
]);
invariant(fullUnion.length === shellDesigns.length * 432
  && shellDesigns.reduce((sum, { full }) => sum + full.length, 0) === fullUnion.length,
'the selected shell prisms are not exactly pairwise disjoint');
invariant(boundaryUnion.length === shellDesigns.length * 292
  && interiorUnion.length === shellDesigns.length * 140
  && connectedComponents(fullUnion).componentCount === shellDesigns.length
  && connectedComponents(boundaryUnion).componentCount === shellDesigns.length
  && connectedComponents(interiorUnion).componentCount === shellDesigns.length,
'selected-shell union topology drifted');

const interactionHalo = uniqueCells(shellDesigns.flatMap(({ envelopeBounds }) => (
  cellsIn(envelopeBounds)
))).filter((cell) => !fullUnionKeys.has(cellKey(cell)));
const interactionEnvelope = uniqueCells([...fullUnion, ...interactionHalo]);
const interactionEnvelopeKeys = new Set(interactionEnvelope.map(cellKey));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const sourceByKey = new Map();
for (const cell of interactionEnvelope) {
  sourceByKey.set(cellKey(cell), stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
}

const targetHazards = [];
for (const cell of fullUnion) {
  const state = sourceByKey.get(cellKey(cell));
  if (isFluid(state) || isGravity(state) || isForbidden(state)) {
    targetHazards.push({ cell, state, fluid: isFluid(state), gravity: isGravity(state), forbidden: isForbidden(state) });
  }
}
const targetFluidHazards = targetHazards.filter(({ fluid }) => fluid);
const targetForbiddenHazards = targetHazards.filter(({ forbidden }) => forbidden);
const targetGravityHazards = targetHazards.filter(({ gravity }) => gravity);
invariant(targetForbiddenHazards.length === 0
  && (targetFluidHazards.length === 0 || ISOLATE_TARGET_FLUID)
  && (targetGravityHazards.length === 0 || ISOLATE_TARGET_GRAVITY),
`a retail-shell target contains unauthorized fluid/gravity/container/control state: ${JSON.stringify(targetHazards.slice(0, 20))}`);
invariant(!ISOLATE_TARGET_GRAVITY || shellDesigns.length === 1,
'isolated target-gravity mode requires exactly one frozen retail shell');
invariant(!ISOLATE_TARGET_FLUID || (
  shellDesigns.length === 1
  && SHELL_IDS[0] === 'EE-R-N07'
  && !ISOLATE_TARGET_GRAVITY
), 'isolated target-fluid mode is restricted to the exact reviewed EE-R-N07 shell');
const targetFluidCensus = census(targetFluidHazards, ({ state }) => state);
const targetFluidBoundary = targetFluidHazards.filter(({ cell }) => (
  shellDesigns[0]?.boundaryKeys.has(cellKey(cell))
));
const targetFluidInterior = targetFluidHazards.filter(({ cell }) => (
  !shellDesigns[0]?.boundaryKeys.has(cellKey(cell))
));
if (ISOLATE_TARGET_FLUID) {
  invariant(targetFluidHazards.length === 26
    && targetFluidBoundary.length === 23
    && targetFluidInterior.length === 3
    && targetFluidCensus['minecraft:water[level=0]'] === 24
    && targetFluidCensus['minecraft:bubble_column[drag=true]'] === 2
    && Object.keys(targetFluidCensus).length === 2
    && hashCells(targetFluidHazards.map(({ cell }) => cell))
      === '14ca1664eec374651b07e986c9ed2a7de28278287a0efa0fbba7653fe6d8f3e6',
  `N07 exact reviewed fluid set drifted: ${JSON.stringify(targetFluidCensus)}`);
}

const targetGravityClosure = [];
for (const hazard of targetGravityHazards) {
  const desiredState = desiredFullStateByKey.get(cellKey(hazard.cell));
  const dependency = [];
  let cursor = { x: hazard.cell.x, y: hazard.cell.y - 1, z: hazard.cell.z };
  let sourceState = sourceByKey.get(cellKey(cursor))
    ?? stateToCommandString(await reader.blockState(cursor.x, cursor.y, cursor.z));
  while (isGravity(sourceState) && fullUnionKeys.has(cellKey(cursor))) {
    const dependencyDesiredState = desiredFullStateByKey.get(cellKey(cursor));
    dependency.push({ cell: cursor, sourceState, desiredState: dependencyDesiredState });
    cursor = { x: cursor.x, y: cursor.y - 1, z: cursor.z };
    sourceState = sourceByKey.get(cellKey(cursor))
      ?? stateToCommandString(await reader.blockState(cursor.x, cursor.y, cursor.z));
    invariant(dependency.length <= 384,
      `target gravity dependency below ${cellKey(hazard.cell)} did not terminate`);
  }
  const terminalDesiredState = desiredFullStateByKey.get(cellKey(cursor)) ?? sourceState;
  const stableTerminal = !isAir(sourceState) && !isFluid(sourceState)
    && !isGravity(sourceState) && !isForbidden(sourceState);
  targetGravityClosure.push({
    cell: hazard.cell,
    sourceState: hazard.state,
    desiredState,
    targetDependency: dependency,
    terminalSupport: { cell: cursor, sourceState, finalState: terminalDesiredState },
    sourceGravityChainDurablySupported: stableTerminal,
    stableBottomUpForwardOrder: desiredState === MATERIALS.retailShellLining
      && stableTerminal,
    safeTopDownExtractionOrder: desiredState === MATERIALS.emptyInterior && stableTerminal,
    forwardAction: desiredState === MATERIALS.retailShellLining
      ? 'STATIC_LINING_STABILIZATION'
      : 'TOP_DOWN_GRAVITY_EXTRACTION',
    exactRollbackRestoresGravityLast: true,
  });
}
const extractionKeys = new Set(targetGravityClosure
  .filter(({ desiredState }) => desiredState === MATERIALS.emptyInterior)
  .map(({ cell }) => cellKey(cell)));
const extractionSupportViolations = [];
for (const finding of targetGravityClosure.filter(
  ({ desiredState }) => desiredState === MATERIALS.emptyInterior,
)) {
  const above = { x: finding.cell.x, y: finding.cell.y + 1, z: finding.cell.z };
  const aboveState = sourceByKey.get(cellKey(above))
    ?? stateToCommandString(await reader.blockState(above.x, above.y, above.z));
  if (!isGravity(aboveState)) continue;
  const aboveDesiredState = desiredFullStateByKey.get(cellKey(above));
  if (aboveDesiredState === MATERIALS.retailShellLining
    || (aboveDesiredState === MATERIALS.emptyInterior && extractionKeys.has(cellKey(above)))) continue;
  extractionSupportViolations.push({
    cell: finding.cell,
    unsupportedGravityAbove: { cell: above, state: aboveState, desiredState: aboveDesiredState ?? null },
  });
}
invariant(targetGravityClosure.every(({
  desiredState, sourceGravityChainDurablySupported, stableBottomUpForwardOrder,
  safeTopDownExtractionOrder,
}) => (
  sourceGravityChainDurablySupported
  && (desiredState === MATERIALS.retailShellLining
    ? stableBottomUpForwardOrder
    : desiredState === MATERIALS.emptyInterior && safeTopDownExtractionOrder)
)) && extractionSupportViolations.length === 0,
'target gravity cannot be isolated into durable stabilization/extraction packages with exact rollback');

const haloFluid = [];
const haloForbidden = [];
const haloGravity = [];
for (const cell of interactionHalo) {
  const state = sourceByKey.get(cellKey(cell));
  if (isFluid(state)) {
    const adjacentTargets = FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
      x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
    })).filter((entry) => fullUnionKeys.has(cellKey(entry)));
    haloFluid.push({
      cell,
      state,
      adjacentTargets: adjacentTargets.map((entry) => ({
        cell: entry,
        sourceState: sourceByKey.get(cellKey(entry)),
        finalState: desiredFullStateByKey.get(cellKey(entry)),
      })),
      retainedUntouched: true,
      finalTargetInterfaceStatic: adjacentTargets.every((entry) => (
        desiredFullStateByKey.get(cellKey(entry)) === MATERIALS.retailShellLining
      )),
    });
  }
  if (isForbidden(state)) haloForbidden.push({ cell, state });
  if (isGravity(state)) {
    const adjacentTargetCount = FACE_NEIGHBOURS.filter(([dx, dy, dz]) => (
      fullUnionKeys.has(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`)
    )).length;
    const support = { x: cell.x, y: cell.y - 1, z: cell.z };
    const gravityDependency = [];
    let cursor = support;
    let supportState = sourceByKey.get(cellKey(cursor))
      ?? stateToCommandString(await reader.blockState(cursor.x, cursor.y, cursor.z));
    while (isGravity(supportState)
      && !(ISOLATE_TARGET_GRAVITY && fullUnionKeys.has(cellKey(cursor)))) {
      gravityDependency.push({ cell: cursor, state: supportState });
      invariant(gravityDependency.length <= 384,
        `gravity dependency below ${cellKey(cell)} did not terminate`);
      cursor = { x: cursor.x, y: cursor.y - 1, z: cursor.z };
      supportState = sourceByKey.get(cellKey(cursor))
        ?? stateToCommandString(await reader.blockState(cursor.x, cursor.y, cursor.z));
    }
    const terminalFinalState = desiredFullStateByKey.get(cellKey(cursor)) ?? supportState;
    haloGravity.push({
      cell,
      state,
      adjacentTargetCount,
      support,
      supportState: sourceByKey.get(cellKey(support))
        ?? gravityDependency[0]?.state
        ?? supportState,
      verticalGravityDependency: gravityDependency,
      terminalSupport: { cell: cursor, sourceState: supportState, finalState: terminalFinalState },
      declaredSolidSupportTransitionCount: fullUnionKeys.has(cellKey(cursor)) ? 1 : 0,
      stableAndUnaffected: (!isAir(supportState) && !isFluid(supportState)
        && (!isGravity(supportState)
          || (ISOLATE_TARGET_GRAVITY && fullUnionKeys.has(cellKey(cursor))))
        && !isForbidden(supportState))
        && !isAir(terminalFinalState) && !isFluid(terminalFinalState)
        && !isGravity(terminalFinalState) && !isForbidden(terminalFinalState),
    });
  }
}
invariant((haloFluid.length === 0 || ISOLATE_TARGET_FLUID) && haloForbidden.length === 0,
'interaction halo contains unauthorized fluid or a container/control block');
invariant(haloGravity.every(({ stableAndUnaffected }) => stableAndUnaffected),
'interaction halo contains gravity whose dependency is affected or unstable');

const floorContacts = shellDesigns.flatMap(({ shell }) => cellsIn({
  minX: shell.bounds.minX,
  maxX: shell.bounds.maxX,
  minY: shell.bounds.minY - 1,
  maxY: shell.bounds.minY - 1,
  minZ: shell.bounds.minZ,
  maxZ: shell.bounds.maxZ,
}));
const floorContactRecords = floorContacts.map((cell) => ({
  cell,
  state: sourceByKey.get(cellKey(cell)),
}));
const hazardousFloorContacts = floorContactRecords.filter(({ state }) => (
  isFluid(state) || isForbidden(state)
));
const gravityFloorContacts = floorContactRecords.filter(({ state }) => isGravity(state));
const stableGravityKeys = new Set(haloGravity
  .filter(({ stableAndUnaffected }) => stableAndUnaffected)
  .map(({ cell }) => cellKey(cell)));
invariant((hazardousFloorContacts.length === 0 || (
  ISOLATE_TARGET_FLUID
  && hazardousFloorContacts.every(({ state }) => isFluid(state))
)) , 'a floor contact contains unauthorized fluid, container, or control state');
invariant(gravityFloorContacts.every(({ cell }) => stableGravityKeys.has(cellKey(cell))),
'a gravity floor contact lacks a complete stable vertical dependency closure');

const touchedChunks = [];
const chunkKeys = new Set();
for (const { envelopeBounds } of shellDesigns) {
  for (let x = Math.floor(envelopeBounds.minX / 16); x <= Math.floor(envelopeBounds.maxX / 16); x += 1) {
    for (let z = Math.floor(envelopeBounds.minZ / 16); z <= Math.floor(envelopeBounds.maxZ / 16); z += 1) {
      const key = `${x},${z}`;
      if (chunkKeys.has(key)) continue;
      chunkKeys.add(key);
      touchedChunks.push({ x, z });
    }
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionEnvelopeKeys.has(cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInsideAnyEnvelope(entity, shellDesigns.map(({ envelopeBounds }) => envelopeBounds))) {
      savedEntityIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && savedEntityIntersections.length === 0,
'source interaction envelope intersects a block entity or saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = interactionEnvelope.filter((cell) => insideBounds(
    cell,
    relic.declaredInclusiveBounds,
  ));
  if (cells.length > 0) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'source interaction envelope intersects a protected relic core');
const futureSealCells = uniqueCells(emptyEight.d06.futureInterfaces.interfaces.flatMap(
  (entry) => cellsIn(entry.sealDesign.bounds),
));
const futureSealKeys = new Set(futureSealCells.map(cellKey));
const futureSealIntersections = interactionEnvelope.filter(
  (cell) => futureSealKeys.has(cellKey(cell)),
);
invariant(futureSealIntersections.length === 0,
'source interaction envelope intersects a deferred future-line seal');

const priorManifestChecks = [];
const priorIntersections = [];
const targetBounds = boundsOf(fullUnion);
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  let intersectionCount = 0;
  for (const pkg of manifest.packages ?? []) {
    const declared = manifest.operations?.[pkg.key]
      ?? ((manifest.packages?.length === 1 && manifest.operations?.forwardSha256)
        ? manifest.operations
        : null);
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `accepted prior package ${manifest.transactionId}/${pkg.key} operation body drifted`);
    const cells = priorOperationIntersections(pkg.forward, fullUnionKeys, targetBounds);
    intersectionCount += cells.length;
    if (cells.length > 0) {
      priorIntersections.push({
        packageId: `${manifest.transactionId}/${pkg.key}`,
        operationPath: pkg.forward,
        ...classManifest(cells),
      });
    }
  }
  priorManifestChecks.push({
    transactionId: manifest.transactionId,
    path: manifestPath,
    manifestIdentity: manifest.manifestIdentity ?? null,
    targetIntersectionCount: intersectionCount,
  });
}
invariant(priorIntersections.length === 0,
'retail-shell targets intersect an accepted prior release');

const shellPackages = [];
for (const design of shellDesigns) {
  const desiredByKey = new Map();
  for (const cell of design.boundary) desiredByKey.set(cellKey(cell), MATERIALS.retailShellLining);
  for (const cell of design.interior) desiredByKey.set(cellKey(cell), MATERIALS.emptyInterior);
  const boundaryOperations = [];
  const interiorOperations = [];
  const alreadyTarget = [];
  const fullSourceRecords = [];
  for (const cell of design.full) {
    const fromState = sourceByKey.get(cellKey(cell));
    const toState = desiredByKey.get(cellKey(cell));
    fullSourceRecords.push({ cell, state: fromState });
    if (fromState === toState) {
      alreadyTarget.push({ cell, state: fromState });
      continue;
    }
    const operation = { cell, fromState, toState };
    if (design.boundaryKeys.has(cellKey(cell))) boundaryOperations.push(operation);
    else interiorOperations.push(operation);
  }
  const topDown = (left, right) => (
    right.cell.y - left.cell.y
    || left.cell.x - right.cell.x
    || left.cell.z - right.cell.z
  );
  boundaryOperations.sort(topDown);
  interiorOperations.sort(topDown);
  const operations = [...boundaryOperations, ...interiorOperations];
  invariant(operations.length > 0
    && operations.length + alreadyTarget.length === design.full.length,
  `${design.shell.id} source partition is incomplete or empty`);
  shellPackages.push({
    ...design,
    key: `${design.shell.id.toLowerCase()}-capped-shell`,
    operations,
    boundaryOperationCount: boundaryOperations.length,
    interiorOperationCount: interiorOperations.length,
    alreadyTarget,
    fullSourceRecords,
  });
}

let operationPackages = shellPackages;
if (ISOLATE_TARGET_FLUID) {
  const [shellPackage] = shellPackages;
  const boundaryKeys = shellPackage.boundaryKeys;
  const fluidKeys = new Set(targetFluidHazards.map(({ cell }) => cellKey(cell)));
  const boundaryOperations = shellPackage.operations
    .filter(({ cell }) => boundaryKeys.has(cellKey(cell)))
    .sort((left, right) => {
      // Forward closes original air first, then replaces the exact wet interface,
      // then completes solid lining. Exact reversal restores solids, wet states,
      // and finally original boundary air so rollback never opens the chamber
      // before its source-fluid interface is restored.
      const priority = (operation) => (
        isAir(operation.fromState) ? 0 : isFluid(operation.fromState) ? 1 : 2
      );
      return priority(left) - priority(right)
        || right.cell.y - left.cell.y
        || left.cell.x - right.cell.x
        || left.cell.z - right.cell.z;
    });
  const interiorFluidOperations = shellPackage.operations
    .filter(({ cell }) => !boundaryKeys.has(cellKey(cell)) && fluidKeys.has(cellKey(cell)))
    .sort((left, right) => (
      right.cell.y - left.cell.y
      || left.cell.x - right.cell.x
      || left.cell.z - right.cell.z
    ));
  const interiorShellOperations = shellPackage.operations.filter(({ cell }) => (
    !boundaryKeys.has(cellKey(cell)) && !fluidKeys.has(cellKey(cell))
  ));
  invariant(boundaryOperations.length === 292
    && boundaryOperations.filter(({ fromState }) => isFluid(fromState)).length === 23
    && interiorFluidOperations.length === 3
    && interiorShellOperations.length === 106
    && boundaryOperations.length + interiorFluidOperations.length + interiorShellOperations.length
      === shellPackage.operations.length,
  'isolated N07 target-fluid operation partition is incomplete');
  operationPackages = [
    {
      ...shellPackage,
      key: `${shellPackage.shell.id.toLowerCase()}-complete-wet-boundary-liner`,
      operations: boundaryOperations,
      operationRole: 'complete-boundary-liner-with-source-fluid-interface-closure',
    },
    {
      ...shellPackage,
      key: `${shellPackage.shell.id.toLowerCase()}-contained-interior-fluid-extraction`,
      operations: interiorFluidOperations,
      operationRole: 'interior-source-water-extraction-after-complete-boundary-closure',
    },
    {
      ...shellPackage,
      key: `${shellPackage.shell.id.toLowerCase()}-interior-shell-clear`,
      operations: interiorShellOperations,
      operationRole: 'remaining-interior-clear-after-fluid-extraction',
    },
  ];
} else if (ISOLATE_TARGET_GRAVITY) {
  const [shellPackage] = shellPackages;
  const stabilizationKeys = new Set(targetGravityClosure
    .filter(({ desiredState }) => desiredState === MATERIALS.retailShellLining)
    .map(({ cell }) => cellKey(cell)));
  const extractionKeysForOperations = new Set(targetGravityClosure
    .filter(({ desiredState }) => desiredState === MATERIALS.emptyInterior)
    .map(({ cell }) => cellKey(cell)));
  const gravityKeys = new Set([...stabilizationKeys, ...extractionKeysForOperations]);
  const gravityOperations = shellPackage.operations
    .filter(({ cell }) => stabilizationKeys.has(cellKey(cell)))
    .sort((left, right) => (
      left.cell.y - right.cell.y
      || left.cell.x - right.cell.x
      || left.cell.z - right.cell.z
    ));
  const extractionOperations = shellPackage.operations
    .filter(({ cell }) => extractionKeysForOperations.has(cellKey(cell)))
    .sort((left, right) => (
      right.cell.y - left.cell.y
      || left.cell.x - right.cell.x
      || left.cell.z - right.cell.z
    ));
  const shellOperations = shellPackage.operations.filter(
    ({ cell }) => !gravityKeys.has(cellKey(cell)),
  );
  invariant(gravityOperations.length + extractionOperations.length === targetGravityHazards.length
    && gravityOperations.length + extractionOperations.length > 0
    && shellOperations.length + gravityOperations.length + extractionOperations.length
      === shellPackage.operations.length,
  'isolated target-gravity operation partition is incomplete');
  operationPackages = [
    ...(gravityOperations.length > 0 ? [{
      ...shellPackage,
      key: `${shellPackage.shell.id.toLowerCase()}-gravity-stabilization`,
      operations: gravityOperations,
      operationRole: 'gravity-stabilization-prerequisite',
    }] : []),
    ...(extractionOperations.length > 0 ? [{
      ...shellPackage,
      key: `${shellPackage.shell.id.toLowerCase()}-gravity-extraction`,
      operations: extractionOperations,
      operationRole: 'top-down-gravity-extraction-after-static-stabilization',
    }] : []),
    {
      ...shellPackage,
      operations: shellOperations,
      operationRole: 'capped-shell-after-gravity-stabilization',
    },
  ];
}

const operatedTargets = uniqueCells(operationPackages.flatMap(({ operations }) => (
  operations.map(({ cell }) => cell)
)));
invariant(operatedTargets.length === operationPackages.reduce(
  (sum, pkg) => sum + pkg.operations.length,
  0,
), 'shell operation packages are not disjoint');
invariant(operatedTargets.every((cell) => fullUnionKeys.has(cellKey(cell))),
'an operation escaped the frozen shell union');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packageArtifacts = [];
for (const pkg of operationPackages) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => (
    replLine(cell, fromState, toState)
  )).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.slice().reverse().map(({
    cell, fromState, toState,
  }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = classManifest(pkg.operations.map(({ cell }) => cell));
  const forward = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${pkg.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# package target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageArtifacts.push({
    key: pkg.key,
    shellId: pkg.shell.id,
    forward,
    rollback,
    forwardSha256,
    rollbackSha256,
    commandCount: pkg.operations.length,
    targetIdentity,
    sourceStateCensus: census(pkg.operations, ({ fromState }) => fromState),
    desiredStateCensus: census(pkg.operations, ({ toState }) => toState),
  });
}

const forwardOrder = packageArtifacts.map(({ key }) => key);
const rollbackOrder = forwardOrder.slice().reverse();
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: MANIFEST_STATUS,
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: [CANONICAL_OWNER],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({ key, forward, rollback })),
  executionOrder: {
    forward: forwardOrder,
    rollback: rollbackOrder,
    withinPackage: ISOLATE_TARGET_FLUID
      ? 'complete boundary: original air closure, exact wet-interface closure, then solid lining; extract three contained interior source-water cells; clear remaining interior; rollback reverses packages and lines exactly'
      : ISOLATE_TARGET_GRAVITY
      ? 'target gravity bound for lining stabilizes bottom-up; target gravity bound for air extracts top-down; remaining shell is boundary-top-down then interior-top-down; rollback reverses packages and lines exactly'
      : 'complete boundary top-down, then clear interior top-down; rollback is exact line reversal',
    rationale: ISOLATE_TARGET_FLUID
      ? 'The complete static boundary closes the 23-cell wet interface before three interior water sources are removed. Reverse rollback restores interior geology, then contained water, then boundary solids and fluids, with source boundary air restored last.'
      : ISOLATE_TARGET_GRAVITY
      ? 'The exact target-gravity dependency closure first becomes static lining or is extracted top-down. Reverse rollback restores ordinary terrain, then gravity extraction bottom-up, then static-lining gravity top-down against its restored source support graph.'
      : 'Cap and line each shell before excavation; rollback restores its source interior before restoring the original boundary. Top-down ordering is deterministic, while any gravity in a target remains a hard abort.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: CANONICAL_OWNER,
    mvpScope: true,
    purpose: `Deliver ${shellPackages.length} dry, empty, fully lined and physically capped retail shells without authorizing tenant access or fit-out.`,
    shellIds: SHELL_IDS,
    wings: [...new Set(shellPackages.map(({ shell }) => shell.wing))].sort(),
    shellCount: shellPackages.length,
    shellState: 'CAPPED_EMPTY_FUTURE_TENANT_SHELL',
    tenantFitOutAuthorized: false,
    openingAuthorized: false,
    materialDoctrine: {
      paletteId: paletteEntry.id,
      lining: MATERIALS.retailShellLining,
      interior: MATERIALS.emptyInterior,
    },
    shells: shellPackages.map((pkg) => ({
      id: pkg.shell.id,
      wing: pkg.shell.wing,
      frozenBounds: pkg.shell.bounds,
      frozenCellCount: pkg.shell.cellCount,
      frozenCellSetSha256: pkg.shell.cellSetSha256,
      fullPrism: classManifest(pkg.full),
      completeBoundary: classManifest(pkg.boundary),
      connectedInteriorVoid: classManifest(pkg.interior),
      entranceCap: classManifest(pkg.entranceCap),
      topology: {
        boundary: connectedComponents(pkg.boundary),
        interiorVoid: connectedComponents(pkg.interior),
      },
      source: {
        exactStateCensus: census(pkg.fullSourceRecords),
        operated: classManifest(pkg.operations.map(({ cell }) => cell)),
        alreadyTarget: classManifest(pkg.alreadyTarget.map(({ cell }) => cell)),
        exactPartition: true,
      },
      operations: {
        boundaryCommandCount: pkg.boundaryOperationCount,
        interiorCommandCount: pkg.interiorOperationCount,
        topDownWithinEachLayer: true,
        ...(ISOLATE_TARGET_FLUID ? {
          completeBoundaryLinerCommandCount: operationPackages.find(
            ({ operationRole }) => operationRole === 'complete-boundary-liner-with-source-fluid-interface-closure',
          )?.operations.length,
          boundaryFluidTransitionCount: targetFluidBoundary.length,
          containedInteriorFluidExtractionCount: targetFluidInterior.length,
          remainingInteriorClearCommandCount: operationPackages.find(
            ({ operationRole }) => operationRole === 'remaining-interior-clear-after-fluid-extraction',
          )?.operations.length,
        } : {}),
        ...(ISOLATE_TARGET_GRAVITY ? {
          isolatedGravityStabilizationCommandCount: targetGravityHazards.filter(
            ({ cell }) => insideBounds(cell, pkg.shell.bounds),
          ).length,
        } : {}),
      },
    })),
    union: {
      fullPrisms: classManifest(fullUnion),
      completeBoundaries: classManifest(boundaryUnion),
      connectedInteriorVoids: classManifest(interiorUnion),
      entranceCaps: classManifest(entranceCapUnion),
      shellComponents: connectedComponents(fullUnion),
      boundaryComponents: connectedComponents(boundaryUnion),
      interiorComponents: connectedComponents(interiorUnion),
      shellsPairwiseDisjoint: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    terminalReleaseLedger: {
      path: SOURCE_RELEASE_LEDGER,
      sha256: sha256(fs.readFileSync(absolute(SOURCE_RELEASE_LEDGER))),
      status: sourceLedger.status,
      transactionId: sourceLedger.transactionId,
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    touchedChunks: touchedChunks.sort((left, right) => left.x - right.x || left.z - right.z),
    exactFullTargetStateCensus: census(fullUnion.map((cell) => ({
      cell,
      state: sourceByKey.get(cellKey(cell)),
    }))),
    exactInteractionHaloStateCensus: census(interactionHalo.map((cell) => ({
      cell,
      state: sourceByKey.get(cellKey(cell)),
    }))),
    packageOperationSourceStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => (
      [pkg.key, pkg.sourceStateCensus]
    ))),
  },
  target: {
    fullDesignUnion: classManifest(fullUnion),
    operatedUnion: classManifest(operatedTargets),
    packageTargetsDisjoint: true,
    completeFinalDesiredStateCensus: {
      [MATERIALS.retailShellLining]: boundaryUnion.length,
      [MATERIALS.emptyInterior]: interiorUnion.length,
    },
    packageDesiredStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => (
      [pkg.key, pkg.desiredStateCensus]
    ))),
  },
  operations: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, {
    forwardSha256: pkg.forwardSha256,
    rollbackSha256: pkg.rollbackSha256,
    forwardCommandCount: pkg.commandCount,
    rollbackCommandCount: pkg.commandCount,
    targetCoordinateSetSha256: pkg.targetIdentity.coordinateSetSha256,
    exactInverse: true,
  }])),
  isolation: {
    targetFluidIntersectionCount: targetHazards.filter(({ fluid }) => fluid).length,
    targetGravityIntersectionCount: targetHazards.filter(({ gravity }) => gravity).length,
    targetContainerOrControlIntersectionCount: targetHazards.filter(({ forbidden }) => forbidden).length,
    ...(ISOLATE_TARGET_FLUID ? {
      targetFluidSequence: {
        totalCount: targetFluidHazards.length,
        exactSourceStateCensus: targetFluidCensus,
        exactTargets: classManifest(targetFluidHazards.map(({ cell }) => cell)),
        boundaryCount: targetFluidBoundary.length,
        boundaryTargets: classManifest(targetFluidBoundary.map(({ cell }) => cell)),
        boundarySourceStateCensus: census(targetFluidBoundary, ({ state }) => state),
        interiorCount: targetFluidInterior.length,
        interiorTargets: classManifest(targetFluidInterior.map(({ cell }) => cell)),
        interiorSourceStateCensus: census(targetFluidInterior, ({ state }) => state),
        completeBoundaryBeforeInteriorExtraction: true,
        bubbleColumnsSupportedByRetainedExactLowerColumns: targetFluidHazards
          .filter(({ state }) => blockName(state) === 'minecraft:bubble_column')
          .every(({ cell }) => sourceByKey.get(`${cell.x},${cell.y - 1},${cell.z}`)
            === 'minecraft:bubble_column[drag=true]'),
        rollbackRestoresInteriorFluidBeforeBoundaryFluid: true,
        rollbackRestoresBoundaryAirAfterBoundaryFluid: true,
      },
      retainedFluidHalo: {
        count: haloFluid.length,
        exactStateCensus: census(haloFluid, ({ state }) => state),
        faceAdjacentCellCount: haloFluid.filter(({ adjacentTargets }) => adjacentTargets.length > 0).length,
        faceAdjacencyCount: haloFluid.reduce((sum, { adjacentTargets }) => sum + adjacentTargets.length, 0),
        allUntouched: haloFluid.every(({ retainedUntouched }) => retainedUntouched),
        allAdjacentFinalInterfacesStatic: haloFluid.every(
          ({ adjacentTargets, finalTargetInterfaceStatic }) => adjacentTargets.length === 0 || finalTargetInterfaceStatic,
        ),
        findings: haloFluid,
      },
    } : {}),
    ...(ISOLATE_TARGET_GRAVITY ? {
      targetGravityStabilization: {
        count: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.retailShellLining,
        ).length,
        allBecomeStaticLiningBeforeShellExcavation: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.retailShellLining,
        ).every(
          ({ stableBottomUpForwardOrder }) => stableBottomUpForwardOrder,
        ),
        forwardOrder: 'bottom-up',
        rollbackOrder: 'after shell and extraction rollback, exact inverse line order',
        findings: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.retailShellLining,
        ),
      },
      targetGravityExtraction: {
        count: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.emptyInterior,
        ).length,
        allExtractTopDownAfterStaticStabilization: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.emptyInterior,
        ).every(({ safeTopDownExtractionOrder }) => safeTopDownExtractionOrder)
          && extractionSupportViolations.length === 0,
        forwardOrder: 'top-down',
        rollbackOrder: 'after shell rollback, exact inverse bottom-up order',
        gravityAboveViolationCount: extractionSupportViolations.length,
        findings: targetGravityClosure.filter(
          ({ desiredState }) => desiredState === MATERIALS.emptyInterior,
        ),
      },
    } : {}),
    interactionHalo: classManifest(interactionHalo),
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloContainerOrControlCount: haloForbidden.length,
    retainedStableGravityHalo: {
      count: haloGravity.length,
      allStablySupportedAndUnaffected: haloGravity.every(({ stableAndUnaffected }) => stableAndUnaffected),
      faceAdjacentTargetCount: haloGravity.reduce((sum, entry) => sum + entry.adjacentTargetCount, 0),
      findings: haloGravity,
    },
    floorContacts: {
      ...classManifest(floorContacts),
      exactStateCensus: census(floorContactRecords),
      airCount: floorContactRecords.filter(({ state }) => isAir(state)).length,
      gravityStateCount: gravityFloorContacts.length,
      stableGravityStateCount: gravityFloorContacts.filter(
        ({ cell }) => stableGravityKeys.has(cellKey(cell)),
      ).length,
      hazardousStateCount: hazardousFloorContacts.length,
      unchangedByRelease: true,
      staticLiningRequiresGravitySupport: false,
    },
    blockEntityInteractionEnvelopeIntersectionCount: blockEntityIntersections.length,
    savedEntityInteractionEnvelopeIntersectionCount: savedEntityIntersections.length,
    protectedRelicInteractionEnvelopeIntersectionCount: protectedIntersections.length,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: futureSealIntersections.length,
    checkedAcceptedPriorManifestCount: priorManifestChecks.length,
    acceptedPriorManifestChecks: priorManifestChecks,
    undeclaredPriorReleaseIntersectionCount: priorIntersections.length,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    canonicalOwnerAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    emptyEightPath: INPUTS.emptyEight,
    emptyEightSha256: sha256(fs.readFileSync(absolute(INPUTS.emptyEight))),
    releaseContractPath: INPUTS.releaseContract,
    releaseContractSha256: sha256(fs.readFileSync(absolute(INPUTS.releaseContract))),
    protectedRelicsPath: INPUTS.protectedRelics,
    protectedRelicsSha256: sha256(fs.readFileSync(absolute(INPUTS.protectedRelics))),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and deterministic recompile',
    `block-entity audit and exact source preflight for all ${packageArtifacts.length} packages`,
    'strict-noop forward and rollback parser dry-runs',
    'fresh live entity clearance bound to all operation hashes',
    'journaled strict-noop execution in declared order',
    'fresh post snapshot, exact post-state QA, and reverse-order rollback preflight',
  ],
  deferred: {
    tenantFitOut: true,
    tenantOpening: true,
    futureLineOpenings: true,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    liveEntityClearancePerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: MANIFEST_STATUS,
  manifest: manifestPath,
  manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  canonicalOwner: CANONICAL_OWNER,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  shellCount: shellPackages.length,
  fullDesignCellCount: fullUnion.length,
  operatedCellCount: operatedTargets.length,
  boundaryCellCount: boundaryUnion.length,
  interiorVoidCellCount: interiorUnion.length,
  packages: packageArtifacts.map((pkg) => ({
    key: pkg.key,
    commandCount: pkg.commandCount,
    forwardSha256: pkg.forwardSha256,
    rollbackSha256: pkg.rollbackSha256,
  })),
  targetHazardCount: targetHazards.length,
  retainedStableGravityHaloCount: haloGravity.length,
  blockEntityIntersectionCount: blockEntityIntersections.length,
  savedEntityIntersectionCount: savedEntityIntersections.length,
  protectedRelicIntersectionCount: protectedIntersections.length,
  futureSealIntersectionCount: futureSealIntersections.length,
  undeclaredPriorReleaseIntersectionCount: priorIntersections.length,
}, null, 2));
