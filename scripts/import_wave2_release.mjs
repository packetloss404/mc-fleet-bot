#!/usr/bin/env node
/**
 * Atomically promote the accepted Wave 2 Raven Rock and MainStreet features
 * into world-map.db.
 *
 * The importer is intentionally one-shot: all 51 external IDs must be absent.
 * It binds the write to the immutable post snapshot, committed transaction,
 * bidirectional route QA, and matched after-camera reports. A consistent SQLite
 * backup is created before the first write. Features, two snapshot scans, and
 * 51 observations are committed in one outer transaction.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');
const args = process.argv.slice(2);

const EXPECTED_POST_SHA256 =
  'd05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999';
const EXPECTED_FEATURES = 51;
const EXPECTED_PROJECT_COUNTS = new Map([
  ['raven-rock', 41],
  ['mainstreet-america', 10],
]);
const EXPECTED_EVIDENCE_GATES = new Set([
  'pre-and-post-snapshot-identity',
  'post-state-and-rollback-ravenrock-t2b',
  'post-state-and-rollback-mainstreet-r08',
  'all-package-live-entity-gate',
  'atomic-transaction-committed',
  'bidirectional-live-routes',
  'matched-after-media',
]);

function value(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function resolveInput(flag, fallback) {
  return path.resolve(ROOT, value(flag, fallback));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tableCounts(database) {
  return {
    worldFeatures: database.prepare('SELECT COUNT(*) AS count FROM world_features').get().count,
    worldScans: database.prepare('SELECT COUNT(*) AS count FROM world_scans').get().count,
    featureObservations: database
      .prepare('SELECT COUNT(*) AS count FROM feature_observations')
      .get().count,
  };
}

function currentUtcToken() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function artifact(filename) {
  return {
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function verifyArtifactBinding(gate, filename, label) {
  const expected = gate?.details?.artifact;
  assert(expected, `${label} artifact binding is missing from prerequisite QA`);
  assert(expected.path === relative(filename), `${label} artifact path changed`);
  assert(expected.sha256 === sha256File(filename), `${label} artifact hash changed`);
  assert(expected.bytes === fs.statSync(filename).size, `${label} artifact size changed`);
}

function normalizeGeometry(geometry) {
  if (geometry?.type === 'LineString3D') {
    return {
      type: 'path',
      points: geometry.coordinates.map(([x, y, z]) => ({ x, y, z })),
      width: geometry.width,
    };
  }
  if (geometry?.type === 'point' && !geometry.position) {
    return {
      type: 'point',
      position: { x: geometry.x, y: geometry.y, z: geometry.z },
    };
  }
  return geometry;
}

function cleanTags(tags) {
  return [...new Set([
    ...(tags ?? []).filter((tag) => (
      tag !== 'not-imported' && tag !== 'not-live-executed'
    )),
    'wave2',
    'as-built',
    'post-release-qa',
  ])];
}

if (args.includes('--contract')) {
  console.log(JSON.stringify({
    schemaVersion: 1,
    oneShot: true,
    expectedPostSnapshotSha256: EXPECTED_POST_SHA256,
    proposedFeatureCount: EXPECTED_FEATURES,
    projectCounts: Object.fromEntries(EXPECTED_PROJECT_COUNTS),
    prerequisiteQa: {
      status: 'FAIL',
      onlyFailedGate: 'database-import',
      importedRows: 0,
      allOtherGatesPass: true,
    },
    mutation: {
      databaseOnly: 'data/world-map.db',
      backupBeforeWrite: true,
      atomic: ['51 features', '2 scans', '51 observations'],
      duplicates: 'reject globally before and inside transaction',
    },
  }, null, 2));
  process.exit(0);
}

const dbPath = resolveInput('--database', 'data/world-map.db');
const postRegions = resolveInput(
  '--post',
  'data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region',
);
const transactionPath = resolveInput(
  '--transaction',
  'data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json',
);
const routePath = resolveInput(
  '--route-report',
  'data/world-review/redevelopment-wave2-route-qa-2026-07-28.json',
);
const ravenAfterPath = resolveInput(
  '--raven-after-report',
  'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/capture-report.json',
);
const mainstreetAfterPath = resolveInput(
  '--mainstreet-after-report',
  'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after-capture-report.json',
);
const prerequisiteQaPath = resolveInput(
  '--prerequisite-qa',
  'data/world-review/redevelopment-wave2-pre-database-qa-2026-07-28.json',
);
const ravenProposalPath = resolveInput(
  '--raven-proposal',
  'data/world-review/ravenrock-wave2-tunnel-database-features-prerelease-2026-07-28.json',
);
const mainstreetReportPath = resolveInput(
  '--mainstreet-report',
  'data/buildops/mainstreet-wave2-r08-prerelease-2026-07-28.report.json',
);
const manifestPath = resolveInput(
  '--manifest',
  'data/buildops/redevelopment-wave2-release-manifest.json',
);
const outputPath = resolveInput(
  '--out',
  'data/world-review/redevelopment-wave2-database-import-2026-07-28.json',
);
const backupDirectory = resolveInput('--backup-dir', 'data/backups');

for (const filename of [
  dbPath,
  postRegions,
  transactionPath,
  routePath,
  ravenAfterPath,
  mainstreetAfterPath,
  prerequisiteQaPath,
  ravenProposalPath,
  mainstreetReportPath,
  manifestPath,
]) {
  assert(fs.existsSync(filename), `required input does not exist: ${filename}`);
}

const postSnapshot = hashSnapshotDirectory(postRegions);
assert(
  postSnapshot.sha256 === EXPECTED_POST_SHA256,
  `post snapshot drift: ${postSnapshot.sha256}`,
);
assert(postSnapshot.regionFileCount === 26, 'post snapshot must contain 26 region files');

const prerequisiteQa = readJson(prerequisiteQaPath);
const failedPrerequisiteGates = prerequisiteQa.gates
  .filter((gate) => gate.passed !== true)
  .map((gate) => gate.id);
assert(
  prerequisiteQa.schemaVersion === 1
    && prerequisiteQa.status === 'FAIL'
    && prerequisiteQa.passed === false,
  'prerequisite QA must be the pre-import FAIL report',
);
assert(
  failedPrerequisiteGates.length === 1
    && failedPrerequisiteGates[0] === 'database-import',
  `prerequisite QA must fail only database-import; got ${failedPrerequisiteGates}`,
);
for (const gateId of EXPECTED_EVIDENCE_GATES) {
  assert(
    prerequisiteQa.gates.some((gate) => gate.id === gateId && gate.passed === true),
    `prerequisite evidence gate is not passing: ${gateId}`,
  );
}
const databaseGate = prerequisiteQa.gates.find((gate) => gate.id === 'database-import');
assert(
  databaseGate.details.expectedExternalIds === EXPECTED_FEATURES
    && databaseGate.details.importedRows === 0
    && databaseGate.details.missingExternalIds.length === EXPECTED_FEATURES,
  'prerequisite database gate is not the clean 0/51 state',
);
const postIdentityGate = prerequisiteQa.gates.find(
  (gate) => gate.id === 'pre-and-post-snapshot-identity',
);
assert(
  postIdentityGate.details.post.sha256 === EXPECTED_POST_SHA256
    && postIdentityGate.details.post.path === relative(postRegions),
  'prerequisite QA is not bound to the accepted post snapshot',
);

const transactionGate = prerequisiteQa.gates.find(
  (gate) => gate.id === 'atomic-transaction-committed',
);
const routeGate = prerequisiteQa.gates.find(
  (gate) => gate.id === 'bidirectional-live-routes',
);
verifyArtifactBinding(transactionGate, transactionPath, 'transaction');
verifyArtifactBinding(routeGate, routePath, 'route');

const mediaGate = prerequisiteQa.gates.find((gate) => gate.id === 'matched-after-media');
for (const [label, filename] of [
  ['ravenrock after-camera report', ravenAfterPath],
  ['mainstreet after-camera report', mainstreetAfterPath],
]) {
  const media = label.startsWith('raven')
    ? mediaGate.details.ravenrock
    : mediaGate.details.mainstreet;
  assert(media.passed === true, `${label} did not pass prerequisite QA`);
  assert(media.afterReport.path === relative(filename), `${label} path changed`);
  assert(media.afterReport.sha256 === sha256File(filename), `${label} hash changed`);
}

const manifest = readJson(manifestPath);
const transaction = readJson(transactionPath);
const route = readJson(routePath);
const ravenAfter = readJson(ravenAfterPath);
const mainstreetAfter = readJson(mainstreetAfterPath);
assert(transaction.status === 'committed-pending-post-qa', 'transaction is not committed');
assert(
  transaction.releaseManifestSha256 === sha256File(manifestPath),
  'transaction no longer matches the release manifest',
);
assert(
  transaction.packages.length === 2
    && transaction.packages.every((entry) => entry.status === 'committed'),
  'both transaction packages must be committed',
);
assert(route.status === 'PASS', 'route report is not PASS');
assert(
  route.postSnapshot?.sha256 === EXPECTED_POST_SHA256,
  'route report is not bound to the post snapshot',
);
assert(
  route.tests?.length === 2
    && route.tests.every((test) => (
      test.directions?.length === 2
      && test.directions.every((direction) => (
        direction.passed === true
        && direction.movementPolicyViolations?.length === 0
      ))
    )),
  'both routes must pass in both directions without policy violations',
);
for (const [report, expectedCount, label] of [
  [ravenAfter, 6, 'Raven Rock'],
  [mainstreetAfter, 8, 'MainStreet'],
]) {
  assert(report.status === 'PASS' && report.passed === true, `${label} capture report failed`);
  assert(report.snapshot?.sha256 === EXPECTED_POST_SHA256, `${label} capture snapshot drift`);
  assert(report.captureCount === expectedCount, `${label} capture count changed`);
  assert(
    report.captures.every((capture) => (
      capture.quality?.nonBlank === true
      && fs.existsSync(path.resolve(ROOT, capture.output))
      && sha256File(path.resolve(ROOT, capture.output)) === capture.sha256
    )),
    `${label} after-camera files no longer match the report`,
  );
}

const ravenProposal = readJson(ravenProposalPath);
const mainstreetReport = readJson(mainstreetReportPath);
assert(
  ravenProposal.status === 'proposal-not-imported'
    && ravenProposal.featureCount === 41
    && ravenProposal.features.length === 41,
  'Raven Rock proposal is not the reviewed 41-feature set',
);
assert(
  mainstreetReport.databaseFeatures?.mutationPerformed === false
    && mainstreetReport.databaseFeatures?.proposedCount === 10
    && mainstreetReport.databaseFeatures?.features?.length === 10
    && mainstreetReport.databaseFeatures?.existingIdConflicts?.length === 0,
  'MainStreet report is not the reviewed 10-feature proposal',
);

const evidence = {
  postSnapshot: {
    path: relative(postRegions),
    sha256: postSnapshot.sha256,
    regionFileCount: postSnapshot.regionFileCount,
    bytes: postSnapshot.members.reduce((sum, member) => sum + member.bytes, 0),
  },
  manifest: artifact(manifestPath),
  transaction: artifact(transactionPath),
  route: artifact(routePath),
  afterMedia: {
    ravenrock: artifact(ravenAfterPath),
    mainstreet: artifact(mainstreetAfterPath),
  },
  prerequisiteQa: artifact(prerequisiteQaPath),
};

const definitions = [
  ...ravenProposal.features.map((proposal) => ({
    projectId: proposal.projectId,
    externalId: proposal.externalId,
    parentExternalId: proposal.parentExternalId,
    world: proposal.world ?? 'world',
    name: proposal.name,
    kind: proposal.kind,
    status: 'complete',
    geometry: normalizeGeometry(proposal.geometry),
    source: proposal.source ?? 'region_scan',
    sourceRef: proposal.sourceRef ?? relative(ravenProposalPath),
    confidence: proposal.confidence ?? 1,
    completionRatio: 1,
    conditionScore: proposal.conditionScore ?? null,
    tags: cleanTags(proposal.tags),
    attributes: {
      ...(proposal.attributes ?? {}),
      proposalStatus: proposal.status,
      wave2Release: {
        packageId: 'INF-RR-02',
        importClass: proposal.externalId === 'RR-T2B-LINER-PILOT-W2'
          ? 'committed-physical-feature'
          : 'accepted-post-snapshot-inventory',
        evidence,
      },
    },
  })),
  ...mainstreetReport.databaseFeatures.features.map((proposal) => ({
    projectId: 'mainstreet-america',
    externalId: proposal.external_id,
    parentExternalId: proposal.parent_external_id,
    world: 'world',
    name: proposal.name,
    kind: proposal.kind,
    status: 'complete',
    geometry: normalizeGeometry(proposal.geometry),
    source: 'rcon',
    sourceRef: relative(mainstreetReportPath),
    confidence: 1,
    completionRatio: 1,
    conditionScore: null,
    tags: cleanTags(proposal.tags),
    attributes: {
      ...(proposal.attributes ?? {}),
      proposalStatus: proposal.status,
      wave2Release: {
        packageId: 'mainstreet-r08',
        importClass: 'committed-physical-feature',
        evidence,
      },
    },
  })),
];

assert(definitions.length === EXPECTED_FEATURES, 'feature proposal total changed');
assert(
  new Set(definitions.map(({ externalId }) => externalId)).size === EXPECTED_FEATURES,
  'proposed external IDs are not globally unique',
);
for (const [projectId, expected] of EXPECTED_PROJECT_COUNTS) {
  assert(
    definitions.filter((definition) => definition.projectId === projectId).length === expected,
    `${projectId} proposal count changed`,
  );
}

const externalIds = definitions.map(({ externalId }) => externalId);
const placeholders = externalIds.map(() => '?').join(',');
const preflightDatabase = new Database(dbPath, {
  readonly: true,
  fileMustExist: true,
});
const countsBefore = tableCounts(preflightDatabase);
const integrityBefore = preflightDatabase.pragma('integrity_check', { simple: true });
const foreignKeysBefore = preflightDatabase.pragma('foreign_key_check');
const duplicatesBefore = preflightDatabase.prepare(
  `SELECT project_id, external_id
   FROM world_features
   WHERE external_id IN (${placeholders})
   ORDER BY project_id, external_id`,
).all(...externalIds);
preflightDatabase.close();
assert(integrityBefore === 'ok', `database integrity failed before import: ${integrityBefore}`);
assert(foreignKeysBefore.length === 0, 'database has foreign-key violations before import');
assert(
  duplicatesBefore.length === 0,
  `refusing duplicate import; existing external IDs: ${
    duplicatesBefore.map((entry) => `${entry.project_id}/${entry.external_id}`).join(', ')
  }`,
);
assert(
  databaseGate.details.sha256BeforeRead === sha256File(dbPath),
  'database file changed after the prerequisite QA',
);

if (args.includes('--preflight')) {
  console.log(JSON.stringify({
    status: 'PASS_PREFLIGHT',
    readOnly: true,
    database: relative(dbPath),
    databaseSha256: sha256File(dbPath),
    counts: countsBefore,
    postSnapshotSha256: postSnapshot.sha256,
    proposedFeatures: definitions.length,
    duplicates: duplicatesBefore,
    evidence: {
      transactionSha256: evidence.transaction.sha256,
      routeSha256: evidence.route.sha256,
      ravenAfterSha256: evidence.afterMedia.ravenrock.sha256,
      mainstreetAfterSha256: evidence.afterMedia.mainstreet.sha256,
      prerequisiteQaSha256: evidence.prerequisiteQa.sha256,
    },
  }, null, 2));
  process.exit(0);
}

fs.mkdirSync(backupDirectory, { recursive: true });
const backupPath = path.join(
  backupDirectory,
  `world-map-wave2-preimport-${currentUtcToken()}.db`,
);
assert(!fs.existsSync(backupPath), `backup already exists: ${backupPath}`);

const backupSource = new Database(dbPath, {
  readonly: true,
  fileMustExist: true,
});
await backupSource.backup(backupPath);
backupSource.close();
const backupDatabase = new Database(backupPath, {
  readonly: true,
  fileMustExist: true,
});
const backupCounts = tableCounts(backupDatabase);
const backupIntegrity = backupDatabase.pragma('integrity_check', { simple: true });
const backupForeignKeys = backupDatabase.pragma('foreign_key_check');
backupDatabase.close();
assert(backupIntegrity === 'ok', `backup integrity failed: ${backupIntegrity}`);
assert(backupForeignKeys.length === 0, 'backup contains foreign-key violations');
assert(
  JSON.stringify(backupCounts) === JSON.stringify(countsBefore),
  'backup logical counts do not match the source database',
);
const backupArtifact = artifact(backupPath);

const store = new WorldFeatureStore(dbPath);
const imported = [];
const scans = [];
try {
  const importTransaction = store.sqlite.transaction(() => {
    const duplicatesInsideTransaction = store.sqlite.prepare(
      `SELECT project_id, external_id
       FROM world_features
       WHERE external_id IN (${placeholders})`,
    ).all(...externalIds);
    assert(
      duplicatesInsideTransaction.length === 0,
      'proposed external ID appeared after preflight; refusing the whole transaction',
    );

    const projects = [...new Set(definitions.map(({ projectId }) => projectId))];
    const featuresByProject = new Map(projects.map((projectId) => [
      projectId,
      new Map(store.listFeatures({ projectId, limit: 1_000 })
        .filter(({ externalId }) => externalId)
        .map((feature) => [feature.externalId, feature])),
    ]));
    const pending = [...definitions];
    const ordered = [];
    const scheduled = new Set();
    while (pending.length > 0) {
      let progressed = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const definition = pending[index];
        const known = featuresByProject.get(definition.projectId);
        const parentKey = `${definition.projectId}\u0000${definition.parentExternalId}`;
        if (
          definition.parentExternalId
          && !known.has(definition.parentExternalId)
          && !scheduled.has(parentKey)
        ) {
          continue;
        }
        ordered.push(definition);
        scheduled.add(`${definition.projectId}\u0000${definition.externalId}`);
        pending.splice(index, 1);
        progressed = true;
      }
      assert(
        progressed,
        `unresolved feature parents: ${pending.map((entry) => (
          `${entry.projectId}/${entry.externalId}->${entry.parentExternalId}`
        )).join(', ')}`,
      );
    }

    for (const definition of ordered) {
      const projectFeatures = featuresByProject.get(definition.projectId);
      const parent = definition.parentExternalId
        ? projectFeatures.get(definition.parentExternalId)
        : null;
      assert(
        !definition.parentExternalId || parent,
        `missing parent ${definition.projectId}/${definition.parentExternalId}`,
      );
      const feature = store.createFeature({
        projectId: definition.projectId,
        externalId: definition.externalId,
        parentId: parent?.id ?? null,
        world: definition.world,
        name: definition.name,
        kind: definition.kind,
        status: definition.status,
        geometry: definition.geometry,
        source: definition.source,
        sourceRef: definition.sourceRef,
        confidence: definition.confidence,
        completionRatio: definition.completionRatio,
        conditionScore: definition.conditionScore,
        tags: definition.tags,
        attributes: definition.attributes,
        observedAt: Date.now(),
      });
      projectFeatures.set(definition.externalId, feature);
      imported.push({
        id: feature.id,
        projectId: feature.projectId,
        externalId: feature.externalId,
        parentId: feature.parentId,
        kind: feature.kind,
        status: feature.status,
      });
    }

    for (const projectId of projects) {
      const projectFeatures = imported.filter((feature) => feature.projectId === projectId);
      const scan = store.createScan({
        projectId,
        world: 'world',
        method: 'region_snapshot',
        observer: 'codex-wave2-release-import',
        snapshotRef: `${relative(postRegions)}:sha256=${postSnapshot.sha256}`,
        summary: {
          release: 'redevelopment-wave2-2026-07-28',
          featureCount: projectFeatures.length,
          evidence,
        },
      });
      for (const importedFeature of projectFeatures) {
        store.recordObservation({
          scanId: scan.id,
          featureId: importedFeature.id,
          status: 'complete',
          completionRatio: 1,
          conditionScore: null,
          details: {
            release: 'redevelopment-wave2-2026-07-28',
            externalId: importedFeature.externalId,
            postSnapshotSha256: postSnapshot.sha256,
            transactionSha256: evidence.transaction.sha256,
            routeReportSha256: evidence.route.sha256,
            afterMedia: evidence.afterMedia,
          },
        });
      }
      const completed = store.completeScan(scan.id, {
        summary: {
          ...scan.summary,
          observationCount: projectFeatures.length,
          completed: true,
        },
      });
      scans.push({
        id: completed.id,
        projectId,
        status: completed.status,
        observations: projectFeatures.length,
      });
    }
  });
  importTransaction.immediate();
  const checkpoint = store.sqlite.pragma('wal_checkpoint(TRUNCATE)');
  assert(
    checkpoint.every((entry) => entry.busy === 0),
    `database checkpoint was busy: ${JSON.stringify(checkpoint)}`,
  );
} finally {
  store.close();
}

const databaseSha256AfterCommit = sha256File(dbPath);
const verificationDatabase = new Database(dbPath, {
  readonly: true,
  fileMustExist: true,
});
const countsAfter = tableCounts(verificationDatabase);
const integrityAfter = verificationDatabase.pragma('integrity_check', { simple: true });
const foreignKeysAfter = verificationDatabase.pragma('foreign_key_check');
const verifiedRows = verificationDatabase.prepare(
  `SELECT id, project_id, external_id, parent_id, name, kind, status,
          geometry_json, source, source_ref, completion_ratio, tags_json,
          attributes_json, revision
   FROM world_features
   WHERE external_id IN (${placeholders})
   ORDER BY project_id, external_id`,
).all(...externalIds);
const verifiedScans = verificationDatabase.prepare(
  `SELECT id, project_id, status, snapshot_ref, summary_json
   FROM world_scans
   WHERE id IN (${scans.map(() => '?').join(',')})
   ORDER BY project_id`,
).all(...scans.map(({ id }) => id));
const verifiedObservations = verificationDatabase.prepare(
  `SELECT feature_id, scan_id, status, completion_ratio, details_json
   FROM feature_observations
   WHERE scan_id IN (${scans.map(() => '?').join(',')})`,
).all(...scans.map(({ id }) => id));
verificationDatabase.close();

const verifiedIds = new Set(verifiedRows.map(({ external_id: externalId }) => externalId));
const missingIds = externalIds.filter((externalId) => !verifiedIds.has(externalId));
const parentFailures = verifiedRows.filter((row) => !row.parent_id);
const evidenceFailures = verifiedRows.filter((row) => {
  const attributes = JSON.parse(row.attributes_json);
  return attributes.wave2Release?.evidence?.postSnapshot?.sha256 !== EXPECTED_POST_SHA256
    || attributes.wave2Release?.evidence?.transaction?.sha256 !== evidence.transaction.sha256
    || attributes.wave2Release?.evidence?.route?.sha256 !== evidence.route.sha256;
});
const projectVerification = Object.fromEntries(
  [...EXPECTED_PROJECT_COUNTS].map(([projectId, expected]) => {
    const actual = verifiedRows.filter((row) => row.project_id === projectId).length;
    return [projectId, { expected, actual, passed: actual === expected }];
  }),
);
const verificationPassed = integrityAfter === 'ok'
  && foreignKeysAfter.length === 0
  && verifiedRows.length === EXPECTED_FEATURES
  && missingIds.length === 0
  && parentFailures.length === 0
  && evidenceFailures.length === 0
  && verifiedScans.length === 2
  && verifiedScans.every((scan) => (
    scan.status === 'complete' && scan.snapshot_ref?.includes(EXPECTED_POST_SHA256)
  ))
  && verifiedObservations.length === EXPECTED_FEATURES
  && verifiedObservations.every((observation) => (
    observation.status === 'complete' && observation.completion_ratio === 1
  ))
  && Object.values(projectVerification).every(({ passed }) => passed)
  && countsAfter.worldFeatures === countsBefore.worldFeatures + EXPECTED_FEATURES
  && countsAfter.worldScans === countsBefore.worldScans + 2
  && countsAfter.featureObservations === countsBefore.featureObservations + EXPECTED_FEATURES;
assert(verificationPassed, 'post-import read-only verification failed');

const report = {
  schemaVersion: 1,
  id: 'redevelopment-wave2-database-import',
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS',
  passed: true,
  mutationScope: {
    database: relative(dbPath),
    otherDatabasesModified: false,
    liveWorldModified: false,
  },
  atomicity: {
    oneOuterImmediateTransaction: true,
    duplicatePolicy: 'reject-before-backup-and-recheck-inside-transaction',
    preExistingProposedIds: duplicatesBefore,
    committedFeatures: imported.length,
    committedScans: scans.length,
    committedObservations: verifiedObservations.length,
  },
  backup: {
    ...backupArtifact,
    integrityCheck: backupIntegrity,
    foreignKeyViolations: backupForeignKeys,
    counts: backupCounts,
  },
  database: {
    path: relative(dbPath),
    sha256Before: databaseGate.details.sha256BeforeRead,
    sha256After: databaseSha256AfterCommit,
    countsBefore,
    countsAfter,
    integrityBefore,
    integrityAfter,
    foreignKeyViolationsBefore: foreignKeysBefore,
    foreignKeyViolationsAfter: foreignKeysAfter,
  },
  evidence,
  sourceProposals: {
    ravenrock: {
      ...artifact(ravenProposalPath),
      expected: 41,
    },
    mainstreet: {
      ...artifact(mainstreetReportPath),
      expected: 10,
    },
  },
  scans,
  verification: {
    readOnly: true,
    expectedRows: EXPECTED_FEATURES,
    actualRows: verifiedRows.length,
    missingExternalIds: missingIds,
    parentFailures: parentFailures.map(({ external_id: externalId }) => externalId),
    evidenceFailures: evidenceFailures.map(({ external_id: externalId }) => externalId),
    projectCounts: projectVerification,
    scans: verifiedScans.length,
    observations: verifiedObservations.length,
    integrityCheck: integrityAfter,
    foreignKeyViolations: foreignKeysAfter,
    passed: verificationPassed,
  },
  features: verifiedRows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    externalId: row.external_id,
    parentId: row.parent_id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    source: row.source,
    sourceRef: row.source_ref,
    completionRatio: row.completion_ratio,
    revision: row.revision,
  })),
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: relative(outputPath),
  backup: report.backup,
  database: report.database,
  verification: report.verification,
}, null, 2));
