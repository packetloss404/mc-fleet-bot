/**
 * `POST /api/admin/restart` must exit non-zero so the systemd unit
 * (`Restart=on-failure`) respawns the process. A clean exit(0) turned the
 * endpoint into a graceful stop that left the fleet down.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import http from 'http';
import express from 'express';
import type { AddressInfo } from 'net';
import { registerAdminRoutes } from '../../src/server/admin';

interface JsonResponse {
  status: number;
  body: any;
}

function post(port: number, path: string): Promise<JsonResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'POST' },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let body: any = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            body = raw;
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function startApp(onRestart: () => void | Promise<void>): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  const app = express();
  registerAdminRoutes(app, { onRestart });
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo | null;
      if (!addr) {
        reject(new Error('no address'));
        return;
      }
      resolve({
        port: addr.port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe('POST /api/admin/restart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('flushes stores, acknowledges, and exits non-zero so the unit respawns', async () => {
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
    const flush = vi.fn();
    const { port, close } = await startApp(flush);

    try {
      const res = await post(port, '/api/admin/restart');
      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({ accepted: true });
      expect(flush).toHaveBeenCalledTimes(1);

      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1), { timeout: 1000 });
    } finally {
      await close();
    }
  });
});
