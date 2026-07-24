async function mineMoreAcaciaLogs(bot) {
  const targetAdditionalLogs = 3;
  let currentAcaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
  const targetTotalLogs = currentAcaciaLogCount + targetAdditionalLogs;
  while (currentAcaciaLogCount < targetTotalLogs) {
    await dropJunk(); // Keep inventory clear for new logs

    // First, check if acacia logs are nearby
    let acaciaLogBlock = bot.findBlock({
      matching: b => b.name === 'acacia_log',
      maxDistance: 32
    });
    if (!acaciaLogBlock) {
      // If not nearby, explore to find them
      const pos = await exploreUntil('forward', 20, () => {
        const b = bot.findBlock({
          matching: block => block.name === 'acacia_log',
          maxDistance: 32
        });
        if (!b) { console.log("Block not found"); return; }
        return b ? b.position : null;
      });
      if (!pos) {
        // If still no acacia logs found after exploring, give up for now
        return;
      }
      // Re-check for the block after moving to the found position
      acaciaLogBlock = bot.findBlock({
        matching: b => b.name === 'acacia_log',
        maxDistance: 32
      });
      if (!acaciaLogBlock) {
        // Still couldn't find it in range after moving, something went wrong or it was a false positive
        return;
      }
    }

    // Mine the found acacia log
    // mineBlock automatically handles moving to the block and mining it
    await mineBlock(acaciaLogBlock.name, 1);

    // Update count after mining
    currentAcaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
  }
}