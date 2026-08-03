/**
 * DesignValidator — Phase 4 sanity check for LLM-generated block plans.
 *
 * The LLM returns a JSON block plan we can't blindly trust; this validator
 * gives the LlmDesigner an objective gate before we cache the plan or hand it
 * to BuildCoordinator. The three current checks are:
 *
 *   1. Footprint fits within the declared dimensions (no blocks beyond w/h/d).
 *   2. No negative coordinates — block plans live in local 0..(dim-1) space.
 *   3. No excessive floating blocks — every non-foundation block needs at least
 *      one neighbor block, the ground (y == 0), or a structural support tag.
 *
 * On failure we return human-readable reasons so the designer's retry loop
 * can include them in the next prompt (best-effort self-correction).
 */
import type { BlockPlan, BlockPlanEntry } from './LlmDesigner';

export interface ValidationResult {
  ok: boolean;
  reasons?: string[];
}

/** Up to this many floating-block reports before we collapse them into a count. */
const MAX_REPORTED_FLOATERS = 5;

/**
 * Some blocks are explicitly OK to "float" — torches, banners, doors, signs
 * etc. attach to neighbors but we don't want a strict 6-neighbor check
 * flagging them when the neighbor exists in the same plan.
 */
const STRUCTURAL_TAGS = new Set([
  'torch',
  'wall_torch',
  'lantern',
  'sign',
  'banner',
  'ladder',
  'vine',
  'door',
  'trapdoor',
  'button',
  'lever',
  'rail',
  'painting',
  'item_frame',
  'glow_lichen',
]);

/** Fluids that spread if not fully boxed in. */
const FLUIDS = new Set(['water', 'lava', 'flowing_water', 'flowing_lava']);

/** Fittings — contents, not fabric. A plan made mostly of these is furniture, not a
 *  building. Matched as substrings of the bare block name. */
const FITTING_TAGS = [
  'chest', 'barrel', 'furnace', 'smoker', 'bed', 'crafting_table', 'anvil', 'loom',
  'lectern', 'bookshelf', 'brewing_stand', 'cauldron', 'enchanting_table', 'grindstone',
  'smithing_table', 'cartography_table', 'fletching_table', 'stonecutter', 'composter',
  'campfire', 'hay_block', 'decorated_pot', 'flower_pot', 'item_frame', 'armor_stand',
];
/** Fabric — walls, floors, roofs. The blocks that make an enclosure. */
const FABRIC_TAGS = [
  'planks', 'log', 'stripped_', 'bricks', 'brick', 'stone', 'cobble', 'deepslate',
  'andesite', 'diorite', 'granite', 'sandstone', 'terracotta', 'concrete', 'wool',
  'stairs', 'slab', 'wall', 'fence', 'glass', 'dirt', 'grass_block', 'tuff', 'calcite',
  'quartz', 'copper', 'blackstone', 'basalt', 'prismarine', 'purpur', 'nether_brick',
];
const hasTag = (name: string, tags: string[]): boolean => {
  const lc = name.toLowerCase().replace(/^minecraft:/, '');
  return tags.some((t) => lc.includes(t));
};

/**
 * Block shapes that do NOT hold a fluid back.
 *
 * This list is the whole point of the containment check, and it is deliberately
 * aggressive. Stairs, slabs, fences, panes, walls and bars all look like walls to
 * a designer but they are WATERLOGGABLE: put water against one and it does not get
 * dammed, the block silently absorbs it and becomes a permanent hidden source.
 *
 * That is not hypothetical. Ravensreach's LLM well design placed 5 uncontained
 * water sources ringed by dark_oak_stairs. The water waterlogged 13 of those stairs
 * plus 2 stone_brick_slabs, and those 15 blocks then fed ~449 blocks of flow across
 * the town plaza indefinitely — surviving every drain, because
 * `execute if block ... minecraft:water` does not match a waterlogged block and
 * `fill ... air replace water` cannot remove one. Only a FULL solid block contains
 * a fluid.
 */
