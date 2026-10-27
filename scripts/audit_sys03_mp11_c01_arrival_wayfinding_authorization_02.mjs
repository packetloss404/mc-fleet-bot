#!/usr/bin/env node
/**
 * Independent, read-only authorization audit for the three C01 arrival
 * wayfinding scout sites. It is intentionally not a compiler: it produces no
 * desired state, operation, manifest, or execution authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-masterplan-frontier-source-20260827T030918Z');
const SCOUT = option('--scout', 'data/world-review/sys03-mp11-c01-arrival-wayfinding-frontier-01-masterplan-frontier-source-20260827T030918Z/sys03-mp11-c01-arrival-wayfinding-frontier-01.json');
const OUT = option('--out', 'data/world-review/sys03-mp11-c01-arrival-wayfinding-authorization-audit-02-masterplan-frontier-source-20260827T030918Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`C01 arrival-wayfinding authorization audit rejected: ${message}`); };
const point = (x, y, z) => ({ x, y, z });
const isFluid = (state) => /^(minecraft:(water|lava|bubble_column))/.test(state) || state.includes('waterlogged=true');
const isGravity = (state) => /minecraft:(gravel|sand|red_sand|suspicious_sand|suspicious_gravel|anvil|chipped_anvil|damaged_anvil|pointed_dripstone)/.test(state) || state.includes('_concrete_powder');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(state.split('[', 1)[0]);
const cube = (center) => {
  const cells = [];
  for (let x = center.x - 1; x <= center.x + 1; x += 1) for (let y = center.y - 1; y <= center.y + 1; y += 1) for (let z = center.z - 1; z <= center.z + 1; z += 1) cells.push(point(x, y, z));
  return cells;
};
const parseRepls = (filename) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => {
  const fields = line.trim().split(/\s+/); fail(fields.length === 9, `malformed REPL in ${filename}`);
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number); fail(x1 === x2 && y1 === y2 && z1 === z2, `non-unit legacy operation in ${filename}`);
  return { x: x1, y: y1, z: z1, sourceState: fields[7], targetState: fields[8] };
});

async function main() {
  const snapshotRoot = abs(SNAPSHOT); const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  fail(fs.existsSync(capturePath), 'complete immutable capture manifest missing');
  const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source is not a complete immutable capture');
  for (const member of capture.requiredMembers) {
    const filename = path.join(snapshotRoot, member.path); const bytes = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
    fail(bytes && bytes.length === member.bytes && sha(bytes) === member.sha256, `immutable source member drift: ${member.path}`);
  }
  const scout = JSON.parse(fs.readFileSync(abs(SCOUT), 'utf8'));
  fail(scout.source?.captureId === capture.captureId && scout.source?.captureManifestSha256 === sha(captureBytes), 'scout is not bound to supplied immutable source');
  const sites = scout.candidate?.sourceOnlySiteCells;
  fail(Array.isArray(sites) && sites.length === 3, 'scout must provide exactly three proposed sites');
  const expectedSites = [point(744, 42, -81), point(748, 42, -81), point(760, 42, -81)];
  fail(JSON.stringify(sites) === JSON.stringify(expectedSites), 'proposed site set drifted from C01 arrival scout');
  const legacyManifest = JSON.parse(fs.readFileSync(abs('data/buildops/c01-next-01-arrival-landing-wayfinding.release-manifest.json'), 'utf8'));
  const legacyOps = parseRepls('data/buildops/c01-next-01-arrival-landing-wayfinding.cadence.forward.txt');
  fail(legacyManifest.scope?.releaseId === 'C01-NEXT-01' && legacyOps.length === 9, 'accepted C01-NEXT-01 baseline is incomplete');
  const legacyTargets = legacyOps.map(({ x, y, z }) => point(x, y, z));
  const reader = new AnvilReader(path.join(snapshotRoot, 'region')); const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
  const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const siteFacts = [];
  for (const site of sites) {
    const [floor, support, head, upperHead] = await Promise.all([stateAt(site), stateAt(point(site.x, site.y - 1, site.z)), stateAt(point(site.x, site.y + 1, site.z)), stateAt(point(site.x, site.y + 2, site.z))]);
    siteFacts.push({ site, floor, support, head, upperHead, sourceValid: floor === 'minecraft:light_blue_concrete' && !isFluid(support) && !isGravity(support) && !isAir(support) && isAir(head) && isAir(upperHead) });
  }
  fail(siteFacts.every((entry) => entry.sourceValid), 'one proposed arrival site lost dry supported two-clear source geometry');
  const halo = uniqueCells(sites.flatMap(cube));
  const haloStates = await Promise.all(halo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
  const envelope = { minX: Math.min(...halo.map(({ x }) => x)), maxX: Math.max(...halo.map(({ x }) => x)), minY: Math.min(...halo.map(({ y }) => y)), maxY: Math.max(...halo.map(({ y }) => y)), minZ: Math.min(...halo.map(({ z }) => z)), maxZ: Math.max(...halo.map(({ z }) => z)) };
  const chunks = new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`)); const blockEntities = []; const savedEntities = [];
  for (const chunkId of chunks) {
    const [chunkX, chunkZ] = chunkId.split(',').map(Number); const chunk = await reader.chunk(chunkX, chunkZ); const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) if (entry.x >= envelope.minX && entry.x <= envelope.maxX && entry.y >= envelope.minY && entry.y <= envelope.maxY && entry.z >= envelope.minZ && entry.z <= envelope.maxZ) blockEntities.push(entry);
    for (const entry of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      const position = entry.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3 && position[0] >= envelope.minX && position[0] <= envelope.maxX && position[1] >= envelope.minY && position[1] <= envelope.maxY && position[2] >= envelope.minZ && position[2] <= envelope.maxZ) savedEntities.push(entry);
    }
  }
  fail(haloStates.every(({ state }) => !isFluid(state) && !isGravity(state)) && blockEntities.length === 0 && savedEntities.length === 0, 'proposed halo has fluid, gravity, block entity, or saved entity');
  const currentLegacyStates = await Promise.all(legacyTargets.map(stateAt));
  fail(currentLegacyStates.every((state) => state === 'minecraft:sea_lantern'), 'accepted C01-NEXT-01 protected inlay baseline drifted');
  const legacyHalo = uniqueCells(legacyTargets.flatMap(cube)); const legacyHaloKeys = new Set(legacyHalo.map(cellKey));
  const protectedOverlap = halo.filter((cell) => legacyHaloKeys.has(cellKey(cell)));
  fail(protectedOverlap.length === 0, 'new candidate halo touches C01-NEXT-01 protected interaction halo');
  const expandedDirective = fs.readFileSync(abs('docs/masterplans/05-combined-zones/OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md'), 'utf8');
  const currentC01 = fs.readFileSync(abs('docs/masterplans/11-town-expansion-r1/CURRENT-STATE.md'), 'utf8');
  const reportBase = {
    schemaVersion: 1,
    id: 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-AUTHORIZATION-AUDIT-02',
    generatedAtUtc: new Date().toISOString(),
    status: 'NO_GO_EXECUTION_AUTHORIZATION_NOT_ESTABLISHED',
    mode: 'READ_ONLY_INDEPENDENT_AUTHORIZATION_AUDIT',
    mutationAuthority: false,
    source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), immutableMemberCount: capture.requiredMembers.length },
    proposedSites: { cells: sites, cellSetSha256: hashCells(sites), exactCurrentSourceState: 'minecraft:light_blue_concrete', siteFacts, localHalo: { cellCount: halo.length, cellSetSha256: hashCells(halo), fluidOrWaterloggedCount: haloStates.filter(({ state }) => isFluid(state)).length, gravityCount: haloStates.filter(({ state }) => isGravity(state)).length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length } },
    retainedProtectedInterfaces: { c01Next01: { canonicalOwner: legacyManifest.scope.canonicalOwner, acceptedTargetCount: legacyTargets.length, acceptedTargetSetSha256: legacyManifest.target.operatedUnion.coordinateSetSha256, currentTargetExactCount: currentLegacyStates.length, candidateHaloOverlapCount: protectedOverlap.length, disposition: 'PRESERVED_AND_DISJOINT' }, candidateClaim: scout.candidate.ownershipBoundary },
    authorityChain: {
      standingScopeAuthority: expandedDirective.includes('I authorize all work all plans all areas') ? 'PRESENT_SCOPE_ONLY' : 'MISSING',
      standingDirectiveLimit: 'The directive explicitly does not replace a per-area next-task or acceptance gate.',
      priorC01Next01Authority: 'Bound exactly to the historical nine-cell C01-NEXT-01 package; it supplies no authority for these three disjoint cells.',
      candidateCanonicalTargetState: 'MISSING — scout intentionally selected no target state and no forward/inverse record.',
      candidateExactOwnerAndInterfaceAcceptance: 'MISSING — the scout labels a boundary but supplies no source-bound named owner, target/halo owner partition, or bilateral acceptance record.',
      currentC01Policy: currentC01.includes('Every unreviewed cross-area seam remains default-deny') ? 'DEFAULT_DENY_FOR_UNREVIEWED_INTERFACE' : 'NOT_VERIFIED',
    },
    recommendation: {
      decision: 'NO_GO',
      exactReason: 'Static geometry is clean and disjoint from the accepted C01-NEXT-01 inlays, but execution authority is absent. A prior nine-cell wayfinding acceptance and scope-wide standing directive cannot infer canonical sea-lantern targets, inverses, owner/interface acceptance, or a fresh guarded kernel for three new cells.',
      requiredBeforeReconsideration: ['Document a newly observed functional defect for the three-site extension.', 'Bind an exact named owner and protected/interface partition for all 3 target and 81 halo cells.', 'Select canonical target state and exact forward/rollback inverse in a distinct compiler.', 'Capture fresh immediately-pre-execution source and same-moment live-entity clearance, then pass full guarded-release and independent post QA.'],
    },
    safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationsEmitted: false, executionAuthorized: false },
  };
  const report = { ...reportBase, identitySha256: sha(JSON.stringify(reportBase)) };
  const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh directory'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-authorization-audit-02.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-AUTHORIZATION-AUDIT-02.md'), `# C01 arrival-wayfinding authorization audit 02\n\n**Recommendation:** \`NO GO\` — source geometry is clean, but execution authority is not established.\n\nThe three proposed floor cells are exact light-blue concrete over solid non-gravity support with two clear head cells. Their 81-cell combined interaction halo is dry and has zero gravity, block entities, or saved entities. It is also disjoint from the accepted C01-NEXT-01 9-cell inlays and their protected historical interaction halo.\n\nThat is safety evidence, not authorization. C01-NEXT-01's canonical sea-lantern state/inverse belongs only to its original nine cells. The candidate scout deliberately provides no target state, inverse, named owner/interface partition, release manifest, or execution authority. The all-areas directive gives scope only and explicitly retains per-area acceptance gates.\n\nA fresh source/live-entity kernel is also mandatory before any physical decision. No operations were produced.\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, recommendation: report.recommendation.decision, report: rel(path.join(out, 'sys03-mp11-c01-arrival-wayfinding-authorization-audit-02.json')), proposedSiteCount: sites.length, protectedOverlapCount: protectedOverlap.length, mutationAuthority: false }, null, 2)}\n`);
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
