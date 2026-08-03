#!/usr/bin/env node
/**
 * Focused circulation regression for the rooms changed by worldwide fit-out
 * Wave 4 but not covered by the district, Ravensreach, or MainStreet suites.
 */
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
  'data/worldsnap-worldwide-wave3-post-20260727/region',
);
const ops = value(
  '--ops',
  'data/buildops/worldwide-room-fitout-wave4-2026-07-27.txt',
);
const output = value(
  '--out',
  'data/world-review/worldwide-room-fitout-wave4-focused-route-qa-2026-07-27.json',
);
const live = args.includes('--live');

const routes = [
  {
    id: 'beacon-inn-owner-floor-to-all-tower-levels',
    from: [-418, 78, -480],
    to: [
      [-416, 84, -485],
      [-416, 89, -485],
      [-416, 97, -485],
    ],
    pad: 18,
    budget: 500_000,
  },
  {
    id: 'beacon-inn-lookout-return',
    from: [-416, 97, -485],
    to: [
      [-416, 89, -485],
      [-416, 84, -485],
      [-418, 78, -480],
    ],
    pad: 18,
    budget: 500_000,
  },
  {
    id: 'westlight-venue-public-to-all-levels',
    from: [-354, 68, -498],
    to: [
      [-360, 19, -512],
      [-401, 34, -578],
      [-392, 36, -590],
      [-375, 45, -596],
      [-408, 36, -560],
      [-410, 41, -560],
    ],
    pad: 30,
    budget: 1_200_000,
  },
  {
    id: 'westlight-members-gallery-return',
    from: [-410, 41, -560],
    to: [
      [-408, 36, -560],
      [-360, 19, -512],
      [-354, 68, -498],
    ],
    pad: 30,
    budget: 1_200_000,
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
    String(route.budget),
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
