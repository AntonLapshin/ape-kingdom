Ape Kingdom

A concise, complete Slay-style turn-based hex game ruleset with ape units.

Goal

Be the last ape faction surviving. You win when you control every Home Tree on the map, or when all opposing factions are eliminated.

Components

Hexagon map
Banana tokens or counters
Site markers:
  - Grove
  - Nest
  - Home Tree
Ape unit tokens

Only one unit may occupy a hex unless stated otherwise.

Sites and Income

Sites are captured by moving a unit onto them or by defeating an enemy unit occupying them.

| Site | Banana Income | Special |
|---|---:|---|
| Grove | 1 | Produces bananas. |
| Nest | 2 | Produces bananas. |
| Home Tree | 3 | Produces bananas and allows recruitment. |

At the start of your turn, collect bananas from all sites you control. Bananas may be saved without limit.

Ape Units

There are four ape ranks. Rank determines combat strength.

| Ape | Rank | Banana Cost | Movement |
|---|---:|---:|---:|
| Monkey | 1 | 2 | 1 hex |
| Gibbon | 2 | 4 | 1 hex |
| Chimpanzee | 3 | 8 | 1 hex |
| Gorilla | 4 | 16 | 1 hex |

All apes move 1 hex per turn unless you use optional movement variants.

Setup

For a standard two-player game:

Each player places one Home Tree on opposite sides of the map.
Place neutral sites between them:
   - 6 Groves
   - 4 Nests
Each player starts with:
   - 3 Monkeys
   - 1 Gibbon
   - 2 bananas

For more players, add roughly 2 Groves and 1 Nest per extra player, and give each player the same starting force.

Neutral sites produce no income until captured.

Graves

When a kingdom's money goes negative, all of its units die and a grave appears
in place of each one.

- Each grave costs its owning kingdom -1 banana per turn (paid from income).
- A unit may harvest a grave by moving onto it: the grave is cleared and the
  harvester's kingdom gains +2 bananas.

Vision / Exploration

When starting the game the map is hidden (black). Cells become visible as a player
moves units and gains territory; each kingdom sees only through its own sight lines.
A kingdom's own territory (its Home Tree, captured Groves/Nests, and its persistent
site-less territory) is always visible to that kingdom, even when no unit stands on
or near it — owning cells are never hidden behind fog. Neutral and enemy-owned cells
obey normal vision/fog.

A sight source reveals every cell within its vision radius (in hexes), measured as
rings of surrounding cells from the source hex. Visibility is cumulative: a hex once
revealed by any owned sight line stays visible while that sight line endures.

| Sight source | Vision radius |
|---|---:|
| Monkey | 1 ring |
| Gibbon | 2 rings |
| Home Tree | 3 rings |
| Chimpanzee | 3 rings |
| Gorilla | 3 rings |
| All other units | 3 rings |

A player sees only from the Home Trees and units they control; an opponent's Home
Trees and units are never sight sources for them.

Turn Sequence

On your turn, do the following in order:

A. Collect Income

Gain bananas from all Groves, Nests, and Home Trees you control.

B. Recruit Apes

You may spend bananas to recruit apes at any Home Tree you control.

A new ape may be placed:

on the Home Tree hex, if empty; or
in an adjacent empty hex.

Newly recruited apes cannot move or attack until your next turn.

C. Move and Fight

Each ape that was under your control at the start of your turn may act once.

An acting ape may:

Move up to 1 hex.
Then either:
   - attack one adjacent enemy unit, or
   - capture an unoccupied site hex.

A unit may not move after attacking.

Movement Rules

An ape may move up to its Movement value.
Standard movement is 1 hex.
A unit may not enter a hex occupied by another unit.
A unit may not move through enemy units.
Moving onto an unoccupied Grove, Nest, or Home Tree captures it for that unit's owner.

Moving through your own land (optional movement variant)

When a unit's entire route stays within cells its own kingdom owns, the unit may move up to 4 hexes instead of the standard 1.

