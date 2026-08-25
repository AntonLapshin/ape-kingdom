# Ape Kingdom — Game Rules

This document describes the full game of **Ape Kingdom**, a turn-based hex game
where ape factions fight to rule the kingdom. It is a player/developer-facing
summary of the game. The authoritative, design-level source of truth lives in
[`guidelines/ape-kingdom-rules.md`](guidelines/ape-kingdom-rules.md) — the game
implementation and these rules must always stay consistent with it.

## Goal

Be the last ape faction surviving. You **win** when you control **every Home
Tree** on the map, **or** when all opposing factions are **eliminated**.

## Components

- **Hexagon map** made of hex cells (land, water, and mountain terrain).
- **Banana tokens** — the game's currency.
- **Site markers** — special hexes you can own and capture:
  - **Grove** — produces bananas.
  - **Nest** — produces bananas.
  - **Home Tree** — produces bananas and allows recruitment.
- **Ape unit tokens** — your units on the map.

Only one unit may occupy a hex unless stated otherwise.

---

## Economics (banana income)

Sites produce banana income each turn. Income is collected **at the start of
your turn** from every site you control.

| Site | Banana Income | Special |
|---|---:|---|
| Grove | 1 | Produces bananas. |
| Nest | 2 | Produces bananas. |
| Home Tree | 3 | Produces bananas **and allows recruitment**. |

- Bananas may be **saved without limit** between turns.
- **Neutral sites** (not owned by any player) produce **no income** until they
  are captured.

---

## Units — the four ape ranks

There are **four ape ranks**. A rank determines combat strength, recruitment
cost, and (by default) movement.

| Ape | Rank | Banana Cost | Movement |
|---|---:|---:|---|
| Monkey | 1 | 2 | 1 hex |
| Gibbon | 2 | 4 | 1 hex |
| Chimpanzee | 3 | 8 | 1 hex |
| Gorilla | 4 | 16 | 1 hex |

All apes move **1 hex per turn** unless you use the optional movement variants
(see [Movement](#movement)).

---

## Setup

For a standard two-player game:

- Each player places **one Home Tree** on opposite sides of the map.
- Place neutral sites between them:
  - **6 Groves**
  - **4 Nests**
- Each player starts with:
  - **3 Monkeys**
  - **1 Gibbon**
  - **2 bananas**

For more players, add roughly **2 Groves and 1 Nest per extra player**, and give
each player the same starting force.

Neutral sites produce no income until captured.

---

## Turn sequence

On your turn, do the following **in order**:

### A. Collect Income

Gain bananas from all Groves, Nests, and Home Trees you control
(see [Economics](#economics-banana-income)).

### B. Recruit Apes

You may spend bananas to **recruit apes at any Home Tree you control**. A new
ape may be placed:

- **on the Home Tree hex**, if empty; **or**
- in an **adjacent empty hex**.

Newly recruited apes **cannot move or attack until your next turn**.

### C. Move and Fight

Each ape that was under your control **at the start of your turn** may act once.
An acting ape may:

1. **Move** up to its Movement value (default 1 hex).
2. Then **either**:
   - **attack** one adjacent enemy unit, **or**
   - **capture** an unoccupied site hex.

A unit may **not move after attacking**.

---

## Movement

- An ape may move up to its **Movement** value (standard movement is **1 hex**).
- A unit may **not enter a hex occupied by another unit**.
- A unit may **not move through enemy units**.
- **Terrain** matters: a unit may **not move onto (or through) a mountain cell**,
  and may **not move onto (or through) a water cell**.
- Moving onto an **unoccupied Grove, Nest, or Home Tree** captures it for that
  unit's owner.

### Moving through your own land (owned-land range)

When a unit's **entire route stays within cells its own kingdom owns**, the unit
may move up to **4 hexes** instead of the standard 1.

A cell is **owned by a kingdom** when the kingdom owns the site on it **or** one
of its units occupies it. A kingdom's owned cells form its **territory**: the
Home Tree it controls, surrounding Groves and Nests it has captured, and the
cells its own units stand on.

Owned-land movement requires **every intermediate cell and the destination** to
be owned by the mover's kingdom **and** to be passable land — it may **never**
enter enemy or neutral territory, and it may **never cross water or mountain
cells**. When **any** cell on the route is not owned by the mover's kingdom (or
is water or a mountain), the unit falls back to the **standard 1-hex**
movement.

---

## Combat

Combat is resolved by **comparing ranks**:

| Attacker Rank vs Defender Rank | Result |
|---|---|
| Attacker rank higher | Defender is destroyed. Attacker moves into the defender's hex. |
| Equal ranks | Both units are destroyed. |
| Attacker rank lower | Attacker is destroyed. Defender remains. |

- If the defender was occupying a site and the attacker wins, the attacker
  **captures that site**.
- If both units are destroyed, **site ownership does not change**.
- Each unit may make **only one attack per turn**.

### Protection / safety zones

A unit **protects its surrounding cells**. An enemy unit may **not move or
attack** into a cell protected by an opposing unit of the **same rank**:

- A **Monkey** (rank 1) protects its adjacent cells from opposing Monkeys.
- A **Gibbon** (rank 2) protects its adjacent cells from opposing Gibbons.
- A **Chimpanzee** (rank 3) protects its adjacent cells from opposing
  Chimpanzees.
- A **Gorilla** (rank 4) protects its adjacent cells from opposing Gorillas.

A **Home Tree** protects the cells surrounding it: an enemy **Monkey** (rank 1)
may not move or attack into a cell protected by an opposing Home Tree.

Protection **only restricts entry by the opposing units listed above**; it does
*not* prevent higher- or lower-ranked enemy units from entering protected cells,
and it does *not* restrict the protecting unit's own movement or attacks.
Protection does **not** change site ownership and does **not** prevent protected
cells from being captured by a unit that is allowed to enter them.

---

## Capturing territory

- **Move onto an unoccupied site** to capture it.
- **Defeat an enemy unit on a site** to capture that site.
- A captured site **remains yours until an enemy unit captures it**.
- **Home Trees are captured like other sites**, but only Home Trees allow
  recruitment.
- A site you capture adds its banana income to your economy and extends your
  owned territory (which enables owned-land movement through it).

---

## Elimination

- A player is **eliminated** if they control **no Home Tree and have no units**.
- A player who controls **no Home Tree but still has units** may continue
  playing and can **recover by capturing another Home Tree**.

---

## Winning condition

The game ends **immediately** when one player either:

- controls **every Home Tree on the map**; **or**
- is the **only player not eliminated**.

That player **wins and rules the Ape Kingdom**.

---

*This file is the player/developer-facing rules reference. The authoritative
ruleset is [`guidelines/ape-kingdom-rules.md`](guidelines/ape-kingdom-rules.md).*
