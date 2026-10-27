#!/usr/bin/env node

/**
 * Publish the second additive 26 August map volume: current source-bound
 * build-contract maps. These are evidence/acceptance maps, never operation
 * drawings or construction-completion claims. Existing map volumes are not
 * rewritten.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const PUBLIC_DIRECTORY = 'current-26-aug-build-contract-maps';
const OUTPUT_ROOT = path.join(SITE_ROOT, 'public', PUBLIC_DIRECTORY);

const maps = [
  {
    id: 'mp03-b07-vertical',
    plan: 'MP03 / MP05',
    state: 'HELD INTEGRATED CONTAINMENT / EGRESS',
    title: 'B07 vertical containment, gravity, and egress gate',
    caption: 'The wet barrier, unsupported gravel, caps, lobby, and receivers are one integrated acceptance problem. No local fragment is released.',
    source: 'data/world-review/mp03-b07-vertical-acceptance-contract-01-sys03-post-20260826T153100Z/mp03-b07-vertical-acceptance-map.svg',
    filename: '01-mp03-b07-vertical-containment-gravity-egress.svg',
  },
  {
    id: 'mp06-road-threshold',
    plan: 'MP06 / SYS-04',
    state: 'ROUTE PRESENT / THRESHOLDS HELD',
    title: 'Western Approach Road route thresholds',
    caption: 'The 207-station route is already present; exact protected district thresholds need acceptance before any route-use survey, not paving.',
    source: 'data/world-review/mp06-road-route-threshold-contract-01-mp01-anvil-post-20260826T163300Z/mp06-road-route-threshold-map.svg',
    filename: '02-mp06-road-route-thresholds.svg',
  },
  {
    id: 'mp09-long-water',
    plan: 'MP09 / SYS-04',
    state: 'HELD HYDROLOGY / GRADE',
    title: 'Long Water hydrology, ownership, and grade gate',
    caption: 'A vertically open fluid component prevents an isolated bridge, liner, or paving release until complete containment and receiver ownership exist.',
    source: 'data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z/mp09-long-water-hydrology-ownership-grade-acceptance-map.svg',
    filename: '03-mp09-long-water-hydrology-grade.svg',
  },
  {
    id: 'mp10-library-annex',
    plan: 'MP10',
    state: 'HELD LIBRARY / LOGGIA INTERFACE',
    title: 'Ravensreach library perimeter and annex gate',
    caption: 'No valid 3×3 landing is present at the five transition levels; protected fixtures and the Library/Loggia seam remain default-deny.',
    source: 'data/world-review/mp10-rrch-library-perimeter-annex-contract-02-mp01-anvil-post-20260826T163300Z/mp10-rrch-library-perimeter-annex-acceptance-map.svg',
    filename: '04-mp10-library-perimeter-annex.svg',
  },
  {
    id: 'mp12-gatehead',
    plan: 'MP12 / MP13',
    state: 'ROUTE PRESENT / FACADE PROTECTED',
    title: 'Gatehead district-to-venue interface',
    caption: 'The southern alignment is already built; the north façade is protected and the remaining work belongs to a future district/venue access design.',
    source: 'data/world-review/mp12-gatehead-district-venue-interface-contract-01-sys03-post-20260826T153256Z/mp12-gatehead-district-venue-interface-acceptance-map-01.svg',
    filename: '05-mp12-gatehead-district-venue.svg',
  },
  {
    id: 'mp13-access-egress',
    plan: 'MP13',
    state: 'HELD ACCESS / EGRESS',
    title: 'Westlight Venue access and egress acceptance gate',
    caption: 'Every access-class cell and directional face remains unreviewed; the public-to-backstage path must be eliminated without breaking staff continuity.',
    source: 'data/world-review/mp13-access-egress-acceptance-contract-01-sys03-post-20260826T153100Z/mp13-access-egress-acceptance-coordinate-map.svg',
    filename: '06-mp13-access-egress-acceptance.svg',
  },
];

const fail = (condition, message) => {
  if (!condition) throw new Error(`Build-contract map sync rejected: ${message}`);
};
const hash = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
const publishedMaps = maps.map((map) => {
  fail(!map.filename.includes('..') && !path.isAbsolute(map.filename), `unsafe filename ${map.filename}`);
  const source = path.join(REPO_ROOT, map.source);
  const destination = path.join(OUTPUT_ROOT, map.filename);
  fail(fs.existsSync(source), `missing source ${map.source}`);
  const sha256 = hash(source);
  if (fs.existsSync(destination)) {
    fail(hash(destination) === sha256, `destination drift ${map.filename}`);
  } else {
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fail(hash(destination) === sha256, `copy mismatch ${map.filename}`);
  }
  return { ...map, href: `/${PUBLIC_DIRECTORY}/${map.filename}`, sha256 };
});

const manifest = {
  schemaVersion: 1,
  publication: {
    title: 'Current 26 August build-contract map volume',
    status: 'READ_ONLY_SOURCE_BOUND_ACCEPTANCE_EVIDENCE_NOT_CONSTRUCTION_COMPLETION',
    publishedDirectory: `/${PUBLIC_DIRECTORY}`,
    mapCount: publishedMaps.length,
    historyPolicy: 'Additive. Existing atlases and decision-map volumes are preserved unchanged.',
  },
  maps: publishedMaps,
};
const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestPath = path.join(OUTPUT_ROOT, 'publication-manifest.json');
if (fs.existsSync(manifestPath)) {
  fail(fs.readFileSync(manifestPath, 'utf8') === manifestBody, 'manifest drift; create a new volume instead');
} else {
  fs.writeFileSync(manifestPath, manifestBody, { flag: 'wx' });
}

process.stdout.write(`${JSON.stringify({ status: 'PASS_BUILD_CONTRACT_MAP_SYNC_20260826', mapCount: publishedMaps.length, output: path.relative(SITE_ROOT, OUTPUT_ROOT) }, null, 2)}\n`);
