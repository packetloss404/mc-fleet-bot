async function craftWoodenShovel(bot) {
  const WOODEN_SHOVEL_NAME = 'wooden_shovel';
  const CRAFTING_TABLE_NAME = 'crafting_table';
  const OAK_PLANK_NAME = 'oak_planks';
  const STICK_NAME = 'stick';

  // Check if we already have a wooden shovel
  const hasShovel = bot.inventory.items().find(item => item.name === WOODEN_SHOVEL_NAME);
  if (hasShovel) {
    return; // Already have a wooden shovel, task complete
  }

  // Ensure we have a crafting table
  let craftingTableInInventory = bot.inventory.items().find(item => item.name === CRAFTING_TABLE_NAME);
  if (!craftingTableInInventory) {
    // If no crafting table in inventory, craft one. Requires 4 oak_planks.
    await obtainOakPlanks(bot); // Ensure we have enough planks for crafting table
    await craftItem(CRAFTING_TABLE_NAME, 1);
    craftingTableInInventory = bot.inventory.items().find(item => item.name === CRAFTING_TABLE_NAME);
    if (!craftingTableInInventory) {
      // Failed to craft crafting table
      return;
    }
  }

  // Place crafting table if not already placed or if we just crafted one
  let craftingTableBlock = bot.findBlock({
    matching: b => b.name === CRAFTING_TABLE_NAME,
    maxDistance: 32
  });
  if (!craftingTableBlock) {
    // Find a suitable position to place the crafting table
    const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
    if (!refBlock || refBlock.name === 'air' || refBlock.name === 'water' || refBlock.name === 'lava') {
      // Cannot place on air/water/lava, try a different spot or give up
      // For simplicity, we assume there's solid ground around.
      // A more robust solution would pathfind to a safe placement spot.
      return;
    }
    const x = Math.floor(bot.entity.position.x);
    const y = Math.floor(bot.entity.position.y);
    const z = Math.floor(bot.entity.position.z);

    // Try to place it in front of the bot
    await placeItem(CRAFTING_TABLE_NAME, x + 1, y, z);
    craftingTableBlock = bot.findBlock({
      matching: b => b.name === CRAFTING_TABLE_NAME,
      maxDistance: 32
    });
    if (!craftingTableBlock) {
      // If still no crafting table block after placing, something went wrong
      return;
    }
  }

  // Check for required materials: 1 stick, 1 oak plank
  const currentSticks = bot.inventory.items().find(item => item.name === STICK_NAME)?.count || 0;
  if (currentSticks < 1) {
    // Need to craft sticks. 2 oak planks -> 4 sticks. So 1 oak plank -> 2 sticks.
    const currentPlanks = bot.inventory.items().find(item => item.name === OAK_PLANK_NAME)?.count || 0;
    if (currentPlanks < 1) {
      await obtainOakPlanks(bot); // Ensure we have at least 1 plank
    }
    await craftItem(STICK_NAME, 2); // Craft 2 sticks from 1 plank
  }
  const currentPlanks = bot.inventory.items().find(item => item.name === OAK_PLANK_NAME)?.count || 0;
  if (currentPlanks < 1) {
    await obtainOakPlanks(bot); // Ensure we have at least 1 plank
  }

  // Finally, craft the wooden shovel
  await craftItem(WOODEN_SHOVEL_NAME, 1);
}