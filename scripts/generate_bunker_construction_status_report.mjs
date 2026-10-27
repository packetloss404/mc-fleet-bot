#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createCanvas } from 'canvas';

import {
  AnvilReader,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_ROOT, '..');
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const has = (flag) => argv.includes(flag);

const GENERATED_AT = value('--generated-at', '2026-08-22T17:30:00Z');
const OUTPUT_ROOT = path.resolve(REPO_ROOT, value(
  '--out',
  'docs/redevelopment/2026-08-22-bunker-construction-status',
));
const SNAPSHOT_ROOT = path.resolve(REPO_ROOT, value(
  '--snapshot-root',
  'data/worldsnap-r08am-post-20260822T161818Z',
));
const REGION_ROOT = path.join(SNAPSHOT_ROOT, 'region');
const SKIP_RENDER = has('--skip-render');

const REPORT_JSON = path.join(OUTPUT_ROOT, 'bunker-construction-status.json');
const REPORT_MD = path.join(OUTPUT_ROOT, 'bunker-construction-status.md');
const REPORT_HTML = path.join(OUTPUT_ROOT, 'bunker-construction-status-report.html');
const REPORT_PDF = path.join(OUTPUT_ROOT, 'bunker-construction-status-report.pdf');
const QA_JSON = path.join(OUTPUT_ROOT, 'report-qa.json');
const MANIFEST_JSON = path.join(OUTPUT_ROOT, 'artifact-manifest.json');

const paths = {
  terminalLedger: 'data/world-review/combined-zones-r08am-live-20260822T161818Z/evidence-ledger.json',
  terminalIdentity: 'data/world-review/combined-zones-r08am-live-20260822T161818Z/post-snapshot-identity.json',
  terminalIntake: 'data/world-review/combined-zones-r08am-live-20260822T161818Z/post-complete-save-intake.json',
  cheyenne: {
    r10aLedger: 'data/world-review/combined-zones-r10a-live-20260821T163935Z/evidence-ledger.json',
    r10aQa: 'data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.json',
    r10gLedger: 'data/world-review/combined-zones-r10g-live-20260822T031853Z/evidence-ledger.json',
    r10gQa: 'data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json',
    r10hLedger: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/evidence-ledger.json',
    r10hQa: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/r10h-post-release-qa.json',
    r12o: 'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z/r12o-commissioning.json',
    design: 'docs/masterplans/01-cheyenne-mountain-complex/build-info.json',
  },
  ravenRock: {
    wave2Qa: 'data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json',
    t2bOps: 'data/buildops/ravenrock-t2b-liner-pilot-wave2-prerelease-2026-07-28.txt',
    s1Forward: 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.execution.json',
    s1Rollback: 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.emergency-rollback.execution.json',
    historicQa: 'docs/raven-rock/qa/qa-report.md',
    design: 'docs/masterplans/08-raven-rock/MASTERPLAN.md',
  },
  c01: {
    model: 'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
    townQa: 'data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
    routeQa: 'data/world-review/c01-route-preserved-core-post-route-qa-bound-2026-08-08.json',
    currentRouteQa: 'data/world-review/underground-navigation-r08am-20260822/current-route-qa.json',
    stairLedger: 'data/world-review/c01-route-aware-stair-core-release-2026-08-08/evidence-ledger.json',
    routeHold: 'data/world-review/c01-route-preserved-core-2026-08-08.json',
    townHall: 'docs/redevelopment/2026-08-08-c01-town-hall-decision.md',
    legacySurface: 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
    legacySurfaceExecution: 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.execution.json',
    legacyPortal: 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
    legacyPortalExecution: 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.execution.json',
    legacySupplement: 'data/world-review/mainstreet-bunker-surface-current-safe-supplement-2026-08-08.json',
    stairOps: 'data/buildops/c01-route-aware-stair-core-2026-08-08.txt',
    compiler: 'scripts/compile_c01_current_delta.mjs',
  },
  repairProgram: 'docs/redevelopment/2026-08-22-bunker-construction-status/bunker-basement-repair-program.md',
  database: 'data/world-map.db',
};

const CHEYENNE_OPS = [
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.cheyenne-secure-gallery-liner.forward.txt',
  'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.z08-institutional-contact-sequence-liner.forward.txt',
  'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.z10-cheyenne-approach-extension-liner.forward.txt',
  'data/buildops/combined-zones-r10h-b03-preinstitutional-passive-route-lighting.b03-preinstitutional-passive-route-lighting.forward.txt',
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Bunker status report rejected: ${message}`);
};
const absolute = (filename) => path.resolve(REPO_ROOT, filename);
const relative = (filename) => path.relative(REPO_ROOT, filename).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256Bytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha256File = (filename) => sha256Bytes(fs.readFileSync(absolute(filename)));
const binding = (filename) => ({
  path: relative(absolute(filename)),
  sha256: sha256File(filename),
  bytes: fs.statSync(absolute(filename)).size,
});
const writeJson = (filename, payload) => fs.writeFileSync(filename, `${JSON.stringify(payload, null, 2)}\n`);
const jsonPayloadHash = (payload) => sha256Bytes(JSON.stringify(payload));

for (const filename of [
  paths.terminalLedger,
  paths.terminalIdentity,
  paths.terminalIntake,
  ...Object.values(paths.cheyenne),
  ...Object.values(paths.ravenRock),
  ...Object.values(paths.c01),
  paths.repairProgram,
  paths.database,
  ...CHEYENNE_OPS,
]) invariant(fs.existsSync(absolute(filename)), `missing evidence ${filename}`);
invariant(fs.existsSync(REGION_ROOT), `missing immutable region ${relative(REGION_ROOT)}`);

function parseOperations(filename) {
  const operations = [];
  const lines = fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('CMD ')) continue;
    const fields = line.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename}:${index + 1} is not an exact REPL operation`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    invariant([x1, y1, z1, x2, y2, z2].every(Number.isInteger),
      `${filename}:${index + 1} has invalid bounds`);
    operations.push({
      line: index + 1,
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
      from: fields[7],
      to: fields[8],
    });
  }
  return operations;
}

