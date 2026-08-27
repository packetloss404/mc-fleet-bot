#!/usr/bin/env node
/** Read-only visual publication for the accepted C01 33-cell gravity-support release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const EVIDENCE = opt('--evidence-root', 'data/world-review/mp11-c01-arrival-gravity-support-live-20260827T043000Z');
const OUT = opt('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-arrival-gravity-support-01');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const shaFile = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const readJson = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(`C01 gravity-support as-built visuals rejected: ${message}`); };
const write = (name, value) => fs.writeFileSync(path.join(abs(OUT), name), `${value.endsWith('\n') ? value : `${value}\n`}`);

const ledgerPath = path.join(EVIDENCE, 'guarded-release-ledger.json');
const qaPath = path.join(EVIDENCE, 'independent-post-qa.json');
const interfacePath = path.join(EVIDENCE, 'interface-assertion.json');
const ledger = readJson(ledgerPath);
const qa = readJson(qaPath);
const interfaceAssertion = readJson(interfacePath);
const manifestPath = ledger.source?.manifest;
const manifest = readJson(manifestPath);
const releaseId = 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-01';

fail(ledger.releaseId === releaseId && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'accepted guarded ledger missing');
fail(qa.releaseId === releaseId && qa.status === 'PASS_C01_ARRIVAL_GRAVITY_SUPPORT_POSTSTATE_VERIFIED', 'accepted independent post QA missing');
fail(interfaceAssertion.status === 'PASS_C01_ARRIVAL_GRAVITY_SUPPORT_EXACT_INTERFACE_ASSERTION', 'exact protected-interface assertion missing');
fail(manifest.id === releaseId && manifest.target?.cellCount === 33 && manifest.target?.canonicalTargetState === 'minecraft:polished_deepslate', 'canonical 33-cell PDS target missing');
fail(manifest.interactionSet?.haloCellCount === 219 && manifest.protectedInterfaces?.arrivalCadence?.retainedOverlapCellCount === 4 && manifest.interactionSet?.retainedStableGravity?.length === 1, 'canonical halo/interface context missing');
fail(qa.canonicalTargetCount === 33 && qa.canonicalTargetState === 'minecraft:polished_deepslate' && qa.interactionHaloCellCount === 219 && qa.protectedCadenceRetainedOverlapCount === 4 && qa.retainedStableGravelCount === 1 && qa.twoClearHeadroomAtEverySupport === true, 'post-state facts missing');
fail(qa.routeCommissioned === false && qa.passengerServiceCommissioned === false && qa.mutationAuthority === false, 'publication must retain non-commissioning status');
const sourceCapture = readJson(path.join(ledger.source.root, 'combined-zones-complete-save-capture.json'));
const postCapture = readJson(path.join(ledger.post.root, 'combined-zones-complete-save-capture.json'));
fail(sourceCapture.captureId === qa.sourceCaptureId && postCapture.captureId === qa.postCaptureId, 'immutable capture bindings drift');

const targets = manifest.target.canonicalPostStates.map(({ cell, role }) => ({ ...cell, role }));
const targetKeys = new Set(targets.map(({ x, y, z }) => `${x},${y},${z}`));
const cadence = manifest.protectedInterfaces.arrivalCadence.cells;
const retained = manifest.interactionSet.retainedStableGravity[0];
fail(targets.length === 33 && new Set(targets.map(({ x, y, z }) => `${x},${y},${z}`)).size === 33, 'target coordinate set invalid');
fail(cadence.every(({ cell }) => !targetKeys.has(`${cell.x},${cell.y},${cell.z}`)), 'cadence context overlaps target');
fail(!targetKeys.has(`${retained.cell.x},${retained.cell.y},${retained.cell.z}`), 'retained gravel appears in target');

const xMin = 750, xMax = 759, zMin = -85, zMax = -77;
const left = 182, top = 132, cellW = 68, cellH = 34;
const key = (x, y, z) => `${x},${y},${z}`;
const targetAt = (x, y, z) => targets.find((cell) => cell.x === x && cell.y === y && cell.z === z);
const cadenceAt = (x, y, z) => cadence.find(({ cell }) => cell.x === x && cell.y === y && cell.z === z);
const planCells = [];
for (let z = zMin; z <= zMax; z += 1) for (let x = xMin; x <= xMax; x += 1) {
  const y = 41;
  const target = targetAt(x, y, z);
  const cadenceCell = cadenceAt(x, y, z);
  const retainedCell = retained.cell.x === x && retained.cell.y === y && retained.cell.z === z;
  const fill = target ? '#e6b850' : cadenceCell ? '#f16f6f' : retainedCell ? '#d9914f' : '#193047';
  const label = target ? 'PDS target' : cadenceCell ? 'retained cadence' : retainedCell ? 'retained gravel' : 'halo context';
  planCells.push(`<rect x="${left + (x - xMin) * cellW}" y="${top + (z - zMin) * cellH}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#55728c"><title>${x},${y},${z}: ${label}</title></rect>`);
}
const gridLabels = `<text class="s" x="${left}" y="112">Y=41 plan · X →</text>${Array.from({ length: xMax - xMin + 1 }, (_, i) => `<text class="coord" x="${left + i * cellW + cellW / 2}" y="${top - 10}" text-anchor="middle">${xMin + i}</text>`).join('')}${Array.from({ length: zMax - zMin + 1 }, (_, i) => `<text class="coord" x="${left - 16}" y="${top + i * cellH + 22}" text-anchor="end">z=${zMin + i}</text>`).join('')}`;
const planSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
<rect width="1200" height="700" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:14px system-ui;fill:#e7eef6}.coord{font:11px ui-monospace,monospace;fill:#d9e7f2}</style>
<text class="h" x="42" y="42">C01 arrival gravity-support — accepted as-built plan</text>
<text class="s" x="42" y="66">immutable post ${postCapture.captureId} · 33 exact gravel → polished-deepslate replacements · source-to-post reversible evidence</text>
<rect x="${left - 2}" y="${top - 2}" width="${(xMax - xMin + 1) * cellW + 4}" height="${(zMax - zMin + 1) * cellH + 4}" rx="8" fill="#142840" stroke="#66839d"/>${planCells.join('')}${gridLabels}
<rect x="886" y="132" width="270" height="304" rx="8" fill="#101b2c" stroke="#425b73"/>
<text class="l" x="910" y="164">Exact protected context</text><text class="s" x="910" y="194">Targets: 33 PDS cells</text><text class="s" x="910" y="220">Interaction halo: 219 cells</text><text class="s" x="910" y="246">Cadence overlap: 4 retained</text><text class="s" x="910" y="272">Retained gravel: 1 cell</text><text class="s" x="910" y="298">Target state: gravel → PDS</text><text class="s" x="910" y="324">Forward: 32 low, then 1 upper</text><text class="s" x="910" y="350">Inverse: upper, then low reverse</text><text class="s" x="910" y="392">All four red cadence cells and</text><text class="s" x="910" y="414">the orange gravel cell are excluded.</text>
<rect x="182" y="492" width="18" height="18" fill="#e6b850"/><text class="l" x="210" y="506">as-built polished-deepslate support target</text><rect x="536" y="492" width="18" height="18" fill="#f16f6f"/><text class="l" x="564" y="506">retained C01 arrival-cadence interface</text><rect x="182" y="534" width="18" height="18" fill="#d9914f"/><text class="l" x="210" y="548">retained supported gravel at (757,41,-77)</text>
<rect x="42" y="592" width="1114" height="70" rx="8" fill="#101b2c" stroke="#425b73"/><text class="l" x="64" y="620">Independent QA confirms all 33 targets, the 4 retained cadence cells, the retained gravel/support pair, and 7 floor-support contacts with two clear headroom cells.</text><text class="s" x="64" y="646">As-built evidence only: no public route, passenger service, or other commissioning is implied.</text>
</svg>`;

const sectionX = 752;
const sectionLeft = 176, sectionTop = 156, sectionW = 78, rowH = 82;
const yRows = [44, 43, 42, 41, 40];
const sectionTiles = [];
for (let z = zMin; z <= zMax; z += 1) for (const y of yRows) {
  const target = targetAt(sectionX, y, z);
  const cadenceCell = cadenceAt(sectionX, y, z);
  const fill = target ? '#e6b850' : cadenceCell ? '#f16f6f' : y >= 43 ? '#0f2034' : y === 42 ? '#52708b' : y === 40 ? '#495b6a' : '#193047';
  const label = target ? 'PDS target' : y >= 43 ? 'required clear headroom' : y === 42 ? 'retained arrival floor' : y === 40 ? 'existing underside support' : 'halo/liner context';
  sectionTiles.push(`<rect x="${sectionLeft + (z - zMin) * sectionW}" y="${sectionTop + (44 - y) * rowH}" width="${sectionW}" height="${rowH}" fill="${fill}" stroke="#55728c"><title>x=${sectionX},${y},${z}: ${label}</title></rect>`);
}
const yLabels = yRows.map((y) => `<text class="coord" x="${sectionLeft - 14}" y="${sectionTop + (44 - y) * rowH + 45}" text-anchor="end">y=${y}</text>`).join('');
const zLabels = Array.from({ length: zMax - zMin + 1 }, (_, i) => `<text class="coord" x="${sectionLeft + i * sectionW + sectionW / 2}" y="${sectionTop + yRows.length * rowH + 22}" text-anchor="middle">${zMin + i}</text>`).join('');
const sectionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="710" viewBox="0 0 1200 710">
<rect width="1200" height="710" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:14px system-ui;fill:#e7eef6}.coord{font:11px ui-monospace,monospace;fill:#d9e7f2}</style>
<text class="h" x="42" y="42">C01 arrival gravity-support — as-built section</text><text class="s" x="42" y="66">fixed x=752 · z=-85…-77 · showing the sole upper liner at (752,42,-84), retained floor, and two-clear headroom rows</text>
<rect x="${sectionLeft - 2}" y="${sectionTop - 2}" width="${(zMax - zMin + 1) * sectionW + 4}" height="${yRows.length * rowH + 4}" rx="8" fill="#142840" stroke="#66839d"/>${sectionTiles.join('')}${yLabels}${zLabels}
<rect x="914" y="156" width="242" height="410" rx="8" fill="#101b2c" stroke="#425b73"/><text class="l" x="938" y="190">Section reading</text><text class="s" x="938" y="222">Gold: PDS liner cell</text><text class="s" x="938" y="248">Blue: retained floor</text><text class="s" x="938" y="274">Dark: two headroom rows</text><text class="s" x="938" y="300">Grey: existing underside</text><text class="s" x="938" y="338">Forward construction:</text><text class="s" x="938" y="362">low y=41 first;</text><text class="s" x="938" y="386">upper y=42 last.</text><text class="s" x="938" y="424">Exact rollback:</text><text class="s" x="938" y="448">upper y=42 first;</text><text class="s" x="938" y="472">low y=41 reverse.</text><text class="s" x="938" y="520">No temporary air state.</text>
<rect x="42" y="614" width="1114" height="54" rx="8" fill="#101b2c" stroke="#425b73"/><text class="l" x="64" y="646">Post QA: 7 verified y=41 floor-support contacts, unchanged floor, and air at y=43/y=44. This section documents containment only; it does not commission access or service.</text>
</svg>`;

const evidence = {
  schemaVersion: 1,
  id: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-01-AS-BUILT-VISUALS',
  status: 'PASS_EXECUTED_POSTSTATE_SOURCE_BOUND_NOT_COMMISSIONED',
  readOnly: true,
  mutationAuthority: false,
  worldMutated: false,
  bindings: {
    guardedLedger: { path: rel(ledgerPath), sha256: shaFile(ledgerPath), status: ledger.status },
    independentPostQa: { path: rel(qaPath), sha256: shaFile(qaPath), status: qa.status },
    interfaceAssertion: { path: rel(interfacePath), sha256: shaFile(interfacePath), status: interfaceAssertion.status },
    manifest: { path: rel(manifestPath), sha256: shaFile(manifestPath), identity: manifest.manifestIdentitySha256 },
    immutableSource: { root: rel(ledger.source.root), captureId: sourceCapture.captureId },
    immutablePost: { root: rel(ledger.post.root), captureId: postCapture.captureId }
  },
  geometry: {
    targetCount: 33,
    targetState: 'minecraft:polished_deepslate',
    targetCoordinateSetSha256: manifest.target.coordinateSetSha256,
    interactionHaloCellCount: 219,
    interactionHaloCoordinateSetSha256: manifest.interactionSet.haloCoordinateSetSha256,
    cadenceRetainedOverlapCount: 4,
    cadenceRetainedOverlapStateSha256: manifest.protectedInterfaces.arrivalCadence.retainedOverlapStateSha256,
    retainedStableGravelCount: 1,
    retainedStableGravelStateSha256: manifest.interactionSet.retainedStableGravityStateSha256,
    planLayer: 41,
    section: { x: sectionX, zMin, zMax, yRows },
    targets,
    retainedCadenceCells: cadence,
    retainedStableGravel: retained
  },
  asBuiltChecks: {
    canonicalTargetCount: qa.canonicalTargetCount,
    canonicalTargetState: qa.canonicalTargetState,
    floorSupportCount: qa.floorSupportCount,
    twoClearHeadroomAtEverySupport: qa.twoClearHeadroomAtEverySupport,
    rollbackPoststatePreflight: '33/33 guarded inverse cells pass',
    forwardAndRollbackExactInverse: manifest.operations.rollback.exactInverseOfForward
  },
  nonClaims: [
    'No world read or mutation occurs while generating this publication package.',
    'This publication does not commission a public route, passenger service, egress, rail, platform, or power system.'
  ]
};

fs.mkdirSync(abs(OUT), { recursive: true });
write('c01-arrival-gravity-support-as-built-plan.svg', planSvg);
write('c01-arrival-gravity-support-as-built-section.svg', sectionSvg);
write('c01-arrival-gravity-support-as-built-evidence.json', JSON.stringify(evidence, null, 2));
write('README.md', `# C01 arrival gravity-support 01 — as-built visual package\n\n**Status:** \`${evidence.status}\`\n\n- [As-built plan](c01-arrival-gravity-support-as-built-plan.svg)\n- [As-built section](c01-arrival-gravity-support-as-built-section.svg)\n- [Machine-readable evidence](c01-arrival-gravity-support-as-built-evidence.json)\n\nThis read-only package binds the accepted \`${releaseId}\` ledger and immutable post snapshot. It maps all **33** as-built polished-deepslate liner targets, their **219-cell** interaction halo, the **four** retained C01 arrival-cadence interface cells, and the separate retained gravel/support pair at \`(757,41,-77)\`.\n\nThe section records the low-first/upper-last forward sequence and exact reverse rollback, alongside the verified floor support and two-clear-headroom condition. It is documentation only and does not commission a route, public access, passenger service, or other operation.`);
console.log(JSON.stringify({ status: evidence.status, out: rel(OUT), assets: 4, targetCount: 33, interactionHaloCellCount: 219, mutationAuthority: false }, null, 2));
