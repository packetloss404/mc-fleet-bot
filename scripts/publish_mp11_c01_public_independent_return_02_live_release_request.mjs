#!/usr/bin/env node
/**
 * Emits an unaccepted, source-bound request for a later C01 return release.
 * It cannot grant authority, generate operations, or reach the live world.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const MANIFEST = option('--manifest', 'data/world-review/mp11-c01-public-independent-return-02-prepared-20260828T050000Z/buildops/mp11-c01-public-independent-return-02.manifest.json');
const LEDGER = option('--ledger', 'data/world-review/mp11-c01-public-independent-return-02-prepared-20260828T050000Z/prepare-kernel-ledger.json');
const OUT = option('--out', 'data/world-review/mp11-c01-public-independent-return-02-live-release-request-20260828T051500Z');
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP11 C01 public independent-return live-release request rejected: ${message}`); };
const manifestBytes = fs.readFileSync(abs(MANIFEST)); const manifest = JSON.parse(manifestBytes);
const ledgerBytes = fs.readFileSync(abs(LEDGER)); const ledger = JSON.parse(ledgerBytes);
fail(manifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && manifest.mutationAuthority === false, 'prepared package is wrong or mutating');
fail(ledger.releaseId === manifest.id && ledger.status === 'PREPARED_STATIC_SOURCE_FULL_OFFLINE_KERNEL_PASS_LIVE_EXECUTION_PROHIBITED' && ledger.mutationAuthority === false && ledger.stages?.every((stage) => stage.status === 'PASS'), 'offline prepare kernel does not pass or incorrectly claims authority');
fail(manifest.source.authorization.executionAuthorized === false && manifest.source.authorization.prepareOnlyAuthorized === true, 'prepared package is not prepare-only');
const base = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-LIVE-RELEASE-ACCEPTANCE-REQUEST',
  generatedAtUtc: new Date().toISOString(),
  status: 'REQUESTED_UNACCEPTED_NO_EXECUTION_AUTHORITY',
  mutationAuthority: false,
  requestPurpose: 'Request a later separately accepted live-release authorization review for the prepared independent public return. This record is not an acceptance, approval, operation package, or execution trigger.',
  preparedPackage: {
    manifest: { path: rel(MANIFEST), sha256: sha(manifestBytes), identity: manifest.manifestIdentitySha256 },
    prepareLedger: { path: rel(LEDGER), sha256: sha(ledgerBytes), status: ledger.status, allStagesPass: true },
    preparedSource: manifest.source,
    forward: manifest.operations.forward,
    rollback: manifest.operations.rollback,
    canonicalTarget: { cellCount: manifest.target.canonicalPostStateCellCount, sha256: manifest.target.canonicalPostStateSha256, changedCellCount: manifest.target.changedCellCount, changedCellSetSha256: manifest.target.changedCellSetSha256 },
    safety: manifest.safety,
  },
  requiredAcceptanceRoles: {
    scopeOwner: { role: manifest.ownershipAndInterfaces.roles.scopeOwner, acceptance: 'UNACCEPTED' },
    counterpart: { role: manifest.ownershipAndInterfaces.roles.counterpart, acceptance: 'UNACCEPTED' },
    designOwner: { role: manifest.ownershipAndInterfaces.roles.designOwner, acceptance: 'UNACCEPTED' },
    guardedReleaseAuthority: { role: 'C01 Scoped Guarded-Release Authority', acceptance: 'UNACCEPTED' },
  },
  acceptanceMustBindExactly: {
    releaseId: manifest.id,
    transactionId: manifest.transactionId,
    preparedManifestIdentity: manifest.manifestIdentitySha256,
    preparedForwardOperationSha256: manifest.operations.forward.sha256,
    preparedRollbackOperationSha256: manifest.operations.rollback.sha256,
    preparedForwardCommandCount: manifest.operations.forward.commandCount,
    preparedRollbackCommandCount: manifest.operations.rollback.commandCount,
    preparedTargetStateSha256: manifest.target.canonicalPostStateSha256,
    preparedInteractionHaloSha256: manifest.safety.interactionHaloCellSetSha256,
    sourceCaptureId: manifest.source.captureId,
    rule: 'A future acceptance must rebind these predicates to a fresh complete immutable source and a freshly compiled manifest. Any source, state, hash, target, interface, ownership, or operation drift rejects the request rather than silently accepting the prepared artifact.',
  },
  mandatoryLiveReleaseConditions: {
    authorization: [
      'A separately issued, non-revoked live execution authorization must name this exact release and fresh rebound manifest; the current prepare-only authorization is not sufficient.',
      'All four requested roles must record explicit acceptance against the fresh source and exact interface faces; no role is marked accepted here.',
    ],
    freshSourceAndInterfaces: [
      'Capture a fresh complete immutable source immediately before execution and recompile the independent-return design, exact interfaces, canonical source/target states, forward operation, and rollback from that capture.',
      'Verify each upper/lower 5×5 interface face and its five support cells exactly, preserve the retained public landing connectors, and retain zero intersection with the current protected public-switchback interior halo.',
      'Reject any fluid, waterlogged block, gravity block, protected-core state, container/block entity, or unreviewed interface migration in the fresh target or interaction halo.',
    ],
    entityAndExecution: [
      'Clear and record live entities from the exact fresh interaction set immediately before mutation; no static snapshot substitutes for this condition.',
      'Run strict-noop forward parser and exact source preflight against the fresh recompiled operation; journal strict execution only after every scoped prerequisite passes.',
      'The forward order must preserve the exact support/tread/landing-first then high-to-low clearance ordering; no broad fill, force, or unguarded command is acceptable.',
    ],
    postStateAndRollback: [
      'Capture a fresh immutable complete post-release snapshot.',
      'Run exact rollback post-state preflight from that post snapshot using the fresh rebound rollback; prove the rollback is the one-to-one inverse of the executed forward operation.',
      'Retain execution journal, source/pre/post identity, parser reports, entity clearance, interface evidence, and post QA in the release ledger.',
    ],
    functionalAcceptance: [
      'Independent immutable post QA must prove all 28 return stations have five supported cells and five clear cells above.',
      'Independent immutable post QA must prove both lower-to-upper and upper-to-lower normal-walk traversals, the four endpoint faces, dry/gravity-safe interaction set, and retained public landing connector continuity.',
      'The return’s post-state must remain disjoint from the current protected-switchback interior halo before any later main-switchback package is considered.',
    ],
  },
  preparedEvidenceOnly: {
    staticKernelPass: ledger.status,
    projectedFunctionalQaRequiredButNotPostEvidence: true,
    maps: [
      path.join(path.dirname(rel(MANIFEST)), 'mp11-c01-public-independent-return-package-02-plan.svg'),
      path.join(path.dirname(rel(MANIFEST)), 'mp11-c01-public-independent-return-package-02-elevation.svg'),
    ],
  },
  nonClaims: [
    'This request does not accept, approve, authorize, or execute the release.',
    'No Minecraft, RCON, fleet API, systemd, or external service call occurred.',
    'No public route, egress, commissioning, or usability claim is made.',
    'The static prepare pass and projected QA are not live entity clearance or immutable post-release evidence.',
  ],
};
const request = { ...base, requestIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-public-independent-return-02-live-release-acceptance-request.json'), `${JSON.stringify(request, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-LIVE-RELEASE-ACCEPTANCE-REQUEST.md'), `# MP11 C01 public independent-return 02 live-release acceptance request\n\n**Status:** \`${request.status}\`  \n**Authority:** none; this is a request only.\n\nThe prepared package binds **${manifest.target.canonicalPostStateCellCount}** canonical target cells, **${manifest.target.changedCellCount}** changed cells, and **${manifest.operations.forward.commandCount}** exact forward / rollback commands on its prepared source. The static prepare kernel passed, but the current authorization is deliberately prepare-only.\n\nA later acceptance must bind a newly captured/recompiled source, fresh entity clearance, exact source/rollback preflights, journaled execution, immutable post state, rollback post-state proof, and independent two-way 28-station functional QA. No acceptance is recorded by this request.\n`);
console.log(JSON.stringify({ status: request.status, mutationAuthority: false, acceptedRoles: 0, requiredRoles: Object.keys(request.requiredAcceptanceRoles).length, out: rel(out) }, null, 2));
