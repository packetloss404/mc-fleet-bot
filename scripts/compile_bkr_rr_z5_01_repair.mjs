#!/usr/bin/env node
/**
 * Compile BKR-RR-Z5-01 — Raven Rock RR-Z5 shaft repair.
 *
 * Survey finding: the shaft is a 2-wide traversable service shaft (RR-Z5-SHAFT-FULL
 * PASS per BKR-SURVEY-00) but has zero light sources (all 118 path stations
 * lightCount=0) and only one top sign. Per the CIRC-RR-Z5-01 runbook scope, repair
 * only proven defects:
 *   1. lighting cadence — bounded sea_lanterns at every landing edge (west wall,
 *      x=196), never in the 2-wide path;
 *   2. signed-return — a wall-mounted readable marker at the bottom landing.
 * The shaft stays a non-public service shaft; no widening, no public-grade claim.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-24T18:16:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rr-z5-source-20260824T181515Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'bkr-rr-z5-01-repair');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'bkr-rr-z5-01-repair';
const RELEASE_ID = 'BKR-RR-Z5-01';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`BKR-RR-Z5-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

const LIGHT = 'minecraft:sea_lantern';
const SIGN = 'minecraft:spruce_wall_sign[facing=west,waterlogged=false]';

// Landing edge lanterns (west wall x=196, above the landing floor, never in path).
const LANTERN_TARGETS = [
  { label: 'bottom', x: 196, y: -10, z: -14 },
  { label: 'L-5', x: 196, y: -4, z: -17 },
  { label: 'L0', x: 196, y: 1, z: -13 },
  { label: 'L5', x: 196, y: 6, z: -17 },
  { label: 'L10', x: 196, y: 11, z: -13 },
  { label: 'L15', x: 196, y: 16, z: -17 },
  { label: 'L20', x: 196, y: 21, z: -13 },
  { label: 'L25', x: 196, y: 26, z: -17 },
  { label: 'L30', x: 196, y: 31, z: -13 },
  { label: 'L35', x: 196, y: 36, z: -17 },
  { label: 'L40', x: 196, y: 41, z: -13 },
  { label: 'L45', x: 196, y: 46, z: -17 },
  { label: 'L50', x: 196, y: 51, z: -13 },
  { label: 'L55', x: 196, y: 56, z: -17 },
  { label: 'L60', x: 196, y: 61, z: -13 },
  { label: 'top', x: 196, y: 65, z: -16 },
];

// Bottom return sign, mounted on the east iron-bars wall at the bottom landing.
// Target cell is air; the backing at (202,-11,-14) is iron_bars (solid).
const SIGN_TARGET = { label: 'bottom-return-sign', x: 201, y: -11, z: -14 };
const SIGN_TEXT = [
  '{"text":"SURFACE / UP"}',
  '{"text":"RAVEN ROCK"}',
  '{"text":"SHAFT Z5"}',
  '{"text":"STAIRS ABOVE"}',
];

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

// lanterns: REPL air -> sea_lantern
for (const l of LANTERN_TARGETS) {
  const cell = { x: l.x, y: l.y, z: l.z };
  const source = await reader.blockState(cell.x, cell.y, cell.z);
  invariant(source.Name === 'minecraft:air' || source.Name === 'minecraft:cave_air',
    `lantern target ${cellKey(cell)} is not air: ${source.Name}`);
  setTarget(cell, LIGHT, 'shaft-lighting', `landing-lantern-${l.label}`);
}

// sign: REPL air -> spruce_wall_sign
{
  const cell = { x: SIGN_TARGET.x, y: SIGN_TARGET.y, z: SIGN_TARGET.z };
  const source = await reader.blockState(cell.x, cell.y, cell.z);
  invariant(source.Name === 'minecraft:air' || source.Name === 'minecraft:cave_air',
    `sign target ${cellKey(cell)} is not air: ${source.Name}`);
  setTarget(cell, SIGN, 'shaft-signs', 'bottom-return-sign');
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
invariant(alreadyTarget.length === 0, `unexpected already-target cells: ${JSON.stringify(alreadyTarget)}`);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isGravity(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/gravity/container/control sources: ${JSON.stringify(hazards.slice(0, 20))}`);

const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const haloCells = uniqueCells(targetCells.flatMap((cell) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
  `interaction halo fluid/container/control hazard: ${JSON.stringify([...haloFluid, ...haloForbidden].slice(0, 20))}`);

// block-entity and saved-entity clearance over target + halo
const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
  'target/halo intersects a block entity or saved movable entity');

const packageOrder = ['shaft-lighting', 'shaft-signs'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  invariant(group.length > 0, `${key} compiled empty`);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-state transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

// CMD line that writes the sign text after the sign block is placed. The
// rollback REPL (sign -> air) removes the block and its block entity together,
// so no text-clear CMD is needed on rollback.
const signForwardLines = [];
{
  const cell = SIGN_TARGET;
  const merge = [
    'CMD execute if block', `${cell.x} ${cell.y} ${cell.z}`, SIGN,
    'run data merge block', `${cell.x} ${cell.y} ${cell.z}`,
    `{front_text:{color:"white",has_glowing_text:1b,messages:[${SIGN_TEXT.join(',')}]},back_text:{color:"black",has_glowing_text:0b,messages:["","","",""]},is_waxed:0b,keepPacked:0b}`,
  ].join(' ');
  signForwardLines.push(merge);
}

// Append the text-write CMD to the sign forward file only.
const signForwardPath = path.join(OUT_DIR, `${BASENAME}.shaft-signs.forward.txt`);
const signRollbackPath = path.join(OUT_DIR, `${BASENAME}.shaft-signs.rollback.txt`);
{
  const existingForward = fs.readFileSync(signForwardPath, 'utf8');
  fs.writeFileSync(signForwardPath, `${existingForward}${signForwardLines.join('\n')}\n`);
}

// Update manifest for the sign package command counts.
{
  const forwardBytes = fs.readFileSync(signForwardPath, 'utf8');
  const rollbackBytes = fs.readFileSync(signRollbackPath, 'utf8');
  const forwardBody = forwardBytes.slice(forwardBytes.indexOf('\n') + 1);
  const rollbackBody = rollbackBytes.slice(rollbackBytes.indexOf('\n') + 1);
  operationManifest['shaft-signs'] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: 2,
    rollbackCommandCount: 1,
    targetCoordinateSetSha256: hashCells([{ x: SIGN_TARGET.x, y: SIGN_TARGET.y, z: SIGN_TARGET.z }]),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_AWAITING_FRESH_EXECUTION_KERNEL',
  mvpScope: true,
  scopeIds: ['raven-rock'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Raven Rock / Site R (RR-Z5 shaft)',
    purpose: 'Repair proven RR-Z5 service-shaft defects: add bounded sea_lantern lighting at every landing and a readable return sign at the bottom landing. The shaft remains a non-public 2-wide traversable service shaft.',
    repair: {
      structure: 'RR-Z5',
      name: 'Surface access shaft',
      lanternCount: LANTERN_TARGETS.length,
      signCount: 1,
      retainedTopSign: true,
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
    },
    retainedBoundaries: {
      existingContainersPreserved: true,
      existingBlockEntitiesPreserved: true,
      topSignPreserved: true,
      structureUntouched: true,
      shaftNotWidened: true,
      staysNonPublicServiceShaft: true,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    targetGravityBlockCount: operations.filter(({ sourceState }) => isGravity(sourceState)).length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
  },
  operations: operationManifest,
  packages,
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: targetCells.length,
  operationCount: operations.length,
  packageCount: packages.length,
  lanternCount: LANTERN_TARGETS.length,
  signCount: 1,
}, null, 2)}\n`);
