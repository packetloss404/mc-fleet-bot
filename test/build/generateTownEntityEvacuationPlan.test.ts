import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  capturedSourceMatchReasons,
  duplicateCapturedUuidKeys,
  entityExecutionPriority,
  immutableProjection,
} from '../../scripts/generate_town_entity_evacuation_plan.mjs';

const ROOT = path.resolve(__dirname, '../..');
const HISTORICAL_GATE_PATH = path.join(
  ROOT,
  'data/world-review/town-expansion-r1-live-entity-gate-nbt2-20260728.json',
);
const CANONICAL_OPERATION_SHA256 =
  '8a9242fa2cd58a3b83df28b1ded4edab79715366818774e7d7b44ace621de40f';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'town-entity-evacuation-'),
);
const outputPath = path.join(temporaryDirectory, 'manifest.json');
const gateFixturePath = path.join(temporaryDirectory, 'historical-gate.json');

interface TransactionRow {
  uuidKey: string;
  executionPriority: number;
  label: string;
  entityType: string;
  disposition: string;
  hardStopReasons: string[];
  collisionObservations: Array<{
    targetBox: number[];
    collisionClass: string;
  }>;
  historicalStateProjectionSha256: string[];
  immutableProjectionSha256: string;
  sanctuarySlot: {
    destination: [number, number, number];
    centerGround: string;
    destinationChunk: [number, number];
    outsideTargetHalo: boolean;
    footingStrategy: string;
    temporaryRail: null | {
      before: string;
      during: string;
      after: string;
    };
  };
}

interface Manifest {
  schemaVersion: number;
  status: string;
  authorizedForExecution: boolean;
  authorizedForPartialEvacuation: boolean;
  worldReleaseAuthorized: boolean;
  source: {
    gateSha256: string;
    operationSha256: string;
    snapshotSha256: string;
    targetHaloEnvelope: number[];
  };
  counts: Record<string, number>;
  sanctuary: {
    verifiedSlotCount: number;
    assignedSlotCount: number;
    slots: Array<{
      destination: [number, number, number];
      outsideTargetHalo: boolean;
      dryColumns: number;
      generatedColumns: number;
      twoBlockHeadroomColumns: number;
      footingEvidenceSha256: string;
    }>;
  };
  transactionContract: { executionBlocked: boolean };
  unresolvedObservations: Array<{
    label: string;
    disposition: string;
  }>;
  blockedUuidRows: TransactionRow[];
  transactionRows: TransactionRow[];
}

let manifest: Manifest;

