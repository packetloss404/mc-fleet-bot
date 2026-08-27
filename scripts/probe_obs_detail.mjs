#!/usr/bin/env node
/** Detailed read-only column probe x=212..228, z=147..162, y=100..112. */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-obs-gallery-source-20260824T150744Z';
const reader = new AnvilReader(path.resolve(SNAPSHOT, 'region'));
const cache = new Map();
const stateAt = async (x, y, z) => {
  const k = `${x},${y},${z}`;
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(k);
};
const baseName = (s) => String(s ?? '').split('[', 1)[0];

async function main() {
  for (let x = 212; x <= 228; x += 1) {
    for (let z = 147; z <= 162; z += 1) {
      const solids = [];
      for (let y = 100; y <= 112; y += 1) {
        const s = await stateAt(x, y, z);
        if (baseName(s) !== 'minecraft:air') solids.push(`${y}=${baseName(s)}`);
      }
      if (solids.length) console.log(`(${x},_,${z}): ${solids.join(', ')}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
