#!/usr/bin/env node
/** RAIL-S0 / B09-P0 — read-only survey of the existing B09 mountain guideway. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-b09-survey-20260822T225000Z';
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const entityReader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'entities'));

const rails = [];
for (let x = 1950; x <= 2350; x += 1) {
  for (let y = 0; y <= 330; y += 1) {
    for (let z = -880; z <= -600; z += 1) {
      const state = await reader.blockState(x, y, z);
      if (state.Name.includes('rail')) {
        rails.push({ x, y, z, name: state.Name.replace('minecraft:', ''), shape: state.Properties?.shape ?? 'flat' });
      }
    }
  }
}

const railCensus = {};
for (const rail of rails) {
  const key = rail.name + (rail.shape && rail.shape !== 'flat' ? `_${rail.shape}` : '');
  railCensus[key] = (railCensus[key] ?? 0) + 1;
}

async function corridorResult(baseX, baseY, baseZ, offset) {
  const blocked = [];
  for (let x = baseX; x <= baseX + 60; x += 1) {
    for (let y = baseY; y <= baseY + 5; y += 1) {
      for (let z = baseZ + offset; z > baseZ + offset - 6; z -= 1) {
        const state = await reader.blockState(x, y, z);
        if (state.Name !== 'minecraft:air') blocked.push(`${x},${y},${z}:${state.Name.replace('minecraft:', '')}`);
      }
    }
  }
  return blocked.length === 0 ? 'CLEAR' : `BLOCKED(${blocked.length}) e.g. ${blocked.slice(0, 3).join(' ')}`;
}

const minecarts = [];
for (let x = 1950; x <= 2350; x += 16) {
  for (let z = -880; z <= -600; z += 16) {
    const chunk = await entityReader.chunk(Math.floor(x / 16), Math.floor(z / 16));
    for (const entity of chunk?.Entities ?? []) {
      if (String(entity.id ?? '').includes('minecart')) {
        minecarts.push({ position: entity.Pos?.slice(0, 3).map((n) => Math.round(n)), id: entity.id });
      }
    }
  }
}

const report = {
  schemaVersion: 1,
  id: 'b09-p0-survey',
  generatedAtUtc: new Date().toISOString(),
  source: { path: SNAPSHOT, regions: 'region' },
  railTotal: rails.length,
  railCensus,
  bounds: {
    minX: Math.min(...rails.map((r) => r.x)),
    maxX: Math.max(...rails.map((r) => r.x)),
    minY: Math.min(...rails.map((r) => r.y)),
    maxY: Math.max(...rails.map((r) => r.y)),
    minZ: Math.min(...rails.map((r) => r.z)),
    maxZ: Math.max(...rails.map((r) => r.z)),
  },
  shells: {
    lower: { x: 2048, y: 130, z: -748, state: (await reader.blockState(2048, 130, -748)).Name },
    eastThroat: { x: 2288, y: 130, z: -748, state: (await reader.blockState(2288, 130, -748)).Name },
    summit: { x: 2048, y: 304, z: -828, state: (await reader.blockState(2048, 304, -828)).Name },
  },
  minecartCount: minecarts.length,
  minecartNote: 'b09-survey seed records no minecart; the accepted R12R evidence binds one minecart on indices 9..25 at the R12R post.',
  candidateCorridors: {
    lowerStraightOffsetNorth8: { z: -756, result: await corridorResult(2030, 130, -748, -8) },
    lowerStraightOffsetNorth16: { z: -764, result: await corridorResult(2030, 130, -748, -16) },
  },
  readyForS1: false,
  readyForS1Reason: 'candidate 6x6 service-corridor offsets along the lower straight are not fully clear of terrain/shell fabric; a dedicated bore and exact ownership/entity survey is required before any conversion package.',
  surveyLimits: 'read-only census from the accepted b09-survey seed. A fresh same-invocation capture is required before any physical package.',
};

const dir = `data/world-review/b09-p0-survey-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'b09-p0-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'b09-p0-survey.md'), [
  '# B09-P0 survey',
  '',
  '## Rail census',
  ...Object.entries(report.railCensus).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Result',
  `- Total rail cells: **${report.railTotal}**`,
  `- Bounds: x ${report.bounds.minX}..${report.bounds.maxX}, y ${report.bounds.minY}..${report.bounds.maxY}, z ${report.bounds.minZ}..${report.bounds.maxZ}`,
  `- Minecarts in seed: **${report.minecartCount}** (R12R binds one on indices 9..25)`,
  `- Candidate 6x6 corridors: north-8 = ${report.candidateCorridors.lowerStraightOffsetNorth8.result}; north-16 = ${report.candidateCorridors.lowerStraightOffsetNorth16.result}`,
  `- \`readyForS1\`: **${report.readyForS1}**`,
  '',
  'See b09-p0-survey.json.',
].join('\n'));

process.stdout.write(`${JSON.stringify({ status: 'WRITTEN', out: dir, railTotal: report.railTotal, readyForS1: report.readyForS1, corridors: report.candidateCorridors }, null, 2)}\n`);
