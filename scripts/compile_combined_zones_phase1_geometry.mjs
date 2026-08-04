#!/usr/bin/env node
/**
 * Compile the fail-closed Masterplan 05 Phase 1 geometry coordination record.
 *
 * Offline only: this reads authored JSON files and writes one JSON report. It
 * never reads live world state or connects to Minecraft, RCON, fleet APIs, or
 * systemd. It deliberately does not emit block operations.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function value(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const OUTPUT_PATH = path.resolve(ROOT, value(
  '--out',
  'masterplans/05-combined-zones/phase1-geometry-coordination.json',
));
const GENERATED_AT = value('--generated-at', new Date().toISOString());

const PATHS = Object.freeze({
  child01: 'masterplans/01-cheyenne-mountain-complex/06-contractor/contractor-brief.json',
  child02: 'masterplans/02-subtropolis/06-contractor/contractor-brief.json',
  child03: 'masterplans/03-houston-tunnel-system/06-contractor/contractor-brief.json',
  normalized04: 'masterplans/04-combined-complex/02-design/site-coordinates.json',
  contractor04: 'masterplans/04-combined-complex/04-contractor/contractor-brief.json',
  reconciliation: 'masterplans/04-combined-complex/authority-reconciliation.json',
  registry05: 'masterplans/05-combined-zones/site-coordinates.json',
  phase0Evidence: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
});

// Updating an authority source requires explicit review of this pin. A stale
// compiler must fail before it writes an apparently current coordination file.
const EXPECTED_RECONCILIATION_SHA256 =
  'f26f4db255f4537b711ccdbeea38d075dc16914e8ec67dc3386c90f500adba9e';

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256File(relativePath) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(absolute(relativePath)))
    .digest('hex');
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireEqual(actual, expected, label) {
  requireCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} drifted: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`,
  );
}

function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}

function rational(numerator, denominator = 1) {
  requireCondition(Number.isInteger(numerator), `non-integer rational numerator ${numerator}`);
  requireCondition(Number.isInteger(denominator) && denominator > 0, `invalid denominator ${denominator}`);
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return {
    numerator: reducedNumerator,
    denominator: reducedDenominator,
    expression: `${reducedNumerator}/${reducedDenominator}`,
    decimal: reducedNumerator / reducedDenominator,
  };
}

function mappedY(localY) {
  requireCondition(Number.isInteger(localY), `local Y boundary must be integer, found ${localY}`);
  const scaleNumerator = localY <= 0 ? 32 : 29;
  const scaleDenominator = localY <= 0 ? 25 : 100;
  return rational((72 * scaleDenominator) + (scaleNumerator * localY), scaleDenominator);
}

function floorRational(value) {
  return Math.floor(value.numerator / value.denominator);
}

function ceilRational(value) {
  return Math.ceil(value.numerator / value.denominator);
}

function roundPointRational(value) {
  // Nearest block coordinate; an exact half chooses the greater coordinate.
  return Math.floor((2 * value.numerator + value.denominator) / (2 * value.denominator));
}

function mapLocalPoint(point) {
  const y = mappedY(point.y);
  return {
    exact: {
      x: 2048 + point.x,
      y,
      z: -328 + point.z,
    },
    setout: {
      x: Math.floor(2048 + point.x + 0.5),
      y: roundPointRational(y),
      z: Math.floor(-328 + point.z + 0.5),
    },
  };
}

function localBounds(raw) {
  return {
    minX: raw.x_min,
    maxX: raw.x_max,
    minY: raw.y_min,
    maxY: raw.y_max,
    minZ: raw.z_min,
    maxZ: raw.z_max,
  };
}

function compileBoundaryVolume(id, sourcePath, local) {
  const minY = mappedY(local.minY);
  const maxY = mappedY(local.maxY);
  const cellBounds = {
    minXInclusive: 2048 + local.minX,
    maxXExclusive: 2048 + local.maxX,
    minYInclusive: floorRational(minY),
    maxYExclusive: ceilRational(maxY),
    minZInclusive: -328 + local.minZ,
    maxZExclusive: -328 + local.maxZ,
  };
  const dimensions = {
    x: cellBounds.maxXExclusive - cellBounds.minXInclusive,
    y: cellBounds.maxYExclusive - cellBounds.minYInclusive,
    z: cellBounds.maxZExclusive - cellBounds.minZInclusive,
  };
  return {
    id,
    sourcePath,
    sourceSemantics: 'continuous-boundary-planes-min-inclusive-max-exclusive',
    localBoundaryPlanes: local,
    worldBoundaryPlanes: {
      minX: 2048 + local.minX,
      maxX: 2048 + local.maxX,
      minY,
      maxY,
      minZ: -328 + local.minZ,
      maxZ: -328 + local.maxZ,
    },
    exactCoordinationCellSet: {
      representation: 'half-open-axis-aligned-box',
      bounds: cellBounds,
      dimensions,
      cellCount: dimensions.x * dimensions.y * dimensions.z,
      purpose: 'ownership-and-fit-coordination-only-not-a-material-or-operation-set',
    },
  };
}

function inclusiveVolume(bounds) {
  const halfOpen = {
    minXInclusive: bounds.minX,
    maxXExclusive: bounds.maxX + 1,
    minYInclusive: bounds.minY,
    maxYExclusive: bounds.maxY + 1,
    minZInclusive: bounds.minZ,
    maxZExclusive: bounds.maxZ + 1,
  };
  const dimensions = {
    x: halfOpen.maxXExclusive - halfOpen.minXInclusive,
    y: halfOpen.maxYExclusive - halfOpen.minYInclusive,
    z: halfOpen.maxZExclusive - halfOpen.minZInclusive,
  };
  return {
    sourceSemantics: 'inclusive-integer-block-centers',
    representation: 'half-open-axis-aligned-box',
    bounds: halfOpen,
    dimensions,
    cellCount: dimensions.x * dimensions.y * dimensions.z,
  };
}

function segment(from, to) {
  const delta = {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
  const horizontalEuclidean = Math.hypot(delta.x, delta.z);
  const horizontalManhattan = Math.abs(delta.x) + Math.abs(delta.z);
  return {
    from,
    to,
    delta,
    horizontalEuclidean: Number(horizontalEuclidean.toFixed(6)),
    horizontalManhattan,
    absoluteRise: Math.abs(delta.y),
    risePerEuclideanRun: horizontalEuclidean === 0
      ? null
      : Number((Math.abs(delta.y) / horizontalEuclidean).toFixed(6)),
  };
}

const child01 = readJson(PATHS.child01);
const child02 = readJson(PATHS.child02);
const child03 = readJson(PATHS.child03);
const normalized04 = readJson(PATHS.normalized04);
const contractor04 = readJson(PATHS.contractor04);
const reconciliation = readJson(PATHS.reconciliation);
const registry05 = readJson(PATHS.registry05);
const phase0Evidence = readJson(PATHS.phase0Evidence);

requireEqual(
  sha256File(PATHS.reconciliation),
  EXPECTED_RECONCILIATION_SHA256,
  'authority reconciliation hash',
);
requireEqual(reconciliation.schemaVersion, 1, 'authority reconciliation schema');
requireEqual(reconciliation.worldEditAuthorized, false, 'authority world-edit gate');
requireEqual(registry05.authorityModel.worldEditAuthorized, false, 'registry world-edit gate');
requireEqual(registry05.coordinateSemantics.blockRoundingPolicy, null, 'prior-phase rounding gate');
requireEqual(registry05.transform.vertical.activeForBuild, false, 'prior-phase vertical build gate');
requireEqual(registry05.transform.topDown.rotationDegrees, 0, 'top-down rotation');
requireEqual(registry05.transform.localOriginInWorld.designY, 72, 'street design Y');
requireEqual(registry05.transform.topDown.worldX, '2048 + localX', 'world X transform');
requireEqual(registry05.transform.topDown.worldZ, '-328 + localZ', 'world Z transform');
requireEqual(
  registry05.transform.vertical.belowStreet,
  'worldY = 72 + 1.28 * localY for localY <= 0',
  'below-street transform',
);
requireEqual(
  registry05.transform.vertical.aboveStreet,
  'worldY = 72 + 0.29 * localY for localY >= 0',
  'above-street transform',
);

const canonicalBindings = new Map([
  ...reconciliation.canonicalSources.childArchitecture.map((entry) => [entry.path, entry.sha256]),
  [
    reconciliation.canonicalSources.normalizedComposition.coordinateRegistry.path,
    reconciliation.canonicalSources.normalizedComposition.coordinateRegistry.sha256,
  ],
  [
    reconciliation.canonicalSources.normalizedComposition.contractorBrief.path,
    reconciliation.canonicalSources.normalizedComposition.contractorBrief.sha256,
  ],
  [
    reconciliation.canonicalSources.currentWorldPlacement.coordinateRegistry.path,
    reconciliation.canonicalSources.currentWorldPlacement.coordinateRegistry.sha256,
  ],
  [
    reconciliation.canonicalSources.currentWorldPlacement.phase0Evidence.path,
    reconciliation.canonicalSources.currentWorldPlacement.phase0Evidence.sha256,
  ],
]);

for (const relativePath of [
  PATHS.child01,
  PATHS.child02,
  PATHS.child03,
  PATHS.normalized04,
  PATHS.contractor04,
  PATHS.registry05,
  PATHS.phase0Evidence,
]) {
  requireEqual(sha256File(relativePath), canonicalBindings.get(relativePath), `${relativePath} hash`);
}

function zone(id) {
  const result = registry05.zones.find((candidate) => candidate.id === id);
  requireCondition(result, `missing Masterplan 05 zone ${id}`);
  return result;
}

requireEqual(normalized04.authority.worldEditAuthorized, false, 'normalized 04 edit gate');
requireEqual(contractor04.authority.worldEditAuthorized, false, 'contractor 04 edit gate');
requireEqual(normalized04.mountain_range.no_ravine, true, 'no-ravine rule');

const envelopes = [
  compileBoundaryVolume(
    'houston-city',
    `${PATHS.normalized04}#key_locations.city_footprint`,
    localBounds(normalized04.key_locations.city_footprint),
  ),
  compileBoundaryVolume(
    'houston-tunnel-sample',
    `${PATHS.normalized04}#individual_sites.houston_tunnel.footprint`,
    localBounds(normalized04.individual_sites.houston_tunnel.footprint),
  ),
  compileBoundaryVolume(
    'subtropolis',
    `${PATHS.normalized04}#individual_sites.subtropolis.footprint`,
    localBounds(normalized04.individual_sites.subtropolis.footprint),
  ),
  compileBoundaryVolume(
    'continuous-mountain',
    `${PATHS.normalized04}#mountain_range.footprint`,
    localBounds(normalized04.mountain_range.footprint),
  ),
  compileBoundaryVolume(
    'cheyenne-chamber',
    `${PATHS.normalized04}#individual_sites.cheyenne_mountain.chamber_position`,
    localBounds(normalized04.individual_sites.cheyenne_mountain.chamber_position),
  ),
];

const terminal = zone('Z02').hiddenSubway.terminal;
requireEqual(
  terminal.phase0CoverSurvey.columns,
  (terminal.bounds.maxX - terminal.bounds.minX + 1)
    * (terminal.bounds.maxZ - terminal.bounds.minZ + 1),
  'Empty Eight inclusive Phase 0 columns',
);
requireEqual(
  terminal.platforms.lengthBlocks,
  terminal.platforms.maxX - terminal.platforms.minX + 1,
  'Empty Eight inclusive platform length',
);

const anchorSetouts = reconciliation.coordinateCrosswalk.map((entry) => ({
  id: entry.id,
  local: entry.local,
  worldStudy: entry.worldStudy,
  compiled: mapLocalPoint(entry.local),
}));

for (const anchor of anchorSetouts) {
  requireEqual(anchor.compiled.exact.x, anchor.worldStudy.x, `${anchor.id} exact X`);
  requireEqual(anchor.compiled.exact.y.decimal, anchor.worldStudy.y, `${anchor.id} exact Y`);
  requireEqual(anchor.compiled.exact.z, anchor.worldStudy.z, `${anchor.id} exact Z`);
}

const houstonTransform = {
  status: 'FROZEN_FOR_NAMED_AND_EXPLICIT_03_GEOMETRY',
  domain: 'Masterplan 03 explicit coordinates only; null-position generic fillers remain blocked',
  childToNormalized04: {
    localX: 'childX - 69',
    localY: 'childY - 64',
    localZ: 'childZ + 69',
    rotationDegrees: 0,
    reflection: false,
  },
  childToWorld05: {
    worldX: '1979 + childX',
    localYThenPiecewiseWorldY: 'localY = childY - 64; apply the exact Phase 1 rational vertical contract',
    worldZ: '-259 + childZ',
  },
  proof: {
    childAboveGroundBoundaryPlanes: child03.build_extent.above_ground,
    normalizedBoundaryPlanes: { minX: -69, maxX: 69, minZ: -69, maxZ: 69 },
    childStreetY: child03.y_levels.street_level,
    normalizedStreetY: 0,
    childTunnelFloorY: child03.y_levels.tunnel_floor,
    normalizedTunnelFloorY: -6,
  },
  unresolved: [
    'generic_downtown_tower has null X/Z and count 8-10',
    'generic_parking_garage has null X/Z and count 1-2',
    'unplaced generic structures cannot enter a compiled cell or operation set',
  ],
};

const service = zone('Z08');
const serviceSegments = [
  segment(service.from, service.contact),
  segment(service.contact, service.to),
];
const funicular = zone('Z11');
const funicularDirect = segment(funicular.funicularStart, funicular.summit);

const decisions = [
  {
    id: 'P1-D01-LEGACY-BOUNDARY-PLANES',
    status: 'FROZEN_FOR_PHASE1_COORDINATION',
    decision: 'Masterplan 04 numeric min/max envelopes are continuous boundary planes and compile as min-inclusive/max-exclusive boxes.',
    evidence: [
      'the -100..100 SubTropolis span is declared 200 blocks',
      'the -69..69 Houston span is declared 138 blocks',
      'the -400..400 mountain span is declared 800 blocks',
    ],
    consequence: 'No +1 is applied to a Masterplan 04 maximum when compiling its coordination cell envelope.',
  },
  {
    id: 'P1-D02-EMPTY-EIGHT-INCLUSIVE-CELLS',
    status: 'FROZEN_FOR_PHASE1_COORDINATION',
    decision: 'Z02-U1 bounds and linear extents are inclusive integer block centers and convert to half-open storage by adding one to every maximum.',
    evidence: [
      '241 x 121 equals the recorded 29,161 Phase 0 cover columns',
      'platform X 1652..1752 inclusive equals the declared 101-block length',
      'future interface walls are located on the declared x=1632 and x=1872 endpoints',
    ],
  },
  {
    id: 'P1-D03-VERTICAL-RATIONALS',
    status: 'FROZEN_FOR_PHASE1_COORDINATION_NOT_ACTIVATED_FOR_BUILD',
    decision: 'Represent the vertical study exactly as 72 + 32/25*localY below street and 72 + 29/100*localY above street.',
    rounding: {
      pointSetout: 'nearest integer; exact halves choose the greater coordinate',
      lowerBoundary: 'floor',
      upperExclusiveBoundary: 'ceiling',
      pathVertex: 'same as point setout',
      terrainSubstitution: 'prohibited when authored Y is null',
    },
    consequence: 'This makes coordination boxes deterministic but does not activate the Phase 0 vertical study for construction.',
  },
  {
    id: 'P1-D04-HOUSTON-TRANSLATION',
    status: 'FROZEN_FOR_EXPLICIT_MASTERPLAN03_GEOMETRY',
    decision: 'Translate Masterplan 03 by (-69,-64,+69) into normalized Masterplan 04, with no rotation or reflection.',
    consequence: 'The 138x138 child boundary planes center on local (0,0,0), child street Y=64 maps to local Y=0, and child tunnel floor Y=58 maps to local Y=-6.',
  },
  {
    id: 'P1-D05-FUNICULAR-HOLD',
    status: 'HOLD_NO_EXACT_PLACEMENT_INFERRED',
    decision: 'Reject the impossible direct incline and leave east-versus-west face plus all switchback vertices unset.',
    minimumRequirements: {
      horizontalRunBlocksAtAbsoluteMaximumRailGrade: 174,
      directHorizontalRunBlocks: 80,
      additionalLevelRunRequiredForEveryCurve: true,
    },
    consequence: 'Candidate route families may be surveyed, but this artifact invents no centerline coordinates.',
  },
];

const blockers = [
  {
    id: 'P1-B01-VERTICAL-AUTHORITY-ACTIVATION',
    scope: ['Z04', 'Z05', 'Z06', 'Z07', 'Z08', 'Z09', 'Z10', 'Z11'],
    status: 'BLOCKING_OPERATION_COMPILATION',
    conflict: 'The authoritative Masterplan 05 registry still marks its vertical transform inactive for build and has a null block-rounding policy.',
    conservativeDefault: 'Use P1-D03 only for coordination and review; emit zero construction operations.',
    closureEvidenceRequired: 'A reviewed successor authority record activating the exact rational and rounding contract per scope.',
  },
  {
    id: 'P1-B02-CHEYENNE-INTERNAL-FIT',
    scope: ['Z10'],
    status: 'BLOCKING_CHILD_GEOMETRY',
    conflict: 'The 01 child chamber is 45x18x25 while the 04 receiving envelope is 80x150x80. Center-preserving translation and envelope-fitting anisotropic scale produce materially different architecture.',
    conservativeDefault: 'Preserve the 01 source geometry and the 04 receiving envelope without selecting a rescale.',
    candidates: [
      {
        id: 'preserve-child-dimensions-center-aligned',
        childToLocalTranslation: { x: 0, y: -880, z: -590 },
        mappedChildBoundaryPlanes: { minX: -22, maxX: 23, minY: 316, maxY: 334, minZ: -552, maxZ: -527 },
      },
      {
        id: 'fit-child-boundaries-to-04-envelope',
        scale: { x: '80/45', y: '150/18', z: '80/25' },
        rejectedUntilArchitecturalReview: true,
      },
    ],
    closureEvidenceRequired: 'An exact child-to-04 affine transform and a room-by-room readability/egress acceptance.',
  },
  {
    id: 'P1-B03-CHEYENNE-JCURVE',
    scope: ['Z10'],
    status: 'BLOCKING_CENTERLINE',
    conflict: 'The inherited 800-block 01 J-curve does not have a normalized route between the 04 outer portal and chamber entry.',
    conservativeDefault: 'Retain the 01 cross-section and character stages; do not infer a route from endpoints.',
    closureEvidenceRequired: 'An integer centerline, curve raster, grade schedule, cross-section side bias, chamber interface, and collision proof inside Z09/Z10.',
  },
  {
    id: 'P1-B04-SUBTROPOLIS-NORMALIZATION',
    scope: ['Z07'],
    status: 'BLOCKING_CHILD_GEOMETRY',
    conflict: 'No orientation-preserving translation maps both the 02 200x200 grid and its entrance portal to the binding 04 footprint and portal.',
    conservativeDefault: 'Do not mirror or rotate Masterplan 02 implicitly.',
    candidates: [
      {
        id: 'orientation-preserving-footprint-fit',
        childToLocal: { localX: 'childX', localY: 'childY - 70', localZ: 'childZ - 100' },
        childPortalMapsTo: { x: 0, y: 0, z: -100 },
        required04Portal: { x: 0, y: 0, z: -300 },
      },
      {
        id: 'portal-and-footprint-fit-with-north-south-reflection',
        childToLocal: { localX: 'childX', localY: 'childY - 70', localZ: '-childZ - 300' },
        reflection: true,
        rejectedUntilOrientationReview: true,
      },
    ],
    closureEvidenceRequired: 'A reviewed affine transform preserving the selected entrance, pillar grid, tenant orientation, and emergency routes.',
  },
  {
    id: 'P1-B05-SUBTROPOLIS-PILLARS',
    scope: ['Z07'],
    status: 'BLOCKING_CHILD_CELL_SET',
    conflict: 'The 02 source lists 7 X values and 5 Z values (35 intersections) but estimates 60-80 pillars, and an 8x8 pillar has no declared side bias around an integer center.',
    conservativeDefault: 'Compile neither missing pillars nor an even-width footprint from an assumed center convention.',
    closureEvidenceRequired: 'An explicit pillar instance registry with min-inclusive/max-exclusive boxes and an exact count.',
  },
  {
    id: 'P1-B06-HOUSTON-GENERIC-PLACEMENT',
    scope: ['Z04', 'Z05'],
    status: 'BLOCKING_COMPLETE_CHILD_CELL_SET',
    conflict: 'Masterplan 03 leaves generic tower and garage X/Z null and their counts as ranges.',
    conservativeDefault: 'Normalize only named and explicit Masterplan 03 geometry with P1-D04.',
    closureEvidenceRequired: 'Explicit IDs, positions, dimensions, interfaces, and non-overlapping cell boxes for every filler structure.',
  },
  {
    id: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
    scope: ['Z06'],
    status: 'BLOCKING_CENTERLINE',
    conflict: 'The top and observation landing share X/Z, but the lower lobby moves 30 blocks north; no bend, landing, or 7x7 transition geometry is authored.',
    conservativeDefault: 'Freeze the three anchors and the odd 7x7 section only.',
    closureEvidenceRequired: 'An integer centerline and exact lift/stair/service-chase cell boxes through the dogleg with egress proof.',
  },
  {
    id: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
    scope: ['Z08'],
    status: 'BLOCKING_CENTERLINE',
    conflict: 'Three anchors exist, but no rail-buildable raster, vertical step schedule, or side bias for the even 6x6 cross-section exists; the 04 claimed 120-block length is shorter than the 156.963840-block two-segment Euclidean plan run.',
    conservativeDefault: 'Treat the three-anchor polyline as a survey control line only.',
    closureEvidenceRequired: 'A surveyed integer rail centerline with cardinal/coarse-stair geometry, no sloped curves, grade <=1:1, powered-rail schedule, 6x6 side convention, and protected-volume collision proof.',
  },
  {
    id: 'P1-B09-FUNICULAR-CENTERLINE',
    scope: ['Z11'],
    status: 'BLOCKING_CENTERLINE',
    conflict: 'The direct run is 80 blocks for 174 blocks of world rise and cannot carry Minecraft rail; the source leaves east versus west face unresolved.',
    conservativeDefault: 'Hold both face selection and all intermediate coordinates; compile no rail or excavation cells.',
    closureEvidenceRequired: 'A surveyed mountain-face profile, integer rail raster, level switchback curves, station throats, maintenance/egress route, and protected-relic/ownership clearance.',
  },
  {
    id: 'P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
    scope: ['Z09'],
    status: 'BLOCKING_MATERIAL_COMPILATION',
    conflict: 'Z09 is only a rectangular planning envelope; no exact mountain surface/solid function, hydrology treatment, drainage, or exhibit-void cell registry exists.',
    conservativeDefault: 'Reserve the coordination box and preserve every observed generated structure untouched.',
    closureEvidenceRequired: 'A deterministic shell/solid model, hydrology plan, and hash-bound exact no-touch cell sets for all protected relics.',
  },
  {
    id: 'P1-B11-EXTERNAL-INTERFACES',
    scope: ['Z01', 'Z02', 'Z03', 'C1', 'C3', 'C4'],
    status: 'BLOCKING_OPERATION_COMPILATION',
    conflict: 'Grand Avenue Y is null, the PassageWay endpoint is unset, current ownership/entity gates are absent, and the corridor remains detailed-civil-design only.',
    conservativeDefault: 'Never substitute terrain Y for null setout and keep future interfaces sealed.',
    closureEvidenceRequired: 'Exact interface points and Y profiles, ownership contracts, entity gate, and per-scope forward/rollback ownership.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-geometry-coordination',
  generatedAtUtc: GENERATED_AT,
  status: 'PHASE1_COORDINATION_PARTIAL_PASS_OPERATION_COMPILATION_BLOCKED',
  authority: {
    chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    role: 'derived-phase1-coordination-not-a-successor-authority-and-not-a-build-package',
    planToDevelop: 'masterplans/05-combined-zones/MASTERPLAN.md',
    authorityReconciliation: PATHS.reconciliation,
    offlineOnly: true,
    worldEditAuthorized: false,
    constructionPackageExists: false,
  },
  sourceBindings: Object.entries(PATHS).map(([id, relativePath]) => ({
    id,
    path: relativePath,
    sha256: sha256File(relativePath),
  })),
  coordinateContract: {
    axes: { north: '-z', east: '+x', up: '+y' },
    topDown: {
      rotationDegrees: 0,
      localOriginInWorld: { x: 2048, y: 72, z: -328 },
      worldX: '2048 + localX',
      worldZ: '-328 + localZ',
    },
    vertical: {
      belowOrAtStreet: { formula: 'worldY = 72 + (32/25) * localY', domain: 'localY <= 0' },
      aboveOrAtStreet: { formula: 'worldY = 72 + (29/100) * localY', domain: 'localY >= 0' },
      arithmetic: 'exact-rational-before-rounding',
      pointRounding: 'nearest-integer-ties-to-positive-infinity',
      lowerBoundaryRounding: 'floor',
      upperExclusiveBoundaryRounding: 'ceiling',
      nullYRule: 'fail-closed-never-substitute-surveyed-terrain',
      activeForBuild: false,
    },
    scopeSemantics: {
      normalized04Envelopes: 'continuous-boundary-planes-min-inclusive-max-exclusive',
      emptyEight: 'inclusive-integer-block-centers-converted-to-half-open-storage',
      allOtherPublished05Bounds: 'planning-references-until-explicitly-classified-by-a-successor-scope-record',
    },
  },
  decisions,
  compiledCoordinationGeometry: {
    operationCellCount: 0,
    materialCellCount: 0,
    normalized04EnvelopeCellSets: envelopes,
    emptyEightShellCoordinationCellSet: inclusiveVolume(terminal.bounds),
    emptyEightLinearSemantics: {
      trackExtentXInclusive: terminal.trackExtentX,
      platformExtentXInclusive: {
        minX: terminal.platforms.minX,
        maxX: terminal.platforms.maxX,
        cellCount: terminal.platforms.lengthBlocks,
      },
      trackCenterlinesZ: terminal.trackCenterlinesZ,
      railY: terminal.railY,
      futureInterfaceWalls: terminal.futureInterfaces,
    },
    normalizedChildGeometry: {
      masterplan01: {
        status: 'BLOCKED_EXACT_CANDIDATES_ONLY',
        sourceMainChamberBoundaryPlanes: child01.key_locations.main_chamber_bounds,
        receivingEnvelope: normalized04.individual_sites.cheyenne_mountain.chamber_position,
        blockerIds: ['P1-B02-CHEYENNE-INTERNAL-FIT', 'P1-B03-CHEYENNE-JCURVE'],
      },
      masterplan02: {
        status: 'BLOCKED_TRANSFORM_AND_INSTANCE_REGISTRY_REQUIRED',
        sourceGridDimensions: { x: 200, z: 200 },
        sourceGridBoundaryPlanes: { minX: -100, maxX: 100, minZ: -200, maxZ: 0 },
        receivingEnvelope: normalized04.individual_sites.subtropolis.footprint,
        pillarCoordinateCounts: {
          xValues: child02.pillar_grid_coordinates.cross_streets_x_values.length,
          zValues: child02.pillar_grid_coordinates.main_avenue_intersections_z_values.length,
          cartesianIntersections: child02.pillar_grid_coordinates.cross_streets_x_values.length
            * child02.pillar_grid_coordinates.main_avenue_intersections_z_values.length,
          declaredEstimateMin: child02.pillar_grid_coordinates.pillar_count_estimate_min,
          declaredEstimateMax: child02.pillar_grid_coordinates.pillar_count_estimate_max,
        },
        blockerIds: ['P1-B04-SUBTROPOLIS-NORMALIZATION', 'P1-B05-SUBTROPOLIS-PILLARS'],
      },
      masterplan03: houstonTransform,
    },
    transformedInterfaceAnchors: anchorSetouts,
  },
  centerlineCoordination: {
    publicShaft: {
      status: 'ANCHORS_FROZEN_CENTERLINE_BLOCKED',
      crossSection: '7x7',
      anchors: {
        top: zone('Z06').top,
        observationLanding: zone('Z06').observationLanding,
        lowerLobby: zone('Z06').lowerLobbyStudy,
      },
      blockerId: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
    },
    serviceTunnel: {
      status: 'THREE_ANCHOR_CONTROL_POLYLINE_ONLY',
      crossSection: service.crossSection,
      segments: serviceSegments,
      totalHorizontalEuclidean: Number(serviceSegments.reduce(
        (sum, entry) => sum + entry.horizontalEuclidean,
        0,
      ).toFixed(6)),
      sourceClaimedLengthBlocks: contractor04.inter_site_connections.service_tunnel.length_blocks,
      blockerId: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
    },
    funicular: {
      status: 'ENDPOINTS_FROZEN_CENTERLINE_HOLD',
      from: funicular.funicularStart,
      to: funicular.summit,
      direct: funicularDirect,
      totalRise: funicular.summit.y - funicular.funicularStart.y,
      minimumHorizontalRunAtAbsoluteMaximumRailGrade: 174,
      minimumAdditionalLevelRunForCurves: 'greater-than-zero-unresolved',
      faceSelection: null,
      intermediatePoints: [],
      candidateFamiliesForSurveyOnly: [
        'east-face-switchback',
        'west-face-switchback',
      ],
      blockerId: 'P1-B09-FUNICULAR-CENTERLINE',
    },
  },
  blockerMatrix: blockers,
  gates: {
    sourceHashesMatch: true,
    authorityChainMatch: true,
    topDownTransformExact: true,
    verticalRationalsExact: true,
    perScopeBoundSemanticsFrozen: true,
    operationCompilationAllowed: false,
    worldEditAuthorized: false,
    passed: true,
    interpretation: 'PASS means the coordination artifact is internally exact and fail-closed; it does not mean the build is construction-ready.',
  },
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, OUTPUT_PATH),
  blockers: blockers.length,
  operationCellCount: 0,
}, null, 2));

export {
  ceilRational,
  compileBoundaryVolume,
  floorRational,
  inclusiveVolume,
  mapLocalPoint,
  mappedY,
  roundPointRational,
};
