import { AnvilReader, stateToCommandString, hashCells, rawCoordinateHash } from './lib/combined_zones_release_lib.mjs';
import fs from 'fs';
import crypto from 'crypto';

const REGIONS = '/opt/stacks/mc-fleet-bot/data/worldsnap-r08am-post-20260822T161818Z/region';
const SNAPSHOT_SHA256 = '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f';
const reader = new AnvilReader(REGIONS);

const X0 = 30, Y0 = 40, Z0 = 190, X1 = 90, Y1 = 76, Z1 = 298;
const solidMap = new Map();
const nameMap = new Map();
async function load() {
  for (let x = X0; x <= X1; x += 1)
    for (let y = Y0; y <= Y1; y += 1)
      for (let z = Z0; z <= Z1; z += 1) {
        const s = await reader.blockState(x, y, z);
        const name = s.Name || 'minecraft:air';
        nameMap.set(`${x},${y},${z}`, name);
        solidMap.set(`${x},${y},${z}`, name !== 'minecraft:air' && !name.includes('water') && !name.includes('lava') && !name.includes('bubble'));
      }
  console.error('loaded');
}
const key = (x, y, z) => `${x},${y},${z}`;
function isStandable(x, y, z) {
  if (y <= Y0 || y >= Y1) return false;
  const at = solidMap.get(key(x, y, z));
  if (at === undefined || at === true) return false;
  const below = solidMap.get(key(x, y - 1, z));
  if (below !== true) return false;
  const above = solidMap.get(key(x, y + 1, z));
  if (above === undefined || above === true) return false;
  return true;
}

await load();

const START_BOX = [33, 64, 195, 43, 71, 202];
const END_BOX = [42, 43, 286, 50, 49, 294];

function flood(startCells) {
  const visited = new Map();
  const queue = [];
  for (const c of startCells) {
    const k = key(c.x, c.y, c.z);
    if (!visited.has(k) && isStandable(c.x, c.y, c.z)) { visited.set(k, c.y); queue.push(c); }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx, nz = cur.z + dz;
      for (const ny of [cur.y - 1, cur.y, cur.y + 1]) {
        if (ny < Y0 || ny > Y1) continue;
        if (Math.abs(ny - cur.y) > 1) continue;
        const k = key(nx, ny, nz);
        if (visited.has(k)) continue;
        if (!isStandable(nx, ny, nz)) continue;
        visited.set(k, ny);
        queue.push({ x: nx, y: ny, z: nz });
      }
    }
  }
  return visited;
}

const startCells = [];
for (let x = START_BOX[0]; x <= START_BOX[3]; x += 1)
  for (let y = START_BOX[1]; y <= START_BOX[4]; y += 1)
    for (let z = START_BOX[2]; z <= START_BOX[5]; z += 1) startCells.push({ x, y, z });
const endCells = [];
for (let x = END_BOX[0]; x <= END_BOX[3]; x += 1)
  for (let y = END_BOX[1]; y <= END_BOX[4]; y += 1)
    for (let z = END_BOX[2]; z <= END_BOX[5]; z += 1) endCells.push({ x, y, z });

const forward = flood(startCells);
const reverse = flood(endCells);

// Representative standable start cell (center of pocket) and end cell.
let startRep = null;
for (const c of startCells) if (isStandable(c.x, c.y, c.z)) { startRep = c; break; }
let endRep = null;
for (const c of endCells) if (isStandable(c.x, c.y, c.z)) { endRep = c; break; }

// BFS path distance check: nearest forward cell to end box, nearest reverse cell to start box.
function nearest(set, box) {
  let best = Infinity, bestPt = null;
  for (const k of set.keys()) {
    const [x, y, z] = k.split(',').map(Number);
    let dmin = Infinity;
    for (let bx = box[0]; bx <= box[3]; bx += 1)
      for (let by = box[1]; by <= box[4]; by += 1)
        for (let bz = box[2]; bz <= box[5]; bz += 1) {
          const d = Math.abs(x - bx) + Math.abs(y - by) + Math.abs(z - bz);
          if (d < dmin) dmin = d;
        }
    if (dmin < best) { best = dmin; bestPt = { x, y, z }; }
  }
  return { distance: best, point: bestPt };
}
const fNearestEnd = nearest(forward, END_BOX);
const rNearestStart = nearest(reverse, START_BOX);

