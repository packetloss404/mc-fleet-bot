async function craftStonePickaxe(bot) {
  const CRAFTING_TABLE_POS = {
    x: 64,
    y: 74,
    z: 28
  };
  const COBBLESTONE_NEEDED = 3;
  const STICKS_NEEDED = 2;
  const inv = bot.inventory.items();
  let cobblestoneCount = inv.find(item => item.name === 'cobblestone')?.count || 0;
  let stickCount = inv.find(item => item.name === 'stick')?.count || 0;

  // 1. Collect cobblestone if not enough
  if (cobblestoneCount < COBBLESTONE_NEEDED) {
    const needed = COBBLESTONE_NEEDED - cobblestoneCount;
    await mineBlock('stone', needed); // Mine 'stone' which yields 'cobblestone'
    // Update inventory after mining
    const updatedInv = bot.inventory.items();
    cobblestoneCount = updatedInv.find(item => item.name === 'cobblestone')?.count || 0;
    if (cobblestoneCount < COBBLESTONE_NEEDED) {
      // If we still don't have enough after mining, something went wrong or no stone was found.
      // The primitive mineBlock should handle exploration if needed, but if it fails to get enough,
      // we can't complete the task.
      return;
    }
  }

  // 2. Collect sticks if not enough (from previous context, sticks were an issue)
  if (stickCount < STICKS_NEEDED) {
    // Check for logs to craft into planks, then sticks
    const logs = bot.inventory.items().find(item => item.name.endsWith('_log'));
    if (logs) {
      await craftItem('oak_planks', 1); // Craft 4 planks from 1 log
      await craftItem('stick', STICKS_NEEDED - stickCount); // Craft sticks from planks
      stickCount = bot.inventory.items().find(item => item.name === 'stick')?.count || 0;
    } else {
      // If no logs, mine some logs
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
      await mineBlock(logBlock.name, 1); // Mine at least 1 log
      await craftItem('oak_planks', 1); // Craft 4 planks from 1 log
      await craftItem('stick', STICKS_NEEDED - stickCount); // Craft sticks from planks
      stickCount = bot.inventory.items().find(item => item.name === 'stick')?.count || 0;
    }
    if (stickCount < STICKS_NEEDED) {
      // Still not enough sticks, cannot complete task
      return;
    }
  }

  // 3. Move to the crafting table
  await moveTo(CRAFTING_TABLE_POS.x, CRAFTING_TABLE_POS.y, CRAFTING_TABLE_POS.z, 1, 10);

  // 4. Craft the stone pickaxe
  await craftItem('stone_pickaxe', 1);
}