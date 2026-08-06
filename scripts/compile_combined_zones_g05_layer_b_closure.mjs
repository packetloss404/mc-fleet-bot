#!/usr/bin/env node
/**
 * Compile the additive G05 Layer B closure record for all 161 directional
 * interface contracts.
 *
 * The proposed ownership/interface registry stays byte-identical: its record
 * identities are woven into the composite payload and every downstream audit,
 * so Layer B closes here in an additive record bound to the registry by hash —
 * the same pattern the technical source refresh used for stale save rows.
 *
 * Closure semantics per contract:
 * - Before states bind (immutable complete-save identity x exact coordinate
 *   set hash). The save is immutable and the coordinate set is exact, so the
 *   per-cell before states are fully determined; extraction is deferred to the
 *   release-stage preflight that reads the regions anyway.
 * - Future states bind the accepted design-basis artifact set for the
 *   contract's scope under the sealed default-deny doctrine accepted in
 *   EXT-04.
 * - Pair manifests reuse the registry's 109 exact hashes; the 52 null fields
 *   carry the reconciliation audit's explicit reviewed dispositions (alias,
 *   terminal cap, shared boundary, precedence, or closed endpoint).
 * - The 13 null-endpoint contracts close via the architectural fail-closed
 *   dispositions: they stay sealed with zero cells, so no state or manifest
 *   evidence can or need exist for them.
 * - Acceptance binds the sole-owner EXT-04 integrated record against the
 *   immutable registry/composite/save identities.
 *
 * This record emits zero operations and authorizes no world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-06T21:20:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.md'));

const INPUTS = Object.freeze({
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  endpointDispositions: 'docs/masterplans/05-combined-zones/phase1-g05-architectural-endpoint-dispositions.json',
  endpointWorklist: 'docs/masterplans/05-combined-zones/phase1-g05-endpoint-candidate-worklist.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  decisionClosure: 'docs/masterplans/05-combined-zones/phase1-design-decision-closure.json',
});

const DESIGN_BASIS_BY_SCOPE_FAMILY = Object.freeze({
  D02: [
    'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
    'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
    'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
  ],
  D05: [
    'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
    'docs/masterplans/05-combined-zones/phase1-d05-support-material-design.json',
  ],
  D06: [
    'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
    'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
    'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  ],
  B09: [
    'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  ],
  B11: [
    'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
    'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  ],
  GLOBAL: [
    'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  ],
});

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`G05 Layer B closure rejected: ${message}`);
  }
}
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const binding = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};

// The pair reconciliation audit is referenced by its stable classification
// payload rather than bound by file hash: its remaining-hold section reflects
// downstream G05 state and would otherwise create a binding cycle with the
// global geometry audit that consumes this closure record.
const PAIR_RECONCILIATION_PATH = 'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.json';
const registry = readJson(INPUTS.registry);
const reconciliation = readJson(PAIR_RECONCILIATION_PATH);
const dispositions = readJson(INPUTS.endpointDispositions);
const worklist = readJson(INPUTS.endpointWorklist);
const ext = readJson(INPUTS.externalAcceptance);
const completeSave = readJson(INPUTS.completeSave);
const composite = readJson(INPUTS.composite);
const decisionClosure = readJson(INPUTS.decisionClosure);

const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, p]) => [key, binding(p)]),
);
const designBasisBindings = Object.fromEntries(
  Object.entries(DESIGN_BASIS_BY_SCOPE_FAMILY).map(([family, paths]) => [
    family,
    paths.map((p) => binding(p)),
  ]),
);

invariant(ext.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE',
  'EXT acceptance record is not in the accepted state');
invariant(decisionClosure.effectiveSummary?.phase1DecisionGatePassed === true
  && decisionClosure.status === 'ALL_SEVEN_DECISIONS_RESOLVED_ADDITIVE_LEDGER_UNMODIFIED',
'design-decision closure record has unresolved decisions');
invariant(completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'accepted complete save is not passing');
invariant(reconciliation.sourceBindings?.registry?.sha256 === sourceBindings.registry.sha256
  && reconciliation.registryBinding?.canonicalPayloadSha256 === registry.canonicalPayloadSha256,
'pair reconciliation audit is bound to a different registry');
const reconciliationClassificationSha256 = sha256(
  `combined-zones-pair-reconciliation-records-v1\n${JSON.stringify(reconciliation.reconciliation?.records ?? [])}\n`,
);

const completeSaveSha256 = completeSave.packageIdentity.completeSaveSha256;
const compositePayloadSha256 = composite.compositeCanonicalModel.compositeCanonicalPayloadSha256;
const registryPayloadSha256 = registry.canonicalPayloadSha256;
const extIdentity = ext.reportIdentitySha256;

const contracts = registry.proposedDirectionalInterfaceRegistry.contracts;
invariant(contracts.length === 161, 'expected exactly 161 directional contracts');

const reconciliationByContract = new Map(
  (reconciliation.reconciliation?.records ?? []).map((record) => [record.contractId, record]),
);
const dispositionByContract = new Map(
  (dispositions.rows ?? []).map((record) => [record.contractId, record]),
);

function scopeFamily(scope) {
  if (scope.includes('D02') || scope.includes('C01')) return 'D02';
  if (scope.includes('D05')) return 'D05';
  if (scope.includes('D06')) return 'D06';
  if (scope.includes('B09')) return 'B09';
  if (scope.includes('B11') || scope.includes('B12')) return 'B11';
  return 'GLOBAL';
}

function designBasisFor(scope) {
  const family = scopeFamily(scope);
  const bindings = designBasisBindings[family];
  const lines = bindings.map((b) => `${b.path}:${b.sha256}`).sort();
  return {
    family,
    artifacts: bindings.map((b) => ({ path: b.path, sha256: b.sha256 })),
    designBasisSetSha256: sha256(`combined-zones-design-basis-set-v1\n${lines.join('\n')}\n`),
  };
}

const closures = [];
const counters = {
  exactPairManifestReused: 0,
  pairNotApplicableDisposition: 0,
  canonicalAliasReference: 0,
  closedNullEndpoint: 0,
  exactCellBeforeStateBindings: 0,
};

for (const contract of contracts) {
  const reconRecord = reconciliationByContract.get(contract.contractId) ?? null;
  const endpointDisposition = dispositionByContract.get(contract.contractId) ?? null;
  const hasCells = contract.interfaceCellSet !== null;
  const isNullEndpoint = !hasCells;

  let pairManifestClosure;
  if (contract.transitionPairManifestSha256 !== null) {
    pairManifestClosure = {
      kind: 'EXACT_REGISTRY_MANIFEST',
      transitionPairManifestSha256: contract.transitionPairManifestSha256,
    };
    counters.exactPairManifestReused += 1;
  } else if (isNullEndpoint) {
    pairManifestClosure = {
      kind: 'VOID_ENDPOINT_CLOSED',
      basis: 'The endpoint is closed by architectural disposition with zero cells; no seam pair can exist.',
    };
  } else if (reconRecord?.classification === 'CANONICAL_ADJACENCY_ALIAS') {
    pairManifestClosure = {
      kind: 'CANONICAL_ALIAS_REFERENCE',
      disposition: reconRecord.pairManifestDisposition,
      basis: 'Same physical seam as the canonical adjacency contract; a second manifest must not be counted.',
    };
    counters.canonicalAliasReference += 1;
  } else {
    invariant(reconRecord !== null,
      `contract ${contract.contractId} lacks both a manifest and a reconciliation record`);
    pairManifestClosure = {
      kind: 'REVIEWED_NOT_APPLICABLE',
      classification: reconRecord.classification,
      disposition: reconRecord.pairManifestDisposition,
    };
    counters.pairNotApplicableDisposition += 1;
  }

  let beforeState;
  let futureState;
  let endpointClosure = null;
  if (hasCells) {
    const coordinateSetSha256 = contract.interfaceCellSet.coordinateSetSha256;
    beforeState = {
      doctrine: 'COMPLETE_SAVE_DETERMINED_EXTRACTION_AT_PREFLIGHT',
      completeSaveSha256,
      coordinateSetSha256,
      bindingSha256: sha256(`combined-zones-before-state-binding-v1\n${completeSaveSha256}\n${coordinateSetSha256}\n`),
    };
    counters.exactCellBeforeStateBindings += 1;
    const basis = designBasisFor(contract.scope);
    futureState = {
      doctrine: contract.scope.startsWith('G04-GLOBAL')
        ? 'SEALED_ADJACENCY_STATES_FOLLOW_OWNING_DOMAIN_ACCEPTED_DESIGN'
        : 'ACCEPTED_DESIGN_BASIS_SEALED_DEFAULT_DENY',
      designBasisFamily: basis.family,
      designBasisSetSha256: basis.designBasisSetSha256,
      bindingSha256: sha256(`combined-zones-future-state-binding-v1\n${basis.designBasisSetSha256}\n${coordinateSetSha256}\n`),
    };
  } else {
    invariant(endpointDisposition !== null,
      `null-endpoint contract ${contract.contractId} has no architectural disposition`);
    const dispositionCode = endpointDisposition.disposition
      ?? endpointDisposition.dispositionCode ?? null;
    invariant(typeof dispositionCode === 'string' && dispositionCode.length > 0,
      `null-endpoint contract ${contract.contractId} disposition code missing`);
    endpointClosure = {
      kind: 'CLOSED_BY_ARCHITECTURAL_FAIL_CLOSED_DISPOSITION',
      disposition: dispositionCode,
      dispositionReportSha256: dispositions.reportIdentitySha256,
      executableOpening: false,
      receiverRequired: false,
    };
    beforeState = {
      doctrine: 'NO_CELLS_CLOSED_ENDPOINT',
      completeSaveSha256,
      bindingSha256: sha256(`combined-zones-before-state-binding-v1\n${completeSaveSha256}\n${contract.contractId}\nCLOSED\n`),
    };
    futureState = {
      doctrine: 'REMAINS_CLOSED_DEFAULT_DENY_NO_DESIGNED_CHANGE',
      bindingSha256: sha256(`combined-zones-future-state-binding-v1\nCLOSED\n${contract.contractId}\n`),
    };
    counters.closedNullEndpoint += 1;
  }

  closures.push({
    contractId: contract.contractId,
    scope: contract.scope,
    fromOwnerId: contract.fromOwnerId,
    toOwnerId: contract.toOwnerId,
    interfaceCellCount: contract.interfaceCellSet?.cellCount ?? 0,
    endpointClosure,
    pairManifestClosure,
    beforeState,
    futureState,
    acceptance: {
      accepted: true,
      acceptedBy: 'SOLE_OWNER_EXT_04_INTEGRATED_RECORD',
      acceptedAtUtc: GENERATED_AT,
      acceptedAgainst: {
        registryCanonicalPayloadSha256: registryPayloadSha256,
        compositeCanonicalPayloadSha256: compositePayloadSha256,
        completeSaveSha256,
        externalAcceptanceReportIdentitySha256: extIdentity,
      },
    },
  });
}

invariant(counters.closedNullEndpoint === 13, 'expected exactly 13 closed null endpoints');
invariant(counters.exactPairManifestReused === 109, 'expected 109 exact registry pair manifests');
invariant(closures.length === 161, 'closure row count drifted from 161');

const closurePayloadSha256 = sha256(`combined-zones-g05-layer-b-closure-v1\n${JSON.stringify(closures)}\n`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g05-layer-b-closure',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_LAYER_B_CLOSED_ADDITIVE_RECORD_REGISTRY_UNMODIFIED',
  purpose: 'Close the G05 Layer B technical/state/acceptance worklists for all 161 directional contracts without modifying the immutable proposed registry.',
  authority: {
    source: 'sole-owner build-ready directive and EXT-01..EXT-04 acceptance record',
    externalAcceptanceReportIdentitySha256: extIdentity,
    worldEditAuthorized: false,
  },
  sourceBindings,
  designBasisBindings,
  pairReconciliationReference: {
    path: PAIR_RECONCILIATION_PATH,
    classificationRecordsSha256: reconciliationClassificationSha256,
    bindingKind: 'STABLE_CLASSIFICATION_PAYLOAD_REFERENCE_NOT_FILE_HASH',
  },
  registryIdentity: {
    registryFileSha256: sourceBindings.registry.sha256,
    registryCanonicalPayloadSha256: registryPayloadSha256,
    registryModified: false,
  },
  closureSummary: {
    totalContractCount: closures.length,
    closedContractCount: closures.length,
    exactCellContractCount: counters.exactCellBeforeStateBindings,
    closedNullEndpointCount: counters.closedNullEndpoint,
    exactPairManifestReusedCount: counters.exactPairManifestReused,
    canonicalAliasReferenceCount: counters.canonicalAliasReference,
    pairNotApplicableDispositionCount: counters.pairNotApplicableDisposition,
    beforeStateBindingCount: closures.length,
    futureStateBindingCount: closures.length,
    acceptedContractCount: closures.length,
    unacceptedContractCount: 0,
    layerBClosed: true,
  },
  stateDoctrine: {
    beforeStates: 'Bound as (immutable complete-save identity x exact coordinate-set hash); per-cell extraction is deferred to the release-stage preflight that reads the same regions.',
    futureStates: 'Bound to the hash-bound accepted design-basis artifact set per scope family under the sealed default-deny doctrine; closed endpoints have no designed change.',
    honestyBoundary: 'These are exact deterministic bindings, not extracted per-cell state lists. Preflight must extract and re-verify per-cell states against these bindings before any operation executes.',
  },
  closurePayloadSha256,
  contracts: closures,
  safetyBoundary: {
    liveCallsPerformed: false,
    operationCellCount: 0,
    worldEditAuthorized: false,
    registryMutated: false,
  },
};
const reportIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, reportIdentitySha256 };

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# Combined Zones G05 Layer B closure

Status: **${report.status}**

All ${report.closureSummary.totalContractCount} directional interface contracts are closed by this additive record while the proposed registry stays byte-identical (payload \`${registryPayloadSha256}\`).

- Exact-cell contracts with before/future state bindings: **${report.closureSummary.exactCellContractCount}**
- Null endpoints closed by architectural fail-closed disposition: **${report.closureSummary.closedNullEndpointCount}**
- Registry pair manifests reused: **${report.closureSummary.exactPairManifestReusedCount}**; reviewed not-applicable dispositions: **${report.closureSummary.pairNotApplicableDispositionCount}**; canonical alias references: **${report.closureSummary.canonicalAliasReferenceCount}**
- Accepted contracts: **${report.closureSummary.acceptedContractCount}/161** by \`${report.contracts[0].acceptance.acceptedBy}\`

Before states bind (complete save \`${completeSaveSha256.slice(0, 16)}…\` × exact coordinate sets); per-cell extraction happens at preflight. Future states bind the accepted design-basis sets under sealed default-deny doctrine.

Closure payload: \`${closurePayloadSha256}\`
Report identity: \`${reportIdentitySha256}\`
`;
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  closedContractCount: report.closureSummary.closedContractCount,
  closedNullEndpointCount: report.closureSummary.closedNullEndpointCount,
  closurePayloadSha256,
  reportIdentitySha256,
}, null, 2));
