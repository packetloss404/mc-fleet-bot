#!/usr/bin/env node
/**
 * Compile the exact current-source repair for the noncompliant Moot Hall upper
 * bell core.  This is deliberately a contained vertical-spine rebuild, not a
 * broad refit of rooms whose sloped as-built geometry still needs its own
 * survey.  It makes the core a real seven-wide, six-high stair sequence with
 * seven-deep landings at its three retained levels.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SOURCE_ROOT = value('--source-root', 'data/worldsnap-civic-interiors-source-20260822T180000Z');
const INTAKE = value('--intake', 'data/world-review/civic-interiors-source-20260822T180000Z/complete-save-intake.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'civic-rrch-moot-upper-spine-20260822');
const FORWARD = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const ROLLBACK = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const MANIFEST = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const relative = (file) => path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIVIC-RRCH-MOOT-UPPER-SPINE compiler rejected: ${message}`);
};
const cells = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const output = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) output.push({ x, y, z });
  }
  return output;
};
const BLOCK_ENTITY_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern',
  'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:spawner',
]);
const base = (state) => state.split('[', 1)[0];
const sourceRoot = path.resolve(ROOT, SOURCE_ROOT);
const intakePath = path.resolve(ROOT, INTAKE);
invariant(fs.existsSync(path.join(sourceRoot, 'region')), 'source root has no region directory');
invariant(fs.existsSync(intakePath), 'source intake audit is absent');
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && intake.summary?.passed === true,
  'source complete-save intake is not PASS');
invariant(path.resolve(ROOT, intake.input?.suppliedWorldRoot ?? '') === sourceRoot,
  'source intake is bound to a different world root');

const target = new Map();
const role = new Map();
const set = (cell, state, purpose) => {
  target.set(cellKey(cell), { cell, state });
  role.set(cellKey(cell), purpose);
};
const setBox = (minX, maxX, minY, maxY, minZ, maxZ, state, purpose) => {
  for (const cell of cells(minX, maxX, minY, maxY, minZ, maxZ)) set(cell, state, purpose);
};

// The protected corridor is a 7-wide clear envelope x=-99..-93, enclosed by
// new x=-100/-92 walls.  It runs continuously from the retained Y73 common
// floor to the controlled Y87 upper service landing.  Flights never stack in
// one another's six-block headroom: two 7-rise/14-run flights proceed south,
// separated by seven-deep level landings.
const WALL = 'minecraft:polished_deepslate';
const FLOOR = 'minecraft:polished_blackstone';
const STAIR = 'minecraft:polished_deepslate_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
const LIGHT = 'minecraft:sea_lantern';
setBox(-100, -100, 73, 93, -393, -341, WALL, 'west-enclosure');
setBox(-92, -92, 73, 93, -393, -341, WALL, 'east-enclosure');
setBox(-100, -92, 73, 93, -393, -393, WALL, 'north-enclosure');
setBox(-100, -92, 73, 93, -341, -341, WALL, 'south-enclosure');
setBox(-99, -93, 93, 93, -392, -342, WALL, 'six-high-roof');
for (const [y, z] of [[75, -392], [80, -371], [82, -363], [87, -350], [90, -342]]) {
  set({ x: -100, y, z }, LIGHT, 'wayfinding-light-west');
  set({ x: -92, y, z }, LIGHT, 'wayfinding-light-east');
}

const clear = (minY, maxY, minZ, maxZ, purpose) => {
  setBox(-99, -93, minY, maxY, minZ, maxZ, 'minecraft:air', purpose);
};
const landing = (y, minZ, maxZ, purpose) => {
  setBox(-99, -93, y, y, minZ, maxZ, FLOOR, purpose);
  clear(y + 1, y + 6, minZ, maxZ, `${purpose}-six-high-clearance`);
};
landing(73, -392, -386, 'lower-seven-deep-landing');
for (let index = 0; index < 14; index += 1) {
  const y = 73 + Math.floor(index / 2);
  const z = -385 + index;
  setBox(-99, -93, y, y, z, z, STAIR, 'lower-seven-rise-flight');
  clear(y + 1, y + 6, z, z, 'lower-flight-six-high-clearance');
}
landing(80, -371, -365, 'middle-seven-deep-landing');
for (let index = 0; index < 14; index += 1) {
  const y = 80 + Math.floor(index / 2);
  const z = -364 + index;
  setBox(-99, -93, y, y, z, z, STAIR, 'upper-seven-rise-flight');
  clear(y + 1, y + 6, z, z, 'upper-flight-six-high-clearance');
}
landing(87, -350, -342, 'upper-seven-deep-controlled-landing');

const desired = [...target.values()].sort((a, b) => (
  a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z
));
const reader = new AnvilReader(path.join(sourceRoot, 'region'));
const changes = [];
const sourceStates = new Map();
for (const { cell, state } of desired) {
  const fromState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  sourceStates.set(cellKey(cell), fromState);
  if (fromState === state) continue;
  invariant(!BLOCK_ENTITY_NAMES.has(base(fromState)),
    `target ${cellKey(cell)} would replace protected block entity ${fromState}`);
  changes.push({ cell, fromState, toState: state, role: role.get(cellKey(cell)) });
}
invariant(changes.length > 0, 'design produced no current-source changes');
const body = (entries) => `${entries.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
const forwardText = [
  '# CIVIC-RRCH-MOOT-UPPER-SPINE — fresh-source guarded forward operations',
  '# 7-wide x 6-high core, 1 rise / 2 run, 7-deep landings; no block entities.',
  body(changes).trimEnd(),
  '',
].join('\n');
const rollbackText = [
  '# CIVIC-RRCH-MOOT-UPPER-SPINE — exact reverse guarded rollback operations',
  body([...changes].reverse().map(({ cell, fromState, toState, role: ignored }) => ({
    cell, fromState: toState, toState: fromState, role: ignored,
  }))).trimEnd(),
  '',
].join('\n');
fs.mkdirSync(path.resolve(ROOT, OUT_DIR), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, FORWARD), forwardText);
fs.writeFileSync(path.resolve(ROOT, ROLLBACK), rollbackText);
const targets = uniqueCells(desired.map(({ cell }) => cell));
const manifest = {
  schemaVersion: 1,
  id: 'civic-rrch-moot-upper-spine-20260822',
  status: 'COMPILED_FRESH_SOURCE_PENDING_GUARDED_RELEASE',
  mvpScope: false,
  mutationAuthority: 'owner-authorized civic interior defect lane 2026-08-22',
  source: {
    root: relative(sourceRoot),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSha256: intake.packageIdentity.regionSnapshotSha256,
    intake: relative(intakePath),
  },
  scope: {
    exactTarget: {
      cellCount: targets.length,
      bounds: boundsOf(targets),
      coordinateSetSha256: hashCells(targets),
    },
    route: {
      class: 'major-civic-controlled-upper-spine',
      clearWidth: 7,
      clearHeight: 6,
      rise: 1,
      run: 2,
      landingDepth: 7,
      landings: [
        { y: 73, minZ: -392, maxZ: -386 },
        { y: 80, minZ: -371, maxZ: -365 },
        { y: 87, minZ: -350, maxZ: -342, classification: 'controlled-service' },
      ],
      // Reachability anchors name the walker foot cells, not the support
      // blocks beneath the bottom/top landings.
      from: [-96, 74, -389],
      to: [-96, 88, -346],
      nonClaims: ['public exterior egress', 'second protected direction', 'Ravensgate access', 'room-completion acceptance'],
    },
  },
  operations: {
    forward: relative(FORWARD),
    rollback: relative(ROLLBACK),
    forwardSha256: sha256(forwardText),
    rollbackSha256: sha256(rollbackText),
    changedCellCount: changes.length,
    unchangedTargetCellCount: targets.length - changes.length,
    roles: Object.fromEntries([...new Set(changes.map(({ role: item }) => item))]
      .sort().map((item) => [item, changes.filter(({ role: other }) => other === item).length])),
  },
  hardStops: [
    'no target source cell may be a block entity',
    'no operation may extend outside the exact target set',
    'no live entity or source-state drift',
    'no claim beyond the bounded controlled upper spine',
  ],
};
fs.writeFileSync(path.resolve(ROOT, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ manifest: relative(MANIFEST), changedCellCount: changes.length,
  targetCellCount: targets.length, source: manifest.source, bounds: manifest.scope.exactTarget.bounds }, null, 2)}\n`);
