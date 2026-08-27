#!/usr/bin/env node
/** Read-only immutable-post QA for the C01 main-switchback / retained Return-02 release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const snapshot = opt('--snapshot'), manifestPath = opt('--manifest'), ledgerPath = opt('--ledger'), postIntakePath = opt('--post-intake'), out = opt('--out');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex'); const fileSha = (value) => sha(fs.readFileSync(abs(value)));
const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8')); const fail = (ok, message) => { if (!ok) throw new Error(`C01 main-switchback immutable post QA rejected: ${message}`); };
const key = (point) => point.join(','); const name = (state) => String(state).split('[', 1)[0]; const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const unsafe = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(name(state)) || String(state).includes('waterlogged=true');
const RESOLVED_WALL_STATE = 'minecraft:polished_deepslate_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]';
fail(snapshot && manifestPath && ledgerPath && postIntakePath && out, '--snapshot, --manifest, --ledger, --post-intake, and --out are required');
for (const required of [path.join(snapshot, 'region'), path.join(snapshot, 'entities'), path.join(snapshot, 'poi'), path.join(snapshot, 'level.dat'), path.join(snapshot, 'combined-zones-complete-save-capture.json'), manifestPath, ledgerPath, postIntakePath]) fail(fs.existsSync(abs(required)), `missing ${required}`);
fail(!fs.existsSync(abs(out)), '--out must be fresh');
const manifest = read(manifestPath), ledger = read(ledgerPath), postIntake = read(postIntakePath);
fail(manifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && manifest.scope?.stationCount === 30 && manifest.scope?.canonicalTargetUnion?.cellCount === 928 && manifest.scope?.currentProtectedRouteRetirementTargetCellCount === 0 && manifest.retainedReturn02?.canonicalStateGeometry?.cellCount === 768, 'wrong main-switchback manifest');
fail(ledger.releaseId === manifest.id && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_POST_QA' && ledger.sourceSnapshot?.manifestSha256 === fileSha(manifestPath), 'wrong pending guarded ledger');
fail(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && postIntake.summary?.passed === true && postIntake.input?.suppliedWorldRoot === rel(snapshot), 'post capture is not a complete immutable source');
for (const stage of ['fresh-source-complete-save', 'source-complete-save-intake', 'fresh-main-switchback-transition-rebind', 'fresh-main-switchback-compiler', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'projected-rollback-preflight', 'block-entity-and-protected-core-clearance', 'same-moment-live-entity-clearance', 'strict-forward-execution', 'fresh-post-complete-save', 'post-complete-save-intake', 'rollback-poststate-preflight']) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `missing passed stage ${stage}`);
const reader = new AnvilReader(path.join(abs(snapshot), 'region')); const at = async (point) => stateToCommandString(await reader.blockState(...point));
const canonicalFailures = [], unsafeHits = [];
for (const record of manifest.canonicalStates.target) { const actual = await at(record.point); const expected = record.role === 'two-high-guard-handrail' && record.targetState === 'minecraft:polished_deepslate_wall' ? RESOLVED_WALL_STATE : record.targetState; if (actual !== expected) canonicalFailures.push({ point: record.point, expected, manifestTargetState: record.targetState, actual }); if (unsafe(actual)) unsafeHits.push({ point: record.point, actual }); }
const routeFailures = [];
async function routeCheck(id, stations) {
  for (const station of stations) {
    const point = station.point ?? station; const axis = station.axis;
    for (let cross = -2; cross <= 2; cross += 1) {
      const cell = [axis === 'z' ? point[0] + cross : point[0], point[1], axis === 'x' ? point[2] + cross : point[2]];
      const support = await at([cell[0], cell[1] - 1, cell[2]]); if (air(support) || unsafe(support)) routeFailures.push({ id, kind: 'support', point: [cell[0], cell[1] - 1, cell[2]], actual: support });
      for (let dy = 0; dy < 5; dy += 1) { const clear = await at([cell[0], cell[1] + dy, cell[2]]); if (!air(clear) || unsafe(clear)) routeFailures.push({ id, kind: 'clearance', point: [cell[0], cell[1] + dy, cell[2]], actual: clear }); }
    }
  }
  const ordered = stations.map((station) => station.point ?? station);
  for (const direction of [ordered, [...ordered].reverse()]) for (let i = 1; i < direction.length; i += 1) { const a = direction[i - 1], b = direction[i]; if (Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]) !== 1 || Math.abs(a[1] - b[1]) > 1) routeFailures.push({ id, kind: 'normal-walk-transition', from: a, to: b }); }
}
await routeCheck('MAIN', manifest.scope.mainStations); await routeCheck('RETURN02', manifest.retainedReturn02.returnStations);
const retainedFailures = [];
for (const record of manifest.retainedReturn02.canonicalStates) { const actual = await at(record.point); if (actual !== record.targetState) retainedFailures.push({ point: record.point, expected: record.targetState, actual }); }
const pass = !canonicalFailures.length && !unsafeHits.length && !routeFailures.length && !retainedFailures.length;
const base = { schemaVersion: 2, id: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01-INDEPENDENT-POST-QA', status: pass ? 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' : 'FAIL_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA', mutationAuthority: false, readOnly: true, worldMutated: false, postSnapshot: { root: rel(snapshot), captureId: read(path.join(snapshot, 'combined-zones-complete-save-capture.json')).captureId }, bindings: { manifest: { path: rel(manifestPath), sha256: fileSha(manifestPath) }, ledger: { path: rel(ledgerPath), sha256: fileSha(ledgerPath) } }, checks: { canonicalPostStates: { passed: !canonicalFailures.length, hits: canonicalFailures, dynamicWallConnectionResolution: { applicableRole: 'two-high-guard-handrail', sourceDesignState: 'minecraft:polished_deepslate_wall', canonicalPostState: RESOLVED_WALL_STATE, acceptedOnlyForExactManifestGuardTargets: true } }, dryGravitySafe: { passed: !unsafeHits.length, hits: unsafeHits }, mainAndReturn02FiveWideFiveClear: { passed: !routeFailures.length, hits: routeFailures, mainStations: 30, returnStations: 28, bidirectional: true }, retainedReturn02: { passed: !retainedFailures.length && manifest.retainedReturn02.mainAndGuardIntersectionCount === 0, hits: retainedFailures, canonicalCount: 768, mainAndGuardIntersectionCount: manifest.retainedReturn02.mainAndGuardIntersectionCount } }, nonClaims: ['Read-only post QA does not authorize retirement, closure, connection, public opening, egress, or service commissioning.'] };
const report = { ...base, reportIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) }; fs.mkdirSync(abs(out), { recursive: true }); fs.writeFileSync(path.join(abs(out), 'mp11-c01-main-switchback-transition-01-post-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!pass) throw new Error(`C01 main-switchback post QA failed: ${JSON.stringify({ canonical: canonicalFailures.length, unsafe: unsafeHits.length, routes: routeFailures.length, retainedReturn02: retainedFailures.length })}`);
console.log(JSON.stringify({ status: report.status, mainStations: 30, returnStations: 28, mutationAuthority: false, out: rel(out) }, null, 2));
