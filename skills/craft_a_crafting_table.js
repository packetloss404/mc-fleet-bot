async function craftCraftingTable(bot) {
  // Check if crafting table is already in inventory
  const craftingTableInInv = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (craftingTableInInv) {
    return; // Already have a crafting table, task complete
  }
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  const PLANKS_MAP = {
    'oak_log': 'oak_planks',
    'spruce_log': 'spruce_planks',
    'birch_log': 'birch_planks',
    'jungle_log': 'jungle_planks',
    'acacia_log': 'acacia_planks',
    'dark_oak_log': 'dark_oak_planks',
    'mangrove_log': 'mangrove_planks',
    'cherry_log': 'cherry_planks'
  };

  // Check for planks in inventory
  let planksInInv = bot.inventory.items().find(item => Object.values(PLANKS_MAP).includes(item.name));
  let planksCount = planksInInv ? planksInInv.count : 0;
  let planksType = planksInInv ? planksInInv.name : null;

  // If not enough planks, get logs and craft them
  if (planksCount < 4) {
    // Check for logs in inventory
    let logInInv = bot.inventory.items().find(item => LOGS.includes(item.name));
    let logsCount = logInInv ? logInInv.count : 0;
    let logType = logInInv ? logInInv.name : null;

    // If not enough logs, mine some
    if (logsCount < 1) {
      // Need at least 1 log to make 4 planks
      let block = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!block) {
        const pos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!pos) return; // No logs found after exploring
        block = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!block) return; // Still nothing in range after moving
      }
      logType = block.name;
      await mineBlock(logType, 1); // Mine 1 log
      logsCount++;
    }

    // Craft logs into planks
    if (logType && logsCount > 0) {
      planksType = PLANKS_MAP[logType];
      if (planksType) {
        await craftItem(planksType, 4); // Craft 4 planks
        planksCount = 4;
      } else {
        // This should not happen if PLANKS_MAP is correctly defined for all LOGS
        return; // Unable to determine planks type from log
      }
    } else {
      return; // No logs to craft
    }
  }

  // Craft the crafting table using the planks
  if (planksCount >= 4) {
    await craftItem('crafting_table', 1);
  }
}