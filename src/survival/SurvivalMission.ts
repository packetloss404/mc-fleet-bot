import fs from 'fs';
import path from 'path';
import { Vec3 } from 'vec3';

import type { Config } from '../config';
import { getMineSite, getMinDigY } from '../actions/geofence';
import type { MineSite } from '../actions/geofence';
import { atomicWriteJsonSync } from '../util/atomicWrite';
import { logger } from '../util/logger';

export const SURVIVAL_STAGES = [
  'wood',
  'food',
  'bed',
  'coal',
  'iron',
  'iron-gear',
  'diamonds',
  'gold',
  'diamond-sets',
  'obsidian',
  'flint-steel',
  'portal',
  'complete',
] as const;

export type SurvivalStage = typeof SURVIVAL_STAGES[number];

export interface SurvivalMissionStatus {
  bot: string;
  stage: SurvivalStage;
  detail: string;
  running: boolean;
  paused: boolean;
  deaths: number;
  setsMade: number;
  diamonds: number;
  gold: number;
  food: number;
  obsidian: number;
  position: { x: number; y: number; z: number } | null;
  startedAt: number;
  updatedAt: number;
}

interface SavedMission {
  schema: 1;
  stage: SurvivalStage;
  paused: boolean;
  deaths: number;
  setsMade: number;
  diamondPeak: number;
  goldPeak: number;
  startedAt: number;
  updatedAt: number;
}

export interface SurvivalMissionOptions {
  botGetter: () => any | null;
  name: string;
  pauseVoyager: () => void;
  resumeVoyager: () => void;
  dataDir?: string;
  tickMs?: number;
}

interface InventoryLike {
  name: string;
  count: number;
  type?: number;
}

const LOGS = [
  'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log',
  'dark_oak_log', 'mangrove_log', 'cherry_log', 'pale_oak_log',
];
const PLANKS = LOGS.map((name) => name.replace('_log', '_planks'));
const BEDS = [
  'white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed',
  'lime_bed', 'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed',
  'purple_bed', 'blue_bed', 'brown_bed', 'green_bed', 'red_bed', 'black_bed',
];
const FOOD = [
  'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken',
  'cooked_rabbit', 'bread', 'baked_potato', 'beef', 'porkchop', 'mutton',
  'chicken', 'rabbit', 'potato', 'carrot', 'sweet_berries', 'apple',
];
const PASSIVE_MOBS = new Set(['cow', 'pig', 'sheep', 'chicken', 'rabbit']);
const HOSTILE_MOBS = new Set([
  'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'witch', 'husk',
  'drowned', 'stray', 'pillager', 'vindicator', 'phantom', 'slime',
]);
const HAZARDS = new Set([
  'lava', 'flowing_lava', 'fire', 'soul_fire', 'magma_block',
  'campfire', 'soul_campfire',
]);
const IRON_ARMOR = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'];
const IRON_TOOLS = ['iron_pickaxe', 'iron_axe', 'iron_sword'];
const DIAMOND_ARMOR = ['diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots'];
const DIAMOND_TOOLS = ['diamond_pickaxe', 'diamond_axe', 'diamond_sword'];
const DIAMONDS_PER_SET = 32;
const DIAMOND_SET_TARGET = 5;
const GOLD_TARGET = 192;
const OBSIDIAN_TARGET = 14;

export function isSurvivalMissionTarget(config: Pick<Config, 'survival'>, botName: string): boolean {
  const survival = config.survival;
  return survival?.enabled === true
    && survival.botName === botName;
}

export function findCraftableBed(items: readonly InventoryLike[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.name, (counts.get(item.name) ?? 0) + item.count);
  for (const bed of BEDS) {
    const wool = bed.replace('_bed', '_wool');
    if ((counts.get(wool) ?? 0) >= 3) return bed;
  }
  return null;
}

export type SurvivalMiningDisposition =
  | { kind: 'unrestricted' }
  | { kind: 'blocked' }
  | { kind: 'mine-site'; site: MineSite };

/** Decide deep-mining authority without weakening the configured depth floor. */
export function survivalMiningDisposition(
  targetY: number,
  minDigY: number | null,
  mineSite: MineSite | null,
): SurvivalMiningDisposition {
  if (minDigY === null || targetY >= minDigY) return { kind: 'unrestricted' };
  if (!mineSite) return { kind: 'blocked' };
  return { kind: 'mine-site', site: mineSite };
}

