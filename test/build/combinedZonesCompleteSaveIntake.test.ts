import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/audit_combined_zones_complete_save.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-complete-save-intake-audit.md',
);
const CURRENT_PARTIAL_ROOT = path.join(
  ROOT,
  'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z',
);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-complete-save-'));

interface MemberIdentity {
  path: string;
  bytes: number;
  sha256: string;
}

interface AuditReport {
  status: string;
  executable: boolean;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  operations: unknown[];
  liveCallsPerformed: unknown[];
  input: { suppliedWorldRoot: string };
  rootInspection: {
    dependencySamplePath: boolean;
    directWorldShape: boolean;
    nestedWorldShapeCandidates: string[];
    symlinkPaths: string[];
  };
  requiredMembers: Array<MemberIdentity & { stableDuringAudit: boolean }>;
  captureManifest: {
    parseValid: boolean;
    protocolValid: boolean;
    inventoryExact: boolean;
    inventoryDifferences: string[];
  };
  packageIdentity: {
    canonicalInventorySha256: string | null;
    captureManifestSha256: string | null;
    completeSaveSha256: string | null;
  };
  checks: Array<{ id: string; status: 'PASS' | 'HOLD'; detail: string }>;
  blockers: Array<{ id: string; detail: string }>;
  summary: {
    passed: boolean;
    holdCount: number;
    requiredMemberCount: number;
    regionFileCount: number;
    entityFileCount: number;
    poiFileCount: number;
    levelDatPresent: boolean;
    captureManifestValid: boolean;
    autonomousEngineeringMayUseAsCompleteSaveEvidence: boolean;
  };
}

function sha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function writeFile(filename: string, data: string): void {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, data);
}

function collectMembers(worldRoot: string): MemberIdentity[] {
  const members: MemberIdentity[] = [];
  for (const directory of ['region', 'entities', 'poi']) {
    for (const name of fs.readdirSync(path.join(worldRoot, directory)).sort(lexicalCompare)) {
      const filename = path.join(worldRoot, directory, name);
      const data = fs.readFileSync(filename);
      members.push({
        path: `${directory}/${name}`,
        bytes: data.length,
        sha256: sha256(data),
      });
    }
  }
  const levelData = fs.readFileSync(path.join(worldRoot, 'level.dat'));
  members.push({ path: 'level.dat', bytes: levelData.length, sha256: sha256(levelData) });
  return members.sort((left, right) => lexicalCompare(left.path, right.path));
}

