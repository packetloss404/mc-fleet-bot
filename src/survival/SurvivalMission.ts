import fs from 'fs';
import path from 'path';
import { Vec3 } from 'vec3';

export type SurvivalStage =
  | 'wood' | 'food' | 'bed' | 'coal' | 'iron' | 'iron-gear'
  | 'diamonds' | 'gold' | 'diamond-sets' | 'obsidian' | 'flint-steel'
  | 'portal' | 'complete' | 'paused';

interface SavedMission {
  schema: 1;
  stage: SurvivalStage;
  deaths: number;
  setsMade: number;
  diamondPeak: number;
  goldPeak: number;
  home?: { x: number; y: number; z: number };
  chest?: { x: number; y: number; z: number };
  startedAt: number;
  updatedAt: number;
}

const LOGS = [
  'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log',
  'dark_oak_log', 'mangrove_log', 'cherry_log', 'pale_oak_log',
];
const PLANKS = LOGS.map((x) => x.replace('_log', '_planks'));
const FOOD = [
  'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken',
  'cooked_rabbit', 'bread', 'baked_potato', 'beef', 'porkchop', 'mutton',
  'chicken', 'rabbit', 'potato', 'carrot', 'sweet_berries', 'apple',
];
const PASSIVE = new Set(['cow', 'pig', 'sheep', 'chicken', 'rabbit']);
const HOSTILE = new Set([
  'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'witch', 'husk',
  'drowned', 'stray', 'pillager', 'vindicator', 'phantom', 'slime',
]);
const DANGER = new Set(['lava', 'flowing_lava', 'fire', 'soul_fire', 'magma_block', 'campfire', 'soul_campfire']);
const IRON_ARMOR = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'];
const IRON_TOOLS = ['iron_pickaxe', 'iron_axe', 'iron_sword'];
const DIAMOND_ARMOR = ['diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots'];
const DIAMOND_TOOLS = ['diamond_pickaxe', 'diamond_axe', 'diamond_sword'];

/**
 * Deterministic, survival-only mission controller.
 * It deliberately never calls bot.chat(), never executes server commands and
 * never injects items. All resources come from Mineflayer world interactions.
 */
export class SurvivalMission {
  private readonly botGetter: () => any;
  private readonly name: string;
  private readonly file: string;
  private readonly pauseVoyager: () => void;
  private saved: SavedMission;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private busy = false;
  private lastAttack = 0;
  private lastStatus = '';

  constructor(
    botGetter: () => any,
    name: string,
    pauseVoyager: () => void,
    dataDir = './data',
  ) {
    this.botGetter = botGetter;
    this.name = name;
    this.pauseVoyager = pauseVoyager;
    this.file = path.join(dataDir, 'survival', `${name}.json`);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.saved = this.load();
    this.waitForBot();
  }

  start(): void {
    if (this.saved.stage === 'complete') return;
    this.running = true;
    this.pauseVoyager();
    this.schedule(100);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.saved.stage = 'paused';
    this.saved.updatedAt = Date.now();
    this.save();
    try {
      const bot = this.botGetter();
      bot?.pathfinder?.stop();
      bot?.clearControlStates?.();
    } catch {}
  }

  resume(): void {
    if (this.saved.stage === 'complete') return;
    this.running = true;
    if (this.saved.stage === 'paused') this.saved.stage = this.nextStage();
    this.saved.updatedAt = Date.now();
    this.save();
    this.pauseVoyager();
    this.schedule(100);
  }

  status(): Record<string, unknown> {
    const bot = this.botGetter();
    return {
      bot: this.name,
      stage: this.saved.stage,
      detail: this.lastStatus || `Stage: ${this.saved.stage}`,
      running: this.running,
      deaths: this.saved.deaths,
      setsMade: this.saved.setsMade,
      diamonds: this.count('diamond'),
      gold: this.count('gold_ingot'),
      food: this.foodCount(),
      position: bot?.entity?.position ? {
        x: Math.floor(bot.entity.position.x),
        y: Math.floor(bot.entity.position.y),
        z: Math.floor(bot.entity.position.z),
      } : null,
      updatedAt: this.saved.updatedAt,
    };
  }

