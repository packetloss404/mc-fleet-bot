#!/usr/bin/env node
/**
 * Independent post-release route QA for MP10-RRCH-COMMITTEE-BRIDGE-01.
 *
 * This deliberately does not reuse the compiler's in-memory projection. It
 * invokes the conservative route flooder against a sealed post-state Anvil
 * copy and requires every named, normal-walk station in the 20-station route
 * to be reached from the west endpoint. It never writes a world file or
 * contacts RCON.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const POST = value('--post');
const FORWARD = value('--forward');
const OUT = value('--out');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP10 Committee Route QA rejected: ${message}`);
};
fail(POST && FORWARD && OUT, 'required --post, --forward, and --out arguments are absent');

const absolute = (filename) => path.resolve(ROOT, filename);
const requiredMembers = ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json'];
for (const member of requiredMembers) fail(fs.existsSync(path.join(absolute(POST), member)), `post capture missing ${member}`);

const route = [
  [-90, -357], [-90, -358], [-90, -359], [-90, -360], [-90, -361], [-90, -362],
  [-89, -362], [-88, -362], [-87, -362], [-86, -362], [-85, -362], [-84, -362], [-83, -362],
  [-83, -361], [-83, -360], [-83, -359], [-82, -359], [-81, -359], [-81, -358], [-81, -357],
].map(([x, z]) => ({ x, y: 77, z }));
const station = ({ x, y, z }) => `${x},${y},${z}`;
const args = [
  'scripts/reachability.mjs', '--regions', path.join(POST, 'region'),
  '--from', station(route[0]), '--to', route.map(station).join(';'),
  '--pad', '4', '--budget', '300000', '--trace',
];
const run = spawnSync(process.execPath, args, {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
const output = `${run.stdout}${run.stderr}`;
const missing = route.filter((point) => !output.includes(`REACHABLE   ${station(point)}`));
const protectedForward = fs.readFileSync(absolute(FORWARD));
const result = {
  releaseId: 'MP10-RRCH-COMMITTEE-BRIDGE-01',
  status: run.status === 0 && missing.length === 0 ? 'PASS' : 'FAIL',
  postSnapshot: POST,
  postCaptureManifestSha256: crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(absolute(POST), 'combined-zones-complete-save-capture.json'))).digest('hex'),
  forwardOperationSha256: crypto.createHash('sha256').update(protectedForward).digest('hex'),
  standard: 'normal walking only; no jump, sprint, dig, swim, or climb',
  start: route[0],
  end: route.at(-1),
  stationCount: route.length,
  route,
  reachability: {
    command: [process.execPath, ...args],
    exitCode: run.status,
    allStationsReachable: missing.length === 0,
    unreachableStations: missing,
    rawOutput: output.trim(),
  },
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(result, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
