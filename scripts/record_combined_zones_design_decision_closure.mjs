#!/usr/bin/env node
/**
 * Additively resolve the three remaining Phase 1 design decisions (D02, D05,
 * D06) against the EXT-01..EXT-04 sole-owner acceptance record.
 *
 * The committed decision ledger stays byte-identical: its hash is bound by the
 * C1 pilot audit, the D05 buffer design, the D02 packets, and the owner-review
 * chain, so this closure follows the repo's additive pattern instead of
 * rewriting an input. The ledger's own resolveRule permits resolving a choice
 * "compelled by user authority"; the 2026-08-06 build-ready directive recorded
 * in the EXT submissions is that authority.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T21:15:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-design-decision-closure.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-design-decision-closure.md'));

const INPUTS = Object.freeze({
  designDecisions: 'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const binding = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};
function invariant(condition, message) {
  if (!condition) throw new Error(`Design decision closure rejected: ${message}`);
}

const ledger = readJson(INPUTS.designDecisions);
const ext = readJson(INPUTS.externalAcceptance);

invariant(ledger.summary?.holdDecisionIds?.join(',') === 'D02,D05,D06',
  'ledger hold set drifted from D02/D05/D06');
invariant(ext.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE',
  'EXT acceptance record is not in the accepted state');

const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, p]) => [key, binding(p)]),
);

const resolutions = [
  {
    id: 'D02',
    topic: 'exact C1 highway civil solution',
    status: 'RESOLVED',
    selection: 'CONSERVATIVE_CAPPED_CLOSED_DRAINAGE_NO_DIVERSION_BASIS_ACCEPTED',
    acceptanceSubmissionId: 'EXT-01-CIVIL-CORRIDOR',
    basis: [
      'EXT-01 records sole-owner acceptance of the conservative C1 civil basis: ten strict-clear capped sumps, the ROAD-LOW-001 no-build hold, no receiver, no outfall, and no diversion.',
      'ISSUE-002 field/semantic ambiguity stays default-deny and excluded from build scope per the architectural fail-closed endpoint dispositions.',
    ],
    effects: [
      'The frozen C1 alignment, profiles, cross-section, and capped-drainage planning basis become the accepted Phase 1 design.',
      'Every interface that would depend on an unproven receiver, outfall, or C01 semantic remains closed and outside build scope.',
    ],
  },
  {
    id: 'D05',
    topic: 'mountain hydrology and protected relic buffers',
    status: 'RESOLVED',
    selection: 'FM01_FUTURE_STATE_WITH_SOUTH_OPEN_RESHAPE_AND_ZERO_MARGIN_CORES_ACCEPTED',
    acceptanceSubmissionId: 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED',
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
  {
    id: 'D06',
    topic: 'Empty Eight architecture, life safety, and future interfaces',
    status: 'RESOLVED',
    selection: 'D06_DETAILED_SETOUT_AND_29_COMMISSIONING_SPECIFICATIONS_ACCEPTED_RCON_BEE_RELOCATION',
    acceptanceSubmissionId: 'EXT-03-D06-LIFE-SAFETY-AND-RUNTIME',
    basis: [
      'EXT-03 records sole-owner acceptance of the detailed D06 mechanism setout and freezes all 29 commissioning specifications; executed results stay in G17.',
      'The bee-nest relocation method changes to a server-authoritative operator-RCON procedure, superseding the failed bot-client action path and its real-client proof prerequisite; runtime validation moves to G13/G17 with rollback.',
    ],
    effects: [
      'The 9,065-cell canonical D06 proposal becomes the accepted Phase 1 design basis.',
      'All eight future interfaces remain sealed, separately owned, and default-deny.',
    ],
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-design-decision-closure',
  generatedAtUtc: GENERATED_AT,
  status: 'ALL_SEVEN_DECISIONS_RESOLVED_ADDITIVE_LEDGER_UNMODIFIED',
  authority: {
    source: 'sole-owner build-ready directive and EXT-01..EXT-04 acceptance record',
    resolveRuleApplied: ledger.decisionPolicy.resolveRule,
    externalAcceptanceReportIdentitySha256: ext.reportIdentitySha256,
    worldEditAuthorized: false,
  },
  sourceBindings,
  ledgerIdentity: {
    ledgerFileSha256: sourceBindings.designDecisions.sha256,
    ledgerStatus: ledger.status,
    ledgerModified: false,
    priorResolvedDecisionIds: ledger.summary.resolvedDecisionIds,
    priorHoldDecisionIds: ledger.summary.holdDecisionIds,
  },
  resolutions,
  effectiveSummary: {
    decisionCount: ledger.summary.decisionCount,
    resolvedDecisionIds: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07'],
    holdDecisionIds: [],
    resolvedCount: 7,
    holdCount: 0,
    phase1DecisionGatePassed: true,
  },
  gateDecision: {
    phase1OfflineDesignMayContinue: true,
    phase1Exit: 'PASS_DESIGN_DECISIONS_RESOLVED',
    advanceToPhysicalPhase: false,
    liveBuildMayProceed: false,
    reason: 'All seven design decisions are resolved: four in the committed ledger and three by this additive closure bound to the EXT-01..EXT-04 sole-owner acceptance record. Ownership, entity, source-guard, rollback, pilot, and release gates remain separately required before any physical work.',
  },
  safetyBoundary: {
    operationCellCount: 0,
    worldEditAuthorized: false,
    ledgerMutated: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);

const markdown = `# Combined Zones design-decision closure (D02, D05, D06)

Status: **${report.status}**

The committed decision ledger stays byte-identical; this additive record resolves its three remaining HOLD decisions against the EXT-01..EXT-04 sole-owner acceptance record (\`${ext.reportIdentitySha256}\`).

- **D02** → \`${resolutions[0].selection}\` (EXT-01)
- **D05** → \`${resolutions[1].selection}\` (EXT-02)
- **D06** → \`${resolutions[2].selection}\` (EXT-03)

Effective decision state: **7/7 resolved**, phase1DecisionGatePassed: **true**. Live build authority is **not** granted by this record.

Report identity: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  resolvedCount: report.effectiveSummary.resolvedCount,
  phase1DecisionGatePassed: report.effectiveSummary.phase1DecisionGatePassed,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
