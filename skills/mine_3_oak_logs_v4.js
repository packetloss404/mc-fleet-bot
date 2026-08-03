async function mineOakLogs(bot) {
  const targetCount = 3;
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  let currentOakLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  while (currentOakLogs < targetCount) {
    let block = bot.findBlock({
      matching: b => LOGS.includes(b.name),
      maxDistance: 32
    });
    if (!block) {
      // No logs nearby, explore to find some
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
      if (!pos) {
        // Still no logs found after exploring, give up for now.
        return;
      }
      // After exploring, re-check for the block in range
      block = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!block) {
        // Still nothing in range after moving, give up cleanly
        return;
      }
    }

    // Mine the found log
    await mineBlock(block.name, 1);
    currentOakLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
    await dropJunk(); // Keep inventory clean
  }
}