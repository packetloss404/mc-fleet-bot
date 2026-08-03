#!/usr/bin/env node
/**
 * Projected/saved-world acceptance for MainStreet secure-complex Wave 5.
 */
import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-wave4-post-20260727/region',
);
const opsPath = value(
  '--ops',
  'data/buildops/mainstreet-secure-complex-detail-wave5-2026-07-27.txt',
);
const output = value(
  '--out',
  'data/world-review/mainstreet-secure-complex-detail-wave5-projected-qa-2026-07-27.json',
);
const live = args.includes('--live');

const routes = [
  {
    id: 'hangar-public-stair-to-observatory-rooms',
    from: [176, 99, 163],
    to: [
      [173, 121, 154],
      [189, 121, 158],
      [206, 121, 162],
      [223, 122, 160],
    ],
    pad: 20,
    budget: 700_000,
  },
  {
    id: 'observatory-return-to-hangar',
    from: [223, 122, 160],
    to: [
      [206, 121, 162],
      [189, 121, 158],
      [173, 121, 154],
      [176, 99, 163],
    ],
    pad: 20,
    budget: 700_000,
  },
  {
    id: 'observatory-hidden-stair-to-penthouse',
    from: [217, 121, 142],
    to: [
      [217, 106, 147],
      [222, 107, 160],
      [213, 107, 173],
      [201, 107, 147],
      [186, 107, 145],
    ],
    pad: 18,
    budget: 700_000,
  },
  {
    id: 'penthouse-return-to-hidden-observatory',
    from: [222, 107, 160],
    to: [
      [213, 107, 173],
      [186, 107, 145],
      [217, 106, 147],
      [217, 121, 142],
    ],
    pad: 18,
    budget: 700_000,
  },
  {
    id: 'penthouse-safe-to-shelter-and-treasury',
    from: [214, 106, 146],
    to: [
      [184, 82, 146],
      [151, 82, 145],
      [177, 83, 170],
      [151, 85, 166],
    ],
    pad: 24,
    budget: 900_000,
  },
  {
    id: 'shelter-treasury-return-to-penthouse',
    from: [151, 85, 166],
    to: [
      [177, 83, 170],
      [151, 82, 145],
      [184, 82, 146],
      [214, 106, 146],
    ],
    pad: 24,
    budget: 900_000,
  },
  {
    id: 'safe-to-grand-vault-upper',
    from: [214, 106, 146],
    to: [
      [184, 82, 146],
      [188, 82, 174],
      [225, 82, 174],
      [225, 67, 192],
      [232, 67, 192],
      [238, 67, 193],
    ],
    pad: 34,
    budget: 1_500_000,
  },
  {
    id: 'grand-vault-upper-to-all-levels',
    from: [238, 67, 193],
    to: [
      [238, 57, 204],
      [246, 45, 220],
    ],
    pad: 24,
    budget: 1_200_000,
  },
  {
    id: 'grand-vault-lower-return-to-upper',
    from: [246, 45, 220],
    to: [
      [238, 57, 204],
      [238, 67, 193],
    ],
    pad: 24,
    budget: 1_200_000,
  },
  {
    id: 'grand-vault-upper-return-to-safe',
    from: [238, 67, 193],
    to: [
      [232, 67, 192],
      [225, 67, 192],
      [225, 82, 174],
      [188, 82, 174],
      [184, 82, 146],
      [214, 106, 146],
    ],
    pad: 34,
    budget: 1_500_000,
  },
  {
    id: 'c01-primary-stair-all-levels-up',
    from: [206, 51, 154],
    to: [
      [214, 63, 158],
      [206, 81, 156],
      [213, 100, 162],
      [207, 106, 160],
    ],
    pad: 24,
    budget: 1_200_000,
  },
  {
    id: 'c01-primary-stair-all-levels-down',
    from: [207, 106, 160],
    to: [
      [213, 100, 162],
      [206, 81, 156],
      [214, 63, 158],
      [206, 51, 154],
    ],
    pad: 24,
    budget: 1_200_000,
  },
  {
    id: 'c01-arrival-to-hangar-arena-and-lower-program',
    from: [116, 65, 172],
    to: [
      [150, 64, 100],
      [225, 63, 110],
      [149, 51, 176],
      [174, 51, 176],
      [194, 51, 176],
      [214, 51, 176],
    ],
    pad: 34,
    budget: 1_500_000,
  },
  {
    id: 'c01-lower-conference-return-to-arrival',
    from: [214, 51, 176],
    to: [
      [194, 51, 176],
      [174, 51, 176],
      [149, 51, 176],
      [206, 51, 154],
      [214, 63, 158],
      [203, 63, 151],
      [188, 63, 142],
      [149, 63, 153],
      [138, 65, 171],
      [116, 65, 172],
    ],
    pad: 34,
    budget: 1_500_000,
  },
];

const routeResults = [];
for (const route of routes) {
  const command = [
    path.resolve('scripts/reachability.mjs'),
    '--regions',
    regions,
    '--from',
    route.from.join(','),
    '--to',
    route.to.map((point) => point.join(',')).join(';'),
    '--pad',
    String(route.pad),
    '--budget',
    String(route.budget),
  ];
  if (!live) command.splice(3, 0, '--ops', opsPath);
  const run = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 24 * 1024 * 1024,
  });
  routeResults.push({
    id: route.id,
    from: route.from,
    to: route.to,
    passed: run.status === 0,
    exitCode: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  });
  console.log(`${run.status === 0 ? 'PASS' : 'FAIL'} ${route.id}`);
  if (run.status !== 0) {
    console.log(run.stdout.trim());
    if (run.stderr.trim()) console.error(run.stderr.trim());
  }
}

