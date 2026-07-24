async function placeCraftingTableOnSuitableBlock(bot) {
  const craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (!craftingTable) {
    // If no crafting table in inventory, craft one first
    const planks = bot.inventory.items().find(item => item.name.includes('_planks'));
    if (!planks || planks.count < 4) {
      // Need planks to craft crafting table, try to get logs first
      const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
      const log = bot.inventory.items().find(item => LOGS.includes(item.name));
      if (!log || log.count < 1) {
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
          if (!pos) return;
          block = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          if (!block) return;
        }
        await mineBlock(block.name, 1);
      }
      // Craft planks from logs if needed
      const currentLogs = bot.inventory.items().find(item => LOGS.includes(item.name));
      if (currentLogs) {
        await craftItem(currentLogs.name.replace('_log', '_planks'), 4);
      } else {
        return; // Cannot get planks
      }
    }
    await craftItem('crafting_table', 1);
  }

  // Find a suitable block to place the crafting table on
  // Prioritize blocks at the same Y level or one below.
  const suitableGroundBlocks = ['dirt', 'grass_block', 'stone', 'cobblestone', 'sand'];
  let placePosition = null;

  // Check current position's neighbors for a suitable placement spot
  const botX = Math.floor(bot.entity.position.x);
  const botY = Math.floor(bot.entity.position.y);
  const botZ = Math.floor(bot.entity.position.z);

  // Check around the bot (e.g., in a 3x3 horizontal area around the bot, at bot's Y and Y-1)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue; // Don't place on bot's exact block

      const targetX = botX + dx;
      const targetZ = botZ + dz;

      // Check at bot's Y level
      const blockAbove = bot.blockAt(new Vec3(targetX, botY + 1, targetZ));
      const blockAtY = bot.blockAt(new Vec3(targetX, botY, targetZ));
      const blockBelow = bot.blockAt(new Vec3(targetX, botY - 1, targetZ));
      if (blockAtY && blockAbove && blockBelow) {
        // Ensure the space is empty and there's solid ground below
        if (blockAtY.name === 'air' && blockAbove.name === 'air' && suitableGroundBlocks.includes(blockBelow.name)) {
          placePosition = new Vec3(targetX, botY, targetZ);
          break;
        }
      }
    }
    if (placePosition) break;
  }

  // If no immediate spot found, look for nearby suitable blocks
  if (!placePosition) {
    const groundBlock = bot.findBlock({
      matching: b => suitableGroundBlocks.includes(b.name),
      maxDistance: 32
    });
    if (groundBlock) {
      // Found a ground block, try to place crafting table on top of it
      const blockAbove = bot.blockAt(groundBlock.position.offset(0, 1, 0));
      if (blockAbove && blockAbove.name === 'air') {
        placePosition = groundBlock.position.offset(0, 1, 0);
      }
    }
  }
  if (!placePosition) {
    console.log("Could not find a suitable place to put the crafting table.");
    return;
  }

  // Ensure crafting table is in hand
  const currentCraftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (currentCraftingTable) {
    await bot.equip(currentCraftingTable, 'hand');
  } else {
    console.log("Crafting table not in inventory after crafting attempt.");
    return;
  }

  // Place the crafting table
  await placeItem('crafting_table', placePosition.x, placePosition.y, placePosition.z);
}