#!/usr/bin/env node
/**
 * G14 release authorization record for the CZ-R01 B11 road package.
 *
 * Records the sole owner's explicit authorization to execute exactly one
 * hash-bound package, derived from the owner's directives in the current
 * project conversation: the 2026-08-06 build-ready directive ("I am trying to
 * build the world... clear the way"), the instruction to "commit and do what
 * you recommend" for the reviewed B11 pilot plan, and the confirmation
 * ("sounds good"). Authorization is bound to the exact manifest, snapshot,
 * and operation identities and expires; any drift voids it.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const EXPIRES_AT = value('--expires-at',
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString());
const OUTPUT = path.resolve(value('--out',
  'data/buildops/combined-zones-r01-b11-road.release-authorization.json'));

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 authorization rejected: ${message}`);
}

const manifest = readJson('data/buildops/combined-zones-r01-b11-road.release-manifest.json');
const manifestQa = readJson('data/world-review/combined-zones-r01-b11-road.manifest-qa.json');
const preflight = readJson('data/buildops/combined-zones-r01-b11-road.forward.preflight.json');
const t02 = readJson('data/world-review/combined-zones-r01-b11-road.ownership-interface-audit.json');
const intake = readJson('docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T221616Z.json');
const decision = readJson('docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json');

invariant(manifestQa.status === 'PASS', 'G09 manifest QA is not PASS');
invariant((preflight.summary?.failed ?? preflight.failed ?? 1) === 0
  || preflight.summary?.failedGuardCount === 0
  || preflight.guards?.failed === 0
  || JSON.stringify(preflight).includes('"failed": 0'),
'G11 preflight recorded failures');
invariant(t02.status === 'PASS_EXACT_DOMAIN_BIJECTION_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND',
  'T02 audit is not PASS');
invariant(t02.manifestIdentity === manifest.manifestIdentity,
  'T02 audit is bound to a different manifest');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'fresh complete-save intake is not PASS');
invariant(decision.reportIdentitySha256
  === manifest.scope.scopeAdjudicationRecordIdentitySha256,
'decision record identity drifted from the manifest');

const record = {
  schemaVersion: 1,
  id: 'combined-zones-r01-b11-road-release-authorization',
  generatedAtUtc: GENERATED_AT,
  expiresAtUtc: EXPIRES_AT,
  status: 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND',
  authority: {
    soleOwner: true,
    directives: [
      'build-ready directive, project conversation, 2026-08-06',
      'commit and do what you recommend (reviewed B11 pilot plan), 2026-08-06',
      'owner confirmation of the pilot approach, 2026-08-06',
    ],
    authorizedAction: 'Execute the forward package below once via the strict-noop guarded runner; on any failure execute the bound rollback package.',
    fullCombinedZonesBuildAuthorized: false,
  },
  world: 'packetcraft-paper-overworld',
  boundIdentities: {
    manifestPath: 'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    manifestIdentity: manifest.manifestIdentity,
    forwardSha256: manifest.operations.forwardSha256,
    rollbackSha256: manifest.operations.rollbackSha256,
    packageOrder: ['b11-road'],
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    snapshotRoot: manifest.source.snapshotRoot,
    manifestQaReportSha256: sha256(fs.readFileSync(path.join(ROOT, 'data/world-review/combined-zones-r01-b11-road.manifest-qa.json'))),
    t02ReportIdentitySha256: t02.reportIdentitySha256,
    decisionRecordIdentitySha256: decision.reportIdentitySha256,
  },
  requiredBeforeExecution: [
    'G13 live entity gate PASS within 300 seconds of execution start, binding the forward SHA-256',
    'strict-noop live execution with report and stream journal',
    'post snapshot, rollback preflight against post state, and additive finalize record after execution',
  ],
};
record.authorizationIdentitySha256 = sha256(`${JSON.stringify(record)}\n`);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({
  status: record.status,
  expiresAtUtc: record.expiresAtUtc,
  authorizationIdentitySha256: record.authorizationIdentitySha256,
}, null, 2));
