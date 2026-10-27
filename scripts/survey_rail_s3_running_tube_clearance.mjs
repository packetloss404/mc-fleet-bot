#!/usr/bin/env node
/** Read-only setout survey for Cobalt running-tube clearance above the civil bed. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway5-post-20260826T033200Z');
const OUT = value('--out-dir', 'data/world-review/rail-s3-running-tube-survey-20260826T033200Z');
const reader = new AnvilReader(path.resolve(ROOT, SNAPSHOT, 'region'));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const name = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const tubes = [{ id: 'north-westbound', z: -461 }, { id: 'south-eastbound', z: -454 }];
const report = { schemaVersion: 1, id: 'rail-s3-running-tube-clearance-survey', status: 'SURVEY_COMPLETE_DESIGN_REQUIRED', source: { snapshotRoot: SNAPSHOT }, bed: { y: 12, xMin: -254, xMax: -136 }, tubes: [], decision: { readyForRailPlacement: false, reason: 'Rails need a dry, clear running tube at y13 and headroom above. This survey is setout only; it does not authorize a carve, fluid displacement, rail placement, power, or passenger operation.' }, liveCallsPerformed: false, worldEditsPerformed: false };
for (const tube of tubes) {
  const census = {}; const blockers = [];
  for (let x = -254; x <= -136; x += 1) {
    for (let y = 13; y <= 16; y += 1) {
      const state = await stateAt(x, y, tube.z);
      census[state] = (census[state] ?? 0) + 1;
      if (!isAir(state)) blockers.push({ x, y, z: tube.z, state, class: isFluid(state) ? 'fluid' : 'solid-or-gravity' });
    }
  }
  report.tubes.push({ id: tube.id, z: tube.z, clearance: { yMin: 13, yMax: 16, cellCount: 119 * 4, airCells: 476 - blockers.length, blockerCount: blockers.length, census, blockers } });
}
const waterColumn = [];
for (let y = 8; y <= 18; y += 1) waterColumn.push({ y, state: await stateAt(-180, y, -454) });
report.upperWaterInterface = { x: -180, z: -454, cells: waterColumn, runningRailLevel: 13, conflict: isFluid(waterColumn.find(({ y }) => y === 13)?.state ?? '') };
report.decision.requiredNextDesign = {
  id: 'RAIL-S3-RUNNING-TUBE-01',
  mustProve: ['exact directional tube cross-section', 'continuous dry clear envelope', 'water-column bypass or independently sealed reroute at x=-180', 'support/headroom and service-gallery preservation', 'cross-passage and platform-edge interfaces before a later rail package'],
  prohibited: ['placing rail into natural solids or fluid', 'opening the 6x6 service gallery into the running tube', 'treating civil bed completion as a public railway'],
};
fs.mkdirSync(path.resolve(ROOT, OUT), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT, 'running-tube-clearance-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve(ROOT, OUT, 'running-tube-clearance-survey.md'), [
  '# Cobalt RAIL-S3 running-tube clearance survey', '', `Source: \`${SNAPSHOT}\`.`, '',
  ...report.tubes.map((tube) => `- **${tube.id}:** ${tube.clearance.blockerCount}/${tube.clearance.cellCount} running-envelope cells need exact clearance treatment.`),
  `- **Upper-water conflict:** \`${report.upperWaterInterface.conflict}\` at the intended south running-rail level.`, '',
  'No blocks were changed. A containment/bypass and exact running-tube design is required before rails.',
].join('\n'));
console.log(JSON.stringify({ status: report.status, out: OUT, tubeBlockers: report.tubes.map((tube) => ({ id: tube.id, blockers: tube.clearance.blockerCount })), upperWaterConflict: report.upperWaterInterface.conflict }, null, 2));
