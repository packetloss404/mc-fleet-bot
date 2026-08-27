#!/usr/bin/env node
/** Validate the B09 operating-system contract against its exact bound source. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const CONTRACT = value('--contract', 'data/world-review/mp05-b09-operating-system-acceptance-contract-01-current-mp01-anvil-post-20260826T163300Z/mp05-b09-operating-system-acceptance-contract-01.json');
const abs = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const reject = (condition, message) => { if (!condition) throw new Error(`MP05 B09 operating-system validation rejected: ${message}`); };
const cellsIn = (bounds) => { const cells = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z }); return cells; };
const stateHash = (records) => sha256(`mp05-b09-operating-system-source-state-v1\n${records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const contract = JSON.parse(fs.readFileSync(abs(CONTRACT), 'utf8'));
reject(contract.id === 'MP05-B09-OPERATING-SYSTEM-ACCEPTANCE-CONTRACT-01', 'identity drifted');
reject(contract.status === 'SOURCE_BOUND_DEFAULT_DENY__B09_REMAINS_R12R_MAINTENANCE_ONLY', 'status drifted');
reject(contract.disposition.readOnly === true && contract.disposition.mutationAuthority === false && contract.disposition.operationsCompiled === false && contract.disposition.releaseAuthorization === false, 'contract became authorizing');
reject(contract.requiredGates.length === 9 && contract.requiredGates.every((gate) => gate.currentAcceptedCells === 0), 'gate count or default-deny state drifted');
for (const input of contract.source.inputs) reject(sha256(fs.readFileSync(abs(input.path))) === input.sha256, `input drifted: ${input.path}`);
const snapshot = abs(contract.source.snapshotRoot);
const capture = JSON.parse(fs.readFileSync(path.join(snapshot, 'combined-zones-complete-save-capture.json'), 'utf8'));
reject(capture.immutableCopy === true && capture.requiredMembers.length === 130 && capture.captureId === contract.source.captureId, 'complete source capture drifted');
for (const member of capture.requiredMembers) { const bytes = fs.readFileSync(path.join(snapshot, member.path)); reject(bytes.length === member.bytes && sha256(bytes) === member.sha256, `capture member drifted: ${member.path}`); }
const reader = new AnvilReader(path.join(snapshot, 'region'));
const specs = [
  ['lowerVoid', cellsIn({ minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 }), 'minecraft:air'],
  ['sealedWestCap', cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 }), 'minecraft:polished_diorite'],
  ['poweredRails', cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 }), 'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]'],
];
for (const [name, cells, expected] of specs) {
  const records = []; for (const cell of cells) records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  reject(records.every(({ state }) => state === expected), `${name} source state drifted`);
  if (name === 'lowerVoid') reject(stateHash(records) === contract.exactCurrentState.lowerVoid.stateSetSha256, 'lower void state hash drifted');
  if (name === 'sealedWestCap') reject(stateHash(records) === contract.exactCurrentState.sealedWestCap.stateSetSha256, 'west cap state hash drifted');
}
const protectedCells = [{ x: 2057, y: 130, z: -748 }, ...specs[2][1], { x: 2073, y: 130, z: -748 }, { x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 }];
const protectedRecords = []; for (const cell of protectedCells) protectedRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
reject(hashCells(protectedCells) === contract.exactCurrentState.r12rMaintenanceProtection.coordinateSetSha256 && stateHash(protectedRecords) === contract.exactCurrentState.r12rMaintenanceProtection.stateSetSha256, 'R12R protected state set drifted');
reject(contract.exactCurrentState.endpoints.independentProtectedDischargesAccepted === 0 && contract.exactCurrentState.endpoints.requiredIndependentProtectedDischarges === 2, 'rescue discharge constraint drifted');
reject(contract.transitionRule.partialOrOneWayOpeningAllowed === false && contract.transitionRule.r12rControlsReusable === false && contract.transitionRule.savedEntityObservationIsLiveClearance === false, 'unsafe shortcut became allowed');
console.log(JSON.stringify({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_OPERATING_SYSTEM_CONTRACT', contractId: contract.id, mutationAuthority: false, requiredGateCount: contract.requiredGates.length, acceptedGateCount: 0, r12rProtectedCells: protectedCells.length, acceptedRescueDischarges: 0 }));
