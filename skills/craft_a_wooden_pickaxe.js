async function craftWoodenPickaxe(bot) {
  const existingPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (existingPickaxe) return;
  let table = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!table) {
    const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (!tableItem) {
      await craftItem('crafting_table', 1);
    }
    const referenceBlock = bot.findBlock({
      matching: b => b.name !== 'air' && b.name !== 'water' && b.boundingBox === 'block',
      maxDistance: 4
    });
    const pos = referenceBlock ? referenceBlock.position.offset(0, 1, 0) : bot.entity.position.offset(1, 0, 0).floored();
    await placeItem('crafting_table', pos.x, pos.y, pos.z);
    table = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
  }
  if (table) {
    await moveTo(table.position.x, table.position.y, table.position.z, 3);
  }
  await craftItem('wooden_pickaxe', 1);
  const finalPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (!finalPickaxe) {
    throw new Error('Wooden pickaxe not found in inventory after crafting.');
  }
}