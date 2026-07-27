#!/usr/bin/env node
/**
 * Assemble independently rendered PNG maps into one indexed world atlas.
 *
 * The render teams own the maps. This script owns only packaging:
 *   - atlas-index.json with hashes, dimensions, provenance, and relative paths
 *   - README.md with a clickable map inventory
 *   - world-atlas-contact-sheet.png
 *   - world-atlas.pdf (cover plus one full-resolution page per map)
 *
 * Usage:
 *   node scripts/assemble_world_atlas.mjs \
 *     --root data/exports/box/atlas-2026-07-26 \
 *     --snapshot 78a28b83...
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  const value = process.argv[i + 1];
  args[key] = value && !value.startsWith('--') ? process.argv[++i] : 'true';
}

const workspaceRoot = process.cwd();
const atlasRoot = path.resolve(workspaceRoot, args.root ?? 'data/exports/box/atlas-2026-07-26');
const snapshotSha256 = args.snapshot ?? '';
const generatedAt = new Date().toISOString();
const outputNames = new Set([
  'world-atlas-contact-sheet.png',
]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...walk(absolutePath));
    else out.push(absolutePath);
  }
  return out;
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function humanTitle(relativePath) {
  return path.basename(relativePath, path.extname(relativePath))
    .replace(/^[0-9]+[a-z]?[-_. ]*/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function wrapText(ctx, value, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = String(value).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      if (lines >= maxLines) return y;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function paintBackground(ctx, width, height) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);
}

function validateImage(image, relativePath) {
  const sampleWidth = Math.min(128, image.width);
  const sampleHeight = Math.min(128, image.height);
  const sample = createCanvas(sampleWidth, sampleHeight);
  const ctx = sample.getContext('2d');
  ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const colors = new Set();
  let opaque = 0;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 16) continue;
    opaque += 1;
    const luminance = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;
    colors.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
  }
  const total = sampleWidth * sampleHeight;
  const opaqueFraction = opaque / total;
  const mean = opaque ? luminanceSum / opaque : 0;
  const variance = opaque ? Math.max(0, luminanceSquaredSum / opaque - mean * mean) : 0;
  const luminanceStdDev = Math.sqrt(variance);
  const result = {
    sampleWidth,
    sampleHeight,
    opaqueFraction: Number(opaqueFraction.toFixed(4)),
    colorBuckets: colors.size,
    luminanceStdDev: Number(luminanceStdDev.toFixed(2)),
    passed: opaqueFraction >= 0.75 && colors.size >= 6 && luminanceStdDev >= 2,
  };
  if (!result.passed) {
    throw new Error(`Blank or low-information map ${relativePath}: ${JSON.stringify(result)}`);
  }
  return result;
}

