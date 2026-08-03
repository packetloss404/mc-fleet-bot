/**
 * Return a stable textual identity for a Minecraft block state.
 *
 * Paper may serialize block properties in a different order from authored
 * operation files. Property order is not semantic, so exact-guard generators
 * must compare canonical states before deciding that a replacement is needed.
 */
export function canonicalBlockState(state) {
  const input = String(state).trim();
  const open = input.indexOf('[');
  if (open === -1) return input;
  if (!input.endsWith(']') || open === 0) {
    throw new Error(`invalid block state: ${input}`);
  }

  const block = input.slice(0, open);
  const rawProperties = input.slice(open + 1, -1);
  if (!rawProperties) return block;

  const properties = new Map();
  for (const rawProperty of rawProperties.split(',')) {
    const separator = rawProperty.indexOf('=');
    if (separator <= 0 || separator === rawProperty.length - 1) {
      throw new Error(`invalid block-state property: ${rawProperty}`);
    }
    const key = rawProperty.slice(0, separator).trim();
    const value = rawProperty.slice(separator + 1).trim();
    if (properties.has(key)) {
      throw new Error(`duplicate block-state property: ${key}`);
    }
    properties.set(key, value);
  }

  return `${block}[${
    [...properties.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join(',')
  }]`;
}

export function blockStatesEquivalent(left, right) {
  return canonicalBlockState(left) === canonicalBlockState(right);
}

/**
 * Identify the unsafe authored form that looks different byte-for-byte but
 * resolves to the same Minecraft block state after property canonicalization.
 *
 * Exact-text self-guards are intentionally excluded because
 * preflight_guarded_ops also consumes offline-only source-verification files
 * whose REPL source and replacement are deliberately identical.
 */
export function isPropertyOrderOnlyBlockStateNoop(source, replacement) {
  const authoredSource = String(source).trim();
  const authoredReplacement = String(replacement).trim();
  return authoredSource !== authoredReplacement
    && blockStatesEquivalent(authoredSource, authoredReplacement);
}
