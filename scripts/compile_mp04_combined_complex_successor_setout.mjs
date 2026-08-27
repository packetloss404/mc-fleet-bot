#!/usr/bin/env node
/**
 * MP04 Combined Complex successor setout.
 *
 * Read-only compiler for whether MP04 can issue an independent current-world
 * inter-site connection.  It fails closed if the connection belongs to the
 * Masterplan 05 transformed domains, if the three sites lack one common
 * current source, or if a required leg is wet.  It deliberately emits no
 * Minecraft operation when those conditions are present.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const HISTORICAL_COMMON = value('--historical-common', 'data/worldsnap-r08am-post-20260822T161818Z');
const B03_B08_POST = value('--b03-b08-post', 'data/worldsnap-b03-access-post-20260825T003200Z');
const B07_POST = value('--b07-post', 'data/worldsnap-combined-zones-r09l-post-20260824T021413Z');
const OUT_DIR = value('--out-dir', 'data/world-review');
const BASENAME = value('--basename', 'mp04-combined-complex-successor-setout-20260826');
const GENERATED_AT = value('--generated-at', '2026-08-26T071500Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP04 successor setout rejected: ${message}`); };
const read = (filename) => fs.readFileSync(absolute(filename), 'utf8');
const snapshotRegions = (root) => fs.readdirSync(absolute(path.join(root, 'region'))).filter((name) => name.endsWith('.mca')).sort();
const snapshotIdentity = (root) => {
  const hash = crypto.createHash('sha256');
  const regions = snapshotRegions(root);
  for (const name of regions) { hash.update(name); hash.update('\0'); hash.update(fs.readFileSync(absolute(path.join(root, 'region', name)))); hash.update('\0'); }
  return { root, regionFiles: regions, sha256: hash.digest('hex') };
};
const authority = 'docs/masterplans/04-combined-complex/AUTHORITY.md';
const authorityText = read(authority);
fail(authorityText.includes('Masterplan 05 owns placement in the accepted current world'), 'MP04->MP05 placement authority text drifted');
fail(authorityText.includes('no approved block-rounding policy'), 'inactive vertical-study hold text drifted');

/* World anchors adopted by MP04’s placement bridge. Every one lies in a
 * Masterplan 05 transformed P1 domain; none is a free MP04-only parcel. */
const anchors = {
  houstonB07: { x: 2108, y: 72, z: -398, owner: 'P1-B07 / MP05 (Houston shaft)' },
  subtropolisB08: { x: 1948, y: 72, z: -628, owner: 'P1-B08 / MP05 (service tunnel)' },
  serviceContact: { x: 2008, y: 130, z: -688, owner: 'P1-B08 / MP05 (service contact)' },
  cheyenneB03: { x: 2048, y: 130, z: -748, owner: 'P1-B03 / MP05 (Cheyenne portal)' },
};
const regionFor = ({ x, z }) => `r.${Math.floor(Math.floor(x / 16) / 32)}.${Math.floor(Math.floor(z / 16) / 32)}.mca`;
const sourceCoverage = [
  { id: 'b03-b08-post', identity: snapshotIdentity(B03_B08_POST) },
  { id: 'b07-post', identity: snapshotIdentity(B07_POST) },
  { id: 'historical-common', identity: snapshotIdentity(HISTORICAL_COMMON) },
].map((source) => ({
  ...source,
  anchorCoverage: Object.fromEntries(Object.entries(anchors).map(([key, anchor]) => [key, source.identity.regionFiles.includes(regionFor(anchor))])),
}));
const b03B08 = sourceCoverage.find((source) => source.id === 'b03-b08-post');
const b07 = sourceCoverage.find((source) => source.id === 'b07-post');
const common = sourceCoverage.find((source) => source.id === 'historical-common');
fail(b03B08.anchorCoverage.subtropolisB08 && b03B08.anchorCoverage.cheyenneB03 && !b03B08.anchorCoverage.houstonB07,
  'B03/B08 post source coverage expectation drifted');
fail(!b07.anchorCoverage.subtropolisB08 && !b07.anchorCoverage.cheyenneB03 && b07.anchorCoverage.houstonB07,
  'B07 post source coverage expectation drifted');
fail(Object.values(common.anchorCoverage).every(Boolean), 'historical common source no longer covers all anchors');

/* The last common source is historical, so it can only prove an offline hold,
 * never a release. It still records the B07 wet boundary exactly. */
const reader = new AnvilReader(absolute(path.join(HISTORICAL_COMMON, 'region')));
const B07_WATER = [
  { x: 2110, y: 5, z: -396 }, { x: 2110, y: 5, z: -395 }, { x: 2110, y: 6, z: -395 },
  { x: 2111, y: 5, z: -396 }, { x: 2111, y: 5, z: -395 },
];
const wetBoundary = [];
for (const cell of B07_WATER) wetBoundary.push({ ...cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
fail(wetBoundary.every(({ state }) => state.startsWith('minecraft:water')), `B07 water boundary drifted: ${JSON.stringify(wetBoundary)}`);

const noIndependentOwnership = Object.entries(anchors).map(([id, anchor]) => ({ id, ...anchor, region: regionFor(anchor) }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  id: 'MP04-COMBINED-COMPLEX-SUCCESSOR-SETOUT',
  status: 'NO_SAFE_INDEPENDENT_MP04_CONNECTION_COMPILED_NO_OPERATIONS',
  authority: {
    source: authority,
    finding: 'MP04 normalizes composition; MP05 exclusively owns current-world transform, external interfaces, and release gates.',
    independentMp04WorldCells: 0,
  },
  anchors: noIndependentOwnership,
  sourceCoverage,
  blockers: [
    {
      id: 'NO_COMMON_CURRENT_THREE_SITE_SOURCE',
      detail: `${B03_B08_POST} covers B08/B03 but not B07; ${B07_POST} covers B07 but not B08/B03. ${HISTORICAL_COMMON} is the last common retained snapshot and is historical only.`,
    },
    {
      id: 'B07_WET_GRAVITY_INTERFACE',
      owner: 'P1-B07 / MP05',
      wetCells: wetBoundary,
      detail: 'Five retained water cells prevent a dry Houston leg; later R09 containment/gravity ownership is outside MP04.',
    },
    {
      id: 'COMBINED_ZONES_OWNERSHIP_OVERLAP',
      detail: 'Every mapped SubTropolis, contact, Cheyenne, and Houston anchor is within an MP05 P1 domain. A route with no Combined Zones overlap has zero possible endpoints.',
    },
  ],
  mutation: { operationCount: 0, operationFiles: [], worldEditsPerformed: false, executionAuthorized: false },
  successorRequired: [
    'a single fresh immutable capture covering B08, B03, and B07 at the same world moment',
    'MP05-owned exact interface contract for B08/B03/B07 and B09 rail separation',
    'B07 dry/gravity-safe successor before a Houston leg',
    'a separately owned current-world connection package; MP04 may retain narrative/anchor acceptance only',
  ],
};
const manifestIdentity = sha256(JSON.stringify(reportWithoutIdentity));
const output = path.join(OUT_DIR, `${BASENAME}.json`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(output), `${JSON.stringify({ ...reportWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: reportWithoutIdentity.status, output: relative(output), manifestIdentity,
  independentMp04WorldCells: 0, commonCurrentSource: false, wetB07Cells: wetBoundary.length, operationCount: 0 }, null, 2));
