import { describe, it, expect } from "vitest";
import { cellInfo } from "../../src/core/cellInfo";
import {
  createGameSession,
  selectAction,
  standardSetup,
} from "../../src/core/gameSession";
import type { GameSession } from "../../src/core/gameSession";
import {
  sameHex,
  type GameState,
  type Hex,
} from "../../src/core/game";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** The p1 Home Tree hex from a standard setup. */
function p1Home(state: GameState): Hex {
  const home = state.sites.find(
    (s) => s.kind === "HomeTree" && s.owner === "p1",
  )!;
  return home.hex;
}

/** The first empty (no site, no unit) map hex. */
function emptyHex(state: GameState): Hex {
  return state.map.cells
    .map((c) => c.hex)
    .find(
      (h) =>
        !state.sites.some((s) => sameHex(s.hex, h)) &&
        !state.units.some((u) => sameHex(u.hex, h)),
    )!;
}

/** A session on the recruit step (recruit actions legal; income collected
 *  automatically at the start of the turn). */
function toRecruitStep(): GameSession {
  return createGameSession();
}

/** A legal recruit action from the recruit step (fails if none exists). */
function firstRecruit(session: GameSession): Hex {
  const recruit = session.legalMoves.find((a) => a.type === "recruit");
  if (!recruit || recruit.type !== "recruit") {
    throw new Error("expected a legal recruit action");
  }
  return recruit.hex;
}

/* ------------------------------------------------------------------ */
/* Terrain derivation                                                  */
/* ------------------------------------------------------------------ */

describe("cellInfo terrain", () => {
  it("reports the generated terrain for a hex", () => {
    const state = standardSetup();
    expect(cellInfo(state, p1Home(state)).terrain).toBe("land");
  });

  it("treats an out-of-bounds hex as land (never crashes)", () => {
    const state = standardSetup();
    expect(cellInfo(state, { q: 9999, r: -9999 }).terrain).toBe("land");
  });
});

/* ------------------------------------------------------------------ */
/* Site derivation                                                     */
/* ------------------------------------------------------------------ */

describe("cellInfo site", () => {
  it("derives the site kind, owner, and income", () => {
    const state = standardSetup();
    const info = cellInfo(state, p1Home(state));
    expect(info.site).not.toBeNull();
    expect(info.site!.kind).toBe("HomeTree");
    expect(info.site!.owner).toBe("p1");
    // Home Tree produces 3 income per the Sites & Income table.
    expect(info.site!.income).toBe(3);
  });

  it("reports null site for a hex with no site", () => {
    const state = standardSetup();
    expect(cellInfo(state, emptyHex(state)).site).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Unit derivation                                                     */
/* ------------------------------------------------------------------ */

describe("cellInfo unit", () => {
  it("derives the unit kind, rank, owner, and recruit cost", () => {
    const state = standardSetup();
    const info = cellInfo(state, p1Home(state));
    expect(info.unit).not.toBeNull();
    // p1's Home Tree starts with a Monkey.
    expect(info.unit!.kind).toBe("Monkey");
    expect(info.unit!.rank).toBe(1);
    expect(info.unit!.owner).toBe("p1");
    // Monkey recruit cost is 2 per the Ape Units table.
    expect(info.unit!.cost).toBe(2);
  });

  it("reports null unit for a hex with no unit", () => {
    const state = standardSetup();
    expect(cellInfo(state, emptyHex(state)).unit).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Actionability / recruit items                                       */
/* ------------------------------------------------------------------ */

describe("cellInfo actionability", () => {
  it("is actionable for a legal recruit/placement hex on the recruit step", () => {
    const session = toRecruitStep();
    const hex = firstRecruit(session);
    const info = cellInfo(session.state, hex);
    expect(info.actionable).toBe(true);
    expect(info.actions.length).toBeGreaterThan(0);
  });

  it("lists a recruit item per affordable ape kind with its cost and action", () => {
    const session = toRecruitStep();
    const hex = firstRecruit(session);
    const info = cellInfo(session.state, hex);
    expect(info.actions.length).toBeGreaterThan(0);
    for (const item of info.actions) {
      expect(item.cost).toBeGreaterThan(0);
      expect(item.action.type).toBe("recruit");
      expect(item.action.hex).toEqual(hex);
      // Every listed kind is actually a legal recruit at this hex.
      expect(
        session.legalMoves.some(
          (a) => a.type === "recruit" && a.kind === item.kind && sameHex(a.hex, hex),
        ),
      ).toBe(true);
    }
  });

  it("is not actionable for a read-only hex with no legal recruit option", () => {
    // The p1 Home Tree hex is occupied by a starting unit, so it is not a
    // buildable placement hex and offers no legal action on the recruit step.
    const session = createGameSession();
    const info = cellInfo(session.state, p1Home(session.state));
    expect(info.actionable).toBe(false);
    expect(info.actions).toEqual([]);
  });

  it("is not actionable for a non-buildable hex on the recruit step", () => {
    const session = toRecruitStep();
    const recruitHexes = new Set(
      session.legalMoves
        .filter((a): a is Extract<typeof a, { type: "recruit" }> => a.type === "recruit")
        .map((a) => `${a.hex.q},${a.hex.r}`),
    );
    const nonBuildable = session.state.map.cells
      .map((c) => c.hex)
      .find(
        (h) =>
          !recruitHexes.has(`${h.q},${h.r}`) &&
          !session.state.units.some((u) => sameHex(u.hex, h)),
      );
    if (!nonBuildable) {
      // Defensive: with 1-step reach the large map has plenty of land.
      throw new Error("expected a non-buildable land hex");
    }
    const info = cellInfo(session.state, nonBuildable);
    expect(info.actionable).toBe(false);
    expect(info.actions).toEqual([]);
  });

  it("lists each ape kind at most once per hex", () => {
    const session = toRecruitStep();
    const hex = firstRecruit(session);
    const info = cellInfo(session.state, hex);
    const kinds = info.actions.map((a) => a.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

/* ------------------------------------------------------------------ */
/* Action item feeds into selectAction                                 */
/* ------------------------------------------------------------------ */

describe("cellInfo action items feed the selectAction flow", () => {
  it("selecting a derived action is accepted by the session", () => {
    let session = toRecruitStep();
    const hex = firstRecruit(session);
    const info = cellInfo(session.state, hex);
    const item = info.actions[0];
    // Feeding the derived action back into the session is a legal selection.
    expect(() => selectAction(session, item.action)).not.toThrow();
    session = selectAction(session, item.action);
    // The recruited unit appears in the projected state at the target hex.
    expect(
      session.state.units.some(
        (u) =>
          u.owner === "p1" &&
          u.kind === item.kind &&
          sameHex(u.hex, item.action.hex),
      ),
    ).toBe(true);
  });
});
