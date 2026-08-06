#!/usr/bin/env node
/**
 * Verify the Combined Zones G05 global physical-interface geometry layer.
 *
 * This audit deliberately separates two concerns:
 * - Layer A: exact one-to-one coverage of every observed G04 owner-to-owner
 *   six-face adjacency in the canonical composite geometry.
 * - Layer B: technical endpoints, state transitions, counterpart acceptance,
 *   and contract acceptance. Layer B remains HOLD here.
 *
 * The baseline registry is independently regenerated into a temporary
 * directory from its bound sources. The audit then compares the complete
 * regenerated and committed G04 contract universes and applies the separately
 * proven P1-B10 overlay delta. It performs no live calls or world mutation.
 */

import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-06T21:25:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.md',
));

const INPUTS = Object.freeze({
  registry:
    'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  composite:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  completeSave:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  layerBClosure:
    'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  registryCompiler:
    'scripts/compile_combined_zones_proposed_ownership_interface_registry.mjs',
});

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Combined Zones G05 global geometry audit rejected: ${message}`);
  }
}

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

function binding(relativePath, role) {
  const bytes = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: sha256(bytes),
    role,
  };
}

function contractKey(contract) {
  return [
    contract.scope,
    contract.fromOwnerId,
    contract.toOwnerId,
    contract.direction,
  ].join('\t');
}

function contractComparable(contract) {
  return {
    contractId: contract.contractId,
    scope: contract.scope,
    fromOwnerId: contract.fromOwnerId,
    toOwnerId: contract.toOwnerId,
    direction: contract.direction,
    relationship: contract.relationship,
    interfaceCellSet: contract.interfaceCellSet,
    transitionPairCount: contract.transitionPairCount,
    transitionPairManifestSha256: contract.transitionPairManifestSha256,
    beforeStateSetSha256: contract.beforeStateSetSha256,
    futureStateSetSha256: contract.futureStateSetSha256,
    receiverId: contract.receiverId,
    ownershipSemantics: contract.ownershipSemantics,
    defaultDeny: contract.defaultDeny,
    wildcardAllowed: contract.wildcardAllowed,
    lastWriterWinsAllowed: contract.lastWriterWinsAllowed,
    accepted: contract.accepted,
    acceptedBy: contract.acceptedBy,
    status: contract.status,
    qualification: contract.qualification,
  };
}

function contractIdentity(contract) {
  return sha256(JSON.stringify(contractComparable(contract)));
}

function g04Contracts(registry) {
  return registry.proposedDirectionalInterfaceRegistry.contracts.filter(
    ({ scope }) => scope === 'G04-GLOBAL-EXPANDED'
      || scope === 'G04-GLOBAL-SPARSE-B10',
  );
}

function mapContracts(contracts, label) {
  const mapped = new Map();
  for (const contract of contracts) {
    const key = contractKey(contract);
    invariant(!mapped.has(key), `${label} contains duplicate directional key ${key}`);
    mapped.set(key, contract);
  }
  return mapped;
}

function regenerateBaselineRegistry(committedRegistry) {
  const temporaryDirectory = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'combined-zones-g05-global-geometry-',
  ));
  const output = path.join(temporaryDirectory, 'registry.json');
  const markdown = path.join(temporaryDirectory, 'registry.md');
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--max-old-space-size=8192',
        INPUTS.registryCompiler,
        '--generated-at',
        committedRegistry.generatedAtUtc,
        '--out',
        output,
        '--markdown',
        markdown,
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    invariant(result.status === 0, [
      'baseline registry source recompilation failed',
      result.stdout?.trim(),
      result.stderr?.trim(),
    ].filter(Boolean).join(': '));
    return JSON.parse(fs.readFileSync(output, 'utf8'));
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function compareContractUniverses(committed, observed) {
  const committedMap = mapContracts(committed, 'committed registry');
  const observedMap = mapContracts(observed, 'regenerated source model');
  const undeclaredObserved = [...observedMap.entries()]
    .filter(([key]) => !committedMap.has(key))
    .map(([key, contract]) => ({
      key,
      contractId: contract.contractId,
      identitySha256: contractIdentity(contract),
    }));
  const staleCommitted = [...committedMap.entries()]
    .filter(([key]) => !observedMap.has(key))
    .map(([key, contract]) => ({
      key,
      contractId: contract.contractId,
      identitySha256: contractIdentity(contract),
    }));
  const drifted = [...observedMap.entries()].flatMap(([key, observedContract]) => {
    const committedContract = committedMap.get(key);
    if (!committedContract) return [];
    const committedIdentity = contractIdentity(committedContract);
    const observedIdentity = contractIdentity(observedContract);
    return committedIdentity === observedIdentity ? [] : [{
      key,
      committedContractId: committedContract.contractId,
      observedContractId: observedContract.contractId,
      committedIdentitySha256: committedIdentity,
      observedIdentitySha256: observedIdentity,
    }];
  });
  return {
    committedContractCount: committedMap.size,
    observedContractCount: observedMap.size,
    matchedContractCount: observedMap.size - undeclaredObserved.length - drifted.length,
    undeclaredObservedContractCount: undeclaredObserved.length,
    staleCommittedContractCount: staleCommitted.length,
    driftedContractCount: drifted.length,
    undeclaredObserved,
    staleCommitted,
    drifted,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Combined Zones Phase 1 G05 global geometry audit',
    '',
    `**Status:** ${report.status}`,
    `**Generated:** ${report.generatedAtUtc}`,
    `**Report identity:** \`${report.reportIdentitySha256}\``,
    '',
    '## Result',
    '',
    `Layer A passes: ${report.layerA.passed ? 'yes' : 'no'}. The source model and committed registry match one-to-one across ${report.layerA.oneToOneCoverage.matchedContractCount} exact G04 directional adjacency contracts, with ${report.layerA.oneToOneCoverage.undeclaredObservedContractCount} undeclared observed, ${report.layerA.oneToOneCoverage.staleCommittedContractCount} stale committed, and ${report.layerA.oneToOneCoverage.driftedContractCount} drifted contracts.`,
    '',
    `The immutable composite has ${report.layerA.compositePhysicalCellCount.toLocaleString('en-US')} physical cells with zero unowned and zero multiply owned cells. The P1-B10 overlay changes no existing cross-owner interface cell set. The complete-save identity is \`${report.layerA.completeSaveSha256}\`.`,
    '',
    report.layerB.g05Passed ? '## Layer B closed' : '## Layer B remains HOLD',
    '',
    `The registry contains ${report.layerB.technicalContractCount} non-G04 technical contracts. Across all ${report.layerB.totalContractCount} contracts, ${report.layerB.missingTransitionPairManifestCount} lack inline transition-pair manifests, ${report.layerB.beforeStateSetCount} have inline before-state hashes, ${report.layerB.futureStateSetCount} have inline future-state hashes, and ${report.layerB.acceptedContractCount} carry inline acceptance; the registry proposal remains byte-identical.`,
    '',
    ...(report.layerB.g05Passed ? [
      `The additive Layer B closure record (\`${report.layerB.closureRecord.reportIdentitySha256}\`) closes all ${report.layerB.closureRecord.closedContractCount} contracts: ${report.layerB.closureRecord.closedNullEndpointCount} null endpoints are closed by architectural fail-closed disposition, every exact-cell contract carries complete-save-bound before-state and accepted design-basis future-state bindings, and all ${report.layerB.closureRecord.acceptedContractCount} contracts are accepted by the sole-owner EXT-04 integrated record.`,
    ] : [
      `Thirteen technical requirements still have null endpoint geometry; ${report.layerB.exactTechnicalGeometryCount} technical contracts have exact geometry. This audit does not invent endpoints, receivers, counterparts, future states, or acceptance.`,
    ]),
    '',
    '## Boundary',
    '',
    '- No Minecraft, RCON, API, systemd, network, or live-server call was made.',
    '- No operation, construction, release, or world edit is authorized by this audit.',
    report.layerB.g05Passed
      ? '- G05 PASS is design-freeze evidence only; release-stage gates and preflight state extraction remain required before any operation.'
      : '- Layer A geometry PASS is necessary but not sufficient for G05 or R00 PASS.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

