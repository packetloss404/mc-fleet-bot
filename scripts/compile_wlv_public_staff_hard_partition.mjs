#!/usr/bin/env node
/** Compile the selected WLV-PUB-STF-BOUNDARY-01 solid physical partition. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const regionsValue = value('--regions'); const surveyValue = value('--survey'); const basename = value('--basename', 'wlv-public-staff-hard-partition');
if (!regionsValue || !surveyValue) throw new Error('Usage: --regions <region-dir> --survey <boundary-survey.json> [--basename <name>]');
const regions = path.resolve(ROOT, regionsValue); const survey = JSON.parse(fs.readFileSync(path.resolve(ROOT, surveyValue), 'utf8'));
const prefix = path.resolve(ROOT, 'data/buildops', basename); const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light']);
const hash = (dir) => { const h = crypto.createHash('sha256'); let bytes = 0; const names = fs.readdirSync(dir).filter((n) => n.endsWith('.mca')).sort(); for (const n of names) { const b = fs.readFileSync(path.join(dir, n)); h.update(n); h.update('\0'); h.update(b); h.update('\0'); bytes += b.length; } return { sha256: h.digest('hex'), regionFileCount: names.length, bytes }; };
const identity = hash(regions);
if (survey.status !== 'CUT_SET_IDENTIFIED_GATE_UNRESOLVED' || !survey.selected) throw new Error('survey has no safe virtual cut-set');
if (survey.sourceSnapshot.sha256 !== identity.sha256) throw new Error('survey/source snapshot identity mismatch');
if (!survey.selected.publicToBackstageBlocked || !survey.selected.publicToStaffSpineBlocked || !survey.selected.backstageToStaffSpinePreserved || !survey.selected.sourceAirOnly) throw new Error('selected cut does not preserve required graph assertions');
const reader = new AnvilReader(regions); const targets = [];
for (const detail of survey.selected.targetDetails) {
  const [x, y, z] = detail.cell; const current = stateToCommandString(await reader.blockState(x, y, z));
  if (!air.has(current.split('[')[0])) throw new Error(`partition target is no longer air at ${x},${y},${z}: ${current}`);
  targets.push({ x, y, z, from: current, to: 'minecraft:polished_deepslate' });
}
const op = ({ x, y, z, from, to }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${from} ${to}`;
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const forward = `${prefix}.forward.txt`; const rollback = `${prefix}.rollback.txt`; const manifest = `${prefix}.release-manifest.json`;
fs.writeFileSync(forward, `${targets.map(op).join('\n')}\n`); fs.writeFileSync(rollback, `${[...targets].reverse().map(({ x, y, z, from, to }) => op({ x, y, z, from: to, to: from })).join('\n')}\n`);
const report = { schemaVersion: 1, id: 'wlv-pub-stf-boundary-02', status: 'COMPILED_AWAITING_GUARDED_RELEASE', classification: 'REVERSIBLE_PHYSICAL_PUBLIC_STAFF_SEPARATION_NOT_ACCESS_CONTROL', sourceSnapshot: { regions: path.relative(ROOT, regions), ...identity }, survey: path.relative(ROOT, path.resolve(ROOT, surveyValue)), exactBounds: survey.selected.exactCandidateBounds, targetCount: targets.length, graphAssertions: { publicToBackstageBlocked: true, publicToStaffSpineBlocked: true, backstageToStaffSpinePreserved: true }, operationFiles: { forward: path.relative(ROOT, forward), rollback: path.relative(ROOT, rollback) } };
fs.writeFileSync(manifest, `${JSON.stringify(report, null, 2)}\n`); process.stdout.write(`${JSON.stringify({ status: report.status, targets: targets.length, forward: report.operationFiles.forward, rollback: report.operationFiles.rollback }, null, 2)}\n`);
