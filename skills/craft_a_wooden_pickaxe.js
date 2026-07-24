async function craftWoodenPickaxe(bot) {
  // Check if wooden pickaxe is already in inventory
  const woodenPickaxe = bot.inventory.items().find(item => item.name === 'wooden_pickaxe');
  if (woodenPickaxe) {
    return; // Already have a wooden pickaxe
  }

  // Check for required materials: 3 oak_planks and 2 sticks
  let planks = bot.inventory.items().find(item => item.name === 'oak_planks');
  let sticks = bot.inventory.items().find(item => item.name === 'stick');
  const requiredPlanks = 3;
  const requiredSticks = 2;

  // Craft sticks if needed
  if (!sticks || sticks.count < requiredSticks) {
    const sticksToCraft = requiredSticks - (sticks ? sticks.count : 0);
    const planksNeededForSticks = Math.ceil(sticksToCraft / 4) * 2; // 2 planks -> 4 sticks

    if (!planks || planks.count < planksNeededForSticks) {
      // Need more planks to craft sticks
      const logs = bot.inventory.items().find(item => ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'].includes(item.name));
      if (!logs || logs.count === 0) {
        // Find and mine logs if not enough
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
        await mineBlock(logBlock.name, 1); // Mine 1 log to get planks
        planks = bot.inventory.items().find(item => item.name === 'oak_planks'); // Re-evaluate planks after mining
      }
      if (logs && logs.count > 0 && (!planks || planks.count < planksNeededForSticks)) {
        await craftItem('oak_planks', 1); // Craft 1 plank from 1 log
        planks = bot.inventory.items().find(item => item.name === 'oak_planks');
      }
    }
    await craftItem('stick', sticksToCraft);
    sticks = bot.inventory.items().find(item => item.name === 'stick');
  }

  // Ensure enough planks for the pickaxe itself
  if (!planks || planks.count < requiredPlanks) {
    const planksToCraft = requiredPlanks - (planks ? planks.count : 0);
    const logs = bot.inventory.items().find(item => ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'].includes(item.name));
    if (!logs || logs.count === 0) {
      // Find and mine logs if not enough
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
      await mineBlock(logBlock.name, 1); // Mine 1 log to get planks
      planks = bot.inventory.items().find(item => item.name === 'oak_planks'); // Re-evaluate planks after mining
    }
    await craftItem('oak_planks', planksToCraft);
    planks = bot.inventory.items().find(item => item.name === 'oak_planks');
  }

  // Craft a crafting table if none exists nearby
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const craftingTableItem = bot.inventory.items().find(item => item.name === 'crafting_table');
    if (!craftingTableItem) {
      await craftItem('crafting_table', 1);
    }
    // Place crafting table
    const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0)); // Block under bot
    if (!refBlock) return; // Cannot place without a reference block
    await placeItem('crafting_table', refBlock.position.x + 1, refBlock.position.y, refBlock.position.z);
    craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) return; // Failed to place or find crafting table
  }

  // Move to crafting table if not already near
  await moveTo(craftingTable.position.x, craftingTable.position.y + 1, craftingTable.position.z, 1, 10);

  // Craft the wooden pickaxe
  await craftItem('wooden_pickaxe', 1);
}