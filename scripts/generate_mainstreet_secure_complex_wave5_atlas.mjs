#!/usr/bin/env node
/**
 * Five-page as-built atlas for MainStreet secure-complex Wave 5.
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
const outputDirectory = value(
  '--out',
  'data/exports/box/mainstreet-secure-complex-wave5-2026-07-27',
);
const qaPath = value(
  '--qa',
  'data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json',
);
const importPath = value(
  '--database-import',
  'data/world-review/mainstreet-secure-complex-wave5-database-import-2026-07-27.json',
);
const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
const databaseImport = JSON.parse(fs.readFileSync(importPath, 'utf8'));
const snapshotHash = databaseImport.snapshotRef.match(/sha256=([a-f0-9]+)/)?.[1] ?? 'unknown';
const W = 1600;
const H = 1100;
const M = 54;
const HEADER = 112;
const FOOTER = 38;
const COLORS = {
  background: '#0f172a',
  panel: '#172033',
  line: '#64748b',
  text: '#f8fafc',
  muted: '#94a3b8',
  c01: '#f59e0b',
  obs: '#22d3ee',
  apt: '#c084fc',
  shelter: '#10b981',
  vault: '#facc15',
  route: '#ef4444',
};

fs.mkdirSync(outputDirectory, { recursive: true });

const rect = (id, label, minX, minZ, maxX, maxZ, color, extra = {}) => ({
  id,
  label,
  minX,
  minZ,
  maxX,
  maxZ,
  color,
  ...extra,
});

function background(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
}

function header(ctx, title, subtitle) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, W, HEADER);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 34px DejaVu Sans, sans-serif';
  ctx.fillText(title, M, 48);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '17px DejaVu Sans, sans-serif';
  ctx.fillText(subtitle, M, 80);
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(M, 97);
  ctx.lineTo(W - M, 97);
  ctx.stroke();
}

function footer(ctx, page) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, H - FOOTER, W, FOOTER);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '13px DejaVu Sans Mono, monospace';
  ctx.fillText(
    `page ${page}/5 · post-Wave-5 snapshot ${snapshotHash.slice(0, 16)}… · north = -Z · DB scan ${databaseImport.scanId}`,
    M,
    H - 14,
  );
}

function wrap(ctx, text, x, y, width, lineHeight, maxLines = 5) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > width) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines += 1;
      if (lines >= maxLines) return y;
    } else {
      line = candidate;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function fit(bounds, viewport) {
  const scale = Math.min(
    viewport.width / Math.max(1, bounds.maxX - bounds.minX),
    viewport.height / Math.max(1, bounds.maxZ - bounds.minZ),
  );
  const width = (bounds.maxX - bounds.minX) * scale;
  const height = (bounds.maxZ - bounds.minZ) * scale;
  const ox = viewport.x + (viewport.width - width) / 2;
  const oy = viewport.y + (viewport.height - height) / 2;
  return {
    scale,
    point(x, z) {
      return {
        x: ox + (x - bounds.minX) * scale,
        y: oy + (z - bounds.minZ) * scale,
      };
    },
  };
}

function drawGrid(ctx, bounds, transform, step = 10) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.16)';
  ctx.fillStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.font = '10px DejaVu Sans Mono, monospace';
  for (let x = Math.ceil(bounds.minX / step) * step; x <= bounds.maxX; x += step) {
    const a = transform.point(x, bounds.minZ);
    const b = transform.point(x, bounds.maxZ);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillText(String(x), a.x + 2, a.y + 11);
  }
  for (let z = Math.ceil(bounds.minZ / step) * step; z <= bounds.maxZ; z += step) {
    const a = transform.point(bounds.minX, z);
    const b = transform.point(bounds.maxX, z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillText(String(z), a.x + 2, a.y - 3);
  }
  ctx.restore();
}

function drawPlan(ctx, bounds, viewport, features, options = {}) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  const transform = fit(bounds, {
    x: viewport.x + 20,
    y: viewport.y + 20,
    width: viewport.width - 40,
    height: viewport.height - 40,
  });
  drawGrid(ctx, bounds, transform, options.grid ?? 10);
  for (const feature of features) {
    const a = transform.point(feature.minX, feature.minZ);
    const b = transform.point(feature.maxX, feature.maxZ);
    ctx.fillStyle = `${feature.color}55`;
    ctx.strokeStyle = feature.color;
    ctx.lineWidth = feature.thick ? 4 : 2;
    if (!feature.outlineOnly) {
      ctx.fillRect(a.x, a.y, Math.max(2, b.x - a.x), Math.max(2, b.y - a.y));
    }
    if (feature.outlineOnly) ctx.setLineDash([8, 5]);
    ctx.strokeRect(a.x, a.y, Math.max(2, b.x - a.x), Math.max(2, b.y - a.y));
    ctx.setLineDash([]);
    if (!feature.hideLabel) {
      ctx.fillStyle = COLORS.text;
      ctx.font = feature.small
        ? '10px DejaVu Sans, sans-serif'
        : '700 13px DejaVu Sans, sans-serif';
      const label = `${feature.id}\n${feature.label}`.split('\n');
      let labelY = a.y + 15;
      for (const line of label) {
        ctx.fillText(line, a.x + 5, labelY);
        labelY += feature.small ? 11 : 15;
      }
    }
  }
  if (options.routes) {
    for (const routeEntry of options.routes) {
      ctx.strokeStyle = routeEntry.color ?? COLORS.route;
      ctx.lineWidth = routeEntry.width ?? 5;
      ctx.setLineDash(routeEntry.dash ?? [10, 7]);
      ctx.beginPath();
      routeEntry.points.forEach(([x, z], index) => {
        const p = transform.point(x, z);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  return transform;
}

function panelTitle(ctx, text, x, y) {
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 20px DejaVu Sans, sans-serif';
  ctx.fillText(text, x, y);
}

function drawSummary(ctx) {
  background(ctx);
  header(
    ctx,
    'MainStreet secure complex · as-built Wave 5',
    'Parking-side C01 bunker · working observatory · concealed penthouse · shelter · three-level vault',
  );
  const left = { x: M, y: 145, width: 960, height: 850 };
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(left.x, left.y, left.width, left.height);
  const levels = [
    { y: 44, h: 11, label: 'VLT-G01 LOWER · bullion / mint / disaster reserve', color: COLORS.vault },
    { y: 55, h: 11, label: 'VLT-G01 MIDDLE · artifacts / appraisal / armory', color: COLORS.vault },
    { y: 66, h: 11, label: 'VLT-G01 UPPER · access / ledgers / viewing salon', color: COLORS.vault },
    { y: 81, h: 11, label: 'SHL-S01 · inhabited fallout shelter / comms / treasury', color: COLORS.shelter },
    { y: 50, h: 11, label: 'C01 LOWER · sealed theater / conferences / operations', color: COLORS.c01 },
    { y: 62, h: 14, label: 'C01 UPPER · aircraft hangar / response arena / lobby', color: COLORS.c01 },
    { y: 98, h: 17, label: 'SURFACE HANGAR · office / posh hidden penthouse', color: COLORS.apt },
    { y: 120, h: 17, label: 'OBS-S01 · 8-room working observatory / 3 apertures', color: COLORS.obs },
  ].sort((a, b) => b.y - a.y);
  const minY = 44;
  const maxY = 137;
  for (const level of levels) {
    const top = left.y + 40 + (maxY - (level.y + level.h)) / (maxY - minY) * 740;
    const height = Math.max(25, level.h / (maxY - minY) * 740);
    ctx.fillStyle = `${level.color}55`;
    ctx.strokeStyle = level.color;
    ctx.lineWidth = 2;
    ctx.fillRect(left.x + 90, top, 730, height);
    ctx.strokeRect(left.x + 90, top, 730, height);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 15px DejaVu Sans, sans-serif';
    ctx.fillText(level.label, left.x + 105, top + 20);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px DejaVu Sans Mono, monospace';
    ctx.fillText(`Y ${level.y}–${level.y + level.h}`, left.x + 835, top + 20);
  }
  ctx.strokeStyle = COLORS.route;
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(left.x + 70, left.y + 820);
  ctx.lineTo(left.x + 70, left.y + 90);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.route;
  ctx.font = '700 13px DejaVu Sans, sans-serif';
  ctx.fillText('PRIMARY STAIR / SECURE ROUTES', left.x + 18, left.y + 45);

  const rightX = 1050;
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 24px DejaVu Sans, sans-serif';
  ctx.fillText('Verified outcome', rightX, 170);
  const metrics = [
    ['21 / 21', 'saved-world QA checks'],
    ['2,075', 'exact guarded operations'],
    ['28,180', 'changed world cells'],
    ['41', 'first-class DB observations'],
    ['3', 'working dome lenses'],
    ['12 / 12', 'loaded treasury chests preserved'],
  ];
  let y = 215;
  for (const [number, label] of metrics) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(rightX, y, 470, 82);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 28px DejaVu Sans, sans-serif';
    ctx.fillText(number, rightX + 18, y + 35);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '15px DejaVu Sans, sans-serif';
    ctx.fillText(label, rightX + 18, y + 62);
    y += 96;
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 19px DejaVu Sans, sans-serif';
  ctx.fillText('Coordinate anchors', rightX, 815);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px DejaVu Sans Mono, monospace';
  const anchors = [
    'C01 entry       116 65 172',
    'primary stair  204..216 / Y50..110',
    'observatory    184..228 / Y121..136',
    'penthouse      178..225 / Y105..114',
    'shelter        148..188 / Y81..91',
    'grand vault    230..262 / Y44..76',
  ];
  anchors.forEach((line, index) => ctx.fillText(line, rightX, 850 + index * 25));
  footer(ctx, 1);
}

function drawC01Upper(ctx) {
  background(ctx);
  header(ctx, 'C01 upper complex', 'Parking-side arrival, underground aviation hangar, response arena, theater, and primary stair');
  panelTitle(ctx, 'Upper floor plan · support Y62 / feet Y63', M, 145);
  const features = [
    rect('C01-LOBBY', 'arrival / security', 109, 153, 138, 181, COLORS.c01),
    rect('C01-UPPER-HANGAR', 'aviation hall', 109, 83, 188, 142, '#3b82f6'),
    rect('AIRCRAFT-A', 'utility aircraft', 138, 88, 160, 104, '#e2e8f0', { small: true }),
    rect('ROTORCRAFT-B', 'rotorcraft', 118, 109, 139, 127, '#a78bfa', { small: true }),
    rect('RESCUE-VEHICLE', 'response truck', 156, 122, 172, 133, '#ef4444', { small: true }),
    rect('C01-UPPER-ARENA', 'incident response', 202, 83, 248, 132, '#10b981'),
    rect('RESPONSE-COURSE', 'obstacle / rescue', 211, 85, 245, 124, '#34d399', { small: true }),
    rect('MEDICAL-DECON', 'triage / decon', 233, 116, 245, 129, '#22d3ee', { small: true }),
    rect('C01-UPPER-THEATER', 'briefing theater', 149, 153, 178, 173, '#f97316'),
    rect('PRIMARY-STAIR', 'Y50 → Y110', 204, 152, 216, 164, COLORS.route, { thick: true }),
  ];
  drawPlan(
    ctx,
    { minX: 100, minZ: 75, maxX: 255, maxZ: 190 },
    { x: M, y: 165, width: W - M * 2, height: 825 },
    features,
    {
      grid: 10,
      routes: [
        { points: [[122, 172], [124, 143], [150, 110], [225, 110]], color: COLORS.route, width: 6 },
        { points: [[145, 98], [176, 126]], color: '#f8fafc', width: 3, dash: [4, 6] },
      ],
    },
  );
  footer(ctx, 2);
}

function drawC01Lower(ctx) {
  background(ctx);
  header(ctx, 'C01 lower operations', 'Repaired enclosures, purpose-specific rooms, and direct connection to the new primary stair');
  panelTitle(ctx, 'Lower floor plan · support Y50 / feet Y51', M, 145);
  const features = [
    rect('ARCHIVE', 'rolling stacks / review', 141, 103, 153, 132, '#3b82f6'),
    rect('BUNK', 'staff bunks', 169, 103, 176, 120, '#10b981'),
    rect('RECORDS', 'secure records', 179, 103, 186, 120, '#14b8a6'),
    rect('COMMS', 'radio / status', 189, 103, 196, 120, '#22d3ee'),
    rect('STORES', 'rack aisles / receiving', 209, 103, 228, 122, '#f59e0b'),
    rect('FABRICATION', 'machine / assembly', 239, 103, 263, 122, '#f97316'),
    rect('THEATER', 'sealed briefing theater', 140, 173, 158, 190, '#ef4444'),
    rect('CONF-A', 'incident planning', 169, 173, 180, 190, '#60a5fa'),
    rect('CONF-B', 'secure video', 189, 173, 200, 190, '#22d3ee'),
    rect('CONF-C', 'continuity room', 209, 173, 220, 190, '#c084fc'),
    rect('PRIMARY-STAIR', 'up to all levels', 204, 152, 216, 164, COLORS.route, { thick: true }),
  ];
  drawPlan(
    ctx,
    { minX: 130, minZ: 95, maxX: 270, maxZ: 200 },
    { x: M, y: 165, width: W - M * 2, height: 825 },
    features,
    {
      grid: 10,
      routes: [
        { points: [[141, 126], [263, 126]], color: '#f8fafc', width: 5 },
        { points: [[199, 126], [199, 171]], color: '#f8fafc', width: 5 },
        { points: [[140, 170], [220, 170]], color: COLORS.route, width: 5 },
      ],
    },
  );
  footer(ctx, 3);
}

function drawObservatoryPenthouse(ctx) {
  background(ctx);
  header(ctx, 'Observatory and concealed penthouse', 'Public science program above; separate private residence and secret stair below');
  panelTitle(ctx, 'OBS-S01 · floor Y120 / rooms Y121+', M, 145);
  const obsFeatures = [
    rect('WEST-OPTICS', 'workshop', 185, 137, 196, 143, '#3b82f6', { small: true }),
    rect('WEST-DOME', 'visual refractor', 185, 144, 196, 158, COLORS.obs),
    rect('WEST-LOG', 'observation log', 185, 159, 196, 165, '#3b82f6', { small: true }),
    rect('ARCHIVE', 'instrument research', 197, 137, 215, 145, '#14b8a6'),
    rect('PLANETARIUM', 'projector / seating', 197, 146, 215, 156, '#8b5cf6'),
    rect('FOYER', 'reception / exhibits', 197, 157, 215, 165, '#f59e0b'),
    rect('EAST-LAB', 'instrument lab', 216, 137, 227, 149, '#10b981', { small: true }),
    rect('EAST-DOME', 'solar / photo scope', 216, 150, 227, 158, COLORS.obs),
    rect('EAST-CONTROL', 'photo control', 216, 159, 227, 165, '#10b981', { small: true }),
    rect('PUBLIC-STAIR', 'hangar ↔ terrace', 164, 151, 175, 166, COLORS.route, { thick: true }),
    rect('PRIVATE STAIR', 'concealed', 218, 139, 225, 149, COLORS.apt, { thick: true, small: true, outlineOnly: true }),
  ];
  const transform = drawPlan(
    ctx,
    { minX: 160, minZ: 134, maxX: 232, maxZ: 170 },
    { x: M, y: 165, width: 930, height: 385 },
    obsFeatures,
    { grid: 5 },
  );
  for (const [x, z, label] of [[190, 145, 'W LENS'], [206, 143, 'CENTER LENS'], [222, 145, 'E LENS']]) {
    const p = transform.point(x, z);
    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    void label;
  }

  panelTitle(ctx, 'APT-S01 · one-bedroom private floor Y105', M, 590);
  const aptFeatures = [
    rect('LIB-S01', 'paneled library salon', 179, 139, 194, 150, '#8b5cf6'),
    rect('CMD-S01', '12-monitor command', 194, 139, 207, 150, '#3b82f6'),
    rect('DRESSING', 'lounge / wardrobe', 179, 150, 190, 162, '#a78bfa'),
    rect('SAFE-S01', 'safe suite', 208, 139, 217, 147, '#64748b', { small: true }),
    rect('VESTIBULE', 'entry', 208, 147, 217, 151, '#94a3b8', { small: true }),
    rect('PRIVATE STAIR', 'concealed', 218, 139, 225, 149, COLORS.apt, { thick: true, small: true, outlineOnly: true }),
    rect('BEDROOM', 'actual double bed', 217, 152, 225, 166, '#ec4899'),
    rect('BATH-S01', 'glass / marble spa', 178, 163, 207, 180, '#22d3ee'),
    rect('SALON', 'music / lounge', 208, 167, 217, 180, '#c084fc', { small: true }),
    rect('KITCHEN', 'dining', 218, 167, 225, 180, '#f59e0b', { small: true }),
  ];
  drawPlan(
    ctx,
    { minX: 175, minZ: 136, maxX: 228, maxZ: 183 },
    { x: M, y: 610, width: 930, height: 385 },
    aptFeatures,
    { grid: 5 },
  );

  const rightX = 1030;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(rightX, 165, 515, 830);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 21px DejaVu Sans, sans-serif';
  ctx.fillText('Circulation rules', rightX + 24, 205);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '15px DejaVu Sans, sans-serif';
  let y = 245;
  for (const text of [
    'Public stair: hangar → roof terrace → observatory. Two-wide, enclosed, bidirectional.',
    'Private stair: east instrument lab → concealed door → secure penthouse vestibule.',
    'The dispatch office stays public and is excluded from the private room sequence.',
    'Former 22-block observatory scaffold is fully retired (0 blocks remain).',
    'All three Y126 roof discs are open around their telescope axes and retain bearing rings.',
    'The penthouse is a separate residence: library, command room, dressing lounge, real bedroom, living salon, dining kitchen, spa, vestibule, and safe room.',
  ]) {
    y = wrap(ctx, `• ${text}`, rightX + 24, y, 465, 23, 5) + 12;
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 18px DejaVu Sans, sans-serif';
  ctx.fillText('Lens coordinates', rightX + 24, y + 15);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px DejaVu Sans Mono, monospace';
  ['west    190 130 145', 'central 206 132 143', 'east    222 130 145']
    .forEach((line, index) => ctx.fillText(line, rightX + 24, y + 48 + index * 25));
  footer(ctx, 4);
}

function drawShelterVault(ctx) {
  background(ctx);
  header(ctx, 'Shelter and three-level grand vault', 'Inhabitable emergency program, repaired treasury access, fall-safe galleries, and preserved inventories');
  panelTitle(ctx, 'SHL-S01 · support Y81', M, 145);
  const shelterFeatures = [
    rect('DORM', '6 shelter beds + clinic', 149, 144, 157, 163, '#10b981'),
    rect('GALLEY', 'kitchen / commons', 158, 144, 165, 163, '#f59e0b'),
    rect('SAFE-U01', 'crisis / supplies', 167, 144, 187, 163, '#64748b'),
    rect('VLT-S01', 'armory / rare reserve', 149, 164, 168, 179, COLORS.vault),
    rect('COM-S01', 'radio / crypto / dispatch', 167, 164, 187, 179, COLORS.obs),
    rect('DECON', 'dry sanitation', 183, 156, 187, 159, '#22d3ee', { small: true }),
  ];
  drawPlan(
    ctx,
    { minX: 146, minZ: 141, maxX: 191, maxZ: 182 },
    { x: M, y: 165, width: 650, height: 350 },
    shelterFeatures,
    {
      grid: 5,
      routes: [{ points: [[188, 156], [166, 156], [166, 171], [151, 171]], color: COLORS.route, width: 5 }],
    },
  );

  const levels = [
    {
      title: 'UPPER Y66',
      color: '#fde047',
      features: [
        rect('ACCESS', 'security / keys', 232, 187, 240, 193, '#64748b', { small: true }),
        rect('LEDGERS', 'archive', 251, 187, 260, 193, '#3b82f6', { small: true }),
        rect('SALON', 'viewing', 241, 219, 251, 223, '#c084fc', { small: true }),
      ],
    },
    {
      title: 'MIDDLE Y55',
      color: '#facc15',
      features: [
        rect('ARCHIVE', 'artifacts / records', 232, 188, 260, 193, '#3b82f6', { small: true }),
        rect('APPRAISAL', 'restoration', 241, 194, 251, 198, '#10b981', { small: true }),
        rect('ARMORY', 'secure lockers', 232, 205, 260, 215, '#64748b', { small: true }),
      ],
    },
    {
      title: 'LOWER Y44',
      color: '#eab308',
      features: [
        rect('BULLION', 'gold / raw gold', 232, 188, 260, 196, '#f59e0b', { small: true }),
        rect('PLINTH', 'prized reserve', 241, 199, 251, 211, '#22d3ee', { small: true }),
        rect('MINT', 'inspection', 240, 214, 252, 217, '#10b981', { small: true }),
      ],
    },
  ];
  levels.forEach((level, index) => {
    const x = 745 + index * 270;
    panelTitle(ctx, level.title, x, 145);
    drawPlan(
      ctx,
      { minX: 230, minZ: 184, maxX: 262, maxZ: 226 },
      { x, y: 165, width: 245, height: 350 },
      level.features,
      { grid: 10 },
    );
  });

  const infoY = 560;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(M, infoY, W - M * 2, 430);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 22px DejaVu Sans, sans-serif';
  ctx.fillText('As-built protection and QA', M + 25, infoY + 40);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '16px DejaVu Sans, sans-serif';
  const facts = [
    'Safe-room iron bulkhead restored with a two-wide door at x208, z145..146.',
    'Shelter treasury grade transitions repaired; safe ↔ communications ↔ treasury passes both ways.',
    'Six shelter dormitory beds plus one clinic bed are real Minecraft bed pairs, not carpet platforms.',
    'Upper and middle atrium edges carry collision balustrades; ceremonial stairs remain five blocks wide.',
    'Three shelter NBT chests and nine grand-vault NBT chests remain at their original coordinates.',
    'Shelter and vault remain dry; reinforced crowns and natural cover are untouched.',
  ];
  let y = infoY + 78;
  facts.forEach((fact) => {
    y = wrap(ctx, `• ${fact}`, M + 25, y, 900, 25, 3) + 10;
  });
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 18px DejaVu Sans, sans-serif';
  ctx.fillText('Loaded chest rows', 1050, infoY + 45);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px DejaVu Sans Mono, monospace';
  [
    'shelter y82: x150,154,158 z178',
    'lower   y45: x233,238,255 z220',
    'middle  y56: x233,238,255 z220',
    'upper   y67: x233,238,255 z220',
  ].forEach((line, index) => ctx.fillText(line, 1050, infoY + 82 + index * 28));
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 18px DejaVu Sans, sans-serif';
  ctx.fillText('QA', 1050, infoY + 220);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '15px DejaVu Sans, sans-serif';
  wrap(ctx, `${qa.passed}/${qa.total} saved-world checks pass. The route suite explicitly walks both directions through the penthouse, shelter, vault connector, upper gallery, Titanic stair, middle gallery, and lower landing.`, 1050, infoY + 250, 450, 24, 6);
  footer(ctx, 5);
}

const pages = [
  ['00-secure-complex-summary.png', drawSummary],
  ['01-c01-upper-plan.png', drawC01Upper],
  ['02-c01-lower-plan.png', drawC01Lower],
  ['03-observatory-penthouse-plans.png', drawObservatoryPenthouse],
  ['04-shelter-vault-levels.png', drawShelterVault],
];

for (const [filename, draw] of pages) {
  const canvas = createCanvas(W, H);
  draw(canvas.getContext('2d'));
  fs.writeFileSync(path.join(outputDirectory, filename), canvas.toBuffer('image/png'));
}

const pdf = createCanvas(W, H, 'pdf');
const pdfContext = pdf.getContext('2d');
pages.forEach(([, draw], index) => {
  if (index > 0) pdfContext.addPage(W, H);
  draw(pdfContext);
});
const pdfPath = path.join(outputDirectory, 'mainstreet-secure-complex-wave5-atlas-2026-07-27.pdf');
fs.writeFileSync(pdfPath, pdf.toBuffer('application/pdf', {
  title: 'MainStreet secure complex Wave 5 atlas',
  author: 'mc-fleet-bot world mapping',
  subject: 'As-built C01, observatory, penthouse, shelter, and grand vault',
  keywords: 'Minecraft MainStreet C01 observatory penthouse shelter vault atlas',
}));

const artifacts = [...pages.map(([filename]) => filename), path.basename(pdfPath)];
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  snapshotRef: databaseImport.snapshotRef,
  databaseScanId: databaseImport.scanId,
  qa: { path: qaPath, passed: qa.passed, total: qa.total },
  artifacts: artifacts.map((filename) => {
    const fullPath = path.join(outputDirectory, filename);
    return {
      filename,
      bytes: fs.statSync(fullPath).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex'),
    };
  }),
};
fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(outputDirectory, 'README.md'),
  `# MainStreet secure complex Wave 5 atlas

Generated from the immutable post-build snapshot:

\`${databaseImport.snapshotRef}\`

All ${qa.total} saved-world QA checks pass. The maps use first-class external IDs
promoted by database scan \`${databaseImport.scanId}\`.

The PDF contains five pages: program section, C01 upper, C01 lower,
observatory/penthouse, and shelter/vault levels.
`,
);
console.log(JSON.stringify({
  outputDirectory,
  pngPages: pages.length,
  pdf: pdfPath,
  artifacts: artifacts.length + 2,
  snapshot: databaseImport.snapshotRef,
  qa: `${qa.passed}/${qa.total}`,
}, null, 2));
