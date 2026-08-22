import { describe, it, expect } from "vitest";
import type { Site, Player, GameState } from "../../src/core/game";
import {
  APE_TYPES,
  APE_KINDS,
  SITE_TYPES,
  SITE_KINDS,
  apeType,
  siteType,
  rankOf,
  costOf,
  movementOf,
  incomeOf,
  allowsRecruitment,
  createUnit,
  createSite,
  createPlayer,
  startingForce,
  incomeFor,
  collectIncome,
} from "../../src/core/game";

describe("ape unit static tables (Ape Units table)", () => {
  it("defines all four ape kinds in ascending rank order", () => {
    expect(APE_KINDS).toEqual(["Monkey", "Gibbon", "Chimpanzee", "Gorilla"]);
  });

  it("assigns rank, cost, and movement per the rules", () => {
    expect(APE_TYPES.Monkey).toEqual({ kind: "Monkey", rank: 1, cost: 2, movement: 1 });
    expect(APE_TYPES.Gibbon).toEqual({ kind: "Gibbon", rank: 2, cost: 4, movement: 1 });
    expect(APE_TYPES.Chimpanzee).toEqual({ kind: "Chimpanzee", rank: 3, cost: 8, movement: 1 });
    expect(APE_TYPES.Gorilla).toEqual({ kind: "Gorilla", rank: 4, cost: 16, movement: 1 });
  });

  it("exposes apeType lookup for every kind", () => {
    for (const kind of APE_KINDS) {
      expect(apeType(kind)).toBe(APE_TYPES[kind]);
    }
  });

  it("returns rank via rankOf", () => {
    expect(rankOf("Monkey")).toBe(1);
    expect(rankOf("Gibbon")).toBe(2);
    expect(rankOf("Chimpanzee")).toBe(3);
    expect(rankOf("Gorilla")).toBe(4);
  });

  it("returns cost via costOf", () => {
    expect(costOf("Monkey")).toBe(2);
    expect(costOf("Gorilla")).toBe(16);
  });

  it("returns movement via movementOf (standard 1 hex)", () => {
    expect(movementOf("Monkey")).toBe(1);
    expect(movementOf("Chimpanzee")).toBe(1);
  });
});

describe("site static tables (Sites & Income table)", () => {
  it("defines all three site kinds", () => {
    expect(SITE_KINDS).toEqual(["Grove", "Nest", "HomeTree"]);
  });

  it("assigns income and recruitment per the rules", () => {
    expect(SITE_TYPES.Grove).toEqual({ kind: "Grove", income: 1, allowsRecruitment: false });
    expect(SITE_TYPES.Nest).toEqual({ kind: "Nest", income: 2, allowsRecruitment: false });
    expect(SITE_TYPES.HomeTree).toEqual({
      kind: "HomeTree",
      income: 3,
      allowsRecruitment: true,
    });
  });

  it("exposes siteType lookup for every kind", () => {
    for (const kind of SITE_KINDS) {
      expect(siteType(kind)).toBe(SITE_TYPES[kind]);
    }
  });

  it("returns income via incomeOf", () => {
    expect(incomeOf("Grove")).toBe(1);
    expect(incomeOf("Nest")).toBe(2);
    expect(incomeOf("HomeTree")).toBe(3);
  });

  it("returns recruitment allowance via allowsRecruitment", () => {
    expect(allowsRecruitment("Grove")).toBe(false);
    expect(allowsRecruitment("Nest")).toBe(false);
    expect(allowsRecruitment("HomeTree")).toBe(true);
  });
});

describe("unit creation", () => {
  it("creates a unit that has already acted by default", () => {
    const unit = createUnit("Monkey", "p1");
    expect(unit).toEqual({ kind: "Monkey", owner: "p1", hasActed: true });
  });

  it("creates a unit that can act when hasActed is false", () => {
    const unit = createUnit("Gorilla", "p2", false);
    expect(unit.kind).toBe("Gorilla");
    expect(unit.owner).toBe("p2");
    expect(unit.hasActed).toBe(false);
  });
});

describe("site creation", () => {
  it("creates a neutral site on a hex by default", () => {
    const site = createSite("Grove", 1, 2);
    expect(site.kind).toBe("Grove");
    expect(site.hex).toEqual({ q: 1, r: 2 });
    expect(site.owner).toBeNull();
  });

  it("creates a controlled site when an owner is provided", () => {
    const site = createSite("HomeTree", 0, 0, "p1");
    expect(site.owner).toBe("p1");
  });
});

