#!/usr/bin/env node
/**
 * Prove intact bee-nest relocation on an isolated disposable Paper server.
 *
 * The caller supplies a byte-for-byte copy of the production Paper jar. This
 * script never connects to production. It creates a temporary flat world,
 * inserts three synthetic embedded bees, performs real Silk Touch break/place
 * and rollback actions through a Mineflayer client, records server-authoritative
 * NBT/state observations, stops the server, and removes the temporary world.
 */

import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

import mineflayerDefault from 'mineflayer';
import { Vec3 } from 'vec3';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const has = (flag) => argv.includes(flag);
const GENERATED_AT = value('--generated-at', '2026-08-06T05:30:00Z');
const SERVER_JAR = value('--server-jar');
const JAVA_EXECUTABLE = path.resolve(value('--java', '/usr/bin/java'));
const EXPECTED_JAR_SHA256 = value(
  '--expected-jar-sha256',
  'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae',
);
const EXPECTED_VERSION = value(
  '--expected-version',
  '1.21.11-69-main@94d0c97',
);
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-runtime-proof.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-runtime-proof.md',
));
const SYNTHETIC_FIXTURE =
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.json';
const KEEP_TEMP = has('--keep-temp');
const RUNTIME_SEED = value('--runtime-seed');
const MINEFLAYER_MODULE = value('--mineflayer-module');
const mineflayer = MINEFLAYER_MODULE
  ? (await import(pathToFileURL(path.resolve(MINEFLAYER_MODULE)).href)).default
  : mineflayerDefault;
const MINEFLAYER_VERSION = JSON.parse(fs.readFileSync(
  MINEFLAYER_MODULE
    ? path.join(path.dirname(path.resolve(MINEFLAYER_MODULE)), 'package.json')
    : path.join(ROOT, 'node_modules/mineflayer/package.json'),
  'utf8',
)).version;
const SERVER_START_TIMEOUT_MS = 120_000;
const ACTION_TIMEOUT_MS = 30_000;
const BOT_NAME = 'CZBeeFixture';
const SOURCE = Object.freeze({ x: 0, y: 65, z: 0 });
const DESTINATION = Object.freeze({ x: 8, y: 65, z: 0 });
const POSITION_TOLERANCE = 1e-6;
const MAX_PROOF_EYE_DISTANCE = 4.5;
let interactionSequence = 0;

function nextInteractionSequence() {
  interactionSequence += 1;
  return interactionSequence;
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D06 bee runtime fixture rejected: ${message}`);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileSha256(filename) {
  return sha256(fs.readFileSync(filename));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function binding(filename, role) {
  const data = fs.readFileSync(path.join(ROOT, filename));
  return { path: filename, bytes: data.length, sha256: sha256(data), role };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withTimeout(promise, milliseconds, label) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} exceeded ${milliseconds}ms`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  await new Promise((resolve) => server.close(resolve));
  invariant(Number.isInteger(port), 'failed to reserve a local port');
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
    return new Promise((resolve, reject) => {
      this.pending.push({ id, resolve, reject });
    });
  }

  async connect() {
    this.socket = net.createConnection({ host: '127.0.0.1', port: this.port });
    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.consume();
    });
    this.socket.on('error', (error) => {
      for (const item of this.pending.splice(0)) item.reject(error);
    });
    await new Promise((resolve, reject) => {
      this.socket.once('connect', resolve);
      this.socket.once('error', reject);
    });
    const id = 1;
    const response = this.response(id);
    this.socket.write(this.packet(id, 3, this.password));
    const authenticated = await withTimeout(response, ACTION_TIMEOUT_MS, 'RCON auth');
    invariant(authenticated.id !== -1, 'RCON authentication failed');
  }

  async command(command) {
    const id = this.nextId;
    this.nextId += 1;
    const response = this.response(id);
    this.socket.write(this.packet(id, 2, command));
    return (await withTimeout(response, ACTION_TIMEOUT_MS, `RCON ${command}`)).body;
  }

  close() {
    this.socket?.destroy();
  }
}

