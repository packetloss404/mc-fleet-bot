async function craftCraftingTableFromAcacia(bot) {
  const inv = bot.inventory.items();
  const acaciaPlanks = inv.find(i => i.name === 'acacia_planks');
  if (!acaciaPlanks || acaciaPlanks.count < 4) {
    throw new Error('Not enough acacia planks to craft a crafting table. Need 4, have ' + (acaciaPlanks ? acaciaPlanks.count : 0));
  }

  // Check if a crafting table is already in inventory
  const existingCraftingTable = inv.find(i => i.name === 'crafting_table');
  if (existingCraftingTable) {
    return; // Already have a crafting table, task complete.
  }
  await craftItem('crafting_table', 1);
}