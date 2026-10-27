#!/usr/bin/env node
/**
 * MP05/B07 bilateral hydrology-boundary authority input 07.
 *
 * Assigns the already delegated B07 roles to two exact exterior fluid/air
 * faces, while freezing every local interaction-envelope fluid/air face as
 * retained route/opening geometry. This is deliberately authority *input*
 * only: it accepts neither a block transition nor a containment release.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, deriveB07WestTwo, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const sortFace = (a, b) => a.fromFluid.y - b.fromFluid.y || a.fromFluid.z - b.fromFluid.z || a.fromFluid.x - b.fromFluid.x || a.direction.localeCompare(b.direction);
const faceHash = (faces) => sha256(`mp05-b07-bilateral-hydrology-face-pairs-v1\n${faces.slice().sort(sortFace).map((face) => `${cellKey(face.fromFluid)}=${face.fromState}>${face.direction}>${cellKey(face.toAir)}=${face.toState}`).join('\n')}\n`);
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const dirs = [['NEGATIVE_X', -1, 0, 0], ['POSITIVE_X', 1, 0, 0], ['NEGATIVE_Y', 0, -1, 0], ['POSITIVE_Y', 0, 1, 0], ['NEGATIVE_Z', 0, 0, -1], ['POSITIVE_Z', 0, 0, 1]];

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const OWNER = option('--owner-input', 'data/world-review/mp05-b07-integrated-owner-interface-04-post-20260828T041000Z/mp05-b07-integrated-owner-interface-04.json');
const SEARCH = option('--boundary-search', 'data/world-review/mp05-b07-exterior-containment-boundary-search-06-post-20260828T041000Z/mp05-b07-exterior-containment-boundary-search-06.json');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-bilateral-hydrology-boundary-authority-07-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-BILATERAL-HYDROLOGY-BOUNDARY-AUTHORITY-07-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T06:00:00.000Z');

for (const filename of [path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'), path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'), OWNER, SEARCH, MECHANISMS]) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);
const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const owner = json(OWNER); const search = json(SEARCH); const mechanisms = json(MECHANISMS);
assert(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'complete immutable source required');
assert(owner.status === 'ACCEPTED_EXACT_OWNER_AND_SIX_BOUNDARY_COUNTERPART_INPUT_ONLY' && owner.mutationAuthority === false && owner.source?.snapshot === rel(SNAPSHOT) && owner.source.captureId === capture.captureId, 'owner input 04 does not bind the current source');
assert(search.status === 'SOURCE_BOUND_NO_PREPARE_READY_EXTERIOR_CONTAINMENT_BOUNDARY' && search.mutationAuthority === false && search.source?.snapshot === rel(SNAPSHOT) && search.source.captureId === capture.captureId, 'boundary search 06 does not bind the current source');
const assigned = owner.assignedRoles;
assert(assigned?.hydrologyContainmentOwner && assigned?.boundaryCounterpartOwner && assigned?.b07PrimaryConstructionOwner && assigned?.protectedCapOwner, 'required delegated owners are missing');
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
assert(b07.construction.length === 8134 && b07.interaction.length === 13608, 'canonical B07 geometry drifted');
const interaction = new Set(b07.interaction.map(cellKey));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const cache = new Map();
const stateAt = async (cell) => { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); };
const faces = [];
for (const fromFluid of b07.interaction) {
  const fromState = await stateAt(fromFluid); if (!fluid(fromState)) continue;
  for (const [direction, dx, dy, dz] of dirs) {
    const toAir = { x: fromFluid.x + dx, y: fromFluid.y + dy, z: fromFluid.z + dz }; const toState = await stateAt(toAir);
    if (air(toState)) faces.push({ fromFluid, fromState, direction, toAir, toState, inInteraction: interaction.has(cellKey(toAir)) });
  }
}
const interactionFaces = faces.filter(({ inInteraction }) => inInteraction).sort(sortFace);
const exteriorFaces = faces.filter(({ inInteraction }) => !inInteraction).sort(sortFace);
assert(faces.length === 27 && interactionFaces.length === 25 && exteriorFaces.length === 2, 'current fluid-to-air boundary census changed; regenerate the boundary search before accepting a contract');
assert(exteriorFaces.every(({ direction }) => direction === 'POSITIVE_X'), 'exterior counterpart faces are not the exact positive-X pair expected by the bilateral contract');
const searchGroups = new Map(search.localBoundaryInventory.byDisposition.map((entry) => [entry.id, entry]));
assert(searchGroups.get('REJECTED_INTERACTION_ROUTE_OR_OPENING_ENVELOPE_DEFAULT_DENY')?.faceCount === interactionFaces.length && searchGroups.get('REJECTED_EXTERIOR_WITHOUT_EXACT_COUNTERPART_DOMAIN')?.faceCount === exteriorFaces.length, 'search 06 count drifted');

const report = {
  schemaVersion: 1,
  id: 'MP05-B07-BILATERAL-HYDROLOGY-BOUNDARY-AUTHORITY-07',
  generatedAtUtc: GENERATED_AT,
  status: 'ACCEPTED_EXACT_BILATERAL_ROLE_AND_ROUTE_PRESERVATION_INPUT_ONLY',
  mode: 'READ_ONLY_SOURCE_BOUND_NON_MUTATING',
  mutationAuthority: false,
  purpose: 'Minimal bilateral role record for the two exact exterior B07 fluid/air faces, plus exact route/opening-envelope preservation for the 25 interaction faces. It resolves responsibility, not treatment, construction, or opening authority.',
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableRequiredMemberCount: capture.requiredMembers.length },
  bindings: { ownerInterface04: binding(OWNER), boundarySearch06: binding(SEARCH), mechanisms: binding(MECHANISMS) },
  bilateralExteriorBoundary: {
    id: 'B07-HYDROLOGY-EXTERIOR-POSITIVE-X-PAIR-07',
    sourceSideOwner: assigned.hydrologyContainmentOwner,
    counterpartOwner: assigned.boundaryCounterpartOwner,
    constructionCoordinator: assigned.b07PrimaryConstructionOwner,
    acceptance: 'EXACT_FACE_RESPONSIBILITY_ACCEPTED_NO_TARGET_STATE_OR_MUTATION_APPROVED',
    faceCount: exteriorFaces.length,
    faceSetSha256: faceHash(exteriorFaces),
    faces: exteriorFaces,
    requiredForAnyLaterDesign: ['one finite liner/cutset cell set', 'directed source -> liner -> receiver/overflow/failure state graph', 'canonical target and inverse states', 'fresh guarded release kernel'],
  },
  interactionEnvelopePreservation: {
    id: 'B07-INTERACTION-FLUID-AIR-ROUTE-PRESERVATION-07',
    preservationOwner: assigned.protectedCapOwner,
    constructionCoordinator: assigned.b07PrimaryConstructionOwner,
    boundaryCounterpartOwner: assigned.boundaryCounterpartOwner,
    requirement: 'Retain every listed air cell and face state. No liner, plug, clearance, route, cap, hatch, door, endpoint, or opening state may change under the exterior-boundary workstream.',
    faceCount: interactionFaces.length,
    faceSetSha256: faceHash(interactionFaces),
    airCellCount: new Set(interactionFaces.map(({ toAir }) => cellKey(toAir))).size,
    faces: interactionFaces,
  },
  retainedDefaultDeny: [
    'No source state is converted and no desired block state is selected.',
    'No receiver, outlet, overflow, freeboard, liner, plug, route, public access, or emergency egress is accepted.',
    'The 25 interaction-envelope air targets are retained, not authority for a clearance or opening change.',
    'The two exterior faces gain accountable counterpart roles only; they remain outside the current B07 construction domain.',
  ],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="390" viewBox="0 0 1080 390"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:20px;font-weight:700}.m{font-size:14px;font-weight:700}.s{font-size:12px}.ok{fill:#135f47}.hold{fill:#b42318}</style><rect width="100%" height="100%" fill="#f8fafc"/><text class="h" x="28" y="36">MP05 B07 bilateral hydrology boundary authority 07</text><rect x="35" y="76" width="285" height="134" rx="10" fill="#e1f2ff" stroke="#0b6faf"/><text class="m" x="52" y="108">B07 fluid side</text><text class="s" x="52" y="134">${assigned.hydrologyContainmentOwner}</text><text class="s" x="52" y="157">2 exact +X fluid/air faces</text><text class="s" x="52" y="180">source states hash-bound</text><path d="M322 143 H426" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="432" y="76" width="285" height="134" rx="10" fill="#edf7ee" stroke="#39724d"/><text class="m" x="449" y="108">Boundary counterpart</text><text class="s" x="449" y="134">${assigned.boundaryCounterpartOwner}</text><text class="s" x="449" y="157">exact-face responsibility only</text><text class="hold" x="449" y="180">no target / no mutation</text><rect x="766" y="76" width="275" height="134" rx="10" fill="#fff5df" stroke="#b7791f"/><text class="m" x="783" y="108">Interaction preservation</text><text class="s" x="783" y="134">${interactionFaces.length} faces / ${report.interactionEnvelopePreservation.airCellCount} air cells</text><text class="s" x="783" y="157">${assigned.protectedCapOwner}</text><text class="hold" x="783" y="180">retain, do not clear or plug</text><line x1="35" y1="250" x2="1040" y2="250" stroke="#cbd5e1"/><text class="m" x="35" y="283">Contract boundary</text><text class="s" x="35" y="310">This record resolves accountable roles for two exterior pairings while preserving every local interaction air face.</text><text class="s" x="35" y="334">It does not select a liner, receiver, overflow terminal, outlet, route, opening, public access, or emergency egress.</text><text class="hold" x="35" y="365">Operations 0 · rollback operations 0 · mutation authority false</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#516579"/></marker></defs></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-bilateral-hydrology-boundary-authority-07.json')), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-bilateral-hydrology-boundary-authority-07.svg')), svg);
const markdown = `# MP05 B07 bilateral hydrology boundary authority 07\n\n**Status:** \`${report.status}\`  \n**Source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine record:** [JSON](../../../${rel(path.join(OUT_DIR, 'mp05-b07-bilateral-hydrology-boundary-authority-07.json'))})\n\n![Bilateral boundary and preservation map](../../../${rel(path.join(OUT_DIR, 'mp05-b07-bilateral-hydrology-boundary-authority-07.svg'))})\n\nThe two current exterior positive-X water/air faces are now bound to **${assigned.hydrologyContainmentOwner}** on the B07 fluid side and **${assigned.boundaryCounterpartOwner}** on the counterpart side. Their exact source states and pair-set hash are recorded; this is role acceptance only.\n\nThe remaining **${interactionFaces.length}** fluid-to-air contacts remain protected interaction-envelope geometry. **${assigned.protectedCapOwner}**, the B07 Integration Team, and the Boundary Stewardship Team must retain the exact air cells/faces under any future exterior boundary workstream. This contract does not allow their clearance, plugging, route change, cap change, hatch/door change, or opening.\n\nNo operation, desired target state, receiver, liner, overflow, outlet, route, public access, or egress is accepted.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'mp05-b07-bilateral-hydrology-boundary-authority-07.json')), markdown: rel(MARKDOWN), exteriorFaces: exteriorFaces.length, interactionPreservationFaces: interactionFaces.length, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
