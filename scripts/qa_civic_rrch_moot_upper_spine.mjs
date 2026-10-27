#!/usr/bin/env node
/** Independent post-state geometry QA for CIVIC-RRCH-MOOT-UPPER-SPINE. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  AnvilReader,
  cellKey,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const MANIFEST = value('--manifest', 'data/buildops/civic-rrch-moot-upper-spine-20260822.release-manifest.json');
const POST_ROOT = value('--post-root');
const OUT = value('--out');
const invariant = (condition, message) => { if (!condition) throw new Error(`Moot upper spine QA rejected: ${message}`); };
invariant(POST_ROOT && OUT, '--post-root and --out are required');
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8'));
const reader = new AnvilReader(path.join(path.resolve(ROOT, POST_ROOT), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const failures = [];
const test = async (condition, detail) => { if (!(await condition)) failures.push(detail); };
const floor = 'minecraft:polished_blackstone';
const stair = 'minecraft:polished_deepslate_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]';
for (const { y, minZ, maxZ } of manifest.scope.route.landings) {
  for (let x = -99; x <= -93; x += 1) for (let z = minZ; z <= maxZ; z += 1) {
    await test(state(x, y, z).then((actual) => actual === floor), { type: 'landing-floor', x, y, z });
    for (let high = 1; high <= 6; high += 1) await test(state(x, y + high, z).then((actual) => actual === 'minecraft:air'), { type: 'landing-clearance', x, y: y + high, z });
  }
}
for (const [baseY, baseZ, id] of [[73, -385, 'lower'], [80, -364, 'upper']]) {
  for (let index = 0; index < 14; index += 1) {
    const y = baseY + Math.floor(index / 2); const z = baseZ + index;
    for (let x = -99; x <= -93; x += 1) {
      await test(state(x, y, z).then((actual) => actual === stair), { type: `${id}-stair`, x, y, z });
      for (let high = 1; high <= 6; high += 1) await test(state(x, y + high, z).then((actual) => actual === 'minecraft:air'), { type: `${id}-clearance`, x, y: y + high, z });
    }
  }
}
for (const x of [-100, -92]) for (let y = 73; y <= 93; y += 1) {
  await test(state(x, y, -393).then((actual) => actual !== 'minecraft:air'), { type: 'north-wall', x, y });
  await test(state(x, y, -341).then((actual) => actual !== 'minecraft:air'), { type: 'south-wall', x, y });
}
const routeChecks = [['forward', manifest.scope.route.from, manifest.scope.route.to],
  ['reverse', manifest.scope.route.to, manifest.scope.route.from]].map(([direction, from, to]) => {
  const result = spawnSync(process.execPath, [
    'scripts/reachability.mjs', '--regions', path.join(path.resolve(ROOT, POST_ROOT), 'region'),
    '--from', from.join(','), '--to', to.join(','), '--pad', '4', '--budget', '200000',
  ], { cwd: ROOT, encoding: 'utf8' });
  const passed = result.status === 0 && result.stdout.includes('REACHABLE');
  if (!passed) failures.push({ type: 'normal-walk-route', direction, from, to,
    output: result.stdout.trim().split(/\r?\n/).slice(-3), stderr: result.stderr.trim() });
  return { direction, from, to, passed, output: result.stdout.trim().split(/\r?\n/).slice(-3) };
});
const report = {
  schemaVersion: 1,
  id: 'civic-rrch-moot-upper-spine-post-release-qa',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  manifest: path.relative(ROOT, path.resolve(ROOT, MANIFEST)),
  postRoot: path.relative(ROOT, path.resolve(ROOT, POST_ROOT)),
  route: manifest.scope.route,
  checked: { clearWidth: 7, clearHeight: 6, rise: 1, run: 2, landingDepth: 7 },
  routeChecks,
  failureCount: failures.length,
  failures: failures.slice(0, 100),
};
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, failureCount: report.failureCount, out: report.postRoot }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
