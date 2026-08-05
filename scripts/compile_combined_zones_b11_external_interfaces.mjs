#!/usr/bin/env node
/**
 * Compile the offline P1-B11 external-interface owner-review packet.
 *
 * The packet proposes exact design geometry only where the controlling
 * evidence supplies both endpoints. An unset opposite endpoint compiles to a
 * zero-cell, sealed deferral. This script never reads a live world or emits
 * Minecraft operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-04T23:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.md',
));

const INPUTS = Object.freeze({
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  c1CivilDesign: 'masterplans/05-combined-zones/phase1-c1-civil-design.json',
  terrainProbe: 'masterplans/05-combined-zones/corridor-terrain-probe.json',
  d06EgressGeometry: 'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  releaseContract: 'masterplans/05-combined-zones/phase1-release-contract.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function findById(values, id, label) {
  const result = values.find((item) => item.id === id);
  if (!result) throw new Error(`${label} ${id} is missing`);
  return result;
}

function rasterLine(from, to) {
  let x = from.x;
  let z = from.z;
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  const sx = from.x < to.x ? 1 : -1;
  const sz = from.z < to.z ? 1 : -1;
  let error = dx - dz;
  const points = [];
  for (;;) {
    points.push({ x, z });
    if (x === to.x && z === to.z) break;
    const doubled = 2 * error;
    if (doubled > -dz) {
      error -= dz;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      z += sz;
    }
  }
  return points;
}

function pointKey(point) {
  return `${point.x},${point.y},${point.z}`;
}

const registry = readJson(INPUTS.coordinateRegistry);
const geometry = readJson(INPUTS.geometryCoordination);
const c1 = readJson(INPUTS.c1CivilDesign);
const terrain = readJson(INPUTS.terrainProbe);
const d06 = readJson(INPUTS.d06EgressGeometry);
const release = readJson(INPUTS.releaseContract);

const blocker = findById(geometry.blockerMatrix, 'P1-B11-EXTERNAL-INTERFACES', 'blocker');
if (blocker.status !== 'BLOCKING_OPERATION_COMPILATION') {
  throw new Error('P1-B11 source blocker status drift');
}
const z03 = findById(registry.zones, 'Z03', 'zone');
const c3 = findById(registry.connections, 'C3', 'connection');
const c4 = findById(registry.connections, 'C4', 'connection');
const terminal = findById(registry.zones, 'Z02', 'zone').hiddenSubway.terminal;
const namedProbe = (id) => findById(terrain.namedPointSamples, id, 'terrain probe');

if (z03.from.y !== null || z03.to.y !== null || c3.from !== null) {
  throw new Error('P1-B11 null-coordinate truth boundary drift');
}
if (c1.horizontalAlignment.endpoints.end.x !== 1550
    || c1.horizontalAlignment.endpoints.end.z !== -250) {
  throw new Error('C1 east endpoint drift');
}
if (d06.egressDesigns.length !== 2
    || !d06.independenceProof.exactExternalContinuationSetsDisjoint) {
  throw new Error('D06 exact endpoint evidence drift');
}
if (geometry.coordinateContract?.vertical?.nullYRule
    !== 'fail-closed-never-substitute-surveyed-terrain'
  || release.globalInvariants?.planningEnvelopeIsNotConstructionOwnership !== true) {
  throw new Error('release contract or geometry fail-closed invariant drift');
}

// This is a proposed engineered profile, not a terrain substitution: the west
// datum continues the accepted Gateway plane and the east datum meets Houston
// street Y. Four isolated rises are distributed across the exact raster.
const grandAvenuePlan = rasterLine(z03.from, z03.to);
const grandAvenueProfile = grandAvenuePlan.map((point, index) => ({
  station: index,
  x: point.x,
  y: 68 + Math.round((4 * index) / (grandAvenuePlan.length - 1)),
  z: point.z,
}));
const grandAvenueKeys = grandAvenueProfile.map(pointKey);
const duplicateGrandAvenuePoints = grandAvenueKeys.length - new Set(grandAvenueKeys).size;
const grandAvenueSteps = grandAvenueProfile.slice(1).map((point, index) => {
  const prior = grandAvenueProfile[index];
  return {
    dx: point.x - prior.x,
    dy: point.y - prior.y,
    dz: point.z - prior.z,
  };
});
const maximumVerticalStep = Math.max(...grandAvenueSteps.map(({ dy }) => Math.abs(dy)));
const riseStations = grandAvenueProfile
  .filter((point, index) => index > 0 && point.y !== grandAvenueProfile[index - 1].y)
  .map(({ station, x, y, z }) => ({ station, x, y, z }));

const sealedFutureLinePoints = terminal.trackCenterlinesZ.flatMap((z, index) => [
  { id: `GL-${index + 1}-WEST`, x: terminal.futureInterfaces.westThroatX, y: terminal.railY, z },
  { id: `GL-${index + 1}-EAST`, x: terminal.futureInterfaces.eastStubX, y: terminal.railY, z },
]);

const interfaceContracts = [
  {
    id: 'IF-B11-C1-Z01-GATEWAY',
    state: 'EXACT_DESIGN_ANCHOR_READY_FOR_OWNER_APPROVAL',
    fromOwner: 'C1-EAST-CORRIDOR',
    toOwner: 'Z01-GATEWAY',
    direction: 'BIDIRECTIONAL',
    anchor: { x: 1550, y: 68, z: -250 },
    basis: 'C1 exact civil profile endpoint and the Gateway engineered plane agree.',
    physicalSeamCellsAccepted: false,
  },
  {
    id: 'IF-B11-Z02-Z03-GRAND-AVENUE-WEST',
    state: 'EXACT_DESIGN_ANCHOR_AND_PROFILE_READY_FOR_OWNER_APPROVAL',
    fromOwner: 'Z02-SURFACE-APPROACH',
    toOwner: 'Z03-GRAND-AVENUE',
    direction: 'BIDIRECTIONAL',
    anchor: grandAvenueProfile[0],
    basis: 'Proposed engineered Y=68 continues the Gateway plane; it is not substituted terrain Y.',
    physicalSeamCellsAccepted: false,
  },
  {
    id: 'IF-B11-Z03-Z04-HOUSTON-EAST',
    state: 'EXACT_DESIGN_ANCHOR_AND_PROFILE_READY_FOR_OWNER_APPROVAL',
    fromOwner: 'Z03-GRAND-AVENUE',
    toOwner: 'Z04-HOUSTON-SURFACE',
    direction: 'BIDIRECTIONAL',
    anchor: grandAvenueProfile.at(-1),
    basis: 'Proposed engineered Y=72 meets the controlling Houston street datum.',
    physicalSeamCellsAccepted: false,
  },
  {
    id: 'IF-B11-C4-Z02-EMPTY-EIGHT',
    state: 'EXACT_INTERNAL_ROUTE_READY_FOR_OWNER_APPROVAL_OPENING_SEALED',
    fromOwner: 'Z02-SURFACE-APPROACH',
    toOwner: 'Z02-U1-CONCEALED-SUBWAY',
    direction: 'BIDIRECTIONAL_AFTER_SEPARATE_RELEASE',
    from: c4.from,
    to: c4.to,
    centerline: findById(registry.zones, 'Z02', 'zone').hiddenSubway.branch.proposedCenterline,
    maximumProposedGrade: c4.maximumProposedGrade,
    physicalSeamCellsAccepted: false,
    openingState: 'SEALED',
  },
  {
    id: 'IF-B11-C3-PASSAGEWAY',
    state: 'DEFAULT_DENY_ZERO_SET_DEFERRED',
    fromOwner: 'PASSAGEWAY-EXISTING-SYSTEM',
    toOwner: 'Z07-SUBTROPOLIS-PUBLIC-LOBBY',
    direction: 'NONE',
    knownCombinedZonesEndpoint: c3.to,
    passageWayEndpoint: null,
    proposedRoute: [],
    proposedInteractionCells: [],
    physicalSeamCellsAccepted: false,
    basis: 'No exact current PassageWay door is evidenced; a centroid or inferred endpoint is prohibited.',
  },
  {
    id: 'IF-B11-EMPTY-EIGHT-FUTURE-LINES',
    state: 'DEFAULT_DENY_EXACT_WALL_POINTS_SEALED',
    fromOwner: 'Z02-U1-TERMINAL-SHELL',
    toOwner: 'FUTURE-LINES-UNASSIGNED',
    direction: 'NONE',
    wallReferencePoints: sealedFutureLinePoints,
    openingState: 'SEALED',
    proposedInteractionCells: [],
    physicalSeamCellsAccepted: false,
  },
];

const acceptancePayload = {
  selection: 'ADOPT_EXACT_GRAND_AVENUE_68_TO_72_PROFILE_AND_DEFAULT_DENY_UNEVIDENCED_EXTERNAL_INTERFACES',
  grandAvenue: {
    owner: 'Z03-GRAND-AVENUE',
    crossSectionBlocks: z03.crossSectionBlocks,
    centerlinePointCount: grandAvenueProfile.length,
    horizontalStepCount: grandAvenueSteps.length,
    centerlineSha256: sha256(`${grandAvenueKeys.join('\n')}\n`),
    start: grandAvenueProfile[0],
    end: grandAvenueProfile.at(-1),
    totalRiseBlocks: grandAvenueProfile.at(-1).y - grandAvenueProfile[0].y,
    riseStations,
    maximumVerticalStep,
  },
  interfaceContracts,
};
const acceptancePayloadSha256 = sha256(`${JSON.stringify(acceptancePayload)}\n`);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-b11-external-interface-acceptance',
  generatedAtUtc: GENERATED_AT,
  status: 'READY_FOR_SOLE_OWNER_REVIEW_P1_B11_HOLD_UNTIL_HASH_ACCEPTED',
  purpose: 'Exact, offline P1-B11 planning selection and default-deny external-interface contract packet.',
  authority: {
    decisionAuthority: 'sole human project owner',
    additionalDecisionMakersRequired: false,
    recommendationMayBePreparedAutonomously: true,
    ownerApprovalRecordedByThisArtifact: false,
    acceptancePayloadSha256,
    acceptanceStatement: `I accept P1-B11 acceptance payload SHA-256 ${acceptancePayloadSha256} as the controlling Phase 1 planning basis.`,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
  sourceBindings: Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
    key,
    binding(relativePath, `${key} controlling evidence`),
  ])),
  factDesignBoundary: {
    facts: [
      'The authored Grand Avenue X/Z endpoints are 1750,-300 and 2048,-328; both authored Y values are null.',
      'The immutable terrain probe records dry terrain Y=62 at the west point and dry terrain Y=88 at the east point.',
      'Houston street Y is 72; the Gateway engineered interface plane is Y=68.',
      'The current PassageWay endpoint is absent from the controlling evidence.',
    ],
    designProposalsRequiringOwnerAcceptance: [
      'Use the exact 299-point Grand Avenue raster with an engineered Y=68 to Y=72 profile.',
      'Treat the C4 concealed subway geometry as an exact sealed future route.',
      'Defer C3 as a zero-cell interface until an exact PassageWay door and route are separately evidenced.',
    ],
    prohibitedInferences: [
      'Do not substitute terrain Y=62 or Y=88 for either authored null Grand Avenue setout.',
      'Do not turn a PassageWay catalog centroid, feature bound, or nearest point into a tunnel door.',
      'Do not turn an interface anchor into accepted seam cells or construction ownership.',
    ],
  },
  acceptancePayload,
  evidenceChecks: {
    grandAvenueEndpointTerrain: {
      west: namedProbe('GRAND-AVENUE-WEST'),
      east: namedProbe('GRAND-AVENUE-EAST'),
    },
    duplicateGrandAvenuePoints,
    grandAvenueEightConnected: grandAvenueSteps.every(
      ({ dx, dz }) => Math.max(Math.abs(dx), Math.abs(dz)) === 1,
    ),
    grandAvenueMaximumVerticalStep: maximumVerticalStep,
    grandAvenueProfileUsesTerrainSubstitution: false,
    passageWayUnevidencedEndpointCompiledToZeroSet: c3.from === null
      && interfaceContracts.find(({ id }) => id === 'IF-B11-C3-PASSAGEWAY')
        .proposedInteractionCells.length === 0,
    futureLineWallPointCount: sealedFutureLinePoints.length,
    allFutureLinesSealed: terminal.futureInterfaces.state === 'sealed-owned-interface-walls',
  },
  ownerReview: {
    approvalStatus: 'PENDING',
    approvalScope: 'P1-B11 planning geometry and default-deny interface dispositions only',
    doesNotApprove: [
      'construction or interaction cell ownership',
      'G04 or G05 global ownership/interface gates',
      'technical D02, D05, or D06 acceptance',
      'Minecraft operations, release, opening, discharge, or commissioning',
    ],
  },
  disposition: {
    p1B11ReadyForOwnerApproval: true,
    p1B11Approved: false,
    g03Passed: false,
    remainingAfterApproval: 'Compile exact integer construction/interaction sets and pass the separate G04/G05 ownership and interface audits.',
  },
};

const markdown = `# P1-B11 external-interface owner-acceptance packet\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `This packet replaces every unresolved interface guess with either exact proposed design geometry or an explicit zero-cell deferral. It is ready for the sole project owner to review, but it does not record approval by itself.\n\n`
  + `## Approval payload\n\n`
  + `- SHA-256: \`${acceptancePayloadSha256}\`\n`
  + `- Statement: “${report.authority.acceptanceStatement}”\n\n`
  + `## Proposed controlling choices\n\n`
  + `- Grand Avenue: ${grandAvenueProfile.length} exact centerline points from \`1750,68,-300\` to \`2048,72,-328\`; four isolated rises; 8-block authored cross-section retained for later exact-cell compilation.\n`
  + `- Gateway/C1: exact common design anchor at \`1550,68,-250\`.\n`
  + `- Concealed subway C4: retain the five authored exact vertices, but keep the opening sealed.\n`
  + `- PassageWay C3: compile a zero-cell deferral because no exact existing-system door is evidenced.\n`
  + `- Empty Eight: retain all 16 exact future-line wall reference points as sealed.\n\n`
  + `## Truth boundary\n\n`
  + `The Grand Avenue elevations are a proposed engineered profile. They are not terrain substitutions: the bound terrain is Y=62 at the west endpoint and Y=88 at the east endpoint. Interface anchors are not physical seam cellsets, so G04/G05 remain HOLD after P1-B11 approval. No route to PassageWay is inferred from a centroid or nearest catalog feature.\n\n`
  + `## Approval effect\n\n`
  + `Owner acceptance freezes the last subjective P1-B11 planning choice. It does not authorize a world edit, open a future line, accept technical engineering, or pass the later exact ownership/interface gates.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  acceptancePayloadSha256,
  grandAvenueCenterlinePointCount: grandAvenueProfile.length,
  interfaceContractCount: interfaceContracts.length,
  operationCellCount: 0,
}, null, 2)}\n`);
