#!/usr/bin/env node
/**
 * Generate the IANLAN NextGen underground navigation report.
 *
 * This is a read-only reporting workflow. It reads the accepted world catalog,
 * immutable release evidence, authored route manifests, and already-rendered
 * terminal-snapshot media. It never connects to Minecraft, RCON, the fleet API,
 * systemd, Railway, Sites, or Box.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { createCanvas, loadImage } from 'canvas';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-underground-navigation',
);
const MAPS = path.join(OUT, 'maps');
const SCREENSHOTS = path.join(OUT, 'screenshots');
const WORLD_DB = path.join(ROOT, 'data/world-map.db');
const C01_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'c01-bunker-classification-manifest.json',
);
const OWNER_SCHEDULE = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json',
);
const LIBRARY_GUILD_SCHEDULE = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json',
);
const TERMINAL_SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);

const COLORS = {
  background: '#07111e',
  panel: '#0e1c2b',
  ink: '#e9f1f7',
  muted: '#9fb2c3',
  grid: '#243649',
  raven: '#d7a449',
  mainstreet: '#43a5d9',
  civic: '#68c49a',
  owner: '#d46fb1',
  c01: '#ec6b62',
  westlight: '#8c78d8',
  data: '#58c1c8',
  entrance: '#f1d36a',
  warning: '#f09a57',
  surface: '#718195',
};

const SYSTEM_LABELS = {
  'raven-rock': 'Raven Rock / Site R',
  'mainstreet-secure': 'MainStreet mountain secure complex',
  'ravensreach-civic': 'Ravensreach civic underground',
  'owner-corridor': 'Gilded Raven / owner corridor',
  'c01-east': 'Cataloged C01 east stack',
  westlight: 'Westlight below-grade venues',
  'road-bunkers': 'Approach-road and oasis bunkers',
  'data-district': 'Iowa data district / Concord',
};

fs.mkdirSync(MAPS, { recursive: true });
fs.mkdirSync(SCREENSHOTS, { recursive: true });

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function geometryYRange(geometry) {
  const values = [];
  if (Number.isFinite(geometry?.minY)) values.push(geometry.minY);
  if (Number.isFinite(geometry?.maxY)) values.push(geometry.maxY);
  if (Number.isFinite(geometry?.position?.y)) values.push(geometry.position.y);
  for (const point of geometry?.points ?? []) {
    if (Number.isFinite(point?.y)) values.push(point.y);
  }
  return values.length
    ? { minY: Math.min(...values), maxY: Math.max(...values) }
    : { minY: null, maxY: null };
}

function geometryBounds(geometry) {
  if (geometry?.type === 'bounds') {
    return {
      minX: geometry.minX,
      maxX: geometry.maxX,
      minZ: geometry.minZ,
      maxZ: geometry.maxZ,
    };
  }
  if (geometry?.type === 'point') {
    return {
      minX: geometry.position.x,
      maxX: geometry.position.x,
      minZ: geometry.position.z,
      maxZ: geometry.position.z,
    };
  }
  if (geometry?.type === 'path' && geometry.points?.length) {
    return {
      minX: Math.min(...geometry.points.map((point) => point.x)),
      maxX: Math.max(...geometry.points.map((point) => point.x)),
      minZ: Math.min(...geometry.points.map((point) => point.z)),
      maxZ: Math.max(...geometry.points.map((point) => point.z)),
    };
  }
  return null;
}

function featureSystem(feature) {
  const id = feature.externalId ?? '';
  if (feature.projectId === 'raven-rock') return 'raven-rock';
  if (feature.projectId === 'ravensreach') return 'ravensreach-civic';
  if (feature.projectId === 'westlight-venue') return 'westlight';
  if (
    feature.projectId === 'mainstreet-america'
    && /^(C01|U01|OBS-S01|APT-S01|SAFE-S01|SHL-S01|FAL-S01|COM-S01|VLT-S01|SAFE-U01|VLT-G01|ROUTE:)/.test(id)
  ) return 'mainstreet-secure';
  if (/^(c01_|TE-C01)/i.test(id)) return 'c01-east';
  if (
    /^(GRT-|OBS-OWNER|OWNER-|RRCH-GILDED|TE-(OWNER|OBS-OWNER|RRCH-GILDED))/.test(id)
  ) return 'owner-corridor';
  if (/^TE-(LIB-GUILD|GUILDHALL|LIBRARY|RR-MODERN)/.test(id)) {
    return 'ravensreach-civic';
  }
  if (/^TE-(WL-|WESTLIGHT-)/.test(id)) return 'westlight';
  if (/^TE-(OASIS-BUNKER|PAN-)/.test(id)) return 'road-bunkers';
  if (/^TE-IA-/.test(id)) return 'data-district';
  if (/^TE-MSA-/.test(id)) return 'mainstreet-secure';
  return 'mainstreet-secure';
}

function loadWorldFeatures() {
  const db = new Database(WORLD_DB, {
    readonly: true,
    fileMustExist: true,
  });
  const rows = db.prepare(`
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
      source_ref,
      min_x,
      max_x,
      min_z,
      max_z
    FROM world_features
    ORDER BY project_id, external_id, name
  `).all();
  db.close();
  return rows.map((row) => {
    const geometry = safeJson(row.geometry_json, {});
    const y = geometryYRange(geometry);
    const tags = safeJson(row.tags_json, []);
    const attributes = safeJson(row.attributes_json, {});
    return {
      id: row.id,
      projectId: row.project_id,
      externalId: row.external_id,
      parentId: row.parent_id,
      name: row.name,
      kind: row.kind,
      status: row.status,
      geometry,
      bounds2d: geometryBounds(geometry),
      ...y,
      tags,
      attributes,
      source: row.source,
      sourceRef: row.source_ref,
      databaseBounds: {
        minX: row.min_x,
        maxX: row.max_x,
        minZ: row.min_z,
        maxZ: row.max_z,
      },
    };
  });
}

const allFeatures = loadWorldFeatures();
const byId = new Map(allFeatures.map((feature) => [feature.id, feature]));

function hasAncestorExternalId(feature, matcher) {
  let parentId = feature.parentId;
  const seen = new Set();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    if (matcher.test(parent.externalId ?? '')) return true;
    parentId = parent.parentId;
  }
  return false;
}

function isUndergroundFeature(feature) {
  const id = feature.externalId ?? '';
  const text = [
    id,
    feature.name,
    feature.kind,
    ...feature.tags,
    JSON.stringify(feature.attributes),
  ].join(' ');

  if (feature.projectId === 'raven-rock') return true;
  if (
    feature.projectId === 'ravensreach'
    && (/^(RRCH-MOOT|RRCH-LIBRARY)/.test(id)
      || hasAncestorExternalId(feature, /^(RRCH-MOOT|RRCH-LIBRARY)$/))
  ) return true;
  if (
    feature.projectId === 'westlight-venue'
    && (/^(WL-THEATRE|WL-CLUB|WL-BOWL)/.test(id)
      || hasAncestorExternalId(feature, /^(WL-THEATRE|WL-CLUB|WL-BOWL)$/))
  ) return true;
  if (
    feature.projectId === 'mainstreet-america'
    && (
      /^(C01|U01|OBS-S01|APT-S01|SAFE-S01|SHL-S01|FAL-S01|COM-S01|VLT-S01|SAFE-U01|VLT-G01|ROUTE:(C01|APT-SHELTER|SHELTER-GRAND-VAULT|GRAND-VAULT-STAIRS|OBS-PENTHOUSE|OBS-PUBLIC|OFFICE-HELIPORT))/.test(id)
      || hasAncestorExternalId(
        feature,
        /^(C01|OBS-S01|APT-S01|SHL-S01|VLT-G01)$/,
      )
    )
  ) return true;
  if (
    feature.projectId === 'town-expansion-r1'
    && /^(GRT-|OBS-OWNER|OWNER-|RRCH-GILDED|TE-(OWNER|OBS-OWNER|RRCH-GILDED|LIB-GUILD|GUILDHALL|LIBRARY|MSA-UW|MSA-B01|OASIS-BUNKER|IA-INFO|IA-HOLDOUT-HOME-SHELTER|IA-CONCORD|WL-VENUE-BASEMENTS|WL-FREIGHT|WL-LANTERN|RR-MODERN)|c01_)/i.test(id)
  ) return true;
  return (
    feature.minY !== null
    && feature.minY < 55
    && /(underground|tunnel|bunker|basement|cellar|vault|shelter|sanctum|cavern|owner|adult|club|theatre|theater|warehouse)/i.test(text)
  );
}

const undergroundFeatures = allFeatures
  .filter(isUndergroundFeature)
  .map((feature) => ({
    ...feature,
    system: featureSystem(feature),
  }));

const c01 = readJson(C01_MANIFEST);
const ownerSchedule = readJson(OWNER_SCHEDULE);
const libraryGuild = readJson(LIBRARY_GUILD_SCHEDULE);

const c01NodeById = new Map(
  c01.routeGraph.nodes.map((node) => [node.id, node]),
);
const c01NodeBySpace = new Map(
  c01.routeGraph.nodes.map((node) => [node.spaceId, node]),
);
const c01Spaces = c01.levels.flatMap((level) => level.spaces.map((space) => {
  const node = c01NodeBySpace.get(space.id);
  return {
    id: space.id,
    levelId: level.id,
    mainLevel: level.mainLevel,
    category: space.category,
    point: node?.point ?? null,
    tags: node?.tags ?? [],
    accessClasses: node?.accessClasses ?? [],
  };
}));

const venuePattern = /\b(bar|pub|taproom|tavern|lounge|club|cabaret|adult|salon|theatre|theater|dance|brew|motel|tasting)\b/i;
const venueFeatures = allFeatures.filter((feature) => venuePattern.test([
  feature.externalId,
  feature.name,
  ...feature.tags,
].join(' ')));
const c01VenueSpaces = c01Spaces.filter((space) => venuePattern.test([
  space.id,
  ...space.tags,
].join(' ')));

function getFeature(projectId, externalId) {
  return allFeatures.find(
    (feature) => feature.projectId === projectId
      && feature.externalId === externalId,
  ) ?? null;
}

function pointForFeature(projectId, externalId, yPreference = 'max') {
  const feature = getFeature(projectId, externalId);
  if (!feature) return null;
  const geometry = feature.geometry;
  if (geometry.type === 'point') {
    return [geometry.position.x, geometry.position.y, geometry.position.z];
  }
  if (geometry.type === 'path' && geometry.points?.length) {
    const point = yPreference === 'min'
      ? geometry.points.reduce((a, b) => (a.y < b.y ? a : b))
      : geometry.points.reduce((a, b) => (a.y > b.y ? a : b));
    return [point.x, point.y, point.z];
  }
  if (geometry.type === 'bounds') {
    return [
      Math.round((geometry.minX + geometry.maxX) / 2),
      yPreference === 'min' ? geometry.minY : geometry.maxY,
      Math.round((geometry.minZ + geometry.maxZ) / 2),
    ];
  }
  return null;
}

function tunnelEndpoint(label) {
  const endpoints = libraryGuild.isolatedLibraryGuildTunnel.soleEndpoints ?? [];
  const match = endpoints.find((endpoint) => (
    JSON.stringify(endpoint).toLowerCase().includes(label.toLowerCase())
  ));
  const bounds = match?.bounds;
  return Array.isArray(bounds)
    ? [
        Math.round((bounds[0] + bounds[3]) / 2),
        Math.round((bounds[1] + bounds[4]) / 2),
        Math.round((bounds[2] + bounds[5]) / 2),
      ]
    : null;
}

const entrances = [
  {
    id: 'E-RR-N3',
    name: 'Raven Rock south personnel portal',
    system: 'raven-rock',
    point: pointForFeature('raven-rock', 'RR-N3'),
    access: 'personnel',
    certainty: 'cataloged exact point',
    route: 'RR-T2a → T2b → Cavern B',
  },
  {
    id: 'E-RR-N4',
    name: 'Raven Rock north vehicle portal',
    system: 'raven-rock',
    point: pointForFeature('raven-rock', 'RR-N4'),
    access: 'vehicle',
    certainty: 'cataloged exact point',
    route: 'RR-T1a → T1b → Cavern A',
  },
  {
    id: 'E-RR-N5',
    name: 'Raven Rock east portal',
    system: 'raven-rock',
    point: pointForFeature('raven-rock', 'RR-N5'),
    access: 'mixed',
    certainty: 'cataloged exact point',
    route: 'RR-T3a → T3b → Cavern A',
  },
  {
    id: 'E-RR-N6',
    name: 'Raven Rock west utility portal',
    system: 'raven-rock',
    point: pointForFeature('raven-rock', 'RR-N6'),
    access: 'utility',
    certainty: 'cataloged exact point',
    route: 'RR-T4 → Cavern C',
  },
  {
    id: 'E-RR-Z5',
    name: 'Raven Rock RR-Z5 surface headhouse',
    system: 'raven-rock',
    point: pointForFeature('raven-rock', 'RR-Z5'),
    access: 'stairs / shaft',
    certainty: 'cataloged structure centroid',
    route: '15 switchback flights → RR-S1',
  },
  {
    id: 'E-C01-LEGACY-PUBLIC',
    name: 'Legacy MainStreet C01 recessed public portal',
    system: 'mainstreet-secure',
    point: pointForFeature(
      'mainstreet-america',
      'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
    ),
    access: 'public',
    certainty: 'accepted legacy portal geometry',
    route: 'dogleg connector → hangar / arena / lower operations',
  },
  {
    id: 'E-C01-EAST-CATALOG',
    name: 'Cataloged C01 east grand security entry',
    system: 'c01-east',
    point: c01NodeById.get('NODE-l1-grand-security-entry')?.point ?? null,
    access: 'cataloged public interior arrival',
    certainty: 'CONTESTED — surface road, relocation, and sunken arrival require field verification (ISSUE-002)',
    route: 'L1 security entry → seven-level internal route graph',
  },
  {
    id: 'E-C01-EAST-EGRESS-W',
    name: 'Cataloged C01 east independent egress west control',
    system: 'c01-east',
    point: c01NodeById.get('NODE-l5-independent-egress-west')?.point ?? null,
    access: 'owner / emergency',
    certainty: 'deep internal egress node; surface endpoint not independently verified',
    route: 'L5 power/escape level',
  },
  {
    id: 'E-C01-EAST-EGRESS-E',
    name: 'Cataloged C01 east independent egress east control',
    system: 'c01-east',
    point: c01NodeById.get('NODE-l5-independent-egress-east')?.point ?? null,
    access: 'owner / emergency',
    certainty: 'deep internal egress node; surface endpoint not independently verified',
    route: 'L5 power/escape level',
  },
  {
    id: 'E-GILDED-DESCENT',
    name: 'Gilded Raven owner grand descent',
    system: 'owner-corridor',
    point: [-10, 67, -391],
    access: 'owner',
    certainty: 'authored and post-release cataloged',
    route: 'theatre → y-44 owner corridor',
  },
  {
    id: 'E-OBS-ASCENT',
    name: 'Observatory east owner ascent',
    system: 'owner-corridor',
    point: [363, 112, 165],
    access: 'owner',
    certainty: 'authored and post-release cataloged',
    route: 'owner corridor → owner estate arrival gallery',
  },
  {
    id: 'E-LIBRARY-SECRET',
    name: 'Library concealed archive-tunnel endpoint',
    system: 'ravensreach-civic',
    point: tunnelEndpoint('library') ?? [-111, 60, -435],
    access: 'concealed civic',
    certainty: 'bounded endpoint; exact door should be read in-world',
    route: 'library → isolated archive tunnel → Guild Hall',
  },
  {
    id: 'E-GUILD-SECRET',
    name: 'Guild Hall concealed archive-tunnel endpoint',
    system: 'ravensreach-civic',
    point: tunnelEndpoint('guild') ?? [-58, 60, -435],
    access: 'concealed civic',
    certainty: 'bounded endpoint; exact door should be read in-world',
    route: 'Guild Hall → isolated archive tunnel → library',
  },
  {
    id: 'E-MOOT',
    name: 'Moot Hall vertical underground circulation',
    system: 'ravensreach-civic',
    point: pointForFeature('ravensreach', 'RRCH-MOOT'),
    access: 'building-contained stairs',
    certainty: 'cataloged circulation envelope; use Moot Hall entrance in-world',
    route: 'surface hall → B1/B2 → sanctum',
  },
  {
    id: 'E-LIBRARY',
    name: 'Civic Library vertical underground circulation',
    system: 'ravensreach-civic',
    point: pointForFeature('ravensreach', 'RRCH-LIBRARY'),
    access: 'building-contained stairs',
    certainty: 'cataloged circulation envelope; use library entrance in-world',
    route: 'entrance hall → stacks → archives → rare-book vault',
  },
  {
    id: 'E-WL-THEATRE',
    name: 'Westlight below-grade theatre circulation',
    system: 'westlight',
    point: pointForFeature('westlight-venue', 'WL-THEATRE'),
    access: 'public venue',
    certainty: 'cataloged building centroid; follow venue doors and stairs',
    route: 'upper lobby → parterre → lower lobby/backstage',
  },
  {
    id: 'E-WL-CLUB',
    name: 'Westlight members club circulation',
    system: 'westlight',
    point: pointForFeature('westlight-venue', 'WL-CLUB'),
    access: 'members',
    certainty: 'cataloged building centroid; follow venue doors and stairs',
    route: 'club landing → lounge / bar / dance floor',
  },
  {
    id: 'E-OASIS',
    name: 'Approach-road oasis mini-bunker',
    system: 'road-bunkers',
    point: pointForFeature('town-expansion-r1', 'TE-OASIS-BUNKER-01'),
    access: 'roadside',
    certainty: 'cataloged object centroid; surface threshold requires in-world reading',
    route: 'oasis surface arrival → bunker interior',
  },
  {
    id: 'E-WAREHOUSE',
    name: 'MainStreet underground warehouse dry core',
    system: 'mainstreet-secure',
    point: pointForFeature('town-expansion-r1', 'TE-MSA-UW01-DRY-CORE'),
    access: 'service / logistics',
    certainty: 'cataloged object centroid; exact ramp/door requires in-world reading',
    route: 'MainStreet service area → dry core / east wings',
  },
  {
    id: 'E-SHELTER',
    name: 'Private mountain shelter via penthouse safe-room stair',
    system: 'mainstreet-secure',
    point: [207, 104, 146],
    access: 'private',
    certainty: 'cataloged route endpoint',
    route: 'penthouse safe room → shelter → grand vault',
  },
  {
    id: 'E-INFO',
    name: 'Iowa underground information / continuity annex',
    system: 'data-district',
    point: pointForFeature('town-expansion-r1', 'TE-IA-INFO-ANNEX'),
    access: 'controlled',
    certainty: 'cataloged object centroid; exact surface door requires in-world reading',
    route: 'data campus → underground annex',
  },
  {
    id: 'E-HOLDOUT',
    name: 'Holdout-home shelter access',
    system: 'data-district',
    point: pointForFeature(
      'town-expansion-r1',
      'TE-IA-HOLDOUT-HOME-SHELTER',
    ),
    access: 'private residence',
    certainty: 'cataloged object centroid; exact hatch/door requires in-world reading',
    route: 'holdout home → private shelter',
  },
];

function systemColor(system) {
  return {
    'raven-rock': COLORS.raven,
    'mainstreet-secure': COLORS.mainstreet,
    'ravensreach-civic': COLORS.civic,
    'owner-corridor': COLORS.owner,
    'c01-east': COLORS.c01,
    westlight: COLORS.westlight,
    'road-bunkers': COLORS.warning,
    'data-district': COLORS.data,
  }[system] ?? COLORS.surface;
}

function shortLabel(feature) {
  const id = feature.externalId ?? feature.id;
  return id
    .replace(/^TE-/, '')
    .replace(/^C01-/, '')
    .replace(/^RR-/, '');
}

function fitCanvasText(ctx, value, maxWidth) {
  const text = String(value ?? '');
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function drawGeoMap({
  filename,
  title,
  subtitle,
  bounds,
  features,
  entranceRecords = [],
  customPaths = [],
  width = 1800,
  height = 1250,
  showFeatureLabels = true,
  showEntranceLabels = true,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 110, right: 60, top: 150, bottom: 155 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanZ = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min(plotWidth / spanX, plotHeight / spanZ);
  const usedWidth = spanX * scale;
  const usedHeight = spanZ * scale;
  const offsetX = margin.left + (plotWidth - usedWidth) / 2;
  const offsetY = margin.top + (plotHeight - usedHeight) / 2;
  const project = (x, z) => [
    offsetX + (x - bounds.minX) * scale,
    offsetY + (z - bounds.minZ) * scale,
  ];

  ctx.strokeStyle = COLORS.grid;
  ctx.fillStyle = COLORS.muted;
  ctx.font = '18px DejaVu Sans';
  ctx.lineWidth = 1;
  const grid = spanX > 900 ? 200 : spanX > 400 ? 100 : spanX > 180 ? 50 : 20;
  for (
    let x = Math.ceil(bounds.minX / grid) * grid;
    x <= bounds.maxX;
    x += grid
  ) {
    const [px] = project(x, bounds.minZ);
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + usedHeight);
    ctx.stroke();
    ctx.fillText(`x ${x}`, px + 5, offsetY + usedHeight + 28);
  }
  for (
    let z = Math.ceil(bounds.minZ / grid) * grid;
    z <= bounds.maxZ;
    z += grid
  ) {
    const [, py] = project(bounds.minX, z);
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + usedWidth, py);
    ctx.stroke();
    ctx.fillText(`z ${z}`, 18, py + 6);
  }

  const drawPath = (points, color, lineWidth = 6, dashed = false) => {
    if (!points?.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dashed ? [14, 10] : []);
    ctx.beginPath();
    points.forEach((point, index) => {
      const [x, y] = project(point.x ?? point[0], point.z ?? point[2] ?? point[1]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const ordered = [...features].sort((a, b) => (
    (a.geometry.type === 'bounds' ? 0 : 1)
      - (b.geometry.type === 'bounds' ? 0 : 1)
  ));
  for (const feature of ordered) {
    const color = systemColor(feature.system ?? featureSystem(feature));
    const geometry = feature.geometry;
    if (geometry.type === 'bounds') {
      const [x1, y1] = project(geometry.minX, geometry.minZ);
      const [x2, y2] = project(geometry.maxX, geometry.maxZ);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1, Math.max(4, x2 - x1), Math.max(4, y2 - y1));
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, Math.max(4, x2 - x1), Math.max(4, y2 - y1));
      ctx.globalAlpha = 1;
      if (
        showFeatureLabels
        && ((x2 - x1) > 32 || (y2 - y1) > 24)
      ) {
        ctx.fillStyle = COLORS.ink;
        ctx.font = 'bold 16px DejaVu Sans';
        ctx.fillText(shortLabel(feature), x1 + 5, y1 + 20);
      }
    } else if (geometry.type === 'path') {
      drawPath(geometry.points, color, Math.max(4, (geometry.width ?? 2) * 1.7));
    } else if (geometry.type === 'point') {
      const [x, y] = project(geometry.position.x, geometry.position.z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      if (showFeatureLabels) {
        ctx.fillStyle = COLORS.ink;
        ctx.font = 'bold 15px DejaVu Sans';
        ctx.fillText(shortLabel(feature), x + 10, y - 8);
      }
    }
  }

  for (const item of customPaths) {
    drawPath(
      item.points,
      item.color ?? systemColor(item.system),
      item.width ?? 7,
      item.dashed,
    );
    if (item.label && item.points?.length) {
      const point = item.points[Math.floor(item.points.length / 2)];
      const [x, y] = project(point[0], point[2] ?? point[1]);
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 17px DejaVu Sans';
      ctx.fillText(item.label, x + 8, y - 8);
    }
  }

  for (const entrance of entranceRecords) {
    if (!entrance.point) continue;
    const [x, y] = project(entrance.point[0], entrance.point[2]);
    if (
      entrance.point[0] < bounds.minX
      || entrance.point[0] > bounds.maxX
      || entrance.point[2] < bounds.minZ
      || entrance.point[2] > bounds.maxZ
    ) continue;
    ctx.fillStyle = COLORS.entrance;
    ctx.strokeStyle = COLORS.background;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.background;
    ctx.font = 'bold 12px DejaVu Sans';
    ctx.textAlign = 'center';
    ctx.fillText('E', x, y + 4);
    ctx.textAlign = 'left';
    if (showEntranceLabels) {
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 14px DejaVu Sans';
      ctx.fillText(entrance.id.replace(/^E-/, ''), x + 13, y + 5);
    }
  }

  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 34px DejaVu Sans';
  ctx.fillText(title, 70, 58);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '19px DejaVu Sans';
  ctx.fillText(subtitle, 70, 92);
  ctx.fillText('North is up (−Z). East is right (+X).', 70, 120);

  ctx.fillStyle = COLORS.entrance;
  ctx.beginPath();
  ctx.moveTo(width - 96, 105);
  ctx.lineTo(width - 76, 145);
  ctx.lineTo(width - 116, 145);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 18px DejaVu Sans';
  ctx.fillText('N', width - 103, 95);

  const legend = [...new Set(features.map(
    (feature) => feature.system ?? featureSystem(feature),
  ))];
  let legendX = 72;
  let legendY = height - 73;
  for (const system of legend) {
    const label = SYSTEM_LABELS[system] ?? system;
    ctx.font = '15px DejaVu Sans';
    const itemWidth = ctx.measureText(label).width + 70;
    if (legendX + itemWidth > width - 65) {
      legendX = 72;
      legendY += 29;
    }
    ctx.fillStyle = systemColor(system);
    ctx.fillRect(legendX, legendY - 12, 22, 14);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '15px DejaVu Sans';
    ctx.fillText(label, legendX + 30, legendY);
    legendX += itemWidth;
  }

  const out = path.join(MAPS, filename);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

function drawSkywalkSchematic(filename) {
  const width = 1800;
  const height = 1450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 36px DejaVu Sans';
  ctx.fillText('Underground “Skywalk” Schematic', 65, 60);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '19px DejaVu Sans';
  ctx.fillText(
    'A legibility diagram: connections are topological, not to geographic scale.',
    65,
    94,
  );

  const clusters = [
    {
      x: 55,
      y: 130,
      w: 760,
      h: 430,
      system: 'raven-rock',
      title: 'Raven Rock / Site R',
      nodes: [
        ['N4 Vehicle', 100, 90],
        ['N3 Personnel', 100, 250],
        ['Cavern A', 330, 90],
        ['Cavern B', 330, 250],
        ['Cavern C', 540, 250],
        ['B1–B4', 530, 90],
        ['RR-Z5', 680, 90],
      ],
      edges: [
        [0, 2],
        [1, 3],
        [2, 3],
        [2, 5],
        [3, 4],
        [4, 5],
        [5, 6],
      ],
    },
    {
      x: 850,
      y: 130,
      w: 895,
      h: 430,
      system: 'owner-corridor',
      title: 'Gilded Raven → Owner Corridor → C01 East',
      nodes: [
        ['Gilded Raven', 80, 95],
        ['Grand descent', 245, 95],
        ['y−44 corridor', 420, 95],
        ['Sales office', 420, 235],
        ['Observatory ascent', 610, 95],
        ['C01 detour', 760, 95],
        ['Owner residence', 760, 225],
        ['Owner club', 610, 225],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [2, 4],
        [4, 5],
        [5, 6],
        [6, 7],
      ],
    },
    {
      x: 55,
      y: 600,
      w: 760,
      h: 330,
      system: 'ravensreach-civic',
      title: 'Ravensreach civic underground',
      nodes: [
        ['Library vaults', 110, 100],
        ['Secret archive tunnel', 355, 100],
        ['Guild Hall B1/B2', 620, 100],
        ['Moot Hall B1/B2', 355, 225],
      ],
      edges: [[0, 1], [1, 2]],
    },
    {
      x: 850,
      y: 600,
      w: 895,
      h: 330,
      system: 'mainstreet-secure',
      title: 'MainStreet mountain / logistics',
      nodes: [
        ['Legacy C01 portal', 90, 95],
        ['Hangar / arena', 285, 95],
        ['Lower operations', 485, 95],
        ['Penthouse safe room', 90, 220],
        ['Private shelter', 285, 220],
        ['Grand vault', 485, 220],
        ['UW01 warehouse', 735, 155],
      ],
      edges: [[0, 1], [1, 2], [3, 4], [4, 5]],
    },
    {
      x: 55,
      y: 970,
      w: 760,
      h: 360,
      system: 'westlight',
      title: 'Westlight below-grade venues',
      nodes: [
        ['Theatre', 100, 100],
        ['Venue basements', 325, 100],
        ['Freight route', 570, 100],
        ['Members club', 215, 235],
        ['Stadium service ring', 475, 235],
      ],
      edges: [[0, 1], [1, 2], [1, 3], [2, 4]],
    },
    {
      x: 850,
      y: 970,
      w: 895,
      h: 360,
      system: 'data-district',
      title: 'Road bunkers / Iowa district (separate sites)',
      nodes: [
        ['Oasis mini-bunker', 100, 100],
        ['Info annex', 325, 100],
        ['Holdout shelter', 550, 100],
        ['Concord bar', 220, 240],
        ['Concord theatre', 470, 240],
        ['C01 east L1–L5', 730, 175],
      ],
      edges: [],
    },
  ];

  for (const cluster of clusters) {
    const color = systemColor(cluster.system);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    ctx.fillRect(cluster.x, cluster.y, cluster.w, cluster.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(cluster.x, cluster.y, cluster.w, cluster.h);
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 23px DejaVu Sans';
    ctx.fillText(cluster.title, cluster.x + 22, cluster.y + 36);
    const points = cluster.nodes.map(([, x, y]) => [
      cluster.x + x,
      cluster.y + y + 40,
    ]);
    for (const [from, to] of cluster.edges) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(...points[from]);
      ctx.lineTo(...points[to]);
      ctx.stroke();
    }
    cluster.nodes.forEach(([label], index) => {
      const [x, y] = points[index];
      ctx.fillStyle = COLORS.panel;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 17px DejaVu Sans';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 48);
      ctx.textAlign = 'left';
    });
  }

  ctx.fillStyle = COLORS.warning;
  ctx.font = 'bold 18px DejaVu Sans';
  ctx.fillText(
    'No line between boxes means no verified tunnel connection.',
    65,
    1400,
  );
  const out = path.join(MAPS, filename);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

function drawC01Level(level, filename) {
  const nodes = c01.routeGraph.nodes.filter((node) => node.level === level.id);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = c01.routeGraph.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
  );
  const points = nodes.map((node) => node.point);
  const minX = Math.min(...points.map((point) => point[0]));
  const maxX = Math.max(...points.map((point) => point[0]));
  const minZ = Math.min(...points.map((point) => point[2]));
  const maxZ = Math.max(...points.map((point) => point[2]));
  const width = 1900;
  const height = 1500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 34px DejaVu Sans';
  ctx.fillText(level.id.replaceAll('-', ' '), 65, 58);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '19px DejaVu Sans';
  ctx.fillText(
    `Cataloged C01 room graph at y≈${nodes[0]?.point?.[1] ?? '—'}; north is up (−Z).`,
    65,
    92,
  );

  const mapBox = { x: 65, y: 135, w: 1080, h: 1280 };
  const pad = 70;
  const sx = (mapBox.w - pad * 2) / Math.max(1, maxX - minX);
  const sz = (mapBox.h - pad * 2) / Math.max(1, maxZ - minZ);
  const scale = Math.min(sx, sz);
  const px = (point) => mapBox.x + pad + (point[0] - minX) * scale;
  const py = (point) => mapBox.y + pad + (point[2] - minZ) * scale;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(mapBox.x, mapBox.y, mapBox.w, mapBox.h);
  ctx.strokeStyle = COLORS.grid;
  ctx.strokeRect(mapBox.x, mapBox.y, mapBox.w, mapBox.h);

  for (const edge of edges) {
    const from = c01NodeById.get(edge.from);
    const to = c01NodeById.get(edge.to);
    ctx.strokeStyle = edge.accessClasses?.includes('service')
      ? COLORS.warning
      : edge.accessClasses?.includes('owner')
        ? COLORS.owner
        : COLORS.c01;
    ctx.lineWidth = Math.max(3, Math.min(9, edge.width ?? 3));
    ctx.beginPath();
    ctx.moveTo(px(from.point), py(from.point));
    ctx.lineTo(px(to.point), py(to.point));
    ctx.stroke();
  }

  nodes.forEach((node, index) => {
    const color = node.accessClasses?.includes('service')
      ? COLORS.warning
      : node.accessClasses?.includes('owner')
        ? COLORS.owner
        : COLORS.c01;
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.background;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(node.point), py(node.point), 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 15px DejaVu Sans';
    ctx.fillText(String(index + 1), px(node.point) + 14, py(node.point) - 8);
  });

  const legendX = 1180;
  const columns = nodes.length > 28 ? 2 : 1;
  const perColumn = Math.ceil(nodes.length / columns);
  const columnWidth = (width - legendX - 50) / columns;
  nodes.forEach((node, index) => {
    const column = Math.floor(index / perColumn);
    const row = index % perColumn;
    const x = legendX + column * columnWidth;
    const y = 150 + row * 45;
    ctx.fillStyle = COLORS.c01;
    ctx.font = 'bold 17px DejaVu Sans';
    ctx.fillText(`${index + 1}.`, x, y);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '16px DejaVu Sans';
    const label = node.spaceId.replaceAll('-', ' ');
    const clipped = fitCanvasText(ctx, label, columnWidth - 42);
    ctx.fillText(clipped, x + 34, y);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '13px DejaVu Sans';
    const metadata = `${node.accessClasses?.join('/') || 'unclassified'} · `
      + `${node.tags?.slice(0, 2).join(', ') || 'route node'}`;
    ctx.fillText(fitCanvasText(ctx, metadata, columnWidth - 42), x + 34, y + 18);
  });

  ctx.fillStyle = COLORS.warning;
  ctx.font = 'bold 17px DejaVu Sans';
  ctx.fillText(
    'ISSUE-002: this cataloged east-stack graph does not prove the surface relocation, road, or sunken arrival.',
    65,
    1460,
  );
  const out = path.join(MAPS, filename);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

function drawC01Section(filename) {
  const width = 1800;
  const height = 1250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 36px DejaVu Sans';
  ctx.fillText('Cataloged C01 East — Vertical Navigation Stack', 65, 62);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '19px DejaVu Sans';
  ctx.fillText(
    'Seven occupied levels plus owner-tunnel interface; elevations are Minecraft Y.',
    65,
    98,
  );
  const levels = [...c01.levels].sort((a, b) => {
    const ay = c01.routeGraph.nodes.find((node) => node.level === a.id)?.point?.[1] ?? 0;
    const by = c01.routeGraph.nodes.find((node) => node.level === b.id)?.point?.[1] ?? 0;
    return by - ay;
  });
  const top = 160;
  const rowHeight = 130;
  levels.forEach((level, index) => {
    const nodes = c01.routeGraph.nodes.filter((node) => node.level === level.id);
    const yValue = nodes[0]?.point?.[1] ?? 0;
    const y = top + index * rowHeight;
    const color = /OWNER/.test(level.id) ? COLORS.owner : COLORS.c01;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fillRect(220, y, 1370, 86);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(220, y, 1370, 86);
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 23px DejaVu Sans';
    ctx.fillText(level.id.replaceAll('-', ' '), 250, y + 35);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '17px DejaVu Sans';
    ctx.fillText(
      `${level.spaces.length} spaces · ${nodes.length} graph nodes`,
      250,
      y + 65,
    );
    ctx.fillStyle = color;
    ctx.font = 'bold 25px DejaVu Sans';
    ctx.fillText(`Y ${yValue}`, 95, y + 50);
    if (index < levels.length - 1) {
      ctx.strokeStyle = COLORS.entrance;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(905, y + 86);
      ctx.lineTo(905, y + rowHeight);
      ctx.stroke();
      ctx.fillStyle = COLORS.entrance;
      ctx.font = '15px DejaVu Sans';
      ctx.fillText('stairs + lift', 920, y + 115);
    }
  });
  ctx.fillStyle = COLORS.warning;
  ctx.font = 'bold 18px DejaVu Sans';
  ctx.fillText(
    'Surface arrival remains contested under ISSUE-002; use this as an interior catalog, not proof of the east road.',
    65,
    1190,
  );
  const out = path.join(MAPS, filename);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

function compactFeature(feature) {
  return {
    id: feature.id,
    projectId: feature.projectId,
    externalId: feature.externalId,
    parentId: feature.parentId,
    name: feature.name,
    kind: feature.kind,
    status: feature.status,
    system: feature.system,
    minY: feature.minY,
    maxY: feature.maxY,
    geometry: feature.geometry,
    tags: feature.tags,
    source: feature.source,
    sourceRef: feature.sourceRef,
    media: (feature.attributes?.media ?? []).map((media) => ({
      mediaId: media.mediaId,
      path: media.path,
      sha256: media.sha256,
      width: media.width,
      height: media.height,
    })),
  };
}

const ravenMapFeatures = undergroundFeatures.filter((feature) => (
  feature.projectId === 'raven-rock'
  && (
    /^(RR-(T|C|S1$|N[3-6]$|Z5$|B[1-4]$))/.test(feature.externalId ?? '')
  )
));
const ownerMapFeatures = undergroundFeatures.filter((feature) => (
  feature.projectId === 'town-expansion-r1'
  && /^(TE-RRCH-GILDED-RAVEN|TE-OWNER-CITY-SALES-OFFICE|TE-OWNER-CORRIDOR-REST-|TE-LIB-GUILD|TE-GUILDHALL|TE-LIBRARY|c01_)/.test(feature.externalId ?? '')
));
const mainstreetMapFeatures = undergroundFeatures.filter((feature) => (
  (
    feature.projectId === 'mainstreet-america'
    && /^(C01$|C01-PUBLIC|ROUTE:C01|SHL-S01$|VLT-G01$|ROUTE:(APT-SHELTER|SHELTER-GRAND-VAULT|GRAND-VAULT-STAIRS))/.test(feature.externalId ?? '')
  )
  || (
    feature.projectId === 'town-expansion-r1'
    && /^TE-MSA-UW/.test(feature.externalId ?? '')
  )
));
const westlightMapFeatures = undergroundFeatures.filter((feature) => (
  (
    feature.projectId === 'westlight-venue'
    && /^(WL-(THEATRE|CLUB|BOWL))$/.test(feature.externalId ?? '')
  )
  || /^TE-WL-(VENUE-BASEMENTS|FREIGHT|LANTERN)/.test(feature.externalId ?? '')
));
const dataMapFeatures = undergroundFeatures.filter((feature) => (
  feature.projectId === 'town-expansion-r1'
  && /^(TE-IA-(INFO|HOLDOUT|CONCORD)|c01_)/.test(feature.externalId ?? '')
));
const overviewFeatures = [
  ...ravenMapFeatures,
  ...ownerMapFeatures,
  ...mainstreetMapFeatures,
  ...westlightMapFeatures,
  ...dataMapFeatures,
  ...undergroundFeatures.filter((feature) => (
    feature.externalId === 'TE-OASIS-BUNKER-01'
  )),
];

const ownerCenterline = ownerSchedule.ownerTunnel.centerline.map(
  ([x, y, z]) => [x, y, z],
);
const c01DetourWaypoints = (
  c01.ownerTunnelConnector.centerlineWaypointsXZ ?? []
).map((point) => (
  Array.isArray(point)
    ? [point[0], c01.ownerTunnelConnector.floorY, point[1]]
    : [point.x, c01.ownerTunnelConnector.floorY, point.z]
));

const mapFiles = [];
mapFiles.push(drawGeoMap({
  filename: '01-underground-world-overview.png',
  title: 'IANLAN Underground — Geographic Overview',
  subtitle: 'Cataloged systems, routes, rooms, bunkers, and access markers.',
  bounds: { minX: -470, maxX: 930, minZ: -670, maxZ: 330 },
  features: overviewFeatures,
  entranceRecords: entrances,
  customPaths: [
    {
      points: ownerCenterline,
      system: 'owner-corridor',
      width: 8,
      label: 'owner corridor y−44',
    },
    {
      points: c01DetourWaypoints,
      system: 'c01-east',
      width: 8,
      label: 'C01 owner detour',
    },
  ],
  showFeatureLabels: false,
  showEntranceLabels: false,
}));
mapFiles.push(drawSkywalkSchematic('02-underground-skywalk-schematic.png'));
mapFiles.push(drawGeoMap({
  filename: '03-raven-rock-network.png',
  title: 'Raven Rock / Site R — Tunnel Network',
  subtitle: 'Minecraft creative reconstruction; not a representation of any real classified interior.',
  bounds: { minX: -320, maxX: 320, minZ: -320, maxZ: 320 },
  features: ravenMapFeatures,
  entranceRecords: entrances.filter((entrance) => entrance.system === 'raven-rock'),
}));
mapFiles.push(drawGeoMap({
  filename: '04-ravensreach-worker-town-underground.png',
  title: 'Ravensreach / Worker Town Underground',
  subtitle: 'Civic vaults, isolated library–Guild tunnel, Gilded Raven descent, and owner corridor.',
  bounds: { minX: -180, maxX: 410, minZ: -480, maxZ: 220 },
  features: ownerMapFeatures.filter((feature) => feature.system !== 'c01-east'),
  entranceRecords: entrances.filter((entrance) => (
    ['ravensreach-civic', 'owner-corridor'].includes(entrance.system)
  )),
  customPaths: [{
    points: ownerCenterline,
    system: 'owner-corridor',
    width: 9,
    label: 'owner corridor y−44',
  }],
}));
mapFiles.push(drawGeoMap({
  filename: '05-mainstreet-mountain-and-logistics.png',
  title: 'MainStreet Mountain / Logistics Underground',
  subtitle: 'Legacy C01, private shelter–vault route, and underground warehouse.',
  bounds: { minX: 20, maxX: 300, minZ: 80, maxZ: 330 },
  features: mainstreetMapFeatures,
  entranceRecords: entrances.filter((entrance) => entrance.system === 'mainstreet-secure'),
}));
mapFiles.push(drawGeoMap({
  filename: '06-c01-east-cataloged-footprint.png',
  title: 'Cataloged C01 East Stack — Geographic Footprint',
  subtitle: 'Interior geometry is cataloged; relocation, road, parking recovery, and sunken surface arrival are contested.',
  bounds: { minX: 670, maxX: 930, minZ: -180, maxZ: 100 },
  features: ownerMapFeatures.filter((feature) => feature.system === 'c01-east'),
  entranceRecords: entrances.filter((entrance) => entrance.system === 'c01-east'),
  customPaths: [{
    points: c01DetourWaypoints,
    system: 'c01-east',
    width: 9,
    label: 'owner tunnel detour',
  }],
}));
mapFiles.push(drawGeoMap({
  filename: '07-westlight-underground-venues.png',
  title: 'Westlight Below-Grade Venues',
  subtitle: 'Theatre, members club, stadium service ring, basements, and freight support.',
  bounds: { minX: -470, maxX: -250, minZ: -670, maxZ: -430 },
  features: westlightMapFeatures,
  entranceRecords: entrances.filter((entrance) => entrance.system === 'westlight'),
}));
mapFiles.push(drawGeoMap({
  filename: '08-oasis-road-bunker.png',
  title: 'Approach Road — Oasis Mini-Bunker',
  subtitle: 'Roadside bunker object and its cataloged envelope.',
  bounds: { minX: -310, maxX: -160, minZ: -610, maxZ: -450 },
  features: undergroundFeatures.filter((feature) => (
    feature.externalId === 'TE-OASIS-BUNKER-01'
  )),
  entranceRecords: entrances.filter((entrance) => entrance.system === 'road-bunkers'),
}));
mapFiles.push(drawGeoMap({
  filename: '09-iowa-data-district-underground.png',
  title: 'Iowa Data District / Concord Underground',
  subtitle: 'Information annex, holdout shelter, Concord venues, and cataloged C01 east stack.',
  bounds: { minX: 560, maxX: 930, minZ: -560, maxZ: 30 },
  features: dataMapFeatures,
  entranceRecords: entrances.filter((entrance) => (
    ['data-district', 'c01-east'].includes(entrance.system)
  )),
  customPaths: [{
    points: c01DetourWaypoints,
    system: 'c01-east',
    width: 7,
    label: 'C01 owner detour',
  }],
}));
mapFiles.push(drawGeoMap({
  filename: '10-all-underground-entrances.png',
  title: 'All Cataloged Underground Entrances and Access Nodes',
  subtitle: 'Exact points where known; centroids and contested nodes are labeled in the report.',
  bounds: { minX: -470, maxX: 930, minZ: -670, maxZ: 330 },
  features: overviewFeatures.filter((feature) => (
    feature.geometry.type === 'path'
    || /PORTAL|Z5|DESCENT|ASCENT|SECRET|SHELTER|BUNKER/.test(feature.externalId ?? '')
  )),
  entranceRecords: entrances,
  customPaths: [
    { points: ownerCenterline, system: 'owner-corridor', width: 7 },
    { points: c01DetourWaypoints, system: 'c01-east', width: 7 },
  ],
}));
mapFiles.push(drawC01Section('11-c01-east-vertical-stack.png'));
for (const [index, level] of c01.levels.entries()) {
  const suffix = String(index + 12).padStart(2, '0');
  mapFiles.push(drawC01Level(
    level,
    `${suffix}-${level.id.toLowerCase()}.png`,
  ));
}

const screenshotSources = [
  [
    'raven-rock-command-center.png',
    'data/exports/redevelopment-media-wave2-2026-07-28/buildings/'
      + 'raven-rock/rr-b1--command-operations-center.png',
    'Raven Rock command and operations center',
  ],
  [
    'raven-rock-t2b.png',
    'data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/'
      + 't2b-west-to-east.png',
    'Raven Rock T2b standardized tunnel',
  ],
  [
    'raven-rock-z5-floorplan.png',
    'data/exports/world-catalog-wave2-2026-07-28/floorplans/structures/'
      + 'raven-rock-rr-z5.png',
    'Raven Rock RR-Z5 surface shaft floorplan',
  ],
  [
    'legacy-c01-upper-plan.png',
    'data/exports/box/mainstreet-secure-complex-wave5-2026-07-27/'
      + '01-c01-upper-plan.png',
    'Legacy MainStreet C01 upper plan',
  ],
  [
    'shelter-vault-levels.png',
    'data/exports/box/mainstreet-secure-complex-wave5-2026-07-27/'
      + '04-shelter-vault-levels.png',
    'Private shelter and grand-vault levels',
  ],
  [
    'underground-warehouse.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/mainstreet/'
      + 'object-te-msa-uw01-dry-core.png',
    'MainStreet underground warehouse dry core',
  ],
  [
    'library-guild-secret.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/civic-pavilion-library-guild/'
      + 'object-te-lib-guild-secret-01.png',
    'Library–Guild Hall isolated secret passage',
  ],
  [
    'gilded-raven.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/gilded-owner-corridor/'
      + 'object-te-rrch-gilded-raven.png',
    'Gilded Raven Theatre House',
  ],
  [
    'owner-corridor.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/gilded-owner-corridor/'
      + 'object-te-owner-corridor-grt-obs.png',
    'Gilded Raven–Observatory owner corridor',
  ],
  [
    'owner-sales-office.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/gilded-owner-corridor/'
      + 'object-te-owner-city-sales-office.png',
    'Founders’ Gallery sales office',
  ],
  [
    'westlight-venue-basements.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/westlight/'
      + 'object-te-wl-venue-basements.png',
    'Westlight venue basement support',
  ],
  [
    'westlight-members-club.png',
    'data/exports/redevelopment-media-wave2-2026-07-28/buildings/'
      + 'westlight-venue/wl-club--members-club.png',
    'Westlight members club',
  ],
  [
    'oasis-bunker.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/oasis-rv/'
      + 'object-te-oasis-bunker-01.png',
    'Approach-road oasis mini-bunker',
  ],
  [
    'info-annex.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/dsm-infobunker/'
      + 'object-te-ia-info-annex.png',
    'Iowa underground information annex',
  ],
  [
    'holdout-shelter.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/dsm-infobunker/'
      + 'object-te-ia-holdout-home-shelter.png',
    'Holdout-home shelter',
  ],
  [
    'concord-bar.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/data-district-concord/'
      + 'object-te-ia-concord-bar.png',
    'Concord bar',
  ],
  [
    'c01-east-l1.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/c01/'
      + 'object-c01-east-l1-security-garage.png',
    'Cataloged C01 east L1 security garage',
  ],
  [
    'c01-east-l2-adult.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/c01/'
      + 'object-c01-east-l2-living-adult.png',
    'Cataloged C01 east L2 living / adult level (non-graphic)',
  ],
  [
    'c01-owner-club.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/c01/'
      + 'object-c01-owner-club-arrival.png',
    'Cataloged C01 owner club arrival',
  ],
  [
    'c01-owner-residence.png',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v6/pass-1/c01/'
      + 'object-c01-owner-residence.png',
    'Cataloged C01 owner residence',
  ],
];

const screenshots = [];
for (const [name, sourceRelative, caption] of screenshotSources) {
  const source = path.join(ROOT, sourceRelative);
  if (!fs.existsSync(source)) continue;
  const destination = path.join(SCREENSHOTS, name);
  fs.copyFileSync(source, destination);
  const stat = fs.statSync(destination);
  screenshots.push({
    name,
    caption,
    source: sourceRelative,
    path: relative(destination),
    bytes: stat.size,
    sha256: sha256File(destination),
  });
}

async function drawContactSheet(filename, items, title) {
  const width = 1800;
  const cellWidth = 560;
  const cellHeight = 390;
  const columns = 3;
  const rows = Math.ceil(items.length / columns);
  const height = 120 + rows * cellHeight + 45;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 34px DejaVu Sans';
  ctx.fillText(title, 60, 55);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '18px DejaVu Sans';
  ctx.fillText(
    'Accepted evidence reused in a new navigation-oriented screenshot book.',
    60,
    86,
  );
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const image = await loadImage(path.join(ROOT, item.path));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 45 + column * (cellWidth + 25);
    const y = 110 + row * cellHeight;
    const imageHeight = 305;
    const ratio = Math.min(cellWidth / image.width, imageHeight / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, cellWidth, cellHeight - 20);
    ctx.drawImage(
      image,
      x + (cellWidth - drawWidth) / 2,
      y + 10 + (imageHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 16px DejaVu Sans';
    const caption = item.caption.length > 58
      ? `${item.caption.slice(0, 56)}…`
      : item.caption;
    ctx.fillText(caption, x + 12, y + 340);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '13px DejaVu Sans';
    ctx.fillText(item.name, x + 12, y + 363);
  }
  const out = path.join(SCREENSHOTS, filename);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

const contactSheets = [
  await drawContactSheet(
    '01-underground-evidence-contact-sheet.png',
    screenshots.slice(0, 12),
    'Underground Navigation — Evidence Sheet 1',
  ),
  await drawContactSheet(
    '02-underground-evidence-contact-sheet.png',
    screenshots.slice(12),
    'Underground Navigation — Evidence Sheet 2',
  ),
];

const inventory = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-underground-navigation-inventory-2026-07-28',
  generatedAtUtc: new Date().toISOString(),
  status: 'READ_ONLY_NAVIGATION_REPORT',
  physicalMutation: false,
  sources: {
    worldDatabase: {
      path: relative(WORLD_DB),
      sha256: sha256File(WORLD_DB),
      allFeatureRecords: allFeatures.length,
    },
    terminalSnapshot: {
      path: relative(TERMINAL_SNAPSHOT),
      status: fs.existsSync(TERMINAL_SNAPSHOT)
        ? 'immutable snapshot present'
        : 'snapshot path missing',
    },
    c01Manifest: {
      path: relative(C01_MANIFEST),
      sha256: sha256File(C01_MANIFEST),
    },
    ownerSchedule: {
      path: relative(OWNER_SCHEDULE),
      sha256: sha256File(OWNER_SCHEDULE),
    },
    libraryGuildSchedule: {
      path: relative(LIBRARY_GUILD_SCHEDULE),
      sha256: sha256File(LIBRARY_GUILD_SCHEDULE),
    },
  },
  truthBoundary: {
    ravenRock:
      'The Minecraft interior is an openly labeled creative approximation; '
      + 'it is not a map of the real Raven Rock Mountain Complex.',
    c01East:
      'The catalog and terminal media describe the east stack, but owner field '
      + 'observation reports that relocation, road, parking recovery, and the '
      + 'sunken entrance were not delivered. Those arrival claims remain '
      + 'contested under ISSUE-002.',
    restrictedRavensgate:
      'The Ravensgate restricted underground exclusion is not mapped as a '
      + 'navigable system because no authorized access point is confirmed.',
    portalGallery:
      'Portal-gallery rooms are destinations, not proof that portals are active.',
  },
  counts: {
    allWorldFeatures: allFeatures.length,
    undergroundNavigationRecords: undergroundFeatures.length,
    c01Levels: c01.levels.length,
    c01Spaces: c01Spaces.length,
    c01GraphNodes: c01.routeGraph.nodes.length,
    c01GraphEdges: c01.routeGraph.edges.length,
    venueDatabaseRecords: venueFeatures.length,
    c01VenueAndAdultSpaces: c01VenueSpaces.length,
    entranceAndAccessRecords: entrances.length,
    maps: mapFiles.length,
    screenshots: screenshots.length,
    contactSheets: contactSheets.length,
  },
  systems: Object.fromEntries(
    Object.keys(SYSTEM_LABELS).map((system) => [
      system,
      {
        name: SYSTEM_LABELS[system],
        records: undergroundFeatures.filter(
          (feature) => feature.system === system,
        ).length,
      },
    ]),
  ),
  entrances,
  undergroundFeatures: undergroundFeatures.map(compactFeature),
  c01: {
    levels: c01.levels.map((level) => ({
      id: level.id,
      mainLevel: level.mainLevel,
      spaces: c01Spaces.filter((space) => space.levelId === level.id),
    })),
    entranceNode: c01.routeGraph.entranceNode,
    classEntrances: c01.routeGraph.classEntrances,
    egressNodes: c01.routeGraph.egressNodes,
    graphEdges: c01.routeGraph.edges,
  },
  venues: {
    databaseRecords: venueFeatures.map((feature) => ({
      projectId: feature.projectId,
      externalId: feature.externalId,
      name: feature.name,
      kind: feature.kind,
      minY: feature.minY,
      maxY: feature.maxY,
      geometry: feature.geometry,
      sourceRef: feature.sourceRef,
    })),
    c01Rooms: c01VenueSpaces,
  },
  maps: mapFiles.map((filename) => ({
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  })),
  screenshots,
  contactSheets: contactSheets.map((filename) => ({
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  })),
};

writeJson(path.join(OUT, 'underground-inventory.json'), inventory);
writeJson(path.join(OUT, 'screenshot-manifest.json'), {
  schemaVersion: 1,
  id: 'underground-navigation-screenshot-manifest',
  screenshots,
  contactSheets: inventory.contactSheets,
});

function featureRows(features) {
  return features.map((feature) => `
    <tr>
      <td>${escapeHtml(feature.externalId ?? feature.id)}</td>
      <td>${escapeHtml(feature.name)}</td>
      <td>${escapeHtml(SYSTEM_LABELS[feature.system] ?? feature.system)}</td>
      <td>${escapeHtml(feature.kind)}</td>
      <td>${feature.minY ?? '—'}..${feature.maxY ?? '—'}</td>
      <td>${escapeHtml(feature.status)}</td>
      <td>${escapeHtml(feature.sourceRef ?? feature.source)}</td>
    </tr>
  `).join('');
}

function c01SpaceRows(spaces) {
  return spaces.map((space) => `
    <tr>
      <td>${escapeHtml(space.id)}</td>
      <td>${escapeHtml(space.levelId)}</td>
      <td>${escapeHtml(space.category)}</td>
      <td>${escapeHtml(space.accessClasses.join(', ') || '—')}</td>
      <td>${escapeHtml(space.point?.join(', ') ?? '—')}</td>
      <td>${escapeHtml(space.tags.join(', '))}</td>
    </tr>
  `).join('');
}

function entranceRows() {
  return entrances.map((entrance) => `
    <tr>
      <td>${escapeHtml(entrance.id)}</td>
      <td>${escapeHtml(entrance.name)}</td>
      <td>${escapeHtml(SYSTEM_LABELS[entrance.system] ?? entrance.system)}</td>
      <td>${escapeHtml(entrance.point?.join(', ') ?? '—')}</td>
      <td>${escapeHtml(entrance.access)}</td>
      <td>${escapeHtml(entrance.route)}</td>
      <td>${escapeHtml(entrance.certainty)}</td>
    </tr>
  `).join('');
}

function venueRows() {
  const database = venueFeatures.map((feature) => `
    <tr>
      <td>database</td>
      <td>${escapeHtml(feature.externalId)}</td>
      <td>${escapeHtml(feature.name)}</td>
      <td>${feature.minY ?? '—'}..${feature.maxY ?? '—'}</td>
      <td>${escapeHtml(feature.projectId)}</td>
    </tr>
  `);
  const c01Rooms = c01VenueSpaces.map((space) => `
    <tr>
      <td>C01 room graph</td>
      <td>${escapeHtml(space.id)}</td>
      <td>${escapeHtml(space.tags.join(', ') || space.id)}</td>
      <td>${escapeHtml(space.point?.[1] ?? '—')}</td>
      <td>${escapeHtml(space.levelId)}</td>
    </tr>
  `);
  return [...database, ...c01Rooms].join('');
}

const systemCards = Object.entries(inventory.systems).map(([system, value]) => `
  <div class="metric">
    <span class="swatch" style="background:${systemColor(system)}"></span>
    <strong>${escapeHtml(value.name)}</strong>
    <span>${value.records} catalog records</span>
  </div>
`).join('');

const c01LevelSections = c01.levels.map((level, index) => {
  const mapName = `${String(index + 12).padStart(2, '0')}-${level.id.toLowerCase()}.png`;
  const spaces = c01Spaces.filter((space) => space.levelId === level.id);
  return `
    <section class="page">
      <p class="eyebrow">C01 EAST · LEVEL ${index + 1} OF ${c01.levels.length}</p>
      <h2>${escapeHtml(level.id.replaceAll('-', ' '))}</h2>
      <p>${spaces.length} cataloged spaces. The map uses numbered room nodes so the
      circulation graph remains readable at print scale.</p>
      <figure>
        <img src="maps/${escapeHtml(mapName)}" alt="${escapeHtml(level.id)} map">
        <figcaption>${escapeHtml(level.id)} cataloged route graph.</figcaption>
      </figure>
      <table class="compact">
        <thead><tr><th>Space</th><th>Type</th><th>Access</th><th>XYZ</th><th>Tags</th></tr></thead>
        <tbody>${spaces.map((space) => `
          <tr>
            <td>${escapeHtml(space.id)}</td>
            <td>${escapeHtml(space.category)}</td>
            <td>${escapeHtml(space.accessClasses.join(', ') || '—')}</td>
            <td>${escapeHtml(space.point?.join(', ') ?? '—')}</td>
            <td>${escapeHtml(space.tags.join(', '))}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>
  `;
}).join('');

const screenshotFigures = screenshots.map((screenshot) => `
  <figure class="shot">
    <img src="screenshots/${escapeHtml(screenshot.name)}" alt="${escapeHtml(screenshot.caption)}">
    <figcaption><b>${escapeHtml(screenshot.caption)}</b><br>
    <code>${escapeHtml(screenshot.source)}</code></figcaption>
  </figure>
`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IANLAN NextGen — Underground Navigation Report</title>
  <style>
    :root {
      --navy: #07111e;
      --panel: #102235;
      --ink: #e9f1f7;
      --muted: #9fb2c3;
      --line: #2c4358;
      --gold: #f1d36a;
      --warn: #f09a57;
    }
    * { box-sizing: border-box; }
    html { background: var(--navy); color: var(--ink); font-family: Inter, "DejaVu Sans", Arial, sans-serif; }
    body { margin: 0; background: var(--navy); }
    main { max-width: 1220px; margin: auto; }
    section { padding: 54px 58px; border-bottom: 1px solid var(--line); }
    .cover { min-height: 900px; display: flex; flex-direction: column; justify-content: center; background:
      radial-gradient(circle at 80% 10%, #1e5e6f 0, transparent 32%),
      radial-gradient(circle at 12% 75%, #4d274d 0, transparent 30%), var(--navy); }
    h1 { font-size: 70px; line-height: .98; max-width: 900px; margin: 18px 0 28px; }
    h2 { font-size: 42px; margin: 12px 0 22px; }
    h3 { font-size: 27px; margin-top: 32px; }
    p, li { font-size: 18px; line-height: 1.55; color: #d5e1ea; }
    .lede { font-size: 25px; max-width: 900px; color: var(--ink); }
    .eyebrow { color: var(--gold); text-transform: uppercase; letter-spacing: .16em; font-weight: 800; font-size: 14px; }
    .warning { border-left: 5px solid var(--warn); background: #2c1e19; padding: 16px 20px; }
    .note { border-left: 5px solid var(--gold); background: #252617; padding: 16px 20px; }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin: 25px 0; }
    .metric { background: var(--panel); border: 1px solid var(--line); padding: 15px; display: grid; grid-template-columns: 18px 1fr auto; gap: 12px; align-items: center; }
    .swatch { width: 16px; height: 16px; border-radius: 50%; }
    figure { margin: 28px 0; break-inside: avoid; }
    figure img { width: 100%; display: block; border: 1px solid var(--line); background: #07111e; }
    figcaption { color: var(--muted); font-size: 14px; line-height: 1.45; padding-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 14px; }
    th { color: var(--gold); text-align: left; border-bottom: 2px solid var(--line); padding: 8px; }
    td { border-bottom: 1px solid var(--line); padding: 8px; vertical-align: top; overflow-wrap: anywhere; }
    tr:nth-child(even) { background: rgba(255,255,255,.025); }
    .compact { font-size: 12px; }
    .shots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
    .shot { margin: 0; }
    code { color: #a9d7e7; font-size: .9em; }
    a { color: #8cd6ee; }
    .toc { columns: 2; column-gap: 50px; }
    .toc li { margin-bottom: 8px; }
    @page { size: Letter landscape; margin: 0.42in; }
    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { max-width: none; }
      section { break-after: page; min-height: 7.4in; padding: .22in .32in; }
      .page { break-before: page; }
      .cover { min-height: 7.4in; }
      h1 { font-size: 56px; }
      h2 { font-size: 34px; }
      p, li { font-size: 14px; }
      table { font-size: 10px; }
      .compact { font-size: 8.5px; }
      .shots { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
  </style>
</head>
<body><main>
  <section class="cover">
    <p class="eyebrow">IANLAN NEXTGEN · NAVIGATION REPORT 02</p>
    <h1>Underground Networks, Bunkers & Rooms</h1>
    <p class="lede">A comprehensive, map-first guide to the Minecraft world’s
    tunnels, bunkers, vaults, below-grade venues, adult-only hospitality rooms,
    service spaces, and ways in.</p>
    <p>Prepared 2026-07-28 · Read-only report · No world edits</p>
  </section>

  <section>
    <p class="eyebrow">READ THIS FIRST</p>
    <h2>Truth boundary</h2>
    <p class="warning"><b>C01 east arrival is contested.</b> The accepted database
    and terminal media catalog a five-level east stack and owner layers, but the
    owner’s field observation says the bunker was not moved east, still obstructs
    parking, and lacks the road and sunken entrance. This report maps that geometry
    as <b>cataloged / verify in world</b>, keeps the legacy MainStreet portal on the
    map, and does not close ISSUE-002.</p>
    <p class="note"><b>Raven Rock note.</b> Every interior coordinate in this
    Minecraft reconstruction is an openly labeled creative approximation. This is
    a map of the game world, not a representation of the real classified facility.</p>
    <p>The Ravensgate restricted underground exclusion is omitted from navigation
    maps because no authorized access point is confirmed. Inactive portal-gallery
    rooms are shown only as rooms; no active portal operation is claimed.</p>
    <div class="metrics">
      <div class="metric"><span class="swatch" style="background:#fff"></span><strong>Underground navigation records</strong><span>${inventory.counts.undergroundNavigationRecords}</span></div>
      <div class="metric"><span class="swatch" style="background:#fff"></span><strong>C01 rooms / graph nodes</strong><span>${inventory.counts.c01Spaces} / ${inventory.counts.c01GraphNodes}</span></div>
      <div class="metric"><span class="swatch" style="background:#fff"></span><strong>Entrance / access records</strong><span>${inventory.counts.entranceAndAccessRecords}</span></div>
      <div class="metric"><span class="swatch" style="background:#fff"></span><strong>Maps / screenshots</strong><span>${inventory.counts.maps} / ${inventory.counts.screenshots}</span></div>
    </div>
  </section>

  <section>
    <p class="eyebrow">CONTENTS</p>
    <h2>How to use this atlas</h2>
    <ol class="toc">
      <li>World geographic overview</li>
      <li>Skywalk-style network schematic</li>
      <li>Raven Rock network</li>
      <li>Ravensreach / Worker Town</li>
      <li>MainStreet mountain and logistics</li>
      <li>Cataloged C01 east stack</li>
      <li>Westlight below-grade venues</li>
      <li>Oasis road bunker</li>
      <li>Iowa / Concord underground</li>
      <li>Bars, clubs, theatres, adult rooms</li>
      <li>Evidence screenshot book</li>
      <li>All entrances and access nodes</li>
      <li>Complete inventory appendices</li>
    </ol>
    <p>On geographic maps, north is up and equals decreasing Z. East is right and
    equals increasing X. Yellow <b>E</b> symbols are access points. The
    “skywalk” diagram follows the wayfinding logic used by Midwestern skywalk
    maps: connected destinations are emphasized over scale, entry points are a
    separate symbol layer, and disconnected systems stay in separate boxes.</p>
    <p>Reference conventions:
      <a href="https://maps.dsm.city/p2/rest/services/External/EXTDynamicSkywalk/MapServer">City of Des Moines Skywalk GIS</a>
      (parking, access, skywalk, and route layers) and
      <a href="https://lims.minneapolismn.gov/RCA/24976">City of Minneapolis skyway system overview</a>.
    </p>
  </section>

  <section>
    <p class="eyebrow">SYSTEMS</p>
    <h2>Eight mapped underground families</h2>
    <div class="metrics">${systemCards}</div>
    <p>These families are not one continuous mega-network. Raven Rock has its own
    four portals and shaft; the civic library passage is deliberately isolated;
    the Gilded Raven owner route is private; Westlight and the roadside/data
    bunkers are separate destinations.</p>
  </section>

  <section>
    <p class="eyebrow">MAP 01 · GEOGRAPHIC</p>
    <h2>World overview</h2>
    <figure><img src="maps/01-underground-world-overview.png" alt="Underground world overview"><figcaption>All major cataloged underground systems and access nodes in world coordinates.</figcaption></figure>
  </section>

  <section>
    <p class="eyebrow">MAP 02 · WAYFINDING</p>
    <h2>Skywalk-style network map</h2>
    <figure><img src="maps/02-underground-skywalk-schematic.png" alt="Underground skywalk schematic"><figcaption>Topological wayfinding view. Position and distance are abstracted; connection state is not.</figcaption></figure>
  </section>

  <section>
    <p class="eyebrow">MAP 03 · RAVEN ROCK</p>
    <h2>Four portals, three caverns, four buildings, one surface shaft</h2>
    <figure><img src="maps/03-raven-rock-network.png" alt="Raven Rock tunnel map"><figcaption>The complete cataloged Minecraft tunnel graph, including RR-Z5.</figcaption></figure>
    <ul>
      <li>North vehicle: N4 → T1a/T1b → Cavern A.</li>
      <li>South personnel: N3 → T2a/T2b → Cavern B.</li>
      <li>East: N5 → T3a/T3b → Cavern A.</li>
      <li>West utility: N6 → T4 → Cavern C.</li>
      <li>Internal C1/C2 corridors join caverns; RR-S1 joins RR-Z5.</li>
    </ul>
  </section>

  <section>
    <p class="eyebrow">MAP 04 · RAVENSREACH / WORKER TOWN</p>
    <h2>Civic vaults and the private owner corridor</h2>
    <figure><img src="maps/04-ravensreach-worker-town-underground.png" alt="Ravensreach underground map"><figcaption>Library/Guild isolation and the distinct Gilded Raven–Observatory owner route.</figcaption></figure>
    <p>The library passage has exactly two endpoints and no third network branch.
    The owner corridor runs at y−44, serves seven rest suites and the Founders’
    Gallery sales office, and climbs at both the Gilded Raven and Observatory ends.
    It is explicitly not T2b and does not connect to Ravensgate.</p>
  </section>

  <section>
    <p class="eyebrow">MAP 05 · MAINSTREET</p>
    <h2>Legacy mountain complex, shelter/vault route, and warehouse</h2>
    <figure><img src="maps/05-mainstreet-mountain-and-logistics.png" alt="MainStreet underground map"><figcaption>Separate MainStreet underground families; absence of a line means no verified connection.</figcaption></figure>
    <p>The private shelter route starts at the penthouse safe room, descends to
    the mountain shelter, then continues to the three-level grand vault. UW01 is a
    logistics object with a dry core and east wings. The legacy C01 recessed
    portal remains the field-reliable public arrival pending ISSUE-002 resolution.</p>
  </section>

  <section>
    <p class="eyebrow">MAPS 06 + 11–18 · C01 EAST</p>
    <h2>Cataloged seven-level C01 stack</h2>
    <figure><img src="maps/06-c01-east-cataloged-footprint.png" alt="Cataloged C01 east footprint"><figcaption>Geographic footprint with contested surface arrival.</figcaption></figure>
    <figure><img src="maps/11-c01-east-vertical-stack.png" alt="C01 east vertical stack"><figcaption>Vertical relationship among all seven occupied levels.</figcaption></figure>
    <p>The room graph contains ${c01Spaces.length} spaces, ${c01.routeGraph.nodes.length}
    nodes, and ${c01.routeGraph.edges.length} edges. The public/adult living level
    has a bar/lounge, exhibition salon, viewing gallery, performer/service route,
    24 private rooms, and five one-to-one rooms. The owner club has a theatre,
    backrooms, 12 private rooms, meeting rooms, dining, cinema, offices, stair, and
    lift. All descriptions are architectural and non-graphic.</p>
  </section>

  ${c01LevelSections}

  <section>
    <p class="eyebrow">MAP 07 · WESTLIGHT</p>
    <h2>Below-grade theatre, club, basements, freight</h2>
    <figure><img src="maps/07-westlight-underground-venues.png" alt="Westlight underground venues"><figcaption>Westlight’s stacked venue and service family.</figcaption></figure>
    <p>The public theatre descends through upper lobby/balcony, orchestra
    lobby/parterre, and lower lobby/backstage levels. The members club holds its
    lounge, bar/dance floor, landing, and private balcony below grade. Venue
    basement and freight records complete the support layer.</p>
  </section>

  <section>
    <p class="eyebrow">MAP 08 · APPROACH ROAD</p>
    <h2>Oasis mini-bunker</h2>
    <figure><img src="maps/08-oasis-road-bunker.png" alt="Oasis mini-bunker map"><figcaption>The cataloged roadside bunker envelope near the approach corridor.</figcaption></figure>
  </section>

  <section>
    <p class="eyebrow">MAP 09 · IOWA / CONCORD</p>
    <h2>Information annex, home shelter, and nightlife venues</h2>
    <figure><img src="maps/09-iowa-data-district-underground.png" alt="Iowa underground map"><figcaption>Separate controlled underground destinations across the data district and Concord.</figcaption></figure>
    <p>The information annex, holdout-home shelter, Concord bar/theatre, and
    cataloged C01 stack are separate sites. They are shown together for geographic
    orientation, not as a claimed connected tunnel system.</p>
  </section>

  <section>
    <p class="eyebrow">VENUE INDEX</p>
    <h2>Bars, clubs, theatres, lounges, and adult-only rooms</h2>
    <p>This index intentionally uses neutral, non-graphic language. It includes
    below-grade venue records plus every database record whose identity is a bar,
    pub, taproom, lounge, club, theatre, dance space, adult room, salon, brew
    venue, or motel, so surface hospitality destinations are not silently missed.</p>
    <table>
      <thead><tr><th>Source</th><th>ID</th><th>Name / tags</th><th>Y</th><th>Area / level</th></tr></thead>
      <tbody>${venueRows()}</tbody>
    </table>
  </section>

  <section>
    <p class="eyebrow">SCREENSHOT BOOK</p>
    <h2>Accepted underground evidence, reorganized for navigation</h2>
    <figure><img src="screenshots/01-underground-evidence-contact-sheet.png" alt="Underground evidence sheet 1"></figure>
    <figure><img src="screenshots/02-underground-evidence-contact-sheet.png" alt="Underground evidence sheet 2"></figure>
  </section>

  <section>
    <p class="eyebrow">SCREENSHOT INDEX</p>
    <h2>Individual evidence views</h2>
    <div class="shots">${screenshotFigures}</div>
  </section>

  <section>
    <p class="eyebrow">FINAL SECTION · ENTRANCES</p>
    <h2>Every cataloged way into the underground</h2>
    <figure><img src="maps/10-all-underground-entrances.png" alt="All underground entrances"><figcaption>World-coordinate entrance and access-node map.</figcaption></figure>
    <table>
      <thead><tr><th>ID</th><th>Entrance / access</th><th>System</th><th>XYZ</th><th>Class</th><th>Leads to</th><th>Certainty</th></tr></thead>
      <tbody>${entranceRows()}</tbody>
    </table>
    <p class="warning">Centroid-labeled entrances must be read against signs and
    doors in-world. C01 east’s public/egress nodes are not proof of the missing
    road or surface portal. Ravensgate remains sealed and is not an entrance.</p>
  </section>

  <section>
    <p class="eyebrow">APPENDIX A</p>
    <h2>Complete underground feature inventory</h2>
    <p>${undergroundFeatures.length} selected world-database records. Aliases and
    parent/child records are retained because they carry different room, route,
    media, or provenance detail.</p>
    <table class="compact">
      <thead><tr><th>ID</th><th>Name</th><th>System</th><th>Kind</th><th>Y</th><th>Status</th><th>Source</th></tr></thead>
      <tbody>${featureRows(undergroundFeatures)}</tbody>
    </table>
  </section>

  <section>
    <p class="eyebrow">APPENDIX B</p>
    <h2>Complete C01 room/node inventory</h2>
    <table class="compact">
      <thead><tr><th>Space</th><th>Level</th><th>Type</th><th>Access</th><th>XYZ</th><th>Tags</th></tr></thead>
      <tbody>${c01SpaceRows(c01Spaces)}</tbody>
    </table>
  </section>

  <section>
    <p class="eyebrow">METHOD / SOURCES</p>
    <h2>Evidence and limitations</h2>
    <ul>
      <li>World feature database opened read-only: <code>${escapeHtml(relative(WORLD_DB))}</code>.</li>
      <li>Accepted terminal snapshot referenced: <code>${escapeHtml(relative(TERMINAL_SNAPSHOT))}</code>.</li>
      <li>C01 graph: <code>${escapeHtml(relative(C01_MANIFEST))}</code>.</li>
      <li>Owner route: <code>${escapeHtml(relative(OWNER_SCHEDULE))}</code>.</li>
      <li>Library/Guild isolation: <code>${escapeHtml(relative(LIBRARY_GUILD_SCHEDULE))}</code>.</li>
      <li>Images are accepted existing captures copied byte-for-byte; their original path and SHA-256 are in <code>screenshot-manifest.json</code>.</li>
      <li>The complete machine-readable inventory, maps, entrances, provenance, and hashes are in <code>underground-inventory.json</code>.</li>
      <li>No world command, RCON request, bot movement, database write, or live server mutation was made.</li>
    </ul>
  </section>
</main></body></html>`;

const htmlPath = path.join(OUT, 'underground-navigation-report.html');
fs.writeFileSync(htmlPath, html.replace(/[ \t]+$/gm, ''));

const readme = `# IANLAN NextGen Underground Navigation Report

Status: **READ-ONLY REPORT COMPLETE — PDF/PORTAL PUBLICATION PENDING**

This package is a comprehensive navigation atlas for the Minecraft world's
underground areas. It contains:

- ${inventory.counts.maps} new maps, including a world overview, a
  Des Moines/Minneapolis-inspired skywalk schematic, area maps, all seven C01
  room graphs, and an entrance map;
- ${inventory.counts.undergroundNavigationRecords} underground/navigation
  database records;
- ${inventory.counts.c01Spaces} C01 spaces and
  ${inventory.counts.c01GraphEdges} graph edges;
- ${inventory.counts.entranceAndAccessRecords} entrance/access records;
- ${inventory.counts.screenshots} accepted screenshots reorganized into a
  navigation evidence book;
- a complete HTML report and machine-readable inventory.

## Truth boundary

The cataloged C01 east stack is included, but its surface arrival is marked
**contested**. ISSUE-002 remains open because the owner reports that the bunker
was not moved east, still obstructs parking, and lacks the road and sunken
entrance. The legacy MainStreet C01 portal remains mapped.

Raven Rock is a Minecraft creative approximation, not a representation of any
real classified interior. The sealed Ravensgate underground exclusion is not
presented as navigable.

## Outputs

- \`underground-navigation-report.html\`
- \`underground-navigation-report.pdf\` (generated after HTML validation)
- \`underground-inventory.json\`
- \`screenshot-manifest.json\`
- \`maps/\`
- \`screenshots/\`

This generator never connects to Minecraft, RCON, the fleet API, systemd,
Railway, Sites, or Box.
`;
fs.writeFileSync(path.join(OUT, 'README.md'), readme);

const artifacts = [
  path.join(OUT, 'README.md'),
  htmlPath,
  path.join(OUT, 'underground-inventory.json'),
  path.join(OUT, 'screenshot-manifest.json'),
  ...mapFiles,
  ...screenshots.map((screenshot) => path.join(ROOT, screenshot.path)),
  ...contactSheets,
].map((filename) => ({
  path: relative(filename),
  bytes: fs.statSync(filename).size,
  sha256: sha256File(filename),
}));
writeJson(path.join(OUT, 'artifact-manifest.pre-pdf.json'), {
  schemaVersion: 1,
  id: 'underground-navigation-artifact-manifest-pre-pdf',
  generatedAtUtc: new Date().toISOString(),
  artifacts,
});

console.log(JSON.stringify({
  status: 'PASS',
  output: relative(OUT),
  counts: inventory.counts,
  html: relative(htmlPath),
  pdf: 'PENDING_PRINT',
}, null, 2));
