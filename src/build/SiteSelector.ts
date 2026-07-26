import { logger } from '../util/logger';

/**
 * Auto-flat build site selection.
 *
 * Given a desired schematic footprint and a probe handle (a connected bot we
 * can use to read world blocks via IPC), search a spiral of candidate origins
 * around the probe's current position and pick the flattest, cleanest one.
 *
 * This replaces the old default of "place the schematic wherever the user
 * typed coordinates" — which dropped buildings into trees, off cliffs, and
 * underwater.
 *
 * WATER, specifically: for a long time this file claimed to avoid underwater
 * placement but did not, and the failure mode was the opposite of random — the
 * selector was ATTRACTED to water. `isSolidGround()` classifies fluid as
 * not-ground, so `topSolidY()` scans down through a lake and reports the lake
 * BED as the surface. A lake bed is the flattest terrain in Minecraft, so it beat
 * real ground on the flatness test; `originY = minY + 1` then put the build floor
 * one block above the bed; and the ground-layer fluid check at `originY - 1`
 * sampled the bed itself (sand/dirt), so FLUID_PENALTY often never even fired.
 * A town well was sited in a lake this way. Fluid is now a HARD REJECT on two
 * axes — submerged columns (see maxSubmergedCols) and fluid in the footprint
 * (see maxFluidBlocks) — rather than a score penalty that a good flatness
 * reading could outweigh.
 */

export interface SiteCandidate {
  origin: { x: number; y: number; z: number };
  score: number;
  confidence: number;
  reasons: string[];
  /** Range of column tops in the footprint, in blocks. */
  flatnessRange: number;
  /** Counts surfaced as build-prep cost hints. */
  obstacles: { vegetation: number; logs: number; fluid: number; artificial: number };
}

export interface SiteSelectorOptions {
  /** Radius (blocks) of the first-pass spiral. Default 24. */
  radius?: number;
  /** Radius for the second-pass fallback. Default 48. */
  fallbackRadius?: number;
  /** Step between candidate origins in the spiral. Default 4. */
  step?: number;
  /** Max footprint Y range tolerated. Default 2 (small builds), 4 (>16). */
  maxYDelta?: number;
  /** Skip this many candidates if you have a budget. Default 24. */
  maxCandidates?: number;
  /**
   * Per-probe wall-clock timeout in ms. Any individual getBlockAt IPC call
   * that does not resolve within this window is treated as a null (unreadable)
   * result and search continues. Default 1500 ms.
   *
   * A healthy getBlockAt returns in <100 ms; 1500 ms gives plenty of headroom
   * for a temporarily busy server without ever blocking the search for more
   * than 1.5 s per block.
   */
  probeTimeoutMs?: number;
  /**
   * Overall wall-clock deadline for the entire selectBuildSite call in ms.
   * Default 60 000 ms (1 minute).
   *
   * When the deadline is reached:
   *  - If at least one qualifying candidate has been found so far, that
   *    candidate (the best scored so far) is returned immediately.
   *  - If no qualifying candidate has been found yet, a descriptive Error is
   *    thrown so the caller can abort and retry rather than hanging forever.
   *
   * Throwing is intentional and safe — BuildCoordinator treats a thrown
   * startBuild as "abort and retry next tick", which is far better than an
   * unbounded hang.
   */
  deadlineMs?: number;
  /**
   * Maximum total number of individual block probe calls across the entire
   * search. Default 4000. Acts as a secondary hang-prevention guard.
   */
  maxProbes?: number;
  /**
   * Footprints of EXISTING buildings to keep clear of, as world-space x/z
   * rectangles (corner-origin: [x1,x2) × [z1,z2)). A candidate whose own
   * footprint — expanded by {@link spacingMargin} — intersects any of these is
   * rejected outright, BEFORE the terrain probe. Without this the selector only
   * dodged trees/water and happily stacked builds on the flattened pads of
   * earlier ones (a well ended up fully inside the town hall). Default [].
   */
  avoidRects?: Array<{ x1: number; x2: number; z1: number; z2: number }>;
  /**
   * Minimum clear gap (blocks) between a new footprint and any
   * {@link avoidRects} rectangle. The avoid rectangles are inflated by this
   * margin before the intersection test, so buildings get breathing room for
   * paths/yards instead of sitting flush. Default 5.
   */
  spacingMargin?: number;
  /**
   * How many sampled footprint columns may be SUBMERGED (have fluid standing
   * above the topmost solid block) before the candidate is rejected outright.
   * Default 0 — i.e. any submerged column disqualifies the site.
   *
   * This is a hard gate rather than a score penalty because the selector is
   * otherwise structurally ATTRACTED to water. `isSolidGround()` treats fluid as
   * not-ground, so `topSolidY()` scans straight down through a lake and returns
   * the LAKE BED; a lake is then the flattest terrain in Minecraft, sails through
   * the flatness test, and `originY = minY + 1` places the build floor one block
   * above the bed — underwater. Worse, the ground-layer probe at `originY - 1`
   * lands on the bed (sand/dirt) and so records no fluid at all, meaning the
   * FLUID_PENALTY frequently never fires for the very case it exists to catch.
   * A well was sited in a lake this way.
   */
  maxSubmergedCols?: number;
  /**
   * How many fluid blocks may appear in the footprint's obstacle scan before the
   * candidate is rejected. Default 0. Water inside a building footprint is
   * disqualifying, not something to price in at 20 points and build anyway.
   */
  maxFluidBlocks?: number;
}

