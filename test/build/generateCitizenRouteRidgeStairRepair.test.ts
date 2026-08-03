import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const require = createRequire(import.meta.url);
const minecraftData = require('minecraft-data')('1.21.11');
const Block = require('prismarine-block')(minecraftData);
const FORWARD = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt',
);
const ROLLBACK = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback.txt',
);
const MANIFEST = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.manifest.json',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/citizen-route-ridge-stair-repair-proposal-20260728.json',
);
const ROUTE_QA = path.join(
  ROOT,
  'data/world-review/citizen-route-ridge-stair-repair-projected-route-qa-20260728.json',
);

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function operations(filename: string): string[][] {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('REPL '))
    .map((line) => line.split(/\s+/));
}

describe('citizen route ridge stair repair package', () => {
  it('is an exact eight-cell reversible package that preserves the center stripe', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const forward = operations(FORWARD);
    const rollback = operations(ROLLBACK);

    expect(forward).toHaveLength(8);
    expect(rollback).toHaveLength(8);
    expect(manifest.status).toBe('PASS_OFFLINE_PROPOSAL_NOT_EXECUTED');
    expect(manifest.liveWorldMutated).toBe(false);
    expect(manifest.forward.sha256).toBe(sha256File(FORWARD));
    expect(manifest.rollback.sha256).toBe(sha256File(ROLLBACK));
    expect(manifest.source.sha256).toBe(
      '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
    );
    expect(new Set(forward.map((entry) => entry.slice(1, 4).join(','))).size).toBe(8);
    expect(forward.every((entry) => entry[7] === 'minecraft:polished_andesite'))
      .toBe(true);
    expect(forward.every((entry) => entry[8] === (
      'minecraft:polished_andesite_stairs'
      + '[facing=north,half=bottom,shape=straight,waterlogged=false]'
    ))).toBe(true);
    expect(forward.every((entry) => entry[1] !== '-82')).toBe(true);
    expect(new Set(forward.map((entry) => entry[1]))).toEqual(
      new Set(['-84', '-83', '-81', '-80']),
    );
    expect(new Set(forward.map((entry) => `${entry[2]},${entry[3]}`))).toEqual(
      new Set(['71,1', '72,0']),
    );
    for (let index = 0; index < forward.length; index += 1) {
      const direct = forward[index];
      const inverse = rollback[rollback.length - 1 - index];
      expect(inverse.slice(1, 7)).toEqual(direct.slice(1, 7));
      expect(inverse[7]).toBe(direct[8]);
      expect(inverse[8]).toBe(direct[7]);
    }
  });

  it('binds passing source preflight and strict parser dry-runs to package hashes', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.sourcePreflight).toMatchObject({
      status: 'PASS',
      guardsPassed: 8,
      guardsFailed: 0,
      operationSha256: manifest.forward.sha256,
    });
    expect(manifest.strictParserDryRuns.forward).toMatchObject({
      status: 'dry_run',
      strictNoop: true,
      operationRole: 'forward',
      sourceOperationCount: 8,
      commandCount: 8,
      operationSha256: manifest.forward.sha256,
    });
    expect(manifest.strictParserDryRuns.rollback).toMatchObject({
      status: 'dry_run',
      strictNoop: true,
      operationRole: 'rollback',
      sourceOperationCount: 8,
      commandCount: 8,
      operationSha256: manifest.rollback.sha256,
    });
    expect(manifest.scope).toMatchObject({
      targetCellCount: 8,
      centerStripePreserved: true,
      targetBlockEntities: 0,
    });
    expect(manifest.executionAuthorizedByThisManifest).toBe(false);
    expect(manifest.finalAcceptanceMayUseCachedSegmentPasses).toBe(false);
  });

  it('keeps all offline routes passing without relaxing the route contract', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    const routeQa = JSON.parse(fs.readFileSync(ROUTE_QA, 'utf8'));
    expect(report.diagnosis.classification).toBe(
      'PLANNER_VALID_EXECUTOR_MARGINAL_FULL_BLOCK_RIDGE',
    );
    expect(report.design.routeOrArrivalContractChanged).toBe(false);
    expect(routeQa).toMatchObject({
      status: 'PASS',
      acceptanceClass: 'OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT',
      summary: {
        routes: 22,
        passed: 22,
        failed: 0,
        directionalRuns: 44,
        passedDirections: 44,
      },
    });
  });

  it('uses the north-facing collision orientation for a northbound ascent', () => {
    const stair = Block.fromProperties(
      'polished_andesite_stairs',
      {
        facing: 'north',
        half: 'bottom',
        shape: 'straight',
        waterlogged: 'false',
      },
      0,
    );
    expect(stair.shapes).toContainEqual([0, 0, 0, 1, 0.5, 1]);
    expect(stair.shapes).toContainEqual([0, 0.5, 0, 1, 1, 0.5]);
  });
});

