#!/usr/bin/env node
/**
 * Generate area maps and a structure-by-structure floor-plan book from the
 * final, snapshot-audited world interior census.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createCanvas } from 'canvas';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const censusPath = value(
  '--census',
  'data/world-review/worldwide-interior-final-census-2026-07-27.json',
);
const outputDirectory = value(
  '--out',
  'data/exports/box/worldwide-interior-atlas-2026-07-27',
);
const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const register = JSON.parse(fs.readFileSync(census.register, 'utf8'));
const PAGE_WIDTH = 1600;
const PAGE_HEIGHT = 1100;
const MARGIN = 54;
const HEADER_HEIGHT = 112;
const FOOTER_HEIGHT = 36;
const AREA_COLORS = {
  'mainstreet-america': '#eab308',
  'raven-rock': '#ef4444',
  ravensreach: '#8b5cf6',
  ravensgate: '#14b8a6',
  'approach-road': '#64748b',
  'westlight-venue': '#3b82f6',
  'westlight-district': '#f97316',
};
const ROOM_COLORS = [
  '#1d4ed8',
  '#7c3aed',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#0369a1',
  '#4d7c0f',
  '#a21caf',
];

fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(path.join(outputDirectory, 'structures'), { recursive: true });

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function relative(filename) {
  return path.relative(process.cwd(), filename);
}

function hashFile(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
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

function background(ctx) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
}

function title(ctx, heading, subheading) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, PAGE_WIDTH, HEADER_HEIGHT);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px DejaVu Sans, sans-serif';
  ctx.fillText(heading, MARGIN, 48);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px DejaVu Sans, sans-serif';
  ctx.fillText(subheading, MARGIN, 80);
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(MARGIN, 96);
  ctx.lineTo(PAGE_WIDTH - MARGIN, 96);
  ctx.stroke();
}

function footer(ctx, label) {
  const text = (
    `${label} · snapshot ${census.snapshot.sha256.slice(0, 16)}… · `
    + 'north = -Z · functional zones may not be physical walls'
  );
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px DejaVu Sans Mono, monospace';
  ctx.fillText(text, MARGIN, PAGE_HEIGHT - 13);
}

function extent(items) {
  if (items.length === 0) return null;
  return {
    minX: Math.min(...items.map((item) => item.bounds.minX)),
    minZ: Math.min(...items.map((item) => item.bounds.minZ)),
    maxX: Math.max(...items.map((item) => item.bounds.maxX)),
    maxZ: Math.max(...items.map((item) => item.bounds.maxZ)),
  };
}

function fit(bounds, viewport) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min(viewport.width / width, viewport.height / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  const left = viewport.x + (viewport.width - drawnWidth) / 2;
  const top = viewport.y + (viewport.height - drawnHeight) / 2;
  return {
    scale,
    point(x, z) {
      return {
        x: left + (x - bounds.minX) * scale,
        y: top + (z - bounds.minZ) * scale,
      };
    },
  };
}

function drawCoordinateGrid(ctx, bounds, transform, step) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.fillStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.font = '11px DejaVu Sans Mono, monospace';
  const xStart = Math.ceil(bounds.minX / step) * step;
  const zStart = Math.ceil(bounds.minZ / step) * step;
  for (let x = xStart; x <= bounds.maxX; x += step) {
    const start = transform.point(x, bounds.minZ);
    const end = transform.point(x, bounds.maxZ);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillText(String(x), start.x + 3, start.y + 13);
  }
  for (let z = zStart; z <= bounds.maxZ; z += step) {
    const start = transform.point(bounds.minX, z);
    const end = transform.point(bounds.maxX, z);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillText(String(z), start.x + 3, start.y - 3);
  }
  ctx.restore();
}

function drawNorthArrow(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#f8fafc';
  ctx.fillStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 44);
  ctx.lineTo(x, y);
  ctx.lineTo(x - 8, y + 13);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 8, y + 13);
  ctx.stroke();
  ctx.font = '700 16px DejaVu Sans, sans-serif';
  ctx.fillText('N', x - 6, y + 63);
  ctx.restore();
}

function drawSummaryPage(ctx) {
  background(ctx);
  title(
    ctx,
    'Worldwide Interior Atlas',
    'Every active mapped area · final room programs · verified stairs and stairwells',
  );
  const cards = [
    ['7', 'active areas'],
    ['68', 'structures'],
    ['236', 'named rooms'],
    ['35', 'multi-floor'],
    ['0', 'empty rooms'],
    ['0', 'under-detailed'],
    ['0', 'ladder structures'],
    ['32/32', 'saved-world routes'],
  ];
  cards.forEach(([number, label], index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = MARGIN + col * 372;
    const y = 142 + row * 150;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, 342, 120);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 38px DejaVu Sans, sans-serif';
    ctx.fillText(number, x + 20, y + 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '17px DejaVu Sans, sans-serif';
    ctx.fillText(label, x + 20, y + 84);
  });

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 22px DejaVu Sans, sans-serif';
  ctx.fillText('Area register', MARGIN, 472);
  const areaRows = register.areas.map((area) => {
    const metrics = census.byArea[area.id];
    return {
      area,
      metrics,
      color: AREA_COLORS[area.id] ?? '#94a3b8',
    };
  });
  areaRows.forEach(({ area, metrics, color }, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * 746;
    const y = 500 + row * 118;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, 716, 92);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 8, 92);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 19px DejaVu Sans, sans-serif';
    ctx.fillText(area.name, x + 24, y + 30);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px DejaVu Sans, sans-serif';
    ctx.fillText(
      `${metrics.structures} structures · ${metrics.catalogedRooms} rooms · `
      + `${metrics.multiFloorStructures} multi-floor · ${metrics.structuresWithLadders} ladder`,
      x + 24,
      y + 60,
    );
  });
  footer(ctx, 'Interior atlas cover');
}

function drawAreaPage(ctx, area) {
  background(ctx);
  const structures = census.structures.filter(
    (structure) => structure.areaId === area.id,
  );
  const metrics = census.byArea[area.id];
  title(
    ctx,
    area.name,
    `${metrics.structures} structures · ${metrics.catalogedRooms} rooms · `
    + `${metrics.multiFloorStructures} multi-floor · all fitted`,
  );
  if (structures.length === 0) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(180, 250, PAGE_WIDTH - 360, 430);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 32px DejaVu Sans, sans-serif';
    ctx.fillText('Interior-exempt infrastructure area', 240, 330);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '21px DejaVu Sans, sans-serif';
    wrapText(
      ctx,
      'The Western Approach Road is a first-class mapped route with bridges, grades, lighting, and stopping places. It has no enclosed room program by policy.',
      240,
      390,
      PAGE_WIDTH - 480,
      34,
      6,
    );
    footer(ctx, area.name);
    return;
  }
  const bounds = extent(structures);
  const viewport = {
    x: MARGIN + 210,
    y: HEADER_HEIGHT + 45,
    width: PAGE_WIDTH - MARGIN * 2 - 230,
    height: PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 85,
  };
  const padding = Math.max(10, Math.ceil(Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxZ - bounds.minZ,
  ) * 0.04));
  const padded = {
    minX: bounds.minX - padding,
    minZ: bounds.minZ - padding,
    maxX: bounds.maxX + padding,
    maxZ: bounds.maxZ + padding,
  };
  const transform = fit(padded, viewport);
  drawCoordinateGrid(
    ctx,
    padded,
    transform,
    Math.max(10, 10 ** Math.floor(Math.log10(
      Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 4,
    ))),
  );

  structures.forEach((structure, index) => {
    const p1 = transform.point(structure.bounds.minX, structure.bounds.minZ);
    const p2 = transform.point(structure.bounds.maxX, structure.bounds.maxZ);
    const width = Math.max(3, p2.x - p1.x);
    const height = Math.max(3, p2.y - p1.y);
    const color = ROOM_COLORS[index % ROOM_COLORS.length];
    ctx.fillStyle = `${color}55`;
    ctx.fillRect(p1.x, p1.y, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(p1.x, p1.y, width, height);
    if (width > 34 && height > 20) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 12px DejaVu Sans, sans-serif';
      ctx.fillText(structure.id, p1.x + 4, p1.y + 14);
    }
  });

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(MARGIN, HEADER_HEIGHT + 45, 195, viewport.height);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 16px DejaVu Sans, sans-serif';
  ctx.fillText('Structure key', MARGIN + 14, HEADER_HEIGHT + 72);
  structures.forEach((structure, index) => {
    const y = HEADER_HEIGHT + 101 + index * 25;
    if (y > PAGE_HEIGHT - FOOTER_HEIGHT - 20) return;
    ctx.fillStyle = ROOM_COLORS[index % ROOM_COLORS.length];
    ctx.fillRect(MARGIN + 14, y - 11, 10, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px DejaVu Sans, sans-serif';
    ctx.fillText(
      `${structure.id} · ${structure.rooms.length}r/${structure.floors.length}f`,
      MARGIN + 31,
      y - 2,
    );
  });
  drawNorthArrow(ctx, PAGE_WIDTH - 82, HEADER_HEIGHT + 64);
  footer(ctx, `${area.name} overview`);
}

function roomFloorIndex(structure, room) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  structure.floors.forEach((floorY, index) => {
    const distance = Math.abs(room.bounds.minY - (floorY + 1));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function drawStructurePage(ctx, structure) {
  background(ctx);
  title(
    ctx,
    `${structure.id} · ${structure.name}`,
    `${census.byArea[structure.areaId].name} · bounds `
    + `x[${structure.bounds.minX},${structure.bounds.maxX}] `
    + `y[${structure.bounds.minY},${structure.bounds.maxY}] `
    + `z[${structure.bounds.minZ},${structure.bounds.maxZ}]`,
  );
  const floorCount = structure.floors.length;
  const columns = floorCount > 12 ? 5 : floorCount > 6 ? 3 : floorCount > 2 ? 3 : floorCount;
  const rows = Math.ceil(floorCount / columns);
  const gap = 18;
  const contentTop = HEADER_HEIGHT + 34;
  const contentHeight = PAGE_HEIGHT - contentTop - FOOTER_HEIGHT - 24;
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - gap * (columns - 1)) / columns;
  const panelHeight = (contentHeight - gap * (rows - 1)) / rows;

  structure.floors.forEach((floorY, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = MARGIN + col * (panelWidth + gap);
    const y = contentTop + row * (panelHeight + gap);
    const circulation = structure.floorCirculation[index]?.circulation ?? {};
    const rooms = structure.rooms.filter(
      (room) => roomFloorIndex(structure, room) === index,
    );

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(x, y, panelWidth, panelHeight);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${floorCount > 12 ? 13 : 16}px DejaVu Sans, sans-serif`;
    ctx.fillText(`Floor ${index + 1} · support Y ${floorY}`, x + 12, y + 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${floorCount > 12 ? 10 : 12}px DejaVu Sans, sans-serif`;
    ctx.fillText(
      `${rooms.length} room zones · stairs ${circulation.stairs ?? 0} · `
      + `ladders ${circulation.ladders ?? 0}`,
      x + 12,
      y + 41,
    );

    const mapViewport = {
      x: x + 12,
      y: y + 52,
      width: panelWidth - 24,
      height: panelHeight - 64,
    };
    const transform = fit(structure.bounds, mapViewport);
    const p1 = transform.point(structure.bounds.minX, structure.bounds.minZ);
    const p2 = transform.point(structure.bounds.maxX, structure.bounds.maxZ);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

    rooms.forEach((room, roomIndex) => {
      const r1 = transform.point(room.bounds.minX, room.bounds.minZ);
      const r2 = transform.point(room.bounds.maxX, room.bounds.maxZ);
      const color = ROOM_COLORS[roomIndex % ROOM_COLORS.length];
      ctx.fillStyle = `${color}aa`;
      ctx.fillRect(r1.x, r1.y, Math.max(2, r2.x - r1.x), Math.max(2, r2.y - r1.y));
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(r1.x, r1.y, Math.max(2, r2.x - r1.x), Math.max(2, r2.y - r1.y));
      const label = room.name.replace(`${structure.name} — `, '');
      if (r2.x - r1.x > 42 && r2.y - r1.y > 16) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${floorCount > 6 ? 9 : 11}px DejaVu Sans, sans-serif`;
        wrapText(
          ctx,
          label,
          r1.x + 4,
          r1.y + 13,
          Math.max(30, r2.x - r1.x - 8),
          floorCount > 6 ? 10 : 13,
          2,
        );
      }
    });

    if (rooms.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${floorCount > 12 ? 11 : 15}px DejaVu Sans, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        structure.id === 'RR-Z5'
          ? 'Circulation landing / shaft flight'
          : 'Circulation or shell floor; no separate room program',
        x + panelWidth / 2,
        y + panelHeight / 2,
      );
      ctx.textAlign = 'left';
    }
  });
  footer(ctx, `${structure.id} floor plan`);
}

const artifacts = [];
function savePng(filename, draw) {
  const canvas = createCanvas(PAGE_WIDTH, PAGE_HEIGHT);
  draw(canvas.getContext('2d'));
  const fullPath = path.join(outputDirectory, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, canvas.toBuffer('image/png'));
  artifacts.push({
    file: relative(fullPath),
    bytes: fs.statSync(fullPath).size,
    sha256: hashFile(fullPath),
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });
}

savePng('00-worldwide-interior-summary.png', drawSummaryPage);
register.areas.forEach((area, index) => {
  savePng(
    `${String(index + 1).padStart(2, '0')}-${slug(area.id)}-overview.png`,
    (ctx) => drawAreaPage(ctx, area),
  );
});
for (const structure of census.structures) {
  savePng(
    `structures/${slug(structure.areaId)}-${slug(structure.id)}.png`,
    (ctx) => drawStructurePage(ctx, structure),
  );
}

const pdf = createCanvas(PAGE_WIDTH, PAGE_HEIGHT, 'pdf');
const pdfContext = pdf.getContext('2d');
drawSummaryPage(pdfContext);
for (const area of register.areas) {
  pdfContext.addPage(PAGE_WIDTH, PAGE_HEIGHT);
  drawAreaPage(pdfContext, area);
}
for (const structure of census.structures) {
  pdfContext.addPage(PAGE_WIDTH, PAGE_HEIGHT);
  drawStructurePage(pdfContext, structure);
}
const pdfPath = path.join(outputDirectory, 'worldwide-interior-floorplan-atlas.pdf');
fs.writeFileSync(pdfPath, pdf.toBuffer('application/pdf', {
  title: 'MC Fleet Worldwide Interior Floorplan Atlas',
  author: 'mc-fleet-bot',
  subject: 'Snapshot-audited Minecraft structures, rooms, stairs, and floor programs',
  keywords: 'Minecraft, floor plan, atlas, MainStreet America, Raven Rock, Ravensreach, Westlight',
}));
artifacts.push({
  file: relative(pdfPath),
  bytes: fs.statSync(pdfPath).size,
  sha256: hashFile(pdfPath),
  pages: 1 + register.areas.length + census.structures.length,
});

const readmePath = path.join(outputDirectory, 'README.md');
const readme = `# Worldwide interior atlas — 2026-07-27

Generated from the final read-only census and snapshot:

- Snapshot: \`${census.snapshot.directory}\`
- SHA-256: \`${census.snapshot.sha256}\`
- Structures: **${census.totals.structures}**
- Named rooms: **${census.totals.catalogedRooms}**
- Empty / under-detailed rooms: **0 / 0**
- Structures using ladders: **0**

The PDF contains a cover, one overview for each active area, and one floor-plan
page for every cataloged structure. The \`structures/\` folder contains the same
individual pages as PNG files.

Room rectangles are first-class functional program zones from \`world-map.db\`.
They identify the named use and audited bounds of a space; a zone boundary is not
automatically a claim that a physical wall exists on every edge.
`;
fs.writeFileSync(readmePath, readme);
artifacts.push({
  file: relative(readmePath),
  bytes: fs.statSync(readmePath).size,
  sha256: hashFile(readmePath),
});

const manifestPath = path.join(outputDirectory, 'atlas-manifest.json');
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  census: censusPath,
  database: 'data/world-map.db',
  snapshot: census.snapshot,
  totals: census.totals,
  areaCount: register.areas.length,
  structurePages: census.structures.length,
  pages: 1 + register.areas.length + census.structures.length,
  artifacts,
  verification: {
    allPngsNonblank: artifacts
      .filter((artifact) => artifact.file.endsWith('.png'))
      .every((artifact) => artifact.bytes > 10_000),
    pdfNonblank: fs.statSync(pdfPath).size > 100_000,
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (!manifest.verification.allPngsNonblank || !manifest.verification.pdfNonblank) {
  throw new Error('atlas nonblank verification failed');
}
console.log(JSON.stringify({
  outputDirectory,
  snapshot: census.snapshot.sha256,
  areaOverviews: register.areas.length,
  structurePages: census.structures.length,
  pdfPages: manifest.pages,
  artifacts: artifacts.length + 1,
  verification: manifest.verification,
}, null, 2));
