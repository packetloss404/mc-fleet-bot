#!/usr/bin/env node
/**
 * Read-only current-source setout for the next functional B07 through-route.
 *
 * This is deliberately not a cosmetic B07 worklist.  It binds the three
 * separate interfaces a real route must cross: the lower wet north-transfer,
 * the R09J gravity isolation, and the R07J closed surface headhouse.  It emits
 * no RCON operation when one of those boundaries cannot be made reversible.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-mp08-rr-t1b-wayfinding-post-20260826T104858Z',
);
const OUT = value(
  '--out',
  'data/world-review/mp05-b07-through-route-egress-design-20260826T104858Z.json',
);
const MARKDOWN_OUT = value(
  '--markdown-out',
  'docs/masterplans/05-combined-zones/MP05-B07-THROUGH-ROUTE-EGRESS-DESIGN-2026-08-26.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-26T11:00:00Z');

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(abs(filename));
  return { path: rel(filename), bytes: bytes.length, sha256: sha256(bytes) };
};
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`MP05 B07 through-route setout rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state))
  || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(stateName(state))
  || stateName(state).endsWith('_concrete_powder');
const countByState = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const sevenBySeven = (minY, maxY, minZ, maxZ) => cellsIn({
  minX: 2105, maxX: 2111, minY, maxY, minZ, maxZ,
});

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07j: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09j: 'data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json',
  r09l: 'data/buildops/combined-zones-r09l-b07-wet-liner.release-manifest.json',
});

for (const required of [
  path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'),
  path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'),
]) invariant(fs.existsSync(abs(required)), `complete immutable member is missing: ${required}`);

const mechanisms = readJson(INPUTS.mechanisms);
const authorization = readJson(INPUTS.authorization);
const contract = readJson(INPUTS.releaseContract);
const relics = readJson(INPUTS.protectedRelics);
const r07j = readJson(INPUTS.r07j);
const r09j = readJson(INPUTS.r09j);
const r09l = readJson(INPUTS.r09l);
const capture = readJson(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;

invariant(b07.construction.length === 8134 && b07.interaction.length === 13608,
  'canonical B07 construction/interaction counts drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && authorization.revoked === false,
  'standing authorization is not active');
invariant(contract.releaseSequence.some(({ id }) => id === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'),
  'R09 release node no longer appears in the controlled release contract');
invariant(r07j.scope.canonicalOwner === 'P1-B07'
  && r09j.scope.canonicalOwner === 'Z06-PUBLIC-SHAFT-FITOUT'
  && r09l.scope.canonicalOwner === 'Z06-PUBLIC-SHAFT-FITOUT',
  'historic B07 ownership bindings drifted');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
// AnvilReader caches decoded chunks only after its first parse completes.
// Keep this sequential: a broad Promise.all would repeatedly decompress the
// same chunk before the cache is populated and turns a read-only survey into a
// CPU storm.
const readRecords = async (cells) => {
  const records = [];
  for (const cell of cells) records.push({ cell, state: await stateAt(cell) });
  return records;
};

const lowerVertical = sevenBySeven(-56, 8, -431, -425);
const northTransfer = sevenBySeven(5, 11, -431, -395);
const upperVertical = sevenBySeven(8, 72, -401, -395);
const broadWetBand = cellsIn({ minX: 2094, maxX: 2114, minY: 5, maxY: 17, minZ: -438, maxZ: -388 });
const lowerCap = [
  { x: 2109, y: 3, z: -429 },
  { x: 2109, y: 4, z: -429 },
];
const upperDeck = sevenBySeven(18, 18, -401, -395);
const r09jCap = [
  { x: 2105, y: 30, z: -397 },
  { x: 2105, y: 31, z: -397 },
];
const gravelChain = [27, 28, 29, 30].map((y) => ({ x: 2104, y, z: -396 }));
const headhouseShell = cellsIn({ minX: 2105, maxX: 2111, minY: 73, maxY: 76, minZ: -401, maxZ: -395 });
const headhouseInterior = cellsIn({ minX: 2106, maxX: 2110, minY: 73, maxY: 75, minZ: -400, maxZ: -396 });

const [transferRecords, wetBandRecords, lowerCapRecords, upperDeckRecords, capRecords, gravelRecords, headhouseRecords, headhouseInteriorRecords] = await Promise.all([
  readRecords(northTransfer), readRecords(broadWetBand), readRecords(lowerCap), readRecords(upperDeck),
  readRecords(r09jCap), readRecords(gravelChain), readRecords(headhouseShell), readRecords(headhouseInterior),
]);
const transferFluidRecords = transferRecords.filter(({ state }) => isFluid(state));
const wetBandFluidRecords = wetBandRecords.filter(({ state }) => isFluid(state));
const transferNonAirRecords = transferRecords.filter(({ state }) => !isAir(state));

const b07InteractionBounds = boundsOf(b07.interaction);
const chunks = new Set(b07.interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of chunks) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(blockEntity.x), y: Number(blockEntity.y), z: Number(blockEntity.z) };
    if (insideBounds(point, b07InteractionBounds)) blockEntities.push({ id: blockEntity.id ?? null, point });
  }
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= b07InteractionBounds.minX && position[0] < b07InteractionBounds.maxX + 1
      && position[1] >= b07InteractionBounds.minY && position[1] < b07InteractionBounds.maxY + 1
      && position[2] >= b07InteractionBounds.minZ && position[2] < b07InteractionBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? null, position });
    }
  }
}

const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const protectedIntersections = [];
for (const relic of relics.relics ?? []) {
  const hits = b07.interaction.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (hits.length) protectedIntersections.push({ relic: relic.key, ...classManifest(hits) });
}
const mapSymbol = (state) => {
  const name = stateName(state);
  if (isAir(state)) return '.';
  if (name === 'minecraft:water' || name === 'minecraft:bubble_column') return 'W';
  if (name === 'minecraft:gravel') return 'G';
  if (name === 'minecraft:polished_diorite') return 'D';
  if (name === 'minecraft:polished_andesite') return 'A';
  if (name === 'minecraft:smooth_stone_slab') return 's';
  if (name === 'minecraft:sea_lantern') return 'L';
  return '#';
};
const planSlice = async (y, minZ, maxZ) => {
  const rows = [];
  for (let z = minZ; z <= maxZ; z += 1) {
    const states = await Promise.all(Array.from({ length: 9 }, (_, offset) => stateAt({ x: 2104 + offset, y, z })));
    rows.push({ z, cells: states.map(mapSymbol).join('') });
  }
  return rows;
};
const slices = {
  lowerCapY3: await planSlice(3, -431, -425),
  transferY8: await planSlice(8, -431, -395),
  upperDeckY18: await planSlice(18, -401, -395),
  gravityCapY30: await planSlice(30, -401, -395),
  surfaceDeckY72: await planSlice(72, -402, -394),
  headhouseY73: await planSlice(73, -402, -394),
};

const gravelSupport = [];
for (const cell of gravelChain) {
  gravelSupport.push({
    cell,
    state: await stateAt(cell),
    directBelow: { x: cell.x, y: cell.y - 1, z: cell.z, state: await stateAt({ x: cell.x, y: cell.y - 1, z: cell.z }) },
  });
}

const routeDesign = {
  id: 'MP05-B07-THROUGH-ROUTE-EGRESS-01',
  intendedOutcome: 'One dry, contained, normally traversable B07 route from the lower lobby to a classified exterior receiver; no public or emergency-egress commissioning until all operating systems and two independent exits are separately proven.',
  requiredAtomicInterfaces: [
    {
      id: 'B07-WET-TRANSFER',
      geometry: classManifest(northTransfer),
      condition: `The exact north transfer contains ${transferFluidRecords.length} fluid/waterlogged cells and ${transferNonAirRecords.length} non-air cells; its wider R06 interaction band contains ${wetBandFluidRecords.length} fluid/waterlogged cells.`,
      requirement: 'An MP05-owned D05-style source-to-future treatment, contained receiver/displacement contract, dry structural liner, drainage/failure-state design, and ordered inverse that does not fabricate a fluid rollback state.',
      status: 'HOLD_NO_OPERATION',
    },
    {
      id: 'B07-R09J-GRAVITY-ISOLATION',
      geometry: classManifest([...r09jCap, ...gravelChain]),
      condition: 'The two-cell R09J cap is still closed and the four-cell gravel stack has an air terminal beneath its base.',
      requirement: 'A gravity migration/replacement doctrine whose final rollback never recreates unsupported falling gravel. A temporary support cannot satisfy exact inverse because its removal recreates the unsafe source state.',
      status: 'HOLD_NO_OPERATION',
    },
    {
      id: 'B07-EXTERIOR-RECEIVER',
      geometry: classManifest(headhouseShell),
      condition: `The R07J headhouse retains a ${headhouseInteriorRecords.filter(({ state }) => isAir(state)).length}/${headhouseInterior.length} air interior but all door-face decisions and any exterior receiver remain unowned by this route setout.`,
      requirement: 'A P1-B07 external doorway, classified landing/receiver, surface route, boundary/door failure state, access-control, lighting, smoke, power, drainage, and independent-egress design with current terrain/entity evidence.',
      status: 'HOLD_NO_OPERATION',
    },
  ],
  forbiddenShortcuts: [
    'Removing the R09J cap alone.',
    'Supporting the gravel temporarily and then removing support during rollback.',
    'Treating the R09L twelve-cell pond seal as resolution of the larger north-transfer wet interface.',
    'Opening a headhouse wall without a classified exterior receiver and boundary/failure-state package.',
    'Calling the existing lower stair, 91-surface upper inspection component, or a sign/light package a through-route or egress.',
  ],
  packageDisposition: 'NO_FORWARD_OR_ROLLBACK_OPERATIONS_EMITTED',
};

const report = {
  schemaVersion: 1,
  id: routeDesign.id,
  generatedAtUtc: GENERATED_AT,
  status: 'HELD_NO_SAFE_BOUNDED_FUNCTIONAL_PACKAGE_ON_COMPLETE_CURRENT_SOURCE',
  purpose: 'Current-source functional setout for B07 through-route/egress work. This replaces neither the accepted bounded R09K inspection component nor its exact safety holds.',
  source: {
    snapshotRoot: rel(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    completeSaveManifest: fileBinding(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
    completeMembers: { region: true, entities: true, poi: true, levelDat: true },
    regionSnapshotSha256: value('--region-sha256', 'f3ad99c25f5211fc17a0bd29fd82d0dad649fa4543f2f0a69a47449526907613'),
  },
  bindings: Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [key, fileBinding(filename)])),
  ownership: {
    canonicalB07Construction: classManifest(b07.construction),
    canonicalB07Interaction: classManifest(b07.interaction),
    constructionAndInteractionMatchCurrentDesign: hashCells(b07.construction) === b07System.exactExcavationReservation.coordinateSetSha256
      && hashCells(b07.interaction) === b07System.exactInteractionUnion.coordinateSetSha256,
    r07jOwner: r07j.scope.canonicalOwner,
    r09Owner: r09j.scope.canonicalOwner,
    routeOperationOwnershipGranted: false,
    protectedRelicIntersections: protectedIntersections,
  },
  currentComponents: {
    lowerDryStair: {
      bounds: classManifest(lowerVertical),
      retainedR09BCap: lowerCapRecords,
      disposition: 'AS_BUILT_TO_CLOSED_LOWER_HOLD_NOT_A_THROUGH_ROUTE',
    },
    wetNorthTransfer: {
      exactTransfer: classManifest(northTransfer),
      stateCensus: countByState(transferRecords),
      fluidRecords: transferFluidRecords,
      broadR06Band: { ...classManifest(broadWetBand), fluidCellCount: wetBandFluidRecords.length, fluidCoordinateSetSha256: hashCells(wetBandFluidRecords.map(({ cell }) => cell)) },
      disposition: 'RETAINED_WET_AND_UNEXCAVATED_INTERFACE',
    },
    upperDryStair: {
      bounds: classManifest(upperVertical),
      retainedDeck: { ...classManifest(upperDeck), states: countByState(upperDeckRecords) },
      r09jCap: capRecords,
      gravelSupport,
      disposition: 'R09K_RESTRICTED_INSPECTION_COMPONENT_ONLY',
    },
    surfaceHeadhouse: {
      shell: { ...classManifest(headhouseShell), states: countByState(headhouseRecords) },
      interior: { ...classManifest(headhouseInterior), airCellCount: headhouseInteriorRecords.filter(({ state }) => isAir(state)).length },
      disposition: 'R07J_DOORLESS_FAIL_CLOSED_HEADHOUSE',
    },
  },
  currentImmutableEntityAndBlockEntityCensus: {
    blockEntityIntersectionCount: blockEntities.length,
    blockEntities,
    savedEntityIntersectionCount: savedEntities.length,
    savedEntities,
    disposition: 'IMMUTABLE_SOURCE_ONLY; a new same-moment live-entity gate remains mandatory before any mutation.',
  },
  routeDesign,
  maps: {
    legend: '. air; W water/bubble; G gravel; D polished_diorite; A polished_andesite; s smooth_stone_slab; L sea_lantern; # other solid; columns x=2104..2112',
    slices,
  },
  releaseKernelRequiredAfterDesignResolution: [
    'Fresh same-moment complete immutable source and hash.',
    'Exact source-to-future fluid treatment and receiver/displacement contract.',
    'Exact gravity migration with a rollback proof that does not recreate falling source gravel.',
    'P1-B07 doorway/exterior receiver and full classified egress/service boundary contract.',
    'Complete canonical states, operation/inverse, protected-core and container exclusion or reviewed migration.',
    'Fresh live entity clearance, strict-noop parser/source/projected-rollback preflights, journalled execution, post snapshot, rollback-poststate preflight, and normal traversal plus endpoint/egress QA.',
  ],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationCount: 0, rollbackOperationCount: 0 },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);

const formatSlice = (rows) => `x: 2104..2112\n${rows.map(({ z, cells }) => `${String(z).padStart(4, ' ')}  ${cells}`).join('\n')}`;
const markdown = `# MP05 B07 through-route / egress functional setout\n\n**Status:** \`${report.status}\`  \n**Source:** \`${report.source.snapshotRoot}\` (complete capture \`${report.source.captureId}\`, region SHA-256 \`${report.source.regionSnapshotSha256}\`)  \n**Machine report:** [current-source report](../../../${rel(OUT)})\n\nThis is the next functional B07 design, not a cosmetic worklist and not a claim that the existing R09K inspection component is a through-route or egress. It performed no live call, RCON action, world mutation, or operation compilation.\n\n## Current functional topology\n\n| Segment | Present state | Functional disposition |\n|---|---|---|\n| Lower dry stair | R09B cap at \`(2109,3..4,-429)\` remains closed | lower closed hold |\n| North transfer | ${transferFluidRecords.length} exact fluid/waterlogged cells in the 7×7 transfer; ${wetBandFluidRecords.length} in the wider retained R06 band | wet/unexcavated interface |\n| Upper dry stair | R09J cap at \`(2105,30..31,-397)\`; gravel stack \`(2104,27..30,-396)\` has air beneath y=27 | 91-surface restricted inspection component only |\n| Surface | R07J doorless headhouse, ${headhouseInteriorRecords.filter(({ state }) => isAir(state)).length}/${headhouseInterior.length} interior-air cells | closed exterior hold |\n\n## Required atomic design gates\n\n${routeDesign.requiredAtomicInterfaces.map(({ id, condition, requirement }) => `### ${id}\n\n${condition}\n\nRequired before an operation can exist: ${requirement}\n`).join('\n')}\n## Rejectable shortcuts\n\n${routeDesign.forbiddenShortcuts.map((entry) => `- ${entry}`).join('\n')}\n\n## Exact source maps\n\nLegend: ${report.maps.legend}\n\n### Lower cap — y=3\n\n\`\`\`text\n${formatSlice(slices.lowerCapY3)}\n\`\`\`\n\n### North transfer / observation plane — y=8\n\n\`\`\`text\n${formatSlice(slices.transferY8)}\n\`\`\`\n\n### Upper dry-deck separation — y=18\n\n\`\`\`text\n${formatSlice(slices.upperDeckY18)}\n\`\`\`\n\n### R09J gravity isolation — y=30\n\n\`\`\`text\n${formatSlice(slices.gravityCapY30)}\n\`\`\`\n\n### Surface deck / headhouse plane\n\n\`\`\`text\ny=72\n${formatSlice(slices.surfaceDeckY72)}\n\ny=73\n${formatSlice(slices.headhouseY73)}\n\`\`\`\n\n## Release disposition\n\nNo forward or rollback operation exists on this source. The first eligible physical package must resolve all required interfaces as an integrated functional system, then pass a new full guarded release kernel and normal-traversal/end-point QA.\n`;

fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(abs(MARKDOWN_OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(MARKDOWN_OUT), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(OUT), markdown: rel(MARKDOWN_OUT), fluidTransferCells: transferFluidRecords.length, broadWetBandFluidCells: wetBandFluidRecords.length, sourceEntities: savedEntities.length, sourceBlockEntities: blockEntities.length, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
