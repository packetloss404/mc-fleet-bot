async function mineOakLogs(bot) {
  const LOG_NAMES = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  const targetLogName = 'oak_log'; // Specific log requested

  await dropJunk();
  let logBlock = bot.findBlock({
    matching: b => b.name === targetLogName,
    maxDistance: 32
  });
  if (!logBlock) {
    // If not found nearby, explore to find it
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === targetLogName,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // Still no log found after exploration, return
      return;
    }

    // After moving, re-check for the log block in range
    logBlock = bot.findBlock({
      matching: b => b.name === targetLogName,
      maxDistance: 32
    });
    if (!logBlock) {
      // If still no log block in range after moving, something went wrong or it despawned
      return;
    }
  }

  // If a log block is found (either initially or after exploration), mine it
  await mineBlock(targetLogName, 3);
}