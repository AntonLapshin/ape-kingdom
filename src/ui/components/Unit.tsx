import type { ApeKind, ApeRank, PlayerId } from "../../core/game";
import { gameIcons } from "../../assets/icons";
import { apeKindIcon } from "../presentation";

export interface UnitProps {
  /** Which ape kind this unit is (Monkey, Gibbon, Chimpanzee, Gorilla). */
  kind: ApeKind;
  /** Combat strength / rank (1–4) of the ape kind. */
  rank: ApeRank;
  /** The player who owns this unit (drives the badge colour). */
  owner: PlayerId;
  /**
   * Whether the unit has already moved/fought this turn (M19-T6, #190).
   * When true the badge is rendered dimmed/opaque (reduced opacity + slight
   * desaturation) so the human can tell at a glance which units have already
   * acted; when false it renders normally. Purely presentational — the acted
   * state is derived by the view model from the core `hasActed` flag.
   */
  hasActed?: boolean;
}

/**
 * Thin, dumb `Unit` atom component (M8-T2).
 *
 * Renders a single ape unit badge showing its pixel-art icon (M16-T2, #111)
 * and rank on a small glass surface. Since M17-T3 the unit badge no
 * longer carries the "Kingdom" owner colour — ownership is expressed solely by
 * the hexagon (cell) that hosts the unit, so the badge is a neutral glass
 * chip that stays legible over any owner tint / terrain. The kind → icon-name
 * mapping is delegated to the pure `apeKindIcon` presentation helper, and the
 * icon URL is resolved via the `gameIcons` barrel — the component holds no
 * mapping logic. It is purely presentational — it receives the unit's kind,
 * rank, and owner as props and renders them. No hooks, no context, no side
 * effects, no business logic.
 */
export function Unit({ kind, rank, owner, hasActed = false }: UnitProps) {
  return (
    <span
      data-testid="board-unit"
      data-owner={owner}
      data-kind={kind}
      data-has-acted={hasActed ? "true" : "false"}
      className={`mt-0.5 flex flex-col items-center rounded-xl border border-line bg-panel/80 px-1 py-0.5 text-[10px] font-bold text-text-primary backdrop-blur-sm ${
        hasActed ? "opacity-40 grayscale" : ""
      }`}
    >
      <img
        src={gameIcons[apeKindIcon(kind)]}
        alt={`${kind} unit`}
        className="h-8 w-8 object-contain"
      />
      <span className="mt-0.5 leading-none">{rank}</span>
    </span>
  );
}
