import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BoxIntegration,
  type BoxIntegrationSettings,
} from '../../src/integrations/BoxIntegration';

interface BoxInternals {
  getAccessToken(): Promise<string>;
  uploadNewFile(
    token: string,
    parentId: string,
    localPath: string,
    name: string,
  ): Promise<{ id: string; name: string }>;
  uploadFileVersion(
    token: string,
    fileId: string,
    localPath: string,
    name: string,
  ): Promise<{ id: string; name: string }>;
}

function boxInternals(integration: BoxIntegration): BoxInternals {
  return integration as unknown as BoxInternals;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BoxIntegration', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-box-test-'));
    fs.mkdirSync(path.join(workspace, 'docs'), { recursive: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('discovers approved regular files but never follows file or directory symlinks', () => {
    const normalPath = path.join(workspace, 'docs', 'map.md');
    const outsidePath = path.join(workspace, 'private.md');
    const outsideDirectory = path.join(workspace, 'private');
    fs.writeFileSync(normalPath, '# map');
    fs.writeFileSync(outsidePath, 'host secret');
    fs.mkdirSync(outsideDirectory);
    fs.writeFileSync(path.join(outsideDirectory, 'nested.md'), 'nested secret');
    fs.symlinkSync(outsidePath, path.join(workspace, 'docs', 'leak.md'));
    fs.symlinkSync(outsideDirectory, path.join(workspace, 'docs', 'escaped'));

    const integration = new BoxIntegration(workspace);
    const artifacts = integration.discoverArtifacts();

    expect(artifacts.map((artifact) => artifact.relativePath)).toEqual(['docs/map.md']);
    expect(integration.discoverArtifacts(['docs/leak.md'])).toEqual([]);
    expect(() => integration.discoverArtifacts(['private.md'])).toThrow(
      'outside the approved export roots',
    );
  });

  it('classifies final audit images as maps so PDF map exports include them', () => {
    const auditPath = path.join(workspace, 'docs', 'msa-final-grid-audit.png');
    fs.writeFileSync(auditPath, 'test image');

    const integration = new BoxIntegration(workspace);
    const artifacts = integration.discoverArtifacts();

    expect(artifacts).toEqual([
      expect.objectContaining({
        relativePath: 'docs/msa-final-grid-audit.png',
        category: 'maps',
      }),
    ]);
  });

  it('classifies every file inside a dated atlas directory as a map', () => {
    const atlasDirectory = path.join(
      workspace,
      'data',
      'exports',
      'box',
      'atlas-2026-07-26',
      'team-c',
    );
    fs.mkdirSync(atlasDirectory, { recursive: true });
    fs.writeFileSync(path.join(atlasDirectory, 'vault-level-3.png'), 'test image');

    const integration = new BoxIntegration(workspace);
    const artifacts = integration.discoverArtifacts();

    expect(artifacts).toEqual([
      expect.objectContaining({
        relativePath: 'exports/atlas-2026-07-26/team-c/vault-level-3.png',
        category: 'maps',
      }),
    ]);
  });

  it('re-checks a discovered file before upload if it is replaced by a symlink', async () => {
    const filePath = path.join(workspace, 'docs', 'map.md');
    const outsidePath = path.join(workspace, 'private.md');
    fs.writeFileSync(filePath, '# map');
    fs.writeFileSync(outsidePath, 'host secret');
    const integration = new BoxIntegration(workspace);
    expect(integration.discoverArtifacts()).toHaveLength(1);

    fs.unlinkSync(filePath);
    fs.symlinkSync(outsidePath, filePath);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      boxInternals(integration).uploadNewFile('token', 'folder-1', filePath, 'map.md'),
    ).rejects.toThrow('outside the approved export roots or uses a symlink');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never returns secret fragments and persists only the settings allowlist', () => {
    const integration = new BoxIntegration(workspace);
    const settingsTempModes: number[] = [];
    const renameSync = fs.renameSync;
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(from).includes('box-integration.json.')) {
        settingsTempModes.push(fs.statSync(from).mode & 0o777);
      }
      renameSync(from, to);
    });
    integration.updateSettings({
      enabled: true,
      accessToken: 'TOKEN-prefix-sensitive-suffix',
      clientSecret: 'SECRET-prefix-sensitive-suffix',
      categories: {
        maps: false,
      },
      // The settings UI posts its public view back on save. These fields and
      // arbitrary request properties must not land in the credential file.
      accessTokenMasked: 'attacker-controlled-mask',
      rogue: 'must-not-persist',
    } as unknown as Partial<BoxIntegrationSettings>);

    const publicSettings = integration.getPublicSettings();
    const publicJson = JSON.stringify(publicSettings);
    expect(publicSettings.accessTokenConfigured).toBe(true);
    expect(publicSettings.clientSecretConfigured).toBe(true);
    expect(publicSettings.accessTokenMasked).toBe('••••••••');
    expect(publicSettings.clientSecretMasked).toBe('••••••••');
    expect(publicJson).not.toContain('TOKEN');
    expect(publicJson).not.toContain('SECRET');
    expect(publicJson).not.toContain('sensitive');

    const settingsPath = path.join(workspace, 'data', 'box-integration.json');
    const persisted = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
    expect(persisted.rogue).toBeUndefined();
    expect(persisted.accessTokenMasked).toBeUndefined();
    expect(persisted.categories).toEqual({
      maps: false,
      screenshots: true,
      documents: true,
      outputs: true,
    });
    expect(settingsTempModes).toEqual([0o600]);
    expect(fs.statSync(settingsPath).mode & 0o777).toBe(0o600);
    renameSpy.mockRestore();
  });

  it('rejects invalid runtime request types instead of coercing them into settings', () => {
    const integration = new BoxIntegration(workspace);

    expect(() => integration.updateSettings({
      enabled: 'yes',
    } as unknown as Partial<BoxIntegrationSettings>)).toThrow('enabled must be a boolean');
    expect(() => integration.updateSettings({
      categories: { maps: 'yes' },
    } as unknown as Partial<BoxIntegrationSettings>)).toThrow(
      'categories.maps must be a boolean',
    );
    expect(() => integration.updateSettings({
      accessToken: 1234,
    } as unknown as Partial<BoxIntegrationSettings>)).toThrow(
      'accessToken must be a string',
    );
  });

  it('normalizes a malformed persisted settings file without exposing unknown fields', () => {
    const settingsPath = path.join(workspace, 'data', 'box-integration.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify({
      enabled: 'yes',
      authMode: 'invalid',
      accessToken: 'private-token',
      autoSyncIntervalMinutes: -1,
      categories: { maps: false, outputs: 'yes' },
      accidentalSecret: 'do-not-return',
    }));

    const integration = new BoxIntegration(workspace);
    const settings = integration.getPublicSettings();

    expect(settings.enabled).toBe(false);
    expect(settings.authMode).toBe('access_token');
    expect(settings.autoSyncIntervalMinutes).toBe(60);
    expect(settings.categories.maps).toBe(false);
    expect(settings.categories.outputs).toBe(true);
    expect(JSON.stringify(settings)).not.toContain('private-token');
    expect(JSON.stringify(settings)).not.toContain('do-not-return');
  });

  it('uses the documented client-credentials token form and caches the token', async () => {
    const integration = new BoxIntegration(workspace);
    integration.updateSettings({
      authMode: 'client_credentials',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      subjectType: 'user',
      subjectId: '12345',
    });
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const body = init?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('client_credentials');
      expect(body.get('client_id')).toBe('client-id');
      expect(body.get('client_secret')).toBe('client-secret');
      expect(body.get('box_subject_type')).toBe('user');
      expect(body.get('box_subject_id')).toBe('12345');
      return jsonResponse({ access_token: 'issued-token', expires_in: 3600 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(boxInternals(integration).getAccessToken()).resolves.toBe('issued-token');
    await expect(boxInternals(integration).getAccessToken()).resolves.toBe('issued-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.box.com/oauth2/token');
  });

  it('puts multipart attributes before file content for new files and versions', async () => {
    const integration = new BoxIntegration(workspace);
    const filePath = path.join(workspace, 'docs', 'map.md');
    fs.writeFileSync(filePath, '# map');
    const requests: Array<{ url: string; names: string[]; attributes: unknown }> = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      requests.push({
        url: String(input),
        names: [...form.keys()],
        attributes: JSON.parse(String(form.get('attributes'))),
      });
      return jsonResponse({
        entries: [{ id: 'file-1', type: 'file', name: 'map.md' }],
      }, 201);
    });
    vi.stubGlobal('fetch', fetchMock);

    await boxInternals(integration).uploadNewFile('token', 'folder-1', filePath, 'map.md');
    await boxInternals(integration).uploadFileVersion('token', 'file-1', filePath, 'map.md');

    expect(requests).toEqual([
      {
        url: 'https://upload.box.com/api/2.0/files/content',
        names: ['attributes', 'file'],
        attributes: { name: 'map.md', parent: { id: 'folder-1' } },
      },
      {
        url: 'https://upload.box.com/api/2.0/files/file-1/content',
        names: ['attributes', 'file'],
        attributes: { name: 'map.md' },
      },
    ]);
  });
});
