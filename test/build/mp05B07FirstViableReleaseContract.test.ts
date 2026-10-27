import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_mp05_b07_first_viable_release_contract_02.mjs');
const SOURCE = 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z';
const INTEGRATED = 'data/world-review/mp05-b07-integrated-design-03-mp06-post-20260826T143902Z/integrated-design-findings.json';
const CONTAINMENT = 'data/world-review/mp05-b07-containment-contract-02-mp06-post-20260826T143902Z/containment-contract-findings.json';
const FLUID = 'data/world-review/mp05-b07-fluid-topology-extension-02-mp06-post-20260826T143902Z/fluid-topology-extension-findings.json';
const SURFACE = 'data/world-review/mp05-b07-surface-receiver-survey-02-mp06-post-20260826T143902Z/surface-receiver-survey.json';
const LANDING = 'data/world-review/mp05-b07-landing-descent-feasibility-02-mp06-post-20260826T143902Z/landing-descent-feasibility.json';
const OWNERSHIP = 'data/world-review/mp05-b07-ownership-interface-contract-01-20260826T123537Z/ownership-interface-contract-findings.json';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-first-viable-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

const generate = (fluid = FLUID, suffix = 'current') => {
  const out = path.join(temporaryDirectory, `${suffix}.json`);
  const markdown = path.join(temporaryDirectory, `${suffix}.md`);
  const gateMap = path.join(temporaryDirectory, `${suffix}.svg`);
  execFileSync(process.execPath, [
    SCRIPT,
    '--snapshot', SOURCE,
    '--integrated', INTEGRATED,
    '--containment', CONTAINMENT,
    '--fluid', fluid,
    '--surface', SURFACE,
    '--landing', LANDING,
    '--ownership', OWNERSHIP,
    '--out', out,
    '--markdown', markdown,
    '--gate-map', gateMap,
    '--generated-at', '2026-08-26T18:30:00.000Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  return { gate: JSON.parse(fs.readFileSync(out, 'utf8')), markdown, gateMap };
};

describe('MP05 B07 first viable guarded-release contract', () => {
  it('keeps the current incomplete B07 continuation fail-closed and emits no operations', () => {
    const { gate, markdown, gateMap } = generate();

    expect(gate).toMatchObject({
      id: 'MP05-B07-FIRST-VIABLE-GUARDED-RELEASE-CONTRACT-02',
      status: 'BLOCKED_NO_SAFE_FINITE_STAGE_OR_OPERATION',
      decision: { forwardOperationCount: 0, rollbackOperationCount: 0, releaseEligible: false },
      atomicity: {
        releaseableIndependentSubphases: [],
      },
      exactCurrentGateInputs: {
        reservation: { constructionCells: 8134, interactionCells: 13608 },
        fluids: {
          constructionContacts: 5,
          interactionContacts: 89,
          extendedObservedCells: 125000,
          topologyDisposition: 'CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE',
          waterloggedCells: 115,
          bubbleColumns: 452,
        },
        gravity: { interactionCells: 90, unsupportedChains: 11 },
        surface: { fourCandidateFaces: 4, naturalTerrainReachable: false },
        authority: { b07ConstructionAuthority: false, exteriorReceiverAuthority: false, acceptedClosedCapCells: 49 },
      },
    });
    expect(fs.readFileSync(markdown, 'utf8')).toContain('zero operations were emitted');
    expect(fs.readFileSync(gateMap, 'utf8')).toContain('Keep the R07J 49-cell cap solid');
  });

  it('fails instead of treating a changed fluid topology result as a valid gate', () => {
    const altered = JSON.parse(fs.readFileSync(path.join(ROOT, FLUID), 'utf8'));
    altered.topologyTraces.extended.disposition = 'COMPONENT_CLOSED';
    const alteredPath = path.join(temporaryDirectory, 'altered-fluid.json');
    fs.writeFileSync(alteredPath, `${JSON.stringify(altered, null, 2)}\n`);

    expect(() => generate(alteredPath, 'altered')).toThrow(/extended topology unexpectedly closed/);
  });
});
