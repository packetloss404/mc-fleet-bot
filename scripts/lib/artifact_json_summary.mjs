import fs from 'node:fs';

export const DEFAULT_JSON_SUMMARY_MAX_BYTES = 32 * 1024 * 1024;

export function jsonArtifactSummary(
  filename,
  maxBytes = DEFAULT_JSON_SUMMARY_MAX_BYTES,
) {
  if (!filename.endsWith('.json')) return null;
  const bytes = fs.statSync(filename).size;
  if (bytes > maxBytes) {
    return {
      parseSkipped: true,
      reason: 'file-too-large-for-optional-summary',
      bytes,
      maxBytes,
    };
  }
  try {
    const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    const snapshot = value.snapshot ?? value.postSnapshot ?? value.preSnapshot ?? null;
    const summary = {
      schemaVersion: value.schemaVersion ?? null,
      status: value.status ?? null,
      passed: typeof value.passed === 'boolean' ? value.passed : null,
      packageId: value.packageId ?? value.id ?? null,
      operationSha256: value.operationSha256
        ?? value.forward?.sha256
        ?? value.operation?.sha256
        ?? null,
      snapshotSha256: snapshot?.sha256
        ?? value.snapshotSha256
        ?? value.sourceSnapshot?.sha256
        ?? null,
    };
    return Object.fromEntries(
      Object.entries(summary).filter(([, fieldValue]) => fieldValue !== null),
    );
  } catch {
    return { parseError: true };
  }
}
