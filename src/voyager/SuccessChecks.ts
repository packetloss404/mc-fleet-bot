import { ExecutionResult } from './CodeExecutor';
import { Task } from './CurriculumAgent';
import { TaskGuidance, buildTaskGuidance } from './TaskGuidance';
import { BotSnapshot, CriticResult } from './CriticAgent';
import { inferTaskSpec } from './TaskSpec';

export interface TaskGoal {
  count: number;
  item?: string;
  targetEntity?: string;
  targetBlock?: string;
}

interface SuccessCheckContext {
  task: Task;
  guidance: TaskGuidance;
  goal: TaskGoal;
  executionResult: ExecutionResult;
  preState: BotSnapshot;
  postState: BotSnapshot;
}

type SuccessCheck = (context: SuccessCheckContext) => CriticResult | null;

/**
 * Block → actual dropped item, for the mining families where they differ.
 * Exact-token matching alone can't bridge these (stone drops cobblestone,
 * ores drop raw_* items).
 */
const DROP_ALIASES: Record<string, string[]> = {
  stone: ['cobblestone'],
  deepslate: ['cobbled_deepslate'],
  iron_ore: ['raw_iron'],
  deepslate_iron_ore: ['raw_iron'],
  copper_ore: ['raw_copper'],
  deepslate_copper_ore: ['raw_copper'],
  gold_ore: ['raw_gold'],
  deepslate_gold_ore: ['raw_gold'],
  grass_block: ['dirt'],
};

/** Crafted-gear suffixes that must never count toward a raw-material goal. */
const GEAR_SUFFIXES = ['sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots', 'bricks', 'stairs', 'slab', 'wall'];

/**
 * Sum of positive inventory deltas for items RELATED to the goal item:
 * exact name, a known drop alias, or a shared EXACT underscore-token
 * ("oak" links oak_log/oak_planks; "iron" links iron_ore/raw_iron). Plain
 * substring matching is deliberately avoided — "redstone".includes("stone")
 * credited redstone dust to a stone supply run (2026-08 review).
 */
function gainedRelatedTo(goalItem: string, pre: Record<string, number>, post: Record<string, number>): number {
  const goalTokens = new Set(goalItem.split('_').filter((t) => t.length >= 3));
  const aliases = new Set(DROP_ALIASES[goalItem] ?? []);
  let gained = 0;
  for (const [name, count] of Object.entries(post)) {
    const delta = count - (pre[name] || 0);
    if (delta <= 0) continue;
    const nameTokens = name.split('_');
    const isGear = GEAR_SUFFIXES.includes(nameTokens[nameTokens.length - 1]) && name !== goalItem;
    const related =
      name === goalItem ||
      aliases.has(name) ||
      (!isGear && nameTokens.some((n) => goalTokens.has(n)));
    if (related) gained += delta;
  }
  return gained;
}

/**
 * Item-name patterns for the four core town resources — what actually lands
 * in inventory when a bot gathers each one. Mirrors RESOURCE_KEYWORDS in
 * src/town/resourceThresholds.ts (kept local so the voyager verdict layer
 * doesn't import town internals).
 */
const SUPPLY_RESOURCE_PATTERNS: Record<string, RegExp> = {
  wood: /(_log$|_planks$|_wood$|^stripped_)/,
  stone: /(^stone$|^cobblestone$|^andesite$|^granite$|^diorite$|^tuff$|^cobbled_deepslate$)/,
  food: /(bread|wheat|carrot|potato|beetroot|melon|apple|mutton|beef|chicken|cooked|porkchop|fish|cod|salmon|berries)/,
  iron: /(^iron_ingot$|^iron_ore$|^raw_iron$)/,
};

/** The resource word of a town supply run, or a bare-resource collect task. */
function supplyResourceFor(description: string, goalItem?: string): string | null {
  const m = description.toLowerCase().match(/needs\s+\d+\s+more\s+(wood|stone|food|iron)\b/);
  if (m) return m[1];
  if (goalItem && SUPPLY_RESOURCE_PATTERNS[goalItem]) return goalItem;
  return null;
}

