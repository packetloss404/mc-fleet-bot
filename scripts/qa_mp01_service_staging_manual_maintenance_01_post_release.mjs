#!/usr/bin/env node
/** Independent immutable-post QA for the MP01 manual maintenance pair. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : ''; };
const post = arg('--post-root'); const manifestPath = arg('--manifest'); const out = arg('--out');
if (!post || !manifestPath || !out) throw new Error('usage: --post-root <complete-save> --manifest <manifest> --out <report>');
const absolute = (file) => path.resolve(ROOT, file);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(absolute(file));
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(absolute(post), member))) throw new Error(`post lacks ${member}`);
const manifestBytes = read(manifestPath); const manifest = JSON.parse(manifestBytes);
const pkg = manifest.operations?.['service-staging-manual-maintenance'];
if (manifest.scope?.releaseId !== 'MP01-SERVICE-STAGING-MANUAL-MAINTENANCE-01' || pkg?.targetCellCount !== 2 || pkg?.exactInverse !== true) throw new Error('manifest is not exact maintenance release');
const reader = new AnvilReader(path.join(absolute(post), 'region'));
const entitiesReader = new AnvilReader(path.join(absolute(post), 'entities'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const mismatches = [];
const expect = async (id, x, y, z, expected) => { const actual = await state(x, y, z); if (actual !== expected) mismatches.push({ id, x, y, z, expected, actual }); };
await expect('smithing-table', 2002, 165, -900, 'minecraft:smithing_table');
await expect('grindstone', 2003, 165, -900, 'minecraft:grindstone[face=floor,facing=north]');
await expect('retained-crafting', 2000, 165, -900, 'minecraft:crafting_table');
await expect('retained-cartography', 2001, 165, -900, 'minecraft:cartography_table');
for (let x = 2000; x <= 2003; x += 1) { await expect('support', x, 164, -900, 'minecraft:polished_andesite'); for (const y of [166, 167]) await expect('headroom', x, y, -900, 'minecraft:air'); }
for (let x = 1999; x <= 2005; x += 1) for (let y = 165; y <= 167; y += 1) for (let z = -899; z <= -895; z += 1) await expect('preserved-approach', x, y, z, 'minecraft:air');
for (const x of [2006, 2008]) { await expect('door-lower', x, 166, -894, 'minecraft:iron_door[facing=west,half=lower,hinge=left,open=false,powered=false]'); await expect('door-upper', x, 167, -894, 'minecraft:iron_door[facing=west,half=upper,hinge=left,open=false,powered=false]'); }
await expect('threshold', 2007, 165, -894, 'minecraft:stone');
const blockEntities = []; const savedEntities = [];
for (const cx of [124, 125]) { const chunk = await reader.chunk(cx, -57); for (const entity of chunk?.block_entities ?? []) { const { x, y, z } = entity; if (x >= 1998 && x <= 2005 && y >= 164 && y <= 173 && z >= -902 && z <= -894) blockEntities.push({ x, y, z, id: entity.id ?? null }); } const entityChunk = await entitiesReader.chunk(cx, -57); for (const entity of entityChunk?.Entities ?? []) { const pos = entity.Pos?.slice(0, 3).map(Number); if (pos && pos[0] >= 1998 && pos[0] <= 2005 && pos[1] >= 164 && pos[1] <= 173 && pos[2] >= -902 && pos[2] <= -894) savedEntities.push({ id: entity.id ?? null, pos }); } }
const checks = { exactTargets: !mismatches.some(({ id }) => id === 'smithing-table' || id === 'grindstone'), retainedSupportRow: !mismatches.some(({ id }) => id.startsWith('retained')), supportsAndHeadroom: !mismatches.some(({ id }) => id === 'support' || id === 'headroom'), preservedApproach: !mismatches.some(({ id }) => id === 'preserved-approach'), closedBoundaries: !mismatches.some(({ id }) => id.startsWith('door') || id === 'threshold'), noPostBlockEntities: blockEntities.length === 0, noPostSavedEntities: savedEntities.length === 0 };
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = { schemaVersion: 1, id: 'mp01-service-staging-manual-maintenance-01-independent-post-qa', status: failures.length ? 'FAIL' : 'PASS', postRoot: post, postCaptureManifestSha256: sha(read(`${post}/combined-zones-complete-save-capture.json`)), manifest: { path: manifestPath, sha256: sha(manifestBytes) }, mismatches, localEntities: { blockEntities, savedEntities }, checks, failures, functionalQa: { restrictedInteriorApproach: 'clear two-layer approach retained to both closed manual doors', serviceTools: 'smithing and grindstone are manual non-container work surfaces' }, nonClaims: manifest.scope.nonClaims, readOnly: true, worldMutated: false, rconCalled: false };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, checks, failures, out }, null, 2)); process.exitCode = failures.length ? 1 : 0;
