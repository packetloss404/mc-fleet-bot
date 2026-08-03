async function craft8Sticks(bot) {
  const targetSticksCount = 8;
  let currentSticks = bot.inventory.items().find(i => i.name === 'stick')?.count || 0;
  if (currentSticks >= targetSticksCount) {
    return; // Already have enough sticks
  }
  const requiredOakPlanks = 2;
  let currentOakPlanks = bot.inventory.items().find(i => i.name === 'oak_planks')?.count || 0;

  // Ensure we have enough oak planks
  if (currentOakPlanks < requiredOakPlanks) {
    // This task specifically states we have 4 planks, which is enough.
    // If this were a general "craft sticks" task, we'd call a function to obtain planks.
    // For now, assume current inventory is sufficient as per the critique.
    console.log("Not enough oak planks to craft 8 sticks. Need 2, have " + currentOakPlanks);
    return;
  }

  // Find a crafting table
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    // Explore to find a crafting table
    const craftingTablePos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!craftingTablePos) {
      // If no crafting table found after exploring, we might need to craft one.
      // For this specific task, we assume one should be available or we cannot proceed.
      return;
    }
    // Re-find the block after moving closer
    craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) {
      return; // Still no crafting table in range
    }
  }

  // Move to the crafting table
  await moveTo(craftingTable.position.x, craftingTable.position.y + 1, craftingTable.position.z, 1, 10);

  // Craft sticks
  await craftItem('stick', targetSticksCount);
}