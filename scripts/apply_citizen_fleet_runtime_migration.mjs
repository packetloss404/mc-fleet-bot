#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const WORKSPACE = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(WORKSPACE, 'data');
const TOWN_DB = path.join(DATA_DIR, 'town.db');
const BLACKBOARD = path.join(DATA_DIR, 'blackboard.json');
const BOTS = path.join(DATA_DIR, 'bots.json');
const CONFIG = path.join(WORKSPACE, 'config.yml');
const LOG = '/var/log/mc-fleet-bot.log';
const TOWN_ID = 'town_mrzgshth_9d12c17d';
const EXPECTED_BOTS = ['Architect', 'Mason', 'Scout', 'Steward', 'Surveyor'];

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
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

function atomicWriteJson(filename, value) {
  const temporary = `${filename}.citizen-migration-${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o640 });
  fs.renameSync(temporary, filename);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function normalizeResidentRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    townId: row.town_id,
    botName: row.bot_name,
    role: row.current_role,
    status: row.status,
  }));
}

function analyzeBlackboard(board) {
  if (!board || typeof board !== 'object' || !Array.isArray(board.tasks)) {
    throw new Error('data/blackboard.json does not contain a tasks array');
  }
  const statusCounts = {};
  for (const task of board.tasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
  }
  return { total: board.tasks.length, statusCounts };
}

/**
 * Remove only redundant terminal copies. The newest terminal row for each
 * exact source+description family is retained so audit/backoff history
 * survives. Pending and claimed rows are never removed here.
 */
function deduplicateTerminalTasks(board) {
  const terminal = new Set(['blocked', 'completed']);
  const newestByFamily = new Map();
  for (const task of board.tasks) {
    if (!terminal.has(task.status)) continue;
    const family = `${task.source ?? ''}\u0000${task.description ?? ''}`;
    const prior = newestByFamily.get(family);
    const taskTime = Number(task.updatedAt ?? task.createdAt ?? 0);
    const priorTime = Number(prior?.updatedAt ?? prior?.createdAt ?? 0);
    if (
      !prior
      || taskTime > priorTime
      || (taskTime === priorTime && String(task.id) > String(prior.id))
    ) {
      newestByFamily.set(family, task);
    }
  }
  const keepIds = new Set([...newestByFamily.values()].map((task) => task.id));
  const removed = [];
  const tasks = board.tasks.filter((task) => {
    if (!terminal.has(task.status)) return true;
    if (keepIds.has(task.id)) return true;
    removed.push({
      id: task.id,
      source: task.source,
      status: task.status,
      description: task.description,
      updatedAt: task.updatedAt ?? task.createdAt ?? null,
    });
    return false;
  });
  return {
    board: { ...board, tasks },
    removed,
    retainedTerminalFamilies: newestByFamily.size,
  };
}

async function main() {
  const execute = process.argv.includes('--execute');
  if (serviceIsActive()) {
    throw new Error(
      'mc-fleet-bot.service is active; stop it before running this migration',
    );
  }
  for (const filename of [TOWN_DB, BLACKBOARD, BOTS, CONFIG]) {
    if (!fs.existsSync(filename)) throw new Error(`required file missing: ${filename}`);
  }

  const db = new Database(TOWN_DB);
  const residentRows = db.prepare(`
    SELECT id, town_id, bot_name, current_role, status
    FROM residents
    WHERE town_id = ?
    ORDER BY lower(bot_name)
  `).all(TOWN_ID);
  const residentNames = residentRows.map((row) => row.bot_name).sort();
  if (JSON.stringify(residentNames) !== JSON.stringify(EXPECTED_BOTS)) {
    db.close();
    throw new Error(
      `resident precondition failed: expected ${EXPECTED_BOTS.join(', ')}, got ${residentNames.join(', ')}`,
    );
  }
  const scoutRows = residentRows.filter((row) => row.bot_name.toLowerCase() === 'scout');
  const scottRows = residentRows.filter((row) => row.bot_name.toLowerCase() === 'scott');
  if (
    scoutRows.length !== 1
    || scottRows.length !== 0
    || scoutRows[0].current_role !== 'lumberjack'
  ) {
    db.close();
    throw new Error('Scott/Scout identity precondition failed');
  }

  const originalBoard = JSON.parse(fs.readFileSync(BLACKBOARD, 'utf8'));
  const blackboardBefore = analyzeBlackboard(originalBoard);
  const deduplicated = deduplicateTerminalTasks(originalBoard);
  const blackboardAfter = analyzeBlackboard(deduplicated.board);
  const preview = {
    mode: execute ? 'execute' : 'dry-run',
    townId: TOWN_ID,
    residentsBefore: normalizeResidentRows(residentRows),
    residentsAfter: normalizeResidentRows(
      residentRows.map((row) => (
        row.bot_name.toLowerCase() === 'scout'
          ? { ...row, bot_name: 'Scott' }
          : row
      )),
    ),
    blackboardBefore,
    blackboardAfter,
    terminalDuplicatesToArchive: deduplicated.removed.length,
    pendingOrClaimedRemoved: 0,
  };

  if (!execute) {
    db.close();
    process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
    return;
  }

  const runId = timestamp();
  const backupDir = path.join(DATA_DIR, 'backups', `citizen-fleet-${runId}`);
  fs.mkdirSync(backupDir, { recursive: false, mode: 0o750 });
  await db.backup(path.join(backupDir, 'town.db'));
  for (const filename of [BLACKBOARD, BOTS, CONFIG, LOG]) {
    if (!fs.existsSync(filename)) continue;
    fs.copyFileSync(filename, path.join(backupDir, path.basename(filename)));
  }
  atomicWriteJson(
    path.join(backupDir, 'terminal-tasks-archived.json'),
    deduplicated.removed,
  );

  const migrateResident = db.transaction(() => {
    const result = db.prepare(`
      UPDATE residents
      SET bot_name = 'Scott'
      WHERE town_id = ?
        AND lower(bot_name) = 'scout'
        AND NOT EXISTS (
          SELECT 1
          FROM residents AS r2
          WHERE r2.town_id = residents.town_id
            AND lower(r2.bot_name) = 'scott'
        )
    `).run(TOWN_ID);
    if (result.changes !== 1) {
      throw new Error(`resident migration changed ${result.changes} rows; expected exactly 1`);
    }
  });
  migrateResident();
  const residentsAfter = db.prepare(`
    SELECT id, town_id, bot_name, current_role, status
    FROM residents
    WHERE town_id = ?
    ORDER BY lower(bot_name)
  `).all(TOWN_ID);
  if (
    residentsAfter.filter((row) => row.bot_name.toLowerCase() === 'scott').length !== 1
    || residentsAfter.some((row) => row.bot_name.toLowerCase() === 'scout')
  ) {
    throw new Error('resident postcondition failed after transaction');
  }

  try {
    atomicWriteJson(BLACKBOARD, deduplicated.board);
  } catch (error) {
    const compensateResident = db.transaction(() => {
      const result = db.prepare(`
        UPDATE residents
        SET bot_name = 'Scout'
        WHERE town_id = ?
          AND lower(bot_name) = 'scott'
          AND NOT EXISTS (
            SELECT 1
            FROM residents AS r2
            WHERE r2.town_id = residents.town_id
              AND lower(r2.bot_name) = 'scout'
          )
      `).run(TOWN_ID);
      if (result.changes !== 1) {
        throw new Error(
          `blackboard write failed and resident compensation changed ${result.changes} rows`,
        );
      }
    });
    compensateResident();
    throw error;
  } finally {
    db.close();
  }

  const reportDir = path.join(DATA_DIR, 'runtime-audits');
  fs.mkdirSync(reportDir, { recursive: true, mode: 0o750 });
  const reportPath = path.join(reportDir, `citizen-fleet-migration-${runId}.json`);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'PASS',
    backupDir,
    backupHashes: Object.fromEntries(
      fs.readdirSync(backupDir)
        .filter((name) => fs.statSync(path.join(backupDir, name)).isFile())
        .map((name) => [name, sha256(path.join(backupDir, name))]),
    ),
    residentsBefore: normalizeResidentRows(residentRows),
    residentsAfter: normalizeResidentRows(residentsAfter),
    blackboardBefore,
    blackboardAfter,
    terminalDuplicatesArchived: deduplicated.removed.length,
    retainedTerminalFamilies: deduplicated.retainedTerminalFamilies,
    pendingOrClaimedRemoved: 0,
    liveWorldMutated: false,
  };
  atomicWriteJson(reportPath, report);
  process.stdout.write(`${JSON.stringify({ ...report, reportPath }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
