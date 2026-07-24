async function craftAcaciaPlanks(bot) {
  const plankName = 'acacia_planks';
  const logName = 'acacia_log';
  const targetPlanksCount = 4;
  let currentLogs = bot.inventory.items().find(i => i.name === logName)?.count || 0;
  let currentPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;
  if (currentLogs < 1) {
    // Need at least 1 log to craft 4 planks
    // This case should not happen based on the task description (3 acacia_log in inventory)
    // but added for robustness.
    return; // Not enough logs to even attempt crafting
  }

  // Check if a crafting table is needed and available
  let craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (!craftingTable) {
    // Check if there's a crafting table nearby
    const nearbyCraftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!nearbyCraftingTable) {
      // If no crafting table in inventory or nearby, we need to craft one.
      // A crafting table requires 4 planks. We need to craft planks first.
      // Since we are crafting acacia planks, we will use them to make the crafting table.
      let acaciaPlanksForTable = bot.inventory.items().find(i => i.name === 'acacia_planks')?.count || 0;
      if (acaciaPlanksForTable < 4) {
        const logsNeededForTablePlanks = Math.ceil((4 - acaciaPlanksForTable) / 4);
        if (currentLogs < logsNeededForTablePlanks) {
          // Cannot even make the planks for the crafting table
          return;
        }
        await craftItem(plankName, logsNeededForTablePlanks * 4); // Craft enough planks for the table
        currentLogs = bot.inventory.items().find(i => i.name === logName)?.count || 0; // Update log count
      }
      // Now craft the crafting table
      await craftItem('crafting_table', 1);
      craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
      if (!craftingTable) {
        // Failed to craft crafting table
        return;
      }
    }
  }

  // Proceed with crafting the target acacia planks
  const planksToCraft = targetPlanksCount - currentPlanks;
  if (planksToCraft > 0) {
    // Each log makes 4 planks. We need `planksToCraft` planks.
    // So we need `ceil(planksToCraft / 4)` logs.
    const logsRequired = Math.ceil(planksToCraft / 4);
    if (currentLogs < logsRequired) {
      // Not enough logs to craft the desired amount of planks
      return;
    }
    await craftItem(plankName, planksToCraft);
  }
}