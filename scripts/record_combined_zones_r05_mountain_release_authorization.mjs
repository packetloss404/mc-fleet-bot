#!/usr/bin/env node
/**
 * G14 release authorization for the CZ-R05 FM-01 mountain package pair,
 * hash-bound to the exact manifest, snapshot, and per-package operation
 * identities; expires; any drift voids it.
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
  'data/buildops/combined-zones-r05-mountain.release-authorization.json'));

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R05 mountain authorization rejected: ${message}`);
}
const stripHeader = (raw) => `${raw.split('\n').filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
const bodyHash = (p) => sha256(stripHeader(fs.readFileSync(path.join(ROOT, p), 'utf8')));

const manifest = readJson('data/buildops/combined-zones-r05-mountain.release-manifest.json');
const t02 = readJson('data/world-review/combined-zones-r05-mountain.ownership-interface-audit.json');
const intake = readJson('docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260807T001212Z.json');
const decisionDoc = fs.readFileSync(path.join(ROOT,
  'docs/masterplans/05-combined-zones/phase1-r05-mountain-scope-and-material-decision.md'));

// G09 substitution, disclosed: the generic manifest QA tool materializes a
// per-cell map and OOMs at 14.5M cells on this host (15GB RAM). The T02 audit
// covers every G09 check at interval granularity for this release: full
// domain re-derivation, package disjointness, per-line exact-inverse rollback
// proof, box-shape validation, and state completeness over four
// property-free states. The substitution is recorded in the authorization.
invariant(/^PASS/.test(t02.status), 'T02 audit is not PASS');
invariant(t02.manifestIdentity === manifest.manifestIdentity,
  'T02 audit is bound to a different manifest');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'bound complete-save intake is not PASS');
invariant(decisionDoc.toString('utf8')
  .includes('OWNER_DECISION_RECORDED_R05_MOUNTAIN_BUILD'),
'R05 decision record is not in the recorded state');

const packages = manifest.packages.map((pkg) => ({
  key: pkg.key,
  forward: pkg.forward,
  rollback: pkg.rollback,
  forwardSha256: bodyHash(pkg.forward),
  rollbackSha256: bodyHash(pkg.rollback),
}));

const record = {
  schemaVersion: 1,
  id: 'combined-zones-r05-mountain-release-authorization',
  generatedAtUtc: GENERATED_AT,
  expiresAtUtc: EXPIRES_AT,
  status: 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND',
  authority: {
    soleOwner: true,
    directives: [
      'build-ready directive, project conversation, 2026-08-06',
      'owner selection "Build it" + "Entomb naturally" for the FM-01 mountain, project conversation, 2026-08-07',
    ],
    authorizedAction: 'Execute the packages below once, in order, via the strict-noop guarded runner; on any failure roll back executed packages in reverse order.',
    fullCombinedZonesBuildAuthorized: false,
  },
  world: 'packetcraft-paper-overworld',
  boundIdentities: {
    manifestPath: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    manifestIdentity: manifest.manifestIdentity,
    packages,
    packageOrder: packages.map(({ key }) => key),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    snapshotRoot: 'data/worldsnap-combined-zones-complete-save-20260807T001212Z',
    g09Substitution: {
      genericQaTool: 'scripts/qa_guarded_release_manifest.mjs',
      outcome: 'OOM_AT_14_5M_PER_CELL_MATERIALIZATION_ON_15GB_HOST',
      substitutedBy: 'T02 interval-granularity coverage: domain re-derivation, package disjointness, per-line exact-inverse proof, box-shape validation, state completeness',
      t02Status: t02.status,
    },
    t02ReportIdentitySha256: t02.reportIdentitySha256 ?? null,
    decisionRecordSha256: sha256(decisionDoc),
  },
  requiredBeforeExecution: [
    'G11 preflight PASS for both forward files against the bound snapshot',
    'G12 strict dry-runs for all operation files',
    'G13 live entity gate PASS within 300 seconds of execution start, covering both forward files',
    'post snapshot, rollback preflights, and additive finalize record after execution',
  ],
};
record.authorizationIdentitySha256 = sha256(`${JSON.stringify(record)}\n`);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({
  status: record.status,
  packageOrder: record.boundIdentities.packageOrder,
  expiresAtUtc: record.expiresAtUtc,
  authorizationIdentitySha256: record.authorizationIdentitySha256,
}, null, 2));
