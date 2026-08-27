#!/usr/bin/env node
/** Compact source-bound/as-built maps for the executed C01 Return-02 scope. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const EVIDENCE = 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z';
const SNAPSHOT = 'data/worldsnap-mp11-c01-public-independent-return-02-exec-post-20260827T023000Z';
const MANIFEST = `${EVIDENCE}/rebound/compile/mp11-c01-public-independent-return-02.manifest.json`;
const CORRECTION = `${EVIDENCE}/post-qa-correction/mp11-c01-public-independent-return-02-post-qa-correction-ledger.json`;
const CORRECTED_QA = `${EVIDENCE}/independent-post-release-qa-corrected/mp11-c01-public-independent-return-02-post-qa.json`;
const TERMINAL_LEDGER = `${EVIDENCE}/mp11-c01-public-independent-return-02-guarded-release-ledger.json`;
const OUT = 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-c01-public-independent-return-02';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = (value) => sha256(fs.readFileSync(abs(value)));
const readJson = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`C01 Return-02 as-built map rejected: ${message}`); };
const pointKey = (point) => point.join(',');
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

for (const required of [MANIFEST, CORRECTION, CORRECTED_QA, TERMINAL_LEDGER, `${SNAPSHOT}/region`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`]) fail(fs.existsSync(abs(required)), `missing ${required}`);
const manifest = readJson(MANIFEST);
const correction = readJson(CORRECTION);
const qa = readJson(CORRECTED_QA);
const terminalLedger = readJson(TERMINAL_LEDGER);
const capture = readJson(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);
const contracts = Object.entries(manifest.ownershipAndInterfaces?.contracts ?? {}).map(([id, contract]) => ({ id, ...contract }));
const stations = manifest.route?.returnStations ?? [];
const canonical = manifest.target?.allCanonicalPostStates ?? [];

fail(manifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && stations.length === 28 && manifest.target?.canonicalPostStateCellCount === 768, 'wrong Return-02 manifest geometry');
fail(contracts.length === 4 && contracts.every((contract) => contract.supportRow?.cellCount === 5 && contract.clearFace?.cellCount === 25), 'four 5×5 endpoint interfaces are not exact');
fail(manifest.route.currentProtectedRouteInteriorHaloIntersectionCount === 0, 'protected switchback exclusion is not zero');
fail(correction.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_BY_CORRECTED_IMMUTABLE_QA' && correction.mutationAuthority === false && correction.worldMutated === false, 'accepted read-only correction ledger is missing');
fail(correction.correctedEvidence?.qa?.sha256 === fileSha256(CORRECTED_QA) && correction.preservedOriginalEvidence?.guardedReleaseLedger?.sha256 === fileSha256(TERMINAL_LEDGER), 'correction bindings drift');
fail(qa.status === 'PASS_C01_RETURN02_IMMUTABLE_POST_QA' && qa.postSnapshot?.root === SNAPSHOT && qa.postSnapshot?.captureId === capture.captureId, 'corrected immutable post QA does not bind this post capture');
fail(qa.bindings?.manifest?.sha256 === fileSha256(MANIFEST) && qa.bindings?.ledger?.sha256 === fileSha256(TERMINAL_LEDGER), 'corrected QA bindings drift');
for (const check of ['canonicalPostStates', 'dryGravitySafe', 'twentyEightFiveWideFiveClearStations', 'endpointAndProtectedSwitchbackInvariants']) fail(qa.checks?.[check]?.passed === true, `corrected QA check failed: ${check}`);
fail(qa.checks.lowerToUpperNormalWalk === true && qa.checks.upperToLowerNormalWalk === true, 'bidirectional normal-walk QA failed');

const reader = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const postMismatches = [];
for (const cell of canonical) {
  const actual = stateToCommandString(await reader.blockState(...cell.point));
  if (actual !== cell.targetState) postMismatches.push({ point: cell.point, expected: cell.targetState, actual });
}
fail(postMismatches.length === 0, 'immutable post snapshot no longer matches the 768 canonical states');

const allPoints = [...stations.map(({ point }) => point), ...contracts.map(({ point }) => point)];
const bounds = {
  min: [Math.min(...allPoints.map((point) => point[0])), Math.min(...allPoints.map((point) => point[1])), Math.min(...allPoints.map((point) => point[2]))],
  max: [Math.max(...allPoints.map((point) => point[0])), Math.max(...allPoints.map((point) => point[1])), Math.max(...allPoints.map((point) => point[2]))],
};
const routeBounds = {
  min: [Math.min(...stations.map(({ point }) => point[0])), Math.min(...stations.map(({ point }) => point[1])), Math.min(...stations.map(({ point }) => point[2]))],
  max: [Math.max(...stations.map(({ point }) => point[0])), Math.max(...stations.map(({ point }) => point[1])), Math.max(...stations.map(({ point }) => point[2]))],
};
const planMap = () => {
  const minX = bounds.min[0] - 3; const maxX = bounds.max[0] + 3; const minZ = bounds.min[2] - 3; const maxZ = bounds.max[2] + 3;
  const left = 96; const top = 106; const mapWidth = 1050; const mapHeight = 560;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * mapWidth;
  const sz = (z) => top + ((z - minZ) / (maxZ - minZ)) * mapHeight;
  const pathD = stations.map(({ point }, index) => `${index ? 'L' : 'M'}${sx(point[0]).toFixed(1)} ${sz(point[2]).toFixed(1)}`).join(' ');
  const contractColors = { mainUpper: '#ffcc66', returnUpper: '#57d6ff', returnLower: '#76e092', mainLower: '#ff9c82' };
  const contractMarks = contracts.map(({ id, point, direction }) => `<g><rect x="${sx(point[0]) - 6}" y="${sz(point[2]) - 6}" width="12" height="12" fill="${contractColors[id] ?? '#fff'}" stroke="#ffffff"/><text x="${sx(point[0]) + 10}" y="${sz(point[2]) - 8}" class="label">${escape(id)}: [${point.join(', ')}]</text><text x="${sx(point[0]) + 10}" y="${sz(point[2]) + 7}" class="micro">${escape(direction)}</text></g>`).join('');
  const stationMarks = stations.map(({ point }, index) => `<g><circle cx="${sx(point[0])}" cy="${sz(point[2])}" r="5" fill="#0c1624" stroke="#65bdf7" stroke-width="2"/><text x="${sx(point[0])}" y="${sz(point[2]) + 3}" text-anchor="middle" class="station">${index + 1}</text></g>`).join('');
  const xGrid = range(Math.ceil(minX / 2) * 2, Math.floor(maxX / 2) * 2).map((x) => `<line x1="${sx(x)}" y1="${top}" x2="${sx(x)}" y2="${top + mapHeight}"/><text x="${sx(x)}" y="${top + mapHeight + 20}" text-anchor="middle" class="axis">${x}</text>`).join('');
  const zGrid = range(Math.ceil(minZ / 2) * 2, Math.floor(maxZ / 2) * 2).map((z) => `<line x1="${left}" y1="${sz(z)}" x2="${left + mapWidth}" y2="${sz(z)}"/><text x="${left - 10}" y="${sz(z) + 4}" text-anchor="end" class="axis">${z}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820"><style>.title{font:700 23px system-ui;fill:#eff7ff}.sub{font:13px system-ui;fill:#bfd0df}.label{font:600 12px system-ui;fill:#f7fbff}.micro{font:10px system-ui;fill:#c7d8e7}.axis{font:11px ui-monospace,monospace;fill:#9eb3c4}.station{font:700 8px system-ui;fill:#f8fdff}</style><rect width="100%" height="100%" fill="#0b1522"/><text x="32" y="35" class="title">C01 Return-02 — executed independent 5-wide public return (plan)</text><text x="32" y="58" class="sub">Immutable post capture ${escape(capture.captureId)} · X/Z map · 28 numbered stations · 5 support-wide × 5 clear-high</text><rect x="${left}" y="${top}" width="${mapWidth}" height="${mapHeight}" fill="#14273a" stroke="#5e7890"/><g stroke="#2d465a" stroke-width="1">${xGrid}${zGrid}</g><path d="${pathD}" fill="none" stroke="#1f75a8" stroke-width="13" opacity=".55"/><path d="${pathD}" fill="none" stroke="#65bdf7" stroke-width="5"/>${stationMarks}${contractMarks}<rect x="50" y="710" width="1180" height="72" rx="6" fill="#112033" stroke="#36516b"/><text x="66" y="735" class="label">Verified physical scope: 768 canonical post-state cells, 28/28 stations, bidirectional normal-walk PASS, dry/gravity-safe PASS, endpoint contracts PASS.</text><text x="66" y="757" class="micro">Protected main-switchback interior-halo intersection: 0 (excluded). Four endpoint contracts are exact 5×5 interfaces. This is not a public opening, route commissioning, or service authorization.</text></svg>`;
};
const elevationMap = () => {
  const left = 96; const top = 110; const width = 1060; const height = 460; const minY = routeBounds.min[1] - 2; const maxY = routeBounds.max[1] + 2;
  const sx = (index) => left + (index / (stations.length - 1)) * width;
  const sy = (y) => top + ((maxY - y) / (maxY - minY)) * height;
  const line = stations.map(({ point }, index) => `${index ? 'L' : 'M'}${sx(index).toFixed(1)} ${sy(point[1]).toFixed(1)}`).join(' ');
  const yGrid = range(Math.ceil(minY / 2) * 2, Math.floor(maxY / 2) * 2).map((y) => `<line x1="${left}" y1="${sy(y)}" x2="${left + width}" y2="${sy(y)}"/><text x="${left - 10}" y="${sy(y) + 4}" text-anchor="end" class="axis">Y=${y}</text>`).join('');
  const labels = stations.map(({ point, role }, index) => (index % 3 === 0 || index === stations.length - 1) ? `<text x="${sx(index)}" y="${top + height + 22}" text-anchor="middle" class="axis">${index + 1}</text><text x="${sx(index)}" y="${top + height + 36}" text-anchor="middle" class="micro">${point[0]},${point[2]}</text>` : '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760"><style>.title{font:700 23px system-ui;fill:#eff7ff}.sub{font:13px system-ui;fill:#bfd0df}.axis{font:11px ui-monospace,monospace;fill:#9eb3c4}.micro{font:10px system-ui;fill:#c7d8e7}.label{font:600 12px system-ui;fill:#f7fbff}</style><rect width="100%" height="100%" fill="#0b1522"/><text x="32" y="35" class="title">C01 Return-02 — vertical station elevation</text><text x="32" y="58" class="sub">Station sequence 1 → 28; each plotted point is an exact feet coordinate [X, Y, Z], not a generalized grade.</text><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#14273a" stroke="#5e7890"/><g stroke="#2d465a" stroke-width="1">${yGrid}</g><path d="${line}" fill="none" stroke="#65bdf7" stroke-width="5"/>${stations.map(({ point, role }, index) => `<circle cx="${sx(index)}" cy="${sy(point[1])}" r="5" fill="${role === 'fold-landing' ? '#ffcc66' : '#65bdf7'}" stroke="#fff"/><title>Station ${index + 1}: [${point.join(', ')}], ${role}</title>`).join('')}<text x="${sx(0) + 8}" y="${sy(stations[0].point[1]) - 12}" class="label">returnUpper [${stations[0].point.join(', ')}]</text><text x="${sx(stations.length - 1) - 8}" y="${sy(stations.at(-1).point[1]) + 24}" text-anchor="end" class="label">returnLower [${stations.at(-1).point.join(', ')}]</text><text x="${left}" y="${top + height + 82}" class="micro">Gold points are the fold landing. Adjacent station transitions are normal-walk checked in both directions. Elevation extent: Y=${routeBounds.min[1]}…${routeBounds.max[1]}; route X/Z extent: X=${routeBounds.min[0]}…${routeBounds.max[0]}, Z=${routeBounds.min[2]}…${routeBounds.max[2]}.</text><text x="${left}" y="${top + height + 105}" class="micro">Status: physically verified and reversible through corrected immutable post QA; not commissioned for public access or service.</text></svg>`;
};

const evidence = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-AS-BUILT-MAPS',
  status: 'PASS_SOURCE_BOUND_PHYSICALLY_VERIFIED_NOT_COMMISSIONED',
  readOnly: true,
  mutationAuthority: false,
  worldMutated: false,
  bindings: {
    manifest: { path: MANIFEST, sha256: fileSha256(MANIFEST) },
    correctedQa: { path: CORRECTED_QA, sha256: fileSha256(CORRECTED_QA), status: qa.status },
    correctionLedger: { path: CORRECTION, sha256: fileSha256(CORRECTION), status: correction.status },
    terminalGuardedLedger: { path: TERMINAL_LEDGER, sha256: fileSha256(TERMINAL_LEDGER), status: terminalLedger.status },
    immutablePost: { root: SNAPSHOT, captureId: capture.captureId, captureManifestSha256: fileSha256(`${SNAPSHOT}/combined-zones-complete-save-capture.json`) },
  },
  geometry: {
    allInterfaceAndRouteBounds: bounds,
    independentReturnStationBounds: routeBounds,
    stationCount: stations.length,
    orderedStationSha256: manifest.route.orderedReturnStationSha256,
    publicClearance: manifest.route.publicClearance,
    endpointContracts: contracts.map(({ id, point, direction, supportRow, clearFace }) => ({ id, point, direction, supportCellCount: supportRow.cellCount, clearCellCount: clearFace.cellCount, width: clearFace.width, height: clearFace.height })),
    protectedSwitchbackInteriorHaloIntersectionCount: manifest.route.currentProtectedRouteInteriorHaloIntersectionCount,
  },
  asBuiltChecks: {
    canonicalPostStateCellCount: canonical.length,
    immutablePostCanonicalMismatches: postMismatches,
    correctedQaChecks: {
      canonical: qa.checks.canonicalPostStates.passed,
      dryGravitySafe: qa.checks.dryGravitySafe.passed,
      stations: qa.checks.twentyEightFiveWideFiveClearStations.passed,
      lowerToUpperNormalWalk: qa.checks.lowerToUpperNormalWalk,
      upperToLowerNormalWalk: qa.checks.upperToLowerNormalWalk,
      endpointsAndProtectedSwitchback: qa.checks.endpointAndProtectedSwitchbackInvariants.passed,
    },
  },
  nonClaims: ['The physically verified return is not opened, publicly commissioned, service commissioned, or otherwise authorized for a new live operation.', 'Map generation reads immutable artifacts and does not mutate Minecraft.'],
};
evidence.evidenceSha256 = sha256(`${JSON.stringify(evidence, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(`${OUT}/c01-return-02-as-built-plan.svg`), `${planMap()}\n`);
fs.writeFileSync(abs(`${OUT}/c01-return-02-as-built-elevation.svg`), `${elevationMap()}\n`);
fs.writeFileSync(abs(`${OUT}/c01-return-02-as-built-map-evidence.json`), `${JSON.stringify(evidence, null, 2)}\n`);
fs.writeFileSync(abs(`${OUT}/README.md`), `# C01 Return-02 — source-bound/as-built maps\n\n**Status:** \`${evidence.status}\`\n\n- [Plan map](c01-return-02-as-built-plan.svg)\n- [Vertical station elevation](c01-return-02-as-built-elevation.svg)\n- [Machine-readable evidence](c01-return-02-as-built-map-evidence.json)\n\nThe independent return has **28** exact stations, five support cells across and five clear cells above each station. Its return-station bounds are **X=${routeBounds.min[0]}…${routeBounds.max[0]}, Y=${routeBounds.min[1]}…${routeBounds.max[1]}, Z=${routeBounds.min[2]}…${routeBounds.max[2]}**. The maps show four exact 5×5 endpoint contracts and the recorded **zero** intersection with the protected main-switchback interior halo.\n\nThe accepted corrected immutable QA and direct post-snapshot verification prove all **${canonical.length}** canonical target cells, dry/gravity-safe geometry, station clearance, and normal walking in both directions. This is a verified physical scope only; it is **not** a public opening or service commissioning.\n`);
console.log(JSON.stringify({ status: evidence.status, out: OUT, stationCount: stations.length, canonicalPostStateCellCount: canonical.length, endpointContracts: contracts.length, mutationAuthority: false }, null, 2));
