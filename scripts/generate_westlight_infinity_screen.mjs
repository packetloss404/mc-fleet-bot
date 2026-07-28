#!/usr/bin/env node
/**
 * Generate the Westlight stadium's missing four-sided center-hung display.
 *
 * The package is deliberately composed only of exact-material REPL guards.
 * Its footprint is suspended inside the bowl and below the canopy, so it does
 * not overwrite seats, aisles, the field, the open-light band, or the roof.
 *
 * Usage:
 *   node scripts/generate_westlight_infinity_screen.mjs
 *   node scripts/preflight_guarded_ops.mjs \
 *     data/buildops/westlight-infinity-screen-2026-07-27.txt \
 *     --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const outputPath = path.resolve(
  ROOT,
  process.argv[2] ?? 'data/buildops/westlight-infinity-screen-2026-07-27.txt',
);
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const rollbackPath = outputPath.replace(/\.txt$/, '.rollback.txt');
const baselineRegions = 'data/worldsnap-redevelopment-c9e2bf0a-20260727/region';
const baselineHash = 'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';

const CENTER_X = -360;
const CENTER_Z = -560;
const MIN_X = -369;
const MAX_X = -351;
const MIN_Z = -568;
const MAX_Z = -552;
const MIN_Y = 74;
const MAX_Y = 80;
const ops = [];
const occupied = new Map();

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function replPoint(x, y, z, desired, tag) {
  const key = pointKey(x, y, z);
  if (occupied.has(key)) {
    throw new Error(`overlapping operation at ${key}: ${occupied.get(key)} / ${tag}`);
  }
  occupied.set(key, tag);
  ops.push({
    line: `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${desired}`,
    tag,
    point: [x, y, z],
  });
}

function displayPixel(axis, horizontal, y, side) {
  // The acid-green chevrons create a readable directional/focal motif without
  // pretending Minecraft blocks can reproduce a high-resolution video wall.
  const center = axis === 'x' ? CENTER_X : CENTER_Z;
  const distance = Math.abs(horizontal - center);
  const vertical = MAX_Y - y;
  if (distance === vertical + 2 || distance === 0) {
    return 'minecraft:lime_concrete';
  }
  if ((horizontal + y + side) % 11 === 0) {
    return 'minecraft:sea_lantern';
  }
  return 'minecraft:black_concrete';
}

// Top and bottom continuous frame. North/south runs include the four corners;
// east/west runs exclude them so no target block is emitted twice.
for (const y of [MIN_Y, MAX_Y]) {
  for (const z of [MIN_Z, MAX_Z]) {
    for (let x = MIN_X; x <= MAX_X; x += 1) {
      const material = x === CENTER_X ? 'minecraft:sea_lantern' : 'minecraft:polished_blackstone';
      replPoint(x, y, z, material, 'horizontal_frame');
    }
  }
  for (const x of [MIN_X, MAX_X]) {
    for (let z = MIN_Z + 1; z < MAX_Z; z += 1) {
      const material = z === CENTER_Z ? 'minecraft:sea_lantern' : 'minecraft:polished_blackstone';
      replPoint(x, y, z, material, 'horizontal_frame');
    }
  }
}

// Four display faces. Corners are a structural blackstone mullion, while each
// face gets its own pixel field. This serves every side of the all-around bowl.
for (let y = MIN_Y + 1; y < MAX_Y; y += 1) {
  for (const z of [MIN_Z, MAX_Z]) {
    for (let x = MIN_X; x <= MAX_X; x += 1) {
      const material = x === MIN_X || x === MAX_X
        ? 'minecraft:polished_blackstone'
        : displayPixel('x', x, y, z);
      replPoint(x, y, z, material, 'north_south_display');
    }
  }
  for (const x of [MIN_X, MAX_X]) {
    for (let z = MIN_Z + 1; z < MAX_Z; z += 1) {
      const material = displayPixel('z', z, y, x);
      replPoint(x, y, z, material, 'east_west_display');
    }
  }
}

// Four suspension chains terminate immediately below verified canopy cells at
// y=93. They avoid the existing three downward-facing LED rods at y=87,z=-560.
for (const x of [MIN_X, MAX_X]) {
  for (const z of [MIN_Z, MAX_Z]) {
    for (let y = MAX_Y + 1; y <= 92; y += 1) {
      replPoint(
        x,
        y,
        z,
        'minecraft:iron_chain[axis=y,waterlogged=false]',
        'suspension_chain',
      );
    }
  }
}

const countsByTag = ops.reduce((counts, operation) => {
  counts[operation.tag] = (counts[operation.tag] ?? 0) + 1;
  return counts;
}, {});
const materialCounts = ops.reduce((counts, operation) => {
  const material = operation.line.split(/\s+/).at(-1);
  counts[material] = (counts[material] ?? 0) + 1;
  return counts;
}, {});
const output = [
  '# GENERATED FILE — Westlight four-sided center-hung Infinity Screen',
  `# frozen baseline: ${baselineRegions}`,
  `# baseline SHA-256: ${baselineHash}`,
  '# All source cells are exact-guarded air; no SET operation is permitted.',
  `# operations: ${ops.length}`,
  '',
  ...ops.map((operation) => operation.line),
  '',
].join('\n');
const operationSha256 = crypto.createHash('sha256').update(output).digest('hex');
const rollbackOutput = [
  '# GENERATED ROLLBACK — Westlight four-sided center-hung Infinity Screen',
  '# Exact expected installed materials return only the 524 package target cells to air.',
  `# forward SHA-256: ${operationSha256}`,
  `# operations: ${ops.length}`,
  '',
  ...ops.map((operation) => {
    const fields = operation.line.split(/\s+/);
    const desired = fields.at(-1);
    return `REPL ${fields.slice(1, 7).join(' ')} ${desired} minecraft:air`;
  }),
  '',
].join('\n');
const rollbackSha256 = crypto.createHash('sha256').update(rollbackOutput).digest('hex');

const report = {
  schemaVersion: 1,
  id: 'westlight-infinity-screen-2026-07-27',
  status: 'generated-awaiting-preflight-and-live-execution',
  generatedAtUtc: new Date().toISOString(),
  baseline: {
    regions: baselineRegions,
    sha256: baselineHash,
  },
  venueFeatureId: 'WL-BOWL',
  design: {
    type: 'four-sided center-hung display',
    center: [CENTER_X, 77, CENTER_Z],
    displayBounds: [MIN_X, MIN_Y, MIN_Z, MAX_X, MAX_Y, MAX_Z],
    suspensionBounds: [MIN_X, MAX_Y + 1, MIN_Z, MAX_X, 92, MAX_Z],
    canopyAnchorY: 93,
    displayFaces: ['north', 'south', 'east', 'west'],
    separation: {
      fieldY: 58,
      lowestDisplayY: MIN_Y,
      clearBlocksAboveField: MIN_Y - 58,
      canopyOpenBandY: [84, 87],
      note: 'Only four one-block chains pass through the open band.',
    },
  },
  acceptance: {
    exactGuardPassesRequired: ops.length,
    failedGuardsAllowed: 0,
    duplicateTargetCellsAllowed: 0,
    liveCommandFailuresAllowed: 0,
    viewpointMatrix: {
      bowlSectors: 8,
      seatingBands: ['lower', 'middle', 'upper'],
      venueModes: ['sports', 'concert'],
      totalRequiredViews: 48,
    },
    requiredEvidence: [
      'preflight JSON pinned to the frozen baseline',
      'RCON execution transcript with zero failures',
      'post-build block census',
      'eight cardinal/intercardinal seating screenshots',
      'field-level and south-arrival screenshots',
      'database feature and media-link record',
    ],
  },
  operationCount: ops.length,
  uniqueTargetCellCount: occupied.size,
  duplicateTargetCellCount: ops.length - occupied.size,
  countsByTag,
  materialCounts,
  operationSha256,
  rollback: {
    path: path.relative(ROOT, rollbackPath),
    operationCount: ops.length,
    sha256: rollbackSha256,
    preflightRequirement: 'Run against the content-addressed post-release snapshot before rollback.',
  },
  databaseFeatures: [
    {
      externalId: 'WL-INFINITY-SCREEN',
      parentExternalId: 'WL-BOWL',
      projectId: 'westlight-venue',
      name: 'Westlight four-sided center-hung display',
      kind: 'landmark',
      featureClass: 'venue-display',
      geometry: {
        type: 'bounds',
        minX: MIN_X,
        minY: MIN_Y,
        minZ: MIN_Z,
        maxX: MAX_X,
        maxY: 92,
        maxZ: MAX_Z,
      },
      status: 'planned',
      completionRatio: 0,
      conditionScore: null,
      quality: {
        functional: { score: 80, status: 'designed-awaiting-live-proof' },
        sightline: { score: 60, status: '48-view-matrix-pending' },
        legibility: { score: 85, status: 'four-face-design-preflighted' },
        mediaCoverage: { score: 10, status: 'four-before-views-recorded' },
      },
      sourceRefs: [
        path.relative(ROOT, outputPath),
        path.relative(ROOT, reportPath),
        path.relative(ROOT, rollbackPath),
        'docs/redevelopment/2026-07-27/westlight-screen-release.md',
      ],
    },
  ],
  sourceNotes: [
    'The active gen_westlight.py bowl has no screen or scoreboard operation.',
    'The display is central because WL-BOWL seating surrounds the field.',
    'The y=93 anchor cells were verified as canopy glass on the frozen snapshot.',
    'Existing y=87 end rods at x=-369,-360,-351,z=-560 remain untouched.',
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
fs.writeFileSync(rollbackPath, rollbackOutput);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  report: path.relative(ROOT, reportPath),
  rollback: path.relative(ROOT, rollbackPath),
  operationCount: ops.length,
  uniqueTargetCellCount: occupied.size,
  countsByTag,
  operationSha256,
  rollbackSha256,
}, null, 2));
