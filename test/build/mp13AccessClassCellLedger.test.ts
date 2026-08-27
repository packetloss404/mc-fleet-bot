import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATOR = path.join(ROOT, 'scripts/generate_mp13_access_class_cell_ledger_01.mjs');
const SNAPSHOT = 'data/worldsnap-sys03-high16-descending-post-20260826T153100Z';
const CONTRACT = 'data/world-review/mp13-egress-access-contract-03-sys03-post-20260826T153100Z/mp13-egress-access-contract-03.json';
const SURVEY = 'data/world-review/mp13-westlight-venue-sys03-post-rescreen-20260826T153100Z/westlight-arrival-circulation-survey.json';
const OUTPUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp13-access-class-ledger-'));
const GENERATED_AT = '2026-08-26T16:50:00Z';

interface LedgerCell {
  point: [number, number, number];
  owner: string;
  accessClass: string;
  normalState: string;
  exclusions: { liveEntityClearance: string };
}

interface LedgerEdge {
  interfaceId: string;
  transitionClass: string;
  from: [number, number, number];
  to: [number, number, number];
  directions: string[];
}

interface Ledger {
  status: string;
  worldMutationPerformed: boolean;
  rconCalled: boolean;
  databaseMutated: boolean;
  operationFiles: string[];
  mutationAuthorityGranted: boolean;
  sourceSnapshot: { sha256: string; regionFileCount: number };
  interfaces: Array<{ id: string; transition: string; sourceFacts: Record<string, unknown> }>;
  protectionEnvelope: { cells: { count: number; coordinateSetSha256: string } };
  transitions: LedgerEdge[];
  cells: LedgerCell[];
  acceptanceGates: Record<string, unknown>;
}

function output(name: string): string {
  return path.join(OUTPUT, name);
}

function generate(destination: string, snapshot = SNAPSHOT, survey = SURVEY): void {
  execFileSync(process.execPath, [
    GENERATOR,
    '--snapshot', snapshot,
    '--contract', CONTRACT,
    '--survey', survey,
    '--out', destination,
    '--generated-at', GENERATED_AT,
  ], { cwd: ROOT, stdio: 'pipe' });
}

function readLedger(destination: string): Ledger {
  return JSON.parse(fs.readFileSync(path.join(destination, 'mp13-access-class-cell-ledger-01.json'), 'utf8')) as Ledger;
}

afterAll(() => {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
});

describe('MP13 access-class cell ledger', () => {
  it('is deterministic when bound to the same source, contract, survey, and timestamp', () => {
    generate(output('first'));
    generate(output('second'));
    expect(fs.readFileSync(path.join(output('first'), 'mp13-access-class-cell-ledger-01.json')))
      .toEqual(fs.readFileSync(path.join(output('second'), 'mp13-access-class-cell-ledger-01.json')));
  }, 45_000);

  it('enumerates exact source cells and continuous I05/I06 transitions but keeps all access default-deny', () => {
    const ledger = readLedger(output('first'));
    expect(ledger).toMatchObject({
      status: 'PROPOSED_SOURCE_BOUND_DEFAULT_DENY_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY',
      worldMutationPerformed: false,
      rconCalled: false,
      databaseMutated: false,
      operationFiles: [],
      mutationAuthorityGranted: false,
      sourceSnapshot: {
        sha256: '3e0d739e5ceda6fb9a828e9b5947e15d00864f7f15f54d1c099e011477e3bcfd',
        regionFileCount: 52,
      },
      protectionEnvelope: { cells: { count: 3702 } },
    });
    expect(ledger.protectionEnvelope.cells.coordinateSetSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(ledger.interfaces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION', transition: 'P1 <-> S1',
        sourceFacts: expect.objectContaining({ publicToBackstageStations: 79, staffContinuityStations: 134 }),
      }),
      expect.objectContaining({
        id: 'I06-WEST-SERVICE-TOWER-CHANGEOVER', transition: 'S1 -> S1',
        sourceFacts: expect.objectContaining({ staffOnlyTowerStations: 68, publicUseProhibited: true }),
      }),
    ]));
    expect(ledger.cells).toHaveLength(3702);
    expect(ledger.cells.every((cell) => cell.owner === 'U0_UNASSIGNED_OWNER_DEFAULT_DENY'
      && cell.accessClass === 'U0'
      && cell.normalState === 'DENY_PENDING_EXACT_OWNER_AND_ACCESS_REVIEW'
      && cell.exclusions.liveEntityClearance === 'NOT_EVALUATED_BY_READ_ONLY_LEDGER__REQUIRED_ON_ANY_FUTURE_RELEASE_SOURCE')).toBe(true);
    expect(ledger.transitions).toHaveLength(278);
    expect(ledger.transitions.some(({ transitionClass }) => transitionClass === 'S1_TO_S1_STAFF_ONLY_TOWER')).toBe(true);
    for (const edge of ledger.transitions) {
      const dx = Math.abs(edge.to[0] - edge.from[0]);
      const dy = Math.abs(edge.to[1] - edge.from[1]);
      const dz = Math.abs(edge.to[2] - edge.from[2]);
      expect(dx + dz).toBe(1);
      expect(dy).toBeLessThanOrEqual(1);
      expect(edge.directions).toEqual(['FORWARD', 'REVERSE']);
    }
  });

  it('leaves acceptance closed until every owner/access class and cross-owner face is reviewed', () => {
    const gates = readLedger(output('first')).acceptanceGates;
    expect(gates).toMatchObject({
      exactCellCoverage: true,
      ownerPerCellAccepted: false,
      accessClassPerCellAccepted: false,
      unreviewedCellCount: 3702,
      unreviewedDirectionalFaceCount: 556,
      zeroUnreviewedCrossOwnerFaces: false,
      defaultDenyEnforced: true,
      continuousSourceTransitions: true,
      i06StaffOnlyTowerRetained: true,
      sourceMutationAttempted: false,
    });
  });

  it('refuses a snapshot that is not the exact MP13 contract source', () => {
    expect(() => generate(output('wrong-source'), 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z'))
      .toThrow(/snapshot hash differs from source-bound contract/);
    expect(fs.existsSync(output('wrong-source'))).toBe(false);
  });

  it('refuses survey bytes that are not the contract-bound evidence', () => {
    const changedSurvey = output('changed-survey.json');
    fs.writeFileSync(changedSurvey, `${fs.readFileSync(path.join(ROOT, SURVEY), 'utf8')}\n`);
    expect(() => generate(output('wrong-survey'), SNAPSHOT, changedSurvey))
      .toThrow(/survey bytes differ from contract evidence hash/);
    expect(fs.existsSync(output('wrong-survey'))).toBe(false);
  });
});
