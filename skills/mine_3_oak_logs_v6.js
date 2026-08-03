async function mineOakLogs(bot) {
  const targetLogCount = 3;
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  let currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  while (currentLogs < targetLogCount) {
    // Drop junk to free up inventory slots before mining
    await dropJunk();
    let block = bot.findBlock({
      matching: b => b.name === 'oak_log',
      maxDistance: 32
    });
    if (!block) {
      // If no oak_log is nearby, explore to find one
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => b.name === 'oak_log',
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!pos) {
        // If still no oak_log found after exploring, give up for this cycle
        return;
      }

      // After moving, re-check for the block
      block = bot.findBlock({
        matching: b => b.name === 'oak_log',
        maxDistance: 32
      });
      if (!block) {
        // Still no block found in range after moving, something went wrong or it despawned
        return;
      }
    }

    // Mine the found oak_log
    // Mine one log at a time to update the count and check conditions
    await mineBlock('oak_log', 1);

    // Update current logs count
    currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  }
}