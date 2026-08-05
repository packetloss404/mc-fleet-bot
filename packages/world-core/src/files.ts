import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DevtoolsError } from './errors.js';

export function assertIdentifier(value: string, field: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new DevtoolsError(
      `${field} must contain only letters, numbers, dot, underscore, and hyphen`,
      'INVALID_IDENTIFIER',
      { field, value },
    );
  }
}

export function resolveInside(root: string, configuredPath: string, field: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, configuredPath);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new DevtoolsError(
      `${field} resolves outside the configured server root`,
      'PATH_OUTSIDE_ROOT',
      { root: resolvedRoot, configuredPath, resolved },
    );
  }
  return resolved;
}

export function ensureFreshDirectory(directory: string, allowedRoot: string): void {
  const resolvedRoot = path.resolve(allowedRoot);
  const resolved = path.resolve(directory);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new DevtoolsError(
      'Artifact directory must be a child of the configured artifact root',
      'INVALID_ARTIFACT_PATH',
      { allowedRoot: resolvedRoot, directory: resolved },
    );
  }
  if (fs.existsSync(resolved)) {
    throw new DevtoolsError('Refusing to overwrite an existing report directory', 'OUTPUT_EXISTS', {
      directory: resolved,
    });
  }
  fs.mkdirSync(resolved, { recursive: true });
}

export function writeJsonAtomic(filename: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filename);
}

export function sha256File(filename: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filename));
  return hash.digest('hex');
}

export function walkFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files.sort();
}

export function mediaTypeFor(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case '.html':
      return 'text/html';
    case '.json':
      return 'application/json';
    case '.md':
      return 'text/markdown';
    case '.png':
      return 'image/png';
    case '.pdf':
      return 'application/pdf';
    case '.csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}