const checkHarvest: SuccessCheck = ({ goal, task, preState, postState }) => {
  // Town supply runs FIRST — their goal.item is garbage. inferTarget takes
  // the last two non-stopword words of the description, and supply
  // descriptions end in a locale hint ("...down in the rock." → "in_rock"),
  // so token matching against goal.item hard-failed perfectly executed
  // supply runs (2026-08 review). Judge them by what the resource actually
  // yields in inventory instead.
  const resource = supplyResourceFor(task.description, goal.item);
  if (resource) {
    const pattern = SUPPLY_RESOURCE_PATTERNS[resource];
    let gained = 0;
    for (const [name, count] of Object.entries(postState.inventory)) {
      const delta = count - (preState.inventory[name] || 0);
      if (delta > 0 && pattern.test(name)) gained += delta;
    }
    if (gained > 0) {
      return { success: true, reason: `Collected ${gained} ${resource}-type items for the town`, critique: '' };
    }
    return {
      success: false,
      reason: `Inventory gained no ${resource}-type items`,
      critique: `The bot did not collect any ${resource}. Use mineBlock(...) on the right block family and keep the items in inventory.`,
    };
  }
  if (goal.item) {
    const gained = gainedRelatedTo(goal.item, preState.inventory, postState.inventory);
    if (gained >= goal.count) {
      return { success: true, reason: `Collected ${gained} ${goal.item}-related items`, critique: '' };
    }
    if (gained > 0) {
      return { success: true, reason: `Collected ${gained} ${goal.item}-related items (short of ${goal.count})`, critique: '' };
    }
    // Zero related gain: fail only when NOTHING was gained at all. When
    // unrelated items were gained the target extraction may simply be wrong
    // (inferTarget is heuristic) — return null so the LLM critic decides
    // instead of hard-failing a possibly-correct run.
    if (postState.itemCount > preState.itemCount) {
      return null;
    }
    return {
      success: false,
      reason: `Inventory gained no ${goal.item}-related items`,
      critique: `The bot did not collect ${goal.item}. Use mineBlock(...) and verify the exact target block/item name.`,
    };
  }
  // Unknown target: item gain is the only signal available.
  const itemsGained = postState.itemCount > preState.itemCount;
  if (itemsGained) {
    return { success: true, reason: 'Inventory gained items after harvest action', critique: '' };
  }
  return {
    success: false,
    reason: 'Inventory did not gain the expected items',
    critique: 'The bot did not collect anything. Use mineBlock(...) and verify the exact target block/item name.',
  };
};

const checkCraft: SuccessCheck = ({ goal, task, preState, postState, guidance }) => {
  const targetDelta = goal.item ? (postState.inventory[goal.item] || 0) - (preState.inventory[goal.item] || 0) : 0;
  if (goal.item && targetDelta >= goal.count) {
    return { success: true, reason: `Crafted ${goal.count} ${goal.item}`, critique: '' };
  }
  // For craft tasks, only succeed if the target item actually appeared in inventory
  // Don't count inventory changes from dropping/tossing items as success
  if (goal.item && targetDelta > 0) {
    return { success: true, reason: `Crafted ${targetDelta} ${goal.item} (less than target ${goal.count})`, critique: '' };
  }
  return {
    success: false,
    reason: goal.item ? `${goal.item} was not crafted (delta: ${targetDelta})` : 'Inventory did not change - nothing was crafted',
    critique: `The craft task did not produce the expected result. Follow the task guidance: ${guidance.guidance.join(' ')}`,
  };
};

const checkSmelt: SuccessCheck = ({ goal, preState, postState, guidance }) => {
  const targetDelta = goal.item ? (postState.inventory[goal.item] || 0) - (preState.inventory[goal.item] || 0) : 0;
  if (goal.item && targetDelta >= goal.count) {
    return { success: true, reason: `Smelted ${goal.count} ${goal.item}`, critique: '' };
  }
  return {
    success: false,
    reason: 'Expected smelted output did not appear in inventory',
    critique: `The furnace workflow did not complete. ${guidance.guidance.join(' ')}`,
  };
};

const checkMovement: SuccessCheck = ({ task, preState, postState }) => {
  const distanceMoved = preState.position.distanceTo(postState.position);
  const movedEnough = distanceMoved > 2;
  if (task.keywords.includes('farm') || task.description.toLowerCase().includes('farmland')) {
    const farmlandNearby = postState.nearbyBlocks.includes('farmland');
    if (movedEnough && farmlandNearby) {
      return { success: true, reason: `Reached area near farmland after moving ${distanceMoved.toFixed(1)} blocks`, critique: '' };
    }
  }
  // Tasks that state a distance ("Explore 50 blocks north") must cover most
  // of it — the flat >2 threshold passed them at 2.1 blocks in any direction
  // (2026-08 audit). Tasks that state a destination must end near it.
  // Straight-line displacement is the wrong yardstick for exploration —
  // exploreUntil wanders and loops back, so a genuine 50-block exploration
  // can end 20 blocks from its start. Only hold direct travel to the stated
  // distance (2026-08 review).
  const isExploration = /\bexplor/i.test(task.description);
  const distMatch = task.description.toLowerCase().match(/(\d+)\s*blocks?/);
  if (distMatch && !isExploration) {
    const required = Number(distMatch[1]);
    if (required > 2 && distanceMoved < required * 0.8) {
      return {
        success: false,
        reason: `Bot moved ${distanceMoved.toFixed(1)} blocks of the required ~${required}`,
        critique: `The task requires roughly ${required} blocks of travel; the bot covered ${distanceMoved.toFixed(1)}. Continue with moveTo(...)/exploreUntil(...).`,
      };
    }
  }
  // Only trust full (x, y, z) triples: a 2-number match is ambiguous ("go to
  // 100, 64" could be x,z or x,y) and guessing wrong false-fails the task.
  const coordMatch = task.description.match(/\(?(-?\d+),\s*(-?\d+),\s*(-?\d+)\)?/);
  if (coordMatch && /\b(go to|walk to|travel to|reach|near)\b/i.test(task.description)) {
    const tx = Number(coordMatch[1]);
    const tz = Number(coordMatch[3]);
    const dx = postState.position.x - tx;
    const dz = postState.position.z - tz;
    const remaining = Math.sqrt(dx * dx + dz * dz);
    if (remaining > 16) {
      return {
        success: false,
        reason: `Bot ended ${remaining.toFixed(0)} blocks from the stated destination (${tx}, ${tz})`,
        critique: `The bot is still ${remaining.toFixed(0)} blocks from (${tx}, ${tz}). Use moveTo(${tx}, <y>, ${tz}).`,
      };
    }
  }
  if (movedEnough) {
    return { success: true, reason: `Bot moved ${distanceMoved.toFixed(1)} blocks`, critique: '' };
  }
  return {
    success: false,
    reason: 'Bot did not move significantly',
    critique: 'The bot did not move enough. Use moveTo(...) for direct targets or exploreUntil(...) when the destination is not visible.',
  };
};

