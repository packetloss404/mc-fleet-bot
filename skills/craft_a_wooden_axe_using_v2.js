async function craftWoodenAxe(bot) {
  const inv = bot.inventory.items();

  // Check if wooden axe is already in inventory
  const existingAxe = inv.find(item => item.name === 'wooden_axe');
  if (existingAxe) {
    // If we already have a wooden axe, we are done.
    return;
  }

  // Check for a crafting table in inventory
  let craftingTable = inv.find(item => item.name === 'crafting_table');

  // If no crafting table in inventory, try to find one nearby to place
  if (!craftingTable) {
    const nearbyCraftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!nearbyCraftingTable) {
      // If no crafting table, craft one
      const logs = inv.find(item => item.name.includes('_log'));
      if (!logs || logs.count < 1) {
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
        await mineBlock(logBlock.name, 1);
      }
      await craftItem('crafting_table', 1);
      craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table'); // Update inv after crafting
    }
  }

  // If we still don't have a crafting table (either in inventory or nearby), we need to place one.
  // We need a placeable block to put it on.
  let placedCraftingTable = null;
  if (craftingTable) {
    // If we have one in inventory
    const referenceBlock = bot.findBlock({
      matching: b => b.name === 'grass_block' || b.name === 'dirt' || b.name === 'stone',
      maxDistance: 32
    });
    if (!referenceBlock) { console.log("Block not found"); return; }
    if (referenceBlock) {
      const x = Math.floor(bot.entity.position.x);
      const y = Math.floor(bot.entity.position.y);
      const z = Math.floor(bot.entity.position.z);
      // Try to place it near the bot
      await placeItem('crafting_table', x + 1, y, z); // Attempt to place it next to the bot
      placedCraftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    }
  } else {
    // No crafting table in inventory, but there might be one nearby already placed
    placedCraftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
  }

  // Ensure we have enough planks and sticks
  const planks = inv.find(item => item.name.includes('_planks'));
  const sticks = inv.find(item => item.name === 'stick');
  if (!planks || planks.count < 3) {
    const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
    let log = inv.find(item => LOGS.includes(item.name));
    if (!log || log.count < 1) {
      // Need at least 1 log to make 4 planks
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
      await mineBlock(logBlock.name, 1); // Mine one log
      log = bot.inventory.items().find(item => LOGS.includes(item.name));
    }
    await craftItem(log.name.replace('_log', '_planks'), 4); // Craft 4 planks from 1 log
  }
  if (!sticks || sticks.count < 2) {
    // We need planks to craft sticks, which we should have by now from above.
    const currentPlanks = bot.inventory.items().find(item => item.name.includes('_planks'));
    if (!currentPlanks || currentPlanks.count < 1) {
      // This case should ideally not happen if the plank crafting above was successful.
      // If it does, it means we don't have enough planks to even make sticks.
      // This task assumes we have logs or can get them.
      return;
    }
    await craftItem('stick', 4); // Craft 4 sticks from 2 planks
  }

  // Craft the wooden axe
  await craftItem('wooden_axe', 1);
}