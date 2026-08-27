import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_combined_zones_r13_g18_publication_acceptance.mjs');
const CONTRACT = path.join(ROOT, 'docs/masterplans/05-combined-zones/phase1-release-contract.json');
const MASTERPLAN = path.join(ROOT, 'docs/masterplans/05-combined-zones/MASTERPLAN.md');
const CURRENT_STATE = path.join(ROOT, 'docs/masterplans/05-combined-zones/CURRENT-STATE.md');
const EXPECTED_CONTRACT_SHA256 = '0c8bac62f3950ed364214f69c7528cc11e4dc12192f38ab6d52326e5f468cd63';
const EXPECTED_MASTERPLAN_SHA256 = 'e0f0459126beb8d40d7d7450cd60897a1d9ca69f5d39334a5234df4e763ce737';
const EXPECTED_CURRENT_STATE_SHA256 = '9ed4340ce1d4476420bca6ab09fa5c681722872bec49b895650f6d8ea99d872d';
const OUTPUTS = [
  'terminal-post-acceptance.json',
  'matched-media-manifest.json',
  'terminal-map-qa.json',
  'database-import-verification.json',
  'publication-manifest.json',
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r13-g18-'));
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const declaration = (filename: string) => ({
  path: filename,
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

function passFixture(root: string, options: { mismatchMapTerminal?: boolean } = {}) {
  fs.mkdirSync(root, { recursive: true });
  const terminalHash = 'b'.repeat(64);
  const r13 = path.join(root, 'r13-ready.json');
  writeJson(r13, {
    status: 'WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE',
    readinessPayloadSha256: 'c'.repeat(64),
    release: { releaseNodeId: 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE' },
    requiredDependencies: Array.from({ length: 6 }, (_, index) => ({
      releaseNodeId: `TEST-${index}`,
      status: 'PASS',
    })),
    gates: [
      { id: 'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT', status: 'PASS' },
      { id: 'G17_FUNCTIONAL_POST_QA', status: 'PASS' },
      { id: 'G18_MEDIA_AND_PUBLICATION', status: 'WAITING' },
      { id: 'G19_FINAL_ACCEPTANCE', status: 'WAITING' },
    ],
  });

  const identity = path.join(root, 'post-identity.json');
  const intake = path.join(root, 'post-intake.json');
  const rollback = path.join(root, 'rollback-preflight.json');
  writeJson(identity, { status: 'PASS', sha256: 'd'.repeat(64) });
  writeJson(intake, { status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' });
  writeJson(rollback, { status: 'PASS_COMPLETE_POSTSTATE_PREFLIGHT' });
  const ledger = path.join(root, 'terminal-ledger.json');
  writeJson(ledger, {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    completedReleaseIdentitySha256: 'e'.repeat(64),
    postSnapshot: {
      root: path.join(root, 'terminal-post'),
      completeSaveSha256: terminalHash,
      identity: declaration(identity),
      completeSaveIntake: declaration(intake),
    },
    rollbackPoststatePreflights: [declaration(rollback)],
  });
  const qa = path.join(root, 'terminal-qa.json');
  writeJson(qa, {
    status: 'PASS_SYNTHETIC_TERMINAL_POST_QA',
    summary: { passed: true },
    ledger: declaration(ledger),
    postSnapshot: { completeSaveSha256: terminalHash },
  });

  const capture = path.join(root, 'capture.png');
  fs.writeFileSync(capture, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('synthetic-local-test-evidence'),
  ]));
  const media = path.join(root, 'media-evidence.json');
  writeJson(media, {
    status: 'PASS_SYNTHETIC_MATCHED_MEDIA',
    summary: { passed: true },
    terminalCompleteSaveSha256: terminalHash,
    coverageComplete: true,
    items: [{
      id: 'capture-01',
      ...declaration(capture),
      matchedFeatureIds: ['R10-B03', 'R12-B09'],
    }],
  });

  const mapArtifact = path.join(root, 'terminal-map.svg');
  fs.writeFileSync(mapArtifact, '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n');
  const map = path.join(root, 'map-evidence.json');
  writeJson(map, {
    status: 'PASS_SYNTHETIC_TERMINAL_MAP_QA',
    summary: { passed: true },
    terminalCompleteSaveSha256: options.mismatchMapTerminal ? 'f'.repeat(64) : terminalHash,
    matchedMediaEvidenceSha256: sha256(media),
    coverageComplete: true,
    checks: [
      { id: 'terminal-post-binding', status: 'PASS' },
      { id: 'matched-media-crosswalk', status: 'PASS' },
    ],
    artifacts: [{ id: 'terminal-map', ...declaration(mapArtifact) }],
  });

  const database = path.join(root, 'world-map.db');
  fs.writeFileSync(database, Buffer.concat([
    Buffer.from('SQLite format 3\0', 'binary'),
    Buffer.alloc(64, 0),
  ]));
  const importEvidence = path.join(root, 'database-import-evidence.json');
  writeJson(importEvidence, {
    status: 'PASS_SYNTHETIC_DATABASE_IMPORT_VERIFICATION',
    summary: { passed: true },
    terminalCompleteSaveSha256: terminalHash,
    importedRecordCount: 42,
    verifiedRecordCount: 42,
    mismatchCount: 0,
    sourceRecordSetSha256: '1'.repeat(64),
    importedRecordSetSha256: '1'.repeat(64),
    databaseArtifact: declaration(database),
  });
  return { r13, ledger, qa, media, map, importEvidence, terminalHash };
}

function runFixture(
  root: string,
  fixture: ReturnType<typeof passFixture>,
  outName = 'out',
  bindingRoot?: string,
) {
  const out = path.join(root, outName);
  const args = [
    SCRIPT,
    '--out-root', out,
    '--r13-report', fixture.r13,
    '--terminal-ledger', fixture.ledger,
    '--terminal-qa', fixture.qa,
    '--media-evidence', fixture.media,
    '--map-evidence', fixture.map,
    '--database-import-evidence', fixture.importEvidence,
  ];
  if (bindingRoot) args.push('--binding-root', bindingRoot);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  return out;
}

describe('Combined Zones R13 G18 terminal publication acceptance toolkit', () => {
  it('reproduces all five fixture-local artifacts byte for byte', () => {
    const root = path.join(temp, 'fixture-local-reproduction');
    const fixture = passFixture(root);
    const bindingRoot = path.join(root, 'stable-declared-output');
    const first = runFixture(root, fixture, 'first', bindingRoot);
    const second = runFixture(root, fixture, 'second', bindingRoot);
    for (const filename of OUTPUTS) {
      expect(sha256(path.join(first, filename))).toBe(sha256(path.join(second, filename)));
    }
  });

  it('binds the rebound contract and fixture-local pre-publication R13 report', () => {
    const root = path.join(temp, 'rebound-contract-binding');
    const fixture = passFixture(root);
    const out = runFixture(root, fixture);
    const terminal = JSON.parse(fs.readFileSync(
      path.join(out, 'terminal-post-acceptance.json'),
      'utf8',
    ));
    expect(terminal.controlBindings).toMatchObject({
      releaseContract: {
        sha256: EXPECTED_CONTRACT_SHA256,
      },
      prePublicationR13Readiness: {
        sha256: sha256(fixture.r13),
        readinessPayloadSha256: 'c'.repeat(64),
        requiredDependencyPassCount: 6,
        requiredDependencyCount: 6,
        g16Status: 'PASS',
        g17Status: 'PASS',
      },
    });
    expect(sha256(CONTRACT)).toBe(EXPECTED_CONTRACT_SHA256);
    expect(sha256(MASTERPLAN)).toBe(EXPECTED_MASTERPLAN_SHA256);
    expect(sha256(CURRENT_STATE)).toBe(EXPECTED_CURRENT_STATE_SHA256);
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    const authorityBindings = Object.fromEntries(contract.authorityBindings.map(
      ({ path: filename, sha256: expectedSha256 }: { path: string; sha256: string }) => (
        [filename, expectedSha256]
      ),
    ));
    expect(authorityBindings).toMatchObject({
      'docs/masterplans/05-combined-zones/MASTERPLAN.md': EXPECTED_MASTERPLAN_SHA256,
      'docs/masterplans/05-combined-zones/CURRENT-STATE.md': EXPECTED_CURRENT_STATE_SHA256,
    });
  });

  it('reports honest WAITING without inventing terminal, media, map, or import evidence', () => {
    const root = path.join(temp, 'fixture-local-waiting');
    const fixture = passFixture(root);
    const out = path.join(root, 'out');
    execFileSync(process.execPath, [
      SCRIPT,
      '--out-root', out,
      '--binding-root', out,
      '--r13-report', fixture.r13,
    ], { cwd: ROOT, stdio: 'pipe' });
    const reports = Object.fromEntries(OUTPUTS.map((filename) => [
      filename,
      JSON.parse(fs.readFileSync(path.join(out, filename), 'utf8')),
    ]));
    expect(reports['terminal-post-acceptance.json'].status).toBe(
      'WAITING_R13_G18_TERMINAL_POST_ACCEPTANCE',
    );
    expect(reports['terminal-post-acceptance.json'].verification).toMatchObject({
      prePublicationR13Ready: true,
      terminalLedgerAccepted: false,
      independentPostQaAccepted: false,
    });
    expect(reports['matched-media-manifest.json']).toMatchObject({
      status: 'WAITING_R13_G18_MATCHED_MEDIA',
      coverageComplete: false,
      items: [],
      evidenceCreationPerformed: false,
      externalPublicationPerformed: false,
    });
    expect(reports['terminal-map-qa.json']).toMatchObject({
      status: 'WAITING_R13_G18_TERMINAL_MAP_QA',
      artifacts: [],
      coverageComplete: false,
      mapGenerationPerformed: false,
    });
    expect(reports['database-import-verification.json']).toMatchObject({
      status: 'WAITING_R13_G18_DATABASE_IMPORT',
      importedRecordCount: 0,
      databaseWriteOrImportPerformed: false,
    });
  });

  it('reaches PASS only from complete, same-terminal, locally hash-verified evidence', () => {
    const root = path.join(temp, 'pass-fixture');
    const fixture = passFixture(root);
    const out = runFixture(root, fixture);
    const terminal = JSON.parse(fs.readFileSync(path.join(out, OUTPUTS[0]), 'utf8'));
    const media = JSON.parse(fs.readFileSync(path.join(out, OUTPUTS[1]), 'utf8'));
    const map = JSON.parse(fs.readFileSync(path.join(out, OUTPUTS[2]), 'utf8'));
    const database = JSON.parse(fs.readFileSync(path.join(out, OUTPUTS[3]), 'utf8'));
    const publication = JSON.parse(fs.readFileSync(path.join(out, OUTPUTS[4]), 'utf8'));
    expect(terminal.status).toBe('PASS_R13_G18_TERMINAL_POST_ACCEPTED');
    expect(media.status).toBe('PASS_R13_G18_MATCHED_MEDIA_ACCEPTED');
    expect(map.status).toBe('PASS_R13_G18_TERMINAL_MAP_QA_ACCEPTED');
    expect(database.status).toBe('PASS_R13_G18_DATABASE_IMPORT_ACCEPTED');
    expect(publication.status).toBe('PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED');
    expect(publication).toMatchObject({
      terminalCompleteSaveSha256: fixture.terminalHash,
      publicationAuthorized: true,
      externalPublicationPerformed: false,
      gates: {
        terminalPostAcceptance: 'PASS',
        matchedMedia: 'PASS',
        terminalMapQa: 'PASS',
        databaseImportVerification: 'PASS',
        commonTerminalPostBinding: 'PASS',
      },
    });
    for (const [id, item] of Object.entries(publication.evidenceBindings) as Array<[
      string,
      { path: string; sha256: string; bytes: number },
    ]>) {
      expect(item.sha256, id).toBe(sha256(path.resolve(ROOT, item.path)));
      expect(item.bytes, id).toBe(fs.statSync(path.resolve(ROOT, item.path)).size);
    }
  });

  it('fails the map and publication gates closed on a terminal-post mismatch', () => {
    const root = path.join(temp, 'mismatch-fixture');
    const fixture = passFixture(root, { mismatchMapTerminal: true });
    const out = runFixture(root, fixture);
    const map = JSON.parse(fs.readFileSync(path.join(out, 'terminal-map-qa.json'), 'utf8'));
    const publication = JSON.parse(fs.readFileSync(path.join(out, 'publication-manifest.json'), 'utf8'));
    expect(map.status).toBe('WAITING_R13_G18_TERMINAL_MAP_QA');
    expect(map.waitingReasons).toContain(
      'Terminal map QA does not bind the accepted terminal complete save.',
    );
    expect(publication.status).toBe('WAITING_R13_G18_MEDIA_AND_PUBLICATION');
    expect(publication.publicationAuthorized).toBe(false);
    expect(publication.gates.terminalMapQa).toBe('WAITING');
  });

  it('never performs capture, import, external publication, live calls, or mutations', () => {
    const root = path.join(temp, 'fixture-local-safety-boundary');
    const fixture = passFixture(root);
    const out = runFixture(root, fixture);
    const publication = JSON.parse(fs.readFileSync(
      path.join(out, 'publication-manifest.json'),
      'utf8',
    ));
    expect(publication.safetyBoundary).toEqual({
      readOnlyEvidenceVerification: true,
      mediaCapturedOrCreated: false,
      mapGeneratedOrModified: false,
      databaseWrittenOrImported: false,
      externalPublicationPerformed: false,
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      canonicalBuildopsReadOrModified: false,
      serviceMutationsPerformed: false,
    });
    expect(publication.externalPublicationPerformed).toBe(false);
    expect(publication.publicationAuthorized).toBe(true);
  });

  it('rejects any release-contract byte drift', () => {
    const altered = path.join(temp, 'altered-contract.json');
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    contract.status = 'TEST_DRIFT';
    writeJson(altered, contract);
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--release-contract', altered,
      '--out-root', path.join(temp, 'must-not-write'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });
});
