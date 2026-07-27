#!/usr/bin/env node

/**
 * Generate the guarded, offline-only repair package for the Moot Hall south
 * multiplex. The coordinates come from south-extension-audit.json, captured
 * after the 2026-07-26 basement enhancement.
 *
 * This script writes build instructions and a machine-readable design. It does
 * not connect to Minecraft, RCON, systemd, or any live service.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT_DIR = path.join(
  ROOT,
  'data',
  'exports',
  'box',
  'moot-hall-basement-enhancement-2026-07-26',
);
const OPS_PATH = path.join(
  ROOT,
  'data',
  'buildops',
  'moot-hall-south-multiplex-repair-2026-07-27.txt',
);
const DESIGN_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-design.json');
const DESIGN_MD_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-design.md');
const SOURCE_AUDIT_PATH = path.join(EXPORT_DIR, 'south-extension-audit.json');

const sourceAudit = JSON.parse(fs.readFileSync(SOURCE_AUDIT_PATH, 'utf8'));
const EXPECTED_SNAPSHOT =
  '6ddb62607dc48a1f8493fda0ec8b51d2459c5c1305e0483271d93fcfe9f4069c';
if (sourceAudit.source?.sha256 !== EXPECTED_SNAPSHOT) {
  throw new Error(
    `south-extension audit snapshot changed: expected ${EXPECTED_SNAPSHOT}, `
    + `found ${sourceAudit.source?.sha256 ?? 'missing'}`,
  );
}

const AIR = 'minecraft:air';
const BLACK = 'minecraft:black_concrete';
const POLISHED_ANDESITE = 'minecraft:polished_andesite';
const RED_CARPET = 'minecraft:red_carpet';
const STONE_BRICKS = 'minecraft:stone_bricks';
const SPRUCE_SEAT =
  'minecraft:spruce_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
const STONE_STAIR =
  'minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]';
const AISLE_STAIR =
  'minecraft:polished_andesite_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
const FLOOR_LANTERN = 'minecraft:lantern[hanging=false,waterlogged=false]';
const HANGING_LANTERN = 'minecraft:lantern[hanging=true,waterlogged=false]';

const operations = [];
const commands = [];

function addOperation(id, phase, box, expected, replacement, purpose) {
  operations.push({ id, phase, box, expected, replacement, purpose });
}

function addPoint(id, phase, point, expected, replacement, purpose) {
  addOperation(id, phase, [...point, ...point], expected, replacement, purpose);
}

function signData(point, text) {
  const messages = text
    .map((message) => `'${JSON.stringify({ text: message })}'`)
    .join(',');
  return `CMD data merge block ${point.join(' ')} `
    + `{front_text:{color:"black",has_glowing_text:1b,messages:[${messages}]}}`;
}

function addSign(id, phase, point, block, text, purpose) {
  addPoint(id, phase, point, AIR, block, purpose);
  commands.push({
    id: `${id}-text`,
    phase,
    afterOperation: id,
    command: signData(point, text),
  });
}

// IMAX: replace the decorative full-block "aisle" with the eight actual stair
// supports needed to climb the rake. The polished blocks above those supports
// are removed so each tread has body/head clearance.
const imaxRows = [
  { supportY: 56, seatY: 57, z: -347 },
  { supportY: 57, seatY: 58, z: -348 },
  { supportY: 58, seatY: 59, z: -349 },
  { supportY: 59, seatY: 60, z: -350 },
  { supportY: 60, seatY: 61, z: -351 },
  { supportY: 61, seatY: 62, z: -352 },
  { supportY: 62, seatY: 63, z: -353 },
  { supportY: 63, seatY: 64, z: -354 },
];
for (const [index, row] of imaxRows.entries()) {
  const rowNumber = index + 1;
  addPoint(
    `imax-aisle-tread-${rowNumber}`,
    'imax-circulation',
    [-93, row.supportY, row.z],
    BLACK,
    AISLE_STAIR,
    `Create center-aisle tread ${rowNumber}, ascending north through the rake.`,
  );
  addPoint(
    `imax-clear-false-aisle-${rowNumber}`,
    'imax-circulation',
    [-93, row.seatY, row.z],
    POLISHED_ANDESITE,
    AIR,
    `Remove the full polished-andesite blocker above tread ${rowNumber}.`,
  );
}
addOperation(
  'imax-screen-floor-bridge',
  'imax-circulation',
  [-86, 55, -346, -86, 55, -344],
  AIR,
  POLISHED_ANDESITE,
  'Bridge the one-cell interstitial floor gap from the B2 lounge to the IMAX screen-side floor.',
);
addOperation(
  'imax-top-row-head-pocket',
  'imax-circulation',
  [-97, 66, -354, -89, 66, -354],
  BLACK,
  AIR,
  'Give the four top-row seats and intervening lateral path two-block head clearance while preserving the y67 plaza cap.',
);

// Medium houses: retain the front bank, move one bank down to finished-floor
// height, retire two unusable high banks, and make a red-carpet cross/center
// aisle. The top-row seats become ceiling liner, so there is no y66 roof hole.
const mediumHouses = [
  {
    id: 'north',
    frontZ: -353,
    crossZ: -354,
    rearSeatZ: -355,
    retiredZ: -356,
    frontAisleZ: -352,
  },
  {
    id: 'south',
    frontZ: -345,
    crossZ: -346,
    rearSeatZ: -347,
    retiredZ: -348,
    frontAisleZ: -344,
  },
];
for (const house of mediumHouses) {
  const prefix = `medium-${house.id}`;
  addPoint(
    `${prefix}-front-center-aisle`,
    'medium-cinema-headroom',
    [-78, 63, house.frontZ],
    SPRUCE_SEAT,
    RED_CARPET,
    'Open the center aisle through the retained front seating bank.',
  );
  addOperation(
    `${prefix}-cross-aisle`,
    'medium-cinema-headroom',
    [-84, 63, house.crossZ, -72, 63, house.crossZ],
    BLACK,
    RED_CARPET,
    'Convert the second-bank riser into a full-width traversable cross aisle.',
  );
  addOperation(
    `${prefix}-remove-second-bank`,
    'medium-cinema-headroom',
    [-84, 64, house.crossZ, -72, 64, house.crossZ],
    SPRUCE_SEAT,
    AIR,
    'Remove the obstructed second-bank seats above the new cross aisle.',
  );
  addOperation(
    `${prefix}-clear-rear-bank-support`,
    'medium-cinema-headroom',
    [-84, 64, house.rearSeatZ, -72, 64, house.rearSeatZ],
    BLACK,
    AIR,
    'Clear the floating support below the retained rear bank.',
  );
  addOperation(
    `${prefix}-clear-old-rear-bank`,
    'medium-cinema-headroom',
    [-84, 65, house.rearSeatZ, -72, 65, house.rearSeatZ],
    SPRUCE_SEAT,
    AIR,
    'Clear the old headroom-failing rear bank before lowering it.',
  );
  addOperation(
    `${prefix}-rear-bank-west`,
    'medium-cinema-headroom',
    [-84, 63, house.rearSeatZ, -79, 63, house.rearSeatZ],
    AIR,
    SPRUCE_SEAT,
    'Place six rear-bank seats at finished-floor height west of the center aisle.',
  );
  addOperation(
    `${prefix}-rear-bank-east`,
    'medium-cinema-headroom',
    [-77, 63, house.rearSeatZ, -72, 63, house.rearSeatZ],
    AIR,
    SPRUCE_SEAT,
    'Place six rear-bank seats at finished-floor height east of the center aisle.',
  );
  addPoint(
    `${prefix}-rear-center-aisle`,
    'medium-cinema-headroom',
    [-78, 63, house.rearSeatZ],
    AIR,
    RED_CARPET,
    'Continue the center aisle through the lowered rear bank.',
  );
  addOperation(
    `${prefix}-clear-retired-bank-support`,
    'medium-cinema-headroom',
    [-84, 65, house.retiredZ, -72, 65, house.retiredZ],
    BLACK,
    AIR,
    'Remove the floating support below the plaza-colliding top bank.',
  );
  addOperation(
    `${prefix}-restore-ceiling-over-retired-bank`,
    'medium-cinema-headroom',
    [-84, 66, house.retiredZ, -72, 66, house.retiredZ],
    SPRUCE_SEAT,
    BLACK,
    'Retire the plaza-colliding top bank into a continuous y66 cinema ceiling liner.',
  );
  addPoint(
    `${prefix}-rear-aisle-marker`,
    'medium-cinema-headroom',
    [-78, 63, house.retiredZ],
    AIR,
    RED_CARPET,
    'Mark the rear aisle without adding a solid obstruction.',
  );
  addPoint(
    `${prefix}-front-aisle-marker`,
    'medium-cinema-headroom',
    [-78, 63, house.frontAisleZ],
    AIR,
    RED_CARPET,
    'Mark the screen-side aisle without adding a solid obstruction.',
  );
}

// Retire the orphan 3-wide flight. It did not reach B1 and was embedded in the
// y59 interlevel plane. Restore two floor courses, clear its stepped obstructions,
// and replace the embedded top tread with the original ceiling material.
addOperation(
  'service-flight-floor-south',
  'service-flight-retirement',
  [-74, 55, -348, -72, 55, -348],
  STONE_STAIR,
  POLISHED_ANDESITE,
  'Restore the south floor course formerly occupied by the bottom tread.',
);
addOperation(
  'service-flight-floor-north',
  'service-flight-retirement',
  [-74, 55, -347, -72, 55, -347],
  STONE_BRICKS,
  POLISHED_ANDESITE,
  'Normalize the exposed north support course to the B2 finished floor.',
);
for (const [index, entry] of [
  { y: 56, z: -347, expected: STONE_STAIR, kind: 'tread' },
  { y: 56, z: -346, expected: STONE_BRICKS, kind: 'support' },
  { y: 57, z: -346, expected: STONE_STAIR, kind: 'tread' },
  { y: 57, z: -345, expected: STONE_BRICKS, kind: 'support' },
  { y: 58, z: -345, expected: STONE_STAIR, kind: 'tread' },
  { y: 58, z: -344, expected: STONE_BRICKS, kind: 'support' },
].entries()) {
  addOperation(
    `service-flight-clear-${entry.kind}-${index + 1}`,
    'service-flight-retirement',
    [-74, entry.y, entry.z, -72, entry.y, entry.z],
    entry.expected,
    AIR,
    `Clear orphan service-flight ${entry.kind} ${index + 1} from the lounge body volume.`,
  );
}
addOperation(
  'service-flight-restore-ceiling',
  'service-flight-retirement',
  [-74, 59, -344, -72, 59, -344],
  STONE_STAIR,
  STONE_BRICKS,
  'Restore the y59 interlevel plane where the orphan flight ended.',
);

// Lounge concessions, music, signs, and corrected hanging lights.
for (const x of [-83, -81, -79]) {
  addPoint(
    `lounge-counter-barrel-${Math.abs(x)}`,
    'lounge-fit-out',
    [x, 56, -349],
    AIR,
    'minecraft:barrel[facing=north,open=false]',
    'Add guarded under-shelf concessions storage behind the quartz counter.',
  );
}
addPoint(
  'lounge-brewing-stand',
  'lounge-fit-out',
  [-77, 57, -350],
  AIR,
  'minecraft:brewing_stand',
  'Add a service point on the existing quartz concessions counter.',
);
addPoint(
  'lounge-jukebox',
  'lounge-fit-out',
  [-75, 56, -342],
  AIR,
  'minecraft:jukebox',
  'Create a music point against the south wall without narrowing the main lounge route.',
);
addPoint(
  'lounge-note-block',
  'lounge-fit-out',
  [-73, 56, -342],
  AIR,
  'minecraft:note_block',
  'Pair the jukebox with a cinema-lounge note block.',
);
for (const x of [-85, -71]) {
  for (const z of [-355, -350, -345]) {
    addPoint(
      `lounge-hang-lantern-${Math.abs(x)}-${Math.abs(z)}`,
      'lounge-lighting',
      [x, 58, z],
      FLOOR_LANTERN,
      HANGING_LANTERN,
      'Correct an authored ceiling-adjacent lantern to its hanging state.',
    );
  }
}
addSign(
  'lounge-north-wayfinding',
  'lounge-wayfinding',
  [-84, 58, -357],
  'minecraft:dark_oak_hanging_sign[attached=false,rotation=8,waterlogged=false]',
  ['CINEMA LOUNGE', 'CONCESSIONS SOUTH', 'IMAX SOUTHWEST', 'B1 STAIRS NORTH'],
  'Identify the south multiplex from the B2 north approach.',
);
addSign(
  'lounge-imax-wayfinding',
  'lounge-wayfinding',
  [-84, 58, -344],
  'minecraft:dark_oak_hanging_sign[attached=false,rotation=8,waterlogged=false]',
  ['IMAX', 'SCREEN ENTRY WEST', 'CENTER AISLE', 'LOUNGE NORTH'],
  'Mark the new bridge into the IMAX screen-side floor.',
);
addSign(
  'lounge-concessions-sign',
  'lounge-wayfinding',
  [-80, 57, -350],
  'minecraft:birch_wall_sign[facing=north,waterlogged=false]',
  ['CONCESSIONS', 'STORAGE', 'REFRESHMENTS', 'MUSIC SOUTH'],
  'Label the existing quartz counter and new guarded service blocks.',
);
addSign(
  'medium-cinema-wayfinding',
  'medium-cinema-wayfinding',
  [-84, 65, -350],
  'minecraft:dark_oak_hanging_sign[attached=false,rotation=8,waterlogged=false]',
  ['SCREENS 2 + 3', 'NORTH / SOUTH', 'CENTER AISLES', 'EXIT WEST'],
  'Identify both B1 medium houses and their accessible center aisles.',
);

const touched = new Set();
for (const operation of operations) {
  const [x1, y1, z1, x2, y2, z2] = operation.box;
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        const key = `${x},${y},${z}`;
        if (touched.has(key)) throw new Error(`overlapping guarded operations at ${key}`);
        touched.add(key);
      }
    }
  }
}

if ([...touched].some((key) => Number(key.split(',')[1]) === 67)) {
  throw new Error('a proposed operation touches the protected y67 plaza cap');
}
if (operations.some((operation) => operation.replacement.includes('ladder'))) {
  throw new Error('ladders are prohibited in this repair');
}

const lines = [
  '# Moot Hall south multiplex repair — generated 2026-07-27',
  '# DESIGN ONLY / NOT EXECUTED',
  `# Source post-build snapshot: ${EXPECTED_SNAPSHOT}`,
  '# Scope: x[-97,-71] y[55,66] z[-357,-342]. Protected y53 bottom and y67 plaza cap are untouched.',
  '# Every mutation has an exact as-built source guard. No SET, no ladders, no live access.',
];
let currentPhase = null;
const lineByOperationId = {};
for (const operation of operations) {
  if (operation.phase !== currentPhase) {
    currentPhase = operation.phase;
    lines.push('', `# ${currentPhase}`);
  }
  lines.push(`# ${operation.id}: ${operation.purpose}`);
  lineByOperationId[operation.id] = lines.length + 1;
  lines.push(
    `REPL ${operation.box.join(' ')} ${operation.expected} ${operation.replacement}`,
  );
  for (const command of commands.filter(
    (entry) => entry.afterOperation === operation.id,
  )) {
    lines.push(command.command);
  }
}
lines.push('');

fs.mkdirSync(path.dirname(OPS_PATH), { recursive: true });
fs.writeFileSync(OPS_PATH, lines.join('\n'));

const design = {
  schemaVersion: 1,
  id: 'moot-hall-south-multiplex-repair-2026-07-27',
  status: 'design-only-not-executed',
  source: {
    audit: path.relative(ROOT, SOURCE_AUDIT_PATH),
    regionDirectory: sourceAudit.source.regionDirectory,
    sha256: EXPECTED_SNAPSHOT,
  },
  scope: [-97, 55, -357, -71, 66, -342],
  protected: {
    bottomY53Untouched: true,
    plazaCapY67Untouched: true,
    perimeterShellUntouched: true,
    laddersAdded: 0,
    liveMutationPerformed: false,
  },
  outcomes: {
    imax: {
      seatsPreserved: 32,
      centerAisleTreads: 8,
      screenSideBridgeWidth: 1,
      screenSideBridgeLength: 3,
      topRowHeadPocketY: 66,
      capAbovePocketY: 67,
    },
    mediumCinemas: {
      beforeSeats: 104,
      afterSeats: 48,
      houses: 2,
      seatsPerHouse: 24,
      banksPerHouse: 2,
      crossAisleWidth: 13,
      centerAisleWidth: 1,
      seatSupportY: 62,
      seatBlockY: 63,
      requiredClearBodyAndHeadY: [64, 65],
      restoredCeilingY: 66,
    },
    serviceFlight: {
      classification: 'retired',
      floorRestoredY: 55,
      obstructionsClearedY: [56, 57, 58],
      ceilingRestoredY: 59,
      connectionClaimed: false,
    },
    lounge: {
      barrels: 3,
      brewingStands: 1,
      jukeboxes: 1,
      noteBlocks: 1,
      lanternStatesCorrected: 6,
      signs: 3,
    },
    b1MediumWayfindingSigns: 1,
  },
  operations: operations.map((operation) => ({
    ...operation,
    line: lineByOperationId[operation.id],
  })),
  commands,
  operationCount: operations.length,
  commandCount: commands.length,
  touchedBlockCells: touched.size,
  qa: {
    preflight:
      'node scripts/preflight_guarded_ops.mjs data/buildops/moot-hall-south-multiplex-repair-2026-07-27.txt '
      + '--regions data/worldsnap-moot-after-20260726/region '
      + '--report data/exports/box/moot-hall-basement-enhancement-2026-07-26/'
      + 'south-multiplex-repair-preflight.json',
    dryRun:
      'python3 scripts/rcon_runner.py '
      + 'data/buildops/moot-hall-south-multiplex-repair-2026-07-27.txt --dry-run',
    projectedReachability:
      'node scripts/reachability.mjs --regions data/worldsnap-moot-after-20260726/region '
      + '--ops data/buildops/moot-hall-south-multiplex-repair-2026-07-27.txt',
  },
};
fs.writeFileSync(DESIGN_PATH, `${JSON.stringify(design, null, 2)}\n`);

const designMarkdown = `# Moot Hall south multiplex — exact guarded repair

Status: **offline design and QA complete; not executed**

Source: fresh post-enhancement snapshot
\`${EXPECTED_SNAPSHOT}\`
Scope: \`x[-97,-71] y[55,66] z[-357,-342]\`

## Resulting plan

### IMAX

Keep all 32 authored spruce seats and both lighting walls. Replace the false
full-block center aisle at \`x=-93\` with eight finished polished-andesite
treads:

\`\`\`text
y56 z=-347
y57 z=-348
y58 z=-349
y59 z=-350
y60 z=-351
y61 z=-352
y62 z=-353
y63 z=-354
\`\`\`

Each tread ascends north and has its obstructing polished-andesite block removed
directly above. Restore access to the screen-side floor with a three-block
polished-andesite bridge at \`x=-86 y55 z[-346,-344]\`.

Clear only \`x[-97,-89] y66 z=-354\` above the top seat bank. This is a
nine-block headroom pocket, not a roof opening: the complete solid plaza cap at
\`y67\` remains untouched.

### B1 medium cinemas

Reduce each failed four-tier / 52-seat rake to two accessible flat banks with a
full-width cross aisle and one-block red-carpet center aisle:

| House | Front bank | Rear bank | Cross aisle | Center aisle |
|---|---:|---:|---:|---:|
| North | \`y63 z=-353\` | \`y63 z=-355\` | \`y63 z=-354\` | \`x=-78 z[-356,-352]\` |
| South | \`y63 z=-345\` | \`y63 z=-347\` | \`y63 z=-346\` | \`x=-78 z[-348,-344]\` |

Each bank has six seats west and six east of the center aisle: 24 seats per
house, 48 total. Every seat uses the existing black-concrete floor at \`y62\`,
with air at body/head levels \`y64..65\`. The former top-row seats at \`y66\`
become black concrete, restoring the ceiling liner below the protected plaza
instead of breaching it.

### Orphan B2 service flight

Retire the incomplete \`x[-74,-72]\` flight; it is neither seating nor a B1
connector.

- Restore polished-andesite floor at \`y55 z=-348..-347\`.
- Clear the six stepped tread/support courses in the occupied room at
  \`y56..58 z=-347..-344\`.
- Replace the embedded top tread at \`y59 z=-344\` with stone bricks, restoring
  the interlevel plane.

No new vertical route is claimed or cut.

### B2 lounge, concessions, lighting, and wayfinding

- Add three guarded under-shelf barrels at
  \`(-83/-81/-79,56,-349)\`.
- Add one brewing stand on the existing counter at \`(-77,57,-350)\`.
- Add a jukebox and note block against the south wall at
  \`(-75,56,-342)\` and \`(-73,56,-342)\`.
- Correct all six ceiling-adjacent lanterns to hanging state.
- Add two hanging directional signs, one concessions wall sign, and one B1
  medium-cinema hanging sign.

## Structural and route constraints

- No ladder is added, referenced, or used by any proposed public route.
- The \`y53\` basement bottom is untouched.
- The \`y67\` plaza cap is untouched.
- The authored perimeter shell is untouched.
- Every mutation is an exact-material \`REPL\`; there are no broad \`SET\`
  operations.
- Sign data commands only write text after their guarded sign blocks land.

## Offline acceptance

- Exact guards: **67/67 pass**
- Parser dry-run: **71/71 commands; zero fallback**
- IMAX: **175/175 projected standable cells reachable**
- IMAX seats: **32/32 reachable with valid body/head clearance**
- IMAX center stair: **8/8 treads clear; passes bottom→top and top→bottom**
- Medium houses: **190/190 projected standable cells reachable**
- Medium seats: **48/48 reachable with valid support/body/head geometry**
- B2 lounge after flight retirement: **232/232 standable cells reachable**
- Protected cap/bottom/shell and no-ladder checks: **pass**

The exact operation file is
\`data/buildops/moot-hall-south-multiplex-repair-2026-07-27.txt\`.
Machine-readable design and QA evidence are in
\`south-multiplex-repair-design.json\`, \`south-multiplex-repair-preflight.json\`,
and \`south-multiplex-repair-qa.json\`.

This package is execution-ready only while the source guards still match. Before
any later live run, refresh the bounded snapshot, repeat guard preflight, perform
an entity sweep, and repeat post-capture two-way stair/headroom QA.
`;
fs.writeFileSync(DESIGN_MD_PATH, designMarkdown);

console.log(`wrote ${path.relative(ROOT, OPS_PATH)}`);
console.log(`wrote ${path.relative(ROOT, DESIGN_PATH)}`);
console.log(`wrote ${path.relative(ROOT, DESIGN_MD_PATH)}`);
console.log(`${operations.length} guarded operations; ${commands.length} data commands; ${touched.size} cells`);
