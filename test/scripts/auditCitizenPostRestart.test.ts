import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  analyzeLogWindow,
  evaluateObservation,
  loadAcceptedContracts,
  renderMarkdown,
  writeArtifacts,
} from '../../scripts/audit_citizen_post_restart.mjs';

const STARTED_AT = Date.parse('2026-07-28T10:00:00.000Z');
const PID = 4242;

function structuredTask(
  contracts: ReturnType<typeof loadAcceptedContracts>,
  botName: string,
  kind: 'shift' | 'local',
  status: 'claimed' | 'completed',
  capturedAt: number,
) {
  const role = contracts.expectedRoles[botName];
  const shift = contracts.shiftsByRole[role];
  if (kind === 'shift') {
    const description =
      `town:${contracts.townId} work the approved MainStreet civic shift ` +
      `(requesting role: ${role}).`;
    return {
      id: `shift-${botName}`,
      description,
      keywords: [
        'town',
        `town:${contracts.townId}`,
        'phase',
        'day',
        role,
        'civic-shift',
        `shift:${shift.id}`,
        'non-destructive',
      ],
      status,
      priority: 80,
      assignedBot: botName,
      source: 'swarm',
      createdAt: STARTED_AT,
      updatedAt: capturedAt,
      claimedAt: STARTED_AT,
      blocker: null,
      failureCount: 0,
      retryAfter: null,
      metadata: {
        kind: 'civic-shift',
        version: 2,
        shiftId: shift.id,
        roundTrip: true,
        destinationActivity: shift.activity,
        waypoints: contracts.route,
      },
    };
  }

  const life = ['Scott', 'Steward', 'Surveyor'].includes(botName);
  return {
    id: `local-${botName}`,
    description: life
      ? `town:${contracts.townId} rest and socialize in Ravensreach (requesting role: ${role}).`
      : `town:${contracts.townId} inspect and maintain Ravensreach (requesting role: ${role}).`,
    keywords: [
      'town',
      `town:${contracts.townId}`,
      'phase',
      life ? 'night' : 'day',
      role,
      life ? 'rest' : 'maintenance',
    ],
    status,
    priority: 50,
    assignedBot: botName,
    source: 'swarm',
    createdAt: STARTED_AT,
    updatedAt: capturedAt,
    claimedAt: STARTED_AT,
    blocker: null,
    failureCount: 0,
    retryAfter: null,
    metadata: {
      kind: life ? 'life-routine' : 'work-routine',
      version: 1,
    },
  };
}

function makePassingFixture() {
  const contracts = loadAcceptedContracts();
  const offsets = [
    0,
    4 * 60_000,
    8 * 60_000,
    12 * 60_000,
    16 * 60_000,
    21 * 60_000,
  ];
  const routeIndexes = [
    0,
    16,
    contracts.route.length - 1,
    16,
    0,
    0,
  ];
  const samples = offsets.map((offset, sampleIndex) => {
    const capturedAt = STARTED_AT + offset;
    const taskStatus = sampleIndex < 5 ? 'claimed' : 'completed';
    const blackboardTasks = contracts.expectedNames.flatMap((botName) => [
      structuredTask(contracts, botName, 'shift', taskStatus, capturedAt),
      structuredTask(contracts, botName, 'local', taskStatus, capturedAt),
    ]);
    const decisions = Object.fromEntries(contracts.expectedNames.map((botName) => {
      if (sampleIndex < 5) return [botName, []];
      const shiftTask = blackboardTasks.find((task) => task.id === `shift-${botName}`)!;
      const localTask = blackboardTasks.find((task) => task.id === `local-${botName}`)!;
      return [botName, [
        {
          id: `executor-${botName}`,
          type: 'skill_vs_codegen',
          botName,
          task: shiftTask.description,
          timestamp: STARTED_AT + 19 * 60_000,
          summary: 'Reviewed civic mobility executor selected',
          decision: 'civic-shift',
          details: {},
        },
        {
          id: `shift-outcome-${botName}`,
          type: 'task_outcome',
          botName,
          task: shiftTask.description,
          timestamp: STARTED_AT + 20 * 60_000,
          summary: 'Shift completed',
          decision: 'success',
          details: {},
        },
        {
          id: `local-outcome-${botName}`,
          type: 'task_outcome',
          botName,
          task: localTask.description,
          timestamp: STARTED_AT + 20 * 60_000,
          summary: 'Local routine completed',
          decision: 'success',
          details: {},
        },
      ]];
    }));
    const bots = contracts.expectedNames.map((botName) => ({
      name: botName,
      state: 'IDLE',
      position: { ...contracts.route[routeIndexes[sampleIndex]] },
      inboundAgeMs: 250,
      pathfinderMoving: sampleIndex > 0 && sampleIndex < 4,
      health: 20,
      food: 20,
      voyagerRunning: true,
      voyagerPaused: false,
      currentTask: sampleIndex < 5
        ? blackboardTasks.find((task) => task.id === `shift-${botName}`)!.description
        : null,
      queuedTaskCount: 0,
      completedTaskCount: sampleIndex < 5 ? 0 : 2,
      failedTaskCount: 0,
      worldTimeTicks: sampleIndex === 3 ? 18_000 : 6_000,
    }));
    return {
      capturedAt,
      service: {
        active: true,
        activeState: 'active',
        subState: 'running',
        pid: PID,
        execMainStatus: 0,
        stateChangeTimestamp: 'Tue 2026-07-28 10:00:00 UTC',
      },
      apiStatus: { status: 'ok', botCount: 5 },
      botNames: [...contracts.expectedNames],
      bots,
      town: {
        id: contracts.townId,
        name: contracts.townName,
        status: 'active',
        paused: false,
      },
      residents: contracts.expectedNames.map((botName) => ({
        botName,
        currentRole: contracts.expectedRoles[botName],
        status: 'alive',
      })),
      brain: {
        running: true,
        paused: false,
        ticks: 100 + sampleIndex,
      },
      securityIncidents: [],
      blackboardTasks,
      decisions,
    };
  });

  return {
    contracts,
    samples,
    startedAt: STARTED_AT,
    endedAt: STARTED_AT + offsets.at(-1)!,
    expectedPid: PID,
    minimumDurationMs: 20 * 60_000,
    minimumSamples: 3,
    stationaryLoopMs: 120_000,
    logEvidence: analyzeLogWindow('', PID, false),
    activation: {
      voyagerEnabled: true,
      leashEntries: 5,
      corridorWaypointsPerBot: contracts.route.length,
      townPaused: false,
      persistedShifts: 5,
      configSha256: 'synthetic',
    },
  };
}

