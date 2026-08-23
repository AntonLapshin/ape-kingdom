import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useGameSession,
  boardCells,
  playerViews,
  toGameSessionView,
  selectedCellInfo,
  selectedMovement,
  isMoveTarget,
  type GameSessionView,
} from "../../src/ui/viewModels/useGameSession";
import { standardSetup, createGameSession } from "../../src/core/gameSession";
import { sameHex, createUnit, type GameState, type Hex } from "../../src/core/game";

/* ------------------------------------------------------------------ */
/* boardCells (pure presentation adaptation)                           */
/* ------------------------------------------------------------------ */

describe("boardCells", () => {
  /** p1's Home Tree hex on the generated board (map-agnostic). */
  function p1Home(state: GameState): Hex {
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    );
    if (!home) throw new Error("expected a p1 Home Tree");
    return home.hex;
  }

  it("produces one cell per hex of the generated map", () => {
    const state = standardSetup();
    const cells = boardCells(state);
    // The board now renders the full generated map — one cell per map hex.
    expect(cells).toHaveLength(state.map.cells.length);
    const hexKeys = cells.map((c) => `${c.hex.q},${c.hex.r}`);
    const mapKeys = state.map.cells.map((c) => `${c.hex.q},${c.hex.r}`);
    expect(new Set(hexKeys).size).toBe(hexKeys.length);
    expect(hexKeys).toEqual([...mapKeys].sort());
  });

  it("carries the terrain of each map cell onto the board cell", () => {
    const state = standardSetup();
    const cells = boardCells(state);
    // Every terrain type appears on a default generated map (land, water,
    // mountain all exist), and the board cell terrain matches the map's.
    const terrains = new Set(cells.map((c) => c.terrain));
    expect(terrains).toEqual(new Set(["land", "water", "mountain"]));
    for (const cell of cells) {
      const mapCell = state.map.cells.find(
        (m) => m.hex.q === cell.hex.q && m.hex.r === cell.hex.r,
      )!;
      expect(cell.terrain).toBe(mapCell.terrain);
    }
  });

  it("attaches the site and unit that occupy the same hex", () => {
    const state = standardSetup();
    const cells = boardCells(state);
    // p1's Home Tree is occupied by a starting Monkey.
    const home = cells.find((c) => sameHex(c.hex, p1Home(state)));
    expect(home).toBeDefined();
    expect(home!.site?.kind).toBe("HomeTree");
    expect(home!.site?.owner).toBe("p1");
    expect(home!.unit?.kind).toBe("Monkey");
    expect(home!.unit?.owner).toBe("p1");
  });

  it("derives each unit's rank from its kind on the view", () => {
    const state = standardSetup();
    // Starting Monkeys resolve to rank 1 (not a hardcoded stub).
    const home = boardCells(state).find((c) => sameHex(c.hex, p1Home(state)));
    expect(home?.unit?.kind).toBe("Monkey");
    expect(home?.unit?.rank).toBe(1);
    // A Gorilla placed at an empty hex resolves to rank 4.
    const emptyHex = state.map.cells
      .map((c) => c.hex)
      .find((h) => !state.units.some((u) => sameHex(u.hex, h)))!;
    const withGorilla = {
      ...state,
      units: [...state.units, createUnit("Gorilla", "p1", emptyHex)],
    };
    const gorillaCell = boardCells(withGorilla).find((c) =>
      sameHex(c.hex, emptyHex),
    );
    expect(gorillaCell?.unit?.kind).toBe("Gorilla");
    expect(gorillaCell?.unit?.rank).toBe(4);
  });

  it("marks a cell site or unit as null when absent", () => {
    const state = standardSetup();
    const cells = boardCells(state);
    // A neutral Grove with no unit on it.
    const grove = cells.find((c) => c.site?.kind === "Grove" && !c.unit);
    expect(grove).toBeDefined();
    expect(grove!.unit).toBeNull();
    // A unit not on a site (an occupied hex with no site).
    const unitOnly = cells.find((c) => c.unit && !c.site);
    expect(unitOnly).toBeDefined();
    expect(unitOnly!.site).toBeNull();
    // Unoccupied hexes are still rendered with terrain and no site/unit.
    const empty = cells.find((c) => !c.site && !c.unit);
    expect(empty).toBeDefined();
    expect(empty!.terrain).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* playerViews (pure presentation adaptation)                          */
/* ------------------------------------------------------------------ */

describe("playerViews", () => {
  it("maps player records to renderable summaries", () => {
    const state = standardSetup();
    const views = playerViews(state);
    expect(views).toHaveLength(2);
    const p1 = views.find((v) => v.id === "p1");
    expect(p1).toBeDefined();
    expect(p1!.bananas).toBe(state.players.p1.bananas);
    expect(p1!.eliminated).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* toGameSessionView                                                   */
/* ------------------------------------------------------------------ */

describe("toGameSessionView", () => {
  it("exposes board, players, current player, legal actions, step, winner", () => {
    const session = {
      state: standardSetup(),
      step: "income" as const,
      winner: null,
      legalMoves: [{ type: "collectIncome" as const }],
    };
    const view = toGameSessionView(session);
    expect(view.board.length).toBeGreaterThan(0);
    expect(view.players).toHaveLength(2);
    expect(view.currentPlayer).toBe("p1");
    expect(view.legalActions).toEqual([{ type: "collectIncome" }]);
    expect(view.step).toBe("income");
    expect(view.winner).toBeNull();
    expect(view.isDone).toBe(false);
  });

  it("flags isDone only when the step is done", () => {
    const base = {
      state: standardSetup(),
      legalMoves: [] as never[],
    };
    const done = toGameSessionView({
      ...base,
      step: "done" as const,
      winner: "p1",
    });
    expect(done.isDone).toBe(true);
    expect(done.winner).toBe("p1");
    const inProgress = toGameSessionView({
      ...base,
      step: "recruit" as const,
      winner: null,
    });
    expect(inProgress.isDone).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* selectedCellInfo (pure presentation derivation)                     */
/* ------------------------------------------------------------------ */

describe("selectedCellInfo", () => {
  it("returns null when no hex is selected", () => {
    const state = standardSetup();
    expect(selectedCellInfo(state, null)).toBeNull();
  });

  it("derives the core cell info for a selected hex", () => {
    const state = standardSetup();
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    const info = selectedCellInfo(state, home);
    expect(info).not.toBeNull();
    expect(info!.hex).toEqual(home);
    expect(info!.site?.kind).toBe("HomeTree");
    expect(info!.unit?.kind).toBe("Monkey");
  });

  it("re-derives from a fresh state so info tracks the game", () => {
    // A pre-selected hex resolved against a different state reflects that state.
    const a = standardSetup();
    const b = standardSetup();
    const homeA = a.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    const homeB = b.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    // Both derive a Home Tree site regardless of map.
    expect(selectedCellInfo(a, homeA)?.site?.kind).toBe("HomeTree");
    expect(selectedCellInfo(b, homeB)?.site?.kind).toBe("HomeTree");
  });
});

/* ------------------------------------------------------------------ */
/* selectedMovement / isMoveTarget (pure presentation derivation)      */
/* ------------------------------------------------------------------ */

describe("selectedMovement / isMoveTarget", () => {
  it("isMoveTarget matches a hex against a reachable list", () => {
    const hex = { q: 1, r: 2 };
    expect(isMoveTarget(hex, { q: 1, r: 2 }, [{ q: 1, r: 2 }])).toBe(true);
    expect(isMoveTarget(hex, { q: 9, r: 9 }, [{ q: 1, r: 2 }])).toBe(false);
  });

  it("isMoveTarget is false when no hex / target is selected", () => {
    expect(isMoveTarget(null, { q: 1, r: 2 }, [{ q: 1, r: 2 }])).toBe(false);
    expect(isMoveTarget({ q: 1, r: 2 }, { q: 1, r: 2 }, [])).toBe(false);
  });

  it("selectedMovement forwards the core derivation", () => {
    const state = standardSetup();
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    const noSel = selectedMovement(state, null);
    expect(noSel.movable).toBe(false);
    expect(noSel.reachable).toEqual([]);
    // A fresh session (units reset to act) makes the p1 unit movable.
    const session = createGameSession();
    const info = selectedMovement(session.state, home);
    expect(info.unit).not.toBeNull();
    expect(info.movable).toBe(true);
    expect(info.reachable.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* useGameSession hook                                                 */
/* ------------------------------------------------------------------ */

describe("useGameSession", () => {
  it("starts with a fresh session on the income step", () => {
    const { result } = renderHook(() => useGameSession());
    const view: GameSessionView = result.current.view;
    expect(view.step).toBe("income");
    expect(view.isDone).toBe(false);
    expect(view.currentPlayer).toBe("p1");
    expect(view.winner).toBeNull();
    // The only legal action on the income step is collect income.
    expect(view.legalActions).toEqual([{ type: "collectIncome" }]);
    expect(view.board.length).toBeGreaterThan(0);
    expect(view.players).toHaveLength(2);
  });

  it("selectAction delegates to the core controller and advances the view", () => {
    const { result } = renderHook(() => useGameSession());
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    expect(result.current.view.step).toBe("recruit");
    // Recruit/move/attack actions are now legal; collectIncome is not.
    expect(
      result.current.view.legalActions.some((a) => a.type === "recruit"),
    ).toBe(true);
    expect(
      result.current.view.legalActions.some((a) => a.type === "collectIncome"),
    ).toBe(false);
  });

  it("clearActions discards this turn's selections and returns to income", () => {
    const { result } = renderHook(() => useGameSession());
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    expect(result.current.view.step).toBe("recruit");
    act(() => {
      result.current.clearActions();
    });
    // Back at the start of the turn: income step, only collect income legal.
    expect(result.current.view.step).toBe("income");
    expect(result.current.view.legalActions).toEqual([
      { type: "collectIncome" },
    ]);
  });

  it("submitTurn runs the AI reply and advances to the next human turn", () => {
    const { result } = renderHook(() => useGameSession());
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    act(() => {
      result.current.submitTurn();
    });
    // The next human turn starts on the income step again.
    expect(result.current.view.step).toBe("income");
    expect(result.current.view.isDone).toBe(false);
    expect(result.current.view.currentPlayer).toBe("p1");
  });

  it("starts with no cell selected", () => {
    const { result } = renderHook(() => useGameSession());
    expect(result.current.selectedHex).toBeNull();
    expect(result.current.selectedCell).toBeNull();
  });

  it("selects a cell and derives its info from core data", () => {
    const { result } = renderHook(() => useGameSession());
    const home = result.current.view.board.find((c) => c.site?.kind === "HomeTree")!
      .hex;
    act(() => {
      result.current.selectCell(home);
    });
    expect(result.current.selectedHex).toEqual(home);
    expect(result.current.selectedCell).not.toBeNull();
    expect(result.current.selectedCell!.hex).toEqual(home);
    // The derived info reflects the board's site/unit at that hex.
    expect(result.current.selectedCell!.site?.kind).toBe("HomeTree");
  });

  it("exposes selectCell so the board can wire clicks", () => {
    const { result } = renderHook(() => useGameSession());
    const someHex = result.current.view.board[0].hex;
    act(() => {
      result.current.selectCell(someHex);
    });
    expect(result.current.selectedHex).toEqual(someHex);
  });

  it("exposes movement/reachableHexes for a selected movable unit", () => {
    const { result } = renderHook(() => useGameSession());
    // Find a p1 starting unit hex from the board.
    const unitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1",
    )!.hex;
    act(() => {
      result.current.selectCell(unitHex);
    });
    expect(result.current.movement.movable).toBe(true);
    expect(result.current.movement.unit).not.toBeNull();
    expect(result.current.reachableHexes.length).toBeGreaterThan(0);
  });

  it("clicking a reachable target issues a move action and clears the selection", () => {
    const { result } = renderHook(() => useGameSession());
    // Advance to the recruit step so moves are legal.
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    const unitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1",
    )!.hex;
    act(() => {
      result.current.selectCell(unitHex);
    });
    const target = result.current.reachableHexes[0];
    expect(target).toBeDefined();
    act(() => {
      result.current.selectCell(target);
    });
    // The selection is cleared (no highlight) and the unit moved onto target.
    expect(result.current.selectedHex).toBeNull();
    const moved = result.current.view.board.find(
      (c) => c.hex.q === target.q && c.hex.r === target.r,
    );
    expect(moved).toBeDefined();
    expect(moved!.unit?.owner).toBe("p1");
  });

  it("clicking a non-reachable cell does not issue a move (no illegal move)", () => {
    const { result } = renderHook(() => useGameSession());
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    const unitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1",
    )!.hex;
    act(() => {
      result.current.selectCell(unitHex);
    });
    const targets = result.current.reachableHexes;
    // Pick a p1 unit hex that is not a reachable target of a different unit.
    const otherUnitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1" && !isMoveTarget(unitHex, c.hex, targets),
    )!.hex;
    act(() => {
      result.current.selectCell(otherUnitHex);
    });
    // No move was issued: selecting simply selects that cell instead.
    expect(result.current.selectedHex).toEqual(otherUnitHex);
    // The originally selected unit still sits on its own hex (not moved).
    const original = result.current.view.board.find(
      (c) => c.hex.q === unitHex.q && c.hex.r === unitHex.r,
    );
    expect(original?.unit?.owner).toBe("p1");
  });

  it("does not issue a move on the income step (move not legal yet)", () => {
    const { result } = renderHook(() => useGameSession());
    const unitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1",
    )!.hex;
    act(() => {
      result.current.selectCell(unitHex);
    });
    const target = result.current.reachableHexes[0];
    act(() => {
      result.current.selectCell(target);
    });
    // Move isn't legal on the income step, so no move is issued — the target
    // is simply selected and the session stays on income.
    expect(result.current.view.step).toBe("income");
    expect(result.current.selectedHex).toEqual(target);
  });

  it("marks the view done with a winner when the game ends", () => {
    // Use a small map so a full (greedy) human-vs-AI game reliably terminates.
    const { result } = renderHook(() =>
      useGameSession(0, { width: 7, height: 7, seed: 0 }),
    );
    // Force a win by selecting income, then submit with p1 controlling all
    // Home Trees — the core session resolves victory and marks the turn done.
    act(() => {
      result.current.selectAction({ type: "collectIncome" });
    });
    // We cannot reach a win through the public API in one turn of the standard
    // setup, so drive the session to "done" via a game that ends: play many
    // turns until it ends (the core guarantees a winner).
    let guard = 0;
    while (!result.current.view.isDone && guard < 500) {
      act(() => {
        if (result.current.view.legalActions.length > 0) {
          result.current.selectAction(result.current.view.legalActions[0]);
        }
      });
      // Keep selecting while actions remain, then submit.
      let safety = 0;
      while (result.current.view.legalActions.length > 0 && safety < 128) {
        const action = result.current.view.legalActions[0];
        act(() => {
          result.current.selectAction(action);
        });
        safety++;
      }
      act(() => {
        result.current.submitTurn();
      });
      guard++;
    }
    expect(result.current.view.isDone).toBe(true);
    expect(result.current.view.winner).toMatch(/^p[12]$/);
  });
});
