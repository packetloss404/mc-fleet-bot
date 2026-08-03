async function craftAcaciaPlanks(bot) {
  const targetPlanksCount = 24;
  const logType = 'acacia_log';
  const plankType = 'acacia_planks';
  let currentPlanks = bot.inventory.items().find(i => i.name === plankType)?.count || 0;
  if (currentPlanks >= targetPlanksCount) {
    return; // Already have enough planks
  }
  const requiredLogs = Math.ceil((targetPlanksCount - currentPlanks) / 4); // 1 log makes 4 planks
  let availableLogs = bot.inventory.items().find(i => i.name === logType)?.count || 0;

  // We need to craft exactly 24 planks, which means using 6 logs.
  // The critique suggests `craft(4, 'acacia_planks', 6)`, meaning 4 items of 'acacia_planks' with 6 logs.
  // However, the `craftItem` primitive expects the total count of the *result* item.
  // So, `craftItem('acacia_planks', 24)` is the correct way to craft 24 planks.

  if (availableLogs < requiredLogs) {
    // This scenario should not happen based on the current inventory (7 logs, need 6)
    // but good practice to handle.
    // Since the task specifies "from 6 acacia logs", we assume logs are available.
    // If we were to mine, we'd need to explore first, as the previous failure indicated.
    // For this specific task, we have enough logs.
    return; // Not enough logs to craft the target amount.
  }

  // Craft the required number of planks
  await craftItem(plankType, targetPlanksCount);
}