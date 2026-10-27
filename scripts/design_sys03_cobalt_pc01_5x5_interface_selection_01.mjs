#!/usr/bin/env node
/**
 * SYS03 PC-01 exact 5x5 interface selection — read-only design input only.
 *
 * This observes one immutable passive-rail post snapshot.  It intentionally
 * does not create target states, operations, a release manifest, RCON calls,
 * or an opening/commissioning assertion.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const PC01 = option('--pc01', 'data/world-review/sys03-cobalt-wl-rr-pc01-platform-access-readiness-01-passive-post-20260826T183111Z/sys03-cobalt-pc01-platform-access-readiness-01.json');
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-s1-passive-rail-post-20260826T183111Z');
const OUT = option('--out', 'data/world-review/sys03-cobalt-wl-rr-pc01-5x5-interface-selection-01-passive-post-20260826T183111Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const bytes = (value) => fs.readFileSync(abs(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = (value) => sha256(bytes(value));
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 PC-01 5x5 selection rejected: ${message}`); };
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame', 'minecraft:bell', 'minecraft:conduit',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const boxCells = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const expand = (bounds, amount = 1) => ({ minX: bounds.minX - amount, maxX: bounds.maxX + amount, minY: bounds.minY - amount, maxY: bounds.maxY + amount, minZ: bounds.minZ - amount, maxZ: bounds.maxZ + amount });
const overlaps = (a, b) => !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY || a.maxZ < b.minZ || a.minZ > b.maxZ);
const flattenBounds = (bounds) => ({ minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY, minZ: bounds.minZ, maxZ: bounds.maxZ });

fail(fs.existsSync(abs(PC01)), `missing ${PC01}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');
const pc01 = JSON.parse(bytes(PC01));
fail(pc01.status === 'SOURCE_BOUND_PC01_READINESS_ONLY__PUBLIC_ENDPOINTS_AND_RETURNS_UNACCEPTED', 'PC-01 readiness input is not default deny');
fail(pc01.disposition?.readOnly === true && pc01.disposition?.mutationAuthority === false && pc01.disposition?.publicStationOpen === false, 'PC-01 input claims authority/opening');
fail(pc01.source?.candidate?.sha256 && fileSha256(pc01.source.candidate.path) === pc01.source.candidate.sha256, 'PC-01 candidate source hash drifted');
fail(pc01.source?.immutableCobaltPost?.root === SNAPSHOT, 'PC-01 source is not this exact immutable post');
for (const required of [`${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`]) fail(fs.existsSync(abs(required)), `missing ${required}`);
const capture = JSON.parse(bytes(`${SNAPSHOT}/combined-zones-complete-save-capture.json`));
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'snapshot is not a complete immutable capture');
fail(fileSha256(`${SNAPSHOT}/combined-zones-complete-save-capture.json`) === pc01.source.immutableCobaltPost.captureManifestSha256, 'snapshot capture hash drifted from PC-01 input');

const observed = pc01.exactObservedScopes;
const wlArea = observed.westlight.surfaceStationArea;
const wlPlatform = observed.westlight.existingPlatformClearVolume;
const rrArea = observed.ravensreach.surfaceStationArea;
const rrService = observed.ravensreach.existingServiceSleeve;
const rrSecondRoute = observed.ravensreach.surveyedPublicSecondRoute;
const rrOriginalPad = observed.ravensreach.surveyedPublicSecondRouteComponents.surfaceEntryPad.bounds;
const rrHead = observed.ravensreach.surveyedPublicSecondRouteComponents.corridorHeadEdge.bounds;
const serviceCorridor = observed.retainedServiceCorridor;

// These anchors are deterministic source geometry, not release targets.  The
// two surface planes are 5x5 floor footprints.  The platform planes are 5-wide
// by 5-high, one-cell-thick interface faces because the existing platform
// clear volumes are four cells deep and cannot honestly contain a 5x5 floor.
const planes = [
  {
    id: 'WL-PC01-SURFACE-PUBLIC-5X5', station: 'Westlight PR-W02', kind: 'HORIZONTAL_5X5_CONCOURSE_FLOOR',
    bounds: { minX: -256, maxX: -252, minY: 66, maxY: 66, minZ: -464, maxZ: -460 },
    sourceEnvelope: { minX: -260, maxX: -248, minY: 66, maxY: 69, minZ: -470, maxZ: -456 },
    ownership: 'Westlight station plateau: future public-interface ownership record required; distinct from the passenger-railway platform liner and service corridor.',
    separation: ['Outside the retained Westlight platform clear volume.', 'Above and disjoint from the passive rail/service corridor elevation; no rail-walking interface exists.'],
    returnRequirement: 'Does not prove either public return. Two exact, independent public surface-to-platform returns remain required.',
  },
  {
    id: 'WL-PC01-PLATFORM-PUBLIC-5X5', station: 'Westlight PR-W02', kind: 'VERTICAL_5W_BY_5H_PLATFORM_INTERFACE_FACE',
    bounds: { minX: -248, maxX: -244, minY: 19, maxY: 23, minZ: -441, maxZ: -441 },
    sourceEnvelope: { minX: -253, maxX: -237, minY: 18, maxY: 23, minZ: -445, maxZ: -440 },
    ownership: 'Passenger-railway / COBALT-WL-PLATFORM-01: existing sealed platform volume remains protected; exact public-interface ownership and barrier contract are required.',
    separation: ['The selected face is inside the retained Westlight clear volume but does not touch the service corridor.', 'It is not a platform floor, rail edge, boarding zone, or public opening.'],
    returnRequirement: 'Does not prove platform access, platform edge treatment, or either independent public return.',
  },
  {
    id: 'RR-PC01-SURFACE-PUBLIC-5X5', station: 'Ravensreach PR-W04', kind: 'HORIZONTAL_5X5_CONCOURSE_FLOOR',
    bounds: { minX: -155, maxX: -151, minY: 62, maxY: 62, minZ: -392, maxZ: -388 },
    sourceEnvelope: { minX: -162, maxX: -150, minY: 62, maxY: 65, minZ: -400, maxZ: -388 },
    ownership: 'Ravensreach east-plateau shoulder: future public-interface ownership record required; RR-SE-1 stays outside the plane and remains protected service-only.',
    separation: ['Contains the surveyed RR-SE-2 3x3 source pad at X=-153..-151, Z=-390..-388 as a subset.', 'Expands west/south within the surveyed station plateau only; it does not borrow RR-SE-1.'],
    returnRequirement: 'The 3x3→5x5 observed footprint does not accept or build an RR public concourse or a second public return.',
  },
  {
    id: 'RR-PC01-PLATFORM-PUBLIC-5X5', station: 'Ravensreach PR-W04', kind: 'VERTICAL_5W_BY_5H_PLATFORM_INTERFACE_FACE',
    bounds: { minX: -154, maxX: -154, minY: 19, maxY: 23, minZ: -392, maxZ: -388 },
    sourceEnvelope: { minX: -155, maxX: -151, minY: 18, maxY: 23, minZ: -392, maxZ: -387 },
    ownership: 'Passenger-railway RR-SE-2 public-return design input: future platform/interface ownership must be explicit; RR-SE-1 has no public role.',
    separation: ['One cell east of the protected RR-SE-1 sleeve boundary at X=-156.', 'At the RR-SE-2/corridor-head design boundary only; no shared service route is accepted.'],
    returnRequirement: 'Does not prove an RR platform, public discharge, or the two independent public returns required by PC-01.',
  },
];
const planeShape = (plane) => {
  const dx = plane.bounds.maxX - plane.bounds.minX + 1;
  const dy = plane.bounds.maxY - plane.bounds.minY + 1;
  const dz = plane.bounds.maxZ - plane.bounds.minZ + 1;
  return { cellCount: dx * dy * dz, dimensions: { x: dx, y: dy, z: dz }, exactFiveByFive: dx * dy * dz === 25 && (dx === 5 && dz === 5 || dx === 5 && dy === 5 || dy === 5 && dz === 5) };
};
for (const plane of planes) {
  const shape = planeShape(plane);
  fail(shape.exactFiveByFive, `${plane.id} is not an exact one-cell-thick 5x5 plane`);
}
fail(planes.filter((plane) => plane.kind === 'HORIZONTAL_5X5_CONCOURSE_FLOOR').length === 2 && planes.filter((plane) => plane.kind.includes('PLATFORM_INTERFACE')).length === 2, 'expected exactly two concourse and two platform interface planes');
fail(planes[0].bounds.minX >= wlArea.minX && planes[0].bounds.maxX <= wlArea.maxX && planes[0].bounds.minZ >= wlArea.minZ && planes[0].bounds.maxZ <= wlArea.maxZ, 'Westlight surface plane leaves surveyed station area');
fail(planes[1].bounds.minX >= wlPlatform.minX && planes[1].bounds.maxX <= wlPlatform.maxX && planes[1].bounds.minY >= wlPlatform.minY && planes[1].bounds.maxY <= wlPlatform.maxY && planes[1].bounds.minZ >= wlPlatform.minZ && planes[1].bounds.maxZ <= wlPlatform.maxZ, 'Westlight platform face leaves observed clear volume');
fail(planes[2].bounds.minX >= rrArea.minX && planes[2].bounds.maxX <= rrArea.maxX && planes[2].bounds.minZ >= rrArea.minZ && planes[2].bounds.maxZ <= rrArea.maxZ, 'Ravensreach surface plane leaves surveyed station area');
fail(planes[2].bounds.minX <= rrOriginalPad.minX && planes[2].bounds.maxX >= rrOriginalPad.maxX && planes[2].bounds.minZ <= rrOriginalPad.minZ && planes[2].bounds.maxZ >= rrOriginalPad.maxZ, 'Ravensreach 5x5 plane does not contain the observed 3x3 source pad');
fail(!overlaps(planes[2].bounds, rrService) && !overlaps(planes[3].bounds, rrService), 'Ravensreach public plane overlaps RR-SE-1 service sleeve');
fail(planes[3].bounds.minX >= rrSecondRoute.minX && planes[3].bounds.maxX <= rrSecondRoute.maxX && planes[3].bounds.minY >= rrHead.minY && planes[3].bounds.maxY <= rrHead.maxY, 'Ravensreach platform face leaves RR-SE-2/corridor-head source envelope');

const region = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entities = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await region.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};
const summarize = async (cells) => {
  const records = [];
  for (const cell of cells) records.push({ ...cell, state: await stateAt(cell) });
  const states = Object.fromEntries([...records.reduce((result, record) => result.set(record.state, (result.get(record.state) ?? 0) + 1), new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const problems = {
    fluid: records.filter((record) => isFluid(record.state)),
    gravity: records.filter((record) => isGravity(record.state)),
    forbidden: records.filter((record) => isForbidden(record.state)),
  };
  return { cellCount: records.length, coordinateSetSha256: hashCells(cells), states, problems, records };
};
const blockEntityCensus = async (cells) => {
  const keys = new Set(cells.map(cellKey));
  const minX = Math.min(...cells.map((cell) => cell.x)); const maxX = Math.max(...cells.map((cell) => cell.x));
  const minZ = Math.min(...cells.map((cell) => cell.z)); const maxZ = Math.max(...cells.map((cell) => cell.z));
  const minY = Math.min(...cells.map((cell) => cell.y)); const maxY = Math.max(...cells.map((cell) => cell.y));
  const blockEntities = []; const savedEntities = [];
  for (let cx = Math.floor(minX / 16); cx <= Math.floor(maxX / 16); cx += 1) for (let cz = Math.floor(minZ / 16); cz <= Math.floor(maxZ / 16); cz += 1) {
    const chunk = await region.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entities.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3 && position[0] >= minX && position[0] <= maxX + 1 && position[1] >= minY && position[1] <= maxY + 1 && position[2] >= minZ && position[2] <= maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
    }
  }
  return { exactSourceBlockEntities: blockEntities, exactSourceSavedEntities: savedEntities };
};
const protectedRecords = [
  { id: 'RR-SE-1-SERVICE-3X3', bounds: rrService, rule: 'Protected service/rescue infrastructure only; no public circulation or shared return.' },
  { id: 'RETAINED-SERVICE-CORRIDOR', bounds: serviceCorridor, rule: 'Service-only; no public station route or platform access substitution.' },
  { id: 'RR-SE-2-SURVEYED-PUBLIC-RETURN-INPUT', bounds: rrSecondRoute, rule: 'Design input only; not an accepted public return or opening.' },
];
const planeReports = [];
for (const plane of planes) {
  const core = boxCells(plane.bounds);
  const halo = uniqueCells(boxCells(expand(plane.bounds)).filter((cell) => !new Set(core.map(cellKey)).has(cellKey(cell))));
  const [coreCensus, haloCensus, blockEntity] = await Promise.all([summarize(core), summarize(halo), blockEntityCensus(uniqueCells([...core, ...halo]))]);
  fail(coreCensus.problems.fluid.length === 0 && coreCensus.problems.gravity.length === 0 && coreCensus.problems.forbidden.length === 0, `${plane.id} core has observed fluid/gravity/forbidden hazard`);
  fail(blockEntity.exactSourceBlockEntities.length === 0, `${plane.id} exact immutable core/halo contains a block entity`);
  const protectedHaloContacts = protectedRecords.filter((record) => overlaps(expand(plane.bounds), record.bounds)).map(({ id, rule }) => ({ id, rule }));
  planeReports.push({
    ...plane,
    shape: planeShape(plane),
    candidateState: {
      sourceOnly: true,
      core: coreCensus,
      oneCellInteractionHalo: haloCensus,
      exactImmutableSourceBlockEntityAndEntityCensus: blockEntity,
      observedCoreSafety: 'NO_FLUID_NO_GRAVITY_NO_FORBIDDEN_NO_BLOCK_ENTITY',
      haloHazardsObserved: { fluid: haloCensus.problems.fluid.length, gravity: haloCensus.problems.gravity.length, forbidden: haloCensus.problems.forbidden.length, savedEntities: blockEntity.exactSourceSavedEntities.length },
    },
    protectedSeparation: { planeOverlapsServiceSleeve: overlaps(plane.bounds, rrService), oneCellHaloProtectedContacts: protectedHaloContacts },
    requiredFutureLiveGates: [
      'Fresh complete immutable source and exact re-census; this historical immutable census cannot become a live release clearance.',
      'Exact owner/interface acceptance for this public-facing plane and all halo contacts.',
      'Fresh protected-core, block-entity/container, and same-moment live-entity clearance.',
      'Canonical target states plus exact forward/rollback inverse and strict parser/source/post/rollback checks.',
      'Two independent public returns at this station, protected public/service separation, and independent post-state normal-walk QA without rail walking.',
    ],
    accepted: false,
  });
}
const map = () => {
  const minX = -266; const maxX = -144; const minZ = -474; const maxZ = -382; const left = 82; const top = 108; const width = 1110; const height = 470;
  const sx = (x) => left + ((x - minX) / (maxX - minX)) * width; const sz = (z) => top + ((z - minZ) / (maxZ - minZ)) * height;
  const box = (bounds, fill, stroke, label) => `<rect x="${sx(bounds.minX)}" y="${sz(bounds.minZ)}" width="${sx(bounds.maxX + 1) - sx(bounds.minX)}" height="${sz(bounds.maxZ + 1) - sz(bounds.minZ)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${sx(bounds.minX) + 4}" y="${sz(bounds.minZ) + 15}" class="label">${escape(label)}</text>`;
  const wlSurface = planes[0]; const wlPlatformFace = planes[1]; const rrSurface = planes[2]; const rrPlatformFace = planes[3];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760"><style>.title{font:700 22px system-ui;fill:#f1f5f9}.sub{font:13px system-ui;fill:#cbd5e1}.label{font:600 11px system-ui;fill:#f8fafc}.small{font:11px system-ui;fill:#cbd5e1}.note{font:600 12px system-ui;fill:#fde68a}</style><rect width="100%" height="100%" fill="#091321"/><text x="32" y="38" class="title">SYS03 PC-01 — exact observed 5×5 public-interface candidate planes</text><text x="32" y="61" class="sub">Source-bound selection contract only; every endpoint remains unaccepted and has zero mutation/opening authority.</text><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#12263a" stroke="#436277"/>${box(wlArea, '#eab30833', '#facc15', 'WL surface survey')} ${box(wlPlatform, '#22c55e33', '#86efac', 'WL existing platform clear')} ${box(wlSurface.bounds, '#60a5fa88', '#bfdbfe', 'WL 5×5 concourse')} ${box(rrArea, '#eab30833', '#facc15', 'RR surface survey')} ${box(rrService, '#fb718555', '#fda4af', 'RR-SE-1 service only')} ${box(rrSecondRoute, '#a78bfa22', '#c4b5fd', 'RR-SE-2 input')} ${box(rrSurface.bounds, '#60a5fa88', '#bfdbfe', 'RR 5×5 concourse')} ${box(rrHead, '#22c55e44', '#86efac', 'RR corridor head')}<line x1="${sx((wlPlatformFace.bounds.minX + wlPlatformFace.bounds.maxX + 1) / 2)}" y1="${sz(wlPlatformFace.bounds.minZ)}" x2="${sx((wlPlatformFace.bounds.minX + wlPlatformFace.bounds.maxX + 1) / 2)}" y2="${sz(wlPlatformFace.bounds.minZ) - 30}" stroke="#f8fafc" stroke-width="3"/><text x="${sx(wlPlatformFace.bounds.minX)}" y="${sz(wlPlatformFace.bounds.minZ) - 35}" class="label">WL 5W×5H face @ Z=-441</text><line x1="${sx(rrPlatformFace.bounds.minX)}" y1="${sz((rrPlatformFace.bounds.minZ + rrPlatformFace.bounds.maxZ + 1) / 2)}" x2="${sx(rrPlatformFace.bounds.minX) + 44}" y2="${sz((rrPlatformFace.bounds.minZ + rrPlatformFace.bounds.maxZ + 1) / 2)}" stroke="#f8fafc" stroke-width="3"/><text x="${sx(rrPlatformFace.bounds.minX) + 47}" y="${sz((rrPlatformFace.bounds.minZ + rrPlatformFace.bounds.maxZ + 1) / 2) + 4}" class="label">RR 5W×5H face @ X=-154</text><text x="82" y="622" class="note">RR 3×3→5×5: the original RR-SE-2 pad (X=-153..-151, Z=-390..-388) is contained inside the blue RR 5×5 observed plane; RR-SE-1 remains excluded.</text><text x="82" y="649" class="small">Platform markings are vertical interface faces, not platform floors: the existing clear volumes are only four cells deep. All target states, access/return geometry, ownership, and service barriers remain future gates.</text><text x="82" y="676" class="small">Every displayed plane passed only an immutable source core census for fluid/gravity/forbidden/block entities. A fresh complete snapshot, exact live entity clearance, protected/container audit, inverse, and normal-walk QA are still mandatory.</text><text x="82" y="703" class="small">No rail, public route, station, platform, power, rescue path, passenger service, RCON operation, or Minecraft world change is created by this document.</text></svg>`;
};
const design = {
  schemaVersion: 1,
  id: 'SYS03-COBALT-PC01-5X5-INTERFACE-SELECTION-01',
  status: 'SOURCE_BOUND_5X5_CANDIDATE_PLANES_ONLY__ALL_PUBLIC_ENDPOINTS_UNACCEPTED',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false },
  source: {
    pc01Readiness: { path: rel(PC01), sha256: fileSha256(PC01), status: pc01.status },
    immutableCobaltPost: { root: SNAPSHOT, captureId: capture.captureId, captureManifestSha256: fileSha256(`${SNAPSHOT}/combined-zones-complete-save-capture.json`) },
  },
  candidatePlanes: planeReports,
  selectionContract: {
    publicEndpointCount: 4,
    allPublicEndpointsAccepted: false,
    exactRRThreeByThreeDeficit: { originalPad: rrOriginalPad, selectedFiveByFivePlane: planes[2].bounds, status: 'OBSERVED_3X3_PAD_CONTAINED_IN_5X5_CANDIDATE__NOT_BUILT_OR_ACCEPTED' },
    serviceSeparation: { serviceSleeve: { id: 'RR-SE-1-SERVICE-3X3', bounds: rrService, status: 'PROTECTED_SERVICE_ONLY' }, rule: 'RR-SE-1 may not be relabelled, shared, or counted as public platform access, egress, or either independent public return.' },
    returns: 'No endpoint plane establishes a return. Each station still needs two independently accepted public surface-to-platform returns with post-state two-way normal-walk proof and no rail walking.',
    missingLiveGates: ['Fresh immutable complete source and exact source/halo state binding.', 'Accepted ownership/interface contracts for all targets and protected contacts.', 'Fresh fluid/gravity/BE/container/protected-core census and same-moment live entity clearance.', 'Canonical target states, exact forward/rollback inverse, strict parser/preflight/journal/post/rollback kernel.', 'Independent functional post QA for public/service separation, two independent returns, and passenger gate acceptance.'],
  },
  nonClaims: ['No candidate plane is a target state, platform floor, public concourse, egress, station opening, passenger route, guideway, rail, power system, rescue route, or commissioned service.', 'No operation, release manifest, execution authority, RCON call, or world mutation is emitted.', 'PC-01 through PC-08 remain unaccepted; R10 normal-alignment and north-turn fluid/gravity holds are not changed or resolved.'],
};
design.designIdentitySha256 = sha256(`${JSON.stringify(design, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-pc01-5x5-interface-selection-01.json`), `${JSON.stringify(design, null, 2)}\n`);
fs.writeFileSync(abs(`${OUT}/sys03-cobalt-pc01-5x5-interface-selection-map.svg`), `${map()}\n`);
fs.writeFileSync(abs(`${OUT}/SYS03-COBALT-PC01-5X5-INTERFACE-SELECTION-01.md`), `# SYS03 Cobalt PC-01 5×5 interface selection 01\n\n**Status:** \`${design.status}\`\n\n![Exact 5×5 candidate map](sys03-cobalt-pc01-5x5-interface-selection-map.svg)\n\nThis is a read-only selection contract from one immutable Cobalt passive-rail post snapshot. It records four **observed source planes**, not construction targets:\n\n- Westlight surface concourse: 5×5 floor at X=-256..-252, Y=66, Z=-464..-460.\n- Westlight platform interface: 5-wide × 5-high face at X=-248..-244, Y=19..23, Z=-441.\n- Ravensreach surface concourse: 5×5 floor at X=-155..-151, Y=62, Z=-392..-388. It contains the surveyed 3×3 RR-SE-2 pad as a subset.\n- Ravensreach platform interface: 5-wide × 5-high face at X=-154, Y=19..23, Z=-392..-388.\n\nThe existing Westlight platform is only four cells deep, so its public interface is honestly represented as a vertical 5×5 face—not a fabricated 5×5 platform floor. RR-SE-1 remains protected service-only, outside both Ravensreach public cores.\n\nEach core is censused from the immutable snapshot. This does **not** replace fresh source, entity, container/block-entity, protected-interface, fluid/gravity, canonical-target/inverse, execution-kernel, return, or post-state normal-walk checks. All four endpoints, PC-01, and passenger service remain unaccepted.\n`);
console.log(JSON.stringify({ status: design.status, output: rel(OUT), publicEndpointCount: design.selectionContract.publicEndpointCount, rrThreeByThreeDeficit: design.selectionContract.exactRRThreeByThreeDeficit.status, allPublicEndpointsAccepted: false, mutationAuthority: false }, null, 2));
