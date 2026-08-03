async function placeDirtShelter(bot) {
  const DIRT_NAMES = ['dirt', 'grass_block', 'coarse_dirt', 'rooted_dirt', 'podzol', 'mycelium'];
  const requiredDirtCount = 3; // For initial check, but task is to place 3 more

  // 1. Check inventory for dirt for placement
  let dirtItem = bot.inventory.items().find(i => DIRT_NAMES.includes(i.name));
  let currentDirtCount = dirtItem ? dirtItem.count : 0;

  // 2. If not enough dirt, mine dirt blocks
  if (currentDirtCount < requiredDirtCount) {
    const dirtToMine = requiredDirtCount - currentDirtCount;
    let blockToMine = bot.findBlock({
      matching: b => DIRT_NAMES.includes(b.name),
      maxDistance: 32
    });
    if (!blockToMine) {
      // Explore to find dirt
      const pos = await exploreUntil('north', 30, () => {
        const b = bot.findBlock({
          matching: b => DIRT_NAMES.includes(b.name),
          maxDistance: 32
        });
        return b ? b.position : null; // Return position if block found
      });
      if (!pos) {
        // Still no dirt found after exploring
        return;
      }
      // After moving, re-scan for the block to mine within range
      blockToMine = bot.findBlock({
        matching: b => DIRT_NAMES.includes(b.name),
        maxDistance: 32
      });
      if (!blockToMine) {
        // If still no block in range after exploring, give up for this cycle
        return;
      }
    }
    // Mine the required dirt
    await mineBlock(blockToMine.name, dirtToMine);
    // Update dirt count after mining
    dirtItem = bot.inventory.items().find(i => DIRT_NAMES.includes(i.name));
    currentDirtCount = dirtItem ? dirtItem.count : 0;
  }

  // 3. Place 3 dirt blocks for the shelter expansion
  if (currentDirtCount >= 3) {
    const botPos = bot.entity.position;

    // Define placement positions relative to the bot
    // Try to place around the bot, making sure not to place on the same Y level as the bot's feet
    // and not directly under the bot.
    const placeAttempts = [botPos.offset(1, 0, 0),
    // East
    botPos.offset(-1, 0, 0),
    // West
    botPos.offset(0, 0, 1),
    // South
    botPos.offset(0, 0, -1),
    // North
    botPos.offset(1, 1, 0),
    // East, up
    botPos.offset(-1, 1, 0),
    // West, up
    botPos.offset(0, 1, 1),
    // South, up
    botPos.offset(0, 1, -1) // North, up
    ];
    let blocksPlaced = 0;
    for (const targetPos of placeAttempts) {
      if (blocksPlaced >= 3) break;

      // Ensure the target position is not occupied and not under the bot
      const blockAtTarget = bot.blockAt(targetPos);
      if (blockAtTarget && (blockAtTarget.name === 'air' || blockAtTarget.name === 'water')) {
        // Check if there's a support block below to place on
        const blockBelow = bot.blockAt(targetPos.offset(0, -1, 0));
        if (blockBelow && blockBelow.name !== 'air' && blockBelow.name !== 'water') {
          await placeItem(dirtItem.name, targetPos.x, targetPos.y, targetPos.z);
          blocksPlaced++;
          await bot.waitForTicks(5); // Small delay to allow placement to register
        }
      }
    }
  }
}