#!/usr/bin/env node
/**
 * Read-only post-release QA for CZ-R07B P1-B03 viaduct support bents.
 *
 * Re-derives the 26 selected bents from the frozen B03 centreline and the
 * immutable execution source, proves the guarded operation pair is its exact
 * representation and inverse, then verifies all 11,758 post cells, 26
 * connected bent components, 261 tube attachments, and 208 unchanged stable
 * foundation contacts.  The terminal execution ledger, evidence bindings,
 * source/post complete saves, strict execution, rollback preflight, and
 * completed release identity are sealed into the result.
 *
 * No live service is contacted and no world state is mutated.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  compareCells,
  hashCells,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:30:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07b-live-20260821T161500Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07b-post-20260821T161500Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07b-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07b-post-release-qa.md'),
);
const B03_GEOMETRY_PATH =
  'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';
const TARGET_STATE = 'minecraft:stone_bricks';
const TUBE_STATE = 'minecraft:polished_diorite';
const SAFE_TRANSIENT_STATE = 'minecraft:snow[layers=1]';
const MIN_WORLD_Y = -64;
const EXPECTED = Object.freeze({
  manifestIdentity:
    'fb5fab99755da2ab8967e7b4c448ced19b660ea2da3bbdd15d049338ae43891a',
  targetCellCount: 11758,
  targetSha256:
    'd30393d3db6a00c91bf86ddbc9ec6f5ae0ffdc13dbf8538f7eaf5c9a7ae3f85a',
  beamCellCount: 364,
  beamSha256:
    '41a989772655b1c203f69d7f878be4077841a5507213659f603abdfa7a2206e9',
  legCellCount: 11394,
  legSha256:
    '3334da0d780c16b2b73245cfca730d674359fd40c770769fc80c36980d26462a',
  foundationCellCount: 208,
  foundationSha256:
    '852a562a96e477d7cb30cca6c36698c330bca96b3b9e9599fc554ed75a618f31',
  operationCount: 476,
  bentCount: 26,
  componentCount: 26,
  largestComponentCellCount: 636,
  componentSetSha256:
    '1db0a01768d1103b1fa0f8706e28eb603ce0a136ce3fd6c081d5313413bd1082',
  tubeAttachmentCellCount: 261,
  tubeAttachmentSha256:
    '2b4eb6c16bac03bff20b3f3ce2f5cdf61cf8bfc16574984384f09e575f0f7d26',
  selectedAnchorIndices: [
    196, 212, 228, 244, 260, 276, 292, 308, 324, 340, 356, 372, 388,
    404, 420, 436, 452, 460, 468, 500, 516, 532, 548, 564, 580, 596,
  ],
  excludedAnchorIndices: [484],
});

const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const STABLE_FOUNDATION_BLOCKS = new Set([
  'minecraft:stone', 'minecraft:smooth_stone', 'minecraft:polished_diorite',
  'minecraft:stone_bricks', 'minecraft:grass_block', 'minecraft:dirt',
  'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:deepslate',
  'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite',
  'minecraft:tuff', 'minecraft:calcite', 'minecraft:snow_block',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07B post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isReplaceable = (state) => (
  AIR_BLOCKS.has(blockName(state))
  || state === SAFE_TRANSIENT_STATE
  || state === TARGET_STATE
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records, field = 'state') => {
  const counts = new Map();
  for (const record of records) {
    const state = record[field];
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};

function parseOperations(filename) {
  const operations = [];
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename} contains an invalid coordinate`);
    const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = coordinates;
    const operation = {
      from: { x: rawX1, y: rawY1, z: rawZ1 },
      to: { x: rawX2, y: rawY2, z: rawZ2 },
      fromState: fields[7],
      toState: fields[8],
    };
    operations.push(operation);
    for (let x = Math.min(rawX1, rawX2); x <= Math.max(rawX1, rawX2); x += 1) {
      for (let y = Math.min(rawY1, rawY2); y <= Math.max(rawY1, rawY2); y += 1) {
        for (let z = Math.min(rawZ1, rawZ2); z <= Math.max(rawZ1, rawZ2); z += 1) {
          const key = `${x},${y},${z}`;
          invariant(!cells.has(key), `${filename} repeats target ${key}`);
          cells.set(key, {
            cell: { x, y, z },
            fromState: fields[7],
            toState: fields[8],
          });
        }
      }
    }
  }
  return { operations, cells };
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length
    || cellKey(left[0]).localeCompare(cellKey(right[0])));
  return {
    components,
    manifest: {
      componentCount: components.length,
      largestComponentCellCount: components[0]?.length ?? 0,
      componentSetSha256: sha256(components
        .map((component) => `${component.length}:${hashCells(component)}`)
        .sort()
        .join('\n')),
    },
  };
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return sha256(body);
}

function executionEvidence(filename, expectedCount, expectedFileSha256) {
  const report = readJson(filename);
  const passed = report.schemaVersion === 3
    && report.status === 'complete'
    && report.dryRun === false
    && report.strictNoop === true
    && report.operationRole === 'forward'
    && report.operationSha256 === expectedFileSha256
    && report.sourceOperationCount === expectedCount
    && report.sourceGroupCount === expectedCount
    && report.successfulGroups === expectedCount
    && report.failedGroups === 0
    && report.successfulCommands === expectedCount
    && report.failedCommands === 0
    && report.noopCommands === 0
    && report.unexpectedNoopCommands === 0
    && report.unknownReplyCommands === 0
    && report.worldEditLeftoverCount === 0
    && report.forceLoadAudit?.allTemporaryReleased === true
    && report.forceLoadAudit?.finalSetMatchesPreExistingSet === true;
  return {
    ...fileBinding(filename),
    status: report.status,
    strictNoop: report.strictNoop,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    noopCommands: report.noopCommands,
    worldEditLeftoverCount: report.worldEditLeftoverCount,
    streamJournalSha256: report.streamJournalSha256,
    allTemporaryChunksReleased: report.forceLoadAudit?.allTemporaryReleased ?? false,
    passed,
  };
}

function rollbackEvidence(filename, expectedCount, postRegionSha256) {
  const report = readJson(filename);
  const passed = report.status === 'PASS'
    && report.operationCount === expectedCount
    && report.passed === expectedCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256;
  return {
    ...fileBinding(filename),
    status: report.status,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    passed,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const b03 = readJson(B03_GEOMETRY_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope does not match the release manifest');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger release-manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'release-manifest payload identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post-snapshot/intake binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'post complete-save intake is not the ledger-bound PASS save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'post region identity binding drifted');
invariant(fs.existsSync(absolute(path.join(POST_ROOT, 'region'))),
'post snapshot region directory is missing');

const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity?.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256,
'ledger source complete-save intake binding drifted');
invariant(fs.existsSync(absolute(path.join(ledger.sourceSnapshot.root, 'region'))),
'source snapshot region directory is missing');

const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(evidenceBindingFailures.length === 0,
'one or more terminal evidence bindings drifted');
const recomputedSourceBoundReleaseIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: readJson(ledger.sourceSnapshot.identity.path).sha256,
}));
invariant(ledger.sourceBoundReleaseIdentitySha256
  === recomputedSourceBoundReleaseIdentity,
'source-bound release identity drifted');
const recomputedCompletedReleaseIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({
      path: reportPath,
      sha256: reportSha256,
    }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(ledger.completedReleaseIdentitySha256
  === recomputedCompletedReleaseIdentity,
'completed release identity drifted');

const packageDefinition = manifest.packages.find(
  ({ key }) => key === 'b03-viaduct-bents',
);
invariant(packageDefinition, 'manifest is missing the viaduct-bents package');
const forward = parseOperations(packageDefinition.forward);
const rollback = parseOperations(packageDefinition.rollback);
invariant(forward.operations.length === EXPECTED.operationCount
  && rollback.operations.length === EXPECTED.operationCount,
'operation group count drifted');
invariant(forward.cells.size === EXPECTED.targetCellCount
  && rollback.cells.size === EXPECTED.targetCellCount,
'expanded operation target count drifted');
for (const [key, transition] of forward.cells) {
  const inverse = rollback.cells.get(key);
  invariant(inverse
    && inverse.fromState === transition.toState
    && inverse.toState === transition.fromState,
  `rollback is not the exact inverse at ${key}`);
}
invariant(operationBodySha256(packageDefinition.forward)
  === manifest.operations['b03-viaduct-bents'].forwardSha256
  && operationBodySha256(packageDefinition.rollback)
    === manifest.operations['b03-viaduct-bents'].rollbackSha256,
'operation body identity drifted');

const sourceReader = new AnvilReader(
  absolute(path.join(ledger.sourceSnapshot.root, 'region')),
);
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const candidateAnchorIndices = [];
for (let index = 196; index <= 596; index += 16) candidateAnchorIndices.push(index);
candidateAnchorIndices.push(460);
candidateAnchorIndices.sort((left, right) => left - right);
const selectedBents = [];
const excludedBents = [];

for (const anchorIndex of candidateAnchorIndices) {
  const anchor = b03.design.centerline.points.find(({ index }) => index === anchorIndex);
  invariant(anchor, `missing B03 centreline anchor ${anchorIndex}`);
  const eastWest = anchor.tangent === 'EAST' || anchor.tangent === 'WEST';
  invariant(eastWest || anchor.tangent === 'NORTH',
    `unsupported tangent at B03 anchor ${anchorIndex}`);
  const tangent = eastWest ? { x: 1, z: 0 } : { x: 0, z: 1 };
  const cross = eastWest ? { x: 0, z: 1 } : { x: 1, z: 0 };
  const beam = [];
  const legs = [];
  const foundations = [];
  const exclusions = [];

  for (let thickness = 0; thickness <= 1; thickness += 1) {
    for (let lateral = -3; lateral <= 3; lateral += 1) {
      const cell = {
        x: anchor.x + tangent.x * thickness + cross.x * lateral,
        y: anchor.y - 2,
        z: anchor.z + tangent.z * thickness + cross.z * lateral,
      };
      const state = stateToCommandString(
        await sourceReader.blockState(cell.x, cell.y, cell.z),
      );
      if (!isReplaceable(state)) exclusions.push({ cell, state, role: 'beam' });
      beam.push(cell);
    }
  }
  for (let thickness = 0; thickness <= 1; thickness += 1) {
    for (const lateral of [-3, -2, 2, 3]) {
      const column = [];
      let foundation = null;
      for (let y = anchor.y - 3; y >= MIN_WORLD_Y; y -= 1) {
        const cell = {
          x: anchor.x + tangent.x * thickness + cross.x * lateral,
          y,
          z: anchor.z + tangent.z * thickness + cross.z * lateral,
        };
        const state = stateToCommandString(
          await sourceReader.blockState(cell.x, cell.y, cell.z),
        );
        if (isReplaceable(state)) {
          column.push(cell);
        } else {
          foundation = { cell, state };
          break;
        }
      }
      invariant(foundation, `anchor ${anchorIndex} has no foundation`);
      if (!STABLE_FOUNDATION_BLOCKS.has(blockName(foundation.state))) {
        exclusions.push({ ...foundation, role: 'foundation' });
      }
      legs.push(...column);
      foundations.push(foundation);
    }
  }
  if (exclusions.length) {
    excludedBents.push({ anchorIndex, exclusions });
  } else {
    selectedBents.push({
      anchorIndex,
      beam: uniqueCells(beam),
      legs: uniqueCells(legs),
      foundations,
    });
  }
}

invariant(selectedBents.map(({ anchorIndex }) => anchorIndex).join(',')
  === EXPECTED.selectedAnchorIndices.join(','),
'source-derived selected bent indices drifted');
invariant(excludedBents.map(({ anchorIndex }) => anchorIndex).join(',')
  === EXPECTED.excludedAnchorIndices.join(','),
'source-derived excluded bent indices drifted');
const beamCells = uniqueCells(selectedBents.flatMap(({ beam }) => beam));
const legCells = uniqueCells(selectedBents.flatMap(({ legs }) => legs));
const designCells = uniqueCells([...beamCells, ...legCells]);
const foundationRecords = selectedBents.flatMap(({ foundations }) => foundations);
const foundationCells = foundationRecords.map(({ cell }) => cell);
const designIdentity = classManifest(designCells);
const beamIdentity = classManifest(beamCells);
const legIdentity = classManifest(legCells);
const foundationIdentity = classManifest(foundationCells);
invariant(designIdentity.cellCount === EXPECTED.targetCellCount
  && designIdentity.coordinateSetSha256 === EXPECTED.targetSha256
  && beamIdentity.cellCount === EXPECTED.beamCellCount
  && beamIdentity.coordinateSetSha256 === EXPECTED.beamSha256
  && legIdentity.cellCount === EXPECTED.legCellCount
  && legIdentity.coordinateSetSha256 === EXPECTED.legSha256
  && foundationIdentity.cellCount === EXPECTED.foundationCellCount
  && foundationIdentity.coordinateSetSha256 === EXPECTED.foundationSha256,
'source-derived support geometry identity drifted');
invariant(hashCells([...forward.cells.values()].map(({ cell }) => cell))
  === designIdentity.coordinateSetSha256,
'guarded operations do not exactly equal the source-derived support geometry');

const sourceTransitionMismatches = [];
const postStateRecords = [];
for (const [key, transition] of forward.cells) {
  const sourceState = stateToCommandString(await sourceReader.blockState(
    transition.cell.x,
    transition.cell.y,
    transition.cell.z,
  ));
  if (sourceState !== transition.fromState) {
    sourceTransitionMismatches.push({ key, expected: transition.fromState, state: sourceState });
  }
  postStateRecords.push({
    cell: transition.cell,
    state: stateToCommandString(await postReader.blockState(
      transition.cell.x,
      transition.cell.y,
      transition.cell.z,
    )),
  });
}
const postStateMismatches = postStateRecords.filter(({ state }) => state !== TARGET_STATE);

const foundationPostMismatches = [];
for (const foundation of foundationRecords) {
  const postState = stateToCommandString(await postReader.blockState(
    foundation.cell.x,
    foundation.cell.y,
    foundation.cell.z,
  ));
  if (postState !== foundation.state) {
    foundationPostMismatches.push({ ...foundation, postState });
  }
}

const connectivity = connectedComponents(designCells);
const tubeAttachmentCells = [];
for (const cell of beamCells) {
  const above = stateToCommandString(await postReader.blockState(cell.x, cell.y + 1, cell.z));
  if (above === TUBE_STATE) tubeAttachmentCells.push(cell);
}
const tubeAttachmentIdentity = classManifest(tubeAttachmentCells);
const tubeAttachmentKeys = new Set(tubeAttachmentCells.map(cellKey));
const attachedComponentCount = connectivity.components.filter((component) => (
  component.some((cell) => tubeAttachmentKeys.has(cellKey(cell)))
)).length;

const execution = executionEvidence(
  path.join(EVIDENCE_DIR, 'b03-viaduct-bents.forward-execution.json'),
  EXPECTED.operationCount,
  ledger.packages[0].forward.sha256,
);
const rollbackPoststate = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'b03-viaduct-bents.rollback-poststate-preflight.json'),
  EXPECTED.operationCount,
  postIdentity.sha256,
);
const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');

const checks = [];
const check = (id, passed, detail) => checks.push({
  id,
  status: passed ? 'PASS' : 'FAIL',
  detail,
});
check('R07B-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} ledger stages PASS.`);
check('R07B-QA-02-RELEASE-IDENTITY-BOUND',
  ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity
    && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity,
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07B-QA-03-MANIFEST-AND-EVIDENCE-SEALED',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && evidenceBindingFailures.length === 0,
  `Manifest ${manifest.manifestIdentity}; ${ledger.evidenceBindings.length} terminal evidence bindings intact.`);
check('R07B-QA-04-COMPLETE-SAVES-BOUND',
  sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  `Source ${ledger.sourceSnapshot.completeSaveSha256}; post ${ledger.postSnapshot.completeSaveSha256}.`);
check('R07B-QA-05-GEOMETRY-REPRODUCED',
  designIdentity.cellCount === EXPECTED.targetCellCount
    && designIdentity.coordinateSetSha256 === EXPECTED.targetSha256
    && selectedBents.length === EXPECTED.bentCount,
  `${selectedBents.length} bents; ${designIdentity.cellCount} exact source-derived cells.`);
check('R07B-QA-06-EXACT-SOURCE-TRANSITIONS',
  sourceTransitionMismatches.length === 0,
  `${EXPECTED.targetCellCount - sourceTransitionMismatches.length}/${EXPECTED.targetCellCount} source cells match exact guards.`);
check('R07B-QA-07-EXACT-POST-STATES',
  postStateMismatches.length === 0
    && postStateRecords.length === EXPECTED.targetCellCount,
  `${postStateRecords.length - postStateMismatches.length}/${postStateRecords.length} exact ${TARGET_STATE} cells.`);
check('R07B-QA-08-BENT-CONNECTIVITY',
  connectivity.manifest.componentCount === EXPECTED.componentCount
    && connectivity.manifest.largestComponentCellCount
      === EXPECTED.largestComponentCellCount
    && connectivity.manifest.componentSetSha256 === EXPECTED.componentSetSha256,
  `${connectivity.manifest.componentCount} connected bents; largest ${connectivity.manifest.largestComponentCellCount} cells.`);
check('R07B-QA-09-TUBE-ATTACHMENTS',
  tubeAttachmentIdentity.cellCount === EXPECTED.tubeAttachmentCellCount
    && tubeAttachmentIdentity.coordinateSetSha256 === EXPECTED.tubeAttachmentSha256
    && attachedComponentCount === EXPECTED.componentCount,
  `${tubeAttachmentIdentity.cellCount} exact tube-contact cells across ${attachedComponentCount} bents.`);
check('R07B-QA-10-STABLE-FOUNDATIONS',
  foundationPostMismatches.length === 0
    && foundationRecords.length === EXPECTED.foundationCellCount,
  `${foundationRecords.length - foundationPostMismatches.length}/${foundationRecords.length} foundation contacts preserved.`);
check('R07B-QA-11-STRICT-EXECUTION',
  execution.passed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups succeeded; ${execution.noopCommands} no-op.`);
check('R07B-QA-12-ROLLBACK-POSTSTATE',
  rollbackPoststate.passed,
  `${rollbackPoststate.passedGuards}/${EXPECTED.operationCount} rollback guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07b-b03-viaduct-bents-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07B_B03_VIADUCT_BENTS_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07B_B03_VIADUCT_BENTS_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: readJson(ledger.sourceSnapshot.identity.path).sha256,
      intake: sourceIntakeBinding,
      regionIdentity: fileBinding(ledger.sourceSnapshot.identity.path),
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
    },
    terminalEvidenceBindingCount: ledger.evidenceBindings.length,
    terminalEvidenceBindingFailureCount: evidenceBindingFailures.length,
  },
  executionEvidence: {
    package: execution,
    rollbackPoststatePreflight: rollbackPoststate,
    strictSuccessfulGroupCount: execution.successfulGroups,
    strictFailedGroupCount: execution.failedGroups,
    strictNoopCount: execution.noopCommands,
  },
  geometry: {
    candidateAnchorIndices,
    selectedAnchorIndices: selectedBents.map(({ anchorIndex }) => anchorIndex),
    excludedCandidates: excludedBents,
    beam: beamIdentity,
    pairedLegs: legIdentity,
    completeSupportSet: designIdentity,
    foundationContacts: {
      ...foundationIdentity,
      sourceStateCensus: stateCensus(foundationRecords),
    },
    connectivity: connectivity.manifest,
    tubeAttachments: {
      ...tubeAttachmentIdentity,
      attachedComponentCount,
      everyBentAttached: attachedComponentCount === EXPECTED.componentCount,
    },
  },
  stateTransition: {
    sourceStateCensus: stateCensus([...forward.cells.values()], 'fromState'),
    sourceMatchingCellCount: EXPECTED.targetCellCount - sourceTransitionMismatches.length,
    sourceMismatchCellCount: sourceTransitionMismatches.length,
    listedSourceMismatches: sourceTransitionMismatches.slice(0, 100),
    expectedPostState: TARGET_STATE,
    postStateCensus: stateCensus(postStateRecords),
    postMatchingCellCount: postStateRecords.length - postStateMismatches.length,
    postMismatchCellCount: postStateMismatches.length,
    listedPostMismatches: postStateMismatches.slice(0, 100),
    rollbackExactInverse: true,
  },
  foundations: {
    matchingCellCount: foundationRecords.length - foundationPostMismatches.length,
    mismatchCellCount: foundationPostMismatches.length,
    listedMismatches: foundationPostMismatches.slice(0, 100),
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    bentCount: selectedBents.length,
    stoneBrickCellCount: postStateRecords.filter(({ state }) => state === TARGET_STATE).length,
    supportComponentCount: connectivity.manifest.componentCount,
    tubeAttachmentCellCount: tubeAttachmentIdentity.cellCount,
    stableFoundationContactCount:
      foundationRecords.length - foundationPostMismatches.length,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R07B B03 viaduct support-bent post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact support state | ${report.summary.stoneBrickCellCount.toLocaleString()} / ${EXPECTED.targetCellCount.toLocaleString()} \`${TARGET_STATE}\` |
| Bent connectivity | ${report.summary.supportComponentCount} / ${EXPECTED.componentCount} independent connected bents |
| Tube attachment | ${report.summary.tubeAttachmentCellCount} exact contacts across ${attachedComponentCount} bents |
| Stable foundation contact | ${report.summary.stableFoundationContactCount} / ${EXPECTED.foundationCellCount} preserved |
| Strict execution | ${execution.successfulGroups} succeeded / ${execution.failedGroups} failed / ${execution.noopCommands} no-op |
| Rollback post-state | ${rollbackPoststate.passedGuards} / ${EXPECTED.operationCount} guards PASS |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

This verifier read only the sealed source/post Anvil saves and hash-bound
evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  exactStoneBricks: `${report.summary.stoneBrickCellCount}/${EXPECTED.targetCellCount}`,
  connectedBents: `${report.summary.supportComponentCount}/${EXPECTED.componentCount}`,
  tubeAttachments: report.summary.tubeAttachmentCellCount,
  stableFoundations:
    `${report.summary.stableFoundationContactCount}/${EXPECTED.foundationCellCount}`,
  rollbackGuards: `${rollbackPoststate.passedGuards}/${EXPECTED.operationCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
