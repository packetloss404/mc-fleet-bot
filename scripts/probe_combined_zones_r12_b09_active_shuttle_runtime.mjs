#!/usr/bin/env node
/** Prove a minimum reversible B09 powered-minecart shuttle on disposable Paper. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
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
const JAVA_EXECUTABLE = path.resolve(value(
  '--java',
  '/home/ianwalmsley/.local/share/Trash/files/cz-openjdk21/usr/lib/jvm/java-21-openjdk-amd64/bin/java',
));
const OUT = path.resolve(value(
  '--out',
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/disposable-runtime-proof.json',
));
const GENERATED_AT = value('--generated-at', '2026-08-22T05:00:00Z');
const EXPECTED_JAR_SHA256 =
  'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae';
const EXPECTED_VERSION = '1.21.11-69-main@94d0c97';
const TAG = 'cz_r12_b09_active_probe';
const RAIL_Y = 65;
const WEST_STOP_X = 0;
const EAST_STOP_X = 16;
const RAIL_X = Object.freeze(Array.from({ length: 15 }, (_, index) => index + 1));
const CONTROL_XS = Object.freeze([4, 13]);
const CONTROL_Y = RAIL_Y;
const CONTROL_Z = 1;
const POWERED_RAIL =
  'minecraft:powered_rail[powered=true,shape=east_west,waterlogged=false]';
const UNPOWERED_RAIL =
  'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]';
const POWER_ON = 'minecraft:lever[face=wall,facing=north,powered=true]';
const POWER_OFF = 'minecraft:lever[face=wall,facing=north,powered=false]';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12 B09 active-shuttle runtime proof rejected: ${message}`);
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
    invariant((await this.response(id)).id !== -1, 'RCON authentication failed');
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

function numericReply(reply) {
  const matches = reply.match(/-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/g);
  invariant(matches?.length, `numeric entity-data reply was not parseable: ${reply}`);
  return Number(matches.at(-1));
}

async function main() {
  invariant(fs.existsSync(SERVER_JAR), 'Paper jar is missing');
  invariant(sha256(fs.readFileSync(SERVER_JAR)) === EXPECTED_JAR_SHA256,
    'Paper jar identity drifted');
  invariant(fs.existsSync(path.join(RUNTIME_SEED, 'cache'))
    && fs.existsSync(path.join(RUNTIME_SEED, 'versions')), 'runtime seed is incomplete');
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12-active-shuttle-'));
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
      invariant(!/unknown command|incorrect argument|error|not loaded/i.test(reply),
        `${command}: ${reply}`);
      commands.push({ command, reply });
      return reply;
    };
    const selector = `@e[type=minecraft:minecart,tag=${TAG},limit=1]`;
    const position = async () => numericReply(await run(`data get entity ${selector} Pos[0]`));
    await run('forceload add -16 -16 31 15');
    await run('fill -2 63 -2 18 68 2 minecraft:air');
    for (let x = WEST_STOP_X; x <= EAST_STOP_X; x += 1) {
      await run(`setblock ${x} ${RAIL_Y - 1} 0 minecraft:polished_diorite`);
      await run(`setblock ${x} ${RAIL_Y} -1 minecraft:polished_diorite`);
      await run(`setblock ${x} ${RAIL_Y} 0 minecraft:rail[shape=east_west,waterlogged=false]`);
      await run(`setblock ${x} ${RAIL_Y} 1 minecraft:polished_diorite`);
      await run(`setblock ${x} ${RAIL_Y} 2 minecraft:stone`);
    }
    for (const x of CONTROL_XS) {
      await run(`fill ${x} ${CONTROL_Y} ${CONTROL_Z} ${x} ${CONTROL_Y} ${CONTROL_Z} ${POWER_OFF} replace minecraft:polished_diorite strict`);
    }
    for (const x of [WEST_STOP_X, EAST_STOP_X]) {
      await run(`fill ${x} ${RAIL_Y} 0 ${x} ${RAIL_Y} 0 minecraft:polished_diorite replace minecraft:rail[shape=east_west,waterlogged=false] strict`);
    }
    for (const x of RAIL_X) {
      await run(`fill ${x} ${RAIL_Y} 0 ${x} ${RAIL_Y} 0 ${UNPOWERED_RAIL} replace minecraft:rail[shape=east_west,waterlogged=false] strict`);
    }
    for (const x of RAIL_X) {
      invariant(/test passed/i.test(await run(
        `execute if block ${x} ${RAIL_Y} 0 ${UNPOWERED_RAIL}`,
      )), `initial fail-closed state failed at x=${x}`);
    }
    await run(`summon minecraft:minecart 1.5 ${RAIL_Y + 0.0625} 0.5 {Tags:["${TAG}"],CustomName:'{"text":"CZ R12 disposable active probe"}',Invulnerable:1b}`);
    invariant(/test passed/i.test(await run(`execute if entity ${selector}`)),
      'tagged disposable vehicle did not spawn');
    for (const x of CONTROL_XS) {
      await run(`setblock ${x} ${CONTROL_Y} ${CONTROL_Z} ${POWER_ON}`);
    }
    for (const x of RAIL_X) {
      invariant(/test passed/i.test(await run(
        `execute if block ${x} ${RAIL_Y} 0 ${POWERED_RAIL}`,
      )), `energized powered state failed at x=${x}`);
    }
    const samples = [];
    let reachedEast = false;
    let returnedWest = false;
    const motionDeadline = Date.now() + 15_000;
    while (Date.now() < motionDeadline && !returnedWest) {
      const x = await position();
      samples.push({ milliseconds: 15_000 - (motionDeadline - Date.now()), x });
      if (x >= 14.25) reachedEast = true;
      if (reachedEast && x <= 2.75) returnedWest = true;
      await delay(100);
    }
    invariant(reachedEast, 'minecart never reached the east terminal');
    invariant(returnedWest, 'minecart did not reverse and return to the west terminal');

    for (const x of CONTROL_XS) {
      await run(`setblock ${x} ${CONTROL_Y} ${CONTROL_Z} ${POWER_OFF}`);
    }
    await delay(2_000);
    for (const x of RAIL_X) {
      invariant(/test passed/i.test(await run(
        `execute if block ${x} ${RAIL_Y} 0 ${UNPOWERED_RAIL}`,
      )), `fail-closed unpowered state failed at x=${x}`);
    }
    const stoppedSamples = [];
    for (let index = 0; index < 8; index += 1) {
      stoppedSamples.push(await position());
      await delay(200);
    }
    invariant(Math.max(...stoppedSamples) - Math.min(...stoppedSamples) <= 0.05,
      `unpowered minecart did not stop: ${stoppedSamples.join(',')}`);

    const terminalStoppedSamples = stoppedSamples;
    invariant(terminalStoppedSamples.every((x) => x >= 1 && x <= 2),
      `minecart did not park inside the west terminal envelope: ${terminalStoppedSamples.join(',')}`);

    await run(`kill @e[type=minecraft:minecart,tag=${TAG}]`);
    invariant(/test failed|no entity was found/i.test(await run(`execute if entity ${selector}`)),
      'tagged disposable vehicle remained after exact cleanup');
    for (const x of [...RAIL_X].reverse()) {
      await run(`fill ${x} ${RAIL_Y} 0 ${x} ${RAIL_Y} 0 minecraft:rail[shape=east_west,waterlogged=false] replace ${UNPOWERED_RAIL} strict`);
    }
    for (const x of [EAST_STOP_X, WEST_STOP_X]) {
      await run(`fill ${x} ${RAIL_Y} 0 ${x} ${RAIL_Y} 0 minecraft:rail[shape=east_west,waterlogged=false] replace minecraft:polished_diorite strict`);
    }
    for (const x of [...CONTROL_XS].reverse()) {
      await run(`fill ${x} ${CONTROL_Y} ${CONTROL_Z} ${x} ${CONTROL_Y} ${CONTROL_Z} minecraft:polished_diorite replace ${POWER_OFF} strict`);
    }
    for (let x = WEST_STOP_X; x <= EAST_STOP_X; x += 1) {
      invariant(/test passed/i.test(await run(
        `execute if block ${x} ${RAIL_Y} 0 minecraft:rail[shape=east_west,waterlogged=false]`,
      )), `source rail was not restored at x=${x}`);
    }
    for (const x of CONTROL_XS) {
      invariant(/test passed/i.test(await run(
        `execute if block ${x} ${CONTROL_Y} ${CONTROL_Z} minecraft:polished_diorite`,
      )), `source control-wall cell was not restored at x=${x}`);
    }
    const reportWithoutIdentity = {
      schemaVersion: 1,
      proofId: 'CZ-R12-B09-MINIMUM-ACTIVE-SHUTTLE-DISPOSABLE-RUNTIME-PROOF',
      status: 'PASS_EXACT_PAPER_POWERED_SHUTTLE_REVERSAL_FAIL_CLOSED_TERMINAL_PARK_AND_CLEANUP',
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
      mechanism: {
        railCellCount: RAIL_X.length,
        unchangedSupportCellCount: RAIL_X.length,
        controlCellCount: CONTROL_XS.length,
        terminalStopCellCount: 2,
        totalBlockTransitionCount: RAIL_X.length + CONTROL_XS.length + 2,
        vehicleCount: 1,
        railStatePowered: POWERED_RAIL,
        supportState: 'minecraft:polished_diorite',
        controlStatePowered: POWER_ON,
        controlStateFailClosed: POWER_OFF,
        terminalStopState: 'minecraft:polished_diorite',
        failClosedRailState: UNPOWERED_RAIL,
      },
      functionalAcceptance: {
        westToEastObserved: reachedEast,
        eastToWestReturnObserved: returnedWest,
        poweredMotionSampleCount: samples.length,
        poweredMinX: Math.min(...samples.map(({ x }) => x)),
        poweredMaxX: Math.max(...samples.map(({ x }) => x)),
        failClosedStoppedSamples: stoppedSamples,
        failClosedMaximumObservedDrift: Math.max(...stoppedSamples) - Math.min(...stoppedSamples),
        terminalFailClosedStoppedSamples: terminalStoppedSamples,
        terminalFailClosedMaximumObservedDrift:
          Math.max(...terminalStoppedSamples) - Math.min(...terminalStoppedSamples),
        terminalControlsDeEnergized: true,
        terminalRailsUnpowered: true,
        terminalVehicleStationary: true,
        terminalVehicleEnvelope: { minX: 1, maxX: 2, y: RAIL_Y + 0.0625, z: 0.5 },
        vehicleExactCleanupPassed: true,
        blockExactCleanupPassed: true,
      },
      evidenceBoundary: {
        provesExactPaperMechanicsOnly: true,
        productionSourceStateProven: false,
        productionEntityTransactionProven: false,
        passengerOrPublicServiceProven: false,
        productionMutationPerformed: false,
      },
      commandTranscript: commands,
    };
    const proofPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
    const report = { ...reportWithoutIdentity, proofPayloadSha256 };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      proofPayloadSha256,
      output: path.relative(ROOT, OUT),
      commandCount: commands.length,
    }, null, 2)}\n`);
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
