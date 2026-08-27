#!/usr/bin/env node
/**
 * MP04 integrated B07 / B08 / B09 / B03 setout.
 *
 * A deliberately read-only reconciler. It binds the existing source-bound
 * B07 and B09 studies to the one current MP06 immutable save and emits a
 * no-operation integration decision package. It may never write buildops.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const source = arg('--source', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z');
const outDir = arg('--out-dir', 'data/world-review/mp04-integrated-setout-02-current-mp06-post-20260826T143902Z');
const resolve = (file) => path.resolve(root, file);
const rel = (file) => path.relative(root, resolve(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(resolve(file), 'utf8');
const json = (file) => JSON.parse(read(file));
const fail = (condition, message) => { if (!condition) throw new Error(`MP04 integrated setout rejected: ${message}`); };
const write = (file, body) => fs.writeFileSync(resolve(path.join(outDir, file)), body);

const authorityFile = 'docs/masterplans/04-combined-complex/AUTHORITY.md';
const currentStateFile = 'docs/masterplans/05-combined-zones/CURRENT-STATE.md';
const b07File = 'data/world-review/mp05-b07-integrated-design-03-mp06-post-20260826T143902Z/integrated-design-findings.json';
const b07ContractFile = 'data/world-review/mp05-b07-first-viable-release-contract-02-mp06-post-20260826T143902Z/first-viable-release-contract.json';
const b09File = 'data/world-review/mp05-b09-b08-interface-egress-feasibility-02-current-mp06-post-20260826T143902Z/b08-b09-interface-egress-feasibility.json';
const b09RescueFile = 'data/world-review/mp05-b09-lower-station-receiver-interface-design-02-current-mp06-post-20260826T143902Z/source-bound-design-hold.json';
const authority = read(authorityFile);
const currentState = read(currentStateFile);
const b07 = json(b07File);
const b07Contract = json(b07ContractFile);
const b09 = json(b09File);
const b09Rescue = json(b09RescueFile);
const sourceHash = 'c75307cbef3c7da76dcff63bd4f33af1c8f4d78a67fb9831258b3d07370f8d05';

fail(authority.includes('Masterplan 05 owns placement in the accepted current world'), 'MP04/MP05 placement authority wording is absent');
fail(authority.includes('no approved block-rounding policy'), 'vertical-setout hold wording is absent');
fail(b07.source.snapshotRoot === source, 'B07 study is not bound to supplied source');
fail(b09.source.snapshotRoot === source && b09.source.regionSha256 === sourceHash, 'B09 study is not bound to supplied MP06 source identity');
fail(b07Contract.source.snapshot === source, 'B07 finite-stage gate is not bound to supplied source');
fail(b09.status.includes('HOLD') && b07.status.includes('HELD') && b07Contract.status === 'BLOCKED_NO_SAFE_FINITE_STAGE_OR_OPERATION', 'predecessor dispositions drifted');
fail(currentState.includes('B03 indices 188–800 enclosed-route circulation') && currentState.includes('Indices 0–187 remain uncommissioned behind 63 route obstructions and 14 unsupported floor-air cells'), 'B03 current interface ledger wording is absent');

const aperture = b09.controlledDoorDecision.candidate;
const receiver = b09.candidateEnvelopes.find(({ id }) => id === 'C02-SOUTH-RECEIVER-6X6-STUDY');
const egress = b09.candidateEnvelopes.find(({ id }) => id === 'C03-SOUTH-SERVICE-EGRESS-6X6-STUDY');
const northNegative = b09.candidateEnvelopes.find(({ id }) => id === 'C04-NORTH-TRACKSIDE-6X6-NEGATIVE');
fail(aperture.exactEnvelope.cellCount === 2 && aperture.currentStateCensus['minecraft:polished_diorite'] === 2, 'B09 aperture census drifted');
fail(receiver.exactEnvelope.cellCount === 252 && egress.exactEnvelope.cellCount === 864 && northNegative.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount === 2, 'B09 receiver study geometry drifted');

const b07Inventory = b07.sourceInventory;
const b07Gate = b07Contract.exactCurrentGateInputs;
fail(b07Inventory.constructionFluid.cellCount === 5 && b07Inventory.interactionFluid.cellCount === 89, 'B07 fluid census drifted');
fail(b07Inventory.interactionGravity.cellCount === 90 && b07Gate.gravity.unsupportedChains === 11, 'B07 gravity census drifted');
const anchors = {
  b07Headhouse: { x: 2108, y: 72, z: -398, owner: 'MP05 P1-B07', state: 'doorless / no classified exterior receiver' },
  b08Approach: { x: 1948, y: 72, z: -628, owner: 'MP05 P1-B08', state: 'approach only; no B09 receiver contract' },
  b08B09Seam: { x: 2048, y: 130, z: -748, owner: 'MP05 P1-B08 / P1-B09 seam', state: 'default deny' },
  b09Cap: { x: 2050, y: 130, z: -748, owner: 'MP05 P1-B09', state: 'two-cell aperture study remains polished diorite' },
  b03Portal: { x: 2048, y: 130, z: -748, owner: 'MP05 P1-B03', state: 'internal B03 only; no accepted public receiver' },
};
const distance = Math.hypot(anchors.b07Headhouse.x - anchors.b08Approach.x, anchors.b07Headhouse.z - anchors.b08Approach.z);

const reportBare = {
  schemaVersion: 1,
  id: 'MP04-INTEGRATED-SETOUT-02',
  generatedAtUtc: '2026-08-26T15:25:00Z',
  status: 'DEFAULT_DENY__NO_SAFE_EXACT_INTEGRATED_OPERATION_CANDIDATE',
  source: { snapshotRoot: source, regionSha256: sourceHash, completeSaveCapture: 'combined-zones-155f6217e7034843ba5a3946b23e4605', regionFiles: 52 },
  readOnly: { capture: false, rcon: false, operationFiles: [], worldMutations: false },
  authority: { mp04CurrentWorldCells: 0, finding: 'MP04 owns normalized composition only. MP05 owns all B07/B08/B09/B03 placement, interfaces, and release gates.' },
  anchors: { ...anchors, b07ToB08PlanDistance: Number(distance.toFixed(2)) },
  reconciledPrerequisites: [
    { id: 'B07-THROUGH-ENDPOINT', state: 'NOT A FUNCTIONAL THROUGH ENDPOINT', evidence: { constructionFluidCells: 5, interactionFluidCells: 89, interactionGravityCells: 90, unsupportedGravityChains: 11, exteriorReceiver: 'unclassified / unowned' }, required: 'One MP05-owned permanent dry-containment, gravity-migration, normal-walk, landing, exterior-boundary, power/smoke/drainage and rollback system.' },
    { id: 'B07-B08-CORRIDOR', state: 'NO BOUNDED OR OWNED CORRIDOR', evidence: { endpointPlanDistance: Number(distance.toFixed(2)), endpoints: ['B07 headhouse', 'B08 approach'] }, required: 'Exact MP05 corridor bounds, protected-core/terrain/fluid census, ownership, structural and failure-state contract; no map line may substitute.' },
    { id: 'B08-B09-TRANSFER', state: 'DEFAULT DENY / CLOSED', evidence: { apertureStudy: aperture.exactEnvelope, currentState: aperture.currentStateCensus, authority: aperture.currentAuthority }, required: 'Directional IF-B08-B09-PORTAL contract naming owner, access class, source/post/inverse, closed and powered-failure state, receiver, and B08 circulation impact.' },
    { id: 'B09-RECEIVER-RESCUE', state: 'GEOMETRY ONLY / NO FUNCTION', evidence: { receiverStudy: receiver.exactEnvelope, egressStudy: egress.exactEnvelope, rescueDischarges: '0/2 accepted', protectedR12RCart: true, northTracksideNegative: northNegative.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount }, required: 'Integrated platform-edge/barrier, normal-walk, separate 6x6 service route, drainage, controls, rescue discharges, and cart treatment design.' },
    { id: 'B03-RECEIVER', state: 'NO ACCEPTED EXTERNAL RECEIVER', evidence: { internalCommissioning: 'indices 188..800 only', closedApproach: 'indices 0..187 retain 63 obstructions and 14 unsupported floor-air cells' }, required: 'An MP05 B03 endpoint/interface contract that preserves or deliberately redesigns protected internal circulation, controls, terminal use, and failure/egress behavior.' },
    { id: 'GUARDED-RELEASE', state: 'NOT REACHED', evidence: { forwardOperations: 0, rollbackOperations: 0 }, required: 'After all contracts are accepted: immediate complete source; full state/entity/block-entity clearance; exact inverse; strict parser/preflight; journalled execution; fresh post source; rollback and end-to-end normal-walk/rescue QA.' },
  ],
  decision: {
    safeIndependentCandidate: false,
    reason: 'Every physical leg crosses MP05-only cells and each of the B07 endpoint, B07-B08 corridor, B08-B09 transfer, B09 receiver/rescue route, and B03 receiver is incomplete. They are coupled functional safety work, so carving a local subset would not be reversible or usable.',
    nextDesignPackage: 'MP05-owned all-or-nothing B07/B08/B09/B03 integrated connector design; MP04 may only accept its normalized anchor/narrative relationship after the physical package closes.',
  },
  inputs: [authorityFile, currentStateFile, b07File, b07ContractFile, b09File, b09RescueFile].map((file) => ({ path: file, sha256: sha(read(file)) })),
};
const manifestIdentity = sha(JSON.stringify(reportBare));
const report = { ...reportBare, manifestIdentity };
fs.mkdirSync(resolve(outDir), { recursive: true });
write('mp04-integrated-setout.json', `${JSON.stringify(report, null, 2)}\n`);

const svgHead = (title, width, height) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Arial,sans-serif;fill:#e7eef6}.title{font-size:25px;font-weight:700}.label{font-size:17px;font-weight:700}.small{font-size:14px}.tiny{font-size:12px}.box{stroke:#dce6f2;stroke-width:2}.hold{fill:#5b2229}.gate{fill:#704f1e}.owned{fill:#173f5f}.good{fill:#174b3e}.line{stroke:#dce6f2;stroke-width:3}.dash{stroke:#e7b85b;stroke-width:3;stroke-dasharray:10 8}</style><rect width="100%" height="100%" fill="#111820"/><text x="28" y="38" class="title">${title}</text>`;
const svgFoot = (height) => `<text x="28" y="${height - 20}" class="tiny">Read-only decision map · MP06 complete post source · no operation or world mutation</text></svg>`;
const planMap = `${svgHead('MP04 integrated connector — current plan / ownership', 1200, 660)}
<text x="28" y="64" class="small">North is up. Dashed segments are deliberately unowned/unset-out; they are not proposed routes.</text>
<rect class="box hold" x="70" y="110" width="220" height="170" rx="10"/><text x="90" y="142" class="label">B07 Houston headhouse</text><text x="90" y="168" class="small">(2108,72,-398)</text><text x="90" y="194" class="small">MP05 P1-B07</text><text x="90" y="220" class="small">doorless; no exterior receiver</text><text x="90" y="246" class="small">5 construction fluid / 11 unsupported chains</text>
<path class="dash" d="M290 195 C450 155, 570 280, 700 340"/><text x="405" y="220" class="label">${distance.toFixed(2)} blocks, no surveyed/owned corridor</text>
<rect class="box gate" x="700" y="270" width="190" height="140" rx="10"/><text x="720" y="302" class="label">B08 approach</text><text x="720" y="328" class="small">(1948,72,-628)</text><text x="720" y="354" class="small">MP05 P1-B08</text><text x="720" y="380" class="small">no receiver contract</text>
<path class="dash" d="M795 410 L795 492"/><text x="817" y="455" class="small">connector geometry absent</text>
<rect class="box hold" x="650" y="505" width="275" height="98" rx="10"/><text x="670" y="535" class="label">B08/B09/B03 encounter</text><text x="670" y="560" class="small">(2048..2050,130,-748) · MP05-only</text><text x="670" y="584" class="small">closed B09 cap; no accepted receiver</text>
<rect class="box owned" x="970" y="505" width="180" height="98" rx="10"/><text x="990" y="535" class="label">B03 internal route</text><text x="990" y="560" class="small">188..800 bounded only</text><text x="990" y="584" class="small">no external receiver</text>${svgFoot(660)}`;
const interfaceMap = `${svgHead('B08 → B09 → B03 lower interface — exact current setout', 1200, 500)}
<text x="40" y="80" class="small">West → east at y=130–131. The two highlighted cap cells are a design study, not an opening authorization.</text>
<rect class="box owned" x="50" y="155" width="260" height="190" rx="10"/><text x="72" y="190" class="label">B08 seam</text><text x="72" y="218" class="small">x=2047..2049</text><text x="72" y="246" class="small">36 cells; 33 air + 3 floors</text><text x="72" y="274" class="small">default-deny approach</text>
<rect class="box hold" x="355" y="155" width="250" height="190" rx="10"/><text x="377" y="190" class="label">B09 isolation cap</text><text x="377" y="218" class="small">x=2050, y=129..132, z=-749..-747</text><text x="377" y="246" class="small">12 polished diorite cells</text><rect x="442" y="265" width="75" height="42" fill="#e5a545" stroke="#fff"/><text x="383" y="330" class="tiny">C01 study: (2050,130..131,-748), 2 cells</text>
<rect class="box gate" x="650" y="155" width="245" height="190" rx="10"/><text x="672" y="190" class="label">B09 lower interior</text><text x="672" y="218" class="small">only 6×2×1 clear void</text><text x="672" y="246" class="small">not platform + normal walk</text><text x="672" y="274" class="small">C02/C03 geometry-only studies</text><text x="672" y="302" class="small">accepted rescue discharge: 0 / 2</text>
<rect class="box hold" x="940" y="155" width="215" height="190" rx="10"/><text x="962" y="190" class="label">R12R / B03 side</text><text x="962" y="218" class="small">authenticated cart in halo</text><text x="962" y="246" class="small">19 protected rail/control cells</text><text x="962" y="274" class="small">B03: no external receiver</text><text x="962" y="302" class="small">0..187 remains closed</text>${svgFoot(500)}`;
const gateMap = `${svgHead('MP04 connector all-or-nothing gate map', 1200, 650)}
<text x="35" y="72" class="small">Every gate must pass under one MP05-owned package. Any failed gate means zero physical operations.</text>
${[
  ['1', 'B07 through endpoint', 'Fluid / gravity / landing / exterior receiver', '#6c2630'],
  ['2', 'B07→B08 corridor', 'Exact bounds, ownership, terrain and failure state', '#6c2630'],
  ['3', 'B08→B09 transfer', 'IF-B08-B09-PORTAL, source/post/inverse, closed failure', '#76551d'],
  ['4', 'B09 receiver + rescue', 'Platform / barrier / normal walk / 6×6 service / 2 exits', '#76551d'],
  ['5', 'B03 endpoint', 'Protected route, access class, controls and egress contract', '#6c2630'],
  ['6', 'Guarded release kernel', 'Fresh source, inverse, clearance, strict preflight, post/rollback QA', '#173f5f'],
].map(([n, label, detail, fill], i) => { const y = 110 + i * 78; return `<circle cx="72" cy="${y}" r="25" fill="${fill}" stroke="#e7eef6" stroke-width="2"/><text x="66" y="${y + 6}" class="label">${n}</text><rect class="box" x="120" y="${y - 33}" width="1010" height="62" rx="8" fill="${fill}"/><text x="145" y="${y - 4}" class="label">${label}</text><text x="510" y="${y - 4}" class="small">${detail}</text><text x="145" y="${y + 19}" class="tiny">Current: HOLD / absent — no local subpackage is functional or independently reversible</text>`; }).join('\n')}${svgFoot(650)}`;
write('mp04-integrated-connector-plan.svg', planMap);
write('mp04-b08-b09-b03-interface-map.svg', interfaceMap);
write('mp04-all-or-nothing-gate-map.svg', gateMap);
write('MP04-INTEGRATED-SETOUT-02.md', `# MP04 integrated connector setout 02\n\n**Status:** \`DEFAULT_DENY__NO_SAFE_EXACT_INTEGRATED_OPERATION_CANDIDATE\`  \n**Bound source:** \`${source}\` (region SHA-256 \`${sourceHash}\`)\n\nThis is a read-only reconciliation. It created no capture, RCON request, build operation, or world mutation.\n\n## Decision\n\nThe current source is a single complete MP06 post-state across B07, B08, B09, and B03. That resolves the obsolete coverage objection, but it does **not** yield a safe physical candidate. MP04 has zero current-world cells; every possible endpoint and corridor is owned by MP05. The necessary work is one coupled functional system, not a collection of independently reversible patches.\n\n## Maps\n\n- [Plan / ownership map (SVG)](mp04-integrated-connector-plan.svg) · [PNG inspection copy](mp04-integrated-connector-plan.png)\n- [B08–B09–B03 interface map (SVG)](mp04-b08-b09-b03-interface-map.svg) · [PNG inspection copy](mp04-b08-b09-b03-interface-map.png)\n- [All-or-nothing gate map (SVG)](mp04-all-or-nothing-gate-map.svg) · [PNG inspection copy](mp04-all-or-nothing-gate-map.png)\n\n## Exact current setout\n\n| Leg | Current, source-bound fact | Release result |\n| --- | --- | --- |\n| B07 endpoint | Five construction fluid cells, 89 interaction fluid/waterlogged cells, 90 gravity cells, and 11 unsupported chains; doorless headhouse with no classified exterior receiver. | Not a functional through endpoint. |\n| B07→B08 | The named anchors are ${distance.toFixed(2)} plan blocks apart; no bounded, owned corridor exists. | No corridor operation. |\n| B08→B09 | The exact two-cell door study is \`(2050,130..131,-748)\`, both presently polished diorite. It has no directional ownership or forward/inverse/failure-state contract. | Keep the cap closed. |\n| B09 receiver/rescue | The 6×6 receiver and 6×6 service studies are geometry only. The lower void is only 6×2×1, accepted rescue discharge is 0/2, and the R12R cart is protected. | No transfer, platform, passenger, or rescue use. |\n| B03 receiver | Only B03 indices 188–800 are bounded internal circulation; indices 0–187 remain closed behind 63 obstructions and 14 unsupported floor-air cells. | No external receiver. |\n\n## Required successor\n\nAn **MP05-owned** integrated B07/B08/B09/B03 package must accept each of the six gates in the companion map, then immediately bind a fresh complete source and run the full guarded release kernel. MP04’s next role is limited to accepting the resulting normalized relationship; it cannot issue a current-world operation.\n\nMachine report: [mp04-integrated-setout.json](mp04-integrated-setout.json).\n`);
console.log(JSON.stringify({ status: report.status, outDir: rel(outDir), manifestIdentity, operationCount: 0, safeIndependentCandidate: false }, null, 2));
