#!/usr/bin/env node
/**
 * Read-only remediation for a legacy MP02 B08 post-QA manifest that omitted
 * its exact B09 guideway/control source-state list.  It may only bind the
 * immutable source and post captures already named by the transaction ledger;
 * it never emits operations or grants new mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const ID = 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01';
const args = process.argv.slice(2);
const option = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : null; };
const fail = (message) => { throw new Error(`${ID} preservation remediation rejected: ${message}`); };
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const fileSha = (filename) => crypto.createHash('sha256').update(fs.readFileSync(abs(filename))).digest('hex');
const dataSha = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const samePath = (left, right) => abs(left) === abs(right);
const states = async (reader, cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const census = (records) => Object.fromEntries([...records.reduce((map, { state }) => map.set(state, (map.get(state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const compare = (source, post) => source.map((entry, index) => ({ cell: entry.cell, source: entry.state, post: post[index]?.state ?? null })).filter(({ source, post: actual }) => source !== actual);
const sourceArg = option('--source-snapshot'); const postArg = option('--post-snapshot'); const manifestArg = option('--manifest'); const transactionArg = option('--transaction-ledger'); const outArg = option('--out');
if (!sourceArg || !postArg || !manifestArg || !transactionArg || !outArg) fail('usage: --source-snapshot <immutable source> --post-snapshot <immutable post> --manifest <executed rebound manifest> --transaction-ledger <fresh-kernel-ledger> --out <acceptance ledger>');
const SOURCE = abs(sourceArg); const POST = abs(postArg); const MANIFEST = abs(manifestArg); const TRANSACTION = abs(transactionArg); const OUT = abs(outArg);
for (const [label, snapshot] of [['source', SOURCE], ['post', POST]]) for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(snapshot, member))) fail(`${label} snapshot missing ${member}`);
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); const transaction = JSON.parse(fs.readFileSync(TRANSACTION, 'utf8'));
if (manifest.scope?.releaseId !== ID || manifest.releaseNodeId !== 'CZ-MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER') fail('executed manifest identity mismatch');
if (!samePath(manifest.source?.snapshotRoot, SOURCE) || !samePath(transaction.sourceSnapshot?.root, SOURCE) || !samePath(transaction.postSnapshot?.root, POST)) fail('source/post arguments are not the transaction-bound immutable captures');
if (transaction.sourceSnapshot?.manifestSha256 !== fileSha(MANIFEST)) fail('transaction manifest SHA-256 does not bind the supplied manifest');
const failureStages = transaction.stages?.filter(({ status }) => status === 'FAIL') ?? [];
if (failureStages.length !== 1 || failureStages[0].stage !== 'independent-post-release-qa' || !String(failureStages[0].stderrTail).includes('lacks the exact 19-cell B09 guideway/control preservation baseline')) fail('transaction did not fail solely for the legacy B09 baseline omission');
if ((transaction.stages?.filter(({ status }) => status === 'PASS').length ?? 0) < 1 || transaction.status !== 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL') fail('transaction history is not the expected fail-closed post-QA condition');

const b03 = Array.from({ length: 20 }, (_, index) => ({ x: 2049, y: 130 + Math.floor(index / 5), z: -750 + (index % 5) }));
const b09Cap = Array.from({ length: 12 }, (_, index) => ({ x: 2050, y: 129 + Math.floor(index / 3), z: -749 + (index % 3) }));
const b09Controls = [
  ...Array.from({ length: 15 }, (_, index) => ({ x: 2058 + index, y: 130, z: -748 })),
  { x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }, { x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 },
].sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
for (const [name, cells, expected] of [['B03 aperture', b03, manifest.scope?.preservedB03Aperture], ['B09 cap', b09Cap, manifest.scope?.preservedB09Cap], ['B09 guideway/control', b09Controls, manifest.scope?.preservedB09GuidewayAndControls]]) {
  if (!expected || expected.cellCount !== cells.length || expected.coordinateSetSha256 !== hashCells(cells)) fail(`${name} coordinate set no longer binds its executed manifest`);
}
const sourceReader = new AnvilReader(path.join(SOURCE, 'region')); const postReader = new AnvilReader(path.join(POST, 'region'));
const [b03Source, b03Post, capSource, capPost, controlsSource, controlsPost] = await Promise.all([states(sourceReader, b03), states(postReader, b03), states(sourceReader, b09Cap), states(postReader, b09Cap), states(sourceReader, b09Controls), states(postReader, b09Controls)]);
const sourceCensuses = { B03Aperture: census(b03Source), B09Cap: census(capSource), B09GuidewayAndControls: census(controlsSource) };
if (JSON.stringify(sourceCensuses.B03Aperture) !== JSON.stringify(manifest.staticClearance?.B03ApertureCurrentStates) || JSON.stringify(sourceCensuses.B09Cap) !== JSON.stringify(manifest.staticClearance?.B09CapCurrentStates) || JSON.stringify(sourceCensuses.B09GuidewayAndControls) !== JSON.stringify(manifest.staticClearance?.B09GuidewayCurrentStates)) fail('transaction source does not reconstruct the manifest preservation census');
const b03Defects = [...compare(b03Source, b03Post), ...b03Source.filter(({ state }) => state !== 'minecraft:air').map(({ cell, state }) => ({ cell, source: state, post: 'required minecraft:air' })), ...b03Post.filter(({ state }) => state !== 'minecraft:air').map(({ cell, state }) => ({ cell, source: 'required minecraft:air', post: state }))];
const capDefects = [...compare(capSource, capPost), ...capSource.filter(({ state }) => state !== 'minecraft:polished_diorite').map(({ cell, state }) => ({ cell, source: state, post: 'required minecraft:polished_diorite' })), ...capPost.filter(({ state }) => state !== 'minecraft:polished_diorite').map(({ cell, state }) => ({ cell, source: 'required minecraft:polished_diorite', post: state }))];
const controlDefects = compare(controlsSource, controlsPost);
if (b03Defects.length || capDefects.length || controlDefects.length) fail(`immutable source/post preservation mismatch ${JSON.stringify({ b03: b03Defects.slice(0, 3), cap: capDefects.slice(0, 3), controls: controlDefects.slice(0, 3) })}`);
const baseline = { schemaVersion: 1, id: 'mp02-b08-restricted-chamber-dry-receiver-01-post-qa-preservation-remediation', releaseId: ID, status: 'PASS_SOURCE_BOUND_POST_PRESERVATION_RECONSTRUCTION', readOnly: true, mutationAuthority: false, worldMutated: false, transaction: { ledger: rel(TRANSACTION), source: rel(SOURCE), post: rel(POST), manifest: rel(MANIFEST), manifestSha256: fileSha(MANIFEST) }, baseline: { B03Aperture: { source: b03Source, post: b03Post, stateHash: dataSha(b03Source) }, B09Cap: { source: capSource, post: capPost, stateHash: dataSha(capSource) }, B09GuidewayAndControls: { source: controlsSource, post: controlsPost, stateHash: dataSha(controlsSource) } }, proof: { B03Aperture: { count: 20, expected: 'minecraft:air', sourcePostExact: true }, B09Cap: { count: 12, expected: 'minecraft:polished_diorite', sourcePostExact: true }, B09GuidewayAndControls: { count: 19, sourcePostExact: true, sourceCensus: sourceCensuses.B09GuidewayAndControls }, legacyManifestDefect: 'The executed manifest contained its 19-cell coordinate identity and source census but omitted the exact per-cell state baseline needed by post QA.', acceptance: 'The immutable transaction source reconstructs that baseline and every protected post cell exactly equals it.' }, nonclaims: ['No world operation was run.', 'This accepts only the missing preservation-evidence binding; it does not supersede the original failed ledger or authorize a further release.'] };
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(JSON.stringify({ status: baseline.status, acceptanceLedger: rel(OUT), preservation: { B03Aperture: 20, B09Cap: 12, B09GuidewayAndControls: 19 }, mutationAuthority: false }, null, 2));
