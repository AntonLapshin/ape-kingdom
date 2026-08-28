import type { CellInfo } from "../../core/cellInfo";
import type { GameAction } from "../../core/ai";
import {
  SITE_LABELS,
  cellHexagonClass,
  cellOwner,
  legalRecruitActions,
  terrainLabel,
} from "../presentation";
import { Hexagon } from "./Hexagon";
import { Unit } from "./Unit";

export interface CellInfoPanelProps {
  /**
   * The derived display info for the selected hex (from the view model), or
   * null when no hex is selected so the panel shows an empty prompt.
   */
  info: CellInfo | null;
  /**
   * The legal actions the human may select this turn (from the view model),
   * used only to filter which recruit items are genuinely legal this turn step
   * (issue 123).
   */
  legalActions: GameAction[];
  /**
   * Select one legal action (delegates to the view model / core `selectAction`
   * flow).
   */
  onSelectAction: (action: GameAction) => void;
}

/**
 * Thin, dumb info/action panel component (M10-T3).
 *
 * Renders the read-only details of the currently selected board hex (terrain,
 * site with income, unit with rank and recruit cost) and, when the selected
 * cell is actionable this turn (a legal recruit/placement hex for the current
 * player), lists the available recruit action items with their banana cost as
 * buttons wired to the `onSelectAction` callback. Read-only cells show no
 * action buttons.
 *
 * It is purely presentational — it renders the `info` props it is given and
 * calls `onSelectAction`. No business logic, no hooks, no side effects.
 *
 * Since M17-T3 the panel leads with a hexagonal preview of the exact
 * selected hexagon — its correct cell colour (owner tint / terrain) and,
 * when the hex is occupied, the unit badge it hosts — instead of the
 * previous "Water / Land" terrain pill.
 */
export function CellInfoPanel({ info, onSelectAction, legalActions }: CellInfoPanelProps) {
  /**
   * The recruit items that are actually selectable this turn step (issue 123). The
   * derived `info.actions` come from `cellInfo` → `legalActions(state)`, which
   * include recruits in every turn step. But the session's step-filtered
   * `legalActions` prop (its `legalMoves`) exclude recruits once the player has
   * moved/fought (the `movefight` step). Clicking a recruit button that is not
   * in `legalMoves` made `selectAction` throw an uncaught `GameSessionError`
   * that crashed the app. So only offer the recruit items that are genuinely
   * legal this turn — otherwise the section is hidden and read-only info shown.
   */
  const recruitActions = legalRecruitActions(info?.actions ?? [], legalActions);
  // The selected hexagon's owner: an owned site persists as a territory even
  // when empty, so the site owner always wins; else persistent site-less
  // territory (retained after a unit vacates, M24-T2 / issue 160) colours the
  // hex; a unit's owner only colours a site-less hex that is not yet recorded
  // as territory (M19-T1). A hex with none of these is neutral.
  const hexagonOwner = cellOwner(
    info?.site ?? null,
    info?.unit ?? null,
    info?.territoryOwner ?? null,
  );

  return (
    <div data-testid="cell-info" className="space-y-2">
      {!info && (
        <div className="text-sm text-text-muted">
          Click a hex to inspect it.
        </div>
      )}

      {info && (
        <>
      {/* The selected hex coordinates, its terrain, and a hexagonal preview of
          the exact hexagon currently selected (M17-T3): the correct
          cell colour (owner tint / terrain) plus the unit badge it hosts, so
          the selector shows what is actually on the board. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Hex ({info.hex.q}, {info.hex.r})
          </p>
          {/* The selected cell's terrain as a clear, consistent label
              (M32-T2 / issue 227): a mountain shows "Mountain", a water cell
              "Water", and a plain cell reads as "Land" (no fake terrain).
              Pure presentation via `terrainLabel` — no game logic. */}
          <p
            data-testid="cell-info-terrain"
            className="text-xs font-medium text-text-muted"
          >
            {terrainLabel(info.terrain)}
          </p>
        </div>
        <Hexagon
          bgClass={cellHexagonClass(hexagonOwner, info.terrain)}
          size={88}
          testId="cell-info-hexagon"
        >
          {info.unit && (
            <Unit
              kind={info.unit.kind}
              rank={info.unit.rank}
              owner={info.unit.owner}
            />
          )}
        </Hexagon>
      </div>

      {/* Read-only info: site, then unit. */}
      {info.site && (
        <div
          data-testid="cell-info-site"
          className="flex items-center justify-between rounded-md bg-panel-strong px-3 py-1.5 text-sm"
        >
          <span className="text-text-primary">
            {SITE_LABELS[info.site.kind] ?? info.site.kind}
            {info.site.owner === null && (
              <span className="ml-2 text-xs text-text-muted">neutral</span>
            )}
          </span>
          <span className="text-text-body">🍌 +{info.site.income}/turn</span>
        </div>
      )}

      {info.unit && (
        <div
          data-testid="cell-info-unit"
          className="flex items-center justify-between rounded-md bg-panel-strong px-3 py-1.5 text-sm"
        >
          <span className="text-text-primary">
            {info.unit.kind} (rank {info.unit.rank})
          </span>
          <span className="text-text-body">🍌 {info.unit.cost}</span>
        </div>
      )}

      {/* Actionable cells list the recruit items that are legal this turn
          step with their cost (filtered against the session's step-filtered
          legal actions, so no recruit is offered once the player has
          moved/fought — issue 123); read-only cells show no action buttons. */}
      {recruitActions.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Recruit here
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {recruitActions.map((item) => (
              <button
                key={item.kind}
                type="button"
                data-testid="cell-action-button"
                onClick={() => onSelectAction(item.action)}
                className="btn-action flex items-center justify-between rounded-md border border-line-strong bg-panel px-3 py-1.5 text-left text-xs text-text-primary transition hover:border-accent hover:bg-accent-soft"
              >
                <span>{item.kind}</span>
                <span className="text-text-body">🍌 {item.cost}</span>
              </button>
            ))}
          </div>
        </div>
      ) : info.unit === null && info.site === null ? (
        <p className="border-t border-line pt-2 text-xs text-text-muted">
          Nothing here.
        </p>
      ) : null}
        </>
      )}
    </div>
  );
}
