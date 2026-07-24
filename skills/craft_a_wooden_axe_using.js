async function craftWoodenAxe(bot) {
  const CRAFTING_TABLE_NAME = 'crafting_table';
  const OAK_PLANK_NAME = 'oak_planks';
  const STICK_NAME = 'stick';
  const WOODEN_AXE_NAME = 'wooden_axe';

  // 1. Check if a crafting table is available.
  let craftingTable = bot.findBlock({
    matching: b => b.name === CRAFTING_TABLE_NAME,
    maxDistance: 32
  });
  if (!craftingTable) {
    // If no crafting table, we need to craft one.
    // Need 4 oak planks for a crafting table.
    const inv = bot.inventory.items();
    let oakPlanks = inv.find(item => item.name === OAK_PLANK_NAME);
    if (!oakPlanks || oakPlanks.count < 4) {
      // Need to get logs and convert to planks.
      const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
      let logBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!logBlock) {
        const pos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!pos) return;
        logBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!logBlock) return;
      }
      // Mine enough logs to get 4 planks (1 log = 4 planks)
      await mineBlock(logBlock.name, 1);
      // Craft planks from logs
      await craftItem(OAK_PLANK_NAME, 4); // Craft 4 planks for the crafting table
    }

    // Now craft and place the crafting table
    await craftItem(CRAFTING_TABLE_NAME, 1);
    const placePosition = bot.entity.position.offset(1, 0, 0); // Place it in front of the bot
    await placeItem(CRAFTING_TABLE_NAME, placePosition.x, placePosition.y, placePosition.z);

    // Update craftingTable variable with the newly placed table
    craftingTable = bot.findBlock({
      matching: b => b.name === CRAFTING_TABLE_NAME,
      maxDistance: 32
    });
    if (!craftingTable) {
      // This should not happen if placement was successful, but as a safeguard
      return;
    }
  }

  // Move to the crafting table
  await moveTo(craftingTable.position.x, craftingTable.position.y + 1, craftingTable.position.z, 1, 10);

  // 2. Ensure we have 3 oak planks.
  const inv = bot.inventory.items();
  let oakPlanks = inv.find(item => item.name === OAK_PLANK_NAME);
  if (!oakPlanks || oakPlanks.count < 3) {
    // Check if we have logs to convert
    const oakLogs = inv.find(item => item.name === 'oak_log');
    if (oakLogs && oakLogs.count > 0) {
      const planksNeeded = 3 - (oakPlanks ? oakPlanks.count : 0);
      const logsToCraft = Math.ceil(planksNeeded / 4); // 1 log makes 4 planks
      await craftItem(OAK_PLANK_NAME, logsToCraft * 4); // Craft enough planks
    } else {
      // If no logs, need to mine them.
      const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
      let logBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!logBlock) {
        const pos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!pos) return;
        logBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!logBlock) return;
      }
      await mineBlock(logBlock.name, 1); // Mine 1 log
      await craftItem(OAK_PLANK_NAME, 4); // Craft 4 planks
    }
  }

  // 3. Ensure we have 2 sticks.
  const invAfterPlanks = bot.inventory.items();
  let sticks = invAfterPlanks.find(item => item.name === STICK_NAME);
  if (!sticks || sticks.count < 2) {
    const sticksNeeded = 2 - (sticks ? sticks.count : 0);
    const planksForSticks = Math.ceil(sticksNeeded / 4) * 2; // 2 planks make 4 sticks.
    const currentPlanks = invAfterPlanks.find(item => item.name === OAK_PLANK_NAME);
    if (!currentPlanks || currentPlanks.count < planksForSticks) {
      // Need more planks to craft sticks.
      // This logic is similar to obtaining planks for the axe itself,
      // but we need to be careful not to consume planks needed for the axe head.
      // For simplicity, let's assume we collect enough logs to make the needed planks.
      const logsNeeded = Math.ceil(planksForSticks / 4);
      const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
      let logBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!logBlock) {
        const pos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!pos) return;
        logBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!logBlock) return;
      }
      await mineBlock(logBlock.name, logsNeeded);
      await craftItem(OAK_PLANK_NAME, logsNeeded * 4);
    }
    await craftItem(STICK_NAME, sticksNeeded);
  }

  // 4. Craft the wooden axe.
  await craftItem(WOODEN_AXE_NAME, 1);
}