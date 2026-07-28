import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { moveNearWithCleanup } from '../../src/actions/moveHelper';

function fakeBot() {
  const emitter = new EventEmitter() as EventEmitter & {
    pathfinder: {
      setGoal: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
    setControlState: ReturnType<typeof vi.fn>;
  };
  emitter.pathfinder = {
    setGoal: vi.fn(),
    stop: vi.fn(),
  };
  emitter.setControlState = vi.fn();
  (emitter as any).entity = {
    position: {
      x: 0,
      y: 0,
      z: 0,
      clone() {
        return this;
      },
      distanceTo(other: { x: number; y: number; z: number }) {
        return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
      },
      offset(x: number, y: number, z: number) {
        return { x: this.x + x, y: this.y + y, z: this.z + z };
      },
    },
  };
  return emitter;
}

describe('moveNearWithCleanup stuck recovery', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('nudges once, restores the goal, and still resolves on arrival', async () => {
    vi.useFakeTimers();
    const bot = fakeBot();
    const result = moveNearWithCleanup(bot as never, { x: 1, y: 2, z: 3 }, 10_000);

    expect(bot.pathfinder.setGoal).toHaveBeenCalledTimes(1);
    bot.emit('path_reset', 'stuck');
    expect(bot.pathfinder.stop).toHaveBeenCalledTimes(1);
    expect(bot.setControlState).toHaveBeenCalledWith('jump', true);
    expect(bot.setControlState).toHaveBeenCalledWith('forward', true);

    await vi.advanceTimersByTimeAsync(600);
    expect(bot.setControlState).toHaveBeenCalledWith('jump', false);
    expect(bot.setControlState).toHaveBeenCalledWith('forward', false);
    expect(bot.pathfinder.setGoal).toHaveBeenCalledTimes(2);

    bot.emit('goal_reached');
    await expect(result).resolves.toBe(true);
    expect(bot.listenerCount('path_reset')).toBe(0);
  });

  it('clears recovery controls and listeners when the action times out', async () => {
    vi.useFakeTimers();
    const bot = fakeBot();
    const result = moveNearWithCleanup(bot as never, { x: 1, y: 2, z: 3 }, 100);

    bot.emit('path_reset', 'stuck');
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe(false);
    expect(bot.setControlState).toHaveBeenCalledWith('jump', false);
    expect(bot.setControlState).toHaveBeenCalledWith('forward', false);
    expect(bot.listenerCount('path_reset')).toBe(0);
  });

  it('nudges after five seconds without progress even when no stuck event fires', async () => {
    vi.useFakeTimers();
    const bot = fakeBot();
    const result = moveNearWithCleanup(bot as never, { x: 1, y: 2, z: 3 }, 10_000);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(bot.pathfinder.stop).toHaveBeenCalledTimes(1);
    expect(bot.setControlState).toHaveBeenCalledWith('jump', true);
    expect(bot.setControlState).toHaveBeenCalledWith('forward', true);

    await vi.advanceTimersByTimeAsync(600);
    expect(bot.pathfinder.setGoal).toHaveBeenCalledTimes(2);
    bot.emit('goal_reached');

    await expect(result).resolves.toBe(true);
  });

  it('does not nudge while a distant route may still be planning', async () => {
    vi.useFakeTimers();
    const bot = fakeBot();
    const result = moveNearWithCleanup(
      bot as never,
      { x: 100, y: 0, z: 100 },
      10_000,
    );

    await vi.advanceTimersByTimeAsync(5_500);
    expect(bot.pathfinder.stop).not.toHaveBeenCalled();
    expect(bot.setControlState).not.toHaveBeenCalledWith('jump', true);

    bot.emit('goal_reached');
    await expect(result).resolves.toBe(true);
  });
});
