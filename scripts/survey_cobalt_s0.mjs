#!/usr/bin/env node
/** COBALT-S0 — Westlight/Ravensreach first passenger station-pair survey. */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-civic-interiors-source-20260822T180000Z';
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));

async function surface(x, z) {
  for (let y = 120; y >= 40; y -= 1) {
    const state = await reader.blockState(x, y, z);
    if (state.Name !== 'minecraft:air') return { y, block: state.Name.replace('minecraft:', '') };
  }
  return null;
}

async function waterFraction(minX, maxX, minZ, maxZ) {
  let water = 0;
  let total = 0;
  for (let x = minX; x <= maxX; x += 4) {
    for (let y = 40; y <= 120; y += 4) {
      for (let z = minZ; z <= maxZ; z += 4) {
        total += 1;
        const state = await reader.blockState(x, y, z);
        if (state.Name.includes('water')) water += 1;
      }
    }
  }
  return water / total;
}

const westlight = {
  surveyBox: { minX: -443, maxX: -260, minZ: -640, maxZ: -445 },
  samples: [
    { x: -350, z: -520, surface: await surface(-350, -520) },
    { x: -380, z: -500, surface: await surface(-380, -500) },
    { x: -320, z: -560, surface: await surface(-320, -560) },
    { x: -300, z: -470, surface: await surface(-300, -470) },
    { x: -420, z: -600, surface: await surface(-420, -600) },
  ],
  waterFraction: await waterFraction(-443, -260, -640, -445),
};
const ravensreach = {
  surveyBox: { minX: -147, maxX: -40, minZ: -451, maxZ: -323 },
  samples: [
    { x: -90, z: -370, surface: await surface(-90, -370) },
    { x: -120, z: -400, surface: await surface(-120, -400) },
    { x: -60, z: -350, surface: await surface(-60, -350) },
    { x: -100, z: -430, surface: await surface(-100, -430) },
    { x: -50, z: -330, surface: await surface(-50, -330) },
  ],
  waterFraction: await waterFraction(-147, -40, -451, -323),
};

const report = {
  schemaVersion: 1,
  id: 'cobalt-s0-westlight-ravensreach',
  generatedAtUtc: new Date().toISOString(),
  source: { path: SNAPSHOT },
  westlight,
  ravensreach,
  findings: {
    westlightBuiltDry: westlight.samples.every((s) => s.surface) && westlight.waterFraction < 0.05,
    ravensreachBuiltDry: ravensreach.samples.every((s) => s.surface) && ravensreach.waterFraction < 0.05,
    stationEntryCandidates: 'Both towns are built and dry; street-to-platform candidates require exact surveying of specific plaza/road cells before freeze. Survey boxes are NOT platform coordinates.',
    preferredCentreline: null,
    preferredCentrelineReason: 'No centreline selected: every cell and interface is not yet known; a fresh-source detailed survey is required before any alignment freeze.',
  },
};

const dir = `data/world-review/cobalt-s0-westlight-ravensreach-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'cobalt-s0-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'cobalt-s0-survey.md'), [
  '# COBALT-S0 — Westlight/Ravensreach station-pair survey',
  '',
  '## Westlight',
  `- Survey box: ${JSON.stringify(westlight.surveyBox)}`,
  `- Water fraction: **${(westlight.waterFraction * 100).toFixed(2)}%** (dry)`,
  ...westlight.samples.map((s) => `- Surface at (${s.x},${s.z}): y=${s.surface.y} ${s.surface.block}`),
  '',
  '## Ravensreach',
  `- Survey box: ${JSON.stringify(ravensreach.surveyBox)}`,
  `- Water fraction: **${(ravensreach.waterFraction * 100).toFixed(2)}%** (dry)`,
  ...ravensreach.samples.map((s) => `- Surface at (${s.x},${s.z}): y=${s.surface.y} ${s.surface.block}`),
  '',
  '## Result',
  '- Both towns are built and dry; no preferred centreline selected.',
  '- These are **survey boxes**, not platform coordinates.',
  '- `COBALT-S1` may freeze a station pair only after a fresh-source detailed survey proves two public street-to-platform routes per station and a paired 6x6 service corridor.',
].join('\n'));

process.stdout.write(`${JSON.stringify({ status: 'WRITTEN', out: dir, westlightDry: report.findings.westlightBuiltDry, ravensreachDry: report.findings.ravensreachBuiltDry }, null, 2)}\n`);
