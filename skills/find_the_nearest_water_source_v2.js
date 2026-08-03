async function findTheNearestWaterSource(bot) {
  let waterBlock = bot.findBlock({
    matching: b => b.name === 'water',
    maxDistance: 32
  });
  if (!waterBlock) {
    // If no water block found nearby, explore until one is found
    const pos = await exploreUntil('north', 30, () => {
      const b = bot.findBlock({
        matching: b => b.name === 'water',
        maxDistance: 32
      });
      if (!b) { console.log("Block not found"); return; }
      return b ? b.position : null;
    });
    if (!pos) {
      // Still no water found after exploring
      return;
    }

    // After exploring, re-check for the nearest water block
    waterBlock = bot.findBlock({
      matching: b => b.name === 'water',
      maxDistance: 32
    });
    if (!waterBlock) {
      // Should not happen if pos was found, but as a safeguard
      return;
    }
  }

  // Move to a position near the water block, specifically to its edge.
  // We want to be on land next to water for farming, not inside the water.
  // Find a block adjacent to the water that is not water itself.
  const waterPos = waterBlock.position;
  let targetLandPosition = null;

  // Check 8 surrounding blocks at the same Y level as the water
  // or slightly above (if water is at Y, check Y and Y+1)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue; // Skip the water block itself

      const checkPos = waterPos.offset(dx, 0, dz);
      const blockAtCheckPos = bot.blockAt(checkPos);

      // We want to move to a non-water block adjacent to the water source.
      // Also check one block above the water level for land.
      if (blockAtCheckPos && blockAtCheckPos.name !== 'water' && blockAtCheckPos.name !== 'air') {
        targetLandPosition = checkPos;
        break;
      }
      const blockAboveWater = bot.blockAt(checkPos.offset(0, 1, 0));
      if (blockAboveWater && blockAboveWater.name !== 'water' && blockAboveWater.name !== 'air') {
        targetLandPosition = checkPos.offset(0, 1, 0);
        break;
      }
    }
    if (targetLandPosition) break;
  }
  if (targetLandPosition) {
    await moveTo(targetLandPosition.x, targetLandPosition.y, targetLandPosition.z, 1, 30);
  } else {
    // If no suitable adjacent land block is found, just move to the water block itself
    // The bot's internal logic will handle surfacing if it lands in water.
    await moveTo(waterPos.x, waterPos.y, waterPos.z, 1, 30);
  }
}