function baseBlockName(state) {
  return String(state).split('[', 1)[0];
}

export function compareOperationOrder(left, right) {
  return (
    left.phase - right.phase
    || left.scope.localeCompare(right.scope)
    || left.role.localeCompare(right.role)
    // Clear top-down so removing a support block cannot make a guarded plant,
    // torch, rail, or other dependent block pop before its own exact removal.
    || (
      baseBlockName(left.replacement) === 'minecraft:air'
      && baseBlockName(right.replacement) === 'minecraft:air'
        ? right.y1 - left.y1
        : left.y1 - right.y1
    )
    || left.z1 - right.z1
    || left.x1 - right.x1
  );
}

