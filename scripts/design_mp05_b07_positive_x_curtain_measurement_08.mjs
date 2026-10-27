#!/usr/bin/env node
/**
 * MP05/B07 +X curtain / overflow measurement contract 08.
 *
 * Tests whether the two assigned exterior faces can be treated as a complete
 * finite containment system. It proves the current +X crossing curtain is
 * actually five faces, three of whose exterior-side targets are already
 * connected water. It therefore emits the narrowest remaining component-
 * closure / update-envelope measurement contract, never an operation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, deriveB07WestTwo, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 && args[at + 1] ? args[at + 1] : fallback; };
const abs = (filename) => path.resolve(ROOT, filename); const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8')); const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const sort = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const exact = (cells) => { const value = uniqueCells(cells).sort(sort); return { cellCount: value.length, bounds: value.length ? boundsOf(value) : null, coordinateSetSha256: hashCells(value) }; };
const faceHash = (faces) => sha256(`mp05-b07-positive-x-curtain-v1\n${faces.slice().sort((a, b) => sort(a.from, b.from)).map((face) => `${cellKey(face.from)}=${face.fromState}>${cellKey(face.to)}=${face.toState}`).join('\n')}\n`);
const name = (state) => state.split('[', 1)[0]; const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true'); const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const BILATERAL = option('--bilateral-authority', 'data/world-review/mp05-b07-bilateral-hydrology-boundary-authority-07-post-20260828T041000Z/mp05-b07-bilateral-hydrology-boundary-authority-07.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp05-b07-fluid-topology-extension-03-post-20260828T041000Z/fluid-topology-extension-findings.json');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-positive-x-curtain-measurement-08-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-POSITIVE-X-CURTAIN-MEASUREMENT-08-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T06:15:00.000Z');

for (const filename of [path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'), path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'), BILATERAL, TOPOLOGY, MECHANISMS]) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);
const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')); const bilateral = json(BILATERAL); const topology = json(TOPOLOGY); const mechanisms = json(MECHANISMS);
assert(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'complete immutable source required');
assert(bilateral.status === 'ACCEPTED_EXACT_BILATERAL_ROLE_AND_ROUTE_PRESERVATION_INPUT_ONLY' && bilateral.mutationAuthority === false && bilateral.source?.snapshot === rel(SNAPSHOT) && bilateral.source.captureId === capture.captureId, 'bilateral authority 07 is not bound to this source');
assert(topology.topologyTraces?.extended?.capReached === true && topology.source?.snapshotRoot === rel(SNAPSHOT) && topology.source.captureId === capture.captureId, 'capped topology trace is not bound to this source');
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem); assert(b07.interaction.length === 13608, 'canonical B07 interaction drifted');
const interaction = new Set(b07.interaction.map(cellKey)); const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const cache = new Map();
const stateAt = async (cell) => { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); };
const crossings = [];
for (const from of b07.interaction) {
  const fromState = await stateAt(from); const to = { x: from.x + 1, y: from.y, z: from.z };
  if (fluid(fromState) && !interaction.has(cellKey(to))) crossings.push({ from, fromState, to, toState: await stateAt(to) });
}
crossings.sort((a, b) => sort(a.from, b.from)); const exteriorAir = crossings.filter(({ toState }) => air(toState)); const exteriorFluid = crossings.filter(({ toState }) => fluid(toState));
assert(crossings.length === 5 && exteriorAir.length === 2 && exteriorFluid.length === 3, 'positive-X crossing curtain changed; fresh bilateral/boundary records are required');
const bilateralFaces = bilateral.bilateralExteriorBoundary.faces;
assert(faceHash(exteriorAir.map((face) => ({ ...face }))) === sha256(`mp05-b07-positive-x-curtain-v1\n${bilateralFaces.slice().sort((a, b) => sort(a.fromFluid, b.fromFluid)).map((face) => `${cellKey(face.fromFluid)}=${face.fromState}>${cellKey(face.toAir)}=${face.toState}`).join('\n')}\n`), 'two bilateral air faces do not match this current curtain');
// Every wet exterior target is directly adjacent to its B07 source cell, so
// each belongs to the same unresolved water-bearing component without making
// an inference from a distant or clipped observation.
const directConnectivity = exteriorFluid.map(({ from, to }) => ({ from, to, relation: 'FACE_ADJACENT_FLUID_TO_FLUID_SAME_COMPONENT' }));
const wetTargetCells = exteriorFluid.map(({ to }) => to); const curtainCells = crossings.map(({ to }) => to);
const necessaryMeasurement = {
  id: 'B07-POSITIVE-X-WET-CURTAIN-COMPONENT-CLOSURE-MEASUREMENT-08',
  exactWetTargetSubset: exact(wetTargetCells),
  exactCurtainTargets: exact(curtainCells),
  requirement: 'Starting from all three exact wet exterior target cells, observe the complete connected water-bearing component without a cell cap, or prove an independently sealed finite material boundary enclosing all of them.',
  whyIrreducible: 'Any curtain that blocks all five current B07-to-exterior crossings must replace or otherwise migrate these three water-bearing target cells. They are directly connected to B07 water and the current B07 trace stops at its 125,000-cell cap, so their source/receiver/overflow and safe rollback topology is incomplete.',
  requiredOutputs: [
    'complete component cell set or exact independently sealed boundary face/cell set',
    'all source, waterlogged, and bubble-column states on any changed or influence cell',
    'directed zero-discharge/overflow state graph and capacity/failure disposition',
    'a bounded water-update envelope proving no new B07-to-exterior crossing appears after the curtain is installed',
    'reverse ordering that keeps a complete liner/boundary in place until all source water states can be safely restored',
  ],
  mutationAuthority: false,
};
const report = {
  schemaVersion: 1, id: 'MP05-B07-POSITIVE-X-CURTAIN-MEASUREMENT-08', generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_POSITIVE_X_CURTAIN_NOT_DESIGNABLE_UNTIL_WET_TARGET_COMPONENT_CLOSURE', mode: 'READ_ONLY_SOURCE_BOUND_NON_MUTATING', mutationAuthority: false,
  purpose: 'Tests the complete local +X curtain implied by bilateral authority 07. It distinguishes two exposed-air faces from all five fluid crossings and defines the smallest component-closure/update measurement needed before a finite plug/overflow design can exist.',
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableRequiredMemberCount: capture.requiredMembers.length },
  bindings: { bilateralAuthority07: binding(BILATERAL), topology03: binding(TOPOLOGY), mechanisms: binding(MECHANISMS) },
  completeCurrentCrossingCurtain: { faceCount: crossings.length, faceSetSha256: faceHash(crossings), faces: crossings, exteriorAirPair: { faceCount: exteriorAir.length, faces: exteriorAir }, exteriorFluidSubset: { faceCount: exteriorFluid.length, faces: exteriorFluid, directConnectivity } },
  result: {
    finiteContainmentSystemDesignable: false,
    overflowSystemDesignable: false,
    exactReason: 'The bilateral contract covers two exposed-air faces, but the full current B07 +X fluid crossing curtain has five faces. Three exterior-side curtain targets are already water and directly connected to B07 water. Replacing or enclosing them would treat the same component whose current trace is capped-out, so finite source, receiver/overflow, and reverse topology cannot be proved.',
    noSystemSelected: ['No liner/plug target state', 'No receiver/outlet/overflow state', 'No water displacement state', 'No route/opening/public/egress state', 'No forward or rollback operation'],
  },
  narrowestMissingMeasurementContract: necessaryMeasurement,
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="430" viewBox="0 0 1100 430"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:20px;font-weight:700}.m{font-size:14px;font-weight:700}.s{font-size:12px}.bad{fill:#b42318;font-weight:700}</style><rect width="100%" height="100%" fill="#f8fafc"/><text class="h" x="30" y="37">MP05 B07 +X containment curtain / overflow screen 08</text><rect x="40" y="76" width="285" height="150" rx="10" fill="#e1f2ff" stroke="#0b6faf"/><text class="m" x="58" y="108">B07 side: five crossings</text><text class="s" x="58" y="135">all exact +X fluid faces</text><text class="s" x="58" y="158">2 cross to air</text><text class="s" x="58" y="181">3 cross directly to water</text><text class="bad" x="58" y="207">two-face plug is incomplete</text><path d="M326 150 H422" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="428" y="76" width="305" height="150" rx="10" fill="#fee4e2" stroke="#b42318"/><text class="m" x="446" y="108">Exterior curtain targets</text><text class="s" x="446" y="135">2 air cells: bilateral roles bound</text><text class="s" x="446" y="158">3 water cells: same component</text><text class="s" x="446" y="181">directly face-adjacent to B07 water</text><text class="bad" x="446" y="207">cannot displace without closure</text><path d="M735 150 H825" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="831" y="76" width="230" height="150" rx="10" fill="#fff5df" stroke="#b7791f"/><text class="m" x="849" y="108">Required measurement</text><text class="s" x="849" y="135">complete wet-target component</text><text class="s" x="849" y="158">or sealed finite boundary</text><text class="s" x="849" y="181">plus update/rollback proof</text><text class="bad" x="849" y="207">no operation until then</text><line x1="40" y1="268" x2="1060" y2="268" stroke="#cbd5e1"/><text class="m" x="40" y="302">Narrowest missing geometry</text><text class="s" x="40" y="330">Three exact water target cells: ${wetTargetCells.map(cellKey).join(' · ')}</text><text class="s" x="40" y="355">They are the smallest external subset that any complete current +X curtain would have to treat.</text><text class="bad" x="40" y="391">No finite containment/overflow system, route, opening, public access, egress, target state, or operation is emitted.</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#516579"/></marker></defs></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true }); fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-positive-x-curtain-measurement-08.json')), `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-positive-x-curtain-measurement-08.svg')), svg);
const markdown = `# MP05 B07 +X curtain / overflow measurement 08\n\n**Status:** \`${report.status}\`  \n**Current immutable source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine record:** [JSON](../../../${rel(path.join(OUT_DIR, 'mp05-b07-positive-x-curtain-measurement-08.json'))})\n\n![+X curtain measurement map](../../../${rel(path.join(OUT_DIR, 'mp05-b07-positive-x-curtain-measurement-08.svg'))})\n\nThe two bilateral faces are real, but they are not the complete current +X water curtain. The complete source state has **five** B07-to-exterior water crossings: two reach air and three already reach water. Those three exact wet exterior targets are directly connected to B07 water and therefore belong to the same unresolved fluid system.\n\nA full five-cell curtain would have to treat three water cells, not merely fill two air cells. Because the connected component is currently capped out at 125,000 observed cells, no finite source, receiver/overflow, water-displacement, or safe reverse sequence can be declared.\n\n## Narrowest missing measurement\n\n${necessaryMeasurement.requiredOutputs.map((item) => `- ${item}`).join('\n')}\n\nThis is a measurement/design contract only. It emits no block target, liner, plug, receiver, overflow, route/opening change, public access, egress, operation, or live call.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true }); fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'mp05-b07-positive-x-curtain-measurement-08.json')), markdown: rel(MARKDOWN), curtainFaces: crossings.length, wetCurtainTargets: exteriorFluid.length, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