function writeCaptureManifest(worldRoot: string, captureId = 'fixture-capture'): void {
  const manifest = {
    schemaVersion: 1,
    id: 'combined-zones-complete-save-capture',
    captureId,
    worldIdentity: 'fixture-overworld',
    sourceAuthority: 'test-fixture-world-storage',
    captureTool: 'vitest-safe-fixture-writer',
    capturedAtUtc: '2026-08-05T10:00:03Z',
    immutableCopy: true,
    captureProtocol: {
      saveOffConfirmedAtUtc: '2026-08-05T10:00:00Z',
      saveAllFlushCompletedAtUtc: '2026-08-05T10:00:01Z',
      copyStartedAtUtc: '2026-08-05T10:00:02Z',
      copyCompletedAtUtc: '2026-08-05T10:00:03Z',
      saveOnRestoredAtUtc: '2026-08-05T10:00:04Z',
    },
    requiredMembers: collectMembers(worldRoot),
  };
  fs.writeFileSync(
    path.join(worldRoot, 'combined-zones-complete-save-capture.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function createCompleteFixture(name: string): string {
  const worldRoot = path.join(tempRoot, name);
  writeFile(path.join(worldRoot, 'region/r.0.0.mca'), `region-${name}-zero`);
  writeFile(path.join(worldRoot, 'region/r.-1.0.mca'), `region-${name}-negative`);
  writeFile(path.join(worldRoot, 'entities/r.0.0.mca'), `entities-${name}`);
  writeFile(path.join(worldRoot, 'poi/r.0.0.mca'), `poi-${name}`);
  writeFile(path.join(worldRoot, 'level.dat'), `level-${name}`);
  writeCaptureManifest(worldRoot, `capture-${name}`);
  return worldRoot;
}

function treeIdentity(worldRoot: string): MemberIdentity[] {
  return fs.readdirSync(worldRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filename = path.join(entry.parentPath, entry.name);
      const data = fs.readFileSync(filename);
      return {
        path: path.relative(worldRoot, filename).split(path.sep).join('/'),
        bytes: data.length,
        sha256: sha256(data),
      };
    })
    .sort((left, right) => lexicalCompare(left.path, right.path));
}

function runAudit(worldRoot: string, label: string): {
  report: AuditReport;
  json: Buffer;
  markdown: Buffer;
} {
  const output = path.join(tempRoot, `${label}.json`);
  const markdown = path.join(tempRoot, `${label}.md`);
  execFileSync(process.execPath, [
    SCRIPT,
    '--world-root', worldRoot,
    '--out', output,
    '--markdown', markdown,
    '--generated-at', '2026-08-05T01:00:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  const json = fs.readFileSync(output);
  return {
    report: JSON.parse(json.toString('utf8')) as AuditReport,
    json,
    markdown: fs.readFileSync(markdown),
  };
}

function check(report: AuditReport, id: string): 'PASS' | 'HOLD' | undefined {
  return report.checks.find((candidate) => candidate.id === id)?.status;
}

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe('Combined Zones complete saved-world intake audit', () => {
  it('passes a complete attested fixture deterministically without mutating it', () => {
    const worldRoot = createCompleteFixture('complete');
    const before = treeIdentity(worldRoot);
    const first = runAudit(worldRoot, 'complete-first');
    const second = runAudit(worldRoot, 'complete-second');

    expect(first.report).toMatchObject({
      status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
      executable: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      operations: [],
      liveCallsPerformed: [],
      summary: {
        passed: true,
        holdCount: 0,
        requiredMemberCount: 5,
        regionFileCount: 2,
        entityFileCount: 1,
        poiFileCount: 1,
        levelDatPresent: true,
        captureManifestValid: true,
        autonomousEngineeringMayUseAsCompleteSaveEvidence: true,
      },
    });
    expect(first.report.requiredMembers.map(({ path: memberPath }) => memberPath)).toEqual([
      'entities/r.0.0.mca',
      'level.dat',
      'poi/r.0.0.mca',
      'region/r.-1.0.mca',
      'region/r.0.0.mca',
    ]);
    expect(first.report.requiredMembers.every(({ stableDuringAudit }) => stableDuringAudit))
      .toBe(true);
    expect(first.report.packageIdentity.completeSaveSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(first.json).toEqual(second.json);
    expect(first.markdown).toEqual(second.markdown);
    expect(treeIdentity(worldRoot)).toEqual(before);
  });

  it('holds an incomplete package instead of treating colocation as completeness', () => {
    const worldRoot = path.join(tempRoot, 'incomplete');
    writeFile(path.join(worldRoot, 'region/r.0.0.mca'), 'region-only');
    const { report } = runAudit(worldRoot, 'incomplete');

    expect(report.status).toBe('HOLD_INCOMPLETE_OR_UNBOUND_SAVE');
    expect(report.packageIdentity.completeSaveSha256).toBeNull();
    expect(check(report, 'CS04-REGION-MCA-SET')).toBe('PASS');
    expect(check(report, 'CS04-ENTITIES-MCA-SET')).toBe('HOLD');
    expect(check(report, 'CS04-POI-MCA-SET')).toBe('HOLD');
    expect(check(report, 'CS05-LEVEL-DAT')).toBe('HOLD');
    expect(check(report, 'CS09-CAPTURE-MANIFEST')).toBe('HOLD');
  });

  it('detects member drift after the capture inventory was sealed', () => {
    const worldRoot = createCompleteFixture('tampered');
    fs.appendFileSync(path.join(worldRoot, 'entities/r.0.0.mca'), '-tampered');
    const { report } = runAudit(worldRoot, 'tampered');

    expect(report.status).toBe('HOLD_INCOMPLETE_OR_UNBOUND_SAVE');
    expect(report.captureManifest).toMatchObject({
      parseValid: true,
      protocolValid: true,
      inventoryExact: false,
    });
    expect(report.captureManifest.inventoryDifferences).toContain(
      'hash/size drift: entities/r.0.0.mca',
    );
    expect(check(report, 'CS11-MANIFEST-INVENTORY-EXACT')).toBe('HOLD');
    expect(report.packageIdentity.completeSaveSha256).toBeNull();
  });

  it('rejects symlink members and dependency/sample paths', () => {
    const symlinkRoot = createCompleteFixture('symlink');
    const poiFile = path.join(symlinkRoot, 'poi/r.0.0.mca');
    fs.rmSync(poiFile);
    fs.symlinkSync(path.join(symlinkRoot, 'entities/r.0.0.mca'), poiFile);
    const symlinkAudit = runAudit(symlinkRoot, 'symlink').report;
    expect(check(symlinkAudit, 'CS06-NO-SYMLINKS')).toBe('HOLD');
    expect(symlinkAudit.rootInspection.symlinkPaths).toHaveLength(1);

    const dependencyRoot = createCompleteFixture('node_modules/dependency-world');
    const dependencyAudit = runAudit(dependencyRoot, 'dependency').report;
    expect(dependencyAudit.rootInspection.dependencySamplePath).toBe(true);
    expect(check(dependencyAudit, 'CS02-DEPENDENCY-SAMPLE-EXCLUSION')).toBe('HOLD');
    expect(dependencyAudit.packageIdentity.completeSaveSha256).toBeNull();
  });

  it('rejects a parent containing ambiguous nested world roots', () => {
    const parent = path.join(tempRoot, 'ambiguous');
    createCompleteFixture('ambiguous/world-a');
    createCompleteFixture('ambiguous/world-b');
    const { report } = runAudit(parent, 'ambiguous');

    expect(report.rootInspection.directWorldShape).toBe(false);
    expect(report.rootInspection.nestedWorldShapeCandidates).toHaveLength(2);
    expect(check(report, 'CS03-UNAMBIGUOUS-WORLD-ROOT')).toBe('HOLD');
    expect(report.packageIdentity.completeSaveSha256).toBeNull();
  });

  it('refuses to place audit outputs inside the supplied save', () => {
    const worldRoot = createCompleteFixture('output-safety');
    const unsafeOutput = path.join(worldRoot, 'audit.json');
    const safeMarkdown = path.join(tempRoot, 'output-safety.md');
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--world-root', worldRoot,
      '--out', unsafeOutput,
      '--markdown', safeMarkdown,
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    expect(fs.existsSync(unsafeOutput)).toBe(false);
    expect(fs.existsSync(safeMarkdown)).toBe(false);
  });

  it('regenerates the committed current-repository HOLD report byte-for-byte', () => {
    const regeneratedJson = path.join(tempRoot, 'current.json');
    const regeneratedMarkdown = path.join(tempRoot, 'current.md');
    execFileSync(process.execPath, [
      SCRIPT,
      '--world-root', CURRENT_PARTIAL_ROOT,
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', '2026-08-05T01:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe' });

    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
    const report = JSON.parse(fs.readFileSync(regeneratedJson, 'utf8')) as AuditReport;
    expect(report).toMatchObject({
      status: 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
      input: {
        suppliedWorldRoot:
          'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z',
      },
      summary: {
        passed: false,
        regionFileCount: 51,
        entityFileCount: 0,
        poiFileCount: 0,
        levelDatPresent: false,
        captureManifestValid: false,
        autonomousEngineeringMayUseAsCompleteSaveEvidence: false,
      },
    });
    expect(report.packageIdentity.completeSaveSha256).toBeNull();
  });
});
