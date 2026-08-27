import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'town-outer-loop-spur-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('town outer-loop / spur source-bound survey', () => {
  it('binds exact standing stations while treating the west/south band as protected existing fabric', () => {
    const out = path.join(temp, 'report');
    const stdout = execFileSync(process.execPath, [
      'scripts/survey_town_outer_loop_spur_network_01.mjs',
      '--snapshot', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z',
      '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'town-outer-loop-spur-network.json'), 'utf8'));

    expect(result).toMatchObject({
      status: 'SOURCE_BOUND_STAGED_NETWORK_DESIGN_ONLY', stationCount: 7, assetCount: 15, mutationAuthority: false,
    });
    expect(report.worldMutationsPerformed).toBe(false);
    expect(report.liveCallsPerformed).toBe(false);
    expect(report.mutationAuthority).toBe(false);
    expect(report.stations.map((station: { id: string; normalWalkWitness: boolean }) => [station.id, station.normalWalkWitness])).toEqual([
      ['ST-MSA-REAR', true], ['ST-RRCH-UPPER', true], ['ST-RRCH-MOOT', true], ['ST-RG-BELL', true],
      ['ST-AR-EAST', true], ['ST-WL-GATEHEAD', true], ['ST-WL-EAST-ARRIVAL', true],
    ]);
    expect(report.network.existingReferenceTrunks.map((trunk: { id: string }) => trunk.id)).toEqual([
      'TRUNK-NORTH', 'TRUNK-RRCH', 'TRUNK-WEST',
    ]);
    expect(report.network.interfaceSpurs.map((spur: { id: string; status: string }) => [spur.id, spur.status])).toEqual([
      ['SPUR-RRCH-RG', 'INTERFACE_SURVEY_REQUIRED'],
      ['SPUR-RG-AR', 'INTERFACE_SURVEY_REQUIRED'],
      ['SPUR-WL-VENUE', 'ACCEPTANCE_SIGNATURE_REQUIRED'],
    ]);
    expect(report.network.outerLoopReserve).toMatchObject({
      physicalMutationAuthorized: false,
      retainedFabric: expect.arrayContaining([
        'TE-PAN-RV01-ROAD', 'TE-WL-PARKWAY-EXTENSION', 'TE-WESTLIGHT-CRATER-LAKE', 'TE-WL-HARBORLIGHT', 'TE-ROAD-01',
      ]),
    });
    expect(report.network.stages.map((stage: { order: number; physicalWork: boolean | string }) => [stage.order, stage.physicalWork])).toEqual([
      [0, false], [1, false], [2, false], [3, false], [4, 'separate guarded release only'],
    ]);
  }, 30000);
});
