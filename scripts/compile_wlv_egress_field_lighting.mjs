#!/usr/bin/env node
/** Compile WLV-EGRESS-01 — Westlight venue bowl field-rim lighting cadence.
 *
 * Option B of the venue-egress correction. The MP13 WLV-1 ops survey
 * (data/world-review/westlight-venue-ops-survey-20260824/) found the bowl field
 * level (y58-60, ~929 open cells) is critically under-lit (3 light blocks) and
 * that a field→concourse vomitory/stair is NOT cleanly buildable (the field is a
 * sealed sunken bowl walled by solid load-bearing undercroft; the only vertical
 * opening is the single public entrance stair — Option A is a hard hold).
 *
 * This package installs a bounded field-rim wall lighting cadence: 18 exact
 * full-opaque `sea_lantern`s replacing smooth_stone/polished_andesite wall-face
 * cells at y59 around the field perimeter, well-spaced (>=6 blocks) and
 * deterministic. It adds a light cadence at the field band the survey flagged
 * (y58-60), matching the concourse lantern cadence standard, without touching the
 * field floor, the load-bearing undercroft, the entrance stair, the members
 * club, the theatre, the screen matrix band, or any container/block entity.
 *
 * This is a maintenance lighting package, not a circulation correction: egress
 * geometry (single entrance stair) is unchanged; the flood route proof in the
 * post QA shows the field floor and entrance route remain walk-identical to
 * source with zero new obstruction and zero halo drift.
 *
 * Pinned to the accepted r08am post snapshot (same as the survey and the
 * CIRC-WL-ARRIVAL-01 release). Source guards are re-verified against a fresh
 * live snapshot immediately before execution.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-25T00:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'wlv-egress-field-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'wlv-egress-field-lighting';
const RELEASE_ID = 'WLV-EGRESS-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';
const SURVEY = 'data/world-review/westlight-venue-ops-survey-20260824/westlight-venue-ops-survey.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WLV-EGRESS-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const HAZARD_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:crafting_table', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire', 'minecraft:soul_campfire',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern', 'minecraft:conduit',
  'minecraft:polished_andesite_stairs', 'minecraft:smooth_stone_stairs', 'minecraft:torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const FIELD_BOUNDS = { minX: -382, maxX: -335, minZ: -573, maxZ: -502 };
const RIM_Y = 59;
const MIN_SPACING = 6;
const FIELD_WALL_MATERIALS = new Set(['minecraft:smooth_stone', 'minecraft:polished_andesite']);

const survey = readJson(SURVEY);
invariant(survey.id === 'westlight-venue-ops-survey' && survey.mode === 'READ_ONLY',
  'WLV-1 survey evidence missing or not read-only');
invariant(Array.isArray(survey.buildabilityAssessment?.cleanlyBuildableAlone)
  && survey.buildabilityAssessment.cleanlyBuildableAlone.some((entry) => entry.includes('sea_lantern')),
  'survey does not endorse field-rim lighting as cleanly buildable');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};

// --- Derive the field floor footprint (walk top y59 = block y58, air at y59) ---
const fieldFloor = [];
for (let x = FIELD_BOUNDS.minX; x <= FIELD_BOUNDS.maxX; x += 1) {
  for (let z = FIELD_BOUNDS.minZ; z <= FIELD_BOUNDS.maxZ; z += 1) {
    const below = await sourceAt({ x, y: 58, z });
    const here = await sourceAt({ x, y: 59, z });
    if (!isAir(below) && isAir(here)) fieldFloor.push({ x, z });
  }
}
const fieldKey = new Set(fieldFloor.map((cell) => `${cell.x},${cell.z}`));
invariant(fieldFloor.length >= 900, `field floor footprint too small: ${fieldFloor.length}`);

// --- Derive clean y59 wall-face cells ---
const clean = [];
const seen = new Set();
for (const field of fieldFloor) {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = field.x + dx;
    const nz = field.z + dz;
    if (fieldKey.has(`${nx},${nz}`)) continue;
    const key = `${nx},${RIM_Y},${nz}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const wallState = await sourceAt({ x: nx, y: RIM_Y, z: nz });
    const wallName = blockName(wallState);
    if (!FIELD_WALL_MATERIALS.has(wallName)) continue;
    const fieldSide = await sourceAt({ x: field.x, y: RIM_Y, z: field.z });
    if (!isAir(fieldSide)) continue;
    // solid backing outward
    const backing = await sourceAt({ x: nx + dx, y: RIM_Y, z: nz + dz });
    if (isAir(backing) || isFluid(backing)) continue;
    // headroom y+1 air
    const h1 = await sourceAt({ x: nx, y: RIM_Y + 1, z: nz });
    if (!isAir(h1)) continue;
    // 1-cell halo hazard (fluid + container/block-entity-bearing block)
    let hazard = false;
    for (let hx = nx - 1; hx <= nx + 1 && !hazard; hx += 1) {
      for (let hy = RIM_Y - 1; hy <= RIM_Y + 1 && !hazard; hy += 1) {
        for (let hz = nz - 1; hz <= nz + 1 && !hazard; hz += 1) {
          const hs = await sourceAt({ x: hx, y: hy, z: hz });
          if (isFluid(hs) || isHazard(hs)) { hazard = true; break; }
        }
      }
    }
    if (!hazard) clean.push({ x: nx, y: RIM_Y, z: nz, s: wallState, dir: `${dx},${dz}` });
  }
}
invariant(clean.length >= 18, `clean wall-face candidate set too small: ${clean.length}`);

// --- Deterministic cadence selection: >=6 spacing along each face ---
const faces = {
  W: clean.filter((cell) => cell.dir === '-1,0').sort((a, b) => a.z - b.z || a.x - b.x),
  E: clean.filter((cell) => cell.dir === '1,0').sort((a, b) => a.z - b.z || a.x - b.x),
  N: clean.filter((cell) => cell.dir === '0,-1').sort((a, b) => a.x - b.x || a.z - b.z),
  S: clean.filter((cell) => cell.dir === '0,1').sort((a, b) => a.x - b.x || a.z - b.z),
};
function spaced(list, coord) {
  const chosen = [];
  let last = -Infinity;
  for (const cell of list) {
    const value = coord === 'z' ? cell.z : cell.x;
    if (value - last >= MIN_SPACING) {
      chosen.push(cell);
      last = value;
    }
  }
  return chosen;
}
const selected = uniqueCells([
  ...spaced(faces.W, 'z'),
  ...spaced(faces.E, 'z'),
  ...spaced(faces.N, 'x'),
  ...spaced(faces.S, 'x'),
]);
invariant(selected.length === 18, `cadence target count drift: ${selected.length} != 18`);
invariant(new Set(selected.map(cellKey)).size === 18, 'cadence contains duplicate targets');
const cadenceSelection = uniqueCells([
  ...spaced(faces.W, 'z'),
  ...spaced(faces.E, 'z'),
  ...spaced(faces.N, 'x'),
  ...spaced(faces.S, 'x'),
]).map((cell) => {
  const source = [...faces.W, ...faces.E, ...faces.N, ...faces.S]
    .find((candidate) => candidate.x === cell.x && candidate.y === cell.y && candidate.z === cell.z);
  return { x: cell.x, y: cell.y, z: cell.z, dir: source?.dir ?? null };
});

// --- Build operations ---
const TARGET = 'minecraft:sea_lantern';
const ops = [];
for (const cell of selected) {
  const sourceState = await sourceAt(cell);
  invariant(FIELD_WALL_MATERIALS.has(blockName(sourceState)), `unexpected source at ${cellKey(cell)}: ${sourceState}`);
  invariant(sourceState !== TARGET, `noop guard at ${cellKey(cell)}`);
  ops.push({ cell: { x: cell.x, y: cell.y, z: cell.z }, sourceState, targetState: TARGET });
}

// Duplicate / noop guard
const targetKeys = new Set();
for (const record of ops) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// Interaction halo (3x3x3 around every operated cell).
const operatedCells = uniqueCells(ops.map(({ cell }) => cell));
const haloCells = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isHazard(st)) haloForbiddenCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0,
  `interaction halo fluid/forbidden hazard: ${haloFluidCount}/${haloForbiddenCount}`);

// Block-entity and saved-entity clearance over the operated envelope.
const envelope = boundsOf(operatedCells);
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (targetKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3
        && position[0] >= envelope.minX && position[0] < envelope.maxX + 1
        && position[1] >= envelope.minY && position[1] < envelope.maxY + 1
        && position[2] >= envelope.minZ && position[2] < envelope.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position });
      }
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
  'operated envelope intersects a block entity or saved movable entity');

// Preserve the existing 3 field lanterns (the survey's light census) exactly.
const existingFieldLights = [];
for (let x = FIELD_BOUNDS.minX; x <= FIELD_BOUNDS.maxX; x += 1) {
  for (let z = FIELD_BOUNDS.minZ; z <= FIELD_BOUNDS.maxZ; z += 1) {
    for (let y = 58; y <= 60; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (blockName(st) === 'minecraft:lantern') existingFieldLights.push({ x, y, z, s: st });
    }
  }
}
invariant(existingFieldLights.length === 3,
  `existing field lantern census drift: ${existingFieldLights.length} != 3`);

// Flood-route invariants (proved again in post QA): field floor footprint and the
// single entrance stair (x-363..-355, z-508..-506) must be untouched by targets.
const entranceStairBounds = { minX: -365, maxX: -353, minZ: -509, maxZ: -503 };
for (const record of ops) {
  const { x, y, z } = record.cell;
  invariant(!(x >= entranceStairBounds.minX && x <= entranceStairBounds.maxX
    && z >= entranceStairBounds.minZ && z <= entranceStairBounds.maxZ),
  `target intersects entrance stair envelope: (${x},${y},${z})`);
  invariant(!fieldKey.has(`${x},${z}`), `target is on the field floor: (${x},${y},${z})`);
}

// --- Emit the cadence package (single package, exact inverse) ---
const forwardPath = path.join(OUT_DIR, `${BASENAME}.cadence.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.cadence.rollback.txt`);
const ordered = ops.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (cadence ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(operatedCells)}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const operationManifest = {
  cadence: {
    role: 'field-rim wall lighting cadence (18 sea_lanterns at y59)',
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: ordered.length,
    rollbackCommandCount: ordered.length,
    targetCoordinateSetSha256: hashCells(operatedCells),
    exactInverse: true,
  },
};

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['WESTLIGHT-VENUE'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'westlight-venue',
    purpose: 'Install a bounded field-rim wall lighting cadence in the Westlight venue bowl field (y58-60 under-lit band), adding 18 exact sea_lanterns to the y59 field-facing rim wall around the field perimeter, addressing the WLV-1 survey lighting defect without altering egress geometry.',
    treatment: 'FIELD_RIM_WALL_LIGHTING_CADENCE_SEA_LANTERN_INSTALLATION',
    rimY: RIM_Y,
    fieldFloorCellCount: fieldFloor.length,
    existingFieldLanternCount: existingFieldLights.length,
    existingFieldLights,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection,
    minimumSpacing: MIN_SPACING,
    entranceStairBounds,
    egressGeometryChanged: false,
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: { path: relative(SURVEY) },
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: census(ops, (record) => record.targetState),
    sourceStateCensus: census(ops, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages: [{ key: 'cadence', forward: relative(forwardPath), rollback: relative(rollbackPath) }],
  executionOrder: {
    forward: ['cadence'],
    rollback: ['cadence'],
    gravity: 'single cadence package; rollback is the exact inverse',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    operatedHaloForbiddenBlockCount: haloForbiddenCount,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
  },
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: ops.length,
  cadenceCellCount: ops.length,
  haloCellCount: haloCells.length,
  haloFluidCount,
  haloForbiddenCount,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  existingFieldLanternCount: existingFieldLights.length,
  fieldFloorCellCount: fieldFloor.length,
}, null, 2)}\n`);
