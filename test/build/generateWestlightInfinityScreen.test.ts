import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'westlight-screen-'));
const outputPath = path.join(tempDir, 'screen.txt');
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const rollbackPath = outputPath.replace(/\.txt$/, '.rollback.txt');

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Westlight Infinity Screen generator', () => {
  it('emits a unique, fully guarded four-sided display', () => {
    execFileSync(
      process.execPath,
      ['scripts/generate_westlight_infinity_screen.mjs', outputPath],
      { cwd: ROOT },
    );

    const lines = fs.readFileSync(outputPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('REPL '));
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const targetCells = lines.map((line) => line.split(/\s+/).slice(1, 7).join(' '));

    expect(lines.length).toBeGreaterThan(300);
    expect(lines.every((line) => line.includes(' minecraft:air '))).toBe(true);
    expect(lines.some((line) => line.startsWith('SET '))).toBe(false);
    expect(new Set(targetCells).size).toBe(lines.length);
    expect(report.duplicateTargetCellCount).toBe(0);
    expect(report.design.displayFaces).toEqual(['north', 'south', 'east', 'west']);
    expect(report.acceptance.viewpointMatrix.totalRequiredViews).toBe(48);
    expect(report.baseline.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.rollback.operationCount).toBe(lines.length);
    expect(report.rollback.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.databaseFeatures[0]).toMatchObject({
      externalId: 'WL-INFINITY-SCREEN',
      parentExternalId: 'WL-BOWL',
      completionRatio: 0,
      conditionScore: null,
    });

    const rollback = fs.readFileSync(rollbackPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('REPL '));
    expect(rollback).toHaveLength(lines.length);
    expect(rollback.every((line) => line.endsWith(' minecraft:air'))).toBe(true);
  });

  it('keeps the field, seats, existing light rods, and canopy anchors out of its targets', () => {
    const points = fs.readFileSync(outputPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('REPL '))
      .map((line) => line.split(/\s+/).slice(1, 4).map(Number));

    expect(points.every(([, y]) => y >= 74 && y <= 92)).toBe(true);
    expect(points.some(([x, y, z]) => y === 87 && z === -560
      && [-369, -360, -351].includes(x))).toBe(false);
    expect(points.some(([, y]) => y === 93)).toBe(false);
  });
});
