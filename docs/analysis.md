# Ape Kingdom — Enjoyment-Gap Analysis (M23-T2, #192)

> **Status:** written analysis (docs-only; no core change).
> **Scope:** review of the implemented game rules (`guidelines/ape-kingdom-rules.md`,
> `RULES.md`) and the build (`src/core`) for enjoyment gaps — stalemate risks,
> runaway economies, and frustrating outcomes — with concrete, rule-consistent
> improvement proposals.
> **Method:** code review of the pure core alongside empirical headless self-play
> runs (`npm run simulate` / `playAiGame`) on the default 20×20 map.

---

## 1. What the game does today

Ape Kingdom is a Slay-style turn-based hex game. Two factions race to capture
neutral sites (6 Groves, 4 Nests) between two Home Trees, collect banana income
from captured sites, recruit one of four ape ranks, and fight to eliminate the
opponent or control every Home Tree.

The implemented core (all pure, in `src/core`) faithfully encodes the rules:
income collection, recruitment, movement (standard 1-hex + up-to-4-hex through
own land), joining by level addition, combat by rank comparison, graves on
bankruptcy, vision/fog, elimination, and victory. The AI layer (`src/core/ai.ts`)
enumerates every legal action and selects one deterministically.

The empirical baseline (strategic AI, `difficulty: 1` + `preferCapture` +
`preferRecruit` + `avoidLosingAttacks`, default 20×20 map, 30 seeds):

| Metric | Value |
|---|---|
| Games resolved to a winner | 30 / 30 |
| Average turns to resolve | ~16 |
| p1 (first player) wins | 4 / 30 (~13%) |
| p2 (second player) wins | 26 / 30 (~87%) |
| Naive-AI average turns (20×20) | ~106 |

---

## 2. Identified enjoyment gaps

Each gap below states the observed problem, the evidence, a concrete
rule-consistent improvement proposal, and a rough impact. Proposals that change
the rules are flagged **`[CODIFY]`** — they must be written into
`guidelines/ape-kingdom-rules.md` before any implementation.

---

### Gap 1 — Severe second-mover advantage (first player is at a big disadvantage)  `[CODIFY]`

**Problem.** The player who moves second wins ~87% of strategic-AI games
(26/30). Because both factions race toward the same contested mid-board sites,
the second player can always respond to the first mover's capture and take the
disputed territory, snowballing from there. From the first player's seat this
feels unfair and frustrating; it is the single largest balance gap in the game.

**Evidence.** Headless runs above; the asymmetry is consistent across seeds and
reproducible via `playAiGame`.

**Proposal (rule-consistent).** Introduce a **first-mover compensation** so the
opening is not a straight race into a shared contested zone:

- **Option A (recommended, minimal):** Give the first player a small income
  head-start — e.g. the first player starts with **+1 banana** (3 instead of 2),
  or the second player's starting force is delayed one turn. This is a tiny,
  low-risk tweak to `startingForce` / setup and does not change the turn
  sequence.
- **Option B:** Offset the Home Trees so the neutral sites are *not* equidistant
  — place the contested Groves/Nests slightly closer to the first player's side
  to compensate for the second mover's reply advantage. This changes
  `placeNeutralSites` only.
- **Option C:** Add a "second mover moves second but the first player may commit
  to a contested site first" mechanic — more invasive; needs design.

**Impact.** Low implementation cost, high balance payoff. Would make the opening
feel fair for the human (who is usually p1 in the shipped Human-vs-AI game) and
reduce one-sided blowouts. **Rough impact:** shifts the p2 win share from ~87%
toward a balanced 45–55% range.

---

### Gap 2 — Map scale vs. movement speed (early-game tedium / slow pacing)  `[CODIFY]`

**Problem.** The default map is 20×20 (400 cells, ~285 land cells). The two Home
Trees are ~22 hexes apart and the nearest neutral site is ~9–10 hexes from each
Home Tree, but every unit moves only **1 hex per turn** (4 through own land).
The first several turns are a long, low-action march with no meaningful decision
or conflict — a classic "empty early game" that reads as tedium, especially on a
board this large.

**Evidence.** Geometry probe: home-tree separation 22 hexes, nearest neutral
site 9–10 hexes. A starting unit needs ~9–10 turns just to reach the nearest
neutral site; a human experiences many turns of pure movement before the first
capture or combat.

**Proposal (rule-consistent).** Rebalance **map scale relative to movement**:

- **Option A (recommended):** Reduce the default board to a size where the
  contested zone is reachable in 3–5 turns — e.g. a ~12×12 or ~14×14 board, or
  a smaller island size — while keeping the same 6 Groves / 4 Nests density.
  Change `DEFAULT_MAP_CONFIG` / `standardSetup` defaults only.
