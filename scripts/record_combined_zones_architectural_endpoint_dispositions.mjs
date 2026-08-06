#!/usr/bin/env node
/** Record architect-directed, fail-closed dispositions for unresolved G05 endpoints. */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const WORKLIST = 'docs/masterplans/05-combined-zones/phase1-g05-endpoint-candidate-worklist.json';
const OUTPUT = 'docs/masterplans/05-combined-zones/phase1-g05-architectural-endpoint-dispositions.json';
const MARKDOWN = 'docs/masterplans/05-combined-zones/phase1-g05-architectural-endpoint-dispositions.md';
const bytes = fs.readFileSync(path.join(ROOT, WORKLIST));
const worklist = JSON.parse(bytes);
if (worklist.summary?.endpointCount !== 13) throw new Error('Expected the bounded 13-row endpoint worklist');

const rows = worklist.rows.map((row) => ({
  contractId: row.contractId,
  disposition: row.sourceSideCandidate
    ? 'RETAIN_SOURCE_SIDE_RESERVATION_CLOSED_TO_UNASSIGNED_COUNTERPART'
    : 'EXCLUDE_FROM_BUILD_SCOPE_DEFAULT_DENY_NO_EXACT_SOURCE_DATUM',
  constructionAuthorizedForThisEndpoint: false,
  openingAuthorized: false,
  counterpartOwnerId: null,
  receiverId: null,
  beforeStateSetSha256: null,
  futureStateSetSha256: null,
  interfaceAccepted: false,
  rationale: row.sourceSideCandidate
    ? 'Existing source-side geometry is retained as a non-opening reservation; no counterpart or transfer is inferred.'
    : 'No exact source-side datum exists in the reviewed plans; no geometry or opening is invented.',
}));

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g05-architectural-endpoint-dispositions',
  generatedAtUtc: '2026-08-06T00:00:00Z',
  status: 'ARCHITECTURAL_FAIL_CLOSED_DISPOSITIONS_RECORDED_R00_TECHNICAL_HOLDS_RETAINED',
  authority: 'Delegated architect direction from the sole project owner in the current instruction.',
  purpose: 'Freeze the smallest conservative proposal scope without fabricating external counterpart facts or future-state acceptance.',
  sourceWorklist: {
    path: WORKLIST,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    reportIdentitySha256: worklist.reportIdentitySha256,
  },
  rows,
  summary: {
    endpointCount: rows.length,
    sourceReservationsRetainedClosed: rows.filter((row) => row.disposition.startsWith('RETAIN')).length,
    excludedFromBuildScope: rows.filter((row) => row.disposition.startsWith('EXCLUDE')).length,
    counterpartAssignments: 0,
    acceptedInterfaces: 0,
    operationCellCount: 0,
    worldEditsAuthorized: false,
    r00Pass: false,
  },
  truthfulBoundary: [
    'This is an architectural proposal disposition, not technical acceptance.',
    'It does not create endpoint geometry, transition manifests, before/future state hashes, or owner acceptance.',
    'The 13 unresolved endpoints remain outside executable construction scope.',
  ],
};
const reportIdentitySha256 = crypto.createHash('sha256')
  .update(JSON.stringify(reportWithoutIdentity)).digest('hex');
const report = { ...reportWithoutIdentity, reportIdentitySha256 };
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# Combined Zones Phase 1 G05 architectural endpoint dispositions', '',
  `**Status:** ${report.status}`, `**Report identity:** \`${reportIdentitySha256}\``, '',
  'The architect-directed proposal is fail-closed: unresolved interfaces remain closed or outside build scope.', '',
  '| Endpoint | Disposition | Executable opening |', '|---|---|---|',
  ...rows.map((row) => `| ${row.contractId} | ${row.disposition} | No |`), '',
  '## Truthful boundary', '',
  '- 0 counterpart assignments and 0 accepted interfaces were invented.',
  '- Operation cell count is 0; no world edit is authorized by this record.',
  '- This narrows the proposal build scope but does not make R00/G05 PASS.', '',
].join('\n');
fs.writeFileSync(path.join(ROOT, MARKDOWN), `${md}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: OUTPUT,
  markdown: MARKDOWN,
  summary: report.summary,
  reportIdentitySha256,
}, null, 2));
