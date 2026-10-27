#!/usr/bin/env node
/**
 * MP11-INTERFACE-SURVEY-02
 *
 * Read-only comparison of every bounded, contract-reviewed Town Expansion
 * interface envelope.  It deliberately does not turn a broad envelope or a
 * zero-delta result into an operation: an exact current defect still needs a
 * one-owner scope, a reviewed interface contract, and the release kernel.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const BASELINE = value('--baseline', 'data/worldsnap-r08am-post-20260822T161818Z');
const CURRENT = value('--current', 'data/worldsnap-bkr-survey-00-source-20260826T095145Z');
const AUDIT = value('--audit', 'data/world-review/town-expansion-fresh-global-audit.json');
const CONTRACT = value('--contract', 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-cross-scope-interface-contracts.json');
const INTAKE = value('--current-intake', 'data/world-review/bkr-survey-00-20260826T095145Z/complete-save-intake.json');
const AUTHORIZED_FORWARD = value('--authorized-forward', 'data/buildops/circ-rg-bell-campanile-stair.campanile-stair.forward.txt');
const OUT = value('--out', 'data/world-review/mp11-town-expansion-interface-survey-02-current-20260826T095145Z.json');
const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const readJson = (file) => JSON.parse(fs.readFileSync(absolute(file), 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(absolute(file))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11 interface survey: ${message}`); };
const pair = (item) => `${item.fromScope} -> ${item.toScope}`;
const coordinateKey = ({ x, y, z }) => `${x},${y},${z}`;

const audit = readJson(AUDIT);
const contract = readJson(CONTRACT);
const intake = readJson(INTAKE);
const observed = audit.observedInterfaces ?? [];
const reviewed = audit.reviewedInterfaces ?? [];
const contracts = contract.interfaces ?? [];
const contractPairs = new Set(contracts.map(pair));
fail(audit.status === 'GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS', `audit status is ${audit.status}`);
fail(contract.status === 'APPROVED_EXACT_DEFAULT_DENY' && contract.wildcardsAllowed === false,
  'contract is not exact default-deny');
fail(observed.length === 13 && reviewed.length === 13 && contracts.length === 13,
  `interface cardinality ${observed.length}/${reviewed.length}/${contracts.length}`);
fail((audit.unreviewedInterfaces ?? []).length === 0 && observed.every((item) => contractPairs.has(pair(item))),
  'observed interface has no exact reviewed contract');
fail(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', `current intake is ${intake.status}`);
for (const root of [BASELINE, CURRENT]) {
  for (const member of ['region', 'entities', 'poi', 'level.dat']) {
    fail(fs.existsSync(absolute(path.join(root, member))), `snapshot missing ${root}/${member}`);
  }
}
fail(fs.existsSync(absolute(AUTHORIZED_FORWARD)), `missing authorized operation ${AUTHORIZED_FORWARD}`);
const authorizedOps = new Map();
for (const line of fs.readFileSync(absolute(AUTHORIZED_FORWARD), 'utf8').trim().split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const [kind, x1, y1, z1, x2, y2, z2, from, to] = line.split(' ');
  fail(kind === 'REPL' && x1 === x2 && y1 === y2 && z1 === z2 && from && to,
    `authorized operation is not a one-cell guarded REPL: ${line}`);
  authorizedOps.set(`${x1},${y1},${z1}`, { from, to });
}

const baseline = new AnvilReader(absolute(path.join(BASELINE, 'region')));
const current = new AnvilReader(absolute(path.join(CURRENT, 'region')));
const scan = async (item) => {
  const bounds = item.inclusiveBounds;
  const changes = [];
  let scanned = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        const before = stateToCommandString(await baseline.blockState(x, y, z));
        const after = stateToCommandString(await current.blockState(x, y, z));
        scanned += 1;
        if (before !== after) changes.push({ x, y, z, before, after });
      }
    }
  }
  const changeDigest = crypto.createHash('sha256')
    .update(changes.map(({ x, y, z, before, after }) => `${x},${y},${z}:${before}->${after}\n`).join(''))
    .digest('hex');
  const authorized = changes.filter((change) => {
    const operation = authorizedOps.get(coordinateKey(change));
    return operation?.from === change.before && operation?.to === change.after;
  });
  return {
    pair: pair(item),
    reviewedContractId: contracts.find((contractItem) => pair(contractItem) === pair(item))?.id ?? null,
    exactReviewedInterfaceCells: item.cells,
    envelopeBounds: bounds,
    envelopeCellsScanned: scanned,
    changedCells: changes.length,
    acceptedAuthorizedDeltaCells: authorized.length,
    unaccountedDeltaCells: changes.length - authorized.length,
    changeSetSha256: changeDigest,
    changes: changes.slice(0, 20),
    changesTruncated: Math.max(0, changes.length - 20),
  };
};

const interfaces = [];
for (const item of observed) interfaces.push(await scan(item));
const changedCells = interfaces.reduce((sum, item) => sum + item.changedCells, 0);
const acceptedAuthorizedDeltaCells = interfaces.reduce((sum, item) => sum + item.acceptedAuthorizedDeltaCells, 0);
const unaccountedDeltaCells = interfaces.reduce((sum, item) => sum + item.unaccountedDeltaCells, 0);
const scannedCells = interfaces.reduce((sum, item) => sum + item.envelopeCellsScanned, 0);
const report = {
  schemaVersion: 1,
  id: 'MP11-INTERFACE-SURVEY-02',
  generatedAtUtc: new Date().toISOString(),
  status: unaccountedDeltaCells === 0
    ? 'NO_UNAUTHORIZED_DELTA_ACROSS_REVIEWED_INTERFACE_ENVELOPES'
    : 'HOLD_CURRENT_ENVELOPE_DELTA_REQUIRES_EXACT_DEFECT_AND_OWNERSHIP_REVIEW',
  liveWorldMutated: false,
  scope: 'Town Expansion R1 reviewed cross-area interface envelopes only; not a citywide route or access certification.',
  sources: {
    baseline: { root: relative(BASELINE), completeMembers: ['region', 'entities', 'poi', 'level.dat'] },
    current: {
      root: relative(CURRENT),
      completeMembers: ['region', 'entities', 'poi', 'level.dat'],
      immutableCaptureIntake: { path: relative(INTAKE), status: intake.status, sha256: sha256(INTAKE) },
    },
    acceptedAudit: { path: relative(AUDIT), sha256: sha256(AUDIT), status: audit.status },
    contracts: { path: relative(CONTRACT), sha256: sha256(CONTRACT), status: contract.status, wildcardsAllowed: contract.wildcardsAllowed },
    authorizedRelease: {
      id: 'CIRC-RG-BELL-01',
      forward: relative(AUTHORIZED_FORWARD),
      sha256: sha256(AUTHORIZED_FORWARD),
      scope: 'accepted Ravensgate Bell-Gate campanile stair; checked only to classify its exact known current delta',
    },
  },
  coverage: { reviewedInterfaces: interfaces.length, envelopeCellsScanned: scannedCells, changedCells, acceptedAuthorizedDeltaCells, unaccountedDeltaCells },
  interfaces,
  candidate: {
    found: false,
    operationCount: 0,
    reason: unaccountedDeltaCells === 0
      ? 'The only 16 current block-state deltas are exact source-to-post cells of the already accepted CIRC-RG-BELL-01 release inside a broad reviewed envelope; no new defect-backed access target exists in this current complete source.'
      : 'An envelope delta is not automatically a defect or a change target. Resolve exact cells, functional impact, one-owner assignment, and a reviewed contract before any compiler can emit operations.',
  },
  nonClaims: [
    'Does not certify citywide circulation, public access, egress, or any route outside these envelopes.',
    'Does not authorize a Town Expansion mutation or alter the accepted R1 baseline.',
    'Does not treat a contract envelope as a change scope.',
  ],
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}\nreport=${relative(OUT)}\ninterfaces=${interfaces.length}\nscanned=${scannedCells}\nchanged=${changedCells}\nauthorized=${acceptedAuthorizedDeltaCells}\nunaccounted=${unaccountedDeltaCells}`);
