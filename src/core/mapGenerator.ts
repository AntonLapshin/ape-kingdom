/**
 * Terrain model + pure map generator engine (M9-T1).
 *
 * This module adds the terrain model and a pure, configurable map generator to
 * the core game engine. `generateMap` produces a playable hex map:
 *
 *   - a single contiguous island of land (including mountain cells) surrounded
 *     by water at the grid border,
 *   - `mountain` cells scattered through the land,
 *   - interior `water` ("lake") cells fully enclosed by land.
 *
 * The generator is deliberately pure: no React, Tailwind, or browser APIs, and
 * the only randomness comes from a seeded RNG (`mulberry32`) so that the same
 * `seed` always reproduces the same map. This module has no browser
 * dependencies and is 100% covered by `tests/core/mapGenerator.test.ts`.
 *
 * The grid is a rectangular collection of `width × height` axial hexes (the
 * axial system from `src/core/game.ts`). Coordinates are `q ∈ [0, width)` and
 * `r ∈ [0, height)`; the outer ring of the rectangle is always water.
 */

import type { Hex } from "./game";
import { adjacentHexes } from "./game";

/* ------------------------------------------------------------------ */
/* Terrain & map model                                                 */
/* ------------------------------------------------------------------ */

/** The terrain of a single map cell. */
export type Terrain = "land" | "water" | "mountain";

/** A single hex cell and its terrain. */
export interface MapCell {
  /** The axial hex this cell occupies. */
  hex: Hex;
  /** The terrain at this cell. */
  terrain: Terrain;
}

/**
 * A generated hex map: a rectangular grid of `width × height` cells.
 *
 * Guarantees:
 *   - every border cell (outer ring) is `water`,
 *   - all land + mountain cells form a single contiguous island,
 *   - every `water` cell that is not on the border is an interior lake
 *     fully enclosed by land.
 */
export interface GameMap {
  /** Number of cells along the q axis. */
  width: number;
  /** Number of cells along the r axis. */
  height: number;
  /** Every cell of the grid (length `width * height`). */
  cells: MapCell[];
}

/* ------------------------------------------------------------------ */
/* Generator configuration                                             */
/* ------------------------------------------------------------------ */

/** Configuration passed to `generateMap`. Every field is optional. */
export interface MapConfig {
  /** Grid width (cells along the q axis). Default 17. */
  width?: number;
  /** Grid height (cells along the r axis). Default 17. */
  height?: number;
  /**
   * Fraction of the interior that becomes the island, in `(0, 1]`.
   * Default 0.66.
   */
  islandSize?: number;
  /**
   * Fraction of island cells that become mountains, in `[0, 1)`.
   * Default 0.1.
   */
  mountainDensity?: number;
  /**
   * Fraction of island cells that become interior lakes, in `[0, 1)`.
   * Default 0.05.
   */
  lakeDensity?: number;
  /** Non-negative seed. The same seed always yields the same map. Default 0. */
  seed?: number;
}

/** Fully-resolved config (all fields filled with their effective values). */
export type ResolvedMapConfig = Required<MapConfig>;

/** Smallest allowed grid dimension (so there is always interior room). */
export const MIN_MAP_DIMENSION = 5;

/**
 * Sensible defaults for a playable map.
 *
 * The default grid is **17×17** (289 cells) — about 1.5× smaller than the old
 * 20×20 default in total cells/land (the default island yields ~192 land cells
 * vs ~285 before, i.e. land shrinks by roughly the intended ~1.5×), while
 * still leaving ample room for a full p1-vs-p2 game (spawns, Home Trees,
 * Groves, Nests, resources and the random neutral units). 17 is also the
 * smallest odd dimension that keeps the generated island **robustly** circular
 * under the coastal-waviness generator: unlike the even 16×16 grid (whose
 * centre-on-integer parity lets some seeds clip the circle against the
 * corners and push the sector-extent ratio above 1.5), a 17×17 board keeps the
 * worst-case circularity ratio comfortably ≤ 1.5 across seeds (M31-T2, #226).
 */
