#!/usr/bin/env node
/**
 * Compile MP06-APPROACH-CONTINUITY-01.
 *
 * A deliberately narrow repair of the only longest contiguous *actual delta*
 * in the current edge2 census: the north pedestrian strip alongside the
 * existing ramp at x=-316..-310, z=-505..-504.  It connects the existing road
 * pavement at (-316,69,-503) to (-309,72,-503) without a jump; the side strip
 * follows the same 69/70/70/70/71/71/71 grade.  Existing concrete is never
 * re-emitted as a no-op, which is why this is not the misleading 182-cell
 * probe result.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp06-approach-condition-20260826T042200Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp06-approach-continuity-01');
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (m) => { throw new Error(`MP06 continuity compiler rejected: ${m}`); };
const block = (s) => s.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PLANT = new Set(['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy', 'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower', 'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern']);
const REPLACEABLE = new Set([...AIR, ...PLANT, 'minecraft:grass_block', 'minecraft:dirt', 'minecraft:sand', 'minecraft:gravel', 'minecraft:dirt_path']);
const NON_COLLIDING = new Set([...AIR, ...PLANT, 'minecraft:torch', 'minecraft:wall_torch', 'minecraft:redstone_torch', 'minecraft:snow', 'minecraft:red_carpet', 'minecraft:blue_carpet', 'minecraft:white_carpet', 'minecraft:yellow_carpet']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame', 'minecraft:bell']);
const isVoid = (s) => AIR.has(block(s)) || PLANT.has(block(s));
const isFluid = (s) => FLUID.has(block(s)) || s.includes('waterlogged=true');
const isForbidden = (s) => FORBIDDEN.has(block(s)) || block(s).endsWith('_shulker_box');
const isSolid = (s) => !isVoid(s) && !isFluid(s) && !isForbidden(s);
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const at = async (p) => { const k = cellKey(p); if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(p.x, p.y, p.z))); return cache.get(k); };
const grade = [69, 70, 70, 70, 71, 71, 71];
const deck = [];
for (let i = 0; i < grade.length; i += 1) for (const z of [-505, -504]) deck.push({ x: -316 + i, y: grade[i], z });
const routePoints = [[-316, 70, -503], [-316, 70, -504], [-315, 71, -504], [-314, 71, -504], [-313, 71, -504], [-312, 72, -504], [-311, 72, -504], [-310, 72, -504], [-309, 73, -503]];
const support = [];
for (const p of deck) {
  const source = await at(p); if (!REPLACEABLE.has(block(source))) fail(`target is not an actual replaceable delta at ${cellKey(p)}: ${source}`);
  for (const yy of [p.y + 1, p.y + 2]) { const h = await at({ x: p.x, y: yy, z: p.z }); if (!NON_COLLIDING.has(block(h)) || isFluid(h)) fail(`headroom obstructed at ${p.x},${yy},${p.z}: ${h}`); }
  let depth = 0;
  for (let y = p.y - 1; y >= p.y - 4; y -= 1) {
    const q = { x: p.x, y, z: p.z }; const s = await at(q);
    if (!isVoid(s)) { if (!isSolid(s)) fail(`unsafe support base at ${cellKey(q)}: ${s}`); break; }
    depth += 1; support.push({ cell: q, sourceState: s, targetState: 'minecraft:stone', role: 'support-fill' });
    if (depth > 3) fail(`support exceeds depth 3 at ${cellKey(p)}`);
  }
  if (depth === 4) fail(`no solid base in bounded depth at ${cellKey(p)}`);
}
const ops = [...support, ...deck.map((cell) => ({ cell, sourceState: cache.get(cellKey(cell)), targetState: 'minecraft:gray_concrete', role: 'pedestrian-continuity' }))];
const byKey = new Map(); for (const op of ops) { const k = cellKey(op.cell); if (byKey.has(k)) fail(`duplicate target ${k}`); byKey.set(k, op); if (op.sourceState === op.targetState) fail(`no-op ${k}`); }
// Projected no-jump / no-sprint graph: endpoints stand one block over floor;
// every consecutive step is cardinal/diagonal adjacent and changes floor <=1.
for (let i = 1; i < routePoints.length; i += 1) {
  const a = routePoints[i - 1], b = routePoints[i]; const dx = Math.abs(a[0] - b[0]); const dz = Math.abs(a[2] - b[2]); const dy = Math.abs(a[1] - b[1]);
  if (dx > 1 || dz > 1 || dx + dz === 0 || dy > 1) fail(`route step ${i - 1}->${i} is not normal-walk: ${a} -> ${b}`);
}
// Protect the adjacent road/deck: only exact target cells may change and every
// target is outside the pavement lane z=-503..-501.
for (const op of ops) if (op.cell.z >= -503) fail(`carriageway overlap ${cellKey(op.cell)}`);
const operated = uniqueCells(ops.map((o) => o.cell)); const envelope = boundsOf(operated);
let blockEntities = 0; let savedEntities = 0;
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
  const c = await reader.chunk(cx, cz); for (const e of c?.block_entities ?? c?.blockEntities ?? []) if (byKey.has(cellKey({ x: Number(e.x), y: Number(e.y), z: Number(e.z) }))) blockEntities += 1;
  const ec = await entityReader.chunk(cx, cz); for (const e of ec?.Entities ?? []) { const p = e.Pos?.slice(0, 3).map(Number); if (p && p[0] >= envelope.minX && p[0] <= envelope.maxX && p[1] >= envelope.minY && p[1] <= envelope.maxY && p[2] >= envelope.minZ && p[2] <= envelope.maxZ) savedEntities += 1; }
}
if (blockEntities || savedEntities) fail(`block/saved entity intersection ${blockEntities}/${savedEntities}`);
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
const groups = [['support-fill', support], ['edge-pave', ops.filter((o) => o.role === 'pedestrian-continuity')]];
const packages = []; const operationManifest = {};
for (const [key, raw] of groups) { const group = [...raw].sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z); const f = `${group.map((o) => replLine(o.cell, o.sourceState, o.targetState)).join('\n')}\n`; const r = `${[...group].reverse().map((o) => replLine(o.cell, o.targetState, o.sourceState)).join('\n')}\n`; const fp = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`); const rp = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`); const header = `# GENERATED MP06-APPROACH-CONTINUITY-01\n# source root: ${SNAPSHOT}\n# coordinate-set SHA-256: ${hashCells(group.map((o) => o.cell))}\n`; fs.writeFileSync(abs(fp), `${header}${f}`); fs.writeFileSync(abs(rp), `${header}${r}`); packages.push({ key, forward: rel(fp), rollback: rel(rp) }); operationManifest[key] = { forwardSha256: sha(f), rollbackSha256: sha(r), forwardCommandCount: group.length, rollbackCommandCount: group.length, targetCoordinateSetSha256: hashCells(group.map((o) => o.cell)), exactInverse: true }; }
const transactionForward = `${groups.flatMap(([, raw]) => raw).map((o) => replLine(o.cell, o.sourceState, o.targetState)).join('\n')}\n`;
const transactionRollback = `${[...groups].reverse().flatMap(([, raw]) => [...raw].reverse()).map((o) => replLine(o.cell, o.targetState, o.sourceState)).join('\n')}\n`;
const transactionForwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const transactionRollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
fs.writeFileSync(abs(transactionForwardPath), `# GENERATED MP06-APPROACH-CONTINUITY-01 transaction forward\n# source root: ${SNAPSHOT}\n${transactionForward}`);
fs.writeFileSync(abs(transactionRollbackPath), `# GENERATED MP06-APPROACH-CONTINUITY-01 transaction rollback\n# source root: projected exact forward post-state\n${transactionRollback}`);
const routeManifest = { schemaVersion: 1, releaseId: 'MP06-APPROACH-CONTINUITY-01', standard: 'two-wide dry normal-walk pedestrian continuity; no jump or sprint; max adjacent rise 1', routes: [{ id: 'mp06-north-ramp-edge-west-to-east', points: routePoints, standard: 'existing pavement -> repaired north edge -> existing pavement; bidirectional'}], virtualAcceptance: { status: 'PASS', endpointFloors: [[-316,69,-503], [-309,72,-503]], grade: grade.map((y, i) => ({ x: -316 + i, floorY: y })), maxAdjacentFloorRise: 1, jumpRequired: false, sprintRequired: false } };
const rmp = path.join(OUT_DIR, `${BASENAME}.route-manifest.json`); fs.writeFileSync(abs(rmp), `${JSON.stringify(routeManifest, null, 2)}\n`);
const manifestBare = { schemaVersion: 1, transactionId: 'mp06-approach-continuity-01', generatedAtUtc: GENERATED_AT, status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_CAPTURE_LANE', releaseId: 'MP06-APPROACH-CONTINUITY-01', scopeIds: ['TE-REGIONAL-APPROACH-ROAD'], source: { snapshotRoot: rel(SNAPSHOT) }, purpose: 'Repair the contiguous two-wide north pedestrian edge on the existing approach-road grade; preserve carriageway and all existing paved surfaces.', target: { cellCount: operated.length, bounds: envelope, coordinateSetSha256: hashCells(operated), supportFillCellCount: support.length, pedestrianDeckCellCount: deck.length }, routeAcceptance: { manifest: rel(rmp), virtualStatus: 'PASS' }, isolation: { blockEntityIntersectionCount: blockEntities, savedEntityIntersectionCount: savedEntities, carriagewayOverlapCount: 0 }, packages, transaction: { forward: rel(transactionForwardPath), rollback: rel(transactionRollbackPath), forwardSha256: sha(transactionForward), rollbackSha256: sha(transactionRollback), exactInverse: true }, operations: operationManifest, executionOrder: { forward: ['support-fill', 'edge-pave'], rollback: ['edge-pave', 'support-fill'] }, hardStops: { freshImmutableSourceImmediatelyBeforeExecution: true, liveEntityClearance: true, strictNoopForwardRollbackParser: true, sourcePreflight: true, journaledExecution: true, postSnapshotRollbackPreflightAndLiveRouteQA: true }, worldEditsPerformed: false };
const manifest = { ...manifestBare, manifestIdentity: sha(`${JSON.stringify(manifestBare, null, 2)}\n`) }; const mp = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`); fs.writeFileSync(abs(mp), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: 'PASS', manifest: rel(mp), routeManifest: rel(rmp), sourceSnapshot: SNAPSHOT, supportFillCells: support.length, pedestrianDeckCells: deck.length, totalOperations: operated.length, endpointFloors: routeManifest.virtualAcceptance.endpointFloors, maxAdjacentFloorRise: 1 }, null, 2)}\n`);
