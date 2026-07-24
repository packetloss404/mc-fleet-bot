async function mine3StrippedSpruceLog(bot) {
  const targetBlockName = 'stripped_spruce_log';
  let block = bot.findBlock({
    matching: b => b.name === targetBlockName,
    maxDistance: 32
  });
  if (!block) {
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === targetBlockName,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      return; // Nothing found after exploring
    }
    block = bot.findBlock({
      matching: b => b.name === targetBlockName,
      maxDistance: 32
    });
    if (!block) {
      return; // Still nothing in range after moving
    }
  }
  await mineBlock(targetBlockName, 3);
}