describe("player creation", () => {
  it("creates a player with a default zero banana balance", () => {
    expect(createPlayer("p1")).toEqual({ id: "p1", bananas: 0 });
  });

  it("creates a player with an explicit banana balance", () => {
    expect(createPlayer("p2", 5)).toEqual({ id: "p2", bananas: 5 });
  });
});

describe("standard setup (Setup section)", () => {
  it("gives each player 3 Monkeys, 1 Gibbon, and 2 bananas", () => {
    const force = startingForce("p1");
    expect(force.units).toHaveLength(4);
    expect(force.units.filter((u) => u.kind === "Monkey")).toHaveLength(3);
    expect(force.units.filter((u) => u.kind === "Gibbon")).toHaveLength(1);
    expect(force.units.every((u) => u.owner === "p1")).toBe(true);
    expect(force.player).toEqual({ id: "p1", bananas: 2 });
  });
});

/* ------------------------------------------------------------------ */
/* Collect income (Turn Sequence step A)                                */
/* ------------------------------------------------------------------ */

/** Build a minimal game state for income tests. */
function gameState(opts: {
  sites?: Site[];
  players?: Record<string, Player>;
  currentPlayer?: string;
} = {}): GameState {
  return {
    sites: opts.sites ?? [],
    units: [],
    players: opts.players ?? { p1: createPlayer("p1"), p2: createPlayer("p2") },
    currentPlayer: opts.currentPlayer ?? "p1",
    turnOrder: ["p1", "p2"],
  };
}

describe("incomeFor", () => {
  it("sums income from all sites controlled by the player", () => {
    const sites = [
      createSite("Grove", 0, 0, "p1"),
      createSite("Nest", 1, 0, "p1"),
      createSite("HomeTree", 2, 0, "p1"),
    ];
    expect(incomeFor("p1", sites)).toBe(1 + 2 + 3);
  });

  it("ignores sites owned by other players", () => {
    const sites = [
      createSite("Nest", 0, 0, "p2"),
      createSite("HomeTree", 1, 0, "p2"),
    ];
    expect(incomeFor("p1", sites)).toBe(0);
  });

  it("ignores neutral sites (owner null)", () => {
    const sites = [createSite("Grove", 0, 0), createSite("Nest", 1, 0, null)];
    expect(incomeFor("p1", sites)).toBe(0);
  });

  it("returns 0 when the player controls no sites", () => {
    expect(incomeFor("p1", [])).toBe(0);
  });
});

describe("collectIncome", () => {
  it("credits the current player with the income of every controlled site", () => {
    const state = gameState({
      sites: [
        createSite("Grove", 0, 0, "p1"),
        createSite("Nest", 1, 0, "p1"),
        createSite("HomeTree", 2, 0, "p1"),
        createSite("Grove", 3, 0, "p2"),
        createSite("Nest", 4, 0), // neutral
      ],
      players: { p1: createPlayer("p1", 5), p2: createPlayer("p2", 0) },
    });
    const next = collectIncome(state);
    // p1 controls Grove(1)+Nest(2)+HomeTree(3) = 6; starts with 5.
    expect(next.players.p1.bananas).toBe(5 + 6);
    // p2's balance is untouched.
    expect(next.players.p2.bananas).toBe(0);
  });

  it("adds income to the current player's existing balance (may save without limit)", () => {
    const state = gameState({
      sites: [createSite("HomeTree", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 100), p2: createPlayer("p2", 0) },
    });
    expect(collectIncome(state).players.p1.bananas).toBe(103);
  });

  it("adds no bananas when the current player controls no sites", () => {
    const state = gameState({
      sites: [createSite("Grove", 0, 0, "p2"), createSite("Nest", 1, 0)],
      players: { p1: createPlayer("p1", 2), p2: createPlayer("p2", 0) },
    });
    expect(collectIncome(state).players.p1.bananas).toBe(2);
  });

  it("returns a new GameState and does not mutate the input", () => {
    const state = gameState({
      sites: [createSite("Nest", 0, 0, "p1")],
      players: { p1: createPlayer("p1", 0), p2: createPlayer("p2", 0) },
    });
    const next = collectIncome(state);
    expect(next).not.toBe(state);
    expect(next.players).not.toBe(state.players);
    expect(next.players.p1).not.toBe(state.players.p1);
    // Input is unchanged.
    expect(state.players.p1.bananas).toBe(0);
    expect(state.sites).toEqual([createSite("Nest", 0, 0, "p1")]);
  });
});
