import type { ApeKind, ApeRank, PlayerId } from "../../core/game";

export interface UnitProps {
  /** Which ape kind this unit is (Monkey, Gibbon, Chimpanzee, Gorilla). */
  kind: ApeKind;
  /** Combat strength / rank (1–4) of the ape kind. */
  rank: ApeRank;
  /** The player who owns this unit (drives the badge colour). */
  owner: PlayerId;
}

/**
 * Thin, dumb `Unit` atom component (M8-T2).
 *
 * Renders a single ape unit badge (kind + rank) coloured by its owner,
 * extracted from the inline badge previously rendered in `Board.tsx`. It is
 * purely presentational — it receives the unit's kind, rank, and owner as
 * props and renders them. No hooks, no context, no side effects, no business
 * logic.
 *
 * The owner colour maps to the brand palette tokens (rose → violet brand
 * family), per GUIDELINES-WEB-THEME.md — no raw Tailwind palettes.
 */
export function Unit({ kind, rank, owner }: UnitProps) {
  return (
    <span
      data-testid="board-unit"
      data-owner={owner}
      className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-inverted ${
        owner === "p1" ? "bg-brand-rose-deep" : "bg-brand-violet-deep"
      }`}
    >
      {kind} {rank}
    </span>
  );
}
