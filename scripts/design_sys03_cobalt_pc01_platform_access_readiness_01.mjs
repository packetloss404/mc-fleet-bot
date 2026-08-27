#!/usr/bin/env node
/** PC-01 readiness design only: no operations, RCON, or release authority. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const CANDIDATE = option('--candidate', 'data/world-review/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01-passive-post-20260826T183111Z/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01.json');
const OUT = option('--out', 'data/world-review/sys03-cobalt-wl-rr-pc01-platform-access-readiness-01-passive-post-20260826T183111Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const bytes = (value) => fs.readFileSync(abs(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = (value) => sha256(bytes(value));
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 Cobalt PC-01 readiness rejected: ${message}`); };
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

fail(fs.existsSync(abs(CANDIDATE)), `missing candidate readiness ${CANDIDATE}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');
const candidate = JSON.parse(bytes(CANDIDATE));
fail(candidate.status === 'SOURCE_BOUND_CANDIDATE_ONLY__PC01_TO_PC08_UNACCEPTED' && candidate.disposition?.readOnly === true && candidate.disposition?.mutationAuthority === false, 'candidate is not a source-bound default-deny design');
fail(candidate.candidate?.selectedPair === 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)' && candidate.currentPhysicalFacts?.exactPassiveRailPostFailures?.length === 0, 'wrong pair or passive post evidence');
fail(candidate.disjointHeldScopes?.length === 2 && candidate.disjointHeldScopes.every((hold) => hold.candidateOverlap === false), 'R10 held scopes are not excluded');
const wl = candidate.candidate.westlight;
const rr = candidate.candidate.ravensreach;
const corridor = candidate.candidate.corridor;
const rrPublic = rr.secondRouteInput;
const rrService = rr.sealedServiceSleeve;
const wlPlatform = wl.platform;
fail(wlPlatform?.deckSurfaceCellCount === 68 && wlPlatform?.targetCellCount === 550, 'Westlight platform evidence drifted');
fail(rrService?.targetCellCount === 711 && rrService?.waterPocketResolved === true, 'Ravensreach service sleeve evidence drifted');
fail(rrPublic?.cellCount === 450 && rrPublic?.walkableProof?.walkableBothDirections === true && rrPublic.walkableProof?.checks?.restrictedOverlap === 0 && rrPublic.walkableProof?.checks?.verticalShaft?.fluid === 0 && rrPublic.walkableProof?.checks?.verticalShaft?.gravity === 0 && rrPublic.walkableProof?.checks?.verticalShaft?.forbidden === 0, 'Ravensreach public-route source survey drifted');

const endpointContracts = [
  { id: 'WL-PC01-SURFACE-PUBLIC-5X5', class: 'public', sourceArea: wl.station.area, status: 'UNBOUND_FRESH_5X5_CONCOURSE_REQUIRED', requirement: 'Freeze one exact 5×5 public concourse plane inside the surveyed Westlight station area, with canonical support/clear states and two independent public returns.' },
  { id: 'WL-PC01-PLATFORM-PUBLIC-5X5', class: 'public', sourceArea: wlPlatform.clearVolume, status: 'UNBOUND_FRESH_PLATFORM_FACE_REQUIRED', requirement: 'Freeze one exact 5×5 public platform-approach interface inside/adjacent to the existing Westlight clear volume; retain the service corridor and passive rails as separate.' },
  { id: 'RR-PC01-SURFACE-PUBLIC-5X5', class: 'public', sourceArea: rrPublic.components.surfaceEntryPad.bounds, status: 'SOURCE_PAD_3X3_ONLY__UPGRADE_TO_5X5_REQUIRED', requirement: 'The surveyed RR-SE-2 surface pad is only 3×3; select and audit an exact 5×5 concourse plane without borrowing RR-SE-1 service sleeve or protected civic fabric.' },
  { id: 'RR-PC01-PLATFORM-PUBLIC-5X5', class: 'public', sourceArea: rrPublic.components.corridorHeadEdge.bounds, status: 'UNBOUND_FRESH_PLATFORM_FACE_REQUIRED', requirement: 'Freeze an exact 5×5 public platform interface at the Ravensreach corridor head after a dedicated platform volume is designed.' },
  { id: 'RR-SE-1-SERVICE-3X3', class: 'service', sourceArea: rrService.clearVolume, status: 'PROTECTED_SERVICE_ONLY', requirement: 'Retain the sealed 3×3 sleeve as controlled service/rescue infrastructure; it cannot be relabelled as a public exit or be shared with public circulation.' },
];
const exclusions = {
  fluidAndGravity: {
    knownSourceFacts: [
      'RR-SE-2 surveyed vertical shaft: 0 fluid, 0 gravity, 0 forbidden in 396 source cells.',
      'RR-SE-2 horizontal stub: 0 fluid and 0 gravity in 36 source cells.',
      'RR-SE-1 resolved water pocket remains behind a sealed 711-cell sleeve.',
      'Both R10 fluid/gravity hold envelopes are geometrically excluded from the candidate.',
    ],
    futureGate: 'Every exact platform, public-access, and service-interface interaction halo must be freshly censused; no unobserved fluid or gravity state may be inferred from this design.',
  },
  blockEntitiesAndContainers: { currentStatus: 'NOT_PROVED_FOR_FUTURE_PC01_TARGETS', futureGate: 'Fresh exact target-plus-halo block-entity/container census must be zero or use an exact reviewed migration; the historical `forbidden=0` survey is not a release clearance.' },
  entities: { currentStatus: 'NOT_PROVED_FOR_FUTURE_PC01_TARGETS', futureGate: 'Same-moment live entity clearance immediately before any mutation; no historical entity result may be reused.' },
  protectedInterfaces: { currentStatus: 'RETAIN_AND_EXCLUDE', records: candidate.protectedInterfaces, futureGate: 'Any future public/platform target must demonstrate zero protected-core and ownership-interface overlap.' },
};
const inversePrerequisites = {
  currentState: 'NO_TARGET_STATES_OR_OPERATIONS_EMITTED',
  requiredBeforeAnyCompiler: [
    'Fresh immutable complete source snapshot and exact scoped survey.',
    'Canonical source state for every target and interaction-halo cell.',
    'Canonical target state for platform, access, barrier/gate, lighting, and all receiver/interface cells.',
    'Forward operation order plus exact reverse inverse order, including any finite fluid/gravity containment before public-core carve.',
    'Strict forward/rollback parser, source preflight, protected/block-entity audit, live-entity clearance, journaled execution, fresh post capture, rollback poststate preflight, and independent functional QA.',
  ],
};
const requiredReturns = [
  { station: 'Westlight PR-W02', requirement: 'Two exact independent public surface-to-platform returns, one of which may not use any service corridor, passive rail, or RR infrastructure.' },
  { station: 'Ravensreach PR-W04', requirement: 'Two exact independent public surface-to-platform returns: RR-SE-2 must grow from its surveyed 3×3 pad into an accepted 5×5 public interface; RR-SE-1 remains service-only and cannot satisfy the second public return alone.' },
  { pair: 'WL ↔ RR', requirement: 'Fresh immutable post QA must prove normal walking in both directions for each public return and station-to-station passenger path, with no rail-walking dependency.' },
];
const map = () => {
  const minX = -270; const maxX = -140; const minZ = -480; const maxZ = -370; const left = 90; const top = 104; const width = 1060; const height = 470;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * width; const sz = (z) => top + ((z - minZ) / (maxZ - minZ)) * height;
  const box = (bounds, color, label) => `<rect x="${sx(bounds.minX)}" y="${sz(bounds.minZ)}" width="${sx(bounds.maxX + 1) - sx(bounds.minX)}" height="${sz(bounds.maxZ + 1) - sz(bounds.minZ)}" fill="${color}44" stroke="${color}" stroke-width="2"/><text x="${sx(bounds.minX) + 4}" y="${sz(bounds.minZ) + 15}" class="label">${escape(label)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="740" viewBox="0 0 1280 740"><style>.title{font:700 22px system-ui;fill:#f1f5f9}.sub{font:13px system-ui;fill:#cbd5e1}.label{font:600 12px system-ui;fill:#f8fafc}.small{font:11px system-ui;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#091321"/><text x="34" y="38" class="title">SYS03 PC-01 — Cobalt Westlight ↔ Ravensreach platform/access readiness</text><text x="34" y="61" class="sub">Observed source volumes and required future interfaces; candidate only, no platform/access construction authority.</text><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#12263a" stroke="#436277"/>${box(wl.station.area, '#facc15', 'WL surveyed surface area')} ${box(wlPlatform.linerBox, '#22c55e', 'WL built platform liner')} ${box(corridor.serviceCorridorBounds, '#38bdf8', 'sealed service corridor')} ${box(rr.station.area, '#facc15', 'RR surveyed station area')} ${box(rrService.sleeveBox, '#fb7185', 'RR-SE-1 service only')} ${box(rrPublic.bounds, '#a78bfa', 'RR-SE-2 public-route input')}<text x="90" y="610" class="label">Public/service rule: RR-SE-1 is protected service/rescue only. RR-SE-2 is a surveyed public-route input but has a 3×3 surface pad, not an accepted 5×5 concourse.</text><text x="90" y="635" class="small">All four public 5×5 endpoint contracts remain UNBOUND and require fresh source states, target states, exact inverse, protected/BE/entity clearances, and post-state normal-walk returns.</text><text x="90" y="660" class="small">No passive rail, sealed sleeve, platform liner, or service corridor is a public station, passenger guideway, power system, or commissioned return.</text></svg>`;
};
const design = {
  schemaVersion: 1,
  id: 'SYS03-COBALT-PC01-PLATFORM-ACCESS-READINESS-01',
  status: 'SOURCE_BOUND_PC01_READINESS_ONLY__PUBLIC_ENDPOINTS_AND_RETURNS_UNACCEPTED',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false },
  source: { candidate: { path: rel(CANDIDATE), sha256: fileSha256(CANDIDATE), status: candidate.status }, immutableCobaltPost: candidate.source.immutableCobaltPost },
  selectedPair: candidate.candidate.selectedPair,
  exactObservedScopes: { westlight: { surfaceStationArea: wl.station.area, existingPlatformClearVolume: wlPlatform.clearVolume, existingPlatformDeck: wlPlatform.deckSurface, existingPlatformLiner: wlPlatform.linerBox }, ravensreach: { surfaceStationArea: rr.station.area, existingServiceSleeve: rrService.sleeveBox, existingServiceClearVolume: rrService.clearVolume, surveyedPublicSecondRoute: rrPublic.bounds, surveyedPublicSecondRouteComponents: rrPublic.components }, retainedServiceCorridor: corridor.serviceCorridorBounds },
  publicServiceSeparation: { rule: 'Public PC-01 circulation cannot share RR-SE-1, the sealed service corridor, passive rail tracks, or their control/maintenance envelopes.', rrSe1: 'protected service only', rrSe2: 'future public return input only; its current 3×3 surface pad is not an accepted 5×5 concourse', passiveRail: 'isolated and non-passenger', corridor: 'service only until separately accepted.' },
  endpointContracts,
  returnContracts: requiredReturns,
  exclusions,
  targetAndInversePrerequisites: inversePrerequisites,
  missingAcceptance: { pc01Accepted: false, reason: 'No exact public 5×5 endpoints, full public platforms, two accepted public returns at each station, fresh complete-source exclusions, canonical target states, inverse, or post-state normal-walk evidence exist.', allPassengerGatesRemainUnaccepted: true },
  nonClaims: ['No platform, stair, shaft, guideway, rail, gate, light, power, signal, rescue route, public route, passenger trial, or station opening is designed as a release target.', 'No operation, forward/rollback file, mutation authority, RCON call, or world change is emitted.', 'The R10 normal-alignment and north-turn fluid/gravity holds remain excluded and unresolved.'],
};
design.designIdentitySha256 = sha256(`${JSON.stringify(design, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-pc01-platform-access-readiness-01.json`), `${JSON.stringify(design, null, 2)}\n`);
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-pc01-platform-access-readiness-map.svg`), `${map()}\n`);
fs.writeFileSync(abs(`${OUT}/SYS03-COBALT-PC01-PLATFORM-ACCESS-READINESS-01.md`), `# SYS03 Cobalt PC-01 platform/access readiness 01\n\n**Status:** \`${design.status}\`\n\n![PC-01 scope map](sys03-cobalt-pc01-platform-access-readiness-map.svg)\n\nThis read-only packet binds the selected **${design.selectedPair}** candidate to existing platform/access evidence and lists the missing exact public contracts. It emits no targets or operations.\n\n- Westlight has a retained 68-cell deck within a 550-cell sealed liner, but no accepted public 5×5 surface or platform interface.\n- Ravensreach has an RR-SE-1 sealed **service-only** sleeve and a dry, surveyed RR-SE-2 public-route input. RR-SE-2 still has only a 3×3 surface pad and no accepted platform volume.\n- Each station needs two exact, independent public surface-to-platform returns; no service shaft, rail, or maintenance corridor can substitute.\n\nFresh immutable source, canonical target/inverse states, fluid/gravity, block-entity/container, protected-interface, and same-moment entity clearance are mandatory before any physical compiler can be considered. PC-01 and all other passenger gates remain unaccepted.\n`);
console.log(JSON.stringify({ status: design.status, selectedPair: design.selectedPair, endpointContractCount: endpointContracts.length, publicEndpointUnboundCount: endpointContracts.filter((contract) => contract.class === 'public' && contract.status !== 'PROTECTED_SERVICE_ONLY').length, pc01Accepted: false, mutationAuthority: false }, null, 2));
