#!/usr/bin/env node
/** Read-only projected/post route QA for the five-cell RRCH-MOOT bell clearance. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const regions = value('--regions');
const ops = value('--ops');
const out = value('--out');
if (!regions || !ops || !out) throw new Error('usage: --regions <region> --ops <forward-or-empty-ops> --out <json>');
const absolute = (filename) => path.resolve(ROOT, filename);
const TARGETS = [[-86, 88, -374], [-86, 88, -375], [-86, 88, -376], [-85, 88, -376], [-85, 88, -377]];
const PROTECTED = [
  { label: 'third-floor sign', point: [-87, 85, -375], state: 'minecraft:spruce_wall_sign[facing=east,waterlogged=false]' },
  { label: 'penthouse sign', point: [-87, 89, -375], state: 'minecraft:spruce_wall_sign[facing=east,waterlogged=false]' },
  { label: 'bell', point: [-85, 89, -372], state: 'minecraft:bell[attachment=ceiling,facing=north,powered=false]' },
  { label: 'bell ceiling support', point: [-85, 90, -372], state: 'minecraft:spruce_planks' },
  { label: 'penthouse sign wall support', point: [-88, 89, -375], state: 'minecraft:stone_bricks' },
];
const PAIRS = [
  ['sanctum-deep-corridor', [-85, 30, -380], [-84, 41, -341], 25, 800000],
  ['deep-corridor-b2', [-84, 41, -341], [-83, 56, -342], 8, 600000],
  ['b2-b1-grand-stair', [-78, 57, -384], [-78, 63, -377], 12, 600000],
  ['b1-ground-public-stair', [-85, 62, -384], [-85, 68, -377], 14, 600000],
  ['ground-first-floor', [-85, 68, -377], [-85, 74, -384], 16, 600000],
  ['first-second-floor', [-85, 74, -375], [-84, 79, -375], 10, 600000],
  ['second-third-floor', [-84, 79, -375], [-84, 84, -375], 10, 600000],
  ['third-floor-penthouse', [-84, 84, -375], [-85, 88, -379], 12, 600000],
  ['full-deep-penthouse-chain', [-84, 41, -341], [-85, 88, -379], 25, 800000],
  ['full-sanctum-penthouse-chain', [-85, 30, -380], [-85, 88, -379], 60, 1000000],
];
const reader = new AnvilReader(absolute(regions));
const stateAt = async ([x, y, z]) => stateToCommandString(await reader.blockState(x, y, z));
const targetStates = await Promise.all(TARGETS.map(async (point) => ({ point, state: await stateAt(point) })));
const protectedStates = await Promise.all(PROTECTED.map(async ({ label, point, state }) => ({ label, point, expected: state, actual: await stateAt(point) })));
const targetMode = targetStates.every(({ state }) => state === 'minecraft:smooth_quartz') ? 'PROJECTED_FORWARD'
  : targetStates.every(({ state }) => state === 'minecraft:air') ? 'POSTSTATE' : 'DRIFT';
const routes = [];
for (const [id, a, b, pad, budget] of PAIRS) for (const direction of ['forward', 'reverse']) {
  const from = direction === 'forward' ? a : b;
  const to = direction === 'forward' ? b : a;
  const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', regions, '--ops', ops, '--from', from.join(','), '--to', to.join(','), '--pad', String(pad), '--budget', String(budget)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  routes.push({ id, direction, from, to, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-2) });
}
const failures = routes.filter(({ passed }) => !passed);
const protectedFailures = protectedStates.filter(({ expected, actual }) => expected !== actual);
const report = {
  schemaVersion: 1,
  id: 'mp10-rrch-bell-penthouse-vertical-01-route-qa',
  status: targetMode !== 'DRIFT' && protectedFailures.length === 0 && failures.length === 0 ? 'PASS' : 'FAIL',
  mode: targetMode,
  targetStates,
  protectedStates,
  protectedFailures,
  routeSummary: { pairs: PAIRS.length, directions: routes.length, passed: routes.length - failures.length, failed: failures.length },
  routes,
  failures,
  readOnly: true,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, mode: report.mode, routeSummary: report.routeSummary, protectedFailures: protectedFailures.length }, null, 2));
process.exitCode = report.status === 'PASS' ? 0 : 1;
