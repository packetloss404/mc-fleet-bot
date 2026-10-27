import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag2-deck-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('AG-2 exterior loop deck module 01', () => {
  it('compiles the finite civil deck, promenade, separation, gallery, and lights without rail or opening authority', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, ['scripts/compile_ag2_exterior_loop_deck_module_01.mjs', '--out', out, '--generated-at', '2026-08-28T09:30:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 });
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'ag2-citywide-exterior-loop-deck-module-01.release-manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      id: 'AG2-CITYWIDE-EXTERIOR-LOOP-DECK-MODULE-01', status: 'PREPARED_SOURCE_BOUND_OFFLINE_ONLY_FRESH_EXECUTION_GATE_REQUIRED', mutationAuthority: false,
      source: { captureId: 'combined-zones-d6ad35442cd340ce995a267d832341cc' },
      scope: { module: '16-block × 23-wide finite deck module', publicClaims: false, railOrControlClaims: false, elements: { walkingDeck: { width: 5 }, outerBarrier: { y: [86, 88] }, gallery: { clearInterior: { clearWidth: 6, clearHeight: 6 } }, railReserve: { disposition: expect.stringMatching(/no rail/) }, drains: { required: false }, vegetation: { interceptedTargetCells: [] } } },
      target: { cellCount: 820, sourceStateCensus: { 'minecraft:air': 820 }, targetStateCensus: { 'minecraft:polished_deepslate': 736, 'minecraft:smooth_stone': 80, 'minecraft:lantern[hanging=true,waterlogged=false]': 4 } },
      halo: { cellCount: 1462 }, safety: { fluidWaterloggedOrGravityHits: [], protectedInterfaceHits: [], blockEntities: [], savedEntities: [], exactForwardRollbackInverse: true },
      executionGate: { executionAuthorizedByThisArtifact: false }, safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 1, rollbackOperationFilesEmitted: 1, releaseManifestEmitted: true },
    });
    expect(manifest.executionGate.forbiddenClaims).toEqual(expect.arrayContaining(['rail', 'station', 'public opening', 'passenger service']));
    expect(manifest.operations.forward.commandCount).toBe(820); expect(manifest.operations.rollback.commandCount).toBe(820);
    expect(fs.existsSync(path.join(out, 'ag2-citywide-exterior-loop-deck-module-01.svg'))).toBe(true);
  });
});
