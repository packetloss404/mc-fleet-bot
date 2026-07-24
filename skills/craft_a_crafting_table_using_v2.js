async function craftCraftingTable(bot) {
  // Check if crafting table is already in inventory
  const craftingTableInInv = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (craftingTableInInv) {
    return; // Already have a crafting table, task complete
  }
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  const PLANKS = ['oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks'];

  // Check for existing planks
  let totalPlanks = 0;
  let plankType = null;
  for (const plankName of PLANKS) {
    const plankItem = bot.inventory.items().find(item => item.name === plankName);
    if (plankItem) {
      totalPlanks += plankItem.count;
      if (!plankType) {
        // Store the first plank type found
        plankType = plankName;
      }
    }
  }

  // If we don't have enough planks, get more logs and craft them
  if (totalPlanks < 4) {
    // Determine how many logs we need. 1 log crafts 4 planks.
    // To get 4 planks, we need 1 log. If we have 0 planks, we need 1 log.
    const logsNeeded = Math.ceil((4 - totalPlanks) / 4);

    // Find a log block
    let logBlock = bot.findBlock({
      matching: b => LOGS.includes(b.name),
      maxDistance: 32
    });
    if (!logBlock) {
      // If no log block nearby, explore
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
      if (!pos) {
        return; // No logs found after exploring
      }
      logBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!logBlock) {
        return; // Still no logs in range after moving
      }
    }

    // Mine the required logs
    await mineBlock(logBlock.name, logsNeeded);

    // After mining, update inventory and craft planks
    const logsInInv = bot.inventory.items().find(item => LOGS.includes(item.name));
    if (logsInInv && logsInInv.count > 0) {
      // Craft all logs into planks. 1 log -> 4 planks.
      // We need at least 1 log to get 4 planks.
      const planksToCraft = logsInInv.count * 4;
      const targetPlankType = logsInInv.name.replace('_log', '_planks');
      await craftItem(targetPlankType, planksToCraft); // Craft all available logs into planks
      plankType = targetPlankType; // Update plankType to what we just crafted
    } else {
      return; // Could not obtain logs to craft planks
    }
  }

  // Ensure we have at least 4 planks of the chosen type before crafting
  const finalPlanks = bot.inventory.items().find(item => PLANKS.includes(item.name) && item.name === plankType);
  if (!finalPlanks || finalPlanks.count < 4) {
    // This should ideally not happen if the above logic worked, but as a safeguard.
    return;
  }

  // Craft the crafting table
  await craftItem('crafting_table', 1);
}