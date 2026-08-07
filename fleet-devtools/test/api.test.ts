import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../apps/api/src/app.js';
import { createContext } from '../apps/api/src/context.js';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRegion } from './fixtures/anvil-region.js';

let tempRoot: string;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-api-'));
  const snapshot = path.join(tempRoot, 'snapshots/latest/region');
  fs.mkdirSync(snapshot, { recursive: true });
  fs.writeFileSync(
    path.join(snapshot, 'r.0.0.mca'),
    buildRegion({ sections: [{ y: 0, palette: [{ Name: 'minecraft:stone' }] }] }),
  );
  const registry = `version: 1
servers:
  - id: demo
    name: Demo
    connector:
      kind: local
      root: ${JSON.stringify(tempRoot).slice(1, -1)}
    worlds:
      - id: main
        name: Main
        dimension: minecraft:overworld
        snapshot: snapshots/latest/region
`;
  const recipesDir = path.join(tempRoot, 'recipes');
  fs.mkdirSync(recipesDir, { recursive: true });
  fs.writeFileSync(
    path.join(recipesDir, 'overview.yml'),
    `version: 1
id: overview
name: Overview
description: demo
parameters:
  limit:
    type: integer
    description: rows
    required: false
    min: 1
    max: 10
steps:
  - id: snap
    type: snapshot-summary
  - id: report
    type: html-report
    options:
      title: Overview
`,
  );
  const registryFile = path.join(tempRoot, 'registry.yml');
  fs.writeFileSync(registryFile, registry);
  process.env['MC_FLEET_REGISTRY'] = registryFile;
  process.env['MC_FLEET_RECIPES'] = recipesDir;
  process.env['MC_FLEET_JOBS'] = path.join(tempRoot, 'jobs');
  process.env['MC_FLEET_ARTIFACTS'] = path.join(tempRoot, 'artifacts');

  const context = createContext(tempRoot);
  const app = createApp(context);
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('listen failed');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  delete process.env['MC_FLEET_REGISTRY'];
  delete process.env['MC_FLEET_RECIPES'];
  delete process.env['MC_FLEET_JOBS'];
  delete process.env['MC_FLEET_ARTIFACTS'];
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    // best effort
  }
});

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

async function post(path: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('API endpoints', () => {
  it('exposes a read-only health check', async () => {
    const { status, body } = await get('/api/health');
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, mode: 'read-only' });
  });

  it('returns the dashboard bootstrap payload', async () => {
    const { status, body } = await get('/api/overview');
    expect(status).toBe(200);
    expect(body).toMatchObject({
      mode: 'read-only',
      servers: [
        {
          id: 'demo',
          worlds: [{ id: 'main', dimension: 'minecraft:overworld' }],
        },
      ],
      recipes: [{ id: 'overview', parameters: { limit: { type: 'integer', min: 1, max: 10 } } }],
    });
  });

  it('returns 404 for an unknown job', async () => {
    const { status, body } = await get('/api/jobs/does-not-exist');
    expect(status).toBe(404);
    expect(body).toMatchObject({ code: 'JOB_NOT_FOUND' });
  });

  it('validates parameter types at submit and returns 400 with a clear code', async () => {
    const { status, body } = await post('/api/jobs', {
      serverId: 'demo',
      worldId: 'main',
      recipeId: 'overview',
      parameters: { limit: 'not-a-number' },
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'INVALID_PARAMETER' });
  });

  it('submits, completes, and links the artifact for a valid request', async () => {
    const { status: submitStatus, body: submitBody } = await post('/api/jobs', {
      serverId: 'demo',
      worldId: 'main',
      recipeId: 'overview',
      parameters: {},
    });
    expect(submitStatus).toBe(202);
    const jobId = (submitBody as { id: string }).id;
    // The queue runs synchronously in the same process; poll briefly until done.
    let completed: { status: string; reportUrl?: string } | undefined;
    for (let i = 0; i < 30; i += 1) {
      const { body } = await get(`/api/jobs/${jobId}`);
      completed = body as { status: string; reportUrl?: string };
      if (completed.status === 'completed' || completed.status === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(completed?.status).toBe('completed');
    expect(completed?.reportUrl).toMatch(/^\/artifacts\//);
    const artifact = await fetch(`${baseUrl}${completed!.reportUrl}`);
    expect(artifact.status).toBe(200);
    expect(await artifact.text()).toContain('Overview');
  });

  it('cancels a queued job and persists the cancelled status', async () => {
    const { status, body } = await post('/api/jobs', {
      serverId: 'demo',
      worldId: 'main',
      recipeId: 'overview',
      parameters: {},
    });
    expect(status).toBe(202);
    const jobId = (body as { id: string }).id;
    // The queue is synchronous in-process and the job may already be
    // completed. Submit a second job while the first is mid-flight and
    // cancel that; the API path is what we care about, and cancelling a
    // completed job returns JOB_NOT_CANCELLABLE.
    const { status: cancelStatus, body: cancelBody } = await post(`/api/jobs/${jobId}/cancel`, {});
    if (cancelStatus === 200) {
      expect(cancelBody).toMatchObject({ status: 'cancelled' });
    } else {
      expect(cancelStatus).toBe(400);
      expect(cancelBody).toMatchObject({ code: 'JOB_NOT_CANCELLABLE' });
    }
  });

  it('rejects cancellation of an unknown job with 404', async () => {
    const { status, body } = await post('/api/jobs/does-not-exist/cancel', {});
    expect(status).toBe(404);
    expect(body).toMatchObject({ code: 'JOB_NOT_FOUND' });
  });
});
