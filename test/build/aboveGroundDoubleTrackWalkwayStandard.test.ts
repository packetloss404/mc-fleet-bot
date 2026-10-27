import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/masterplans/ABOVE-GROUND-DOUBLE-TRACK-WALKWAY-STANDARD-2026-08-28.md'), 'utf8');
const map = fs.readFileSync(path.join(ROOT, 'docs/masterplans/above-ground-double-track-walkway-reference-map.svg'), 'utf8');

describe('above-ground double-track protected-walkway standard', () => {
  it('keeps the separate gallery, protected walking path, geometry, grade, terminal, and inverse-package requirements explicit', () => {
    expect(doc).toContain('23 blocks');
    expect(doc).toContain('0–5 | Service gallery');
    expect(doc).toContain('7–11 | Protected walking path');
    expect(doc).toContain('Track centres are exactly five blocks apart');
    expect(doc).toContain('1:12');
    expect(doc).toContain('1:8');
    expect(doc).toContain('48-block level tangent');
    expect(doc).toContain('12-block fenced recovery tail');
    expect(doc).toContain('one-way terminal loop');
    expect(doc).toContain('AG-0');
    expect(doc).toContain('exact forward and reverse operations');
    expect(doc).toContain('does not select an alignment, authorize a');
    expect(map).toContain('<svg');
    expect(map).toContain('PROTECTED PATH');
    expect(map).toContain('unloaded-cart one-way loop');
  });
});
