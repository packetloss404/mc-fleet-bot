#!/usr/bin/env node
/**
 * Compile the strongest deterministic D05/FM-01 future-state proposal that the
 * accepted planning policy and immutable evidence currently support.
 *
 * This is an offline, read-only compiler. It emits sparse proposal manifests
 * and exhaustive support-gap status families, but deliberately emits no
 * accepted future cells, construction cells, operations, or world edits.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import nbt from 'prismarine-nbt';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-05T01:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d05-future-state.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d05-future-state.md',
));

const INPUTS = Object.freeze({
  ownerAcceptance: 'masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  ownerReviewBundle: 'masterplans/05-combined-zones/phase1-owner-review-bundle.json',
  d05OwnerPacket: 'masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  d05FutureMountain:
    'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05FutureStateContract:
    'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d05HydrologyBaseline:
    'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicConditionAccess:
    'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d06EgressGeometry:
    'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  connectorGeometry: 'masterplans/05-combined-zones/phase1-connector-geometry.json',
  completeSaveIntakeAudit:
    'masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const ADDED_SOLID_MIN_Y = 72;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const LAVA = new Set(['minecraft:lava']);
const FROZEN = new Set([
  'minecraft:ice',
  'minecraft:packed_ice',
  'minecraft:blue_ice',
  'minecraft:frosted_ice',
]);
const SNOW = new Set(['minecraft:snow', 'minecraft:snow_block', 'minecraft:powder_snow']);
const COORDINATE_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const DESIGN_SURFACE_PREAMBLE = 'combined-zones-d05-design-surface-v1';
const SPARSE_SOLID_PREAMBLE = 'combined-zones-d05-sparse-solid-intervals-v1';
const SUPPORT_GAP_PREAMBLE = 'combined-zones-d05-support-gap-intervals-v1';
const SPARSE_TYPED_PREAMBLE = 'combined-zones-d05-proposed-typed-sparse-family-v1';
const SPARSE_SUPPORT_PREAMBLE = 'combined-zones-d05-support-status-sparse-family-v1';
const EMPTY_COORDINATE_HASH = crypto.createHash('sha256')
  .update(`${COORDINATE_PREAMBLE}\n`).digest('hex');

function invariant(condition, message) {
  if (!condition) throw new Error(`D05 future-state input rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data) };
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(directory, name));
    bytes += data.length;
    digest.update(name);
    digest.update('\0');
    digest.update(data);
    digest.update('\0');
  }
  return {
    path: relative(directory),
    sha256: digest.digest('hex'),
    regionFileCount: names.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) {
    return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
  }
  if (input && typeof input === 'object' && 'high' in input && 'low' in input) {
    return (BigInt(input.high | 0) << 32n) | BigInt(input.low >>> 0);
  }
  return BigInt(input);
}

function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((longToBig(values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}

function paletteIndex(container, index, minimumBits) {
  if (!container?.palette?.length || container.palette.length === 1) return 0;
  return packedValue(
    container.data,
    Math.max(minimumBits, Math.ceil(Math.log2(container.palette.length))),
    index,
  );
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

class SnapshotReader {
  constructor(directory) {
    this.directory = directory;
    this.regions = new Map();
    this.chunks = new Map();
  }

  region(rx, rz) {
    const key = `${rx},${rz}`;
    if (!this.regions.has(key)) {
      const filename = path.join(this.directory, `r.${rx}.${rz}.mca`);
      this.regions.set(key, fs.existsSync(filename) ? fs.readFileSync(filename) : null);
    }
    return this.regions.get(key);
  }

  async chunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const buffer = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    invariant(buffer, `missing region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    invariant(sectorOffset && sectorCount, `missing chunk ${key}`);
    const offset = sectorOffset * 4096;
    const size = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${key}`);
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const data = nbt.simplify(parsed);
    invariant(data?.Status === 'minecraft:full', `chunk ${key} is not minecraft:full`);
    const result = {
      data,
      sections: new Map((data.sections ?? []).map((section) => [Number(section.Y), section])),
    };
    this.chunks.set(key, result);
    if (this.chunks.size > 80) this.chunks.delete(this.chunks.keys().next().value);
    return result;
  }

  async biome(x, y, z) {
    const { sections } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const biomes = sections.get(Math.floor(y / 16))?.biomes;
    if (!biomes?.palette?.length) return null;
    const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
    return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
  }

  async surface(x, z) {
    const { data, sections } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const columnIndex = (z & 15) * 16 + (x & 15);
    const heightMap = data.Heightmaps?.WORLD_SURFACE ?? data.Heightmaps?.WORLD_SURFACE_WG;
    let top = heightMap ? WORLD_MIN_Y + packedValue(heightMap, 9, columnIndex) - 1 : WORLD_MAX_Y;
    top = Math.min(WORLD_MAX_Y, top);
    for (let y = top; y >= WORLD_MIN_Y; y -= 1) {
      const states = sections.get(Math.floor(y / 16))?.block_states;
      const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
      const state = states?.palette?.length
        ? states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' }
        : { Name: 'minecraft:air' };
      if (!AIR.has(state.Name)) return { x, y, z, state, biome: await this.biome(x, y, z) };
    }
    return { x, y: WORLD_MIN_Y - 1, z, state: { Name: 'minecraft:air' }, biome: null };
  }
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

function boundsOf(cells) {
  if (cells.length === 0) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${COORDINATE_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function coordinateHashWithoutFinalNewline(cells, preamble) {
  const records = uniqueCells(cells).map(({ x, y, z }) => `${x},${y},${z}`).join('\n');
  return sha256(`${preamble}\n${records}`);
}

function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return left.filter((cell) => !excluded.has(cellKey(cell)));
}

function dilate(cells, radius) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
        }
      }
    }
  }
  return uniqueCells(result);
}

function byColumn(cells) {
  const result = new Map();
  for (const { x, y, z } of uniqueCells(cells)) {
    const key = columnKey(x, z);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(y);
  }
  for (const ys of result.values()) ys.sort((a, b) => a - b);
  return result;
}

function intervalRanges(start, end, excludedY = []) {
  if (start > end) return [];
  const excluded = [...new Set(excludedY.filter((y) => y >= start && y <= end))]
    .sort((a, b) => a - b);
  const ranges = [];
  let cursor = start;
  for (const y of excluded) {
    if (cursor < y) ranges.push({ start: cursor, end: y - 1 });
    cursor = y + 1;
  }
  if (cursor <= end) ranges.push({ start: cursor, end });
  return ranges;
}

function rangesText(ranges) {
  return ranges.length === 0
    ? '-'
    : ranges.map(({ start, end }) => `${start}..${end}`).join(',');
}

function rangesCount(ranges) {
  return ranges.reduce((sum, { start, end }) => sum + end - start + 1, 0);
}

function removePoint(ranges, point) {
  const result = [];
  for (const range of ranges) {
    if (point < range.start || point > range.end) result.push(range);
    else {
      if (range.start < point) result.push({ start: range.start, end: point - 1 });
      if (point < range.end) result.push({ start: point + 1, end: range.end });
    }
  }
  return result;
}

function familyForName(name) {
  if (WATER.has(name)) return 'water';
  if (LAVA.has(name)) return 'lava';
  if (FROZEN.has(name)) return 'frozen';
  if (SNOW.has(name)) return 'snow';
  return 'other';
}

function canonicalState(name) {
  return JSON.stringify({ Name: name });
}

function mountainSurface(x, z, model) {
  const dx = x - model.center.x;
  const dz = z - model.center.z;
  const xDenominator = dx < 0 ? model.extents.west : model.extents.east;
  const zDenominator = dz < 0 ? model.extents.north : model.extents.south;
  if (Math.abs(dx) > xDenominator || Math.abs(dz) > zDenominator) return null;
  let numerator;
  let denominator;
  if (Math.abs(dx) * zDenominator >= Math.abs(dz) * xDenominator) {
    numerator = Math.abs(dx);
    denominator = xDenominator;
  } else {
    numerator = Math.abs(dz);
    denominator = zDenominator;
  }
  const rise = Math.floor(
    (model.peakSurfaceY - model.baseSurfaceY) * (denominator - numerator) / denominator,
  );
  return model.baseSurfaceY + rise;
}

function buildB08Interaction(connector) {
  const excavation = [];
  for (const point of connector.serviceTunnelCenterline.centerline.points) {
    for (const orientation of point.orientations) {
      for (let lateral = -2; lateral <= 3; lateral += 1) {
        for (let vertical = -1; vertical <= 4; vertical += 1) {
          excavation.push(orientation === 'x'
            ? { x: point.x, y: point.y + vertical, z: point.z + lateral }
            : { x: point.x + lateral, y: point.y + vertical, z: point.z });
        }
      }
    }
  }
  const interaction = dilate(uniqueCells(excavation), 1);
  const expected = connector.serviceTunnelCenterline.exactCellSets.interactionUnion;
  invariant(interaction.length === expected.cellCount, 'B08 interaction cell count drift');
  invariant(coordinateHash(interaction) === expected.coordinateSetSha256,
    'B08 interaction cell hash drift');
  return interaction;
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildB09Reservation(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, model)
    !== mountainSurface(portal.x, climbZ, model)) climbZ -= 1;
  invariant(climbZ > summit.z, 'FM-01 lacks a level summit-approach curve');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, model) === portal.y - 1
      && mountainSurface(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'FM-01 lacks its selected east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({ x: portal.x + distance, y: portal.y, z: portal.z });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({ x, y: mountainSurface(x, climbZ, model) + 1, z: climbZ });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurface(summit.x, z, model) + 1, z });
  }
  const steps = points.slice(1).map((point, index) => ({
    horizontal: Math.abs(point.x - points[index].x) + Math.abs(point.z - points[index].z),
    vertical: point.y - points[index].y,
  }));
  invariant(steps.every(({ horizontal, vertical }) => horizontal === 1 && Math.abs(vertical) <= 1),
    'FM-01 B09 centerline is not cardinal rail-buildable geometry');
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) {
      invariant(points[index - 1].y === points[index].y
        && points[index + 1].y === points[index].y,
      `FM-01 B09 curve ${index} is sloped`);
    }
  }
  const reservation = dilate(uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z },
    { x, y: y + 1, z },
  ])), 1);
  return { points, reservation, throat: { x: throatX, y: portal.y, z: portal.z, climbZ } };
}

function summarizeBounds(accumulator, cell) {
  if (!accumulator) return { minX: cell.x, maxX: cell.x, minY: cell.y, maxY: cell.y,
    minZ: cell.z, maxZ: cell.z };
  accumulator.minX = Math.min(accumulator.minX, cell.x);
  accumulator.maxX = Math.max(accumulator.maxX, cell.x);
  accumulator.minY = Math.min(accumulator.minY, cell.y);
  accumulator.maxY = Math.max(accumulator.maxY, cell.y);
  accumulator.minZ = Math.min(accumulator.minZ, cell.z);
  accumulator.maxZ = Math.max(accumulator.maxZ, cell.z);
  return accumulator;
}

const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);
const ownerAcceptance = readJson(INPUTS.ownerAcceptance);
const bundle = readJson(INPUTS.ownerReviewBundle);
const packet = readJson(INPUTS.d05OwnerPacket);
const futureMountain = readJson(INPUTS.d05FutureMountain);
const contract = readJson(INPUTS.d05FutureStateContract);
const baseline = readJson(INPUTS.d05HydrologyBaseline);
const defaults = readJson(INPUTS.d05ConservativeDefaults);
const relicSurvey = readJson(INPUTS.d05RelicConditionAccess);
const d06 = readJson(INPUTS.d06EgressGeometry);
const connector = readJson(INPUTS.connectorGeometry);
const completeSaveAudit = readJson(INPUTS.completeSaveIntakeAudit);

invariant(ownerAcceptance.acceptanceRecordPayload?.decision
  === 'ACCEPT_PLANNING_POLICY_AND_TECHNICAL_DEVELOPMENT_CHECKLIST',
'owner acceptance decision is absent or unexpected');
invariant(ownerAcceptance.effectivePlanningDisposition?.d05PlanningPolicyAccepted === true,
  'D05 planning policy was not accepted');
invariant(ownerAcceptance.effectivePlanningDisposition?.technicalHoldPassedCount === 0,
  'owner acceptance unexpectedly passes technical holds');
invariant(ownerAcceptance.disposition?.allTechnicalHoldsRetained === true,
  'owner acceptance did not retain all technical holds');
invariant(ownerAcceptance.bundleBinding?.fileSha256 === sources.ownerReviewBundle.sha256,
  'owner acceptance bundle binding is stale');
invariant(bundle.sourceBindings?.d05?.sha256 === sources.d05OwnerPacket.sha256,
  'owner-review bundle D05 packet binding is stale');
invariant(bundle.bundlePayload?.packetBindings?.d05?.sha256 === sources.d05OwnerPacket.sha256,
  'owner-review payload D05 packet binding is stale');
invariant(packet.sourceBindings?.d05FutureMountain?.sha256 === sources.d05FutureMountain.sha256,
  'D05 packet future-mountain binding is stale');
invariant(packet.sourceBindings?.d05FutureStateContract?.sha256
  === sources.d05FutureStateContract.sha256, 'D05 packet compiler-contract binding is stale');
invariant(packet.sourceBindings?.d05HydrologyBaseline?.sha256
  === sources.d05HydrologyBaseline.sha256, 'D05 packet baseline binding is stale');
invariant(packet.sourceBindings?.d05ConservativeDefaults?.sha256
  === sources.d05ConservativeDefaults.sha256, 'D05 packet default binding is stale');
invariant(packet.sourceBindings?.d05RelicConditionAccess?.sha256
  === sources.d05RelicConditionAccess.sha256, 'D05 packet relic-survey binding is stale');
invariant(contract.readinessDisposition?.futureCellCount === 0
  && contract.readinessDisposition?.constructionCellCount === 0,
  'upstream compiler contract did not remain zero-cell fail-closed');
invariant(completeSaveAudit.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save audit disposition changed and requires explicit reconciliation');

const fm01 = futureMountain.alternatives.find(({ modelId }) => (
  modelId === 'FM-01-COMPACT-EAST-FACE'
));
invariant(fm01, 'FM-01 alternative is missing');
invariant(packet.selectedFm01PlanningBasis?.modelId === fm01.modelId,
  'D05 packet does not select FM-01');
invariant(packet.b09B10SystemPlan?.b10Mountain?.modelIdentitySha256
  === fm01.modelIdentitySha256, 'D05 packet FM-01 identity is stale');

const model = {
  center: fm01.formula.center,
  extents: fm01.formula.extents,
  baseSurfaceY: fm01.formula.baseSurfaceY,
  peakSurfaceY: fm01.formula.peakSurfaceY,
};
invariant(model.center.x === 2048 && model.center.z === -828
  && model.extents.west === 100 && model.extents.east === 320
  && model.extents.north === 240 && model.extents.south === 240
  && model.baseSurfaceY === 71 && model.peakSurfaceY === 303,
  'FM-01 formula drift');

const snapshotPath = relicSurvey.sourceBindings?.immutablePhase0PostRegionSnapshot?.path;
invariant(snapshotPath, 'immutable region evidence path is missing');
const immutableSnapshot = snapshotIdentity(path.resolve(ROOT, snapshotPath));
for (const [label, expected] of [
  ['D05 baseline', baseline.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D05 relic survey', relicSurvey.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D06', d06.immutableSnapshot],
  ['future mountain', futureMountain.sourceBindings?.immutablePhase0PostRegionSnapshot],
]) {
  invariant(expected?.sha256 === immutableSnapshot.sha256, `${label} snapshot hash mismatch`);
  invariant(expected?.regionFileCount === immutableSnapshot.regionFileCount,
    `${label} snapshot region-file count mismatch`);
  invariant(expected?.bytes === immutableSnapshot.bytes, `${label} snapshot byte count mismatch`);
}

const relicCells = [];
for (const relic of defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  const core = cellsIn(relic.protectedCore.bounds);
  const expanded = cellsIn(relic.minimumPlanningExclusionShell.expandedBounds);
  const shell = difference(expanded, core);
  invariant(core.length === relic.protectedCore.cellCount
    && coordinateHash(core) === relic.protectedCore.coordinateSetSha256,
  `${relic.relicKey} protected core drift`);
  invariant(shell.length === relic.minimumPlanningExclusionShell.cellCount
    && coordinateHash(shell) === relic.minimumPlanningExclusionShell.coordinateSetSha256,
  `${relic.relicKey} planning shell drift`);
  relicCells.push(...core, ...shell);
}
const exactRelicCells = uniqueCells(relicCells);
invariant(exactRelicCells.length === packet.protectedRelicInfluencePlan
  .exactPreserveCurrentStateUnion.cellCount, 'protected relic union count drift');
invariant(coordinateHash(exactRelicCells) === packet.protectedRelicInfluencePlan
  .exactPreserveCurrentStateUnion.coordinateSetSha256, 'protected relic union hash drift');

const b08Cells = buildB08Interaction(connector);
const b09 = buildB09Reservation(model, packet.b09B10SystemPlan.b09Route);
invariant(b09.points.length === packet.b09B10SystemPlan.b09Route.pointCount,
  'B09 centerline point count drift');
invariant(b09.throat.x === packet.b09B10SystemPlan.b09Route.throat.x
  && b09.throat.y === packet.b09B10SystemPlan.b09Route.throat.y
  && b09.throat.z === packet.b09B10SystemPlan.b09Route.throat.z
  && b09.throat.climbZ === packet.b09B10SystemPlan.b09Route.throat.climbZ,
  'B09 throat drift');
invariant(b09.reservation.length === packet.b09B10SystemPlan.b09Route
  .minimumPlanningAccommodation.cellCount, 'B09 reservation count drift');
invariant(coordinateHash(b09.reservation) === packet.b09B10SystemPlan.b09Route
  .minimumPlanningAccommodation.coordinateSetSha256, 'B09 reservation hash drift');

const d06Cells = d06.egressDesigns.map((design) => {
  const cells = cellsIn(design.externalContinuationDesign.bounds);
  invariant(cells.length === design.externalContinuationDesign.cellCount,
    `${design.id} D06 cell count drift`);
  invariant(coordinateHashWithoutFinalNewline(
    cells,
    'combined-zones-d06-egress-continuation-v1',
  ) === design.externalContinuationDesign.coordinateSetSha256,
  `${design.id} D06 coordinate hash drift`);
  return { id: design.id, cells, design };
});

const relicSet = new Set(exactRelicCells.map(cellKey));
const b08Set = new Set(b08Cells.map(cellKey));
const b09Set = new Set(b09.reservation.map(cellKey));
const d06Set = new Set(d06Cells.flatMap(({ cells }) => cells).map(cellKey));
const allNoFillByColumn = byColumn(uniqueCells([
  ...exactRelicCells,
  ...b08Cells,
  ...b09.reservation,
]));
const relicByColumn = byColumn(exactRelicCells);
const b08ByColumn = byColumn(b08Cells);
const b09ByColumn = byColumn(b09.reservation);

const supportFamilyDefinitions = [
  {
    id: 'SUPPORT-STATUS-RELIC-PRESERVE',
    precedence: 1,
    proposedTreatmentClass: 'SUPPORT-RETAIN-VOID',
    status: 'PLANNING_POLICY_SELECTED_ENGINEERING_INFLUENCE_HOLD',
    ownerClassRequired: 'CZ05-PROTECTED-RELIC-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-B08-RESERVATION',
    precedence: 2,
    proposedTreatmentClass: 'SUPPORT-RETAIN-VOID',
    status: 'PLANNING_RESERVATION_SELECTED_EXACT_INTERFACE_HOLD',
    ownerClassRequired: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-B09-RESERVATION',
    precedence: 3,
    proposedTreatmentClass: 'SUPPORT-RETAIN-VOID',
    status: 'PLANNING_RESERVATION_SELECTED_SYSTEM_ACCEPTANCE_HOLD',
    ownerClassRequired: 'CZ05-Z11-FUNICULAR-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-D06-RESERVATION',
    precedence: 4,
    proposedTreatmentClass: 'SUPPORT-RETAIN-VOID',
    status: 'PLANNING_RESERVATION_SELECTED_D06_ACCEPTANCE_HOLD',
    ownerClassRequired: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-WATER-ADJACENT',
    precedence: 5,
    proposedTreatmentClass: null,
    status: 'HOLD_HYDROLOGY_AND_GEOTECHNICAL_TREATMENT_UNRESOLVED',
    ownerClassRequired: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-LAVA-ADJACENT',
    precedence: 6,
    proposedTreatmentClass: null,
    status: 'HOLD_HYDROLOGY_THERMAL_AND_GEOTECHNICAL_TREATMENT_UNRESOLVED',
    ownerClassRequired: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-FROZEN-ADJACENT',
    precedence: 7,
    proposedTreatmentClass: null,
    status: 'HOLD_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT_UNRESOLVED',
    ownerClassRequired: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-SNOW-ADJACENT',
    precedence: 8,
    proposedTreatmentClass: null,
    status: 'HOLD_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT_UNRESOLVED',
    ownerClassRequired: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
  },
  {
    id: 'SUPPORT-STATUS-OTHER-SURFACE',
    precedence: 9,
    proposedTreatmentClass: 'SUPPORT-ENGINEERED-FILL',
    status: 'PROPOSED_ENGINEERED_FILL_TECHNICAL_STATE_AND_ACCEPTANCE_HOLD',
    ownerClassRequired: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
  },
];
const supportStats = new Map(supportFamilyDefinitions.map((family) => [family.id, {
  ...family,
  cellCount: 0,
  columnCount: 0,
  sparseIntervalRecordCount: 0,
  bounds: null,
  coordinateDigest: crypto.createHash('sha256').update(`${COORDINATE_PREAMBLE}\n`),
  sparseDigest: crypto.createHash('sha256').update(`${SPARSE_SUPPORT_PREAMBLE}\n`),
}]));
const supportGapCoordinateDigest = crypto.createHash('sha256')
  .update(`${COORDINATE_PREAMBLE}\n`);
const supportGapIntervalDigest = crypto.createHash('sha256')
  .update(`${SUPPORT_GAP_PREAMBLE}\n`);
const designDigest = crypto.createHash('sha256').update(`${DESIGN_SURFACE_PREAMBLE}\n`);
const candidateDigest = crypto.createHash('sha256').update(`${SPARSE_SOLID_PREAMBLE}\n`);
const fillSparseDigest = crypto.createHash('sha256').update(`${SPARSE_TYPED_PREAMBLE}\n`);
const finishSparseDigest = crypto.createHash('sha256').update(`${SPARSE_TYPED_PREAMBLE}\n`);
const currentAdjacencyDigests = Object.fromEntries(
  ['water', 'lava', 'frozen', 'snow'].map((family) => [
    family,
    crypto.createHash('sha256').update(`${COORDINATE_PREAMBLE}\n`),
  ]),
);
const currentAdjacencyCounts = { water: 0, lava: 0, frozen: 0, snow: 0 };
const supportRawOverlap = {
  relic: 0,
  b08: 0,
  b09: 0,
  d06: 0,
  relicAndB08: 0,
  relicAndB09: 0,
  relicAndD06: 0,
  b08AndB09: 0,
  b08AndD06: 0,
  b09AndD06: 0,
  threeOrMore: 0,
};
const reader = new SnapshotReader(path.resolve(ROOT, snapshotPath));
const columnsByX = new Map();
const directStats = {
  modelledColumns: 0,
  raisedColumns: 0,
  rawAddedCells: 0,
  candidateCells: 0,
  supportGapColumns: 0,
  supportGapCells: 0,
  protectedWithheld: 0,
  b08Withheld: 0,
  b09Withheld: 0,
  fillCells: 0,
  fillColumnRecords: 0,
  fillIntervalCount: 0,
  finishCells: 0,
  lowerFinishCells: 0,
  upperFinishCells: 0,
};

function classifySupportCell(cell, currentFamily) {
  const key = cellKey(cell);
  if (relicSet.has(key)) return 'SUPPORT-STATUS-RELIC-PRESERVE';
  if (b08Set.has(key)) return 'SUPPORT-STATUS-B08-RESERVATION';
  if (b09Set.has(key)) return 'SUPPORT-STATUS-B09-RESERVATION';
  if (d06Set.has(key)) return 'SUPPORT-STATUS-D06-RESERVATION';
  if (currentFamily === 'water') return 'SUPPORT-STATUS-WATER-ADJACENT';
  if (currentFamily === 'lava') return 'SUPPORT-STATUS-LAVA-ADJACENT';
  if (currentFamily === 'frozen') return 'SUPPORT-STATUS-FROZEN-ADJACENT';
  if (currentFamily === 'snow') return 'SUPPORT-STATUS-SNOW-ADJACENT';
  return 'SUPPORT-STATUS-OTHER-SURFACE';
}

for (let x = model.center.x - model.extents.west;
  x <= model.center.x + model.extents.east; x += 1) {
  const columns = [];
  for (let z = model.center.z - model.extents.north;
    z <= model.center.z + model.extents.south; z += 1) {
    const designY = mountainSurface(x, z, model);
    const current = await reader.surface(x, z);
    const currentFamily = familyForName(current.state.Name);
    const rawStart = current.y + 1;
    const rawEnd = designY;
    directStats.modelledColumns += 1;
    designDigest.update(`${x},${z}\t${designY}\n`);
    if (rawStart <= rawEnd) {
      directStats.raisedColumns += 1;
      directStats.rawAddedCells += rawEnd - rawStart + 1;
      if (currentFamily !== 'other') currentAdjacencyCounts[currentFamily] += 1;
    }
    const supportEnd = Math.min(rawEnd, ADDED_SOLID_MIN_Y - 1);
    if (rawStart <= supportEnd) {
      directStats.supportGapColumns += 1;
      directStats.supportGapCells += supportEnd - rawStart + 1;
      supportGapIntervalDigest.update(`${x},${z}\t${rawStart}..${supportEnd}\n`);
    }
    const fillStart = Math.max(rawStart, ADDED_SOLID_MIN_Y);
    const candidateRanges = intervalRanges(
      fillStart,
      rawEnd,
      allNoFillByColumn.get(columnKey(x, z)) ?? [],
    );
    const candidateCount = rangesCount(candidateRanges);
    directStats.candidateCells += candidateCount;
    directStats.protectedWithheld += (relicByColumn.get(columnKey(x, z)) ?? [])
      .filter((y) => y >= fillStart && y <= rawEnd).length;
    directStats.b08Withheld += (b08ByColumn.get(columnKey(x, z)) ?? [])
      .filter((y) => y >= fillStart && y <= rawEnd).length;
    directStats.b09Withheld += (b09ByColumn.get(columnKey(x, z)) ?? [])
      .filter((y) => y >= fillStart && y <= rawEnd).length;
    candidateDigest.update(
      `${x},${z}\tcurrent=${current.y}\tdesign=${designY}\tadd=${rangesText(candidateRanges)}\n`,
    );
    const designCellIncluded = candidateRanges.some(({ start, end }) => (
      designY >= start && designY <= end
    ));
    const bulkRanges = designCellIncluded ? removePoint(candidateRanges, designY) : candidateRanges;
    const bulkCount = rangesCount(bulkRanges);
    if (bulkCount > 0) {
      directStats.fillCells += bulkCount;
      directStats.fillColumnRecords += 1;
      directStats.fillIntervalCount += bulkRanges.length;
      fillSparseDigest.update(
        `fill-direct\t${x},${z}\t${rangesText(bulkRanges)}\t${canonicalState('minecraft:stone')}`
        + '\tCZ05-SCOPE-CONSTRUCTION-CONTROL\tFM01-BULK-STRUCTURAL-FILL-CANDIDATE\n',
      );
    }
    if (designCellIncluded) {
      const finishState = designY < 130 ? 'minecraft:smooth_stone' : 'minecraft:polished_diorite';
      directStats.finishCells += 1;
      if (designY < 130) directStats.lowerFinishCells += 1;
      else directStats.upperFinishCells += 1;
      finishSparseDigest.update(
        `surface-finish-direct\t${x},${z}\t${designY}..${designY}\t${canonicalState(finishState)}`
        + '\tCZ05-SCOPE-CONSTRUCTION-CONTROL\tFM01-EXPOSED-SURFACE-FINISH-CANDIDATE\n',
      );
    }
    columns.push({
      x,
      z,
      currentY: current.y,
      currentFamily,
      designY,
      supportStart: rawStart,
      supportEnd,
      candidateRanges,
    });
  }
  columnsByX.set(x, columns);
}

// Coordinate-set hashes require numeric x/y/z order. Process each X slice in
// numeric y/z order while retaining only one slice of support records.
for (const [x, columns] of columnsByX) {
  const supportCells = [];
  const adjacencyCells = { water: [], lava: [], frozen: [], snow: [] };
  for (const column of columns) {
    if (column.currentFamily !== 'other' && column.currentY < column.designY) {
      adjacencyCells[column.currentFamily].push({ x, y: column.currentY, z: column.z });
    }
    if (column.supportStart <= column.supportEnd) {
      let activeFamily = null;
      let segmentStart = null;
      for (let y = column.supportStart; y <= column.supportEnd; y += 1) {
        const cell = { x, y, z: column.z };
        const familyId = classifySupportCell(cell, column.currentFamily);
        supportCells.push({ ...cell, familyId });
        const masks = [
          relicSet.has(cellKey(cell)),
          b08Set.has(cellKey(cell)),
          b09Set.has(cellKey(cell)),
          d06Set.has(cellKey(cell)),
        ];
        if (masks[0]) supportRawOverlap.relic += 1;
        if (masks[1]) supportRawOverlap.b08 += 1;
        if (masks[2]) supportRawOverlap.b09 += 1;
        if (masks[3]) supportRawOverlap.d06 += 1;
        if (masks[0] && masks[1]) supportRawOverlap.relicAndB08 += 1;
        if (masks[0] && masks[2]) supportRawOverlap.relicAndB09 += 1;
        if (masks[0] && masks[3]) supportRawOverlap.relicAndD06 += 1;
        if (masks[1] && masks[2]) supportRawOverlap.b08AndB09 += 1;
        if (masks[1] && masks[3]) supportRawOverlap.b08AndD06 += 1;
        if (masks[2] && masks[3]) supportRawOverlap.b09AndD06 += 1;
        if (masks.filter(Boolean).length >= 3) supportRawOverlap.threeOrMore += 1;
        if (activeFamily !== familyId) {
          if (activeFamily !== null) {
            const stats = supportStats.get(activeFamily);
            stats.sparseDigest.update(
              `${activeFamily}\t${x},${column.z}\t${segmentStart}..${y - 1}\n`,
            );
            stats.sparseIntervalRecordCount += 1;
          }
          activeFamily = familyId;
          segmentStart = y;
        }
      }
      if (activeFamily !== null) {
        const stats = supportStats.get(activeFamily);
        stats.sparseDigest.update(
          `${activeFamily}\t${x},${column.z}\t${segmentStart}..${column.supportEnd}\n`,
        );
        stats.sparseIntervalRecordCount += 1;
      }
    }
  }
  supportCells.sort((left, right) => left.y - right.y || left.z - right.z);
  const familyColumnsForX = new Map();
  for (const cell of supportCells) {
    supportGapCoordinateDigest.update(`${cell.x},${cell.y},${cell.z}\n`);
    const stats = supportStats.get(cell.familyId);
    stats.coordinateDigest.update(`${cell.x},${cell.y},${cell.z}\n`);
    stats.cellCount += 1;
    stats.bounds = summarizeBounds(stats.bounds, cell);
    if (!familyColumnsForX.has(cell.familyId)) familyColumnsForX.set(cell.familyId, new Set());
    familyColumnsForX.get(cell.familyId).add(cell.z);
  }
  for (const [familyId, zValues] of familyColumnsForX) {
    supportStats.get(familyId).columnCount += zValues.size;
  }
  for (const family of Object.keys(adjacencyCells)) {
    adjacencyCells[family].sort((left, right) => left.y - right.y || left.z - right.z);
    for (const cell of adjacencyCells[family]) {
      currentAdjacencyDigests[family].update(`${cell.x},${cell.y},${cell.z}\n`);
    }
  }
}

invariant(directStats.modelledColumns === fm01.directlyModelledColumnCount,
  'FM-01 modelled-column count drift');
invariant(designDigest.digest('hex') === fm01.designSurface.columnManifestSha256,
  'FM-01 design-surface hash drift');
invariant(directStats.raisedColumns === fm01.sparseAddedSolidIntervals.raisedColumnCount,
  'FM-01 raised-column count drift');
invariant(directStats.rawAddedCells === fm01.sparseAddedSolidIntervals.rawAddedSolidCellCount,
  'FM-01 raw added-solid count drift');
invariant(directStats.candidateCells
  === fm01.sparseAddedSolidIntervals.candidateAddedSolidCellCount,
  'FM-01 candidate added-solid count drift');
invariant(directStats.protectedWithheld
  === fm01.sparseAddedSolidIntervals.protectedRelicWithheldFillCellCount,
  'FM-01 relic-withheld count drift');
invariant(directStats.b08Withheld === fm01.sparseAddedSolidIntervals.b08WithheldFillCellCount,
  'FM-01 B08-withheld count drift');
invariant(directStats.b09Withheld === fm01.sparseAddedSolidIntervals.b09WithheldFillCellCount,
  'FM-01 B09-withheld count drift');
invariant(candidateDigest.digest('hex') === fm01.sparseAddedSolidIntervals.intervalManifestSha256,
  'FM-01 candidate interval hash drift');
invariant(directStats.supportGapColumns === fm01.belowCoordinationSupportGap.columnCount,
  'FM-01 support-gap column count drift');
invariant(directStats.supportGapCells === fm01.belowCoordinationSupportGap.cellCount,
  'FM-01 support-gap cell count drift');
invariant(supportGapIntervalDigest.digest('hex')
  === fm01.belowCoordinationSupportGap.intervalManifestSha256,
  'FM-01 support-gap interval hash drift');
invariant(directStats.fillCells + directStats.finishCells === directStats.candidateCells,
  'proposed direct families do not partition every candidate added-solid cell');

const supportFamilies = [...supportStats.values()].map((stats) => ({
  id: stats.id,
  precedence: stats.precedence,
  classificationBasis: stats.id.includes('RELIC') ? 'exact relic preserve-current-state set'
    : stats.id.includes('B08') ? 'exact B08 interaction reservation'
      : stats.id.includes('B09') ? 'exact B09 minimum planning accommodation'
        : stats.id.includes('D06') ? 'exact D06 external continuation reservation'
          : `immutable current top-surface family ${stats.id.split('-')[2].toLowerCase()}`,
  cellCount: stats.cellCount,
  columnCount: stats.columnCount,
  bounds: stats.bounds,
  coordinateSetSha256: stats.coordinateDigest.digest('hex'),
  sparseIntervalRecordCount: stats.sparseIntervalRecordCount,
  sparseIntervalManifestSha256: stats.sparseDigest.digest('hex'),
  proposedTreatmentClass: stats.proposedTreatmentClass,
  treatmentAccepted: false,
  canonicalFutureState: null,
  exactOwnerAssignmentAccepted: false,
  ownerClassRequired: stats.ownerClassRequired,
  status: stats.status,
}));
const supportClassifiedCount = supportFamilies.reduce((sum, family) => sum + family.cellCount, 0);
invariant(supportClassifiedCount === directStats.supportGapCells,
  'support status families are incomplete or duplicated');
invariant(supportFamilies.filter(({ cellCount }) => cellCount > 0)
  .every(({ coordinateSetSha256 }) => coordinateSetSha256 !== EMPTY_COORDINATE_HASH),
  'nonempty support family emitted an empty coordinate hash');

const contractFamilies = packet.constructionAndInfluenceCellSetMethod.requiredSetFamilies;
invariant(contractFamilies.length === 12, 'compiler contract no longer has twelve set families');
const typedFamilies = contractFamilies.map((family) => {
  const common = {
    familyId: family.id,
    group: family.group,
    requiredOwnerClass: family.ownerClass,
    influenceRuleId: family.influenceRuleId,
    acceptedCellCount: 0,
    acceptedCoordinateSetSha256: null,
    acceptedTypedFamilySha256: null,
    acceptedOwnerAssignmentCount: 0,
    operationCellCount: 0,
  };
  if (family.id === 'fill-direct') return {
    ...common,
    status: 'PASS_EXACT_SPARSE_PROPOSAL_TECHNICAL_AND_OWNER_ACCEPTANCE_HOLD',
    proposalCellCount: directStats.fillCells,
    proposalColumnRecordCount: directStats.fillColumnRecords,
    proposalIntervalCount: directStats.fillIntervalCount,
    proposalCanonicalStateCounts: { 'minecraft:stone': directStats.fillCells },
    proposalOwnerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    proposalSparseManifestSha256: fillSparseDigest.digest('hex'),
    proposalAccepted: false,
  };
  if (family.id === 'surface-finish-direct') return {
    ...common,
    status: 'PASS_EXACT_SPARSE_PROPOSAL_TECHNICAL_AND_OWNER_ACCEPTANCE_HOLD',
    proposalCellCount: directStats.finishCells,
    proposalColumnRecordCount: directStats.finishCells,
    proposalIntervalCount: directStats.finishCells,
    proposalCanonicalStateCounts: {
      'minecraft:smooth_stone': directStats.lowerFinishCells,
      'minecraft:polished_diorite': directStats.upperFinishCells,
    },
    proposalOwnerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    proposalSparseManifestSha256: finishSparseDigest.digest('hex'),
    proposalAccepted: false,
  };
  if (family.id === 'water-and-lava-direct-interaction') return {
    ...common,
    status: 'HOLD_NO_ACCEPTED_INTERACTION_SET_ADJACENCY_DIAGNOSTIC_ONLY',
    proposalCellCount: null,
    immutableCurrentTopSurfaceAdjacencyDiagnostic: {
      waterCellCount: currentAdjacencyCounts.water,
      waterCoordinateSetSha256: currentAdjacencyDigests.water.digest('hex'),
      lavaCellCount: currentAdjacencyCounts.lava,
      lavaCoordinateSetSha256: currentAdjacencyDigests.lava.digest('hex'),
    },
  };
  if (family.id === 'frozen-and-snow-direct-interaction') return {
    ...common,
    status: 'HOLD_NO_ACCEPTED_INTERACTION_SET_ADJACENCY_DIAGNOSTIC_ONLY',
    proposalCellCount: null,
    immutableCurrentTopSurfaceAdjacencyDiagnostic: {
      frozenCellCount: currentAdjacencyCounts.frozen,
      frozenCoordinateSetSha256: currentAdjacencyDigests.frozen.digest('hex'),
      snowCellCount: currentAdjacencyCounts.snow,
      snowCoordinateSetSha256: currentAdjacencyDigests.snow.digest('hex'),
    },
  };
  if (family.id === 'protected-relic-support-and-access-influence') return {
    ...common,
    status: 'HOLD_EXPERT_INFLUENCE_UNKNOWN_MINIMUM_PLANNING_EXCLUSION_ONLY',
    proposalCellCount: null,
    minimumPlanningExclusionDiagnostic: {
      cellCount: exactRelicCells.length,
      coordinateSetSha256: coordinateHash(exactRelicCells),
      acceptedAsExpertInfluenceSet: false,
    },
  };
  return {
    ...common,
    status: family.group === 'PHYSICAL_INFLUENCE'
      ? 'HOLD_UNKNOWN_INFLUENCE_NOT_COERCED_TO_EMPTY_SET'
      : 'HOLD_NO_EXACT_ACCEPTED_OR_PROPOSED_SET',
    proposalCellCount: null,
    unknownIsNotZero: true,
  };
});

const passHoldMatrix = [
  {
    id: 'D05-FS-01-SOURCE-AND-OWNER-ACCEPTANCE-CHAIN',
    status: 'PASS',
    result: 'The accepted owner record, bundle, D05 packet, compiler contract, design evidence, and immutable region evidence are hash-bound.',
  },
  {
    id: 'D05-FS-02-FM01-SURFACE-AND-CANDIDATE-INTERVALS',
    status: 'PASS',
    result: `Reproduced ${directStats.modelledColumns.toLocaleString('en-US')} columns and ${directStats.candidateCells.toLocaleString('en-US')} candidate added-solid cells under the accepted FM-01 planning identity.`,
  },
  {
    id: 'D05-FS-03-SPARSE-CANONICAL-STATE-PROPOSAL',
    status: 'PASS_PROPOSAL_ONLY',
    result: 'Every FM-01 candidate added-solid cell is partitioned into an exact sparse bulk-fill or exposed-surface-finish proposal; none is accepted or owner-assigned.',
  },
  {
    id: 'D05-FS-04-SUPPORT-GAP-STATUS-CLASSIFICATION',
    status: 'PASS_CLASSIFICATION_ONLY',
    result: `All ${directStats.supportGapCells.toLocaleString('en-US')} below-Y72 gap cells belong to exactly one deterministic status family and reproduce the bound gap manifest.`,
  },
  {
    id: 'D05-FS-05-SUPPORT-TREATMENT-ACCEPTANCE',
    status: 'HOLD',
    result: 'Hydrology/cryosphere-adjacent families have no selected treatment, and no proposed treatment has accepted states, loads, stability criteria, owner assignments, or interfaces.',
  },
  {
    id: 'D05-FS-06-HYDROLOGY-NO-DIVERSION',
    status: 'HOLD',
    result: 'The proposal replaces zero current fluid/cryosphere cells, but adjacency, infiltration, drainage, discharge, snowmelt, erosion, and receiver effects remain unknown and default-deny.',
  },
  {
    id: 'D05-FS-07-PROTECTED-RELIC-CLEARANCE',
    status: 'HOLD',
    result: 'The 4,890-cell minimum preserve-current-state union is withheld, but expert structural, groundwater, access, staging, and all-start influence sets are absent.',
  },
  {
    id: 'D05-FS-08-OWNERSHIP-AND-DIRECTIONAL-INTERFACES',
    status: 'HOLD',
    result: 'Owner classes are proposed; exact assignments and one-to-one directional interface/receiver contracts remain absent.',
  },
  {
    id: 'D05-FS-09-B09-SYSTEM-AND-MECHANISMS',
    status: 'HOLD',
    result: 'The exact B09 planning reservation is withheld, but stations, support, guideway, maintenance/egress, mechanisms, rescue, drainage, and commissioning sets remain absent.',
  },
  {
    id: 'D05-FS-10-D06-RESERVATION-INDEPENDENCE',
    status: 'PASS_REFERENCE_ONLY',
    result: 'EG-A and EG-B remain exact dry/disjoint external reservation references with zero FM-01 support-gap intersection and no physical-opening authority.',
  },
  {
    id: 'D05-FS-11-COMPLETE-SAVED-WORLD',
    status: 'HOLD',
    result: 'The separate complete-save intake audit remains HOLD_INCOMPLETE_OR_UNBOUND_SAVE; this immutable region snapshot is valid design evidence but not a complete-save substitute.',
  },
  {
    id: 'D05-FS-12-D05-G02-CLOSURE',
    status: 'HOLD',
    result: 'Accepted future/construction cells remain zero until support, hydrology, relic, B09, ownership, interfaces, and complete-save criteria pass one identity.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-future-state',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_SPARSE_FUTURE_STATE_PROPOSAL_AND_SUPPORT_CLASSIFICATION_D05_G02_HOLD',
  purpose: 'Materialize the strongest deterministic FM-01 sparse future-state proposal and exhaustive support-gap status ledger supported by accepted planning policy and immutable evidence.',
  sourceBindings: {
    ...sources,
    immutablePhase0PostRegionSnapshot: immutableSnapshot,
  },
  authorityBoundary: {
    ownerPlanningPolicyAccepted: true,
    ownerAcceptanceDecision: ownerAcceptance.acceptanceRecordPayload.decision,
    ownerAcceptanceDoesNotPassTechnicalHolds: true,
    expertAcceptanceRecorded: false,
    exactOwnerAssignmentsAccepted: false,
    exactInterfaceContractsAccepted: false,
    completeSavedWorldAccepted: false,
    interpretation: 'Every nonzero count is an exact proposal or immutable diagnostic. It is not an accepted construction/future cell set and cannot be executed.',
  },
  selectedPlanningIdentity: {
    modelId: fm01.modelId,
    modelIdentitySha256: fm01.modelIdentitySha256,
    formula: fm01.formula,
    directlyModelledColumnCount: directStats.modelledColumns,
    designSurface: fm01.designSurface,
    boundCandidateAddedSolidIntervals: fm01.sparseAddedSolidIntervals,
    boundSupportGap: fm01.belowCoordinationSupportGap,
  },
  deterministicSparseProposalContract: {
    status: 'PASS_PROPOSAL_CONTRACT_ACCEPTED_TYPED_FAMILY_CONTRACT_NOT_EMITTED',
    coordinateOrder: 'proposal sparse records: numeric x then z; cell expansion: numeric x then y then z',
    preamble: `${SPARSE_TYPED_PREAMBLE}\\n`,
    record: 'family-id<TAB>x,z<TAB>startY..endY[,startY..endY]<TAB>canonical-state-json<TAB>proposed-owner-class<TAB>role-id\\n',
    expansionRule: 'Every inclusive Y interval expands to every integer coordinate (x,y,z); intervals in one record are disjoint and ascending.',
    hashing: 'SHA-256 over UTF-8 bytes with the exact preamble and newline-terminated records.',
    acceptedTypedFamilyContract: packet.constructionAndInfluenceCellSetMethod.hashing
      .typedFamilyHash,
    acceptedTypedFamilyQualification: 'The contract typed-family hash remains null until states, exact owners, interfaces, and technical acceptance exist; a sparse proposal hash is never substituted for it.',
  },
  sparseCanonicalFutureStateProposal: {
    status: 'PASS_EXACT_SPARSE_PROPOSAL_NOT_ACCEPTED_FUTURE_STATE',
    currentStateRule: 'Every immutable current cell is retained. Candidate records start at current surface plus one, and exact relic/B08/B09 reservations are withheld.',
    candidateAddedSolidCellCount: directStats.candidateCells,
    exactProposalPartitionCellCount: directStats.fillCells + directStats.finishCells,
    partitionComplete: directStats.fillCells + directStats.finishCells
      === directStats.candidateCells,
    canonicalCandidateStateCounts: {
      'minecraft:stone': directStats.fillCells,
      'minecraft:smooth_stone': directStats.lowerFinishCells,
      'minecraft:polished_diorite': directStats.upperFinishCells,
    },
    classificationRules: [
      'A candidate cell at the FM-01 analytic design surface is proposed as exposed surface finish.',
      'Exposed finish below Y=130 is proposed smooth stone; at or above Y=130 it is proposed polished diorite.',
      'Every other candidate added-solid cell is proposed as bulk structural stone.',
      'Exact relic, B08, and B09 reservations remain withheld; no liner/support/mechanism state is inferred at their interfaces.',
    ],
    acceptedFutureCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedFutureStateManifestSha256: null,
    acceptedOwnershipManifestSha256: null,
    proposalAccepted: false,
  },
  typedDirectAndInfluenceFamilies: typedFamilies,
  supportGapStatusLedger: {
    status: 'PASS_EXACT_EXHAUSTIVE_STATUS_CLASSIFICATION_TREATMENT_ACCEPTANCE_HOLD',
    boundIntervalManifestSha256: fm01.belowCoordinationSupportGap.intervalManifestSha256,
    cellCount: directStats.supportGapCells,
    columnCount: directStats.supportGapColumns,
    coordinateSetSha256: supportGapCoordinateDigest.digest('hex'),
    classifiedCellCount: supportClassifiedCount,
    unclassifiedCellCount: directStats.supportGapCells - supportClassifiedCount,
    multiplyClassifiedCellCount: 0,
    classificationPrecedence: supportFamilyDefinitions.map(({ id, precedence }) => ({ id, precedence })),
    families: supportFamilies,
    rawReservationOverlapDiagnosticsBeforePrecedence: supportRawOverlap,
    treatmentAcceptance: {
      acceptedTreatmentRecordCount: 0,
      acceptedNoChangeRecordCount: 0,
      acceptedCanonicalStateCount: 0,
      acceptedOwnerAssignmentCount: 0,
      status: 'HOLD',
      reason: 'Exhaustive deterministic status classification closes the accounting gap but does not self-accept any support treatment.',
    },
  },
  hydrologyAndRelicBoundary: {
    preservationPolicy: 'ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
    currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: 0,
    noDiversionTechnicallyAccepted: false,
    influenceUnknownIsNotZero: true,
    protectedRelicMinimumPlanningExclusion: {
      cellCount: exactRelicCells.length,
      coordinateSetSha256: coordinateHash(exactRelicCells),
      excludedFromCandidateFill: true,
      acceptedAsExpertInfluenceDistance: false,
    },
    unresolved: [
      'finite groundwater, infiltration, erosion, settlement, and support kernels',
      'exact dewatering/sump cells and capacities',
      'exact drainage/discharge graph, receiver, outfall, and directional contracts',
      'water/lava/frozen/snow component accounting after accepted support and route design',
      'expert relic structure, groundwater, observation/emergency access, staging, and equipment-sweep influence cells',
    ],
  },
  exactReservationsAndInterfaces: {
    b08Interaction: {
      ...connector.serviceTunnelCenterline.exactCellSets.interactionUnion,
      supportGapRawIntersectionCellCount: supportRawOverlap.b08,
      status: 'EXACT_PLANNING_RESERVATION_INTERFACE_CONTRACT_HOLD',
    },
    b09MinimumPlanningAccommodation: {
      ...packet.b09B10SystemPlan.b09Route.minimumPlanningAccommodation,
      supportGapRawIntersectionCellCount: supportRawOverlap.b09,
      status: 'EXACT_PLANNING_RESERVATION_SYSTEM_AND_INTERFACE_ACCEPTANCE_HOLD',
    },
    d06ExternalContinuations: d06Cells.map(({ id, design }) => ({
      id,
      ...design.externalContinuationDesign,
      fm01SupportGapIntersectionCellCount: 0,
      physicalOpeningAuthorized: design.designGate.physicalOpeningAuthorized,
      mechanismCommissioned: design.designGate.mechanismCommissioned,
      status: 'EXACT_REFERENCE_ONLY',
    })),
    requiredDirectionalInterfaces: [
      'IF-B08-B09-PORTAL',
      'IF-B09-B10-GUIDEWAY-MOUNTAIN',
      'IF-B09-Z11-SUMMIT',
      'IF-B09-RELIC-D06-CLEARANCE',
      'D05 hydrology receiver/outfall and cross-boundary component contracts',
      'D05 relic-control veto/clearance contracts against final direct, staging, access, and influence sets',
    ],
  },
  ownersAndInterfacesRequired: {
    ownerRoles: packet.ownershipAndInterfacePlan.ownerRoles,
    exactCellAssignmentCount: 0,
    exactInterfaceContractCount: 0,
    ownerClassesInProposalAreNotAssignments: true,
    unownedAcceptedCellCount: 0,
    multiplyOwnedAcceptedCellCount: 0,
    unownedProposalCellCount: directStats.candidateCells,
    multiplyOwnedProposalCellCount: null,
    undeclaredProposalInterfaceCount: null,
    accepted: false,
  },
  passHoldMatrix,
  disposition: {
    ownerPolicyAccepted: true,
    fm01GeometryReproduced: true,
    sparseCanonicalProposalCompleteForCandidateAddedSolidCells: true,
    supportGapStatusClassificationComplete: true,
    supportGapTreatmentAccepted: false,
    canonicalFutureStateAccepted: false,
    hydrologyAndGeotechnicalAccepted: false,
    protectedRelicExpertInfluenceAccepted: false,
    b09SystemAccepted: false,
    ownershipAndInterfacesAccepted: false,
    completeSavedWorldAccepted: false,
    acceptedFutureCellCount: 0,
    acceptedConstructionCellCount: 0,
    d05Resolved: false,
    r00G02Passed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    executable: false,
  },
};

const reportIdentityPayload = {
  id: report.id,
  sourceBindings: report.sourceBindings,
  selectedPlanningIdentity: report.selectedPlanningIdentity,
  sparseCanonicalFutureStateProposal: report.sparseCanonicalFutureStateProposal,
  typedDirectAndInfluenceFamilies: report.typedDirectAndInfluenceFamilies,
  supportGapStatusLedger: report.supportGapStatusLedger,
  exactReservationsAndInterfaces: report.exactReservationsAndInterfaces,
};
report.reportIdentitySha256 = sha256(JSON.stringify(reportIdentityPayload));

const row = (item) => `| ${item.id} | ${item.status} | ${item.result} |`;
const familyRow = (family) => `| ${family.id} | ${family.cellCount.toLocaleString('en-US')} | ${family.proposedTreatmentClass ?? 'unresolved'} | ${family.status} |`;
const typedRow = (family) => `| ${family.familyId} | ${family.proposalCellCount === null ? 'unknown' : (family.proposalCellCount ?? 0).toLocaleString('en-US')} | ${family.acceptedCellCount.toLocaleString('en-US')} | ${family.status} |`;
const markdown = `# D05 FM-01 future-state engineering ledger

Status: **${report.status}**

This report turns the accepted D05 planning policy into the strongest deterministic
sparse proposal currently supported by the evidence. It does **not** approve a
build: accepted future cells, construction cells, operations, and material cells
remain zero.

## What is now exact

- FM-01 is reproduced across ${directStats.modelledColumns.toLocaleString('en-US')} modelled columns.
- All ${directStats.candidateCells.toLocaleString('en-US')} candidate added-solid cells are partitioned into ${directStats.fillCells.toLocaleString('en-US')} bulk-stone proposal cells and ${directStats.finishCells.toLocaleString('en-US')} exposed-finish proposal cells.
- All ${directStats.supportGapCells.toLocaleString('en-US')} below-Y72 gap cells are classified exactly once; unclassified and multiply classified counts are zero.
- The 4,890-cell relic preserve-current-state union and exact B08/B09 reservations remain withheld.
- EG-A (${d06Cells[0].cells.length.toLocaleString('en-US')} cells) and EG-B (${d06Cells[1].cells.length.toLocaleString('en-US')} cells) remain exact external D06 references with zero FM-01 support-gap overlap.

## What is still not approved

The sparse material states are proposals, not accepted construction states. Support
treatments, finite expert influence kernels, hydrology/receiver contracts, relic
influence clearance, B09 systems, exact owners/interfaces, and a complete saved-world
intake all remain HOLD. Unknown influence counts are deliberately reported as unknown,
not as zero.

## Support-gap status families

| Family | Cells | Proposed treatment | Status |
|---|---:|---|---|
${supportFamilies.map(familyRow).join('\n')}

The family counts sum to **${supportClassifiedCount.toLocaleString('en-US')}**, exactly
matching the bound support-gap cell count and interval-manifest identity. A deterministic
status is not a technical treatment acceptance.

## Twelve compiler families

| Family | Proposed cells | Accepted cells | Status |
|---|---:|---:|---|
${typedFamilies.map(typedRow).join('\n')}

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
${passHoldMatrix.map(row).join('\n')}

## Safety boundary

No live calls, operations, RCON, fleet actions, material assignment, release action,
or world edit occurred. This artifact is offline, read-only, non-executable planning
evidence. Report identity: \`${report.reportIdentitySha256}\`.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  reportIdentitySha256: report.reportIdentitySha256,
  candidateAddedSolidCellCount: directStats.candidateCells,
  supportGapCellCount: directStats.supportGapCells,
  supportClassifiedCellCount: supportClassifiedCount,
  acceptedFutureCellCount: 0,
  acceptedConstructionCellCount: 0,
}, null, 2));
