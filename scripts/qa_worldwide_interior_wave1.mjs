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
  'data/worldsnap-worldwide-interior-review-20260727/region',
);
const ops = value(
  '--ops',
  'data/buildops/worldwide-interior-wave1-2026-07-27.txt',
);
const live = args.includes('--live');
const output = value(
  '--out',
  'data/world-review/worldwide-interior-wave1-route-qa-2026-07-27.json',
);

const routes = [
  {
    id: 'rr-b1-up',
    from: [-30, -6, 0],
    to: [[-40, -1, -15], [-40, 4, -15]],
    pad: 12,
  },
  {
    id: 'rr-b1-down',
    from: [-40, 4, -15],
    to: [[-40, -1, -15], [-30, -6, 0]],
    pad: 12,
  },
  {
    id: 'rr-b2-up',
    from: [24, -6, -15],
    to: [[40, -1, -15], [37, 4, -15]],
    pad: 12,
  },
  {
    id: 'rr-b2-down',
    from: [37, 4, -15],
    to: [[40, -1, -15], [24, -6, -15]],
    pad: 12,
  },
  {
    id: 'rr-b3-up',
    from: [0, -4, 87],
    to: [[-8, 1, 100], [-8, 6, 100]],
    pad: 12,
  },
  {
    id: 'rr-b3-down',
    from: [-8, 6, 100],
    to: [[-8, 1, 100], [0, -4, 87]],
    pad: 12,
  },
  {
    id: 'rr-b4-up',
    from: [-132, -12, -10],
    to: [[-168, -7, -22]],
    pad: 12,
  },
  {
    id: 'rr-b4-down',
    from: [-168, -7, -22],
    to: [[-132, -12, -10]],
    pad: 12,
  },
  {
    id: 'rr-z5-surface-to-east-portal',
    from: [194, 65, -15],
    to: [[285, 19, -30]],
    pad: 130,
    budget: 1_200_000,
  },
  {
    id: 'rr-z5-east-portal-to-surface',
    from: [285, 19, -30],
    to: [[194, 65, -15]],
    pad: 130,
    budget: 1_200_000,
  },
  {
    id: 'ravensgate-bell-up',
    from: [-108, 68, -430],
    to: [[-108, 98, -431]],
    pad: 8,
  },
  {
    id: 'ravensgate-bell-down',
    from: [-108, 98, -431],
    to: [[-108, 68, -430]],
    pad: 8,
  },
  {
    id: 'westlight-district-upper-floors',
    from: [-344, 68, -486],
    to: [
      [-325, 73, -484],
      [-400, 73, -460],
      [-393, 73, -460],
      [-386, 73, -460],
      [-379, 73, -460],
      [-370, 73, -460],
      [-362, 73, -460],
      [-355, 73, -460],
      [-338, 73, -454],
      [-418, 73, -480],
      [-418, 78, -480],
    ],
    pad: 45,
    budget: 1_000_000,
  },
  {
    id: 'westlight-district-return',
    from: [-418, 78, -480],
    to: [
      [-344, 68, -486],
      [-400, 68, -465],
      [-355, 68, -465],
      [-344, 68, -455],
    ],
    pad: 45,
    budget: 1_000_000,
  },
];

const results = [];
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
    String(route.budget ?? 600_000),
  ];
  if (!live) command.splice(3, 0, '--ops', ops);
  const run = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  results.push({
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

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  regions,
  ops: live ? null : ops,
  mode: live ? 'saved-world' : 'projected',
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  results,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.passed}/${report.total} projected route suites pass`);
console.log(`report: ${output}`);
process.exit(report.failed === 0 ? 0 : 1);
