#!/usr/bin/env node
/** Independent post-release QA for the Ravensreach connected crew-recovery niche. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback = null) => { const index = process.argv.indexOf(name); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; };
const need = (name) => { const value = arg(name); if (!value) throw new Error(`${name} is required`); return value; };
const ledgerPath = need('--ledger'); const out = need('--out'); const manifestPath = arg('--manifest', 'data/buildops/cobalt-rr-crew-recovery-niche-01.release-manifest.json');
const ID = 'COBALT-RR-CREW-RECOVERY-NICHE-01'; const NODE = 'CZ-SYS03-COBALT-RR-CREW-RECOVERY-NICHE'; const TX = 'cobalt-rr-crew-recovery-niche-01';
const abs = (value) => path.resolve(ROOT, value); const sha = (value) => crypto.createHash('sha256').update(value).digest('hex'); const fail = (value, message) => { if (!value) throw new Error(`${ID} post-QA rejected: ${message}`); };
const box = ({ minX, maxX, minY, maxY, minZ, maxZ }) => { const cells = []; for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) for (let z = minZ; z <= maxZ; z++) cells.push({ x, y, z }); return cells; };
const clear = box({ minX: -161, maxX: -159, minY: 14, maxY: 16, minZ: -383, maxZ: -381 }); const aperture = box({ minX: -162, maxX: -162, minY: 14, maxY: 16, minZ: -382, maxZ: -382 });
const floor = box({ minX: -161, maxX: -159, minY: 13, maxY: 13, minZ: -383, maxZ: -381 }); const ceiling = box({ minX: -161, maxX: -159, minY: 17, maxY: 17, minZ: -383, maxZ: -381 });
const rails = [...box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -386, maxZ: -386 }), ...box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -380, maxZ: -380 })];
const ledger = JSON.parse(fs.readFileSync(abs(ledgerPath), 'utf8')); const manifest = JSON.parse(fs.readFileSync(abs(manifestPath), 'utf8'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.releaseNodeId === NODE && ledger.transactionId === TX && manifest.scope?.releaseId === ID, 'identity/status drifted'); fail(ledger.manifest?.sha256 === sha(fs.readFileSync(abs(manifestPath))), 'manifest binding drifted');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:containment', 'rollback-poststate-preflight:recovery-niche']) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `${stage} is not PASS`);
const reader = new AnvilReader(abs(ledger.postSnapshot.regions)); const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)); const [clearStates, apertureStates, floorStates, ceilingStates, railStates] = await Promise.all([Promise.all(clear.map(state)), Promise.all(aperture.map(state)), Promise.all(floor.map(state)), Promise.all(ceiling.map(state)), Promise.all(rails.map(state))]);
fail(clearStates.every((value) => value === 'minecraft:air'), 'niche clearance drifted'); fail(apertureStates.every((value) => value === 'minecraft:air'), 'bridge aperture drifted'); fail(floorStates.every((value) => value === 'minecraft:polished_andesite'), 'niche floor drifted'); fail(ceilingStates.every((value) => value === 'minecraft:polished_deepslate'), 'niche ceiling drifted'); fail(railStates.every((value) => value === 'minecraft:rail[shape=east_west,waterlogged=false]'), 'retained directional rail drifted');
const report = { schemaVersion: 1, id: 'cobalt-rr-crew-recovery-niche-01-post-release-qa', status: 'PASS_EXECUTED_COBALT_RR_CREW_RECOVERY_NICHE_QA', release: { ledger: ledgerPath, manifest: manifestPath }, postSnapshot: ledger.postSnapshot, geometry: { recoveryNicheClear: clear.length, bridgeAperture: aperture.length, recoveryFloor: floor.length, recoveryCeiling: ceiling.length, retainedDirectionalRails: rails.length }, functionalBoundary: { crewRecoveryNicheConnected: true, publicRefugeCommissioned: false, railPowerCommissioned: false, signalCommissioned: false, passengerServiceCommissioned: false } };
report.qaPayloadSha256 = sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(out)), { recursive: true }); fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, out }, null, 2));
