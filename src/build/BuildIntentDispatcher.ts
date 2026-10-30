/**
 * Shared build-intent dispatch.
 *
 * Both entry points — the Java-plugin HTTP relay (`POST /api/events/chat`)
 * and a bot hearing an owner chat directly in its worker — resolve the same
 * `ResolvedBuildIntent` and must start the same BuildCoordinator job. Keeping
 * this in one module stops the two paths from drifting (the worker path used
 * to parse and only log).
 */
import type { BotManager } from '../bot/BotManager';
import type { BuildCoordinator } from './BuildCoordinator';
import type { SchematicMatcher } from './SchematicMatcher';
import type { MarkerStore } from '../control/MarkerStore';
import type { ResolvedBuildIntent } from '../control/BuildIntentResolver';
import { logger } from '../util/logger';

export interface BuildIntentDispatchDeps {
  botManager: BotManager;
  schematicMatcher: SchematicMatcher;
  buildCoordinator: BuildCoordinator;
  markerStore: MarkerStore;
}

/**
 * The Java plugin relays owner chat to `POST /api/events/chat` while the bot
 * itself also hears the same line directly in its worker. Both transports now
 * parse the identical intent, so without a short claim window one "build me a
 * house" would start two jobs and send two confirmations.
 */
const RECENT_INTENT_TTL_MS = 15_000;
const recentIntents = new Map<string, number>();

function claimIntent(playerName: string, intent: ResolvedBuildIntent): boolean {
  const now = Date.now();
  if (recentIntents.size > 64) {
    for (const [key, at] of recentIntents) {
      if (now - at >= RECENT_INTENT_TTL_MS) recentIntents.delete(key);
    }
  }
  const key = JSON.stringify([
    playerName,
    intent.query,
    intent.anchor,
    intent.markerName ?? null,
    intent.absolute ?? null,
    intent.offset,
  ]);
  const last = recentIntents.get(key);
  if (last !== undefined && now - last < RECENT_INTENT_TTL_MS) return false;
  recentIntents.set(key, now);
  return true;
}

export interface BuildIntentDispatchOptions {
  /** Bot that heard the request; preferred over the first connected bot. */
  preferredBot?: string;
  /** Live player position, when the caller has it (worker-side chat does). */
  playerPosition?: { x: number; y: number; z: number } | null;
}

/**
 * Resolve the schematic and origin, then start the build. Chats the player
 * back with confirmation, progress, and completion. Returns true when a build
 * job was actually started.
 */
export async function dispatchBuildIntent(
  intent: ResolvedBuildIntent | null,
  playerName: string,
  deps: BuildIntentDispatchDeps,
  options: BuildIntentDispatchOptions = {},
): Promise<boolean> {
  if (!intent) return false;
  if (!claimIntent(playerName, intent)) {
    logger.info({ playerName, query: intent.query }, 'BuildIntent: duplicate transport event ignored');
    return false;
  }

  const { botManager, schematicMatcher, buildCoordinator, markerStore } = deps;

  const connected = botManager.getAllWorkers().filter((w) => w.isAlive());
  if (connected.length === 0) {
    logger.info('BuildIntent: no connected bots to build with');
    return false;
  }
  const chosenBot =
    (options.preferredBot && connected.find((w) => w.botName === options.preferredBot)) ||
    connected[0];
  const sayBack = (msg: string) => {
    try { chosenBot.chat(`${playerName}: ${msg}`); } catch { /* best effort */ }
  };

  const match = schematicMatcher.match(intent.query);
  if (!match) {
    logger.info({ query: intent.query, playerName }, 'BuildIntent: no schematic matched query');
    sayBack(`I don't have a schematic that matches "${intent.query}". Try a different name?`);
    return false;
  }

  let originMode: 'coords' | `player:${string}` = 'coords';
  let origin = { x: 0, y: 64, z: 0 };
  if (intent.anchor === 'absolute' && intent.absolute) {
    origin = intent.absolute;
  } else if (intent.anchor === 'marker' && intent.markerName) {
    const markerPos = findMarkerByName(markerStore, intent.markerName);
    if (markerPos) {
      origin = { x: markerPos.x + intent.offset.x, y: markerPos.y, z: markerPos.z + intent.offset.z };
    } else {
      logger.info({ markerName: intent.markerName }, 'BuildIntent: marker not found, falling back to player position');
      sayBack(`I don't know where "${intent.markerName}" is — building near you instead.`);
      originMode = `player:${playerName}`;
    }
  } else if (intent.anchor === 'player_position') {
    const live = options.playerPosition;
    const cached = botManager.getPlayerPositionCache().getPosition(playerName);
    const usable =
      live ??
      (cached && !botManager.getPlayerPositionCache().isStale(playerName) ? cached.position : null);
    if (usable) {
      origin = {
        x: Math.floor(usable.x + intent.offset.x),
        y: Math.floor(usable.y),
        z: Math.floor(usable.z + intent.offset.z),
      };
    } else {
      originMode = `player:${playerName}`;
    }
  }

  logger.info({
    playerName,
    query: intent.query,
    schematic: match.filename,
    origin,
    originMode,
    mode: intent.mode,
    bot: chosenBot.botName,
  }, 'BuildIntent: starting build');

  const modeLabel = intent.mode === 'underground' ? ' (underground)' : '';
  sayBack(`Building ${match.filename}${modeLabel} — give me a few minutes.`);

  await buildCoordinator.startBuild(
    match.filename,
    origin,
    [chosenBot.botName],
    {
      originMode,
      mode: intent.mode,
      onProgress: ({ pct }) => sayBack(`${pct}% done with ${match.filename}.`),
      onCompleted: (job) => {
        if (job.status === 'completed') {
          sayBack(`Done! ${match.filename} built at ${job.origin.x}, ${job.origin.y}, ${job.origin.z}.`);
        } else {
          sayBack(`${match.filename} build ${job.status}. ${job.placedBlocks}/${job.totalBlocks} blocks placed.`);
        }
      },
    },
  );
  return true;
}

/** Find a marker by case-insensitive name match (exact, then substring). */
function findMarkerByName(
  markerStore: MarkerStore,
  name: string,
): { x: number; y: number; z: number } | null {
  const wanted = name.toLowerCase().trim();
  if (!wanted) return null;
  const markers = markerStore.getMarkers();
  const exact = markers.find((m) => m.name?.toLowerCase() === wanted);
  const fuzzy = exact ?? markers.find((m) => m.name?.toLowerCase().includes(wanted));
  if (!fuzzy?.position) return null;
  return {
    x: Math.floor(fuzzy.position.x),
    y: Math.floor(fuzzy.position.y),
    z: Math.floor(fuzzy.position.z),
  };
}
