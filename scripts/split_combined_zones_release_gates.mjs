#!/usr/bin/env node
/**
 * Split the monolithic Masterplan gate list into scope-local gate ledgers.
 * This is a planning/queueing artifact, not authorization and not a waiver.
 */

import fs from 'fs';
import {
  resolveFromRoot,
  relativeToRoot,
  readJson,
  sha256File,
  writeJson,
  boxesIntersect,
} from './lib/combined_zones_release_layer.mjs';

const layerPath = resolveFromRoot('data/world-review/combined-zones-release-layer-20260808.json');
const ownershipPath = resolveFromRoot('data/world-review/combined-zones-release-layer-ownership-20260808.json');
const contractPath = resolveFromRoot('docs/masterplans/05-combined-zones/phase1-release-contract.json');
const outputPath = resolveFromRoot('data/world-review/combined-zones-scoped-gate-ledger-20260808.json');
const layer = readJson(layerPath);
const ownership = readJson(ownershipPath);
const contract = readJson(contractPath);
const unresolvedDecisions = new Set(
  (contract.designDecisions ?? [])
    .filter((decision) => decision.state !== 'RESOLVED')
    .map((decision) => decision.id),
);

const decisionApplicability = {
  D02_C1_CIVIL_ALIGNMENT: new Set(['P1-B03', 'P1-B08', 'P1-B09', 'D02']),
  D05_MOUNTAIN_HYDROLOGY_RELIC_BUFFERS: new Set(['P1-B09', 'P1-B10', 'D02']),
  D06_EMPTY_EIGHT_DETAIL: new Set(['P1-B07', 'D06-RESERVATIONS', 'D06-MECHANISMS']),
};
const protectedOverlapPackages = new Set(
  (ownership.protectedOverlaps ?? []).map((entry) => entry.package),
);
const seamPackages = new Set(
  (ownership.crossPackageIntersections ?? []).flatMap((entry) => [entry.left, entry.right]),
);

const packages = (layer.packages ?? []).map((entry) => {
  const decisions = [...unresolvedDecisions].filter((decisionId) => (
    decisionApplicability[decisionId]?.has(entry.scopeId)
  ));
  const localGates = {
    operationPair: entry.errors.length === 0 && Boolean(entry.forward?.sha256) && Boolean(entry.rollback?.sha256),
    completeBlockStates: entry.forward?.replGroups > 0 && entry.rollback?.replGroups > 0,
    explicitOwner: Boolean(entry.owner),
    protectedCoreClear: !protectedOverlapPackages.has(entry.key),
    exactCrossPackageSeams: !seamPackages.has(entry.key),
    sourceSnapshotBound: Boolean(layer.bindings?.sourceSnapshot?.sha256),
    completeForwardPreflight: false,
    strictParserDryRun: false,
    liveEntityClearance: false,
    externalAuthorization: false,
  };
  const blockers = [
    ...decisions.map((decisionId) => `unresolved-decision:${decisionId}`),
    ...Object.entries(localGates)
      .filter(([, passed]) => !passed)
      .map(([gate]) => `scope-gate:${gate}`),
  ];
  return {
    key: entry.key,
    scopeId: entry.scopeId,
    domain: entry.domain,
    packagePath: entry.manifest?.path ?? null,
    decisionDependencies: decisions,
    localGates,
    status: blockers.length === 0 ? 'READY_FOR_SCOPED_PRERELEASE_GATES' : 'BLOCKED',
    canQueueIndependently: decisions.length === 0 && localGates.operationPair && localGates.completeBlockStates,
    blockers,
  };
});

const globalGates = {
  authority: 'PROJECT_LEVEL_REQUIRES_CURRENT_BINDINGS',
  decisionClosure: 'SPLIT_BY_SCOPE_DEPENDENCY',
  canonicalOwnership: 'SPLIT_BY_EXACT_PACKAGE_AND_INTERFACE_SET',
  protectedFeatures: 'SPLIT_BY_EXACT_PACKAGE_BOUNDS_WITH_GLOBAL_VETO',
  sourceSnapshot: 'SHARED_PER_TRANSACTION_OR_EXPLICITLY_REBOUND_PER_SCOPE',
  executionAuthorization: 'SCOPED_HASH_BOUND_AUTHORIZATION_REQUIRED',
};
const ledger = {
  schemaVersion: 1,
  id: 'combined-zones-scoped-gate-ledger',
  generatedAtUtc: new Date().toISOString(),
  status: packages.some((entry) => entry.canQueueIndependently)
    ? 'SCOPED_QUEUE_AVAILABLE_BUT_NOT_AUTHORIZED'
    : 'NO_SCOPED_PACKAGE_READY',
  policy: 'Separating gates changes dependency scope, not gate strength. Every queued package still requires its own complete preflight, entity clearance, authorization, execution, rollback, and post-verification.',
  sourceBindings: {
    layer: { path: relativeToRoot(layerPath), sha256: sha256File(layerPath) },
    ownership: { path: relativeToRoot(ownershipPath), sha256: sha256File(ownershipPath) },
    contract: { path: relativeToRoot(contractPath), sha256: sha256File(contractPath) },
  },
  globalGates,
  packages,
  queue: packages.filter((entry) => entry.canQueueIndependently).map((entry) => entry.key),
  blocked: packages.filter((entry) => !entry.canQueueIndependently).map((entry) => ({ key: entry.key, blockers: entry.blockers })),
};
writeJson(outputPath, ledger);
console.log(JSON.stringify({ status: ledger.status, output: relativeToRoot(outputPath), queue: ledger.queue, blockedCount: ledger.blocked.length }, null, 2));
