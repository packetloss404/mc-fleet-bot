#!/usr/bin/env node
/**
 * Screen the remaining Empty Eight monumental-concourse / discovery-sequence
 * architecture against the accepted R08AA post state.
 *
 * This is deliberately a read-only fail-closed scope screen. It emits no
 * operation or release-manifest files: the accepted D06 design freezes the
 * architectural palette and one mezzanine elevation, but it does not freeze
 * a coordinate set for a monumental floor, columns, portals, or wayfinding.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellsIn,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-22T00:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08aa-post-20260822T004356Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08aa-live-20260822T004356Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-release-ledger',
  'data/world-review/combined-zones-r08aa-live-20260822T004356Z/evidence-ledger.json',
);
const SOURCE_QA = value(
  '--source-post-qa',
  'data/world-review/combined-zones-r08aa-live-20260822T004356Z/r08aa-post-release-qa.json',
);
const OUTPUT = value(
  '--out',
  'data/world-review/combined-zones-r08-monumental-concourse-discovery-scope-blocker-20260822.json',
);
const MARKDOWN = value(
  '--md-out',
  'docs/masterplans/05-combined-zones/phase1-r08-monumental-concourse-discovery-scope-blocker.md',
);

const INPUTS = Object.freeze({
  design: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  r01CueManifest: 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.manifest.json',
  n06Blocker: 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
  retailManifests: [
    'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
  ],
  platformManifests: Array.from({ length: 8 }, (_, index) => (
    `data/buildops/combined-zones-r08-empty-eight-platform-${String(index + 1).padStart(2, '0')}-fitout.release-manifest.json`
  )),
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
const rawCellSetSha256 = (cells) => sha256(
  [...cells]
    .sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z)
    .map(cellKey)
    .join('\n'),
);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08 architectural scope screen rejected: ${message}`);
};
const census = (states) => Object.fromEntries(
  [...states.reduce((counts, state) => {
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
);

const design = readJson(INPUTS.design);
const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const r01Cue = readJson(INPUTS.r01CueManifest);
const n06Blocker = readJson(INPUTS.n06Blocker);
const retailManifests = INPUTS.retailManifests.map(readJson);
const platformManifests = INPUTS.platformManifests.map(readJson);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', 'R08AA post intake is not PASS');
invariant(intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true, 'R08AA post is not accepted for autonomous engineering');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'R08AA ledger is not terminal PASS');
invariant(ledger.postSnapshot?.root === SNAPSHOT, 'R08AA ledger/post snapshot mismatch');
invariant(ledger.postSnapshot?.completeSaveSha256 === intake.packageIdentity?.completeSaveSha256, 'R08AA post identity mismatch');
invariant(sourceQa.status === 'PASS_R08AA_NORTH_SMOKE_CENTER_SEGMENT_POST_RELEASE_ACCEPTED', 'R08AA post QA is not accepted');
invariant(design.d06?.exactDesignFrozen === true, 'D06 exact design is not frozen');

const paletteById = new Map(design.d06.architecturalLanguage.palette.map((entry) => [entry.id, entry]));
for (const paletteId of ['EE-P02', 'EE-P05', 'EE-P06', 'EE-P14']) {
  invariant(paletteById.has(paletteId), `missing architectural palette role ${paletteId}`);
}

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceStates = async (cells) => {
  const result = [];
  for (const cell of cells) {
    result.push(stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return result;
};

// The five-cell cue is the only exact discovery target in the frozen design.
const cueCells = r01Cue.target.cells;
const cueDesign = design.d06.discoverySequence.exactCueCells;
invariant(cueCells.length === 5, 'R01 cue manifest no longer contains five cells');
invariant(rawCellSetSha256(cueCells) === cueDesign.cellSetSha256, 'R01 cue/design coordinate identity mismatch');
const cueStateCensus = census(await sourceStates(cueCells));
invariant(cueStateCensus['minecraft:chiseled_stone_bricks'] === 5, 'R08AA no longer contains the delivered five-cell discovery cue');

// The only exact portal-like planes are retail entrance caps. Twenty-three
// belong to already delivered tenant shells; N06 is both tenant scope and an
// explicitly excluded source-physics exception.
const shellById = new Map(design.d06.concourseAndRetail.retailShells.map((shell) => [shell.id, shell]));
const deliveredShellIds = new Set(retailManifests.flatMap((manifest) => manifest.scope.shellIds ?? []));
invariant(deliveredShellIds.size === 23, 'accepted retail manifests do not cover exactly 23 shells');
invariant(!deliveredShellIds.has('EE-R-N06'), 'N06 unexpectedly appears in a delivered retail manifest');
const entranceRecords = [];
for (const shell of shellById.values()) {
  const plane = shell.entrancePlane;
  const cells = [];
  for (let x = plane.minX; x <= plane.maxX; x += 1) cells.push({ x, y: plane.y, z: plane.z });
  invariant(cells.length === 12, `${shell.id} entrance plane is not 12 cells`);
  entranceRecords.push({
    shellId: shell.id,
    cellCount: cells.length,
    designDisposition: shell.state,
    tenantFitOutAuthorized: shell.tenantFitOutAuthorized,
    priorReleaseOwned: deliveredShellIds.has(shell.id),
    n06Excluded: shell.id === 'EE-R-N06',
    sourceStateCensus: census(await sourceStates(cells)),
  });
}
const deliveredEntranceCellCount = entranceRecords
  .filter(({ priorReleaseOwned }) => priorReleaseOwned)
  .reduce((sum, record) => sum + record.cellCount, 0);
const n06Entrance = entranceRecords.find(({ shellId }) => shellId === 'EE-R-N06');
invariant(deliveredEntranceCellCount === 276, 'delivered retail entrance count drift');
invariant(n06Entrance?.cellCount === 12, 'N06 entrance count drift');
invariant(n06Blocker.status === 'BLOCKED_N06_EXACT_DURABLE_ROLLBACK_IMPOSSIBLE_FOR_CURRENT_SOURCE', 'N06 blocker status drift');

// Platform surfaces are the largest exact architectural-looking cell family,
// but all eight surfaces are already owned by accepted fit-out releases.
const platformIds = new Set(platformManifests.map((manifest) => manifest.scope.platformId));
invariant(platformIds.size === 8, 'accepted platform manifests do not cover eight distinct platforms');
const platformRecords = [];
for (const platform of design.d06.platforms) {
  const cells = cellsIn(platform.surface.bounds);
  invariant(cells.length === platform.surface.cellCount, `${platform.id} surface count drift`);
  invariant(rawCellSetSha256(cells) === platform.surface.cellSetSha256, `${platform.id} surface identity drift`);
  invariant(platformIds.has(platform.id), `${platform.id} has no accepted fit-out manifest`);
  platformRecords.push({
    platformId: platform.id,
    cellCount: cells.length,
    priorReleaseOwned: true,
    sourceStateCensus: census(await sourceStates(cells)),
  });
}
const platformSurfaceCellCount = platformRecords.reduce((sum, record) => sum + record.cellCount, 0);
invariant(platformSurfaceCellCount === 5656, 'platform surface union count drift');

const concourse = design.d06.concourseAndRetail;
const exactConcourseTargetKeys = Object.keys(concourse).filter((key) => (
  /floor|column|portal|wayfinding/i.test(key)
  && typeof concourse[key] === 'object'
  && concourse[key] !== null
  && ('cellCount' in concourse[key] || 'cellSetSha256' in concourse[key])
));
invariant(exactConcourseTargetKeys.length === 0, 'a new exact concourse target set exists and must be compiled instead of blocked');

const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r08-monumental-concourse-discovery-scope-screen',
  generatedAtUtc: GENERATED_AT,
  status: 'BLOCKED_NO_EXACT_UNBUILT_ARCHITECTURAL_CELL_SET',
  releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  mvpScope: true,
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    intake: fileBinding(INTAKE),
    ledger: fileBinding(SOURCE_LEDGER),
    postQa: fileBinding(SOURCE_QA),
  },
  designBindings: {
    emptyEight: fileBinding(INPUTS.design),
    r01CueManifest: fileBinding(INPUTS.r01CueManifest),
    n06Blocker: fileBinding(INPUTS.n06Blocker),
    retailManifests: INPUTS.retailManifests.map(fileBinding),
    platformManifests: INPUTS.platformManifests.map(fileBinding),
  },
  hardExclusions: [
    'N06',
    'WET_OR_WATERLOGGED_CELLS',
    'GRAVITY_DEPENDENCIES',
    'SMOKE_PLANES',
    'TENANT_SCOPE',
    'MECHANISMS',
    'FUTURE_LINE_STUBS',
    'ENTITIES_BLOCK_ENTITIES_CONTAINERS',
    'PRIOR_RELEASE_CELLS',
  ],
  frozenArchitecturalFacts: {
    palette: ['EE-P02', 'EE-P05', 'EE-P06', 'EE-P14'].map((id) => paletteById.get(id)),
    perimeterMezzanineDesignY: concourse.perimeterMezzanineDesignY,
    monumentalConcourseFloorCellSet: null,
    monumentalColumnCellSet: null,
    monumentalPortalCellSet: null,
    wayfindingCellSet: null,
    exactConcourseTargetKeys,
    finding: 'The frozen palette and Y datum do not define X/Z extents, target coordinates, or a material-per-cell mapping.',
  },
  screenedCandidatesInOrder: [
    {
      rank: 1,
      candidate: 'MONUMENTAL_CONCOURSE_FLOOR_COLUMNS_PORTALS_WAYFINDING',
      conceptualScale: 'LARGEST_REQUESTED_COMPONENT',
      exactTargetCellCount: null,
      independentlyExecutableCellCount: 0,
      status: 'BLOCKED_EXACT_TARGET_CELL_SET_ABSENT',
      reason: 'No floor, column, portal, or wayfinding coordinate set exists in the accepted D06/R02 artifacts; deriving X/Z extents would invent coordinates.',
    },
    {
      rank: 2,
      candidate: 'PLATFORM_SURFACE_WAYFINDING_OVERLAY',
      exactGeometryCellCount: platformSurfaceCellCount,
      priorReleaseOwnedCellCount: platformSurfaceCellCount,
      independentlyExecutableCellCount: 0,
      status: 'EXCLUDED_ALL_CELLS_PRIOR_RELEASE_OWNED_AND_NO_WAYFINDING_MAPPING',
      platformRecords,
    },
    {
      rank: 3,
      candidate: 'GALLERIA_ENTRANCE_PORTAL_FRAMES',
      exactGeometryCellCount: 288,
      priorReleaseOwnedCellCount: deliveredEntranceCellCount,
      n06AndTenantExcludedCellCount: n06Entrance.cellCount,
      independentlyExecutableCellCount: 0,
      status: 'EXCLUDED_PRIOR_RELEASE_TENANT_AND_N06',
      entranceRecords,
    },
    {
      rank: 4,
      candidate: 'GA_J1_DISCOVERY_SEQUENCE_EXTENSION',
      planningEnvelopeCellCount: design.d06.discoverySequence.planningEnvelope.cellCount,
      planningEnvelopeIsTargetSet: false,
      exactCueCellCount: cueCells.length,
      priorReleaseOwnedCellCount: cueCells.length,
      independentlyExecutableCellCount: 0,
      status: 'EXACT_CUE_ALREADY_DELIVERED_NO_EXACT_EXTENSION_TARGET',
      cueCellSetSha256: cueDesign.cellSetSha256,
      cueSourceStateCensus: cueStateCensus,
    },
  ],
  clearance: {
    executableTargetCellCount: 0,
    blockEntityClearance: 'PASS_VACUOUS_NO_EXECUTABLE_TARGETS',
    entityClearance: 'PASS_VACUOUS_NO_EXECUTABLE_TARGETS',
    fluidClearance: 'PASS_VACUOUS_NO_EXECUTABLE_TARGETS',
    gravityClearance: 'PASS_VACUOUS_NO_EXECUTABLE_TARGETS',
    priorReleaseOverlap: 'PASS_FAIL_CLOSED_ALL_OVERLAPPING_CANDIDATES_EXCLUDED',
  },
  artifactDisposition: {
    compilerEmitted: false,
    operationFilesEmitted: false,
    releaseManifestEmitted: false,
    wrapperPrintPlanRun: false,
    wrapperPrintPlanReason: 'No legal non-empty manifest exists; sending an empty or invented package to the wrapper is prohibited.',
    liveCallsPerformed: false,
    worldMutationPerformed: false,
  },
  exactLocalBlocker: {
    code: 'R08_CONCOURSE_ARCHITECTURAL_TARGET_SET_NOT_AUTHORED',
    affectsOnly: 'remaining Empty Eight monumental-concourse/discovery architectural fit-out',
    doesNotBlock: 'other disjoint R08-R12 scopes with exact owned cell sets',
    requiredNextEvidence: [
      'Freeze a non-empty exact coordinate set for one dry concourse floor, portal, column, or wayfinding component.',
      'Bind each coordinate to one frozen palette target state and canonical owner.',
      'Prove disjointness from all prior releases, tenant shells, N06, smoke planes, mechanisms, and future interfaces.',
      'Then compile exact source-state guards and per-cell inverse from the latest accepted post snapshot.',
    ],
  },
};

const reportIdentitySha256 = sha256(JSON.stringify(payload));
const report = { ...payload, reportIdentitySha256 };
fs.mkdirSync(path.dirname(absolute(OUTPUT)), { recursive: true });
fs.writeFileSync(absolute(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# Combined Zones R08 monumental-concourse/discovery scope screen\n\n`
  + `**Status:** \`${report.status}\`  \n`
  + `**Report identity:** \`${reportIdentitySha256}\`\n\n`
  + `The accepted R08AA post was screened for the largest remaining dry, disjoint Empty Eight architectural component. No operation or release manifest was emitted.\n\n`
  + `The local blocker is exact and narrow: D06 freezes polished-andesite/red/chiseled/blue palette roles and mezzanine Y=48, but it freezes no X/Z coordinate set or material-per-cell mapping for a monumental floor, columns, portals, or wayfinding. Creating one in a release compiler would invent coordinates.\n\n`
  + `The next-largest exact candidates also fail closed:\n\n`
  + `- all ${platformSurfaceCellCount.toLocaleString('en-US')} exact platform-surface cells are owned by the eight accepted platform fit-outs;\n`
  + `- all 288 exact retail entrance-plane cells are tenant boundary: 276 belong to 23 accepted shells and the remaining 12 belong to excluded N06;\n`
  + `- the only exact discovery target is the five-cell GA-J1 cue, already present as five chiseled stone bricks from R01; the 2,448-cell discovery envelope is explicitly a planning envelope, not a target set.\n\n`
  + `No public/fire-service route, tenant opening, mechanism, future stub, or life-safety system is commissioned by this evidence. The next concrete task is to freeze one exact dry architectural cell set and palette mapping; only then can a non-empty guarded manifest, inverse, and real wrapper print-plan exist.\n\n`
  + `Machine evidence: \`${OUTPUT}\`.\n`;
fs.mkdirSync(path.dirname(absolute(MARKDOWN)), { recursive: true });
fs.writeFileSync(absolute(MARKDOWN), markdown);

process.stdout.write(`${JSON.stringify({
  status: report.status,
  output: OUTPUT,
  markdown: MARKDOWN,
  reportIdentitySha256,
  exactExecutableTargetCellCount: 0,
  candidateCount: report.screenedCandidatesInOrder.length,
  liveCallsPerformed: false,
  worldMutationPerformed: false,
}, null, 2)}\n`);
