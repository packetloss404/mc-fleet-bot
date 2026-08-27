#!/usr/bin/env node
/** Fail closed unless the proposed R05 wet-pocket containment has an exact, bounded water interface. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const snapshot = value('--snapshot', '');
const out = value('--out', 'data/world-review/rail-running-tube5-r05-partitioned-containment-design.json');
if (!snapshot) throw new Error('usage: compile_rail_s3_r05_partitioned_containment.mjs --snapshot <complete-save> [--out <report>]');
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const isFluid = (state) => state.startsWith('minecraft:water') || state.startsWith('minecraft:lava') || state.includes('waterlogged=true');
const fluidBoundary = [];
for (let x = -163; x <= -158; x += 1) for (let y = 12; y <= 16; y += 1) for (let z = -463; z <= -458; z += 1) {
  const state = stateToCommandString(await reader.blockState(x, y, z));
  if (isFluid(state) && (z === -463 || z === -458 || x === -163 || x === -158 || y === 12 || y === 16)) fluidBoundary.push({ x, y, z, state });
}
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r05-partitioned-containment-design-gate',
  snapshot,
  proposedWetPocket: { minX: -163, maxX: -158, minY: 12, maxY: 16, minZ: -463, maxZ: -458 },
  boundaryFluidCells: fluidBoundary,
  status: fluidBoundary.length ? 'HOLD_UNBOUNDED_WATER_INTERFACE_REQUIRES_EXPANDED_SURVEY' : 'READY_FOR_FLOW_ORDERED_PARTITIONED_CONTAINMENT_COMPILER',
  requiredBeforeMutation: ['expand survey through every fluid-connected boundary', 'derive exact sealed retention cells outside both running tubes and the service gallery', 'compile cap-first partitions with exact forward and inverse operations', 'fresh complete source and full guarded kernel'],
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
fs.mkdirSync(path.dirname(path.resolve(process.cwd(), out)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, boundaryFluidCount: fluidBoundary.length, out }, null, 2));
if (fluidBoundary.length) process.exitCode = 2;
