#!/usr/bin/env node
/** Validate, seal, and atomically publish the current POI coordinate directory. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  countPdfPages,
  invariant,
  publishDirectoryAtomically,
  readJson,
  sha256File,
  validateArtifactEntries,
  writeJson,
} from './safe_publication.mjs';

const SITE_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const DEFAULT_SOURCE = path.join(
  REPO_ROOT,
  'docs/redevelopment/2026-08-27-poi-coordinate-directory',
);
const DEFAULT_TARGET = path.join(SITE_ROOT, 'public/coordinates');
const REPORT_ID = 'ianlan-poi-coordinate-directory-2026-08-27';

function countCsvRecords(contents) {
  let rows = 0;
  let quoted = false;
  for (let index = 0; index < contents.length; index++) {
    const character = contents[index];
    if (character === '"') {
      if (quoted && contents[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (character === '\n' && !quoted) {
      rows++;
    }
  }
  invariant(!quoted, 'Coordinate CSV ends inside a quoted field');
  return contents.length === 0 ? 0 : rows + (contents.endsWith('\n') ? 0 : 1);
}

function chromiumCandidates() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH];
  const caches = [
    [path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell'), 'chrome-headless-shell-linux64/chrome-headless-shell'],
    [path.join(os.homedir(), '.cache/ms-playwright'), 'chrome-headless-shell-linux64/chrome-headless-shell'],
  ];
  for (const [cacheRoot, executable] of caches) {
    if (!fs.existsSync(cacheRoot)) continue;
    for (const entry of fs.readdirSync(cacheRoot).sort().reverse()) {
      candidates.push(path.join(cacheRoot, entry, executable));
    }
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  return candidates.filter((candidate) => candidate && fs.existsSync(candidate));
}

function renderPdf(htmlFile, pdfFile, chromium) {
  const result = spawnSync(chromium, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    `--print-to-pdf=${pdfFile}`,
    '--print-to-pdf-no-header',
    pathToFileURL(htmlFile).href,
  ], { encoding: 'utf8', timeout: 120_000 });
  invariant(
    result.status === 0,
    `Coordinate PDF rendering failed: ${result.stderr || result.stdout || `exit ${result.status}`}`,
  );
  invariant(fs.existsSync(pdfFile), 'Coordinate PDF renderer did not create an output file');
  invariant(fs.statSync(pdfFile).size > 100_000, 'Coordinate PDF is unexpectedly small');
}

function validateCoordinateSource(source) {
  const prePdfManifestFile = path.join(source, 'artifact-manifest.pre-pdf.json');
  invariant(fs.existsSync(prePdfManifestFile), 'Missing coordinate pre-PDF artifact manifest');
  const manifest = readJson(prePdfManifestFile);
  invariant(
    typeof manifest.generatedAt === 'string' && manifest.generatedAt.startsWith('2026-08-27'),
    'Coordinate source is not the 2026-08-27 generated package',
  );
  validateArtifactEntries(source, manifest.artifacts);

  const report = readJson(path.join(source, 'poi-coordinate-directory.json'));
  const portal = readJson(path.join(source, 'portal-summary.json'));
  const records = report.records;
  const expected = manifest.expected;
  invariant(Array.isArray(records), 'Coordinate report records are missing');
  invariant(records.length === expected.records, 'Coordinate report record count drifted');
  invariant(portal.records?.length === expected.records, 'Coordinate portal record count drifted');
  invariant(report.counts.records === expected.records, 'Coordinate report count metadata drifted');
  invariant(portal.counts.records === expected.records, 'Coordinate portal count metadata drifted');
  invariant(expected.records === 1226, 'Expected the accepted 1,226-record coordinate package');
  invariant(new Set(records.map((record) => record.id)).size === expected.uniqueIds, 'Coordinate IDs are not unique');
  invariant(
    Object.values(report.counts.byCategory).reduce((sum, count) => sum + count, 0) === expected.categoryTotal,
    'Coordinate category totals do not partition the report',
  );
  invariant(
    records.every((record) => /^\/tp @s -?\d+ (?:~|-?\d+) -?\d+$/.test(record.reference?.tp)),
    'Coordinate package contains a non-copy-ready teleport command',
  );
  invariant(
    report.truthBoundary?.passageWay?.includes('proper name'),
    'Coordinate PassageWay naming contract is missing',
  );
  invariant(JSON.stringify(report.counts) === JSON.stringify(portal.counts), 'Coordinate report/portal counts differ');
  const csvRows = countCsvRecords(fs.readFileSync(path.join(source, 'poi-coordinate-directory.csv'), 'utf8'));
  invariant(csvRows === expected.records + 1, 'Coordinate CSV record count drifted');
  const html = fs.readFileSync(path.join(source, 'poi-coordinate-directory.html'), 'utf8');
  invariant(html.includes('Report 04 · 2026-08-27'), 'Coordinate HTML publication date drifted');
  invariant(html.includes('1,226 records'), 'Coordinate HTML record count drifted');
  return { manifest, report, portal };
}

export function syncCoordinateDirectory({ source = DEFAULT_SOURCE, target = DEFAULT_TARGET } = {}) {
  const expectedTarget = path.join(SITE_ROOT, 'public', 'coordinates');
  invariant(path.resolve(target) === expectedTarget, `Refusing unexpected coordinate target: ${target}`);
  const validated = validateCoordinateSource(source);
  const chromium = chromiumCandidates()[0];
  invariant(chromium, 'No headless Chromium found; set CHROME_BIN to publish the coordinate PDF');
  const sourceGeneratedAt = validated.manifest.generatedAt;
  const preparedAtUtc = new Date().toISOString();
  let result;

  publishDirectoryAtomically(target, (staging) => {
    for (const artifact of validated.manifest.artifacts) {
      fs.copyFileSync(path.join(source, artifact.path), path.join(staging, artifact.path));
    }
    writeJson(path.join(staging, 'source-artifact-manifest.json'), {
      schemaVersion: 1,
      status: 'VERIFIED_SOURCE_INPUT',
      sourceRoot: path.relative(REPO_ROOT, source),
      note: 'Nested hashes bind the validated pre-PDF source package, before publication adds PDF metadata.',
      manifest: validated.manifest,
    });

    const report = readJson(path.join(staging, 'poi-coordinate-directory.json'));
    const portal = readJson(path.join(staging, 'portal-summary.json'));
    report.id = REPORT_ID;
    portal.id = REPORT_ID;
    const pdfFile = path.join(staging, 'poi-coordinate-directory.pdf');
    renderPdf(path.join(staging, 'poi-coordinate-directory.html'), pdfFile, chromium);
    const pdfPages = countPdfPages(pdfFile);
    report.counts.pdfPages = pdfPages;
    portal.counts.pdfPages = pdfPages;
    writeJson(path.join(staging, 'poi-coordinate-directory.json'), report);
    writeJson(path.join(staging, 'portal-summary.json'), portal);

    const checks = {
      sourcePrePdfManifestVerified: true,
      sourceCount: report.records.length === report.counts.records,
      allSourceRecordsPresent: report.counts.records === 1226,
      uniqueIds: new Set(report.records.map((record) => record.id)).size === report.counts.records,
      categoryPartition: Object.values(report.counts.byCategory)
        .reduce((sum, count) => sum + count, 0) === report.counts.records,
      portalCount: portal.records.length === report.counts.records,
      csvCount: countCsvRecords(fs.readFileSync(path.join(staging, 'poi-coordinate-directory.csv'), 'utf8'))
        === report.counts.records + 1,
      pdfPresent: fs.statSync(pdfFile).size > 100_000,
      pdfPagesPresent: pdfPages > 1,
    };
    invariant(Object.values(checks).every(Boolean), `Coordinate publication QA failed: ${JSON.stringify(checks)}`);
    const qa = {
      schemaVersion: 2,
      id: 'ianlan-poi-coordinate-directory-qa-2026-08-27',
      generatedAt: preparedAtUtc,
      sourceGeneratedAt,
      preparedAtUtc,
      status: 'PASS',
      checks,
      counts: report.counts,
      truthBoundary: report.truthBoundary,
    };
    writeJson(path.join(staging, 'report-qa.json'), qa);

    const artifactNames = [
      'poi-coordinate-directory.html',
      'poi-coordinate-directory.json',
      'poi-coordinate-directory.csv',
      'poi-coordinate-directory.pdf',
      'portal-summary.json',
      'report-qa.json',
      'source-artifact-manifest.json',
    ];
    const artifacts = artifactNames.map((filename) => ({
      path: filename,
      bytes: fs.statSync(path.join(staging, filename)).size,
      sha256: sha256File(path.join(staging, filename)),
    }));
    const artifactManifest = {
      schemaVersion: 2,
      id: 'ianlan-poi-coordinate-directory-artifacts-2026-08-27',
      generatedAt: preparedAtUtc,
      sourceGeneratedAt,
      preparedAtUtc,
      status: 'SEALED',
      source: report.source,
      counts: report.counts,
      artifacts,
    };
    writeJson(path.join(staging, 'artifact-manifest.json'), artifactManifest);
    validateArtifactEntries(staging, artifacts);

    const publication = {
      schemaVersion: 2,
      id: 'ianlan-nextgen-poi-coordinate-directory-publication-2026-08-27',
      sourceEdition: {
        label: '27 August 2026 catalog edition',
        generatedAt: sourceGeneratedAt,
      },
      preparedAtUtc,
      status: 'PASS_PUBLISHED',
      source: {
        root: path.relative(REPO_ROOT, source),
        prePdfManifestSha256: sha256File(path.join(source, 'artifact-manifest.pre-pdf.json')),
      },
      counts: report.counts,
      files: [...artifactNames, 'artifact-manifest.json'].map((filename) => ({
        path: `public/coordinates/${filename}`,
        bytes: fs.statSync(path.join(staging, filename)).size,
        sha256: sha256File(path.join(staging, filename)),
      })),
    };
    writeJson(path.join(staging, 'publication-manifest.json'), publication);
    result = { records: report.counts.records, pdfPages, files: publication.files.length + 1 };
  });

  process.stdout.write(`${JSON.stringify({
    status: 'PASS_PUBLISHED',
    ...result,
    source: path.relative(REPO_ROOT, source),
    target: path.relative(REPO_ROOT, target),
  }, null, 2)}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  syncCoordinateDirectory();
}
