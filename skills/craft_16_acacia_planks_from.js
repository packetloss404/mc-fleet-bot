async function craftAcaciaPlanks(bot) {
  const targetPlanksCount = 16;
  const logName = 'acacia_log';
  const plankName = 'acacia_planks';
  let currentPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;
  if (currentPlanks >= targetPlanksCount) {
    return; // Already have enough planks
  }
  let acaciaLogs = bot.inventory.items().find(i => i.name === logName);

  // Check if we have enough logs
  if (!acaciaLogs || acaciaLogs.count * 4 < targetPlanksCount) {
    // This task specifically states "from 4 acacia logs", implying they are already present.
    // If not enough, it means the prerequisite wasn't met, or the inventory state is wrong.
    // For this specific task, we assume the 4 logs are available.
    // If we needed to mine, we would add mineBlock('acacia_log', ...) here.
    return;
  }

  // Craft planks from available logs
  const planksToCraft = Math.min(acaciaLogs.count * 4, targetPlanksCount - currentPlanks);
  if (planksToCraft > 0) {
    await craftItem(plankName, planksToCraft);
  }
}