export function createSurvivalMission(
  config: Pick<Config, 'survival'>,
  botName: string,
  options: Omit<SurvivalMissionOptions, 'name'>,
): SurvivalMission | null {
  if (!isSurvivalMissionTarget(config, botName)) return null;
  return new SurvivalMission({ ...options, name: botName });
}

/**
 * Explicitly enabled, single-bot survival objective controller.
 *
 * The controller never spawns or removes bots, changes server configuration,
 * sends chat commands, grants items, or bypasses the normal dig/place/path
 * guards. Every world mutation goes through the existing Mineflayer bot
 * methods, so protected zones, the carve ceiling, and the communal-mine depth
 * policy remain authoritative.
 */
export class SurvivalMission {
  private readonly botGetter: () => any | null;
  private readonly name: string;
  private readonly pauseVoyager: () => void;
  private readonly resumeVoyager: () => void;
  private readonly file: string;
  private readonly tickMs: number;
  private saved: SavedMission;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private busy = false;
  private lastAttackAt = 0;
  private lastStatus = '';

  constructor(options: SurvivalMissionOptions) {
    this.botGetter = options.botGetter;
    this.name = options.name;
    this.pauseVoyager = options.pauseVoyager;
    this.resumeVoyager = options.resumeVoyager;
    this.tickMs = Math.max(250, options.tickMs ?? 800);
    const dataDir = options.dataDir ?? path.join(process.cwd(), 'data');
    this.file = path.join(dataDir, 'survival', `${options.name}.json`);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.saved = this.load();
  }

  start(): void {
    if (this.running || this.saved.paused || this.saved.stage === 'complete') return;
    this.running = true;
    this.persist();
    this.schedule(100);
  }

  pause(): SurvivalMissionStatus {
    this.running = false;
    this.saved.paused = true;
    this.saved.updatedAt = Date.now();
    this.clearTimer();
    this.stopMovement();
    this.persist();
    this.resumeVoyager();
    return this.status();
  }

  resume(): SurvivalMissionStatus {
    if (this.saved.stage === 'complete') return this.status();
    this.saved.paused = false;
    this.saved.updatedAt = Date.now();
    this.running = true;
    this.persist();
    this.schedule(100);
    return this.status();
  }

  shutdown(): void {
    this.running = false;
    this.clearTimer();
    this.stopMovement();
  }

  recordDeath(): void {
    this.saved.deaths += 1;
    this.saved.updatedAt = Date.now();
    this.persist();
  }

  status(): SurvivalMissionStatus {
    const bot = this.botGetter();
    const position = bot?.entity?.position;
    return {
      bot: this.name,
      stage: this.saved.stage,
      detail: this.lastStatus || `Stage: ${this.saved.stage}`,
      running: this.running,
      paused: this.saved.paused,
      deaths: this.saved.deaths,
      setsMade: this.saved.setsMade,
      diamonds: this.count('diamond'),
      gold: this.count('gold_ingot'),
      food: this.countAny(FOOD),
      obsidian: this.count('obsidian'),
      position: position ? {
        x: Math.floor(position.x),
        y: Math.floor(position.y),
        z: Math.floor(position.z),
      } : null,
      startedAt: this.saved.startedAt,
      updatedAt: this.saved.updatedAt,
    };
  }

  private schedule(ms: number): void {
    if (!this.running || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, ms);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (!this.running || this.saved.paused || this.saved.stage === 'complete') return;
    const bot = this.botGetter();
    if (!bot?.entity || bot.health <= 0) {
      this.schedule(1_500);
      return;
    }
    if (this.busy) {
      this.schedule(500);
      return;
    }

    this.busy = true;
    try {
      this.pauseVoyager();
      await this.eatIfNeeded();
      await this.fightIfNecessary();
      if (bot.health <= 5) {
        await this.safeWander();
      } else {
        await this.runStage();
      }
    } catch (err: any) {
      this.detail(`Recovering: ${err?.message ?? String(err)}`);
      logger.warn(
        { bot: this.name, stage: this.saved.stage, err: err?.message },
        'Survival mission stage attempt failed; will retry',
      );
    } finally {
      this.busy = false;
      this.saved.updatedAt = Date.now();
      this.persist();
      if (this.running && !this.saved.paused) {
        this.schedule(this.tickMs);
      }
    }
  }

