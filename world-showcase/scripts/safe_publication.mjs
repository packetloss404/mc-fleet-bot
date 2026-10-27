import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

export function resolvePackageFile(root, relativePath) {
  invariant(typeof relativePath === 'string' && relativePath.length > 0, 'Artifact path is empty');
  invariant(!path.isAbsolute(relativePath), `Artifact path must be relative: ${relativePath}`);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  invariant(
    resolved.startsWith(`${resolvedRoot}${path.sep}`),
    `Artifact escapes its package root: ${relativePath}`,
  );
  return resolved;
}

export function validateArtifactEntries(root, artifacts, pathField = 'path') {
  invariant(Array.isArray(artifacts) && artifacts.length > 0, 'Artifact manifest has no artifacts');
  const seen = new Set();
  for (const artifact of artifacts) {
    const relativePath = artifact[pathField];
    invariant(!seen.has(relativePath), `Duplicate artifact path: ${relativePath}`);
    seen.add(relativePath);
    const filename = resolvePackageFile(root, relativePath);
    invariant(fs.existsSync(filename), `Missing manifested artifact: ${relativePath}`);
    invariant(fs.statSync(filename).isFile(), `Manifest artifact is not a file: ${relativePath}`);
    invariant(
      fs.statSync(filename).size === artifact.bytes,
      `Artifact size drift: ${relativePath}`,
    );
    invariant(
      sha256File(filename) === artifact.sha256,
      `Artifact hash drift: ${relativePath}`,
    );
  }
  return seen;
}

/** Build and fully validate a sibling staging directory before replacing target. */
export function publishDirectoryAtomically(target, buildStagingDirectory) {
  const resolvedTarget = path.resolve(target);
  const token = `${process.pid}-${Date.now()}`;
  const staging = `${resolvedTarget}.sync-${token}`;
  const previous = `${resolvedTarget}.previous-${token}`;
  invariant(!fs.existsSync(staging), `Staging path already exists: ${staging}`);
  invariant(!fs.existsSync(previous), `Previous-publication path already exists: ${previous}`);
  fs.mkdirSync(staging, { recursive: true });

  let movedPrevious = false;
  try {
    buildStagingDirectory(staging);
    invariant(fs.readdirSync(staging).length > 0, 'Refusing to publish an empty staging directory');
    if (fs.existsSync(resolvedTarget)) {
      fs.renameSync(resolvedTarget, previous);
      movedPrevious = true;
    }
    fs.renameSync(staging, resolvedTarget);
    if (movedPrevious) fs.rmSync(previous, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    if (movedPrevious && !fs.existsSync(resolvedTarget) && fs.existsSync(previous)) {
      fs.renameSync(previous, resolvedTarget);
    }
    throw error;
  }
}

export function countPdfPages(filename) {
  const pages = [...fs.readFileSync(filename).toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  invariant(pages > 0, `Could not determine PDF page count: ${filename}`);
  return pages;
}
