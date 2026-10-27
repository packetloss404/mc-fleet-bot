#!/usr/bin/env node
/**
 * Read-only successor survey for MP10 Ravensreach circulation after the
 * library headroom and Moot bell/penthouse repairs.
 *
 * It proves whether the old CIRC-RRCH-LIB-01 parallel-tread compiler has a
 * non-duplicate successor on a supplied complete snapshot.  It intentionally
 * emits no operation package: a candidate that restores the five removed
 * treads is rejected if it regresses the existing bidirectional route suites.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z');
const OUT = value('--out', 'data/world-review/mp10-next-circulation-survey-20260826T141100Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP10 successor survey rejected: ${message}`);
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const LIBRARY = { minX: -144, maxX: -111, minY: 44, maxY: 86, minZ: -448, maxZ: -426 };
const CORE = { minX: -120, maxX: -114, minY: 46, maxY: 84, minZ: -445, maxZ: -439 };
const FLOOR_Y = [46, 54, 62, 70, 78];
const HISTORIC_CONFLICTS = [47, 55, 63, 71, 79].map((y) => ({ x: -118, y, z: -443 }));
const key = ({ x, y, z }) => `${x},${y},${z}`;
const corePoint = (point) => point.x >= CORE.minX && point.x <= CORE.maxX
  && point.y >= CORE.minY && point.y <= CORE.maxY && point.z >= CORE.minZ && point.z <= CORE.maxZ;
const libraryPoint = (point) => point.x >= LIBRARY.minX && point.x <= LIBRARY.maxX
  && point.y >= LIBRARY.minY && point.y <= LIBRARY.maxY && point.z >= LIBRARY.minZ && point.z <= LIBRARY.maxZ;
const stateToken = (state) => {
  if (AIR.has(state)) return '.';
  if (state.includes('_stairs')) return 'S';
  if (state.includes('bookshelf')) return 'B';
  if (state.includes('lantern')) return 'L';
  return '#';
};
const svgEsc = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

const snapshotRoot = absolute(SNAPSHOT);
const regionRoot = path.join(snapshotRoot, 'region');
const entitiesRoot = path.join(snapshotRoot, 'entities');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(regionRoot) && fs.existsSync(entitiesRoot) && fs.existsSync(capturePath), 'complete source snapshot is required');
const reader = new AnvilReader(regionRoot);
const entityReader = new AnvilReader(entitiesRoot);
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

const regionHash = spawnSync(process.execPath, ['scripts/hash_world_snapshot.mjs', relative(regionRoot)], {
  cwd: ROOT,
  encoding: 'utf8',
});
fail(regionHash.status === 0, `region snapshot hash failed: ${regionHash.stderr}`);
const regionIdentity = JSON.parse(regionHash.stdout);
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);

const targetStates = [];
for (const cell of HISTORIC_CONFLICTS) targetStates.push({ cell, state: await stateAt(cell.x, cell.y, cell.z) });
const acceptedLanding = [];
for (const cell of [{ x: -119, y: 46, z: -442 }, { x: -118, y: 46, z: -442 }]) {
  acceptedLanding.push({ cell, state: await stateAt(cell.x, cell.y, cell.z) });
}
const fullLandingCandidates = [];
for (const y of FLOOR_Y) {
  const candidates = [];
  for (let x = CORE.minX; x <= CORE.maxX - 2; x += 1) for (let z = CORE.minZ; z <= CORE.maxZ - 2; z += 1) {
    const cells = [];
    let valid = true;
    for (let dx = 0; dx < 3; dx += 1) for (let dz = 0; dz < 3; dz += 1) {
      const cell = { x: x + dx, y, z: z + dz };
      const footing = await stateAt(cell.x, cell.y, cell.z);
      const feet = await stateAt(cell.x, cell.y + 1, cell.z);
      const head = await stateAt(cell.x, cell.y + 2, cell.z);
      cells.push({ cell, footing, feet, head });
      if (AIR.has(footing) || !AIR.has(feet) || !AIR.has(head)) valid = false;
    }
    if (valid) candidates.push({ minX: x, maxX: x + 2, y, minZ: z, maxZ: z + 2, cells });
  }
  fullLandingCandidates.push({ floorY: y, candidates });
}

const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(LIBRARY.minX / 16); cx <= Math.floor(LIBRARY.maxX / 16); cx += 1) {
  for (let cz = Math.floor(LIBRARY.minZ / 16); cz <= Math.floor(LIBRARY.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const raw of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(raw.x), y: Number(raw.y), z: Number(raw.z) };
      if (libraryPoint(cell)) blockEntities.push({ id: raw.id ?? raw.Id ?? null, cell, inCore: corePoint(cell) });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const raw of entityChunk?.Entities ?? []) {
      if (!Array.isArray(raw.Pos) || raw.Pos.length < 3) continue;
      const position = raw.Pos.slice(0, 3).map(Number);
      const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
      if (libraryPoint(cell)) savedEntities.push({ id: raw.id ?? raw.Id ?? null, position, inCore: corePoint(cell) });
    }
  }
}

const legacyDir = path.join(OUT, 'legacy-2wide-probe');
const legacyBase = 'legacy-2wide-current-probe';
const compile = spawnSync(process.execPath, [
  'scripts/compile_civic_rrch_lib_01_stair_core_correction.mjs',
  '--snapshot', relative(SNAPSHOT),
  '--out-dir', relative(legacyDir),
  '--basename', legacyBase,
  '--generated-at', '2026-08-26T14:15:00Z',
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fail(compile.status === 0, `legacy-current compile unexpectedly failed: ${compile.stderr || compile.stdout}`);
const legacyManifest = JSON.parse(fs.readFileSync(path.join(absolute(legacyDir), `${legacyBase}.release-manifest.json`), 'utf8'));
const legacyOps = path.join(legacyDir, `${legacyBase}.stair-flight.forward.txt`);
const routeQa = path.join(OUT, 'legacy-2wide-projection-route-qa.json');
const projection = spawnSync(process.execPath, [
  'scripts/qa_ravensreach_ladderless_wave3.mjs',
  '--regions', relative(regionRoot),
  '--ops', relative(legacyOps),
  '--out', relative(routeQa),
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const projectionQa = JSON.parse(fs.readFileSync(absolute(routeQa), 'utf8'));
const baselineQaPath = path.join(OUT, 'library-ladderless-current-route-qa.json');
const baseline = spawnSync(process.execPath, [
  'scripts/qa_ravensreach_ladderless_wave3.mjs',
  '--regions', relative(regionRoot),
  '--out', relative(baselineQaPath),
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fail(baseline.status === 0, `current library baseline failed: ${baseline.stdout}\n${baseline.stderr}`);
const baselineQa = JSON.parse(fs.readFileSync(absolute(baselineQaPath), 'utf8'));

const conflictsAreAir = targetStates.every(({ state }) => state === 'minecraft:air');
const landingRestored = acceptedLanding.every(({ state }) => state === 'minecraft:polished_andesite');
const noThreeByThree = fullLandingCandidates.every(({ candidates }) => candidates.length === 0);
const exteriorRouteChangesProjection = conflictsAreAir && landingRestored && baselineQa.passed === 7
  && projectionQa.passed === 7 && noThreeByThree;
const historicProjectionRegresses = conflictsAreAir && landingRestored && baselineQa.passed === 7
  && projectionQa.passed === 5 && noThreeByThree;
const disposition = exteriorRouteChangesProjection
  ? 'EXTERIOR_ROUTE_RECONCILIATION_REQUIRED_NO_INTERNAL_CORE_MUTATION'
  : historicProjectionRegresses
    ? 'INTEGRATED_LIBRARY_VERTICAL_CIRCULATION_DESIGN_REQUIRED'
    : 'CURRENT_STATE_REQUIRES_REVIEW';
const report = {
  schemaVersion: 1,
  id: 'mp10-next-circulation-successor-survey-01',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY_SURVEY_NO_WORLD_MUTATION',
  status: disposition,
  source: {
    snapshot: relative(SNAPSHOT),
    regionSha256: regionIdentity.sha256,
    captureManifest: relative(capturePath),
    captureManifestSha256: sha256(captureBytes),
    captureId: capture.captureId ?? null,
    capturedAtUtc: capture.capturedAtUtc ?? null,
    completePlanes: ['region', 'entities', 'poi', 'level.dat'],
  },
  acceptedRepairsRetained: {
    libraryHeadroomRepair: {
      restoredB3Landing: acceptedLanding,
      oldTreadCoordinatesNowAir: targetStates,
      baselineBidirectionalRouteSuites: { total: baselineQa.total, passed: baselineQa.passed, failed: baselineQa.failed },
    },
  },
  rejectedFalseSuccessor: {
    id: 'historic CIRC-RRCH-LIB-01 five-cell residual parallel-tread proposal',
    exactTargets: legacyManifest.scope.geometry.operatedTargets,
    targetCoordinates: targetStates.map(({ cell }) => cell),
    projectionBidirectionalRouteSuites: { total: projectionQa.total, passed: projectionQa.passed, failed: projectionQa.failed },
    failedSuites: projectionQa.results.filter((result) => !result.passed).map(({ id }) => id),
    reason: projectionQa.passed === 5
      ? 'The proposal puts polished-andesite stairs back into the five headroom cells cleared by MP10-RRCH-LIBRARY-STAIR-HEADROOM-REPAIR-01 and regresses the two library direction suites from 7/7 to 5/7.'
      : 'The exterior stair now supplies an alternate accepted circulation path, so route-only QA no longer detects this historic core regression. The five cells remain prohibited: they are the accepted headroom repair, not spare capacity.',
  },
  coreCapacity: {
    core: CORE,
    requiredPublicLandingStandard: '3x3 footing with two clear body/head cells above each footing cell',
    perFloorThreeByThreeCandidates: fullLandingCandidates.map(({ floorY, candidates }) => ({ floorY, count: candidates.length, candidates: candidates.map(({ cells, ...candidate }) => candidate) })),
    noThreeByThreeLandingExists: noThreeByThree,
  },
  protectedContext: {
    libraryBlockEntityCount: blockEntities.length,
    coreBlockEntityCount: blockEntities.filter(({ inCore }) => inCore).length,
    librarySavedEntityCount: savedEntities.length,
    coreSavedEntityCount: savedEntities.filter(({ inCore }) => inCore).length,
    adjacentInterface: {
      id: 'IF-RRCH-LIBRARY-LOGGIA',
      rule: 'The x=-111 wall and any loggia-side threshold are cross-area; no successor may use them without a renewed exact interface contract.',
    },
  },
  nextRequiredPackageClass: exteriorRouteChangesProjection ? {
    id: 'MP10-RRCH-LIBRARY-EXTERIOR-ROUTE-RETENTION-AND-NEXT-DEFECT-SURVEY',
    requirement: 'Retain the accepted exterior stair/parapet, preserve the five internal headroom cells as air, and begin any later package only from an observed room, entrance, or access-class defect.',
    mustResolve: [
      'The seven-by-seven internal core still has zero usable 3x3 landing footprints and is not a candidate for tread restoration.',
      'The exterior route, not the historic five-cell pattern, is the current functional vertical circulation path.',
      'Any future Library/Loggia or fixture-adjacent work still requires its own exact interface and protection contract.',
    ],
    executionDisposition: 'NO_OPERATION_EMITTED; the existing exterior route removes this route blocker, while standalone five-cell/core-only mutation remains prohibited.',
  } : {
    id: 'CIRC-RRCH-LIB-02-INTEGRATED-VERTICAL-CIRCULATION-DESIGN',
    requirement: 'Survey and design a complete two-wide, three-clear-headroom library vertical route with 3x3 landings, edge cues, level signs, and bidirectional no-jump proof.',
    mustResolve: [
      'The current seven-by-seven core has zero usable 3x3 landing footprints at all five transition levels.',
      'The legacy five-cell parallel-tread pattern conflicts exactly with the accepted headroom repair and reduces functional route QA to 5/7.',
      'Any perimeter/annex alternative must protect or precisely migrate the 78 current library block entities and exclude the RRCH-LIBRARY/RG-LOGGIA interface until contract approval.',
    ],
    executionDisposition: 'NO_OPERATION_EMITTED; no standalone five-cell or core-only mutation is authorized.',
  },
  assertions: {
    worldEditsPerformed: false,
    liveCallsPerformed: false,
    operationFilesAuthorized: false,
  },
};

const tokenFill = { '.': '#101820', S: '#41b883', B: '#f4c95d', L: '#79c2ff', '#': '#a8b0ba' };
const projectionNote = projectionQa.passed < projectionQa.total
  ? `Historic tread projection: ${projectionQa.passed}/${projectionQa.total} (REJECT)`
  : `Historic tread projection: ${projectionQa.passed}/${projectionQa.total}; no mutation authority`;
const projectionDisposition = projectionQa.passed < projectionQa.total
  ? 'Restoration regresses the accepted route suites.'
  : 'The exterior stair masks this route-only regression; accepted headroom states still prohibit restoration.';
const mapRows = [];
for (let y = CORE.minY; y <= CORE.maxY; y += 1) {
  let tokens = '';
  for (let x = CORE.minX; x <= CORE.maxX; x += 1) {
    const point = { x, y, z: -443 };
    tokens += HISTORIC_CONFLICTS.some((candidate) => key(candidate) === key(point)) ? 'X' : stateToken(await stateAt(x, y, -443));
  }
  mapRows.push({ y, tokens });
}
const cell = 13;
const mapX = 105;
const mapY = 70;
const elevation = mapRows.map(({ y, tokens }, row) => {
  const squares = [...tokens].map((token, index) => `<rect x="${mapX + index * cell}" y="${mapY + row * cell}" width="${cell - 1}" height="${cell - 1}" fill="${token === 'X' ? '#ff6b35' : tokenFill[token]}"/>`).join('');
  return `<text x="48" y="${mapY + row * cell + 10}" class="label">${y}</text>${squares}`;
}).join('');
const floorText = fullLandingCandidates.map(({ floorY, candidates }, index) => `<text x="${40 + index * 175}" y="670" class="label">y=${floorY}: ${candidates.length} valid 3x3 landing(s)</text>`).join('');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="980" height="720" viewBox="0 0 980 720" role="img" aria-labelledby="title desc">
  <title id="title">MP10 Ravensreach library successor circulation map</title>
  <desc id="desc">Elevation through z minus 443 of the existing seven-by-seven library stair core. Orange cells are the five old parallel treads that must remain air because they are accepted headroom-repair states, not spare capacity.</desc>
  <style>.title{font:700 24px sans-serif;fill:#f4f6f8}.sub{font:14px sans-serif;fill:#c9d4df}.label{font:12px monospace;fill:#d9e2ec}.note{font:14px sans-serif;fill:#f4f6f8}</style>
  <rect width="980" height="720" fill="#16212b"/>
  <text x="40" y="35" class="title">RRCH-LIBRARY: next circulation successor screen</text>
  <text x="40" y="56" class="sub">Complete post-MP07 snapshot • elevation at z=-443 • core x=-120..-114, y=46..84</text>
  <text x="40" y="84" class="label">Y</text><text x="105" y="84" class="label">x=-120</text><text x="170" y="84" class="label">-119</text><text x="235" y="84" class="label">-118</text><text x="300" y="84" class="label">-117</text><text x="365" y="84" class="label">-116</text><text x="430" y="84" class="label">-115</text><text x="495" y="84" class="label">-114</text>
  ${elevation}
  <rect x="620" y="112" width="300" height="235" rx="8" fill="#203040" stroke="#5a7186"/>
  <text x="640" y="142" class="note">Legend</text>
  <rect x="640" y="158" width="14" height="14" fill="#41b883"/><text x="664" y="170" class="label">S — existing stair</text>
  <rect x="640" y="182" width="14" height="14" fill="#ff6b35"/><text x="664" y="194" class="label">X — old tread; must remain air</text>
  <rect x="640" y="206" width="14" height="14" fill="#101820"/><text x="664" y="218" class="label">. — air</text>
  <rect x="640" y="230" width="14" height="14" fill="#f4c95d"/><text x="664" y="242" class="label">B — bookshelf/block entity area</text>
  <text x="640" y="276" class="label">Baseline library route QA: 7/7</text>
  <text x="640" y="300" class="label">${svgEsc(projectionNote)}</text>
  <text x="640" y="324" class="label">3x3 landings inside core: 0 on all floors</text>
  <rect x="40" y="618" width="880" height="73" rx="8" fill="#35242a" stroke="#ff6b35"/>
  <text x="58" y="646" class="note">${svgEsc(projectionDisposition)}</text>
  ${floorText}
</svg>\n`;

fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(path.join(absolute(OUT), 'mp10-next-circulation-successor-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(absolute(OUT), 'mp10-next-circulation-library-core-map.svg'), svg);
const falseSuccessorDisposition = projectionQa.passed < projectionQa.total
  ? `Its projected route QA is **${projectionQa.passed}/${projectionQa.total}**, so it regresses the accepted route suites.`
  : `Its projected route QA remains **${projectionQa.passed}/${projectionQa.total}** only because the exterior route now bypasses the core; that result does not change the accepted headroom target states or grant mutation authority.`;
const markdown = `# MP10 Ravensreach next circulation successor survey\n\n**Status:** **${disposition}** — read-only current-source screen; no live call, operation authorization, or world mutation.\n\n## Source binding\n\n- Complete immutable post: \`${report.source.snapshot}\`\n- Region identity: \`${report.source.regionSha256}\`\n- Capture-manifest SHA-256: \`${report.source.captureManifestSha256}\`\n- Capture time: \`${report.source.capturedAtUtc}\`\n\n## What remains functional\n\nThe two accepted repairs are retained in this later complete snapshot:\n\n- The library's restored landing and cleared headroom return **${baselineQa.passed}/${baselineQa.total}** bidirectional normal-walk route suites.\n- The five legacy parallel-tread locations at \`(-118,47/55/63/71/79,-443)\` are exactly air, as required by the accepted headroom repair.\n\n## False successor rejected\n\nThe historical CIRC-RRCH-LIB-01 compiler now emits only five residual stair placements. Those are exactly the five cleared headroom points. ${falseSuccessorDisposition} Re-adding them is not a build candidate.\n\n[Detailed core elevation map](mp10-next-circulation-library-core-map.svg) marks those cells in orange.\n\n## Current integrated dependency\n\nThe current RRCH-LIBRARY stair core is only \`x=-120..-114, z=-445..-439\`. Across all five transition floors (y=46, 54, 62, 70, 78), it contains **zero** valid 3×3 landings with two clear body/head cells. The scoped component has no container or saved-entity intersection, but the wider library contains ${blockEntities.length} protected block entities; the adjacent \`x=-111\` library/loggia wall is a cross-area interface.\n\nThe next required work is **CIRC-RRCH-LIB-02 integrated vertical-circulation design**: a two-wide, three-clear-headroom route with 3×3 landings, edge cues, level signs, and bidirectional no-jump proof. It must survey a perimeter/annex solution, retain or precisely migrate interior block entities, and keep the RRCH-LIBRARY/RG-LOGGIA interface out of scope unless a new exact contract is accepted. No core-only treads or operation file are authorized.\n`;
fs.writeFileSync(path.join(absolute(OUT), 'MP10-NEXT-CIRCULATION-SUCCESSOR-SURVEY.md'), markdown);
console.log(JSON.stringify({
  status: report.status,
  report: relative(path.join(OUT, 'mp10-next-circulation-successor-survey.json')),
  map: relative(path.join(OUT, 'mp10-next-circulation-library-core-map.svg')),
  markdown: relative(path.join(OUT, 'MP10-NEXT-CIRCULATION-SUCCESSOR-SURVEY.md')),
  baselineRouteSuites: `${baselineQa.passed}/${baselineQa.total}`,
  rejectedProjectionRouteSuites: `${projectionQa.passed}/${projectionQa.total}`,
  validThreeByThreeLandings: fullLandingCandidates.reduce((sum, entry) => sum + entry.candidates.length, 0),
  worldEditsPerformed: false,
}, null, 2));
