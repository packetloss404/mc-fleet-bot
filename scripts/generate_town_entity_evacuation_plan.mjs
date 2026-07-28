#!/usr/bin/env node
/**
 * Build a fail-closed entity-preservation plan from one exact live-gate report.
 *
 * Offline only: reads the gate, guarded operations, release metadata, and the
 * immutable Anvil snapshot. It never connects to Minecraft or changes blocks,
 * entities, databases, services, or configuration.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AnvilSnapshot,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

export const ORDINARY_LIVESTOCK = new Set(['Pig', 'Chicken', 'Cow', 'Sheep']);
export const TRANSIENT_ENTITIES = new Set(['Egg']);
export const DROPPED_ITEM_ENTITIES = new Set(['Oak Sapling']);
export const SPECIAL_ENTITIES = new Set([
  'Bee',
  'Wolf',
  'Turtle',
  'Minecart with Chest',
  'Fox',
  'Donkey',
]);
const DEFAULT_GATE =
  'data/world-review/town-expansion-r1-live-entity-gate-nbt2-20260728.json';
const DEFAULT_RELEASE =
  'data/buildops/town-expansion-r1-2026-07-28.report.json';
const DEFAULT_OUT =
  'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.manifest.json';
const SANCTUARY_SEARCH = {
  id: 'north-natural-fauna-sanctuary',
  // Chunk centers in generated north r.-1/r.0, z-region -3/-2 terrain.
  // One accepted center per chunk lets the executor unload and freeze every
  // relocated UUID without reactivating an earlier sanctuary resident.
  minX: -1016,
  maxX: 1528,
  minZ: -2024,
  maxZ: -264,
  step: 4,
  localRadius: 2,
  maximumLocalGrade: 3,
};
const SAFE_GROUND = new Set([
  'minecraft:grass_block',
  'minecraft:dirt',
  'minecraft:coarse_dirt',
  'minecraft:podzol',
  'minecraft:moss_block',
  'minecraft:sand',
  'minecraft:stone',
]);
const COMMON_IMMUTABLE_PATHS = [
  'CustomName',
  'Owner',
  'OwnerUUID',
  'Leash',
  'leash',
  'Passengers',
  'Items',
  'PersistenceRequired',
  'Invulnerable',
  'NoAI',
  'Silent',
  'Glowing',
  'Tags',
  'LoveCause',
];
const TYPE_IMMUTABLE_PATHS = {
  'minecraft:bee': [
    'HasNectar', 'HasStung', 'AngryAt',
    // Record both legacy and modern names even though the executor classifies
    // these environment-driven navigation links as volatile during comparison.
    // Their before/after values must remain visible in the durable journal.
    'HivePos', 'hive_pos', 'FlowerPos', 'flower_pos',
  ],
  'minecraft:chest_minecart': ['Items', 'LootTable', 'LootTableSeed'],
  'minecraft:item': ['Item'],
  'minecraft:chicken': ['IsChickenJockey'],
  'minecraft:donkey': [
    'Items', 'ChestedHorse', 'SaddleItem', 'ArmorItem',
    'Tame', 'Temper', 'Bred',
  ],
  'minecraft:fox': ['Trusted', 'Type', 'Sitting'],
  'minecraft:pig': ['Saddle', 'SaddleItem'],
  'minecraft:sheep': ['Color', 'Sheared'],
  'minecraft:turtle': [
    'HomePosX', 'HomePosY', 'HomePosZ',
    'TravelPosX', 'TravelPosY', 'TravelPosZ', 'HasEgg',
  ],
  'minecraft:wolf': ['Owner', 'CollarColor', 'Sitting', 'Tame', 'variant'],
};

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(filename) {
  return sha256Bytes(fs.readFileSync(filename));
}

function snapshotIdentity(directory) {
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  if (!files.length) throw new Error(`no Anvil region files in ${directory}`);
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    directory,
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function directCellVolumeHit(position, box) {
  return (
    box[0] <= position[0] && position[0] <= box[3] + 1
    && box[1] <= position[1] && position[1] <= box[4] + 1
    && box[2] <= position[2] && position[2] <= box[5] + 1
  );
}

export function classifyLabel(label) {
  if (ORDINARY_LIVESTOCK.has(label)) return 'ordinary-livestock';
  if (TRANSIENT_ENTITIES.has(label)) return 'transient-no-move';
  if (DROPPED_ITEM_ENTITIES.has(label)) return 'dropped-item-relocatable';
  if (SPECIAL_ENTITIES.has(label)) return 'special-relocatable';
  return 'unknown-hard-stop';
}

export function entityExecutionPriority(entity) {
  if (entity.entityType === 'minecraft:item') return 0;
  if (entity.entityType === 'minecraft:chest_minecart') return 1;
  if (entity.policyClass === 'special-relocatable') return 2;
  return 3;
}

export function duplicateCapturedUuidKeys(blockers) {
  const counts = new Map();
  for (const blocker of blockers) {
    const uuid = blocker.nbtCapture?.uuidIntArray;
    if (!Array.isArray(uuid) || uuid.length !== 4) continue;
    const key = uuid.join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count !== 1)
      .map(([key]) => key),
  );
}

export function capturedSourceMatchReasons(blocker, blockers) {
  const captured = blocker.nbtCapture?.capturedPosition;
  if (!Array.isArray(captured) || captured.length !== 3) {
    return ['missing-captured-position'];
  }
  const sameType = blockers.filter((candidate) => candidate.label === blocker.label);
  const distances = sameType.map((candidate) => ({
    candidate,
    distance: Math.hypot(
      captured[0] - candidate.position[0],
      captured[1] - candidate.position[1],
      captured[2] - candidate.position[2],
    ),
  }));
  const assigned = distances.find((entry) => entry.candidate === blocker);
  if (!assigned) return ['source-observation-not-in-crosswalk'];
  const minimum = Math.min(...distances.map((entry) => entry.distance));
  if (assigned.distance > minimum + 1e-9) {
    return ['captured-position-nearest-different-observation'];
  }
  if (
    distances.filter((entry) => Math.abs(entry.distance - minimum) <= 1e-9)
      .length !== 1
  ) {
    return ['captured-position-source-tie'];
  }
  return [];
}

function normalizedPathValue(entry) {
  if (!entry || typeof entry.present !== 'boolean') {
    return { present: false, captureMissing: true };
  }
  if (!entry.present) return { present: false };
  const marker = ' has the following entity data: ';
  const markerIndex = entry.reply?.indexOf(marker) ?? -1;
  return {
    present: true,
    value: markerIndex >= 0
      ? entry.reply.slice(markerIndex + marker.length).trim()
      : null,
  };
}

export function immutableProjection(capture) {
  if (!capture?.entityType) return null;
  const paths = [...new Set([
    ...COMMON_IMMUTABLE_PATHS,
    ...(TYPE_IMMUTABLE_PATHS[capture.entityType] ?? []),
  ])].sort();
  const values = Object.fromEntries(paths.map((field) => [
    field,
    normalizedPathValue(capture.preservationPaths?.[field]),
  ]));
  return {
    entityType: capture.entityType,
    paths,
    values,
    vehicleRelationPresent: capture.vehicleRelationPresent === true,
    passengerRelationPresent: capture.passengerRelationPresent === true,
  };
}

function relocationHardStopReasons(capture) {
  if (!capture) return ['missing-path-level-nbt-capture'];
  const reasons = [];
  if (capture.identityChecksPassed !== true) reasons.push('identity-check-failed');
  if (
    capture.captureRadius !== 1
    || capture.candidateCountWithinCaptureRadius < 1
    || capture.sourcePositionDistance > capture.captureRadius
  ) {
    reasons.push('captured-position-too-far-from-gate-observation');
  }
  if (!/^[a-f0-9]{64}$/.test(capture.stateProjectionSha256 ?? '')) {
    reasons.push('missing-state-projection-hash');
  }
  const projection = immutableProjection(capture);
  for (const [field, value] of Object.entries(projection?.values ?? {})) {
    if (value.captureMissing === true) {
      reasons.push(`missing-immutable-path-capture:${field}`);
    }
  }
  const valueFor = (field) => {
    const entry = capture.preservationPaths?.[field];
    if (!entry?.present) return null;
    const marker = ' has the following entity data: ';
    return entry.reply.includes(marker)
      ? entry.reply.split(marker, 2)[1].trim()
      : null;
  };
  const keyedChecks = [
    ['leash-state', ['Leash', 'leash']],
  ];
  const isMaterialValue = (value) => (
    value !== null
    && !['[]', '{}', '0b', 'false'].includes(value)
  );
  for (const [reason, fields] of keyedChecks) {
    if (fields.some((field) => isMaterialValue(valueFor(field)))) {
      reasons.push(reason);
    }
  }
  if (capture.vehicleRelationPresent === true) reasons.push('vehicle-state');
  if (capture.passengerRelationPresent === true) {
    reasons.push('passenger-relation');
  }
  return reasons;
}

function captureBindingReasons(blocker, blockers) {
  const capture = blocker.nbtCapture;
  if (!capture) return ['missing-path-level-nbt-capture'];
  const reasons = [];
  if (capture.identityChecksPassed !== true) reasons.push('identity-check-failed');
  if (
    capture.captureRadius !== 1
    || capture.candidateCountWithinCaptureRadius < 1
    || capture.sourcePositionDistance > capture.captureRadius
  ) {
    reasons.push('captured-position-too-far-from-gate-observation');
  }
  reasons.push(...capturedSourceMatchReasons(blocker, blockers));
  return [...new Set(reasons)];
}

async function surfaceAt(snapshot, x, z) {
  const column = await snapshot.readColumn(x, z, -64, 180);
  if (!column) return null;
  for (let y = 179; y >= -63; y -= 1) {
    const block = column.get(y);
    if (
      isAirBlock(block)
      || isFoliageBlock(block)
      || isReplaceableBlock(block)
    ) {
      continue;
    }
    return {
      x,
      z,
      y,
      ground: block,
      headOne: column.get(y + 1),
      headTwo: column.get(y + 2),
    };
  }
  return null;
}

export async function surveySanctuary(
  snapshot,
  targetHaloEnvelope,
  needed,
  excludedDestinationChunks = new Set(),
) {
  const accepted = [];
  const acceptedChunks = new Set();
  let evaluatedCenters = 0;
  let missingColumns = 0;
  for (
    let x = SANCTUARY_SEARCH.minX;
    x <= SANCTUARY_SEARCH.maxX;
    x += SANCTUARY_SEARCH.step
  ) {
    for (
      let z = SANCTUARY_SEARCH.minZ;
      z <= SANCTUARY_SEARCH.maxZ;
      z += SANCTUARY_SEARCH.step
    ) {
      evaluatedCenters += 1;
      const localX = ((x % 16) + 16) % 16;
      const localZ = ((z % 16) + 16) % 16;
      if (localX < 2 || localX > 13 || localZ < 2 || localZ > 13) {
        continue;
      }
      const destinationChunk = [Math.floor(x / 16), Math.floor(z / 16)];
      const destinationChunkKey = destinationChunk.join(',');
      if (excludedDestinationChunks.has(destinationChunkKey)) continue;
      if (acceptedChunks.has(destinationChunkKey)) continue;
      const outsideTargetHalo = (
        x < targetHaloEnvelope[0]
        || x > targetHaloEnvelope[3]
        || z < targetHaloEnvelope[2]
        || z > targetHaloEnvelope[5]
      );
      if (!outsideTargetHalo) continue;
      const columns = [];
      let valid = true;
      for (
        let dx = -SANCTUARY_SEARCH.localRadius;
        dx <= SANCTUARY_SEARCH.localRadius && valid;
        dx += 1
      ) {
        for (
          let dz = -SANCTUARY_SEARCH.localRadius;
          dz <= SANCTUARY_SEARCH.localRadius;
          dz += 1
        ) {
          const surface = await surfaceAt(snapshot, x + dx, z + dz);
          if (!surface) {
            missingColumns += 1;
            valid = false;
            break;
          }
          if (
            !SAFE_GROUND.has(surface.ground)
            || !isAirBlock(surface.headOne)
            || !isAirBlock(surface.headTwo)
          ) {
            valid = false;
            break;
          }
          columns.push(surface);
        }
      }
      if (!valid) continue;
      const elevations = columns.map((column) => column.y);
      const yMin = Math.min(...elevations);
      const yMax = Math.max(...elevations);
      if (yMax - yMin > SANCTUARY_SEARCH.maximumLocalGrade) continue;
      const center = columns.find(
        (column) => column.x === x && column.z === z,
      );
      if (!center) throw new Error(`sanctuary center ${x},${z} was not surveyed`);
      acceptedChunks.add(destinationChunkKey);
      accepted.push({
        slot: accepted.length + 1,
        destination: [x + 0.5, center.y + 1, z + 0.5],
        destinationChunk,
        centerGround: center.ground,
        centerGroundPosition: [x, center.y, z],
        localFootingBounds: [x - 2, z - 2, x + 2, z + 2],
        elevationRange: [yMin, yMax],
        groundMaterials: [...new Set(
          columns.map((column) => column.ground),
        )].sort(),
        footingColumns: columns.map((column) => ({
          x: column.x,
          y: column.y,
          z: column.z,
          ground: column.ground,
          headOne: column.headOne,
          headTwo: column.headTwo,
        })),
        generatedColumns: columns.length,
        dryColumns: columns.length,
        twoBlockHeadroomColumns: columns.length,
        outsideTargetHalo,
        footingEvidenceSha256: sha256Bytes(stableJson(columns)),
      });
    }
  }
  if (accepted.length < needed) {
    throw new Error(
      `sanctuary has ${accepted.length} verified slots; ${needed} required`,
    );
  }
  return {
    search: SANCTUARY_SEARCH,
    evaluatedCenters,
    missingColumns,
    verifiedSlotCount: accepted.length,
    assignedSlotCount: needed,
    slots: accepted,
  };
}

function parseArgs(argv) {
  const args = {
    gate: DEFAULT_GATE,
    release: DEFAULT_RELEASE,
    out: DEFAULT_OUT,
    excludeDestinations: [],
    preferDestinations: [],
    sanctuarySnapshot: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (![
      '--gate', '--release', '--out', '--exclude-destinations',
      '--prefer-destinations', '--sanctuary-snapshot',
    ].includes(key)) {
      throw new Error(`unknown argument ${key}`);
    }
    if (key === '--exclude-destinations') {
      args.excludeDestinations.push(argv[index + 1]);
    } else if (key === '--prefer-destinations') {
      args.preferDestinations.push(argv[index + 1]);
    } else if (key === '--sanctuary-snapshot') {
      args.sanctuarySnapshot = argv[index + 1];
    } else {
      args[key.slice(2)] = argv[index + 1];
    }
    index += 1;
  }
  return args;
}

export async function generatePlan(options = {}) {
  const gatePath = options.gate ?? DEFAULT_GATE;
  const releasePath = options.release ?? DEFAULT_RELEASE;
  const outPath = options.out ?? DEFAULT_OUT;
  const exclusionPaths = options.excludeDestinations ?? [];
  const preferencePaths = options.preferDestinations ?? [];
  const exclusionReports = exclusionPaths.map((filename) => {
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const chunks = [];
    for (const row of report.rows ?? []) {
      if (
        row.status !== 'PASS'
        && Array.isArray(row.destinationChunk)
        && row.destinationChunk.length === 2
      ) {
        chunks.push(row.destinationChunk);
      }
    }
    for (const chunk of report.badDestinationChunks ?? []) {
      if (Array.isArray(chunk) && chunk.length === 2) chunks.push(chunk);
    }
    return {
      file: filename,
      sha256: sha256File(filename),
      chunks,
    };
  });
  const excludedDestinationChunks = new Set(
    exclusionReports.flatMap((report) => report.chunks)
      .map((chunk) => chunk.join(',')),
  );
  const preferenceReports = preferencePaths.map((filename, reportIndex) => {
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const rows = (report.rows ?? []).filter(
      (row) => (
        row.status === 'PASS'
        && Array.isArray(row.destinationChunk)
        && row.destinationChunk.length === 2
      ),
    );
    return {
      file: filename,
      sha256: sha256File(filename),
      reportIndex,
      passedDestinationChunks: rows.map((row) => row.destinationChunk),
      passedDestinations: rows
        .map((row) => row.destination)
        .filter((destination) => (
          Array.isArray(destination) && destination.length === 3
        )),
    };
  });
  const preferredDestinationRank = new Map();
  const preferredChunkRank = new Map();
  for (const report of preferenceReports) {
    for (const destination of report.passedDestinations) {
      const key = stableJson(destination);
      if (!preferredDestinationRank.has(key)) {
        preferredDestinationRank.set(key, report.reportIndex);
      }
    }
    for (const chunk of report.passedDestinationChunks) {
      const key = chunk.join(',');
      if (!preferredChunkRank.has(key)) {
        preferredChunkRank.set(key, report.reportIndex);
      }
    }
  }
  const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (
    gate.schemaVersion !== 2
    || gate.forceLoadAudit?.mode !== 'sparse-target-halo-batched'
    || gate.forceLoadAudit?.cleanupErrors?.length !== 0
    || gate.forceLoadAudit?.allTemporaryChunksReleased !== true
    || gate.forceLoadAudit?.finalSetMatchesPreExistingSet !== true
    || gate.packages?.length !== 1
  ) {
    throw new Error('gate does not satisfy the schema-2 restoration contract');
  }
  const gatePackage = gate.packages[0];
  const operationPath = gatePackage.file;
  if (
    !fs.existsSync(operationPath)
    || gatePackage.operationSha256 !== sha256File(operationPath)
  ) {
    throw new Error('gate operation identity does not match the local package');
  }
  const snapshotDirectory = (
    options.sanctuarySnapshot
    ?? release.sourceSnapshot?.directory
  );
  if (!snapshotDirectory || !fs.existsSync(snapshotDirectory)) {
    throw new Error('release report has no available immutable snapshot');
  }
  const sanctuarySnapshot = snapshotIdentity(snapshotDirectory);
  if (
    !options.sanctuarySnapshot
    && sanctuarySnapshot.sha256 !== release.sourceSnapshot.sha256
  ) {
    throw new Error('default sanctuary snapshot identity changed');
  }
  const blockers = gatePackage.blockers ?? [];
  const captured = blockers.filter((blocker) => blocker.nbtCapture);
  const bindingReasonsByObservation = new Map(
    captured.map((blocker) => [
      blocker,
      captureBindingReasons(blocker, blockers),
    ]),
  );
  const verifiedCaptured = captured.filter(
    (blocker) => bindingReasonsByObservation.get(blocker).length === 0,
  );
  const groupedByUuid = new Map();
  for (const blocker of verifiedCaptured) {
    const uuid = blocker.nbtCapture?.uuidIntArray;
    if (!Array.isArray(uuid) || uuid.length !== 4) {
      throw new Error('captured blocker lacks a four-integer UUID');
    }
    const key = uuid.join(',');
    if (!groupedByUuid.has(key)) groupedByUuid.set(key, []);
    groupedByUuid.get(key).push(blocker);
  }
  const uuidGroups = [...groupedByUuid.entries()].map(([uuidKey, observations]) => {
    const labels = new Set(observations.map((entry) => entry.label));
    const entityTypes = new Set(
      observations.map((entry) => entry.nbtCapture.entityType),
    );
    const immutableProjections = observations.map(
      (entry) => immutableProjection(entry.nbtCapture),
    );
    const immutableHashes = immutableProjections.map(
      (projection) => sha256Bytes(stableJson(projection)),
    );
    const current = observations.at(-1);
    const hardStopReasons = relocationHardStopReasons(current.nbtCapture);
    if (labels.size !== 1) hardStopReasons.push('uuid-label-disagreement');
    if (entityTypes.size !== 1) hardStopReasons.push('uuid-type-disagreement');
    if (new Set(immutableHashes).size !== 1) {
      hardStopReasons.push('uuid-immutable-projection-disagreement');
    }
    const policyClass = classifyLabel(current.label);
    if (policyClass === 'unknown-hard-stop') {
      hardStopReasons.push('unknown-entity-type');
    }
    return {
      uuidKey,
      uuidIntArray: current.nbtCapture.uuidIntArray,
      uuidSelector: current.nbtCapture.uuidSelector,
      label: current.label,
      entityType: current.nbtCapture.entityType,
      policyClass,
      immutableProjection: immutableProjections.at(-1),
      immutableProjectionSha256: immutableHashes.at(-1),
      historicalStateProjectionSha256: [...new Set(
        observations.map((entry) => entry.nbtCapture.stateProjectionSha256),
      )].sort(),
      hardStopReasons: [...new Set(hardStopReasons)],
      currentCapture: current.nbtCapture,
      observations,
    };
  });
  const snapshot = new AnvilSnapshot(snapshotDirectory);
  const sanctuary = await surveySanctuary(
    snapshot,
    gatePackage.envelope,
    uuidGroups.length,
    excludedDestinationChunks,
  );
  sanctuary.slots = sanctuary.slots.map((slot) => {
    const exactRank = preferredDestinationRank.get(
      stableJson(slot.destination),
    );
    const chunkRank = preferredChunkRank.get(
      slot.destinationChunk.join(','),
    );
    return {
      ...slot,
      preference: exactRank !== undefined
        ? 'exact-live-pass'
        : chunkRank !== undefined
          ? 'chunk-live-pass'
          : 'snapshot-only',
      preferenceReportIndex: exactRank ?? chunkRank ?? null,
    };
  }).sort((left, right) => (
    (left.preference === 'exact-live-pass' ? 0
      : left.preference === 'chunk-live-pass' ? 1 : 2)
    - (right.preference === 'exact-live-pass' ? 0
      : right.preference === 'chunk-live-pass' ? 1 : 2)
    || (left.preferenceReportIndex ?? 9999)
      - (right.preferenceReportIndex ?? 9999)
    || left.destinationChunk[0] - right.destinationChunk[0]
    || left.destinationChunk[1] - right.destinationChunk[1]
  ));
  sanctuary.slots.forEach((slot, index) => {
    slot.slot = index + 1;
  });
  const sortedGroups = [...uuidGroups].sort((left, right) => (
    entityExecutionPriority(left) - entityExecutionPriority(right)
    || left.entityType.localeCompare(right.entityType)
    || left.uuidKey.localeCompare(right.uuidKey)
  ));
  const preferredSlots = sanctuary.slots.filter(
    (slot) => slot.preference !== 'snapshot-only',
  );
  if (preferenceReports.length && preferredSlots.length < uuidGroups.length) {
    throw new Error(
      `preference reports yield ${preferredSlots.length} current-snapshot `
      + `slots; ${uuidGroups.length} required`,
    );
  }
  const availableSlots = preferenceReports.length
    ? [...preferredSlots]
    : [...sanctuary.slots];
  const assignedSlots = new Map();
  for (const group of sortedGroups.filter((entry) => entry.label === 'Turtle')) {
    const slotIndex = availableSlots.findIndex(
      (slot) => slot.centerGround === 'minecraft:sand',
    );
    if (slotIndex < 0) throw new Error('no sand sanctuary slot for turtle');
    assignedSlots.set(group.uuidKey, availableSlots.splice(slotIndex, 1)[0]);
  }
  for (const group of sortedGroups.filter((entry) => entry.label !== 'Turtle')) {
    if (!availableSlots.length) throw new Error('sanctuary assignment exhausted');
    assignedSlots.set(group.uuidKey, availableSlots.shift());
  }
  const candidateRows = sortedGroups.map((group, index) => {
    const slot = assignedSlots.get(group.uuidKey);
    const collisionObservations = group.observations.map((blocker) => ({
      position: blocker.position,
      capturedPosition: blocker.nbtCapture.capturedPosition,
      operationLine: blocker.operationLine,
      targetBox: blocker.targetBox,
      collisionClass: directCellVolumeHit(blocker.position, blocker.targetBox)
        ? 'direct-cell-volume'
        : 'conservative-halo-only',
    }));
    const rail = group.entityType === 'minecraft:chest_minecart';
    const destination = rail
      ? [
          slot.centerGroundPosition[0] + 0.5,
          slot.centerGroundPosition[1] + 1.0625,
          slot.centerGroundPosition[2] + 0.5,
        ]
      : slot.destination;
    return {
      transactionIndex: index + 1,
      executionPriority: entityExecutionPriority(group),
      uuidKey: group.uuidKey,
      uuidIntArray: group.uuidIntArray,
      uuidSelector: group.uuidSelector,
      label: group.label,
      entityType: group.entityType,
      policyClass: group.policyClass,
      disposition: group.hardStopReasons.length
        ? 'HARD_STOP'
        : 'ELIGIBLE_REVERSIBLE_RELOCATION',
      hardStopReasons: group.hardStopReasons,
      currentIdentity: {
        lastCapturedPosition: group.currentCapture.capturedPosition,
        sourceChunk: [
          Math.floor(group.currentCapture.capturedPosition[0] / 16),
          Math.floor(group.currentCapture.capturedPosition[2] / 16),
        ],
        typeVerificationCount: group.currentCapture.typeVerificationCount,
      },
      immutableProjection: group.immutableProjection,
      immutableProjectionSha256: group.immutableProjectionSha256,
      capturedFullProjectionSha256:
        group.currentCapture.stateProjectionSha256,
      historicalStateProjectionSha256:
        group.historicalStateProjectionSha256,
      collisionObservations,
      sanctuarySlot: {
        ...slot,
        destination,
        footingStrategy: rail
          ? 'temporary-exact-north-south-rail'
          : group.label === 'Turtle'
            ? 'natural-sand'
            : 'natural-dry-generated-ground',
        temporaryRail: rail
          ? {
              position: [
                slot.centerGroundPosition[0],
                slot.centerGroundPosition[1] + 1,
                slot.centerGroundPosition[2],
              ],
              before: slot.footingColumns.find(
                (column) => (
                  column.x === slot.centerGroundPosition[0]
                  && column.z === slot.centerGroundPosition[2]
                ),
              ).headOne,
              during: 'minecraft:rail[shape=north_south,waterlogged=false]',
              after: slot.footingColumns.find(
                (column) => (
                  column.x === slot.centerGroundPosition[0]
                  && column.z === slot.centerGroundPosition[2]
                ),
              ).headOne,
            }
          : null,
      },
    };
  });
  const observationRows = blockers.map((blocker, index) => ({
    observationIndex: index + 1,
    label: blocker.label,
    policyClass: classifyLabel(blocker.label),
    collisionClass: directCellVolumeHit(blocker.position, blocker.targetBox)
      ? 'direct-cell-volume'
      : 'conservative-halo-only',
    position: blocker.position,
    operationLine: blocker.operationLine,
    targetBox: blocker.targetBox,
    capturedUuidKey: blocker.nbtCapture?.uuidIntArray?.join(',') ?? null,
    nbtCaptureError: blocker.nbtCaptureError ?? null,
    captureBindingReasons:
      bindingReasonsByObservation.get(blocker) ?? [],
    disposition: blocker.nbtCapture
      && (bindingReasonsByObservation.get(blocker)?.length ?? 0) === 0
      ? 'AGGREGATED_BY_UUID'
      : classifyLabel(blocker.label) === 'transient-no-move'
        ? 'ABSENCE_ONLY_FRESH_GATE_REQUIRED'
        : 'UNRESOLVED_HARD_STOP',
  }));
  const eligible = candidateRows.filter(
    (row) => row.disposition === 'ELIGIBLE_REVERSIBLE_RELOCATION',
  );
  const unresolvedNonTransient = observationRows.filter(
    (row) => (
      row.disposition === 'UNRESOLVED_HARD_STOP'
      && row.policyClass !== 'transient-no-move'
    ),
  );
  const transientAbsenceOnly = observationRows.filter(
    (row) => row.disposition === 'ABSENCE_ONLY_FRESH_GATE_REQUIRED',
  );
  const hardStops = candidateRows.filter(
    (row) => row.disposition === 'HARD_STOP',
  );
  const transactionRows = eligible.map((row, index) => ({
    ...row,
    transactionIndex: index + 1,
  }));
  const manifest = {
    schemaVersion: 2,
    generatedAtUtc: new Date().toISOString(),
    status: eligible.length
      ? 'READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED'
      : unresolvedNonTransient.length
        ? 'BLOCKED_UNRESOLVED_NONTRANSIENT_ENTITIES'
      : transientAbsenceOnly.length
        ? 'BLOCKED_TRANSIENT_ABSENCE_NOT_PROVEN'
        : hardStops.length
          ? 'BLOCKED_TRANSACTION_ROW_INVARIANT'
          : 'READY_FOR_SEPARATE_EXPLICIT_AUTHORIZATION',
    authorizedForExecution: false,
    authorizedForPartialEvacuation: eligible.length > 0,
    worldReleaseAuthorized: (
      unresolvedNonTransient.length === 0
      && transientAbsenceOnly.length === 0
      && hardStops.length === 0
    ),
    source: {
      gate: gatePath,
      gateSha256: sha256File(gatePath),
      gateGeneratedAtUtc: gate.generatedAtUtc,
      operations: operationPath,
      operationSha256: gatePackage.operationSha256,
      rollback: release.artifacts?.rollback?.file
        ?? 'data/buildops/town-expansion-r1-2026-07-28.rollback.txt',
      snapshotDirectory,
      snapshotSha256: sanctuarySnapshot.sha256,
      sanctuarySnapshot,
      constructionSnapshot: release.sourceSnapshot,
      targetHaloEnvelope: gatePackage.envelope,
      destinationExclusions: exclusionReports,
      destinationPreferences: preferenceReports,
      excludedDestinationChunks: [...excludedDestinationChunks]
        .map((key) => key.split(',').map(Number))
        .sort((left, right) => left[0] - right[0] || left[1] - right[1]),
    },
    counts: {
      blockerObservations: observationRows.length,
      directCellVolumeObservations: observationRows.filter(
        (row) => row.collisionClass === 'direct-cell-volume',
      ).length,
      conservativeHaloOnlyObservations: observationRows.filter(
        (row) => row.collisionClass === 'conservative-halo-only',
      ).length,
      capturedObservations: captured.length,
      verifiedCapturedObservations: verifiedCaptured.length,
      uniqueCapturedUuids: candidateRows.length,
      duplicateObservationRows:
        verifiedCaptured.length - candidateRows.length,
      eligibleTransactionRows: transactionRows.length,
      hardStopTransactionRows: hardStops.length,
      ordinaryLivestockRows: candidateRows.filter(
        (row) => row.policyClass === 'ordinary-livestock',
      ).length,
      specialRelocatableRows: candidateRows.filter(
        (row) => row.policyClass === 'special-relocatable',
      ).length,
      droppedItemRows: candidateRows.filter(
        (row) => row.policyClass === 'dropped-item-relocatable',
      ).length,
      unresolvedNonTransientObservations: unresolvedNonTransient.length,
      transientAbsenceOnlyObservations: transientAbsenceOnly.length,
    },
    sanctuary,
    policy: {
      eligibleTypes: [
        ...ORDINARY_LIVESTOCK,
        ...SPECIAL_ENTITIES,
        ...DROPPED_ITEM_ENTITIES,
      ].sort(),
      transientNoMoveTypes: [...TRANSIENT_ENTITIES].sort(),
      automaticHardStopConditions: [
        'Leash/leash',
        'vehicle relationship',
        'passenger relationship',
        'type disagreement across one UUID',
        'immutable projection disagreement across one UUID',
      ],
      invariantRule: (
        'One transaction row exists per UUID. The executor re-queries UUID/type/'
        + 'Pos and every listed immutable path immediately before movement, '
        + 'journals it durably, teleports exactly once, and requires ownership, '
        + 'tame/trust/home/container/equipment/variant and other immutable paths '
        + 'to remain byte-equivalent. Tick-derived Age/EggLayTime values may drift.'
      ),
      transientRule: (
        'Egg projectiles are never teleported or killed. A fresh gate must prove '
        + 'their absence. Dropped item entities with captured UUIDs are relocated.'
      ),
    },
    transactionContract: {
      executionBlocked: eligible.length === 0,
      partialEvacuationAuthorized: eligible.length > 0,
      worldReleaseBlocked: (
        unresolvedNonTransient.length > 0
        || transientAbsenceOnly.length > 0
        || hardStops.length > 0
      ),
      requiredBeforeAnyMove: [
        'fresh schema-2 gate with --capture-blocker-nbt',
        'one unique transaction row per captured UUID',
        'zero hard-stop reasons for every transaction row',
        'fresh read-only sanctuary footing/headroom probes',
        'zero players or unrelated entities at every destination',
        'durable before journal written before first teleport',
      ],
      forward: (
        'One UUID-guarded teleport at a time; verify destination UUID/count and '
        + 'protected-NBT projection immediately; stop on first mismatch.'
      ),
      rollback: (
        'Before block construction, reverse successful journal rows in reverse '
        + 'order to their exact source Pos/Rotation, then verify UUID/count and '
        + 'protected-NBT projection. After construction, direct-volume entities '
        + 'remain settled; halo-only returns require a post-build AABB landing audit.'
      ),
      specialEntities: (
        'Captured ordinary, special, and dropped-item UUIDs may move. Ownership, '
        + 'tame/trust/home/container state are immutable; attached leash, vehicle, '
        + 'or passenger relations remain hard stops.'
      ),
    },
    unresolvedObservations: observationRows.filter(
      (row) => row.disposition !== 'AGGREGATED_BY_UUID',
    ),
    observations: observationRows,
    blockedUuidRows: hardStops,
    transactionRows,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, outPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { manifest, outPath } = await generatePlan(options);
  console.log(JSON.stringify({
    status: manifest.status,
    authorizedForExecution: manifest.authorizedForExecution,
    authorizedForPartialEvacuation:
      manifest.authorizedForPartialEvacuation,
    worldReleaseAuthorized: manifest.worldReleaseAuthorized,
    output: outPath,
    counts: manifest.counts,
    sanctuarySlots: manifest.sanctuary.verifiedSlotCount,
  }, null, 2));
}

const isMain = (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);
if (isMain) {
  main().catch((error) => {
    console.error(error.stack ?? error);
    process.exitCode = 1;
  });
}