const projected = new Map();
if (!live) {
  for (const rawLine of fs.readFileSync(opsPath, 'utf8').split(/\r?\n/)) {
    const fields = rawLine.trim().split(/\s+/);
    if (fields[0] !== 'REPL' || fields.length < 9) continue;
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    const replacement = fields[8];
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
          projected.set(`${x},${y},${z}`, replacement);
        }
      }
    }
  }
}
const snapshot = new AnvilSnapshot(regions);
const cache = new Map();
async function blockAt(x, y, z) {
  const cellKey = `${x},${y},${z}`;
  if (projected.has(cellKey)) return projected.get(cellKey);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  const block = column?.get(y) ?? 'MISSING_CHUNK';
  cache.set(cellKey, block);
  return block;
}
const baseName = (block) => block.split('[', 1)[0];

const assertions = [];
function assertion(id, passed, details) {
  assertions.push({ id, passed, details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
}

let scaffoldCount = 0;
for (let y = 99; y <= 120; y += 1) {
  if (baseName(await blockAt(183, y, 161)) === 'minecraft:scaffolding') scaffoldCount += 1;
}
assertion(
  'former-observatory-scaffold-retired',
  scaffoldCount === 0,
  { expected: 0, observed: scaffoldCount, column: [183, 99, 161, 183, 120, 161] },
);

const lensPoints = [[190, 130, 145], [206, 132, 143], [222, 130, 145]];
const lensBlocks = [];
for (const point of lensPoints) {
  lensBlocks.push({ point, block: await blockAt(...point) });
}
assertion(
  'three-working-objective-lenses',
  lensBlocks.every(({ block }) => baseName(block) === 'minecraft:tinted_glass'),
  lensBlocks,
);

const apertureChecks = [];
for (const [id, cx, cz, radius] of [
  ['west', 190, 151, 4],
  ['central', 206, 151, 8],
  ['east', 222, 151, 4],
]) {
  let air = 0;
  let cells = 0;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dz * dz > radius * radius) continue;
      cells += 1;
      if (baseName(await blockAt(cx + dx, 126, cz + dz)) === 'minecraft:air') air += 1;
    }
  }
  apertureChecks.push({ id, air, cells });
}
assertion(
  'three-open-dome-apertures',
  apertureChecks.every(({ air, cells }) => air >= cells - 2),
  apertureChecks,
);

const bedSamples = [
  [220, 107, 155],
  [221, 107, 155],
  [150, 82, 147],
  [153, 82, 147],
  [150, 82, 151],
  [153, 82, 151],
  [150, 82, 155],
  [153, 82, 155],
];
const bedBlocks = [];
for (const point of bedSamples) bedBlocks.push({ point, block: await blockAt(...point) });
assertion(
  'actual-penthouse-and-shelter-beds',
  bedBlocks.every(({ block }) => baseName(block).endsWith('_bed')),
  bedBlocks,
);

const loadedChests = [
  [150, 82, 178], [154, 82, 178], [158, 82, 178],
  [233, 45, 220], [238, 45, 220], [255, 45, 220],
  [233, 56, 220], [238, 56, 220], [255, 56, 220],
  [233, 67, 220], [238, 67, 220], [255, 67, 220],
];
const chestBlocks = [];
for (const point of loadedChests) chestBlocks.push({ point, block: await blockAt(...point) });
assertion(
  'twelve-loaded-chest-blocks-preserved',
  chestBlocks.every(({ block }) => baseName(block) === 'minecraft:chest'),
  chestBlocks,
);

let vaultRails = 0;
for (const y of [56, 67]) {
  for (let x = 230; x <= 262; x += 1) {
    for (let z = 184; z <= 226; z += 1) {
      if (baseName(await blockAt(x, y, z)) === 'minecraft:iron_bars') vaultRails += 1;
    }
  }
}
assertion(
  'vault-atrium-balustrades',
  vaultRails >= 70,
  { expectedMinimum: 70, observed: vaultRails },
);

let water = 0;
for (const [box] of [
  [[148, 81, 143, 188, 92, 180]],
  [[230, 44, 184, 262, 77, 226]],
]) {
  const [x1, y1, z1, x2, y2, z2] = box;
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) {
        if (baseName(await blockAt(x, y, z)) === 'minecraft:water') water += 1;
      }
    }
  }
}
assertion('shelter-and-vault-remain-dry', water === 0, { expected: 0, observed: water });

const allResults = [
  ...routeResults.map(({ id, passed, stdout, stderr }) => ({ id, passed, details: { stdout, stderr } })),
  ...assertions,
];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: live ? 'saved-world' : 'projected',
  regions,
  ops: live ? null : opsPath,
  total: allResults.length,
  passed: allResults.filter((result) => result.passed).length,
  failed: allResults.filter((result) => !result.passed).length,
  routeResults,
  assertions,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.passed}/${report.total} ${report.mode} checks pass`);
console.log(`report: ${output}`);
process.exit(report.failed === 0 ? 0 : 1);
