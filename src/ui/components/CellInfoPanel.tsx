import type { CellInfo } from "../../core/cellInfo";
import type { GameAction } from "../../core/ai";
import { SITE_LABELS, actionLabel, cellHexagonClass } from "../presentation";
import { Hexagon } from "./Hexagon";
import { Unit } from "./Unit";

export interface CellInfoPanelProps {
  /**
   * The derived display info for the selected hex (from the view model), or
   * null when no hex is selected so the panel shows an empty prompt.
   */
  info: CellInfo | null;
  /**
   * The legal actions the human may select this turn (from the view model).
   * The move/attack ones (which are not reachable through the selected-cell
   * recruit section) are listed here so the game stays fully playable now that
   * the bottom-right action list is replaced by the circular End Turn button
   * (M17-T2).
   */
  legalActions: GameAction[];
  /**
   * Select one legal action (delegates to the view model / core `selectAction`
   * flow).
   */
  onSelectAction: (action: GameAction) => void;
  /** Discard this turn's selections (delegates to the view model / core). */
  onClear: () => void;
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
export function CellInfoPanel({ info, onSelectAction, legalActions, onClear }: CellInfoPanelProps) {
  const nonRecruit = nonRecruitActions(legalActions);
  // The selected hexagon's owner: an owned site/unit colours the whole hexagon;
  // a hex with neither is neutral (keeps its terrain colour).
  const hexagonOwner =
    info?.site?.owner ?? info?.unit?.owner ?? null;

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
          <p className="text-xs capitalize text-text-muted">{info.terrain}</p>
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

      {/* Actionable cells list recruit items with their cost; read-only cells
          show no action buttons. */}
      {info.actions.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Recruit here
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {info.actions.map((item) => (
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

      {/* The turn's non-recruit legal actions (move / attack / collect-income)
          plus Clear, moved here from the old bottom-right ActionControls so
          the game stays fully playable while the bottom-right corner shows
          only the circular End Turn button (M17-T2). Recruits are
          already listed per selected hex above, so only the other action types
          are shown here to avoid duplicate recruit buttons. This section is
          always visible so the player can reach move/attack actions and Clear
          even before selecting a hex. */}
      {nonRecruit.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Your actions
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {nonRecruit.map((action, i) => (
              <button
                key={i}
                type="button"
                data-testid="action-button"
                onClick={() => onSelectAction(action)}
                className="btn-action rounded-md border border-line-strong bg-panel px-3 py-1.5 text-left text-xs text-text-primary transition hover:border-accent hover:bg-accent-soft"
              >
                {actionLabel(action)}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="clear-actions"
            onClick={onClear}
            className="btn-action rounded-md border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-text-body transition hover:bg-accent-soft"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Pure presentation filter: the non-recruit legal actions (move / attack /
 * collect-income) for the current turn. Recruit actions are excluded because
 * they are already offered per-selected-hex in the "Recruit here" section
 * above, so they are not duplicated here. Not game logic — just a UI grouping.
 */
function nonRecruitActions(actions: GameAction[]): GameAction[] {
  return actions.filter((a) => a.type !== "recruit");
}
