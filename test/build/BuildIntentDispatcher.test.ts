/**
 * Shared build-intent dispatch: both the HTTP event relay and bot-heard owner
 * chat go through this. Cover the coordinate resolution + chat handshake so
 * the worker path can't silently regress to "parse and log".
 */
import { describe, it, expect, vi } from 'vitest';
import { dispatchBuildIntent } from '../../src/build/BuildIntentDispatcher';
import { parseBuildIntent } from '../../src/control/BuildIntentResolver';

function makeDeps(overrides: {
  match?: { filename: string } | null;
  markers?: Array<{ name: string; position: { x: number; y: number; z: number } }>;
  cached?: { position: { x: number; y: number; z: number } } | null;
} = {}) {
  const chat = vi.fn();
  const startBuild = vi.fn(async () => ({ id: 'job-1' }));
  const botManager = {
    getAllWorkers: () => [
      { botName: 'Scout', isAlive: () => true, chat },
      { botName: 'Architect', isAlive: () => true, chat: vi.fn() },
    ],
    getPlayerPositionCache: () => ({
      getPosition: () => overrides.cached ?? null,
      isStale: () => false,
    }),
  };
  const schematicMatcher = {
    match: vi.fn(() => ('match' in overrides ? overrides.match : { filename: 'small-house.schem' })),
  };
  const markerStore = {
    getMarkers: () => overrides.markers ?? [],
  };
  return {
    chat,
    startBuild,
    deps: {
      botManager,
      schematicMatcher,
      buildCoordinator: { startBuild },
      markerStore,
    } as any,
  };
}

describe('dispatchBuildIntent', () => {
  it('builds at the live player position plus the parsed offset and confirms in chat', async () => {
    const intent = parseBuildIntent('build a small house here 10 blocks north')!;
    expect(intent).not.toBeNull();
    const { deps, startBuild } = makeDeps();

    const started = await dispatchBuildIntent(intent, 'Nerdfuryz', deps, {
      preferredBot: 'Scout',
      playerPosition: { x: 100, y: 70, z: 200 },
    });

    expect(started).toBe(true);
    expect(startBuild).toHaveBeenCalledTimes(1);
    const [filename, origin, bots, opts] = startBuild.mock.calls[0] as any[];
    expect(filename).toBe('small-house.schem');
    expect(origin).toEqual({ x: 100, y: 70, z: 190 });
    expect(bots).toEqual(['Scout']);
    expect(opts.originMode).toBe('coords');
  });

  it('falls back to the cached player position when the worker sends none', async () => {
    const intent = parseBuildIntent('build a tower here')!;
    const { deps, startBuild } = makeDeps({
      cached: { position: { x: 5, y: 64, z: -7 } },
    });

    await dispatchBuildIntent(intent, 'Nerdfuryz', deps);

    const [, origin] = startBuild.mock.calls[0] as any[];
    expect(origin).toEqual({ x: 5, y: 64, z: -7 });
  });

  it('resolves a marker anchor and applies the offset', async () => {
    const intent = parseBuildIntent('build a bunker at the plaza')!;
    expect(intent.anchor).toBe('marker');
    const { deps, startBuild } = makeDeps({
      markers: [{ name: 'Plaza', position: { x: 10, y: 65, z: 20 } }],
    });

    await dispatchBuildIntent(intent, 'Nerdfuryz', deps);

    const [, origin] = startBuild.mock.calls[0] as any[];
    expect(origin).toEqual({ x: 10, y: 65, z: 20 });
  });

  it('does not start a build and explains when no schematic matches', async () => {
    const intent = parseBuildIntent('build a castle here')!;
    const { deps, startBuild, chat } = makeDeps({ match: null });

    const started = await dispatchBuildIntent(intent, 'Nerdfuryz', deps);

    expect(started).toBe(false);
    expect(startBuild).not.toHaveBeenCalled();
    expect(chat).toHaveBeenCalledWith(expect.stringContaining("don't have a schematic"));
  });

  it('ignores the same intent arriving from the second transport', async () => {
    const intent = parseBuildIntent('build a lighthouse here')!;
    const { deps, startBuild } = makeDeps();

    const first = await dispatchBuildIntent(intent, 'Nerdfuryz', deps);
    const second = await dispatchBuildIntent(intent, 'Nerdfuryz', deps);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(startBuild).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for a null intent', async () => {
    const { deps, startBuild } = makeDeps();
    await expect(dispatchBuildIntent(null, 'Nerdfuryz', deps)).resolves.toBe(false);
    expect(startBuild).not.toHaveBeenCalled();
  });
});