  private async runStage(): Promise<void> {
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
      case 'complete': this.finish(); break;
    }
  }

  private async wood(): Promise<void> {
    this.detail('Gathering wood and crafting starter tools');
    if (IRON_TOOLS.some((name) => this.has(name))
        || ['wooden_pickaxe', 'wooden_axe', 'wooden_sword'].every((name) => this.has(name))) {
      this.advance('food');
      return;
    }
    if (this.countAny(LOGS) < 8 && this.countAny(PLANKS) < 20) {
      const block = this.findBlock((candidate) => LOGS.includes(candidate.name), 96);
      if (block) await this.collect(block);
      else await this.safeWander();
      return;
    }
    await this.ensurePlanks(20);
    await this.ensureTable();
    if (this.count('stick') < 8) await this.craft('stick', false, 2);
    for (const item of ['wooden_pickaxe', 'wooden_axe', 'wooden_sword']) {
      if (!this.has(item)) await this.craft(item);
    }
  }

  private async food(): Promise<void> {
    this.detail(`Gathering food (${this.countAny(FOOD)}/16)`);
    if (this.countAny(FOOD) >= 16) {
      this.advance('bed');
      return;
    }
    const animal = this.nearestEntity((entity) => PASSIVE_MOBS.has(entity.name)
      && entity.position.distanceTo(this.botGetter().entity.position) < 48);
    if (animal) {
      await this.attack(animal);
      return;
    }
    const crop = this.findBlock(
      (block) => ['hay_block', 'carrots', 'potatoes', 'wheat', 'sweet_berry_bush'].includes(block.name),
      64,
    );
    if (crop) await this.collect(crop);
    else await this.safeWander();
  }

  private async bed(): Promise<void> {
    this.detail('Gathering matching wool and crafting a bed');
    if (BEDS.some((name) => this.has(name))) {
      this.advance('coal');
      return;
    }
    const bed = findCraftableBed(this.inventory());
    if (bed) {
      await this.ensureTable();
      await this.craft(bed);
      this.advance('coal');
      return;
    }
    const sheep = this.nearestEntity((entity) => entity.name === 'sheep'
      && entity.position.distanceTo(this.botGetter().entity.position) < 64);
    if (sheep) await this.attack(sheep);
    else await this.safeWander();
  }

  private async coal(): Promise<void> {
    this.detail(`Mining coal (${this.count('coal')}/16)`);
    if (this.count('coal') >= 16) {
      this.advance('iron');
      return;
    }
    const ore = this.findBlock(
      (block) => block.name === 'coal_ore' || block.name === 'deepslate_coal_ore',
      96,
    );
    if (ore) await this.collect(ore);
    else await this.mineAtY(16, (block) => block.name === 'coal_ore' || block.name === 'deepslate_coal_ore');
  }

  private async iron(): Promise<void> {
    this.detail(`Smelting iron (${this.count('iron_ingot')}/32 ingots)`);
    if (this.count('iron_ingot') >= 32) {
      this.advance('iron-gear');
      return;
    }
    if (this.count('iron_ore') + this.count('deepslate_iron_ore') > 0) {
      await this.ensureFurnace();
      await this.smelt(['iron_ore', 'deepslate_iron_ore']);
      return;
    }
    const ore = this.findBlock(
      (block) => block.name === 'iron_ore' || block.name === 'deepslate_iron_ore',
      96,
    );
    if (ore) await this.collect(ore);
    else await this.mineAtY(16, (block) => block.name === 'iron_ore' || block.name === 'deepslate_iron_ore');
  }

  private async ironGear(): Promise<void> {
    this.detail('Crafting iron armor and tools');
    await this.ensureTable();
    for (const item of [...IRON_TOOLS, ...IRON_ARMOR]) {
      if (!this.has(item)) await this.craft(item);
    }
    if ([...IRON_TOOLS, ...IRON_ARMOR].every((name) => this.has(name))) {
      this.advance('diamonds');
    }
  }

  private async diamonds(): Promise<void> {
    const needed = DIAMONDS_PER_SET * (DIAMOND_SET_TARGET - this.saved.setsMade);
    this.detail(`Mining diamonds (${this.count('diamond')}/${needed})`);
    if (this.count('diamond') >= needed) {
      this.saved.diamondPeak = Math.max(this.saved.diamondPeak, this.count('diamond'));
      this.advance('gold');
      return;
    }
    await this.ensureDeepMiningGear();
    const ore = this.findBlock(
      (block) => block.name === 'diamond_ore' || block.name === 'deepslate_diamond_ore',
      128,
    );
    if (ore && !this.hazard(ore.position)) await this.collect(ore);
    else await this.mineAtY(-54, (block) => block.name === 'diamond_ore' || block.name === 'deepslate_diamond_ore');
  }

  private async gold(): Promise<void> {
    this.detail(`Smelting gold (${this.count('gold_ingot')}/${GOLD_TARGET} ingots)`);
    if (this.count('gold_ingot') >= GOLD_TARGET) {
      this.saved.goldPeak = Math.max(this.saved.goldPeak, this.count('gold_ingot'));
      this.advance('diamond-sets');
      return;
    }
    if (this.count('gold_ore') + this.count('deepslate_gold_ore') > 0) {
      await this.ensureFurnace();
      await this.smelt(['gold_ore', 'deepslate_gold_ore']);
      return;
    }
    const ore = this.findBlock(
      (block) => block.name === 'gold_ore' || block.name === 'deepslate_gold_ore',
      128,
    );
    if (ore && !this.hazard(ore.position)) await this.collect(ore);
    else await this.mineAtY(-16, (block) => block.name === 'gold_ore' || block.name === 'deepslate_gold_ore');
  }

  private async diamondSets(): Promise<void> {
    this.detail(`Crafting diamond armor/tool sets (${this.saved.setsMade}/${DIAMOND_SET_TARGET})`);
    if (this.saved.setsMade >= DIAMOND_SET_TARGET) {
      this.advance('obsidian');
      return;
    }
    const set = [...DIAMOND_TOOLS, ...DIAMOND_ARMOR];
    if (!set.every((name) => this.has(name))) {
      if (this.count('diamond') < DIAMONDS_PER_SET) {
        this.advance('diamonds');
        return;
      }
      await this.ensureTable();
      for (const item of set) if (!this.has(item)) await this.craft(item);
      return;
    }

    this.saved.setsMade += 1;
    if (this.saved.setsMade < DIAMOND_SET_TARGET) await this.storeOneSet();
    if (this.saved.setsMade >= DIAMOND_SET_TARGET) this.advance('obsidian');
  }

  private async obsidian(): Promise<void> {
    this.detail(`Gathering obsidian (${this.count('obsidian')}/${OBSIDIAN_TARGET})`);
    if (this.count('obsidian') >= OBSIDIAN_TARGET) {
      this.advance('flint-steel');
      return;
    }
    const exposed = this.findBlock((block) => block.name === 'obsidian', 128);
    if (exposed && !this.hazard(exposed.position)) {
      await this.collect(exposed);
      return;
    }
    await this.ensureBucket();
    const lava = this.findBlock((block) => block.name === 'lava', 64);
    if (!lava) {
      await this.safeWander();
      return;
    }
    const water = this.get('water_bucket');
    if (!water) throw new Error('No water bucket available for obsidian conversion');
    await this.moveNear(lava.position, 3);
    await this.smoothLook(lava.position, 160);
    const bot = this.botGetter();
    await bot.equip(water, 'hand');
    await bot.activateItem();
    await this.sleep(700);
  }

  private async flintSteel(): Promise<void> {
    this.detail('Gathering flint and crafting flint and steel');
    if (this.has('flint_and_steel')) {
      this.advance('portal');
      return;
    }
    if (!this.has('flint')) {
      const gravel = this.findBlock((block) => block.name === 'gravel', 64);
      if (gravel) await this.collect(gravel);
      else await this.safeWander();
      return;
    }
    await this.ensureTable();
    await this.craft('flint_and_steel');
  }

  private async portal(): Promise<void> {
    this.detail('Building and lighting the Nether portal');
    if (this.count('obsidian') < OBSIDIAN_TARGET || !this.has('flint_and_steel')) {
      throw new Error('Portal prerequisites are no longer in inventory');
    }
    const bot = this.botGetter();
    const base = await this.safeSurface(bot.entity.position.floored());
    const frame: Vec3[] = [];
    for (let y = 0; y <= 4; y += 1) {
      frame.push(base.offset(-1, y, 0), base.offset(2, y, 0));
    }
    for (let x = -1; x <= 2; x += 1) {
      frame.push(base.offset(x, 0, 0), base.offset(x, 4, 0));
    }
    for (const target of this.unique(frame)) {
      if (bot.blockAt(target)?.name === 'obsidian') continue;
      const reference = this.referenceFor(target);
      if (!reference) throw new Error('No safe portal placement reference');
      const obsidian = this.get('obsidian');
      if (!obsidian) throw new Error('Out of obsidian while building portal');
      await this.moveNear(reference.block.position, 4);
      await bot.equip(obsidian, 'hand');
      await bot.placeBlock(reference.block, reference.face);
    }
    const inner = base.offset(0, 1, 0);
    const flint = this.get('flint_and_steel');
    if (!flint) throw new Error('Flint and steel missing');
    await this.moveNear(inner, 3);
    await bot.equip(flint, 'hand');
    await this.smoothLook(inner, 160);
    await bot.activateItem();
    await this.sleep(1_500);
    if (bot.blockAt(inner)?.name !== 'nether_portal') throw new Error('Portal did not ignite');
    this.finish();
  }

  private async ensurePlanks(minimum: number): Promise<void> {
    if (this.countAny(PLANKS) >= minimum) return;
    const log = this.inventory().find((item) => LOGS.includes(item.name));
    if (!log) throw new Error('No logs available to craft planks');
    const crafts = Math.max(1, Math.min(log.count, Math.ceil((minimum - this.countAny(PLANKS)) / 4)));
    await this.craft(log.name.replace('_log', '_planks'), false, crafts);
  }

  private async ensureTable(): Promise<any> {
    const existing = this.findBlock((block) => block.name === 'crafting_table', 8);
    if (existing) return existing;
    if (!this.has('crafting_table')) {
      await this.ensurePlanks(4);
      await this.craft('crafting_table', false);
    }
    const table = this.get('crafting_table');
    if (!table) throw new Error('Crafting table unavailable');
    return this.placeUtility(table, 'crafting_table');
  }

  private async ensureFurnace(): Promise<any> {
    const existing = this.findBlock((block) => block.name === 'furnace', 8);
    if (existing) return existing;
    if (!this.has('furnace')) {
      if (this.count('cobblestone') < 8) {
        const stone = this.findBlock(
          (block) => block.name === 'stone' || block.name === 'cobblestone',
          32,
        );
        if (!stone) throw new Error('Need cobblestone for a furnace');
        await this.collect(stone);
        return null;
      }
      await this.ensureTable();
      await this.craft('furnace');
    }
    const furnace = this.get('furnace');
    if (!furnace) throw new Error('Furnace unavailable');
    return this.placeUtility(furnace, 'furnace');
  }

  private async placeUtility(item: any, blockName: string): Promise<any> {
    const bot = this.botGetter();
    const target = await this.safeSurface(bot.entity.position.floored());
    const reference = this.referenceFor(target);
    if (!reference) throw new Error(`No safe site for ${blockName}`);
    await this.moveNear(reference.block.position, 3);
    await bot.equip(item, 'hand');
    await bot.placeBlock(reference.block, reference.face);
    const placed = this.findBlock((block) => block.name === blockName, 8);
    if (!placed) throw new Error(`${blockName} placement could not be verified`);
    return placed;
  }

  private async smelt(oreNames: string[]): Promise<void> {
    const furnace = await this.ensureFurnace();
    if (!furnace) return;
    const input = this.inventory().find((item) => oreNames.includes(item.name));
    const fuel = this.get('coal') ?? this.get('charcoal');
    if (!input || !fuel || input.type == null || fuel.type == null) return;
    await this.moveNear(furnace.position, 3);
    const opened = await this.botGetter().openFurnace(furnace);
    try {
      await opened.putFuel(fuel.type, null, Math.min(fuel.count, 64));
      await opened.putInput(input.type, null, Math.min(input.count, 64));
      const deadline = Date.now() + 70_000;
      while (Date.now() < deadline && opened.inputItem()) await this.sleep(1_000);
      if (opened.outputItem()) await opened.takeOutput();
    } finally {
      try { opened.close(); } catch {}
    }
  }

  private async craft(name: string, table = true, count = 1): Promise<void> {
    const bot = this.botGetter();
    const item = bot.registry?.itemsByName?.[name];
    if (!item) throw new Error(`Unknown survival item: ${name}`);
    const station = table ? this.findBlock((block) => block.name === 'crafting_table', 8) : undefined;
    let recipe = bot.recipesFor(item.id, null, 1, station)?.[0];
    if (!recipe && !table) recipe = bot.recipesFor(item.id, null, 1, undefined)?.[0];
    if (!recipe) throw new Error(`No available survival recipe for ${name}`);
    await bot.craft(recipe, count, recipe.requiresTable ? station : undefined);
  }

  private async ensureDeepMiningGear(): Promise<void> {
    await this.ensureTable();
    if (!this.has('iron_pickaxe')) await this.craft('iron_pickaxe');
    if (!this.has('water_bucket')) await this.ensureBucket();
    if (this.count('torch') < 16 && this.count('coal') >= 4) {
      if (this.count('stick') < 4) await this.craft('stick', false);
      await this.craft('torch', false, 4);
    }
  }

  private async ensureBucket(): Promise<void> {
    if (this.has('water_bucket')) return;
    await this.ensureTable();
    if (!this.has('bucket')) await this.craft('bucket');
    const bucket = this.get('bucket');
    const water = this.findBlock((block) => block.name === 'water', 64);
    if (!bucket || !water) throw new Error('Natural water source not found');
    await this.moveNear(water.position, 2);
    await this.smoothLook(water.position, 160);
    const bot = this.botGetter();
    await bot.equip(bucket, 'hand');
    await bot.activateItem();
  }

  private async storeOneSet(): Promise<void> {
    const chest = await this.ensureChest();
    await this.moveNear(chest.position, 3);
    const opened = await this.botGetter().openChest(chest);
    try {
      for (const name of [...DIAMOND_TOOLS, ...DIAMOND_ARMOR]) {
        const item = this.get(name);
        if (item?.type != null) await opened.deposit(item.type, null, 1);
      }
    } finally {
      try { opened.close(); } catch {}
    }
  }

  private async ensureChest(): Promise<any> {
    const existing = this.findBlock((block) => block.name === 'chest', 8);
    if (existing) return existing;
    if (!this.has('chest')) {
      await this.ensurePlanks(8);
      await this.ensureTable();
      await this.craft('chest');
    }
    const chest = this.get('chest');
    if (!chest) throw new Error('Chest unavailable for completed set');
    return this.placeUtility(chest, 'chest');
  }

  private async mineAtY(targetY: number, match: (block: any) => boolean): Promise<void> {
    await this.enterSanctionedMineIfRequired(targetY);
    const bot = this.botGetter();
    if (Math.abs(bot.entity.position.y - targetY) > 3) {
      await this.goToY(targetY);
      return;
    }
    const ore = this.findBlock(match, 48);
    if (ore && !this.hazard(ore.position)) {
      await this.collect(ore);
      return;
    }
    const yaw = bot.entity.yaw;
    const direction = new Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
    for (let i = 0; i < 8; i += 1) {
      const position = bot.entity.position.floored().offset(
        Math.round(direction.x),
        0,
        Math.round(direction.z),
      );
      if (this.hazard(position) || this.hazard(position.offset(0, 1, 0))) {
        await this.safeWander();
        return;
      }
      for (const target of [position, position.offset(0, 1, 0)]) {
        const block = bot.blockAt(target);
        if (!block || block.boundingBox === 'empty') continue;
        await this.collect(block);
        if (match(block)) return;
      }
    }
  }

  private async enterSanctionedMineIfRequired(targetY: number): Promise<void> {
    const disposition = survivalMiningDisposition(targetY, getMinDigY(), getMineSite());
    if (disposition.kind === 'unrestricted') return;
    if (disposition.kind === 'blocked') {
      throw new Error(
        `Deep mining at y=${targetY} is blocked: configure mining.mineSite instead of bypassing the fleet depth floor`,
      );
    }
    const mine = disposition.site;
    const bot = this.botGetter();
    const dx = bot.entity.position.x - mine.x;
    const dz = bot.entity.position.z - mine.z;
    const radius = mine.radius ?? 24;
    if (dx * dx + dz * dz <= radius * radius) return;
    await this.moveNear(new Vec3(mine.x, mine.y, mine.z), Math.max(1, Math.min(4, radius - 1)));
  }

  private async goToY(y: number): Promise<void> {
    const bot = this.botGetter();
    const { goals } = require('mineflayer-pathfinder');
    bot.pathfinder.setGoal(new goals.GoalYLevel(y));
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline && bot.entity && Math.abs(bot.entity.position.y - y) > 3) {
      if (this.hazard(bot.entity.position)) break;
      await this.sleep(500);
    }
    bot.pathfinder.stop();
    if (Math.abs(bot.entity.position.y - y) > 6) {
      throw new Error(`Could not safely reach mining level ${y}`);
    }
  }

  private async collect(block: any): Promise<void> {
    const bot = this.botGetter();
    if (!block?.position || this.hazard(block.position)) {
      throw new Error(`Unsafe resource: ${block?.name ?? 'unknown'}`);
    }
    await this.moveNear(block.position, 3);
    const fresh = bot.blockAt(block.position);
    if (!fresh || fresh.boundingBox === 'empty' || this.hazard(fresh.position)) {
      throw new Error('Resource changed or became unsafe before collection');
    }
    await bot.dig(fresh, true);
    await this.sleep(250);
  }

  private async moveNear(target: Vec3, range = 3): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) throw new Error('Bot is not connected');
    if (this.hazard(target)) throw new Error('Movement target is hazardous');
    if (bot.entity.position.distanceTo(target) <= range) return;
    const { goals } = require('mineflayer-pathfinder');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => finish(new Error('Safe path timeout')), 30_000);
      const reached = () => finish();
      const denied = () => finish(new Error('Movement denied by the configured fleet boundary'));
      const update = (result: any) => {
        if (result?.status === 'noPath') finish(new Error('No safe path to target'));
      };
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        bot.removeListener('goal_reached', reached);
        bot.removeListener('mobility_denied', denied);
        bot.removeListener('path_update', update);
        if (error) reject(error);
        else resolve();
      };
      bot.once('goal_reached', reached);
      bot.once('mobility_denied', denied);
      bot.on('path_update', update);
      try {
        bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, range));
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async safeWander(): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) return;
    for (let i = 0; i < 8; i += 1) {
      const target = bot.entity.position.floored().offset(
        Math.floor((Math.random() - 0.5) * 20),
        0,
        Math.floor((Math.random() - 0.5) * 20),
      );
      const floor = bot.blockAt(target.offset(0, -1, 0));
      const feet = bot.blockAt(target);
      const head = bot.blockAt(target.offset(0, 1, 0));
      if (floor?.boundingBox === 'block'
          && feet?.boundingBox === 'empty'
          && head?.boundingBox === 'empty'
          && !this.hazard(target)) {
        try { await this.moveNear(target, 2); } catch {}
        return;
      }
    }
  }

  private async safeSurface(origin: Vec3): Promise<Vec3> {
    const bot = this.botGetter();
    for (let radius = 0; radius <= 8; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          const target = origin.offset(dx, 0, dz).floored();
          const floor = bot.blockAt(target.offset(0, -1, 0));
          const feet = bot.blockAt(target);
          const head = bot.blockAt(target.offset(0, 1, 0));
          if (floor?.boundingBox === 'block'
              && feet?.boundingBox === 'empty'
              && head?.boundingBox === 'empty'
              && !this.hazard(target)) return target;
        }
      }
    }
    throw new Error('No safe surface nearby');
  }

  private referenceFor(target: Vec3): { block: any; face: Vec3 } | null {
    const candidates: Array<{ offset: Vec3; face: Vec3 }> = [
      { offset: new Vec3(0, -1, 0), face: new Vec3(0, 1, 0) },
      { offset: new Vec3(0, 1, 0), face: new Vec3(0, -1, 0) },
      { offset: new Vec3(1, 0, 0), face: new Vec3(-1, 0, 0) },
      { offset: new Vec3(-1, 0, 0), face: new Vec3(1, 0, 0) },
      { offset: new Vec3(0, 0, 1), face: new Vec3(0, 0, -1) },
      { offset: new Vec3(0, 0, -1), face: new Vec3(0, 0, 1) },
    ];
    for (const candidate of candidates) {
      const block = this.botGetter().blockAt(target.plus(candidate.offset));
      if (block?.boundingBox === 'block' && !this.hazard(block.position)) {
        return { block, face: candidate.face };
      }
    }
    return null;
  }

  private async attack(entity: any): Promise<void> {
    const bot = this.botGetter();
    if (!entity?.position || !bot?.entity || Date.now() - this.lastAttackAt < 500) return;
    this.lastAttackAt = Date.now();
    const weapon = this.get('diamond_sword') ?? this.get('iron_sword')
      ?? this.get('stone_sword') ?? this.get('wooden_sword');
    if (weapon) await bot.equip(weapon, 'hand').catch(() => {});
    await this.moveNear(entity.position, 3).catch(() => {});
    const deadline = Date.now() + 6_000;
    while (entity.isValid !== false && Date.now() < deadline && bot.entity) {
      if (this.hazard(entity.position)) break;
      await this.smoothLook(entity.position, 100);
      if (entity.position.distanceTo(bot.entity.position) <= 4) bot.attack(entity);
      await this.sleep(550);
    }
  }

  private async fightIfNecessary(): Promise<void> {
    const bot = this.botGetter();
    const threat = this.nearestEntity((entity) => HOSTILE_MOBS.has(entity.name)
      && entity.position.distanceTo(bot.entity.position) <= 10);
    if (threat) await this.attack(threat);
  }

  private async eatIfNeeded(): Promise<void> {
    const bot = this.botGetter();
    if (!bot || bot.food >= 12) return;
    const food = this.inventory().find((item) => FOOD.includes(item.name));
    if (!food) return;
    await bot.equip(food, 'hand');
    try { await bot.consume(); } catch {}
  }

  private async smoothLook(target: Vec3, totalMs: number): Promise<void> {
    const bot = this.botGetter();
    if (!bot?.entity) return;
    const eye = bot.entity.position.offset(0, bot.entity.height * 0.9, 0);
    const dx = target.x - eye.x;
    const dy = target.y - eye.y;
    const dz = target.z - eye.z;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
    const startYaw = bot.entity.yaw;
    const startPitch = bot.entity.pitch;
    const steps = Math.max(4, Math.ceil(totalMs / 45));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const eased = progress * progress * (3 - 2 * progress);
      await bot.look(
        startYaw + normalizeAngle(yaw - startYaw) * eased,
        startPitch + (pitch - startPitch) * eased,
        false,
      );
      await this.sleep(Math.max(15, Math.floor(totalMs / steps)));
    }
  }

  private findBlock(match: (block: any) => boolean, maxDistance: number): any | null {
    try {
      return this.botGetter()?.findBlock({ matching: match, maxDistance, count: 1 }) ?? null;
    } catch {
      return null;
    }
  }

  private nearestEntity(match: (entity: any) => boolean): any | null {
    try {
      return this.botGetter()?.nearestEntity((entity: any) => entity?.position && match(entity)) ?? null;
    } catch {
      return null;
    }
  }

  private hazard(position: Vec3): boolean {
    const bot = this.botGetter();
    if (!bot) return true;
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 2; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const block = bot.blockAt(position.offset(x, y, z));
          if (block && HAZARDS.has(block.name)) return true;
        }
      }
    }
    return false;
  }

  private inventory(): InventoryLike[] {
    return this.botGetter()?.inventory?.items?.() ?? [];
  }

  private get(name: string): InventoryLike | null {
    return this.inventory().find((item) => item.name === name) ?? null;
  }

  private count(name: string): number {
    return this.inventory()
      .filter((item) => item.name === name)
      .reduce((total, item) => total + item.count, 0);
  }

  private countAny(names: readonly string[]): number {
    return names.reduce((total, name) => total + this.count(name), 0);
  }

  private has(name: string): boolean {
    return this.count(name) > 0;
  }

  private unique(points: Vec3[]): Vec3[] {
    const seen = new Set<string>();
    return points.filter((point) => {
      const key = `${point.x},${point.y},${point.z}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private stopMovement(): void {
    const bot = this.botGetter();
    try {
      bot?.pathfinder?.stop();
      bot?.clearControlStates?.();
    } catch {}
  }

  private advance(stage: SurvivalStage): void {
    this.saved.stage = stage;
    this.saved.updatedAt = Date.now();
    this.persist();
  }

  private detail(value: string): void {
    if (value === this.lastStatus) return;
    this.lastStatus = value;
    this.saved.updatedAt = Date.now();
  }

  private finish(): void {
    this.saved.stage = 'complete';
    this.running = false;
    this.saved.updatedAt = Date.now();
    this.detail('Mission complete: Nether portal built and lit');
    this.stopMovement();
    this.persist();
    this.resumeVoyager();
  }

  private load(): SavedMission {
    const now = Date.now();
    const fresh: SavedMission = {
      schema: 1,
      stage: 'wood',
      paused: false,
      deaths: 0,
      setsMade: 0,
      diamondPeak: 0,
      goldPeak: 0,
      startedAt: now,
      updatedAt: now,
    };
    try {
      const value = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<SavedMission>;
      if (value.schema !== 1 || !SURVIVAL_STAGES.includes(value.stage as SurvivalStage)) return fresh;
      return {
        ...fresh,
        ...value,
        schema: 1,
        stage: value.stage as SurvivalStage,
        paused: value.paused === true,
      };
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        logger.warn({ bot: this.name, err: err?.message }, 'Could not load survival mission progress');
      }
      return fresh;
    }
  }

  private persist(): void {
    try {
      atomicWriteJsonSync(this.file, this.saved);
    } catch (err: any) {
      logger.warn({ bot: this.name, err: err?.message }, 'Could not persist survival mission progress');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function normalizeAngle(value: number): number {
  let normalized = value;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}
