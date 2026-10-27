#!/usr/bin/env node
/** Publish a read-only no-second-return contract from the completed C01 survey. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const TOPOLOGY = option('--topology', 'data/world-review/mp11-bkr-c01-portal-topology-second-return-03-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-portal-topology-second-return-03.json');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-01-cobalt-wl-post-20260826T233000Z/bkr-survey-00.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-no-second-return-contract-01-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR no-second-return contract rejected: ${message}`); };

const topologyPath = abs(TOPOLOGY); const topologyBytes = fs.readFileSync(topologyPath); const topology = JSON.parse(topologyBytes);
const surveyPath = abs(SURVEY); const surveyBytes = fs.readFileSync(surveyPath); const survey = JSON.parse(surveyBytes);
fail(topology.id === 'MP11-BKR-C01-PORTAL-TOPOLOGY-SECOND-RETURN-03', 'wrong topology report');
fail(topology.mutationAuthority === false && topology.safetyBoundary?.forwardOperationFilesEmitted === 0, 'topology report has unexpected authority');
fail(topology.expandedGravityTopology?.originalBoundaryComponentCount === 14, 'expected 14 initial boundary components');
fail(topology.expandedGravityTopology?.expandedComponentCount === 12 && topology.expandedGravityTopology?.finiteComponentCount === 12 && topology.expandedGravityTopology?.unboundedComponentCount === 0, 'gravity topology is not fully finite');
fail(topology.independentReturnSurvey?.status === 'NO_SECOND_INDEPENDENT_PORTAL_RETURN_IN_SOURCE_BOUND_STUDY', 'second-return hold is not established');
fail(survey.source?.snapshot?.captureId === topology.source?.captureId, 'BKR survey does not match topology source');
const surveyBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal');
const route = surveyBox?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
const routeStationSetSha256 = route?.stations ? sha256(route.stations.map((station) => station.point.join(',')).sort().join('\n')) : null;
fail(route?.stationCount === 127 && routeStationSetSha256 === topology.currentReturn?.stationSetSha256, 'current return graph does not match completed topology survey');
const output = abs(OUT); fail(!fs.existsSync(output), '--out must be fresh');

const B = topology.initialStudyBounds;
const sx = (x) => 52 + ((x - B.minX) / (B.maxX - B.minX)) * 1080;
const sz = (z) => 106 + ((z - B.minZ) / (B.maxZ - B.minZ)) * 410;
const routeLine = route.stations.map((station, index) => `${index ? 'L' : 'M'}${sx(station.point[0]).toFixed(1)} ${sz(station.point[2]).toFixed(1)}`).join(' ');
const rect = (bounds, color, label) => `<rect x="${sx(bounds.minX).toFixed(1)}" y="${sz(bounds.minZ).toFixed(1)}" width="${(sx(bounds.maxX) - sx(bounds.minX) + 7).toFixed(1)}" height="${(sz(bounds.maxZ) - sz(bounds.minZ) + 7).toFixed(1)}" fill="${color}" fill-opacity=".35" stroke="${color}"/><text x="${(sx(bounds.minX) + 3).toFixed(1)}" y="${(sz(bounds.minZ) + 14).toFixed(1)}" class="tiny">${label}</text>`;
const componentRects = topology.expandedGravityTopology.components.map((component) => rect(component.bounds, '#d6a857', component.componentId)).join('');
const start = route.startAnchor; const end = route.endAnchor;
const anchorRect = (box, label, color) => `<rect x="${sx(box[0]).toFixed(1)}" y="${sz(box[2]).toFixed(1)}" width="${(sx(box[3]) - sx(box[0]) + 8).toFixed(1)}" height="${(sz(box[5]) - sz(box[2]) + 8).toFixed(1)}" fill="${color}" fill-opacity=".6" stroke="#eff7ff"/><text x="${(sx(box[0]) + 3).toFixed(1)}" y="${(sz(box[2]) + 15).toFixed(1)}" class="tiny">${label}</text>`;
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650" viewBox="0 0 1200 650"><rect width="1200" height="650" fill="#0d1523"/><style>.head{font:700 25px system-ui;fill:#eff7ff}.sub{font:14px ui-monospace,monospace;fill:#c7d8e7}.tiny{font:11px ui-monospace,monospace;fill:#f4f7fb}</style><text x="42" y="39" class="head">C01 portal: finite gravity topology / no independent second return</text><text x="42" y="66" class="sub">Coordinate plan — x ${B.minX}..${B.maxX}; z ${B.minZ}..${B.maxZ}; y is governed by the source-bound normal-walk graph</text><rect x="52" y="106" width="1080" height="410" fill="#142238" stroke="#597189"/>${componentRects}<path d="${routeLine}" fill="none" stroke="#65c7ff" stroke-width="4" stroke-linejoin="round"/><text x="68" y="493" class="sub">Blue: current 127-station portal→L1 return. Gold: all 12 former boundary gravity components; each is now finite in the immutable source.</text>${anchorRect(start, 'portal anchor', '#598c69')}${anchorRect(end, 'L1 anchor', '#8d5c91')}<text x="52" y="558" class="sub">Independent-return search excluded the complete 1-cell horizontal halo of the current return’s interior stations, except anchor volumes.</text><text x="52" y="584" class="sub">No normal-walk portal↔L1 path remained inside this exact study boundary. Gravity is no longer the blocker; independent return evidence is required.</text><text x="52" y="620" class="sub">This evidence publishes no operation, receiver, bypass, liner, route opening, or mutation authority.</text></svg>\n`;

const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-NO-SECOND-RETURN-CONTRACT-01', generatedAtUtc: new Date().toISOString(),
  status: 'INDEPENDENT_RETURN_REQUIRED_GRAVITY_TOPOLOGY_FINITE', mode: 'READ_ONLY_EVIDENCE_CONTRACT_NO_OPERATIONS', mutationAuthority: false,
  evidence: {
    topologyReport: { path: rel(TOPOLOGY), sha256: sha256(topologyBytes), decisionIdentitySha256: topology.decisionIdentitySha256 },
    bkrSurvey: { path: rel(SURVEY), sha256: sha256(surveyBytes) },
    source: topology.source,
  },
  coordinateStudy: { bounds: B, currentReturn: { routeId: route.routeId, stationCount: route.stationCount, nodeSetSha256: route.walkableGraph.nodeSetSha256, edgeSetSha256: route.walkableGraph.edgeSetSha256, startAnchor: start, endAnchor: end, requiredEnvelopeMet: false } },
  gravityDisposition: {
    status: 'FINITE_TOPOLOGY_NOT_A_CURRENT_BLOCKER',
    initialBoundaryComponentCount: 14, expandedComponentCount: 12, finiteComponentCount: 12, unboundedComponentCount: 0,
    componentSetSha256: sha256(JSON.stringify(topology.expandedGravityTopology.components)),
    note: 'Finite topology removes only the former unknown/unbounded-gravity blocker. A later selected component still needs a fresh exact interaction halo, supports, fluid/receiver review, entity clearance, forward/inverse states, and post/rollback QA.',
  },
  noSecondReturnAssertion: {
    status: topology.independentReturnSurvey.status,
    searchBounds: B,
    movementPolicy: 'normal walk only; cardinal movement; maximum rise/drop one block; passable feet/head with solid footing; water/lava/waterlogged feet and head rejected',
    currentReturnInteriorHalo: { radius: 'one horizontal cell at each interior current-return station', excludedCellCount: topology.independentReturnSurvey.excludedCurrentInteriorHaloCellCount, excludedCellSetSha256: topology.independentReturnSurvey.excludedCurrentInteriorHaloCellSetSha256, anchorVolumesRetained: true },
    startStandableCount: topology.independentReturnSurvey.searchedStartStandableCount,
    endStandableCount: topology.independentReturnSurvey.searchedEndStandableCount,
    result: 'No normal-walk path remains between the exact portal and L1 anchor volumes after current-return interior-halo exclusion.',
  },
  hardGate: {
    result: 'NO_PHYSICAL_PORTAL_LINER_OR_DRY_BYPASS_UNTIL_INDEPENDENT_RETURN_EVIDENCED',
    requiredNextEvidence: [
      'A source-bound second portal return with exact station and directed edge hashes, using a route that does not reuse the current return’s stair/interior halo or the selected containment component interaction set.',
      'Two independently checked normal-walk direction proofs: portal→L1 and L1→portal for both return routes.',
      'For any later physical package: exact finite cells and halo; block-entity/protected-core exclusion or reviewed migration; fluid/receiver/overflow treatment if present; gravity support; fresh entity clearance; strict-noop forward/inverse checks; journaled post capture and post/rollback QA.',
    ],
  },
  nonClaims: ['No operation files, release manifest, or execution authority.', 'No physical liner, dry bypass, receiver, container migration, route widening, egress opening, or commissioning.', 'The finite-gravity finding does not itself create a physical package.'],
};
const contract = { ...base, contractIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'mp11-bkr-c01-no-second-return-contract-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(output, 'mp11-bkr-c01-no-second-return-coordinate-map.svg'), map);
fs.writeFileSync(path.join(output, 'MP11-BKR-C01-NO-SECOND-RETURN-CONTRACT-01.md'), `# MP11 / BKR C01 no-second-return contract 01\n\n**Status:** \`${contract.status}\`  \n**Authority:** evidence only; no operation or mutation authority.\n\n![Coordinate map](mp11-bkr-c01-no-second-return-coordinate-map.svg)\n\nAll **12** expanded former-boundary gravity components are finite in the immutable source. Gravity topology is therefore no longer the current blocker. The current portal-to-L1 return has **127** stations, but no second normal-walk return survives exclusion of its exact one-cell interior halo. A separately source-bound independent return is required before any portal liner or dry-bypass package may be compiled.\n`);
console.log(JSON.stringify({ status: contract.status, out: rel(output), mutationAuthority: false, finiteGravityComponents: contract.gravityDisposition.finiteComponentCount, secondReturn: contract.noSecondReturnAssertion.status }, null, 2));
