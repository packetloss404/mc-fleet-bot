#!/usr/bin/env node
/**
 * Render coordinate-level evidence maps for the executed R05 west-toe lava
 * plug and the executed Ravensreach crew recovery system.  This is a
 * read-only documentation generator: it opens immutable copied post
 * snapshots only and never contacts Minecraft, RCON, or the fleet API.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const R05_LEDGER = arg('--r05-ledger', 'data/world-review/mp05-r05-west-toe-lava-plug-live-20260826T223500Z/evidence-ledger.json');
const CREW_LEDGER = arg('--crew-ledger', 'data/world-review/cobalt-rr-midshaft-recovery-lighting-live-20260826T232000Z/evidence-ledger.json');
const OUT = arg('--out-dir', 'data/world-review/r05-rr-crew-evidence-maps-20260826T232000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => { if (!value) throw new Error(`R05/RR evidence mapbook rejected: ${message}`); };
const key = ({ x, y, z }) => `${x},${y},${z}`;
const box = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const verifySnapshot = (ledgerPath, expectedTransactionId) => {
  const ledger = readJson(ledgerPath);
  fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', `${ledgerPath} is not an executed reversible ledger`);
  fail(ledger.transactionId === expectedTransactionId, `${ledgerPath} transaction drifted`);
  const snapshot = ledger.postSnapshot?.root;
  fail(snapshot && fs.existsSync(abs(snapshot)), `${ledgerPath} post snapshot missing`);
  const capturePath = path.join(abs(snapshot), 'combined-zones-complete-save-capture.json');
  fail(fs.existsSync(capturePath), `${snapshot} immutable capture missing`);
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), `${snapshot} is not sealed immutable evidence`);
  for (const member of capture.requiredMembers) {
    const memberPath = path.join(abs(snapshot), member.path);
    fail(fs.existsSync(memberPath), `${snapshot} capture member missing: ${member.path}`);
    const bytes = fs.readFileSync(memberPath);
    fail(bytes.length === member.bytes && sha(bytes) === member.sha256, `${snapshot} capture member drifted: ${member.path}`);
  }
  const intake = ledger.postSnapshot?.completeSaveIntake?.path;
  fail(intake && fs.existsSync(abs(intake)), `${ledgerPath} post intake missing`);
  const intakeJson = readJson(intake);
  fail(intakeJson.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', `${ledgerPath} post intake did not pass`);
  fail(rel(intakeJson.input?.suppliedWorldRoot) === rel(snapshot), `${ledgerPath} post intake snapshot mismatch`);
  return { ledger, snapshot, capture, intake };
};

const r05 = verifySnapshot(R05_LEDGER, 'mp05-r05-west-toe-lava-plug-01');
const crew = verifySnapshot(CREW_LEDGER, 'cobalt-rr-midshaft-recovery-lighting-01');
const r05Reader = new AnvilReader(path.join(abs(r05.snapshot), 'region'));
const crewReader = new AnvilReader(path.join(abs(crew.snapshot), 'region'));
const state = async (reader, cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const parseSetblockCells = (filename) => fs.readFileSync(abs(filename), 'utf8').split('\n').flatMap((line) => {
  const match = line.match(/^(?:REPL|fill)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+\1\s+\2\s+\3\s+/);
  return match ? [{ x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) }] : [];
});
const r05Forward = r05.ledger.packages?.[0]?.forward?.path;
fail(r05Forward && fs.existsSync(abs(r05Forward)), 'R05 forward operation evidence missing');
const lavaPlugCells = parseSetblockCells(r05Forward);
fail(lavaPlugCells.length === 36, `R05 operation evidence expected 36 cells, found ${lavaPlugCells.length}`);
const lavaPlugStates = await Promise.all(lavaPlugCells.map((cell) => state(r05Reader, cell)));
fail(lavaPlugStates.every((value) => value === 'minecraft:deepslate_tiles'), 'R05 post snapshot no longer has the exact 36-cell deepslate plug');
const lavaPlugSet = new Set(lavaPlugCells.map(key));

const crewSets = {
  northDeck: box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -385, maxZ: -384 }),
  southDeck: box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -379, maxZ: -378 }),
  eastDeck: box({ minX: -163, maxX: -163, minY: 13, maxY: 13, minZ: -384, maxZ: -378 }),
  westDeck: box({ minX: -182, maxX: -182, minY: 13, maxY: 13, minZ: -384, maxZ: -378 }),
  eastClear: box({ minX: -163, maxX: -163, minY: 14, maxY: 16, minZ: -384, maxZ: -378 }),
  westClear: box({ minX: -182, maxX: -182, minY: 14, maxY: 16, minZ: -384, maxZ: -378 }),
  eastWall: box({ minX: -162, maxX: -162, minY: 13, maxY: 16, minZ: -384, maxZ: -378 }),
  westWall: box({ minX: -183, maxX: -183, minY: 13, maxY: 16, minZ: -384, maxZ: -378 }),
  nicheClear: box({ minX: -161, maxX: -159, minY: 14, maxY: 16, minZ: -383, maxZ: -381 }),
  nicheAperture: box({ minX: -162, maxX: -162, minY: 14, maxY: 16, minZ: -382, maxZ: -382 }),
  nicheFloor: box({ minX: -161, maxX: -159, minY: 13, maxY: 13, minZ: -383, maxZ: -381 }),
  nicheCeiling: box({ minX: -161, maxX: -159, minY: 17, maxY: 17, minZ: -383, maxZ: -381 }),
  rail: [
    ...box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -386, maxZ: -386 }),
    ...box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -380, maxZ: -380 }),
  ],
  crossoverClear: box({ minX: -156, maxX: -154, minY: 46, maxY: 48, minZ: -390, maxZ: -389 }),
  crossoverFloor: box({ minX: -156, maxX: -154, minY: 45, maxY: 45, minZ: -390, maxZ: -389 }),
  crossoverCeiling: box({ minX: -156, maxX: -154, minY: 49, maxY: 49, minZ: -390, maxZ: -389 }),
  crossoverNorth: box({ minX: -156, maxX: -154, minY: 45, maxY: 49, minZ: -391, maxZ: -391 }),
  crossoverSouth: box({ minX: -156, maxX: -154, minY: 45, maxY: 49, minZ: -388, maxZ: -388 }),
  leftLadder: box({ minX: -159, maxX: -159, minY: 46, maxY: 48, minZ: -390, maxZ: -390 }),
  rightLadder: box({ minX: -151, maxX: -151, minY: 46, maxY: 48, minZ: -390, maxZ: -390 }),
  waterBand: box({ minX: -160, maxX: -150, minY: 33, maxY: 39, minZ: -393, maxZ: -387 }),
};
const eastWallRetained = crewSets.eastWall.filter((cell) => !new Set(crewSets.nicheAperture.map(key)).has(key(cell)));
const eastReturnLighting = [{ x: -162, y: 15, z: -383 }, { x: -162, y: 15, z: -380 }];
const eastWallDeepslate = eastWallRetained.filter((cell) => !new Set(eastReturnLighting.map(key)).has(key(cell)));
const crossoverLighting = [{ x: -155, y: 49, z: -390 }, { x: -155, y: 49, z: -389 }];
const crossoverCeilingDeepslate = crewSets.crossoverCeiling.filter((cell) => !new Set(crossoverLighting.map(key)).has(key(cell)));
const assertExact = async (name, cells, expected) => {
  const states = await Promise.all(cells.map((cell) => state(crewReader, cell)));
  fail(states.every((value) => value === expected), `${name} post state drifted from ${expected}`);
  return states.length;
};
await Promise.all([
  assertExact('north platform deck', crewSets.northDeck, 'minecraft:polished_andesite'),
  assertExact('south platform deck', crewSets.southDeck, 'minecraft:polished_andesite'),
  assertExact('east return deck', crewSets.eastDeck, 'minecraft:polished_andesite'),
  assertExact('west return deck', crewSets.westDeck, 'minecraft:polished_andesite'),
  assertExact('east return clear path', crewSets.eastClear, 'minecraft:air'),
  assertExact('west return clear path', crewSets.westClear, 'minecraft:air'),
  assertExact('east return retained wall', eastWallDeepslate, 'minecraft:polished_deepslate'),
  assertExact('east return passive lighting', eastReturnLighting, 'minecraft:sea_lantern'),
  assertExact('west return wall', crewSets.westWall, 'minecraft:polished_deepslate'),
  assertExact('recovery niche clear', crewSets.nicheClear, 'minecraft:air'),
  assertExact('recovery niche aperture', crewSets.nicheAperture, 'minecraft:air'),
  assertExact('recovery niche floor', crewSets.nicheFloor, 'minecraft:polished_andesite'),
  assertExact('recovery niche ceiling', crewSets.nicheCeiling, 'minecraft:polished_deepslate'),
  assertExact('retained rail', crewSets.rail, 'minecraft:rail[shape=east_west,waterlogged=false]'),
  assertExact('crossover clear', crewSets.crossoverClear, 'minecraft:air'),
  assertExact('crossover floor', crewSets.crossoverFloor, 'minecraft:polished_andesite'),
  assertExact('crossover retained ceiling', crossoverCeilingDeepslate, 'minecraft:polished_deepslate'),
  assertExact('crossover passive lighting', crossoverLighting, 'minecraft:sea_lantern'),
  assertExact('crossover north shell', crewSets.crossoverNorth, 'minecraft:polished_deepslate'),
  assertExact('crossover south shell', crewSets.crossoverSouth, 'minecraft:polished_deepslate'),
  assertExact('left retained ladder', crewSets.leftLadder, 'minecraft:ladder[facing=east,waterlogged=false]'),
  assertExact('right retained ladder', crewSets.rightLadder, 'minecraft:ladder[facing=west,waterlogged=false]'),
]);
const waterBandStates = await Promise.all(crewSets.waterBand.map((cell) => state(crewReader, cell)));
const waterBandWaterCount = waterBandStates.filter((value) => value.startsWith('minecraft:water')).length;
fail(waterBandWaterCount > 0, 'historical water sleeve map window contains no observed water');
const prohibitedWetCells = [...crewSets.crossoverClear, ...crewSets.leftLadder, ...crewSets.rightLadder];
const prohibitedWetStates = await Promise.all(prohibitedWetCells.map((cell) => state(crewReader, cell)));
const isLiveFluid = (value) => value.startsWith('minecraft:water') || value.startsWith('minecraft:lava') || value.startsWith('minecraft:bubble_column');
fail(prohibitedWetStates.every((value) => !isLiveFluid(value)), 'water/lava reached the crossover clearance or retained ladders');

const cellCategory = (value) => {
  if (value === 'minecraft:air') return '#1d2939';
  if (value.startsWith('minecraft:water')) return '#1387c9';
  if (value.startsWith('minecraft:lava')) return '#e25822';
  if (value.includes('rail')) return '#facc15';
  if (value.includes('ladder')) return '#dc8f35';
  if (value.includes('polished_andesite')) return '#d7dde4';
  if (value.includes('polished_deepslate') || value.includes('deepslate_tiles')) return '#526277';
  return '#8b99aa';
};
const style = `<style>text{font-family:Inter,Arial,sans-serif;fill:#e8edf5}.title{font-size:22px;font-weight:800}.subtitle{font-size:15px;font-weight:700}.axis{font-size:10px;fill:#b5c0d2}.note{font-size:13px;fill:#d4dce9}.legend{font-size:12px;fill:#d4dce9}</style>`;
const legend = (items, y) => items.map(([fill, label], index) => {
  const x = 38 + index * 160;
  return `<rect x="${x}" y="${y}" width="13" height="13" fill="${fill}"/><text class="legend" x="${x + 19}" y="${y + 11}">${escape(label)}</text>`;
}).join('');
const svgWrap = (width, height, title, content, note, legendItems) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${style}<rect width="100%" height="100%" fill="#0b1220"/><text class="title" x="38" y="32">${escape(title)}</text>${content}<text class="note" x="38" y="${height - 44}">${escape(note)}</text>${legend(legendItems, height - 28)}</svg>`;
const drawPlan = async ({ reader, bounds, y, overlays, title, note }) => {
  const unit = 24; const left = 84; const top = 75;
  const width = left + (bounds.maxX - bounds.minX + 1) * unit + 38;
  const height = top + (bounds.maxZ - bounds.minZ + 1) * unit + 98;
  const rendered = [];
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    const cell = { x, y, z }; const value = await state(reader, cell); const overlay = overlays.find((entry) => entry.cells.has(key(cell)));
    const px = left + (x - bounds.minX) * unit; const py = top + (z - bounds.minZ) * unit;
    rendered.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" fill="${overlay?.fill ?? cellCategory(value)}" stroke="${overlay?.stroke ?? '#0f172a'}" stroke-width="${overlay ? 2 : .55}"><title>${escape(`${x},${y},${z} — ${value}${overlay ? ` — ${overlay.label}` : ''}`)}</title></rect>`);
  }
  for (let x = bounds.minX; x <= bounds.maxX; x += 2) rendered.push(`<text class="axis" x="${left + (x - bounds.minX) * unit}" y="${top - 8}">${x}</text>`);
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) rendered.push(`<text class="axis" x="${left - 48}" y="${top + (z - bounds.minZ) * unit + 15}">${z}</text>`);
  return svgWrap(width, height, title, rendered.join(''), note, [['#facc15', 'retained rail'], ['#d7dde4', 'deck/floor'], ['#1d2939', 'air clearance'], ['#526277', 'sealed wall'], ['#1387c9', 'water']]);
};
const drawSection = async ({ bounds, xValues, title, note, overlays }) => {
  const unit = 24; const left = 90; const top = 78; const minY = bounds.minY; const maxY = bounds.maxY;
  const width = left + (bounds.maxZ - bounds.minZ + 1) * unit + 40; const height = top + (maxY - minY + 1) * unit + 98;
  const rendered = [];
  for (let y = maxY; y >= minY; y -= 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    const cells = await Promise.all(xValues.map((x) => state(crewReader, { x, y, z })));
    const cell = { x: xValues[0], y, z }; const overlay = overlays.find((entry) => entry.cells.has(key(cell)));
    const px = left + (z - bounds.minZ) * unit; const py = top + (maxY - y) * unit;
    rendered.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" fill="${overlay?.fill ?? cellCategory(cells[0])}" stroke="${overlay?.stroke ?? '#0f172a'}" stroke-width="${overlay ? 2 : .55}"><title>${escape(`x=${xValues.join('..')}, y=${y}, z=${z} — ${cells.join(' | ')}${overlay ? ` — ${overlay.label}` : ''}`)}</title></rect>`);
  }
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) rendered.push(`<text class="axis" x="${left + (z - bounds.minZ) * unit}" y="${top - 8}">${z}</text>`);
  for (let y = maxY; y >= minY; y -= 1) rendered.push(`<text class="axis" x="${left - 42}" y="${top + (maxY - y) * unit + 15}">${y}</text>`);
  return svgWrap(width, height, title, rendered.join(''), note, [['#d7dde4', 'floor'], ['#1d2939', 'air clearance'], ['#526277', 'shell'], ['#dc8f35', 'ladder'], ['#1387c9', 'water sleeve']]);
};

const asSet = (cells) => new Set(cells.map(key));
const crewPlan = await drawPlan({
  reader: crewReader, y: 13, bounds: { minX: -184, maxX: -157, minZ: -388, maxZ: -376 },
  overlays: [
    { cells: asSet(crewSets.northDeck), fill: '#d7dde4', stroke: '#f8fafc', label: 'north crew deck' },
    { cells: asSet(crewSets.southDeck), fill: '#d7dde4', stroke: '#f8fafc', label: 'south crew deck' },
    { cells: asSet(crewSets.eastDeck), fill: '#60a5fa', stroke: '#dbeafe', label: 'east return deck' },
    { cells: asSet(crewSets.westDeck), fill: '#a78bfa', stroke: '#ede9fe', label: 'west return deck' },
    { cells: asSet(crewSets.nicheFloor), fill: '#34d399', stroke: '#d1fae5', label: 'recovery niche floor' },
  ],
  title: 'Ravensreach crew system — y=13 post-state plan',
  note: 'Exact coordinate map from the latest crew post snapshot. Blue=east return; purple=west return; green=recovery niche. No public/passenger commissioning claim.',
});
const nichePlan = await drawPlan({
  reader: crewReader, y: 14, bounds: { minX: -164, maxX: -157, minZ: -386, maxZ: -378 },
  overlays: [
    { cells: asSet(crewSets.eastClear), fill: '#60a5fa', stroke: '#dbeafe', label: 'east return air clearance' },
    { cells: asSet(crewSets.westClear), fill: '#a78bfa', stroke: '#ede9fe', label: 'west return air clearance' },
    { cells: asSet(crewSets.nicheClear), fill: '#34d399', stroke: '#d1fae5', label: 'recovery niche air clearance' },
    { cells: asSet(crewSets.nicheAperture), fill: '#34d399', stroke: '#d1fae5', label: 'niche aperture' },
  ],
  title: 'Ravensreach crew returns + recovery niche — y=14 post-state plan',
  note: 'Outlined cells are independently verified, dry crew clearance. The niche aperture connects only to the east return; this map does not commission public refuge.',
});
const crossoverSection = await drawSection({
  bounds: { minY: 32, maxY: 50, minZ: -393, maxZ: -387 }, xValues: [-156, -155, -154],
  overlays: [
    { cells: asSet(crewSets.crossoverClear), fill: '#34d399', stroke: '#d1fae5', label: 'midshaft crossover dry clearance' },
    { cells: asSet(crewSets.crossoverFloor), fill: '#d7dde4', stroke: '#f8fafc', label: 'midshaft crossover floor' },
    { cells: asSet(crewSets.crossoverCeiling), fill: '#526277', stroke: '#cbd5e1', label: 'midshaft crossover ceiling' },
    { cells: asSet([...crewSets.crossoverNorth, ...crewSets.crossoverSouth]), fill: '#526277', stroke: '#cbd5e1', label: 'midshaft crossover shell' },
  ],
  title: 'Ravensreach midshaft recovery crossover — x=-156..-154 Y/Z post-state section',
  note: `The historical water-sleeve window y=33..39 has ${waterBandWaterCount} observed water cells; crossover clearance y=46..48 is dry and above it. The two y=49 fixtures are retained.`,
});
const waterSection = await drawSection({
  bounds: { minY: 32, maxY: 50, minZ: -393, maxZ: -387 }, xValues: [-159, -151],
  overlays: [
    { cells: asSet(crewSets.leftLadder), fill: '#dc8f35', stroke: '#fed7aa', label: 'left retained controlled ladder' },
    { cells: asSet(crewSets.rightLadder), fill: '#dc8f35', stroke: '#fed7aa', label: 'right retained controlled ladder' },
  ],
  title: 'Ravensreach water-exclusion evidence — retained shaft edges Y/Z post-state section',
  note: `Observed water is shown cyan. Zero water/lava cells occur in crossover clearance or either retained-ladder verification set; water-sleeve band remains a non-route boundary.`,
});

const r05Section = (() => {
  const unit = 24; const left = 78; const top = 78; const bounds = { minY: 75, maxY: 92, minZ: -825, maxZ: -814 };
  const rendered = [];
  for (let y = bounds.maxY; y >= bounds.minY; y -= 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    const cells = [{ x: 1961, y, z }, { x: 1962, y, z }]; const inPlug = cells.some((cell) => lavaPlugSet.has(key(cell)));
    const px = left + (z - bounds.minZ) * unit; const py = top + (bounds.maxY - y) * unit;
    rendered.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" fill="${inPlug ? '#ef6c00' : '#526277'}" stroke="${inPlug ? '#ffd7aa' : '#0f172a'}" stroke-width="${inPlug ? 2 : .55}"><title>${escape(`x=1961..1962, y=${y}, z=${z}${inPlug ? ' — exact executed lava-plug cell' : ''}`)}</title></rect>`);
  }
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) rendered.push(`<text class="axis" x="${left + (z - bounds.minZ) * unit}" y="${top - 8}">${z}</text>`);
  for (let y = bounds.maxY; y >= bounds.minY; y -= 1) rendered.push(`<text class="axis" x="${left - 42}" y="${top + (bounds.maxY - y) * unit + 15}">${y}</text>`);
  return svgWrap(450, 610, 'MP05 R05 west-toe lava plug — x=1961..1962 Y/Z post-state section', rendered.join(''), 'Orange: each of the 36 post-verified deepslate-tile plug cells that replaced the finite observed lava component. This is an evidence map, not a live screenshot.', [['#ef6c00', '36-cell plug'], ['#526277', 'other post-state']]);
})();

fs.mkdirSync(abs(OUT), { recursive: true });
const maps = {
  r05LavaPlugSection: 'r05-west-toe-lava-plug-yz-post-state.svg',
  crewPlan: 'ravensreach-crew-system-y13-post-state-plan.svg',
  crewNiche: 'ravensreach-crew-returns-niche-y14-post-state-plan.svg',
  crewCrossover: 'ravensreach-midshaft-crossover-post-state-section.svg',
  waterExclusion: 'ravensreach-water-exclusion-post-state-section.svg',
};
fs.writeFileSync(path.join(abs(OUT), maps.r05LavaPlugSection), r05Section);
fs.writeFileSync(path.join(abs(OUT), maps.crewPlan), crewPlan);
fs.writeFileSync(path.join(abs(OUT), maps.crewNiche), nichePlan);
fs.writeFileSync(path.join(abs(OUT), maps.crewCrossover), crossoverSection);
fs.writeFileSync(path.join(abs(OUT), maps.waterExclusion), waterSection);
const report = {
  schemaVersion: 1,
  id: 'R05-RR-CREW-POSTSTATE-EVIDENCE-MAPS-01',
  status: 'PASS_EXECUTED_POSTSTATE_SOURCE_MAPS_ONLY',
  generatedAtUtc: new Date().toISOString(),
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorized: false, snapshotOnly: true },
  sources: {
    r05: { ledger: rel(R05_LEDGER), postSnapshot: rel(r05.snapshot), postIdentity: r05.ledger.postSnapshot.identity, completeSaveSha256: r05.ledger.postSnapshot.completeSaveSha256 },
    crew: { ledger: rel(CREW_LEDGER), postSnapshot: rel(crew.snapshot), postIdentity: crew.ledger.postSnapshot.identity, completeSaveSha256: crew.ledger.postSnapshot.completeSaveSha256 },
  },
  releasedEvidence: [
    'data/world-review/cobalt-rr-crew-platform-live-20260826T211000Z/evidence-ledger.json',
    'data/world-review/cobalt-rr-south-crew-return-live-20260826T220500Z/evidence-ledger.json',
    'data/world-review/cobalt-rr-crew-recovery-niche-live-20260826T225000Z/evidence-ledger.json',
    'data/world-review/cobalt-rr-west-crew-cross-return-live-20260826T230000Z/evidence-ledger.json',
    'data/world-review/cobalt-rr-midshaft-recovery-crossover-live-20260826T231000Z/evidence-ledger.json',
    rel(CREW_LEDGER),
  ],
  exactPostState: { r05LavaPlugCells: lavaPlugCells.length, historicalWaterBandObservedWaterCells: waterBandWaterCount, crossoverAndLaddersWaterOrLavaCells: 0 },
  maps: Object.fromEntries(Object.entries(maps).map(([id, filename]) => [id, rel(path.join(OUT, filename))])),
  nonClaims: ['not a live screenshot', 'not a new field survey', 'does not commission public access, passenger service, rail power, or signals', 'does not authorize any Minecraft mutation'],
};
report.payloadSha256 = sha(JSON.stringify(report));
fs.writeFileSync(path.join(abs(OUT), 'evidence-mapbook-manifest.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R05 + Ravensreach crew-system evidence maps\n\nThis package is a coordinate-level rendering of immutable **post** snapshots only. It is not a live screenshot and creates no Minecraft mutation authority.\n\n- R05 source: [executed ledger](../../world-review/mp05-r05-west-toe-lava-plug-live-20260826T223500Z/evidence-ledger.json) · post snapshot \`${rel(r05.snapshot)}\`\n- Ravensreach source: [latest accepted recovery-lighting ledger](../../world-review/cobalt-rr-midshaft-recovery-lighting-live-20260826T232000Z/evidence-ledger.json) · post snapshot \`${rel(crew.snapshot)}\`\n- [Machine-readable mapbook manifest](evidence-mapbook-manifest.json)\n\n## Maps\n\n- [R05 finite lava plug — Y/Z section](${maps.r05LavaPlugSection}) — exact 36-cell deepslate-tile post state.\n- [Crew-system y=13 plan](${maps.crewPlan}) — north/south decks plus east/west returns.\n- [Returns + recovery niche y=14 plan](${maps.crewNiche}) — dry return clearances, aperture, and niche.\n- [Midshaft recovery crossover section](${maps.crewCrossover}) — crossover at y=46..48, above the water sleeve.\n- [Water-exclusion section](${maps.waterExclusion}) — observed water window and dry retained-ladder/crossover boundary.\n\nThe Ravensreach maps link to the executed [crew platform](../../world-review/cobalt-rr-crew-platform-live-20260826T211000Z/evidence-ledger.json), [east return](../../world-review/cobalt-rr-south-crew-return-live-20260826T220500Z/evidence-ledger.json), [recovery niche](../../world-review/cobalt-rr-crew-recovery-niche-live-20260826T225000Z/evidence-ledger.json), [west return](../../world-review/cobalt-rr-west-crew-cross-return-live-20260826T230000Z/evidence-ledger.json), [midshaft crossover](../../world-review/cobalt-rr-midshaft-recovery-crossover-live-20260826T231000Z/evidence-ledger.json), and [latest recovery-lighting](../../world-review/cobalt-rr-midshaft-recovery-lighting-live-20260826T232000Z/evidence-ledger.json) evidence.\n`;
fs.writeFileSync(path.join(abs(OUT), 'README.md'), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT), maps: report.maps, r05LavaPlugCells: lavaPlugCells.length, observedWaterBandCells: waterBandWaterCount }, null, 2)}\n`);