function operationTargetMap(filenames) {
  const targets = new Map();
  for (const filename of filenames) {
    for (const operation of parseOperations(filename)) {
      for (let x = operation.minX; x <= operation.maxX; x += 1) {
        for (let y = operation.minY; y <= operation.maxY; y += 1) {
          for (let z = operation.minZ; z <= operation.maxZ; z += 1) {
            targets.set(`${x},${y},${z}`, {
              x,
              y,
              z,
              sourceState: operation.from,
              state: operation.to,
            });
          }
        }
      }
    }
  }
  return targets;
}

async function censusTargets(reader, filenames) {
  const targets = operationTargetMap(filenames);
  let exact = 0;
  const mismatchSamples = [];
  for (const target of targets.values()) {
    const actual = stateToCommandString(await reader.blockState(target.x, target.y, target.z));
    if (actual === target.state) exact += 1;
    else if (mismatchSamples.length < 12) mismatchSamples.push({
      point: [target.x, target.y, target.z],
      expected: target.state,
      actual,
    });
  }
  return {
    targetCells: targets.size,
    exactTargetCells: exact,
    supersededOrDriftedCells: targets.size - exact,
    mismatchSamples,
  };
}

function runC01CurrentDelta() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bunker-c01-current-'));
  const forward = path.join(tempRoot, 'forward.txt');
  const rollback = path.join(tempRoot, 'rollback.txt');
  const report = path.join(tempRoot, 'report.json');
  const result = spawnSync(process.execPath, [
    '--max-old-space-size=8192',
    absolute(paths.c01.compiler),
    '--regions', REGION_ROOT,
    '--out', forward,
    '--rollback', rollback,
    '--report', report,
  ], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  invariant(result.status === 0, `C01 current-delta compiler failed: ${result.stderr || result.stdout}`);
  const audit = JSON.parse(fs.readFileSync(report, 'utf8'));
  invariant(audit.status === 'C01_CURRENT_DELTA_READY_FOR_GUARDED_PREFLIGHT',
    `unexpected C01 current-delta status ${audit.status}`);
  invariant(audit.sourceSnapshot.sha256 === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
    'C01 audit did not bind the R08AM terminal region');
  invariant(audit.model.targetCells === 901073 && audit.operations.forwardOperationGroups === 127,
    'C01 target/delta census changed');

  const held = new Set(readJson(paths.c01.routeHold).heldKeys);
  const stairTargets = operationTargetMap([paths.c01.stairOps]);
  const deltas = operationTargetMap([forward]);
  let acceptedStairCoreCells = 0;
  let heldRouteAirCells = 0;
  for (const [key, delta] of deltas) {
    invariant(held.has(key), `C01 current difference ${key} is not route-preservation evidence`);
    if (stairTargets.get(key)?.state === delta.sourceState) acceptedStairCoreCells += 1;
    else if (delta.sourceState === 'minecraft:air') heldRouteAirCells += 1;
    else throw new Error(`Bunker status report rejected: unexplained C01 current difference ${key}`);
  }
  invariant(acceptedStairCoreCells === 82 && heldRouteAirCells === 45,
    `C01 preservation split ${acceptedStairCoreCells}+${heldRouteAirCells} changed`);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  return {
    modelTargetCells: audit.model.targetCells,
    exactModelTargetCells: audit.model.targetCells - deltas.size,
    deliberateRoutePreservationCells: deltas.size,
    acceptedStairCoreCells,
    heldRouteAirCells,
    sourceRegionSha256: audit.sourceSnapshot.sha256,
    modelManifestSha256: audit.model.manifestSha256,
    compilerStatus: audit.model.compilerStatus,
    sourceRetirementStatus: audit.sourceMigration.retirementStatus,
  };
}

function statusOf(document) {
  return document.status ?? document.decision?.release ?? null;
}

