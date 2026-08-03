#!/usr/bin/env node
/**
 * Offline exact-state compiler for the five Manager Vale role cottages.
 *
 * This module reads one immutable Anvil snapshot and the reviewed coordinate
 * schedule. It never connects to Minecraft, never mutates a world, and never
 * retires a source cottage. Source block entities are copied only after the new
 * structures are commissioned; source retirement is deliberately a separate
 * future transaction.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import nbt from 'prismarine-nbt';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { completeBlockState } from './lib/complete_block_state.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SCHEDULE = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'worker-town-all-role-cottages-mini-mansion-coordinate-schedule.json',
);
const DEFAULT_REGIONS = path.join(
  ROOT,
  'data/worldsnap-town-expansion-prerelease-20260728T0930Z/region',
);
const DEFAULT_OUT_BASE = path.join(
  ROOT,
  'data/buildops/manager-vale-five-cottages-2026-07-28',
);
const DEFAULT_HANDOFF = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'manager-vale-five-cottage-integration-handoff.json',
);
const EXPECTED_SNAPSHOT_HASH =
  'f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e';

const COTTAGE_PREFIX = Object.freeze({
  'RRCH-ARCHITECT': 'ARC',
  'RRCH-MASON': 'MAS',
  'RRCH-SURVEYOR': 'SUR',
  'RRCH-STEWARD': 'STW',
  'RRCH-SCOUT': 'SCO',
});

const EXPECTED_GARAGE_CAPACITY = Object.freeze({
  'RRCH-ARCHITECT': 6,
  'RRCH-STEWARD': 6,
  'RRCH-MASON': 4,
  'RRCH-SURVEYOR': 4,
  'RRCH-SCOUT': 4,
});

const MIGRATION_TRANSLATIONS = Object.freeze({
  'RRCH-ARCHITECT': [-15, 2, 76],
  'RRCH-MASON': [-68, -3, 190],
  'RRCH-SURVEYOR': [-36, -3, 151],
  'RRCH-STEWARD': [41, 2, 43],
  'RRCH-SCOUT': [-15, -3, 94],
});

const FURNISHING_BLOCKS = Object.freeze({
  householdBeds: 'minecraft:red_wool',
  privateSuiteBeds: 'minecraft:crimson_hyphae[axis=y]',
  seats: 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
  workstations: 'minecraft:polished_andesite',
  tables: 'minecraft:dark_oak_slab[type=top,waterlogged=false]',
  storageUnits: 'minecraft:bookshelf',
  washFixtures: 'minecraft:smooth_quartz',
  hearthAndCookingFixtures: 'minecraft:bricks',
  lightingGroups: 'minecraft:sea_lantern',
  privateThemedSilhouettes: 'minecraft:crimson_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]',
});

const PRIVATE_SUITE_THEMES = Object.freeze({
  'RRCH-ARCHITECT': {
    id: 'art-deco-observation-suite',
    palette: ['polished_blackstone', 'quartz', 'copper', 'cyan_glass'],
    accentBlock: 'minecraft:oxidized_cut_copper',
  },
  'RRCH-MASON': {
    id: 'blackened-steel-studio',
    palette: ['polished_blackstone', 'iron', 'gray_wool', 'crimson'],
    accentBlock: 'minecraft:polished_blackstone',
  },
  'RRCH-SURVEYOR': {
    id: 'spa-suite',
    palette: ['calcite', 'quartz', 'pale_wood', 'copper'],
    accentBlock: 'minecraft:calcite',
  },
  'RRCH-STEWARD': {
    id: 'gothic-library-salon',
    palette: ['deepslate_tile', 'dark_oak', 'red_carpet', 'warm_lantern'],
    accentBlock: 'minecraft:deepslate_tiles',
  },
  'RRCH-SCOUT': {
    id: 'red-velvet-salon',
    palette: ['crimson_wool', 'dark_oak', 'blackstone', 'warm_lantern'],
    accentBlock: 'minecraft:crimson_planks',
  },
});

const PRIVATE_FIXTURE_TYPES = Object.freeze([
  'VESTIBULE',
  'CANOPY-BED',
  'CHAISE',
  'RATED-SUSPENDED-LOUNGE',
  'CLOSED-TOY-STORAGE',
  'DRESSING-VANITY',
  'WASH',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function normalizeBox(raw) {
  const [x1, y1, z1, x2, y2, z2] = raw.map(Number);
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.min(z1, z2),
    Math.max(x1, x2),
    Math.max(y1, y2),
    Math.max(z1, z2),
  ];
}

function boxContains(raw, point) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
  return point[0] >= x1 && point[0] <= x2
    && point[1] >= y1 && point[1] <= y2
    && point[2] >= z1 && point[2] <= z2;
}

function boxesIntersect(left, right) {
  const a = normalizeBox(left);
  const b = normalizeBox(right);
  return a[0] <= b[3] && a[3] >= b[0]
    && a[1] <= b[4] && a[4] >= b[1]
    && a[2] <= b[5] && a[5] >= b[2];
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function baseName(state) {
  return String(state).split('[', 1)[0];
}

function isFluid(state) {
  return ['minecraft:water', 'minecraft:bubble_column', 'minecraft:lava']
    .includes(baseName(state));
}

function stable(value) {
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function typedNbtHash(rawCompound) {
  return sha256(JSON.stringify(stable(rawCompound)));
}

function longToString(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) {
    return ((BigInt(value[0] | 0) << 32n) | BigInt(value[1] >>> 0)).toString();
  }
  if (value && typeof value === 'object' && 'high' in value && 'low' in value) {
    return ((BigInt(value.high | 0) << 32n) | BigInt(value.low >>> 0)).toString();
  }
  return String(value);
}

function quoteKey(value) {
  return /^[A-Za-z0-9._+-]+$/.test(value) ? value : JSON.stringify(value);
}

function snbtScalar(type, value) {
  if (type === 'byte') return `${Number(value)}b`;
  if (type === 'short') return `${Number(value)}s`;
  if (type === 'int') return `${Number(value)}`;
  if (type === 'long') return `${longToString(value)}L`;
  if (type === 'float') return `${Number(value)}f`;
  if (type === 'double') return `${Number(value)}d`;
  if (type === 'string') return JSON.stringify(String(value));
  throw new Error(`unsupported scalar NBT type ${type}`);
}

function snbt(tag) {
  if (!tag || typeof tag !== 'object' || typeof tag.type !== 'string') {
    throw new Error('invalid typed NBT tag');
  }
  if (['byte', 'short', 'int', 'long', 'float', 'double', 'string'].includes(tag.type)) {
    return snbtScalar(tag.type, tag.value);
  }
  if (tag.type === 'compound') {
    return `{${Object.keys(tag.value ?? {}).sort().map((key) => (
      `${quoteKey(key)}:${snbt(tag.value[key])}`
    )).join(',')}}`;
  }
  if (tag.type === 'list') {
    const subtype = tag.value?.type;
    return `[${(tag.value?.value ?? []).map(
      (value) => snbt({ type: subtype, value }),
    ).join(',')}]`;
  }
  if (tag.type === 'byteArray') {
    return `[B;${(tag.value ?? []).map((value) => `${Number(value)}b`).join(',')}]`;
  }
  if (tag.type === 'intArray') {
    return `[I;${(tag.value ?? []).map((value) => Number(value)).join(',')}]`;
  }
  if (tag.type === 'longArray') {
    return `[L;${(tag.value ?? []).map(
      (value) => `${longToString(value)}L`,
    ).join(',')}]`;
  }
  throw new Error(`unsupported NBT type ${tag.type}`);
}

function decompressed(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

async function readRawChunkBlockEntities(regionDir, cx, cz) {
  const rx = Math.floor(cx / 32);
  const rz = Math.floor(cz / 32);
  const filename = path.join(regionDir, `r.${rx}.${rz}.mca`);
  if (!fs.existsSync(filename)) return [];
  const buffer = fs.readFileSync(filename);
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  const sectorOffset = buffer.readUIntBE(index, 3);
  const sectorCount = buffer[index + 3];
  if (sectorOffset === 0 || sectorCount === 0) return [];
  const offset = sectorOffset * 4096;
  const size = buffer.readUInt32BE(offset);
  const compression = buffer.readUInt8(offset + 4);
  if ((compression & 0x80) !== 0) {
    throw new Error(`external chunk storage unsupported at ${cx},${cz}`);
  }
  const bytes = decompressed(
    compression,
    buffer.subarray(offset + 5, offset + 4 + size),
  );
  const { parsed } = await nbt.parse(bytes);
  return parsed.value.block_entities?.value?.value ?? [];
}

async function rawBlockEntitiesAtPoints(regionDir, points) {
  const wanted = new Set(points.map((point) => point.join(',')));
  const chunks = new Set(
    points.map(([x, , z]) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`),
  );
  const output = new Map();
  for (const chunkKey of chunks) {
    const [cx, cz] = chunkKey.split(',').map(Number);
    for (const entity of await readRawChunkBlockEntities(regionDir, cx, cz)) {
      const point = [
        Number(entity.x?.value),
        Number(entity.y?.value),
        Number(entity.z?.value),
      ];
      if (wanted.has(point.join(','))) output.set(point.join(','), entity);
    }
  }
  return output;
}

function rawCompound(rawEntity) {
  return { type: 'compound', value: rawEntity };
}

function rawPayload(rawEntity) {
  const value = structuredClone(rawEntity);
  delete value.x;
  delete value.y;
  delete value.z;
  delete value.id;
  return { type: 'compound', value };
}

function rawAtDestination(rawEntity, destination) {
  const value = structuredClone(rawEntity);
  value.x = { type: 'int', value: destination[0] };
  value.y = { type: 'int', value: destination[1] };
  value.z = { type: 'int', value: destination[2] };
  return { type: 'compound', value };
}

function simplifiedEntityPoint(entity) {
  return [Number(entity.x), Number(entity.y), Number(entity.z)];
}

function inventoryLedger(entity) {
  const items = Array.isArray(entity.Items) ? entity.Items : [];
  return {
    slots: items.map((item) => ({
      slot: Number(item.Slot ?? item.slot ?? -1),
      id: String(item.id ?? item.Id ?? 'minecraft:air'),
      count: Number(item.count ?? item.Count ?? 0),
      components: item.components ?? {},
    })),
    stackCount: items.length,
    itemCount: items.reduce(
      (sum, item) => sum + Number(item.count ?? item.Count ?? 0),
      0,
    ),
  };
}

class DesiredModel {
  constructor() {
    this.cells = new Map();
    this.overrides = [];
  }

  set(x, y, z, state, meta = {}) {
    const pointKey = key3(x, y, z);
    const completedState = completeBlockState(state);
    const prior = this.cells.get(pointKey);
    if (prior && prior.state !== completedState) {
      this.overrides.push({
        point: [x, y, z],
        from: prior.state,
        to: completedState,
        fromScope: prior.meta.scope,
        toScope: meta.scope,
      });
    }
    this.cells.set(pointKey, {
      point: [x, y, z],
      state: completedState,
      meta,
    });
  }

  box(raw, state, meta = {}) {
    const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
    for (let x = x1; x <= x2; x += 1) {
      for (let y = y1; y <= y2; y += 1) {
        for (let z = z1; z <= z2; z += 1) this.set(x, y, z, state, meta);
      }
    }
  }
}

function cottageOwner(scope) {
  return Object.keys(COTTAGE_PREFIX).find((id) => scope?.startsWith(id)) ?? null;
}

function modelOverrideAudit(overrides) {
  const entries = overrides.map((override) => {
    const fromCottage = cottageOwner(override.fromScope);
    const toCottage = cottageOwner(override.toScope);
    const sameCottage = fromCottage && fromCottage === toCottage;
    const plannedRoadApronInterface = (
      Boolean(fromCottage) !== Boolean(toCottage)
      && (
        override.fromScope?.includes(':GARAGE-TURNING')
        || override.toScope?.includes(':GARAGE-TURNING')
      )
    );
    const classification = sameCottage
      ? 'planned-same-cottage-model-layer'
      : plannedRoadApronInterface
        ? 'planned-road-garage-interface'
        : fromCottage && toCottage
          ? 'unreviewed-cross-cottage'
          : 'unreviewed-cross-scope';
    return { ...override, classification };
  });
  const byClassification = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.classification))]
      .sort()
      .map((classification) => [
        classification,
        entries.filter((entry) => entry.classification === classification).length,
      ]),
  );
  const unreviewed = entries.filter(
    (entry) => entry.classification.startsWith('unreviewed-'),
  );
  return {
    eventCount: entries.length,
    byClassification,
    unreviewedCrossScopeOverrides: unreviewed.length,
    unreviewedExamples: unreviewed.slice(0, 25),
  };
}

function interpolateProfile(nodes, axisValue, axisIndex) {
  const sorted = [...nodes].sort((a, b) => a[axisIndex] - b[axisIndex]);
  if (axisValue <= sorted[0][axisIndex]) return sorted[0][1];
  if (axisValue >= sorted.at(-1)[axisIndex]) return sorted.at(-1)[1];
  const left = sorted.findLast((node) => node[axisIndex] <= axisValue);
  const right = sorted.find((node) => node[axisIndex] >= axisValue);
  if (!left || !right || left[axisIndex] === right[axisIndex]) return left?.[1] ?? right[1];
  const ratio = (axisValue - left[axisIndex]) / (right[axisIndex] - left[axisIndex]);
  return Math.round(left[1] + (right[1] - left[1]) * ratio);
}

async function naturalSurface(snapshot, x, z) {
  const chunk = await snapshot.readChunk(Math.floor(x / 16), Math.floor(z / 16));
  for (let y = 120; y >= -64; y -= 1) {
    const state = snapshot.blockState(chunk, x, y, z) ?? 'minecraft:air';
    const name = baseName(state);
    if (
      name !== 'minecraft:air'
      && name !== 'minecraft:cave_air'
      && name !== 'minecraft:void_air'
      && !name.endsWith('_leaves')
      && !name.endsWith('_log')
      && !name.endsWith('_wood')
      && ![
        'minecraft:grass',
        'minecraft:short_grass',
        'minecraft:tall_grass',
        'minecraft:fern',
        'minecraft:large_fern',
        'minecraft:snow',
      ].includes(name)
    ) return { y, state };
  }
  return { y: -64, state: 'minecraft:bedrock' };
}

async function paveRectangle(model, snapshot, raw, targetY, scope) {
  const [x1, , z1, x2, , z2] = normalizeBox(raw);
  for (let x = x1; x <= x2; x += 1) {
    for (let z = z1; z <= z2; z += 1) {
      const surface = await naturalSurface(snapshot, x, z);
      for (let y = Math.min(surface.y + 1, targetY); y < targetY; y += 1) {
        model.set(x, y, z, 'minecraft:stone_bricks', {
          scope,
          role: 'terrain-supported-road-foundation',
        });
      }
      for (let y = targetY + 1; y <= Math.max(surface.y, targetY + 3); y += 1) {
        model.set(x, y, z, 'minecraft:air', {
          scope,
          role: 'vehicle-headroom',
        });
      }
      model.set(
        x,
        targetY,
        z,
        (x + z) % 5 === 0
          ? 'minecraft:polished_andesite'
          : 'minecraft:stone_bricks',
        { scope, role: 'carriageway' },
      );
    }
  }
}

async function buildRoadNetwork(model, snapshot, schedule) {
  const network = schedule.districtRules.managerValeVehicleNetwork;
  const upper = normalizeBox(network.upperStreet.bounds);
  for (let x = upper[0]; x <= upper[3]; x += 1) {
    const y = interpolateProfile(network.upperStreet.centerline, x, 0);
    await paveRectangle(
      model,
      snapshot,
      [x, y, upper[2], x, y, upper[5]],
      y,
      network.upperStreet.id,
    );
  }
  const connector = normalizeBox(network.eastConnector.bounds);
  for (let z = connector[2]; z <= connector[5]; z += 1) {
    const y = interpolateProfile(network.eastConnector.centerline, z, 2);
    await paveRectangle(
      model,
      snapshot,
      [connector[0], y, z, connector[3], y, z],
      y,
      network.eastConnector.id,
    );
  }
  const extension = normalizeBox(network.r07WestExtension.bounds);
  await paveRectangle(
    model,
    snapshot,
    extension,
    network.r07WestExtension.centerline[0][1],
    network.r07WestExtension.id,
  );
  return [
    network.upperStreet,
    network.eastConnector,
    network.r07WestExtension,
  ];
}

function houseComponents(cottage) {
  return [
    cottage.site.houseWing,
    cottage.site.houseNorthWing,
    cottage.site.houseEastWing,
  ].filter(Boolean).map(normalizeBox);
}

function perimeter(x, z, box) {
  return x === box[0] || x === box[3] || z === box[2] || z === box[5];
}

function buildHouseComponent(model, cottage, raw, componentIndex) {
  const box = normalizeBox(raw);
  const [groundY, upperY] = cottage.site.floorSupportsY;
  const scope = `${cottage.id}:HOUSE:${componentIndex + 1}`;
  const roofBase = Math.min(cottage.site.buildingShell[4] - 3, upperY + 7);
  model.box([box[0], groundY + 1, box[2], box[3], roofBase + 3, box[5]], 'minecraft:air', {
    scope,
    role: 'commissioned-interior-clearance',
  });
  model.box([box[0], groundY, box[2], box[3], groundY, box[5]], 'minecraft:stone_bricks', {
    scope,
    role: 'stepped-plinth-and-ground-floor',
  });
  model.box([box[0], upperY, box[2], box[3], upperY, box[5]], 'minecraft:dark_oak_planks', {
    scope,
    role: 'upper-floor',
  });
  for (let x = box[0]; x <= box[3]; x += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      if (!perimeter(x, z, box)) continue;
      for (let y = groundY + 1; y < roofBase; y += 1) {
        const structural = (
          (x === box[0] || x === box[3]) && (z - box[2]) % 5 === 0
        ) || (
          (z === box[2] || z === box[5]) && (x - box[0]) % 5 === 0
        );
        model.set(
          x,
          y,
          z,
          structural
            ? 'minecraft:stripped_dark_oak_log[axis=y]'
            : 'minecraft:calcite',
          { scope, role: structural ? 'timber-frame' : 'plaster-wall' },
        );
      }
    }
  }
  for (let y = roofBase; y <= roofBase + 2; y += 1) {
    const inset = y - roofBase;
    const roof = [
      box[0] + inset,
      y,
      box[2] + inset,
      box[3] - inset,
      y,
      box[5] - inset,
    ];
    if (roof[0] <= roof[3] && roof[2] <= roof[5]) {
      model.box(
        roof,
        'minecraft:deepslate_tile_slab[type=top,waterlogged=false]',
        { scope, role: 'stepped-deepslate-roof' },
      );
    }
  }
  for (let x = box[0] + 4; x < box[3]; x += 6) {
    for (const y of [groundY + 3, upperY + 3]) {
      if (y >= roofBase) continue;
      model.set(x, y, box[2], 'minecraft:glass_pane', {
        scope,
        role: 'north-window',
      });
      model.set(x, y, box[5], 'minecraft:glass_pane', {
        scope,
        role: 'south-window',
      });
    }
  }
}

function doorFacing(cottage) {
  const shell = normalizeBox(cottage.site.buildingShell);
  const [x, , z] = cottage.circulation.publicEntry;
  if (z === shell[2]) return 'north';
  if (z === shell[5]) return 'south';
  if (x === shell[0]) return 'west';
  return 'east';
}

function buildPublicEntry(model, cottage) {
  const [x, y, z] = cottage.circulation.publicEntry;
  const facing = doorFacing(cottage);
  const scope = `${cottage.id}:PUBLIC-ENTRY`;
  model.set(
    x,
    y,
    z,
    `minecraft:dark_oak_door[facing=${facing},half=lower,hinge=left,open=false,powered=false]`,
    { scope, role: 'normal-pedestrian-entry' },
  );
  model.set(
    x,
    y + 1,
    z,
    `minecraft:dark_oak_door[facing=${facing},half=upper,hinge=left,open=false,powered=false]`,
    { scope, role: 'normal-pedestrian-entry' },
  );
}

function buildStair(model, cottage, raw, kind) {
  const box = normalizeBox(raw);
  const [groundY, upperY] = cottage.site.floorSupportsY;
  const rise = upperY - groundY;
  const xSpan = box[3] - box[0] + 1;
  const zSpan = box[5] - box[2] + 1;
  const alongZ = zSpan >= rise && xSpan >= 2;
  const alongX = xSpan >= rise && zSpan >= 2;
  if (!alongZ && !alongX) {
    throw new Error(
      `${cottage.id} ${kind} stair lacks a straight ${rise}-tread, two-wide run`,
    );
  }
  const widthStart = alongZ
    ? Math.floor((box[0] + box[3] - 1) / 2)
    : Math.floor((box[2] + box[5] - 1) / 2);
  const treads = [];
  for (let index = 0; index < rise; index += 1) {
    const run = alongZ ? box[2] + index : box[0] + index;
    const y = groundY + index;
    for (let lane = 0; lane < 2; lane += 1) {
      const x = alongZ ? widthStart + lane : run;
      const z = alongZ ? run : widthStart + lane;
      model.set(
        x,
        y,
        z,
        `minecraft:stone_brick_stairs[facing=${alongZ ? 'south' : 'east'},half=bottom,shape=straight,waterlogged=false]`,
        {
          scope: `${cottage.id}:${kind}`,
          role: `walkable-stair-tread:lane-${lane + 1}`,
        },
      );
      model.set(x, y + 1, z, 'minecraft:air', {
        scope: `${cottage.id}:${kind}`,
        role: 'stair-headroom',
      });
      model.set(x, y + 2, z, 'minecraft:air', {
        scope: `${cottage.id}:${kind}`,
        role: 'stair-headroom',
      });
      treads.push([x, y, z]);
    }
  }
  const landingLights = [
    { point: treads[0], role: 'lower-landing-light' },
    { point: treads.at(-2), role: 'upper-landing-light' },
  ];
  for (const { point, role } of landingLights) {
    const [x, y, z] = point;
    const sideOffset = alongZ ? [-1, 0] : [0, -1];
    model.set(
      x + sideOffset[0],
      y + 1,
      z + sideOffset[1],
      'minecraft:lantern[hanging=false]',
      {
        scope: `${cottage.id}:${kind}`,
        role,
      },
    );
  }
  return {
    cottageId: cottage.id,
    kind,
    bounds: box,
    clearWidth: 2,
    treadCount: rise,
    changedElevationPerTread: 1,
    headroomBlocks: 2,
    lowerLandingAtFloor: groundY,
    upperLandingAtFloor: upperY,
    bidirectionalNormalWalkRequired: true,
  };
}

function buildGarage(model, cottage) {
  const garage = cottage.site.attachedGarage;
  const box = normalizeBox(garage.bounds);
  const scope = `${cottage.id}:GARAGE`;
  model.box([box[0], box[1] + 1, box[2], box[3], box[4], box[5]], 'minecraft:air', {
    scope,
    role: 'garage-clearance',
  });
  model.box([box[0], box[1], box[2], box[3], box[1], box[5]], 'minecraft:polished_andesite', {
    scope,
    role: 'garage-floor',
  });
  for (let x = box[0]; x <= box[3]; x += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      if (!perimeter(x, z, box)) continue;
      for (let y = box[1] + 1; y <= box[4]; y += 1) {
        model.set(x, y, z, 'minecraft:stone_bricks', {
          scope,
          role: 'garage-wall',
        });
      }
    }
  }
  model.box([box[0], box[4], box[2], box[3], box[4], box[5]], 'minecraft:deepslate_tiles', {
    scope,
    role: 'garage-roof',
  });
  for (const opening of garage.doorOpenings) {
    model.box(opening, 'minecraft:air', { scope, role: 'vehicle-door-opening' });
  }
  for (const bay of garage.bays) {
    const b = normalizeBox(bay.bounds);
    if (garage.doorFace === 'east' || garage.doorFace === 'west') {
      model.box(
        [b[0], box[1], b[2], b[3], box[1], b[2]],
        'minecraft:yellow_concrete',
        { scope, role: `bay-stripe:${bay.id}` },
      );
    } else {
      model.box(
        [b[0], box[1], b[2], b[0], box[1], b[5]],
        'minecraft:yellow_concrete',
        { scope, role: `bay-stripe:${bay.id}` },
      );
    }
  }
  const [dx, dy, dz] = garage.houseAccessDoor;
  model.set(
    dx,
    dy,
    dz,
    'minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]',
    { scope, role: 'garage-house-fire-lobby-door' },
  );
  model.set(
    dx,
    dy + 1,
    dz,
    'minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]',
    { scope, role: 'garage-house-fire-lobby-door' },
  );
}

async function buildGarageApron(model, snapshot, cottage) {
  const garage = cottage.site.attachedGarage;
  const y = garage.bounds[1];
  await paveRectangle(
    model,
    snapshot,
    garage.turningEnvelope,
    y,
    `${cottage.id}:GARAGE-TURNING`,
  );
}

function roomForPoint(cottage, point) {
  return cottage.rooms.find((room) => boxContains(room.bounds, point)) ?? null;
}

function furnishingRooms(cottage, category) {
  const tests = {
    householdBeds: /PRIMARY|GUEST/,
    privateSuiteBeds: /RED-SUITE/,
    privateThemedSilhouettes: /RED-SUITE/,
    workstations: /OFFICE|STUDIO|LIBRARY|WORKSHOP|GEAR/,
    hearthAndCookingFixtures: /KITCHEN|GREAT/,
    washFixtures: /PRIMARY|RED-SUITE/,
  };
  const matcher = tests[category];
  const preferred = matcher
    ? cottage.rooms.filter((room) => matcher.test(room.id))
    : cottage.rooms;
  return preferred.length ? preferred : cottage.rooms;
}

function roomCandidatePoints(room, category) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(room.bounds);
  const points = [];
  const y = category === 'lightingGroups' ? y2 : y1 + 1;
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) points.push([x, y, z]);
  }
  return points;
}

function privateFixtureType(fixtureId) {
  return PRIVATE_FIXTURE_TYPES.find((type) => fixtureId.endsWith(type)) ?? null;
}

function privateFixtureAnchor(fixture) {
  if (fixture.anchor) return fixture.anchor.map(Number);
  const [x1, y1, z1, x2, , z2] = normalizeBox(fixture.bounds);
  return [
    Math.floor((x1 + x2) / 2),
    y1 + 1,
    Math.floor((z1 + z2) / 2),
  ];
}

function privateFixtureState(cottage, fixtureType) {
  const theme = PRIVATE_SUITE_THEMES[cottage.id];
  const fixed = {
    VESTIBULE:
      'minecraft:crimson_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]',
    'CANOPY-BED': 'minecraft:red_wool',
    CHAISE:
      'minecraft:crimson_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]',
    'RATED-SUSPENDED-LOUNGE':
      'minecraft:iron_chain[axis=y,waterlogged=false]',
    'CLOSED-TOY-STORAGE':
      'minecraft:crimson_trapdoor[facing=south,half=bottom,open=false,powered=false,waterlogged=false]',
    'DRESSING-VANITY':
      'minecraft:polished_blackstone_slab[type=top,waterlogged=false]',
    WASH: 'minecraft:smooth_quartz',
  };
  return fixtureType === 'DRESSING-VANITY'
    ? theme.accentBlock
    : fixed[fixtureType];
}

function compilePrivateSuiteFixtures(model, cottage, occupied) {
  const room = cottage.rooms.find((candidate) => /RED-SUITE/.test(candidate.id));
  const theme = PRIVATE_SUITE_THEMES[cottage.id];
  if (!room || !theme) {
    throw new Error(`${cottage.id} lacks private-suite room or theme`);
  }
  const fixtures = cottage.privateSuiteFixtures ?? [];
  const entries = fixtures.map((fixture) => {
    const fixtureType = privateFixtureType(fixture.id);
    if (!fixtureType) throw new Error(`unknown private fixture ${fixture.id}`);
    const anchor = privateFixtureAnchor(fixture);
    if (!boxContains(room.bounds, anchor)) {
      throw new Error(`${fixture.id} anchor ${anchor} lies outside ${room.id}`);
    }
    const pointKey = anchor.join(',');
    if (occupied.has(pointKey)) {
      throw new Error(`${fixture.id} conflicts with reserved point ${pointKey}`);
    }
    occupied.add(pointKey);
    const blockState = privateFixtureState(cottage, fixtureType);
    model.set(...anchor, blockState, {
      scope: `${cottage.id}:PRIVATE-SUITE`,
      role: `private-suite-fixture:${fixtureType}`,
    });
    return {
      id: fixture.id,
      cottageId: cottage.id,
      roomId: room.id,
      fixtureType,
      anchor,
      scheduledBounds: fixture.bounds ?? null,
      themeId: theme.id,
      palette: theme.palette,
      blockState,
      structuralStatus: fixture.structuralStatus ?? null,
      contentBoundary:
        'architecture and furniture only; no figures, anatomy, explicit imagery or depicted acts',
    };
  });
  const observedTypes = new Set(entries.map((entry) => entry.fixtureType));
  if (
    entries.length !== 7
    || PRIVATE_FIXTURE_TYPES.some((type) => !observedTypes.has(type))
  ) {
    throw new Error(`${cottage.id} private suite does not contain all seven fixtures`);
  }
  return entries;
}

function furnishCottage(model, cottage, reservedPoints) {
  const occupied = new Set(reservedPoints);
  const entries = [];
  const privateSuiteFixtures = compilePrivateSuiteFixtures(
    model,
    cottage,
    occupied,
  );
  const scheduledFixtureEntries = privateSuiteFixtures.map((fixture) => ({
    id: `${cottage.id}:FURN:scheduled-private-fixture:${fixture.fixtureType}`,
    cottageId: cottage.id,
    roomId: fixture.roomId,
    category: fixture.fixtureType === 'CANOPY-BED'
      ? 'privateSuiteBeds'
      : 'privateThemedSilhouettes',
    anchor: fixture.anchor,
    blockState: fixture.blockState,
    scheduledFixtureId: fixture.id,
    themeId: fixture.themeId,
  }));
  entries.push(...scheduledFixtureEntries);
  for (const [category, rawCount] of Object.entries(cottage.furnishingMinimums)) {
    if (category === 'total') continue;
    const count = Number(rawCount) - scheduledFixtureEntries.filter(
      (entry) => entry.category === category,
    ).length;
    if (count < 0) {
      throw new Error(`${cottage.id} scheduled private fixtures exceed ${category}`);
    }
    const rooms = furnishingRooms(cottage, category);
    let roomOffset = 0;
    for (let index = 0; index < count; index += 1) {
      let selected = null;
      for (let pass = 0; pass < rooms.length && !selected; pass += 1) {
        const room = rooms[(roomOffset + pass) % rooms.length];
        const candidates = roomCandidatePoints(room, category);
        selected = candidates.find((point) => !occupied.has(point.join(',')));
        if (selected) {
          roomOffset = (roomOffset + pass + 1) % rooms.length;
          occupied.add(selected.join(','));
          entries.push({
            id: `${cottage.id}:FURN:${category}:GEN:${String(index + 1).padStart(3, '0')}`,
            cottageId: cottage.id,
            roomId: room.id,
            category,
            anchor: selected,
            blockState: FURNISHING_BLOCKS[category],
          });
          model.set(...selected, FURNISHING_BLOCKS[category], {
            scope: `${cottage.id}:FURNISHINGS`,
            role: category,
          });
        }
      }
      if (!selected) {
        throw new Error(`${cottage.id} lacks furnishing capacity for ${category}`);
      }
    }
  }
  if (entries.length !== cottage.furnishingMinimums.total) {
    throw new Error(
      `${cottage.id} furnishing total ${entries.length}`
      + ` != ${cottage.furnishingMinimums.total}`,
    );
  }
  return { entries, privateSuiteFixtures };
}

function buildPatio(model, cottage) {
  const raw = cottage.site.coveredPatio ?? cottage.site.terracedPatioAndGarden;
  if (!raw) return;
  const [x1, y1, z1, x2, , z2] = normalizeBox(raw);
  const isTerracedGarden = !cottage.site.coveredPatio
    && Boolean(cottage.site.terracedPatioAndGarden);
  const y = Math.max(
    y1,
    cottage.site.floorSupportsY[0] + (isTerracedGarden ? 1 : 0),
  );
  model.box([x1, y, z1, x2, y, z2], 'minecraft:cut_sandstone', {
    scope: `${cottage.id}:PATIO`,
    role: 'terraced-patio',
  });
  for (const [x, z] of [[x1, z1], [x1, z2], [x2, z1], [x2, z2]]) {
    model.set(x, y + 1, z, 'minecraft:dark_oak_fence', {
      scope: `${cottage.id}:PATIO`,
      role: 'patio-post',
    });
    model.set(x, y + 2, z, 'minecraft:lantern[hanging=false]', {
      scope: `${cottage.id}:PATIO`,
      role: 'patio-light',
    });
  }
}

function validateSchedule(schedule) {
  const errors = [];
  const check = (passed, message) => {
    if (!passed) errors.push(message);
  };
  check(schedule.schemaVersion === '3.0.0', 'schedule schema must be 3.0.0');
  check(schedule.cottages?.length === 5, 'exactly five cottages required');
  let bays = 0;
  let rooms = 0;
  let cameras = 0;
  let blockEntities = 0;
  let furnishings = 0;
  let privateSuites = 0;
  let privateSuiteFixtures = 0;
  const ids = [];
  for (const cottage of schedule.cottages ?? []) {
    const garage = cottage.site?.attachedGarage;
    check(Boolean(garage), `${cottage.id} lacks attached garage`);
    check(
      garage?.capacity === EXPECTED_GARAGE_CAPACITY[cottage.id],
      `${cottage.id} garage capacity mismatch`,
    );
    check(garage?.bays?.length === garage?.capacity, `${cottage.id} bay count mismatch`);
    check(
      garage?.doorOpenings?.length === garage?.capacity,
      `${cottage.id} door count mismatch`,
    );
    check(Boolean(garage?.sharedWall), `${cottage.id} shared wall missing`);
    check(Boolean(garage?.houseAccessDoor), `${cottage.id} house door missing`);
    check(Boolean(garage?.turningEnvelope), `${cottage.id} turning envelope missing`);
    check(Boolean(garage?.streetRoute), `${cottage.id} street route missing`);
    for (const [kind, stair] of [
      ['main', cottage.circulation?.mainStair],
      ['remote', cottage.circulation?.remoteStair],
    ]) {
      const stairBox = normalizeBox(stair);
      check(
        boxContains(cottage.site.buildingShell, [
          stairBox[0],
          cottage.site.floorSupportsY[0],
          stairBox[2],
        ])
          && boxContains(cottage.site.buildingShell, [
            stairBox[3],
            cottage.site.floorSupportsY[1],
            stairBox[5],
          ]),
        `${cottage.id} ${kind} stair must remain inside the building shell`,
      );
      check(
        (stairBox[3] - stairBox[0] + 1 >= 2
          && stairBox[5] - stairBox[2] + 1
            >= cottage.site.floorSupportsY[1] - cottage.site.floorSupportsY[0])
          || (stairBox[5] - stairBox[2] + 1 >= 2
            && stairBox[3] - stairBox[0] + 1
              >= cottage.site.floorSupportsY[1] - cottage.site.floorSupportsY[0]),
        `${cottage.id} ${kind} stair lacks a two-wide straight run`,
      );
    }
    bays += garage?.bays?.length ?? 0;
    rooms += cottage.rooms?.length ?? 0;
    cameras += cottage.cameraCandidates?.length ?? 0;
    blockEntities += cottage.source?.protectedBlockEntities?.length ?? 0;
    furnishings += cottage.furnishingMinimums?.total ?? 0;
    const adultRooms = cottage.rooms?.filter(
      (room) => /adult-only/i.test(room.program),
    ) ?? [];
    privateSuites += adultRooms.length;
    privateSuiteFixtures += cottage.privateSuiteFixtures?.length ?? 0;
    check(adultRooms.length === 1, `${cottage.id} must have one private suite`);
    const fixtureTypes = new Set(
      (cottage.privateSuiteFixtures ?? []).map(
        (fixture) => privateFixtureType(fixture.id),
      ),
    );
    check(
      cottage.privateSuiteFixtures?.length === 7
        && PRIVATE_FIXTURE_TYPES.every((type) => fixtureTypes.has(type)),
      `${cottage.id} private suite fixture anatomy mismatch`,
    );
    const cameraIds = new Set(
      (cottage.cameraCandidates ?? []).map((camera) => camera.id),
    );
    const prefix = COTTAGE_PREFIX[cottage.id];
    check(
      cameraIds.has(`${prefix}-AFTER-UPPER`)
        && cameraIds.has(`${prefix}-AFTER-PRIVATE`),
      `${cottage.id} lacks private-suite context/interior evidence cameras`,
    );
    for (const room of cottage.rooms ?? []) {
      check(
        boxContains(cottage.site.buildingShell, [
          room.bounds[0],
          room.bounds[1],
          room.bounds[2],
        ]) && boxContains(cottage.site.buildingShell, [
          room.bounds[3],
          room.bounds[4],
          room.bounds[5],
        ]),
        `${room.id} lies outside building shell`,
      );
      ids.push(room.id);
    }
    for (const bay of garage?.bays ?? []) ids.push(bay.id);
    for (let left = 0; left < cottage.rooms.length; left += 1) {
      for (let right = left + 1; right < cottage.rooms.length; right += 1) {
        if (cottage.rooms[left].level !== cottage.rooms[right].level) continue;
        check(
          !boxesIntersect(cottage.rooms[left].bounds, cottage.rooms[right].bounds),
          `${cottage.rooms[left].id}/${cottage.rooms[right].id} overlap`,
        );
      }
    }
  }
  check(bays === 24, `garage bays ${bays} != 24`);
  check(rooms === 55, `rooms ${rooms} != 55`);
  check(cameras === 45, `cameras ${cameras} != 45`);
  check(blockEntities === 41, `protected block entities ${blockEntities} != 41`);
  check(furnishings === 406, `furnishings ${furnishings} != 406`);
  check(privateSuites === 5, `private suites ${privateSuites} != 5`);
  check(
    privateSuiteFixtures === 35,
    `private suite fixtures ${privateSuiteFixtures} != 35`,
  );
  check(new Set(ids).size === ids.length, 'room/bay IDs are not unique');
  check(
    schedule.cottages.find((cottage) => cottage.id === 'RRCH-SCOUT')
      ?.identityMigration?.residentDisplayName === 'Scott',
    'Scott identity migration is missing',
  );
  if (errors.length) throw new Error(`Manager Vale schedule invalid: ${errors.join('; ')}`);
  return {
    cottages: 5,
    bays,
    rooms,
    cameras,
    blockEntities,
    furnishings,
    privateSuites,
    privateSuiteFixtures,
  };
}

async function compileMigrationLedger({
  schedule,
  snapshot,
  regions,
  model,
}) {
  const scheduled = schedule.cottages.flatMap((cottage) => (
    cottage.source.protectedBlockEntities.map((entry) => ({
      cottage,
      scheduledType: entry[0],
      source: entry.slice(1).map(Number),
    }))
  ));
  const sourcePoints = scheduled.map((entry) => entry.source);
  const rawByPoint = await rawBlockEntitiesAtPoints(regions, sourcePoints);
  const sourceBounds = sourcePoints.reduce(
    (box, [x, y, z]) => [
      Math.min(box[0], x),
      Math.min(box[1], y),
      Math.min(box[2], z),
      Math.max(box[3], x),
      Math.max(box[4], y),
      Math.max(box[5], z),
    ],
    [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
  );
  const simplified = await snapshot.blockEntitiesInBox(sourceBounds);
  const simplifiedByPoint = new Map(
    simplified.map((entity) => [simplifiedEntityPoint(entity).join(','), entity]),
  );
  const entries = [];
  const destinationPoints = new Set();
  for (let index = 0; index < scheduled.length; index += 1) {
    const item = scheduled[index];
    const pointKey = item.source.join(',');
    const rawEntity = rawByPoint.get(pointKey);
    const entity = simplifiedByPoint.get(pointKey);
    if (!rawEntity || !entity) throw new Error(`missing source block entity ${pointKey}`);
    const sourceType = String(entity.id);
    if (sourceType !== item.scheduledType) {
      throw new Error(
        `source type ${sourceType} != ${item.scheduledType} at ${pointKey}`,
      );
    }
    const sourceState = await snapshot.getBlock(...item.source);
    const translation = MIGRATION_TRANSLATIONS[item.cottage.id];
    const destination = item.source.map((value, axis) => value + translation[axis]);
    if (!boxContains(item.cottage.site.buildingShell, destination)) {
      throw new Error(
        `${item.cottage.id} migration destination outside shell: ${destination}`,
      );
    }
    if (destinationPoints.has(destination.join(','))) {
      throw new Error(`duplicate migration destination ${destination}`);
    }
    destinationPoints.add(destination.join(','));
    const room = roomForPoint(item.cottage, destination);
    const rawSource = rawCompound(rawEntity);
    const rawDestination = rawAtDestination(rawEntity, destination);
    const payload = snbt(rawPayload(rawEntity));
    const inventory = inventoryLedger(entity);
    model.set(...destination, sourceState, {
      scope: `${item.cottage.id}:PROTECTED-BE-MIGRATION`,
      role: `commission-destination:${sourceType}`,
    });
    entries.push({
      sequenceNumber: index + 1,
      cottageId: item.cottage.id,
      historicalExternalIdAlias:
        item.cottage.id === 'RRCH-SCOUT' ? 'RRCH-SCOUT' : null,
      occupantFacingName: item.cottage.nameAfter,
      sourceCoordinate: item.source,
      sourceBlockEntityType: sourceType,
      sourceBlockState: sourceState,
      sourceFullNbt: snbt(rawSource),
      sourceNbtSha256: typedNbtHash(rawSource),
      destinationCoordinate: destination,
      destinationRoomId: room?.id ?? 'circulation-or-shared-house-zone',
      destinationBlockState: sourceState,
      destinationExpectedNbtSha256: typedNbtHash(rawDestination),
      inventorySlotLedger: inventory.slots,
      itemStackCount: inventory.stackCount,
      itemCount: inventory.itemCount,
      forwardCommand:
        `CMD execute if block ${item.source.join(' ')} ${sourceState}`
        + ` if block ${destination.join(' ')} ${sourceState}`
        + ` run data merge block ${destination.join(' ')} ${payload}`,
      destinationVerifyCommand: `CMD data get block ${destination.join(' ')}`,
      sourceVerifyCommand: `CMD data get block ${item.source.join(' ')}`,
      sourceRetirementCommand: null,
    });
  }
  const counts = {
    protectedBlockEntities: entries.length,
    inventories: entries.filter((entry) => entry.inventorySlotLedger.length > 0).length,
    itemStacks: entries.reduce((sum, entry) => sum + entry.itemStackCount, 0),
    itemCount: entries.reduce((sum, entry) => sum + entry.itemCount, 0),
    byType: Object.fromEntries(
      [...new Set(entries.map((entry) => entry.sourceBlockEntityType))]
        .sort()
        .map((type) => [
          type,
          entries.filter((entry) => entry.sourceBlockEntityType === type).length,
        ]),
    ),
  };
  return {
    schemaVersion: '1.0.0',
    id: 'MANAGER-VALE-FIVE-COTTAGE-PROTECTED-BE-LEDGER-R1',
    status: 'OFFLINE_COMMISSION_LEDGER_LIVE_HASH_GATES_PENDING',
    liveWorldMutated: false,
    migrationMode:
      'commission_destination_then_copy_verify_reconcile_then_retire_source_in_separate_transaction',
    sourceRetirementIncluded: false,
    sourceRetirementOperationCount: 0,
    counts,
    checks: {
      exactProtectedCount: entries.length === 41,
      uniqueSourceCoordinates:
        new Set(entries.map((entry) => entry.sourceCoordinate.join(','))).size
        === entries.length,
      uniqueDestinationCoordinates:
        new Set(entries.map((entry) => entry.destinationCoordinate.join(','))).size
        === entries.length,
      everySourceTypedNbtHashed:
        entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.sourceNbtSha256)),
      everyDestinationTypedNbtHashed:
        entries.every(
          (entry) => /^[a-f0-9]{64}$/.test(entry.destinationExpectedNbtSha256),
        ),
      everyCopyGuarded:
        entries.every((entry) => entry.forwardCommand.startsWith(
          'CMD execute if block ',
        )),
      noSourceRetirementCommands:
        entries.every((entry) => entry.sourceRetirementCommand === null),
    },
    commissionBeforeRetireStages: [
      {
        stage: 1,
        id: 'COMMISSION-STRUCTURE',
        gate: 'exact destination REPL transaction installed and strict-noop report passes',
      },
      {
        stage: 2,
        id: 'SOURCE-NBT-PREFLIGHT',
        gate: 'all 41 same-moment source typed-NBT hashes match this ledger',
      },
      {
        stage: 3,
        id: 'COPY-NBT',
        gate: 'run 41 source-and-destination-state-guarded data merge commands',
      },
      {
        stage: 4,
        id: 'VERIFY-DESTINATION',
        gate: 'all 41 destination typed-NBT hashes and inventory totals reconcile',
      },
      {
        stage: 5,
        id: 'COMMISSION-FUNCTION-AND-MEDIA',
        gate: 'roads, stairs, rooms, garages, furnishings, databases and 45 cameras pass',
      },
      {
        stage: 6,
        id: 'RETIRE-SOURCE-SEPARATELY',
        gate: 'a new exact guarded source-retirement package is reviewed and authorized',
        includedHere: false,
      },
    ],
    entries,
  };
}

function targetBoxes(schedule) {
  const network = schedule.districtRules.managerValeVehicleNetwork;
  return [
    ...schedule.cottages.map((cottage) => cottage.site.reservation),
    network.upperStreet.bounds,
    network.eastConnector.bounds,
    network.r07WestExtension.bounds,
  ];
}

async function destinationEntityCensus(snapshot, schedule) {
  const entities = [];
  for (const box of targetBoxes(schedule)) {
    entities.push(...await snapshot.blockEntitiesInBox(box));
  }
  const unique = new Map(
    entities.map((entity) => [simplifiedEntityPoint(entity).join(','), entity]),
  );
  return [...unique.values()];
}

async function compileOperations(snapshot, model) {
  const operations = [];
  let fluidTargets = 0;
  const fluidTargetDetails = [];
  for (const desired of model.cells.values()) {
    const before = completeBlockState(await snapshot.getBlock(...desired.point));
    const target = completeBlockState(desired.state);
    if (before === target) continue;
    if (isFluid(before)) {
      fluidTargets += 1;
      if (fluidTargetDetails.length < 100) {
        fluidTargetDetails.push({
          point: desired.point,
          state: before,
          scope: desired.meta.scope,
          role: desired.meta.role,
        });
      }
    }
    operations.push({
      point: desired.point,
      expected: before,
      desired: target,
      scope: desired.meta.scope,
      role: desired.meta.role,
    });
  }
  operations.sort((left, right) => (
    left.point[1] - right.point[1]
    || left.point[2] - right.point[2]
    || left.point[0] - right.point[0]
  ));
  return { operations, fluidTargets, fluidTargetDetails };
}

function formatOperations(operations, title) {
  return [
    `# ${title}`,
    '# Offline exact-state package. Live execution is not authorized by generation.',
    '# Every operation is a one-cell source-state guard.',
    ...operations.map((operation) => (
      `REPL ${operation.point.join(' ')} ${operation.point.join(' ')}`
      + ` ${operation.expected} ${operation.desired}`
    )),
    '',
  ].join('\n');
}

function databaseFeatures(schedule, furnishingLedger, privateSuiteFixtureLedger) {
  const features = [];
  for (const cottage of schedule.cottages) {
    features.push({
      externalId: cottage.id,
      name: cottage.nameAfter,
      featureType: 'building',
      geometry: cottage.site.buildingShell,
      historicalAliases: cottage.identityMigration
        ? [cottage.identityMigration.historicalExternalIdAlias]
        : [],
      occupantFacingName: cottage.identityMigration?.residentDisplayName ?? null,
      attributes: {
        roleRooms: cottage.rooms.filter(
          (room) => /OFFICE|STUDIO|WORKSHOP|GEAR|LIBRARY/.test(room.id),
        ).map((room) => room.id),
        roomCount: cottage.rooms.length,
        furnishingCount: cottage.furnishingMinimums.total,
        attachedGarageId: cottage.site.attachedGarage.id,
        attachedGarageBays: cottage.site.attachedGarage.capacity,
        privateSuiteTheme: PRIVATE_SUITE_THEMES[cottage.id],
        privateSuiteFixtureCount: privateSuiteFixtureLedger.filter(
          (entry) => entry.cottageId === cottage.id,
        ).length,
      },
    });
    for (const room of cottage.rooms) {
      features.push({
        externalId: room.id,
        parentExternalId: cottage.id,
        name: room.program,
        featureType: 'room',
        geometry: room.bounds,
        attributes: {
          level: room.level,
          furnishingCount: furnishingLedger.filter(
            (entry) => entry.roomId === room.id,
          ).length,
          privateSuiteFixtures: /adult-only/i.test(room.program)
            ? privateSuiteFixtureLedger.filter(
              (entry) => entry.roomId === room.id,
            ).map((entry) => ({
              id: entry.id,
              fixtureType: entry.fixtureType,
              anchor: entry.anchor,
              themeId: entry.themeId,
            }))
            : [],
        },
      });
    }
    features.push({
      externalId: cottage.site.attachedGarage.id,
      parentExternalId: cottage.id,
      name: `${cottage.nameAfter} attached automotive garage`,
      featureType: 'garage',
      geometry: cottage.site.attachedGarage.bounds,
      attributes: {
        physicallyAttached: true,
        capacity: cottage.site.attachedGarage.capacity,
        bayIds: cottage.site.attachedGarage.bays.map((bay) => bay.id),
        serviceOrCarriageBaysCountedAsAutomotive: 0,
      },
    });
  }
  const network = schedule.districtRules.managerValeVehicleNetwork;
  for (const road of [
    network.upperStreet,
    network.eastConnector,
    network.r07WestExtension,
  ]) {
    features.push({
      externalId: road.id,
      name: road.id,
      featureType: 'road',
      geometry: road.bounds,
      attributes: {
        centerline: road.centerline,
        carriagewayWidth: road.carriagewayWidth,
      },
    });
  }
  return features;
}

export async function compileManagerValeCottages(options = {}) {
  const schedulePath = path.resolve(options.schedulePath ?? DEFAULT_SCHEDULE);
  const regions = path.resolve(options.regions ?? DEFAULT_REGIONS);
  const acceptedSnapshotSha256 =
    options.acceptedSnapshotSha256 ?? EXPECTED_SNAPSHOT_HASH;
  if (!/^[a-f0-9]{64}$/.test(acceptedSnapshotSha256)) {
    throw new Error('Manager Vale accepted snapshot SHA-256 is malformed');
  }
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const scheduleCounts = validateSchedule(schedule);
  const snapshotEvidence = hashSnapshotDirectory(regions);
  if (snapshotEvidence.sha256 !== acceptedSnapshotSha256) {
    throw new Error(
      `Manager Vale snapshot ${snapshotEvidence.sha256}`
      + ` != ${acceptedSnapshotSha256}`,
    );
  }
  if (schedule.evidence.snapshot.sha256 !== EXPECTED_SNAPSHOT_HASH) {
    throw new Error('schedule snapshot hash is not the Manager Vale baseline');
  }
  const snapshot = new DetailedAnvilSnapshot(regions);
  const beforeEntities = await destinationEntityCensus(snapshot, schedule);
  if (beforeEntities.length !== 0) {
    throw new Error(
      `Manager Vale destinations contain ${beforeEntities.length} block entities`,
    );
  }
  const model = new DesiredModel();
  const roads = await buildRoadNetwork(model, snapshot, schedule);
  const stairAudits = [];
  for (const cottage of schedule.cottages) {
    await buildGarageApron(model, snapshot, cottage);
    for (const [index, component] of houseComponents(cottage).entries()) {
      buildHouseComponent(model, cottage, component, index);
    }
    buildGarage(model, cottage);
    buildPublicEntry(model, cottage);
    stairAudits.push(
      buildStair(
        model,
        cottage,
        cottage.circulation.mainStair,
        'MAIN-STAIR',
      ),
      buildStair(
        model,
        cottage,
        cottage.circulation.remoteStair,
        'REMOTE-STAIR',
      ),
    );
    buildPatio(model, cottage);
  }
  const migrationLedger = await compileMigrationLedger({
    schedule,
    snapshot,
    regions,
    model,
  });
  const reservedMigrationPoints = new Set(
    migrationLedger.entries.map((entry) => entry.destinationCoordinate.join(',')),
  );
  const furnishingResults = schedule.cottages.map(
    (cottage) => furnishCottage(model, cottage, reservedMigrationPoints),
  );
  const furnishingLedger = furnishingResults.flatMap((result) => result.entries);
  const privateSuiteFixtureLedger = furnishingResults.flatMap(
    (result) => result.privateSuiteFixtures,
  );
  const overrideAudit = modelOverrideAudit(model.overrides);
  if (overrideAudit.unreviewedCrossScopeOverrides !== 0) {
    throw new Error(
      'Manager Vale model contains unreviewed cross-scope overrides: '
      + JSON.stringify(overrideAudit.unreviewedExamples),
    );
  }
  const {
    operations,
    fluidTargets,
    fluidTargetDetails,
  } = await compileOperations(snapshot, model);
  if (fluidTargets !== 0) {
    throw new Error(
      `Manager Vale package targets ${fluidTargets} fluid cells:`
      + ` ${JSON.stringify(fluidTargetDetails)}`,
    );
  }
  const rollback = [...operations].reverse().map((operation) => ({
    point: operation.point,
    expected: operation.desired,
    desired: operation.expected,
    scope: operation.scope,
    role: operation.role,
  }));
  const forwardText = formatOperations(
    operations,
    'GENERATED — Manager Vale five-cottage commission package',
  );
  const rollbackText = formatOperations(
    rollback,
    'GENERATED — Manager Vale five-cottage exact reverse rollback',
  );
  const cameras = schedule.cottages.flatMap((cottage) => (
    cottage.cameraCandidates.map((camera) => ({
      ...camera,
      primaryFeatureId: cottage.id,
      occupantFacingName: cottage.nameAfter,
    }))
  ));
  const adultCameraCrosswalk = schedule.cottages.map((cottage) => {
    const prefix = COTTAGE_PREFIX[cottage.id];
    const room = cottage.rooms.find((candidate) => /adult-only/i.test(candidate.program));
    return {
      cottageId: cottage.id,
      roomId: room.id,
      themeId: PRIVATE_SUITE_THEMES[cottage.id].id,
      privacyAndWayfindingContextCameraId: `${prefix}-AFTER-UPPER`,
      interiorFurnitureCameraId: `${prefix}-AFTER-PRIVATE`,
      exactGeometryRequired: true,
      contentReviewRequired: true,
    };
  });
  const features = databaseFeatures(
    schedule,
    furnishingLedger,
    privateSuiteFixtureLedger,
  );
  const report = {
    schemaVersion: '1.0.0',
    id: 'MANAGER-VALE-FIVE-COTTAGE-COMMISSION-R1',
    status: 'PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING',
    liveWorldMutated: false,
    source: {
      schedule: {
        path: relative(schedulePath),
        sha256: sha256File(schedulePath),
        schemaVersion: schedule.schemaVersion,
      },
      snapshot: {
        directory: relative(regions),
        ...snapshotEvidence,
        designBaselineSha256: EXPECTED_SNAPSHOT_HASH,
        expectedSha256: acceptedSnapshotSha256,
        hashMatched: true,
      },
    },
    counts: {
      ...scheduleCounts,
      attachedGarages: 5,
      garageDoorOpenings: 24,
      garageTurningEnvelopes: 5,
      garageStreetRoutes: 5,
      mainStairs: 5,
      remoteStairs: 5,
      roads: roads.length,
      databaseFeatures: features.length,
      databaseBuildings: features.filter((feature) => feature.featureType === 'building').length,
      databaseRooms: features.filter((feature) => feature.featureType === 'room').length,
      databaseGarages: features.filter((feature) => feature.featureType === 'garage').length,
      databaseRoads: features.filter((feature) => feature.featureType === 'road').length,
    },
    garageCapacityByHouse: EXPECTED_GARAGE_CAPACITY,
    identityCrosswalk: {
      occupantFacingName: 'Scott',
      residenceName: 'Scott House mini-mansion',
      historicalExternalIdAlias: 'RRCH-SCOUT',
      migrationMode: 'atomic-crosswalk-no-duplicate-resident',
    },
    operations: {
      changedCellCount: operations.length,
      uniqueTargetCells: new Set(
        operations.map((operation) => operation.point.join(',')),
      ).size,
      rollbackCellCount: rollback.length,
      exactReverseRollback: rollback.length === operations.length,
      setOperationCount: 0,
      fluidTargets,
      preexistingDestinationBlockEntities: beforeEntities.length,
      desiredModelOverrides: model.overrides.length,
      overrideAudit,
      forwardSha256: sha256(forwardText),
      rollbackSha256: sha256(rollbackText),
    },
    protectedMigration: {
      ledgerId: migrationLedger.id,
      ...migrationLedger.counts,
      sourceRetirementIncluded: false,
      sourceRetirementOperationCount: 0,
      checks: migrationLedger.checks,
    },
    furnishing: {
      total: furnishingLedger.length,
      byCategory: Object.fromEntries(
        Object.keys(FURNISHING_BLOCKS).map((category) => [
          category,
          furnishingLedger.filter((entry) => entry.category === category).length,
        ]),
      ),
      byHouse: Object.fromEntries(
        schedule.cottages.map((cottage) => [
          cottage.id,
          furnishingLedger.filter((entry) => entry.cottageId === cottage.id).length,
        ]),
      ),
    },
    privateSuiteDesign: {
      suiteCount: 5,
      scheduledFixtureGroups: privateSuiteFixtureLedger.length,
      fixtureGroupsPerSuite: Object.fromEntries(
        schedule.cottages.map((cottage) => [
          cottage.id,
          privateSuiteFixtureLedger.filter(
            (entry) => entry.cottageId === cottage.id,
          ).length,
        ]),
      ),
      themes: PRIVATE_SUITE_THEMES,
      requiredFixtureTypes: PRIVATE_FIXTURE_TYPES,
      everySuiteHasRequiredAnatomy: schedule.cottages.every((cottage) => {
        const types = new Set(
          privateSuiteFixtureLedger
            .filter((entry) => entry.cottageId === cottage.id)
            .map((entry) => entry.fixtureType),
        );
        return PRIVATE_FIXTURE_TYPES.every((type) => types.has(type));
      }),
      cameraCrosswalk: adultCameraCrosswalk,
      contentBoundary:
        'architecture, furniture, lighting, privacy, hospitality, storage and wash zones only; no figures, anatomy, explicit imagery or depicted acts',
    },
    stairStandard: {
      count: stairAudits.length,
      allTwoWide: stairAudits.every((entry) => entry.clearWidth === 2),
      allOneToOneGrade: stairAudits.every(
        (entry) => entry.changedElevationPerTread === 1,
      ),
      allTwoBlockHeadroom: stairAudits.every(
        (entry) => entry.headroomBlocks === 2,
      ),
      allInsideBuildingShell: true,
      bidirectionalPostStateWalkRequired: true,
      stairs: stairAudits,
    },
    cameras: {
      count: cameras.length,
      matchedSourcePairs: 5,
      matchedDestinationPairs: 5,
      garageViews: cameras.filter((camera) => camera.id.includes('AFTER-GARAGE')).length,
      sameCameraAfterRequired: true,
    },
    databaseFeatures: features,
    releaseGates: [
      'fresh same-moment snapshot hash and all exact source-state guards match',
      'zero players, entities, builders or concurrent packages in all target cells',
      'strict-noop forward report passes with zero failure and zero leftover',
      'all roads and pedestrian entries pass bidirectional route QA',
      'all 24 garage bays pass door-to-street maneuver QA',
      'all 55 rooms, ten stairs and 406 furnishing anchors pass post-state QA',
      'all 41 source NBT hashes match before copy and destination hashes match after copy',
      'database import and 45 matched camera captures pass before source retirement',
    ],
    truthBoundary:
      'Offline compilation is not live authorization and does not retire a source cottage.',
  };
  return {
    schedule,
    schedulePath,
    regions,
    report,
    operations,
    rollback,
    forwardText,
    rollbackText,
    migrationLedger,
    furnishingLedger,
    privateSuiteFixtureLedger,
    cameras,
    databaseFeatures: features,
  };
}

export function integrationExport(compiled) {
  return {
    schemaVersion: '1.0.0',
    id: 'MANAGER-VALE-FIVE-COTTAGE-INTEGRATION-HANDOFF-R1',
    status: 'READY_FOR_POST_C01_GENERATOR_INTEGRATION',
    liveWorldMutated: false,
    module: 'scripts/manager_vale_cottage_compiler.mjs',
    exportName: 'compileManagerValeCottages',
    sourceSchedule: compiled.report.source.schedule,
    sourceSnapshot: compiled.report.source.snapshot,
    counts: compiled.report.counts,
    garageCapacityByHouse: compiled.report.garageCapacityByHouse,
    identityCrosswalk: compiled.report.identityCrosswalk,
    protectedMigration: compiled.report.protectedMigration,
    privateSuiteDesign: compiled.report.privateSuiteDesign,
    overrideAudit: compiled.report.operations.overrideAudit,
    integrationOrder: [
      'wait until C01 finishes ownership of scripts/generate_town_expansion_r1.mjs',
      'import compileManagerValeCottages from the dedicated module',
      'require the exact immutable snapshot hash before merging target cells',
      'reject any cross-package target-cell intersection',
      'merge the one-cell exact commission transaction and database features',
      'run strict-noop preflight and live clearance gates',
      'commission roads, buildings, garages, rooms, stairs and furnishings',
      'copy and verify all 41 protected block entities',
      'commission route, database and 45-camera evidence',
      'retire old cottages only through a later separately reviewed transaction',
    ],
    sourceRetirementIncluded: false,
    sourceRetirementOperationCount: 0,
  };
}

export function writeManagerValeArtifacts(compiled, options = {}) {
  const outBase = path.resolve(options.outBase ?? DEFAULT_OUT_BASE);
  const handoffPath = path.resolve(options.handoffPath ?? DEFAULT_HANDOFF);
  const paths = {
    forward: `${outBase}.txt`,
    rollback: `${outBase}.rollback.txt`,
    report: `${outBase}.report.json`,
    ledger: `${outBase}.nbt-ledger.json`,
    nbtCommands: `${outBase}.nbt-copy.commands.txt`,
    nbtVerify: `${outBase}.nbt-verify.commands.txt`,
    furnishings: `${outBase}.furnishings.json`,
    privateSuites: `${outBase}.private-suites.json`,
    cameras: `${outBase}.cameras.json`,
    databaseFeatures: `${outBase}.database-features.json`,
    handoff: handoffPath,
  };
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(paths.forward, compiled.forwardText);
  fs.writeFileSync(paths.rollback, compiled.rollbackText);
  fs.writeFileSync(
    paths.ledger,
    `${JSON.stringify(compiled.migrationLedger, null, 2)}\n`,
  );
  const ledgerSha = sha256File(paths.ledger);
  fs.writeFileSync(
    paths.nbtCommands,
    [
      '# GENERATED — Manager Vale commission-before-retire NBT copy commands',
      '# Source retirement is not included.',
      `# ledger_sha256: ${ledgerSha}`,
      ...compiled.migrationLedger.entries.map((entry) => entry.forwardCommand),
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    paths.nbtVerify,
    [
      '# GENERATED — Manager Vale source/destination NBT verification commands',
      '# These are read-only data-get commands.',
      `# ledger_sha256: ${ledgerSha}`,
      ...compiled.migrationLedger.entries.flatMap((entry) => [
        entry.sourceVerifyCommand,
        entry.destinationVerifyCommand,
      ]),
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    paths.furnishings,
    `${JSON.stringify({ entries: compiled.furnishingLedger }, null, 2)}\n`,
  );
  fs.writeFileSync(
    paths.privateSuites,
    `${JSON.stringify({
      standard:
        'docs/redevelopment/2026-07-28-town-expansion/non-graphic-adult-interior-design-standard.md',
      design: compiled.report.privateSuiteDesign,
      fixtures: compiled.privateSuiteFixtureLedger,
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    paths.cameras,
    `${JSON.stringify({
      capturePolicy: {
        sameCameraAfterRequired: true,
        sameLightingAfterRequired: true,
      },
      cameras: compiled.cameras,
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    paths.databaseFeatures,
    `${JSON.stringify({ features: compiled.databaseFeatures }, null, 2)}\n`,
  );
  const report = {
    ...compiled.report,
    artifacts: Object.fromEntries(
      Object.entries(paths)
        .filter(([key]) => key !== 'report' && key !== 'handoff')
        .map(([key, filename]) => [
          key,
          {
            path: relative(filename),
            sha256: sha256File(filename),
            bytes: fs.statSync(filename).size,
          },
        ]),
    ),
  };
  fs.writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`);
  const handoff = {
    ...integrationExport({ ...compiled, report }),
    artifacts: {
      report: {
        path: relative(paths.report),
        sha256: sha256File(paths.report),
      },
      forward: {
        path: relative(paths.forward),
        sha256: sha256File(paths.forward),
      },
      rollback: {
        path: relative(paths.rollback),
        sha256: sha256File(paths.rollback),
      },
      migrationLedger: {
        path: relative(paths.ledger),
        sha256: sha256File(paths.ledger),
      },
    },
  };
  fs.writeFileSync(paths.handoff, `${JSON.stringify(handoff, null, 2)}\n`);
  return {
    paths,
    report,
    handoff,
    hashes: Object.fromEntries(
      Object.entries(paths).map(([key, filename]) => [key, sha256File(filename)]),
    ),
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-base') options.outBase = argv[++index];
    else if (arg === '--schedule') options.schedulePath = argv[++index];
    else if (arg === '--regions') options.regions = argv[++index];
    else if (arg === '--accepted-snapshot-sha256') {
      options.acceptedSnapshotSha256 = argv[++index];
    }
    else if (arg === '--handoff') options.handoffPath = argv[++index];
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const compiled = await compileManagerValeCottages(options);
  const written = writeManagerValeArtifacts(compiled, options);
  process.stdout.write(`${JSON.stringify({
    status: written.report.status,
    counts: written.report.counts,
    operations: written.report.operations,
    protectedMigration: written.report.protectedMigration,
    identityCrosswalk: written.report.identityCrosswalk,
    artifacts: Object.fromEntries(
      Object.entries(written.paths).map(([key, filename]) => [
        key,
        { path: relative(filename), sha256: written.hashes[key] },
      ]),
    ),
  }, null, 2)}\n`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
