#!/usr/bin/env node
/**
 * Render a source-bound, two-level SVG map of the MP01 control/staging area.
 * This is evidence only: it opens an immutable copied Anvil snapshot and
 * never contacts the Minecraft server or writes any world/configuration data.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const required = (flag) => {
  const result = option(flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
};
const snapshot = required('--snapshot');
const output = required('--out');
const intakePath = option('--intake');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 control source map rejected: ${message}`);
};

const regionDir = path.join(absolute(snapshot), 'region');
fail(fs.existsSync(regionDir), `missing region directory in ${snapshot}`);
if (intakePath) {
  const intake = JSON.parse(fs.readFileSync(absolute(intakePath), 'utf8'));
  fail(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', `intake status ${intake.status}`);
  fail(relative(intake.input?.suppliedWorldRoot) === relative(snapshot), 'intake snapshot mismatch');
}

const reader = new AnvilReader(regionDir);
const minX = 1993;
const maxX = 2031;
const minZ = -920;
const maxZ = -890;
const levels = [165, 166];
const states = new Map();
for (const y of levels) {
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      states.set(`${x},${y},${z}`, stateToCommandString(await reader.blockState(x, y, z)));
    }
  }
}
const at = (x, y, z) => states.get(`${x},${y},${z}`);
const expected = new Map([
  ['2001,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2002,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2003,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2004,165,-902', 'minecraft:polished_blackstone_bricks'],
  ['2001,166,-902', 'minecraft:lever[face=floor,facing=north,powered=false]'],
  ['2002,166,-902', 'minecraft:redstone_wire[east=side,north=none,power=0,south=none,west=side]'],
  ['2003,166,-902', 'minecraft:redstone_lamp[lit=false]'],
]);
for (const [coordinate, state] of expected) fail(states.get(coordinate) === state,
  `control state drift at ${coordinate}: ${states.get(coordinate)}`);

const category = (state) => {
  if (state === 'minecraft:air') return { fill: '#101827', label: 'air' };
  if (state.includes('water') || state.includes('lava')) return { fill: '#0ea5e9', label: 'fluid' };
  if (state.includes('lever')) return { fill: '#f59e0b', label: 'OFF lever' };
  if (state.includes('redstone_wire')) return { fill: '#f43f5e', label: 'wire power 0' };
  if (state.includes('redstone_lamp')) return { fill: '#a78bfa', label: 'unlit lamp' };
  if (state.includes('iron_door')) return { fill: '#f97316', label: 'door' };
  if (state.includes('deepslate')) return { fill: '#475569', label: 'deepslate boundary' };
  if (state.includes('blackstone')) return { fill: '#334155', label: 'blackstone support' };
  if (state.includes('polished_andesite')) return { fill: '#94a3b8', label: 'andesite structure' };
  if (state.includes('concrete')) return { fill: '#e2e8f0', label: 'concrete structure' };
  return { fill: '#64748b', label: state.replace('minecraft:', '') };
};
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const cellSize = 14;
const panelWidth = (maxX - minX + 1) * cellSize;
const panelHeight = (maxZ - minZ + 1) * cellSize;
const marginX = 64;
const panelY = 74;
const gap = 68;
const svgWidth = panelWidth * 2 + marginX * 2 + gap;
const svgHeight = panelY + panelHeight + 118;
const panelX = (index) => marginX + index * (panelWidth + gap);
const cell = (x, z, index) => ({
  x: panelX(index) + (x - minX) * cellSize,
  y: panelY + (z - minZ) * cellSize,
});
const title = 'MP01 control/staging source map — immutable SYS03 post';
const drawPanel = (y, index) => {
  const outputParts = [`<text x="${panelX(index)}" y="52" class="subtitle">level y=${y}</text>`];
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const state = at(x, y, z);
      const visual = category(state);
      const position = cell(x, z, index);
      outputParts.push(`<rect x="${position.x}" y="${position.y}" width="${cellSize}" height="${cellSize}" fill="${visual.fill}" stroke="#1e293b" stroke-width=".45"><title>${escape(`${x},${y},${z} — ${state}`)}</title></rect>`);
    }
  }
  for (let x = minX; x <= maxX; x += 4) {
    const position = cell(x, minZ, index);
    outputParts.push(`<text x="${position.x}" y="${panelY - 6}" class="axis">${x}</text>`);
  }
  for (let z = minZ; z <= maxZ; z += 5) {
    const position = cell(minX, z, index);
    outputParts.push(`<text x="${panelX(index) - 41}" y="${position.y + 10}" class="axis">${z}</text>`);
  }
  const staging = [2001, 2002, 2003].map((x) => cell(x, -899, index));
  for (const position of staging) outputParts.push(`<rect x="${position.x + 1.5}" y="${position.y + 1.5}" width="${cellSize - 3}" height="${cellSize - 3}" fill="none" stroke="#22c55e" stroke-width="2"/>`);
  const control = [2001, 2002, 2003].map((x) => cell(x, -902, index));
  for (const position of control) outputParts.push(`<rect x="${position.x + 1.5}" y="${position.y + 1.5}" width="${cellSize - 3}" height="${cellSize - 3}" fill="none" stroke="#fbbf24" stroke-width="2"/>`);
  return outputParts.join('');
};
const legend = [
  ['#101827', 'air'], ['#334155', 'blackstone support'], ['#f59e0b', 'OFF lever'],
  ['#f43f5e', 'wire power 0'], ['#a78bfa', 'unlit lamp'], ['#0ea5e9', 'fluid'],
  ['#f97316', 'door'], ['#475569', 'deepslate boundary'], ['#94a3b8', 'andesite structure'],
];
const legendSvg = legend.map(([fill, label], index) => {
  const x = 64 + index * 142;
  return `<rect x="${x}" y="${svgHeight - 43}" width="13" height="13" fill="${fill}"/><text x="${x + 19}" y="${svgHeight - 32}" class="legend">${label}</text>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
<style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:24px;font-weight:800}.subtitle{font-size:18px;font-weight:700}.axis{font-size:10px;fill:#aab3c3}.legend{font-size:12px;fill:#cbd5e1}.note{font-size:14px;fill:#cbd5e1}</style>
<rect width="100%" height="100%" fill="#0b1020"/><text x="64" y="28" class="title">${title}</text>
${drawPanel(165, 0)}${drawPanel(166, 1)}
<text x="64" y="${svgHeight - 70}" class="note">green outlines: only interaction staging feet cells (2001..2003,165,-899) · amber outlines: retained non-accepted control line (x=2001..2003,z=-902)</text>
${legendSvg}</svg>`;

const report = {
  schemaVersion: 1,
  id: 'MP01-CONTROL-STAGING-IMMUTABLE-SOURCE-MAP-01',
  status: 'PASS_EXACT_RETAINED_OFF_CONTROL_AND_STAGING_MAP',
  snapshot: relative(snapshot),
  intake: intakePath ? relative(intakePath) : null,
  map: relative(output),
  mapBounds: { minX, maxX, minY: Math.min(...levels), maxY: Math.max(...levels), minZ, maxZ },
  exactRetainedOffControl: Object.fromEntries(expected),
  stagingSquares: [2001, 2002, 2003].map((x) => ({ x, y: 165, z: -899, state: at(x, 165, -899) })),
  cellCount: states.size,
};
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(absolute(output)), { recursive: true });
fs.writeFileSync(absolute(output), svg);
fs.writeFileSync(`${absolute(output)}.json`, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