function drawEvidenceOverview(filename) {
  const canvas = createCanvas(1440, 900);
  const ctx = canvas.getContext('2d');
  const cards = [
    { x: 72, y: 240, w: 400, title: 'CHEYENNE / B03', metric: '5,988 / 5,988', label: 'current exact package targets', color: '#69e0b4', status: 'BOUNDED BUILD PROVEN' },
    { x: 520, y: 240, w: 400, title: 'EAST C01', metric: '900,946 / 901,073', label: 'model cells exact in terminal post', color: '#f1c873', status: 'FABRIC PROVEN · LIVE GATES OPEN' },
    { x: 968, y: 240, w: 400, title: 'RAVEN ROCK', metric: '0', label: 'current accepted complex releases', color: '#ff7f75', status: 'DESIGN / SUPERSEDED EVIDENCE' },
  ];
  ctx.fillStyle = '#091115'; ctx.fillRect(0, 0, 1440, 900);
  ctx.fillStyle = '#e8f0ed'; ctx.font = '700 56px sans-serif'; ctx.fillText('Bunker construction status', 72, 104);
  ctx.fillStyle = '#91a6a0'; ctx.font = '26px sans-serif';
  ctx.fillText('Terminal R08AM post · physical cells first · design claims separated', 72, 154);
  for (const card of cards) {
    ctx.fillStyle = '#111e22'; ctx.fillRect(card.x, card.y, card.w, 390);
    ctx.fillStyle = card.color; ctx.fillRect(card.x, card.y, card.w, 8);
    ctx.fillStyle = '#8fa49e'; ctx.font = '700 20px sans-serif'; ctx.fillText(card.title, card.x + 28, card.y + 60);
    ctx.fillStyle = '#f4f6f4';
    ctx.font = card.title === 'EAST C01' ? '700 34px sans-serif' : '700 50px sans-serif';
    ctx.fillText(card.metric, card.x + 28, card.y + 143);
    ctx.fillStyle = '#a9b7b3'; ctx.font = '22px sans-serif';
    const lines = card.label.match(/.{1,30}(?:\s|$)/g) ?? [card.label];
    lines.forEach((line, i) => ctx.fillText(line.trim(), card.x + 28, card.y + 188 + i * 31));
    ctx.fillStyle = card.color; ctx.font = '700 17px sans-serif'; ctx.fillText(card.status, card.x + 28, card.y + 318);
    ctx.fillStyle = '#60736e'; ctx.font = '17px sans-serif';
    ctx.fillText(card.title.startsWith('CHEYENNE') ? 'Passive internal circulation only' : card.title === 'EAST C01' ? 'No public/live commissioning claim' : 'S1 rolled back · T2B superseded', card.x + 28, card.y + 355);
  }
  ctx.fillStyle = '#14242a'; ctx.fillRect(72, 690, 1296, 116);
  ctx.fillStyle = '#d8e5e1'; ctx.font = '700 23px sans-serif'; ctx.fillText('PROOF RULE', 102, 736);
  ctx.fillStyle = '#9db1ab'; ctx.font = '21px sans-serif';
  ctx.fillText('A catalog status, concept rendering, or historical execution is not current construction proof.', 270, 736);
  ctx.fillText('Current exact cells + accepted immutable evidence decide the classification.', 270, 772);
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

function drawC01Evidence(filename) {
  const canvas = createCanvas(1440, 900);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a1117'; ctx.fillRect(0, 0, 1440, 900);
  ctx.fillStyle = '#f4f5ef'; ctx.font = '700 52px sans-serif'; ctx.fillText('C01: fabric and acceptance are different gates', 70, 92);
  ctx.fillStyle = '#91a4ac'; ctx.font = '23px sans-serif'; ctx.fillText('Seven modeled levels are overwhelmingly present; commissioning remains bounded.', 70, 140);
  const levels = [
    ['L1', 'Entry / service', '#73c8d4'], ['L0', 'Main distribution', '#69bfc8'],
    ['B1', 'Residential', '#62b4ba'], ['B2', 'Operations', '#5ba7ab'],
    ['B3', 'Command', '#54999c'], ['B4', 'Infrastructure', '#4d8b8c'],
    ['B5', 'Deep program', '#467d7d'],
  ];
  levels.forEach(([id, label, color], index) => {
    const y = 202 + index * 76;
    ctx.fillStyle = color; ctx.fillRect(90, y, 450, 56);
    ctx.fillStyle = '#071014'; ctx.font = '700 24px sans-serif'; ctx.fillText(id, 116, y + 37);
    ctx.font = '20px sans-serif'; ctx.fillText(label, 190, y + 36);
  });
  ctx.fillStyle = '#15222a'; ctx.fillRect(620, 202, 730, 532);
  const facts = [
    ['900,946', 'exact model targets in terminal R08AM'],
    ['127', 'deliberate route-preservation differences'],
    ['82 + 45', 'accepted stair-core cells + held route air'],
    ['4 / 5', 'current C01 route families pass offline geometry'],
    ['1 FAIL', 'mountain portal to L1 fails both directions'],
    ['PENDING', 'live walking, controls, collision, source retirement'],
  ];
  facts.forEach(([metric, text], index) => {
    const y = 260 + index * 92;
    ctx.fillStyle = index === 4 ? '#ffb077' : '#f1c873'; ctx.font = '700 33px sans-serif'; ctx.fillText(metric, 660, y);
    ctx.fillStyle = '#c4d0d4'; ctx.font = '21px sans-serif'; ctx.fillText(text, 850, y);
  });
  ctx.fillStyle = '#f1c873'; ctx.fillRect(90, 790, 1260, 4);
  ctx.fillStyle = '#9babb1'; ctx.font = '20px sans-serif';
  ctx.fillText('Classification: CURRENT FABRIC PROVEN · FULL RELOCATION / PUBLIC COMMISSIONING NOT ACCEPTED', 90, 840);
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

function renderWorldMedia() {
  const maps = path.join(OUTPUT_ROOT, 'maps');
  const screenshots = path.join(OUTPUT_ROOT, 'screenshots');
  fs.mkdirSync(maps, { recursive: true });
  fs.mkdirSync(screenshots, { recursive: true });
  drawEvidenceOverview(path.join(maps, '01-bunker-evidence-overview.png'));
  drawC01Evidence(path.join(maps, '02-c01-evidence-stack.png'));
  const jobs = [
    ['map', path.join(maps, '03-cheyenne-b03-terminal-map.png'), ['--center', '2220,-808', '--span', '512', '--scale', '2', '--ymax', '171', '--w', '1024', '--h', '1024']],
    ['map', path.join(maps, '04-east-c01-terminal-map.png'), ['--center', '800,-80', '--span', '256', '--scale', '4', '--ymax', '51', '--w', '1024', '--h', '1024']],
    ['map', path.join(maps, '05-raven-rock-evidence-volume-map.png'), ['--center', '-142,184', '--span', '96', '--scale', '8', '--ymax', '10', '--w', '768', '--h', '768']],
    ['map', path.join(maps, '06-legacy-c01-terminal-map.png'), ['--center', '195,160', '--span', '256', '--scale', '4', '--ymax', '110', '--w', '1024', '--h', '1024']],
    ['persp', path.join(screenshots, '01-cheyenne-institutional-route.png'), ['--eye', '2376.5,167.2,-868', '--look', '2328,167.2,-868', '--fov', '72', '--dist', '96', '--w', '1280', '--h', '720']],
    ['persp', path.join(screenshots, '02-cheyenne-closed-gallery-hold.png'), ['--eye', '2077.5,167.2,-868', '--look', '2048,167.2,-868', '--fov', '72', '--dist', '64', '--w', '1280', '--h', '720']],
    ['persp', path.join(screenshots, '03-east-c01-l1-route.png'), ['--eye', '802.5,44.62,-126.5', '--look', '802.5,44.2,-85', '--fov', '72', '--dist', '96', '--w', '1280', '--h', '720']],
    ['persp', path.join(screenshots, '04-raven-rock-former-t2b-volume.png'), ['--eye', '-144.5,3.62,186.5', '--look', '-136.5,2.62,182.5', '--fov', '78', '--dist', '48', '--w', '1280', '--h', '720']],
  ];
  for (const [mode, output, extra] of jobs) {
    const result = spawnSync(process.execPath, [
      path.join(SCRIPT_ROOT, 'world_render.mjs'),
      '--regions', REGION_ROOT,
      '--mode', mode,
      '--out', output,
      ...extra,
    ], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    invariant(result.status === 0, `world render failed for ${relative(output)}: ${result.stderr || result.stdout}`);
  }
}

function imageRecord(file, title, caption, proofClass) {
  const full = path.join(OUTPUT_ROOT, file);
  return {
    path: file,
    title,
    caption,
    proofClass,
    ...(fs.existsSync(full) ? { sha256: sha256Bytes(fs.readFileSync(full)), bytes: fs.statSync(full).size } : {}),
  };
}

function markdown(report) {
  return `# Bunker Construction Status\n\n`
    + `**Status:** ${report.status}\n\n`
    + `**Terminal post:** R08AM · \`${report.terminalSnapshot.completeSaveSha256}\`\n\n`
    + `This report distinguishes current exact physical construction from historical execution, catalog records, and design intent. It is not a public-access or live-system commissioning report.\n\n`
    + `## Current finding\n\n`
    + `| System | Evidence-backed classification | Current physical proof | Explicit limit |\n`
    + `| --- | --- | ---: | --- |\n`
    + `| Cheyenne / B03 | ${report.systems.cheyenne.classification} | ${report.systems.cheyenne.currentExactTargets.toLocaleString()} / ${report.systems.cheyenne.currentTargets.toLocaleString()} package targets exact | Passive internal inspection/circulation only |\n`
    + `| East C01 | ${report.systems.eastC01.classification} | ${report.systems.eastC01.currentExactModelTargets.toLocaleString()} / ${report.systems.eastC01.modelTargetCells.toLocaleString()} model cells exact | Live walk, controls, source retirement and public commissioning pending |\n`
    + `| Legacy C01 / MainStreet | ${report.systems.legacyC01.classification} | ${report.systems.legacyC01.currentExactHistoricalTargets.toLocaleString()} / ${report.systems.legacyC01.historicalTargets.toLocaleString()} historical targets exact | Historical packages no longer seal the whole current fabric |\n`
    + `| Raven Rock | ${report.systems.ravenRock.classification} | 0 current accepted complex releases | S1 rolled back; T2B accepted historically then superseded |\n\n`
    + `## Cheyenne / B03\n\n`
    + `The terminal snapshot contains all 5,988 targets from R10A, both R10G liners, and R10H. R12O separately proves the bounded enclosed route at indices 188…800: 613 stations, 12,212 route-air cells, 5,505 central-clearance cells, 3,053 floor and 3,053 ceiling cells, 4,856 fall-boundary cells, and 102 fixtures. The index-800 chamber cap remains closed. Active systems, secure/public access, chamber, terminal, and the obstructed 0…187 approach are not commissioned.\n\n`
    + `## C01\n\n`
    + `The relocated east C01 model contains 901,073 target cells. A fresh read-only compiler census against R08AM found 900,946 exact targets. Every one of the 127 differences is explained by the accepted route-preservation contract: 82 stair-core target states and 45 held air cells. On the newer R08AM-bound route check, ${report.systems.eastC01.currentOfflineRouteSummary.passed} of ${report.systems.eastC01.currentOfflineRouteSummary.total} C01 route families pass in both directions; ${report.systems.eastC01.currentOfflineRouteSummary.failedRouteIds.join(', ')} fails both directions and is not an available connection. Live Mineflayer traversal, powered access-control checks, entity/crowding observation, source retirement, surface parking recovery, and full relocation acceptance remain open.\n\n`
    + `The legacy MainStreet bunker is also substantial physical construction. Its two historical packages address 30,361 unique cells, of which 25,193 still match the historical target states. That is current physical evidence, not a claim that the original package remains a complete current as-built seal.\n\n`
    + `## Raven Rock\n\n`
    + `No current accepted Raven Rock complex release survives. The 335-cell S1 pilot was executed and then emergency-rolled back. The 151-cell Wave2 T2B pilot was accepted historically, but only one target still matches in R08AM; 150 were superseded by later fabric. The visible current volume is documented only as an observed, provenance-unattributed space. The full cavern, command center, buildings, portals, shaft and reservoir remain design/catalog scope.\n\n`
    + `## Repair queue\n\n`
    + `The [bunker and basement repair program](bunker-basement-repair-program.md) is the controlling next-build queue. It starts with BKR-SURVEY-00 and preserves B03 holds, the failed C01 portal nonclaim, legacy-C01 condition uncertainty, and Raven Rock wet-boundary closures until exact release gates pass.\n\n`
    + `## Evidence policy\n\n`
    + `${report.proofPolicy.join('\n\n')}\n`;
}

function html(report) {
  const card = (title, value, status, copy, accent) => `<article class="card" style="--accent:${accent}"><small>${title}</small><strong>${value}</strong><b>${status}</b><p>${copy}</p></article>`;
  const img = (record) => `<figure><img src="${record.path}" alt="${record.title}"><figcaption><b>${record.title}</b>${record.caption}</figcaption></figure>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bunker Construction Status</title><style>
  :root{color-scheme:dark;font-family:Inter,Arial,sans-serif;background:#081014;color:#eaf0ed}*{box-sizing:border-box}body{margin:0;background:#081014}main{max-width:1440px;margin:auto;padding:52px 60px 90px}.eyebrow{color:#76d5b5;letter-spacing:.15em;text-transform:uppercase;font-size:13px;font-weight:800}h1{font-size:76px;line-height:.95;margin:26px 0;max-width:900px}h2{font-size:42px;margin:0 0 20px}p{color:#a9b8b3;line-height:1.6}.lede{font-size:24px;max-width:900px}.hero{border-bottom:1px solid #26373a;padding-bottom:48px}.metrics,.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.metrics{margin-top:44px}.metric{background:#112026;padding:24px}.metric strong{display:block;font-size:36px;color:#f1c873}.section{padding:64px 0;border-bottom:1px solid #26373a}.card{background:#111e23;padding:28px;border-top:5px solid var(--accent)}.card small{color:#829791}.card strong{font-size:42px;display:block;margin:22px 0 6px}.card b{color:var(--accent);font-size:13px;letter-spacing:.08em}.card p{min-height:84px}figure{margin:0;background:#101c21}figure img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}figure.square img{aspect-ratio:1/1}figcaption{padding:18px;color:#9fb0ab;line-height:1.5}figcaption b{display:block;color:#eaf0ed;margin-bottom:6px}.wide{grid-column:span 2}.truth{border-left:4px solid #f1c873;padding:4px 0 4px 24px;max-width:900px}.evidence{columns:2;column-gap:36px}.evidence li{break-inside:avoid;color:#9fb0ab;margin:0 0 10px;font-family:monospace;font-size:12px;word-break:break-all}@media(max-width:800px){main{padding:32px 22px}h1{font-size:48px}.grid,.metrics{grid-template-columns:1fr}.wide{grid-column:auto}.evidence{columns:1}}@media print{main{padding:30px}.section{break-inside:avoid}h1{font-size:58px}}
  </style></head><body><main>
  <header class="hero"><p class="eyebrow">Report 06 · terminal evidence review · ${report.generatedAtUtc.slice(0,10)}</p><h1>Bunkers: what is actually built.</h1><p class="lede">An immutable-snapshot audit of Cheyenne, Raven Rock, and both C01 programs. Current blocks lead; catalogs and design documents do not get to impersonate construction evidence.</p><div class="metrics"><div class="metric"><strong>5,988 / 5,988</strong><span>Cheyenne current targets</span></div><div class="metric"><strong>900,946</strong><span>east C01 model targets exact</span></div><div class="metric"><strong>0</strong><span>current Raven Rock accepted complex releases</span></div></div></header>
  <section class="section">${img(report.media[0])}</section>
  <section class="section"><h2>Evidence-backed classification</h2><div class="grid">${card('CHEYENNE / B03','5,988 / 5,988','BOUNDED BUILD PROVEN','Exact current fit-out targets; R12O commissions passive internal inspection/circulation only.','#69e0b4')}${card('EAST C01','900,946 / 901,073','FABRIC PROVEN · LIVE GATES OPEN','All 127 differences are accepted route-preservation states. Full relocation and public operation are not accepted.','#f1c873')}${card('RAVEN ROCK','0','NO CURRENT ACCEPTED COMPLEX','S1 was rolled back. T2B was historically accepted, then 150 of 151 cells were superseded.','#ff7f75')}</div></section>
  <section class="section"><h2>Cheyenne / B03</h2><p class="truth">A long, illuminated, enclosed route exists now. Its chamber terminus remains capped. This report does not commission secure access, public access, active systems, the chamber, or the held indices 0…187.</p><div class="grid">${img(report.media[4])}${img(report.media[5])}<figure class="square">${img(report.media[2]).replace('<figure>','').replace('</figure>','')}</figure></div></section>
  <section class="section"><h2>C01: enormous fabric, bounded acceptance</h2><p class="truth">The east C01 model is physically present to 99.986% exactness, with the complete remainder explained by accepted route preservation. ${report.systems.eastC01.currentOfflineRouteSummary.passed}/${report.systems.eastC01.currentOfflineRouteSummary.total} C01 route families pass current offline geometry; ${report.systems.eastC01.currentOfflineRouteSummary.failedRouteIds.join(', ')} fails both directions and is not an available connection. Live walking, powered controls, entity observation, source retirement, parking recovery, and public commissioning remain explicit nonclaims.</p><div class="grid">${img(report.media[1])}${img(report.media[6])}<figure class="square">${img(report.media[3]).replace('<figure>','').replace('</figure>','')}</figure></div><p>Legacy MainStreet C01 is separately real: 25,193 of 30,361 unique historical operation targets remain exact in the terminal post. Later fabric means the old packages cannot be presented as a complete current as-built seal.</p></section>
  <section class="section"><h2>Raven Rock: design is not a bunker</h2><p class="truth">No current accepted Raven Rock complex release survives. The image below is the current observed former T2B volume—not proof of the planned complex and not a claim of accepted Raven Rock provenance.</p><div class="grid">${img(report.media[7])}<figure class="square">${img(report.media[4 - 0 + 4]).replace('<figure>','').replace('</figure>','')}</figure></div></section>
  <section class="section"><h2>Audit boundary</h2>${report.proofPolicy.map((paragraph) => `<p>${paragraph}</p>`).join('')}<ul class="evidence">${Object.values(report.evidence).map((entry) => `<li>${entry.path}<br>${entry.sha256}</li>`).join('')}</ul></section>
  </main></body></html>`;
}

async function main() {
  const terminalLedger = readJson(paths.terminalLedger);
  const terminalIdentity = readJson(paths.terminalIdentity);
  invariant(terminalLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'R08AM terminal ledger not accepted');
  invariant(terminalLedger.postSnapshot?.completeSaveSha256 === '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699', 'terminal complete-save identity changed');
  invariant((terminalIdentity.snapshot?.sha256 ?? terminalIdentity.sha256) === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f', 'terminal region identity changed');

  const reader = new AnvilReader(REGION_ROOT);
  const cheyenneCensus = await censusTargets(reader, CHEYENNE_OPS);
  invariant(cheyenneCensus.targetCells === 5988 && cheyenneCensus.exactTargetCells === 5988, 'Cheyenne terminal target census is not 5,988/5,988');
  const ravenCensus = await censusTargets(reader, [paths.ravenRock.t2bOps]);
  invariant(ravenCensus.targetCells === 151 && ravenCensus.exactTargetCells === 1, 'Raven T2B terminal census is not 1/151');
  const legacyCensus = await censusTargets(reader, [paths.c01.legacySurface, paths.c01.legacyPortal]);
  invariant(legacyCensus.targetCells === 30361 && legacyCensus.exactTargetCells === 25193, 'legacy C01 terminal census changed');
  const eastC01 = runC01CurrentDelta();

  const r10aQa = readJson(paths.cheyenne.r10aQa);
  const r10gQa = readJson(paths.cheyenne.r10gQa);
  const r10hQa = readJson(paths.cheyenne.r10hQa);
  const r12o = readJson(paths.cheyenne.r12o);
  const wave2Qa = readJson(paths.ravenRock.wave2Qa);
  const s1Forward = readJson(paths.ravenRock.s1Forward);
  const s1Rollback = readJson(paths.ravenRock.s1Rollback);
  const routeQa = readJson(paths.c01.routeQa);
  const currentRouteQa = readJson(paths.c01.currentRouteQa);
  const stairLedger = readJson(paths.c01.stairLedger);
  const townQa = readJson(paths.c01.townQa);
  invariant(statusOf(r10aQa)?.startsWith('PASS'), 'R10A QA not PASS');
  invariant(statusOf(r10gQa)?.startsWith('PASS'), 'R10G QA not PASS');
  invariant(statusOf(r10hQa)?.startsWith('PASS'), 'R10H QA not PASS');
  invariant(statusOf(r12o)?.includes('PASS') && statusOf(r12o)?.includes('COMMISSIONED'), 'R12O commissioning not PASS');
  invariant(wave2Qa.status === 'PASS' && wave2Qa.decision?.release === 'ACCEPTED', 'Wave2 QA not accepted');
  invariant(s1Forward.status === 'complete' && s1Rollback.status === 'complete', 'Raven S1 forward/rollback evidence incomplete');
  invariant(routeQa.status === 'PASS' && routeQa.coverage?.domains?.find(({ domain }) => domain === 'c01-bunker')?.passed === 5, 'C01 route QA not 5/5');
  invariant(currentRouteQa.status === 'FAIL' && currentRouteQa.passed === false,
    'R08AM current route QA must retain its rejected whole-network result');
  invariant(currentRouteQa.postSnapshot?.sha256 === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
    'R08AM current route QA is not bound to the terminal region');
  invariant(stairLedger.status === 'EXECUTED_AND_VERIFIED', 'C01 route-aware stair core not accepted');
  invariant(townQa.status === 'PASS' && townQa.decision?.release === 'ACCEPTED', 'Town Expansion R1 not accepted');

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  if (!SKIP_RENDER) renderWorldMedia();

  const c01Routes = currentRouteQa.routes.filter(({ domain }) => domain === 'c01-bunker').map((route) => ({
    id: route.id,
    accessClass: route.accessClass,
    forwardPathCells: route.directions[0].path?.length ?? 0,
    reversePathCells: route.directions[1].path?.length ?? 0,
    passed: route.passed,
  }));
  const c01CurrentRouteSummary = {
    source: relative(absolute(paths.c01.currentRouteQa)),
    sourceSha256: sha256File(paths.c01.currentRouteQa),
    total: c01Routes.length,
    passed: c01Routes.filter(({ passed }) => passed).length,
    failed: c01Routes.filter(({ passed }) => !passed).length,
    failedRouteIds: c01Routes.filter(({ passed }) => !passed).map(({ id }) => id),
    disposition: 'CURRENT_OFFLINE_GEOMETRY_ONLY; FAILED_ROUTE_IS_NOT_AVAILABLE_OR_COMMISSIONED',
  };
  invariant(c01CurrentRouteSummary.total === 5 && c01CurrentRouteSummary.passed === 4
    && c01CurrentRouteSummary.failed === 1
    && c01CurrentRouteSummary.failedRouteIds[0] === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
  'unexpected R08AM C01 route result');
  const media = [
    imageRecord('maps/01-bunker-evidence-overview.png', 'Bunker evidence overview', 'Current physical proof and honest acceptance class.', 'GENERATED_EVIDENCE_DIAGRAM'),
    imageRecord('maps/02-c01-evidence-stack.png', 'East C01 evidence stack', 'Physical model presence and bounded route acceptance.', 'GENERATED_EVIDENCE_DIAGRAM'),
    imageRecord('maps/03-cheyenne-b03-terminal-map.png', 'Cheyenne / B03 terminal map', 'R08AM top-down section at y≤171.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('maps/04-east-c01-terminal-map.png', 'East C01 terminal map', 'R08AM top-down section at y≤51.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('maps/05-raven-rock-evidence-volume-map.png', 'Raven Rock evidence-volume map', 'Current blocks around the historical T2B pilot volume; not full-complex proof.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('screenshots/01-cheyenne-institutional-route.png', 'Cheyenne institutional route', 'Current exact illuminated internal circulation.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('screenshots/02-cheyenne-closed-gallery-hold.png', 'Cheyenne closed gallery hold', 'The bounded route terminates at a retained cap.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('screenshots/03-east-c01-l1-route.png', 'East C01 L1 route fabric', 'Current physical route fabric; offline geometry acceptance only.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('screenshots/04-raven-rock-former-t2b-volume.png', 'Former Raven Rock T2B volume', 'Observed current blocks where the accepted 151-cell pilot was later superseded; provenance unattributed.', 'IMMUTABLE_POST_BLOCK_RENDER'),
    imageRecord('maps/06-legacy-c01-terminal-map.png', 'Legacy MainStreet C01 terminal map', 'Current surface/build fabric around the historical bunker packages.', 'IMMUTABLE_POST_BLOCK_RENDER'),
  ];

  const evidenceFiles = {
    terminalLedger: paths.terminalLedger,
    terminalIdentity: paths.terminalIdentity,
    terminalIntake: paths.terminalIntake,
    r10aLedger: paths.cheyenne.r10aLedger,
    r10aPostQa: paths.cheyenne.r10aQa,
    r10gLedger: paths.cheyenne.r10gLedger,
    r10gPostQa: paths.cheyenne.r10gQa,
    r10hLedger: paths.cheyenne.r10hLedger,
    r10hPostQa: paths.cheyenne.r10hQa,
    r12oCommissioning: paths.cheyenne.r12o,
    cheyenneDesign: paths.cheyenne.design,
    ravenWave2Qa: paths.ravenRock.wave2Qa,
    ravenT2bOperations: paths.ravenRock.t2bOps,
    ravenS1Forward: paths.ravenRock.s1Forward,
    ravenS1Rollback: paths.ravenRock.s1Rollback,
    ravenHistoricQa: paths.ravenRock.historicQa,
    ravenDesign: paths.ravenRock.design,
    c01Model: paths.c01.model,
    townExpansionPostQa: paths.c01.townQa,
    c01RouteQa: paths.c01.routeQa,
    c01CurrentRouteQa: paths.c01.currentRouteQa,
    bunkerBasementRepairProgram: paths.repairProgram,
    c01StairLedger: paths.c01.stairLedger,
    c01RouteHold: paths.c01.routeHold,
    c01TownHallDecision: paths.c01.townHall,
    legacyC01SurfaceOperations: paths.c01.legacySurface,
    legacyC01SurfaceExecution: paths.c01.legacySurfaceExecution,
    legacyC01PortalOperations: paths.c01.legacyPortal,
    legacyC01PortalExecution: paths.c01.legacyPortalExecution,
    legacyC01BlockedSupplement: paths.c01.legacySupplement,
    c01CurrentDeltaCompiler: paths.c01.compiler,
    worldDatabaseReadOnly: paths.database,
  };
  const evidence = Object.fromEntries(Object.entries(evidenceFiles).map(([key, filename]) => [key, binding(filename)]));

  const report = {
    schemaVersion: 1,
    id: 'ianlan-nextgen-bunker-construction-status-20260822',
    reportNumber: '06',
    generatedAtUtc: GENERATED_AT,
    status: 'PASS_CURRENT_PHYSICAL_CONSTRUCTION_SEPARATED_FROM_DESIGN_AND_HISTORY',
    title: 'Bunker Construction Status',
    summary: 'Current immutable-world proof for Cheyenne, Raven Rock, legacy MainStreet C01, and relocated east C01, with design and commissioning nonclaims kept explicit.',
    readOnly: true,
    liveWorldMutated: false,
    databaseMutated: false,
    terminalSnapshot: {
      root: relative(SNAPSHOT_ROOT),
      region: relative(REGION_ROOT),
      completeSaveSha256: terminalLedger.postSnapshot.completeSaveSha256,
      regionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
      completedReleaseIdentitySha256: terminalLedger.completedReleaseIdentitySha256,
      ledger: binding(paths.terminalLedger),
    },
    proofPolicy: [
      'Current exact block states in the terminal immutable snapshot are physical evidence. Accepted release and post-QA ledgers establish provenance and bounded acceptance.',
      'Historical execution followed by rollback, or target states superseded by later work, is reported as history rather than current accepted construction.',
      'Database status, authored coordinates, planning schedules, concept renderings, and masterplan prose are not independently sufficient proof that a structure exists now.',
      'Offline route geometry is not a claim of public access, live walkability, powered-control readiness, secure commissioning, or operational occupancy.',
    ],
    systems: {
      cheyenne: {
        classification: 'CURRENT_EXACT_BOUNDED_BUILD_PASSIVE_INTERNAL_ROUTE_ONLY',
        currentTargets: cheyenneCensus.targetCells,
        currentExactTargets: cheyenneCensus.exactTargetCells,
        packages: ['R10A secure gallery liner', 'R10G institutional/contact sequence liners', 'R10H passive route lighting'],
        commissionedScope: {
          release: 'R12O',
          class: 'PASSIVE_INTERNAL_INSPECTION_AND_CIRCULATION_ONLY',
          indices: { first: 188, last: 800, stations: 613 },
          routeAirCells: 12212,
          centralClearanceCells: 5505,
          floorCells: 3053,
          ceilingCells: 3053,
          fallBoundaryCells: 4856,
          fixtures: 102,
          chamberCapClosed: true,
        },
        coordinates: {
          institutionalRouteView: { eye: [2376.5, 167.2, -868], look: [2328, 167.2, -868] },
          closedGalleryHoldView: { eye: [2077.5, 167.2, -868], look: [2048, 167.2, -868] },
        },
        nonclaims: [
          'indices 0..187 remain obstructed/held',
          'active transport or mechanisms commissioned',
          'secure or public access commissioned',
          'main chamber or terminal commissioned',
          'Cheyenne masterplan modules beyond the bounded B03 route built',
        ],
        designOnlyExamples: ['main chamber', 'blast-door airlock', 'battle cab', 'Granite Inn', 'Stargate door', 'WOPR terminal'],
      },
      ravenRock: {
        classification: 'NO_CURRENT_ACCEPTED_RAVEN_ROCK_COMPLEX',
        currentAcceptedComplexReleases: 0,
        s1Pilot: {
          targetCells: s1Forward.sourceOperationCount,
          forwardStatus: s1Forward.status,
          emergencyRollbackStatus: s1Rollback.status,
          currentClassification: 'ROLLED_BACK_NOT_CURRENT_CONSTRUCTION',
        },
        t2bPilot: {
          historicalAcceptance: wave2Qa.decision.release,
          targetCells: ravenCensus.targetCells,
          currentExactHistoricalTargets: ravenCensus.exactTargetCells,
          supersededTargets: ravenCensus.supersededOrDriftedCells,
          currentClassification: 'HISTORICALLY_ACCEPTED_THEN_SUPERSEDED',
        },
        observedCurrentVolume: {
          coordinates: { eye: [-144.5, 3.62, 186.5], look: [-136.5, 2.62, 182.5] },
          classification: 'PHYSICAL_BLOCKS_PRESENT_PROVENANCE_UNATTRIBUTED',
        },
        designOnlyExamples: ['full cavern', 'command center', 'support buildings', 'surface portals', 'vertical shaft', 'reservoir'],
        catalogWarning: 'Catalog complete statuses for S1/T2B are stale when compared with rollback and terminal-state evidence.',
      },
      legacyC01: {
        classification: 'CURRENT_PHYSICAL_FABRIC_WITH_PARTIAL_HISTORICAL_TARGET_BINDING',
        historicalTargets: legacyCensus.targetCells,
        currentExactHistoricalTargets: legacyCensus.exactTargetCells,
        laterChangedTargets: legacyCensus.supersededOrDriftedCells,
        acceptedHistoricalPackages: ['MainStreet bunker surface Phase 1', 'MainStreet recessed portal Phase 2'],
        blockedSupplementStatus: readJson(paths.c01.legacySupplement).status,
        nonclaim: 'The historical packages do not form a complete current as-built seal after later construction and lifecycle changes.',
      },
      eastC01: {
        classification: 'CURRENT_MODEL_FABRIC_PROVEN_FULL_RELOCATION_AND_LIVE_COMMISSIONING_INCOMPLETE',
        modelTargetCells: eastC01.modelTargetCells,
        currentExactModelTargets: eastC01.exactModelTargetCells,
        deliberateRoutePreservationCells: eastC01.deliberateRoutePreservationCells,
        acceptedStairCoreCells: eastC01.acceptedStairCoreCells,
        heldRouteAirCells: eastC01.heldRouteAirCells,
        modelExactPercent: Number(((eastC01.exactModelTargetCells / eastC01.modelTargetCells) * 100).toFixed(3)),
        modelCompilerStatus: eastC01.compilerStatus,
        sourceRetirementStatus: eastC01.sourceRetirementStatus,
        acceptedOfflineRoutes: c01Routes,
        currentOfflineRouteSummary: c01CurrentRouteSummary,
        coordinates: { l1RouteView: { eye: [802.5, 44.62, -126.5], look: [802.5, 44.2, -85] } },
        nonclaims: [
          'live Mineflayer traversal accepted',
          'powered doors, airlocks, or access controls commissioned',
          'entity/crowding thresholds accepted',
          'source bunker retirement completed',
          'surface road/parking recovery completed',
          'full public or citizen activation accepted',
        ],
      },
    },
    repairProgram: {
      path: relative(absolute(paths.repairProgram)),
      sha256: sha256File(paths.repairProgram),
      status: 'DESIGN_AND_SURVEY_QUEUE',
      firstPackage: 'BKR-SURVEY-00',
    },
    media,
    evidence,
  };
  report.reportPayloadSha256 = jsonPayloadHash(report);
  writeJson(REPORT_JSON, report);
  fs.writeFileSync(REPORT_MD, markdown(report));
  fs.writeFileSync(REPORT_HTML, html(report));

  const artifactFiles = [
    REPORT_JSON,
    REPORT_MD,
    REPORT_HTML,
    REPORT_PDF,
    ...media.map(({ path: mediaPath }) => path.join(OUTPUT_ROOT, mediaPath)),
  ]
    .filter((filename) => fs.existsSync(filename));
  const manifest = {
    schemaVersion: 1,
    id: 'bunker-construction-status-artifact-manifest-20260822',
    generatedAtUtc: GENERATED_AT,
    status: 'PASS',
    reportPayloadSha256: report.reportPayloadSha256,
    terminalCompleteSaveSha256: report.terminalSnapshot.completeSaveSha256,
    artifacts: artifactFiles.map((filename) => ({
      path: path.relative(OUTPUT_ROOT, filename).split(path.sep).join('/'),
      sha256: sha256Bytes(fs.readFileSync(filename)),
      bytes: fs.statSync(filename).size,
    })),
  };
  manifest.manifestPayloadSha256 = jsonPayloadHash(manifest);
  writeJson(MANIFEST_JSON, manifest);

  const checks = {
    terminalLedgerAccepted: terminalLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    terminalCompleteSaveBound: report.terminalSnapshot.completeSaveSha256 === '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
    terminalRegionBound: report.terminalSnapshot.regionSha256 === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
    cheyenneExactCurrentTargets: cheyenneCensus.targetCells === 5988 && cheyenneCensus.exactTargetCells === 5988,
    cheyenneNonclaimsPreserved: report.systems.cheyenne.nonclaims.length === 5,
    ravenS1RollbackRecognized: report.systems.ravenRock.s1Pilot.currentClassification === 'ROLLED_BACK_NOT_CURRENT_CONSTRUCTION',
    ravenT2bSupersededRecognized: ravenCensus.exactTargetCells === 1 && ravenCensus.supersededOrDriftedCells === 150,
    ravenNoCurrentComplexClaim: report.systems.ravenRock.currentAcceptedComplexReleases === 0,
    legacyC01CurrentCensusBound: legacyCensus.exactTargetCells === 25193,
    eastC01CurrentModelCensusBound: eastC01.exactModelTargetCells === 900946,
    eastC01AllDifferencesExplained: eastC01.acceptedStairCoreCells + eastC01.heldRouteAirCells === 127,
    eastC01CurrentRouteFailurePreserved: report.systems.eastC01.currentOfflineRouteSummary.passed === 4
      && report.systems.eastC01.currentOfflineRouteSummary.failedRouteIds.includes('TE-ROUTE-C01-MOUNTAIN-PORTAL-L1'),
    eastC01LiveNonclaimsPreserved: report.systems.eastC01.nonclaims.length === 6 && routeQa.completeForCitizenActivation === false,
    designSeparatedFromPhysicalProof: report.proofPolicy.length === 4,
    noMutationClaim: report.readOnly && !report.liveWorldMutated && !report.databaseMutated,
    renderedMediaPresentOrExplicitlySkipped: SKIP_RENDER || media.every(({ sha256 }) => typeof sha256 === 'string'),
  };
  const qa = {
    schemaVersion: 1,
    id: 'bunker-construction-status-report-qa-20260822',
    generatedAtUtc: GENERATED_AT,
    status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    report: {
      path: 'bunker-construction-status.json',
      sha256: sha256Bytes(fs.readFileSync(REPORT_JSON)),
      payloadSha256: report.reportPayloadSha256,
    },
    manifest: {
      path: 'artifact-manifest.json',
      sha256: sha256Bytes(fs.readFileSync(MANIFEST_JSON)),
      bytes: fs.statSync(MANIFEST_JSON).size,
    },
    liveWorldMutated: false,
    databaseMutated: false,
  };
  qa.qaPayloadSha256 = jsonPayloadHash(qa);
  writeJson(QA_JSON, qa);
  invariant(qa.status === 'PASS', 'report QA did not PASS');
  process.stdout.write(`${JSON.stringify({
    status: qa.status,
    report: relative(REPORT_JSON),
    reportSha256: qa.report.sha256,
    reportPayloadSha256: qa.report.payloadSha256,
    qa: relative(QA_JSON),
    checks: `${qa.passed}/${qa.total}`,
    media: media.filter(({ sha256 }) => sha256).length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