/** True if the candidate footprint [seedX,seedX+sx) × [seedZ,seedZ+sz),
 *  inflated by `margin`, intersects any avoid rectangle. Cheap pre-probe gate. */
function intersectsAvoid(
  seedX: number,
  seedZ: number,
  size: { x: number; z: number },
  avoidRects: Array<{ x1: number; x2: number; z1: number; z2: number }>,
  margin: number,
): boolean {
  const ax1 = seedX - margin, ax2 = seedX + size.x + margin;
  const az1 = seedZ - margin, az2 = seedZ + size.z + margin;
  for (const r of avoidRects) {
    if (ax1 < r.x2 && ax2 > r.x1 && az1 < r.z2 && az2 > r.z1) return true;
  }
  return false;
}

/**
 * Minimal block shape we need from the probe. Matches WorkerHandle.getBlockAt
 * return value: { name: string; boundingBox?: string }.
 */
interface ProbedBlock {
  name: string;
  boundingBox?: string;
}

/** A getBlockAt(x, y, z) -> ProbedBlock | null function — typically WorkerHandle.getBlockAt. */
export type BlockProbe = (x: number, y: number, z: number) => Promise<ProbedBlock | null>;

const DEFAULT_RADIUS = 24;
const DEFAULT_FALLBACK_RADIUS = 48;
const DEFAULT_STEP = 4;
// Natural terrain (even "flat" overworld) commonly has 4-6 block variance over
// a 30-block window, so the previous 2/4 tolerances rejected practically every
// realistic candidate around an LLM-designed town capital. The pre-job
// snapToGround + clearSite passes flatten the chosen site by up to ~4 blocks
// anyway, so loosening these is safe — and the alternative is "TownBrain
// rejects every candidate and the town never grows past hand-placed builds".
const DEFAULT_FLAT_TOL_SMALL = 4;
const DEFAULT_FLAT_TOL_LARGE = 8;
const DEFAULT_MAX_CANDIDATES = 24;
const DEFAULT_PROBE_TIMEOUT_MS = 1500;
// Sized so a single town-scale schematic (19x23 footprint, 12 high) can
// evaluate multiple candidates. 4000-probe / 60s budget was tuned when small
// hand-authored .schem files were the norm; LLM-designed buildings routinely
// exceed 400 columns and need ~10k probes per candidate evaluation.
const DEFAULT_DEADLINE_MS = 180_000;
// Per-candidate probing is now sparse (see COL_SAMPLE_TARGET), so each candidate
// costs ~1-2k probes instead of ~20k. Raise the global cap so the spiral can
// actually evaluate dozens of candidates and reach empty ground at the town
// periphery rather than giving up after one site on top of existing buildings.
const DEFAULT_MAX_PROBES = 60_000;

