#!/usr/bin/env node
/**
 * MP02-SUBTROPOLIS-B08-SERVICE-SPINE-01.
 *
 * Compile a bounded first functional SubTropolis component: a six-wide floor
 * spine from the existing B08 west aperture through the 58-rise entry ramp to
 * a 6x3 level service contact landing at centreline index 120.  It is not a
 * tenant area, public lobby, public egress, vehicle route, or a connection to
 * B03/B09.  The end is deliberately index 121, well before the B03 throat.
 *
 * The default source is retained/historical; this compiler emits exact ops
 * solely for offline preflight.  A fresh full guarded release kernel is
 * mandatory before any live execution.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp02-subtropolis-b08-service-spine-01-historical-20260822');
const GENERATED_AT = value('--generated-at', '2026-08-26T070000Z');
const SOURCE_CLASS = value('--source-class', 'historical');
const PRESERVE_R07C_OPENINGS = argv.includes('--preserve-r07c-openings');
const RELEASE_ID = 'MP02-SUBTROPOLIS-B08-SERVICE-SPINE-01';
const GEOMETRY = 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
/* The accepted R07C B08 recovery leaves these route-opening targets as air.
 * They are an ownership boundary, not merely historical source states: an
 * MP02 floor may abut them, but may not pave them without a separately
 * reviewed interface migration.  Keeping this literal release binding means
 * a recompile from a new save cannot mistake the accepted air state for
 * unowned vacant volume. */
const R07C_ROUTE_OPENINGS =
  'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.b08-route-openings.forward.txt';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
fail(['historical', 'current'].includes(SOURCE_CLASS), '--source-class must be historical or current');
const historicalOnly = SOURCE_CLASS === 'historical';
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern',
  'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block',
  'minecraft:jigsaw', 'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:repeater', 'minecraft:comparator',
]);
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID.has(nameOf(state)) || state.includes('waterlogged=true');
const isForbidden = (state) => FORBIDDEN.has(nameOf(state)) || nameOf(state).endsWith('_shulker_box');
const manifestCells = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};

const operationTargetKeys = (filename) => {
  const keys = new Set();
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const tokens = line.trim().split(/\s+/);
    const [x1, y1, z1, x2, y2, z2] = tokens.slice(1, 7).map(Number);
    fail([x1, y1, z1, x2, y2, z2].every(Number.isInteger), `invalid retained interface operation: ${line}`);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) keys.add(`${x},${y},${z}`);
      }
    }
  }
  return keys;
};

const geometry = JSON.parse(fs.readFileSync(absolute(GEOMETRY), 'utf8')).serviceTunnelCenterline;
const geometryBinding = { path: GEOMETRY, sha256: sha256(fs.readFileSync(absolute(GEOMETRY))) };
const allPoints = geometry.centerline.points;
const selectedPoints = allPoints.filter((point) => point.index >= 0 && point.index <= 121);
fail(selectedPoints.length === 122 && selectedPoints.at(0).index === 0 && selectedPoints.at(-1).index === 121,
  'B08 index selection drifted');
fail(selectedPoints.at(-2).index === 120 && selectedPoints.at(-2).x === 2008 && selectedPoints.at(-2).y === 130
  && selectedPoints.at(-2).z === -688, 'B08 contact anchor drifted');

/* A point’s 6-wide floor band is exactly one below its centreline datum. At a
 * curve, use both declared orientations, giving the accepted turning platform.
 * Index 121 gives the second row north of the contact, so 119..121 form a
 * 6x3 level landing without entering B03. */
const floorCells = [];
for (const point of selectedPoints) {
  for (const orientation of point.orientations) {
    for (let lateral = -2; lateral <= 3; lateral += 1) {
      floorCells.push(orientation === 'x'
        ? { x: point.x, y: point.y - 1, z: point.z + lateral }
        : { x: point.x + lateral, y: point.y - 1, z: point.z });
    }
  }
}
const unmodifiedTargets = uniqueCells(floorCells);
fail(unmodifiedTargets.length === 729, `B08 service floor target count drifted: ${unmodifiedTargets.length}`);
const acceptedRouteOpeningKeys = operationTargetKeys(R07C_ROUTE_OPENINGS);
const unmodifiedTargetKeys = new Set(unmodifiedTargets.map(cellKey));
const retainedRouteOpeningOverlap = [...unmodifiedTargetKeys].filter((key) => acceptedRouteOpeningKeys.has(key)).sort();
const targets = PRESERVE_R07C_OPENINGS
  ? unmodifiedTargets.filter((cell) => !acceptedRouteOpeningKeys.has(cellKey(cell)))
  : unmodifiedTargets;
fail(targets.length === (PRESERVE_R07C_OPENINGS ? 719 : 729),
  `B08 service floor revised target count drifted: ${targets.length}`);
const targetKeys = new Set(targets.map(cellKey));
const directRetainedRouteOpeningOverlap = [...targetKeys].filter((key) => acceptedRouteOpeningKeys.has(key)).sort();
fail(directRetainedRouteOpeningOverlap.length === 0,
  `B08 floor conflicts with accepted R07C air route-opening ownership (${retainedRouteOpeningOverlap.length} cells): ${retainedRouteOpeningOverlap.join(', ')}`);
