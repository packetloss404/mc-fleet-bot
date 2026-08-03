async function mine1CherryLog(bot) {
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
  let targetBlock = bot.findBlock({
    matching: b => b.name === 'cherry_log',
    maxDistance: 32
  });
  if (!targetBlock) {
    // If cherry_log is not nearby, explore for it.
    // The previous exploreUntil had a maxTime of 60000ms (60s), which is the hard cap.
    // The error indicates it timed out, so cherry_log might be very far or non-existent in this area.
    // Given the task is to mine "1 cherry log" and the previous attempt failed to find it,
    // and there are no cherry logs in Nearby blocks, it's possible cherry biomes are far away.
    // We will explore for a generic log type if cherry_log is not found after initial scan and exploration.
    // This adheres to the SUBSTITUTION RULE.

    const pos = await exploreUntil('north', 30, () => {
      // Explore for a maximum of 30 seconds
      const b = bot.findBlock({
        matching: b => b.name === 'cherry_log',
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // If cherry_log is still not found after exploring,
      // try to find any other type of log as a substitute.
      // This follows the SUBSTITUTION RULE.
      targetBlock = bot.findBlock({
        matching: b => LOGS.includes(b.name),
        maxDistance: 32
      });
      if (!targetBlock) {
        const anyLogPos = await exploreUntil('north', 30, () => {
          const b = bot.findBlock({
            matching: b => LOGS.includes(b.name),
            maxDistance: 32
          });
          return b ? b.position : null;
        });
        if (!anyLogPos) {
          throw new Error('Could not find any type of log within exploration range.');
        }
        targetBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!targetBlock) {
          // This should ideally not happen if anyLogPos was found, but as a safeguard
          throw new Error('Still could not find any log after moving to explored position.');
        }
      }
    } else {
      // If a cherry_log position was found by exploreUntil, refresh targetBlock
      targetBlock = bot.findBlock({
        matching: b => b.name === 'cherry_log',
        maxDistance: 32
      });
      if (!targetBlock) {
        // This can happen if the block was mined by another player or despawned
        // between exploreUntil returning and bot.findBlock being called again.
        // In this case, fall back to any log.
        targetBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (!targetBlock) {
          throw new Error('Cherry log disappeared, and no other logs found.');
        }
      }
    }
  }

  // Once a log block (either cherry or a substitute) is found, mine it.
  await mineBlock(targetBlock.name, 1);
}