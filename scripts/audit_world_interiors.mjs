#!/usr/bin/env node
/**
 * Read-only, snapshot-bound interior census for every structure in the active
 * review register. It never connects to Minecraft and never writes blocks.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createRequire } from 'module';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const require = createRequire(import.meta.url);
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const registerPath = value(
  '--register',
  'data/world-review/active-interior-register-2026-07-27.json',
);
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-interior-review-20260727/region',
);
const outputPath = value(
  '--out',
  'data/world-review/worldwide-interior-baseline-2026-07-27.json',
);
const dbPath = value('--db', 'data/world-map.db');

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const DETAIL_EXACT = new Set([
  'minecraft:chest',
  'minecraft:trapped_chest',
  'minecraft:barrel',
  'minecraft:bookshelf',
  'minecraft:chiseled_bookshelf',
  'minecraft:lectern',
  'minecraft:crafting_table',
  'minecraft:furnace',
  'minecraft:blast_furnace',
  'minecraft:smoker',
  'minecraft:stonecutter',
  'minecraft:smithing_table',
  'minecraft:cartography_table',
  'minecraft:fletching_table',
  'minecraft:loom',
  'minecraft:grindstone',
  'minecraft:brewing_stand',
  'minecraft:jukebox',
  'minecraft:note_block',
  'minecraft:anvil',
  'minecraft:chipped_anvil',
  'minecraft:damaged_anvil',
  'minecraft:flower_pot',
  'minecraft:decorated_pot',
  'minecraft:armor_stand',
  'minecraft:bell',
  'minecraft:cauldron',
]);
const DISPLAY_EXACT = new Set([
  'minecraft:netherite_block',
  'minecraft:diamond_block',
  'minecraft:emerald_block',
  'minecraft:gold_block',
  'minecraft:iron_block',
  'minecraft:copper_block',
  'minecraft:lapis_block',
  'minecraft:redstone_block',
  'minecraft:amethyst_block',
  'minecraft:raw_gold_block',
  'minecraft:raw_iron_block',
  'minecraft:raw_copper_block',
  'minecraft:ancient_debris',
  'minecraft:beacon',
  'minecraft:conduit',
  'minecraft:polished_blackstone',
  'minecraft:lightning_rod',
]);
const LIGHT_EXACT = new Set([
  'minecraft:lantern',
  'minecraft:soul_lantern',
  'minecraft:sea_lantern',
  'minecraft:glowstone',
  'minecraft:shroomlight',
  'minecraft:end_rod',
  'minecraft:ochre_froglight',
  'minecraft:verdant_froglight',
  'minecraft:pearlescent_froglight',
]);

function hashSnapshot(directory) {
  const hash = crypto.createHash('sha256');
  for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort()) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function normalizeBounds(bounds) {
  if (Array.isArray(bounds)) {
    const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
    return { minX, minY, minZ, maxX, maxY, maxZ };
  }
  return bounds;
}

function featureBounds(feature) {
  if (feature.geometry?.type !== 'bounds') return null;
  const geometry = feature.geometry;
  if (geometry.minY == null || geometry.maxY == null) return null;
  return normalizeBounds(geometry);
}

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

function estimatedFloorArea(bounds) {
  return Math.max(0, bounds.maxX - bounds.minX - 1)
    * Math.max(0, bounds.maxZ - bounds.minZ - 1);
}

function roomFinding(census, area, volume, scoringProfile = 'standard') {
  const details = (census.fixtures ?? 0)
    + (census.displays ?? 0)
    + (census.beds ?? 0)
    + (census.carpets ?? 0)
    + (census.banners ?? 0)
    + Math.floor((census.lights ?? 0) / 2);
  const density = area > 0 ? details / area : 0;
  if (scoringProfile === 'circulation-landing' && (census.stairs ?? 0) > 0) {
    return {
      status: 'fitted',
      detailDensity: density,
      requiredDetails: 0,
      scoringProfile,
    };
  }
  // Detail expectations scale with a room, but do not grow without bound for
  // stadium concourses, atria, and other deliberately open civic volumes.
  const requiredDetails = Math.min(16, Math.max(4, Math.ceil(area * 0.015)));
  if (volume < 8) return { status: 'too-small-to-score', detailDensity: density };
  if (details === 0) return { status: 'empty', detailDensity: density, requiredDetails };
  if (details < requiredDetails) {
    return { status: 'under-detailed', detailDensity: density, requiredDetails };
  }
  return { status: 'fitted', detailDensity: density, requiredDetails };
}

const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const snapshot = new AnvilSnapshot(regions);
const store = new WorldFeatureStore(dbPath);
let databaseFeatures;
try {
  databaseFeatures = store.listFeatures({ limit: 1_000 });
} finally {
  store.close();
}

const structures = [];
for (const area of register.areas) {
  for (const structure of area.structures ?? []) {
    const databaseFeature = databaseFeatures.find((feature) => (
      feature.projectId === area.id
      && feature.kind === 'building'
      && feature.externalId === structure.id
    ));
    structures.push({
      areaId: area.id,
      projectId: area.id,
      ...structure,
      featureId: databaseFeature?.id,
      bounds: normalizeBounds(structure.bounds),
      source: databaseFeature ? dbPath : registerPath,
    });
  }
}
for (const feature of databaseFeatures.filter((item) => (
  item.projectId === 'mainstreet-america' && item.kind === 'building'
))) {
  const bounds = featureBounds(feature);
  if (!bounds) continue;
  structures.push({
    areaId: 'mainstreet-america',
    projectId: feature.projectId,
    id: feature.externalId ?? feature.id,
    featureId: feature.id,
    name: feature.name,
    bounds,
    floors: feature.attributes?.floorsY
      ?? feature.attributes?.floors_y
      ?? feature.attributes?.floorYs
      ?? [],
    source: 'data/world-map.db',
  });
}

const roomsByParent = new Map();
for (const room of databaseFeatures.filter((item) => item.kind === 'room')) {
  if (!room.parentId) continue;
  if (!roomsByParent.has(room.parentId)) roomsByParent.set(room.parentId, []);
  roomsByParent.get(room.parentId).push(room);
}
// MainStreet's original building imports predate the `floorsY` attribute. Its
// child room volumes are authoritative and already carry one interior Y band
// per occupied level, so derive the building's review floors from those bands.
for (const structure of structures) {
  if (!structure.featureId || (structure.floors?.length ?? 0) > 0) continue;
  const roomFloors = (roomsByParent.get(structure.featureId) ?? [])
    .map((room) => featureBounds(room)?.minY)
    .filter((floorY) => floorY != null);
  structure.floors = [...new Set(roomFloors)].sort((a, b) => a - b);
}

const results = [];
const missingColumns = new Set();
for (const structure of structures) {
  const { bounds } = structure;
  const census = {};
  const byY = {};
  let cells = 0;
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const column = await snapshot.readColumn(x, z, bounds.minY, bounds.maxY);
      if (!column) {
        missingColumns.add(`${x},${z}`);
        continue;
      }
      for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
        const block = column.get(y);
        const group = category(block);
        census[group] = (census[group] ?? 0) + 1;
        byY[y] ??= {};
        byY[y][group] = (byY[y][group] ?? 0) + 1;
        cells += 1;
      }
    }
  }
  const floorArea = estimatedFloorArea(bounds);
  const authoredFloors = structure.floors ?? [];
  const occupiedFloorFindings = authoredFloors.map((floorY) => {
    const circulation = {};
    for (let y = floorY; y <= Math.min(bounds.maxY, floorY + 5); y += 1) {
      const slice = byY[y] ?? {};
      for (const group of ['stairs', 'ladders', 'doors', 'trapdoors']) {
        circulation[group] = (circulation[group] ?? 0) + (slice[group] ?? 0);
      }
    }
    return { floorY, circulation };
  });
  const featureRooms = structure.featureId
    ? (roomsByParent.get(structure.featureId) ?? [])
    : [];
  const roomResults = [];
  for (const room of featureRooms) {
    const roomBounds = featureBounds(room);
    if (!roomBounds) continue;
    const roomCensus = {};
    let volume = 0;
    for (let z = roomBounds.minZ; z <= roomBounds.maxZ; z += 1) {
      for (let x = roomBounds.minX; x <= roomBounds.maxX; x += 1) {
        const column = await snapshot.readColumn(
          x,
          z,
          roomBounds.minY,
          roomBounds.maxY,
        );
        if (!column) continue;
        for (let y = roomBounds.minY; y <= roomBounds.maxY; y += 1) {
          const group = category(column.get(y));
          roomCensus[group] = (roomCensus[group] ?? 0) + 1;
          volume += 1;
        }
      }
    }
    const area = (roomBounds.maxX - roomBounds.minX + 1)
      * (roomBounds.maxZ - roomBounds.minZ + 1);
    roomResults.push({
      id: room.externalId ?? room.id,
      featureId: room.id,
      name: room.name,
      bounds: roomBounds,
      census: roomCensus,
      finding: roomFinding(
        roomCensus,
        area,
        volume,
        room.attributes?.scoringProfile,
      ),
    });
  }
  const findings = [];
  if ((census.caveAir ?? 0) > 0) findings.push('natural cave_air occurs inside review bounds');
  if ((census.ladders ?? 0) > 0) findings.push('ladder circulation present');
  if (authoredFloors.length > 1 && (census.stairs ?? 0) === 0) {
    findings.push('multi-floor structure has zero stair blocks');
  }
  const emptyRooms = roomResults.filter((room) => room.finding.status === 'empty').length;
  const underDetailedRooms = roomResults.filter(
    (room) => room.finding.status === 'under-detailed',
  ).length;
  if (emptyRooms) findings.push(`${emptyRooms} cataloged rooms are empty`);
  if (underDetailedRooms) findings.push(`${underDetailedRooms} cataloged rooms are under-detailed`);
  results.push({
    areaId: structure.areaId,
    id: structure.id,
    featureId: structure.featureId ?? null,
    name: structure.name,
    bounds,
    floors: authoredFloors,
    cellsRead: cells,
    floorArea,
    census,
    floorCirculation: occupiedFloorFindings,
    rooms: roomResults,
    findings,
  });
}

const byArea = {};
for (const area of register.areas) {
  const areaResults = results.filter((result) => result.areaId === area.id);
  const roomResults = areaResults.flatMap((result) => result.rooms);
  byArea[area.id] = {
    name: area.name,
    structures: areaResults.length,
    multiFloorStructures: areaResults.filter((result) => result.floors.length > 1).length,
    structuresWithLadders: areaResults.filter((result) => (result.census.ladders ?? 0) > 0).length,
    multiFloorWithoutStairs: areaResults.filter(
      (result) => result.floors.length > 1 && (result.census.stairs ?? 0) === 0,
    ).length,
    caveAirStructures: areaResults.filter((result) => (result.census.caveAir ?? 0) > 0).length,
    catalogedRooms: roomResults.length,
    emptyRooms: roomResults.filter((room) => room.finding.status === 'empty').length,
    underDetailedRooms: roomResults.filter(
      (room) => room.finding.status === 'under-detailed',
    ).length,
  };
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  readOnly: true,
  register: registerPath,
  snapshot: {
    directory: regions,
    sha256: hashSnapshot(regions),
    regionFiles: fs.readdirSync(regions).filter((name) => name.endsWith('.mca')).length,
  },
  missingColumns: [...missingColumns].sort(),
  totals: {
    areas: register.areas.length,
    structures: results.length,
    multiFloorStructures: results.filter((result) => result.floors.length > 1).length,
    structuresWithLadders: results.filter((result) => (result.census.ladders ?? 0) > 0).length,
    multiFloorWithoutStairs: results.filter(
      (result) => result.floors.length > 1 && (result.census.stairs ?? 0) === 0,
    ).length,
    catalogedRooms: results.flatMap((result) => result.rooms).length,
    emptyRooms: results.flatMap((result) => result.rooms)
      .filter((room) => room.finding.status === 'empty').length,
    underDetailedRooms: results.flatMap((result) => result.rooms)
      .filter((room) => room.finding.status === 'under-detailed').length,
  },
  byArea,
  structures: results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: outputPath,
  snapshot: report.snapshot,
  missingColumns: report.missingColumns.length,
  totals: report.totals,
  byArea: report.byArea,
}, null, 2));
