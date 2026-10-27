#!/usr/bin/env node
/**
 * Compile CZ-R07B: the source-bound support bents below the accepted R07A
 * P1-B03 portal tube.
 *
 * The frozen B03 centreline exposes indices 188..612.  The two portal
 * approaches already bear on the R05 mountain, so this release samples the
 * intervening viaduct every 16 centreline steps (196..596) and adds the
 * north/west tangent joint at 460.  Each accepted bent is two blocks thick in
 * the direction of travel, seven blocks across, and has paired two-block-wide
 * legs descending to the first accepted stable foundation.  A candidate is
 * omitted rather than clearing unrelated vegetation when any leg first meets
 * a non-foundation state.
 *
 * The operation domain admits only exact air variants, one-layer snow, or an
 * already-built target.  Fluid, gravity, container, block-entity, saved-
 * entity, protected-relic, or prior-release intersections abort compilation.
 * This script is offline: it performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  compareCells,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T17:30:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07a-live-20260821T154500Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r07b-b03-viaduct-bents';
const RELEASE_ID = 'CZ-R07B-PHASE1-B03-VIADUCT-BENTS';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const TARGET_STATE = 'minecraft:stone_bricks';
const SAFE_TRANSIENT_STATE = 'minecraft:snow[layers=1]';
const MIN_WORLD_Y = -64;

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
  r07aManifestIdentity:
    'ee64005564179da374f4dd2847927363d7b875fcb5a2d4db6421fd1ba87391e8',
  candidateAnchorCount: 27,
  selectedAnchorCount: 26,
  selectedAnchorIndices: [
    196, 212, 228, 244, 260, 276, 292, 308, 324, 340, 356, 372, 388,
    404, 420, 436, 452, 460, 468, 500, 516, 532, 548, 564, 580, 596,
  ],
  excludedAnchorIndices: [484],
  designCellCount: 11758,
  designCoordinateSetSha256:
    'd30393d3db6a00c91bf86ddbc9ec6f5ae0ffdc13dbf8538f7eaf5c9a7ae3f85a',
  airCellCount: 11646,
  snowCellCount: 112,
});

const INPUTS = Object.freeze({
  b03Geometry:
    'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  g03CanonicalSetout:
    'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07aManifest:
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  r07aPostQa:
    'data/world-review/combined-zones-r07a-live-20260821T154500Z/r07a-post-release-qa.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
  ],
});

const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const STABLE_FOUNDATION_BLOCKS = new Set([
  'minecraft:stone', 'minecraft:smooth_stone', 'minecraft:polished_diorite',
  'minecraft:stone_bricks', 'minecraft:grass_block', 'minecraft:dirt',
  'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:deepslate',
  'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite',
  'minecraft:tuff', 'minecraft:calcite', 'minecraft:snow_block',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(
  fs.readFileSync(absolute(filename), 'utf8'),
);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07B B03 viaduct compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const isReplaceable = (state) => (
  AIR_BLOCKS.has(blockName(state))
  || state === SAFE_TRANSIENT_STATE
  || state === TARGET_STATE
);
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

function sourceCensus(cells) {
  const census = new Map();
  for (const { sourceState } of cells) {
    census.set(sourceState, (census.get(sourceState) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parseOperationBounds(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a non-REPL or malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename} contains an invalid coordinate`);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    operations.push({
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
    });
  }
  return operations;
}

function intersectPriorOperations(operationBounds, targetColumns, targetBounds) {
  const intersections = new Set();
  for (const operation of operationBounds) {
    const minX = Math.max(operation.minX, targetBounds.minX);
    const maxX = Math.min(operation.maxX, targetBounds.maxX);
    const minZ = Math.max(operation.minZ, targetBounds.minZ);
    const maxZ = Math.min(operation.maxZ, targetBounds.maxZ);
    if (minX > maxX || minZ > maxZ
      || operation.maxY < targetBounds.minY || operation.minY > targetBounds.maxY) {
      continue;
    }
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const ys = targetColumns.get(`${x},${z}`);
        if (!ys) continue;
        for (const y of ys) {
          if (operation.minY <= y && y <= operation.maxY) {
            intersections.add(`${x},${y},${z}`);
          }
        }
      }
    }
  }
  return [...intersections].map((key) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  });
}

function mergeVerticalOperations(cells) {
  const columns = new Map();
  for (const item of cells) {
    const key = `${item.cell.x},${item.cell.z},${item.sourceState}`;
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key).push(item);
  }
  const runs = [];
  for (const items of columns.values()) {
    items.sort((left, right) => left.cell.y - right.cell.y);
    let first = items[0];
    let last = items[0];
    for (const item of items.slice(1)) {
      if (item.cell.y === last.cell.y + 1) {
        last = item;
      } else {
        runs.push({
          from: first.cell,
          to: last.cell,
          sourceState: first.sourceState,
          targetState: TARGET_STATE,
        });
        first = item;
        last = item;
      }
    }
    runs.push({
      from: first.cell,
      to: last.cell,
      sourceState: first.sourceState,
      targetState: TARGET_STATE,
    });
  }
  return runs.sort((left, right) => (
    compareCells(left.from, right.from)
    || compareCells(left.to, right.to)
    || left.sourceState.localeCompare(right.sourceState)
  ));
}

function replRegionLine(from, to, sourceState, targetState) {
  return `REPL ${from.x} ${from.y} ${from.z} ${to.x} ${to.y} ${to.z} ${sourceState} ${targetState}`;
}

function savedEntityTouchesTarget(entity, targets) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return targets.some((cell) => (
    cell.x - 1 <= x && x <= cell.x + 2
    && cell.y - 2 <= y && y <= cell.y + 3
    && cell.z - 1 <= z && z <= cell.z + 2
  ));
}

const b03 = readJson(INPUTS.b03Geometry);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const relics = readJson(INPUTS.protectedRelics);
const r07a = readJson(INPUTS.r07aManifest);
const r07aQa = readJson(INPUTS.r07aPostQa);
const intake = readJson(INTAKE_AUDIT);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot root');
invariant(intake.packageIdentity?.completeSaveSha256
  === EXPECTED.sourceCompleteSaveSha256,
'accepted R07A post complete-save identity drifted');
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'region')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'entities')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'poi')))
  && fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
'source snapshot is not a complete saved-world root');
invariant(r07a.manifestIdentity === EXPECTED.r07aManifestIdentity
  && r07a.releaseNodeId === RELEASE_NODE_ID,
'accepted R07A manifest identity or release-node binding drifted');
invariant(r07aQa.status === 'PASS_R07A_B03_PORTAL_TUBE_POST_RELEASE_ACCEPTED'
  && r07aQa.summary?.passed === true
  && r07aQa.bindings?.postCompleteSave?.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256
  && samePath(r07aQa.bindings?.postCompleteSave?.root, SNAPSHOT),
'R07A post-release acceptance does not bind this source');

const construction = uniqueCells(b03.design.excavationReservation.cells);
const interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
const g03B03 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B03');
invariant(g03B03?.construction?.coordinateSetSha256 === hashCells(construction)
  && g03B03?.interaction?.coordinateSetSha256 === hashCells(interaction),
'B03 geometry does not reproduce the canonical G03 identities');
invariant(r07a.scope?.geometry?.frozenR03SurfaceDeferral?.cellCount === 8532
  && r07a.scope.geometry.frozenR03SurfaceDeferral.coordinateSetSha256
    === '16bc4e50ded34ee3947005783707de1801c6147067077ef16f10952b5262da92'
  && r07a.scope.geometry.routeCrossSectionContinuity?.exposedCenterlineFirstIndex
    === 188
  && r07a.scope.geometry.routeCrossSectionContinuity?.exposedCenterlineLastIndex
    === 612,
'accepted R07A exposed B03 range drifted');

const candidateAnchorIndices = [];
for (let index = 196; index <= 596; index += 16) {
  candidateAnchorIndices.push(index);
}
candidateAnchorIndices.push(460);
candidateAnchorIndices.sort((left, right) => left - right);
invariant(candidateAnchorIndices.length === EXPECTED.candidateAnchorCount,
'candidate anchor count drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const selectedBents = [];
const excludedBents = [];
const unsafeFoundationViolations = [];

for (const anchorIndex of candidateAnchorIndices) {
  const anchor = b03.design.centerline.points.find(({ index }) => index === anchorIndex);
  invariant(anchor, `missing B03 centreline anchor ${anchorIndex}`);
  invariant(['EAST', 'WEST', 'NORTH'].includes(anchor.tangent),
    `unsupported tangent at anchor ${anchorIndex}`);
  const eastWest = anchor.tangent === 'EAST' || anchor.tangent === 'WEST';
  const tangent = eastWest ? { x: 1, z: 0 } : { x: 0, z: 1 };
  const cross = eastWest ? { x: 0, z: 1 } : { x: 1, z: 0 };
  const beam = [];
  const legs = [];
  const foundations = [];
  const candidateExclusions = [];

  for (let thickness = 0; thickness <= 1; thickness += 1) {
    for (let lateral = -3; lateral <= 3; lateral += 1) {
      beam.push({
        x: anchor.x + tangent.x * thickness + cross.x * lateral,
        y: anchor.y - 2,
        z: anchor.z + tangent.z * thickness + cross.z * lateral,
      });
    }
  }

  for (let thickness = 0; thickness <= 1; thickness += 1) {
    for (const lateral of [-3, -2, 2, 3]) {
      const legCells = [];
      let foundation = null;
      for (let y = anchor.y - 3; y >= MIN_WORLD_Y; y -= 1) {
        const cell = {
          x: anchor.x + tangent.x * thickness + cross.x * lateral,
          y,
          z: anchor.z + tangent.z * thickness + cross.z * lateral,
        };
        const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
        if (isReplaceable(state)) {
          legCells.push(cell);
          continue;
        }
        foundation = { cell, state };
        break;
      }
      invariant(foundation, `anchor ${anchorIndex} has no foundation above world minimum`);
      if (isFluid(foundation.state)
        || GRAVITY_BLOCKS.has(blockName(foundation.state))
        || FORBIDDEN_SOURCE_BLOCKS.has(blockName(foundation.state))) {
        unsafeFoundationViolations.push({ anchorIndex, ...foundation });
      } else if (!STABLE_FOUNDATION_BLOCKS.has(blockName(foundation.state))) {
        candidateExclusions.push({
          reason: 'first-contact-is-not-an-accepted-stable-foundation',
          ...foundation,
        });
      }
      legs.push(...legCells);
      foundations.push(foundation);
    }
  }

  const beamStates = [];
  for (const cell of beam) {
    const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
    beamStates.push({ cell, state });
    if (isFluid(state)
      || GRAVITY_BLOCKS.has(blockName(state))
      || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))) {
      unsafeFoundationViolations.push({ anchorIndex, cell, state });
    } else if (!isReplaceable(state)) {
      candidateExclusions.push({
        reason: 'beam-cell-is-not-an-exact-replaceable-state',
        cell,
        state,
      });
    }
  }

  if (candidateExclusions.length) {
    excludedBents.push({
      anchorIndex,
      anchor: { x: anchor.x, y: anchor.y, z: anchor.z, tangent: anchor.tangent },
      exclusions: candidateExclusions,
    });
  } else {
    selectedBents.push({
      anchorIndex,
      anchor: { x: anchor.x, y: anchor.y, z: anchor.z, tangent: anchor.tangent },
      beam: uniqueCells(beam),
      legs: uniqueCells(legs),
      foundations,
      beamStates,
    });
  }
}

invariant(unsafeFoundationViolations.length === 0,
  `${unsafeFoundationViolations.length} fluid/gravity/container foundation or beam violation(s): `
  + JSON.stringify(unsafeFoundationViolations.slice(0, 20)));
invariant(selectedBents.map(({ anchorIndex }) => anchorIndex).join(',')
  === EXPECTED.selectedAnchorIndices.join(','),
'selected bent indices drifted');
invariant(excludedBents.map(({ anchorIndex }) => anchorIndex).join(',')
  === EXPECTED.excludedAnchorIndices.join(','),
'conservatively excluded bent indices drifted');

const beamCells = uniqueCells(selectedBents.flatMap(({ beam }) => beam));
const legCells = uniqueCells(selectedBents.flatMap(({ legs }) => legs));
const designCells = uniqueCells([...beamCells, ...legCells]);
invariant(designCells.length === beamCells.length + legCells.length,
'beam and leg target sets intersect');
invariant(designCells.length === EXPECTED.designCellCount
  && hashCells(designCells) === EXPECTED.designCoordinateSetSha256,
'exact viaduct bent target identity drifted');

const operatedCells = [];
const alreadyTargetCells = [];
const sourceViolations = [];
for (const cell of designCells) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (sourceState === TARGET_STATE) {
    alreadyTargetCells.push(cell);
  } else if (AIR_BLOCKS.has(blockName(sourceState)) || sourceState === SAFE_TRANSIENT_STATE) {
    operatedCells.push({ cell, sourceState });
  } else {
    sourceViolations.push({
      cell,
      sourceState,
      fluid: isFluid(sourceState),
      gravity: GRAVITY_BLOCKS.has(blockName(sourceState)),
      forbiddenContainer: FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState)),
    });
  }
}
invariant(sourceViolations.length === 0,
  `${sourceViolations.length} unexpected target source state(s): `
  + JSON.stringify(sourceViolations.slice(0, 20)));
const operatedSourceCensus = sourceCensus(operatedCells);
invariant((operatedSourceCensus['minecraft:air'] ?? 0) === EXPECTED.airCellCount
  && (operatedSourceCensus[SAFE_TRANSIENT_STATE] ?? 0) === EXPECTED.snowCellCount
  && operatedCells.length === EXPECTED.designCellCount
  && alreadyTargetCells.length === 0,
'accepted-source partition drifted');

const targetKeys = new Set(designCells.map(cellKey));
const haloCells = uniqueCells(designCells.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))
)).filter((cell) => !targetKeys.has(cellKey(cell))));
const safetyEnvelope = uniqueCells([...designCells, ...haloCells]);
const safetyEnvelopeKeys = new Set(safetyEnvelope.map(cellKey));
const haloViolations = [];
for (const cell of haloCells) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (isFluid(state)
    || GRAVITY_BLOCKS.has(blockName(state))
    || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))) {
    haloViolations.push({
      cell,
      state,
      fluid: isFluid(state),
      gravity: GRAVITY_BLOCKS.has(blockName(state)),
      forbiddenContainer: FORBIDDEN_SOURCE_BLOCKS.has(blockName(state)),
    });
  }
}
invariant(haloViolations.length === 0,
  `${haloViolations.length} fluid/gravity/container violation(s) in the one-cell halo: `
  + JSON.stringify(haloViolations.slice(0, 20)));

const protectedRelicEnvelopeIntersections = [];
for (const relic of relics.relics) {
  const cells = safetyEnvelope.filter((cell) => (
    insideBounds(cell, relic.declaredInclusiveBounds)
  ));
  if (cells.length) {
    protectedRelicEnvelopeIntersections.push({ relic: relic.key, ...classManifest(cells) });
  }
}
invariant(protectedRelicEnvelopeIntersections.length === 0,
'target/halo envelope intersects a protected relic core');

const touchedChunkKeys = [...new Set(safetyEnvelope.map((cell) => (
  `${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`
)))].sort((left, right) => {
  const [lx, lz] = left.split(',').map(Number);
  const [rx, rz] = right.split(',').map(Number);
  return lx - rx || lz - rz;
});
const blockEntityEnvelopeIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkKeyValue of touchedChunkKeys) {
  const [cx, cz] = chunkKeyValue.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (safetyEnvelopeKeys.has(cellKey(point))) {
      blockEntityEnvelopeIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityTouchesTarget(entity, designCells)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: Array.isArray(entity.Pos) ? entity.Pos.slice(0, 3).map(Number) : null,
        chunk: { x: cx, z: cz },
      });
    }
  }
}
invariant(blockEntityEnvelopeIntersections.length === 0,
'target/halo envelope intersects a source block entity');
invariant(savedEntityHaloIntersections.length === 0,
'operation halo intersects a saved entity');

const designBounds = boundsOf(designCells);
const targetColumns = new Map();
for (const cell of designCells) {
  const key = `${cell.x},${cell.z}`;
  if (!targetColumns.has(key)) targetColumns.set(key, []);
  targetColumns.get(key).push(cell.y);
}
const priorReleaseIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const intersections = intersectPriorOperations(
      parseOperationBounds(pkg.forward),
      targetColumns,
      designBounds,
    );
    if (intersections.length) {
      priorReleaseIntersections.push({
        packageId: `${manifest.transactionId}/${pkg.key}`,
        manifestPath,
        operationPath: pkg.forward,
        ...classManifest(intersections),
      });
    }
  }
}
invariant(priorReleaseIntersections.length === 0,
  `viaduct targets intersect prior physical releases: `
  + JSON.stringify(priorReleaseIntersections));

const operationRuns = mergeVerticalOperations(operatedCells);
invariant(operationRuns.length > 0 && operationRuns.length < operatedCells.length,
'operation compaction did not produce non-empty merged guarded runs');
const forwardBody = `${operationRuns.map((operation) => replRegionLine(
  operation.from,
  operation.to,
  operation.sourceState,
  operation.targetState,
)).join('\n')}\n`;
const rollbackBody = `${operationRuns.map((operation) => replRegionLine(
  operation.from,
  operation.to,
  operation.targetState,
  operation.sourceState,
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const forward = path.join(OUT_DIR, `${BASENAME}.b03-viaduct-bents.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.b03-viaduct-bents.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (b03-viaduct-bents ${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(designCells)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const foundationCells = selectedBents.flatMap(({ foundations }) => (
  foundations.map(({ cell }) => cell)
));
const foundationStateCensus = sourceCensus(selectedBents.flatMap(({ foundations }) => (
  foundations.map(({ cell, state }) => ({ cell, sourceState: state }))
)));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R07A_POSTSTATE_AWAITING_HARD_SAFETY_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B03'],
  packages: [{ key: 'b03-viaduct-bents', forward, rollback }],
  executionOrder: {
    forward: ['b03-viaduct-bents'],
    rollback: ['b03-viaduct-bents'],
    rationale: 'A single isolated support package is its own exact reverse-order transaction.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    mvpScope: true,
    scopeIds: ['P1-B03'],
    purpose: 'Support the accepted exposed B03 portal tube with exact paired stone-brick viaduct bents while preserving both mountain-bearing portal approaches.',
    materialDoctrine: {
      support: TARGET_STATE,
      basis: 'Reuses the accepted R06 Grand Avenue structural support family and keeps the R07A polished-diorite enclosure visually distinct.',
    },
    geometry: {
      acceptedR07aExposedCenterlineRange: { firstIndex: 188, lastIndex: 612 },
      candidateRule: {
        regularFirstIndex: 196,
        regularLastIndex: 596,
        regularInterval: 16,
        addedTangentJointIndices: [460],
        portalApproachBearing: 'Indices 188..195 and 597..612 remain on the existing R05 mountain bearing.',
      },
      candidateAnchorIndices,
      selectedAnchorIndices: selectedBents.map(({ anchorIndex }) => anchorIndex),
      excludedCandidates: excludedBents,
      selectedBentCount: selectedBents.length,
      beam: {
        thicknessAlongRoute: 2,
        widthAcrossRoute: 7,
        verticalOffsetBelowCenterline: -2,
        ...classManifest(beamCells),
      },
      pairedLegs: {
        lateralOffsets: [-3, -2, 2, 3],
        thicknessAlongRoute: 2,
        topOffsetBelowCenterline: -3,
        ...classManifest(legCells),
      },
      fullDesign: classManifest(designCells),
      foundationContacts: {
        ...classManifest(foundationCells),
        sourceStateCensus: foundationStateCensus,
        allAcceptedStable: true,
      },
    },
    sourcePartition: {
      operated: classManifest(operatedCells.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTargetCells),
      sourceStateCensus: operatedSourceCensus,
      exactPartition: operatedCells.length + alreadyTargetCells.length === designCells.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    acceptedR07aPostQaPath: INPUTS.r07aPostQa,
    acceptedR07aManifestPath: INPUTS.r07aManifest,
    touchedChunkCount: touchedChunkKeys.length,
  },
  target: {
    operatedUnion: classManifest(operatedCells.map(({ cell }) => cell)),
    desiredStateCensus: { [TARGET_STATE]: operatedCells.length },
    alreadyTargetCellCount: alreadyTargetCells.length,
    packageTargetsDisjoint: true,
  },
  operations: {
    'b03-viaduct-bents': {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: operationRuns.length,
      rollbackCommandCount: operationRuns.length,
      targetCellCount: operatedCells.length,
      targetCoordinateSetSha256: hashCells(operatedCells.map(({ cell }) => cell)),
      exactInverse: true,
    },
    mergedRunSemantics: 'Each REPL is one exact vertical source-state run. Every expanded source cell was read from the bound R07A post snapshot; rollback reverses each run to that exact source state.',
  },
  isolation: {
    protectedRelicEnvelopeIntersectionCount: protectedRelicEnvelopeIntersections.length,
    blockEntityEnvelopeIntersectionCount: blockEntityEnvelopeIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: priorReleaseIntersections.length,
    oneCellHalo: classManifest(haloCells),
  },
  compileGuards: {
    unexpectedSourceStateViolationCount: sourceViolations.length,
    fluidSourceStateViolationCount: sourceViolations.filter(({ fluid }) => fluid).length,
    gravitySourceStateViolationCount: sourceViolations.filter(({ gravity }) => gravity).length,
    forbiddenContainerSourceStateViolationCount: sourceViolations
      .filter(({ forbiddenContainer }) => forbiddenContainer).length,
    unsafeFoundationViolationCount: unsafeFoundationViolations.length,
    haloUnsafeStateViolationCount: haloViolations.length,
    blockEntityEnvelopeViolationCount: blockEntityEnvelopeIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicEnvelopeViolationCount: protectedRelicEnvelopeIntersections.length,
    allowedTargetSourceStates: [
      'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
      SAFE_TRANSIENT_STATE, TARGET_STATE,
    ],
    nonFoundationCandidatePolicy: 'OMIT_ENTIRE_BENT_WITH_EXACT_EVIDENCE; DO_NOT_CLEAR_OR_ENTOMB_UNRELATED VEGETATION',
  },
  upstreamIdentities: {
    b03GeometryPath: INPUTS.b03Geometry,
    b03GeometrySha256: sha256(fs.readFileSync(absolute(INPUTS.b03Geometry))),
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    r07aManifestPath: INPUTS.r07aManifest,
    r07aManifestIdentity: r07a.manifestIdentity,
    r07aManifestFileSha256: sha256(fs.readFileSync(absolute(INPUTS.r07aManifest))),
    r07aPostQaPath: INPUTS.r07aPostQa,
    r07aPostQaPayloadSha256: r07aQa.qaPayloadSha256,
    protectedRelicClearancePath: INPUTS.protectedRelics,
    protectedRelicClearanceSha256: sha256(
      fs.readFileSync(absolute(INPUTS.protectedRelics)),
    ),
  },
  hardSafetyKernelNext: [
    'independent guarded-manifest QA',
    'exact forward preflight against the bound accepted R07A post snapshot',
    'strict-noop forward and rollback parser dry-runs',
    'fresh same-moment source capture and intake immediately before any execution',
    'recompile/current-safe delta if the fresh source identity differs',
    'fresh live entity clearance bound to both operation hashes',
    'strict-noop journaled execution',
    'fresh post snapshot and exact rollback post-state preflight',
    'scoped physical bent/foundation QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  candidateAnchorCount: candidateAnchorIndices.length,
  selectedAnchorCount: selectedBents.length,
  selectedAnchorIndices: selectedBents.map(({ anchorIndex }) => anchorIndex),
  excludedAnchorIndices: excludedBents.map(({ anchorIndex }) => anchorIndex),
  targetCellCount: operatedCells.length,
  commandCount: operationRuns.length,
  sourceStateCensus: operatedSourceCensus,
  forward,
  rollback,
  forwardSha256,
  rollbackSha256,
  protectedRelicEnvelopeIntersectionCount: 0,
  blockEntityEnvelopeIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  undeclaredPriorReleaseIntersectionCount: 0,
}, null, 2));
