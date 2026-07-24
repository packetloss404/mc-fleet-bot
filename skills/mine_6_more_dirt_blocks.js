async function mineSixMoreDirtBlocks(bot) {
  const targetCount = 6;
  const DIRT_BLOCKS = ['dirt', 'grass_block', 'coarse_dirt', 'rooted_dirt'];
  let minedCount = 0;
  while (minedCount < targetCount) {
    await dropJunk();
    let block = bot.findBlock({
      matching: b => DIRT_BLOCKS.includes(b.name),
      maxDistance: 32
    });
    if (!block) {
      // Explore until a dirt block is found
      const pos = await exploreUntil('forward', 30, () => {
        const b = bot.findBlock({
          matching: b => DIRT_BLOCKS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
      if (!pos) {
        // Still no dirt found after exploring
        return;
      }
      // Re-find the block after moving to the explored position
      block = bot.findBlock({
        matching: b => DIRT_BLOCKS.includes(b.name),
        maxDistance: 32
      });
      if (!block) {
        // If block is still null, something went wrong or it disappeared
        return;
      }
    }

    // Mine the block
    await mineBlock(block.name, 1);
    minedCount++;
  }
}