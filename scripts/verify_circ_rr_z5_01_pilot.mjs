#!/usr/bin/env node
/** CIRC-RR-Z5-01 — Raven Rock shaft flight F01 pilot verification (read-only). */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-civic-interiors-source-20260822T180000Z';
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));

const stairs = [];
for (let x = 193; x <= 207; x += 1) {
  for (let y = -12; y <= 67; y += 1) {
    for (let z = -22; z <= -8; z += 1) {
      const state = await reader.blockState(x, y, z);
      if (state.Name.includes('_stairs')) {
        stairs.push({ x, y, z, name: state.Name.replace('minecraft:', ''), facing: state.Properties?.facing ?? null });
      }
    }
  }
}

const xColumns = {};
for (const s of stairs) xColumns[s.x] = (xColumns[s.x] ?? 0) + 1;
const minY = Math.min(...stairs.map((s) => s.y));
const maxY = Math.max(...stairs.map((s) => s.y));

const report = {
  schemaVersion: 1,
  id: 'circ-rr-z5-01-pilot-verification',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  source: { path: SNAPSHOT },
  structure: { id: 'RR-Z5', name: 'Surface access shaft' },
  stairCellCount: stairs.length,
  stairXColumns: xColumns,
  verticalExtent: `${minY}..${maxY}`,
  finding: {
    status: 'PILOT_VERIFICATION',
    classification: 'one-wide-service-shaft',
    traversable: true,
    publicGrade: false,
    reason: 'RR-Z5 flight is a single-column (x=197) 150-cell diagonal stair within a narrow iron-walled shaft. It is mechanically walkable but not two-clear-wide and lacks the public-grade guard/light/signage standard. Adjacent columns are occupied by iron walls, so it cannot be widened without breaching the shaft envelope.',
    requiredBeforePublic: [
      'two-clear width (requires shaft expansion or alternate route)',
      '3-clear headroom verification',
      'guard/edge cue',
      'lighting cadence',
      'signed-return',
      'normal-walk bidirectional QA',
    ],
  },
};

const dir = `data/world-review/circ-rr-z5-01-pilot-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'rr-z5-01-pilot.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'rr-z5-01-pilot.md'), [
  '# CIRC-RR-Z5-01 — Raven Rock shaft flight F01 pilot verification',
  '',
  'Status: **PILOT VERIFICATION (read-only)**',
  '',
  `- Stair cells: ${stairs.length}`,
  `- X columns: ${JSON.stringify(xColumns)}`,
  `- Vertical extent: ${minY}..${maxY}`,
  '',
  '## Finding',
  `- **${report.finding.classification}** — mechanically traversable (${report.finding.traversable}) but **not public-grade** (${report.finding.publicGrade}).`,
  `- ${report.finding.reason}`,
  '',
  'Required before any public claim:', ...report.finding.requiredBeforePublic.map((r) => `- ${r}`),
].join('\n'));

process.stdout.write(`${JSON.stringify({ status: 'WRITTEN', out: dir, stairCells: stairs.length, publicGrade: report.finding.publicGrade }, null, 2)}\n`);
