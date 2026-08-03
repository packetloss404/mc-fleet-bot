async function mineAcaciaLogs(bot) {
  const logName = 'acacia_log';
  const targetCount = 3;

  // Check current inventory for acacia_logs
  const currentLogs = bot.inventory.items().filter(i => i.name === logName).reduce((acc, i) => acc + i.count, 0);
  const needed = targetCount - currentLogs;
  if (needed <= 0) {
    return; // Already have enough acacia_logs
  }
  let logBlock = bot.findBlock({
    matching: b => b.name === logName,
    maxDistance: 32
  });
  if (!logBlock) {
    // If no log is found nearby, explore
    const pos = await exploreUntil('north', 30, () => {
      // Reduced maxTime to 30s as per hard-cap
      const b = bot.findBlock({
        matching: b => b.name === logName,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // If exploreUntil didn't find any position, it means no log was found after exploring.
      return; // Give up cleanly, task will retry next cycle
    }

    // After moving, re-check for the block in the new vicinity
    logBlock = bot.findBlock({
      matching: b => b.name === logName,
      maxDistance: 32
    });
  }
  if (logBlock) {
    await mineBlock(logName, needed);
  } else {
    // If still no logBlock after exploring and re-checking, just return.
    // The task will be re-attempted in the next cycle.
    return;
  }
}