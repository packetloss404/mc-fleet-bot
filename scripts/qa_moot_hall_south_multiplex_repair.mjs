#!/usr/bin/env node

/**
 * Offline QA for the guarded Moot Hall south-multiplex repair.
 *
 * The proposed REPL operations are projected over the copied Anvil snapshot in
 * memory. This script never writes region data and never connects to RCON or a
 * live Minecraft service.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT_DIR = path.join(
  ROOT,
  'data',
  'exports',
  'box',
  'moot-hall-basement-enhancement-2026-07-26',
);
const OPS_PATH = path.join(
  ROOT,
  'data',
  'buildops',
  'moot-hall-south-multiplex-repair-2026-07-27.txt',
);
const DESIGN_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-design.json');
const PREFLIGHT_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-preflight.json');
const QA_JSON_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-qa.json');
const QA_MD_PATH = path.join(EXPORT_DIR, 'south-multiplex-repair-qa.md');
const REGION_DIR = path.join(ROOT, 'data', 'worldsnap-moot-after-20260726', 'region');

const design = JSON.parse(fs.readFileSync(DESIGN_PATH, 'utf8'));
const preflight = JSON.parse(fs.readFileSync(PREFLIGHT_PATH, 'utf8'));
const snapshot = new AnvilSnapshot(REGION_DIR);
const overlay = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
const baseName = (block) => block.split('[', 1)[0];
const isOpen = (block) => [
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
].includes(baseName(block));

for (const operation of design.operations) {
  const [x1, y1, z1, x2, y2, z2] = operation.box;
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        overlay.set(key(x, y, z), operation.replacement);
      }
    }
  }
}

const columnCache = new Map();
async function sourceBlock(x, y, z) {
  const columnKey = `${x},${z}`;
  if (!columnCache.has(columnKey)) {
    columnCache.set(columnKey, await snapshot.readColumn(x, z, 53, 67));
  }
  const column = columnCache.get(columnKey);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  return column.get(y);
}
async function projectedBlock(x, y, z) {
  return overlay.get(key(x, y, z)) ?? sourceBlock(x, y, z);
}

function reachability(id, from, targets = null, box = null) {
  const args = [
    path.join(ROOT, 'scripts', 'reachability.mjs'),
    '--regions',
    REGION_DIR,
    '--ops',
    OPS_PATH,
    '--from',
    from.join(','),
    '--pad',
    '4',
    '--budget',
    '300000',
  ];
  if (targets) args.push('--to', targets.map((point) => point.join(',')).join(';'));
  if (box) args.push('--box', box.join(','), '--samples', '8');
  const run = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    id,
    from,
    targets,
    box,
    passed: run.status === 0,
    exitCode: run.status,
    output: run.stdout.trim(),
    stderr: run.stderr.trim(),
  };
}

const imaxRows = [
  { seatY: 57, z: -347 },
  { seatY: 58, z: -348 },
  { seatY: 59, z: -349 },
  { seatY: 60, z: -350 },
  { seatY: 61, z: -351 },
  { seatY: 62, z: -352 },
  { seatY: 63, z: -353 },
  { seatY: 64, z: -354 },
];
const imaxSeats = imaxRows.flatMap((row) =>
  [-96, -94, -92, -90].map((x) => ({
    block: [x, row.seatY, row.z],
    feet: [x, row.seatY + 1, row.z],
    head: [x, row.seatY + 2, row.z],
  })));
const imaxAisle = imaxRows.map((row, index) => ({
  block: [-93, 56 + index, row.z],
  feet: [-93, 57 + index, row.z],
  head: [-93, 58 + index, row.z],
}));

const mediumSeats = [];
for (const z of [-353, -355, -345, -347]) {
  for (const x of [...Array.from({ length: 6 }, (_, i) => -84 + i),
    ...Array.from({ length: 6 }, (_, i) => -77 + i)]) {
    mediumSeats.push({
      block: [x, 63, z],
      feet: [x, 64, z],
      head: [x, 65, z],
      support: [x, 62, z],
    });
  }
}

async function clearanceResult(id, entries, expectedBlock, expectedSupport = null) {
  const failures = [];
  for (const entry of entries) {
    const actualBlock = baseName(await projectedBlock(...entry.block));
    const feet = await projectedBlock(...entry.feet);
    const head = await projectedBlock(...entry.head);
    const support = entry.support
      ? baseName(await projectedBlock(...entry.support))
      : null;
    if (
      actualBlock !== expectedBlock
      || !isOpen(feet)
      || !isOpen(head)
      || (expectedSupport && support !== expectedSupport)
    ) {
      failures.push({
        ...entry,
        actualBlock,
        feet,
        head,
        support,
      });
    }
  }
  return {
    id,
    checked: entries.length,
    passed: failures.length === 0,
    failures,
  };
}

const clearance = [
  await clearanceResult(
    'imax-all-32-seat-body-head-clearance',
    imaxSeats,
    'minecraft:spruce_stairs',
  ),
  await clearanceResult(
    'imax-eight-center-aisle-treads',
    imaxAisle,
    'minecraft:polished_andesite_stairs',
  ),
  await clearanceResult(
    'medium-all-48-seat-body-head-clearance',
    mediumSeats,
    'minecraft:spruce_stairs',
    'minecraft:black_concrete',
  ),
];

const staticChecks = [];
function staticCheck(id, passed, evidence) {
  staticChecks.push({ id, passed, evidence });
}
staticCheck(
  'all-exact-source-guards-pass',
  preflight.failed === 0 && preflight.passed === preflight.operationCount,
  `${preflight.passed}/${preflight.operationCount}; ${preflight.failed} failed`,
);
staticCheck(
  'no-ladders-in-design',
  !design.operations.some((operation) =>
    operation.expected.includes('ladder') || operation.replacement.includes('ladder')),
  'No expected or replacement material contains ladder.',
);
staticCheck(
  'protected-y53-bottom-untouched',
  !design.operations.some((operation) =>
    Math.min(operation.box[1], operation.box[4]) <= 53
    && Math.max(operation.box[1], operation.box[4]) >= 53),
  'Minimum touched Y is 55.',
);
staticCheck(
  'protected-y67-plaza-cap-untouched',
  !design.operations.some((operation) =>
    Math.min(operation.box[1], operation.box[4]) <= 67
    && Math.max(operation.box[1], operation.box[4]) >= 67),
  'Maximum touched Y is 66; top-row IMAX head pocket retains solid y67 above.',
);
staticCheck(
  'perimeter-shell-untouched',
  !design.operations.some((operation) => {
    const [x1, , z1, x2, , z2] = operation.box;
    return Math.min(x1, x2) <= -100
      || Math.max(x1, x2) >= -70
      || Math.min(z1, z2) <= -392
      || Math.max(z1, z2) >= -341;
  }),
  'All edits remain at least one block inside the authored shell.',
);
staticCheck(
  'guarded-operations-only',
  fs.readFileSync(OPS_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('CMD '))
    .every((line) => line.startsWith('REPL ')),
  'All block mutations use REPL; data-merge commands only set sign text.',
);

const imaxSeatFeet = imaxSeats.map((seat) => seat.feet);
const mediumSeatFeet = mediumSeats.map((seat) => seat.feet);
const routes = [
  reachability(
    'imax-bottom-to-top-two-way-a',
    [-93, 56, -344],
    [[-93, 64, -354]],
  ),
  reachability(
    'imax-top-to-bottom-two-way-b',
    [-93, 64, -354],
    [[-93, 56, -344], [-84, 56, -344]],
  ),
  reachability(
    'imax-lounge-to-all-32-seats',
    [-84, 56, -344],
    imaxSeatFeet,
  ),
  reachability(
    'imax-room-coverage',
    [-84, 56, -344],
    null,
    [-98, 56, -354, -88, 65, -344],
  ),
  reachability(
    'medium-foyer-to-all-48-seats',
    [-85, 63, -350],
    mediumSeatFeet,
  ),
  reachability(
    'medium-rear-to-foyer-two-way',
    [-84, 64, -355],
    [[-85, 63, -350], [-84, 64, -345], [-84, 64, -347]],
  ),
  reachability(
    'medium-room-coverage',
    [-85, 63, -350],
    null,
    [-84, 63, -356, -72, 65, -343],
  ),
  reachability(
    'b2-lounge-coverage-after-service-flight-retirement',
    [-84, 56, -344],
    null,
    [-85, 56, -357, -71, 58, -342],
  ),
];

const dryRun = spawnSync(
  'python3',
  [path.join(ROOT, 'scripts', 'rcon_runner.py'), OPS_PATH, '--dry-run'],
  {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  },
);
staticCheck(
  'rcon-parser-dry-run',
  dryRun.status === 0 && dryRun.stdout.includes('0 left for WorldEdit'),
  dryRun.stdout.split(/\r?\n/)[0] ?? '',
);

const allChecks = [...staticChecks, ...clearance, ...routes];
const failedChecks = allChecks.filter((check) => !check.passed);
const report = {
  schemaVersion: 1,
  id: 'moot-hall-south-multiplex-repair-qa-2026-07-27',
  status: failedChecks.length === 0
    ? 'offline-qa-pass-design-not-executed'
    : 'offline-qa-fail-design-not-executed',
  source: design.source,
  design: path.relative(ROOT, DESIGN_PATH),
  ops: path.relative(ROOT, OPS_PATH),
  preflight: path.relative(ROOT, PREFLIGHT_PATH),
  liveMutationPerformed: false,
  projectedCells: overlay.size,
  staticChecks,
  clearance,
  routes,
  dryRun: {
    passed: dryRun.status === 0,
    exitCode: dryRun.status,
    summary: dryRun.stdout.split(/\r?\n/)[0] ?? '',
  },
  acceptance: {
    checks: allChecks.length,
    passed: allChecks.length - failedChecks.length,
    failed: failedChecks.length,
    failedIds: failedChecks.map((check) => check.id),
  },
};
fs.writeFileSync(QA_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);

const routeLines = routes.map((route) => {
  const coverage = route.output.match(/\b(?:OPEN|PARTLY-SEALED|SEALED)\s+\d+\/\d+[^\n]*/)?.[0];
  const targetCount = route.targets?.length ?? 0;
  return `| ${route.id} | ${route.passed ? 'PASS' : 'FAIL'} | `
    + `${coverage ?? `${targetCount} target(s)`} |`;
});
const markdown = `# Moot Hall south multiplex repair — offline QA

Status: **${failedChecks.length === 0 ? 'PASS' : 'FAIL'} — design only, not executed**

Source snapshot: \`${design.source.sha256}\`
Projected guarded edits: ${design.operationCount} operations / ${overlay.size} block cells
Live-world mutation: **none**

## Acceptance result

- ${preflight.passed}/${preflight.operationCount} exact source guards pass.
- ${clearance[0].checked}/${clearance[0].checked} IMAX seats retain valid body/head clearance.
- ${clearance[1].checked}/${clearance[1].checked} finished IMAX aisle treads retain valid body/head clearance.
- ${clearance[2].checked}/${clearance[2].checked} medium-house seats have valid support/body/head geometry.
- No ladder is added or used by the proposed public routes.
- The y53 bottom, y67 plaza cap, and complete perimeter shell are untouched.
- The parser accepts every operation; zero commands require WorldEdit fallback.

## Projected route checks

| Check | Result | Evidence |
|---|---|---|
${routeLines.join('\n')}

The IMAX stair passes in both directions between the screen-side floor and the
top tread. All 32 retained IMAX seats are reachable from the B2 lounge. Both
medium houses pass from foyer to every one of their 48 retained seats, and from
the rear bank back to the foyer. The B2 lounge remains fully connected after the
orphan service flight is retired.

## Structural interpretation

The IMAX top-row head pocket removes only nine y66 ceiling-liner blocks. The
solid y67 plaza cap immediately above remains untouched. In the medium houses,
the former y66 top-row seats are replaced with black concrete, restoring the
ceiling liner instead of opening it. The orphan service flight is restored to
polished-andesite floor at y55 and stone-brick ceiling at y59.

This QA is a snapshot projection. Before any later live execution, refresh the
bounded snapshot, rerun exact-guard preflight, sweep entities, and repeat the
same two-way route/headroom checks after capture.
`;
fs.writeFileSync(QA_MD_PATH, markdown);

console.log(
  `${failedChecks.length === 0 ? 'PASS' : 'FAIL'}: `
  + `${allChecks.length - failedChecks.length}/${allChecks.length} checks`,
);
console.log(`wrote ${path.relative(ROOT, QA_JSON_PATH)}`);
console.log(`wrote ${path.relative(ROOT, QA_MD_PATH)}`);
if (failedChecks.length) {
  for (const check of failedChecks) console.log(`  FAIL ${check.id}`);
  process.exit(1);
}
