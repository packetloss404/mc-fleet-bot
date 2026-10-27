#!/usr/bin/env node
/** Validate the generated MP02/MP04 B08/B09 contract without emitting operations. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const CONTRACT = value('--contract', 'data/world-review/mp05-if-b08-b09-terminus-mp02-chamber-contract-01-current-mp01-anvil-post-20260826T163300Z/mp05-if-b08-b09-terminus-mp02-chamber-contract-01.json');
const absolute = (filename) => path.resolve(ROOT, filename);
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const reject = (condition, message) => { if (!condition) throw new Error(`MP05 IF B08/B09 terminus contract validation rejected: ${message}`); };
const cellsIn = (bounds) => { const cells = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z }); return cells; };
const stateHash = (records) => digest(`mp05-if-b08-b09-current-state-v1\n${records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const contract = JSON.parse(fs.readFileSync(absolute(CONTRACT), 'utf8'));
reject(contract.id === 'MP05-IF-B08-B09-TERMINUS-AND-MP02-CHAMBER-01', 'identity drifted');
reject(contract.disposition.defaultDeny === true && contract.disposition.mutationAuthority === false && contract.disposition.operationsCompiled === false && contract.disposition.releaseAuthorization === false, 'contract became authorizing');
for (const input of contract.sourceBinding.inputs) reject(digest(fs.readFileSync(absolute(input.path))) === input.sha256, `input hash drifted: ${input.path}`);
const snapshot = absolute(contract.sourceBinding.snapshotRoot);
const capture = JSON.parse(fs.readFileSync(path.join(snapshot, 'combined-zones-complete-save-capture.json'), 'utf8'));
reject(capture.immutableCopy === true && capture.requiredMembers.length === 130 && capture.captureId === contract.sourceBinding.captureId, 'capture binding drifted');
for (const member of capture.requiredMembers) { const bytes = fs.readFileSync(path.join(snapshot, member.path)); reject(bytes.length === member.bytes && digest(bytes) === member.sha256, `capture member drifted: ${member.path}`); }
const reader = new AnvilReader(path.join(snapshot, 'region'));
const states = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const tests = [
  ['b03Aperture', { minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 }, 'minecraft:air'],
  ['b09IsolationCap', { minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 }, 'minecraft:polished_diorite'],
  ['lowerInterior', { minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 }, 'minecraft:air'],
];
for (const [key, bounds, expected] of tests) { const records = await states(cellsIn(bounds)); reject(records.every(({ state }) => state === expected), `${key} source state drifted`); reject(stateHash(records) === contract.currentInterfaceFacts[key].currentStateSetSha256, `${key} state hash drifted`); }
const portal = await states([{ x: 2050, y: 130, z: -748 }, { x: 2050, y: 131, z: -748 }]);
reject(portal.every(({ state }) => state === 'minecraft:polished_diorite') && stateHash(portal) === contract.currentInterfaceFacts.controlledPortalStudy.currentStateSetSha256, 'portal study state drifted');
const functional = contract.mandatoryFunctionalAcceptance;
reject(functional.receiver.accepted === false && functional.returnAndRescue.acceptedIndependentProtectedDischarges === 0 && functional.returnAndRescue.acceptedNormalWalkReturn === false && functional.returnAndRescue.acceptedFailureRoute === false, 'contract implies an accepted receiver/return/rescue path');
reject(contract.counterpartAcceptance.joint.acceptanceRecord === null && contract.counterpartAcceptance.mp04.currentWorldCells === 0, 'unaccepted bilateral/MP04 fact drifted');
console.log(JSON.stringify({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_CONTRACT', contractId: contract.id, mutationAuthority: contract.disposition.mutationAuthority, b03ApertureCells: contract.currentInterfaceFacts.b03Aperture.cellCount, b09CapCells: contract.currentInterfaceFacts.b09IsolationCap.cellCount, acceptedRescueDischarges: functional.returnAndRescue.acceptedIndependentProtectedDischarges }));
