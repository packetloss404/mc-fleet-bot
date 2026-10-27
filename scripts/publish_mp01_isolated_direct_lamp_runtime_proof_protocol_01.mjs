#!/usr/bin/env node
/**
 * Read-only runtime-proof protocol for MP01's isolated direct lamp candidate.
 * It describes a future supervised Mineflayer evidence session.  It cannot
 * operate a block, generate operations, or confer release authority.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const value = option(flag);
  if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --candidate <json> --topology <json> --boundary <json> --readiness <json> --out <json> --markdown <md> --map <svg>`);
  return value;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 direct-lamp runtime-proof protocol rejected: ${message}`);
};

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const topologyPath = required('--topology');
const boundaryPath = required('--boundary');
const readinessPath = required('--readiness');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'snapshot lacks a complete-save capture');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'source is not a complete immutable 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}

const captureSha = sha256(captureBytes);
const inputs = [
  ['candidate', candidatePath, 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01'],
  ['topology', topologyPath, 'MP01-DIRECT-LAMP-ACCESS-RETURN-TOPOLOGY-01'],
  ['boundary', boundaryPath, 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01'],
  ['readiness', readinessPath, 'MP01-ISOLATED-DIRECT-LAMP-READINESS-INTERACTION-CONTRACT-01'],
].map(([name, filename, id]) => {
  const bytes = fs.readFileSync(absolute(filename));
  const record = JSON.parse(bytes);
  fail(record.id === id, `${name} identity mismatch`);
  fail(record.source?.snapshot === relative(snapshot), `${name} source snapshot drift`);
  fail(record.source?.captureManifestSha256 === captureSha, `${name} capture-manifest drift`);
  return { name, filename, bytes, record };
});
const byName = Object.fromEntries(inputs.map((input) => [input.name, input]));
const { candidate, topology, boundary, readiness } = Object.fromEntries(inputs.map((input) => [input.name, input.record]));
fail(readiness.status === 'HOLD_RUNTIME_PROOF_AND_OWNER_BOUND_ACCESS_RETURN', 'readiness contract must remain a runtime/access hold');
fail(readiness.mutationAuthority === false && readiness.safetyBoundary?.worldEditsPerformed === false, 'readiness is not zero-mutation');
fail(candidate.isolation?.target?.cellCount === 2 && candidate.isolation?.envelope?.cellCount === 36, 'candidate geometry mismatch');
fail(topology.normalWalkTopology?.connectedStagingComponent?.cellCount === 143, 'staging topology mismatch');
fail(boundary.restrictedTwoWayTraversalDesign?.fullOriginOrRecoveryRouteAccepted === false, 'boundary unexpectedly claims a route');

const lever = { x: 1998, y: 165, z: -902 };
const lamp = { x: 1999, y: 165, z: -902 };
const stagingFeet = candidate.interactionGeometryOnly.existingAllowedStagingFeet;
const protocol = {
  schemaVersion: 1,
  id: 'MP01-ISOLATED-DIRECT-LAMP-RUNTIME-PROOF-PROTOCOL-01',
  status: 'PREPARE_ONLY_PROTOCOL__CURRENT_PRODUCTION_PROOF_BLOCKED',
  generatedAtUtc,
  mutationAuthority: false,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: captureSha, requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(byName.candidate.bytes), identity: candidate.payloadSha256 },
    topology: { path: relative(topologyPath), sha256: sha256(byName.topology.bytes), identity: topology.payloadSha256 },
    boundary: { path: relative(boundaryPath), sha256: sha256(byName.boundary.bytes), identity: boundary.payloadSha256 },
    readiness: { path: relative(readinessPath), sha256: sha256(byName.readiness.bytes), identity: readiness.payloadSha256 },
  },
  exactScope: {
    lever, lamp, sourceState: 'minecraft:air for both cells in the currently bound snapshot',
    candidateEnvelope: { cellCount: 36, coordinateSetSha256: candidate.isolation.envelope.coordinateSetSha256 },
    stagingFeet,
    purpose: 'prove an isolated direct lever-to-adjacent-lamp OFF/ON/OFF interaction only after a separate physical package has installed and source-bound the exact topology',
  },
  currentHardStop: {
    active: true,
    reason: 'The bound production cells are air, their canonical installed OFF/ON states and inverse are intentionally unresolved, and no owner-bound outbound/recovery route has been accepted.',
    allowedNow: ['compile/review this protocol', 'obtain an isolated disposable same-version proof', 'survey and accept access/recovery evidence'],
    prohibitedNow: ['Mineflayer movement to staging', 'lever/lamp placement', 'lever interaction', 'RCON state writes', 'operation compilation', 'release authorization'],
  },
  prerequisiteGates: [
    { id: 'G01_DISPOSABLE_SAME_VERSION_TOPOLOGY', accepted: false, requires: 'Separate disposable fixture proves exact wall-mounted lever/lamp states and direct adjacency with the production server game/build identity.' },
    { id: 'G02_DEDICATED_PHYSICAL_PACKAGE', accepted: false, requires: 'A separately accepted compiler/release installs only the exact canonical pair, has exact inverse, and produces immutable post evidence. This protocol cannot perform that installation.' },
    { id: 'G03_OWNER_BOUND_OUTBOUND_AND_RECOVERY', accepted: false, requires: 'An accepted per-station, owner/interface-bound permitted origin → staging route and distinct staging → recovery route, including any separately accepted gated-boundary procedure.' },
    { id: 'G04_FRESH_SESSION_KERNEL', accepted: false, requires: 'Fresh same-moment immutable source, live entity clearance, actor identity/capacity, checkpoint clearance, and comparison with the released canonical OFF state.' },
    { id: 'G05_INDEPENDENT_OBSERVER', accepted: false, requires: 'Independent immutable capture/reviewer path is available for the complete evidence session.' },
  ],
  actorAndAccessContract: {
    permittedActorEvidence: ['bot username/UUID and fleet task ID', 'current capacity/lease record', 'signed exact route-contract identity', 'approved origin, staging foot, recovery anchor, and all checkpoints'],
    routeRules: [
      'The actor begins only at the accepted origin and reaches one of the listed staging feet by the accepted outbound station trace.',
      'The actor must retain a distinct accepted recovery trace before the first click; geometric distance, a marker, and a closed/open-door assumption are not substitutes.',
      'If the east sequential boundary participates, its separately accepted one-leaf-at-a-time interaction trace must be complete; both-open is an immediate hard abort.',
      'This protocol never grants movement authority; a later supervisor may use the accepted route contract only after G01–G05 pass.',
    ],
  },
  observerEvidence: {
    observationMethod: 'Mineflayer blockAt/getProperties at exact coordinates plus immutable world capture; RCON block writes and inferred block state are prohibited.',
    actorTrace: {
      requiredFields: ['actor username/UUID', 'fleet task and lease IDs', 'server game/build identity', 'route contract identity', 'exact feet coordinates before/after each click', 'Mineflayer activateBlock invocation result and timestamp'],
      allowedInteraction: { method: 'mineflayer.activateBlock', target: lever, maximumGenuineClicks: 2 },
    },
    eachSettledObservationMustContain: ['phase ID and UTC timestamp', 'normal-tick wait count and distinct observation ordinal', 'full canonical lever state at (1998,165,-902)', 'full canonical lamp state at (1999,165,-902)', 'all 36 candidate-envelope states or a hash plus lossless sidecar', 'actor feet and route checkpoint identity', 'observer process/version and source capture identity'],
    immutableReview: ['pre-session immutable source capture identity', 'post-session immutable capture identity', 'independent reviewer comparison of all non-control envelope cells', 'independent reviewer confirmation that final OFF equals the canonical installed OFF state'],
  },
  interactionSequence: [
    { ordinal: 1, phase: 'PRE_OFF_CAPTURE', action: 'no click', requiredEvidence: 'fresh canonical installed OFF state; two independently settled OFF observations; all non-control envelope cells equal pre-session source' },
    { ordinal: 2, phase: 'CLICK_ON', action: 'one genuine Mineflayer activateBlock click at lever only', requiredEvidence: 'actor feet match accepted staging/interaction face and the invocation record names no state-write API' },
    { ordinal: 3, phase: 'POST_ON_CAPTURE', action: 'no click', requiredEvidence: 'two independently settled ON observations: lever powered=true and lamp lit=true in exact canonical states; no undeclared envelope drift' },
    { ordinal: 4, phase: 'CLICK_OFF_RESTORE', action: 'second and final genuine Mineflayer activateBlock click at lever only', requiredEvidence: 'only permitted restore action; no RCON/setblock/fill/command substitute' },
    { ordinal: 5, phase: 'POST_OFF_CAPTURE', action: 'no click', requiredEvidence: 'two independently settled OFF observations exactly equal the canonical installed OFF state; actor completes accepted recovery route' },
  ],
  stateCaptureAndRestore: {
    precondition: 'The separate physical package must provide a canonical installed OFF pair and immutable post-install capture. The present air source is not a runtime interaction precondition.',
    allowedDrift: ['only lever powered property and lamp lit property may change during the two-click proof; exact installed block identity/orientation and all other candidate-envelope states remain fixed'],
    restore: 'The second genuine click is the only ordinary restore mechanism. No external state write may be used to repair or reset a failed proof.',
    failedRestore: 'If the ON state cannot be observed exactly, the actor must not attempt a blind second click. Stop, capture the present state, hold the scope, and require a separately reviewed recovery/remediation package.',
    finalAcceptanceCondition: 'Both final settled OFF observations and the independent immutable post capture match the canonical installed OFF state; the return trace reaches the distinct recovery anchor.',
  },
  stopTriggers: [
    'any G01–G05 prerequisite is absent, expired, or source-hash drifted',
    'candidate is not the exact installed direct pair or the full canonical OFF state is absent',
    'actor/lease/capacity, origin, staging foot, checkpoint, route owner, or recovery anchor does not match the accepted contract',
    'live entity or protected-core/container exclusion fails in the exact session scope',
    'both east boundary leaves observed open, a route trace deviates, or recovery ceases to be available',
    'a required observation is missing, non-settled, non-lossless, or reports unexpected lever/lamp/envelope state',
    'any envelope cell other than the permitted lever/lamp properties drifts',
    'any attempted action is not Mineflayer activateBlock at the exact lever, or more than two clicks are attempted',
    'first click fails to yield exact ON evidence; do not perform a blind reset click',
  ],
  postProofAcceptanceRecord: {
    recordId: 'MP01-ISOLATED-DIRECT-LAMP-RUNTIME-PROOF-ATTESTATION-01',
    requiredStatus: 'TRACE_COMPLETE_REQUIRES_INDEPENDENT_IMMUTABLE_REVIEW',
    requiredArtifacts: ['fresh source capture and exact source/installed-state hashes', 'fixture same-version proof plus its immutable fixture capture', 'actor route/lease trace and two genuine-click records', 'two OFF-before, two ON, and two OFF-after lossless observations', 'pre/post envelope comparison', 'post-session immutable capture', 'independent reviewer acceptance/rejection and recovery trace'],
    effectOfPass: 'A passing record proves only the bounded interaction evidence. It does not authorize future placement, operations, a release, access control, a door, route opening, egress, utility, public/service commissioning, or MP01 completion.',
  },
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, botMovementPerformed: false, leverOrLampInteractionsPerformed: 0, worldEditsPerformed: false, operationFilesEmitted: 0, releaseManifestEmitted: false },
  nonClaims: ['no direct-lamp runtime proof occurred', 'no physical pair is installed by this artifact', 'no access/recovery route is accepted', 'no release or interaction authorization', 'no active control, door, utility, egress, public/service opening, or completion claim'],
  payloadSha256: null,
};
protocol.payloadSha256 = sha256(JSON.stringify(protocol));

const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="500" viewBox="0 0 1040 500"><style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:24px;font-weight:800}.label{font-size:15px;font-weight:700}.note{font-size:12px;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#0b1020"/><text x="36" y="34" class="title">MP01 direct-lamp runtime proof — prepare-only protocol</text><text x="36" y="58" class="note">No live session is authorized by this map. Current candidate cells are air; G01–G05 remain hard gates.</text><g transform="translate(40 110)"><rect width="150" height="84" rx="8" fill="#334155"/><text x="16" y="30" class="label">G01–G05</text><text x="16" y="52" class="note">fixture / pair / route</text><text x="16" y="68" class="note">fresh kernel / reviewer</text><path d="M150 42 H205" stroke="#64748b" stroke-width="3"/><rect x="205" width="150" height="84" rx="8" fill="#1e3a5f"/><text x="221" y="30" class="label">OFF ×2</text><text x="221" y="54" class="note">lossless observer</text><path d="M355 42 H410" stroke="#64748b" stroke-width="3"/><rect x="410" width="150" height="84" rx="8" fill="#7c2d12"/><text x="425" y="30" class="label">CLICK ON</text><text x="425" y="54" class="note">activateBlock only</text><path d="M560 42 H615" stroke="#64748b" stroke-width="3"/><rect x="615" width="150" height="84" rx="8" fill="#14532d"/><text x="636" y="30" class="label">ON ×2</text><text x="631" y="54" class="note">lever + lamp exact</text><path d="M765 42 H820" stroke="#64748b" stroke-width="3"/><rect x="820" width="150" height="84" rx="8" fill="#7c2d12"/><text x="829" y="30" class="label">CLICK OFF</text><text x="829" y="54" class="note">only permitted reset</text><path d="M895 84 V132 H690" stroke="#64748b" stroke-width="3"/><rect x="485" y="132" width="205" height="84" rx="8" fill="#1e3a5f"/><text x="505" y="162" class="label">OFF ×2 + recovery</text><text x="505" y="186" class="note">post capture / reviewer</text></g><rect x="40" y="365" width="960" height="95" rx="8" fill="#111827" stroke="#334155"/><text x="60" y="394" class="label">Hard abort</text><text x="60" y="418" class="note">hash/route/entity drift · missing observer record · unexpected pair/envelope state · both-open gate · non-activateBlock action · more than two clicks</text><text x="60" y="441" class="note">If ON cannot be proven exactly, do not blind-reset: stop, capture, and hold for separately reviewed remediation.</text></svg>`;
const md = `# MP01 isolated direct-lamp runtime proof protocol 01\n\n`
  + `**Status:** \`${protocol.status}\` — a zero-mutation protocol only; it neither operates the candidate nor authorizes a later operation.\n\n`
  + `![Proof protocol map](${path.basename(map)})\n\n`
  + `## Current hard stop\n\n`
  + `The bound production cells are still air, so no live interaction is permissible. A separate same-version fixture proof, separately accepted physical pair, accepted owner-bound outbound/recovery route, fresh session kernel, and independent immutable reviewer are all required before a supervised session could be scheduled.\n\n`
  + `## Exact evidence sequence\n\n`
  + `A future session requires two settled OFF observations, one genuine \`mineflayer.activateBlock\` click, two settled ON observations, a second genuine click as the only reset mechanism, and two settled final OFF observations. Every observation records full lever/lamp states, lossless envelope evidence, actor feet/checkpoint, observer identity, and normal-tick settlement. Only lever power and lamp lit may change. Any unexpected drift, missing observation, route failure, both-open gate state, or non-Mineflayer/state-write action stops the proof.\n\n`
  + `A completed trace remains \`TRACE_COMPLETE_REQUIRES_INDEPENDENT_IMMUTABLE_REVIEW\`; it cannot authorize placement, release, access control, public/service access, egress, or completion.\n`;
for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(protocol, null, 2)}\n`);
fs.writeFileSync(absolute(markdown), md);
fs.writeFileSync(absolute(map), mapSvg);
process.stdout.write(`${JSON.stringify({ status: protocol.status, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: protocol.payloadSha256 }, null, 2)}\n`);
