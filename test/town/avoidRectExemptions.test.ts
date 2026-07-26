import { describe, it, expect } from 'vitest';

import { TownBrain } from '../../src/town/TownBrain';

/**
 * Regression tests for "the town cannot build on its own plaza".
 *
 * TownBrain derives SiteSelector's avoidRects from every row in the town registry.
 * That is right for structures — it is what stops buildings being stacked — but the
 * registry also holds rows for SURFACES and for things at a different elevation, and
 * treating those as no-build zones had a concrete consequence:
 *
 *   `plaza:1` is a 41x41 paved pad covering x[-105,-64] z[-395,-354] — the whole town
 *   centre. A village well belongs in the plaza, but with the plaza blocking, siting
 *   rejected every candidate there. The only "flat" ground the search could still
 *   reach was a pond, and the well was built in water three times running.
 *
 *   `mine:1` sits at y58, tens of blocks below the surface plane, and was vetoing
 *   surface sites directly above it for no reason.
 *
 * The grove is deliberately NOT exempt: trees have real vertical extent and building
 * through one destroys a landscape feature.
 *
 * These names are the real row names from Ravensreach's town.db.
 */
const isNonBlocking = (name: string): boolean =>
  (TownBrain as any).isNonBlockingFootprint(name);

describe('TownBrain avoidRect exemptions', () => {
  it('exempts the plaza, so a well can be sited in the town centre', () => {
    expect(isNonBlocking('plaza:1')).toBe(true);
  });

  it('exempts paths and roads (paved surfaces, not obstacles)', () => {
    expect(isNonBlocking('path:north')).toBe(true);
    expect(isNonBlocking('road:main')).toBe(true);
  });

  it('exempts the mine, which sits far below the surface plane', () => {
    expect(isNonBlocking('mine:1')).toBe(true);
  });

  it('does NOT exempt real structures — stacking protection must survive', () => {
    for (const n of ['town_hall:mrzhylkl', 'house:Architect', 'house:Scout', 'storehouse:1', 'well:ms0pwy7d', 'tavern:1']) {
      expect(isNonBlocking(n)).toBe(false);
    }
  });

  it('does NOT exempt the grove — trees are genuine obstacles', () => {
    expect(isNonBlocking('grove:1')).toBe(false);
  });

  it('is case-insensitive and tolerates whitespace in the kind prefix', () => {
    expect(isNonBlocking('Plaza:1')).toBe(true);
    expect(isNonBlocking(' plaza :1')).toBe(true);
  });

  it('treats a missing or malformed name as blocking (fail safe)', () => {
    // If we cannot tell what a row is, the safe assumption is that it IS a
    // building — under-blocking risks stacking a build on top of a real one.
    expect(isNonBlocking('')).toBe(false);
    expect(isNonBlocking(undefined as any)).toBe(false);
    expect(isNonBlocking(null as any)).toBe(false);
    expect(isNonBlocking('no-colon-here')).toBe(false);
  });
});