function drawMapPage(ctx, image, map, width, height) {
  paintBackground(ctx, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px DejaVu Sans, sans-serif';
  ctx.fillText(map.title, 64, 58);

  const top = 86;
  const footer = 62;
  const availableWidth = width - 128;
  const availableHeight = height - top - footer;
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
  const drawWidth = Math.max(1, Math.round(image.width * scale));
  const drawHeight = Math.max(1, Math.round(image.height * scale));
  const x = Math.round((width - drawWidth) / 2);
  const y = top + Math.round((availableHeight - drawHeight) / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, drawWidth + 8, drawHeight + 8);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '18px DejaVu Sans Mono, monospace';
  ctx.fillText(map.relativePath, 64, height - 28);
}

fs.mkdirSync(atlasRoot, { recursive: true });

const pngPaths = walk(atlasRoot)
  .filter((filename) => path.extname(filename).toLowerCase() === '.png')
  .filter((filename) => !outputNames.has(path.basename(filename)))
  .sort((a, b) => a.localeCompare(b));

if (!pngPaths.length) {
  throw new Error(`No source PNG maps found under ${atlasRoot}`);
}

const maps = [];
for (const absolutePath of pngPaths) {
  const image = await loadImage(absolutePath);
  const stat = fs.statSync(absolutePath);
  const relativePath = path.relative(atlasRoot, absolutePath).split(path.sep).join('/');
  maps.push({
    absolutePath,
    relativePath,
    title: humanTitle(relativePath),
    width: image.width,
    height: image.height,
    bytes: stat.size,
    sha256: sha256File(absolutePath),
    visualValidation: validateImage(image, relativePath),
    image,
  });
}

const index = {
  schemaVersion: 1,
  generatedAt,
  snapshot: {
    directory: 'data/worldsnap/region',
    sha256: snapshotSha256 || null,
  },
  mapCount: maps.length,
  maps: maps.map(({ image: _image, absolutePath: _absolutePath, ...map }) => map),
};
fs.writeFileSync(
  path.join(atlasRoot, 'atlas-index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
);

const readme = [
  '# MC Fleet world atlas',
  '',
  `**Generated:** ${generatedAt}  `,
  `**Snapshot SHA-256:** \`${snapshotSha256 || 'not supplied'}\`  `,
  `**Maps:** ${maps.length}`,
  '',
  'North is up unless a map explicitly states otherwise. Underground plans are',
  'elevation slices, not surface projections. Exact bounds and route annotations',
  'are retained in each team metadata file.',
  '',
  '## Start here',
  '',
  '- [Huge active-world surface map](team-a/00-overall-active-world-surface-atlas.png)',
  '- [MainStreet annotated campus map](team-b/01b-campus-overview-annotated.png)',
  '- [Mountain entry → hangar office → observatory/heliport](team-b/07-surface-access-and-vertical-stack-schematic.png)',
  '- [MainStreet bunker public levels](team-c/01-mainstreet-public-complex.png)',
  '- [Shelter and three-level grand vault](team-c/04-mainstreet-vault-shelter-levels.png)',
  '- [Separate Moot Hall B1/B2 basement plans](team-c/06-ravensreach-moot-hall-basements.png)',
  '- [Raven Rock active underground complex](team-c/07-raven-rock-active-complex.png)',
  '',
  '## Identity and scope notes',
  '',
  '- The active authored inn is Westlight’s **Beacon Inn**. Exact block census',
  '  proves its entire y40–67 footprint is solid, so it has **no basement**.',
  '  `team-c/05-inn-basement-identity-audit.png` records that result.',
  '- The two built basement levels are beneath **Ravensreach Moot Hall**, not the',
  '  inn. They are mapped together and as separate B1/B2 sheets.',
  '- Raven Rock is a distinct active underground build. Its interior is explicitly',
  '  a creative Minecraft interpretation because the real facility is classified.',
  '- Retired Hollybrook/DyoCraft coordinates and superseded build units are not',
  '  presented as active-world destinations.',
  '',
  '## Team metadata',
  '',
  '- [Surface/world inventory](team-a/README.md)',
  '- [MainStreet maps and GeoJSON](team-b/manifest.json)',
  '- [Underground/interior atlas](team-c/README.md)',
  '',
  '## Map inventory',
  '',
  '| Map | Pixels | SHA-256 |',
  '|---|---:|---|',
  ...maps.map((map) => (
    `| [${map.title}](${map.relativePath}) | ${map.width}×${map.height} | \`${map.sha256.slice(0, 16)}…\` |`
  )),
  '',
  '## Bundles',
  '',
  '- [Contact sheet](world-atlas-contact-sheet.png)',
  '- [Multi-page PDF atlas](world-atlas.pdf)',
  '- [Machine-readable index](atlas-index.json)',
  '',
].join('\n');
fs.writeFileSync(path.join(atlasRoot, 'README.md'), readme);

const contactWidth = 2400;
const columns = 3;
const margin = 48;
const gap = 32;
const cellWidth = Math.floor((contactWidth - margin * 2 - gap * (columns - 1)) / columns);
const imageHeight = 390;
const cellHeight = 478;
const headerHeight = 190;
const rows = Math.ceil(maps.length / columns);
const contactHeight = headerHeight + margin + rows * cellHeight;
const contact = createCanvas(contactWidth, contactHeight);
const contactCtx = contact.getContext('2d');
paintBackground(contactCtx, contactWidth, contactHeight);
contactCtx.fillStyle = '#f8fafc';
contactCtx.font = 'bold 54px DejaVu Sans, sans-serif';
contactCtx.fillText('MC Fleet World Atlas', margin, 72);
contactCtx.fillStyle = '#94a3b8';
contactCtx.font = '22px DejaVu Sans Mono, monospace';
contactCtx.fillText(`snapshot ${snapshotSha256 || 'not supplied'}`, margin, 116);
contactCtx.fillText(`${maps.length} maps · north up unless marked · ${generatedAt}`, margin, 154);

for (let i = 0; i < maps.length; i += 1) {
  const map = maps[i];
  const column = i % columns;
  const row = Math.floor(i / columns);
  const x = margin + column * (cellWidth + gap);
  const y = headerHeight + row * cellHeight;
  contactCtx.fillStyle = '#1f2937';
  contactCtx.fillRect(x, y, cellWidth, cellHeight - 18);
  const scale = Math.min(cellWidth / map.image.width, imageHeight / map.image.height);
  const drawWidth = Math.max(1, Math.round(map.image.width * scale));
  const drawHeight = Math.max(1, Math.round(map.image.height * scale));
  contactCtx.drawImage(
    map.image,
    x + Math.round((cellWidth - drawWidth) / 2),
    y + 12 + Math.round((imageHeight - drawHeight) / 2),
    drawWidth,
    drawHeight,
  );
  contactCtx.fillStyle = '#f8fafc';
  contactCtx.font = 'bold 20px DejaVu Sans, sans-serif';
  wrapText(contactCtx, map.title, x + 14, y + imageHeight + 38, cellWidth - 28, 24, 2);
}
fs.writeFileSync(
  path.join(atlasRoot, 'world-atlas-contact-sheet.png'),
  contact.toBuffer('image/png'),
);

const pageWidth = 1600;
const pageHeight = 1200;
const pdfCanvas = createCanvas(pageWidth, pageHeight, 'pdf');
const pdfCtx = pdfCanvas.getContext('2d');
paintBackground(pdfCtx, pageWidth, pageHeight);
pdfCtx.fillStyle = '#f8fafc';
pdfCtx.font = 'bold 72px DejaVu Sans, sans-serif';
pdfCtx.fillText('MC Fleet World Atlas', 96, 150);
pdfCtx.fillStyle = '#cbd5e1';
pdfCtx.font = '30px DejaVu Sans, sans-serif';
pdfCtx.fillText('Overall world, districts, interiors, and underground complexes', 96, 215);
pdfCtx.font = '24px DejaVu Sans Mono, monospace';
wrapText(
  pdfCtx,
  `Snapshot SHA-256: ${snapshotSha256 || 'not supplied'}`,
  96,
  310,
  pageWidth - 192,
  34,
  2,
);
pdfCtx.fillText(`Generated: ${generatedAt}`, 96, 395);
pdfCtx.fillText(`Individual maps: ${maps.length}`, 96, 440);
pdfCtx.fillStyle = '#94a3b8';
pdfCtx.font = '24px DejaVu Sans, sans-serif';
wrapText(
  pdfCtx,
  'Every page is derived from one immutable Anvil snapshot. See the team metadata and atlas-index.json for exact bounds, elevations, route sources, and file hashes.',
  96,
  540,
  pageWidth - 192,
  38,
  5,
);

for (const map of maps) {
  pdfCtx.addPage(pageWidth, pageHeight);
  drawMapPage(pdfCtx, map.image, map, pageWidth, pageHeight);
}

fs.writeFileSync(
  path.join(atlasRoot, 'world-atlas.pdf'),
  pdfCanvas.toBuffer('application/pdf', {
    title: 'MC Fleet World Atlas',
    author: 'mc-fleet-bot',
    subject: 'Minecraft world, district, building, and underground maps',
    keywords: 'Minecraft, map, atlas, MainStreet America, Ravensreach, bunker',
    creationDate: new Date(generatedAt),
  }),
);

process.stdout.write(`${JSON.stringify({
  atlasRoot: path.relative(workspaceRoot, atlasRoot),
  maps: maps.length,
  outputs: [
    'README.md',
    'atlas-index.json',
    'world-atlas-contact-sheet.png',
    'world-atlas.pdf',
  ],
}, null, 2)}\n`);
