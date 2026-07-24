async function mine3DirtBlocks(bot) {
  const targetBlockName = 'dirt';
  let minedCount = 0;
  const totalToMine = 3;
  while (minedCount < totalToMine) {
    const block = bot.findBlock({
      matching: b => b.name === targetBlockName,
      maxDistance: 32
    });
    if (!block) { console.log("Block not found"); return; }
    if (block) {
      await mineBlock(block.name, 1);
      minedCount++;
    } else {
      // If no dirt block found nearby, explore
      const pos = await exploreUntil('forward', 15, () => {
        const b = bot.findBlock({
          matching: b => b.name === targetBlockName,
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!pos) {
        // No dirt found even after exploration
        return; // Give up cleanly
      }
      // If a position was found, the loop will reiterate and findBlock should now succeed
    }
  }
}