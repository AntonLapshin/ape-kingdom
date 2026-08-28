import type { ApeKind, ApeRank, PlayerId } from "../../core/game";
import { gameIcons } from "../../assets/icons";
import {
  apeKindIcon,
  isNeutralUnitBadge,
  NEUTRAL_UNIT_BADGE_BG,
  NEUTRAL_UNIT_LABEL,
} from "../presentation";

export interface UnitProps {
  /** Which ape kind this unit is (Monkey, Gibbon, Chimpanzee, Gorilla). */
  kind: ApeKind;
  /** Combat strength / rank (1–4) of the ape kind. */
  rank: ApeRank;
  /** The player who owns this unit, or null for a neutral unit (drives the badge colour). */
  owner: PlayerId | null;
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
 *
 * A **neutral** unit (owner `null`, M30-T5 #234) is rendered distinctly: the
 * badge takes a soft neutral taupe tint (`NEUTRAL_UNIT_BADGE_BG`, selected by
 * the pure `isNeutralUnitBadge` helper — no logic here) and gains a
 * `NEUTRAL_UNIT_LABEL` tag, so the ownership-neutral guardian reads apart from
 * p1/p2 units and from the neutral Groves/Nests site markers.
 */
export function Unit({ kind, rank, owner, hasActed = false }: UnitProps) {
  const neutral = isNeutralUnitBadge(owner);
  return (
    <span
      data-testid="board-unit"
      data-owner={owner}
      data-kind={kind}
      data-has-acted={hasActed ? "true" : "false"}
      data-neutral={neutral ? "true" : "false"}
      className={`mt-0.5 flex flex-col items-center rounded-xl border border-line px-1 py-0.5 text-[10px] font-bold text-text-primary backdrop-blur-sm ${
        neutral ? NEUTRAL_UNIT_BADGE_BG : "bg-panel/80"
      } ${hasActed ? "opacity-40 grayscale" : ""}`}
    >
      <img
        src={gameIcons[apeKindIcon(kind)]}
        alt={`${kind} unit`}
        className="h-8 w-8 object-contain"
      />
      {neutral && (
        <span
          data-testid="board-unit-neutral-label"
          className="mt-0.5 leading-none text-[9px] font-semibold uppercase tracking-wide text-text-muted"
        >
          {NEUTRAL_UNIT_LABEL}
        </span>
      )}
      <span className="mt-0.5 leading-none">{rank}</span>
    </span>
  );
}
