#!/usr/bin/env node
/**
 * Generate the source-level, non-authorizing owner/interface proposal for the
 * R10 High-16 descending civil bypass. This never grants mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const manifestPath = arg('--manifest'); const outDir = arg('--out-dir');
if (!manifestPath || !outDir) throw new Error('usage: --manifest <compiled-manifest> --out-dir <directory>');
const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(absolute(file));
const json = (file) => JSON.parse(read(file));
const must = (value, message) => { if (!value) throw new Error(`SYS-03 High-16 protocol rejected: ${message}`); };

const manifestBytes = read(manifestPath); const manifest = JSON.parse(manifestBytes);
must(manifest.status === 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL', 'manifest is not an offline candidate');
must(manifest.civilOnly === true && manifest.passengerServiceCommissioned === false, 'candidate is not civil-only');
must(manifest.exactInverse === true && manifest.stages?.length === 2, 'candidate lacks two-stage exact inverse');
const [shell, core] = manifest.stages;
must(shell.id === 'shell-gravity-lock' && shell.count === 1638 && shell.exactInverse, 'shell stage drift');
must(core.id === 'core-clear-top-down' && core.count === 3227 && core.exactInverse, 'core stage drift');
must(manifest.route?.crossSection === '6x6' && manifest.route?.stations?.length === 46 && manifest.route.continuous, 'route geometry drift');
must(manifest.ownership?.ingress?.count === 30, 'High-15 ingress drift');
must(manifest.ownership?.migration?.count === 36, 'High-15 migration drift');
must(manifest.ownership?.preservedHigh15RouteAir?.count === 36, 'High-15 retained air drift');
const chains = manifest.hazards?.gravityChains ?? [];
must(chains.length === 107 && chains.every((chain) => chain.staticSupport && chain.preservedWillRemainSupported), 'gravity-chain safety drift');
must((manifest.hazards?.fluids ?? []).length === 0 && (manifest.hazards?.unknownAir ?? []).length === 0
  && (manifest.hazards?.blockEntities ?? []).length === 0 && (manifest.hazards?.savedEntities ?? []).length === 0, 'static hazard census drift');

const contract = {
  schemaVersion: 1,
  contractId: 'SYS03-R10-HIGH16-DESCENDING-BYPASS-02-OWNER-INTERFACE-RENEWAL',
  status: 'PROPOSED_EXACT_OWNER_INTERFACE_RENEWAL_AWAITING_ACCEPTANCE',
  mutationAuthority: false,
  civilOnly: true,
  passengerServiceCommissioned: false,
  sourceBinding: {
    manifest: relative(manifestPath),
    manifestSha256: sha(manifestBytes),
    sourceSnapshot: manifest.source.snapshot,
    sourceCaptureManifestSha256: manifest.source.completeSaveCaptureManifestSha256,
  },
  owners: {
    candidateCivilEnvelope: 'SYS03-R10-HIGH16-DESCENDING-BYPASS-02',
    predecessorHigh15: 'RAIL-S3-R10-HIGH-SUCCESSOR-15-NORTH-BYPASS',
    protectedCobaltWestlightHeadhouse: 'COBALT-WL-HEADHOUSE-01',
  },
  exactGeometry: {
    route: { crossSection: manifest.route.crossSection, stations: manifest.route.stations.length, core: manifest.route.core },
    shell: manifest.geometry.shell,
    halo: manifest.geometry.halo,
    interaction: manifest.geometry.interaction,
  },
  interfaces: {
    retainedHigh15Ingress: { ...manifest.ownership.ingress, disposition: 'RETAINED_CURRENT_AIR__NOT_A_TARGET' },
    high15Migration: { ...manifest.ownership.migration, disposition: 'TRANSFER_ONLY_FOR_STAGE_2_AFTER_STAGE_1_LOCK' },
    preservedHigh15RouteAir: { ...manifest.ownership.preservedHigh15RouteAir, disposition: 'RETAINED_CURRENT_AIR__EXCLUDED_FROM_ALL_OPERATIONS' },
    protectedCobaltWestlightHeadhouse: {
      manifest: manifest.ownership.protectedPath,
      targetCount: manifest.ownership.protectedTargetCount,
      observedTargetOverlap: manifest.ownership.protectedOverlap,
      disposition: 'EXCLUDED__ZERO_TARGET_OVERLAP_REQUIRED',
    },
  },
  stagedOperationContract: {
    forward: [
      { id: shell.id, count: shell.count, sha256: shell.sha256, semantic: 'bottom-up shell and gravity lock; must complete before core stage' },
      { id: core.id, count: core.count, sha256: core.sha256, semantic: 'top-down core clear and exact High-15 migration' },
    ],
    rollback: [
      { id: core.id, count: core.count, sha256: core.rollbackSha256, semantic: 'restore core before shell rollback' },
      { id: shell.id, count: shell.count, sha256: shell.rollbackSha256, semantic: 'restore shell after core rollback' },
    ],
    exactInverse: true,
  },
  gravityContract: {
    totalChains: chains.length,
    coreTargets: chains.filter(({ kind }) => kind === 'core-target').length,
    shellTargets: chains.filter(({ kind }) => kind === 'shell-target').length,
    retainedHaloChains: chains.filter(({ kind }) => kind === 'halo-preserved').length,
    sourceAndForwardSupportRequired: true,
    failureAction: 'ABORT_BEFORE_STAGE_1',
  },
  acceptanceRequirements: [
    'One named owner accepts the candidate envelope and the exact 36-cell High-15 migration only; no wildcard or envelope-wide transfer.',
    'The 30 ingress-air and 36 retained route-air cells are explicitly retained and excluded.',
    'The Cobalt Westlight Headhouse protected target overlap remains exactly zero.',
    'A fresh same-moment source repeats all source-state, gravity, container/block-entity, saved-entity, and live-entity gates.',
    'Only the two hash-bound stages and their reverse rollback order may be executed.',
    'Post acceptance must use the independent QA and evidence finalizer; neither grants passenger authority.',
  ],
  nonClaims: [
    'This proposal does not authorize a capture, RCON command, operation execution, configuration change, or world mutation.',
    'This proposal is civil-only and does not authorize track, a service opening, public access, a station, power, signalling, rescue, vehicle trials, or passenger service.',
  ],
};
const report = `# SYS-03 R10 High-16 descending bypass · source-level release protocol\n\n**Status:** \`${contract.status}\`; **mutation authority: false**. The proposed owner/interface renewal is exact and source-bound, but is not an acceptance or a release authorization.\n\n## Exact adoption decision required\n\n- Candidate owner: \`${contract.owners.candidateCivilEnvelope}\`.\n- High-15 retains ${contract.interfaces.retainedHigh15Ingress.count} ingress-air cells and ${contract.interfaces.preservedHigh15RouteAir.count} route-air cells. Neither set may be targeted.\n- Exactly ${contract.interfaces.high15Migration.count} High-15 PDS cells may transfer only after Stage 1 locks the new shell.\n- Cobalt Westlight Headhouse has zero permitted target overlap.\n\n## Fail-closed staged transaction\n\n| Stage | Commands | Required order |\n|---|---:|---|\n| Shell/gravity lock | ${shell.count} | bottom-up; must finish before core clear |\n| Core clear + migration | ${core.count} | top-down |\n| Rollback | ${core.count}, then ${shell.count} | reverse stage order |\n\nAll ${chains.length} gravity chains are source/forward-supported in this source-level design. A fresh source or any interface drift invalidates this proposal.\n\n## Required evidence before a physical release\n\n1. Exact accepted owner/interface record binding this proposal SHA-256 and retaining the no-target cells.\n2. Fresh complete source intake and static source QA.\n3. Source shell preflight; core projected preflight with only the hash-bound shell overlay; strict parser checks for all four files.\n4. Block-entity, saved-entity, and same-moment live-entity clearance for each stage.\n5. Journaled strict shell execution followed by core execution, fresh immutable post, exact rollback post-state preflights, independent post QA, then finalizer.\n\nNo rail or passenger authorization is part of this protocol.\n`;
fs.mkdirSync(absolute(outDir), { recursive: true });
const contractPath = `${outDir}/sys03-r10-high16-descending-bypass-owner-interface-proposal.json`;
const reportPath = `${outDir}/SYS03-R10-HIGH16-DESCENDING-BYPASS-RELEASE-PROTOCOL.md`;
fs.writeFileSync(absolute(contractPath), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(absolute(reportPath), report);
console.log(JSON.stringify({ status: contract.status, mutationAuthority: contract.mutationAuthority, contract: relative(contractPath), report: relative(reportPath) }, null, 2));
