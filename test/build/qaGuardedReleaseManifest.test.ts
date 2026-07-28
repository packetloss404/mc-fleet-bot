import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_guarded_release_manifest.mjs');
const temporaryDirectories: string[] = [];

interface QaResult {
  status: string;
  passed: boolean;
  packages: Array<{
    passed: boolean;
    forward: {
      guardedCommandCount: number;
      externalGuardedCommandCount: number;
      duplicateTargetCells: number;
      errors: Array<{ reason: string }>;
    };
    rollback: {
      guardedCommandCount: number;
      externalGuardedCommandCount: number;
      duplicateTargetCells: number;
      errors: Array<{ reason: string }>;
    };
    cellErrors: Array<{ reason: string }>;
  }>;
}

function writeFixture(forward: string, rollback: string) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'guarded-manifest-qa-'),
  );
  temporaryDirectories.push(directory);
  const forwardPath = path.join(directory, 'forward.txt');
  const rollbackPath = path.join(directory, 'rollback.txt');
  const manifestPath = path.join(directory, 'manifest.json');
  const reportPath = path.join(directory, 'report.json');
  fs.writeFileSync(forwardPath, forward);
  fs.writeFileSync(rollbackPath, rollback);
  fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    transactionId: 'guarded-manifest-test',
    packages: [{
      key: 'test',
      forward: forwardPath,
      rollback: rollbackPath,
    }],
  }));
  return { manifestPath, reportPath };
}

function runQa(
  forward: string,
  rollback: string,
  expectSuccess: boolean,
): QaResult {
  const fixture = writeFixture(forward, rollback);
  const args = [
    SCRIPT,
    '--manifest',
    fixture.manifestPath,
    '--out',
    fixture.reportPath,
  ];
  if (expectSuccess) {
    execFileSync(process.execPath, args, { cwd: ROOT });
  } else {
    const result = spawnSync(process.execPath, args, {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    expect(result.status).toBe(1);
  }
  return JSON.parse(
    fs.readFileSync(fixture.reportPath, 'utf-8'),
  ) as QaResult;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('guarded release manifest QA', () => {
  it('accepts an exact ordered staged transition and its reverse', () => {
    const forward = [
      'REPL 0 64 0 0 64 0 minecraft:stone minecraft:blue_ice',
      'REPL 0 64 0 0 64 0 minecraft:blue_ice minecraft:barrel[facing=north,open=false]',
      'CMD execute if block 5 64 5 minecraft:barrel[facing=north,open=false] if block 0 64 0 minecraft:barrel[facing=north,open=false] run data merge block 0 64 0 {Items:[]}',
      '',
    ].join('\n');
    const rollback = [
      'CMD execute if block 0 64 0 minecraft:barrel[facing=north,open=false] if block 5 64 5 minecraft:barrel[facing=north,open=false] run data merge block 5 64 5 {Items:[]}',
      'REPL 0 64 0 0 64 0 minecraft:barrel[facing=north,open=false] minecraft:blue_ice',
      'REPL 0 64 0 0 64 0 minecraft:blue_ice minecraft:stone',
      '',
    ].join('\n');
    const report = runQa(forward, rollback, true);
    expect(report.status).toBe('PASS');
    expect(report.packages[0].forward.duplicateTargetCells).toBe(1);
    expect(report.packages[0].rollback.duplicateTargetCells).toBe(1);
    expect(report.packages[0].forward.guardedCommandCount).toBe(1);
    expect(report.packages[0].rollback.guardedCommandCount).toBe(1);
    expect(report.packages[0].forward.externalGuardedCommandCount).toBe(0);
    expect(report.packages[0].rollback.externalGuardedCommandCount).toBe(1);
    expect(report.packages[0].cellErrors).toEqual([]);
  });

  it('rejects a staged transition that is not contiguous', () => {
    const report = runQa(
      [
        'REPL 0 64 0 0 64 0 minecraft:stone minecraft:blue_ice',
        'REPL 0 64 0 0 64 0 minecraft:dirt minecraft:water[level=0]',
        '',
      ].join('\n'),
      [
        'REPL 0 64 0 0 64 0 minecraft:water[level=0] minecraft:dirt',
        'REPL 0 64 0 0 64 0 minecraft:blue_ice minecraft:stone',
        '',
      ].join('\n'),
      false,
    );
    expect(report.packages[0].cellErrors.map(({ reason }) => reason)).toContain(
      'forward-staged-transition-is-not-contiguous',
    );
  });

  it('rejects incomplete desired states even when rollback is symmetric', () => {
    const report = runQa(
      'REPL 0 64 0 0 64 0 minecraft:air minecraft:iron_bars\n',
      'REPL 0 64 0 0 64 0 minecraft:iron_bars minecraft:air\n',
      false,
    );
    expect(report.packages[0].forward.errors.map(({ reason }) => reason)).toContain(
      'incomplete-block-state',
    );
    expect(report.packages[0].rollback.errors.map(({ reason }) => reason)).toContain(
      'incomplete-block-state',
    );
  });

  it('rejects an unguarded data merge command', () => {
    const report = runQa(
      [
        'REPL 0 64 0 0 64 0 minecraft:stone minecraft:barrel[facing=north,open=false]',
        'CMD data merge block 0 64 0 {Items:[]}',
        '',
      ].join('\n'),
      'REPL 0 64 0 0 64 0 minecraft:barrel[facing=north,open=false] minecraft:stone\n',
      false,
    );
    expect(report.packages[0].forward.errors.map(({ reason }) => reason)).toContain(
      'command-is-not-exact-state-guarded-data-merge',
    );
  });
});
