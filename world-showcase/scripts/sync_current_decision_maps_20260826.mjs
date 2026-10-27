#!/usr/bin/env node

/**
 * Publish an explicitly non-construction 26 August decision-map volume.
 *
 * The files are exact, additive copies of current-source evidence maps. This
 * script deliberately never replaces a historical atlas or re-labels held
 * interfaces as built work. A pre-existing destination must be byte-identical
 * to its recorded source.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const PUBLIC_DIRECTORY = 'current-26-aug-decision-maps';
const OUTPUT_ROOT = path.join(SITE_ROOT, 'public', PUBLIC_DIRECTORY);
const CURRENT_SYS03_REGION_SHA256 = '3e0d739e5ceda6fb9a828e9b5947e15d00864f7f15f54d1c099e011477e3bcfd';

const maps = [
  {
    id: 'mp01-control-state',
    source: 'data/world-review/mp01-access-control-successor-sys03-post-20260826T154546Z/mp01-control-staging-immutable-source-map.svg',
    filename: '01-mp01-control-staging-source-state.svg',
    plan: 'MP01',
    state: 'HELD CONTROL INTERFACE',
    title: 'Cheyenne control-staging source state',
    caption: 'Observed OFF indicator topology. It is not a commissioned control and it authorizes no door, utility, or route connection.',
  },
  {
    id: 'mp01-access-authority',
    source: 'data/world-review/mp01-access-control-successor-sys03-post-20260826T154546Z/mp01-access-authority-topology.svg',
    filename: '02-mp01-access-authority-topology.svg',
    plan: 'MP01',
    state: 'HELD CONTROL INTERFACE',
    title: 'Cheyenne access-authority topology',
    caption: 'Current boundary and authorization topology. Runtime interaction proof is still required before a control release.',
  },
  {
    id: 'mp02-mp04-successor-gate',
    source: 'data/world-review/mp02-mp04-functional-successor-current-sys03-post-20260826T153100Z/assessment/mp02-mp04-functional-successor-gate.svg',
    filename: '03-mp02-mp04-functional-successor-gate.svg',
    plan: 'MP02 / MP04',
    state: 'HELD OWNERSHIP INTERFACE',
    title: 'SubTropolis / connector functional-successor gate',
    caption: 'The raw continuation is not an owned room, egress route, or transfer. MP04 owns no current-world cells.',
  },
  {
    id: 'mp02-b08-handoff',
    source: 'data/world-review/mp02-mp04-functional-successor-current-sys03-post-20260826T153100Z/mp02-current-successor/mp02-b08-current-successor-map.svg',
    filename: '04-mp02-b08-handoff-and-void.svg',
    plan: 'MP02',
    state: 'HELD OWNERSHIP INTERFACE',
    title: 'B08 handoff and remaining void',
    caption: 'The 719-cell restricted service spine is retained; the remaining void is not a finished chamber, public entry, or egress route.',
  },
  {
    id: 'mp05-b07-gate',
    source: 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/b07-next-action-prerequisite-map.svg',
    filename: '05-mp05-b07-prerequisite-gate.svg',
    plan: 'MP05',
    state: 'HELD INTEGRATED RELEASE',
    title: 'B07 first-release prerequisite gate',
    caption: 'Ownership, containment, gravity, receiver, and route conditions must resolve as one exact package; no independent B07 subphase is released.',
  },
  {
    id: 'mp05-b07-containment',
    source: 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/containment/b07-containment-gravity-projection.svg',
    filename: '06-mp05-b07-containment-and-gravity.svg',
    plan: 'MP05',
    state: 'HELD FLUID / GRAVITY INTERFACE',
    title: 'B07 containment and gravity constraints',
    caption: 'A source-state constraint map, not a construction drawing or an approved fluid receiver.',
  },
  {
    id: 'mp05-b07-surface',
    source: 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/surface/b07-surface-receiver-decision-plane.svg',
    filename: '07-mp05-b07-surface-receiver-decision-plane.svg',
    plan: 'MP05',
    state: 'HELD SURFACE RECEIVER',
    title: 'B07 surface receiver decision plane',
    caption: 'Local geometry is observed, but no exterior face is a classified receiver, doorway, or egress endpoint.',
  },
  {
    id: 'mp08-c1',
    source: 'data/world-review/mp08-c1-contained-route-screen-04-sys03-post-20260826T153100Z/mp08-c1-containment-and-interface-map.svg',
    filename: '08-mp08-c1-containment-and-interfaces.svg',
    plan: 'MP08',
    state: 'HELD CONTAINMENT / ENDPOINTS',
    title: 'C1 containment and interface screen',
    caption: 'The dry three-wide observation is not an accepted route: roof, floor, cavern thresholds, ownership, drainage, and returns remain unresolved.',
  },
  {
    id: 'mp13-lower-topology',
    source: 'data/world-review/mp13-westlight-venue-sys03-post-rescreen-20260826T153100Z/design/mp13-high-deck-lower-topology-map.svg',
    filename: '09-mp13-lower-public-staff-topology.svg',
    plan: 'MP13',
    state: 'HELD EGRESS / ACCESS INTERFACE',
    title: 'Westlight lower public / staff topology',
    caption: 'The observed public-to-staff connections fail safe partitioning. This is not an access-control completion.',
  },
  {
    id: 'mp13-tower-section',
    source: 'data/world-review/mp13-westlight-venue-sys03-post-rescreen-20260826T153100Z/design/mp13-high-deck-tower-section-map.svg',
    filename: '10-mp13-west-tower-high-deck-section.svg',
    plan: 'MP13',
    state: 'HELD EGRESS / ACCESS INTERFACE',
    title: 'West service tower / high-deck section',
    caption: 'The vertical shell is staff-only and does not satisfy public egress or accessibility requirements.',
  },
  {
    id: 'sys03-plan',
    source: 'docs/masterplans/02-visuals/sys03-r10-high16-descending-bypass-plan-2026-08-26.svg',
    filename: '11-sys03-high16-descending-bypass-plan.svg',
    plan: 'SYS03',
    state: 'AS-BUILT CIVIL-ONLY REFERENCE',
    title: 'High-16 descending bypass plan',
    caption: 'This is a sealed civil void and gravity-safe shell only—not track, a station, public access, or passenger service.',
  },
  {
    id: 'sys03-profile',
    source: 'docs/masterplans/02-visuals/sys03-r10-high16-descending-bypass-profile-2026-08-26.svg',
    filename: '12-sys03-high16-descending-bypass-profile.svg',
    plan: 'SYS03',
    state: 'AS-BUILT CIVIL-ONLY REFERENCE',
    title: 'High-16 staged-gravity / ownership profile',
    caption: 'The retained upper-grid water system and transport interfaces remain held; the profile does not commission a route.',
  },
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Current decision-map sync rejected: ${message}`);
};

const digest = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

const copyExact = (source, destination) => {
  const hash = digest(source);
  if (fs.existsSync(destination)) {
    invariant(digest(destination) === hash, `published asset differs from source: ${path.basename(destination)}`);
    return hash;
  }
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  invariant(digest(destination) === hash, `copy hash drift: ${path.basename(destination)}`);
  return hash;
};

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
const publicationMaps = maps.map((map) => {
  invariant(!map.filename.includes('..') && !path.isAbsolute(map.filename), `unsafe output filename ${map.filename}`);
  const source = path.join(REPO_ROOT, map.source);
  invariant(fs.existsSync(source), `missing evidence map ${map.source}`);
  const sha256 = copyExact(source, path.join(OUTPUT_ROOT, map.filename));
  return { ...map, href: `/${PUBLIC_DIRECTORY}/${map.filename}`, sha256 };
});

const manifest = {
  schemaVersion: 1,
  publication: {
    title: 'Current 26 August decision / held interfaces map volume',
    publishedDirectory: `/${PUBLIC_DIRECTORY}`,
    status: 'READ_ONLY_CURRENT_SOURCE_EVIDENCE_NOT_A_CONSTRUCTION_COMPLETION_RECORD',
    sourceSnapshot: {
      label: 'SYS03 High-16 descending bypass post-state where applicable',
      regionSha256: CURRENT_SYS03_REGION_SHA256,
    },
    mapCount: publicationMaps.length,
    historyPolicy: 'Additive volume. Historical atlas packages are preserved and not overwritten.',
  },
  maps: publicationMaps,
};
const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestPath = path.join(OUTPUT_ROOT, 'publication-manifest.json');
if (fs.existsSync(manifestPath)) {
  invariant(fs.readFileSync(manifestPath, 'utf8') === manifestContent,
    'publication manifest differs; create a new dated volume rather than rewriting this one');
} else {
  fs.writeFileSync(manifestPath, manifestContent, { flag: 'wx' });
}

process.stdout.write(`${JSON.stringify({
  status: 'PASS_CURRENT_DECISION_MAP_VOLUME_20260826_SYNCED',
  output: path.relative(SITE_ROOT, OUTPUT_ROOT),
  mapCount: publicationMaps.length,
  sourceRegionSha256: CURRENT_SYS03_REGION_SHA256,
}, null, 2)}\n`);
