#!/usr/bin/env node
/**
 * Promote accepted redevelopment package features into world-map.db.
 *
 * This importer refuses to run unless the supplied post-release QA is passing
 * and its snapshot hash matches the immutable region directory byte-for-byte.
 * Feature definitions come from each guarded package's machine report.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');
const PACKAGE_ID_ALIASES = new Map([
  ['westlight-infinity-screen-2026-07-27', 'VEN-WL-01'],
]);
const EXPECTED_PACKAGE_IDS = new Set([
  'VEN-WL-01',
  'INF-RR-01',
  'mainstreet-america-redevelopment-r4-r5',
  'mainstreet-bunker-surface-phase1-2026-07-27',
  'mainstreet-bunker-recessed-portal-phase2-2026-07-27',
]);
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const values = (flag) => args.flatMap((entry, index) => (
  entry === flag && args[index + 1] ? [args[index + 1]] : []
));
const dbPath = path.resolve(ROOT, value('--db', 'data/world-map.db'));
const regions = path.resolve(ROOT, value('--regions', ''));
const qaPath = path.resolve(ROOT, value('--qa', ''));
const outputPath = path.resolve(
  ROOT,
  value('--out', 'data/world-review/redevelopment-release-database-import-2026-07-27.json'),
);
const defaultDesigns = [
  'data/buildops/westlight-infinity-screen-2026-07-27.report.json',
  'data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json',
  'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
  'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.report.json',
  'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.report.json',
];
const designPaths = (values('--design').length > 0 ? values('--design') : defaultDesigns)
  .map((filename) => path.resolve(ROOT, filename));

if (!value('--regions', '')) throw new Error('--regions is required');
if (!value('--qa', '')) throw new Error('--qa is required');
if (!fs.existsSync(dbPath)) throw new Error(`database not found: ${dbPath}`);
if (!fs.existsSync(regions)) throw new Error(`regions not found: ${regions}`);
if (!fs.existsSync(qaPath)) throw new Error(`QA report not found: ${qaPath}`);
if (designPaths.length === 0) throw new Error('no package design reports supplied');
for (const designPath of designPaths) {
  if (!fs.existsSync(designPath)) {
    throw new Error(`package design report not found: ${designPath}`);
  }
}

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const filename of files) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), regionFileCount: files.length };
}

function averageQuality(quality) {
  const operational = ['functional', 'walkability', 'legibility', 'sightline', 'concealment']
    .map((key) => quality?.[key]?.score)
    .filter(Number.isFinite);
  if (operational.length === 0) return null;
  return Math.round(operational.reduce((sum, score) => sum + score, 0) / operational.length);
}

function fileSha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
if (qa.passed !== true || qa.status !== 'PASS') {
  throw new Error('post-release QA is not a PASS');
}
if (
  qa.schemaVersion !== 1
  || !qa.packages
  || !Array.isArray(qa.packageDetails)
  || !qa.featureQuality
  || !qa.featureMedia
) {
  throw new Error('post-release QA does not match atomic release schema version 1');
}
const requiredQaChecks = [
  'packages',
  'atomicTransaction',
  'crossPackageTargetSeparation',
  'uniqueDatabaseFeatureIds',
  'liveEntityGate',
  'liveEntityGateTiming',
  'routeQa',
  'snapshotChanged',
  'postSnapshotComplete',
];
if (requiredQaChecks.some((check) => qa.checks?.[check] !== true)) {
  throw new Error('post-release QA is missing a required passing atomic gate');
}
const snapshot = snapshotHash(regions);
if (qa.postSnapshot?.sha256 !== snapshot.sha256) {
  throw new Error(
    `post-release snapshot mismatch: QA=${qa.postSnapshot?.sha256} actual=${snapshot.sha256}`,
  );
}
if (qa.postSnapshot?.regionFileCount !== snapshot.regionFileCount) {
  throw new Error('post-release snapshot region-file count does not match QA');
}

const featureDefinitions = [];
const designPackageIds = new Set();
const externalFeatureIds = new Set();
for (const designPath of designPaths) {
  const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
  const rawPackageId = design.packageId ?? design.id ?? null;
  const packageId = PACKAGE_ID_ALIASES.get(rawPackageId) ?? rawPackageId;
  if (!packageId || designPackageIds.has(packageId)) {
    throw new Error(`missing or duplicate package ID in ${designPath}: ${packageId}`);
  }
  designPackageIds.add(packageId);
  const relativeDesignPath = path.relative(ROOT, designPath);
  const designSha256 = fileSha256(designPath);
  const qaPackage = qa.packages[packageId];
  const qaDetail = qa.packageDetails.find(
    (detail) => detail.packageId === packageId,
  );
  if (
    qaPackage?.status !== 'PASS'
    || qaDetail?.passed !== true
    || qaDetail.design !== relativeDesignPath
    || qaDetail.designSha256 !== designSha256
    || qaPackage.designSha256 !== designSha256
    || qaPackage.operationSha256 !== qaDetail.forward?.sha256
    || Object.values(qaDetail.checks ?? {}).some((passed) => passed !== true)
  ) {
    throw new Error(`QA package binding failed for ${packageId}`);
  }
  for (const definition of design.databaseFeatures ?? []) {
    if (
      typeof definition.externalId !== 'string'
      || definition.externalId.trim() === ''
      || externalFeatureIds.has(definition.externalId)
    ) {
      throw new Error(
        `missing or duplicate feature ID in ${relativeDesignPath}: `
        + `${definition.projectId}/${definition.externalId}`,
      );
    }
    externalFeatureIds.add(definition.externalId);
    const quality = qa.featureQuality[definition.externalId];
    const media = qa.featureMedia[definition.externalId];
    if (
      !quality
      || averageQuality(quality) == null
      || !media
      || media.packageId !== packageId
      || !Array.isArray(media.screenshots)
      || media.screenshots.length === 0
    ) {
      throw new Error(
        `QA feature evidence missing for ${packageId}/${definition.externalId}`,
      );
    }
    if (
      definition.attributes?.packageId
      && definition.attributes.packageId !== packageId
    ) {
      throw new Error(
        `feature package ID mismatch for ${definition.externalId}: `
        + `${definition.attributes.packageId} != ${packageId}`,
      );
    }
    for (const screenshot of media.screenshots) {
      const screenshotPath = path.resolve(ROOT, screenshot);
      if (
        !fs.existsSync(screenshotPath)
        || fs.statSync(screenshotPath).size <= 8_000
      ) {
        throw new Error(
          `missing or undersized QA screenshot for ${definition.externalId}: `
          + screenshot,
        );
      }
    }
    featureDefinitions.push({
      ...definition,
      designReport: relativeDesignPath,
      designSha256,
      packageId,
    });
  }
}
if (featureDefinitions.length === 0) {
  throw new Error('package reports contain no databaseFeatures definitions');
}
if (
  designPackageIds.size !== EXPECTED_PACKAGE_IDS.size
  || [...EXPECTED_PACKAGE_IDS].some((packageId) => !designPackageIds.has(packageId))
  || Object.keys(qa.packages).length !== EXPECTED_PACKAGE_IDS.size
  || [...EXPECTED_PACKAGE_IDS].some((packageId) => !qa.packages[packageId])
) {
  throw new Error('design reports and QA do not contain the exact five-package release set');
}

const store = new WorldFeatureStore(dbPath);
const imported = [];
const scans = [];
try {
  // WorldFeatureStore's public operations are individually transactional. The
  // release promotion must be all-or-nothing across features, scans, and
  // observations, so compose them in one outer better-sqlite3 transaction.
  const importTransaction = store.sqlite.transaction(() => {
  const projects = [...new Set(featureDefinitions.map(({ projectId }) => projectId))];
  const featuresByProject = new Map();
  for (const projectId of projects) {
    const features = store.listFeatures({ projectId, limit: 1_000 });
    featuresByProject.set(
      projectId,
      new Map(features.filter(({ externalId }) => externalId).map((feature) => [
        feature.externalId,
        feature,
      ])),
    );
  }

  const pendingDefinitions = [...featureDefinitions];
  const orderedFeatureDefinitions = [];
  const scheduledParents = new Set();
  while (pendingDefinitions.length > 0) {
    let progressed = false;
    for (let index = pendingDefinitions.length - 1; index >= 0; index -= 1) {
      const definition = pendingDefinitions[index];
      const projectFeatures = featuresByProject.get(definition.projectId);
      const parentKey = definition.parentExternalId
        ? `${definition.projectId}\u0000${definition.parentExternalId}`
        : null;
      if (
        parentKey
        && !projectFeatures.has(definition.parentExternalId)
        && !scheduledParents.has(parentKey)
      ) {
        continue;
      }
      orderedFeatureDefinitions.push(definition);
      scheduledParents.add(
        `${definition.projectId}\u0000${definition.externalId}`,
      );
      pendingDefinitions.splice(index, 1);
      progressed = true;
    }
    if (!progressed) {
      throw new Error(
        'unresolved or cyclic feature parents: '
        + pendingDefinitions.map((definition) => (
          `${definition.projectId}/${definition.externalId}`
          + ` -> ${definition.parentExternalId}`
        )).join(', '),
      );
    }
  }

  for (const definition of orderedFeatureDefinitions) {
    const projectFeatures = featuresByProject.get(definition.projectId);
    const prior = projectFeatures.get(definition.externalId);
    const parent = definition.parentExternalId
      ? projectFeatures.get(definition.parentExternalId)
      : null;
    if (definition.parentExternalId && !parent) {
      throw new Error(
        `missing parent ${definition.projectId}/${definition.parentExternalId} `
        + `for ${definition.externalId}`,
      );
    }
    const quality = qa.featureQuality?.[definition.externalId]
      ?? definition.attributes?.quality
      ?? definition.quality
      ?? {};
    const conditionScore = averageQuality(quality);
    const attributes = {
      ...(prior?.attributes ?? {}),
      ...(definition.attributes ?? {}),
      featureClass: definition.featureClass
        ?? definition.attributes?.featureClass
        ?? prior?.attributes?.featureClass
        ?? null,
      quality,
      screenshots: qa.featureMedia?.[definition.externalId]?.screenshots ?? [],
      redevelopmentRelease: {
        packageId: definition.packageId,
        designReport: definition.designReport,
        qaReport: path.relative(ROOT, qaPath),
        preSnapshot: qa.preSnapshot,
        postSnapshot: qa.postSnapshot,
        execution: qa.packages?.[definition.packageId] ?? null,
        media: qa.featureMedia?.[definition.externalId] ?? {},
      },
    };
    const feature = store.upsertFeature({
      projectId: definition.projectId,
      externalId: definition.externalId,
      parentId: parent?.id ?? prior?.parentId ?? null,
      world: definition.world ?? 'world',
      name: definition.name,
      kind: definition.kind,
      status: 'complete',
      geometry: definition.geometry,
      source: 'rcon',
      sourceRef: definition.designReport,
      confidence: 1,
      completionRatio: 1,
      conditionScore,
      tags: [...new Set([
        ...(prior?.tags ?? []),
        ...(definition.tags ?? []),
        'redevelopment-2026-07-27',
        'as-built',
        'post-release-qa',
      ].filter((tag) => tag !== 'not-live-executed'))],
      attributes,
      observedAt: Date.now(),
    });
    projectFeatures.set(definition.externalId, feature);
    imported.push({
      id: feature.id,
      projectId: feature.projectId,
      externalId: feature.externalId,
      parentId: feature.parentId,
      kind: feature.kind,
      conditionScore: feature.conditionScore,
      created: !prior,
      revision: feature.revision,
    });
  }

  for (const projectId of projects) {
    const scan = store.createScan({
      projectId,
      world: 'world',
      method: 'region_snapshot',
      observer: 'codex-redevelopment-release',
      snapshotRef: `${path.relative(ROOT, regions)}:sha256=${snapshot.sha256}`,
      summary: {
        packageRelease: '2026-07-27',
        qaReport: path.relative(ROOT, qaPath),
        featureCount: imported.filter((feature) => feature.projectId === projectId).length,
      },
    });
    let observationCount = 0;
    for (const importedFeature of imported.filter((feature) => feature.projectId === projectId)) {
      const feature = store.getFeature(importedFeature.id);
      store.recordObservation({
        scanId: scan.id,
        featureId: feature.id,
        status: 'complete',
        completionRatio: 1,
        conditionScore: feature.conditionScore,
        details: {
          qaReport: path.relative(ROOT, qaPath),
          postSnapshot: qa.postSnapshot,
          quality: feature.attributes.quality,
        },
      });
      observationCount += 1;
    }
    const completed = store.completeScan(scan.id, {
      summary: { ...scan.summary, observationCount, completed: true },
    });
    scans.push({
      id: completed.id,
      projectId,
      status: completed.status,
      observations: observationCount,
    });
  }
  });
  importTransaction();
} finally {
  store.close();
}

const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  dbPath: path.relative(ROOT, dbPath),
  qaReport: path.relative(ROOT, qaPath),
  designs: designPaths.map((filename) => path.relative(ROOT, filename)),
  postSnapshot: {
    directory: path.relative(ROOT, regions),
    ...snapshot,
  },
  features: imported,
  scans,
  totals: {
    designs: designPaths.length,
    features: imported.length,
    created: imported.filter(({ created }) => created).length,
    updated: imported.filter(({ created }) => !created).length,
    scans: scans.length,
    observations: scans.reduce((sum, scan) => sum + scan.observations, 0),
  },
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
