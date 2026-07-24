async function craftWoodenSword(bot) {
  const inv = bot.inventory.items();
  const WOOD_LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];

  // 1. Check for crafting table
  let craftingTable = inv.find(item => item.name === 'crafting_table');
  let nearbyCraftingTableBlock = null;
  if (!craftingTable) {
    nearbyCraftingTableBlock = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!nearbyCraftingTableBlock) {
      // Crafting table not in inventory or nearby, need to craft one.
      // Requires 4 planks.
      let oakPlanksCount = inv.find(item => item.name === 'oak_planks')?.count || 0;
      let logsCount = inv.filter(item => WOOD_LOGS.includes(item.name)).reduce((sum, item) => sum + item.count, 0);
      if (oakPlanksCount < 4) {
        // Need more planks. Check logs.
        if (logsCount > 0) {
          await craftItem('oak_planks', 4 - oakPlanksCount); // Craft enough planks from logs
          oakPlanksCount = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
        } else {
          // No logs, need to mine some
          let logBlock = bot.findBlock({
            matching: b => WOOD_LOGS.includes(b.name),
            maxDistance: 32
          });
          if (!logBlock) {
            const pos = await exploreUntil('north', 30, () => {
              const b = bot.findBlock({
                matching: b => WOOD_LOGS.includes(b.name),
                maxDistance: 32
              });
              return b ? b.position : null;
            });
            if (!pos) return; // No logs found after exploring
            logBlock = bot.findBlock({
              matching: b => WOOD_LOGS.includes(b.name),
              maxDistance: 32
            });
            if (!logBlock) return; // Still no logs in range after moving
          }
          await mineBlock(logBlock.name, 1); // Mine at least one log
          await craftItem('oak_planks', 4); // Craft planks from the collected log
        }
      }

      // Check if we have 4 planks now to craft a crafting table
      oakPlanksCount = bot.inventory.items().find(item => item.name === 'oak_planks')?.count || 0;
      if (oakPlanksCount >= 4) {
        await craftItem('crafting_table', 1);
        craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
      } else {
        // Still not enough planks, something went wrong.
        return;
      }
    }
  }

  // 2. Place crafting table if in inventory and no nearby one, then move to it
  if (craftingTable && !nearbyCraftingTableBlock) {
    const p = bot.entity.position;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    const z = Math.floor(p.z);

    // Try to place it in front of the bot or slightly offset
    let targetPos = null;
    if (bot.blockAt(p.offset(1, 0, 0)).name === 'air') targetPos = p.offset(1, 0, 0);else if (bot.blockAt(p.offset(-1, 0, 0)).name === 'air') targetPos = p.offset(-1, 0, 0);else if (bot.blockAt(p.offset(0, 0, 1)).name === 'air') targetPos = p.offset(0, 0, 1);else if (bot.blockAt(p.offset(0, 0, -1)).name === 'air') targetPos = p.offset(0, 0, -1);else if (bot.blockAt(p.offset(0, 1, 0)).name === 'air') targetPos = p.offset(0, 1, 0); // Try placing above if no side is free

    if (targetPos) {
      await placeItem('crafting_table', targetPos.x, targetPos.y, targetPos.z);
      // Move to the newly placed crafting table
      await moveTo(targetPos.x, targetPos.y, targetPos.z, 1, 15);
    } else {
      // No suitable place to put the crafting table.
      return;
    }
  } else if (nearbyCraftingTableBlock) {
    // Move to the existing nearby crafting table
    await moveTo(nearbyCraftingTableBlock.position.x, nearbyCraftingTableBlock.position.y, nearbyCraftingTableBlock.position.z, 1, 15);
  } else if (!craftingTable && !nearbyCraftingTableBlock) {
    // Should not happen if logic above is correct, but as a safeguard.
    return;
  }

  // 3. Collect prerequisite materials for wooden sword: 1 oak plank, 2 sticks
  let currentInv = bot.inventory.items();
  let oakPlanksNeeded = 1 - (currentInv.find(item => item.name === 'oak_planks')?.count || 0);
  let sticksNeeded = 2 - (currentInv.find(item => item.name === 'stick')?.count || 0);
  if (oakPlanksNeeded > 0) {
    // Try to get planks from logs
    let logsAvailable = currentInv.filter(item => WOOD_LOGS.includes(item.name)).reduce((sum, item) => sum + item.count, 0);
    if (logsAvailable > 0) {
      await craftItem('oak_planks', oakPlanksNeeded);
    } else {
      // Mine a log if no logs available
      let logBlock = bot.findBlock({
        matching: b => WOOD_LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!logBlock) {
        const pos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => WOOD_LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!pos) return;
        logBlock = bot.findBlock({
          matching: b => WOOD_LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!logBlock) return;
      }
      await mineBlock(logBlock.name, 1);
      await craftItem('oak_planks', oakPlanksNeeded);
    }
  }
  if (sticksNeeded > 0) {
    currentInv = bot.inventory.items(); // Refresh inventory after plank crafting
    let planksAvailable = currentInv.find(item => item.name === 'oak_planks')?.count || 0;
    if (planksAvailable * 4 < sticksNeeded) {
      // Need more planks to make sticks
      let logsAvailable = currentInv.filter(item => WOOD_LOGS.includes(item.name)).reduce((sum, item) => sum + item.count, 0);
      if (logsAvailable === 0) {
        // Mine a log
        let logBlock = bot.findBlock({
          matching: b => WOOD_LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!logBlock) {
          const pos = await exploreUntil('north', 30, () => {
            const b = bot.findBlock({
              matching: b => WOOD_LOGS.includes(b.name),
              maxDistance: 32
            });
            return b ? b.position : null;
          });
          if (!pos) return;
          logBlock = bot.findBlock({
            matching: b => WOOD_LOGS.includes(b.name),
            maxDistance: 32
          });
          if (!logBlock) return;
        }
        await mineBlock(logBlock.name, 1);
      }
      // Craft planks from logs to ensure enough for sticks
      await craftItem('oak_planks', Math.ceil(sticksNeeded / 4));
    }
    await craftItem('stick', sticksNeeded);
  }

  // 4. Craft the wooden sword
  await craftItem('wooden_sword', 1);
}