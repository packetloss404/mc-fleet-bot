import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { EventEmitter } from 'events';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  expectedCenteredPosition,
  parseServerPositionComponent,
  teleportPlayer,
} from '../../scripts/run_combined_zones_bee_runtime_fixture.mjs';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_d06_bee_runtime_compatibility_audit.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.md',
);
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-bee-compatibility-'));
const regeneratedJson = path.join(tempDirectory, 'audit.json');
const regeneratedMarkdown = path.join(tempDirectory, 'audit.md');

type JsonRecord = Record<string, any>;

function createTeleportMock(serverPosition: { x: number; y: number; z: number }) {
  const client = new EventEmitter();
  const bot = new EventEmitter() as EventEmitter & JsonRecord;
  bot._client = client;
  bot.physicsEnabled = true;
  bot.entity = {
    eyeHeight: 1.62,
    position: { x: -7.5, y: -60, z: -3.5 },
  };
  const commandLog: string[] = [];
  const rcon = {
    async command(command: string): Promise<string> {
      commandLog.push(command);
      if (command.startsWith('tp ')) {
        queueMicrotask(() => {
          const positionPacket = {
            teleportId: 17,
            x: 0.5,
            y: 65,
            z: 2.5,
            flags: { x: false, y: false, z: false },
          };
          client.emit('position', positionPacket);
          bot.entity.position = {
            x: positionPacket.x,
            y: positionPacket.y,
            z: positionPacket.z,
          };
          bot.emit('forcedMove');
        });
        return 'Teleported CZBeeFixture to 0.500000, 65.000000, 2.500000';
      }
      const index = Number(command.match(/Pos\[(\d)]/)?.[1]);
      const value = [serverPosition.x, serverPosition.y, serverPosition.z][index];
      return `CZBeeFixture has the following entity data: ${value}d`;
    },
  };
  return { bot, rcon, commandLog };
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T06:15:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones D06 bee runtime compatibility audit', () => {
  it('parses exact server position components and centers integer coordinates', () => {
    expect(parseServerPositionComponent(
      'CZBeeFixture has the following entity data: -12.5d',
      'x',
    )).toBe(-12.5);
    expect(expectedCenteredPosition({ x: 0, y: 65, z: 2 })).toEqual({
      x: 0.5,
      y: 65,
      z: 2.5,
    });
    expect(() => parseServerPositionComponent('no numeric position', 'x')).toThrow(
      /not an exact data-get double/,
    );
  });

  it('requires client confirmation and two stable server positions before an action', async () => {
    const { bot, rcon, commandLog } = createTeleportMock({ x: 0.5, y: 65, z: 2.5 });
    const result = await teleportPlayer({
      bot,
      rcon,
      standingPoint: { x: 0, y: 65, z: 2 },
      targetPoint: { x: 0, y: 65, z: 0 },
      phase: 'mock position guard',
      timeoutMs: 100,
      settleDelay: async () => {},
    });
    expect(result).toMatchObject({
      physicsDisabled: true,
      teleportId: 17,
      expected: { x: 0.5, y: 65, z: 2.5 },
      firstServerPosition: { x: 0.5, y: 65, z: 2.5 },
      secondServerPosition: { x: 0.5, y: 65, z: 2.5 },
      stableServerPosition: true,
      conservativeProofRange: 4.5,
    });
    expect(result.eyeDistance).toBeLessThan(4.5);
    expect(commandLog).toHaveLength(7);
    expect(commandLog[0]).toBe('tp CZBeeFixture 0.5 65 2.5 180 0');
    expect(commandLog.slice(1).every((command) => command.startsWith(
      'data get entity CZBeeFixture Pos[',
    ))).toBe(true);
    expect(commandLog.some((command) => /setblock|fill|block_dig|block_place/.test(command)))
      .toBe(false);
  });

  it('fails closed on a stale server-authoritative position', async () => {
    const { bot, rcon, commandLog } = createTeleportMock({ x: -7.5, y: -60, z: -3.5 });
    await expect(teleportPlayer({
      bot,
      rcon,
      standingPoint: { x: 0, y: 65, z: 2 },
      targetPoint: { x: 0, y: 65, z: 0 },
      phase: 'mock stale position guard',
      timeoutMs: 100,
      settleDelay: async () => {},
    })).rejects.toThrow(/first server position x drift/);
    expect(commandLog.some((command) => /setblock|fill|block_dig|block_place/.test(command)))
      .toBe(false);
  });

  it('regenerates the committed audit byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds every local input to its current identity', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    for (const source of Object.values(report.sourceBindings) as JsonRecord[]) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('records the exact runtime result as a hold without production mutation', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'HOLD_EXACT_PRODUCTION_PAPER_RUNTIME_REACHED_CURRENT_AUTOMATION_CLIENT_INCOMPATIBLE_NO_MECHANIC_PASS',
      evidence: {
        productionRuntime: {
          paperVersion: '1.21.11-69-main@94d0c97',
          paperJarSha256:
            'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae',
        },
        disposableRuntime: {
          syntheticEmbeddedBeeCount: 3,
          sourceIndexedRecordsPresent: [0, 1, 2],
          sourceFourthRecordAbsent: true,
        },
        exactRuntimeLootTable: {
          requiresSilkTouch: true,
          copiedComponent: 'minecraft:bees',
          temporaryLootTableProbeCreatedThreeBeeItem: true,
        },
      },
      conclusion: {
        exactProductionRuntimeBinaryBound: true,
        paperBeeItemSerializationObserved: true,
        isolatedRuntimeMechanicProven: false,
        currentProductionCaptureTransportEligible: false,
        blindFleetDependencyUpgradeRecommended: false,
        technicalTreatmentAccepted: false,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        productionMinecraftProcessContacted: false,
        productionWorldContacted: false,
        productionBlockEditCount: 0,
        productionEntityMoveCount: 0,
        operationCellCount: 0,
        worldEditAuthorized: false,
        executable: false,
      },
    });
    expect(report.evidence.attempts).toHaveLength(3);
    expect(report.evidence.attempts[2].serverAcknowledgements).toEqual([
      { sequenceId: 2 },
    ]);
  });
});
