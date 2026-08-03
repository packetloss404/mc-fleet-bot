#!/usr/bin/env node
/**
 * Independent live route acceptance for the redevelopment release.
 *
 * This uses a short-lived, uniquely named Mineflayer instrument instead of a
 * resident fleet bot. Resident bots are intentionally leashed to Ravensreach
 * and their control API acknowledges movement commands before the asynchronous
 * pathfinder result is known, so they are not a valid remote-district test
 * instrument. The QA bot cannot dig or tower, is teleported only by the
 * existing RCON admin helper, and disconnects in a finally block.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import mineflayer from 'mineflayer';
import pathfinderPackage from 'mineflayer-pathfinder';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const { goals, Movements, pathfinder: pathfinderPlugin } = pathfinderPackage;
const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const reportPath = path.resolve(
  ROOT,
  value('--report', 'data/world-review/redevelopment-route-qa-2026-07-27.json'),
);
const postRegions = path.resolve(ROOT, value('--post-regions', ''));
const routeManifestValue = value('--route-manifest', '');
const routeManifestPath = routeManifestValue
  ? path.resolve(ROOT, routeManifestValue)
  : null;
const username = value('--username', 'RedevelopQA');
const manageWhitelist = !args.includes('--no-manage-whitelist');
const config = yaml.load(fs.readFileSync(path.join(ROOT, 'config.yml'), 'utf8'));
const mainstreet = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
  ),
  'utf8',
));

if (!fs.existsSync(postRegions)) {
  throw new Error('usage: --post-regions <immutable region directory> [--report <json>]');
}
if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
  throw new Error('QA username must be a valid, unique Minecraft username');
}

const PACKAGE_FILES = {
  'VEN-WL-01': 'data/buildops/westlight-infinity-screen-2026-07-27.txt',
  'INF-RR-01': 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
  'mainstreet-america-redevelopment-r4-r5':
    'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
  'mainstreet-bunker-surface-phase1-2026-07-27':
    'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
  'mainstreet-bunker-recessed-portal-phase2-2026-07-27':
    'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
};
const routeManifest = routeManifestPath
  ? JSON.parse(fs.readFileSync(routeManifestPath, 'utf8'))
  : null;

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  let bytes = 0;
  for (const name of files) {
    const content = fs.readFileSync(path.join(directory, name));
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    directory: path.relative(ROOT, directory),
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function samplePolyline(centerline, maximumSegment = 65) {
  if (!centerline.length) return [];
  const points = [centerline[0]];
  let last = 0;
  for (let index = 1; index < centerline.length - 1; index += 1) {
    if (index - last >= maximumSegment) {
      points.push(centerline[index]);
      last = index;
    }
  }
  points.push(centerline.at(-1));
  return points.map((point) => [point[0], point[1] + 1, point[2]]);
}

function garagePoints(garage) {
  const [x1, x2, z1, z2] = garage.garageBounds;
  return [
    [Math.floor((x1 + x2) / 2), garage.floorY + 1, Math.floor((z1 + z2) / 2)],
    [garage.roadConnection.x, garage.roadConnection.y + 1, garage.roadConnection.z],
  ];
}

function routeDefinitions() {
  if (routeManifest) {
    if (!Array.isArray(routeManifest.routes) || routeManifest.routes.length === 0) {
      throw new Error('route manifest must contain a non-empty routes array');
    }
    return routeManifest.routes.map((route) => {
      if (
        typeof route.id !== 'string'
        || !Array.isArray(route.points)
        || route.points.length < 2
        || route.points.some(
          (point) => !Array.isArray(point)
            || point.length !== 3
            || point.some((coordinate) => !Number.isFinite(coordinate)),
        )
      ) {
        throw new Error(`invalid route manifest entry: ${JSON.stringify(route)}`);
      }
      return {
        id: route.id,
        points: route.points,
        standard: route.standard ?? 'normal pathfinding, bidirectional',
      };
    });
  }
  const definitions = [
    {
      id: 'ravenrock-s1-west-to-east',
      points: [[138, -11, -14], [148, -11, -14]],
      standard: '7-wide x 8-high standardized tunnel pilot',
    },
    {
      id: 'bunker-recessed-portal-mouth-to-lobby',
      points: [[143, 65, 199], [143, 63, 191], [143, 63, 171], [140, 65, 166]],
      standard: '5-wide x 4-high stair-backed dogleg',
    },
  ];
  for (const alley of mainstreet.sharedAlleys.matrix) {
    definitions.push({
      id: `${alley.id.toLowerCase()}-full-length`,
      points: samplePolyline(alley.centerline),
      standard: '3-wide shared rear lane, adjacent step <=1, smoothed grade runs',
    });
  }
  for (const garage of mainstreet.garages.matrix) {
    definitions.push({
      id: `${garage.garageId.toLowerCase()}-connection`,
      points: garagePoints(garage),
      standard: '3-wide garage opening and continuous driveway/alley connection',
    });
  }
  return definitions;
}

function rcon(command) {
  const run = spawnSync(
    'python3',
    ['scripts/mc_admin.py', 'rcon', command],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
  );
  if (run.status !== 0) {
    throw new Error(`RCON helper failed: ${run.stderr || run.stdout}`);
  }
  return run.stdout;
}

function waitForEvent(emitter, successEvent, failureEvent, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for ${successEvent}`));
    }, timeoutMs);
    const onSuccess = (...eventArgs) => {
      cleanup();
      resolve(eventArgs);
    };
    const onFailure = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const cleanup = () => {
      clearTimeout(timer);
      emitter.removeListener(successEvent, onSuccess);
      if (failureEvent) emitter.removeListener(failureEvent, onFailure);
    };
    emitter.once(successEvent, onSuccess);
    if (failureEvent) emitter.once(failureEvent, onFailure);
  });
}

function waitForSpawn(bot, timeoutMs = 45_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timed out waiting for spawn'));
    }, timeoutMs);
    const onSpawn = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const onKicked = (reason) => onError(new Error(`QA bot kicked: ${String(reason)}`));
    const onEnd = (reason) => onError(new Error(`QA bot connection ended: ${String(reason)}`));
    const cleanup = () => {
      clearTimeout(timer);
      bot.removeListener('spawn', onSpawn);
      bot.removeListener('error', onError);
      bot.removeListener('kicked', onKicked);
      bot.removeListener('end', onEnd);
    };
    bot.once('spawn', onSpawn);
    bot.once('error', onError);
    bot.once('kicked', onKicked);
    bot.once('end', onEnd);
  });
}

async function waitAt(bot, target, radius = 1.8, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (bot.entity?.position.distanceTo({
      x: target[0],
      y: target[1],
      z: target[2],
    }) <= radius) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function teleportAndSettle(bot, point) {
  rcon(`teleport ${username} ${point[0]} ${point[1]} ${point[2]}`);
  const positioned = await waitAt(bot, point);
  if (!positioned) return false;
  await bot.waitForChunksToLoad();
  await new Promise((resolve) => setTimeout(resolve, 750));
  return true;
}

async function walkLeg(bot, target, timeoutMs = 30_000) {
  const trace = [];
  const movementPolicyViolations = [];
  const started = Date.now();
  const sampler = setInterval(() => {
    const position = bot.entity?.position;
    const controls = {
      jump: bot.getControlState('jump'),
      sprint: bot.getControlState('sprint'),
      sneak: bot.getControlState('sneak'),
    };
    for (const [control, active] of Object.entries(controls)) {
      if (active && !movementPolicyViolations.some(
        (violation) => violation.control === control,
      )) {
        movementPolicyViolations.push({
          control,
          elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
        });
      }
    }
    trace.push({
      elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
      position: position ? {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      } : null,
      moving: bot.pathfinder.isMoving(),
      controls,
    });
  }, 250);
  let error = null;
  try {
    await Promise.race([
      bot.pathfinder.goto(new goals.GoalNear(target[0], target[1], target[2], 1)),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(`leg timed out after ${timeoutMs}ms`)),
        timeoutMs,
      )),
    ]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    clearInterval(sampler);
    if (error) {
      bot.pathfinder.stop();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const reached = await waitAt(bot, target, 2.2, 800);
  return {
    target,
    reached,
    error,
    elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
    movementPolicyViolations,
    trace,
  };
}

async function runDirection(bot, points, direction) {
  const ordered = direction === 'forward' ? points : [...points].reverse();
  const positioned = await teleportAndSettle(bot, ordered[0]);
  const legs = [];
  if (positioned) {
    for (const target of ordered.slice(1)) {
      const leg = await walkLeg(bot, target);
      legs.push(leg);
      if (!leg.reached) break;
    }
  }
  return {
    direction,
    start: ordered[0],
    initialPositionReached: positioned,
    legs,
    movementPolicyViolations: legs.flatMap(
      (leg) => leg.movementPolicyViolations,
    ),
    passed: positioned
      && legs.length === ordered.length - 1
      && legs.every(
        (leg) => leg.reached && leg.movementPolicyViolations.length === 0,
      ),
  };
}

async function main() {
  if (manageWhitelist) {
    rcon(`whitelist add ${username}`);
  }
  const bot = mineflayer.createBot({
    host: config.minecraft.host,
    port: Number(config.minecraft.port),
    username,
    auth: config.minecraft.auth ?? 'offline',
    version: config.minecraft.version,
    hideErrors: false,
  });
  bot.loadPlugin(pathfinderPlugin);

  const startedAtUtc = new Date().toISOString();
  const results = [];
  try {
    await waitForSpawn(bot);
    const movements = new Movements(bot);
    movements.canDig = false;
    movements.allow1by1towers = false;
    movements.allowParkour = false;
    movements.allowSprinting = false;
    bot.pathfinder.setMovements(movements);

    for (const definition of routeDefinitions()) {
      const forward = await runDirection(bot, definition.points, 'forward');
      const reverse = await runDirection(bot, definition.points, 'reverse');
      const passed = forward.passed && reverse.passed;
      results.push({
        id: definition.id,
        standard: definition.standard,
        points: definition.points,
        directions: [forward, reverse],
        passed,
      });
      console.log(`${definition.id}: ${passed ? 'PASS' : 'FAIL'}`);
    }
  } finally {
    try {
      bot.pathfinder.stop();
      bot.quit('redevelopment route QA complete');
    } catch {}
    if (manageWhitelist) {
      try {
        rcon(`whitelist remove ${username}`);
      } catch {}
    }
  }

  const passedTests = results.filter((result) => result.passed).length;
  const report = {
    schemaVersion: 2,
    generatedAtUtc: new Date().toISOString(),
    startedAtUtc,
    status: passedTests === results.length ? 'PASS' : 'FAIL',
    instrument: {
      type: 'short-lived-independent-mineflayer-walker',
      username,
      residentFleetLeashBypassed: true,
      canDig: false,
      canTower: false,
      temporaryWhitelistManaged: manageWhitelist,
      disconnectedAfterRun: true,
    },
    postSnapshot: snapshotHash(postRegions),
    routeManifest: routeManifestPath ? {
      file: path.relative(ROOT, routeManifestPath),
      sha256: sha256File(routeManifestPath),
    } : null,
    packageHashes: Object.fromEntries(Object.entries(
      routeManifest?.packageFiles ?? PACKAGE_FILES,
    ).map(
      ([id, filename]) => [id, {
        file: filename,
        sha256: sha256File(path.join(ROOT, filename)),
      }],
    )),
    bidirectionalWalk: {
      passed: passedTests === results.length,
      tests: results.length,
      directionalRuns: results.length * 2,
      passedTests,
      failedTests: results.length - passedTests,
    },
    tests: results,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    status: report.status,
    report: path.relative(ROOT, reportPath),
    bidirectionalWalk: report.bidirectionalWalk,
  }, null, 2));
  return report.status === 'PASS' ? 0 : 1;
}

process.exitCode = await main();