  private waitForBot(): void {
    const bot = this.botGetter();
    if (bot?.entity) {
      this.start();
      return;
    }
    setTimeout(() => this.waitForBot(), 1000).unref?.();
  }

  private schedule(ms: number): void {
    if (!this.running || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, ms);
  }

  private async tick(): Promise<void> {
    const bot = this.botGetter();
    if (!this.running || !bot?.entity || bot.health <= 0) {
      this.schedule(1500);
      return;
    }
    if (this.busy) {
      this.schedule(500);
      return;
    }
    this.busy = true;
    try {
      await this.eatIfNeeded();
      await this.fightIfNecessary();
      if (bot.health <= 5) {
        await this.retreatFromDanger();
      } else {
        switch (this.saved.stage) {
          case 'wood': await this.wood(); break;
          case 'food': await this.food(); break;
          case 'bed': await this.bed(); break;
          case 'coal': await this.coal(); break;
          case 'iron': await this.iron(); break;
          case 'iron-gear': await this.ironGear(); break;
          case 'diamonds': await this.diamonds(); break;
          case 'gold': await this.gold(); break;
          case 'diamond-sets': await this.diamondSets(); break;
          case 'obsidian': await this.obsidian(); break;
          case 'flint-steel': await this.flintSteel(); break;
          case 'portal': await this.portal(); break;
          case 'paused': this.saved.stage = this.nextStage(); break;
          case 'complete': this.finish(); break;
        }
      }
    } catch (err: any) {
      this.detail(`Recovering: ${err?.message || String(err)}`);
    } finally {
      this.busy = false;
      this.saved.updatedAt = Date.now();
      this.save();
      if (this.running && this.saved.stage !== 'complete') this.schedule(800);
    }
  }

  private nextStage(): SurvivalStage {
    if (!this.hasAny(LOGS)) return 'wood';
    if (this.foodCount() < 16) return 'food';
    if (!this.has('white_bed')) return 'bed';
    if (this.count('coal') < 16) return 'coal';
    if (this.count('iron_ingot') < 32) return 'iron';
    if (!IRON_ARMOR.every((x) => this.has(x)) || !IRON_TOOLS.every((x) => this.has(x))) return 'iron-gear';
    if (this.count('diamond') < 192) return 'diamonds';
    if (this.count('gold_ingot') < 192) return 'gold';
    if (this.saved.setsMade < 5) return 'diamond-sets';
    if (this.count('obsidian') < 10) return 'obsidian';
    if (!this.has('flint_and_steel')) return 'flint-steel';
    return 'portal';
  }

  private async wood(): Promise<void> {
    this.detail('Finding the nearest safe overworld wood of any type');
    if (this.hasAny(LOGS) && this.countAny(LOGS) >= 16) {
      await this.craftBasicTools();
      this.saved.stage = 'food';
      return;
    }
    const block = this.findBlock((b: any) => LOGS.includes(b.name), 96);
    if (!block) return this.safeWander();
    await this.collect(block);
    await this.craftBasicTools();
  }

  private async food(): Promise<void> {
    this.detail(`Getting food (${this.foodCount()}/16)`);
    if (this.foodCount() >= 16) {
      this.saved.stage = 'bed';
      return;
    }
    const target = this.nearestEntity((e: any) => PASSIVE.has(e.name) && e.position.distanceTo(this.botGetter().entity.position) < 48);
    if (target) {
      await this.attack(target);
      return;
    }
    const block = this.findBlock((b: any) => ['hay_block', 'carrots', 'potatoes', 'wheat', 'sweet_berry_bush'].includes(b.name), 64);
    if (block) await this.collect(block);
    else await this.safeWander();
  }