const sourceBindings = {
  registry: binding(INPUTS.registry, 'committed baseline G04/G05 proposal registry'),
  composite: binding(INPUTS.composite, 'canonical P1-B10 overlay and unchanged-interface proof'),
  completeSave: binding(INPUTS.completeSave, 'complete immutable same-moment saved-world identity'),
  layerBClosure: binding(INPUTS.layerBClosure, 'additive Layer B technical/state/acceptance closure record'),
  registryCompiler: binding(INPUTS.registryCompiler, 'independent baseline source-model recompilation'),
};
const committedRegistry = readJson(INPUTS.registry);
const composite = readJson(INPUTS.composite);
const completeSave = readJson(INPUTS.completeSave);
const layerBClosure = readJson(INPUTS.layerBClosure);
const regeneratedRegistry = regenerateBaselineRegistry(committedRegistry);

invariant(committedRegistry.g04PhysicalOwnership?.g04PassedOffline === true,
  'committed G04 offline one-owner gate is not PASS');
invariant(committedRegistry.g04PhysicalOwnership?.unownedCellCount === 0
  && committedRegistry.g04PhysicalOwnership?.multiplyOwnedCellCount === 0,
'committed G04 owner coverage is not exact');
invariant(composite.status.startsWith('PASS_COMPOSITE_G03_G04_G05_G06_GEOMETRY_INTEGRATION'),
  'canonical composite geometry integration is not PASS');
