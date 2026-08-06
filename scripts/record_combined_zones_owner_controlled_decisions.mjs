#!/usr/bin/env node
/** Record explicit owner-controlled planning choices without passing technical gates. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-06T10:00:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-owner-controlled-decisions.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-owner-controlled-decisions.md'));
const INPUTS = {
  packet: 'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.json',
  r00: 'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  d06Treatment: 'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
};
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const binding = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};
const packet = read(INPUTS.packet);
const r00 = read(INPUTS.r00);
const composite = read(INPUTS.composite);
const d06Treatment = read(INPUTS.d06Treatment);

if (packet.summary?.b12FullTechnicalReviewAvoidedByRecommendedDeferral !== true) {
  throw new Error('B12 deferral recommendation drift');
}
if (r00.summary?.shipwreckBestChoiceRecommendedAlternativeId
  !== 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE') {
  throw new Error('shipwreck planning choice drift');
}
if (d06Treatment.treatmentPayload?.selectedPlanningAlternativeId
  !== 'D06-BEE-02-HUMANE-INTACT-RELOCATION') {
  throw new Error('D06 humane relocation choice drift');
}

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-owner-controlled-decisions',
  generatedAtUtc: GENERATED_AT,
  status: 'OWNER_CONTROLLED_PLANNING_CHOICES_RECORDED_TECHNICAL_HOLDS_REMAIN',
  authority: {
    source: 'explicit owner instruction in current project conversation',
    ownerControlledChoiceCount: 3,
    technicalAcceptanceClaimed: false,
    worldEditAuthorized: false,
  },
  sourceBindings: Object.fromEntries(Object.entries(INPUTS).map(([key, p]) => [key, binding(p)])),
  decisions: [
    {
      id: 'OWNER-SCOPE-P1-B12-DEFER-NOW',
      decision: 'DEFER_P1_B12_PHYSICAL_SHELL_RETAIN_NO_FORECLOSURE_RESERVATION',
      constructNow: false,
      fitOutNow: false,
      retainNoForeclosureReservation: true,
      technicalAcceptanceClaimed: false,
    },
    {
      id: 'OWNER-D05-SHIPWRECK-PRESERVE-RESHAPE',
      decision: 'PRESERVE_WITH_HASH_BOUND_COMPOSITE_SOUTH_OPEN_P1_B10_RESHAPE',
      compositeCanonicalPayloadSha256:
        composite.compositeCanonicalModel.compositeCanonicalPayloadSha256,
      expertPositiveMarginAccepted: false,
      technicalAcceptanceClaimed: false,
    },
    {
      id: 'OWNER-D06-BEE-HUMANE-RELOCATION-PLANNING',
      decision: 'HUMANE_INTACT_RELOCATION',
      destinationCandidate: { x: 1811, y: 67, z: 378 },
      runtimeMechanicProven: false,
      technicalAcceptanceClaimed: false,
    },
  ],
  unresolvedExternalInputs: {
    packetExternalSubmissionCount: packet.summary.externalSubmissionCount,
    nullEndpointCount: packet.summary.nullEndpointContractCount,
    ownerAcceptancePrerequisite: 'EXT-01, EXT-02, and EXT-03 must be accepted before the integrated owner record.',
    d06DisposableRuntimeAuthorization: 'Not granted by this planning-decision record.',
  },
  disposition: {
    r00Passed: false,
    buildAuthorized: true,
    worldConstructionAuthorized: false,
    documentationPublicationAsReadyAuthorized: false,
    operationCount: 0,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);
const markdown = `# Combined Zones Owner-Controlled Decisions\n\nStatus: **${report.status}**\n\nThis additive record resolves three owner-controlled planning choices from existing evidence. It does not self-issue technical acceptance, owner/interface acceptance, runtime proof, operations, or world-edit authority.\n\n- B12: defer physical shell, retain no-foreclosure reservation.\n- D05/shipwreck: preserve with the hash-bound south-open P1-B10 reshape.\n- D06: humane intact relocation planning basis, destination candidate \`1811,67,378\`.\n\nRemaining external submissions: **${report.unresolvedExternalInputs.packetExternalSubmissionCount}**; null endpoint contracts: **${report.unresolvedExternalInputs.nullEndpointCount}**.\n\nR00: **HOLD**. Code/artifact build: **authorized**. World construction: **not authorized by this record**.\n\nReport identity: \`${report.reportIdentitySha256}\`\n`;
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({ status: report.status, reportIdentitySha256: report.reportIdentitySha256,
  output: OUTPUT, markdown: MARKDOWN, decisions: report.authority.ownerControlledChoiceCount }, null, 2));
