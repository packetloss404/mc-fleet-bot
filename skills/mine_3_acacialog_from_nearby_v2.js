async function mine3AcaciaLogs(bot) {
  // The task specifies "Mine 3 acacia_log from nearby trees."
  // The bot currently has 4 acacia_log in inventory.
  // We need to mine 3 *additional* acacia_logs.
  const initialAcaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
  const targetCount = initialAcaciaLogCount + 3;
  while (bot.inventory.items().find(item => item.name === 'acacia_log')?.count < targetCount) {
    await dropJunk(); // Keep inventory clear

    const currentAcaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
    const remainingToMine = targetCount - currentAcaciaLogCount;
    let acaciaLogBlock = bot.findBlock({
      matching: b => b.name === 'acacia_log',
      maxDistance: 32
    });
    if (!acaciaLogBlock) {
      // Explore to find acacia logs if none are nearby
      const pos = await exploreUntil('forward', 30, () => {
        const b = bot.findBlock({
          matching: b => b.name === 'acacia_log',
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!pos) {
        // If still no acacia logs found after exploring, give up
        throw new Error('Could not find acacia_log within reasonable exploration distance.');
      }
      // Re-find the block after moving to the position
      acaciaLogBlock = bot.findBlock({
        matching: b => b.name === 'acacia_log',
        maxDistance: 32
      });
      if (!acaciaLogBlock) {
        // Still couldn't find it even after moving, something is wrong or it despawned/was mined
        await bot.waitForTicks(20); // Wait a bit before retrying or giving up
        continue;
      }
    }

    // Mine the block. mineBlock can handle multiple blocks if available.
    // We request 1 at a time to be safe and let the loop handle the count.
    await mineBlock('acacia_log', 1);
  }
}