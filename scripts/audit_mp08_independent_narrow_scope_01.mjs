#!/usr/bin/env node
/**
 * MP08 independent narrow-scope audit.
 *
 * Read only. It does not infer a whole Raven Rock census. It checks every
 * currently identified *independent narrow* MP08 candidate from the current
 * ledger against one complete immutable source: the accepted C1 containment
 * package, the accepted T1b wayfinding pair, the reverted non-defect lighting
 * cells, and the C2 wet boundary. A report of no candidate therefore means no
 * new release among this complete, explicitly enumerated set—not a claim that
 * every unobserved block in Raven Rock has been designed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp08-c1-lighting-correction-rollback-post-20260827T000600Z');
const OUT = option('--out', 'data/world-review/mp08-independent-narrow-scope-audit-01-c1-lighting-correction-post-20260827T000600Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP08 narrow-scope audit rejected: ${message}`); };
const stateName = (state) => String(state).split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');

const sourceRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(sourceRoot, member)), `missing complete immutable source member ${member}`);
const capturePath = path.join(sourceRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not an immutable complete save');
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh directory');

const reader = new AnvilReader(path.join(sourceRoot, 'region')); const cache = new Map();
async function at(cell) {
  const key = `${cell.x},${cell.y},${cell.z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
}
function parseReplFile(file) {
  const entries = [];
  for (const line of fs.readFileSync(abs(file), 'utf8').split('\n')) {
    if (!line.startsWith('REPL ')) continue;
    const fields = line.trim().split(/\s+/);
    fail(fields.length === 9, `unparseable REPL line in ${file}: ${line}`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    fail(x1 === x2 && y1 === y2 && z1 === z2, `non-unit REPL unsupported in ${file}`);
    entries.push({ cell: { x: x1, y: y1, z: z1 }, sourceState: fields[7], targetState: fields[8] });
  }
  fail(entries.length > 0, `no REPL entries in ${file}`);
  return entries;
}
async function currentDisposition(id, file) {
  const entries = parseReplFile(file); const observations = [];
  for (const entry of entries) observations.push({ ...entry, observedState: await at(entry.cell) });
  const sourceMatches = observations.filter((entry) => entry.observedState === entry.sourceState);
  const targetMatches = observations.filter((entry) => entry.observedState === entry.targetState);
  fail(sourceMatches.length === 0 && targetMatches.length === entries.length,
    `${id} is not completely as-built in supplied current source; sourceMatches=${sourceMatches.length}, targetMatches=${targetMatches.length}, total=${entries.length}`);
  return {
    id, operationFile: rel(file), operationCount: entries.length,
    currentSourceGuardPasses: sourceMatches.length,
    currentTargetExactCount: targetMatches.length,
    disposition: 'ALREADY_AS_BUILT_NO_DUPLICATE_NARROW_RELEASE',
    coordinateStateSha256: sha(observations.map(({ cell, observedState }) => `${cell.x},${cell.y},${cell.z}=${observedState}`).sort().join('\n')),
  };
}

const c1Packages = [];
for (const [id, file] of [
  ['c1-core-liner', 'data/buildops/mp08-c1-sealed-containment-corridor-01.c1-core-liner.forward.txt'],
  ['cavern-a-vestibule', 'data/buildops/mp08-c1-sealed-containment-corridor-01.cavern-a-vestibule.forward.txt'],
  ['cavern-b-vestibule', 'data/buildops/mp08-c1-sealed-containment-corridor-01.cavern-b-vestibule.forward.txt'],
]) c1Packages.push(await currentDisposition(id, file));
fail(c1Packages.reduce((total, entry) => total + entry.operationCount, 0) === 932, 'C1 known operation total drifted');

const t1b = await currentDisposition('rr-t1b-wayfinding-block-states', 'data/buildops/mp08-rr-t1b-two-wall-sign-wayfinding-live-20260826T104858Z.two-wall-signs.forward.txt');
fail(t1b.operationCount === 2, 'T1b known target count drifted');

const correctionCells = [
  [-2, -9, 72], [2, -9, 64], [-2, -9, 56], [2, -9, 48],
  [-2, -9, 40], [2, -9, 32], [2, -9, 24], [2, -9, 16],
].map(([x, y, z]) => ({ x, y, z }));
const correctionStates = await Promise.all(correctionCells.map(async (cell) => ({ cell, state: await at(cell) })));
fail(correctionStates.every(({ state }) => state === 'minecraft:polished_deepslate'), 'reverted C1 inspection-lighting cells drifted from restored non-fixture state');

const c2Cap = [];
for (let y = -11; y <= -4; y += 1) for (let z = -15; z <= -11; z += 1) c2Cap.push({ x: -80, y, z, expected: y === -5 && z === -13 ? 'minecraft:deepslate_gold_ore' : 'minecraft:stone_bricks' });
for (let y = -10; y <= -4; y += 1) for (let z = -18; z <= -16; z += 1) c2Cap.push({ x: -80, y, z, expected: 'minecraft:stone_bricks' });
const c2CapObserved = await Promise.all(c2Cap.map(async (entry) => ({ ...entry, observed: await at(entry) })));
const c2CapMismatch = c2CapObserved.filter(({ expected, observed }) => expected !== observed);
fail(c2CapMismatch.length === 0, `C2 containment cap drifted at ${c2CapMismatch.length} cells`);
let c2FluidCellCount = 0;
for (let x = -125; x <= -70; x += 1) for (let y = -25; y <= -3; y += 1) for (let z = -25; z <= -2; z += 1) {
  if (fluid(await at({ x, y, z }))) c2FluidCellCount += 1;
}
fail(c2FluidCellCount > 0, 'C2 no longer has its required wet-boundary census; this audit needs a new classification rather than a stale no-scope conclusion');

const reportBase = {
  schemaVersion: 1,
  id: 'MP08-INDEPENDENT-NARROW-SCOPE-AUDIT-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'NO_IDENTIFIED_INDEPENDENT_NARROW_EXECUTABLE_SCOPE',
  mode: 'READ_ONLY_SOURCE_BOUND_AUDIT',
  mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, rconCallsPerformed: false },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, completePlanes: ['region', 'entities', 'poi', 'level.dat'] },
  reviewedIndependentNarrowScopeSet: {
    c1SealedContainment: { totalHistoricalForwardOperations: 932, packages: c1Packages, result: 'ALL_932_TARGETS_CURRENTLY_EXACT; not a duplicate-build candidate' },
    rrT1bWayfinding: { ...t1b, result: 'BOTH_CURRENT_BLOCK_TARGETS_EXACT; no third-party widening or endpoint inference' },
    c1InspectionLighting: { restoredCellCount: correctionStates.length, restoredState: 'minecraft:polished_deepslate', functionalDisposition: 'The accepted correction record says no documented lighting/legibility defect; no replacement fixture package is proposed.' },
    c2CavernBoundary: { capCellCount: c2Cap.length, capMismatchCount: c2CapMismatch.length, currentWetCensusCellCount: c2FluidCellCount, result: 'CLOSED_WET_BOUNDARY; no local patch is promoted without a finite containment/receiver/rollback design.' },
  },
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_PACKAGE_EMITTED',
    exactMeaning: 'No new independently executable narrow physical scope exists among the complete reviewed MP08 candidate set above. This report makes no claim about unobserved Raven Rock fabric and does not turn a wet C2 boundary into a release.',
    nextPhysicalPrerequisite: 'Identify a new functional defect or a finite fluid/gravity containment boundary with exact owner, target/halo, receiver or overflow treatment, inverse, and fresh guarded kernel.',
  },
  nonClaims: ['No Raven Rock whole-complex completion.', 'No C2/Cavern C opening, fluid displacement, public access, egress, transport, or route classification.', 'No world mutation or release authority.'],
};
const report = { ...reportBase, identitySha256: sha(`${JSON.stringify(reportBase, null, 2)}\n`) };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp08-independent-narrow-scope-audit-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'MP08-INDEPENDENT-NARROW-SCOPE-AUDIT-01.md'), `# MP08 independent narrow-scope audit 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only source-bound audit; no release authority.\n\nThe supplied complete immutable capture confirms that the entire known **932-cell** C1 sealed-containment package is already at its canonical target state, and the two known RR-T1b wayfinding block targets are already exact. The eight reverted C1 inspection-lighting cells remain restored to polished deepslate; the acceptance record identifies no functional defect for a replacement.\n\nThe C2 cap remains exact at **${c2Cap.length}** cells, while its reviewed C2 bounds still contain **${c2FluidCellCount}** fluid/waterlogged cells. A wet-boundary patch is not a standalone package without a finite closure, receiver/overflow, and inverse design.\n\nAccordingly no new independent narrow scope is emitted from the explicitly reviewed candidate set. This is not a whole-Raven-Rock completion claim.\n`);
console.log(JSON.stringify({ status: report.status, report: rel(out), c1AsBuiltCells: 932, t1bAsBuiltCells: 2, restoredLightingCells: correctionCells.length, c2WetCensusCells: c2FluidCellCount, mutationAuthority: false }, null, 2));
