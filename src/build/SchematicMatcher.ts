import fs from 'fs';
import path from 'path';
import { logger } from '../util/logger';

export interface SchematicMatch {
  filename: string;
  score: number;
  /** Human-readable reason this matched, useful for debugging/logging. */
  reason: string;
}

/**
 * Keyword synonym map — expands intent terms so that "house" matches a
 * schematic file named "cottage_01.schem", "home.schematic", etc.
 */
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  house: ['house', 'cottage', 'home', 'cabin', 'dwelling', 'hut', 'residence', 'villa', 'mansion'],
  tower: ['tower', 'spire', 'turret', 'keep', 'watchtower'],
  wall: ['wall', 'fence', 'barrier', 'rampart'],
  farm: ['farm', 'plot', 'field', 'crop'],
  castle: ['castle', 'fortress', 'stronghold', 'keep', 'palace'],
  temple: ['temple', 'shrine', 'sanctuary', 'chapel', 'church'],
  bridge: ['bridge', 'crossing', 'viaduct'],
  tree: ['tree', 'oak', 'spruce', 'birch'],
  // Kinds the seed plans actually request (seed/medieval.ts, seed/midcentury.ts).
  // Every PlanItem.kind MUST have a bucket here, or kind-gating cannot recognise
  // it and match() will refuse to build it at all — which is the safe failure,
  // but it means a new kind needs a bucket added alongside it.
  well: ['well', 'wellhead', 'fountain', 'cistern'],
  town_hall: ['hall', 'townhall', 'town_hall', 'courthouse', 'moot', 'guildhall'],
  storage: ['storage', 'storehouse', 'warehouse', 'granary', 'silo', 'barn', 'depot'],
  tavern: ['tavern', 'inn', 'pub', 'alehouse'],
  blacksmith: ['blacksmith', 'smithy', 'forge', 'anvil'],
  market: ['market', 'stall', 'bazaar', 'shop', 'store'],
  library: ['library', 'archive', 'scriptorium'],
  plaza: ['plaza', 'square', 'courtyard', 'green'],
  windmill: ['windmill', 'mill', 'watermill'],
  stable: ['stable', 'barn', 'paddock'],
  dock: ['dock', 'pier', 'wharf', 'harbour', 'harbor'],
  mine: ['mine', 'mineshaft', 'quarry', 'adit'],
};

/**
 * Tokens that describe STYLE or SCALE rather than what a structure IS. These
 * must never be sufficient to win a match on their own.
 *
 * This is the bug that produced a red canvas TENT when the town asked for a
 * WELL: the query was "medieval stone well", 'well' had no synonym bucket so
 * `hasRecognized` was false, and `medieval-tent.schem` scored 8 points purely on
 * the shared adjective "medieval" (5 for the intent hit + 3 for the style hit)
 * with zero match on the noun. Any file with "medieval" in its name could win
 * any medieval contract.
 */
const DESCRIPTOR_TOKENS = new Set([
  'medieval', 'modern', 'rustic', 'ancient', 'old', 'new', 'classic', 'traditional',
  'midcentury', 'mid', 'century', 'victorian', 'colonial', 'gothic', 'nordic', 'japanese',
  'small', 'large', 'big', 'tiny', 'huge', 'mini', 'grand', 'simple', 'basic', 'fancy',
  'stone', 'wood', 'wooden', 'brick', 'oak', 'spruce', 'birch', 'dark', 'light', 'white',
  'communal', 'default', 'starter', 'v1', 'v2', 'a', 'b', 'the', 'of', 'and',
]);

/** Minimum score required for `match()` to consider a result usable. */
const MIN_SCORE = 1;

function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/\.(schem|schematic)$/i, '')
    .split(/[\s_\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function expandIntentTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    const syns = KEYWORD_SYNONYMS[t];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
    // Also map any token that appears in a synonym list to its group bucket
    for (const [bucket, syns2] of Object.entries(KEYWORD_SYNONYMS)) {
      if (syns2.includes(t)) {
        expanded.add(bucket);
        for (const s of syns2) expanded.add(s);
      }
    }
  }
  return [...expanded];
}

export class SchematicMatcher {
  private schematicsDir: string;
  /** filename → token bag */
  private index: Map<string, Set<string>> = new Map();

  constructor(schematicsDir: string) {
    this.schematicsDir = schematicsDir;
  }

  /** Refresh the in-memory index from disk. Call on startup and after schematic uploads. */
  refresh(): void {
    this.index.clear();
    if (!fs.existsSync(this.schematicsDir)) {
      logger.warn({ dir: this.schematicsDir }, 'SchematicMatcher: directory missing');
      return;
    }
    let files: string[] = [];
    try {
      files = fs.readdirSync(this.schematicsDir)
        .filter((f) => f.endsWith('.schem') || f.endsWith('.schematic'));
    } catch (err: any) {
      logger.warn({ err: err.message, dir: this.schematicsDir }, 'SchematicMatcher: read failed');
      return;
    }
    for (const f of files) {
      const tokens = tokenize(f);
      this.index.set(f, new Set(tokens));
    }
    logger.info({ count: this.index.size }, 'SchematicMatcher indexed schematics');
  }

