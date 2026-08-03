async function mineCoalOreWithWoodenPickaxe(bot) {
  const woodenPickaxe = bot.inventory.items().find(item => item.name === 'wooden_pickaxe');
  if (!woodenPickaxe) {
    // This task requires a wooden pickaxe, and we don't have one.
    // The previous critique mentioned "Inventory did not gain the expected items",
    // implying a previous mining task failed. We should not proceed without the tool.
    return;
  }
  const coalOreName = 'coal_ore';
  let coalBlock = bot.findBlock({
    matching: b => b.name === coalOreName,
    maxDistance: 32
  });
  if (!coalBlock) {
    // If no coal_ore is found nearby, explore to find some.
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === coalOreName,
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // Still no coal_ore found after exploring.
      return;
    }

    // After moving, re-check for the block in range.
    coalBlock = bot.findBlock({
      matching: b => b.name === coalOreName,
      maxDistance: 32
    });
    if (!coalBlock) {
      // Still no coal_ore in range after moving to the explored position.
      return;
    }
  }

  // Equip the wooden pickaxe before mining.
  await bot.equip(woodenPickaxe, 'hand');

  // Mine the specified amount of coal_ore.
  await mineBlock(coalBlock.name, 3);
}