async function craftSticksFromOakPlanksAtTable(bot) {
  const targetSticksCount = 4;
  const planksRequired = 2; // 2 oak planks for 4 sticks

  // Check if we have enough oak planks
  const inv = bot.inventory.items();
  const oakPlanks = inv.find(i => i.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < planksRequired) {
    // If not enough planks, obtain them. The obtainOakPlanks skill crafts up to 4 planks.
    // Since we already have some, the skill might not run, or it might just verify.
    // The current inventory has 4 planks, so this check should pass.
    await obtainOakPlanks(bot); // This skill aims for 4 planks, which is enough.
    const updatedPlanks = bot.inventory.items().find(i => i.name === 'oak_planks');
    if (!updatedPlanks || updatedPlanks.count < planksRequired) {
      // Still not enough planks, cannot proceed.
      return;
    }
  }

  // Move to the crafting table location
  const craftingTableX = 45;
  const craftingTableY = 64;
  const craftingTableZ = -230;
  await moveTo(craftingTableX, craftingTableY, craftingTableZ, 1, 10);

  // Craft 4 sticks using the crafting table
  await craftItem('stick', targetSticksCount);
}