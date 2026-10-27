/**
 * Regression test for the BuildCoordinator.flush() fix (team-b #2).
 *
 * Background: `schedulePersist()` debounces in-memory build-state writes
 * by 2s so frequent per-block updates don't fsync on every change. The
 * original design left a hole: a SIGTERM or `POST /api/admin/restart`
 * issued <2s after the last mutation dropped the mutation on the floor
 * because the timer was still pending when the process exited. The fix
 * is `flush()` (and the `shutdown()` wrapper), which clears the pending
 * timer and writes synchronously.
 *
 * The test pins three things:
 *   1. `schedulePersist()` alone, with no flush, leaves `data/builds.json`
 *      empty after the 2s window has NOT elapsed (we use fake timers).
 *   2. `flush()` writes immediately even when the timer is still pending.
 *   3. After `flush()` the timer is cleared — the late-firing debounce
 *      can't race a (now-cleared) in-memory state.
 *   4. `shutdown()` is a thin alias for `flush()`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { BuildCoordinator, type BuildJob } from '../../src/build/BuildCoordinator';

function makeIoStub() {
  return { emit: vi.fn() } as any;
}
function makeEventLogStub() {
  return { push: vi.fn() } as any;
}
function makeBotManagerStub() {
  return {
    getWorker: vi.fn().mockReturnValue(undefined),
    getAllWorkers: vi.fn().mockReturnValue([]),
  } as any;
}

function makeJob(id: string): BuildJob {
  return {
    id,
    schematicFile: 'flush-test.schem',
    origin: { x: 0, y: 64, z: 0 },
    status: 'queued',
    createdAt: Date.now(),
    totalBlocks: 1,
    placedBlocks: 0,
    assignments: [{ botName: 'Sam', yMin: 0, yMax: 255, blocksPlaced: 0, status: 'building' } as any],
  };
}

describe('BuildCoordinator.flush() and shutdown() (team-b #2)', () => {
  let tmpRoot: string;
  let originalCwd: string;
  let coord: BuildCoordinator;
  let persistPath: string;

  beforeEach(() => {
    vi.useFakeTimers();
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-flush-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpRoot);
    fs.mkdirSync(path.join(tmpRoot, 'schematics'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'data'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'schematics', 'flush-test.schem'), 'stub');

    coord = new BuildCoordinator(makeBotManagerStub(), makeIoStub(), makeEventLogStub());
    persistPath = path.join(tmpRoot, 'data', 'builds.json');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }
    vi.useRealTimers();
  });

  it('schedulePersist alone does NOT write within the 2s debounce window', () => {
    (coord as any).jobs.set('job-pending', makeJob('job-pending'));
    (coord as any).schedulePersist();

    // Pending timer is set; nothing has been written yet.
    expect((coord as any).persistTimer).not.toBeNull();
    expect(fs.existsSync(persistPath)).toBe(false);

    // Advance 1.99s — still inside the debounce window.
    vi.advanceTimersByTime(1_990);
    expect(fs.existsSync(persistPath)).toBe(false);

    // Past the window: the original 2s timer fires and persists.
    vi.advanceTimersByTime(20);
    expect(fs.existsSync(persistPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
    expect(written.jobs).toHaveLength(1);
    expect(written.jobs[0].job.id).toBe('job-pending');
  });

  it('flush() writes immediately even when the timer is still pending', () => {
    (coord as any).jobs.set('job-during-restart', makeJob('job-during-restart'));
    (coord as any).schedulePersist();

    // Still inside the debounce window — without flush, nothing is on disk.
    vi.advanceTimersByTime(500);
    expect(fs.existsSync(persistPath)).toBe(false);
    expect((coord as any).persistTimer).not.toBeNull();

    // Simulate a SIGTERM or `POST /api/admin/restart` arriving right now.
    coord.flush();

    expect(fs.existsSync(persistPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
    expect(written.jobs.map((j: any) => j.job.id)).toEqual(['job-during-restart']);

    // Timer is cleared so the late-firing debounce can't double-write or
    // race the now-cleared in-memory state.
    expect((coord as any).persistTimer).toBeNull();
  });

  it('flush() works even with no pending timer (idempotent no-op on the timer side)', () => {
    (coord as any).jobs.set('job-no-timer', makeJob('job-no-timer'));

    // No schedulePersist called — there's nothing pending.
    expect((coord as any).persistTimer).toBeNull();

    // flush() should still write the current state.
    coord.flush();

    expect(fs.existsSync(persistPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
    expect(written.jobs.map((j: any) => j.job.id)).toEqual(['job-no-timer']);
  });

  it('does not double-write after the original debounce window expires post-flush', () => {
    (coord as any).jobs.set('job-once', makeJob('job-once'));
    (coord as any).schedulePersist();
    coord.flush();

    // Capture the on-disk content immediately after flush.
    const flushed = fs.readFileSync(persistPath, 'utf-8');

    // Advance the original 2s timer that was cleared. Nothing should change
    // because the timer was cleared — and even if it were re-armed, the
    // in-memory state hasn't changed so the write would be byte-identical.
    vi.advanceTimersByTime(5_000);

    // File is still there with the same content.
    expect(fs.existsSync(persistPath)).toBe(true);
    expect(fs.readFileSync(persistPath, 'utf-8')).toBe(flushed);
  });

  it('shutdown() is a thin alias for flush() — same write + timer-clearing semantics', () => {
    (coord as any).jobs.set('job-shutdown', makeJob('job-shutdown'));
    (coord as any).schedulePersist();
    expect((coord as any).persistTimer).not.toBeNull();

    coord.shutdown();

    expect(fs.existsSync(persistPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
    expect(written.jobs.map((j: any) => j.job.id)).toEqual(['job-shutdown']);
    expect((coord as any).persistTimer).toBeNull();
  });

  it('flush() with an empty in-memory job map writes a valid empty envelope', () => {
    // No jobs scheduled, no timer pending.
    coord.flush();

    expect(fs.existsSync(persistPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
    // The envelope is `{ jobs: [...] }`; an empty state should be `{ jobs: [] }`.
    expect(written).toEqual({ jobs: [] });
  });
});
