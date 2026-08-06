#!/usr/bin/env node
/**
 * Compile the smallest read-only worklist for the 13 G05 undefined endpoints.
 *
 * Existing source-side geometry is recorded as a candidate only. This script
 * never promotes a candidate, invents a counterpart, accepts an owner, or
 * writes an operation/world state.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T00:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-g05-endpoint-candidate-worklist.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g05-endpoint-candidate-worklist.md',
));

const INPUTS = Object.freeze({
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d02: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d06: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  pairAudit: 'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.json',
});

const NULL_IDS = [
  'IF-D02-MAINTENANCE-ACCESS',
  'IF-D02-PUMP-POWER-CONTROL',
  'IF-D02-OVERFLOW-RECEIVER',
  'IF-D05-HYDROLOGY-TO-RECEIVER',
  'IF-D06-CIRCUIT-NORMAL-TO-POWER-SOURCE',
  'IF-D06-CIRCUIT-EMERGENCY-A-TO-POWER-SOURCE',
  'IF-D06-CIRCUIT-EMERGENCY-B-TO-POWER-SOURCE',
  'IF-D06-B07-TO-SURFACE',
  'IF-D06-B07-TO-LOWER-LOBBY',
  'IF-D06-B07-TO-WATER-RECEIVER',
  'IF-P1-B11-DRAINAGE-TO-RECEIVER',
  'IF-P1-B11-DRY-UTILITY-TO-SERVICE',
  'IF-P1-B11-WET-UTILITY-TO-SERVICE',
];

function absolute(relativePath) { return path.join(ROOT, relativePath); }
function readJson(relativePath) { return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8')); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function binding(relativePath, role) {
  const bytes = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes), role };
}
function invariant(condition, message) {
  if (!condition) throw new Error(`Endpoint candidate worklist rejected: ${message}`);
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
  key,
  binding(filename, `read-only ${key} source`),
]));
const registry = readJson(INPUTS.registry);
const pairAudit = readJson(INPUTS.pairAudit);
const contracts = registry.proposedDirectionalInterfaceRegistry.contracts;
const byId = new Map(contracts.map((contract) => [contract.contractId, contract]));
invariant(NULL_IDS.every((id) => byId.has(id)), 'one or more expected endpoint IDs are absent');
invariant(NULL_IDS.every((id) => !byId.get(id).interfaceCellSet), 'a listed endpoint unexpectedly has exact geometry');
invariant(pairAudit.reconciliation?.classificationCounts?.undefinedEndpoint === 13,
  'pair reconciliation no longer reports 13 undefined endpoints');

const sourceCandidates = {
  'IF-D06-CIRCUIT-NORMAL-TO-POWER-SOURCE': {
    kind: 'RESERVATION_FACE_CANDIDATE',
    bounds: { minX: 1754, maxX: 1756, minY: 44, maxY: 44, minZ: 156, maxZ: 158 },
    cellCount: 9,
    coordinateSetSha256: 'cfc0dbb63e4ffac0dbbd649937e802eaad2bf5eee56ec3ab141b75048e535373',
  },
  'IF-D06-CIRCUIT-EMERGENCY-A-TO-POWER-SOURCE': {
    kind: 'RESERVATION_FACE_CANDIDATE',
    bounds: { minX: 1754, maxX: 1756, minY: 45, maxY: 45, minZ: 156, maxZ: 158 },
    cellCount: 9,
    coordinateSetSha256: 'dd38ac9670650f3edd73836b00368065da60135037474b95e50aef6f95be4a2f',
  },
  'IF-D06-CIRCUIT-EMERGENCY-B-TO-POWER-SOURCE': {
    kind: 'RESERVATION_FACE_CANDIDATE',
    bounds: { minX: 1754, maxX: 1756, minY: 47, maxY: 47, minZ: 156, maxZ: 158 },
    cellCount: 9,
    coordinateSetSha256: '2f1f2e0a784514dd1f9787c287329f54770ab0fb5bbbc20c00ce9a606670a1ad',
  },
  'IF-D06-B07-TO-SURFACE': {
    kind: 'SURFACE_TOP_FACE_CANDIDATE',
    bounds: { minX: 2105, maxX: 2111, minY: 72, maxY: 72, minZ: -401, maxZ: -395 },
    cellCount: 49,
    coordinateSetSha256: '322daec135c261ba64f968aef2ac4f471c2691a13c1b0038800b7d8e43bf6c84',
  },
  'IF-P1-B11-DRAINAGE-TO-RECEIVER': {
    kind: 'TERMINUS_CANDIDATE',
    cells: [{ x: 1750, y: 67, z: -304 }, { x: 1750, y: 67, z: -295 },
      { x: 2048, y: 71, z: -332 }, { x: 2048, y: 71, z: -323 }],
    cellCount: 4,
    coordinateSetSha256: 'd957c2ddaff46103fe007032bfea537dbd13b78bfa2789cc175d91e6b00529bc',
  },
  'IF-P1-B11-DRY-UTILITY-TO-SERVICE': {
    kind: 'TERMINUS_CANDIDATE',
    cells: [{ x: 1750, y: 66, z: -304 }, { x: 2048, y: 70, z: -332 }],
    cellCount: 2,
    coordinateSetSha256: 'ed86568f3886df58832390fce57c337f4ae5bbafb6c0f692ac45976e453af394',
  },
  'IF-P1-B11-WET-UTILITY-TO-SERVICE': {
    kind: 'TERMINUS_CANDIDATE',
    cells: [{ x: 1750, y: 66, z: -295 }, { x: 2048, y: 70, z: -323 }],
    cellCount: 2,
    coordinateSetSha256: 'ecc852023b8b92f2768a3339d5047069ccb5db528789c201c19b86e6d918decd',
  },
};

const sourceEvidence = {
  d06: ['connectorGeometry', 'd06'],
  b07: ['connectorGeometry'],
  b11: ['b11'],
  d02: ['d02'],
  d05: ['d05'],
};
const rows = NULL_IDS.map((contractId) => {
  const contract = byId.get(contractId);
  const candidate = sourceCandidates[contractId] ?? null;
  const family = contractId.startsWith('IF-D02-') ? 'D02' : contractId.startsWith('IF-D05-') ? 'D05'
    : contractId.startsWith('IF-D06-CIRCUIT') ? 'D06-CIRCUIT'
      : contractId.startsWith('IF-D06-B07') ? 'D06-B07' : 'P1-B11';
  return {
    contractId,
    scope: contract.scope,
    fromOwnerId: contract.fromOwnerId,
    direction: contract.direction,
    family,
    sourceSideCandidate: candidate,
    sourceEvidenceKeys: sourceEvidence[family === 'D06-CIRCUIT' || family === 'D06-B07' ? 'd06' : family === 'P1-B11' ? 'b11' : family.toLowerCase()],
    counterpart: null,
    receiverOrToOwner: null,
    status: candidate ? 'SOURCE_SIDE_CANDIDATE_ONLY_COUNTERPART_UNASSIGNED' : 'NO_EXACT_SOURCE_SIDE_DATUM',
    requiredToPromote: [
      'named canonical counterpart/receiver/source owner',
      'exact counterpart geometry and reviewed interface kind',
      'complete-save-bound before-state hash',
      'accepted designed future-state hash',
      'owner/technical/interface acceptance bound to the same immutable identity',
    ],
    defaultDeny: true,
    accepted: false,
  };
});

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g05-endpoint-candidate-worklist',
  generatedAtUtc: GENERATED_AT,
  status: 'READ_ONLY_CANDIDATE_ENDPOINTS_DERIVED_COUNTERPARTS_REMAIN_UNRESOLVED',
  purpose: 'Derive source-side endpoint candidates from existing plans and distinguish them from the still-missing external counterpart decisions.',
  sourceBindings,
  registryBinding: {
    canonicalPayloadSha256: registry.canonicalPayloadSha256,
    reportIdentitySha256: registry.reportIdentitySha256,
    registryModified: false,
  },
  remoteReadOnlyObservation: {
    performed: true,
    result: 'Known datum probes returned the server response “That position is not loaded”.',
    interpretation: 'No live block identity or counterpart geometry was inferred from an unloaded-chunk response.',
    worldMutated: false,
  },
  rows,
  summary: {
    endpointCount: rows.length,
    sourceSideCandidateCount: rows.filter((row) => row.sourceSideCandidate).length,
    noExactSourceSideDatumCount: rows.filter((row) => !row.sourceSideCandidate).length,
    counterpartAssignedCount: 0,
    exactAcceptedEndpointCount: 0,
    futureStateHashCount: 0,
    remainingExternalDecisionCount: rows.length,
  },
  safetyBoundary: {
    registryModified: false,
    operationCellCount: 0,
    liveWorldEdits: false,
    rconWrites: false,
    acceptanceInferred: false,
    releaseAuthorized: false,
  },
};
const reportIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, reportIdentitySha256 };

function renderMarkdown() {
  const lines = [
    '# Combined Zones Phase 1 G05 endpoint candidate worklist',
    '',
    `**Status:** ${report.status}`,
    `**Generated:** ${report.generatedAtUtc}`,
    `**Report identity:** \`${report.reportIdentitySha256}\``,
    '',
    `This read-only pass covers all ${rows.length} undefined endpoint rows. It derives ${report.summary.sourceSideCandidateCount} source-side candidates and leaves every counterpart/receiver/owner assignment null. No row is accepted or executable.`,
    '',
    '| Endpoint | Source-side candidate | Exact source datum | Required next input |',
    '|---|---|---|---|',
  ];
  for (const row of rows) {
    const candidate = row.sourceSideCandidate;
    const datum = candidate
      ? `${candidate.kind}; ${candidate.cellCount} cells; ${candidate.coordinateSetSha256.slice(0, 12)}…`
      : 'none in reviewed plans';
    const next = candidate
      ? 'named counterpart + exact counterpart face + states + acceptance'
      : 'exact source geometry + named counterpart/receiver + states + acceptance';
    lines.push(`| ${row.contractId} | ${row.status} | ${datum} | ${next} |`);
  }
  lines.push('',
    '## Conclusion',
    '',
    '- 0/13 endpoints can be promoted to an exact accepted interface from current evidence.',
    '- The remote read-only probes did not add geometry because the tested chunks were not loaded; no live fact was guessed.',
    '- The canonical registry and world remain unchanged. G05/R00 stay HOLD.',
  );
  return `${lines.join('\n')}\n`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, renderMarkdown());
console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  summary: report.summary,
  reportIdentitySha256,
}, null, 2));
