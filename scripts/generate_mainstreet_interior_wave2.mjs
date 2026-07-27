#!/usr/bin/env node
/**
 * MainStreet interior Wave 2.
 *
 * - replaces The Midtown's scaffolding column with a real compact stair core;
 * - fits every room that the saved-world census classified as empty or
 *   under-detailed;
 * - uses only one-cell, exact-source REPL guards against the Wave 1 snapshot.
 *
 * This generator is offline-only.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-wave1-post-20260727/region',
);
const censusPath = value(
  '--census',
  'data/world-review/worldwide-interior-wave1-post-census-2026-07-27.json',
);
const output = value(
  '--out',
  'data/buildops/mainstreet-interior-wave2-2026-07-27.txt',
);
const reportPath = value(
  '--report',
  'data/world-review/mainstreet-interior-wave2-design-2026-07-27.json',
);

const snapshot = new AnvilSnapshot(regions);
const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const sourceCache = new Map();
const operations = new Map();
const roomReports = [];

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const NON_SUPPORT = new Set([
  ...AIR,
  'minecraft:water',
  'minecraft:bubble_column',
  'minecraft:lava',
  'minecraft:ladder',
  'minecraft:scaffolding',
  'minecraft:iron_bars',
  'minecraft:chain',
]);

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function baseName(block) {
  return block.split('[', 1)[0];
}

async function sourceBlockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (sourceCache.has(cellKey)) return sourceCache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
  const block = column.get(y);
  sourceCache.set(cellKey, block);
  return block;
}

async function blockAt(x, y, z) {
  return operations.get(key(x, y, z))?.replacement ?? sourceBlockAt(x, y, z);
}

async function repl(x, y, z, replacement, phase) {
  const cellKey = key(x, y, z);
  const existing = operations.get(cellKey);
  if (existing) {
    if (existing.replacement !== replacement) {
      throw new Error(
        `conflicting replacements at ${cellKey}: ${existing.replacement} vs ${replacement}`,
      );
    }
    return false;
  }
  const current = await sourceBlockAt(x, y, z);
  if (current === replacement || baseName(current) === baseName(replacement)) return false;
  operations.set(cellKey, { x, y, z, current, replacement, phase });
  return true;
}

async function isFurnitureCell(x, y, z) {
  const feet = await blockAt(x, y, z);
  const head = await blockAt(x, y + 1, z);
  const support = await blockAt(x, y - 1, z);
  return AIR.has(baseName(feet))
    && AIR.has(baseName(head))
    && !NON_SUPPORT.has(baseName(support));
}

async function chooseFeetY(bounds) {
  let best = { y: bounds.minY, count: -1 };
  for (let y = bounds.minY; y <= Math.min(bounds.maxY - 1, bounds.minY + 2); y += 1) {
    let count = 0;
    for (let z = bounds.minZ + 1; z <= bounds.maxZ - 1; z += 1) {
      for (let x = bounds.minX + 1; x <= bounds.maxX - 1; x += 1) {
        if (await isFurnitureCell(x, y, z)) count += 1;
      }
    }
    if (count > best.count) best = { y, count };
  }
  return best;
}

function candidateCoordinates(bounds) {
  const x1 = bounds.minX + 1;
  const x2 = bounds.maxX - 1;
  const z1 = bounds.minZ + 1;
  const z2 = bounds.maxZ - 1;
  const coordinates = [];
  const seen = new Set();
  const add = (x, z) => {
    const cellKey = `${x},${z}`;
    if (x < x1 || x > x2 || z < z1 || z > z2 || seen.has(cellKey)) return;
    seen.add(cellKey);
    coordinates.push([x, z]);
  };

  // Ordered wall groupings read as cabinets, libraries, wardrobes, and
  // consoles instead of a random scatter.
  for (let x = x1; x <= x2; x += 2) add(x, z1);
  for (let x = x1; x <= x2; x += 2) add(x, z2);
  for (let z = z1 + 2; z <= z2 - 2; z += 2) add(x1, z);
  for (let z = z1 + 2; z <= z2 - 2; z += 2) add(x2, z);

  // Quarter-room islands leave a broad centerline for circulation.
  const width = Math.max(1, x2 - x1);
  const depth = Math.max(1, z2 - z1);
  for (const xf of [0.25, 0.75]) {
    for (const zf of [0.25, 0.75]) {
      add(Math.round(x1 + width * xf), Math.round(z1 + depth * zf));
    }
  }
  for (let z = z1 + 2; z <= z2 - 2; z += 3) {
    for (let x = x1 + 2; x <= x2 - 2; x += 3) add(x, z);
  }
  return coordinates;
}

function roomPalette(name, accent) {
  const lower = name.toLowerCase();
  if (/(kitchen|dining)/.test(lower)) {
    return [
      'minecraft:barrel',
      'minecraft:smoker[facing=south,lit=false]',
      'minecraft:crafting_table',
      'minecraft:furnace[facing=south,lit=false]',
      'minecraft:chest[facing=south,type=single,waterlogged=false]',
      `minecraft:${accent}_carpet`,
    ];
  }
  if (/(library|study|design|studio|office)/.test(lower)) {
    return [
      'minecraft:bookshelf',
      'minecraft:chiseled_bookshelf',
      'minecraft:lectern[facing=south,has_book=false,powered=false]',
      'minecraft:cartography_table',
      `minecraft:${accent}_carpet`,
      'minecraft:flower_pot',
    ];
  }
  if (/(foyer|entry|vestibule|porch|court|zaguan)/.test(lower)) {
    return [
      `minecraft:${accent}_carpet`,
      'minecraft:flower_pot',
      'minecraft:chiseled_bookshelf',
      'minecraft:barrel',
      'minecraft:lantern[hanging=false,waterlogged=false]',
    ];
  }
  if (/(media|lounge|living|great|sala|salon|hearth)/.test(lower)) {
    return [
      `minecraft:${accent}_carpet`,
      'minecraft:jukebox',
      'minecraft:note_block',
      'minecraft:bookshelf',
      'minecraft:chiseled_bookshelf',
      'minecraft:flower_pot',
    ];
  }
  if (/(suite|bedroom|guest|loft|gallery)/.test(lower)) {
    return [
      `minecraft:${accent}_carpet`,
      'minecraft:chest[facing=south,type=single,waterlogged=false]',
      'minecraft:chiseled_bookshelf',
      'minecraft:barrel',
      'minecraft:flower_pot',
      'minecraft:bookshelf',
    ];
  }
  return [
    `minecraft:${accent}_carpet`,
    'minecraft:bookshelf',
    'minecraft:barrel',
    'minecraft:flower_pot',
    'minecraft:lectern[facing=south,has_book=false,powered=false]',
  ];
}

const accents = new Map([
  ['H01', 'blue'],
  ['H02', 'light_blue'],
  ['H03', 'red'],
  ['H04', 'green'],
  ['H05', 'brown'],
  ['H06', 'light_gray'],
  ['H07', 'orange'],
  ['H08', 'purple'],
  ['H09', 'red'],
  ['H10', 'gray'],
  ['H11', 'cyan'],
  ['H12', 'yellow'],
  ['HGR-S01', 'blue'],
  ['GRID-W2-BUILDING', 'magenta'],
]);

// The Midtown was built with one exposed scaffolding column. Replace it with a
// three-by-three continuous stair core through all four occupied floors.
for (let y = 65; y <= 82; y += 1) {
  if (baseName(await sourceBlockAt(37, y, -142)) === 'minecraft:scaffolding') {
    await repl(37, y, -142, 'minecraft:air', 'H11-scaffolding-retirement');
  }
}
const midtownSpiral = [
  [34, -144, 'east'],
  [35, -144, 'east'],
  [36, -144, 'south'],
  [36, -143, 'south'],
  [36, -142, 'west'],
  [35, -142, 'west'],
  [34, -142, 'north'],
  [34, -143, 'north'],
];
for (let y = 65; y <= 79; y += 1) {
  const [x, z, facing] = midtownSpiral[(y - 65) % midtownSpiral.length];
  await repl(
    x,
    y,
    z,
    `minecraft:polished_blackstone_brick_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
    'H11-four-floor-stair-core',
  );
  for (const clearY of [y + 1, y + 2]) {
    if (!AIR.has(baseName(await blockAt(x, clearY, z)))) {
      await repl(x, clearY, z, 'minecraft:air', 'H11-stair-core-headroom');
    }
  }
}

// Casa Lana's cataloged primary suite straddles a real terracotta divider, but
// the original floorplan pass never cut a door through it. Open a generous
// two-wide cased arch so its sleeping and dressing/bath halves form one suite.
for (const z of [-56, -55]) {
  for (let y = 65; y <= 67; y += 1) {
    await repl(26, y, z, 'minecraft:air', 'H09-primary-suite-arch');
  }
}

const deficientRooms = census.structures
  .filter((structure) => structure.areaId === 'mainstreet-america')
  .flatMap((structure) => (structure.rooms ?? []).map((room) => ({ structure, room })))
  .filter(({ room }) => (
    room.finding.status === 'empty' || room.finding.status === 'under-detailed'
  ));

for (const { structure, room } of deficientRooms) {
  const bounds = room.bounds;
  const feet = await chooseFeetY(bounds);
  const area = (bounds.maxX - bounds.minX + 1) * (bounds.maxZ - bounds.minZ + 1);
  const requested = Math.min(22, Math.max(5, Math.ceil(area * 0.022) + 2));
  const candidates = candidateCoordinates(bounds);
  const palette = roomPalette(room.name, accents.get(structure.id) ?? 'light_gray');
  let placed = 0;
  const placements = [];
  for (const [x, z] of candidates) {
    if (placed >= requested) break;
    if (!(await isFurnitureCell(x, feet.y, z))) continue;
    // Preserve a two-block buffer around the new Midtown stair core.
    if (
      structure.id === 'H11'
      && x >= 33 && x <= 37
      && z >= -145 && z <= -141
    ) continue;
    const block = palette[placed % palette.length];
    if (await repl(x, feet.y, z, block, `${room.id}-fitout`)) {
      placements.push({ x, y: feet.y, z, block });
      placed += 1;
    }
  }
  roomReports.push({
    structureId: structure.id,
    roomId: room.id,
    name: room.name,
    priorStatus: room.finding.status,
    feetY: feet.y,
    standableCandidates: feet.count,
    requested,
    placed,
    placements,
  });
}

const ordered = [...operations.values()].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y - b.y
  || a.z - b.z
  || a.x - b.x
));
const lines = [
  '# GENERATED FILE — MainStreet interior enhancement wave 2',
  '# 41 deficient rooms; luxury functional fit-outs; H11 four-floor stair core',
  `# snapshot: ${regions}`,
  '# every REPL is an exact one-cell source-snapshot guard',
  '',
];
let phase = null;
for (const operation of ordered) {
  if (operation.phase !== phase) {
    phase = operation.phase;
    lines.push(`# phase: ${phase}`);
  }
  lines.push(
    `REPL ${operation.x} ${operation.y} ${operation.z} `
    + `${operation.x} ${operation.y} ${operation.z} `
    + `${operation.current} ${operation.replacement}`,
  );
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);

const hash = crypto.createHash('sha256');
for (const filename of fs.readdirSync(regions).filter((name) => name.endsWith('.mca')).sort()) {
  hash.update(filename);
  hash.update('\0');
  hash.update(fs.readFileSync(path.join(regions, filename)));
  hash.update('\0');
}
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceSnapshot: {
    directory: regions,
    sha256: hash.digest('hex'),
  },
  census: censusPath,
  deficientRooms: deficientRooms.length,
  roomsFitted: roomReports.filter((room) => room.placed > 0).length,
  roomsBelowRequested: roomReports.filter((room) => room.placed < room.requested),
  operations: ordered.length,
  phases: [...new Set(ordered.map((operation) => operation.phase))].length,
  h11: {
    scaffoldingCellsRemoved: ordered.filter(
      (operation) => operation.phase === 'H11-scaffolding-retirement',
    ).length,
    stairCells: ordered.filter(
      (operation) => operation.phase === 'H11-four-floor-stair-core',
    ).length,
  },
  rooms: roomReports,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  report: reportPath,
  deficientRooms: report.deficientRooms,
  roomsFitted: report.roomsFitted,
  roomsBelowRequested: report.roomsBelowRequested.length,
  operations: report.operations,
  phases: report.phases,
  h11: report.h11,
}, null, 2));
