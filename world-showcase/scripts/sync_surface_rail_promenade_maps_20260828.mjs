#!/usr/bin/env node

/**
 * Publishes source-bound rail-and-promenade design and as-built maps. Every
 * published copy is immutable: a changed source starts a new dated volume.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const DIRECTORY = 'surface-rail-promenade-2026-08-28-r8';
const OUT = path.join(SITE_ROOT, 'public', DIRECTORY);
const maps = [
  {
    id: 'rail-promenade-cross-section',
    source: 'docs/masterplans/above-ground-double-track-walkway-reference-map.svg',
    filename: '01-double-track-promenade-cross-section.svg',
    title: 'Above-ground double-track rail and protected-promenade cross-section',
    status: 'REFERENCE ENGINEERING STANDARD — DESIGN ONLY',
  },
  {
    id: 'exterior-loop-concept',
    source: 'data/world-review/citywide-surface-loop-network-02-post-20260828T020000Z/citywide-surface-loop-network-02.svg',
    filename: '02-citywide-exterior-loop-concept.svg',
    title: 'Citywide exterior rail-and-promenade loop concept',
    status: 'SOURCE-BOUND CONCEPT SURVEY ONLY',
  },
  {
    id: 'town-outer-loop-spurs',
    source: 'data/world-review/town-outer-loop-spur-network-20260828T040000Z-r2/town-outer-loop-spur-network-map.svg',
    filename: '03-town-outer-loop-and-spurs.svg',
    title: 'Town anchors, retained trunks, and held interface spurs',
    status: 'SOURCE-BOUND STAGED NETWORK DESIGN ONLY',
  },
  {
    id: 'ag0-first-finite-segment',
    source: 'data/world-review/ag0-citywide-exterior-loop-segment-01-20260828T083000Z/ag0-citywide-exterior-loop-segment-01.svg',
    filename: '04-ag0-first-finite-exterior-segment.svg',
    title: 'AG-0 first finite exterior rail-and-promenade survey segment',
    status: 'SOURCE-BOUND SURVEY ONLY — ZERO OPERATIONS',
  },
  {
    id: 'ag1-built-support-plan',
    source: 'data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/post-snapshot-maps/ag1-exterior-loop-post-plan.svg',
    filename: '05-ag1-as-built-pier-and-girder-plan.svg',
    title: 'AG-1 as-built exterior pier and girder support plan',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — SUPPORT ONLY',
  },
  {
    id: 'ag1-built-support-profile',
    source: 'data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/post-snapshot-maps/ag1-exterior-loop-post-section-profile.svg',
    filename: '06-ag1-as-built-pier-and-girder-profile.svg',
    title: 'AG-1 as-built exterior pier and girder profile',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — SUPPORT ONLY',
  },
  {
    id: 'ag2-built-promenade-plan',
    source: 'data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/post-snapshot-maps/ag2-exterior-loop-post-plan.svg',
    filename: '07-ag2-as-built-promenade-plan.svg',
    title: 'AG-2 as-built exterior protected promenade plan',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — CIVIL PROMENADE ONLY',
  },
  {
    id: 'ag2-built-promenade-section',
    source: 'data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/post-snapshot-maps/ag2-exterior-loop-post-section.svg',
    filename: '08-ag2-as-built-promenade-section.svg',
    title: 'AG-2 as-built protected promenade section',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — CIVIL PROMENADE ONLY',
  },
  {
    id: 'ag3-built-passive-rail-plan',
    source: 'data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/post-snapshot-maps/ag3-exterior-loop-post-plan.svg',
    filename: '09-ag3-as-built-passive-rail-plan.svg',
    title: 'AG-3 as-built exterior passive-rail plan',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — PASSIVE RAIL ONLY',
  },
  {
    id: 'ag3-built-passive-rail-section',
    source: 'data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/post-snapshot-maps/ag3-exterior-loop-post-section.svg',
    filename: '10-ag3-as-built-passive-rail-section.svg',
    title: 'AG-3 as-built exterior passive-rail section',
    status: 'AS-BUILT / POST-VERIFIED / REVERSIBLE — PASSIVE RAIL ONLY',
  },
  {
    id: 'ag4-adjacent-continuation-survey',
    source: 'data/world-review/ag4-adjacent-exterior-continuation-survey-02-post-20260827T021200Z/ag4-adjacent-continuation-survey.svg',
    filename: '11-ag4-adjacent-continuation-hold-survey.svg',
    title: 'AG-4 adjacent exterior continuation hold survey',
    status: 'SOURCE-BOUND HOLD SURVEY — ZERO OPERATIONS',
  },
  {
    id: 'ag4-gap-hydrology-gravity-decision',
    source: 'data/world-review/ag4-gap-hydrology-gravity-containment-01-post-20260827T021200Z/ag4-gap-hydrology-gravity-containment-01.svg',
    filename: '12-ag4-gap-hydrology-gravity-hold.svg',
    title: 'AG-4 water and gravity containment decision',
    status: 'SOURCE-BOUND FAIL-CLOSED HYDROLOGY DECISION — ZERO OPERATIONS',
  },
];

const digest = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`Surface rail-promenade map sync rejected: ${message}`);
};

fs.mkdirSync(OUT, { recursive: true });
const published = maps.map((map) => {
  const source = path.join(REPO_ROOT, map.source);
  const destination = path.join(OUT, map.filename);
  fail(fs.existsSync(source), `missing source ${map.source}`);
  const sha256 = digest(source);
  if (fs.existsSync(destination)) {
    fail(digest(destination) === sha256, `published asset drift ${map.filename}`);
  } else {
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fail(digest(destination) === sha256, `copy hash drift ${map.filename}`);
  }
  return { ...map, href: `/${DIRECTORY}/${map.filename}`, sha256 };
});

const manifest = {
  schemaVersion: 1,
  status: 'MIXED_SOURCE_BOUND_DESIGN_SURVEY_AND_AS_BUILT_EVIDENCE_NOT_SERVICE_EVIDENCE',
  title: 'Above-ground rail-and-promenade map set — 28 August 2026',
  maps: published,
};
const manifestPath = path.join(OUT, 'publication-manifest.json');
const content = `${JSON.stringify(manifest, null, 2)}\n`;
if (fs.existsSync(manifestPath)) {
  fail(fs.readFileSync(manifestPath, 'utf8') === content, 'manifest drift; publish a new dated volume');
} else {
  fs.writeFileSync(manifestPath, content, { flag: 'wx' });
}

process.stdout.write(`${JSON.stringify({ status: 'PASS_SURFACE_RAIL_PROMENADE_MAPS_SYNCED', output: path.relative(SITE_ROOT, OUT), mapCount: published.length }, null, 2)}\n`);