invariant(composite.sourceBindings?.ownership?.sha256 === sourceBindings.registry.sha256,
  'composite is not bound to the committed registry');
invariant(composite.g05InterfaceIntegration?.changedCellsIntersectAnotherScope === false
  && composite.g05InterfaceIntegration?.existingCrossScopeContractCellSetsChanged === false,
'composite overlay changes an existing cross-owner interface');
invariant(completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && completeSave.summary?.passed === true
  && completeSave.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'complete-save evidence is not an accepted read-only engineering input');

const committedG04Contracts = g04Contracts(committedRegistry);
const observedG04Contracts = g04Contracts(regeneratedRegistry);
const oneToOneCoverage = compareContractUniverses(
  committedG04Contracts,
  observedG04Contracts,
);
const expandedContractCount = committedG04Contracts.filter(
  ({ scope }) => scope === 'G04-GLOBAL-EXPANDED',
).length;
const sparseContractCount = committedG04Contracts.filter(
  ({ scope }) => scope === 'G04-GLOBAL-SPARSE-B10',
).length;
const committedPairCount = committedG04Contracts.reduce(
  (sum, contract) => sum + contract.transitionPairCount,
  0,
);
const observedPairCount = observedG04Contracts.reduce(
  (sum, contract) => sum + contract.transitionPairCount,
  0,
);

invariant(committedG04Contracts.length
  === committedRegistry.g04PhysicalOwnership.exactDirectionalAdjacencyContractCount,
'committed G04 adjacency count and registry summary disagree');
invariant(expandedContractCount
  === committedRegistry.g04PhysicalOwnership.exactExpandedDirectionalAdjacencyContractCount,
'committed expanded adjacency count and registry summary disagree');
invariant(sparseContractCount
  === committedRegistry.g04PhysicalOwnership.exactSparseB10DirectionalAdjacencyContractCount,
'committed sparse adjacency count and registry summary disagree');
invariant(committedPairCount
  === committedRegistry.g04PhysicalOwnership.exactDirectionalAdjacencyPairCount,
'committed adjacency pair count and registry summary disagree');
invariant(committedG04Contracts.every((contract) => (
  contract.interfaceCellSet !== null
  && Number.isInteger(contract.interfaceCellSet.cellCount)
  && contract.interfaceCellSet.cellCount > 0
  && Number.isInteger(contract.transitionPairCount)
  && contract.transitionPairCount > 0
  && /^[a-f0-9]{64}$/.test(contract.interfaceCellSet.coordinateSetSha256)
  && /^[a-f0-9]{64}$/.test(contract.transitionPairManifestSha256)
  && contract.defaultDeny === true
  && contract.wildcardAllowed === false
  && contract.lastWriterWinsAllowed === false
)), 'committed G04 adjacency contract is not exact/default-deny');
invariant(oneToOneCoverage.undeclaredObservedContractCount === 0
  && oneToOneCoverage.staleCommittedContractCount === 0
  && oneToOneCoverage.driftedContractCount === 0,
'committed and regenerated G04 contract universes do not match one-to-one');
invariant(observedPairCount === committedPairCount,
  'regenerated and committed G04 adjacency pair totals differ');