export const DEFAULT_MAP_CONFIG: ResolvedMapConfig = {
  width: 17,
  height: 17,
  islandSize: 0.66,
  mountainDensity: 0.1,
  lakeDensity: 0.05,
  seed: 0,
};

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** The reason a map configuration was rejected. */
export type MapErrorKind =
  /** A grid dimension is not a positive integer within bounds. */
  | "invalid-dimension"
  /** `islandSize` is not in `(0, 1]`. */
  | "invalid-island-size"
  /** A density is not in `[0, 1)`. */
  | "invalid-density"
  /** The seed is not a non-negative integer. */
  | "invalid-seed";

/** A typed error describing why a map configuration was rejected. */
export class MapError extends Error {
  readonly kind: MapErrorKind;

  constructor(kind: MapErrorKind, message: string) {
    super(message);
    this.name = "MapError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Seeded RNG                                                          */
/* ------------------------------------------------------------------ */

/**
 * A tiny deterministic 32-bit PRNG (mulberry32). Given the same integer seed
 * it always produces the same sequence in `[0, 1)`, which is what makes
 * `generateMap` reproducible for a fixed seed.
 *
 * Exported so the game-session layer can drive other seeded-random decisions
 * (e.g. `chooseHomeHexes` placing random spawns) with the same reproducible
 * RNG, keeping a given `seed` fully deterministic end-to-end.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Small pure helpers (kept internal unless otherwise exported)      */
/* ------------------------------------------------------------------ */

/** Convert a hex to a stable map key. */
function key(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

/** Whether a hex lies within the `width × height` grid. */
function inBounds(hex: Hex, width: number, height: number): boolean {
  return hex.q >= 0 && hex.q < width && hex.r >= 0 && hex.r < height;
}

/** Whether a terrain counts as solid land surface (land or mountain). */
export function isLandSurface(terrain: Terrain): boolean {
  return terrain === "land" || terrain === "mountain";
}

/** Deterministic Fisher–Yates shuffle driven by the seeded RNG. */
function shuffle<T>(items: T[], next: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/* ------------------------------------------------------------------ */
/* Config normalization + validation                                   */
/* ------------------------------------------------------------------ */

function assertIntegerInRange(
  value: number,
  min: number,
  field: string,
): never | void {
  if (!Number.isInteger(value) || value < min) {
    throw new MapError(
      "invalid-dimension",
      `${field} must be a positive integer at least ${min}`,
    );
  }
}

/**
 * Resolve a (possibly partial) config against the defaults and validate every
 * field. Throws a typed `MapError` for any invalid value, so callers never
 * receive a silently-corrected or malformed configuration.
 */
export function resolveConfig(config?: MapConfig): ResolvedMapConfig {
  const resolved: ResolvedMapConfig = {
    width: config?.width ?? DEFAULT_MAP_CONFIG.width,
    height: config?.height ?? DEFAULT_MAP_CONFIG.height,
    islandSize: config?.islandSize ?? DEFAULT_MAP_CONFIG.islandSize,
    mountainDensity:
      config?.mountainDensity ?? DEFAULT_MAP_CONFIG.mountainDensity,
    lakeDensity: config?.lakeDensity ?? DEFAULT_MAP_CONFIG.lakeDensity,
    seed: config?.seed ?? DEFAULT_MAP_CONFIG.seed,
  };

  assertIntegerInRange(resolved.width, MIN_MAP_DIMENSION, "width");
  assertIntegerInRange(resolved.height, MIN_MAP_DIMENSION, "height");

  if (
    typeof resolved.islandSize !== "number" ||
    !Number.isFinite(resolved.islandSize) ||
    resolved.islandSize <= 0 ||
    resolved.islandSize > 1
  ) {
    throw new MapError(
      "invalid-island-size",
      "islandSize must be a number in (0, 1]",
    );
  }

  for (const [field, value] of [
    ["mountainDensity", resolved.mountainDensity],
    ["lakeDensity", resolved.lakeDensity],
  ] as const) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 1) {
      throw new MapError(
        "invalid-density",
        `${field} must be a number in [0, 1)`,
      );
    }
  }

  if (
    typeof resolved.seed !== "number" ||
    !Number.isInteger(resolved.seed) ||
    resolved.seed < 0
  ) {
    throw new MapError("invalid-seed", "seed must be a non-negative integer");
  }

  return resolved;
}

/* ------------------------------------------------------------------ */
/* Map generation                                                      */
/* ------------------------------------------------------------------ */

/**
 * The screen-geometry offset of a hex from the centre of a rendered hex board
 * (M27-T1, #172), scaled so the constant factors cancel against `maxDist`.
 *
 * On a rendered pointy-top hex board the axial (q, r) axes are **not**
 * orthogonal: a cell at pixel offset `x = W·(q + r/2)`, `y = H·r` where
 * `W = √3·HEX_SIZE` and `H = 1.5·HEX_SIZE` (see `src/ui/presentation.ts`).
 * Measuring a cell's distance from the centre in raw (q, r) Euclidean space
 * therefore colours a **diamond/rhombus** landmass (the q and r axes are
 * treated as orthogonal even though they meet at 60°) instead of a roughly
 * circular one. Dividing both axes by the common `W` factor (which cancels in
 * `buildIsland`) leaves `x' = q + r/2` and `y' = (H/W)·r = (√3/2)·r`, so
 * Euclidean distance in these screen-normalised coordinates is the true
 * rendered distance and yields a circular island.
 */
function screenOffset(
  centre: Hex,
  q: number,
  r: number,
): { x: number; y: number } {
  const dq = q - centre.q;
  const dr = r - centre.r;
  return { x: dq + dr / 2, y: (Math.sqrt(3) / 2) * dr };
}

/** The rendered (screen-geometry) distance between the centre and a hex. */
function screenDist(centre: Hex, q: number, r: number): number {
  const { x, y } = screenOffset(centre, q, r);
  return Math.hypot(x, y);
}

/**
 * The farthest screen-geometry distance from the centre to any of the four
 * grid corners. Used as the radius reference so `baseRadius` scales the
 * island relative to the farthest reachable corner whatever the metric.
 */
function maxScreenDist(
  centre: Hex,
  width: number,
  height: number,
): number {
  let max = 0;
  for (const { q, r } of [
    { q: 0, r: 0 },
    { q: width - 1, r: 0 },
    { q: 0, r: height - 1 },
    { q: width - 1, r: height - 1 },
  ]) {
    max = Math.max(max, screenDist(centre, q, r));
  }
  return max;
}

/**
 * Build the island land mask from a star-shaped radial height map. Every
 * interior cell is land when its screen-geometry distance from the centre is
 * within a seed-modulated radius. Because the region is star-shaped (convex
 * around the centre) it is inherently connected and has no enclosed "natural"
 * water holes, so the only fully-enclosed interior water cells come from
 * carving lakes later. The border cells are always excluded.
 */
function buildIsland(
  rng: () => number,
  width: number,
  height: number,
  islandSize: number,
  centre: Hex,
): Set<string> {
  const maxDist = maxScreenDist(centre, width, height);
  const baseRadius = islandSize * maxDist;
  const phase = rng() * 2 * Math.PI;
  const amplitude = 0.1 + rng() * 0.15; // irregular coastline, max 0.25
  const lobes = 5 + Math.floor(rng() * 3); // how wavy the coast is

  const island = new Set<string>();
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      if (q === 0 || q === width - 1 || r === 0 || r === height - 1) continue;
      const d = screenDist(centre, q, r);
      if (d === 0) {
        island.add(key({ q, r }));
        continue;
      }
      const angle = Math.atan2(r - centre.r, q - centre.q);
      const radius = baseRadius * (1 + amplitude * Math.cos(lobes * angle + phase));
      if (d <= radius) island.add(key({ q, r }));
    }
  }
  return island;
}

