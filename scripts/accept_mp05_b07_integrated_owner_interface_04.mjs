#!/usr/bin/env node
/**
 * MP05/B07 integrated owner + interface acceptance 04.
 *
 * A deliberately non-mutating implementation of the Governor-delegated
 * owner/counterpart role decision.  It accepts only the exact B07 reservation
 * and its six directional boundary pair sets.  It does not select a doorway,
 * receiver, treatment, gravity state, route, or operation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { deriveB07WestTwo, hashCells, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const POST_LEDGER = option('--post-ledger', 'data/world-review/mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-live-20260828T041000Z/as-built-acceptance-ledger.json');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const AUTHORIZATION = option('--authorization', 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-integrated-owner-interface-04-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-INTEGRATED-OWNER-INTERFACE-04-2026-08-28.md');
const GENERATED_AT = option('--generated-at', new Date().toISOString());

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
for (const filename of [capturePath, POST_LEDGER, MECHANISMS, AUTHORIZATION]) assert(fs.existsSync(abs(filename)), `missing required input: ${filename}`);
const capture = json(capturePath);
const ledger = json(POST_LEDGER);
const mechanisms = json(MECHANISMS);
const authorization = json(AUTHORIZATION);
assert(capture.id === 'combined-zones-complete-save-capture' && capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length >= 130, 'snapshot is not a complete immutable capture');
assert(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION', 'standing build authorization is not active');
assert(ledger.evidence?.postSnapshot?.path === SNAPSHOT && ledger.evidence.postSnapshot.captureId === capture.captureId, 'post ledger is not bound to the supplied complete capture');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
assert(b07.construction.length === 8134 && b07.interaction.length === 13608, 'B07 canonical reservation geometry drifted');
const order = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const key = ({ x, y, z }) => `${x},${y},${z}`;
const construction = new Set(b07.construction.map(key));
const directions = [
  ['NEGATIVE_X', -1, 0, 0], ['POSITIVE_X', 1, 0, 0], ['NEGATIVE_Y', 0, -1, 0],
  ['POSITIVE_Y', 0, 1, 0], ['NEGATIVE_Z', 0, 0, -1], ['POSITIVE_Z', 0, 0, 1],
];
const pairHash = (pairs) => sha256(`mp05-b07-directional-seam-pairs-v1\n${pairs.map(({ from, to }) => `${key(from)}>${key(to)}`).sort().join('\n')}\n`);
const seams = directions.map(([direction, dx, dy, dz]) => {
  const pairs = b07.construction
    .filter((from) => !construction.has(key({ x: from.x + dx, y: from.y + dy, z: from.z + dz })))
    .map((from) => ({ from, to: { x: from.x + dx, y: from.y + dy, z: from.z + dz } }))
    .sort((a, b) => order(a.from, b.from));
  return { direction, transitionCount: pairs.length, pairSha256: pairHash(pairs) };
});
const expected = [1134, 1134, 287, 287, 952, 952];
assert(seams.every((seam, index) => seam.transitionCount === expected[index]), 'B07 directional seam count drifted');
const owners = {
  b07PrimaryConstructionOwner: 'MP05 B07 Integration Team',
  boundaryCounterpartOwner: 'Combined Zones Boundary Stewardship Team',
  hydrologyContainmentOwner: 'MP05 Hydrology Containment Team',
  protectedCapOwner: 'B07 Protected-Cap Custodians',
  lowerEndpointOwner: 'B07 Lower Endpoint Team',
  exteriorReceiverOwner: 'B07 Surface Receiver Team',
};
const reportWithoutHash = {
  schemaVersion: 1,
  id: 'MP05-B07-INTEGRATED-OWNER-INTERFACE-04',
  generatedAtUtc: GENERATED_AT,
  status: 'ACCEPTED_EXACT_OWNER_AND_SIX_BOUNDARY_COUNTERPART_INPUT_ONLY',
  mode: 'READ_ONLY_SOURCE_BOUND_NON_MUTATING',
  mutationAuthority: false,
  purpose: 'Eliminates the previously missing B07 primary-owner and six exact directional counterpart-role input; it is one input to, not an acceptance of, the integrated through-route.',
  authority: {
    standingAuthorization: { path: rel(AUTHORIZATION), sha256: sha256(fs.readFileSync(abs(AUTHORIZATION))), status: authorization.status },
    delegation: 'Governor acceleration directive: internal accountable roles may be assigned directly in a finite source-bound package; exact state and safety kernels remain mandatory before mutation.',
  },
  source: {
    snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha256(fs.readFileSync(abs(capturePath))), immutableRequiredMemberCount: capture.requiredMembers.length,
    latestB07PostEvidence: { path: rel(POST_LEDGER), sha256: sha256(fs.readFileSync(abs(POST_LEDGER))), releaseId: ledger.releaseId },
  },
  exactDomain: {
    candidateId: 'B07-C-WEST-2',
    construction: { cellCount: b07.construction.length, coordinateSetSha256: hashCells(uniqueCells(b07.construction).sort(order)) },
    interaction: { cellCount: b07.interaction.length, coordinateSetSha256: hashCells(uniqueCells(b07.interaction).sort(order)) },
    seams: seams.map((seam) => ({ ...seam, fromOwner: owners.b07PrimaryConstructionOwner, acceptingCounterpartOwner: owners.boundaryCounterpartOwner, acceptance: 'EXACT_BOUNDARY_ROLE_ACCEPTED_NO_STATE_CHANGE_APPROVED' })),
  },
  assignedRoles: owners,
  retainedDefaultDeny: [
    'No fluid component, liner, receiver, freeboard, overflow, source/future state set, or hydrology treatment is selected.',
    'No gravity migration, permanent support state, fall-chain treatment, or rollback order is selected.',
    'The R09J cap and R07J 49-cell cap remain protected; no cap change or doorway/landing face is selected.',
    'No lower endpoint aperture, exterior receiver, public route, egress, or normal-walk claim is accepted.',
    'No operation, release manifest, RCON call, or Minecraft mutation is emitted or authorized.',
  ],
  nextRequiredInputs: ['finite hydrology containment/receiver/freeboard/overflow contract', 'permanent gravity state plus no-falling rollback contract', 'exact lower and exterior endpoint/return contract', 'integrated canonical forward/rollback manifests and fresh guarded release kernel'],
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
const report = { ...reportWithoutHash, reportIdentitySha256: sha256(`${JSON.stringify(reportWithoutHash, null, 2)}\n`) };
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="430" viewBox="0 0 1180 430"><style>text{font-family:system-ui,sans-serif;fill:#172330}.h{font-size:23px;font-weight:700}.n{font-size:14px}.s{font-size:12px;fill:#405264}</style><rect width="100%" height="100%" fill="#f7fafc"/><text class="h" x="35" y="40">MP05 B07 integrated owner/interface input 04</text><text class="n" x="35" y="68">Complete immutable post capture ${capture.captureId}; exact roles accepted, no state transition or route approval.</text><rect x="365" y="160" width="420" height="110" rx="12" fill="#174d76"/><text x="425" y="205" fill="white" font-family="system-ui" font-size="20" font-weight="700">B07-C-WEST-2</text><text x="425" y="233" fill="white" font-family="system-ui" font-size="14">8,134 construction / 13,608 interaction cells</text>${seams.map((s, i) => { const positions = [[95,95],[905,95],[95,335],[905,335],[95,215],[905,215]][i]; const startX = positions[0] < 300 ? 365 : 785; const startY = positions[1] < 150 ? 160 : positions[1] > 300 ? 270 : 215; return `<line x1="${startX}" y1="${startY}" x2="${positions[0] < 300 ? positions[0]+150 : positions[0]}" y2="${positions[1]}" stroke="#6e9cc0" stroke-width="3"/><rect x="${positions[0]}" y="${positions[1]-38}" width="180" height="76" rx="8" fill="#e1edf6" stroke="#6e9cc0"/><text class="n" x="${positions[0]+12}" y="${positions[1]-9}">${s.direction}</text><text class="s" x="${positions[0]+12}" y="${positions[1]+12}">${s.transitionCount.toLocaleString()} exact pairs</text><text class="s" x="${positions[0]+12}" y="${positions[1]+28}">Boundary Stewardship</text>`; }).join('')}<text class="s" x="35" y="405">Blue arrows bind accountable counterpart roles only. Hydrology, gravity, cap, endpoint, and release-state design remain default-deny.</text></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-integrated-owner-interface-04.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-integrated-owner-interface-map.svg')), svg);
const md = `# MP05 B07 integrated owner/interface input 04\n\n**Status:** \`${report.status}\`  \n**Authority:** source-bound, non-mutating role assignment only.\n\n![Exact B07 boundary-role map](../../../${rel(path.join(OUT_DIR, 'mp05-b07-integrated-owner-interface-map.svg'))})\n\nThis package removes one real B07 integrated-contract gap: the primary construction owner and the accepting counterpart for all six hash-bound B07 boundary seams are now assigned under standing Governor delegation. It binds the latest complete B07 post capture and **does not** accept an operation, opening, route, egress, fluid treatment, gravity migration, cap change, landing, or receiver.\n\n| Seam | Exact transition pairs | Assigned counterpart |\n| --- | ---: | --- |\n${report.exactDomain.seams.map((s) => `| ${s.direction} | ${s.transitionCount.toLocaleString()} | ${s.acceptingCounterpartOwner} |`).join('\n')}\n\nThe remaining hydrology, gravity, protected-cap, lower endpoint, exterior receiver, forward/rollback, and fresh guarded-release inputs remain independently required.\n`;
fs.writeFileSync(abs(MARKDOWN), md);
console.log(`${report.status}: ${rel(path.join(OUT_DIR, 'mp05-b07-integrated-owner-interface-04.json'))}`);
