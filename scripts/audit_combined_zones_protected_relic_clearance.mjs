#!/usr/bin/env node
/**
 * Produce a read-only, snapshot-bound census of the three protected surface
 * relics in Combined Zones Phase 1.
 *
 * This script reads copied Anvil region files and local planning evidence only.
 * It never connects to Minecraft, RCON, the fleet API, systemd, or SSH, and it
 * never emits an operation or ownership cell set.
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

const PHASE0_EVIDENCE = path.resolve(value(
  '--phase0-evidence',
  'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const COORDINATES = path.resolve(value(
  '--coordinates',
  'docs/masterplans/05-combined-zones/site-coordinates.json',
));
const GEOMETRY = path.resolve(value(
  '--geometry',
  'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.md',
));

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(filename) {
  const data = fs.readFileSync(filename);
  return {
    path: relative(filename),
    bytes: data.length,
    sha256: sha256(data),
  };
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

const phase0 = readJson(PHASE0_EVIDENCE);
const coordinates = readJson(COORDINATES);
const geometry = readJson(GEOMETRY);
const regionDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const snapshot = snapshotIdentity(regionDirectory);

assert(
  snapshot.sha256 === phase0.snapshots.postGeneration.sha256,
  'immutable Phase 0 post snapshot SHA-256 does not match the survey evidence',
);
assert(
  snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount,
  'immutable Phase 0 post snapshot region-file count does not match the survey evidence',
);
assert(
  snapshot.bytes === phase0.snapshots.postGeneration.bytes,
  'immutable Phase 0 post snapshot byte count does not match the survey evidence',
);

const regionCache = new Map();
const chunkCache = new Map();

function regionBuffer(rx, rz) {
  const key = `${rx},${rz}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const filename = path.join(regionDirectory, `r.${rx}.${rz}.mca`);
  let buffer = null;
  try {
    buffer = fs.readFileSync(filename);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  regionCache.set(key, buffer);
  return buffer;
}

async function readChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const buffer = regionBuffer(Math.floor(cx / 32), Math.floor(cz / 32));
  assert(buffer, `missing region file for relic chunk ${cx},${cz}`);
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  const sectorOffset = buffer.readUIntBE(index, 3);
  assert(sectorOffset, `missing relic chunk ${cx},${cz}`);
  const offset = sectorOffset * 4096;
  const length = buffer.readUInt32BE(offset);
  const compression = buffer.readUInt8(offset + 4);
  assert(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
  const { parsed } = await nbt.parse(decompress(
    compression,
    buffer.subarray(offset + 5, offset + 4 + length),
  ));
  const chunk = nbt.simplify(parsed);
  assert(chunk?.Status === 'minecraft:full', `relic chunk ${cx},${cz} is not minecraft:full`);
  chunkCache.set(key, chunk);
  return chunk;
}

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

async function blockStateAt(x, y, z) {
  const chunk = await readChunk(Math.floor(x / 16), Math.floor(z / 16));
  const section = chunk.sections?.find((candidate) => Number(candidate.Y) === Math.floor(y / 16));
  const states = section?.block_states;
  if (!states?.palette?.length) return { Name: 'minecraft:air' };
  const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
  return states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' };
}

function generatedStructureStarts(chunk) {
  const result = [];
  for (const [key, start] of Object.entries(chunk.structures?.starts ?? {})) {
    const id = start?.id ?? key;
    if (!id || /invalid/i.test(id)) continue;
    const childBounds = (start.Children ?? [])
      .map((child) => child.BB)
      .filter((bounds) => Array.isArray(bounds) && bounds.length === 6);
    if (childBounds.length === 0) continue;
    result.push({
      key,
      id,
      childPieceCount: childBounds.length,
      bounds: {
        minX: Math.min(...childBounds.map((bounds) => bounds[0])),
        minY: Math.min(...childBounds.map((bounds) => bounds[1])),
        minZ: Math.min(...childBounds.map((bounds) => bounds[2])),
        maxX: Math.max(...childBounds.map((bounds) => bounds[3])),
        maxY: Math.max(...childBounds.map((bounds) => bounds[4])),
        maxZ: Math.max(...childBounds.map((bounds) => bounds[5])),
      },
    });
  }
  return result;
}

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);

function sortCells(cells) {
  return cells.sort((left, right) => left.x - right.x
    || left.y - right.y
    || left.z - right.z);
}

function cellSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const cell of sortCells([...cells])) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function stateSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-block-state-cell-set-v1\n');
  for (const cell of sortCells([...cells])) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${canonicalState(cell.state)}\n`);
  }
  return digest.digest('hex');
}

function boxCells(bounds) {
  const result = [];
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
        result.push({ x, y, z });
      }
    }
  }
  return result;
}

function halfOpenToInclusive(bounds) {
  return {
    minX: bounds.minXInclusive,
    maxX: bounds.maxXExclusive - 1,
    minY: bounds.minYInclusive,
    maxY: bounds.maxYExclusive - 1,
    minZ: bounds.minZInclusive,
    maxZ: bounds.maxZExclusive - 1,
  };
}

function intersection(left, right) {
  const bounds = {
    minX: Math.max(left.minX, right.minX),
    maxX: Math.min(left.maxX, right.maxX),
    minY: Math.max(left.minY, right.minY),
    maxY: Math.min(left.maxY, right.maxY),
    minZ: Math.max(left.minZ, right.minZ),
    maxZ: Math.min(left.maxZ, right.maxZ),
  };
  return bounds.minX <= bounds.maxX
    && bounds.minY <= bounds.maxY
    && bounds.minZ <= bounds.maxZ
    ? bounds
    : null;
}

function contains(bounds, cell) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function volume(bounds) {
  return (bounds.maxX - bounds.minX + 1)
    * (bounds.maxY - bounds.minY + 1)
    * (bounds.maxZ - bounds.minZ + 1);
}

function sameBounds(left, right) {
  return left.minX === right.minX && left.maxX === right.maxX
    && left.minY === right.minY && left.maxY === right.maxY
    && left.minZ === right.minZ && left.maxZ === right.maxZ;
}

const geometrySets = geometry.compiledCoordinationGeometry?.normalized04EnvelopeCellSets ?? [];
const coordinationEnvelopes = geometrySets.map((entry) => ({
  id: entry.id,
  sourcePath: entry.sourcePath,
  purpose: entry.exactCoordinationCellSet.purpose,
  bounds: halfOpenToInclusive(entry.exactCoordinationCellSet.bounds),
}));
const emptyEight = geometry.compiledCoordinationGeometry?.emptyEightShellCoordinationCellSet;
if (emptyEight) {
  coordinationEnvelopes.push({
    id: 'empty-eight-shell',
    sourcePath: 'docs/masterplans/05-combined-zones/site-coordinates.json#zones.Z02.hiddenSubway.terminal.bounds',
    purpose: 'coordination-only-not-a-material-or-operation-set',
    bounds: halfOpenToInclusive(emptyEight.bounds),
  });
}
assert(coordinationEnvelopes.length === 6, 'expected five normalized 04 envelopes and the Empty Eight shell');

const registryRelics = coordinates.zones
  .find((zone) => zone.id === 'Z09')
  ?.protectedSurfaceRelics ?? [];
const declaredRelics = phase0.protectedSurfaceRelics ?? [];
assert(declaredRelics.length === 3, 'expected exactly three Phase 0 protected surface relics');
assert(registryRelics.length === 3, 'expected exactly three coordinate-registry protected surface relics');

const relics = [];
for (const relic of declaredRelics) {
  const key = relic.id === 'minecraft:shipwreck'
    ? 'shipwreck'
    : relic.bounds.minX < 2000 ? 'igloo-west' : 'igloo-east';
  const registryMatch = registryRelics.find((candidate) => candidate.id === relic.id
    && candidate.bounds.minX === relic.bounds.minX
    && candidate.bounds.maxX === relic.bounds.maxX
    && candidate.bounds.minZ === relic.bounds.minZ
    && candidate.bounds.maxZ === relic.bounds.maxZ);
  assert(registryMatch, `coordinate registry does not match Phase 0 relic ${key}`);
  const startChunk = await readChunk(relic.chunkX, relic.chunkZ);
  const matchingStarts = generatedStructureStarts(startChunk).filter((start) => (
    start.id === relic.id && sameBounds(start.bounds, relic.bounds)
  ));
  assert(matchingStarts.length === 1, `immutable snapshot does not contain one exact generated start for ${key}`);

  const fullCells = [];
  for (const cell of boxCells(relic.bounds)) {
    fullCells.push({ ...cell, state: await blockStateAt(cell.x, cell.y, cell.z) });
  }
  const presentCells = fullCells.filter((cell) => !AIR.has(cell.state.Name));
  const materialCounts = {};
  for (const cell of presentCells) {
    materialCounts[cell.state.Name] = (materialCounts[cell.state.Name] ?? 0) + 1;
  }
  const sortedMaterials = Object.fromEntries(
    Object.entries(materialCounts).sort(([left], [right]) => left.localeCompare(right)),
  );

  const comparisons = coordinationEnvelopes.map((envelope) => {
    const coreIntersectionBounds = intersection(relic.bounds, envelope.bounds);
    const coreIntersectionCells = coreIntersectionBounds ? boxCells(coreIntersectionBounds) : [];
    const presentIntersectionCells = presentCells.filter((cell) => contains(envelope.bounds, cell));
    return {
      envelopeId: envelope.id,
      envelopePurpose: envelope.purpose,
      relationship: coreIntersectionCells.length > 0
        ? 'PROTECTED_CORE_OVERLAPS_COORDINATION_ENVELOPE'
        : 'CLEAR_OF_COORDINATION_ENVELOPE',
      protectedCoreIntersection: {
        bounds: coreIntersectionBounds,
        cellCount: coreIntersectionCells.length,
        coordinateSetSha256: cellSetHash(coreIntersectionCells),
      },
      observedPresentCellIntersection: {
        cellCount: presentIntersectionCells.length,
        coordinateSetSha256: cellSetHash(presentIntersectionCells),
        blockStateSetSha256: stateSetHash(presentIntersectionCells),
      },
    };
  });

  relics.push({
    key,
    structureId: relic.id,
    structureStartChunk: { x: relic.chunkX, z: relic.chunkZ },
    observedGeneratedStructureStart: {
      status: 'PASS_ONE_EXACT_START_RECORD',
      nbtKey: matchingStarts[0].key,
      childPieceCount: matchingStarts[0].childPieceCount,
      unionBounds: matchingStarts[0].bounds,
      phase0BoundsMatch: true,
    },
    declaredInclusiveBounds: relic.bounds,
    declaredVolumeCellCount: volume(relic.bounds),
    coordinateRegistryPlanMatch: true,
    observedSnapshotCensus: {
      status: 'PASS_EXACT_BOUNDING_VOLUME_CENSUS',
      finding: presentCells.length === 0
        ? 'NO_PRESENT_CELLS_IN_DECLARED_BOUNDING_VOLUME'
        : 'PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME',
      presenceDefinition: 'block name is not minecraft:air, minecraft:cave_air, or minecraft:void_air',
      totalCellCount: fullCells.length,
      presentCellCount: presentCells.length,
      airCellCount: fullCells.length - presentCells.length,
      materialCounts: sortedMaterials,
      presentCoordinateSetSha256: cellSetHash(presentCells),
      presentBlockStateSetSha256: stateSetHash(presentCells),
      fullVolumeBlockStateSetSha256: stateSetHash(fullCells),
    },
    evidenceBackedDefaultDenyCore: {
      status: 'FROZEN_OFFLINE_CONSTRAINT',
      representation: 'inclusive-axis-aligned-structure-start-bounding-box',
      positiveMarginBlocks: 0,
      cellCount: fullCells.length,
      coordinateSetSha256: cellSetHash(fullCells),
      basis: 'The immutable snapshot and Phase 0 structure-start record support this complete bounding volume. Air cells inside it remain default-deny so future work cannot hollow through a recorded structure extent.',
      operationOwnership: false,
    },
    positiveMarginBuffer: {
      status: 'HOLD_NOT_FROZEN',
      reason: 'No structural, hydrological, access, entrance-safety, or exhibit-design evidence establishes a defensible positive margin outside the generated structure-start bounds.',
    },
    coordinationEnvelopeComparisons: comparisons,
    integrityQualification: 'The census proves current block states inside the recorded bounds, not vanilla-template completeness, attribution of every present block to the generated structure, entrance safety, or preservation outside the bounds.',
  });
}

const overlappingComparisons = relics.flatMap((relic) => relic.coordinationEnvelopeComparisons
  .filter((comparison) => comparison.protectedCoreIntersection.cellCount > 0)
  .map((comparison) => ({
    relicKey: relic.key,
    envelopeId: comparison.envelopeId,
    protectedCoreCellCount: comparison.protectedCoreIntersection.cellCount,
    observedPresentCellCount: comparison.observedPresentCellIntersection.cellCount,
  })));
const emptyRelicBounds = relics
  .filter((relic) => relic.observedSnapshotCensus.presentCellCount === 0)
  .map((relic) => relic.key);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-protected-relic-clearance',
  status: 'PARTIAL_PASS_G06_REMAINS_HOLD',
  worldEditAuthorized: false,
  operationCellCount: 0,
  materialCellCount: 0,
  sourceBindings: {
    phase0SurveyEvidence: fileBinding(PHASE0_EVIDENCE),
    coordinateRegistry: fileBinding(COORDINATES),
    phase1GeometryCoordination: fileBinding(GEOMETRY),
    immutablePhase0PostRegionSnapshot: snapshot,
  },
  method: {
    access: 'read-only copied Anvil region files and local planning evidence only',
    coordinateOrderForHashes: 'numeric x, then y, then z',
    coordinateSetHashPreamble: 'combined-zones-coordinate-cell-set-v1\\n',
    blockStateSetHashPreamble: 'combined-zones-block-state-cell-set-v1\\n',
    blockStateCanonicalization: 'JSON object with Name first and Properties keys lexicographically sorted',
    defaultDenyRule: 'The complete recorded structure-start bounding volume, including air cells, is the minimum frozen no-touch core. No positive-margin buffer is inferred without design evidence.',
    coordinationRule: 'A coordination-envelope intersection is a protected design conflict to resolve; it is not an operation-cell or ownership claim.',
  },
  relics,
  coordinationSummary: {
    frozenEnvelopeCountCompared: coordinationEnvelopes.length,
    envelopes: coordinationEnvelopes,
    overlappingComparisons,
    interpretation: 'The overlaps veto unqualified future material compilation in those cells. The planning/coordination envelopes themselves do not own or authorize any cell.',
  },
  preservationFindings: {
    declaredRelicCount: relics.length,
    relicBoundsWithPresentCells: relics.length - emptyRelicBounds.length,
    relicBoundsWithoutPresentCells: emptyRelicBounds,
    status: emptyRelicBounds.length === 0
      ? 'PRESENT_CELLS_OBSERVED_IN_ALL_DECLARED_BOUNDS'
      : 'HOLD_ONE_OR_MORE_DECLARED_RELIC_BOUNDS_EMPTY',
    interpretation: 'An empty recorded bound is negative evidence for current preservation. It does not authorize reuse: the generated structure-start extent remains default-deny until separately reviewed.',
  },
  g06Disposition: {
    gateId: 'generated-and-protected-structure-clearance',
    status: 'HOLD',
    passedSubgates: [
      'immutable Phase 0 post snapshot identity matches its sealed declaration',
      'all three declared structure-start bounding volumes have a complete current block-state census',
      'present coordinate sets, present state sets, full volume state sets, and no-touch core cell sets are hash-bound',
      'the Phase 0 relic records and current coordinate-registry X/Z records agree one-to-one',
      'all three protected cores are compared exactly against the six currently compiled coordination envelopes',
      'the recorded bounding volumes are frozen as minimum default-deny no-touch cores with zero operation ownership',
    ],
    holdSubgates: [
      'no evidence-backed positive-margin relic buffer has been designed or approved',
      ...emptyRelicBounds.map((key) => `${key} has zero present cells inside its recorded start bound; current relic preservation is not established`),
      'the census does not prove vanilla-template integrity, entrance safety, or block attribution outside each start bound',
      'no exact proposed construction and interaction cell set exists for design-time clearance testing',
      'the remaining 47 reserve-intersecting generated structure starts have not been tested against an exact construction set',
    ],
    passRule: 'G06 may pass for R00 only after reviewed positive-margin policy or an explicit evidence-backed zero-margin acceptance and exact proposed construction/interaction cells clear every protected core and all relevant structure starts.',
    releaseLifecycleValidation: {
      gateRange: 'G16-G19',
      resolvesG06ForR00: false,
      requirements: [
        'immutable post-construction snapshot',
        'exact protected-core and reviewed-buffer preservation comparison',
        'final relic-preservation acceptance bound to the executed operation identities',
      ],
    },
  },
  limitations: [
    'No entity-region data is read; entity clearance is a separate gate.',
    'No live system is contacted and no world edit is authorized.',
    'Generated structure-start records and bounded block censuses do not establish ownership of surrounding planning space.',
  ],
};

const markdown = `# Phase 1 protected-relic clearance evidence

Status: **PARTIAL PASS — G06 REMAINS HOLD — OFFLINE ONLY**

This report binds the two igloos and one shipwreck to the immutable Phase 0 post-region snapshot. It censuses every block state inside each generated structure-start bound, hashes the exact current cell sets, freezes the complete recorded bounds as minimum default-deny cores, and compares those cores against the currently compiled coordination envelopes. It creates no operation or ownership set and authorizes no world edit.

## Exact censuses

| Relic | Inclusive structure-start bounds | Present / total cells | Present coordinate SHA-256 | Default-deny core cells |
|---|---|---:|---|---:|
${relics.map((relic) => `| ${relic.key} | \`${relic.declaredInclusiveBounds.minX}…${relic.declaredInclusiveBounds.maxX}, ${relic.declaredInclusiveBounds.minY}…${relic.declaredInclusiveBounds.maxY}, ${relic.declaredInclusiveBounds.minZ}…${relic.declaredInclusiveBounds.maxZ}\` | ${relic.observedSnapshotCensus.presentCellCount} / ${relic.observedSnapshotCensus.totalCellCount} | \`${relic.observedSnapshotCensus.presentCoordinateSetSha256}\` | ${relic.evidenceBackedDefaultDenyCore.cellCount} |`).join('\n')}

The full JSON also binds each present block-state set and the complete volume state, including air. “Present” excludes only the three Minecraft air variants. The census does not claim every present block was generated by the structure or that a vanilla template is intact.

**Negative preservation evidence:** ${emptyRelicBounds.length > 0 ? `${emptyRelicBounds.join(', ')} has zero present cells inside its declared structure-start bound. The empty bound remains default-deny, but current relic preservation is not established.` : 'Every declared bound contains at least one present cell.'}

## Minimum no-touch rule

The only defensible frozen constraint at this stage is the complete generated structure-start bounding volume with a **zero-block positive margin**. Every cell in that volume, including air, is default-deny. No positive-margin buffer is frozen because the current evidence does not establish structural support, hydrology, exhibit access, entrance safety, or a reviewed buffer distance. That missing decision keeps G06 on HOLD.

## Coordination-envelope conflicts

| Relic | Coordination envelope | Protected-core overlap cells | Present overlap cells |
|---|---|---:|---:|
${overlappingComparisons.map((item) => `| ${item.relicKey} | ${item.envelopeId} | ${item.protectedCoreCellCount} | ${item.observedPresentCellCount} |`).join('\n')}

All other relic/envelope pairs have zero overlap. These are design conflicts against no-touch cells, not proof that a planning box owns blocks and not authorization to alter either the relic or surrounding terrain.

## G06 disposition

The immutable snapshot identity, three complete bounded censuses, exact hashes, registry cross-check, minimum default-deny cores, and six-envelope comparison pass as subgates. G06 remains **HOLD** because no evidence-backed positive margin (or reviewed zero-margin acceptance), exact proposed construction/interaction cell set, all-structure clearance test, or template/entrance review exists. Post-state preservation is separate G16-G19 validation and cannot satisfy R00 G06.

Reproduce with:

\`\`\`bash
node scripts/audit_combined_zones_protected_relic_clearance.mjs
\`\`\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
process.stdout.write(`${relative(OUTPUT)}\n${relative(MARKDOWN)}\n`);
