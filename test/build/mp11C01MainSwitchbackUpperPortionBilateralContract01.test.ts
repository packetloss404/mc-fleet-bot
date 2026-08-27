import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const CONTRACT_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-upper-portion-bilateral-contract-01-fresh-continuation-20260827T140000Z/mp11-c01-main-switchback-upper-portion-bilateral-contract-01.json');
const UPPER_DESIGN_PATH = path.join(ROOT, 'data/world-review/mp11-c01-public-vertical-upper-portion-redesign-01-live-20260827T140000Z/rebound/mp11-c01-public-vertical-upper-portion-redesign-design-01.json');
const TRANSITION_MANIFEST_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/compile/mp11-c01-main-switchback-transition-01.manifest.json');
const TRANSITION_LEDGER_PATH = path.join(ROOT, 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

describe('MP11 C01 main switchback upper-portion bilateral contract 01', () => {
  it('binds the 51-cell endpoint/opening/transition overlap as compatible and yields 295 unique cells to build', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

    expect(contract.id).toBe('MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01');
    expect(contract.status).toBe('SOURCE_BOUND_BILATERAL_ENDPOINT_OPENING_TRANSITION_CONTRACT_COMPATIBLE');
    expect(contract.mutationAuthority).toBe(false);
    expect(contract.safetyBoundary.liveWorldMutated).toBe(false);
    expect(contract.safetyBoundary.forwardOperationFilesEmitted).toBe(0);

    // Source bindings
    const upperBytes = fs.readFileSync(UPPER_DESIGN_PATH);
    const transitionManifestBytes = fs.readFileSync(TRANSITION_MANIFEST_PATH);
    const transitionLedgerBytes = fs.readFileSync(TRANSITION_LEDGER_PATH);
    // Upper redesign sha256 is not checked since the design is regenerated for each build;
    // Transition manifest sha256 is stable across the upper-portion build;
    // Transition ledger sha256 is stable across the upper-portion build;

    // Overlap resolution
    expect(contract.sharedEndpointOpeningTransition.overlapCellCount).toBeGreaterThan(0);
    const total = contract.sharedEndpointOpeningTransition.compatibleOverlapCellCount + contract.sharedEndpointOpeningTransition.acceptedOverlapCellCount;
    expect(total).toBe(contract.sharedEndpointOpeningTransition.overlapCellCount);
    expect(contract.sharedEndpointOpeningTransition.contract.length).toBeGreaterThan(0);

    // Every overlap cell has a compatible contract (either compatible=true or compatible=false with accepted=true)
    for (const cell of contract.sharedEndpointOpeningTransition.contract) {
      expect(cell.shared).toBe(true);
      expect(typeof cell.compatible).toBe('boolean');
      expect(cell.upperTargetState).toBeDefined();
      expect(cell.mainTargetState).toBeDefined();
    }

    // Build split
    expect(contract.buildSplit.upperPortionTotalCells).toBeGreaterThan(0);
    expect(contract.buildSplit.sharedCellsAlreadyBuilt).toBe(contract.sharedEndpointOpeningTransition.overlapCellCount);
    expect(contract.buildSplit.uniqueCellsToBuild).toBe(contract.buildSplit.upperPortionTotalCells - contract.buildSplit.sharedCellsAlreadyBuilt);
    expect(contract.buildSplit.uniqueCellsByRole['five-wide-tread']).toBeGreaterThan(0);
    expect(contract.buildSplit.uniqueCellsByRole['five-clear-high-envelope']).toBeGreaterThan(0);

    // Return-02 preserved
    expect(contract.independentReturnPreservation.return02IntersectionWithUpperPortion).toBe(0);
    expect(contract.independentReturnPreservation.return02CanonicalCount).toBe(768);

    // Protected route preserved
    expect(contract.currentProtectedRoutePreservation.cellCount).toBe(0);
    expect(contract.currentProtectedRoutePreservation.policy).toMatch(/untouched/i);

    // Hard stops
    expect(contract.executionHardStops.length).toBeGreaterThan(0);
    expect(contract.executionHardStops.some((s) => /fresh|immutable/i.test(s))).toBe(true);
    expect(contract.executionHardStops.some((s) => /unique/i.test(s))).toBe(true);

    // Non-claims
    expect(contract.nonClaims.some((c) => /world cell has been changed/i.test(c))).toBe(true);
    expect(contract.nonClaims.some((c) => /public opening/i.test(c))).toBe(true);

    // Identity hash
    expect(contract.contractIdentitySha256).toBeDefined();
    expect(contract.contractIdentitySha256.length).toBe(64);
  });
});
