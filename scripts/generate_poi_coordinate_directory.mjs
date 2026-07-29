#!/usr/bin/env node
/**
 * Generate the read-only IANLAN Points of Interest Coordinate Directory.
 *
 * Every durable world_features record is included exactly once. The workflow
 * reads the accepted SQLite catalog and immutable terminal snapshot only. It
 * never connects to Minecraft, RCON, the fleet API, systemd, Railway, or Box.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-29-poi-coordinate-directory',
);
const WORLD_DB = path.join(ROOT, 'data/world-map.db');
const SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);

const CATEGORY_DEFINITIONS = [
  {
    id: 'surface-builds',
    label: 'Surface builds',
    short: 'Surface',
    description: 'Buildings, rooms, districts, landscape, and authored places not assigned to a more specific operator group.',
  },
  {
    id: 'remote-sites',
    label: 'Remote sites',
    short: 'Remote',
    description: 'Surface records at Raven Rock, Ravensgate, Ravensreach, Westlight, and the western approach.',
  },
  {
    id: 'passageway-access',
    label: 'PassageWay access',
    short: 'PassageWay',
    description: 'The named underground tunnel system: tunnels, bunkers, vaults, portals, shafts, below-grade rooms, and internal access.',
  },
  {
    id: 'route-station-infrastructure',
    label: 'Route / station infrastructure',
    short: 'Routes',
    description: 'Roads, paths, parking, sidewalks, drives, stations, lighting, fences, utilities, and wayfinding infrastructure.',
  },
  {
    id: 'anomalies-controls',
    label: 'Anomalies / controls',
    short: 'Controls',
    description: 'Cataloged gates, thresholds, sealed or restricted areas, hazards, bulkheads, technical controls, and the retired record.',
  },
  {
    id: 'candidate-parcels',
    label: 'Candidate parcels',
    short: 'Candidates',
    description: 'Future, reserve, expansion, pad, or parcel markers. These are reference locations, not proof of a future program.',
  },
];

const CATEGORY_INDEX = new Map(
  CATEGORY_DEFINITIONS.map((category, index) => [category.id, index]),
);
const REMOTE_PROJECTS = new Set([
  'approach-road',
  'raven-rock',
  'ravensgate',
  'ravensreach',
  'westlight-district',
  'westlight-venue',
]);
const ROUTE_KINDS = new Set([
  'road',
  'parking',
  'sidewalk',
  'driveway',
  'lighting',
  'fence',
  'utility',
]);
const PASSAGE_PATTERN = /\b(tunnel|underground|bunker|vault|shelter|portal|shaft|cavern|hangar|below[- ]?grade|secret passage|lower operations|owner corridor|subterranean)\b/i;
const CONTROL_PATTERN = /\b(anomal|control|warning|sealed|bulkhead|threshold|airlock|security|gate|hazard|exclusion|quarantine|restricted|barrier|switch|checkpoint)\b/i;
const CANDIDATE_PATTERN = /\b(candidate|parcel|future|reserve|vacant)\b|satellite[- ]pad/i;

fs.mkdirSync(OUT, { recursive: true });

function readJsonValue(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function hashSnapshot(directory) {
  const filenames = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of filenames) {
    const buffer = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(buffer);
    hash.update('\0');
    bytes += buffer.length;
  }
  return {
    directory: path.relative(ROOT, directory),
    sha256: hash.digest('hex'),
    regionFileCount: filenames.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function finite(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function geometryExtent(geometry) {
  if (geometry.type === 'point') {
    const position = geometry.position ?? {};
    return {
      minX: finite(position.x),
      maxX: finite(position.x),
      minY: finite(position.y),
      maxY: finite(position.y),
      minZ: finite(position.z),
      maxZ: finite(position.z),
    };
  }
  if (geometry.type === 'bounds') {
    return {
      minX: finite(geometry.minX),
      maxX: finite(geometry.maxX),
      minY: finite(geometry.minY),
      maxY: finite(geometry.maxY),
      minZ: finite(geometry.minZ),
      maxZ: finite(geometry.maxZ),
    };
  }
  const points = Array.isArray(geometry.points) ? geometry.points : [];
  const xs = points.map((point) => finite(point.x)).filter((value) => value !== null);
  const ys = points.map((point) => finite(point.y)).filter((value) => value !== null);
  const zs = points.map((point) => finite(point.z)).filter((value) => value !== null);
  if (Number.isFinite(geometry.minY)) ys.push(Number(geometry.minY));
  if (Number.isFinite(geometry.maxY)) ys.push(Number(geometry.maxY));
  return {
    minX: xs.length ? Math.min(...xs) : null,
    maxX: xs.length ? Math.max(...xs) : null,
    minY: ys.length ? Math.min(...ys) : null,
    maxY: ys.length ? Math.max(...ys) : null,
    minZ: zs.length ? Math.min(...zs) : null,
    maxZ: zs.length ? Math.max(...zs) : null,
  };
}

function center(minimum, maximum) {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
  return Math.round((Number(minimum) + Number(maximum)) / 2);
}

function referenceCoordinate(geometry, attributes, extent) {
  if (
    Array.isArray(attributes.entrance)
    && attributes.entrance.length >= 3
    && attributes.entrance.slice(0, 3).every(Number.isFinite)
  ) {
    return {
      x: Math.round(attributes.entrance[0]),
      y: Math.round(attributes.entrance[1]),
      z: Math.round(attributes.entrance[2]),
      type: 'catalog entrance',
      derived: false,
    };
  }
  if (geometry.type === 'point' && geometry.position) {
    return {
      x: Math.round(geometry.position.x),
      y: Number.isFinite(geometry.position.y) ? Math.round(geometry.position.y) : null,
      z: Math.round(geometry.position.z),
      type: 'exact catalog point',
      derived: false,
    };
  }
  if (geometry.type === 'path' && geometry.points?.length) {
    const start = geometry.points[0];
    return {
      x: Math.round(start.x),
      y: Number.isFinite(start.y) ? Math.round(start.y) : null,
      z: Math.round(start.z),
      type: 'path start',
      derived: false,
    };
  }
  const ySpan = (
    Number.isFinite(extent.minY) && Number.isFinite(extent.maxY)
      ? extent.maxY - extent.minY
      : null
  );
  return {
    x: center(extent.minX, extent.maxX),
    y: ySpan !== null && ySpan <= 32 ? center(extent.minY, extent.maxY) : null,
    z: center(extent.minZ, extent.maxZ),
    type: geometry.type === 'polygon'
      ? 'derived polygon center'
      : 'derived bounds center',
    derived: true,
  };
}

function axisExtent(label, minimum, maximum) {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return `${label}[—]`;
  return minimum === maximum
    ? `${label}[${minimum}]`
    : `${label}[${minimum}…${maximum}]`;
}

function extentLabel(geometry, extent) {
  const base = [
    axisExtent('x', extent.minX, extent.maxX),
    axisExtent('y', extent.minY, extent.maxY),
    axisExtent('z', extent.minZ, extent.maxZ),
  ].join(' ');
  if (geometry.type === 'path') {
    return `${base} · ${geometry.points?.length ?? 0} waypoints`;
  }
  if (geometry.type === 'polygon') {
    return `${base} · ${geometry.points?.length ?? 0} vertices`;
  }
  return base;
}

function hasAncestorExternalId(row, rowsById, matcher) {
  let parentId = row.parent_id;
  const seen = new Set();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = rowsById.get(parentId);
    if (!parent) break;
    if (matcher.test(parent.external_id ?? '')) return true;
    parentId = parent.parent_id;
  }
  return false;
}

function isPassageWayRecord(row, tags, attributes, extent, rowsById) {
  const id = row.external_id ?? '';
  const text = [
    id,
    row.name,
    row.kind,
    ...tags,
    JSON.stringify(attributes),
  ].join(' ');
  if (row.project_id === 'raven-rock') return true;
  if (
    row.project_id === 'ravensreach'
    && (
      /^(RRCH-MOOT|RRCH-LIBRARY)/.test(id)
      || hasAncestorExternalId(row, rowsById, /^(RRCH-MOOT|RRCH-LIBRARY)$/)
    )
  ) return true;
  if (
    row.project_id === 'westlight-venue'
    && (
      /^(WL-THEATRE|WL-CLUB|WL-BOWL)/.test(id)
      || hasAncestorExternalId(row, rowsById, /^(WL-THEATRE|WL-CLUB|WL-BOWL)$/)
    )
  ) return true;
  if (
    row.project_id === 'mainstreet-america'
    && (
      /^(C01|U01|OBS-S01|APT-S01|SAFE-S01|SHL-S01|FAL-S01|COM-S01|VLT-S01|SAFE-U01|VLT-G01|ROUTE:(C01|APT-SHELTER|SHELTER-GRAND-VAULT|GRAND-VAULT-STAIRS|OBS-PENTHOUSE|OBS-PUBLIC|OFFICE-HELIPORT))/.test(id)
      || hasAncestorExternalId(
        row,
        rowsById,
        /^(C01|OBS-S01|APT-S01|SHL-S01|VLT-G01)$/,
      )
    )
  ) return true;
  if (
    row.project_id === 'town-expansion-r1'
    && /^(GRT-|OBS-OWNER|OWNER-|RRCH-GILDED|TE-(OWNER|OBS-OWNER|RRCH-GILDED|LIB-GUILD|GUILDHALL|LIBRARY|MSA-UW|MSA-B01|OASIS-BUNKER|IA-INFO|IA-HOLDOUT-HOME-SHELTER|IA-CONCORD|WL-VENUE-BASEMENTS|WL-FREIGHT|WL-LANTERN|RR-MODERN)|c01_)/i.test(id)
  ) return true;
  return (
    extent.minY !== null
    && extent.minY < 55
    && /(underground|tunnel|bunker|basement|cellar|vault|shelter|sanctum|cavern|owner|adult|club|theatre|theater|warehouse)/i.test(text)
  );
}

function categoryFor(row, geometry, tags, attributes, extent, rowsById) {
  const searchable = [
    row.external_id,
    row.name,
    row.kind,
    row.status,
    ...tags,
    JSON.stringify(attributes),
  ].join(' ');
  const candidateSearch = `${row.external_id} ${row.name}`;
  if (CANDIDATE_PATTERN.test(candidateSearch)) return 'candidate-parcels';
  if (isPassageWayRecord(row, tags, attributes, extent, rowsById)) {
    return 'passageway-access';
  }
  if (row.status === 'removed' || CONTROL_PATTERN.test(searchable)) {
    return 'anomalies-controls';
  }
  if (PASSAGE_PATTERN.test(searchable)) {
    return 'passageway-access';
  }
  if (
    ROUTE_KINDS.has(row.kind)
    || geometry.type === 'path'
    || /\b(route|station|wayfinding|junction|crossing|spur)\b/i.test(searchable)
  ) {
    return 'route-station-infrastructure';
  }
  if (REMOTE_PROJECTS.has(row.project_id)) return 'remote-sites';
  return 'surface-builds';
}

function titleCaseId(value) {
  return value
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function csvCell(value) {
  const string = String(value ?? '');
  return `"${string.replaceAll('"', '""')}"`;
}

const database = new Database(WORLD_DB, {
  readonly: true,
  fileMustExist: true,
});
database.pragma('query_only = ON');
const sourceRows = database.prepare(`
  SELECT
    id,
    project_id,
    external_id,
    parent_id,
    name,
    kind,
    status,
    geometry_json,
    tags_json,
    attributes_json,
    source,
    source_ref
  FROM world_features
  ORDER BY project_id, external_id, name, id
`).all();
database.close();

const rowsById = new Map(sourceRows.map((row) => [row.id, row]));
const namesById = new Map(sourceRows.map((row) => [row.id, row.name]));
const records = sourceRows.map((row) => {
  const geometry = readJsonValue(row.geometry_json, {});
  const tags = readJsonValue(row.tags_json, []);
  const attributes = readJsonValue(row.attributes_json, {});
  const extent = geometryExtent(geometry);
  const reference = referenceCoordinate(geometry, attributes, extent);
  if (!Number.isFinite(reference.x) || !Number.isFinite(reference.z)) {
    throw new Error(`Feature ${row.id} has no usable X/Z coordinate`);
  }
  const yToken = Number.isFinite(reference.y) ? reference.y : '~';
  const categoryId = categoryFor(
    row,
    geometry,
    tags,
    attributes,
    extent,
    rowsById,
  );
  return {
    id: row.id,
    externalId: row.external_id,
    parentId: row.parent_id,
    parentName: row.parent_id ? namesById.get(row.parent_id) ?? null : null,
    name: row.name,
    projectId: row.project_id,
    project: titleCaseId(row.project_id),
    kind: row.kind,
    status: row.status,
    categoryId,
    category: CATEGORY_DEFINITIONS.find((entry) => entry.id === categoryId).label,
    reference: {
      ...reference,
      display: `${reference.x}, ${yToken}, ${reference.z}`,
      tp: `/tp @s ${reference.x} ${yToken} ${reference.z}`,
      note: (
        reference.derived
          ? 'Derived catalog reference; not a verified entrance or safety-checked teleport.'
          : 'Catalog-authored reference; teleport safety is not independently verified.'
      ),
    },
    geometry: {
      type: geometry.type,
      extent,
      display: extentLabel(geometry, extent),
      source: geometry,
    },
    tags,
    source: row.source,
    sourceRef: row.source_ref,
  };
}).sort((left, right) => (
  (CATEGORY_INDEX.get(left.categoryId) - CATEGORY_INDEX.get(right.categoryId))
  || left.project.localeCompare(right.project)
  || left.name.localeCompare(right.name)
  || left.externalId.localeCompare(right.externalId)
));

const snapshot = hashSnapshot(SNAPSHOT);
const categoryCounts = Object.fromEntries(CATEGORY_DEFINITIONS.map((category) => [
  category.id,
  records.filter((record) => record.categoryId === category.id).length,
]));
const projectCounts = Object.fromEntries(
  [...new Set(records.map((record) => record.projectId))]
    .sort()
    .map((projectId) => [
      projectId,
      records.filter((record) => record.projectId === projectId).length,
    ]),
);
const kindCounts = Object.fromEntries(
  [...new Set(records.map((record) => record.kind))]
    .sort()
    .map((kind) => [
      kind,
      records.filter((record) => record.kind === kind).length,
    ]),
);
const summary = {
  schemaVersion: 1,
  id: 'ianlan-poi-coordinate-directory-2026-07-29',
  title: 'IANLAN Points of Interest Coordinate Directory',
  generatedAt: new Date().toISOString(),
  truthBoundary: {
    source: 'Every durable world_features record in data/world-map.db.',
    tp: (
      'Copy-ready /tp commands use catalog entrances or exact points where '
      + 'available, path starts for routes, and clearly labeled derived centers '
      + 'for area geometry. They are references, not safety-validated arrivals.'
    ),
    missingY: (
      'When the catalog has no narrow usable Y value, the command uses ~ to '
      + 'retain the operator current elevation instead of inventing one.'
    ),
    worldEdits: 'None. This report is read-only.',
    passageWay: (
      'PassageWay is the proper name of the IANLAN underground tunnel system.'
    ),
  },
  source: {
    database: {
      path: path.relative(ROOT, WORLD_DB),
      bytes: fs.statSync(WORLD_DB).size,
      sha256: sha256File(WORLD_DB),
    },
    snapshot,
  },
  counts: {
    records: records.length,
    active: records.filter((record) => record.status !== 'removed').length,
    retired: records.filter((record) => record.status === 'removed').length,
    exactOrAuthoredReferences: records.filter((record) => !record.reference.derived).length,
    derivedReferences: records.filter((record) => record.reference.derived).length,
    relativeYCommands: records.filter((record) => record.reference.y === null).length,
    projects: Object.keys(projectCounts).length,
    kinds: Object.keys(kindCounts).length,
    categories: CATEGORY_DEFINITIONS.length,
    byCategory: categoryCounts,
    byProject: projectCounts,
    byKind: kindCounts,
  },
  categories: CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    count: categoryCounts[category.id],
  })),
  records,
};

writeJson(path.join(OUT, 'poi-coordinate-directory.json'), summary);
writeJson(path.join(OUT, 'portal-summary.json'), {
  schemaVersion: 1,
  id: summary.id,
  generatedAt: summary.generatedAt,
  truthBoundary: summary.truthBoundary,
  source: summary.source,
  counts: summary.counts,
  categories: summary.categories,
  records: records.map((record) => ({
    id: record.id,
    externalId: record.externalId,
    parentName: record.parentName,
    name: record.name,
    projectId: record.projectId,
    project: record.project,
    kind: record.kind,
    status: record.status,
    categoryId: record.categoryId,
    category: record.category,
    reference: record.reference,
    geometry: {
      type: record.geometry.type,
      display: record.geometry.display,
    },
  })),
});

const csvHeaders = [
  'category',
  'project',
  'external_id',
  'name',
  'kind',
  'status',
  'reference_xyz',
  'tp_command',
  'reference_type',
  'derived',
  'geometry_type',
  'geometry_extent',
  'parent',
  'database_id',
];
const csvRows = records.map((record) => [
  record.category,
  record.project,
  record.externalId,
  record.name,
  record.kind,
  record.status,
  record.reference.display,
  record.reference.tp,
  record.reference.type,
  record.reference.derived,
  record.geometry.type,
  record.geometry.display,
  record.parentName ?? '',
  record.id,
]);
fs.writeFileSync(
  path.join(OUT, 'poi-coordinate-directory.csv'),
  `${csvHeaders.map(csvCell).join(',')}\n${
    csvRows.map((row) => row.map(csvCell).join(',')).join('\n')
  }\n`,
);

const projectOptions = Object.keys(projectCounts)
  .map((projectId) => (
    `<option value="${escapeHtml(projectId)}">${escapeHtml(titleCaseId(projectId))} (${projectCounts[projectId]})</option>`
  ))
  .join('');
const kindOptions = Object.keys(kindCounts)
  .map((kind) => `<option value="${escapeHtml(kind)}">${escapeHtml(kind)} (${kindCounts[kind]})</option>`)
  .join('');
const categoryCards = summary.categories.map((category) => `
  <button class="category-card" type="button" data-category-button="${escapeHtml(category.id)}">
    <strong>${category.count.toLocaleString()}</strong>
    <span>${escapeHtml(category.label)}</span>
    <small>${escapeHtml(category.description)}</small>
  </button>
`).join('');
const categorySections = summary.categories.map((category) => {
  const categoryRecords = records.filter((record) => record.categoryId === category.id);
  return `
    <section class="directory-group" data-category="${escapeHtml(category.id)}">
      <div class="group-heading">
        <div><span>${String(CATEGORY_INDEX.get(category.id) + 1).padStart(2, '0')}</span><h2>${escapeHtml(category.label)}</h2></div>
        <p>${escapeHtml(category.description)}</p>
      </div>
      <div class="rows">
        ${categoryRecords.map((record) => {
          const search = [
            record.name,
            record.externalId,
            record.project,
            record.kind,
            record.category,
            record.reference.display,
            record.reference.tp,
            record.parentName ?? '',
          ].join(' ').toLowerCase();
          return `
            <article
              class="poi-row"
              data-search="${escapeHtml(search)}"
              data-project="${escapeHtml(record.projectId)}"
              data-kind="${escapeHtml(record.kind)}"
              data-category="${escapeHtml(record.categoryId)}"
            >
              <div class="poi-identity">
                <span>${escapeHtml(record.project)} · ${escapeHtml(record.kind)} · ${escapeHtml(record.status)}</span>
                <h3>${escapeHtml(record.name)}</h3>
                <code>${escapeHtml(record.externalId)}</code>
                ${record.parentName ? `<small>Inside ${escapeHtml(record.parentName)}</small>` : ''}
              </div>
              <div class="poi-coordinate">
                <span>${escapeHtml(record.reference.type)}</span>
                <strong>${escapeHtml(record.reference.display)}</strong>
                <button type="button" data-copy="${escapeHtml(record.reference.tp)}">${escapeHtml(record.reference.tp)}</button>
              </div>
              <div class="poi-extent">
                <span>${escapeHtml(record.geometry.type)} geometry</span>
                <code>${escapeHtml(record.geometry.display)}</code>
                <small>${escapeHtml(record.reference.note)}</small>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}).join('');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>IANLAN Points of Interest Coordinate Directory</title>
  <style>
    :root{color-scheme:dark;--bg:#07121b;--panel:#0d1c27;--line:#27404e;--ink:#eef6f7;--muted:#9eb0b8;--mint:#66d1bd;--gold:#e5b65d;--paper:#ece8dc}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% 0,#173946 0,transparent 34rem),var(--bg);color:var(--ink);font:14px/1.5 Inter,system-ui,sans-serif}
    header,.filters,.category-grid,.directory-group,footer{width:min(1460px,calc(100% - 40px));margin-inline:auto}
    header{padding:72px 0 44px}.eyebrow{color:var(--mint);font:800 11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em}
    h1{max-width:12ch;margin:13px 0 24px;font-size:clamp(52px,8vw,116px);line-height:.88;letter-spacing:-.075em}header>p{max-width:770px;color:#b1c0c7;font-size:16px;line-height:1.75}
    .source{display:flex;gap:8px;flex-wrap:wrap;margin-top:26px}.source span{padding:7px 10px;border:1px solid var(--line);border-radius:99px;color:var(--muted);font-size:11px}
    .filters{position:sticky;top:0;z-index:5;padding:14px;display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;background:rgba(7,18,27,.94);border:1px solid var(--line);backdrop-filter:blur(16px)}
    input,select,button{font:inherit}input,select{width:100%;padding:11px 12px;color:var(--ink);background:#081720;border:1px solid var(--line);border-radius:8px}button{cursor:pointer}
    #result-count{align-self:center;text-align:right;color:var(--gold);font-weight:800;white-space:nowrap}
    .category-grid{padding:18px 0 70px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.category-card{min-height:180px;padding:20px;text-align:left;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:13px}
    .category-card strong,.category-card span,.category-card small{display:block}.category-card strong{color:var(--gold);font-size:34px}.category-card span{margin-top:24px;font-size:17px;font-weight:800}.category-card small{margin-top:7px;color:var(--muted)}
    .directory-group{padding:72px 0}.group-heading{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end;margin-bottom:25px}.group-heading div{display:flex;gap:17px;align-items:baseline}.group-heading span{color:var(--mint);font:800 11px ui-monospace,monospace}.group-heading h2{margin:0;font-size:clamp(36px,5vw,72px);letter-spacing:-.06em}.group-heading p{margin:0;color:var(--muted);max-width:650px}
    .rows{border-top:1px solid var(--line)}.poi-row{display:grid;grid-template-columns:1.2fr .85fr 1.15fr;gap:24px;padding:17px 10px;border-bottom:1px solid var(--line);break-inside:avoid}.poi-row[hidden],.directory-group[hidden]{display:none}
    .poi-row span{color:var(--muted);font:700 9px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.poi-identity h3{margin:5px 0 3px;font-size:15px}.poi-identity code,.poi-extent code{color:#9db3bd;font-size:10px;overflow-wrap:anywhere}.poi-identity small,.poi-extent small{display:block;margin-top:5px;color:#758d98;font-size:10px}
    .poi-coordinate strong{display:block;margin:5px 0;color:var(--gold);font:700 18px ui-monospace,monospace}.poi-coordinate button{max-width:100%;padding:5px 8px;color:var(--mint);background:#07121b;border:1px solid var(--line);border-radius:5px;font:10px ui-monospace,monospace;overflow-wrap:anywhere}
    .poi-extent code{display:block;margin-top:6px}footer{padding:60px 0 90px;color:var(--muted);border-top:1px solid var(--line)}
    @media(max-width:800px){.filters{position:static;grid-template-columns:1fr}.category-grid{grid-template-columns:1fr 1fr}.group-heading,.poi-row{grid-template-columns:1fr}.poi-row{gap:13px}.group-heading{gap:16px}}
    @media(max-width:520px){header,.filters,.category-grid,.directory-group,footer{width:calc(100% - 28px)}.category-grid{grid-template-columns:1fr}}
    @media print{body{color:#111;background:#fff;font-size:8pt}header,.directory-group,footer{width:100%}.filters,.category-grid,.poi-coordinate button{display:none!important}header{padding:0 0 20px}h1{font-size:34pt}.source span{color:#333;border-color:#aaa}.directory-group{padding:22px 0}.group-heading{margin-bottom:10px}.group-heading h2{font-size:24pt}.group-heading p,.poi-row span,.poi-identity small,.poi-extent small{color:#555}.poi-row{grid-template-columns:1.15fr .8fr 1.2fr;padding:7px 3px;border-color:#ccc}.poi-coordinate strong{color:#111;font-size:10pt}.poi-identity code,.poi-extent code{color:#333}.directory-group{break-before:page}.directory-group:first-of-type{break-before:auto}}
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">IANLAN NextGen · Report 04 · ${escapeHtml(summary.generatedAt.slice(0, 10))}</p>
    <h1>Every place.<br>One coordinate.</h1>
    <p>A searchable directory of all ${records.length.toLocaleString()} cataloged points and places of interest, including the named PassageWay underground system. Copy-ready commands are reference coordinates—not a promise that the destination is a safe arrival block.</p>
    <div class="source">
      <span>${records.length.toLocaleString()} records</span>
      <span>${summary.counts.projects} projects</span>
      <span>${summary.counts.exactOrAuthoredReferences} authored/exact references</span>
      <span>${summary.counts.derivedReferences} derived centers</span>
      <span>snapshot ${snapshot.sha256.slice(0, 16)}…</span>
    </div>
  </header>
  <div class="filters">
    <input id="search" type="search" placeholder="Search name, ID, project, coordinates, or /tp…" aria-label="Search directory">
    <select id="project"><option value="">All projects</option>${projectOptions}</select>
    <select id="kind"><option value="">All kinds</option>${kindOptions}</select>
    <div id="result-count">${records.length.toLocaleString()} shown</div>
  </div>
  <div class="category-grid">${categoryCards}</div>
  <main>${categorySections}</main>
  <footer>
    <strong>Coordinate truth boundary</strong>
    <p>${escapeHtml(summary.truthBoundary.tp)} ${escapeHtml(summary.truthBoundary.missingY)} No world edits were made.</p>
  </footer>
  <script>
    const rows=[...document.querySelectorAll('.poi-row')];
    const groups=[...document.querySelectorAll('.directory-group')];
    const search=document.querySelector('#search');
    const project=document.querySelector('#project');
    const kind=document.querySelector('#kind');
    const count=document.querySelector('#result-count');
    let category='';
    const apply=()=>{
      const query=search.value.trim().toLowerCase();
      let visible=0;
      rows.forEach((row)=>{
        const show=(!query||row.dataset.search.includes(query))
          &&(!project.value||row.dataset.project===project.value)
          &&(!kind.value||row.dataset.kind===kind.value)
          &&(!category||row.dataset.category===category);
        row.hidden=!show;if(show)visible+=1;
      });
      groups.forEach((group)=>{group.hidden=![...group.querySelectorAll('.poi-row')].some((row)=>!row.hidden)});
      count.textContent=visible.toLocaleString()+' shown';
    };
    [search,project,kind].forEach((element)=>element.addEventListener('input',apply));
    document.querySelectorAll('[data-category-button]').forEach((button)=>button.addEventListener('click',()=>{
      category=category===button.dataset.categoryButton?'':button.dataset.categoryButton;
      apply();
      document.querySelector('main').scrollIntoView({behavior:'smooth'});
    }));
    document.addEventListener('click',async(event)=>{
      const button=event.target.closest('[data-copy]');if(!button)return;
      const original=button.textContent;
      try{await navigator.clipboard.writeText(button.dataset.copy);button.textContent='Copied';}
      catch{button.textContent='Copy unavailable';}
      setTimeout(()=>{button.textContent=original},1200);
    });
  </script>
</body>
</html>`;
fs.writeFileSync(
  path.join(OUT, 'poi-coordinate-directory.html'),
  `${html.replace(/[ \t]+$/gm, '')}\n`,
);

writeJson(path.join(OUT, 'artifact-manifest.pre-pdf.json'), {
  schemaVersion: 1,
  id: summary.id,
  generatedAt: summary.generatedAt,
  source: summary.source,
  expected: {
    records: records.length,
    uniqueIds: new Set(records.map((record) => record.id)).size,
    categoryTotal: Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
  },
  artifacts: [
    'poi-coordinate-directory.html',
    'poi-coordinate-directory.json',
    'poi-coordinate-directory.csv',
    'portal-summary.json',
  ].map((filename) => ({
    path: filename,
    bytes: fs.statSync(path.join(OUT, filename)).size,
    sha256: sha256File(path.join(OUT, filename)),
  })),
});

process.stdout.write(`${JSON.stringify({
  out: path.relative(ROOT, OUT),
  records: records.length,
  categories: categoryCounts,
  projects: projectCounts,
  snapshotSha256: snapshot.sha256,
}, null, 2)}\n`);
