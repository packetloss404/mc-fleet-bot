import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { validateConfig, loadConfig } from '../src/config';

function baseValid(): any {
  // Mirror of the shape in repo's config.yml (kept minimal — just enough to
  // pass schema validation).
  return {
    api: { port: 3001, host: '0.0.0.0' },
    minecraft: { host: 'play.example.com', port: 25565, version: '1.21.11', auth: 'offline' },
    bots: {
      maxBots: 10,
      defaultMode: 'codegen',
      joinStaggerMs: 5000,
      reconnectDelaySec: 5,
      maxReconnectAttempts: 10,
    },
    behavior: {
      headTrackingRange: 10,
      headTrackingTickMs: 250,
      wanderRadius: 15,
      wanderIntervalMs: 5000,
      ambientChatMinSec: 120,
      ambientChatMaxSec: 300,
      conversationRadius: 64.0,
    },
    affinity: {
      default: 50,
      hitPenalty: 10,
      chatBonus: 2,
      giftBonus: 5,
      negativeSentimentPenalty: 3,
      hostileThreshold: 20,
      trustThreshold: 70,
    },
    instincts: {
      enabled: true,
      attackCooldownMs: 12000,
      lowHealthThreshold: 8,
      fleeDistance: 14,
      fightRange: 3,
      drowningOxygenThreshold: 120,
      drowningSurfaceClearOxygen: 260,
    },
    voyager: {
      enabled: true,
      taskCooldownMs: 2000,
      maxRetriesPerTask: 3,
      codeExecutionTimeoutMs: 300000,
      curriculumLLMCalls: true,
      criticLLMCalls: true,
    },
    llm: {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      chatMaxTokens: 2048,
      codeGenMaxTokens: 8192,
      maxConcurrentRequests: 3,
    },
    skills: { directory: './skills', maxSkills: 500 },
    logging: { level: 'debug' },
    auth: { devSecret: null },
  };
}

