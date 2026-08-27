#!/usr/bin/env node
/**
 * Generate MP11-C01-PORTAL-L1-ACCEPTANCE-01.
 *
 * READ ONLY / NON-AUTHORIZING.  This is deliberately a route-acceptance
 * contract, not an operation compiler: it creates no REPL files, makes no
 * live call, and grants no mutation authority.  It binds the known portal to
 * L1 route defect to one complete immutable Anvil survey and makes the two
 * ownership signatures that are required before a later build can even be
 * scoped explicit.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const relative = (filename) => path.relative(ROOT, filename).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`MP11 C01 acceptance contract rejected: ${message}`);
};

const SURVEY_PATH = path.resolve(ROOT, value(
  '--survey',
  'data/world-review/mp11-c01-portal-l1-current-source-20260826T143902Z/survey/bkr-survey-00.json',
));
const OUT_DIR = path.resolve(ROOT, value(
  '--out-dir',
  'data/world-review/mp11-c01-portal-l1-current-source-20260826T143902Z/acceptance-contract',
));
const GENERATED_AT = value('--generated-at', new Date().toISOString());

const surveyBytes = fs.readFileSync(SURVEY_PATH);
const survey = JSON.parse(surveyBytes.toString('utf8'));
const portalBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal');
const route = portalBox?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
invariant(survey.readOnly === true && survey.liveWorldMutated === false, 'survey must be read-only');
invariant(survey.source?.snapshot?.immutableCopy === true, 'source snapshot is not immutable');
invariant(route, 'east C01 portal-to-L1 route is absent');
invariant(route.stationCount === 127 && route.stations?.length === 127, 'expected the complete 127-station route');
invariant(route.minWidth === 2 && route.minHeadroom === 2, 'expected the 2x2 minimum envelope');
invariant(route.programStandard?.minWidth === 5 && route.programStandard?.minHeight === 5,
  'expected the 5x5 controlled-spine requirement');
invariant(route.landings?.length === 0, 'survey unexpectedly reports a landing');
invariant(portalBox.hazards?.gravityCells === 1686, 'expected 1,686 gravity cells in C01 portal envelope');

const gradeTransitions = route.stations.slice(1, 18).map((station, ordinal) => ({
  fromStation: ordinal,
  toStation: ordinal + 1,
  from: route.stations[ordinal].point,
  to: station.point,
  deltaY: station.rise,
}));
invariant(gradeTransitions.length === 17 && gradeTransitions.every((transition) => transition.deltaY === -1),
  'expected exactly 17 one-block descending grade transitions at route entry');

const firstUnowned = route.stations.slice(0, 26).map((station) => ({
  station: station.index,
  point: station.point,
  clearWidth: station.clearWidth,
  headroom: station.headroom,
}));
invariant(firstUnowned.length === 26 && firstUnowned.at(-1)?.station === 25,
  'expected the first 26 stations for the portal-side ownership gap');
const handoff = {
  fromStation: 25,
  toStation: 26,
  from: route.stations[25].point,
  to: route.stations[26].point,
  edge: route.walkableGraph?.edges?.find((edge) => edge.from === 25 && edge.to === 26) ?? null,
};
invariant(handoff.edge, 'portal/L1 handoff edge 25->26 is absent');

const violations = route.stations
  .filter((station) => station.clearWidth < 5 || station.headroom < 5)
  .map((station) => ({
    station: station.index,
    point: station.point,
    clearWidth: station.clearWidth,
    headroom: station.headroom,
    widthDeficit: Math.max(0, 5 - station.clearWidth),
    headroomDeficit: Math.max(0, 5 - station.headroom),
  }));

const contractWithoutHash = {
  schemaVersion: 1,
  id: 'MP11-C01-PORTAL-L1-ACCEPTANCE-01',
  generatedAtUtc: GENERATED_AT,
  status: 'HOLD_AWAITING_BILATERAL_ROUTE_ACCEPTANCE',
  mode: 'READ_ONLY_NON_AUTHORIZING',
  mutationAuthority: false,
  liveWorldMutated: false,
  source: {
    survey: relative(SURVEY_PATH),
    surveySha256: sha256(surveyBytes),
    snapshotRoot: survey.source.snapshot.rootDirectory,
    snapshotRegionSha256: survey.source.snapshot.sha256,
    captureId: survey.source.snapshot.captureId,
    capturedAtUtc: survey.source.snapshot.capturedAtUtc,
    immutableCopy: survey.source.snapshot.immutableCopy,
    routeNodeSetSha256: route.walkableGraph.nodeSetSha256,
    routeEdgeSetSha256: route.walkableGraph.edgeSetSha256,
  },
  observedRoute: {
    id: route.routeId,
    connectivity: route.connectivity,
    status: route.status,
    stations: route.stationCount,
    pathCells: route.pathCells,
    normalWalk: { maxRise: route.maxRise, maxDrop: route.maxDrop },
    controlledSpineRequirement: { width: 5, height: 5 },
    observedMinimumEnvelope: { width: route.minWidth, height: route.minHeadroom },
    envelopeFailure: '2x2 observed minimum is not the required 5x5 controlled portal-to-L1 spine',
    landingLevels: route.landings,
    noLandings: route.landings.length === 0,
    gravityCellsInReviewedPortalEnvelope: portalBox.hazards.gravityCells,
    fluidCellsInReviewedPortalEnvelope: portalBox.hazards.fluidCells,
    blockEntitiesInHalo: portalBox.blockEntities.count,
    envelopeViolations: violations,
  },
  unresolvedOwnership: {
    status: 'UNOWNED_PORTAL_SIDE_STATIONS_NOT_ACCEPTED',
    stationRange: { first: 0, last: 25, count: firstUnowned.length },
    stations: firstUnowned,
    statement: 'The Anvil route survey proves geometry, not an accepted owner. No mutation, access opening, or route acceptance may infer ownership for stations 0..25.',
  },
  portalToL1Handoff: {
    status: 'BILATERAL_ACCEPTANCE_REQUIRED',
    exactEdge: handoff,
    portalSide: {
      stationRange: { first: 0, last: 25 },
      requiredAcceptance: 'Named portal-side owner must accept the exact source-bound station set, approach access class, and any future target/halo.',
    },
    l1Side: {
      stationRange: { first: 26, last: 126 },
      observedReceiver: 'Town Expansion / C01 bunker east approach and L1 airlock geometry',
      requiredAcceptance: 'Named L1 receiver owner must accept the exact handoff edge, receiver/return path, access class, and any future target/halo.',
    },
    prohibitedInference: 'Neither the box label nor spatial adjacency supplies a signed owner, public opening, or build authority.',
  },
  gradeAndLandingGate: {
    status: 'HOLD_CONTINUOUS_GRADE_WITHOUT_LANDING_ACCEPTANCE',
    gradeTransitionCount: gradeTransitions.length,
    allTransitionsOneBlockDescending: gradeTransitions.every((transition) => transition.deltaY === -1),
    transitions: gradeTransitions,
    observedLandingCount: route.landings.length,
    requirement: 'Both owners must accept the complete 17/17 descending run and specify source-bound 5x5 landing locations before a future compiler may select cells.',
  },
  gravityGate: {
    status: 'HOLD_GRAVITY_CONTAINMENT_REQUIRED',
    gravityCells: portalBox.hazards.gravityCells,
    requirement: 'A future source-bound design must identify every affected gravity cell, containment sequence, target/halo ownership, and exact rollback. This contract authorizes none of them.',
  },
  acceptanceRequirements: [
    'Both portal-side and L1-side named owners sign the exact 25->26 handoff and their station ranges against this source hash.',
    'An accepted access-class decision confirms controlled pedestrian/vehicle separation and receiver/return behavior at the L1 airlock.',
    'An exact 5x5 route design binds the full 127-station path, the 17 descending transitions, and landing geometry; no widening is implied by this contract.',
    'A gravity containment design binds all relevant cells and sequence without treating the 1,686-cell envelope census as an operation list.',
    'Only after those decisions may a new compiler create a fresh exact target/halo, inverse operations, and the complete guarded-release kernel.',
  ],
  nonClaims: [
    'No world mutation, operation package, route commissioning, egress acceptance, or public opening occurred.',
    'Normal-walk connectivity does not satisfy the 5x5 controlled-route envelope.',
    'The current source snapshot does not replace a fresh release source snapshot.',
  ],
};
const contract = {
  ...contractWithoutHash,
  contractSha256: sha256(JSON.stringify(contractWithoutHash)),
};

const routePolyline = route.stations.map((station) => {
  const x = 70 + station.index * 8;
  const y = 170 - (station.standY - 43) * 4;
  return `${x},${y}`;
}).join(' ');
const unownedEndX = 70 + 25 * 8;
const handoffX = 70 + 25.5 * 8;
const gradeEndX = 70 + 17 * 8;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="390" viewBox="0 0 1140 390" role="img" aria-labelledby="title desc">
<title id="title">MP11 C01 portal to L1 source-bound acceptance map</title>
<desc id="desc">127 route stations: an unowned portal-side first 26-station run, a 17-transition descending grade, and the exact portal-to-L1 handoff at stations 25 to 26.</desc>
<rect width="1140" height="390" fill="#07131e"/>
<text x="36" y="38" fill="#f4f7fb" font-family="system-ui" font-size="22" font-weight="700">MP11 / C01 portal → L1 acceptance map — HOLD</text>
<text x="36" y="63" fill="#bac7d6" font-family="system-ui" font-size="13">source ${contract.source.snapshotRegionSha256.slice(0, 16)}… · 127 normal-walk stations · controlled target 5×5</text>
<rect x="70" y="92" width="${unownedEndX - 70 + 8}" height="196" rx="8" fill="#6b3b16" opacity="0.62"/>
<rect x="${unownedEndX + 8}" y="92" width="${70 + 126 * 8 - unownedEndX}" height="196" rx="8" fill="#163c4b" opacity="0.54"/>
<polyline points="${routePolyline}" fill="none" stroke="#e6edf5" stroke-width="4" stroke-linejoin="round"/>
<line x1="70" y1="170" x2="${gradeEndX}" y2="170" stroke="#ff735c" stroke-width="6" opacity="0.88"/>
<line x1="${handoffX}" y1="82" x2="${handoffX}" y2="307" stroke="#62d6ff" stroke-width="3" stroke-dasharray="8 6"/>
<circle cx="70" cy="170" r="7" fill="#ffbd5a"/><circle cx="${handoffX}" cy="170" r="7" fill="#62d6ff"/><circle cx="${70 + 126 * 8}" cy="170" r="7" fill="#88ddaa"/>
<text x="78" y="321" fill="#ffcf88" font-family="system-ui" font-size="14" font-weight="700">stations 0–25: UNOWNED / no inferred authority</text>
<text x="${handoffX + 10}" y="112" fill="#96e4ff" font-family="system-ui" font-size="14" font-weight="700">handoff edge 25→26</text>
<text x="${handoffX + 10}" y="133" fill="#c7d8e6" font-family="system-ui" font-size="12">portal owner + L1 receiver must both accept</text>
<text x="80" y="205" fill="#ff957f" font-family="system-ui" font-size="13">17/17 one-block descending transitions</text>
<text x="${handoffX + 8}" y="321" fill="#a8d8e9" font-family="system-ui" font-size="14" font-weight="700">stations 26–126: L1 receiver side, acceptance still required</text>
<text x="36" y="356" fill="#dce8f1" font-family="system-ui" font-size="13">Observed minimum 2×2 · required controlled spine 5×5 · no landings · 1,686 gravity cells in reviewed portal envelope</text>
</svg>\n`;

const markdown = `# MP11 C01 portal → L1 complete-route acceptance contract\n\n**Status:** \`${contract.status}\`  \n**Authority:** \`mutationAuthority: false\` — this artifact creates no operation package or permission to build.\n\n![Route acceptance map](mp11-c01-portal-l1-acceptance-map.svg)\n\nThe immutable source has **127** normal-walk route stations, but it is not an accepted controlled route: the observed minimum envelope is **2×2**, against the required **5×5**, and it has no qualifying landings. Stations **0–25** are explicitly unowned for acceptance purposes. The first possible receiver side begins at the exact edge **25 → 26** (${handoff.from.join(', ')} → ${handoff.to.join(', ')}).\n\nThe portal entry has **17/17** one-block descending transitions, no landing, and **1,686** gravity cells in the reviewed portal envelope. Those are design gates, not permission to select or edit cells.\n\n## Required acceptance before a future compiler\n\n${contract.acceptanceRequirements.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nSource survey: \`${contract.source.survey}\`  \nSource region SHA-256: \`${contract.source.snapshotRegionSha256}\`  \nRoute nodes: \`${contract.source.routeNodeSetSha256}\`  \nRoute edges: \`${contract.source.routeEdgeSetSha256}\`\n`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'mp11-c01-portal-l1-acceptance-contract.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'MP11-C01-PORTAL-L1-ACCEPTANCE-CONTRACT.md'), markdown);
fs.writeFileSync(path.join(OUT_DIR, 'mp11-c01-portal-l1-acceptance-map.svg'), svg);
process.stdout.write(`wrote ${relative(OUT_DIR)}\n`);
