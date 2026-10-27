import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const DESIGN_PATH = path.join(ROOT, 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z/rebound/mp11-c01-public-vertical-upper-portion-redesign-design-01.json');
const SOURCE_PATH = path.join(ROOT, 'data/worldsnap-mp11-upper-portion-source-20260827T140000Z');
const TRANSITION_LEDGER_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');
const RETURN_QA_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json');
const TRANSITION_MANIFEST_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const DIMENSION_PHYSICAL_PATH = path.join(ROOT, 'data/world-review/mp11-c01-dimension-physical-01-c01-08-post-20260828T040000Z/mp11-c01-dimension-physical-01.json');

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

describe('MP11 C01 public-vertical upper-portion redesign design 01', () => {
  it('binds a 21-station 5-wide × 5-clear-high upper-portion design on the fresh source and reports the bilateral endpoint/opening/transition overlap', () => {
    const design = JSON.parse(fs.readFileSync(DESIGN_PATH, 'utf8'));

    expect(design.id).toBe('MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-DESIGN-01');
    expect(design.status).toBe('SOURCE_BOUND_UPPER_PORTION_REDESIGN_DESIGN_ONLY');
    expect(design.mutationAuthority).toBe(false);
    expect(design.safetyBoundary.liveWorldMutated).toBe(false);
    expect(design.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
    expect(design.safetyBoundary.rollbackOperationFilesEmitted).toBe(0);
    expect(design.safetyBoundary.releaseManifestEmitted).toBe(false);

    // The design must be bound to the fresh source we just captured
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
    const captureManifestPath = path.join(SOURCE_PATH, 'combined-zones-complete-save-capture.json');
    expect(fs.existsSync(captureManifestPath)).toBe(true);
    const capture = JSON.parse(fs.readFileSync(captureManifestPath, 'utf8'));
    expect(capture.immutableCopy).toBe(true);
    expect(capture.requiredMembers?.length).toBe(130);
    const expectedRelative = path.relative(ROOT, SOURCE_PATH).split(path.sep).join('/');
    expect(design.source.snapshot).toBe(expectedRelative);
    expect(design.source.captureId).toBe(capture.captureId);
    expect(design.source.requiredMemberCount).toBe(130);

    // Design must reference the accepted main switchback transition 01 ledger and Return-02 QA
    expect(fs.existsSync(TRANSITION_LEDGER_PATH)).toBe(true);
    expect(fs.existsSync(RETURN_QA_PATH)).toBe(true);
    expect(fs.existsSync(TRANSITION_MANIFEST_PATH)).toBe(true);
    expect(fs.existsSync(DIMENSION_PHYSICAL_PATH)).toBe(true);
    const relDim = path.relative(ROOT, DIMENSION_PHYSICAL_PATH).split(path.sep).join('/');
    const relLedger = path.relative(ROOT, TRANSITION_LEDGER_PATH).split(path.sep).join('/');
    const relQa = path.relative(ROOT, RETURN_QA_PATH).split(path.sep).join('/');
    const relManifest = path.relative(ROOT, TRANSITION_MANIFEST_PATH).split(path.sep).join('/');
    expect(design.source.dimensionPhysical01.path).toBe(relDim);
    expect(design.source.acceptedMainSwitchbackTransition01.path).toBe(relLedger);
    expect(design.source.acceptedReturn02PostQa.path).toBe(relQa);
    expect(design.source.acceptedMainSwitchbackTransition01Manifest.path).toBe(relManifest);

    // Verify hash bindings
    const dimPhysicalBytes = fs.readFileSync(DIMENSION_PHYSICAL_PATH);
    const transitionLedgerBytes = fs.readFileSync(TRANSITION_LEDGER_PATH);
    const returnQaBytes = fs.readFileSync(RETURN_QA_PATH);
    const transitionManifestBytes = fs.readFileSync(TRANSITION_MANIFEST_PATH);
    expect(design.source.dimensionPhysical01.sha256).toBe(sha(dimPhysicalBytes));
    expect(design.source.acceptedMainSwitchbackTransition01.sha256).toBe(sha(transitionLedgerBytes));
    expect(design.source.acceptedReturn02PostQa.sha256).toBe(sha(returnQaBytes));
    expect(design.source.acceptedMainSwitchbackTransition01Manifest.sha256).toBe(sha(transitionManifestBytes));

    // Verify the upper-portion geometry
    const upper = design.selectedGeometry.upperPortion;
    expect(upper.stationCount).toBe(21);
    expect(upper.profile).toBe('5-wide × 5-clear-high');
    expect(upper.geometry.targetCellCount).toBeGreaterThan(0);
    // The defect stations (19) must all be on the path
    const stationPoints = new Set(upper.stations.map((s) => s.point.join(',')));
    const dimPhysical = JSON.parse(dimPhysicalBytes);
    const defectStations = dimPhysical.selectedDesignInput?.routeCurrentState?.nonconformingStations ?? [];
    for (const def of defectStations) {
      expect(stationPoints.has(def.point.join(','))).toBe(true);
    }
    // All stations must form a normal-walk path
    for (let i = 1; i < upper.stations.length; i++) {
      const a = upper.stations[i - 1].point;
      const b = upper.stations[i].point;
      const horiz = Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
      const dy = Math.abs(a[1] - b[1]);
      expect(horiz).toBe(1);
      expect(dy).toBeLessThanOrEqual(1);
    }

    // Safety
    expect(design.sourceSafety.upperPortionFluidOrGravitySourceHits).toBe(0);
    expect(design.sourceSafety.upperPortionFluidOrGravityHaloHits).toBe(0);
    expect(design.sourceSafety.upperPortionBlockEntityHits).toBe(0);
    expect(design.sourceSafety.upperPortionSavedEntityHits).toBe(0);

    // Disjointness from Return-02 (must be 0)
    expect(design.disjointnessFromAcceptedFabric.upperPortionAndReturn02CanonicalIntersectionCount).toBe(0);
    // The 51-cell overlap with main switchback transition 01 is the bilateral endpoint/opening/transition blocker
    expect(design.disjointnessFromAcceptedFabric.upperPortionAndAcceptedMainTargetIntersectionCount).toBeGreaterThan(0);
    expect(design.disjointnessFromAcceptedFabric.sharedEndpointInterpretation).toMatch(/endpoint|opening|transition/i);

    // The design must explicitly identify what is still required before any physical release
    expect(design.stillRequiredBeforeCompiler.length).toBeGreaterThan(0);
    const hasEndpointDesign = design.stillRequiredBeforeCompiler.some((r) => /endpoint|opening|transition/i.test(r));
    expect(hasEndpointDesign).toBe(true);

    // No claims of construction authority
    expect(design.nonClaims.some((c) => /world cell has been changed/i.test(c))).toBe(true);
    expect(design.nonClaims.some((c) => /public opening/i.test(c))).toBe(true);

    // Verify the design identity hash
    expect(design.designIdentitySha256).toBeDefined();
    expect(design.designIdentitySha256.length).toBe(64);
  });
});
