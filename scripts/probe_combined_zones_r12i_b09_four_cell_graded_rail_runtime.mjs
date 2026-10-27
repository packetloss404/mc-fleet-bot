#!/usr/bin/env node
/** Prove an isolated four-cell graded rail transaction on disposable Paper 1.21.11. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SERVER_JAR = path.resolve(value(
  '--server-jar',
  '/home/ianwalmsley/.local/share/Trash/files/cz-paper-runtime.b0V9Yp/paper.jar',
));
const RUNTIME_SEED = path.resolve(value(
  '--runtime-seed',
  '/home/ianwalmsley/.local/share/Trash/files/cz-bee-runtime-XU5vdj',
));
const EXPECTED_JAR_SHA256 =
  'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae';
const EXPECTED_VERSION = '1.21.11-69-main@94d0c97';
const JAVA_EXECUTABLE = path.resolve(value(
  '--java',
  '/home/ianwalmsley/.local/share/Trash/files/cz-openjdk21/usr/lib/jvm/java-21-openjdk-amd64/bin/java',
));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:32:00Z');
const OUT = path.resolve(value(
  '--out',
  'data/world-review/combined-zones-r12i-b09-graded-rail-runtime-proof-20260822T023200Z/runtime-proof.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'data/world-review/combined-zones-r12i-b09-graded-rail-runtime-proof-20260822T023200Z/runtime-proof.md',
));
const RAIL_ASCENDING_WEST = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const RAIL_EAST_WEST = 'minecraft:rail[shape=east_west,waterlogged=false]';
const CELLS = Object.freeze([
  { role: 'lower', x: 0, y: 65, z: 0, state: RAIL_ASCENDING_WEST },
  { role: 'lower-middle', x: -1, y: 66, z: 0, state: RAIL_ASCENDING_WEST },
  { role: 'upper-middle', x: -2, y: 67, z: 0, state: RAIL_ASCENDING_WEST },
  { role: 'upper', x: -3, y: 68, z: 0, state: RAIL_EAST_WEST },
]);

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12I graded-rail runtime proof rejected: ${message}`);
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve) => server.close(resolve));
  invariant(Number.isInteger(port), 'could not allocate a loopback port');
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
      const response = {
        id: packet.readInt32LE(0),
        type: packet.readInt32LE(4),
        body: packet.subarray(8, -2).toString('utf8'),
      };
      const index = this.pending.findIndex(({ id }) => id === response.id);
      if (index >= 0) this.pending.splice(index, 1)[0].resolve(response);
    }
  }

  response(id) {
    return new Promise((resolve, reject) => this.pending.push({ id, resolve, reject }));
  }

  async connect() {
    this.socket = net.createConnection({ host: '127.0.0.1', port: this.port });
    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.consume();
    });
    this.socket.on('error', (error) => {
      for (const pending of this.pending.splice(0)) pending.reject(error);
    });
    await new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('error', reject);
    });
    const id = this.nextId++;
    this.socket.write(this.packet(id, 3, this.password));
    const authenticated = await this.response(id);
    invariant(authenticated.id !== -1, 'RCON authentication failed');
  }

  async command(command) {
    const id = this.nextId++;
    this.socket.write(this.packet(id, 2, command));
    return (await this.response(id)).body.replace(/§./g, '');
  }

  close() {
    this.socket?.end();
  }
}

async function main() {
  invariant(fs.existsSync(SERVER_JAR), 'Paper jar is missing');
  invariant(sha256(fs.readFileSync(SERVER_JAR)) === EXPECTED_JAR_SHA256,
    'Paper jar identity drifted');
  invariant(fs.existsSync(path.join(RUNTIME_SEED, 'cache'))
    && fs.existsSync(path.join(RUNTIME_SEED, 'versions')), 'runtime seed is incomplete');
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12i-rail-runtime-'));
  fs.cpSync(path.join(RUNTIME_SEED, 'cache'), path.join(temporaryDirectory, 'cache'),
    { recursive: true });
  fs.cpSync(path.join(RUNTIME_SEED, 'versions'), path.join(temporaryDirectory, 'versions'),
    { recursive: true });
  const serverPort = await freePort();
  const rconPort = await freePort();
  const password = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(path.join(temporaryDirectory, 'eula.txt'), 'eula=true\n');
  fs.writeFileSync(path.join(temporaryDirectory, 'server.properties'), [
    'allow-flight=true', 'difficulty=peaceful', 'enable-query=false', 'enable-rcon=true',
    'enforce-secure-profile=false', 'force-gamemode=true', 'gamemode=creative',
    'generate-structures=false', 'level-name=rail-proof-world', 'level-type=minecraft:flat',
    'max-players=1', 'online-mode=false', `rcon.password=${password}`,
    `rcon.port=${rconPort}`, `server-port=${serverPort}`, 'simulation-distance=3',
    'spawn-protection=0', 'sync-chunk-writes=true', 'view-distance=3', 'white-list=false', '',
  ].join('\n'));
  const logs = [];
  const server = spawn(JAVA_EXECUTABLE, ['-Xms512M', '-Xmx1G', '-jar', SERVER_JAR, '--nogui'], {
    cwd: temporaryDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
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
    invariant(`${logs.join('')}\n${version}`.includes(EXPECTED_VERSION),
      `Paper version drifted: ${version}`);
    const commands = [];
    const run = async (command) => {
      const reply = await rcon.command(command);
      invariant(!/unknown command|incorrect argument|error|not loaded/i.test(reply), `${command}: ${reply}`);
      commands.push({ command, reply });
      return reply;
    };
    await run('forceload add -16 -16 15 15');
    await run('fill -5 62 -2 5 70 2 minecraft:air');
    for (const cell of CELLS) {
      await run(`setblock ${cell.x} ${cell.y - 1} ${cell.z} minecraft:stone`);
    }
    const forwardOrder = [...CELLS].reverse();
    for (const cell of forwardOrder) {
      await run(`fill ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${cell.state} replace minecraft:air strict`);
    }
    const postForwardChecks = [];
    for (const cell of CELLS) {
      const reply = await run(`execute if block ${cell.x} ${cell.y} ${cell.z} ${cell.state}`);
      invariant(/test passed/i.test(reply), `${cell.role} final state mismatch: ${reply}`);
      postForwardChecks.push({ ...cell, reply });
    }
    const rollbackOrder = CELLS;
    for (const cell of rollbackOrder) {
      await run(`fill ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} minecraft:air replace ${cell.state} strict`);
    }
    const postRollbackChecks = [];
    for (const cell of CELLS) {
      const reply = await run(`execute if block ${cell.x} ${cell.y} ${cell.z} minecraft:air`);
      invariant(/test passed/i.test(reply), `${cell.role} rollback mismatch: ${reply}`);
      postRollbackChecks.push({ role: cell.role, reply });
    }
    const reportWithoutIdentity = {
      schemaVersion: 1,
      proofId: 'CZ-R12I-B09-FOUR-CELL-ASCENDING-WEST-RUNTIME-PROOF',
      status: 'PASS_EXACT_PAPER_1_21_11_GRADED_RAIL_STATE_AND_REVERSE_ORDER_INVERSE',
      generatedAtUtc: GENERATED_AT,
      runtime: {
        mode: 'ISOLATED_DISPOSABLE_FLAT_WORLD_NO_PRODUCTION_CONNECTION',
        productionPaperJarSha256: EXPECTED_JAR_SHA256,
        expectedVersion: EXPECTED_VERSION,
        observedVersionReply: version,
        loopbackOnly: true,
        productionWorldLoaded: false,
        productionRconContacted: false,
      },
      geometry: {
        horizontalDirection: 'WEST', verticalRisePerStep: 1,
        expectedStatesLowToHigh: CELLS,
      },
      deterministicOrder: {
        forward: ['upper east_west', 'upper-middle ascending_west',
          'lower-middle ascending_west', 'lower ascending_west'],
        rollbackExactReverse: ['lower ascending_west', 'lower-middle ascending_west',
          'upper-middle ascending_west', 'upper east_west'],
        forwardStatePassCount: postForwardChecks.length,
        rollbackAirPassCount: postRollbackChecks.length,
      },
      commandTranscript: commands,
      disposition: {
        exactFourCellGradedRailStateProven: true,
        exactForwardAndReverseOrderRollbackProven: true,
        turnsOrStationInterfacesProven: false,
        poweredOrOperationalSystemProven: false,
        productionMutationPerformed: false,
      },
    };
    const proofPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
    const report = { ...reportWithoutIdentity, proofPayloadSha256 };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(MARKDOWN, `# CZ-R12I isolated graded-rail runtime proof\n\n`
      + `**Status:** PASS  \n**Proof payload:** \`${proofPayloadSha256}\`\n\n`
      + `The exact production Paper 1.21.11 binary was run in a disposable flat `
      + `world on loopback-only ephemeral ports. A four-cell west-rising stair `
      + `finished as three lower \`ascending_west\` cells and upper \`east_west\`. `
      + `Top-to-bottom installation and its exact reverse bottom-to-top rollback `
      + `both passed all four strict state guards. No production endpoint or `
      + `world was contacted.\n`);
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
}

await main();
