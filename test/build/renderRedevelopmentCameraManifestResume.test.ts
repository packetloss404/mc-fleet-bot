import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_MANIFEST = path.join(
  ROOT,
  'data/exports/town-expansion-media-2026-07-28/capture-manifest.json',
);
const REGIONS = path.join(
  ROOT,
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
);
const RENDERER = path.join(
  ROOT,
  'scripts/render_redevelopment_camera_manifest.mjs',
);

function sha256File(filename: string) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(filename))
    .digest('hex');
}

describe('redevelopment camera renderer resume binding', () => {
  it('reuses a validated partial output and rejects manifest drift', () => {
    const temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), 'town-media-resume-'),
    );
    try {
      const source = JSON.parse(fs.readFileSync(SOURCE_MANIFEST, 'utf8'));
      const camera = source.cameras.find(
        (candidate: { id: string }) =>
          candidate.id === 'OBJECT-RRCH-GILDED-RAVEN-FIRST-PASS-PASS-1',
      );
      const mapCamera = source.cameras.find(
        (candidate: { id: string }) =>
          candidate.id === 'MAP-DISTRICT-C01-PASS-1',
      );
      expect(camera).toBeTruthy();
      expect(mapCamera).toBeTruthy();
      const manifest = {
        ...source,
        id: 'town-expansion-resume-focused-test',
        cameras: [mapCamera, camera],
      };
      const manifestPath = path.join(temporary, 'manifest.json');
      const outputDirectory = path.join(temporary, 'captures');
      const reportPath = path.join(outputDirectory, 'capture-report.json');
      fs.writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      const command = [
        RENDERER,
        '--manifest', manifestPath,
        '--regions', REGIONS,
        '--out-dir', outputDirectory,
        '--report', reportPath,
        '--resume',
      ];

      const first = spawnSync(process.execPath, command, {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(first.status, first.stderr).toBe(0);
      const output = path.join(outputDirectory, camera.output);
      const firstHash = sha256File(output);
      const firstModified = fs.statSync(output).mtimeMs;

      const second = spawnSync(process.execPath, command, {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(second.status, second.stderr).toBe(0);
      expect(second.stdout).toContain(`${camera.id}: reused`);
      expect(sha256File(output)).toBe(firstHash);
      expect(fs.statSync(output).mtimeMs).toBe(firstModified);
      expect(JSON.parse(fs.readFileSync(reportPath, 'utf8'))).toMatchObject({
        status: 'PASS',
        passed: true,
        captureCount: 2,
        captures: [
          {
            id: mapCamera.id,
            output: mapCamera.output,
            camera: {
              mode: 'map',
              fieldOfView: null,
            },
          },
          {
            id: camera.id,
            output: camera.output,
          },
        ],
        snapshot: {
          sha256:
            'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
        },
        resume: {
          enabled: true,
        },
      });

      fs.appendFileSync(manifestPath, '\n');
      const drifted = spawnSync(process.execPath, command, {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(drifted.status).not.toBe(0);
      expect(drifted.stderr).toContain(
        'resume binding does not match the selected manifest',
      );
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }, 30_000);
});
