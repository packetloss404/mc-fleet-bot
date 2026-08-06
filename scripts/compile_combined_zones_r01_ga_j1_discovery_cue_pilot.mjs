#!/usr/bin/env node
/**
 * Compile the smallest exact Combined Zones R01 visible pilot: the five-cell
 * GA-J1 discovery cue. This emits guarded forward/rollback operations only;
 * it never contacts RCON or edits the live world.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const ROOT = process.cwd();
const SNAPSHOT = 'data/worldsnap-combined-zones-complete-save-20260806T014133Z';
const COMPLETE_SAVE_AUDIT = 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const FORWARD = 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.txt';
const ROLLBACK = 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.rollback.txt';
const MANIFEST = 'data/buildops/combined-zones-r01-ga-j1-discovery-cue.manifest.json';
const MARKDOWN = 'docs/masterplans/05-combined-zones/phase1-r01-ga-j1-discovery-cue-pilot.md';

const absolute = (file) => path.join(ROOT, file);
const readJson = (file) => JSON.parse(fs.readFileSync(absolute(file), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const key = ({ x, y, z }) => `${x},${y},${z}`;
const compare = (a, b) => a.x - b.x || a.y - b.y || a.z - b.z;
const assert = (condition, message) => { if (!condition) throw new Error(`GA-J1 pilot rejected: ${message}`); };

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`Unsupported Anvil compression type ${type}`);
}
function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
  if (input && typeof input === 'object' && 'high' in input) {
    return (BigInt(input.high | 0) << 32n) | BigInt(input.low >>> 0);
  }
  return BigInt(input);
}
function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((longToBig(values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}
class AnvilReader {
  constructor(directory) { this.directory = directory; this.regions = new Map(); this.chunks = new Map(); }
  region(rx, rz) {
    const id = `${rx},${rz}`;
    if (!this.regions.has(id)) {
      const file = path.join(this.directory, `r.${rx}.${rz}.mca`);
      this.regions.set(id, fs.existsSync(file) ? fs.readFileSync(file) : null);
    }
    return this.regions.get(id);
  }
  async chunk(cx, cz) {
    const id = `${cx},${cz}`;
    if (this.chunks.has(id)) return this.chunks.get(id);
    const region = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!region) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const offsetSectors = region.readUIntBE(index, 3);
    const sectorCount = region[index + 3];
    if (!offsetSectors || !sectorCount) return null;
    const offset = offsetSectors * 4096;
    const size = region.readUInt32BE(offset);
    const compression = region.readUInt8(offset + 4);
    const compressed = region.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const result = nbt.simplify(parsed);
    this.chunks.set(id, result);
    return result;
  }
  async blockState(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const section = chunk?.sections?.find(({ Y }) => Number(Y) === Math.floor(y / 16));
    const states = section?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const bits = Math.max(4, Math.ceil(Math.log2(states.palette.length)));
    return states.palette[packedValue(states.data, bits, index)] ?? { Name: 'minecraft:air' };
  }
}

const audit = readJson(COMPLETE_SAVE_AUDIT);
const design = readJson(DESIGN);
assert(audit.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', 'complete-save audit is not PASS');
assert(audit.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true, 'complete-save is not usable');
assert(design.d06?.discoverySequence?.physicalCueAuthorized === false, 'source design unexpectedly authorizes physical cue');

const cells = [
  { x: 1780, y: 68, z: -244 },
  { x: 1780, y: 68, z: -243 },
  { x: 1780, y: 68, z: -242 },
  { x: 1779, y: 69, z: -244 },
  { x: 1781, y: 69, z: -244 },
].sort(compare);
const cue = design.d06.discoverySequence.exactCueCells;
assert(cue.cellCount === 5 && cue.cellSetSha256 === '5f0c749eda7bd62cb43d5946cbda7f837495658bd17c53e3abbeec953c9824ec', 'cue identity drift');
assert(sha256(cells.map(key).join('\n')) === cue.cellSetSha256, 'reconstructed cue hash drift');

const reader = new AnvilReader(absolute(SNAPSHOT));
const sourceStates = [];
for (const cell of cells) {
  const state = await reader.blockState(cell.x, cell.y, cell.z);
  const actual = state.Name === 'minecraft:air' ? 'minecraft:air' : state;
  assert(actual === 'minecraft:air', `source at ${key(cell)} is not air: ${JSON.stringify(state)}`);
  sourceStates.push({ ...cell, state: 'minecraft:air' });
}

const targetState = 'minecraft:chiseled_stone_bricks';
const lines = (from, to) => from.map((cell, index) => (
  `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${cell.state} ${to[index].state}`
));
const targetStates = cells.map((cell) => ({ ...cell, state: targetState }));
const header = (role, fileHash) => [
  `# GENERATED FILE — Combined Zones R01 GA-J1 discovery cue (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${audit.packageIdentity.completeSaveSha256}`,
  `# cue cell-set SHA-256: ${cue.cellSetSha256}`,
  `# package is prepared for explicit owner authorization; no live execution occurred`,
  `# operation SHA-256: ${fileHash}`,
  '',
];
const forwardBody = `${lines(sourceStates, targetStates).join('\n')}\n`;
const rollbackBody = `${lines(targetStates, sourceStates).join('\n')}\n`;
const forwardHash = sha256(forwardBody);
const rollbackHash = sha256(rollbackBody);
fs.mkdirSync(path.dirname(absolute(FORWARD)), { recursive: true });
fs.writeFileSync(absolute(FORWARD), `${header('forward', forwardHash).join('\n')}${forwardBody}`);
fs.writeFileSync(absolute(ROLLBACK), `${header('rollback', rollbackHash).join('\n')}${rollbackBody}`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r01-ga-j1-discovery-cue-pilot',
  generatedAtUtc: '2026-08-06T20:30:00Z',
  status: 'READY_FOR_EXPLICIT_OWNER_BUILD_AUTHORIZATION',
  scope: 'Five-cell GA-J1 information-only discovery cue; no opening, route, excavation, or system commissioning.',
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: audit.packageIdentity.completeSaveSha256,
    captureManifestSha256: audit.packageIdentity.captureManifestSha256,
    completeSaveAuditPath: COMPLETE_SAVE_AUDIT,
    sourceGuardState: 'minecraft:air',
  },
  target: {
    cueId: 'GA-J1',
    cellSetSha256: cue.cellSetSha256,
    cellCount: cells.length,
    cells,
    desiredState: targetState,
    designPaletteId: 'EE-P06',
  },
  operations: {
    forwardPath: FORWARD,
    forwardSha256: forwardHash,
    rollbackPath: ROLLBACK,
    rollbackSha256: rollbackHash,
    forwardCommandCount: cells.length,
    rollbackCommandCount: cells.length,
    exactInverse: true,
  },
  validation: Object.fromEntries([
    ['forwardPreflight', `${FORWARD.replace('.txt', '.preflight.json')}`],
    ['forwardStrictDryRun', `${FORWARD.replace('.txt', '.strict-dry-run.json')}`],
    ['rollbackStrictDryRun', `${ROLLBACK.replace('.txt', '.strict-dry-run.json')}`],
  ].map(([name, file]) => {
    if (!fs.existsSync(absolute(file))) return [name, { path: file, present: false }];
    const data = fs.readFileSync(absolute(file));
    return [name, { path: file, present: true, sha256: sha256(data), bytes: data.length }];
  })),
  gates: {
    sourceGuardsVerifiedAgainstImmutableCopy: true,
    protectedCoreOverlap: false,
    entityAndPoiClearance: 'BOUND_TO_PRIOR_READ_ONLY_CUE_SURVEY',
    livePreflight: 'REQUIRED_BEFORE_EXECUTION',
    sourceReuseException: 'REQUIRED_IF_EXECUTED_WITHOUT_A_NEW_CAPTURE',
    explicitOwnerBuildPhrase: 'build the world',
  },
  safetyBoundary: {
    worldEditsPerformed: false,
    rconWritesPerformed: false,
    fullCombinedZonesBuildAuthorized: false,
    cueOnlyBuildAuthorizedByThisArtifact: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(MANIFEST), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
const md = [
  '# Combined Zones R01 GA-J1 discovery cue pilot', '',
  `**Status:** ${manifestWithoutIdentity.status}`,
  `**Manifest identity:** \`${manifestIdentity}\``, '',
  'This is the smallest exact visible pilot: five chiseled-stone-brick cue cells behind the GA-J1 apparent terminus. It is information-only and does not open or commission the Empty Eight.', '',
  `- Source complete-save: \`${audit.packageIdentity.completeSaveSha256}\``,
  `- Cue cell-set: \`${cue.cellSetSha256}\``,
  `- Forward operation: \`${FORWARD}\` (${forwardHash})`,
  `- Rollback operation: \`${ROLLBACK}\` (${rollbackHash})`,
  '- Live edits: **none**', '',
  'Execution still requires strict preflight against the bound source, the internal source-reuse exception if no new capture is taken, and the exact owner phrase `build the world`.', '',
].join('\n');
fs.writeFileSync(absolute(MARKDOWN), `${md}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: MANIFEST,
  markdown: MARKDOWN,
  forward: FORWARD,
  rollback: ROLLBACK,
  manifestIdentity,
  forwardHash,
  rollbackHash,
  sourceStates,
}, null, 2));