function waitForEvent(emitter, event, errorEvents = ['error']) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      emitter.off(event, onEvent);
      for (const errorEvent of errorEvents) emitter.off(errorEvent, onError);
    };
    const onEvent = (...args) => {
      cleanup();
      resolve(args);
    };
    const onError = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    emitter.once(event, onEvent);
    for (const errorEvent of errorEvents) emitter.once(errorEvent, onError);
  });
}

async function waitForInventory(bot, itemName) {
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const item = bot.inventory.items().find(({ name }) => name === itemName);
    if (item) return item;
    await delay(100);
  }
  throw new Error(`inventory did not receive ${itemName}`);
}

export function parseServerPositionComponent(reply, axis) {
  const match = String(reply).match(
    /:\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)d?\s*$/,
  );
  invariant(match, `server position ${axis} is not an exact data-get double: ${reply}`);
  const value = Number(match[1]);
  invariant(Number.isFinite(value), `server position ${axis} is not finite: ${reply}`);
  return value;
}

export function expectedCenteredPosition(point) {
  return { x: point.x + 0.5, y: point.y, z: point.z + 0.5 };
}

function assertExactPosition(observed, expected, phase) {
  for (const axis of ['x', 'y', 'z']) {
    invariant(
      Math.abs(observed[axis] - expected[axis]) <= POSITION_TOLERANCE,
      `${phase} ${axis} drift: expected ${expected[axis]}, observed ${observed[axis]}`,
    );
  }
}

async function readServerPlayerPosition(rcon, phase) {
  const values = [];
  for (let index = 0; index < 3; index += 1) {
    const reply = await rcon.command(`data get entity ${BOT_NAME} Pos[${index}]`);
    values.push(parseServerPositionComponent(reply, `${phase}[${index}]`));
  }
  return { x: values[0], y: values[1], z: values[2] };
}

export async function teleportPlayer({
  bot,
  rcon,
  standingPoint,
  targetPoint,
  phase,
  timeoutMs = ACTION_TIMEOUT_MS,
  settleDelay = delay,
}) {
  const expected = expectedCenteredPosition(standingPoint);
  bot.physicsEnabled = false;
  const rawPositionPromise = withTimeout(
    waitForEvent(bot._client, 'position'),
    timeoutMs,
    `${phase} clientbound position`,
  );
  const forcedMovePromise = withTimeout(
    waitForEvent(bot, 'forcedMove'),
    timeoutMs,
    `${phase} forced move`,
  );
  const reply = await rcon.command(
    `tp ${BOT_NAME} ${expected.x} ${expected.y} ${expected.z} 180 0`,
  );
  invariant(!/failed|error|unknown/i.test(reply), `teleport failed: ${reply}`);
  const [[rawPosition]] = await Promise.all([
    rawPositionPromise,
    forcedMovePromise,
  ]);
  invariant(rawPosition && Number.isInteger(rawPosition.teleportId),
    `${phase} clientbound position has no teleport id`);
  if (rawPosition.flags && typeof rawPosition.flags === 'object') {
    invariant(!rawPosition.flags.x && !rawPosition.flags.y && !rawPosition.flags.z,
      `${phase} teleport unexpectedly used relative coordinates`);
  }
  assertExactPosition(rawPosition, expected, `${phase} clientbound position`);
  assertExactPosition(bot.entity.position, expected, `${phase} client position`);
  await settleDelay(100);
  const firstServerPosition = await readServerPlayerPosition(rcon, `${phase} first`);
  await settleDelay(100);
  const secondServerPosition = await readServerPlayerPosition(rcon, `${phase} second`);
  assertExactPosition(firstServerPosition, expected, `${phase} first server position`);
  assertExactPosition(secondServerPosition, expected, `${phase} second server position`);
  const eye = {
    x: secondServerPosition.x,
    y: secondServerPosition.y + bot.entity.eyeHeight,
    z: secondServerPosition.z,
  };
  const targetCenter = {
    x: targetPoint.x + 0.5,
    y: targetPoint.y + 0.5,
    z: targetPoint.z + 0.5,
  };
  const eyeDistance = Math.hypot(
    eye.x - targetCenter.x,
    eye.y - targetCenter.y,
    eye.z - targetCenter.z,
  );
  invariant(eyeDistance <= MAX_PROOF_EYE_DISTANCE,
    `${phase} target is outside the conservative proof range: ${eyeDistance}`);
  return {
    physicsDisabled: bot.physicsEnabled === false,
    teleportId: rawPosition.teleportId,
    expected,
    clientPosition: {
      x: bot.entity.position.x,
      y: bot.entity.position.y,
      z: bot.entity.position.z,
    },
    firstServerPosition,
    secondServerPosition,
    stableServerPosition: true,
    eyeDistance,
    conservativeProofRange: MAX_PROOF_EYE_DISTANCE,
  };
}

