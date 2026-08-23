import { describe, it, expect } from "vitest";
import type { GameMap, Terrain } from "../../src/core/mapGenerator";
import {
  DEFAULT_MAP_CONFIG,
  MIN_MAP_DIMENSION,
  MapError,
  generateMap,
  isLandSurface,
  isMountain,
  isWater,
  landCellCount,
  resolveConfig,
  terrainAt,
} from "../../src/core/mapGenerator";
import { adjacentHexes } from "../../src/core/game";

/** Rebuild a 2D terrain lookup from a generated map for invariant checks. */
function toGrid(map: GameMap): Terrain[][] {
  const grid: Terrain[][] = Array.from({ length: map.width }, () =>
    Array.from({ length: map.height }, () => "water" as Terrain),
  );
  for (const cell of map.cells) {
    grid[cell.hex.q][cell.hex.r] = cell.terrain;
  }
  return grid;
}

/** Count cells of each terrain kind on a map. */
function counts(map: GameMap): Record<Terrain, number> {
  const c: Record<Terrain, number> = { land: 0, water: 0, mountain: 0 };
  for (const cell of map.cells) c[cell.terrain]++;
  return c;
}

/** True when all land + mountain cells form a single connected component. */
function isSingleContiguousIsland(map: GameMap): boolean {
  const land = new Set<string>();
  for (const cell of map.cells) {
    if (isLandSurface(cell.terrain)) land.add(`${cell.hex.q},${cell.hex.r}`);
  }
  if (land.size === 0) return true;
  const start = [...land][0];
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const [q, r] = stack.pop()!.split(",").map(Number);
    for (const nb of adjacentHexes({ q, r })) {
      const k = `${nb.q},${nb.r}`;
      if (land.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(k);
      }
    }
  }
  return seen.size === land.size;
}

/** True when every border cell is water. */
function allBorderWater(map: GameMap): boolean {
  return map.cells.every(({ hex, terrain }) => {
    const border =
      hex.q === 0 ||
      hex.q === map.width - 1 ||
      hex.r === 0 ||
      hex.r === map.height - 1;
    return !border || terrain === "water";
  });
}

/** Count cellular water cells that are fully enclosed by land surface. */
function countEnclosedLakes(map: GameMap): number {
  const grid = toGrid(map);
  let lakes = 0;
  for (let q = 0; q < map.width; q++) {
    for (let r = 0; r < map.height; r++) {
      if (grid[q][r] !== "water") continue;
      const border =
        q === 0 || q === map.width - 1 || r === 0 || r === map.height - 1;
      if (border) continue; // border water is the sea, not a lake
      const nb = adjacentHexes({ q, r });
      const allEnclosed = nb.every(
        (h) =>
          h.q >= 0 &&
          h.q < map.width &&
          h.r >= 0 &&
          h.r < map.height &&
          isLandSurface(grid[h.q][h.r]),
      );
      if (allEnclosed) lakes++;
    }
  }
  return lakes;
}

/** Return the `kind` of a MapError thrown by a callback. */
function thrownKind(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof MapError) return e.kind;
    throw e;
  }
  throw new Error("expected a MapError to be thrown");
}