// Town-scale schematics have hundreds of footprint columns; probing every
// column over the full build height costs ~20k probes per candidate and blows
// the entire search budget on a single site (which, at a town capital, is
// usually on top of existing buildings). Instead, sample a sparse grid of
// ~COL_SAMPLE_TARGET columns and cap the obstacle scan to the first few blocks
// above the surface. Flatness and obstacle signals survive sampling, and the
// pre-job snapToGround + clearSite passes flatten/clear the chosen site anyway.
// Small footprints (area <= target) keep stride 1 → unchanged exhaustive scan.
const COL_SAMPLE_TARGET = 80;
const OBSTACLE_SCAN_HEIGHT = 6;

const SKY_CLEARANCE = 2;
const NEAR_FALLOFF = 12;

const VEG_PENALTY = 3;
const FLUID_PENALTY = 20;
/**
 * Ceiling on the TOTAL fluid penalty for one candidate.
 *
 * Fluid is now a hard reject by default (see maxFluidBlocks), so this only
 * applies when a caller has explicitly opted into building near water — a dock or
 * a bridge. Without a cap the opt-in was useless: a 5x5 footprint in a 4-deep
 * lake accumulates ~100 fluid hits = 2000 penalty against a base score of ~130,
 * so the site scored far below zero and was discarded by the `score > 0` gate
 * even though the caller had just said water was acceptable. Capped, the penalty
 * still expresses "prefer the drier of two options" without vetoing.
 */
const FLUID_PENALTY_CAP = 30;
const SPAWNER_PENALTY = 30;
const ARTIFICIAL_PENALTY = 50;
const ROOF_PENALTY = 5;

const VEG_PATTERN = /(_log|_leaves|sapling|grass$|fern|flower|vine|bush|mushroom|tulip|poppy|dandelion|orchid)/;
const FLUID_NAMES = new Set([
  'water', 'lava', 'flowing_water', 'flowing_lava',
]);
const PLAYER_BUILT_PATTERN = /planks$|bricks?$|concrete|glass|smooth_|polished_|_slab$|_stairs$|_door$|wool|carpet|fence|bookshelf/;
const LOG_PATTERN = /_log$|_wood$|^stripped_/;

// ---------------------------------------------------------------------------
// Timeout guard — local to this file, not imported from util.
// ---------------------------------------------------------------------------

/**
 * Race a probe call against a per-probe timeout.
 * If the probe does not resolve within `timeoutMs`, resolves to null so that
 * the search continues rather than blocking indefinitely on a stuck IPC call.
 */
