async function craft8OakPlanksFrom2OakLogs(bot) {
  const targetPlanksCount = 8;
  const logsRequired = 2; // Specifically 2 oak logs as per the task

  let currentPlanks = bot.inventory.items().find(i => i.name === 'oak_planks')?.count || 0;
  let currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;

  // Check if we already have enough planks
  if (currentPlanks >= targetPlanksCount) {
    return; // Already have 8 or more planks, task complete
  }

  // Mine logs if necessary to reach the required 2 logs
  if (currentLogs < logsRequired) {
    const logsToMine = logsRequired - currentLogs;
    await mineBlock('oak_log', logsToMine);
    // Re-check logs after mining
    currentLogs = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
    if (currentLogs < logsRequired) {
      // If after mining, we still don't have enough logs, we cannot fulfill the task.
      return;
    }
  }

  // Craft planks from available logs until target is met
  // We need to craft exactly targetPlanksCount - currentPlanks
  const planksToCraft = targetPlanksCount - currentPlanks;
  if (planksToCraft > 0) {
    // Ensure we have enough logs for the planks we need to craft
    // 1 oak_log makes 4 oak_planks.
    const actualLogsNeededForCrafting = Math.ceil(planksToCraft / 4);
    if (currentLogs < actualLogsNeededForCrafting) {
      // This scenario should ideally not happen if logsRequired was handled correctly,
      // but it's a safeguard.
      // If the task specified "from 2 oak logs", and we have 2, then we should be able to make 8.
      return;
    }
    await craftItem('oak_planks', planksToCraft);
  }
}