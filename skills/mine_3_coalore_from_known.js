async function mineThreeCoalOreAtLocation(bot) {
  const targetX = -11;
  const targetY = 61;
  const targetZ = -335;
  const count = 3;
  const blockName = 'coal_ore';

  // Check for any pickaxe
  const pickaxe = bot.inventory.items().find(item => item.name.includes('pickaxe'));
  if (!pickaxe) {
    // If no pickaxe, the bot cannot mine.
    throw new Error('No pickaxe found in inventory to mine coal_ore. Please craft one first.');
  }

  // Move to the target location. Adding a small range for flexibility.
  await moveTo(targetX, targetY, targetZ, 1, 60);

  // Equip the available pickaxe
  await bot.equip(pickaxe, 'hand');

  // Mine the coal_ore
  await mineBlock(blockName, count);
}