#!/usr/bin/env node
/**
 * Read-only ownership/interface screen for MP05 B07 construction and exterior
 * receiver work. This script deliberately emits a no-authority result when
 * source geometry is only a reservation or a proposed owner record. It does
 * not read live services, capture a save, compile operations, or mutate the
 * Minecraft world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  boundsOf,
  cellKey,
  deriveB07WestTwo,
  hashCells,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b07-ownership-interface-contract-01-20260826T123537Z');
const MARKDOWN_OUT = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-OWNERSHIP-INTERFACE-CONTRACT-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T13:10:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };

const mechanismsPath = 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json';
const lifeSafetyPath = 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json';
const registryPath = 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json';
const releaseContractPath = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const integratedPath = 'data/world-review/mp05-b07-integrated-design-02-20260826T123537Z/integrated-design-findings.json';
const containmentPath = 'data/world-review/mp05-b07-containment-contract-01-20260826T123537Z/containment-contract-findings.json';
const r07jManifestPath = 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json';
const r07jQaPath = 'data/world-review/combined-zones-r07j-live-20260821T193306Z/r07j-post-release-qa.json';

for (const filename of [mechanismsPath, lifeSafetyPath, registryPath, releaseContractPath, integratedPath, containmentPath, r07jManifestPath, r07jQaPath]) {
  invariant(fs.existsSync(abs(filename)), `Missing required B07 ownership input: ${filename}`);
}

const mechanisms = readJson(mechanismsPath);
const lifeSafety = readJson(lifeSafetyPath);
const registry = readJson(registryPath);
const releaseContract = readJson(releaseContractPath);
const integrated = readJson(integratedPath);
const containment = readJson(containmentPath);
const r07jManifest = readJson(r07jManifestPath);
const r07jQa = readJson(r07jQaPath);
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
const b07Candidate = lifeSafety.b07PublicShaftTransfer.candidates.find(({ id }) => id === 'B07-C-WEST-2');
const b07Owner = registry.proposedOwnerRegistry.ownerRecords.find(({ ownerId }) => ownerId === 'OWN-B07');
const b07Adjudication = registry.proposedOwnershipAdjudications.records.find(({ winningOwnerId }) => winningOwnerId === 'OWN-B07');
const b07Interfaces = registry.proposedDirectionalInterfaceRegistry.contracts.filter((contract) => contract.fromOwnerId === 'OWN-B07' || contract.toOwnerId === 'OWN-B07');
invariant(b07Candidate && b07Owner && b07Adjudication, 'Canonical B07 ownership source record missing');
invariant(b07.construction.length === 8134 && b07.interaction.length === 13608, 'B07 geometry count drift');

const pointSort = (a, b) => a.y - b.y || a.z - b.z || a.x - b.x;
const manifest = (cells) => {
  const exact = uniqueCells(cells).sort(pointSort);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const pairHash = (pairs) => sha256(`mp05-b07-directional-seam-pairs-v1\n${pairs
  .map(({ from, to }) => `${from.x},${from.y},${from.z}>${to.x},${to.y},${to.z}`)
  .sort()
  .join('\n')}\n`);

const construction = new Map(b07.construction.map((cell) => [cellKey(cell), cell]));
const interaction = new Set(b07.interaction.map(cellKey));
const directions = [
  { id: 'NEGATIVE_X', vector: { x: -1, y: 0, z: 0 } },
  { id: 'POSITIVE_X', vector: { x: 1, y: 0, z: 0 } },
  { id: 'NEGATIVE_Y', vector: { x: 0, y: -1, z: 0 } },
  { id: 'POSITIVE_Y', vector: { x: 0, y: 1, z: 0 } },
  { id: 'NEGATIVE_Z', vector: { x: 0, y: 0, z: -1 } },
  { id: 'POSITIVE_Z', vector: { x: 0, y: 0, z: 1 } },
];
const directionalSeams = directions.map(({ id, vector }) => {
  const pairs = [];
  for (const from of construction.values()) {
    const to = { x: from.x + vector.x, y: from.y + vector.y, z: from.z + vector.z };
    if (!construction.has(cellKey(to))) pairs.push({ from, to });
  }
  pairs.sort((left, right) => pointSort(left.from, right.from) || pointSort(left.to, right.to));
  const fromCells = pairs.map(({ from }) => from);
  const toCells = pairs.map(({ to }) => to);
  return {
    id: `B07-OUTER-BOUNDARY-${id}`,
    fromOwnerCandidate: 'OWN-B07',
    fromOwnerAcceptance: 'PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED',
    toOwnerId: null,
    direction: id,
    relationship: 'EXACT_CONSTRUCTION_BOUNDARY_TO_UNOWNED_OR_UNRESOLVED_COUNTERPART_DEFAULT_DENY',
    fromCellSet: manifest(fromCells),
    toCellSet: manifest(toCells),
    transitionCount: pairs.length,
    transitionPairSha256: pairHash(pairs),
    toCellsInsideHistoricalInteractionUnion: pairs.filter(({ to }) => interaction.has(cellKey(to))).length,
    pairs,
    requiredFailureState: 'RETAIN_CURRENT_SOURCE_STATE_NO_OPENING_NO_EXCAVATION_NO_TRANSFER',
    status: 'NO_COUNTERPART_OWNER_OR_ACCEPTED_STATE_CONTRACT',
  };
});

const topFace = b07.construction.filter(({ x, y, z }) => y === 72 && x >= 2105 && x <= 2111 && z >= -401 && z <= -395);
const topReceiverPairs = topFace.map((from) => ({ from, to: { x: from.x, y: 73, z: from.z } }));
const topReceiverCandidate = {
  id: 'B07-SURFACE-RECEIVER-PROSPECTIVE-SEAM',
  fromOwnerId: 'P1-B07-SURFACE-ARCHITECTURE-R07J',
  toOwnerId: null,
  direction: 'POSITIVE_Y',
  relationship: 'EXACT_CLOSED_CAP_TO_UNCLASSIFIED_EXTERIOR_RECEIVER_DEFAULT_DENY',
  interfaceCellSet: manifest(topFace),
  transitionCount: topReceiverPairs.length,
  transitionPairSha256: pairHash(topReceiverPairs),
  sourceState: 'minecraft:polished_diorite',
  allowedDesiredStateSetSha256: null,
  requiredFailureState: 'KEEP_ALL_49_CAP_CELLS_SOLID_AND_KEEP_HEADHOUSE_DOORLESS',
  status: 'NO_EXTERIOR_OWNER_LANDING_ACCESS_BOUNDARY_OR_FAILURE_RECEIVER',
  pairs: topReceiverPairs,
};

const canonicalR07j = r07jManifest.scope.geometry;
const historicalArchitecture = {
  canonicalOwner: r07jManifest.scope.canonicalOwner,
  releaseStatus: r07jQa.status,
  acceptedClosedCap: canonicalR07j.exactSevenBySevenTopFace,
  acceptedHeadhouseShell: canonicalR07j.headhouseShell,
  acceptedHeadhouseInterior: canonicalR07j.preservedConnectedHeadroom,
  r09RetainedHold: r07jQa.preservation.r09bR09cR09d,
  commissioningBoundary: r07jQa.commissioningBoundary,
};

const requiredFields = releaseContract.interfaceContractRequiredFields;
const missingRequiredFields = requiredFields.filter((field) => {
  const aliases = {
    id: 'id', ownerA: 'fromOwnerId', ownerB: 'toOwnerId', direction: 'direction', bounds: 'interfaceCellSet.bounds',
    cellCount: 'interfaceCellSet.cellCount', cellSetSha256: 'interfaceCellSet.coordinateSetSha256',
    transitionCount: 'transitionCount', componentCount: 'componentCount', largestComponentCellCount: 'largestComponentCellCount',
    componentSetSha256: 'componentSetSha256', allowedSourceStateSetSha256: 'allowedSourceStateSetSha256', allowedDesiredStateSetSha256: 'allowedDesiredStateSetSha256',
  };
  const key = aliases[field];
  return key.split('.').reduce((value, segment) => value?.[segment], topReceiverCandidate) == null;
});

const fluid = containment.fluidTopology;
const gravity = containment.gravityMigration;
const report = {
  schemaVersion: 1,
  id: 'MP05-B07-OWNERSHIP-INTERFACE-CONTRACT-01',
  generatedAtUtc: GENERATED_AT,
  status: 'NO_AUTHORITY_FOR_B07_CONSTRUCTION_OR_EXTERIOR_RECEIVER',
  disposition: {
    contractCanBeAcceptedFromCurrentEvidence: false,
    contractCanBeProposedWithoutStealingAcceptedCells: false,
    reason: 'The only B07 construction owner is an unaccepted proposal; the exact surface seam is an accepted R07J fail-closed cap with no exterior counterpart owner; lower-lobby and fluid receiver interfaces remain geometry-free/default-deny in the current registry.',
    permittedAction: 'READ_ONLY_DESIGN_AND_OWNER_ACCEPTANCE_ONLY',
    prohibitedActions: ['operation compilation', 'cap removal', 'shaft opening', 'excavation', 'fluid treatment', 'gravity support migration', 'exterior door or landing work', 'route or egress commissioning'],
  },
  sourceBindings: Object.fromEntries([
    mechanismsPath, lifeSafetyPath, registryPath, releaseContractPath, integratedPath, containmentPath, r07jManifestPath, r07jQaPath,
  ].map((filename) => [filename, { sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size }])),
  canonicalGeometry: {
    candidateId: b07Candidate.id,
    construction: b07Candidate.exactCellSets.excavationReservation,
    interaction: b07Candidate.exactCellSets.interactionUnion,
    derivedCurrentGeometry: {
      construction: manifest(b07.construction),
      interaction: manifest(b07.interaction),
      qualification: 'The derived manifests use this report generator\'s coordinate hash contract. The immediately preceding canonical values are the authoring records for B07.',
    },
    constructionOwnershipFlag: b07Candidate.exactCellSets.excavationReservation.constructionOwnership,
    physicalOpeningAuthorized: mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.physicalOpeningAuthorized,
  },
  existingOwnerAndProtectedMap: {
    acceptedHistoricalArchitecture: historicalArchitecture,
    b07ProposedOwner: b07Owner,
    b07ProposedPrecedenceAdjudication: b07Adjudication,
    existingB07RegistryInterfaces: b07Interfaces,
    protectedOrSensitiveIntersections: {
      generatedStructureInteractionIntersectionCount: b07Candidate.immutableSnapshotAudit.generatedStructureInteractionIntersections.length,
      protectedRelicInteractionIntersectionCount: b07Candidate.immutableSnapshotAudit.protectedRelicInteractionIntersections.length,
      candidateRelicBufferInteractionIntersectionCount: b07Candidate.immutableSnapshotAudit.candidateRelicBufferInteractionIntersections.length,
      immutableBlockEntityInteractionIntersectionCount: b07Candidate.immutableSnapshotAudit.blockEntityInteractionIntersections.length,
      currentSourceBlockEntityCount: integrated.sourceInventory.immutableBlockEntities.length,
      currentSourceSavedEntityCount: integrated.sourceInventory.immutableSavedEntities.length,
      qualification: 'Zero catalogued protected/relic/entity overlap does not grant construction authority or make an unowned exterior receiver safe.',
    },
    activeHazards: {
      fluidTopology: {
        constructionContact: fluid.sourceFluidContacts.construction,
        interactionContact: fluid.sourceFluidContacts.interaction,
        diagnosticComponent: fluid.components[0].diagnosticComponent,
        receiverDisposition: fluid.components[0].topologyDisposition,
      },
      gravity: {
        interactionGravity: gravity.interactionGravity,
        unsupportedCount: gravity.unsupportedGravityCount,
        unsupportedGravityCells: gravity.unsupportedGravityCells,
        doctrineDisposition: 'NO_ACCEPTED_PERMANENT_GRAVITY_MIGRATION_OR_ROLLBACK_DOCTRINE',
      },
    },
  },
  directionalConstructionBoundarySeams: directionalSeams,
  requiredEndpointInterfaces: [
    topReceiverCandidate,
    {
      id: 'B07-LOWER-LOBBY-INTERFACE',
      fromOwnerId: 'OWN-B07', toOwnerId: null, direction: 'DOWNSTREAM_TO_LOWER_LOBBY',
      relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY', interfaceCellSet: null,
      transitionCount: null, requiredFailureState: 'RETAIN_R09A_R09D_CLOSED_LOWER_HOLD',
      status: 'NO_EXACT_APERTURE_OR_LOBBY_COUNTERPART_OWNER',
    },
    {
      id: 'B07-FLUID-RECEIVER-INTERFACE',
      fromOwnerId: 'OWN-B07', toOwnerId: null, direction: 'B07_WATER_TO_UNDEFINED_RECEIVER',
      relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY', interfaceCellSet: null,
      transitionCount: null, requiredFailureState: 'RETAIN_ALL_SOURCE_FLUID_AND_WATERLOGGED_STATES',
      status: 'NO_FINITE_RECEIVER_OVERFLOW_OWNER_OR_SOURCE_TO_FUTURE_TRANSITIONS',
    },
  ],
  candidateContractRequirements: {
    contractRequiredFields: requiredFields,
    surfaceReceiverMissingRequiredFields: missingRequiredFields,
    allDirectionalSeamsMustObtain: [
      'accepted one-owner assignment for every changed construction and interaction cell',
      'accepted named counterpart owner or explicit default-closed ownerless terminal',
      'exact source and desired-state manifests; no wildcard masks',
      'directional transition pair set and connected-component accounting',
      'fluid receiver capacity/freeboard, overflow, drainage and fail-closed state',
      'permanent gravity support/replacement state with safe reverse-order rollback',
      'lower-lobby and exterior normal-walk endpoints, access boundary, lighting, smoke/power and independent-egress disposition',
      'fresh scoped safety kernel immediately before any physical package',
    ],
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldMutationsPerformed: false,
    worldCapturePerformed: false,
    rconInvoked: false,
    operationFilesEmitted: 0,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);

const esc = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const mapSvg = (() => {
  const unit = 34;
  const minX = 2103; const maxX = 2113; const minZ = -403; const maxZ = -393;
  const left = 100; const top = 75;
  const cells = [];
  const topKeys = new Set(topFace.map(cellKey));
  const wallKeys = new Set();
  for (let x = 2105; x <= 2111; x += 1) for (let z = -401; z <= -395; z += 1) {
    if (x === 2105 || x === 2111 || z === -401 || z === -395) wallKeys.add(cellKey({ x, y: 73, z }));
  }
  for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
    const key = cellKey({ x, y: 72, z });
    const px = left + (x - minX) * unit; const py = top + (z - minZ) * unit;
    const fill = topKeys.has(key) ? '#b85c38' : '#eef2f5';
    cells.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" fill="${fill}" stroke="#73808c"/><title>${x},72,${z}${topKeys.has(key) ? ': accepted R07J closed B07 cap' : ': outside cap'}</title>`);
  }
  const walls = [];
  for (const key of wallKeys) {
    const [x, y, z] = key.split(',').map(Number); const px = left + (x - minX) * unit; const py = top + (z - minZ) * unit;
    walls.push(`<rect x="${px + 5}" y="${py + 5}" width="${unit - 10}" height="${unit - 10}" fill="none" stroke="#18212a" stroke-width="3"><title>${x},${y},${z}: accepted R07J headhouse perimeter at y=73</title></rect>`);
  }
  const labels = [];
  for (let x = minX; x <= maxX; x += 1) labels.push(`<text x="${left + (x - minX) * unit + 5}" y="${top - 10}" font-size="10">${x}</text>`);
  for (let z = minZ; z <= maxZ; z += 1) labels.push(`<text x="${left - 48}" y="${top + (z - minZ) * unit + 20}" font-size="10">${z}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="510" viewBox="0 0 760 510"><style>text{font-family:ui-monospace,monospace;fill:#18212a}.title{font-weight:700;font-size:18px}.note{font-size:12px}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="20" y="27">MP05 B07 surface receiver ownership screen</text><text class="note" x="20" y="49">Plan y=72; rust = accepted R07J 49-cell closed cap; black inset = y=73 headhouse perimeter.</text>${cells.join('')}${walls.join('')}${labels.join('')}<rect x="500" y="90" width="20" height="20" fill="#b85c38" stroke="#73808c"/><text class="note" x="530" y="105">Accepted R07J cap; not an opening.</text><rect x="500" y="125" width="20" height="20" fill="#eef2f5" stroke="#73808c"/><text class="note" x="530" y="140">No exterior receiver owner/landing contract.</text><text class="note" x="500" y="185">Result: any opening would modify an</text><text class="note" x="500" y="202">accepted closed surface asset before a</text><text class="note" x="500" y="219">counterpart owner and state contract exist.</text></svg>`;
})();

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'b07-surface-receiver-ownership-map.svg')), mapSvg);
fs.writeFileSync(abs(path.join(OUT_DIR, 'ownership-interface-contract-findings.json')), `${JSON.stringify(report, null, 2)}\n`);

const boundaryRows = directionalSeams.map((seam) => `| ${seam.direction} | ${seam.transitionCount.toLocaleString()} | \`${seam.fromCellSet.coordinateSetSha256}\` | ${seam.toCellsInsideHistoricalInteractionUnion.toLocaleString()} | No accepted counterpart — retain source |`).join('\n');
const markdown = `# MP05 B07 ownership and exterior-receiver contract 01

**Status:** \`${report.status}\`  
**Machine findings:** [JSON](../../../${rel(path.join(OUT_DIR, 'ownership-interface-contract-findings.json'))})  
**Ownership map:** [SVG](../../../${rel(path.join(OUT_DIR, 'b07-surface-receiver-ownership-map.svg'))})

This is a read-only ownership screen using the current B07 design/containment
records and the accepted R07J surface release. It emits no operation or
construction authorization.

## Decision

No B07 construction or exterior-receiver contract can be accepted from the
current evidence without taking cells from an accepted closed asset or
inventing a missing owner. The 8,134-cell B07 west-two construction set is
only a proposed \`OWN-B07\` assignment, not an accepted assignment. Its
13,608-cell interaction union has a proposed precedence conflict with
\`OWN-D06-SOURCE-RESERVATION-CONTROL\`; that adjudication is also unaccepted.

The exact 49-cell upward seam is already the accepted R07J polished-diorite
shaft cap (x=2105..2111, y=72, z=-401..-395). Its headhouse is doorless, and
there is no accepted exterior owner, landing, access boundary, or failure
receiver. Reopening it would alter accepted architecture before a reciprocal
interface exists. The lower lobby and water receiver records likewise retain
null interface geometry/counterpart owners.

## Exact directional construction boundary map

Every construction-boundary neighbour lies in the historical interaction
union, but that fact does not assign a counterpart owner. The JSON contains
every exact directed from/to coordinate pair.

| Direction | Face pairs | From-cell set SHA-256 | Neighbours in interaction union | Required current failure state |
|---|---:|---|---:|---|
${boundaryRows}

## Existing accepted and protected constraints

- R07J owns the accepted 49-cell solid cap and 121-cell fail-closed headhouse;
  it expressly left the shaft, door, route, lift, smoke, power, drainage, and
  egress closed.
- The R09B/R09C/R09D retained hold is a verified 1,848-cell existing state;
  this screen does not assign it to a new B07 transaction.
- The current B07 evidence has no catalogued generated-structure, protected
  relic, block-entity, or saved-entity intersection. That is preservation
  evidence only, not ownership.
- The current source still has five construction fluid contacts, 89 interaction
  fluid contacts in a diagnostic component that reaches its survey boundary,
  plus 90 interaction gravity cells (11 with unsupported support chains).
  No finite receiver, overflow, or permanent gravity-inverse doctrine exists.

## What a later contract must bind

It must provide exact accepted owners on both sides, exact source and desired
states, directional transition pairs, connected-component accounting, an owned
fluid receiver/overflow/failure state, permanent gravity treatment with safe
rollback, exact lower and exterior route endpoints, and the fresh physical
release kernel. Until then every listed seam is default-closed and the current
source state is the required failure state.
`;
fs.writeFileSync(abs(MARKDOWN_OUT), markdown);

console.log(JSON.stringify({
  status: report.status,
  report: rel(path.join(OUT_DIR, 'ownership-interface-contract-findings.json')),
  map: rel(path.join(OUT_DIR, 'b07-surface-receiver-ownership-map.svg')),
  markdown: rel(MARKDOWN_OUT),
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
