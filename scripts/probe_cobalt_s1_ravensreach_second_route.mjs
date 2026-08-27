#!/usr/bin/env node
/** READ-ONLY COBALT-S1 Ravensreach second public street-to-platform route survey.
 *
 *  Probes the accepted r08am post snapshot and the built cobalt-rr post snapshot
 *  to (a) confirm the built RR-SE-1 access shaft, (b) survey the RR-SC-1/RR-SC-2
 *  candidate surface areas, and (c) establish the exact dry shaft column(s) for a
 *  second public street-to-platform route into the Ravensreach station box.
 *
 *  No world edit, no RCON, no live service call. Reads only immutable Anvil.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
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

const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750');
const ACCEPTED = value('--accepted', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/world-review/cobalt-s1-second-route-survey-20260825');
const OUT = value('--out', path.join(OUT_DIR, 'cobalt-s1-second-route-survey.json'));

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');

// ---- snapshot helpers ----
const regionHashOf = (root) => {
  const files = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) collect(path.join(dir, entry.name));
      else if (entry.name.endsWith('.mca')) files.push(path.join(dir, entry.name));
    }
  };
  collect(absolute(path.join(root, 'region')));
  files.sort();
  return sha256(Buffer.concat(files.map((file) => {
    const name = path.basename(file);
    return Buffer.concat([Buffer.from(name), Buffer.from([0]), fs.readFileSync(file), Buffer.from([0])]);
  })));
};
const makeReader = (root) => {
  const reader = new AnvilReader(absolute(path.join(root, 'region')));
  const cache = new Map();
  return {
    stateAt: async (x, y, z) => {
      const key = `${x},${y},${z}`;
      if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
      return cache.get(key);
    },
  };
};

// ---- bound helpers ----
const cellsIn = (b) => {
  const out = [];
  for (let x = b.minX; x <= b.maxX; x += 1) {
    for (let y = b.minY; y <= b.maxY; y += 1) {
      for (let z = b.minZ; z <= b.maxZ; z += 1) out.push({ x, y, z });
    }
  }
  return out;
};
const census = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

// ---- known geometry ----
const RR_SHAFT_SLEEVE_BOX = { minX: -160, maxX: -156, minY: 22, maxY: 63, minZ: -392, maxZ: -388 };
const RR_SHAFT_CLEAR = { minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -391, maxZ: -389 };
const CORRIDOR_HEAD = { minX: -181, maxX: -156, minY: 18, maxY: 23, minZ: -392, maxZ: -387 };
const RR_SC1_PLATEAU = { minX: -162, maxX: -150, minY: 60, maxY: 67, minZ: -400, maxZ: -388 };
const RR_SC2_SOUTH_MEADOW = { minX: -166, maxX: -154, minY: 60, maxY: 67, minZ: -410, maxZ: -398 };
const PLATFORM_BOX_LAYER = { minX: -181, maxX: -156, minY: 18, maxY: 23, minZ: -387, maxZ: -376 };

// ---- protected / restricted bounds ----
const APPROACH_ROAD = { minX: -999, maxX: -80, minY: -64, maxY: 110, minZ: -490, maxZ: -480 };
const RRCH_LIBRARY = { minX: -144, maxX: -111, minY: -64, maxY: 110, minZ: -448, maxZ: -426 };
const RRCH_CIVIC = [
  { minX: -100, maxX: -70, minY: -64, maxY: 110, minZ: -392, maxZ: -341 }, // RRCH-MOOT
  { minX: -95, maxX: -75, minY: -64, maxY: 110, minZ: -420, maxZ: -408 },  // RRCH-STOREHOUSE
  { minX: -110, maxX: -94, minY: -64, maxY: 110, minZ: -447, maxZ: -432 }, // TE-LIBRARY-TERRACE
];
const RAVENSGATE_EXCLUSION = { minX: -148, maxX: -64, minY: -64, maxY: 35, minZ: -562, maxZ: -420 };

const inBounds = (b, x, y, z) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
const overlapsAny = (bounds, cell) => RRCH_CIVIC.some((civic) => inBounds(civic, cell.x, cell.y, cell.z))
  || inBounds(RRCH_LIBRARY, cell.x, cell.y, cell.z)
  || inBounds(APPROACH_ROAD, cell.x, cell.y, cell.z)
  || inBounds(RAVENSGATE_EXCLUSION, cell.x, cell.y, cell.z);

console.log(`Surveying snapshot ${SNAPSHOT} with accepted baseline ${ACCEPTED}`);

const post = makeReader(SNAPSHOT);
const pre = makeReader(ACCEPTED);
const postRegionSha = regionHashOf(SNAPSHOT);
const acceptedRegionSha = regionHashOf(ACCEPTED);
console.log(`post region sha256: ${postRegionSha}`);
console.log(`accepted region sha256: ${acceptedRegionSha}`);

// ---- 1. Confirm built RR-SE-1 sleeve in the post snapshot ----
const shaftCells = cellsIn(RR_SHAFT_SLEEVE_BOX);
const shaftRecords = [];
for (const cell of shaftCells) {
  shaftRecords.push({ cell, state: await post.stateAt(cell.x, cell.y, cell.z) });
}
const sleeveCells = shaftRecords.filter((r) => r.state === 'minecraft:polished_deepslate');
const clearRecords = [];
for (const cell of cellsIn(RR_SHAFT_CLEAR)) {
  const state = await post.stateAt(cell.x, cell.y, cell.z);
  clearRecords.push({ cell, state });
}
const clearFluid = clearRecords.filter((r) => isFluid(r.state));
const clearForbidden = clearRecords.filter((r) => isForbidden(r.state));
console.log(`\n=== RR-SE-1 built sleeve in post ===`);
console.log(`sleeve box cells: ${shaftRecords.length}, polished_deepslate: ${sleeveCells.length}`);
console.log(`clear volume cells: ${clearRecords.length}, fluid: ${clearFluid.length}, forbidden: ${clearForbidden.length}`);
console.log(`clear volume top-5 states: ${JSON.stringify(census(clearRecords))}`);

// ---- 2. Surface condition at RR-SC-1 plateau and RR-SC-2 south meadow (post) ----
const surfaceReport = async (name, bounds, reader) => {
  const rows = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      let top = null;
      let topY = null;
      for (let y = 62; y <= 70; y += 1) {
        const state = await reader.stateAt(x, y, z);
        if (!isAir(state)) { top = state; topY = y; break; }
      }
      rows.push({ x, z, topY, top });
    }
  }
  const summary = Object.fromEntries([...rows.reduce((counts, r) => {
    const key = `${r.top ?? 'void'}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
  return { name, bounds, rowCount: rows.length, summary, rows };
};
const sc1SurfacePost = await surfaceReport('RR-SC-1 plateau', RR_SC1_PLATEAU, post);
const sc1SurfacePre = await surfaceReport('RR-SC-1 plateau (accepted)', RR_SC1_PLATEAU, pre);
const sc2SurfacePost = await surfaceReport('RR-SC-2 south meadow', RR_SC2_SOUTH_MEADOW, post);
console.log(`\n=== Surface (y62-70 first solid) ===`);
console.log(`RR-SC-1 post: ${JSON.stringify(sc1SurfacePost.summary)}`);
console.log(`RR-SC-2 post: ${JSON.stringify(sc2SurfacePost.summary)}`);

// ---- 3. Vertical dry-column survey for the second shaft ----
// A second public route needs a dry vertical column from the platform/corridor
// level (y18..23) up to a public surface entry. Survey 3x3 clear footprints in
// the RR-SC-2 south meadow area and the east edge of RR-SC-1 for full-column
// dryness (y18..62), zero fluid, zero gravity, zero forbidden, and surface reach.
const dryColumnSurvey = async (reader, cxMin, cxMax, czMin, czMax, yTop) => {
  const candidates = [];
  for (let cx = cxMin; cx <= cxMax; cx += 1) {
    for (let cz = czMin; cz <= czMax; cz += 1) {
      const clearCells = [];
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          for (let y = 18; y <= yTop; y += 1) clearCells.push({ x: cx + dx, y, z: cz + dz });
        }
      }
      const records = [];
      let fluid = 0; let gravity = 0; let forbidden = 0; let surfaceBlocked = 0;
      for (const cell of clearCells) {
        const state = await reader.stateAt(cell.x, cell.y, cell.z);
        records.push({ cell, state });
        if (isFluid(state)) fluid += 1;
        if (isGravity(state)) gravity += 1;
        if (isForbidden(state)) forbidden += 1;
      }
      // surface reach: is there a solid surface at or above y60 somewhere in the 3x3
      let surfaceY = null;
      for (let y = 62; y <= 68; y += 1) {
        const state = await reader.stateAt(cx, y, cz);
        if (!isAir(state)) { surfaceY = y; break; }
      }
      candidates.push({
        cx, cz,
        clearCellCount: clearCells.length,
        fluid, gravity, forbidden,
        surfaceY,
        dry: fluid === 0 && gravity === 0 && forbidden === 0,
      });
    }
  }
  return candidates;
};

const sc2DryColumns = await dryColumnSurvey(post, -167, -153, -411, -397, 62);
const sc1EastDryColumns = await dryColumnSurvey(post, -161, -149, -399, -387, 62);
console.log(`\n=== Fully dry 3x3 columns (y18..62) in RR-SC-2 meadow (post) ===`);
for (const c of sc2DryColumns.filter((c) => c.dry)) {
  console.log(`  (${c.cx},${c.cz}) surfaceY=${c.surfaceY}`);
}
console.log(`=== Fully dry 3x3 columns (y18..62) in RR-SC-1 east edge (post) ===`);
for (const c of sc1EastDryColumns.filter((c) => c.dry)) {
  console.log(`  (${c.cx},${c.cz}) surfaceY=${c.surfaceY}`);
}

// ---- 4. Column profiles for candidate second-shaft sites ----
const profileColumns = [
  { cx: -158, cz: -402, label: 'RR-SC-2 meadow NW' },
  { cx: -157, cz: -400, label: 'RR-SC-2 meadow N' },
  { cx: -160, cz: -400, label: 'RR-SC-2 meadow W' },
  { cx: -162, cz: -404, label: 'RR-SC-2 meadow SW' },
  { cx: -150, cz: -392, label: 'RR-SC-1 east edge' },
  { cx: -150, cz: -390, label: 'RR-SC-1 east edge 2' },
];
console.log(`\n=== Candidate second-shaft column profiles (post, x,z at 18..64) ===`);
for (const { cx, cz, label } of profileColumns) {
  const rows = [];
  for (let y = 18; y <= 64; y += 1) {
    const state = await post.stateAt(cx, y, cz);
    const b = blockName(state);
    if (isFluid(state) || b === 'minecraft:air' || b === 'minecraft:cave_air' || y === 18 || y === 62 || y === 63 || y === 64) {
      rows.push(`${y}:${b}${isFluid(state) ? '*' : ''}`);
    }
  }
  console.log(`${label} (${cx},${cz}): ${rows.join(' ')}`);
}

// ---- 5. Survey the corridor-head / platform band for the connector ----
const platformBandRecords = [];
for (const cell of cellsIn(PLATFORM_BOX_LAYER)) {
  const state = await post.stateAt(cell.x, cell.y, cell.z);
  platformBandRecords.push({ cell, state });
}
const pbFluid = platformBandRecords.filter((r) => isFluid(r.state));
const pbForbidden = platformBandRecords.filter((r) => isForbidden(r.state));
const pbAir = platformBandRecords.filter((r) => isAir(r.state));
console.log(`\n=== Platform box layer (x=-181..-156, y18..23, z=-387..-376) ===`);
console.log(`cells: ${platformBandRecords.length}, air: ${pbAir.length}, fluid: ${pbFluid.length}, forbidden: ${pbForbidden.length}`);

// ---- 6. Route ownership overlap check for candidate second route cells ----
// The second route must stay clear of Approach Road, library, civic rooms, and
// the Ravensgate exclusion. Check a candidate second-route cell set.
const secondRouteCandidates = cellsIn({ minX: -162, maxX: -156, minY: 18, maxY: 62, minZ: -404, maxZ: -398 });
const overlapCells = [];
for (const cell of secondRouteCandidates) {
  if (overlapsAny({}, cell)) {
    const state = await post.stateAt(cell.x, cell.y, cell.z);
    overlapCells.push({ ...cell, state });
  }
}
console.log(`\n=== Candidate second-route cells overlapping restricted/protected bounds ===`);
console.log(`cells: ${secondRouteCandidates.length}, overlapping: ${overlapCells.length}`);
console.log(overlapCells.map((c) => `${c.x},${c.y},${c.z}=${c.state}`).slice(0, 20).join('\n'));

// ---- output ----
const payloadWithoutIdentity = {
  schemaVersion: 1,
  id: 'cobalt-s1-ravensreach-second-route-survey',
  status: 'SURVEY_COMPLETE_READONLY',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  snapshots: {
    builtPost: { root: relative(SNAPSHOT), regionSha256: postRegionSha },
    acceptedDesign: { root: relative(ACCEPTED), regionSha256: acceptedRegionSha },
  },
  rrsE1: {
    sleeveBox: RR_SHAFT_SLEEVE_BOX,
    clearVolume: RR_SHAFT_CLEAR,
    builtSleeveCellCount: sleeveCells.length,
    clearVolumeCellCount: clearRecords.length,
    clearVolumeFluid: clearFluid.length,
    clearVolumeForbidden: clearForbidden.length,
    clearVolumeCensus: census(clearRecords),
  },
  surface: {
    rrsC1Post: sc1SurfacePost.summary,
    rrsC1Accepted: sc1SurfacePre.summary,
    rrsC2Post: sc2SurfacePost.summary,
  },
  secondRouteDryColumns: {
    sc2Meadow: sc2DryColumns.filter((c) => c.dry),
    sc1EastEdge: sc1EastDryColumns.filter((c) => c.dry),
  },
  platformBand: {
    bounds: PLATFORM_BOX_LAYER,
    cellCount: platformBandRecords.length,
    air: pbAir.length,
    fluid: pbFluid.length,
    forbidden: pbForbidden.length,
  },
  restrictedOverlapCandidates: {
    candidateBounds: { minX: -162, maxX: -156, minY: 18, maxY: 62, minZ: -404, maxZ: -398 },
    cellCount: secondRouteCandidates.length,
    overlapCellCount: overlapCells.length,
    overlapCells: overlapCells.slice(0, 50),
  },
};
const payloadSha256 = sha256(Buffer.from(`${JSON.stringify(payloadWithoutIdentity, null, 2)}\n`));
const report = { ...payloadWithoutIdentity, payloadSha256 };

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote ${relative(OUT)}`);
console.log(`payloadSha256: ${payloadSha256}`);
console.log('DONE');
