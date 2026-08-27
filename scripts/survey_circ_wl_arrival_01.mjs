#!/usr/bin/env node
/** CIRC-WL-ARRIVAL-01 — Westlight arrival circulation survey (read-only). */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-civic-interiors-source-20260822T180000Z';
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));

// Approach Road centerline points, in route order (Ravensgate -> Westlight).
const centerline = [
  [-344, -486],
  [-320, -490],
  [-300, -493],
  [-280, -496],
  [-260, -498],
  [-240, -499],
  [-220, -500],
  [-200, -500],
  [-180, -500],
  [-160, -500],
  [-148, -500],
];

const surf = [];
for (const [x, z] of centerline) {
  const state = await reader.blockState(x, 68, z);
  surf.push({ x, z, block: state.Name.replace('minecraft:', '') });
}

const report = {
  schemaVersion: 1,
  id: 'circ-wl-arrival-01-survey',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  source: { path: SNAPSHOT },
  roadCenterlineSurface: surf,
  finding: {
    status: 'EVIDENCE_GAP',
    classification: 'paved-but-unverified-pedestrian-edge',
    reason: 'The Westlight arrival / Approach Road area is paved (gray concrete at the Westlight plaza end, dirt/stone along the road). The survey does not prove a continuous two-clear pedestrian edge, grade transitions, bridge-stair geometry, shoulders, or lighting. A fresh exact-cell survey of those elements is required before any pedestrian-edge construction.',
    requiredBeforeBuild: [
      'two-clear-wide pedestrian edge',
      'grade/bridge-stair geometry',
      'shoulders and stopping bay',
      'lighting cadence',
      'both-direction walking',
      'exact-cell conflict check',
    ],
  },
};

const dir = `data/world-review/circ-wl-arrival-01-survey-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'wl-arrival-01-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(dir, 'wl-arrival-01-survey.md'), [
  '# CIRC-WL-ARRIVAL-01 — Westlight arrival circulation survey',
  '',
  'Status: **EVIDENCE GAP (read-only)**',
  '',
  '## Road centerline surface',
  ...surf.map((s) => `- (${s.x},${s.z}): ${s.block}`),
  '',
  '## Finding',
  `- **${report.finding.classification}** — the Westlight arrival / Approach Road is paved but the pedestrian-edge quality is unverified.`,
  `- ${report.finding.reason}`,
  '',
  'Required before any build:', ...report.finding.requiredBeforeBuild.map((r) => `- ${r}`),
].join('\n'));

process.stdout.write(`${JSON.stringify({ status: 'WRITTEN', out: dir, finding: report.finding.status }, null, 2)}\n`);