async function exactThreeRecordQueries(rcon, target, pathPrefix, phase) {
  const presentReplies = [];
  for (let index = 0; index < 3; index += 1) {
    const reply = await rcon.command(`execute if data ${target} ${pathPrefix}[${index}]`);
    invariant(/passed/i.test(reply), `${phase} bee record ${index} is absent: ${reply}`);
    presentReplies.push(reply);
  }
  const fourthRecordReply = await rcon.command(
    `execute unless data ${target} ${pathPrefix}[3]`,
  );
  invariant(/passed/i.test(fourthRecordReply),
    `${phase} contains an unexpected fourth bee record: ${fourthRecordReply}`);
  return {
    embeddedBeeRecordCount: 3,
    presentReplies,
    fourthRecordAbsentReply: fourthRecordReply,
  };
}

async function exactThreeBlockBees(rcon, point, phase) {
  return exactThreeRecordQueries(
    rcon,
    `block ${point.x} ${point.y} ${point.z}`,
    'bees',
    phase,
  );
}

async function exactThreeInventoryBees(rcon, phase) {
  return exactThreeRecordQueries(
    rcon,
    `entity ${BOT_NAME}`,
    'Inventory[{id:"minecraft:bee_nest"}].components."minecraft:bees"',
    phase,
  );
}

async function selectedHotbarSlot(rcon, itemId, phase) {
  const reply = await rcon.command(
    `data get entity ${BOT_NAME} Inventory[{id:"minecraft:${itemId}"}].Slot`,
  );
  const match = reply.match(/(-?\d+)b/);
  invariant(match, `${phase} item slot is unavailable: ${reply}`);
  const slot = Number(match[1]);
  invariant(slot >= 0 && slot <= 8, `${phase} item is not in the hotbar: ${reply}`);
  return { slot, slotReply: reply };
}

async function selectHotbarItem(bot, rcon, itemId, phase) {
  const selection = await selectedHotbarSlot(rcon, itemId, phase);
  bot.quickBarSlot = selection.slot;
  bot._client.write('held_item_slot', { slotId: selection.slot });
  await delay(250);
  return selection;
}

async function waitForItemEntity(rcon, point, phase) {
  const selector = `@e[type=minecraft:item,limit=1,sort=nearest,x=${point.x},y=${point.y},z=${point.z},distance=..3]`;
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const itemNbt = await rcon.command(`data get entity ${selector} Item`);
    if (itemNbt.includes('minecraft:bee_nest')) return { selector, itemNbt };
    await delay(100);
  }
  throw new Error(`${phase} did not produce a bee-nest item entity`);
}

async function pickUpNestItem(rcon, point, phase) {
  const drop = await waitForItemEntity(rcon, point, phase);
  const exactDropBees = await exactThreeRecordQueries(
    rcon,
    `entity ${drop.selector}`,
    'Item.components."minecraft:bees"',
    `${phase} dropped item`,
  );
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  let inventoryNbt = '';
  while (Date.now() < deadline) {
    await rcon.command(`tp ${drop.selector} ${BOT_NAME}`);
    await delay(300);
    inventoryNbt = await rcon.command(`data get entity ${BOT_NAME} Inventory`);
    if (inventoryNbt.includes('minecraft:bee_nest')) break;
  }
  invariant(inventoryNbt.includes('minecraft:bee_nest'),
    `${phase} player did not collect the dropped nest`);
  const exactBeeRecords = await exactThreeInventoryBees(rcon, `${phase} inventory item`);
  return {
    droppedItemNbtSha256: sha256(drop.itemNbt),
    exactDroppedBeeRecords: exactDropBees,
    inventoryNbt,
    inventoryNbtSha256: sha256(inventoryNbt),
    exactBeeRecords,
    physicalItemPickup: true,
  };
}

