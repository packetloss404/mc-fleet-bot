#!/usr/bin/env node
/**
 * Import the verified MainStreet America parking recovery as first-class
 * WorldFeatureStore records and attach a completed as-built scan.
 *
 * The 236 bay definitions come from the generated report. Phase 8b corrected
 * the premium depth, accessible access aisles, gate width, rain garden, and
 * hangar route. Phase 8c added flush low lighting. This importer deliberately
 * resolves parent database IDs at runtime, so it is safe across databases.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(
  root,
  'data',
  'buildops',
  'mainstreet-parking-arrival-gardens-2026-07-26.report.json',
);
const opsPaths = [
  'data/buildops/mainstreet-parking-arrival-gardens-2026-07-26.txt',
  'data/buildops/mainstreet-parking-access-wayfinding-phase8b-2026-07-26.txt',
  'data/buildops/mainstreet-parking-low-lighting-phase8c-2026-07-26.txt',
];
const recoveryRef = 'mainstreet-america/qa/parking-recovery-2026-07-26.md';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const store = new WorldFeatureStore();
const observedAt = Date.now();

function sha256(relativePath) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex');
}

function feature(externalId, name, kind, geometry, attributes = {}, tags = []) {
  return {
    projectId: 'mainstreet-america',
    externalId,
    world: 'world',
    name,
    kind,
    status: 'complete',
    geometry,
    source: 'rcon',
    sourceRef: recoveryRef,
    confidence: 1,
    completionRatio: 1,
    conditionScore: 100,
    tags: ['parking-recovery', ...tags],
    attributes,
    observedAt,
  };
}

function bounds(minX, minY, minZ, maxX, maxY, maxZ) {
  return { type: 'bounds', minX, minY, minZ, maxX, maxY, maxZ };
}

function point(x, y, z) {
  return { type: 'point', position: { x, y, z } };
}

function pathGeometry(points, width) {
  return { type: 'path', points, width };
}

try {
  if (report.capacity?.totalBays !== 236 || report.capacity?.bays?.length !== 236) {
    throw new Error('parking report must define exactly 236 bays');
  }

  const projectFeatures = store.listFeatures({
    projectId: 'mainstreet-america',
    limit: 1_000,
  });
  const byExternalId = new Map(
    projectFeatures
      .filter((item) => item.externalId)
      .map((item) => [item.externalId, item]),
  );
  const existingParking = byExternalId.get('P01');
  if (!existingParking) {
    throw new Error('P01 is missing; import integration/world-features.json first');
  }

  const opsHashes = Object.fromEntries(opsPaths.map((filename) => [filename, sha256(filename)]));
  const parking = store.upsertFeature({
    ...feature(
      'P01',
      'Visitor parking and Arrival Gardens',
      'parking',
      bounds(-125, 64, 172, 125, 72, 305),
      {
        historicalAreaSqftApprox: 100000,
        builtSlabAreaSqftApprox: 97400,
        spaceCountClaimed: true,
        spaceCountVerified: 236,
        standardSpaces: 205,
        accessibleSpaces: 8,
        evSpaces: 14,
        premiumSpaces: 9,
        driveAisles: 3,
        poleLights: 23,
        flushLights: 32,
        solarStyleCanopies: 2,
        southGateReachableFromLot: true,
        guestCenterReachableFromLot: true,
        mountainPortalReachableFromLot: true,
        exactDesiredCellsVerified: 41809,
        opsHashes,
        verifiedVsCreative: {
          historical: ['approximately 100,000 SF', '236 parking spaces'],
          reconstruction: [
            'exact bay geometry',
            'Arrival Gardens',
            'Festival Row',
            'accessible layout',
            'EV and solar-style canopies',
            'Discovery Court',
          ],
        },
      },
      ['parking', 'arrival-gardens', 'built', 'audited', '236-spaces'],
    ),
    parentId: existingParking.parentId,
  });

  const children = [];
  for (const bay of report.capacity.bays) {
    const isPremium = bay.type === 'premium';
    const minZ = isPremium ? 172 : bay.minZ;
    children.push({
      ...feature(
        `P01-BAY-${String(bay.ordinal).padStart(3, '0')}`,
        `Parking bay ${String(bay.ordinal).padStart(3, '0')}`,
        'parking',
        bounds(bay.minX, 64, minZ, bay.maxX, 64, bay.maxZ),
        {
          parentExternalId: 'P01',
          ordinal: bay.ordinal,
          band: bay.band,
          bayType: bay.type,
          leftStripeX: bay.leftStripe,
          fullDepthCorrection: isPremium,
        },
        ['parking-bay', `bay-${bay.type}`],
      ),
      parentId: parking.id,
    });
  }

  for (const aisle of report.circulation.aisles) {
    children.push({
      ...feature(
        `P01-${aisle.id.toUpperCase()}`,
        aisle.id.replaceAll('-', ' '),
        'driveway',
        bounds(aisle.minX, 64, aisle.minZ, aisle.maxX, 64, aisle.maxZ),
        { parentExternalId: 'P01', minimumWidth: 9 },
        ['parking-aisle', aisle.id.includes('festival') ? 'festival-row' : 'drive-aisle'],
      ),
      parentId: parking.id,
    });
  }

  report.circulation.crossings.forEach((crossing, index) => {
    children.push({
      ...feature(
        `P01-CROSSWALK-${String(index + 1).padStart(2, '0')}`,
        `Parking crosswalk ${index + 1}`,
        'sidewalk',
        bounds(crossing.minX, 64, crossing.minZ, crossing.maxX, 64, crossing.maxZ),
        { parentExternalId: 'P01', flush: true },
        ['crosswalk'],
      ),
      parentId: parking.id,
    });
  });

  const accessiblePods = [
    { id: 'WEST', minX: -41, maxX: -21, connectorMinX: -41, connectorMaxX: -5 },
    { id: 'EAST', minX: 21, maxX: 41, connectorMinX: 5, connectorMaxX: 41 },
  ];
  for (const pod of accessiblePods) {
    children.push({
      ...feature(
        `P01-ACCESSIBLE-POD-${pod.id}`,
        `${pod.id.toLowerCase()} accessible access aisle`,
        'sidewalk',
        bounds(pod.minX, 64, 180, pod.maxX, 64, 182),
        {
          parentExternalId: 'P01',
          sharedAisleWidth: 3,
          markedSpaces: 4,
          stepFreeConnector: {
            minX: pod.connectorMinX,
            maxX: pod.connectorMaxX,
            minZ: 177,
            maxZ: 179,
          },
        },
        ['accessible', 'shared-access-aisle', 'step-free'],
      ),
      parentId: parking.id,
    });
  }

  const profile = report.circulation.southArrivalProfile;
  const profilePoints = profile.map(({ z, floorY }) => ({ x: 0, y: floorY, z }));
  children.push({
    ...feature(
      'P01-SOUTH-ARRIVAL-CARRIAGE',
      'South gate terraced carriage approach',
      'road',
      pathGeometry(profilePoints, 13),
      {
        parentExternalId: 'P01',
        start: profilePoints[0],
        end: profilePoints.at(-1),
        rise: 14,
        fullGateWidth: 21,
      },
      ['south-arrival', 'terraced', 'gate-connection'],
    ),
    parentId: parking.id,
  });
  for (const x of [-8, 8]) {
    children.push({
      ...feature(
        `P01-SOUTH-ARRIVAL-WALK-${x < 0 ? 'WEST' : 'EAST'}`,
        `${x < 0 ? 'West' : 'East'} south-arrival walk`,
        'sidewalk',
        pathGeometry(profile.map(({ z, floorY }) => ({ x, y: floorY, z })), 3),
        { parentExternalId: 'P01', stepFreeByReachabilityModel: true },
        ['south-arrival', 'pedestrian'],
      ),
      parentId: parking.id,
    });
  }

  for (const lamp of report.amenities.lamps) {
    children.push({
      ...feature(
        `P01-${lamp.id}`,
        `Parking dual-head light ${lamp.id}`,
        'lighting',
        point(lamp.x, lamp.lightY, lamp.z),
        { parentExternalId: 'P01', fixture: lamp.type, heads: 2 },
        ['parking-light', 'dual-head'],
      ),
      parentId: parking.id,
    });
  }

  const flushLights = [
    [-106, 191], [-76, 191], [-46, 191], [46, 191], [76, 191],
    [-106, 218], [-76, 218], [-46, 218], [46, 218], [76, 218],
    [-107, 245], [-77, 245], [-47, 245], [-17, 245],
    [17, 245], [47, 245], [77, 245], [107, 245],
    [-6, 180], [6, 180], [-6, 204], [6, 204], [-6, 228], [6, 228],
    [-6, 252], [6, 252], [-6, 268], [6, 268],
    [-122, 254], [-7, 254], [7, 254], [122, 254],
  ];
  flushLights.forEach(([x, z], index) => {
    children.push({
      ...feature(
        `P01-LOW-LIGHT-${String(index + 1).padStart(2, '0')}`,
        `Parking flush light ${index + 1}`,
        'lighting',
        point(x, 64, z),
        { parentExternalId: 'P01', fixture: 'flush-sea-lantern' },
        ['parking-light', 'flush', 'bollard-alternative'],
      ),
      parentId: parking.id,
    });
  });

  for (const canopy of report.amenities.canopies) {
    children.push({
      ...feature(
        `P01-CANOPY-${canopy.id.startsWith('west') ? 'WEST' : 'EAST'}`,
        canopy.id.replaceAll('-', ' '),
        'building',
        bounds(canopy.minX, canopy.minY, canopy.minZ, canopy.maxX, canopy.maxY, canopy.maxZ),
        {
          parentExternalId: 'P01',
          solarStyle: true,
          producesPower: false,
          evMarkedBays: true,
          supportXs: canopy.supports,
        },
        ['parking-canopy', 'ev', 'solar-style'],
      ),
      parentId: parking.id,
    });
  }

  const landscapeFeatures = [
    feature(
      'P01-GARDEN-WEST',
      'West formal Arrival Garden',
      'landscape',
      bounds(-18, 64, 181, -6, 72, 218),
      { parentExternalId: 'P01' },
      ['formal-garden'],
    ),
    feature(
      'P01-GARDEN-EAST',
      'East formal Arrival Garden',
      'landscape',
      bounds(6, 64, 181, 18, 72, 218),
      { parentExternalId: 'P01' },
      ['formal-garden'],
    ),
    feature(
      'P01-GARDEN-SOUTH-ARRIVAL',
      'South-arrival flowering retaining gardens',
      'landscape',
      bounds(-11, 65, 268, 11, 88, 300),
      { parentExternalId: 'P01' },
      ['terraced-garden', 'south-arrival'],
    ),
    feature(
      'P01-GARDEN-RAIN-SOUTHEAST',
      'Southeast rain garden',
      'landscape',
      bounds(100, 64, 240, 119, 65, 245),
      { parentExternalId: 'P01', drainageTreatment: 'visual-no-subgrade-channel' },
      ['rain-garden'],
    ),
  ];
  for (const item of landscapeFeatures) children.push({ ...item, parentId: parking.id });

  children.push({
    ...feature(
      'P01-DISCOVERY-COURT',
      'Mountain Discovery Court',
      'landmark',
      bounds(87, 64, 183, 95, 70, 209),
      {
        parentExternalId: 'P01',
        directory: true,
        photoArch: true,
        shuttleShelter: true,
        mountainNoTouchBoundaryX: 96,
        portalReachable: true,
      },
      ['discovery-court', 'mountain-arrival'],
    ),
    parentId: parking.id,
  });
  children.push({
    ...feature(
      'P01-BIKE-CORRAL',
      'Arrival bicycle corral',
      'custom',
      bounds(-76, 64, 177, -73, 66, 181),
      { parentExternalId: 'P01' },
      ['bike-corral'],
    ),
    parentId: parking.id,
  });
  for (const z of [276, 288, 300]) {
    const entry = profile.find((item) => item.z === z);
    children.push({
      ...feature(
        `P01-SOUTH-ARCH-${z}`,
        `South-arrival arch at z${z}`,
        'landmark',
        bounds(-10, entry.floorY + 1, z, 10, entry.floorY + 6, z),
        { parentExternalId: 'P01' },
        ['south-arrival', 'arch'],
      ),
      parentId: parking.id,
    });
  }

  const eastComplex = byExternalId.get('C01');
  if (!eastComplex) throw new Error('C01 is missing');
  const hangarRoute = {
    ...feature(
      'C01-ARENA-HANGAR-WAYFINDING',
      'Arena-to-hangar illuminated route',
      'sidewalk',
      pathGeometry([
        { x: 207, y: 62, z: 108 },
        { x: 150, y: 62, z: 108 },
      ], 1),
      {
        parentExternalId: 'C01',
        direction: 'west-to-hangar',
        litMarkers: 8,
        reachable: true,
      },
      ['mountain-wayfinding', 'hangar-route'],
    ),
    parentId: eastComplex.id,
  };

  const imported = store.importFeatures([...children, hangarRoute]);
  const scan = store.createScan({
    projectId: 'mainstreet-america',
    world: 'world',
    method: 'region_snapshot',
    bounds: bounds(-125, 45, 70, 300, 115, 305),
    observer: 'parking-recovery-2026-07-26',
    snapshotRef: `data/worldsnap/region:r.0.0=${sha256('data/worldsnap/region/r.0.0.mca')}`,
    summary: {
      phase: 'parking-arrival-gardens',
      featureCount: imported.length + 1,
      expectedCells: 41809,
      opsHashes,
    },
  });

  store.recordObservation({
    scanId: scan.id,
    featureId: parking.id,
    status: 'complete',
    completionRatio: 1,
    conditionScore: 100,
    expectedBlocks: 41809,
    observedBlocks: 41809,
    details: {
      bayCount: 236,
      protectedMasksUnchanged: 3,
      reachabilityTargetsPassed: 8,
      maxSampledLightDistance: 11.180339887498949,
      auditChecksPassed: 66,
      auditChecksFailed: 0,
      images: [
        'mainstreet-america/qa/msa-parking-bluemap-overview-after.png',
        'mainstreet-america/qa/msa-parking-bluemap-arrival-after.png',
        'mainstreet-america/qa/msa-parking-bluemap-night-after.png',
      ],
    },
    observedAt,
  });
  for (const item of imported) {
    store.recordObservation({
      scanId: scan.id,
      featureId: item.id,
      status: 'complete',
      completionRatio: 1,
      conditionScore: 100,
      details: { sourceRef: recoveryRef },
      observedAt,
    });
  }
  const completedScan = store.completeScan(scan.id, {
    status: 'complete',
    summary: {
      phase: 'parking-arrival-gardens',
      featureCount: imported.length + 1,
      observations: imported.length + 1,
      expectedCells: 41809,
      observedCells: 41809,
      exactMatch: true,
      totalBays: 236,
      protectedMasksUnchanged: 3,
      reachabilityTargetsPassed: 8,
      audit: { passed: 66, failed: 0, unknown: 0 },
      opsHashes,
    },
  });

  console.log(JSON.stringify({
    projectId: 'mainstreet-america',
    parkingFeatureId: parking.id,
    childFeatures: imported.filter((item) => item.parentId === parking.id).length,
    totalImportedFeatures: imported.length,
    scanId: completedScan.id,
    scanStatus: completedScan.status,
    dbPath: store.dbPath,
  }));
} finally {
  store.close();
}
