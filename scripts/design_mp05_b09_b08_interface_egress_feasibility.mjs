#!/usr/bin/env node
/**
 * Read-only MP05 B08/B09 controlled-interface and separated-egress feasibility
 * package.  This is deliberately a design mapper, not a release compiler: it
 * emits no guarded operations and never contacts Minecraft/RCON.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  cellsIn,
  hashCells,
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b09-b08-interface-egress-feasibility-20260826T123537Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T12:35:47.601Z');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/mp10-bell-penthouse-live-20260826T122519Z/evidence-ledger.json');

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const ledgerPostRegionSha256 = (ledger) => {
  if (typeof ledger.postSnapshot?.regionSha256 === 'string') return ledger.postSnapshot.regionSha256;
  const identityPath = ledger.postSnapshot?.identity?.path;
  if (typeof identityPath !== 'string') return null;
  return readJson(identityPath).sha256 ?? null;
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`MP05 B08/B09 feasibility mapper rejected: ${message}`);
};
const binding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const stateBase = (state) => state.split('[', 1)[0];
const boundsOf = (cells) => cells.length === 0 ? null : ({
  minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)),
  minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)),
  minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)),
});
const exactSet = (cells, includeCells = false) => ({
  cellCount: cells.length,
  bounds: boundsOf(cells),
  coordinateSetSha256: hashCells(cells),
  ...(includeCells ? { cells: cells.slice().sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z) } : {}),
});
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map(),
).entries()].sort(([a], [b]) => a.localeCompare(b)));
const overlap = (left, right) => {
  const rightKeys = new Set(right.map(cellKey));
  return left.filter((cell) => rightKeys.has(cellKey(cell)));
};
const components = (cells) => {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const seen = new Set();
  const result = [];
  for (const [startKey, start] of byKey) {
    if (seen.has(startKey)) continue;
    const component = [];
    const queue = [start];
    seen.add(startKey);
    while (queue.length) {
      const current = queue.pop();
      component.push(current);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz };
        const key = cellKey(next);
        if (byKey.has(key) && !seen.has(key)) {
          seen.add(key);
          queue.push(next);
        }
      }
    }
    result.push(uniqueCells(component));
  }
  return result.sort((a, b) => b.length - a.length || cellKey(a[0]).localeCompare(cellKey(b[0])));
};
async function records(reader, cells) {
  const result = [];
  // Keep the Anvil-reader cache deterministic: concurrent first reads of one
  // chunk would each decompress the same chunk and turn a small design census
  // into needless CPU pressure.
  for (const cell of uniqueCells(cells)) {
    result.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return result;
}

function hashRegion(directory) {
  const digest = crypto.createHash('sha256');
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) {
    digest.update(name); digest.update('\0'); digest.update(fs.readFileSync(path.join(directory, name))); digest.update('\0');
  }
  return { sha256: digest.digest('hex'), regionFileCount: names.length };
}

function svgPlan({ title, y, xMin, xMax, zMin, zMax, protectedSets, candidates, states }) {
  const cell = 18;
  const width = 120 + (xMax - xMin + 1) * cell;
  const height = 145 + (zMax - zMin + 1) * cell;
  const rect = (x, z, color, opacity = 0.45, stroke = color) => `<rect x="${76 + (x - xMin) * cell}" y="${62 + (zMax - z) * cell}" width="${cell}" height="${cell}" fill="${color}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="0.8"/>`;
  const stateGlyph = (state) => {
    if (!state) return '';
    if (state === 'minecraft:air') return '';
    if (stateBase(state) === 'minecraft:polished_diorite') return 'D';
    if (stateBase(state) === 'minecraft:powered_rail') return 'P';
    if (stateBase(state) === 'minecraft:lever') return 'L';
    if (stateBase(state) === 'minecraft:sea_lantern') return '*';
    return '#';
  };
  const candidateColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#0891b2'];
  const overlays = [
    ...protectedSets.map(({ cells, color }) => cells.filter((c) => c.y === y).map((c) => rect(c.x, c.z, color, 0.28))),
    ...candidates.map(({ cells }, index) => cells.filter((c) => c.y === y).map((c) => rect(c.x, c.z, candidateColors[index], 0.24, candidateColors[index]))),
  ].join('');
  const grid = [];
  for (let x = xMin; x <= xMax; x += 1) {
    grid.push(`<line x1="${76 + (x - xMin) * cell}" y1="62" x2="${76 + (x - xMin) * cell}" y2="${62 + (zMax - zMin + 1) * cell}" stroke="#d1d5db"/>`);
  }
  for (let z = zMin; z <= zMax; z += 1) {
    grid.push(`<line x1="76" y1="${62 + (zMax - z) * cell}" x2="${76 + (xMax - xMin + 1) * cell}" y2="${62 + (zMax - z) * cell}" stroke="#d1d5db"/>`);
    grid.push(`<text x="65" y="${77 + (zMax - z) * cell}" text-anchor="end" class="axis">${z}</text>`);
  }
  const glyphs = [];
  for (const [key, state] of states) {
    const [x, cellY, z] = key.split(',').map(Number);
    if (cellY !== y || x < xMin || x > xMax || z < zMin || z > zMax) continue;
    const glyph = stateGlyph(state);
    if (glyph) glyphs.push(`<text x="${87 + (x - xMin) * cell}" y="${78 + (zMax - z) * cell}" text-anchor="middle" class="glyph">${glyph}</text>`);
  }
  const legend = [
    ['#f59e0b', 'B08/B09 default-deny seam'], ['#475569', 'existing B09 shell'], ['#0f172a', 'R12R protected block'],
    ...candidates.map((candidate, i) => [candidateColors[i], candidate.id]),
  ].map(([color, label], i) => `<rect x="${76 + (i % 2) * 310}" y="${height - 36 - Math.floor(i / 2) * 18}" width="11" height="11" fill="${color}"/><text x="${92 + (i % 2) * 310}" y="${height - 26 - Math.floor(i / 2) * 18}" class="legend">${label}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<style>.title{font:700 15px sans-serif;fill:#111827}.axis{font:8px monospace;fill:#374151}.glyph{font:700 12px monospace;fill:#111827}.legend{font:11px sans-serif;fill:#111827}</style>\n<text x="16" y="27" class="title">${title}</text><text x="16" y="45" class="axis">x=${xMin}..${xMax}, z=${zMin}..${zMax}; D=diorite, P=powered rail, L=lever, *=sea lantern; coloured zones are design-only</text>\n${grid.join('')}<line x1="76" y1="${62 + (zMax - zMin + 1) * cell}" x2="${76 + (xMax - xMin + 1) * cell}" y2="${62 + (zMax - zMin + 1) * cell}" stroke="#d1d5db"/>${overlays}${glyphs.join('')} ${legend}\n</svg>\n`;
}

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
const r07dPath = 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json';
const r12rPath = 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json';
const technicalPath = 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json';
const integratedPath = 'data/world-review/mp05-b09-integrated-receiver-design-20260826T123537Z/machine-findings.json';
const capture = readJson(capturePath);
const ledger = readJson(SOURCE_LEDGER);
const r07d = readJson(r07dPath);
const r12r = readJson(r12rPath);
const technical = readJson(technicalPath);
const region = hashRegion(abs(path.join(SNAPSHOT, 'region')));

invariant(capture.immutableCopy === true && capture.captureProtocol?.restorationAction === 'SAVE_ON_CONFIRMED', 'bound source is not a restored immutable complete-save capture');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'bound ledger does not authenticate supplied source snapshot');
invariant(ledgerPostRegionSha256(ledger) === region.sha256, 'bound source region hash drifted');
invariant(r12r.commissionedSystem.activeShuttleCommissioned === true && r12r.commissionedSystem.persistentTaggedMinecartCount === 1, 'R12R bounded maintenance system binding drifted');

const geo = r07d.scope.geometry;
const b08Seam = cellsIn(geo.b08PortalSeam.bounds);
const lowerEnvelope = cellsIn(geo.lowerStationEnvelope.bounds);
const westCap = cellsIn(geo.westIsolationCap.bounds);
const eastCap = cellsIn(geo.eastIsolationCap.bounds);
const lowerInterior = cellsIn(geo.preservedInteriorVoid.bounds);
const r12rRails = cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 });
const r12rStops = [{ x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }];
const r12rControls = [{ x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 }];
const r12rProtectedBlocks = uniqueCells([...r12rRails, ...r12rStops, ...r12rControls]);
invariant(r12rProtectedBlocks.length === 19, 'R12R exact protected block envelope is not 19 cells');

const candidates = [
  {
    id: 'C01-DOOR-APERTURE-STUDY',
    role: 'two-cell controlled-door aperture through the present B09 west isolation cap',
    cells: cellsIn({ minX: 2050, maxX: 2050, minY: 130, maxY: 131, minZ: -748, maxZ: -748 }),
    disposition: 'DEFAULT_DENY__REQUIRES_B08_B09_OWNER_AND_FORWARD_INVERSE_DOOR_CONTRACT',
  },
  {
    id: 'C02-SOUTH-RECEIVER-6X6-STUDY',
    role: 'six by six receiver floor plate with seven-cell vertical design envelope south of the existing lower shell',
    cells: cellsIn({ minX: 2051, maxX: 2056, minY: 129, maxY: 135, minZ: -755, maxZ: -750 }),
    disposition: 'GEOMETRY_ONLY__RECEIVER_BOUNDARY_PLATFORM_AND_BARRIER_NOT_DESIGNED',
  },
  {
    id: 'C03-SOUTH-SERVICE-EGRESS-6X6-STUDY',
    role: '24-block long, six-wide by six-high candidate separated service/egress corridor',
    cells: cellsIn({ minX: 2051, maxX: 2074, minY: 129, maxY: 134, minZ: -756, maxZ: -751 }),
    disposition: 'GEOMETRY_ONLY__NO_ACCEPTED_ENDPOINT_CROSSPASSAGE_OR_RESCUE_DISCHARGE',
  },
  {
    id: 'C04-NORTH-TRACKSIDE-6X6-NEGATIVE',
    role: 'trackside six-wide by six-high comparison envelope north of the lower station',
    cells: cellsIn({ minX: 2051, maxX: 2074, minY: 129, maxY: 134, minZ: -747, maxZ: -742 }),
    disposition: 'REJECTED_AS_NON_OVERLAP_CANDIDATE__TOUCHES_R12R_CONTROL_PROTECTION_AND_EXTENDS_OUTSIDE_B09_ACCOMMODATION',
  },
];
const crossPassageStudy = cellsIn({ minX: 2051, maxX: 2053, minY: 130, maxY: 132, minZ: -750, maxZ: -748 });
const b09Accommodation = technical.exactTechnicalReservationProposals.proposalLayers.lowerStationEnvelope;
const b09MinimumBounds = r07d.scope.geometry.minimumPlanningAccommodation.bounds;
const minAccommodation = cellsIn(b09MinimumBounds);
const minAccommodationKeys = new Set(minAccommodation.map(cellKey));

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const allCells = uniqueCells([...b08Seam, ...lowerEnvelope, ...r12rProtectedBlocks, ...crossPassageStudy, ...candidates.flatMap(({ cells }) => cells)]);
const allRecords = await records(reader, allCells);
const recordState = new Map(allRecords.map(({ cell, state }) => [cellKey(cell), state]));
const candidateRecords = candidates.map((candidate) => ({ ...candidate, records: candidate.cells.map((cell) => ({ cell, state: recordState.get(cellKey(cell)) })) }));
const protectedSets = [
  { id: 'B08-B09-DEFAULT-DENY-SEAM', cells: b08Seam, color: '#f59e0b' },
  { id: 'B09-LOWER-SHELL', cells: lowerEnvelope, color: '#475569' },
  { id: 'R12R-MAINTENANCE-PROTECTED-BLOCKS', cells: r12rProtectedBlocks, color: '#0f172a' },
];
const candidateFindings = candidateRecords.map(({ id, role, cells, disposition, records: candidateState }) => {
  const intersections = Object.fromEntries(protectedSets.map(({ id: protectedId, cells: protectedCells }) => {
    const cellsInBoth = overlap(cells, protectedCells);
    return [protectedId, exactSet(cellsInBoth, cellsInBoth.length <= 48)];
  }));
  const withinB09Accommodation = overlap(cells, minAccommodation);
  const air = candidateState.filter(({ state }) => state === 'minecraft:air').map(({ cell }) => cell);
  const componentsOfAir = components(air);
  return {
    id,
    role,
    disposition,
    exactEnvelope: exactSet(cells),
    currentStateCensus: stateCensus(candidateState),
    currentAir: { ...exactSet(air), componentCount: componentsOfAir.length, largestComponentCellCount: componentsOfAir[0]?.length ?? 0 },
    insideAcceptedB09MinimumAccommodation: withinB09Accommodation.length === cells.length,
    outsideB09MinimumAccommodation: exactSet(cells.filter((cell) => !minAccommodationKeys.has(cellKey(cell))), true),
    protectedOverlaps: intersections,
  };
});

const doorFinding = candidateFindings[0];
const southReceiverFinding = candidateFindings[1];
const southServiceFinding = candidateFindings[2];
const northFinding = candidateFindings[3];
const crossPassageState = crossPassageStudy.map((cell) => ({ cell, state: recordState.get(cellKey(cell)) }));
const schedule = [0, 112, 224, 336, 448, 560];
const report = {
  schemaVersion: 1,
  id: 'MP05-B09-B08-INTERFACE-AND-SEPARATED-EGRESS-FEASIBILITY',
  generatedAtUtc: GENERATED_AT,
  status: 'DESIGN_FEASIBILITY_HOLD__NO_OPERATION_PACKAGE_OR_COMMISSIONING_AUTHORITY',
  disposition: {
    readOnly: true,
    operationsCompiled: false,
    liveCallsPerformed: false,
    worldMutationsPerformed: false,
    reason: 'Candidate geometry exposes the decisions that must be accepted before a receiver/egress compiler can exist; it does not provide those decisions or an executable physical scope.',
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: region.sha256,
    regionFileCount: region.regionFileCount,
    capture: binding(capturePath),
    captureId: capture.captureId,
    sourceLedger: binding(SOURCE_LEDGER),
    designInputs: [binding(r07dPath), binding(r12rPath), binding(technicalPath), binding(integratedPath)],
  },
  protectedSets: protectedSets.map(({ id, cells }) => ({ id, ...exactSet(cells, cells.length <= 48) })),
  controlledDoorDecision: {
    candidate: doorFinding,
    sourceStateRequirement: 'Both exact cells are minecraft:polished_diorite in the bound source.',
    ownershipRequirement: 'An accepted directional IF-B08-B09-PORTAL contract must name owner, receiver, normal/restricted access class, closed/powered-failure state, source/post states, inverse, and B08 circulation impact.',
    currentAuthority: 'DEFAULT_DENY__NO_SCOPE_HAS_OPENING_AUTHORITY',
  },
  candidateEnvelopes: candidateFindings,
  crossPassageStudy: {
    exactEnvelope: exactSet(crossPassageStudy, true),
    currentStateCensus: stateCensus(crossPassageState),
    purpose: 'Candidate three-wide by three-high local connection between the present lower interior and C03; it is not a designed lockable cross-passage or an operation.',
    protectedOverlap: exactSet(overlap(crossPassageStudy, lowerEnvelope), true),
  },
  feasibilityConclusions: {
    southReceiver: {
      geometricCandidateOnly: southReceiverFinding.exactEnvelope.cellCount === 252,
      hasSixBySixFloorPlate: true,
      r12rProtectedBlockOverlap: southReceiverFinding.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount,
      blockedBy: ['no accepted B08/B09 transfer owner or controlled door', 'overlap with existing lower shell requires integrated receiver redesign', 'no platform edge/barrier or normal-walk approach design'],
    },
    southServiceEgress: {
      geometricCandidateOnly: southServiceFinding.exactEnvelope.cellCount === 864,
      crossSection: { width: 6, height: 6, runLength: 24 },
      r12rProtectedBlockOverlap: southServiceFinding.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount,
      blockedBy: ['is not connected to an accepted receiver or controlled exit', 'has no accepted rescue discharge', 'has no 3x3 lockable cross-passage design', 'has no hydrology, smoke, power, or boundary contract'],
    },
    northTrackside: {
      rejected: true,
      r12rProtectedBlockOverlap: northFinding.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount,
      outsideB09AccommodationCellCount: northFinding.outsideB09MinimumAccommodation.cellCount,
      reason: northFinding.disposition,
    },
  },
  initialReachabilityAndRescueConstraints: {
    currentSource: {
      lowerInteriorAir: exactSet(lowerInterior, true),
      lowerInteriorToB08TransferOpen: false,
      lowerInteriorToSouthServiceAccepted: false,
      b08ReceiverAccepted: false,
      summitReceiverAccepted: false,
      independentRescueDischargeCount: 0,
      functionalConclusion: 'No protected normal-walk, service, or rescue route is currently proved.',
    },
    futureDesignMinimums: {
      separatedServiceCorridor: { width: 6, height: 6, required: true },
      lockableCrossPassage: { width: 3, height: 3, maximumSpacingBlocks: 128, required: true },
      guidewayCenterlinePointCount: 561,
      conservativeCrossPassageIndexSchedule: schedule,
      maximumScheduleInterval: 112,
      intermediateCrossPassagesRequiredByThisSchedule: 4,
      independentProtectedDischargesRequired: 2,
      qualification: 'Index schedule is a spacing constraint for a later exact route design, not a constructed route or proof that these locations are suitable.',
    },
  },
  r12rMinecartDecisionInputs: {
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    protectedBlockEnvelope: exactSet(r12rProtectedBlocks, true),
    persistedEntity: {
      authenticatedTag: 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b',
      expectedSavedPosition: { x: 2058.4900000095367, y: 130.0625, z: -747.5 },
      decision: 'C02/C03 are block-non-overlapping on this source; C04 is rejected. Any future operation whose exact halo contains the cart or any R12R protected block must choose preserve-with-fresh-live-clearance or an exact entity-first migration plus inverse migration transaction.',
    },
    prohibitedShortcuts: ['broad cart cleanup', 'repurposing R12R levers', 'treating passive rail as a rescue route', 'assuming saved-entity observation is live clearance'],
  },
  requiredBeforeAnyReleaseCompiler: [
    'Accepted B08/B09 owner and controlled-door contract, including inverse and B08 circulation test.',
    'Integrated lower receiver design for platform, physical track-edge barrier/gates, and independent normal-walk approach.',
    'Exact 6x6 service/egress route with 3x3 lockable cross-passage locations, two protected independent discharges, refuge and rescue acceptance test.',
    'Hydrology, liner/foundation, smoke, power/control, drive/brake/overspeed/recovery, drainage/outfall/receiver contracts.',
    'R12R preserve/non-overlap proof or exact entity-first migration/rollback plan, then fresh source/live entity clearance and complete guarded release kernel.',
  ],
  nonclaims: {
    candidateEnvelopeAccepted: false,
    b08ToB09DoorAuthorized: false,
    b09LowerReceiverBuilt: false,
    serviceEgressBuilt: false,
    rescueRouteCommissioned: false,
    r12rMigrationAuthorized: false,
  },
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
const states = recordState;
fs.writeFileSync(abs(path.join(OUT_DIR, 'b09-lower-interface-plan-y130.svg')), svgPlan({
  title: 'MP05 B08/B09 lower interface — candidate envelopes', y: 130, xMin: 2046, xMax: 2076, zMin: -758, zMax: -739,
  protectedSets, candidates, states,
}));
fs.writeFileSync(abs(path.join(OUT_DIR, 'b09-lower-interface-plan-y132.svg')), svgPlan({
  title: 'MP05 B08/B09 lower interface — headroom and cross-passage study', y: 132, xMin: 2046, xMax: 2076, zMin: -758, zMax: -739,
  protectedSets, candidates: [...candidates, { id: '3x3 cross-passage study', cells: crossPassageStudy }], states,
}));
fs.writeFileSync(abs(path.join(OUT_DIR, 'b08-b09-interface-egress-feasibility.json')), `${JSON.stringify(report, null, 2)}\n`);

const rows = candidateFindings.map((candidate) => {
  const r12rOverlap = candidate.protectedOverlaps['R12R-MAINTENANCE-PROTECTED-BLOCKS'].cellCount;
  const shellOverlap = candidate.protectedOverlaps['B09-LOWER-SHELL'].cellCount;
  return `| ${candidate.id} | ${candidate.role} | ${candidate.exactEnvelope.cellCount} | ${r12rOverlap} | ${shellOverlap} | ${candidate.disposition} |`;
}).join('\n');
const md = `# MP05 B08/B09 controlled interface and separated-egress feasibility\n\n`
  + `Status: **${report.status}**\n\n`
  + `This is a read-only, source-bound feasibility package. It maps candidate envelopes and the exact decisions that still control them. It emits no operations, performs no RCON/live call, and does not authorize an opening, receiver, corridor, cart move, or commissioning.\n\n`
  + `## Bound source\n\n`
  + `- Immutable complete snapshot: \`${report.source.snapshotRoot}\`\n`
  + `- Complete-save SHA-256: \`${report.source.completeSaveSha256}\`\n`
  + `- Region SHA-256: \`${report.source.regionSha256}\` (${report.source.regionFileCount} files)\n`
  + `- Capture ID: \`${report.source.captureId}\`\n\n`
  + `## Maps\n\n`
  + `- [Lower interface plan, y=130](b09-lower-interface-plan-y130.svg)\n`
  + `- [Headroom / local cross-passage study, y=132](b09-lower-interface-plan-y132.svg)\n\n`
  + `Orange is the default-deny B08/B09 seam; slate is the existing B09 shell; black is the exact R12R maintenance protection. Coloured overlays are study envelopes, not authority.\n\n`
  + `## Controlled-door decision\n\n`
  + `The only mapped door aperture is two cells at \`(2050,130,-748)\` and \`(2050,131,-748)\`. Both are inside the present B09 west isolation cap and directly adjacent to the 36-cell B08/B09 default-deny seam. It may not be opened until one exact directional interface contract names the owner, access class, normal and failure state, source/post states, inverse, and B08 circulation test.\n\n`
  + `## Candidate envelopes\n\n| Candidate | Role | Cells | R12R protected overlap | Existing B09 shell overlap | Current disposition |\n|---|---|---:|---:|---:|---|\n${rows}\n\n`
  + `C02 has a 6×6 receiver floor plate and C03 has a 6-wide × 6-high × 24-long corridor geometry. That is only a bounded geometric input: neither has an accepted boundary, platform edge, normal-walk approach, lockable cross-passage, drainage/smoke/power contract, or rescue discharge. C04 is rejected because it touches the R12R maintenance protection and extends beyond the accepted B09 accommodation.\n\n`
  + `## Reachability and rescue constraints\n\n`
  + `The 12-cell lower-shell void has no accepted route to B08, C03, the summit, or an exterior receiver. The present number of independently accepted rescue discharges is **zero**. A future route must retain a continuous 6×6 service/egress section, 3×3 lockable cross-passages no more than 128 blocks apart, and two independently proven protected discharges. For the 561-point B09 centerline, the conservative spacing schedule \`0 → 112 → 224 → 336 → 448 → 560\` yields four intermediate cross-passage locations with a maximum 112-point interval. This is a route-design constraint only, not a constructed route.\n\n`
  + `## R12R decision inputs\n\n`
  + `The 19 exact R12R protected blocks are the 15 powered rails, two polished-diorite stops, and two parked controls. The authenticated cart (tag \`cz_r12_7464210e11d51e28eb4e133e2d40fd0b\`) remains at the saved source position \`(2058.4900000095367,130.0625,-747.5)\`. C02 and C03 do not overlap those 19 blocks on this source; that is **not** a live entity-clearance result. Any later operation whose exact halo contains the cart or any of those blocks must prove non-overlap with fresh live clearance or provide an entity-first migration and exact inverse migration. Broad cleanup and reusing R12R controls are prohibited.\n\n`
  + `## Required next design inputs\n\n${report.requiredBeforeAnyReleaseCompiler.map((item) => `- ${item}`).join('\n')}\n\n`
  + `No physical scope is ready.\n`;
fs.writeFileSync(abs(path.join(OUT_DIR, 'MP05-B09-B08-INTERFACE-EGRESS-FEASIBILITY.md')), md);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT_DIR), candidateCount: candidates.length, operationsCompiled: false }, null, 2)}\n`);
