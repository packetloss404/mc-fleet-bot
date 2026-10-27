#!/usr/bin/env node
/**
 * Read-only MP09 Long Water acceptance contract.
 *
 * This deliberately records the exact conditions that prevent a detached
 * paving, liner, or landing release. It validates every member declared by
 * the immutable capture before it writes a source-bound, default-deny
 * acceptance packet. It never emits operations or contacts the live world.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = option('--snapshot', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z');
const microPath = option('--micro', 'data/world-review/mp09-ravensgate-current-micro-scope-03-mp06-post-20260826T143902Z.json');
const basinPath = option('--basin', 'data/world-review/mp09-long-water-closed-basin-survey-02-mp06-post-20260826T143902Z/long-water-closed-basin-survey.json');
const dryPath = option('--dry', 'data/world-review/mp09-dry-public-component-screen-02-mp06-post-20260826T143902Z/dry-public-component-screen.json');
const outDir = option('--out-dir', 'data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z');
const generatedAtUtc = option('--generated-at', '2026-08-26T17:40:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (filename) => fs.readFileSync(abs(filename));
const readJson = (filename) => JSON.parse(read(filename));
const fail = (message) => { throw new Error(`MP09 Long Water acceptance contract rejected: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };
const write = (filename, data) => {
  fs.mkdirSync(path.dirname(abs(filename)), { recursive: true });
  fs.writeFileSync(abs(filename), `${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`);
};

const capturePath = path.join(snapshot, 'combined-zones-complete-save-capture.json');
const capture = readJson(capturePath);
const validateCapture = () => {
  const members = capture.requiredMembers;
  assert(capture.immutableCopy === true, 'capture is not immutable');
  assert(Array.isArray(members) && members.length === 130, `expected 130 capture members, found ${members?.length ?? 'none'}`);
  for (const member of members) {
    const filename = abs(path.join(snapshot, member.path));
    assert(fs.existsSync(filename), `capture member missing: ${member.path}`);
    const bytes = fs.readFileSync(filename);
    assert(bytes.length === member.bytes, `capture member length drift: ${member.path}`);
    assert(sha256(bytes) === member.sha256, `capture member hash drift: ${member.path}`);
  }
};

validateCapture();
const micro = readJson(microPath);
const basin = readJson(basinPath);
const dry = readJson(dryPath);
const sameSnapshot = (source, name) => assert(source?.snapshot === snapshot, `${name} does not bind ${snapshot}`);
sameSnapshot(micro.source, 'micro screen');
sameSnapshot(basin.source, 'basin survey');
sameSnapshot(dry.source, 'dry-component screen');

assert(micro.status === 'NO_DRY_OWNED_ROUTE_OR_SUPPORT_MICRO_SCOPE_ON_CURRENT_RAVENSGATE_EVIDENCE', 'micro screen status drift');
assert(micro.longWaterScreen.routeDeck.cellCount === 196, 'reviewed deck is not 196 cells');
assert(micro.longWaterScreen.routeDeck.coordinateSetSha256 === '268a5112eb3fcc37f0a18819141351a4c472abf679e73a03f56c268be4cffed2', 'reviewed deck coordinates drift');
assert(micro.longWaterScreen.exactHeadroomFailures.cellCount === 21, 'headroom failures are not 21');
assert(micro.longWaterScreen.exactHeadroomFailures.coordinateSetSha256 === 'c85d2d8d93b1bf58745f149420bc0e7c930a1131ffd5947b32365b6d306fc575', 'headroom coordinates drift');
assert(micro.longWaterScreen.waterTableLiner.exactSourceWaterCells === 186, 'source-water displacement is not 186 cells');
assert(micro.longWaterScreen.waterTableLiner.coordinateSetSha256 === '191b76b40654dd1246bddbf57d931923d480459bc217d0f1c0e993ed4233c259', 'source-water coordinates drift');
assert(micro.longWaterScreen.interactionHaloFluid.cellCount === 593, 'fluid halo is not 593 cells');
assert(micro.ownershipAndHydrology.matchingLongWaterInterfaceContracts.length === 0, 'unexpected Long Water owner/interface exists');
assert(basin.decision.result === 'NO_CLOSED_BASIN_OR_ACCESS_PACKAGE_CAN_BE_STATED', 'basin survey no longer blocks release');
assert(basin.hydrology.componentCellCountWithinSurveyEnvelope === 1469, 'fluid component is not 1,469 cells');
assert(basin.hydrology.componentCoordinateSetSha256 === '378c1c1617f22c82bc25d67c6c061bba5785f8c47af4565d94b19043fc0b5b49', 'fluid component coordinates drift');
assert(basin.hydrology.closedBasinProven === false, 'basin unexpectedly marked closed');
assert(JSON.stringify(basin.hydrology.boundaryFaces) === JSON.stringify(['maxY', 'minY']), 'fluid boundary faces drift');
assert(dry.decision.exactTargetCells.length === 0 && dry.decision.forwardOperationCount === 0, 'dry screen unexpectedly authorizes targets');

const inputHashes = Object.fromEntries([capturePath, microPath, basinPath, dryPath,
  'data/world-review/ravensgate-ownership-contract-20260825/ravensgate-ownership-contract.json',
].map((filename) => [rel(filename), sha256(read(filename))]));
const contract = {
  schemaVersion: 1,
  id: 'MP09-LONG-WATER-HYDROLOGY-OWNERSHIP-GRADE-ACCEPTANCE-CONTRACT-01',
  generatedAtUtc,
  status: 'PROPOSED_SOURCE_BOUND_DEFAULT_DENY_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY',
  mutationAuthority: false,
  source: {
    snapshot: rel(snapshot),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    immutableCopy: true,
    verifiedRequiredMembers: 130,
    inputSha256: inputHashes,
  },
  currentCondition: {
    reviewedTwoWideDeck: {
      cells: 196,
      coordinateSetSha256: micro.longWaterScreen.routeDeck.coordinateSetSha256,
      bounds: { minX: -87, maxX: -86, minY: 67, maxY: 69, minZ: -552, maxZ: -455 },
    },
    blockedHeadroom: {
      cells: 21,
      coordinateSetSha256: micro.longWaterScreen.exactHeadroomFailures.coordinateSetSha256,
      northTieIn: [{ x: -87, y: 67, z: -455 }, { x: -86, y: 67, z: -455 }],
    },
    waterDisplacementSeed: {
      cells: 186,
      coordinateSetSha256: micro.longWaterScreen.waterTableLiner.coordinateSetSha256,
      bounds: { minX: -87, maxX: -86, minY: 66, maxY: 66, minZ: -550, maxZ: -458 },
    },
    fluidInteraction: {
      haloFluidCells: 593,
      affectedComponentCellsWithinSurveyEnvelope: 1469,
      coordinateSetSha256: basin.hydrology.componentCoordinateSetSha256,
      surveyBounds: basin.hydrology.surveyBounds,
      boundaryFaces: basin.hydrology.boundaryFaces,
      closedBasinProven: false,
    },
    gradeAndLanding: {
      northApproach: { x: -87, y: 68, z: -454 },
      tempiettoEntrance: { x: -85, y: 69, z: -552 },
      currentDecision: 'NO_SUPPORTED_TWO_WIDE_NORTH_TIE_IN_OR_TEMPIETTO_LANDING_ACCEPTED',
    },
  },
  unassignedAcceptanceInterfaces: [
    { id: 'LW-HYDRO-01', role: 'full six-neighbour containment perimeter and each top/base/side outlet', currentKnownSeedCells: 1469 },
    { id: 'LW-DISPLACEMENT-01', role: 'all 186 exact source-water displacement cells and their retained-water recovery state', currentKnownSeedCells: 186 },
    { id: 'LW-HALO-01', role: 'all 593 immediate fluid-halo interactions plus every discovered continuation', currentKnownSeedCells: 593 },
    { id: 'LW-NORTH-GRADE-01', role: 'two-wide north tie-in, 21 headroom defects, and supported bridge/grade geometry', currentKnownSeedCells: 21 },
    { id: 'LW-TEMPIETTO-LANDING-01', role: 'two-wide landing and entrance-side transition at (-85,69,-552)', currentKnownSeedCells: 0 },
  ],
  acceptanceRequirements: [
    'Assign exactly one owner to every containment, flow-control, retained-water, deck, bridge, grade, and landing cell; include all interface-halo neighbours and protected exclusions.',
    'Extend the fluid census until every six-neighbour component exit is classified; prove a closed basin or explicitly accepted controlled outlets/overflows before any one of the 186 water states changes.',
    'Freeze complete before/after states and an exact inverse. Forward order must be containment/drainage, then water displacement, then bridge/deck/landing; rollback reverses that hydraulic dependency.',
    'Prove a supported two-wide, two-headroom normal-walk path from the north approach through a designed one-step-or-less grade and landing to the Tempietto entrance in both directions.',
    'Take a fresh complete snapshot, live-entity clearance, strict parser/source preflight, journaled guarded execution, post snapshot, rollback preflight, and independent hydrology/route QA before mutation.',
  ],
  prohibitedUntilAccepted: [
    'deck-only paving or headroom carving',
    '186-cell liner or water-table replacement alone',
    'Tempietto landing alone',
    'lighting or paving unprogrammed dry ground',
    'ownership inference from the broad Ravensgate or Town Expansion envelope',
  ],
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    releaseEligible: false,
    result: 'NO_PHYSICAL_PACKAGE_EMITTED',
    reasonCodes: ['21_HEADROOM_FAILURES', '186_SOURCE_WATER_DISPLACEMENTS', '593_HALO_FLUIDS', '1469_COMPONENT_OPEN_AT_MINY_MAXY', 'ZERO_ASSIGNED_LONG_WATER_INTERFACES', 'NO_ACCEPTED_NORTH_GRADE_OR_TEMPIETTO_LANDING'],
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
};
contract.identitySha256 = sha256(JSON.stringify(contract));

const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720"><style>text{font-family:Arial,sans-serif;fill:#e2e8f0}.t{font-size:24px;font-weight:bold}.h{font-size:16px;font-weight:bold}.s{font-size:13px}.g{stroke:#334155;stroke-width:1}</style><rect width="1080" height="720" fill="#0b1220"/><text x="50" y="38" class="t">MP09 Long Water — default-deny acceptance map</text><rect x="70" y="78" width="700" height="525" fill="#172554" stroke="#94a3b8" stroke-width="2"/><text x="80" y="100" class="s">Frozen Ravensgate screen: x −148..−64 / z −562..−420</text><g class="g">${[150,250,350,450,550,650,750].map((x)=>`<line x1="${x}" y1="78" x2="${x}" y2="603"/>`).join('')}${[150,250,350,450,550].map((y)=>`<line x1="70" y1="${y}" x2="770" y2="${y}"/>`).join('')}</g><rect x="555" y="113" width="105" height="60" fill="#475569" stroke="#e2e8f0"/><text x="563" y="147" class="s">Tempietto</text><rect x="598" y="173" width="18" height="355" fill="#0369a1" stroke="#67e8f9"/><text x="626" y="360" class="s">186 source-water</text><text x="626" y="378" class="s">displacements</text><rect x="574" y="173" width="66" height="355" fill="rgba(14,116,144,.20)" stroke="#38bdf8" stroke-dasharray="5 4"/><text x="100" y="202" class="s">1,469-cell affected component reaches</text><text x="100" y="220" class="s">both y64/y70 survey boundaries</text><rect x="598" y="528" width="18" height="34" fill="#991b1b" stroke="#fca5a5"/><text x="626" y="546" class="s">21 blocked headroom cells / north tie-in</text><path d="M607 562 L607 590" stroke="#fbbf24" stroke-width="6" stroke-dasharray="6 5"/><text x="626" y="592" class="s">future owned grade required → entrance (−85,69,−552)</text><rect x="810" y="90" width="230" height="470" rx="8" fill="#111827" stroke="#64748b"/><text x="830" y="122" class="h">Five unassigned interfaces</text>${['LW-HYDRO-01 — basin/overflow','LW-DISPLACEMENT-01 — 186 cells','LW-HALO-01 — 593 fluids','LW-NORTH-GRADE-01 — 21 blockers','LW-TEMPIETTO-LANDING-01'].map((line,i)=>`<text x="830" y="${160+i*47}" class="s">${line}</text>`).join('')}<text x="70" y="651" class="h">No operations. No release authority. No water, deck, landing, lighting, or ownership mutation.</text><text x="70" y="679" class="s">Required sequence: source-bound ownership + full hydrology → containment/drainage → grade/landing → guarded inverse package.</text></svg>`;
const jsonPath = path.join(outDir, 'mp09-long-water-hydrology-ownership-grade-acceptance-contract.json');
const mapPath = path.join(outDir, 'mp09-long-water-hydrology-ownership-grade-acceptance-map.svg');
const markdownPath = path.join(outDir, 'MP09-LONG-WATER-HYDROLOGY-OWNERSHIP-GRADE-ACCEPTANCE-CONTRACT.md');
write(jsonPath, contract);
write(mapPath, map);
write(markdownPath, `# MP09 Long Water hydrology, ownership, grade, and landing acceptance contract 01\n\n**Status:** \`${contract.status}\`. This packet is an exact source-bound hold, not a release package.\n\n![Default-deny acceptance map](mp09-long-water-hydrology-ownership-grade-acceptance-map.svg)\n\n## Exact current condition\n\n- Reviewed deck: **196** cells (hash 268a…ffed2).\n- Blocked headroom: **21** cells (hash c85d…c575), including both north tie-in cells at z=-455.\n- Proposed foundation displacement: **186** exact source-water cells (hash 191b…c259) at y=66.\n- Immediate interaction halo: **593** fluid cells; affected component: **1,469** cells and open at both y=64 and y=70 survey faces.\n- No assigned Long Water hydrology, displacement, north-grade, or Tempietto-landing interface exists.\n\n## Acceptance required before any build\n\n1. Bind one exact owner per containment, water, grade, bridge, deck, and landing cell, including interaction halo and protected exclusions.\n2. Close or explicitly control every fluid component exit; then design containment/drainage before changing any of the 186 water cells.\n3. Design a supported, two-wide, two-headroom north tie-in and one-step-or-less bidirectional grade/landing to (-85,69,-552).\n4. Compile canonical forward/inverse operations only after the above is accepted; execute the fresh guarded-release kernel and independent hydrology/route QA.\n\nDeck-only, liner-only, landing-only, dry-ground paving, and broad-area ownership inference remain default-deny.\n\n## Source binding\n\nThe generator verified all **130** members declared by immutable capture \`${capture.captureId}\` and hash-binds its three source screens and existing ownership record in the JSON artifact. It emits zero operations and makes no live or world change.\n`);
console.log(JSON.stringify({ status: contract.status, contract: rel(jsonPath), markdown: rel(markdownPath), map: rel(mapPath), verifiedRequiredMembers: 130, operations: 0, mutationAuthority: false, identitySha256: contract.identitySha256 }, null, 2));
