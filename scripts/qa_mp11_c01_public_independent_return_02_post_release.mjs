#!/usr/bin/env node
/** Independent immutable post QA for C01 Return-02; no live calls. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : null; };
const snapshot = option('--snapshot');
const manifestPath = option('--manifest');
const ledgerPath = option('--ledger');
const postIntakePath = option('--post-intake');
const out = option('--out');
const absolute = (value) => path.resolve(ROOT, value);
const relative = (value) => path.relative(ROOT, absolute(value)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = (value) => sha256(fs.readFileSync(absolute(value)));
const readJson = (value) => JSON.parse(fs.readFileSync(absolute(value), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`C01 Return-02 immutable post QA rejected: ${message}`); };
const key = (point) => point.join(',');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(String(state).split('[', 1)[0]);
const isUnsafe = (state) => /minecraft:(water|lava|bubble_column|sand|red_sand|gravel|suspicious_sand|suspicious_gravel)/.test(String(state)) || String(state).includes('waterlogged=true');

fail(snapshot && manifestPath && ledgerPath && postIntakePath && out, '--snapshot, --manifest, --ledger, --post-intake, and --out are required');
for (const required of [path.join(snapshot, 'region'), path.join(snapshot, 'entities'), path.join(snapshot, 'poi'), path.join(snapshot, 'level.dat'), path.join(snapshot, 'combined-zones-complete-save-capture.json'), manifestPath, ledgerPath, postIntakePath]) {
  fail(fs.existsSync(absolute(required)), `missing ${required}`);
}
fail(!fs.existsSync(absolute(out)), '--out must be fresh');

const manifest = readJson(manifestPath);
const ledger = readJson(ledgerPath);
const postIntake = readJson(postIntakePath);
fail(manifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && manifest.route?.stationCount === 28 && manifest.target?.canonicalPostStateCellCount === 768, 'wrong return manifest');
fail(ledger.releaseId === manifest.id && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_POST_QA' && ledger.sourceSnapshot?.manifestSha256 === fileSha256(manifestPath), 'wrong pending guarded ledger');
fail(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && postIntake.summary?.passed && postIntake.input?.suppliedWorldRoot === relative(snapshot), 'post capture not immutable complete');
for (const stage of ['fresh-source-complete-save', 'source-complete-save-intake', 'fresh-source-bound-return-compiler', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'projected-rollback-preflight', 'block-entity-and-protected-core-clearance', 'same-moment-live-entity-clearance', 'strict-forward-execution', 'fresh-post-complete-save', 'post-complete-save-intake', 'rollback-poststate-preflight']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `missing passed stage ${stage}`);
}

const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const at = async (point) => stateToCommandString(await reader.blockState(...point));
const canonical = manifest.target.allCanonicalPostStates;
const canonicalTargets = new Map(canonical.map((cell) => [key(cell.point), cell.targetState]));
const canonicalFailures = [];
const unsafeHits = [];
const stationFailures = [];

for (const cell of canonical) {
  const actual = await at(cell.point);
  if (actual !== cell.targetState) canonicalFailures.push({ point: cell.point, expected: cell.targetState, actual });
  if (isUnsafe(actual)) unsafeHits.push({ point: cell.point, actual });
}
for (const station of manifest.route.returnStations) {
  const [x, y, z] = station.point;
  for (let offset = -2; offset <= 2; offset += 1) {
    const dx = station.axis === 'z' ? offset : 0;
    const dz = station.axis === 'x' ? offset : 0;
    const supportPoint = [x + dx, y - 1, z + dz];
    const support = await at(supportPoint);
    if (isAir(support) || isUnsafe(support)) stationFailures.push({ kind: 'support', point: supportPoint, actual: support });
    for (let dy = 0; dy < 5; dy += 1) {
      const clearPoint = [x + dx, y + dy, z + dz];
      const clear = await at(clearPoint);
      if (!isAir(clear) || isUnsafe(clear)) stationFailures.push({ kind: 'clearance', point: clearPoint, actual: clear });
    }
  }
}

const route = manifest.route.returnStations.map((station) => station.point);
const normalWalk = (points) => points.every((point, index) => index === 0 || (Math.abs(point[0] - points[index - 1][0]) + Math.abs(point[2] - points[index - 1][2]) === 1 && Math.abs(point[1] - points[index - 1][1]) <= 1));
const endpointFailures = [];
let canonicalTargetOverlayCellCount = 0;
let legacyContractCellCount = 0;
for (const contract of Object.values(manifest.ownershipAndInterfaces.contracts ?? {})) {
  for (const cells of [contract.supportRow?.cells ?? [], contract.clearFace?.cells ?? []]) {
    for (const cell of cells) {
      const canonicalTargetState = canonicalTargets.get(key(cell.point));
      // A release's canonical target is authoritative on a shared endpoint cell.
      const expected = canonicalTargetState ?? cell.state;
      const expectationSource = canonicalTargetState ? 'canonical-target-overlay' : 'legacy-interface-contract';
      if (canonicalTargetState) canonicalTargetOverlayCellCount += 1;
      else legacyContractCellCount += 1;
      const actual = await at(cell.point);
      if (actual !== expected) endpointFailures.push({ point: cell.point, expected, actual, expectationSource, contractExpectedState: cell.state, canonicalTargetState: canonicalTargetState ?? null });
    }
  }
}

const lowerToUpperNormalWalk = normalWalk([...route].reverse());
const upperToLowerNormalWalk = normalWalk(route);
const protectedRouteDisjoint = manifest.route.currentProtectedRouteInteriorHaloIntersectionCount === 0;
const passed = !canonicalFailures.length && !unsafeHits.length && !stationFailures.length && !endpointFailures.length && lowerToUpperNormalWalk && upperToLowerNormalWalk && protectedRouteDisjoint;
const base = {
  schemaVersion: 2,
  id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-INDEPENDENT-POST-QA',
  status: passed ? 'PASS_C01_RETURN02_IMMUTABLE_POST_QA' : 'FAIL_C01_RETURN02_IMMUTABLE_POST_QA',
  mutationAuthority: false,
  readOnly: true,
  worldMutated: false,
  postSnapshot: { root: relative(snapshot), captureId: readJson(path.join(snapshot, 'combined-zones-complete-save-capture.json')).captureId },
  bindings: { manifest: { path: relative(manifestPath), sha256: fileSha256(manifestPath) }, ledger: { path: relative(ledgerPath), sha256: fileSha256(ledgerPath) } },
  checks: {
    canonicalPostStates: { passed: !canonicalFailures.length, hits: canonicalFailures },
    dryGravitySafe: { passed: !unsafeHits.length, hits: unsafeHits },
    twentyEightFiveWideFiveClearStations: { passed: !stationFailures.length, hits: stationFailures, stations: 28 },
    lowerToUpperNormalWalk,
    upperToLowerNormalWalk,
    endpointAndProtectedSwitchbackInvariants: {
      passed: !endpointFailures.length && protectedRouteDisjoint,
      hits: endpointFailures,
      canonicalTargetOverlayCellCount,
      legacyContractCellCount,
      canonicalTargetOverlayRule: 'canonical target state is required where an endpoint contract point is also a canonical release target; legacy contract state is required only outside that target set',
    },
  },
  nonClaims: ['Independent post QA only; no further mutation, opening, or commissioning authorization.'],
};
const report = { ...base, reportIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(absolute(out), { recursive: true });
fs.writeFileSync(path.join(absolute(out), 'mp11-c01-public-independent-return-02-post-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!passed) throw new Error(`C01 Return-02 post QA failed: ${JSON.stringify({ canonical: canonicalFailures.length, unsafe: unsafeHits.length, stations: stationFailures.length, endpoints: endpointFailures.length })}`);
console.log(JSON.stringify({ status: report.status, stations: 28, canonicalTargetOverlayCellCount, mutationAuthority: false, out: relative(out) }, null, 2));
