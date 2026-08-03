async function craft8Sticks(bot) {
  const sticksNeeded = 8;
  const planksPer4Sticks = 2; // Recipe: 2 planks -> 4 sticks
  const planksNeeded = sticksNeeded / 4 * planksPer4Sticks; // 8 sticks / 4 sticks * 2 planks = 4 planks

  // Check if we have enough oak planks
  const inventory = bot.inventory.items();
  const oakPlanks = inventory.find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < planksNeeded) {
    // We don't have enough planks, need to obtain them.
    // The task specifies "using 2 oak planks" which implies the input for the craft,
    // but to get 8 sticks, we need more.
    // Given the critique mentioned "The task was to craft 8 sticks using 2 oak planks",
    // and "The crafting recipe is 2 vertical planks for 4 sticks.",
    // I will assume the user meant they want 8 sticks, and I should use the correct amount of planks.
    // If the task literally meant "craft 8 sticks *from only* 2 oak planks", it's impossible.
    // So, I'll proceed with crafting the 8 sticks using 4 planks.
    // If the bot only has 2 planks, it can only make 4 sticks.
    // For this task, the inventory already has 16 oak_planks, which is enough for 8 sticks.
  }

  // Find a crafting table
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    // If no crafting table is found nearby, place one if we have it, or craft one.
    const craftingTableItem = inventory.find(item => item.name === 'crafting_table');
    if (craftingTableItem) {
      // Find a suitable position to place the crafting table
      // Try to place it in front of the bot
      const p = bot.entity.position;
      const targetPos = p.offset(0, -1, 0); // Place on the block below
      await placeItem('crafting_table', targetPos.x, targetPos.y, targetPos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
      if (!craftingTable) {
        // If placing failed or it's still not found, return
        console.log("Failed to place crafting table.");
        return;
      }
    } else {
      // If we don't have a crafting table, we need to craft one first.
      // Crafting table requires 4 oak planks.
      await craftItem('crafting_table', 1);
      // After crafting, recursively call this function to re-evaluate and place it.
      await craft8Sticks(bot);
      return;
    }
  }

  // Move to the crafting table
  await moveTo(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 1, 10);

  // Craft 8 sticks
  await craftItem('stick', sticksNeeded);
}