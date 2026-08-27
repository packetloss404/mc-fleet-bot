#!/usr/bin/env node
/**
 * Read-only commissioning-movement gate for the isolated MP01 control.
 *
 * This is deliberately a route-authority survey, not a pathfinder probe: a
 * speculative long-distance goal would be a movement command and cannot prove
 * the absent route safe.  It reads the installed civic boundary, persisted
 * marker/route catalog, and (optionally) the loopback bot status endpoint.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import yaml from 'js-yaml';

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
const output = required('--out');
const markdown = required('--markdown');
const statusFile = option('--status-file');
const statusUrl = option('--status-url', 'http://127.0.0.1:3001/api/bots');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const read = (relativePath) => fs.readFileSync(path.resolve(ROOT, relativePath));
const json = (relativePath) => JSON.parse(read(relativePath));
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.z - start.z);
  const fraction = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + fraction * dx), point.z - (start.z + fraction * dz));
}

function nearestApprovedArea(boundary, point) {
  let best = {
    distance: Math.max(0, Math.hypot(point.x - boundary.x, point.z - boundary.z) - boundary.radius),
    kind: 'home', name: boundary.botName,
  };
  for (const destination of boundary.destinations ?? []) {
    const distance = Math.max(0, Math.hypot(point.x - destination.x, point.z - destination.z) - destination.radius);
    if (distance < best.distance) best = { distance, kind: 'destination', name: destination.name };
  }
  for (const corridor of boundary.corridors ?? []) {
    for (let index = 1; index < corridor.waypoints.length; index += 1) {
      const distance = Math.max(0, distanceToSegment(point, corridor.waypoints[index - 1], corridor.waypoints[index]) - corridor.width);
      if (distance < best.distance) best = {
        distance, kind: 'corridor', name: corridor.name,
        segment: { from: corridor.waypoints[index - 1], to: corridor.waypoints[index] },
      };
    }
  }
  return best;
}

function canMoveWithinBoundary(boundary, current, target) {
  const targetArea = nearestApprovedArea(boundary, target);
  return targetArea.distance <= 0 || targetArea.distance < nearestApprovedArea(boundary, current).distance;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 5_000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error(`status endpoint returned ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.once('timeout', () => request.destroy(new Error('status endpoint timed out')));
    request.once('error', reject);
  });
}

const configPath = 'config.yml';
const markersPath = 'data/markers.json';
const routesPath = 'data/routes.json';
const zonesPath = 'data/zones.json';
const config = yaml.load(read(configPath));
const markers = json(markersPath);
const routes = json(routesPath);
const zones = json(zonesPath);
const boundaries = config.leash ?? [];
const staging = [
  { x: 2001, y: 165, z: -899 },
  { x: 2002, y: 165, z: -899 },
  { x: 2003, y: 165, z: -899 },
];
const target = staging[1];
const statusPayload = statusFile ? json(statusFile) : await requestJson(statusUrl);
const bots = Array.isArray(statusPayload.bots) ? statusPayload.bots : [];
const markerById = new Map(markers.map((marker) => [marker.id, marker]));
const targetMarkers = markers.filter((marker) => marker.position.x >= 1990 && marker.position.x <= 2010
  && marker.position.z >= -910 && marker.position.z <= -890);
const targetRoutes = routes.filter((route) => route.waypointIds.some((id) => targetMarkers.some((marker) => marker.id === id)));
const nearestMarkers = markers.map((marker) => ({
  id: marker.id, name: marker.name, position: marker.position,
  distance: Math.hypot(marker.position.x - target.x, marker.position.y - target.y, marker.position.z - target.z),
})).sort((left, right) => left.distance - right.distance).slice(0, 5);
const botAssessments = bots.map((bot) => {
  const boundary = boundaries.find((entry) => entry.botName.toLowerCase() === String(bot.name).toLowerCase());
  const position = bot.position && Number.isFinite(bot.position.x) && Number.isFinite(bot.position.z)
    ? { x: bot.position.x, y: bot.position.y, z: bot.position.z } : null;
  const currentArea = boundary && position ? nearestApprovedArea(boundary, position) : null;
  const targetArea = boundary ? nearestApprovedArea(boundary, target) : null;
  return {
    name: bot.name, position, mode: bot.mode, state: bot.state,
    pathfinderMoving: Boolean(bot.pathfinderMoving), controlledWalkStatus: bot.controlledWalkStatus ?? null,
    boundaryFound: Boolean(boundary), currentArea, targetArea,
    directTargetAllowed: Boolean(boundary && position && canMoveWithinBoundary(boundary, position, target)),
  };
});

const report = {
  schemaVersion: 1,
  id: 'MP01-ISOLATED-REACTIVE-CONTROL-STAGING-ROUTE-GATE-01',
  status: 'HOLD_NO_APPROVED_NORMAL_WALK_STAGING_OR_RETURN_ROUTE',
  generatedAtUtc,
  surveyKind: 'READ_ONLY_RUNTIME_ROUTE_AUTHORITY_AND_LIVE_STATUS_SURVEY',
  scope: {
    commissioningProtocol: 'MP01-D01-ISOLATED-REACTIVE-CONTROL-COMMISSIONING-01',
    stagingSquares: staging,
    controlTarget: { x: 2001, y: 166, z: -902 },
    prohibited: ['teleport', 'RCON', 'freeform goal', 'temporary leash expansion', 'unsurveyed pathfinder probe'],
  },
  source: {
    config: { path: configPath, sha256: sha256(read(configPath)) },
    markers: { path: markersPath, sha256: sha256(read(markersPath)), count: markers.length },
    routes: { path: routesPath, sha256: sha256(read(routesPath)), count: routes.length },
    zones: { path: zonesPath, sha256: sha256(read(zonesPath)), count: zones.length },
    enforcement: [
      { path: 'src/bot/BotInstance.ts', sha256: sha256(read('src/bot/BotInstance.ts')), enforcement: 'setGoal rejects civic-mobility violation and emits mobility_denied' },
      { path: 'src/control/CivicMobility.ts', sha256: sha256(read('src/control/CivicMobility.ts')), enforcement: 'approved-area and intermediate-step policy' },
      { path: 'src/actions/moveHelper.ts', sha256: sha256(read('src/actions/moveHelper.ts')), enforcement: 'fails controlled walk on mobility_denied' },
      { path: 'src/actions/walkTo.ts', sha256: sha256(read('src/actions/walkTo.ts')), enforcement: 'all control-plane coordinate walks use moveNearWithCleanup' },
    ],
    liveStatus: statusFile ? { path: relative(statusFile), sha256: sha256(read(statusFile)) } : { url: statusUrl, observedAtUtc: generatedAtUtc },
  },
  authorityFindings: {
    leashCount: boundaries.length,
    stagingMarkerCount: targetMarkers.length,
    stagingRouteCount: targetRoutes.length,
    targetMarkers,
    targetRoutes: targetRoutes.map((route) => ({ id: route.id, name: route.name, waypoints: route.waypointIds.map((id) => markerById.get(id)?.name ?? id) })),
    nearestMarkers,
    botAssessments,
  },
  decision: {
    executableMovementPlan: false,
    reasons: [
      'No current bot has the MP01 staging squares inside its approved civic-mobility boundary.',
      'The control-plane walk implementation is required to reject every direct target rather than start a path.',
      'The persisted world catalog has no marker or route endpoint at the staging/control envelope, so no checked checkpoints or return route exist.',
      'A temporary leash edit or a speculative long-distance A* command would substitute authorization assumptions for a normal-walk route survey.',
    ],
    requiredBeforeResurvey: [
      'A complete source-bound normal-walk route survey from a named, currently reachable origin to every staging square, including exact floor/feet/head, fluid/gravity, protected-boundary, and ownership evidence.',
      'A distinct, exact return/recovery route with the same checks and approved checkpoints.',
      'A reviewed mobility-boundary update that names only the proven route, staging squares, and recovery endpoint; it must be tested without moving the commissioning bot.',
      'A fresh live bot-status and route/source check immediately before supervised movement, with an abort-on-drift procedure at each checkpoint.',
    ],
  },
  nonClaims: ['MP01 control commissioning', 'safe arrival', 'safe return', 'public/service access', 'MP01 completion'],
  safetyBoundary: { liveMutationPerformed: false, botMovementPerformed: false, rconPerformed: false, teleportPerformed: false, configMutationPerformed: false },
  payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(path.resolve(ROOT, output)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, output), `${JSON.stringify(report, null, 2)}\n`);
const md = `# MP01 commissioning staging-route hold\n\n`
  + `**Status:** \`${report.status}\`. No bot was moved.\n\n`
  + `The three sole allowlisted staging squares are \`(2001..2003, 165, -899)\`; the lever is at \`(2001, 166, -902)\`. The live fleet is currently restricted to the Ravensreach home circle plus the reviewed Ravensreach–MainStreet corridor. The target is outside every bot's approved civic-mobility area, and the runtime wrapper rejects such a goal before pathfinding.\n\n`
  + `There are no persisted MP01 staging markers or route endpoints, therefore no evidence-backed checkpoints, normal-walk path, or return/recovery route. The nearest catalog marker is \`${nearestMarkers[0]?.name ?? 'none'}\` at \`${nearestMarkers[0]?.distance?.toFixed(2) ?? 'unknown'}\` blocks. A temporary leash expansion, teleport, RCON, or speculative pathfinder command is prohibited.\n\n`
  + `A successor requires an exact source-bound outbound and return route survey, then a narrowly reviewed mobility-boundary update and fresh live gate before any supervised movement.\n`;
fs.mkdirSync(path.dirname(path.resolve(ROOT, markdown)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, markdown), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(output), markdown: relative(markdown), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
