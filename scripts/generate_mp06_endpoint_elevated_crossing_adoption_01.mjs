#!/usr/bin/env node
/**
 * Materialize the static-only compiler companion for the surveyed MP06
 * elevated crossing.  The source design is the authority for all 149 states;
 * this generator adds only the compiler's explicit role and inverse bindings.
 * It never captures, contacts a server, or writes operation packages.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { hashCells } from './lib/combined_zones_release_lib.mjs';
import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
// The proposed bridge is a stable design baseline, but each physical attempt
// must bind a newly captured immutable source. These inputs prevent a caller
// from accidentally treating the design snapshot as live-release evidence.
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z');
const PROPOSED = 'data/world-review/mp06-endpoint-bridge-contract-05-current-20260826T141000Z/mp06-endpoint-bridge-contract.json';
const OUT = option('--out', 'data/world-review/mp06-endpoint-bridge-adoption-06-current-20260826T141000Z');
const CONTRACT_NAME = 'mp06-endpoint-elevated-crossing-01-exact-3d-contract.json';
const MARKDOWN_NAME = 'MP06-ENDPOINT-ELEVATED-CROSSING-01-ADOPTION.md';
const ACCEPTED_AT = option('--accepted-at', '2026-08-26T14:36:00Z');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const absolute = (value) => path.resolve(ROOT, value);

function fail(condition, message) {
  if (!condition) throw new Error(`MP06 adoption rejected: ${message}`);
}

function point(entry) {
  return [entry.x, entry.y, entry.z];
}

function roleFor(entry) {
  if (entry.role === 'elevated_deck') {
    const roles = ['deck', 'structure'];
    // Both existing caps are immutable. These first/last deck columns are the
    // exact new cells that transition to them; no cap itself is modified.
    if (entry.x === -264 || entry.x === -252) roles.push('cap-transition');
    return roles;
  }
  if (entry.role === 'edge_parapet') return ['edge-safety'];
  if (entry.role === 'edge_lighting') return ['lighting'];
  throw new Error(`unexpected proposed work role ${entry.role}`);
}

function routePoints() {
  const elevatedForward = [[-265, 73, -497]];
  for (let x = -264; x <= -251; x += 1) elevatedForward.push([x, 72, -497]);
  const lowerForward = [];
  for (let x = -264; x <= -252; x += 1) lowerForward.push([x, 69, -497]);
  return { elevatedForward, lowerForward };
}

function main() {
  const proposedPath = absolute(PROPOSED);
  const snapshotRoot = absolute(SNAPSHOT);
  const sourceRegion = path.join(snapshotRoot, 'region');
  const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    fail(fs.existsSync(path.join(snapshotRoot, member)), `complete immutable source lacks ${member}`);
  }
  const proposedBytes = fs.readFileSync(proposedPath);
  const proposed = JSON.parse(proposedBytes);
  const captureBytes = fs.readFileSync(capturePath);
  const capture = JSON.parse(captureBytes);
  const sourceIdentity = hashSnapshotDirectory(sourceRegion);
  fail(proposed.status === 'PROPOSED_EXACT_3D_CONTRACT_PENDING_OWNER_ADOPTION_NO_OPERATIONS', 'wrong proposed design status');
  fail(typeof proposed.source?.snapshot === 'string', 'proposed design has no immutable design baseline');
  const intent = proposed.design?.exactIntent;
  fail(Array.isArray(intent) && intent.length === 149, 'proposed design does not have exactly 149 finite intent cells');
  fail(proposed.design?.exactIntentSha256 === sha256(JSON.stringify(intent)), 'proposed exact intent hash drift');
  fail(proposed.design?.workClasses?.sideSupport?.cells === 0, 'source design does not establish zero side supports');
  fail(proposed.design?.workClasses?.drainage?.cells === 0, 'source design does not establish dry zero-cell drainage');

  const operations = intent.map((entry) => ({
    point: point(entry), sourceState: entry.source, targetState: entry.desired, roles: roleFor(entry),
  }));
  const cells = operations.map(({ point: coordinate }) => ({ x: coordinate[0], y: coordinate[1], z: coordinate[2] }));
  const roleCells = (role) => operations
    .filter((operation) => operation.roles.includes(role))
    .map(({ point: coordinate }) => ({ x: coordinate[0], y: coordinate[1], z: coordinate[2] }));
  const deckCells = roleCells('deck');
  const lowerClearway = [];
  for (let x = -264; x <= -252; x += 1) for (let y = 68; y <= 70; y += 1) for (let z = -501; z <= -493; z += 1) lowerClearway.push({ x, y, z });
  fail(deckCells.length === 117, 'the deck role must contain exactly 117 cells');
  fail(roleCells('structure').length === 117, 'deck-as-structure role must bind every deck cell');
  fail(roleCells('cap-transition').length === 18, 'cap transition must bind both nine-cell unmodified-cap seams');
  fail(roleCells('edge-safety').length === 26, 'edge safety must bind all 26 surveyed parapets');
  fail(roleCells('lighting').length === 6, 'lighting must bind all six surveyed lanterns');

  const { elevatedForward, lowerForward } = routePoints();
  const contract = {
    schemaVersion: 1,
    contractId: 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT',
    status: 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT',
    acceptedAtUtc: ACCEPTED_AT,
    contractKind: 'COMPILER_COMPANION_TO_PROPOSED_FINITE_BRIDGE_DESIGN',
    derivedFromProposedContract: {
      path: PROPOSED,
      sha256: sha256(proposedBytes),
      exactIntentSha256: proposed.design.exactIntentSha256,
      relationship: 'Restates the proposed 149 exact cells as compiler roles and state-for-state inverse bindings only. It neither adds a cell nor authorizes a world mutation.',
    },
    authority: {
      basis: 'AGENTS.md — Combined Zones current-state precedence and standing build authority; delegated conservative, reversible design and material decisions.',
      scope: 'Adopt only this finite elevated bridge right-of-way, its full protected lower clearway, and its exact source-state inverse binding for static compilation.',
      mutationAuthorityGranted: false,
      noExecutionAuthority: 'This companion permits static compilation only. It does not authorize RCON, Minecraft mutation, snapshot capture, or bypass of the complete guarded release kernel.',
    },
    mutationAuthorityGranted: false,
    sourceSnapshot: {
      directory: `${SNAPSHOT}/region`,
      completeSaveCapture: `${SNAPSHOT}/combined-zones-complete-save-capture.json`,
      captureId: capture.captureId,
      captureManifestSha256: sha256(captureBytes),
      algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
      sha256: sourceIdentity.sha256,
      regionFileCount: sourceIdentity.regionFileCount,
      immutableCopy: true,
      freshStateVerification: 'This contract binds the current immutable source identity. The adjacent static compiler must prove all 149 source states, the 351 lower-clearway cells, retained caps, exact routes, and entity exclusions against this same source before a package may exist.',
    },
    approvals: {
      ownerApprovals: [
        {
          owner: 'TE-REGIONAL-APPROACH-ROAD',
          approvalName: 'Sole owner — standing delegated exact 3-D build authority',
          decision: 'Adopt exactly the listed 149 bridge cells as a raised road-crossing work right-of-way. No adjacent cap, lower-road, support, drainage, or unlisted road cell transfers.',
          acceptedAtUtc: ACCEPTED_AT,
        },
        {
          owner: 'TE-REGIONAL-APPROACH-ROAD',
          approvalName: 'Sole owner — lower-clearway protection approval',
          decision: 'Adopt the full 351-cell x=-264..-252, y=68..70, z=-501..-493 lower-road floor and clearway as protected retained interface; no bridge operation may enter it.',
          acceptedAtUtc: ACCEPTED_AT,
        },
      ],
    },
    operations,
    ownership: {
      scopeId: 'TE-REGIONAL-APPROACH-ROAD',
      operationCoordinateSetSha256: hashCells(cells),
      operationCells: operations.map(({ point: coordinate }) => coordinate),
      protectedLowerClearwayCoordinateSetSha256: hashCells(lowerClearway),
      protectedLowerClearwayCells: lowerClearway.map(({ x, y, z }) => [x, y, z]),
      noOtherRoadCellsAdopted: true,
    },
    design: {
      palette: { deckState: 'minecraft:gray_concrete' },
      capTransition: {
        coordinateSetSha256: hashCells(roleCells('cap-transition')),
        retainedCapCellsChanged: false,
        decision: 'The first/last deck columns are transition receivers only; both existing caps remain unchanged.',
      },
      structural: {
        coordinateSetSha256: hashCells(roleCells('structure')),
        deckIsStructural: true,
        sideSupport: { mode: 'NONE_REQUIRED_DECK_IS_STRUCTURAL', targetCellCount: 0, targetCoordinateSetSha256: hashCells([]) },
      },
      edgeSafety: { coordinateSetSha256: hashCells(roleCells('edge-safety')), parapetState: 'minecraft:polished_andesite' },
      lighting: {
        coordinateSetSha256: hashCells(roleCells('lighting')),
        fixtureCells: operations.filter((operation) => operation.roles.includes('lighting')).map(({ point: coordinate }) => coordinate),
        fixtureState: 'minecraft:lantern[hanging=false,waterlogged=false]',
      },
      drainage: {
        mode: 'DRY_NO_FLUID_NO_WATERLOGGED_NO_DISCHARGE',
        targetCellCount: 0,
        targetCoordinateSetSha256: hashCells([]),
        dischargeCells: [],
        noFluidIngress: true,
        noWaterloggedBlocks: true,
        noDischarge: true,
      },
    },
    operationBinding: {
      releaseId: 'MP06-ENDPOINT-ELEVATED-CROSSING-01',
      exactInverseRequired: true,
      allOrNothing: true,
      targetCoordinateSetSha256: hashCells(cells),
      cells: operations.map(({ point: coordinate, sourceState, targetState }) => ({ point: coordinate, fromState: sourceState, toState: targetState, rollbackState: sourceState })),
      prohibited: ['Any added coordinate, changed source/target state, support, drainage fixture, cap rewrite, lower-clearway intrusion, or partial package.', 'Any live action before the entire fresh guarded release kernel.'],
    },
    projectedDualLevelRouteProof: {
      sourceRegionSha256: sourceIdentity.sha256,
      evidenceSummary: { elevatedStationsSurveyed: 105, elevatedDirectedEndpointPairs: 98, lowerClearwayStationsSurveyed: 117 },
      elevated: { standard: 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER', forward: elevatedForward, reverse: elevatedForward.slice().reverse() },
      lower: { standard: 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER', forward: lowerForward, reverse: lowerForward.slice().reverse() },
    },
    failureState: {
      status: 'FAIL_CLOSED_ON_SNAPSHOT_DESIGN_CONTRACT_OR_KERNEL_DRIFT',
      onFailure: 'Do not compile a releasable package, broaden, execute, or retarget. Prepare a fresh exact contract after a new design source if necessary.',
    },
    nonClaims: { forwardOperationExecuted: false, rollbackOperationExecuted: false, minecraftOrRconCalled: false, snapshotCaptured: false, worldMutated: false, mp06Complete: false },
  };
  const contractText = `${JSON.stringify(contract, null, 2)}\n`;
  const contractSha256 = sha256(contractText);
  const markdown = `# MP06 Endpoint Elevated Crossing 01 — Exact 3-D Adoption\n\nStatus: **accepted for static compilation only**. This is not execution authority.\n\n- Source design: [MP06 Bridge Contract 05](../mp06-endpoint-bridge-contract-05-current-20260826T141000Z/MP06-ENDPOINT-BRIDGE-CONTRACT-05.md)\n- Exact source: \`${SNAPSHOT}\`\n- Source region SHA-256: \`${sourceIdentity.sha256}\` (\`${sourceIdentity.regionFileCount}\` region files)\n- Proposed-design SHA-256: \`${sha256(proposedBytes)}\`\n- Adoption-contract SHA-256: \`${contractSha256}\`\n\n## Adopted finite scope\n\n- 149 source-air cells only: 117 gray-concrete deck cells, 26 polished-andesite parapet cells, and 6 non-waterlogged lantern cells.\n- The deck itself is the zero-support structural system. No support cell exists or is implied.\n- Drainage is explicitly dry/no-fluid/no-waterlogged/no-discharge with a hash-bound zero-cell target set.\n- All 351 lower-road cells at \`x=-264..-252, y=68..70, z=-501..-493\` are protected retained interface, not work.\n- Existing x=-265 and x=-251 cap cells remain untouched; the 18 adjoining deck cells carry the cap-transition role.\n\n## Ownership adoption\n\nBoth approvals are from the same sole named road owner under the standing delegated authority: one adopts the finite raised right-of-way and one independently binds the lower clearway as protected. Neither adds mutation authority.\n\n## Functional evidence and remaining gate\n\nThe source design supplies 105 elevated stations / 98 directed upper pairs and 117 preserved lower-clearway stations. The compiler binds exact normal-walk witness paths at z=-497 in both directions. Before any mutation, a fresh complete source, renewed acceptance, entity and block-entity clearances, strict parser/preflights, journaled strict execution, fresh post capture, rollback preflight, and independent dual-level QA remain mandatory.\n\n## Non-claims\n\nNo operation has run. No snapshot was captured. No RCON or Minecraft call was made. MP06 is not complete.\n`;
  fs.mkdirSync(absolute(OUT), { recursive: true });
  fs.writeFileSync(path.join(absolute(OUT), CONTRACT_NAME), contractText);
  fs.writeFileSync(path.join(absolute(OUT), MARKDOWN_NAME), markdown);
  process.stdout.write(`${JSON.stringify({ status: 'STATIC_COMPILER_COMPANION_ACCEPTED_NO_MUTATION_AUTHORITY', contract: path.join(OUT, CONTRACT_NAME), contractSha256, markdown: path.join(OUT, MARKDOWN_NAME), operations: operations.length, roles: Object.fromEntries(['deck', 'structure', 'cap-transition', 'edge-safety', 'lighting'].map((role) => [role, roleCells(role).length])), sourceRegionSha256: sourceIdentity.sha256 }, null, 2)}\n`);
}

main();
