#!/usr/bin/env node
/**
 * Bind the four Combined Zones R00 owner-review packets into one approval
 * identity. Approval of this bundle freezes planning policy and checklists; it
 * cannot convert an evidence HOLD into PASS or authorize physical work.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T23:50:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-owner-review-bundle.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-owner-review-bundle.md',
));

const INPUTS = Object.freeze({
  d02: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  d06: 'docs/masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const d02 = readJson(INPUTS.d02);
const d05 = readJson(INPUTS.d05);
const d06 = readJson(INPUTS.d06);
const b11 = readJson(INPUTS.b11);
const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
  key,
  binding(relativePath, `${key.toUpperCase()} sole-owner review packet`),
]));

assert(d02.id === 'combined-zones-phase1-d02-owner-acceptance-packet', 'D02 packet identity drift');
assert(d05.id === 'combined-zones-phase1-d05-owner-acceptance-packet', 'D05 packet identity drift');
assert(d06.id === 'combined-zones-phase1-d06-owner-acceptance-packet', 'D06 packet identity drift');
assert(b11.id === 'combined-zones-phase1-b11-external-interface-acceptance', 'B11 packet identity drift');
assert(d02.safetyBoundary?.operationCellCount === 0
  && d02.safetyBoundary?.worldEditAuthorized === false, 'D02 safety boundary drift');
assert(d05.safetyBoundary?.operationCellCount === 0
  && d05.safetyBoundary?.worldEditAuthorized === false, 'D05 safety boundary drift');
assert(d06.authority?.operationCellCount === 0
  && d06.authority?.worldEditAuthorized === false, 'D06 safety boundary drift');
assert(b11.safetyBoundary?.operationCellCount === 0
  && b11.safetyBoundary?.worldEditAuthorized === false, 'B11 safety boundary drift');
assert(d02.finalGate?.d02Resolved === false && d02.finalGate?.r00G02Passed === false,
  'D02 must remain unresolved');
assert(d05.disposition?.d05Resolved === false && d05.disposition?.r00G02Passed === false,
  'D05 must remain unresolved');
assert(d06.disposition?.d06Resolved === false && d06.disposition?.r00G02Passed === false,
  'D06 must remain unresolved');
assert(b11.disposition?.p1B11Approved === false && b11.disposition?.g03Passed === false,
  'B11 approval must remain pending');

const bundlePayload = {
  packetBindings: Object.fromEntries(Object.entries(sourceBindings).map(([key, item]) => [
    key,
    { id: { d02: d02.id, d05: d05.id, d06: d06.id, b11: b11.id }[key], sha256: item.sha256 },
  ])),
  acceptedScope: [
    'D02 evidence classification, selected exact raster and capped-sump/no-build planning basis, and the published D02 acceptance checklist',
    'D05 conditional FM-01 material/support/hydrology/relic/transport/ownership policy and its default-deny acceptance checklist',
    'D06/B07 fail-closed reservation basis and the D06-AC-01 through D06-AC-11 technical-development checklist',
    'P1-B11 exact Grand Avenue 68-to-72 profile, exact evidenced anchors, sealed future lines, and zero-cell PassageWay deferral',
  ],
  acceptanceNeverImplies: [
    'that a current HOLD is PASS',
    'that missing complete-save, future-state, mechanism, capacity, owner, interface, route, receiver, or technical evidence exists',
    'D02, D05, D06, R00 G02, R00 G03, or any later release gate PASS',
    'construction ownership, operations, opening, discharge, commissioning, release authorization, or a world edit',
  ],
};
const bundlePayloadSha256 = sha256(`${JSON.stringify(bundlePayload)}\n`);
const copyableStatement = `I, the sole owner, accept Combined Zones R00 owner-review bundle SHA-256 ${bundlePayloadSha256} as the controlling planning-policy and technical-development checklist. I acknowledge every listed limitation and do not mark any current HOLD as PASS or authorize construction, operations, opening, discharge, commissioning, release advancement, or a world edit.`;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-owner-review-bundle',
  generatedAtUtc: GENERATED_AT,
  status: 'READY_FOR_SOLE_OWNER_REVIEW_BUNDLE_ACCEPTANCE_PENDING_ALL_TECHNICAL_HOLDS_RETAINED',
  authority: {
    decisionAuthority: 'sole human project owner',
    additionalHumanDecisionMakersRequired: false,
    ownerAcceptanceRecorded: false,
    bundlePayloadSha256,
    copyableStatement,
  },
  sourceBindings,
  packetSummary: [
    {
      scope: 'D02',
      packetStatus: d02.status,
      decisionStatus: d02.finalGate.status,
      approvedByBundle: false,
      remainingHoldCount: d02.acceptanceSummary.d02BlockerHoldIds.length
        + d02.acceptanceSummary.closedDrainageHoldGateIds.length,
    },
    {
      scope: 'D05',
      packetStatus: d05.status,
      decisionStatus: 'HOLD',
      approvedByBundle: false,
      remainingHoldCount: d05.passHoldMatrix.filter(({ status }) => status === 'HOLD').length,
    },
    {
      scope: 'D06',
      packetStatus: d06.status,
      decisionStatus: 'HOLD',
      approvedByBundle: false,
      remainingHoldCount: d06.disposition.holdCount,
    },
    {
      scope: 'P1-B11',
      packetStatus: b11.status,
      decisionStatus: 'PENDING_OWNER_ACCEPTANCE',
      approvedByBundle: false,
      remainingHoldCount: 1,
    },
  ],
  bundlePayload,
  approvalRecordTemplate: {
    requiredFields: [
      'schemaVersion',
      'id',
      'decision',
      'acceptedBy',
      'acceptedAtUtc',
      'bundlePath',
      'bundleFileSha256',
      'bundlePayloadSha256',
      'copyableStatementAcceptedVerbatim',
    ],
    allowedDecision: 'ACCEPT_PLANNING_POLICY_AND_TECHNICAL_DEVELOPMENT_CHECKLIST',
    currentRecord: null,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
  disposition: {
    readyForSoleOwnerReview: true,
    ownerAcceptanceRecorded: false,
    packetCount: 4,
    p1B11MayFreezeAfterAcceptanceRecord: true,
    technicalHoldMayPassFromThisApproval: false,
    completeSavedWorldStillRequired: true,
    autonomousOfflineTechnicalDevelopmentMayContinue: true,
    r00Passed: false,
  },
};

const markdown = `# Combined Zones Phase 1 sole-owner review bundle\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `This bundles D02, D05, D06, and P1-B11 under one deterministic owner-review identity. Approval freezes the proposed planning policies and the checklists used for further technical work. It does not assert that missing evidence exists.\n\n`
  + `## One approval statement\n\n`
  + `Bundle payload SHA-256: \`${bundlePayloadSha256}\`\n\n`
  + `> ${copyableStatement}\n\n`
  + `## Bound packets\n\n`
  + `| Scope | Packet SHA-256 | Current result |\n|---|---|---|\n`
  + report.packetSummary.map((item) => (
    `| ${item.scope} | \`${sourceBindings[item.scope === 'P1-B11' ? 'b11' : item.scope.toLowerCase()].sha256}\` | ${item.decisionStatus}; ${item.remainingHoldCount} HOLD item(s) |`
  )).join('\n')
  + `\n\n## Approval effect\n\n`
  + `Approval freezes P1-B11 and adopts the D02/D05/D06 planning policies and technical-development checklists. Every technical HOLD stays a HOLD. A complete same-moment saved world, exact future/mechanism cells, owners/interfaces, and independent deterministic checks remain required before R00 can pass.\n\n`
  + `No construction, operation, opening, discharge, commissioning, or world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  bundlePayloadSha256,
  packetCount: report.disposition.packetCount,
  operationCellCount: 0,
}, null, 2)}\n`);
