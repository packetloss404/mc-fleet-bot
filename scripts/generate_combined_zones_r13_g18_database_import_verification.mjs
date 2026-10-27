#!/usr/bin/env node
/** Build the exact terminal feature import fixture and verify a database read-only. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:30:00Z');
const SHOT_PLAN = value(
  '--shot-plan',
  'data/world-review/combined-zones-r13-g18-terminal-media-shot-plan-current/terminal-media-shot-plan.json',
);
const TERMINAL = value(
  '--terminal-post-acceptance',
  'data/world-review/combined-zones-r13-mvp-publication/terminal-post-acceptance.json',
);
const DATABASE = value('--database', 'data/world-map.db');
const FIXTURE_OUT = value(
  '--fixture-out',
  'data/world-review/combined-zones-r13-g18-terminal-evidence-current/database-import-fixture.json',
);
const FIXTURE_BINDING_PATH = value('--fixture-binding-path', FIXTURE_OUT);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r13-g18-terminal-evidence-current/database-import-verification.json',
);
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;
const stableHash = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const maybeBinding = (filename) => fs.existsSync(absolute(filename))
  ? { ...binding(filename), exists: true }
  : { path: relative(filename), sha256: null, bytes: null, exists: false };
const canonicalRecord = (record) => ({
  projectId: record.projectId,
  externalId: record.externalId,
  world: record.world,
  name: record.name,
  kind: record.kind,
  status: record.status,
  geometry: record.geometry,
  source: record.source,
  sourceRef: record.sourceRef,
  tags: [...record.tags].sort(),
  attributes: record.attributes,
});
const canonicalRowsHash = (records) => stableHash(
  records.map(canonicalRecord).sort((left, right) => left.externalId.localeCompare(right.externalId)),
);

const shotPlan = readJson(SHOT_PLAN);
const terminal = fs.existsSync(absolute(TERMINAL)) ? readJson(TERMINAL) : null;
const shotPlanBinding = binding(SHOT_PLAN);
const terminalBinding = maybeBinding(TERMINAL);
if (shotPlan.id !== 'combined-zones-r13-g18-terminal-media-shot-plan-v1'
  || !Array.isArray(shotPlan.shots) || shotPlan.shots.length !== 11) {
  throw new Error('G18 database import verification rejected: shot-plan schema or census drifted');
}
const terminalCompleteSaveSha256 = terminal?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  ? terminal.terminalCompleteSaveSha256 ?? null : null;
const terminalAccepted = /^[a-f0-9]{64}$/.test(terminalCompleteSaveSha256 ?? '');
const shotPlanBound = terminalAccepted
  && shotPlan.terminalPostBinding?.acceptance?.sha256 === terminalBinding.sha256
  && shotPlan.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256;
const sourceRecords = shotPlan.shots.map((shot) => canonicalRecord({
  projectId: 'combined-zones-phase1',
  externalId: shot.featureId,
  world: 'world',
  name: shot.purpose,
  kind: 'terminal_media_feature',
  status: 'complete',
  geometry: { type: 'point', ...shot.target },
  source: 'combined-zones-r13-g18-terminal-post',
  sourceRef: shot.expectedRaster.path,
  tags: ['combined-zones', 'r13', 'g18', shot.coverageGroup.toLowerCase()],
  attributes: {
    shotId: shot.id,
    coverageGroup: shot.coverageGroup,
    camera: shot.camera,
    target: shot.target,
    expectedRasterFilename: shot.expectedRaster.filename,
    terminalCompleteSaveSha256,
  },
})).sort((left, right) => left.externalId.localeCompare(right.externalId));
const sourceRecordSetSha256 = canonicalRowsHash(sourceRecords);
const fixtureWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-world-feature-import-fixture-v1',
  generatedAtUtc: GENERATED_AT,
  status: terminalAccepted && shotPlanBound
    ? 'READY_R13_G18_TERMINAL_DATABASE_IMPORT_FIXTURE'
    : 'WAITING_R13_G18_TERMINAL_DATABASE_IMPORT_FIXTURE',
  terminalCompleteSaveSha256,
  terminalAcceptance: terminalBinding,
  shotPlan: { ...shotPlanBinding, shotPlanPayloadSha256: shotPlan.shotPlanPayloadSha256 },
  targetTable: 'world_features',
  importMode: 'UPSERT_EXACT_PROJECT_EXTERNAL_ID_WITH_SEPARATE_POST_IMPORT_VERIFICATION',
  projectId: 'combined-zones-phase1',
  recordCount: sourceRecords.length,
  sourceRecordSetSha256,
  records: sourceRecords,
  authorityBoundary: {
    fixtureIsInputNotProofOfImport: true,
    importPerformed: false,
    databaseWritten: false,
    externalPublicationPerformed: false,
  },
};
const fixturePayloadSha256 = stableHash(fixtureWithoutIdentity);
const fixture = { ...fixtureWithoutIdentity, fixturePayloadSha256 };
const fixtureBytes = Buffer.from(serialize(fixture));
const fixtureBinding = {
  path: relative(FIXTURE_BINDING_PATH),
  sha256: sha256(fixtureBytes),
  bytes: fixtureBytes.length,
};

let importedRecords = [];
let databaseReadable = false;
let tablePresent = false;
let databaseError = null;
if (fs.existsSync(absolute(DATABASE))) {
  try {
    const database = new Database(absolute(DATABASE), { readonly: true, fileMustExist: true });
    databaseReadable = true;
    tablePresent = Boolean(database.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'world_features'",
    ).get());
    if (tablePresent) {
      const placeholders = sourceRecords.map(() => '?').join(',');
      const rows = database.prepare(`
        SELECT project_id, external_id, world, name, kind, status, geometry_json,
          source, source_ref, tags_json, attributes_json
        FROM world_features
        WHERE project_id = ? AND external_id IN (${placeholders})
        ORDER BY external_id
      `).all('combined-zones-phase1', ...sourceRecords.map(({ externalId }) => externalId));
      importedRecords = rows.map((row) => canonicalRecord({
        projectId: row.project_id,
        externalId: row.external_id,
        world: row.world,
        name: row.name,
        kind: row.kind,
        status: row.status,
        geometry: JSON.parse(row.geometry_json),
        source: row.source,
        sourceRef: row.source_ref,
        tags: JSON.parse(row.tags_json),
        attributes: JSON.parse(row.attributes_json),
      }));
    }
    database.close();
  } catch (error) {
    databaseError = error.message;
  }
}
const importedById = new Map(importedRecords.map((record) => [record.externalId, record]));
const missingExternalIds = sourceRecords.filter(({ externalId }) => !importedById.has(externalId))
  .map(({ externalId }) => externalId);
const mismatchedExternalIds = sourceRecords.filter((expected) => {
  const observed = importedById.get(expected.externalId);
  return observed && serialize(canonicalRecord(observed)) !== serialize(canonicalRecord(expected));
}).map(({ externalId }) => externalId);
const importedRecordSetSha256 = canonicalRowsHash(importedRecords);
const mismatchCount = missingExternalIds.length + mismatchedExternalIds.length;
const pass = terminalAccepted && shotPlanBound && databaseReadable && tablePresent
  && importedRecords.length === sourceRecords.length && mismatchCount === 0
  && importedRecordSetSha256 === sourceRecordSetSha256;
const waitingReasons = [];
if (!terminalAccepted || !shotPlanBound) waitingReasons.push('Accepted terminal post and regenerated shot-plan binding are not complete.');
if (!databaseReadable || !tablePresent) waitingReasons.push('Target SQLite database or world_features table is unavailable read-only.');
if (mismatchCount) waitingReasons.push(`${mismatchCount} terminal feature records are missing or mismatched.`);
const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-database-import-verification-v1',
  generatedAtUtc: GENERATED_AT,
  status: pass
    ? 'PASS_R13_G18_DATABASE_IMPORT_VERIFICATION'
    : 'WAITING_R13_G18_DATABASE_IMPORT_VERIFICATION',
  summary: { passed: pass },
  terminalCompleteSaveSha256,
  terminalAcceptance: terminalBinding,
  shotPlan: shotPlanBinding,
  importFixture: fixtureBinding,
  databaseArtifact: maybeBinding(DATABASE),
  databaseReadOnlyOpen: databaseReadable,
  targetTablePresent: tablePresent,
  importedRecordCount: importedRecords.length,
  verifiedRecordCount: pass ? importedRecords.length : importedRecords.length - mismatchedExternalIds.length,
  mismatchCount,
  missingExternalIds,
  mismatchedExternalIds,
  sourceRecordSetSha256,
  importedRecordSetSha256,
  databaseError,
  waitingReasons,
  safetyBoundary: {
    readOnlyVerification: true,
    databaseWrittenOrImported: false,
    fixtureGenerated: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    externalPublicationPerformed: false,
  },
};
const verificationPayloadSha256 = stableHash(reportWithoutIdentity);
const report = { ...reportWithoutIdentity, verificationPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(FIXTURE_OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(FIXTURE_OUT), fixtureBytes);
fs.writeFileSync(absolute(OUT), serialize(report));
process.stdout.write(`${JSON.stringify({
  status: report.status,
  fixture: relative(FIXTURE_OUT),
  out: relative(OUT),
  fixturePayloadSha256,
  verificationPayloadSha256,
  importedRecordCount: importedRecords.length,
  expectedRecordCount: sourceRecords.length,
  databaseWrittenOrImported: false,
}, null, 2)}\n`);
