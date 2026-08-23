import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useGameSession,
  boardCells,
  playerViews,
  toGameSessionView,
  type GameSessionView,
} from "../../src/ui/viewModels/useGameSession";
import { standardSetup } from "../../src/core/gameSession";
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

  it("produces one cell per unique hex across sites and units", () => {
    const state = standardSetup();
    const cells = boardCells(state);
    // The unique hexes are the union of site hexes and unit hexes.
    const unique = new Set([
      ...state.sites.map((s) => `${s.hex.q},${s.hex.r}`),
      ...state.units.map((u) => `${u.hex.q},${u.hex.r}`),
    ]);
    expect(cells).toHaveLength(unique.size);
    // Every site hex and every unit hex is represented exactly once.
    const hexKeys = cells.map((c) => `${c.hex.q},${c.hex.r}`);
    expect(new Set(hexKeys).size).toBe(hexKeys.length);
    for (const cell of cells) {
      expect(cell.hex).toBeDefined();
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
