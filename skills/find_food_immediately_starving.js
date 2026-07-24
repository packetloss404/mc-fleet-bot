async function findFoodImmediatelyStarving(bot) {
  const FOOD_ITEMS = ['sweet_berries', 'glow_berries', 'apple', 'carrot', 'potato', 'baked_potato', 'bread', 'cooked_beef', 'cooked_chicken', 'cooked_porkchop', 'cooked_mutton', 'cooked_rabbit', 'cooked_cod', 'cooked_salmon', 'dried_kelp', 'mushroom_stew', 'rabbit_stew', 'beetroot_soup'];
  const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];

  // 1. Check inventory for food
  let food = bot.inventory.items().find(item => item.foodRecovery > 0);
  if (food) {
    await bot.equip(food, 'hand');
    // bot.consume() can hang if the server rejects the eat — cap it.
    await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
    // Check hunger after eating. If still low, try to find more.
    if (bot.food < 19) {
      await bot.waitForTicks(20); // Give a moment for hunger to update
    } else {
      return; // Food eaten, hunger satisfied for now
    }
  }

  // 2. If no food in inventory or still hungry, try to find some in the world
  // Prioritize easily accessible food sources:

  // a. Apples from oak_leaves (if nearby)
  let leavesBlock = bot.findBlock({
    matching: b => b.name === 'oak_leaves',
    maxDistance: 32
  });
  if (!leavesBlock) { console.log("Block not found"); return; }
  if (leavesBlock) {
    await mineBlock('oak_leaves', 1); // Mine one leaf block, hoping for an apple
    // After mining, re-check inventory
    food = bot.inventory.items().find(item => item.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food < 19) {
        await bot.waitForTicks(20);
      } else {
        return;
      }
    }
  }

  // b. Sweet berries (if nearby)
  let sweetBerryBush = bot.findBlock({
    matching: b => b.name === 'sweet_berry_bush',
    maxDistance: 32
  });
  if (!sweetBerryBush) { console.log("Block not found"); return; }
  if (sweetBerryBush) {
    await mineBlock('sweet_berry_bush', 1); // Collect berries
    food = bot.inventory.items().find(item => item.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food < 19) {
        await bot.waitForTicks(20);
      } else {
        return;
      }
    }
  }

  // c. Kill a passive mob (pig, cow, chicken)
  const passiveMobs = bot.nearestEntity(e => e.type === 'animal' && (e.name === 'pig' || e.name === 'cow' || e.name === 'chicken') && e.position.distanceTo(bot.entity.position) < 32);
  if (passiveMobs) {
    await killMob(passiveMobs.name, 10000); // Max 10 seconds to kill
    // After killing, re-check inventory for raw/cooked meat
    food = bot.inventory.items().find(item => item.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food < 19) {
        await bot.waitForTicks(20);
      } else {
        return;
      }
    }
  }

  // d. Craft bread (requires wheat, which requires seeds, which requires tall_grass)
  // Check for wheat or seeds first
  const inv = bot.inventory.items();
  const wheatCount = inv.find(i => i.name === 'wheat')?.count || 0;
  const breadCount = inv.find(i => i.name === 'bread')?.count || 0;
  if (breadCount > 0) {
    await craftItem('bread', 1); // Craft one bread
    food = bot.inventory.items().find(item => item.foodRecovery > 0);
    if (food) {
      await bot.equip(food, 'hand');
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      if (bot.food < 19) {
        await bot.waitForTicks(20);
      } else {
        return;
      }
    }
  } else if (wheatCount >= 3) {
    // Need a crafting table
    let craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) {
      const logs = inv.find(i => LOGS.includes(i.name));
      if (!logs) {
        const logBlock = bot.findBlock({
          matching: b => LOGS.includes(b.name),
          maxDistance: 32
        });
        if (logBlock) {
          await mineBlock(logBlock.name, 1);
        } else {
          const pos = await exploreUntil('north', 30, () => {
            const b = bot.findBlock({
              matching: b => LOGS.includes(b.name),
              maxDistance: 32
            });
            return b ? b.position : null;
          });
          if (pos) {
            const block = bot.findBlock({
              matching: b => LOGS.includes(b.name),
              maxDistance: 32
            });
            if (block) await mineBlock(block.name, 1);
          }
        }
      }
      const currentLogs = bot.inventory.items().find(i => LOGS.includes(i.name));
      if (currentLogs) {
        await craftItem('oak_planks', 4); // Craft planks (any type, just need some)
        await craftItem('crafting_table', 1);
        const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (refBlock && refBlock.name !== 'air' && refBlock.name !== 'water' && refBlock.name !== 'lava') {
          await placeItem('crafting_table', bot.entity.position.x + 1, bot.entity.position.y, bot.entity.position.z);
          craftingTable = bot.findBlock({
            matching: b => b.name === 'crafting_table',
            maxDistance: 32
          }); // Re-find
        }
      }
    }
    if (craftingTable) {
      await craftItem('bread', 1); // Craft one bread
      food = bot.inventory.items().find(item => item.foodRecovery > 0);
      if (food) {
        await bot.equip(food, 'hand');
        await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
        if (bot.food < 19) {
          await bot.waitForTicks(20);
        } else {
          return;
        }
      }
    }
  } else {
    // Need to get wheat/seeds
    let tallGrass = bot.findBlock({
      matching: b => b.name === 'tall_grass',
      maxDistance: 32
    });
    if (!tallGrass) { console.log("Block not found"); return; }
    if (tallGrass) {
      await mineBlock('tall_grass', 1); // Mine tall grass for seeds
      // After mining, re-check inventory for seeds. If found, plant them. This is a longer-term strategy.
      // For immediate food, it's better to keep searching for direct food.
    }
  }

  // If still starving and no immediate food found, explore for more options
  // Explore for 15 seconds to find any food source or passive mob
  if (bot.food < 19) {
    const targetPos = await exploreUntil('north', 15, () => {
      // Look for food items directly
      let itemEntity = bot.nearestEntity(e => FOOD_ITEMS.includes(e.name) && e.position.distanceTo(bot.entity.position) < 16);
      if (itemEntity) return itemEntity.position;

      // Look for sweet berry bushes
      let bush = bot.findBlock({
        matching: b => b.name === 'sweet_berry_bush',
        maxDistance: 16
      });
      if (!bush) { console.log("Block not found"); return; }
      if (bush) return bush.position;

      // Look for oak leaves (for apples)
      let leaves = bot.findBlock({
        matching: b => b.name === 'oak_leaves',
        maxDistance: 16
      });
      if (!leaves) { console.log("Block not found"); return; }
      if (leaves) return leaves.position;

      // Look for passive mobs
      let mob = bot.nearestEntity(e => e.type === 'animal' && (e.name === 'pig' || e.name === 'cow' || e.name === 'chicken') && e.position.distanceTo(bot.entity.position) < 16);
      if (mob) return mob.position;
      return null;
    });
    if (targetPos) {
      await moveTo(targetPos.x, targetPos.y, targetPos.z, 1, 10);
      // After moving, re-evaluate and try to get food from the found source
      // This will restart the function's logic and re-check inventory/nearby blocks.
      // This function will be called again in the next tick if hunger is still low.
    }
  }
  // If after all attempts, hunger is still low, the task will be retried next cycle.
}