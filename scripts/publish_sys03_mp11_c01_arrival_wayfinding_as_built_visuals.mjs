#!/usr/bin/env node
/** Read-only publication of the accepted three-cell C01 arrival cadence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const EVIDENCE = opt('--evidence-root', 'data/world-review/sys03-mp11-c01-arrival-wayfinding-frontier-live-20260827T035100Z');
const OUT = opt('--out', 'docs/masterplans/11-town-expansion-r1/02-visuals/sys03-mp11-c01-arrival-wayfinding-frontier-01');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const shaFile = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`C01 arrival as-built visuals rejected: ${message}`); };
const readJson = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const write = (name, body) => fs.writeFileSync(path.join(abs(OUT), name), `${body.endsWith('\n') ? body : `${body}\n`}`);

const ledgerPath = path.join(EVIDENCE, 'guarded-release-ledger.json');
const qaPath = path.join(EVIDENCE, 'independent-post-qa.json');
const protectedPath = path.join(EVIDENCE, 'protected-interface-halo.json');
const ledger = readJson(ledgerPath);
const qa = readJson(qaPath);
const protectedHalo = readJson(protectedPath);
const manifestPath = ledger.source?.manifest;
const manifest = readJson(manifestPath);
const releaseId = 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-FRONTIER-01';
fail(ledger.releaseId === releaseId && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'accepted guarded-release ledger missing');
fail(qa.releaseId === releaseId && qa.status === 'PASS_C01_ARRIVAL_WAYFINDING_FRONTIER_POSTSTATE_VERIFIED', 'accepted independent post QA missing');
fail(manifest.releaseId === releaseId && manifest.target?.operatedUnion?.cellCount === 3 && manifest.target?.desiredStateCensus?.['minecraft:sea_lantern'] === 3, 'canonical three-cell sea-lantern manifest missing');
fail(protectedHalo.status === 'PASS_EXACT_C01_TARGET_HALO_PROTECTED_INTERFACE' && protectedHalo.haloCount === 81 && protectedHalo.fluidGravityForbiddenCount === 0 && protectedHalo.blockEntityCount === 0 && protectedHalo.savedEntityCount === 0, 'protected 81-cell halo evidence missing');
fail(qa.routeCommissioned === false && qa.passengerServiceCommissioned === false && qa.mutationAuthority === false, 'publication must retain non-commissioning status');
const sourceCapture = readJson(path.join(ledger.source.root, 'combined-zones-complete-save-capture.json'));
const postCapture = readJson(path.join(ledger.post.root, 'combined-zones-complete-save-capture.json'));
fail(sourceCapture.captureId === qa.sourceCaptureId && postCapture.captureId === qa.postCaptureId, 'capture bindings drift');
const targets = [744, 748, 760];
const retained = [708, 712, 716, 720, 724, 728, 732, 736, 740];
const holds = [752, 756];
const x0 = 708, x1 = 760, left = 72, width = 1056;
const px = (x) => left + ((x - x0) / (x1 - x0)) * width;
const marker = (x, fill, label, y = 245) => `<line x1="${px(x)}" y1="176" x2="${px(x)}" y2="${y}" stroke="${fill}" stroke-width="4"/><rect x="${px(x) - 8}" y="${y - 8}" width="16" height="16" rx="2" fill="${fill}"/><text class="coord" x="${px(x)}" y="${y + 34}" text-anchor="middle">${label}</text>`;
const planSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">
<rect width="1200" height="620" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:13px system-ui;fill:#e7eef6}.coord{font:11px ui-monospace,monospace;fill:#d9e7f2}</style>
<text class="h" x="42" y="42">C01 L1 arrival cadence — accepted as-built plan</text>
<text class="s" x="42" y="66">z=-81 · y=42 · immutable post ${postCapture.captureId} · exact reversible three-cell extension</text>
<rect x="72" y="154" width="1056" height="138" rx="8" fill="#152841" stroke="#59738d"/>
<line x1="72" y1="245" x2="1128" y2="245" stroke="#e7eef6" stroke-width="3"/>
${retained.map((x) => marker(x, '#74d1ff', `x=${x}`)).join('')}
${targets.map((x) => marker(x, '#f6d365', `x=${x}`)).join('')}
${holds.map((x) => marker(x, '#ff7b72', `x=${x}`, 270)).join('')}
<text class="s" x="72" y="326">flush arrival-corridor floor line → increasing X</text>
<rect x="72" y="372" width="18" height="18" rx="2" fill="#74d1ff"/><text class="l" x="100" y="386">nine retained C01-NEXT-01 sea-lantern inlays</text>
<rect x="480" y="372" width="18" height="18" rx="2" fill="#f6d365"/><text class="l" x="508" y="386">three accepted as-built sea-lantern cadence cells</text>
<rect x="72" y="416" width="18" height="18" rx="2" fill="#ff7b72"/><text class="l" x="100" y="430">local gravel holds at x=752/756 remain excluded and unchanged</text>
<rect x="72" y="470" width="1056" height="96" rx="8" fill="#101b2c" stroke="#425b73"/>
<text class="l" x="94" y="500">Verified scope: 3 target cells · 81-cell exact interaction halo · 0 fluid/gravity/forbidden hits · 0 block entities · 0 saved entities.</text>
<text class="l" x="94" y="528">QA: flat walk surface and two clear headroom cells retained. This is a physical post-state record only—not route, public, passenger, or service commissioning.</text>
</svg>`;
const sectionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560">
<rect width="1200" height="560" fill="#0d1523"/><style>.h{font:700 25px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:13px system-ui;fill:#e7eef6}.coord{font:11px ui-monospace,monospace;fill:#d9e7f2}</style>
<text class="h" x="42" y="42">C01 L1 arrival cadence — as-built longitudinal section</text>
<text class="s" x="42" y="66">z=-81 · targets at y=42 · retained route geometry / clearance</text>
<rect x="72" y="126" width="1056" height="280" rx="8" fill="#152841" stroke="#59738d"/>
<line x1="72" y1="342" x2="1128" y2="342" stroke="#6d89a3"/><text class="s" x="20" y="347">y=41 support</text>
<line x1="72" y1="270" x2="1128" y2="270" stroke="#e7eef6" stroke-width="3"/><text class="s" x="20" y="275">y=42 floor</text>
<line x1="72" y1="198" x2="1128" y2="198" stroke="#6d89a3"/><text class="s" x="20" y="203">y=43 clear</text>
<line x1="72" y1="146" x2="1128" y2="146" stroke="#6d89a3"/><text class="s" x="20" y="151">y=44 clear</text>
${targets.map((x) => `<rect x="${px(x) - 10}" y="260" width="20" height="20" rx="2" fill="#f6d365"/><line x1="${px(x)}" y1="246" x2="${px(x)}" y2="160" stroke="#f6d365" stroke-width="2" stroke-dasharray="5 4"/><text class="coord" x="${px(x)}" y="382" text-anchor="middle">${x},42,-81</text>`).join('')}
<text class="l" x="72" y="452">Gold cells: accepted sea-lantern inlays. The preserved support, two-headroom clearance, and all non-target corridor cells are not altered by this release.</text>
<text class="s" x="72" y="500">Forward source: light_blue_concrete ×3 · target: sea_lantern ×3 · exact inverse preflight: 3/3 guards pass.</text>
</svg>`;
const evidence = {
  schemaVersion: 1,
  id: 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-FRONTIER-01-AS-BUILT-VISUALS',
  status: 'PASS_EXECUTED_POSTSTATE_SOURCE_BOUND_NOT_COMMISSIONED',
  readOnly: true,
  mutationAuthority: false,
  worldMutated: false,
  bindings: {
    guardedLedger: { path: rel(ledgerPath), sha256: shaFile(ledgerPath), status: ledger.status },
    independentPostQa: { path: rel(qaPath), sha256: shaFile(qaPath), status: qa.status },
    manifest: { path: rel(manifestPath), sha256: shaFile(manifestPath), identity: manifest.manifestIdentity },
    protectedInterface: { path: rel(protectedPath), sha256: shaFile(protectedPath), status: protectedHalo.status },
    immutableSource: { root: rel(ledger.source.root), captureId: sourceCapture.captureId },
    immutablePost: { root: rel(ledger.post.root), captureId: postCapture.captureId }
  },
  geometry: {
    plane: { y: 42, z: -81 },
    targets: targets.map((x) => ({ x, y: 42, z: -81, state: 'minecraft:sea_lantern' })),
    retainedPriorInlays: retained.map((x) => ({ x, y: 42, z: -81 })),
    localExcludedGravelHolds: holds.map((x) => ({ x, y: 42, z: -81 })),
    targetCount: 3,
    interactionHaloCellCount: 81,
    targetCoordinateSetSha256: manifest.target.operatedUnion.coordinateSetSha256,
    interactionHaloSha256: manifest.target.interactionHalo.coordinateSetSha256
  },
  asBuiltChecks: {
    flatWalkSurface: qa.flatWalkSurface,
    twoClearHeadroom: qa.twoClearHeadroom,
    haloUnexpectedDriftCount: qa.haloUnexpectedDriftCount,
    fluidGravityForbiddenCount: protectedHalo.fluidGravityForbiddenCount,
    blockEntityCount: protectedHalo.blockEntityCount,
    savedEntityCount: protectedHalo.savedEntityCount,
    forwardAndRollbackExactInverse: manifest.operations.cadence.exactInverse
  },
  nonClaims: [
    'No route, public access, passenger service, or service operation is commissioned by this visual package.',
    'No world read or mutation occurs while generating these documentation assets.'
  ]
};
fs.mkdirSync(abs(OUT), { recursive: true });
write('c01-arrival-wayfinding-as-built-plan.svg', planSvg);
write('c01-arrival-wayfinding-as-built-section.svg', sectionSvg);
write('c01-arrival-wayfinding-as-built-evidence.json', JSON.stringify(evidence, null, 2));
write('README.md', `# C01 arrival-wayfinding frontier 01 — as-built visual package\n\n**Status:** \`${evidence.status}\`\n\n- [As-built plan](c01-arrival-wayfinding-as-built-plan.svg)\n- [As-built longitudinal section](c01-arrival-wayfinding-as-built-section.svg)\n- [Machine-readable evidence](c01-arrival-wayfinding-as-built-evidence.json)\n\nThe accepted release converts exactly three flush L1 arrival-corridor floor cells—\`(744,42,-81)\`, \`(748,42,-81)\`, and \`(760,42,-81)\`—from light-blue concrete to sea-lantern inlays. It retains the nine prior C01-NEXT-01 inlays and excludes the local gravel holds at x=752 and x=756.\n\nThe guarded release and independent immutable-post QA verify the three targets, their exact 81-cell interaction halo, flat walking surface, and two clear headroom cells. This as-built documentation does not commission a route, public access, passenger service, or any operation.`);
console.log(JSON.stringify({ status: evidence.status, out: rel(OUT), assets: 4, targetCount: targets.length, mutationAuthority: false }, null, 2));