describe('five-citizen post-restart observation audit', () => {
  it('passes only after all five citizens complete reviewed shifts and local work/life routines', () => {
    const report = evaluateObservation(makePassingFixture());

    expect(report.status).toBe('PASS_POST_RESTART_OBSERVATION');
    expect(report.gates).toHaveLength(12);
    expect(report.gates.every((gate) => gate.status === 'PASS')).toBe(true);
    expect(report.citizenResults).toHaveLength(5);
    expect(report.citizenResults.every((citizen) => citizen.passed)).toBe(true);
  });

  it('fails closed on identity drift, quarantine, and stationary task loops', () => {
    const fixture = makePassingFixture();
    const architect = fixture.samples.map((sample) =>
      sample.bots.find((bot) => bot.name === 'Architect')!);
    for (const bot of architect) {
      bot.position = { ...fixture.contracts.route[0] };
      bot.state = 'QUARANTINED';
    }
    for (const sample of fixture.samples) {
      sample.apiStatus.botCount = 6;
      sample.botNames.push('UnexpectedCitizen');
      sample.securityIncidents.push({
        botName: 'Architect',
        reason: 'synthetic duplicate login',
      });
    }

    const report = evaluateObservation(fixture);
    const failedGates = report.gates
      .filter((gate) => gate.status === 'FAIL')
      .map((gate) => gate.id);

    expect(report.status).toBe('FAIL');
    expect(failedGates).toContain('five-exact-citizens-and-roles');
    expect(failedGates).toContain('connected-healthy-voyager-running');
    expect(failedGates).toContain('security-and-worker-uniqueness');
    expect(failedGates).toContain('no-stuck-loop');
  });

  it('attributes only current-process safety and repeated stuck log signals', () => {
    const text = [
      '[10:00:01] WARN (4242): dig blocked: target is inside protected build zone',
      '    bot: "Architect"',
      '    task: "protected test"',
      '[10:00:02] WARN (4242): path_reset stuck',
      '    bot: "Mason"',
      '    task: "repeat me"',
      '[10:00:03] WARN (4242): path_reset stuck',
      '    bot: "Mason"',
      '    task: "repeat me"',
      '[10:00:04] ERROR (4242): bot quarantined after impersonation warning',
      '    botName: "Scott"',
      '[10:00:05] WARN (9999): duplicate-login from prior process',
      '',
    ].join('\n');

    const evidence = analyzeLogWindow(text, PID, false);

    expect(evidence.parsedEntries).toBe(4);
    expect(evidence.protectedActions).toHaveLength(1);
    expect(evidence.securityEvents).toHaveLength(1);
    expect(evidence.stuckSignals).toHaveLength(2);
    expect(evidence.repeatedStuckSignals).toEqual([
      { botName: 'Mason', task: 'repeat me', count: 2 },
    ]);
  });

  it('writes paired timestamped JSON and Markdown review artifacts', () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-observer-'));
    try {
      const report = evaluateObservation(makePassingFixture());
      const written = writeArtifacts(report, outputDirectory, '20260728T102100Z');
      const persisted = JSON.parse(fs.readFileSync(written.jsonPath, 'utf8'));
      const markdown = fs.readFileSync(written.markdownPath, 'utf8');

      expect(path.basename(written.jsonPath))
        .toBe('citizen-post-restart-observation-20260728T102100Z.json');
      expect(path.basename(written.markdownPath))
        .toBe('citizen-post-restart-observation-20260728T102100Z.md');
      expect(persisted.status).toBe('PASS_POST_RESTART_OBSERVATION');
      expect(markdown).toBe(renderMarkdown(written.report));
      expect(markdown).toContain('All five exact citizens remained connected');
    } finally {
      fs.rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
});
