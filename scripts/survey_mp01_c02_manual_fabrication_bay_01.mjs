#!/usr/bin/env node
/** Read-only C02 manual fabrication-bay survey. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1]) throw new Error(`${flag} is required`); return args[i + 1]; };
const snapshot = arg('--snapshot'); const out = arg('--out');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const inspect = async (cells) => Promise.all(cells.map(async ({ x, y, z }) => ({ x, y, z, state: stateToCommandString(await reader.blockState(x, y, z)) })));
const exact = (cells, expected, label) => { const drift = cells.filter((cell) => cell.state !== expected); if (drift.length) throw new Error(`${label} drift: ${JSON.stringify(drift)}`); };
const targets = await inspect([{ x: 2012, y: 168, z: -873 }, { x: 2013, y: 168, z: -873 }]);
const heads = await inspect([{ x: 2012, y: 169, z: -873 }, { x: 2013, y: 169, z: -873 }]);
const supports = await inspect([{ x: 2012, y: 167, z: -873 }, { x: 2013, y: 167, z: -873 }]);
const approach = await inspect([2015, 2016, 2017].flatMap((x) => [{ x, y: 168, z: -873 }, { x, y: 169, z: -873 }]));
const boundary = await inspect([{ x: 2011, y: 168, z: -873 }, { x: 2014, y: 168, z: -873 }]);
const envelope = await inspect(Array.from({ length: 9 }, (_, dx) => Array.from({ length: 5 }, (_, dy) => ({ x: 2009 + dx, y: 167 + dy, z: -873 }))).flat());
exact(targets, 'minecraft:air', 'C02 targets'); exact(heads, 'minecraft:air', 'C02 head clearance'); exact(supports, 'minecraft:light_gray_concrete', 'C02 supports'); exact(approach, 'minecraft:air', 'C02 approach');
if (boundary.some((cell) => cell.state === 'minecraft:air')) throw new Error('C02 enclosing boundary unexpectedly open');
const water = envelope.filter((cell) => cell.state.includes('water')); if (water.length) throw new Error(`C02 water in local envelope: ${JSON.stringify(water)}`);
const report = { status: 'PASS_MP01_C02_MANUAL_FABRICATION_BAY_OFFLINE_READY', snapshot, bay: 'C02', targets, headClearance: heads, floorSupport: supports, enclosingBoundary: boundary, preservedApproach: approach, envelopeWaterCells: water, candidate: { releaseId: 'MP01-C02-MANUAL-FABRICATION-BAY-01', targetStates: [{ x: 2012, y: 168, z: -873, state: 'minecraft:smithing_table' }, { x: 2013, y: 168, z: -873, state: 'minecraft:stonecutter[facing=north]' }], nonClaims: ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'] } };
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex'); fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true }); fs.writeFileSync(path.join(ROOT, out), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report, null, 2));
