#!/usr/bin/env node
/**
 * Read-only, source-bound default-deny contract for the wet West High
 * Successor-12 envelope adjacent to the executed SYS03 High-16 civil void.
 *
 * This script deliberately emits no operation file.  It records the exact
 * water topology, gravity chains, and already-claimed target intersections so
 * a later proposal cannot silently turn a wet/owned interface into a dry
 * corridor.  Re-run it against a fresh immutable capture before considering
 * any future package.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`missing ${flag}`);
  return result;
};
const snapshot = required('--snapshot');
const high16ManifestPath = required('--high16-manifest');
const westHighManifestPath = required('--west-high-manifest');
const cobaltManifestPath = required('--cobalt-manifest');
const out = required('--out');
const markdownOut = value('--markdown');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).replaceAll(path.sep, '/');
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const compare = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
const unique = (cells) => [...new Map(cells.map((cell) => [cellKey(cell), point(cell.x, cell.y, cell.z)])).values()].sort(compare);
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) {
    for (let y = min.y; y <= max.y; y += 1) {
      for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
    }
  }
  return cells;
};
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const water = (state) => stateName(state) === 'minecraft:water' || stateName(state) === 'minecraft:bubble_column' || state.includes('waterlogged=true');
const neighbours = ({ x, y, z }) => [
  point(x - 1, y, z), point(x + 1, y, z), point(x, y - 1, z),
  point(x, y + 1, z), point(x, y, z - 1), point(x, y, z + 1),
];

function assertCompleteSnapshot(root) {
  const capturePath = path.join(absolute(root), 'combined-zones-complete-save-capture.json');
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    if (!fs.existsSync(path.join(absolute(root), member))) throw new Error(`incomplete immutable capture: missing ${member}`);
  }
  const captureBytes = fs.readFileSync(capturePath);
  const capture = JSON.parse(captureBytes.toString('utf8'));
  if (!capture.immutableCopy || !Array.isArray(capture.requiredMembers) || capture.requiredMembers.length !== 130) {
    throw new Error('source is not a complete immutable 130-member capture');
  }
  for (const member of capture.requiredMembers) {
    const filename = path.join(absolute(root), member.path);
    if (!fs.existsSync(filename) || fs.statSync(filename).size !== member.bytes || sha(fs.readFileSync(filename)) !== member.sha256) {
      throw new Error(`capture member integrity drift: ${member.path}`);
    }
  }
  return { capture, captureSha256: sha(captureBytes) };
}

function parseOperations(filename) {
  const text = fs.readFileSync(absolute(filename), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#')).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid guarded operation in ${filename}: ${line}`);
    return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
  });
}

function manifestTargets(manifestPath) {
  const manifest = readJson(manifestPath);
  const files = [];
  for (const stage of manifest.stages ?? []) if (stage.forward) files.push(stage.forward);
  for (const pkg of manifest.packages ?? []) if (pkg.forward) files.push(pkg.forward);
  if (!files.length) throw new Error(`no forward operation groups in ${manifestPath}`);
  return {
    manifest,
    manifestSha256: sha(fs.readFileSync(absolute(manifestPath))),
    cells: unique(files.flatMap(parseOperations)),
  };
}

const capture = assertCompleteSnapshot(snapshot);
const high16 = manifestTargets(high16ManifestPath);
const westHigh = manifestTargets(westHighManifestPath);
const cobalt = manifestTargets(cobaltManifestPath);
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const exactStateRecords = async (cells) => {
  const result = [];
  for (const cell of cells) result.push({ point: cell, state: await stateAt(cell) });
  return result;
};
const exactSet = (cells, states = null) => ({
  count: cells.length,
  coordinateSetSha256: hashCells(cells),
  bounds: cells.length ? boundsOf(cells) : null,
  cells: states ? states.sort((a, b) => compare(a.point, b.point)) : unique(cells),
});
const intersection = (left, right) => {
  const allowed = new Set(right.map(cellKey));
  return unique(left.filter((cell) => allowed.has(cellKey(cell))));
};

// This is the concrete wet envelope held by West High Successor-12.  The
// three nested sets make future ownership changes visible at every boundary.
const core = box(point(-214, 42, -472), point(-195, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const shellBox = box(point(-215, 41, -473), point(-194, 48, -466));
const shell = shellBox.filter((cell) => !coreKeys.has(cellKey(cell)) && (
  cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466
));
const shellKeys = new Set(shell.map(cellKey));
const halo = box(point(-216, 40, -474), point(-193, 49, -465))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const interaction = unique([...core, ...shell, ...halo]);
const [coreRecords, shellRecords, haloRecords] = await Promise.all([
  exactStateRecords(core), exactStateRecords(shell), exactStateRecords(halo),
]);
const fluidRecords = (records) => records.filter(({ state }) => fluid(state));
const waterRecords = (records) => records.filter(({ state }) => water(state));
const gravelRecords = (records) => records.filter(({ state }) => state === 'minecraft:gravel');

const componentSeeds = waterRecords(coreRecords);
if (!componentSeeds.length) throw new Error('expected held West High core water seed set is empty');
const component = [];
const queue = componentSeeds.map(({ point: cell }) => cell);
const visited = new Set();
const componentLimit = 50_000;
while (queue.length) {
  if (component.length >= componentLimit) throw new Error(`water component exceeded ${componentLimit} cells; exact component not bounded`);
  const cell = queue.shift();
  const key = cellKey(cell);
  if (visited.has(key)) continue;
  visited.add(key);
  const state = await stateAt(cell);
  if (!fluid(state)) continue;
  component.push({ point: cell, state });
  for (const next of neighbours(cell)) if (!visited.has(cellKey(next))) queue.push(next);
}
const componentWater = component.filter(({ state }) => water(state));
const componentNonWaterFluid = component.filter(({ state }) => !water(state));
const gravityChain = async (target) => {
  const chain = [];
  for (let y = target.y - 1; y >= -64; y -= 1) {
    const cell = point(target.x, y, target.z);
    const state = await stateAt(cell);
    chain.push({ point: cell, state });
    if (state !== 'minecraft:gravel') {
      return {
        target,
        chain,
        terminal: { point: cell, state },
        supported: state !== 'minecraft:air' && !fluid(state),
      };
    }
  }
  return { target, chain, terminal: null, supported: false };
};
const gravity = {};
for (const [name, records] of Object.entries({ core: coreRecords, shell: shellRecords, halo: haloRecords })) {
  gravity[name] = await Promise.all(gravelRecords(records).map(({ point: cell }) => gravityChain(cell)));
}
const allGravity = Object.values(gravity).flat();

const overlapSets = {
  sys03High16ExecutedCivilTargets: intersection(interaction, high16.cells),
  westHighPredecessorTargets: intersection(interaction, westHigh.cells),
  cobaltWestlightProtectedTargets: intersection(interaction, cobalt.cells),
};
const waterByRole = {
  core: waterRecords(coreRecords),
  shell: waterRecords(shellRecords),
  halo: waterRecords(haloRecords),
};
const fluidByRole = {
  core: fluidRecords(coreRecords),
  shell: fluidRecords(shellRecords),
  halo: fluidRecords(haloRecords),
};
const zeroSet = exactSet([]);
const sourceBinding = {
  snapshot: relative(snapshot),
  captureId: capture.capture.captureId,
  captureManifestSha256: capture.captureSha256,
  capturedAtUtc: capture.capture.capturedAtUtc,
  immutableCopy: true,
  verifiedRequiredMemberCount: capture.capture.requiredMembers.length,
};
const contract = {
  schemaVersion: 1,
  id: 'SYS03-HIGH16-WEST-HIGH-HYDROLOGY-OWNERSHIP-CONTRACT-01',
  status: 'SOURCE_BOUND_DEFAULT_DENY_HYDROLOGY_AND_OWNERSHIP_HOLD',
  generatedAtUtc: new Date().toISOString(),
  readOnly: true,
  mutationAuthority: false,
  civilOnly: true,
  railCommissioned: false,
  passengerServiceCommissioned: false,
  sourceBinding,
  scope: {
    heldWestHighCore: exactSet(core),
    heldWestHighShell: exactSet(shell),
    heldWestHighHalo: exactSet(halo),
    heldInteraction: exactSet(interaction),
  },
  exactHydrology: {
    definition: 'Six-neighbour component seeded only from water-family cells in the held core; every member is stored with its exact canonical source state.',
    sourceSeedWater: exactSet(componentSeeds.map(({ point: cell }) => cell), componentSeeds),
    interactionWater: Object.fromEntries(Object.entries(waterByRole).map(([name, records]) => [name, exactSet(records.map(({ point: cell }) => cell), records)])),
    interactionAllFluid: Object.fromEntries(Object.entries(fluidByRole).map(([name, records]) => [name, exactSet(records.map(({ point: cell }) => cell), records)])),
    connectedComponent: exactSet(component.map(({ point: cell }) => cell), component),
    connectedWaterComponent: exactSet(componentWater.map(({ point: cell }) => cell), componentWater),
    connectedNonWaterFluid: exactSet(componentNonWaterFluid.map(({ point: cell }) => cell), componentNonWaterFluid),
    componentTraversalCeiling: componentLimit,
    componentTraversalComplete: true,
  },
  exactGravity: {
    definition: 'Every source gravel cell in the held interaction has its exact vertical chain through the first non-gravel terminal. A fluid or air terminal is unsupported.',
    core: gravity.core,
    shell: gravity.shell,
    halo: gravity.halo,
    totalTargetCount: allGravity.length,
    unsupportedTargetCount: allGravity.filter(({ supported }) => !supported).length,
    targetCoordinateSetSha256: hashCells(allGravity.map(({ target }) => target)),
  },
  exactExistingOverlaps: {
    sys03High16ExecutedCivilTargets: {
      ...exactSet(overlapSets.sys03High16ExecutedCivilTargets),
      sourceManifest: relative(high16ManifestPath),
      sourceManifestSha256: high16.manifestSha256,
      sourceTargetCount: high16.cells.length,
    },
    westHighPredecessorTargets: {
      ...exactSet(overlapSets.westHighPredecessorTargets),
      sourceManifest: relative(westHighManifestPath),
      sourceManifestSha256: westHigh.manifestSha256,
      sourceTargetCount: westHigh.cells.length,
    },
    cobaltWestlightProtectedTargets: {
      ...exactSet(overlapSets.cobaltWestlightProtectedTargets),
      sourceManifest: relative(cobaltManifestPath),
      sourceManifestSha256: cobalt.manifestSha256,
      sourceTargetCount: cobalt.cells.length,
    },
  },
  authorityCounterparts: {
    existingSys03High16CivilEnvelope: {
      status: 'EXISTING_SCOPE_COUNTERPART_REQUIRED',
      scope: 'SYS03-R10-HIGH16-DESCENDING-BYPASS-02',
      exactInteractionOverlap: exactSet(overlapSets.sys03High16ExecutedCivilTargets),
      requiredDisposition: 'No successor may touch a named existing SYS03 target absent a counterpart acceptance bound to the same source and exact overlap set.',
    },
    westHighPredecessorEnvelope: {
      status: 'EXISTING_SCOPE_COUNTERPART_REQUIRED',
      scope: 'RAIL-S3-R10-WEST-HIGH-SUCCESSOR-11',
      exactInteractionOverlap: exactSet(overlapSets.westHighPredecessorTargets),
      requiredDisposition: 'Retain or explicitly transfer every overlap; an empty observed overlap does not grant future scope ownership.',
    },
    cobaltWestlightProtectedEnvelope: {
      status: 'PROTECTED_SCOPE_COUNTERPART_REQUIRED',
      scope: 'COBALT-WL-HEADHOUSE-01',
      exactInteractionOverlap: exactSet(overlapSets.cobaltWestlightProtectedTargets),
      requiredDisposition: 'Any non-empty overlap is excluded unless that protected owner supplies an exact reviewed migration; this contract supplies no exception.',
    },
    hydrologyTreatmentOwner: {
      status: 'UNASSIGNED_DEFAULT_DENY',
      exactComponent: exactSet(component.map(({ point: cell }) => cell)),
      requiredDisposition: 'One accepted owner must be named for every direct fluid, liner, plug, dewater, transfer, and retained-water interaction cell.',
    },
    receiverAndOverflowOwner: {
      status: 'UNASSIGNED_DEFAULT_DENY',
      exactReceiverSet: zeroSet,
      requiredDisposition: 'No receiver, overflow, discharge, sump, or treatment cell is selected by this contract. A later proposal must name an exact source → treatment → receiver chain and one receiver owner.',
    },
    rollbackAndIndependentVerification: {
      status: 'UNASSIGNED_DEFAULT_DENY',
      requiredDisposition: 'A future package requires a named rollback owner and independent verifier; neither role is granted by this record.',
    },
  },
  permittedDefaultState: {
    disposition: 'RETAIN_EXACT_SOURCE_STATE_ONLY',
    permittedOperations: [],
    forbiddenWithoutReplacementContract: [
      'water removal, movement, conversion, containment, lining, plugging, draining, or discharge',
      'gravel removal, replacement, unsupported exposure, or altered support terminal',
      'any edit in the held interaction or exact connected water component',
      'assumption that a dry offset candidate establishes a connected, owned, or usable route',
      'rail, passenger, public, service, or emergency-route commissioning',
    ],
  },
  requiredFutureAcceptanceTests: [
    {
      id: 'SOURCE_REBIND_AND_EXACT_CENSUS',
      requirement: 'Fresh complete immutable capture; rederive and require equality of all selected source/interaction water, gravity, overlap, and owner-set identities before compiling.',
      failAction: 'ABORT_BEFORE_OPERATION_COMPILATION',
    },
    {
      id: 'BILATERAL_OWNER_COUNTERPARTS',
      requirement: 'Hydrology owner, receiver owner, rollback owner, independent verifier, and every non-empty existing-scope overlap counterpart accept exact coordinate sets and dispositions.',
      failAction: 'ABORT_BEFORE_OPERATION_COMPILATION',
    },
    {
      id: 'EXACT_RECEIVER_AND_NO_UNINTENDED_DISCHARGE',
      requirement: 'Provide exact treatment and receiver cells, source-to-receiver flow order, capacity/retention criterion, external boundary census, and no undeclared component loss/gain rule.',
      failAction: 'ABORT_BEFORE_OPERATION_COMPILATION',
    },
    {
      id: 'GRAVITY_AND_SUPPORT_FORWARD_ROLLBACK',
      requirement: 'Every retained or exposed gravel target must have a non-air/non-fluid support terminal after each forward stage and after each rollback stage; stage order must prevent unsupported intermediate states.',
      failAction: 'ABORT_BEFORE_OPERATION_COMPILATION',
    },
    {
      id: 'EXACT_INVERSE_AND_POSTSTATE_HYDROLOGY',
      requirement: 'Forward/rollback operations must be exact inverses. Preflight forward from source, projected rollback, and post rollback must pass. Independent post QA must compare retained-water component, receiver, dry route, gravity chains, protected/core sets, and all counterpart interfaces.',
      failAction: 'ABORT_RELEASE_CLOSEOUT',
    },
    {
      id: 'LIVE_ENTITY_AND_BLOCK_ENTITY_CLEARANCE',
      requirement: 'Fresh block-entity/protected-core clearance and same-moment live-entity clearance cover every proposed target, treatment, receiver, and rollback target.',
      failAction: 'ABORT_BEFORE_MUTATION',
    },
  ],
  worldMutated: false,
  rconCalled: false,
};
contract.contractIdentity = sha(`${JSON.stringify(contract, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(contract, null, 2)}\n`);

if (markdownOut) {
  const hydro = contract.exactHydrology;
  const rows = Object.entries(contract.exactExistingOverlaps)
    .map(([name, set]) => `| ${name} | ${set.count} | \`${set.coordinateSetSha256}\` |`)
    .join('\n');
  const md = `# SYS03 High-16 / West High hydrology and ownership contract 01\n\n`
    + `**Status:** \`${contract.status}\`  \n**Mode:** read-only and non-authorizing; no world mutation, RCON call, rail opening, or service commissioning.\n\n`
    + `## Bound source\n\n`
    + `- Immutable capture: \`${sourceBinding.snapshot}\`\n`
    + `- Capture identity: \`${sourceBinding.captureManifestSha256}\`\n`
    + `- Verified capture members: ${sourceBinding.verifiedRequiredMemberCount}\n`
    + `- Held interaction: ${contract.scope.heldInteraction.count} cells, \`${contract.scope.heldInteraction.coordinateSetSha256}\`\n\n`
    + `## Exact hydrology and gravity\n\n`
    + `The held core seeds ${hydro.sourceSeedWater.count} water-family cells. Their six-neighbour fluid component is ${hydro.connectedComponent.count} exact cells (${hydro.connectedWaterComponent.count} water-family; ${hydro.connectedNonWaterFluid.count} non-water fluid), bounded at \`${hydro.connectedComponent.coordinateSetSha256}\`. The traversal completed below its ${hydro.componentTraversalCeiling.toLocaleString('en-US')}-cell ceiling.\n\n`
    + `The interaction holds ${contract.exactGravity.totalTargetCount} gravel targets; ${contract.exactGravity.unsupportedTargetCount} have an unsupported source chain. Exact chains, terminal states, and every water state are in the JSON contract.\n\n`
    + `## Existing-scope interfaces\n\n| Counterpart set | Interaction overlap | Coordinate identity |\n| --- | ---: | --- |\n${rows}\n\n`
    + `No overlap result conveys authority. Hydrology, receiver/overflow, rollback, and independent-verification authorities are all unassigned/default-deny in this source-bound record.\n\n`
    + `## Default and release gate\n\n`
    + `The only permitted state is exact retention of the captured states. No water or gravel edit, no component treatment, and no receiver exists yet. A future package must satisfy every named test in \`requiredFutureAcceptanceTests\`, including bilateral counterpart acceptance, exact source → treatment → receiver modelling, ordered gravity support proofs, exact inverse preflight, independent post hydrology QA, and fresh entity/block-entity clearance.\n\n`
    + `Machine contract: [${path.basename(out)}](${path.basename(out)}).\n`;
  fs.mkdirSync(path.dirname(absolute(markdownOut)), { recursive: true });
  fs.writeFileSync(absolute(markdownOut), md);
}

console.log(JSON.stringify({
  status: contract.status,
  out: relative(out),
  contractIdentity: contract.contractIdentity,
  source: sourceBinding.snapshot,
  hydrology: {
    seedWater: contract.exactHydrology.sourceSeedWater.count,
    component: contract.exactHydrology.connectedComponent.count,
    componentIdentity: contract.exactHydrology.connectedComponent.coordinateSetSha256,
  },
  gravity: { targets: contract.exactGravity.totalTargetCount, unsupported: contract.exactGravity.unsupportedTargetCount },
  overlaps: Object.fromEntries(Object.entries(contract.exactExistingOverlaps).map(([name, set]) => [name, set.count])),
  mutationAuthority: false,
}, null, 2));
