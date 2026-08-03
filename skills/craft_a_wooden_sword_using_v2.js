async function craftWoodenSword(bot) {
  // Move to the crafting table at 64,74,28.
  await moveTo(64, 74, 28, 1, 10);

  // Check for oak planks (need 2)
  let oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  if (!oakPlanks || oakPlanks.count < 2) {
    // We need more oak planks.
    // First, check if we have oak logs to craft planks.
    let oakLogs = bot.inventory.items().find(item => item.name === 'oak_log');
    if (oakLogs && oakLogs.count > 0) {
      const neededPlanks = 2 - (oakPlanks?.count || 0);
      const planksToCraft = Math.min(neededPlanks, oakLogs.count * 4);
      if (planksToCraft > 0) {
        await craftItem('oak_planks', planksToCraft);
      }
    }
    // Re-check inventory for planks
    oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
    if (!oakPlanks || oakPlanks.count < 2) {
      // If still not enough, obtain more logs and craft planks.
      // Call obtainOakPlanks skill to get at least 4 planks if needed.
      // This skill ensures we have enough planks.
      await obtainOakPlanks(bot);
    }
  }

  // Check for sticks (need 1)
  let sticks = bot.inventory.items().find(item => item.name === 'stick');
  if (!sticks || sticks.count < 1) {
    // If not enough sticks, craft them. Each oak_plank yields 4 sticks.
    // We need 1 stick, so 1 oak plank is enough to craft 4 sticks.
    // Ensure we have at least 1 oak plank to craft sticks.
    oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
    if (!oakPlanks || oakPlanks.count < 1) {
      // If we don't even have 1 oak plank, obtain more.
      await obtainOakPlanks(bot); // This ensures we have planks.
      oakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
      if (!oakPlanks || oakPlanks.count < 1) {
        // Still no planks, cannot craft sticks.
        return;
      }
    }
    // Craft 4 sticks from 1 oak plank.
    await craftItem('stick', 4);
  }

  // Ensure we have the required materials before final craft attempt
  const finalOakPlanks = bot.inventory.items().find(item => item.name === 'oak_planks');
  const finalSticks = bot.inventory.items().find(item => item.name === 'stick');
  if (finalOakPlanks && finalOakPlanks.count >= 2 && finalSticks && finalSticks.count >= 1) {
    // Craft the wooden sword
    await craftItem('wooden_sword', 1);
  } else {
    // If we still don't have the materials, something went wrong in prerequisite steps.
    // The task will be retried.
    return;
  }
}