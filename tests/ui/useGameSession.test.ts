import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useGameSession,
  boardCells,
  revealedHexKeys,
  ownerBackground,
  playerViews,
  toGameSessionView,
  selectedCellInfo,
  selectedMovement,
  isMoveTarget,
  reachableTargetHexes,
  enemyTargetHexes,
  loadTrainedPolicy,
  type GameSessionView,
} from "../../src/ui/viewModels/useGameSession";
import { standardSetup, createGameSession } from "../../src/core/gameSession";
import { visibleHexes } from "../../src/core/vision";
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

  it("carries each unit's acted state from core onto the view (M19-T6/#190)", () => {
    const state = standardSetup();
    // Core starting units are created with hasActed=true, so they surface as
    // acted on the view (dimmed).
    const acted = boardCells(state).find((c) =>
      sameHex(c.hex, p1Home(state)),
    );
    expect(acted?.unit?.hasActed).toBe(true);

    // Reset p1's units so they may act this turn (hasActed=false).
    const playable = {
      ...state,
      units: state.units.map((u) =>
        u.owner === "p1" ? { ...u, hasActed: false } : u,
      ),
    };
    const unacted = boardCells(playable).find((c) =>
      sameHex(c.hex, p1Home(state)),
    );
    expect(unacted?.unit?.hasActed).toBe(false);
  });

  it("exposes hasActed=false for every unit in a fresh session view (M19-T6/#190)", () => {
    const session = createGameSession();
    const view = toGameSessionView({
      state: session.state,
      step: session.step,
      winner: session.winner,
      legalMoves: session.legalMoves,
    });
    // A fresh turn starts with the human's units reset so they can act — so
    // the human's own units render un-dimmed (movable) at the start of the turn.
    const p1Units = view.board.filter((c) => c.unit?.owner === "p1");
    expect(p1Units.length).toBeGreaterThan(0);
    expect(p1Units.every((c) => c.unit!.hasActed === false)).toBe(true);
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

  it("carries a grave marker onto a cell from the core graves list (M21-T2/#191)", () => {
    const state = standardSetup();
    const emptyHex = state.map.cells
      .map((c) => c.hex)
      .find((h) => !state.units.some((u) => sameHex(u.hex, h)))!;
    const withGrave = {
      ...state,
      graves: [
        { hex: emptyHex, owner: "p2" as const },
      ],
    };
    const graveCell = boardCells(withGrave).find((c) =>
      sameHex(c.hex, emptyHex),
    );
    expect(graveCell?.grave).toEqual({ owner: "p2" });
    // Cells without a grave surface null.
    const other = boardCells(withGrave).find(
      (c) => !sameHex(c.hex, emptyHex),
    )!;
    expect(other.grave).toBeNull();
  });

  it("marks no cells fogged when no revealed set is provided (full visibility)", () => {
    const state = standardSetup();
    expect(boardCells(state).every((c) => c.fogged === false)).toBe(true);
    expect(boardCells(state, null).every((c) => c.fogged === false)).toBe(true);
  });

  it("marks a cell fogged when its hex is not in the revealed set", () => {
    const state = standardSetup();
    // Reveal only the first map hex; all others are fogged.
    const first = state.map.cells[0].hex;
    const revealed = new Set([`${first.q},${first.r}`]);
    const cells = boardCells(state, revealed);
    const firstCell = cells.find(
      (c) => sameHex(c.hex, first),
    )!;
    expect(firstCell.fogged).toBe(false);
    const fogged = cells.filter((c) => c.fogged);
    expect(fogged.length).toBe(cells.length - 1);
    // A fogged cell still carries its terrain/site/unit data (the Cell just
    // hides the content when rendering), so the data is never lost.
    for (const cell of fogged) {
      expect(cell.terrain).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/* revealedHexKeys / fog adaptation (M22-T2, #159)                     */
/* ------------------------------------------------------------------ */

describe("revealedHexKeys (fog-of-war view adaptation)", () => {
  it("derives exactly the human p1's revealed hexes from the core vision model", () => {
    const state = standardSetup();
    const keys = revealedHexKeys(state);
    // Every key matches the core visibleHexes(state, "p1", true) derivation.
    const coreKeys = visibleHexes(state, "p1", true).map(
      (h) => `${h.q},${h.r}`,
    );
    expect(new Set(coreKeys)).toEqual(keys);
  });

  it("reveals far fewer cells than the full map at the start of the game", () => {
    const state = standardSetup();
    const revealed = visibleHexes(state, "p1", true).length;
    // The opening position lets p1 see only around their units/Home Tree — not
    // the whole map — so fog is genuinely hiding unrevealed cells.
    expect(revealed).toBeGreaterThan(0);
    expect(revealed).toBeLessThan(state.map.cells.length);
  });

  it("keeps every cell fogged=false in the full-visibility board view", () => {
    const view = toGameSessionView({
      state: standardSetup(),
      step: "recruit",
      winner: null,
      legalMoves: [],
    });
    // The real session view applies fog, so reveal is partial.
    expect(view.board.some((c) => c.fogged)).toBe(true);
  });

  it("toGameSessionView produces a board where only revealed cells are unfogged", () => {
    const state = standardSetup();
    const view = toGameSessionView({ state, step: "recruit", winner: null, legalMoves: [] });
    const revealed = new Set(
      visibleHexes(state, "p1", true).map((h) => `${h.q},${h.r}`),
    );
    for (const cell of view.board) {
      expect(cell.fogged).toBe(!revealed.has(`${cell.hex.q},${cell.hex.r}`));
    }
  });

  it("a revealed cell keeps its site/unit content visible (p1's Home Tree is never fogged)", () => {
    const state = standardSetup();
    const home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    const view = toGameSessionView({ state, step: "recruit", winner: null, legalMoves: [] });
    const homeCell = view.board.find((c) => sameHex(c.hex, home))!;
    expect(homeCell.fogged).toBe(false);
    expect(homeCell.site?.kind).toBe("HomeTree");
    expect(homeCell.unit?.owner).toBe("p1");
  });

  it("the opponent p2's own sight is never revealed to the human (no enemy sight leak)", () => {
    const state = standardSetup();
    // p2's Home Tree is never among the human's revealed hexes (unless it
    // happens to sit inside p1's vision — it is far away on the map, so not).
    const p2Home = state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p2",
    )!;
    const keys = revealedHexKeys(state);
    const includesP2Home = keys.has(`${p2Home.hex.q},${p2Home.hex.r}`);
    // The human only sees their own sight lines, so p2's distant Home Tree is
    // hidden unless p1's own units light it (which they don't at game start).
    expect(includesP2Home).toBe(false);
  });

  it("a kingdom's owned territory cell is always revealed even outside unit vision (M27-T2, #173)", () => {
    // A minimal state where p1 owns (via site-less persistent territory) a
    // cell far away from every p1 unit/site sight line, plus a p1 unit so the
    // state is definite. The owned cell must still be unfogged on the board.
    const state: GameState = {
      ...standardSetup(),
      units: [createUnit("Monkey", "p1", { q: 3, r: 3 })],
      sites: [],
      territory: { "0,0": "p1" },
    };
    const view = toGameSessionView({
      state,
      step: "recruit",
      winner: null,
      legalMoves: [],
    });
    const ownedCell = view.board.find((c) => c.hex.q === 0 && c.hex.r === 0);
    expect(ownedCell).toBeDefined();
    // The owned territory cell is revealed (not fogged) by the fog board view.
    expect(ownedCell!.fogged).toBe(false);
    expect(ownedCell!.owner).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* ownerBackground (pure presentation adaptation, M13-T2 / #89)         */
/* ------------------------------------------------------------------ */

describe("ownerBackground", () => {
  it("returns the p1 territory tint token for a p1-owned cell", () => {
    expect(ownerBackground("p1")).toBe("bg-owner-p1");
  });

  it("returns the p2 territory tint token for a p2-owned cell", () => {
    expect(ownerBackground("p2")).toBe("bg-owner-p2");
  });

  it("returns null for a neutral (unowned) cell so terrain colour is kept", () => {
    expect(ownerBackground(null)).toBeNull();
  });
});

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
      step: "recruit" as const,
      winner: null,
      legalMoves: [{ type: "recruit" as const, kind: "Monkey" as const, hex: { q: 0, r: 0 } }],
    };
    const view = toGameSessionView(session);
    expect(view.board.length).toBeGreaterThan(0);
    expect(view.players).toHaveLength(2);
    expect(view.currentPlayer).toBe("p1");
    expect(view.legalActions).toEqual([
      { type: "recruit", kind: "Monkey", hex: { q: 0, r: 0 } },
    ]);
    expect(view.step).toBe("recruit");
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
    const noSel = selectedMovement(state, null);
    expect(noSel.movable).toBe(false);
    expect(noSel.reachable).toEqual([]);
    // A fresh session (units reset to act) makes the p1 unit movable. Derive
    // the home hex from the session's OWN board, since the map (and spawn) is
    // randomized per fresh setup — the selected hex must be on that session's
    // map for the unit lookup to resolve.
    const session = createGameSession();
    const sessionHome = session.state.sites.find(
      (s) => s.kind === "HomeTree" && s.owner === "p1",
    )!.hex;
    const info = selectedMovement(session.state, sessionHome);
    expect(info.unit).not.toBeNull();
    expect(info.movable).toBe(true);
    expect(info.reachable.length).toBeGreaterThan(0);
  });

  it("reachableTargetHexes unions plain-move and enemy-capture targets (M26-T1/#169)", () => {
    const movement = {
      unit: null,
      movable: true,
      reachable: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      attackable: [{ q: 3, r: 0 }],
    };
    const combined = reachableTargetHexes(movement);
    expect(combined).toHaveLength(3);
    for (const h of [...movement.reachable, ...movement.attackable]) {
      expect(combined.some((x) => sameHex(x, h))).toBe(true);
    }
  });

  it("enemyTargetHexes returns exactly the attackable (enemy-held) targets (M26-T1/#169)", () => {
    const movement = {
      unit: null,
      movable: true,
      reachable: [{ q: 1, r: 0 }],
      attackable: [{ q: 3, r: 0 }, { q: 4, r: 0 }],
    };
    const enemy = enemyTargetHexes(movement);
    expect(enemy).toHaveLength(2);
    for (const h of movement.attackable) {
      expect(enemy.some((x) => sameHex(x, h))).toBe(true);
    }
    // Plain move targets are never enemy targets.
    expect(enemy.some((x) => sameHex(x, { q: 1, r: 0 }))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* loadTrainedPolicy (M28-T3 graceful loading)                         */
/* ------------------------------------------------------------------ */

describe("loadTrainedPolicy", () => {
  const okResponse = (body: unknown, ok = true): Response =>
    ({
      ok,
      json: async () => body,
    }) as unknown as Response;

  const VALID_POLICY = {
    weights: [0, 0, 100, 0, 0, 0],
    bias: 0,
    gamesSeen: 1,
    decisionsSeen: 1,
    source: "win-weighted-centroid",
    version: 1,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a parsed valid policy when the file loads", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(VALID_POLICY)));
    expect(await loadTrainedPolicy("/base/")).toEqual(VALID_POLICY);
    expect(fetch).toHaveBeenCalledWith("/base/trained-ai.json");
  });

  it("returns null for a non-OK (missing) response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(null, false)));
    expect(await loadTrainedPolicy()).toBeNull();
  });

  it("returns null when the file is unparseable (invalid JSON)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new Error("bad json");
        },
      })),
    );
    expect(await loadTrainedPolicy()).toBeNull();
  });

  it("returns null when the JSON is structurally malformed", async () => {
    const malformed = { weights: [0, 0, 0], bias: 0 };
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(malformed)));
    expect(await loadTrainedPolicy()).toBeNull();
  });

  it("returns null when the fetch itself rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    expect(await loadTrainedPolicy()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* useGameSession hook                                                 */
/* ------------------------------------------------------------------ */

describe("useGameSession", () => {
  it("starts with a fresh session on the recruit step (income applied automatically)", () => {
    const { result } = renderHook(() => useGameSession());
    const view: GameSessionView = result.current.view;
    expect(view.step).toBe("recruit");
    expect(view.isDone).toBe(false);
    expect(view.currentPlayer).toBe("p1");
    expect(view.winner).toBeNull();
    // Income is collected automatically at the start of the turn, so the
    // human's turn begins directly on recruit/move actions — never a manual
    // collect-income step.
    expect(view.legalActions.some((a) => a.type === "collectIncome")).toBe(false);
    expect(view.legalActions.some((a) => a.type === "recruit")).toBe(true);
    expect(view.board.length).toBeGreaterThan(0);
    expect(view.players).toHaveLength(2);
    // The projected start-of-turn state reflects the automatic income (2 base +
    // 3 from p1's Home Tree = 5 bananas).
    expect(view.players.find((p) => p.id === "p1")!.bananas).toBe(5);
  });

  it("selectAction delegates to the core controller and advances the view", () => {
    const { result } = renderHook(() => useGameSession());
    // The session starts directly on the recruit step, so pick the first
    // legal recruit/move action (no manual income step).
    const first = result.current.view.legalActions[0];
    act(() => {
      result.current.selectAction(first);
    });
    // Recruiting keeps the recruit step; collectIncome is never legal.
    expect(
      result.current.view.legalActions.some((a) => a.type === "collectIncome"),
    ).toBe(false);
  });

  it("clearActions discards this turn's selections and returns to recruit", () => {
    const { result } = renderHook(() => useGameSession());
    const first = result.current.view.legalActions[0];
    act(() => {
      result.current.selectAction(first);
    });
    act(() => {
      result.current.clearActions();
    });
    // Back at the start of the turn: recruit step, income already collected,
    // recruit/move/attack actions legal (no separate income step).
    expect(result.current.view.step).toBe("recruit");
    expect(result.current.view.legalActions.some((a) => a.type === "collectIncome")).toBe(false);
    expect(result.current.view.legalActions.some((a) => a.type === "recruit")).toBe(true);
  });

  it("submitTurn runs the AI reply and advances to the next human turn", () => {
    const { result } = renderHook(() => useGameSession());
    act(() => {
      result.current.submitTurn();
    });
    // The next human turn starts again on the recruit step.
    expect(result.current.view.step).toBe("recruit");
    expect(result.current.view.isDone).toBe(false);
    expect(result.current.view.currentPlayer).toBe("p1");
    expect(result.current.view.legalActions.some((a) => a.type === "collectIncome")).toBe(false);
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

  it("exposes enemyTargetHexes matching the core attackable targets (M26-T1/#169)", () => {
    const { result } = renderHook(() => useGameSession());
    const unitHex = result.current.view.board.find(
      (c) => c.unit && c.unit.owner === "p1",
    )!.hex;
    act(() => {
      result.current.selectCell(unitHex);
    });
    // `enemyTargetHexes` exposes the core `attackable` (enemy-held) targets and
    // `reachableHexes` is the union of plain-move and enemy-capture targets.
    expect(result.current.enemyTargetHexes).toEqual(
      result.current.movement.attackable,
    );
    const combined = [
      ...result.current.movement.reachable,
      ...result.current.movement.attackable,
    ];
    expect(result.current.reachableHexes).toEqual(combined);
    // No enemy target is ever a plain move target (plain moves are unoccupied).
    for (const enemy of result.current.enemyTargetHexes) {
      expect(
        result.current.movement.reachable.some((h) => sameHex(h, enemy)),
      ).toBe(false);
    }
  });

  it("clicking a reachable target issues a move action and clears the selection", () => {
    const { result } = renderHook(() => useGameSession());
    // The session starts directly on the recruit step, so moves are already
    // legal (income is applied automatically).
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

  it("clicking an enemy-held (red) target issues an attack and captures the enemy (M26-T1/#169)", () => {
    const { result } = renderHook(() =>
      useGameSession(0, { width: 7, height: 7, seed: 0 }),
    );
    // On the 7×7 seed-0 board the p1 Gibbon at (2,4) sits directly adjacent
    // to the p2 Monkey at (3,4). The Gibbon (rank 2) can legally attack that
    // Monkey from the start of the turn (it has not acted yet): the higher-
    // rank Gibbon wins the clash, destroying the p2 Monkey and advancing onto
    // (3,4).
    const unitHex = { q: 2, r: 4 };
    const enemyHex = { q: 3, r: 4 };
    act(() => {
      result.current.selectCell(unitHex);
    });
    // The enemy-held (red) target is surfaced as an attackable capture target.
    expect(result.current.movement.movable).toBe(true);
    expect(result.current.enemyTargetHexes).toContainEqual(enemyHex);
    act(() => {
      result.current.selectCell(enemyHex);
    });
    // Clicking the red target issues an attack: the selection clears (no
    // highlight) and the p2 Monkey on that hex is captured — the p1 Gibbon
    // (higher rank) destroys it and advances onto (3,4).
    expect(result.current.selectedHex).toBeNull();
    const captured = result.current.view.board.find(
      (c) => c.hex.q === enemyHex.q && c.hex.r === enemyHex.r,
    );
    expect(captured).toBeDefined();
    // The p2 unit is gone; the p1 Gibbon now occupies the captured hex.
    expect(captured!.unit?.owner).toBe("p1");
    expect(captured!.unit?.kind).toBe("Gibbon");
  });

  it("clicking a non-reachable cell does not issue a move (no illegal move)", () => {
    const { result } = renderHook(() => useGameSession());
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

  it("marks the view done with a winner when the game ends", () => {
    // Use a small map + seed where a full (greedy) human-vs-AI game reliably
    // terminates. Income is applied automatically, so the turn begins directly
    // on recruit/move actions (no manual income step).
    const { result } = renderHook(() =>
      useGameSession(0, { width: 7, height: 7, seed: 0 }),
    );
    // Drive the session to "done" via a game that ends: on each turn keep
    // selecting the first legal action until none remain, then submit, until
    // the core resolves a winner (the core guarantees a winner).
    let guard = 0;
    while (!result.current.view.isDone && guard < 500) {
      // Keep selecting while actions remain.
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
