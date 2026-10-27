#!/usr/bin/env node
/** Read-only, immutable-post coordinate publication for the executed B08 surface recovery landing. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z';
const LEDGER = 'data/world-review/mp02-b08-surface-recovery-landing-live-20260827T005500Z/evidence-ledger.json';
const MANIFEST = 'data/buildops/mp02-b08-surface-recovery-landing-01.release-manifest.json';
const OUT = 'docs/masterplans/05-combined-zones/02-visuals/mp02-b08-surface-recovery-landing-01';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`B08 surface recovery landing map rejected: ${message}`); };
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
const box = (x1, x2, y1, y2, z1, z2) => {
  const result = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) result.push({ x, y, z });
  return result;
};
const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:scaffolding', 'minecraft:anvil']);
const symbol = (state) => {
  if (state === 'minecraft:air') return '.';
  if (stateName(state) === 'minecraft:polished_deepslate') return 'G';
  if (stateName(state) === 'minecraft:polished_andesite') return 'D';
  if (stateName(state) === 'minecraft:polished_diorite') return 'P';
  if (stateName(state) === 'minecraft:ladder') return 'L';
  if (fluid(state)) return 'W';
  if (gravity.has(stateName(state))) return 'F';
  return '#';
};
const same = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'release ledger is not executed/post-verified');
fail(ledger.releaseNodeId === 'CZ-MP02-B08-SURFACE-RECOVERY-LANDING' && ledger.transactionId === 'mp02-b08-surface-recovery-landing-01', 'release identity drifted');
fail(ledger.manifest?.sha256 === sha(manifestBytes), 'ledger manifest binding drifted');
fail(abs(ledger.postSnapshot?.root) === abs(POST) && abs(ledger.postSnapshot?.regions) === abs(path.join(POST, 'region')), 'ledger does not bind this immutable post snapshot');
fail(same(manifest.executionOrder?.forward ?? [], ['recovery-landing-deck', 'surface-turnback-guard-containment']), 'deck-before-guard forward order drifted');
fail(same(manifest.executionOrder?.rollback ?? [], ['surface-turnback-guard-containment', 'recovery-landing-deck']), 'guard-before-deck rollback order drifted');
const identityPath = ledger.postSnapshot?.identity?.path;
fail(identityPath && sha(fs.readFileSync(abs(identityPath))) === ledger.postSnapshot.identity.sha256, 'post snapshot identity drifted');
const capturePath = path.join(abs(POST), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'post snapshot is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(abs(POST), member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `post member drifted: ${member.path}`);
}
for (const stage of [
  'strict-forward-execution:recovery-landing-deck',
  'strict-forward-execution:surface-turnback-guard-containment',
  'fresh-post-complete-save',
  'rollback-poststate-preflight:surface-turnback-guard-containment',
  'rollback-poststate-preflight:recovery-landing-deck',
]) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `missing ledger stage: ${stage}`);

const reader = new AnvilReader(path.join(abs(POST), 'region'));
const get = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const deck = box(2003, 2005, 207, 207, -749, -747);
const guards = uniqueCells([
  ...box(2002, 2002, 208, 209, -749, -747),
  ...box(2003, 2005, 208, 209, -750, -750),
  ...box(2003, 2005, 208, 209, -746, -746),
]);
const clear = box(2003, 2005, 208, 209, -749, -747);
const interaction = uniqueCells([...deck, ...guards, ...clear]);
const targetKeys = new Set(interaction.map(cellKey));
const halo = uniqueCells(interaction.flatMap(({ x, y, z }) => [
  { x: x + 1, y, z }, { x: x - 1, y, z }, { x, y: y + 1, z }, { x, y: y - 1, z }, { x, y, z: z + 1 }, { x, y, z: z - 1 },
]));
const envelope = uniqueCells([...interaction, ...halo]);
const exactCheck = async (label, cells, expected) => {
  const observed = await Promise.all(cells.map(async ({ x, y, z }) => get(x, y, z)));
  const failures = observed.filter((state) => state !== expected).length;
  return { label, expected, cellCount: cells.length, failures, pass: failures === 0 };
};
const checks = await Promise.all([
  exactCheck('3x3 recovery deck', deck, 'minecraft:polished_andesite'),
  exactCheck('turnback guard containment', guards, 'minecraft:polished_deepslate'),
  exactCheck('two-high clear landing', clear, 'minecraft:air'),
]);
const envelopeHazards = [];
for (const cell of envelope) {
  const state = await get(cell.x, cell.y, cell.z);
  if (fluid(state) || gravity.has(stateName(state))) envelopeHazards.push({ cell, state, kind: fluid(state) ? 'fluid' : 'gravity' });
}
const ladder = { x: 2008, y: 129, z: -748, expected: 'minecraft:ladder[facing=west,waterlogged=false]' };
const backing = { x: 2007, y: 129, z: -748, expected: 'minecraft:polished_diorite' };
const retainedShaftInterface = [
  { ...ladder, state: await get(ladder.x, ladder.y, ladder.z) },
  { ...backing, state: await get(backing.x, backing.y, backing.z) },
];
fail(checks.every(({ pass }) => pass), `post state mismatch: ${checks.filter(({ pass }) => !pass).map(({ label }) => label).join(', ')}`);
fail(envelopeHazards.length === 0, 'fluid/gravity exists in landing interaction envelope');
fail(retainedShaftInterface.every(({ expected, state }) => state === expected), 'retained shaft ladder/backing drifted');

const planX = range(2001, 2009);
const planZ = range(-751, -745);
const plan = [];
for (const z of planZ) plan.push({ z, cells: await Promise.all(planX.map(async (x) => ({ x, state: await get(x, 207, z) }))) });
const sectionX = range(2001, 2009);
const sectionY = range(205, 211).reverse();
const section = [];
for (const y of sectionY) section.push({ y, cells: await Promise.all(sectionX.map(async (x) => ({ x, state: await get(x, y, -748) }))) });
const shaftX = range(2005, 2010);
const shaftZ = range(-750, -746);
const shaftPlan = [];
for (const z of shaftZ) shaftPlan.push({ z, cells: await Promise.all(shaftX.map(async (x) => ({ x, state: await get(x, 129, z) }))) });
const svg = (title, subtitle, rows, axis, values) => {
  const size = 28; const left = 108; const top = 76;
  const width = left + values.length * size + 35; const height = top + rows.length * size + 76;
  const colors = { '.': '#e8eef4', G: '#273b4b', D: '#8297aa', P: '#b9c7d0', L: '#c69b3a', W: '#1670b7', F: '#bd6a47', '#': '#66717d' };
  const labels = values.map((value, index) => `<text x="${left + index * size + 14}" y="61" text-anchor="middle" class="tiny">${value}</text>`).join('');
  const body = rows.map((row, rowIndex) => {
    const label = axis === 'z' ? row.z : row.y;
    const cells = row.cells.map((cell, index) => `<rect x="${left + index * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${colors[symbol(cell.state)]}"/><text x="${left + index * size + 14}" y="${top + rowIndex * size + 19}" text-anchor="middle" class="cell">${symbol(cell.state)}</text>`).join('');
    return `<text x="${left - 10}" y="${top + rowIndex * size + 19}" text-anchor="end" class="tiny">${label}</text>${cells}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:10px monospace;fill:#243746}.cell{font:700 14px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="24" class="title">${title}</text><text x="16" y="43" class="sub">${subtitle}</text>${labels}${body}</svg>`;
};

const evidence = {
  schemaVersion: 1,
  id: 'mp02-b08-surface-recovery-landing-01-coordinate-map-evidence',
  readOnly: true,
  worldMutated: false,
  postBinding: {
    ledger: { path: LEDGER, sha256: sha(ledgerBytes) },
    manifest: { path: MANIFEST, sha256: sha(manifestBytes) },
    postSnapshot: { root: POST, capture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId }, identity: ledger.postSnapshot.identity },
  },
  geometry: {
    plan: { y: 207, x: [2001, 2009], z: [-751, -745] },
    section: { z: -748, x: [2001, 2009], y: [205, 211] },
    shaftInterfaceInset: { y: 129, x: [2005, 2010], z: [-750, -746] },
    recoveryDeck: { cellCount: deck.length, bounds: manifest.scope.recoveryDeck.bounds },
    guardContainment: { cellCount: guards.length, bounds: manifest.scope.guardContainment.bounds },
    clearLanding: { cellCount: clear.length, bounds: manifest.scope.clearLanding.bounds },
  },
  deckBeforeGuard: {
    requiredForwardOrder: ['recovery-landing-deck', 'surface-turnback-guard-containment'],
    recordedForwardOrder: manifest.executionOrder.forward,
    requiredRollbackOrder: ['surface-turnback-guard-containment', 'recovery-landing-deck'],
    recordedRollbackOrder: manifest.executionOrder.rollback,
    checks,
    pass: checks.every(({ pass }) => pass),
  },
  retainedShaftLadderAndBacking: { cells: retainedShaftInterface, pass: retainedShaftInterface.every(({ expected, state }) => state === expected) },
  dryNoGravityEnvelope: {
    interactionCellCount: interaction.length,
    haloCellCount: halo.length,
    envelopeCellCount: envelope.length,
    fluidOrGravityRecords: envelopeHazards,
    pass: envelopeHazards.length === 0,
    rule: 'The exact landing interaction and one-cell face-neighbor envelope contain neither fluid/waterlogging nor the declared falling/gravity states.',
  },
  operationalBoundary: {
    purpose: manifest.scope.purpose,
    publicAccessCommissioned: manifest.scope.publicAccessCommissioned === true,
    emergencyEgressCommissioned: manifest.scope.emergencyEgressCommissioned === true,
    terrainRouteCommissioned: manifest.scope.terrainRouteCommissioned === true,
    nonClaims: manifest.safetyBoundary.nonClaims,
  },
};
evidence.evidenceSha256 = sha(JSON.stringify(evidence));
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'surface-recovery-landing-plan-y207.svg')), svg('B08 surface recovery landing — plan at Y=207', 'Immutable post snapshot · D recovery deck · G guard containment · L retained shaft ladder · W fluid · F gravity', plan, 'z', planX));
fs.writeFileSync(abs(path.join(OUT, 'surface-recovery-landing-section-z748.svg')), svg('B08 surface recovery landing — section at Z=-748', 'Deck installed before guard containment; open east shaft handoff remains controlled crew-only infrastructure', section, 'y', sectionX));
fs.writeFileSync(abs(path.join(OUT, 'surface-recovery-landing-shaft-interface-y129.svg')), svg('B08 retained shaft interface — plan at Y=129', 'L exact retained ladder at (2008,129,-748) · P exact polished-diorite backing at (2007,129,-748)', shaftPlan, 'z', shaftX));
fs.writeFileSync(abs(path.join(OUT, 'surface-recovery-landing-evidence.json')), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'README.md')), `# MP02 B08 surface recovery landing — coordinate maps\n\nBound post snapshot: \`${POST}\`. These are read-only renderings of the executed, post-verified landing.\n\n- [Surface plan at Y=207](surface-recovery-landing-plan-y207.svg)\n- [Surface section at Z=-748](surface-recovery-landing-section-z748.svg)\n- [Retained shaft ladder/backing inset at Y=129](surface-recovery-landing-shaft-interface-y129.svg)\n- [Post binding and safety evidence](surface-recovery-landing-evidence.json)\n\nThe supported 3×3 deck was executed before the 18-cell turnback guard containment, with guards removed before deck restoration in the inverse order. The retained shaft ladder and polished-diorite backing remain exact. The 116-cell interaction-plus-face-neighbor envelope has zero fluid and zero declared gravity states. This is crew recovery/turnback infrastructure only: it does not commission public access, emergency egress, a terrain route, B03/B09 connection, rail, or power.\n`);
console.log(JSON.stringify({ status: 'PASS_PUBLISHED_READ_ONLY_MP02_B08_SURFACE_RECOVERY_LANDING_MAPS', out: rel(OUT), evidenceSha256: evidence.evidenceSha256, postSnapshot: POST }, null, 2));
