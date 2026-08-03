async function craftCraftingTable(bot) {
  const craftingTableCount = bot.inventory.items().find(item => item.name === 'crafting_table')?.count || 0;
  if (craftingTableCount >= 1) {
    return; // Already have a crafting table
  }
  const oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < 4) {
    // Need more oak planks, call the obtain skill
    await obtainOakPlanks(bot);
  }

  // After obtaining, recheck if we have enough
  const currentOakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
  if (currentOakPlanks >= 4) {
    await craftItem('crafting_table', 1);
  } else {
    // Still not enough planks, cannot craft
    return;
  }
}