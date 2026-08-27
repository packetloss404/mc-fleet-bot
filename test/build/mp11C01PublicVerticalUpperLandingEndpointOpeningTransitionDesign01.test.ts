import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const DESIGN_PATH = path.join(ROOT, 'data/world-review/mp11-c01-upper-landing-endpoint-opening-transition-design-01-c01-endpoint-source-20260827T144100Z/mp11-c01-public-vertical-upper-landing-endpoint-opening-transition-design-01.json');

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

describe('MP11 C01 public-vertical upper-landing endpoint/opening/transition design 01', () => {
  it('binds the bilateral endpoint between the accepted main switchback transition 01 upper landing and the upper-portion redesign 01 top station', () => {
    const design = JSON.parse(fs.readFileSync(DESIGN_PATH, 'utf8'));
    expect(design.id).toBe('MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-DESIGN-01');
    expect(design.status).toBe('SOURCE_BOUND_UPPER_LANDING_ENDPOINT_OPENING_TRANSITION_DESIGN_ONLY');
    expect(design.mutationAuthority).toBe(false);
    expect(design.safetyBoundary.liveWorldMutated).toBe(false);
    expect(design.safetyBoundary.forwardOperationFilesEmitted).toBe(0);

    // Endpoint topology
    expect(design.endpointTopology.mainSwitchbackUpperLandingCenter).toEqual([839, 43, -47]);
    expect(design.endpointTopology.upperPortionTopStation).toEqual([840, 42, -46]);

    // Transition cells summary
    expect(design.transitionCells.totalCells).toBeGreaterThan(0);
    expect(design.transitionCells.dualAcceptedCells + design.transitionCells.mainOnlyCells + design.transitionCells.upperOnlyCells + design.transitionCells.newAirCells).toBeGreaterThan(0);

    // Safety
    expect(design.sourceSafety.fluidOrGravityHits).toBe(0);
    expect(design.sourceSafety.blockEntityHits).toBe(0);
    expect(design.sourceSafety.savedEntityHits).toBe(0);

    // Bilateral preservation
    expect(design.bilateralPreservation.acceptedMainSwitchbackTransition01.preserved).toBe(true);
    expect(design.bilateralPreservation.upperPortionRedesign01.preserved).toBe(true);
    expect(design.bilateralPreservation.return02.preserved).toBe(true);

    // Hard stops
    expect(design.hardStops.length).toBeGreaterThan(0);

    // Non-claims
    expect(design.nonClaims.some((c) => /No RCON call, world mutation/.test(c))).toBe(true);

    // Identity
    expect(design.contractIdentitySha256.length).toBe(64);
  });
});
