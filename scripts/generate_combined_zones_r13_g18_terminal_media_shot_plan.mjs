#!/usr/bin/env node
/** Deterministic read-only G18 terminal media shot-plan generator. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:20:00Z');
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r13-g18-terminal-media-shot-plan-current/terminal-media-shot-plan.json',
);
const CAPTURE_ROOT = value(
  '--capture-root',
  'data/exports/combined-zones-r13-terminal-media',
);
const TERMINAL_ACCEPTANCE = value(
  '--terminal-post-acceptance',
  'data/world-review/combined-zones-r13-mvp-publication/terminal-post-acceptance.json',
);
const WORLD_CATALOG = value(
  '--world-catalog',
  'data/exports/world-catalog-wave2-post-2026-07-28/features.json',
);
const SOURCES = Object.freeze({
  r07Manifest: 'data/buildops/combined-zones-r07k-b03-twin-portal-exterior.release-manifest.json',
  r07Acceptance: 'data/world-review/combined-zones-r07k-live-20260821T195128Z/r07k-post-release-qa.json',
  r08NorthRetail: 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  r08SouthRetail: 'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  r08N07Retail: 'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
  r08EgB: 'data/buildops/combined-zones-r08ai-empty-eight-eg-b-passive-wayfinding.release-manifest.json',
  r08Acceptance: 'data/world-review/combined-zones-r08ak-empty-eight-static-readiness-gap-screen-20260822T025000Z/r08ak-empty-eight-static-readiness-gap-screen.json',
  r09Manifest: 'data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json',
  r09Acceptance: 'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09k-b07-bounded-upper-route-commissioning-seal.json',
  r10B03Manifest: 'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
  r10Acceptance: 'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
  r11Acceptance: 'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
  r12PassiveManifest: 'data/buildops/combined-zones-r12q-b09-lower-two-turn-rail-closure.release-manifest.json',
  r12PassiveAcceptance: 'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
  r12ActiveManifest: 'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle.release-manifest.json',
  r12Commissioning: 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json',
});
const EXPECTED_NODES = Object.freeze({
  r07: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  r08: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  r09: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  r10: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
  r11: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
  r12: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;
const payloadSha256 = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R13 G18 terminal media shot plan rejected: ${message}`);
};
const midpoint = (minimum, maximum) => (minimum + maximum) / 2;
const point = (x, y, z) => ({ x, y, z });
const rasterBinding = (filename) => {
  if (!fs.existsSync(absolute(filename))) return {
    filename: path.basename(filename),
    path: relative(filename),
    exists: false,
    sha256: null,
    bytes: null,
    status: 'WAITING_CAPTURE_NOT_PRESENT',
  };
  return {
    filename: path.basename(filename),
    ...binding(filename),
    exists: true,
    status: 'PRESENT_UNVERIFIED_BY_MATCHED_MEDIA_ACCEPTANCE',
  };
};
const machinePass = (record) => typeof record?.status === 'string'
  && record.status.startsWith('PASS')
  && record.summary?.passed !== false;

const records = Object.fromEntries(Object.entries(SOURCES).map(
  ([id, filename]) => [id, readJson(filename)],
));
const sourceBindings = Object.fromEntries(Object.entries(SOURCES).map(
  ([id, filename]) => [id, binding(filename)],
));
const worldCatalog = readJson(WORLD_CATALOG);
const worldCatalogBinding = binding(WORLD_CATALOG);
invariant(Array.isArray(worldCatalog.features) && worldCatalog.count === worldCatalog.features.length,
  'world catalog feature collection is incomplete');
invariant(records.r07Manifest.releaseNodeId === EXPECTED_NODES.r07
  && machinePass(records.r07Acceptance), 'R07 coordinate or acceptance evidence drifted');
invariant(records.r08NorthRetail.releaseNodeId === EXPECTED_NODES.r08
  && records.r08SouthRetail.releaseNodeId === EXPECTED_NODES.r08
  && records.r08N07Retail.releaseNodeId === EXPECTED_NODES.r08
  && records.r08EgB.releaseNodeId === EXPECTED_NODES.r08
  && machinePass(records.r08Acceptance), 'R08 coordinate or acceptance evidence drifted');
invariant(records.r09Manifest.releaseNodeId === EXPECTED_NODES.r09
  && machinePass(records.r09Acceptance), 'R09 coordinate or acceptance evidence drifted');
invariant(records.r10B03Manifest.releaseNodeId === EXPECTED_NODES.r10
  && machinePass(records.r10Acceptance), 'R10 coordinate or acceptance evidence drifted');
invariant(records.r11Acceptance.releaseNodeId === EXPECTED_NODES.r11
  && machinePass(records.r11Acceptance), 'R11 closure evidence drifted');
invariant(records.r12PassiveManifest.releaseNodeId === EXPECTED_NODES.r12
  && machinePass(records.r12PassiveAcceptance), 'R12Q passive coordinate evidence drifted');
invariant(records.r12ActiveManifest.releaseNodeId === EXPECTED_NODES.r12
  && records.r12ActiveManifest.scope.geometry.centerlineIndices.first === 9
  && records.r12ActiveManifest.scope.geometry.centerlineIndices.last === 25
  && machinePass(records.r12Commissioning)
  && records.r12Commissioning.activeShuttleCommissioned === true,
  'R12R bounded active-shuttle evidence drifted');

const terminalAcceptance = fs.existsSync(absolute(TERMINAL_ACCEPTANCE))
  ? readJson(TERMINAL_ACCEPTANCE) : null;
const terminalAcceptanceBinding = fs.existsSync(absolute(TERMINAL_ACCEPTANCE))
  ? { ...binding(TERMINAL_ACCEPTANCE), exists: true }
  : { path: relative(TERMINAL_ACCEPTANCE), sha256: null, bytes: null, exists: false };
const terminalAccepted = terminalAcceptance?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  && /^[a-f0-9]{64}$/.test(terminalAcceptance.terminalCompleteSaveSha256 ?? '');
const terminalPostBinding = {
  status: terminalAccepted ? 'BOUND_ACCEPTED_TERMINAL_POST' : 'WAITING_ACCEPTED_TERMINAL_POST',
  acceptance: terminalAcceptanceBinding,
  terminalCompleteSaveSha256: terminalAccepted
    ? terminalAcceptance.terminalCompleteSaveSha256 : null,
  terminalPostRoot: terminalAccepted ? terminalAcceptance.terminalPostRoot ?? null : null,
};

const r07Endpoints = records.r07Manifest.scope.geometry.portalEndpoints;
const r08North = records.r08NorthRetail.target.fullDesignUnion.bounds;
const r08South = records.r08SouthRetail.target.fullDesignUnion.bounds;
const r08N07 = records.r08N07Retail.scope.shells[0].connectedInteriorVoid.bounds;
const r08Refuge = records.r08EgB.scope.geometry.refugeNode;
const r09Route = records.r09Manifest.scope.geometry.retainedUpperRouteWithHeadhouseHold.bounds;
const r10Route = records.r10B03Manifest.scope.geometry.preservedRouteVoid.bounds;
const r11Components = records.r11Acceptance.acceptedBoundedPhysicalState.components;
const r11Primary = r11Components.find(({ component }) => component === 1);
const r11West = r11Components.find(({ component }) => component === 2);
const r12Guideway = records.r12PassiveManifest.scope.geometry.resultingContinuous9Through560Rail.bounds;
const r12ActiveGeometry = records.r12ActiveManifest.scope.geometry;
const r12ActiveTrack = r12ActiveGeometry.poweredTrack.bounds;

invariant(r07Endpoints.length === 2 && r07Endpoints[0].index === 188
  && r07Endpoints[1].index === 612, 'R07 portal endpoints drifted');
invariant(records.r08NorthRetail.scope.shellCount === 9
  && records.r08SouthRetail.scope.shellCount === 11
  && records.r08N07Retail.scope.shellCount === 1, 'R08 retail shell census drifted');
invariant(records.r09Acceptance.commissionedScope.surfaceCellCount === 91,
  'R09 accepted bounded route census drifted');
invariant(r09Route.minX === 2105 && r09Route.maxX === 2111
  && r09Route.maxY === 72 && r09Route.minZ === -401 && r09Route.maxZ === -395,
  'R09 retained closed-headhouse context geometry drifted');
invariant(records.r10Acceptance.acceptedBoundedMvp.b03ContactSequence.stationCount === 613,
  'R10 accepted B03 circulation census drifted');
invariant(r11Components.length === 10 && r11Components.every(
  ({ walkableComponentCount, maximumWalkableStep }) => (
    walkableComponentCount === 1 && maximumWalkableStep === 1
  ),
), 'R11 accepted bounded surfaces drifted');
invariant(r11West?.bounds.minX === 1509 && r11West.bounds.maxX === 1560
  && r11West.bounds.minY === 64 && r11West.bounds.maxY === 69
  && r11West.bounds.minZ === -261 && r11West.bounds.maxZ === -215,
  'R11 west bounded-surface context geometry drifted');
invariant(records.r12PassiveManifest.scope.failSafeState?.vehicleInstalled === false
  || records.r12PassiveManifest.scope.operationalBoundary?.funicularCommissioned === false,
  'R12 passive evidence must not claim the future active shuttle');
invariant(r12ActiveTrack.minX === 2058 && r12ActiveTrack.maxX === 2072
  && r12ActiveTrack.minY === 130 && r12ActiveTrack.maxY === 130
  && r12ActiveTrack.minZ === -748 && r12ActiveTrack.maxZ === -748
  && records.r12Commissioning.commissionedSystem?.scope
    === 'B09_BOUNDED_MAINTENANCE_SHUTTLE_INDICES_9_THROUGH_25'
  && records.r12Commissioning.nonclaims?.publicTransportCommissioned === false
  && records.r12Commissioning.nonclaims?.passengerTransportCommissioned === false
  && records.r12Commissioning.nonclaims?.rescueTransportCommissioned === false
  && records.r12Commissioning.nonclaims?.fullB09FunicularCommissioned === false
  && records.r12Commissioning.nonclaims?.fullGuidewayActiveTransportCommissioned === false,
  'R12R bounded commissioning or nonclaim boundary drifted');

const shotDefinitions = [
  {
    id: 'CZ-G18-SHOT-01-R07-B03-NORTH-PORTAL',
    featureId: 'CZ-R07-B03-NORTH-PORTAL-COLLAR',
    coverageGroup: 'R07_ARCHITECTURE',
    releaseNodeIds: [EXPECTED_NODES.r07],
    camera: point(2218, 167.2, -748),
    target: point(2236.5, 167.5, -748),
    purpose: 'Show the accepted north stone-brick portal collar and preserved route aperture.',
    requiredVisibleAcceptanceFeatures: [
      '36-cell north stone-brick U collar',
      'five-wide by four-high air aperture remains unobstructed',
      'polished-diorite tube contact remains legible',
    ],
    evidenceIds: ['r07Manifest', 'r07Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-02-R07-B03-SOUTH-PORTAL',
    featureId: 'CZ-R07-B03-SOUTH-PORTAL-COLLAR',
    coverageGroup: 'R07_ARCHITECTURE',
    releaseNodeIds: [EXPECTED_NODES.r07],
    camera: point(2214, 167.2, -868),
    target: point(2236.5, 167.5, -868),
    purpose: 'Show the accepted south collar as the matching architectural endpoint.',
    requiredVisibleAcceptanceFeatures: [
      '36-cell south stone-brick U collar',
      'preserved air aperture',
      'matched twin-portal material and proportions',
    ],
    evidenceIds: ['r07Manifest', 'r07Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-03-R08-EMPTY-EIGHT-GALLERIA-OVERVIEW',
    featureId: 'CZ-R08-EMPTY-EIGHT-CAPPED-RETAIL-GALLERIAS',
    coverageGroup: 'R08_EMPTY_EIGHT_RETAIL',
    releaseNodeIds: [EXPECTED_NODES.r08],
    camera: point(midpoint(r08North.minX, r08North.maxX), 128,
      midpoint(r08North.minZ, r08South.maxZ)),
    target: point(midpoint(r08North.minX, r08North.maxX),
      midpoint(r08North.minY, r08North.maxY), midpoint(r08North.minZ, r08South.maxZ)),
    purpose: 'Inventory the accepted north and south capped retail-shell bands in one overhead frame.',
    requiredVisibleAcceptanceFeatures: [
      'north and south galleria shell bands remain spatially distinct',
      '23 commissioned capped retail-shell footprints are identifiable',
      'tenant faces remain closed and no tenant opening is implied',
    ],
    evidenceIds: ['r08NorthRetail', 'r08SouthRetail', 'r08Acceptance'],
    render: {
      mode: 'map',
      width: 2048,
      height: 2048,
      center: { x: 1749, z: 100 },
      span: 256,
      scale: 8,
      ymax: 52,
      shadows: false,
      hideHud: true,
    },
  },
  {
    id: 'CZ-G18-SHOT-04-R08-N07-RETAIL-SHELL-INTERIOR',
    featureId: 'CZ-R08-EE-R-N07-CAPPED-SHELL',
    coverageGroup: 'R08_EMPTY_EIGHT_RETAIL',
    releaseNodeIds: [EXPECTED_NODES.r08],
    camera: point(r08N07.minX + 1, midpoint(r08N07.minY, r08N07.maxY), r08N07.minZ + 1),
    target: point(r08N07.maxX - 1, midpoint(r08N07.minY, r08N07.maxY), r08N07.maxZ - 1),
    purpose: 'Document a source-difficult retail shell after exact wet extraction and closed-shell lining.',
    requiredVisibleAcceptanceFeatures: [
      'light-gray-concrete complete boundary',
      'connected dry air interior',
      'tenant boundary remains physically capped',
    ],
    evidenceIds: ['r08N07Retail', 'r08Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-05-R08-EG-B-REFUGE-CORE',
    featureId: 'CZ-R08-EMPTY-EIGHT-EG-B-PASSIVE-REFUGE-CORE',
    coverageGroup: 'R08_EMPTY_EIGHT_RETAIL',
    releaseNodeIds: [EXPECTED_NODES.r08],
    camera: point(r08Refuge.x, r08Refuge.y + 2, r08Refuge.z - 1),
    target: point(r08Refuge.x, r08Refuge.y, r08Refuge.z + 3),
    purpose: 'Show the passive internal wayfinding node without implying egress or mechanism commissioning.',
    requiredVisibleAcceptanceFeatures: [
      'blue glazed-terracotta refuge-level ring and cardinal datums',
      'closed static core boundary',
      'no exterior opening, stairs, lift, or emergency-system claim',
    ],
    evidenceIds: ['r08EgB', 'r08Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-06-R09-B07-BOUNDED-UPPER-ROUTE',
    featureId: 'CZ-R09-B07-BOUNDED-UPPER-INSPECTION-CIRCULATION',
    coverageGroup: 'R09_R10_CIRCULATION',
    releaseNodeIds: [EXPECTED_NODES.r09],
    camera: point(2126, 85, -410),
    target: point(2108, 72, -398),
    purpose: 'Show the bounded upper B07 route retained closed-headhouse context without implying visibility of the full underground stair.',
    requiredVisibleAcceptanceFeatures: [
      'bounded 91-cell upper walking surface',
      'two-cell lower gravity isolation cap remains closed',
      'doorless upper headhouse hold remains closed',
    ],
    evidenceIds: ['r09Manifest', 'r09Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-07-R10-B03-INSTITUTIONAL-CORRIDOR',
    featureId: 'CZ-R10-B03-INSTITUTIONAL-CONTACT-SEQUENCE',
    coverageGroup: 'R09_R10_CIRCULATION',
    releaseNodeIds: [EXPECTED_NODES.r10],
    camera: point(r10Route.maxX - 3, midpoint(r10Route.minY, r10Route.maxY),
      midpoint(r10Route.minZ, r10Route.maxZ)),
    target: point(r10Route.minX + 9, midpoint(r10Route.minY, r10Route.maxY),
      midpoint(r10Route.minZ, r10Route.maxZ)),
    purpose: 'Record the long passive B03 institutional inspection corridor and its material rhythm.',
    requiredVisibleAcceptanceFeatures: [
      'continuous preserved route void',
      'polished-granite liner and smooth-stone floor',
      'passive sea-lantern rhythm and blackstone security frame',
    ],
    evidenceIds: ['r10B03Manifest', 'r10Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-08-R11-C1-PRIMARY-BOUNDED-SURFACE',
    featureId: 'CZ-R11-C1-BOUNDED-SURFACE-COMPONENT-01',
    coverageGroup: 'R11_BOUNDED_C1_SURFACES',
    releaseNodeIds: [EXPECTED_NODES.r11],
    camera: point(midpoint(r11Primary.bounds.minX, r11Primary.bounds.maxX),
      r11Primary.bounds.maxY + 24, r11Primary.bounds.minZ - 7),
    target: point(midpoint(r11Primary.bounds.minX, r11Primary.bounds.maxX),
      midpoint(r11Primary.bounds.minY, r11Primary.bounds.maxY),
      midpoint(r11Primary.bounds.minZ, r11Primary.bounds.maxZ)),
    purpose: 'Show the largest accepted bounded C1 highway/pedestrian surface component.',
    requiredVisibleAcceptanceFeatures: [
      '1,222-cell one-component bounded surface',
      'maximum walkable step one',
      'frame excludes rail, drainage, utilities, and whole-corridor commissioning claims',
    ],
    evidenceIds: ['r11Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-09-R11-C1-WEST-BRIDGE-SURFACE',
    featureId: 'CZ-R11-C1-BOUNDED-SURFACE-COMPONENT-02',
    coverageGroup: 'R11_BOUNDED_C1_SURFACES',
    releaseNodeIds: [EXPECTED_NODES.r11],
    camera: point(1520, 72, -250),
    target: point(1548, 66.5, -238),
    purpose: 'Show the accepted west hydraulic-isolation bridge/retained-cut surface closure.',
    requiredVisibleAcceptanceFeatures: [
      '620-cell one-component west surface',
      'maximum walkable step one with static support geometry',
      'retained hydraulic boundary is not presented as commissioned drainage',
    ],
    evidenceIds: ['r11Acceptance'],
  },
  {
    id: 'CZ-G18-SHOT-10-R12-B09-BOUNDED-SHUTTLE-TERMINAL-BAY',
    featureId: 'CZ-R12-B09-BOUNDED-SHUTTLE-TERMINAL-BAY',
    coverageGroup: 'R12_BOUNDED_TRANSPORT',
    releaseNodeIds: [EXPECTED_NODES.r12],
    camera: point(r12ActiveTrack.minX + 0.5, r12ActiveTrack.minY + 1.2,
      r12ActiveTrack.minZ + 0.5),
    target: point(r12ActiveTrack.maxX, r12ActiveTrack.minY + 1.2,
      r12ActiveTrack.minZ + 0.5),
    purpose: 'Document the bounded maintenance-shuttle terminal bay in its accepted fail-closed parked block poststate.',
    requiredVisibleAcceptanceFeatures: [
      '15-cell powered-rail strip remains visibly de-energized',
      'two wall controls remain in their accepted powered-false state',
      'polished-diorite terminal stops bound only indices 9 through 25',
    ],
    evidenceIds: ['r12ActiveManifest', 'r12Commissioning'],
    claimBoundary: {
      entityVisibilityRequired: false,
      boundedMaintenanceShuttleCommissioned: true,
      commissionedFirstIndex: 9,
      commissionedLastIndex: 25,
      publicPassengerRescueOrFullFunicularCommissioned: false,
    },
  },
  {
    id: 'CZ-G18-SHOT-11-R12-B09-PASSIVE-SUMMIT-APPROACH',
    featureId: 'CZ-R12-B09-PASSIVE-SUMMIT-APPROACH',
    coverageGroup: 'R12_BOUNDED_TRANSPORT',
    releaseNodeIds: [EXPECTED_NODES.r12],
    camera: point(r12Guideway.minX + 4, r12Guideway.maxY - 1, r12Guideway.minZ + 13),
    target: point(r12Guideway.minX, r12Guideway.maxY - 6, r12Guideway.minZ + 4),
    purpose: 'Document the accepted passive summit approach without extending the bounded maintenance-shuttle claim.',
    requiredVisibleAcceptanceFeatures: [
      'summit guideway and passive station approach remain intact',
      'exterior Z11 cap remains closed',
      'no summit vehicle, public route, or full-funicular commissioning is implied',
    ],
    evidenceIds: ['r12PassiveManifest', 'r12PassiveAcceptance', 'r12Commissioning'],
    claimBoundary: {
      entityVisibilityRequired: false,
      passiveSummitApproachOnly: true,
      boundedMaintenanceShuttleReachesSummit: false,
      exteriorZ11CapOpened: false,
      fullB09FunicularCommissioned: false,
    },
  },
];

const featureIds = shotDefinitions.map(({ featureId }) => featureId);
invariant(new Set(featureIds).size === featureIds.length, 'planned feature IDs are not unique');
const existingCatalogIds = new Set(worldCatalog.features.map(({ externalId }) => externalId).filter(Boolean));
const catalogCollisionIds = featureIds.filter((featureId) => existingCatalogIds.has(featureId));
invariant(catalogCollisionIds.length === 0,
  `planned feature IDs collide with existing catalog IDs: ${catalogCollisionIds.join(', ')}`);

const shots = shotDefinitions.map((shot, index) => {
  const filename = `${String(index + 1).padStart(2, '0')}-${shot.featureId.toLowerCase()}.png`;
  const expectedRaster = rasterBinding(path.join(CAPTURE_ROOT, filename));
  return {
    ...shot,
    sequence: index + 1,
    render: shot.render ?? {
      mode: 'perspective',
      width: 1920,
      height: 1080,
      fovDegrees: shot.id.includes('INSTITUTIONAL-CORRIDOR') ? 62 : 70,
      shadows: true,
      hideHud: true,
    },
    coordinateEvidence: shot.evidenceIds.map((id) => ({ id, ...sourceBindings[id] })),
    terminalPostBinding: {
      status: terminalPostBinding.status,
      terminalAcceptanceSha256: terminalAcceptanceBinding.sha256,
      terminalCompleteSaveSha256: terminalPostBinding.terminalCompleteSaveSha256,
    },
    expectedRaster,
    matchedMediaProjection: {
      id: shot.id,
      path: expectedRaster.path,
      sha256: expectedRaster.sha256,
      bytes: expectedRaster.bytes,
      matchedFeatureIds: [shot.featureId],
      requiredAfterCapture: ['sha256', 'bytes', 'recognizedRasterSignature', 'terminalCompleteSaveSha256'],
    },
  };
});
invariant(shots.filter(({ render }) => render.mode === 'map').length === 1,
  'shot plan must contain exactly one depth-clipped map shot');
const slicedMapShot = shots.find(({ render }) => render.mode === 'map');
invariant(slicedMapShot?.id === 'CZ-G18-SHOT-03-R08-EMPTY-EIGHT-GALLERIA-OVERVIEW'
  && slicedMapShot.render.center.x === 1749 && slicedMapShot.render.center.z === 100
  && slicedMapShot.render.span === 256 && slicedMapShot.render.scale === 8
  && slicedMapShot.render.ymax === 52
  && slicedMapShot.render.width === slicedMapShot.render.span * slicedMapShot.render.scale
  && slicedMapShot.render.height === slicedMapShot.render.span * slicedMapShot.render.scale,
'shot 03 must remain the exact 2048-square y<=52 capped-galleria slice');
const coverageGroups = Object.fromEntries([
  'R07_ARCHITECTURE',
  'R08_EMPTY_EIGHT_RETAIL',
  'R09_R10_CIRCULATION',
  'R11_BOUNDED_C1_SURFACES',
  'R12_BOUNDED_TRANSPORT',
].map((group) => [group, shots.filter(({ coverageGroup }) => coverageGroup === group).map(({ id }) => id)]));
invariant(Object.values(coverageGroups).every((ids) => ids.length > 0),
  'one or more required G18 coverage groups has no shot');

const presentCaptureCount = shots.filter(({ expectedRaster }) => expectedRaster.exists).length;
const allCapturesPresent = presentCaptureCount === shots.length;
const waitingReasons = [];
if (!terminalAccepted) waitingReasons.push('Accepted R13/G18 terminal physical post is not yet bound.');
if (!allCapturesPresent) waitingReasons.push(
  `${shots.length - presentCaptureCount} of ${shots.length} expected terminal rasters are not present.`,
);
waitingReasons.push('Matched-media signature, feature crosswalk, and common-terminal verification remain downstream G18 gates.');
const status = !terminalAccepted
  ? 'WAITING_R13_G18_TERMINAL_POST_AND_CAPTURES'
  : !allCapturesPresent
    ? 'READY_R13_G18_TERMINAL_CAPTURE_PLAN_WAITING_RASTERS'
    : 'CAPTURES_PRESENT_AWAITING_R13_G18_MATCHED_MEDIA_VERIFICATION';
const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-media-shot-plan-v1',
  generatedAtUtc: GENERATED_AT,
  status,
  releaseNodeId: 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
  gateId: 'G18_MEDIA_AND_PUBLICATION',
  purpose: 'Compact deterministic terminal-post capture plan for the accepted bounded MVP, separate from publication acceptance.',
  terminalPostBinding,
  worldCatalog: {
    ...worldCatalogBinding,
    schemaVersion: worldCatalog.schemaVersion,
    featureCount: worldCatalog.count,
    plannedFeatureIdCount: featureIds.length,
    plannedFeatureIdCollisionCount: catalogCollisionIds.length,
    plannedFeatureIdsRegistered: false,
    registrationStatus: 'WAITING_FUTURE_TERMINAL_DATABASE_IMPORT',
    coordinateTruthBoundary: 'Camera coordinates come from accepted Combined Zones release geometry; the bound catalog supplies the durable external-ID/geometry contract and currently contains no Combined Zones terminal registrations.',
  },
  acceptedCoordinateEvidence: sourceBindings,
  captureContract: {
    captureRoot: relative(CAPTURE_ROOT),
    rasterFormat: 'PNG',
    commonTerminalPostRequired: true,
    everyRasterRequiresHashBytesAndRecognizedSignature: true,
    everyRasterRequiresAtLeastOneMatchedFeatureId: true,
    shotPlanDoesNotAcceptMedia: true,
    offlineBlockRendererIncludesEntities: false,
    downstreamConsumer: 'generate_combined_zones_r13_g18_publication_acceptance.mjs matched-media evidence input',
  },
  coverage: {
    requiredGroups: Object.keys(coverageGroups),
    groups: coverageGroups,
    requiredGroupCount: Object.keys(coverageGroups).length,
    coveredGroupCount: Object.values(coverageGroups).filter((ids) => ids.length > 0).length,
    completePlannedCoverage: true,
  },
  shots,
  readiness: {
    terminalPostAccepted: terminalAccepted,
    shotCount: shots.length,
    expectedRasterCount: shots.length,
    presentCaptureCount,
    missingCaptureCount: shots.length - presentCaptureCount,
    capturesAcceptedAsMatchedMedia: false,
    publicationAuthorized: false,
    waitingReasons,
  },
  safetyBoundary: {
    readOnlyPlanGeneration: true,
    liveCallsPerformed: false,
    mediaCapturePerformed: false,
    worldEditsPerformed: false,
    docsModified: false,
    canonicalBuildopsModified: false,
    canonicalG18WaitArtifactsModified: false,
    databaseWrittenOrImported: false,
    serviceMutationsPerformed: false,
    externalPublicationPerformed: false,
  },
};
const shotPlanPayloadSha256 = payloadSha256(reportWithoutIdentity);
const report = { ...reportWithoutIdentity, shotPlanPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), serialize(report));
process.stdout.write(`${JSON.stringify({
  status,
  out: relative(OUT),
  shotPlanPayloadSha256,
  shotCount: shots.length,
  presentCaptureCount,
  terminalPostAccepted: terminalAccepted,
  mediaCapturePerformed: false,
}, null, 2)}\n`);
