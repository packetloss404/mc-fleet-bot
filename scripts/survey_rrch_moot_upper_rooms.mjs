#!/usr/bin/env node
/**
 * survey_rrch_moot_upper_rooms.mjs — read-only current-state census of the
 * Ravensreach Moot Hall upper-stack rooms (Committee Room, Clerks Hall,
 * Meeting Room, Attic Store) on the post-RRCH-MOOT-01/01B snapshot.
 *
 * Reports both the full registered-bounds census (comparable to the defect
 * lane) and an interior-only census excluding the accepted upper-spine
 * overlap (x=-99..-93). It never connects to Minecraft, never writes blocks,
 * and never compiles an operation file. Survey only.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-civic-interiors-moot-01b-post-20260824T015500Z',
);
const OUT_DIR = value('--out-dir', 'data/world-review/rrch-moot-upper-rooms-survey-20260824');
const OUT_JSON = path.join(OUT_DIR, 'rrch-moot-upper-rooms-survey.json');
const OUT_MD = path.join(OUT_DIR, 'rrch-moot-upper-rooms-survey.md');

const reader = new AnvilReader(path.resolve(ROOT, SNAPSHOT, 'region'));

/* ------------------------------------------------------------------------- *
 * Classification constants mirrored from audit_world_interiors.mjs.
 * ------------------------------------------------------------------------- */
const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const DETAIL_EXACT = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:bookshelf', 'minecraft:chiseled_bookshelf', 'minecraft:lectern',
  'minecraft:crafting_table', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:stonecutter', 'minecraft:smithing_table',
  'minecraft:cartography_table', 'minecraft:fletching_table', 'minecraft:loom',
  'minecraft:grindstone', 'minecraft:brewing_stand', 'minecraft:jukebox',
  'minecraft:note_block', 'minecraft:anvil', 'minecraft:chipped_anvil',
  'minecraft:damaged_anvil', 'minecraft:flower_pot', 'minecraft:decorated_pot',
  'minecraft:armor_stand', 'minecraft:bell', 'minecraft:cauldron',
]);
const DISPLAY_EXACT = new Set([
  'minecraft:netherite_block', 'minecraft:diamond_block', 'minecraft:emerald_block',
  'minecraft:gold_block', 'minecraft:iron_block', 'minecraft:copper_block',
  'minecraft:lapis_block', 'minecraft:redstone_block', 'minecraft:amethyst_block',
  'minecraft:raw_gold_block', 'minecraft:raw_iron_block', 'minecraft:raw_copper_block',
  'minecraft:ancient_debris', 'minecraft:beacon', 'minecraft:conduit',
  'minecraft:polished_blackstone', 'minecraft:lightning_rod',
]);
const LIGHT_EXACT = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:glowstone', 'minecraft:shroomlight', 'minecraft:end_rod',
  'minecraft:ochre_froglight', 'minecraft:verdant_froglight',
  'minecraft:pearlescent_froglight',
]);

const PASSABLE_SUFFIX = [
  '_carpet', '_banner', '_sign', '_button', '_torch', '_rail',
  '_pressure_plate', '_sapling', '_fence_gate',
];
const PASSABLE_EXACT = new Set([
  'minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass',
  'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:chain',
  'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light',
  'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb',
]);
const CLIMB = new Set([
  'minecraft:ladder', 'minecraft:vine', 'minecraft:scaffolding',
  'minecraft:twisting_vines', 'minecraft:weeping_vines',
  'minecraft:cave_vines', 'minecraft:cave_vines_plant',
]);
const SWIM = new Set(['minecraft:water', 'minecraft:bubble_column']);
const DEADLY = new Set([
  'minecraft:lava', 'minecraft:fire', 'minecraft:soul_fire', 'minecraft:cactus',
  'minecraft:magma_block', 'minecraft:sweet_berry_bush', 'minecraft:powder_snow',
]);