const checkCombat: SuccessCheck = ({ goal, preState, postState }) => {
  const targetGone = goal.targetEntity
    ? preState.nearbyEntities.some((name) => name.toLowerCase().includes(goal.targetEntity!)) &&
      !postState.nearbyEntities.some((name) => name.toLowerCase().includes(goal.targetEntity!))
    : false;
  if (targetGone) {
    return { success: true, reason: `${goal.targetEntity} is no longer nearby`, critique: '' };
  }
  if (postState.health < preState.health || preState.itemCount !== postState.itemCount) {
    return { success: true, reason: 'Combat activity was observed', critique: '' };
  }
  return null;
};

const checkChat: SuccessCheck = ({ executionResult }) => {
  if (executionResult.output.includes('[chat]')) {
    return { success: true, reason: 'Chat message sent', critique: '' };
  }
  return {
    success: false,
    reason: 'No chat message was sent',
    critique: 'The bot did not speak. Use bot.chat() when the task explicitly requires talking.',
  };
};

const checksByCategory: Record<string, SuccessCheck[]> = {
  harvest: [checkHarvest],
  chat: [checkChat],
  // Supply-run tasks ("town needs 16 more stone") are collect-into-inventory,
  // the same success shape as harvest. With no entry here every supply verdict
  // fell through to checkCombat (which can false-pass on any inventory change)
  // and then to a paid LLM critic call — thousands per day during a shortage.
  // An inventory diff answers it for free and cannot fail open.
  gather: [checkHarvest],
  craft: [checkCraft],
  smelt: [checkSmelt],
  movement: [checkMovement],
  combat: [checkCombat],
  general: [],
};

export function runSuccessChecks(task: Task, executionResult: ExecutionResult, preState: BotSnapshot, postState: BotSnapshot): CriticResult | null {
  const guidance = buildTaskGuidance(task);
  const spec = inferTaskSpec(task);
  const context: SuccessCheckContext = {
    task,
    guidance,
    goal: {
      count: spec.count || 1,
      item: spec.target,
      targetEntity: spec.kind === 'combat' ? spec.target : undefined,
      targetBlock: spec.kind === 'movement' || spec.kind === 'harvest' ? spec.target : undefined,
    },
    executionResult,
    preState,
    postState,
  };

  // checkCombat used to be appended to EVERY category here. For categories
  // with no entry of their own (general, survival) it was therefore the sole
  // verdict — and it passes on any health drop or item-count change, so a
  // starving bot "succeeded" at "find food immediately" by taking starvation
  // damage, and the no-op code got saved as a skill (2026-08 audit). Combat
  // evidence is now only a verdict for combat tasks.
  const allChecks = checksByCategory[guidance.category] || [];
  for (const check of allChecks) {
    const result = check(context);
    if (result) return result;
  }
  return null;
}

export function extractTaskGoal(description: string): TaskGoal {
  const lower = description.toLowerCase();
  const countMatch = lower.match(/\b(\d+)\b/);
  const count = countMatch ? Number(countMatch[1]) : 1;
  const normalized = lower.replace(/[^a-z0-9_\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);
  const stop = new Set(['mine', 'collect', 'chop', 'gather', 'craft', 'smelt', 'walk', 'go', 'to', 'the', 'nearest', 'find', 'explore', 'and', 'a', 'an', 'by', 'with', 'use', 'attack', 'fight', 'kill', 'report', 'player']);
  const candidates = words.filter((word) => !stop.has(word) && !/^\d+$/.test(word));
  const item = candidates.length > 0 ? candidates.slice(-2).join('_') : undefined;
  const targetEntity = (lower.match(/kill\s+(?:a|an|the)?\s*([a-z_]+)/) || lower.match(/attack\s+(?:a|an|the)?\s*([a-z_]+)/) || lower.match(/fight\s+(?:a|an|the)?\s*([a-z_]+)/))?.[1];
  const targetBlock = (lower.match(/farmland|water|crafting table|furnace|oak log|iron ore|coal ore|wheat seeds|cobblestone/) || [])[0]?.replace(/\s+/g, '_');
  return { count, item, targetEntity, targetBlock };
}
