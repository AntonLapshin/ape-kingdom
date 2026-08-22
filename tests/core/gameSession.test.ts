import { describe, it, expect } from "vitest";
import { legalActions } from "../../src/core/ai";
import { sameHex } from "../../src/core/game";
import { createUnit, createSite, createPlayer } from "../../src/core/game";
import type { GameSession } from "../../src/core/gameSession";
import {
  createGameSession,
  selectAction,
  submitTurn,
  resetTurn,
  standardSetup,
  GameSessionError,
} from "../../src/core/gameSession";

/** The standard setup's legal recruit placement hex for p1 (empty, adjacent). */
const RECRUIT_HEX = { q: 0, r: -1 };

/* ------------------------------------------------------------------ */
/* standardSetup                                                       */
/* ------------------------------------------------------------------ */

describe("standardSetup", () => {
  it("builds the standard two-player setup with p1 as the current player", () => {
    const state = standardSetup();
    expect(state.currentPlayer).toBe("p1");
    expect(state.turnOrder).toEqual(["p1", "p2"]);
    expect(state.winner).toBeNull();
  });

  it("places one Home Tree per player with neutral Groves/Nests between them", () => {
    const state = standardSetup();
    const homeTrees = state.sites.filter((s) => s.kind === "HomeTree");
    expect(homeTrees).toHaveLength(2);
    expect(homeTrees.some((s) => s.owner === "p1")).toBe(true);
    expect(homeTrees.some((s) => s.owner === "p2")).toBe(true);
    // 6 Groves and 4 Nests per the rules.
    expect(state.sites.filter((s) => s.kind === "Grove")).toHaveLength(6);
    expect(state.sites.filter((s) => s.kind === "Nest")).toHaveLength(4);
  });

  it("gives each player the standard starting force (3 Monkeys, 1 Gibbon, 2 bananas)", () => {
    const state = standardSetup();
    for (const id of ["p1", "p2"]) {
      const units = state.units.filter((u) => u.owner === id);
      expect(units.filter((u) => u.kind === "Monkey")).toHaveLength(3);
      expect(units.filter((u) => u.kind === "Gibbon")).toHaveLength(1);
      expect(state.players[id].bananas).toBe(2);
    }
  });
});

/* ------------------------------------------------------------------ */
/* createGameSession                                                   */
/* ------------------------------------------------------------------ */

describe("createGameSession", () => {
  it("starts on the income step with collectIncome as the only legal move", () => {
    const session = createGameSession();
    expect(session.step).toBe("income");
    expect(session.moves).toEqual([]);
    expect(session.legalMoves).toEqual([{ type: "collectIncome" }]);
    expect(session.winner).toBeNull();
  });

  it("exposes the initial GameState and the current player's legal moves", () => {
    const session = createGameSession();
    expect(session.state.currentPlayer).toBe("p1");
    expect(session.baseState.currentPlayer).toBe("p1");
    expect(session.state.sites).toEqual(session.baseState.sites);
    expect(session.state.players).toEqual(session.baseState.players);
  });

  it("resets the current player's units so they may act this turn", () => {
    const session = createGameSession();
    for (const unit of session.state.units) {
      if (unit.owner === "p1") expect(unit.hasActed).toBe(false);
    }
  });

  it("carries the aiSeed and aiOptions through to the session", () => {
    const session = createGameSession(42, { difficulty: 1, preferRecruit: true });
    expect(session.aiSeed).toBe(42);
    expect(session.aiOptions).toEqual({ difficulty: 1, preferRecruit: true });
  });
});

/* ------------------------------------------------------------------ */
/* selectAction                                                        */
/* ------------------------------------------------------------------ */

