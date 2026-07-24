async function swimToTheNearestAccessibleLand(bot) {
  const LAND_BLOCKS = ['grass_block', 'dirt', 'sand', 'stone', 'gravel', 'andesite', 'diorite', 'granite', 'deepslate', 'cobblestone', 'cobbled_deepslate'];

  // Check if the bot is already out of water (standing on a land block and head out of water)
  const blockUnderFeet = bot.blockAt(bot.entity.position.offset(0, -1, 0));
  const blockAtHead = bot.blockAt(bot.entity.position.offset(0, 1, 0));
  if (blockUnderFeet && LAND_BLOCKS.includes(blockUnderFeet.name) && blockAtHead && blockAtHead.name !== 'water') {
    // Already on land and out of water
    return;
  }

  // Look for a nearby land block
  let landBlock = bot.findBlock({
    matching: b => LAND_BLOCKS.includes(b.name),
    maxDistance: 32
  });
  if (!landBlock) {
    // If no land block found nearby, explore to find one
    const targetPos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => LAND_BLOCKS.includes(b.name),
        maxDistance: 32
      });
      return b ? b.position : null;
    });
    if (!targetPos) {
      // Still no land found after exploring, give up for this cycle
      return;
    }
    // Update landBlock after exploring
    landBlock = bot.findBlock({
      matching: b => LAND_BLOCKS.includes(b.name),
      maxDistance: 32
    });
  }
  if (landBlock) {
    // Move to the land block
    await moveTo(landBlock.position.x, landBlock.position.y, landBlock.position.z, 2, 30);
  }
}