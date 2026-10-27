#!/usr/bin/env node
/** Immutable-post QA for the finite B07 ice-edge water pocket plug. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const manifestArg = option('--manifest'); const snapshotArg = option('--snapshot'); const outArg = option('--out');
const abs = (value) => path.resolve(ROOT, value); const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP05 B07 ice-edge finite water plug post-QA rejected: ${message}`); };
fail(manifestArg && snapshotArg && outArg, '--manifest, --snapshot, and --out are required');
const manifestPath = abs(manifestArg); const snapshot = abs(snapshotArg); const manifestBytes = fs.readFileSync(manifestPath); const manifest = JSON.parse(manifestBytes);
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(String(state).split('[', 1)[0]) || String(state).includes('waterlogged=true');
fail(manifest.id === 'MP05-B07-ICE-EDGE-FINITE-WATER-PLUG-01' && manifest.functionalAcceptance?.finiteComponentCount === 2 && manifest.functionalAcceptance?.finiteComponentCellCount === 35 && manifest.scope?.sourceWaterComponents?.map(({ cellCount }) => cellCount).sort((a, b) => a - b).join(',') === '10,25', 'manifest identity or two-component topology drifted');
const reader = new AnvilReader(path.join(snapshot, 'region')); const cache = new Map();
const get = async (cell) => { const k = cellKey(cell); if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(k); };
const targetFailures = []; for (const entry of manifest.target.canonicalPostStates) { const got = await get(entry.cell); if (got !== entry.targetState) targetFailures.push({ ...entry, got }); }
const starts = manifest.scope.receiverFacingStarts; const startsNow = await Promise.all(starts.map(async (cell) => ({ cell, state: await get(cell) })));
const bulkhead = []; for (let x = 2106; x <= 2110; x += 1) for (let y = 62; y <= 65; y += 1) bulkhead.push({ x, y, z: -372 });
const core = []; for (let x = 2107; x <= 2109; x += 1) for (let y = 63; y <= 64; y += 1) for (let z = -380; z <= -373; z += 1) core.push({ x, y, z });
const bulkheadFailures = []; for (const cell of bulkhead) { const got = await get(cell); if (got !== 'minecraft:polished_deepslate') bulkheadFailures.push({ cell, got }); }
const coreFailures = []; for (const cell of core) { const got = await get(cell); if (got !== 'minecraft:air') coreFailures.push({ cell, got }); }
const doors = []; for (let x = 2107; x <= 2108; x += 1) for (let y = 63; y <= 64; y += 1) doors.push({ x, y, z: -381 });
const doorFailures = []; for (const cell of doors) { const got = await get(cell); if (!got.startsWith('minecraft:oak_door[')) doorFailures.push({ cell, got }); }
const haloFailures = []; const postHaloFluids = []; for (const entry of manifest.interactionSet.fullHaloCanonicalPostStates ?? []) { const got = await get(entry.cell); if (got !== entry.state) haloFailures.push({ ...entry, got }); if (isFluid(got)) postHaloFluids.push({ cell: entry.cell, state: got }); }
const checks = { all35PlugTargetsExact: targetFailures.length === 0, noReceiverFacingWaterRemains: startsNow.every(({ state }) => state === 'minecraft:polished_deepslate'), retainedBulkheadClosed: bulkheadFailures.length === 0, retainedReceiverCoreDry: coreFailures.length === 0, retainedControlledDoors: doorFailures.length === 0, full249CellPostHaloExactAndDry: haloFailures.length === 0 && postHaloFluids.length === 0, noRouteOrEgressClaim: manifest.functionalAcceptance.publicAccessCommissioned === false && manifest.functionalAcceptance.emergencyEgressCommissioned === false };
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([key]) => key);
const report = { schemaVersion: 1, id: 'mp05-b07-ice-edge-finite-water-plug-01-post-qa', status: failures.length ? 'FAIL' : 'PASS_EXECUTED_B07_ICE_EDGE_FINITE_WATER_PLUG_QA', readOnly: true, worldMutated: false, release: { manifest: { path: manifestArg, sha256: sha(manifestBytes) }, snapshot: snapshotArg }, checks, failures, targetFailures, startsNow, bulkheadFailures, coreFailures, doorFailures, haloFailures, postHaloFluids };
report.qaPayloadSha256 = sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(outArg)), { recursive: true }); fs.writeFileSync(abs(outArg), `${JSON.stringify(report, null, 2)}\n`); if (failures.length) throw new Error(failures.join(', ')); console.log(JSON.stringify({ status: report.status, out: outArg }, null, 2));
