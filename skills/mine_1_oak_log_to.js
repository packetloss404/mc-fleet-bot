async function mineOakLog(bot) {
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  const targetLogName = 'oak_log'; // Specific target for this task

  // Check if an oak log is already nearby
  let block = bot.findBlock({
    matching: b => b.name === targetLogName,
    maxDistance: 32
  });
  if (!block) {
    // If not, explore to find one
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === targetLogName,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // If still no oak log found after exploring, give up for this cycle
      return;
    }

    // After moving, re-check for the block in the new location
    block = bot.findBlock({
      matching: b => b.name === targetLogName,
      maxDistance: 32
    });
    if (!block) {
      // Still nothing in range after moving, give up cleanly
      return;
    }
  }

  // If we found an oak log (either initially or after exploring), mine it
  await mineBlock(targetLogName, 1);
}