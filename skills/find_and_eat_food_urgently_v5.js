async function findAndEatFoodUrgently(bot) {
  // First, check if there is any food in the inventory
  let food = bot.inventory.items().find(i => i.foodRecovery > 0);
  if (food) {
    // If food is found, equip and consume it
    await bot.equip(food, 'hand');
    // bot.consume() can hang if the server rejects the eat — cap it.
    await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
    // Check if health/food improved, if so, we are done for now.
    if (bot.food > 10 || bot.health > 5) {
      return;
    }
  }

  // If still no food or not enough food, try to get some.
  // Prioritize easy-to-get food:
  // 1. Animals (pigs, cows, chickens, salmon)
  // 2. Berries (sweet_berries, glow_berries)
  // 3. Apples from oak leaves (if no animals/berries)

  // Try to kill passive mobs for food
  const PASSIVE_MOBS = ['pig', 'cow', 'chicken', 'salmon', 'cod'];
  let targetMob = bot.nearestEntity(e => PASSIVE_MOBS.includes(e.name) && e.position.distanceTo(bot.entity.position) < 32);
  if (targetMob) {
    await killMob(targetMob.name, 10000); // 10 seconds max for killing one mob
    // After killing, re-check inventory for food
    food = bot.inventory.items().find(i => i.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food > 10 || bot.health > 5) {
        return;
      }
    }
  }

  // If still no food or not enough, try finding berries
  const BERRIES = ['sweet_berry_bush', 'glow_lichen']; // Glow lichen can drop glow berries sometimes
  let berryBlock = bot.findBlock({
    matching: b => BERRIES.includes(b.name),
    maxDistance: 32
  });
  if (!berryBlock) {
    // Explore for berries if not found nearby
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => BERRIES.includes(b.name),
        maxDistance: 32
      });
      return b ? b.position : null;
    });
    if (pos) {
      berryBlock = bot.findBlock({
        matching: b => BERRIES.includes(b.name),
        maxDistance: 32
      });
    }
  }
  if (berryBlock) {
    await mineBlock(berryBlock.name, 1); // Mine one berry bush/lichen
    // After mining, re-check inventory for food
    food = bot.inventory.items().find(i => i.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food > 10 || bot.health > 5) {
        return;
      }
    }
  }

  // If still no food or not enough, try apples from oak leaves
  const OAK_LEAVES = 'oak_leaves';
  let leavesBlock = bot.findBlock({
    matching: b => b.name === OAK_LEAVES,
    maxDistance: 32
  });
  if (!leavesBlock) {
    // Explore for oak leaves if not found nearby
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === OAK_LEAVES,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (pos) {
      leavesBlock = bot.findBlock({
        matching: b => b.name === OAK_LEAVES,
        maxDistance: 32
      });
    }
  }
  if (leavesBlock) {
    await mineBlock(OAK_LEAVES, 10); // Mine some leaves to get apples
    // After mining, re-check inventory for food
    food = bot.inventory.items().find(i => i.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food > 10 || bot.health > 5) {
        return;
      }
    }
  }

  // If after all attempts, still no food or not enough, consider crafting bread if wheat is available.
  const wheat = bot.inventory.items().find(i => i.name === 'wheat');
  if (wheat && wheat.count >= 3) {
    await craftItem('bread', Math.floor(wheat.count / 3));
    food = bot.inventory.items().find(i => i.name === 'bread');
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food > 10 || bot.health > 5) {
        return;
      }
    }
  }

  // If at this point, hunger and health are still critical, the bot might be stuck or out of options.
  // The task will be re-attempted in the next cycle.
}