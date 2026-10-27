#!/usr/bin/env node
/**
 * MP05/B07 hydrology + receiver decision 05.
 *
 * Binds the Governor-delegated B07 hydrology/receiver roles to an exact
 * current-source topology trace.  It deliberately refuses to select or emit
 * a liner, plug, receiver, outlet, opening, route, or release until the
 * water-bearing component has a finite reviewed boundary and its directed
 * treatment/overflow/inverse contract is supplied.  This is a design gate,
 * never mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { deriveB07WestTwo, hashCells, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const bind = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const OWNER_INPUT = option('--owner-input', 'data/world-review/mp05-b07-integrated-owner-interface-04-post-20260828T041000Z/mp05-b07-integrated-owner-interface-04.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp05-b07-fluid-topology-extension-03-post-20260828T041000Z/fluid-topology-extension-findings.json');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-hydrology-receiver-05-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-HYDROLOGY-RECEIVER-05-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T05:30:00.000Z');

for (const filename of [
  path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'),
  path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'),
  OWNER_INPUT, TOPOLOGY, MECHANISMS,
]) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);

const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const owner = json(OWNER_INPUT);
const topology = json(TOPOLOGY);
const mechanisms = json(MECHANISMS);
assert(capture.id === 'combined-zones-complete-save-capture' && capture.immutableCopy === true
  && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length >= 130,
  'snapshot is not a complete immutable save capture');
assert(owner.id === 'MP05-B07-INTEGRATED-OWNER-INTERFACE-04'
  && owner.status === 'ACCEPTED_EXACT_OWNER_AND_SIX_BOUNDARY_COUNTERPART_INPUT_ONLY'
  && owner.mutationAuthority === false, 'owner/interface input 04 is not the accepted non-mutating role input');
assert(owner.source?.snapshot === rel(SNAPSHOT) && owner.source.captureId === capture.captureId,
  'owner/interface input is not bound to this exact current source');
assert(owner.assignedRoles?.hydrologyContainmentOwner === 'MP05 Hydrology Containment Team'
  && owner.assignedRoles?.exteriorReceiverOwner === 'B07 Surface Receiver Team',
  'delegated hydrology and exterior-receiver roles are absent');
assert(topology.id === 'MP05-B07-FLUID-TOPOLOGY-EXTENSION-01'
  && topology.status === 'SOURCE_BOUND_EXTENDED_FLUID_TOPOLOGY_HELD_NO_RECEIVER_OR_ISOLATION_AUTHORITY',
  'fresh topology input is not a fail-closed source-bound trace');
assert(topology.source?.snapshotRoot === rel(SNAPSHOT) && topology.source.captureId === capture.captureId,
  'topology trace is not bound to this exact current source');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
assert(b07.construction.length === 8134 && b07.interaction.length === 13608, 'canonical B07 geometry drifted');
const extended = topology.topologyTraces?.extended;
const seed = topology.topologyTraces?.seed?.interactionFluid;
const faces = topology.candidateIsolationSurfaceScreen?.screenedFaces;
assert(seed?.cellCount > 0 && extended?.component?.cellCount > 0 && faces?.faceCount >= 0,
  'topology trace does not contain the required seed/component/face evidence');
const finiteComponent = extended.completeWithinEnvelope === true && extended.capReached === false
  && extended.boundaryFluid?.cellCount === 0;
const receiverCandidate = finiteComponent
  ? 'PENDING_DIRECTED_RECEIVER_CONTRACT_NOT_A_RELEASE'
  : 'NO_FINITE_CONTAINMENT_RECEIVER_CANDIDATE';
assert(receiverCandidate === 'NO_FINITE_CONTAINMENT_RECEIVER_CANDIDATE',
  'this decision 05 is intentionally fail-closed; a finite component needs a separate directed design path');

const emptyHash = hashCells(uniqueCells([]));
const report = {
  schemaVersion: 1,
  id: 'MP05-B07-HYDROLOGY-RECEIVER-05',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_HYDROLOGY_RECEIVER_FAIL_CLOSED_UNBOUNDED_COMPONENT',
  purpose: 'Current-source decision package after owner/interface input 04. It proves whether delegated hydrology/receiver roles have enough finite topology evidence to select a containment receiver. It does not choose a receiver or mutate the world.',
  mutationAuthority: false,
  source: {
    snapshot: rel(SNAPSHOT), captureId: capture.captureId,
    immutableRequiredMemberCount: capture.requiredMembers.length,
    captureManifest: bind(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
  },
  bindings: { ownerInterface04: bind(OWNER_INPUT), fluidTopology03: bind(TOPOLOGY), mechanisms: bind(MECHANISMS) },
  accountableRoles: {
    primaryConstructionOwner: owner.assignedRoles.b07PrimaryConstructionOwner,
    hydrologyContainmentOwner: owner.assignedRoles.hydrologyContainmentOwner,
    exteriorReceiverOwner: owner.assignedRoles.exteriorReceiverOwner,
    boundaryCounterpartOwner: owner.assignedRoles.boundaryCounterpartOwner,
    roleScope: 'Assigned coordination roles only; no role alone grants desired states, outlet selection, capacity/freeboard acceptance, route opening, public access, or execution.',
  },
  exactB07Domain: {
    construction: { cellCount: b07.construction.length, coordinateSetSha256: hashCells(uniqueCells(b07.construction)) },
    interaction: { cellCount: b07.interaction.length, coordinateSetSha256: hashCells(uniqueCells(b07.interaction)) },
  },
  observedHydrology: {
    seed: { ...seed },
    extendedComponent: { ...extended.component },
    extendedTrace: {
      bounds: extended.bounds, maximumCells: extended.maximumCells, capReached: extended.capReached,
      completeWithinEnvelope: extended.completeWithinEnvelope, disposition: extended.disposition,
      unexpandedCapFrontier: extended.unexpandedCapFrontier,
    },
    sourceFluidConstructionContact: extended.constructionContact,
    waterloggedCellCount: topology.waterAndStructureCharacterization.waterloggedCellCount,
    bubbleColumnCells: topology.waterAndStructureCharacterization.bubbleColumnCells,
    observedDrySolidFaces: faces,
  },
  containmentReceiverCandidate: {
    id: 'B07-HYDROLOGY-RECEIVER-CANDIDATE-05',
    disposition: receiverCandidate,
    selectedCells: { cellCount: 0, bounds: null, coordinateSetSha256: emptyHash },
    selectedFaces: { faceCount: 0, faceSetSha256: sha256('mp05-b07-empty-receiver-face-set-v1\n') },
    reason: `The exact current trace reached the ${extended.maximumCells.toLocaleString()}-cell safety cap with ${extended.unexpandedCapFrontier.cellCount.toLocaleString()} unexpanded frontier cells. A finite water component, sealed boundary, receiver terminal, outlet, and rollback state cannot be inferred.`,
    notSelected: [
      'The 123 local dry-solid faces are geometric observations, not a sealed liner or receiver.',
      'No water, waterlogged, or bubble-column desired state is selected.',
      'No capacity, freeboard, overflow, failure/recovery, or outlet/discharge path is inferred.',
      'No headhouse opening, public route, emergency egress, or exterior landing is selected or claimed.',
    ],
  },
  exactRequirementsForFutureCandidate: [
    'A complete finite fluid component closure, or an exact independently sealed boundary whose complete state and influence set are reviewed.',
    'One directed per-component graph: source fluid/waterlogged/bubble state -> treatment/liner -> receiver terminal -> overflow/failure disposition.',
    'Exact capacity and freeboard, receiver/outlet ownership, and retained-neighbour/protected-core/container treatment.',
    'Canonical forward and reverse state mapping where the reverse order never restores an uncontrolled flow path.',
    'A fresh complete source plus the scoped live entity, strict-noop, journal, post-snapshot, rollback-preflight, and functional QA kernel before any mutation.',
  ],
  explicitNonClaims: [
    'This is not a liner, plug, receiver, drainage, route, opening, public-access, or egress design.',
    'This does not treat a finite trace cap as a physical containment boundary.',
    'This does not change retained B07 caps, headhouse walls, or any live block state.',
  ],
  safetyBoundary: {
    readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false,
    forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="390" viewBox="0 0 1040 390"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:19px;font-weight:700}.s{font-size:12px}.m{font-size:14px;font-weight:700}.bad{fill:#b42318;font-weight:700}</style><rect width="100%" height="100%" fill="#f8fafc"/><text class="h" x="28" y="35">MP05 B07 hydrology / receiver decision 05 — current source</text><rect x="34" y="67" width="310" height="106" rx="8" fill="#e6f4ff" stroke="#0b6faf"/><text class="m" x="52" y="95">Exact B07 seed interface</text><text class="s" x="52" y="119">${seed.cellCount} fluid-bearing interaction cells</text><text class="s" x="52" y="141">${topology.waterAndStructureCharacterization.waterloggedCellCount} waterlogged; ${topology.waterAndStructureCharacterization.bubbleColumnCells.cellCount} bubble-column</text><text class="s" x="52" y="163">${faces.faceCount} observed dry-solid faces (not selected)</text><path d="M348 120 H428" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="435" y="67" width="290" height="106" rx="8" fill="#fff2e8" stroke="#d97616"/><text class="m" x="453" y="95">Expanded trace</text><text class="s" x="453" y="119">${extended.component.cellCount.toLocaleString()} observed cells</text><text class="s" x="453" y="141">cap: ${extended.maximumCells.toLocaleString()} cells</text><text class="bad" x="453" y="163">${extended.unexpandedCapFrontier.cellCount.toLocaleString()} frontier cells unexpanded</text><path d="M729 120 H809" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="816" y="67" width="192" height="106" rx="8" fill="#fee4e2" stroke="#b42318"/><text class="m" x="834" y="95">Receiver result</text><text class="bad" x="834" y="121">NO FINITE</text><text class="bad" x="834" y="143">CANDIDATE</text><text class="s" x="834" y="163">zero cells / zero faces</text><line x1="34" y1="218" x2="1008" y2="218" stroke="#cbd5e1"/><text class="m" x="34" y="251">Delegated roles bound to this source</text><text class="s" x="34" y="278">Hydrology containment: ${report.accountableRoles.hydrologyContainmentOwner}</text><text class="s" x="34" y="300">Exterior receiver: ${report.accountableRoles.exteriorReceiverOwner}</text><text class="s" x="34" y="329">Role assignment enables accountable design; it does not make an incomplete component finite or authorize a block change.</text><text class="bad" x="34" y="360">No liner, receiver, opening, route, public access, or egress claim is emitted.</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#516579"/></marker></defs></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-hydrology-receiver-decision-05.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-hydrology-receiver-decision-05.svg')), svg);
const markdown = `# MP05 B07 hydrology / receiver decision 05\n\n**Status:** \`${report.status}\`  \n**Current immutable source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine record:** [JSON](../../../${rel(path.join(OUT_DIR, 'mp05-b07-hydrology-receiver-decision-05.json'))})\n\n![Hydrology / receiver decision map](../../../${rel(path.join(OUT_DIR, 'mp05-b07-hydrology-receiver-decision-05.svg'))})\n\nOwner/interface input 04 assigns the B07 Hydrology Containment Team and B07 Surface Receiver Team. This decision tests whether those assigned roles have a finite current-source water body from which to select a sealed containment/receiver design. They do not yet.\n\nThe current trace begins at **${seed.cellCount}** B07 interaction-fluid cells, finds **${extended.component.cellCount.toLocaleString()}** connected fluid-bearing cells, and reaches its **${extended.maximumCells.toLocaleString()}**-cell safety cap with **${extended.unexpandedCapFrontier.cellCount.toLocaleString()}** cells left on the unexpanded frontier. It also includes **${topology.waterAndStructureCharacterization.waterloggedCellCount} waterlogged** and **${topology.waterAndStructureCharacterization.bubbleColumnCells.cellCount} bubble-column** states.\n\n## Result\n\nNo containment liner, plug, displacement area, receiver, outlet, overflow path, or rollback state is selected. The **${faces.faceCount}** observed dry solid faces around the B07 interaction fluid are recorded as geometry only; without closure of the connected water body they cannot be promoted to a physical boundary.\n\n## Required next design evidence\n\n${report.exactRequirementsForFutureCandidate.map((item) => `- ${item}`).join('\n')}\n\nThis package performs no live call, RCON action, operation generation, block change, opening, public-route action, or egress commissioning.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'mp05-b07-hydrology-receiver-decision-05.json')), markdown: rel(MARKDOWN), candidate: report.containmentReceiverCandidate.disposition, sourceFluidSeeds: seed.cellCount, observedComponentCells: extended.component.cellCount, unexpandedFrontierCells: extended.unexpandedCapFrontier.cellCount, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
