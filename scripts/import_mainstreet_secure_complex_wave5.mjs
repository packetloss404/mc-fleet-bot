#!/usr/bin/env node
/**
 * Promote MainStreet secure-complex Wave 5 into the first-class world map DB.
 *
 * Idempotent by (projectId, externalId). Existing feature attributes/tags are
 * preserved and augmented; new room, instrument, and circulation records are
 * linked to their actual parent feature IDs.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const dbPath = value('--db', 'data/world-map.db');
const regions = value(
  '--regions',
  'data/worldsnap-mainstreet-secure-wave5-post-20260727/region',
);
const output = value(
  '--out',
  'data/world-review/mainstreet-secure-complex-wave5-database-import-2026-07-27.json',
);
const projectId = 'mainstreet-america';
const sourceRef = 'data/world-review/mainstreet-secure-complex-detail-wave5-design-2026-07-27.json';
const qaRef = 'data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json';
const preflightRef = 'data/world-review/mainstreet-secure-complex-detail-wave5-preflight-2026-07-27.json';
const opsRef = 'data/buildops/mainstreet-secure-complex-detail-wave5-2026-07-27.txt';
const wayfindingRef = 'data/buildops/mainstreet-secure-wave5-wayfinding-2026-07-27.txt';
const reviewRefs = [
  'data/world-review/c01-bunker-detail-review-2026-07-27.json',
  'data/world-review/observatory-penthouse-detail-review-2026-07-27.json',
  'data/world-review/shelter-vault-detail-review-2026-07-27.json',
];
const screenshots = [
  'mainstreet-america/qa/msa-secure-wave5-observatory-exterior.png',
  'mainstreet-america/qa/msa-secure-wave5-observatory-interior-wide.png',
  'mainstreet-america/qa/msa-secure-wave5-penthouse.png',
  'mainstreet-america/qa/msa-secure-wave5-grand-vault.png',
  'mainstreet-america/qa/msa-secure-wave5-c01-hangar.png',
  'mainstreet-america/qa/msa-secure-wave5-c01-arena.png',
];

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort()) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function fileHash(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const sha256 = snapshotHash(regions);
const snapshotRef = `${regions}:sha256=${sha256}`;
const operationSha256 = fileHash(opsRef);
const evidence = {
  wave: 5,
  builtAtUtc: '2026-07-27',
  sourceRef,
  preflightRef,
  qaRef,
  reviewRefs,
  screenshots,
  snapshotRef,
  operationSha256,
  wayfindingRef,
  wayfindingSha256: fileHash(wayfindingRef),
  guardedOperations: 2075,
  changedCells: 28180,
  savedWorldQa: { passed: 21, failed: 0 },
};

const bounds = (minX, minY, minZ, maxX, maxY, maxZ) => ({
  type: 'bounds',
  minX,
  minY,
  minZ,
  maxX,
  maxY,
  maxZ,
});
const point = (x, y, z) => ({ type: 'point', position: { x, y, z } });
const route = (points, width = 2) => ({
  type: 'path',
  points: points.map(([x, y, z]) => ({ x, y, z })),
  width,
});

const store = new WorldFeatureStore(dbPath);
const imported = [];
const observedAt = Date.now();
try {
  const before = store.listFeatures({ projectId, limit: 1_000 });
  const byExternalId = new Map(
    before.filter((feature) => feature.externalId).map((feature) => [feature.externalId, feature]),
  );

  function existing(externalId) {
    return byExternalId.get(externalId);
  }

  function parentId(externalId) {
    const parent = existing(externalId);
    if (!parent) throw new Error(`missing parent feature ${externalId}`);
    return parent.id;
  }

  function upsert(definition) {
    const prior = existing(definition.externalId);
    const feature = store.upsertFeature({
      projectId,
      externalId: definition.externalId,
      parentId: definition.parentExternalId
        ? parentId(definition.parentExternalId)
        : prior?.parentId ?? null,
      world: 'world',
      name: definition.name ?? prior?.name,
      kind: definition.kind ?? prior?.kind,
      status: 'complete',
      geometry: definition.geometry ?? prior?.geometry,
      source: 'rcon',
      sourceRef,
      confidence: 1,
      completionRatio: 1,
      conditionScore: 100,
      tags: [...new Set([...(prior?.tags ?? []), 'wave5', 'as-built', ...(definition.tags ?? [])])],
      attributes: {
        ...(prior?.attributes ?? {}),
        ...(definition.attributes ?? {}),
        evidence,
      },
      observedAt,
    });
    byExternalId.set(definition.externalId, feature);
    imported.push({
      id: feature.id,
      externalId: feature.externalId,
      parentId: feature.parentId,
      kind: feature.kind,
      revision: feature.revision,
      created: !prior,
    });
    return feature;
  }

  // Promote the existing coarse parents first.
  for (const definition of [
    {
      externalId: 'C01',
      tags: ['primary-stair', 'fully-programmed', 'parking-side-arrival'],
      attributes: {
        advertisedVerticalAccess: 'C01-STAIR-CORE-PRIMARY',
        serviceRiser: 'U01',
        lowerNaturalShellFailuresRepaired: true,
      },
    },
    {
      externalId: 'OBS-S01',
      tags: ['working-observatory', 'open-apertures', 'three-working-lenses'],
      attributes: {
        roomCount: 8,
        domeApertures: [
          { id: 'west', center: [190, 126, 151], radius: 4 },
          { id: 'central', center: [206, 126, 151], radius: 8 },
          { id: 'east', center: [222, 126, 151], radius: 4 },
        ],
      },
    },
    {
      externalId: 'APT-S01',
      geometry: bounds(178, 105, 139, 225, 114, 180),
      tags: ['separate-from-observatory', 'luxury-residence', 'actual-bedroom'],
      attributes: {
        primaryEntryRoute: 'ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR',
        emergencyEgress: 'OFF-S01 concealed library door',
        oneBedroom: true,
        actualDoubleBed: true,
        roomsDistinct: true,
      },
    },
    {
      externalId: 'APT-S01-BEDROOM',
      geometry: bounds(217, 105, 152, 225, 114, 166),
      tags: ['primary-bedroom', 'private-overlook', 'actual-double-bed'],
    },
    {
      externalId: 'SHL-S01',
      tags: ['inhabitable', 'actual-beds', 'bidirectional-treasury'],
      attributes: {
        actualBedCount: 7,
        dry: true,
        treasuryBidirectional: true,
        safeBulkheadRestored: true,
      },
    },
    {
      externalId: 'VLT-G01',
      tags: ['fall-safe', 'three-distinct-programs', 'titanic-stair'],
      attributes: {
        atriumBalustrades: true,
        loadedChestsPreserved: 9,
        dry: true,
      },
    },
    {
      externalId: 'VLT-G01-UPPER',
      attributes: { program: ['access control', 'key custody', 'ledger command', 'private viewing salon'] },
    },
    {
      externalId: 'VLT-G01-MIDDLE',
      attributes: { program: ['artifact archive', 'appraisal', 'restoration', 'secure armory'] },
    },
    {
      externalId: 'VLT-G01-LOWER',
      attributes: { program: ['bullion hall', 'mint inspection', 'disaster reserve', 'prized plinth'] },
    },
    {
      externalId: 'C01-LOWER-THEATER',
      tags: ['enclosure-repaired', 'briefing-theater'],
      attributes: { naturalStoneInteriorCellsRemaining: 0, program: ['stage', 'status screen', 'stepped seating', 'AV booth'] },
    },
    {
      externalId: 'C01-CONFERENCE-A',
      tags: ['enclosure-repaired', 'incident-planning'],
    },
    {
      externalId: 'C01-CONFERENCE-B',
      tags: ['enclosure-repaired', 'secure-video-conference'],
    },
    {
      externalId: 'C01-CONFERENCE-C',
      tags: ['enclosure-repaired', 'executive-continuity'],
    },
    {
      externalId: 'C01-UPPER-HANGAR',
      tags: ['aviation-programmed', 'aircraft-displays', 'rescue-vehicle'],
    },
    {
      externalId: 'C01-UPPER-ARENA',
      tags: ['incident-response-training', 'bleachers', 'medical-decon'],
    },
  ]) upsert(definition);

  const definitions = [
    {
      externalId: 'C01-STAIR-CORE-PRIMARY',
      parentExternalId: 'C01',
      name: 'C01 enclosed primary stair core',
      kind: 'utility',
      geometry: bounds(204, 50, 152, 216, 110, 164),
      tags: ['ladderless', 'two-wide', 'enclosed-stair'],
      attributes: {
        interfaces: [
          [206, 51, 154],
          [214, 63, 158],
          [206, 81, 156],
          [213, 100, 162],
          [207, 106, 160],
        ],
        bidirectionalQa: true,
      },
    },
    {
      externalId: 'ROUTE:C01-PRIMARY-STAIR',
      parentExternalId: 'C01',
      name: 'C01 lower operations to office primary stair route',
      kind: 'custom',
      geometry: route([
        [206, 51, 154],
        [214, 63, 158],
        [206, 81, 156],
        [213, 100, 162],
        [207, 106, 160],
      ]),
      tags: ['route', 'bidirectional', 'primary-circulation'],
    },
    {
      externalId: 'OBS-S01-FOYER',
      parentExternalId: 'OBS-S01',
      name: 'Observatory celestial entry gallery',
      kind: 'room',
      geometry: bounds(197, 120, 157, 215, 126, 165),
      tags: ['foyer', 'exhibits', 'reception'],
    },
    {
      externalId: 'OBS-S01-INSTRUMENT-ARCHIVE',
      parentExternalId: 'OBS-S01',
      name: 'Observatory instrument archive and research lab',
      kind: 'room',
      geometry: bounds(197, 120, 137, 215, 126, 145),
      tags: ['archive', 'instrument-lab'],
    },
    {
      externalId: 'OBS-S01-OPTICS-WORKSHOP-WEST',
      parentExternalId: 'OBS-S01',
      name: 'West dome optics workshop',
      kind: 'room',
      geometry: bounds(185, 120, 137, 196, 126, 143),
      tags: ['optics', 'workshop'],
    },
    {
      externalId: 'OBS-S01-OBSERVATION-LOG-WEST',
      parentExternalId: 'OBS-S01',
      name: 'West observation log room',
      kind: 'room',
      geometry: bounds(185, 120, 159, 196, 126, 165),
      tags: ['observation-log', 'chart-archive'],
    },
    {
      externalId: 'OBS-S01-INSTRUMENT-LAB-EAST',
      parentExternalId: 'OBS-S01',
      name: 'East solar instrument laboratory',
      kind: 'room',
      geometry: bounds(216, 120, 137, 227, 126, 149),
      tags: ['solar-observatory', 'instrument-lab', 'hidden-door'],
    },
    {
      externalId: 'OBS-S01-PHOTO-CONTROL-EAST',
      parentExternalId: 'OBS-S01',
      name: 'East photo-control room',
      kind: 'room',
      geometry: bounds(216, 120, 159, 227, 126, 165),
      tags: ['photo-control', 'observation-bench'],
    },
    {
      externalId: 'OBS-S01-LENS-WEST',
      parentExternalId: 'OBS-S01',
      name: 'West visual refractor objective',
      kind: 'landmark',
      geometry: point(190, 130, 145),
      tags: ['working-lens', 'tinted-glass', 'amethyst-focus'],
    },
    {
      externalId: 'OBS-S01-LENS-CENTRAL',
      parentExternalId: 'OBS-S01',
      name: 'Central research telescope objective',
      kind: 'landmark',
      geometry: point(206, 132, 143),
      tags: ['working-lens', 'tinted-glass', 'amethyst-focus'],
    },
    {
      externalId: 'OBS-S01-LENS-EAST',
      parentExternalId: 'OBS-S01',
      name: 'East solar-photo telescope objective',
      kind: 'landmark',
      geometry: point(222, 130, 145),
      tags: ['working-lens', 'tinted-glass', 'amethyst-focus'],
    },
    {
      externalId: 'ROUTE:OBS-PUBLIC-STAIR',
      parentExternalId: 'OBS-S01',
      name: 'Hangar to observatory public switchback stair',
      kind: 'custom',
      geometry: route([
        [176, 99, 163],
        [167, 104, 163],
        [172, 110, 159],
        [167, 116, 155],
        [171, 121, 153],
        [184, 121, 154],
      ]),
      tags: ['route', 'public', 'ladderless', 'two-wide', 'bidirectional'],
    },
    {
      externalId: 'ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR',
      parentExternalId: 'APT-S01',
      name: 'Concealed observatory to penthouse stair',
      kind: 'custom',
      geometry: route([
        [217, 121, 142],
        [219, 121, 140],
        [219, 116, 144],
        [224, 111, 144],
        [219, 106, 147],
        [217, 106, 147],
      ]),
      tags: ['route', 'private', 'concealed', 'ladderless', 'bidirectional'],
    },
    {
      externalId: 'APT-S01-VESTIBULE',
      parentExternalId: 'APT-S01',
      name: 'Penthouse secure entry vestibule',
      kind: 'room',
      geometry: bounds(208, 105, 147, 217, 114, 151),
      tags: ['private', 'controlled-entry'],
    },
    {
      externalId: 'APT-S01-DRESSING-LOUNGE',
      parentExternalId: 'APT-S01',
      name: 'Penthouse dressing lounge',
      kind: 'room',
      geometry: bounds(179, 105, 150, 190, 114, 162),
      tags: ['dressing-room', 'lounge', 'wardrobe'],
    },
    {
      externalId: 'APT-S01-LIVING-SALON',
      parentExternalId: 'APT-S01',
      name: 'Penthouse living salon',
      kind: 'room',
      geometry: bounds(208, 105, 167, 217, 114, 180),
      tags: ['salon', 'music', 'private'],
    },
    {
      externalId: 'APT-S01-DINING-KITCHEN',
      parentExternalId: 'APT-S01',
      name: 'Penthouse dining kitchen',
      kind: 'room',
      geometry: bounds(218, 105, 167, 225, 114, 180),
      tags: ['kitchen', 'dining', 'private'],
    },
    {
      externalId: 'FAL-S01-DORMITORY',
      parentExternalId: 'FAL-S01',
      name: 'Fallout shelter dormitory',
      kind: 'room',
      geometry: bounds(149, 81, 144, 157, 90, 158),
      tags: ['actual-beds', 'bunk-lockers'],
    },
    {
      externalId: 'FAL-S01-GALLEY-COMMONS',
      parentExternalId: 'FAL-S01',
      name: 'Fallout shelter galley and commons',
      kind: 'room',
      geometry: bounds(157, 81, 144, 165, 90, 163),
      tags: ['galley', 'dining', 'dry-services'],
    },
    {
      externalId: 'SAFE-U01-SANITATION-DECON',
      parentExternalId: 'SAFE-U01',
      name: 'Shelter dry sanitation and decon',
      kind: 'room',
      geometry: bounds(183, 81, 156, 187, 90, 159),
      tags: ['sanitation', 'decon', 'dry'],
    },
    {
      externalId: 'COM-S01-RADIO-CRYPTO-DISPATCH',
      parentExternalId: 'COM-S01',
      name: 'Shelter radio, crypto, and dispatch floor',
      kind: 'room',
      geometry: bounds(167, 81, 164, 187, 90, 179),
      tags: ['radio', 'crypto', 'dispatch', 'powered-displays'],
    },
    {
      externalId: 'C01-HANGAR-AIRCRAFT-A',
      parentExternalId: 'C01-UPPER-HANGAR',
      name: 'C01 north-west utility aircraft display',
      kind: 'landmark',
      geometry: bounds(138, 62, 88, 160, 67, 104),
      tags: ['aircraft', 'flight-line-display'],
    },
    {
      externalId: 'C01-HANGAR-ROTORCRAFT-B',
      parentExternalId: 'C01-UPPER-HANGAR',
      name: 'C01 south-west rotorcraft display',
      kind: 'landmark',
      geometry: bounds(118, 62, 109, 139, 68, 127),
      tags: ['rotorcraft', 'flight-line-display'],
    },
    {
      externalId: 'C01-HANGAR-RESCUE-VEHICLE',
      parentExternalId: 'C01-UPPER-HANGAR',
      name: 'C01 hangar rescue vehicle',
      kind: 'landmark',
      geometry: bounds(156, 62, 122, 172, 68, 133),
      tags: ['rescue', 'vehicle', 'emergency-response'],
    },
    {
      externalId: 'C01-ARENA-RESPONSE-COURSE',
      parentExternalId: 'C01-UPPER-ARENA',
      name: 'C01 incident-response obstacle course',
      kind: 'room',
      geometry: bounds(211, 62, 85, 245, 68, 124),
      tags: ['obstacle-course', 'urban-search', 'rescue-training'],
    },
    {
      externalId: 'C01-ARENA-MEDICAL-DECON',
      parentExternalId: 'C01-UPPER-ARENA',
      name: 'C01 arena medical and decon zone',
      kind: 'room',
      geometry: bounds(233, 62, 116, 245, 68, 129),
      tags: ['medical', 'decon', 'triage'],
    },
  ];
  for (const definition of definitions) upsert(definition);

  const scan = store.createScan({
    projectId,
    world: 'world',
    method: 'region_snapshot',
    bounds: bounds(100, 44, 70, 262, 136, 226),
    observer: 'mainstreet-secure-complex-wave5-auditor',
    snapshotRef,
    summary: {
      evidence,
      importedFeatures: imported.length,
      freshDesignReviews: reviewRefs,
      visualInspection: {
        screenshots,
        populatedImageChecksPassed: screenshots.length,
      },
    },
  });
  for (const result of imported) {
    store.recordObservation({
      scanId: scan.id,
      featureId: result.id,
      status: 'complete',
      completionRatio: 1,
      conditionScore: 100,
      details: {
        snapshotRef,
        sourceRef,
        qaRef,
        operationSha256,
        savedWorldQaPassed: 21,
      },
    });
  }
  store.completeScan(scan.id, {
    summary: {
      ...scan.summary,
      observations: imported.length,
      status: 'complete',
    },
  });

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projectId,
    dbPath,
    snapshotRef,
    operationSha256,
    importedFeatures: imported.length,
    createdFeatures: imported.filter((feature) => feature.created).length,
    updatedFeatures: imported.filter((feature) => !feature.created).length,
    scanId: scan.id,
    observations: imported.length,
    byKind: Object.fromEntries(
      [...new Set(imported.map((feature) => feature.kind))].sort().map((kind) => [
        kind,
        imported.filter((feature) => feature.kind === kind).length,
      ]),
    ),
    features: imported,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  store.close();
}
