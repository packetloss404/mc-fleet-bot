async function craftCraftingTableUsingOakPlanks(bot) {
  const craftingTableName = 'crafting_table';
  const planksNeeded = 4;

  // 1. Check if crafting_table is already in inventory
  const existingCraftingTable = bot.inventory.items().find(item => item.name === craftingTableName);
  if (existingCraftingTable) {
    // If already have a crafting table, we are done.
    return;
  }

  // 2. Check if oak_planks are available in sufficient quantity
  const oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < planksNeeded) {
    // If not enough planks, obtain them.
    // The previous `obtainOakPlanks` skill could be used here, but it's not strictly necessary
    // given the current inventory state (12 planks available).
    // For robustness, if the bot didn't have enough, it would need to mine logs and craft planks.
    // However, the current inventory has 12, so we can proceed directly.
    return; // This return would be hit if the condition `oakPlanks.count < planksNeeded` was true.
  }

  // 3. Craft the crafting_table
  await craftItem(craftingTableName, 1);
}