fail(PRESERVE_R07C_OPENINGS || retainedRouteOpeningOverlap.length === 0,
  `B08 floor conflicts with accepted R07C air route-opening ownership (${retainedRouteOpeningOverlap.length} cells): ${retainedRouteOpeningOverlap.join(', ')}`);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const records = [];
for (const cell of targets) {
  const sourceState = await sourceAt(cell);
  const feet = await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z });
  const head = await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z });
  fail(isAir(sourceState), `floor target not exact air: ${cellKey(cell)} = ${sourceState}`);
  fail(isAir(feet) && isAir(head), `two-clear service headroom missing above ${cellKey(cell)}: ${feet}; ${head}`);
  fail(!isFluid(sourceState) && !isFluid(feet) && !isFluid(head), `fluid at floor/headroom ${cellKey(cell)}`);
  fail(!isForbidden(sourceState) && !isForbidden(feet) && !isForbidden(head),
    `container/control/rail at floor/headroom ${cellKey(cell)}`);
  records.push({ cell, sourceState, targetState: 'minecraft:smooth_stone' });
}

/* Centerline service route: the existing west aperture is retained at x=1947,
 * then the 122 selected stations rise at normal one-block steps and continue
 * level to the far edge of the contact landing. */
/* The accepted R07C exterior aperture deliberately retains ten cells as air.
 * In the revision, do not repave them: normal walking descends across the
 * still-solid exterior ramp one level below the retained air, then rejoins the
 * six-wide B08 floor at index 4.  These are actual saved-world stations, not
 * a virtual diagonal or a claimed migration of R07C's route-opening cells. */
const retainedRampRoute = [
  { x: 1947, y: 72, z: -628 },
  { x: 1948, y: 72, z: -628 },
  { x: 1949, y: 73, z: -628 },
  { x: 1950, y: 73, z: -628 },
  { x: 1950, y: 73, z: -629 },
  { x: 1951, y: 74, z: -629 },
  { x: 1951, y: 75, z: -628 },
];
const serviceRoute = PRESERVE_R07C_OPENINGS
  ? [...retainedRampRoute, ...selectedPoints.filter(({ index }) => index >= 4)
    .map(({ x, y, z }) => ({ x, y, z }))]
  : [{ x: 1947, y: 72, z: -628 }, ...selectedPoints.map(({ x, y, z }) => ({ x, y, z }))];
const overlay = new Map(records.map(({ cell, targetState }) => [cellKey(cell), targetState]));
const projectedAt = async (cell) => overlay.get(cellKey(cell)) ?? sourceAt(cell);
for (let index = 0; index < serviceRoute.length; index += 1) {
  const point = serviceRoute[index];
  const [floor, feet, head] = await Promise.all([
    projectedAt({ x: point.x, y: point.y - 1, z: point.z }), projectedAt(point),
    projectedAt({ x: point.x, y: point.y + 1, z: point.z }),
  ]);
  fail(!isAir(floor) && !isFluid(floor) && !isForbidden(floor) && isAir(feet) && isAir(head),
    `projected normal-walk station invalid ${cellKey(point)}: floor=${floor}; feet=${feet}; head=${head}`);
  if (index > 0) {
    const prior = serviceRoute[index - 1];
    const horizontal = Math.abs(point.x - prior.x) + Math.abs(point.z - prior.z);
    fail(horizontal === 1 && Math.abs(point.y - prior.y) <= 1,
      `jump/sprint/diagonal route transition ${cellKey(prior)} -> ${cellKey(point)}`);
  }
}

/* Retained interfaces. Neither is operated or included in the service route
 * endpoint; the B03/B09 side remains beyond index 121. */
const westAperture = [];
for (let y = 72; y <= 75; y += 1) for (let z = -630; z <= -625; z += 1) westAperture.push({ x: 1947, y, z });
for (const cell of westAperture) fail(isAir(await sourceAt(cell)), `west aperture drift/closure ${cellKey(cell)}`);
const retainedOpeningCells = retainedRouteOpeningOverlap.map((key) => {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z };
});
if (PRESERVE_R07C_OPENINGS) {
  fail(retainedOpeningCells.length === 10, `expected ten retained R07C opening cells, found ${retainedOpeningCells.length}`);
  for (const cell of retainedOpeningCells) {
    fail(isAir(await sourceAt(cell)), `retained R07C route-opening drift/closure ${cellKey(cell)}`);
    fail(!targetKeys.has(cellKey(cell)), `revised target still touches retained R07C opening ${cellKey(cell)}`);
  }
}
const b03Exclusion = { minX: 2048, maxX: 2062, minY: 129, maxY: 134, minZ: -750, maxZ: -746 };
for (const cell of targets) fail(!(cell.x >= b03Exclusion.minX && cell.x <= b03Exclusion.maxX
  && cell.y >= b03Exclusion.minY && cell.y <= b03Exclusion.maxY && cell.z >= b03Exclusion.minZ && cell.z <= b03Exclusion.maxZ),
`B03/B09 exclusion touched: ${cellKey(cell)}`);

