async function craftCraftingTableFromAcaciaLog(bot) {
  // Check if crafting_table is already in inventory
  const craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (craftingTable && craftingTable.count >= 1) {
    return; // Already have a crafting table
  }

  // Check for acacia_planks or other planks
  let planks = bot.inventory.items().find(i => i.name.endsWith('_planks') && i.name !== 'crafting_table');
  let planksCount = planks?.count || 0;

  // If not enough planks, check for logs
  if (planksCount < 4) {
    const acaciaLog = bot.inventory.items().find(i => i.name === 'acacia_log');
    if (acaciaLog && acaciaLog.count >= 1) {
      // Craft 4 acacia_planks from 1 acacia_log
      await craftItem('acacia_planks', 4);
      planksCount = bot.inventory.items().find(i => i.name === 'acacia_planks')?.count || 0;
    } else {
      // If no logs and not enough planks, cannot proceed
      return;
    }
  }

  // If we now have enough planks, craft a crafting table
  if (planksCount >= 4) {
    await craftItem('crafting_table', 1);
  }
}