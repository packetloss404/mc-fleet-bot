#!/usr/bin/env node
/**
 * MP06-APPROACH-CONTINUATION-02 — current post-state route-candidate screen.
 *
 * Re-evaluates the old 182-cell edge census after the accepted 46-cell repair.
 * It only recognizes a new package if two-wide shoulder pairs form a complete
 * normal-walk run connected to retained pavement at BOTH ends. Fragmentary
 * air/deck cells are recorded, never promoted to a continuity operation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (flag, fallback) => { const i = process.argv.indexOf(flag); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const SNAPSHOT = arg('--snapshot', 'data/worldsnap-mp06-approach-continuity-post-20260826T050700Z');
const PRIOR = arg('--prior', 'data/world-review/mp06-approach-edge-probe-20260826T042200Z.json');
const OUT = arg('--out', 'data/world-review/mp06-approach-continuation-02-current-post-20260826.json');
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const name = (state) => state.split('[', 1)[0];
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const isAir = (state) => AIR.has(name(state));
const isFluid = (state) => FLUID.has(name(state)) || state.includes('waterlogged=true');
const isSolid = (state) => !isAir(state) && !isFluid(state);
const previous = JSON.parse(fs.readFileSync(abs(PRIOR), 'utf8'));
const oldCells = previous.summary?.buildableCells ?? [];

// Old edges always occur as two adjacent cells. Group them by floor elevation
// and x, preserving only full pairs in the post-state analysis.
const byColumn = new Map();
for (const cell of oldCells) {
  const key = `${cell.x},${cell.y}`;
  const list = byColumn.get(key) ?? [];
  list.push(cell);
  byColumn.set(key, list);
}
const candidates = [];
for (const cells of byColumn.values()) {
  if (cells.length !== 2) continue;
  const [a, b] = cells.sort((l, r) => l.z - r.z);
  if (Math.abs(a.z - b.z) !== 1) continue;
  const source = [];
  let clear = true;
  for (const cell of [a, b]) {
    const deck = await stateAt(cell);
    const body = await stateAt({ x: cell.x, y: cell.y + 1, z: cell.z });
    const head = await stateAt({ x: cell.x, y: cell.y + 2, z: cell.z });
    let base = null;
    for (let y = cell.y - 1; y >= cell.y - 3; y -= 1) {
      const state = await stateAt({ x: cell.x, y, z: cell.z });
      if (!isAir(state)) { base = { y, state }; break; }
    }
    // A shoulder deck may not bury a retained route-light/fixture merely
    // because it happens to be a solid support directly below the target.
    const protectedBase = base && ['minecraft:sea_lantern', 'minecraft:lantern', 'minecraft:torch', 'minecraft:wall_torch'].includes(name(base.state));
    const targetable = isAir(deck) && isAir(body) && isAir(head) && base && isSolid(base.state) && !protectedBase;
    source.push({ cell, deck, body, head, base, targetable });
    if (!targetable) clear = false;
  }
  candidates.push({ x: a.x, floorY: a.y, zPair: [a.z, b.z], source, targetable: clear });
}

const targetable = candidates.filter(({ targetable }) => targetable);
const candidateKey = ({ x, floorY, zPair }) => `${x},${floorY},${zPair.join(',')}`;
const targetableByKey = new Map(targetable.map((entry) => [candidateKey(entry), entry]));
const neighboursOf = (candidate) => targetable.filter((other) => other !== candidate
  && other.zPair.join(',') === candidate.zPair.join(',')
  && Math.abs(other.x - candidate.x) === 1
  && Math.abs(other.floorY - candidate.floorY) <= 1);
const components = [];
const unvisited = new Set(targetable.map(candidateKey));
while (unvisited.size) {
  const first = unvisited.values().next().value;
  const stack = [targetableByKey.get(first)];
  const members = [];
  unvisited.delete(first);
  while (stack.length) {
    const candidate = stack.pop();
    members.push(candidate);
    for (const neighbour of neighboursOf(candidate)) {
      const key = candidateKey(neighbour);
      if (unvisited.delete(key)) stack.push(neighbour);
    }
  }
  components.push(members);
}
for (const members of components) {
  const componentKeys = new Set(members.map(candidateKey));
  const endpoints = [];
  for (const candidate of members) {
    for (const dx of [-1, 1]) for (let y = candidate.floorY - 1; y <= candidate.floorY + 1; y += 1) {
      const adjacentKey = `${candidate.x + dx},${y},${candidate.zPair.join(',')}`;
      if (componentKeys.has(adjacentKey)) continue;
      const checks = await Promise.all(candidate.zPair.map(async (z) => ({
        floor: await stateAt({ x: candidate.x + dx, y, z }),
        body: await stateAt({ x: candidate.x + dx, y: y + 1, z }),
        head: await stateAt({ x: candidate.x + dx, y: y + 2, z }),
      })));
      if (checks.every(({ floor, body, head }) => isSolid(floor) && isAir(body) && isAir(head))) endpoints.push({ x: candidate.x + dx, floorY: y, zPair: candidate.zPair });
    }
  }
  for (const candidate of members) candidate.componentEndpointPairs = endpoints;
}
const functional = components.filter((members) => (members[0].componentEndpointPairs ?? []).length >= 2).flat();
const report = {
  schemaVersion: 1,
  id: 'MP06-APPROACH-CONTINUATION-02',
  generatedAtUtc: new Date().toISOString(),
  status: functional.length ? 'CURRENT_SOURCE_FUNCTIONAL_CANDIDATE_FOUND_REQUIRES_FRESH_LIVE_CAPTURE' : 'NO_CURRENT_SOURCE_FUNCTIONAL_CONTINUITY_CANDIDATE_NO_OPERATIONS',
  liveWorldMutated: false,
  source: {
    snapshot: rel(SNAPSHOT),
    snapshotRole: 'accepted MP06 post-state; current retained offline source only',
    priorCensus: rel(PRIOR),
    snapshotRegionSha256: sha(path.join(SNAPSHOT, 'region/r.-1.-1.mca')),
    requiresFreshLiveCaptureBeforeExecution: true,
  },
  ownership: {
    owner: 'TE-REGIONAL-APPROACH-ROAD',
    candidateClass: 'two-wide pedestrian shoulder only; carriageway and district interfaces excluded',
  },
  census: {
    oldEdgeCells: oldCells.length,
    oldTwoWidePairs: candidates.length,
    currentTargetablePairs: targetable.length,
    bidirectionallyEndpointConnectedPairs: functional.length,
    targetablePairs: targetable,
    targetableComponentCount: components.length,
  },
  result: functional.length ? {
    operationCount: null,
    reason: 'A bounded route candidate exists but is intentionally not emitted by this survey; compile exact forward/inverse only from a fresh live source.',
  } : {
    operationCount: 0,
    reason: 'Every remaining air pair is isolated at one or both ends. Paving it would create a decorative/fragmentary shoulder rather than a usable continuous route, so this screen emits no operation or inverse.',
  },
};
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}\nreport=${rel(OUT)}\npairs=${candidates.length}\ntargetable=${targetable.length}\nfunctional=${functional.length}\noperations=${report.result.operationCount ?? 'not-emitted'}`);
