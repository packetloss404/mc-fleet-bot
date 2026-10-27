#!/usr/bin/env node
/** Read-only: exact fluid positions in the RAIL-S2 first segment + liner,
 * bubble columns in the corridor rect, and saved-entity/block-entity audit
 * of the first-segment envelope + 1-cell halo. */

import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'entities')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const INTERIOR = { minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457 };
const faces = { floor: [], ceil: [], north: [], south: [], west: [], east: [] };
for (let x = INTERIOR.minX; x <= INTERIOR.maxX; x += 1) for (let z = INTERIOR.minZ; z <= INTERIOR.maxZ; z += 1) {
  faces.floor.push({ x, y: 17, z });
  faces.ceil.push({ x, y: 24, z });
}
for (let x = INTERIOR.minX; x <= INTERIOR.maxX; x += 1) for (let y = 18; y <= 23; y += 1) {
  faces.north.push({ x, y, z: -463 });
  faces.south.push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = INTERIOR.minZ; z <= INTERIOR.maxZ; z += 1) {
  faces.west.push({ x: -255, y, z });
  faces.east.push({ x: -235, y, z });
}

console.log('=== INTERIOR FLUID CELLS (must become air) ===');
for (let x = INTERIOR.minX; x <= INTERIOR.maxX; x += 1) {
  for (let z = INTERIOR.minZ; z <= INTERIOR.maxZ; z += 1) {
    for (let y = INTERIOR.minY; y <= INTERIOR.maxY; y += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      if (isF(s)) console.log(`  interior fluid (${x},${y},${z}) ${s}`);
    }
  }
}

console.log('\n=== LAVA / FLUID ON LINER FACES ===');
for (const [k, cells] of Object.entries(faces)) {
  for (const c of cells) {
    const s = stateToCommandString(await reader.blockState(c.x, c.y, c.z));
    if (isF(s)) console.log(`  ${k} (${c.x},${c.y},${c.z}) ${s}`);
  }
}

console.log('\n=== BUBBLE COLUMNS IN CORRIDOR RECT (x=-254..-156 z=-462..-387 y18..23) ===');
for (let x = -254; x <= -156; x += 1) for (let z = -462; z <= -387; z += 1) for (let y = 18; y <= 23; y += 1) {
  const s = stateToCommandString(await reader.blockState(x, y, z));
  if (src(s) === 'minecraft:bubble_column') console.log(`  bubble (${x},${y},${z}) ${s}`);
}

console.log('\n=== BLOCK ENTITIES + SAVED ENTITIES in first-segment envelope + 1-cell halo ===');
const envelope = {
  minX: -256, maxX: -234, minY: 16, maxY: 25, minZ: -464, maxZ: -455,
};
const blockEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const p = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (p.x >= envelope.minX && p.x <= envelope.maxX && p.y >= envelope.minY && p.y <= envelope.maxY && p.z >= envelope.minZ && p.z <= envelope.maxZ) {
        blockEntities.push({ id: entity.id ?? null, x: p.x, y: p.y, z: p.z });
      }
    }
  }
}
console.log(`  block entities: ${blockEntities.length}`);
for (const b of blockEntities) console.log(`    ${b.id} (${b.x},${b.y},${b.z})`);

const saved = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await entityReader.chunk(cx, cz);
    for (const entity of chunk?.Entities ?? []) {
      const pos = entity.Pos?.slice(0, 3).map(Number);
      if (pos?.length === 3 && pos[0] >= envelope.minX && pos[0] < envelope.maxX + 1
        && pos[1] >= envelope.minY && pos[1] < envelope.maxY + 1
        && pos[2] >= envelope.minZ && pos[2] < envelope.maxZ + 1) {
        saved.push({ id: entity.id ?? null, pos: pos.map(Math.round) });
      }
    }
  }
}
console.log(`  saved entities: ${saved.length}`);
for (const e of saved) console.log(`    ${e.id} ${JSON.stringify(e.pos)}`);

console.log('\n=== NEARBY SURFACE / OWNERSHIP: probe above bore (y=66..67 grass plateau) ===');
for (const [x, z] of [[-250, -460], [-245, -457], [-240, -457], [-237, -460]]) {
  for (let y = 66; y >= 60; y -= 1) {
    const s = src(stateToCommandString(await reader.blockState(x, y, z)));
    if (s !== 'minecraft:air' && s !== 'minecraft:cave_air') {
      console.log(`  (${x},${z}) surface=${s}@y${y}`);
      break;
    }
  }
}
