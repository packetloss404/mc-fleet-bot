async function mine3AcaciaLogs(bot) {
  let acaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
  const targetCount = 3;
  while (acaciaLogCount < targetCount) {
    const remainingToMine = targetCount - acaciaLogCount;
    let acaciaLogBlock = bot.findBlock({
      matching: b => b.name === 'acacia_log',
      maxDistance: 32
    });
    if (!acaciaLogBlock) {
      // Explore to find acacia logs if none are nearby
      const pos = await exploreUntil('forward', 30, () => {
        // Reduced maxTime to 30 as per hard cap
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
        throw new Error('Acacia_log disappeared after moving, or could not be re-found.');
      }
    }

    // Mine the found acacia logs
    await mineBlock('acacia_log', remainingToMine);
    acaciaLogCount = bot.inventory.items().find(item => item.name === 'acacia_log')?.count || 0;
  }
}