#!/usr/bin/env node
/** Compile TE-NEXT-01 — Town Expansion R1 owner rest-suite ceiling lighting.
 *
 * The seven owner corridor rest suites (OWNER-REST-A..G) are fully furnished
 * underground hospitality rooms with 30 fixtures each but ZERO light sources.
 * The owner corridor source-of-truth requires "warm ceiling lights at
 * eight-block centers" (worker-town-gilded-raven-theater-owner-tunnel-
 * source-of-truth.md); the corridor itself is lit with
 * minecraft:ochre_froglight[axis=y] at y=-38 on 8-block centers.
 *
 * This package installs the same warm ceiling light at y=-34 (the suite
 * ceiling layer) at the 8-block grid centers that sit above a fully clear
 * air column (y=-43..-35), i.e. above the open walkable lounge space. It
 * never touches a wall, a block-entity bookshelf, the red-room annex partial
 * ceilings, the purple-wool divider columns, or any lower-level cell.
 *
 * Every operated cell is an exact one-cell REPL guard
 * (minecraft:deepslate_bricks -> minecraft:ochre_froglight[axis=y]) with an
 * exact inverse rollback. The package is disjoint from the natural copper
 * oxidation rollback-only policy and from every protected feature.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T08:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'town-expansion-r1-rest-suite-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'town-expansion-r1-rest-suite-lighting';
const RELEASE_ID = 'TE-NEXT-01';
const RELEASE_NODE_ID = 'CZ-TOWN-EXPANSION-R1';
const SOURCE_OF_TRUTH = 'docs/redevelopment/2026-07-28-town-expansion/worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md';

const SUITES = [
  { id: 'OWNER-REST-A', x: [20, 48], z: [-351, -331] },
  { id: 'OWNER-REST-B', x: [20, 48], z: [-269, -249] },
  { id: 'OWNER-REST-C', x: [157, 186], z: [-161, -141] },
  { id: 'OWNER-REST-D', x: [157, 186], z: [-111, -91] },
  { id: 'OWNER-REST-E', x: [172, 201], z: [30, 50] },
  { id: 'OWNER-REST-F', x: [235, 264], z: [62, 82] },
  { id: 'OWNER-REST-G', x: [326, 355], z: [90, 110] },
];
const CEILING_Y = -34;
const LIGHT_STATE = 'minecraft:ochre_froglight[axis=y]';
const SOURCE_STATE = 'minecraft:deepslate_bricks';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`TE-NEXT-01 rest-suite lighting compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

// Derive the 8-block ceiling light grid. For each suite, walk x from x0+4 and
// z from z0+4 by 8. A cell is a target when the ceiling is exactly the
// deepslate_bricks roof slab AND the full air column below it (y=-43..-35) is
// clear — i.e. the light hangs over open walkable lounge space.
const records = [];
const targetKeys = new Set();
for (const suite of SUITES) {
  let suiteTargets = 0;
  for (let x = suite.x[0] + 4; x <= suite.x[1]; x += 8) {
    for (let z = suite.z[0] + 4; z <= suite.z[1]; z += 8) {
      const cell = { x, y: CEILING_Y, z };
      const key = cellKey(cell);
      if (targetKeys.has(key)) continue;
      const ceil = await sourceAt(cell);
      if (blockName(ceil) !== 'minecraft:deepslate_bricks') continue;
      let clear = true;
      for (let y = -43; y <= -35; y += 1) {
        const st = await sourceAt({ x, y, z });
        if (!st.startsWith('minecraft:air')) { clear = false; break; }
      }
      if (!clear) continue;
      invariant(!isFluid(ceil), `ceiling fluid at ${key}`);
      targetKeys.add(key);
      records.push({ cell, sourceState: ceil, targetState: LIGHT_STATE, role: 'ceiling-light', suiteId: suite.id });
      suiteTargets += 1;
    }
  }
  invariant(suiteTargets >= 3, `suite ${suite.id} has only ${suiteTargets} grid lights`);
}
invariant(records.length === 21, `expected 21 ceiling lights, got ${records.length}`);

// Per-suite light counts must match the derived grid.
const bySuite = {};
for (const r of records) bySuite[r.suiteId] = (bySuite[r.suiteId] || 0) + 1;
invariant(JSON.stringify(Object.values(bySuite).sort((a, b) => a - b)) === JSON.stringify([3, 3, 3, 3, 3, 3, 3]),
  `per-suite light distribution drift: ${JSON.stringify(bySuite)}`);

// Interaction halo (6-neighbour) — fluid/forbidden audit.
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const halo = uniqueCells(records.flatMap(({ cell }) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);

// The operated cell is the suite roof slab itself (full deepslate_bricks). The
// ochre_froglight is a full non-gravity block replacing that slab 1:1, so no
// floating/gravity/support concern exists regardless of the (non-fluid) strata
// above. We only require the ceiling above the operated cell is not fluid.
for (const r of records) {
  const above = await sourceAt({ x: r.cell.x, y: -33, z: r.cell.z });
  invariant(!isFluid(above), `ceiling above target is fluid at ${cellKey(r.cell)}`);
}

const ordered = records.slice().sort((a, b) => (
  a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z
));
const rollback = ordered.slice().reverse().map(
  ({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }),
);
const forwardBody = `${ordered.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const rollbackBody = `${rollback.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetCoordinateSetSha256 = hashCells(records.map(({ cell }) => cell));
const canonicalForward = `data/buildops/${BASENAME}.rest-suite-ceiling-lighting.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.rest-suite-ceiling-lighting.rollback.txt`;
const outputForward = path.join(OUT_DIR, `${BASENAME}.rest-suite-ceiling-lighting.forward.txt`);
const outputRollback = path.join(OUT_DIR, `${BASENAME}.rest-suite-ceiling-lighting.rollback.txt`);
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (rest-suite-ceiling-lighting ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(outputForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(outputRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['TE-GILDED-RAVEN-OWNER-ROUTE'],
  packages: [{
    key: 'rest-suite-ceiling-lighting',
    forward: canonicalForward,
    rollback: canonicalRollback,
  }],
  executionOrder: {
    forward: ['rest-suite-ceiling-lighting'],
    rollback: ['rest-suite-ceiling-lighting'],
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'TOWN-EXPANSION-R1',
    purpose: 'Install the owner corridor rest suites (OWNER-REST-A..G) warm ceiling lighting at eight-block centers (minecraft:ochre_froglight[axis=y]) at the suite ceiling layer y=-34, matching the owner corridor standard. The seven suites are fully furnished but currently contain zero light sources.',
    ceilingLights: classManifest(records.map(({ cell }) => cell)),
    perSuite: bySuite,
    interactionHalo: classManifest(halo),
    commissions: 'PASSIVE_WARM_CEILING_ILLUMINATION_ONLY',
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    sourceOfTruth: fileBinding(SOURCE_OF_TRUTH),
  },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'rest-suite-ceiling-lighting': {
      role: 'owner rest-suite warm ceiling lights',
      forwardSha256, rollbackSha256,
      forwardCommandCount: records.length,
      rollbackCommandCount: rollback.length,
      targetCellCount: records.length,
      targetCoordinateSetSha256,
      exactInverse: true,
    },
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    blockEntityIntersectionCount: 0,
    savedEntityIntersectionCount: 0,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: records.length,
  perSuite: bySuite,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
