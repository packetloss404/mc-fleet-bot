import { isMainThread, parentPort } from 'worker_threads';
import { BotInstance } from '../bot/BotInstance';
import { BotManager } from '../bot/BotManager';
import { SurvivalMission } from './SurvivalMission';

const BOT_NAME = () => String(process.env.MC_SURVIVAL_BOT_NAME || 'FayaazMJacc');

if (isMainThread) {
  const managerProto = BotManager.prototype as any;
  const originalLoadSavedBots = managerProto.loadSavedBots;
  let terminalStarted = false;

  managerProto.loadSavedBots = async function (): Promise<void> {
    await originalLoadSavedBots.call(this);
    const config: any = this.getConfig?.() ?? {};
    const survival = config.survival ?? {};
    if (survival.enabled === false) return;

    const name = BOT_NAME();
    const forceJoin = survival.forceJoin !== false;

    // Survival mode is intentionally a single-bot mode. If a stale saved bot
    // is occupying the only configured slot, remove it so FayaazMJacc can join.
    if (!this.getWorker(name) && forceJoin) {
      const workers = this.getAllWorkers();
      for (const worker of workers) {
        if (String(worker.botName || '').toLowerCase() === name.toLowerCase()) continue;
        try {
          console.log(`[survival] removing stale worker ${worker.botName} to free the survival slot`);
          await this.removeBot(worker.botName);
        } catch (err: any) {
          console.log(`[survival] could not remove ${worker.botName}: ${err?.message || String(err)}`);
        }
      }
    }

    if (!this.getWorker(name)) {
      const spawned = await this.spawnBot(
        name,
        String(survival.personality || 'survival specialist'),
        undefined,
        String(survival.mode || 'primitive'),
      );
      if (spawned) {
        console.log(`[survival] ${name} force-joined; survival mission will start on connection`);
      } else {
        console.log(`[survival] failed to spawn ${name}; check bots.maxBots and Minecraft connection settings`);
      }
    } else {
      console.log(`[survival] ${name} already running; survival mission will resume`);
    }

    if (!terminalStarted) {
      terminalStarted = true;
      installTerminal(this, name);
    }
  };
} else {
  let mission: SurvivalMission | null = null;
  let missionBot: BotInstance | null = null;
  const proto = BotInstance.prototype as any;
  const originalStopAmbient = proto.stopAmbientBehaviors;

  // Never run the old ambient head tracker for this survival bot.
  proto.startHeadTracking = function (): void { return; };

  // The old bootstrap only defined startSurvivalLoop; nothing called it after
  // Mineflayer connected. Hook the actual connection lifecycle so the mission
  // starts immediately after the bot enters the world.
  const originalConnect = proto.connect;
  if (typeof originalConnect === 'function') {
    proto.connect = async function (...args: any[]): Promise<any> {
      const result = await originalConnect.apply(this, args);
      this.startSurvivalLoop();
      return result;
    };
  }

  proto.startSurvivalLoop = function (): void {
    missionBot = this as BotInstance;
    if (!mission) {
      mission = new SurvivalMission(
        () => (this as any).bot,
        (this as any).name,
        () => { try { (this as any).voyagerLoop?.pause('survival-mission'); } catch {} },
      );
      const bot: any = (this as any).bot;
      bot?.on?.('death', () => {
        try {
          const saved: any = (mission as any).saved;
          saved.deaths = Number(saved.deaths || 0) + 1;
          (mission as any).save();
          console.log(`[survival] ${this.name} died; progress saved`);
        } catch {}
      });
    }
    mission.resume();
  };

  proto.stopAmbientBehaviors = function (): void {
    try { mission?.stop(); } catch {}
    return originalStopAmbient?.call(this);
  };

  if (parentPort) {
    parentPort.on('message', (msg: any) => {
      if (msg?.kind !== 'command' || typeof msg.type !== 'string' || !msg.type.startsWith('survival:')) return;
      const command = msg.type.slice('survival:'.length);
      try {
        if (!mission) {
          console.log('[survival] mission is not initialized yet; the bot must connect first');
          return;
        }
        switch (command) {
          case 'task':
          case 'status':
            console.log('[survival]', JSON.stringify(mission.status(), null, 2));
            break;
          case 'coords': {
            const s: any = mission.status();
            console.log('[survival] coords:', s.position ? `${s.position.x} ${s.position.y} ${s.position.z}` : 'not spawned');
            break;
          }
          case 'inv': {
            const bot: any = (missionBot as any)?.bot;
            const items = bot?.inventory?.items?.().map((i: any) => `${i.name} x${i.count}`) ?? [];
            console.log('[survival] inventory:', items.length ? items.join(', ') : '(empty)');
            break;
          }
          case 'stop':
            mission.stop();
            console.log('[survival] stopped and progress saved');
            break;
          case 'resume':
            mission.resume();
            console.log('[survival] resumed');
            break;
          case 'help':
            console.log('[survival] commands: task, coords, inv, status, stop, resume, help');
            break;
          default:
            console.log(`[survival] unknown command '${command}'. Use: task, coords, inv, status, stop, resume, help`);
        }
      } catch (err: any) {
        console.log('[survival] command failed:', err?.message || String(err));
      }
    });
  }
}

function installTerminal(manager: any, botName: string): void {
  // Codespaces/task runners may expose stdin without a TTY. Requiring isTTY
  // here made every command silently disappear. Readable stdin is sufficient.
  if (!process.stdin.readable || process.stdin.destroyed) {
    console.log('[survival] stdin is unavailable; terminal controls cannot be installed');
    return;
  }

  void import('node:readline').then(({ createInterface }) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY),
      prompt: 'survival> ',
    });
    const allowed = new Set(['task', 'coords', 'inv', 'status', 'stop', 'resume', 'help']);
    console.log(`[survival] ${botName} controls ready. Type help for commands.`);
    rl.prompt();
    rl.on('line', (raw) => {
      const command = raw.trim().toLowerCase();
      if (!allowed.has(command)) {
        console.log('[survival] Unknown command. Use: task, coords, inv, status, stop, resume, help');
        rl.prompt();
        return;
      }

      const send = () => {
        const worker = manager.getWorker(botName);
        if (!worker) return false;
        worker.sendCommand(`survival:${command}`, {});
        return true;
      };

      if (!send()) {
        let attempts = 0;
        const retry = setInterval(() => {
          if (send() || ++attempts >= 20) clearInterval(retry);
        }, 500);
        retry.unref?.();
      }
      rl.prompt();
    });
    rl.on('close', () => console.log('[survival] terminal input closed; bot mission continues'));
  }).catch((err) => console.log('[survival] terminal setup failed:', err?.message || String(err)));
}
