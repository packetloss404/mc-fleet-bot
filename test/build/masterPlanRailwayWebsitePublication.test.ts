import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'master-plan-railway-site-'));
let report: Record<string, any>;
let manifest: Record<string, any>;

beforeAll(() => {
  execFileSync('node', [
    'world-showcase/scripts/sync_master_plan_railway_report.mjs',
    '--out-dir',
    output,
  ], { cwd: ROOT, stdio: 'pipe' });
  report = JSON.parse(fs.readFileSync(path.join(output, 'report-input.json'), 'utf8'));
  manifest = JSON.parse(fs.readFileSync(path.join(output, 'publication-manifest.json'), 'utf8'));
});

afterAll(() => {
  fs.rmSync(output, { recursive: true, force: true });
});

describe('Master Plan Railway website acceptance layer', () => {
  it('publishes the exact thirteen-plan order', () => {
    expect(report.plans.map(({ id }: { id: string }) => id)).toEqual(
      Array.from({ length: 13 }, (_, index) => `MP${String(index + 1).padStart(2, '0')}`),
    );
    expect(manifest.counts.plans).toBe(13);
  });

  it('keeps the cross-town railway explicitly unbuilt and uncommissioned', () => {
    expect(report.railway.currentStatus).toBe('NO_CONTINUOUS_CROSS_TOWN_PASSENGER_RAILWAY_PROVEN');
    expect(report.railway.proposedDesign.status).toBe('PROPOSED_NOT_SET_OUT_NOT_BUILT');
    expect(manifest.authority.passengerRailCommissioned).toBe(false);
  });

  it('retains a hard boundary and all three claim classes for every plan', () => {
    for (const plan of report.plans) {
      expect(plan.hardBoundary.length).toBeGreaterThan(20);
      expect(plan.built.length).toBeGreaterThan(0);
      expect(plan.unbuiltOrUnproven.length).toBeGreaterThan(0);
      expect(plan.proposedRemainingDesign.length).toBeGreaterThan(0);
    }
  });

  it('publishes the full X0 through X9 dependency sequence', () => {
    expect(report.dependencyOrder.map(({ id }: { id: string }) => id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `X${index}`),
    );
    expect(report.dependencyOrder[2].status).toBe('REQUIRES_FRESH_IMMUTABLE_SNAPSHOT');
  });

  it('hash-binds the validated inputs without granting execution authority', () => {
    expect(manifest.status).toBe('PASS_STATIC_ACCEPTANCE_LAYER_PREPARED');
    expect(manifest.authority).toEqual({
      planningOnly: true,
      worldEditAuthorized: false,
      passengerRailCommissioned: false,
    });
    expect(manifest.counts.evidenceBindings).toBe(29);
    expect(manifest.assets).toHaveLength(9);
    expect(manifest.source.passengerRailwaySupport).toHaveLength(6);
  });
});
