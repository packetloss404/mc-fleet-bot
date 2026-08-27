#!/usr/bin/env node
/** Generate the current-source, no-operation B07 first-viable-release gate. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (name) => {
  const result = option(name);
  if (!result) throw new Error(`${name} is required`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const read = (filename) => fs.readFileSync(absolute(filename));
const readJson = (filename) => JSON.parse(read(filename));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (filename, payload) => {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
  fs.writeFileSync(absolute(filename), `${typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}\n`);
};
const assert = (condition, message) => { if (!condition) throw new Error(`B07 first-viable contract rejected: ${message}`); };

const snapshot = required('--snapshot');
const integratedPath = required('--integrated');
const containmentPath = required('--containment');
const fluidPath = required('--fluid');
const surfacePath = required('--surface');
const landingPath = required('--landing');
const ownershipPath = required('--ownership');
const out = required('--out');
const markdown = required('--markdown');
const gateMap = required('--gate-map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const integrated = readJson(integratedPath);
const containment = readJson(containmentPath);
const fluid = readJson(fluidPath);
const surface = readJson(surfacePath);
const landing = readJson(landingPath);
const ownership = readJson(ownershipPath);
const capture = readJson(path.join(snapshot, 'combined-zones-complete-save-capture.json'));

assert(integrated.status === 'INTEGRATED_FUNCTIONAL_DESIGN_HELD_NO_SAFE_INDEPENDENT_PHASE', 'integrated disposition drifted');
assert(integrated.candidate.construction.cellCount === 8134 && integrated.candidate.interaction.cellCount === 13608, 'canonical B07 reservation drifted');
assert(integrated.sourceInventory.constructionFluid.cellCount === 5 && integrated.sourceInventory.interactionFluid.cellCount === 89, 'immediate fluid contacts drifted');
assert(integrated.sourceInventory.interactionGravity.cellCount === 90 && integrated.sourceInventory.interactionGravity.unsupportedCount === 11, 'gravity record drifted');
assert(containment.status === 'INTEGRATED_CONTAINMENT_AND_GRAVITY_DESIGN_HELD_NO_PHASEABLE_PHYSICAL_PACKAGE', 'containment disposition drifted');
assert(fluid.topologyTraces.extended.component.cellCount === 125000, 'extended topology cap drifted');
assert(fluid.topologyTraces.extended.disposition === 'CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE', 'extended topology unexpectedly closed');
assert(fluid.waterAndStructureCharacterization.waterloggedCellCount === 115 && fluid.waterAndStructureCharacterization.bubbleColumnCells.cellCount === 452, 'special fluid states drifted');
assert(surface.status === 'SOURCE_BOUND_SURFACE_RECEIVER_DESIGN_HOLD_NO_DOORWAY_OR_RECEIVER_AUTHORITY', 'surface receiver disposition drifted');
assert(surface.candidateFaceDecisionEnvelopes.every(({ currentExteriorWalkComponent }) => currentExteriorWalkComponent.reachesNaturalTerrain === false), 'surface terrain reachability changed');
assert(landing.status === 'SOURCE_BOUND_NO_FULLY_OWNED_LANDING_OR_DESCENT_OPTION' && landing.ownershipDecision.fullyOwnedStudyExists === false, 'landing ownership disposition drifted');
assert(ownership.status === 'NO_AUTHORITY_FOR_B07_CONSTRUCTION_OR_EXTERIOR_RECEIVER', 'ownership default-deny record drifted');

const inputPaths = [integratedPath, containmentPath, fluidPath, surfacePath, landingPath, ownershipPath];
const gate = {
  schemaVersion: 1,
  id: 'MP05-B07-FIRST-VIABLE-GUARDED-RELEASE-CONTRACT-02',
  status: 'BLOCKED_NO_SAFE_FINITE_STAGE_OR_OPERATION',
  generatedAtUtc,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    immutableCopy: capture.immutableCopy === true,
    inputSha256: Object.fromEntries(inputPaths.map((filename) => [relative(filename), sha256(read(filename))])),
  },
  atomicity: {
    requiredTransactionClass: 'ONE_INTEGRATED_CONTAINMENT_PERMANENT_GRAVITY_ROUTE_SURFACE_RECEIVER_TRANSACTION',
    releaseableIndependentSubphases: [],
    prohibitedFragments: ['fluid-only liner/displacement', 'gravity-only temporary support', 'cap-only removal', 'door/headhouse-only opening', 'surface landing/descent-only work', 'lower-lobby-only opening'],
    rationale: 'Every fragment either changes an unbounded fluid system, reintroduces falling states on rollback, modifies an accepted closed cap without a receiver, or creates a nonfunctional endpoint.',
  },
  exactCurrentGateInputs: {
    reservation: { constructionCells: 8134, interactionCells: 13608, constructionHash: integrated.candidate.construction.coordinateSetSha256, interactionHash: integrated.candidate.interaction.coordinateSetSha256 },
    fluids: { constructionContacts: 5, interactionContacts: 89, diagnosticComponentCells: containment.fluidTopology.components[0].diagnosticComponent.cellCount, extendedObservedCells: 125000, topologyDisposition: fluid.topologyTraces.extended.disposition, waterloggedCells: 115, bubbleColumns: 452 },
    gravity: { interactionCells: 90, unsupportedChains: 11 },
    surface: { fourCandidateFaces: surface.candidateFaceDecisionEnvelopes.length, normalWalkNodesPerFace: surface.candidateFaceDecisionEnvelopes.map(({ direction, currentExteriorWalkComponent }) => ({ direction, nodes: currentExteriorWalkComponent.normalWalkNodeCount, reachesTerrain: currentExteriorWalkComponent.reachesNaturalTerrain })), cardinalDescentPrisms: landing.cardinalStudies.map(({ direction, diagnosticPrism, sourceInventory }) => ({ direction, cells: diagnosticPrism.cellCount, clearanceIntrusions: sourceInventory.clearanceIntrusions.cellCount, supportHazards: sourceInventory.supportVoidsOrFluidOrGravity.cellCount })), naturalTerrainReachable: landing.normalWalkTopology.componentFromAllFourClosedFaces.reachesNaturalStableTerrain },
    authority: { b07ConstructionAuthority: ownership.disposition.contractCanBeAcceptedFromCurrentEvidence, exteriorReceiverAuthority: false, acceptedClosedCapCells: ownership.requiredEndpointInterfaces[0].interfaceCellSet.cellCount, defaultFailureState: 'retain source / keep 49 R07J cap cells solid and headhouse doorless' },
  },
  prerequisiteArtifactsBeforeCompiler: [
    { id: 'B07-AUTH-02', required: 'accepted exact 3-D owner/counterpart contract for every target, interaction, receiver, overflow, lower endpoint, surface endpoint, and all six directional seams; source/desired state sets and component accounting; no broad reservation adoption' },
    { id: 'B07-FLUID-02', required: 'complete component closure or an independently sealed boundary with every waterlogged/bubble state, receiver capacity/freeboard, overflow/failure path, forward fluid order, and exact reverse order' },
    { id: 'B07-GRAVITY-02', required: 'permanent replacement/migration manifest for all changed gravity/support-chain cells, whose every reverse step has stable support; temporary supports are invalid' },
    { id: 'B07-ROUTE-02', required: 'lower-to-surface cardinal normal-walk geometry, source and projected two-high/width/step proof, lighting/access/smoke/power/drainage disposition, and separate independent-egress decision' },
    { id: 'B07-SURFACE-02', required: 'one exact exterior face plus an owned landing/descent and failure receiver; preserve R07J cap until its reciprocal contract accepts a changed state' },
  ],
  compilerAdmission: {
    forbiddenUntilAllPrerequisitesAccepted: true,
    requiredOperationProperties: ['complete canonical states', 'exact inverse', 'forward containment then gravity-stable migration then route/receiver activation', 'rollback in exact reverse hydraulic/gravity-safe order', 'strict parser/source/projected rollback checks'],
    liveReleaseKernelStillRequired: ['fresh complete immutable capture', 'block-entity/protected-core clearance or reviewed migration', 'fresh and immediate live-entity clearances', 'journaled strict-noop execution', 'fresh post snapshot', 'rollback-poststate preflight', 'independent bidirectional functional QA'],
  },
  decision: { forwardOperationCount: 0, rollbackOperationCount: 0, releaseEligible: false },
  nonClaims: ['fluid isolation', 'gravity stabilization', 'surface access', 'B07 route', 'egress', 'MP05 completion'],
};
gate.identitySha256 = sha256(JSON.stringify(gate));

const stages = [
  ['Authority', '#ef4444', '8,134 / 13,608 cells\nno accepted owner'],
  ['Fluids', '#0ea5e9', '125,000 observed\ntrace cap reached'],
  ['Gravity', '#f59e0b', '90 cells / 11\nunsupported chains'],
  ['Route + receiver', '#a855f7', 'no owned descent\nno terrain endpoint'],
  ['Compiler + live kernel', '#64748b', 'disabled until\nall gates accepted'],
];
const boxes = stages.map(([title, colour, subtitle], index) => {
  const x = 35 + index * 180;
  return `<rect x="${x}" y="92" width="145" height="126" rx="10" fill="#111827" stroke="${colour}" stroke-width="4"/><text x="${x+12}" y="124" class="title" fill="${colour}">${title}</text>${subtitle.split('\n').map((line, lineIndex) => `<text x="${x+12}" y="${157+lineIndex*20}" class="small">${line}</text>`).join('')}${index < stages.length-1 ? `<path d="M ${x+148} 155 H ${x+174}" stroke="#94a3b8" stroke-width="4" marker-end="url(#arrow)"/>` : ''}`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="330" viewBox="0 0 940 330"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#94a3b8"/></marker></defs><style>.title{font:700 18px Arial,sans-serif}.small{font:14px Arial,sans-serif;fill:#e5e7eb}.caption{font:16px Arial,sans-serif;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#020617"/><text x="35" y="43" class="title" fill="#f8fafc">MP05 B07 first viable release: atomic gate map</text><text x="35" y="68" class="caption">Each red/blue/amber/violet gate is mandatory. None is a separately releaseable construction phase.</text>${boxes}<rect x="35" y="258" width="865" height="42" rx="8" fill="#7f1d1d"/><text x="52" y="285" class="caption">Current decision: zero forward / rollback operations. Keep the R07J 49-cell cap solid and headhouse doorless.</text></svg>`;
write(out, gate);
write(gateMap, svg);
const md = `# MP05 B07 first viable guarded-release contract 02\n\n**Status:** \`${gate.status}\` — zero operations were emitted.\n\n![B07 atomic gate map](${path.basename(gateMap)})\n\n## Current latest-source decision\n\nNo B07 subphase is releaseable. The exact reservation remains 8,134 construction cells and 13,608 interaction cells, but it has no accepted construction owner or counterpart. The current source still contains 5 construction/89 interaction fluid contacts, a capped and incomplete 125,000-cell extended topology with 115 waterlogged and 452 bubble-column cells, and 90 gravity cells with 11 unsupported chains. The accepted 49-cell R07J cap remains the required closed failure state.\n\nAll four surface face studies remain local elevated-deck components with no terrain endpoint; all cardinal descent prisms leave accepted architecture or enter unassigned terrain. There is no fully owned landing/descent.\n\n## First legal compiler boundary\n\nA compiler may exist only after every artifact listed in the machine contract is accepted: exact 3-D authority, full fluid/receiver/overflow treatment, rollback-safe permanent gravity design, a normal-walk lower-to-surface route, and one owned surface receiver/landing. The forward sequence must be containment, then permanent gravity treatment, then route/receiver activation; rollback reverses the hydraulic and gravity-safe dependency order. A fresh live release kernel remains mandatory afterwards.\n\n## Current maps\n\n- [Integrated route constraint maps](../../../${relative(path.dirname(integratedPath))}/)\n- [Containment and gravity maps](../../../${relative(path.dirname(containmentPath))}/)\n- [Extended fluid topology maps](../../../${relative(path.dirname(fluidPath))}/)\n- [Surface receiver maps](../../../${relative(path.dirname(surfacePath))}/)\n- [Landing/descent maps](../../../${relative(path.dirname(landingPath))}/)\n\nNo containment, gravity, access, route, egress, or completion claim is made.\n`;
write(markdown, md);
process.stdout.write(`${JSON.stringify({ status: gate.status, out: relative(out), markdown: relative(markdown), gateMap: relative(gateMap), identitySha256: gate.identitySha256 }, null, 2)}\n`);
