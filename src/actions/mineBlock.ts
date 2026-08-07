import { Bot } from 'mineflayer';
import { ActionResult } from './types';
import { moveNearWithCleanup } from './moveHelper';
import { isProtected, getMineSite, shouldRouteToMine, isBelowDigFloor, getMinDigY } from './geofence';

const PICKAXE_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const AXE_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const SHOVEL_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];

/**
 * Block families worth trekking to the communal mine for when none are minable
 * locally: the stone/deepslate family and ores. Deliberately NOT wood, dirt,
 * sand or crops — the mine has none of those, so routing there for them would
 * replace a useless local search with a useless trek.
 */
const MINE_SOURCED = /(stone|cobble|deepslate|andesite|diorite|granite|tuff|_ore$)/;

function pickBestTool(bot: Bot, suffix: string, tiers: string[]): any | null {
  const items = bot.inventory.items();
  for (const tier of tiers) {
    const hit = items.find((i) => i.name === `${tier}_${suffix}`);
    if (hit) return hit;
  }
  return null;
}

/**
 * Choose the best tool for the target block. Returns the inventory item to
 * equip, or null if no specialized tool helps (in which case bare hands work).
 */
function selectToolFor(bot: Bot, blockName: string): any | null {
  if (blockName.endsWith('_log') || blockName.endsWith('_wood') || blockName.endsWith('_planks')) {
    return pickBestTool(bot, 'axe', AXE_TIERS);
  }
  if (blockName === 'dirt' || blockName === 'grass_block' || blockName === 'sand' || blockName === 'gravel' || blockName === 'clay') {
    return pickBestTool(bot, 'shovel', SHOVEL_TIERS);
  }
  // Everything stone-like uses a pickaxe.
  return pickBestTool(bot, 'pickaxe', PICKAXE_TIERS);
}

/** Scan outcome: either blocks to dig, or a refusal — and whether relocating
 * to the communal mine could plausibly turn that refusal into targets. */
interface ScanOutcome {
  targets?: any[];
  refusal?: ActionResult;
  mineMayHelp?: boolean;
}