/**
 * Follow the island's neighbours from the centre, keeping only cells reachable
 * through land. This is a defensive pass: with the star-shaped mask the whole
 * candidate set is already connected, but this guarantees a single contiguous
 * island even for extreme configurations.
 */
function growIsland(
  candidates: Set<string>,
  centre: Hex,
): Set<string> {
  const island = new Set<string>([key(centre)]);
  const stack: Hex[] = [centre];
  while (stack.length > 0) {
    const cur = stack.pop() as Hex;
    for (const nb of adjacentHexes(cur)) {
      // `candidates` only ever holds interior cells, so any out-of-bounds
      // neighbour is unfindable here and safely skipped by the candidates
      // check below; no separate bounds guard is needed.
      const k = key(nb);
      if (!candidates.has(k) || island.has(k)) continue;
      island.add(k);
      stack.push(nb);
    }
  }
  return island;
}

/**
 * Select which island cells become mountains and which become interior lakes.
 *
 * Mountains are chosen from all island cells. Lakes are chosen only from
 * island cells whose six neighbours are all land surface, so every lake is a
 * fully-enclosed interior water hole that cannot split the island. Both
 * selections are driven by the seeded RNG (deterministic per seed).
 */
function carveFeatures(
  rng: () => number,
  grid: Terrain[][],
  island: Set<string>,
  mountainDensity: number,
  lakeDensity: number,
): void {
  const landCells = [...island].map((k) => k.split(",").map(Number) as [
    number,
    number,
  ]);

  // Mountains first.
  const mountainCount = Math.min(
    landCells.length,
    Math.floor(landCells.length * mountainDensity),
  );
  const rugged = shuffle(landCells, rng);
  for (let i = 0; i < mountainCount; i++) {
    const [q, r] = rugged[i];
    grid[q][r] = "mountain";
  }

  // Lakes: only from cells still "land" that are fully enclosed by land.
  const lakeCandidates: [number, number][] = [];
  for (const [q, r] of landCells) {
    if (grid[q][r] !== "land") continue;
    const nb = adjacentHexes({ q, r });
    const enclosed = nb.filter(
      (h) => grid[h.q]?.[h.r] !== undefined && isLandSurface(grid[h.q][h.r]),
    ).length === nb.length;
    if (enclosed) lakeCandidates.push([q, r]);
  }

  const lakeCount = Math.min(
    lakeCandidates.length,
    Math.floor(landCells.length * lakeDensity),
  );
  const watery = shuffle(lakeCandidates, rng);
  for (let i = 0; i < lakeCount; i++) {
    const [q, r] = watery[i];
    grid[q][r] = "water";
  }
}

