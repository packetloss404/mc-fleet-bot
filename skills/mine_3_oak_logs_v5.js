async function mineOakLogs(bot) {
  const targetLogsCount = 3;
  let currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  while (currentLogs < targetLogsCount) {
    await dropJunk(); // Keep inventory clear

    let oakLogBlock = bot.findBlock({
      matching: b => b.name === 'oak_log',
      maxDistance: 32
    });
    if (!oakLogBlock) {
      // No oak logs nearby, explore to find some
      const foundPos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => b.name === 'oak_log',
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!foundPos) {
        // Still no oak logs found after exploring, cannot proceed
        return;
      }
      // Re-scan for the block after moving to the found position
      oakLogBlock = bot.findBlock({
        matching: b => b.name === 'oak_log',
        maxDistance: 32
      });
      if (!oakLogBlock) {
        // Even after exploring, the block is not in range, give up for now.
        return;
      }
    }

    // Mine one oak log at a time until target is reached or no more logs are found
    const logsToMine = targetLogsCount - currentLogs;
    await mineBlock('oak_log', logsToMine);

    // Update current logs count
    currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  }
}