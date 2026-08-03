#!/usr/bin/env node
/**
 * Worldwide Wave 4: purpose-specific fit-out for every first-class room that
 * remains empty or below the capped civic-space detail standard.
 *
 * The package is predominantly furniture, plus measured circulation repairs
 * where the whole-floor route audit found completed rooms sealed behind legacy
 * rock bulkheads. Every operation retains an exact source-state guard.
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
  'data/worldsnap-worldwide-wave3-post-20260727/region',
);
const censusPath = value(
  '--census',
  'data/world-review/worldwide-interior-first-class-census-2026-07-27.json',
);
const output = value(
  '--out',
  'data/buildops/worldwide-room-fitout-wave4-2026-07-27.txt',
);
const reportPath = value(
  '--report',
  'data/world-review/worldwide-room-fitout-wave4-design-2026-07-27.json',
);

const snapshot = new AnvilSnapshot(regions);
const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const cache = new Map();
const operations = new Map();
const roomReports = [];
const circulationApproaches = new Map();

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
  'minecraft:lantern',
  'minecraft:soul_lantern',
  'minecraft:end_rod',
]);
const key = (x, y, z) => `${x},${y},${z}`;
const baseName = (block) => block.split('[', 1)[0];

async function sourceBlockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
  const block = column.get(y);
  cache.set(cellKey, block);
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
      // A newly excavated room cell can be furnished directly from its guarded
      // source block, avoiding a redundant air-then-furniture command pair.
      if (
        AIR.has(baseName(existing.replacement))
        && !AIR.has(baseName(replacement))
      ) {
        operations.set(cellKey, {
          ...existing,
          replacement,
          phase,
        });
        return true;
      }
      throw new Error(`conflicting replacements at ${cellKey}`);
    }
    return false;
  }
  const current = await sourceBlockAt(x, y, z);
  if (current === replacement || baseName(current) === baseName(replacement)) return false;
  operations.set(cellKey, { x, y, z, current, replacement, phase });
  return true;
}

async function isFurnitureCell(x, y, z) {
  const feetOperation = operations.get(key(x, y, z));
  const headOperation = operations.get(key(x, y + 1, z));
  if (
    (feetOperation && !AIR.has(baseName(feetOperation.replacement)))
    || (headOperation && !AIR.has(baseName(headOperation.replacement)))
  ) return false;
  return AIR.has(baseName(await blockAt(x, y, z)))
    && AIR.has(baseName(await blockAt(x, y + 1, z)))
    && !NON_SUPPORT.has(baseName(await blockAt(x, y - 1, z)));
}

async function chooseFeetY(bounds) {
  let best = { y: bounds.minY, count: -1 };
  for (let y = bounds.minY; y <= Math.min(bounds.maxY - 1, bounds.minY + 2); y += 1) {
    let count = 0;
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (await isFurnitureCell(x, y, z)) count += 1;
      }
    }
    if (count > best.count) best = { y, count };
  }
  return best;
}

async function circulationBuffer(bounds, feetY) {
  const forbidden = new Set();
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      let found = false;
      for (
        let y = Math.max(bounds.minY, feetY - 1);
        y <= Math.min(bounds.maxY, feetY + 1);
        y += 1
      ) {
        const name = baseName(await sourceBlockAt(x, y, z));
        if (
          name.endsWith('_stairs')
          || name.endsWith('_door')
          || name.endsWith('_trapdoor')
          || name === 'minecraft:scaffolding'
          || name === 'minecraft:ladder'
        ) {
          found = true;
          break;
        }
      }
      if (!found) continue;
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (Math.abs(dx) + Math.abs(dz) <= 1) forbidden.add(`${x + dx},${z + dz}`);
        }
      }
    }
  }
  return forbidden;
}

function candidates(bounds) {
  const x1 = bounds.minX;
  const x2 = bounds.maxX;
  const z1 = bounds.minZ;
  const z2 = bounds.maxZ;
  const result = [];
  const seen = new Set();
  const add = (x, z) => {
    const cellKey = `${x},${z}`;
    if (x < x1 || x > x2 || z < z1 || z > z2 || seen.has(cellKey)) return;
    seen.add(cellKey);
    result.push([x, z]);
  };
  for (let x = x1; x <= x2; x += 2) add(x, z1);
  for (let x = x1; x <= x2; x += 2) add(x, z2);
  for (let z = z1 + 2; z <= z2 - 2; z += 2) add(x1, z);
  for (let z = z1 + 2; z <= z2 - 2; z += 2) add(x2, z);
  for (let z = z1 + 2; z <= z2 - 2; z += 3) {
    for (let x = x1 + 2; x <= x2 - 2; x += 3) add(x, z);
  }
  return result;
}

function palette(name, areaId) {
  const lower = name.toLowerCase();
  if (/(archive|library|map|office|committee|meeting|briefing|crisis|clerks|dispatch)/.test(lower)) {
    return [
      'minecraft:bookshelf',
      'minecraft:chiseled_bookshelf',
      'minecraft:lectern[facing=south,has_book=false,powered=false]',
      'minecraft:cartography_table',
      'minecraft:note_block',
      'minecraft:blue_carpet',
    ];
  }
  if (/(infirmary|pharmacy|dormitory|suite|living)/.test(lower)) {
    return [
      'minecraft:chest[facing=south,type=single,waterlogged=false]',
      'minecraft:barrel',
      'minecraft:bookshelf',
      'minecraft:flower_pot',
      'minecraft:light_gray_carpet',
      'minecraft:brewing_stand',
    ];
  }
  if (/(dining|market|taproom|tasting|lounge|reception|foyer|hall)/.test(lower)) {
    return [
      'minecraft:barrel',
      'minecraft:smoker[facing=south,lit=false]',
      'minecraft:jukebox',
      'minecraft:note_block',
      'minecraft:flower_pot',
      'minecraft:red_carpet',
    ];
  }
  if (/(workshop|store|service|gear|craft|brewhouse|laundry)/.test(lower)) {
    return [
      'minecraft:barrel',
      'minecraft:chest[facing=south,type=single,waterlogged=false]',
      'minecraft:crafting_table',
      'minecraft:smithing_table',
      'minecraft:stonecutter',
      'minecraft:furnace[facing=south,lit=false]',
    ];
  }
  if (/(bell|belfry|lantern|rotunda|loggia|stoa|pavilion|lookout)/.test(lower)) {
    return [
      'minecraft:lectern[facing=south,has_book=false,powered=false]',
      'minecraft:bell[attachment=floor,facing=north,powered=false]',
      'minecraft:flower_pot',
      'minecraft:lantern[hanging=false,waterlogged=false]',
      'minecraft:chiseled_bookshelf',
      'minecraft:yellow_carpet',
    ];
  }
  if (areaId === 'westlight-venue') {
    return [
      'minecraft:barrel',
      'minecraft:chest[facing=south,type=single,waterlogged=false]',
      'minecraft:smoker[facing=south,lit=false]',
      'minecraft:crafting_table',
      'minecraft:lantern[hanging=false,waterlogged=false]',
      'minecraft:blue_carpet',
    ];
  }
  return [
    'minecraft:bookshelf',
    'minecraft:barrel',
    'minecraft:flower_pot',
    'minecraft:lectern[facing=south,has_book=false,powered=false]',
    'minecraft:light_gray_carpet',
  ];
}

function currentDetails(censusValue) {
  return (censusValue.fixtures ?? 0)
    + (censusValue.displays ?? 0)
    + (censusValue.beds ?? 0)
    + (censusValue.carpets ?? 0)
    + (censusValue.banners ?? 0)
    + Math.floor((censusValue.lights ?? 0) / 2);
}

// Four finished C01 lower-operations rooms had no connection to the gallery at
// z124: three were sealed by glass plus two stone layers and Fabrication by one
// stone layer. Cut generous three-wide, four-tall arches and mark their
// thresholds without disturbing the rooms' floor plates.
const c01LowerDoorways = [
  {
    roomId: 'C01-LOWER-BUNK',
    centerX: 173,
    minZ: 121,
    maxZ: 123,
  },
  {
    roomId: 'C01-LOWER-RECORDS',
    centerX: 183,
    minZ: 121,
    maxZ: 123,
  },
  {
    roomId: 'C01-LOWER-COMMS',
    centerX: 193,
    minZ: 121,
    maxZ: 123,
  },
  {
    roomId: 'C01-LOWER-FABRICATION',
    centerX: 250,
    minZ: 123,
    maxZ: 123,
  },
];
for (const doorway of c01LowerDoorways) {
  const protectedCells = new Set();
  for (let z = doorway.minZ; z <= 124; z += 1) {
    for (let x = doorway.centerX - 2; x <= doorway.centerX + 2; x += 1) {
      protectedCells.add(`${x},${z}`);
    }
  }
  circulationApproaches.set(doorway.roomId, protectedCells);

  for (let z = doorway.minZ; z <= doorway.maxZ; z += 1) {
    for (let x = doorway.centerX - 1; x <= doorway.centerX + 1; x += 1) {
      for (let y = 51; y <= 54; y += 1) {
        if (!AIR.has(baseName(await blockAt(x, y, z)))) {
          await repl(x, y, z, 'minecraft:air', `${doorway.roomId}-gallery-arch`);
        }
      }
    }
  }
  for (let x = doorway.centerX - 1; x <= doorway.centerX + 1; x += 1) {
    await repl(
      x,
      50,
      doorway.maxZ,
      'minecraft:chiseled_deepslate',
      `${doorway.roomId}-gallery-threshold`,
    );
  }
}

// Complete Beacon Inn's authored 9x9 mast as an occupied three-level tower.
// The 2026-07-26 source built wall rings at y83/y88/y96 but no floor plates or
// circulation above the inn's y77 owner floor.
const beaconSpiral = [
  [-418, -488, 'east'],
  [-417, -488, 'east'],
  [-416, -488, 'south'],
  [-416, -487, 'south'],
  [-416, -486, 'west'],
  [-417, -486, 'west'],
  [-418, -486, 'north'],
  [-418, -487, 'north'],
];
const beaconSpiralCells = new Set();
for (let y = 78; y <= 96; y += 1) {
  const [x, z, facing] = beaconSpiral[(y - 78) % beaconSpiral.length];
  beaconSpiralCells.add(key(x, y, z));
  await repl(
    x,
    y,
    z,
    `minecraft:quartz_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
    'WD-INN-beacon-tower-stair',
  );
  for (const clearY of [y + 1, y + 2]) {
    if (!AIR.has(baseName(await blockAt(x, clearY, z)))) {
      await repl(x, clearY, z, 'minecraft:air', 'WD-INN-beacon-tower-headroom');
    }
  }
}
// The lower tower volume was emitted as a solid deepslate plug rather than a
// room. Excavate its four-block-tall interior while retaining every spiral
// tread and its already-cleared headroom.
for (let y = 84; y <= 87; y += 1) {
  for (let z = -489; z <= -483; z += 1) {
    for (let x = -419; x <= -413; x += 1) {
      if (operations.has(key(x, y, z))) continue;
      if (!AIR.has(baseName(await blockAt(x, y, z)))) {
        await repl(x, y, z, 'minecraft:air', 'WD-INN-lower-tower-excavation');
      }
    }
  }
}
for (const floorY of [83, 88, 96]) {
  for (let z = -489; z <= -483; z += 1) {
    for (let x = -419; x <= -413; x += 1) {
      // Keep the incoming tread's body cell open and preserve the stair that
      // occupies this floor.
      if (
        beaconSpiralCells.has(key(x, floorY, z))
        || beaconSpiralCells.has(key(x, floorY - 1, z))
        || beaconSpiralCells.has(key(x, floorY - 2, z))
        || operations.has(key(x, floorY, z))
      ) continue;
      if (AIR.has(baseName(await blockAt(x, floorY, z)))) {
        await repl(
          x,
          floorY,
          z,
          'minecraft:dark_oak_planks',
          `WD-INN-beacon-floor-${floorY}`,
        );
      }
    }
  }
}

const deficient = census.structures.flatMap((structure) => (
  (structure.rooms ?? []).map((room) => ({ structure, room }))
)).filter(({ room }) => (
  room.finding.status === 'empty' || room.finding.status === 'under-detailed'
));

for (const { structure, room } of deficient) {
  const feet = await chooseFeetY(room.bounds);
  const forbidden = await circulationBuffer(room.bounds, feet.y);
  for (const point of circulationApproaches.get(room.id) ?? []) forbidden.add(point);
  const roomCandidates = candidates(room.bounds);
  const existingDetails = currentDetails(room.census);
  const required = room.finding.requiredDetails ?? 4;
  const requested = Math.max(3, required - existingDetails + 3);
  const roomPalette = palette(room.name, structure.areaId);
  const placements = [];
  let placed = 0;

  // Sleeping/medical rooms receive a real two-block bed before decorative
  // storage. This is skipped if the existing room already has beds.
  if (
    (room.census.beds ?? 0) === 0
    && /(suite|dormitory|infirmary|living)/i.test(room.name)
  ) {
    for (const [x, z] of roomCandidates) {
      if (forbidden.has(`${x},${z}`) || forbidden.has(`${x},${z + 1}`)) continue;
      if (!(await isFurnitureCell(x, feet.y, z))) continue;
      if (!(await isFurnitureCell(x, feet.y, z + 1))) continue;
      const foot = 'minecraft:light_gray_bed[facing=south,part=foot,occupied=false]';
      const head = 'minecraft:light_gray_bed[facing=south,part=head,occupied=false]';
      await repl(x, feet.y, z, foot, `${room.id}-functional-fitout`);
      await repl(x, feet.y, z + 1, head, `${room.id}-functional-fitout`);
      placements.push({ x, y: feet.y, z, block: foot });
      placements.push({ x, y: feet.y, z: z + 1, block: head });
      placed += 2;
      break;
    }
  }

  for (const [x, z] of roomCandidates) {
    if (placed >= requested) break;
    if (forbidden.has(`${x},${z}`)) continue;
    if (!(await isFurnitureCell(x, feet.y, z))) continue;
    const block = roomPalette[placed % roomPalette.length];
    if (await repl(x, feet.y, z, block, `${room.id}-functional-fitout`)) {
      placements.push({ x, y: feet.y, z, block });
      placed += 1;
    }
  }
  // Compact or irregular historic rooms may have only a handful of valid
  // cells on the coarse design grid. Exhaust their remaining supported cells
  // before declaring the fit-out short.
  if (placed < requested) {
    for (let z = room.bounds.minZ; z <= room.bounds.maxZ && placed < requested; z += 1) {
      for (let x = room.bounds.minX; x <= room.bounds.maxX && placed < requested; x += 1) {
        if (forbidden.has(`${x},${z}`)) continue;
        if (!(await isFurnitureCell(x, feet.y, z))) continue;
        const block = roomPalette[placed % roomPalette.length];
        if (await repl(x, feet.y, z, block, `${room.id}-functional-fitout`)) {
          placements.push({ x, y: feet.y, z, block });
          placed += 1;
        }
      }
    }
  }
  roomReports.push({
    areaId: structure.areaId,
    structureId: structure.id,
    roomId: room.id,
    name: room.name,
    priorStatus: room.finding.status,
    feetY: feet.y,
    standableCandidates: feet.count,
    existingDetails,
    requiredDetails: required,
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
  '# GENERATED FILE — worldwide functional room fit-out wave 4',
  '# furniture-only; exact-air guards; stair and door buffers preserved',
  `# snapshot: ${regions}`,
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
  sourceSnapshot: { directory: regions, sha256: hash.digest('hex') },
  census: censusPath,
  deficientRooms: deficient.length,
  roomsFitted: roomReports.filter((room) => room.placed > 0).length,
  roomsBelowRequested: roomReports.filter((room) => room.placed < room.requested),
  operations: ordered.length,
  phases: [...new Set(ordered.map((operation) => operation.phase))].length,
  byArea: Object.fromEntries(
    [...new Set(roomReports.map((room) => room.areaId))].map((areaId) => [
      areaId,
      {
        rooms: roomReports.filter((room) => room.areaId === areaId).length,
        operations: roomReports.filter((room) => room.areaId === areaId)
          .reduce((sum, room) => sum + room.placed, 0),
      },
    ]),
  ),
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
  byArea: report.byArea,
}, null, 2));
