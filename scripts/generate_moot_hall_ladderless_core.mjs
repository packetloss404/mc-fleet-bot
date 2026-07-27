#!/usr/bin/env node

/**
 * Generate a snapshot-bound, offline-only replacement for every ladder in the
 * Moot Hall circulation core. The package links the deep corridor to B2 with a
 * new underground switchback, reuses the completed public basement stairs,
 * opens the blocked ground-floor approach, and stacks upper switchbacks inside
 * the existing bell tower.
 *
 * This script writes guarded operations and design evidence only. It never
 * connects to Minecraft, RCON, systemd, or another live service.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGION_DIR = path.join(ROOT, 'data', 'worldsnap', 'region');
const ID = 'moot-hall-ladderless-core-2026-07-27';
const OPS_PATH = path.join(ROOT, 'data', 'buildops', `${ID}.txt`);
const EXPORT_DIR = path.join(ROOT, 'data', 'exports', 'box', ID);
const DESIGN_PATH = path.join(EXPORT_DIR, 'design.json');
const DESIGN_MD_PATH = path.join(EXPORT_DIR, 'README.md');
const EXPECTED_SNAPSHOT =
  '0a0d5d684f69cdb6afe4c1e67b1385dd5d05692a3220096342e5d4aa33b61b76';
const SURVEY_BOUNDS = [-102, 39, -394, -70, 91, -332];

const AIR = 'minecraft:air';
const DARK_OAK = 'minecraft:dark_oak_planks';
const POLISHED_ANDESITE = 'minecraft:polished_andesite';
const POLISHED_DEEPSLATE = 'minecraft:polished_deepslate';
const SEA_LANTERN = 'minecraft:sea_lantern';
const SPRUCE = 'minecraft:spruce_planks';
const STONE_BRICKS = 'minecraft:stone_bricks';
const DEEP_STAIR_NORTH =
  'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]';
const DEEP_STAIR_SOUTH =
  'minecraft:stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
const UPPER_STAIR_NORTH =
  'minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]';
const UPPER_STAIR_SOUTH =
  'minecraft:spruce_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
const SIGN_EAST =
  'minecraft:spruce_wall_sign[facing=east,waterlogged=false]';
const SIGN_WEST =
  'minecraft:spruce_wall_sign[facing=west,waterlogged=false]';

function canonicalSnapshotHash() {
  const files = fs.readdirSync(REGION_DIR)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  for (const filename of files) {
    hash.update(filename);
    hash.update(Buffer.from([0]));
    hash.update(fs.readFileSync(path.join(REGION_DIR, filename)));
    hash.update(Buffer.from([0]));
  }
  return {
    regionFileCount: files.length,
    canonicalBundleSha256: hash.digest('hex'),
  };
}

function normalizeBlock(block) {
  const bracket = block.indexOf('[');
  if (bracket < 0) return block;
  const name = block.slice(0, bracket);
  const properties = block
    .slice(bracket + 1, -1)
    .split(',')
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function baseName(block) {
  return block.slice(0, block.indexOf('[') >= 0 ? block.indexOf('[') : undefined);
}

function readCurrentBlocks() {
  const census = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts', 'block_census.mjs'),
      '--regions',
      REGION_DIR,
      '--box',
      ...SURVEY_BOUNDS.map(String),
      '--include-air',
      '--states',
      '--list',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (census.status !== 0) {
    process.stderr.write(census.stderr);
    throw new Error('block census failed');
  }
  const blocks = new Map();
  for (const line of census.stdout.split(/\r?\n/)) {
    const match = line.match(/^\s+(-?\d+) (-?\d+) (-?\d+)\s+(minecraft:\S+)\s*$/);
    if (!match) continue;
    blocks.set(
      `${match[1]},${match[2]},${match[3]}`,
      normalizeBlock(match[4]),
    );
  }
  return blocks;
}

const snapshot = canonicalSnapshotHash();
if (snapshot.canonicalBundleSha256 !== EXPECTED_SNAPSHOT) {
  throw new Error(
    `snapshot drift: expected ${EXPECTED_SNAPSHOT}, `
    + `found ${snapshot.canonicalBundleSha256}`,
  );
}
const current = readCurrentBlocks();
const desired = new Map();
const roles = new Map();

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function setPoint(x, y, z, block, role) {
  const pointKey = key(x, y, z);
  desired.set(pointKey, normalizeBlock(block));
  roles.set(pointKey, role);
}

function setBox(x1, y1, z1, x2, y2, z2, block, role) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        setPoint(x, y, z, block, role);
      }
    }
  }
}

// ------------------------------------------------------------------ deep/B2
// The shell is wholly south of the authored B2 rooms. Its north face meets the
// existing deep corridor at y41 and the B2 lounge at y56.
setBox(-89, 39, -340, -89, 59, -332, POLISHED_DEEPSLATE, 'deep-shell');
setBox(-81, 39, -340, -81, 59, -332, POLISHED_DEEPSLATE, 'deep-shell');
setBox(-89, 39, -340, -81, 59, -340, POLISHED_DEEPSLATE, 'deep-shell');
setBox(-89, 39, -332, -81, 59, -332, POLISHED_DEEPSLATE, 'deep-shell');
setBox(-89, 59, -340, -81, 59, -332, POLISHED_DEEPSLATE, 'deep-roof');
setBox(-88, 40, -339, -82, 40, -333, POLISHED_DEEPSLATE, 'deep-floor');
setBox(-88, 41, -339, -82, 58, -333, AIR, 'deep-clearance');

// Structural spine between the three-wide flights. Both turn landings remain
// open around its north and south ends.
setBox(-85, 40, -338, -85, 58, -335, STONE_BRICKS, 'deep-center-spine');
for (const [y, z] of [[44, -336], [48, -337], [52, -336], [56, -337]]) {
  setPoint(-85, y, z, SEA_LANTERN, 'deep-spine-light');
}

// Bottom/deep-corridor doorway and support.
setBox(-84, 40, -341, -82, 40, -339, POLISHED_DEEPSLATE, 'deep-entry-floor');
setBox(-84, 41, -341, -82, 43, -339, AIR, 'deep-entry-clearance');

// Flight 1: east lane, ascending south.
for (const [supportY, z] of [[40, -338], [41, -337], [42, -336], [43, -335]]) {
  setBox(-84, supportY, z, -82, supportY, z, DEEP_STAIR_SOUTH, 'deep-flight-1');
}
setBox(-88, 44, -334, -82, 44, -333, POLISHED_ANDESITE, 'deep-landing-1');

// Flight 2: west lane, ascending north.
for (const [supportY, z] of [[44, -335], [45, -336], [46, -337], [47, -338]]) {
  setBox(-88, supportY, z, -86, supportY, z, DEEP_STAIR_NORTH, 'deep-flight-2');
}
setBox(-88, 48, -339, -82, 48, -339, POLISHED_ANDESITE, 'deep-landing-2');

// Flight 3: east lane, ascending south.
for (const [supportY, z] of [[48, -338], [49, -337], [50, -336], [51, -335]]) {
  setBox(-84, supportY, z, -82, supportY, z, DEEP_STAIR_SOUTH, 'deep-flight-3');
}
setBox(-88, 52, -334, -82, 52, -333, POLISHED_ANDESITE, 'deep-landing-3');

// Flight 4: west lane, ascending north into the B2-level landing.
for (const [supportY, z] of [[52, -335], [53, -336], [54, -337]]) {
  setBox(-88, supportY, z, -86, supportY, z, DEEP_STAIR_NORTH, 'deep-flight-4');
}
setBox(-88, 55, -339, -82, 55, -338, POLISHED_ANDESITE, 'deep-top-landing');

// B2 doorway: traverse the new shell, the existing south wall, and the clear
// south edge of the completed lounge without touching its counters or seating.
setBox(-84, 55, -342, -82, 55, -340, POLISHED_ANDESITE, 'b2-threshold');
setBox(-84, 56, -342, -82, 58, -340, AIR, 'b2-threshold-clearance');

// --------------------------------------------------------------- ground link
// Preserve the public stair's open top headroom at y67. A two-block doorway
// lets the ground landing use the retained west bypass around that opening.
setBox(-87, 68, -377, -87, 69, -377, AIR, 'ground-stair-west-bypass-door');
setBox(-87, 67, -391, -84, 67, -391, POLISHED_ANDESITE, 'upper-stair-bottom-landing');
setBox(-87, 68, -391, -84, 69, -391, AIR, 'upper-stair-bottom-entry');

// ------------------------------------------------------------ upper switchback
// Clear only the five-by-five bell-tower interior. The outer shell, bell at
// (-85,89,-372), and the oak trunk below the first floor remain untouched.
setBox(-87, 74, -374, -83, 88, -370, AIR, 'bell-core-clearance');

function upperSection(baseY) {
  // East flight ascends south from the north landing.
  for (const [offset, z] of [[0, -374], [1, -373], [2, -372]]) {
    setBox(-84, baseY + offset, z, -83, baseY + offset, z, UPPER_STAIR_SOUTH, 'bell-east-flight');
  }
  setBox(-87, baseY + 3, -371, -83, baseY + 3, -370, SPRUCE, 'bell-south-landing');
  // West flight returns north.
  for (const [offset, z] of [[3, -372], [4, -373]]) {
    setBox(-87, baseY + offset, z, -86, baseY + offset, z, UPPER_STAIR_NORTH, 'bell-west-flight');
  }
  setBox(-87, baseY + 5, -375, -83, baseY + 5, -374, SPRUCE, 'bell-level-landing');
}

upperSection(73);
upperSection(78);

// Final four-block rise to the penthouse bridge.
for (const [supportY, z] of [[83, -374], [84, -373]]) {
  setBox(-84, supportY, z, -83, supportY, z, UPPER_STAIR_SOUTH, 'bell-top-east-flight');
}
setBox(-87, 85, -372, -83, 85, -370, SPRUCE, 'bell-top-south-landing');
for (const [supportY, z] of [[85, -373], [86, -374]]) {
  setBox(-87, supportY, z, -86, supportY, z, UPPER_STAIR_NORTH, 'bell-top-west-flight');
}
setBox(-87, 87, -375, -83, 87, -375, DARK_OAK, 'bell-top-landing');
setBox(-87, 88, -375, -84, 89, -375, AIR, 'bell-top-doorway');

// Two-block-wide openings from the bell landings to the authored upper halls.
setBox(-86, 79, -376, -84, 80, -376, AIR, 'second-floor-doorway');
setBox(-86, 84, -376, -84, 85, -376, AIR, 'third-floor-doorway');

// Existing roof doorway to the penthouse. The bridge stays inside the roof
// envelope and is two blocks wide with full two-block body clearance.
setBox(-85, 87, -378, -84, 87, -375, DARK_OAK, 'penthouse-bridge-floor');
setBox(-85, 88, -378, -84, 89, -375, AIR, 'penthouse-bridge-clearance');

// Every linked switchback has a landing sign because this is not one
// continuous visible stair. Wall signs are passable and sit against the side
// walls, outside the clear width of each flight.
const signs = [
  {
    point: [-82, 42, -338],
    block: SIGN_WEST,
    text: ['DEEP CORRIDOR', 'SANCTUM', 'B2 CINEMAS', 'UP'],
  },
  {
    point: [-82, 57, -338],
    block: SIGN_WEST,
    text: ['B2 CINEMAS', 'DEEP CORRIDOR', 'SANCTUM', 'DOWN'],
  },
  {
    point: [-88, 69, -390],
    block: SIGN_WEST,
    text: ['GROUND', 'UP: MAIN HALL', 'DOWN: B1/B2', 'WEST BYPASS'],
  },
  {
    point: [-87, 75, -375],
    block: SIGN_EAST,
    text: ['FIRST FLOOR', 'UP: 2F / 3F', 'PENTHOUSE', 'BELL STAIR'],
  },
  {
    point: [-87, 80, -375],
    block: SIGN_EAST,
    text: ['SECOND FLOOR', 'UP: 3F', 'DOWN: 1F', 'BELL STAIR'],
  },
  {
    point: [-87, 85, -375],
    block: SIGN_EAST,
    text: ['THIRD FLOOR', 'UP: PENTHOUSE', 'DOWN: 2F', 'BELL STAIR'],
  },
  {
    point: [-87, 89, -375],
    block: SIGN_EAST,
    text: ['PENTHOUSE', 'DOWN: ALL', 'BASEMENTS', 'SANCTUM'],
  },
];
for (const sign of signs) {
  setPoint(...sign.point, sign.block, 'wayfinding-sign');
}

// ----------------------------------------------------------- retire old shafts
// Remove every ladder found in the surveyed Moot Hall circulation envelope.
const ladderPoints = [];
for (const [pointKey, block] of current) {
  if (baseName(block) !== 'minecraft:ladder') continue;
  const [x, y, z] = pointKey.split(',').map(Number);
  ladderPoints.push([x, y, z]);
  setPoint(x, y, z, AIR, 'ladder-retirement');
}

// Seal former old-core door apertures only above the deep vestibule. The
// y41..45 room and its horizontal Sanctum connection stay open; a fire stop
// above it retires the vertical shaft without deleting the named route.
const oldShaftPerimeter = [];
for (let y = 46; y <= 87; y += 1) {
  for (let z = -391; z <= -389; z += 1) {
    oldShaftPerimeter.push([-99, y, z], [-95, y, z]);
  }
  for (let x = -98; x <= -96; x += 1) {
    oldShaftPerimeter.push([x, y, -392], [x, y, -388]);
  }
}
const sealable = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:ladder',
]);
for (const [x, y, z] of oldShaftPerimeter) {
  const block = current.get(key(x, y, z)) ?? AIR;
  const name = baseName(block);
  if (sealable.has(name) || name.endsWith('_door') || name.endsWith('_sign')) {
    setPoint(x, y, z, POLISHED_DEEPSLATE, 'old-shaft-aperture-seal');
  }
}

// Horizontal fire stops make the abandoned riser a set of closed voids rather
// than a continuous fall shaft.
for (const y of [46, 55, 62, 67, 73, 79, 85, 87]) {
  setBox(-98, y, -391, -96, y, -389, POLISHED_DEEPSLATE, 'old-shaft-fire-stop');
}

const changes = [];
for (const [pointKey, replacement] of desired) {
  const expected = current.get(pointKey);
  if (!expected) throw new Error(`snapshot cell missing from census: ${pointKey}`);
  if (normalizeBlock(expected) === normalizeBlock(replacement)) continue;
  const [x, y, z] = pointKey.split(',').map(Number);
  changes.push({
    point: [x, y, z],
    expected,
    replacement,
    role: roles.get(pointKey),
  });
}
changes.sort((a, b) =>
  a.point[1] - b.point[1]
  || a.point[2] - b.point[2]
  || a.point[0] - b.point[0]);

const roleCounts = Object.fromEntries(
  [...changes.reduce((counts, change) => {
    counts.set(change.role, (counts.get(change.role) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b)),
);
const ladderByRun = {
  oldCore: ladderPoints.filter(([x, , z]) => x === -97 && z === -389).length,
  bellTower: ladderPoints.filter(([x, , z]) => x === -83 && z === -372).length,
  total: ladderPoints.length,
};
if (ladderByRun.oldCore !== 44 || ladderByRun.bellTower !== 14 || ladderByRun.total !== 58) {
  throw new Error(`unexpected ladder census: ${JSON.stringify(ladderByRun)}`);
}

const opsLines = [
  '# GENERATED FILE — Moot Hall ladderless circulation core',
  `# id: ${ID}`,
  `# snapshot: ${snapshot.canonicalBundleSha256}`,
  '# offline-only: generation does not connect to or mutate the live world',
  '# every REPL is a one-cell exact-state guard against the source snapshot',
  '',
];
let previousRole = null;
for (const change of changes) {
  if (change.role !== previousRole) {
    opsLines.push(`# phase: ${change.role}`);
    previousRole = change.role;
  }
  const [x, y, z] = change.point;
  opsLines.push(
    `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${change.expected} ${change.replacement}`,
  );
}
opsLines.push('# phase: wayfinding-sign-text');
for (const sign of signs) {
  const messages = sign.text
    .map((message) => `'${JSON.stringify({ text: message })}'`)
    .join(',');
  opsLines.push(
    `CMD execute if block ${sign.point.join(' ')} ${sign.block} run `
    + `data merge block ${sign.point.join(' ')} `
    + `{front_text:{color:"black",has_glowing_text:1b,messages:[${messages}]}}`,
  );
}
opsLines.push('');

const routeQa = [
  {
    id: 'deep-to-b2',
    from: [-84, 41, -341],
    to: [-83, 56, -342],
    pad: 8,
  },
  {
    id: 'sanctum-to-deep-corridor',
    from: [-85, 30, -380],
    to: [-84, 41, -341],
    pad: 25,
  },
  {
    id: 'ground-gallery-to-first-floor',
    from: [-85, 68, -377],
    to: [-85, 74, -384],
    pad: 12,
  },
  {
    id: 'first-floor-to-penthouse',
    from: [-85, 74, -375],
    to: [-85, 88, -379],
    pad: 12,
  },
  {
    id: 'penthouse-to-deep-corridor',
    from: [-85, 88, -379],
    to: [-84, 41, -341],
    pad: 20,
  },
  {
    id: 'penthouse-to-sanctum',
    from: [-85, 88, -379],
    to: [-85, 30, -380],
    pad: 60,
  },
];

const design = {
  id: ID,
  generatedAt: new Date().toISOString(),
  liveMutationAuthorized: false,
  source: {
    regions: path.relative(ROOT, REGION_DIR),
    ...snapshot,
    surveyBounds: SURVEY_BOUNDS,
  },
  outputs: {
    operations: path.relative(ROOT, OPS_PATH),
    design: path.relative(ROOT, DESIGN_PATH),
  },
  scope: {
    newExcavation: [-89, 39, -340, -81, 59, -332],
    bellCoreReuse: [-87, 73, -375, -83, 89, -370],
    groundGallery: [-88, 67, -391, -84, 69, -377],
    penthouseBridge: [-85, 87, -378, -84, 89, -375],
    oldCoreSeal: [-99, 40, -392, -95, 87, -388],
  },
  ladderCensus: ladderByRun,
  changeCount: changes.length,
  roleCounts,
  wayfindingSigns: signs,
  routeQa,
  invariants: [
    'No ladder remains in the surveyed Moot Hall circulation envelope.',
    'The B2/B1/ground public stairs built by the basement enhancement are untouched.',
    'The y41..45 old-core deep vestibule and its horizontal Sanctum route remain open.',
    'The bell, bell-tower outer shell, named rooms, cinema fittings, and oak trunk are untouched.',
    'Every flight is at least two blocks wide; the deep stair is three blocks wide.',
    'Every route is checked in both directions against the projected operation overlay.',
    'All changed cells are exact-state REPL guards tied to the source snapshot.',
  ],
};

const markdown = `# Moot Hall ladderless circulation core

This package replaces all **58** surveyed ladders with a continuous, signed-by-layout
chain of normal stairs. It is an offline build artifact; it does not mutate the
live world.

## Build footprint

- Deep corridor to B2: sealed 9×9 switchback tower,
  \`x[-89,-81] y[39,59] z[-340,-332]\`.
- Ground-floor missing links: a two-block doorway from the public-stair landing
  into the retained west bypass at \`x=-87 y[68,69] z=-377\`, plus a four-wide
  entry from that gallery to the upper stair at
  \`x[-87,-84] y[67,69] z=-391\`.
- Upper hall and penthouse: stacked two-wide switchbacks inside the existing
  bell core, \`x[-87,-83] y[73,87] z[-375,-370]\`.
- Penthouse link: two-wide in-roof bridge,
  \`x[-85,-84] y[87,89] z[-378,-375]\`.
- Retired core: existing shell is preserved, apertures close, and eight guarded
  fire-stop slabs eliminate the continuous fall shaft.

The completed B2↔B1, B1↔ground, and ground↔first-floor stair structures are
reused. No named room, cinema fitting, bell, exterior bell shell, or tree trunk
is part of the mutation set.

## Guard and route QA

Source snapshot: \`${snapshot.canonicalBundleSha256}\`.

\`\`\`bash
node scripts/preflight_guarded_ops.mjs data/buildops/${ID}.txt \\
  --regions data/worldsnap/region \\
  --report data/exports/box/${ID}/preflight.json
python3 scripts/rcon_runner.py data/buildops/${ID}.txt --dry-run
\`\`\`

Run every route below in both directions with \`scripts/reachability.mjs --ops\`:

${routeQa.map((route) =>
    `- ${route.id}: \`${route.from.join(',')}\` ↔ \`${route.to.join(',')}\` (pad ${route.pad})`,
  ).join('\n')}

Live execution remains unauthorized until every exact guard passes and all
two-way projected routes pass.
`;

fs.mkdirSync(path.dirname(OPS_PATH), { recursive: true });
fs.mkdirSync(EXPORT_DIR, { recursive: true });
fs.writeFileSync(OPS_PATH, `${opsLines.join('\n')}\n`);
fs.writeFileSync(DESIGN_PATH, `${JSON.stringify(design, null, 2)}\n`);
fs.writeFileSync(DESIGN_MD_PATH, `${markdown}\n`);

console.log(`${ID}: ${changes.length} exact guarded changes`);
console.log(`  snapshot: ${snapshot.canonicalBundleSha256}`);
console.log(`  ladders: ${JSON.stringify(ladderByRun)}`);
console.log(`  ops: ${path.relative(ROOT, OPS_PATH)}`);
console.log(`  design: ${path.relative(ROOT, DESIGN_PATH)}`);
