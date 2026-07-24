async function mine1OakLog(bot) {
  const OAK_LOG = 'oak_log';
  let oakLogBlock = bot.findBlock({
    matching: b => b.name === OAK_LOG,
    maxDistance: 32
  });
  if (!oakLogBlock) {
    // Explore for oak_log, max 30 seconds
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === OAK_LOG,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // If exploreUntil didn't find anything, return cleanly
      return;
    }

    // After exploring, try to find the block again as we might have moved closer
    oakLogBlock = bot.findBlock({
      matching: b => b.name === OAK_LOG,
      maxDistance: 32
    });
  }
  if (oakLogBlock) {
    await mineBlock(OAK_LOG, 1);
  }
  // If oakLogBlock is still null here, it means it wasn't found even after exploring,
  // and the function will return without error, allowing the task to retry.
}