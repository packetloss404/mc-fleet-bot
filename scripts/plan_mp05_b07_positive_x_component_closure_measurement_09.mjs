#!/usr/bin/env node
/**
 * MP05/B07 +X component-closure measurement plan 09.
 *
 * Converts the five-face curtain and the largest current read-only trace into
 * the smallest chunk-aligned next trace shell and a separate full-height
 * local water-update envelope. It cannot mutate, simulate a live world, or
 * emit an operation; it is a source-bound capture/measurement specification.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const abs = (filename) => path.resolve(ROOT, filename); const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8')); const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const boxCells = (bounds) => (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1) * (bounds.maxZ - bounds.minZ + 1);
const floorDiv = (value, divisor) => Math.floor(value / divisor);
const chunkSpan = (bounds) => ({ minChunkX: floorDiv(bounds.minX, 16), maxChunkX: floorDiv(bounds.maxX, 16), minChunkZ: floorDiv(bounds.minZ, 16), maxChunkZ: floorDiv(bounds.maxZ, 16), chunkColumnCount: (floorDiv(bounds.maxX, 16) - floorDiv(bounds.minX, 16) + 1) * (floorDiv(bounds.maxZ, 16) - floorDiv(bounds.minZ, 16) + 1) });
const chunkStart = (coordinate) => floorDiv(coordinate, 16) * 16;
const chunkEnd = (coordinate) => chunkStart(coordinate) + 15;

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const CURTAIN = option('--curtain-measurement', 'data/world-review/mp05-b07-positive-x-curtain-measurement-08-post-20260828T041000Z/mp05-b07-positive-x-curtain-measurement-08.json');
const TRACE_500K = option('--trace-500k', 'data/world-review/mp05-b07-fluid-topology-extension-04-500k-post-20260828T041000Z/fluid-topology-extension-findings.json');
const TRACE_1M = option('--trace-1m', 'data/world-review/mp05-b07-fluid-topology-extension-05-1m-post-20260828T041000Z/fluid-topology-extension-findings.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-positive-x-component-closure-measurement-09-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-POSITIVE-X-COMPONENT-CLOSURE-MEASUREMENT-09-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T06:50:00.000Z');

for (const filename of [path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'), path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'), CURTAIN, TRACE_500K, TRACE_1M]) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);
const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')); const curtain = json(CURTAIN); const trace500k = json(TRACE_500K); const trace1m = json(TRACE_1M);
assert(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'complete immutable capture required');
assert(curtain.status === 'SOURCE_BOUND_POSITIVE_X_CURTAIN_NOT_DESIGNABLE_UNTIL_WET_TARGET_COMPONENT_CLOSURE' && curtain.source?.snapshot === rel(SNAPSHOT) && curtain.source.captureId === capture.captureId, 'curtain measurement 08 does not bind this source');
for (const trace of [trace500k, trace1m]) assert(trace.status === 'SOURCE_BOUND_EXTENDED_FLUID_TOPOLOGY_HELD_NO_RECEIVER_OR_ISOLATION_AUTHORITY' && trace.source?.snapshotRoot === rel(SNAPSHOT) && trace.source.captureId === capture.captureId, 'topology trace does not bind this source');
const shortTrace = trace500k.topologyTraces.extended; const longTrace = trace1m.topologyTraces.extended;
assert(shortTrace.capReached === true && shortTrace.component.cellCount === 500000, '500k trace is not the expected capped measurement');
assert(longTrace.capReached === false && longTrace.disposition === 'COMPONENT_REACHES_FINITE_ENVELOPE_BOUNDARY_TOPOLOGY_INCOMPLETE' && longTrace.component.cellCount === 718008, '1m trace did not establish the current un-capped escape-face result');
const boundaryByFace = longTrace.boundaryByFace;
assert(boundaryByFace.POSITIVE_X.cellCount > 0 && boundaryByFace.NEGATIVE_Z.cellCount > 0 && boundaryByFace.POSITIVE_Z.cellCount > 0, 'expected +X/-Z/+Z component escape faces are absent');
assert(boundaryByFace.NEGATIVE_X.cellCount === 0 && boundaryByFace.NEGATIVE_Y.cellCount === 0 && boundaryByFace.POSITIVE_Y.cellCount === 0, 'new escape direction requires a fresh plan rather than this minimal shell');
const currentBounds = longTrace.bounds;
const nextBounds = {
  minX: currentBounds.minX,
  maxX: chunkEnd(currentBounds.maxX + 1),
  minY: currentBounds.minY,
  maxY: currentBounds.maxY,
  minZ: chunkStart(currentBounds.minZ - 1),
  maxZ: chunkEnd(currentBounds.maxZ),
};
const currentColumns = chunkSpan(currentBounds); const nextColumns = chunkSpan(nextBounds);
const curtainTargets = curtain.narrowestMissingMeasurementContract.exactCurtainTargets;
const wetTargets = curtain.narrowestMissingMeasurementContract.exactWetTargetSubset;
assert(curtainTargets.cellCount === 5 && wetTargets.cellCount === 3, 'curtain measurement geometry drifted');
// The curtain resides in chunk (132,-25). A full-height 3x3 chunk ring is the
// smallest reproducible local update observation unit: it includes every
// immediate cardinal chunk neighbour while never claiming it proves full
// component closure. Any fluid reaching its boundary fails this local gate.
const updateEnvelope = { minX: 2096, maxX: 2143, minY: -64, maxY: 319, minZ: -416, maxZ: -369 };
const updateColumns = chunkSpan(updateEnvelope);
assert(updateColumns.minChunkX === 131 && updateColumns.maxChunkX === 133 && updateColumns.minChunkZ === -26 && updateColumns.maxChunkZ === -24 && updateColumns.chunkColumnCount === 9, 'local update envelope chunk geometry drifted');
const report = {
  schemaVersion: 1, id: 'MP05-B07-POSITIVE-X-COMPONENT-CLOSURE-MEASUREMENT-09', generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_COMPONENT_CLOSURE_MEASUREMENT_PLAN_REQUIRED_COMPONENT_EXITS_CURRENT_TRACE_SCOPE', mode: 'READ_ONLY_SOURCE_BOUND_NON_MUTATING', mutationAuthority: false,
  purpose: 'Defines the smallest current-source continuation of the uncapped fluid trace and the local water-update measurement envelope needed before the five-face +X curtain can become a finite containment design.',
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableRequiredMemberCount: capture.requiredMembers.length },
  bindings: { curtainMeasurement08: binding(CURTAIN), trace500k: binding(TRACE_500K), trace1m: binding(TRACE_1M) },
  observedTraceEscalation: {
    capped500k: { componentCells: shortTrace.component.cellCount, capReached: shortTrace.capReached, unexpandedFrontier: shortTrace.unexpandedCapFrontier },
    uncapped1m: { component: longTrace.component, capReached: longTrace.capReached, disposition: longTrace.disposition, escapeFaces: boundaryByFace },
    conclusion: 'The component no longer has a measurement-count cap at 718,008 observed cells, but it still exits the explicit trace box on exactly +X, -Z, and +Z. It is therefore beyond the current trace scope; finite containment is unproven.',
  },
  minimumImmutableCapture: {
    requirement: 'Use a fresh complete immutable save capture, never a partial region export, before repeating this measurement or compiling any future containment system.',
    currentCapture: { requiredMemberCount: capture.requiredMembers.length, captureManifestPath: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')) },
    reason: 'The component and every candidate water-update/rollback influence cell may cross arbitrary stored region files; a partial capture cannot establish an exact source or reverse state.',
  },
  nextComponentClosureTrace: {
    mode: 'READ_ONLY_ADAPTIVE_CONNECTED_COMPONENT_TRACE_NO_CELL_CAP',
    currentBounds, currentChunkColumns: currentColumns,
    nextMinimumBounds: nextBounds, nextChunkColumns: nextColumns,
    incrementalTraceVolumeCells: boxCells(nextBounds) - boxCells(currentBounds),
    selectionRule: 'Expand only +X, -Z, and +Z because those are the only uncapped 1m component escape faces. Preserve the existing -X and vertical limits because the component does not touch them. Recompute all six boundary contacts after this single combined shell; if any remain, derive the next shell from those fresh faces rather than extrapolating a fixed size.',
    completionRule: 'A trace is closure evidence only when it has no cell cap and zero component cells on all six explicit envelope faces. Otherwise it remains measurement-only and cannot provide a liner, receiver, overflow, or rollback design.',
  },
  localWaterUpdateEnvelope: {
    id: 'B07-POSITIVE-X-FIVE-FACE-UPDATE-ENVELOPE-09',
    curtainTargets, wetExteriorTargets: wetTargets,
    bounds: updateEnvelope, chunkColumns: updateColumns, volumeCells: boxCells(updateEnvelope),
    measurementSteps: [
      'Census every full-height source block state in the nine chunk columns, including waterlogged and bubble-column states, block entities, and saved entities.',
      'Trace connected fluid from all five curtain source/target pairings within this envelope. If the component touches any envelope face, mark local update topology incomplete; do not infer a zero-discharge curtain.',
      'In a non-live cloned-world measurement only, bind the exact server/game version and record the entire block-update change set for a hypothetical fully specified curtain. The replay is invalid unless every changed/influence cell is inside a complete component-closure scope.',
      'Require zero new B07-to-exterior crossings, no interaction-envelope preservation drift, and a reverse sequence that retains a complete barrier until the exact source fluid states can be restored.',
    ],
    failClosedRule: 'This local envelope is a reproducible update-observation unit, not proof that water propagation is bounded. Any wet, waterlogged, bubble, block-entity, saved-entity, or update effect on its exterior boundary expands the measurement; no operation may be derived from a boundary hit.',
  },
  explicitNonClaims: ['No live capture is performed here.', 'No water-update replay is performed here.', 'No liner, plug, curtain target, receiver, overflow/outlet, route, opening, public access, egress, operation, or mutation is selected.'],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="480" viewBox="0 0 1160 480"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:20px;font-weight:700}.m{font-size:14px;font-weight:700}.s{font-size:12px}.bad{fill:#b42318;font-weight:700}.ok{fill:#135f47;font-weight:700}</style><rect width="100%" height="100%" fill="#f8fafc"/><text class="h" x="30" y="36">MP05 B07 component-closure measurement plan 09</text><rect x="44" y="78" width="310" height="160" rx="10" fill="#eaf2f9" stroke="#6387a6"/><text class="m" x="62" y="108">Current uncapped trace</text><text class="s" x="62" y="135">718,008 observed component cells</text><text class="s" x="62" y="158">no count cap; not finite</text><text class="bad" x="62" y="184">escapes +X (${boundaryByFace.POSITIVE_X.cellCount.toLocaleString()})</text><text class="bad" x="62" y="205">escapes −Z (${boundaryByFace.NEGATIVE_Z.cellCount.toLocaleString()})</text><text class="bad" x="62" y="226">escapes +Z (${boundaryByFace.POSITIVE_Z.cellCount.toLocaleString()})</text><path d="M356 157 H446" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="452" y="78" width="310" height="160" rx="10" fill="#fff5df" stroke="#b7791f"/><text class="m" x="470" y="108">Smallest next trace shell</text><text class="s" x="470" y="135">x ${nextBounds.minX}..${nextBounds.maxX}</text><text class="s" x="470" y="158">y ${nextBounds.minY}..${nextBounds.maxY}</text><text class="s" x="470" y="181">z ${nextBounds.minZ}..${nextBounds.maxZ}</text><text class="s" x="470" y="204">${nextColumns.chunkColumnCount} chunk columns; +${(boxCells(nextBounds) - boxCells(currentBounds)).toLocaleString()} cells</text><text class="bad" x="470" y="226">repeat until zero boundary fluid</text><path d="M764 157 H854" stroke="#516579" stroke-width="4" marker-end="url(#a)"/><rect x="860" y="78" width="255" height="160" rx="10" fill="#edf7ee" stroke="#39724d"/><text class="m" x="878" y="108">Local update envelope</text><text class="s" x="878" y="135">five curtain targets</text><text class="s" x="878" y="158">3×3 chunk columns, full height</text><text class="s" x="878" y="181">${boxCells(updateEnvelope).toLocaleString()} cells</text><text class="s" x="878" y="204">record update influence only</text><text class="bad" x="878" y="226">boundary hit expands measure</text><line x1="44" y1="286" x2="1114" y2="286" stroke="#cbd5e1"/><text class="m" x="44" y="320">Capture / trace rule</text><text class="s" x="44" y="347">Capture the complete save; trace only the adaptive shell from exact observed component boundary faces.</text><text class="s" x="44" y="372">A local update measurement never substitutes for full component closure, and no live or clone-world replay occurs in this plan.</text><text class="bad" x="44" y="414">No containment/overflow design or operation exists until an uncapped trace has zero boundary contacts and the update/reverse evidence passes.</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#516579"/></marker></defs></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true }); fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-positive-x-component-closure-measurement-09.json')), `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b07-positive-x-component-closure-measurement-09.svg')), svg);
const markdown = `# MP05 B07 +X component-closure measurement plan 09\n\n**Status:** \`${report.status}\`  \n**Current source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine record:** [JSON](../../../${rel(path.join(OUT_DIR, 'mp05-b07-positive-x-component-closure-measurement-09.json'))})\n\n![Component-closure measurement map](../../../${rel(path.join(OUT_DIR, 'mp05-b07-positive-x-component-closure-measurement-09.svg'))})\n\nThe 500,000-cell trace hit its safety cap. The larger 1,000,000-cell measurement removed the count cap and observed **718,008** cells, but the component still reaches the explicit measurement boundary on +X, −Z, and +Z. This is proof that the component remains beyond the **current trace scope**, not a claim about unmeasured live state.\n\n## Smallest next trace scope\n\nTrace the complete current source across \`x=${nextBounds.minX}..${nextBounds.maxX}\`, \`y=${nextBounds.minY}..${nextBounds.maxY}\`, \`z=${nextBounds.minZ}..${nextBounds.maxZ}\`. It expands only the three observed escape directions, is chunk aligned, covers ${nextColumns.chunkColumnCount} chunk columns, and adds ${report.nextComponentClosureTrace.incrementalTraceVolumeCells.toLocaleString()} measured block positions. Recompute all six faces after the combined shell.\n\n## Five-face water-update measurement envelope\n\nThe local reproducible envelope is the full-height nine-column region \`x=${updateEnvelope.minX}..${updateEnvelope.maxX}\`, \`y=${updateEnvelope.minY}..${updateEnvelope.maxY}\`, \`z=${updateEnvelope.minZ}..${updateEnvelope.maxZ}\`. It measures update influence around the exact five current curtain targets, but cannot by itself prove component closure.\n\n${report.localWaterUpdateEnvelope.measurementSteps.map((step) => `- ${step}`).join('\n')}\n\nNo live capture, operation, liner, plug, receiver, overflow, route/opening state, public access, or egress is emitted.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true }); fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'mp05-b07-positive-x-component-closure-measurement-09.json')), markdown: rel(MARKDOWN), nextBounds, nextChunkColumns: nextColumns, updateEnvelope, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
