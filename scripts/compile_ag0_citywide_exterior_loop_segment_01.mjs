#!/usr/bin/env node
/**
 * AG-0 compiler: choose the first finite, source-proven dry exterior-loop
 * survey slice.  It emits survey evidence only—never a block operation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const argv = process.argv.slice(2);
const opt = (flag, fallback) => { const i = argv.indexOf(flag); return i < 0 ? fallback : argv[i + 1] ?? fallback; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp05-b07-surface-receiver-descent-fixed-lighting-01-post-20260828T020000Z');
const CONCEPT = opt('--concept', 'data/world-review/citywide-surface-loop-network-01-post-20260828T020000Z/citywide-surface-loop-network-01.json');
const OUT = opt('--out', 'data/world-review/ag0-citywide-exterior-loop-segment-01-20260828T083000Z');
const GENERATED = opt('--generated-at', '2026-08-28T08:30:00.000Z');
const GEOMETRY_ONLY_REBIND = argv.includes('--geometry-only-rebind');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const fail = (condition, message) => { if (!condition) throw new Error(`AG-0 citywide exterior loop rejected: ${message}`); };
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex'); const fileSha = (value) => sha(fs.readFileSync(abs(value)));
const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const vegetation = new Set(['minecraft:grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:vine', 'minecraft:leaf_litter']);
const name = (state) => state.split('[', 1)[0]; const isFluid = (state) => fluid.has(name(state)) || state.includes('waterlogged=true');
const cells = (bounds) => { const out = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) out.push({ x, y, z }); return out; };
const flat = (bounds) => cells({ ...bounds, minY: 0, maxY: 0 }).map(({ x, z }) => ({ x, z }));
const hashCells = (items) => sha(items.map(({ x, y, z }) => `${x},${y},${z}`).sort().join('\n'));
const census = (items, key = (item) => item.state) => Object.fromEntries([...items.reduce((m, item) => m.set(key(item), (m.get(key(item)) ?? 0) + 1), new Map()).entries()].sort());
const snapshotRoot = abs(SNAPSHOT); const outRoot = abs(OUT); const concept = JSON.parse(fs.readFileSync(abs(CONCEPT), 'utf8'));
if (fs.existsSync(outRoot)) throw new Error(`out must be fresh: ${OUT}`);
for (const item of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, item)), `incomplete source: ${item}`);
const capture = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json'), 'utf8'));
fail(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'requires a complete immutable source');
fail(concept.status === 'SOURCE_BOUND_CONCEPT_NETWORK_SURVEY_ONLY', 'requires the exterior-loop concept');
const conceptMatchesSource = concept.source.snapshot === rel(SNAPSHOT) && concept.source.captureId === capture.captureId;
fail(conceptMatchesSource || GEOMETRY_ONLY_REBIND, 'concept and supplied source do not bind; use explicit --geometry-only-rebind only to re-survey its coordinate/protected-boundary geometry on a fresh immutable source');
const reader = new AnvilReader(path.join(snapshotRoot, 'region')); const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities')); const cached = new Map();
const at = async (cell) => { const k = cellKey(cell); if (!cached.has(k)) cached.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cached.get(k); };
const top = async (x, z) => { for (let y = 256; y >= -64; y -= 1) { const state = await at({ x, y, z }); if (!air.has(name(state))) return { x, y, z, state }; } return { x, y: null, z, state: null }; };
const inBounds = (point, bounds) => point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;

// The loop is a perimeter concept. For a north edge, the complete 23-block
// module must be placed away from the protected catalog, i.e. toward -Z. This
// prevents a centreline-only 64-block clearance from silently consuming it.
const slices = [];
for (const segment of concept.design.rail.segments) {
  const [x1, z1] = segment.from; const [x2, z2] = segment.to;
  const dx = Math.sign(x2 - x1); const dz = Math.sign(z2 - z1); const length = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
  for (let offset = 0; offset + 15 <= length; offset += 16) {
    const start = { x: x1 + dx * offset, z: z1 + dz * offset }; const end = { x: start.x + dx * 15, z: start.z + dz * 15 };
    // Outward lateral direction for the rectangular exterior loop.
    const lateral = z1 === z2 ? (z1 < 0 ? { x: 0, z: -1 } : { x: 0, z: 1 }) : (x1 < 0 ? { x: -1, z: 0 } : { x: 1, z: 0 });
    const all = []; for (let run = 0; run < 16; run += 1) for (let side = 0; side < 23; side += 1) all.push({ x: start.x + dx * run + lateral.x * side, z: start.z + dz * run + lateral.z * side });
    const xs = all.map(({ x }) => x), zs = all.map(({ z }) => z);
    slices.push({ id: `${segment.id}-AG0-${String(offset).padStart(4, '0')}`, parentSegment: segment.id, start, end, direction: { dx, dz }, lateral, footprint: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }, centrelineCells: Array.from({ length: 16 }, (_, run) => ({ x: start.x + dx * run, z: start.z + dz * run })) });
  }
}
const protectedAreas = concept.protectedInterfaces;
const inspectSlice = async (candidate) => {
  const footprint = flat(candidate.footprint); const haloBounds = { minX: candidate.footprint.minX - 1, maxX: candidate.footprint.maxX + 1, minZ: candidate.footprint.minZ - 1, maxZ: candidate.footprint.maxZ + 1 };
  const protectedHits = footprint.flatMap((point) => protectedAreas.filter(({ bounds }) => inBounds(point, bounds)).map(({ id }) => ({ ...point, id })));
  if (protectedHits.length) return { candidate, status: 'REJECTED_PROTECTED_INTERFACE', protectedHits };
  const surface = await Promise.all(footprint.map(({ x, z }) => top(x, z)));
  const sourceUnknown = surface.filter(({ state }) => state === null); const surfaceFluids = surface.filter(({ state }) => state && isFluid(state));
  if (sourceUnknown.length || surfaceFluids.length) return { candidate, status: 'REJECTED_NO_SURFACE_OR_FLUID', surface, sourceUnknown, surfaceFluids };
  const deckY = Math.max(...surface.map(({ y }) => y)) + 8;
  const halo = await Promise.all(flat(haloBounds).map(async ({ x, z }) => top(x, z)));
  const haloUnknown = halo.filter(({ state }) => state === null); const haloFluids = halo.filter(({ state }) => state && isFluid(state));
  if (haloUnknown.length || haloFluids.length) return { candidate, status: 'REJECTED_HYDROLOGY_HALO', surface, halo, haloUnknown, haloFluids };
  // Three 3×3 pier bearing pads at 0, 8, and 15 of the finite 16-block span.
  const mid = { x: Math.round((candidate.footprint.minX + candidate.footprint.maxX) / 2), z: Math.round((candidate.footprint.minZ + candidate.footprint.maxZ) / 2) };
  const pierCentres = [0, 8, 15].map((run) => ({ x: candidate.start.x + candidate.direction.dx * run + candidate.lateral.x * 11, z: candidate.start.z + candidate.direction.dz * run + candidate.lateral.z * 11 }));
  const foundation = []; const foundationProblems = [];
  for (const centre of pierCentres) for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const x = centre.x + dx, z = centre.z + dz; let bearing = null;
    for (let y = 256; y >= -64; y -= 1) { const state = await at({ x, y, z }); const block = name(state); if (air.has(block) || isFluid(state) || gravity.has(block) || block.endsWith('_leaves') || vegetation.has(block)) continue; bearing = { x, y, z, state }; break; }
    if (!bearing) { foundationProblems.push({ x, z, reason: 'NO_STABLE_BEARING' }); continue; }
    const depth = []; for (let d = 0; d < 5; d += 1) { const cell = { x, y: bearing.y - d, z }; const state = await at(cell); depth.push({ ...cell, state }); if (air.has(name(state)) || isFluid(state) || gravity.has(name(state))) foundationProblems.push({ ...cell, state, reason: 'UNSTABLE_FOUNDATION_CHAIN' }); }
    foundation.push({ centre, bearing, depth });
  }
  if (foundationProblems.length) return { candidate, status: 'REJECTED_FOUNDATION', surface, halo, deckY, foundation, foundationProblems };
  const airEnvelope = []; const envelopeProblems = [];
  for (const { x, z } of footprint) for (let y = deckY; y <= deckY + 6; y += 1) { const state = await at({ x, y, z }); airEnvelope.push({ x, y, z, state }); if (!air.has(name(state))) envelopeProblems.push({ x, y, z, state }); }
  if (envelopeProblems.length) return { candidate, status: 'REJECTED_ABOVE_GROUND_ENVELOPE_OCCUPIED', surface, halo, deckY, foundation, airEnvelope, envelopeProblems };
  const chunkIds = [...new Set(flat(haloBounds).map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]; const blockEntities = []; const entities = [];
  for (const chunkId of chunkIds) { const [cx, cz] = chunkId.split(',').map(Number); const chunk = await reader.chunk(cx, cz); for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(be.x), y: Number(be.y), z: Number(be.z) }; if (inBounds(cell, haloBounds) && cell.y >= -64 && cell.y <= deckY + 6) blockEntities.push({ cell, id: be.id ?? be.Id ?? null }); }
    const entityChunk = await entityReader.chunk(cx, cz); for (const entity of entityChunk?.Entities ?? []) { if (!Array.isArray(entity.Pos)) continue; const position = entity.Pos.map(Number); const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) }; if (inBounds(cell, haloBounds) && cell.y >= -64 && cell.y <= deckY + 6) entities.push({ cell, id: entity.id ?? entity.Id ?? null, position }); }
  }
  if (blockEntities.length || entities.length) return { candidate, status: 'REJECTED_ENTITY_OR_CONTAINER', surface, halo, deckY, foundation, airEnvelope, blockEntities, entities };
  return { candidate, status: 'VALID_FINITE_AG0_SURVEY', surface, halo, deckY, foundation, airEnvelope, blockEntities, entities, mid };
};

const conceptScreen = new Map(concept.exteriorTerrainScreen.samples.map((sample) => [`${sample.x},${sample.z}`, sample]));
const rejected = []; let selected = null;
for (const candidate of slices) {
  // The concept's own immutable-source 16-block screen lets AG-0 reject an
  // obvious fluid/no-surface start without pretending that it is a full-width
  // clearance result. Full exact 23-wide inspection still occurs for every
  // screen-solid candidate in order.
  const screen = conceptScreen.get(`${candidate.start.x},${candidate.start.z}`);
  if (!screen || screen.kind !== 'solid-surface') {
    rejected.push({ id: candidate.id, parentSegment: candidate.parentSegment, status: screen?.kind === 'fluid-surface' ? 'REJECTED_CONCEPT_SCREEN_FLUID' : 'REJECTED_CONCEPT_SCREEN_NO_SURFACE', blockerCounts: { protected: 0, noSurface: screen?.kind === 'no-observed-surface' || !screen ? 1 : 0, surfaceFluid: screen?.kind === 'fluid-surface' ? 1 : 0, haloNoSurface: 0, haloFluid: 0, foundation: 0, envelope: 0, blockEntities: 0, entities: 0 } });
    continue;
  }
  const examined = await inspectSlice(candidate); if (examined.status === 'VALID_FINITE_AG0_SURVEY') { selected = examined; break; } rejected.push({ id: candidate.id, parentSegment: candidate.parentSegment, status: examined.status, blockerCounts: { protected: examined.protectedHits?.length ?? 0, noSurface: examined.sourceUnknown?.length ?? 0, surfaceFluid: examined.surfaceFluids?.length ?? 0, haloNoSurface: examined.haloUnknown?.length ?? 0, haloFluid: examined.haloFluids?.length ?? 0, foundation: examined.foundationProblems?.length ?? 0, envelope: examined.envelopeProblems?.length ?? 0, blockEntities: examined.blockEntities?.length ?? 0, entities: examined.entities?.length ?? 0 } });
}
const source = { root: rel(SNAPSHOT), captureId: capture.captureId, completeSaveCaptureSha256: fileSha(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), concept: { path: rel(CONCEPT), sha256: fileSha(CONCEPT), sourceBinding: conceptMatchesSource ? 'SAME_SOURCE' : 'GEOMETRY_AND_PROTECTED_BOUNDARY_REBOUND_ON_FRESH_SOURCE_ONLY', previousSnapshot: concept.source.snapshot, previousCaptureId: concept.source.captureId } };
const base = { schemaVersion: 1, id: 'AG-0-CITYWIDE-EXTERIOR-LOOP-SEGMENT-01', generatedAtUtc: GENERATED, readOnly: true, mutationAuthority: false, operationsCompiled: 0, forwardOperations: [], rollbackOperations: [], worldMutationPerformed: false, source, surveyRules: { module: '23-wide exterior double-track / protected path / separate gallery standard', finiteLength: 16, rejects: ['fluid or waterlogged surface/halo', 'no observed surface', 'protected catalog interface', 'unstable pier bearing', 'occupied elevated envelope', 'saved entity or block entity/container'] }, rejectedCandidates: rejected };
let report;
if (!selected) report = { ...base, status: 'AG0_HOLD_NO_SAFE_FINITE_EXTERIOR_LOOP_SEGMENT', selectedCandidate: null, preciseBlocker: 'Every finite candidate slice reached a source-proven reject condition. No target or operation was fabricated.' };
else {
  const { candidate, surface, halo, deckY, foundation, airEnvelope, blockEntities, entities } = selected;
  report = { ...base, status: 'AG0_PASS_FINITE_EXTERIOR_LOOP_SEGMENT_SOURCE_BOUND_SURVEY_ONLY', selectedCandidate: { id: candidate.id, parentSegment: candidate.parentSegment, start: candidate.start, end: candidate.end, direction: candidate.direction, outwardLateral: candidate.lateral, footprint: candidate.footprint, centrelineCells: candidate.centrelineCells, ownership: { owner: 'AG0_EXTERIOR_LOOP_SURVEY_STEWARD', counterpart: null, disposition: 'outside all catalog-protected interfaces; no town/gate/road seam selected' } }, terrain: { footprintSurfaceCells: surface, surfaceStateCensus: census(surface), minimumSurfaceY: Math.min(...surface.map(({ y }) => y)), maximumSurfaceY: Math.max(...surface.map(({ y }) => y)), selectedDeckY: deckY, clearanceAboveHighestSurface: 8, exactCoordinateSetSha256: hashCells(surface) }, hydrology: { oneCellHaloSurfaceCells: halo, haloStateCensus: census(halo), fluidCells: [], waterloggedCells: [], noObservedSurfaceCells: [] }, foundation: { pierCentres: foundation.map(({ centre }) => centre), bearingAndFiveDeepChains: foundation, exactBearingCoordinateSetSha256: hashCells(foundation.flatMap(({ depth }) => depth)), allStable: true }, elevatedEnvelope: { bounds: { minX: candidate.footprint.minX, maxX: candidate.footprint.maxX, minY: deckY, maxY: deckY + 6, minZ: candidate.footprint.minZ, maxZ: candidate.footprint.maxZ }, cellCount: airEnvelope.length, requiredCurrentState: 'minecraft:air', occupiedCells: [] }, interaction: { savedBlockEntities: blockEntities, savedEntities: entities, protectedInterfaceHits: [] }, nextGate: { AG1AllowedByThisArtifact: false, requiredBeforeAnyAG1: ['fresh immediate source recapture and re-run of AG-0', 'exact pier/deck/containment owner and counterpart assignment', 'canonical target/rollback states', 'fluid/erosion treatment if later source changes', 'strict guarded release kernel'] }, nonClaims: ['No alignment release, operation, block target, pier, deck, rail, promenade, station, turnout, loop, public access, or passenger service is authorized.'] };
}
report.identitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
const map = selected ? `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><style>.b{fill:#101827}.t{fill:#f8fafc;font:700 24px system-ui}.s{fill:#cbd5e1;font:14px system-ui}.g{fill:#334155;stroke:#94a3b8}.p{fill:#22c55e}.r{fill:#e5e7eb}.f{fill:#a78bfa}.n{fill:#f8fafc;font:12px ui-monospace,monospace}</style><rect class="b" width="1200" height="720"/><text x="42" y="42" class="t">AG-0 selected exterior-loop survey slice: ${selected.candidate.id}</text><text x="42" y="67" class="s">16 blocks long × 23 module width · exact source surface/foundation evidence · no target states</text><rect x="70" y="120" width="640" height="460" class="g"/>${Array.from({ length: 16 }, (_, i) => `<line x1="${90 + i * 37}" y1="150" x2="${90 + i * 37}" y2="540" stroke="#64748b"/>`).join('')}${Array.from({ length: 23 }, (_, i) => `<line x1="90" y1="${150 + i * 17}" x2="645" y2="${150 + i * 17}" stroke="#475569"/>`).join('')}<rect x="90" y="150" width="555" height="102" fill="#475569" opacity=".75"/><rect x="90" y="252" width="555" height="85" class="p" opacity=".75"/><rect x="90" y="337" width="555" height="34" fill="#f59e0b"/><rect x="90" y="371" width="555" height="169" class="r" opacity=".7"/>${selected.foundation.map(({ centre }) => `<circle cx="${90 + (Math.abs(centre.x - selected.candidate.start.x) + Math.abs(centre.z - selected.candidate.start.z)) * 37}" cy="345" r="11" class="f"/>`).join('')}<text x="735" y="145" class="t" style="font-size:19px">Bounded evidence</text><text x="735" y="190" class="n">footprint: ${selected.surface.length} top-surface cells</text><text x="735" y="216" class="n">hydrology halo: ${selected.halo.length} cells · dry</text><text x="735" y="242" class="n">deck reference Y=${selected.deckY}; +8 above high surface</text><text x="735" y="268" class="n">3 × 3×3 stable pier pads; 5-deep chains</text><text x="735" y="294" class="n">elevated envelope: ${selected.airEnvelope.length} known-air cells</text><text x="735" y="320" class="n">protected / entity / container: 0 / 0 / 0</text><text x="735" y="375" class="s">Green = protected walking path lane</text><text x="735" y="401" class="s">Grey = separate gallery / rail allocation</text><text x="735" y="427" class="s">Purple = pier-bearing survey positions</text><text x="735" y="485" class="s">AG-0 only: no deck, rail, or path target</text><text x="735" y="508" class="s">has been selected or authorized.</text></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320"><rect width="100%" height="100%" fill="#101827"/><text x="40" y="65" fill="#f8fafc" font-size="26" font-family="system-ui">AG-0 exterior-loop survey: no safe finite slice</text><text x="40" y="105" fill="#fecaca" font-size="17" font-family="system-ui">Every exact candidate reached a source-proven reject condition; no target or operation was emitted.</text></svg>`;
fs.mkdirSync(outRoot, { recursive: true }); fs.writeFileSync(path.join(outRoot, 'ag0-citywide-exterior-loop-segment-01.json'), `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(path.join(outRoot, 'ag0-citywide-exterior-loop-segment-01.svg'), `${map}\n`);
fs.writeFileSync(path.join(outRoot, 'AG0-CITYWIDE-EXTERIOR-LOOP-SEGMENT-01.md'), `# AG-0 citywide exterior-loop finite segment survey\n\n**Status:** \`${report.status}\`  \n**Mode:** exact source-bound survey only; no operation or mutation authority.\n\n![AG-0 survey map](ag0-citywide-exterior-loop-segment-01.svg)\n\n${selected ? `The earliest finite slice that passed every survey rule is \`${selected.candidate.id}\` on \`${selected.candidate.parentSegment}\`, from (${selected.candidate.start.x}, ${selected.candidate.start.z}) to (${selected.candidate.end.x}, ${selected.candidate.end.z}). It binds ${selected.surface.length} dry footprint surface cells, ${selected.halo.length} dry hydrology-halo cells, three stable 3×3 pier pads with five-deep bearing chains, and ${selected.airEnvelope.length} known-air cells in the future elevated envelope. It intersects no protected catalog interface and has no saved entity or block entity/container.\n\nThis does not select target block states or authorize AG-1. A fresh immediate recapture and a dedicated owned pier/deck package remain required.` : `No finite exterior-loop slice passes the current exact survey rules. The rejection table in the JSON records each local blocker; no target state or release was fabricated.`}\n\n## Non-claims\n\nNo rail, promenade, pier, deck, station, turnout, terminal loop, public access, or passenger service is built or authorized.\n`);
console.log(JSON.stringify({ status: report.status, mutationAuthority: false, operationsCompiled: 0, selectedCandidate: report.selectedCandidate?.id ?? null, rejectedCandidateCount: rejected.length, out: rel(OUT) }, null, 2));
