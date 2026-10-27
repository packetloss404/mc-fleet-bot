#!/usr/bin/env node
/** Independent post-state verifier for WLV-STF-ACCESS-01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const sourceValue = value('--source-regions');
const postValue = value('--post-regions');
const outValue = value('--out');
const opsValue = value('--ops') ?? 'data/buildops/wlv-staff-access-spine.forward.txt';
if (!sourceValue || !postValue || !outValue) throw new Error('Usage: --source-regions <dir> --post-regions <dir> --out <report> [--ops <forward>]');
const sourceDir = path.resolve(ROOT, sourceValue);
const postDir = path.resolve(ROOT, postValue);
const out = path.resolve(ROOT, outValue);
const ops = path.resolve(ROOT, opsValue);
const parse = (raw) => raw.trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const fields = line.trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) throw new Error(`unsupported operation: ${line}`);
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
  if (x1 !== x2 || y1 !== y2 || z1 !== z2) throw new Error(`expected single cell op: ${line}`);
  return { x: x1, y: y1, z: z1, from: fields[7], to: fields[8] };
});
const targets = parse(fs.readFileSync(ops, 'utf8'));
const targetKeys = new Set(targets.map(({ x, y, z }) => `${x},${y},${z}`));
const source = new AnvilReader(sourceDir);
const post = new AnvilReader(postDir);
const failures = [];
for (const target of targets) {
  const before = stateToCommandString(await source.blockState(target.x, target.y, target.z));
  const after = stateToCommandString(await post.blockState(target.x, target.y, target.z));
  if (before !== target.from) failures.push({ target, issue: 'source-drift', observed: before });
  if (after !== target.to) failures.push({ target, issue: 'post-target-mismatch', observed: after });
}
let haloChecked = 0;
for (let x = -423; x <= -415; x += 1) {
  for (let y = 17; y <= 21; y += 1) {
    for (let z = -548; z <= -540; z += 1) {
      const id = `${x},${y},${z}`;
      const before = stateToCommandString(await source.blockState(x, y, z));
      const after = stateToCommandString(await post.blockState(x, y, z));
      haloChecked += 1;
      if (!targetKeys.has(id) && before !== after) failures.push({ cell: [x, y, z], issue: 'non-target-halo-drift', before, after });
      if (y === 17 && before !== after) failures.push({ cell: [x, y, z], issue: 'floor-support-drift', before, after });
      if (after.includes('water') || after.includes('lava')) failures.push({ cell: [x, y, z], issue: 'post-fluid' });
    }
  }
}
const hash = (dir) => {
  const h = crypto.createHash('sha256');
  for (const name of fs.readdirSync(dir).filter((name) => name.endsWith('.mca')).sort()) {
    h.update(name); h.update('\0'); h.update(fs.readFileSync(path.join(dir, name))); h.update('\0');
  }
  return h.digest('hex');
};
const report = {
  schemaVersion: 1,
  id: 'wlv-stf-access-01-post-release-qa',
  status: failures.length ? 'FAIL' : 'PASS',
  source: { regions: path.relative(ROOT, sourceDir), sha256: hash(sourceDir) },
  post: { regions: path.relative(ROOT, postDir), sha256: hash(postDir) },
  targetCount: targets.length,
  targetDesiredAirCount: targets.filter(({ to }) => to === 'minecraft:air').length,
  haloChecked,
  assertions: {
    targetsExact: failures.filter(({ issue }) => issue === 'post-target-mismatch').length === 0,
    sourceGuardsExact: failures.filter(({ issue }) => issue === 'source-drift').length === 0,
    nonTargetHaloStable: failures.filter(({ issue }) => issue === 'non-target-halo-drift').length === 0,
    floorSupportPreserved: failures.filter(({ issue }) => issue === 'floor-support-drift').length === 0,
    noPostFluid: failures.filter(({ issue }) => issue === 'post-fluid').length === 0,
  },
  failures,
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, report: path.relative(ROOT, out), targetCount: targets.length, haloChecked }, null, 2)}\n`);
process.exitCode = failures.length ? 1 : 0;
