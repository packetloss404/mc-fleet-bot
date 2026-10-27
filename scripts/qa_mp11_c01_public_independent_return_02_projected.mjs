#!/usr/bin/env node
/** Projected-only functional QA for the C01 public independent-return package. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const MANIFEST = option('--manifest'); const SNAPSHOT = option('--snapshot'); const OUT = option('--out');
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => { if (!value) throw new Error(`MP11 C01 public independent-return projected QA rejected: ${message}`); };
const key = (point) => point.join(',');
const stateName = (state) => String(state).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');

fail(MANIFEST && SNAPSHOT && OUT, '--manifest, --snapshot, and --out are required');
const manifestBytes = fs.readFileSync(abs(MANIFEST)); const manifest = JSON.parse(manifestBytes);
fail(manifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && manifest.mutationAuthority === false, 'wrong or mutating manifest');
const root = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing immutable snapshot member ${member}`);
const captureBytes = fs.readFileSync(path.join(root, 'combined-zones-complete-save-capture.json')); const capture = JSON.parse(captureBytes);
fail(capture.captureId === manifest.source.captureId, 'manifest/source capture mismatch');
const reader = new AnvilReader(path.join(root, 'region')); const source = new Map();
async function state(point) { const k = key(point); if (!source.has(k)) source.set(k, stateToCommandString(await reader.blockState(...point))); return source.get(k); }
const targets = new Map(manifest.target.allCanonicalPostStates.map((item) => [key(item.point), item.targetState]));
const projected = async (point) => targets.get(key(point)) ?? state(point);
const route = manifest.route.returnStations;
fail(Array.isArray(route) && route.length === 28, 'exact return station route missing');
const failures = [];
for (const station of route) {
  const [x, y, z] = station.point;
  for (let cross = -2; cross <= 2; cross += 1) {
    const dx = station.axis === 'z' ? cross : 0; const dz = station.axis === 'x' ? cross : 0;
    const support = await projected([x + dx, y - 1, z + dz]);
    if (AIR.has(stateName(support)) || fluid(support)) failures.push({ kind: 'support', point: [x + dx, y - 1, z + dz], state: support });
    for (let dy = 0; dy < 5; dy += 1) {
      const clear = await projected([x + dx, y + dy, z + dz]);
      if (!AIR.has(stateName(clear)) || fluid(clear)) failures.push({ kind: 'clearance', point: [x + dx, y + dy, z + dz], state: clear });
    }
  }
}
const ordered = route.map((station) => station.point); const reverse = [...ordered].reverse();
for (const direction of [ordered, reverse]) for (let i = 1; i < direction.length; i += 1) {
  const a = direction[i - 1]; const b = direction[i];
  const horizontal = Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
  if (horizontal !== 1 || Math.abs(a[1] - b[1]) > 1) failures.push({ kind: 'normal-walk-transition', from: a, to: b });
}
const base = {
  schemaVersion: 1, id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-PROJECTED-QA', generatedAtUtc: new Date().toISOString(),
  status: failures.length === 0 ? 'PROJECTED_FUNCTIONAL_QA_PASS_NOT_POST_RELEASE_EVIDENCE' : 'PROJECTED_FUNCTIONAL_QA_FAIL', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), manifestIdentity: manifest.manifestIdentitySha256 },
  checks: { stationCount: route.length, fiveWideFiveClearAtEveryStation: failures.filter((failure) => failure.kind === 'support' || failure.kind === 'clearance').length === 0, lowerToUpperNormalWalk: failures.filter((failure) => failure.kind === 'normal-walk-transition').length === 0, upperToLowerNormalWalk: failures.filter((failure) => failure.kind === 'normal-walk-transition').length === 0, failureCount: failures.length, failures: failures.slice(0, 50) },
  nonClaims: ['Projection only; no immutable post-release state exists.', 'No execution, route opening, or commissioning claim.'],
};
const report = { ...base, reportIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-public-independent-return-02-projected-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-PROJECTED-QA.md'), `# MP11 C01 public independent-return 02 projected QA\n\n**Status:** \`${report.status}\`\n\nThe source-bound target projection checks all ${route.length} return stations for five supported cells and five clear cells above each, in both normal-walk directions. This is not post-release evidence.\n`);
fail(failures.length === 0, `projected functionality has ${failures.length} failures`);
console.log(JSON.stringify({ status: report.status, stationCount: route.length, mutationAuthority: false, out: rel(out) }, null, 2));
