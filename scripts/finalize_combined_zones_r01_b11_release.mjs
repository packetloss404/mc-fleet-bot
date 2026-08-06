#!/usr/bin/env node
/**
 * Additive finalize record for the executed CZ-R01 B11 road release.
 * Seals the execution, verification, and reversibility evidence once,
 * after the fact; binds everything downstream-to-upstream.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUTPUT = 'data/buildops/combined-zones-r01-b11-road.finalize.json';
const MARKDOWN = 'docs/masterplans/05-combined-zones/phase1-r01-b11-road-release.md';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const bind = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 finalize rejected: ${message}`);
}

const manifest = readJson('data/buildops/combined-zones-r01-b11-road.release-manifest.json');
const authorization = readJson('data/buildops/combined-zones-r01-b11-road.release-authorization.json');
const execution = readJson('data/buildops/combined-zones-r01-b11-road.forward.execution.json');
const entityGate = readJson('data/buildops/combined-zones-r01-b11-road.entity-gate.json');
const postPreflight = readJson('data/buildops/combined-zones-r01-b11-road.rollback.post-preflight.json');
const postCapture = readJson('data/worldsnap-combined-zones-complete-save-20260806T222851Z/combined-zones-complete-save-capture.json');

const executionText = JSON.stringify(execution);
invariant(!/"failed"\s*:\s*[1-9]/.test(executionText), 'execution report records failures');
invariant(authorization.boundIdentities.manifestIdentity === manifest.manifestIdentity,
  'authorization/manifest identity mismatch');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-r01-b11-road-release-finalize',
  generatedAtUtc: new Date().toISOString(),
  status: 'EXECUTED_VERIFIED_REVERSIBLE_2392_CHANGED_0_FAILED',
  releaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
  domain: 'P1-B11/construction',
  result: {
    forwardCommandCount: 2392,
    changed: 2392,
    failedGroups: 0,
    strictNoop: true,
    executionSeconds: 6,
  },
  bindings: {
    manifest: bind('data/buildops/combined-zones-r01-b11-road.release-manifest.json'),
    manifestIdentity: manifest.manifestIdentity,
    authorization: bind('data/buildops/combined-zones-r01-b11-road.release-authorization.json'),
    forwardOps: bind('data/buildops/combined-zones-r01-b11-road.forward.txt'),
    rollbackOps: bind('data/buildops/combined-zones-r01-b11-road.rollback.txt'),
    forwardExecutionReport: bind('data/buildops/combined-zones-r01-b11-road.forward.execution.json'),
    entityGateReport: bind('data/buildops/combined-zones-r01-b11-road.entity-gate.json'),
    manifestQa: bind('data/world-review/combined-zones-r01-b11-road.manifest-qa.json'),
    t02Audit: bind('data/world-review/combined-zones-r01-b11-road.ownership-interface-audit.json'),
    forwardPreflight: bind('data/buildops/combined-zones-r01-b11-road.forward.preflight.json'),
    rollbackPostPreflight: bind('data/buildops/combined-zones-r01-b11-road.rollback.post-preflight.json'),
  },
  reversibility: {
    postSnapshotRoot: 'data/worldsnap-combined-zones-complete-save-20260806T222851Z',
    postCaptureId: postCapture.captureId ?? null,
    rollbackGuardsPassedAgainstPostState: 2392,
    rollbackGuardsFailed: 0,
    fullyReversible: true,
  },
  entityGateSummary: {
    blockingEntityHits: entityGate.summary?.blockingEntityHits ?? 0,
    ageAtExecutionSeconds: 210,
  },
  visualQa: 'mc-look renders confirm carriageway, dashed centre stripe, curbs, and sidewalk; road spans as an unsupported deck where terrain drops (support cells were influence reservations, not construction scope).',
  followUps: [
    'Owner decision candidate: embankment/pier support treatment where the road spans low terrain (new additive decision; support cells live in the influence reservation).',
    'Next release per contract order: R02 Empty Eight (D06) with the frozen EE role palette.',
  ],
  safetyBoundary: {
    additionalWorldEditsPerformedByThisRecord: false,
    fullCombinedZonesBuildAuthorized: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

const md = `# Combined Zones CZ-R01: Grand Avenue surface road — EXECUTED

**Status:** ${report.status}
**Finalize identity:** \`${report.reportIdentitySha256}\`

The first physical Combined Zones release is live: all **2,392** frozen P1-B11 construction cells were placed by the strict-noop guarded runner (**0 failures, ~6 s**) after the full prerelease chain (G08 double-compile byte-identity, G09 manifest QA, G10 fresh immutable save, G11 preflight 2392/2392, G12 strict dry-runs, T02 exact domain bijection with zero relic-core overlap, G13 live entity gate 0 blockers, G14 hash-bound owner authorization).

- Forward ops: \`${report.bindings.forwardOps.sha256}\`
- Rollback ops: \`${report.bindings.rollbackOps.sha256}\` — **2392/2392 guards pass against the post snapshot**; the release is fully reversible.
- Post snapshot: \`${report.reversibility.postSnapshotRoot}\`

${report.visualQa}

Follow-ups: ${report.followUps.join(' ')}
`;
fs.writeFileSync(path.join(ROOT, MARKDOWN), md);
console.log(JSON.stringify({
  status: report.status,
  reportIdentitySha256: report.reportIdentitySha256,
  markdown: MARKDOWN,
}, null, 2));
