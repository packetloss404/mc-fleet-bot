#!/usr/bin/env node
/**
 * Read-only post-restart observation gate for the five Ravensreach citizens.
 *
 * The observer never sends an API mutation, never starts/stops a service, and
 * never writes config, databases, blackboard state, or world data. Its only
 * writes are timestamped JSON and Markdown audit artifacts.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

import Database from 'better-sqlite3';
import yaml from 'js-yaml';

import {
  validateCitizenRouteProposal,
  validateCitizenRouteReport,
} from './lib/citizen-route-contract.mjs';

const ROOT = process.cwd();
const TOWN_ID = 'town_mrzgshth_9d12c17d';
const TOWN_NAME = 'Ravensreach';
const EXPECTED_ROLES = Object.freeze({
  Architect: 'builder',
  Mason: 'miner',
  Scott: 'lumberjack',
  Steward: 'farmer',
  Surveyor: 'guard',
});
const EXPECTED_NAMES = Object.freeze(Object.keys(EXPECTED_ROLES).sort());
const ROUTE_REPORT_PATH = path.join(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
);
const ROUTE_PROPOSAL_PATH = path.join(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json',
);
const CONFIG_PATH = path.join(ROOT, 'config.yml');
const TOWN_DB_PATH = path.join(ROOT, 'data/town.db');
const DEFAULT_LOG_PATH = '/var/log/mc-fleet-bot.log';
const DEFAULT_OUT_DIR = path.join(ROOT, 'data/runtime-audits');
const SERVICE_NAME = 'mc-fleet-bot';
const ANSI_RE = /\u001b\[[0-9;]*m/g;
const LIFE_KEYWORDS = new Set([
  'night',
  'social',
  'shelter',
  'sleep',
  'rest',
  'common-hall',
  'read',
  'courtyard',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stablePoint(point) {
  return {
    x: Math.floor(Number(point.x)),
    y: Math.floor(Number(point.y)),
    z: Math.floor(Number(point.z)),
  };
}

function pointsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((point, index) => {
    const a = stablePoint(point);
    const b = stablePoint(right[index]);
    return a.x === b.x && a.y === b.y && a.z === b.z;
  });
}

function parseNumber(value, name, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be a number in ${min}..${max}`);
  }
  return parsed;
}

function valueAfter(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

export function parseArgs(argv) {
  const fixture = valueAfter(argv, '--evaluate-fixture', null);
  const observe = argv.includes('--observe');
  if (!observe && !fixture) {
    throw new Error(
      'Usage: node scripts/audit_citizen_post_restart.mjs --observe ' +
      '[--duration-minutes 45] [--minimum-minutes 20] [--poll-seconds 10] ' +
      '[--out-dir DIR] [--api URL] [--log FILE]',
    );
  }
  if (observe && fixture) {
    throw new Error('--observe and --evaluate-fixture are mutually exclusive');
  }
  const durationMinutes = parseNumber(
    valueAfter(argv, '--duration-minutes', '45'),
    '--duration-minutes',
    { min: 1, max: 240 },
  );
  const minimumMinutes = parseNumber(
    valueAfter(argv, '--minimum-minutes', '20'),
    '--minimum-minutes',
    { min: 0, max: 240 },
  );
  if (minimumMinutes > durationMinutes) {
    throw new Error('--minimum-minutes cannot exceed --duration-minutes');
  }
  return {
    mode: fixture ? 'fixture' : 'observe',
    fixture: fixture ? path.resolve(fixture) : null,
    durationMs: durationMinutes * 60_000,
    minimumDurationMs: minimumMinutes * 60_000,
    pollMs: parseNumber(
      valueAfter(argv, '--poll-seconds', '10'),
      '--poll-seconds',
      { min: 1, max: 300 },
    ) * 1_000,
    readinessMs: parseNumber(
      valueAfter(argv, '--readiness-minutes', '5'),
      '--readiness-minutes',
      { min: 0, max: 30 },
    ) * 60_000,
    stationaryLoopMs: parseNumber(
      valueAfter(argv, '--stuck-loop-seconds', '120'),
      '--stuck-loop-seconds',
      { min: 30, max: 900 },
    ) * 1_000,
    apiBase: String(valueAfter(argv, '--api', 'http://127.0.0.1:3001')).replace(/\/$/, ''),
    logPath: path.resolve(valueAfter(argv, '--log', DEFAULT_LOG_PATH)),
    outDir: path.resolve(valueAfter(argv, '--out-dir', DEFAULT_OUT_DIR)),
  };
}

export function loadAcceptedContracts(root = ROOT) {
  const reportPath = path.join(
    root,
    'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
  );
  const proposalPath = path.join(
    root,
    'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json',
  );
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
  const routeContract = validateCitizenRouteReport(report);
  const validatedProposal = validateCitizenRouteProposal(
    proposal,
    routeContract,
  );
  const route = routeContract.route.map(([x, y, z]) => ({ x, y, z }));
  const shifts = validatedProposal.shifts;
  const byRole = {};
  for (const shift of shifts) {
    if (
      !shift
      || shift.phase !== 'day'
      || shift.destination !== 'mainstreet-rear-staff-staging'
      || shift.nonDestructive !== true
      || typeof shift.role !== 'string'
      || !Object.values(EXPECTED_ROLES).includes(shift.role)
      || byRole[shift.role]
      || !pointsEqual(shift.waypoints, route)
    ) {
      throw new Error(`invalid or duplicate reviewed shift contract: ${shift?.id ?? 'unknown'}`);
    }
    byRole[shift.role] = {
      ...shift,
      waypoints: shift.waypoints.map(stablePoint),
    };
  }
  if (Object.keys(byRole).length !== 5) {
    throw new Error('reviewed shift proposal does not cover all five exact roles');
  }
  return {
    townId: TOWN_ID,
    townName: TOWN_NAME,
    expectedRoles: { ...EXPECTED_ROLES },
    expectedNames: [...EXPECTED_NAMES],
    acceptedSnapshotSha256: report.accepted.snapshot.sha256,
    exactPathSha256: report.accepted.exactPathSha256,
    exactPathCells: report.accepted.exactPathCellCount,
    acceptanceClass: report.acceptanceClass,
    widthChokes: routeContract.chokes,
    route,
    shiftsByRole: byRole,
    reportPath: path.relative(root, reportPath),
    proposalPath: path.relative(root, proposalPath),
  };
}

export function readPersistedActivation(contracts, {
  configPath = CONFIG_PATH,
  townDbPath = TOWN_DB_PATH,
} = {}) {
  const parsedConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const leash = parsedConfig?.leash;
  if (parsedConfig?.voyager?.enabled !== true) {
    throw new Error('config.yml does not have Voyager enabled');
  }
  if (!Array.isArray(leash) || leash.length !== 5) {
    throw new Error('config.yml must contain exactly five citizen leash entries');
  }
  const expectedNames = [...contracts.expectedNames].sort();
  const leashNames = leash.map((entry) => entry?.botName).sort();
  if (JSON.stringify(leashNames) !== JSON.stringify(expectedNames)) {
    throw new Error(`config.yml leash names differ: ${leashNames.join(',')}`);
  }
  for (const entry of leash) {
    const corridor = entry?.corridors?.find(
      (candidate) => candidate?.name === 'ravensreach-mainstreet-reviewed-commute',
    );
    if (
      !corridor
      || corridor.width !== 3
      || corridor.waypoints?.length !== contracts.route.length
    ) {
      throw new Error(`missing exact reviewed corridor for ${entry?.botName ?? 'unknown bot'}`);
    }
    const expected2d = contracts.route.map((point) => ({ x: point.x, z: point.z }));
    const actual2d = corridor.waypoints.map((point) => ({
      x: Math.floor(Number(point.x)),
      z: Math.floor(Number(point.z)),
    }));
    if (JSON.stringify(actual2d) !== JSON.stringify(expected2d)) {
      throw new Error(`reviewed corridor drift for ${entry.botName}`);
    }
  }

  const db = new Database(townDbPath, { readonly: true, fileMustExist: true });
  let town;
  try {
    town = db.prepare('select config_json, paused from towns where id = ?').get(contracts.townId);
  } finally {
    db.close();
  }
  if (!town) throw new Error(`town missing from database: ${contracts.townId}`);
  const townConfig = JSON.parse(town.config_json || '{}');
  const persistedShifts = townConfig.citizenRoutine?.shifts;
  if (Boolean(town.paused)) throw new Error('Ravensreach remains paused in town.db');
  if (!Array.isArray(persistedShifts) || persistedShifts.length !== 5) {
    throw new Error('town.db does not contain exactly five reviewed citizen shifts');
  }
  for (const [botName, role] of Object.entries(contracts.expectedRoles)) {
    const expected = contracts.shiftsByRole[role];
    const actual = persistedShifts.find((shift) => shift?.role === role);
    if (
      !actual
      || actual.id !== expected.id
      || actual.phase !== expected.phase
      || actual.destination !== expected.destination
      || actual.nonDestructive !== true
      || !pointsEqual(actual.waypoints, contracts.route)
    ) {
      throw new Error(`persisted shift drift for ${botName}/${role}`);
    }
  }
  return {
    voyagerEnabled: true,
    leashEntries: leash.length,
    corridorWaypointsPerBot: contracts.route.length,
    townPaused: false,
    persistedShifts: persistedShifts.length,
    configSha256: sha256(fs.readFileSync(configPath)),
  };
}

export function readServiceState(serviceName = SERVICE_NAME) {
  const output = execFileSync(
    'systemctl',
    [
      'show',
      serviceName,
      '--property=ActiveState,SubState,MainPID,ExecMainStatus,StateChangeTimestamp',
      '--no-pager',
    ],
    { encoding: 'utf8' },
  );
  const values = {};
  for (const line of output.trim().split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator < 0) continue;
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return {
    active: values.ActiveState === 'active' && values.SubState === 'running',
    activeState: values.ActiveState ?? null,
    subState: values.SubState ?? null,
    pid: Number(values.MainPID ?? 0),
    execMainStatus: Number(values.ExecMainStatus ?? -1),
    stateChangeTimestamp: values.StateChangeTimestamp ?? null,
  };
}

async function jsonFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${response.status} ${response.statusText}: non-JSON response`);
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function compactBot(basic, detailed) {
  const bot = detailed?.bot ?? detailed ?? {};
  return {
    name: bot.name ?? basic?.name ?? null,
    state: bot.state ?? basic?.state ?? null,
    position: bot.position ?? basic?.position ?? null,
    inboundAgeMs: bot.inboundAgeMs ?? basic?.inboundAgeMs ?? null,
    pathfinderMoving: Boolean(bot.pathfinderMoving ?? basic?.pathfinderMoving),
    health: Number(bot.health ?? 0),
    food: Number(bot.food ?? 0),
    voyagerRunning: bot.voyager?.isRunning === true,
    voyagerPaused: bot.voyager?.isPaused === true,
    currentTask: bot.voyager?.currentTask ?? null,
    queuedTaskCount: Number(bot.voyager?.queuedTaskCount ?? 0),
    completedTaskCount: Array.isArray(bot.voyager?.completedTasks)
      ? bot.voyager.completedTasks.length
      : 0,
    failedTaskCount: Array.isArray(bot.voyager?.failedTasks)
      ? bot.voyager.failedTasks.length
      : 0,
    worldTimeTicks: Number.isFinite(bot.world?.timeOfDayTicks)
      ? bot.world.timeOfDayTicks
      : null,
  };
}

function compactTask(task) {
  return {
    id: task.id,
    description: task.description,
    keywords: Array.isArray(task.keywords) ? [...task.keywords] : [],
    status: task.status,
    priority: task.priority,
    assignedBot: task.assignedBot ?? null,
    source: task.source,
    createdAt: Number(task.createdAt ?? 0),
    updatedAt: Number(task.updatedAt ?? 0),
    claimedAt: Number(task.claimedAt ?? 0) || null,
    blocker: task.blocker ?? null,
    failureCount: Number(task.failureCount ?? 0),
    retryAfter: Number(task.retryAfter ?? 0) || null,
    metadata: task.metadata ?? null,
  };
}

export async function captureRuntimeSample({
  apiBase,
  contracts,
  serviceName = SERVICE_NAME,
}) {
  const capturedAt = Date.now();
  const service = readServiceState(serviceName);
  const [
    statusBody,
    botsBody,
    townBody,
    residentsBody,
    brainBody,
    blackboardBody,
    securityBody,
  ] = await Promise.all([
    jsonFetch(`${apiBase}/api/status`),
    jsonFetch(`${apiBase}/api/bots`),
    jsonFetch(`${apiBase}/api/towns/${contracts.townId}`),
    jsonFetch(`${apiBase}/api/towns/${contracts.townId}/residents`),
    jsonFetch(`${apiBase}/api/towns/${contracts.townId}/brain`),
    jsonFetch(`${apiBase}/api/blackboard`),
    jsonFetch(`${apiBase}/api/security/impersonation`),
  ]);
  const basics = Array.isArray(botsBody.bots) ? botsBody.bots : [];
  const basicByName = new Map(basics.map((bot) => [bot.name, bot]));
  const detailedAndDecisions = await Promise.all(contracts.expectedNames.map(async (name) => {
    const [detailed, decisions] = await Promise.all([
      jsonFetch(`${apiBase}/api/bots/${encodeURIComponent(name)}/detailed`),
      jsonFetch(`${apiBase}/api/bots/${encodeURIComponent(name)}/decisions?limit=500`),
    ]);
    return [name, detailed, decisions];
  }));
  const bots = detailedAndDecisions.map(([name, detailed]) =>
    compactBot(basicByName.get(name), detailed));
  const decisions = Object.fromEntries(detailedAndDecisions.map(([name, , body]) => [
    name,
    (Array.isArray(body.decisions) ? body.decisions : []).map((record) => ({
      id: record.id,
      type: record.type,
      botName: record.botName,
      task: record.task,
      timestamp: Number(record.timestamp ?? 0),
      summary: record.summary,
      decision: record.decision,
      details: record.details ?? {},
    })),
  ]));
  const allTasks = blackboardBody.blackboard?.tasks;
  if (!Array.isArray(allTasks)) throw new Error('/api/blackboard did not return tasks');
  const relevantTasks = allTasks.filter((task) =>
    task?.source === 'swarm'
    && Array.isArray(task.keywords)
    && task.keywords.includes(`town:${contracts.townId}`));
  return {
    capturedAt,
    service,
    apiStatus: {
      status: statusBody.status ?? null,
      botCount: Number(statusBody.botCount ?? -1),
    },
    botNames: basics.map((bot) => bot.name).sort(),
    bots,
    town: townBody.town ?? null,
    residents: Array.isArray(residentsBody.residents) ? residentsBody.residents : [],
    brain: brainBody.brain ?? null,
    securityIncidents: Array.isArray(securityBody.incidents) ? securityBody.incidents : [],
    blackboardTasks: relevantTasks.map(compactTask),
    decisions,
  };
}

function stripAnsi(value) {
  return String(value ?? '').replace(ANSI_RE, '');
}

export function parsePrettyLogEntries(text) {
  const entries = [];
  let current = null;
  for (const originalLine of stripAnsi(text).split(/\r?\n/)) {
    const match = originalLine.match(
      /^\[(\d{2}:\d{2}:\d{2})]\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\s+\((\d+)\):\s*(.*)$/,
    );
    if (match) {
      if (current) entries.push(current);
      current = {
        time: match[1],
        level: match[2],
        pid: Number(match[3]),
        message: match[4].trim(),
        lines: [originalLine],
      };
    } else if (current) {
      current.lines.push(originalLine);
    }
  }
  if (current) entries.push(current);
  return entries.map((entry) => {
    const raw = entry.lines.join('\n');
    const botMatch = raw.match(/^\s*(?:bot|botName):\s*"([^"]+)"/m);
    const taskMatch = raw.match(/^\s*task:\s*"([^"]+)"/m);
    return {
      ...entry,
      botName: botMatch?.[1] ?? null,
      task: taskMatch?.[1] ?? null,
      raw,
    };
  });
}

export function analyzeLogWindow(text, expectedPid, rotated = false) {
  const allEntries = parsePrettyLogEntries(text);
  const entries = allEntries.filter((entry) => entry.pid === expectedPid);
  const includes = (entry, expression) => expression.test(`${entry.message}\n${entry.raw}`);
  const protectedActions = entries.filter((entry) => includes(
    entry,
    /(dig|place) blocked:.*protected build zone|protected (?:dig|place)|civic .*boundary.*reject/i,
  ));
  const securityEvents = entries.filter((entry) => includes(
    entry,
    /duplicate[- ]login|impersonation|quarantin/i,
  ));
  const workerLifecycleEvents = entries.filter((entry) => includes(
    entry,
    /worker heartbeat stale|replacing unresponsive bot worker|forced worker restart|worker exited/i,
  ));
  const civicShiftFailures = entries.filter((entry) => includes(
    entry,
    /approved civic shift waypoint unreachable|civic-shift.*(?:failed|error)|task failed after max retries/i,
  ) && (
    /civic-shift/i.test(entry.raw)
    || /approved civic shift/i.test(entry.raw)
  ));
  const stuckSignals = entries.filter((entry) => includes(
    entry,
    /path_reset.*stuck|stuck task on cooldown|abandoning task: same error appeared twice/i,
  ));
  const stuckGroups = new Map();
  for (const entry of stuckSignals) {
    const key = `${entry.botName ?? 'unknown'}\u0000${entry.task ?? entry.message}`;
    stuckGroups.set(key, (stuckGroups.get(key) ?? 0) + 1);
  }
  const repeatedStuckSignals = [...stuckGroups.entries()]
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [botName, task] = key.split('\u0000');
      return { botName, task, count };
    });
  const excerpt = (entry) => ({
    time: entry.time,
    level: entry.level,
    botName: entry.botName,
    task: entry.task,
    message: entry.message,
  });
  return {
    rotated,
    bytes: Buffer.byteLength(text),
    sha256: sha256(Buffer.from(text)),
    parsedEntries: entries.length,
    protectedActions: protectedActions.map(excerpt),
    securityEvents: securityEvents.map(excerpt),
    workerLifecycleEvents: workerLifecycleEvents.map(excerpt),
    civicShiftFailures: civicShiftFailures.map(excerpt),
    stuckSignals: stuckSignals.map(excerpt),
    repeatedStuckSignals,
  };
}

function phaseForTicks(ticks) {
  if (!Number.isFinite(ticks)) return null;
  const normalized = ((Number(ticks) % 24000) + 24000) % 24000;
  return normalized < 12000 ? 'day' : 'night';
}

function roleFromDescription(description) {
  return String(description ?? '').match(/\(requesting role:\s*([a-z_]+)\)/i)?.[1]?.toLowerCase() ?? null;
}

function isStructuredTownTask(task, contracts, role) {
  const keywords = Array.isArray(task?.keywords) ? task.keywords : [];
  return task?.source === 'swarm'
    && typeof task.description === 'string'
    && task.description.startsWith(`town:${contracts.townId} `)
    && roleFromDescription(task.description) === role
    && keywords.includes('town')
    && keywords.includes(`town:${contracts.townId}`)
    && keywords.includes('phase')
    && (keywords.includes('day') || keywords.includes('night'))
    && keywords.includes(role);
}

function isExactCivicShift(task, contracts, role) {
  const expected = contracts.shiftsByRole[role];
  const metadata = task?.metadata;
  return isStructuredTownTask(task, contracts, role)
    && task.keywords.includes('civic-shift')
    && task.keywords.includes(`shift:${expected.id}`)
    && task.keywords.includes('non-destructive')
    && metadata?.kind === 'civic-shift'
    && metadata?.version === 2
    && metadata?.roundTrip === true
    && metadata?.destinationActivity === expected.activity
    && metadata?.shiftId === expected.id
    && pointsEqual(metadata.waypoints, contracts.route);
}

function taskCategory(task) {
  if (task?.metadata?.kind === 'civic-shift') return 'civic';
  const keywords = Array.isArray(task?.keywords) ? task.keywords : [];
  return keywords.some((keyword) => LIFE_KEYWORDS.has(keyword)) ? 'life' : 'work';
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function routeProjection(position, route) {
  if (!position || !Array.isArray(route) || route.length < 2) {
    return { distance: Number.POSITIVE_INFINITY, progress: 0 };
  }
  const lengths = [];
  let total = 0;
  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1];
    const b = route[index];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    lengths.push(length);
    total += length;
  }
  let best = { distance: Number.POSITIVE_INFINITY, progress: 0 };
  let before = 0;
  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1];
    const b = route[index];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (
        (position.x - a.x) * dx + (position.z - a.z) * dz
      ) / lengthSquared));
    const px = a.x + t * dx;
    const pz = a.z + t * dz;
    const horizontal = Math.hypot(position.x - px, position.z - pz);
    const interpolatedY = a.y + t * (b.y - a.y);
    const vertical = Math.abs(position.y - interpolatedY);
    const candidateDistance = Math.hypot(horizontal, vertical);
    if (candidateDistance < best.distance) {
      best = {
        distance: candidateDistance,
        progress: total > 0 ? (before + t * lengths[index - 1]) / total : 0,
      };
    }
    before += lengths[index - 1];
  }
  return best;
}

function detectStationaryLoop(samples, botName, thresholdMs) {
  let run = null;
  let worst = null;
  for (const sample of samples) {
    const bot = sample.bots.find((candidate) => candidate.name === botName);
    const monitored = bot
      && bot.position
      && bot.currentTask
      && (bot.pathfinderMoving || /approved .* civic shift/i.test(bot.currentTask));
    if (!monitored) {
      run = null;
      continue;
    }
    if (
      !run
      || run.task !== bot.currentTask
      || distance(run.anchor, bot.position) > 1.5
    ) {
      run = {
        task: bot.currentTask,
        anchor: bot.position,
        startedAt: sample.capturedAt,
        endedAt: sample.capturedAt,
      };
      continue;
    }
    run.endedAt = sample.capturedAt;
    if (!worst || run.endedAt - run.startedAt > worst.durationMs) {
      worst = {
        task: run.task,
        position: run.anchor,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        durationMs: run.endedAt - run.startedAt,
      };
    }
  }
  return worst && worst.durationMs >= thresholdMs ? worst : null;
}

function uniqueDecisions(samples, botName, startedAt) {
  const byId = new Map();
  for (const sample of samples) {
    for (const decision of sample.decisions?.[botName] ?? []) {
      if (Number(decision.timestamp) < startedAt) continue;
      const id = decision.id ?? `${decision.type}:${decision.timestamp}:${decision.task}`;
      byId.set(id, decision);
    }
  }
  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function collectTaskTimelines(samples, startedAt) {
  const timelines = new Map();
  const firstSample = samples[0];
  const initiallyOpen = new Set(
    (firstSample?.blackboardTasks ?? [])
      .filter((task) => task.status === 'pending' || task.status === 'claimed')
      .map((task) => task.id),
  );
  for (const sample of samples) {
    for (const task of sample.blackboardTasks ?? []) {
      if (Number(task.createdAt) < startedAt && !initiallyOpen.has(task.id)) continue;
      let timeline = timelines.get(task.id);
      if (!timeline) {
        timeline = {
          id: task.id,
          task,
          observations: [],
        };
        timelines.set(task.id, timeline);
      }
      timeline.task = task;
      timeline.observations.push({
        capturedAt: sample.capturedAt,
        status: task.status,
        assignedBot: task.assignedBot,
        updatedAt: task.updatedAt,
      });
    }
  }
  return [...timelines.values()];
}

function gate(id, passed, summary, evidence = {}) {
  return {
    id,
    status: passed ? 'PASS' : 'FAIL',
    summary,
    evidence,
  };
}

export function evaluateObservation(input) {
  const {
    contracts,
    samples,
    startedAt,
    endedAt,
    expectedPid,
    minimumDurationMs = 20 * 60_000,
    minimumSamples = 3,
    stationaryLoopMs = 120_000,
    logEvidence = analyzeLogWindow('', expectedPid, false),
    activation = null,
  } = input;
  const gates = [];
  const failures = [];
  const addGate = (result) => {
    gates.push(result);
    if (result.status !== 'PASS') failures.push(`${result.id}: ${result.summary}`);
  };
  const observationDurationMs = Math.max(0, endedAt - startedAt);
  addGate(gate(
    'observation-window',
    observationDurationMs >= minimumDurationMs && samples.length >= minimumSamples,
    observationDurationMs >= minimumDurationMs && samples.length >= minimumSamples
      ? `Observed ${samples.length} samples across ${Math.round(observationDurationMs / 1000)} seconds`
      : `Need at least ${Math.round(minimumDurationMs / 1000)} seconds and ${minimumSamples} samples; observed ${Math.round(observationDurationMs / 1000)} seconds / ${samples.length} samples`,
    { observationDurationMs, minimumDurationMs, samples: samples.length, minimumSamples },
  ));

  const servicePass = samples.length > 0 && samples.every((sample) =>
    sample.service?.active === true && sample.service?.pid === expectedPid && expectedPid > 0);
  addGate(gate(
    'single-systemd-service',
    servicePass,
    servicePass
      ? `Every sample used active systemd PID ${expectedPid}`
      : 'Service was inactive, changed PID, or did not have a positive MainPID',
    {
      expectedPid,
      observed: [...new Set(samples.map((sample) => `${sample.service?.active}:${sample.service?.pid}`))],
    },
  ));

  const expectedNames = [...contracts.expectedNames].sort();
  const identityFailures = [];
  for (const sample of samples) {
    const names = [...(sample.botNames ?? [])].sort();
    if (
      sample.apiStatus?.status !== 'ok'
      || sample.apiStatus?.botCount !== 5
      || JSON.stringify(names) !== JSON.stringify(expectedNames)
    ) {
      identityFailures.push({
        capturedAt: sample.capturedAt,
        apiStatus: sample.apiStatus,
        names,
      });
    }
    const aliveResidents = (sample.residents ?? [])
      .filter((resident) => resident.status === 'alive' || resident.status == null);
    const residentNames = aliveResidents.map((resident) => resident.botName).sort();
    if (JSON.stringify(residentNames) !== JSON.stringify(expectedNames)) {
      identityFailures.push({
        capturedAt: sample.capturedAt,
        residentNames,
      });
    } else {
      for (const resident of aliveResidents) {
        if (contracts.expectedRoles[resident.botName] !== resident.currentRole) {
          identityFailures.push({
            capturedAt: sample.capturedAt,
            resident: resident.botName,
            expectedRole: contracts.expectedRoles[resident.botName],
            actualRole: resident.currentRole,
          });
        }
      }
    }
  }
  addGate(gate(
    'five-exact-citizens-and-roles',
    samples.length > 0 && identityFailures.length === 0,
    identityFailures.length === 0
      ? 'Exactly Scott, Architect, Mason, Surveyor, and Steward retained their exact roles'
      : 'Bot or resident identity/role drift was observed',
    { failures: identityFailures.slice(0, 20) },
  ));

  const connectionFailures = [];
  for (const sample of samples) {
    for (const name of expectedNames) {
      const bot = sample.bots.find((candidate) => candidate.name === name);
      if (
        !bot
        || !bot.position
        || bot.health <= 0
        || bot.food < 0
        || bot.voyagerRunning !== true
        || bot.voyagerPaused === true
        || bot.state === 'DISCONNECTED'
        || bot.state === 'QUARANTINED'
        || bot.state === 'SPAWNING'
        || !Number.isFinite(bot.inboundAgeMs)
        || bot.inboundAgeMs > 120_000
      ) {
        connectionFailures.push({
          capturedAt: sample.capturedAt,
          name,
          state: bot?.state ?? null,
          position: bot?.position ?? null,
          health: bot?.health ?? null,
          food: bot?.food ?? null,
          voyagerRunning: bot?.voyagerRunning ?? null,
          voyagerPaused: bot?.voyagerPaused ?? null,
          inboundAgeMs: bot?.inboundAgeMs ?? null,
        });
      }
    }
  }
  addGate(gate(
    'connected-healthy-voyager-running',
    samples.length > 0 && connectionFailures.length === 0,
    connectionFailures.length === 0
      ? 'All five citizens remained spawned, healthy, packet-live, and autonomous'
      : 'A citizen was disconnected, unhealthy, stale, paused, spawning, or quarantined',
    { failures: connectionFailures.slice(0, 20) },
  ));

  const brainTicks = samples.map((sample) => Number(sample.brain?.ticks ?? 0));
  const brainPass = samples.length > 1 && samples.every((sample) =>
    sample.town?.id === contracts.townId
    && sample.town?.name === contracts.townName
    && sample.town?.status === 'active'
    && sample.town?.paused === false
    && sample.brain?.running === true
    && sample.brain?.paused === false)
    && Math.max(...brainTicks) > Math.min(...brainTicks);
  addGate(gate(
    'ravensreach-brain-running',
    brainPass,
    brainPass
      ? `Ravensreach stayed active and its brain advanced ${Math.max(...brainTicks) - Math.min(...brainTicks)} ticks`
      : 'Ravensreach was paused/inactive, its brain was stopped, or its tick count did not advance',
    { firstTicks: brainTicks[0] ?? null, lastTicks: brainTicks.at(-1) ?? null },
  ));

  const phases = new Set();
  for (const sample of samples) {
    for (const bot of sample.bots) {
      const phase = phaseForTicks(bot.worldTimeTicks);
      if (phase) phases.add(phase);
    }
  }
  const phasePass = phases.has('day') && phases.has('night');
  addGate(gate(
    'day-night-schedule-coverage',
    phasePass,
    phasePass
      ? 'Observation covered both day and night schedule phases'
      : `Observation phases were ${[...phases].join(', ') || 'unavailable'}`,
    { phases: [...phases].sort() },
  ));

  const incidentSamples = samples.filter((sample) =>
    (sample.securityIncidents ?? []).length > 0);
  const securityPass = incidentSamples.length === 0
    && logEvidence.securityEvents.length === 0
    && logEvidence.workerLifecycleEvents.length === 0
    && !logEvidence.rotated;
  addGate(gate(
    'security-and-worker-uniqueness',
    securityPass,
    securityPass
      ? 'No impersonation, quarantine, duplicate-login, worker-replacement, or log-rotation event occurred'
      : 'Security/worker incident or log rotation occurred during observation',
    {
      incidentSamples: incidentSamples.map((sample) => ({
        capturedAt: sample.capturedAt,
        incidents: sample.securityIncidents,
      })).slice(0, 10),
      securityLogEvents: logEvidence.securityEvents,
      workerLifecycleEvents: logEvidence.workerLifecycleEvents,
      logRotated: logEvidence.rotated,
    },
  ));

  const taskTimelines = collectTaskTimelines(samples, startedAt);
  const citizenResults = [];
  const allLocalCategories = new Set();
  let roleTheftCount = 0;
  for (const timeline of taskTimelines) {
    const assignedNames = new Set(
      timeline.observations.map((observation) => observation.assignedBot).filter(Boolean),
    );
    for (const assigned of assignedNames) {
      const role = contracts.expectedRoles[assigned];
      if (!role || !isStructuredTownTask(timeline.task, contracts, role)) {
        roleTheftCount += 1;
      }
    }
  }

  for (const name of expectedNames) {
    const role = contracts.expectedRoles[name];
    const expectedShift = contracts.shiftsByRole[role];
    const owned = taskTimelines.filter((timeline) =>
      timeline.observations.some((observation) => observation.assignedBot === name));
    const structured = owned.filter((timeline) =>
      isStructuredTownTask(timeline.task, contracts, role));
    const completed = structured.filter((timeline) =>
      timeline.observations.some((observation) =>
        observation.assignedBot === name
        && observation.status === 'completed'
        && observation.updatedAt >= startedAt));
    const civic = completed.find((timeline) =>
      isExactCivicShift(timeline.task, contracts, role));
    const local = completed.filter((timeline) =>
      timeline.task.metadata?.kind !== 'civic-shift');
    for (const timeline of local) allLocalCategories.add(taskCategory(timeline.task));
    const decisions = uniqueDecisions(samples, name, startedAt);
    const civicCodeDecision = civic
      ? decisions.find((decision) =>
        decision.type === 'skill_vs_codegen'
        && decision.task === civic.task.description
        && decision.decision === 'civic-shift')
      : null;
    const civicOutcome = civic
      ? decisions.find((decision) =>
        decision.type === 'task_outcome'
        && decision.task === civic.task.description
        && decision.decision === 'success')
      : null;
    const localWithOutcome = local.filter((timeline) =>
      decisions.some((decision) =>
        decision.type === 'task_outcome'
        && decision.task === timeline.task.description
        && decision.decision === 'success'));
    const activeShiftDescription = civic?.task.description
      ?? taskTimelines.find((timeline) =>
        isExactCivicShift(timeline.task, contracts, role))?.task.description
      ?? null;
    const routeSamples = activeShiftDescription
      ? samples.flatMap((sample) => {
        const bot = sample.bots.find((candidate) => candidate.name === name);
        if (!bot?.position || bot.currentTask !== activeShiftDescription) return [];
        const projection = routeProjection(bot.position, contracts.route);
        return [{
          capturedAt: sample.capturedAt,
          position: bot.position,
          distance: projection.distance,
          progress: projection.progress,
        }];
      })
      : [];
    const maxProgress = routeSamples.length > 0
      ? Math.max(...routeSamples.map((sample) => sample.progress))
      : 0;
    const maxDistance = routeSamples.length > 0
      ? Math.max(...routeSamples.map((sample) => sample.distance))
      : Number.POSITIVE_INFINITY;
    const originDepartureIndex = routeSamples.findIndex((sample) =>
      sample.progress >= 0.15);
    const destinationIndex = routeSamples.findIndex((sample) =>
      sample.progress >= 0.95);
    const returnIndex = destinationIndex < 0
      ? -1
      : routeSamples.findIndex((sample, index) =>
        index > destinationIndex && sample.progress <= 0.15);
    const originDepartureObserved = originDepartureIndex >= 0;
    const destinationObserved = destinationIndex >= 0;
    const returnObserved = returnIndex >= 0;
    const stationaryLoop = detectStationaryLoop(samples, name, stationaryLoopMs);
    const failedOutcomesByTask = new Map();
    for (const decision of decisions.filter((candidate) =>
      candidate.type === 'task_outcome' && candidate.decision === 'failure')) {
      failedOutcomesByTask.set(
        decision.task,
        (failedOutcomesByTask.get(decision.task) ?? 0) + 1,
      );
    }
    const repeatedFailedOutcomes = [...failedOutcomesByTask.entries()]
      .filter(([, count]) => count >= 2)
      .map(([task, count]) => ({ task, count }));
    const result = {
      name,
      role,
      expectedShiftId: expectedShift.id,
      structuredTasksReceived: structured.length,
      structuredTasksCompleted: completed.length,
      civicShiftCompleted: Boolean(civic),
      civicShiftDeterministicExecutorObserved: Boolean(civicCodeDecision),
      civicShiftSuccessfulOutcomeObserved: Boolean(civicOutcome),
      localStructuredTasksCompleted: local.length,
      localSuccessfulOutcomesObserved: localWithOutcome.length,
      localCategories: [...new Set(local.map((timeline) => taskCategory(timeline.task)))].sort(),
      routeSamples: routeSamples.length,
      routeMaxProgress: Number(maxProgress.toFixed(4)),
      routeMaxDistance: Number.isFinite(maxDistance)
        ? Number(maxDistance.toFixed(3))
        : null,
      originDepartureObserved,
      destinationObserved,
      returnObserved,
      stationaryLoop,
      repeatedFailedOutcomes,
      passed:
        structured.length >= 2
        && completed.length >= 2
        && Boolean(civic)
        && Boolean(civicCodeDecision)
        && Boolean(civicOutcome)
        && localWithOutcome.length >= 1
        && routeSamples.length >= 3
        && originDepartureObserved
        && destinationObserved
        && returnObserved
        && maxDistance <= 5.5
        && !stationaryLoop
        && repeatedFailedOutcomes.length === 0,
    };
    citizenResults.push(result);
  }

  const taskPass = citizenResults.every((result) =>
    result.structuredTasksReceived >= 2
    && result.structuredTasksCompleted >= 2
    && result.localSuccessfulOutcomesObserved >= 1)
    && roleTheftCount === 0;
  addGate(gate(
    'structured-civic-work-life',
    taskPass,
    taskPass
      ? 'Every citizen completed a civic shift and another structured local routine under its exact role'
      : 'One or more citizens lacked two structured completions, a local successful outcome, or exact role ownership',
    {
      roleTheftCount,
      citizens: citizenResults.map((result) => ({
        name: result.name,
        received: result.structuredTasksReceived,
        completed: result.structuredTasksCompleted,
        localSuccessfulOutcomes: result.localSuccessfulOutcomesObserved,
      })),
    },
  ));

  const categoryPass = allLocalCategories.has('work') && allLocalCategories.has('life');
  addGate(gate(
    'fleet-work-life-variety',
    categoryPass,
    categoryPass
      ? 'The fleet completed both local work and local life routines in addition to civic shifts'
      : `Local completion categories were ${[...allLocalCategories].join(', ') || 'none'}`,
    { categories: [...allLocalCategories].sort() },
  ));

  const corridorPass = citizenResults.every((result) =>
    result.civicShiftCompleted
    && result.civicShiftDeterministicExecutorObserved
    && result.civicShiftSuccessfulOutcomeObserved
    && result.routeSamples >= 3
    && result.originDepartureObserved
    && result.destinationObserved
    && result.returnObserved
    && result.routeMaxDistance !== null
    && result.routeMaxDistance <= 5.5);
  addGate(gate(
    'reviewed-corridor-use',
    corridorPass,
    corridorPass
      ? `Every citizen completed its exact deterministic ${contracts.route.length}-waypoint outbound inspection and return trip`
      : 'A citizen lacked an exact shift completion, deterministic executor trace, destination visit, or return-home evidence',
    {
      exactPathSha256: contracts.exactPathSha256,
      citizens: citizenResults.map((result) => ({
        name: result.name,
        shiftCompleted: result.civicShiftCompleted,
        deterministic: result.civicShiftDeterministicExecutorObserved,
        outcome: result.civicShiftSuccessfulOutcomeObserved,
        routeSamples: result.routeSamples,
        maxProgress: result.routeMaxProgress,
        maxDistance: result.routeMaxDistance,
        originDepartureObserved: result.originDepartureObserved,
        destinationObserved: result.destinationObserved,
        returnObserved: result.returnObserved,
      })),
    },
  ));

  const protectedPass = logEvidence.protectedActions.length === 0
    && logEvidence.civicShiftFailures.length === 0;
  addGate(gate(
    'no-protected-action-or-shift-failure',
    protectedPass,
    protectedPass
      ? 'No protected dig/place rejection or civic-shift failure appeared in the process log window'
      : 'Protected action or civic-shift failure appeared in the process log window',
    {
      protectedActions: logEvidence.protectedActions,
      civicShiftFailures: logEvidence.civicShiftFailures,
    },
  ));

  const stuckPass = citizenResults.every((result) =>
    !result.stationaryLoop && result.repeatedFailedOutcomes.length === 0)
    && logEvidence.repeatedStuckSignals.length === 0;
  addGate(gate(
    'no-stuck-loop',
    stuckPass,
    stuckPass
      ? 'No bounded-motion stationary loop, repeated failed outcome, or repeated stuck log signal was observed'
      : 'A stationary/repeated-failure stuck loop was observed',
    {
      citizens: citizenResults.map((result) => ({
        name: result.name,
        stationaryLoop: result.stationaryLoop,
        repeatedFailedOutcomes: result.repeatedFailedOutcomes,
      })),
      repeatedStuckSignals: logEvidence.repeatedStuckSignals,
    },
  ));

  const status = failures.length === 0
    ? 'PASS_POST_RESTART_OBSERVATION'
    : 'FAIL';
  return {
    schemaVersion: 1,
    generatedAtUtc: new Date(endedAt).toISOString(),
    auditType: 'citizen-post-restart-observation',
    status,
    readOnly: true,
    town: {
      id: contracts.townId,
      name: contracts.townName,
    },
    contracts: {
      acceptedSnapshotSha256: contracts.acceptedSnapshotSha256,
      exactPathSha256: contracts.exactPathSha256,
      exactPathCells: contracts.exactPathCells,
      routeWaypoints: contracts.route.length,
      expectedRoles: contracts.expectedRoles,
      shifts: Object.values(contracts.shiftsByRole).map((shift) => ({
        id: shift.id,
        role: shift.role,
        phase: shift.phase,
        destination: shift.destination,
        nonDestructive: shift.nonDestructive,
        waypoints: shift.waypoints.length,
      })),
      activation,
    },
    observation: {
      startedAtUtc: new Date(startedAt).toISOString(),
      endedAtUtc: new Date(endedAt).toISOString(),
      durationMs: observationDurationMs,
      samples: samples.length,
      servicePid: expectedPid,
      phases: [...phases].sort(),
    },
    gates,
    citizenResults,
    safety: {
      protectedActions: logEvidence.protectedActions.length,
      securityEvents: logEvidence.securityEvents.length,
      workerLifecycleEvents: logEvidence.workerLifecycleEvents.length,
      civicShiftFailures: logEvidence.civicShiftFailures.length,
      repeatedStuckSignals: logEvidence.repeatedStuckSignals.length,
      logWindow: {
        rotated: logEvidence.rotated,
        bytes: logEvidence.bytes,
        sha256: logEvidence.sha256,
        parsedEntries: logEvidence.parsedEntries,
      },
    },
    failures,
  };
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderMarkdown(report) {
  const lines = [
    '# Five-Citizen Post-Restart Observation Audit',
    '',
    `Generated: ${report.generatedAtUtc}`,
    `Status: **${report.status}**`,
    `Mode: ${report.readOnly ? 'read-only observer' : 'unknown'}`,
    '',
    '## Contract',
    '',
    `- Town: ${report.town.name} (\`${report.town.id}\`)`,
    `- Snapshot SHA-256: \`${report.contracts.acceptedSnapshotSha256}\``,
    `- Exact path SHA-256: \`${report.contracts.exactPathSha256}\``,
    `- Route: ${report.contracts.routeWaypoints} waypoints / ${report.contracts.exactPathCells} exact cells`,
    `- Observation: ${Math.round(report.observation.durationMs / 1000)} seconds, ${report.observation.samples} samples, PID ${report.observation.servicePid}`,
    `- Schedule phases: ${report.observation.phases.join(', ') || 'none'}`,
    '',
    '## Gates',
    '',
    '| Gate | Status | Summary |',
    '|---|---|---|',
    ...report.gates.map((item) =>
      `| ${markdownEscape(item.id)} | ${item.status} | ${markdownEscape(item.summary)} |`),
    '',
    '## Citizens',
    '',
    '| Citizen | Role | Structured completed | Shift | Local success | Route samples | Destination | Returned | Max distance | Result |',
    '|---|---|---:|---|---:|---:|---|---|---:|---|',
    ...report.citizenResults.map((citizen) =>
      `| ${markdownEscape(citizen.name)} | ${markdownEscape(citizen.role)} | ` +
      `${citizen.structuredTasksCompleted} | ${citizen.civicShiftCompleted ? 'PASS' : 'FAIL'} | ` +
      `${citizen.localSuccessfulOutcomesObserved} | ${citizen.routeSamples} | ` +
      `${citizen.destinationObserved ? 'PASS' : 'FAIL'} | ${citizen.returnObserved ? 'PASS' : 'FAIL'} | ` +
      `${citizen.routeMaxDistance ?? 'n/a'} | ` +
      `${citizen.passed ? 'PASS' : 'FAIL'} |`),
    '',
    '## Safety',
    '',
    `- Protected-action log events: ${report.safety.protectedActions}`,
    `- Security events: ${report.safety.securityEvents}`,
    `- Worker lifecycle events: ${report.safety.workerLifecycleEvents}`,
    `- Civic-shift failures: ${report.safety.civicShiftFailures}`,
    `- Repeated stuck signals: ${report.safety.repeatedStuckSignals}`,
    `- Log window: ${report.safety.logWindow.bytes} bytes, SHA-256 \`${report.safety.logWindow.sha256}\``,
    '',
    '## Decision',
    '',
  ];
  if (report.status === 'PASS_POST_RESTART_OBSERVATION') {
    lines.push(
      'All five exact citizens remained connected and non-quarantined, completed their exact reviewed outbound-inspection-return civic shifts and structured local routines, demonstrated day/night work-life activity, stayed on the reviewed corridor, and produced no protected-action, security, worker-replacement, or stuck-loop evidence.',
    );
  } else {
    lines.push('The observation failed closed. Unmet conditions:');
    lines.push('');
    for (const failure of report.failures) lines.push(`- ${failure}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function auditTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function writeArtifacts(report, outDir, timestamp = auditTimestamp(new Date(report.generatedAtUtc))) {
  fs.mkdirSync(outDir, { recursive: true });
  const basename = `citizen-post-restart-observation-${timestamp}`;
  const jsonPath = path.join(outDir, `${basename}.json`);
  const markdownPath = path.join(outDir, `${basename}.md`);
  const withArtifacts = {
    ...report,
    artifacts: {
      json: jsonPath,
      markdown: markdownPath,
    },
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(withArtifacts, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(withArtifacts));
  return {
    report: withArtifacts,
    jsonPath,
    markdownPath,
  };
}

function logBaseline(logPath) {
  const stat = fs.statSync(logPath);
  return {
    dev: stat.dev,
    ino: stat.ino,
    size: stat.size,
  };
}

function readLogSince(logPath, baseline) {
  const stat = fs.statSync(logPath);
  if (stat.dev !== baseline.dev || stat.ino !== baseline.ino || stat.size < baseline.size) {
    return { text: '', rotated: true };
  }
  const length = stat.size - baseline.size;
  if (length === 0) return { text: '', rotated: false };
  const descriptor = fs.openSync(logPath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    let offset = 0;
    while (offset < length) {
      const read = fs.readSync(
        descriptor,
        buffer,
        offset,
        length - offset,
        baseline.size + offset,
      );
      if (read <= 0) break;
      offset += read;
    }
    if (offset !== length) return { text: buffer.subarray(0, offset).toString('utf8'), rotated: true };
    return { text: buffer.toString('utf8'), rotated: false };
  } finally {
    fs.closeSync(descriptor);
  }
}

function readySample(sample, contracts, expectedPid) {
  if (
    !sample.service?.active
    || sample.service.pid !== expectedPid
    || sample.apiStatus?.status !== 'ok'
    || sample.apiStatus?.botCount !== 5
    || JSON.stringify([...(sample.botNames ?? [])].sort()) !== JSON.stringify(contracts.expectedNames)
    || sample.town?.paused !== false
    || sample.brain?.running !== true
    || sample.brain?.paused !== false
    || (sample.securityIncidents ?? []).length !== 0
  ) return false;
  return contracts.expectedNames.every((name) => {
    const bot = sample.bots.find((candidate) => candidate.name === name);
    return bot
      && bot.position
      && bot.health > 0
      && bot.voyagerRunning
      && !bot.voyagerPaused
      && bot.state !== 'SPAWNING'
      && bot.state !== 'DISCONNECTED'
      && bot.state !== 'QUARANTINED';
  });
}

function compactProgress(samples, contracts) {
  const latest = samples.at(-1);
  const taskCounts = {};
  for (const name of contracts.expectedNames) {
    taskCounts[name] = (latest?.blackboardTasks ?? []).filter(
      (task) => task.assignedBot === name,
    ).length;
  }
  return {
    capturedAtUtc: latest ? new Date(latest.capturedAt).toISOString() : null,
    samples: samples.length,
    brainTicks: latest?.brain?.ticks ?? null,
    taskCounts,
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveObservation(options) {
  const contracts = loadAcceptedContracts();
  const activation = readPersistedActivation(contracts);
  const initialService = readServiceState();
  if (!initialService.active || initialService.pid <= 0) {
    throw new Error(
      `${SERVICE_NAME}.service must already be active; observer will not start it`,
    );
  }
  const expectedPid = initialService.pid;
  const baseline = logBaseline(options.logPath);
  const startedAt = Date.now();
  const readinessDeadline = startedAt + options.readinessMs;
  let firstSample = null;
  let lastReadinessError = null;
  do {
    try {
      const sample = await captureRuntimeSample({
        apiBase: options.apiBase,
        contracts,
      });
      if (readySample(sample, contracts, expectedPid)) {
        firstSample = sample;
        break;
      }
      lastReadinessError = new Error('runtime has not reached the exact ready state');
    } catch (error) {
      lastReadinessError = error;
    }
    if (Date.now() >= readinessDeadline) break;
    await sleep(Math.min(options.pollMs, 5_000));
  } while (true);
  if (!firstSample) {
    throw new Error(
      `readiness failed closed: ${lastReadinessError?.message ?? 'unknown error'}`,
    );
  }

  const samples = [firstSample];
  const observationDeadline = startedAt + options.durationMs;
  let runtimeFailure = null;
  while (Date.now() < observationDeadline) {
    await sleep(Math.min(options.pollMs, Math.max(1, observationDeadline - Date.now())));
    try {
      const sample = await captureRuntimeSample({
        apiBase: options.apiBase,
        contracts,
      });
      samples.push(sample);
      if (sample.service.pid !== expectedPid || !sample.service.active) {
        runtimeFailure = new Error('systemd service stopped or changed PID during observation');
        break;
      }
    } catch (error) {
      runtimeFailure = error;
      break;
    }
    process.stdout.write(`${JSON.stringify(compactProgress(samples, contracts))}\n`);
    const elapsed = samples.at(-1).capturedAt - startedAt;
    if (elapsed < options.minimumDurationMs) continue;
    const logWindow = readLogSince(options.logPath, baseline);
    const candidate = evaluateObservation({
      contracts,
      samples,
      startedAt,
      endedAt: samples.at(-1).capturedAt,
      expectedPid,
      minimumDurationMs: options.minimumDurationMs,
      minimumSamples: Math.max(3, Math.floor(options.minimumDurationMs / options.pollMs)),
      stationaryLoopMs: options.stationaryLoopMs,
      logEvidence: analyzeLogWindow(logWindow.text, expectedPid, logWindow.rotated),
      activation,
    });
    if (candidate.status === 'PASS_POST_RESTART_OBSERVATION') return candidate;
  }

  const endedAt = samples.at(-1)?.capturedAt ?? Date.now();
  const logWindow = readLogSince(options.logPath, baseline);
  const report = evaluateObservation({
    contracts,
    samples,
    startedAt,
    endedAt,
    expectedPid,
    minimumDurationMs: options.minimumDurationMs,
    minimumSamples: Math.max(3, Math.floor(options.minimumDurationMs / options.pollMs)),
    stationaryLoopMs: options.stationaryLoopMs,
    logEvidence: analyzeLogWindow(logWindow.text, expectedPid, logWindow.rotated),
    activation,
  });
  if (runtimeFailure) {
    report.status = 'FAIL';
    report.failures.unshift(`runtime-sampling: ${runtimeFailure.message}`);
    report.gates.unshift(gate(
      'runtime-sampling',
      false,
      `Runtime sampling aborted: ${runtimeFailure.message}`,
    ));
  }
  return report;
}

function failureReport(error, generatedAt = Date.now()) {
  let contractSummary = {
    acceptedSnapshotSha256: null,
    exactPathSha256: null,
    exactPathCells: null,
    routeWaypoints: null,
  };
  try {
    const contracts = loadAcceptedContracts();
    contractSummary = {
      acceptedSnapshotSha256: contracts.acceptedSnapshotSha256,
      exactPathSha256: contracts.exactPathSha256,
      exactPathCells: contracts.exactPathCells,
      routeWaypoints: contracts.route.length,
    };
  } catch {
    // The failing contract is itself useful evidence. Keep unknown identity
    // fields null rather than reporting a stale, hard-coded route as current.
  }
  return {
    schemaVersion: 1,
    generatedAtUtc: new Date(generatedAt).toISOString(),
    auditType: 'citizen-post-restart-observation',
    status: 'FAIL',
    readOnly: true,
    town: { id: TOWN_ID, name: TOWN_NAME },
    contracts: {
      ...contractSummary,
      expectedRoles: { ...EXPECTED_ROLES },
      shifts: [],
      activation: null,
    },
    observation: {
      startedAtUtc: new Date(generatedAt).toISOString(),
      endedAtUtc: new Date(generatedAt).toISOString(),
      durationMs: 0,
      samples: 0,
      servicePid: 0,
      phases: [],
    },
    gates: [gate('observer-startup', false, error.message)],
    citizenResults: [],
    safety: {
      protectedActions: 0,
      securityEvents: 0,
      workerLifecycleEvents: 0,
      civicShiftFailures: 0,
      repeatedStuckSignals: 0,
      logWindow: { rotated: false, bytes: 0, sha256: sha256(Buffer.alloc(0)), parsedEntries: 0 },
    },
    failures: [`observer-startup: ${error.message}`],
  };
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  let report;
  try {
    if (options.mode === 'fixture') {
      const fixture = JSON.parse(fs.readFileSync(options.fixture, 'utf8'));
      report = evaluateObservation(fixture);
    } else {
      report = await runLiveObservation(options);
    }
  } catch (error) {
    report = failureReport(error);
  }
  const written = writeArtifacts(report, options.outDir);
  console.log(JSON.stringify({
    status: written.report.status,
    jsonPath: written.jsonPath,
    markdownPath: written.markdownPath,
    failures: written.report.failures,
  }, null, 2));
  return written.report.status === 'PASS_POST_RESTART_OBSERVATION' ? 0 : 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  process.exitCode = await main();
}