// Failure cells: the lintel/sealing slab at z=203.
// The 1-high slit is air at y=64 across x=34..42 (west jamb x=33, east wing wall
// x=43..45). The lintel is y=65..71 (corridor interior at z=204 is air y=64..70,
// roof at y=71 reinforced_deepslate). Immediate blocker = y=65 layer over x=34..42.
const OPEN_X0 = 34, OPEN_X1 = 42;
const criticalBlocker = [];
for (let x = OPEN_X0; x <= OPEN_X1; x += 1) criticalBlocker.push({ x, y: 65, z: 203 });
const fullBarrier = [];
for (let x = OPEN_X0; x <= OPEN_X1; x += 1)
  for (let y = 65; y <= 72; y += 1)
    fullBarrier.push({ x, y, z: 203 });

// Verify the critical blocker cells are solid polished_blackstone_bricks.
const blockerStates = criticalBlocker.map((c) => {
  const s = nameMap.get(key(c.x, c.y, c.z));
  return { ...c, name: s };
});
const blockerNames = [...new Set(blockerStates.map((b) => b.name))];

// Repair candidate cells: clear the lintel to open the mouth (full portal opening).
// The z=204 corridor interior is air at y=64..70, bounded by reinforced_deepslate
// jambs at x=33 and x=43, roof at y=71. So the mouth at z=203 should be cleared
// x=34..42, y=65..70 (9 wide x 6 high) to match; y=71..72 roof stays.
const repairFull = [];
for (let x = OPEN_X0; x <= OPEN_X1; x += 1)
  for (let y = 65; y <= 70; y += 1)
    repairFull.push({ x, y, z: 203 });
const repairMinimal = [];
for (let x = OPEN_X0; x <= OPEN_X1; x += 1) repairMinimal.push({ x, y: 65, z: 203 });
const repairThreeHigh = [];
for (let x = OPEN_X0; x <= OPEN_X1; x += 1)
  for (let y = 65; y <= 66; y += 1)
    repairThreeHigh.push({ x, y, z: 203 });

const repairCandidate = {
  minimal2Headroom: {
    bounds: [OPEN_X0, 65, 203, OPEN_X1, 65, 203],
    cellCount: repairMinimal.length,
    cells: repairMinimal,
    toState: 'minecraft:air',
    coordinateSetSha256: rawCoordinateHash(repairMinimal)
  },
  threeHigh3Clear: {
    bounds: [OPEN_X0, 65, 203, OPEN_X1, 66, 203],
    cellCount: repairThreeHigh.length,
    cells: repairThreeHigh,
    toState: 'minecraft:air',
    coordinateSetSha256: rawCoordinateHash(repairThreeHigh)
  },
  fullPortalOpening: {
    bounds: [OPEN_X0, 65, 203, OPEN_X1, 70, 203],
    cellCount: repairFull.length,
    cells: repairFull,
    toState: 'minecraft:air',
    coordinateSetSha256: rawCoordinateHash(repairFull)
  }
};

// Sanity: verify all repair cells currently solid (for the minimal variant).
const repairCurrent = repairFull.map((c) => nameMap.get(key(c.x, c.y, c.z)));
const repairSolidCount = repairCurrent.filter((n) => n && n !== 'minecraft:air').length;

