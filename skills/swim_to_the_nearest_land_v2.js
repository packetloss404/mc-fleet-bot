async function swimToNearestLand(bot) {
  const LAND_BLOCKS = ['grass_block', 'dirt', 'sand', 'stone'];
  const WATER_BLOCKS = ['water', 'tall_seagrass', 'seagrass']; // Added for explicit check

  // Function to check if the bot is truly on land
  const isOnLand = () => {
    const botX = Math.floor(bot.entity.position.x);
    const botY = Math.floor(bot.entity.position.y);
    const botZ = Math.floor(bot.entity.position.z);

    // Check the block directly under the bot and the 3x3 area around it for water
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const blockBelow = bot.blockAt(bot.entity.position.offset(x, -1, z));
        const blockAtFeet = bot.blockAt(bot.entity.position.offset(x, 0, z));
        const blockAtHead = bot.blockAt(bot.entity.position.offset(x, 1, z));

        // If any block at feet or head level is water, or block below is water, we are still in water
        if (blockBelow && WATER_BLOCKS.includes(blockBelow.name)) return false;
        if (blockAtFeet && WATER_BLOCKS.includes(blockAtFeet.name)) return false;
        if (blockAtHead && WATER_BLOCKS.includes(blockAtHead.name)) return false;
      }
    }
    // If no water found in the immediate vicinity, consider it land
    return true;
  };

  // Loop until the bot is considered on stable land
  let attempts = 0;
  const maxAttempts = 5; // Prevent infinite loops

  while (!isOnLand() && attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}: Bot is still in water or near it. Finding land...`);
    let landBlock = bot.findBlock({
      matching: b => LAND_BLOCKS.includes(b.name),
      maxDistance: 32
    });
    let targetPos = null;
    if (landBlock) {
      targetPos = landBlock.position;
    } else {
      console.log("No immediate land block found, exploring...");
      targetPos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => LAND_BLOCKS.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null;
      });
    }
    if (!targetPos) {
      console.log("Could not find land after exploration.");
      return; // Give up if no land found after exploring
    }
    console.log(`Moving towards land at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
    await moveTo(targetPos.x, targetPos.y, targetPos.z, 2, 30);

    // Wait a moment for the world to update after movement
    await bot.waitForTicks(20);
  }
  if (isOnLand()) {
    console.log("Successfully reached land!");
  } else {
    console.log(`Failed to reach stable land after ${maxAttempts} attempts.`);
  }
}