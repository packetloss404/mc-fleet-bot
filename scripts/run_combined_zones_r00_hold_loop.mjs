#!/usr/bin/env node
/**
 * Evaluate the five remaining Combined Zones R00 gates as a bounded,
 * dependency-aware loop.
 *
 * This runner is deliberately read-only apart from its JSON/Markdown report.
 * It validates immutable evidence and exact offline checks, skips downstream
 * audits whose prerequisites are not satisfied, and stops at a fixed point.
 * It cannot accept expert/owner/interface evidence or authorize world edits.
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

function invariant(condition, message) {
  if (!condition) throw new Error(`Combined Zones R00 hold loop rejected: ${message}`);
}

const GENERATED_AT = value('--generated-at', '2026-08-06T21:50:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-r00-hold-loop-report.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-r00-hold-loop-report.md',
));
const MAX_ITERATIONS = Number.parseInt(value('--max-iterations', '5'), 10);
const REQUIRE_PASS = argv.includes('--require-pass');

invariant(
  Number.isInteger(MAX_ITERATIONS) && MAX_ITERATIONS >= 2 && MAX_ITERATIONS <= 20,
  '--max-iterations must be an integer from 2 through 20',
);

const INPUTS = Object.freeze({
  r00Readiness:
    'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
  proposedOwnershipInterfaces:
    'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  shipwreckCanonicalIntegration:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  d06BeeRuntimeCompatibility:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
  technicalSourceRefresh:
    'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
  g05GlobalGeometry:
    'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
  acceptedCompleteSave:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  externalAcceptance:
    'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
});

const TARGET_GATE_IDS = Object.freeze([
  'G02_DESIGN_DECISIONS',
  'G04_OWNERSHIP',
  'G05_INTERFACES',
  'G06_PROTECTED_FEATURES',
  'G07_CIVIL_HYDROLOGY_STRUCTURE',
]);

const METHOD_REGISTRY = Object.freeze([
  {
    gateId: 'G02_DESIGN_DECISIONS',
    methodId: 'HASH_BOUND_TECHNICAL_ACCEPTANCE_MATRIX',
    improvement: 'Reuse the accepted immutable complete-save identity, the five-row additive source refresh, and exact compiled geometry; require positive, identity-bound technical decisions only for the remaining engineering margins.',
    deterministicChecks: [
      'complete save intake and source equivalence remain valid',
      'zero unresolved geometry blockers remain',
      'shipwreck reshape remains integrated into one canonical composite',
      'D06 runtime evidence remains explicit about the unproven client mechanic',
    ],
    externalBoundary: 'Civil, hydrology, geotechnical, structural, life-safety, protected-feature, and final technical acceptance cannot be self-issued by this runner.',
  },
  {
    gateId: 'G04_OWNERSHIP',
    methodId: 'EXACT_UNION_ONE_OWNER_THEN_IDENTITY_ACCEPTANCE',
    improvement: 'Keep the exact unowned/multiply-owned proof separate from acceptance, and bind acceptance once to the complete immutable registry identity instead of reviewing cells repeatedly.',
    deterministicChecks: [
      'composite physical union equals canonical owner union',
      'zero unowned cells',
      'zero multiply-owned cells',
      'owner acceptance count and registry identity are explicit',
    ],
    externalBoundary: 'The runner verifies the proposed partition but cannot record final owner acceptance.',
  },
  {
    gateId: 'G05_INTERFACES',
    methodId: 'NULL_ENDPOINT_WORKLIST_THEN_GLOBAL_DEFAULT_DENY_AUDIT',
    improvement: 'Separate the global interface gate into Layer A physical geometry and Layer B technical/state acceptance. Reuse the completed 84-contract Layer A audit; treat the 13 undefined endpoints, 52 missing pair manifests, 161 missing before/future states, and 161 unaccepted contracts as exact Layer B worklists.',
    deterministicChecks: [
      '84 physical directional contracts and 352,931 pairs match one-to-one',
      'zero undeclared, stale, or drifted physical seams',
      'exact technical contract, pair-manifest, state, and acceptance census',
      'null endpoint contract IDs are unique and explicit',
      'wildcards and last-writer-wins remain prohibited',
    ],
    externalBoundary: 'Layer A cannot imply Layer B. A geometry scan cannot invent drainage receivers, utilities, power sources, maintenance access, designed future states, or their accountable owners.',
  },
  {
    gateId: 'G06_PROTECTED_FEATURES',
    methodId: 'GEOMETRY_PROOF_PLUS_STAGED_RUNTIME_MECHANIC_PROOF',
    improvement: 'Keep exact protected-feature geometry separate from the bee mechanic: bind the production Paper binary, prove item serialization, assert server-authoritative post-teleport player position/range, then require a real-client break/transport/place/NBT test before any live consolidation.',
    deterministicChecks: [
      'all generated-start overlaps remain zero',
      'all protected-core overlaps remain zero',
      'the production Paper binary and item-component serialization are bound',
      'client incompatibility is a HOLD and never coerced into a pass',
    ],
    externalBoundary: 'The next valid mechanic proof needs a version-matched vanilla client or an independently repaired protocol path; fresh live consolidation and destination acceptance follow later.',
  },
  {
    gateId: 'G07_CIVIL_HYDROLOGY_STRUCTURE',
    methodId: 'DEPENDENCY_GATED_INTEGRATED_DESIGN_AUDIT',
    improvement: 'Run the integrated design audit once after G02, G04, G05, and G06 are accepted, rather than rerunning it against known incomplete inputs.',
    deterministicChecks: [
      'all upstream gate prerequisites are explicit',
      'integrated audit is skipped while an upstream gate is HOLD',
      'accepted inputs must remain bound to one captured-world and composite identity',
    ],
    externalBoundary: 'The integrated audit validates accepted inputs; it cannot create the missing engineering decisions or acceptances.',
  },
]);

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
  };
}

function stableDigest(valueToHash) {
  return sha256(JSON.stringify(valueToHash));
}

function findGate(r00, gateId) {
  const gate = r00.gates.find(({ id }) => id === gateId);
  invariant(gate, `R00 readiness audit is missing ${gateId}`);
  return gate;
}

function validateR00SourceBindings(r00) {
  const failures = [];
  const entries = Object.values(r00.sourceBindings ?? {});
  for (const source of entries) {
    const filename = absolute(source.path);
    if (!fs.existsSync(filename)) {
      failures.push({ path: source.path, reason: 'MISSING' });
      continue;
    }
    const data = fs.readFileSync(filename);
    if (data.length !== source.bytes || sha256(data) !== source.sha256) {
      failures.push({ path: source.path, reason: 'HASH_OR_SIZE_DRIFT' });
    }
  }
  return {
    checkedBindingCount: entries.length,
    failureCount: failures.length,
    failures,
    passed: entries.length > 0 && failures.length === 0,
  };
}

function loadState() {
  const r00 = readJson(INPUTS.r00Readiness);
  const registry = readJson(INPUTS.proposedOwnershipInterfaces);
  const composite = readJson(INPUTS.shipwreckCanonicalIntegration);
  const runtime = readJson(INPUTS.d06BeeRuntimeCompatibility);
  const technicalSourceRefresh = readJson(INPUTS.technicalSourceRefresh);
  const g05GlobalGeometry = readJson(INPUTS.g05GlobalGeometry);
  const completeSave = readJson(INPUTS.acceptedCompleteSave);
  const externalAcceptance = readJson(INPUTS.externalAcceptance);

  invariant(r00.schemaVersion === 1, 'unsupported R00 audit schema');
  invariant(registry.schemaVersion === 3, 'unsupported ownership/interface schema');
  invariant(
    composite.disposition?.canonicalD05G03G04G05G06GeometryIntegrationComplete === true,
    'canonical shipwreck integration is not complete',
  );
  invariant(
    runtime.conclusion?.blindFleetDependencyUpgradeRecommended === false,
    'runtime audit no longer rejects a blind fleet dependency upgrade',
  );
  invariant(
    technicalSourceRefresh.summary?.staleSourceRowPassCount === 5
      && technicalSourceRefresh.summary?.technicalAcceptanceClaimed === false,
    'technical source refresh is invalid or overclaims acceptance',
  );
  invariant(
    g05GlobalGeometry.layerA?.passed === true
      && (g05GlobalGeometry.layerB?.g05Passed === false
        || (g05GlobalGeometry.layerB?.g05Passed === true
          && g05GlobalGeometry.layerB?.status
            === 'PASS_CLOSED_BY_ADDITIVE_CLOSURE_RECORD_REGISTRY_UNMODIFIED'
          && g05GlobalGeometry.layerB?.closureRecord !== null)),
    'G05 Layer-A/Layer-B boundary is invalid',
  );
  invariant(
    completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    'accepted complete-save evidence is not a complete immutable same-moment save',
  );

  const sourceIntegrity = validateR00SourceBindings(r00);
  invariant(sourceIntegrity.passed, 'one or more R00 source bindings drifted');

  const missingEndpoints = registry.proposedDirectionalInterfaceRegistry.contracts
    .filter(({ status }) => status === 'HOLD_INTERFACE_GEOMETRY_MISSING_DEFAULT_DENY')
    .map((contract) => ({
      contractId: contract.contractId,
      scope: contract.scope,
      direction: contract.direction,
      fromOwnerId: contract.fromOwnerId,
      toOwnerId: contract.toOwnerId,
      receiverId: contract.receiverId,
      relationship: contract.relationship,
      requiredClosure: [
        'named accountable counterpart owner or receiver',
        'exact interface cell set',
        'exact before and future states',
        'exact directional transition-pair manifest',
        'identity-bound technical and interface acceptance',
      ],
    }));

  invariant(missingEndpoints.length === 13, 'expected exactly 13 missing external endpoints');
  invariant(
    new Set(missingEndpoints.map(({ contractId }) => contractId)).size === 13,
    'missing external endpoint contract IDs are not unique',
  );

  return {
    r00,
    registry,
    composite,
    runtime,
    technicalSourceRefresh,
    g05GlobalGeometry,
    completeSave,
    externalAcceptance,
    sourceIntegrity,
    missingEndpoints,
  };
}

function check(id, passed, result) {
  return { id, passed, result };
}

function evaluateGate(state, gateId) {
  const {
    r00,
    registry,
    composite,
    runtime,
    technicalSourceRefresh,
    g05GlobalGeometry,
    completeSave,
    externalAcceptance,
    missingEndpoints,
  } = state;
  const gate = findGate(r00, gateId);
  const blockerIds = gate.blockers.map(({ id }) => id);

  if (gateId === 'G02_DESIGN_DECISIONS') {
    const checks = [
      check(
        'G02-COMPLETE-SAVE',
        r00.summary.completeSaveIntakePassed === true
          && completeSave.summary?.passed === true,
        `complete save ${r00.summary.completeSaveSha256}`,
      ),
      check(
        'G02-GEOMETRY-CLOSURE',
        r00.summary.remainingGeometryBlockerCount === 0,
        `${r00.summary.remainingGeometryBlockerCount} unresolved geometry blockers`,
      ),
      check(
        'G02-CANONICAL-COMPOSITE',
        r00.summary.shipwreckCanonicalIntegrationValid === true
          && composite.disposition.canonicalD05G03G04G05G06GeometryIntegrationComplete === true,
        composite.compositeCanonicalModel.compositeCanonicalPayloadSha256,
      ),
      check(
        'G02-TECHNICAL-SOURCE-REFRESH',
        r00.summary.technicalSourceRefreshValid === true
          && technicalSourceRefresh.summary.staleSourceRowPassCount === 5
          && technicalSourceRefresh.summary.technicalAcceptanceClaimed === false,
        `5 stale source rows closed; effective D02 ${r00.summary.d02EffectiveTechnicalPassCount} PASS/${r00.summary.d02EffectiveTechnicalHoldCount} HOLD`,
      ),
      check(
        'G02-RUNTIME-HONESTY',
        r00.summary.d06BeeRuntimeCompatibilityValid === true
          && runtime.conclusion.isolatedRuntimeMechanicProven === false
          && runtime.conclusion.currentProductionCaptureTransportEligible === false,
        'Paper serialization observed; client mechanic remains unproven',
      ),
    ];
    return {
      gateId,
      status: gate.status,
      evidenceLayerStatus: checks.every(({ passed }) => passed) ? 'PASS_DETERMINISTIC_BASE' : 'FAIL_DETERMINISTIC_BASE',
      checks,
      blockerIds,
      rerunDecision: gate.status === 'PASS'
        ? 'GATE_COMPLETE'
        : 'WAITING_EXTERNAL_TECHNICAL_ACCEPTANCE',
      action: gate.status === 'PASS'
        ? 'NO_ACTION'
        : 'REUSE_EXACT_BASE_AND_INGEST_ONLY_NEW_HASH_BOUND_ACCEPTANCE',
    };
  }

  if (gateId === 'G04_OWNERSHIP') {
    const ownership = composite.g04OwnershipIntegration;
    const proposedOwners = registry.proposedOwnerRegistry;
    const checks = [
      check(
        'G04-EXACT-UNION',
        ownership.compositeObservedPhysicalUnionCellCount
          === ownership.compositeCanonicalOwnerUnionCellCount,
        `${ownership.compositeCanonicalOwnerUnionCellCount} composite physical cells`,
      ),
      check(
        'G04-ZERO-UNOWNED',
        ownership.compositeUnownedCellCount === 0,
        `${ownership.compositeUnownedCellCount} unowned cells`,
      ),
      check(
        'G04-ZERO-MULTIPLY-OWNED',
        ownership.compositeMultiplyOwnedCellCount === 0,
        `${ownership.compositeMultiplyOwnedCellCount} multiply-owned cells`,
      ),
      check(
        'G04-ACCEPTANCE-STATE-EXPLICIT',
        proposedOwners.proposedOwnerRecordCount === 27
          && proposedOwners.acceptedOwnerRecordCount >= 0
          && proposedOwners.acceptedOwnerRecordCount
            <= proposedOwners.proposedOwnerRecordCount
          && (gate.status !== 'PASS'
            || proposedOwners.acceptedOwnerRecordCount
              === proposedOwners.proposedOwnerRecordCount
            || externalAcceptance.submissions?.some((submission) => submission.id
                === 'EXT-04-INTEGRATED-OWNER-RECORD'
              && submission.ownerAcceptance?.decision
                === 'ACCEPT_ALL_PROPOSED_OWNER_RECORDS_AS_SOLE_OWNER_STEWARDSHIPS'
              && submission.bindings?.ownershipRegistryPayloadSha256
                === registry.canonicalPayloadSha256)),
        `${proposedOwners.acceptedOwnerRecordCount}/${proposedOwners.proposedOwnerRecordCount} inline owner records accepted; sole-owner EXT-04 additive acceptance ${externalAcceptance.submissions?.some((submission) => submission.id === 'EXT-04-INTEGRATED-OWNER-RECORD') ? 'recorded' : 'absent'}`,
      ),
    ];
    return {
      gateId,
      status: gate.status,
      evidenceLayerStatus: checks.every(({ passed }) => passed) ? 'PASS_OFFLINE_ONE_OWNER' : 'FAIL_OFFLINE_ONE_OWNER',
      checks,
      blockerIds,
      rerunDecision: gate.status === 'PASS'
        ? 'GATE_COMPLETE'
        : 'WAITING_IDENTITY_BOUND_OWNER_ACCEPTANCE',
      action: gate.status === 'PASS'
        ? 'NO_ACTION'
        : 'DO_NOT_RECOMPUTE_GEOMETRY; RECORD_ACCEPTANCE_ONLY_AFTER_TECHNICAL_NULLS_CLOSE',
    };
  }

  if (gateId === 'G05_INTERFACES') {
    const interfaces = registry.proposedDirectionalInterfaceRegistry;
    const layerA = g05GlobalGeometry.layerA;
    const layerB = g05GlobalGeometry.layerB;
    const checks = [
      check(
        'G05-CONTRACT-CENSUS',
        interfaces.contractCount === 161
          && interfaces.exactInterfaceCellSetCount === 148
          && interfaces.nullInterfaceCellSetCount === 13,
        `${interfaces.exactInterfaceCellSetCount} exact + ${interfaces.nullInterfaceCellSetCount} null = ${interfaces.contractCount} contracts`,
      ),
      check(
        'G05-LAYER-A-GLOBAL-PHYSICAL-GEOMETRY',
        r00.summary.g05GlobalGeometryValid === true
          && layerA.passed === true
          && layerA.exactDirectionalAdjacencyContractCount === 84
          && layerA.exactDirectionalAdjacencyPairCount === 352931
          && layerA.oneToOneCoverage.undeclaredObservedContractCount === 0
          && layerA.oneToOneCoverage.staleCommittedContractCount === 0
          && layerA.oneToOneCoverage.driftedContractCount === 0,
        `${layerA.exactDirectionalAdjacencyContractCount} contracts / ${layerA.exactDirectionalAdjacencyPairCount} pairs / zero seam drift`,
      ),
      check(
        'G05-NULL-WORKLIST',
        missingEndpoints.length === interfaces.nullInterfaceCellSetCount,
        `${missingEndpoints.length} unique undefined endpoint contracts`,
      ),
      check(
        'G05-LAYER-B-PAIR-STATE-ACCEPTANCE-CENSUS',
        layerB.technicalContractCount === 77
          && layerB.missingTransitionPairManifestCount === 52
          && layerB.beforeStateSetCount === 0
          && layerB.futureStateSetCount === 0
          && layerB.acceptedContractCount === 0,
        `${layerB.technicalContractCount} technical; ${layerB.missingTransitionPairManifestCount} missing pairs; ${layerB.beforeStateSetCount}/${layerB.totalContractCount} before; ${layerB.futureStateSetCount}/${layerB.totalContractCount} future; ${layerB.acceptedContractCount}/${layerB.totalContractCount} accepted`,
      ),
      check(
        'G05-DEFAULT-DENY',
        interfaces.wildcardContractCount === 0
          && interfaces.lastWriterWinsContractCount === 0,
        `${interfaces.wildcardContractCount} wildcards; ${interfaces.lastWriterWinsContractCount} last-writer-wins contracts`,
      ),
    ];
    return {
      gateId,
      status: gate.status,
      evidenceLayerStatus: checks.every(({ passed }) => passed)
        ? 'PASS_LAYER_A_GLOBAL_GEOMETRY_HOLD_LAYER_B'
        : 'FAIL_INTERFACE_CENSUS',
      checks,
      blockerIds,
      rerunDecision: gate.status === 'PASS'
        ? 'GATE_COMPLETE'
        : layerB.nullTechnicalGeometryCount === 0
          && layerB.missingTransitionPairManifestCount === 0
          && layerB.missingBeforeStateSetCount === 0
          && layerB.missingFutureStateSetCount === 0
          && layerB.unacceptedContractCount === 0
          ? 'READY_FINAL_COMBINED_TECHNICAL_INTERFACE_AUDIT'
          : 'WAITING_LAYER_B_ENDPOINT_PAIR_STATE_AND_ACCEPTANCE_CLOSURE',
      action: gate.status === 'PASS'
        ? 'NO_ACTION'
        : 'REUSE_LAYER_A; CLOSE_LAYER_B_WORKLIST_BEFORE_FINAL_COMBINED_AUDIT',
    };
  }

  if (gateId === 'G06_PROTECTED_FEATURES') {
    const geometry = composite.g06GeometryIntegration;
    const checks = [
      check(
        'G06-ZERO-GENERATED-START-OVERLAP',
        geometry.compositeGeneratedStartOverlapCellCount === 0
          && geometry.allThirtyDomainsExactZeroAgainstGeneratedStarts === true,
        `${geometry.compositeGeneratedStartOverlapCellCount} generated-start overlap cells`,
      ),
      check(
        'G06-ZERO-PROTECTED-CORE-OVERLAP',
        geometry.compositeProtectedCoreOverlapCellCount === 0
          && geometry.allThirtyDomainsExactZeroAgainstFrozenCores === true,
        `${geometry.compositeProtectedCoreOverlapCellCount} protected-core overlap cells`,
      ),
      check(
        'G06-PRODUCTION-RUNTIME-BOUND',
        runtime.conclusion.exactProductionRuntimeBinaryBound === true
          && runtime.conclusion.paperBeeItemSerializationObserved === true,
        `${runtime.evidence.productionRuntime.paperVersion} / ${runtime.evidence.productionRuntime.paperJarSha256}`,
      ),
      check(
        'G06-NO-FALSE-MECHANIC-PASS',
        runtime.conclusion.isolatedRuntimeMechanicProven === false
          && runtime.conclusion.technicalTreatmentAccepted === false
          && runtime.conclusion.operationCompilationAuthorized === false,
        'real-client capture/transport/place/NBT mechanic remains HOLD',
      ),
    ];
    return {
      gateId,
      status: gate.status,
      evidenceLayerStatus: checks.every(({ passed }) => passed)
        ? 'PASS_GEOMETRY_HOLD_RUNTIME_AND_ACCEPTANCE'
        : 'FAIL_PROTECTED_FEATURE_BASE',
      checks,
      blockerIds,
      rerunDecision: gate.status === 'PASS'
        ? 'GATE_COMPLETE'
        : runtime.conclusion.isolatedRuntimeMechanicProven === true
          ? 'READY_FRESH_LIVE_CONSOLIDATION_AND_ACCEPTANCE'
          : 'WAITING_SERVER_AUTHORITATIVE_POSITION_RANGE_AND_REAL_CLIENT_PROOF',
      action: gate.status === 'PASS'
        ? 'EXECUTION_STAGE_RCON_RELOCATION_VALIDATION_REMAINS_AT_G13_G17'
        : runtime.conclusion.isolatedRuntimeMechanicProven === true
          ? 'PROCEED_TO_BOUND_LIVE_CONSOLIDATION_PLAN'
          : 'ASSERT_TELEPORT_CONFIRM_AND_SERVER_RANGE; THEN_TEST_BREAK_TRANSPORT_PLACE_NBT',
    };
  }

  const upstream = TARGET_GATE_IDS
    .slice(0, 4)
    .map((upstreamGateId) => ({
      gateId: upstreamGateId,
      status: findGate(r00, upstreamGateId).status,
    }));
  const upstreamReady = upstream.every(({ status }) => status === 'PASS');
  const checks = [
    check(
      'G07-UPSTREAM-ACCEPTED',
      upstreamReady,
      `${upstream.filter(({ status }) => status === 'HOLD').length} upstream gates remain HOLD`,
    ),
    check(
      'G07-SINGLE-IDENTITY-RULE',
      r00.summary.completeSaveIntakePassed === true
        && r00.summary.shipwreckCanonicalIntegrationValid === true,
      'accepted complete-save and canonical-composite identities are bound',
    ),
  ];
  return {
    gateId,
    status: gate.status,
    evidenceLayerStatus: upstreamReady
      ? 'READY_INTEGRATED_DESIGN_AUDIT'
      : 'WAITING_UPSTREAM_ACCEPTED_INPUTS',
    checks,
    blockerIds,
    upstream,
    rerunDecision: upstreamReady
      ? 'READY_INTEGRATED_DESIGN_AUDIT'
      : 'WAITING_PREREQUISITES',
    action: upstreamReady
      ? 'RUN_INTEGRATED_CIVIL_HYDROLOGY_STRUCTURE_LIFE_SAFETY_AUDIT'
      : 'SKIP_INTEGRATED_AUDIT_UNTIL_G02_G04_G05_G06_PASS',
  };
}

const initialState = loadState();
for (const gateId of TARGET_GATE_IDS) findGate(initialState.r00, gateId);

const iterations = [];
let previousStateDigest = null;
let stopReason = 'MAX_ITERATIONS_REACHED';

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1) {
  const state = loadState();
  const gateResults = TARGET_GATE_IDS.map((gateId) => evaluateGate(state, gateId));
  for (const result of gateResults) {
    invariant(
      result.status !== 'PASS' || result.checks.every(({ passed }) => passed),
      `${result.gateId} is marked PASS while one or more confirmation checks fail`,
    );
  }
  const stateDigest = stableDigest(gateResults.map((result) => ({
    gateId: result.gateId,
    status: result.status,
    evidenceLayerStatus: result.evidenceLayerStatus,
    rerunDecision: result.rerunDecision,
    checks: result.checks,
  })));
  const fixedPoint = stateDigest === previousStateDigest;
  iterations.push({
    iteration,
    stateDigest,
    fixedPoint,
    gateResults,
    passCount: gateResults.filter(({ status }) => status === 'PASS').length,
    holdCount: gateResults.filter(({ status }) => status === 'HOLD').length,
  });

  if (gateResults.every(({ status }) => status === 'PASS')) {
    stopReason = 'ALL_FIVE_GATES_PASS';
    break;
  }
  if (fixedPoint) {
    stopReason = 'FIXED_POINT_EXTERNAL_OR_PREREQUISITE_BOUNDARY';
    break;
  }
  previousStateDigest = stateDigest;
}

const finalIteration = iterations.at(-1);
const allFiveGatesPass = finalIteration.gateResults.every(({ status }) => status === 'PASS');
const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);

const reportPayload = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r00-five-gate-hold-loop',
  generatedAtUtc: GENERATED_AT,
  status: allFiveGatesPass ? 'PASS_ALL_FIVE_R00_GATES' : 'FIXED_POINT_HOLD',
  purpose: 'Run the five remaining R00 gates through a bounded dependency-aware confirmation loop without repeating ineligible audits or inventing external acceptance.',
  sourceBindings,
  methodPolicy: {
    principle: 'Use immutable/hash-bound evidence for facts, exact sets and state transitions for geometry/interfaces, real production-binary client tests for mechanics, and explicit accountable acceptance for engineering decisions.',
    methods: METHOD_REGISTRY,
    fixedPointRule: 'Stop when two consecutive complete five-gate evaluations have the same state digest.',
    rerunRule: 'A downstream audit runs only when every declared prerequisite can change its result.',
    acceptanceRule: 'Offline checks may prove consistency but never self-issue expert, owner, interface, protected-feature, or final technical acceptance.',
  },
  dependencyGraph: [
    { from: 'G02_DESIGN_DECISIONS', to: 'G04_OWNERSHIP', requirement: 'accepted technical/null-domain basis before final owner acceptance' },
    { from: 'G02_DESIGN_DECISIONS', to: 'G05_INTERFACES', requirement: 'accepted technical endpoints and states before final interface acceptance' },
    { from: 'G02_DESIGN_DECISIONS', to: 'G06_PROTECTED_FEATURES', requirement: 'accepted positive margins and D06 treatment' },
    { from: 'G04_OWNERSHIP', to: 'G07_CIVIL_HYDROLOGY_STRUCTURE', requirement: 'final one-owner registry acceptance' },
    { from: 'G05_INTERFACES', to: 'G07_CIVIL_HYDROLOGY_STRUCTURE', requirement: 'global default-deny interface gate pass' },
    { from: 'G06_PROTECTED_FEATURES', to: 'G07_CIVIL_HYDROLOGY_STRUCTURE', requirement: 'protected-feature and real-client mechanic acceptance' },
  ],
  foundationChecks: {
    r00SourceBindings: initialState.sourceIntegrity,
    completeSaveSha256: initialState.r00.summary.completeSaveSha256,
    compositeCanonicalPayloadSha256:
      initialState.composite.compositeCanonicalModel.compositeCanonicalPayloadSha256,
    runtimeAuditIdentitySha256: initialState.runtime.reportIdentitySha256,
    technicalSourceRefreshIdentitySha256:
      initialState.technicalSourceRefresh.reportIdentitySha256,
    g05GlobalGeometryIdentitySha256:
      initialState.g05GlobalGeometry.reportIdentitySha256,
  },
  closureWorklists: {
    g02ExternalTechnicalBlockers: findGate(initialState.r00, 'G02_DESIGN_DECISIONS').blockers,
    g04OwnerAcceptance: {
      proposedOwnerRecordCount:
        initialState.registry.proposedOwnerRegistry.proposedOwnerRecordCount,
      acceptedOwnerRecordCount:
        initialState.registry.proposedOwnerRegistry.acceptedOwnerRecordCount,
      rule: 'Accept one complete immutable registry identity only after technical/null-domain closure.',
    },
    g05UndefinedExternalEndpoints: initialState.missingEndpoints,
    g05LayerB: {
      technicalContractCount:
        initialState.g05GlobalGeometry.layerB.technicalContractCount,
      exactTechnicalGeometryCount:
        initialState.g05GlobalGeometry.layerB.exactTechnicalGeometryCount,
      nullTechnicalGeometryCount:
        initialState.g05GlobalGeometry.layerB.nullTechnicalGeometryCount,
      missingTransitionPairManifestCount:
        initialState.g05GlobalGeometry.layerB.missingTransitionPairManifestCount,
      missingBeforeStateSetCount:
        initialState.g05GlobalGeometry.layerB.missingBeforeStateSetCount,
      missingFutureStateSetCount:
        initialState.g05GlobalGeometry.layerB.missingFutureStateSetCount,
      unacceptedContractCount:
        initialState.g05GlobalGeometry.layerB.unacceptedContractCount,
      passPrerequisites:
        initialState.g05GlobalGeometry.layerB.passPrerequisites,
    },
    g06RuntimeNextMethod: {
      productionPaperVersion: initialState.runtime.evidence.productionRuntime.paperVersion,
      productionPaperJarSha256:
        initialState.runtime.evidence.productionRuntime.paperJarSha256,
      currentMechanicProven:
        initialState.runtime.conclusion.isolatedRuntimeMechanicProven,
      method: 'First disable client physics, await teleport confirmation/forced move, and assert two server-authoritative position/range readings; then require break events before testing item decode, pickup, placement, exact three-bee NBT, and rollback.',
    },
    g07IntegratedAuditPrerequisites: TARGET_GATE_IDS.slice(0, 4),
  },
  iterations,
  summary: {
    targetGateCount: TARGET_GATE_IDS.length,
    passCount: finalIteration.passCount,
    holdCount: finalIteration.holdCount,
    allFiveGatesPass,
    iterationCount: iterations.length,
    maxIterations: MAX_ITERATIONS,
    stopReason,
    fixedPointReached: stopReason === 'FIXED_POINT_EXTERNAL_OR_PREREQUISITE_BOUNDARY',
    missingExternalEndpointCount: initialState.missingEndpoints.length,
    g05LayerAPassed: initialState.g05GlobalGeometry.layerA.passed,
    g05PhysicalDirectionalContractCount:
      initialState.g05GlobalGeometry.layerA.exactDirectionalAdjacencyContractCount,
    g05PhysicalDirectionalPairCount:
      initialState.g05GlobalGeometry.layerA.exactDirectionalAdjacencyPairCount,
    g05TechnicalContractCount:
      initialState.g05GlobalGeometry.layerB.technicalContractCount,
    g05MissingTransitionPairManifestCount:
      initialState.g05GlobalGeometry.layerB.missingTransitionPairManifestCount,
    g05MissingBeforeStateSetCount:
      initialState.g05GlobalGeometry.layerB.missingBeforeStateSetCount,
    g05MissingFutureStateSetCount:
      initialState.g05GlobalGeometry.layerB.missingFutureStateSetCount,
    g05UnacceptedContractCount:
      initialState.g05GlobalGeometry.layerB.unacceptedContractCount,
    technicalSourceRefreshStaleRowPassCount:
      initialState.technicalSourceRefresh.summary.staleSourceRowPassCount,
    ownerAcceptanceCount:
      initialState.registry.proposedOwnerRegistry.acceptedOwnerRecordCount,
    realClientBeeMechanicProven:
      initialState.runtime.conclusion.isolatedRuntimeMechanicProven,
    documentationPublicationAuthorized: allFiveGatesPass,
    masterPlanReadyUpdateAuthorized: allFiveGatesPass,
    worldShowcaseUpdateAuthorized: allFiveGatesPass,
    mainPushAuthorizedByGateCondition: allFiveGatesPass,
  },
  safetyBoundary: {
    readOnlyEvidenceEvaluation: true,
    productionServerContacted: false,
    productionWorldContacted: false,
    fleetApiContacted: false,
    rconContacted: false,
    systemdContacted: false,
    operationFilesCompiled: 0,
    operationCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    executable: false,
  },
};

const report = {
  ...reportPayload,
  reportIdentitySha256: stableDigest(reportPayload),
};

function renderMarkdown(valueToRender) {
  const finalResults = valueToRender.iterations.at(-1).gateResults;
  const lines = [
    '# Combined Zones Phase 1 R00 Five-Gate Hold Loop',
    '',
    `Status: **${valueToRender.status}**`,
    '',
    `The bounded loop evaluated all five remaining gates ${valueToRender.summary.iterationCount} times and stopped at \`${valueToRender.summary.stopReason}\`. It performed no live calls, operations, or world edits.`,
    '',
    '## Result',
    '',
    '| Gate | Gate status | Evidence layer | Next eligible action |',
    '|---|---:|---|---|',
    ...finalResults.map((result) => `| ${result.gateId} | ${result.status} | ${result.evidenceLayerStatus} | ${result.action} |`),
    '',
    '## Better Confirmation Methods',
    '',
    ...valueToRender.methodPolicy.methods.flatMap((method) => [
      `### ${method.gateId}`,
      '',
      `${method.improvement}`,
      '',
      `External boundary: ${method.externalBoundary}`,
      '',
    ]),
    '## G05 Layer B Worklist',
    '',
    `Layer A passes ${valueToRender.summary.g05PhysicalDirectionalContractCount} physical contracts and ${valueToRender.summary.g05PhysicalDirectionalPairCount.toLocaleString('en-US')} pairs. Layer B retains ${valueToRender.summary.g05TechnicalContractCount} technical contracts, ${valueToRender.summary.g05MissingTransitionPairManifestCount} missing pair manifests, ${valueToRender.summary.g05MissingBeforeStateSetCount} missing before-state sets, ${valueToRender.summary.g05MissingFutureStateSetCount} missing future-state sets, and ${valueToRender.summary.g05UnacceptedContractCount} unaccepted contracts.`,
    '',
    '### Undefined external endpoints',
    '',
    '| Contract | Scope | Direction | Source owner |',
    '|---|---|---|---|',
    ...valueToRender.closureWorklists.g05UndefinedExternalEndpoints.map((endpoint) =>
      `| ${endpoint.contractId} | ${endpoint.scope} | ${endpoint.direction} | ${endpoint.fromOwnerId} |`),
    '',
    '## Stop Decision',
    '',
    valueToRender.summary.allFiveGatesPass
      ? 'All five gates pass. The conditional documentation, master-plan, world-showcase, README, and main-branch publication workflow may proceed.'
      : 'The loop reached a truthful fixed point. Documentation publication and main-branch push are not authorized by the all-gates-pass condition; the remaining work needs Layer B technical/state/owner/interface evidence, expert acceptance, and a server-position-confirmed real-client mechanic proof.',
    '',
    `Report identity: \`${valueToRender.reportIdentitySha256}\``,
    '',
  ];
  return lines.join('\n');
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, renderMarkdown(report));

process.stdout.write(`${JSON.stringify({
  status: report.status,
  passCount: report.summary.passCount,
  holdCount: report.summary.holdCount,
  iterationCount: report.summary.iterationCount,
  stopReason: report.summary.stopReason,
  out: relative(OUTPUT),
  markdown: relative(MARKDOWN),
}, null, 2)}\n`);

if (REQUIRE_PASS && !allFiveGatesPass) process.exitCode = 2;
