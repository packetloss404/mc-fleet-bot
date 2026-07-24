async function explore50BlocksToTheSouth(bot) {
  const targetX = bot.entity.position.x;
  const targetY = bot.entity.position.y;
  const targetZ = bot.entity.position.z + 50; // South is positive Z

  await moveTo(targetX, targetY, targetZ, 2, 30);
}