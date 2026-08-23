import { loadConfig } from '../config';
import { logger } from '../util/logger';

export interface ProtectedZone {
  name?: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  shelter?: boolean;
}

export interface MineSite {
  x: number;
  y: number;
  z: number;
  radius?: number;
}

export interface CarveCeiling {
  enabled?: boolean;
  maxY: number;
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
  minDigY: number | null;
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
    if (m.carveCeiling && m.carveCeiling.enabled === true && typeof m.carveCeiling.maxY === 'number') {
      carveCeiling = m.carveCeiling as CarveCeiling;
    }
  } catch (err: any) {
    logger.warn(`[geofence] could not load mining config, geofence disabled: ${err?.message ?? err}`);
  }
  cached = { protectedZones, mineSite, routeToMineBlocks, minDigY, carveCeiling };
  return cached;
}

/**
 * Dedicated survival mode is still completely server-legitimate: this flag only
 * disables the fleet's civic "don't dig below y50" policy for FayaazMJacc so
 * the mission can reach normal diamond levels. It does not grant items, change
 * the world, or execute a Minecraft command.
 */
const SURVIVAL_DEEP_MINING =
  process.env.MC_SURVIVAL_MODE === '1' ||
  process.env.MC_SURVIVAL_BOT_NAME?.toLowerCase() === 'fayaazmjac';

export function isBelowDigFloor(x: number, y: number, z: number): boolean {
  if (SURVIVAL_DEEP_MINING) return false;
  const { minDigY, mineSite } = load();
  if (minDigY === null) return false;
  if (y >= minDigY) return false;
  if (mineSite) {
    const r = mineSite.radius ?? 24;
    const dx = x - mineSite.x;
    const dz = z - mineSite.z;
    if (dx * dx + dz * dz <= r * r) return false;
  }
  return true;
}

export function isAboveCarveCeiling(x: number, y: number, z: number): boolean {
  const { carveCeiling } = load();
  if (!carveCeiling) return false;
  if (y <= carveCeiling.maxY) return false;
  for (const e of carveCeiling.exempt ?? []) {
    if (x >= e.minX && x <= e.maxX && z >= e.minZ && z <= e.maxZ) return false;
  }
  return true;
}

export function getCarveCeiling(): CarveCeiling | null { return load().carveCeiling; }
export function getMinDigY(): number | null { return load().minDigY; }

export function isProtected(x: number, y: number, z: number): boolean {
  for (const z2 of load().protectedZones) {
    if (x >= z2.minX && x <= z2.maxX && y >= z2.minY && y <= z2.maxY && z >= z2.minZ && z <= z2.maxZ) return true;
  }
  return false;
}

export function getPathfinderBreakExclusionCost(
  block: { position?: { x?: number; y?: number; z?: number } } | null | undefined,
): number {
  const p = block?.position;
  if (typeof p?.x !== 'number' || !Number.isFinite(p.x) || typeof p?.y !== 'number' || !Number.isFinite(p.y) || typeof p?.z !== 'number' || !Number.isFinite(p.z)) return 0;
  const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
  return (isProtected(x, y, z) || isBelowDigFloor(x, y, z) || isAboveCarveCeiling(x, y, z)) ? 100 : 0;
}

export function intersectsProtectedZone(
  min: { x: number; y: number; z: number },
  max: { x: number; y: number; z: number },
): ProtectedZone | null {
  const lo = { x: Math.min(min.x, max.x), y: Math.min(min.y, max.y), z: Math.min(min.z, max.z) };
  const hi = { x: Math.max(min.x, max.x), y: Math.max(min.y, max.y), z: Math.max(min.z, max.z) };
  for (const z of load().protectedZones) {
    if (lo.x <= z.maxX && hi.x >= z.minX && lo.y <= z.maxY && hi.y >= z.minY && lo.z <= z.maxZ && hi.z >= z.minZ) return z;
  }
  return null;
}

export function getMineSite(): MineSite | null { return load().mineSite; }
export function shouldRouteToMine(blockType: string): boolean { return load().routeToMineBlocks.has(blockType); }

export function getNearestProtectedCenter(x: number, z: number): { x: number; y: number; z: number } | null {
  const zones = load().protectedZones;
  let best: ProtectedZone | null = null;
  let bestDist = Infinity;
  for (const zz of zones) {
    if (zz.shelter === false) continue;
    const cx = (zz.minX + zz.maxX) / 2;
    const cz = (zz.minZ + zz.maxZ) / 2;
    const d = (x - cx) ** 2 + (z - cz) ** 2;
    if (d < bestDist) { bestDist = d; best = zz; }
  }
  if (!best) return null;
  return { x: Math.round((best.minX + best.maxX) / 2), y: Math.round(best.minY + 24), z: Math.round((best.minZ + best.maxZ) / 2) };
}

export function _resetGeofenceCache(): void { cached = null; }
