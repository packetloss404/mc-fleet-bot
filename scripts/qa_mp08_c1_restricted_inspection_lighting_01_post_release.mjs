#!/usr/bin/env node
/** Independent immutable-post QA hook for MP08 C1 restricted lighting. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const regions = value('--regions'); const manifestPath = value('--manifest'); const out = value('--out');
if (!regions || !manifestPath || !out) throw new Error('Usage: --regions <immutable-post-region-dir> --manifest <manifest> --out <report>');
const abs = (file) => path.resolve(ROOT, file); const sha = (input) => crypto.createHash('sha256').update(input).digest('hex');
const manifest = JSON.parse(fs.readFileSync(abs(manifestPath), 'utf8'));
if (manifest.scope?.releaseId !== 'MP08-C1-RESTRICTED-INSPECTION-LIGHTING-01') throw new Error('lighting post-QA rejected: manifest identity drifted');
const forwardPath = manifest.packages?.find((entry) => entry.key === 'static-wall-lighting')?.forward;
if (!forwardPath) throw new Error('lighting post-QA rejected: forward package missing');
const fixtures = fs.readFileSync(abs(forwardPath), 'utf8').split('\n').flatMap((line) => {
  const match = line.match(/^REPL\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+/);
  return match ? [{ x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) }] : [];
});
if (fixtures.length !== 8) throw new Error(`lighting post-QA rejected: expected 8 fixture records, found ${fixtures.length}`);
const reader = new AnvilReader(abs(regions));
const states = await Promise.all(fixtures.map(async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))));
if (!states.every((entry) => entry === 'minecraft:sea_lantern')) throw new Error('lighting post-QA rejected: fixture state drifted');
const report = { schemaVersion: 1, id: 'MP08-C1-RESTRICTED-INSPECTION-LIGHTING-01-POST-QA', status: 'PASS_STATIC_FIXTURE_POSTSTATE', manifest: manifestPath, regions, fixtures, nonClaims: manifest.safetyBoundary.nonClaims };
report.payloadSha256 = sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(out)), { recursive: true }); fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, out }, null, 2));
