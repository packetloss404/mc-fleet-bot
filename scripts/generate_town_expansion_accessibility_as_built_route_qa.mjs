#!/usr/bin/env node
/**
 * Finalize a separate, immutable as-built route contract for the committed
 * Town Expansion accessibility repair.
 *
 * This reads only immutable snapshots and evidence. It never applies an
 * overlay and never connects to Minecraft, RCON, systemd, or a database.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POST_REGIONS = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);
const POST_SHA256 =
  'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751';
const ORIGINAL_POST_SHA256 =
  '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d';
const FORWARD = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.txt',
);
const FORWARD_SHA256 =
  'b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b';
const FORWARD_OPERATION_COUNT = 1526;
const PROJECTED_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-route-manifest.json',
);
const PROJECTED_REPORT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-projected-route-qa-2026-07-28.json',
);
const PROJECTED_MARKDOWN = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-projected-route-qa.md',
);
const AS_BUILT_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-as-built-route-manifest.json',
);
const AS_BUILT_REPORT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-as-built-route-qa-20260728.json',
);
const AS_BUILT_MARKDOWN = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-as-built-route-qa.md',
);
const ACCESSIBILITY_TRANSACTION = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json',
);
const ACCESSIBILITY_EXECUTION = path.join(
  ROOT,
  'data/buildops/'
    + 'town-expansion-r1-accessibility-repair-attempt2-2026-07-28.execution.json',
);
const CITIZEN_FORWARD = path.join(
  ROOT,
  'data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.txt',
);
const CITIZEN_EXECUTION = path.join(
  ROOT,
  'data/buildops/'
    + 'citizen-route-live-walk-leaf-clearance-repair-2026-07-28.execution.json',
);
const ACCESSIBILITY_ROLLBACK_PREFLIGHT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-rollback-final-snapshot-preflight-20260728.json',
);
const CITIZEN_ROLLBACK_PREFLIGHT = path.join(
  ROOT,
  'data/world-review/'
    + 'citizen-route-live-walk-leaf-clearance-repair-rollback-poststate-preflight-20260728.json',
);
const TERMINAL_TRANSACTION = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-atomic-transaction-20260728T1838Z.json',
);
const TERMINAL_RELEASE_MANIFEST = path.join(
  ROOT,
  'data/buildops/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-2026-07-28.manifest.json',
);
const TERMINAL_PACKAGES = [
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function replCount(filename) {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('REPL '))
    .length;
}

const postSnapshot = hashSnapshotDirectory(POST_REGIONS);
if (postSnapshot.sha256 !== POST_SHA256) {
  throw new Error(
    `terminal post snapshot drift: expected ${POST_SHA256}, `
    + `found ${postSnapshot.sha256}`,
  );
}
if (sha256File(FORWARD) !== FORWARD_SHA256) {
  throw new Error('accessibility forward package hash drift');
}
if (replCount(FORWARD) !== FORWARD_OPERATION_COUNT) {
  throw new Error('accessibility forward package operation-count drift');
}

const transaction = readJson(ACCESSIBILITY_TRANSACTION);
const transactionPackage = transaction.packages?.find(
  (entry) => entry.key === 'town-expansion-r1-accessibility-repair',
);
if (
  transaction.status !== 'committed'
  || transactionPackage?.status !== 'committed'
  || transactionPackage?.forwardSha256 !== FORWARD_SHA256
  || transactionPackage?.sourceGroups !== FORWARD_OPERATION_COUNT
  || transactionPackage?.successfulGroups !== FORWARD_OPERATION_COUNT
  || transactionPackage?.failedGroups !== 0
  || transactionPackage?.noopCommands !== 0
) {
  throw new Error('accessibility attempt-2 transaction is not an exact commit');
}

const execution = readJson(ACCESSIBILITY_EXECUTION);
if (
  execution.status !== 'complete'
  || execution.operationSha256 !== FORWARD_SHA256
  || execution.successfulGroups !== FORWARD_OPERATION_COUNT
  || execution.failedGroups !== 0
  || execution.noopCommands !== 0
  || execution.strictNoop !== true
) {
  throw new Error('accessibility attempt-2 execution evidence is incomplete');
}

const citizenForwardSha256 = sha256File(CITIZEN_FORWARD);
const citizenExecution = readJson(CITIZEN_EXECUTION);
if (
  citizenExecution.status !== 'complete'
  || citizenExecution.operationSha256 !== citizenForwardSha256
  || citizenExecution.successfulGroups !== 1
  || citizenExecution.failedGroups !== 0
  || citizenExecution.noopCommands !== 0
  || citizenExecution.strictNoop !== true
) {
  throw new Error('citizen one-cell clearance execution evidence is incomplete');
}

for (const [label, filename, expected] of [
  ['accessibility rollback', ACCESSIBILITY_ROLLBACK_PREFLIGHT, FORWARD_OPERATION_COUNT],
  ['citizen rollback', CITIZEN_ROLLBACK_PREFLIGHT, 1],
]) {
  const evidence = readJson(filename);
  if (
    evidence.status !== 'PASS'
    || evidence.passed !== expected
    || evidence.failed !== 0
    || evidence.regionsSnapshot?.sha256 !== ORIGINAL_POST_SHA256
  ) {
    throw new Error(`${label} post-state preflight is incomplete`);
  }
}

const terminalTransaction = readJson(TERMINAL_TRANSACTION);
if (
  terminalTransaction.status !== 'committed-pending-post-qa'
  || sha256File(TERMINAL_RELEASE_MANIFEST)
    !== terminalTransaction.releaseManifestSha256
) {
  throw new Error('terminal supplemental transaction identity is incomplete');
}
const terminalPackageEvidence = [];
for (const expected of TERMINAL_PACKAGES) {
  const committed = terminalTransaction.packages?.find(
    (entry) => entry.key === expected.key,
  );
  const rollbackEvidence = readJson(path.join(ROOT, expected.rollbackPreflight));
  if (
    committed?.status !== 'committed'
    || committed.forwardSha256 !== expected.forwardSha256
    || committed.rollbackSha256 !== expected.rollbackSha256
    || sha256File(path.join(ROOT, expected.forward)) !== expected.forwardSha256
    || sha256File(path.join(ROOT, expected.rollback)) !== expected.rollbackSha256
    || committed.execution?.status !== 'complete'
    || committed.execution.strictNoop !== true
    || committed.execution.sourceGroupCount !== expected.operationCount
    || committed.execution.successfulGroups !== expected.operationCount
    || committed.execution.failedGroups !== 0
    || committed.execution.failedCommands !== 0
    || rollbackEvidence.status !== 'PASS'
    || rollbackEvidence.passed !== expected.operationCount
    || rollbackEvidence.failed !== 0
    || rollbackEvidence.opsSha256 !== expected.rollbackSha256
    || rollbackEvidence.regionsSnapshot?.sha256 !== POST_SHA256
  ) {
    throw new Error(
      `${expected.key} supplemental commit/inverse evidence is incomplete`,
    );
  }
  terminalPackageEvidence.push({
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

const projectedArtifacts = [
  PROJECTED_MANIFEST,
  PROJECTED_REPORT,
  PROJECTED_MARKDOWN,
].map((filename) => ({
  file: relative(filename),
  sha256: sha256File(filename),
  bytes: fs.statSync(filename).size,
}));

const projectedManifest = readJson(PROJECTED_MANIFEST);
if (
  projectedManifest.repairProjection?.operationsSha256 !== FORWARD_SHA256
  || projectedManifest.postSnapshot?.sha256 === POST_SHA256
) {
  throw new Error('projected route manifest is not the preserved pre-execution contract');
}

const asBuiltManifest = structuredClone(projectedManifest);
asBuiltManifest.postSnapshot = {
  directory: relative(POST_REGIONS),
  sha256: POST_SHA256,
};
asBuiltManifest.canonicalTownExpansionPackage = projectedManifest.package;
asBuiltManifest.package = {
  file: relative(FORWARD),
  sha256: FORWARD_SHA256,
  role: 'committed-accessibility-forward',
  operationCount: FORWARD_OPERATION_COUNT,
};
delete asBuiltManifest.repairProjection;
asBuiltManifest.asBuiltRelease = {
  status: 'COMMITTED_LIVE_TERMINAL_POST_SNAPSHOT',
  projectionOrOverlayPermitted: false,
  committedForward: {
    file: relative(FORWARD),
    sha256: FORWARD_SHA256,
    operationCount: FORWARD_OPERATION_COUNT,
  },
  accessibilityTransaction: {
    file: relative(ACCESSIBILITY_TRANSACTION),
    sha256: sha256File(ACCESSIBILITY_TRANSACTION),
  },
  accessibilityExecution: {
    file: relative(ACCESSIBILITY_EXECUTION),
    sha256: sha256File(ACCESSIBILITY_EXECUTION),
  },
  citizenClearance: {
    forward: relative(CITIZEN_FORWARD),
    forwardSha256: citizenForwardSha256,
    execution: relative(CITIZEN_EXECUTION),
    executionSha256: sha256File(CITIZEN_EXECUTION),
    operationCount: 1,
  },
  originalAccessibilityCitizenPostSnapshot: {
    sha256: ORIGINAL_POST_SHA256,
    role: 'immutable lineage input before terminal supplemental recovery',
  },
  terminalPostSnapshot: {
    directory: relative(POST_REGIONS),
    sha256: POST_SHA256,
    regionFileCount: postSnapshot.regionFileCount,
  },
  rollbackPostStatePreflights: [
    {
      file: relative(ACCESSIBILITY_ROLLBACK_PREFLIGHT),
      sha256: sha256File(ACCESSIBILITY_ROLLBACK_PREFLIGHT),
      guardsPassed: FORWARD_OPERATION_COUNT,
    },
    {
      file: relative(CITIZEN_ROLLBACK_PREFLIGHT),
      sha256: sha256File(CITIZEN_ROLLBACK_PREFLIGHT),
      guardsPassed: 1,
    },
  ],
  terminalSupplementalRecovery: {
    transaction: {
      file: relative(TERMINAL_TRANSACTION),
      sha256: sha256File(TERMINAL_TRANSACTION),
      status: terminalTransaction.status,
    },
    releaseManifest: {
      file: relative(TERMINAL_RELEASE_MANIFEST),
      sha256: sha256File(TERMINAL_RELEASE_MANIFEST),
    },
    packages: terminalPackageEvidence,
    totalSuccessfulGroups: terminalPackageEvidence.reduce(
      (sum, entry) => sum + entry.successfulGroups,
      0,
    ),
    totalFailedGroups: terminalPackageEvidence.reduce(
      (sum, entry) => sum + entry.failedGroups,
      0,
    ),
    exactRollbackPoststatePreflight: true,
  },
  preservedProjectedArtifacts: projectedArtifacts,
};

for (const filename of [AS_BUILT_MANIFEST, AS_BUILT_REPORT, AS_BUILT_MARKDOWN]) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}
fs.writeFileSync(
  AS_BUILT_MANIFEST,
  `${JSON.stringify(asBuiltManifest, null, 2)}\n`,
);

const report = await verifyTownExpansionRoutes({
  manifest: relative(AS_BUILT_MANIFEST),
  regions: relative(POST_REGIONS),
  report: relative(AS_BUILT_REPORT),
  markdown: relative(AS_BUILT_MARKDOWN),
});
if (report.projection !== null) {
  throw new Error('as-built route verifier unexpectedly used a projection');
}
if (report.completeForTownExpansionOfflineAcceptance !== report.passed) {
  throw new Error('as-built acceptance flag is inconsistent with route status');
}

process.stdout.write(`${JSON.stringify({
  status: report.status,
  acceptanceClass: report.acceptanceClass,
  completeForTownExpansionOfflineAcceptance:
    report.completeForTownExpansionOfflineAcceptance,
  snapshotSha256: report.postSnapshot.sha256,
  packageSha256: report.packageHashes['town-expansion-r1'].sha256,
  projection: report.projection,
  routes: report.summary.routes,
  passedRoutes: report.summary.passed,
  directions: report.summary.directionalRuns,
  passedDirections: report.summary.passedDirections,
  isolationAssertions: report.isolationAssertions.length,
  passedIsolationAssertions: report.isolationAssertions.filter(
    (entry) => entry.passed,
  ).length,
  report: relative(AS_BUILT_REPORT),
  markdown: relative(AS_BUILT_MARKDOWN),
}, null, 2)}\n`);

if (!report.passed) process.exitCode = 1;
