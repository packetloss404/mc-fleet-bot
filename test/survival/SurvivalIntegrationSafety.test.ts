import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('survival replacement integration safety', () => {
  it('ships disabled without changing the server, fleet, or mining safeguards', () => {
    const config = yaml.load(read('config.yml')) as any;

    expect(config.minecraft.host).toBe('10.80.13.14');
    expect(config.bots.maxBots).toBe(10);
    expect(config.survival).toEqual({ enabled: false, botName: 'FayaazMJacc' });
    expect(config.mining.minDigY).toBe(50);
    expect(config.mining.mineSite).toMatchObject({ x: -85, y: 64, z: -440 });
    expect(config.mining.protectedZones.length).toBeGreaterThan(0);
  });

  it('retains strict compilation and the normal production entrypoint', () => {
    const packageJson = JSON.parse(read('package.json'));
    const tsconfig = JSON.parse(read('tsconfig.json'));

    expect(packageJson.scripts.build).toBe('tsc');
    expect(packageJson.scripts.start).toBe('node dist/index.js');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noCheck).not.toBe(true);
  });

  it('contains no privileged fleet, chat-command, or geofence-bypass path', () => {
    const mission = read('src/survival/SurvivalMission.ts');

    expect(mission).not.toMatch(/\.chat\s*\(/);
    expect(mission).not.toContain('spawnBot(');
    expect(mission).not.toContain('removeBot(');
    expect(mission).not.toContain('setDepthBypass');
    expect(mission).not.toContain('/give');
    expect(mission).not.toContain('/gamemode');
  });

  it('retains the AG-4 three-face frontier as source-bound and read-only', () => {
    const ag4 = read('scripts/plan_ag4_gap_three_face_closure_measurement_07.mjs');

    expect(ag4).toContain("const faces=['-X','-Z','+Z'];");
    expect(ag4).toContain('mutationAuthority:false');
    expect(ag4).toContain('worldMutationsPerformed:false');
    expect(ag4).toContain('forwardOperationFilesEmitted:0');
    expect(ag4).toContain('rollbackOperationFilesEmitted:0');
    expect(ag4).toContain('releaseManifestEmitted:false');
  });
});