  private async bed(): Promise<void> {
    this.detail('Getting three wool and crafting a bed');
    if (this.has('white_bed')) {
      this.saved.stage = 'coal';
      return;
    }
    if (this.count('white_wool') < 3) {
      const sheep = this.nearestEntity((e: any) => e.name === 'sheep' && e.position.distanceTo(this.botGetter().entity.position) < 64);
      if (sheep) await this.attack(sheep);
      else await this.safeWander();
      return;
    }
    await this.craft('white_bed');
    this.saved.stage = 'coal';
  }

  private async coal(): Promise<void> {
    this.detail(`Mining coal (${this.count('coal')}/16)`);
    if (this.count('coal') >= 16) {
      this.saved.stage = 'iron';
      return;
    }
    const ore = this.findBlock((b: any) => b.name === 'coal_ore' || b.name === 'deepslate_coal_ore', 96);
    if (ore) await this.collect(ore);
    else await this.mineAtY(16, (b: any) => b.name === 'coal_ore' || b.name === 'deepslate_coal_ore');
  }

  private async iron(): Promise<void> {
    this.detail(`Getting iron (${this.count('iron_ingot')}/32 ingots)`);
    if (this.count('iron_ingot') >= 32) {
      this.saved.stage = 'iron-gear';
      return;
    }
    const ore = this.findBlock((b: any) => b.name === 'iron_ore' || b.name === 'deepslate_iron_ore', 96);
    if (ore) await this.collect(ore);
    else await this.mineAtY(16, (b: any) => b.name === 'iron_ore' || b.name === 'deepslate_iron_ore');
    await this.smelt('iron_ore', 'deepslate_iron_ore', 'iron_ingot');
  }

  private async ironGear(): Promise<void> {
    this.detail('Smelting/crafting full iron armor and starter iron tools');
    await this.ensureFurnace();
    await this.smelt('iron_ore', 'deepslate_iron_ore', 'iron_ingot');
    await this.ensureTable();
    for (const item of [...IRON_TOOLS, ...IRON_ARMOR]) {
      if (!this.has(item)) await this.craft(item);
    }
    if (IRON_ARMOR.every((x) => this.has(x)) && IRON_TOOLS.every((x) => this.has(x))) this.saved.stage = 'diamonds';
  }

