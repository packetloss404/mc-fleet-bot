import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { jsonArtifactSummary } from '../../scripts/lib/artifact_json_summary.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryFile(name: string, contents: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-summary-'));
  temporaryDirectories.push(directory);
  const filename = path.join(directory, name);
  fs.writeFileSync(filename, contents);
  return filename;
}

describe('jsonArtifactSummary', () => {
  it('extracts the compact register fields from bounded JSON', () => {
    const filename = temporaryFile('report.json', JSON.stringify({
      schemaVersion: 4,
      status: 'PASS',
      passed: true,
      packageId: 'example',
      operation: { sha256: 'a'.repeat(64) },
      snapshot: { sha256: 'b'.repeat(64) },
    }));

    expect(jsonArtifactSummary(filename)).toEqual({
      schemaVersion: 4,
      status: 'PASS',
      passed: true,
      packageId: 'example',
      operationSha256: 'a'.repeat(64),
      snapshotSha256: 'b'.repeat(64),
    });
  });

  it('skips optional parsing when a JSON artifact exceeds the size bound', () => {
    const filename = temporaryFile('large.json', JSON.stringify({
      payload: 'x'.repeat(256),
    }));

    expect(jsonArtifactSummary(filename, 64)).toEqual({
      parseSkipped: true,
      reason: 'file-too-large-for-optional-summary',
      bytes: fs.statSync(filename).size,
      maxBytes: 64,
    });
  });
});
