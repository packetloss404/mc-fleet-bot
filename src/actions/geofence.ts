import { loadConfig } from '../config';
import { logger } from '../util/logger';

/**
 * Mining geofence — stops bots from gathering raw materials by tunnelling
 * through town structures (roads, houses, the town hall, plazas) and routes
 * resource mining to a designated communal mine site instead.
 *
 * Two mechanisms, both sourced from the optional `mining:` section of
 * config.yml:
 *
 *  1. `protectedZones` — axis-aligned boxes around builds. `mineBlock` filters
 *     out any candidate block inside a protected zone, so the bot will never
 *     dig into a structure even if a matching block is the nearest one.
 *  2. `mineSite` + `routeToMineBlocks` — raw resources (stone, ores, dirt…)
 *     must be sourced AT the communal mine; `mineBlock` walks the bot to the
 *     mine site before searching for those block types.
 *
 * Fail-open: if config can't be read or the `mining:` section is absent, the
 * geofence is empty (no protection, no routing) and mining behaves exactly as
 * before. We never fail-closed here because that would silently break all
 * mining if config ever moved.
 */

export interface ProtectedZone {
  name?: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /**
   * Whether this zone is a valid night-shelter destination (see
   * getNearestProtectedCenter). Defaults to true. Set false for zones that
   * exist purely to block mining (e.g. a leashed caretaker's build area) so
   * they don't pull the roaming fleet away from the actual town at night.
   */
  shelter?: boolean;
}

export interface MineSite {
  x: number;
  y: number;
  z: number;
  /** Bots within this horizontal radius of the site are considered "at the mine". */
  radius?: number;
}

/**
 * Excavation Y-CEILING for a subsurface carving campaign (Raven Rock OQ-4).
 *
 * The inverse of `minDigY`: that stops bots tunnelling too DEEP, this stops them
 * cutting too HIGH. Raven Rock sits beneath MainStreet America with a 22-block
 * greenstone buffer (y41→y61) between the cavern ceilings and MSA's y62
 * foundation. A bot carving a cavern roof or a tunnel that strays above y41
 * thins or breaches that buffer under a live surface build.
 *
 * MUST be opt-in. A blanket "no edits above y41" would forbid MSA surface work
 * at y64 and the Worker Town hall at y67 — i.e. almost everything currently
 * built. `enabled: false` (or absent) is the default and a complete no-op; turn
 * it on only for the duration of the carving campaign.
 */
export interface CarveCeiling {
  enabled?: boolean;
  /** Highest Y a block edit may touch while enabled. OQ-4 ratified 41. */
  maxY: number;
  /** Columns exempt from the ceiling — the sanctioned breaches. */
  exempt?: Array<{
    name?: string;
    minX: number; maxX: number;
    minZ: number; maxZ: number;
  }>;
}

interface MiningGeofence {
  protectedZones: ProtectedZone[];
  mineSite: MineSite | null;
  routeToMineBlocks: Set<string>;
  /** Y below which digging is refused outside the mine site. Null = no floor. */
  minDigY: number | null;
  /** Excavation ceiling for subsurface carving. Null = disabled. */
  carveCeiling: CarveCeiling | null;
}

let cached: MiningGeofence | null = null;

function load(): MiningGeofence {
  if (cached) return cached;
  let protectedZones: ProtectedZone[] = [];
  let mineSite: MineSite | null = null;
  let routeToMineBlocks = new Set<string>();
  let minDigY: number | null = null;
  let carveCeiling: CarveCeiling | null = null;
  try {
    const cfg = loadConfig() as any;
    const m = cfg.mining || {};
    if (Array.isArray(m.protectedZones)) protectedZones = m.protectedZones;
    if (m.mineSite && typeof m.mineSite.x === 'number') mineSite = m.mineSite;
    if (Array.isArray(m.routeToMineBlocks)) routeToMineBlocks = new Set(m.routeToMineBlocks);
    if (typeof m.minDigY === 'number') minDigY = m.minDigY;
    if (m.carveCeiling && m.carveCeiling.enabled === true &&
        typeof m.carveCeiling.maxY === 'number') {
      carveCeiling = m.carveCeiling as CarveCeiling;
    }
  } catch (err: any) {
    logger.warn(`[geofence] could not load mining config, geofence disabled: ${err?.message ?? err}`);
  }
  cached = { protectedZones, mineSite, routeToMineBlocks, minDigY, carveCeiling };
  return cached;
}

/**
 * True if digging (x,y,z) would breach the dig-depth floor.
 *
 * Bots default to tunnelling straight down when a surface resource isn't
 * immediately visible, then get entombed tens of blocks under the map — at
 * which point every surface task ("mine 1 oak log") fails forever, because
 * there are no trees at y14. The floor makes that structurally impossible.
 *
 * The communal mine site is exempt: deep extraction is legitimate, it just has
 * to happen at ONE sanctioned place instead of wherever a bot is standing.
 * Fail-open — no `minDigY` configured means no floor and prior behaviour.
 */
