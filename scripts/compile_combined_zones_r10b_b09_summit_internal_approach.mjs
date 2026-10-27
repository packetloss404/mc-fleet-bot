#!/usr/bin/env node
/** Compile CZ-R10B: exact internal B09 summit-approach aperture. Offline only. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  hashCells,
  mountainSurfaceY,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T20:15:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z');
const INTAKE = value('--intake-audit', 'data/world-review/combined-zones-r08u-live-20260821T201019Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/combined-zones-r08u-live-20260821T201019Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r10b-b09-summit-internal-approach');
const RELEASE_ID = 'CZ-R10B-P1-B09-SUMMIT-INTERNAL-APPROACH';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b09-summit-internal-approach-aperture';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const FACE_NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const GRAVITY_BLOCKS = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const ACTIVE_MECHANISMS = new Set(['minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail', 'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch', 'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper']);
const INPUTS = Object.freeze({
  b09Technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r07iQa: 'data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.json',
  r07iPost: 'data/worldsnap-combined-zones-r07i-post-20260821T190347Z',
  r07kManifest: 'data/buildops/combined-zones-r07k-b03-twin-portal-exterior.release-manifest.json',
  r07kQa: 'data/world-review/combined-zones-r07k-live-20260821T195128Z/r07k-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59',
  sourceRegion: 'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217',
  sourceLedger: '72293cd10dce462b5565b837fd10f36c883b00ede570e36da9f33dfb1b5b0456',
  sourceCompleted: 'a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  routeCount: 1096,
  routeHash: '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
  summitInteriorCount: 18,
  summitInteriorHash: '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  seamHash: '8100289cadea36a33df57d789c17b6972124bdc65101ffa2dc439967c8ba8f75',
  externalCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  postB09StateHash: 'c9ab509e6e14bd267d4c509808be87677a7e36033e9bda53f69611d02aa46635',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (ok, message) => { if (!ok) throw new Error(`R10B B09 internal-approach compiler rejected: ${message}`); };
const fileBinding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const classManifest = (cells) => { const exact = uniqueCells(cells); return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) }; };
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records.slice().sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce((counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const isGravityState = (state) => GRAVITY_BLOCKS.has(stateBase(state)) || stateBase(state).endsWith('_concrete_powder') || stateBase(state).endsWith('_anvil');

function orderedCenterlineSha256(points) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-ordered-centerline-v1\n');
  for (const p of points) digest.update(`${p.index}:${p.x},${p.y},${p.z}:${p.kind}\n`);
  return digest.digest('hex');
}
function buildCenterline(model, endpoints) {
  const portal = endpoints.from; const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurfaceY(portal.x, climbZ - 1, model) !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1 && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) { throatX = x; break; }
  }
  invariant(throatX !== null, 'no accepted east-face throat');
  const faceRun = throatX - portal.x; const points = [];
  for (let d = 0; d <= faceRun; d += 1) points.push({ x: portal.x + d, y: portal.y, z: portal.z, kind: d === 0 ? 'portal-interface' : 'level-station-throat' });
  for (let o = 1; o <= portal.z - climbZ; o += 1) points.push({ x: throatX, y: portal.y, z: portal.z - o, kind: 'level-hairpin' });
  for (let d = 1; d <= faceRun; d += 1) { const x = throatX - d; points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ, kind: d === 1 ? 'level-hairpin-exit' : 'face-ascent' }); }
  const northRun = Math.abs(summit.z - climbZ);
  for (let d = 1; d <= northRun; d += 1) { const z = climbZ - d; points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z, kind: d === 1 ? 'level-summit-curve-exit' : d === northRun ? 'summit-interface' : 'summit-ascent' }); }
  points.forEach((p, index) => { p.index = index; }); return points;
}
function components(cells) {
  const remaining = new Set(cells.map(cellKey)); const sizes = [];
  while (remaining.size) { const first = remaining.values().next().value; remaining.delete(first); const stack = [first]; let size = 0;
    while (stack.length) { const [x, y, z] = stack.pop().split(',').map(Number); size += 1; for (const [dx, dy, dz] of FACE_NEIGHBOURS) { const k = `${x + dx},${y + dy},${z + dz}`; if (remaining.delete(k)) stack.push(k); } }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a); return { componentCount: sizes.length, componentSizes: sizes };
}
function operationIntersection(filename, targetCells) {
  const hits = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) { if (!raw.startsWith('REPL ')) continue; const f = raw.split(/\s+/); const q = f.slice(1, 7).map(Number);
    for (const c of targetCells) if (c.x >= Math.min(q[0], q[3]) && c.x <= Math.max(q[0], q[3]) && c.y >= Math.min(q[1], q[4]) && c.y <= Math.max(q[1], q[4]) && c.z >= Math.min(q[2], q[5]) && c.z <= Math.max(q[2], q[5])) hits.push(c);
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE); const ledger = readJson(SOURCE_LEDGER); const regionIdentity = readJson(ledger.postSnapshot.identity.path);
const technical = readJson(INPUTS.b09Technical); const connectors = readJson(INPUTS.connectors); const d05 = readJson(INPUTS.d05);
const contract = readJson(INPUTS.releaseContract); const authorization = readJson(INPUTS.authorization); const relics = readJson(INPUTS.relics);
const r07e = readJson(INPUTS.r07eManifest); const r07i = readJson(INPUTS.r07iManifest); const r07iQa = readJson(INPUTS.r07iQa); const r07kManifest = readJson(INPUTS.r07kManifest); const r07kQa = readJson(INPUTS.r07kQa);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && intake.summary.passed && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(sha256(fs.readFileSync(abs(SOURCE_LEDGER))) === EXPECTED.sourceLedger && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(technical.reportIdentitySha256 === EXPECTED.technicalIdentity && r07i.manifestIdentity === 'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8' && r07e.manifestIdentity === 'e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d', 'frozen B09/R07 identity mismatch');
invariant(r07iQa.summary.passed && r07kQa.summary.passed, 'required R07I/R07K QA is not PASS');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && !authorization.revoked && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID), 'R10 standing authorization absent');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z11-SUMMIT-FITOUT'), 'R10 does not own summit fit-out');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8').includes('B09 summit/internal approach'), 'CURRENT-STATE does not direct B09 summit/internal approach');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561 && orderedCenterlineSha256(centerline) === 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221', 'centerline drifted');
const routeSeeds = uniqueCells(centerline.slice(240, 551).flatMap(({ x, y, z }) => [{ x, y, z }, { x, y: y + 1, z }]));
const priorStraight = cellsIn({ minX: 2051, maxX: 2287, minY: 130, maxY: 131, minZ: -748, maxZ: -748 });
const acceptedRoute = uniqueCells([...priorStraight, ...routeSeeds]);
const summitInterior = [];
for (let offset = 8; offset >= 0; offset -= 1) for (let dy = 0; dy <= 1; dy += 1) summitInterior.push({ x: endpoints.to.x, y: endpoints.to.y - offset + dy, z: endpoints.to.z + offset });
const seam = cellsIn({ minX: 2048, maxX: 2048, minY: 295, maxY: 296, minZ: -819, maxZ: -819 });
const approachCap = cellsIn(r07e.scope.geometry.guidewayApproachCap.bounds);
const retainedApproachCollar = approachCap.filter((c) => !new Set(seam.map(cellKey)).has(cellKey(c)));
const externalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const beforeVoid = uniqueCells([...acceptedRoute, ...summitInterior]);
const projectedVoid = uniqueCells([...beforeVoid, ...seam]);
invariant(acceptedRoute.length === EXPECTED.routeCount && hashCells(acceptedRoute) === EXPECTED.routeHash && summitInterior.length === EXPECTED.summitInteriorCount && hashCells(summitInterior) === EXPECTED.summitInteriorHash, 'accepted route/interior drifted');
invariant(seam.length === 2 && hashCells(seam) === EXPECTED.seamHash && approachCap.length === 12 && retainedApproachCollar.length === 10 && externalCap.length === 12 && hashCells(externalCap) === EXPECTED.externalCapHash, 'cap/seam geometry drifted');
invariant(components(beforeVoid).componentCount === 2 && components(beforeVoid).componentSizes.join(',') === '1096,18' && projectedVoid.length === 1116 && components(projectedVoid).componentCount === 1, 'seam does not uniquely connect guideway to summit interior');

const accommodation = buildB09MinimumReservation(model.formula, endpoints);
invariant(accommodation.length === 7800 && hashCells(accommodation) === EXPECTED.b09Hash, 'B09 accommodation drifted');
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const baseline = new AnvilReader(abs(path.join(INPUTS.r07iPost, 'region'))); const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
async function records(cells, selected = reader) { const out = []; for (const cell of uniqueCells(cells)) out.push({ cell, state: stateToCommandString(await selected.blockState(cell.x, cell.y, cell.z)) }); return out; }
const seamRecords = await records(seam); const routeRecords = await records(beforeVoid); const collarRecords = await records(retainedApproachCollar); const externalCapRecords = await records(externalCap);
invariant(seamRecords.every(({ state }) => state === DIORITE) && routeRecords.every(({ state }) => state === AIR) && collarRecords.every(({ state }) => state === DIORITE) && externalCapRecords.every(({ state }) => state === DIORITE), 'source seam, route, or caps are not exact');
const currentB09 = await records(accommodation); const baselineB09 = await records(accommodation, baseline);
invariant(stateSetHash(currentB09) === EXPECTED.postB09StateHash && stateSetHash(baselineB09) === EXPECTED.postB09StateHash && currentB09.every((r, i) => r.state === baselineB09[i].state), 'B09 drifted after accepted R07I');

const priorPaths = fs.readdirSync(abs('data/buildops')).filter((name) => name.startsWith('combined-zones-') && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME)).sort().map((name) => `data/buildops/${name}`);
const priorProof = []; const priorHits = [];
for (const manifestPath of priorPaths) { const manifest = readJson(manifestPath); const hits = uniqueCells((manifest.packages ?? []).flatMap((pkg) => fs.existsSync(abs(pkg.forward)) ? operationIntersection(pkg.forward, seam) : [])); priorHits.push(...hits); priorProof.push({ transactionId: manifest.transactionId, manifest: fileBinding(manifestPath), targetIntersectionCount: hits.length }); }
const exactPriorHits = uniqueCells(priorHits);
invariant(exactPriorHits.length === 2 && exactPriorHits.every((c) => seam.some((s) => cellKey(s) === cellKey(c))), 'prior overlap is not exactly the owned R07E seam');
const r07eHits = operationIntersection(r07e.packages[0].forward, seam);
invariant(r07eHits.length === 2, 'R07E does not own both seam cells');

const halo = uniqueCells(seam.flatMap((c) => [c, ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({ x: c.x + dx, y: c.y + dy, z: c.z + dz }))]));
const haloRecords = await records(halo); const haloKeys = new Set(halo.map(cellKey)); const blockEntities = []; const savedEntities = [];
for (const key of [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]) { const [cx, cz] = key.split(',').map(Number); const chunk = await reader.chunk(cx, cz); for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) if (haloKeys.has(`${be.x},${be.y},${be.z}`)) blockEntities.push(be); const ec = await entityReader.chunk(cx, cz); for (const e of ec?.Entities ?? []) if (Array.isArray(e.Pos) && halo.some((c) => Math.abs(c.x - e.Pos[0]) <= 2 && Math.abs(c.y - e.Pos[1]) <= 3 && Math.abs(c.z - e.Pos[2]) <= 2)) savedEntities.push(e); }
const relicHits = relics.relics.filter((r) => halo.some((c) => c.x >= r.declaredInclusiveBounds.minX && c.x <= r.declaredInclusiveBounds.maxX && c.y >= r.declaredInclusiveBounds.minY && c.y <= r.declaredInclusiveBounds.maxY && c.z >= r.declaredInclusiveBounds.minZ && c.z <= r.declaredInclusiveBounds.maxZ));
const haloGravity = haloRecords.filter(({ state }) => isGravityState(state));
const haloMechanisms = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateBase(state)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0 && haloGravity.length === 0 && haloMechanisms.length === 0 && haloRecords.every(({ state }) => !state.startsWith('minecraft:water') && !state.startsWith('minecraft:lava')), 'halo entity, relic, fluid, gravity, or active-mechanism hazard');

const forwardBody = `${seamRecords.map(({ cell, state }) => replLine(cell, state, AIR)).join('\n')}\n`;
const rollbackBody = `${seamRecords.slice().reverse().map(({ cell, state }) => replLine(cell, AIR, state)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody); const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`); const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, opHash) => `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})\n# source root: ${SNAPSHOT}\n# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}\n# target coordinate-set SHA-256: ${hashCells(seam)}\n# operation SHA-256: ${opHash}\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true }); fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`); fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_R08U_POST_AWAITING_FRESH_EXECUTION_KERNEL', releaseNodeId: RELEASE_NODE_ID, mvpScope: true,
  scopeIds: ['P1-B09-INTERNAL-SUMMIT-APPROACH', 'Z11-SUMMIT-FITOUT-INTERNAL-THRESHOLD'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: { forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY], rationale: 'One exact internal seam; rollback reseals it.' },
  scope: {
    releaseId: RELEASE_ID, canonicalOwner: 'Z11-SUMMIT-FITOUT', material: AIR,
    purpose: 'Open only the exact retained internal B09 summit threshold, joining the accepted guideway void to the sealed summit interior.',
    geometry: {
      acceptedGuidewayVoid: { ...classManifest(acceptedRoute), ...components(acceptedRoute) },
      acceptedSummitInterior: { ...classManifest(summitInterior), ...components(summitInterior) },
      ownedInternalSeam: classManifest(seam), retainedApproachCollar: classManifest(retainedApproachCollar),
      projectedConnectedInternalVoid: { ...classManifest(projectedVoid), ...components(projectedVoid) },
      negativeWithoutSeam: { ...classManifest(beforeVoid), ...components(beforeVoid) },
      retainedExternalZ11Cap: classManifest(externalCap),
    },
    ownership: { exactReviewedPriorMigration: { priorOwner: 'P1-B09-FUNICULAR-FRAMEWORK/R07E', newOwner: 'Z11-SUMMIT-FITOUT-INTERNAL-THRESHOLD', cellSet: classManifest(seam), r07eTargetIntersectionCount: 2, otherPriorTargetIntersectionCount: 0 } },
    operationalBoundary: { externalZ11InterfaceOpened: false, externalZ11CapClosed: true, activeMechanismInstalled: false, railInstalled: false, driveBrakeVehicleControlsPowerDrainageInstalled: false, funicularCommissioned: false, pedestrianRouteCommissioned: false },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT), completeSaveSha256: intake.packageIdentity.completeSaveSha256, captureManifestSha256: intake.packageIdentity.captureManifestSha256, regionSnapshotSha256: regionIdentity.sha256,
    intakeAudit: fileBinding(INTAKE), predecessor: { transactionId: ledger.transactionId, executionLedger: fileBinding(SOURCE_LEDGER), completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
    acceptedR07Architecture: { transactionId: r07kManifest.transactionId, manifestIdentity: r07kManifest.manifestIdentity, postQa: fileBinding(INPUTS.r07kQa), completedReleaseIdentitySha256: r07kQa.releaseIdentity.completedReleaseIdentitySha256 },
    b09DisjointRebaseProof: { baseline: 'R07I_POST', terminal: 'R08U_POST', accommodation: classManifest(accommodation), baselineBlockStateSetSha256: stateSetHash(baselineB09), terminalBlockStateSetSha256: stateSetHash(currentB09), mismatchCount: 0 },
    sourceStateCensus: { [DIORITE]: 2 },
  },
  target: { operatedUnion: classManifest(seam), desiredStateCensus: { [AIR]: 2 } },
  operations: { [PACKAGE_KEY]: { forwardSha256, rollbackSha256, forwardCommandCount: 2, rollbackCommandCount: 2, targetCellCount: 2, targetCoordinateSetSha256: hashCells(seam), sourceStateCensus: { [DIORITE]: 2 }, desiredStateCensus: { [AIR]: 2 }, exactInverse: true, reverseOrderInverse: true, oneCellGuards: true } },
  preservation: { acceptedPriorReleaseTargetProof: priorProof, exactOwnedR07eOverlap: classManifest(r07eHits), undeclaredPriorReleaseIntersectionCount: 0, retainedApproachCollar: classManifest(retainedApproachCollar), retainedExternalZ11Cap: classManifest(externalCap) },
  safetyAudit: { halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) }, targetFluidCount: 0, haloFluidCount: 0, haloGravityCount: haloGravity.length, haloActiveMechanismCount: haloMechanisms.length, haloBlockEntityCount: 0, haloSavedEntityCount: 0, haloProtectedRelicCount: 0, routeConnectedAfterOpening: true, routeDisconnectedWithoutOpening: true },
  standingAuthorization: { ...fileBinding(INPUTS.authorization), authorizationPayloadSha256: authorization.authorizationPayloadSha256, releaseNodeAuthorized: true },
  upstreamIdentities: { b09Technical: fileBinding(INPUTS.b09Technical), connectors: fileBinding(INPUTS.connectors), d05: fileBinding(INPUTS.d05), releaseContract: fileBinding(INPUTS.releaseContract), r07eManifest: fileBinding(INPUTS.r07eManifest), r07iManifest: fileBinding(INPUTS.r07iManifest), r07iQa: fileBinding(INPUTS.r07iQa), r07kManifest: fileBinding(INPUTS.r07kManifest), r07kQa: fileBinding(INPUTS.r07kQa) },
  hardSafetyKernelNext: ['fresh complete source and exact preflight', 'fresh live entity clearance', 'strict parser checks', 'journaled strict execution', 'fresh post and rollback preflight', 'independent connectivity, cap, preservation, and no-drift QA'],
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, externalZ11InterfaceOpened: false, mechanismOrRouteCommissioned: false },
};
const manifestIdentity = sha256(JSON.stringify(payload)); fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: payload.status, manifest: rel(manifestPath), manifestIdentity, targets: 2, projectedConnectedVoid: 1116, retainedExternalCap: 12, liveCallsPerformed: false }, null, 2));
