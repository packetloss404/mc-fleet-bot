async function mineAcaciaLogs(bot) {
  const logName = 'acacia_log';
  const targetCount = 3;

  // Check current inventory for acacia_logs
  const currentLogs = bot.inventory.items().filter(i => i.name === logName).reduce((acc, i) => acc + i.count, 0);
  const needed = targetCount - currentLogs;
  if (needed <= 0) {
    return; // Already have enough acacia_logs
  }

  // Drop junk to free up inventory slots before mining
  await dropJunk();
  let logBlock = bot.findBlock({
    matching: b => b.name === logName,
    maxDistance: 32
  });
  if (!logBlock) {
    // If no log is found nearby, explore
    const pos = await exploreUntil('north', 30, () => {
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
    if (!logBlock) {
      return; // Still no log found after moving and re-scanning.
    }
  }

  // Mine the found log block
  await mineBlock(logBlock.name, needed);
}