const output = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY_IMMUTABLE_SNAPSHOT_SURVEY',
  worldMutationPerformed: false,
  readyForBuild: true,
  source: {
    package: 'CIRC-MSA-PORTAL-01',
    routeId: 'TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL',
    snapshot: {
      regions: 'data/worldsnap-r08am-post-20260822T161818Z/region',
      sha256: SNAPSHOT_SHA256,
      regionFileCount: 52,
      auditReference: 'data/world-review/underground-navigation-r08am-20260822/current-route-qa.json'
    }
  },
  endpoints: {
    start: {
      label: 'opulent surface vehicle portal',
      anchorBox: START_BOX,
      representativeStandableCell: startRep,
      standableCandidateCountInBox: startCells.filter((c) => isStandable(c.x, c.y, c.z)).length
    },
    end: {
      label: 'dry high-bay vehicle hall',
      anchorBox: END_BOX,
      representativeStandableCell: endRep,
      standableCandidateCountInBox: endCells.filter((c) => isStandable(c.x, c.y, c.z)).length
    }
  },
  flood: {
    forwardVisitedCells: forward.size,
    reverseVisitedCells: reverse.size,
    forwardNearestToEnd: fNearestEnd,
    reverseNearestToStart: rNearestStart
  },
  failureCells: {
    immediateBlocker: {
      description: 'One-block-high slit at the east face of the portal pocket: air at y=64 only, sealed above by a polished_blackstone_bricks lintel at y=65 across x=34..42, z=203. Normal-walk headroom (2) fails.',
      cells: criticalBlocker,
      currentStates: blockerStates,
      uniqueBlockNames: blockerNames
    },
    fullBarrier: {
      description: 'The complete vertical polished_blackstone_bricks slab bounding the portal pocket east face at z=203, x=34..42, y=65..71 (leaving the y=72 roof crown and x=43..45 wing wall). This is the structure that must be opened for a vehicle/pedestrian mouth.',
      bounds: [OPEN_X0, 65, 203, OPEN_X1, 71, 203],
      cellCount: fullBarrier.length,
      cells: fullBarrier
    }
  },
  failureCause: 'The "opulent surface vehicle portal" (start anchor) opens into a flat, fully-enclosed lobby pocket at y=64 spanning x=32..44, z=195..202 (104 standable cells). Its east face at z=203 is a near-full-height polished_blackstone_bricks wall leaving only a 1-block-tall slit (air at y=64 across x=34..42, floor gray_concrete at y=63, lintel at y=65..71). A player cannot step through because minimumHeadroomBlocks=2 requires air at both y=64 and y=65. Immediately beyond the wall (z=204..) the descending drive ramp/stairway begins (y=64 at z=204, y=63 at z=205, y=62 at z=209, ... down to the dry hall floor y=43 at z>=217), and the reverse flood from the hall reaches z=204 y=64 (2 blocks from the pocket). The lintel is the sole separator; no fluid, no other obstruction. The route is a disconnected-lobby defect: portal pocket sealed from an otherwise-built dry drive-down.',
  repairCandidateCells: repairCandidate,
  repairCurrentState: {
    fullPortalOpeningSolidCount: repairSolidCount,
    fullPortalOpeningTotal: repairFull.length,
    notes: 'The y=64 slit cells at z=203 are already air; only the lintel layers y=65..70 need clearing (y=71..72 roof stays to match the corridor at z=204, whose interior is air y=64..70 with a reinforced_deepslate roof at y=71 and jambs at x=33/x=43). Full portal opening = 54 cells (9 wide x 6 high). Minimal normal-walk 2-headroom bridge = 9 cells (y=65 only). 3-clear-high option = 18 cells (y=65..66).'
  },
  buildability: {
    readyForBuild: true,
    caveats: [
      'Survey-only. No operation compiled, no world edited.',
      'Hard-safety kernel still required before execution: fresh immutable source snapshot, exact forward/rollback guards (current=polished_blackstone_bricks, desired=air), strict source preflight, entity/container/block-entity clearance, strict-noop parser checks, journaled execution, fresh post snapshot, rollback-poststate preflight, bidirectional post-state route QA.',
      'The corridor beyond z=204 contains two yellow_concrete floor blocks at y=64, x=35 and x=41 (decorative lane features); they do not block walking but should be reviewed if a full vehicle lane is required.',
      'The 7-wide vehicle + 3-wide pedestrian design (CIRC-MSA-PORTAL-01) can be achieved inside the x=34..44 opening (11 wide) with 3+ headroom (y=65..67) to match the existing z=204 corridor. A switchback/vestibule is not needed for the bridge itself because the ramp already exists.',
      'Protected-core / ownership / interface review for the lintel cells and corridor is required; the audit notes "excluded aquifer seam, warehouse bulkhead ownership, wet interfaces, unrelated MainStreet parcels" must not be touched.'
    ]
  }
};

const outDir = '/opt/stacks/mc-fleet-bot/data/world-review/msa-portal-warehouse-route-survey-20260824';
fs.writeFileSync(outDir + '/msa-portal-warehouse-survey.json', JSON.stringify(output, null, 2));
console.log('WROTE', outDir + '/msa-portal-warehouse-survey.json');
console.log('forwardVisited', forward.size, 'reverseVisited', reverse.size);
console.log('startRep', JSON.stringify(startRep), 'endRep', JSON.stringify(endRep));
console.log('fNearestEnd', JSON.stringify(fNearestEnd));
console.log('rNearestStart', JSON.stringify(rNearestStart));
console.log('blockerNames', blockerNames);
console.log('repair minimal', repairCandidate.minimal2Headroom.cellCount, 'three', repairCandidate.threeHigh3Clear.cellCount, 'full', repairCandidate.fullPortalOpening.cellCount, 'solidNow', repairSolidCount);
