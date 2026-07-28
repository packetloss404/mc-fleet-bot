#!/usr/bin/env node
/**
 * Rebind the accepted 22-route manifest to the immutable terminal-recovery
 * snapshot and verify it without overlays or live access.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);
const SNAPSHOT_SHA256 =
  'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751';
const SOURCE_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-as-built-route-manifest.json',
);
const MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-terminal-as-built-route-manifest.json',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/town-expansion-terminal-as-built-route-qa-20260728T1839Z.json',
);
const MARKDOWN = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-terminal-as-built-route-qa.md',
);
const TRANSACTION = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-atomic-transaction-20260728T1838Z.json',
);
const RELEASE_MANIFEST = path.join(
  ROOT,
  'data/buildops/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-2026-07-28.manifest.json',
);
const PACKAGES = [
  {
    key: 'red-carpet-source-recovery',
    operationCount: 49,
    forward: 'data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt',
    forwardSha256:
      'bbbc0e74ebaa857d5a235535d68d069df73bd1b81516aef4495352fa54be4b16',
    rollback: 'data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.rollback.txt',
    rollbackSha256:
      'e2f49273472cd0a16c34aba4407bde6ed0b2494eec38cd1c3b569cc260192a64',
    rollbackPreflight:
      'data/world-review/town-expansion-r1-red-carpet-source-recovery-rollback-poststate-preflight-20260728T1839Z.json',
  },
  {
    key: 'citizen-ridge-stair-repair',
    operationCount: 8,
    forward: 'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt',
    forwardSha256:
      '3861a63b00ec0108fac133dec196eaf0b08807027bd461fcd7e2b2b012fef797',
    rollback: 'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback.txt',
    rollbackSha256:
      '2ca28368800ab72817251871ee65ff170f4a384de38948e4abbbe1009bc9f66b',
    rollbackPreflight:
      'data/world-review/citizen-route-ridge-stair-repair-rollback-poststate-preflight-20260728T1839Z.json',
  },
];

function invariant(condition, message) {
  if (!condition) throw new Error(`terminal route QA: ${message}`);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

const snapshot = hashSnapshotDirectory(SNAPSHOT);
invariant(snapshot.sha256 === SNAPSHOT_SHA256, 'terminal snapshot hash drift');
const transaction = readJson(TRANSACTION);
invariant(
  transaction.status === 'committed-pending-post-qa',
  `transaction status is ${transaction.status}`,
);
invariant(
  sha256File(RELEASE_MANIFEST) === transaction.releaseManifestSha256,
  'release manifest hash does not match transaction',
);

const packageEvidence = [];
for (const expected of PACKAGES) {
  const committed = transaction.packages.find((entry) => entry.key === expected.key);
  invariant(committed?.status === 'committed', `${expected.key} was not committed`);
  invariant(
    committed.forwardSha256 === expected.forwardSha256,
    `${expected.key} forward transaction hash drift`,
  );
  invariant(
    committed.rollbackSha256 === expected.rollbackSha256,
    `${expected.key} rollback transaction hash drift`,
  );
  invariant(
    sha256File(path.join(ROOT, expected.forward)) === expected.forwardSha256,
    `${expected.key} forward file hash drift`,
  );
  invariant(
    sha256File(path.join(ROOT, expected.rollback)) === expected.rollbackSha256,
    `${expected.key} rollback file hash drift`,
  );
  invariant(
    committed.execution?.status === 'complete'
      && committed.execution.strictNoop === true
      && committed.execution.sourceGroupCount === expected.operationCount
      && committed.execution.successfulGroups === expected.operationCount
      && committed.execution.failedGroups === 0
      && committed.execution.failedCommands === 0,
    `${expected.key} execution was not an exact strict commit`,
  );
  const rollbackPreflight = readJson(path.join(ROOT, expected.rollbackPreflight));
  invariant(
    rollbackPreflight.status === 'PASS'
      && rollbackPreflight.passed === expected.operationCount
      && rollbackPreflight.failed === 0
      && rollbackPreflight.opsSha256 === expected.rollbackSha256
      && rollbackPreflight.regionsSnapshot?.sha256 === SNAPSHOT_SHA256,
    `${expected.key} rollback post-state preflight failed or drifted`,
  );
  packageEvidence.push({
    ...expected,
    executionReport: relative(path.resolve(ROOT, committed.executionReport)),
    executionReportSha256: sha256File(
      path.resolve(ROOT, committed.executionReport),
    ),
    successfulGroups: committed.execution.successfulGroups,
    failedGroups: committed.execution.failedGroups,
    rollbackPreflightSha256: sha256File(
      path.join(ROOT, expected.rollbackPreflight),
    ),
  });
}

const manifest = readJson(SOURCE_MANIFEST);
manifest.postSnapshot = {
  directory: relative(SNAPSHOT),
  sha256: SNAPSHOT_SHA256,
};
manifest.asBuiltRelease = {
  ...(manifest.asBuiltRelease ?? {}),
  terminalSnapshot: manifest.postSnapshot,
  terminalRecoveryTransaction: {
    file: relative(TRANSACTION),
    sha256: sha256File(TRANSACTION),
    status: transaction.status,
  },
};
manifest.terminalRecoveryRelease = {
  releaseManifest: {
    file: relative(RELEASE_MANIFEST),
    sha256: sha256File(RELEASE_MANIFEST),
  },
  transaction: manifest.asBuiltRelease.terminalRecoveryTransaction,
  packages: packageEvidence,
  totalSuccessfulGroups: packageEvidence.reduce(
    (sum, entry) => sum + entry.successfulGroups,
    0,
  ),
  totalFailedGroups: packageEvidence.reduce(
    (sum, entry) => sum + entry.failedGroups,
    0,
  ),
  exactRollbackPoststatePreflight: true,
};
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

const report = await verifyTownExpansionRoutes({
  manifest: relative(MANIFEST),
  regions: relative(SNAPSHOT),
  noWrite: true,
});
invariant(report.status === 'PASS', '22-route verifier did not pass');
invariant(
  report.summary.routes === 22
    && report.summary.passed === 22
    && report.summary.directionalRuns === 44
    && report.summary.passedDirections === 44,
  '22-route/directional coverage drifted',
);
report.terminalRecoveryRelease = manifest.terminalRecoveryRelease;
report.asBuiltEvidenceClass =
  'IMMUTABLE_TERMINAL_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED';
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# Town Expansion terminal as-built route QA

- Status: **PASS**
- Evidence class: \`${report.asBuiltEvidenceClass}\`
- Immutable terminal snapshot: \`${SNAPSHOT_SHA256}\`
- Routes: ${report.summary.passed}/${report.summary.routes}
- Directions: ${report.summary.passedDirections}/${report.summary.directionalRuns}
- Terminal recovery commit: ${manifest.terminalRecoveryRelease.totalSuccessfulGroups}
  successful guarded groups, 0 failed
- Exact rollback post-state guards: 49/49 red-carpet and 8/8 ridge-stair
- Manifest: \`${relative(MANIFEST)}\`
- Report: \`${relative(REPORT)}\`

This is immutable-snapshot geometry acceptance. Live powered-door, dynamic
entity, and citizen end-to-end gates remain pending. Cached seam diagnostics
cannot substitute for a fresh full bidirectional citizen walk.
`;
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  snapshotSha256: report.postSnapshot.sha256,
  routes: report.summary.routes,
  passed: report.summary.passed,
  directions: report.summary.directionalRuns,
  passedDirections: report.summary.passedDirections,
  manifest: {
    file: relative(MANIFEST),
    sha256: sha256File(MANIFEST),
  },
  report: {
    file: relative(REPORT),
    sha256: sha256File(REPORT),
  },
  markdown: {
    file: relative(MARKDOWN),
    sha256: sha256File(MARKDOWN),
  },
}, null, 2));

