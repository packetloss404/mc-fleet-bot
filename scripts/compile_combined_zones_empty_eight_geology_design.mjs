#!/usr/bin/env node
/**
 * Compile the fail-closed Phase 1 Empty Eight and geology design record.
 *
 * This is an offline design compiler. It reads planning files, derives exact
 * reservation cell sets, and writes JSON/Markdown. It never reads a live
 * world, connects to Minecraft/RCON/services, or emits block operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-04T16:18:57Z');
const MASTERPLAN = path.resolve(value(
  '--masterplan',
  'docs/masterplans/05-combined-zones/MASTERPLAN.md',
));
const COORDINATES = path.resolve(value(
  '--coordinates',
  'docs/masterplans/05-combined-zones/site-coordinates.json',
));
const NORMALIZED_COORDINATES = path.resolve(value(
  '--normalized-coordinates',
  'docs/masterplans/04-combined-complex/02-design/site-coordinates.json',
));
const NORMALIZED_BRIEF = path.resolve(value(
  '--normalized-brief',
  'docs/masterplans/04-combined-complex/04-contractor/contractor-brief.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.md',
));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sourceBinding(filename, role) {
  const data = fs.readFileSync(filename);
  return {
    path: relative(filename),
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

function key({ x, y, z }) {
  return `${x},${y},${z}`;
}

function sortCells(cells) {
  return [...cells].sort((left, right) => (
    left.x - right.x || left.y - right.y || left.z - right.z
  ));
}

function setRecord(cells, bounds = null) {
  const sorted = sortCells(cells);
  assert(new Set(sorted.map(key)).size === sorted.length, 'cell set contains duplicates');
  const derivedBounds = sorted.length ? {
    minX: Math.min(...sorted.map(({ x }) => x)),
    maxX: Math.max(...sorted.map(({ x }) => x)),
    minY: Math.min(...sorted.map(({ y }) => y)),
    maxY: Math.max(...sorted.map(({ y }) => y)),
    minZ: Math.min(...sorted.map(({ z }) => z)),
    maxZ: Math.max(...sorted.map(({ z }) => z)),
  } : null;
  if (bounds) assert(JSON.stringify(derivedBounds) === JSON.stringify(bounds), 'cell-set bounds drift');
  return {
    bounds: derivedBounds,
    cellCount: sorted.length,
    cellSetSha256: sha256(sorted.map(key).join('\n')),
  };
}

function cuboid(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function pointLine(from, to) {
  const varying = ['x', 'y', 'z'].filter((axis) => from[axis] !== to[axis]);
  assert(varying.length <= 1, 'pointLine accepts only axis-aligned lines');
  if (!varying.length) return [{ ...from }];
  const axis = varying[0];
  const low = Math.min(from[axis], to[axis]);
  const high = Math.max(from[axis], to[axis]);
  return Array.from({ length: high - low + 1 }, (_, offset) => ({
    ...from,
    [axis]: low + offset,
  }));
}

function without(cells, excluded) {
  const excludedKeys = new Set(excluded.map(key));
  return cells.filter((cell) => !excludedKeys.has(key(cell)));
}

function intersectionCount(left, right) {
  const rightKeys = new Set(right.map(key));
  return left.reduce((count, cell) => count + Number(rightKeys.has(key(cell))), 0);
}

function inside(bounds, outer) {
  return bounds.minX >= outer.minX && bounds.maxX <= outer.maxX
    && bounds.minY >= outer.minY && bounds.maxY <= outer.maxY
    && bounds.minZ >= outer.minZ && bounds.maxZ <= outer.maxZ;
}

const coordinates = readJson(COORDINATES);
const z02 = coordinates.zones.find(({ id }) => id === 'Z02');
assert(z02, 'missing Z02');
const terminal = z02.hiddenSubway?.terminal;
assert(terminal?.id === 'Z02-U1', 'missing Z02-U1 Empty Eight');
assert(terminal.trackCount === 8, 'Empty Eight track count drift');
assert(terminal.platformCount === 8, 'Empty Eight platform count drift');
assert(terminal.concourse?.emptyRetailShells === 24, 'Empty Eight retail count drift');
assert(terminal.futureInterfaces?.count === 8, 'Empty Eight interface count drift');
assert(terminal.lifeSafety?.independentEgressRoutes === 2, 'Empty Eight egress count drift');
assert(terminal.lifeSafety?.accessibleRoutes === 2, 'Empty Eight accessible-route count drift');

const shellBounds = terminal.bounds;
assert(JSON.stringify(shellBounds) === JSON.stringify({
  minX: 1632,
  maxX: 1872,
  minY: 38,
  maxY: 54,
  minZ: 40,
  maxZ: 160,
}), 'Empty Eight shell bounds drift');

const palette = [
  { id: 'EE-P01', block: 'minecraft:stone_bricks', role: 'primary lined shell and smoke-rated wall field' },
  { id: 'EE-P02', block: 'minecraft:polished_andesite', role: 'monumental columns, portals, and hard-wearing trim' },
  { id: 'EE-P03', block: 'minecraft:smooth_stone', role: 'vault and mezzanine soffits' },
  { id: 'EE-P04', block: 'minecraft:light_gray_concrete', role: 'quiet wall panels and retail-shell lining' },
  { id: 'EE-P05', block: 'minecraft:red_terracotta', role: 'restrained civic accent and orientation band' },
  { id: 'EE-P06', block: 'minecraft:chiseled_stone_bricks', role: 'discovery marker and threshold detail' },
  { id: 'EE-P07', block: 'minecraft:polished_blackstone', role: 'platform edge and service datum' },
  { id: 'EE-P08', block: 'minecraft:yellow_concrete', role: 'high-contrast platform warning band' },
  { id: 'EE-P09', block: 'minecraft:iron_bars', role: 'platform-barrier structure and protected plant grille' },
  { id: 'EE-P10', block: 'minecraft:glass_pane', role: 'platform-barrier vision panels' },
  { id: 'EE-P11', block: 'minecraft:sea_lantern', role: 'normal and emergency-design lighting point' },
  { id: 'EE-P12', block: 'minecraft:deepslate_tiles', role: 'drainage channels, sumps, and wet-service datum' },
  { id: 'EE-P13', block: 'minecraft:polished_deepslate', role: 'default-closed future-interface cap' },
  { id: 'EE-P14', block: 'minecraft:blue_glazed_terracotta', role: 'accessible-route and life-safety wayfinding field' },
];

const discoveryEnvelope = {
  minX: 1772,
  maxX: 1788,
  minY: 62,
  maxY: 70,
  minZ: -257,
  maxZ: -242,
};
const discoveryCueCells = [
  { x: 1780, y: 68, z: -244 },
  { x: 1780, y: 68, z: -243 },
  { x: 1780, y: 68, z: -242 },
  { x: 1779, y: 69, z: -244 },
  { x: 1781, y: 69, z: -244 },
];

const shopShells = [];
for (const wing of [
  { id: 'N', name: 'north galleria', minZ: 41, maxZ: 49, entranceZ: 49 },
  { id: 'S', name: 'south galleria', minZ: 151, maxZ: 159, entranceZ: 151 },
]) {
  for (let index = 0; index < 12; index += 1) {
    const minX = 1656 + index * 16;
    const bounds = {
      minX,
      maxX: minX + 11,
      minY: 49,
      maxY: 52,
      minZ: wing.minZ,
      maxZ: wing.maxZ,
    };
    const cells = cuboid(bounds);
    shopShells.push({
      id: `EE-R-${wing.id}${String(index + 1).padStart(2, '0')}`,
      wing: wing.name,
      ordinalInWing: index + 1,
      bounds,
      entrancePlane: { y: 49, z: wing.entranceZ, minX, maxX: minX + 11 },
      state: 'CAPPED_EMPTY_FUTURE_TENANT_SHELL',
      tenantFitOutAuthorized: false,
      ...setRecord(cells, bounds),
    });
  }
}
assert(shopShells.length === 24, 'retail shell schedule does not contain 24 shells');
for (let left = 0; left < shopShells.length; left += 1) {
  for (let right = left + 1; right < shopShells.length; right += 1) {
    assert(
      intersectionCount(cuboid(shopShells[left].bounds), cuboid(shopShells[right].bounds)) === 0,
      `retail shells overlap: ${shopShells[left].id}/${shopShells[right].id}`,
    );
  }
}

const platformDesigns = terminal.trackCenterlinesZ.map((trackZ, index) => {
  const platformBounds = {
    minX: terminal.platforms.minX,
    maxX: terminal.platforms.maxX,
    minY: terminal.railY + 1,
    maxY: terminal.railY + 1,
    minZ: trackZ + terminal.platforms.offsetFromAssignedTrackZ.min,
    maxZ: trackZ + terminal.platforms.offsetFromAssignedTrackZ.max,
  };
  const barrierAll = cuboid({
    minX: platformBounds.minX,
    maxX: platformBounds.maxX,
    minY: 42,
    maxY: 43,
    minZ: platformBounds.minZ,
    maxZ: platformBounds.minZ,
  });
  const gateBays = [1664, 1688, 1712, 1736].flatMap((minX) => cuboid({
    minX,
    maxX: minX + 2,
    minY: 42,
    maxY: 43,
    minZ: platformBounds.minZ,
    maxZ: platformBounds.minZ,
  }));
  const barrierCells = without(barrierAll, gateBays);
  const lightCells = [1660, 1676, 1692, 1708, 1724, 1740, 1748]
    .map((x) => ({ x, y: 46, z: platformBounds.maxZ }));
  return {
    id: `EE-PF-${String(index + 1).padStart(2, '0')}`,
    assignedTrack: index + 1,
    trackCenterlineZ: trackZ,
    surface: setRecord(cuboid(platformBounds), platformBounds),
    barrier: {
      edgeZ: platformBounds.minZ,
      gateBayXRangesInclusive: [
        { minX: 1664, maxX: 1666 },
        { minX: 1688, maxX: 1690 },
        { minX: 1712, maxX: 1714 },
        { minX: 1736, maxX: 1738 },
      ],
      closedBarrierDesign: setRecord(barrierCells),
      gatesOperationallyAuthorized: false,
    },
    emergencyLightingDesign: setRecord(lightCells),
  };
});

const egressCores = terminal.lifeSafety.egressStudyAnchors.map((anchor) => {
  assert(anchor.y === null, `${anchor.id} surface Y must remain null`);
  const coreBounds = {
    minX: anchor.x - 3,
    maxX: anchor.x + 3,
    minY: 42,
    maxY: shellBounds.maxY,
    minZ: anchor.z - 3,
    maxZ: anchor.z + 3,
  };
  const stairBounds = {
    minX: anchor.x - 3,
    maxX: anchor.x - 1,
    minY: 42,
    maxY: shellBounds.maxY,
    minZ: anchor.z - 3,
    maxZ: anchor.z + 3,
  };
  const liftBounds = {
    minX: anchor.x + 1,
    maxX: anchor.x + 3,
    minY: 42,
    maxY: shellBounds.maxY,
    minZ: anchor.z - 1,
    maxZ: anchor.z + 1,
  };
  const capBounds = {
    minX: anchor.x - 3,
    maxX: anchor.x + 3,
    minY: shellBounds.maxY,
    maxY: shellBounds.maxY,
    minZ: anchor.z - 3,
    maxZ: anchor.z + 3,
  };
  return {
    id: anchor.id,
    anchor: { x: anchor.x, y: null, z: anchor.z },
    internalCoreReservation: setRecord(cuboid(coreBounds), coreBounds),
    stairReservation: setRecord(cuboid(stairBounds), stairBounds),
    accessibleLiftReservation: setRecord(cuboid(liftBounds), liftBounds),
    internalRouteGraph: {
      nodes: [
        { id: `${anchor.id}-PLATFORM`, x: anchor.x, y: 42, z: anchor.z },
        { id: `${anchor.id}-REFUGE`, x: anchor.x, y: 48, z: anchor.z },
        { id: `${anchor.id}-ROOF-CAP`, x: anchor.x, y: 54, z: anchor.z },
      ],
      edges: [
        { from: `${anchor.id}-PLATFORM`, to: `${anchor.id}-REFUGE`, modes: ['stairs', 'reserved-lift'] },
        { from: `${anchor.id}-REFUGE`, to: `${anchor.id}-ROOF-CAP`, modes: ['stairs', 'reserved-lift'] },
      ],
    },
    sealedRoofCap: setRecord(cuboid(capBounds), capBounds),
    surfaceEndpoint: null,
    externalContinuationStatus: 'HOLD_UNSURVEYED_SURFACE_Y_SOURCE_OWNERSHIP_AND_ROUTE',
    commissionedEgress: false,
    commissionedAccessibleRoute: false,
  };
});
assert(intersectionCount(
  cuboid(egressCores[0].internalCoreReservation.bounds),
  cuboid(egressCores[1].internalCoreReservation.bounds),
) === 0, 'protected egress core reservations overlap');

const smokeBoundaries = [
  { id: 'EE-SMOKE-N', axis: 'z', coordinate: 50, openings: [1670, 1720, 1770, 1820] },
  { id: 'EE-SMOKE-S', axis: 'z', coordinate: 150, openings: [1670, 1720, 1770, 1820] },
].map((definition) => {
  const all = cuboid({
    minX: 1652,
    maxX: 1847,
    minY: 48,
    maxY: 54,
    minZ: definition.coordinate,
    maxZ: definition.coordinate,
  });
  const openingCells = definition.openings.flatMap((minX) => cuboid({
    minX,
    maxX: minX + 2,
    minY: 49,
    maxY: 51,
    minZ: definition.coordinate,
    maxZ: definition.coordinate,
  }));
  return {
    id: definition.id,
    boundaryPlane: setRecord(without(all, openingCells)),
    smokeDoorOpeningReservations: setRecord(openingCells),
    smokeDoorMechanismAuthorized: false,
  };
});

const ventDefinitions = [
  { id: 'EE-VENT-NW', bounds: { minX: 1640, maxX: 1647, minY: 49, maxY: 54, minZ: 44, maxZ: 51 }, ductZ: 52 },
  { id: 'EE-VENT-NE', bounds: { minX: 1857, maxX: 1864, minY: 49, maxY: 54, minZ: 44, maxZ: 51 }, ductZ: 52 },
  { id: 'EE-VENT-SW', bounds: { minX: 1640, maxX: 1647, minY: 49, maxY: 54, minZ: 149, maxZ: 156 }, ductZ: 148 },
  { id: 'EE-VENT-SE', bounds: { minX: 1857, maxX: 1864, minY: 49, maxY: 54, minZ: 149, maxZ: 156 }, ductZ: 148 },
].map((definition) => ({
  id: definition.id,
  plantReservation: setRecord(cuboid(definition.bounds), definition.bounds),
  internalDuctCenterline: setRecord(pointLine(
    { x: definition.bounds.minX, y: 53, z: definition.ductZ },
    { x: definition.bounds.maxX, y: 53, z: definition.ductZ },
  )),
  exteriorOutlet: null,
  roofCapStatus: 'SEALED_PENDING_SURVEY_AND_SMOKE_CONTROL_ENGINEERING',
  commissioned: false,
}));

const drainage = terminal.trackCenterlinesZ.map((trackZ, index) => {
  const channelCells = pointLine(
    { x: 1636, y: 39, z: trackZ + 1 },
    { x: 1868, y: 39, z: trackZ + 1 },
  );
  const sumpBounds = {
    minX: 1865,
    maxX: 1868,
    minY: 38,
    maxY: 38,
    minZ: trackZ,
    maxZ: trackZ + 2,
  };
  return {
    id: `EE-DRAIN-${String(index + 1).padStart(2, '0')}`,
    assignedTrack: index + 1,
    channel: setRecord(channelCells),
    sumpReservation: setRecord(cuboid(sumpBounds), sumpBounds),
    pumpAndDischargeMechanism: null,
    commissioned: false,
  };
});
const dischargeHeaderBounds = {
  minX: 1869,
  maxX: 1871,
  minY: 38,
  maxY: 38,
  minZ: 156,
  maxZ: 158,
};
const dischargeCapBounds = {
  minX: 1872,
  maxX: 1872,
  minY: 38,
  maxY: 40,
  minZ: 156,
  maxZ: 158,
};

const futureInterfaces = terminal.trackCenterlinesZ.map((trackZ, index) => {
  const bounds = {
    minX: terminal.futureInterfaces.eastStubX,
    maxX: terminal.futureInterfaces.eastStubX,
    minY: 39,
    maxY: 43,
    minZ: trackZ - 2,
    maxZ: trackZ + 2,
  };
  const pair = terminal.futureLinePairs.find(({ tracks }) => tracks.includes(index + 1));
  assert(pair, `missing future-line pair for track ${index + 1}`);
  return {
    id: `EE-FUTURE-${String(index + 1).padStart(2, '0')}`,
    owner: `Z02-U1-IF-${String(index + 1).padStart(2, '0')}`,
    assignedTrack: index + 1,
    futureLinePair: pair.id,
    boundary: 'EAST_STUB',
    sealMaterial: 'minecraft:polished_deepslate',
    sealDesign: setRecord(cuboid(bounds), bounds),
    consumerOwner: null,
    sourceGuard: null,
    rollbackOperation: null,
    state: 'DEFAULT_DENY_SEALED_DESIGN_CONTRACT',
    openingAuthorized: false,
  };
});
for (let left = 0; left < futureInterfaces.length; left += 1) {
  for (let right = left + 1; right < futureInterfaces.length; right += 1) {
    assert(
      intersectionCount(
        cuboid(futureInterfaces[left].sealDesign.bounds),
        cuboid(futureInterfaces[right].sealDesign.bounds),
      ) === 0,
      `future interface seals overlap: ${left + 1}/${right + 1}`,
    );
  }
}

for (const component of [
  ...shopShells.map(({ id, bounds }) => ({ id, bounds })),
  ...egressCores.map(({ id, internalCoreReservation }) => ({ id, bounds: internalCoreReservation.bounds })),
  ...ventDefinitions.map(({ id, plantReservation }) => ({ id, bounds: plantReservation.bounds })),
  ...futureInterfaces.map(({ id, sealDesign }) => ({ id, bounds: sealDesign.bounds })),
  { id: 'EE-DISCHARGE-HEADER', bounds: dischargeHeaderBounds },
  { id: 'EE-DISCHARGE-CAP', bounds: dischargeCapBounds },
]) assert(inside(component.bounds, shellBounds), `${component.id} lies outside the Empty Eight shell`);

const geologySources = [
  {
    id: 'USGS-SMITH-1999',
    authority: 'U.S. Geological Survey Publications Warehouse',
    kind: 'official record for peer-reviewed original research',
    title: 'Petrology and geochemistry of late-stage intrusions of the A-type, mid-Proterozoic Pikes Peak batholith (Central Colorado, USA): Implications for petrogenetic models',
    authors: 'Smith, D.R., et al.',
    year: 1999,
    url: 'https://www.usgs.gov/publications/petrology-and-geochemistry-late-stage-intrusions-a-type-mid-proterozoic-pikes-peak',
    supports: [
      'The Pikes Peak batholith is in central Colorado.',
      'The batholith is approximately 1.08 billion years old.',
      'Pikes Peak granite includes coarse-grained syenogranites and minor monzogranites.',
    ],
  },
  {
    id: 'USGS-OFR-01-0364',
    authority: 'U.S. Geological Survey',
    kind: 'official technical map report',
    title: 'Preliminary Precambrian Basement Map of Colorado—A Geologic Interpretation of the Aeromagnetic Anomaly Map',
    authors: 'Sims, P.K., et al.',
    year: 2001,
    url: 'https://pubs.usgs.gov/of/2001/ofr-01-0364/colo_of_text.html',
    supports: [
      'The Pikes Peak batholith is in the southern Front Range and has an age of about 1.1 billion years.',
      'The report calls it an A-type example while preserving the broader scientific context around the term anorogenic.',
    ],
  },
  {
    id: 'KGS-JOHNSON-COUNTY',
    authority: 'Kansas Geological Survey',
    kind: 'official geologic and hydrologic technical report',
    title: 'Geology and Ground-Water Resources of Johnson County, Northeastern Kansas—Stratigraphy of Outcropping Rocks',
    authors: 'O\u2019Connor, H.G.',
    year: 1971,
    url: 'https://www.kgs.ku.edu/General/Geology/Johnson/05_outcr.html',
    supports: [
      'The Swope Limestone is in the Pennsylvanian System, Missourian Stage.',
      'Bethany Falls Limestone is the upper member of the Swope Limestone.',
      'The report documents Bethany Falls near the Kansas–Missouri state line.',
    ],
  },
  {
    id: 'KGS-BULLETIN-206-1',
    authority: 'Kansas Geological Survey',
    kind: 'official original geologic research bulletin',
    title: 'Carbonate Facies of the Swope Limestone Formation (Upper Pennsylvanian), Southeast Kansas',
    authors: 'Mossler, J.H.',
    year: 1973,
    url: 'https://www.kgs.ku.edu/Publications/Bulletins/206_1/index.html',
    supports: [
      'The Swope Limestone is Upper Pennsylvanian.',
      'Bethany Falls Limestone is the uppermost member of the Swope.',
      'Bethany Falls has laterally varying carbonate facies; a single simplistic visual texture should not be presented as a complete natural section.',
    ],
  },
];

const plaquePanels = [
  { order: 1, text: 'DESIGN CONTACT' },
  { order: 2, text: 'Pikes Peak Granite analogue' },
  { order: 3, text: 'Colorado batholith • about 1.1 billion years' },
  { order: 4, text: 'Bethany Falls Limestone analogue' },
  { order: 5, text: 'Upper Pennsylvanian • Missourian • Kansas City region' },
  { order: 6, text: 'Architectural composite • not one natural outcrop' },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-empty-eight-geology-design',
  generatedAtUtc: GENERATED_AT,
  status: 'D06_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_HOLD_D07_WORDING_RESOLVED_C2_OMITTED',
  sourceBindings: [
    sourceBinding(MASTERPLAN, 'Masterplan 05 current-world intent and D06/D07 gates'),
    sourceBinding(COORDINATES, 'Masterplan 05 terminal setout and null external endpoints'),
    sourceBinding(NORMALIZED_COORDINATES, 'Masterplan 04 normalized composition'),
    sourceBinding(NORMALIZED_BRIEF, 'Masterplan 04 normalized architecture and open geology review'),
  ],
  authority: {
    chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    planToDevelop: 'docs/masterplans/05-combined-zones/MASTERPLAN.md',
    role: 'Phase 1 design freeze and factual-language decision; not a construction or release package',
    offlineOnly: true,
    worldEditAuthorized: false,
    constructionPackageExists: false,
    operationCellCount: 0,
    operationsEmitted: false,
  },
  d06: {
    status: 'PARTIAL_RESOLUTION_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_INTERFACES_HOLD',
    exactDesignFrozen: true,
    commissionedLifeSafetySystem: false,
    shell: {
      id: terminal.id,
      officialName: terminal.officialName,
      nickname: terminal.nickname,
      bounds: shellBounds,
      railY: terminal.railY,
      coverEvidenceDisposition: 'PHASE0_COVER_PASS_DOES_NOT_AUTHORIZE_EXCAVATION',
    },
    architecturalLanguage: {
      selection: 'LATE_SOVIET_INSPIRED_CIVIC_MONUMENTALITY_WITHOUT_COPYING_A_SPECIFIC_STATION',
      organizingPrinciples: [
        'deep vault rhythm and long terminal sightlines',
        'durable stone field with restrained red civic accents',
        'oversized perimeter mall held as empty capped shells',
        'high-contrast safety and accessible-route information visually outranks the easter egg',
      ],
      palette,
    },
    discoverySequence: {
      junction: z02.hiddenSubway.junction,
      planningEnvelope: {
        ...discoveryEnvelope,
        cellCount: cuboid(discoveryEnvelope).length,
        cellSetSha256: setRecord(cuboid(discoveryEnvelope)).cellSetSha256,
      },
      exactCueCells: setRecord(discoveryCueCells),
      cue: 'five-cell chiseled-stone continuation datum behind the landscaped apparent terminus',
      hazardControls: [
        'cue is information only and never substitutes for an opening or route',
        'retaining wall and branch remain closed until independently commissioned',
        'life-safety signs, lighting, and barriers must remain conspicuous after entry',
      ],
      sourceGuards: null,
      physicalCueAuthorized: false,
    },
    platforms: platformDesigns,
    concourseAndRetail: {
      mallWingCount: 2,
      perimeterMezzanineDesignY: 48,
      openAtriaPreserved: true,
      retailShellCount: shopShells.length,
      retailShells: shopShells,
      tenantFitOutAuthorized: false,
    },
    lifeSafety: {
      designBasisOnlyNotCodeCompliance: true,
      protectedInternalRouteCount: egressCores.length,
      accessibleInternalRouteReservationCount: egressCores.length,
      internalCoreReservationsDisjoint: true,
      minimumClearHorizontalCellsBetweenCoreEnvelopes: 193,
      egressCores,
      smokeBoundaries,
      ventilation: {
        plantAndDuctReservations: ventDefinitions,
        exteriorOutletCount: 0,
        smokeModelValidated: false,
      },
      emergencyLighting: {
        exactPlatformFixtureCount: platformDesigns.reduce(
          (sum, platform) => sum + platform.emergencyLightingDesign.cellCount,
          0,
        ),
        fixtureBlock: 'minecraft:sea_lantern',
        photometricOrEmergencyPowerValidation: false,
      },
      platformBarriers: {
        exactBarrierCount: platformDesigns.length,
        gateMechanismSelected: false,
        trainDoorAlignmentValidated: false,
        commissioned: false,
      },
      drainage: {
        trackDrainAndSumpReservations: drainage,
        internalDischargeHeader: setRecord(cuboid(dischargeHeaderBounds), dischargeHeaderBounds),
        sealedBoundaryCap: setRecord(cuboid(dischargeCapBounds), dischargeCapBounds),
        externalDischargePoint: null,
        hydraulicModelValidated: false,
        commissioned: false,
      },
      fireAndServiceAccess: {
        internalSpineReservation: setRecord(cuboid({
          minX: 1844,
          maxX: 1848,
          minY: 48,
          maxY: 52,
          minZ: 40,
          maxZ: 160,
        })),
        externalConnection: null,
        emergencyServiceAcceptance: false,
      },
    },
    futureInterfaces: {
      count: futureInterfaces.length,
      pairing: terminal.futureLinePairs,
      eastStubX: terminal.futureInterfaces.eastStubX,
      allSealCellSetsDisjoint: true,
      everyInterfaceSeparatelyOwned: true,
      interfaces: futureInterfaces,
      prohibitedInitialConnections: z02.hiddenSubway.prohibitedInitialConnections,
    },
    designClosureHoldGates: [
      'survey exact dry surface endpoints for EG-A and EG-B without replacing null Y by inference',
      'prove two complete independent accessible egress routes from occupied spaces to safe exterior endpoints',
      'complete fire/smoke, ventilation, emergency-power/lighting, platform-barrier, drainage, and fire-service engineering',
      'accept exterior vent, discharge, fire/service, barrier, lift, emergency-power, and sealed-interface mechanisms with exact owners, interfaces, and frozen commissioning criteria',
    ],
    releaseLifecycleValidation: {
      gateRange: 'G03-G19',
      resolvesD06: false,
      requirements: [
        'bind every cell to exact ownership, immutable source guards, forward/rollback operations, and a release manifest',
        'pass complete preflight, live entity clearance, and explicit authorization',
        'pass bounded pilot, immutable post-state, functional and route QA, rollback verification, and final acceptance',
      ],
    },
  },
  d07: {
    status: 'RESOLVED_WORDING_ONLY_PORTAL_OMITTED',
    geologicalWordingStatus: 'RESOLVED_AUTHORITATIVE_SOURCE_BACKED_ARCHITECTURAL_COMPOSITE',
    resolution: {
      interpretation: 'The granite-above/limestone-below sequence is an authored architectural juxtaposition of geographically separate analogue units, not a claim that those named units form one natural contact.',
      approvedPlaquePanels: plaquePanels,
      forbiddenClaims: [
        'natural Pikes Peak Granite–Bethany Falls Limestone contact',
        'thrust fault or overthrust between the named units',
        'laccolithic contact between the named units',
        'Bethany Falls Limestone is 270 million years old',
        'the two named units occur at the same natural site',
      ],
      retiredWordingDisposition: 'Conflicting Masterplan 04 mechanism and age claims remain historical design record and are not approved interpretive copy.',
      sourceRetrievedAtUtc: '2026-08-04T00:00:00Z',
      sources: geologySources,
    },
    c2Portal: {
      status: 'NO_ACTIVE_C2_PORTAL',
      registryStatus: coordinates.connections.find(({ id }) => id === 'C2')?.status ?? null,
      logicalFrom: coordinates.connections.find(({ id }) => id === 'C2')?.from ?? null,
      logicalTo: coordinates.connections.find(({ id }) => id === 'C2')?.to ?? null,
      activeMechanism: null,
      landingCoordinates: [],
      mechanismBlocks: [],
      commands: [],
      targetCellCount: 0,
      operationsEmitted: false,
      portalGalleryMeaning: 'architectural destination only',
      reconsiderationGate: [
        'selected permission-compatible mechanism',
        'exact safe symmetric landing coordinates and immutable source evidence',
        'tested outbound and return paths',
        'owned guarded operations and exact rollback',
        'separate reviewed release authorization',
      ],
    },
  },
  gateDecision: {
    d06InternalDesignFreezePassed: true,
    d06CompleteLifeSafetyGatePassed: false,
    d07WordingGatePassed: true,
    c2ActivationGatePassed: false,
    phase1Exit: 'HOLD',
    advanceToPhysicalPhase: false,
    liveBuildMayProceed: false,
    reason: 'D06 external life-safety and every physical release gate remain open; this record emits zero operations.',
  },
};

assert(report.authority.operationCellCount === 0, 'operation cell count must remain zero');
assert(report.d07.c2Portal.targetCellCount === 0, 'C2 target cell count must remain zero');
assert(report.d07.c2Portal.landingCoordinates.length === 0, 'C2 landing coordinates must remain empty');
assert(report.d06.futureInterfaces.interfaces.every(({ openingAuthorized }) => !openingAuthorized), 'future interface opened');
assert(report.d06.lifeSafety.egressCores.every(({ surfaceEndpoint }) => surfaceEndpoint === null), 'surface endpoint inferred');
assert(report.gateDecision.liveBuildMayProceed === false, 'live build must remain closed');

const markdown = `# Phase 1 Empty Eight and geology decision\n\n` +
`Status: **internal design frozen; external life-safety HOLD; geology wording resolved; C2 omitted.**\n\n` +
`This is a deterministic offline design record for D06 and D07. It emits **zero operations**, authorizes no world edit, and does not claim code compliance or commissioning. The authority chain remains \`01 + 02 + 03 → 04 normalized architecture → 05 current-world placement\`; the plan to develop remains [MASTERPLAN.md](MASTERPLAN.md).\n\n` +
`## D06 — Empty Eight\n\n` +
`The terminal shell remains \`x=${shellBounds.minX}…${shellBounds.maxX}\`, \`Y=${shellBounds.minY}…${shellBounds.maxY}\`, \`z=${shellBounds.minZ}…${shellBounds.maxZ}\`. The record now freezes a ${palette.length}-material palette, the five-cell discovery datum, ${platformDesigns.length} platform/barrier schedules, ${shopShells.length} capped retail shells, two disjoint internal protected stair/lift core reservations, exact smoke-boundary openings, four internal ventilation reservations, ${drainage.length} track drains and sumps, one capped discharge header, a fire/service spine, and ${futureInterfaces.length} separately owned sealed east-stub contracts.\n\n` +
`The freeze stops at the roof and terminal boundary. Both surface egress endpoints remain \`null\`; exterior ventilation, drainage discharge, and fire/service access remain unset. Barrier gates, lift machinery, smoke control, emergency power, hydraulics, source guards, rollback, and operational tests remain HOLD. “Exact” here means exact design reservation cells, not permission to place them.\n\n` +
`The discovery cue stays informational: a subtle continuation datum behind the landscaped apparent terminus. It cannot create an opening, obscure safety information, or activate the branch. Every future line remains physically sealed and default-deny. PassageWay, SubTropolis, Houston pedestrian tunnels, and secure Cheyenne circulation remain prohibited initial connections.\n\n` +
`## D07 — geology wording and C2\n\n` +
`The approved six-panel copy is:\n\n` +
plaquePanels.map(({ order, text: panelText }) => `${order}. ${panelText}`).join('\n') + '\n\n' +
`This wording describes two **analogues** and explicitly avoids inventing a natural contact. Pikes Peak Granite belongs to an approximately 1.08–1.1-billion-year-old batholith in Colorado; Bethany Falls Limestone is the upper member of the Swope Limestone and is Upper Pennsylvanian/Missourian in the Kansas City region. The prior “270 Ma,” thrust/overthrust, and laccolith claims are not approved interpretive copy.\n\n` +
`Primary technical sources:\n\n` +
geologySources.map((source) => `- [${source.authority}: ${source.title}](${source.url}) (${source.year}).`).join('\n') + '\n\n' +
`C2 remains a logical link only. There is no active mechanism, no landing coordinate, no portal block, no command, and no target cell. Portal galleries remain architectural destinations unless a later separate evidence package proves safe symmetric landings, permissions, return-path QA, guarded operations, rollback, and release authorization.\n\n` +
`## Gate\n\n` +
`D06's internal design freeze passes, and D07's factual wording gate passes. Phase 1 and all physical work remain **HOLD** because complete external life-safety engineering and the ordinary ownership/source/release gates have not passed. D06/G02 closes on accepted pre-R00 design evidence only; operations, preflight, pilot, rollback, and post-state QA remain G03-G19 validation. See [the machine-readable record](phase1-empty-eight-geology-design.json) for exact hashes, bounds, contracts, and closure requirements.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  retailShellCount: shopShells.length,
  futureInterfaceCount: futureInterfaces.length,
  operationCellCount: 0,
}, null, 2)}\n`);
