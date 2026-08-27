#!/usr/bin/env node
/** Read-only field survey for the final Cobalt guideway water-held bed cell. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway4-post-20260826T032500Z');
const OUT_DIR = value('--out-dir', 'data/world-review/rail-guideway-water-hold-survey-20260826T032500Z');
const TARGET = { x: -180, y: 12, z: -454 };
const BOUNDS = { minX: -190, maxX: -170, minY: 8, maxY: 16, minZ: -458, maxZ: -450 };
const reader = new AnvilReader(path.resolve(ROOT, SNAPSHOT, 'region'));
const key = ({ x, y, z }) => `${x},${y},${z}`;
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const inside = (cell) => cell.x >= BOUNDS.minX && cell.x <= BOUNDS.maxX
  && cell.y >= BOUNDS.minY && cell.y <= BOUNDS.maxY && cell.z >= BOUNDS.minZ && cell.z <= BOUNDS.maxZ;

const stateCache = new Map();
const cachedState = async (cell) => {
  const id = key(cell);
  if (!stateCache.has(id)) stateCache.set(id, await stateAt(cell));
  return stateCache.get(id);
};

const queue = [TARGET];
const seen = new Set();
const component = [];
const boundary = new Map();
while (queue.length) {
  const current = queue.shift();
  const id = key(current);
  if (seen.has(id) || !inside(current)) continue;
  seen.add(id);
  const state = await cachedState(current);
  if (!isFluid(state)) continue;
  component.push({ ...current, state });
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
    if (!inside(next)) {
      boundary.set(`${id}:${dx},${dy},${dz}`, { from: current, outsideSurvey: true });
      continue;
    }
    const nextState = await cachedState(next);
    if (isFluid(nextState)) queue.push(next);
    else boundary.set(`${id}:${dx},${dy},${dz}`, { from: current, neighbour: next, state: nextState });
  }
}

const componentHash = crypto.createHash('sha256').update(component
  .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z)
  .map(({ x, y, z, state }) => `${x},${y},${z}:${state}\n`).join('')).digest('hex');
const solidBoundary = [...boundary.values()].filter((entry) => entry.state && !entry.state.startsWith('minecraft:air'));
const openBoundary = [...boundary.values()].filter((entry) => entry.state?.startsWith('minecraft:air') || entry.outsideSurvey);
const report = {
  schemaVersion: 1,
  id: 'rail-guideway-water-held-cell-survey',
  status: 'HOLD_REQUIRES_CONTAINMENT_DESIGN',
  source: { snapshotRoot: SNAPSHOT },
  target: TARGET,
  bounds: BOUNDS,
  fluidComponent: { cellCount: component.length, coordinateStateSha256: componentHash, cells: component },
  boundary: { solidFaceCount: solidBoundary.length, openOrSurveyEdgeFaceCount: openBoundary.length, faces: [...boundary.values()] },
  fixedInterfaces: {
    dryGuidewayBed: { xMin: -254, xMax: -136, y: 12, z: [-461, -454] },
    existingBarrierColumn: { x: -179, yMin: 11, yMax: 13, z: -454 },
    serviceGallery: { xMin: -254, xMax: -136, yMin: 18, yMax: 23, zMin: -463, zMax: -456 },
  },
  decision: {
    selectedNextPackage: null,
    reason: 'The final south-tube bed coordinate contains water. A design must prove a bounded liner/containment treatment and support/halo behaviour before the water can be replaced. No rail may be placed on this cell before that package passes.',
    prohibitedShortcuts: ['do not fill the water cell directly', 'do not reroute into the service gallery', 'do not treat the civil bed as passenger operation'],
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.resolve(ROOT, OUT_DIR), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT_DIR, 'water-held-cell-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.resolve(ROOT, OUT_DIR, 'water-held-cell-survey.md'), [
  '# Cobalt guideway water-held cell survey',
  '',
  `- Source: \`${SNAPSHOT}\``,
  `- Held bed coordinate: \`(${TARGET.x},${TARGET.y},${TARGET.z})\``,
  `- Connected fluid cells inside surveyed bounds: **${component.length}**`,
  `- Solid boundary faces: **${solidBoundary.length}**; open/survey-edge faces: **${openBoundary.length}**.`,
  '',
  '## Decision',
  '',
  'The water cell remains held. The next package must be a separately surveyed containment/liner design with an exact inverse; it may not direct-fill or borrow the service gallery. No passenger-service claim is enabled.',
].join('\n'));
process.stdout.write(`${JSON.stringify({ status: report.status, out: OUT_DIR, fluidCells: component.length, openBoundaryFaces: openBoundary.length }, null, 2)}\n`);