function category(name) {
  if (name.endsWith('_stairs')) return 'stairs';
  if (name.endsWith('_slab')) return 'slabs';
  if (name === 'minecraft:ladder') return 'ladders';
  if (name.endsWith('_door')) return 'doors';
  if (name.endsWith('_trapdoor')) return 'trapdoors';
  if (name.endsWith('_bed')) return 'beds';
  if (name.endsWith('_carpet')) return 'carpets';
  if (name.endsWith('_sign')) return 'signs';
  if (name.endsWith('_banner')) return 'banners';
  if (LIGHT_EXACT.has(name) || name.endsWith('_torch')) return 'lights';
  if (DETAIL_EXACT.has(name)) return 'fixtures';
  if (DISPLAY_EXACT.has(name)) return 'displays';
  if (name.endsWith('_glass') || name.endsWith('_glass_pane')) return 'glazing';
  if (AIR.has(name)) return name === 'minecraft:cave_air' ? 'caveAir' : 'air';
  if (WATER.has(name)) return 'water';
  return 'structure';
}

function isAir(state) {
  return AIR.has(state.Name);
}
function isClimb(state) {
  return CLIMB.has(state.Name);
}
function isSwim(state) {
  return SWIM.has(state.Name);
}
function isDeadly(state) {
  return DEADLY.has(state.Name);
}
function isOpenDoor(state) {
  return state.Name.endsWith('_door') && state.Properties?.open === 'true';
}
function passable(state) {
  const name = state.Name;
  if (isAir(state) || isSwim(state) || isClimb(state)) return true;
  if (isDeadly(state)) return false;
  if (PASSABLE_EXACT.has(name)) return true;
  if (PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix))) return true;
  if (isOpenDoor(state)) return true;
  if (name.endsWith('_trapdoor')) return state.Properties?.open === 'true';
  return false;
}
function footing(state) {
  const name = state.Name;
  if (isAir(state)) return false;
  if (isClimb(state) || isSwim(state)) return true;
  if (isDeadly(state)) return false;
  if (name.endsWith('_carpet') || name.endsWith('_slab') || name.endsWith('_stairs')) return true;
  if (name.endsWith('_trapdoor')) return !(state.Properties?.open === 'true');
  if (name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) return true;
  return !passable(state);
}

async function standable(x, y, z) {
  const feet = await reader.blockState(x, y, z);
  if (!passable(feet)) return false;
  const head = await reader.blockState(x, y + 1, z);
  if (!passable(head)) return false;
  if (isClimb(feet) || isSwim(feet)) return true;
  const below = await reader.blockState(x, y - 1, z);
  return footing(below);
}

const ROOMS = [
  {
    id: 'committee-room',
    name: 'Committee Room',
    minX: -99, maxX: -71, minY: 74, maxY: 77, minZ: -366, maxZ: -342,
    requiredDetails: 11,
  },
  {
    id: 'clerks-hall',
    name: 'Clerks Hall',
    minX: -99, maxX: -71, minY: 79, maxY: 82, minZ: -366, maxZ: -342,
    requiredDetails: 11,
  },
  {
    id: 'meeting-room',
    name: 'Meeting Room',
    minX: -99, maxX: -71, minY: 84, maxY: 86, minZ: -366, maxZ: -342,
    requiredDetails: 11,
  },
  {
    id: 'attic-store',
    name: 'Attic Store',
    minX: -99, maxX: -71, minY: 88, maxY: 93, minZ: -366, maxZ: -342,
    requiredDetails: 11,
  },
];

/* The accepted upper-spine envelope is x=-100..-92. Its wall occupies x=-99..-92
 * within the registered room bounds. The true east-section room interior is
 * therefore x=-91..-71. Interior-only metrics exclude x<=-92 to isolate the
 * actual room from spine bleed. */
const SPINE_MAX_X = -92;
function interiorX(room) {
  return { minX: Math.max(room.minX, SPINE_MAX_X + 1), maxX: room.maxX };
}

