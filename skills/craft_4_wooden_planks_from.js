async function craftAcaciaPlanks(bot) {
  const targetPlanksCount = 4;
  const logName = 'acacia_log';
  const plankName = 'acacia_planks';
  let currentLogs = bot.inventory.items().find(i => i.name === logName)?.count || 0;
  let currentPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;

  // Check if we have enough logs for the target planks
  // We need 1 log for 4 planks, so we just need 1 log.
  if (currentLogs < 1) {
    // This scenario implies we need to obtain more logs, but the task specifies "from 1 acacia log",
    // implying we *have* the log. If not, the task should be to *obtain* the log first.
    // For this specific task, if logs are missing, we cannot proceed.
    return;
  }

  // Craft the required planks
  // The craftItem primitive will automatically handle using a crafting table if required,
  // or crafting in the inventory if possible.
  const planksToCraft = targetPlanksCount; // We want exactly 4 planks

  if (planksToCraft > 0) {
    await craftItem(plankName, planksToCraft);
  }
}