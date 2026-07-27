#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-wave2-post-20260727/region',
);
const ops = value(
  '--ops',
  'data/buildops/ravensreach-ladderless-interiors-wave3-2026-07-27.txt',
);
const output = value(
  '--out',
  'data/world-review/ravensreach-ladderless-wave3-route-qa-2026-07-27.json',
);
const live = args.includes('--live');

const suites = [
  {
    id: 'library-entrance-to-six-levels',
    from: [-128, 68, -424],
    to: [
      [-137, 68, -436],
      [-137, 76, -436],
      [-134, 84, -436],
      [-137, 61, -436],
      [-137, 54, -436],
      [-137, 47, -436],
    ],
    pad: 18,
    budget: 800_000,
  },
  {
    id: 'library-b3-to-upper-levels',
    from: [-137, 47, -436],
    to: [
      [-137, 54, -436],
      [-137, 61, -436],
      [-137, 68, -436],
      [-137, 76, -436],
      [-134, 84, -436],
      [-128, 68, -424],
    ],
    pad: 18,
    budget: 800_000,
  },
  {
    id: 'library-second-floor-return',
    from: [-134, 84, -436],
    to: [
      [-137, 76, -436],
      [-137, 68, -436],
      [-137, 61, -436],
      [-137, 54, -436],
      [-137, 47, -436],
      [-128, 68, -424],
    ],
    pad: 18,
    budget: 800_000,
  },
  {
    id: 'market-entry-to-lofts',
    from: [-51, 68, -343],
    to: [[-56, 68, -336], [-46, 71, -340], [-46, 77, -333], [-68, 77, -328]],
    pad: 12,
  },
  {
    id: 'market-west-loft-return',
    from: [-68, 77, -328],
    to: [[-46, 77, -333], [-46, 71, -340], [-56, 68, -336], [-51, 68, -343]],
    pad: 12,
  },
  {
    id: 'grange-entry-to-loft',
    from: [-66, 68, -361],
    to: [[-50, 68, -366], [-61, 74, -362], [-61, 83, -356], [-45, 83, -360]],
    pad: 12,
  },
  {
    id: 'grange-loft-return',
    from: [-45, 83, -360],
    to: [[-61, 83, -356], [-61, 74, -362], [-50, 68, -366], [-66, 68, -361]],
    pad: 12,
  },
];

const results = [];
for (const suite of suites) {
  const command = [
    path.resolve('scripts/reachability.mjs'),
    '--regions',
    regions,
  ];
  if (!live) command.push('--ops', ops);
  command.push(
    '--from',
    suite.from.join(','),
    '--to',
    suite.to.map((point) => point.join(',')).join(';'),
    '--pad',
    String(suite.pad),
    '--budget',
    String(suite.budget ?? 500_000),
  );
  const run = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const result = {
    ...suite,
    passed: run.status === 0,
    exitCode: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  };
  results.push(result);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${suite.id}`);
  if (!result.passed) {
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: live ? 'saved-world' : 'projected',
  regions,
  ops: live ? null : ops,
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  results,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.passed}/${report.total} ${report.mode} route suites pass`);
console.log(`report: ${output}`);
process.exit(report.failed === 0 ? 0 : 1);
