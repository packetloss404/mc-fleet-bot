#!/usr/bin/env node
/**
 * Read-only Town Expansion R1 database publication report.
 *
 * This reports the exact registry-to-feature-to-scan-to-observation-to-media
 * closure. It does not create tables, checkpoint WAL, or mutate a database.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_ID = 'town-expansion-r1-2026-07-28';
const PROJECT_ID = 'town-expansion-r1';

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function relativeRoot(filename) {
  const relative = path.relative(ROOT, filename);
  return (relative.startsWith('..') ? path.resolve(filename) : relative)
    .split(path.sep)
    .join('/');
}

function parseJson(value, fallback) {
  try {
    return value == null || value === '' ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
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

function groupCount(values) {
  const counts = {};
  for (const value of values) {
    const key = value == null || value === '' ? '<missing>' : String(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)));
}

export function generateTownExpansionDatabaseReport({
  databasePath,
  registryPath,
}) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  if (
    registry.schemaVersion !== 2
    || registry.id !== 'town-expansion-r1-object-media-database-crosswalk'
    || registry.packageId !== PACKAGE_ID
    || !Array.isArray(registry.objects)
    || registry.objects.length === 0
  ) {
    throw new Error('registry is not the canonical Town Expansion R1 crosswalk');
  }
  const expectedIds = registry.objects.map((object) => object.objectId);
  if (new Set(expectedIds).size !== expectedIds.length) {
    throw new Error('registry object IDs are not unique');
  }
  const expectedById = new Map(registry.objects.map((object) => [object.objectId, object]));
  const registrySha256 = sha256File(registryPath);
  const database = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const integrity = database.pragma('integrity_check', { simple: true });
    const foreignKeys = database.pragma('foreign_key_check');
    const rows = database.prepare(`
      SELECT id, project_id, external_id, parent_id, name, kind, status,
             completion_ratio, geometry_json, tags_json, attributes_json,
             revision, observed_at
      FROM world_features
      WHERE project_id = ?
      ORDER BY external_id, id
    `).all(PROJECT_ID);
    const rowsById = new Map(rows.map((row) => [row.external_id, row]));
    const missing = expectedIds.filter((externalId) => !rowsById.has(externalId));
    const extras = rows
      .filter((row) => !expectedById.has(row.external_id))
      .map((row) => row.external_id);
    const truthFailures = [];
    const evidenceFailures = [];
    const mediaFailures = [];
    const parentFailures = [];
    const requestedStates = [];
    const acceptedStates = [];
    const databaseStates = [];
    const dispositions = [];
    const releaseByObject = new Map();
    let mediaRelations = 0;
    const projectParentLookup = database.prepare(`
      SELECT id
      FROM world_features
      WHERE project_id = ? AND external_id = ?
      ORDER BY id
    `);
    const externalParentLookup = database.prepare(`
      SELECT id
      FROM world_features
      WHERE external_id = ?
      ORDER BY project_id, id
    `);

    for (const object of registry.objects) {
      const row = rowsById.get(object.objectId);
      if (!row) continue;
      const attributes = parseJson(row.attributes_json, {});
      const truth = attributes.requestedVsAsBuilt ?? {};
      const release = attributes.townExpansionRelease ?? {};
      releaseByObject.set(object.objectId, release);
      const media = Array.isArray(attributes.media) ? attributes.media : [];
      requestedStates.push(truth.requestedState);
      acceptedStates.push(truth.acceptedState);
      databaseStates.push(truth.databaseState);
      dispositions.push(truth.importDisposition);
      if (
        row.status !== 'complete'
        || row.completion_ratio !== 1
        || truth.acceptedState !== 'VERIFIED_POST_STATE'
        || truth.databaseState !== 'DATABASE_IMPORTED'
        || truth.broaderRequestedProgramImpliedComplete !== false
        || truth.plannedOnly !== false
        || !truth.physicalClaim
      ) {
        truthFailures.push(object.objectId);
      }
      if (
        release.registry?.sha256 !== registrySha256
        || !release.postSnapshot?.sha256
        || !release.postReleaseQa?.sha256
        || !release.transaction?.sha256
        || !release.mediaReport?.sha256
      ) {
        evidenceFailures.push(object.objectId);
      }
      const expectedCaptureIds = (object.capturePairs ?? []).flatMap((pair) => [
        pair.pass1CameraId,
        pair.pass2CameraId,
      ]).sort();
      const actualCaptureIds = media.map((entry) => entry.cameraId).sort();
      const invalidMedia = media.some((entry) => {
        const filename = entry.path
          ? (path.isAbsolute(entry.path) ? entry.path : path.resolve(ROOT, entry.path))
          : null;
        return !entry.mediaId
          || !entry.cameraId
          || !entry.shotId
          || ![1, 2].includes(entry.evidencePass)
          || !entry.viewClass
          || !filename
          || !fs.existsSync(filename)
          || fs.statSync(filename).size <= 1_000
          || (entry.bytes != null && entry.bytes !== fs.statSync(filename).size)
          || !Number.isSafeInteger(entry.width)
          || !Number.isSafeInteger(entry.height)
          || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')
          || entry.sha256 !== sha256File(filename);
      });
      if (
        invalidMedia
        || JSON.stringify(expectedCaptureIds) !== JSON.stringify(actualCaptureIds)
      ) {
        mediaFailures.push(object.objectId);
      }
      mediaRelations += media.length;
      const parentExternalId = object.attributes?.parentExternalId ?? null;
      if (parentExternalId) {
        const parent = expectedById.has(parentExternalId)
          ? projectParentLookup.all(PROJECT_ID, parentExternalId)
          : externalParentLookup.all(parentExternalId);
        if (
          parent.length !== 1
          || row.parent_id !== parent[0].id
        ) {
          parentFailures.push(object.objectId);
        }
      }
    }

    const scans = database.prepare(`
      SELECT id, status, snapshot_ref, summary_json, started_at, completed_at
      FROM world_scans
      WHERE project_id = ?
      ORDER BY completed_at DESC, id
    `).all(PROJECT_ID).map((scan) => ({
      ...scan,
      summary: parseJson(scan.summary_json, {}),
    }));
    const acceptedScans = scans.filter((scan) =>
      scan.status === 'complete' && scan.summary?.packageId === PACKAGE_ID);
    const acceptedScan = acceptedScans[0] ?? null;
    const evidence = {
      postSnapshotSha256: acceptedScan?.summary?.postSnapshot?.sha256 ?? null,
      forwardSha256: acceptedScan?.summary?.forwardPackage?.sha256 ?? null,
      crosswalkSha256: acceptedScan?.summary?.registry?.sha256 ?? null,
      mediaQaSha256: acceptedScan?.summary?.mediaReport?.sha256 ?? null,
      postReleaseQaSha256: acceptedScan?.summary?.postReleaseQa?.sha256 ?? null,
      transactionSha256: acceptedScan?.summary?.transaction?.sha256 ?? null,
    };
    for (const object of registry.objects) {
      const release = releaseByObject.get(object.objectId);
      if (!release) continue;
      if (
        evidence.crosswalkSha256 !== registrySha256
        || release.postSnapshot?.sha256 !== evidence.postSnapshotSha256
        || release.forwardPackage?.sha256 !== evidence.forwardSha256
        || release.registry?.sha256 !== evidence.crosswalkSha256
        || release.mediaReport?.sha256 !== evidence.mediaQaSha256
        || release.postReleaseQa?.sha256 !== evidence.postReleaseQaSha256
        || release.transaction?.sha256 !== evidence.transactionSha256
      ) {
        evidenceFailures.push(object.objectId);
      }
    }
    const observations = acceptedScan
      ? database.prepare(`
          SELECT o.id, o.feature_id, o.status, o.completion_ratio,
                 o.details_json, f.external_id
          FROM feature_observations o
          JOIN world_features f ON f.id = o.feature_id
          WHERE o.scan_id = ?
          ORDER BY f.external_id
        `).all(acceptedScan.id)
      : [];
    const observationFailures = observations.filter((observation) => {
      const details = parseJson(observation.details_json, {});
      return observation.status !== 'complete'
        || observation.completion_ratio !== 1
        || !expectedById.has(observation.external_id)
        || details.registrySha256 !== registrySha256
        || details.postSnapshotSha256 !== evidence.postSnapshotSha256
        || details.qaSha256 !== evidence.postReleaseQaSha256
        || details.transactionSha256 !== evidence.transactionSha256
        || details.mediaReportSha256 !== evidence.mediaQaSha256;
    }).map((observation) => observation.external_id);
    const observationIds = new Set(observations.map((entry) => entry.external_id));
    const missingObservations = expectedIds.filter((externalId) =>
      !observationIds.has(externalId));

    const failures = {
      missingFeatures: missing,
      extraProjectFeatures: extras,
      truthFailures,
      evidenceFailures: [...new Set(evidenceFailures)].sort(),
      mediaFailures,
      parentFailures,
      acceptedScanCount: acceptedScans.length,
      missingObservations,
      observationFailures,
      databaseIntegrity: integrity === 'ok' ? [] : [integrity],
      foreignKeyViolations: foreignKeys,
    };
    const passed = Object.values(failures).every((value) =>
      typeof value === 'number' ? value === 1 : Array.isArray(value) && value.length === 0);
    return {
      schemaVersion: 1,
      id: 'town-expansion-r1-database-publication-report',
      generatedAtUtc: new Date().toISOString(),
      status: passed ? 'PASS' : 'FAIL',
      passed,
      readOnly: true,
      databaseMutated: false,
      database: {
        path: relativeRoot(databasePath),
        sha256: sha256File(databasePath),
        integrity,
        foreignKeyViolations: foreignKeys,
        counts: tableCounts(database),
      },
      evidence,
      registry: {
        path: relativeRoot(registryPath),
        sha256: registrySha256,
        exactObjects: expectedIds.length,
        expectedMediaRelations: registry.objects.reduce(
          (sum, object) => sum + (object.capturePairs?.length ?? 0) * 2,
          0,
        ),
      },
      publication: {
        projectId: PROJECT_ID,
        features: rows.length,
        acceptedScans: acceptedScans.length,
        observations: observations.length,
        mediaRelations,
        requestedStates: groupCount(requestedStates),
        acceptedStates: groupCount(acceptedStates),
        databaseStates: groupCount(databaseStates),
        importDispositions: groupCount(dispositions),
      },
      acceptedScan: acceptedScan
        ? {
            id: acceptedScan.id,
            status: acceptedScan.status,
            snapshotRef: acceptedScan.snapshot_ref,
            startedAt: acceptedScan.started_at,
            completedAt: acceptedScan.completed_at,
          }
        : null,
      failures,
    };
  } finally {
    database.close();
  }
}

function valueAfter(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function main() {
  const databasePath = path.resolve(
    ROOT,
    valueAfter(process.argv.slice(2), '--database', 'data/world-map.db'),
  );
  const registryPath = path.resolve(
    ROOT,
    valueAfter(
      process.argv.slice(2),
      '--registry',
      'data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json',
    ),
  );
  const output = valueAfter(process.argv.slice(2), '--out', null);
  const report = generateTownExpansionDatabaseReport({
    databasePath,
    registryPath,
  });
  if (output) {
    const outputPath = path.resolve(ROOT, output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