invariant(composite.g05InterfaceIntegration.exactDirectionalAdjacencyContractCount
  === committedG04Contracts.length
  && composite.g05InterfaceIntegration.exactExpandedDirectionalAdjacencyContractCount
    === expandedContractCount
  && composite.g05InterfaceIntegration.exactSparseB10DirectionalAdjacencyContractCount
    === sparseContractCount,
'composite adjacency counts do not preserve the verified baseline contract universe');

const allContracts = committedRegistry.proposedDirectionalInterfaceRegistry.contracts;
const technicalContracts = allContracts.filter(
  ({ scope }) => scope !== 'G04-GLOBAL-EXPANDED'
    && scope !== 'G04-GLOBAL-SPARSE-B10',
);
const exactTechnicalGeometryCount = technicalContracts.filter(
  ({ interfaceCellSet }) => interfaceCellSet !== null,
).length;
const nullTechnicalGeometryCount = technicalContracts.length - exactTechnicalGeometryCount;
const missingTransitionPairManifestCount = allContracts.filter(
  ({ transitionPairManifestSha256 }) => transitionPairManifestSha256 === null,
).length;
const beforeStateSetCount = allContracts.filter(
  ({ beforeStateSetSha256 }) => beforeStateSetSha256 !== null,
).length;
const futureStateSetCount = allContracts.filter(
  ({ futureStateSetSha256 }) => futureStateSetSha256 !== null,
).length;
const acceptedContractCount = allContracts.filter(({ accepted }) => accepted === true).length;

// These are contract-shape assertions, not acceptance claims. A changed count
// requires an explicit audit/schema review instead of silently weakening G05.
invariant(committedG04Contracts.length === 84
  && expandedContractCount === 63
  && sparseContractCount === 21,
'expected 84 (63 expanded + 21 sparse) G04 adjacency contracts');
invariant(technicalContracts.length === 77,
  'expected 77 non-G04 technical interface contracts');
invariant(nullTechnicalGeometryCount === 13,
  'expected 13 null technical endpoint geometries');
invariant(missingTransitionPairManifestCount === 52,
  'expected 52 contracts without transition-pair manifests');
invariant(beforeStateSetCount === 0 && futureStateSetCount === 0,
  'state coverage changed and requires explicit Layer-B review');
invariant(acceptedContractCount === 0,
  'accepted interface state changed and requires explicit Layer-B review');

const layerAPassed = oneToOneCoverage.undeclaredObservedContractCount === 0
  && oneToOneCoverage.staleCommittedContractCount === 0
  && oneToOneCoverage.driftedContractCount === 0
  && composite.g05InterfaceIntegration.changedCellsIntersectAnotherScope === false
  && composite.g05InterfaceIntegration.existingCrossScopeContractCellSetsChanged === false;

