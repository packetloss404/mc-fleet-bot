import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const script = path.resolve('scripts/generate_rcon_successful_prefix_rollback.mjs');

function sha256(contents: string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function fixture(failedGroupIndex = 1) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prefix-rollback-'));
  temporaryDirectories.push(directory);
  const operations = [
    'REPL 0 10 0 0 10 0 minecraft:stone minecraft:smooth_quartz',
    'REPL 1 10 0 1 10 0 minecraft:air minecraft:air',
    '',
  ].join('\n');
  const execution = {
    status: 'failed',
    operationSha256: sha256(operations),
    sourceGroupPlanSha256: 'fixture-plan',
    successfulGroups: 1,
    failedGroups: 1,
    groupFailures: [{ groupIndex: failedGroupIndex }],
    sourceGroups: [
      {
        index: 0,
        line: 1,
        kind: 'REPL',
        alternatives: [{ index: 0, state: 'minecraft:stone' }],
        expandedStart: 0,
        expandedEnd: 1,
        box: [0, 10, 0, 0, 10, 0],
        replacement: 'minecraft:smooth_quartz',
        sourceMask: 'minecraft:stone',
        finiteUnion: false,
      },
    ],
  };
  const operationsPath = path.join(directory, 'forward.txt');
  const executionPath = path.join(directory, 'execution.json');
  fs.writeFileSync(operationsPath, operations);
  fs.writeFileSync(executionPath, JSON.stringify(execution));
  return {
    directory,
    operationsPath,
    executionPath,
    outputPath: path.join(directory, 'rollback.txt'),
    auditPath: path.join(directory, 'audit.json'),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('journal-proven successful-prefix rollback generator', () => {
  it('writes the exact inverse of only the successful one-cell prefix', () => {
    const files = fixture();
    const result = spawnSync(process.execPath, [
      script,
      '--execution', files.executionPath,
      '--ops', files.operationsPath,
      '--out', files.outputPath,
      '--audit', files.auditPath,
    ], { encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    const rollback = fs.readFileSync(files.outputPath, 'utf8');
    expect(rollback).toContain(
      'REPL 0 10 0 0 10 0 minecraft:smooth_quartz minecraft:stone',
    );
    expect(rollback).not.toContain('REPL 1 10 0');
    const audit = JSON.parse(fs.readFileSync(files.auditPath, 'utf8'));
    expect(audit.rollback).toMatchObject({
      operationCount: 1,
      exactReverseOrder: true,
      oneCellReplOnly: true,
    });
  });

  it('rejects a report whose failed group is not the next prefix group', () => {
    const files = fixture(2);
    const result = spawnSync(process.execPath, [
      script,
      '--execution', files.executionPath,
      '--ops', files.operationsPath,
      '--out', files.outputPath,
      '--audit', files.auditPath,
    ], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'failed group is not immediately after the successful prefix',
    );
    expect(fs.existsSync(files.outputPath)).toBe(false);
  });
});