  private async diamonds(): Promise<void> {
    this.detail(`Mining diamonds (${this.count('diamond')}/192)`);
    if (this.count('diamond') >= 192) {
      this.saved.diamondPeak = Math.max(this.saved.diamondPeak, 192);
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
  }

  private async gold(): Promise<void> {
    this.detail(`Mining gold (${this.count('gold_ingot')}/192 ingots)`);
    if (this.count('gold_ingot') >= 192) {
      this.saved.goldPeak = Math.max(this.saved.goldPeak, 192);
      this.saved.stage = 'diamond-sets';
      return;
    }
    const ore = this.findBlock((b: any) => b.name === 'gold_ore' || b.name === 'deepslate_gold_ore', 128);
    if (ore && !this.hazard(ore.position)) {
      await this.collect(ore);
      await this.smelt('gold_ore', 'deepslate_gold_ore', 'gold_ingot');
      return;
    }
    await this.mineAtY(-16, (b: any) => b.name === 'gold_ore' || b.name === 'deepslate_gold_ore');
    await this.smelt('gold_ore', 'deepslate_gold_ore', 'gold_ingot');
  }

  private async diamondSets(): Promise<void> {
    this.detail(`Making five complete diamond armor/tool sets (${this.saved.setsMade}/5)`);
    await this.ensureTable();
    if (this.count('diamond') < 75) {
      this.saved.stage = 'diamonds';
      return;
    }
    while (this.saved.setsMade < 5) {
      for (const item of [...DIAMOND_TOOLS, ...DIAMOND_ARMOR]) {
        if (!this.has(item)) await this.craft(item);
      }
      if (![...DIAMOND_TOOLS, ...DIAMOND_ARMOR].every((x) => this.has(x))) throw new Error('Could not complete diamond set');
      this.saved.setsMade++;
      if (this.saved.setsMade < 5) await this.storeOneSet();
      this.save();
    }
    this.saved.stage = 'obsidian';
  }

  private async obsidian(): Promise<void> {
    this.detail(`Getting obsidian (${this.count('obsidian')}/10)`);
    if (this.count('obsidian') >= 10) {
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
    if (!lava) {
      await this.safeWander();
      return;
    }
    const water = this.get('water_bucket');
    if (!water) throw new Error('No water bucket for obsidian conversion');
    await this.moveNear(lava.position, 3);
    await this.smoothLook(lava.position, 160);
    await this.botGetter().equip(water, 'hand');
    await this.botGetter().activateBlock(lava);
    await this.sleep(700);
    const obs = this.findBlock((b: any) => b.name === 'obsidian', 32);
    if (obs) await this.collect(obs);
  }

  private async flintSteel(): Promise<void> {
    this.detail('Getting flint and crafting flint and steel');
    if (!this.has('flint')) {
      const gravel = this.findBlock((b: any) => b.name === 'gravel', 64);
      if (gravel) await this.collect(gravel);
      else await this.safeWander();
      return;
    }
    await this.craft('flint_and_steel');
    this.saved.stage = 'portal';
  }

  private async portal(): Promise<void> {
    this.detail('Building and lighting the Nether portal');
    if (this.count('obsidian') < 10 || !this.has('flint_and_steel')) {
      this.saved.stage = this.nextStage();
      return;
    }
    const bot = this.botGetter();
    const base = await this.safeSurface(bot.entity.position.floored());
    const frame: Vec3[] = [];
    for (let y = 0; y <= 4; y++) frame.push(base.offset(-1, y, 0), base.offset(2, y, 0));
    for (let x = -1; x <= 2; x++) frame.push(base.offset(x, 0, 0), base.offset(x, 4, 0));
    for (const p of this.unique(frame)) {
      if (bot.blockAt(p)?.name === 'obsidian') continue;
      const ref = this.referenceFor(p);
      if (!ref) throw new Error('No safe portal placement reference');
      await this.moveNear(ref.block.position, 4);
      const obs = this.get('obsidian');
      if (!obs) throw new Error('Out of obsidian');
      await bot.equip(obs, 'hand');
      await bot.placeBlock(ref.block, ref.face);
    }
    const inner = base.offset(0, 1, 0);
    const ref = this.referenceFor(inner);
    const flint = this.get('flint_and_steel');
    if (!ref || !flint) throw new Error('Portal lighting prerequisites missing');
    await this.moveNear(ref.block.position, 3);
    await bot.equip(flint, 'hand');
    await this.smoothLook(inner, 160);
    try { await bot.activateBlock(ref.block); } catch { await bot.activateItem(); }
    await this.sleep(1500);
    const portal = bot.blockAt(inner);
    if (portal?.name !== 'nether_portal') throw new Error('Portal did not ignite');
    this.saved.stage = 'complete';
    this.detail('MISSION COMPLETE: Nether portal built and lit; stopping safely');
    this.running = false;
    this.save();
    try { bot.pathfinder.stop(); bot.clearControlStates(); } catch {}
  }

  private async craftBasicTools(): Promise<void> {
    await this.ensureTable();
    const log = this.botGetter().inventory.items().find((i: any) => LOGS.includes(i.name));
    if (log) await this.craft(log.name.replace('_log', '_planks'));
    for (const item of ['wooden_pickaxe', 'wooden_axe', 'wooden_sword']) {
      if (!this.has(item)) await this.craft(item);
    }
  }

  private async ensureDeepMiningGear(): Promise<void> {
    await this.ensureTable();
    if (!this.has('iron_pickaxe')) await this.craft('iron_pickaxe');
    if (!this.has('water_bucket')) await this.ensureBucket();
    if (!this.has('torches')) {
      const sticks = this.count('stick');
      if (sticks < 8 && this.hasAny(PLANKS)) await this.craft('stick');
      if (this.count('coal') >= 8) await this.craft('torch');
    }
  }

  private async ensureTable(): Promise<void> {
    if (this.findBlock((b: any) => b.name === 'crafting_table', 8)) return;
    if (!this.has('crafting_table')) await this.craft('crafting_table', false);
    const table = this.get('crafting_table');
    if (!table) throw new Error('No crafting table in inventory');
    const p = await this.safeSurface(this.botGetter().entity.position.floored());
    const ref = this.referenceFor(p);
    if (!ref) throw new Error('No safe crafting-table site');
    await this.moveNear(ref.block.position, 3);
    await this.botGetter().equip(table, 'hand');
    await this.botGetter().placeBlock(ref.block, ref.face);
  }

  private async ensureFurnace(): Promise<void> {
    if (this.findBlock((b: any) => b.name === 'furnace', 8)) return;
    if (this.count('cobblestone') < 8) {
      const stone = this.findBlock((b: any) => b.name === 'stone' || b.name === 'cobblestone', 32);
      if (!stone) throw new Error('Need eight stone for furnace');
      for (let i = 0; i < 8; i++) await this.collect(stone);
    }
    await this.ensureTable();
    if (!this.has('furnace')) await this.craft('furnace');
    const furnace = this.get('furnace');
    if (!furnace) throw new Error('No furnace in inventory');
    const p = await this.safeSurface(this.botGetter().entity.position.floored());
    const ref = this.referenceFor(p);
    if (!ref) throw new Error('No safe furnace site');
    await this.moveNear(ref.block.position, 3);
    await this.botGetter().equip(furnace, 'hand');
    await this.botGetter().placeBlock(ref.block, ref.face);
  }

  private async smelt(ore1: string, ore2: string, output: string): Promise<void> {
    const furnace = this.findBlock((b: any) => b.name === 'furnace', 8);
    if (!furnace) return;
    const input = this.botGetter().inventory.items().find((i: any) => i.name === ore1 || i.name === ore2);
    const fuel = this.get('coal') || this.get('charcoal');
    if (!input || !fuel) return;
    await this.moveNear(furnace.position, 3);
    const f = await this.botGetter().openFurnace(furnace);
    try {
      await f.putFuel(fuel.type, Math.min(fuel.count, 64));
      await f.putInput(input.type, Math.min(input.count, 64));
      const until = Date.now() + 70000;
      while (Date.now() < until && f.inputItem()) await this.sleep(1000);
      if (f.outputItem()) await f.takeOutput();
    } finally {
      try { f.close(); } catch {}
    }
    this.detail(`Smelted ${output}`);
  }

  private async craft(name: string, table = true): Promise<void> {
    const bot = this.botGetter();
    const item = bot.registry?.itemsByName?.[name];
    if (!item) throw new Error(`Unknown survival item: ${name}`);
    let recipe = bot.recipesFor(item.id, null, 1, undefined)?.[0];
    if (!recipe && table) {
      const t = this.findBlock((b: any) => b.name === 'crafting_table', 8);
      if (t) recipe = bot.recipesFor(item.id, t, 1, undefined)?.[0];
    }
    if (!recipe) throw new Error(`No survival recipe available for ${name}`);
    const t = recipe.requiresTable ? this.findBlock((b: any) => b.name === 'crafting_table', 8) : undefined;
    await bot.craft(recipe, 1, t || undefined);
  }

  private async collect(block: any): Promise<void> {
    const bot = this.botGetter();
    if (!block || this.hazard(block.position)) throw new Error(`Unsafe resource: ${block?.name}`);
    await this.moveNear(block.position, 3);
    if (this.hazard(block.position)) throw new Error('Hazard appeared beside resource');
    try {
      await bot.dig(block, true);
    } catch (err) {
      // One retry after a fresh block lookup prevents stale block references.
      const fresh = bot.blockAt(block.position);
      if (!fresh || fresh.name === 'air' || this.hazard(fresh.position)) throw err;
      await bot.dig(fresh, true);
    }
  }

  private async mineAtY(targetY: number, oreMatch: (b: any) => boolean): Promise<void> {
    const bot = this.botGetter();
    if (Math.abs(bot.entity.position.y - targetY) > 3) {
      await this.goToY(targetY);
      return;
    }
    const ore = this.findBlock(oreMatch, 48);
    if (ore && !this.hazard(ore.position)) {
      await this.collect(ore);
      return;
    }
    // Short, reversible branch: walk forward while checking both the block and
    // the two blocks above it. Never dig into a visible liquid/fire hazard.
    const yaw = bot.entity.yaw;
    const dir = new Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
    for (let i = 0; i < 8; i++) {
      const p = bot.entity.position.floored().offset(Math.round(dir.x), 0, Math.round(dir.z));
      if (this.hazard(p) || this.hazard(p.offset(0, 1, 0))) return this.safeWander();
      const a = bot.blockAt(p);
      const b = bot.blockAt(p.offset(0, 1, 0));
      if (!a || !b || a.boundingBox === 'empty' || b.boundingBox === 'empty') {
        await this.moveNear(p, 1);
        continue;
      }
      if (oreMatch(a)) { await this.collect(a); return; }
      await this.collect(a);
      if (oreMatch(b)) { await this.collect(b); return; }
      await this.collect(b);
    }
  }

  private async goToY(y: number): Promise<void> {
    const bot = this.botGetter();
    const { goals } = require('mineflayer-pathfinder');
    const current = bot.entity.position;
    bot.pathfinder.setGoal(new goals.GoalYLevel(y));
    const until = Date.now() + 45000;
    while (Date.now() < until && bot.entity && Math.abs(bot.entity.position.y - y) > 3) {
      if (this.hazard(bot.entity.position)) break;
      await this.sleep(500);
    }
    bot.pathfinder.stop();
    if (Math.abs(bot.entity.position.y - y) > 6) throw new Error(`Could not safely reach mining level ${y}`);
  }

  private async moveNear(target: Vec3, range = 3): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) throw new Error('Bot not spawned');
    if (this.hazard(target)) throw new Error('Target is hazardous');
    const { goals } = require('mineflayer-pathfinder');
    const safe = this.safeApproach(target);
    if (!safe) throw new Error('No safe approach to target');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Safe path timeout'));
      }, 30000);
      const done = () => { cleanup(); resolve(); };
      const cleanup = () => {
        clearTimeout(timeout);
        bot.removeListener('goal_reached', done);
      };
      bot.once('goal_reached', done);
      try { bot.pathfinder.setGoal(new goals.GoalNear(safe.x, safe.y, safe.z, range)); }
      catch (e) { cleanup(); reject(e); }
    });
  }

  private safeApproach(target: Vec3): Vec3 | null {
    const candidates = [
      target.offset(2, 0, 0), target.offset(-2, 0, 0),
      target.offset(0, 0, 2), target.offset(0, 0, -2),
      target.offset(3, 0, 1), target.offset(-3, 0, -1),
    ];
    return candidates.find((p) => !this.hazard(p) && !this.hazard(p.offset(0, -1, 0))) || null;
  }

  private async safeSurface(origin: Vec3): Promise<Vec3> {
    for (let r = 0; r <= 8; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const p = origin.offset(dx, 0, dz).floored();
        const floor = this.botGetter().blockAt(p.offset(0, -1, 0));
        const feet = this.botGetter().blockAt(p);
        const head = this.botGetter().blockAt(p.offset(0, 1, 0));
        if (floor?.boundingBox === 'block' && feet?.name === 'air' && head?.name === 'air' && !this.hazard(p)) return p;
      }
    }
    throw new Error('No safe surface nearby');
  }

  private referenceFor(target: Vec3): { block: any; face: Vec3 } | null {
    const candidates: Array<[Vec3, Vec3]> = [
      [new Vec3(0, -1, 0), target.offset(0, -1, 0)],
      [new Vec3(0, 1, 0), target.offset(0, 1, 0)],
      [new Vec3(1, 0, 0), target.offset(1, 0, 0)],
      [new Vec3(-1, 0, 0), target.offset(-1, 0, 0)],
      [new Vec3(0, 0, 1), target.offset(0, 0, 1)],
      [new Vec3(0, 0, -1), target.offset(0, 0, -1)],
    ];
    for (const [face, pos] of candidates) {
      const block = this.botGetter().blockAt(pos);
      if (block && block.boundingBox === 'block' && !this.hazard(block.position)) return { block, face };
    }
    return null;
  }

  private async attack(entity: any): Promise<void> {
    const bot = this.botGetter();
    if (!entity?.position || !bot?.entity || Date.now() - this.lastAttack < 500) return;
    this.lastAttack = Date.now();
    const weapon = this.get('diamond_sword') || this.get('iron_sword') || this.get('stone_sword') || this.get('wooden_sword');
    if (weapon) await bot.equip(weapon, 'hand').catch(() => {});
    await this.moveNear(entity.position, 3).catch(() => {});
    const until = Date.now() + 6000;
    while (entity.isValid !== false && Date.now() < until && bot.entity) {
      if (this.hazard(entity.position)) break;
      await this.smoothLook(entity.position, 100);
      if (entity.position.distanceTo(bot.entity.position) <= 4) bot.attack(entity);
      await this.sleep(550);
    }
  }

  private async fightIfNecessary(): Promise<void> {
    const bot = this.botGetter();
    const threat = this.nearestEntity((e: any) => HOSTILE.has(e.name) && e.position.distanceTo(bot.entity.position) <= 10);
    if (threat) await this.attack(threat);
  }

  private async eatIfNeeded(): Promise<void> {
    const bot = this.botGetter();
    if (!bot || bot.food >= 12) return;
    const food = bot.inventory.items().find((i: any) => FOOD.includes(i.name));
    if (!food) return;
    await bot.equip(food, 'hand');
    try { await bot.consume(); } catch {}
  }

  private async retreatFromDanger(): Promise<void> {
    const bot = this.botGetter();
    bot.pathfinder.stop();
    await this.safeWander();
  }

  private async safeWander(): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) return;
    for (let i = 0; i < 8; i++) {
      const p = bot.entity.position.floored().offset(Math.floor((Math.random() - 0.5) * 20), 0, Math.floor((Math.random() - 0.5) * 20));
      if (!this.hazard(p) && !this.hazard(p.offset(0, -1, 0))) {
        try { await this.moveNear(p, 2); } catch {}
        return;
      }
    }
  }

  private async ensureBucket(): Promise<void> {
    if (this.has('water_bucket')) return;
    await this.ensureTable();
    if (!this.has('bucket')) await this.craft('bucket');
    const bucket = this.get('bucket');
    const water = this.findBlock((b: any) => b.name === 'water', 64);
    if (!bucket || !water) throw new Error('Natural water source not found');
    await this.moveNear(water.position, 2);
    await this.smoothLook(water.position, 160);
    await this.botGetter().equip(bucket, 'hand');
    await this.botGetter().activateBlock(water);
  }

  private async storeOneSet(): Promise<void> {
    const bot = this.botGetter();
    const chest = await this.ensureChest();
    if (!chest) return;
    await this.moveNear(chest.position, 3);
    const c = await bot.openChest(chest);
    try {
      for (const item of [...DIAMOND_TOOLS, ...DIAMOND_ARMOR]) {
        const stack = this.get(item);
        if (stack) await c.deposit(stack.type, null, stack.count);
      }
    } finally { try { c.close(); } catch {} }
  }

  private async ensureChest(): Promise<any | null> {
    const bot = this.botGetter();
    const existing = this.findBlock((b: any) => b.name === 'chest', 8);
    if (existing) return existing;
    if (!this.has('chest')) {
      await this.ensureTable();
      if (this.count('oak_planks') + this.countAny(PLANKS) < 8) return null;
      await this.craft('chest');
    }
    const chest = this.get('chest');
    if (!chest) return null;
    const p = await this.safeSurface(bot.entity.position.floored());
    const ref = this.referenceFor(p);
    if (!ref) return null;
    await this.moveNear(ref.block.position, 3);
    await bot.equip(chest, 'hand');
    await bot.placeBlock(ref.block, ref.face);
    return this.findBlock((b: any) => b.name === 'chest', 8);
  }

  private async smoothLook(target: Vec3, totalMs: number): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) return;
    const eye = bot.entity.position.offset(0, bot.entity.height * 0.9, 0);
    const dx = target.x - eye.x, dy = target.y - eye.y, dz = target.z - eye.z;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
    const startYaw = bot.entity.yaw, startPitch = bot.entity.pitch;
    const steps = Math.max(4, Math.ceil(totalMs / 45));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const eased = t * t * (3 - 2 * t);
      await bot.look(startYaw + angle(yaw - startYaw) * eased, startPitch + (pitch - startPitch) * eased, false);
      await this.sleep(Math.max(15, Math.floor(totalMs / steps)));
    }
  }

  private findBlock(match: (b: any) => boolean, maxDistance: number): any | null {
    const bot = this.botGetter();
    try { return bot.findBlock({ matching: match, maxDistance, count: 1 }) || null; } catch { return null; }
  }

  private nearestEntity(match: (e: any) => boolean): any | null {
    const bot = this.botGetter();
    try { return bot.nearestEntity((e: any) => !!e?.position && match(e)) || null; } catch { return null; }
  }

  private hazard(p: Vec3): boolean {
    const bot = this.botGetter();
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 2; y++) for (let z = -1; z <= 1; z++) {
      const b = bot.blockAt(p.offset(x, y, z));
      if (b && DANGER.has(b.name)) return true;
    }
    return false;
  }

  private count(name: string): number {
    return this.botGetter()?.inventory?.items?.().filter((i: any) => i.name === name).reduce((n: number, i: any) => n + i.count, 0) || 0;
  }

  private countAny(names: string[]): number {
    return names.reduce((n, x) => n + this.count(x), 0);
  }

  private foodCount(): number { return this.countAny(FOOD); }
  private has(name: string): boolean { return this.count(name) > 0; }
  private hasAny(names: string[]): boolean { return names.some((x) => this.has(x)); }

  private unique(points: Vec3[]): Vec3[] {
    const seen = new Set<string>();
    return points.filter((p) => {
      const k = `${p.x},${p.y},${p.z}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private detail(text: string): void {
    this.lastStatus = text;
    if (text !== this.lastStatus) this.saved.updatedAt = Date.now();
  }

  private finish(): void {
    this.saved.stage = 'complete';
    this.running = false;
    this.save();
  }

  private load(): SavedMission {
    const fresh: SavedMission = {
      schema: 1, stage: 'wood', deaths: 0, setsMade: 0, diamondPeak: 0,
      goldPeak: 0, startedAt: Date.now(), updatedAt: Date.now(),
    };
    try {
      const value = JSON.parse(fs.readFileSync(this.file, 'utf8')) as SavedMission;
      if (value.schema === 1) return { ...fresh, ...value };
    } catch {}
    return fresh;
  }

  private save(): void {
    try {
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.saved, null, 2));
      fs.renameSync(tmp, this.file);
    } catch {}
  }

  private sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
}

function angle(value: number): number {
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}
