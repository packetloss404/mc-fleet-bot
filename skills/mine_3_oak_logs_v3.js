async function mineOakLogs(bot) {
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  const targetLogName = 'oak_log'; // Specific target for this task

  let logBlock = bot.findBlock({
    matching: b => LOGS.includes(b.name),
    maxDistance: 32
  });
  if (!logBlock) {
    // No logs nearby, explore to find some
    const logPosition = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      return b ? b.position : null;
    });
    if (!logPosition) {
      // Still no logs found after exploration
      return;
    }

    // After exploring and moving, re-find the block to ensure it's in range and get its details
    logBlock = bot.findBlock({
      matching: b => LOGS.includes(b.name),
      maxDistance: 32
    });
    if (!logBlock) {
      // Could not find a log even after moving to its reported position.
      // This can happen if the log was mined by another player or was a temporary render artifact.
      return;
    }
  }

  // Mine 3 logs, prioritizing oak_log if it was the initial target, but accepting any log if found
  await mineBlock(logBlock.name, 3);
}