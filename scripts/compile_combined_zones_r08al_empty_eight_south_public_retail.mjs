#!/usr/bin/env node
/** Compile the bounded Empty Eight south public-vacant-retail/BOH release. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T06:45:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r12r-post-20260822T053631Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r12r-live-20260822T053631Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-release-ledger',
  'data/world-review/combined-zones-r12r-live-20260822T053631Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08al-empty-eight-south-public-vacant-retail',
);
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r08al-empty-eight-south-public-vacant-retail';
const RELEASE_ID = 'CZ-R08AL-EMPTY-EIGHT-SOUTH-PUBLIC-VACANT-RETAIL';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS = 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const PF08_MANIFEST = 'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json';
const SMOKE_MANIFEST = 'data/buildops/combined-zones-r08t-empty-eight-south-smoke-boundary.release-manifest.json';
const RETAIL_MANIFESTS = [
  'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
];
const NORTH_RETAIL_MANIFESTS = [
  'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json',
  'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AL compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const design = readJson(DESIGN);
const contract = readJson(CONTRACT);
const authorization = readJson(AUTHORIZATION);
const protectedRelics = readJson(PROTECTED_RELICS);
const intake = readJson(INTAKE);
const sourceLedger = readJson(SOURCE_LEDGER);
const pf08Manifest = readJson(PF08_MANIFEST);
const smokeManifest = readJson(SMOKE_MANIFEST);
const retailManifests = RETAIL_MANIFESTS.map(readJson);
const northRetailManifests = NORTH_RETAIL_MANIFESTS.map(readJson);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not an accepted complete immutable save');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT), 'intake/snapshot mismatch');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'source ledger is not the accepted terminal post');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners?.includes('Z02-U1-CONCOURSE-MALL'), 'R08 concourse owner drifted');
const palette = new Map(design.d06.architecturalLanguage.palette.map((entry) => [entry.id, entry.block]));
invariant(palette.get('EE-P02') === 'minecraft:polished_andesite'
  && palette.get('EE-P03') === 'minecraft:smooth_stone'
  && palette.get('EE-P04') === 'minecraft:light_gray_concrete'
  && palette.get('EE-P05') === 'minecraft:red_terracotta'
  && palette.get('EE-P11') === 'minecraft:sea_lantern'
  && palette.get('EE-P13') === 'minecraft:polished_deepslate', 'frozen palette drifted');

const shells = design.d06.concourseAndRetail.retailShells
  .filter(({ wing }) => wing === 'south galleria');
const shellIds = shells.map(({ id }) => id);
invariant(shells.length === 12 && shellIds.includes('EE-R-S09'), 'south shell registry drifted');
const deliveredIds = new Set(retailManifests.flatMap((manifest) => manifest.scope.shellIds ?? []));
invariant(deliveredIds.size === 12 && shellIds.every((id) => deliveredIds.has(id)),
'accepted south-shell manifests no longer cover all twelve shells');

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

// Two public gallery segments north of the accepted south smoke plane. The
// exact x=1736..1747 source band is retained as a local suspended-gravity
// bulkhead, so it receives no block update and does not veto the other eleven
// bays. Each segment has its own PF08 stair.
const gallerySegments = [
  { id: 'west', minX: 1652, maxX: 1735, interiorMinX: 1653, interiorMaxX: 1734, stairX: 1728 },
  { id: 'east', minX: 1748, maxX: 1843, interiorMinX: 1749, interiorMaxX: 1842, stairX: 1752 },
];
for (const segment of gallerySegments) {
  for (const cell of cellsIn({ minX: segment.interiorMinX, maxX: segment.interiorMaxX, minY: 49, maxY: 49, minZ: 145, maxZ: 149 })) {
    setTarget(cell, 'minecraft:polished_andesite', 'gallery-envelope', 'public-gallery-floor');
  }
  for (const cell of cellsIn({ minX: segment.interiorMinX, maxX: segment.interiorMaxX, minY: 50, maxY: 52, minZ: 145, maxZ: 149 })) {
    setTarget(cell, 'minecraft:air', 'gallery-clearance', 'public-gallery-headroom');
  }
  for (const cell of cellsIn({ minX: segment.interiorMinX, maxX: segment.interiorMaxX, minY: 53, maxY: 53, minZ: 145, maxZ: 149 })) {
    setTarget(cell, 'minecraft:smooth_stone', 'gallery-envelope', 'public-gallery-ceiling');
  }
  for (const cell of cellsIn({ minX: segment.minX, maxX: segment.maxX, minY: 49, maxY: 53, minZ: 144, maxZ: 144 })) {
    setTarget(cell, 'minecraft:stone_bricks', 'gallery-envelope', 'public-gallery-north-wall');
  }
  for (const x of [segment.minX, segment.maxX]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 49, maxY: 53, minZ: 144, maxZ: 149 })) {
    setTarget(cell, 'minecraft:stone_bricks', 'gallery-envelope', 'public-gallery-segment-cap');
  }
}

const publicBayRecords = [];
const publicDoorCells = [];
const smokeMarkers = [];
const staffDoorShellIds = new Set(['EE-R-S04', 'EE-R-S09']);
for (const shell of shells) {
  const minX = shell.bounds.minX;
  const portalXs = [minX + 4, minX + 5, minX + 6, minX + 7];
  const publicDoorX = minX + 5;
  const staffDoorX = minX + 5;
  const internalDoorX = minX + 5;
  const publiclyOpened = shell.id !== 'EE-R-S06';
  if (publiclyOpened) {
    for (const x of portalXs) for (const y of [50, 51]) {
      setTarget({ x, y, z: 151 }, 'minecraft:air', 'gallery-clearance', 'vacant-bay-face-opening');
    }
    setTarget(
      { x: publicDoorX, y: 50, z: 150 },
      'minecraft:warped_door[facing=south,half=lower,hinge=left,open=false,powered=false]',
      'gallery-fixtures',
      'public-smoke-door-lower',
    );
    setTarget(
      { x: publicDoorX, y: 51, z: 150 },
      'minecraft:warped_door[facing=south,half=upper,hinge=left,open=false,powered=false]',
      'gallery-fixtures',
      'public-smoke-door-upper',
    );
    setTarget({ x: publicDoorX, y: 52, z: 150 }, 'minecraft:red_terracotta', 'gallery-envelope', 'public-door-marker');
    publicDoorCells.push({ x: publicDoorX, y: 50, z: 150 }, { x: publicDoorX, y: 51, z: 150 });
    smokeMarkers.push({ x: publicDoorX, y: 52, z: 150 });
    for (const x of [minX + 3, minX + 8]) {
      setTarget({ x, y: 52, z: 153 }, 'minecraft:sea_lantern', 'gallery-fixtures', 'vacant-bay-light');
    }
    setTarget({ x: publicDoorX, y: 53, z: 147 }, 'minecraft:sea_lantern', 'gallery-fixtures', 'public-gallery-light');
  }

  // Public bays remain empty. A new rear wall separates them from BOH.
  for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) for (const y of [50, 51]) {
    setTarget({ x, y, z: 154 }, 'minecraft:light_gray_concrete', 'backrooms-envelope', 'public-staff-boundary');
  }
  if (staffDoorShellIds.has(shell.id)) {
    setTarget(
      { x: staffDoorX, y: 50, z: 154 },
      'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]',
      'backrooms-fixtures',
      'restricted-staff-door-lower',
    );
    setTarget(
      { x: staffDoorX, y: 51, z: 154 },
      'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]',
      'backrooms-fixtures',
      'restricted-staff-door-upper',
    );
    for (const x of [staffDoorX - 1, staffDoorX + 1]) for (const y of [50, 51]) {
      setTarget({ x, y, z: 154 }, 'minecraft:red_terracotta', 'backrooms-envelope', 'restricted-warning-marker');
    }
  }

  // Each maintained rear room has a secured spine door, warm light, and two
  // non-explicit crimson booth seats. No tenant or entity is introduced.
  for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) for (const y of [50, 51]) {
    setTarget({ x, y, z: 157 }, 'minecraft:light_gray_concrete', 'backrooms-envelope', 'backroom-spine-divider');
  }
  setTarget(
    { x: internalDoorX, y: 50, z: 157 },
    'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]',
    'backrooms-fixtures',
    'backroom-secured-door-lower',
  );
  setTarget(
    { x: internalDoorX, y: 51, z: 157 },
    'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]',
    'backrooms-fixtures',
    'backroom-secured-door-upper',
  );
  for (const z of [155, 156]) for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) {
    for (const y of [50, 51]) setTarget({ x, y, z }, 'minecraft:air', 'backrooms-clearance', 'backroom-clearance');
  }
  for (const x of [minX + 2, minX + 3]) {
    setTarget(
      { x, y: 50, z: 156 },
      'minecraft:crimson_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
      'backrooms-fixtures',
      'nonexplicit-booth-seat',
    );
  }
  setTarget({ x: minX + 8, y: 52, z: 156 }, 'minecraft:shroomlight', 'backrooms-fixtures', 'backroom-warm-light');
  setTarget({ x: internalDoorX, y: 52, z: 157 }, 'minecraft:red_terracotta', 'backrooms-envelope', 'backroom-restricted-marker');
  if (publiclyOpened) publicBayRecords.push({
    shellId: shell.id,
    publicStatus: 'PUBLICLY_VIEWABLE_VACANT_SHELL',
    portal: { minX: minX + 4, maxX: minX + 7, minY: 50, maxY: 51, z: 151, cellCount: 8 },
    publicSmokeDoor: { x: publicDoorX, minY: 50, maxY: 51, z: 150 },
    publicBayBounds: { minX: minX + 1, maxX: shell.bounds.maxX - 1, minY: 50, maxY: 51, minZ: 152, maxZ: 153 },
    staffDoor: staffDoorShellIds.has(shell.id) ? { x: staffDoorX, minY: 50, maxY: 51, z: 154 } : null,
    occupied: false,
    tenantFitoutInstalled: false,
  });
}

// Continuous maintained service spine behind the individual rear rooms.
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 49, maxY: 49, minZ: 154, maxZ: 159 })) {
  setTarget(cell, 'minecraft:polished_blackstone', 'backrooms-envelope', 'backrooms-floor');
}
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 52, maxY: 52, minZ: 154, maxZ: 159 })) {
  setTarget(cell, 'minecraft:smooth_stone', 'backrooms-envelope', 'backrooms-ceiling');
}
for (const cell of cellsIn({ minX: 1657, maxX: 1842, minY: 50, maxY: 51, minZ: 158, maxZ: 158 })) {
  setTarget(cell, 'minecraft:air', 'backrooms-clearance', 'service-spine-clearance');
}
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 50, maxY: 51, minZ: 159, maxZ: 159 })) {
  setTarget(cell, 'minecraft:light_gray_concrete', 'backrooms-envelope', 'backrooms-rear-wall');
}
for (const x of [1656, 1843]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 50, maxY: 51, minZ: 154, maxZ: 159 })) {
  setTarget(cell, 'minecraft:light_gray_concrete', 'backrooms-envelope', 'backrooms-end-cap');
}

// Two eight-rise interior stairs from accepted PF08 circulation.
const stairCells = [];
for (const { stairX } of gallerySegments) {
  for (let index = 0; index < 8; index += 1) {
    const stair = { x: stairX, y: 41 + index, z: 153 - index };
    stairCells.push(stair);
    setTarget(
      stair,
      'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
      'gallery-fixtures',
      'pf08-gallery-stair',
    );
    for (const height of [1, 2]) {
      setTarget({ x: stair.x, y: stair.y + height, z: stair.z }, 'minecraft:air', 'gallery-clearance', 'stair-headroom');
    }
    for (const x of [stairX - 1, stairX + 1]) {
      if (x === stairX - 1 && index === 0) continue;
      for (let y = stair.y; y <= Math.min(48, stair.y + 2); y += 1) {
        setTarget({ x, y, z: stair.z }, 'minecraft:stone_bricks', 'gallery-envelope', 'stair-side-containment');
      }
    }
  }
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/container/control sources: ${JSON.stringify(hazards.slice(0, 20))}`);

const haloCells = uniqueCells(targetCells.flatMap((cell) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
`interaction halo fluid/container/control hazard: ${JSON.stringify([...haloFluid, ...haloForbidden].slice(0, 20))}`);
const unstableHaloGravity = [];
for (const finding of haloRecords.filter(({ state }) => isGravity(state))) {
  if (blockName(finding.state) === 'minecraft:pointed_dripstone'
    && finding.state.includes('vertical_direction=down')) continue;
  const belowKey = `${finding.cell.x},${finding.cell.y - 1},${finding.cell.z}`;
  const belowFinal = desired.get(belowKey)?.toState
    ?? stateToCommandString(await reader.blockState(finding.cell.x, finding.cell.y - 1, finding.cell.z));
  if (AIR.has(blockName(belowFinal)) || isFluid(belowFinal)) {
    unstableHaloGravity.push({ ...finding, belowFinal });
  }
}
invariant(unstableHaloGravity.length === 0,
  `retained halo gravity lacks support: ${JSON.stringify(unstableHaloGravity.slice(0, 40))}`);

// Exact source-gravity ordering proof for every changed gravity point.
const changedGravity = operations.filter(({ sourceState }) => isGravity(sourceState));
for (const entry of changedGravity) {
  if (blockName(entry.sourceState) === 'minecraft:pointed_dripstone'
    && entry.sourceState.includes('vertical_direction=down')) continue;
  if (AIR.has(blockName(entry.toState))) {
    invariant(entry.packageKey.includes('clearance'),
      `gravity removal is not in a top-down clearance package at ${entry.key}`);
  } else {
    invariant(!isGravity(entry.toState) && !isFluid(entry.toState),
      `gravity replacement is not a direct stable solid at ${entry.key}`);
  }
}

// Hard geometric exclusions and the exact smoke-plane supersession.
const future = uniqueCells(design.d06.futureInterfaces.interfaces.flatMap(({ sealDesign }) => cellsIn(sealDesign.bounds)));
const drainage = uniqueCells([
  ...design.d06.lifeSafety.drainage.trackDrainAndSumpReservations.flatMap(({ channel, sumpReservation }) => [
    ...cellsIn(channel.bounds), ...cellsIn(sumpReservation.bounds),
  ]),
  ...cellsIn(design.d06.lifeSafety.drainage.internalDischargeHeader.bounds),
  ...cellsIn(design.d06.lifeSafety.drainage.sealedBoundaryCap.bounds),
]);
const fireSpine = cellsIn(design.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation.bounds);
for (const [label, cells] of [['future-line seal', future], ['drainage', drainage], ['fire/service spine', fireSpine]]) {
  const intersection = cells.filter((cell) => targetKeys.has(cellKey(cell)));
  invariant(intersection.length === 0, `${label} intersection: ${JSON.stringify(intersection.slice(0, 20))}`);
}
const smokeBoundary = cellsIn(smokeManifest.scope.geometry.completeFailClosedBoundary.bounds);
const allowedSmoke = new Set([...publicDoorCells, ...smokeMarkers].map(cellKey));
const smokeIntersections = smokeBoundary.filter((cell) => targetKeys.has(cellKey(cell)));
invariant(smokeIntersections.length === 33
  && smokeIntersections.every((cell) => allowedSmoke.has(cellKey(cell))),
'south smoke-plane supersession is not exactly 22 door cells + 11 markers');
for (const relic of protectedRelics.relics) {
  invariant(!haloCells.some((cell) => inside(cell, relic.declaredInclusiveBounds)),
    `protected relic halo intersection: ${relic.key}`);
}

const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
'target/halo intersects a block entity or saved movable entity');

const packageOrder = [
  'gallery-envelope', 'backrooms-envelope',
  'gallery-clearance', 'backrooms-clearance',
  'gallery-fixtures', 'backrooms-fixtures',
];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
const isDoor = ({ toState }) => blockName(toState).endsWith('_door');
for (const [key, group] of packageGroups) {
  if (key.includes('clearance')) {
    group.sort((a, b) => b.cell.y - a.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  } else if (key.includes('fixtures')) {
    group.sort((a, b) => {
      if (isDoor(a) && isDoor(b)) {
        return a.cell.x - b.cell.x || a.cell.z - b.cell.z || a.cell.y - b.cell.y;
      }
      return Number(isDoor(a)) - Number(isDoor(b))
        || a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z;
    });
  } else {
    group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  }
  invariant(group.length > 0, `${key} compiled empty`);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-state transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const sourcePostIdentity = readJson(sourceLedger.postSnapshot.identity.path);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_R12R_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-CONCOURSE-MALL'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Open a bounded illuminated south public gallery to eleven intentionally vacant bays, retain one source-hazard shell capped, and complete a physically separated maintained non-public BOH/backrooms spine.',
    publicAccess: {
      accepted: true,
      surfaceEgressOrAccessibilityClaimed: false,
      entryFromAcceptedPf08Interior: {
        west: { x: 1728.5, y: 42, z: 152.5 },
        east: { x: 1752.5, y: 42, z: 152.5 },
      },
      galleryExploration: {
        west: { x: 1728.5, y: 50, z: 147.5 },
        east: { x: 1752.5, y: 50, z: 147.5 },
      },
      stairs: gallerySegments.map(({ id, stairX }) => ({ id, stairX, firstZ: 153, lastZ: 146, rise: 8 })),
      gallerySegments: gallerySegments.map(({ id, interiorMinX, interiorMaxX }) => ({ id, minX: interiorMinX, maxX: interiorMaxX, minY: 50, maxY: 52, minZ: 145, maxZ: 149 })),
      retainedSuspendedGravityBulkhead: { minX: 1736, maxX: 1747, minY: 41, maxY: 53, minZ: 144, maxZ: 149 },
      publicSmokeDoorCount: publicBayRecords.length,
      publicBayCount: publicBayRecords.length,
      retainedCappedSouthShellIds: ['EE-R-S06'],
      publicBayRecords,
    },
    backOfHouse: {
      nonPublic: true,
      maintained: true,
      restrictedPublicEntryDoorCount: staffDoorShellIds.size,
      restrictedPublicEntryShellIds: [...staffDoorShellIds],
      serviceSpine: { minX: 1657, maxX: 1842, minY: 50, maxY: 51, minZ: 158, maxZ: 158 },
      backroomCount: shells.length,
      securedBackroomDoorCount: shells.length,
      boothSeatCount: shells.length * 2,
      occupantsOrEntitiesIntroduced: 0,
      explicitContentIntroduced: false,
    },
    materialDoctrine: {
      publicFloor: 'minecraft:polished_andesite',
      publicCeiling: 'minecraft:smooth_stone',
      publicDoors: 'minecraft:warped_door',
      normalLight: 'minecraft:sea_lantern',
      staffFloor: 'minecraft:polished_blackstone',
      restrictedMarker: 'minecraft:red_terracotta',
      securedDoor: 'minecraft:iron_door',
      warmBackroomLight: 'minecraft:shroomlight',
      boothSeat: 'minecraft:crimson_stairs',
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
    },
    retainedBoundaries: {
      northRetailShellsCapped: true,
      n06ExceptionUntouched: true,
      futureRailStubSealCellCount: future.length,
      futureRailStubIntersectionCount: 0,
      drainageCellCount: drainage.length,
      drainageIntersectionCount: 0,
      fireServiceSpineCellCount: fireSpine.length,
      fireServiceSpineIntersectionCount: 0,
      southSmokePlaneOriginalCellCount: smokeBoundary.length,
      failClosedDoorSupersessionCellCount: smokeIntersections.length,
      southSmokePlaneOtherCellsUntouched: true,
      utilityVentMechanismInterfacesOpened: false,
      railOrPlatformBarrierOpened: false,
      theatreOrPrivateClubWingIncluded: false,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
      postCompleteSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
      postRegionSha256: sourcePostIdentity.sha256,
    },
    completeSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
    regionSnapshotSha256: sourcePostIdentity.sha256,
    targetSourceStateCensus: census(records, ({ sourceState }) => sourceState),
    targetGravityCount: changedGravity.length,
  },
  evidenceBindings: {
    design: fileBinding(DESIGN),
    contract: fileBinding(CONTRACT),
    authorization: fileBinding(AUTHORIZATION),
    protectedRelics: fileBinding(PROTECTED_RELICS),
    pf08Manifest: fileBinding(PF08_MANIFEST),
    southSmokeManifest: fileBinding(SMOKE_MANIFEST),
    southRetailManifests: RETAIL_MANIFESTS.map(fileBinding),
    northRetailManifests: NORTH_RETAIL_MANIFESTS.map(fileBinding),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    targetGravityCount: changedGravity.length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
    protectedRelicIntersectionCount: 0,
    futureLineSealIntersectionCount: 0,
    drainageIntersectionCount: 0,
    fireServiceSpineIntersectionCount: 0,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
    gravity: 'solid conversions bottom-up; clearances top-down; exact rollback reverses both',
  },
  operations: operationManifest,
  packages,
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: targetCells.length,
  operationCount: operations.length,
  packageCount: packages.length,
  targetGravityCount: changedGravity.length,
  publicBayCount: publicBayRecords.length,
  restrictedPublicEntryDoorCount: staffDoorShellIds.size,
}, null, 2)}\n`);