async function digNest({ bot, rcon, point, phase }) {
  const acknowledgementStart = bot.fixtureDiggingAcknowledgements.length;
  await selectHotbarItem(bot, rcon, 'diamond_axe', `${phase} Silk Touch axe`);
  const positionGuard = await teleportPlayer({
    bot,
    rcon,
    standingPoint: { x: point.x, y: point.y, z: point.z + 2 },
    targetPoint: point,
    phase: `${phase} dig`,
  });
  const heldItemNbt = await rcon.command(`data get entity ${BOT_NAME} SelectedItem`);
  invariant(heldItemNbt.includes('minecraft:diamond_axe')
    && heldItemNbt.includes('minecraft:silk_touch'),
  `${phase} equipped tool is not the Silk Touch axe: ${heldItemNbt}`);
  const location = new Vec3(point.x, point.y, point.z);
  bot._client.write('block_dig', {
    status: 0,
    location,
    face: 3,
    sequence: nextInteractionSequence(),
  });
  bot._client.write('tick_end', {});
  bot.swingArm();
  await delay(5_000);
  bot._client.write('block_dig', {
    status: 2,
    location,
    face: 3,
    sequence: nextInteractionSequence(),
  });
  bot._client.write('tick_end', {});
  bot.swingArm();
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  let airReply = '';
  while (Date.now() < deadline) {
    airReply = await rcon.command(
      `execute if block ${point.x} ${point.y} ${point.z} minecraft:air`,
    );
    if (/passed/i.test(airReply)) break;
    await delay(100);
  }
  invariant(/passed/i.test(airReply),
    `${phase} sequenced player dig did not break the nest; acknowledgements=${JSON.stringify(bot.fixtureDiggingAcknowledgements.slice(acknowledgementStart))}`);
  return {
    heldItemNbtSha256: sha256(heldItemNbt),
    positionGuard,
    sequencedSurvivalPlayerDigPackets: true,
    diggingAcknowledgements:
      bot.fixtureDiggingAcknowledgements.slice(acknowledgementStart),
    ...await pickUpNestItem(rcon, point, phase),
  };
}

async function placeNest({ bot, rcon, point, phase }) {
  const selection = await selectHotbarItem(bot, rcon, 'bee_nest', `${phase} nest`);
  const positionGuard = await teleportPlayer({
    bot,
    rcon,
    standingPoint: { x: point.x, y: point.y, z: point.z + 2 },
    targetPoint: point,
    phase: `${phase} place`,
  });
  bot._client.write('block_place', {
    location: new Vec3(point.x, point.y - 1, point.z),
    direction: 1,
    hand: 0,
    cursorX: 0.5,
    cursorY: 1,
    cursorZ: 0.5,
    insideBlock: false,
    sequence: nextInteractionSequence(),
    worldBorderHit: false,
  });
  bot.swingArm();
  await delay(500);
  const blockState = await rcon.command(
    `execute if block ${point.x} ${point.y} ${point.z} minecraft:bee_nest[facing=south,honey_level=0]`,
  );
  const blockNbt = await rcon.command(`data get block ${point.x} ${point.y} ${point.z}`);
  invariant(/passed/i.test(blockState), `${phase} block state drift: ${blockState}`);
  const exactBeeRecords = await exactThreeBlockBees(rcon, point, `${phase} placed nest`);
  return {
    blockStateReply: blockState,
    blockNbt,
    blockNbtSha256: sha256(blockNbt),
    positionGuard,
    exactBeeRecords,
    selectedHotbarSlot: selection.slot,
    rawSurvivalPlayerPlacePacket: true,
  };
}

