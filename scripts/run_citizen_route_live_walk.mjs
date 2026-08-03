#!/usr/bin/env node
/**
 * Controlled bidirectional live walk for the reviewed citizen commute.
 *
 * Requires Voyager disabled and Ravensreach paused. Uses the normal bot action
 * API, so raw pathfinder civic-boundary enforcement remains active. No dig,
 * place, teleport, or direct world mutation command is issued.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  validateCitizenRouteProposal,
  validateCitizenRouteReport,
} from './lib/citizen-route-contract.mjs';
import {
  buildSegmentCacheBinding,
  createOrRotateSegmentCache,
  firstFailedRouteCheckpoint,
  parseSegmentSelector,
  recordSegmentWindowPasses,
  segmentWindowPlan,
  sha256,
} from './lib/citizen-route-segment-gate.mjs';
import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const REPORT_PATH = path.join(
  ROOT,
  argument('--route-report')
    ?? 'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
);
const PROPOSAL_PATH = path.join(
  ROOT,
  argument('--route-proposal')
    ?? 'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json',
);
const CONFIG_PATH = path.join(ROOT, 'config.yml');
const AUDIT_DIR = path.join(ROOT, 'data/runtime-audits');
const SEGMENT_CACHE_PATH = path.join(
  AUDIT_DIR,
  'citizen-route-live-walk-segment-cache.json',
);
const API = 'http://127.0.0.1:3001';
const WALK_RANGE = 1;

const BOT_NAME = argument('--bot') ?? 'Surveyor';
const SNAPSHOT_REGIONS_ARGUMENT = argument('--snapshot-regions');
const execute = process.argv.includes('--execute');
const contractCheck = process.argv.includes('--contract-check');
const segmentSelector = argument('--segment');
const segmentPlanSelector = argument('--segment-plan');
const resumeFailed = process.argv.includes('--resume-failed');
const failedAuditArgument = argument('--from-audit');
const modeCount = [
  execute,
  contractCheck,
  Boolean(segmentSelector),
  Boolean(segmentPlanSelector),
  resumeFailed,
].filter(Boolean).length;

if (modeCount !== 1) {
  console.error(
    'Usage: node scripts/run_citizen_route_live_walk.mjs ' +
    '--execute|--contract-check|--segment <forward|reverse:index>|' +
    '--segment-plan <forward|reverse:index>|--resume-failed ' +
    '[--from-audit <audit.json>] [--bot Surveyor] ' +
    '[--route-report <report.json>] [--route-proposal <proposal.json>] ' +
    '[--snapshot-regions <immutable-post-region-dir>]',
  );
  process.exit(2);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function getBot() {
  const body = await jsonFetch(`${API}/api/bots`);
  const bot = body.bots?.find((candidate) => candidate.name === BOT_NAME);
  if (!bot) throw new Error(`bot not found in API: ${BOT_NAME}`);
  return bot;
}

function currentPid() {
  return execFileSync(
    'systemctl',
    ['show', 'mc-fleet-bot', '--property=MainPID', '--value'],
    { encoding: 'utf8' },
  ).trim();
}

function serviceStartTimestamp() {
  return execFileSync(
    'systemctl',
    ['show', 'mc-fleet-bot', '--property=ExecMainStartTimestamp', '--value'],
    { encoding: 'utf8' },
  ).trim();
}

function filesUnder(directory, predicate = () => true) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(filename, predicate));
    else if (predicate(filename)) output.push(filename);
  }
  return output;
}

function hashFiles(filenames) {
  const members = [...new Set(filenames.map((filename) => path.resolve(filename)))]
    .sort();
  const chunks = [];
  for (const filename of members) {
    if (!fs.existsSync(filename)) {
      throw new Error(`runtime identity file missing: ${path.relative(ROOT, filename)}`);
    }
    chunks.push(path.relative(ROOT, filename), '\0', fs.readFileSync(filename), '\0');
  }
  return sha256(Buffer.concat(chunks.map((entry) => (
    Buffer.isBuffer(entry) ? entry : Buffer.from(entry)
  ))));
}

function runtimeIdentity(pid) {
  const relevantFiles = [
    fileURLToPath(import.meta.url),
    path.join(ROOT, 'scripts/lib/citizen-route-segment-gate.mjs'),
    path.join(ROOT, 'scripts/lib/citizen-route-contract.mjs'),
    CONFIG_PATH,
    path.join(ROOT, 'dist/actions/moveHelper.js'),
    path.join(ROOT, 'dist/bot/PathfinderMovementPolicy.js'),
    path.join(ROOT, 'dist/control/CommandCenter.js'),
    path.join(ROOT, 'dist/worker/botWorker.js'),
  ];
  const distFiles = filesUnder(
    path.join(ROOT, 'dist'),
    (filename) => filename.endsWith('.js') || filename.endsWith('.json'),
  );
  const execMainStartTimestamp = serviceStartTimestamp();
  const serviceStartMs = Date.parse(execMainStartTimestamp);
  if (!Number.isFinite(serviceStartMs)) {
    throw new Error(
      `cannot parse mc-fleet-bot ExecMainStartTimestamp: ${execMainStartTimestamp}`,
    );
  }
  const newestDistArtifact = distFiles
    .map((filename) => ({
      file: path.relative(ROOT, filename),
      mtimeMs: fs.statSync(filename).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
  const loadedBuildIdentityVerified = (
    newestDistArtifact.mtimeMs <= serviceStartMs + 1_000
  );
  return {
    relevantCodePolicySha256: hashFiles(relevantFiles),
    serviceBuildSha256: hashFiles([
      ...distFiles,
      path.join(ROOT, 'package-lock.json'),
      path.join(ROOT, 'package.json'),
    ]),
    serviceInstance: {
      mainPid: Number(pid),
      execMainStartTimestamp,
    },
    relevantFiles: relevantFiles.map((filename) => path.relative(ROOT, filename)),
    serviceBuildFileCount: distFiles.length + 2,
    newestDistArtifact: {
      ...newestDistArtifact,
      mtimeUtc: new Date(newestDistArtifact.mtimeMs).toISOString(),
    },
    loadedBuildIdentityVerified,
  };
}

function protectedDigCount(pid) {
  const log = fs.readFileSync('/var/log/mc-fleet-bot.log', 'utf8');
  const message = `(${pid}): \u001b[36mdig blocked: target is inside a protected build zone`;
  return log.split(message).length - 1;
}

async function walkCheckpointAttempt(direction, index, point, attempt) {
  const before = await getBot();
  const submittedAt = new Date().toISOString();
  const submittedAtMs = Date.parse(submittedAt);
  const command = await jsonFetch(`${API}/api/bots/${BOT_NAME}/walkto`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ x: point[0], y: point[1], z: point[2], range: WALK_RANGE }),
  });

  const deadline = Date.now() + 45_000;
  let last = before;
  while (Date.now() < deadline) {
    await delay(750);
    last = await getBot();
    const dx = last.position.x - point[0];
    const dz = last.position.z - point[2];
    const horizontalDistance = Math.hypot(dx, dz);
    const verticalDistance = Math.abs(last.position.y - point[1]);
    const receipt = last.controlledWalkStatus;
    const receiptMatches = (
      receipt
      && receipt.updatedAt >= submittedAtMs
      && receipt.target?.x === point[0]
      && receipt.target?.y === point[1]
      && receipt.target?.z === point[2]
      && receipt.target?.range === WALK_RANGE
    );
    if (receiptMatches && receipt.status === 'failed') {
      const result = {
        direction,
        index,
        attempt,
        target: point,
        submittedAt,
        commandId: command.command?.id,
        passed: false,
        arrival: last.position,
        failure: receipt.message ?? 'worker walk action failed',
        controlledWalkStatus: receipt,
      };
      console.log(JSON.stringify(result));
      return result;
    }
    // The controlled gate requests GoalNear(range=1) against the bot's precise
    // floating-point position, while /api/bots intentionally rounds position
    // to whole blocks. Rounding can add up to sqrt(0.5²+0.5²) to the apparent
    // horizontal distance. The worker receipt is authoritative; this wider
    // envelope is only a rounded-position sanity check for a completed exact
    // production helper that has already emitted goal_reached.
    if (
      receiptMatches
      && receipt.status === 'succeeded'
      && horizontalDistance <= 2.5
      && verticalDistance <= 2.5
      && last.pathfinderMoving === false
    ) {
      const result = {
        direction,
        index,
        attempt,
        target: point,
        submittedAt,
        commandId: command.command?.id,
        passed: true,
        arrival: last.position,
        horizontalDistance,
        verticalDistance,
        pathfinderMoving: last.pathfinderMoving,
        controlledWalkStatus: receipt,
      };
      console.log(JSON.stringify(result));
      await delay(500);
      return result;
    }
  }

  const result = {
    direction,
    index,
    attempt,
    target: point,
    submittedAt,
    commandId: command.command?.id,
    passed: false,
    arrival: last.position,
    failure: 'arrival timeout after 45 seconds',
  };
  console.log(JSON.stringify(result));
  return result;
}

async function walkCheckpoint(direction, index, point) {
  const attempts = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await walkCheckpointAttempt(direction, index, point, attempt);
    attempts.push(result);
    if (result.passed) {
      return {
        ...result,
        retryCount: attempt - 1,
        attempts,
      };
    }
    if (attempt < 2) await delay(1_000);
  }
  return {
    ...attempts[attempts.length - 1],
    retryCount: attempts.length - 1,
    attempts,
  };
}

async function walk(direction, points) {
  return walkIndexed(
    direction,
    points.map((point, index) => ({ index, point })),
  );
}

async function walkIndexed(direction, checkpointsToRun) {
  const checkpoints = [];
  for (const checkpoint of checkpointsToRun) {
    const result = await walkCheckpoint(
      direction,
      checkpoint.index,
      checkpoint.point,
    );
    checkpoints.push(result);
    if (!result.passed) break;
  }
  return {
    passed:
      checkpoints.length === checkpointsToRun.length
      && checkpoints.every((row) => row.passed),
    checkpoints,
  };
}

async function stageAtOrigin(points) {
  const bot = await getBot();
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index++) {
    const dx = bot.position.x - points[index][0];
    const dz = bot.position.z - points[index][2];
    const distance = Math.hypot(dx, dz);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  // Join the reviewed route at its nearest checkpoint, then traverse only
  // reviewed bounded segments back to the origin. This makes the gate
  // reproducible even after an interrupted prior attempt or process restart.
  const stagingPoints = [
    points[nearestIndex],
    ...points.slice(0, nearestIndex).reverse(),
  ];
  return walk('staging-to-origin', stagingPoints);
}

async function stageAtRouteIndex(direction, points, targetIndex) {
  const bot = await getBot();
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const dx = bot.position.x - points[index][0];
    const dz = bot.position.z - points[index][2];
    const distance = Math.hypot(dx, dz);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  const indices = [];
  const step = nearestIndex <= targetIndex ? 1 : -1;
  for (
    let index = nearestIndex;
    step > 0 ? index <= targetIndex : index >= targetIndex;
    index += step
  ) {
    indices.push(index);
  }
  return walkIndexed(
    `segment-staging-${direction}`,
    indices.map((index) => ({ index, point: points[index] })),
  );
}

function timestampedAuditPath(prefix) {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return path.join(AUDIT_DIR, `${prefix}-${timestamp}.json`);
}

function loadSegmentCache(binding) {
  let existing = null;
  if (fs.existsSync(SEGMENT_CACHE_PATH)) {
    existing = JSON.parse(fs.readFileSync(SEGMENT_CACHE_PATH, 'utf8'));
  }
  return createOrRotateSegmentCache(existing, binding);
}

function latestFailedAudit() {
  const candidates = fs.readdirSync(AUDIT_DIR)
    .filter((name) => (
      /^citizen-route-live-walk-\d{8}T\d{6}Z\.json$/.test(name)
    ))
    .sort()
    .reverse();
  for (const name of candidates) {
    const filename = path.join(AUDIT_DIR, name);
    const audit = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (audit.status === 'FAIL' && firstFailedRouteCheckpoint(audit)) {
      return { filename, audit };
    }
  }
  throw new Error('no failed forward/reverse citizen-route audit is available');
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const proposal = JSON.parse(fs.readFileSync(PROPOSAL_PATH, 'utf8'));
const routeContract = validateCitizenRouteReport(report);
validateCitizenRouteProposal(proposal, routeContract);

if (contractCheck) {
  console.log(JSON.stringify({
    status: 'PASS_CONTRACT_CHECK_ONLY',
    liveWorldRead: false,
    liveWorldMutated: false,
    serviceRestarted: false,
    acceptedPostSnapshotSha256:
      routeContract.contract.postSnapshotSha256,
    exactPathSha256: routeContract.contract.exactPathSha256,
    exactPathCellCount: routeContract.contract.exactPathCellCount,
    routineWaypointCount: routeContract.contract.routineWaypointCount,
    acceptanceClass: routeContract.contract.acceptanceClass,
    minimumHeadroomBlocks:
      routeContract.contract.verifiedMinimumHeadroomBlocks,
    declaredWidthChokes: routeContract.chokes,
    remainingGate: 'PASS_BIDIRECTIONAL live walk required',
  }, null, 2));
  process.exit(0);
}

if (segmentPlanSelector) {
  const plan = segmentWindowPlan(routeContract.route, segmentPlanSelector);
  console.log(JSON.stringify({
    status: 'PASS_SEGMENT_PLAN_ONLY',
    liveWorldRead: false,
    liveWorldMutated: false,
    serviceRestarted: false,
    acceptedPostSnapshotSha256: routeContract.contract.postSnapshotSha256,
    exactPathSha256: routeContract.contract.exactPathSha256,
    ...plan,
  }, null, 2));
  process.exit(0);
}

const configSource = fs.readFileSync(CONFIG_PATH, 'utf8');
if (!/voyager:\n  enabled: false/.test(configSource)) {
  throw new Error('Voyager must be disabled for the controlled live walk');
}
const snapshotRegions = path.resolve(
  ROOT,
  SNAPSHOT_REGIONS_ARGUMENT ?? report.accepted.snapshot.directory,
);
const snapshotEvidence = hashSnapshotDirectory(snapshotRegions);
if (snapshotEvidence.sha256 !== report.accepted.snapshot.sha256) {
  throw new Error(
    `route evidence snapshot mismatch: report expects `
    + `${report.accepted.snapshot.sha256}, but ${snapshotRegions} hashes to `
    + snapshotEvidence.sha256,
  );
}
const initialStatus = await jsonFetch(`${API}/api/status`);
if (initialStatus.botCount !== 5) throw new Error('live walk requires exactly five connected bots');
const initialSecurity = await jsonFetch(`${API}/api/security/impersonation`);
if ((initialSecurity.incidents ?? []).length !== 0) {
  throw new Error('security incident present before live walk');
}

const pid = currentPid();
const identity = runtimeIdentity(pid);
if (!identity.loadedBuildIdentityVerified) {
  throw new Error(
    'refusing live-walk evidence: dist contains artifacts newer than the '
    + `running mc-fleet-bot service (${identity.newestDistArtifact.file} at `
    + `${identity.newestDistArtifact.mtimeUtc}; service started `
    + `${identity.serviceInstance.execMainStartTimestamp}). Restart through `
    + 'systemd before collecting build-bound route evidence.',
  );
}
const runtimeBinding = buildSegmentCacheBinding({
  bot: BOT_NAME,
  snapshotSha256: snapshotEvidence.sha256,
  routeReportSha256: sha256(fs.readFileSync(REPORT_PATH)),
  exactPathSha256: report.accepted.exactPathSha256,
  routineWaypoints: routeContract.route,
  relevantCodePolicySha256: identity.relevantCodePolicySha256,
  serviceBuildSha256: identity.serviceBuildSha256,
  serviceInstance: identity.serviceInstance,
  movementPolicy: {
    ...report.accepted.movementModel,
    goalNearRange: WALK_RANGE,
  },
});
const digCountBefore = protectedDigCount(pid);
const points = report.accepted.routineWaypoints;

if (segmentSelector || resumeFailed) {
  let selected = segmentSelector;
  let sourceFailedAudit = null;
  if (resumeFailed) {
    if (failedAuditArgument) {
      const filename = path.resolve(ROOT, failedAuditArgument);
      sourceFailedAudit = {
        filename,
        audit: JSON.parse(fs.readFileSync(filename, 'utf8')),
      };
    } else {
      sourceFailedAudit = latestFailedAudit();
    }
    const failure = firstFailedRouteCheckpoint(sourceFailedAudit.audit);
    if (!failure) {
      throw new Error('selected audit has no failed forward/reverse checkpoint');
    }
    selected = `${failure.direction}:${failure.index}`;
  }
  parseSegmentSelector(selected);
  const plan = segmentWindowPlan(routeContract.route, selected);
  const orientedPoints = plan.direction === 'forward'
    ? routeContract.route
    : [...routeContract.route].reverse();
  const staging = await stageAtRouteIndex(
    plan.direction,
    orientedPoints,
    plan.stagingIndex,
  );
  const window = staging.passed
    ? await walkIndexed(
      plan.direction,
      plan.checkpoints.map((checkpoint) => ({
        index: checkpoint.index,
        point: checkpoint.point,
      })),
    )
    : { passed: false, checkpoints: [] };
  const digCountAfter = protectedDigCount(pid);
  const finalSecurity = await jsonFetch(`${API}/api/security/impersonation`);
  const finalBot = await getBot();
  const status = (
    staging.passed
    && window.passed
    && digCountAfter === digCountBefore
    && (finalSecurity.incidents ?? []).length === 0
  )
    ? 'PASS_SEGMENT_WINDOW_NOT_END_TO_END'
    : 'FAIL_SEGMENT_WINDOW';
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const auditPath = timestampedAuditPath('citizen-route-live-walk-segment');
  const audit = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    auditFile: path.relative(ROOT, auditPath),
    status,
    bot: BOT_NAME,
    runtimeBinding,
    snapshotEvidence: {
      directory: path.relative(ROOT, snapshotRegions),
      sha256: snapshotEvidence.sha256,
      regionFileCount: snapshotEvidence.regionFileCount,
    },
    sourceFailedAudit: sourceFailedAudit
      ? {
        file: path.relative(ROOT, sourceFailedAudit.filename),
        sha256: sha256(fs.readFileSync(sourceFailedAudit.filename)),
      }
      : null,
    plan,
    staging,
    window,
    digCountBefore,
    digCountAfter,
    noDigObserved: digCountAfter === digCountBefore,
    securityIncidentsBefore: initialSecurity.incidents ?? [],
    securityIncidentsAfter: finalSecurity.incidents ?? [],
    finalPosition: finalBot.position,
    cachedPassesMaySatisfyFinalAcceptance: false,
    remainingGate: plan.remainingGate,
  };
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  const rotated = loadSegmentCache(runtimeBinding);
  const cache = status === 'PASS_SEGMENT_WINDOW_NOT_END_TO_END'
    ? recordSegmentWindowPasses(rotated, plan, audit)
    : rotated;
  fs.writeFileSync(SEGMENT_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
  console.log(JSON.stringify({
    ...audit,
    auditPath,
    segmentCachePath: SEGMENT_CACHE_PATH,
  }, null, 2));
  if (status !== 'PASS_SEGMENT_WINDOW_NOT_END_TO_END') process.exit(1);
  process.exit(0);
}

const staging = await stageAtOrigin(points);
const forward = staging.passed
  ? await walk('forward', points)
  : { passed: false, checkpoints: [] };
const reverse = staging.passed && forward.passed
  ? await walk('reverse', [...points].reverse())
  : { passed: false, checkpoints: [] };
const digCountAfter = protectedDigCount(pid);
const finalSecurity = await jsonFetch(`${API}/api/security/impersonation`);
const finalBot = await getBot();

const audit = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  bot: BOT_NAME,
  pid: Number(pid),
  runtimeBinding,
  snapshotEvidence: {
    directory: path.relative(ROOT, snapshotRegions),
    sha256: snapshotEvidence.sha256,
    regionFileCount: snapshotEvidence.regionFileCount,
  },
  offlineAcceptedSnapshotSha256: report.accepted.snapshot.sha256,
  exactPathSha256: report.accepted.exactPathSha256,
  offlineAcceptanceClass: report.acceptanceClass,
  exactPathCellCount: report.exactPathCellCount,
  routineWaypointCount: routeContract.route.length,
  minimumHeadroomBlocks: report.accepted.headroom.minimumClearBlocks,
  declaredWidthChokes: routeContract.chokes,
  status:
    staging.passed &&
    forward.passed &&
    reverse.passed &&
    digCountAfter === digCountBefore &&
    (finalSecurity.incidents ?? []).length === 0
      ? 'PASS_BIDIRECTIONAL'
      : 'FAIL',
  staging,
  forward,
  reverse,
  digCountBefore,
  digCountAfter,
  noDigObserved: digCountAfter === digCountBefore,
  securityIncidentsBefore: initialSecurity.incidents ?? [],
  securityIncidentsAfter: finalSecurity.incidents ?? [],
  finalPosition: finalBot.position,
  cachedSegmentPassesUsed: false,
  endToEndAcceptanceBasis: 'fresh uncached staging + forward + reverse traversal',
};

fs.mkdirSync(AUDIT_DIR, { recursive: true });
const auditPath = timestampedAuditPath('citizen-route-live-walk');
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ ...audit, auditPath }, null, 2));
if (audit.status !== 'PASS_BIDIRECTIONAL') process.exit(1);