describe("mapGenerator", () => {
  it("exposes the default config with playable defaults", () => {
    expect(DEFAULT_MAP_CONFIG).toEqual({
      width: 20,
      height: 20,
      islandSize: 0.66,
      mountainDensity: 0.1,
      lakeDensity: 0.05,
      seed: 0,
    });
    expect(MIN_MAP_DIMENSION).toBe(5);
  });

  describe("isLandSurface", () => {
    it("treats land and mountain as land surface, water as not", () => {
      expect(isLandSurface("land")).toBe(true);
      expect(isLandSurface("mountain")).toBe(true);
      expect(isLandSurface("water")).toBe(false);
    });
  });

  describe("resolveConfig", () => {
    it("fills every field with defaults when config is omitted", () => {
      expect(resolveConfig()).toEqual(DEFAULT_MAP_CONFIG);
    });

    it("merges partial config over the defaults", () => {
      expect(
        resolveConfig({ width: 10, height: 8, seed: 7 }),
      ).toEqual({ ...DEFAULT_MAP_CONFIG, width: 10, height: 8, seed: 7 });
    });

    it("accepts a fully-specified config unchanged", () => {
      const cfg = {
        width: 12,
        height: 11,
        islandSize: 0.5,
        mountainDensity: 0.2,
        lakeDensity: 0.1,
        seed: 3,
      };
      expect(resolveConfig(cfg)).toEqual(cfg);
    });

    it("accepts zero densities and allows the minimum dimension", () => {
      const cfg = resolveConfig({
        width: MIN_MAP_DIMENSION,
        height: MIN_MAP_DIMENSION,
        mountainDensity: 0,
        lakeDensity: 0,
      });
      expect(cfg.width).toBe(MIN_MAP_DIMENSION);
      expect(cfg.mountainDensity).toBe(0);
      expect(cfg.lakeDensity).toBe(0);
    });

    it("rejects non-integer width", () => {
      expect(() => resolveConfig({ width: 5.5 })).toThrow(MapError);
      expect(() => resolveConfig({ width: 5.5 })).toThrow(/width/);
    });

    it("rejects too-small width and height", () => {
      expect(
        thrownKind(() => resolveConfig({ width: MIN_MAP_DIMENSION - 1 })),
      ).toBe("invalid-dimension");
      expect(thrownKind(() => resolveConfig({ height: 0 }))).toBe(
        "invalid-dimension",
      );
    });

    it("rejects islandSize outside (0, 1]", () => {
      expect(thrownKind(() => resolveConfig({ islandSize: 0 }))).toBe(
        "invalid-island-size",
      );
      expect(() => resolveConfig({ islandSize: -0.2 })).toThrow(MapError);
      expect(() => resolveConfig({ islandSize: 1.5 })).toThrow(MapError);
      expect(() => resolveConfig({ islandSize: Number.NaN })).toThrow(MapError);
    });

    it("rejects densities outside [0, 1)", () => {
      expect(thrownKind(() => resolveConfig({ mountainDensity: 1 }))).toBe(
        "invalid-density",
      );
      expect(() => resolveConfig({ mountainDensity: 1.2 })).toThrow(MapError);
      expect(() => resolveConfig({ lakeDensity: -0.1 })).toThrow(MapError);
      expect(thrownKind(() => resolveConfig({ lakeDensity: 1 }))).toBe(
        "invalid-density",
      );
    });

    it("rejects non-integer or negative seeds", () => {
      expect(thrownKind(() => resolveConfig({ seed: -1 }))).toBe("invalid-seed");
      expect(() => resolveConfig({ seed: 2.5 })).toThrow(MapError);
      expect(() => resolveConfig({ seed: Number.NaN })).toThrow(MapError);
    });

    it("exposes the error kind on MapError", () => {
      try {
        resolveConfig({ width: 2 });
        expect.unreachable();
      } catch (e) {
        const err = e as MapError;
        expect(err).toBeInstanceOf(MapError);
        expect(err.name).toBe("MapError");
        expect(err.kind).toBe("invalid-dimension");
      }
    });

    it("defaults seed to 0 when omitted", () => {
      expect(resolveConfig({}).seed).toBe(0);
    });
  });

  describe("generateMap", () => {
    it("produces a 20x20 map with 400 cells by default", () => {
      const map = generateMap();
      expect(map.width).toBe(20);
      expect(map.height).toBe(20);
      expect(map.cells).toHaveLength(400);
    });

    it("respects explicit width and height", () => {
      const map = generateMap({ width: 12, height: 7 });
      expect(map.width).toBe(12);
      expect(map.height).toBe(7);
      expect(map.cells).toHaveLength(12 * 7);
    });

    it("has an all-water border (sea around the island)", () => {
      expect(allBorderWater(generateMap())).toBe(true);
    });

    it("forms a single contiguous island", () => {
      expect(isSingleContiguousIsland(generateMap())).toBe(true);
    });

    it("contains at least one mountain with default density", () => {
      expect(counts(generateMap()).mountain).toBeGreaterThan(0);
    });

    it("contains at least one enclosed interior lake with default density", () => {
      const map = generateMap();
      expect(counts(map).water).toBeGreaterThan(0);
      // exactly the carved lakes are fully enclosed by land
      expect(countEnclosedLakes(map)).toBeGreaterThan(0);
    });

    it("places zero mountains and zero lakes at zero densities", () => {
      const map = generateMap({
        mountainDensity: 0,
        lakeDensity: 0,
      });
      const c = counts(map);
      expect(c.mountain).toBe(0);
      // with no lakes and a hole-free star-shaped island, no interior water
      // cell can be fully enclosed by land
      expect(countEnclosedLakes(map)).toBe(0);
    });

    it("is deterministic: the same seed reproduces the same map", () => {
      const a = generateMap({ seed: 42 });
      const b = generateMap({ seed: 42 });
      expect(a.cells).toEqual(b.cells);
    });

    it("produces different maps for different seeds", () => {
      const a = generateMap({ seed: 1 });
      const b = generateMap({ seed: 2 });
      expect(a.cells).not.toEqual(b.cells);
    });

    it("still satisfies invariants on the minimum 5x5 grid", () => {
      const map = generateMap({ width: 5, height: 5 });
      expect(map.cells).toHaveLength(25);
      expect(allBorderWater(map)).toBe(true);
      expect(isSingleContiguousIsland(map)).toBe(true);
    });

    it("propagates config validation errors", () => {
      expect(() => generateMap({ width: 3 })).toThrow(MapError);
    });
  });

  describe("lookup helpers", () => {
    const map = generateMap({ seed: 5 });

    it("terrainAt returns the terrain at a known cell", () => {
      const cell = map.cells[0];
      expect(terrainAt(map, cell.hex)).toBe(cell.terrain);
    });

    it("terrainAt returns null for out-of-bounds hexes", () => {
      expect(terrainAt(map, { q: -1, r: 0 })).toBeNull();
      expect(terrainAt(map, { q: 0, r: map.height })).toBeNull();
    });

    it("isWater / isMountain delegate correctly to terrainAt", () => {
      const borderCell = map.cells.find(
        (c) => c.hex.q === 0 || c.hex.r === 0,
      )!;
      expect(isWater(map, borderCell.hex)).toBe(true);
      expect(isMountain(map, borderCell.hex)).toBe(false);
      expect(isWater(map, { q: -5, r: -5 })).toBe(false);
      expect(isMountain(map, { q: -5, r: -5 })).toBe(false);
    });

    it("landCellCount counts land + mountain cells", () => {
      const c = counts(map);
      expect(landCellCount(map)).toBe(c.land + c.mountain);
    });
  });
});
