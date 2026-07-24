async function walkToCraftingTable(bot) {
  const targetX = 24;
  const targetY = 68;
  const targetZ = -60;

  // Move to the specified crafting_table coordinates with a range of 0 to ensure exact arrival.
  await moveTo(targetX, targetY, targetZ, 0, 30);
}