A cell is owned by a kingdom when the kingdom owns the site on it, when it is persistent site-less territory of that kingdom, or when one of its units occupies it. A kingdom's owned cells form its territory: the Home Tree it controls, surrounding Groves and Nests it has captured, and the cells its own units stand on.

Persistent site-less territory: a site-less cell a kingdom's unit stood on or claimed stays owned by that kingdom after the unit vacates it — it does not revert to neutral when the unit leaves. It is only lost when an enemy captures the cell (by moving onto it or defeating a unit on it). A site-owned cell always follows its site's owner; site-less territory is retained until an enemy captures the cell.

Owned-land movement requires every intermediate cell and the destination to be owned by the mover's kingdom and to be passable land — it may never enter enemy or neutral territory, and it may never cross water or mountain cells. When any cell on the route is not owned by the mover's kingdom (or is water or a mountain), the unit falls back to the standard 1-hex movement.

Joining units (combining by level addition)

Instead of entering a hex occupied by another unit, a unit may join a **same-kingdom** unit on an adjacent hex by **adding the two levels** (ranks):

- 1 + 1 = 2 (Monkey + Monkey → Gibbon)
- 1 + 2 = 3 and 2 + 1 = 3 (Monkey + Gibbon → Chimpanzee)
- 2 + 2 = 4 (Gibbon + Gibbon → Gorilla)
- 1 + 3 = 4 and 3 + 1 = 4 (Monkey + Chimpanzee → Gorilla)

Joining consumes both units into a single unit whose level is the sum, placed on the target hex; the joined unit has acted for the turn. A join is only possible while **both units are still movable this turn** (neither has already acted), and the summed level may **never exceed the maximum rank (4)** — so 2 + 3 (and anything summing over 4) can **never** combine. A unit may not join an enemy unit (enemy-occupied hexes are resolved by combat) nor a unit that has already acted.

Combat

Combat is resolved by comparing ranks.

| Attacker Rank vs Defender Rank | Result |
|---|---|
| Attacker rank higher | Defender is destroyed. Attacker moves into the defender’s hex. |
| Equal ranks | Both units are destroyed. |
| Attacker rank lower | Attacker is destroyed. Defender remains. |

If the defender was occupying a site and the attacker wins, the attacker captures that site.

If both units are destroyed, site ownership does not change.

Each unit may make only one attack per turn.

Protection / Safety Zones

A unit protects its surrounding cells. An enemy unit may not move or attack into a cell protected by an opposing unit of the same rank.

  - A Monkey (rank 1) protects its adjacent cells from opposing Monkeys.
  - A Gibbon (rank 2) protects its adjacent cells from opposing Gibbons.
  - A Chimpanzee (rank 3) protects its adjacent cells from opposing Chimpanzees.
  - A Gorilla (rank 4) protects its adjacent cells from opposing Gorillas.

A Home Tree protects the cells surrounding it. An enemy ape of rank 1 (Monkey) may not move or attack into a cell protected by an opposing Home Tree.

Protection only restricts entry by the opposing units listed above; it does not prevent higher- or lower-ranked enemy units from entering protected cells, and it does not restrict the protecting unit's own movement or attacks. Protection does not change site ownership and does not prevent the protected cells from being captured by a unit that is allowed to enter them.

Capturing Sites

Move onto an unoccupied site to capture it.
Defeat an enemy unit on a site to capture that site.
A captured site remains yours until an enemy unit captures it.
Home Trees are captured like other sites, but only Home Trees allow recruitment.

Elimination

A player is eliminated if they control no Home Tree and have no units.

A player who controls no Home Tree but still has units may continue playing and can recover by capturing another Home Tree.

Victory

The game ends immediately when one player either:

controls every Home Tree on the map; or
is the only player not eliminated.

That player wins and rules the Ape Kingdom.

Optional Classic Reskin Mapping

If you want a direct Slay-style rank mapping:

| Slay-style Unit | Ape Kingdom Unit |
|---|---|
| Peasant | Monkey |
| Squire | Gibbon |
| Knight | Chimpanzee |
| Baron | Gorilla |