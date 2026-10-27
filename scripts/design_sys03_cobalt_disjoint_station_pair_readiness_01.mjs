#!/usr/bin/env node
/** Read-only source-bound readiness design; emits no Minecraft operations. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const OUT = option('--out', 'data/world-review/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01-passive-post-20260826T183111Z');
const SYS03_GATE = option('--sys03-gate', 'data/world-review/sys03-passenger-rail-commissioning-acceptance-gate-01-sys03-post-20260826T153100Z/sys03-passenger-rail-commissioning-acceptance-gate-01.json');
const FREEZE = option('--freeze', 'data/world-review/cobalt-s1-freeze-20260825/cobalt-s1-freeze.json');
const PASSIVE_MANIFEST = option('--passive-manifest', 'data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.release-manifest.json');
const PASSIVE_QA = option('--passive-qa', 'data/world-review/cobalt-s1-passive-rail-live-20260826T183111Z/post-release-qa.json');
const PASSIVE_LEDGER = option('--passive-ledger', 'data/world-review/cobalt-s1-passive-rail-live-20260826T183111Z/evidence-ledger.json');
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-s1-passive-rail-post-20260826T183111Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileHash = (value) => hash(fs.readFileSync(abs(value)));
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 Cobalt pair readiness rejected: ${message}`); };
const overlap = (a, b) => !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY || a.maxZ < b.minZ || a.minZ > b.maxZ);
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const required of [SYS03_GATE, FREEZE, PASSIVE_MANIFEST, PASSIVE_QA, PASSIVE_LEDGER, `${SNAPSHOT}/region`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`]) fail(fs.existsSync(abs(required)), `missing ${required}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');
const gate = read(SYS03_GATE);
const freeze = read(FREEZE);
const passiveManifest = read(PASSIVE_MANIFEST);
const passiveQa = read(PASSIVE_QA);
const passiveLedger = read(PASSIVE_LEDGER);
const capture = read(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);

fail(gate.status === 'SOURCE_BOUND_DEFAULT_DENY__NO_SYS03_PASSENGER_SERVICE_COMMISSIONED' && gate.acceptanceRule?.allGateCount === 8 && gate.acceptanceRule?.acceptedGateCount === 0 && gate.acceptanceRule?.passengerOpeningAllowed === false, 'SYS03 gate is not an eight-gate default deny');
fail(freeze.status === 'FREEZE_READY' && freeze.selectedPair === 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)' && freeze.readyForFreeze === true, 'Cobalt freeze does not identify the exact station pair');
fail(passiveManifest.scope?.selectedStationPair === freeze.selectedPair && passiveManifest.scope?.routeCommissioned === false && passiveManifest.scope?.passengerServiceCommissioned === false, 'passive rail source drifted or is mislabeled as service');
fail(passiveQa.status === 'PASS_EXECUTED_COBALT_S1_PASSIVE_RAIL_ISOLATION_QA' && passiveQa.functionalBoundary?.passiveRailIsolated === true && passiveQa.functionalBoundary?.passengerServiceCommissioned === false, 'passive release QA is not isolated/non-passenger');
fail(passiveLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && passiveLedger.postSnapshot?.root === SNAPSHOT, 'passive release ledger does not bind this post snapshot');
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'candidate post source is not a complete immutable capture');
const passiveHolds = passiveManifest.scope?.holdsExplicitlyExcluded ?? [];
fail(passiveHolds.length === 2 && passiveHolds.every((hold) => hold.interactionOverlapCellCount === 0), 'passive scope does not explicitly exclude both held envelopes');

const candidateBounds = { minX: -260, maxX: -150, minY: 12, maxY: 63, minZ: -470, maxZ: -376 };
const excludedHolds = passiveHolds.map((hold) => ({ ...hold, candidateOverlap: overlap(candidateBounds, hold.bounds), candidateXSeparation: hold.bounds.minX - candidateBounds.maxX }));
fail(excludedHolds.every((hold) => hold.candidateOverlap === false && hold.candidateXSeparation > 0), 'station-pair candidate reaches a held R10 scope');

const reader = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const passiveRailFailures = [];
for (const z of [-461, -455]) for (let x = -254; x <= -237; x += 1) {
  const actual = stateToCommandString(await reader.blockState(x, 13, z));
  if (actual !== 'minecraft:rail[shape=east_west,waterlogged=false]') passiveRailFailures.push({ point: [x, 13, z], actual });
}
fail(passiveRailFailures.length === 0, 'immutable post no longer contains the exact 36 passive rail cells');

const platform = freeze.westlight.platform.built;
const rrShaft = freeze.ravensreach.shaftRRSE1;
const rrSecondRoute = freeze.ravensreach.secondRoute;
const corridor = freeze.interstationCorridor;
const requirements = [
  ['platform', 'PC-03-PLATFORM-EDGE-AND-BOARDING', 'Westlight sealed deck exists; Ravensreach site/sleeve and second-route survey exist.', 'Exact two passenger platforms, edge barriers/gates, boarding zones, accessible return, and public egress acceptance are absent.'],
  ['guideway', 'PC-02-DIRECTIONAL-GUIDEWAY-SEPARATION', 'Continuous sealed service-corridor evidence and 36 isolated passive rails exist west of the retained diaphragm.', 'Complete two-direction guideways, continuous supports, cross-passages, separation, and sealed station interfaces are absent.'],
  ['power', 'PC-04-SIGNAL-POWER-FAILSAFE', 'No shared B09 maintenance controls are permitted.', 'All passenger power, signals, occupancy, brake, launch, outage, and out-of-service proof is absent.'],
  ['rescue', 'PC-05-RESCUE-AND-RECOVERY', 'RR-SE-1 sealed sleeve and RR-SE-2 surveyed dry route are retained as design inputs.', 'Two accepted protected passenger discharges, signed evacuation, cross-passage, cart recovery, and no-rail-walking proof are absent.'],
  ['return', 'PC-01-ROUTE-AND-STATION-PAIR', 'Pair selection and a surveyed second Ravensreach route are source-bound.', 'Named public approaches, two independent exits at each station, and fresh post-state bidirectional normal-walk proof are absent.'],
  ['protectedInterfaces', 'PC-08-FRESH-GUARDED-RELEASE-KERNEL', 'R10 normal-alignment and north-turn holds, B09 maintenance asset, venue, road, library, civic rooms, and Ravensgate exclusion remain external.', 'Exact renewed interface contracts plus a fresh scoped guarded-release kernel are required for any physical package.'],
];
const map = () => {
  const minX = -270; const maxX = 40; const minZ = -490; const maxZ = -360; const left = 84; const top = 100; const width = 1100; const height = 470;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * width; const sz = (z) => top + ((z - minZ) / (maxZ - minZ)) * height;
  const box = (bounds, fill, stroke, label) => `<rect x="${sx(bounds.minX)}" y="${sz(bounds.minZ)}" width="${sx(bounds.maxX + 1) - sx(bounds.minX)}" height="${sz(bounds.maxZ + 1) - sz(bounds.minZ)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${sx(bounds.minX) + 5}" y="${sz(bounds.minZ) + 16}" class="label">${escape(label)}</text>`;
  const corridorPath = [corridor.legA.bounds, corridor.legB.bounds, corridor.legC.bounds].map((bounds, index) => `${index ? 'L' : 'M'}${sx((bounds.minX + bounds.maxX) / 2)} ${sz((bounds.minZ + bounds.maxZ) / 2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="740" viewBox="0 0 1280 740"><style>.title{font:700 22px system-ui;fill:#f1f5f9}.sub{font:13px system-ui;fill:#cbd5e1}.label{font:600 12px system-ui;fill:#f8fafc}.small{font:11px system-ui;fill:#cbd5e1}.axis{font:11px ui-monospace,monospace;fill:#94a3b8}</style><rect width="100%" height="100%" fill="#091321"/><text x="32" y="36" class="title">SYS03 Cobalt station-pair candidate — Westlight PR-W02 ↔ Ravensreach PR-W04</text><text x="32" y="59" class="sub">Source-bound readiness plane only; it identifies an excluded-hold candidate, not a passenger alignment or opening.</text><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#12263a" stroke="#436277"/>${box(candidateBounds, '#1d4ed844', '#60a5fa', 'candidate envelope')} ${box(platform.linerBox, '#22c55e55', '#86efac', 'Westlight built deck')} ${box(rrShaft.sleeveBox, '#22c55e55', '#86efac', 'RR-SE-1 sealed sleeve')} ${box(rrSecondRoute.bounds, '#facc1555', '#fde68a', 'RR second-route input')} ${excludedHolds.map((hold) => box(hold.bounds, '#dc262655', '#fca5a5', `${hold.id} — excluded`)).join('')}<path d="${corridorPath}" fill="none" stroke="#67e8f9" stroke-width="8"/><text x="${sx(-230)}" y="${sz(-468) - 9}" class="small">sealed corridor Legs A/B/C</text><text x="84" y="610" class="label">Disjointness: candidate max X = -150; normal-alignment hold starts X = -75 (75-block coordinate separation); north-turn starts X = 25 (175-block coordinate separation).</text><text x="84" y="633" class="small">The candidate retains R10 holds, B09 maintenance-only assets, Westlight Venue, Approach Road, Ravensreach library/civic rooms, and Ravensgate exclusion as protected external interfaces.</text><text x="84" y="657" class="small">Missing before any passenger claim: PC-01 through PC-08, including stations, directional guideways, platform edges, power/signals, two-discharge rescue, trials, operating return, and a fresh release kernel.</text></svg>`;
};

const design = {
  schemaVersion: 1,
  id: 'SYS03-COBALT-WL-RR-DISJOINT-STATION-PAIR-READINESS-01',
  status: 'SOURCE_BOUND_CANDIDATE_ONLY__PC01_TO_PC08_UNACCEPTED',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, passengerServiceCommissioned: false },
  source: {
    immutableCobaltPost: { root: SNAPSHOT, captureId: capture.captureId, captureManifestSha256: fileHash(`${SNAPSHOT}/combined-zones-complete-save-capture.json`) },
    sys03CommissioningGate: { path: rel(SYS03_GATE), sha256: fileHash(SYS03_GATE), status: gate.status },
    cobaltFreeze: { path: rel(FREEZE), sha256: fileHash(FREEZE), status: freeze.status },
    passiveRailManifest: { path: rel(PASSIVE_MANIFEST), sha256: fileHash(PASSIVE_MANIFEST), status: passiveManifest.status },
    passiveRailPostQa: { path: rel(PASSIVE_QA), sha256: fileHash(PASSIVE_QA), status: passiveQa.status },
    passiveRailLedger: { path: rel(PASSIVE_LEDGER), sha256: fileHash(PASSIVE_LEDGER), status: passiveLedger.status },
  },
  candidate: { id: 'COBALT-S1-WL-PR-W02__RR-PR-W04', selectedPair: freeze.selectedPair, envelope: candidateBounds, westlight: { station: freeze.westlight.station, platform: platform }, ravensreach: { station: freeze.ravensreach.station, sealedServiceSleeve: rrShaft, secondRouteInput: rrSecondRoute }, corridor: { guidewayBounds: corridor.guidewayBounds, serviceCorridorBounds: corridor.corridorBounds, legs: [corridor.legA, corridor.legB, corridor.legC] } },
  disjointHeldScopes: excludedHolds,
  currentPhysicalFacts: { exactPassiveRailCells: 36, exactPassiveRailPostFailures: passiveRailFailures, retainedDiaphragmAtX: passiveQa.functionalBoundary.retainedDiaphragmAtX, passiveOnly: true, platformDeckCells: platform.deckSurfaceCellCount, westlightPlatformLinerCells: platform.targetCellCount, ravensreachSleeveCells: rrShaft.targetCellCount, secondRouteSurveyCells: rrSecondRoute.cellCount },
  requiredSystems: requirements.map(([id, gateId, currentInput, missingPrerequisite]) => ({ id, gateId, currentInput, missingPrerequisite, accepted: false })),
  protectedInterfaces: freeze.ownerInterfaceList,
  missingAcceptanceGates: gate.acceptanceGates.map(({ id, requirement }) => ({ id, requirement, accepted: false })),
  nonClaims: ['No rail alignment, platform, guideway, power, signal, rescue route, passenger trial, public route, station opening, or passenger service is accepted.', 'This candidate does not resolve, borrow, contain, or modify the R10 normal-alignment or north-turn fluid/gravity holds.', 'No operation, release manifest, RCON call, or mutation authority is emitted.'],
};
design.designIdentitySha256 = hash(`${JSON.stringify(design, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01.json`), `${JSON.stringify(design, null, 2)}\n`);
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-map.svg`), `${map()}\n`);
fs.writeFileSync(abs(`${OUT}/SYS03-COBALT-WL-RR-DISJOINT-STATION-PAIR-READINESS-01.md`), `# SYS03 Cobalt Westlight ↔ Ravensreach disjoint station-pair readiness 01\n\n**Status:** \`${design.status}\`\n\n![Candidate readiness map](sys03-cobalt-wl-rr-disjoint-station-pair-readiness-map.svg)\n\nThe sole candidate is **${freeze.selectedPair}**. Its finite envelope is \`X=${candidateBounds.minX}…${candidateBounds.maxX}, Y=${candidateBounds.minY}…${candidateBounds.maxY}, Z=${candidateBounds.minZ}…${candidateBounds.maxZ}\`. It is geometrically disjoint from both R10 holds: normal-alignment starts at X=-75 and north-turn starts at X=25.\n\nThe map binds existing passive rail and civil inputs, but the SYS03 gate has **0/8** accepted passenger commissioning gates. Every listed platform, guideway, power/signal, rescue, return, and protected-interface requirement remains a future acceptance input. No passenger service, opening, or construction authority follows from this design.\n`);
console.log(JSON.stringify({ status: design.status, candidate: design.candidate.selectedPair, candidateBounds, holds: excludedHolds.map(({ id, candidateOverlap, candidateXSeparation }) => ({ id, candidateOverlap, candidateXSeparation })), requiredGateCount: design.missingAcceptanceGates.length, acceptedGateCount: 0, mutationAuthority: false }, null, 2));
