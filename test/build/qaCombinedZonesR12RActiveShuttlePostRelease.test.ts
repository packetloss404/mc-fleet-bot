import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r12r_b09_active_shuttle_post_release.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12r-post-qa-'));
const TRANSACTION = 'combined-zones-r12r-b09-bounded-active-shuttle';
const TAG = 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b';
const NAME = 'CZ R12 minecart 7464210e11d51e28';
const UUID = [101, -202, 303, -404];
const CONTROL = 'minecraft:lever[face=wall,facing=north,powered=false]';
const RAIL = 'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]';
const DIORITE = 'minecraft:polished_diorite';

const controls = [2061, 2070].map((x) => ({ x, y: 130, z: -747 }));
const stops = [2057, 2073].map((x) => ({ x, y: 130, z: -748 }));
const rails = Array.from({ length: 15 }, (_, index) => ({
  x: 2058 + index, y: 130, z: -748,
}));
const forward = [
  ...controls.map((cell) => ({ cell, from: DIORITE, to: CONTROL })),
  ...stops.map((cell) => ({
    cell, from: 'minecraft:rail[shape=east_west,waterlogged=false]', to: DIORITE,
  })),
  ...rails.map((cell) => ({
    cell, from: 'minecraft:rail[shape=east_west,waterlogged=false]', to: RAIL,
  })),
];
const rollback = forward.slice().reverse().map(({ cell, from, to }) => ({
  cell, from: to, to: from,
}));
const selector = 'kill @e[type=minecraft:minecart,'
  + `tag=${TAG},x=2058,y=130,z=-748,dx=15,dy=1,dz=1,`
  + `nbt={UUID:[I;${UUID.join(',')}]},limit=2]`;

async function moduleUnderTest() {
  return import(`${pathToFileUrl(SCRIPT)}?test=${Date.now()}-${Math.random()}`);
}

function pathToFileUrl(filename: string) {
  return `file://${filename}`;
}

