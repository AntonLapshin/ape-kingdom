import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Board } from "../../src/ui/components/Board";
import { hexToPixel, SITE_LABELS } from "../../src/ui/presentation";
import { boardCells } from "../../src/ui/viewModels/useGameSession";
import { standardSetup } from "../../src/core/gameSession";

/* ------------------------------------------------------------------ */
/* hexToPixel (pure geometry helper)                                   */
/* ------------------------------------------------------------------ */

describe("hexToPixel", () => {
  it("maps axial hex coordinates to a pixel position", () => {
    const origin = hexToPixel(0, 0);
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);
    // Moving one step in q increases x by the horizontal hex spacing.
    const q1 = hexToPixel(1, 0);
    expect(q1.x).toBeGreaterThan(origin.x);
    expect(q1.y).toBe(origin.y);
    // Moving one step in r increases y by the vertical hex spacing.
    const r1 = hexToPixel(0, 1);
    expect(r1.y).toBeGreaterThan(origin.y);
  });
});

/* ------------------------------------------------------------------ */
/* SITE_LABELS                                                         */
/* ------------------------------------------------------------------ */

describe("SITE_LABELS", () => {
  it("has a label for every site kind", () => {
    expect(SITE_LABELS.Grove).toBe("Grove");
    expect(SITE_LABELS.Nest).toBe("Nest");
    expect(SITE_LABELS.HomeTree).toBe("Home Tree");
  });
});

/* ------------------------------------------------------------------ */
/* Board component                                                     */
/* ------------------------------------------------------------------ */

describe("Board", () => {
  const state = standardSetup();
  const board = boardCells(state);
  // p1's Home Tree hex on the generated board (map-agnostic).
  const p1Home = state.sites.find(
    (s) => s.kind === "HomeTree" && s.owner === "p1",
  )!.hex;
  const p1HomeKey = `${p1Home.q},${p1Home.r}`;

  it("renders one cell per hex of the generated map with terrain", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    // The board renders the full generated map (one cell per map hex).
    expect(cells).toHaveLength(state.map.cells.length);
    // The p1 Home Tree cell is owned by p1 and sits on the p1 map cell's terrain.
    const home = cells.find((c) => c.dataset.hex === p1HomeKey);
    expect(home).toBeDefined();
    expect(home!.dataset.owner).toBe("p1");
    const mapHome = state.map.cells.find(
      (m) => `${m.hex.q},${m.hex.r}` === p1HomeKey,
    )!;
    expect(home!.dataset.terrain).toBe(mapHome.terrain);
  });

  it("renders distinct terrain across the generated map", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    const terrains = new Set(cells.map((c) => c.dataset.terrain));
    // The default generated 20x20 map contains land, water, and mountain cells.
    expect(terrains).toEqual(new Set(["land", "water", "mountain"]));
  });

  it("renders a unit badge for occupied cells", () => {
    render(<Board board={board} currentPlayer="p1" />);
    // The standard setup has 8 starting units.
    const units = screen.getAllByTestId("board-unit");
    expect(units).toHaveLength(state.units.length);
  });

  it("renders the unit badge text as '<kind> <rank>' (view-model wiring)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    // The starting Monkey at p1's Home Tree resolves to rank 1 via the view model.
    const homeCell = screen
      .getAllByTestId("board-cell")
      .find((c) => c.dataset.hex === p1HomeKey);
    const badge = homeCell!.querySelector('[data-testid="board-unit"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("Monkey 1");
  });

  it("labels the current player in the board footer", () => {
    render(<Board board={board} currentPlayer="p1" />);
    expect(screen.getByText(/Turn: You \(p1\)/)).toBeInTheDocument();
  });
});
