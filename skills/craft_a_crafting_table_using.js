async function craftCraftingTable(bot) {
  // 1. Check if crafting_table is already in inventory
  const craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (craftingTable) {
    return; // Already have a crafting table, task complete
  }

  // 2. Obtain 4 oak planks
  // The obtainOakPlanks skill will ensure we have enough planks.
  await obtainOakPlanks(bot);

  // Re-check planks after obtaining
  const currentPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!currentPlanks || currentPlanks.count < 4) {
    // If obtainOakPlanks failed to get enough, we cannot proceed
    return;
  }

  // 3. Craft the crafting table using 4 oak planks
  await craftItem('crafting_table', 1);
}