function passingInput() {
  const entitySpec = {
    tag: TAG,
    name: NAME,
    aabb: { minX: 2058, maxX: 2073, minY: 130, maxY: 131, minZ: -748, maxZ: -747 },
    terminalParkAabb: {
      minX: 2058, maxX: 2059, minY: 130, maxY: 131, minZ: -748, maxZ: -747,
    },
  };
  const entityReport = {
    transactionId: TRANSACTION,
    status: 'EXECUTED_POSTCONDITION_VERIFIED',
    capturedIdentity: {
      uuidIntArray: UUID,
      entityType: 'minecraft:minecart',
      position: [2058.5, 130.0625, -747.5],
      tag: TAG,
      name: NAME,
    },
    safetyBoundary: {
      broadMinecartKillUsed: false,
      tagOnlyKillUsed: false,
    },
    reportPayloadSha256: 'entity-payload',
  };
  const functionalReport = {
    transactionId: TRANSACTION,
    status: 'PASS_BOUNDED_ACTIVE_SHUTTLE_FUNCTIONAL_AND_FAIL_CLOSED_PARK',
    capturedIdentity: { uuidIntArray: UUID },
    entityType: 'minecraft:minecart',
    tag: TAG,
    westToEastPosition: [2071.5, 130.0625, -747.5],
    eastToWestReturnPosition: [2058.5, 130.0625, -747.5],
    terminal: {
      controlsOff: true,
      railsUnpoweredCount: 15,
      stationary: true,
      motion: [0, 0, 0],
      insideWestParkEnvelope: true,
      position: [2058.5, 130.0625, -747.5],
      globalTagCount: 1,
      boundedTagCount: 1,
      boundedMinecartCount: 1,
    },
    entityAuthentication: {
      selector: selector.slice(5),
      command: `execute if entity ${selector.slice(5)}`,
      reply: 'Test passed, count: 1',
      count: 1,
    },
    entityForwardReportPayloadSha256: 'entity-payload',
    exactSelectorTranscript: [
      `execute if entity ${selector.slice(5)}`,
    ],
    reportPayloadSha256: 'functional-payload',
  };
  const manifest = {
    transactionId: TRANSACTION,
    scope: {
      exactBlockTargetCount: 19,
      geometry: {
        targetCells: {
          cellCount: 19,
          coordinateSetSha256:
            'b557ebeadb288853bfc1c9e5bc3f4311ee496e1f637a41317578a4af57d93dab',
        },
        controls: { cellCount: 2 },
        terminalStops: { cellCount: 2 },
        poweredTrack: { cellCount: 15 },
      },
    },
  };
  const ledger = {
    transactionId: TRANSACTION,
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    completedReleaseIdentitySha256: 'a'.repeat(64),
    manifest: { sha256: 'manifest-file' },
    entityTransaction: {
      forwardReportPayloadSha256: 'entity-payload',
      exactCapturedUuidRollbackReady: true,
      compensateBeforeBlockRollback: true,
    },
    functionalAcceptance: { reportPayloadSha256: 'functional-payload' },
    evidenceBindings: [
      { path: 'functional.json', sha256: 'functional-file' },
      { path: 'entity.json', sha256: 'entity-file' },
    ],
    rollbackReadiness: {
      status: 'PASS_EXACT_ENTITY_FIRST_THEN_BLOCK_INVERSE',
      broadEntityCleanupAllowed: false,
      tagOnlyCleanupAllowed: false,
      exactEntitySelectorCommand: selector,
      blockRollbackOrder: [
        'b09-active-shuttle-fail-closed-track',
        'b09-active-shuttle-fail-closed-controls',
      ],
    },
    blockTransaction: { exactTargetCount: 19, rollbackPoststatePassCount: 19 },
  };
  return {
    manifest,
    ledger,
    entitySpec,
    entityReport,
    functionalReport,
    postTargetStates: forward.map(({ cell, to }) => ({ cell, state: to })),
    postPriorRailStates: Array.from({ length: 535 }, (_, index) => ({
      cell: { x: 3000 + index, y: 130, z: -748 },
      expectedState: `minecraft:test_state_${index}`,
      state: `minecraft:test_state_${index}`,
    })),
    savedEntities: [{
      type: 'minecraft:minecart',
      position: [2058.5, 130.0625, -747.5],
      uuidIntArray: UUID,
      tags: [TAG],
      customName: `{"text":"${NAME}"}`,
      motion: [0, 0, 0],
      passengerCount: 0,
    }],
    operations: { forward, rollback },
    bindings: {
      manifest: { sha256: 'manifest-file' },
      functionalReport: { path: 'functional.json', sha256: 'functional-file' },
      entityReport: { path: 'entity.json', sha256: 'entity-file' },
    },
    bindingStatus: [true, true, true],
  };
}

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('R12R independent active-shuttle immutable-post QA', () => {
  it('parses the canonical promoted 19-cell package and exact reverse inverse', async () => {
    const qa = await moduleUnderTest();
    const manifest = JSON.parse(fs.readFileSync(path.join(
      ROOT, 'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle.release-manifest.json',
    ), 'utf8'));
    const parsedForward = manifest.packages.flatMap(({ forward: filename }) => (
      qa.parseOperations(fs.readFileSync(path.join(ROOT, filename), 'utf8'))
    ));
    const parsedRollback = manifest.packages.slice().reverse()
      .flatMap(({ rollback: filename }) => (
        qa.parseOperations(fs.readFileSync(path.join(ROOT, filename), 'utf8'))
      ));
    expect(parsedForward).toHaveLength(19);
    expect(parsedRollback).toHaveLength(19);
    expect(parsedRollback.every((operation, index) => {
      const source = parsedForward[18 - index];
      return JSON.stringify(operation.cell) === JSON.stringify(source.cell)
        && operation.from === source.to && operation.to === source.from;
    })).toBe(true);
  });

  it('normalizes the signed four-int UUID representation decoded by AnvilReader', async () => {
    const qa = await moduleUnderTest();
    expect(qa.normalizeUuid([1455732103, -1212527674, -2108967362, 18979860]))
      .toEqual([1455732103, -1212527674, -2108967362, 18979860]);
    expect(qa.normalizeUuid([1, 2, 3])).toBeNull();
  });

  it('authenticates Python payload hashes without collapsing lexical floats', async () => {
    const qa = await moduleUnderTest();
    const payload = '{"alpha":0.0,"motion":[0.0,-0.0,1.25]}';
    const expected = execFileSync('python3', ['-c', [
      'import hashlib,json,sys',
      'value=json.loads(sys.argv[1])',
      "print(hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest())",
    ].join(';'), payload], { cwd: ROOT, encoding: 'utf8' }).trim();
    const valid = path.join(temporaryDirectory, 'python-float-valid.json');
    fs.writeFileSync(valid,
      `{"alpha":0.0,"motion":[0.0,-0.0,1.25],"reportPayloadSha256":"${expected}"}\n`);
    expect(qa.pythonCanonicalPayloadHashPass(valid, 'reportPayloadSha256')).toBe(true);

    const invalid = path.join(temporaryDirectory, 'python-float-invalid.json');
    fs.writeFileSync(invalid,
      `{"alpha":0.0,"motion":[0.0,-0.0,1.25],"reportPayloadSha256":"${'0'.repeat(64)}"}\n`);
    expect(qa.pythonCanonicalPayloadHashPass(invalid, 'reportPayloadSha256')).toBe(false);
  });

  it('returns truthful WAIT without connecting or inventing absent future evidence', () => {
    const output = path.join(temporaryDirectory, 'wait.json');
    execFileSync(process.execPath, [SCRIPT, '--out', output,
      '--generated-at', '2026-08-22T05:45:00Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(report).toMatchObject({
      status: 'WAIT_R12R_POST_RELEASE_INPUTS_ABSENT',
      commissioning: {
        boundedMaintenanceShuttleCommissioned: false,
        fullB09FunicularCommissioned: false,
      },
      disposition: { liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    });
    expect(report.missingInputs).toEqual(expect.arrayContaining([
      'ledger', 'entityReport', 'functionalReport',
    ]));
  });

  it('passes only the exact bounded maintenance shuttle evidence contract', async () => {
    const qa = await moduleUnderTest();
    const report = qa.evaluateActiveShuttleQa(passingInput());
    expect(report).toMatchObject({
      status: 'PASS_R12R_EXACT_POSTSTATE_AND_BOUNDED_MAINTENANCE_SHUTTLE_COMMISSIONED',
      summary: { passed: true, failCount: 0 },
      exactPostState: {
        blockTargetCount: 19,
        controlOffCount: 2,
        poweredRailUnpoweredCount: 15,
        polishedDioriteStopCount: 2,
        preservedPriorR12QRailCount: 535,
      },
      commissioning: {
        boundedMaintenanceShuttleCommissioned: true,
        fullB09FunicularCommissioned: false,
        passengerOrPublicTransportCommissioned: false,
        rescueTransportCommissioned: false,
      },
    });
  });

  it('rejects an energized post rail and keeps commissioning closed', async () => {
    const qa = await moduleUnderTest();
    const input = passingInput();
    input.postTargetStates.find(({ cell }) => cell.x === 2060)!.state =
      'minecraft:powered_rail[powered=true,shape=east_west,waterlogged=false]';
    const report = qa.evaluateActiveShuttleQa(input);
    expect(report.status).toMatch(/^REJECTED_/);
    expect(report.commissioning.boundedMaintenanceShuttleCommissioned).toBe(false);
    expect(report.checks.find(({ id }) => id === 'fifteen-powered-rails-unpowered').status)
      .toBe('FAIL');
  });

  it('rejects broad or tag-only cleanup even when every other claim passes', async () => {
    const qa = await moduleUnderTest();
    for (const unsafe of [
      'kill @e[type=minecraft:minecart]',
      `kill @e[tag=${TAG}]`,
    ]) {
      const input = passingInput();
      input.functionalReport.exactSelectorTranscript.push(unsafe);
      const report = qa.evaluateActiveShuttleQa(input);
      expect(report.status).toMatch(/^REJECTED_/);
      expect(report.checks.find(({ id }) => id === 'no-broad-or-tag-only-entity-cleanup').status)
        .toBe('FAIL');
    }
  });

  it('rejects a foreign saved minecart or an unauthenticated UUID', async () => {
    const qa = await moduleUnderTest();
    const foreign = passingInput();
    foreign.savedEntities.push({
      ...foreign.savedEntities[0], uuidIntArray: [1, 2, 3, 4], tags: ['foreign'],
    });
    expect(qa.evaluateActiveShuttleQa(foreign).checks.find(
      ({ id }) => id === 'immutable-post-exact-tagged-minecart',
    ).status).toBe('FAIL');
    const wrongUuid = passingInput();
    wrongUuid.savedEntities[0].uuidIntArray = [1, 2, 3, 4];
    expect(qa.evaluateActiveShuttleQa(wrongUuid).status).toMatch(/^REJECTED_/);
  });

  it('accepts only exact UUID/type/tag/full-AABB cleanup selectors', async () => {
    const qa = await moduleUnderTest();
    expect(qa.exactCleanupCommand(selector, TAG, UUID)).toBe(true);
    expect(qa.exactCleanupCommand(`kill @e[tag=${TAG}]`, TAG, UUID)).toBe(false);
    expect(qa.exactCleanupCommand(
      selector.replace('UUID:[I;101,-202,303,-404]', 'UUID:[I;1,2,3,4]'), TAG, UUID,
    )).toBe(false);
    expect(qa.exactCleanupCommand(selector.replace(',x=2058', ''), TAG, UUID)).toBe(false);
  });
});
