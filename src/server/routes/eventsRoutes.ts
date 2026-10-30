/**
 * Java-plugin event-relay endpoints (chat, player join/leave/death, block
 * placed/broken, item crafted, entity killed, player move), extracted from
 * createAPIServer (review: api.ts decomposition). The chat route carries the
 * build-intent dispatch (shared BuildIntentDispatcher), so this
 * module needs the build deps too. Registered via registerEventsRoutes(app,
 * { botManager, io, schematicMatcher, buildCoordinator, markerStore }).
 */
import type { Express, Request, Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import type { BotManager } from '../../bot/BotManager';
import type { SchematicMatcher } from '../../build/SchematicMatcher';
import type { BuildCoordinator } from '../../build/BuildCoordinator';
import type { MarkerStore } from '../../control/MarkerStore';
import { parseBuildIntent } from '../../control/BuildIntentResolver';
import { dispatchBuildIntent } from '../../build/BuildIntentDispatcher';
import { logger } from '../../util/logger';

export function registerEventsRoutes(
  app: Express,
  deps: {
    botManager: BotManager;
    io: SocketIOServer;
    schematicMatcher: SchematicMatcher;
    buildCoordinator: BuildCoordinator;
    markerStore: MarkerStore;
  },
): void {
  const { botManager, io, schematicMatcher, buildCoordinator, markerStore } = deps;

  app.post('/api/events/chat', async (req: Request, res: Response) => {
    const { playerName, message, nearestBot, playerPosition } = req.body ?? {};

    if (nearestBot !== undefined && nearestBot !== null) {
      if (typeof nearestBot !== 'string' || nearestBot.length === 0 || nearestBot.length > 64) {
        res.status(400).json({ error: 'nearestBot must be a non-empty string ≤64 chars' });
        return;
      }
    }
    if (playerPosition !== undefined && playerPosition !== null) {
      if (
        typeof playerPosition !== 'object' ||
        Array.isArray(playerPosition) ||
        !Number.isFinite((playerPosition as any).x) ||
        !Number.isFinite((playerPosition as any).y) ||
        !Number.isFinite((playerPosition as any).z)
      ) {
        res.status(400).json({ error: 'playerPosition must be { x, y, z } of finite numbers' });
        return;
      }
    }

    const handle = nearestBot ? botManager.getWorker(nearestBot) : null;

    if (typeof playerName === 'string' && typeof message === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'chat',
        detail: message,
        timestamp: Date.now(),
      });

      if (playerPosition && typeof playerPosition === 'object') {
        botManager.getPlayerPositionCache().recordPosition(playerName, playerPosition);
      }

      if (handle && /\b(help|can you|please|could you|need)\b/i.test(message)) {
        botManager.getAffinityManager().onHelpRequest(handle.botName, playerName, message.slice(0, 120));
      }

      // Build-intent dispatch — best-effort; failures logged, don't affect response.
      const intent = parseBuildIntent(message);
      if (intent) {
        try {
          await dispatchBuildIntent(intent, playerName, {
            botManager,
            schematicMatcher,
            buildCoordinator,
            markerStore,
          }, { preferredBot: nearestBot });
        } catch (err: any) {
          logger.warn({ err: err.message, playerName, message }, 'Build-intent dispatch failed');
        }
      }
    }

    if (!handle) {
      res.json({ handled: false });
      return;
    }

    logger.info({ player: playerName, bot: nearestBot, message }, 'Chat event received');
    res.json({ handled: true });
  });

  app.post('/api/events/player-join', (req: Request, res: Response) => {
    const { playerName } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerPresenceTracker().recordJoin(playerName);
    }
    res.json({ handled: true });
  });

  app.post('/api/events/player-leave', (req: Request, res: Response) => {
    const { playerName } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerPresenceTracker().recordLeave(playerName);
      botManager.getPlayerIntentModel().clearPlayer(playerName);
      botManager.getPlayerPositionCache().clear(playerName);
    }
    res.json({ handled: true });
  });

  app.post('/api/events/player-death', (req: Request, res: Response) => {
    const { playerName, position } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerPresenceTracker().recordDeath(playerName);
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'death', detail: '', position: position ?? undefined, timestamp: Date.now(),
      });
    }
    res.json({ handled: true });
  });

  app.post('/api/events/block-placed', (req: Request, res: Response) => {
    const { playerName, blockName, position } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'block_placed', detail: typeof blockName === 'string' ? blockName : '', position: position ?? undefined, timestamp: Date.now(),
      });
    }
    res.json({ handled: true });
  });

  app.post('/api/events/block-broken', (req: Request, res: Response) => {
    const { playerName, blockName, position } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'block_broken', detail: typeof blockName === 'string' ? blockName : '', position: position ?? undefined, timestamp: Date.now(),
      });
    }
    res.json({ handled: true });
  });

  app.post('/api/events/item-crafted', (req: Request, res: Response) => {
    const { playerName, itemName } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'item_crafted', detail: typeof itemName === 'string' ? itemName : '', timestamp: Date.now(),
      });
    }
    res.json({ handled: true });
  });

  app.post('/api/events/entity-killed', (req: Request, res: Response) => {
    const { playerName, entityName, position } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'entity_killed', detail: typeof entityName === 'string' ? entityName : '', position: position ?? undefined, timestamp: Date.now(),
      });
    }
    res.json({ handled: true });
  });

  app.post('/api/events/player-move', (req: Request, res: Response) => {
    const { playerName, position } = req.body;
    if (typeof playerName === 'string') {
      botManager.getPlayerIntentModel().recordAction(playerName, {
        type: 'movement', detail: '', position: position ?? undefined, timestamp: Date.now(),
      });
      if (position && typeof position === 'object') {
        botManager.getPlayerPositionCache().recordPosition(playerName, position);
      }
      if (
        position && typeof position === 'object' &&
        typeof position.x === 'number' && typeof position.y === 'number' && typeof position.z === 'number'
      ) {
        io.emit('player:position', { player: playerName, x: position.x, y: position.y, z: position.z });
      }
    }
    res.json({ handled: true });
  });
}
