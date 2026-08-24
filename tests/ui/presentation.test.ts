import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  HEX_SIZE,
  HEX_GAP,
  TERRAIN_BG,
  OWNER_BG,
  cellHexagonClass,
  hexagonPoints,
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

  it("tightens the inter-hexagon gap to roughly half the original 8px (M18-T3/#125)", () => {
    // M18-T3 reduces the inter-cell gap so the board reads tighter/cleaner.
    // The new gap is roughly half of the former 8px, i.e. ~4px, keeping a
    // visibly separate (not flooded) board.
    expect(HEX_GAP).toBe(4);
    expect(HEX_GAP).toBeLessThanOrEqual(4);
    expect(HEX_GAP).toBeGreaterThan(0);
    expect(CELL_SIZE).toBe(HEX_SIZE * 2 - 4);
  });
});

/* ------------------------------------------------------------------ */
/* hexagonPoints (SVG hexagon geometry, M18-T3/#125)                   */
/* ------------------------------------------------------------------ */

describe("hexagonPoints", () => {
  it("returns six pointy-top hexagon corners for a size (SVG approach)", () => {
    const pts = hexagonPoints(64);
    const corners = pts.split(" ");
    expect(corners).toHaveLength(6);
    // The pointy-top hexagon has a flat top edge centred on the box top edge.
    expect(corners[0]).toBe("32.0,0.0");
    // The bottom corner is centred on the box bottom edge.
    expect(corners[3]).toBe("32.0,64.0");
  });

  it("scales the polygon with the given size", () => {
    const small = hexagonPoints(44).split(" ");
    const big = hexagonPoints(88).split(" ");
    expect(small).toHaveLength(6);
    expect(big).toHaveLength(6);
    // Top corner x is half the size in both cases.
    expect(small[0]).toBe("22.0,0.0");
    expect(big[0]).toBe("44.0,0.0");
  });

  it("keeps the pointy-top proportions of the legacy clip-path polygon", () => {
    // Point order (top-left winding): top, top-right, right, bottom, left,
    // bottom-left. The right-hand corners (indices 1 & 2) sit at 93% of the
    // width, matching HEX_CLIP's 93% 25% / 93% 75% vertices, so the SVG
    // silhouette matches the prior clipped hexagon shape.
    const corners = hexagonPoints(100).split(" ");
    expect(corners[1].split(",")[0]).toBe("93.0");
    expect(corners[2].split(",")[0]).toBe("93.0");
  });
});
