#!/usr/bin/env node
/**
 * MP11 / BKR C01 dimension-recovery whole-scope design gate.
 *
 * This is deliberately read-only.  It binds the still-substandard portal,
 * public, owner, and staff paths to one immutable source; inventories their
 * exact local containment envelopes; and emits a coordinate map plus the
 * conditions for the first *later* physical package.  It emits no operation
 * files, release manifest, RCON call, or mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-dimension-recovery-design-01-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const die = (condition, message) => { if (!condition) throw new Error(`MP11/BKR C01 dimension-recovery design rejected: ${message}`); };
const stateName = (state) => String(state).split('[', 1)[0];
const key = (point) => point.join(',');
const inBounds = (point, bounds) => point[0] >= bounds.minX && point[0] <= bounds.maxX
  && point[1] >= bounds.minY && point[1] <= bounds.maxY
  && point[2] >= bounds.minZ && point[2] <= bounds.maxZ;
const expand = (bounds, amount = 1) => ({
  minX: bounds.minX - amount, maxX: bounds.maxX + amount,
  minY: bounds.minY - amount, maxY: bounds.maxY + amount,
  minZ: bounds.minZ - amount, maxZ: bounds.maxZ + amount,
});
const pointsHash = (items) => sha256(items.map((item) => `${key(item.point)}=${item.state ?? item.id ?? ''}`).sort().join('\n'));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil',
  'minecraft:damaged_anvil', 'minecraft:pointed_dripstone',
]);
const CONTAINER_IDS = ['chest', 'barrel', 'shulker_box', 'furnace', 'smoker', 'blast_furnace',
  'hopper', 'dispenser', 'dropper', 'brewing_stand', 'beehive', 'bee_nest', 'jukebox',
  'campfire', 'soul_campfire'];

const SCOPES = [
  {
    id: 'portal', label: 'portal → L1 controlled approach', owner: 'Town Expansion / C01 bunker approach',
    accessClass: 'controlled pedestrian and vehicle approach', requiredEnvelope: '5-wide × 5-high',
    observedEnvelope: '2-wide × 2-high', route: 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
    bounds: { minX: 680, maxX: 812, minY: 40, maxY: 75, minZ: -90, maxZ: -40 },
    anchors: [
      { point: [695, 67, -52], role: 'portal forecourt return endpoint' },
      { point: [701, 42, -81], role: 'L1 return endpoint' },
    ],
  },
  {
    id: 'public', label: 'L1 → L3 public vertical', owner: 'Town Expansion / C01 public realm',
    accessClass: 'public', requiredEnvelope: '5-wide × 5-high common / 2-wide × 3-high stairs',
    observedEnvelope: '1-wide × 2-high at pinch', route: 'TE-ROUTE-C01-PUBLIC-VERTICAL',
    bounds: { minX: 834, maxX: 844, minY: 24, maxY: 45, minZ: -51, maxZ: -37 },
    anchors: [
      { point: [840, 42, -46], role: 'public pinch station 68' },
      { point: [838, 31, -43], role: 'public pinch station 85' },
    ],
  },
  {
    id: 'owner', label: 'L4 → owner-club vertical', owner: 'Town Expansion / C01 owner wing',
    accessClass: 'restricted owner', requiredEnvelope: '3-wide × 3-high', observedEnvelope: '1-wide × 2-high at pinch',
    route: 'TE-ROUTE-C01-OWNER-VERTICAL',
    bounds: { minX: 839, maxX: 847, minY: -10, maxY: 16, minZ: -53, maxZ: -45 },
    anchors: [
      { point: [845, 13, -46], role: 'owner pinch station 47' },
      { point: [846, -2, -51], role: 'owner pinch station 87' },
    ],
  },
  {
    id: 'service', label: 'back-of-house service backbone', owner: 'Town Expansion / C01 back-of-house',
    accessClass: 'restricted staff service', requiredEnvelope: '3-wide × 3-high', observedEnvelope: '1-wide × 7-high at pinches',
    route: 'TE-ROUTE-C01-SERVICE-BACKBONE',
    bounds: { minX: 859, maxX: 880, minY: 42, maxY: 48, minZ: -138, maxZ: -31 },
    anchors: [
      { point: [870, 43, -115], role: 'barrel-bounded service pinch A' },
      { point: [870, 43, -113], role: 'barrel-bounded service pinch B' },
      { point: [870, 43, -111], role: 'barrel-bounded service pinch C' },
    ],
  },
];

const snapshotRoot = abs(SNAPSHOT);
for (const required of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  die(fs.existsSync(path.join(snapshotRoot, required)), `missing complete immutable source member ${required}`);
}
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
die(capture.immutableCopy === true && typeof capture.captureId === 'string', 'source is not an immutable complete-save capture');
const outputDir = abs(OUT);
die(!fs.existsSync(outputDir), '--out must name a fresh directory');
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const blocks = new Map();
async function block(point) {
  const cacheKey = key(point);
  if (!blocks.has(cacheKey)) blocks.set(cacheKey, stateToCommandString(await reader.blockState(...point)));
  return blocks.get(cacheKey);
}

async function blockEntities(bounds) {
  const result = [];
  for (let chunkX = Math.floor(bounds.minX / 16); chunkX <= Math.floor(bounds.maxX / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(bounds.minZ / 16); chunkZ <= Math.floor(bounds.maxZ / 16); chunkZ += 1) {
      const chunk = await reader.chunk(chunkX, chunkZ);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
        if (!inBounds(point, bounds)) continue;
        result.push({ point, id: String(entity.id ?? 'unknown') });
      }
    }
  }
  result.sort((a, b) => key(a.point).localeCompare(key(b.point)) || a.id.localeCompare(b.id));
  return result;
}

async function hazardCensus(bounds) {
  const fluids = []; const gravity = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const point = [x, y, z]; const state = await block(point); const name = stateName(state);
        if (name === 'minecraft:water' || name === 'minecraft:flowing_water' || name === 'minecraft:lava'
          || name === 'minecraft:flowing_lava' || state.includes('waterlogged=true')) fluids.push({ point, state });
        if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) gravity.push({ point, state });
      }
    }
  }
  return { fluids, gravity };
}

async function surveyedScope(scope) {
  const envelope = expand(scope.bounds);
  const hazards = await hazardCensus(envelope);
  const entities = await blockEntities(envelope);
  const containers = entities.filter((entry) => CONTAINER_IDS.some((id) => entry.id.includes(id)));
  const anchors = [];
  for (const anchor of scope.anchors) anchors.push({ ...anchor, state: await block(anchor.point) });
  const boundaryHazards = [...hazards.fluids, ...hazards.gravity].filter((item) =>
    item.point[0] === envelope.minX || item.point[0] === envelope.maxX
    || item.point[1] === envelope.minY || item.point[1] === envelope.maxY
    || item.point[2] === envelope.minZ || item.point[2] === envelope.maxZ);
  return {
    ...scope,
    safetyEnvelope: envelope,
    anchorStates: anchors,
    fluidBoundary: { count: hazards.fluids.length, cellSetSha256: pointsHash(hazards.fluids), cells: hazards.fluids },
    gravityBoundary: { count: hazards.gravity.length, cellSetSha256: pointsHash(hazards.gravity), cells: hazards.gravity },
    blockEntityBoundary: {
      count: entities.length, cellSetSha256: pointsHash(entities), cells: entities,
      containerCount: containers.length, containerCellSetSha256: pointsHash(containers), containers,
    },
    boundaryTouchingHazardCount: boundaryHazards.length,
    boundaryTouchingHazardCellSetSha256: pointsHash(boundaryHazards),
  };
}

const surveyed = [];
for (const scope of SCOPES) surveyed.push(await surveyedScope(scope));
const portal = surveyed.find((scope) => scope.id === 'portal');
const service = surveyed.find((scope) => scope.id === 'service');
const allFluid = surveyed.flatMap((scope) => scope.fluidBoundary.cells.map((cell) => ({ ...cell, scope: scope.id })));
const allGravity = surveyed.flatMap((scope) => scope.gravityBoundary.cells.map((cell) => ({ ...cell, scope: scope.id })));
const servicePinchFlanks = [];
for (const z of [-115, -113, -111]) {
  for (const x of [869, 871]) {
    const point = [x, 43, z]; servicePinchFlanks.push({ point, state: await block(point) });
  }
}
die(servicePinchFlanks.every((entry) => stateName(entry.state) === 'minecraft:barrel'),
  'current source no longer matches the six barrel-bounded service pinch cells; refresh the whole design input');

const panel = (scope, x, y) => {
  const b = scope.safetyEnvelope;
  const hazards = scope.fluidBoundary.count + scope.gravityBoundary.count;
  const fill = hazards ? '#6e3b36' : '#254a46';
  const entity = scope.blockEntityBoundary.containerCount ? `containers ${scope.blockEntityBoundary.containerCount}` : 'containers 0';
  return `<g transform="translate(${x} ${y})"><rect width="560" height="218" rx="10" fill="#152238" stroke="#587089"/>`
    + `<text x="22" y="31" class="title">${scope.label}</text><text x="22" y="56" class="mono">${scope.route} · ${scope.accessClass}</text>`
    + `<rect x="28" y="78" width="224" height="108" fill="${fill}" stroke="#c2d2df"/><text x="40" y="104" class="mono">x ${b.minX}..${b.maxX}</text><text x="40" y="127" class="mono">y ${b.minY}..${b.maxY}</text><text x="40" y="150" class="mono">z ${b.minZ}..${b.maxZ}</text><text x="40" y="173" class="mono">1-cell safety halo</text>`
    + `<text x="278" y="101" class="mono">required: ${scope.requiredEnvelope}</text><text x="278" y="125" class="mono">observed: ${scope.observedEnvelope}</text><text x="278" y="149" class="mono">fluid cells: ${scope.fluidBoundary.count}</text><text x="278" y="173" class="mono">gravity cells: ${scope.gravityBoundary.count}</text><text x="278" y="197" class="mono">${entity}</text></g>`;
};
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="660" viewBox="0 0 1240 660"><rect width="1240" height="660" fill="#0d1523"/><style>.title{font:700 18px system-ui;fill:#eef6ff}.head{font:700 26px system-ui;fill:#eef6ff}.mono{font:13px ui-monospace,monospace;fill:#c5d6e4}</style><text x="34" y="42" class="head">MP11 / BKR C01 dimension-recovery: coordinate safety map</text><text x="34" y="68" class="mono">immutable source ${rel(SNAPSHOT)} · read-only design gate · no operations</text>${panel(surveyed[0], 34, 94)}${panel(surveyed[1], 646, 94)}${panel(surveyed[2], 34, 336)}${panel(surveyed[3], 646, 336)}<text x="34" y="598" class="mono">Portal gravity may be contained only after its boundary-touching components are made finite. Public/owner are protected switchback redesigns; service is container-migration-or-bypass only.</text><text x="34" y="622" class="mono">All four routes require two independently proven normal-walk returns before any access-class upgrade or opening claim.</text></svg>\n`;

const base = {
  schemaVersion: 1,
  id: 'MP11-BKR-C01-DIMENSION-RECOVERY-DESIGN-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'HOLD_SOURCE_BOUND_WHOLE_SCOPE_DESIGN_REQUIRED_BEFORE_PHYSICAL_DIMENSION_RECOVERY',
  mode: 'READ_ONLY_DESIGN_GATE_NO_OPERATIONS', mutationAuthority: false, liveWorldMutated: false,
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc },
  functionalDefect: {
    description: 'C01 approach and vertical circulation retain substandard clear envelopes; this blocks the controlled 5×5 approach, public common circulation, restricted owner return, and 3×3 BOH return.',
    observed: surveyed.map((scope) => ({ route: scope.route, requiredEnvelope: scope.requiredEnvelope, observedEnvelope: scope.observedEnvelope })),
  },
  scopes: surveyed.map((scope) => ({
    id: scope.id, label: scope.label, route: scope.route, owner: scope.owner, accessClass: scope.accessClass,
    requiredEnvelope: scope.requiredEnvelope, observedEnvelope: scope.observedEnvelope, bounds: scope.bounds,
    safetyEnvelope: scope.safetyEnvelope, anchorStates: scope.anchorStates,
    fluidBoundary: scope.fluidBoundary, gravityBoundary: scope.gravityBoundary,
    blockEntityBoundary: scope.blockEntityBoundary, boundaryTouchingHazardCount: scope.boundaryTouchingHazardCount,
    boundaryTouchingHazardCellSetSha256: scope.boundaryTouchingHazardCellSetSha256,
  })),
  exactServicePinchBoundary: { cells: servicePinchFlanks, cellSetSha256: pointsHash(servicePinchFlanks), allContainersConfirmed: true },
  safetyEnvelope: {
    noFluidAssumption: false,
    totalFluidCells: allFluid.length, totalFluidCellSetSha256: pointsHash(allFluid),
    totalGravityCells: allGravity.length, totalGravityCellSetSha256: pointsHash(allGravity),
    portalBoundaryTouchingHazardCount: portal.boundaryTouchingHazardCount,
    serviceContainerCount: service.blockEntityBoundary.containerCount,
    protectedCoreExclusion: 'No physical package may touch a container, block entity, protected tread, structural slab, decorative column, or unknown state. A reviewed exact migration may replace exclusion only for the explicitly inventoried service containers.',
    entityRequirement: 'Fresh live-entity clearance remains mandatory immediately before a later physical mutation; this immutable design gate does not claim live entity clearance.',
  },
  requiredInterfaces: [
    { owner: 'Town Expansion / C01 bunker approach', responsibility: 'portal → L1 5×5 controlled spine and gravity boundary' },
    { owner: 'Town Expansion / C01 public realm', responsibility: 'public vertical, common nodes, protected switchback redesign' },
    { owner: 'Town Expansion / C01 owner wing', responsibility: 'restricted owner vertical redesign and return' },
    { owner: 'Town Expansion / C01 back-of-house', responsibility: 'barrel migration or alternate staff bypass; no lost container contents' },
  ],
  returnAndEgressRequirements: [
    'Two independently evidenced normal-walk returns are required for every altered route: the original portal ↔ L1 path and a separately owned emergency/alternate egress path that does not use the same stair flight, container aisle, or gravity-containment boundary.',
    'The public and restricted routes require directed forward and inverse path proofs after each physical package; no route, public access, or commissioning claim follows from this design gate.',
    'Every physical package must preserve the untouched route families and their access classifications through an immutable post-state route QA.',
  ],
  drainageAndContainment: [
    'Water, lava, bubble columns, waterlogged blocks, gravity blocks, and their receiver/overflow paths must be enumerated across the exact package interaction set before mutation.',
    'The portal gravity boundary is not finite in this design envelope. Expand only from recorded boundary contacts, then use a supported permanent liner/plug or a separated dry bypass; inverse order must never recreate a falling or live-fluid path.',
    'No drainage receiver or fluid diversion is accepted by inference. Any future receiver must have exact source/target/rollback states and its own finite overflow boundary.',
  ],
  firstPhysicalPackageCondition: {
    id: 'C01-DIMENSION-PHYSICAL-01',
    permittedPurpose: 'A finite portal-approach gravity containment/liner or fully separated dry bypass only; it is not a widening, route opening, or access-class upgrade.',
    mustAllPass: [
      'The portal gravity components that touch the recorded safety-envelope boundary are expanded to a complete finite component inventory.',
      'The exact package cell set, 1-cell interaction halo, all fluids/waterlogged states, gravity supports, receivers/overflows, block entities, protected-core exclusions, and source states are complete and canonical.',
      'The package has a flow-ordered forward sequence and exact inverse that never creates a live-fluid or falling-gravity path; strict-noop forward and rollback parser checks pass.',
      'Fresh live-entity clearance passes and the complete source is rebound immediately before mutation.',
      'Both the original portal ↔ L1 return and an independent alternate/emergency return have accepted directed path proofs; all untouched C01 routes retain their required proofs.',
      'The scoped runner journals mutation, captures a fresh immutable post snapshot, proves post containment/route preservation, and proves rollback against that post source.',
    ],
    explicitHardStops: ['Any unknown or boundary-touching fluid/gravity component', 'Any unreviewed container/block-entity move', 'Any protected switchback/tread/decorative/structural cell in the physical interaction set', 'Missing independent return/egress proof'],
  },
  nonClaims: ['No operation files or release manifest emitted.', 'No RCON, Minecraft, fleet API, or live-world action.', 'No container migration, fluid/gravity containment, widening, route opening, access upgrade, public commissioning, or egress approval.'],
};
const report = { ...base, designIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'mp11-bkr-c01-dimension-recovery-design-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'mp11-bkr-c01-dimension-recovery-coordinate-map.svg'), mapSvg);
fs.writeFileSync(path.join(outputDir, 'MP11-BKR-C01-DIMENSION-RECOVERY-DESIGN-01.md'), `# MP11 / BKR C01 dimension-recovery design gate 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only design input; no operations or mutation authority.\n\n![Coordinate safety map](mp11-bkr-c01-dimension-recovery-coordinate-map.svg)\n\nThe fresh immutable source confirms a real functional defect: portal, public, owner, and staff circulation are below their respective required clear envelopes. The whole-scope recovery is held because the portal gravity boundary is not finite and the service pinches are bounded by exact barrel containers. The public and owner defects are protected switchback redesigns, not raw-rock widening.\n\nThe first possible physical package is **C01-DIMENSION-PHYSICAL-01**, a finite gravity-containment liner or fully separated dry bypass only after every condition in the JSON report passes. It cannot widen, open, or reclassify a route.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(outputDir), mutationAuthority: false, totalFluidCells: allFluid.length, totalGravityCells: allGravity.length, serviceContainers: service.blockEntityBoundary.containerCount }, null, 2));
