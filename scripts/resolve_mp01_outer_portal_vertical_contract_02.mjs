#!/usr/bin/env node
/**
 * MP01 outer portal placement/vertical resolution — coordination only.
 * It permits a single rationally-derived source probe, never a build cell set.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(), args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-masterplan-frontier-refresh-20260827T053500Z');
const OUT = opt('--out-dir', 'data/world-review/mp01-outer-portal-vertical-contract-resolution-02-masterplan-frontier-refresh-20260827T053500Z');
const GENERATED_AT = opt('--generated-at', new Date().toISOString());
const abs = (p) => path.resolve(ROOT, p), rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (c, m) => { if (c) throw new Error(`MP01 portal vertical resolution rejected: ${m}`); };
const sources = {
  authority: 'docs/masterplans/04-combined-complex/AUTHORITY.md',
  coordination: 'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
  priorDecision: 'data/world-review/mp01-outer-portal-placement-interface-decision-01-20260827T053500Z/mp01-outer-portal-placement-interface-decision-01.json',
};
for (const p of Object.values(sources)) fail(!fs.existsSync(abs(p)), `missing source ${p}`);
const snapshotRoot = abs(SNAPSHOT); const manifestPath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
for (const p of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(snapshotRoot, p)), `missing snapshot member ${p}`);
const manifestBytes = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestBytes);
fail(!(manifest.immutableCopy === true && manifest.requiredMembers?.length === 130), 'snapshot is not a complete immutable 130-member capture');
for (const member of manifest.requiredMembers) { const p = path.join(snapshotRoot, member.path); fail(!fs.existsSync(p) || fs.statSync(p).size !== member.bytes || sha(fs.readFileSync(p)) !== member.sha256, `snapshot member drift ${member.path}`); }
fail(fs.existsSync(abs(OUT)), '--out-dir must be fresh');
const authorityBytes = fs.readFileSync(abs(sources.authority)), authority = authorityBytes.toString('utf8');
const coordinationBytes = fs.readFileSync(abs(sources.coordination)), coordination = JSON.parse(coordinationBytes);
const priorBytes = fs.readFileSync(abs(sources.priorDecision)), prior = JSON.parse(priorBytes);
fail(!authority.includes('The vertical study is inactive for construction. It has no approved block-rounding policy'), 'authority no-rounding constraint drift');
const vertical = coordination.coordinateContract?.vertical;
fail(coordination.status !== 'PHASE1_COORDINATION_PARTIAL_PASS_OPERATION_COMPILATION_BLOCKED' || vertical?.activeForBuild !== false, 'coordination status/activation drift');
fail(vertical?.aboveOrAtStreet?.formula !== 'worldY = 72 + (29/100) * localY' || vertical?.pointRounding !== 'nearest-integer-ties-to-positive-infinity' || vertical?.lowerBoundaryRounding !== 'floor' || vertical?.upperExclusiveBoundaryRounding !== 'ceiling', 'frozen coordination rational/rounding contract drift');
fail(prior.status !== 'HOLD_NORMALIZED_ANCHOR_BOUND__VERTICAL_AND_INTERFACE_GEOMETRY_UNACCEPTED', 'prior placement decision drift');

const normalized = { x: 0, y: 200, z: -420 };
const rationalY = { numerator: 72 * 100 + 29 * normalized.y, denominator: 100, reducedNumerator: 130, reducedDenominator: 1, exact: 130 };
const horizontal = { x: 2048 + normalized.x, z: -328 + normalized.z };
const roundedAnchor = { x: horizontal.x, y: 130, z: horizontal.z };
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const observedState = stateToCommandString(await reader.blockState(roundedAnchor.x, roundedAnchor.y, roundedAnchor.z));
const decision = {
  schemaVersion: 1,
  id: 'MP01-OUTER-PORTAL-VERTICAL-CONTRACT-RESOLUTION-02',
  generatedAtUtc: GENERATED_AT,
  status: 'COORDINATION_ANCHOR_RATIONAL_RESOLVED__BUILD_ACTIVATION_AND_INTERFACE_CELLS_STILL_DENIED',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, botMovementPerformed: false, worldMutated: false },
  source: {
    snapshot: rel(SNAPSHOT), captureId: manifest.captureId, capturedAtUtc: manifest.capturedAtUtc, captureManifestSha256: sha(manifestBytes), verifiedRequiredMemberCount: manifest.requiredMembers.length,
    documents: { authority: { path: rel(sources.authority), sha256: sha(authorityBytes) }, coordination: { path: rel(sources.coordination), sha256: sha(coordinationBytes), status: coordination.status }, priorDecision: { path: rel(sources.priorDecision), sha256: sha(priorBytes), status: prior.status } },
  },
  resolvedCoordinatePolicy: {
    normalizedAnchor: normalized,
    topDown: { worldX: '2048 + localX', worldZ: '-328 + localZ', result: horizontal },
    verticalAnchorOnly: { formula: '72 + (29/100) × localY', exactRational: rationalY, frozenCoordinationPointRounding: 'nearest-integer-ties-to-positive-infinity', coordinationProbe: roundedAnchor, classification: 'EXACT_SOURCE_PROBE_ONLY__NOT_A_BUILD_TARGET' },
    boundaryPolicy: { lower: 'floor', upperExclusive: 'ceiling', status: 'FROZEN_FOR_PHASE1_COORDINATION_ONLY' },
    activation: { activeForBuild: false, authorityConstraint: 'The vertical study remains inactive for construction despite frozen coordination arithmetic.', result: 'No physical portal/checkpoint/door/airlock bounds, cell set, target state, or inverse is allowed.' },
  },
  freshSnapshotProbe: { cell: roundedAnchor, state: observedState, interpretation: 'One source observation at the rational anchor is recorded solely to make later source drift detectable. It is not support, terrain acceptance, a target, a marker, a route node, or an interaction point.' },
  interfaceResolution: {
    status: 'UNRESOLVED__NO_COMPILER_READY_ENVELOPE',
    retainedConflict: ['6×6 opening', 'six-wide × four-deep checkpoint', 'three-block-thick six-wide × twelve-tall door'],
    missing: ['portal anchor corner/centre convention', 'portal face normal and inward/outward depth', 'exact portal/checkpoint/door/airlock/guard/sign cell sets', 'default/failed/rollback door and airlock states', 'service-tunnel and Cheyenne/J-curve endpoint arrays', 'named owners/counterparts and distinct recovery path'],
  },
  compilerGate: {
    eligibleNow: false,
    exactNextAcceptance: 'MP01-OUTER-PORTAL-PLACEMENT-ACCEPTANCE-SIGNATURE-01',
    requires: ['explicit activation of the vertical coordination policy for the named portal scope', 'accepted exact half-open/inclusive geometry and integer cell sets', 'resolved interface geometry and ownership', 'fresh target/halo/route source census plus directed inverse'],
  },
  safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false, sourceProbeOnly: true },
  nonClaims: ['No physical target, clearance, portal, checkpoint, door, airlock, J-curve, service tunnel, rail, route, egress, marker, operation, release authorization, RCON call, bot movement, or world mutation.'],
};
decision.identitySha256 = sha(`${JSON.stringify(decision, null, 2)}\n`);
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1110" height="520"><style>.t{font:700 22px system-ui;fill:#f8fafc}.s{font:13px system-ui;fill:#cbd5e1}.k{font:600 14px system-ui;fill:#f8fafc}.n{font:600 13px system-ui;fill:#fde68a}.d{font:600 13px system-ui;fill:#fca5a5}</style><rect width="100%" height="100%" fill="#08131f"/><text x="36" y="40" class="t">MP01 portal vertical contract resolution 02</text><text x="36" y="66" class="s">Fresh immutable capture ${manifest.captureId}; one rational anchor probe only.</text><rect x="55" y="120" width="260" height="180" rx="10" fill="#17324d" stroke="#93c5fd"/><text x="78" y="154" class="k">Normalized anchor</text><text x="78" y="188" class="s">(0, 200, -420)</text><text x="78" y="222" class="s">local architecture reference</text><path d="M330 210 H445" stroke="#94a3b8" stroke-width="4"/><polygon points="445,210 430,200 430,220" fill="#94a3b8"/><rect x="460" y="120" width="300" height="180" rx="10" fill="#17324d" stroke="#93c5fd"/><text x="484" y="154" class="k">Frozen coordination arithmetic</text><text x="484" y="188" class="s">72 + 29/100 × 200 = 130</text><text x="484" y="222" class="n">probe (2048,130,-748)</text><path d="M775 210 H880" stroke="#f87171" stroke-width="4"/><polygon points="880,210 865,200 865,220" fill="#f87171"/><rect x="895" y="120" width="165" height="180" rx="10" fill="#451a1a" stroke="#fca5a5"/><text x="918" y="154" class="k">Build cells</text><text x="918" y="188" class="d">DENIED</text><text x="918" y="222" class="s">activation false</text><text x="55" y="365" class="n">Rational/rounding terms are frozen for coordination, but Authority keeps vertical placement inactive for construction.</text><text x="55" y="405" class="s">Next acceptance must activate this named scope, select exact interface cells/owners, and bind endpoint/return arrays before any compiler.</text><text x="55" y="455" class="d">The 6×6 / 4-deep / three-thick 6×12 portal-airlock descriptions remain geometrically unresolved.</text></svg>`;
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp01-outer-portal-vertical-contract-resolution-02.json'), `${JSON.stringify(decision, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'mp01-outer-portal-vertical-contract-resolution-map.svg'), `${map}\n`);
fs.writeFileSync(path.join(abs(OUT), 'MP01-OUTER-PORTAL-VERTICAL-CONTRACT-RESOLUTION-02.md'), `# MP01 outer portal vertical contract resolution 02\n\n**Status:** ${decision.status}\n\n![Vertical contract map](mp01-outer-portal-vertical-contract-resolution-map.svg)\n\nThe fresh source binds the local portal anchor to exact world X/Z (2048,-748) and proves the above-street rational Y result is exactly 130. The frozen Phase-1 rounding vocabulary is recorded only as coordination evidence: the authority keeps it inactive for construction. No geometry beyond the single source probe is rounded or derived.\n\nA future compiler remains denied until the named portal scope receives an explicit activation, exact cell-set/interface acceptance, owners/endpoints/returns, and fresh target/halo/route plus inverse evidence.\n`);
console.log(JSON.stringify({ status: decision.status, output: rel(OUT), sourceProbe: decision.freshSnapshotProbe, buildActive: false, mutationAuthority: false }, null, 2));
