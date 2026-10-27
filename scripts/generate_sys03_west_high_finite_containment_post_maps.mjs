#!/usr/bin/env node
/** Read-only post-snapshot maps for the executed finite West High containment. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const argv = process.argv.slice(2);
const option = (flag, fallback) => { const index = argv.indexOf(flag); return index < 0 ? fallback : (argv[index + 1] ?? fallback); };
const LEDGER = option('--ledger', 'data/world-review/sys03-west-high-containment-live-20260827T021500Z/atomic-post-closeout-ledger.json');
const MANIFEST = option('--manifest', 'data/buildops/sys03-west-high-containment-20260827T021500Z/sys03-west-high-finite-containment-01-combined-zones-5a6dd0e84edd4c3dbfb6aba1831dec8a.release-manifest.json');
const QA = option('--qa', 'data/world-review/sys03-west-high-containment-live-20260827T021500Z/independent-post-qa.json');
const OUT = option('--out-dir', 'data/world-review/sys03-west-high-containment-live-20260827T021500Z/poststate-maps');
const MARKDOWN = option('--markdown-out', 'docs/masterplans/05-combined-zones/SYS03-WEST-HIGH-FINITE-CONTAINMENT-01-POSTSTATE-MAPS.md');
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`SYS03 West High post maps rejected: ${message}`); };
const parse = (file) => fs.readFileSync(abs(file), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const p = line.trim().split(/\s+/); fail(p[0] !== 'REPL' || p.length !== 9, `malformed operation ${line}`); return { cell: { x: +p[1], y: +p[2], z: +p[3] }, target: p[8] }; });
const ledgerBytes = fs.readFileSync(abs(LEDGER)); const manifestBytes = fs.readFileSync(abs(MANIFEST)); const qaBytes = fs.readFileSync(abs(QA));
const ledger = JSON.parse(ledgerBytes); const manifest = JSON.parse(manifestBytes); const qa = JSON.parse(qaBytes);
fail(ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' || ledger.manifest?.sha256 !== sha(manifestBytes), 'accepted ledger/manifest binding drifted');
fail(qa.status !== 'PASS_EXECUTED_SYS03_WEST_HIGH_FINITE_CONTAINMENT_QA', 'independent QA is not PASS');
const waterPkg = manifest.packages.find(({ key }) => key === 'finite-water-component-plug-low-to-high'); const gravityPkg = manifest.packages.find(({ key }) => key === 'gravity-foundation-lock-bottom-up');
fail(!waterPkg || !gravityPkg, 'required operation packages absent');
const water = parse(waterPkg.forward); const gravity = parse(gravityPkg.forward); const targets = [...water, ...gravity]; const targetMap = new Map(targets.map(({ cell, target }) => [cellKey(cell), target])); const waterKeys = new Set(water.map(({ cell }) => cellKey(cell))); const gravityKeys = new Set(gravity.map(({ cell }) => cellKey(cell)));
fail(targetMap.size !== 2617 || water.length !== 2525 || gravity.length !== 92, 'operation count drifted');
const postRoot = ledger.postSnapshot?.root; fail(!postRoot, 'post snapshot root is absent'); const reader = new AnvilReader(path.join(abs(postRoot), 'region'));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const mismatches = []; for (const { cell, target } of targets) { const actual = await stateAt(cell); if (actual !== target) mismatches.push({ cell, target, actual }); }
fail(mismatches.length !== 0, `post targets drifted: ${JSON.stringify(mismatches.slice(0, 4))}`);
const fluid = (state) => ['minecraft:water', 'minecraft:bubble_column', 'minecraft:lava'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const svg = (title, subtitle, cells, xValues, yValues, coordFor, classFor) => {
  const unit = 12; const left = 82; const top = 84; const width = left + xValues.length * unit + 32; const height = top + yValues.length * unit + 74;
  const body = []; for (let row = 0; row < yValues.length; row += 1) for (let column = 0; column < xValues.length; column += 1) { const cell = coordFor(xValues[column], yValues[row]); const cls = classFor(cell); body.push(`<rect x="${left + column * unit}" y="${top + row * unit}" width="${unit}" height="${unit}" fill="${cls}"/>`); }
  const labels = xValues.filter((_, index) => index % 5 === 0).map((value) => `<text x="${left + (value - xValues[0]) * unit + 6}" y="70" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const rowLabels = yValues.filter((_, index) => index % 4 === 0).map((value, index) => `<text x="${left - 8}" y="${top + yValues.indexOf(value) * unit + 9}" text-anchor="end" class="tiny">${value}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 17px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:9px monospace;fill:#243746}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="25" class="title">${title}</text><text x="16" y="45" class="sub">${subtitle}</text><rect x="16" y="57" width="10" height="10" fill="#176b87"/><text x="30" y="66" class="tiny">sealed water/bubble plug</text><rect x="154" y="57" width="10" height="10" fill="#b45309"/><text x="168" y="66" class="tiny">gravity foundation lock</text><rect x="316" y="57" width="10" height="10" fill="#e2e8f0"/><text x="330" y="66" class="tiny">other post state</text>${labels}${rowLabels}${body.join('')}</svg>`;
};
const color = async (cell) => { const key = cellKey(cell); if (gravityKeys.has(key)) return '#b45309'; if (waterKeys.has(key)) return '#176b87'; const state = await stateAt(cell); return fluid(state) ? '#2563eb' : '#e2e8f0'; };
const xs = Array.from({ length: 58 }, (_, index) => -232 + index); const zs = Array.from({ length: 62 }, (_, index) => -502 + index);
const plan = svg('SYS03 West High finite containment — post-state plan Y=47', 'Post snapshot only · no residual water/bubble in operated cells · no corridor/rail/public route claim', null, xs, zs, (x, z) => ({ x, y: 47, z }), (cell) => targetMap.has(cellKey(cell)) ? (gravityKeys.has(cellKey(cell)) ? '#b45309' : '#176b87') : '#e2e8f0');
const ys = Array.from({ length: 27 }, (_, index) => 65 - index); const section = svg('SYS03 West High finite containment — post-state Y/Z section X=-206', 'Gravity locks are retained while water/bubble rollback is tested first', null, zs, ys, (z, y) => ({ x: -206, y, z }), (cell) => targetMap.has(cellKey(cell)) ? (gravityKeys.has(cellKey(cell)) ? '#b45309' : '#176b87') : '#e2e8f0');
fail(fs.existsSync(abs(OUT)), '--out-dir must be fresh'); fs.mkdirSync(abs(OUT), { recursive: true }); fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'west-high-finite-containment-post-plan-y47.svg'), plan); fs.writeFileSync(path.join(abs(OUT), 'west-high-finite-containment-post-section-x206.svg'), section);
const report = { schemaVersion: 1, id: 'SYS03-WEST-HIGH-FINITE-CONTAINMENT-POSTSTATE-MAPS', status: 'PASS_EXECUTED_POSTSTATE_MAPS', readOnly: true, worldMutated: false, source: { ledger: { path: rel(LEDGER), sha256: sha(ledgerBytes) }, manifest: { path: rel(MANIFEST), sha256: sha(manifestBytes) }, qa: { path: rel(QA), sha256: sha(qaBytes) }, postSnapshot: ledger.postSnapshot }, geometry: { waterBubblePlugCells: water.length, gravityFoundationLockCells: gravity.length, operatedCells: targets.length, residualTargetMismatches: mismatches.length }, maps: ['west-high-finite-containment-post-plan-y47.svg', 'west-high-finite-containment-post-section-x206.svg'], nonClaims: ['No corridor clearing or opening.', 'No rail, public route, service route, or passenger operation.', 'No water diversion, outfall, or receiver commissioning.'] };
report.reportSha256 = sha(JSON.stringify(report)); fs.writeFileSync(path.join(abs(OUT), 'west-high-finite-containment-post-maps.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(MARKDOWN), `# SYS03 West High finite containment — as-built post-state maps\n\n**Status:** \`PASS_EXECUTED_POSTSTATE_MAPS\`  \n**Post snapshot:** \`${postRoot}\`\n\n![Post-state plan](../../../${rel(path.join(OUT, 'west-high-finite-containment-post-plan-y47.svg'))})\n\n![Post-state section](../../../${rel(path.join(OUT, 'west-high-finite-containment-post-section-x206.svg'))})\n\nThe immutable post proves **2,525** water/bubble cells are a permanent sealed plug and **92** gravity cells are foundation locks. Independent QA confirms all **2,617** targets, zero residual operated/halo fluid, and the ordered inverse proof: water/bubble rollback first while gravity remains locked, then gravity rollback.\n\nThis does **not** clear/open the West High corridor, commission rail, public/service access, passenger operation, a water diversion, outfall, or receiver.\n\n- [Machine map report](../../../${rel(path.join(OUT, 'west-high-finite-containment-post-maps.json'))})\n- [Closeout ledger](../../../${rel(LEDGER)})\n- [Independent QA](../../../${rel(QA)})\n`);
console.log(JSON.stringify({ status: report.status, outDir: rel(OUT), markdown: rel(MARKDOWN), operatedCells: targets.length, worldMutated: false }, null, 2));
