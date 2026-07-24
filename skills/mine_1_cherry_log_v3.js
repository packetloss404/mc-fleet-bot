async function mine1CherryLog(bot) {
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];

  // Check if cherry_log is nearby first
  let block = bot.findBlock({
    matching: b => b.name === 'cherry_log',
    maxDistance: 32
  });
  if (!block) {
    // If not, explore for it. maxTime is hard-capped at 30 seconds.
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === 'cherry_log',
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // If still no cherry_log, check for any other log type as a fallback
      // This is based on the SUBSTITUTION RULE: if the task names a resource that is NOT in "Nearby blocks" or your inventory, substitute the available equivalent.
      const anyLogBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (anyLogBlock) {
        await mineBlock(anyLogBlock.name, 1);
        return;
      }
      throw new Error('Could not find any cherry_log or other log type within exploration range.');
    }

    // After exploring, re-check for the cherry_log in the new area
    block = bot.findBlock({
      matching: b => b.name === 'cherry_log',
      maxDistance: 32
    });
    if (!block) {
      // If still no cherry_log, check for any other log type as a fallback
      const anyLogBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (anyLogBlock) {
        await mineBlock(anyLogBlock.name, 1);
        return;
      }
      throw new Error('Could not find any cherry_log or other log type after exploring.');
    }
  }

  // Once found (either nearby or after exploring), mine the block.
  await mineBlock(block.name, 1);
}