const NON_CONTAINING_SHAPES = [
  '_stairs', '_slab', '_fence', '_pane', '_wall', '_bars', '_trapdoor', '_door',
  '_gate', '_carpet', '_button', '_plate', '_rail', '_sign', '_banner', '_head',
  '_candle', '_torch', '_sapling', '_pot', 'ladder', 'chain', 'lantern', 'vine',
  'scaffolding', 'glass_pane', 'iron_bars', 'grass', 'fern', 'flower', 'lily',
  'snow', 'cobweb', 'air',
];

function bareName(name: string): string {
  return name.toLowerCase().replace(/^minecraft:/, '').replace(/\[.*$/, '');
}

function isFluid(name: string): boolean {
  return FLUIDS.has(bareName(name));
}

/** True only for blocks that actually dam a fluid — a full cube. */
function isFullSolid(name: string): boolean {
  const n = bareName(name);
  if (FLUIDS.has(n)) return false;
  return !NON_CONTAINING_SHAPES.some((s) => n.endsWith(s) || n === s || n.includes(s));
}

/** True for blocks that will WATERLOG rather than dam, if placed against a fluid. */
function isWaterloggable(name: string): boolean {
  const n = bareName(name);
  if (FLUIDS.has(n)) return false;
  return ['_stairs', '_slab', '_fence', '_pane', '_wall', '_bars', '_trapdoor', 'ladder', 'chain', 'scaffolding']
    .some((s) => n.endsWith(s) || n.includes(s));
}

function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function isStructuralAttachment(name: string): boolean {
  const lc = name.toLowerCase().replace(/^minecraft:/, '');
  for (const tag of STRUCTURAL_TAGS) {
    if (lc.includes(tag)) return true;
  }
  return false;
}

export function validate(plan: BlockPlan): ValidationResult {
  const reasons: string[] = [];

  if (!plan || typeof plan !== 'object') {
    return { ok: false, reasons: ['plan is missing or not an object'] };
  }

  const dims = plan.dimensions;
  if (
    !dims ||
    typeof dims.w !== 'number' ||
    typeof dims.h !== 'number' ||
    typeof dims.d !== 'number' ||
    dims.w <= 0 ||
    dims.h <= 0 ||
    dims.d <= 0
  ) {
    return { ok: false, reasons: ['plan.dimensions must be {w,h,d} with positive integers'] };
  }

  if (!Array.isArray(plan.blocks) || plan.blocks.length === 0) {
    return { ok: false, reasons: ['plan.blocks must be a non-empty array'] };
  }

  // Pass 1: bounds + negative coords + index the occupancy map.
  const occupancy = new Set<string>();
  let outOfBounds = 0;
  let negativeCoords = 0;
  for (const b of plan.blocks) {
    if (
      !b ||
      typeof b.x !== 'number' ||
      typeof b.y !== 'number' ||
      typeof b.z !== 'number' ||
      typeof b.name !== 'string' ||
      b.name.length === 0
    ) {
      reasons.push('every block must have numeric x/y/z and a non-empty name');
      // Don't bother continuing — every later check assumes well-typed entries.
      return { ok: false, reasons };
    }
    if (b.x < 0 || b.y < 0 || b.z < 0) negativeCoords++;
    if (b.x >= dims.w || b.y >= dims.h || b.z >= dims.d) outOfBounds++;
    occupancy.add(blockKey(b.x, b.y, b.z));
  }
  if (negativeCoords > 0) {
    reasons.push(`${negativeCoords} block(s) had negative coordinates`);
  }
  if (outOfBounds > 0) {
    reasons.push(`${outOfBounds} block(s) fall outside dims ${dims.w}x${dims.h}x${dims.d}`);
  }

  // Pass 2: floating-block check, by CONNECTIVITY TO THE GROUND.
  //
  // This previously asked only "does this block have any 6-neighbour in the plan?".
  // That is a local test, and a cluster which touches ITSELF passes it trivially: a
  // column of four chests is four blocks each supported by the next, reaching the
  // ground nowhere. Stacked barrels, furnace banks and chest walls all validated
  // cleanly while hanging in mid-air.
  //
  // That is not hypothetical. It is how the Ravensreach annex was built: the town
  // brain designed a forge, an inn, a wizard tower and a smeltery, the fittings were
  // placed, the shells never were, and this check passed every one of them. The
  // operator found furniture floating in the sky; a debris sweep then classified one
  // of those buildings as junk and destroyed it.
  //
  // The correct question is whether a block is reachable from the ground. Flood-fill
  // "grounded" up from every y === 0 block through 6-connected neighbours, then
  // anything the flood never reached is genuinely floating — regardless of how much
  // it touches its own kind. This is the same test find_floating.mjs applies to the
  // world after the fact; applying it to the PLAN stops the build happening at all.
  const grounded = new Set<string>();
  const stack: Array<[number, number, number]> = [];
  for (const b of plan.blocks) {
    if (b.y === 0) {
      const k = blockKey(b.x, b.y, b.z);
      if (!grounded.has(k)) {
        grounded.add(k);
        stack.push([b.x, b.y, b.z]);
      }
    }
  }
  const N6: Array<[number, number, number]> = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (stack.length) {
    const [x, y, z] = stack.pop()!;
    for (const [dx, dy, dz] of N6) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const k = blockKey(nx, ny, nz);
      if (occupancy.has(k) && !grounded.has(k)) {
        grounded.add(k);
        stack.push([nx, ny, nz]);
      }
    }
  }

  const floaters: BlockPlanEntry[] = [];
  for (const b of plan.blocks) {
    if (b.y === 0) continue;
    // Attachments (torches, signs, lanterns) stay unconditionally exempt. The reason
    // is deliberate: the LLM routinely omits the wall a torch hangs on because that
    // wall already exists in the world, and rejecting the plan for it would be a false
    // alarm.
    //
    // I briefly made this conditional on the attachment touching a GROUNDED block, to
    // stop a lantern "laundering" a floating beam. That was unnecessary — exempting
    // the lantern does not exempt the beam, which is tested independently and still
    // fails. The stricter rule bought nothing and broke a legitimate case.
    if (isStructuralAttachment(b.name)) continue;
    if (!grounded.has(blockKey(b.x, b.y, b.z))) floaters.push(b);
  }
  if (floaters.length > 0) {
    // Allow a tiny number of "decoration" floaters (lanterns hung from a
    // neighbor block we forgot to include); flag anything substantial. The
    // 2% threshold catches obvious LLM hallucinations without nuking
    // otherwise-good plans.
    const ratio = floaters.length / plan.blocks.length;
    const overLimit = floaters.length > 3 || ratio > 0.02;
    if (overLimit) {
      const sample = floaters
        .slice(0, MAX_REPORTED_FLOATERS)
        .map((b) => `${b.name}@(${b.x},${b.y},${b.z})`)
        .join(', ');
      const suffix = floaters.length > MAX_REPORTED_FLOATERS ? ` (+${floaters.length - MAX_REPORTED_FLOATERS} more)` : '';
      reasons.push(`${floaters.length} floating block(s) without support: ${sample}${suffix}`);
    }
  }

  // Pass 2b: a building must have FABRIC, not just contents.
  //
  // Ground-connectivity alone does not catch the second half of the Ravensreach
  // failure. A chest wall standing on soil is grounded and still is not a building:
  // the brain produced designs that were almost entirely furnaces, barrels, chests and
  // beds, with no walls, floor or roof around them, and they were pasted as-is.
  //
  // So: once a plan carries a meaningful number of fittings, require that fabric
  // actually dominates. The 1:1 floor is deliberately generous — a dense workshop is a
  // legitimate design — but "40 furnaces and nothing else" is not, and that is what
  // this rejects.
  const fittings = plan.blocks.filter((b) => hasTag(b.name, FITTING_TAGS)).length;
  const fabric = plan.blocks.filter((b) => hasTag(b.name, FABRIC_TAGS)).length;
  if (fittings >= 8 && fabric < fittings) {
    reasons.push(
      `plan is furniture, not a building: ${fittings} fitting block(s) but only ${fabric} ` +
      `structural block(s). A design with contents must also have the walls, floor and ` +
      `roof that enclose them.`,
    );
  }

  // Pass 3: fluid containment. A fluid block must be boxed in by FULL SOLID blocks
  // on its four horizontal faces and below, or it escapes the footprint the moment
  // it is pasted — and on flat ground it sheets outward indefinitely.
  const byKey = new Map<string, BlockPlanEntry>();
  for (const b of plan.blocks) byKey.set(blockKey(b.x, b.y, b.z), b);

  const uncontained: Array<{ b: BlockPlanEntry; open: string[] }> = [];
  let waterlogRisk = 0;
  for (const b of plan.blocks) {
    if (!isFluid(b.name)) continue;
    const faces: Array<[string, number, number, number]> = [
      ['-x', b.x - 1, b.y, b.z], ['+x', b.x + 1, b.y, b.z],
      ['-z', b.x, b.y, b.z - 1], ['+z', b.x, b.y, b.z + 1],
      ['below', b.x, b.y - 1, b.z],
    ];
    const open: string[] = [];
    for (const [label, nx, ny, nz] of faces) {
      // y === -1 is the ground the schematic sits on, which does contain.
      if (label === 'below' && ny < 0) continue;
      const nb = byKey.get(blockKey(nx, ny, nz));
      if (!nb) { open.push(label); continue; }          // nothing there → escapes
      if (isFluid(nb.name)) continue;                    // fluid body, fine
      if (isWaterloggable(nb.name)) { waterlogRisk++; open.push(`${label}:waterloggable(${bareName(nb.name)})`); continue; }
      if (!isFullSolid(nb.name)) open.push(`${label}:non-solid(${bareName(nb.name)})`);
    }
    if (open.length) uncontained.push({ b, open });
  }

  if (uncontained.length > 0) {
    const sample = uncontained
      .slice(0, MAX_REPORTED_FLOATERS)
      .map((u) => `${bareName(u.b.name)}@(${u.b.x},${u.b.y},${u.b.z}) open:[${u.open.join(' ')}]`)
      .join('; ');
    const suffix = uncontained.length > MAX_REPORTED_FLOATERS
      ? ` (+${uncontained.length - MAX_REPORTED_FLOATERS} more)` : '';
    reasons.push(
      `${uncontained.length} uncontained fluid block(s) — a fluid needs FULL SOLID blocks on all four sides and below, ` +
      `and stairs/slabs/fences/panes do NOT count because they waterlog instead of damming: ${sample}${suffix}`,
    );
  }
  if (waterlogRisk > 0) {
    reasons.push(
      `${waterlogRisk} fluid face(s) rest against waterloggable blocks; those will absorb the fluid and become ` +
      `permanent hidden sources that neither a water probe nor "replace water" can find or remove`,
    );
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * Remove fluid blocks that `validate` would reject as uncontained, returning a new
 * plan plus what was dropped.
 *
 * Rejecting a whole design over its water is usually the wrong trade: the LLM's
 * Ravensreach well was a perfectly good 66-block well whose only defect was 5
 * unboxed water sources. Stripping them yields a dry but correct well, which beats
 * both a retry loop and a well that floods the town square.
 *
 * Callers that would rather have containment than no water should feed
 * `validate()`'s reasons back into the designer prompt and only fall back to this.
 */
export function stripUncontainedFluids(plan: BlockPlan): { plan: BlockPlan; removed: BlockPlanEntry[] } {
  if (!plan || !Array.isArray(plan.blocks)) return { plan, removed: [] };
  const byKey = new Map<string, BlockPlanEntry>();
  for (const b of plan.blocks) byKey.set(blockKey(b.x, b.y, b.z), b);

  const contained = (b: BlockPlanEntry): boolean => {
    const faces: Array<[number, number, number, boolean]> = [
      [b.x - 1, b.y, b.z, false], [b.x + 1, b.y, b.z, false],
      [b.x, b.y, b.z - 1, false], [b.x, b.y, b.z + 1, false],
      [b.x, b.y - 1, b.z, true],
    ];
    for (const [nx, ny, nz, isBelow] of faces) {
      if (isBelow && ny < 0) continue;
      const nb = byKey.get(blockKey(nx, ny, nz));
      if (!nb) return false;
      if (isFluid(nb.name)) continue;
      if (!isFullSolid(nb.name)) return false;
    }
    return true;
  };

  const removed: BlockPlanEntry[] = [];
  const kept = plan.blocks.filter((b) => {
    if (!isFluid(b.name)) return true;
    if (contained(b)) return true;
    removed.push(b);
    return false;
  });
  return { plan: { ...plan, blocks: kept }, removed };
}
