#!/usr/bin/env node
/** Validate that the SYS03 passenger gate remains source-bound and default-deny. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const CONTRACT = option('--contract', 'data/world-review/sys03-passenger-rail-commissioning-acceptance-gate-01-sys03-post-20260826T153100Z/sys03-passenger-rail-commissioning-acceptance-gate-01.json');
const abs = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const reject = (condition, message) => { if (!condition) throw new Error(`SYS03 passenger commissioning gate validation rejected: ${message}`); };
const contract = JSON.parse(fs.readFileSync(abs(CONTRACT), 'utf8'));
reject(contract.id === 'SYS03-PASSENGER-RAIL-COMMISSIONING-ACCEPTANCE-GATE-01', 'identity drifted');
reject(contract.status === 'SOURCE_BOUND_DEFAULT_DENY__NO_SYS03_PASSENGER_SERVICE_COMMISSIONED', 'status drifted');
reject(contract.disposition.readOnly === true && contract.disposition.mutationAuthority === false && contract.disposition.operationsCompiled === false && contract.disposition.releaseAuthorization === false && contract.disposition.rconCalled === false && contract.disposition.worldMutated === false, 'contract became authorizing');
const snapshot = abs(contract.source.snapshotRoot);
const capture = JSON.parse(fs.readFileSync(path.join(snapshot, 'combined-zones-complete-save-capture.json'), 'utf8'));
reject(capture.immutableCopy === true && capture.captureId === contract.source.captureId && capture.requiredMembers.length === 130, 'source capture drifted');
for (const member of capture.requiredMembers) { const bytes = fs.readFileSync(path.join(snapshot, member.path)); reject(bytes.length === member.bytes && sha256(bytes) === member.sha256, `source member drifted: ${member.path}`); }
for (const input of contract.source.inputs) reject(sha256(fs.readFileSync(abs(input.path))) === input.sha256, `input drifted: ${input.path}`);
reject(contract.observedCurrentState.high16.civilOnly === true && contract.observedCurrentState.high16.passengerServiceCommissioned === false, 'civil High-16 was promoted');
const b09 = contract.observedCurrentState.b09MaintenanceOnly;
reject(b09.activeShuttleCommissioned === true && b09.passengerTransportCommissioned === false && b09.publicTransportCommissioned === false && b09.protectedCellCount === 19 && b09.inactivePoweredRailCount === 15 && b09.authenticatedMinecartCount === 1 && b09.lowerVoid.platformAccepted === false, 'maintenance-only state drifted');
reject(contract.acceptanceGates.length === 8 && contract.acceptanceGates.every((gate) => gate.accepted === false && gate.currentEvidenceStatus === 'NOT_ACCEPTED'), 'gate closure drifted');
reject(contract.acceptanceRule.acceptedGateCount === 0 && contract.acceptanceRule.passengerOpeningAllowed === false && contract.acceptanceRule.sameFreshImmutablePostRequired === true, 'opening condition drifted');
for (const [key, value] of Object.entries(contract.separationRules)) reject(value === false, `unsafe separation rule changed: ${key}`);
console.log(JSON.stringify({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_PASSENGER_COMMISSIONING_GATE', contractId: contract.id, mutationAuthority: false, acceptedGateCount: 0, requiredGateCount: 8, passengerServiceCommissioned: false, b09ProtectedCells: 19 }));
