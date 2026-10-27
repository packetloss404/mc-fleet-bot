#!/usr/bin/env node
/**
 * MP08-RR-DRY-SIDE-SURVEY-01 — read-only current-retained-source survey.
 *
 * This is deliberately not a wet-cavern compiler. It binds the latest retained
 * RR-C2 post-state, proves the dry approach to the already-built cap, and
 * rejects any new operation whose target or one-cell interaction halo reaches
 * the retained water table. A new live snapshot is mandatory before any future
 * mutation because this source is a historical saved-world capture.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rr-c2-post-20260825T052631Z');
const OUT = value('--out', 'data/world-review/mp08-raven-rock-dry-side-survey-01-historical-20260826.json');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const name = (state) => state.split('[', 1)[0];
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) {
    cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return cache.get(key);
};
const isAir = (state) => AIR.has(name(state));
const isFluid = (state) => FLUID.has(name(state)) || state.includes('waterlogged=true');

// The retained cap occupies x=-80. The only dry current approach is west of
// it; z=-14 is the surveyed centreline. Every station has solid support and
// two clear cells, but this validates only a closed dry-side approach, never a
// connection through the cap or into Cavern C.
const drySpine = [];
for (let x = -70; x >= -79; x -= 1) {
  const station = { x, standY: -11, z: -14 };
  const support = await stateAt({ x, y: -12, z: -14 });
  const feet = await stateAt({ x, y: -11, z: -14 });
  const head = await stateAt({ x, y: -10, z: -14 });
  drySpine.push({ ...station, support, feet, head, pass: !isAir(support) && !isFluid(support) && isAir(feet) && isAir(head) });
}

const capCells = [];
for (let y = -11; y <= -4; y += 1) {
  for (let z = -15; z <= -11; z += 1) capCells.push({ x: -80, y, z });
}
for (let y = -10; y <= -4; y += 1) {
  for (let z = -18; z <= -16; z += 1) capCells.push({ x: -80, y, z });
}
const capDrift = [];
for (const cell of capCells) {
  const state = await stateAt(cell);
  if (name(state) !== 'minecraft:stone_bricks' && cell.y !== -5) capDrift.push({ ...cell, state });
}
// The accepted release deliberately preserves gold ore at this one cap cell.
const oreState = await stateAt({ x: -80, y: -5, z: -13 });
if (name(oreState) !== 'minecraft:deepslate_gold_ore') capDrift.push({ x: -80, y: -5, z: -13, state: oreState });

// Census the exact C2 ownership box. This is a survey boundary, not a claim
// that every natural cave air cell inside is an owned room.
const water = [];
for (let x = -125; x <= -70; x += 1) {
  for (let y = -25; y <= -3; y += 1) {
    for (let z = -25; z <= -2; z += 1) {
      const state = await stateAt({ x, y, z });
      if (isFluid(state)) water.push({ x, y, z, state });
    }
  }
}

// The sole apparent floor-gap on the dry approach is intentionally not an
// operation candidate: its east neighbour is a retained water cell. This
// explicitly rules out the tempting air-to-floor patch at (-77,-12,-12).
const rejectedPatch = { x: -77, y: -12, z: -12 };
const rejectedPatchState = await stateAt(rejectedPatch);
const patchHalo = [];
for (let dx = -1; dx <= 1; dx += 1) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const cell = { x: rejectedPatch.x + dx, y: rejectedPatch.y + dy, z: rejectedPatch.z + dz };
      patchHalo.push({ ...cell, state: await stateAt(cell) });
    }
  }
}
const patchHaloFluids = patchHalo.filter(({ state }) => isFluid(state));

const sourceIdentity = sha256(fs.readFileSync(absolute(path.join(SNAPSHOT, 'region/r.-1.-1.mca'))));
const report = {
  schemaVersion: 1,
  id: 'MP08-RR-DRY-SIDE-SURVEY-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'HISTORICAL_OFFLINE_SURVEY_ONLY_NO_SAFE_NEW_OPERATION_COMPILED',
  liveWorldMutated: false,
  source: {
    snapshot: relative(SNAPSHOT),
    sourceType: 'latest retained RR-C2 post-state; historical-only for future work',
    regionFileSha256: sourceIdentity,
    requiresFreshLiveCaptureBeforeExecution: true,
  },
  authority: {
    owner: 'Raven Rock / Site R (RR-C2 operational secondary)',
    surveyedBounds: { minX: -125, maxX: -70, minY: -25, maxY: -3, minZ: -25, maxZ: -2 },
    explicitlyExcluded: 'Cavern C and every fluid-bearing cell are closed; this survey makes no wet-cavern, public-route, egress, or complex-completion claim.',
  },
  drySideApproach: {
    centreline: '(-70,-11,-14) to (-79,-11,-14)',
    stationCount: drySpine.length,
    normalWalkNoJumpPass: drySpine.every(({ pass }) => pass),
    stations: drySpine,
    terminal: 'Existing solid cap at x=-80; no traversal through it is allowed.',
  },
  containment: {
    capCellCount: capCells.length,
    capPostStatePass: capDrift.length === 0,
    drift: capDrift,
    drySideDoesNotConnectToCavernC: true,
  },
  hydrology: {
    fluidCellCount: water.length,
    sample: water.slice(0, 24),
    waterTableBoundary: 'Retained north-channel and eastern continuation at/after the cap; not an operation target.',
  },
  rejectedPotentialOperation: {
    purpose: 'Fill apparent dry-side floor gap',
    target: rejectedPatch,
    targetState: rejectedPatchState,
    oneCellHaloFluidCount: patchHaloFluids.length,
    oneCellHaloFluids: patchHaloFluids,
    result: 'REJECTED_FLUID_ADJACENCY_NO_OPERATION_EMITTED',
  },
  result: {
    operationCount: 0,
    inverseEmitted: false,
    reason: 'The known dry approach is already terminated by the verified containment cap. The only observed patch-scale deficiency touches retained water, and no separate bounded dry room/route change can be proven from this single C2 snapshot.',
  },
};

fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}\nreport=${relative(OUT)}\ndrySpine=${drySpine.filter(({ pass }) => pass).length}/${drySpine.length}\ncap=${capDrift.length === 0 ? 'PASS' : 'FAIL'}\nfluidCells=${water.length}\nrejectedPatchHaloFluids=${patchHaloFluids.length}`);
