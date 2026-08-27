#!/usr/bin/env node
/** Prove the seven-cell R12H-to-R12I adjacency closure on disposable Paper 1.21.11. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { mountainSurfaceY } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const PROFILE = value('--profile', 'r12k');
if (!['r12k', 'r12l', 'r12n', 'r12p', 'r12q'].includes(PROFILE)) throw new Error(`unsupported proof profile ${PROFILE}`);
const SERVER_JAR = path.resolve(value('--server-jar',
  '/home/ianwalmsley/.local/share/Trash/files/cz-paper-runtime.b0V9Yp/paper.jar'));
const RUNTIME_SEED = path.resolve(value('--runtime-seed',
  '/home/ianwalmsley/.local/share/Trash/files/cz-bee-runtime-XU5vdj'));
const JAVA_EXECUTABLE = path.resolve(value('--java',
  '/home/ianwalmsley/.local/share/Trash/files/cz-openjdk21/usr/lib/jvm/java-21-openjdk-amd64/bin/java'));
const EXPECTED_JAR_SHA256 =
  'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae';
const EXPECTED_VERSION = '1.21.11-69-main@94d0c97';
const GENERATED_AT = value('--generated-at', PROFILE === 'r12k'
  ? '2026-08-22T03:08:00Z' : PROFILE === 'r12l'
    ? '2026-08-22T03:34:00Z' : PROFILE === 'r12n'
      ? '2026-08-22T04:02:00Z' : PROFILE === 'r12p'
        ? '2026-08-22T04:20:00Z' : '2026-08-22T04:42:00Z');
const OUT = path.resolve(value('--out',
  PROFILE === 'r12k'
    ? 'data/world-review/combined-zones-r12k-b09-adjacency-closure-runtime-proof-20260822T030800Z/runtime-proof.json'
    : PROFILE === 'r12l'
      ? 'data/world-review/combined-zones-r12l-b09-adjacency-closure-runtime-proof-20260822T033400Z/runtime-proof.json'
      : PROFILE === 'r12n'
        ? 'data/world-review/combined-zones-r12n-b09-continuous-261-499-runtime-proof-20260822T040200Z/runtime-proof.json'
        : PROFILE === 'r12p'
          ? 'data/world-review/combined-zones-r12p-b09-continuous-261-560-runtime-proof-20260822T042000Z/runtime-proof.json'
          : 'data/world-review/combined-zones-r12q-b09-lower-two-turn-closure-runtime-proof-20260822T044200Z/runtime-proof.json'));
const MARKDOWN = path.resolve(value('--markdown',
  PROFILE === 'r12k'
    ? 'data/world-review/combined-zones-r12k-b09-adjacency-closure-runtime-proof-20260822T030800Z/runtime-proof.md'
    : PROFILE === 'r12l'
      ? 'data/world-review/combined-zones-r12l-b09-adjacency-closure-runtime-proof-20260822T033400Z/runtime-proof.md'
      : PROFILE === 'r12n'
        ? 'data/world-review/combined-zones-r12n-b09-continuous-261-499-runtime-proof-20260822T040200Z/runtime-proof.md'
        : PROFILE === 'r12p'
          ? 'data/world-review/combined-zones-r12p-b09-continuous-261-560-runtime-proof-20260822T042000Z/runtime-proof.md'
          : 'data/world-review/combined-zones-r12q-b09-lower-two-turn-closure-runtime-proof-20260822T044200Z/runtime-proof.md'));
const ASC = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const ASC_NORTH = 'minecraft:rail[shape=ascending_north,waterlogged=false]';
const EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const NORTH_EAST = 'minecraft:rail[shape=north_east,waterlogged=false]';
const NORTH_WEST = 'minecraft:rail[shape=north_west,waterlogged=false]';
const SOUTH_WEST = 'minecraft:rail[shape=south_west,waterlogged=false]';
const R12K_CELLS = Object.freeze([
  { role: 'i282-r12h-low', x: 0, y: 65, z: 0, state: ASC },
  { role: 'i283-r12h-middle', x: -1, y: 66, z: 0, state: ASC },
  { role: 'i284-r12h-middle', x: -2, y: 67, z: 0, state: ASC },
  { role: 'i285-r12h-upper', x: -3, y: 68, z: 0, state: EW },
  { role: 'i286-target', x: -4, y: 68, z: 0, state: ASC },
  { role: 'i287-target', x: -5, y: 69, z: 0, state: ASC },
  { role: 'i288-target', x: -6, y: 70, z: 0, state: ASC },
  { role: 'i289-target', x: -7, y: 71, z: 0, state: EW },
  { role: 'i290-target', x: -8, y: 71, z: 0, state: ASC },
  { role: 'i291-target', x: -9, y: 72, z: 0, state: ASC },
  { role: 'i292-target', x: -10, y: 73, z: 0, state: EW },
  { role: 'i293-r12i-low', x: -11, y: 73, z: 0, state: ASC },
  { role: 'i294-r12i-middle', x: -12, y: 74, z: 0, state: ASC },
  { role: 'i295-r12i-middle', x: -13, y: 75, z: 0, state: ASC },
  { role: 'i296-r12i-upper', x: -14, y: 76, z: 0, state: EW },
]);
const r12lY = [130, 131, 132, 132, 133, 134, 135, 135, 136, 137, 137, 138,
  139, 140, 140, 141, 142, 143, 143, 144, 145, 145, 146, 147, 148, 148,
  149, 150, 151, 151, 152, 153, 153, 154, 155, 156];
const r12lStates = [ASC, ASC, EW, ASC, ASC, ASC, EW, ASC, ASC, EW, ASC, ASC,
  ASC, EW, ASC, ASC, ASC, EW, ASC, ASC, EW, ASC, ASC, ASC, EW, ASC, ASC,
  ASC, EW, ASC, ASC, EW, ASC, ASC, ASC, EW];
const R12L_CELLS = Object.freeze(r12lY.map((y, offset) => {
  const index = 261 + offset;
  return { role: `i${index}-${index >= 275 && index <= 281 ? 'target' : 'accepted'}`,
    x: -offset, y: y - 65, z: 0, state: r12lStates[offset] };
}));
function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model) !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) { throatX = x; break; }
  }
  if (throatX === null) throw new Error('could not reproduce exact east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) points.push({
    x: portal.x + distance, y: portal.y, z: portal.z,
  });
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) points.push({
    x: throatX, y: portal.y, z: portal.z - offset,
  });
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z });
  }
  return points.map((point, index) => ({ ...point, index }));
}
const d05 = JSON.parse(fs.readFileSync(path.join(ROOT,
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json'), 'utf8'));
const connectors = JSON.parse(fs.readFileSync(path.join(ROOT,
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json'), 'utf8'));
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const productionCenterline = buildCenterline(model.formula,
  connectors.funicularFaceComparison.designEndpoints);
const r12nSegment = productionCenterline.slice(261, 500);
const R12N_CELLS = Object.freeze(r12nSegment.map((point, offset) => {
  const index = point.index;
  const next = productionCenterline[index + 1];
  const state = next && next.x === point.x - 1 && next.y === point.y + 1 && next.z === point.z
    ? ASC : EW;
  return { role: `i${index}-${index >= 297 && index <= 419 ? 'target' : 'accepted'}`,
    x: -offset, y: point.y - 65, z: 0, state };
}));
const R12P_CELLS = Object.freeze(productionCenterline.slice(261, 561).map((point) => {
  const index = point.index;
  const next = productionCenterline[index + 1];
  const state = index <= 499
    ? next && next.x === point.x - 1 && next.y === point.y + 1 && next.z === point.z
      ? ASC : EW
    : index === 500 ? NORTH_EAST
      : index === 530 || index === 560 ? NS : ASC_NORTH;
  return { role: `i${index}-${index >= 500 ? 'target' : 'accepted'}`,
    x: point.x - 2049, y: point.y - 65, z: point.z + 768, state };
}));
const R12Q_CELLS = Object.freeze(productionCenterline.slice(9, 561).map((point) => {
  const index = point.index;
  const next = productionCenterline[index + 1];
  const state = index <= 239 ? EW
    : index === 240 ? NORTH_WEST
      : index <= 259 ? NS
        : index === 260 ? SOUTH_WEST
          : index <= 499
            ? next && next.x === point.x - 1 && next.y === point.y + 1 && next.z === point.z
              ? ASC : EW
            : index === 500 ? NORTH_EAST
              : index === 530 || index === 560 ? NS : ASC_NORTH;
  return { role: `i${index}-${index === 240 || index === 260 ? 'target' : 'accepted'}`,
    x: point.x - 2048, y: point.y - 66, z: point.z + 748, state };
}));
const CELLS = PROFILE === 'r12k' ? R12K_CELLS
  : PROFILE === 'r12l' ? R12L_CELLS : PROFILE === 'r12n' ? R12N_CELLS
    : PROFILE === 'r12p' ? R12P_CELLS : R12Q_CELLS;
const TARGET = Object.freeze(CELLS.filter(({ role }) => role.endsWith('-target')));
const PRIOR = Object.freeze(CELLS.filter(({ role }) => !role.endsWith('-target')));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${PROFILE.toUpperCase()} adjacency runtime proof rejected: ${message}`);
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address()?.port;
  await new Promise((resolve) => server.close(resolve));
  invariant(Number.isInteger(port), 'could not allocate loopback port');
  return port;
}

class LocalRcon {
  constructor(port, password) {
    this.port = port;
    this.password = password;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.pending = [];
    this.nextId = 10;
  }
  packet(id, type, body) {
    const payload = Buffer.from(body, 'utf8');
    const packet = Buffer.alloc(payload.length + 14);
    packet.writeInt32LE(payload.length + 10, 0);
    packet.writeInt32LE(id, 4);
    packet.writeInt32LE(type, 8);
    payload.copy(packet, 12);
    return packet;
  }
  consume() {
    while (this.buffer.length >= 4) {
      const length = this.buffer.readInt32LE(0);
      if (this.buffer.length < length + 4) return;
      const packet = this.buffer.subarray(4, length + 4);
      this.buffer = this.buffer.subarray(length + 4);
      const response = { id: packet.readInt32LE(0), type: packet.readInt32LE(4),
        body: packet.subarray(8, -2).toString('utf8') };
      const index = this.pending.findIndex((entry) => entry.id === response.id);
      if (index >= 0) this.pending.splice(index, 1)[0].resolve(response);
    }
  }
  response(id) {
    return new Promise((resolve, reject) => this.pending.push({ id, resolve, reject }));
  }
  async connect() {
    this.socket = net.createConnection({ host: '127.0.0.1', port: this.port });
    this.socket.on('data', (chunk) => { this.buffer = Buffer.concat([this.buffer, chunk]); this.consume(); });
    this.socket.on('error', (error) => this.pending.splice(0).forEach((entry) => entry.reject(error)));
    await new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('error', reject);
    });
    const id = this.nextId++;
    this.socket.write(this.packet(id, 3, this.password));
    invariant((await this.response(id)).id !== -1, 'RCON authentication failed');
  }
  async command(command) {
    const id = this.nextId++;
    this.socket.write(this.packet(id, 2, command));
    return (await this.response(id)).body.replace(/§./g, '');
  }
  close() { this.socket?.end(); }
}

invariant(fs.existsSync(SERVER_JAR) && sha256(fs.readFileSync(SERVER_JAR)) === EXPECTED_JAR_SHA256,
  'Paper jar missing or identity-drifted');
invariant(fs.existsSync(path.join(RUNTIME_SEED, 'cache'))
  && fs.existsSync(path.join(RUNTIME_SEED, 'versions')), 'runtime seed incomplete');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `cz-${PROFILE}-rail-runtime-`));
fs.cpSync(path.join(RUNTIME_SEED, 'cache'), path.join(temporaryDirectory, 'cache'), { recursive: true });
fs.cpSync(path.join(RUNTIME_SEED, 'versions'), path.join(temporaryDirectory, 'versions'), { recursive: true });
const serverPort = await freePort();
const rconPort = await freePort();
const password = crypto.randomBytes(24).toString('hex');
fs.writeFileSync(path.join(temporaryDirectory, 'eula.txt'), 'eula=true\n');
fs.writeFileSync(path.join(temporaryDirectory, 'server.properties'), [
  'allow-flight=true', 'difficulty=peaceful', 'enable-query=false', 'enable-rcon=true',
  'enforce-secure-profile=false', 'force-gamemode=true', 'gamemode=creative',
  'generate-structures=false', 'level-name=rail-proof-world', 'level-type=minecraft:flat',
  'max-players=1', 'online-mode=false', `rcon.password=${password}`, `rcon.port=${rconPort}`,
  `server-port=${serverPort}`, 'simulation-distance=3', 'spawn-protection=0',
  'sync-chunk-writes=true', 'view-distance=3', 'white-list=false', '',
].join('\n'));
const logs = [];
const server = spawn(JAVA_EXECUTABLE, ['-Xms512M', '-Xmx1G', '-jar', SERVER_JAR, '--nogui'], {
  cwd: temporaryDirectory, stdio: ['ignore', 'pipe', 'pipe'],
});
const capture = (chunk) => {
  logs.push(chunk.toString('utf8'));
  if (logs.join('').length > 1_000_000) logs.shift();
};
server.stdout.on('data', capture);
server.stderr.on('data', capture);
let rcon;
try {
  const deadline = Date.now() + 120_000;
  while (!logs.join('').includes('Done (')) {
    invariant(server.exitCode === null, `Paper exited early: ${logs.join('').slice(-4000)}`);
    invariant(Date.now() < deadline, 'Paper startup timed out');
    await delay(250);
  }
  rcon = new LocalRcon(rconPort, password);
  await rcon.connect();
  const version = await rcon.command('version');
  invariant(`${logs.join('')}\n${version}`.includes(EXPECTED_VERSION), 'Paper version drifted');
  const commands = [];
  const run = async (command) => {
    const reply = await rcon.command(command);
    invariant(!/unknown command|incorrect argument|error|not loaded/i.test(reply), `${command}: ${reply}`);
    commands.push({ command, reply });
    return reply;
  };
  await run(PROFILE === 'r12k' ? 'forceload add -16 -16 15 15'
    : PROFILE === 'r12l' ? 'forceload add -48 -16 15 15'
      : PROFILE === 'r12n' ? 'forceload add -256 -16 15 15'
        : PROFILE === 'r12p' ? 'forceload add -16 -80 255 15' : 'forceload add -16 -96 255 15');
  if (PROFILE === 'r12n') {
    for (let x = -240; x <= 0; x += 40) await run(
      `fill ${x} 62 -2 ${Math.min(x + 39, 3)} 184 2 minecraft:air`);
  } else if (PROFILE === 'r12p' || PROFILE === 'r12q') {
    await run('fill -4 62 -64 120 63 4 minecraft:air');
    await run('fill 121 62 -64 242 63 4 minecraft:air');
  } else await run(PROFILE === 'r12k'
    ? 'fill -16 62 -2 3 79 2 minecraft:air'
    : PROFILE === 'r12l' ? 'fill -40 62 -2 3 94 2 minecraft:air'
      : 'fill -4 62 -64 242 128 4 minecraft:air');
  for (const cell of CELLS) await run(`setblock ${cell.x} ${cell.y - 1} ${cell.z} minecraft:stone`);
  for (const cell of [...PRIOR].reverse()) {
    await run(`fill ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${cell.state} replace minecraft:air strict`);
  }
  for (const cell of PRIOR) invariant(/test passed/i.test(await run(
    `execute if block ${cell.x} ${cell.y} ${cell.z} ${cell.state}`)), `${cell.role} seed mismatch`);
  for (const cell of [...TARGET].reverse()) {
    await run(`fill ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${cell.state} replace minecraft:air strict`);
  }
  for (const cell of CELLS) invariant(/test passed/i.test(await run(
    `execute if block ${cell.x} ${cell.y} ${cell.z} ${cell.state}`)), `${cell.role} post mismatch`);
  for (const cell of TARGET) {
    await run(`fill ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} minecraft:air replace ${cell.state} strict`);
  }
  for (const cell of TARGET) invariant(/test passed/i.test(await run(
    `execute if block ${cell.x} ${cell.y} ${cell.z} minecraft:air`)), `${cell.role} rollback mismatch`);
  for (const cell of PRIOR) invariant(/test passed/i.test(await run(
    `execute if block ${cell.x} ${cell.y} ${cell.z} ${cell.state}`)), `${cell.role} prior drifted`);
  const reportWithoutIdentity = {
    schemaVersion: 1,
    proofId: PROFILE === 'r12k'
      ? 'CZ-R12K-B09-R12H-R12I-SEVEN-CELL-ADJACENCY-CLOSURE-RUNTIME-PROOF'
      : PROFILE === 'r12l'
        ? 'CZ-R12L-B09-CONTINUOUS-261-296-SEVEN-CELL-ADJACENCY-CLOSURE-RUNTIME-PROOF'
        : PROFILE === 'r12n'
          ? 'CZ-R12N-B09-CONTINUOUS-261-499-ONE-HUNDRED-TWENTY-THREE-CELL-ADJACENCY-CLOSURE-RUNTIME-PROOF'
          : PROFILE === 'r12p'
            ? 'CZ-R12P-B09-CONTINUOUS-261-560-SIXTY-ONE-CELL-SUMMIT-RETURN-CLOSURE-RUNTIME-PROOF'
            : 'CZ-R12Q-B09-LOWER-TWO-TURN-CLOSURE-RUNTIME-PROOF',
    status: 'PASS_EXACT_PAPER_1_21_11_GRADED_RAIL_STATE_AND_REVERSE_ORDER_INVERSE',
    generatedAtUtc: GENERATED_AT,
    runtime: { mode: 'ISOLATED_DISPOSABLE_FLAT_WORLD_NO_PRODUCTION_CONNECTION',
      productionPaperJarSha256: EXPECTED_JAR_SHA256, expectedVersion: EXPECTED_VERSION,
      observedVersionReply: version, loopbackOnly: true, productionWorldLoaded: false,
      productionRconContacted: false },
    geometry: { horizontalDirection: PROFILE === 'r12q' ? 'EAST_THEN_NORTH_THEN_WEST_THEN_NORTH'
      : PROFILE === 'r12p' ? 'WEST_THEN_NORTH' : 'WEST', exactConnectedStatesLowToHigh: CELLS,
      operatedClosureCellsLowToHigh: TARGET },
    deterministicOrder: {
      forward: TARGET.slice().reverse().map(({ role, state }) => `${role} ${state}`),
      rollbackExactReverse: TARGET.map(({ role, state }) => `${role} ${state}`),
      forwardStatePassCount: CELLS.length, rollbackAirPassCount: TARGET.length,
      rollbackPriorStatePassCount: PRIOR.length,
    },
    commandTranscript: commands,
    disposition: { [PROFILE === 'r12n'
      ? 'exactOneHundredTwentyThreeCellAdjacencyClosureStateProven'
      : PROFILE === 'r12p'
        ? 'exactSixtyOneCellSummitReturnClosureStateProven'
        : PROFILE === 'r12q'
          ? 'exactTwoCellLowerTurnClosureStateProven'
      : 'exactSevenCellAdjacencyClosureStateProven']: true,
      exactFifteenCellConnectedPostTopologyProven: PROFILE === 'r12k',
      exactThirtySixCellConnectedPostTopologyProven: PROFILE === 'r12l',
      ...(PROFILE === 'r12n' ? { exactTwoHundredThirtyNineCellConnectedPostTopologyProven: true } : {}),
      ...(PROFILE === 'r12p' ? { exactThreeHundredCellConnectedPostTopologyProven: true,
        exactTurnStateProven: true, exactAscendingNorthStatesProven: true } : {}),
      ...(PROFILE === 'r12q' ? { exactFiveHundredFiftyTwoCellConnectedPostTopologyProven: true,
        exactNorthWestTurnStateProven: true, exactSouthWestTurnStateProven: true,
        allFourDirectionFamiliesAndAscendingStatesPreserved: true } : {}),
      bothAcceptedPriorSegmentsPreservedAfterForwardAndRollback: true,
      exactForwardAndReverseOrderRollbackProven: true,
      turnsOrStationInterfacesProven: PROFILE === 'r12p' || PROFILE === 'r12q',
      poweredOrOperationalSystemProven: false,
      productionMutationPerformed: false },
  };
  const proofPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
  const report = { ...reportWithoutIdentity, proofPayloadSha256 };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN, `# CZ-${PROFILE === 'r12k' ? 'R12K R12H-to-R12I'
    : PROFILE === 'r12l' ? 'R12L 261-to-296' : PROFILE === 'r12n'
      ? 'R12N 261-to-499' : PROFILE === 'r12p' ? 'R12P 261-to-560 summit-return'
        : 'R12Q 9-to-560 lower two-turn'} adjacency-closure runtime proof\n\n`
    + `**Status:** PASS  \n**Proof payload:** \`${proofPayloadSha256}\`\n\n`
    + `Exact production Paper 1.21.11 verifies the ${TARGET.length} target states, one resulting `
    + `${CELLS.length}-cell connected passive rail component, exact reverse rollback to air, and `
    + `preservation of all ${PRIOR.length} accepted interface states in a disposable loopback-only world.\n`);
  console.log(JSON.stringify({ status: report.status, proofPayloadSha256,
    output: path.relative(ROOT, OUT), commandCount: commands.length }, null, 2));
} finally {
  rcon?.close();
  if (server.exitCode === null) server.kill('SIGTERM');
  const deadline = Date.now() + 10_000;
  while (server.exitCode === null && Date.now() < deadline) await delay(100);
  if (server.exitCode === null) server.kill('SIGKILL');
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
