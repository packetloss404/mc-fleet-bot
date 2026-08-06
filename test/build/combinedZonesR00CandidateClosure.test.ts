import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r00_candidate_closure.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-candidate-closure.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-candidate-closure.md',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r00-candidate-closure-'));
const regeneratedJson = path.join(temporaryDirectory, 'candidate-closure.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'candidate-closure.md');

type JsonRecord = Record<string, unknown>;

function report(): JsonRecord {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T22:00:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones R00 candidate closure', () => {
  it('regenerates the committed read-only report byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('records the recorded-acceptance supersession without claiming acceptance itself', () => {
    const value = report();
    expect(value).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-r00-candidate-closure',
      status:
        'READ_ONLY_CANDIDATE_CLOSURE_SUPERSEDED_BY_RECORDED_ACCEPTANCE_AND_ADDITIVE_CLOSURE',
      summary: {
        totalInterfaceContractCount: 161,
        exactGeometryCount: 148,
        sourceBackedExactGeometryCount: 23,
        hashOnlyExactGeometryCount: 125,
        nullGeometryCount: 13,
        existingTransitionPairManifestCount: 109,
        missingTransitionPairManifestCount: 52,
        sourceBackedMissingTransitionPairManifestCount: 11,
        upstreamMissingTransitionPairManifestCount: 28,
        candidateBeforeStateDerivationCount: 23,
        missingFutureStateHashCount: 161,
        acceptedContractCount: 0,
        ownerRecordCount: 27,
        acceptedOwnerRecordCount: 0,
        externalUnresolvedWorkItemCount: 0,
        supersededWorkItemCount: 5,
        r00Ready: true,
        buildAuthorized: false,
        worldEditAuthorized: false,
      },
      safetyBoundary: {
        readOnly: true,
        operationCount: 0,
        productionContacted: false,
        acceptanceClaimed: false,
        worldEditAuthorized: false,
      },
    });
  });
});
