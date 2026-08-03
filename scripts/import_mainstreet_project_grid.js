#!/usr/bin/env node
/**
 * Import MainStreet America's project grid and current surface-aviation
 * program into WorldFeatureStore.
 *
 * Safety:
 *   node scripts/import_mainstreet_project_grid.js --dry-run [--scan]
 *   node scripts/import_mainstreet_project_grid.js --apply [--scan] [--db PATH]
 *
 * No database is opened unless one of --dry-run or --apply is explicit.
 * --dry-run uses a disposable database. --scan adds a completed, deduplicated
 * manifest-import scan; feature import alone never invents a survey run.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const projectId = 'mainstreet-america';
const world = 'world';
const importerRef = 'scripts/import_mainstreet_project_grid.js';
const planRef = 'mainstreet-america/planning/project-grid.yaml';
const boundaryReportRef =
  'data/buildops/mainstreet-project-boundaries-2026-07-26.report.json';
const gridReportRef =
  'data/buildops/mainstreet-grid-projects-2026-07-26.report.json';
const roadReportRef =
  'data/buildops/mainstreet-grid-roads-2026-07-26.report.json';
const mountainWayfindingReportRef =
  'data/buildops/mainstreet-mountain-wayfinding-2026-07-26.report.json';
const mountainFitoutRef =
  'data/buildops/mainstreet-east-complex-phase6-2026-07-26.txt';
const homesBuildRef =
  'data/buildops/mainstreet-homes-phase4-2026-07-26.txt';
const landscapeBuildRef =
  'data/buildops/mainstreet-audit-landscapes-2026-07-26.txt';
const surfaceReportRef =
  'data/buildops/mainstreet-surface-hangar-observatory-2026-07-26.report.json';
const surfaceOpsRef =
  'data/buildops/mainstreet-surface-hangar-observatory-2026-07-26.txt';
const supplementaryRefs = [
  'data/buildops/mainstreet-c01-public-gate-2026-07-26.txt',
  'data/buildops/mainstreet-surface-hangar-terrace-rail-repair-2026-07-26.txt',
  'data/buildops/mainstreet-private-circulation-repair-2026-07-26.txt',
  'data/buildops/mainstreet-circulation-qa-repair-2026-07-26.txt',
  'data/buildops/mainstreet-private-room-access-repair-2026-07-26.txt',
  'data/buildops/mainstreet-grand-vault-threshold-repair-2026-07-26.txt',
  'data/buildops/mainstreet-grand-vault-dewatering-repair-2026-07-26.txt',
  'data/buildops/mainstreet-private-stair-final-repair-2026-07-26.txt',
  'data/buildops/mainstreet-vault-aquifer-source-seal-2026-07-26.txt',
  'data/buildops/mainstreet-secure-roof-landscape-2026-07-26.report.json',
  'mainstreet-america/integration/worldguard.yaml',
  'mainstreet-america/qa/audit-closure-2026-07-26.json',
];

function usage(message) {
  if (message) console.error(message);
  console.error(
    'Usage: node scripts/import_mainstreet_project_grid.js ' +
    '(--dry-run|--apply) [--scan] [--db PATH]',
  );
  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const result = {
    apply: false,
    dryRun: false,
    scan: false,
    dbPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') result.apply = true;
    else if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--scan') result.scan = true;
    else if (arg === '--db') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) usage('--db requires a path');
      result.dbPath = path.resolve(value);
      index += 1;
    } else if (arg === '--help' || arg === '-h') usage();
    else usage(`unknown argument: ${arg}`);
  }
  if (result.apply === result.dryRun) {
    usage('choose exactly one of --dry-run or --apply');
  }
  if (result.dryRun && result.dbPath) {
    usage('--db cannot be used with --dry-run');
  }
  return result;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function sha256File(relativePath) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex');
}

function hashSnapshotDirectory(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const files = fs.readdirSync(absoluteDirectory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  if (files.length === 0) {
    throw new Error(`${relativeDirectory} contains no Anvil region files`);
  }
  const digest = crypto.createHash('sha256');
  for (const name of files) {
    digest.update(name);
    digest.update('\0');
    digest.update(fs.readFileSync(path.join(absoluteDirectory, name)));
    digest.update('\0');
  }
  return digest.digest('hex');
}

function bounds(minX, minY, minZ, maxX, maxY, maxZ) {
  return { type: 'bounds', minX, minY, minZ, maxX, maxY, maxZ };
}

function boundsFromArray(box) {
  if (!Array.isArray(box) || box.length !== 6 || box.some((value) => !Number.isFinite(value))) {
    throw new Error('report envelope must be [minX,minY,minZ,maxX,maxY,maxZ]');
  }
  return bounds(...box);
}

function point(x, y, z) {
  return { type: 'point', position: { x, y, z } };
}

function pathGeometry(rawPoints, width = 1) {
  const points = rawPoints.map((rawPoint) => {
    if (Array.isArray(rawPoint)) {
      const [x, y, z] = rawPoint;
      return { x, y, z };
    }
    return rawPoint;
  });
  return { type: 'path', points, width };
}

function polygon(vertices, minY, maxY) {
  return {
    type: 'polygon',
    points: vertices.map(([x, z]) => ({ x, z })),
    minY,
    maxY,
  };
}

function makeFeature({
  externalId,
  parentExternalId = null,
  name,
  kind,
  geometry,
  status = 'complete',
  source = 'import',
  sourceRef = importerRef,
  confidence = 1,
  completionRatio = status === 'complete' ? 1 : null,
  conditionScore = status === 'complete' ? 100 : null,
  tags = [],
  attributes = {},
}) {
  return {
    projectId,
    externalId,
    parentExternalId,
    world,
    name,
    kind,
    status,
    geometry,
    source,
    sourceRef,
    confidence,
    completionRatio,
    conditionScore,
    tags,
    attributes,
  };
}

function gateGeometry(gate) {
  if (gate.axis === 'x') {
    return pathGeometry([
      { x: gate.min, y: 64, z: gate.fixed },
      { x: gate.max, y: 64, z: gate.fixed },
    ]);
  }
  if (gate.axis === 'z') {
    return pathGeometry([
      { x: gate.fixed, y: 64, z: gate.min },
      { x: gate.fixed, y: 64, z: gate.max },
    ]);
  }
  throw new Error(`gate ${gate.id} has invalid axis`);
}

function roadGeometry(road) {
  if (!Array.isArray(road.centerline) || road.centerline.length < 2) {
    throw new Error(`road ${road.id} requires at least two centerline points`);
  }
  return pathGeometry(
    road.centerline.map(([x, z]) => ({ x, y: 64, z })),
    road.width,
  );
}

function roadJunctions(roads) {
  const vertical = [];
  const horizontal = [];
  for (const road of roads) {
    const [[x1, z1], [x2, z2]] = road.centerline;
    if (x1 === x2) vertical.push({ ...road, x: x1, minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2) });
    else if (z1 === z2) {
      horizontal.push({ ...road, z: z1, minX: Math.min(x1, x2), maxX: Math.max(x1, x2) });
    } else {
      throw new Error(`road ${road.id} is not orthogonal`);
    }
  }

  const junctions = [];
  for (const northSouth of vertical) {
    for (const eastWest of horizontal) {
      const tolerance = Math.max(northSouth.width, eastWest.width);
      const connectsX = northSouth.x >= eastWest.minX - tolerance
        && northSouth.x <= eastWest.maxX + tolerance;
      const connectsZ = eastWest.z >= northSouth.minZ - tolerance
        && eastWest.z <= northSouth.maxZ + tolerance;
      if (!connectsX || !connectsZ) continue;
      junctions.push({
        id: `JCT-${northSouth.id}-${eastWest.id}`,
        name: `${northSouth.name} / ${eastWest.name}`,
        x: northSouth.x,
        z: eastWest.z,
        roads: [northSouth.id, eastWest.id],
        centerlineGap: Math.max(
          eastWest.minX - northSouth.x,
          northSouth.x - eastWest.maxX,
          northSouth.minZ - eastWest.z,
          eastWest.z - northSouth.maxZ,
          0,
        ),
      });
    }
  }
  return junctions;
}

function buildDefinitions(
  plan,
  boundaryReport,
  gridReport,
  roadReport,
  mountainWayfindingReport,
  surfaceReport,
  sourceHashes,
) {
  if (!plan.site || !Array.isArray(plan.roads) || !Array.isArray(plan.boundaries)) {
    throw new Error('project-grid.yaml requires site, roads, and boundaries');
  }
  if (!surfaceReport.envelopes || !surfaceReport.floorplans || !surfaceReport.route) {
    throw new Error('surface report is missing envelopes, floorplans, or route');
  }

  const site = plan.site;
  const siteBounds = site.bounds;
  const definitions = [];
  definitions.push(makeFeature({
    externalId: 'SITE',
    name: 'MainStreet America campus',
    kind: 'property',
    geometry: bounds(
      siteBounds.min_x,
      siteBounds.min_y,
      siteBounds.min_z,
      siteBounds.max_x,
      siteBounds.max_y,
      siteBounds.max_z,
    ),
    status: 'complete',
    source: 'manifest',
    sourceRef: planRef,
    completionRatio: 1,
    conditionScore: 100,
    tags: ['campus', 'project-grid', 'worldguard-protected'],
    attributes: {
      hierarchyVersion: plan.schema_version,
      coordinateSystem: plan.coordinate_system,
      worldGuardRegion: site.worldguard_region,
      worldGuardBounds: {
        minX: -300,
        minY: -64,
        minZ: -300,
        maxX: 300,
        maxY: 319,
        maxZ: 300,
      },
      mountainWorldGuardRegion: 'msa_mountain_sub',
      mountainWorldGuardBounds: {
        minX: 90,
        minY: -64,
        minZ: 70,
        maxX: 294,
        maxY: 61,
        maxZ: 240,
      },
      materialAudit: {
        passed: 96,
        failed: 0,
        unknown: 0,
        sourceRef: 'mainstreet-america/qa/audit-closure-2026-07-26.json',
      },
      protectedPlanningEnvelope: true,
      physicalOuterFence: false,
      sourceHashes,
    },
  }));

  const boundaryReportById = new Map(
    (boundaryReport.boundaries || []).map((entry) => [entry.id, entry]),
  );
  const boundaryReportMatchesCurrentPlan =
    boundaryReport.planSha256 === sourceHashes[planRef];
  for (const boundary of plan.boundaries) {
    const reportEntry = boundaryReportById.get(boundary.id);
    const geometry = polygon(
      boundary.vertices,
      siteBounds.min_y,
      siteBounds.max_y,
    );
    definitions.push(makeFeature({
      externalId: boundary.id,
      parentExternalId: boundary.parent,
      name: boundary.name,
      kind: 'district',
      geometry,
      source: 'manifest',
      sourceRef: planRef,
      tags: [
        'project-grid',
        `${boundary.kind}-envelope`,
        boundary.future_project === false ? 'active-project' : 'inventoried',
      ],
      attributes: {
        hierarchyType: boundary.kind,
        futureProject: boundary.future_project ?? null,
        gateExternalIds: (boundary.gates || []).map((gate) => gate.id),
        boundaryFenceExternalId: `FENCE:${boundary.id}`,
      },
    }));

    definitions.push(makeFeature({
      externalId: `FENCE:${boundary.id}`,
      parentExternalId: boundary.id,
      name: `${boundary.name} white picket boundary`,
      kind: 'fence',
      geometry,
      source: 'rcon',
      sourceRef: boundaryReportRef,
      status: boundaryReportMatchesCurrentPlan ? 'complete' : 'partial',
      completionRatio: boundaryReportMatchesCurrentPlan ? 1 : null,
      conditionScore: boundaryReportMatchesCurrentPlan ? 100 : null,
      tags: ['white-picket', 'project-boundary', 'land-only'],
      attributes: {
        ownerExternalId: boundary.id,
        planVertices: boundary.vertices,
        fieldBlock: plan.appearance?.field_block,
        postBlock: plan.appearance?.post_block,
        postCap: plan.appearance?.post_cap,
        postSpacing: plan.appearance?.post_spacing,
        waterPolicy: plan.appearance?.water_policy,
        generatedColumns: reportEntry?.columns ?? null,
        generatedFenceColumns: reportEntry?.fenceColumns ?? null,
        generatedGateColumns: reportEntry?.gateColumns ?? null,
        generatedCollisionCount: reportEntry?.collisions?.length ?? null,
        generatedMissingColumnCount: reportEntry?.missingColumns?.length ?? null,
        reportPlanSha256: boundaryReport.planSha256 ?? null,
        currentPlanSha256: sourceHashes[planRef],
        reportMatchesCurrentPlan: boundaryReportMatchesCurrentPlan,
      },
    }));

    const reportGatesById = new Map(
      (reportEntry?.gates || []).map((gate) => [gate.id, gate]),
    );
    for (const gate of boundary.gates || []) {
      const reportGate = reportGatesById.get(gate.id);
      const supplementaryGate =
        gate.id === 'GATE-C01-WEST-PUBLIC'
        && fs.existsSync(path.join(root, supplementaryRefs[0]));
      definitions.push(makeFeature({
        externalId: gate.id,
        parentExternalId: boundary.id,
        name: `${boundary.name} — ${gate.id}`,
        kind: 'custom',
        geometry: gateGeometry(gate),
        source: reportGate || supplementaryGate ? 'rcon' : 'manifest',
        sourceRef: reportGate
          ? boundaryReportRef
          : supplementaryGate ? supplementaryRefs[0] : planRef,
        status: reportGate || supplementaryGate ? 'complete' : 'planned',
        completionRatio: reportGate || supplementaryGate ? 1 : 0,
        conditionScore: reportGate || supplementaryGate ? 100 : null,
        tags: ['gate', 'project-boundary-gate', `road-${gate.road.toLowerCase()}`],
        attributes: {
          boundaryExternalId: boundary.id,
          roadExternalId: gate.road,
          axis: gate.axis,
          fixed: gate.fixed,
          minimum: gate.min,
          maximum: gate.max,
          expectedOpenColumns: gate.max - gate.min + 1,
          generatedOpenColumns: reportGate?.actualOpenColumns ?? null,
          supplementaryBuild: supplementaryGate,
        },
      }));
    }
  }

  const roadReportById = new Map(
    (roadReport.roads || []).map((entry) => [entry.id, entry]),
  );
  const roadReportAccepted = roadReport.executionReady === true
    && roadReport.stats?.operations === 0
    && roadReport.acceptance?.allRoadsContinuous === true
    && roadReport.acceptance?.wholeNetworkConnected === true
    && roadReport.acceptance?.allDeclaredGatesConnected === true;
  for (const road of plan.roads) {
    const reportEntry = roadReportById.get(road.id);
    const isR01 = road.id === 'R01';
    const complete = isR01 || (roadReportAccepted && reportEntry?.connectivity?.continuous);
    definitions.push(makeFeature({
      externalId: road.id,
      parentExternalId: 'SITE',
      name: road.name,
      kind: 'road',
      geometry: roadGeometry(road),
      status: complete ? 'complete' : 'partial',
      source: isR01 ? 'region_scan' : 'rcon',
      sourceRef: isR01
        ? 'mainstreet-america/qa/audit-post-parking-2026-07-26.json'
        : roadReportRef,
      completionRatio: complete ? 1 : null,
      conditionScore: complete ? 100 : null,
      tags: ['town-grid', 'public-road', complete ? 'as-built' : 'road-survey-open'],
      attributes: {
        centerline: road.centerline,
        plannedWidth: road.width,
        gradeModel: 'surface-following',
        protectedMainStreet: isR01,
        acceptedSurfaceCells: reportEntry?.acceptedSurfaceCells ?? null,
        maximumCut: reportEntry?.maxCut ?? null,
        maximumFill: reportEntry?.maxFill ?? null,
        targetGrade: reportEntry?.targetGrade ?? null,
        connectivity: reportEntry?.connectivity ?? {
          continuous: true,
          evidence: 'parking-era Main Street public-realm acceptance',
        },
        networkComponents: isR01 ? null : roadReport.stats?.networkComponentCount ?? null,
        allDeclaredGatesConnected: isR01
          ? true
          : roadReport.acceptance?.allDeclaredGatesConnected ?? false,
        requiresContinuousSurfaceAndHeadroomProof: !complete,
      },
    }));
  }

  for (const junction of roadJunctions(plan.roads)) {
    const connected = roadReportAccepted || junction.roads.includes('R01');
    definitions.push(makeFeature({
      externalId: junction.id,
      parentExternalId: 'SITE',
      name: `${junction.name} junction`,
      kind: 'road',
      geometry: point(junction.x, 64, junction.z),
      status: connected ? 'complete' : 'partial',
      source: connected ? 'rcon' : 'manifest',
      sourceRef: connected ? roadReportRef : planRef,
      completionRatio: connected ? 1 : null,
      conditionScore: connected ? 100 : null,
      tags: ['town-grid', 'road-junction', connected ? 'as-built' : 'verification-required'],
      attributes: {
        roadExternalIds: junction.roads,
        centerlineGap: junction.centerlineGap,
        connectionRule: 'road-width-overlap',
      },
    }));
  }

  // The original catalog represented the non-Raven-Rock mountain complex as
  // one coarse C01 box. Promote its actual upper/lower program, circulation,
  // and recovered rooms to first-class children using the live fit-out and
  // walk-verified wayfinding evidence.
  definitions.push(makeFeature({
    externalId: 'C01',
    parentExternalId: 'SITE',
    name: 'Earth-covered east operations complex',
    kind: 'building',
    geometry: bounds(100, 45, 70, 300, 105, 235),
    source: 'rcon',
    sourceRef: mountainWayfindingReportRef,
    tags: ['mountain', 'operations-complex', 'hangar', 'arena', 'connected', 'audited'],
    attributes: {
      publicEntry: { x: 116, y: 65, z: 172 },
      undergroundHangar: { x: 150, y: 63, z: 110 },
      trainingArena: { x: 225, y: 63, z: 110 },
      upperShaftLanding: { x: 200, y: 63, z: 151 },
      lowerOperationsLanding: { x: 200, y: 51, z: 151 },
      allPublishedDestinationsReachable: true,
      walkVerifiedAt: '2026-07-26',
    },
  }));
  const mountainSpaces = [
    ['C01-UPPER-HANGAR', 'Underground aircraft hangar and maintenance hall', 'room', bounds(109, 62, 83, 188, 75, 142), ['hangar', 'maintenance', 'pallet-storage']],
    ['C01-HANGAR-DISPATCH', 'Underground hangar dispatch island', 'room', bounds(118, 62, 87, 146, 66, 92), ['dispatch', 'control']],
    ['C01-HANGAR-MAINTENANCE', 'Underground hangar maintenance islands', 'room', bounds(116, 62, 127, 142, 66, 139), ['maintenance', 'fabrication']],
    ['C01-UPPER-ARENA', 'Emergency training arena', 'room', bounds(202, 62, 83, 248, 75, 132), ['arena', 'training', 'first-aid']],
    ['C01-UPPER-SERVICE-SPINE', 'Upper service spine and destination hub', 'custom', bounds(197, 62, 83, 203, 75, 152), ['route', 'service-spine', 'wayfinding']],
    ['C01-UPPER-GALLERIES', 'Upper east-west galleries', 'custom', bounds(141, 62, 148, 282, 75, 152), ['route', 'gallery']],
    ['C01-UPPER-THEATER', 'Upper briefing theater', 'room', bounds(149, 62, 153, 178, 75, 173), ['theater', 'briefing']],
    ['C01-LOWER-ARCHIVE', 'Lower archive and briefing room', 'room', bounds(141, 50, 103, 153, 60, 132), ['lower-operations', 'archive', 'briefing']],
    ['C01-LOWER-BUNK', 'Lower staff bunk room', 'room', bounds(169, 50, 103, 176, 60, 120), ['lower-operations', 'bunks']],
    ['C01-LOWER-RECORDS', 'Lower records room', 'room', bounds(179, 50, 103, 186, 60, 120), ['lower-operations', 'records']],
    ['C01-LOWER-COMMS', 'Lower communications room', 'room', bounds(189, 50, 103, 196, 60, 120), ['lower-operations', 'communications']],
    ['C01-LOWER-STORES', 'Lower main stores', 'room', bounds(209, 50, 103, 228, 60, 122), ['lower-operations', 'stores']],
    ['C01-LOWER-FABRICATION', 'Lower fabrication room', 'room', bounds(239, 50, 103, 263, 60, 122), ['lower-operations', 'fabrication']],
    ['C01-LOWER-THEATER', 'Lower operations theater', 'room', bounds(140, 50, 173, 158, 60, 190), ['lower-operations', 'theater']],
    ['C01-CONFERENCE-A', 'Lower conference room A', 'room', bounds(169, 50, 173, 180, 60, 190), ['lower-operations', 'conference']],
    ['C01-CONFERENCE-B', 'Lower conference room B', 'room', bounds(189, 50, 173, 200, 60, 190), ['lower-operations', 'conference']],
    ['C01-CONFERENCE-C', 'Lower conference room C', 'room', bounds(209, 50, 173, 220, 60, 190), ['lower-operations', 'conference']],
  ];
  for (const [externalId, name, kind, geometry, tags] of mountainSpaces) {
    definitions.push(makeFeature({
      externalId,
      parentExternalId: 'C01',
      name,
      kind,
      geometry,
      source: 'rcon',
      sourceRef: externalId.startsWith('C01-LOWER-')
        || externalId.startsWith('C01-HANGAR-')
        ? mountainFitoutRef
        : mountainWayfindingReportRef,
      tags: ['mountain', 'inventoried-space', 'walk-verified', ...tags],
      attributes: {
        walkVerifiedAt: '2026-07-26',
        accessWithoutBlockBreaking: true,
      },
    }));
  }
  const lowerRoutePoints = [
    ...(mountainWayfindingReport.routes?.lowerOperations || []),
    [145, 51, 175],
    [174, 51, 175],
    [194, 51, 175],
    [214, 51, 175],
    [260, 51, 126],
    [200, 51, 151],
  ];
  definitions.push(makeFeature({
    externalId: 'ROUTE:C01-LOWER-OPERATIONS',
    parentExternalId: 'C01',
    name: 'Lower operations circulation loop',
    kind: 'custom',
    geometry: pathGeometry(lowerRoutePoints, 3),
    source: 'rcon',
    sourceRef: mountainWayfindingReportRef,
    tags: ['mountain', 'route', 'lower-operations', 'walk-verified', 'bidirectional'],
    attributes: {
      connectsExternalIds: [
        'C01-LOWER-ARCHIVE',
        'C01-LOWER-BUNK',
        'C01-LOWER-RECORDS',
        'C01-LOWER-COMMS',
        'C01-LOWER-STORES',
        'C01-LOWER-FABRICATION',
        'C01-LOWER-THEATER',
        'C01-CONFERENCE-A',
        'C01-CONFERENCE-B',
        'C01-CONFERENCE-C',
      ],
      bidirectionalReachabilityVerified: true,
    },
  }));

  const gridProjects = gridReport.projects || {};
  const gridFloorplans = gridReport.floorplans || {};
  const gridAssets = [
    {
      externalId: 'GRID-W2-BUILDING',
      parentExternalId: 'GRID-W2',
      name: 'Design Lab and Maker Commons building',
      geometry: bounds(-132, 63, -52, -96, 81, 4),
      rooms: [
        ['GRID-W2-MAKER-HALL', 'Maker hall and fabrication bay', bounds(-130, 68, -49, -115, 73, 2)],
        ['GRID-W2-MATERIAL-LIBRARY', 'Material library', bounds(-113, 68, -51, -97, 73, -28)],
        ['GRID-W2-DESIGN-LOFT', 'Collaborative design loft', bounds(-130, 74, -50, -98, 80, -27)],
        ['GRID-W2-MAKER-YARD', 'Covered maker yard', bounds(-130, 67, -16, -118, 74, 1)],
      ],
    },
    {
      externalId: 'GRID-E2-BUILDING',
      parentExternalId: 'GRID-E2',
      name: 'Neighborhood Clubhouse',
      geometry: bounds(105, 70, -33, 135, 90, 16),
      rooms: [
        ['GRID-E2-GREAT-ROOM', 'Neighborhood great room', bounds(107, 81, -3, 133, 89, 9)],
        ['GRID-E2-KITCHEN', 'Clubhouse kitchen', bounds(107, 81, -31, 120, 89, -5)],
        ['GRID-E2-READING-ROOM', 'Clubhouse reading room', bounds(107, 81, -3, 120, 89, 9)],
        ['GRID-E2-WALLED-GARDEN', 'Terraced walled garden rooms', bounds(88, 80, -45, 106, 85, 2)],
      ],
    },
  ];
  for (const asset of gridAssets) {
    const parentReport = gridProjects[asset.parentExternalId];
    definitions.push(makeFeature({
      externalId: asset.externalId,
      parentExternalId: asset.parentExternalId,
      name: asset.name,
      kind: 'building',
      geometry: asset.geometry,
      source: 'rcon',
      sourceRef: gridReportRef,
      tags: ['town-grid-project', 'built', 'floorplan-authored'],
      attributes: {
        operations: parentReport?.operations ?? null,
        roles: parentReport?.byRole ?? {},
        floorplan: gridFloorplans[asset.parentExternalId] ?? null,
      },
    }));
    for (const [externalId, name, geometry] of asset.rooms) {
      definitions.push(makeFeature({
        externalId,
        parentExternalId: asset.externalId,
        name,
        kind: externalId.endsWith('YARD') || externalId.endsWith('GARDEN')
          ? 'landscape'
          : 'room',
        geometry,
        source: 'rcon',
        sourceRef: gridReportRef,
        tags: ['town-grid-project', 'authored-space'],
      }));
    }
  }

  const envelopes = surfaceReport.envelopes;
  const areaEvidence = (externalId) => ({
    generatedOperations: surfaceReport.areas?.[externalId]?.operations ?? null,
    generatedRoles: surfaceReport.areas?.[externalId]?.byRole ?? {},
    reportSha256: sourceHashes[surfaceReportRef],
    operationsSha256: sourceHashes[surfaceOpsRef],
    supplementaryHashes: Object.fromEntries(
      supplementaryRefs
        .filter((relativePath) => sourceHashes[relativePath])
        .map((relativePath) => [relativePath, sourceHashes[relativePath]]),
    ),
  });
  const built = ({
    externalId,
    parentExternalId,
    name,
    kind,
    geometry,
    tags = [],
    attributes = {},
  }) => makeFeature({
    externalId,
    parentExternalId,
    name,
    kind,
    geometry,
    source: 'rcon',
    sourceRef: surfaceReportRef,
    tags: ['surface-aviation', 'built', ...tags],
    attributes: { ...areaEvidence(externalId), ...attributes },
  });

  definitions.push(built({
    externalId: 'HGR-S01',
    parentExternalId: 'DIV-C01-SURFACE',
    name: 'Mountain-integrated surface hangar',
    kind: 'building',
    geometry: boundsFromArray(envelopes.hangar),
    tags: ['hangar', 'high-bay', 'two-storey'],
    attributes: surfaceReport.floorplans.hangar,
  }));
  definitions.push(built({
    externalId: 'HGR-S01-BAY',
    parentExternalId: 'HGR-S01',
    name: 'Surface hangar main high bay',
    kind: 'room',
    geometry: boundsFromArray(envelopes.bay),
    tags: ['hangar-bay', 'maintenance'],
  }));
  definitions.push(built({
    externalId: 'OFF-S01',
    parentExternalId: 'HGR-S01',
    name: 'Surface hangar dispatch office and overlook',
    kind: 'room',
    geometry: boundsFromArray(envelopes.secondFloorOffice),
    tags: ['office', 'shaft-arrival', 'hangar-overlook'],
    attributes: {
      shaftArrival: surfaceReport.floorplans.hangar.shaftArrival,
      bayExit: surfaceReport.floorplans.hangar.bayExit,
    },
  }));
  definitions.push(built({
    externalId: 'U01',
    parentExternalId: 'DIV-C01-SURFACE',
    name: 'East-complex continuous service shaft',
    kind: 'utility',
    geometry: bounds(200, 24, 153, 200, 105, 153),
    tags: ['critical-route', 'scaffolding', 'vertical-access'],
    attributes: {
      ...surfaceReport.preserved.serviceShaft,
      exactExpectedScaffoldingBlocks: 82,
      formerDiscontinuity: [200, 50, 153],
    },
  }));

  definitions.push(built({
    externalId: 'APT-S01',
    parentExternalId: 'HGR-S01',
    name: 'Concealed one-bedroom penthouse',
    kind: 'room',
    geometry: boundsFromArray(envelopes.privateResidence),
    tags: ['private', 'penthouse', 'one-bedroom', 'concealed-entry'],
    attributes: surfaceReport.floorplans.privateResidence,
  }));
  definitions.push(built({
    externalId: 'APT-S01-BEDROOM',
    parentExternalId: 'APT-S01',
    name: 'Penthouse bedroom',
    kind: 'room',
    geometry: bounds(179, 105, 150, 190, 114, 162),
    tags: ['private', 'bedroom'],
  }));
  definitions.push(built({
    externalId: 'LIB-S01',
    parentExternalId: 'APT-S01',
    name: 'Private command library',
    kind: 'room',
    geometry: boundsFromArray(envelopes.privateLibrary),
    tags: ['private', 'library'],
  }));
  definitions.push(built({
    externalId: 'CMD-S01',
    parentExternalId: 'APT-S01',
    name: 'Twelve-monitor command center',
    kind: 'room',
    geometry: boundsFromArray(envelopes.commandCenter),
    tags: ['private', 'command-center', 'twelve-monitors'],
    attributes: {
      monitorCount: surfaceReport.floorplans.privateResidence.commandCenterMonitorCount,
      operatorPositions: 3,
    },
  }));
  definitions.push(built({
    externalId: 'BATH-S01',
    parentExternalId: 'APT-S01',
    name: 'Marble-and-glass spa bath',
    kind: 'room',
    geometry: boundsFromArray(envelopes.marbleGlassSpa),
    tags: ['private', 'spa-bath', 'marble-and-glass'],
    attributes: {
      showerHeads: surfaceReport.floorplans.privateResidence.showerHeads,
      oversizedSoakingTub: true,
    },
  }));
  definitions.push(built({
    externalId: 'BATH-S01-SHOWER',
    parentExternalId: 'BATH-S01',
    name: 'Four-head glass shower',
    kind: 'room',
    geometry: bounds(179, 105, 165, 189, 112, 175),
    tags: ['glass-shower', 'four-head'],
    attributes: surfaceReport.floorplans.privateResidence.showerHeads,
  }));
  definitions.push(built({
    externalId: 'BATH-S01-SOAKING-TUB',
    parentExternalId: 'BATH-S01',
    name: 'Oversized glass-and-marble soaking tub',
    kind: 'custom',
    geometry: bounds(190, 105, 164, 200, 112, 177),
    tags: ['soaking-tub', 'glass-enclosure'],
  }));
  definitions.push(built({
    externalId: 'CLOSET-S01',
    parentExternalId: 'APT-S01',
    name: 'Walk-in closet and wardrobe',
    kind: 'room',
    geometry: bounds(201, 105, 164, 207, 114, 179),
    tags: ['private', 'walk-in-closet', 'wardrobe'],
  }));
  definitions.push(built({
    externalId: 'SAFE-S01',
    parentExternalId: 'APT-S01',
    name: 'Apartment safe room',
    kind: 'room',
    geometry: boundsFromArray(envelopes.apartmentSafeRoom),
    tags: ['private', 'safe-room', 'hardened'],
  }));

  definitions.push(built({
    externalId: 'SHL-S01',
    parentExternalId: 'DIV-C01-SURFACE',
    name: 'Private mountain shelter',
    kind: 'building',
    geometry: boundsFromArray(envelopes.mountainShelter),
    tags: ['underground', 'shelter', 'hardened'],
    attributes: surfaceReport.floorplans.privateShelter,
  }));
  const shelterRooms = [
    ['FAL-S01', 'Fallout shelter', bounds(149, 81, 144, 165, 91, 163), ['fallout', 'bunks', 'medical', 'galley']],
    ['SAFE-U01', 'Hardened lower safe room', bounds(167, 81, 144, 187, 91, 163), ['safe-room', 'long-term-supplies']],
    ['COM-S01', 'Shelter communications room', bounds(167, 81, 164, 187, 91, 179), ['communications', 'radio', 'operator-desks']],
    ['VLT-S01', 'Shelter treasury and armory', bounds(149, 81, 164, 168, 91, 179), ['treasury', 'armory', 'actual-inventories']],
  ];
  for (const [externalId, name, geometry, tags] of shelterRooms) {
    definitions.push(built({
      externalId,
      parentExternalId: 'SHL-S01',
      name,
      kind: 'room',
      geometry,
      tags: ['underground', ...tags],
      attributes: externalId === 'VLT-S01'
        ? {
            actualInventories: true,
            valuables: surfaceReport.floorplans.privateShelter.valuables,
          }
        : {},
    }));
  }

  definitions.push(built({
    externalId: 'VLT-G01',
    parentExternalId: 'SHL-S01',
    name: 'Three-level grand treasury vault',
    kind: 'building',
    geometry: boundsFromArray(envelopes.grandVault),
    tags: ['underground', 'grand-vault', 'three-level', 'actual-inventories'],
    attributes: {
      levels: surfaceReport.floorplans.privateShelter.grandVaultLevels,
      valuables: surfaceReport.floorplans.privateShelter.valuables,
      actualInventories: surfaceReport.floorplans.privateShelter.actualInventories,
      staircase: surfaceReport.floorplans.privateShelter.staircase,
    },
  }));
  for (const level of surfaceReport.floorplans.privateShelter.grandVaultLevels) {
    const levelId = level.name.split(' ')[0].toUpperCase();
    definitions.push(built({
      externalId: `VLT-G01-${levelId}`,
      parentExternalId: 'VLT-G01',
      name: `Grand vault ${level.name}`,
      kind: 'room',
      geometry: bounds(230, level.floorY, 184, 262, level.floorY + 10, 226),
      tags: ['grand-vault-level', levelId.toLowerCase(), 'treasury-gallery'],
      attributes: { floorY: level.floorY },
    }));
  }

  definitions.push(built({
    externalId: 'OBS-S01',
    parentExternalId: 'HGR-S01',
    name: 'Griffith-inspired roof observatory',
    kind: 'building',
    geometry: boundsFromArray(envelopes.observatory),
    tags: ['observatory', 'art-deco', 'three-domes', 'roof-terrace'],
    attributes: {
      ...surfaceReport.floorplans.observatory,
      designReference: surfaceReport.designReference,
    },
  }));
  const observatoryRooms = [
    ['OBS-S01-PLANETARIUM', 'Central planetarium gallery', bounds(197, 121, 137, 215, 126, 165)],
    ['OBS-S01-TELESCOPE-WEST', 'West telescope room', bounds(185, 121, 137, 195, 126, 165)],
    ['OBS-S01-TELESCOPE-EAST', 'East telescope room', bounds(217, 121, 137, 227, 126, 165)],
    ['OBS-S01-ROOF-TERRACE', 'Observatory roof terrace', bounds(175, 119, 137, 235, 121, 182)],
  ];
  for (const [externalId, name, geometry] of observatoryRooms) {
    definitions.push(built({
      externalId,
      parentExternalId: 'OBS-S01',
      name,
      kind: externalId.endsWith('TERRACE') ? 'landscape' : 'room',
      geometry,
      tags: ['observatory-space'],
    }));
  }

  definitions.push(built({
    externalId: 'HELI-S01',
    parentExternalId: 'DIV-C01-SURFACE',
    name: 'Existing mountain heliport',
    kind: 'landmark',
    geometry: boundsFromArray(envelopes.heliport),
    tags: ['heliport', 'surface-aviation', 'preserved'],
    attributes: {
      ...surfaceReport.preserved.heliport,
      geometricCenterXZ: [247.5, 181.5],
      safeCenterMarker: surfaceReport.preserved.heliport.centerMarker,
    },
  }));
  definitions.push(built({
    externalId: 'TRL-S01',
    parentExternalId: 'DIV-C01-SURFACE',
    name: 'Hangar-to-heliport illuminated trail',
    kind: 'sidewalk',
    geometry: pathGeometry(surfaceReport.route.trailProfile, 3),
    tags: ['heliport-trail', 'lit', 'guarded'],
    attributes: {
      start: surfaceReport.route.trailProfile[0],
      end: surfaceReport.route.trailProfile.at(-1),
      tieIn: surfaceReport.preserved.heliport.sameMaterialTieIn,
    },
  }));

  const routes = [
    {
      externalId: 'ROUTE:OFFICE-HELIPORT',
      parentExternalId: 'DIV-C01-SURFACE',
      name: surfaceReport.route.name,
      points: surfaceReport.route.waypoints,
      attributes: {
        fromExternalId: 'OFF-S01',
        viaExternalIds: ['HGR-S01-BAY', 'TRL-S01'],
        toExternalId: 'HELI-S01',
        public: true,
      },
    },
    {
      externalId: 'ROUTE:APT-SHELTER',
      parentExternalId: 'DIV-C01-SURFACE',
      name: 'Penthouse safe room to private shelter',
      points: surfaceReport.secureRoutes.apartmentToShelter,
      attributes: {
        fromExternalId: 'SAFE-S01',
        toExternalId: 'SHL-S01',
        public: false,
        secure: true,
      },
    },
    {
      externalId: 'ROUTE:SHELTER-GRAND-VAULT',
      parentExternalId: 'SHL-S01',
      name: 'Private shelter to grand vault',
      points: surfaceReport.secureRoutes.shelterToGrandVault,
      attributes: {
        fromExternalId: 'SHL-S01',
        toExternalId: 'VLT-G01-UPPER',
        public: false,
        secure: true,
      },
    },
    {
      externalId: 'ROUTE:GRAND-VAULT-STAIRS',
      parentExternalId: 'VLT-G01',
      name: 'Grand vault three-level ceremonial stair',
      points: [
        ...surfaceReport.secureRoutes.grandVaultStairs
          .filter(([x]) => x === 238),
        [246, 55, 207],
        ...surfaceReport.secureRoutes.grandVaultStairs
          .filter(([x]) => x === 246),
      ],
      attributes: {
        connectsExternalIds: ['VLT-G01-UPPER', 'VLT-G01-MIDDLE', 'VLT-G01-LOWER'],
        public: false,
        secure: true,
        alternateUpperFlight:
          surfaceReport.secureRoutes.grandVaultStairs.filter(([x]) => x === 254),
      },
    },
  ];
  for (const route of routes) {
    definitions.push(built({
      externalId: route.externalId,
      parentExternalId: route.parentExternalId,
      name: route.name,
      kind: 'custom',
      geometry: pathGeometry(route.points, 1),
      tags: ['route', route.attributes.secure ? 'secure-route' : 'wayfinding-route'],
      attributes: {
        ...route.attributes,
        waypointCount: route.points.length,
      },
    }));
  }

  return definitions;
}

function validateDefinitions(definitions) {
  const ids = new Set();
  for (const definition of definitions) {
    if (!definition.externalId) throw new Error('every feature requires externalId');
    if (ids.has(definition.externalId)) {
      throw new Error(`duplicate feature externalId: ${definition.externalId}`);
    }
    ids.add(definition.externalId);
  }
  for (const definition of definitions) {
    if (definition.parentExternalId && !ids.has(definition.parentExternalId)) {
      throw new Error(
        `${definition.externalId} references missing parent ${definition.parentExternalId}`,
      );
    }
  }
}

function applyDefinitions(store, definitions) {
  const existing = store.listFeatures({ projectId, limit: 1_000 });
  const byExternalId = new Map(
    existing
      .filter((feature) => feature.externalId)
      .map((feature) => [feature.externalId, feature]),
  );
  const observationCountsBefore = new Map(
    existing
      .filter((feature) => feature.externalId)
      .map((feature) => [
        feature.externalId,
        store.getFeatureObservations(feature.id, 1_000).length,
      ]),
  );
  const imported = [];
  for (const definition of definitions) {
    const parent = definition.parentExternalId
      ? byExternalId.get(definition.parentExternalId)
      : null;
    if (definition.parentExternalId && !parent) {
      throw new Error(
        `${definition.externalId} parent ${definition.parentExternalId} was not imported`,
      );
    }
    const { parentExternalId, ...input } = definition;
    const importedFeature = store.upsertFeature({
      ...input,
      parentId: parent?.id ?? null,
    });
    imported.push(importedFeature);
    byExternalId.set(importedFeature.externalId, importedFeature);
  }

  const existingOuterFence = byExternalId.get('F01');
  let retiredOuterFence;
  if (existingOuterFence) {
    retiredOuterFence = store.upsertFeature({
      projectId,
      externalId: 'F01',
      parentId: existingOuterFence.parentId,
      world: existingOuterFence.world,
      name: existingOuterFence.name,
      kind: existingOuterFence.kind,
      status: 'removed',
      geometry: existingOuterFence.geometry,
      source: 'import',
      sourceRef: importerRef,
      confidence: existingOuterFence.confidence,
      completionRatio: 0,
      conditionScore: existingOuterFence.conditionScore,
      tags: Array.from(new Set([
        ...existingOuterFence.tags,
        'retired',
        'superseded-by-project-boundaries',
      ])),
      attributes: {
        ...existingOuterFence.attributes,
        retiredAtImport: true,
        retiredReason:
          'obsolete outer campus fence; physical ownership moved to division/block/project boundaries',
        successorExternalIds: definitions
          .filter((feature) => feature.externalId.startsWith('FENCE:'))
          .map((feature) => feature.externalId),
      },
      observedAt: existingOuterFence.observedAt,
    });
  } else {
    const siteFeature = byExternalId.get('SITE');
    retiredOuterFence = store.upsertFeature({
      projectId,
      externalId: 'F01',
      parentId: siteFeature.id,
      world,
      name: 'Retired outer MainStreet campus fence',
      kind: 'fence',
      status: 'removed',
      geometry: polygon(
        [[-305, -305], [305, -305], [305, 305], [-305, 305]],
        62,
        319,
      ),
      source: 'import',
      sourceRef: importerRef,
      confidence: 1,
      completionRatio: 0,
      conditionScore: null,
      tags: ['retired', 'superseded-by-project-boundaries'],
      attributes: {
        retiredAtImport: true,
        retiredReason:
          'obsolete outer campus fence; physical ownership moved to division/block/project boundaries',
        successorExternalIds: definitions
          .filter((feature) => feature.externalId.startsWith('FENCE:'))
          .map((feature) => feature.externalId),
      },
    });
  }
  imported.push(retiredOuterFence);

  const hierarchyLinks = {
    B01: 'DIV-A01',
    P01: 'DIV-A01',
    L02: 'DIV-A01',
    H01: 'BLK-WS',
    H07: 'BLK-ES',
    H02: 'BLK-WM',
    H03: 'BLK-WM',
    H08: 'BLK-EM',
    H09: 'BLK-EM',
    H04: 'BLK-WN',
    H05: 'BLK-WN',
    H06: 'BLK-WN',
    H10: 'BLK-EN',
    H11: 'BLK-EN',
    H12: 'BLK-EN',
    B02: 'PRJ-B02',
    B03: 'PRJ-B03',
    L01: 'PRJ-L01',
    C01: 'SITE',
  };
  const acceptedExisting = new Map([
    ...[
      'H01', 'H02', 'H03', 'H04', 'H05', 'H06',
      'H07', 'H08', 'H09', 'H10', 'H11', 'H12',
    ].map((externalId) => [externalId, {
      sourceRef: homesBuildRef,
      evidence: 'authored floorplan/facade phase and post-build structural acceptance',
    }]),
    ['L01', {
      sourceRef: landscapeBuildRef,
      evidence: 'pond landscape, both gates, overlook, and reverse walkability accepted',
    }],
    ['L02', {
      sourceRef: landscapeBuildRef,
      evidence: 'three monument terraces and reverse walkability accepted',
    }],
  ]);
  const linkedExisting = [];
  const reparentedExternalIds = [];
  for (const [externalId, parentExternalId] of Object.entries(hierarchyLinks)) {
    const feature = byExternalId.get(externalId);
    const parent = byExternalId.get(parentExternalId);
    if (!feature || !parent) continue;
    const alreadyLinked = feature.parentId === parent.id;
    let linked = alreadyLinked
      ? feature
      : store.updateFeature(feature.id, { parentId: parent.id });
    if (!linked) throw new Error(`failed to link ${externalId} to ${parentExternalId}`);
    const acceptance = acceptedExisting.get(externalId);
    if (acceptance) {
      linked = store.updateFeature(linked.id, {
        status: 'complete',
        source: 'rcon',
        sourceRef: acceptance.sourceRef,
        confidence: 1,
        completionRatio: 1,
        conditionScore: Math.max(linked.conditionScore ?? 0, 95),
        tags: Array.from(new Set([...linked.tags, 'as-built', 'walk-verified'])),
        attributes: {
          ...linked.attributes,
          finalAcceptance: acceptance.evidence,
          walkVerifiedAt: '2026-07-26',
        },
        observedAt: Date.now(),
      });
      if (!linked) throw new Error(`failed to promote accepted feature ${externalId}`);
    }
    linkedExisting.push(linked);
    if (!alreadyLinked) reparentedExternalIds.push(externalId);
    byExternalId.set(externalId, linked);
  }

  const acceptedHomeIds = new Set(
    [
      'H01', 'H02', 'H03', 'H04', 'H05', 'H06',
      'H07', 'H08', 'H09', 'H10', 'H11', 'H12',
    ]
      .map((externalId) => byExternalId.get(externalId)?.id)
      .filter(Boolean),
  );
  const promotedHomeRooms = [];
  for (const feature of existing) {
    if (feature.kind !== 'room' || !acceptedHomeIds.has(feature.parentId)) continue;
    const promoted = store.updateFeature(feature.id, {
      status: 'complete',
      source: 'rcon',
      sourceRef: homesBuildRef,
      confidence: 1,
      completionRatio: 1,
      conditionScore: Math.max(feature.conditionScore ?? 0, 95),
      tags: Array.from(new Set([
        ...feature.tags,
        'as-built',
        'floorplan-audited',
      ])),
      attributes: {
        ...feature.attributes,
        finalAcceptance:
          'parent home and per-model partition/vertical-circulation assertions pass the final snapshot audit',
        materialAuditRef:
          'mainstreet-america/qa/audit-closure-2026-07-26.json',
      },
      observedAt: Date.now(),
    });
    if (!promoted) throw new Error(`failed to promote home room ${feature.externalId}`);
    promotedHomeRooms.push(promoted);
    byExternalId.set(promoted.externalId, promoted);
  }

  for (const feature of [...imported, ...linkedExisting, ...promotedHomeRooms]) {
    const before = observationCountsBefore.get(feature.externalId) ?? 0;
    const after = store.getFeatureObservations(feature.id, 1_000).length;
    if (after < before) {
      throw new Error(`observations were lost while upserting ${feature.externalId}`);
    }
  }
  return {
    imported,
    linkedExisting,
    promotedHomeRooms,
    reparentedExternalIds,
  };
}

function attachCompletedScan(store, imported, snapshotRef, sourceHashes) {
  const existingScan = store.listScans({ projectId, status: 'complete', limit: 1_000 })
    .find((scan) => (
      scan.snapshotRef === snapshotRef
      && scan.summary?.importer === importerRef
      && JSON.stringify(scan.summary?.sourceHashes ?? {}) === JSON.stringify(sourceHashes)
    ));
  if (existingScan) return { scan: existingScan, reused: true };

  const scan = store.createScan({
    projectId,
    world,
    method: 'manifest_import',
    bounds: bounds(-300, 24, -300, 300, 319, 300),
    observer: 'mainstreet-project-grid-importer',
    snapshotRef,
    summary: {
      importer: importerRef,
      featureCount: imported.length,
      sourceHashes,
      note:
        'Completed means the catalog import ran successfully; individual feature status records preserve open as-built work.',
    },
  });
  const observedAt = Date.now();
  for (const feature of imported) {
    store.recordObservation({
      scanId: scan.id,
      featureId: feature.id,
      status: feature.status,
      completionRatio: feature.completionRatio,
      conditionScore: feature.conditionScore,
      details: {
        importer: importerRef,
        sourceRef: feature.sourceRef,
        externalId: feature.externalId,
        hierarchyImport: true,
      },
      observedAt,
    });
  }
  const completed = store.completeScan(scan.id, {
    summary: {
      ...scan.summary,
      observationCount: imported.length,
      completed: true,
    },
  });
  return { scan: completed, reused: false };
}

const args = parseArgs(process.argv.slice(2));
const plan = yaml.load(fs.readFileSync(path.join(root, planRef), 'utf8'));
const boundaryReport = readJson(boundaryReportRef);
const gridReport = readJson(gridReportRef);
const roadReport = readJson(roadReportRef);
const mountainWayfindingReport = readJson(mountainWayfindingReportRef);
const surfaceReport = readJson(surfaceReportRef);
const sourceRefs = [
  planRef,
  boundaryReportRef,
  gridReportRef,
  roadReportRef,
  mountainWayfindingReportRef,
  mountainFitoutRef,
  homesBuildRef,
  landscapeBuildRef,
  surfaceReportRef,
  surfaceOpsRef,
  ...supplementaryRefs.filter((relativePath) => fs.existsSync(path.join(root, relativePath))),
];
const sourceHashes = Object.fromEntries(
  sourceRefs.map((relativePath) => [relativePath, sha256File(relativePath)]),
);
const definitions = buildDefinitions(
  plan,
  boundaryReport,
  gridReport,
  roadReport,
  mountainWayfindingReport,
  surfaceReport,
  sourceHashes,
);
validateDefinitions(definitions);

const snapshotHash = hashSnapshotDirectory('data/worldsnap/region');
const snapshotRef = `data/worldsnap/region:sha256=${snapshotHash}`;
let temporaryDirectory = null;
let store;
try {
  const dbPath = args.dryRun
    ? path.join(
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'msa-grid-import-')),
        'world-map.db',
      )
    : args.dbPath ?? path.join(root, 'data', 'world-map.db');
  const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');
  store = new WorldFeatureStore(dbPath);
  const {
    imported,
    linkedExisting,
    promotedHomeRooms,
    reparentedExternalIds,
  } = applyDefinitions(store, definitions);
  const scanFeatures = [
    ...imported,
    ...linkedExisting.filter(
      (feature) => !imported.some((importedFeature) => importedFeature.id === feature.id),
    ),
    ...promotedHomeRooms,
  ];
  const scanResult = args.scan
    ? attachCompletedScan(store, scanFeatures, snapshotRef, sourceHashes)
    : null;

  const countsByKind = {};
  for (const feature of imported) {
    countsByKind[feature.kind] = (countsByKind[feature.kind] ?? 0) + 1;
  }
  console.log(JSON.stringify({
    mode: args.dryRun ? 'dry-run' : 'apply',
    projectId,
    dbPath: args.dryRun ? '(disposable)' : store.dbPath,
    importedFeatures: imported.length,
    promotedHomeRooms: promotedHomeRooms.length,
    reparentedExistingFeatures: reparentedExternalIds,
    countsByKind,
    retiredExternalId: 'F01',
    planSha256: sourceHashes[planRef],
    boundaryReportPlanSha256: boundaryReport.planSha256 ?? null,
    boundaryReportMatchesCurrentPlan:
      boundaryReport.planSha256 === sourceHashes[planRef],
    snapshotRef,
    scan: scanResult
      ? {
          id: scanResult.scan.id,
          status: scanResult.scan.status,
          reused: scanResult.reused,
          observations: store.getScanObservations(scanResult.scan.id).length,
        }
      : null,
  }, null, 2));
} finally {
  if (store) store.close();
  if (temporaryDirectory) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
