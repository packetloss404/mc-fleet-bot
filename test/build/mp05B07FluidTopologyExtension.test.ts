import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-fluid-topology-'));
const source = 'data/worldsnap-mp05-b07-surface-receiver-descent-post-20260826T221000Z';
let findings: any;

describe('MP05 B07 extended fluid-topology guard', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/survey_mp05_b07_fluid_topology_extension_01.mjs',
      '--snapshot', source,
      '--out-dir', output,
      '--markdown-out', path.join(output, 'MP05-B07-FLUID-TOPOLOGY.md'),
      '--generated-at', '2026-08-26T22:15:00.000Z',
    ], { cwd: root, stdio: 'pipe', timeout: 300_000 });
    findings = JSON.parse(fs.readFileSync(path.join(output, 'fluid-topology-extension-findings.json'), 'utf8'));
  }, 310_000);

  afterAll(() => fs.rmSync(output, { recursive: true, force: true }));

  it('accepts the fresh remaining seed census without treating historical remediation counts as source drift', () => {
    expect(findings.source.snapshotRoot).toBe(source);
    expect(findings.topologyTraces.seed.interactionFluid).toMatchObject({ cellCount: 84 });
    expect(findings.topologyTraces.seed.stateCensus).not.toEqual({
      'minecraft:water[level=1]': 0,
    });
  });

  it('fail-closes on the still-unbounded component and emits no remediation authority', () => {
    expect(findings.status).toBe('SOURCE_BOUND_EXTENDED_FLUID_TOPOLOGY_HELD_NO_RECEIVER_OR_ISOLATION_AUTHORITY');
    expect(findings.topologyTraces.extended).toMatchObject({
      disposition: 'CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE',
      maximumCells: 125000,
      capReached: true,
    });
    expect(findings.topologyTraces.extended.component.cellCount).toBe(125000);
    expect(findings.topologyTraces.extended.unexpandedCapFrontier.cellCount).toBeGreaterThan(0);
    expect(findings.safetyBoundary).toMatchObject({
      readOnly: true,
      liveCallsPerformed: false,
      worldMutationsPerformed: false,
      forwardOperationFilesEmitted: 0,
      rollbackOperationFilesEmitted: 0,
    });
  });

  it('retains the full fluid-state and entity constraints for any future liner-first design', () => {
    expect(findings.waterAndStructureCharacterization.waterloggedCellCount).toBeGreaterThan(0);
    expect(findings.waterAndStructureCharacterization.bubbleColumnCells.cellCount).toBeGreaterThan(0);
    expect(findings.candidateIsolationSurfaceScreen.requiredBeforeSelection).toEqual(expect.arrayContaining([
      expect.stringContaining('complete component closure'),
      expect.stringContaining('waterlogged and bubble-column treatment rule'),
      expect.stringContaining('block-entity and live-entity recheck'),
    ]));
  });
});
