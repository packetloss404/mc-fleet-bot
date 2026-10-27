#!/usr/bin/env node
/** Read-only inventory of the three unbuilt early C1 at-grade runs. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { AnvilReader, boundsOf, cellKey } from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  classManifest,
  census,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json',
);
const SNAPSHOT =
  'data/worldsnap-combined-zones-r11e-retry-v2-post-20260821T232546Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/evidence-ledger.json';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const RANGES = [
  { key: 'island-0-10', start: 0, end: 10 },
  { key: 'island-46-47', start: 46, end: 47 },
  { key: 'island-75-91', start: 75, end: 91 },
];
const EXPECTED = Object.freeze({
  sourceLedgerSha256: '97b0a46b5ddd2b56c2864cf44e71746dbb186fddd5a2ccb19e5ea0cd7b2a562f',
  sourceCompletedReleaseIdentitySha256:
    '33ef91973427f9f93a5cd4af5bfa4d059979064a43fd0eb9d2fa6db4f2af3ffb',
  sourceCompleteSaveSha256:
    '0079adf895179606ad64a57ad0e85351c4e6ba3dbacb82a308b84a6909013109',
  sourceRegionSha256:
    'e301aa16ef0db51b313d5c7d4a6b6b2e99343dd64787645b7f872d07268d1258',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11F early at-grade inventory rejected: ${message}`);
};

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(
        /(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g,
      )) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        cells.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]);
      x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]);
        y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]);
          z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          const cell = { x, y, z };
          cells.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...cells.values()];
}

const ledgerBytes = fs.readFileSync(absolute(SOURCE_LEDGER));
const ledger = JSON.parse(ledgerBytes);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sha256(ledgerBytes) === EXPECTED.sourceLedgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(ledger.postSnapshot.root) === absolute(SNAPSHOT)
  && postIdentity.sha256 === EXPECTED.sourceRegionSha256,
'accepted R11E retry-v2 terminal source drifted');

const priorTargetKeys = new Set();
const priorManifestNames = fs.readdirSync(absolute('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.includes('r11f-'))
  .sort();
for (const name of priorManifestNames) {
  const manifest = readJson(path.join('data/buildops', name));
  for (const pkg of manifest.packages ?? []) {
    if (!pkg.forward || !fs.existsSync(absolute(pkg.forward))) continue;
    for (const cell of operationTargetCells(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}

const stations = readJson(C1_DESIGN).horizontalAlignment.stations;
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const savedEntitiesForHalo = async (halo) => {
  if (!halo.length) return [];
  const extent = boundsOf(halo);
  const positions = [];
  for (let cx = Math.floor(extent.minX / 16);
    cx <= Math.floor(extent.maxX / 16); cx += 1) {
    for (let cz = Math.floor(extent.minZ / 16);
      cz <= Math.floor(extent.maxZ / 16); cz += 1) {
      const chunk = await entityReader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const position = entity.Pos.slice(0, 3).map(Number);
        const [x, y, z] = position;
        if (x >= extent.minX && x < extent.maxX + 1
          && y >= extent.minY && y < extent.maxY + 1
          && z >= extent.minZ && z < extent.maxZ + 1) positions.push(position);
      }
    }
  }
  return positions;
};

const analyses = [];
for (const range of RANGES) {
  const firstPass = await analyzeIsland({ ...range, stations, reader, priorTargetKeys });
  const savedEntityPositions = await savedEntitiesForHalo(firstPass.halo);
  const result = savedEntityPositions.length
    ? await analyzeIsland({
      ...range, stations, reader, priorTargetKeys, savedEntityPositions,
    })
    : firstPass;
  analyses.push({
    key: range.key,
    stations: { start: range.start, end: range.end, count: range.end - range.start + 1 },
    safe: result.safe,
    candidate: classManifest(result.candidate),
    priorConflicts: classManifest(result.priorConflicts),
    reservationConflicts: Object.fromEntries(Object.entries(
      result.reservationConflicts,
    ).map(([key, cells]) => [key, classManifest(cells)])),
    savedEntityPositions,
    savedEntityConflicts: classManifest(result.savedEntityConflicts),
    gradeShadows: classManifest(result.gradeShadows),
    exceptions: classManifest(result.exceptions),
    surface: classManifest(result.surface),
    foundation: classManifest(result.foundationRecords.map(({ cell }) => cell)),
    headroomCuts: classManifest(result.headroomRecords.map(({ cell }) => cell)),
    fullHeadroom: classManifest(result.fullHeadroom),
    stableFoundationContacts: classManifest(result.supportRecords.map(({ cell }) => cell)),
    gravityDependencies: classManifest(result.gravityRecords.map(({ cell }) => cell)),
    gravityRollbackSupportProofCount: result.gravityRollbackSupportProof.length,
    ownedLogRemovals: classManifest(result.ownedLogRemovals.map(({ cell }) => cell)),
    influencedLeaves: classManifest(result.influencedLeaves.map(({ cell }) => cell)),
    retainedLogDistanceCensus: result.retainedLogDistanceCensus,
    leafTransitions: classManifest(result.leafRecords.map(({ cell }) => cell)),
    operated: classManifest(result.operated),
    halo: classManifest(result.halo),
    sourceHazardCount: result.sourceHazards.length,
    sourceHazardCensus: census(result.sourceHazards, 'kind'),
    sourceHazards: result.sourceHazards,
    haloHazardCount: result.haloHazards.length,
    haloHazardCensus: census(result.haloHazards, 'kind'),
    haloHazards: result.haloHazards,
    priorIntersectionCount: result.priorIntersections.length,
    operatedInterfaceIntersections: Object.fromEntries(Object.entries(
      result.operatedInterfaceIntersections,
    ).map(([key, cells]) => [key, classManifest(cells)])),
    records: {
      dependencies: result.dependencyRecords,
      pavement: result.pavementRecords,
    },
  });
}

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: '2026-08-21T23:50:00Z',
  status: 'COMPLETE_READ_ONLY_CURRENT_SOURCE_INVENTORY',
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    regionSha256: EXPECTED.sourceRegionSha256,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256:
      EXPECTED.sourceCompletedReleaseIdentitySha256,
  },
  priorTargetInventory: {
    conservativeManifestCount: priorManifestNames.length,
    manifestNames: priorManifestNames,
    targetCellCount: priorTargetKeys.size,
  },
  ranges: analyses,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const inventoryPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, inventoryPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: OUT_PATH,
  inventoryPayloadSha256,
  ranges: analyses.map((range) => ({
    key: range.key,
    safe: range.safe,
    operatedCellCount: range.operated.cellCount,
    surfaceCellCount: range.surface.cellCount,
    sourceHazardCount: range.sourceHazardCount,
    haloHazardCount: range.haloHazardCount,
    savedEntityConflictCount: range.savedEntityConflicts.cellCount,
    priorIntersectionCount: range.priorIntersectionCount,
    interfaceIntersectionCount: Object.values(range.operatedInterfaceIntersections)
      .reduce((sum, entry) => sum + entry.cellCount, 0),
  })),
}, null, 2));
