#!/usr/bin/env node
/**
 * T01 release compiler for CZ-R01 on the P1-B11 Grand Avenue surface road.
 *
 * Deterministically re-derives the 2,392 frozen construction cells from the
 * accepted centerline, proves the derived set equals the committed G03
 * identity (count, bounds, coordinate-set SHA-256), reads exact per-cell
 * source states from the fresh immutable complete save, maps target states
 * from the owner's R01 B11 material decision, and emits a guarded
 * forward/rollback operation pair plus a schema-1 release manifest.
 *
 * The manifest binds only upstream identities (decision record payloads, G03
 * hashes, snapshot identity). Validation and execution evidence live in later
 * additive artifacts that bind this manifest — never the reverse — so
 * compile → preflight → recompile is byte-stable.
 *
 * This compiler performs no live call and authorizes no world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  deriveB11ConstructionCells,
  deriveB11Profile,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-06T22:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260806T221616Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T221616Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r01-b11-road';

const INPUTS = Object.freeze({
  decision: 'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json',
  b11Acceptance: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
});

// Replacing any block-entity container would destroy stored state; the road
// surface must never contain one. Fail closed if the census disagrees.
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 release compiler rejected: ${message}`);
}

const decision = readJson(INPUTS.decision);
const b11Acceptance = readJson(INPUTS.b11Acceptance);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const intake = readJson(INTAKE_AUDIT);

invariant(decision.status === 'OWNER_DECISION_RECORDED_R01_SCOPE_B11_AND_ROAD_MATERIALS',
  'R01 B11 decision record is not in the recorded state');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'fresh complete-save intake audit is not PASS');
invariant(intake.suppliedWorldRoot === SNAPSHOT
  || intake.capture?.worldRoot === SNAPSHOT
  || fs.existsSync(path.join(ROOT, SNAPSHOT, 'region')),
'snapshot root does not match the intake audit');

const b11Scope = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B11');
invariant(g03.canonicalPayloadSha256 === decision.boundIdentities.g03CanonicalPayloadSha256,
  'G03 canonical payload drifted from the decision record');
invariant(b11Scope.construction.coordinateSetSha256
  === decision.boundIdentities.b11ConstructionCoordinateSetSha256,
'B11 construction identity drifted from the decision record');

// Re-derive and prove the frozen geometry.
const profile = deriveB11Profile(b11Acceptance.acceptancePayload.grandAvenue);
const annotatedCells = deriveB11ConstructionCells(profile);
const exactCells = uniqueCells(annotatedCells);
invariant(exactCells.length === b11Scope.construction.cellCount,
  `derived cell count ${exactCells.length} != committed ${b11Scope.construction.cellCount}`);
invariant(exactCells.length === annotatedCells.length,
  'derived construction cells unexpectedly overlap between stations');
invariant(JSON.stringify(boundsOf(exactCells)) === JSON.stringify(b11Scope.construction.bounds),
  'derived bounds drift from committed G03 bounds');
const derivedHash = hashCells(exactCells);
invariant(derivedHash === b11Scope.construction.coordinateSetSha256,
  `derived coordinate-set hash ${derivedHash} != committed ${b11Scope.construction.coordinateSetSha256}`);

// Target states from the owner's section decision.
const sectionByOffset = new Map(
  decision.materialDecision.roadSection.map((entry) => [entry.zOffset, entry]),
);
function targetStateFor(cell) {
  const section = sectionByOffset.get(cell.zOffset);
  invariant(section, `no section entry for Z-offset ${cell.zOffset}`);
  if (section.stripeState && cell.station % 6 < 3) return section.stripeState;
  return section.state;
}

// Source states from the fresh immutable save.
const reader = new AnvilReader(path.join(ROOT, SNAPSHOT, 'region'));
const operations = [];
const sourceCensus = new Map();
for (const cell of annotatedCells.slice().sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z)) {
  const rawState = await reader.blockState(cell.x, cell.y, cell.z);
  invariant(!FORBIDDEN_SOURCE_BLOCKS.has(rawState.Name),
    `forbidden container/entity block ${rawState.Name} at ${cell.x},${cell.y},${cell.z}`);
  const fromState = stateToCommandString(rawState);
  const toState = targetStateFor(cell);
  sourceCensus.set(fromState, (sourceCensus.get(fromState) ?? 0) + 1);
  operations.push({ cell: { x: cell.x, y: cell.y, z: cell.z }, fromState, toState });
}
invariant(operations.length === 2392, 'operation count drift');

const forwardBody = `${operations.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
const rollbackBody = `${operations.map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
const forwardHash = sha256(forwardBody);
const rollbackHash = sha256(rollbackBody);

const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);

const header = (role, bodyHash) => [
  `# GENERATED FILE — Combined Zones CZ-R01 P1-B11 Grand Avenue surface road (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# B11 construction coordinate-set SHA-256: ${derivedHash}`,
  `# decision record identity: ${decision.reportIdentitySha256}`,
  `# operation SHA-256: ${bodyHash}`,
  '',
].join('\n');

fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, forwardPath), `${header('forward', forwardHash)}${forwardBody}`);
fs.writeFileSync(path.join(ROOT, rollbackPath), `${header('rollback', rollbackHash)}${rollbackBody}`);

const targetCensus = {};
for (const { toState } of operations) targetCensus[toState] = (targetCensus[toState] ?? 0) + 1;

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: 'combined-zones-r01-b11-road',
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_AWAITING_PRERELEASE_GATES_AND_EXPLICIT_AUTHORIZATION',
  packages: [{ key: 'b11-road', forward: forwardPath, rollback: rollbackPath }],
  scope: {
    releaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
    scopeAdjudicationRecordIdentitySha256: decision.reportIdentitySha256,
    domain: 'P1-B11/construction',
    cellCount: operations.length,
    bounds: b11Scope.construction.bounds,
    coordinateSetSha256: derivedHash,
    sectionPayloadSha256: decision.materialDecision.sectionPayloadSha256,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceStateCensus: Object.fromEntries(
      [...sourceCensus.entries()].sort((a, b) => b[1] - a[1]),
    ),
  },
  target: { desiredStateCensus: targetCensus },
  operations: {
    forwardSha256: forwardHash,
    rollbackSha256: rollbackHash,
    forwardCommandCount: operations.length,
    rollbackCommandCount: operations.length,
    exactInverse: true,
    targetBijectionWithFrozenDomain: true,
  },
  upstreamIdentities: {
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    b11CenterlineSha256: b11Acceptance.acceptancePayload.grandAvenue.centerlineSha256,
    ownershipRegistryPayloadSha256: decision.boundIdentities.ownershipRegistryPayloadSha256,
    externalAcceptanceReportIdentitySha256:
      decision.boundIdentities.externalAcceptanceReportIdentitySha256,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(path.join(ROOT, manifestPath),
  `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  forward: forwardPath,
  rollback: rollbackPath,
  manifestIdentity,
  forwardSha256: forwardHash,
  rollbackSha256: rollbackHash,
  cellCount: operations.length,
  derivedCoordinateSetSha256: derivedHash,
  sourceStateCensusTop: Object.entries(manifestWithoutIdentity.source.sourceStateCensus).slice(0, 6),
}, null, 2));
