#!/usr/bin/env node
/**
 * Generate a read-only inventory of the durable world/town databases and link
 * database objects to maps and screenshots already present in the workspace.
 *
 * This script opens SQLite in read-only mode and reads copied Anvil snapshot
 * files only. It never connects to Minecraft, RCON, systemd, or the fleet API.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const values = (flag) => args.flatMap((entry, index) => (
  entry === flag && args[index + 1] ? [args[index + 1]] : []
));

const root = process.cwd();
const outputDirectory = path.resolve(
  root,
  value('--out', 'data/exports/world-catalog-2026-07-27'),
);
const snapshotDirectory = path.resolve(
  root,
  value('--snapshot', 'data/worldsnap/region'),
);
const surfaceAtlasDirectory = path.resolve(
  root,
  value(
    '--surface-atlas',
    'data/exports/box/redevelopment-atlas-2026-07-27/team-a',
  ),
);
const floorplanDirectory = path.join(outputDirectory, 'floorplans');
const screenshotDirectory = path.join(outputDirectory, 'screenshots');
const generatedAt = new Date().toISOString();

fs.mkdirSync(outputDirectory, { recursive: true });

function relative(filename) {
  return path.relative(root, filename).split(path.sep).join('/');
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function hashSnapshot(directory) {
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  const members = files.map((filename) => {
    const fullPath = path.join(directory, filename);
    const buffer = fs.readFileSync(fullPath);
    const stat = fs.statSync(fullPath);
    hash.update(filename);
    hash.update('\0');
    hash.update(buffer);
    hash.update('\0');
    return {
      file: relative(fullPath),
      bytes: buffer.length,
      modifiedAt: stat.mtime.toISOString(),
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
  });
  return {
    directory: relative(directory),
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: hash.digest('hex'),
    regionFiles: members.length,
    bytes: members.reduce((sum, member) => sum + member.bytes, 0),
    newestRegionModifiedAt: members
      .map((member) => member.modifiedAt)
      .sort()
      .at(-1) ?? null,
    members,
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function tableCounts(database) {
  const tables = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
  `).all();
  return Object.fromEntries(tables.map(({ name }) => [
    name,
    database.prepare(`SELECT COUNT(*) AS count FROM "${name.replaceAll('"', '""')}"`)
      .get().count,
  ]));
}

function databaseSchema(database) {
  return database.prepare(`
    SELECT name, type, sql
    FROM sqlite_master
    WHERE type IN ('table', 'view')
    ORDER BY type, name
  `).all();
}

function grouped(database, column, table = 'world_features') {
  return database.prepare(`
    SELECT "${column}" AS value, COUNT(*) AS count
    FROM "${table}"
    GROUP BY "${column}"
    ORDER BY "${column}"
  `).all();
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(fullPath));
    else output.push(fullPath);
  }
  return output;
}

function pngDimensions(filename) {
  if (path.extname(filename).toLowerCase() !== '.png') return null;
  const buffer = fs.readFileSync(filename);
  if (
    buffer.length < 24
    || buffer.toString('ascii', 1, 4) !== 'PNG'
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function mediaMetadata(filename) {
  const stat = fs.statSync(filename);
  return {
    path: relative(filename),
    bytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sha256: sha256File(filename),
    dimensions: pngDimensions(filename),
  };
}

function slug(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function writeJson(filename, valueToWrite) {
  fs.writeFileSync(filename, `${JSON.stringify(valueToWrite, null, 2)}\n`);
}

function screenshotReferences(valueToInspect, trail = []) {
  const output = [];
  if (Array.isArray(valueToInspect)) {
    valueToInspect.forEach((item, index) => {
      output.push(...screenshotReferences(item, [...trail, String(index)]));
    });
    return output;
  }
  if (!valueToInspect || typeof valueToInspect !== 'object') return output;
  for (const [key, child] of Object.entries(valueToInspect)) {
    const nextTrail = [...trail, key];
    if (
      typeof child === 'string'
      && /(screenshot|image|photo)/i.test(key)
      && /\.(png|jpe?g|webp)$/i.test(child)
    ) {
      output.push({ path: child, attributePath: nextTrail.join('.') });
    } else if (
      Array.isArray(child)
      && /(screenshot|image|photo)/i.test(key)
    ) {
      for (const item of child) {
        if (typeof item === 'string' && /\.(png|jpe?g|webp)$/i.test(item)) {
          output.push({ path: item, attributePath: nextTrail.join('.') });
        }
      }
    } else {
      output.push(...screenshotReferences(child, nextTrail));
    }
  }
  return output;
}

const snapshot = hashSnapshot(snapshotDirectory);
const floorplanManifestPath = path.join(
  floorplanDirectory,
  'atlas-manifest.json',
);
const floorplanManifest = fs.existsSync(floorplanManifestPath)
  ? parseJson(fs.readFileSync(floorplanManifestPath, 'utf8'), {})
  : {};
const surfaceManifestPath = path.join(
  surfaceAtlasDirectory,
  'atlas-manifest.json',
);
const surfaceManifest = fs.existsSync(surfaceManifestPath)
  ? parseJson(fs.readFileSync(surfaceManifestPath, 'utf8'), {})
  : {};
const secureAtlasDirectory = path.join(
  root,
  'data/exports/box/mainstreet-secure-complex-wave5-2026-07-27',
);
const secureAtlasManifestPath = path.join(secureAtlasDirectory, 'manifest.json');
const secureAtlasManifest = fs.existsSync(secureAtlasManifestPath)
  ? parseJson(fs.readFileSync(secureAtlasManifestPath, 'utf8'), {})
  : {};
const floorplanSnapshotDescription = floorplanManifest.snapshot?.mode === 'per-artifact'
  ? (
      `${floorplanManifest.snapshot.sourceCount ?? 'multiple'} immutable sources; `
      + 'use artifacts[].sourceSnapshot'
    )
  : (
      floorplanManifest.snapshot?.sha256
        ? `snapshot ${floorplanManifest.snapshot.sha256}`
        : 'an unspecified census snapshot'
    );
const floorplanSupplementDescription = (
  floorplanManifest.supplement?.snapshot?.sha256
    ? (
        `${floorplanManifest.supplement.externalId ?? 'supplement'} at snapshot `
        + `${floorplanManifest.supplement.snapshot.sha256}`
      )
    : (
        secureAtlasManifest.snapshotRef
          ? `the secure-complex supplement at ${secureAtlasManifest.snapshotRef}`
          : 'no separately identified supplement'
      )
);
const worldDbPath = path.join(root, 'data/world-map.db');
const townDbPath = path.join(root, 'data/town.db');
const worldDb = new Database(worldDbPath, {
  readonly: true,
  fileMustExist: true,
});
const townDb = new Database(townDbPath, {
  readonly: true,
  fileMustExist: true,
});

const features = worldDb.prepare(`
  SELECT *
  FROM world_features
  ORDER BY project_id, kind, external_id, name
`).all().map((row) => ({
  id: row.id,
  projectId: row.project_id,
  externalId: row.external_id,
  parentId: row.parent_id,
  world: row.world,
  name: row.name,
  kind: row.kind,
  status: row.status,
  geometry: parseJson(row.geometry_json, null),
  bounds: {
    minX: row.min_x,
    maxX: row.max_x,
    minZ: row.min_z,
    maxZ: row.max_z,
  },
  source: row.source,
  sourceRef: row.source_ref,
  confidence: row.confidence,
  completionRatio: row.completion_ratio,
  conditionScore: row.condition_score,
  tags: parseJson(row.tags_json, []),
  attributes: parseJson(row.attributes_json, {}),
  observedAt: row.observed_at,
  revision: row.revision,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));

const scans = worldDb.prepare(`
  SELECT *
  FROM world_scans
  ORDER BY started_at
`).all().map((row) => ({
  id: row.id,
  projectId: row.project_id,
  world: row.world,
  method: row.method,
  status: row.status,
  bounds: row.bounds_json ? parseJson(row.bounds_json, null) : null,
  observer: row.observer,
  snapshotRef: row.snapshot_ref,
  summary: parseJson(row.summary_json, {}),
  error: row.error,
  startedAt: row.started_at,
  completedAt: row.completed_at,
}));

const observationCountsByScan = worldDb.prepare(`
  SELECT
    scan_id AS scanId,
    COUNT(*) AS observations,
    SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS complete,
    SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) AS partial,
    SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) AS damaged,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
  FROM feature_observations
  GROUP BY scan_id
  ORDER BY scan_id
`).all();

const worldExtent = worldDb.prepare(`
  SELECT
    MIN(min_x) AS minX,
    MAX(max_x) AS maxX,
    MIN(min_z) AS minZ,
    MAX(max_z) AS maxZ
  FROM world_features
`).get();

const persistentJsonFiles = walk(path.join(root, 'data'))
  .filter((filename) => path.extname(filename).toLowerCase() === '.json')
  .filter((filename) => !relative(filename).startsWith('data/exports/'))
  .map((filename) => {
    const stat = fs.statSync(filename);
    return {
      path: relative(filename),
      bytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const report = {
  schemaVersion: 1,
  generatedAt,
  snapshot,
  databases: {
    worldMap: {
      file: relative(worldDbPath),
      bytes: fs.statSync(worldDbPath).size,
      sha256: sha256File(worldDbPath),
      userVersion: worldDb.pragma('user_version', { simple: true }),
      tables: tableCounts(worldDb),
      schema: databaseSchema(worldDb),
      projects: grouped(worldDb, 'project_id'),
      kinds: grouped(worldDb, 'kind'),
      statuses: grouped(worldDb, 'status'),
      sources: grouped(worldDb, 'source'),
      projectKindCounts: worldDb.prepare(`
        SELECT
          project_id AS projectId,
          kind,
          COUNT(*) AS count
        FROM world_features
        GROUP BY project_id, kind
        ORDER BY project_id, kind
      `).all(),
      extent: worldExtent,
      scans,
      observationCountsByScan,
    },
    town: {
      file: relative(townDbPath),
      bytes: fs.statSync(townDbPath).size,
      sha256: sha256File(townDbPath),
      userVersion: townDb.pragma('user_version', { simple: true }),
      tables: tableCounts(townDb),
      schema: databaseSchema(townDb),
      towns: townDb.prepare('SELECT * FROM towns ORDER BY name').all(),
      districts: townDb.prepare('SELECT * FROM districts ORDER BY name').all()
        .map((row) => ({
          ...row,
          bounds_json: parseJson(row.bounds_json, null),
        })),
      buildings: townDb.prepare(`
        SELECT *
        FROM buildings
        ORDER BY town_id, name
      `).all(),
      residents: townDb.prepare(`
        SELECT *
        FROM residents
        ORDER BY town_id, bot_name
      `).all(),
      styleObservations: townDb.prepare(`
        SELECT *
        FROM style_observations
        ORDER BY recorded_at
      `).all().map((row) => ({
        ...row,
        palette_json: parseJson(row.palette_json, null),
      })),
    },
  },
  persistentJsonFiles,
  dataDictionary: {
    worldFeature: {
      id: 'Stable generated database identifier.',
      projectId: 'Top-level authored area or project owning the object.',
      externalId: 'Stable human-authored ID, unique within a project.',
      parentId: 'Optional world_features.id of the containing object.',
      world: 'Minecraft dimension/world identifier.',
      name: 'Human-readable object name.',
      kind: 'Finite object class: property, district, building, room, road, driveway, parking, sidewalk, fence, lighting, landscape, utility, landmark, or custom.',
      status: 'Lifecycle/as-built state.',
      geometry: 'Point, axis-aligned bounds, path, or polygon in world coordinates.',
      bounds: 'Indexed X/Z envelope derived from geometry for spatial queries.',
      source: 'How the record entered the catalog.',
      sourceRef: 'Path or external reference supporting the record.',
      confidence: 'Optional normalized confidence score.',
      completionRatio: 'Optional normalized as-built completion ratio.',
      conditionScore: 'Optional normalized observed condition score.',
      tags: 'Searchable classification labels.',
      attributes: 'Project-specific JSON evidence, program, QA, and provenance.',
      observedAt: 'Epoch-ms time of the latest associated observation.',
      revision: 'Monotonic record revision.',
      createdAt: 'Epoch-ms creation time.',
      updatedAt: 'Epoch-ms last-update time.',
    },
    worldScan: {
      id: 'Stable scan identifier.',
      projectId: 'Project surveyed.',
      method: 'region_snapshot, bot_terrain, rcon, manual, manifest_import, or plugin_event.',
      status: 'running, complete, or failed.',
      bounds: 'Optional surveyed world-coordinate envelope.',
      observer: 'Tool or actor performing the survey.',
      snapshotRef: 'Immutable saved-world reference when applicable.',
      summary: 'Scan-level findings and aggregate QA.',
      startedAt: 'Epoch-ms start time.',
      completedAt: 'Epoch-ms completion time.',
    },
    featureObservation: {
      scanId: 'Owning world scan.',
      featureId: 'Observed world feature.',
      status: 'Observed lifecycle/as-built state.',
      completionRatio: 'Observed normalized completion.',
      conditionScore: 'Observed normalized condition.',
      expectedBlocks: 'Optional expected material/block count.',
      observedBlocks: 'Optional measured material/block count.',
      details: 'Method-specific JSON findings.',
      observedAt: 'Epoch-ms observation time.',
    },
  },
  notes: [
    'world-map.db is the cross-project as-built catalog and contains geometry, hierarchy, status, provenance, QA attributes, scans, and observations.',
    'town.db is the Town Builder operational database for governed settlements; it is not a replacement for the cross-project catalog.',
    'The data/ directory also contains JSON-backed operational stores. Their file inventory is included without reproducing logs, embeddings, or token-ledger contents.',
    `The staged building floor-plan atlas uses ${floorplanSnapshotDescription}; ${floorplanSupplementDescription}.`,
    'The catalog snapshot, current surface maps, and new perspective captures retain separate provenance. Do not relabel an inherited floor plan with the catalog snapshot; use the per-artifact source record.',
  ],
};

const allMediaRoots = [
  path.join(root, 'docs/mainstreet-america/qa'),
  path.join(root, 'docs/raven-rock/qa'),
  path.join(root, 'docs/ravensreach/qa'),
  path.join(root, 'data/looks'),
  screenshotDirectory,
  path.join(
    root,
    'data/exports/box/moot-hall-basement-enhancement-2026-07-26/screenshots',
  ),
  ...values('--media-root').map((directory) => path.resolve(root, directory)),
];
const mediaFiles = [...new Set(allMediaRoots.flatMap(walk))]
  .filter((filename) => /\.(png|jpe?g|webp)$/i.test(filename))
  .sort((a, b) => a.localeCompare(b));
const mediaByRelativePath = new Map(mediaFiles.map((filename) => [
  relative(filename),
  mediaMetadata(filename),
]));

const featureByProjectExternalId = new Map(features.map((feature) => [
  `${feature.projectId}:${feature.externalId}`,
  feature,
]));
const featuresByExternalId = new Map();
for (const feature of features) {
  const current = featuresByExternalId.get(feature.externalId) ?? [];
  current.push(feature);
  featuresByExternalId.set(feature.externalId, current);
}
const links = new Map(features.map((feature) => [feature.id, []]));

function addLink(feature, link) {
  if (!feature) return;
  const fullPath = link.path.startsWith('/')
    ? link.path
    : path.resolve(root, link.path);
  const enriched = link.exists && fs.existsSync(fullPath)
    ? { ...link, artifact: mediaMetadata(fullPath) }
    : link;
  const current = links.get(feature.id);
  if (current.some((existing) => (
    existing.path === enriched.path
    && existing.relation === enriched.relation
  ))) return;
  current.push(enriched);
}

const captureReportFiles = [...new Set(allMediaRoots.flatMap(walk))]
  .filter((filename) => (
    filename.endsWith('.json')
    && /capture-report\.json$/i.test(path.basename(filename))
  ));
for (const captureReportPath of captureReportFiles) {
  const captureReport = parseJson(fs.readFileSync(captureReportPath, 'utf8'), {});
  for (const capture of captureReport.captures ?? []) {
    if (!capture.primaryFeatureId || !capture.output) continue;
    const candidates = featuresByExternalId.get(capture.primaryFeatureId) ?? [];
    if (candidates.length !== 1) continue;
    const outputPath = path.resolve(root, capture.output);
    if (!fs.existsSync(outputPath)) continue;
    addLink(candidates[0], {
      path: relative(outputPath),
      type: 'screenshot',
      relation: 'exact_object',
      matchMethod: 'capture-report.primaryFeatureId',
      exists: true,
      sourceSnapshot: captureReport.snapshot ?? null,
      capture: {
        id: capture.id,
        role: capture.role ?? null,
        camera: capture.camera ?? null,
        sourceReport: relative(captureReportPath),
      },
    });
  }
}

for (const feature of features) {
  for (const reference of screenshotReferences(feature.attributes)) {
    const normalized = reference.path.startsWith('/')
      ? reference.path
      : relative(path.resolve(root, reference.path));
    const exists = reference.path.startsWith('/')
      ? fs.existsSync(reference.path)
      : fs.existsSync(path.resolve(root, reference.path));
    addLink(feature, {
      path: normalized,
      type: 'screenshot',
      relation: 'declared_evidence',
      matchMethod: `world_features.attributes.${reference.attributePath}`,
      exists,
    });
  }

  const floorplanPath = path.join(
    floorplanDirectory,
    'structures',
    `${slug(feature.projectId)}-${slug(feature.externalId ?? '')}.png`,
  );
  if (feature.kind === 'building' && fs.existsSync(floorplanPath)) {
    addLink(feature, {
      path: relative(floorplanPath),
      type: 'floorplan',
      relation: 'exact_object',
      matchMethod: 'project_id + external_id',
      exists: true,
      sourceSnapshot: floorplanManifest.snapshot ?? null,
    });
  }
}

const manualScreenshotLinks = {
  'B01-guest-design-center.png': [
    ['mainstreet-america', 'B01', 'exact_object'],
  ],
  'B02-retail-cooking-school.png': [
    ['mainstreet-america', 'B02', 'exact_object'],
  ],
  'B03-service-warehouse.png': [
    ['mainstreet-america', 'B03', 'exact_object'],
  ],
  'C01-mountain-operations-complex.png': [
    ['mainstreet-america', 'C01', 'exact_object'],
    ['mainstreet-america', 'C01-PUBLIC-ENTRY', 'object_context'],
    ['mainstreet-america', 'DIV-C01-SURFACE', 'district_context'],
  ],
  'MSA-homes-streetscape.png': [
    ['mainstreet-america', 'BLK-WS', 'district_context'],
    ['mainstreet-america', 'BLK-WM', 'district_context'],
    ['mainstreet-america', 'BLK-WN', 'district_context'],
    ['mainstreet-america', 'BLK-ES', 'district_context'],
    ['mainstreet-america', 'BLK-EM', 'district_context'],
    ['mainstreet-america', 'BLK-EN', 'district_context'],
  ],
  'RRCH-ravensreach-core.png': [
    ['ravensreach', 'ravensreach:DISTRICT', 'district_context'],
  ],
  'RG-ravensgate.png': [
    ['ravensgate', 'ravensgate:DISTRICT', 'district_context'],
  ],
  'WL-stadium-and-district.png': [
    ['westlight-venue', 'westlight-venue:DISTRICT', 'district_context'],
    ['westlight-district', 'westlight-district:DISTRICT', 'district_context'],
    ['westlight-venue', 'WL-BOWL', 'exact_object'],
  ],
  'RR-Z5-surface-access-shaft.png': [
    ['raven-rock', 'RR-Z5', 'exact_object'],
  ],
};

const captureSpecs = {
  'B01-guest-design-center.png': {
    id: 'B01',
    eye: '-110,105,205',
    look: '0,68,125',
    distance: 180,
    fov: 66,
  },
  'B02-retail-cooking-school.png': {
    id: 'B02',
    eye: '-45,100,-30',
    look: '-110,68,-95',
    distance: 150,
    fov: 65,
  },
  'B03-service-warehouse.png': {
    id: 'B03',
    eye: '65,100,-190',
    look: '0,68,-255',
    distance: 160,
    fov: 65,
  },
  'MSA-homes-streetscape.png': {
    id: 'MSA-HOMES',
    eye: '-115,110,25',
    look: '0,68,-90',
    distance: 190,
    fov: 68,
  },
  'C01-mountain-operations-complex.png': {
    id: 'C01',
    eye: '55,125,265',
    look: '180,72,170',
    distance: 210,
    fov: 68,
  },
  'RRCH-ravensreach-core.png': {
    id: 'RRCH',
    eye: '-180,125,-290',
    look: '-85,68,-375',
    distance: 190,
    fov: 68,
  },
  'RG-ravensgate.png': {
    id: 'RG',
    eye: '-20,112,-530',
    look: '-95,68,-490',
    distance: 150,
    fov: 65,
  },
  'WL-stadium-and-district.png': {
    id: 'WL',
    eye: '-500,170,-430',
    look: '-360,70,-560',
    distance: 240,
    fov: 68,
  },
  'RR-Z5-surface-access-shaft.png': {
    id: 'RR-Z5',
    eye: '150,105,40',
    look: '200,64,-15',
    distance: 150,
    fov: 65,
  },
};

for (const [filename, targets] of Object.entries(manualScreenshotLinks)) {
  const fullPath = path.join(screenshotDirectory, filename);
  if (!fs.existsSync(fullPath)) continue;
  for (const [projectId, externalId, relation] of targets) {
    addLink(featureByProjectExternalId.get(`${projectId}:${externalId}`), {
      path: relative(fullPath),
      type: 'screenshot',
      relation,
      matchMethod: 'capture_manifest',
      exists: true,
      capture: {
        ...captureSpecs[filename],
        width: 1280,
        height: 720,
        shadows: true,
        snapshotDirectory: snapshot.directory,
        snapshotSha256: snapshot.sha256,
      },
    });
  }
}

const exactFilenameLinks = {
  'docs/mainstreet-america/qa/msa-h03-after.png': ['mainstreet-america', 'H03'],
  'docs/mainstreet-america/qa/msa-h04-after.png': ['mainstreet-america', 'H04'],
  'docs/mainstreet-america/qa/msa-h08-after.png': ['mainstreet-america', 'H08'],
  'docs/mainstreet-america/qa/msa-secure-wave5-c01-hangar.png': [
    'mainstreet-america',
    'C01-HANGAR',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-c01-arena.png': [
    'mainstreet-america',
    'C01-ARENA',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-observatory-exterior.png': [
    'mainstreet-america',
    'OBS-S01',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-observatory-interior.png': [
    'mainstreet-america',
    'OBS-S01',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-observatory-interior-wide.png': [
    'mainstreet-america',
    'OBS-S01',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-penthouse.png': [
    'mainstreet-america',
    'APT-S01',
  ],
  'docs/mainstreet-america/qa/msa-secure-wave5-grand-vault.png': [
    'mainstreet-america',
    'VLT-G01',
  ],
  'docs/mainstreet-america/qa/msa-east-hangar-final.png': [
    'mainstreet-america',
    'HGR-S01',
  ],
  'docs/mainstreet-america/qa/msa-observatory-exterior-after.png': [
    'mainstreet-america',
    'OBS-S01',
  ],
  'docs/mainstreet-america/qa/msa-grand-vault-stair-final.png': [
    'mainstreet-america',
    'VLT-G01',
  ],
};

for (const [mediaPath, target] of Object.entries(exactFilenameLinks)) {
  if (!fs.existsSync(path.join(root, mediaPath))) continue;
  const feature = featureByProjectExternalId.get(`${target[0]}:${target[1]}`);
  addLink(feature, {
    path: mediaPath,
    type: 'screenshot',
    relation: 'exact_object',
    matchMethod: 'reviewed_filename_mapping',
    exists: true,
  });
}

const secureFloorplanLinks = {
  '01-c01-upper-plan.png': [
    ['mainstreet-america', 'C01'],
  ],
  '02-c01-lower-plan.png': [
    ['mainstreet-america', 'C01'],
  ],
  '03-observatory-penthouse-plans.png': [
    ['mainstreet-america', 'OBS-S01'],
    ['mainstreet-america', 'APT-S01'],
  ],
  '04-shelter-vault-levels.png': [
    ['mainstreet-america', 'SHL-S01'],
    ['mainstreet-america', 'VLT-G01'],
  ],
};
for (const [filename, targets] of Object.entries(secureFloorplanLinks)) {
  const fullPath = path.join(secureAtlasDirectory, filename);
  if (!fs.existsSync(fullPath)) continue;
  for (const [projectId, externalId] of targets) {
    addLink(featureByProjectExternalId.get(`${projectId}:${externalId}`), {
      path: relative(fullPath),
      type: 'floorplan',
      relation: 'exact_object',
      matchMethod: 'secure_wave5_atlas_manifest',
      exists: true,
      sourceSnapshot: secureAtlasManifest.snapshotRef ?? null,
    });
  }
}

const surfaceMaps = walk(surfaceAtlasDirectory)
  .filter((filename) => path.extname(filename).toLowerCase() === '.png')
  .sort((a, b) => a.localeCompare(b));
const surfaceMapByProject = new Map([
  ['mainstreet-america', ['00-overall-active-world-surface-atlas.png']],
  ['raven-rock', ['06-raven-rock-surface-access.png']],
  ['ravensreach', ['01-ravensreach-core-and-old-town.png']],
  ['ravensgate', ['02-ravensgate.png']],
  ['approach-road', ['03-western-approach-road.png']],
  ['westlight-venue', ['04-westlight-venue-and-district.png']],
  ['westlight-district', ['04-westlight-venue-and-district.png']],
]);
for (const feature of features) {
  for (const mapName of surfaceMapByProject.get(feature.projectId) ?? []) {
    const fullPath = path.join(surfaceAtlasDirectory, mapName);
    if (!fs.existsSync(fullPath)) continue;
    addLink(feature, {
      path: relative(fullPath),
      type: 'surface_map',
      relation: 'project_context',
      matchMethod: 'project_id',
      exists: true,
      sourceSnapshot: surfaceManifest.snapshot ?? null,
    });
  }
}

const objectMediaRows = features.map((feature) => ({
  featureId: feature.id,
  projectId: feature.projectId,
  externalId: feature.externalId,
  parentId: feature.parentId,
  name: feature.name,
  kind: feature.kind,
  status: feature.status,
  bounds: feature.bounds,
  media: links.get(feature.id),
}));
const exactScreenshotFeatureIds = new Set(objectMediaRows
  .filter((row) => row.media.some((item) => (
    item.type === 'screenshot'
    && item.relation === 'exact_object'
    && item.exists
  )))
  .map((row) => row.featureId));
const screenshotFeatureIds = new Set(objectMediaRows
  .filter((row) => row.media.some((item) => (
    item.type === 'screenshot'
    && item.exists
  )))
  .map((row) => row.featureId));
const floorplanFeatureIds = new Set(objectMediaRows
  .filter((row) => row.media.some((item) => (
    item.type === 'floorplan'
    && item.exists
  )))
  .map((row) => row.featureId));
const linkedPaths = new Set(objectMediaRows.flatMap((row) => (
  row.media.filter((item) => item.exists).map((item) => item.path)
)));
const buildings = features.filter((feature) => feature.kind === 'building');
function coverageFor(rows) {
  const buildingRows = rows.filter((row) => row.kind === 'building');
  return {
    features: rows.length,
    featuresWithAnyExistingScreenshot: rows
      .filter((row) => screenshotFeatureIds.has(row.featureId)).length,
    featuresWithExactObjectScreenshot: rows
      .filter((row) => exactScreenshotFeatureIds.has(row.featureId)).length,
    buildings: buildingRows.length,
    buildingsWithExactFloorplan: buildingRows
      .filter((row) => floorplanFeatureIds.has(row.featureId)).length,
    buildingsWithAnyExistingScreenshot: buildingRows
      .filter((row) => screenshotFeatureIds.has(row.featureId)).length,
    buildingsWithExactObjectScreenshot: buildingRows
      .filter((row) => exactScreenshotFeatureIds.has(row.featureId)).length,
  };
}
const coverageByProject = Object.fromEntries(
  [...new Set(features.map((feature) => feature.projectId))]
    .sort()
    .map((projectId) => [
      projectId,
      coverageFor(objectMediaRows.filter((row) => row.projectId === projectId)),
    ]),
);
const coverageByKind = Object.fromEntries(
  [...new Set(features.map((feature) => feature.kind))]
    .sort()
    .map((kind) => [
      kind,
      coverageFor(objectMediaRows.filter((row) => row.kind === kind)),
    ]),
);

const objectMediaIndex = {
  schemaVersion: 1,
  generatedAt,
  snapshot: {
    directory: snapshot.directory,
    sha256: snapshot.sha256,
  },
  coverage: {
    features: features.length,
    featuresWithAnyExistingScreenshot: screenshotFeatureIds.size,
    featuresWithExactObjectScreenshot: exactScreenshotFeatureIds.size,
    buildings: buildings.length,
    buildingsWithExactFloorplan: buildings
      .filter((feature) => floorplanFeatureIds.has(feature.id)).length,
    buildingsWithAnyExistingScreenshot: buildings
      .filter((feature) => screenshotFeatureIds.has(feature.id)).length,
    buildingsWithExactObjectScreenshot: buildings
      .filter((feature) => exactScreenshotFeatureIds.has(feature.id)).length,
    inventoriedMediaFiles: mediaFiles.length,
    linkedInventoriedMediaFiles: mediaFiles
      .filter((filename) => linkedPaths.has(relative(filename))).length,
    byProject: coverageByProject,
    byKind: coverageByKind,
  },
  mediaInventory: [...mediaByRelativePath.values()],
  surfaceMaps: surfaceMaps.map(mediaMetadata),
  objects: objectMediaRows,
  unmatchedMedia: [...mediaByRelativePath.values()]
    .filter((media) => !linkedPaths.has(media.path)),
  gaps: {
    buildingsWithoutExactObjectScreenshot: objectMediaRows
      .filter((row) => (
        row.kind === 'building'
        && !exactScreenshotFeatureIds.has(row.featureId)
      ))
      .map(({ featureId, projectId, externalId, name, bounds }) => ({
        featureId,
        projectId,
        externalId,
        name,
        bounds,
      })),
    featuresWithoutAnyScreenshot: objectMediaRows
      .filter((row) => !screenshotFeatureIds.has(row.featureId))
      .map(({ featureId, projectId, externalId, name, kind, bounds }) => ({
        featureId,
        projectId,
        externalId,
        name,
        kind,
        bounds,
      })),
  },
  relationSemantics: {
    exact_object: 'The image or plan depicts this specific database object.',
    object_context: 'The object is visible in a wider contextual view.',
    district_context: 'The image depicts a district or collection, not every child individually.',
    declared_evidence: 'The database record itself names the image as evidence; inspect the full evidence set before treating it as object-exclusive.',
    project_context: 'The surface map locates the object inside its project.',
  },
};

const captureCommands = Object.entries(captureSpecs).map(([filename, spec]) => ({
  id: spec.id,
  featureTargets: Object.entries(manualScreenshotLinks)
    .find(([candidate]) => candidate === filename)?.[1] ?? [],
  eye: spec.eye,
  look: spec.look,
  distance: spec.distance,
  fov: spec.fov,
  width: 1280,
  height: 720,
  shadows: true,
  output: relative(path.join(screenshotDirectory, filename)),
  command: (
    `node scripts/world_render.mjs --regions ${relative(snapshotDirectory)} `
    + `--mode persp --eye=${spec.eye} --look=${spec.look} `
    + `--dist=${spec.distance} --w=1280 --h=720 --fov=${spec.fov} `
    + '--shadows=true '
    + `--out=${relative(path.join(screenshotDirectory, filename))}`
  ),
}));

const captureManifest = {
  schemaVersion: 1,
  generatedAt,
  renderer: 'scripts/world_render.mjs',
  snapshot,
  captures: captureCommands.map((capture) => {
    const fullPath = path.join(root, capture.output);
    return {
      ...capture,
      artifact: fs.existsSync(fullPath) ? mediaMetadata(fullPath) : null,
    };
  }),
};

const featuresOutput = {
  schemaVersion: 1,
  generatedAt,
  database: {
    file: relative(worldDbPath),
    sha256: report.databases.worldMap.sha256,
  },
  snapshot: {
    directory: snapshot.directory,
    sha256: snapshot.sha256,
  },
  count: features.length,
  features,
};

writeJson(path.join(outputDirectory, 'database-report.json'), report);
writeJson(path.join(outputDirectory, 'features.json'), featuresOutput);
writeJson(path.join(outputDirectory, 'object-media-index.json'), objectMediaIndex);
writeJson(path.join(outputDirectory, 'capture-manifest.json'), captureManifest);

const markdown = `# World catalog and object-linked media

Generated: ${generatedAt}

## Snapshot

- Directory: \`${snapshot.directory}\`
- SHA-256: \`${snapshot.sha256}\`
- Region files: ${snapshot.regionFiles}
- Newest copied region mtime: ${snapshot.newestRegionModifiedAt}

## Database contents

| Store | Purpose | Tables / rows |
|---|---|---|
| \`data/world-map.db\` | Cross-project as-built catalog and surveys | ${report.databases.worldMap.tables.world_features} features, ${report.databases.worldMap.tables.world_scans} scans, ${report.databases.worldMap.tables.feature_observations} observations |
| \`data/town.db\` | Town Builder operational state | ${report.databases.town.tables.towns} town, ${report.databases.town.tables.districts} district, ${report.databases.town.tables.buildings} buildings, ${report.databases.town.tables.residents} residents, ${report.databases.town.tables.events} events |
| JSON stores under \`data/\` | Fleet, control, social, task, build, QA, and usage state | ${persistentJsonFiles.length} inventoried files; contents intentionally not duplicated here |

### World features by project

${report.databases.worldMap.projects.map((row) => (
    `- ${row.value}: **${row.count}**`
  )).join('\n')}

### World features by kind

${report.databases.worldMap.kinds.map((row) => (
    `- ${row.value}: **${row.count}**`
  )).join('\n')}

The complete normalized catalog is in \`features.json\`. Table schemas, row
counts, scans, town records, and the JSON-store inventory are in
\`database-report.json\`.

## Object-to-media coverage

- ${objectMediaIndex.coverage.buildingsWithExactFloorplan}/${objectMediaIndex.coverage.buildings} buildings have exact object floor plans.
- ${objectMediaIndex.coverage.buildingsWithAnyExistingScreenshot}/${objectMediaIndex.coverage.buildings} buildings have at least one existing screenshot link.
- ${objectMediaIndex.coverage.buildingsWithExactObjectScreenshot}/${objectMediaIndex.coverage.buildings} buildings have a reviewed exact-object screenshot.
- ${objectMediaIndex.coverage.featuresWithAnyExistingScreenshot}/${objectMediaIndex.coverage.features} features have at least one screenshot link.
- ${objectMediaIndex.coverage.inventoriedMediaFiles} screenshot/image files were inventoried.

\`object-media-index.json\` distinguishes exact-object, contextual,
database-declared evidence-set, and project-map links. This is important:
project and district context images must not be presented as though they prove
every child object individually.

## Map and screenshot entry points

- Comprehensive surface map:
  \`${relative(path.join(surfaceAtlasDirectory, '00-overall-active-world-surface-atlas.png'))}\`
- Surface districts:
  \`${relative(surfaceAtlasDirectory)}/\`
- 76-page interior floor-plan book:
  \`${relative(path.join(floorplanDirectory, 'worldwide-interior-floorplan-atlas.pdf'))}\`
- 68 per-building floor-plan PNGs:
  \`${relative(path.join(floorplanDirectory, 'structures'))}/\`
- Newer secure-complex floor-plan supplement:
  \`${relative(secureAtlasDirectory)}/\`
- Nine new snapshot-pinned perspective captures:
  \`${relative(screenshotDirectory)}/\`
- Exact camera commands and hashes:
  \`capture-manifest.json\`

## Safe refresh commands

Refresh the copied Anvil snapshot only after coordinating with live builders:

\`\`\`bash
python3 scripts/world_snapshot.py --near=0,0 --radius 800
\`\`\`

Regenerate surface maps into a fresh, non-overwriting directory:

\`\`\`bash
node scripts/generate_surface_atlas.mjs \\
  data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a
\`\`\`

Regenerate floor plans into a fresh directory:

\`\`\`bash
node scripts/generate_worldwide_interior_atlas.mjs \\
  --out data/exports/world-catalog-YYYY-MM-DD/floorplans
\`\`\`

Regenerate this report and media index:

\`\`\`bash
node scripts/generate_world_catalog.mjs \\
  --out data/exports/world-catalog-YYYY-MM-DD \\
  --snapshot data/worldsnap/region \\
  --surface-atlas data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a
\`\`\`

All map, floor-plan, catalog, and perspective generation commands above are
offline/read-only with respect to the Minecraft world. The snapshot refresh
copies saved region files locally and does not issue build operations.

The staged building floor-plan bundle uses ${floorplanSnapshotDescription}.
Supplement status: ${floorplanSupplementDescription}. Use each artifact's own
source snapshot and do not relabel inherited drawings with the catalog
snapshot.
`;
fs.writeFileSync(path.join(outputDirectory, 'README.md'), markdown);

function htmlEscape(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function htmlHref(repositoryRelativePath) {
  if (repositoryRelativePath.startsWith('/')) return null;
  return path.relative(
    outputDirectory,
    path.resolve(root, repositoryRelativePath),
  ).split(path.sep).join('/');
}

function statCards(values) {
  return values.map(([number, label]) => (
    `<div class="stat"><strong>${htmlEscape(number)}</strong>`
    + `<span>${htmlEscape(label)}</span></div>`
  )).join('');
}

function summaryTable(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${
    headers.map((header) => `<th>${htmlEscape(header)}</th>`).join('')
  }</tr></thead><tbody>${
    rows.map((row) => `<tr>${
      row.map((cell) => `<td>${cell}</td>`).join('')
    }</tr>`).join('')
  }</tbody></table></div>`;
}

const buildingCrosswalkRows = objectMediaRows
  .filter((row) => row.kind === 'building')
  .map((row) => {
    const exactScreenshots = row.media.filter((item) => (
      item.type === 'screenshot'
      && item.relation === 'exact_object'
      && item.exists
    ));
    const contextualScreenshots = row.media.filter((item) => (
      item.type === 'screenshot'
      && item.relation !== 'exact_object'
      && item.exists
    ));
    const floorplans = row.media.filter((item) => (
      item.type === 'floorplan' && item.exists
    ));
    const linkList = (items) => items.length
      ? `<ul>${items.map((item) => {
        const href = htmlHref(item.path);
        const hash = item.artifact?.sha256?.slice(0, 12) ?? 'no hash';
        return `<li><a href="${htmlEscape(href)}">${htmlEscape(path.basename(item.path))}</a>`
          + `<small>${htmlEscape(item.relation)} · ${htmlEscape(hash)}…</small></li>`;
      }).join('')}</ul>`
      : '<span class="gap">gap</span>';
    return [
      `<code>${htmlEscape(row.projectId)}</code>`,
      `<code>${htmlEscape(row.externalId)}</code><br>${htmlEscape(row.name)}`,
      `<code>x[${row.bounds.minX}, ${row.bounds.maxX}]`
        + ` z[${row.bounds.minZ}, ${row.bounds.maxZ}]</code>`,
      linkList(floorplans),
      linkList(exactScreenshots),
      linkList(contextualScreenshots),
    ];
  });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MC Fleet world catalog report</title>
  <style>
    :root { color-scheme: dark; --ink:#e5e7eb; --muted:#94a3b8; --line:#334155; --panel:#111827; --accent:#38bdf8; }
    * { box-sizing: border-box; }
    body { margin:0; background:#020617; color:var(--ink); font:15px/1.5 system-ui,sans-serif; }
    main { width:min(1500px,calc(100% - 40px)); margin:0 auto; padding:44px 0 80px; }
    h1 { margin:0 0 8px; font-size:clamp(32px,5vw,64px); letter-spacing:-.04em; }
    h2 { margin:50px 0 16px; font-size:26px; }
    h3 { margin:28px 0 10px; }
    p,li { color:#cbd5e1; }
    a { color:var(--accent); }
    code { color:#f8fafc; }
    .lede { max-width:900px; color:var(--muted); font-size:18px; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin:28px 0; }
    .stat { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; }
    .stat strong { display:block; font-size:30px; }
    .stat span,.stat small,small { display:block; color:var(--muted); }
    .table-wrap { overflow:auto; border:1px solid var(--line); border-radius:12px; }
    table { width:100%; border-collapse:collapse; background:var(--panel); }
    th,td { text-align:left; vertical-align:top; padding:10px 12px; border-bottom:1px solid var(--line); }
    th { position:sticky; top:0; background:#1e293b; }
    td ul { margin:0; padding-left:18px; }
    .gap { color:#fda4af; font-weight:700; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:18px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; }
  </style>
</head>
<body>
<main>
  <h1>World catalog report</h1>
  <p class="lede">A snapshot-pinned census of the cross-project as-built database,
  Town Builder state, detailed floor plans, and the reviewed database-to-image
  crosswalk. Snapshot <code>${snapshot.sha256}</code>.</p>
  <div class="stats">${statCards([
    [features.length, 'world features'],
    [scans.length, 'world scans'],
    [report.databases.worldMap.tables.feature_observations, 'observations'],
    [buildings.length, 'buildings'],
    [objectMediaIndex.coverage.buildingsWithExactFloorplan, 'exact floor plans'],
    [objectMediaIndex.coverage.buildingsWithExactObjectScreenshot, 'exact building screenshots'],
  ])}</div>

  <h2>Review files</h2>
  <div class="grid">
    <div class="card"><h3>Full catalog</h3><p>All normalized feature geometry,
    hierarchy, status, tags, attributes, and provenance.</p>
    <p><a href="features.json">features.json</a></p></div>
    <div class="card"><h3>Database census</h3><p>SQLite schemas, table counts,
    scans, town records, field definitions, and JSON-store inventory.</p>
    <p><a href="database-report.json">database-report.json</a></p></div>
    <div class="card"><h3>Object ↔ media</h3><p>Every feature, its bounds,
    matched plans/screenshots/maps, hashes, cameras, and explicit gaps.</p>
    <p><a href="object-media-index.json">object-media-index.json</a></p></div>
    <div class="card"><h3>Capture reproducibility</h3><p>Snapshot identity,
    exact renderer commands, cameras, dimensions, and artifact hashes.</p>
    <p><a href="capture-manifest.json">capture-manifest.json</a></p></div>
  </div>

  <h2>Table census</h2>
  ${summaryTable(
    ['Database', 'Table', 'Rows'],
    [
      ...Object.entries(report.databases.worldMap.tables)
        .map(([table, count]) => ['world-map.db', htmlEscape(table), String(count)]),
      ...Object.entries(report.databases.town.tables)
        .map(([table, count]) => ['town.db', htmlEscape(table), String(count)]),
    ],
  )}

  <h2>World catalog by project and kind</h2>
  ${summaryTable(
    ['Project', 'Kind', 'Objects'],
    report.databases.worldMap.projectKindCounts.map((row) => [
      `<code>${htmlEscape(row.projectId)}</code>`,
      htmlEscape(row.kind),
      String(row.count),
    ]),
  )}

  <h2>Field definitions</h2>
  ${summaryTable(
    ['Field', 'Definition'],
    Object.entries(report.dataDictionary.worldFeature).map(([field, definition]) => [
      `<code>${htmlEscape(field)}</code>`,
      htmlEscape(definition),
    ]),
  )}

  <h2>Per-project screenshot gaps</h2>
  ${summaryTable(
    ['Project', 'Features', 'Buildings', 'Exact floor plans', 'Any screenshot', 'Exact screenshot'],
    Object.entries(objectMediaIndex.coverage.byProject).map(([projectId, coverage]) => [
      `<code>${htmlEscape(projectId)}</code>`,
      String(coverage.features),
      String(coverage.buildings),
      String(coverage.buildingsWithExactFloorplan),
      String(coverage.buildingsWithAnyExistingScreenshot),
      String(coverage.buildingsWithExactObjectScreenshot),
    ]),
  )}

  <h2>Building crosswalk</h2>
  <p>“Gap” means there is no reviewed link of that relation. Context and
  database-declared evidence sets are kept separate from exact-object proof.</p>
  ${summaryTable(
    ['Project', 'Object', 'Bounds', 'Floor plan', 'Exact screenshot', 'Context/evidence'],
    buildingCrosswalkRows,
  )}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(outputDirectory, 'database-report.html'), html);

worldDb.close();
townDb.close();

console.log(JSON.stringify({
  outputDirectory: relative(outputDirectory),
  snapshot: snapshot.sha256,
  features: features.length,
  scans: scans.length,
  observations: report.databases.worldMap.tables.feature_observations,
  buildings: buildings.length,
  buildingsWithFloorplans: objectMediaIndex.coverage.buildingsWithExactFloorplan,
  buildingsWithScreenshots: objectMediaIndex.coverage.buildingsWithAnyExistingScreenshot,
  inventoriedMedia: objectMediaIndex.coverage.inventoriedMediaFiles,
}, null, 2));
