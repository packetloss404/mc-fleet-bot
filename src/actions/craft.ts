import { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import { ActionResult } from './types';

function inventorySummary(bot: Bot): string {
  return bot.inventory.items().map((item) => `${item.name}x${item.count}`).join(', ') || 'empty';
}

async function moveToCraftingTable(bot: Bot, craftingTable: any): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      bot.removeListener('goal_reached', onReached as any);
      bot.removeListener('path_update' as any, onPathUpdate);
      if (!result) bot.pathfinder.stop();
      resolve(result);
    };

    const GoalLookAtBlock = (goals as any).GoalLookAtBlock;
    const goal = GoalLookAtBlock
      ? new GoalLookAtBlock(craftingTable.position, bot.world)
      : new goals.GoalNear(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 3);

    bot.pathfinder.setGoal(goal);

    const onReached = () => done(true);
    const onPathUpdate = (r: any) => {
      if (r?.status === 'noPath') done(false);
    };

    const timeout = setTimeout(() => done(false), 15000);

    bot.once('goal_reached' as any, onReached);
    bot.on('path_update' as any, onPathUpdate);
  });
}

export async function craft(bot: Bot, itemName: string, count = 1): Promise<ActionResult> {
  if (typeof itemName !== 'string') {
    return { success: false, message: 'name for craftItem must be a string' };
  }
  if (typeof count !== 'number') {
    return { success: false, message: 'count for craftItem must be a number' };
  }

  const mcData = require('minecraft-data')(bot.version);
  const item = mcData.itemsByName[itemName];
  if (!item) {
    return { success: false, message: `No item named ${itemName}` };
  }

  const craftingTable = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32,
  });

  if (craftingTable) {
    const moved = await moveToCraftingTable(bot, craftingTable);
    if (!moved) {
      return { success: false, message: `Found crafting table for ${itemName} but could not reach it` };
    }
  }

  const recipe = bot.recipesFor(item.id, null, 1, craftingTable || null)[0];
  if (!recipe) {
    // Without a table in range, recipesFor only returns 2x2 recipes — so for
    // any table-craft this failed with "No recipe found", inviting the LLM to
    // abandon a perfectly craftable item instead of finding/placing a table
    // (2026-08 audit). Say what's actually missing.
    if (!craftingTable) {
      return {
        success: false,
        message:
          `Cannot craft ${itemName} here: no crafting table within range, and no 2x2 recipe matches your materials. ` +
          `If ${itemName} needs a crafting table, place one nearby (or move to one) and retry. Inventory: ${inventorySummary(bot)}`,
      };
    }
    return {
      success: false,
      message: `No recipe found for ${itemName} with your current materials. Inventory: ${inventorySummary(bot)}`,
    };
  }

  try {
    await bot.craft(recipe, count, craftingTable || undefined);
    return {
      success: true,
      message: `Crafted ${count} ${itemName}. Inventory: ${inventorySummary(bot)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Craft failed for ${itemName}: ${err.message}. Inventory: ${inventorySummary(bot)}`,
    };
  }
}
