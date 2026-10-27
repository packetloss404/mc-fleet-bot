#!/usr/bin/env node
/** Read-only, post-bound plan/section publication for paired Westlight staff platforms. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = 'data/worldsnap-cobalt-wl-south-rail-staff-platform-post-20260827T001000Z';
const LEDGER = 'data/world-review/cobalt-wl-south-rail-staff-platform-live-20260827T001000Z/evidence-ledger.json';
const MANIFEST = 'data/buildops/cobalt-wl-south-rail-staff-platform-01.release-manifest.json';
const OUT = 'docs/masterplans/05-combined-zones/02-visuals/cobalt-wl-paired-staff-platforms-01';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`Westlight paired-platform map rejected: ${message}`); };
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const symbol = (state) => {
  if (state === 'minecraft:air') return '.';
  if (stateName(state) === 'minecraft:polished_deepslate') return 'D';
  if (stateName(state) === 'minecraft:polished_andesite') return 'P';
  if (stateName(state) === 'minecraft:rail') return 'R';
  if (stateName(state) === 'minecraft:ladder') return 'L';
  if (fluid(state)) return 'W';
  return '#';
};
const cells = (x1, x2, y1, y2, z1, z2) => {
  const output = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) output.push({ x, y, z });
  return output;
};

const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'release ledger is not executed/post-verified');
fail(ledger.releaseNodeId === 'CZ-SYS03-COBALT-WL-SOUTH-RAIL-STAFF-PLATFORM' && ledger.transactionId === 'cobalt-wl-south-rail-staff-platform-01', 'release identity drifted');
fail(ledger.manifest?.sha256 === sha(manifestBytes), 'ledger is not bound to the current manifest');
fail(abs(ledger.postSnapshot?.root) === abs(POST) && abs(ledger.postSnapshot?.regions) === abs(path.join(POST, 'region')), 'ledger does not bind the expected post snapshot');
const identityPath = ledger.postSnapshot?.identity?.path;
fail(identityPath && sha(fs.readFileSync(abs(identityPath))) === ledger.postSnapshot.identity.sha256, 'post snapshot identity file drifted');
const capturePath = path.join(abs(POST), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'post snapshot is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(abs(POST), member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `post member drifted: ${member.path}`);
}
const reader = new AnvilReader(path.join(abs(POST), 'region'));
const get = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const xPlan = range(-254, -237);
const zPlan = range(-461, -452);
const plan = [];
for (const z of zPlan) plan.push({ z, cells: await Promise.all(xPlan.map(async (x) => ({ x, state: await get(x, 13, z) }))) });
const sectionZ = range(-462, -451);
const sectionY = range(19, 12).reverse();
const section = [];
for (const y of sectionY) section.push({ y, cells: await Promise.all(sectionZ.map(async (z) => ({ z, state: await get(-250, y, z) }))) });

const checkExact = async (label, targetCells, expected) => {
  const observed = await Promise.all(targetCells.map(async ({ x, y, z }) => get(x, y, z)));
  const failures = observed.filter((state) => state !== expected).length;
  return { label, expected, cellCount: targetCells.length, failures, pass: failures === 0 };
};
const checks = await Promise.all([
  checkExact('south added outer containment wall', cells(-254, -237, 13, 16, -452, -452), 'minecraft:polished_deepslate'),
  checkExact('south added second walking deck', cells(-254, -237, 13, 13, -453, -453), 'minecraft:polished_andesite'),
  checkExact('south added clear walking envelope excluding ladder backing', cells(-254, -237, 14, 16, -453, -453).filter(({ x }) => x !== -250), 'minecraft:air'),
  checkExact('retained south inspection ladder', cells(-250, -250, 14, 18, -454, -454), 'minecraft:ladder[facing=south,waterlogged=false]'),
  checkExact('retained north passive rail', cells(-254, -237, 13, 13, -461, -461), 'minecraft:rail[shape=east_west,waterlogged=false]'),
  checkExact('retained south passive rail', cells(-254, -237, 13, 13, -455, -455), 'minecraft:rail[shape=east_west,waterlogged=false]'),
]);
const containmentEnvelope = cells(-254, -237, 13, 16, -461, -452);
const fluids = [];
for (const cell of containmentEnvelope) { const state = await get(cell.x, cell.y, cell.z); if (fluid(state)) fluids.push({ cell, state }); }
fail(checks.every(({ pass }) => pass), `post state mismatch: ${checks.filter(({ pass }) => !pass).map(({ label }) => label).join(', ')}`);
fail(fluids.length === 0, 'fluid exists inside the paired-platform containment envelope');

const svg = (title, rows, axis, values) => {
  const size = 25; const left = 90; const top = 70;
  const width = left + values.length * size + 35; const height = top + rows.length * size + 65;
  const color = { '.': '#e7eef5', D: '#32485c', P: '#72869a', R: '#9c5c31', L: '#d7b34a', W: '#1d70b8', '#': '#66717d' };
  const labels = values.map((value, index) => `<text x="${left + index * size + 12}" y="56" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const body = rows.map((row, rowIndex) => {
    const rowValue = axis === 'z' ? row.z : row.y;
    const each = row.cells.map((cell, index) => `<rect x="${left + index * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${color[symbol(cell.state)]}"/><text x="${left + index * size + 12}" y="${top + rowIndex * size + 17}" text-anchor="middle" class="cell">${symbol(cell.state)}</text>`).join('');
    return `<text x="${left - 10}" y="${top + rowIndex * size + 17}" text-anchor="end" class="tiny">${rowValue}</text>${each}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:10px monospace;fill:#243746}.cell{font:700 13px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="23" class="title">${title}</text><text x="16" y="42" class="sub">post snapshot ${POST} · D containment · P staff deck · R retained rail · L retained ladder · W fluid</text>${labels}${body}</svg>`;
};
const evidence = { schemaVersion: 1, id: 'cobalt-wl-paired-staff-platforms-01-coordinate-map-evidence', readOnly: true, worldMutated: false, postBinding: { ledger: { path: LEDGER, sha256: sha(ledgerBytes) }, manifest: { path: MANIFEST, sha256: sha(manifestBytes) }, postSnapshot: { root: POST, capture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId }, identity: ledger.postSnapshot.identity } }, geometry: { plan: { y: 13, x: [-254, -237], z: [-461, -452] }, section: { x: -250, y: [12, 19], z: [-462, -451] } }, containmentBeforeAccess: { containmentChecks: checks, fluidCellsInContainmentEnvelope: fluids, pass: checks.every(({ pass }) => pass) && fluids.length === 0, rule: 'The added outer wall and deck are proven before the second clear walking envelope; the retained rail tubes and ladder remain exact.' }, operationalBoundary: { pairedTwoWideStaffPlatformsConnected: true, publicPlatformCommissioned: false, railPowerCommissioned: false, signalCommissioned: false, passengerServiceCommissioned: false } };
evidence.evidenceSha256 = sha(JSON.stringify(evidence));
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'paired-staff-platform-plan-y13.svg')), svg('Westlight paired staff platforms — plan at Y=13', plan, 'z', xPlan));
fs.writeFileSync(abs(path.join(OUT, 'paired-staff-platform-section-x250.svg')), svg('Westlight paired staff platforms — section at X=-250', section, 'y', sectionZ));
fs.writeFileSync(abs(path.join(OUT, 'paired-staff-platform-evidence.json')), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'README.md')), `# Westlight paired staff platforms — coordinate maps\n\nBound post snapshot: \`${POST}\`. Both maps are read-only renderings of the verified post state.\n\n- [Plan at Y=13](paired-staff-platform-plan-y13.svg)\n- [Section at X=-250](paired-staff-platform-section-x250.svg)\n- [Binding and containment-before-access evidence](paired-staff-platform-evidence.json)\n\nThe south platform's new outer wall and deck are verified before its second clear walking envelope. Both rail tubes and the retained inspection ladder are exact. This is staff-only passive-rail inspection infrastructure; it does not commission a public platform, rail power, signalling, or passenger service.\n`);
console.log(JSON.stringify({ status: 'PASS_PUBLISHED_READ_ONLY_PAIRED_STAFF_PLATFORM_MAPS', out: rel(OUT), evidenceSha256: evidence.evidenceSha256, postSnapshot: POST }, null, 2));
