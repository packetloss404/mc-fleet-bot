async function findAndEatFoodUrgently(bot) {
  // Check if bot needs to eat
  if (bot.food < 19 || bot.health < 15) {
    const inv = bot.inventory.items();
    const food = inv.find(i => i.foodRecovery > 0);
    if (food) {
      // If food is found in inventory, equip and consume it
      await bot.equip(food, 'hand');
      // bot.consume() can hang if the server rejects the eat — cap it.
      await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
      // After eating, re-check if more food is needed.
      if (bot.food < 19 || bot.health < 15) {
        // If still hungry/low health, try to eat another piece if available
        const remainingFood = inv.find(i => i.name === food.name && i.foodRecovery > 0);
        if (remainingFood && remainingFood.count > 0) {
          await bot.equip(remainingFood, 'hand');
          await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000))]);
        }
      }
      return; // Return after eating, whether successful or not, to re-evaluate next tick.
    } else {
      // No food in inventory, need to acquire some.
      // Prioritize easily accessible food sources:
      // 1. Sweet berries (if found)
      // 2. Apples from oak_leaves (if an axe can be crafted)
      // 3. Kill passive mobs for raw meat (if a sword can be crafted)

      // Check for sweet berries first
      const SWEET_BERRY_BUSH = ['sweet_berry_bush'];
      let berryBush = bot.findBlock({
        matching: b => SWEET_BERRY_BUSH.includes(b.name),
        maxDistance: 32
      });
      if (berryBush) {
        await mineBlock(berryBush.name, 1); // Mine one berry bush to get berries
        return; // After attempting to get berries, re-evaluate next tick.
      }

      // If no berries, try to get apples from oak_leaves.
      // This requires an axe. Check if we have wood to craft an axe.
      const LOGS = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'];
      const hasLogs = inv.find(i => LOGS.includes(i.name));
      if (hasLogs && hasLogs.count >= 1) {
        // Need at least 1 log to make planks and sticks
        // Craft a crafting table if not present
        if (!inv.find(i => i.name === 'crafting_table')) {
          await craftItem('crafting_table', 1);
        }

        // Place crafting table if not already placed
        const craftingTable = bot.findBlock({
          matching: b => b.name === 'crafting_table',
          maxDistance: 32
        });
        if (!craftingTable) {
          // Find a suitable spot to place the crafting table (e.g., on sand/dirt/grass)
          const suitableBlock = bot.findBlock({
            matching: b => ['sand', 'dirt', 'grass_block'].includes(b.name),
            maxDistance: 32,
            position: bot.entity.position.offset(0, -1, 0) // Look under bot
          });
          if (suitableBlock) {
            const placePos = suitableBlock.position.offset(0, 1, 0); // Place above it
            await placeItem('crafting_table', placePos.x, placePos.y, placePos.z);
          } else {
            // Cannot place crafting table, might be in water or no suitable block
            // Try to move to shore if in water
            await walkToTheNearestShore(bot); // This skill is available
            return; // Re-evaluate after moving to shore.
          }
        }

        // Craft a wooden axe if not present
        if (!inv.find(i => i.name === 'wooden_axe')) {
          await craftItem('wooden_axe', 1);
        }
        const OAK_LEAVES = ['oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves', 'acacia_leaves', 'dark_oak_leaves', 'mangrove_leaves', 'cherry_leaves'];
        let leafBlock = bot.findBlock({
          matching: b => OAK_LEAVES.includes(b.name),
          maxDistance: 32
        });
        if (!leafBlock) {
          // Explore to find trees if none nearby
          const pos = await exploreUntil('north', 30, () => {
            const b = bot.findBlock({
              matching: b => OAK_LEAVES.includes(b.name),
              maxDistance: 32
            });
            return b ? b.position : null;
          });
          if (!pos) return; // No leaves found after exploring, give up for now.
          leafBlock = bot.findBlock({
            matching: b => OAK_LEAVES.includes(b.name),
            maxDistance: 32
          });
        }
        if (leafBlock) {
          // Equip axe if available, otherwise equip anything to mine leaves
          const axe = inv.find(i => i.name.includes('_axe'));
          if (axe) {
            await bot.equip(axe, 'hand');
          } else {
            // If no axe (e.g., ran out of wood), just use hand
            const anyItem = inv[0]; // Equip first item in inventory
            if (anyItem) await bot.equip(anyItem, 'hand');
          }
          await mineBlock(leafBlock.name, 5); // Mine a few leaves, hoping for apples
          return; // After attempting to get apples, re-evaluate next tick.
        }
      }

      // If no berries and no way to get apples, consider killing passive mobs.
      // This requires a weapon. Craft a wooden sword if possible.
      if (hasLogs && hasLogs.count >= 2) {
        // Need 2 logs for planks + stick for sword
        // Crafting table should be handled above.
        if (!inv.find(i => i.name === 'wooden_sword')) {
          await craftItem('wooden_sword', 1);
        }
        const sword = inv.find(i => i.name.includes('_sword'));
        if (sword) {
          await bot.equip(sword, 'hand');
          const passiveMob = bot.nearestEntity(e => e.type === 'animal' && e.name !== 'bat' && e.name !== 'squid');
          if (!passiveMob) { console.log("Entity not found"); return; }
          if (passiveMob) {
            await killMob(passiveMob.name, 10000); // Try to kill for raw meat
            return; // After attempting to kill, re-evaluate next tick.
          } else {
            // No passive mobs nearby, explore
            await exploreUntil('north', 15, () => {
              const mob = bot.nearestEntity(e => e.type === 'animal' && e.name !== 'bat' && e.name !== 'squid');
              if (!mob) { console.log("Entity not found"); return; }
              return mob ? mob.position : null;
            });
            return; // Re-evaluate after exploring.
          }
        }
      }

      // Final fallback: if nothing else, just try to move to a safe spot or explore
      // The `walkToTheNearestShore` skill is useful if the bot is in water.
      // Given the current state (in water, low health), this is a good immediate action.
      await walkToTheNearestShore(bot);
    }
  }
}