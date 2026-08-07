import { describe, it, expect } from 'vitest';
import { validatePatch } from '../../src/util/configPersist';
import { loadConfig } from '../../src/config';

/**
 * validatePatch must reject unknown fields ATOMICALLY (nothing applied) —
 * silent dropping while returning ok:true let a PATCH to
 * mining.protectedZones report success and change nothing (2026-08 audit).
 * And because the dashboard saves by PATCHing back the ENTIRE fetched
 * section, every field the GET returns must be accepted on echo, or that
 * settings tab can never save (found in review: behavior.headTrackingTickMs
 * and wanderIntervalMs were missing from FIELD_TYPES).
 */
describe('validatePatch atomic rejection', () => {
  it('rejects unknown fields and applies nothing', () => {
    const r = validatePatch('behavior', { wanderRadius: 20, bogusField: 1 });
    expect(r.ok).toBe(false);
    expect(r.values).toEqual({});
    expect(r.errors[0]).toMatch(/not patchable/);
  });

  it('still accepts a fully-known patch', () => {
    const r = validatePatch('behavior', { wanderRadius: 20, headTrackingTickMs: 250 });
    expect(r.ok).toBe(true);
    expect(r.values).toEqual({ wanderRadius: 20, headTrackingTickMs: 250 });
  });

  it('accepts a GET→PATCH echo of the live behavior section (dashboard save pattern)', () => {
    const config = loadConfig() as any;
    const echo: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config.behavior ?? {})) {
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') echo[k] = v;
    }
    expect(Object.keys(echo).length).toBeGreaterThan(0);
    const r = validatePatch('behavior', echo);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
