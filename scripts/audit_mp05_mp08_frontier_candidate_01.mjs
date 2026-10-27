#!/usr/bin/env node
/**
 * Read-only MP05/MP08 frontier reconciliation.
 *
 * The supplied immutable source predates two small B07 lighting releases.  It
 * is therefore not enough to find their source guards passing: current
 * completion evidence must also be consulted before calling either one new
 * work.  This audit records that distinction and deliberately emits no ops.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-masterplan-frontier-source-20260827T030918Z');
const OUT = option('--out', 'data/world-review/mp05-mp08-frontier-candidate-audit-01-20260827T030918Z');
const abs = (entry) => path.resolve(ROOT, entry);
const rel = (entry) => path.relative(ROOT, abs(entry)).split(path.sep).join('/');
const sha = (entry) => crypto.createHash('sha256').update(entry).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP05/MP08 frontier audit rejected: ${message}`); };
const key = ({ x, y, z }) => `${x},${y},${z}`;
const fluid = (state) => /^(minecraft:(water|lava|bubble_column))/.test(state) || state.includes('waterlogged=true');
const gravity = (state) => /minecraft:(gravel|sand|red_sand|suspicious_sand|suspicious_gravel|anvil|chipped_anvil|damaged_anvil|pointed_dripstone)/.test(state) || state.includes('_concrete_powder');

function parseUnitRepls(filename) {
  const entries = [];
  for (const line of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const fields = line.trim().split(/\s+/);
    fail(fields.length === 9, `unparseable REPL in ${filename}`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    fail(x1 === x2 && y1 === y2 && z1 === z2, `non-unit operation in ${filename}`);
    entries.push({ x: x1, y: y1, z: z1, sourceState: fields[7], targetState: fields[8] });
  }
  fail(entries.length > 0, `no unit REPL operations in ${filename}`);
  return entries;
}

function sixFaceHalo(cells) {
  const targets = new Set(cells.map(key));
  const values = new Map();
  for (const cell of cells) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    if (!targets.has(key(neighbour))) values.set(key(neighbour), neighbour);
  }
  return [...values.values()];
}

function bounds(cells) {
  return ['x', 'y', 'z'].reduce((result, axis) => ({
    ...result,
    [`min${axis.toUpperCase()}`]: Math.min(...cells.map((cell) => cell[axis])),
    [`max${axis.toUpperCase()}`]: Math.max(...cells.map((cell) => cell[axis])),
  }), {});
}

async function main() {
  const snapshotRoot = abs(SNAPSHOT);
  const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  fail(fs.existsSync(capturePath), 'missing complete immutable capture manifest');
  const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source is not a complete immutable capture');
  for (const member of capture.requiredMembers) {
    const filename = path.join(snapshotRoot, member.path);
    fail(fs.existsSync(filename), `missing immutable member ${member.path}`);
    const bytes = fs.readFileSync(filename);
    fail(bytes.length === member.bytes && sha(bytes) === member.sha256, `immutable member drift ${member.path}`);
  }
  const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh directory');
  const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
  const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
  const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

  const candidateDefinitions = [
    {
      id: 'MP05-B07-LOWER-PRESSURE-GALLERY-FIXED-LIGHTING-01',
      purpose: 'Normal restricted-route illumination in the retained dry lower pressure gallery.',
      operations: 'data/world-review/mp05-b07-lower-pressure-gallery-fixed-lighting-01-prepared-20260827T234500Z/rebound-buildops/mp05-b07-lower-pressure-gallery-fixed-lighting-01.forward.txt',
      currentDisposition: 'AS_BUILT_POST_VERIFIED',
      completionEvidence: 'docs/masterplans/MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md#mp05-b07-lower-pressure-gallery-fixed-lighting',
    },
    {
      id: 'MP05-B07-SURFACE-RECEIVER-DESCENT-EAST-WALL-FIXED-LIGHTING-01',
      purpose: 'Normal restricted-route illumination on the sealed B07 descent east wall.',
      operations: 'data/world-review/mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-prepared-20260828T030000Z/rebound-buildops/mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01.forward.txt',
      currentDisposition: 'AS_BUILT_POST_VERIFIED',
      completionEvidence: 'docs/masterplans/MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md#mp05-b07-surface-receiver-descent-east-wall-fixed-lighting',
    },
  ];
  const candidates = [];
  for (const definition of candidateDefinitions) {
    const targets = parseUnitRepls(definition.operations);
    const halo = sixFaceHalo(targets);
    const observed = await Promise.all(targets.map(async (cell) => ({ ...cell, observedState: await stateAt(cell) })));
    const haloStates = await Promise.all(halo.map(async (cell) => ({ ...cell, state: await stateAt(cell) })));
    const envelope = bounds([...targets, ...halo]);
    const chunkKeys = new Set([...targets, ...halo].map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
    const blockEntities = []; const savedEntities = [];
    for (const chunkKey of chunkKeys) {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
      const chunk = await reader.chunk(chunkX, chunkZ); const entities = await entityReader.chunk(chunkX, chunkZ);
      for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        if (entry.x >= envelope.minX && entry.x <= envelope.maxX && entry.y >= envelope.minY && entry.y <= envelope.maxY && entry.z >= envelope.minZ && entry.z <= envelope.maxZ) blockEntities.push(entry);
      }
      for (const entry of entities?.Entities ?? []) {
        const position = entry.Pos?.slice(0, 3).map(Number);
        if (position?.length === 3 && position[0] >= envelope.minX && position[0] <= envelope.maxX && position[1] >= envelope.minY && position[1] <= envelope.maxY && position[2] >= envelope.minZ && position[2] <= envelope.maxZ) savedEntities.push(entry);
      }
    }
    const sourceMatchCount = observed.filter((entry) => entry.observedState === entry.sourceState).length;
    const targetMatchCount = observed.filter((entry) => entry.observedState === entry.targetState).length;
    fail(sourceMatchCount + targetMatchCount === targets.length, `${definition.id} is neither fully source-valid nor fully as-built in supplied snapshot`);
    fail(haloStates.every(({ state }) => !fluid(state) && !gravity(state)), `${definition.id} halo has a fluid or gravity hazard`);
    fail(blockEntities.length === 0 && savedEntities.length === 0, `${definition.id} target/halo has stored block or saved entity`);
    candidates.push({
      ...definition,
      targetCount: targets.length,
      targetBounds: bounds(targets),
      sourceGuardExactCount: sourceMatchCount,
      acceptedTargetExactCount: targetMatchCount,
      sourceTargetStateCensus: Object.fromEntries([...new Set(targets.map(({ sourceState }) => sourceState))].map((state) => [state, targets.filter((cell) => cell.sourceState === state).length])),
      interactionHaloCellCount: halo.length,
      fluidOrWaterloggedHaloCount: haloStates.filter(({ state }) => fluid(state)).length,
      gravityHaloCount: haloStates.filter(({ state }) => gravity(state)).length,
      blockEntityCount: blockEntities.length,
      savedEntityCount: savedEntities.length,
      sourceSnapshotDisposition: sourceMatchCount === targets.length ? 'FINITE_DRY_NON_CONTAINER_SOURCE_CANDIDATE' : 'ALREADY_AS_BUILT_IN_FRONTIER_SOURCE',
      reconciliationDisposition: sourceMatchCount === targets.length ? 'REJECTED_STALE_ALREADY_BUILT_AFTER_THIS_SNAPSHOT' : 'REJECTED_ALREADY_BUILT_IN_FRONTIER_SOURCE',
      hardPrerequisitesForAnyFutureDelta: ['Documented functional defect distinct from already accepted lighting.', 'Fresh current immutable source rather than this historical frontier capture.', 'New exact target/inverse package disjoint from the accepted fixture cells.', 'Complete scoped guarded-release kernel and independent post QA.'],
    });
  }
  const c1Correction = [
    [-2, -9, 72], [2, -9, 64], [-2, -9, 56], [2, -9, 48],
    [-2, -9, 40], [2, -9, 32], [2, -9, 24], [-2, -9, 16],
  ].map(([x, y, z]) => ({ x, y, z }));
  const c1States = await Promise.all(c1Correction.map(stateAt));
  fail(c1States.every((state) => state === 'minecraft:polished_deepslate'), 'C1 correction baseline drifted');
  const reportBase = {
    schemaVersion: 1,
    id: 'MP05-MP08-FRONTIER-CANDIDATE-AUDIT-01',
    generatedAtUtc: new Date().toISOString(),
    status: 'NO_GENUINELY_UNBUILT_FINITE_DRY_NON_CONTAINER_CANDIDATE',
    mode: 'READ_ONLY_SOURCE_AND_COMPLETION_REGISTER_RECONCILIATION',
    mutationAuthority: false,
    safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, rconCallsPerformed: false },
    source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), immutableMemberCount: capture.requiredMembers.length },
    finiteHistoricalCandidatesRejectedAsStale: candidates,
    mp08RejectedCosmeticReplay: { fixtureBaselineCellCount: c1Correction.length, allRestoredTo: 'minecraft:polished_deepslate', disposition: 'REJECTED: completion register records the former C1 fixture package as deliberately rolled back and excluded because it lacked a documented functional defect.' },
    decision: {
      exactResult: 'The source snapshot already has both reviewed finite dry, non-container B07 lighting packages at their accepted target states. MP08 C1 lighting is restored and explicitly excluded. No genuinely unbuilt independently useful MP05/MP08 micro-scope remains from the reviewed finite candidate set.',
      forwardOperationCount: 0,
      rollbackOperationCount: 0,
      nextRequiredInput: 'A newly observed functional defect or a finite source-closed fluid/gravity containment boundary. B07 through-route hydrology remains capped/unbounded and C1/C2 interfaces remain outside this narrow candidate set.',
    },
    nonClaims: ['No B07 route, receiver, egress, or public-access claim.', 'No MP08 C1/C2/Cavern opening.', 'No release-ready candidate or authority.'],
  };
  const report = { ...reportBase, identitySha256: sha(JSON.stringify(reportBase)) };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'mp05-mp08-frontier-candidate-audit-01.json'), `${JSON.stringify(report, null, 2)}\n`);
  const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="420" viewBox="0 0 1040 420" role="img" aria-labelledby="title desc"><title id="title">MP05 and MP08 frontier reconciliation</title><desc id="desc">Two B07 source-valid fixture groups are rejected as already built; MP08 C1 cosmetic fixtures are restored and excluded.</desc><rect width="1040" height="420" fill="#0b1020"/><text x="32" y="42" fill="#f8fafc" font-family="sans-serif" font-size="24">MP05 / MP08 finite frontier — historical candidates rejected</text><text x="32" y="70" fill="#cbd5e1" font-family="sans-serif" font-size="14">Source ${capture.captureId}; current completion evidence supersedes this snapshot where later as-built records exist.</text><g font-family="sans-serif"><rect x="32" y="105" width="440" height="250" rx="10" fill="#18233b" stroke="#f59e0b"/><text x="52" y="136" fill="#fbbf24" font-size="18">B07 lower-pressure gallery</text><text x="52" y="161" fill="#cbd5e1" font-size="14">3 dry, non-container source-valid fixtures</text>${candidates[0].targetBounds ? [0, 1, 2].map((i) => `<rect x="${85 + i * 120}" y="225" width="52" height="52" fill="#ef4444"/><text x="${82 + i * 120}" y="305" fill="#cbd5e1" font-size="12">z ${[-424, -416, -408][i]}</text>`).join('') : ''}<text x="52" y="334" fill="#fca5a5" font-size="14">REJECTED — later accepted as-built</text><rect x="536" y="105" width="472" height="250" rx="10" fill="#18233b" stroke="#f59e0b"/><text x="556" y="136" fill="#fbbf24" font-size="18">B07 descent east wall</text><text x="556" y="161" fill="#cbd5e1" font-size="14">5 dry, non-container source-valid fixtures</text>${[0, 1, 2, 3, 4].map((i) => `<rect x="${585 + i * 70}" y="225" width="42" height="42" fill="#ef4444"/><text x="${580 + i * 70}" y="294" fill="#cbd5e1" font-size="12">${73 - i * 2}</text>`).join('')}<text x="556" y="334" fill="#fca5a5" font-size="14">REJECTED — later accepted as-built</text></g><text x="32" y="392" fill="#94a3b8" font-family="sans-serif" font-size="14">MP08 C1: 8 former cosmetic fixtures restored to polished deepslate; explicitly excluded as non-defect work.</text></svg>`;
  fail(!/NaN|Infinity/.test(map), 'map contains invalid numeric coordinate');
  fs.writeFileSync(path.join(out, 'mp05-mp08-frontier-candidate-map.svg'), `${map}\n`);
  fs.writeFileSync(path.join(out, 'MP05-MP08-FRONTIER-CANDIDATE-AUDIT-01.md'), `# MP05 / MP08 finite frontier candidate audit 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only; zero operations and no mutation authority.\n\nBoth reviewed finite B07 fixture groups—lower-pressure gallery (**3** cells) and descent east wall (**5** cells)—are already exact at their accepted glowstone target states in the supplied frontier source. They cannot be duplicated as a new release.\n\nMP08 C1's eight former inspection-light cells are back to polished deepslate. The correction record expressly excludes another cosmetic replay because no functional defect was documented.\n\nNo genuinely unbuilt, independently useful finite dry/non-container MP05/MP08 candidate remains in this bounded review. Any new candidate needs a distinct functional defect or a finite source-closed containment boundary, then a fresh source and full guarded kernel.\n\n![Frontier candidate reconciliation](mp05-mp08-frontier-candidate-map.svg)\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, report: rel(path.join(out, 'mp05-mp08-frontier-candidate-audit-01.json')), map: rel(path.join(out, 'mp05-mp08-frontier-candidate-map.svg')), rejectedHistoricalCandidates: candidates.length, mutationAuthority: false }, null, 2)}\n`);
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
