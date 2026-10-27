#!/usr/bin/env node
/**
 * MP01 commissioning-access successor design.
 *
 * This is intentionally a read-only authority/topology screen.  It does not
 * pathfind, change the civic leash, create catalog records, or treat a
 * straight line as a traversable route.  Its job is to bind the next proper
 * normal-walk survey to a current complete snapshot and to make every missing
 * ownership, anchor, and return-path obligation visible before a bot moves.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (name) => {
  const result = option(name);
  if (!result) throw new Error(`${name} is required`);
  return result;
};
const resolve = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, resolve(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (filename) => fs.readFileSync(resolve(filename));
const readJson = (filename) => JSON.parse(read(filename));
const write = (filename, value) => {
  fs.mkdirSync(path.dirname(resolve(filename)), { recursive: true });
  fs.writeFileSync(resolve(filename), `${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`);
};
const hashSnapshot = (snapshot) => {
  const files = [];
  for (const directory of ['region', 'entities', 'poi']) {
    const absolute = path.join(resolve(snapshot), directory);
    for (const name of fs.readdirSync(absolute).filter((name) => name.endsWith('.mca')).sort()) {
      files.push(path.join(directory, name));
    }
  }
  files.push('level.dat');
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(fs.readFileSync(path.join(resolve(snapshot), file)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), memberCount: files.length };
};
const requestJson = (url) => new Promise((resolvePromise, reject) => {
  const request = http.get(url, { timeout: 5000 }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      if (response.statusCode !== 200) return reject(new Error(`status endpoint returned ${response.statusCode}`));
      try { resolvePromise(JSON.parse(body)); } catch (error) { reject(error); }
    });
  });
  request.once('timeout', () => request.destroy(new Error('status endpoint timed out')));
  request.once('error', reject);
});
const distance2d = (left, right) => Math.hypot(left.x - right.x, left.z - right.z);

const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const snapshot = required('--snapshot');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const statusUrl = option('--status-url', 'http://127.0.0.1:3001/api/bots');
const selectedBot = option('--bot', 'Architect');
const configPath = 'config.yml';
const markersPath = 'data/markers.json';
const routesPath = 'data/routes.json';
const zonesPath = 'data/zones.json';
const databasePath = 'data/world-map.db';
const target = { x: 2002, y: 165, z: -899 };
const stagingSquares = [2001, 2002, 2003].map((x) => ({ x, y: 165, z: -899 }));
const config = yaml.load(read(configPath));
const markers = readJson(markersPath);
const routes = readJson(routesPath);
const zones = readJson(zonesPath);
const capture = readJson(path.join(snapshot, 'combined-zones-complete-save-capture.json'));
const snapshotIdentity = hashSnapshot(snapshot);
const response = await requestJson(statusUrl);
const bots = Array.isArray(response.bots) ? response.bots : [];
const bot = bots.find((candidate) => String(candidate.name).toLowerCase() === selectedBot.toLowerCase());
if (!bot?.position || !Number.isFinite(bot.position.x) || !Number.isFinite(bot.position.y) || !Number.isFinite(bot.position.z)) {
  throw new Error(`selected bot ${selectedBot} lacks an exact observed position`);
}
const boundary = (config.leash ?? []).find((entry) => String(entry.botName).toLowerCase() === selectedBot.toLowerCase());
if (!boundary) throw new Error(`selected bot ${selectedBot} has no civic-mobility boundary`);
const home = { x: boundary.x, z: boundary.z, radius: boundary.radius };
const homeTargetGap = Math.max(0, distance2d(home, target) - home.radius);
const departure = { x: bot.position.x, y: bot.position.y, z: bot.position.z };
const geometricLineLength = distance2d(departure, target);
const markerAtTarget = markers.filter((marker) => marker.position.x >= 2001 && marker.position.x <= 2003
  && marker.position.z >= -902 && marker.position.z <= -899);
const routeAtTarget = routes.filter((route) => route.waypointIds.some((id) => markerAtTarget.some((marker) => marker.id === id)));
const db = new Database(resolve(databasePath), { readonly: true });
const featureCount = db.prepare('SELECT count(*) AS count FROM world_features').get().count;
const targetFeatures = db.prepare(`SELECT id, project_id, name, kind, status, min_x, max_x, min_z, max_z
  FROM world_features WHERE min_x <= ? AND max_x >= ? AND min_z <= ? AND max_z >= ? ORDER BY id`)
  .all(2003, 2001, -899, -902);
const betweenFeatures = db.prepare(`SELECT project_id, count(*) AS count FROM world_features
  WHERE min_x <= ? AND max_x >= ? AND min_z <= ? AND max_z >= ? GROUP BY project_id ORDER BY project_id`)
  .all(Math.max(departure.x, target.x), Math.min(departure.x, target.x), Math.max(departure.z, target.z), Math.min(departure.z, target.z));
db.close();

const allNamedCorridors = (boundary.corridors ?? []).map((corridor) => ({ name: corridor.name, width: corridor.width, waypointCount: corridor.waypoints?.length ?? 0 }));
const report = {
  schemaVersion: 1,
  id: 'MP01-COMMISSIONING-ACCESS-CORRIDOR-DESIGN-02',
  status: 'NO_BUILD_READY_NORMAL_WALK_DELTA_DEFAULT_DENY',
  generatedAtUtc,
  source: {
    immutableSnapshot: {
      path: relative(snapshot),
      sha256: snapshotIdentity.sha256,
      memberCount: snapshotIdentity.memberCount,
      captureId: capture.captureId,
      capturedAtUtc: capture.capturedAtUtc,
      immutableCopy: capture.immutableCopy === true,
      worldIdentity: capture.worldIdentity,
    },
    controlFiles: Object.fromEntries([configPath, markersPath, routesPath, zonesPath, databasePath,
      'src/control/CivicMobility.ts', 'src/bot/BotInstance.ts'].map((filename) => [filename, sha256(read(filename))])),
    liveStatus: { url: statusUrl, observedAtUtc: generatedAtUtc, selectedBot },
  },
  exactKnownEndpoints: {
    observedDeparture: departure,
    departureStatus: `${bot.state ?? 'UNKNOWN'} / ${bot.mode ?? 'UNKNOWN'}`,
    stagingSquares,
    controlLever: { x: 2001, y: 166, z: -902 },
    straightLineDistanceBlocks: Number(geometricLineLength.toFixed(3)),
    nearestCurrentApprovedAreaGapBlocks: Number(homeTargetGap.toFixed(3)),
  },
  currentAuthorization: {
    selectedBoundary: { home, destinations: boundary.destinations ?? [], corridors: allNamedCorridors },
    targetMarkerCount: markerAtTarget.length,
    targetRouteCount: routeAtTarget.length,
    targetDurableFeatureCount: targetFeatures.length,
    totalDurableFeatureCount: featureCount,
    boundingBoxFeatureCountsByProject: betweenFeatures,
    finding: 'No MP01/Cheyenne durable owner, route endpoint, or staging marker covers the interaction envelope. Feature records intersecting the broad endpoint bounding box are not route authority.',
  },
  proposedSurveyContractOnly: {
    id: 'MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01',
    status: 'REQUIRED_BEFORE_ANY_MOBILITY_OR_CONFIG_CHANGE',
    designatedBot: selectedBot,
    requiredRouteProperties: {
      cardinalOnly: true,
      maximumAdjacentStep: 1,
      feetCells: 'every outbound and return cell as exact x,y,z',
      floorAndHeadroom: 'solid footing and two clear blocks at every route cell',
      prohibited: ['digging', 'towering', 'parkour', 'swimming', 'closed-door traversal', 'teleport', 'RCON movement', 'freeform pathfinder probe'],
    },
    mandatoryEvidence: [
      'fresh complete immutable snapshot immediately before the route survey',
      'an exact destination-side staging and distinct return/recovery anchor',
      'a complete per-cell physical classification for both directions',
      'exact durable owner or reviewed interface owner for every route cell and all crossings',
      'offline civic-mobility patch limited to the inspected centerline/width, staging squares, and return anchor',
      'offline tests proving rejected steps outside the route and permitted samples only inside it',
      'fresh source comparison and live entity clearance at every supervised checkpoint before movement',
    ],
    forbiddenShortcuts: ['a direct destination circle', 'a broad straight-line corridor', 'catalog-only authorization', 'home-radius expansion', 'temporary leash relaxation'],
  },
  decision: {
    physicalOperationEmitted: false,
    configPatchEmitted: false,
    markerOrRouteEmitted: false,
    botMovementPerformed: false,
    rconPerformed: false,
    reasonCodes: [
      'NO_EXACT_OWNED_ROUTE_CELLS',
      'NO_BIDIRECTIONAL_NORMAL_WALK_SURVEY',
      'NO_STAGING_OR_RETURN_ANCHOR',
      'NO_NARROW_OFFLINE_MOBILITY_PATCH_TO_TEST',
      'NO_FRESH_CHECKPOINT_DRIFT_PROTOCOL',
    ],
  },
  nonClaims: ['safe route', 'safe arrival', 'safe return', 'control commissioning', 'public/service access', 'MP01 completion'],
};
report.payloadSha256 = sha256(JSON.stringify(report));

const view = { minX: -180, maxX: 2100, minZ: -1050, maxZ: 180, width: 1320, height: 720 };
const point = ({ x, z }) => ({
  x: 58 + ((x - view.minX) / (view.maxX - view.minX)) * (view.width - 116),
  y: 36 + ((view.maxZ - z) / (view.maxZ - view.minZ)) * (view.height - 92),
});
const pDeparture = point(departure);
const pTarget = point(target);
const pHome = point(home);
const corridorPoints = (boundary.corridors?.[0]?.waypoints ?? []).map(point).map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" viewBox="0 0 ${view.width} ${view.height}">
<style>text{font-family:Inter,Arial,sans-serif;fill:#e5e7eb}.small{font-size:13px}.label{font-size:16px;font-weight:700}.title{font-size:25px;font-weight:800}.muted{fill:#aab3c3}.grid{stroke:#293241;stroke-width:1}.danger{stroke:#ef4444}.safe{stroke:#22c55e}.amber{stroke:#f59e0b}</style>
<rect width="100%" height="100%" fill="#0b1020"/><text x="58" y="30" class="title">MP01 Commissioning Access — authority topology, not a travel map</text>
${[-1000,-750,-500,-250,0].map((z) => { const y = point({x:0,z}).y; return `<line x1="58" y1="${y}" x2="${view.width-58}" y2="${y}" class="grid"/><text x="12" y="${y+4}" class="small muted">z ${z}</text>`; }).join('')}
${[0,500,1000,1500,2000].map((x) => { const px = point({x,z:0}).x; return `<line x1="${px}" y1="36" x2="${px}" y2="${view.height-56}" class="grid"/><text x="${px-18}" y="${view.height-33}" class="small muted">x ${x}</text>`; }).join('')}
<polyline points="${corridorPoints}" fill="none" stroke="#22c55e" stroke-width="8" opacity=".85"/><text x="${pHome.x-38}" y="${pHome.y-22}" class="label">current civic area</text><circle cx="${pHome.x}" cy="${pHome.y}" r="10" fill="#22c55e"/>
<line x1="${pDeparture.x}" y1="${pDeparture.y}" x2="${pTarget.x}" y2="${pTarget.y}" class="danger" stroke-width="5" stroke-dasharray="12 10"/><text x="${(pDeparture.x+pTarget.x)/2-122}" y="${(pDeparture.y+pTarget.y)/2-14}" class="label" fill="#fca5a5">${geometricLineLength.toFixed(0)} blocks: UNSURVEYED / UNOWNED</text>
<circle cx="${pDeparture.x}" cy="${pDeparture.y}" r="9" fill="#f59e0b"/><text x="${pDeparture.x+14}" y="${pDeparture.y-12}" class="label">${selectedBot} observed feet</text><text x="${pDeparture.x+14}" y="${pDeparture.y+8}" class="small muted">(${departure.x}, ${departure.y}, ${departure.z}) — not a route authorization</text>
<rect x="${pTarget.x-12}" y="${pTarget.y-12}" width="24" height="24" rx="3" fill="#ef4444"/><text x="${pTarget.x-278}" y="${pTarget.y-22}" class="label">MP01 staging 2001..2003,165,-899</text><text x="${pTarget.x-278}" y="${pTarget.y-2}" class="small muted">0 durable owner / 0 marker / 0 catalog route</text>
<rect x="58" y="${view.height-25}" width="21" height="10" fill="#22c55e"/><text x="87" y="${view.height-16}" class="small">currently approved Ravensreach–MainStreet corridor</text><line x1="420" y1="${view.height-20}" x2="455" y2="${view.height-20}" class="danger" stroke-width="4" stroke-dasharray="7 5"/><text x="464" y="${view.height-16}" class="small">geometric gap only; never approved for movement</text>
</svg>`;
write(out, report);
write(map, svg);
const md = `# MP01 commissioning access-corridor design 02\n\n**Status:** \`${report.status}\` — no world, bot, catalog, configuration, or RCON mutation occurred.\n\n![Authority topology](${path.basename(map)})\n\n## Exact current position and gap\n\n- Selected commissioning bot: \`${selectedBot}\`, observed at \`(${departure.x}, ${departure.y}, ${departure.z})\` while idle. This is a live observation, **not** a route departure authorization.\n- Only permitted interaction staging squares: \`(2001..2003, 165, -899)\`; lever: \`(2001, 166, -902)\`.\n- The direct geometric separation is \`${geometricLineLength.toFixed(3)}\` blocks. The staging center remains \`${homeTargetGap.toFixed(3)}\` blocks beyond the nearest current approved civic area.\n- The current MP06 post-save is bound by capture \`${capture.captureId}\`, captured \`${capture.capturedAtUtc}\`, and snapshot digest \`${snapshotIdentity.sha256}\` across \`${snapshotIdentity.memberCount}\` copied members.\n\n## Why this is not a build candidate\n\nThe staging envelope has **zero** durable feature owners, markers, or catalog routes. The broad bounding-box feature count is descriptive only; it does not assign any route cells. No outbound or return feet-cell sequence, per-cell footing/headroom classification, owner/interface chain, destination-side anchor, or narrow offline mobility patch exists. Therefore there is no safe physical or configuration delta to compile.\n\n## Buildable successor: survey contract only\n\nThe attached JSON defines \`MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01\`. A future route must be independently surveyed on a fresh snapshot and contain exact cardinal feet cells in both directions, solid footing, two-block headroom, no fluids/gravity/closed-door traversal, and reviewed ownership at every cell. Only after that survey may a single-bot, corridor-only civic patch be tested offline. Direct destination circles, home-radius expansion, straight-line corridors, catalog-only authorization, teleport, RCON movement, and temporary leash relaxation remain prohibited.\n\n## Non-claims\n\nNo safe route, arrival, return, controls commissioning, public/service access, or MP01 completion is claimed.\n`;
write(markdown, md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
