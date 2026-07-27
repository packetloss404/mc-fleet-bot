#!/usr/bin/env node
/**
 * Capture a BlueMap camera URL with GPU-less Chromium.
 *
 * BlueMap is a perpetual WebGL render loop, so Chromium's one-shot screenshot
 * flag does not terminate reliably. This waits for a real canvas, gives map
 * tiles time to settle, then writes a PNG. It deliberately uses the SwiftShader
 * flags proven on this host in docs/TOOLING-RESEARCH-2026-07-26.md.
 *
 * Usage:
 *   node scripts/capture_bluemap.mjs \
 *     --url 'http://127.0.0.1:18100/#overworld:0:155:320:0:0:0.7:0:0:free' \
 *     --out mainstreet-america/qa/parking.png
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const url = arg('--url');
const out = arg('--out');
const width = Number(arg('--width', '1280'));
const height = Number(arg('--height', '720'));
const settleMs = Number(arg('--settle-ms', '8000'));
const night = args.includes('--night');
const hideUi = args.includes('--hide-ui');
const chrome = arg(
  '--chrome',
  '/home/ianwalmsley/.cache/puppeteer/chrome-headless-shell/'
    + 'linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell',
);
const puppeteerPath = arg(
  '--puppeteer',
  '/tmp/msa-bluemap-capture/node_modules/puppeteer-core',
);

if (!url || !out) {
  console.error(
    'usage: --url <BlueMap URL> --out <png> '
    + '[--width 1280] [--height 720] [--night] [--hide-ui]',
  );
  process.exit(2);
}
if (!Number.isFinite(width) || !Number.isFinite(height) || width < 320 || height < 240) {
  throw new Error('invalid viewport dimensions');
}
if (!fs.existsSync(chrome)) throw new Error(`Chromium executable not found: ${chrome}`);
if (!fs.existsSync(puppeteerPath)) throw new Error(`puppeteer-core not found: ${puppeteerPath}`);

const require = createRequire(import.meta.url);
const puppeteer = require(puppeteerPath);
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  // BlueMap keeps network activity and a WebGL loop alive indefinitely, so
  // `networkidle2` is not a valid readiness condition here.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('canvas', { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  if (night) {
    const clicked = await page.evaluate(() => {
      const controls = document.querySelectorAll('button, [role="button"], [title]');
      for (const control of controls) {
        const label = [
          control.getAttribute('title'),
          control.getAttribute('aria-label'),
          control.textContent,
        ].filter(Boolean).join(' ').toLowerCase();
        if (label.includes('night') || label.includes('lighting')) {
          control.click();
          return label;
        }
      }
      return null;
    });
    // BlueMap 5.16's lighting button has no accessible label. Its stable
    // default-toolbar position is 59.2% across the viewport at y24.
    if (!clicked) await page.mouse.click(Math.round(width * 0.592), 24);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  if (hideUi) {
    await page.addStyleTag({
      content: '.control-bar { display: none !important; }',
    });
  }
  const canvas = await page.evaluate(() => {
    const element = document.querySelector('canvas');
    return {
      width: element?.width ?? 0,
      height: element?.height ?? 0,
      href: window.location.href,
    };
  });
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(`BlueMap returned a blank canvas: ${JSON.stringify(canvas)}`);
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: path.resolve(out) });
  const bytes = fs.statSync(path.resolve(out)).size;
  if (bytes < 20_000) throw new Error(`screenshot is suspiciously small: ${bytes} bytes`);
  console.log(JSON.stringify({
    out: path.resolve(out),
    bytes,
    canvas,
    night,
    hideUi,
  }));
} finally {
  await browser.close();
}