const halo = uniqueCells(targets.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
for (const cell of halo) {
  const state = await sourceAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (isForbidden(state)) haloForbiddenCount += 1;
}
fail(haloFluidCount === 0 && haloForbiddenCount === 0,
  `B08 interaction halo fluid/forbidden hazard: ${haloFluidCount}/${haloForbiddenCount}`);

/* Immutable entity/block-entity intake for the target + halo. */
const interaction = uniqueCells([...targets, ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunkKeys = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of chunkKeys) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    const cell = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [x, y, z] });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0,
  `immutable entity/block-entity conflict ${JSON.stringify({ blockEntities, savedEntities })}`);

const ordered = records.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const rollback = ordered.slice().reverse().map(({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }));
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${rollback.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = `data/buildops/${BASENAME}.forward.txt`;
const reverse = `data/buildops/${BASENAME}.rollback.txt`;
const manifest = `data/buildops/${BASENAME}.release-manifest.json`;
const header = (direction, hash) => [
  `# GENERATED FILE - ${RELEASE_ID} (${direction})`,
  historicalOnly
    ? `# HISTORICAL OFFLINE SOURCE ONLY: ${SNAPSHOT}`
    : `# FRESH CURRENT IMMUTABLE SOURCE: ${SNAPSHOT}`,
  historicalOnly
    ? '# NOT AUTHORIZED FOR EXECUTION: fresh live capture and complete guarded kernel required.'
    : '# NOT AUTHORIZED FOR EXECUTION: complete guarded kernel and same-moment entity clearance required.',
  `# operation SHA-256: ${hash}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(reverse), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: 'mp02-subtropolis-b08-service-spine-01',
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: historicalOnly
    ? 'OFFLINE_HISTORICAL_SOURCE_COMPILED_FRESH_LIVE_CAPTURE_REQUIRED'
    : 'COMPILED_FROM_FRESH_CURRENT_SOURCE_AWAITING_COMPLETE_GUARDED_KERNEL',
  source: { snapshotRoot: SNAPSHOT, historicalOnly, geometryBinding },
  purpose: 'Create the first dry, six-wide normal-walk B08 service spine and contact landing; no public/tenant/vehicle/B03 connection claim.',
  ownership: {
    owner: 'P1-B08 service-tunnel interior only',
    operatedIndices: { first: 0, last: 121 },
    westApertureRetained: { x: 1947, y: '72..75', z: '-630..-625' },
    b03B09Exclusion: b03Exclusion,
  },
  target: { serviceFloor: manifestCells(targets), interactionHalo: manifestCells(halo), desiredState: 'minecraft:smooth_stone' },
  acceptedInterfaces: {
    r07cRouteOpenings: {
      operation: R07C_ROUTE_OPENINGS,
      revisionMode: PRESERVE_R07C_OPENINGS ? 'RETAINED_AIR_RAMP_HANDOFF' : 'STRICT_NO_OVERLAP',
      unmodifiedCandidateOverlap: manifestCells(retainedOpeningCells),
      operatedOverlap: manifestCells(directRetainedRouteOpeningOverlap.map((key) => {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
      })),
      sourceStatesRequired: PRESERVE_R07C_OPENINGS ? 'all ten retained overlap cells exact air' : 'n/a',
      handoffRoute: PRESERVE_R07C_OPENINGS ? retainedRampRoute : null,
    },
  },
  routeAcceptance: {
    result: 'PASS', standard: 'normal walking only; no jump/sprint/dig/swim/climb',
    start: serviceRoute.at(0), end: serviceRoute.at(-1), stationCount: serviceRoute.length,
    maxVerticalDelta: 1, contactLanding: { indices: [119, 120, 121], width: 6, depth: 3 },
  },
  isolation: { haloFluidCount, haloForbiddenCount, blockEntities, savedEntities },
  operations: {
    forward: { path: forward, sha256: forwardSha256, commandCount: ordered.length },
    rollback: { path: reverse, sha256: rollbackSha256, commandCount: rollback.length }, exactInverse: true,
  },
  packages: [{
    key: 'service-spine-floor',
    forward,
    rollback: reverse,
    reactiveCells: [],
  }],
  executionAuthority: {
    authorizedByThisArtifact: false,
    requiredBeforeExecution: [
      'fresh immutable full source capture covering B08 and adjacent entrance',
      'fresh exact ownership/interface confirmation for B08 west aperture and B03/B09 exclusion',
      'fresh container/block-entity and live-entity clearance', 'strict-noop parser and exact source preflight',
      'journalled execution, post snapshot, rollback post-state preflight, independent normal-walk route QA',
    ],
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifest), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: manifestWithoutIdentity.status, forward, rollback: reverse, manifest, manifestIdentity,
  targetCells: targets.length, routeStations: serviceRoute.length, haloFluidCount, haloForbiddenCount,
  blockEntities: blockEntities.length, savedEntities: savedEntities.length }, null, 2));
