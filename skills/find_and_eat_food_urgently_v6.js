async function findAndEatFoodUrgently(bot) {
  // First, check inventory for any food items
  const inv = bot.inventory.items();
  const food = inv.find(i => i.foodRecovery > 0);
  if (food) {
    // If food is found in inventory, equip and consume it
    await bot.equip(food, 'hand');
    // bot.consume() can hang if the server rejects the eat — cap it.
    await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
    return; // Food consumed, task complete for now
  }

  // If no food in inventory, try to acquire some.
  // Prioritize easily accessible food like berries or killing passive mobs.

  // Option 1: Look for sweet berries or glow berries
  const BERRIES = ['sweet_berry_bush', 'glow_berry_bush'];
  let berryBush = bot.findBlock({
    matching: b => BERRIES.includes(b.name),
    maxDistance: 32
  });
  if (!berryBush) {
    const pos = await exploreUntil('north', 20, () => {
      const b = bot.findBlock({
        matching: b => BERRIES.includes(b.name),
        maxDistance: 32
      });
      return b ? b.position : null;
    });
    if (pos) {
      berryBush = bot.findBlock({
        matching: b => BERRIES.includes(b.name),
        maxDistance: 32
      });
    }
  }
  if (berryBush) {
    await mineBlock(berryBush.name, 1); // Mine one berry bush to get berries
    // Check inventory again for acquired food
    const newInv = bot.inventory.items();
    const acquiredBerries = newInv.find(i => i.name.includes('berries') && i.foodRecovery > 0);
    if (acquiredBerries) {
      await bot.equip(acquiredBerries, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      return;
    }
  }

  // Option 2: Look for passive mobs (pigs, cows, chickens, sheep) and kill them for raw food
  const PASSIVE_MOBS = ['pig', 'cow', 'chicken', 'sheep'];
  let mob = bot.nearestEntity(e => PASSIVE_MOBS.includes(e.name) && e.position.distanceTo(bot.entity.position) < 32);
  if (!mob) {
    const pos = await exploreUntil('north', 20, () => {
      const m = bot.nearestEntity(e => PASSIVE_MOBS.includes(e.name) && e.position.distanceTo(bot.entity.position) < 32);
      return m ? m.position : null;
    });
    if (pos) {
      mob = bot.nearestEntity(e => PASSIVE_MOBS.includes(e.name) && e.position.distanceTo(bot.entity.position) < 32);
    }
  }
  if (mob) {
    // Since health is critically low, use a short timeout for killMob
    // and prioritize eating immediately if successful.
    await killMob(mob.name, 5000); // Try to kill the mob, 5-second timeout

    // After killing, check for dropped raw food in inventory
    const newInv = bot.inventory.items();
    const acquiredRawFood = newInv.find(i => (i.name.includes('porkchop') || i.name.includes('beef') || i.name.includes('chicken') || i.name.includes('mutton')) && i.foodRecovery > 0);
    if (acquiredRawFood) {
      await bot.equip(acquiredRawFood, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      return;
    }
  }

  // Option 3: Look for apples from oak leaves (less reliable but possible)
  const OAK_LEAVES = 'oak_leaves';
  let oakLeaves = bot.findBlock({
    matching: b => b.name === OAK_LEAVES,
    maxDistance: 32
  });
  if (!oakLeaves) {
    const pos = await exploreUntil('north', 15, () => {
      const b = bot.findBlock({
        matching: b => b.name === OAK_LEAVES,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (pos) {
      oakLeaves = bot.findBlock({
        matching: b => b.name === OAK_LEAVES,
        maxDistance: 32
      });
    }
  }
  if (oakLeaves) {
    // Mine a few leaf blocks, hoping for an apple drop
    for (let i = 0; i < 5; i++) {
      // Try mining up to 5 leaf blocks
      await mineBlock(OAK_LEAVES, 1);
      const newInv = bot.inventory.items();
      const acquiredApple = newInv.find(i => i.name === 'apple' && i.foodRecovery > 0);
      if (acquiredApple) {
        await bot.equip(acquiredApple, 'hand');
        await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
        return;
      }
    }
  }

  // If after all attempts, no food was found or eaten, the task failed for this cycle.
  // The bot will retry on the next cycle.
}