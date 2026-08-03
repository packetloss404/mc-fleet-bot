async function consumeRottenFlesh(bot) {
  let rottenFleshConsumed = 0;
  const targetConsumption = 2;
  while (rottenFleshConsumed < targetConsumption && bot.food < 20) {
    const rottenFlesh = bot.inventory.items().find(i => i.name === 'rotten_flesh');
    if (!rottenFlesh || rottenFlesh.count === 0) {
      // No more rotten flesh to consume
      return;
    }
    await bot.equip(rottenFlesh, 'hand');
    await Promise.race([bot.consume(), new Promise(r => setTimeout(r, 5000)) // Cap consume call to 5 seconds
    ]);
    rottenFleshConsumed++;
    // Wait a bit for hunger to update in bot state, if needed.
    // The bot.consume() should handle this implicitly, but a small delay can help if state is slow.
    await bot.waitForTicks(5);
  }
}