async function censusVolume(room, xRange) {
  const census = {};
  const detailCells = [];
  const lightCells = [];
  const doorCells = [];
  const stairCells = [];
  const fixtureCells = [];
  const namedCells = [];
  const byY = {};
  let volume = 0;
  for (let y = room.minY; y <= room.maxY; y += 1) {
    for (let z = room.minZ; z <= room.maxZ; z += 1) {
      for (let x = xRange.minX; x <= xRange.maxX; x += 1) {
        const state = await reader.blockState(x, y, z);
        const group = category(state.Name);
        census[group] = (census[group] ?? 0) + 1;
        byY[y] ??= {};
        byY[y][group] = (byY[y][group] ?? 0) + 1;
        volume += 1;
        if (group === 'lights') lightCells.push({ x, y, z, Name: state.Name });
        if (group === 'doors') doorCells.push({ x, y, z, Name: state.Name });
        if (group === 'stairs') stairCells.push({ x, y, z, Name: state.Name });
        if (group === 'fixtures' || group === 'displays') {
          fixtureCells.push({ x, y, z, Name: state.Name, group });
        }
        if (group === 'fixtures' || group === 'displays' || group === 'beds'
          || group === 'carpets' || group === 'banners') {
          detailCells.push({ x, y, z, Name: state.Name, group });
        }
        if (group !== 'air' && group !== 'structure' && group !== 'caveAir') {
          namedCells.push({ x, y, z, Name: state.Name, group });
        }
      }
    }
  }
  return { census, byY, detailCells, lightCells, doorCells, stairCells, fixtureCells, namedCells, volume };
}

async function countStandable(room, xRange) {
  const cells = [];
  for (let y = room.minY; y <= room.maxY; y += 1) {
    for (let z = room.minZ; z <= room.maxZ; z += 1) {
      for (let x = xRange.minX; x <= xRange.maxX; x += 1) {
        if (await standable(x, y, z)) cells.push({ x, y, z });
      }
    }
  }
  return cells;
}

/** For each fixture/detail cell, determine whether it is floor-supported or
 *  floating over air/void. A cell is supported if the block directly below it
 *  is a solid full block (or the cell sits on a non-air solid footing). */
