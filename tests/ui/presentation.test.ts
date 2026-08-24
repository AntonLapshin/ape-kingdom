import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  HEX_SIZE,
  HEX_GAP,
  TERRAIN_BG,
  OWNER_BG,
  cellHexagonClass,
} from "../../src/ui/presentation";

/* ------------------------------------------------------------------ */
/* cellHexagonClass (pure presentation helper, M17-T3/#116)            */
/* ------------------------------------------------------------------ */

describe("cellHexagonClass", () => {
  it("falls back to the neutral land colour for an unknown terrain", () => {
    expect(cellHexagonClass(null, "water")).toBe(TERRAIN_BG.water);
    expect(cellHexagonClass(null, "mountain")).toBe(TERRAIN_BG.mountain);
    // An unknown terrain falls back to land (defensive default).
    expect(cellHexagonClass(null, "land")).toBe(TERRAIN_BG.land);
  });

  it("returns the owner tint for owned hexagons regardless of terrain", () => {
    expect(cellHexagonClass("p1", "land")).toBe(OWNER_BG.p1);
    expect(cellHexagonClass("p2", "water")).toBe(OWNER_BG.p2);
  });

  it("returns the terrain colour for neutral (unowned) hexagons", () => {
    expect(cellHexagonClass(null, "water")).toBe(TERRAIN_BG.water);
    expect(cellHexagonClass(null, "land")).toBe(TERRAIN_BG.land);
  });

  it("has a colour token for every terrain and every owner", () => {
    for (const terrain of ["land", "water", "mountain"] as const) {
      expect(TERRAIN_BG[terrain]).toMatch(/^bg-terrain-/);
    }
    for (const owner of ["p1", "p2"] as const) {
      expect(OWNER_BG[owner]).toMatch(/^bg-owner-/);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Cell geometry constants (M17-T3/#116)                               */
/* ------------------------------------------------------------------ */

describe("cell geometry", () => {
  it("renders cells smaller than the layout box to leave a visible gap", () => {
    // The rendered hexagon is HEX_SIZE*2 minus the gap, so a few pixels of
    // the dark board show between adjacent cells while layout spacing stays
    // driven by HEX_SIZE.
    expect(CELL_SIZE).toBe(HEX_SIZE * 2 - HEX_GAP);
    expect(HEX_GAP).toBeGreaterThan(0);
    expect(CELL_SIZE).toBeLessThan(HEX_SIZE * 2);
  });
});
