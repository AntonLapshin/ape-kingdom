import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Render counter per board cell, used by the memoization spy below. Declared
// with vi.hoisted so the (also-hoisted) module mock can read/write it.
const { renderCounts } = vi.hoisted(() => ({
  renderCounts: new Map<string, number>(),
}));

// Replace the real `Cell` with a memoized counting double that delegates to
// the real render. Because the counting double is also `React.memo`-wrapped, a
// pan/zoom-only re-render of `Board` must NOT bump any cell's counter (the
// cells skip), while a change to a cell's actual data must bump just that cell
// (M29-T1, #209).
vi.mock("../../src/ui/components/Cell", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/ui/components/Cell")>();
  const { memo, createElement } = await import("react");
  const { Cell: RealCell } = actual;
  const CountingCell = memo(function CountingCell(
    props: import("../../src/ui/components/Cell").CellProps,
  ) {
    const key = `${props.q},${props.r}`;
    renderCounts.set(key, (renderCounts.get(key) ?? 0) + 1);
    // Render the real Cell through JSX/createElement (never call a memo
    // component directly).
    return createElement(RealCell, props);
  });
  return { ...actual, Cell: CountingCell };
});

import { Board } from "../../src/ui/components/Board";
import { hexToPixel, SITE_LABELS } from "../../src/ui/presentation";
import { gameIcons } from "../../src/assets/icons";
import { boardCells } from "../../src/ui/viewModels/useGameSession";
import { standardSetup } from "../../src/core/gameSession";
import { terrainAt } from "../../src/core/mapGenerator";
import {
  moveUnit,
  attackUnit,
  createUnit,
  sameHex,
  type Hex,
} from "../../src/core/game";

/* ------------------------------------------------------------------ */
/* Pan/zoom cell memoization (M29-T1, #209)                            */
/* ------------------------------------------------------------------ */