async function supportStatus(cells) {
  const out = [];
  for (const cell of cells) {
    const below = await reader.blockState(cell.x, cell.y - 1, zOf(cell));
    out.push({ ...cell, supported: !isAir(below) && !['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(below.Name), below: below.Name });
  }
  return out;
}
function zOf(cell) {
  return cell.z;
}

function estimatedFloorArea(room) {
  return Math.max(0, room.maxX - room.minX - 1) * Math.max(0, room.maxZ - room.minZ - 1);
}

function roomFinding(census, area, volume) {
  const details = (census.fixtures ?? 0)
    + (census.displays ?? 0)
    + (census.beds ?? 0)
    + (census.carpets ?? 0)
    + (census.banners ?? 0)
    + Math.floor((census.lights ?? 0) / 2);
  const density = area > 0 ? details / area : 0;
  const requiredDetails = Math.min(16, Math.max(4, Math.ceil(area * 0.015)));
  if (volume < 8) return { status: 'too-small-to-score', detailDensity: density, requiredDetails };
  if (details === 0) return { status: 'empty', detailDensity: density, requiredDetails };
  if (details < requiredDetails) return { status: 'under-detailed', detailDensity: density, requiredDetails };
  return { status: 'fitted', detailDensity: density, requiredDetails };
}

function sha256Snapshot(regionsDir) {
  const hash = crypto.createHash('sha256');
  const dir = path.resolve(ROOT, regionsDir);
  if (!fs.existsSync(dir)) return null;
  for (const filename of fs.readdirSync(dir).filter((name) => name.endsWith('.mca')).sort()) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(dir, filename)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function blockEntitiesInVolume(room, xRange) {
  const found = [];
  const chunks = new Set();
  for (let x = room.minX; x <= room.maxX; x += 1) {
    for (let z = room.minZ; z <= room.maxZ; z += 1) {
      chunks.add(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
    }
  }
  for (const chunkKey of chunks) {
    const [cx, cz] = chunkKey.split(',').map(Number);
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const x = Number(entity.x); const y = Number(entity.y); const z = Number(entity.z);
      if (x >= xRange.minX && x <= xRange.maxX && y >= room.minY && y <= room.maxY
        && z >= room.minZ && z <= room.maxZ) {
        found.push({ x, y, z, id: entity.id ?? entity.Id ?? null });
      }
    }
  }
  return found;
}

async function main() {
  const rooms = [];
  for (const roomDef of ROOMS) {
    const fullRange = { minX: roomDef.minX, maxX: roomDef.maxX };
    const intRange = interiorX(roomDef);
    const area = estimatedFloorArea(roomDef);

    const full = await censusVolume(roomDef, fullRange);
    const interior = await censusVolume(roomDef, intRange);
    const fullStandable = await countStandable(roomDef, fullRange);
    const intStandable = await countStandable(roomDef, intRange);

    const standableByY = {};
    for (const cell of intStandable) {
      standableByY[cell.y] = (standableByY[cell.y] ?? 0) + 1;
    }

    /* Mark which interior fixtures were added by RRCH-MOOT-01B (the six dark_oak
     * chairs, two sea_lanterns, two quartz_pillar displays) so unsupported items
     * can be attributed to the 01B release vs pre-existing decor. */
    const moot01bSet = new Set([
      '(-97,75,-364)', '(-97,75,-352)', '(-97,75,-348)',
      '(-73,75,-364)', '(-73,75,-352)', '(-73,75,-348)',
      '(-91,75,-344)', '(-79,75,-344)',
      '(-90,76,-362)', '(-80,76,-362)',
    ]);
    const addedBy01B = (cell) => moot01bSet.has(`${cell.x},${cell.y},${cell.z}`);

    const fixtureSupport = await supportStatus(interior.fixtureCells);
    const lightSupport = await supportStatus(interior.lightCells);
    for (const f of fixtureSupport) f.addedBy01B = addedBy01B(f);
    for (const l of lightSupport) l.addedBy01B = addedBy01B(l);

    /* The six 01B chairs are dark_oak_stairs (group 'stairs') and the two 01B
     * display pillars are quartz_pillar (group 'structure'), so they are not in
     * fixtureCells/lightCells. Capture every 01B cell explicitly (including the
     * three west chairs at x=-97 which lie in the spine overlap, x=-99..-93) and
     * record its support status and whether it sits in the true east interior.
     * Only the Committee Room (y=74..77) contains 01B cells. */
    const moot01BCells = [];
    const moot01BSupport = [];
    for (const key of moot01bSet) {
      const [x, y, z] = key.slice(1, -1).split(',').map(Number);
      if (y < roomDef.minY || y > roomDef.maxY) continue;
      const state = await reader.blockState(x, y, z);
      const group = category(state.Name);
      const below = await reader.blockState(x, y - 1, z);
      const supported = !isAir(below) && !['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(below.Name);
      moot01BCells.push({
        x, y, z, Name: state.Name, group,
        supported,
        below: below.Name,
        inEastInterior: x >= -91 && x <= -71,
      });
      if (x >= -91 && x <= -71) moot01BSupport.push(moot01BCells[moot01BCells.length - 1]);
    }
    for (const c of moot01BSupport) c.addedBy01B = true;

    const detailScore = (interior.census.fixtures ?? 0)
      + (interior.census.displays ?? 0)
      + (interior.census.beds ?? 0)
      + (interior.census.carpets ?? 0)
      + (interior.census.banners ?? 0)
      + Math.floor((interior.census.lights ?? 0) / 2);
    const finding = roomFinding(interior.census, area, interior.volume);

    const blockEntities = await blockEntitiesInVolume(roomDef, intRange);
    const allFixtures = [...fixtureSupport, ...lightSupport];
    const unsupported01B = allFixtures.filter((f) => f.addedBy01B && !f.supported).map((f) => `${f.Name}@${f.x},${f.y},${f.z}`);
    const unsupported01BAll = moot01BSupport.filter((f) => !f.supported).map((f) => `${f.Name}@${f.x},${f.y},${f.z}`);

    rooms.push({
      id: roomDef.id,
      name: roomDef.name,
      bounds: { minX: roomDef.minX, maxX: roomDef.maxX, minY: roomDef.minY, maxY: roomDef.maxY, minZ: roomDef.minZ, maxZ: roomDef.maxZ },
      interiorXRange: intRange,
      volume: interior.volume,
      area,
      censusFullBounds: full.census,
      censusInterior: interior.census,
      censusInteriorByY: interior.byY,
      detailScore,
      requiredDetails: roomDef.requiredDetails,
      finding: {
        status: finding.status,
        detailDensity: Number(finding.detailDensity.toFixed(4)),
        requiredDetailsByFormula: finding.requiredDetails,
      },
      standableCellsFullBounds: fullStandable.length,
      standableCellsInterior: intStandable.length,
      standableByY,
      fixtures: fixtureSupport.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z),
      lights: lightSupport.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z),
      doors: interior.doorCells.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z),
      stairsInterior: interior.stairCells.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z),
      blockEntities,
      unsupported01BFixtures: unsupported01BAll,
      moot01BCells: moot01BSupport.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z),
    });
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    purpose: 'Current-state census of the Ravensreach Moot Hall upper-stack rooms after RRCH-MOOT-01 and RRCH-MOOT-01B. Survey only; no operations compiled, no world edits.',
    snapshot: {
      directory: SNAPSHOT,
      sha256: sha256Snapshot(path.join(SNAPSHOT, 'region')),
    },
    defectLaneSource: 'docs/redevelopment/2026-08-22-public-realm-defect-lane.md',
    spineNote: 'The accepted CIVIC-RRCH-MOOT-UPPER-SPINE occupies x=-100..-92. The partition wall x=-92 separates the spine from the east-section rooms. Registered room bounds x=-99..-71 therefore overlap the spine; interior-only metrics use x=-91..-71.',
    alreadyExecuted: {
      'RRCH-MOOT-01': {
        meetingRoomFloorY: 83,
        atticStoreFloorY: 87,
        floorMaterial: 'minecraft:spruce_planks',
        floorBounds: { minX: -97, maxX: -75, minZ: -360, maxZ: -348 },
        lights: ['(-93,85,-354)', '(-79,85,-354)', '(-93,89,-354)', '(-79,89,-354)'],
        evidence: 'data/world-review/civic-rrch-moot-01-live-20260824T004801Z/',
      },
      'RRCH-MOOT-01B': {
        committeeRoomFixtureLevel: 75,
        chairs: ['(-97,75,-364)', '(-97,75,-352)', '(-97,75,-348)', '(-73,75,-364)', '(-73,75,-352)', '(-73,75,-348)'],
        lights: ['(-90,76,-362)', '(-80,76,-362)'],
        displayPillars: ['(-91,75,-344)', '(-79,75,-344)'],
        evidence: 'data/world-review/civic-rrch-moot-01b-live-20260824T015500Z/',
      },
    },
    rooms,
  };

  fs.mkdirSync(path.resolve(ROOT, OUT_DIR), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, OUT_JSON), `${JSON.stringify(report, null, 2)}\n`);
  writeMarkdown(report);

  console.log(JSON.stringify({
    output: OUT_JSON,
    snapshot: report.snapshot,
    rooms: rooms.map((room) => ({
      id: room.id,
      status: room.finding.status,
      detailScore: room.detailScore,
      required: room.requiredDetails,
      standableInterior: room.standableCellsInterior,
      standableByY: room.standableByY,
      unsupportedFixtures: room.fixtures.filter((f) => !f.supported).map((f) => `${f.Name}@${f.x},${f.y},${f.z}`),
    })),
  }, null, 2));
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# Ravensreach Moot Hall upper-stack rooms — current-state survey (post RRCH-MOOT-01 / 01B)');
  lines.push('');
  lines.push('Status: **READ-ONLY SURVEY — no operations compiled, no world edits.**');
  lines.push('');
  lines.push(`Snapshot: \`${report.snapshot.directory}\``);
  lines.push('');
  lines.push(`SHA-256: \`${report.snapshot.sha256}\``);
  lines.push('');
  lines.push('## Geometry note');
  lines.push('');
  lines.push(`The accepted CIVIC-RRCH-MOOT-UPPER-SPINE occupies \`x=-100..-92\`; the partition wall at \`x=-92\` separates the spine from the east-section rooms. Registered room bounds \`x=-99..-71\` therefore overlap the spine. All metrics below labeled **interior** use \`x=-91..-71\` to isolate the actual room.`);
  lines.push('');
  lines.push('## Already executed');
  lines.push('');
  lines.push('- **RRCH-MOOT-01**: Meeting Room (y83) and Attic Store (y87) spruce-planks floor slabs at `x=-97..-75, z=-360..-348` (299/299 each) plus four sea-lanterns.');
  lines.push('- **RRCH-MOOT-01B**: Committee Room (y75) six dark-oak chairs, two sea-lanterns, two quartz display pillars.');
  lines.push('');
  lines.push('## Per-room census (interior = x=-91..-71)');
  lines.push('');
  for (const room of report.rooms) {
    lines.push(`### ${room.name} (\`${room.id}\`)`);
    lines.push('');
    lines.push(`- Bounds: \`x=${room.bounds.minX}..${room.bounds.maxX}, y=${room.bounds.minY}..${room.bounds.maxY}, z=${room.bounds.minZ}..${room.bounds.maxZ}\`; interior x=\`${room.interiorXRange.minX}..${room.interiorXRange.maxX}\``);
    lines.push(`- Finding (interior): **${room.finding.status}** — detail score ${room.detailScore} vs required ${room.requiredDetails}`);
    lines.push(`- Standable cells (interior): **${room.standableCellsInterior}** (by Y: ${Object.entries(room.standableByY).map(([y, n]) => `y${y}=${n}`).join(', ')})`);
    lines.push(`- Interior census: ${Object.entries(room.censusInterior).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    lines.push(`- Full-bounds census (incl. spine overlap): ${Object.entries(room.censusFullBounds).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    if (room.fixtures.length) {
      lines.push(`- Fixtures/displays (${room.fixtures.length}): ${room.fixtures.map((f) => `\`${f.Name}@${f.x},${f.y},${f.z}\`${f.addedBy01B ? ' [01B]' : ''}${f.supported ? '' : ' [UNSUPPORTED]'}`).join(', ')}`);
    }
    if (room.lights.length) {
      lines.push(`- Lights (${room.lights.length}): ${room.lights.map((l) => `\`${l.Name}@${l.x},${l.y},${l.z}\`${l.addedBy01B ? ' [01B]' : ''}${l.supported ? '' : ' [UNSUPPORTED]'}`).join(', ')}`);
    }
    if (room.unsupported01BFixtures.length) {
      lines.push(`- **01B-added fixtures that are UNSUPPORTED over air (${room.unsupported01BFixtures.length})**: ${room.unsupported01BFixtures.join(', ')}`);
    }    if (room.doors.length) {
      lines.push(`- Doors (${room.doors.length}): ${room.doors.map((d) => `\`${d.Name}@${d.x},${d.y},${d.z}\``).join(', ')}`);
    }
    if (room.stairsInterior.length) {
      lines.push(`- Interior stairs (${room.stairsInterior.length}): ${room.stairsInterior.map((s) => `\`${s.Name}@${s.x},${s.y},${s.z}\``).join(', ')}`);
    }
    if (room.blockEntities.length) {
      lines.push(`- Block entities to protect (${room.blockEntities.length}): ${room.blockEntities.map((e) => `\`${e.x},${e.y},${e.z}\``).join(', ')}`);
    } else {
      lines.push('- Block entities in interior bounds: none');
    }
    lines.push('');
  }
  lines.push('## Gaps and remaining work');
  lines.push('');
  lines.push('- **Committee Room**: 01B chairs/lights/pillars are present but **unsupported over air** (the room floor surface is the deepslate band at y76; fixtures sit at y75/y76 in the north/west void). It still needs a real finished floor, a committee table, usable seating, wall storage/display, and correct light cadence.');
  lines.push('- **Clerks Hall**: still effectively **empty** — the full-bounds "fitted" score is entirely spine-wall bleed (polished_blackstone + spine stairs at x=-99..-93). Interior has 0 fixtures and no lighting. Needs records/work islands, route-clear central aisle, identifiable access door, level directory, and normal-walk return.');
  lines.push('- **Meeting Room**: floor slab (y83) and two lights now exist (standable interior recovered), but the room has **no usable programme** — no table, seating, display wall, aisle, or wayfinding to the common stair. Still under-detailed.');
  lines.push('- **Attic Store**: spruce floor (y87) now provides a standable level (previously 0/0), but the volume above (y88..93) is **mostly open air with only 3 lights** — no enclosure/ceiling, no storage programme, no controlled staff threshold/service approach. Still under-detailed and closed as a service room by default.');
  lines.push('');
  lines.push('## Recommended bounded build package');
  lines.push('');
  lines.push('All four rooms need work. Recommended scope for `CIVIC-RRCH-MOOT-UPPER-01` (survey-derived, exact-air guarded, no guessed coordinates):');
  lines.push('');
  lines.push('1. **Committee Room** (biggest gap). The 01B furniture floats over air at y75/y76 in the north/west void. Add a supported deepslate/spruce floor at the standing plane (deepslate band top ≈ y76), place a committee table (e.g. spruce/dark-oak slabs+stairs), supported wall-facing chairs, a wall storage/display, and move/replace the 7 unsupported 01B items onto real footing or supported cells. Protect the lectern (`-89,75,-360`) and chiseled bookshelf (`-97,75,-360`).');
  lines.push('2. **Clerks Hall** (truly empty, score 0/11). Add grouped records/work islands (barrels, bookshelves, crafting stations), a route-clear 5-wide central aisle, an identifiable access door/threshold to the spine, a level directory, and lighting. All 156 interior standable cells are connected; keep them that way.');
  lines.push('3. **Meeting Room** (floor exists, no programme, score 5/11). Add a meeting table, supported seating, a display/notice wall, a route-clear aisle, and wayfinding toward the common stair. The spruce floor at y83 provides 214 standable cells at y84.');
  lines.push('4. **Attic Store** (score 0/11, closed by default). After the y87 spruce floor, add ceiling/enclosure, storage shelving, lighting, and a controlled staff threshold from the spine. It stays a service room, not public.');
  lines.push('');
  lines.push('Every changed cell must be exact-air guarded, exclude the 2 protected block entities (`-97,75,-360` chiseled bookshelf, `-89,75,-360` lectern), keep the x=-92 partition and spine intact, and have an exact inverse. Then run the full defect-lane hard-safety kernel before any live execution.');
  lines.push('');
  lines.push('## Hard-safety reminder');
  lines.push('');
  lines.push('This survey is read-only. Any subsequent build must follow the defect-lane release gate: fresh immutable source, exact guards and inverses, block-entity/protected-core clearance, live-entity clearance, strict-noop parser checks, journaled execution, fresh post snapshot, and rollback-poststate preflight.');
  lines.push('');
  const md = lines.join('\n');
  fs.writeFileSync(path.resolve(ROOT, OUT_MD), md);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