describe("selectAction", () => {
  it("advances from income to recruit after collecting income", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    expect(session.step).toBe("recruit");
    expect(session.moves).toEqual([{ type: "collectIncome" }]);
    // The recruit step exposes recruit/move/attack actions (no collectIncome).
    expect(
      session.legalMoves.some((a) => a.type === "recruit"),
    ).toBe(true);
    expect(
      session.legalMoves.some((a) => a.type === "collectIncome"),
    ).toBe(false);
  });

  it("rejects an action that is not in the current legalMoves", () => {
    const session = createGameSession();
    // On the income step, recruiting is not yet legal.
    expect(() =>
      selectAction(session, { type: "recruit", kind: "Monkey", hex: RECRUIT_HEX }),
    ).toThrow(GameSessionError);
    expect(() =>
      selectAction(session, { type: "recruit", kind: "Monkey", hex: RECRUIT_HEX }),
    ).toThrow(/not a legal move/);
  });

  it("appends a recruit action and stays in the recruit step", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = selectAction(session, {
      type: "recruit",
      kind: "Monkey",
      hex: RECRUIT_HEX,
    });
    expect(session.step).toBe("recruit");
    expect(session.moves).toHaveLength(2);
    // The recruited unit appears in the projected state.
    expect(
      session.state.units.some(
        (u) => u.owner === "p1" && u.kind === "Monkey" && sameHex(u.hex, RECRUIT_HEX),
      ),
    ).toBe(true);
  });

  it("moves to the movefight step after a move or attack", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    // p1's starting units are at (0,0),(1,0),(-1,0),(0,1); (1,0) can move to (2,0).
    session = selectAction(session, {
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    expect(session.step).toBe("movefight");
    // Recruiting is no longer legal once the human has moved/fought.
    expect(
      session.legalMoves.some((a) => a.type === "recruit"),
    ).toBe(false);
    expect(
      session.legalMoves.some((a) => a.type === "move" || a.type === "attack"),
    ).toBe(true);
  });

  it("allows skipping recruiting by moving straight to the movefight step", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = selectAction(session, {
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    expect(session.step).toBe("movefight");
  });

  it("rejects a recruit after the human has moved/fought", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = selectAction(session, {
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    // After a move, recruiting is no longer in legalMoves.
    expect(() =>
      selectAction(session, {
        type: "recruit",
        kind: "Monkey",
        hex: RECRUIT_HEX,
      }),
    ).toThrow(GameSessionError);
  });

  it("shrinks legalMoves as units act", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    const before = session.legalMoves.filter((a) => a.type === "move").length;
    session = selectAction(session, {
      type: "move",
      unitHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    const after = session.legalMoves.filter((a) => a.type === "move").length;
    // The moved unit is no longer selectable, so the move count drops.
    expect(after).toBeLessThan(before);
  });

  it("selects an attack action on the movefight step", () => {
    // Build a session where p1 has a Gorilla adjacent to a p2 Monkey.
    const baseState = {
      sites: [
        createSite("HomeTree", 0, 0, "p1"),
        createSite("HomeTree", 5, 0, "p2"),
      ],
      units: [
        createUnit("Gorilla", "p1", { q: 1, r: 0 }, false),
        createUnit("Monkey", "p2", { q: 2, r: 0 }),
      ],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
      currentPlayer: "p1",
      turnOrder: ["p1", "p2"],
      winner: null,
    };
    let session: GameSession = {
      baseState,
      state: baseState,
      moves: [],
      step: "income",
      legalMoves: [{ type: "collectIncome" }],
      aiSeed: 0,
      aiOptions: {},
      winner: null,
    };
    session = selectAction(session, { type: "collectIncome" });
    // The attack action is legal and can be selected.
    session = selectAction(session, {
      type: "attack",
      attackerHex: { q: 1, r: 0 },
      targetHex: { q: 2, r: 0 },
    });
    expect(session.step).toBe("movefight");
    expect(session.moves).toHaveLength(2);
    // The Gorilla wins and captures the hex; the Monkey is destroyed.
    expect(session.state.units).toHaveLength(1);
    expect(session.state.units[0].owner).toBe("p1");
  });

  it("rejects actions after the game has ended", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    // Force a win by making p1 control every Home Tree before submitting.
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(session.step).toBe("done");
    expect(session.winner).toBe("p1");
    expect(() =>
      selectAction(session, { type: "collectIncome" }),
    ).toThrow(GameSessionError);
  });
});

/* ------------------------------------------------------------------ */
/* submitTurn                                                          */
/* ------------------------------------------------------------------ */

describe("submitTurn", () => {
  it("rejects ending the turn before collecting income", () => {
    const session = createGameSession();
    expect(() => submitTurn(session)).toThrow(GameSessionError);
    expect(() => submitTurn(session)).toThrow(/collect income/);
  });

  it("runs the AI reply and advances to the next human turn", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    const next = submitTurn(session);
    // The game is not over; the next human turn starts on the income step.
    expect(next.step).toBe("income");
    expect(next.moves).toEqual([]);
    expect(next.legalMoves).toEqual([{ type: "collectIncome" }]);
    expect(next.winner).toBeNull();
    // A full round is human + AI + advance back to the human, so the next
    // human turn is again p1 (the human is always the session's current player).
    expect(next.state.currentPlayer).toBe("p1");
    expect(next.baseState.currentPlayer).toBe("p1");
  });

  it("produces a deterministic result for a given aiSeed", () => {
    const build = () => {
      let session = createGameSession(7);
      session = selectAction(session, { type: "collectIncome" });
      return submitTurn(session);
    };
    const a = build();
    const b = build();
    expect(a.state).toEqual(b.state);
  });

  it("applies the human's selected moves before the AI reply", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = selectAction(session, {
      type: "recruit",
      kind: "Monkey",
      hex: RECRUIT_HEX,
    });
    const next = submitTurn(session);
    // The recruited Monkey remains on the map after the turn.
    expect(
      next.state.units.some(
        (u) => u.owner === "p1" && u.kind === "Monkey" && sameHex(u.hex, RECRUIT_HEX),
      ),
    ).toBe(true);
  });

  it("marks the session done with a winner when the game ends", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    // p1 controls every Home Tree, so the human wins before the AI acts.
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    const next = submitTurn(session);
    expect(next.step).toBe("done");
    expect(next.winner).toBe("p1");
    expect(next.legalMoves).toEqual([]);
  });

  it("rejects submitting after the game has already ended", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(() => submitTurn(session)).toThrow(GameSessionError);
  });
});

