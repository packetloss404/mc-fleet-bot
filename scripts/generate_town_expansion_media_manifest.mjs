#!/usr/bin/env node
/**
 * Deterministic post-release visual-evidence contract for Town Expansion R1.
 *
 * This script is deliberately offline. It reads the frozen compiler report,
 * authored evidence cameras, and world-map.db in read-only mode. It writes
 * manifests only; it never reads or mutates the live Minecraft world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { MEDIA_IMAGE_QUALITY_GATE } from './lib/media_image_quality.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPORT =
  'data/buildops/town-expansion-r1-2026-07-28.report.json';
const DEFAULT_DATABASE = 'data/world-map.db';
const DEFAULT_OUTPUT =
  'data/exports/town-expansion-media-2026-07-28';
const DEFAULT_C01_CAMERA_PREFLIGHT =
  'data/world-review/town-expansion-c01-camera-preflight-20260728.json';
const DEFAULT_SALES_OFFICE_CAMERA_PREFLIGHT =
  'data/world-review/'
  + 'town-expansion-sales-office-camera-preflight-20260728.json';
const DEFAULT_GILDED_RAVEN_CAMERA_PREFLIGHT =
  'data/world-review/'
  + 'town-expansion-gilded-raven-camera-preflight-20260728.json';
const DEFAULT_POST_SNAPSHOT =
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';

export const FAMILY_DEFINITIONS = Object.freeze([
  { id: 'town-core', label: 'Town core, penthouse, longhouse and courtyard' },
  {
    id: 'civic-pavilion-library-guild',
    label: 'Civic pavilion, library, Guild Hall and east civic grounds',
  },
  { id: 'c01', label: 'C01 relocated bunker, every level and owner spaces' },
  {
    id: 'owner-estate-portals',
    label: 'Observatory owner estate and inactive portal galleries',
  },
  {
    id: 'gilded-owner-corridor',
    label: 'Gilded Raven and private owner corridor',
  },
  {
    id: 'westlight',
    label: 'Westlight venues, pier, lake, parks and waterfront housing',
  },
  {
    id: 'mainstreet',
    label: 'MainStreet garages, warehouse, guest services and workforce links',
  },
  { id: 'oasis-rv', label: 'Tollway oasis and RV sales district' },
  {
    id: 'dsm-infobunker',
    label: 'DSM halls, shared power, NOC, staff venues and InfoBunker annex',
  },
  {
    id: 'data-district-concord',
    label: 'Meta, Google, LightEdge, Concord and worker commons',
  },
  {
    id: 'cbe-soundstages',
    label: 'Concord Broadcast Exchange, satellite pad and soundstages',
  },
  {
    id: 'manager-vale',
    label: 'Manager Vale five-cottage mini-mansion program',
  },
]);

export const MEDIA_MANIFEST_CONTRACT = Object.freeze({
  generator:
    'node scripts/generate_town_expansion_media_manifest.mjs',
  outputDirectory: DEFAULT_OUTPUT,
  render: [
    'node scripts/render_redevelopment_camera_manifest.mjs',
    `--manifest ${DEFAULT_OUTPUT}/capture-manifest.json`,
    '--regions <immutable-postrelease-region-directory>',
    '--out-dir <fresh-snapshot-bound-output-directory>',
    '--report <fresh-snapshot-bound-output-directory>/capture-report.json',
    '--resume',
  ].join(' '),
  finalize: [
    'node scripts/qa_town_expansion_media_release.mjs',
    `--manifest ${DEFAULT_OUTPUT}/capture-manifest.json`,
    '--capture-report '
      + '<fresh-snapshot-bound-output-directory>/capture-report.json',
    '--post <immutable-postrelease-region-directory>',
    `--design-report ${DEFAULT_REPORT}`,
    '--out data/world-review/'
      + 'town-expansion-r1-post-release-media-2026-07-28.json',
  ].join(' '),
  finality:
    'Rendering is not final unless the supplied immutable post snapshot differs '
    + 'from the compiler prerelease snapshot and media QA reports PASS.',
});

export const REVIEWED_POST_SNAPSHOT_OBJECT_CAMERAS = Object.freeze({
  'TE-OBS-PORTAL-MAINSTREET': Object.freeze({
    eye: Object.freeze([269.5, 83.5, 156.5]),
    lookAt: Object.freeze([251.96, 86.44, 151.8]),
    fov: 72,
  }),
  'TE-OBS-PORTAL-RAVENROCK': Object.freeze({
    eye: Object.freeze([269.5, 79.5, 173.5]),
    lookAt: Object.freeze([251.98, 82.78, 163.38]),
    fov: 72,
  }),
  'TE-OBS-PORTAL-RAVENSREACH': Object.freeze({
    eye: Object.freeze([235.5, 79.5, 169.5]),
    lookAt: Object.freeze([245, 79.5, 185.95]),
    fov: 72,
  }),
  'TE-OBS-PORTAL-SECRET-PASSAGE': Object.freeze({
    eye: Object.freeze([220.5, 96.5, 152.5]),
    lookAt: Object.freeze([231.78, 94.39, 145.99]),
    fov: 72,
  }),
  'TE-OBS-PORTAL-WESTLIGHT': Object.freeze({
    eye: Object.freeze([213, 83, 169]),
    lookAt: Object.freeze([219.5, 83, 176.5]),
    fov: 72,
  }),
  'TE-OWNER-CORRIDOR-REST-C': Object.freeze({
    eye: Object.freeze([159.5, -36.5, -143.5]),
    lookAt: Object.freeze([186, -34.04, -158.8]),
    fov: 72,
  }),
  'TE-OWNER-CORRIDOR-REST-D': Object.freeze({
    eye: Object.freeze([159.5, -36.5, -93.5]),
    lookAt: Object.freeze([186, -34.04, -108.8]),
    fov: 72,
  }),
  'TE-IA-DISTRICT-META-SUBSTATION': Object.freeze({
    eye: Object.freeze([1160.5, 105.5, -520.5]),
    lookAt: Object.freeze([1131, 75.5, -490]),
    fov: 72,
  }),
  'TE-IA-CONCORD': Object.freeze({
    eye: Object.freeze([570.5, 105.9, -536.5]),
    lookAt: Object.freeze([602.27, 73.27, -417.95]),
    fov: 68,
  }),
  'TE-RR-MODERN-CORRIDOR-PILOT-01': Object.freeze({
    eye: Object.freeze([-144.5, 4.5, 187]),
    lookAt: Object.freeze([-136.5, 3.5, 181]),
    fov: 72,
  }),
});

export const REVIEWED_POST_SNAPSHOT_SCHEDULE_CAMERAS = Object.freeze({
  'CBE-CAM-001': Object.freeze({
    eye: Object.freeze([662.5, 70.5, -394.5]),
    lookAt: Object.freeze([680.04, 66.49, -389.8]),
    fov: 70,
  }),
  'CBE-CAM-003': Object.freeze({
    eye: Object.freeze([697.5, 69.5, -407.5]),
    lookAt: Object.freeze([694.31, 69.5, -423.08]),
    fov: 70,
  }),
  'CBE-CAM-004': Object.freeze({
    eye: Object.freeze([712.5, 69.5, -399.5]),
    lookAt: Object.freeze([680.9, 66.96, -399.5]),
    fov: 70,
  }),
  'CBE-CAM-005': Object.freeze({
    eye: Object.freeze([692.5, 78.5, -396.5]),
    lookAt: Object.freeze([692.5, 75.4, -357.92]),
    fov: 70,
  }),
  'CBE-CAM-006': Object.freeze({
    eye: Object.freeze([692.5, 78.5, -398.5]),
    lookAt: Object.freeze([685.56, 78.5, -408.05]),
    fov: 70,
  }),
  'CBE-CAM-011': Object.freeze({
    eye: Object.freeze([700.5, 54.5, -408.5]),
    lookAt: Object.freeze([681.93, 58.76, -389.93]),
    fov: 70,
  }),
  'CBE-CAM-013': Object.freeze({
    eye: Object.freeze([694.5, 87.5, -410.5]),
    lookAt: Object.freeze([719.82, 103, -419.44]),
    fov: 70,
  }),
  'CBE-CAM-014': Object.freeze({
    eye: Object.freeze([730.5, 76.5, -409.5]),
    lookAt: Object.freeze([763.08, 70.86, -410.98]),
    fov: 70,
  }),
  'CBE-CAM-015': Object.freeze({
    eye: Object.freeze([735.5, 73.5, -398.5]),
    lookAt: Object.freeze([720.92, 72.53, -403.36]),
    fov: 70,
  }),
  'CBE-CAM-017': Object.freeze({
    eye: Object.freeze([697.5, 55.5, -373.5]),
    lookAt: Object.freeze([706.07, 54.84, -373.5]),
    fov: 70,
  }),
  'CBE-CAM-018': Object.freeze({
    eye: Object.freeze([658.5, 80.5, -423.5]),
    lookAt: Object.freeze([722.18, 103, -420.62]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-009': Object.freeze({
    eye: Object.freeze([708, 86, -469]),
    lookAt: Object.freeze([704, 83, -457]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-002': Object.freeze({
    eye: Object.freeze([840.5, 110.5, -390.5]),
    lookAt: Object.freeze([730, 76, -458]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-003': Object.freeze({
    eye: Object.freeze([704.5, 74.5, -427.5]),
    lookAt: Object.freeze([704.5, 75.04, -435.08]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-010': Object.freeze({
    eye: Object.freeze([770.5, 88.5, -470.5]),
    lookAt: Object.freeze([785.22, 71.5, -445]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-015': Object.freeze({
    eye: Object.freeze([821.5, 71.5, -494.5]),
    lookAt: Object.freeze([786.99, 69.86, -489.57]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-017': Object.freeze({
    eye: Object.freeze([817.5, 71.5, -494.5]),
    lookAt: Object.freeze([797.94, 70.33, -479.14]),
    fov: 70,
  }),
  'CBE-ANNEX-CAM-018': Object.freeze({
    eye: Object.freeze([730.5, 105.5, -380.5]),
    lookAt: Object.freeze([730, 78, -455]),
    fov: 70,
  }),
});

const C01_SCHEDULE =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'c01-bunker-classification-manifest.json';
const CBE_SCHEDULE =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'concord-broadcast-exchange-coordinate-schedule.json';
const CBE_ANNEX_SCHEDULE =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json';
export const C01_STANDING_EYE_HEIGHT_BLOCKS = 1.62;
export const C01_REPRESENTATIVE_CAMERA_BY_OBJECT = Object.freeze({
  c01_east_l1_security_garage: 'CAM-l1-secure-vehicle-garage',
  c01_east_l2_living_adult: 'CAM-l2-adult-private-01',
  c01_east_l3_agriculture_water: 'CAM-l3-water-treatment',
  c01_east_l4_command_medical: 'CAM-l4-command-center',
  c01_east_l5_power_escape: 'CAM-l5-power-plant',
  c01_owner_club_arrival: 'CAM-owner-ceremonial-arrival-hall',
  c01_owner_residence: 'CAM-master-living',
  c01_owner_tunnel_detour: 'CAM-owner-tunnel-detour-refuge-01',
});
export const SALES_OFFICE_CAMERA_OBJECT_BY_SHOT = Object.freeze({
  'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS':
    'OWNER-CITY-SALES-OFFICE-01',
  'OBJECT-OWNER-CITY-SALES-OFFICE-01-SECOND-PASS':
    'OWNER-CITY-SALES-OFFICE-01',
  'OBJECT-TE-OWNER-CITY-SALES-OFFICE':
    'TE-OWNER-CITY-SALES-OFFICE',
});
export const GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT = Object.freeze({
  'OBJECT-RRCH-GILDED-RAVEN-FIRST-PASS': 'RRCH-GILDED-RAVEN',
  'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS': 'RRCH-GILDED-RAVEN',
  'OBJECT-TE-RRCH-GILDED-RAVEN': 'TE-RRCH-GILDED-RAVEN',
});

function parseArgs(argv) {
  const options = {
    report: DEFAULT_REPORT,
    database: DEFAULT_DATABASE,
    out: DEFAULT_OUTPUT,
    c01CameraPreflight: DEFAULT_C01_CAMERA_PREFLIGHT,
    salesOfficeCameraPreflight:
      DEFAULT_SALES_OFFICE_CAMERA_PREFLIGHT,
    gildedRavenCameraPreflight:
      DEFAULT_GILDED_RAVEN_CAMERA_PREFLIGHT,
    postSnapshot: DEFAULT_POST_SNAPSHOT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') options.report = argv[++index];
    else if (arg === '--database') options.database = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--c01-camera-preflight') {
      options.c01CameraPreflight = argv[++index];
    } else if (arg === '--no-c01-camera-preflight') {
      options.c01CameraPreflight = null;
    } else if (arg === '--sales-office-camera-preflight') {
      options.salesOfficeCameraPreflight = argv[++index];
    } else if (arg === '--no-sales-office-camera-preflight') {
      options.salesOfficeCameraPreflight = null;
    } else if (arg === '--gilded-raven-camera-preflight') {
      options.gildedRavenCameraPreflight = argv[++index];
    } else if (arg === '--no-gilded-raven-camera-preflight') {
      options.gildedRavenCameraPreflight = null;
    } else if (arg === '--post-snapshot') {
      options.postSnapshot = argv[++index];
    } else if (arg === '--no-post-snapshot') {
      options.postSnapshot = null;
    } else if (arg === '--help') options.help = true;
    else if (arg === '--contract') options.contract = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

function resolveRoot(filename) {
  return path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function snapshotHash(directory) {
  const files = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  if (files.length === 0) {
    throw new Error(`no Anvil region files found in ${directory}`);
  }
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    digest.update(filename);
    digest.update('\0');
    digest.update(content);
    digest.update('\0');
    bytes += content.length;
  }
  return {
    path: relativeRoot(directory),
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: files.length,
    bytes,
  };
}

function normalizedBounds(value) {
  if (Array.isArray(value) && value.length === 6) {
    return [
      Math.min(Number(value[0]), Number(value[3])),
      Math.min(Number(value[1]), Number(value[4])),
      Math.min(Number(value[2]), Number(value[5])),
      Math.max(Number(value[0]), Number(value[3])),
      Math.max(Number(value[1]), Number(value[4])),
      Math.max(Number(value[2]), Number(value[5])),
    ];
  }
  if (value && typeof value === 'object') {
    return [
      Number(value.minX),
      Number(value.minY),
      Number(value.minZ),
      Number(value.maxX),
      Number(value.maxY),
      Number(value.maxZ),
    ];
  }
  throw new Error(`invalid bounds ${JSON.stringify(value)}`);
}

function validBounds(bounds) {
  return bounds.length === 6
    && bounds.every(Number.isFinite)
    && bounds[0] <= bounds[3]
    && bounds[1] <= bounds[4]
    && bounds[2] <= bounds[5];
}

function unionBounds(records) {
  if (records.length === 0) throw new Error('cannot union an empty record set');
  return records.reduce((result, record) => {
    const bounds = record.bounds;
    return [
      Math.min(result[0], bounds[0]),
      Math.min(result[1], bounds[1]),
      Math.min(result[2], bounds[2]),
      Math.max(result[3], bounds[3]),
      Math.max(result[4], bounds[4]),
      Math.max(result[5], bounds[5]),
    ];
  }, [...records[0].bounds]);
}

function pointInsideBounds(point, bounds) {
  return point[0] >= bounds[0] && point[0] <= bounds[3]
    && point[1] >= bounds[1] && point[1] <= bounds[4]
    && point[2] >= bounds[2] && point[2] <= bounds[5];
}

function boundsVolume(bounds) {
  return (bounds[3] - bounds[0] + 1)
    * (bounds[4] - bounds[1] + 1)
    * (bounds[5] - bounds[2] + 1);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function escapeJsonPointerSegment(value) {
  return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
}

function title(value) {
  return String(value)
    .replace(/[_:.-]+/g, ' ')
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function classifyObjectId(objectId) {
  const id = String(objectId);
  const families = new Set();
  if (/^(TE-PENTHOUSE|TE-LONGHOUSE|TE-COURT)/.test(id)) {
    families.add('town-core');
  }
  if (
    /^(TE-LIBRARY|TE-RUSSIAN-TEREM|TE-GUILDHALL|TE-LIB-GUILD|TE-PAV|RG-GARTH)/.test(id)
  ) {
    families.add('civic-pavilion-library-guild');
  }
  if (
    /^c01_/i.test(id)
    || /^C01-/i.test(id)
  ) {
    families.add('c01');
  }
  if (/^TE-OBS-|^OBS-/.test(id)) families.add('owner-estate-portals');
  if (
    /^TE-RRCH-GILDED|^RRCH-GILDED|^GRT-|^TE-OWNER-|^c01_owner_tunnel_detour/.test(id)
  ) {
    families.add('gilded-owner-corridor');
  }
  if (/^TE-WESTLIGHT-|^TE-WL-/.test(id)) families.add('westlight');
  if (
    /^TE-MSA-|^TE-ATTACHED-GARAGE-|^TE-MAINSTREET-|^TE-RAVENSREACH-/.test(id)
  ) {
    families.add('mainstreet');
  }
  if (/^TE-OASIS-|^TE-PAN-/.test(id)) families.add('oasis-rv');
  if (
    /^TE-IA-DATA-|^TE-IA-(POWER|MEGACAMPUS|NOC|200-SEAT|VENUE-BOH|STAFF-LODGE|FUTURE-EXPANSION|INFO-ANNEX|OUTER-|RAVENSREACH-DIRT-ROAD|HOLDOUT-HOME)/.test(id)
  ) {
    families.add('dsm-infobunker');
  }
  if (/^TE-IA-DISTRICT-|^TE-IA-CONCORD/.test(id)) {
    families.add('data-district-concord');
  }
  if (
    /^TE-IA-CONCORD-(BROADCAST-EXCHANGE|SOUNDSTAGE-ANNEX|SATELLITE-PAD)/.test(id)
    || /^CBE-/.test(id)
  ) {
    families.add('cbe-soundstages');
  }
  if (
    /^RRCH-(ARCHITECT|MASON|SCOUT|STEWARD|SURVEYOR)(:|$)/.test(id)
    || /^RRCH-MV-/.test(id)
    || /^(ARC|MAS|SCO|STW|SUR)-/.test(id)
  ) {
    families.add('manager-vale');
  }
  if (families.size === 0) families.add('town-core');
  return [...families].sort();
}

function derivedCamera(bounds, objectId = '') {
  const reviewed = REVIEWED_POST_SNAPSHOT_OBJECT_CAMERAS[objectId];
  if (reviewed) {
    return {
      mode: 'persp',
      eye: [...reviewed.eye],
      lookAt: [...reviewed.lookAt],
      fov: reviewed.fov,
      cameraBasis:
        'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass',
    };
  }
  const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;
  const underground = (
    maxY < 66
    || /^TE-OBS-PORTAL-/.test(objectId)
  );
  if (underground) {
    const insetX = Math.min(3, Math.max(1, Math.floor(width / 4)));
    const insetZ = Math.min(3, Math.max(1, Math.floor(depth / 4)));
    const eyeY = Math.min(maxY - 1, Math.max(minY + 1, centerY));
    return {
      mode: 'persp',
      eye: [
        Number((minX + insetX).toFixed(2)),
        Number(eyeY.toFixed(2)),
        Number((minZ + insetZ).toFixed(2)),
      ],
      lookAt: [
        Number(centerX.toFixed(2)),
        Number(centerY.toFixed(2)),
        Number(centerZ.toFixed(2)),
      ],
      fov: 72,
      cameraBasis: 'deterministic-interior-from-exact-bounds',
    };
  }
  const distance = Math.min(150, Math.max(18, Math.max(width, depth) * 0.72));
  return {
    mode: 'persp',
    eye: [
      Number((centerX - distance).toFixed(2)),
      Number((maxY + Math.min(38, Math.max(12, height * 0.45))).toFixed(2)),
      Number((centerZ - distance).toFixed(2)),
    ],
    lookAt: [
      Number(centerX.toFixed(2)),
      Number((minY + Math.min(height * 0.48, 18)).toFixed(2)),
      Number(centerZ.toFixed(2)),
    ],
    fov: 68,
    cameraBasis: 'deterministic-context-from-exact-bounds',
  };
}

function makeObject({
  objectId,
  name,
  bounds,
  kind,
  provenance,
  sourceScope = null,
  targetCells = null,
  roles = [],
  attributes = {},
  authoredCameras = [],
}) {
  const normalized = normalizedBounds(bounds);
  if (!validBounds(normalized)) throw new Error(`${objectId}: invalid bounds`);
  return {
    objectId,
    name: name ?? title(objectId),
    kind,
    bounds: normalized,
    familyIds: classifyObjectId(objectId),
    provenance,
    sourceScope,
    targetCells,
    roles,
    attributes,
    authoredCameras,
  };
}

function reportScopeObjects(report, reportPath) {
  return (report.operations?.scopeSummary ?? [])
    .map((scope, index) => ({ scope, index }))
    .filter(({ scope }) => (
      scope.targetCells > 0
      && !/:PROTECTED-BE-MIGRATION$/.test(scope.scope)
    ))
    .map(({ scope, index }) => makeObject({
      objectId: scope.scope,
      bounds: scope.bounds,
      kind: 'release-scope',
      provenance: {
        type: 'frozen-generator-report-scope',
        file: relativeRoot(reportPath),
        jsonPointer: `/operations/scopeSummary/${index}`,
      },
      sourceScope: scope.scope,
      targetCells: scope.targetCells,
      roles: scope.roles ?? [],
      attributes: {
        expectedStateCounts: scope.expectedStateCounts ?? {},
      },
    }));
}

function gildedPublicationObjects(report, reportPath) {
  return (report.publication?.objectRecords ?? []).map((record, index) => makeObject({
    objectId: record.id,
    name: record.name,
    bounds: record.bounds,
    kind: record.featureType ?? 'publication-object',
    provenance: {
      type: 'frozen-generator-report-publication-record',
      file: relativeRoot(reportPath),
      jsonPointer: `/publication/objectRecords/${index}`,
    },
    sourceScope: record.id,
    attributes: {
      databaseRecordRequired: record.databaseRecordRequired === true,
      requiredMatchedCaptures: record.requiredMatchedCaptures ?? 2,
    },
    authoredCameras: (record.cameraCandidates ?? []).map((camera) => ({
      id: camera.id,
      eye: camera.point,
      lookAt: camera.lookAt,
      fov: 68,
      role: camera.view,
      source: 'publication.objectRecords.cameraCandidates',
    })),
  }));
}

function managerValeObjects(report, reportPath) {
  return (report.publication?.managerVale?.databaseFeatures ?? []).map((feature, index) =>
    makeObject({
      objectId: feature.externalId,
      name: feature.name,
      bounds: feature.geometry,
      kind: feature.featureType ?? 'database-feature',
      provenance: {
        type: 'frozen-manager-vale-database-feature',
        file: relativeRoot(reportPath),
        jsonPointer:
          `/publication/managerVale/databaseFeatures/${index}`,
      },
      sourceScope: feature.parentExternalId ?? feature.externalId,
      attributes: {
        parentExternalId: feature.parentExternalId ?? null,
        historicalAliases: feature.historicalAliases ?? [],
        occupantFacingName: feature.occupantFacingName ?? null,
        ...feature.attributes,
      },
    }));
}

function mergeObjects(objects) {
  const merged = new Map();
  for (const object of objects) {
    const existing = merged.get(object.objectId);
    if (!existing) {
      merged.set(object.objectId, object);
      continue;
    }
    const richer = (
      object.provenance.type.includes('publication')
      || object.provenance.type.includes('database-feature')
    ) ? object : existing;
    merged.set(object.objectId, {
      ...existing,
      ...richer,
      familyIds: [...new Set([
        ...existing.familyIds,
        ...object.familyIds,
      ])].sort(),
      authoredCameras: [
        ...(existing.authoredCameras ?? []),
        ...(object.authoredCameras ?? []),
      ],
    });
  }
  return [...merged.values()].sort((left, right) =>
    left.objectId.localeCompare(right.objectId));
}

function attachManagerValeCameras(objects, report) {
  const byId = new Map(objects.map((object) => [object.objectId, object]));
  for (const camera of report.publication?.managerVale?.cameraCandidates ?? []) {
    if (
      /BEFORE/.test(camera.id)
      || /SOURCE-AFTER/.test(camera.id)
    ) continue;
    const object = byId.get(camera.primaryFeatureId);
    if (!object) continue;
    if (!pointInsideBounds(camera.lookAt, object.bounds)) continue;
    object.authoredCameras.push({
      id: camera.id,
      eye: camera.eye,
      lookAt: camera.lookAt,
      fov: camera.fov ?? 64,
      role: camera.role,
      source: 'publication.managerVale.cameraCandidates',
    });
  }
}

function smallestContainingObject(objects, point, familyId) {
  return objects
    .filter((object) => (
      object.familyIds.includes(familyId)
      && pointInsideBounds(point, object.bounds)
    ))
    .sort((left, right) =>
      boundsVolume(left.bounds) - boundsVolume(right.bounds))[0] ?? null;
}

function addStandingEyeHeight(point) {
  return [
    point[0],
    Number((point[1] + C01_STANDING_EYE_HEIGHT_BLOCKS).toFixed(2)),
    point[2],
  ];
}

function pointInsideAnyBounds(point, boxes) {
  return boxes.some((box) => pointInsideBounds(point, normalizedBounds(box)));
}

function loadC01CameraPreflight(filename, schedule) {
  if (!filename) return null;
  const absolute = resolveRoot(filename);
  const report = readJson(absolute);
  const schedulePath = resolveRoot(C01_SCHEDULE);
  const requiredChecks = [
    'exactCameraCount',
    'exactC01ObjectCameraCount',
    'allEyesClear',
    'allLookTargetsClear',
    'allQualityGatesPass',
    'allC01ObjectEyesClear',
    'allC01ObjectLookTargetsClear',
    'allC01ObjectQualityGatesPass',
    'allEightC01ObjectCamerasPass',
    'allC01ObjectShotsUseVerifiedInteriorGeometry',
    'noCanonicalCapturePathsWritten',
  ];
  if (
    report.id !== 'town-expansion-c01-authored-camera-poststate-preflight'
    || report.status !== 'PASS'
    || report.liveWorldMutated !== false
  ) {
    throw new Error('C01 camera preflight is not an offline PASS report');
  }
  if (
    report.source?.schedule?.path !== C01_SCHEDULE
    || report.source?.schedule?.sha256 !== sha256File(schedulePath)
    || report.source?.schedule?.cameraCount
      !== (schedule.evidenceCameras ?? []).length
  ) {
    throw new Error('C01 camera preflight does not bind the authored schedule');
  }
  if (
    report.counts?.scheduledCameras !== 165
    || report.counts?.passedCameras !== 165
    || report.counts?.failedCameras !== 0
    || report.counts?.objectCameras !== 8
    || report.counts?.passedObjectCameras !== 8
    || report.counts?.failedObjectCameras !== 0
    || report.counts?.rejectedRenderAttempts !== 0
    || report.counts?.failedRenderAttempts !== 0
  ) {
    throw new Error(
      'C01 camera preflight does not pass all 165 schedule cameras '
      + 'and eight object cameras',
    );
  }
  if (!requiredChecks.every((check) => report.checks?.[check] === true)) {
    throw new Error('C01 camera preflight has a failed required check');
  }
  if (
    !/^[a-f0-9]{64}$/.test(
      report.source?.immutablePostSnapshot?.sha256 ?? '',
    )
    || report.source?.immutablePostSnapshot?.regionFileCount <= 0
  ) {
    throw new Error('C01 camera preflight lacks immutable snapshot identity');
  }
  if (
    JSON.stringify(report.contract?.qualityGate)
    !== JSON.stringify(MEDIA_IMAGE_QUALITY_GATE)
  ) {
    throw new Error('C01 camera preflight changed the media quality gate');
  }
  const sourceIds = new Set(
    (schedule.evidenceCameras ?? []).map((camera) => camera.id),
  );
  const byId = new Map();
  for (const result of report.cameras ?? []) {
    if (
      !sourceIds.has(result.cameraId)
      || byId.has(result.cameraId)
      || result.status !== 'PASS'
      || result.occupancy?.status !== 'PASS'
      || result.lineOfSight?.status !== 'PASS'
      || result.quality?.status !== 'PASS'
      || result.quality?.metrics?.nonBlank !== true
    ) {
      throw new Error(
        `${result.cameraId ?? 'unknown'}: invalid C01 camera preflight row`,
      );
    }
    const acceptedPath = resolveRoot(result.acceptedImage?.path ?? '');
    if (
      !fs.existsSync(acceptedPath)
      || result.acceptedImage.bytes !== fs.statSync(acceptedPath).size
      || result.acceptedImage.sha256 !== sha256File(acceptedPath)
    ) {
      throw new Error(
        `${result.cameraId}: accepted preflight image identity mismatch`,
      );
    }
    byId.set(result.cameraId, result);
  }
  if (
    byId.size !== sourceIds.size
    || [...sourceIds].some((cameraId) => !byId.has(cameraId))
  ) {
    throw new Error('C01 camera preflight coverage is not one-to-one');
  }
  if (
    JSON.stringify(
      Object.fromEntries(Object.entries(
        report.representativeObjectCameras ?? {},
      ).map(([objectId, entry]) => [objectId, entry.cameraId])),
    ) !== JSON.stringify(C01_REPRESENTATIVE_CAMERA_BY_OBJECT)
  ) {
    throw new Error('C01 camera preflight representative mapping drifted');
  }
  const objectByObjectId = new Map();
  for (const result of report.objectCameras ?? []) {
    const expectedCameraId =
      C01_REPRESENTATIVE_CAMERA_BY_OBJECT[result.objectId];
    if (
      !expectedCameraId
      || expectedCameraId !== result.cameraId
      || objectByObjectId.has(result.objectId)
      || result.status !== 'PASS'
      || result.owner?.objectId !== result.objectId
      || result.occupancy?.status !== 'PASS'
      || result.lineOfSight?.status !== 'PASS'
      || result.quality?.status !== 'PASS'
      || result.quality?.metrics?.nonBlank !== true
      || !pointInsideBounds(result.camera?.eye, result.owner?.bounds)
      || !pointInsideBounds(result.camera?.lookAt, result.owner?.bounds)
    ) {
      throw new Error(
        `${result.objectId ?? 'unknown'}: invalid C01 object camera `
        + 'preflight row',
      );
    }
    const acceptedPath = resolveRoot(result.acceptedImage?.path ?? '');
    if (
      !fs.existsSync(acceptedPath)
      || result.acceptedImage.bytes !== fs.statSync(acceptedPath).size
      || result.acceptedImage.sha256 !== sha256File(acceptedPath)
    ) {
      throw new Error(
        `${result.objectId}: accepted object preflight image identity `
        + 'mismatch',
      );
    }
    const scheduledResult = byId.get(result.cameraId);
    if (
      result.coverageBasis === 'schedule-camera-reuse'
      && (
        !scheduledResult
        || JSON.stringify(scheduledResult.camera)
          !== JSON.stringify(result.camera)
        || scheduledResult.acceptedImage.sha256
          !== result.acceptedImage.sha256
      )
    ) {
      throw new Error(
        `${result.objectId}: reused schedule camera identity drifted`,
      );
    }
    objectByObjectId.set(result.objectId, result);
  }
  if (
    objectByObjectId.size
      !== Object.keys(C01_REPRESENTATIVE_CAMERA_BY_OBJECT).length
    || Object.keys(C01_REPRESENTATIVE_CAMERA_BY_OBJECT).some(
      (objectId) => !objectByObjectId.has(objectId),
    )
  ) {
    throw new Error('C01 object camera coverage is not one-to-one');
  }
  return {
    path: relativeRoot(absolute),
    sha256: sha256File(absolute),
    report,
    byId,
    objectByObjectId,
  };
}

function loadSalesOfficeCameraPreflight(
  filename,
  objects,
  reportPath,
) {
  if (!filename) return null;
  const absolute = resolveRoot(filename);
  const report = readJson(absolute);
  const requiredChecks = [
    'exactFamilyShotCount',
    'allEyesClear',
    'allLookTargetsClear',
    'allQualityGatesPass',
    'allGeometryInsideExactObjects',
    'pairedPassGeometryReady',
    'noCanonicalCapturePathsWritten',
  ];
  if (
    report.id
      !== 'town-expansion-sales-office-camera-poststate-preflight'
    || report.status !== 'PASS'
    || report.liveWorldMutated !== false
  ) {
    throw new Error(
      'sales-office camera preflight is not an offline PASS report',
    );
  }
  if (
    report.source?.compilerReport?.path !== relativeRoot(reportPath)
    || report.source?.compilerReport?.sha256 !== sha256File(reportPath)
  ) {
    throw new Error(
      'sales-office camera preflight does not bind the compiler report',
    );
  }
  if (
    report.counts?.sourceShots !== 3
    || report.counts?.passedShots !== 3
    || report.counts?.failedShots !== 0
    || report.counts?.pairedCapturesBound !== 6
    || report.counts?.rejectedRenderAttempts !== 0
    || report.counts?.failedRenderAttempts !== 0
  ) {
    throw new Error(
      'sales-office camera preflight does not pass all three family shots',
    );
  }
  if (!requiredChecks.every((check) => report.checks?.[check] === true)) {
    throw new Error(
      'sales-office camera preflight has a failed required check',
    );
  }
  if (
    JSON.stringify(report.contract?.qualityGate)
      !== JSON.stringify(MEDIA_IMAGE_QUALITY_GATE)
    || !/^[a-f0-9]{64}$/.test(
      report.source?.immutablePostSnapshot?.sha256 ?? '',
    )
    || report.source?.immutablePostSnapshot?.regionFileCount <= 0
  ) {
    throw new Error(
      'sales-office camera preflight changed the quality gate or lacks '
      + 'immutable snapshot identity',
    );
  }
  const objectsById = new Map(
    objects.map((object) => [object.objectId, object]),
  );
  const byShotId = new Map();
  for (const result of report.cameras ?? []) {
    const expectedObjectId =
      SALES_OFFICE_CAMERA_OBJECT_BY_SHOT[result.shotId];
    const object = objectsById.get(expectedObjectId);
    if (
      !expectedObjectId
      || result.primaryFeatureId !== expectedObjectId
      || result.owner?.objectId !== expectedObjectId
      || byShotId.has(result.shotId)
      || result.status !== 'PASS'
      || result.occupancy?.status !== 'PASS'
      || result.lineOfSight?.status !== 'PASS'
      || result.quality?.status !== 'PASS'
      || result.quality?.metrics?.nonBlank !== true
      || !object
      || JSON.stringify(result.owner.bounds)
        !== JSON.stringify(object.bounds)
      || !pointInsideBounds(result.camera?.eye, object.bounds)
      || !pointInsideBounds(result.camera?.lookAt, object.bounds)
    ) {
      throw new Error(
        `${result.shotId ?? 'unknown'}: invalid sales-office preflight row`,
      );
    }
    const acceptedPath = resolveRoot(result.acceptedImage?.path ?? '');
    if (
      !fs.existsSync(acceptedPath)
      || result.acceptedImage.bytes !== fs.statSync(acceptedPath).size
      || result.acceptedImage.sha256 !== sha256File(acceptedPath)
    ) {
      throw new Error(
        `${result.shotId}: accepted sales-office image identity mismatch`,
      );
    }
    byShotId.set(result.shotId, result);
  }
  if (
    byShotId.size
      !== Object.keys(SALES_OFFICE_CAMERA_OBJECT_BY_SHOT).length
    || Object.keys(SALES_OFFICE_CAMERA_OBJECT_BY_SHOT).some(
      (shotId) => !byShotId.has(shotId),
    )
  ) {
    throw new Error(
      'sales-office camera family coverage is not one-to-one',
    );
  }
  return {
    path: relativeRoot(absolute),
    sha256: sha256File(absolute),
    report,
    byShotId,
  };
}

function loadGildedRavenCameraPreflight(
  filename,
  objects,
  reportPath,
) {
  if (!filename) return null;
  const absolute = resolveRoot(filename);
  const report = readJson(absolute);
  const requiredChecks = [
    'exactFamilyShotCount',
    'allEyesClear',
    'allFramingTargetsBoundToExactObjects',
    'allFirstVisibleSurfacesInsideExactObjects',
    'allQualityGatesPass',
    'allGeometryContractsSatisfied',
    'pairedPassGeometryReady',
    'noCanonicalCapturePathsWritten',
  ];
  if (
    report.id
      !== 'town-expansion-gilded-raven-camera-poststate-preflight'
    || report.status !== 'PASS'
    || report.liveWorldMutated !== false
  ) {
    throw new Error(
      'Gilded Raven camera preflight is not an offline PASS report',
    );
  }
  if (
    report.source?.compilerReport?.path !== relativeRoot(reportPath)
    || report.source?.compilerReport?.sha256 !== sha256File(reportPath)
  ) {
    throw new Error(
      'Gilded Raven camera preflight does not bind the compiler report',
    );
  }
  if (
    report.counts?.sourceShots !== 3
    || report.counts?.passedShots !== 3
    || report.counts?.failedShots !== 0
    || report.counts?.pairedCapturesBound !== 6
    || report.counts?.rejectedRenderAttempts !== 0
    || report.counts?.failedRenderAttempts !== 0
  ) {
    throw new Error(
      'Gilded Raven camera preflight does not pass all family shots',
    );
  }
  if (!requiredChecks.every((check) => report.checks?.[check] === true)) {
    throw new Error(
      'Gilded Raven camera preflight has a failed required check',
    );
  }
  if (
    JSON.stringify(report.contract?.qualityGate)
      !== JSON.stringify(MEDIA_IMAGE_QUALITY_GATE)
    || !/^[a-f0-9]{64}$/.test(
      report.source?.immutablePostSnapshot?.sha256 ?? '',
    )
    || report.source?.immutablePostSnapshot?.regionFileCount <= 0
  ) {
    throw new Error(
      'Gilded Raven camera preflight changed the quality gate or lacks '
      + 'immutable snapshot identity',
    );
  }
  const objectsById = new Map(
    objects.map((object) => [object.objectId, object]),
  );
  const byShotId = new Map();
  for (const result of report.cameras ?? []) {
    const expectedObjectId =
      GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT[result.shotId];
    const object = objectsById.get(expectedObjectId);
    const geometry = result.geometryContract;
    const exterior = geometry?.eyeDisposition
      === 'reviewed-exterior-facade-standoff';
    if (
      !expectedObjectId
      || result.primaryFeatureId !== expectedObjectId
      || result.owner?.objectId !== expectedObjectId
      || byShotId.has(result.shotId)
      || result.status !== 'PASS'
      || result.occupancy?.status !== 'PASS'
      || result.lineOfSight?.status !== 'PASS'
      || result.quality?.status !== 'PASS'
      || result.quality?.metrics?.nonBlank !== true
      || !object
      || JSON.stringify(result.owner.bounds)
        !== JSON.stringify(object.bounds)
      || geometry?.lookAtInsideExactObject !== true
      || geometry?.firstVisibleSurfaceInsideExactObject !== true
      || (!exterior && geometry?.eyeInsideExactObject !== true)
      || !pointInsideBounds(result.camera?.lookAt, object.bounds)
      || (
        !exterior
        && !pointInsideBounds(result.camera?.eye, object.bounds)
      )
      || !pointInsideBounds(
        result.lineOfSight?.firstVisibleSurface?.point,
        object.bounds,
      )
    ) {
      throw new Error(
        `${result.shotId ?? 'unknown'}: invalid Gilded Raven preflight row`,
      );
    }
    const acceptedPath = resolveRoot(result.acceptedImage?.path ?? '');
    if (
      !fs.existsSync(acceptedPath)
      || result.acceptedImage.bytes !== fs.statSync(acceptedPath).size
      || result.acceptedImage.sha256 !== sha256File(acceptedPath)
    ) {
      throw new Error(
        `${result.shotId}: accepted Gilded Raven image identity mismatch`,
      );
    }
    byShotId.set(result.shotId, result);
  }
  if (
    byShotId.size
      !== Object.keys(GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT).length
    || Object.keys(GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT).some(
      (shotId) => !byShotId.has(shotId),
    )
  ) {
    throw new Error(
      'Gilded Raven camera family coverage is not one-to-one',
    );
  }
  return {
    path: relativeRoot(absolute),
    sha256: sha256File(absolute),
    report,
    byShotId,
  };
}

export function c01ScheduleCameraContracts(objects, cameraPreflight = null) {
  const schedule = readJson(resolveRoot(C01_SCHEDULE));
  const preflight = cameraPreflight
    ? loadC01CameraPreflight(cameraPreflight, schedule)
    : null;
  return (schedule.evidenceCameras ?? []).map((camera, index) => {
    if (camera.interior !== true) {
      throw new Error(`${camera.id}: C01 camera is not declared interior`);
    }
    if (camera.position[1] !== camera.target[1]) {
      throw new Error(`${camera.id}: C01 foot-level position/target Y mismatch`);
    }
    const owner = smallestContainingObject(objects, camera.target, 'c01');
    if (!owner) {
      throw new Error(`${camera.id}: C01 target does not resolve to an exact scope`);
    }
    const eye = addStandingEyeHeight(camera.position);
    const lookAt = addStandingEyeHeight(camera.target);
    const sourcePointsInsideObject = (
      pointInsideBounds(camera.position, owner.bounds)
      && pointInsideBounds(camera.target, owner.bounds)
    );
    const transformedPointsInsideObject = (
      pointInsideBounds(eye, owner.bounds)
      && pointInsideBounds(lookAt, owner.bounds)
    );
    if (!sourcePointsInsideObject || !transformedPointsInsideObject) {
      throw new Error(
        `${camera.id}: C01 camera exits exact object bounds after eye-height transform`,
      );
    }
    const clearVolumeLevels = (schedule.levels ?? []).filter((level) => (
      pointInsideAnyBounds(eye, level.auditVolumeBoxes ?? [])
      && pointInsideAnyBounds(lookAt, level.auditVolumeBoxes ?? [])
    ));
    if (clearVolumeLevels.length !== 1) {
      throw new Error(
        `${camera.id}: expected one C01 audit clear-volume level, found `
        + `${clearVolumeLevels.map((level) => level.id).join(',') || 'none'}`,
      );
    }
    const postStateResult = preflight?.byId.get(camera.id) ?? null;
    const finalEye = postStateResult?.camera?.eye ?? eye;
    const finalLookAt = postStateResult?.camera?.lookAt ?? lookAt;
    const finalPointsInsideObject = (
      pointInsideBounds(finalEye, owner.bounds)
      && pointInsideBounds(finalLookAt, owner.bounds)
    );
    const finalPointsInsideAuditClearVolume = (
      pointInsideAnyBounds(
        finalEye,
        clearVolumeLevels[0].auditVolumeBoxes ?? [],
      )
      && pointInsideAnyBounds(
        finalLookAt,
        clearVolumeLevels[0].auditVolumeBoxes ?? [],
      )
    );
    if (
      !finalPointsInsideObject
      || !finalPointsInsideAuditClearVolume
      || (
        postStateResult
        && (
          postStateResult.owner?.objectId !== owner.objectId
          || postStateResult.level?.id !== clearVolumeLevels[0].id
        )
      )
    ) {
      throw new Error(
        `${camera.id}: post-state preflight camera exits its exact contract`,
      );
    }
    return {
      id: camera.id,
      owner,
      role: `C01 detail: ${(camera.requiredViews ?? []).join(', ')}`,
      source: {
        file: C01_SCHEDULE,
        jsonPointer: `/evidenceCameras/${index}`,
      },
      camera: {
        mode: 'persp',
        eye: finalEye,
        lookAt: finalLookAt,
        fov: postStateResult?.camera?.fov ?? 70,
        ...(postStateResult
          ? { maxDistance: postStateResult.camera.maxDistance }
          : {}),
        cameraBasis: postStateResult
          ? `authored:${C01_SCHEDULE}:immutable-post-preflight`
          : `authored:${C01_SCHEDULE}:foot-to-eye`,
        coordinateProvenance: {
          sourceFile: C01_SCHEDULE,
          sourceJsonPointer: `/evidenceCameras/${index}`,
          sourceConvention: 'interior-standing-foot-position',
          transform: {
            axis: 'y',
            operation: 'add',
            blocks: C01_STANDING_EYE_HEIGHT_BLOCKS,
            appliedTo: ['eye', 'lookAt'],
          },
          postStateCameraPreflight: postStateResult
            ? {
                reportPath: preflight.path,
                reportSha256: preflight.sha256,
                snapshot:
                  preflight.report.source.immutablePostSnapshot,
                offset: postStateResult.camera.offset,
                yawOffsetDegrees:
                  postStateResult.camera.yawOffsetDegrees,
                reviewedSeed: postStateResult.camera.reviewedSeed,
                occupancy: postStateResult.occupancy,
                lineOfSight: postStateResult.lineOfSight,
                quality: postStateResult.quality,
                acceptedImage: postStateResult.acceptedImage,
              }
            : null,
          validation: {
            exactObjectId: owner.objectId,
            sourcePointsInsideExactObjectBounds: sourcePointsInsideObject,
            transformedPointsInsideExactObjectBounds:
              transformedPointsInsideObject,
            auditClearVolumeLevelId: clearVolumeLevels[0].id,
            transformedPointsInsideAuditClearVolume: true,
            finalPointsInsideExactObjectBounds: finalPointsInsideObject,
            finalPointsInsideAuditClearVolume,
            postStateEyeOccupancyPassed:
              postStateResult?.occupancy?.status === 'PASS',
            postStateLineOfSightPassed:
              postStateResult?.lineOfSight?.status === 'PASS',
            postStateQualityGatePassed:
              postStateResult?.quality?.status === 'PASS',
          },
        },
      },
    };
  });
}

function authoredScheduleShots(objects, c01Contracts) {
  const shots = [];
  for (const contract of c01Contracts) {
    shots.push({
      shotId: `SCHEDULE-${contract.id}`,
      primaryFeatureId: contract.owner.objectId,
      role: contract.role,
      camera: contract.camera,
      relatedExactObjectIds: [],
      source: contract.source,
    });
  }

  const cbe = readJson(resolveRoot(CBE_SCHEDULE));
  for (const [index, camera] of (cbe.cameraCandidates ?? []).entries()) {
    const reviewed = REVIEWED_POST_SNAPSHOT_SCHEDULE_CAMERAS[camera.cameraId];
    const owner = smallestContainingObject(
      objects,
      camera.target,
      'cbe-soundstages',
    ) ?? objects.find(
      (object) => object.objectId === 'TE-IA-CONCORD-BROADCAST-EXCHANGE',
    );
    if (!owner) throw new Error('CBE release scope missing');
    shots.push({
      shotId: `SCHEDULE-${camera.cameraId}`,
      primaryFeatureId: owner.objectId,
      role: `CBE detail: ${camera.evidence}`,
      camera: {
        mode: 'persp',
        eye: reviewed ? [...reviewed.eye] : camera.position,
        lookAt: reviewed ? [...reviewed.lookAt] : camera.target,
        fov: reviewed?.fov ?? 70,
        cameraBasis: reviewed
          ? 'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass'
          : `authored:${CBE_SCHEDULE}`,
      },
      relatedExactObjectIds: camera.objects ?? [],
      source: {
        file: CBE_SCHEDULE,
        jsonPointer: `/cameraCandidates/${index}`,
      },
    });
  }

  const annex = readJson(resolveRoot(CBE_ANNEX_SCHEDULE));
  for (const [index, camera] of (annex.cameraCandidates ?? []).entries()) {
    const reviewed = REVIEWED_POST_SNAPSHOT_SCHEDULE_CAMERAS[camera.cameraId];
    const owner = objects.find(
      (object) => object.objectId === 'TE-IA-CONCORD-SOUNDSTAGE-ANNEX',
    );
    if (!owner) throw new Error('CBE soundstage release scope missing');
    shots.push({
      shotId: `SCHEDULE-${camera.cameraId}`,
      primaryFeatureId: owner.objectId,
      role: `Soundstage detail: ${camera.evidence}`,
      camera: {
        mode: 'persp',
        eye: reviewed ? [...reviewed.eye] : camera.position,
        lookAt: reviewed ? [...reviewed.lookAt] : camera.target,
        fov: reviewed?.fov ?? 70,
        cameraBasis: reviewed
          ? 'reviewed-terminal-c39d-post-snapshot-occupancy-los-quality-pass'
          : `authored:${CBE_ANNEX_SCHEDULE}`,
      },
      relatedExactObjectIds: [],
      source: {
        file: CBE_ANNEX_SCHEDULE,
        jsonPointer: `/cameraCandidates/${index}`,
      },
    });
  }
  return shots;
}

function verifiedFamilyCamera(preflight, result, sourceConvention) {
  const eyeInside = pointInsideBounds(
    result.camera.eye,
    result.owner.bounds,
  );
  const lookAtInside = pointInsideBounds(
    result.camera.lookAt,
    result.owner.bounds,
  );
  return {
    mode: 'persp',
    eye: result.camera.eye,
    lookAt: result.camera.lookAt,
    fov: result.camera.fov,
    maxDistance: result.camera.maxDistance,
    cameraBasis:
      `authored:${preflight.path}:immutable-post-family-preflight`,
    coordinateProvenance: {
      sourceFile: preflight.path,
      sourceJsonPointer: `/cameras/${result.cameraIndex}`,
      sourceConvention,
      postStateCameraPreflight: {
        reportPath: preflight.path,
        reportSha256: preflight.sha256,
        snapshot: preflight.report.source.immutablePostSnapshot,
        occupancy: result.occupancy,
        lineOfSight: result.lineOfSight,
        quality: result.quality,
        acceptedImage: result.acceptedImage,
      },
      validation: {
        exactObjectId: result.primaryFeatureId,
        finalPointsInsideExactObjectBounds: eyeInside && lookAtInside,
        eyeInsideExactObjectBounds: eyeInside,
        lookAtInsideExactObjectBounds: lookAtInside,
        eyeDisposition:
          result.geometryContract?.eyeDisposition ?? 'reviewed-interior',
        firstVisibleSurfaceInsideExactObjectBounds:
          result.geometryContract
            ?.firstVisibleSurfaceInsideExactObject ?? true,
        postStateEyeOccupancyPassed: true,
        postStateLineOfSightPassed: true,
        postStateQualityGatePassed: true,
      },
    },
  };
}

function objectShots(
  objects,
  c01Contracts,
  cameraPreflight = null,
  salesOfficePreflight = null,
  gildedRavenPreflight = null,
) {
  const c01ById = new Map(c01Contracts.map((contract) => [
    contract.id,
    contract,
  ]));
  const c01Preflight = cameraPreflight
    ? loadC01CameraPreflight(
        cameraPreflight,
        readJson(resolveRoot(C01_SCHEDULE)),
      )
    : null;
  return objects.flatMap((object) => {
    const authored = object.authoredCameras ?? [];
    const representativeCameraId =
      C01_REPRESENTATIVE_CAMERA_BY_OBJECT[object.objectId];
    const objectPreflight = c01Preflight?.objectByObjectId
      .get(object.objectId) ?? null;
    const scheduleRepresentative = representativeCameraId
      ? c01ById.get(representativeCameraId)
      : null;
    const representative = objectPreflight
      ? {
          id: objectPreflight.cameraId,
          owner: object,
          camera: {
            mode: 'persp',
            eye: objectPreflight.camera.eye,
            lookAt: objectPreflight.camera.lookAt,
            fov: objectPreflight.camera.fov,
            maxDistance: objectPreflight.camera.maxDistance,
            coordinateProvenance: {
              sourceFile: c01Preflight.path,
              sourceJsonPointer:
                `/objectCameras/${objectPreflight.objectCameraIndex}`,
              sourceConvention:
                'reviewed-immutable-post-object-interior-camera',
              postStateCameraPreflight: {
                reportPath: c01Preflight.path,
                reportSha256: c01Preflight.sha256,
                snapshot:
                  c01Preflight.report.source.immutablePostSnapshot,
                coverageBasis: objectPreflight.coverageBasis,
                occupancy: objectPreflight.occupancy,
                lineOfSight: objectPreflight.lineOfSight,
                quality: objectPreflight.quality,
                acceptedImage: objectPreflight.acceptedImage,
              },
              validation: {
                exactObjectId: object.objectId,
                finalPointsInsideExactObjectBounds: true,
                postStateEyeOccupancyPassed: true,
                postStateLineOfSightPassed: true,
                postStateQualityGatePassed: true,
              },
            },
          },
        }
      : scheduleRepresentative;
    if (
      c01Preflight
      && representativeCameraId
      && !representative
    ) {
      throw new Error(
        `${object.objectId}: missing C01 representative camera `
        + representativeCameraId,
      );
    }
    if (representative && representative.owner.objectId !== object.objectId) {
      throw new Error(
        `${object.objectId}: representative camera ${representative.id} `
        + `resolves to ${representative.owner.objectId}`,
      );
    }
    const cameras = authored.length > 0
      ? authored.map((camera) => {
          const shotId = `OBJECT-${camera.id}`;
          const salesOfficeVerified =
            salesOfficePreflight?.byShotId.get(shotId);
          const gildedRavenVerified =
            gildedRavenPreflight?.byShotId.get(shotId);
          const verified = salesOfficeVerified ?? gildedRavenVerified;
          const verifiedPreflight = salesOfficeVerified
            ? salesOfficePreflight
            : gildedRavenVerified
              ? gildedRavenPreflight
              : null;
          return {
            shotId,
            primaryFeatureId: object.objectId,
            role: camera.role ?? `Authored view of ${object.name}`,
            camera: verified
              ? verifiedFamilyCamera(
                  verifiedPreflight,
                  verified,
                  salesOfficeVerified
                    ? 'reviewed-immutable-post-sales-office-interior-camera'
                    : 'reviewed-immutable-post-gilded-raven-family-camera',
                )
              : {
                  mode: 'persp',
                  eye: camera.eye,
                  lookAt: camera.lookAt,
                  fov: camera.fov ?? 68,
                  cameraBasis: `authored:${camera.source}`,
                },
            relatedExactObjectIds: [],
            source: object.provenance,
          };
        })
      : representative
        ? [{
            shotId: `OBJECT-${object.objectId}`,
            primaryFeatureId: object.objectId,
            role: `${object.kind} evidence for ${object.name}`,
            camera: {
              ...representative.camera,
              cameraBasis:
                `authored:${representative.camera.coordinateProvenance
                  ?.sourceFile ?? C01_SCHEDULE}:representative-`
                + `${representative.camera.coordinateProvenance
                  ?.postStateCameraPreflight
                  ? 'immutable-post-preflight'
                  : 'foot-to-eye'}`,
              coordinateProvenance: {
                ...representative.camera.coordinateProvenance,
                representativeForObjectId: object.objectId,
              },
            },
            relatedExactObjectIds: [],
            source: object.provenance,
          }]
      : (() => {
          const shotId = `OBJECT-${object.objectId}`;
          const salesOfficeVerified =
            salesOfficePreflight?.byShotId.get(shotId);
          const gildedRavenVerified =
            gildedRavenPreflight?.byShotId.get(shotId);
          const verified = salesOfficeVerified ?? gildedRavenVerified;
          const verifiedPreflight = salesOfficeVerified
            ? salesOfficePreflight
            : gildedRavenVerified
              ? gildedRavenPreflight
              : null;
          return [{
            shotId,
            primaryFeatureId: object.objectId,
            role: `${object.kind} evidence for ${object.name}`,
            camera: verified
              ? verifiedFamilyCamera(
                  verifiedPreflight,
                  verified,
                  salesOfficeVerified
                    ? 'reviewed-immutable-post-sales-office-interior-camera'
                    : 'reviewed-immutable-post-gilded-raven-family-camera',
                )
              : derivedCamera(object.bounds, object.objectId),
            relatedExactObjectIds: [],
            source: object.provenance,
          }];
        })();
    return cameras;
  });
}

function mapShots(objects) {
  const maps = [
    {
      id: 'whole-world-overview',
      label: 'Town Expansion R1 whole-world overview',
      familyIds: FAMILY_DEFINITIONS.map((family) => family.id),
    },
    ...FAMILY_DEFINITIONS.map((family) => ({
      id: `district-${family.id}`,
      label: family.label,
      familyIds: [family.id],
    })),
  ];
  return maps.map((map) => {
    const selected = objects.filter((object) =>
      object.familyIds.some((family) => map.familyIds.includes(family)));
    if (selected.length === 0) throw new Error(`${map.id}: empty map selection`);
    const bounds = unionBounds(selected);
    const width = bounds[3] - bounds[0] + 1;
    const depth = bounds[5] - bounds[2] + 1;
    const span = Math.ceil(Math.max(width, depth) * 1.16 / 16) * 16;
    return {
      shotId: `MAP-${map.id.toUpperCase()}`,
      primaryFeatureId: map.id,
      role: map.label,
      camera: {
        mode: 'map',
        center: [
          Number(((bounds[0] + bounds[3]) / 2).toFixed(2)),
          Number(((bounds[2] + bounds[5]) / 2).toFixed(2)),
        ],
        span,
        cameraBasis: 'deterministic-map-from-exact-object-union',
      },
      relatedExactObjectIds: selected.map((object) => object.objectId),
      source: {
        type: 'computed-union-of-exact-object-bounds',
        bounds,
      },
    };
  });
}

function databaseRows(databasePath, objectIds) {
  const database = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const statement = database.prepare(`
      SELECT id, project_id, external_id, parent_id, world, name, kind, status,
             geometry_json, source, source_ref, revision, observed_at
      FROM world_features
      WHERE external_id = ?
      ORDER BY project_id, id
    `);
    return new Map(objectIds.map((objectId) => [
      objectId,
      statement.all(objectId).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        externalId: row.external_id,
        parentId: row.parent_id,
        world: row.world,
        name: row.name,
        kind: row.kind,
        status: row.status,
        geometry: JSON.parse(row.geometry_json),
        source: row.source,
        sourceRef: row.source_ref,
        revision: row.revision,
        observedAt: row.observed_at,
      })),
    ]));
  } finally {
    database.close();
  }
}

function captureForPass(shot, pass) {
  const family = classifyObjectId(shot.primaryFeatureId)[0] ?? 'other';
  const cameraId = `${shot.shotId}-PASS-${pass}`;
  return {
    id: cameraId,
    shotId: shot.shotId,
    evidencePass: pass,
    primaryFeatureId: shot.primaryFeatureId,
    role: `${shot.role} · evidence pass ${pass}`,
    ...shot.camera,
    width: shot.camera.mode === 'map' ? 1600 : 1280,
    height: shot.camera.mode === 'map' ? 1600 : 720,
    output: `pass-${pass}/${shot.camera.mode === 'map' ? 'maps' : family}/${slug(shot.shotId)}.png`,
    relatedExactObjectIds: shot.relatedExactObjectIds,
    source: shot.source,
  };
}

function physicalClaimFor(object) {
  if (/FUTURE|RESERVATION|EXPANSION/.test(object.objectId)) {
    return (
      `Only the exact physical marker, wall, construction staging, or reserved `
      + `parcel treatment encoded by ${object.sourceScope ?? object.objectId} `
      + `(${object.targetCells ?? 'publication-linked'} guarded cells) may be `
      + `claimed after post-state verification; no completed future building `
      + `is claimed.`
    );
  }
  return (
    `Only the exact physical geometry encoded by `
    + `${object.sourceScope ?? object.objectId} within inclusive bounds `
    + `${object.bounds.join(',')} may be claimed after post-state verification; `
    + `requested program text is not independent proof of construction.`
  );
}

function manifestBase(
  report,
  reportPath,
  forwardPath,
  forwardHash,
  databasePath,
  postreleaseSnapshot,
) {
  return {
    schemaVersion: 2,
    packageId: report.packageId,
    status: 'POST_RELEASE_CAPTURE_PENDING',
    generatedAtUtc: report.generatedAtUtc,
    deterministic: true,
    liveWorldMutated: false,
    sourceReport: {
      path: relativeRoot(reportPath),
      sha256: sha256File(reportPath),
      status: report.status,
    },
    releasePackage: {
      forwardPath,
      forwardSha256: forwardHash,
    },
    prereleaseSnapshot: report.sourceSnapshot,
    postreleaseSnapshot,
    database: {
      path: relativeRoot(databasePath),
      sha256: sha256File(databasePath),
      mode: 'read-only',
    },
    finalityPolicy: {
      finalLabelProhibitedBeforeAcceptedPostSnapshot: true,
      postSnapshotMustDifferFromPrerelease: true,
      postSnapshotBoundByManifest: postreleaseSnapshot !== null,
      renderAgainstPrereleaseMayOnlyBeLabeledPreview: true,
      pairedPassesMustUseIdenticalCameraGeometry: true,
      pairedPassesMustProduceIdenticalImageHashes: true,
      asBuiltClaimsBeforePostQa: false,
      mediaPassMeaning: 'artifact-integrity-and-repeatability-only',
      semanticCompletionRequiresTownExpansionPostReleaseQa: true,
      c01UndergroundOnlyProofRequiresReviewerConfirmation: true,
    },
    capturePolicy: {
      width: 1280,
      height: 720,
      fieldOfView: 68,
      maps: { width: 1600, height: 1600 },
      renderer: 'scripts/render_redevelopment_camera_manifest.mjs',
    },
  };
}

export function buildMediaPackage({
  report,
  reportPath,
  databasePath,
  forwardPath = 'data/buildops/town-expansion-r1-2026-07-28.txt',
  c01CameraPreflightPath = null,
  salesOfficeCameraPreflightPath = null,
  gildedRavenCameraPreflightPath = null,
  postSnapshotPath = null,
}) {
  if (report.packageId !== 'town-expansion-r1-2026-07-28') {
    throw new Error(`unexpected package ${report.packageId}`);
  }
  const absoluteForward = resolveRoot(forwardPath);
  const forwardHash = sha256File(absoluteForward);
  if (report.operations?.sha256 !== forwardHash) {
    throw new Error('compiler report does not bind the current forward package');
  }

  const objects = mergeObjects([
    ...reportScopeObjects(report, reportPath),
    ...gildedPublicationObjects(report, reportPath),
    ...managerValeObjects(report, reportPath),
  ]);
  attachManagerValeCameras(objects, report);
  const c01CameraContracts = c01ScheduleCameraContracts(
    objects,
    c01CameraPreflightPath,
  );
  const salesOfficeCameraPreflight =
    salesOfficeCameraPreflightPath
      ? loadSalesOfficeCameraPreflight(
          salesOfficeCameraPreflightPath,
          objects,
          reportPath,
        )
      : null;
  const gildedRavenCameraPreflight =
    gildedRavenCameraPreflightPath
      ? loadGildedRavenCameraPreflight(
          gildedRavenCameraPreflightPath,
          objects,
          reportPath,
        )
      : null;
  const postreleaseSnapshot = postSnapshotPath
    ? snapshotHash(resolveRoot(postSnapshotPath))
    : null;
  if (
    postreleaseSnapshot
    && (
      postreleaseSnapshot.sha256 === report.sourceSnapshot?.sha256
      || postreleaseSnapshot.regionFileCount <= 0
    )
  ) {
    throw new Error(
      'post-release snapshot is missing or equals the prerelease snapshot',
    );
  }
  for (const [label, preflightSnapshot] of [
    [
      'C01',
      c01CameraPreflightPath
        ? c01CameraContracts[0].camera.coordinateProvenance
          .postStateCameraPreflight.snapshot
        : null,
    ],
    [
      'sales-office',
      salesOfficeCameraPreflight?.report.source
        .immutablePostSnapshot ?? null,
    ],
    [
      'Gilded Raven',
      gildedRavenCameraPreflight?.report.source
        .immutablePostSnapshot ?? null,
    ],
  ]) {
    if (
      postreleaseSnapshot
      && preflightSnapshot
      && (
        preflightSnapshot.path !== postreleaseSnapshot.path
        || preflightSnapshot.sha256 !== postreleaseSnapshot.sha256
        || preflightSnapshot.regionFileCount
          !== postreleaseSnapshot.regionFileCount
        || preflightSnapshot.bytes !== postreleaseSnapshot.bytes
      )
    ) {
      throw new Error(
        `${label} camera preflight does not bind the selected post snapshot`,
      );
    }
  }

  const shots = [
    ...mapShots(objects),
    ...objectShots(
      objects,
      c01CameraContracts,
      c01CameraPreflightPath,
      salesOfficeCameraPreflight,
      gildedRavenCameraPreflight,
    ),
    ...authoredScheduleShots(objects, c01CameraContracts),
  ].sort((left, right) => left.shotId.localeCompare(right.shotId));
  const duplicateShots = shots.filter(
    (shot, index) => shots.findIndex((entry) => entry.shotId === shot.shotId) !== index,
  );
  if (duplicateShots.length > 0) {
    throw new Error(`duplicate shot ids: ${duplicateShots.map((shot) => shot.shotId)}`);
  }

  const rows = databaseRows(databasePath, objects.map((object) => object.objectId));
  const capturesByPass = {
    1: shots.map((shot) => captureForPass(shot, 1)),
    2: shots.map((shot) => captureForPass(shot, 2)),
  };
  const allCameras = [...capturesByPass[1], ...capturesByPass[2]];
  const shotIdsByObject = new Map();
  for (const shot of shots) {
    if (!shotIdsByObject.has(shot.primaryFeatureId)) {
      shotIdsByObject.set(shot.primaryFeatureId, []);
    }
    shotIdsByObject.get(shot.primaryFeatureId).push(shot.shotId);
  }

  const objectCrosswalk = objects.map((object) => {
    const databaseMatches = rows.get(object.objectId) ?? [];
    const shotIds = shotIdsByObject.get(object.objectId) ?? [];
    return {
      objectId: object.objectId,
      name: object.name,
      kind: object.kind,
      bounds: object.bounds,
      familyIds: object.familyIds,
      provenance: object.provenance,
      sourceScope: object.sourceScope,
      targetCells: object.targetCells,
      roles: object.roles,
      attributes: object.attributes,
      truth: {
        requestedState: 'frozen authored program represented by the cited source',
        releaseState: 'GENERATED_OFFLINE_NOT_YET_VERIFIED',
        importAsBuiltKind: object.kind,
        plannedOnly: false,
        physicalClaim: physicalClaimFor(object),
        finalCertificationRequired: 'VERIFIED_POST_STATE',
      },
      database: {
        lookupKey: { externalId: object.objectId },
        state: databaseMatches.length > 0
          ? 'present-in-read-only-baseline'
          : 'pending-accepted-release-import',
        matches: databaseMatches,
        fabricatedRelationship: false,
      },
      shotIds,
      capturePairs: shotIds.map((shotId) => ({
        shotId,
        pass1CameraId: `${shotId}-PASS-1`,
        pass2CameraId: `${shotId}-PASS-2`,
      })),
    };
  });

  const familyCounts = Object.fromEntries(FAMILY_DEFINITIONS.map((family) => [
    family.id,
    objects.filter((object) => object.familyIds.includes(family.id)).length,
  ]));
  const mapCount = shots.filter((shot) => shot.camera.mode === 'map').length;
  const authoredDetailCount = shots.filter(
    (shot) => String(shot.camera.cameraBasis).startsWith('authored:'),
  ).length;
  const common = manifestBase(
    report,
    reportPath,
    forwardPath,
    forwardHash,
    databasePath,
    postreleaseSnapshot,
  );
  const counts = {
    exactObjects: objects.length,
    reportScopes: report.operations?.scopeSummary?.length ?? 0,
    excludedNonVisualScopes: (report.operations?.scopeSummary ?? [])
      .filter((scope) => /:PROTECTED-BE-MIGRATION$/.test(scope.scope))
      .length,
    shots: shots.length,
    maps: mapCount,
    authoredDetailShots: authoredDetailCount,
    pass1Captures: capturesByPass[1].length,
    pass2Captures: capturesByPass[2].length,
    combinedCaptures: allCameras.length,
    familyObjects: familyCounts,
  };
  const crosswalk = {
    schemaVersion: 2,
    id: 'town-expansion-r1-object-media-database-crosswalk',
    ...common,
    counts,
    coverageContracts: {
      c01: {
        requiredScopeIds: [
          'c01_east_l1_security_garage',
          'c01_east_l2_living_adult',
          'c01_east_l3_agriculture_water',
          'c01_east_l4_command_medical',
          'c01_east_l5_power_escape',
          'c01_owner_club_arrival',
          'c01_owner_residence',
          'c01_owner_tunnel_detour',
        ],
        deferredNonClaimIds: [
          'c01_source_exact_retirement',
        ],
        sourceRetirementProofStatus:
          'DEFERRED_ZERO_TARGET_CELLS_NOT_CLAIMED_BY_THIS_MEDIA_CONTRACT',
        surfaceConcealmentMapShotId: 'MAP-DISTRICT-C01',
        undergroundOnlyProof:
          'Final evidence must show all occupied C01 levels below grade and '
          + 'the surface map must show no exposed bunker shell. The manifest '
          + 'does not claim that proof before distinct post-state media QA.',
        finalState: 'PENDING_VERIFIED_POST_STATE',
      },
      exactScopeCoverage: {
        rule:
          'Every positive-cell compiler scope receives a paired shot except '
          + 'non-visual protected block-entity migration bookkeeping scopes.',
      },
    },
    cameraCoordinateAudit: {
      c01: {
        sourceFile: C01_SCHEDULE,
        sourceConvention: 'interior-standing-foot-position',
        transform: {
          axis: 'y',
          operation: 'add',
          blocks: C01_STANDING_EYE_HEIGHT_BLOCKS,
          appliedTo: ['eye', 'lookAt'],
        },
        scheduledCamerasAudited: c01CameraContracts.length,
        transformedCameras: c01CameraContracts.length,
        allSourcePointsInsideExactObjectBounds: c01CameraContracts.every(
          (contract) => (
            contract.camera.coordinateProvenance.validation
              .sourcePointsInsideExactObjectBounds
          ),
        ),
        allTransformedPointsInsideExactObjectBounds:
          c01CameraContracts.every((contract) => (
            contract.camera.coordinateProvenance.validation
              .transformedPointsInsideExactObjectBounds
          )),
        allTransformedPointsInsideAuditClearVolume:
          c01CameraContracts.every((contract) => (
            contract.camera.coordinateProvenance.validation
              .transformedPointsInsideAuditClearVolume
          )),
        postStateCameraPreflight: c01CameraPreflightPath
          ? {
              path: c01CameraContracts[0].camera.coordinateProvenance
                .postStateCameraPreflight.reportPath,
              sha256: c01CameraContracts[0].camera.coordinateProvenance
                .postStateCameraPreflight.reportSha256,
              snapshot: c01CameraContracts[0].camera.coordinateProvenance
                .postStateCameraPreflight.snapshot,
              scheduledCamerasAudited: c01CameraContracts.length,
              allEyesClear: c01CameraContracts.every(
                (contract) => contract.camera.coordinateProvenance.validation
                  .postStateEyeOccupancyPassed,
              ),
              allLookTargetsClear: c01CameraContracts.every(
                (contract) => contract.camera.coordinateProvenance.validation
                  .postStateLineOfSightPassed,
              ),
              allQualityGatesPass: c01CameraContracts.every(
                (contract) => contract.camera.coordinateProvenance.validation
                  .postStateQualityGatePassed,
              ),
            }
          : null,
        representativeObjectCameras: Object.fromEntries(
          Object.entries(C01_REPRESENTATIVE_CAMERA_BY_OBJECT).map(
            ([objectId, cameraId]) => [objectId, {
              cameraId,
              shotId: `OBJECT-${objectId}`,
            }],
          ),
        ),
      },
      salesOffice: salesOfficeCameraPreflight
        ? {
            reportPath: salesOfficeCameraPreflight.path,
            reportSha256: salesOfficeCameraPreflight.sha256,
            snapshot:
              salesOfficeCameraPreflight.report.source
                .immutablePostSnapshot,
            familyShotsAudited:
              salesOfficeCameraPreflight.byShotId.size,
            pairedCapturesBound:
              salesOfficeCameraPreflight.byShotId.size * 2,
            allEyesClear: [...salesOfficeCameraPreflight.byShotId.values()]
              .every((result) => result.occupancy?.status === 'PASS'),
            allLookTargetsClear: [
              ...salesOfficeCameraPreflight.byShotId.values(),
            ].every(
              (result) => result.lineOfSight?.status === 'PASS',
            ),
            allQualityGatesPass: [
              ...salesOfficeCameraPreflight.byShotId.values(),
            ].every((result) => result.quality?.status === 'PASS'),
            shotIds: [
              ...salesOfficeCameraPreflight.byShotId.keys(),
            ],
          }
        : null,
      gildedRaven: gildedRavenCameraPreflight
        ? {
            reportPath: gildedRavenCameraPreflight.path,
            reportSha256: gildedRavenCameraPreflight.sha256,
            snapshot:
              gildedRavenCameraPreflight.report.source
                .immutablePostSnapshot,
            familyShotsAudited:
              gildedRavenCameraPreflight.byShotId.size,
            pairedCapturesBound:
              gildedRavenCameraPreflight.byShotId.size * 2,
            allEyesClear: [...gildedRavenCameraPreflight.byShotId.values()]
              .every((result) => result.occupancy?.status === 'PASS'),
            allFramingTargetsBoundToExactObjects: [
              ...gildedRavenCameraPreflight.byShotId.values(),
            ].every(
              (result) =>
                result.geometryContract?.lookAtInsideExactObject === true,
            ),
            allFirstVisibleSurfacesInsideExactObjects: [
              ...gildedRavenCameraPreflight.byShotId.values(),
            ].every(
              (result) => result.geometryContract
                ?.firstVisibleSurfaceInsideExactObject === true,
            ),
            allQualityGatesPass: [
              ...gildedRavenCameraPreflight.byShotId.values(),
            ].every((result) => result.quality?.status === 'PASS'),
            shotIds: [
              ...gildedRavenCameraPreflight.byShotId.keys(),
            ],
          }
        : null,
    },
    objects: objectCrosswalk,
    mapShots: shots
      .filter((shot) => shot.camera.mode === 'map')
      .map((shot) => ({
        shotId: shot.shotId,
        primaryFeatureId: shot.primaryFeatureId,
        role: shot.role,
        bounds: shot.source.bounds,
        objectIds: shot.relatedExactObjectIds,
      })),
  };
  const crosswalkPath = 'object-media-database-crosswalk.json';
  const crosswalkSha256 = sha256(`${JSON.stringify(crosswalk, null, 2)}\n`);
  const manifest = (id, evidencePass, cameras) => ({
    ...common,
    id,
    evidencePass,
    objectCrosswalk: {
      path: crosswalkPath,
      sha256: crosswalkSha256,
      objectCount: objectCrosswalk.length,
    },
    counts,
    cameras,
  });
  return {
    crosswalk,
    pass1: manifest(
      'town-expansion-r1-post-release-media-pass-1',
      1,
      capturesByPass[1],
    ),
    pass2: manifest(
      'town-expansion-r1-post-release-media-pass-2',
      2,
      capturesByPass[2],
    ),
    combined: manifest(
      'town-expansion-r1-post-release-media-combined',
      'combined',
      allCameras,
    ),
  };
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log([
      'Usage: node scripts/generate_town_expansion_media_manifest.mjs',
      '  [--report data/buildops/town-expansion-r1-2026-07-28.report.json]',
      '  [--database data/world-map.db]',
      '  [--out data/exports/town-expansion-media-2026-07-28]',
      `  [--c01-camera-preflight ${DEFAULT_C01_CAMERA_PREFLIGHT}]`,
      '  [--no-c01-camera-preflight]',
      `  [--sales-office-camera-preflight ${
        DEFAULT_SALES_OFFICE_CAMERA_PREFLIGHT
      }]`,
      '  [--no-sales-office-camera-preflight]',
      `  [--gilded-raven-camera-preflight ${
        DEFAULT_GILDED_RAVEN_CAMERA_PREFLIGHT
      }]`,
      '  [--no-gilded-raven-camera-preflight]',
      `  [--post-snapshot ${DEFAULT_POST_SNAPSHOT}]`,
      '  [--no-post-snapshot]',
      '  [--contract]',
    ].join('\n'));
    return;
  }
  if (options.contract) {
    console.log(JSON.stringify(MEDIA_MANIFEST_CONTRACT, null, 2));
    return;
  }
  const reportPath = resolveRoot(options.report);
  const databasePath = resolveRoot(options.database);
  const out = resolveRoot(options.out);
  const c01CameraPreflightPath = options.c01CameraPreflight
    && fs.existsSync(resolveRoot(options.c01CameraPreflight))
    ? options.c01CameraPreflight
    : null;
  const salesOfficeCameraPreflightPath =
    options.salesOfficeCameraPreflight
    && fs.existsSync(resolveRoot(options.salesOfficeCameraPreflight))
      ? options.salesOfficeCameraPreflight
      : null;
  const gildedRavenCameraPreflightPath =
    options.gildedRavenCameraPreflight
    && fs.existsSync(resolveRoot(options.gildedRavenCameraPreflight))
      ? options.gildedRavenCameraPreflight
      : null;
  const postSnapshotPath = options.postSnapshot
    && fs.existsSync(resolveRoot(options.postSnapshot))
    ? options.postSnapshot
    : null;
  if (options.postSnapshot && !postSnapshotPath) {
    throw new Error(
      `post snapshot does not exist: ${options.postSnapshot}`,
    );
  }
  const media = buildMediaPackage({
    report: readJson(reportPath),
    reportPath,
    databasePath,
    c01CameraPreflightPath,
    salesOfficeCameraPreflightPath,
    gildedRavenCameraPreflightPath,
    postSnapshotPath,
  });
  writeJson(path.join(out, 'object-media-database-crosswalk.json'), media.crosswalk);
  writeJson(path.join(out, 'capture-manifest-pass-1.json'), media.pass1);
  writeJson(path.join(out, 'capture-manifest-pass-2.json'), media.pass2);
  writeJson(path.join(out, 'capture-manifest.json'), media.combined);
  console.log(JSON.stringify({
    status: media.combined.status,
    output: relativeRoot(out),
    counts: media.combined.counts,
    finalCaptureStatus: 'PENDING_RENDER_AGAINST_BOUND_POST_SNAPSHOT',
  }, null, 2));
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