- **Option B:** Keep the large map but raise **standard movement** to 2 hexes
  (and own-land to 4–6), so crossing the map takes half as many turns. This is a
  rules change to the Ape Units table (all ranks move 2) and must be codified.
- **Option C:** Place the neutral sites closer to the Home Trees (a tighter
  mid-board cluster) so the opening contest begins earlier.

**Impact.** Directly reduces early-game tedium and speeds up the meaningful game.
**Rough impact:** cuts turns-to-first-contact from ~9–10 to ~3–5, making the
opening feel active.

---

### Gap 3 — Runaway / avalanche economy (no comeback mechanic)

**Problem.** Captured sites compound: more sites → more income → more units →
capture more sites. Empirically the winner ends with 10–19 units and 10–12 of
the 12 sites, while the loser is reduced to near-zero. Bananas never accumulate
(all reinvested), so there is no reservoir to fund a comeback, and a single
badly-lost fight cascades into a decisive snowball. Games end by avalanche
rather than close contest.

**Evidence.** In the strategic-AI runs the winner controlled 10–12 sites and
10–19 units at the end; the loser had 0–4 units. Combined with Gap 1, the
avalanche usually decides the game in the first few exchanges.

**Proposal (rule-consistent).** Introduce a gentle **catch-up / stabilizer**
without breaking the economy:

- **Option A (recommended):** Cap the **site-income snowball** by making the
  *marginal* value of each additional site diminish — e.g. after the first 6
  sites a kingdom's income grows more slowly, or each Grove/Nest beyond a
  threshold yields +1 instead of its listed value. Codify the threshold.
- **Option B:** Give a player who controls **no Home Tree but still has units**
  a small **recovery income** (a "refugee" bonus) so a player knocked off their
  Home Tree can rebuild instead of being frozen out — aligns with the existing
  "recover by capturing another Home Tree" rule.
- **Option C:** Let the **graves mechanic** double as a comeback valve — a
  kingdom in arrears that clears its own graves could recover income faster.
  (See Gap 5.)

**Impact.** Keeps the core economy intact while giving trailing players a path
back. **Rough impact:** longer, closer games with more meaningful late-game
decisions; reduces "stomping" frustration.

---

### Gap 4 — Protection / Safety Zones rule is not implemented (rules ↔ build gap)

**Problem.** The rules define **Protection / Safety Zones**: a unit protects its
surrounding cells from opposing units of the *same rank*, and a Home Tree
protects its surrounding cells from opposing Monkeys. This defensive layer is
**absent from the entire codebase** (no reference in `src/core`, the AI legal
enumeration, or any test). As a result the build does not match the rules, and
the game loses a positional/defensive mechanic that would create standoffs and
slow the rush-to-capture avalanche (Gaps 1 & 3).

**Evidence.** `grep -rn "protect\|safety"` across `src` and `tests` returns no
rule-related hits; `legalActions`/`reachableHexes`/`attackUnit` contain no
protection checks.

**Proposal (rule-consistent).** Implement the protection rule as written:
- In `legalActions` / `reachableHexes`, exclude move/attack targets that are
  protected by an opposing unit of the same rank (and by an opposing Home Tree
  from Monkeys).
- Enforce the same check in `moveUnit` / `attackUnit` so the reducers reject
  protected targets (matching the existing typed-error pattern).
- Add core tests for each protection case (same-rank block, Home-Tree-vs-Monkey
  block, higher/lower-rank still allowed).

**Impact.** This is a **rule-conformance** fix that also improves gameplay by
adding meaningful defensive positioning. **Rough impact:** slows the mid-game
rush and adds depth; worth doing before balance tuning (Gaps 1–3) so those
tweaks are measured on the correct ruleset. **No new feature** — it restores a
rule already in `ape-kingdom-rules.md`.

---

### Gap 5 — Graves can become a frustrating death spiral

**Problem.** When a kingdom's money goes negative, **all** of its units die and
it pays **-1 banana per grave per turn**. Combined with the avalanche economy
(Gap 3), a player who loses a fight can cascade: lose units → lose income → go
negative → lose *more* units → more graves → more upkeep. The rule is a
"frustrating outcome" risk exactly as the issue flags: it can lock a trailing
player into a spiral with no recovery path.

**Evidence.** Code review of `resolveBankruptcy` / `graveUpkeep` /
`collectIncome`; the mechanic removes all units of an in-arrears kingdom and
charges ongoing upkeep, with no built-in recovery except harvesting one's own
graves (which requires a surviving unit — the spiral may leave none).

**Proposal (rule-consistent).** Soften the cliff without removing the mechanic:
- **Option A (recommended):** Make graves **harvestable by the owning kingdom
  for a net recovery** — a kingdom that goes negative is *not* instantly wiped;
  instead it loses units one at a time (e.g. its weakest first) each turn it
  stays negative, giving it a turn to recover. Codify the gradual-bankruptcy
  rule.
