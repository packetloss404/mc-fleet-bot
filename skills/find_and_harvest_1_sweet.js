async function harvestSweetBerryBush(bot) {
  const SWEET_BERRY_BUSH = 'sweet_berry_bush';

  // Check if bot is in water. If so, move to shore first.
  const blockUnderBot = bot.blockAt(bot.entity.position.offset(0, -1, 0));
  if (blockUnderBot && (blockUnderBot.name === 'water' || blockUnderBot.name === 'bubble_column')) {
    const landBlock = bot.findBlock({
      matching: b => b.name === 'grass_block' || b.name === 'dirt' || b.name === 'sand' || b.name === 'stone',
      maxDistance: 32
    });
    if (!landBlock) { console.log("Block not found"); return; }
    if (landBlock) {
      await moveTo(landBlock.position.x, landBlock.position.y, landBlock.position.z, 2, 30);
    } else {
      // If no land nearby, try to swim up and then re-evaluate
      await bot.look(bot.entity.yaw, -Math.PI / 2);
      bot.setControlState('jump', true);
      bot.setControlState('forward', true);
      await bot.waitForTicks(40);
      bot.clearControlStates();
      // After surfacing, re-check for land
      const landBlockAfterSurface = bot.findBlock({
        matching: b => b.name === 'grass_block' || b.name === 'dirt' || b.name === 'sand' || b.name === 'stone',
        maxDistance: 32
      });
      if (!landBlockAfterSurface) { console.log("Block not found"); return; }
      if (landBlockAfterSurface) {
        await moveTo(landBlockAfterSurface.position.x, landBlockAfterSurface.position.y, landBlockAfterSurface.position.z, 2, 30);
      } else {
        // Still no land, give up for now
        console.log("Could not find land to get out of water.");
        return;
      }
    }
  }

  // Check hunger and eat if necessary
  if (bot.food < 15) {
    // Eat if hunger is getting low
    const food = bot.inventory.items().find(i => i.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
    } else {
      console.log("No food in inventory, need to find some.");
      // The primary goal is to find sweet berries, which are food.
      // So, continue to search for them.
    }
  }

  // Find a sweet berry bush
  let sweetBerryBush = bot.findBlock({
    matching: b => b.name === SWEET_BERRY_BUSH,
    maxDistance: 32
  });
  if (!sweetBerryBush) {
    // If not found nearby, explore
    console.log("No sweet berry bush found nearby, exploring...");
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === SWEET_BERRY_BUSH,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      console.log("Could not find a sweet berry bush after exploring.");
      return; // Give up if nothing found after exploring
    }

    // After exploring, re-find the block to ensure it's within mining range
    sweetBerryBush = bot.findBlock({
      matching: b => b.name === SWEET_BERRY_BUSH,
      maxDistance: 32
    });
    if (!sweetBerryBush) {
      console.log("Sweet berry bush found during exploration but not in range after moving.");
      return; // Should not happen often, but good to check
    }
  }

  // Move to the sweet berry bush and harvest it
  console.log(`Found sweet berry bush at ${sweetBerryBush.position}, moving to harvest.`);
  await moveTo(sweetBerryBush.position.x, sweetBerryBush.position.y, sweetBerryBush.position.z, 1, 15);
  await mineBlock(SWEET_BERRY_BUSH, 1);
  console.log("Harvested sweet berry bush.");
}