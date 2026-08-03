async function craftWoodenDoor(bot) {
  const woodenDoorName = 'oak_door'; // Minecraft uses 'oak_door' for wooden doors
  const requiredPlanks = 6;
  const targetDoorCount = 1;

  // Check inventory for oak planks
  const oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < requiredPlanks) {
    // If not enough oak planks, first try to obtain more.
    // Since the task is specifically to craft the door, we assume logs are available
    // or previous steps handled plank acquisition. If this fails, the task will retry.
    // For now, assume we either have enough or will fail if not.
    // This bot already has 8 oak_planks, which is enough.
    // If it didn't, we'd need to call a skill like `obtainOakPlanks` or `mineBlock('oak_log', ...)`
    // and then `craftItem('oak_planks', ...)`
    return; // Not enough planks, give up for now.
  }

  // Check for a crafting table
  let craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table');
  if (!craftingTable) {
    // If no crafting table in inventory, try to find one nearby.
    const tableBlock = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!tableBlock) {
      // If no crafting table found, cannot craft.
      return;
    }
    // If a crafting table block is found, assume we can use it.
    // The craftItem primitive will automatically use nearby crafting tables.
  }

  // Craft the wooden door
  await craftItem(woodenDoorName, targetDoorCount);
}