async function main() {
  invariant(SERVER_JAR, '--server-jar is required');
  invariant(fs.existsSync(JAVA_EXECUTABLE), `Java executable is absent: ${JAVA_EXECUTABLE}`);
  const jar = path.resolve(SERVER_JAR);
  invariant(fs.statSync(jar).isFile(), 'server jar is absent');
  const jarSha256 = fileSha256(jar);
  invariant(jarSha256 === EXPECTED_JAR_SHA256, 'production jar SHA-256 mismatch');
  const syntheticFixture = JSON.parse(
    fs.readFileSync(path.join(ROOT, SYNTHETIC_FIXTURE), 'utf8'),
  );
  invariant(syntheticFixture.disposition?.syntheticStateContractPassed === true
    && syntheticFixture.disposition?.runtimeMechanicProven === false,
  'synthetic fixture input drift');

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-bee-runtime-'));
  if (RUNTIME_SEED) {
    for (const entry of ['cache', 'versions']) {
      const source = path.join(path.resolve(RUNTIME_SEED), entry);
      if (fs.existsSync(source)) {
        fs.cpSync(source, path.join(tempDirectory, entry), { recursive: true });
      }
    }
  }
  const serverPort = await freePort();
  const rconPort = await freePort();
  const rconPassword = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(path.join(tempDirectory, 'eula.txt'), 'eula=true\n');
  fs.writeFileSync(path.join(tempDirectory, 'server.properties'), [
    'accepts-transfers=false',
    'allow-flight=true',
    'difficulty=peaceful',
    'enable-command-block=false',
    'enable-query=false',
    'enable-rcon=true',
    'enforce-secure-profile=false',
    'force-gamemode=true',
    'gamemode=survival',
    'generate-structures=false',
    'level-name=fixture-world',
    'level-type=minecraft:flat',
    'max-players=2',
    'motd=Combined Zones disposable bee fixture',
    'online-mode=false',
    `rcon.password=${rconPassword}`,
    `rcon.port=${rconPort}`,
    `server-port=${serverPort}`,
    'simulation-distance=3',
    'spawn-protection=0',
    'sync-chunk-writes=true',
    'view-distance=3',
    'white-list=false',
    '',
  ].join('\n'));

  const serverLog = [];
  const server = spawn(
    JAVA_EXECUTABLE,
    ['-Xms512M', '-Xmx1G', '-jar', jar, '--nogui'],
    { cwd: tempDirectory, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const captureLog = (chunk) => {
    serverLog.push(chunk.toString('utf8'));
    if (serverLog.join('').length > 2_000_000) serverLog.shift();
  };
  server.stdout.on('data', captureLog);
  server.stderr.on('data', captureLog);
  let rcon = null;
  let bot = null;
  let result;
  const clientDecoderErrors = [];
  try {
    const startDeadline = Date.now() + SERVER_START_TIMEOUT_MS;
    while (!serverLog.join('').includes('Done (')) {
      invariant(server.exitCode === null, `Paper exited early: ${serverLog.join('').slice(-4000)}`);
      invariant(Date.now() < startDeadline, 'Paper startup timed out');
      await delay(250);
    }
    rcon = new LocalRcon(rconPort, rconPassword);
    await rcon.connect();
    const versionReply = await rcon.command('version');
    const versionEvidence = `${serverLog.join('')}\n${versionReply}`.replace(/§./g, '');
    invariant(
      versionEvidence.includes(EXPECTED_VERSION),
      `runtime version drift: ${versionReply}`,
    );
    const observedVersionLine = versionEvidence
      .split(/\r?\n/)
      .find((line) => line.includes(EXPECTED_VERSION))
      ?.trim() ?? EXPECTED_VERSION;

    bot = mineflayer.createBot({
      host: '127.0.0.1',
      port: serverPort,
      username: BOT_NAME,
      auth: 'offline',
      version: '1.21.11',
      hideErrors: true,
    });
    bot.on('error', (error) => clientDecoderErrors.push(error.message));
    bot.fixtureDiggingAcknowledgements = [];
    bot._client.on('acknowledge_player_digging', (packet) => {
      bot.fixtureDiggingAcknowledgements.push(JSON.parse(JSON.stringify(packet)));
    });
    await withTimeout(waitForEvent(bot, 'spawn', ['error', 'kicked']), 60_000, 'bot spawn');
    for (const command of [
      `gamemode survival ${BOT_NAME}`,
      'fill -5 64 -5 15 64 5 minecraft:stone',
      'fill -5 65 -5 15 70 5 minecraft:air',
      `tp ${BOT_NAME} 0 66 2`,
      `setblock ${SOURCE.x} ${SOURCE.y} ${SOURCE.z} minecraft:bee_nest[facing=south,honey_level=0]`,
      `data merge block ${SOURCE.x} ${SOURCE.y} ${SOURCE.z} {bees:[{entity_data:{id:"minecraft:bee",CustomName:'{"text":"CZ-BEE-1"}'},min_ticks_in_hive:600,ticks_in_hive:1},{entity_data:{id:"minecraft:bee",CustomName:'{"text":"CZ-BEE-2"}'},min_ticks_in_hive:600,ticks_in_hive:2},{entity_data:{id:"minecraft:bee",CustomName:'{"text":"CZ-BEE-3"}'},min_ticks_in_hive:600,ticks_in_hive:3}],"Bukkit.MaxEntities":3}`, 
      `give ${BOT_NAME} minecraft:diamond_axe[minecraft:enchantments={"minecraft:silk_touch":1}] 1`,
    ]) {
      const reply = await rcon.command(command);
      invariant(!/unknown command|incorrect argument|error/i.test(reply), `${command}: ${reply}`);
    }
    const sourceBefore = await rcon.command(
      `data get block ${SOURCE.x} ${SOURCE.y} ${SOURCE.z}`,
    );
    const sourceBeforeExactBees = await exactThreeBlockBees(
      rcon,
      SOURCE,
      'source setup',
    );

    const forwardItem = await digNest({ bot, rcon, point: SOURCE, phase: 'forward' });
    const sourceAfterDig = await rcon.command(
      `execute if block ${SOURCE.x} ${SOURCE.y} ${SOURCE.z} minecraft:air`,
    );
    invariant(/passed/i.test(sourceAfterDig), 'source is not air after forward dig');
    const destinationPlaced = await placeNest({
      bot,
      rcon,
      point: DESTINATION,
      phase: 'forward',
    });
    const rollbackItem = await digNest({
      bot,
      rcon,
      point: DESTINATION,
      phase: 'rollback',
    });
    const destinationAfterDig = await rcon.command(
      `execute if block ${DESTINATION.x} ${DESTINATION.y} ${DESTINATION.z} minecraft:air`,
    );
    invariant(/passed/i.test(destinationAfterDig), 'destination is not air after rollback dig');
    const sourceRestored = await placeNest({
      bot,
      rcon,
      point: SOURCE,
      phase: 'rollback',
    });
    const destinationFinal = await rcon.command(
      `execute if block ${DESTINATION.x} ${DESTINATION.y} ${DESTINATION.z} minecraft:air`,
    );
    invariant(/passed/i.test(destinationFinal), 'destination is not air after rollback');

    const checks = {
      exactProductionJarHash: jarSha256 === EXPECTED_JAR_SHA256,
      exactProductionPaperVersion: versionEvidence.includes(EXPECTED_VERSION),
      sourceStartsWithThreeEmbeddedBees:
        sourceBeforeExactBees.embeddedBeeRecordCount === 3,
      silkTouchItemPreservesThreeBees:
        forwardItem.exactBeeRecords.embeddedBeeRecordCount === 3,
      placedDestinationPreservesThreeBees:
        destinationPlaced.exactBeeRecords.embeddedBeeRecordCount === 3,
      destinationBlockStatePreserved: /passed/i.test(destinationPlaced.blockStateReply),
      rollbackItemPreservesThreeBees:
        rollbackItem.exactBeeRecords.embeddedBeeRecordCount === 3,
      restoredSourcePreservesThreeBees:
        sourceRestored.exactBeeRecords.embeddedBeeRecordCount === 3,
      restoredSourceBlockStatePreserved: /passed/i.test(sourceRestored.blockStateReply),
      sourceAndDestinationInverse: /passed/i.test(destinationFinal),
    };
    invariant(Object.values(checks).every(Boolean), 'runtime proof check failed');
    result = {
      schemaVersion: 1,
      id: 'combined-zones-phase1-d06-bee-nest-runtime-proof',
      generatedAtUtc: GENERATED_AT,
      status:
        'PASS_EXACT_PRODUCTION_PAPER_SILK_TOUCH_THREE_BEE_FORWARD_AND_ROLLBACK_RUNTIME_PROOF_LIVE_CONSOLIDATION_AND_TECHNICAL_ACCEPTANCE_HOLD',
      purpose: 'Prove the selected intact nest relocation mechanism on an isolated disposable server using the exact production Paper binary without contacting or changing production.',
      sourceBindings: {
        syntheticFixture: binding(
          SYNTHETIC_FIXTURE,
          'fail-closed three-member conservation and current-capture rejection contract',
        ),
        productionRuntimeBinary: {
          remotePath: '/opt/packetcraft/paper-server/paper.jar',
          bytes: fs.statSync(jar).size,
          sha256: jarSha256,
          observedVersion: observedVersionLine,
          expectedVersion: EXPECTED_VERSION,
          copiedReadOnlyOverSftp: true,
        },
      },
      runtimeProof: {
        serverMode: 'ISOLATED_DISPOSABLE_FLAT_WORLD_NO_PRODUCTION_CONNECTION',
        client: {
          library: `mineflayer/${MINEFLAYER_VERSION}`,
          username: BOT_NAME,
          minecraftVersion: '1.21.11',
          method: 'authenticated survival client with low-level vanilla dig/place packets and server-authoritative item/NBT assertions',
          knownItemDecoderErrors: clientDecoderErrors,
          decoderBypassedForBeeItemAssertions: true,
        },
        syntheticSource: SOURCE,
        syntheticDestination: DESTINATION,
        mechanism: 'real survival-mode Silk Touch axe break, dropped-item pickup, placement, second Silk Touch axe break, and source rollback placement',
        sourceBefore: {
          blockNbtSha256: sha256(sourceBefore),
          embeddedBeeRecordCount: 3,
          exactIndexedQueries: sourceBeforeExactBees,
        },
        forwardItem: {
          inventoryNbtSha256: forwardItem.inventoryNbtSha256,
          embeddedBeeRecordCount: 3,
          exactIndexedQueries: forwardItem.exactBeeRecords,
          exactDroppedItemQueries: forwardItem.exactDroppedBeeRecords,
          physicalItemPickup: forwardItem.physicalItemPickup,
        },
        destinationPlaced: {
          blockNbtSha256: destinationPlaced.blockNbtSha256,
          embeddedBeeRecordCount: 3,
          exactBlockStateMatched: true,
          exactIndexedQueries: destinationPlaced.exactBeeRecords,
        },
        rollbackItem: {
          inventoryNbtSha256: rollbackItem.inventoryNbtSha256,
          embeddedBeeRecordCount: 3,
          exactIndexedQueries: rollbackItem.exactBeeRecords,
          exactDroppedItemQueries: rollbackItem.exactDroppedBeeRecords,
          physicalItemPickup: rollbackItem.physicalItemPickup,
        },
        sourceRestored: {
          blockNbtSha256: sourceRestored.blockNbtSha256,
          embeddedBeeRecordCount: 3,
          exactBlockStateMatched: true,
          exactIndexedQueries: sourceRestored.exactBeeRecords,
        },
        destinationFinalBlock: 'minecraft:air',
        checks,
      },
      disposition: {
        syntheticStateContractPassed: true,
        exactProductionRuntimeBinaryBound: true,
        isolatedRuntimeMechanicProven: true,
        exactThreeMemberForwardAndRollbackProven: true,
        currentProductionCaptureTransportEligible: false,
        freshLiveConsolidationStillRequired: true,
        productionPluginInterferenceTested: false,
        destinationAccepted: false,
        technicalTreatmentAccepted: false,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        disposableServerStarted: true,
        disposableWorldDeletedAfterStop: !KEEP_TEMP,
        disposableBlockEditsPerformed: true,
        disposableEntityFixtureCount: 3,
        productionHostReadOnlyJarCopied: true,
        productionMinecraftProcessContacted: false,
        productionWorldContacted: false,
        productionBlockEditCount: 0,
        productionEntityMoveCount: 0,
        operationCellCount: 0,
        physicalReleaseAuthorized: false,
        worldEditAuthorized: false,
        executable: false,
      },
    };
    result.runtimeProofPayloadSha256 = sha256(
      `combined-zones-d06-bee-runtime-proof-v1\n${JSON.stringify(result.runtimeProof)}\n`,
    );
    result.reportIdentitySha256 = sha256(
      `combined-zones-d06-bee-runtime-report-v1\n${JSON.stringify({
        schemaVersion: result.schemaVersion,
        id: result.id,
        generatedAtUtc: result.generatedAtUtc,
        status: result.status,
        sourceBindings: result.sourceBindings,
        runtimeProofPayloadSha256: result.runtimeProofPayloadSha256,
        disposition: result.disposition,
        safetyBoundary: result.safetyBoundary,
      })}\n`,
    );
  } finally {
    try {
      bot?.quit('fixture complete');
    } catch {}
    if (rcon) {
      try {
        await rcon.command('stop');
      } catch {}
      rcon.close();
    }
    if (server.exitCode === null) {
      await Promise.race([
        waitForEvent(server, 'exit', []),
        delay(15_000),
      ]);
    }
    if (server.exitCode === null) server.kill('SIGTERM');
    if (!KEEP_TEMP) fs.rmSync(tempDirectory, { recursive: true, force: true });
  }

  invariant(result, 'runtime proof did not complete');
  const markdown = `# Combined Zones D06 bee-nest runtime proof\n\n`
    + `Generated: ${GENERATED_AT}\n\n`
    + `Status: **${result.status}**\n\n`
    + `An isolated disposable flat world ran the exact production Paper binary (${EXPECTED_VERSION}, SHA-256 \`${jarSha256}\`). A real survival-mode Mineflayer client used a Silk Touch diamond axe to break a synthetic nest containing exactly three embedded bees, collect the dropped nest item, place it at a destination, break it again, and restore it to the source.\n\n`
    + `Every server-authoritative checkpoint preserved exactly three bee records and the exact \`facing=south,honey_level=0\` block state. The destination returned to air after rollback.\n\n`
    + `This closes the isolated runtime-mechanic proof only. The production capture remains transport-ineligible because it contains two embedded bees and one linked external bee. Fresh live consolidation, destination/ownership acceptance, production-plugin interference review, guards, and technical acceptance remain required.\n\n`
    + `Production was not connected to or changed. All block/entity changes occurred only in the deleted disposable world. No release operation was generated.\n\n`
    + `Runtime proof payload SHA-256: \`${result.runtimeProofPayloadSha256}\`\n\n`
    + `Report identity SHA-256: \`${result.reportIdentitySha256}\`\n`;
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN, markdown);
  process.stdout.write(`${JSON.stringify({
    output: relative(OUTPUT),
    markdown: relative(MARKDOWN),
    status: result.status,
    productionJarSha256: jarSha256,
    isolatedRuntimeMechanicProven: result.disposition.isolatedRuntimeMechanicProven,
    currentProductionCaptureTransportEligible:
      result.disposition.currentProductionCaptureTransportEligible,
    productionBlockEditCount: result.safetyBoundary.productionBlockEditCount,
    reportIdentitySha256: result.reportIdentitySha256,
  }, null, 2)}\n`);
}

if (process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