describe('validateConfig', () => {
  it('accepts a minimally valid config', () => {
    const result = validateConfig(baseValid());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.llm.provider).toBe('gemini');
      expect(result.warnings).toEqual([]);
    }
  });

  it('reports missing required top-level sections', () => {
    const raw = baseValid();
    delete raw.api;
    delete raw.llm;
    const result = validateConfig(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('api: missing required section');
      expect(result.errors).toContain('llm: missing required section');
    }
  });

  it('reports wrong-type fields with section.field paths', () => {
    const raw = baseValid();
    raw.api.port = '3001'; // wrong type
    raw.llm.temperature = 'hot'; // wrong type
    const result = validateConfig(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'api.port: expected number, got string',
          'llm.temperature: expected number, got string',
        ]),
      );
    }
  });

  it('collects multiple errors instead of throwing on first', () => {
    const raw = baseValid();
    delete raw.api.port;
    raw.minecraft.port = 'not-a-number';
    raw.bots.maxBots = false;
    const result = validateConfig(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('warns (does not reject) on unknown top-level keys', () => {
    const raw = baseValid();
    raw.someExperimentalSection = { foo: 'bar' };
    const result = validateConfig(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("unknown top-level key 'someExperimentalSection' (ignored)");
    }
  });

  it('validates llm.routes entries (provider required, fallback array of strings)', () => {
    const raw = baseValid();
    raw.llm.routes = {
      chat: { provider: 'anthropic', model: 'claude', fallback: ['gemini', 42] },
      code: { temperature: 'high' }, // missing provider, wrong-type temperature
    };
    const result = validateConfig(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'llm.routes.chat.fallback[1]: expected string, got number',
          'llm.routes.code.provider: missing required field (expected string)',
          'llm.routes.code.temperature: expected number, got string',
        ]),
      );
    }
  });

  it('accepts auth.devSecret as string or null', () => {
    const r1 = validateConfig({ ...baseValid(), auth: { devSecret: null } });
    const r2 = validateConfig({ ...baseValid(), auth: { devSecret: 'shhh' } });
    const r3 = validateConfig({ ...baseValid(), auth: { devSecret: 42 as any } });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.errors).toContain('auth.devSecret: expected string or null, got number');
    }
  });

  it('validates named civic destinations and waypoint corridors', () => {
    const raw = baseValid();
    raw.leash = [{
      botName: 'Scott',
      x: -85,
      z: -370,
      radius: 50,
      destinations: [
        { name: 'employee-lounge', x: -82, z: 90, radius: 16 },
      ],
      corridors: [{
        name: 'reviewed-worker-route',
        width: 4,
        waypoints: [
          { x: -85, z: -370 },
          { x: -82, z: 90 },
        ],
      }],
    }];
    expect(validateConfig(raw).ok).toBe(true);

    raw.leash[0].corridors[0].waypoints[1].z = 'ninety';
    const invalid = validateConfig(raw);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors).toContain(
        'leash[0].corridors[0].waypoints[1].z: expected number, got string',
      );
    }
  });

  it('rejects empty, non-finite, or non-traversable civic mobility geometry', () => {
    const raw = baseValid();
    raw.leash = [{
      botName: ' ',
      x: Number.NaN,
      z: -370,
      radius: 0,
      destinations: [
        { name: '', x: -82, z: Number.POSITIVE_INFINITY, radius: -1 },
      ],
      corridors: [{
        name: '',
        width: 0,
        waypoints: [{ x: -85, z: -370 }],
      }],
    }];
    const invalid = validateConfig(raw);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors).toEqual(expect.arrayContaining([
        'leash[0].botName: expected non-empty string',
        'leash[0].x: expected finite number',
        'leash[0].radius: expected positive finite number',
        'leash[0].destinations[0].name: expected non-empty string',
        'leash[0].destinations[0].z: expected finite number',
        'leash[0].destinations[0].radius: expected positive finite number',
        'leash[0].corridors[0].name: expected non-empty string',
        'leash[0].corridors[0].width: expected positive finite number',
        'leash[0].corridors[0].waypoints: expected at least two waypoints',
      ]));
    }
  });

  it('the real repo config.yml passes validation', () => {
    const configPath = path.join(process.cwd(), 'config.yml');
    const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    const result = validateConfig(raw);
    if (!result.ok) {
      throw new Error(`repo config.yml failed validation: ${result.errors.join('; ')}`);
    }
    expect(result.ok).toBe(true);
  });

  it('loadConfig throws an error listing every problem when invalid', () => {
    const tmpFile = path.join(process.cwd(), '.tmp-bad-config.yml');
    fs.writeFileSync(tmpFile, 'api:\n  port: "not-a-number"\n', 'utf-8');
    try {
      expect(() => loadConfig(tmpFile)).toThrow(/Invalid config/);
      try {
        loadConfig(tmpFile);
      } catch (e: any) {
        // Should report multiple missing sections, not just the first.
        expect(e.message).toMatch(/api\.port: expected number/);
        expect(e.message).toMatch(/minecraft: missing required section/);
      }
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('rejects mining.minDigY as a non-number (closes the file-edit fail-open gap)', () => {
    // Before this entry was added to SECTION_SPECS, a hand-edited value like
    // `minDigY: "50"` (string) passed config validation, then failed the
    // `typeof === 'number'` guard inside `src/actions/geofence.ts:72`,
    // leaving `minDigY = null` and fail-opening `isBelowDigFloor` at line 94.
    // The dig floor that prevents fleet entombment was gone with no error.
    // The HTTP PATCH path was already type-safe; this closes the file-edit
    // gap by surfacing the type error at config load time.
    const raw = baseValid();
    raw.mining = { minDigY: '50' as any };
    const result = validateConfig(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('mining.minDigY: expected number, got string');
    }

    // Same path with a boolean also fails — any non-number, not just strings.
    raw.mining = { minDigY: true as any };
    const result2 = validateConfig(raw);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.errors).toContain('mining.minDigY: expected number, got boolean');
    }

    // A real number is accepted.
    raw.mining = { minDigY: 50 };
    const result3 = validateConfig(raw);
    expect(result3.ok).toBe(true);

    // Omitting minDigY is also fine — the field is optional, the runtime
    // falls back to the documented "no dig floor" behavior.
    raw.mining = {};
    const result4 = validateConfig(raw);
    expect(result4.ok).toBe(true);
  });
});
