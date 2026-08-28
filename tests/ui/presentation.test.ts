import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  HEX_SIZE,
  HEX_GAP,
  TERRAIN_BG,
  OWNER_BG,
  cellHexagonClass,
  cellOwner,
  isEndTurnEnabled,
  hexagonPoints,
  boardLayout,
  BOARD_PAD,
  hexToPixel,
} from "../../src/ui/presentation";
import type { BoardCell } from "../../src/ui/viewModels/useGameSession";

/** A minimal cell-shaped input for the pure `boardLayout` helper. */
function cell(q: number, r: number): BoardCell {
  return {
    hex: { q, r },
    terrain: "land",
    site: null,
    unit: null,
    grave: null,
    owner: null,
    fogged: false,
  };
}

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
/* isEndTurnEnabled (End Turn enabled state, M19-T2/#131)              */
/* ------------------------------------------------------------------ */

describe("isEndTurnEnabled", () => {
  it("is enabled whenever it is the human's turn and the game is not done", () => {
    // The human (p1) is mid-turn with the game still running: enabled whether
    // or not the player has already moved/fought all their units (#131).
    expect(
      isEndTurnEnabled({ currentPlayer: "p1", isDone: false }),
    ).toBe(true);
  });

  it("is disabled once the game has ended", () => {
    // A done game has no turn left to end, even on the human's turn.
    expect(isEndTurnEnabled({ currentPlayer: "p1", isDone: true })).toBe(false);
  });

  it("is disabled when it is not the human's turn", () => {
    // The AI's (p2) turn — the human cannot end a turn they are not playing.
    expect(isEndTurnEnabled({ currentPlayer: "p2", isDone: false })).toBe(
      false,
    );
    expect(isEndTurnEnabled({ currentPlayer: "p2", isDone: true })).toBe(false);
  });

  it("is not gated on all units having acted (#131)", () => {
    // The enabled rule only depends on whose turn it is and whether the game is
    // over — it never checks how many units have acted, so End Turn always
    // works even with unmoved units remaining on the board.
    expect(
      isEndTurnEnabled({ currentPlayer: "p1", isDone: false }),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* cellOwner (territory-owner precedence, M19-T1/#130)                  */
/* ------------------------------------------------------------------ */

describe("cellOwner", () => {
  const p1 = { owner: "p1" as const };
  const p2 = { owner: "p2" as const };
  const neutral = { owner: null };

  it("returns null for a cell with neither site nor unit", () => {
    expect(cellOwner(null, null)).toBeNull();
  });

  it("persists the site owner even when no unit stands on the site", () => {
    // A captured/owned territory with its unit moved away stays owned.
    expect(cellOwner(p1, null)).toBe("p1");
    expect(cellOwner(p2, null)).toBe("p2");
  });

  it("the site owner wins over the unit owner when both are present", () => {
    // The territory is owned regardless of which unit stands on it.
    expect(cellOwner(p1, p2)).toBe("p1");
    expect(cellOwner(p2, p1)).toBe("p2");
    expect(cellOwner(p1, p1)).toBe("p1");
  });

  it("falls back to the unit owner only for a site-less hex", () => {
    // A unit standing on plain land colours the cell until it moves away.
    expect(cellOwner(null, p1)).toBe("p1");
    expect(cellOwner(null, p2)).toBe("p2");
  });

  it("a neutral site with a unit renders by the unit until it leaves", () => {
    // A neutral (unowned) site shows the occupying unit's colour; once the
    // unit leaves and nothing owns the site, the cell is neutral again.
    expect(cellOwner(neutral, p1)).toBe("p1");
    expect(cellOwner(neutral, null)).toBeNull();
  });

  it("persistent site-less territory colours an empty hex", () => {
    // A site-less, empty cell stays owned by its recorded territory after the
    // unit leaves (M24-T2, #160).
    expect(cellOwner(null, null, "p1")).toBe("p1");
    expect(cellOwner(null, null, "p2")).toBe("p2");
  });

  it("the territory owner wins over the standing unit's owner", () => {
    // Even with a unit standing on the site-less hex, the recorded territory
    // (which persists after the unit leaves) colours the cell.
    expect(cellOwner(null, p2, "p1")).toBe("p1");
    expect(cellOwner(null, p1, "p2")).toBe("p2");
  });

  it("a site owner always wins over territory", () => {
    // The site owner is the strongest precedence — it beats recorded territory.
    expect(cellOwner(p2, null, "p1")).toBe("p2");
    expect(cellOwner(p1, null, "p2")).toBe("p1");
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

  it("halves the inter-hexagon gap to ~2px (M27-T4/#187)", () => {
    // M27-T4 halves the M18-T3 gap (~4px) so the map reads tighter/more
    // connected. The new gap is ~2px, still keeping a visibly separate
    // (not flooded) board via the SVG glass-edge highlight.
    expect(HEX_GAP).toBe(2);
    expect(HEX_GAP).toBeLessThanOrEqual(2);
    expect(HEX_GAP).toBeGreaterThan(0);
    expect(CELL_SIZE).toBe(HEX_SIZE * 2 - 2);
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

/* ------------------------------------------------------------------ */
/* boardLayout (memoized pure bounding-box helper, M29-T2/#211)       */
/* ------------------------------------------------------------------ */

describe("boardLayout", () => {
  /** A tiny 2×1 board laid out around hex (0,0) and (1,0). */
  const twoCells = [cell(0, 0), cell(1, 0)];

  /** A different board (different cells AND different array identity). */
  const threeCells = [cell(0, 0), cell(0, 1), cell(1, 1)];

  it("mirrors the inline Board geometry: min/max of hexToPixel plus padding", () => {
    const positions = twoCells.map((c) => hexToPixel(c.hex.q, c.hex.r));
    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));
    const pad = HEX_SIZE + 8;
    const layout = boardLayout(twoCells);
    expect(layout.minX).toBe(minX);
    expect(layout.minY).toBe(minY);
    expect(layout.pad).toBe(pad);
    expect(layout.width).toBe(maxX - minX + pad * 2);
    expect(layout.height).toBe(maxY - minY + pad * 2);
  });

  it("centres the map: origins are offset by padding inside the wrapper", () => {
    // The (0,0) cell maps to pixel (0,0), which after the minX/minY offset
    // lands at exactly `pad` px inside the wrapper's top-left.
    const layout = boardLayout(twoCells);
    expect(layout.minX).toBe(0);
    expect(layout.minY).toBe(0);
    expect(layout.pad).toBe(BOARD_PAD);
  });

  it("returns a stable/identical result for the same input array", () => {
    expect(boardLayout(twoCells)).toEqual(boardLayout(twoCells));
    // Every field is deterministic and identical across calls.
    const a = boardLayout(twoCells);
    const b = boardLayout(twoCells);
    expect(a).toEqual(b);
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
  });

  it("returns a recomputed/different result when the input cells change", () => {
    const a = boardLayout(twoCells);
    const b = boardLayout(threeCells);
    // A board with an extra cell in a new row spans further vertically.
    expect(b.height).not.toBe(a.height);
    expect(b.minY).toBe(0);
    expect(b.height).toBeGreaterThan(a.height);
  });

  it("is a pure function: it never mutates the input cells array", () => {
    const input = twoCells;
    const snapshot = JSON.stringify(input);
    boardLayout(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
