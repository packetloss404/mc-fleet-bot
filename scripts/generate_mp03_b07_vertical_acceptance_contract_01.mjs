#!/usr/bin/env node
/**
 * MP03 / B07 vertical containment, gravity, and egress acceptance contract.
 *
 * Read-only and deliberately non-authorizing.  It directly re-surveys the
 * narrow facts that make B07 one coupled release, binds them to a complete
 * immutable Anvil capture, and emits an acceptance template.  It never emits
 * operations or provides build authority.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP03 B07 vertical acceptance contract rejected: ${message}`);
};
const point = (x, y, z) => ({ x, y, z });
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(state.split('[', 1)[0]);
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0])
  || state.includes('waterlogged=true');
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const SNAPSHOT = option('--snapshot', 'data/worldsnap-sys03-high16-descending-post-20260826T153100Z');
const OUT_DIR = option('--out-dir', 'data/world-review/mp03-b07-vertical-acceptance-contract-01-sys03-post-20260826T153100Z');
const AUTH_TEMPLATE = option('--authority-template', 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/B07-AUTH-03-exact-owner-counterpart-contract-template.json');
const CONTAINMENT = option('--containment', 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/containment/containment-contract-findings.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());

const snapshotRoot = abs(SNAPSHOT);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'source lacks the complete-save capture manifest');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source capture is not immutable');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130,
  `expected 130 complete-save members, got ${capture.requiredMembers?.length ?? 'none'}`);
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member is absent: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}

const authBytes = fs.readFileSync(abs(AUTH_TEMPLATE));
const authority = JSON.parse(authBytes);
const containmentBytes = fs.readFileSync(abs(CONTAINMENT));
const containment = JSON.parse(containmentBytes);
fail(authority.status === 'TEMPLATE_ONLY_NOT_ACCEPTED_NOT_AN_EXECUTION_AUTHORIZATION', 'authority template is unexpectedly accepted');
fail(authority.exactDomain?.candidateId === 'B07-C-WEST-2', 'wrong B07 candidate');
fail(authority.exactDomain?.construction?.cellCount === 8134 && authority.exactDomain?.interaction?.cellCount === 13608,
  'canonical B07 domains drifted');
fail(authority.exactDomain?.sixDirectionalBoundarySeams?.length === 6, 'six exact B07 seams are required');
fail(containment.gravityMigration?.exposureEnvelope?.cells?.cellCount === 308,
  'expected the 308-cell gravity exposure envelope');
fail(containment.gravityMigration?.unsupportedGravityCount === 11, 'expected 11 unsupported gravity exposures');
fail(containment.fluidTopology?.components?.[0]?.touchesDiagnosticBoundary === true,
  'fluid topology unexpectedly became finite');

const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const at = async ({ x, y, z }) => stateToCommandString(await reader.blockState(x, y, z));
const records = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: await at(cell) })));

const lobbyFloor = [];
for (let x = 2103; x <= 2111; x += 1) for (let z = -431; z <= -425; z += 1) {
  const floor = point(x, -59, z);
  const [feet, head] = await records([point(x, -58, z), point(x, -57, z)]);
  lobbyFloor.push({ floor, feet: feet.state, head: head.state, twoBlockClear: isAir(feet.state) && isAir(head.state) });
}
const lobbyFailures = lobbyFloor.filter(({ twoBlockClear }) => !twoBlockClear);
const wetBand = [];
for (let x = 2094; x <= 2114; x += 1) for (let y = 5; y <= 17; y += 1) for (let z = -438; z <= -388; z += 1) {
  const cell = point(x, y, z); const state = await at(cell);
  if (isFluid(state)) wetBand.push({ cell, state });
}
const gravityCells = [27, 28, 29, 30].map((y) => point(2104, y, -396));
const gravity = await Promise.all(gravityCells.map(async (cell) => ({ cell, state: await at(cell), below: await at(point(cell.x, cell.y - 1, cell.z)) })));
const r09jCap = await records([point(2105, 30, -397), point(2105, 31, -397)]);
const headhouseCap = [];
for (let x = 2105; x <= 2111; x += 1) for (let z = -401; z <= -395; z += 1) {
  const cell = point(x, 72, z); headhouseCap.push({ cell, state: await at(cell) });
}
const capCensus = Object.fromEntries([...headhouseCap.reduce((result, { state }) => {
  result.set(state, (result.get(state) ?? 0) + 1); return result;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
fail(lobbyFloor.length === 63 && lobbyFailures.length === 29, `expected 63 lobby stations / 29 failures, got ${lobbyFloor.length}/${lobbyFailures.length}`);
fail(wetBand.length === 1034, `expected 1,034 retained-fluid cells, got ${wetBand.length}`);
fail(gravity.every(({ state }) => state === 'minecraft:gravel') && gravity[0].below === 'minecraft:air'
  && gravity.slice(1).every(({ below }) => below === 'minecraft:gravel'), 'central unsupported gravel chain drifted');
fail(r09jCap.every(({ state }) => state === 'minecraft:polished_diorite'), 'R09J two-cell cap drifted');
fail(headhouseCap.length === 49 && capCensus['minecraft:polished_diorite'] === 44
  && capCensus['minecraft:air'] === 4 && capCensus['minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'] === 1,
`R07J headhouse cap/seam drifted: ${JSON.stringify(capCensus)}`);

const describe = (cells) => ({ cellCount: cells.length, coordinateSetSha256: hashCells(cells) });
const contractWithoutHash = {
  schemaVersion: 1,
  id: 'MP03-B07-VERTICAL-CONTAINMENT-GRAVITY-EGRESS-ACCEPTANCE-01',
  generatedAtUtc: GENERATED_AT,
  status: 'HOLD_TEMPLATE_NOT_ACCEPTED_B07_VERTICAL_CONTAINMENT_GRAVITY_EGRESS',
  mode: 'READ_ONLY_SOURCE_BOUND_NONAUTHORIZING',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false,
    forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false,
  },
  source: {
    snapshot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: sha256(captureBytes), immutableCopy: true, requiredMemberCount: 130,
    authorityTemplate: { path: rel(AUTH_TEMPLATE), sha256: sha256(authBytes) },
    containmentSurvey: { path: rel(CONTAINMENT), sha256: sha256(containmentBytes) },
  },
  observedFacts: {
    candidate: { id: authority.exactDomain.candidateId, construction: authority.exactDomain.construction, interaction: authority.exactDomain.interaction },
    lowerLobby: {
      floorBounds: { minX: 2103, maxX: 2111, y: -59, minZ: -431, maxZ: -425 },
      stationCount: 63, twoBlockClearCount: 34, twoBlockHeadroomFailureCount: 29,
      failureCoordinates: describe(lobbyFailures.map(({ floor }) => floor)),
      disposition: 'No lower-lobby cell is accepted as a route station until a later exact route target proves solid footing plus two clear air cells.',
    },
    retainedFluidBarrier: {
      bounds: { minX: 2094, maxX: 2114, minY: 5, maxY: 17, minZ: -438, maxZ: -388 },
      cells: { ...describe(wetBand.map(({ cell }) => cell)), stateSha256: sha256(`${wetBand.map(({ cell, state }) => `${cellKey(cell)}=${state}`).sort().join('\n')}\n`) },
      sourceTopology: { diagnosticComponentCells: 4766, touchesDiagnosticBoundary: true, disposition: 'NOT_A_FINITE_RECEIVER' },
    },
    gravity: {
      centralUnsupportedChain: gravity,
      fallChannel: { min: point(2104, 17, -396), max: point(2104, 26, -396), cells: 10, terminal: { cell: point(2104, 16, -396), state: 'minecraft:water[level=0]' } },
      broaderExposure: containment.gravityMigration.exposureEnvelope,
      unsupportedExposureCount: containment.gravityMigration.unsupportedGravityCount,
    },
    retainedCaps: {
      r09jTwoCellGravityIsolationCap: { cells: r09jCap, requiredSourceState: 'minecraft:polished_diorite' },
      r07jDoorlessHeadhouseCap: { cells: describe(headhouseCap.map(({ cell }) => cell)), sourceCensus: capCensus, failureStateUntilAccepted: 'KEEP_49_CAP_CELLS_SOLID_AND_HEADHOUSE_DOORLESS' },
    },
  },
  ownershipAndReceiverAcceptance: {
    status: 'UNASSIGNED_ALL_NAMED_ACCEPTANCES_REQUIRED',
    exactSeams: authority.exactDomain.sixDirectionalBoundarySeams,
    requiredRoles: [
      { role: 'B07_PRIMARY_CONSTRUCTION_OWNER', scope: 'every changed construction and interaction cell plus all 6 exact seams' },
      { role: 'D05_HYDROLOGY_CONTAINMENT_OWNER', scope: 'each contacted component, liner/treatment, receiver, freeboard, overflow and failure terminal' },
      { role: 'R09J_PROTECTED_CAP_OWNER', scope: 'the two cap cells and every cap/vertical-isolation influence cell' },
      { role: 'R07J_SURFACE_RECEIVER_OWNER', scope: 'one exact outward face, exterior landing/descent, access boundary and closed/failure state' },
      { role: 'LOWER_LOBBY_RECEIVER_OWNER', scope: 'one exact lower aperture, route endpoint and recovery/return path' },
      { role: 'MP03_FUNCTIONAL_PROGRAMME_OWNER', scope: 'accepts service use only after the complete route and egress closeout; does not own construction by implication' },
    ],
    receiverRule: 'A spatially adjacent block, headhouse shell, diagnostic boundary, or MP03 programme label is never a receiver or owner. Every directed terminal must have one named accepting owner.',
  },
  acceptanceRequirements: {
    containment: [
      'Bind every changed fluid/waterlogged cell to an exact source-to-future state set; diagnostic-boundary contact is insufficient.',
      'Name the component owner and receiver owner; bind capacity/freeboard, collection direction, overflow/failure terminal, retained dry liner, and exact inverse.',
      'Preserve the 1,034-cell barrier unless an accepted integrated operation replaces the affected states under the same transaction.',
    ],
    gravityAndRollback: [
      'Inventory every changed gravity cell, its air/fall chain, terminal and influence halo; the 308-cell exposure envelope is a risk census, not a target set.',
      'For the central chain (2104,27..30,-396), bind permanent post-state support/replacement and an ordered rollback that never recreates falling gravel above air/water.',
      'Temporary supports, gravity-only phases, and source rollback that relies on a falling update are prohibited.',
      'Retain both R09J cap cells as polished diorite unless the named cap owner accepts an exact reciprocal replacement and rollback state.',
    ],
    egressAndEndpoint: [
      'Name both the lower-lobby receiver and one exterior receiver; bind exact apertures, approach/return geometry, access class, closed/failure state, lighting, power/smoke/drainage interfaces, and independent-egress behavior.',
      'Every eventual normal-walk station must prove solid nonhazardous footing and two clear air cells; the 29 current lobby failures are neither accepted route stations nor implied removal targets.',
      'The R07J 49-cell cap remains solid and the headhouse remains doorless until the surface receiver owner signs the exact face/landing/return/failure contract.',
    ],
    releaseKernel: [
      'All role owners sign the exact six boundary seams and directed receiver terminals against this contract identity.',
      'Only one later compiler may emit the integrated containment + gravity + liner + route + endpoints forward/rollback package from a fresh complete immutable source.',
      'That later package must pass the scoped hard-safety kernel: canonical states, exact inverse, protected/block-entity exclusion or reviewed migration, fresh live-entity clearance, strict parser/source/projected/post rollback preflights, journaled execution, fresh post capture, and bidirectional normal-walk/egress closeout.',
    ],
  },
  rejectedFragments: [
    'fluid-only lining or displacement', 'receiver-only construction', 'temporary or gravity-only support',
    'R09J cap or R07J headhouse opening alone', 'lower-lobby headroom/wayfinding alone', 'surface door/landing without an accepted exterior receiver',
  ],
  acceptanceTemplate: {
    id: 'MP03-B07-VERTICAL-CONTAINMENT-GRAVITY-EGRESS-ACCEPTANCE-SIGNATURE-01',
    contractIdentitySha256: 'COPY_FROM_GENERATED_CONTRACT',
    source: { captureManifestSha256: sha256(captureBytes), authorityTemplateSha256: sha256(authBytes), containmentSurveySha256: sha256(containmentBytes) },
    namedOwners: {
      b07PrimaryConstructionOwner: 'ASSIGN_NAMED_OWNER', hydrologyContainmentOwner: 'ASSIGN_NAMED_OWNER',
      r09jProtectedCapOwner: 'ASSIGN_NAMED_OWNER', r07jSurfaceReceiverOwner: 'ASSIGN_NAMED_OWNER',
      lowerLobbyReceiverOwner: 'ASSIGN_NAMED_OWNER', mp03ProgrammeOwner: 'ASSIGN_NAMED_OWNER',
    },
    acceptedSeams: authority.exactDomain.sixDirectionalBoundarySeams.map(({ direction, transitionCount, pairSha256 }) => ({ direction, transitionCount, pairSha256, acceptingCounterpartOwner: 'ASSIGN_NAMED_OWNER' })),
    directedTerminals: {
      fluidReceiver: 'ASSIGN_EXACT_COMPONENT_AND_TERMINAL_REFERENCE', overflowFailure: 'ASSIGN_EXACT_SEALED_TERMINAL_REFERENCE',
      lowerLobbyReceiver: 'ASSIGN_EXACT_APERTURE_AND_RETURN_REFERENCE', exteriorReceiver: 'ASSIGN_EXACT_FACE_LANDING_RETURN_AND_FAILURE_REFERENCE',
    },
    requiredEvidence: {
      fluidStateAndCapacityManifest: 'ASSIGN_HASH_BOUND_SOURCE_FUTURE_AND_INVERSE_MANIFEST',
      gravityPermanentStateAndOrderedRollbackManifest: 'ASSIGN_HASH_BOUND_GRAVITY_AND_FALL_CHAIN_MANIFEST',
      normalWalkAndIndependentEgressContract: 'ASSIGN_HASH_BOUND_ROUTE_ENDPOINT_AND_RETURN_MANIFEST',
    },
  },
  nonClaims: [
    'No owner, receiver, route, egress path, cap change, operation, release manifest, or physical build is accepted or authorized.',
    'The 63-station lobby census does not establish a usable route; 29 stations fail two-block clearance.',
    'The 1,034-cell fluid census and 308-cell gravity exposure census do not define any mutation set.',
    'This source capture must be replaced by a fresh immediately-pre-execution complete immutable source before any later release.',
  ],
};
const contract = { ...contractWithoutHash, contractIdentitySha256: sha256(`${JSON.stringify(contractWithoutHash, null, 2)}\n`) };

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="640" viewBox="0 0 1120 640" role="img" aria-labelledby="title desc">
<title id="title">MP03 B07 vertical containment gravity egress acceptance map</title>
<desc id="desc">A source-bound vertical map showing the lower lobby headroom hold, retained wet barrier, unsupported gravel chain, protected R09J cap, and retained R07J doorless headhouse cap. Each is held until one integrated acceptance contract is complete.</desc>
<rect width="1120" height="640" fill="#08131f"/>
<text x="38" y="42" fill="#f2f7fb" font-family="system-ui" font-size="23" font-weight="700">MP03 / B07 vertical acceptance map — HOLD / non-authorizing</text>
<text x="38" y="66" fill="#adbed0" font-family="system-ui" font-size="13">complete immutable source ${esc(contract.source.captureManifestSha256.slice(0, 16))}… · B07-C-WEST-2 · no operations emitted</text>
<line x1="396" y1="100" x2="396" y2="560" stroke="#8aa0b6" stroke-width="8" stroke-linecap="round"/>
<rect x="292" y="108" width="208" height="74" rx="10" fill="#5b1823" stroke="#ff7b8d" stroke-width="2"/>
<text x="312" y="137" fill="#ffd4db" font-family="system-ui" font-size="16" font-weight="700">R07J retained 49-cell cap</text>
<text x="312" y="159" fill="#ffc1cb" font-family="system-ui" font-size="12">doorless until exact exterior receiver</text>
<rect x="292" y="204" width="208" height="52" rx="10" fill="#5b1823" stroke="#ff7b8d" stroke-width="2"/>
<text x="312" y="234" fill="#ffd4db" font-family="system-ui" font-size="15" font-weight="700">R09J 2-cell isolation cap</text>
<rect x="292" y="284" width="208" height="82" rx="10" fill="#764b08" stroke="#f6bd47" stroke-width="2"/>
<text x="312" y="313" fill="#ffe7ad" font-family="system-ui" font-size="15" font-weight="700">unsupported gravel y27..30</text>
<text x="312" y="336" fill="#ffe7ad" font-family="system-ui" font-size="12">fall channel y17..26 → water y16</text>
<rect x="292" y="390" width="208" height="82" rx="10" fill="#0d4569" stroke="#5ec8f6" stroke-width="2"/>
<text x="312" y="419" fill="#c6efff" font-family="system-ui" font-size="15" font-weight="700">retained wet barrier</text>
<text x="312" y="442" fill="#c6efff" font-family="system-ui" font-size="12">1,034 cells · topology not finite</text>
<rect x="292" y="498" width="208" height="74" rx="10" fill="#67242d" stroke="#ff8a9a" stroke-width="2"/>
<text x="312" y="527" fill="#ffe0e4" font-family="system-ui" font-size="15" font-weight="700">lower lobby: 63 stations</text>
<text x="312" y="549" fill="#ffe0e4" font-family="system-ui" font-size="12">29 fail two-block clearance</text>
<path d="M520 145 H678" stroke="#ff8191" stroke-width="3" marker-end="url(#a)"/><text x="692" y="150" fill="#ffd2d9" font-family="system-ui" font-size="14">surface receiver owner + face/landing/return</text>
<path d="M520 230 H678" stroke="#ff8191" stroke-width="3" marker-end="url(#a)"/><text x="692" y="235" fill="#ffd2d9" font-family="system-ui" font-size="14">protected-cap owner + reciprocal state/inverse</text>
<path d="M520 325 H678" stroke="#f6bd47" stroke-width="3" marker-end="url(#a)"/><text x="692" y="320" fill="#ffe2a0" font-family="system-ui" font-size="14">permanent gravity state + ordered rollback</text>
<text x="692" y="341" fill="#cbd8e4" font-family="system-ui" font-size="12">308-cell exposure is risk evidence, not a target set</text>
<path d="M520 430 H678" stroke="#5ec8f6" stroke-width="3" marker-end="url(#a)"/><text x="692" y="425" fill="#c6efff" font-family="system-ui" font-size="14">hydrology owner + finite receiver/freeboard/overflow</text>
<text x="692" y="446" fill="#cbd8e4" font-family="system-ui" font-size="12">all changed wet states + inverse in the same transaction</text>
<path d="M520 535 H678" stroke="#ff8a9a" stroke-width="3" marker-end="url(#a)"/><text x="692" y="530" fill="#ffe0e4" font-family="system-ui" font-size="14">lower receiver owner + normal-walk return/egress</text>
<text x="692" y="551" fill="#cbd8e4" font-family="system-ui" font-size="12">route stations require solid footing + two air blocks</text>
<rect x="38" y="588" width="1044" height="30" rx="6" fill="#172b3f"/>
<text x="52" y="608" fill="#e1ebf4" font-family="system-ui" font-size="13">Release gate: six exact B07 seam counterparts + all named owners + finite containment + permanent gravity inverse + lower/exterior endpoints → one fresh guarded integrated release.</text>
<defs><marker id="a" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M0,0 L9,3.5 L0,7 z" fill="#d9e4ee"/></marker></defs>
</svg>\n`;
const markdown = `# MP03 / B07 vertical containment, gravity, and egress acceptance contract

**Status:** \`${contract.status}\`  
**Authority:** \`mutationAuthority: false\` — this is a source-bound acceptance template, not a construction package.

![Vertical acceptance map](mp03-b07-vertical-acceptance-map.svg)

The current complete Anvil capture proves one coupled system: **63** lower-lobby floor stations with **29** two-block-clearance failures; a retained **1,034-cell** wet barrier whose contacted component is not finite; an unsupported gravel chain at **(2104,27..30,-396)** above an air channel to water; and protected R09J/R07J caps. None is an independent physical phase.

## Required signatures and exact evidence

1. One B07 construction owner and named counterparts for all six hash-bound seams; a D05 hydrology owner, R09J cap owner, R07J surface receiver owner, lower-lobby receiver owner, and MP03 programme owner.
2. A finite, directed fluid treatment/receiver/freeboard/overflow/failure graph with exact source-to-future and inverse states for every changed wet or waterlogged cell.
3. A permanent gravity state and ordered inverse covering every changed gravity/fall-chain cell. It must never recreate gravel falling through air toward water. Temporary support is invalid.
4. Exact lower and exterior receiver apertures, route/return geometry, controlled access/failure state, and independent-egress behavior. Every eventual walk station needs solid nonhazardous footing and two clear air cells.
5. A single fresh-source integrated compiler and complete guarded-release kernel. The R09J cap and R07J doorless cap remain closed until their reciprocal acceptance is present.

## Explicit non-claims

No owner, receiver, egress route, cap change, operation, release manifest, or physical build is accepted. The **29** lower-lobby failures are not implied removal targets; the **1,034** wet cells and **308** gravity-exposure cells are not mutation lists.

Source capture: \`${contract.source.snapshot}\`  
Contract identity: \`${contract.contractIdentitySha256}\`
`;

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(path.join(abs(OUT_DIR), 'mp03-b07-vertical-acceptance-contract.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT_DIR), 'MP03-B07-VERTICAL-ACCEPTANCE-CONTRACT.md'), markdown);
fs.writeFileSync(path.join(abs(OUT_DIR), 'mp03-b07-vertical-acceptance-map.svg'), svg);
process.stdout.write(`wrote ${rel(OUT_DIR)}\n`);