describe("Board pan/zoom cell memoization (M29-T1/#209)", () => {
  beforeEach(() => {
    renderCounts.clear();
  });

  // A tiny 2-cell board so the counter assertions stay readable.
  const smallBoard: import("../../src/ui/viewModels/useGameSession").BoardCell[] = [
    {
      hex: { q: 0, r: 0 },
      terrain: "land",
      site: null,
      unit: null,
      grave: null,
      owner: null,
      fogged: false,
    },
    {
      hex: { q: 1, r: 0 },
      terrain: "land",
      site: null,
      unit: null,
      grave: null,
      owner: null,
      fogged: false,
    },
  ];

  it("does not re-render any cell when only the pan offset changes", () => {
    const onSelectCell = vi.fn();
    const { rerender } = render(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 0, y: 0 }} onSelectCell={onSelectCell} />,
    );
    const initial0 = renderCounts.get("0,0") ?? 0;
    const initial1 = renderCounts.get("1,0") ?? 0;
    expect(initial0).toBe(1);
    expect(initial1).toBe(1);

    // Pan changes only the wrapper transform — the cells must skip.
    rerender(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 40, y: -25 }} onSelectCell={onSelectCell} />,
    );
    expect(renderCounts.get("0,0") ?? 0).toBe(initial0);
    expect(renderCounts.get("1,0") ?? 0).toBe(initial1);
  });

  it("does not re-render any cell when only the zoom changes", () => {
    const onSelectCell = vi.fn();
    const { rerender } = render(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 0, y: 0 }} zoom={1} onSelectCell={onSelectCell} />,
    );
    rerender(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 0, y: 0 }} zoom={1.5} onSelectCell={onSelectCell} />,
    );
    expect(renderCounts.get("0,0")).toBe(1);
    expect(renderCounts.get("1,0")).toBe(1);
  });

  it("re-renders a cell when its actual data (selection) changes", () => {
    const onSelectCell = vi.fn();
    const { rerender } = render(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 0, y: 0 }} onSelectCell={onSelectCell} />,
    );
    expect(renderCounts.get("0,0")).toBe(1);
    expect(renderCounts.get("1,0")).toBe(1);

    // Select hex (0,0): only that cell's selection prop changes -> only it re-renders.
    rerender(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 0, y: 0 }} selectedHex={{ q: 0, r: 0 }} onSelectCell={onSelectCell} />,
    );
    expect(renderCounts.get("0,0")).toBe(2);
    expect(renderCounts.get("1,0")).toBe(1);
  });

  it("keeps clicking a cell selecting it (onSelect still fires with the hex)", () => {
    const onSelectCell = vi.fn();
    render(
      <Board board={smallBoard} currentPlayer="p1" pan={{ x: 10, y: 10 }} onSelectCell={onSelectCell} />,
    );
    const cell = screen.getAllByTestId("board-cell").find((c) => c.dataset.hex === "0,0")!;
    fireEvent.click(cell);
    expect(onSelectCell).toHaveBeenCalledTimes(1);
    expect(onSelectCell).toHaveBeenCalledWith({ q: 0, r: 0 });
  });
});

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

  it("tints owned land cells by their owner and keeps neutral terrain colour (M13-T2/#89)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    // Owned cells (p1/p2 Home Trees and their territories) carry their owner
    // tint token; neutral cells keep their terrain background.
    const p1Owned = cells.filter((c) => c.dataset.owner === "p1");
    const p2Owned = cells.filter((c) => c.dataset.owner === "p2");
    const neutral = cells.filter((c) => c.dataset.owner === "neutral");
    expect(p1Owned.length).toBeGreaterThan(0);
    expect(p2Owned.length).toBeGreaterThan(0);
    for (const cell of p1Owned) {
      expect(cell.className).toContain("bg-owner-p1");
      expect(cell.className).not.toContain("bg-terrain-");
    }
    for (const cell of p2Owned) {
      expect(cell.className).toContain("bg-owner-p2");
      expect(cell.className).not.toContain("bg-terrain-");
    }
    for (const cell of neutral) {
      expect(cell.className).toMatch(/bg-terrain-(land|water|mountain)/);
    }
  });

  it("renders a unit badge for occupied cells", () => {
    render(<Board board={board} currentPlayer="p1" />);
    // The standard setup has 8 starting units.
    const units = screen.getAllByTestId("board-unit");
    expect(units).toHaveLength(state.units.length);
  });

  it("renders the unit badge with its pixel-art icon and rank (view-model wiring)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    // The starting Monkey at p1's Home Tree resolves to rank 1 via the view model.
    const homeCell = screen
      .getAllByTestId("board-cell")
      .find((c) => c.dataset.hex === p1HomeKey);
    const badge = homeCell!.querySelector('[data-testid="board-unit"]');
    expect(badge).not.toBeNull();
    const img = badge!.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe(gameIcons.monkey);
    expect(badge!.textContent).toBe("1");
  });

  it("renders a grave marker on a cell with no unit (M21-T2/#191)", () => {
    // Place an enemy grave on an empty cell and verify the board renders a
    // grave chip there (and never alongside the cell's own unit).
    const emptyHex = state.map.cells
      .map((c) => c.hex)
      .find((h) => !state.units.some((u) => sameHex(u.hex, h)))!;
    const withGrave = {
      ...state,
      graves: [{ hex: emptyHex, owner: "p2" as const }],
    };
    render(<Board board={boardCells(withGrave)} currentPlayer="p1" />);
    const graves = screen.getAllByTestId("board-grave");
    expect(graves).toHaveLength(1);
    expect(graves[0].dataset.owner).toBe("p2");
    // The grave cell carries no unit badge.
    const graveCell = screen
      .getAllByTestId("board-cell")
      .find((c) => c.dataset.hex === `${emptyHex.q},${emptyHex.r}`)!;
    expect(graveCell.querySelector('[data-testid="board-unit"]')).toBeNull();
    expect(graveCell.querySelector('[data-testid="board-grave"]')).not.toBeNull();
  });

  it("renders no grave markers on a board with none (M21-T2/#191)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    expect(screen.queryAllByTestId("board-grave")).toHaveLength(0);
  });

  it("renders a unit that has already acted as dimmed/opaque (M19-T6/#190)", () => {
    // p1's starting units are created with hasActed=true, so the standardSetup
    // board view (no turn reset) surfaces them as acted and dims them. Render
    // the view directly so the board's hasActed wiring is exercised.
    render(<Board board={board} currentPlayer="p1" />);
    const badges = screen.getAllByTestId("board-unit");
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge.dataset.hasActed).toBe("true");
      expect(badge.className).toContain("opacity-40");
      expect(badge.className).toContain("grayscale");
    }
  });

  it("renders an unacted unit normally (not dimmed) once the player can move (M19-T6/#190)", () => {
    // Reset p1's units so they may act (hasActed=false) — the fresh-turn
    // state the human sees — and confirm the board does not dim them.
    const playable = {
      ...state,
      units: state.units.map((u) =>
        u.owner === "p1" ? { ...u, hasActed: false } : u,
      ),
    };
    render(<Board board={boardCells(playable)} currentPlayer="p1" />);
    const badges = screen.getAllByTestId("board-unit");
    const p1Badges = badges.filter((b) => b.dataset.owner === "p1");
    expect(p1Badges.length).toBeGreaterThan(0);
    for (const badge of p1Badges) {
      expect(badge.dataset.hasActed).toBe("false");
      expect(badge.className).not.toContain("opacity-");
      expect(badge.className).not.toContain("grayscale");
    }
  });

  it("does not render a turn indicator over the map (M23-T1/#150)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    // The turn is clear from the active state / End Turn flow, so no "Turn:"
    // label is shown over the board.
    expect(screen.queryByText(/Turn:/i)).not.toBeInTheDocument();
  });

  it("applies the pan offset as a translate to the board transform", () => {
    const { container } = render(
      <Board board={board} currentPlayer="p1" pan={{ x: 40, y: -25 }} />,
    );
    const boardEl = container.querySelector('[data-testid="board"]')!;
    // A pan offset without an explicit zoom applies scale(1) alongside it.
    expect(boardEl).toHaveStyle({ transform: "translate(40px, -25px) scale(1)" });
  });

  it("applies no transform when the pan offset is omitted", () => {
    const { container } = render(<Board board={board} currentPlayer="p1" />);
    const boardEl = container.querySelector('[data-testid="board"]')!;
    expect(boardEl).not.toHaveStyle({ transform: "translate(0px, 0px)" });
  });

  it("applies the zoom scale combined with the pan offset", () => {
    const { container } = render(
      <Board board={board} currentPlayer="p1" pan={{ x: 40, y: -25 }} zoom={1.2} />,
    );
    const boardEl = container.querySelector('[data-testid="board"]')!;
    expect(boardEl).toHaveStyle({
      transform: "translate(40px, -25px) scale(1.2)",
    });
  });

  it("applies only the pan translate when zoom is omitted", () => {
    const { container } = render(
      <Board board={board} currentPlayer="p1" pan={{ x: 5, y: 5 }} />,
    );
    const boardEl = container.querySelector('[data-testid="board"]')!;
    expect(boardEl).toHaveStyle({ transform: "translate(5px, 5px) scale(1)" });
  });

  it("scales alone when only zoom is provided", () => {
    const { container } = render(
      <Board board={board} currentPlayer="p1" zoom={0.5} />,
    );
    const boardEl = container.querySelector('[data-testid="board"]')!;
    // Without a pan offset no scale is applied (transform stays unset).
    expect(boardEl).not.toHaveStyle({ transform: "scale(0.5)" });
  });

  it("highlights the selected hex cell via the view-model data", () => {
    render(
      <Board board={board} currentPlayer="p1" selectedHex={p1Home} />,
    );
    const cells = screen.getAllByTestId("board-cell");
    const selected = cells.find((c) => c.dataset.hex === p1HomeKey)!;
    // Only the selected cell carries the selected flag/highlight.
    expect(selected.dataset.selected).toBe("true");
    expect(selected.className).toContain("hex-selected");
    const others = cells.filter((c) => c.dataset.hex !== p1HomeKey);
    expect(others.every((c) => c.dataset.selected === "false")).toBe(true);
  });

  it("highlights only the reachable move-target cells (M10-T4)", () => {
    // Pick two real board hexes (not the p1 home hex) as the reachable targets.
    const [targetA, targetB] = board
      .map((c) => c.hex)
      .filter((h) => h.q !== p1Home.q || h.r !== p1Home.r)
      .slice(0, 2);
    render(
      <Board
        board={board}
        currentPlayer="p1"
        selectedHex={p1Home}
        reachableHexes={[targetA, targetB]}
      />,
    );
    const cells = screen.getAllByTestId("board-cell");
    const ta = cells.find((c) => c.dataset.hex === `${targetA.q},${targetA.r}`);
    const tb = cells.find((c) => c.dataset.hex === `${targetB.q},${targetB.r}`);
    // Both target cells carry the move-target flag/highlight.
    expect(ta?.dataset.moveTarget).toBe("true");
    expect(tb?.dataset.moveTarget).toBe("true");
    if (ta) expect(ta.className).toContain("hex-move-target");
    // Other cells are not move targets.
    const nonTarget = cells.filter(
      (c) => c.dataset.hex !== `${targetA.q},${targetA.r}` &&
        c.dataset.hex !== `${targetB.q},${targetB.r}`,
    );
    expect(nonTarget.every((c) => c.dataset.moveTarget === "false")).toBe(true);
  });

  it("does not highlight any move targets when reachableHexes is omitted", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    expect(cells.every((c) => c.dataset.moveTarget === "false")).toBe(true);
  });

  it("renders a red circle on an enemy move-target cell (M26-T1/#169)", () => {
    // Two real board hexes: one plain move target (grayish circle), one enemy
    // target passed via `enemyTargetHexes` (red circle).
    const [targetA, targetB] = board
      .map((c) => c.hex)
      .filter((h) => h.q !== p1Home.q || h.r !== p1Home.r)
      .slice(0, 2);
    render(
      <Board
        board={board}
        currentPlayer="p1"
        selectedHex={p1Home}
        reachableHexes={[targetA, targetB]}
        enemyTargetHexes={[targetB]}
      />,
    );
    const cells = screen.getAllByTestId("board-cell");
    const cellA = cells.find(
      (c) => c.dataset.hex === `${targetA.q},${targetA.r}`,
    )!;
    const cellB = cells.find(
      (c) => c.dataset.hex === `${targetB.q},${targetB.r}`,
    )!;
    // Both cells are move targets; both carry a move-target circle.
    expect(cellA.dataset.moveTarget).toBe("true");
    expect(cellB.dataset.moveTarget).toBe("true");
    const circleA = cellA.querySelector('[data-testid="move-target-circle"]')!;
    const circleB = cellB.querySelector('[data-testid="move-target-circle"]')!;
    // A plain move target is grayish; the enemy target is red.
    expect(circleA.classList.contains("bg-move-target")).toBe(true);
    expect(circleA.classList.contains("bg-move-target-enemy")).toBe(false);
    expect(circleB.classList.contains("bg-move-target-enemy")).toBe(true);
    expect(circleB.classList.contains("bg-move-target")).toBe(false);
    expect(cellA.dataset.enemyTarget).toBe("false");
    expect(cellB.dataset.enemyTarget).toBe("true");
  });

  it("renders no enemy (red) circle when enemyTargetHexes is omitted", () => {
    render(
      <Board
        board={board}
        currentPlayer="p1"
        selectedHex={p1Home}
        reachableHexes={[p1Home]}
      />,
    );
    const cells = screen.getAllByTestId("board-cell");
    const target = cells.find((c) => c.dataset.hex === p1HomeKey)!;
    const circle = target.querySelector('[data-testid="move-target-circle"]')!;
    expect(circle).not.toBeNull();
    expect(circle.classList.contains("bg-move-target-enemy")).toBe(false);
    expect(target.dataset.enemyTarget).toBe("false");
  });

  it("calls onSelectCell with the clicked hex when cells are selectable", () => {
    const onSelectCell = vi.fn();
    render(
      <Board board={board} currentPlayer="p1" onSelectCell={onSelectCell} />,
    );
    const cell = screen
      .getAllByTestId("board-cell")
      .find((c) => c.dataset.hex === p1HomeKey)!;
    fireEvent.click(cell);
    expect(onSelectCell).toHaveBeenCalledTimes(1);
    expect(onSelectCell).toHaveBeenCalledWith(p1Home);
  });

  it("renders cells as clickable only when onSelectCell is provided", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    expect(cells[0]).not.toHaveAttribute("role", "button");
  });

  it("forbids text selection on the board so dragging never highlights text (M17-T1/#114)", () => {
    const { container } = render(<Board board={board} currentPlayer="p1" />);
    // The board root carries the `select-none` utility so panning the map
    // never produces an HTML text-selection highlight.
    const boardEl = container.querySelector('[data-testid="board"]')!;
    expect(boardEl.className).toContain("select-none");
  });

  it("renders fogged cells dark and hides their content (M22-T2/#159)", () => {
    // Reveal only the p1 Home Tree hex; every other cell is fogged.
    const revealed = new Set([p1HomeKey]);
    const foggedBoard = boardCells(state, revealed);
    // Only the revealed hex and neighbouring p1 cells are unfogged on the full
    // standard map; the test board passes a single revealed key, so exactly
    // one cell is revealed.
    const unfogged = foggedBoard.filter((c) => !c.fogged);
    expect(unfogged).toHaveLength(1);
    expect(unfogged[0].hex).toEqual(p1Home);

    render(<Board board={foggedBoard} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    const homeEl = cells.find((c) => c.dataset.hex === p1HomeKey)!;
    const hiddenEls = cells.filter((c) => c !== homeEl);
    // Revealed cell is not fogged; all others are fogged and carry the token.
    expect(homeEl.dataset.fogged).toBe("false");
    expect(homeEl.className).not.toContain("bg-fog");
    for (const cell of hiddenEls) {
      expect(cell.dataset.fogged).toBe("true");
      expect(cell.className).toContain("bg-fog");
    }
    // A fogged cell hides its unit/site badge so content never leaks.
    expect(hiddenEls.every((c) => !c.querySelector('[data-testid="board-unit"]'))).toBe(true);
  });

  it("renders no fog on the board when cells are unfogged (legacy full view)", () => {
    render(<Board board={board} currentPlayer="p1" />);
    const cells = screen.getAllByTestId("board-cell");
    expect(cells.every((c) => c.dataset.fogged === "false")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Territory-ownership display (M19-T1 / #130)                         */
/* ------------------------------------------------------------------ */

/**
 * Regression coverage for the territory-ownership *display*: the board must
 * reflect the core rule (already covered at the unit level in
 * `tests/core/game.test.ts` for #124) that a captured cell stays owned after
 * its unit moves off, and flips only when an enemy unit occupies it (move or
 * attack) — never just by moving away or by an enemy moving adjacent. These
 * render the Board against states produced by the core reducers and assert the
 * presented `data-owner` / owner-tint token matches the persisted owner.
 */
describe("Board territory-ownership display (M19-T1/#130)", () => {
  /** A standard setup with all p1 units reset so they can act this turn. */
  function playable() {
    const base = standardSetup();
    return {
      ...base,
      units: base.units.map((u) =>
        u.owner === "p1" ? { ...u, hasActed: false } : u,
      ),
    };
  }

  /** An empty (unoccupied), passable (land) hex at distance 1 from `from`. */
  function adjacentEmpty(
    state: ReturnType<typeof standardSetup>,
    from: Hex,
  ): Hex {
    const occupied = new Set(state.units.map((u) => `${u.hex.q},${u.hex.r}`));
    const h = state.map.cells
      .map((c) => c.hex)
      .find(
        (c) =>
          Math.abs(c.q - from.q) + Math.abs(c.r - from.r) === 1 &&
          !occupied.has(`${c.q},${c.r}`) &&
          terrainAt(state.map, c) === "land",
      )!;
    expect(h).toBeDefined();
    return h;
  }

  /** Mark one site as owned by a kingdom. */
  function ownSite(
    state: ReturnType<typeof standardSetup>,
    hex: Hex,
    owner: "p1" | "p2",
  ) {
    return {
      ...state,
      sites: state.sites.map((s) =>
        sameHex(s.hex, hex) ? { ...s, owner } : s,
      ),
    };
  }

  /** Get the rendered board-cell element at `hex`. */
  function cellEl(
    state: ReturnType<typeof standardSetup>,
    hex: Hex,
    currentPlayer: "p1" | "p2" = "p1",
  ) {
    render(<Board board={boardCells(state)} currentPlayer={currentPlayer} />);
    return screen.getAllByTestId("board-cell").find(
      (c) => c.dataset.hex === `${hex.q},${hex.r}`,
    )!;
  }

  it("keeps the Home Tree owned after the unit vacates it (empty territory stays tinted)", () => {
    const state = playable();
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!;
    const unit = state.units.find(
      (u) => u.owner === "p1" && sameHex(u.hex, home.hex),
    )!;
    const target = adjacentEmpty(state, home.hex);
    const next = moveUnit(state, unit, target);

    // The vacated Home Tree still reports p1 and renders the p1 owner tint.
    const cell = boardCells(next).find((c) => sameHex(c.hex, home.hex))!;
    expect(cell.site?.owner).toBe("p1");
    const el = cellEl(next, home.hex);
    expect(el.dataset.owner).toBe("p1");
    expect(el.className).toContain("bg-owner-p1");
    expect(el.className).not.toContain("bg-terrain-");
  });

  it("keeps a captured Grove owned after the capturing unit moves off", () => {
    // p1 owns a Grove; a p1 unit stands on it and then walks away.
    const state = playable();
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!;
    const grove = state.sites.find(
      (s) => s.kind === "Grove" && s.owner === null,
    )!;
    const owned = ownSite(state, grove.hex, "p1");
    // Place p1's home unit onto the owned Grove so it can vacate it.
    const parked = {
      ...owned,
      units: owned.units.map((u) =>
        sameHex(u.hex, home.hex) ? { ...u, hex: grove.hex } : u,
      ),
      // blank the vacated home unit's old spot is fine; just move the unit.
    };
    const vacating = parked.units.find(
      (u) => u.owner === "p1" && sameHex(u.hex, grove.hex),
    )!;
    const away = adjacentEmpty(parked, grove.hex);
    const next = moveUnit(parked, vacating, away);

    const cell = boardCells(next).find((c) => sameHex(c.hex, grove.hex))!;
    expect(cell.site?.owner).toBe("p1");
    expect(cell.unit).toBeNull();
    const el = cellEl(next, grove.hex);
    expect(el.dataset.owner).toBe("p1");
    expect(el.className).toContain("bg-owner-p1");
  });

  it("flips ownership to an enemy unit that moves onto the site", () => {
    // p2 (enemy) moves a fresh unit onto a p1-owned Nest.
    const state = playable();
    const nest = state.sites.find(
      (s) => s.kind === "Nest" && s.owner === null,
    )!;
    const owned = ownSite(state, nest.hex, "p1");
    const from = adjacentEmpty(owned, nest.hex);
    const enemy = createUnit("Monkey", "p2", from, false);
    const withEnemy = { ...owned, units: [...owned.units, enemy] };
    const next = moveUnit({ ...withEnemy, currentPlayer: "p2" }, enemy, nest.hex);

    const cell = boardCells(next).find((c) => sameHex(c.hex, nest.hex))!;
    expect(cell.site?.owner).toBe("p2");
    const el = cellEl(next, nest.hex, "p2");
    expect(el.dataset.owner).toBe("p2");
    expect(el.className).toContain("bg-owner-p2");
  });

  it("does not flip ownership when an enemy unit merely moves adjacent", () => {
    // p2 moves onto an adjacent empty hex, not onto p1's Nest.
    const state = playable();
    const nest = state.sites.find(
      (s) => s.kind === "Nest" && s.owner === null,
    )!;
    const owned = ownSite(state, nest.hex, "p1");
    const target = adjacentEmpty(owned, nest.hex);
    const mid = adjacentEmpty(owned, target);
    const enemy = createUnit("Monkey", "p2", mid, false);
    const withEnemy = { ...owned, units: [...owned.units, enemy] };
    const next = moveUnit({ ...withEnemy, currentPlayer: "p2" }, enemy, target);

    // The Nest stays p1's — the enemy only approached it.
    const cell = boardCells(next).find((c) => sameHex(c.hex, nest.hex))!;
    expect(cell.site?.owner).toBe("p1");
    const el = cellEl(next, nest.hex);
    expect(el.dataset.owner).toBe("p1");
  });

  it("flips ownership when an enemy unit defeats the defender on a site", () => {
    // p2's Gibbon (rank 2) attacks and defeats p1's Monkey (rank 1) on a Nest.
    const state = playable();
    const nest = state.sites.find(
      (s) => s.kind === "Nest" && s.owner === null,
    )!;
    const owned = ownSite(state, nest.hex, "p1");
    const p1HomeUnit = owned.units.find((u) => u.owner === "p1")!;
    const withDefender = {
      ...owned,
      units: owned.units.map((u) =>
        sameHex(u.hex, p1HomeUnit.hex) ? { ...u, hex: nest.hex } : u,
      ),
    };
    const from = adjacentEmpty(withDefender, nest.hex);
    const attacker = createUnit("Gibbon", "p2", from, false);
    const withAttacker = { ...withDefender, units: [...withDefender.units, attacker] };
    const next = attackUnit({ ...withAttacker, currentPlayer: "p2" }, attacker, nest.hex);

    const cell = boardCells(next).find((c) => sameHex(c.hex, nest.hex))!;
    expect(cell.site?.owner).toBe("p2");
    const el = cellEl(next, nest.hex, "p2");
    expect(el.dataset.owner).toBe("p2");
    expect(el.className).toContain("bg-owner-p2");
  });
});
