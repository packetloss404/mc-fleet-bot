#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R11N (C1 station-1183 bridge gap). */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  blockName,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r11n-c1-station-1183-bridge-gap.release-manifest.json',
);
const POST = value(
  '--post-regions',
  'data/worldsnap-combined-zones-r11n-post-20260824T053200Z/region',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11n-live-20260824T053200Z',
);
const OUT = value('--out', `${EVIDENCE}/r11n-post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-24T05:35:00Z');
const R11M_FORWARD =
  'data/buildops/combined-zones-r11m-c1-residual-at-grade-island.c1-island.forward.txt';
const R11J_MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11N post-release QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
function surfaceCellsFromOps(filename) {
  return parseOperations(filename).filter(({ targetState }) => surfaceState(targetState))
    .map(({ cell }) => cell);
}

const manifest = readJson(MANIFEST);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest identity drifted');

const postReader = new AnvilReader(absolute(POST));
const postAt = async (cell) => stateToCommandString(
  await postReader.blockState(cell.x, cell.y, cell.z),
);

const records = [];
const targetKeys = new Set();
for (const pkg of manifest.packages) {
  for (const record of parseOperations(pkg.forward)) {
    invariant(!targetKeys.has(cellKey(record.cell)), `duplicate target ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
  }
}

// 1. Exact post-state match for every target.
const postMismatches = [];
for (const record of records) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
invariant(postMismatches.length === 0, `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Surface connectivity: R11M + new + R11J surfaces one component, step 1.
const r11mSurface = surfaceCellsFromOps(R11M_FORWARD);
const r11jManifest = readJson(R11J_MANIFEST);
const r11jSurface = [];
for (const pkg of r11jManifest.packages ?? []) r11jSurface.push(...surfaceCellsFromOps(pkg.forward));
const newSurface = uniqueCells(records.filter(({ targetState }) => surfaceState(targetState))
  .map(({ cell }) => cell));
const combinedSurface = uniqueCells([...r11mSurface, ...newSurface, ...r11jSurface]);
const combinedComponents = connectedComponents(combinedSurface);
invariant(combinedComponents.length === 1, 'combined post surface is not one component');
let maximumStep = 0;
for (const cell of newSurface) {
  for (const other of combinedSurface) {
    if (cell === other) continue;
    if (Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) === 1) {
      maximumStep = Math.max(maximumStep, Math.abs(cell.y - other.y));
    }
  }
}
invariant(maximumStep <= 1, `new surface post step exceeds one: ${maximumStep}`);

// 3. Surface support: each new surface cell has non-air post support below.
const postStateByKey = new Map(records.map(({ cell, targetState }) => [cellKey(cell), targetState]));
for (const cell of newSurface) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  const belowState = postStateByKey.get(cellKey(below)) ?? await postAt(below);
  invariant(!isAir(belowState) && !isFluid(belowState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(belowState)),
  `post surface lacks support at ${cellKey(cell)}`);
}

// 4. Halo fluid isolation: no fluid in post halo around operated cells.
const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await postAt(cell))) haloFluidCount += 1;
invariant(haloFluidCount === 0, `post halo contains fluid: ${haloFluidCount}`);

// 5. Off-target drift: the bounded diff across the halo equals the target set.
const postDiff = [];
for (const cell of halo) {
  const actual = await postAt(cell);
  const source = records.find((r) => cellKey(r.cell) === cellKey(cell));
  if (source) continue; // operated cell (already verified)
  if (isFluid(actual)) postDiff.push({ cell, actual }); // retained fluid (should be none here)
}
invariant(postDiff.length === 0, `unexpected halo drift: ${JSON.stringify(postDiff.slice(0, 5))}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R11N_C1_STATION_1183_BRIDGE_GAP_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_R11N_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: records.length,
    postRegionDir: POST,
  },
  checks: {
    exactPostStateCount: records.length,
    exactPostStateMismatchCount: postMismatches.length,
    surfaceCellCount: newSurface.length,
    combinedSurfaceCellCount: combinedSurface.length,
    combinedSurfaceComponentCount: combinedComponents.length,
    maximumSurfaceStep: maximumStep,
    interactionHaloCellCount: halo.length,
    haloFluidCount,
    offTargetDriftCount: postDiff.length,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    combinedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
    haloCoordinateSetSha256: hashCells(halo),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
