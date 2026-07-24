async function placeThreeDirtBlocks(bot) {
  const DIRT_BLOCKS = ['dirt', 'grass_block', 'coarse_dirt', 'rooted_dirt', 'farmland', 'dirt_path', 'podzol', 'mycelium'];

  // 1. Check if the bot has enough dirt blocks
  let dirtCount = bot.inventory.items().find(item => DIRT_BLOCKS.includes(item.name))?.count || 0;

  // 2. If not enough, mine dirt blocks
  if (dirtCount < 3) {
    const needed = 3 - dirtCount;
    const dirtBlock = bot.findBlock({
      matching: b => DIRT_BLOCKS.includes(b.name),
      maxDistance: 32
    });
    if (!dirtBlock) {
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => DIRT_BLOCKS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
      if (!pos) {
        console.log("No dirt blocks found after exploring.");
        return;
      }
      // Re-find the block after moving closer
      const newDirtBlock = bot.findBlock({
        matching: b => DIRT_BLOCKS.includes(b.name),
        maxDistance: 32
      });
      if (!newDirtBlock) {
        console.log("Still no dirt blocks in range after moving.");
        return;
      }
      await mineBlock(newDirtBlock.name, needed);
    } else {
      await mineBlock(dirtBlock.name, needed);
    }
    // Update dirt count after mining
    dirtCount = bot.inventory.items().find(item => DIRT_BLOCKS.includes(item.name))?.count || 0;
  }

  // Ensure we have at least 3 dirt blocks before placing
  if (dirtCount < 3) {
    console.log("Could not acquire 3 dirt blocks.");
    return;
  }

  // 3. Place 3 dirt blocks around the current position
  const currentPos = bot.entity.position.offset(0, -1, 0); // Position under the bot

  const positionsToPlace = [currentPos.offset(1, 0, 0), currentPos.offset(-1, 0, 0), currentPos.offset(0, 0, 1), currentPos.offset(0, 0, -1)];
  let placedCount = 0;
  const dirtItem = bot.inventory.items().find(item => DIRT_BLOCKS.includes(item.name));
  if (!dirtItem) {
    console.log("No dirt item found in inventory for placing, despite previous checks.");
    return;
  }

  // Equip dirt to hand
  await bot.equip(dirtItem, 'hand');
  for (const pos of positionsToPlace) {
    if (placedCount >= 3) break;
    const blockAtTarget = bot.blockAt(pos);
    // Only place if the target block is air or replaceable (e.g., grass, water)
    // We want to place *on* the current level, so we offset by +1 Y from the block under the bot.
    // Or, more simply, place next to the bot at its current Y level.
    const placeTargetPos = bot.entity.position.offset(pos.x - currentPos.x, 0, pos.z - currentPos.z);
    const blockAbove = bot.blockAt(placeTargetPos);
    if (blockAbove && (blockAbove.name === 'air' || blockAbove.replaceable)) {
      // Place on the block below the target placement position
      const blockUnderTarget = bot.blockAt(placeTargetPos.offset(0, -1, 0));
      if (blockUnderTarget && blockUnderTarget.diggable) {
        // Ensure there's a block to place on
        try {
          await placeItem(dirtItem.name, placeTargetPos.x, placeTargetPos.y, placeTargetPos.z);
          placedCount++;
        } catch (e) {
          console.log(`Failed to place dirt at ${placeTargetPos.x}, ${placeTargetPos.y}, ${placeTargetPos.z}: ${e.message}`);
        }
      }
    }
  }
  if (placedCount < 3) {
    console.log(`Only placed ${placedCount} dirt blocks out of 3.`);
  } else {
    console.log("Successfully placed 3 dirt blocks.");
  }
}