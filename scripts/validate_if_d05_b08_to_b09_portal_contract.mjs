#!/usr/bin/env node
/**
 * Validates that the D05 B08-to-B09 portal template remains a source-bound,
 * non-authorizing record and that its immutable facts agree with current
 * Anvil-post assessment evidence. It deliberately emits no operations.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const CONTRACT = value('--contract', 'docs/masterplans/05-combined-zones/IF-D05-B08-TO-B09-PORTAL-CONTRACT-TEMPLATE-01.json');
const EGRESS = 'data/world-review/mp05-b09-b08-interface-egress-feasibility-current-anvil-post-20260826T163300Z/b08-b09-interface-egress-feasibility.json';
const RECEIVER = 'data/world-review/mp05-b09-lower-station-receiver-interface-design-current-anvil-post-20260826T163300Z/source-bound-design-hold.json';
const REGISTRY = 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json';
const abs = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (filename) => crypto.createHash('sha256').update(fs.readFileSync(abs(filename))).digest('hex');
const reject = (condition, message) => { if (!condition) throw new Error(`IF-D05-B08-TO-B09 validation rejected: ${message}`); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const stateSetSha256 = async (reader, cells) => {
  const records = [];
  for (const cell of cells) {
    records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  records.sort((left, right) => left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z);
  return crypto.createHash('sha256').update(`combined-zones-current-block-state-set-v1\n${records
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`).digest('hex');
};

const contract = readJson(CONTRACT);
const egress = readJson(EGRESS);
const receiver = readJson(RECEIVER);
const registry = readJson(REGISTRY);
const registryRecord = registry.proposedDirectionalInterfaceRegistry.contracts
  .find(({ contractId }) => contractId === 'IF-D05-B08-TO-B09-PORTAL');

reject(contract.id === 'IF-D05-B08-TO-B09-PORTAL-CONTRACT-TEMPLATE-01', 'template identity drifted');
reject(contract.interfaceId === 'IF-D05-B08-TO-B09-PORTAL', 'interface identity drifted');
reject(contract.disposition.readOnly === true && contract.disposition.defaultDeny === true
  && contract.disposition.mutationAuthority === false && contract.disposition.operationsCompiled === false
  && contract.disposition.acceptanceRecorded === false && contract.disposition.releaseAuthorization === false,
  'template became authorizing');
for (const input of contract.sourceBinding.inputs) {
  reject(sha256(input.path) === input.sha256, `source input hash drifted: ${input.path}`);
}
reject(same(contract.sourceBinding.snapshotRoot, egress.source.snapshotRoot)
  && same(contract.sourceBinding.completeSaveSha256, egress.source.completeSaveSha256)
  && same(contract.sourceBinding.regionSha256, egress.source.regionSha256)
  && contract.sourceBinding.regionFileCount === egress.source.regionFileCount
  && same(contract.sourceBinding.captureId, egress.source.captureId), 'egress source binding drifted');
reject(same(contract.sourceBinding.snapshotRoot, receiver.source.snapshotRoot)
  && same(contract.sourceBinding.completeSaveSha256, receiver.source.completeSaveSha256), 'receiver source binding drifted');

const door = egress.controlledDoorDecision.candidate;
reject(same(contract.currentAnvilPostFacts.defaultDenySeam, {
  cellCount: egress.protectedSets.find(({ id }) => id === 'B08-B09-DEFAULT-DENY-SEAM').cellCount,
  bounds: egress.protectedSets.find(({ id }) => id === 'B08-B09-DEFAULT-DENY-SEAM').bounds,
  coordinateSetSha256: egress.protectedSets.find(({ id }) => id === 'B08-B09-DEFAULT-DENY-SEAM').coordinateSetSha256,
  currentAuthority: egress.controlledDoorDecision.currentAuthority,
}), 'default-deny seam facts drifted');
reject(same(contract.currentAnvilPostFacts.onlyMappedDoorAperture.coordinateSetSha256, door.exactEnvelope.coordinateSetSha256)
  && same(contract.currentAnvilPostFacts.onlyMappedDoorAperture.cells.map(({ x, y, z }) => ({ x, y, z })), door.protectedOverlaps['B09-LOWER-SHELL'].cells)
  && door.currentStateCensus['minecraft:polished_diorite'] === 2
  && door.currentAir.cellCount === 0, 'portal aperture facts drifted');
reject(same(contract.currentAnvilPostFacts.b09WestIsolationCap, {
  cellCount: receiver.observedCurrentState.b08IsolationCap.cellCount,
  bounds: receiver.observedCurrentState.b08IsolationCap.bounds,
  coordinateSetSha256: receiver.observedCurrentState.b08IsolationCap.coordinateSetSha256,
  currentStateSetSha256: '69f87b7fc26dff0ca3140c8cfce1c1b649320778321fa80d237b0ef027d86ef7',
  currentStateCensus: { 'minecraft:polished_diorite': 12 },
  allCellsClosed: receiver.observedCurrentState.b08IsolationCap.allPolishedDiorite,
}), 'B09 west-cap facts drifted');
const capCells = [];
for (let y = 129; y <= 132; y += 1) for (let z = -749; z <= -747; z += 1) capCells.push({ x: 2050, y, z });
const reader = new AnvilReader(abs(path.join(contract.sourceBinding.snapshotRoot, 'region')));
reject(await stateSetSha256(reader, capCells) === contract.currentAnvilPostFacts.b09WestIsolationCap.currentStateSetSha256,
  'raw Anvil B09 west-cap state hash drifted');
reject(await stateSetSha256(reader, contract.currentAnvilPostFacts.onlyMappedDoorAperture.cells)
  === contract.currentAnvilPostFacts.onlyMappedDoorAperture.currentStateSetSha256,
  'raw Anvil portal-aperture state hash drifted');
reject(same(contract.currentAnvilPostFacts.adjacentLowerInterior, {
  ...receiver.observedCurrentState.lowerInterior,
  qualification: 'Not a receiver, platform, independent normal-walk approach, or rescue discharge.',
}), 'adjacent lower-interior facts drifted');
const cart = receiver.observedCurrentState.savedEntitiesInReviewHalo.find(({ id, tags }) => id === 'minecraft:minecart'
  && tags.includes(contract.currentAnvilPostFacts.r12rMinecart.authenticatedTag));
reject(cart && same(cart.position, contract.currentAnvilPostFacts.r12rMinecart.savedPosition), 'R12R minecart fact drifted');
reject(registryRecord && registryRecord.fromOwnerId === contract.counterpartOwners.from.ownerId
  && registryRecord.toOwnerId === contract.counterpartOwners.to.ownerId
  && registryRecord.accepted === false, 'counterpart-owner proposal drifted');

const payload = contract.mandatoryAcceptancePayload;
reject(payload.door.status.startsWith('PENDING_') && payload.door.portalCellSet === null
  && payload.door.inverseProven === false && payload.receiver.receiverId === null
  && payload.rescueAndEgress.acceptedIndependentProtectedDischarges === 0
  && payload.r12rMinecartPreservationOrMigration.migrationForwardOperationSha256 === null
  && payload.r12rMinecartPreservationOrMigration.migrationRollbackOperationSha256 === null
  && payload.releaseKernel.freshImmutableSourceSnapshot === null,
  'unaccepted payload contains an implied design or release');
reject(payload.rescueAndEgress.maximumCrossPassageSpacingBlocks === 128
  && payload.rescueAndEgress.independentProtectedDischargesRequired === 2
  && payload.r12rMinecartPreservationOrMigration.broadCleanupProhibited === true
  && payload.r12rMinecartPreservationOrMigration.r12rControlRepurposingProhibited === true,
  'mandatory safety conditions drifted');

console.log(JSON.stringify({
  status: 'PASS_SOURCE_BOUND_NON_AUTHORIZING_TEMPLATE',
  contract: CONTRACT,
  interfaceId: contract.interfaceId,
  sourceCompleteSaveSha256: contract.sourceBinding.completeSaveSha256,
  mutationAuthority: contract.disposition.mutationAuthority,
  portalCellCount: contract.currentAnvilPostFacts.onlyMappedDoorAperture.cellCount,
  capCellCount: contract.currentAnvilPostFacts.b09WestIsolationCap.cellCount,
  acceptedIndependentProtectedDischarges: payload.rescueAndEgress.acceptedIndependentProtectedDischarges,
}));
