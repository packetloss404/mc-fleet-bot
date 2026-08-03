#!/usr/bin/env node
/**
 * Two-phase citizen commute activation.
 *
 * Phase `corridor` installs the surveyed leash corridor, disables Voyager,
 * pauses Ravensreach, and archives open town schedule work so one controlled
 * walker can validate the route without autonomous interference.
 *
 * Phase `shifts` requires a passing live bidirectional-walk audit, installs the
 * five reviewed town shifts, re-enables Voyager, and resumes Ravensreach.
 *
 * Execute only while mc-fleet-bot.service is stopped. Every touched durable
 * file is backed up first and writes are atomic with best-effort compensation.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

import {
  validateCitizenLiveWalkAudit,
  validateCitizenRouteProposal,
  validateCitizenRouteReport,
} from './lib/citizen-route-contract.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const TOWN_ID = 'town_mrzgshth_9d12c17d';
const PROPOSAL_PATH = path.join(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json',
);
const SURVEY_PATH = path.join(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json',
);
const CONFIG_PATH = path.join(ROOT, 'config.yml');
const DB_PATH = path.join(ROOT, 'data/town.db');
const BLACKBOARD_PATH = path.join(ROOT, 'data/blackboard.json');

function usage() {
  console.error(
    'Usage: node scripts/apply_citizen_cross_city_route.mjs ' +
    '--phase corridor|shifts [--dry-run|--execute] [--walk-audit FILE]',
  );
  process.exit(2);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const phase = argValue('--phase');
if (phase !== 'corridor' && phase !== 'shifts') usage();
const execute = process.argv.includes('--execute');
if (execute === process.argv.includes('--dry-run')) usage();

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function atomicWrite(filename, content) {
  const temp = `${filename}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, content, { mode: fs.statSync(filename).mode });
  const fd = fs.openSync(temp, 'r');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fs.renameSync(temp, filename);
}

function serviceIsActive() {
  try {
    return execFileSync('systemctl', ['is-active', 'mc-fleet-bot'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'active';
  } catch {
    return false;
  }
}

function renderConfig(source, desiredLeash, voyagerEnabled) {
  const leashYaml = yaml.dump(
    { leash: desiredLeash },
    { noRefs: true, lineWidth: -1, sortKeys: false },
  );
  const leashPattern = /^leash:\n[\s\S]*?(?=^# Safe fallback spot)/m;
  if (!leashPattern.test(source)) {
    throw new Error('config.yml leash section markers not found');
  }
  let next = source.replace(leashPattern, `${leashYaml}\n`);

  const voyagerStart = next.indexOf('voyager:\n');
  const voyagerEnd = next.indexOf('\nllm:\n', voyagerStart);
  if (voyagerStart < 0 || voyagerEnd < 0) {
    throw new Error('config.yml voyager section markers not found');
  }
  const voyagerBlock = next.slice(voyagerStart, voyagerEnd);
  if (!/^  enabled: (?:true|false)$/m.test(voyagerBlock)) {
    throw new Error('config.yml voyager.enabled line not found');
  }
  const updatedVoyager = voyagerBlock.replace(
    /^  enabled: (?:true|false)$/m,
    `  enabled: ${voyagerEnabled ? 'true' : 'false'}`,
  );
  next = next.slice(0, voyagerStart) + updatedVoyager + next.slice(voyagerEnd);
  return next;
}

function validateProposal() {
  const proposal = readJson(PROPOSAL_PATH);
  const survey = readJson(SURVEY_PATH);
  const routeContract = validateCitizenRouteReport(survey);
  const validatedProposal = validateCitizenRouteProposal(
    proposal,
    routeContract,
  );
  return {
    proposal,
    survey,
    routeContract,
    leash: validatedProposal.leash,
    shifts: validatedProposal.shifts,
  };
}

function resolveWalkAudit(routeContract) {
  const explicit = argValue('--walk-audit');
  const candidates = explicit
    ? [path.resolve(ROOT, explicit)]
    : fs.readdirSync(path.join(ROOT, 'data/runtime-audits'))
      .filter((name) => /^citizen-route-live-walk-.*\.json$/.test(name))
      .sort()
      .reverse()
      .map((name) => path.join(ROOT, 'data/runtime-audits', name));
  const filename = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filename) throw new Error('no citizen route live-walk audit was provided');
  const audit = readJson(filename);
  try {
    validateCitizenLiveWalkAudit(audit, routeContract);
  } catch (error) {
    throw new Error(
      `live-walk audit is not a PASS_BIDIRECTIONAL result for the current ` +
      `accepted snapshot, exact path, and choke disclosure: ${filename}: ` +
      `${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return { filename, audit };
}

function backupFiles(directory) {
  fs.mkdirSync(directory, { recursive: false });
  for (const filename of [CONFIG_PATH, DB_PATH, BLACKBOARD_PATH, PROPOSAL_PATH, SURVEY_PATH]) {
    if (fs.existsSync(filename)) {
      fs.copyFileSync(filename, path.join(directory, path.basename(filename)));
    }
  }
  for (const suffix of ['-wal', '-shm']) {
    const filename = `${DB_PATH}${suffix}`;
    if (fs.existsSync(filename)) {
      fs.copyFileSync(filename, path.join(directory, path.basename(filename)));
    }
  }
}

const {
  proposal,
  survey,
  routeContract,
  leash,
  shifts,
} = validateProposal();
const sourceConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
const parsedConfig = yaml.load(sourceConfig);
const currentNames = (parsedConfig.leash ?? []).map((entry) => entry.botName).sort();
const desiredNames = leash.map((entry) => entry.botName).sort();
if (JSON.stringify(currentNames) !== JSON.stringify(desiredNames)) {
  throw new Error(`current leash bot set differs from proposal: ${currentNames.join(',')}`);
}

const desiredVoyager = phase === 'shifts';
const nextConfig = renderConfig(sourceConfig, leash, desiredVoyager);
const parsedNextConfig = yaml.load(nextConfig);
if (
  parsedNextConfig.voyager?.enabled !== desiredVoyager ||
  parsedNextConfig.leash?.length !== 5 ||
  parsedNextConfig.leash.some(
    (entry) => entry.destinations?.length !== 1 || entry.corridors?.length !== 1,
  )
) {
  throw new Error('rendered config failed structural verification');
}

const walkAudit = phase === 'shifts' ? resolveWalkAudit(routeContract) : null;
const blackboard = readJson(BLACKBOARD_PATH);
const tasks = blackboard.tasks ?? [];
const heldTasks = phase === 'corridor'
  ? tasks.filter(
    (task) =>
      task.source === 'swarm'
      && (task.status === 'pending' || task.status === 'claimed')
      && (
        (
          Array.isArray(task.keywords)
          && (
            task.keywords.includes(`town:${TOWN_ID}`)
            || (
              task.keywords.includes('town')
              && String(task.description).startsWith(`town:${TOWN_ID}`)
            )
          )
        )
        // Old DungeonMaster instances emitted this impossible item-as-ore
        // family on every service restart. It has no resident role contract,
        // cannot be claimed by any of the five citizens, and must not survive
        // the controlled activation migration.
        || task.description === 'Mine the new iron_ingot deposit'
      ),
  )
  : [];
const nextBlackboard = phase === 'corridor'
  ? {
      ...blackboard,
      tasks: tasks.filter((task) => !heldTasks.some((held) => held.id === task.id)),
    }
  : blackboard;

const db = new Database(DB_PATH, execute ? {} : { readonly: true });
const town = db.prepare('select id, config_json, paused from towns where id = ?').get(TOWN_ID);
if (!town) throw new Error(`town not found: ${TOWN_ID}`);
const currentTownConfig = JSON.parse(town.config_json || '{}');
const nextTownConfig = phase === 'shifts'
  ? {
      ...currentTownConfig,
      citizenRoutine: {
        ...(currentTownConfig.citizenRoutine ?? {}),
        shifts,
      },
    }
  : currentTownConfig;

const preview = {
  phase,
  mode: execute ? 'execute' : 'dry-run',
  surveyAcceptedSnapshotSha256: survey.accepted.snapshot.sha256,
  exactPathSha256: survey.accepted.exactPathSha256,
  acceptanceClass: survey.acceptanceClass,
  exactPathCellCount: survey.exactPathCellCount,
  routineWaypointCount: routeContract.route.length,
  minimumHeadroomBlocks: survey.accepted.headroom.minimumClearBlocks,
  declaredWidthChokes: routeContract.chokes,
  leashEntries: leash.length,
  shifts: shifts.length,
  voyagerEnabledBefore: parsedConfig.voyager?.enabled,
  voyagerEnabledAfter: desiredVoyager,
  townPausedBefore: Boolean(town.paused),
  townPausedAfter: phase === 'corridor',
  heldTownTasks: heldTasks.length,
  walkAudit: walkAudit?.filename ?? null,
  configSha256Before: sha256(Buffer.from(sourceConfig)),
  configSha256After: sha256(Buffer.from(nextConfig)),
};

if (!execute) {
  db.close();
  console.log(JSON.stringify(preview, null, 2));
  process.exit(0);
}
if (serviceIsActive()) {
  db.close();
  throw new Error('mc-fleet-bot.service must be stopped before --execute');
}

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const backupDirectory = path.join(
  ROOT,
  'data/backups',
  `citizen-route-${phase}-${timestamp}`,
);
const auditDirectory = path.join(ROOT, 'data/runtime-audits');
fs.mkdirSync(auditDirectory, { recursive: true });
backupFiles(backupDirectory);
if (heldTasks.length > 0) {
  fs.writeFileSync(
    path.join(backupDirectory, 'held-town-tasks.json'),
    `${JSON.stringify({ townId: TOWN_ID, tasks: heldTasks }, null, 2)}\n`,
  );
}

let configWritten = false;
let blackboardWritten = false;
try {
  db.exec('BEGIN IMMEDIATE');
  db.prepare('update towns set config_json = ?, paused = ? where id = ?').run(
    JSON.stringify(nextTownConfig),
    phase === 'corridor' ? 1 : 0,
    TOWN_ID,
  );
  atomicWrite(CONFIG_PATH, nextConfig);
  configWritten = true;
  if (phase === 'corridor') {
    atomicWrite(BLACKBOARD_PATH, `${JSON.stringify(nextBlackboard, null, 2)}\n`);
    blackboardWritten = true;
  }
  db.exec('COMMIT');
} catch (error) {
  try { db.exec('ROLLBACK'); } catch {}
  if (configWritten) {
    fs.copyFileSync(path.join(backupDirectory, 'config.yml'), CONFIG_PATH);
  }
  if (blackboardWritten) {
    fs.copyFileSync(path.join(backupDirectory, 'blackboard.json'), BLACKBOARD_PATH);
  }
  db.close();
  throw error;
}

const verifiedTown = db.prepare('select config_json, paused from towns where id = ?').get(TOWN_ID);
db.close();
const verifiedTownConfig = JSON.parse(verifiedTown.config_json || '{}');
if (
  Boolean(verifiedTown.paused) !== (phase === 'corridor') ||
  (phase === 'shifts' && verifiedTownConfig.citizenRoutine?.shifts?.length !== 5)
) {
  throw new Error('post-write town verification failed');
}

const runtimeAudit = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS',
  ...preview,
  backupDirectory,
  heldTaskIds: heldTasks.map((task) => task.id),
};
const runtimeAuditPath = path.join(
  auditDirectory,
  `citizen-route-${phase}-${timestamp}.json`,
);
fs.writeFileSync(runtimeAuditPath, `${JSON.stringify(runtimeAudit, null, 2)}\n`);
console.log(JSON.stringify({
  ...runtimeAudit,
  runtimeAuditPath,
}, null, 2));
