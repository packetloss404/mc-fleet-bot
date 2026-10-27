import { Bot } from 'mineflayer';
import { ActionResult } from './types';
import { moveNearWithCleanup } from './moveHelper';
import { isProtected, getMineSite, shouldRouteToMine, isBelowDigFloor, getMinDigY } from './geofence';

const PICKAXE_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const AXE_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const SHOVEL_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const MAX_MINE_COUNT = 32;
const MAX_SCAN_RESULTS = 128;
const MINE_PATH_SEARCH_RADIUS = 16;
const MINE_PATH_THINK_TIMEOUT_MS = 2_000;
const ADJACENT_FACES = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
] as const;

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
  if (!Number.isInteger(count) || !Number.isFinite(count) || count < 1 || count > MAX_MINE_COUNT) {
    return {
      success: false,
      message: `mineBlock count must be an integer between 1 and ${MAX_MINE_COUNT}`,
    };
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
      // Bound generated-code input before it reaches Mineflayer. findBlocks
      // finishes the current section layer before honoring `count`, but an
      // unbounded requested count still makes a bad task needlessly retain a
      // large position array.
      count: Math.min(Math.max(count * 4, 16), MAX_SCAN_RESULTS),
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

    // Only hand exposed faces to collectblock. Passing an arbitrary stone from
    // inside a solid wall gives GoalLookAtBlock no reachable stance; its A*
    // search was the common precursor to Mason's repeated 768 MB worker OOMs.
    // `null` means an unloaded neighbour, not open air, and is denied.
    const exposedPositions = aboveFloor.filter((pos: any) => ADJACENT_FACES.some(([dx, dy, dz]) => {
      const neighbour = bot.blockAt(pos.offset
        ? pos.offset(dx, dy, dz)
        : { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz });
      return neighbour != null && (
        neighbour.boundingBox === 'empty'
        || neighbour.name === 'air'
        || neighbour.name === 'cave_air'
        || neighbour.name === 'void_air'
      );
    }));

    if (aboveFloor.length > 0 && exposedPositions.length === 0) {
      return {
        refusal: {
          success: false,
          message: `Nearby ${blockType} has no exposed face — refusing an unbounded path search into solid terrain`,
          data: { mined: 0 },
        },
        mineMayHelp: MINE_SOURCED.test(blockType),
      };
    }

    // exposedPositions, not fencedPositions — otherwise the depth and exposed
    // face safety filters are computed and then ignored when picking targets.
    const targets = exposedPositions
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

  const invCountBefore = bot.inventory.items().reduce((sum: number, i: any) => sum + i.count, 0);
  // collectblock delegates each target to mineflayer-pathfinder. The global
  // detour allowance (96) is appropriate for long civic routes but far too
  // large for a target that is at most 32 blocks away: one unreachable face
  // can retain hundreds of MB of A* nodes before the 5s think timeout. Clamp
  // both budgets for this action and restore them even when collection fails.
  const pathfinder = (bot as any).pathfinder;
  const previousSearchRadius = pathfinder?.searchRadius;
  const previousThinkTimeout = pathfinder?.thinkTimeout;
  if (pathfinder) {
    pathfinder.searchRadius = previousSearchRadius < 0
      ? MINE_PATH_SEARCH_RADIUS
      : Math.min(previousSearchRadius ?? MINE_PATH_SEARCH_RADIUS, MINE_PATH_SEARCH_RADIUS);
    pathfinder.thinkTimeout = Math.min(
      previousThinkTimeout ?? MINE_PATH_THINK_TIMEOUT_MS,
      MINE_PATH_THINK_TIMEOUT_MS,
    );
  }
  try {
    await (bot as any).collectBlock.collect(targets);
    // Report what was actually collected, not what was requested —
    // ignoreNoPath skips unreachable targets silently, and `mined: count`
    // was pure optimism (2026-08 audit).
    const gained = Math.max(
      0,
      bot.inventory.items().reduce((sum: number, i: any) => sum + i.count, 0) - invCountBefore,
    );
    return {
      success: true,
      message: `Mined ${blockType}: targeted ${targets.length}, inventory gained ${gained} items`,
      data: { mined: gained },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Mining error for ${blockType}: ${err.message}`,
      data: { mined: 0 },
    };
  } finally {
    if (pathfinder) {
      pathfinder.searchRadius = previousSearchRadius;
      pathfinder.thinkTimeout = previousThinkTimeout;
    }
  }
}