// Layer B closes through the additive closure record, which must be bound to
// this exact registry/composite/save identity and cover every contract.
const closureContracts = layerBClosure.contracts ?? [];
const closureContractIds = new Set(closureContracts.map(({ contractId }) => contractId));
const layerBClosed = layerBClosure.status
    === 'PASS_LAYER_B_CLOSED_ADDITIVE_RECORD_REGISTRY_UNMODIFIED'
  && layerBClosure.registryIdentity?.registryFileSha256 === sourceBindings.registry.sha256
  && layerBClosure.registryIdentity?.registryCanonicalPayloadSha256
    === committedRegistry.canonicalPayloadSha256
  && layerBClosure.closureSummary?.layerBClosed === true
  && layerBClosure.closureSummary?.totalContractCount === allContracts.length
  && layerBClosure.closureSummary?.closedContractCount === allContracts.length
  && layerBClosure.closureSummary?.acceptedContractCount === allContracts.length
  && layerBClosure.closureSummary?.closedNullEndpointCount === nullTechnicalGeometryCount
  && closureContracts.length === allContracts.length
  && allContracts.every(({ contractId }) => closureContractIds.has(contractId))
  && closureContracts.every((row) => row.acceptance?.accepted === true
    && row.beforeState?.bindingSha256
    && row.futureState?.bindingSha256
    && (row.pairManifestClosure?.kind === 'EXACT_REGISTRY_MANIFEST'
      || row.pairManifestClosure?.kind === 'VOID_ENDPOINT_CLOSED'
      || row.pairManifestClosure?.kind === 'CANONICAL_ALIAS_REFERENCE'
      || row.pairManifestClosure?.kind === 'REVIEWED_NOT_APPLICABLE'));

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g05-global-geometry-audit',
  generatedAtUtc: GENERATED_AT,
  status: layerAPassed && layerBClosed
    ? 'PASS_LAYER_A_GLOBAL_GEOMETRY_AND_LAYER_B_CLOSED_BY_ADDITIVE_RECORD'
    : layerAPassed
      ? 'PARTIAL_PASS_LAYER_A_GLOBAL_GEOMETRY_LAYER_B_TECHNICAL_STATES_AND_ACCEPTANCE_HOLD'
      : 'HOLD_LAYER_A_GLOBAL_GEOMETRY_MISMATCH',
  purpose: 'Verify every observed G04 canonical-owner six-face adjacency against the exact committed contract universe while preserving all technical/state/acceptance HOLDs.',
  sourceBindings,
  layerA: {
    status: layerAPassed
      ? 'PASS_EXACT_COMPOSITE_GLOBAL_PHYSICAL_INTERFACE_GEOMETRY'
      : 'HOLD_UNDECLARED_STALE_OR_DRIFTED_PHYSICAL_INTERFACE_GEOMETRY',
    passed: layerAPassed,
    method: 'Regenerate the baseline owner/seam model from source, compare exact directional contract keys and record identities one-to-one, then apply the hash-bound P1-B10 overlay no-seam-change proof.',
    baselineCanonicalPayloadSha256:
      composite.compositeCanonicalModel.baseG03CanonicalPayloadSha256,
    compositeCanonicalPayloadSha256:
      composite.compositeCanonicalModel.compositeCanonicalPayloadSha256,
    completeSaveSha256: completeSave.packageIdentity.completeSaveSha256,
    compositePhysicalCellCount:
      composite.g04OwnershipIntegration.compositeObservedPhysicalUnionCellCount,
    compositeCanonicalOwnerCellCount:
      composite.g04OwnershipIntegration.compositeCanonicalOwnerUnionCellCount,
    compositeUnownedCellCount:
      composite.g04OwnershipIntegration.compositeUnownedCellCount,
    compositeMultiplyOwnedCellCount:
      composite.g04OwnershipIntegration.compositeMultiplyOwnedCellCount,
    exactDirectionalAdjacencyContractCount: committedG04Contracts.length,
    exactExpandedDirectionalAdjacencyContractCount: expandedContractCount,
    exactSparseB10DirectionalAdjacencyContractCount: sparseContractCount,
    exactDirectionalAdjacencyPairCount: committedPairCount,
    regeneratedDirectionalAdjacencyPairCount: observedPairCount,
    oneToOneCoverage,
    overlayChangedCellsIntersectAnotherScope:
      composite.g05InterfaceIntegration.changedCellsIntersectAnotherScope,
    overlayChangedExistingContractCellSet:
      composite.g05InterfaceIntegration.existingCrossScopeContractCellSetsChanged,
    finalInterfaceAcceptanceRecorded: layerBClosed,
    g05Passed: layerAPassed && layerBClosed,
  },
  layerB: {
    status: layerBClosed
      ? 'PASS_CLOSED_BY_ADDITIVE_CLOSURE_RECORD_REGISTRY_UNMODIFIED'
      : 'HOLD_TECHNICAL_ENDPOINTS_TRANSITIONS_STATES_AND_ACCEPTANCE_INCOMPLETE',
    closureRecord: layerBClosed ? {
      path: INPUTS.layerBClosure,
      reportIdentitySha256: layerBClosure.reportIdentitySha256,
      closurePayloadSha256: layerBClosure.closurePayloadSha256,
      closedContractCount: layerBClosure.closureSummary.closedContractCount,
      closedNullEndpointCount: layerBClosure.closureSummary.closedNullEndpointCount,
      acceptedContractCount: layerBClosure.closureSummary.acceptedContractCount,
      acceptedBy: 'SOLE_OWNER_EXT_04_INTEGRATED_RECORD',
    } : null,
    totalContractCount: allContracts.length,
    physicalGeometryContractCount: committedG04Contracts.length,
    technicalContractCount: technicalContracts.length,
    exactTechnicalGeometryCount,
    nullTechnicalGeometryCount,
    transitionPairManifestCount:
      allContracts.length - missingTransitionPairManifestCount,
    missingTransitionPairManifestCount,
    beforeStateSetCount,
    missingBeforeStateSetCount: allContracts.length - beforeStateSetCount,
    futureStateSetCount,
    missingFutureStateSetCount: allContracts.length - futureStateSetCount,
    acceptedContractCount,
    unacceptedContractCount: allContracts.length - acceptedContractCount,
    passPrerequisites: [
      'Every required technical endpoint has exact geometry and a named canonical counterpart or receiver.',
      'Every interface has an exact transition-pair or explicit one-sided terminal manifest.',
      'Every interface has complete-save-bound before states and accepted designed future states.',
      'Every interface and owner assignment is accepted against one immutable composite identity.',
      'The final combined physical and technical audit has zero undeclared, stale, wildcard, shared-owner, silent-clipping, or last-writer-wins interfaces.',
    ],
    g05Passed: layerAPassed && layerBClosed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    networkCallsPerformed: false,
    minecraftConnected: false,
    rconConnected: false,
    apiCalled: false,
    systemdCalled: false,
    worldFilesMutated: false,
    operationCellCount: 0,
    worldEditAuthorized: false,
    ownerAcceptanceRecorded: false,
    interfaceAcceptanceRecorded: false,
    technicalAcceptanceRecorded: false,
    releaseAuthorized: false,
  },
  disposition: {
    layerAGeometryMayBeReused: layerAPassed,
    layerBMayBeInferredFromLayerA: false,
    layerBClosedByAdditiveRecord: layerBClosed,
    g05Passed: layerAPassed && layerBClosed,
    r00Passed: false,
  },
};
const reportIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, reportIdentitySha256 };

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, renderMarkdown(report));

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  layerAPassed: report.layerA.passed,
  exactDirectionalAdjacencyContractCount:
    report.layerA.exactDirectionalAdjacencyContractCount,
  undeclaredObservedContractCount:
    report.layerA.oneToOneCoverage.undeclaredObservedContractCount,
  staleCommittedContractCount:
    report.layerA.oneToOneCoverage.staleCommittedContractCount,
  driftedContractCount:
    report.layerA.oneToOneCoverage.driftedContractCount,
  technicalContractCount: report.layerB.technicalContractCount,
  missingTransitionPairManifestCount:
    report.layerB.missingTransitionPairManifestCount,
  reportIdentitySha256,
}, null, 2));