  /**
   * Find the best schematic for an intent like "oak house" or "tower".
   * Returns null if no schematic scores above the minimum threshold.
   */
  match(intent: string, opts?: { style?: string; kind?: string }): SchematicMatch | null {
    const all = this.matchAll(intent, { ...opts, limit: 1 });
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Tokens that identify the thing a `kind` denotes, e.g. 'well' →
   * {well,wellhead,fountain,cistern}. Falls back to the kind's own tokens so an
   * unknown kind still demands a literal name match rather than matching anything.
   */
  private static kindTokens(kind: string): Set<string> {
    const raw = tokenize(kind);
    const out = new Set<string>(raw);
    for (const t of raw) {
      const direct = KEYWORD_SYNONYMS[t];
      if (direct) for (const s of direct) out.add(s);
      for (const [bucket, syns] of Object.entries(KEYWORD_SYNONYMS)) {
        if (bucket === t || syns.includes(t)) {
          out.add(bucket);
          for (const s of syns) out.add(s);
        }
      }
    }
    // A kind must be identified by a noun, never by a descriptor.
    for (const d of DESCRIPTOR_TOKENS) out.delete(d);
    return out;
  }

  /** Return up to N matches above the threshold, ranked by score. */
  matchAll(intent: string, opts?: { style?: string; limit?: number; kind?: string }): SchematicMatch[] {
    const rawIntentTokens = tokenize(intent);
    if (rawIntentTokens.length === 0) return [];

    const intentTokens = new Set(expandIntentTokens(rawIntentTokens));
    const styleTokens = opts?.style ? new Set(tokenize(opts.style)) : null;
    const limit = opts?.limit ?? 5;

    // KIND GATE. When the caller knows what it is building (TownBrain always
    // does — PlanItem.kind), a candidate must be identifiable as that thing.
    // Without this, descriptor overlap alone wins: "medieval stone well" matched
    // medieval-tent.schem on the word "medieval", the town got a tent instead of
    // a well, and it was sited on the town hall's apron.
    const kindTokens = opts?.kind ? SchematicMatcher.kindTokens(opts.kind) : null;

    const scored: SchematicMatch[] = [];
    for (const [filename, fileTokens] of this.index.entries()) {
      // Reject anything that cannot be identified as the requested kind. Refusing
      // to build is the correct outcome here: a missing well is a gap someone can
      // see and fix, whereas a tent recorded in the registry AS a well is drift
      // that silently corrupts the town's own model of itself.
      let kindHit: string | null = null;
      if (kindTokens) {
        for (const t of kindTokens) {
          if (fileTokens.has(t)) { kindHit = t; break; }
        }
        if (!kindHit) continue;
      }

      let intentHits = 0;
      const hitList: string[] = [];
      let nounHits = 0;
      for (const t of intentTokens) {
        if (fileTokens.has(t)) {
          intentHits++;
          if (!DESCRIPTOR_TOKENS.has(t)) nounHits++;
          if (hitList.length < 5) hitList.push(t);
        }
      }
      // With no kind supplied, still require at least one NON-descriptor hit, so
      // a bare adjective overlap can never carry a match on its own.
      if (!kindTokens && nounHits === 0) continue;
      let styleHits = 0;
      if (styleTokens) {
        for (const t of styleTokens) {
          if (fileTokens.has(t)) styleHits++;
        }
      }

      // A candidate needs some positive evidence: either it satisfied the kind
      // gate, or it shares a noun with the intent. Style alone is never enough.
      if (!kindHit && nounHits === 0) continue;

      // Prefer concise filenames (subtract a small penalty for very long ones).
      const lengthPenalty = Math.max(0, fileTokens.size - 4) * 0.25;
      // Noun hits outrank descriptor hits: matching "well" must beat matching
      // "medieval". Style remains a tie-breaker only.
      const descriptorHits = intentHits - nounHits;
      const score = nounHits * 6 + descriptorHits * 1 + styleHits * 2 - lengthPenalty;

      if (score < MIN_SCORE) continue;

      scored.push({
        filename,
        score,
        reason:
          `nouns=${nounHits} desc=${descriptorHits}` +
          `${styleHits ? ` style=${styleHits}` : ''}` +
          `${kindHit ? ` kind:${kindHit}` : ''}` +
          `${hitList.length ? ` on [${hitList.join(',')}]` : ''}`,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** All known schematic filenames, lowercased without extension. */
  list(): string[] {
    return [...this.index.keys()].map((f) => f.toLowerCase().replace(/\.(schem|schematic)$/i, ''));
  }

  /** Return original filenames as stored (preserving extension/case). */
  listRaw(): string[] {
    return [...this.index.keys()];
  }
}
