async function craftCraftingTable(bot) {
  // Check if crafting_table is already in inventory
  const craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (craftingTable) {
    return; // Already have a crafting table
  }

  // Ensure we have 4 oak planks
  const oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < 4) {
    // If not enough planks, obtain them first.
    // The obtainOakPlanks skill is available and can get planks.
    // However, the current inventory already has 4 planks, so this branch
    // should not be taken in this specific execution round.
    await obtainOakPlanks(bot);
    const updatedPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
    if (!updatedPlanks || updatedPlanks.count < 4) {
      // Still not enough planks, cannot craft
      return;
    }
  }

  // Craft 1 crafting_table
  await craftItem('crafting_table', 1);
}