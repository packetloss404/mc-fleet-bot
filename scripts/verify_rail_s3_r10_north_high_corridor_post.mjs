#!/usr/bin/env node
/** Independent post QA for R10's sealed, disjoint north high corridor. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const sourceRoot = value('--source');
const postRoot = value('--post');
const manifestPath = value('--manifest', 'data/buildops/rail-s3-r10-north-high-corridor-01.manifest.json');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const predecessorOpsPath = value('--predecessor-ops', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
const out = value('--out');
if (!sourceRoot || !postRoot || !out) throw new Error('usage: --source <root> --post <root> --out <json> [--manifest --retention-manifest --predecessor-ops]');
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const retention = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const parse = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => { const fields = line.split(/\s+/); return { point: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) }, from: fields[7], to: fields[8] }; });
const highOps = manifest.stages.flatMap(({ forward }) => parse(forward));
const highResults = await Promise.all(highOps.map(async (operation) => ({ point: operation.point, expected: operation.to, observed: await state(post, operation.point) })));
const highFailures = highResults.filter(({ expected, observed }) => expected !== observed);
const retentionOps = retention.stages.flatMap(({ forward }) => parse(forward));
const retentionResults = await Promise.all(retentionOps.map(async (operation) => ({ point: operation.point, expected: operation.to, source: await state(source, operation.point), post: await state(post, operation.point) })));
const retentionFailures = retentionResults.filter(({ expected, source: before, post: after }) => before !== expected || after !== expected);
const predecessorOps = parse(predecessorOpsPath);
const predecessorResults = await Promise.all(predecessorOps.map(async ({ point }) => ({ point, source: await state(source, point), post: await state(post, point) })));
const predecessorFailures = predecessorResults.filter(({ source: before, post: after }) => before !== after);
const report = { schemaVersion: 1, id: 'rail-s3-r10-north-high-corridor-post-qa', sourceRoot, postRoot, status: highFailures.length === 0 && retentionFailures.length === 0 && predecessorFailures.length === 0 ? 'PASS' : 'FAIL', highCorridor: { expected: highResults.length, actual: highResults.length - highFailures.length, failures: highFailures }, retentionInvariant: { expected: retentionResults.length, actual: retentionResults.length - retentionFailures.length, failures: retentionFailures }, predecessorInvariant: { expected: predecessorResults.length, actual: predecessorResults.length - predecessorFailures.length, failures: predecessorFailures }, routeCommissioned: false, passengerServiceCommissioned: false, readOnly: true };
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, highCorridor: `${report.highCorridor.actual}/${report.highCorridor.expected}`, retentionInvariant: `${report.retentionInvariant.actual}/${report.retentionInvariant.expected}`, predecessorInvariant: `${report.predecessorInvariant.actual}/${report.predecessorInvariant.expected}` }, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 2;
