#!/usr/bin/env node

/**
 * Offline QA for the snapshot-bound Moot Hall ladderless circulation package.
 * Runs exact-guard preflight, asserts the projected envelope contains no
 * ladders, and checks every adjacent level pair in both directions.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID = 'moot-hall-ladderless-core-2026-07-27';
const OPS_PATH = path.join(ROOT, 'data', 'buildops', `${ID}.txt`);
const EXPORT_DIR = path.join(ROOT, 'data', 'exports', 'box', ID);
const DESIGN_PATH = path.join(EXPORT_DIR, 'design.json');
const PREFLIGHT_PATH = path.join(EXPORT_DIR, 'preflight.json');
const QA_PATH = path.join(EXPORT_DIR, 'route-qa.json');
const QA_MD_PATH = path.join(EXPORT_DIR, 'ROUTE-QA.md');
const REGION_DIR = path.join(ROOT, 'data', 'worldsnap', 'region');

const design = JSON.parse(fs.readFileSync(DESIGN_PATH, 'utf8'));

function snapshotHash() {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(REGION_DIR)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  for (const filename of files) {
    hash.update(filename);
    hash.update(Buffer.from([0]));
    hash.update(fs.readFileSync(path.join(REGION_DIR, filename)));
    hash.update(Buffer.from([0]));
  }
  return hash.digest('hex');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

const currentHash = snapshotHash();
if (currentHash !== design.source.canonicalBundleSha256) {
  throw new Error(
    `snapshot drift: design ${design.source.canonicalBundleSha256}, current ${currentHash}`,
  );
}

const preflightRun = run(process.execPath, [
  path.join(ROOT, 'scripts', 'preflight_guarded_ops.mjs'),
  OPS_PATH,
  '--regions',
  REGION_DIR,
  '--report',
  PREFLIGHT_PATH,
]);
const preflight = JSON.parse(fs.readFileSync(PREFLIGHT_PATH, 'utf8'));

const projected = new Map();
for (const rawLine of fs.readFileSync(OPS_PATH, 'utf8').split(/\r?\n/)) {
  const fields = rawLine.trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length < 9) continue;
  const point = fields.slice(1, 4).join(',');
  projected.set(point, fields[8]);
}

const ladderCensus = run(process.execPath, [
  path.join(ROOT, 'scripts', 'block_census.mjs'),
  '--regions',
  REGION_DIR,
  '--box',
  '-100', '39', '-394', '-70', '91', '-332',
  '--states',
  '--list',
]);
const sourceLadders = [];
for (const line of ladderCensus.stdout.split(/\r?\n/)) {
  const match = line.match(
    /^\s+(-?\d+) (-?\d+) (-?\d+)\s+(minecraft:ladder(?:\[\S+\])?)\s*$/,
  );
  if (!match) continue;
  sourceLadders.push({
    point: [Number(match[1]), Number(match[2]), Number(match[3])],
    source: match[4],
  });
}
const remainingLadders = sourceLadders.filter(({ point }) => {
  const replacement = projected.get(point.join(','));
  return !replacement || replacement.startsWith('minecraft:ladder');
});

const levelPairs = [
  {
    id: 'sanctum-deep-corridor',
    from: [-85, 30, -380],
    to: [-84, 41, -341],
    pad: 25,
    budget: 800000,
  },
  {
    id: 'deep-corridor-b2',
    from: [-84, 41, -341],
    to: [-83, 56, -342],
    pad: 8,
  },
  {
    id: 'b2-b1-grand-stair',
    from: [-78, 57, -384],
    to: [-78, 63, -377],
    pad: 12,
  },
  {
    id: 'b1-ground-public-stair',
    from: [-85, 62, -384],
    to: [-85, 68, -377],
    pad: 14,
  },
  {
    id: 'ground-first-floor',
    from: [-85, 68, -377],
    to: [-85, 74, -384],
    pad: 16,
  },
  {
    id: 'first-second-floor',
    from: [-85, 74, -375],
    to: [-84, 79, -375],
    pad: 10,
  },
  {
    id: 'second-third-floor',
    from: [-84, 79, -375],
    to: [-84, 84, -375],
    pad: 10,
  },
  {
    id: 'third-floor-penthouse',
    from: [-84, 84, -375],
    to: [-85, 88, -379],
    pad: 12,
  },
  {
    id: 'full-deep-penthouse-chain',
    from: [-84, 41, -341],
    to: [-85, 88, -379],
    pad: 25,
    budget: 800000,
  },
  {
    id: 'full-sanctum-penthouse-chain',
    from: [-85, 30, -380],
    to: [-85, 88, -379],
    pad: 60,
    budget: 1000000,
  },
];

const routeResults = [];
for (const pair of levelPairs) {
  for (const direction of ['forward', 'reverse']) {
    const from = direction === 'forward' ? pair.from : pair.to;
    const to = direction === 'forward' ? pair.to : pair.from;
    const args = [
      path.join(ROOT, 'scripts', 'reachability.mjs'),
      '--regions',
      REGION_DIR,
      '--ops',
      OPS_PATH,
      '--from',
      from.join(','),
      '--to',
      to.join(','),
      '--pad',
      String(pair.pad),
      '--budget',
      String(pair.budget ?? 600000),
    ];
    const result = run(process.execPath, args);
    routeResults.push({
      id: pair.id,
      direction,
      from,
      to,
      pad: pair.pad,
      passed: result.status === 0 && result.stdout.includes('REACHABLE'),
      output: result.stdout.split(/\r?\n/).slice(-2),
      stderr: result.stderr || undefined,
    });
  }
}

const dryRun = run('python3', [
  path.join(ROOT, 'scripts', 'rcon_runner.py'),
  OPS_PATH,
  '--dry-run',
]);
const failures = routeResults.filter((result) => !result.passed);
const passed =
  preflightRun.status === 0
  && preflight.failed === 0
  && dryRun.status === 0
  && sourceLadders.length === 58
  && remainingLadders.length === 0
  && failures.length === 0;

const report = {
  id: `${ID}-qa`,
  generatedAt: new Date().toISOString(),
  sourceSnapshot: currentHash,
  passed,
  liveMutationPerformed: false,
  exactGuardPreflight: {
    operationCount: preflight.operationCount,
    passed: preflight.passed,
    failed: preflight.failed,
    commandStatus: preflightRun.status,
  },
  parserDryRun: {
    passed: dryRun.status === 0,
    output: dryRun.stdout.split(/\r?\n/).slice(0, 2),
  },
  projectedLadderAssertion: {
    sourceCount: sourceLadders.length,
    projectedRemainingCount: remainingLadders.length,
    sourceRuns: design.ladderCensus,
    remainingLadders,
  },
  routeSummary: {
    pairCount: levelPairs.length,
    directionalCheckCount: routeResults.length,
    passed: routeResults.length - failures.length,
    failed: failures.length,
  },
  routes: routeResults,
};

const markdown = `# Moot Hall ladderless core — offline route QA

Overall: **${passed ? 'PASS' : 'FAIL'}**

- Source snapshot: \`${currentHash}\`
- Exact guards: ${preflight.passed}/${preflight.operationCount} pass
- Parser dry-run: ${dryRun.status === 0 ? 'pass' : 'fail'}
- Projected ladders: ${remainingLadders.length} remain from ${sourceLadders.length} source ladders
- Directional route checks: ${routeResults.length - failures.length}/${routeResults.length} pass

## Level-by-level routes

| Pair | Forward | Reverse |
|---|---:|---:|
${levelPairs.map((pair) => {
    const results = routeResults.filter((result) => result.id === pair.id);
    return `| ${pair.id} | ${results[0]?.passed ? 'PASS' : 'FAIL'} | ${results[1]?.passed ? 'PASS' : 'FAIL'} |`;
  }).join('\n')}

This is projected, snapshot-bound QA. No live world mutation was performed.
`;

fs.writeFileSync(QA_PATH, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(QA_MD_PATH, `${markdown}\n`);

console.log(
  `${ID}: ${passed ? 'PASS' : 'FAIL'}; `
  + `${preflight.passed}/${preflight.operationCount} guards; `
  + `${routeResults.length - failures.length}/${routeResults.length} routes; `
  + `${remainingLadders.length} projected ladders`,
);
console.log(`  report: ${path.relative(ROOT, QA_PATH)}`);
process.exit(passed ? 0 : 1);
