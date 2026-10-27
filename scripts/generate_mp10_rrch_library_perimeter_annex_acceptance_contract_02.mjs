#!/usr/bin/env node
/**
 * CIRC-RRCH-LIB-02 perimeter / annex vertical-circulation acceptance contract.
 *
 * Read-only and deliberately non-authorizing.  It binds the current library
 * core constraint, protected interior inventory, and the east library/loggia
 * seam to one complete immutable save.  It does not select an annex, produce
 * operations, assign an owner, or permit a mutation.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (name) => {
  const result = option(name);
  if (!result) throw new Error(`Usage: generate_mp10_rrch_library_perimeter_annex_acceptance_contract_02.mjs --snapshot <complete immutable snapshot> --out <directory>`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-RRCH-LIB-02 contract rejected: ${message}`);
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(stateName(state));
const stateSetHash = (records) => sha256(`${records.slice()
  .sort((left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)))
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);

const LIBRARY = Object.freeze({ minX: -144, maxX: -111, minY: 44, maxY: 86, minZ: -448, maxZ: -426 });
const CORE = Object.freeze({ minX: -120, maxX: -114, minY: 46, maxY: 84, minZ: -445, maxZ: -439 });
const LANDING_LEVELS = Object.freeze([46, 54, 62, 70, 78]);
const SEAM = Object.freeze({ minX: -111, maxX: -111, minY: 68, maxY: 78, minZ: -447, maxZ: -433 });
const HISTORIC_HEADROOM = Object.freeze([47, 55, 63, 71, 79].map((y) => ({ x: -118, y, z: -443 })));

const pointIn = (point, bounds) => point.x >= bounds.minX && point.x <= bounds.maxX
  && point.y >= bounds.minY && point.y <= bounds.maxY && point.z >= bounds.minZ && point.z <= bounds.maxZ;
const cellsIn = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};
const describeCells = (cells) => ({
  cellCount: uniqueCells(cells).length,
  coordinateSetSha256: hashCells(cells),
});

const SNAPSHOT = required('--snapshot');
const OUT = required('--out');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(SNAPSHOT);
const outRoot = absolute(OUT);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
invariant(fs.existsSync(capturePath), 'snapshot lacks complete-save capture manifest');
for (const member of ['region', 'entities', 'poi', 'level.dat']) {
  invariant(fs.existsSync(path.join(snapshotRoot, member)), `snapshot is missing ${member}`);
}
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
invariant(capture.immutableCopy === true, 'capture is not immutable');
invariant(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130,
  `expected a complete 130-member capture, got ${capture.requiredMembers?.length ?? 'none'}`);
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  invariant(fs.existsSync(filename), `captured member is absent: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  invariant(bytes.length === member.bytes, `captured member size drift: ${member.path}`);
  invariant(sha256(bytes) === member.sha256, `captured member hash drift: ${member.path}`);
}

const targetRegion = 'r.-1.-1.mca';
const targetRegionPath = path.join(snapshotRoot, 'region', targetRegion);
invariant(fs.existsSync(targetRegionPath), `library source region is absent: ${targetRegion}`);
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const stateAt = async (point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const readStates = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: await stateAt(cell) })));

const landingScreens = [];
for (const y of LANDING_LEVELS) {
  const validCandidates = [];
  for (let x = CORE.minX; x <= CORE.maxX - 2; x += 1) for (let z = CORE.minZ; z <= CORE.maxZ - 2; z += 1) {
    const footprint = [];
    let valid = true;
    for (let dx = 0; dx < 3; dx += 1) for (let dz = 0; dz < 3; dz += 1) {
      const footingCell = { x: x + dx, y, z: z + dz };
      const [footing, body, head] = await Promise.all([
        stateAt(footingCell), stateAt({ ...footingCell, y: y + 1 }), stateAt({ ...footingCell, y: y + 2 }),
      ]);
      footprint.push({ cell: footingCell, footing, body, head });
      if (isAir(footing) || !isAir(body) || !isAir(head)) valid = false;
    }
    if (valid) validCandidates.push({ minX: x, maxX: x + 2, y, minZ: z, maxZ: z + 2 });
  }
  landingScreens.push({ floorY: y, validThreeByThreeLandingCount: validCandidates.length, candidates: validCandidates });
}
invariant(landingScreens.every((screen) => screen.validThreeByThreeLandingCount === 0),
  'source unexpectedly contains a qualifying 3x3 landing; redesign prerequisite must be renewed');

const chunks = new Set();
for (let x = Math.floor(LIBRARY.minX / 16); x <= Math.floor(LIBRARY.maxX / 16); x += 1) {
  for (let z = Math.floor(LIBRARY.minZ / 16); z <= Math.floor(LIBRARY.maxZ / 16); z += 1) chunks.add(`${x},${z}`);
}
const blockEntities = [];
const savedEntities = [];
for (const chunkId of chunks) {
  const [chunkX, chunkZ] = chunkId.split(',').map(Number);
  const blockChunk = await reader.chunk(chunkX, chunkZ);
  for (const raw of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
    const cell = { x: Number(raw.x), y: Number(raw.y), z: Number(raw.z) };
    if (pointIn(cell, LIBRARY)) blockEntities.push({ id: raw.id ?? raw.Id ?? null, cell, inCore: pointIn(cell, CORE) });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const raw of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = raw.Pos?.slice(0, 3).map(Number);
    if (position?.length !== 3) continue;
    const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
    if (pointIn(cell, LIBRARY)) savedEntities.push({ id: raw.id ?? raw.Id ?? null, position, inCore: pointIn(cell, CORE) });
  }
}
blockEntities.sort((left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)) || String(left.id).localeCompare(String(right.id)));
invariant(blockEntities.length === 72, `expected 72 protected library block entities, found ${blockEntities.length}`);
invariant(blockEntities.filter(({ inCore }) => inCore).length === 0, 'core unexpectedly contains a protected block entity');
invariant(savedEntities.length === 0, `library envelope contains saved entities: ${JSON.stringify(savedEntities)}`);

const seamCells = cellsIn(SEAM);
const seamStates = await readStates(seamCells);
const headroomStates = await readStates(HISTORIC_HEADROOM);
invariant(headroomStates.every(({ state }) => state === 'minecraft:air'), 'the five repaired headroom cells drifted from air');

const contractWithoutIdentity = {
  schemaVersion: 1,
  id: 'CIRC-RRCH-LIB-02-PERIMETER-ANNEX-VERTICAL-ACCEPTANCE-01',
  generatedAtUtc: GENERATED_AT,
  status: 'HOLD_AWAITING_PERIMETER_ANNEX_VERTICAL_ACCEPTANCE',
  mode: 'READ_ONLY_SOURCE_BOUND_NON_AUTHORIZING',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    operationFilesEmitted: false,
    releaseManifestEmitted: false,
    ownerAssigned: false,
  },
  source: {
    snapshot: relative(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    immutableCopy: capture.immutableCopy,
    requiredMemberCount: capture.requiredMembers.length,
    captureManifest: relative(capturePath),
    captureManifestSha256: sha256(captureBytes),
    libraryRegion: `region/${targetRegion}`,
    libraryRegionSha256: sha256(fs.readFileSync(targetRegionPath)),
  },
  retainedRepairBoundary: {
    historicHeadroomCells: {
      ...describeCells(HISTORIC_HEADROOM),
      requiredState: 'minecraft:air',
      stateSha256: stateSetHash(headroomStates),
      policy: 'These are retained headroom cells. A perimeter/annex design must not restore a core-only parallel tread here.',
    },
  },
  observedCoreConstraint: {
    bounds: CORE,
    requiredLandingStandard: '3x3 solid footing footprint with two clear air cells over every footing cell',
    transitionFloorLevels: LANDING_LEVELS,
    perFloor: landingScreens,
    totalValidThreeByThreeLandings: landingScreens.reduce((total, screen) => total + screen.validThreeByThreeLandingCount, 0),
    disposition: 'NO_COMPLIANT_LANDING_INSIDE_CURRENT_SEVEN_BY_SEVEN_CORE',
  },
  protectedInterior: {
    libraryBounds: LIBRARY,
    protectedBlockEntityCount: blockEntities.length,
    protectedBlockEntities: blockEntities,
    coreBlockEntityCount: 0,
    librarySavedEntityCount: savedEntities.length,
    requirement: 'A future perimeter/annex package must retain every listed block entity or bind each exact migration, destination, source/destination state, and inverse before it may compile.',
  },
  eastLibraryLoggiaSeam: {
    id: 'IF-RRCH-LIBRARY-LOGGIA',
    bounds: SEAM,
    ...describeCells(seamCells),
    sourceStateSha256: stateSetHash(seamStates),
    ownershipStatus: 'UNASSIGNED_BY_SOURCE_DEFAULT_DENY',
    rule: 'The Anvil source records block state only; it assigns neither library nor loggia authority. Any perimeter/annex alternative that touches, crosses, uses as an approach, or changes a threshold at this exact seam requires a separately named bilateral owner/interface acceptance bound to a fresh source.',
  },
  perimeterAnnexGate: {
    status: 'NO_PERIMETER_OR_ANNEX_CELL_SET_ACCEPTED',
    designRequirement: 'A later design may evaluate a complete two-wide, three-clear-headroom vertical route with 3x3 landings, edge cues, level signs, and bidirectional no-jump proof. It must enumerate a fresh exact target and interaction halo; this contract intentionally supplies neither.',
    defaultDeny: [
      'Every cell outside the current core is unselected and unowned for mutation purposes.',
      'No implied annex may consume library furnishing cells, use the east library/loggia seam, or assign an approach receiver.',
      'No partial tread, landing, wall, door, or decorative change is authorized.',
    ],
  },
  requiredAcceptancesBeforeCompiler: [
    'A named RRCH-LIBRARY owner accepts a complete vertical-route design and the exact protected-block-entity retention or migration plan.',
    'A named perimeter/annex parcel and approach/receiver owner accepts the exact target, interaction halo, access class, and bidirectional return route.',
    'If the exact target or halo intersects IF-RRCH-LIBRARY-LOGGIA, named RRCH-LIBRARY and RG-LOGGIA owners jointly accept the source-bound seam cells, threshold behavior, and rollback ownership.',
    'The later design proves every transition and landing with a bidirectional normal-walk, no-jump route QA; the current zero-landing screen cannot be used as a release substitute.',
    'Only then may a fresh compiler create exact forward/rollback operations and undergo the complete guarded-release kernel.',
  ],
  nonClaims: [
    'No perimeter or annex geometry, operation package, owner assignment, route commissioning, public opening, egress acceptance, or world mutation occurred.',
    'The observed retained library connectivity does not certify a compliant public vertical route.',
    'This complete source snapshot does not replace the fresh release source snapshot required immediately before any physical mutation.',
  ],
};
const contract = { ...contractWithoutIdentity, identitySha256: sha256(`${JSON.stringify(contractWithoutIdentity, null, 2)}\n`) };

const uniqueMapEntities = [...new Map(blockEntities.map((entry) => [`${entry.cell.x},${entry.cell.z}`, entry])).values()];
const scale = 16;
const mapX = 115;
const mapZ = 130;
const toX = (x) => mapX + (x - LIBRARY.minX) * scale;
const toZ = (z) => mapZ + (z - LIBRARY.minZ) * scale;
const libraryWidth = (LIBRARY.maxX - LIBRARY.minX + 1) * scale;
const libraryHeight = (LIBRARY.maxZ - LIBRARY.minZ + 1) * scale;
const coreX = toX(CORE.minX);
const coreZ = toZ(CORE.minZ);
const coreWidth = (CORE.maxX - CORE.minX + 1) * scale;
const coreHeight = (CORE.maxZ - CORE.minZ + 1) * scale;
const dots = uniqueMapEntities.map(({ cell }) => `<circle cx="${toX(cell.x) + scale / 2}" cy="${toZ(cell.z) + scale / 2}" r="3.4" fill="#f2c94c"/>`).join('');
const landingRows = landingScreens.map((screen, index) => `<text x="${750 + (index % 2) * 155}" y="${205 + Math.floor(index / 2) * 25}" class="small">y=${screen.floorY}: ${screen.validThreeByThreeLandingCount} valid 3×3</text>`).join('');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1130" height="650" viewBox="0 0 1130 650" role="img" aria-labelledby="title desc">
  <title id="title">CIRC-RRCH-LIB-02 perimeter annex acceptance map</title>
  <desc id="desc">Source-bound top-down map of the Ravensreach library. The existing seven-by-seven core has no qualifying three-by-three landing. Dots are protected block entities and the east library loggia seam is default deny.</desc>
  <style>.title{font:700 24px system-ui,sans-serif;fill:#f4f7fb}.sub{font:13px system-ui,sans-serif;fill:#bed0df}.label{font:700 13px system-ui,sans-serif;fill:#e7eff6}.small{font:12px ui-monospace,monospace;fill:#d4e0eb}.note{font:13px system-ui,sans-serif;fill:#f4f7fb}</style>
  <rect width="1130" height="650" fill="#07131e"/>
  <text x="38" y="39" class="title">CIRC-RRCH-LIB-02 / perimeter-annex vertical acceptance — HOLD</text>
  <text x="38" y="63" class="sub">immutable source ${contract.source.libraryRegionSha256.slice(0, 16)}… · no cell set or mutation authority</text>
  <rect x="${mapX - 17}" y="${mapZ - 17}" width="${libraryWidth + 34}" height="${libraryHeight + 34}" rx="10" fill="#102b3a" stroke="#67bbd5" stroke-width="2" stroke-dasharray="7 5"/>
  <rect x="${mapX}" y="${mapZ}" width="${libraryWidth}" height="${libraryHeight}" fill="#173e51" stroke="#9ccfe0" stroke-width="2"/>
  <rect x="${coreX}" y="${coreZ}" width="${coreWidth}" height="${coreHeight}" fill="#3d5063" stroke="#f2c94c" stroke-width="3"/>
  <line x1="${toX(-111) + scale}" y1="${mapZ}" x2="${toX(-111) + scale}" y2="${mapZ + libraryHeight}" stroke="#ff725c" stroke-width="5"/>
  ${dots}
  <text x="${mapX}" y="${mapZ - 26}" class="label">RRCH-LIBRARY x=-144..-111 · z=-448..-426</text>
  <text x="${coreX + 8}" y="${coreZ + 25}" class="label">existing 7×7 core</text>
  <text x="${toX(-111) - 84}" y="${mapZ + libraryHeight + 31}" class="small">east seam: IF-RRCH-LIBRARY-LOGGIA</text>
  <rect x="715" y="103" width="372" height="288" rx="10" fill="#102333" stroke="#476479"/>
  <text x="740" y="137" class="label">Observed source gates</text>
  <text x="740" y="166" class="small">protected block entities: 72</text>
  <text x="740" y="183" class="small">saved entities in library: 0</text>
  ${landingRows}
  <text x="740" y="281" class="small">required landing: 3×3 footing +</text>
  <text x="740" y="298" class="small">two clear body/head cells</text>
  <text x="740" y="330" class="small">orange line: unassigned seam / default deny</text>
  <circle cx="748" cy="354" r="4" fill="#f2c94c"/><text x="762" y="358" class="small">yellow dots: protected interior inventory</text>
  <rect x="40" y="566" width="1047" height="56" rx="10" fill="#392522" stroke="#ff725c"/>
  <text x="61" y="590" class="note">No perimeter or annex cell set is accepted. A later complete design needs named library + parcel/receiver owners, bilateral seam acceptance if touched,</text>
  <text x="61" y="610" class="note">protected-entity retention/migration, and bidirectional no-jump QA before a fresh compiler may select any cells.</text>
</svg>\n`;

const markdown = `# CIRC-RRCH-LIB-02 perimeter / annex vertical acceptance contract\n\n`
  + `**Status:** \`${contract.status}\`  \n`
  + `**Authority:** \`mutationAuthority: false\`. This is a source-bound read-only gate, not a build package.\n\n`
  + `![Library perimeter/annex acceptance map](mp10-rrch-library-perimeter-annex-acceptance-map.svg)\n\n`
  + `The current \`x=-120..-114, z=-445..-439\` stair core has **0** qualifying 3×3 landings at each transition floor \`${LANDING_LEVELS.join(', ')}\`. The interior library envelope contains **72** protected block entities and no saved entities. The five repaired headroom cells remain air.\n\n`
  + `The exact east \`IF-RRCH-LIBRARY-LOGGIA\` seam is recorded here but is **unassigned by source and default-deny**. It is not an inferred access, parcel, or mutation boundary. No perimeter/annex footprint has been selected.\n\n`
  + `## Before a compiler may select cells\n\n`
  + `${contract.requiredAcceptancesBeforeCompiler.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n`
  + `Source capture: \`${contract.source.snapshot}\`  \n`
  + `Capture manifest SHA-256: \`${contract.source.captureManifestSha256}\`  \n`
  + `Library-region SHA-256: \`${contract.source.libraryRegionSha256}\`  \n`
  + `Contract identity: \`${contract.identitySha256}\`\n`;

fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'mp10-rrch-library-perimeter-annex-acceptance-contract-02.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(outRoot, 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-CONTRACT-02.md'), markdown);
fs.writeFileSync(path.join(outRoot, 'mp10-rrch-library-perimeter-annex-acceptance-map.svg'), svg);
process.stdout.write(`${JSON.stringify({
  status: contract.status,
  mutationAuthority: contract.mutationAuthority,
  contract: relative(path.join(outRoot, 'mp10-rrch-library-perimeter-annex-acceptance-contract-02.json')),
  markdown: relative(path.join(outRoot, 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-CONTRACT-02.md')),
  map: relative(path.join(outRoot, 'mp10-rrch-library-perimeter-annex-acceptance-map.svg')),
  protectedBlockEntityCount: blockEntities.length,
  totalValidThreeByThreeLandings: contract.observedCoreConstraint.totalValidThreeByThreeLandings,
}, null, 2)}\n`);
