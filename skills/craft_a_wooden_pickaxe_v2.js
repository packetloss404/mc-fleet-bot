async function craftWoodenPickaxe(bot) {
  const inv = bot.inventory.items();

  // Check if wooden pickaxe is already in inventory
  if (inv.find(item => item.name === 'wooden_pickaxe')) {
    return; // Already have a wooden pickaxe
  }

  // Check for materials: 3 oak_planks, 2 sticks
  let oakPlanksCount = inv.find(item => item.name === 'oak_planks')?.count || 0;
  let stickCount = inv.find(item => item.name === 'stick')?.count || 0;

  // Gather oak_log if not enough oak_planks
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  while (oakPlanksCount < 3) {
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
    await mineBlock(logBlock.name, 1);
    await craftItem('oak_planks', 4); // Craft 4 planks from 1 log
    oakPlanksCount = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
  }

  // Craft sticks if not enough
  while (stickCount < 2) {
    // Need 2 planks for 4 sticks. If we have enough planks, craft sticks.
    if (oakPlanksCount >= 1) {
      // 1 plank makes 2 sticks, which is enough
      await craftItem('stick', 2);
      oakPlanksCount = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
      stickCount = bot.inventory.items().find(item => item.name === 'stick')?.count || 0;
    } else {
      // Should not happen if the plank gathering loop above worked, but as a safeguard.
      return; // Not enough planks to make sticks.
    }
  }

  // Find or craft a crafting table
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    // Check if we have planks to craft a crafting table
    if (oakPlanksCount < 4) {
      // Need to gather more logs to get 4 planks for a crafting table
      while (oakPlanksCount < 4) {
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
        await craftItem('oak_planks', 4);
        oakPlanksCount = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
      }
    }
    await craftItem('crafting_table', 1);
    // Find a suitable place to put the crafting table
    const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0)); // Block under bot's feet
    if (!refBlock || refBlock.name === 'air' || refBlock.name === 'water' || refBlock.name === 'lava') {
      // If no solid block under feet, try to place on a nearby solid block
      const blocksAround = [bot.entity.position.offset(1, -1, 0), bot.entity.position.offset(-1, -1, 0), bot.entity.position.offset(0, -1, 1), bot.entity.position.offset(0, -1, -1)];
      let placed = false;
      for (const pos of blocksAround) {
        const block = bot.blockAt(pos);
        if (block && block.type !== 0 && block.name !== 'air' && block.name !== 'water' && block.name !== 'lava') {
          await placeItem('crafting_table', pos.x, pos.y + 1, pos.z);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Fallback: place it on the ground right in front of the bot
        const targetPos = bot.entity.position.offset(0, -1, 1); // One block in front, on the ground
        await placeItem('crafting_table', targetPos.x, targetPos.y + 1, targetPos.z);
      }
    } else {
      // Place it on the block in front of the bot
      const targetPos = bot.entity.position.offset(0, 0, 1);
      await placeItem('crafting_table', targetPos.x, targetPos.y, targetPos.z);
    }
    craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) {
      return; // Failed to place or find crafting table
    }
  }

  // Craft the wooden pickaxe
  await craftItem('wooden_pickaxe', 1);
}