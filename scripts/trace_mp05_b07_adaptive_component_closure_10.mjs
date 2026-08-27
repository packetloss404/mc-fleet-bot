#!/usr/bin/env node
/**
 * MP05/B07 adaptive component-closure trace 10.
 *
 * Executes the plan-09 next trace only against its immutable source. The
 * queue is bounded by the explicit trace volume (not a component cell cap),
 * and every resulting boundary contact derives the next shell exactly. No
 * world connection, operation file, desired state, or simulation is used.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, STANDARD_CELL_PREAMBLE, cellKey, deriveB07WestTwo, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const abs = (filename) => path.resolve(ROOT, filename); const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const json = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8')); const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))) });
const name = (state) => state.split('[', 1)[0]; const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const chunkStart = (coordinate) => Math.floor(coordinate / 16) * 16; const chunkEnd = (coordinate) => chunkStart(coordinate) + 15;
const count = (bounds) => (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1) * (bounds.maxZ - bounds.minZ + 1);
const manifest = (cellCount, bounds, coordinateSetSha256) => ({ cellCount, bounds: cellCount ? bounds : null, coordinateSetSha256 });
const emptyHash = () => crypto.createHash('sha256').update(`${STANDARD_CELL_PREAMBLE}\n`).digest('hex');

const SNAPSHOT = option('--snapshot-root', 'data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z');
const PLAN = option('--measurement-plan', 'data/world-review/mp05-b07-positive-x-component-closure-measurement-09-post-20260828T041000Z/mp05-b07-positive-x-component-closure-measurement-09.json');
const CONTINUATION = option('--continuation-trace', '');
const MECHANISMS = option('--mechanisms', 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp05-b07-adaptive-component-closure-trace-10-post-20260828T041000Z');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-ADAPTIVE-COMPONENT-CLOSURE-TRACE-10-2026-08-28.md');
const GENERATED_AT = option('--generated-at', '2026-08-28T07:10:00.000Z');
const ID = option('--id', 'MP05-B07-ADAPTIVE-COMPONENT-CLOSURE-TRACE-10');
const REPORT_SLUG = option('--report-slug', 'mp05-b07-adaptive-component-closure-trace-10');

for (const filename of [path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'), path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'), PLAN, CONTINUATION, MECHANISMS].filter(Boolean)) assert(fs.existsSync(abs(filename)), `required input missing: ${filename}`);
const capture = json(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')); const plan = json(PLAN); const continuation = CONTINUATION ? json(CONTINUATION) : null; const mechanisms = json(MECHANISMS);
assert(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'complete immutable source required');
assert(plan.status === 'SOURCE_BOUND_COMPONENT_CLOSURE_MEASUREMENT_PLAN_REQUIRED_COMPONENT_EXITS_CURRENT_TRACE_SCOPE' && plan.source?.snapshot === rel(SNAPSHOT) && plan.source.captureId === capture.captureId && plan.mutationAuthority === false, 'measurement plan 09 is not bound to this exact source');
if (continuation) assert(continuation.status === 'SOURCE_BOUND_COMPONENT_ESCAPES_ADAPTIVE_TRACE_SCOPE_NEXT_BOUNDS_DERIVED' && continuation.source?.snapshot === rel(SNAPSHOT) && continuation.source.captureId === capture.captureId && continuation.mutationAuthority === false && continuation.result?.closureProved === false && continuation.result?.nextExactBounds, 'continuation trace is not an exact source-bound escape record');
const bounds = continuation ? continuation.result.nextExactBounds : plan.nextComponentClosureTrace.nextMinimumBounds; const total = count(bounds);
assert(Number.isSafeInteger(total) && total > 0 && total <= 30_000_000, 'trace envelope exceeds the explicit safe in-memory measurement limit');
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem); assert(b07.interaction.length === 13608, 'canonical B07 interaction drifted');
const dx = bounds.maxX - bounds.minX + 1; const dy = bounds.maxY - bounds.minY + 1; const plane = dx * dy;
const inside = (cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const encode = (cell) => (cell.x - bounds.minX) + dx * ((cell.y - bounds.minY) + dy * (cell.z - bounds.minZ));
const decode = (id) => { const zOffset = Math.floor(id / plane); const rem = id - zOffset * plane; const yOffset = Math.floor(rem / dx); return { x: bounds.minX + rem - yOffset * dx, y: bounds.minY + yOffset, z: bounds.minZ + zOffset }; };
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const seen = new Uint8Array(total); const queue = new Uint32Array(total); let head = 0; let tail = 0;
const stateCensus = new Map(); let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
const add = (cell, state) => { const id = encode(cell); if (seen[id]) return false; seen[id] = 1; queue[tail++] = id; stateCensus.set(state, (stateCensus.get(state) ?? 0) + 1); minX = Math.min(minX, cell.x); maxX = Math.max(maxX, cell.x); minY = Math.min(minY, cell.y); maxY = Math.max(maxY, cell.y); minZ = Math.min(minZ, cell.z); maxZ = Math.max(maxZ, cell.z); return true; };
for (const cell of b07.interaction) if (inside(cell)) { const state = await stateAt(cell); if (fluid(state)) add(cell, state); }
assert(tail > 0, 'no B07 fluid seed lies in the plan-09 trace envelope');
const directions = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
while (head < tail) {
  const current = decode(queue[head++]);
  for (const [ox, oy, oz] of directions) {
    const next = { x: current.x + ox, y: current.y + oy, z: current.z + oz };
    if (!inside(next) || seen[encode(next)]) continue;
    const state = await stateAt(next); if (fluid(state)) add(next, state);
  }
}
const componentBounds = { minX, maxX, minY, maxY, minZ, maxZ };
const digests = { ALL: crypto.createHash('sha256'), NEGATIVE_X: crypto.createHash('sha256'), POSITIVE_X: crypto.createHash('sha256'), NEGATIVE_Y: crypto.createHash('sha256'), POSITIVE_Y: crypto.createHash('sha256'), NEGATIVE_Z: crypto.createHash('sha256'), POSITIVE_Z: crypto.createHash('sha256') };
Object.values(digests).forEach((digest) => digest.update(`${STANDARD_CELL_PREAMBLE}\n`));
const faceCounts = { NEGATIVE_X: 0, POSITIVE_X: 0, NEGATIVE_Y: 0, POSITIVE_Y: 0, NEGATIVE_Z: 0, POSITIVE_Z: 0 };
const faceBounds = Object.fromEntries(Object.keys(faceCounts).map((direction) => [direction, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }]));
const hitFace = (direction, x, y, z, line) => { faceCounts[direction] += 1; digests[direction].update(line); const face = faceBounds[direction]; face.minX = Math.min(face.minX, x); face.maxX = Math.max(face.maxX, x); face.minY = Math.min(face.minY, y); face.maxY = Math.max(face.maxY, y); face.minZ = Math.min(face.minZ, z); face.maxZ = Math.max(face.maxZ, z); };
for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ, id = (x - bounds.minX) + dx * ((y - bounds.minY) + dy * (z - bounds.minZ)); z <= bounds.maxZ; z += 1, id += plane) {
  if (!seen[id]) continue; const line = `${x},${y},${z}\n`; digests.ALL.update(line);
  if (x === bounds.minX) hitFace('NEGATIVE_X', x, y, z, line);
  if (x === bounds.maxX) hitFace('POSITIVE_X', x, y, z, line);
  if (y === bounds.minY) hitFace('NEGATIVE_Y', x, y, z, line);
  if (y === bounds.maxY) hitFace('POSITIVE_Y', x, y, z, line);
  if (z === bounds.minZ) hitFace('NEGATIVE_Z', x, y, z, line);
  if (z === bounds.maxZ) hitFace('POSITIVE_Z', x, y, z, line);
}
const component = manifest(tail, componentBounds, digests.ALL.digest('hex'));
const faces = Object.fromEntries(Object.entries(faceCounts).map(([direction, cellCount]) => [direction, manifest(cellCount, cellCount ? faceBounds[direction] : null, cellCount ? digests[direction].digest('hex') : emptyHash())]));
const escapeDirections = Object.entries(faceCounts).filter(([, value]) => value > 0).map(([direction]) => direction);
const nextBounds = { ...bounds };
if (faceCounts.NEGATIVE_X) nextBounds.minX = chunkStart(bounds.minX - 1); if (faceCounts.POSITIVE_X) nextBounds.maxX = chunkEnd(bounds.maxX + 1);
if (faceCounts.NEGATIVE_Z) nextBounds.minZ = chunkStart(bounds.minZ - 1); if (faceCounts.POSITIVE_Z) nextBounds.maxZ = chunkEnd(bounds.maxZ + 1);
if (faceCounts.NEGATIVE_Y) nextBounds.minY = Math.max(-64, bounds.minY - 16); if (faceCounts.POSITIVE_Y) nextBounds.maxY = Math.min(319, bounds.maxY + 16);
const stateCounts = Object.fromEntries([...stateCensus.entries()].sort(([a], [b]) => a.localeCompare(b)));
const status = escapeDirections.length ? 'SOURCE_BOUND_COMPONENT_ESCAPES_ADAPTIVE_TRACE_SCOPE_NEXT_BOUNDS_DERIVED' : 'SOURCE_BOUND_COMPONENT_CLOSURE_PROVED_NO_CONTAINMENT_DESIGN_EMITTED';
const report = {
  schemaVersion: 1, id: ID, generatedAtUtc: GENERATED_AT, status, mode: 'READ_ONLY_SOURCE_BOUND_NON_MUTATING', mutationAuthority: false,
  purpose: `No-cell-cap connected-fluid trace of the exact ${continuation ? 'prior adaptive-trace continuation' : 'plan-09'} shell. Its only output is closure/escape evidence and, on escape, the next exact shell.`,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableRequiredMemberCount: capture.requiredMembers.length }, bindings: { measurementPlan09: binding(PLAN), ...(continuation ? { continuationTrace: binding(CONTINUATION) } : {}), mechanisms: binding(MECHANISMS) },
  trace: { bounds, volumeCells: total, component, stateCensus: stateCounts, componentBoundaryFaces: faces, escapeDirections, noComponentCellCap: true, queueCapacityEqualsTraceVolume: true },
  result: escapeDirections.length ? { closureProved: false, reason: `component reaches ${escapeDirections.join(', ')} face(s) of the explicit trace scope`, nextExactBounds: nextBounds, nextBoundsVolumeCells: count(nextBounds), nextRule: 'Capture a fresh complete immutable save and repeat an uncapped trace over exactly these derived bounds. Do not create a containment target until all six boundary face counts are zero.' } : { closureProved: true, qualification: 'Topology closure only. Receiver/overflow, block-state, water-update, inverse, protected-core, entity, and guarded-release requirements remain separate.' },
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
const faceLines = Object.entries(faceCounts).map(([face, value], index) => `<text x="${55 + (index % 3) * 320}" y="${230 + Math.floor(index / 3) * 36}" class="${value ? 'bad' : 'ok'}">${face}: ${value.toLocaleString()} ${value ? 'escape cells' : 'dry'}</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="370" viewBox="0 0 1100 370"><style>text{font-family:ui-monospace,monospace;fill:#172033}.h{font-size:20px;font-weight:700}.m{font-size:14px;font-weight:700}.s{font-size:12px}.bad{fill:#b42318;font-weight:700}.ok{fill:#135f47;font-weight:700}</style><rect width="100%" height="100%" fill="#f8fafc"/><text class="h" x="32" y="36">${ID.toLowerCase().replaceAll('-', ' ')}</text><rect x="45" y="73" width="360" height="115" rx="10" fill="#eaf2f9" stroke="#6387a6"/><text class="m" x="63" y="104">Uncapped immutable trace</text><text class="s" x="63" y="131">${component.cellCount.toLocaleString()} component cells / ${total.toLocaleString()} measured positions</text><text class="s" x="63" y="154">bounds x=${bounds.minX}..${bounds.maxX}, y=${bounds.minY}..${bounds.maxY}, z=${bounds.minZ}..${bounds.maxZ}</text><text class="s" x="63" y="177">no live call · no operation · no target state</text><rect x="458" y="73" width="600" height="115" rx="10" fill="#fff5df" stroke="#b7791f"/><text class="m" x="476" y="104">Result</text><text class="${escapeDirections.length ? 'bad' : 'ok'}" x="476" y="132">${escapeDirections.length ? `ESCAPES: ${escapeDirections.join(', ')}` : 'CLOSED: no boundary fluid'}</text><text class="s" x="476" y="156">${escapeDirections.length ? `next bounds x=${nextBounds.minX}..${nextBounds.maxX}, y=${nextBounds.minY}..${nextBounds.maxY}, z=${nextBounds.minZ}..${nextBounds.maxZ}` : 'topology only; no design authority'}</text><text class="s" x="476" y="177">coordinate set SHA-256 ${component.coordinateSetSha256.slice(0, 18)}…</text><line x1="45" y1="208" x2="1058" y2="208" stroke="#cbd5e1"/>${faceLines}<text class="bad" x="55" y="330">No containment/overflow design, water-update replay, route/opening, public access, egress, or operation is emitted.</text></svg>\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true }); fs.writeFileSync(abs(path.join(OUT_DIR, `${REPORT_SLUG}.json`)), `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(abs(path.join(OUT_DIR, `${REPORT_SLUG}.svg`)), svg);
const markdown = `# ${ID.replaceAll('-', ' ')}\n\n**Status:** \`${report.status}\`  \n**Source:** \`${report.source.snapshot}\` (capture \`${capture.captureId}\`)  \n**Machine record:** [JSON](../../../${rel(path.join(OUT_DIR, `${REPORT_SLUG}.json`))})\n\n![Adaptive component trace map](../../../${rel(path.join(OUT_DIR, `${REPORT_SLUG}.svg`))})\n\nThe exact ${continuation ? 'prior adaptive-trace continuation' : 'plan-09'} shell was traced with no component cell cap. It observed **${component.cellCount.toLocaleString()}** connected fluid-bearing cells in **${total.toLocaleString()}** measured positions.\n\n${escapeDirections.length ? `The component reaches **${escapeDirections.join(', ')}** boundary face(s). The exact next trace bounds are \`x=${nextBounds.minX}..${nextBounds.maxX}\`, \`y=${nextBounds.minY}..${nextBounds.maxY}\`, \`z=${nextBounds.minZ}..${nextBounds.maxZ}\`. Closure is not proved.` : 'The component does not touch any trace boundary. This proves topology closure only and does not create containment design authority.'}\n\nNo live-world call, operation, target state, liner, receiver, overflow, route/opening, public access, egress, or mutation is emitted.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true }); fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status, report: rel(path.join(OUT_DIR, `${REPORT_SLUG}.json`)), markdown: rel(MARKDOWN), componentCells: component.cellCount, escapeDirections, nextBounds: escapeDirections.length ? nextBounds : null, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