- **Option B:** Cap grave upkeep so it cannot exceed the kingdom's income
  (a kingdom cannot be pushed further negative by graves alone) — prevents the
  spiral from becoming a guaranteed wipe.
- **Option C:** Allow a kingdom in arrears to **sell/forfeit a unit** to clear a
  grave, giving an active recovery lever.

**Impact.** Reduces the "one bad fight ends the game" frustration while keeping
graves as a real economic consequence. **Rough impact:** fewer abrupt,
unrecoverable losses; more games reach a competitive late game.

---

### Gap 6 — Win condition "control every Home Tree" is effectively redundant at 2 players

**Problem.** With exactly **2 Home Trees**, "control every Home Tree" requires
capturing the opponent's Home Tree. But a player who has lost their Home Tree
and has no units is already *eliminated*, and a player who controls the
opponent's Home Tree while the opponent still has units is not yet eliminated —
so the two victory conditions rarely diverge in a 2-player game. The "control
every Home Tree" condition is therefore mostly a formality, and the real win is
almost always elimination.

**Evidence.** Code review of `checkVictory`: with 2 Home Trees, "controls every
Home Tree" and "only player not eliminated" are near-equivalent in practice.

**Proposal (rule-consistent).** This is a **documentation/design** observation
rather than a bug:
- **Option A:** Keep both conditions (they are correct as written and matter for
  >2-player games) but document in `RULES.md` that victory in the standard
  2-player game resolves by elimination.
- **Option B:** If a "control every Home Tree" *dominion* win is desired as
  distinct, add a rule that controlling every Home Tree ends the game
  immediately even if the opponent still has units — a real alternate win
  (codify it).

**Impact.** Low. Primarily clarifies intent; Option B would add a genuine second
win path and a distinct strategic objective.

---

### Gap 7 — Naive-AI games are very long (AI difficulty / pacing)

**Problem.** With the default (naive, uniformly-random) AI, self-play games on
the 20×20 map take ~106 turns on average. The shipped Human-vs-AI experience
will inherit this pacing unless the AI is driven at higher difficulty. Long,
wandering AI turns make the game feel slow and reduce the fun of a single
session.

**Evidence.** Self-play runs: naive AI avg ~106 turns vs strategic AI ~16 turns
on the same board.

**Proposal (rule-consistent).** This is an **AI-behavior** tuning, not a rules
change:
- Raise the default AI difficulty in the shipped game (e.g. default to
  `difficulty: 1` with `preferCapture` + `avoidLosingAttacks`) so AI turns are
  purposeful and games resolve in a satisfying time.
- Add an explicit difficulty selector (Easy = naive, Normal = strategic) so the
  pacing is a player choice.

**Impact.** Directly improves the shipped feel. **Rough impact:** cuts average
game length ~6× and makes AI turns feel competent.

---

## 3. Priority ranking of actionable findings

| # | Gap | Type | Priority | Effort |
|---|---|---|---|---|
| 4 | Protection / Safety Zones not implemented | rules-conformance (bug) | **P1** | M |
| 1 | Second-mover advantage | balance | **P1** | S |
| 2 | Map scale vs movement (early tedium) | pacing | **P2** | S–M |
| 3 | Runaway / avalanche economy | balance | **P2** | M |
| 5 | Graves death spiral | frustration | **P2** | M |
| 7 | Naive-AI pacing | AI tuning | **P3** | S |
| 6 | Redundant win condition | design/doc | **P3** | S |

---

## 4. Follow-up issues

The findings above are distilled into actionable follow-up issues (created
separately), each with the appropriate priority and milestone. **No game feature
outside `guidelines/ape-kingdom-rules.md` is added by this analysis; any proposed
rule change is flagged `[CODIFY]` and must be written into the rules before
implementation.**

- **[P1] Implement Protection / Safety Zones** (rules-conformance; #192-G4).
  Restores a rule already in `ape-kingdom-rules.md`; no new feature.
- **[P1] Balance the second-mover advantage** (first-player compensation; #192-G1).
- **[P2] Rebalance map scale vs movement speed** (#192-G2).
- **[P2] Add a comeback / anti-avalanche economy mechanic** (#192-G3).
- **[P2] Soften the graves death spiral** (#192-G5).
- **[P3] Raise default AI difficulty / add difficulty selector** (#192-G7).

---

## 5. Test / build evidence

- `npm test` — 786 passed (unchanged; this is a docs-only change).
- `npm run test:coverage` — `src/core` remains 100% covered (no core change).
- `npm run build` — passes.

No core, view-model, or component code was changed by this analysis; it is a
written review plus follow-up issues.
