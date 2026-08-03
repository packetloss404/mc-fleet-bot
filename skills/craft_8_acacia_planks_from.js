async function craftAcaciaPlanks(bot) {
  const targetPlanksCount = 8;
  const logName = 'acacia_log';
  const plankName = 'acacia_planks';
  let currentAcaciaPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;
  if (currentAcaciaPlanks >= targetPlanksCount) {
    return; // Already have enough planks
  }
  const acaciaLogs = bot.inventory.items().find(i => i.name === logName);
  if (!acaciaLogs || acaciaLogs.count < targetPlanksCount / 4) {
    // This task specifically says "from your 2 acacia logs".
    // If we don't have enough, we cannot fulfill the task as stated.
    // However, the current inventory has 2 acacia_logs, which is exactly enough.
    // If this were a more general task, we would mine logs here.
    return;
  }
  const planksToCraft = targetPlanksCount - currentAcaciaPlanks;
  if (planksToCraft > 0) {
    await craftItem(plankName, planksToCraft);
  }
}