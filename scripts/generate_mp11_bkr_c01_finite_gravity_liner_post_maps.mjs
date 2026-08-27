#!/usr/bin/env node
/** Render compact immutable-post maps for any accepted C01 finite liner. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const manifestPath = option('--manifest');
const postQaPath = option('--post-qa');
const snapshot = option('--snapshot');
const out = option('--out');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`C01 liner post maps rejected: ${message}`); };

fail(manifestPath && postQaPath && snapshot && out, '--manifest, --post-qa, --snapshot, and --out are required');
fail(!fs.existsSync(abs(out)), '--out must be fresh');
const manifestBytes = fs.readFileSync(abs(manifestPath));
const manifest = JSON.parse(manifestBytes);
const qaBytes = fs.readFileSync(abs(postQaPath));
const qa = JSON.parse(qaBytes);
fail(String(manifest.id).startsWith('MP11-BKR-C01-') && manifest.target?.targetState === 'minecraft:smooth_stone', 'wrong C01 smooth-stone containment manifest');
fail(qa.status === 'POST_RELEASE_QA_PASS', 'post QA is not accepted');
fail(qa.source?.postSnapshot === rel(snapshot), 'post QA snapshot binding drift');
const targets = manifest.target.canonicalPostStates.map(({ cell }) => cell);
fail(targets.length > 0 && targets.length === manifest.target.changedCellCount, 'target count does not match manifest');
const targetKeys = new Set(targets.map(({ x, y, z }) => `${x},${y},${z}`));
const yMin = Math.min(...targets.map((cell) => cell.y)); const yMax = Math.max(...targets.map((cell) => cell.y));
const targetsByColumn = new Map();
for (const target of targets) {
  const key = `${target.x},${target.z}`;
  targetsByColumn.set(key, (targetsByColumn.get(key) ?? 0) + 1);
}
const halo = manifest.interactionSet.fullHaloCells;
const xMin = Math.min(...halo.map((cell) => cell.x)); const xMax = Math.max(...halo.map((cell) => cell.x));
const zMin = Math.min(...halo.map((cell) => cell.z)); const zMax = Math.max(...halo.map((cell) => cell.z));
const cell = 58; const margin = 92; const width = margin * 2 + (xMax - xMin + 1) * cell; const height = 206 + (zMax - zMin + 1) * cell;
const rects = [];
for (let z = zMin; z <= zMax; z += 1) for (let x = xMin; x <= xMax; x += 1) {
  const targetCount = targetsByColumn.get(`${x},${z}`) ?? 0; const target = targetCount > 0;
  const px = margin + (x - xMin) * cell; const py = 134 + (z - zMin) * cell;
  rects.push(`<rect x="${px}" y="${py}" width="${cell - 3}" height="${cell - 3}" rx="4" fill="${target ? '#e9b952' : '#24445c'}" stroke="${target ? '#fff0b7' : '#5d91af'}"/>`);
  if (target) rects.push(`<text x="${px + 27}" y="${py + 34}" text-anchor="middle" class="t">${targetCount > 1 ? targetCount : 'S'}</text>`);
}
const xLabels = Array.from({ length: xMax - xMin + 1 }, (_, index) => `<text x="${margin + index * cell + 27}" y="118" text-anchor="middle" class="a">${xMin + index}</text>`).join('');
const zLabels = Array.from({ length: zMax - zMin + 1 }, (_, index) => `<text x="${margin - 10}" y="${134 + index * cell + 34}" text-anchor="end" class="a">${zMin + index}</text>`).join('');
const plan = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0c1624"/><style>.h{font:700 24px system-ui;fill:#eef7ff}.s{font:14px system-ui;fill:#bdd4e5}.a{font:12px ui-monospace,monospace;fill:#b8d0df}.t{font:700 19px system-ui;fill:#182332}</style><text x="${margin}" y="36" class="h">${manifest.id} — immutable post plan</text><text x="${margin}" y="61" class="s">X/Z projection across Y=${yMin}..${yMax} · gold number = permanent smooth-stone target cells in that column · blue = retained halo projection</text><text x="${margin}" y="84" class="s">${targets.length} target cells and ${halo.length}-cell verified halo; no water/lava/bubble cells, protected core, or block entity is present.</text>${xLabels}${zLabels}${rects.join('')}<rect x="${margin}" y="${height - 49}" width="16" height="16" fill="#e9b952"/><text x="${margin + 25}" y="${height - 36}" class="s">Executed containment column</text><rect x="${margin + 290}" y="${height - 49}" width="16" height="16" fill="#24445c"/><text x="${margin + 315}" y="${height - 36}" class="s">Retained / verified halo</text></svg>`;
const sectionZ = Math.max(...targets.map((cell) => cell.z));
const sectionFileSuffix = sectionZ < 0 ? `z-${Math.abs(sectionZ)}` : `z-plus-${sectionZ}`;
const sectionTargets = new Set(targets.filter((point) => point.z === sectionZ).map(({ x, y }) => `${x},${y}`));
const targetXMin = Math.min(...targets.map((cell) => cell.x)); const targetXMax = Math.max(...targets.map((cell) => cell.x));
const sectionCell = 68; const sectionMargin = 82; const sectionWidth = sectionMargin * 2 + (targetXMax - targetXMin + 1) * sectionCell; const sectionHeight = 178 + (yMax - yMin + 1) * 60;
const section = `<svg xmlns="http://www.w3.org/2000/svg" width="${sectionWidth}" height="${sectionHeight}" viewBox="0 0 ${sectionWidth} ${sectionHeight}"><rect width="100%" height="100%" fill="#0c1624"/><style>.h{font:700 21px system-ui;fill:#eef7ff}.s{font:13px system-ui;fill:#bdd4e5}.a{font:11px ui-monospace,monospace;fill:#b8d0df}.t{font:700 16px system-ui;fill:#182332}</style><text x="${sectionMargin}" y="34" class="h">${manifest.id} — post elevation section</text><text x="${sectionMargin}" y="58" class="s">X/Y at Z=${sectionZ} · gold = permanently stable smooth stone</text>${Array.from({length:yMax-yMin+1},(_,i)=>{const y=yMax-i;const py=90+i*60;return `<text x="${sectionMargin-9}" y="${py+34}" text-anchor="end" class="a">Y=${y}</text><line x1="${sectionMargin}" y1="${py+52}" x2="${sectionWidth-sectionMargin}" y2="${py+52}" stroke="#315168"/>${Array.from({length:targetXMax-targetXMin+1},(_,j)=>{const x=targetXMin+j;const px=sectionMargin+j*sectionCell;const marked=sectionTargets.has(`${x},${y}`);return `<rect x="${px}" y="${py}" width="${sectionCell-4}" height="${sectionCell-8}" rx="4" fill="${marked?'#e9b952':'#24445c'}" stroke="${marked?'#fff0b7':'#5d91af'}"/>${marked?`<text x="${px+(sectionCell-4)/2}" y="${py+34}" text-anchor="middle" class="t">S</text>`:''}`;}).join('')}`;}).join('')}${Array.from({length:targetXMax-targetXMin+1},(_,j)=>`<text x="${sectionMargin+j*sectionCell+(sectionCell-4)/2}" y="${sectionHeight-16}" text-anchor="middle" class="a">${targetXMin+j}</text>`).join('')}<text x="${sectionMargin}" y="${sectionHeight-42}" class="s">Forward order maintains support; the exact inverse restores top-down only while each gravel cell remains stable.</text></svg>`;
fs.mkdirSync(abs(out), { recursive: true });
fs.writeFileSync(path.join(abs(out), 'mp11-bkr-c01-finite-gravity-liner-post-plan.svg'), plan);
const sectionFile = `mp11-bkr-c01-finite-gravity-liner-post-section-${sectionFileSuffix}.svg`;
fs.writeFileSync(path.join(abs(out), sectionFile), section);
const evidence = { id: `${manifest.id}-POST-MAPS`, status: 'POSTSTATE_MAPS_BOUND_TO_ACCEPTED_QA', source: { manifest: rel(manifestPath), manifestSha256: sha(manifestBytes), postQa: rel(postQaPath), postQaSha256: sha(qaBytes), snapshot: rel(snapshot) }, targetCells: targets.length, haloCells: halo.length, mapFiles: ['mp11-bkr-c01-finite-gravity-liner-post-plan.svg', sectionFile], nonClaims: ['Maps document only the exact finite containment liner.', 'They do not depict or authorize a new access route, endpoint, bypass, or public opening.'] };
fs.writeFileSync(path.join(abs(out), 'mp11-bkr-c01-finite-gravity-liner-post-maps-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ status: evidence.status, out: rel(out), targetCells: targets.length, haloCells: halo.length }, null, 2));
