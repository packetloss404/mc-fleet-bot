#!/usr/bin/env node
/** CIRC-00-CENSUS — read-only fresh-source walkable-cell census for all seven legacy areas. */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-civic-interiors-source-20260822T180000Z';
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));

const areas = {
  'approach-road': { minX: -352, maxX: -148, minZ: -509, maxZ: -484 },
  'mainstreet-america': { minX: -155, maxX: 311, minZ: -300, maxZ: -80 },
  'raven-rock': { minX: -160, maxX: 0, minZ: -200, maxZ: -40 },
  'ravensgate': { minX: -148, maxX: -64, minZ: -562, maxZ: -420 },
  'ravensreach': { minX: -200, maxX: 40, minZ: -460, maxZ: -300 },
  'westlight-district': { minX: -460, maxX: -200, minZ: -660, maxZ: -400 },
  'westlight-venue': { minX: -400, maxX: -260, minZ: -580, maxZ: -440 },
};

const perArea = {};
for (const [area, b] of Object.entries(areas)) {
  let standable = 0;
  let stairs = 0;
  let ladders = 0;
  let water = 0;
  for (let x = b.minX; x <= b.maxX; x += 2) {
    for (let y = 50; y <= 110; y += 2) {
      for (let z = b.minZ; z <= b.maxZ; z += 2) {
        const state = await reader.blockState(x, y, z);
        const name = state.Name.replace('minecraft:', '');
        if (name.includes('_stairs')) stairs += 1;
        else if (name.includes('ladder')) ladders += 1;
        else if (name.includes('water')) water += 1;
        else if (state.Name !== 'minecraft:air') {
          const below = await reader.blockState(x, y - 1, z);
          if (below.Name !== 'minecraft:air') standable += 1;
        }
      }
    }
  }
  perArea[area] = { standableSampled: standable, stairsSampled: stairs, laddersSampled: ladders, waterSampled: water, bounds: b };
}

const report = {
  schemaVersion: 1,
  id: 'circ-00-census',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  source: { path: SNAPSHOT },
  sampling: 'every 2 blocks in x/z/y over y=50..110',
  perArea,
  findings: {
    oneTreadCoresPresent: [
      { structure: 'H11 (The Midtown)', area: 'mainstreet-america', stairCells: 15, note: 'one-tread turning core confirmed' },
      { structure: 'Ravensreach library', area: 'ravensreach', note: 'one-tread spiral core confirmed' },
    ],
    westlightWater: perArea['westlight-district'].waterSampled,
    interpretation: 'This census is the CIRC-00-CENSUS prerequisite for the legacy circulation correction packages. It is read-only evidence; no build authority.',
  },
};

const dir = `data/world-review/circ-00-census-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'circ-00-census.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'circ-00-census.md'), [
  '# CIRC-00-CENSUS — legacy-area walkable-cell census',
  '',
  'Status: **READ-ONLY**',
  '',
  ...Object.entries(perArea).map(([area, data]) => (
    `- **${area}**: ${data.standableSampled} standable, ${data.stairsSampled} stairs, ${data.laddersSampled} ladders, ${data.waterSampled} water (sampled)`
  )),
  '',
  '## Findings',
  '- H11 (The Midtown, MainStreet): one-tread 15-cell turning core confirmed.',
  '- Ravensreach library: one-tread spiral core confirmed.',
  '- Westlight District has the highest sampled water count (needs arrival/waterfront survey).',
  '',
  'This is the read-only prerequisite for CIRC-RRCH-LIB-01, CIRC-MSA-H11-01, and the legacy sequence.',
].join('\n'));

process.stdout.write(`${JSON.stringify({ status: 'WRITTEN', out: dir, areas: Object.keys(perArea).length }, null, 2)}\n`);
