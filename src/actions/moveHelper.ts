import { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';

/**
 * Shared movement helper that properly cleans up all event listeners.
 * Sets a pathfinder goal, listens for goal_reached and path_update (noPath),
 * and always removes listeners in a finally block with a timeout guard.
 */
export function moveNearWithCleanup(
  bot: Bot,
  goal: { x: number; y: number; z: number; range?: number },
  timeoutMs = 15000,
): Promise<boolean> {
  const range = goal.range ?? 2;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let recoveryInProgress = false;
    let lastRecoveryAt = 0;
    let lastProgressAt = Date.now();
    let lastProgressPosition = bot.entity?.position.clone();

    const clearRecoveryControls = () => {
      try {
        bot.setControlState('jump', false);
        bot.setControlState('forward', false);
      } catch {
        // The bot may disconnect while an action is being cleaned up.
      }
    };

    const setGoal = () => {
      bot.pathfinder.setGoal(new goals.GoalNear(goal.x, goal.y, goal.z, range));
    };

    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      recoveryInProgress = false;
      clearRecoveryControls();
      bot.removeListener('goal_reached', onGoalReached);
      bot.removeListener('path_update', onPathUpdate);
      bot.removeListener('path_reset', onPathReset);
      bot.removeListener('mobility_denied' as any, onMobilityDenied);
      resolve(result);
    };

    const onGoalReached = () => {
      settle(true);
    };

    const onPathUpdate = (r: any) => {
      if (r.status === 'noPath') {
        bot.pathfinder.stop();
        settle(false);
      }
    };

    const recoverFromNoProgress = () => {
      if (settled || recoveryInProgress) return;
      const now = Date.now();
      if (now - lastRecoveryAt < 2_000) return;
      lastRecoveryAt = now;
      lastProgressAt = now;
      recoveryInProgress = true;

      // Mineflayer can repeatedly re-plan a valid two-node route without
      // clearing a one-block lip (natural grades and full-block road steps are
      // common examples). A short bounded jump-forward nudge is the same
      // recovery used by the explicit `unstuck` command. Stop the stale path,
      // nudge for well under one block, then restore the exact reviewed goal.
      // The worker's civic step exclusion remains installed on the re-plan.
      try {
        bot.pathfinder.stop();
      } catch {
        settle(false);
        return;
      }

      const nudgeTowardGoal = () => {
        if (settled) return;
        try {
          bot.setControlState('jump', true);
          bot.setControlState('forward', true);
        } catch {
          settle(false);
          return;
        }
        recoveryTimer = setTimeout(() => {
          recoveryTimer = null;
          recoveryInProgress = false;
          clearRecoveryControls();
          if (!settled) setGoal();
        }, 600);
      };

      // `path_reset: stuck` can leave the avatar facing sideways after the
      // failed node. Aim the bounded nudge at the reviewed goal first; without
      // this, forward can press the bot into the road edge indefinitely.
      const lookAt = (bot as Bot & {
        lookAt?: (point: Vec3, force?: boolean) => Promise<void>;
      }).lookAt;
      const position = bot.entity?.position;
      if (lookAt && position) {
        void lookAt.call(
          bot,
          position.offset(goal.x - position.x, 1.6, goal.z - position.z),
          true,
        ).then(nudgeTowardGoal).catch(() => settle(false));
      } else {
        nudgeTowardGoal();
      }
    };

    const onPathReset = (reason: unknown) => {
      if (String(reason) !== 'stuck') return;
      recoverFromNoProgress();
    };

    const timer = setTimeout(() => {
      bot.pathfinder.stop();
      settle(false);
    }, timeoutMs);

    // The civic-mobility wrapper on pathfinder.setGoal silently CLEARS a
    // leash-violating goal, so neither goal_reached nor path_update ever
    // fires and this helper burned its full timeout on every denied move
    // (60s per routed-ore task for a leashed bot, forever — 2026-08 audit).
    // The wrapper now emits 'mobility_denied'; fail fast on it.
    const onMobilityDenied = () => {
      settle(false);
    };
    bot.on('goal_reached', onGoalReached);
    bot.on('path_update', onPathUpdate);
    bot.on('path_reset', onPathReset);
    bot.on('mobility_denied' as any, onMobilityDenied);
    setGoal();
    // Some full-block lips leave Mineflayer repeatedly replanning without
    // emitting `path_reset: stuck`. Track actual avatar progress as a bounded
    // fallback so the same no-dig jump-forward recovery is still applied.
    progressTimer = setInterval(() => {
      if (settled || recoveryInProgress) return;
      const position = bot.entity?.position;
      if (position) {
        if (
          !lastProgressPosition
          || position.distanceTo(lastProgressPosition) >= 0.2
        ) {
          lastProgressPosition = position.clone();
          lastProgressAt = Date.now();
          return;
        }
      }
      if (Date.now() - lastProgressAt >= 5_000) {
        const horizontalDistance = position
          ? Math.hypot(goal.x - position.x, goal.z - position.z)
          : Number.POSITIVE_INFINITY;
        const verticalDistance = position
          ? Math.abs(goal.y - position.y)
          : Number.POSITIVE_INFINITY;
        // Do not nudge while A* is still planning or traversing a long route:
        // manual controls can leave the surveyed corridor before a path is
        // established. The fallback is exclusively for a final nearby lip;
        // path_reset:stuck remains authoritative at any distance.
        if (horizontalDistance <= 4 && verticalDistance <= 3) {
          recoverFromNoProgress();
        }
      }
    }, 500);
  });
}
