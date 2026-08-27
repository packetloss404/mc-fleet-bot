#!/usr/bin/env node
/** Read-only, immutable-post coordinate maps for executed MP11/BKR C01 return. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE = 'MP11-BKR-C01-INDEPENDENT-RETURN-01';
const EVIDENCE = 'data/release-evidence/mp11-bkr-c01-independent-return-01-20260827T014500Z';
const POST = 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z';
const MANIFEST = `${EVIDENCE}/rebound-buildops/mp11-bkr-c01-independent-return-01.manifest.json`;
const POST_QA = `${EVIDENCE}/independent-post-qa/mp11-bkr-c01-independent-return-01-post-qa.json`;
const REVIEW = `${EVIDENCE}/independent-post-qa-review.json`;
const KERNEL = `${EVIDENCE}/fresh-kernel-ledger.json`;
const OUT = 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-bkr-c01-independent-return-01';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR C01 post map rejected: ${message}`); };
const key = ({ x, y, z }) => `${x},${y},${z}`;
const blockName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const asPoint = ([x, y, z]) => ({ x, y, z });
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const manifestBytes = fs.readFileSync(abs(MANIFEST));
const qaBytes = fs.readFileSync(abs(POST_QA));
const reviewBytes = fs.readFileSync(abs(REVIEW));
const kernelBytes = fs.readFileSync(abs(KERNEL));
const manifest = JSON.parse(manifestBytes);
const qa = JSON.parse(qaBytes);
const review = JSON.parse(reviewBytes);
const kernel = JSON.parse(kernelBytes);
fail(manifest.id === RELEASE, 'wrong rebound manifest');
fail(qa.status === 'POST_RELEASE_QA_PASS' && qa.source.manifestSha256 === sha(manifestBytes), 'independent post QA is not a pass bound to this manifest');
fail(review.status === 'ACCEPTED_AS_BUILT_POSTSTATE_VERIFIED_REVERSIBLE', 'as-built review is not accepted');
fail(kernel.releaseId === RELEASE && kernel.status === 'EXECUTED_PENDING_REVIEW_OF_INDEPENDENT_POST_QA', 'fresh kernel identity/status drifted');
fail(qa.source.snapshot === POST, 'post QA does not bind the requested immutable post snapshot');
const capturePath = path.join(abs(POST), 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId === qa.source.snapshotCaptureId, 'post capture identity is not immutable or bound');
for (const requiredStage of ['strict-forward-execution', 'fresh-post-complete-save', 'rollback-poststate-preflight', 'independent-post-qa']) {
  fail(kernel.stages?.some((stage) => stage.stage === requiredStage && stage.status === 'PASS'), `kernel stage missing: ${requiredStage}`);
}
fail(manifest.route.stationCount === 105 && manifest.target.canonicalPostStateCellCount === 2828, 'route/post-state cardinality drifted');
fail(manifest.safety.gravityContainment?.componentCount === 1 && manifest.safety.gravityContainment.cellCount === 228, 'finite containment component drifted');
fail(manifest.safety.initialSourceFluidCount === 0 && manifest.safety.sourceFluidCountAfterContainment === 0, 'fluid treatment drifted');
fail(manifest.safety.sourceGravityCountAfterContainment === 0 && manifest.safety.sourceBlockEntityCount === 0 && manifest.safety.sourceProtectedCoreCountAfterContainment === 0, 'post-containment safety census drifted');
fail(qa.checks.canonicalMismatches.length === 0 && qa.checks.directedNormalWalk.stationCount === 105 && qa.checks.directedNormalWalk.directions === 2 && qa.checks.directedNormalWalk.failures.length === 0, 'directed return QA drifted');
fail(qa.checks.dryGravityFreeHalo.cellCount === 6290 && qa.checks.dryGravityFreeHalo.failures.length === 0 && qa.checks.blockEntityExclusion.failures.length === 0, 'dry/no-gravity post QA drifted');

const contract = JSON.parse(fs.readFileSync(abs(manifest.source.contract.path)));
const feasibility = JSON.parse(fs.readFileSync(abs(contract.source.feasibility.path)));
const stations = feasibility.feasibility.stations.map(asPoint);
fail(stations.length === 105, 'rebound feasibility station set drifted');
const component = manifest.safety.gravityContainment.components[0];
const containment = manifest.target.allCanonicalPostStates.filter((record) => record.roles.includes('gravity-containment'));
fail(containment.length === 228, 'containment role inventory drifted');
const containmentKeys = new Set(containment.map((record) => key(record.cell)));
const reader = new AnvilReader(path.join(abs(POST), 'region'));
const get = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const postMismatches = [];
for (const record of manifest.target.allCanonicalPostStates) {
  const actual = await get(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
const containmentMismatches = [];
for (const record of containment) {
  const actual = await get(record.cell);
  if (actual !== 'minecraft:smooth_stone') containmentMismatches.push({ cell: record.cell, actual });
}
const routeFailures = [];
for (const direction of ['forward', 'reverse']) {
  const ordered = direction === 'forward' ? stations : stations.slice().reverse();
  for (let i = 0; i < ordered.length; i += 1) {
    const p = ordered[i];
    const [feet, head, upper, support] = await Promise.all([get(p), get({ x: p.x, y: p.y + 1, z: p.z }), get({ x: p.x, y: p.y + 2, z: p.z }), get({ x: p.x, y: p.y - 1, z: p.z })]);
    if (!air(feet) || !air(head) || !air(upper) || air(support) || fluid(support) || gravity(support)) routeFailures.push({ direction, i, p, feet, head, upper, support });
    if (i > 0) {
      const previous = ordered[i - 1];
      if (Math.abs(p.x - previous.x) + Math.abs(p.z - previous.z) !== 1 || Math.abs(p.y - previous.y) > 1) routeFailures.push({ direction, i, transition: [previous, p] });
    }
  }
}
fail(postMismatches.length === 0 && containmentMismatches.length === 0 && routeFailures.length === 0, 'as-built post-state map checks failed');

const pathD = (points, xScale, zScale) => points.map((point, i) => `${i ? 'L' : 'M'}${xScale(point.x).toFixed(1)} ${zScale(point.z).toFixed(1)}`).join(' ');
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const planMap = () => {
  const minX = 688; const maxX = 808; const minZ = -96; const maxZ = -38; const left = 84; const top = 92; const width = 1240; const height = 720;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * 1095;
  const sz = (z) => top + ((z - minZ) / (maxZ - minZ)) * 500;
  const descent = stations.filter((point) => point.x <= 722);
  const level = stations.filter((point) => point.x >= 722);
  const g = component.bounds;
  const cellW = sx(g.max[0] + 1) - sx(g.min[0]); const cellH = sz(g.max[2] + 1) - sz(g.min[2]);
  const labels = [
    ['Portal / surface interface', stations[0], -8, -10],
    ['L1 receiver interface', stations.at(-1), 8, 18],
    ['gravity containment: 228 cells', { x: g.min[0], z: g.min[2] }, 8, -7],
  ].map(([label, point, dx, dy]) => `<text x="${sx(point.x) + dx}" y="${sz(point.z) + dy}" class="label">${esc(label)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 22px system-ui;fill:#eff7ff}.sub{font:13px system-ui;fill:#bdcfde}.axis{font:11px ui-monospace,monospace;fill:#93aabd}.label{font:12px system-ui;fill:#f4f8fb}.small{font:11px system-ui;fill:#c9d8e4}</style><rect width="100%" height="100%" fill="#0c1624"/><text x="32" y="34" class="title">MP11 BKR C01 — executed independent portal-to-L1 return</text><text x="32" y="58" class="sub">Immutable post ${esc(POST)} · 105 normal-walk stations · map plane X/Z (elevation shown in section)</text><rect x="${left}" y="${top}" width="1095" height="500" fill="#14253a" stroke="#557189"/><g stroke="#2b4053" stroke-width="1">${range(690, 800).filter((x) => x % 10 === 0).map((x) => `<line x1="${sx(x)}" y1="${top}" x2="${sx(x)}" y2="${top + 500}"/><text x="${sx(x)}" y="${top + 518}" text-anchor="middle" class="axis">${x}</text>`).join('')}${range(-90, -40).filter((z) => z % 10 === 0).map((z) => `<line x1="${left}" y1="${sz(z)}" x2="${left + 1095}" y2="${sz(z)}"/><text x="${left - 8}" y="${sz(z) + 4}" text-anchor="end" class="axis">${z}</text>`).join('')}</g><rect x="${sx(g.min[0])}" y="${sz(g.min[2])}" width="${cellW}" height="${cellH}" fill="#f5ad4d" fill-opacity=".34" stroke="#ffc66d" stroke-width="2"/><path d="${pathD(descent, sx, sz)}" fill="none" stroke="#62d5a4" stroke-width="5"/><path d="${pathD(level, sx, sz)}" fill="none" stroke="#65bdf7" stroke-width="5"/><circle cx="${sx(stations[0].x)}" cy="${sz(stations[0].z)}" r="7" fill="#62d5a4" stroke="#fff"/><circle cx="${sx(stations.at(-1).x)}" cy="${sz(stations.at(-1).z)}" r="7" fill="#65bdf7" stroke="#fff"/>${labels}<rect x="84" y="638" width="16" height="16" fill="#f5ad4d" fill-opacity=".7"/><text x="108" y="651" class="small">Post-state permanent smooth-stone containment footprint, X=694..703 / Y=55..61 / Z=-53..-43</text><line x1="660" y1="646" x2="690" y2="646" stroke="#62d5a4" stroke-width="5"/><text x="700" y="651" class="small">descending leg</text><line x1="840" y1="646" x2="870" y2="646" stroke="#65bdf7" stroke-width="5"/><text x="880" y="651" class="small">level receiver leg</text></svg>`;
};
const sectionMap = () => {
  const minX = 692; const maxX = 806; const minY = 38; const maxY = 73; const left = 88; const top = 92; const width = 1240; const height = 650;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * 1095;
  const sy = (y) => top + ((maxY - y) / (maxY - minY)) * 410;
  const g = component.bounds;
  const line = stations.filter((point) => point.z === -52 || point.z === -53).map((point) => `${point.x},${point.y}`).filter((value, index, all) => index === 0 || all[index - 1] !== value).map((value, i) => { const [x, y] = value.split(',').map(Number); return `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`; }).join(' ');
  const rect = `<rect x="${sx(g.min[0])}" y="${sy(g.max[1] + 1)}" width="${sx(g.max[0] + 1) - sx(g.min[0])}" height="${sy(g.min[1]) - sy(g.max[1] + 1)}" fill="#f5ad4d" fill-opacity=".42" stroke="#ffc66d" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>.title{font:700 22px system-ui;fill:#eff7ff}.sub{font:13px system-ui;fill:#bdcfde}.axis{font:11px ui-monospace,monospace;fill:#93aabd}.label{font:12px system-ui;fill:#f4f8fb}.small{font:11px system-ui;fill:#c9d8e4}</style><rect width="100%" height="100%" fill="#0c1624"/><text x="32" y="34" class="title">C01 return — elevation section along the descent and L1 approach</text><text x="32" y="58" class="sub">X/Y section; the station centerline is projected where Z is −52 or −53</text><rect x="${left}" y="${top}" width="1095" height="410" fill="#14253a" stroke="#557189"/><g stroke="#2b4053" stroke-width="1">${range(700, 800).filter((x) => x % 10 === 0).map((x) => `<line x1="${sx(x)}" y1="${top}" x2="${sx(x)}" y2="${top + 410}"/><text x="${sx(x)}" y="${top + 428}" text-anchor="middle" class="axis">${x}</text>`).join('')}${range(40, 71).filter((y) => y % 5 === 0).map((y) => `<line x1="${left}" y1="${sy(y)}" x2="${left + 1095}" y2="${sy(y)}"/><text x="${left - 8}" y="${sy(y) + 4}" text-anchor="end" class="axis">${y}</text>`).join('')}</g>${rect}<path d="${line}" fill="none" stroke="#66c5ff" stroke-width="5"/><circle cx="${sx(stations[0].x)}" cy="${sy(stations[0].y)}" r="7" fill="#62d5a4" stroke="#fff"/><circle cx="${sx(stations.at(-1).x)}" cy="${sy(stations.at(-1).y)}" r="7" fill="#65bdf7" stroke="#fff"/><text x="${sx(694)}" y="${sy(61) - 9}" class="label">containment installed first: 228 former gravel cells → smooth stone</text><text x="${sx(697) - 5}" y="${sy(68) - 12}" class="label">portal [697,68,−52]</text><text x="${sx(798) + 8}" y="${sy(43) + 22}" class="label">L1 [798,43,−55]</text><text x="88" y="548" class="small">Forward: containment (bottom-up) before clearance/floor/wall/ceiling. Rollback: exact reverse, so containment is last.</text><text x="88" y="572" class="small">As-built QA: 105 stations traversable in both directions; 6,290-cell halo dry, gravity-free, and block-entity-free.</text></svg>`;
};
const evidence = {
  schemaVersion: 1,
  id: 'mp11-bkr-c01-independent-return-01-coordinate-post-maps',
  status: 'PASS_PUBLISHED_READ_ONLY_EXECUTED_POSTSTATE_MAPS',
  readOnly: true,
  worldMutated: false,
  binding: {
    release: RELEASE,
    postSnapshot: { root: POST, captureManifest: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId },
    reboundManifest: { path: MANIFEST, sha256: sha(manifestBytes) },
    independentPostQa: { path: POST_QA, sha256: sha(qaBytes), status: qa.status },
    asBuiltReview: { path: REVIEW, sha256: sha(reviewBytes), status: review.status },
    freshKernel: { path: KERNEL, sha256: sha(kernelBytes), status: kernel.status },
  },
  geometry: {
    portalEndpoint: manifest.route.portalEndpoint,
    l1Endpoint: manifest.route.l1Endpoint,
    stationCount: stations.length,
    routeBounds: { min: [Math.min(...stations.map((p) => p.x)), Math.min(...stations.map((p) => p.y)), Math.min(...stations.map((p) => p.z))], max: [Math.max(...stations.map((p) => p.x)), Math.max(...stations.map((p) => p.y)), Math.max(...stations.map((p) => p.z))] },
    containment: { cellCount: containment.length, sourceState: component.sourceStates, targetState: 'minecraft:smooth_stone', bounds: component.bounds, sourceCellSetSha256: component.sourceCellSetSha256 },
  },
  containmentBeforeAccess: {
    forward: 'permanent 228-cell gravel containment installed first, bottom-up; route clearance, floors, walls, and ceilings followed',
    rollback: 'exact forward inverse; route build reverses before containment is removed',
    initialFluidCells: manifest.safety.initialSourceFluidCount,
    postHaloFluidCells: manifest.safety.sourceFluidCountAfterContainment,
    postHaloGravityCells: manifest.safety.sourceGravityCountAfterContainment,
    postHaloProtectedCoreCells: manifest.safety.sourceProtectedCoreCountAfterContainment,
    postHaloBlockEntities: manifest.safety.sourceBlockEntityCount,
  },
  postStateEvidence: {
    canonicalPostStateCells: manifest.target.canonicalPostStateCellCount,
    canonicalPostStateMapMismatches: postMismatches,
    containmentMapMismatches: containmentMismatches,
    reconstructedReturnFailures: routeFailures,
    independentQa: { normalWalkDirections: qa.checks.directedNormalWalk.directions, normalWalkFailures: qa.checks.directedNormalWalk.failures.length, haloCells: qa.checks.dryGravityFreeHalo.cellCount, haloFailures: qa.checks.dryGravityFreeHalo.failures.length, blockEntityFailures: qa.checks.blockEntityExclusion.failures.length },
  },
  nonClaims: ['These maps do not describe a public opening, passenger service, or commissioning beyond the accepted as-built independent return.', 'No new Minecraft operation was executed to produce these maps.'],
};
evidence.evidenceSha256 = sha(JSON.stringify(evidence));
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(path.join(OUT, 'c01-independent-return-plan.svg')), `${planMap()}\n`);
fs.writeFileSync(abs(path.join(OUT, 'c01-independent-return-section.svg')), `${sectionMap()}\n`);
fs.writeFileSync(abs(path.join(OUT, 'c01-independent-return-post-map-evidence.json')), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT, 'README.md')), `# MP11 BKR C01 independent return — as-built coordinate maps\n\nThese read-only maps bind the executed **${RELEASE}** to immutable post snapshot \`${POST}\`.\n\n- [Plan / X-Z geometry](c01-independent-return-plan.svg)\n- [Descent and L1 approach section](c01-independent-return-section.svg)\n- [Snapshot binding and as-built evidence](c01-independent-return-post-map-evidence.json)\n\nThe route has **105** normal-walk stations from portal \`[697,68,-52]\` to L1 \`[798,43,-55]\`. The plan marks the permanent **228-cell** former-gravel containment component at X=694..703, Y=55..61, Z=-53..-43. It was installed before clearance; rollback reverses the route before that containment.\n\nThe accepted immutable-post QA proves all **2,828** canonical post cells, two directed normal-walk checks with no failures, and a **6,290-cell** dry/no-gravity/no-block-entity halo. These maps make no public-access, passenger-service, or broader commissioning claim.\n`);
console.log(JSON.stringify({ status: evidence.status, out: rel(OUT), postSnapshot: POST, stationCount: stations.length, containmentCells: containment.length, evidenceSha256: evidence.evidenceSha256 }, null, 2));
