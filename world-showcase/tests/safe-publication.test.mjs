import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  publishDirectoryAtomically,
  resolvePackageFile,
  sha256File,
  validateArtifactEntries,
} from '../scripts/safe_publication.mjs';

function temporaryDirectory(testContext) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-publication-test-'));
  testContext.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('rejects artifact paths that escape the package root', () => {
  assert.throws(
    () => resolvePackageFile('/tmp/publication-root', '../outside.json'),
    /escapes its package root/,
  );
});

test('rejects a manifested artifact whose bytes drift', (testContext) => {
  const root = temporaryDirectory(testContext);
  const artifact = path.join(root, 'report.json');
  fs.writeFileSync(artifact, '{"status":"PASS"}\n');
  const manifestEntry = {
    path: 'report.json',
    bytes: fs.statSync(artifact).size,
    sha256: sha256File(artifact),
  };
  fs.appendFileSync(artifact, 'drift');

  assert.throws(
    () => validateArtifactEntries(root, [manifestEntry]),
    /Artifact size drift/,
  );
});

test('failed staging validation leaves the existing publication unchanged', (testContext) => {
  const root = temporaryDirectory(testContext);
  const target = path.join(root, 'published');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'sentinel.txt'), 'accepted publication\n');

  assert.throws(() => publishDirectoryAtomically(target, (staging) => {
    fs.writeFileSync(path.join(staging, 'invalid.txt'), 'incomplete bundle\n');
    throw new Error('invalid source bundle');
  }), /invalid source bundle/);

  assert.equal(fs.readFileSync(path.join(target, 'sentinel.txt'), 'utf8'), 'accepted publication\n');
  assert.deepEqual(fs.readdirSync(target), ['sentinel.txt']);
});
