#!/usr/bin/env node
/**
 * Generate the pinned, typed-NBT C01 migration ledger.
 *
 * The ledger is planning evidence. It never connects to Minecraft and never
 * mutates the source snapshot. Live use remains gated on a same-moment
 * `data get block` hash pass before any source retirement.
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_REGIONS = path.join(
  ROOT,
  'data/worldsnap-postrelease-f8edf99494c023dd-20260728/region',
);
const MANIFEST_PATH = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
);
const OUTPUT_PATH = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-source-nbt-migration-ledger.json',
);
const FORWARD_COMMANDS = path.join(
  ROOT,
  'data/buildops/c01-source-nbt-migration.commands.txt',
);
const ROLLBACK_COMMANDS = path.join(
  ROOT,
  'data/buildops/c01-source-nbt-migration.rollback.commands.txt',
);

const SOURCE_BOUNDS = [100, 44, 70, 300, 136, 235];
const EXPECTED_SNAPSHOT_HASH =
  'f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10';

const RETAINED_MASKS = Object.freeze([
  { id: 'OBS-S01', bounds: [175, 119, 137, 235, 136, 182] },
  { id: 'APT-S01', bounds: [178, 105, 139, 225, 114, 180] },
  { id: 'ROUTE:APT-SHELTER', bounds: [184, 81, 146, 207, 104, 146] },
]);

const TYPE_ROOM_POOLS = Object.freeze({
  'minecraft:barrel': [
    'l3-food-storage',
    'l1-garage-parts-storage',
    'l5-emergency-stores',
    'l3-maintenance-backrooms',
    'owner-club-backrooms',
  ],
  'minecraft:chiseled_bookshelf': [
    'l2-library',
    'master-computer-office-library',
    'owner-two-rack-micro-dc',
  ],
  'minecraft:beacon': ['l5-power-plant', 'l4-command-center'],
  'minecraft:conduit': ['l3-water-treatment', 'l3-cistern-pumps'],
  'minecraft:brewing_stand': ['l4-brewing-potion', 'l4-medical-bay'],
  'minecraft:bed': [
    'l2-protected-staff-quarters',
    'l2-guest-suites',
    'l5-secondary-panic-bunker',
    'poly-suite-01',
    'poly-suite-02',
    'poly-suite-03',
    'poly-suite-04',
    'poly-suite-05',
    'poly-suite-06',
    'poly-suite-07',
    'poly-suite-08',
    'poly-suite-09',
    'poly-suite-10',
    'poly-suite-11',
    'poly-suite-12',
    'poly-suite-13',
    'poly-suite-14',
    'poly-suite-15',
  ],
  'minecraft:chest': ['l4-vault', 'l5-emergency-stores'],
  'minecraft:ender_chest': ['l4-vault', 'master-safe-room'],
  'minecraft:lectern': ['l2-library', 'l4-command-center', 'owner-ordinary-office'],
  'minecraft:blast_furnace': ['l5-power-plant', 'l3-maintenance-backrooms'],
  'minecraft:furnace': ['l3-processing-kitchen'],
  'minecraft:smoker': ['l3-processing-kitchen', 'l2-main-kitchen-dining'],
  'minecraft:sign': ['l1-grand-security-entry', 'C01-L1-SECURITY-GARAGE-loop'],
  'minecraft:jukebox': ['l2-music-studio'],
  'minecraft:daylight_detector': ['l5-power-plant'],
  'minecraft:campfire': ['master-smoke-lounge-coffee'],
});

const LEVEL_SCOPES = Object.freeze({
  'C01-L1-SECURITY-GARAGE': 'c01_east_l1_security_garage',
  'C01-L2-LIVING-AMENITY': 'c01_east_l2_living_adult',
  'C01-L3-AGRICULTURE-WATER': 'c01_east_l3_agriculture_water',
  'C01-L4-COMMAND-MEDICAL': 'c01_east_l4_command_medical',
  'C01-L5-POWER-ESCAPE': 'c01_east_l5_power_escape',
  'C01-OWNER-CLUB-ARRIVAL': 'c01_owner_club_arrival',
  'C01-OWNER-RESIDENCE': 'c01_owner_residence',
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function inBox(entity, raw) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
  const x = Number(entity.x?.value ?? entity.x);
  const y = Number(entity.y?.value ?? entity.y);
  const z = Number(entity.z?.value ?? entity.z);
  return x >= x1 && x <= x2
    && y >= y1 && y <= y2
    && z >= z1 && z <= z2;
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
    return `[${(tag.value?.value ?? []).map((value) => snbt({ type: subtype, value })).join(',')}]`;
  }
  if (tag.type === 'byteArray') {
    return `[B;${(tag.value ?? []).map((value) => `${Number(value)}b`).join(',')}]`;
  }
  if (tag.type === 'intArray') {
    return `[I;${(tag.value ?? []).map((value) => Number(value)).join(',')}]`;
  }
  if (tag.type === 'longArray') {
    return `[L;${(tag.value ?? []).map((value) => `${longToString(value)}L`).join(',')}]`;
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

async function rawBlockEntitiesInBox(regionDir, rawBounds) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(rawBounds);
  const entities = [];
  for (let cz = Math.floor(z1 / 16); cz <= Math.floor(z2 / 16); cz += 1) {
    for (let cx = Math.floor(x1 / 16); cx <= Math.floor(x2 / 16); cx += 1) {
      for (const rawEntity of await readRawChunkBlockEntities(regionDir, cx, cz)) {
        const x = Number(rawEntity.x?.value);
        const y = Number(rawEntity.y?.value);
        const z = Number(rawEntity.z?.value);
        if (x < x1 || x > x2 || y < y1 || y > y2 || z < z1 || z > z2) continue;
        entities.push(rawEntity);
      }
    }
  }
  return entities;
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

function spaceContains(space, x, y, z) {
  return space.boxes.some((raw) => {
    const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2;
  });
}

function candidateCells(space, routePoint) {
  const boxes = space.boxes.map(normalizeBox);
  const x1 = Math.min(...boxes.map((box) => box[0]));
  const y1 = Math.min(...boxes.map((box) => box[1]));
  const z1 = Math.min(...boxes.map((box) => box[2]));
  const x2 = Math.max(...boxes.map((box) => box[3]));
  const y2 = Math.max(...boxes.map((box) => box[4]));
  const z2 = Math.max(...boxes.map((box) => box[5]));
  const output = [];
  for (let y = y1 + 1; y <= Math.min(y2 - 2, y1 + 5); y += 2) {
    for (let z = z1 + 2; z <= z2 - 2; z += 2) {
      for (let x = x1 + 2; x <= x2 - 2; x += 2) {
        if (!spaceContains(space, x, y, z)) continue;
        if (routePoint && Math.abs(routePoint[0] - x) <= 4 && Math.abs(routePoint[2] - z) <= 4) continue;
        output.push([x, y, z]);
      }
    }
  }
  return output;
}

function blockStateProperties(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return {};
  return Object.fromEntries(
    state.slice(bracket + 1, -1).split(',').map((entry) => entry.split('=')),
  );
}

function bedCompanion(destination, sourceState) {
  const properties = blockStateProperties(sourceState);
  if (!sourceState.includes('_bed[') || properties.part !== 'foot') return null;
  const delta = {
    north: [0, 0, -1],
    south: [0, 0, 1],
    east: [1, 0, 0],
    west: [-1, 0, 0],
  }[properties.facing];
  if (!delta) return null;
  return {
    point: [
      destination[0] + delta[0],
      destination[1],
      destination[2] + delta[2],
    ],
    state: sourceState.replace('part=foot', 'part=head'),
    role: 'migrated_bed_companion_head',
  };
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

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const snapshotEvidence = hashSnapshotDirectory(SOURCE_REGIONS);
  if (snapshotEvidence.sha256 !== EXPECTED_SNAPSHOT_HASH) {
    throw new Error(
      `source snapshot hash ${snapshotEvidence.sha256} != ${EXPECTED_SNAPSHOT_HASH}`,
    );
  }
  const snapshot = new DetailedAnvilSnapshot(SOURCE_REGIONS);
  const simplified = await snapshot.blockEntitiesInBox(SOURCE_BOUNDS);
  const raw = await rawBlockEntitiesInBox(SOURCE_REGIONS, SOURCE_BOUNDS);
  const simplifiedByPoint = new Map(
    simplified.map((entity) => [`${entity.x},${entity.y},${entity.z}`, entity]),
  );
  const rawByPoint = new Map(
    raw.map((entity) => [
      `${entity.x.value},${entity.y.value},${entity.z.value}`,
      entity,
    ]),
  );
  if (simplifiedByPoint.size !== 1896 || rawByPoint.size !== 1896) {
    throw new Error(
      `source census mismatch simplified=${simplifiedByPoint.size} raw=${rawByPoint.size}`,
    );
  }

  const spaces = new Map();
  const levelBySpace = new Map();
  const routePointBySpace = new Map();
  for (const level of manifest.levels) {
    for (const space of level.spaces) {
      spaces.set(space.id, space);
      levelBySpace.set(space.id, level.id);
    }
  }
  for (const node of manifest.routeGraph.nodes) {
    routePointBySpace.set(node.spaceId, node.point.map(Number));
  }
  const candidatesByRoom = new Map(
    [...spaces.entries()].map(([spaceId, space]) => [
      spaceId,
      candidateCells(space, routePointBySpace.get(spaceId)),
    ]),
  );
  const candidateOffsets = new Map();
  const occupiedDestinations = new Set();
  const nextDestination = (type, poolIndex) => {
    const pool = TYPE_ROOM_POOLS[type];
    if (!pool?.length) throw new Error(`no destination room pool for ${type}`);
    for (let pass = 0; pass < pool.length; pass += 1) {
      const roomId = pool[(poolIndex + pass) % pool.length];
      const candidates = candidatesByRoom.get(roomId) ?? [];
      let offset = candidateOffsets.get(roomId) ?? 0;
      while (offset < candidates.length) {
        const point = candidates[offset++];
        candidateOffsets.set(roomId, offset);
        const pointKey = point.join(',');
        if (occupiedDestinations.has(pointKey)) continue;
        occupiedDestinations.add(pointKey);
        return { point, roomId };
      }
    }
    throw new Error(`destination capacity exhausted for ${type}`);
  };

  const typeSequence = new Map();
  const entries = [];
  const orderedPoints = [...rawByPoint.keys()].sort((left, right) => {
    const a = left.split(',').map(Number);
    const b = right.split(',').map(Number);
    return a[1] - b[1] || a[2] - b[2] || a[0] - b[0];
  });
  for (let index = 0; index < orderedPoints.length; index += 1) {
    const pointKey = orderedPoints[index];
    const rawEntity = rawByPoint.get(pointKey);
    const entity = simplifiedByPoint.get(pointKey);
    const sourceCoordinate = pointKey.split(',').map(Number);
    const type = String(entity.id);
    const sourceBlockState = await snapshot.getBlock(...sourceCoordinate);
    const retainMask = RETAINED_MASKS.find((mask) => inBox(entity, mask.bounds));
    const inventory = inventoryLedger(entity);
    const base = {
      sequenceNumber: index + 1,
      sourceCoordinate,
      sourceBlockState,
      sourceFullNbt: snbt(rawCompound(rawEntity)),
      sourceNbtSha256: typedNbtHash(rawCompound(rawEntity)),
      inventorySlotLedger: inventory.slots,
      itemStackCount: inventory.stackCount,
      itemCount: inventory.itemCount,
    };
    if (retainMask) {
      entries.push({
        ...base,
        disposition: 'retain',
        retainedMask: retainMask.id,
        destinationCoordinate: sourceCoordinate,
        destinationBlockState: sourceBlockState,
        destinationExpectedNbtSha256: base.sourceNbtSha256,
        rollbackCoordinate: sourceCoordinate,
        rollbackFullNbt: base.sourceFullNbt,
        rollbackNbtSha256: base.sourceNbtSha256,
        forwardCommand: null,
        rollbackCommand: null,
        companionPlacements: [],
      });
      continue;
    }

    const typeIndex = typeSequence.get(type) ?? 0;
    typeSequence.set(type, typeIndex + 1);
    const destination = nextDestination(type, typeIndex);
    const destinationLevel = levelBySpace.get(destination.roomId);
    const destinationScope = LEVEL_SCOPES[destinationLevel];
    const expectedRaw = rawAtDestination(rawEntity, destination.point);
    const payload = snbt(rawPayload(rawEntity));
    const companion = bedCompanion(destination.point, sourceBlockState);
    if (companion) {
      const companionKey = companion.point.join(',');
      if (occupiedDestinations.has(companionKey)) {
        throw new Error(`bed companion collision at ${companionKey}`);
      }
      occupiedDestinations.add(companionKey);
    }
    entries.push({
      ...base,
      disposition: 'move',
      destinationCoordinate: destination.point,
      destinationRoomId: destination.roomId,
      destinationScope,
      destinationBlockState: sourceBlockState,
      destinationExpectedNbtSha256: typedNbtHash(expectedRaw),
      rollbackCoordinate: sourceCoordinate,
      rollbackFullNbt: base.sourceFullNbt,
      rollbackNbtSha256: base.sourceNbtSha256,
      forwardCommand:
        `CMD execute if block ${sourceCoordinate.join(' ')} ${sourceBlockState}`
        + ` if block ${destination.point.join(' ')} ${sourceBlockState}`
        + ` run data merge block ${destination.point.join(' ')} ${payload}`,
      rollbackCommand:
        `CMD execute if block ${destination.point.join(' ')} ${sourceBlockState}`
        + ` if block ${sourceCoordinate.join(' ')} ${sourceBlockState}`
        + ` run data merge block ${sourceCoordinate.join(' ')} ${payload}`,
      companionPlacements: companion ? [companion] : [],
    });
  }

  const counts = {
    blockEntities: entries.length,
    inventories: entries.filter((entry) => (
      simplifiedByPoint.get(entry.sourceCoordinate.join(','))?.Items !== undefined
    )).length,
    itemStacks: entries.reduce((sum, entry) => sum + entry.itemStackCount, 0),
    totalItemCount: entries.reduce((sum, entry) => sum + entry.itemCount, 0),
    move: entries.filter((entry) => entry.disposition === 'move').length,
    retain: entries.filter((entry) => entry.disposition === 'retain').length,
    companionPlacements: entries.reduce(
      (sum, entry) => sum + entry.companionPlacements.length,
      0,
    ),
  };
  const required = manifest.sourceMigrationLedger.sourceCensus;
  const checks = {
    exactBlockEntities: counts.blockEntities === required.blockEntities,
    exactInventories: counts.inventories === required.inventories,
    exactItemStacks: counts.itemStacks === required.itemStacks,
    exactItemCount: counts.totalItemCount === required.totalItemCount,
    uniqueSourceCoordinates:
      new Set(entries.map((entry) => entry.sourceCoordinate.join(','))).size === entries.length,
    uniqueMoveDestinations:
      new Set(
        entries
          .filter((entry) => entry.disposition === 'move')
          .map((entry) => entry.destinationCoordinate.join(',')),
      ).size === counts.move,
    everyEntryTypedNbtHashed:
      entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.sourceNbtSha256)),
    everyMoveGuarded:
      entries
        .filter((entry) => entry.disposition === 'move')
        .every((entry) => (
          entry.forwardCommand.startsWith('CMD execute if block ')
          && entry.rollbackCommand.startsWith('CMD execute if block ')
        )),
  };
  if (!Object.values(checks).every(Boolean)) {
    throw new Error(`migration ledger checks failed: ${JSON.stringify(checks)}`);
  }

  const ledger = {
    schemaVersion: '1.0.0',
    id: 'C01-SOURCE-NBT-MIGRATION-LEDGER-R1',
    status: 'PINNED_OFFLINE_LEDGER_SAME_MOMENT_LIVE_HASH_GATE_PENDING',
    liveWorldMutated: false,
    sourceSnapshot: {
      directory: path.relative(ROOT, SOURCE_REGIONS),
      ...snapshotEvidence,
    },
    sourceBounds: SOURCE_BOUNDS,
    retainedMasks: RETAINED_MASKS,
    migrationMode: 'commission_new_then_copy_and_verify_then_retire_exact_source_only',
    sourceRetirementIncluded: false,
    counts,
    checks,
    requiredLivePreflight: [
      'repeat data get block for all 1896 source block entities',
      'reconstruct typed NBT and match every sourceNbtSha256',
      'prove every destination block state is installed by the commissioned C01 package',
      'execute commands in sequenceNumber order',
      'read back every destination NBT and match destinationExpectedNbtSha256',
      'reconcile exactly 1896 block entities, 1622 inventories, 92 item stacks, and 5132 items',
      'retain the old source intact until the new bunker has passed route, concealment, and visual commissioning',
    ],
    entries,
  };
  const serialized = `${JSON.stringify(ledger, null, 2)}\n`;
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(FORWARD_COMMANDS), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, serialized);
  fs.writeFileSync(
    FORWARD_COMMANDS,
    [
      '# GENERATED — C01 pinned NBT copy commands',
      '# Source is not retired by this package.',
      `# ledger_sha256: ${sha256(serialized)}`,
      ...entries
        .filter((entry) => entry.disposition === 'move')
        .map((entry) => entry.forwardCommand),
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    ROLLBACK_COMMANDS,
    [
      '# GENERATED — C01 pinned NBT source-restore verification commands',
      '# Destination blocks are reverted by the exact REPL rollback package.',
      `# ledger_sha256: ${sha256(serialized)}`,
      ...entries
        .filter((entry) => entry.disposition === 'move')
        .reverse()
        .map((entry) => entry.rollbackCommand),
      '',
    ].join('\n'),
  );
  process.stdout.write(`${JSON.stringify({
    status: ledger.status,
    counts,
    checks,
    output: path.relative(ROOT, OUTPUT_PATH),
    sha256: sha256(serialized),
    forwardCommands: path.relative(ROOT, FORWARD_COMMANDS),
    rollbackCommands: path.relative(ROOT, ROLLBACK_COMMANDS),
  }, null, 2)}\n`);
}

await main();

