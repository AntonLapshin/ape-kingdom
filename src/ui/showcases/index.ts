import type { ShowcaseRegistry } from "../../core/showcase";
import * as ActionControlsShowcase from "./ActionControls";
import * as BoardShowcase from "./Board";
import * as StatusPanelShowcase from "./StatusPanel";
import * as DemoPanelShowcase from "./DemoPanel";
import * as CellShowcase from "./Cell";
import * as ContentShowcase from "./Content";
import * as UnitShowcase from "./Unit";
import * as CellInfoPanelShowcase from "./CellInfoPanel";
import * as PlayableGameShowcase from "./PlayableGame";

/**
 * Showcase index / registration (M7-T3).
 *
 * Aggregates every showcase demo file in `src/ui/showcases/` into the
 * `ShowcaseRegistry` shape the core engine (`src/core/showcase.ts`) and the
 * `useShowcase` view model consume. Each showcase file exports a `name`
 * constant (the sidebar display name) and one named render function per
 * variant/state; this index collects them into the flat registry.
 *
 * Every atom component in `src/ui/components/` has a registered showcase here,
 * per `guidelines/GUIDELINES-WEB-ATOMIC-DESIGN.md` rule 7.
 */
export function showcaseRegistry(): ShowcaseRegistry {
  return [
    {
      name: ActionControlsShowcase.name,
      showcases: {
        Income: ActionControlsShowcase.Income,
        Recruit: ActionControlsShowcase.Recruit,
        MoveFight: ActionControlsShowcase.MoveFight,
        NoActions: ActionControlsShowcase.NoActions,
        GameOver: ActionControlsShowcase.GameOver,
      },
    },
    {
      name: BoardShowcase.name,
      showcases: {
        Opening: BoardShowcase.Opening,
        PlayerTwoTurn: BoardShowcase.PlayerTwoTurn,
      },
    },
    {
      name: StatusPanelShowcase.name,
      showcases: {
        InProgress: StatusPanelShowcase.InProgress,
        MidGame: StatusPanelShowcase.MidGame,
        HumanWins: StatusPanelShowcase.HumanWins,
        AiWins: StatusPanelShowcase.AiWins,
      },
    },
    {
      name: DemoPanelShowcase.name,
      showcases: {
        Scaffolded: DemoPanelShowcase.Scaffolded,
        InProgress: DemoPanelShowcase.InProgress,
        Shipped: DemoPanelShowcase.Shipped,
      },
    },
    {
      name: CellShowcase.name,
      showcases: {
        Land: CellShowcase.Land,
        Water: CellShowcase.Water,
        Mountain: CellShowcase.Mountain,
        PlayerOne: CellShowcase.PlayerOne,
        PlayerTwo: CellShowcase.PlayerTwo,
        PlayerOneCurrent: CellShowcase.PlayerOneCurrent,
      },
    },
    {
      name: ContentShowcase.name,
      showcases: {
        Grove: ContentShowcase.Grove,
        Nest: ContentShowcase.Nest,
        HomeTree: ContentShowcase.HomeTree,
      },
    },
    {
      name: UnitShowcase.name,
      showcases: {
        PlayerOneKinds: UnitShowcase.PlayerOneKinds,
        PlayerTwoKinds: UnitShowcase.PlayerTwoKinds,
      },
    },
    {
      name: CellInfoPanelShowcase.name,
      showcases: {
        Empty: CellInfoPanelShowcase.Empty,
        HomeTree: CellInfoPanelShowcase.HomeTree,
        BuildableRecruit: CellInfoPanelShowcase.BuildableRecruit,
        NeutralGrove: CellInfoPanelShowcase.NeutralGrove,
      },
    },
    {
      name: PlayableGameShowcase.name,
      showcases: {
        FullScreenHud: PlayableGameShowcase.FullScreenHud,
      },
    },
  ];
}