export function isBelowDigFloor(x: number, y: number, z: number): boolean {
  const { minDigY, mineSite } = load();
  if (minDigY === null) return false;
  if (y >= minDigY) return false;
  if (mineSite) {
    const r = mineSite.radius ?? 24;
    const dx = x - mineSite.x;
    const dz = z - mineSite.z;
    if (dx * dx + dz * dz <= r * r) return false; // sanctioned deep mine
  }
  return true;
}

/**
 * True if editing (x,y,z) would breach the excavation ceiling (OQ-4).
 *
 * Applies to ANY block edit — dig and place alike — because the constraint is
 * "leave the buffer solid", which a stray placement violates as surely as a
 * stray dig. Exempt columns are the sanctioned breaches: for Raven Rock that is
 * the RR-Z5 vertical shaft at x[193,207], z[-22,-8].
 *
 * IMPORTANT: the exempt box must carry the RELOCATED shaft footprint. Several
 * documents still show the pre-OQ-1 x[113,127], z[53,67]; wiring those would
 * whitelist empty rock and refuse the real shaft.
 *
 * Fails open — carveCeiling absent or `enabled: false` means no ceiling.
 */
export function isAboveCarveCeiling(x: number, y: number, z: number): boolean {
  const { carveCeiling } = load();
  if (!carveCeiling) return false;
  if (y <= carveCeiling.maxY) return false;
  for (const e of carveCeiling.exempt ?? []) {
    if (x >= e.minX && x <= e.maxX && z >= e.minZ && z <= e.maxZ) return false;
  }
  return true;
}

/** The active carve ceiling, or null when disabled. */
export function getCarveCeiling(): CarveCeiling | null {
  return load().carveCeiling;
}

/** The configured dig-depth floor, or null when unset. */
export function getMinDigY(): number | null {
  return load().minDigY;
}

/** True if the block at (x,y,z) lies inside any protected build zone. */
export function isProtected(x: number, y: number, z: number): boolean {
  for (const z2 of load().protectedZones) {
    if (
      x >= z2.minX && x <= z2.maxX &&
      y >= z2.minY && y <= z2.maxY &&
      z >= z2.minZ && z <= z2.maxZ
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the first protected zone whose AABB overlaps the given box, or null
 * when the box is clear. Used by destructive op-command paths (e.g. the build
 * engine's `clearSite` / `/fill ... air destroy`) that bypass the per-block
 * `bot.dig` geofence: they can check a whole slab/box up front and refuse to
 * wipe a protected build. Inclusive bounds on both boxes.
 */
export function intersectsProtectedZone(
  min: { x: number; y: number; z: number },
  max: { x: number; y: number; z: number },
): ProtectedZone | null {
  const lo = { x: Math.min(min.x, max.x), y: Math.min(min.y, max.y), z: Math.min(min.z, max.z) };
  const hi = { x: Math.max(min.x, max.x), y: Math.max(min.y, max.y), z: Math.max(min.z, max.z) };
  for (const z of load().protectedZones) {
    if (
      lo.x <= z.maxX && hi.x >= z.minX &&
      lo.y <= z.maxY && hi.y >= z.minY &&
      lo.z <= z.maxZ && hi.z >= z.minZ
    ) {
      return z;
    }
  }
  return null;
}

/** The designated communal mine site, or null if none configured. */
export function getMineSite(): MineSite | null {
  return load().mineSite;
}

/** True if this block type must be sourced at the communal mine, not in place. */
export function shouldRouteToMine(blockType: string): boolean {
  return load().routeToMineBlocks.has(blockType);
}

/**
 * Center of the protected zone nearest to (x,z), used to send a bot back to
 * town at night instead of building a one-off hut. Y is a ground-ish estimate
 * (zones don't store surface Y); the pathfinder snaps to walkable ground.
 * Returns null when no protected zones are configured.
 */
export function getNearestProtectedCenter(x: number, z: number): { x: number; y: number; z: number } | null {
  const zones = load().protectedZones;
  let best: ProtectedZone | null = null;
  let bestDist = Infinity;
  for (const zz of zones) {
    if (zz.shelter === false) continue; // mining-only zone, not a night-shelter target
    const cx = (zz.minX + zz.maxX) / 2;
    const cz = (zz.minZ + zz.maxZ) / 2;
    const d = (x - cx) ** 2 + (z - cz) ** 2;
    if (d < bestDist) { bestDist = d; best = zz; }
  }
  if (!best) return null;
  return {
    x: Math.round((best.minX + best.maxX) / 2),
    y: Math.round(best.minY + 24), // ~ground level above the zone floor
    z: Math.round((best.minZ + best.maxZ) / 2),
  };
}

/** Test hook: drop the cached geofence so the next call re-reads config. */
export function _resetGeofenceCache(): void {
  cached = null;
}
