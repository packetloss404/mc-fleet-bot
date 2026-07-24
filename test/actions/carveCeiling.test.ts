import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Raven Rock OQ-4 — the excavation Y-ceiling that protects the 22-block
 * greenstone buffer (y41→y61) under MainStreet America.
 *
 * The two behaviours worth pinning are the ones that would quietly wreck a
 * build if they regressed: the guard must be OFF unless explicitly enabled
 * (otherwise all surface work is forbidden), and the exempt column must be the
 * RELOCATED shaft footprint.
 */

const loadConfigMock = vi.fn();
vi.mock('../../src/config', () => ({ loadConfig: () => loadConfigMock() }));
vi.mock('../../src/util/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));

async function freshGeofence(mining: any) {
  loadConfigMock.mockReturnValue({ mining });
  vi.resetModules();
  return import('../../src/actions/geofence');
}

describe('carve ceiling (OQ-4)', () => {
  beforeEach(() => { loadConfigMock.mockReset(); });
  afterEach(() => { vi.resetModules(); });

  it('is a no-op when the section is absent (fails open)', async () => {
    const g = await freshGeofence({});
    expect(g.isAboveCarveCeiling(0, 64, 0)).toBe(false);
    expect(g.getCarveCeiling()).toBeNull();
  });

  it('is a no-op when present but enabled:false — this is the default', async () => {
    const g = await freshGeofence({
      carveCeiling: { enabled: false, maxY: 41, exempt: [] },
    });
    // y64 is the MSA build plane and y67 the Ravensreach hall floor. If a
    // disabled ceiling blocked these, every surface build would be refused.
    expect(g.isAboveCarveCeiling(0, 64, 0)).toBe(false);
    expect(g.isAboveCarveCeiling(-85, 67, -375)).toBe(false);
  });

  describe('when enabled', () => {
    const mining = {
      carveCeiling: {
        enabled: true,
        maxY: 41,
        exempt: [{ name: 'rr-z5-shaft', minX: 193, maxX: 207, minZ: -22, maxZ: -8 }],
      },
    };

    it('permits edits at or below the ceiling', async () => {
      const g = await freshGeofence(mining);
      expect(g.isAboveCarveCeiling(0, 41, 0)).toBe(false); // boundary is inclusive
      expect(g.isAboveCarveCeiling(0, 40, 0)).toBe(false); // cavern ceiling
      expect(g.isAboveCarveCeiling(0, -12, 0)).toBe(false); // cavern floor
    });

    it('refuses edits above the ceiling — the buffer and MSA above it', async () => {
      const g = await freshGeofence(mining);
      expect(g.isAboveCarveCeiling(0, 42, 0)).toBe(true);  // first buffer layer
      expect(g.isAboveCarveCeiling(0, 61, 0)).toBe(true);  // last buffer layer
      expect(g.isAboveCarveCeiling(0, 64, 0)).toBe(true);  // MSA surface
    });

    it('exempts the RELOCATED RR-Z5 shaft column all the way to the surface', async () => {
      const g = await freshGeofence(mining);
      for (const y of [42, 61, 64]) {
        expect(g.isAboveCarveCeiling(200, y, -15)).toBe(false); // shaft centre
      }
      // inclusive edges of the footprint
      expect(g.isAboveCarveCeiling(193, 64, -22)).toBe(false);
      expect(g.isAboveCarveCeiling(207, 64, -8)).toBe(false);
    });

    it('does NOT exempt the superseded pre-OQ-1 shaft footprint', async () => {
      const g = await freshGeofence(mining);
      // x[113,127] z[53,67] is the location the shaft was moved AWAY from. If a
      // future edit copies it out of one of the stale documents, the guard
      // would whitelist empty rock and refuse the real shaft.
      expect(g.isAboveCarveCeiling(120, 64, 60)).toBe(true);
    });

    it('refuses just outside the exempt box', async () => {
      const g = await freshGeofence(mining);
      expect(g.isAboveCarveCeiling(192, 64, -15)).toBe(true);
      expect(g.isAboveCarveCeiling(208, 64, -15)).toBe(true);
      expect(g.isAboveCarveCeiling(200, 64, -23)).toBe(true);
      expect(g.isAboveCarveCeiling(200, 64, -7)).toBe(true);
    });
  });

  it('ignores a malformed block rather than half-enabling it', async () => {
    const g = await freshGeofence({ carveCeiling: { enabled: true } }); // no maxY
    expect(g.getCarveCeiling()).toBeNull();
    expect(g.isAboveCarveCeiling(0, 64, 0)).toBe(false);
  });
});
