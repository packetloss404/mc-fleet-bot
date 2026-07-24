async function craft20OakPlanks(bot) {
  const targetPlanksCount = 20;
  let currentPlanks = bot.inventory.items().find(i => i.name === 'oak_planks')?.count || 0;

  // Calculate how many more planks are needed
  const planksNeeded = targetPlanksCount - currentPlanks;
  if (planksNeeded <= 0) {
    // Already have enough or more planks
    return;
  }

  // Check how many oak logs are available
  const oakLogs = bot.inventory.items().find(i => i.name === 'oak_log');
  const availableLogs = oakLogs ? oakLogs.count : 0;

  // Each oak log yields 4 oak planks.
  // Calculate how many planks we can craft with available logs
  const craftablePlanksFromLogs = availableLogs * 4;

  // Determine the actual number of planks to craft
  // It's the minimum of what's needed and what can be crafted from available logs
  const planksToCraft = Math.min(planksNeeded, craftablePlanksFromLogs);
  if (planksToCraft > 0) {
    await craftItem('oak_planks', planksToCraft);
  } else {
    // If we need planks but can't craft any (e.g., no logs), we might need to mine more.
    // However, the task specifically says "from 5 oak logs" and the bot has 5 logs.
    // If this branch is reached, it implies an issue with log availability or calculation.
    // For this specific task, we assume logs are available as per the prompt.
    // If there were no logs, we'd need to mine them first, but that's not the current task's focus.
  }
}