async function craft4OakPlanks(bot) {
  const oakLogs = bot.inventory.items().find(item => item.name === 'oak_log');
  if (!oakLogs || oakLogs.count < 1) {
    // This case should be handled by a higher-level task if logs are missing.
    // For this specific task, we assume logs are available.
    console.log("Not enough oak logs to craft 4 oak planks.");
    return;
  }

  // Find a crafting table
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    // If no crafting table is found, explore for one
    const craftingTablePos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!craftingTablePos) {
      console.log("No crafting table found nearby or after exploring.");
      return;
    }
    // After exploring, re-find the block to get its details
    craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) {
      console.log("Crafting table disappeared after exploring.");
      return;
    }
  }

  // Move to the crafting table
  await moveTo(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 1, 10);

  // Craft 4 oak planks using 1 oak log
  await craftItem('oak_planks', 4);
}