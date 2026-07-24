async function mine10DirtBlocks(bot) {
  const DIRT_BLOCKS = ['dirt', 'grass_block']; // Consider grass_block also as it turns into dirt when mined
  const countToMine = 10;
  let minedCount = 0;
  const inventoryDirt = bot.inventory.items().find(i => DIRT_BLOCKS.includes(i.name));
  if (inventoryDirt) {
    minedCount = inventoryDirt.count;
  }
  while (minedCount < countToMine) {
    // Drop junk to free up inventory slots
    await dropJunk();
    let blockToMine = bot.findBlock({
      matching: b => DIRT_BLOCKS.includes(b.name),
      maxDistance: 32
    });
    if (!blockToMine) {
      // Explore to find dirt or grass blocks if none are nearby
      const targetPos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => DIRT_BLOCKS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
      if (!targetPos) {
        // No dirt/grass found after exploring, give up for now
        return;
      }
      // After moving, re-check for the block
      blockToMine = bot.findBlock({
        matching: b => DIRT_BLOCKS.includes(b.name),
        maxDistance: 32
      });
      if (!blockToMine) {
        // Still no block after moving to the explored position, something went wrong or it was mined by another bot
        return;
      }
    }
    const remaining = countToMine - minedCount;
    const mineAmount = Math.min(remaining, 64); // Mine in reasonable stacks

    await mineBlock(blockToMine.name, mineAmount);
    const updatedInventoryDirt = bot.inventory.items().find(i => DIRT_BLOCKS.includes(i.name));
    minedCount = updatedInventoryDirt ? updatedInventoryDirt.count : 0;
  }
}