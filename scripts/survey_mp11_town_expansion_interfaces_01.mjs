#!/usr/bin/env node
/**
 * MP11-INTERFACE-SURVEY-01 — read-only cross-area candidate screen.
 *
 * The Town Expansion R1 baseline is immutable. This survey intentionally
 * refuses to derive a new target from broad catalog envelopes or an accepted
 * interface: only an observed, uncontracted route/access seam could become a
 * future bounded candidate. It makes no live-world call and emits no ops.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const value = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const AUDIT = value('--audit', 'data/world-review/town-expansion-fresh-global-audit.json');
const CONTRACT = value('--contract', 'docs/redevelopment/2026-07-28-town-expansion/town-expansion-cross-scope-interface-contracts.json');
const DRIFT = value('--drift', 'data/world-review/town-expansion-drift-survey-20260824/town-expansion-drift-survey.json');
const OUT = value('--out', 'data/world-review/mp11-town-expansion-interface-survey-01-historical-20260826.json');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (filename) => crypto.createHash('sha256').update(fs.readFileSync(absolute(filename))).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`MP11 interface survey rejected: ${message}`);
};

const audit = readJson(AUDIT);
const contract = readJson(CONTRACT);
const drift = readJson(DRIFT);
const observed = audit.observedInterfaces ?? [];
const reviewed = audit.reviewedInterfaces ?? [];
const unreviewed = audit.unreviewedInterfaces ?? [];
const contracts = contract.interfaces ?? [];
const pairId = ({ fromScope, toScope }) => `${fromScope} -> ${toScope}`;
// The audit records the ownership pair; the contract supplies the human review
// id. Matching the pair prevents a missing audit-only `interfaceId` field from
// being mistaken for 13 duplicate seams.
const contractPairs = new Set(contracts.map(pairId));
const observedPairs = observed.map(pairId);
const missingContracts = observedPairs.filter((id) => !contractPairs.has(id));
const duplicateObserved = observedPairs.filter((id, index) => observedPairs.indexOf(id) !== index);

invariant(audit.status === 'GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS', `audit status ${audit.status}`);
invariant(contract.status === 'APPROVED_EXACT_DEFAULT_DENY', `contract status ${contract.status}`);
invariant(contract.wildcardsAllowed === false, 'cross-area wildcards are not default-deny');
invariant(observed.length === 13 && reviewed.length === 13 && contracts.length === 13,
  `interface cardinality observed=${observed.length}, reviewed=${reviewed.length}, contract=${contracts.length}`);
invariant(unreviewed.length === 0 && missingContracts.length === 0 && duplicateObserved.length === 0,
  `unresolved interface state unreviewed=${unreviewed.length}, missingContract=${missingContracts.length}, duplicate=${duplicateObserved.length}`);

const report = {
  schemaVersion: 1,
  id: 'MP11-INTERFACE-SURVEY-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'NO_UNCLAIMED_CROSS_AREA_ROUTE_OR_ACCESS_CANDIDATE_OFFLINE',
  liveWorldMutated: false,
  source: {
    type: 'historical accepted audit and retained current-drift evidence only',
    currentLiveCaptureUsed: false,
    acceptedBaseline: 'Town Expansion R1 terminal post is preserved; no baseline operation is generated.',
    files: [
      { path: relative(AUDIT), sha256: sha256(AUDIT) },
      { path: relative(CONTRACT), sha256: sha256(CONTRACT) },
      { path: relative(DRIFT), sha256: sha256(DRIFT) },
    ],
  },
  interfaceGate: {
    auditStatus: audit.status,
    contractStatus: contract.status,
    wildcardsAllowed: contract.wildcardsAllowed,
    canonicalOwnershipAssignments: (audit.canonicalOwnershipAssignments ?? []).length,
    observedInterfaces: observed.length,
    reviewedInterfaces: reviewed.length,
    contractInterfaces: contracts.length,
    unreviewedInterfaces: unreviewed.length,
    missingContracts,
    reviewed: reviewed.map(({ interfaceId, fromScope, toScope, fromOwnershipScope, toOwnershipScope }) => ({
      interfaceId: interfaceId ?? pairId({ fromScope, toScope }),
      fromScope, toScope, fromOwnershipScope, toOwnershipScope,
    })),
  },
  currentEvidenceLimit: {
    driftSourceCurrentSnapshot: drift.currentPost?.snapshot ?? null,
    sampledCells: drift.sampledAreas?.reduce((sum, area) => sum + (area.sampledCells ?? 0), 0) ?? 0,
    naturalCopperOxidation: drift.driftFindings?.naturalCopperOxidation ?? null,
    laterAuthorizedBuild: drift.driftFindings?.laterAuthorizedBuild ?? null,
    genuineDrift: drift.driftFindings?.genuineDrift ?? null,
    disposition: 'The historical 40-cell red-carpet drift was a same-owner repair issue, not an unclaimed cross-area route/access seam; it supplies no authority to alter the accepted R1 baseline or a neighbour interface.',
  },
  candidate: {
    found: false,
    operationCount: 0,
    boundedDryOwnedCandidate: null,
    reason: 'Every observed cross-area seam is already exact-contract owned and reviewed. Broad catalog envelopes, historical route failures, and later-authorized changes are not a new unclaimed interface. No dry candidate can be compiled without a fresh scope-specific source and a newly reviewed exact ownership/interface contract.',
  },
  nextSafeInput: [
    'Fresh immutable snapshot around a newly observed access defect.',
    'Exact one-owner-per-cell scope and any new cross-area interface contract.',
    'Dry/fluid, container/block-entity, entity and normal-walk route evidence before a guarded compiler emits operations.',
  ],
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}\nreport=${relative(OUT)}\ninterfaces=${observed.length}/${reviewed.length}/${contracts.length}\nunreviewed=${unreviewed.length}\noperations=${report.candidate.operationCount}`);