beforeAll(() => {
  // Preserve the historical blocker/NBT corpus as an offline regression
  // fixture without rewriting the evidence report it came from.
  const historicalGate = JSON.parse(
    fs.readFileSync(HISTORICAL_GATE_PATH, 'utf8'),
  );
  historicalGate.packages[0].operationSha256 = CANONICAL_OPERATION_SHA256;
  fs.writeFileSync(
    gateFixturePath,
    `${JSON.stringify(historicalGate, null, 2)}\n`,
  );
  execFileSync(
    process.execPath,
    [
      'scripts/generate_town_entity_evacuation_plan.mjs',
      '--gate',
      gateFixturePath,
      '--out',
      outputPath,
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
}, 30000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Town expansion entity evacuation plan', () => {
  it('authorizes only the exact 175-row partial evacuation', () => {
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.status).toBe(
      'READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED',
    );
    expect(manifest.authorizedForExecution).toBe(false);
    expect(manifest.authorizedForPartialEvacuation).toBe(true);
    expect(manifest.worldReleaseAuthorized).toBe(false);
    expect(manifest.counts).toMatchObject({
      blockerObservations: 185,
      directCellVolumeObservations: 19,
      conservativeHaloOnlyObservations: 166,
      capturedObservations: 181,
      verifiedCapturedObservations: 177,
      uniqueCapturedUuids: 175,
      duplicateObservationRows: 2,
      eligibleTransactionRows: 174,
      hardStopTransactionRows: 1,
      ordinaryLivestockRows: 158,
      specialRelocatableRows: 16,
      droppedItemRows: 1,
      unresolvedNonTransientObservations: 6,
      transientAbsenceOnlyObservations: 2,
    });
  });

  it('creates exactly one move row per UUID and retains all collisions', () => {
    const uuidKeys = manifest.transactionRows.map((row) => row.uuidKey);
    expect(new Set(uuidKeys).size).toBe(174);
    expect(manifest.transactionRows.every(
      (row) => (
        row.disposition === 'ELIGIBLE_REVERSIBLE_RELOCATION'
        && row.hardStopReasons.length === 0
      ),
    )).toBe(true);
    expect(manifest.transactionRows.reduce(
      (count, row) => count + row.collisionObservations.length,
      0,
    )).toBe(176);
    const repeated = manifest.transactionRows.filter(
      (row) => row.collisionObservations.length > 1,
    );
    expect(repeated).toHaveLength(2);
    expect(repeated.every(
      (row) => row.collisionObservations.length === 2,
    )).toBe(true);
    expect(manifest.blockedUuidRows).toHaveLength(1);
    expect(manifest.blockedUuidRows[0]).toMatchObject({
      entityType: 'minecraft:item',
      hardStopReasons: ['missing-immutable-path-capture:Item'],
    });
  });

  it('permits volatile history drift while preserving one immutable hash', () => {
    const volatileDrift = manifest.transactionRows.filter(
      (row) => row.historicalStateProjectionSha256.length > 1,
    );
    expect(volatileDrift.map((row) => row.label).sort()).toEqual(['Chicken']);
    expect(manifest.transactionRows.every(
      (row) => /^[a-f0-9]{64}$/.test(row.immutableProjectionSha256),
    )).toBe(true);
  });

  it('excludes four ambiguous bindings and keeps gate misses unresolved', () => {
    const unresolved = manifest.unresolvedObservations.map(
      (row) => [row.label, row.disposition],
    );
    expect(unresolved.filter(
      ([, disposition]) => disposition === 'UNRESOLVED_HARD_STOP',
    ).map(([label]) => label).sort()).toEqual([
      'Bee',
      'Bee',
      'Cow',
      'Cow',
      'Pig',
      'Sheep',
    ]);
    expect(unresolved.filter(
      ([, disposition]) => disposition === 'ABSENCE_ONLY_FRESH_GATE_REQUIRED',
    )).toEqual([
      ['Egg', 'ABSENCE_ONLY_FRESH_GATE_REQUIRED'],
      ['Egg', 'ABSENCE_ONLY_FRESH_GATE_REQUIRED'],
    ]);
  });

  it('assigns type-specific dry footing and an exact temporary minecart rail', () => {
    expect(manifest.sanctuary.assignedSlotCount).toBe(175);
    expect(manifest.sanctuary.verifiedSlotCount).toBeGreaterThanOrEqual(
      manifest.sanctuary.assignedSlotCount,
    );
    const destinations = manifest.transactionRows.map(
      (row) => JSON.stringify(row.sanctuarySlot.destination),
    );
    expect(new Set(destinations).size).toBe(174);
    expect(new Set(manifest.transactionRows.map(
      (row) => JSON.stringify(row.sanctuarySlot.destinationChunk),
    )).size).toBe(174);
    const assigned = manifest.transactionRows.map(
      (row) => row.sanctuarySlot,
    );
    for (let left = 0; left < assigned.length; left += 1) {
      for (let right = left + 1; right < assigned.length; right += 1) {
        const [leftX, , leftZ] = assigned[left].destination;
        const [rightX, , rightZ] = assigned[right].destination;
        expect(
          Math.abs(leftX - rightX) >= 5
          || Math.abs(leftZ - rightZ) >= 5,
        ).toBe(true);
      }
    }
    const turtles = manifest.transactionRows.filter(
      (row) => row.label === 'Turtle',
    );
    expect(turtles).toHaveLength(4);
    expect(turtles.every(
      (row) => (
        row.sanctuarySlot.centerGround === 'minecraft:sand'
        && row.sanctuarySlot.footingStrategy === 'natural-sand'
      ),
    )).toBe(true);
    const minecart = manifest.transactionRows.find(
      (row) => row.entityType === 'minecraft:chest_minecart',
    );
    expect(minecart?.sanctuarySlot.temporaryRail).toEqual({
      position: expect.any(Array),
      before: 'minecraft:air',
      during: 'minecraft:rail[shape=north_south,waterlogged=false]',
      after: 'minecraft:air',
    });
    for (const slot of manifest.sanctuary.slots) {
      expect(slot.outsideTargetHalo).toBe(true);
      expect(slot.generatedColumns).toBe(25);
      expect(slot.dryColumns).toBe(25);
      expect(slot.twoBlockHeadroomColumns).toBe(25);
      expect(slot.footingEvidenceSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('orders despawn-sensitive items, vehicles, specials, then livestock', () => {
    expect(entityExecutionPriority({
      entityType: 'minecraft:item',
      policyClass: 'dropped-item-relocatable',
    })).toBe(0);
    expect(entityExecutionPriority({
      entityType: 'minecraft:chest_minecart',
      policyClass: 'special-relocatable',
    })).toBe(1);
    expect(entityExecutionPriority({
      entityType: 'minecraft:bee',
      policyClass: 'special-relocatable',
    })).toBe(2);
    expect(entityExecutionPriority({
      entityType: 'minecraft:cow',
      policyClass: 'ordinary-livestock',
    })).toBe(3);
    const priorities = manifest.transactionRows.map(
      (row) => row.executionPriority,
    );
    expect(priorities).toEqual([...priorities].sort((left, right) => left - right));
    expect(priorities[0]).toBe(1);
    const specialEnd = priorities.lastIndexOf(2);
    expect(specialEnd).toBeGreaterThanOrEqual(0);
    expect(priorities.slice(specialEnd + 1).every(
      (priority) => priority === 3,
    )).toBe(true);
  });

  it('binds the gate, operation package, and immutable snapshot identities', () => {
    expect(manifest.source.gateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.source.operationSha256).toBe(
      CANONICAL_OPERATION_SHA256,
    );
    expect(manifest.source.snapshotSha256).toBe(
      'f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e',
    );
    expect(manifest.source.targetHaloEnvelope).toEqual([
      -715,
      -48,
      -720,
      1302,
      153,
      298,
    ]);
  });

  it('identifies duplicate captures and wrong nearest-observation assignment', () => {
    const duplicates = duplicateCapturedUuidKeys([
      { nbtCapture: { uuidIntArray: [1, 2, 3, 4] } },
      { nbtCapture: { uuidIntArray: [1, 2, 3, 4] } },
      { nbtCapture: { uuidIntArray: [5, 6, 7, 8] } },
    ]);
    expect([...duplicates]).toEqual(['1,2,3,4']);
    const first = {
      label: 'Chicken',
      position: [10, 64, 10],
      nbtCapture: { capturedPosition: [10.9, 64, 10] },
    };
    const second = {
      label: 'Chicken',
      position: [11, 64, 10],
      nbtCapture: { capturedPosition: [11.1, 64, 10] },
    };
    expect(capturedSourceMatchReasons(first, [first, second])).toEqual([
      'captured-position-nearest-different-observation',
    ]);
    expect(capturedSourceMatchReasons(second, [first, second])).toEqual([]);
  });

  it('defines immutable projections independent of tick fields and represents Bee positions', () => {
    const capture = {
      entityType: 'minecraft:chicken',
      preservationPaths: {
        Age: {
          present: true,
          reply: 'Chicken has the following entity data: -5',
        },
        EggLayTime: {
          present: true,
          reply: 'Chicken has the following entity data: 200',
        },
        IsChickenJockey: {
          present: true,
          reply: 'Chicken has the following entity data: 0b',
        },
      },
      vehicleRelationPresent: false,
      passengerRelationPresent: false,
    };
    const projection = immutableProjection(capture);
    expect(projection?.paths).not.toContain('Age');
    expect(projection?.paths).not.toContain('EggLayTime');
    expect(projection?.paths).toContain('IsChickenJockey');
    const beeProjection = immutableProjection({
      entityType: 'minecraft:bee',
      preservationPaths: {
        HivePos: {
          present: true,
          reply: 'Bee has the following entity data: [I; 1, 2, 3]',
        },
        HasNectar: {
          present: true,
          reply: 'Bee has the following entity data: 1b',
        },
      },
      vehicleRelationPresent: false,
      passengerRelationPresent: false,
    });
    expect(beeProjection?.paths).toEqual(expect.arrayContaining([
      'HivePos',
      'hive_pos',
      'FlowerPos',
      'flower_pos',
    ]));
    expect(Object.keys(beeProjection?.values ?? {})).toEqual(
      expect.arrayContaining([
        'HivePos',
        'hive_pos',
        'FlowerPos',
        'flower_pos',
      ]),
    );
    expect(beeProjection?.paths).toContain('HasNectar');
  });

  it('binds a sanctuary snapshot and excludes failed destination chunks', () => {
    const excludedChunk = manifest.transactionRows[0].sanctuarySlot.destinationChunk;
    const exclusionPath = path.join(temporaryDirectory, 'exclusions.json');
    const preferencePath = path.join(temporaryDirectory, 'preferences.json');
    const regeneratedPath = path.join(temporaryDirectory, 'excluded-manifest.json');
    fs.writeFileSync(exclusionPath, JSON.stringify({
      schemaVersion: 1,
      badDestinationChunks: [excludedChunk],
    }));
    fs.writeFileSync(preferencePath, JSON.stringify({
      schemaVersion: 1,
      rows: manifest.sanctuary.slots.map((slot) => ({
        status: 'PASS',
        destination: slot.destination,
        destinationChunk: [
          Math.floor(slot.destination[0] / 16),
          Math.floor(slot.destination[2] / 16),
        ],
      })),
    }));
    execFileSync(
      process.execPath,
      [
        'scripts/generate_town_entity_evacuation_plan.mjs',
        '--gate',
        gateFixturePath,
        '--sanctuary-snapshot',
        'data/worldsnap-town-expansion-prerelease-20260728T0930Z/region',
        '--exclude-destinations',
        exclusionPath,
        '--prefer-destinations',
        preferencePath,
        '--out',
        regeneratedPath,
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    const regenerated = JSON.parse(fs.readFileSync(regeneratedPath, 'utf8'));
    expect(regenerated.source.sanctuarySnapshot).toMatchObject({
      sha256: manifest.source.snapshotSha256,
      regionFileCount: 26,
    });
    expect(regenerated.source.excludedDestinationChunks).toContainEqual(
      excludedChunk,
    );
    expect([
      ...regenerated.transactionRows,
      ...regenerated.blockedUuidRows,
    ].some(
      (row) => (
        JSON.stringify(row.sanctuarySlot.destinationChunk)
        === JSON.stringify(excludedChunk)
      ),
    )).toBe(false);
    expect([
      ...regenerated.transactionRows,
      ...regenerated.blockedUuidRows,
    ].every(
      (row) => row.sanctuarySlot.preference === 'exact-live-pass',
    )).toBe(true);
    expect(regenerated.source.destinationPreferences[0].sha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  }, 30000);
});