export async function mineBlock(bot: Bot, blockType: string, count = 1): Promise<ActionResult> {
  if (typeof blockType !== 'string') {
    return { success: false, message: 'mineBlock requires blockType to be a string' };
  }
  if (typeof count !== 'number') {
    return { success: false, message: 'mineBlock requires count to be a number' };
  }

  const mcData = require('minecraft-data')(bot.version);
  const blockInfo = mcData.blocksByName[blockType];
  if (!blockInfo) {
    return { success: false, message: `Unknown block type: ${blockType}` };
  }

  const mineSite = getMineSite();
  const withinMine = (): boolean => {
    if (!mineSite) return false;
    const radius = mineSite.radius ?? 24;
    const dx = bot.entity.position.x - mineSite.x;
    const dz = bot.entity.position.z - mineSite.z;
    return dx * dx + dz * dz <= radius * radius;
  };
  const travelToMine = async (): Promise<ActionResult | null> => {
    const radius = mineSite!.radius ?? 24;
    const reached = await moveNearWithCleanup(
      bot,
      { x: mineSite!.x, y: mineSite!.y, z: mineSite!.z, range: Math.min(radius, 6) },
      60000,
    );
    if (reached) return null;
    return {
      success: false,
      message: `Could not reach the communal mine at ${mineSite!.x},${mineSite!.y},${mineSite!.z} to gather ${blockType}`,
      data: { mined: 0 },
    };
  };

  // Communal-mine routing: ROUTED block types (ores) must be gathered at the
  // designated mine site, never dug out of town. Walk there before scanning so
  // findBlocks sees mine terrain rather than whatever the bot is standing in
  // (a road, a house...).
  if (mineSite && shouldRouteToMine(blockType) && !withinMine()) {
    const failed = await travelToMine();
    if (failed) return failed;
  }

  const scan = (): ScanOutcome => {
    const positions = bot.findBlocks({
      matching: [blockInfo.id],
      maxDistance: 32,
      count: Math.max(count * 4, 16), // overscan so we still have candidates after the safety filter
    });

    if (positions.length === 0) {
      return {
        refusal: {
          success: false,
          message: `No ${blockType} nearby, please explore first`,
          data: { mined: 0 },
        },
        mineMayHelp: MINE_SOURCED.test(blockType),
      };
    }

    // Vertical safety filter: never mine the block directly supporting the bot's feet.
    // Otherwise the bot can dig itself into a 1-block hole and free-fall into whatever
    // is below. Allow blocks further down (deliberate downward mining is fine, just not
    // the single block under our boots).
    const botPos = bot.entity.position;
    const supportY = Math.floor(botPos.y) - 1;
    const supportX = Math.floor(botPos.x);
    const supportZ = Math.floor(botPos.z);
    const safePositions = positions.filter((pos: any) => {
      return !(
        Math.floor(pos.y) === supportY &&
        Math.floor(pos.x) === supportX &&
        Math.floor(pos.z) === supportZ
      );
    });

    if (safePositions.length === 0) {
      return {
        refusal: {
          success: false,
          message: `${blockType} only exists directly under the bot — refusing to dig the support block (would drop the bot)`,
          data: { mined: 0 },
        },
        mineMayHelp: false,
      };
    }

    // Geofence: never dig a block inside a protected build zone (roads, houses, the
    // town hall, plazas). This is what stops bots tunnelling through structures —
    // even when a matching block inside a build happens to be the closest one.
    const fencedPositions = safePositions.filter(
      (pos: any) => !isProtected(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)),
    );

    // Dig-depth floor: refuse to tunnel below the configured Y outside the
    // communal mine. Checked separately from protected zones so the failure
    // message tells the bot WHY, and so the two can be tuned independently.
    const aboveFloor = fencedPositions.filter(
      (pos: any) => !isBelowDigFloor(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)),
    );
    if (fencedPositions.length > 0 && aboveFloor.length === 0) {
      return {
        refusal: {
          success: false,
          message:
            `All nearby ${blockType} is below the dig-depth floor (y=${getMinDigY()}) — refusing to tunnel underground. ` +
            (mineSite
              ? `Travel to the communal mine at ${mineSite.x},${mineSite.y},${mineSite.z} to dig deep, or find ${blockType} at the surface.`
              : `Find ${blockType} at or above the surface instead of digging down.`),
          data: { mined: 0 },
        },
        mineMayHelp: true,
      };
    }

    if (fencedPositions.length === 0) {
      return {
        refusal: {
          success: false,
          message: `All nearby ${blockType} is inside a protected build zone — refusing to dig into town structures. Travel to the communal mine to gather ${blockType}.`,
          data: { mined: 0 },
        },
        mineMayHelp: true,
      };
    }

    // aboveFloor, not fencedPositions — otherwise the depth floor is computed
    // and then ignored when picking what to actually dig.
    const targets = aboveFloor
      .slice(0, count)
      .map((pos: any) => bot.blockAt(pos))
      .filter((block: any) => block);

    if (targets.length === 0) {
      return {
        refusal: {
          success: false,
          message: `Found ${blockType} positions but could not resolve blocks`,
          data: { mined: 0 },
        },
        mineMayHelp: false,
      };
    }

    return { targets };
  };

  // Local-first, mine-as-fallback. Bulk materials (stone, cobblestone, ...)
  // are deliberately NOT in routeToMineBlocks so build crews gather them
  // locally — but a bot standing in town gets the all-protected refusal, whose
  // message says "travel to the communal mine" while nothing in the code ever
  // walked there. That dead end fed the 2026-07/08 stone-supply loop: the same
  // task failed identically every minute for two weeks. If the local area
  // cannot supply the block and a mine site exists, relocate there once and
  // rescan before giving up.
  let outcome = scan();
  if (outcome.refusal && outcome.mineMayHelp && mineSite && !withinMine()) {
    const failed = await travelToMine();
    if (failed) return failed;
    outcome = scan();
  }
  if (outcome.refusal) return outcome.refusal;
  const targets = outcome.targets!;

  // Equip the best available tool for this block type. Bare-handed mining is
  // slow and silently fails on most blocks (no drop), so always try to upgrade.
  const tool = selectToolFor(bot, blockType);
  if (tool) {
    try {
      await bot.equip(tool, 'hand');
    } catch {
      // Non-fatal: equip can race with other actions. Continue with whatever's held.
    }
  }

  try {
    await (bot as any).collectBlock.collect(targets, {
      ignoreNoPath: true,
    });
    return {
      success: true,
      message: `Mined up to ${count} ${blockType}`,
      data: { mined: count },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Mining error for ${blockType}: ${err.message}`,
      data: { mined: 0 },
    };
  }
}
