#!/usr/bin/env node
/**
 * Compile CZ-R07E: the sealed B09 summit headhouse shell.
 *
 * The exact 180-cell frozen summit-station envelope is partitioned into an
 * 18-cell connected rail/headroom void and a complete 162-cell static shell.
 * The shell physically closes both the guideway approach and the canonical
 * 12-cell Z11 summit interface. It does not create an opening or commission
 * transport, power, drainage, rescue, or egress systems.
 *
 * This compiler reads only immutable evidence and performs no live call or
 * world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  replLine,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07d-post-20260821T164505Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07d-live-20260821T164505Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r07e-b09-summit-headhouse-shell';
const RELEASE_ID = 'CZ-R07E-P1-B09-SUMMIT-HEADHOUSE-SHELL';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b09-summit-headhouse-shell';
const SOURCE_STATE = 'minecraft:air';
const TARGET_STATE = 'minecraft:polished_diorite';

const INPUTS = Object.freeze({
  b09Technical:
    'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectorGeometry:
    'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05Alternatives:
    'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r07dLedger:
    'data/world-review/combined-zones-r07d-live-20260821T164505Z/evidence-ledger.json',
  r07dQa:
    'data/world-review/combined-zones-r07d-live-20260821T164505Z/r07d-post-release-qa.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
  ],
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    'fdffaae24e4adb32ac32df7f14a1efef14e70922b6633562f093bbfafca4b858',
  sourceRegionSha256:
    '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
  r07dCompletedReleaseIdentitySha256:
    'd2e446216f55a7f6b67432c2203e3624a64606eb64b25eb2e5439d8c8d286bfe',
  b09TechnicalIdentitySha256:
    'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  selectedModelIdentitySha256:
    '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  accommodationCellCount: 7800,
  accommodationSha256:
    'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  summitEnvelopeCellCount: 180,
  summitEnvelopeSha256:
    '99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599',
  summitInterfaceCapCellCount: 12,
  summitInterfaceCapSha256:
    'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  b08PortalSeamCellCount: 36,
  b08PortalSeamSha256:
    'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  r07dLowerShellCellCount: 84,
  r07dLowerShellSha256:
    'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
  interiorCellCount: 18,
  interiorSha256:
    '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  shellCellCount: 162,
  shellSha256:
    '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
  approachCapCellCount: 12,
});
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner',
  'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon',
  'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:crafter', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07E B09 summit-headhouse compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const difference = (left, right) => {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
};
const intersection = (left, right) => {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) census.set(state, (census.get(state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`combined-zones-current-block-state-set-v1\n${records.slice()
    .sort((left, right) => (
      left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
    ))
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const overlaps = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(
        /(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g,
      )) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        if (targetKeys.has(cellKey(cell))) overlaps.set(cellKey(cell), { cell });
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
    };
    const minX = Math.max(bounds.minX, targetBounds.minX);
    const maxX = Math.min(bounds.maxX, targetBounds.maxX);
    const minY = Math.max(bounds.minY, targetBounds.minY);
    const maxY = Math.min(bounds.maxY, targetBounds.maxY);
    const minZ = Math.max(bounds.minZ, targetBounds.minZ);
    const maxZ = Math.min(bounds.maxZ, targetBounds.maxZ);
    if (minX > maxX || minY > maxY || minZ > maxZ) continue;
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) overlaps.set(cellKey(cell), { cell });
        }
      }
    }
  }
  return [...overlaps.values()];
}

const intake = readJson(INTAKE_AUDIT);
const authorization = readJson(INPUTS.standingAuthorization);
const technical = readJson(INPUTS.b09Technical);
const connectors = readJson(INPUTS.connectorGeometry);
const d05 = readJson(INPUTS.d05Alternatives);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r07dLedger = readJson(INPUTS.r07dLedger);
const r07dQa = readJson(INPUTS.r07dQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not bound to the accepted R07D post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(r07dLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && r07dLedger.stages?.every(({ status }) => status === 'PASS')
  && samePath(r07dLedger.postSnapshot.root, SNAPSHOT)
  && r07dLedger.postSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'R07D terminal ledger is not the source predecessor');
const sourceRegionIdentity = readJson(r07dLedger.postSnapshot.identity.path);
invariant(sourceRegionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceRegionIdentity.directory, path.join(SNAPSHOT, 'region')),
'R07D post region identity drifted');
invariant(r07dQa.status === 'PASS_R07D_B09_LOWER_STATION_SHELL_POST_RELEASE_ACCEPTED'
  && r07dQa.release?.completedReleaseIdentitySha256
    === EXPECTED.r07dCompletedReleaseIdentitySha256,
'R07D post-release acceptance identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B09'),
'standing authorization does not cover P1-B09 under the R07 node');
invariant(technical.reportIdentitySha256 === EXPECTED.b09TechnicalIdentitySha256,
'frozen B09 technical-system identity drifted');

const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel?.modelIdentitySha256 === EXPECTED.selectedModelIdentitySha256,
'selected FM-01 identity drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256,
'frozen B09 accommodation drifted');

const summitInterior = [];
for (let offset = 8; offset >= 0; offset -= 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    summitInterior.push({
      x: endpoints.to.x,
      y: endpoints.to.y - offset + dy,
      z: endpoints.to.z + offset,
    });
  }
}
const summitEnvelope = dilateCells(summitInterior, 1);
const summitInterfaceCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
const approachCap = summitEnvelope.filter(({ z }) => z === -819);
const shell = difference(summitEnvelope, summitInterior);
invariant(summitEnvelope.length === EXPECTED.summitEnvelopeCellCount
  && hashCells(summitEnvelope) === EXPECTED.summitEnvelopeSha256
  && summitInterior.length === EXPECTED.interiorCellCount
  && hashCells(summitInterior) === EXPECTED.interiorSha256
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256,
'summit headhouse partition drifted');
invariant(summitInterfaceCap.length === EXPECTED.summitInterfaceCapCellCount
  && hashCells(summitInterfaceCap) === EXPECTED.summitInterfaceCapSha256
  && intersection(shell, summitInterfaceCap).length === summitInterfaceCap.length,
'summit interface is not exactly contained in the closed shell');
invariant(approachCap.length === EXPECTED.approachCapCellCount,
'guideway approach cap count drifted');
const accommodationKeys = new Set(accommodation.map(cellKey));
invariant(summitEnvelope.every((cell) => accommodationKeys.has(cellKey(cell))),
'summit headhouse leaves the frozen B09 accommodation');
const interiorConnectivity = connectedComponents(summitInterior);
invariant(interiorConnectivity.componentCount === 1
  && interiorConnectivity.largestComponentCellCount === summitInterior.length,
'summit rail/headroom void is not one face-connected component');
const interiorKeys = new Set(summitInterior.map(cellKey));
const faceBoundary = uniqueCells(summitInterior.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !interiorKeys.has(cellKey(cell))));
const shellKeys = new Set(shell.map(cellKey));
invariant(faceBoundary.every((cell) => shellKeys.has(cellKey(cell))),
'summit headhouse does not enclose every interior face');

const b08PortalSeam = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const r07dLowerShell = uniqueCells(
  r07dQa.geometry.roughShell.bounds
    ? cellsIn(r07dQa.geometry.roughShell.bounds)
      .filter((cell) => {
        const interior = r07dQa.geometry.preservedInteriorVoid.bounds;
        return !insideBounds(cell, interior);
      })
    : [],
);
invariant(b08PortalSeam.length === EXPECTED.b08PortalSeamCellCount
  && hashCells(b08PortalSeam) === EXPECTED.b08PortalSeamSha256
  && r07dLowerShell.length === EXPECTED.r07dLowerShellCellCount
  && hashCells(r07dLowerShell) === EXPECTED.r07dLowerShellSha256
  && intersection(shell, b08PortalSeam).length === 0
  && intersection(shell, r07dLowerShell).length === 0,
'summit headhouse intersects the B08 seam or accepted R07D lower shell');

const interactionHalo = dilateCells(shell, 1);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function readStates(cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}
const accommodationRecords = await readStates(accommodation);
const accommodationByKey = new Map(
  accommodationRecords.map((record) => [cellKey(record.cell), record.state]),
);
const shellRecords = shell.map((cell) => ({ cell, state: accommodationByKey.get(cellKey(cell)) }));
const interiorRecords = summitInterior.map((cell) => ({
  cell, state: accommodationByKey.get(cellKey(cell)),
}));
const summitCapRecords = summitInterfaceCap.map((cell) => ({
  cell, state: accommodationByKey.get(cellKey(cell)),
}));
const approachCapRecords = approachCap.map((cell) => ({
  cell, state: accommodationByKey.get(cellKey(cell)),
}));
const unexpectedShellStates = shellRecords.filter(({ state }) => state !== SOURCE_STATE);
const obstructedInterior = interiorRecords.filter(({ state }) => state !== SOURCE_STATE);
invariant(unexpectedShellStates.length === 0,
  `summit shell source is not exact air: ${JSON.stringify(unexpectedShellStates.slice(0, 20))}`);
invariant(obstructedInterior.length === 0,
  `summit interior is not exact air: ${JSON.stringify(obstructedInterior.slice(0, 20))}`);

const haloRecords = await readStates(interactionHalo);
const haloViolations = haloRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
));
invariant(haloViolations.length === 0,
  `protected block class exists in summit halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);

const haloBounds = boundsOf(interactionHalo);
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityHaloIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (insideBounds(point, haloBounds)) {
      blockEntityHaloIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
'summit interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'summit interaction halo intersects a saved entity');

const protectedRelicHaloIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = interactionHalo.filter((cell) => (
    insideBounds(cell, relic.declaredInclusiveBounds)
  ));
  if (cells.length) protectedRelicHaloIntersections.push({
    relic: relic.key,
    ...classManifest(cells),
  });
}
invariant(protectedRelicHaloIntersections.length === 0,
'summit interaction halo intersects a protected relic core');

const targetKeys = new Set(shell.map(cellKey));
const priorReleaseIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const declaredHash = manifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${manifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const overlaps = priorOperationIntersections(pkg.forward, targetKeys, boundsOf(shell));
    if (overlaps.length) priorReleaseIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      operationPath: pkg.forward,
      ...classManifest(overlaps.map(({ cell }) => cell)),
    });
  }
}
invariant(priorReleaseIntersections.length === 0,
  `summit shell intersects prior release targets: ${JSON.stringify(priorReleaseIntersections)}`);

const forwardBody = `${shell.map((cell) => (
  replLine(cell, SOURCE_STATE, TARGET_STATE)
)).join('\n')}\n`;
const rollbackBody = `${shell.slice().reverse().map((cell) => (
  replLine(cell, TARGET_STATE, SOURCE_STATE)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(shell)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R07D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09', 'Z11-SUMMIT-INTERFACE'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One exact static shell; rollback removes cells in reverse coordinate order.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
    purpose: 'Build the exact summit headhouse enclosure and retain both the approach and Z11 interface in a physical fail-closed state.',
    geometry: {
      minimumPlanningAccommodation: classManifest(accommodation),
      summitStationEnvelope: classManifest(summitEnvelope),
      connectedRailAndHeadroomVoid: {
        ...classManifest(summitInterior),
        ...interiorConnectivity,
      },
      summitHeadhouseShell: classManifest(shell),
      interiorFaceBoundary: classManifest(faceBoundary),
      guidewayApproachCap: classManifest(approachCap),
      summitInterfaceCap: classManifest(summitInterfaceCap),
      b08PortalSeam: classManifest(b08PortalSeam),
      acceptedR07DLowerShell: classManifest(r07dLowerShell),
      interactionHalo: classManifest(interactionHalo),
    },
    materialDoctrine: {
      shellState: TARGET_STATE,
      reason: 'Static non-gravity enclosure fabric matching accepted R07 B03/B08/B09 framework.',
    },
    operationalBoundary: {
      summitInterfaceCapBuiltClosed: true,
      summitInterfaceOpeningCreated: false,
      guidewayApproachCapBuiltClosed: true,
      guidewayContinuationOpened: false,
      b08PortalSeamTouched: false,
      acceptedR07DLowerShellTouched: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      exactRollbackRestoresR07DPostAir: true,
    },
    sourcePartition: {
      design: classManifest(summitEnvelope),
      operated: classManifest(shell),
      preservedInterior: classManifest(summitInterior),
      sourceStateCensus: stateCensus(shellRecords),
      exactPartition: uniqueCells([...shell, ...summitInterior]).length
        === summitEnvelope.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceRegionIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    predecessor: {
      transactionId: r07dLedger.transactionId,
      executionLedger: fileBinding(INPUTS.r07dLedger),
      completedReleaseIdentitySha256: r07dQa.release.completedReleaseIdentitySha256,
      postReleaseQa: fileBinding(INPUTS.r07dQa),
    },
    b09CurrentStateInventory: {
      minimumAccommodation: {
        ...classManifest(accommodation),
        stateCensus: stateCensus(accommodationRecords),
        blockStateSetSha256: stateSetSha256(accommodationRecords),
      },
      summitStationEnvelope: {
        ...classManifest(summitEnvelope),
        stateCensus: stateCensus([...shellRecords, ...interiorRecords]),
      },
      summitInterfaceCap: {
        ...classManifest(summitInterfaceCap),
        stateCensus: stateCensus(summitCapRecords),
      },
      guidewayApproachCap: {
        ...classManifest(approachCap),
        stateCensus: stateCensus(approachCapRecords),
      },
    },
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(shell),
    desiredStateCensus: { [TARGET_STATE]: shell.length },
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: shell.length,
      rollbackCommandCount: shell.length,
      targetCellCount: shell.length,
      targetCoordinateSetSha256: hashCells(shell),
      exactInverse: true,
      oneCellGuards: true,
    },
  },
  isolation: {
    fluidTargetIntersectionCount: shellRecords.filter(({ state }) => isFluid(state)).length,
    fluidHaloIntersectionCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloIntersectionCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: priorReleaseIntersections.length,
    b08PortalSeamTargetIntersectionCount: intersection(shell, b08PortalSeam).length,
    acceptedR07DLowerShellTargetIntersectionCount: intersection(shell, r07dLowerShell).length,
    preservedInteriorTargetIntersectionCount: intersection(shell, summitInterior).length,
    summitInterfaceCapTargetIntersectionCount:
      intersection(shell, summitInterfaceCap).length,
    summitInterfaceCapTargetRole: 'INTENTIONAL_PHYSICAL_FAIL_CLOSED_CAP',
  },
  compileGuards: {
    exactTargetSourceState: SOURCE_STATE,
    unexpectedTargetStateViolationCount: unexpectedShellStates.length,
    obstructedPreservedInteriorViolationCount: obstructedInterior.length,
    fluidTargetViolationCount: shellRecords.filter(({ state }) => isFluid(state)).length,
    fluidHaloViolationCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloViolationCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloViolationCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    priorReleaseTargetViolationCount: priorReleaseIntersections.length,
    b08PortalSeamViolationCount: intersection(shell, b08PortalSeam).length,
    acceptedR07DLowerShellViolationCount: intersection(shell, r07dLowerShell).length,
    preservedInteriorViolationCount: intersection(shell, summitInterior).length,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    b09Technical: {
      ...fileBinding(INPUTS.b09Technical),
      reportIdentitySha256: technical.reportIdentitySha256,
    },
    d05Alternatives: {
      ...fileBinding(INPUTS.d05Alternatives),
      selectedModelIdentitySha256: selectedModel.modelIdentitySha256,
    },
    connectorGeometry: fileBinding(INPUTS.connectorGeometry),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'fresh block/live-entity clearance',
    'exact source preflight',
    'strict-noop forward and rollback parser checks',
    'journaled strict-noop execution',
    'fresh post snapshot and rollback post-state preflight',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceRegionIdentity.sha256,
  b09CurrentStateCensus: stateCensus(accommodationRecords),
  targetCellCount: shell.length,
  commandCount: shell.length,
  sourceStateCensus: stateCensus(shellRecords),
  desiredStateCensus: { [TARGET_STATE]: shell.length },
  preservedInteriorCellCount: summitInterior.length,
  summitInterfaceClosedCellCount: summitInterfaceCap.length,
  guidewayApproachClosedCellCount: approachCap.length,
  b08PortalSeamTargetIntersectionCount: 0,
  r07dLowerShellTargetIntersectionCount: 0,
  priorReleaseTargetIntersectionCount: 0,
  fluidHaloIntersectionCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  protectedRelicHaloIntersectionCount: 0,
  forward,
  rollback,
  forwardSha256,
  rollbackSha256,
}, null, 2));
