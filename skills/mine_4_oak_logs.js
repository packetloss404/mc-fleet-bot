async function mine4OakLogs(bot) {
  const targetLogsCount = 4;
  let currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  while (currentLogs < targetLogsCount) {
    await dropJunk(); // Keep inventory clear

    let block = bot.findBlock({
      matching: b => b.name === 'oak_log',
      maxDistance: 32
    });
    if (!block) {
      // No oak_log nearby, explore to find one
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => b.name === 'oak_log',
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!pos) {
        // Still no oak_log found after exploring, give up for now.
        return;
      }
      // After moving, re-check for the block in range
      block = bot.findBlock({
        matching: b => b.name === 'oak_log',
        maxDistance: 32
      });
      if (!block) {
        // Still nothing in range after moving, give up cleanly
        return;
      }
    }
    const logsToMine = targetLogsCount - currentLogs;
    await mineBlock('oak_log', logsToMine);

    // Update current logs count after mining
    currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  }
}