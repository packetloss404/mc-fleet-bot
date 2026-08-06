#!/usr/bin/env node
/**
 * Resolve D02, D05, and D06 in the Phase 1 design-decision ledger against the
 * recorded EXT-01..EXT-04 sole-owner acceptance submissions.
 *
 * The ledger's own resolveRule permits resolving a choice "compelled by user
 * authority"; the 2026-08-06 build-ready directive and the EXT acceptance
 * record are that authority. Each resolution binds the acceptance record
 * identity and keeps the decision's original evidence and release-lifecycle
 * boundaries in place. No world edit is authorized by this change.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LEDGER = path.join(ROOT, 'docs/masterplans/05-combined-zones/phase1-design-decisions.json');
const EXT = path.join(ROOT, 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json');
const RESOLVED_AT = '2026-08-06T21:10:00Z';

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));

if (ext.status !== 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE') {
  throw new Error('EXT acceptance record is not in the accepted state');
}
const extData = fs.readFileSync(EXT);
const extBinding = {
  path: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  sha256: crypto.createHash('sha256').update(extData).digest('hex'),
  reportIdentitySha256: ext.reportIdentitySha256,
};

const resolutions = {
  D02: {
    selection: 'CONSERVATIVE_CAPPED_CLOSED_DRAINAGE_NO_DIVERSION_BASIS_ACCEPTED',
    basis: [
      'EXT-01 records sole-owner acceptance of the conservative C1 civil basis: ten strict-clear capped sumps, the ROAD-LOW-001 no-build hold, no receiver, no outfall, and no diversion.',
      'ISSUE-002 field/semantic ambiguity stays default-deny and excluded from build scope per the architectural fail-closed endpoint dispositions.',
      'The ledger resolveRule permits resolution compelled by user authority; the 2026-08-06 build-ready directive is that authority.',
    ],
    effects: [
      'The frozen C1 alignment, profiles, cross-section, and capped-drainage planning basis become the accepted Phase 1 design.',
      'Every interface that would depend on an unproven receiver, outfall, or C01 semantic remains closed and outside build scope.',
    ],
  },
  D05: {
    selection: 'FM01_FUTURE_STATE_WITH_SOUTH_OPEN_RESHAPE_AND_ZERO_MARGIN_CORES_ACCEPTED',
    basis: [
      'EXT-02 records sole-owner acceptance of the FM-01 future state, support-material design, B09 technical reservations, and the hash-bound south-open shipwreck reshape composite.',
      'Protected features carry explicit evidence-backed zero-margin default-deny core acceptance plus the one-cell reshape planning margin, satisfying the recorded G06 pass rule.',
      'The complete-save scope clearance proves zero overlap between every proposal domain and all 114 generated starts plus all three frozen protected cores.',
    ],
    effects: [
      'The FM-01 partition and the reshaped composite geometry become the accepted Phase 1 design basis for D05.',
      'The three recorded structure-start extents stay frozen default-deny; the igloo-east empty-bound finding is accepted without a preservation claim.',
    ],
  },
  D06: {
    selection: 'D06_DETAILED_SETOUT_AND_29_COMMISSIONING_SPECIFICATIONS_ACCEPTED_RCON_BEE_RELOCATION',
    basis: [
      'EXT-03 records sole-owner acceptance of the detailed D06 mechanism setout and freezes all 29 commissioning specifications; executed results stay in G17.',
      'The bee-nest relocation method changes to a server-authoritative operator-RCON procedure, superseding the failed bot-client action path and its real-client proof prerequisite; runtime validation moves to G13/G17 with rollback.',
    ],
    effects: [
      'The 9,065-cell canonical D06 proposal becomes the accepted Phase 1 design basis.',
      'All eight future interfaces remain sealed, separately owned, and default-deny.',
    ],
  },
};

for (const decision of ledger.decisions) {
  const resolution = resolutions[decision.id];
  if (!resolution) continue;
  decision.status = 'RESOLVED';
  decision.selection = resolution.selection;
  decision.basis = resolution.basis;
  decision.effects = resolution.effects;
  decision.resolvedAtUtc = RESOLVED_AT;
  decision.resolutionAuthority = extBinding;
  if (decision.closureEvidenceRequired) {
    decision.closureEvidenceSatisfiedBy = extBinding.path;
  }
}

ledger.status = 'ALL_SEVEN_DECISIONS_RESOLVED';
ledger.recordedAtUtc = RESOLVED_AT;
ledger.summary = {
  ...ledger.summary,
  resolvedDecisionIds: ledger.decisions.map((d) => d.id),
  holdDecisionIds: [],
  resolvedCount: ledger.decisions.length,
  holdCount: 0,
  phase1DecisionGatePassed: true,
};
ledger.gateDecision = {
  phase1OfflineDesignMayContinue: true,
  phase1Exit: 'PASS_DESIGN_DECISIONS_RESOLVED',
  advanceToPhysicalPhase: false,
  liveBuildMayProceed: false,
  reason: 'All seven design decisions are resolved against the EXT-01..EXT-04 sole-owner acceptance record. Ownership, entity, source-guard, rollback, pilot, and release gates remain separately required before any physical work.',
};
ledger.externalAcceptanceBinding = extBinding;

fs.writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  status: ledger.status,
  resolved: ledger.summary.resolvedCount,
  hold: ledger.summary.holdCount,
  phase1DecisionGatePassed: ledger.summary.phase1DecisionGatePassed,
}, null, 2));