function probeWithTimeout(
  probe: BlockProbe,
  x: number,
  y: number,
  z: number,
  timeoutMs: number,
): Promise<ProbedBlock | null> {
  return new Promise<ProbedBlock | null>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    probe(x, y, z).then(
      (result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(result);
        }
      },
      (_err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

function isVeg(b: ProbedBlock | null): boolean {
  return !!b && VEG_PATTERN.test(b.name);
}
function isLog(b: ProbedBlock | null): boolean {
  return !!b && LOG_PATTERN.test(b.name);
}
function isFluid(b: ProbedBlock | null): boolean {
  return !!b && FLUID_NAMES.has(b.name);
}
function isPlayerBuilt(b: ProbedBlock | null): boolean {
  return !!b && PLAYER_BUILT_PATTERN.test(b.name);
}
function isSolidGround(b: ProbedBlock | null): boolean {
  if (!b) return false;
  if (isVeg(b) || isFluid(b)) return false;
  // Most overworld solids report boundingBox = 'block'; tolerate missing field.
  return b.boundingBox === 'block' || b.boundingBox === undefined;
}

/**
 * Generate up to `count` (x, z) offsets in a square-spiral around (0, 0),
 * stepping `step` blocks at a time, bounded by `radius`.
 */
function* spiralOffsets(step: number, radius: number, count: number): Generator<{ dx: number; dz: number }> {
  yield { dx: 0, dz: 0 };
  let emitted = 1;
  // Ring by ring outward, in steps of `step`. Walk each ring's perimeter.
  for (let r = step; r <= radius && emitted < count; r += step) {
    let dx = -r, dz = -r;
    // Top edge (left -> right)
    for (; dx <= r && emitted < count; dx += step) {
      yield { dx, dz }; emitted++;
    }
    dx = r;
    // Right edge (top -> bottom). Start one below the top-right we just yielded.
    for (dz = -r + step; dz <= r && emitted < count; dz += step) {
      yield { dx, dz }; emitted++;
    }
    dz = r;
    // Bottom edge (right -> left), excluding the corner we just emitted.
    for (dx = r - step; dx >= -r && emitted < count; dx -= step) {
      yield { dx, dz }; emitted++;
    }
    dx = -r;
    // Left edge (bottom -> top), excluding both corners.
    for (dz = r - step; dz > -r && emitted < count; dz -= step) {
      yield { dx, dz }; emitted++;
    }
  }
}

// ---------------------------------------------------------------------------
// Probe-counting / deadline context passed through the evaluation chain
// ---------------------------------------------------------------------------

interface SearchContext {
  /** Wall-clock deadline (absolute ms from Date.now()). */
  deadlineAt: number;
  /** Maximum total probe calls allowed. */
  maxProbes: number;
  /** Per-probe timeout (ms). */
  probeTimeoutMs: number;
  /** Mutable counter — incremented by every probe call. */
  probeCount: number;
}

/** Returns true if either the deadline has passed or the probe budget is exhausted. */
function budgetExceeded(ctx: SearchContext): boolean {
  return Date.now() >= ctx.deadlineAt || ctx.probeCount >= ctx.maxProbes;
}

/**
 * Probe wrapper that enforces the per-probe timeout and increments the global
 * probe counter. Returns null when the budget is already exhausted so inner
 * loops can bail out naturally.
 */
async function timedProbe(
  probe: BlockProbe,
  x: number,
  y: number,
  z: number,
  ctx: SearchContext,
): Promise<ProbedBlock | null> {
  if (budgetExceeded(ctx)) return null;
  ctx.probeCount++;
  return probeWithTimeout(probe, x, y, z, ctx.probeTimeoutMs);
}

// ---------------------------------------------------------------------------
// Column and candidate evaluation
// ---------------------------------------------------------------------------

/**
 * Find the topmost solid block in a column by scanning down from yStart.
 *
 * Also reports whether the scan passed THROUGH fluid on the way down, i.e.
 * whether that solid block is a lake/river bed rather than a dry surface. The
 * caller needs this because the y value alone cannot distinguish "flat ground"
 * from "flat lake bottom", and the latter used to be selected preferentially:
 * water is the flattest terrain there is.
 */
async function topSolidY(
  probe: BlockProbe,
  x: number,
  z: number,
  yStart: number,
  ctx: SearchContext,
  depth = 24,
): Promise<{ y: number; submerged: boolean } | null> {
  let sawFluid = false;
  for (let y = yStart + 8; y > yStart - depth; y--) {
    const b = await timedProbe(probe, x, y, z, ctx);
    if (isFluid(b)) sawFluid = true;
    if (isSolidGround(b)) return { y, submerged: sawFluid };
    // If budget was exhausted mid-column, bail out rather than continuing.
    if (budgetExceeded(ctx)) return null;
  }
  return null;
}

async function evaluateCandidate(
  probe: BlockProbe,
  seedX: number,
  seedZ: number,
  size: { x: number; y: number; z: number },
  refY: number,
  refPos: { x: number; y: number; z: number },
  flatTol: number,
  ctx: SearchContext,
  maxSubmergedCols: number,
  maxFluidBlocks: number,
): Promise<SiteCandidate | null> {
  // Sample a sparse grid of footprint columns rather than every column. For a
  // small footprint (area <= COL_SAMPLE_TARGET) stride is 1 → exhaustive, same
  // as before. For a town-scale footprint stride grows so we probe ~80 columns
  // regardless of size, keeping per-candidate cost roughly constant.
  const footprintCols = size.x * size.z;
  const colStride = Math.max(1, Math.round(Math.sqrt(footprintCols / COL_SAMPLE_TARGET)));
  const cols: Array<{ dx: number; dz: number }> = [];
  for (let dx = 0; dx < size.x; dx += colStride) {
    for (let dz = 0; dz < size.z; dz += colStride) {
      cols.push({ dx, dz });
    }
  }
  const obstacleScanHeight = Math.min(size.y, OBSTACLE_SCAN_HEIGHT);

  // 1. Probe column tops across the sampled footprint.
  const tops: number[] = [];
  let submergedCols = 0;
  for (const { dx, dz } of cols) {
    if (budgetExceeded(ctx)) return null;
    const top = await topSolidY(probe, seedX + dx, seedZ + dz, refY, ctx);
    if (top !== null) {
      tops.push(top.y);
      if (top.submerged) submergedCols++;
    }
    // Abandon a submerged candidate immediately instead of scanning the rest of
    // its columns. Without this, every lake candidate costs a full column sweep,
    // and over a wide spiral that exhausts the global probe budget — which
    // surfaces as a thrown "site selection timed out" rather than a clean "no
    // site here", because the budget and the deadline share one error path.
    if (submergedCols > maxSubmergedCols) break;
  }

  // Reject a submerged site BEFORE the flatness test, because flatness is
  // exactly what would let it through — a lake bed is perfectly level.
  if (submergedCols > maxSubmergedCols) {
    logger.debug(
      { seedX, seedZ, submergedCols, sampledCols: cols.length, maxSubmergedCols, size },
      'SiteSelector: candidate rejected — footprint is underwater (fluid above the ground surface)',
    );
    return null;
  }
  if (tops.length < cols.length / 2) {
    logger.debug({ seedX, seedZ, foundCols: tops.length, sampledCols: cols.length, neededCols: Math.ceil(cols.length / 2), size, refY }, 'SiteSelector: candidate rejected — too few solid columns');
    return null;
  }

  const minY = Math.min(...tops);
  const maxY = Math.max(...tops);
  const range = maxY - minY;
  if (range > flatTol) {
    logger.debug({ seedX, seedZ, range, flatTol, minY, maxY, size }, 'SiteSelector: candidate rejected — too uneven');
    return null;
  }

  const originY = minY + 1; // build floor sits one above the dominant terrain Y
  const origin = { x: seedX, y: originY, z: seedZ };
  const reasons: string[] = [`flat to ${range} block(s)`];
  let penalty = 0;
  // Tracked apart from `penalty` so it can be capped at FLUID_PENALTY_CAP; see
  // that constant for why an uncapped fluid penalty made maxFluidBlocks useless.
  let fluidPenalty = 0;
  const obstacles = { vegetation: 0, logs: 0, fluid: 0, artificial: 0 };

  // 2. Inspect the sampled footprint columns and the ground layer. The vertical
  // obstacle scan is capped at obstacleScanHeight — trees, water and existing
  // builds are all detectable in the first few blocks above the surface, and
  // scanning the full schematic height would multiply cost by ~size.y for no
  // extra signal.
  for (const { dx, dz } of cols) {
    if (budgetExceeded(ctx)) return null;

    // Ground layer just below the floor.
    const ground = await timedProbe(probe, origin.x + dx, originY - 1, origin.z + dz, ctx);
    if (isLog(ground)) { obstacles.logs++; penalty += VEG_PENALTY * 2; }
    else if (isVeg(ground)) { obstacles.vegetation++; penalty += VEG_PENALTY; }
    if (isFluid(ground)) { obstacles.fluid++; fluidPenalty += FLUID_PENALTY; }
    if (isPlayerBuilt(ground)) { obstacles.artificial++; penalty += ARTIFICIAL_PENALTY; }

    // Column inside the footprint — looking for trees / spawners / player builds.
    for (let dy = 0; dy < obstacleScanHeight; dy++) {
      if (budgetExceeded(ctx)) return null;
      const b = await timedProbe(probe, origin.x + dx, originY + dy, origin.z + dz, ctx);
      if (!b || b.name === 'air' || b.name === 'cave_air') continue;
      if (isLog(b)) { obstacles.logs++; penalty += VEG_PENALTY * 2; }
      else if (isVeg(b)) { obstacles.vegetation++; penalty += VEG_PENALTY; }
      if (isFluid(b)) { obstacles.fluid++; fluidPenalty += FLUID_PENALTY; }
      if (b.name === 'spawner' || b.name === 'monster_egg') penalty += SPAWNER_PENALTY;
      if (isPlayerBuilt(b)) { obstacles.artificial++; penalty += ARTIFICIAL_PENALTY; }
    }

    // Sky clearance — partial roofing / cave ceilings penalised.
    for (let dy = 0; dy < SKY_CLEARANCE; dy++) {
      if (budgetExceeded(ctx)) break;
      const top = await timedProbe(probe, origin.x + dx, originY + size.y + dy, origin.z + dz, ctx);
      if (top && top.name !== 'air' && top.name !== 'cave_air') {
        penalty += ROOF_PENALTY;
      }
    }
  }

  // Fluid anywhere in the footprint disqualifies the site. Previously this was
  // only a 20-point penalty against a base score of 100 (+20 near bonus, +10
  // sunlit), so a handful of water blocks still scored positively and
  // `cand.score > 0` accepted it — the build then went up in the water.
  if (obstacles.fluid > maxFluidBlocks) {
    logger.debug(
      { origin, fluid: obstacles.fluid, maxFluidBlocks, size },
      'SiteSelector: candidate rejected — fluid inside the footprint',
    );
    return null;
  }

  penalty += Math.min(fluidPenalty, FLUID_PENALTY_CAP);

  // 3. Bonuses.
  const dist = Math.hypot(origin.x - refPos.x, origin.z - refPos.z);
  const nearBonus = 20 * Math.exp(-dist / NEAR_FALLOFF);
  const sunlit = originY >= refPos.y - 1 ? 10 : 0;

  const score = 100 + nearBonus + sunlit - penalty;

  if (obstacles.vegetation) reasons.push(`${obstacles.vegetation} vegetation blocks`);
  if (obstacles.logs) reasons.push(`${obstacles.logs} tree logs in footprint`);
  if (obstacles.fluid) reasons.push(`${obstacles.fluid} fluid blocks`);
  if (obstacles.artificial) reasons.push(`${obstacles.artificial} suspected player blocks`);
  reasons.push(`${dist.toFixed(1)}m from probe`);
  if (sunlit) reasons.push('open to sky');

  const confidence = Math.max(0, Math.min(1, (score - 50) / 100));
  logger.debug({ origin, score, confidence, range, obstacles, size }, 'SiteSelector: candidate evaluated');
  return {
    origin,
    score: Math.max(0, score),
    confidence,
    reasons,
    flatnessRange: range,
    obstacles,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Main entry. `refPos` is typically the probe bot's current position.
 * Returns the best candidate found, or `null` if no spot meets the flatness
 * requirement within either radius (caller should refuse to build).
 *
 * Throws if the overall deadline is reached and no qualifying candidate has
 * been found yet — the caller should treat this as "abort and retry" rather
 * than an infinite hang.
 */
export async function selectBuildSite(
  probe: BlockProbe,
  refPos: { x: number; y: number; z: number },
  size: { x: number; y: number; z: number },
  options: SiteSelectorOptions = {},
): Promise<SiteCandidate | null> {
  const large = size.x > 16 || size.z > 16;
  const flatTol = options.maxYDelta ?? (large ? DEFAULT_FLAT_TOL_LARGE : DEFAULT_FLAT_TOL_SMALL);
  const step = options.step ?? DEFAULT_STEP;
  // Large (town-scale) builds need to evaluate MORE candidates, not fewer — the
  // capital centre is usually built up, so the search must spiral outward to
  // empty ground. Sparse per-candidate sampling makes this affordable.
  const maxCandidates = options.maxCandidates ?? (large ? 48 : DEFAULT_MAX_CANDIDATES);
  const radius1 = options.radius ?? DEFAULT_RADIUS;
  const radius2 = options.fallbackRadius ?? DEFAULT_FALLBACK_RADIUS;
  const probeTimeoutMs = options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxProbes = options.maxProbes ?? DEFAULT_MAX_PROBES;
  const avoidRects = options.avoidRects ?? [];
  const spacingMargin = options.spacingMargin ?? 5;
  const maxSubmergedCols = options.maxSubmergedCols ?? 0;
  const maxFluidBlocks = options.maxFluidBlocks ?? 0;

  const refX = Math.floor(refPos.x);
  const refZ = Math.floor(refPos.z);
  const refY = Math.floor(refPos.y);

  const ctx: SearchContext = {
    deadlineAt: Date.now() + deadlineMs,
    maxProbes,
    probeTimeoutMs,
    probeCount: 0,
  };

  // Best qualifying candidate seen so far across both radius passes. Used as
  // the return value if the deadline fires mid-search.
  let bestSoFar: SiteCandidate | null = null;

  for (const radius of [radius1, radius2]) {
    const scored: SiteCandidate[] = [];

    for (const { dx, dz } of spiralOffsets(step, radius, maxCandidates)) {
      // Check deadline/probe-budget before each candidate (fast path).
      if (budgetExceeded(ctx)) {
        logger.warn(
          { probeCount: ctx.probeCount, maxProbes, deadlineMs, refPos },
          'SiteSelector: budget/deadline reached mid-search',
        );
        if (bestSoFar) return bestSoFar;
        throw new Error(
          `site selection timed out after ${deadlineMs}ms (no usable candidate near ${refX},${refZ})`,
        );
      }

      // Footprint-collision gate (pre-probe, cheap). Skip any candidate that
      // would overlap — or come within spacingMargin of — an existing building.
      // This is the fix for builds stacking on each other: the terrain probe
      // alone is attracted to the flat cleared pads of prior builds.
      if (intersectsAvoid(refX + dx, refZ + dz, size, avoidRects, spacingMargin)) {
        continue;
      }

      const cand = await evaluateCandidate(
        probe, refX + dx, refZ + dz, size, refY, refPos, flatTol, ctx,
        maxSubmergedCols, maxFluidBlocks,
      );
      if (cand && cand.score > 0) {
        scored.push(cand);
        if (!bestSoFar || cand.score > bestSoFar.score) bestSoFar = cand;
      }
    }

    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      logger.info({
        origin: best.origin,
        score: Number(best.score.toFixed(1)),
        confidence: Number(best.confidence.toFixed(2)),
        reasons: best.reasons,
        radius,
        considered: scored.length,
        probeCount: ctx.probeCount,
      }, 'SiteSelector: chose site');
      return best;
    }
    logger.info({ radius, flatTol }, 'SiteSelector: no flat site at this radius, expanding');
  }

  logger.warn({ refPos, size, flatTol }, 'SiteSelector: no acceptable site found within fallback radius');
  return null;
}
