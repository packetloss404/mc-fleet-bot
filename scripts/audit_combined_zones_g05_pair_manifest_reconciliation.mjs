#!/usr/bin/env node
/**
 * Reconcile null transition-pair fields in the Combined Zones G05 registry.
 *
 * This is an additive, offline audit. It proves one existing D06 alias and
 * distinguishes face adjacency from terminal, shared-boundary, precedence,
 * and undefined-endpoint records. It never edits the canonical registry and
 * never fabricates a transition-pair manifest for a non-adjacency geometry.
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

const GENERATED_AT = value('--generated-at', '2026-08-06T21:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.md',
));

const INPUTS = Object.freeze({
  registry:
    'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  detailedD06:
    'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  globalGeometry:
    'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
  completeSave:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
});

const REGISTRY_CELL_PREAMBLE = 'combined-zones-phase1-proposed-owner-cell-set-v1';
const REGISTRY_PAIR_PREAMBLE = 'combined-zones-phase1-directional-interface-pairs-v1';
const D06_LIFE_SAFETY_CELL_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const ALIAS_CONTRACT_ID = 'IF-D06-FIRE-SPINE-TO-EG-B';
const LOCAL_CANONICAL_CONTRACT_ID = 'IF-D06-ADJ-03';
const GLOBAL_CANONICAL_CONTRACT_ID = 'IF-G04-GLOBAL-EXPANDED-ADJ-29';

const PRECEDENCE_CONTRACT_IDS = new Set([
  'IF-D05-B08-TO-B09-PORTAL',
  'IF-D05-B09-TO-B10-MOUNTAIN',
  'IF-P1-B12-EAST-CAP-HOUSTON-CLOSED',
  'IF-P1-B12-WEST-UTILITY-ENDPOINT-CLOSED',
  'IF-P1-B12-EAST-UTILITY-ENDPOINT-CLOSED',
  'IF-P1-B11-INFLUENCE-TO-HOUSTON',
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Combined Zones G05 pair reconciliation rejected: ${message}`);
  }
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const bytes = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: sha256(bytes),
    role,
  };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  return [...new Map(cells.map((cell) => [cellKey(cell), {
    x: cell.x,
    y: cell.y,
    z: cell.z,
  }])).values()].sort(compareCells);
}

function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function boundsOf(cells) {
  if (!cells.length) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function cellHash(cells, preamble = REGISTRY_CELL_PREAMBLE) {
  const exact = uniqueCells(cells);
  const records = exact.map(cellKey).join('\n');
  return sha256(`${preamble}\n${records}${records ? '\n' : ''}`);
}

function pairHash(pairs) {
  const ordered = [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ));
  const digest = crypto.createHash('sha256').update(`${REGISTRY_PAIR_PREAMBLE}\n`);
  for (const pair of ordered) {
    digest.update(`${cellKey(pair.from)}>${cellKey(pair.to)}\n`);
  }
  return digest.digest('hex');
}

function findContract(contracts, contractId) {
  const matches = contracts.filter((contract) => contract.contractId === contractId);
  invariant(matches.length === 1, `expected one contract ${contractId}, found ${matches.length}`);
  return matches[0];
}

function categoryFor(contract) {
  if (contract.contractId === ALIAS_CONTRACT_ID) return 'CANONICAL_ADJACENCY_ALIAS';
  if (contract.interfaceCellSet === null) return 'UNDEFINED_ENDPOINT';
  if (contract.relationship === 'EXACT_COLLECTION_INLET_DEFAULT_CLOSED_NO_FLOW_CREDIT') {
    return 'SHARED_BOUNDARY';
  }
  if (PRECEDENCE_CONTRACT_IDS.has(contract.contractId)) return 'PRECEDENCE_OR_RESERVATION';
  return 'TERMINAL_CAP';
}

function dispositionFor(category) {
  if (category === 'CANONICAL_ADJACENCY_ALIAS') {
    return {
      pairManifestDisposition:
        'REFERENCE_EXISTING_CANONICAL_ADJACENCY_DO_NOT_CREATE_SECOND_MANIFEST',
      exactRemainingInput:
        'Complete-save-bound before states, accepted designed future states, and owner/interface acceptance remain required; alias reconciliation is not acceptance.',
    };
  }
  if (category === 'TERMINAL_CAP') {
    return {
      pairManifestDisposition:
        'PAIR_NOT_APPLICABLE_TO_CURRENT_ONE_SIDED_TERMINAL_OR_SOURCE_CAP',
      exactRemainingInput:
        'Record an explicit reviewed one-sided terminal disposition, or supply a named external counterpart and exact counterpart face if an opening is intended; then bind before/future states and acceptance.',
    };
  }
  if (category === 'SHARED_BOUNDARY') {
    return {
      pairManifestDisposition:
        'PAIR_NOT_APPLICABLE_TO_CURRENT_SHARED_BOUNDARY_CELL_SET',
      exactRemainingInput:
        'Bind upstream/downstream before and future states, hydraulic/storage/receiver evidence, and both owner acceptances; the inlet remains sealed with no flow credit.',
    };
  }
  if (category === 'PRECEDENCE_OR_RESERVATION') {
    return {
      pairManifestDisposition:
        'PAIR_NOT_APPLICABLE_TO_CURRENT_SAME_COORDINATE_PRECEDENCE_OR_PLANNING_RESERVATION',
      exactRemainingInput:
        'Accept the exact canonical precedence/coordination rule and bind any materialized before/future states; no transfer or opening may be inferred from overlap.',
    };
  }
  return {
    pairManifestDisposition:
      'PAIR_REQUIREMENT_UNDETERMINED_UNTIL_EXACT_ENDPOINT_GEOMETRY_EXISTS',
    exactRemainingInput:
      'Supply exact source and counterpart endpoint geometry, a named canonical counterpart/receiver/source owner, choose the reviewed geometry kind, and bind before/future states plus acceptance.',
  };
}

function renderMarkdown(report) {
  const counts = report.reconciliation.classificationCounts;
  return `# Combined Zones Phase 1 G05 pair-manifest reconciliation audit

**Status:** ${report.status}
**Generated:** ${report.generatedAtUtc}
**Report identity:** \`${report.reportIdentitySha256}\`

## Result

The canonical registry has ${report.reconciliation.nullTransitionPairFieldCount} null transition-pair fields. This audit proves one existing canonical adjacency alias and classifies every other field without fabricating a pair manifest:

| Classification | Count | Disposition |
|---|---:|---|
| Canonical adjacency alias | ${counts.canonicalAdjacencyAlias} | Reuse the existing exact 35-pair D06 adjacency; do not create or count a duplicate physical seam. |
| Terminal/source cap | ${counts.terminalCap} | A one-sided cap is not a two-cell face pair. Retain the terminal/counterpart HOLD. |
| Shared boundary | ${counts.sharedBoundary} | The exact inlet cells are a shared-boundary set, not a fabricated face adjacency. |
| Precedence/reservation | ${counts.precedenceOrReservation} | Same-coordinate precedence and planning reservations require exact cell sets, not transition pairs. |
| Undefined endpoint | ${counts.undefinedEndpoint} | Geometry kind and pair requirement remain unknown until exact endpoints and counterparts exist. |

The D06 source cap \`${report.reconciliation.canonicalAlias.aliasContractId}\` is exactly the X=1849 side of ${report.reconciliation.canonicalAlias.transitionPairCount} positive-X pairs. Those pairs reproduce SHA-256 \`${report.reconciliation.canonicalAlias.transitionPairManifestSha256}\` and the 70-cell endpoint union reproduces \`${report.reconciliation.canonicalAlias.interfaceCoordinateSetSha256}\`. The same identity is already published as \`${report.reconciliation.canonicalAlias.localCanonicalContractId}\` and \`${report.reconciliation.canonicalAlias.globalCanonicalContractId}\`.

## Remaining G05 input

- ${report.remainingHold.undefinedEndpointGeometryCount} undefined endpoints still need exact source/counterpart geometry and named owners, receivers, or sources.
- All ${report.remainingHold.nullPairFieldContractCount} reconciled contracts still lack accepted before/future-state and interface-acceptance closure.
- No owner, receiver, source, future state, technical acceptance, or interface acceptance is inferred.
- G05 and R00 remain HOLD.

## Boundary

- The canonical ownership/interface registry was read and hash-bound, not rewritten.
- No Minecraft, RCON, API, systemd, network, or live-server call was made.
- No operation, construction, release, world edit, owner acceptance, interface acceptance, or technical acceptance is authorized.
`;
}

const sourceBindings = {
  registry: binding(INPUTS.registry, 'canonical Combined Zones owner/interface proposal registry'),
  detailedD06: binding(INPUTS.detailedD06, 'source D06 exact canonical-owner adjacency'),
  globalGeometry: binding(INPUTS.globalGeometry, 'G05 Layer-A geometry and Layer-B deficit audit'),
  completeSave: binding(INPUTS.completeSave, 'accepted immutable complete-save identity'),
};
const registry = readJson(INPUTS.registry);
const detailedD06 = readJson(INPUTS.detailedD06);
const globalGeometry = readJson(INPUTS.globalGeometry);
const completeSave = readJson(INPUTS.completeSave);

invariant(globalGeometry.sourceBindings?.registry?.sha256 === sourceBindings.registry.sha256,
  'global geometry audit does not bind the current registry');
invariant(globalGeometry.layerB?.missingTransitionPairManifestCount === 52,
  'global geometry audit null-pair count drifted');
const layerBClosedByAdditiveRecord = globalGeometry.layerB?.g05Passed === true;
invariant(globalGeometry.layerB?.g05Passed === false
  || (layerBClosedByAdditiveRecord
    && globalGeometry.layerB?.status
      === 'PASS_CLOSED_BY_ADDITIVE_CLOSURE_RECORD_REGISTRY_UNMODIFIED'
    && globalGeometry.layerB?.closureRecord !== null),
'global geometry audit claims G05 PASS without a bound Layer B closure record');
invariant(completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && completeSave.summary?.passed === true,
'bound complete-save input is not PASS');

const contracts = registry.proposedDirectionalInterfaceRegistry.contracts;
const nullPairContracts = contracts.filter(
  ({ transitionPairManifestSha256 }) => transitionPairManifestSha256 === null,
);
invariant(nullPairContracts.length === 52, 'expected exactly 52 null transition-pair fields');

const aliasContract = findContract(nullPairContracts, ALIAS_CONTRACT_ID);
const localCanonicalContract = findContract(contracts, LOCAL_CANONICAL_CONTRACT_ID);
const globalCanonicalContract = findContract(contracts, GLOBAL_CANONICAL_CONTRACT_ID);
const detailedCanonicalContract = detailedD06.exactCanonicalOwnerAdjacency.records.find(
  ({ interfaceId }) => interfaceId === LOCAL_CANONICAL_CONTRACT_ID,
);
invariant(detailedCanonicalContract, 'source D06 canonical adjacency is missing');

const aliasSourceCells = cellsIn(aliasContract.interfaceCellSet.bounds);
const aliasPairs = aliasSourceCells.map((from) => ({
  from,
  to: { x: from.x + 1, y: from.y, z: from.z },
}));
const aliasInterfaceCells = uniqueCells(aliasPairs.flatMap(({ from, to }) => [from, to]));
const reconstructedPairHash = pairHash(aliasPairs);
const reconstructedInterfaceHash = cellHash(aliasInterfaceCells);

invariant(aliasContract.interfaceCellSet.cellCount === 35
  && aliasSourceCells.length === 35
  && cellHash(aliasSourceCells, D06_LIFE_SAFETY_CELL_PREAMBLE)
    === aliasContract.interfaceCellSet.coordinateSetSha256,
'D06 alias source-cap geometry is not an exact 35-cell rectangular face');
invariant(reconstructedPairHash
  === '86fa8755867325fc1bea7e602d3d2eab536c5702a5a24ec111d2cf7907ea7915',
'reconstructed D06 alias pair identity drifted');
invariant(localCanonicalContract.transitionPairCount === 35
  && localCanonicalContract.transitionPairManifestSha256 === reconstructedPairHash
  && localCanonicalContract.interfaceCellSet.coordinateSetSha256 === reconstructedInterfaceHash,
'local D06 canonical adjacency does not match the reconstructed alias');
invariant(globalCanonicalContract.transitionPairCount === 35
  && globalCanonicalContract.transitionPairManifestSha256 === reconstructedPairHash
  && globalCanonicalContract.interfaceCellSet.coordinateSetSha256 === reconstructedInterfaceHash,
'global G04 canonical adjacency does not match the reconstructed alias');
invariant(detailedCanonicalContract.transitionPairCount === 35
  && detailedCanonicalContract.transitionPairManifestSha256 === reconstructedPairHash
  && detailedCanonicalContract.exactInterfaceCellSet.coordinateSetSha256
    === reconstructedInterfaceHash,
'source D06 adjacency does not match the reconstructed alias');
invariant(aliasContract.fromOwnerId === localCanonicalContract.fromOwnerId
  && aliasContract.toOwnerId === localCanonicalContract.toOwnerId
  && localCanonicalContract.fromOwnerId === globalCanonicalContract.fromOwnerId
  && localCanonicalContract.toOwnerId === globalCanonicalContract.toOwnerId,
'D06 alias owner direction is not canonical');

const records = nullPairContracts.map((contract) => {
  const classification = categoryFor(contract);
  return {
    contractId: contract.contractId,
    scope: contract.scope,
    fromOwnerId: contract.fromOwnerId,
    toOwnerId: contract.toOwnerId,
    direction: contract.direction,
    relationship: contract.relationship,
    classification,
    interfaceCellCount: contract.interfaceCellSet?.cellCount ?? null,
    interfaceCoordinateSetSha256:
      contract.interfaceCellSet?.coordinateSetSha256 ?? null,
    ...dispositionFor(classification),
    beforeStateSetSha256: contract.beforeStateSetSha256,
    futureStateSetSha256: contract.futureStateSetSha256,
    accepted: contract.accepted,
  };
});

const count = (classification) => records.filter(
  (record) => record.classification === classification,
).length;
const classificationCounts = {
  canonicalAdjacencyAlias: count('CANONICAL_ADJACENCY_ALIAS'),
  terminalCap: count('TERMINAL_CAP'),
  sharedBoundary: count('SHARED_BOUNDARY'),
  precedenceOrReservation: count('PRECEDENCE_OR_RESERVATION'),
  undefinedEndpoint: count('UNDEFINED_ENDPOINT'),
};
invariant(classificationCounts.canonicalAdjacencyAlias === 1
  && classificationCounts.terminalCap === 22
  && classificationCounts.sharedBoundary === 10
  && classificationCounts.precedenceOrReservation === 6
  && classificationCounts.undefinedEndpoint === 13,
'null-pair classification partition drifted');
invariant(Object.values(classificationCounts).reduce((sum, item) => sum + item, 0) === 52,
  'null-pair classification is not complete and one-to-one');
invariant(records.every((record) => record.accepted === false
  && record.beforeStateSetSha256 === null
  && record.futureStateSetSha256 === null),
'reconciled contract state or acceptance changed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g05-pair-manifest-reconciliation-audit',
  generatedAtUtc: GENERATED_AT,
  status: layerBClosedByAdditiveRecord
    ? 'PASS_NULL_PAIR_FIELDS_RECONCILED_AND_LAYER_B_CLOSED_BY_ADDITIVE_RECORD'
    : 'PARTIAL_PASS_NULL_PAIR_FIELDS_RECONCILED_G05_TECHNICAL_STATES_COUNTERPARTS_AND_ACCEPTANCE_HOLD',
  purpose: 'Reconcile every null transition-pair field by geometry kind, bind the one existing D06 canonical adjacency alias, and preserve every endpoint, state, counterpart, and acceptance HOLD.',
  sourceBindings,
  registryBinding: {
    canonicalPayloadSha256: registry.canonicalPayloadSha256,
    reportIdentitySha256: registry.reportIdentitySha256,
    registryModified: false,
  },
  reconciliation: {
    status: 'PASS_COMPLETE_ONE_TO_ONE_NULL_FIELD_CLASSIFICATION_NO_MANIFEST_FABRICATION',
    nullTransitionPairFieldCount: nullPairContracts.length,
    classifiedRecordCount: records.length,
    classificationCounts,
    canonicalAlias: {
      aliasContractId: ALIAS_CONTRACT_ID,
      localCanonicalContractId: LOCAL_CANONICAL_CONTRACT_ID,
      globalCanonicalContractId: GLOBAL_CANONICAL_CONTRACT_ID,
      fromOwnerId: aliasContract.fromOwnerId,
      toOwnerId: aliasContract.toOwnerId,
      direction: 'POSITIVE_X',
      sourceCapCellCount: aliasSourceCells.length,
      sourceCapCoordinateSetSha256:
        cellHash(aliasSourceCells, D06_LIFE_SAFETY_CELL_PREAMBLE),
      transitionPairCount: aliasPairs.length,
      transitionPairManifestSha256: reconstructedPairHash,
      interfaceCellCount: aliasInterfaceCells.length,
      interfaceBounds: boundsOf(aliasInterfaceCells),
      interfaceCoordinateSetSha256: reconstructedInterfaceHash,
      canonicalReferenceOnly: true,
      duplicatePhysicalSeamMustNotBeCounted: true,
      acceptanceInferred: false,
    },
    pairManifestReusedCount: 1,
    pairManifestCreatedCount: 0,
    pairManifestFabricatedCount: 0,
    currentGeometryPairNotApplicableCount:
      classificationCounts.terminalCap
      + classificationCounts.sharedBoundary
      + classificationCounts.precedenceOrReservation,
    pairRequirementUndeterminedCount: classificationCounts.undefinedEndpoint,
    records,
  },
  remainingHold: {
    status: layerBClosedByAdditiveRecord
      ? 'CLOSED_BY_ADDITIVE_LAYER_B_CLOSURE_RECORD_CLASSIFICATIONS_REMAIN_EVIDENCE'
      : 'HOLD_G05_TECHNICAL_ENDPOINTS_COUNTERPARTS_STATES_AND_ACCEPTANCE_INCOMPLETE',
    nullPairFieldContractCount: nullPairContracts.length,
    undefinedEndpointGeometryCount: classificationCounts.undefinedEndpoint,
    terminalOrCounterpartDispositionRequiredCount: classificationCounts.terminalCap,
    sharedBoundaryTechnicalAcceptanceRequiredCount: classificationCounts.sharedBoundary,
    precedenceAcceptanceRequiredCount: classificationCounts.precedenceOrReservation,
    beforeStateSetCount: records.filter(
      ({ beforeStateSetSha256 }) => beforeStateSetSha256 !== null,
    ).length,
    futureStateSetCount: records.filter(
      ({ futureStateSetSha256 }) => futureStateSetSha256 !== null,
    ).length,
    acceptedContractCount: records.filter(({ accepted }) => accepted).length,
    exactRequiredInputs: [
      'Exact source and counterpart geometry plus a named owner, receiver, or source for every undefined endpoint.',
      'An explicit reviewed terminal classification for every intended one-sided cap, or an exact counterpart face if an opening is intended.',
      'Complete-save-bound before states and accepted designed future states for every materialized interface.',
      'Owner, technical, and interface acceptance bound to one immutable composite identity.',
    ],
    closureRecord: layerBClosedByAdditiveRecord
      ? globalGeometry.layerB.closureRecord
      : null,
    g05Passed: layerBClosedByAdditiveRecord,
    r00Passed: false,
  },
  safetyBoundary: {
    inputFilesReadOnly: true,
    canonicalRegistryModified: false,
    liveCallsPerformed: false,
    networkCallsPerformed: false,
    minecraftConnected: false,
    rconConnected: false,
    apiCalled: false,
    systemdCalled: false,
    worldFilesMutated: false,
    operationCellCount: 0,
    worldEditAuthorized: false,
    ownerAcceptanceRecorded: false,
    interfaceAcceptanceRecorded: false,
    technicalAcceptanceRecorded: false,
    releaseAuthorized: false,
  },
  disposition: {
    canonicalAliasMayBeReferenced: true,
    canonicalRegistryMayBeRewrittenByThisAudit: false,
    nonAdjacencyPairsMayBeInferred: false,
    undefinedEndpointsMayBeInferred: false,
    g05Passed: layerBClosedByAdditiveRecord,
    r00Passed: false,
  },
};
const reportIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, reportIdentitySha256 };

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, renderMarkdown(report));

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  nullTransitionPairFieldCount: report.reconciliation.nullTransitionPairFieldCount,
  classificationCounts,
  pairManifestReusedCount: report.reconciliation.pairManifestReusedCount,
  pairManifestCreatedCount: report.reconciliation.pairManifestCreatedCount,
  g05Passed: report.remainingHold.g05Passed,
  reportIdentitySha256,
}, null, 2));