/* ------------------------------------------------------------------ */
/* resetTurn                                                           */
/* ------------------------------------------------------------------ */

describe("resetTurn", () => {
  it("discards this turn's selections and returns to the income step", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = selectAction(session, {
      type: "recruit",
      kind: "Monkey",
      hex: RECRUIT_HEX,
    });
    expect(session.step).toBe("recruit");
    expect(session.moves).toHaveLength(2);

    const reset = resetTurn(session);
    expect(reset.step).toBe("income");
    expect(reset.moves).toEqual([]);
    expect(reset.legalMoves).toEqual([{ type: "collectIncome" }]);
    expect(reset.winner).toBeNull();
    // The base state (start of the turn) is preserved.
    expect(reset.state).toEqual(reset.baseState);
    expect(reset.baseState).toEqual(session.baseState);
  });

  it("returns the session unchanged once the game has ended", () => {
    let session = createGameSession();
    session = selectAction(session, { type: "collectIncome" });
    session = {
      ...session,
      baseState: {
        ...session.baseState,
        sites: session.baseState.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
      state: {
        ...session.state,
        sites: session.state.sites.map((s) =>
          s.kind === "HomeTree" ? { ...s, owner: "p1" } : s,
        ),
      },
    };
    session = submitTurn(session);
    expect(session.step).toBe("done");
    const reset = resetTurn(session);
    expect(reset.step).toBe("done");
    expect(reset.winner).toBe("p1");
  });
});

/* ------------------------------------------------------------------ */
/* Full-game simulation via the session                                */
/* ------------------------------------------------------------------ */

describe("full-game simulation via session", () => {
  it("completes many seeded games with a winner and no illegal moves", () => {
    for (let gameSeed = 0; gameSeed < 10; gameSeed++) {
      let session = createGameSession(gameSeed);
      let guard = 0;
      while (session.step !== "done" && guard < 200) {
        // Build the human's turn by selecting legal moves until none remain
        // (mimicking a UI letting the player act), then submit.
        session = selectAction(session, { type: "collectIncome" });
        // Pick a deterministic legal action each iteration (first one).
        let safety = 0;
        while (session.legalMoves.length > 0 && safety < 128) {
          const action = session.legalMoves[0];
          session = selectAction(session, action);
          safety++;
        }
        session = submitTurn(session);
        expect(session.state.players[session.state.currentPlayer]).toBeDefined();
        guard++;
      }
      expect(session.step).toBe("done");
      expect(session.winner).not.toBeNull();
      expect(session.winner).toMatch(/^p[12]$/);
    }
  });

  it("every exposed legal move is legal to apply to the projected state", () => {
    let session = createGameSession(3);
    session = selectAction(session, { type: "collectIncome" });
    for (const action of session.legalMoves) {
      // The legal move must be one of the core's enumerated legal actions.
      const all = legalActions(session.state);
      expect(
        all.some(
          (a) =>
            JSON.stringify(a) === JSON.stringify(action),
        ),
      ).toBe(true);
    }
  });

  it("the session never produces an illegal move across many seeds", () => {
    for (let seed = 0; seed < 20; seed++) {
      let session = createGameSession(seed);
      session = selectAction(session, { type: "collectIncome" });
      const next = submitTurn(session);
      // The AI's reply via playTurn must not throw and must land on a valid player.
      expect(next.state.players[next.state.currentPlayer]).toBeDefined();
    }
  });
});
