#!/usr/bin/env node
/**
 * Freeze the deterministic compiler/input contract for Combined Zones D05-S02.
 *
 * This is a readiness compiler, not a terrain generator. It binds only the
 * permitted upstream geometry, D05, D06, coordinate, and immutable-snapshot
 * evidence. Missing exact geometry or ownership produces a dependency matrix
 * and zero emitted future/construction cells.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-04T21:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.md',
));

const INPUTS = Object.freeze({
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  d05HydrologyBaseline:
    'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicConditionAccess:
    'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d06EgressGeometry:
    'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data) };
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(directory, name));
    bytes += data.length;
    digest.update(name);
    digest.update('\0');
    digest.update(data);
    digest.update('\0');
  }
  return {
    path: path.relative(ROOT, directory).split(path.sep).join('/'),
    sha256: digest.digest('hex'),
    regionFileCount: names.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D05-S02 input rejected: ${message}`);
}

const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);
const coordinates = readJson(INPUTS.coordinateRegistry);
const geometry = readJson(INPUTS.geometryCoordination);
const d05 = readJson(INPUTS.d05HydrologyBaseline);
const defaults = readJson(INPUTS.d05ConservativeDefaults);
const s01 = readJson(INPUTS.d05RelicConditionAccess);
const d06 = readJson(INPUTS.d06EgressGeometry);

const geometryRegistryBinding = geometry.sourceBindings?.find((item) => item.id === 'registry05');
const d06RegistryBinding = d06.sourceBindings?.find(
  (item) => item.path === INPUTS.coordinateRegistry,
);
const d06GeometryBinding = d06.sourceBindings?.find(
  (item) => item.path === INPUTS.geometryCoordination,
);

invariant(geometry.id === 'combined-zones-phase1-geometry-coordination',
  'unexpected geometry coordination');
invariant(geometryRegistryBinding?.sha256 === sources.coordinateRegistry.sha256,
  'geometry has a stale coordinate-registry binding');
invariant(d05.id === 'combined-zones-phase1-d05-hydrology-relic-buffer-design',
  'unexpected D05 baseline');
invariant(d05.d05Disposition?.status === 'HOLD', 'D05 baseline must remain HOLD');
invariant(d05.sourceBindings?.coordinateRegistry?.sha256 === sources.coordinateRegistry.sha256,
  'D05 baseline has a stale coordinate-registry binding');
invariant(d05.sourceBindings?.phase1GeometryCoordination?.sha256
  === sources.geometryCoordination.sha256,
  'D05 baseline has a stale geometry binding');
invariant(defaults.id === 'combined-zones-phase1-d05-conservative-defaults',
  'unexpected D05 defaults');
invariant(defaults.sourceBindings?.geometryCoordination?.sha256
  === sources.geometryCoordination.sha256,
  'D05 defaults have a stale geometry binding');
invariant(defaults.sourceBindings?.d05HydrologyRelicDesign?.sha256
  === sources.d05HydrologyBaseline.sha256,
  'D05 defaults have a stale D05 binding');
invariant(defaults.evidenceBoundary?.d05Resolved === false,
  'D05 defaults unexpectedly resolve D05');
invariant(s01.id === 'combined-zones-phase1-d05-relic-condition-access-survey',
  'unexpected D05-S01 survey');
invariant(s01.sourceBindings?.d05HydrologyRelicDesign?.sha256
  === sources.d05HydrologyBaseline.sha256,
  'D05-S01 has a stale D05 binding');
invariant(s01.sourceBindings?.d05ConservativeDefaults?.sha256
  === sources.d05ConservativeDefaults.sha256,
  'D05-S01 has a stale default binding');
invariant(s01.d05S01Disposition?.status === 'PASS_OFFLINE_SURVEY_EVIDENCE',
  'D05-S01 offline survey evidence is not complete');
invariant(d06.id === 'combined-zones-phase1-d06-egress-geometry-design',
  'unexpected D06 egress geometry');
invariant(d06RegistryBinding?.sha256 === sources.coordinateRegistry.sha256,
  'D06 has a stale coordinate-registry binding');
invariant(d06GeometryBinding?.sha256 === sources.geometryCoordination.sha256,
  'D06 has a stale geometry binding');
invariant(d06.authority?.worldEditAuthorized === false
  && d06.authority?.operationCellCount === 0,
  'D06 evidence is not fail-closed');

const snapshotPath = s01.sourceBindings?.immutablePhase0PostRegionSnapshot?.path;
invariant(snapshotPath, 'D05-S01 lacks an immutable snapshot path');
const immutableSnapshot = snapshotIdentity(path.resolve(snapshotPath));
for (const [label, expected] of [
  ['D05 baseline', d05.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D05-S01', s01.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D06', d06.immutableSnapshot],
]) {
  invariant(immutableSnapshot.sha256 === expected?.sha256, `${label} snapshot hash mismatch`);
  invariant(immutableSnapshot.regionFileCount === expected?.regionFileCount,
    `${label} snapshot file-count mismatch`);
  invariant(immutableSnapshot.bytes === expected?.bytes, `${label} snapshot byte-count mismatch`);
}

const z09 = coordinates.zones?.find((zone) => zone.id === 'Z09');
const mountainSet = geometry.compiledCoordinationGeometry?.normalized04EnvelopeCellSets
  ?.find((item) => item.id === 'continuous-mountain')?.exactCoordinationCellSet;
invariant(z09, 'coordinate registry lacks Z09');
invariant(mountainSet, 'geometry lacks the continuous-mountain coordination set');
invariant(mountainSet.purpose === 'ownership-and-fit-coordination-only-not-a-material-or-operation-set',
  'mountain planning box was promoted to material ownership');

const dependencyMatrix = [
  {
    id: 'DEP-SOURCE-CHAIN',
    classification: 'MACHINE_EVIDENCE',
    status: 'PASS',
    requirement: 'All permitted upstream files exist at the exact bound hashes.',
    evidence: Object.values(sources).map((item) => item.path),
  },
  {
    id: 'DEP-IMMUTABLE-SNAPSHOT',
    classification: 'MACHINE_EVIDENCE',
    status: 'PASS',
    requirement: 'D05, D05-S01, and D06 bind the same immutable copied snapshot.',
    evidence: [immutableSnapshot.path],
  },
  {
    id: 'DEP-D05-BASELINE',
    classification: 'MACHINE_EVIDENCE',
    status: d05.immutableThreeDimensionalCensus?.status
      === 'PASS_EXACT_CURRENT_FULL_HEIGHT_SURVEY_PRISM_BASELINE' ? 'PASS' : 'HOLD',
    requirement: 'Exact current water, lava, frozen, snow, and component identities exist.',
    evidence: [INPUTS.d05HydrologyBaseline],
  },
  {
    id: 'DEP-D05-S01-RELIC-SURVEY',
    classification: 'MACHINE_EVIDENCE',
    status: s01.d05S01Disposition?.status === 'PASS_OFFLINE_SURVEY_EVIDENCE'
      ? 'PASS' : 'HOLD',
    requirement: 'All three protected records have exact local condition/access evidence.',
    evidence: [INPUTS.d05RelicConditionAccess],
  },
  {
    id: 'DEP-D06-EGRESS-RESERVATIONS',
    classification: 'MACHINE_EVIDENCE',
    status: d06.egressDesigns?.length === 2
      && d06.independenceProof?.exactExternalContinuationSetsDisjoint === true
      ? 'PASS' : 'HOLD',
    requirement: 'Two disjoint D06 external continuation reservations exist as reference inputs.',
    evidence: [INPUTS.d06EgressGeometry],
  },
  {
    id: 'DEP-VERTICAL-ACTIVATION',
    classification: 'SOLE_AUTHORITY_ACCEPTANCE',
    status: geometry.coordinateContract?.vertical?.activeForBuild === true ? 'PASS' : 'HOLD',
    requirement: 'Activate one exact rational/rounding contract for every affected scope.',
    evidence: ['P1-B01-VERTICAL-AUTHORITY-ACTIVATION'],
  },
  {
    id: 'DEP-MOUNTAIN-SOLID-SURFACE',
    classification: 'DEPENDENT_OFFLINE_DESIGN',
    status: 'HOLD',
    requirement:
      'Provide a deterministic sparse proposed-state registry and total future surface/solid function for every directly modelled Z09 column.',
    evidence: ['P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS'],
  },
  {
    id: 'DEP-MOUNTAIN-ROUTE-GEOMETRY',
    classification: 'DEPENDENT_OFFLINE_DESIGN',
    status: 'HOLD',
    requirement:
      'Freeze exact J-curve, shaft dogleg, service tunnel, funicular, station, maintenance, and route swept volumes.',
    evidence: [
      'P1-B03-CHEYENNE-JCURVE',
      'P1-B07-PUBLIC-SHAFT-DOGLEG',
      'P1-B08-SERVICE-TUNNEL-CENTERLINE',
      'P1-B09-FUNICULAR-CENTERLINE',
    ],
  },
  {
    id: 'DEP-D06-MECHANISM-CELL-SETS',
    classification: 'DEPENDENT_OFFLINE_DESIGN',
    status: 'HOLD',
    requirement:
      'Freeze exact smoke, ventilation, lift, barrier, emergency, drainage, fire-service, and outlet cells; current D06 reservations are not mechanism sets.',
    evidence: d06.remainingHoldGates,
  },
  {
    id: 'DEP-RELIC-POLICY-ACCEPTANCE',
    classification: 'SOLE_AUTHORITY_ACCEPTANCE',
    status: defaults.soleAuthorityRecommendations?.adoptionState === 'ACCEPTED'
      ? 'PASS' : 'HOLD',
    requirement:
      'Accept the exact minimum planning exclusions and absent-east-site disposition without converting them into engineering buffers.',
    evidence: [INPUTS.d05ConservativeDefaults, INPUTS.d05RelicConditionAccess],
  },
  {
    id: 'DEP-OWNERSHIP-REGISTRY',
    classification: 'SOLE_AUTHORITY_ACCEPTANCE',
    status: 'HOLD',
    requirement:
      'Supply an accepted exact one-owner registry for every direct and physical influence cell.',
    evidence: ['CZ05-PROTECTED-RELIC-CONTROL', 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
      'CZ05-SCOPE-CONSTRUCTION-CONTROL'],
  },
  {
    id: 'DEP-INTERFACE-CONTRACTS',
    classification: 'SOLE_AUTHORITY_AND_DEPENDENT_DESIGN',
    status: 'HOLD',
    requirement:
      'Supply exact directional owner-to-owner seam, receiver, outlet, sealed-boundary, and exception contracts.',
    evidence: ['P1-B11-EXTERNAL-INTERFACES'],
  },
  {
    id: 'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA',
    classification: 'EXPERT_DESIGN_ACCEPTANCE',
    status: 'HOLD',
    requirement:
      'Accept exact influence kernels and component treatment for groundwater, infiltration, snowmelt, erosion, dewatering, retaining, sumps, and discharge.',
    evidence: [INPUTS.d05HydrologyBaseline],
  },
  {
    id: 'DEP-COMPILER-IMPLEMENTATION',
    classification: 'DEPENDENT_OFFLINE_IMPLEMENTATION',
    status: 'HOLD',
    requirement:
      'Implement this contract only after its geometry, ownership, interface, and expert input schemas pass.',
    evidence: ['D05-S02-COMPILER-CONTRACT-V1'],
  },
];

const dependencyById = Object.fromEntries(dependencyMatrix.map((item) => [item.id, item]));

const influenceRules = [
  {
    id: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    appliesTo: [
      'native-solid-retained',
      'excavation-direct',
      'fill-direct',
      'liner-and-retaining-direct',
      'surface-finish-direct',
    ],
    rule:
      'Direct cells come only from canonical before/future state differences and typed future-state records. Apply no radius, shell, or envelope expansion.',
    requiredInput: 'complete canonical proposed-state records for every direct cell',
  },
  {
    id: 'IR-STAGING-SWEPT-VOLUME',
    appliesTo: ['construction-staging-and-access'],
    rule:
      'Compile the explicit union of authored staging pads, access rasters, head/body clearance, temporary support, equipment sweep, and restoration cells; infer no corridor width.',
    requiredInput: 'exact per-package swept-volume records and one owner per cell',
  },
  {
    id: 'IR-CURRENT-FLUID-DIRECT-INTERSECTION',
    appliesTo: ['water-and-lava-direct-interaction'],
    rule:
      'Intersect the union of direct/staging cells with exact current water and lava cells, then include the full current six-connected component identity as diagnostic context without transferring ownership.',
    requiredInput: 'complete direct/staging union and bound D05 water/lava component manifests',
  },
  {
    id: 'IR-CURRENT-CRYOSPHERE-DIRECT-INTERSECTION',
    appliesTo: ['frozen-and-snow-direct-interaction'],
    rule:
      'Intersect the union of direct/staging cells with exact current frozen and snow cells. No melt, thermal, or flow behavior is inferred.',
    requiredInput: 'complete direct/staging union and bound D05 frozen/snow sets',
  },
  {
    id: 'IR-EXPERT-KERNEL-DEWATERING-SUMP',
    appliesTo: ['dewatering-and-sump-influence'],
    rule:
      'Minkowski-expand only the declared dewatering/sump seed cells by an accepted finite integer-offset kernel, then union every explicitly treated current fluid component. Do not clip at scope boundaries.',
    requiredInput:
      'hash-bound anisotropic integer-offset kernel, seeds, component treatment, owner, and boundary receiver contracts',
  },
  {
    id: 'IR-DIRECTED-DRAINAGE-DISCHARGE-GRAPH',
    appliesTo: ['drainage-and-discharge-influence'],
    rule:
      'Raster exact directed collection, sump, conduit, outlet, receiver, overflow, maintenance, and one-cell face-interaction records from an accepted graph. Every terminal requires an exact receiver contract.',
    requiredInput: 'directed node/edge graph, raster convention, terminals, receivers, and owners',
  },
  {
    id: 'IR-EXPERT-KERNEL-GROUNDWATER-EROSION',
    appliesTo: ['groundwater-infiltration-and-erosion-influence'],
    rule:
      'Expand accepted seeds with only an expert-authored finite integer-offset kernel by treatment class. Unknown, unbounded, wildcard, or narrative radii are invalid and block compilation.',
    requiredInput: 'per-class exact offset kernels, seeds, boundary behavior, and acceptance thresholds',
  },
  {
    id: 'IR-RELIC-SUPPORT-ACCESS-EXACT',
    appliesTo: ['protected-relic-support-and-access-influence'],
    rule:
      'Union accepted protected cores/planning exclusions with separately authored support, fall, entrance, exhibit, observation, and emergency-access influence cells. D05-S01 route candidates are never promoted automatically.',
    requiredInput:
      'accepted relic policy plus exact expert-reviewed support/access cells and owner/interface contracts',
  },
];

const familyDefinitions = [
  {
    id: 'native-solid-retained',
    group: 'DIRECT_STATE_CLASSIFICATION',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Current non-fluid present cells explicitly retained in the modelled future solid.',
    compilationRule: 'baseline-present AND future-present AND canonical state/treatment marks retained',
    influenceRuleId: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    dependencies: ['DEP-IMMUTABLE-SNAPSHOT', 'DEP-VERTICAL-ACTIVATION',
      'DEP-MOUNTAIN-SOLID-SURFACE', 'DEP-OWNERSHIP-REGISTRY'],
  },
  {
    id: 'excavation-direct',
    group: 'DIRECT_CHANGE',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Exact current present cells whose accepted future state removes or hollows material.',
    compilationRule: 'baseline-present AND future-passable/air AND typed change=EXCAVATION',
    influenceRuleId: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    dependencies: ['DEP-IMMUTABLE-SNAPSHOT', 'DEP-VERTICAL-ACTIVATION',
      'DEP-MOUNTAIN-SOLID-SURFACE', 'DEP-MOUNTAIN-ROUTE-GEOMETRY',
      'DEP-D06-MECHANISM-CELL-SETS', 'DEP-RELIC-POLICY-ACCEPTANCE',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS'],
  },
  {
    id: 'fill-direct',
    group: 'DIRECT_CHANGE',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Exact current passable/air/fluid cells whose accepted future state adds solid material.',
    compilationRule: 'baseline-passable/air/fluid AND future-present-solid AND typed change=FILL',
    influenceRuleId: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    dependencies: ['DEP-IMMUTABLE-SNAPSHOT', 'DEP-VERTICAL-ACTIVATION',
      'DEP-MOUNTAIN-SOLID-SURFACE', 'DEP-RELIC-POLICY-ACCEPTANCE',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS',
      'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'liner-and-retaining-direct',
    group: 'DIRECT_CHANGE',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Exact liner, wall, support, waterproofing, and retaining cells.',
    compilationRule: 'future typed role in LINER/RETAINING/SUPPORT with canonical full state',
    influenceRuleId: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    dependencies: ['DEP-VERTICAL-ACTIVATION', 'DEP-MOUNTAIN-SOLID-SURFACE',
      'DEP-MOUNTAIN-ROUTE-GEOMETRY', 'DEP-D06-MECHANISM-CELL-SETS',
      'DEP-RELIC-POLICY-ACCEPTANCE', 'DEP-OWNERSHIP-REGISTRY',
      'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'surface-finish-direct',
    group: 'DIRECT_CHANGE',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Exact exposed future terrain, landscape, road, path, portal, and finish cells.',
    compilationRule: 'future typed role=SURFACE_FINISH and exact exposed-face classification',
    influenceRuleId: 'IR-DIRECT-NO-IMPLICIT-EXPANSION',
    dependencies: ['DEP-VERTICAL-ACTIVATION', 'DEP-MOUNTAIN-SOLID-SURFACE',
      'DEP-MOUNTAIN-ROUTE-GEOMETRY', 'DEP-RELIC-POLICY-ACCEPTANCE',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS'],
  },
  {
    id: 'construction-staging-and-access',
    group: 'DIRECT_TEMPORARY_AND_ACCESS',
    ownerClass: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    purpose: 'Every temporary staging, access, equipment sweep, clearance, support, and restoration cell.',
    compilationRule: 'explicit package records only; no bounding-box or route-width inference',
    influenceRuleId: 'IR-STAGING-SWEPT-VOLUME',
    dependencies: ['DEP-MOUNTAIN-ROUTE-GEOMETRY', 'DEP-D06-MECHANISM-CELL-SETS',
      'DEP-RELIC-POLICY-ACCEPTANCE', 'DEP-OWNERSHIP-REGISTRY',
      'DEP-INTERFACE-CONTRACTS'],
  },
  {
    id: 'water-and-lava-direct-interaction',
    group: 'DERIVED_DIAGNOSTIC_INTERACTION',
    ownerClass: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    purpose: 'Exact current water/lava cells directly touched by direct or staging sets.',
    compilationRule: 'exact set intersection plus component-context reference; no ownership transfer',
    influenceRuleId: 'IR-CURRENT-FLUID-DIRECT-INTERSECTION',
    dependencies: ['DEP-D05-BASELINE', 'DEP-MOUNTAIN-SOLID-SURFACE',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS',
      'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'frozen-and-snow-direct-interaction',
    group: 'DERIVED_DIAGNOSTIC_INTERACTION',
    ownerClass: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    purpose: 'Exact current frozen/snow cells directly touched by direct or staging sets.',
    compilationRule: 'exact set intersection; no melt, flow, or thermal inference',
    influenceRuleId: 'IR-CURRENT-CRYOSPHERE-DIRECT-INTERSECTION',
    dependencies: ['DEP-D05-BASELINE', 'DEP-MOUNTAIN-SOLID-SURFACE',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'dewatering-and-sump-influence',
    group: 'PHYSICAL_INFLUENCE',
    ownerClass: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    purpose: 'Exact cells influenced by accepted dewatering and sump treatments.',
    compilationRule: 'seed/kernel expansion plus explicitly treated component closure',
    influenceRuleId: 'IR-EXPERT-KERNEL-DEWATERING-SUMP',
    dependencies: ['DEP-D05-BASELINE', 'DEP-D06-MECHANISM-CELL-SETS',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS',
      'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'drainage-and-discharge-influence',
    group: 'PHYSICAL_INFLUENCE',
    ownerClass: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    purpose: 'Exact collection, conduit, sump, outlet, receiver, overflow, and maintenance interaction cells.',
    compilationRule: 'accepted directed graph raster and exact receiver contracts',
    influenceRuleId: 'IR-DIRECTED-DRAINAGE-DISCHARGE-GRAPH',
    dependencies: ['DEP-D05-BASELINE', 'DEP-D06-MECHANISM-CELL-SETS',
      'DEP-OWNERSHIP-REGISTRY', 'DEP-INTERFACE-CONTRACTS',
      'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'groundwater-infiltration-and-erosion-influence',
    group: 'PHYSICAL_INFLUENCE',
    ownerClass: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    purpose: 'Exact expert-modelled subsurface and surface influence cells.',
    compilationRule: 'accepted treatment-class seeds expanded by exact finite offset kernels',
    influenceRuleId: 'IR-EXPERT-KERNEL-GROUNDWATER-EROSION',
    dependencies: ['DEP-MOUNTAIN-SOLID-SURFACE', 'DEP-OWNERSHIP-REGISTRY',
      'DEP-INTERFACE-CONTRACTS', 'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
  {
    id: 'protected-relic-support-and-access-influence',
    group: 'PHYSICAL_INFLUENCE',
    ownerClass: 'CZ05-PROTECTED-RELIC-CONTROL',
    purpose: 'Accepted protected cores/exclusions plus exact support, fall, entrance, exhibit, observation, and emergency-access influence cells.',
    compilationRule: 'accepted exclusion union explicit expert support/access cells; never promote S01 candidates',
    influenceRuleId: 'IR-RELIC-SUPPORT-ACCESS-EXACT',
    dependencies: ['DEP-D05-S01-RELIC-SURVEY', 'DEP-RELIC-POLICY-ACCEPTANCE',
      'DEP-MOUNTAIN-SOLID-SURFACE', 'DEP-OWNERSHIP-REGISTRY',
      'DEP-INTERFACE-CONTRACTS', 'DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'],
  },
];

const setFamilies = familyDefinitions.map((family) => {
  const missingDependencyIds = family.dependencies.filter(
    (dependencyId) => dependencyById[dependencyId]?.status !== 'PASS',
  );
  return {
    ...family,
    status: missingDependencyIds.length === 0 ? 'READY_TO_COMPILE' : 'HOLD_DEPENDENCIES',
    missingDependencyIds,
    compiledSet: {
      emitted: false,
      cellCount: 0,
      coordinateSetSha256: null,
      blockStateSetSha256: null,
      ownerManifestSha256: null,
      reason: 'No exact future/construction set is emitted while any required dependency is HOLD.',
    },
  };
});

const requiredFamilyIds = defaults.soleAuthorityRecommendations
  ?.futureTerrainAndInfluenceModel?.requiredExactSetFamilies ?? [];
invariant(JSON.stringify(setFamilies.map((family) => family.id))
  === JSON.stringify(requiredFamilyIds),
  'compiler contract does not cover every required D05 family in canonical order');
invariant(setFamilies.every((family) => family.compiledSet.cellCount === 0),
  'a future-state family unexpectedly emitted cells');

const d06ReservationEvidence = d06.egressDesigns.map((design) => ({
  id: design.id,
  status: 'REFERENCE_RESERVATION_NOT_CONSTRUCTION_OR_HYDROLOGY_OWNERSHIP',
  externalContinuation: {
    bounds: design.externalContinuationDesign.bounds,
    cellCount: design.externalContinuationDesign.cellCount,
    coordinateSetSha256: design.externalContinuationDesign.coordinateSetSha256,
  },
  stairReservation: design.externalContinuationDesign.stairReservation,
  accessibleLiftReservation: design.externalContinuationDesign.accessibleLiftReservation,
  sourceWaterCellCount: design.immutableSourceCensus.waterCellCount,
  sourceLavaCellCount: design.immutableSourceCensus.lavaCellCount,
  physicalOpeningAuthorized: design.designGate.physicalOpeningAuthorized,
  mechanismCommissioned: design.designGate.mechanismCommissioned,
}));

const readinessChecks = [
  {
    id: 'S02-R01-PERMITTED-SOURCES-BOUND',
    status: 'PASS',
    detail: 'Only coordinates, geometry, D05 baseline/defaults/S01, D06 egress, and the immutable snapshot are bound.',
  },
  {
    id: 'S02-R02-FAMILY-CONTRACT-COMPLETE',
    status: setFamilies.length === 12 ? 'PASS' : 'HOLD',
    detail: `${setFamilies.length}/12 exact set-family contracts are declared in required order.`,
  },
  {
    id: 'S02-R03-INFLUENCE-RULES-FAIL-CLOSED',
    status: influenceRules.every((rule) => !/default radius|wildcard radius/i.test(rule.rule))
      ? 'PASS' : 'HOLD',
    detail: 'No influence family may infer a generic radius, wildcard, boundary clip, or empty unknown set.',
  },
  {
    id: 'S02-R04-GEOMETRY-INPUTS-COMPLETE',
    status: dependencyById['DEP-VERTICAL-ACTIVATION'].status === 'PASS'
      && dependencyById['DEP-MOUNTAIN-SOLID-SURFACE'].status === 'PASS'
      && dependencyById['DEP-MOUNTAIN-ROUTE-GEOMETRY'].status === 'PASS'
      ? 'PASS' : 'HOLD',
    detail: 'Vertical activation, future mountain state, and exact mountain route geometry are incomplete.',
  },
  {
    id: 'S02-R05-OWNERSHIP-INTERFACES-COMPLETE',
    status: dependencyById['DEP-OWNERSHIP-REGISTRY'].status === 'PASS'
      && dependencyById['DEP-INTERFACE-CONTRACTS'].status === 'PASS'
      ? 'PASS' : 'HOLD',
    detail: 'Exact one-owner assignments and directional interface contracts do not exist.',
  },
  {
    id: 'S02-R06-HYDROLOGY-EXPERT-INPUTS-COMPLETE',
    status: dependencyById['DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA'].status,
    detail: 'Exact expert kernels, component treatment, receivers, and acceptance thresholds are missing.',
  },
  {
    id: 'S02-R07-ALL-FAMILIES-READY',
    status: setFamilies.every((family) => family.status === 'READY_TO_COMPILE')
      ? 'PASS' : 'HOLD',
    detail: `${setFamilies.filter((family) => family.status === 'READY_TO_COMPILE').length}/${setFamilies.length} families are ready.`,
  },
  {
    id: 'S02-R08-ZERO-CELL-FAIL-CLOSED',
    status: setFamilies.every((family) => family.compiledSet.emitted === false
      && family.compiledSet.cellCount === 0
      && family.compiledSet.coordinateSetSha256 === null) ? 'PASS' : 'HOLD',
    detail: 'No future, direct-construction, staging, access, interaction, or influence cell set was emitted.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-future-state-compiler-contract',
  generatedAtUtc: GENERATED_AT,
  status: 'CONTRACT_PASS_INPUT_READINESS_HOLD_ZERO_FUTURE_CELLS',
  worldEditAuthorized: false,
  constructionOwnershipAuthorized: false,
  futureStateAuthorized: false,
  operationCellCount: 0,
  materialCellCount: 0,
  futureCellCount: 0,
  constructionCellCount: 0,
  sourceBindings: {
    ...sources,
    immutablePhase0PostRegionSnapshot: immutableSnapshot,
  },
  authorityBoundary: {
    permittedInputs:
      'coordinates, upstream geometry, D05 baseline/defaults/S01, D06 egress geometry, immutable copied region snapshot',
    excludedInputs: [
      'autonomous design selections',
      'R00 readiness or gate advancement',
      'operations, manifests, preflight, live entities, execution, rollback, or post-state evidence',
    ],
    planningEnvelopeIsMaterial: false,
    missingInputRule:
      'Emit a dependency HOLD and null set hashes; never infer an empty accepted set, mountain, route, owner, interface, kernel, outlet, or construction cell.',
  },
  planningScope: {
    coordinateRegistryZ09: {
      bounds: z09.bounds,
      status: z09.status,
      relicRule: z09.relicRule,
    },
    compiledCoordinationEnvelope: mountainSet,
    interpretation:
      'These bounds validate and limit future inputs. They own no block and cannot be filled to fabricate a mountain.',
  },
  deterministicCompilerContract: {
    contractId: 'D05-S02-COMPILER-CONTRACT-V1',
    coordinateOrder: 'numeric x, then y, then z',
    canonicalBlockState:
      'JSON object with Name first and Properties keys lexicographically sorted; complete properties required',
    coordinateSetHash: {
      algorithm: 'SHA-256',
      preamble: 'combined-zones-coordinate-cell-set-v1\\n',
      record: 'x,y,z\\n',
    },
    blockStateSetHash: {
      algorithm: 'SHA-256',
      preamble: 'combined-zones-block-state-cell-set-v1\\n',
      record: 'x,y,z<TAB>canonical-state-json\\n',
    },
    typedFamilyHash: {
      algorithm: 'SHA-256',
      preamble: 'combined-zones-d05-typed-family-v1\\n',
      record: 'family-id<TAB>x,y,z<TAB>canonical-state-json<TAB>owner-id<TAB>role-id\\n',
    },
    futureModelManifestHash: {
      algorithm: 'SHA-256',
      preamble: 'combined-zones-d05-future-model-manifest-v1\\n',
      orderedInputs: [
        'contract identity',
        'all source bindings',
        'snapshot identity',
        'coordinate/rounding contract',
        'owner registry hash',
        'interface-contract manifest hash',
        'influence-kernel manifest hash',
        'all twelve typed-family hashes in canonical order',
      ],
    },
    compilationOrder: [
      'validate sources and immutable snapshot identity',
      'validate activated exact coordinate/rounding contract',
      'validate proposed-state registry and total directly-modelled column functions',
      'derive mutually exclusive direct state families',
      'compile explicit staging/access swept volumes',
      'derive exact current hydrology/cryosphere intersections',
      'apply accepted finite influence kernels and directed drainage graph',
      'apply relic support/access exclusions without promoting S01 candidates',
      'validate one-owner assignments and exact directional interfaces',
      'run no-unreviewed-overlap, component accounting, boundary receiver, and family completeness gates',
      'emit hashes only when every required input and readiness check passes',
    ],
    overlapAndOwnershipRules: [
      'Direct material/change families are mutually exclusive per exact cell.',
      'A derived diagnostic interaction family may reference a direct cell but never transfers its canonical physical owner.',
      'Every physical direct or influence cell has exactly one owner; zero-owner and multi-owner cells fail.',
      'Every accepted owner-to-owner adjacency or transition is matched one-to-one by an exact directional interface contract.',
      'No wildcard, range-only seam, envelope ownership, last-writer-wins, or silent clipping is accepted.',
    ],
  },
  requiredInputSchemas: {
    proposedStateRegistry: {
      requiredFields: [
        'modelId', 'modelVersion', 'sourceSnapshotSha256', 'coordinateContractSha256',
        'scopeId', 'records', 'directlyModelledColumns',
      ],
      recordFields: [
        'x', 'y', 'z', 'expectedCurrentCanonicalState', 'futureCanonicalState',
        'familyId', 'roleId', 'ownerId', 'sourceDesignId',
      ],
      rules: [
        'records are unique by coordinate and sorted x/y/z',
        'every current state matches the immutable snapshot exactly',
        'every changed record belongs to exactly one direct family',
        'every directly modelled X/Z column has a deterministic future surface/solid function',
        'unmodelled cells are unchanged, not implicitly air or fill',
      ],
    },
    ownershipRegistry: {
      requiredOwnerIds: defaults.soleAuthorityRecommendations
        .logicalOwnershipAndInterfaces.owners.map((owner) => owner.ownerId),
      requiredFields: ['registryId', 'acceptedBy', 'acceptedAtUtc', 'cellAssignments',
        'cellAssignmentManifestSha256'],
      rules: [
        'exact coordinate assignments only',
        'one canonical owner per physical direct or influence cell',
        'coordination envelopes and diagnostic set membership never assign ownership',
        'owner acceptance is external input; this compiler cannot self-accept',
      ],
    },
    interfaceContracts: {
      requiredFields: [
        'contractId', 'fromOwnerId', 'toOwnerId', 'direction', 'interfaceCellSetSha256',
        'transitionPairManifestSha256', 'beforeStateSetSha256', 'futureStateSetSha256',
        'receiverId', 'acceptedBy',
      ],
      rules: [
        'each observed cross-owner adjacency/transition matches exactly one contract',
        'direction and receiver are mandatory for fluid, discharge, access, and sealed boundaries',
        'wildcards, bounding-box-only approval, broad overlaps, and last-writer-wins are invalid',
      ],
    },
    influenceKernelRegistry: {
      requiredFields: [
        'kernelId', 'treatmentClass', 'integerOffsets', 'offsetSetSha256',
        'seedSetSha256', 'boundaryRule', 'componentClosureRule', 'acceptedBy',
      ],
      rules: [
        'finite explicit integer offsets only',
        'no inferred radius, wildcard, unbounded propagation, or boundary clipping',
        'unknown influence is a HOLD and never an accepted empty set',
      ],
    },
  },
  influenceExpansionRules: influenceRules,
  dependencyMatrix,
  setFamilies,
  d06ReferenceReservations: d06ReservationEvidence,
  readinessChecks,
  readinessDisposition: {
    contractSchemaPassed: readinessChecks.slice(0, 3).every((check) => check.status === 'PASS'),
    inputsReady: false,
    readyToCompileFutureState: false,
    readyToEmitConstructionCells: false,
    readyToResolveD05: false,
    passedDependencyCount: dependencyMatrix.filter((item) => item.status === 'PASS').length,
    holdDependencyCount: dependencyMatrix.filter((item) => item.status === 'HOLD').length,
    readyFamilyCount: setFamilies.filter((item) => item.status === 'READY_TO_COMPILE').length,
    holdFamilyCount: setFamilies.filter((item) => item.status === 'HOLD_DEPENDENCIES').length,
    d05Resolved: false,
    g02Passed: false,
    g03Passed: false,
    g04Passed: false,
    g05Passed: false,
    g06Passed: false,
    g07Passed: false,
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
    worldEditAuthorized: false,
  },
};

function markdownFor(current) {
  const dependencyRows = current.dependencyMatrix.map((dependency) => (
    `| ${dependency.id} | ${dependency.classification} | **${dependency.status}** | ${dependency.requirement} |`
  )).join('\n');
  const familyRows = current.setFamilies.map((family) => (
    `| ${family.id} | ${family.group} | ${family.ownerClass} | **${family.status}** | ${family.missingDependencyIds.join(', ') || '—'} | 0 |`
  )).join('\n');
  const influenceRows = current.influenceExpansionRules.map((rule) => (
    `| ${rule.id} | ${rule.appliesTo.join(', ')} | ${rule.rule} |`
  )).join('\n');
  const readinessRows = current.readinessChecks.map((check) => (
    `| ${check.id} | **${check.status}** | ${check.detail} |`
  )).join('\n');
  return `# D05-S02 future-state compiler contract and readiness

Status: **CONTRACT PASS — INPUT READINESS HOLD — ZERO FUTURE/CONSTRUCTION CELLS**

This artifact freezes how an exact future mountain model must be compiled after its upstream inputs exist. It does not invent terrain from the Z09 planning envelope, adopt autonomous selections, consume R00 state, accept its own owners/interfaces, or emit any future, construction, material, influence, or operation cell.

Bound immutable snapshot: \`${current.sourceBindings.immutablePhase0PostRegionSnapshot.sha256}\`.

## Dependency matrix

| Dependency | Classification | Status | Requirement |
|---|---|---|---|
${dependencyRows}

## Required exact set families

| Family | Group | Required control owner | Status | Missing dependencies | Emitted cells |
|---|---|---|---|---|---:|
${familyRows}

All twelve families are contractually defined. None is represented as an accepted empty set: every emitted flag is false and every coordinate/state/owner hash is null while dependencies are incomplete.

## Deterministic future-state rules

- Canonical coordinate order is numeric X, then Y, then Z.
- Every exact current state must match the immutable snapshot; future states require complete canonical properties.
- Direct families derive from explicit before/future differences and are mutually exclusive.
- Unmodelled cells remain unchanged; a rectangular planning envelope is never material.
- Every physical direct/influence cell has one owner. Diagnostic intersections do not transfer ownership.
- Every cross-owner seam, receiver, outlet, access boundary, or exception has one exact directional interface contract.
- Unknown influence blocks compilation; it never becomes a zero-cell assertion.

## Influence expansion rules

| Rule | Applies to | Deterministic treatment |
|---|---|---|
${influenceRows}

The D05-S01 observation routes remain candidates and are explicitly barred from automatic promotion into access or influence cells.

## D06 reference boundary

The two D06 external continuation reservations remain exact reference inputs only: ${current.d06ReferenceReservations.map((item) => `${item.id} ${item.externalContinuation.cellCount} cells`).join('; ')}. They are disjoint and dry in the bound snapshot, but no physical opening or mechanism is commissioned and no D05 ownership is assigned.

## Readiness

| Check | Status | Result |
|---|---|---|
${readinessRows}

The contract schema passes, but geometry, D06 mechanisms, owner assignments, interfaces, expert kernels, component treatment, and compiler implementation remain HOLD. Therefore D05 and G02-G07 remain HOLD.

- Future cells: **0**
- Construction cells: **0**
- Material cells: **0**
- Operation cells: **0**
- World edit authorized: **no**

Reproduce with:

\`\`\`bash
node scripts/compile_combined_zones_d05_future_state_contract.mjs
\`\`\`
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdownFor(report));

console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  dependencies: {
    pass: report.readinessDisposition.passedDependencyCount,
    hold: report.readinessDisposition.holdDependencyCount,
  },
  families: {
    ready: report.readinessDisposition.readyFamilyCount,
    hold: report.readinessDisposition.holdFamilyCount,
  },
  futureCellCount: 0,
  constructionCellCount: 0,
  operationCellCount: 0,
  worldEditAuthorized: false,
}, null, 2));
