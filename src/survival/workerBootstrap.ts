import { isMainThread, parentPort } from 'worker_threads';
import { BotInstance } from '../bot/BotInstance';
import { BotManager } from '../bot/BotManager';
import { SurvivalMission } from './SurvivalMission';

if (isMainThread) {
  const managerProto = BotManager.prototype as any;
  const originalLoadSavedBots = managerProto.loadSavedBots;
  let terminalStarted = false;

  managerProto.loadSavedBots = async function (): Promise<void> {
    await originalLoadSavedBots.call(this);
    const config: any = this.getConfig?.() ?? {};
    const survival = config.survival ?? {};
    if (survival.enabled === false) return;
    const botName = String(process.env.MC_SURVIVAL_BOT_NAME || survival.botName || 'FayaazMJacc');
    if (!this.getWorker(botName)) {
      if (this.getAllWorkers().length === 0) {
        await this.spawnBot(botName, String(survival.personality || 'survival specialist'), undefined, 'primitive');
      } else {
        console.log(`[survival] ${botName} was not auto-spawned because another saved bot is already running.`);
      }
    }
    if (terminalStarted) return;
    terminalStarted = true;
    installTerminal(this, botName);
  };
} else {
  let mission: SurvivalMission | null = null;
  let missionBot: BotInstance | null = null;
  const proto = BotInstance.prototype as any;
  const originalStopAmbient = proto.stopAmbientBehaviors;

  // Disable the old periodic player head tracker. Mission actions use smooth
  // interpolated looks only when an action actually requires them.
  proto.startHeadTracking = function (): void { return; };

  proto.startSurvivalLoop = function (): void {
    missionBot = this as BotInstance;
    if (!mission) {
      mission = new SurvivalMission(
        () => (this as any).bot,
        (this as any).name,
        () => { try { (this as any).voyagerLoop?.pause('survival-mission'); } catch {} },
      );
    }
    mission.resume();
  };

  proto.stopAmbientBehaviors = function (): void {
    try { mission?.stop(); } catch {}
    return originalStopAmbient?.call(this);
  };

  const missionProto = SurvivalMission.prototype as any;
  missionProto.nextStage = function (): string {
    if (!this.hasAny(LOGS_INTERNAL)) return 'wood';
    if (this.foodCount() < 16) return 'food';
    if (!this.hasAny(BEDS_INTERNAL)) return 'bed';
    if (this.count('coal') < 16) return 'coal';
    if (this.count('iron_ingot') < 32) return 'iron';
    if (!IRON_ARMOR_INTERNAL.every((x) => this.has(x)) || !IRON_TOOLS_INTERNAL.every((x) => this.has(x))) return 'iron-gear';
    if (this.count('diamond') < 567) return 'diamonds';
    if (this.count('gold_ingot') < 192) return 'gold';
    if (this.saved.setsMade < 5) return 'diamond-sets';
    if (this.count('obsidian') < 14) return 'obsidian';
    if (!this.has('flint_and_steel')) return 'flint-steel';
    return 'portal';
  };

  missionProto.bed = async function (): Promise<void> {
    this.detail('Getting three natural wool and crafting a bed');
    const existing = BEDS_INTERNAL.find((x) => this.has(x));
    if (existing) {
      this.saved.stage = 'coal';
      return;
    }
    const wool = this.botGetter().inventory.items().find((i: any) => i.name.endsWith('_wool'));
    if (!wool || wool.count < 3) {
      const sheep = this.nearestEntity((e: any) => e.name === 'sheep' && e.position.distanceTo(this.botGetter().entity.position) < 64);
      if (sheep) await this.attack(sheep);
      else await this.safeWander();
      return;
    }
    const color = wool.name.replace('_wool', '');
    await this.craft(`${color}_bed`);
    this.saved.stage = 'coal';
  };

  missionProto.diamonds = async function (): Promise<void> {
    this.detail(`Mining diamonds (${this.count('diamond')}/567)`);
    if (this.count('diamond') >= 567) {
      this.saved.diamondPeak = Math.max(this.saved.diamondPeak, 567);
      this.saved.stage = 'gold';
      return;
    }
    await this.ensureDeepMiningGear();
    const ore = this.findBlock((b: any) => b.name === 'diamond_ore' || b.name === 'deepslate_diamond_ore', 128);
    if (ore && !this.hazard(ore.position)) {
      await this.collect(ore);
      return;
    }
    await this.mineAtY(-54, (b: any) => b.name === 'diamond_ore' || b.name === 'deepslate_diamond_ore');
  };

  missionProto.obsidian = async function (): Promise<void> {
    this.detail(`Getting obsidian (${this.count('obsidian')}/14)`);
    if (this.count('obsidian') >= 14) {
      this.saved.stage = 'flint-steel';
      return;
    }
    const exposed = this.findBlock((b: any) => b.name === 'obsidian', 128);
    if (exposed && !this.hazard(exposed.position)) {
      await this.collect(exposed);
      return;
    }
    await this.ensureBucket();
    const lava = this.findBlock((b: any) => b.name === 'lava', 64);
    if (!lava) return this.safeWander();
    const water = this.get('water_bucket');
    if (!water) throw new Error('No water bucket for obsidian conversion');
    await this.moveNear(lava.position, 3);
    await this.smoothLook(lava.position, 160);
    await this.botGetter().equip(water, 'hand');
    await this.botGetter().activateBlock(lava);
    await this.sleep(700);
    const obs = this.findBlock((b: any) => b.name === 'obsidian', 32);
    if (obs) await this.collect(obs);
  };

  if (parentPort) {
    parentPort.on('message', (msg: any) => {
      if (msg?.kind !== 'command' || typeof msg.type !== 'string') return;
      if (!msg.type.startsWith('survival:')) return;
      const command = msg.type.slice('survival:'.length);
      try {
        if (!mission) {
          console.log('[survival] Mission is not initialized yet. Wait for the bot to spawn.');
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
  if (!process.stdin.isTTY) return;
  void import('node:readline').then(({ createInterface }) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'survival> ' });
    console.log(`[survival] ${botName} survival mission ready. Type help for commands.`);
    rl.prompt();
    rl.on('line', (raw) => {
      const command = raw.trim().toLowerCase();
      const allowed = new Set(['task', 'coords', 'inv', 'status', 'stop', 'resume', 'help']);
      if (!allowed.has(command)) {
        console.log('[survival] Unknown command. Use: task, coords, inv, status, stop, resume, help');
        rl.prompt();
        return;
      }
      const worker = manager.getWorker(botName);
      if (!worker) console.log(`[survival] ${botName} is not currently running.`);
      else worker.sendCommand(`survival:${command}`, {});
      rl.prompt();
    });
  }).catch((err) => console.log('[survival] terminal setup failed:', err?.message || String(err)));
}

const LOGS_INTERNAL = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log', 'pale_oak_log'];
const BEDS_INTERNAL = ['white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed', 'lime_bed', 'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed', 'purple_bed', 'blue_bed', 'brown_bed', 'green_bed', 'red_bed', 'black_bed'];
const IRON_ARMOR_INTERNAL = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'];
const IRON_TOOLS_INTERNAL = ['iron_pickaxe', 'iron_axe', 'iron_sword'];
