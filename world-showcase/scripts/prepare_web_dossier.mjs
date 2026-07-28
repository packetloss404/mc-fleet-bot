#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE_HTML = path.join(
  REPO_ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/master-plan.html',
);
const SOURCE_PDF = path.join(
  REPO_ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/master-plan.pdf',
);
const OUTPUT_PDF = path.join(SITE_ROOT, 'public/reports/master-plan.pdf');
const OUTPUT_REPORT = path.join(
  SITE_ROOT,
  'public/reports/master-plan-web-publication.json',
);
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const CHROME = process.env.MC_FLEET_CHROME ?? (
  '/home/ianwalmsley/.cache/puppeteer/chrome-headless-shell/'
  + 'linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell'
);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

for (const filename of [SOURCE_HTML, SOURCE_PDF, CHROME]) {
  invariant(fs.existsSync(filename), `Missing web-dossier input: ${filename}`);
}

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'town-expansion-web-dossier-'),
);

try {
  const sourceHtml = fs.readFileSync(SOURCE_HTML, 'utf8');
  const sourceUrls = [
    ...new Set(
      [...sourceHtml.matchAll(/src="(file:\/\/[^"]+)"/g)]
        .map((match) => match[1]),
    ),
  ];
  invariant(sourceUrls.length === 25, (
    `Expected 25 dossier evidence images, found ${sourceUrls.length}`
  ));

  let webHtml = sourceHtml;
  let mapImages = 0;
  let exactObjectImages = 0;
  for (const [index, sourceUrl] of sourceUrls.entries()) {
    const source = fileURLToPath(sourceUrl);
    invariant(fs.existsSync(source), `Missing dossier image: ${source}`);
    const target = path.join(
      temporaryDirectory,
      `evidence-${String(index + 1).padStart(2, '0')}.jpg`,
    );
    await sharp(source)
      .resize({ width: 1600, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 76, mozjpeg: true })
      .toFile(target);
    webHtml = webHtml.replaceAll(sourceUrl, pathToFileURL(target).href);
    if (source.includes('/maps/')) mapImages += 1;
    else exactObjectImages += 1;
  }
  invariant(mapImages === 13, `Expected 13 maps, found ${mapImages}`);
  invariant(
    exactObjectImages === 12,
    `Expected 12 representative exact-object images, found ${exactObjectImages}`,
  );

  const webHtmlPath = path.join(temporaryDirectory, 'master-plan.web.html');
  fs.writeFileSync(webHtmlPath, webHtml);
  fs.mkdirSync(path.dirname(OUTPUT_PDF), { recursive: true });
  const chrome = spawnSync(
    CHROME,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--no-pdf-header-footer',
      `--print-to-pdf=${OUTPUT_PDF}`,
      pathToFileURL(webHtmlPath).href,
    ],
    {
      cwd: SITE_ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (chrome.status !== 0) {
    process.stderr.write(chrome.stderr);
    process.exit(chrome.status ?? 1);
  }

  const sourceBytes = fs.statSync(SOURCE_PDF).size;
  const outputBytes = fs.statSync(OUTPUT_PDF).size;
  invariant(outputBytes >= 100_000, 'Web dossier PDF is suspiciously small');
  invariant(outputBytes < MAX_ASSET_BYTES, (
    `Web dossier PDF ${outputBytes} exceeds ${MAX_ASSET_BYTES} bytes`
  ));

  const report = {
    schemaVersion: 1,
    id: 'town-expansion-master-plan-web-publication',
    generatedAtUtc: new Date().toISOString(),
    status: 'PASS_WEB_PDF_PREPARED',
    preservation: {
      sourceHtml: path.relative(REPO_ROOT, SOURCE_HTML),
      sourcePdf: {
        path: path.relative(REPO_ROOT, SOURCE_PDF),
        bytes: sourceBytes,
        sha256: sha256(SOURCE_PDF),
      },
      textualHtmlUnchanged: true,
      evidenceImageCount: sourceUrls.length,
      mapImages,
      representativeExactObjectImages: exactObjectImages,
    },
    publication: {
      path: path.relative(REPO_ROOT, OUTPUT_PDF),
      bytes: outputBytes,
      sha256: sha256(OUTPUT_PDF),
      platformAssetLimitBytes: MAX_ASSET_BYTES,
      belowPlatformAssetLimit: true,
      imageFormat: 'jpeg',
      imageMaxWidth: 1600,
      imageQuality: 76,
    },
  };
  fs.writeFileSync(OUTPUT_REPORT, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
