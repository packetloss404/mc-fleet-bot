#!/usr/bin/env node
/**
 * Compile a complete-save-bound, non-executable shipwreck treatment candidate.
 *
 * The compiler partitions every cell in the exact GS-037 envelope into
 * attributed shipwreck fabric, protected packed ice, protected snow, or air.
 * It also preserves the complete modeled chest block-entity payload. It emits
 * no Minecraft command or operation and does not accept the candidate desired
 * air state, materialize loot tables, or authorize removal.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { DetailedAnvilSnapshot } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-06T04:05:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.md',
));
const INPUTS = Object.freeze({
  acceptedCompleteSaveIntake:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  completeSaveScopeClearance:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  removalAuthorization:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.json',
  protectedRelicClearance:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  releaseContract:
    'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});

const ATTRIBUTED_FABRIC_BLOCKS = new Set([
  'minecraft:chest',
  'minecraft:dark_oak_fence',
  'minecraft:dark_oak_planks',
  'minecraft:dark_oak_slab',
  'minecraft:dark_oak_stairs',
  'minecraft:spruce_fence',
  'minecraft:spruce_log',
  'minecraft:spruce_planks',
  'minecraft:spruce_slab',
  'minecraft:spruce_stairs',
  'minecraft:spruce_trapdoor',
]);
const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const EXPECTED_FABRIC_COUNTS = Object.freeze({
  'minecraft:chest': 3,
  'minecraft:dark_oak_fence': 30,
  'minecraft:dark_oak_planks': 116,
  'minecraft:dark_oak_slab': 19,
  'minecraft:dark_oak_stairs': 28,
  'minecraft:spruce_fence': 4,
  'minecraft:spruce_log': 10,
  'minecraft:spruce_planks': 219,
  'minecraft:spruce_slab': 2,
  'minecraft:spruce_stairs': 153,
  'minecraft:spruce_trapdoor': 14,
});

function absolute(filename) {
  return path.join(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalize(input) {
  if (Array.isArray(input)) return input.map(canonicalize);
  if (input && typeof input === 'object') {
    return Object.fromEntries(Object.keys(input).sort().map((key) => (
      [key, canonicalize(input[key])]
    )));
  }
  return input;
}

function canonicalJson(input) {
  return JSON.stringify(canonicalize(input));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(absolute(filename));
  return {
    path: filename,
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Shipwreck treatment contract rejected: ${message}`);
}

function baseBlockName(state) {
  return String(state).split('[', 1)[0];
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function stateHash(cells, stateField, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${cell[stateField]}\n`);
  }
  return digest.digest('hex');
}

function boundsOf(cells) {
  invariant(cells.length > 0, 'cannot compute empty bounds');
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function connectedComponents(cells) {
  const byKey = new Map(cells.map((cell) => [`${cell.x},${cell.y},${cell.z}`, cell]));
  const remaining = new Set(byKey.keys());
  const components = [];
  const directions = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const component = [];
    for (let index = 0; index < queue.length; index += 1) {
      const key = queue[index];
      const cell = byKey.get(key);
      component.push(cell);
      for (const [dx, dy, dz] of directions) {
        const neighbor = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (!remaining.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components
    .map((component) => ({
      cellCount: component.length,
      bounds: boundsOf(component),
      coordinateSetSha256: coordinateHash(component),
    }))
    .sort((left, right) => right.cellCount - left.cellCount
      || left.coordinateSetSha256.localeCompare(right.coordinateSetSha256));
}

function blockEntityProjection(entity) {
  return canonicalize(Object.fromEntries(Object.entries(entity).filter(([key]) => (
    key !== 'x' && key !== 'y' && key !== 'z'
  ))));
}

const sourceBindings = {
  acceptedCompleteSaveIntake: binding(
    INPUTS.acceptedCompleteSaveIntake,
    'accepted immutable same-moment complete-save identity and path',
  ),
  completeSaveScopeClearance: binding(
    INPUTS.completeSaveScopeClearance,
    'complete-save-bound G06 source equivalence and exact shipwreck overlap',
  ),
  removalAuthorization: binding(
    INPUTS.removalAuthorization,
    'sole-owner controlled-removal planning disposition',
  ),
  protectedRelicClearance: binding(
    INPUTS.protectedRelicClearance,
    'exact GS-037 bounds and immutable baseline census',
  ),
  releaseContract: binding(
    INPUTS.releaseContract,
    'default-deny technical, live-state, authorization, and post-state gates',
  ),
};

const intake = readJson(INPUTS.acceptedCompleteSaveIntake);
const g06 = readJson(INPUTS.completeSaveScopeClearance);
const authorization = readJson(INPUTS.removalAuthorization);
const relicEvidence = readJson(INPUTS.protectedRelicClearance);
const releaseContract = readJson(INPUTS.releaseContract);
const shipwreck = relicEvidence.relics?.find(({ key }) => key === 'shipwreck');

invariant(
  intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
  'accepted complete-save input drift',
);
invariant(
  g06.sourceBindings?.completeSave?.sha256
    === sourceBindings.acceptedCompleteSaveIntake.sha256
    && g06.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true,
  'G06 complete-save binding drift',
);
invariant(
  authorization.status === 'OWNER_POLICY_APPROVED_RELEASE_NOT_AUTHORIZED'
    && authorization.authorizationPayloadSha256 === sha256(
      `combined-zones-shipwreck-removal-authorization-v1\n${JSON.stringify(
        authorization.authorizationPayload,
      )}\n`,
    )
    && authorization.effectivePlanningDisposition?.controlledRemovalMayBeDesigned === true
    && authorization.safetyBoundary?.worldEditAuthorized === false,
  'controlled-removal authorization drift',
);
invariant(
  authorization.authorizationPayload?.relicEvidenceBinding?.fileSha256
    === sourceBindings.protectedRelicClearance.sha256,
  'authorization no longer binds the protected-relic evidence',
);
invariant(
  shipwreck?.structureId === 'minecraft:shipwreck'
    && shipwreck.declaredVolumeCellCount === 2268
    && shipwreck.observedSnapshotCensus?.presentCellCount === 1118,
  'shipwreck baseline identity drift',
);
invariant(
  releaseContract.gateDefinitions?.some(({ id }) => id === 'G13_LIVE_ENTITY_CLEARANCE')
    && releaseContract.gateDefinitions?.some(({ id }) => id === 'G14_EXPLICIT_AUTHORIZATION'),
  'release boundary drift',
);

const worldRoot = intake.input?.suppliedWorldRoot;
const regionDirectory = path.join(absolute(worldRoot), 'region');
invariant(
  worldRoot === 'data/worldsnap-combined-zones-complete-save-20260806T014133Z'
    && fs.statSync(regionDirectory).isDirectory(),
  'accepted complete-save region path drift',
);
const regionDirectoryEvidence = intake.requiredDirectories?.find(
  ({ name }) => name === 'region',
);
invariant(
  regionDirectoryEvidence?.path === `${worldRoot}/region`
    && regionDirectoryEvidence?.members?.length === 51
    && regionDirectoryEvidence.members.every(({ stableDuringAudit }) => stableDuringAudit),
  'accepted region-directory evidence drift',
);

const bounds = shipwreck.declaredInclusiveBounds;
const snapshot = new DetailedAnvilSnapshot(regionDirectory);
const envelopeCells = [];
const materialCounts = {};
for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const sourceState = await snapshot.getBlock(x, y, z);
      const block = baseBlockName(sourceState);
      materialCounts[block] = (materialCounts[block] ?? 0) + 1;
      let classification = null;
      let candidateDesiredState = null;
      if (ATTRIBUTED_FABRIC_BLOCKS.has(block)) {
        classification = 'ATTRIBUTED_SHIPWRECK_FABRIC_CANDIDATE_REMOVAL';
        candidateDesiredState = 'minecraft:air';
      } else if (block === 'minecraft:packed_ice') {
        classification = 'PRESERVE_NATIVE_PACKED_ICE';
      } else if (block === 'minecraft:snow') {
        classification = 'PRESERVE_SNOW';
      } else if (AIR_BLOCKS.has(block)) {
        classification = 'PRESERVE_AIR';
      }
      invariant(classification, `unclassified block ${sourceState} at ${x},${y},${z}`);
      envelopeCells.push({
        x,
        y,
        z,
        sourceState,
        classification,
        ...(candidateDesiredState ? { candidateDesiredState } : {}),
      });
    }
  }
}

const attributedTargets = envelopeCells.filter(
  ({ classification }) => classification
    === 'ATTRIBUTED_SHIPWRECK_FABRIC_CANDIDATE_REMOVAL',
);
const packedIce = envelopeCells.filter(
  ({ classification }) => classification === 'PRESERVE_NATIVE_PACKED_ICE',
);
const snow = envelopeCells.filter(
  ({ classification }) => classification === 'PRESERVE_SNOW',
);
const air = envelopeCells.filter(
  ({ classification }) => classification === 'PRESERVE_AIR',
);
const attributedMaterialCounts = Object.fromEntries(
  [...ATTRIBUTED_FABRIC_BLOCKS].sort().map((block) => [
    block,
    attributedTargets.filter(({ sourceState }) => baseBlockName(sourceState) === block).length,
  ]),
);

invariant(envelopeCells.length === 2268, 'envelope cell count drift');
invariant(attributedTargets.length === 598, 'attributed fabric count drift');
invariant(packedIce.length === 515, 'packed-ice preservation count drift');
invariant(snow.length === 5, 'snow preservation count drift');
invariant(air.length === 1150, 'air preservation count drift');
invariant(
  canonicalJson(attributedMaterialCounts) === canonicalJson(EXPECTED_FABRIC_COUNTS),
  'attributed fabric material census drift',
);
invariant(
  coordinateHash(envelopeCells.filter(({ sourceState }) => !AIR_BLOCKS.has(
    baseBlockName(sourceState),
  ))) === shipwreck.observedSnapshotCensus.presentCoordinateSetSha256,
  'complete-save present-cell identity drift',
);

const rawBlockEntities = (await snapshot.blockEntitiesInBox([
  bounds.minX, bounds.minY, bounds.minZ,
  bounds.maxX, bounds.maxY, bounds.maxZ,
])).sort((left, right) => Number(left.x) - Number(right.x)
  || Number(left.y) - Number(right.y)
  || Number(left.z) - Number(right.z));
invariant(rawBlockEntities.length === 3, 'shipwreck block-entity count drift');
const chestManifest = rawBlockEntities.map((entity) => {
  const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
  const target = attributedTargets.find((cell) => (
    cell.x === point.x && cell.y === point.y && cell.z === point.z
  ));
  invariant(
    entity.id === 'minecraft:chest'
      && baseBlockName(target?.sourceState) === 'minecraft:chest',
    `block entity at ${point.x},${point.y},${point.z} is not an attributed chest`,
  );
  const preservationProjection = blockEntityProjection(entity);
  const lootTableUnmaterialized = typeof entity.LootTable === 'string'
    && Array.isArray(entity.Items)
    && entity.Items.length === 0;
  invariant(lootTableUnmaterialized, `chest loot state drift at ${point.x},${point.y},${point.z}`);
  return {
    point,
    sourceBlockState: target.sourceState,
    preservationProjection,
    preservationProjectionSha256: sha256(
      `combined-zones-shipwreck-chest-projection-v1\n${canonicalJson(
        preservationProjection,
      )}\n`,
    ),
    lootTable: entity.LootTable,
    lootTableSeed: entity.LootTableSeed,
    itemRecordCount: entity.Items.length,
    lootTableUnmaterialized,
    inventoryContentsKnown: false,
    salvageReady: false,
  };
});
invariant(new Set(chestManifest.map(({ lootTable }) => lootTable)).size === 3,
  'expected three distinct shipwreck loot tables');

const targetComponents = connectedComponents(attributedTargets);
const treatmentPayload = {
  subject: {
    generatedStartSubjectId: 'GS-037',
    protectedCoreSubjectId: 'CORE-shipwreck',
    structureId: 'minecraft:shipwreck',
    bounds,
    envelopeCellCount: envelopeCells.length,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
  },
  attributionRule: {
    status: 'EXACT_MATERIAL_CLASSIFICATION_CANDIDATE_NOT_TECHNICALLY_ACCEPTED',
    rule: 'Inside the exact GS-037 bounds, only the eleven observed chest/dark-oak/spruce shipwreck palette blocks are candidate fabric. Packed ice, snow, air, and every unclassified state are default-preserve; an unexpected state fails compilation.',
    attributedBlockNames: [...ATTRIBUTED_FABRIC_BLOCKS].sort(),
    independentReviewRequired: true,
    technicalAcceptance: null,
  },
  exactEnvelopeClassification: {
    cellCount: envelopeCells.length,
    coordinateSetSha256: coordinateHash(envelopeCells),
    sourceStateSetSha256: stateHash(
      envelopeCells,
      'sourceState',
      'combined-zones-shipwreck-envelope-source-state-set-v1',
    ),
    materialCounts: Object.fromEntries(Object.entries(materialCounts).sort()),
    cells: envelopeCells,
  },
  attributedRemovalTargetCandidate: {
    accepted: false,
    cellCount: attributedTargets.length,
    bounds: boundsOf(attributedTargets),
    coordinateSetSha256: coordinateHash(attributedTargets),
    sourceStateSetSha256: stateHash(
      attributedTargets,
      'sourceState',
      'combined-zones-shipwreck-attributed-source-state-set-v1',
    ),
    materialCounts: attributedMaterialCounts,
    componentCount: targetComponents.length,
    largestComponentCellCount: targetComponents[0]?.cellCount ?? 0,
    components: targetComponents,
  },
  preservedContext: {
    acceptedPreservationRule: true,
    packedIceCellCount: packedIce.length,
    packedIceCoordinateSetSha256: coordinateHash(packedIce),
    snowCellCount: snow.length,
    snowCoordinateSetSha256: coordinateHash(snow),
    airCellCount: air.length,
    airCoordinateSetSha256: coordinateHash(air),
    unattributedCellCount: 0,
  },
  candidateDesiredPostState: {
    accepted: false,
    status: 'EXACT_ALL_AIR_CANDIDATE_STRUCTURAL_HYDROLOGY_NEIGHBOR_REVIEW_HOLD',
    cellCount: attributedTargets.length,
    desiredState: 'minecraft:air',
    coordinateSetSha256: coordinateHash(attributedTargets),
    desiredStateSetSha256: stateHash(
      attributedTargets,
      'candidateDesiredState',
      'combined-zones-shipwreck-candidate-desired-state-set-v1',
    ),
    qualification: 'This is a complete candidate mapping, not an accepted terrain, support, hydrology, gravity, lighting, drainage, or neighbor-update design.',
  },
  chestSalvageContract: {
    accepted: false,
    chestCount: chestManifest.length,
    lootTableUnmaterializedCount: chestManifest.filter(
      ({ lootTableUnmaterialized }) => lootTableUnmaterialized,
    ).length,
    knownInventoryContentCount: chestManifest.filter(
      ({ inventoryContentsKnown }) => inventoryContentsKnown,
    ).length,
    exactControlledDestination: null,
    requiredSequence: [
      'fresh live gate and exact source-state revalidation',
      'materialize and inventory each bound loot-table chest without destroying it',
      'bind exact item manifests and one accepted controlled salvage destination',
      'prove destination capacity, custody, insertion success, source empty state, and rollback handling',
      'only then may a separately authorized operation package target a chest block',
    ],
    chests: chestManifest,
  },
  rollbackSourceProjection: {
    acceptedAsOperation: false,
    sourceCellCount: attributedTargets.length,
    sourceStateSetSha256: stateHash(
      attributedTargets,
      'sourceState',
      'combined-zones-shipwreck-attributed-source-state-set-v1',
    ),
    chestProjectionCount: chestManifest.length,
    chestProjectionSetSha256: sha256(
      `combined-zones-shipwreck-chest-projection-set-v1\n${canonicalJson(
        chestManifest.map(({ point, preservationProjection }) => ({
          point,
          preservationProjection,
        })),
      )}\n`,
    ),
    exactRollbackOperation: null,
  },
  remainingTechnicalHolds: [
    'independent acceptance of the 598-cell material-attribution candidate',
    'accepted structural, support, gravity, lighting, hydrology, drainage, and neighbor-update review of the all-air candidate',
    'materialization and exact inventory of all three loot-table chests plus one accepted controlled salvage destination',
    'accepted demolition influence, staging, access, settlement, erosion, positive margins, ownership, and interfaces',
    'fresh entity and POI clearance, guarded forward and exact inverse rollback compilation, independent preflight, and one later release authorization',
  ],
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-shipwreck-treatment-contract',
  generatedAtUtc: GENERATED_AT,
  status:
    'PARTIAL_PASS_EXACT_598_FABRIC_TARGET_CANDIDATE_AND_AIR_MAPPING_THREE_LOOT_CHESTS_UNMATERIALIZED_TECHNICAL_AND_RELEASE_HOLD',
  purpose: 'Advance the controlled-removal design with an exact complete-save-bound partition, target candidate, desired-state candidate, and chest preservation contract without producing an operation or claiming technical acceptance.',
  sourceBindings,
  treatmentPayload,
  disposition: {
    completeSaveBound: true,
    exactEnvelopePartitioned: true,
    exactAttributionCandidateCompiled: true,
    attributionTechnicallyAccepted: false,
    exactCandidateDesiredStateCompiled: true,
    candidateDesiredStateTechnicallyAccepted: false,
    allChestSourceProjectionsCaptured: true,
    chestContentsMaterialized: false,
    chestSalvageDestinationAccepted: false,
    technicalTreatmentAccepted: false,
    operationCompilationAuthorized: false,
  },
  safetyBoundary: {
    acceptedRemovalTargetCellCount: 0,
    acceptedDesiredStateCellCount: 0,
    operationCellCount: 0,
    blockEditCount: 0,
    inventoryMoveCount: 0,
    serverStarted: false,
    liveWorldContacted: false,
    physicalReleaseAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.treatmentPayloadSha256 = sha256(
  `combined-zones-shipwreck-treatment-payload-v1\n${JSON.stringify(treatmentPayload)}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-shipwreck-treatment-report-v1\n${JSON.stringify({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    treatmentPayloadSha256: report.treatmentPayloadSha256,
    disposition: report.disposition,
    safetyBoundary: report.safetyBoundary,
  })}\n`,
);

const markdown = `# Combined Zones Phase 1 shipwreck treatment contract\n\n`
  + `Generated: ${GENERATED_AT}\n\n`
  + `Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**\n\n`
  + `The exact GS-037 envelope is partitioned from the accepted complete save. The compiler classifies **${attributedTargets.length.toLocaleString('en-US')}** chest/dark-oak/spruce cells as the shipwreck-fabric removal candidate, while preserving **${packedIce.length.toLocaleString('en-US')} packed-ice**, **${snow.length.toLocaleString('en-US')} snow**, and **${air.length.toLocaleString('en-US')} air** cells. Unexpected material fails closed.\n\n`
  + `## Candidate treatment\n\n`
  + `Every attributed candidate cell has a source-exact state and a candidate desired state of air. The mapping is complete but **not technically accepted**; it still needs structural, support, gravity, lighting, hydrology, drainage, and neighbor-update review. No removal cell or desired state is accepted.\n\n`
  + `- Candidate target cells: **${attributedTargets.length.toLocaleString('en-US')}**\n`
  + `- Candidate target coordinate SHA-256: \`${treatmentPayload.attributedRemovalTargetCandidate.coordinateSetSha256}\`\n`
  + `- Candidate desired-state SHA-256: \`${treatmentPayload.candidateDesiredPostState.desiredStateSetSha256}\`\n`
  + `- Attributed six-connected components: **${targetComponents.length}**; largest **${(targetComponents[0]?.cellCount ?? 0).toLocaleString('en-US')} cells**\n\n`
  + `## Chest salvage hold\n\n`
  + `All three exact chest block-entity projections are preserved. Each chest still carries an unmaterialized shipwreck loot table with zero concrete item records, so the current save does **not** establish the inventory contents and cannot support destructive removal. A later fresh gate must materialize and inventory each chest, bind a controlled destination, and prove custody/capacity/transfer/rollback before any chest block can enter an authorized operation.\n\n`
  + `${chestManifest.map((chest) => `- \`${chest.point.x},${chest.point.y},${chest.point.z}\` — \`${chest.lootTable}\` — projection \`${chest.preservationProjectionSha256}\``).join('\n')}\n\n`
  + `## Remaining holds\n\n`
  + `${treatmentPayload.remainingTechnicalHolds.map((hold) => `- ${hold}`).join('\n')}\n\n`
  + `No server was started, no live world was contacted, no inventory was moved, and no command or operation was generated.\n\n`
  + `Treatment payload SHA-256: \`${report.treatmentPayloadSha256}\`\n\n`
  + `Report identity SHA-256: \`${report.reportIdentitySha256}\`\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  envelopeCellCount: envelopeCells.length,
  attributedTargetCandidateCellCount: attributedTargets.length,
  packedIcePreservedCellCount: packedIce.length,
  snowPreservedCellCount: snow.length,
  chestCount: chestManifest.length,
  knownInventoryContentCount:
    treatmentPayload.chestSalvageContract.knownInventoryContentCount,
  operationCellCount: report.safetyBoundary.operationCellCount,
  treatmentPayloadSha256: report.treatmentPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2)}\n`);
