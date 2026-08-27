#!/usr/bin/env node
/** Independent read-only post-state QA for MP11/BKR C01 independent return. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const MANIFEST = option('--manifest', 'data/buildops/mp11-bkr-c01-independent-return-01-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-independent-return-01.manifest.json');
const SNAPSHOT = option('--snapshot', '');
const OUT = option('--out', '');
const PROJECT_SOURCE = args.includes('--project-source');
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP11/BKR C01 return QA rejected: ${message}`); };
const key = (c) => `${c.x},${c.y},${c.z}`;
const blockName = (state) => state.split('[', 1)[0];
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(blockName(state)) || blockName(state).endsWith('_concrete_powder');
fail(SNAPSHOT, '--snapshot is required and must be an immutable post snapshot (or use --project-source only for offline QA)');
fail(OUT, '--out is required and must be fresh');
const manifestPath = abs(MANIFEST); const manifestBytes = fs.readFileSync(manifestPath); const manifest = JSON.parse(manifestBytes);
fail(manifest.id === 'MP11-BKR-C01-INDEPENDENT-RETURN-01' && manifest.mutationAuthority === false, 'invalid offline manifest');
const snapshotRoot = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `missing immutable snapshot member ${member}`);
const capture = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json'), 'utf8')); fail(capture.immutableCopy === true, 'QA snapshot is not immutable');
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const canonical = manifest.target.allCanonicalPostStates;
const projected = new Map(canonical.map((r) => [key(r.cell), r.targetState]));
async function stateAt(cell) { return PROJECT_SOURCE && projected.has(key(cell)) ? projected.get(key(cell)) : stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)); }
const canonicalMismatches = [];
for (const record of canonical) { const actual = await stateAt(record.cell); if (actual !== record.targetState) canonicalMismatches.push({ cell: record.cell, expected: record.targetState, actual }); }
const contractPath = abs(manifest.source.contract.path); const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const feasibilityPath = abs(contract.source.feasibility.path); const feasibility = JSON.parse(fs.readFileSync(feasibilityPath, 'utf8'));
const stations = feasibility.feasibility.stations.map(([x, y, z]) => ({ x, y, z }));
const pathFailures = [];
for (const direction of ['forward', 'reverse']) {
  const ordered = direction === 'forward' ? stations : stations.slice().reverse();
  for (let i = 0; i < ordered.length; i += 1) {
    const p = ordered[i];
    const [feet, head, upper, support] = await Promise.all([stateAt(p), stateAt({ x: p.x, y: p.y + 1, z: p.z }), stateAt({ x: p.x, y: p.y + 2, z: p.z }), stateAt({ x: p.x, y: p.y - 1, z: p.z })]);
    if (!air(feet) || !air(head) || !air(upper) || air(support) || fluid(support) || gravity(support)) pathFailures.push({ direction, index: i, station: p, feet, head, upper, support });
    if (i > 0) { const previous = ordered[i - 1]; const horizontal = Math.abs(p.x - previous.x) + Math.abs(p.z - previous.z); if (horizontal !== 1 || Math.abs(p.y - previous.y) > 1) pathFailures.push({ direction, index: i, transition: [previous, p] }); }
  }
}
const haloFailures = [];
for (const cell of manifest.safety.interactionHaloCells) { const state = await stateAt(cell); if (fluid(state) || gravity(state)) haloFailures.push({ cell, state }); }
const entityFailures = [];
const halo = new Set(manifest.safety.interactionHaloCells.map(key));
const haloCells = manifest.safety.interactionHaloCells; const minX = Math.min(...haloCells.map((c) => c.x)); const maxX = Math.max(...haloCells.map((c) => c.x)); const minZ = Math.min(...haloCells.map((c) => c.z)); const maxZ = Math.max(...haloCells.map((c) => c.z));
for (let cx = Math.floor(minX / 16); cx <= Math.floor(maxX / 16); cx += 1) for (let cz = Math.floor(minZ / 16); cz <= Math.floor(maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz); for (const e of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(e.x), y: Number(e.y), z: Number(e.z) }; if (halo.has(key(cell))) entityFailures.push({ kind: 'block_entity', cell, id: String(e.id ?? 'unknown') }); }
  const entityChunk = await entityReader.chunk(cx, cz); for (const e of entityChunk?.Entities ?? entityChunk?.entities ?? []) { if (!Array.isArray(e.Pos) || e.Pos.length < 3) continue; const cell = { x: Math.floor(Number(e.Pos[0])), y: Math.floor(Number(e.Pos[1])), z: Math.floor(Number(e.Pos[2])) }; if (halo.has(key(cell))) entityFailures.push({ kind: 'saved_entity', cell, id: String(e.id ?? e.Id ?? 'unknown') }); }
}
const pass = canonicalMismatches.length === 0 && pathFailures.length === 0 && haloFailures.length === 0 && entityFailures.length === 0;
const result = { schemaVersion: 1, id: 'MP11-BKR-C01-INDEPENDENT-RETURN-01-POST-QA', status: pass ? (PROJECT_SOURCE ? 'PROJECTED_QA_PASS_NOT_POST_RELEASE' : 'POST_RELEASE_QA_PASS') : 'POST_RELEASE_QA_FAIL', mutationAuthority: false, qaMode: PROJECT_SOURCE ? 'PROJECTED_SOURCE_OVERLAY_ONLY' : 'IMMUTABLE_POST_SNAPSHOT', source: { manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), snapshot: rel(SNAPSHOT), snapshotCaptureId: capture.captureId }, checks: { canonicalPostStateCount: canonical.length, canonicalMismatches, directedNormalWalk: { stationCount: stations.length, directions: 2, failures: pathFailures }, dryGravityFreeHalo: { cellCount: haloCells.length, failures: haloFailures }, blockEntityExclusion: { failures: entityFailures }, freshLiveEntityClearanceStillRequiredBeforeAnyExecution: true, protectedCoreReviewStillRequiredBeforeAnyExecution: true }, nonClaims: ['Read-only QA; no RCON call or world mutation.', 'Projected QA is not post-release evidence.', 'This artifact does not authorize execution, opening, or commissioning.'] };
fail(!fs.existsSync(abs(OUT)), '--out must be fresh'); fs.mkdirSync(abs(OUT), { recursive: true }); const outPath = path.join(abs(OUT), 'mp11-bkr-c01-independent-return-01-post-qa.json'); fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, out: rel(outPath), canonicalMismatches: canonicalMismatches.length, pathFailures: pathFailures.length, haloFailures: haloFailures.length, entityFailures: entityFailures.length, mutationAuthority: false }, null, 2));
if (!pass) process.exitCode = 2;