/**
 * Generate a playable hex map from the given (optional) configuration.
 *
 * Uses the default config when `config` is omitted. Returns a `GameMap`
 * satisfying the module's invariants (contiguous island, water border,
 * interior lakes). The same `seed` always yields the same map.
 */
export function generateMap(config?: MapConfig): GameMap {
  const cfg = resolveConfig(config);
  const { width, height, islandSize, mountainDensity, lakeDensity, seed } = cfg;
  const rng = mulberry32(seed);

  const centre: Hex = {
    q: Math.floor(width / 2),
    r: Math.floor(height / 2),
  };

  const grid: Terrain[][] = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => "water" as Terrain),
  );

  const candidates = buildIsland(rng, width, height, islandSize, centre);
  const island = growIsland(candidates, centre);

  for (const k of island) {
    const [q, r] = k.split(",").map(Number);
    grid[q][r] = "land";
  }

  carveFeatures(rng, grid, island, mountainDensity, lakeDensity);

  const cells: MapCell[] = [];
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      cells.push({ hex: { q, r }, terrain: grid[q][r] });
    }
  }

  return { width, height, cells };
}

/* ------------------------------------------------------------------ */
/* Lookup helpers (pure, thin conveniences)                            */
/* ------------------------------------------------------------------ */

/**
 * Look up the terrain at a hex. Returns `null` when the hex is outside the
 * map (rather than throwing) so callers can safely probe neighbours.
 */
export function terrainAt(map: GameMap, hex: Hex): Terrain | null {
  if (!inBounds(hex, map.width, map.height)) return null;
  // `cells` is built as a dense `width × height` grid (q-major), so the
  // indexed cell always exists for in-bounds hexes.
  return map.cells[hex.q * map.height + hex.r].terrain;
}

/** Whether a cell holds water. */
export function isWater(map: GameMap, hex: Hex): boolean {
  return terrainAt(map, hex) === "water";
}

/** Whether a cell is a mountain. */
export function isMountain(map: GameMap, hex: Hex): boolean {
  return terrainAt(map, hex) === "mountain";
}

/** Number of land-surface cells (land + mountain) on the map. */
export function landCellCount(map: GameMap): number {
  return map.cells.filter((c) => isLandSurface(c.terrain)).length;
}
