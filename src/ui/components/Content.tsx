import type { SiteKind } from "../../core/game";
import { SITE_LABELS } from "../presentation";

export interface ContentProps {
  /** Which site kind to render (Grove, Nest, or Home Tree). */
  kind: SiteKind;
}

/**
 * Thin, dumb `Content` atom component (M8-T3).
 *
 * Renders a single site content marker (Home Tree, Nest, Grove) as a small
 * labelled badge, extracted from the inline site label previously rendered in
 * `Board.tsx`. It is purely presentational — it receives the site kind as a
 * prop and renders the matching human-readable label via `SITE_LABELS`. No
 * hooks, no context, no side effects, no business logic.
 */
export function Content({ kind }: ContentProps) {
  return (
    <span
      data-testid="board-site"
      data-kind={kind}
      className="text-[10px] font-semibold leading-none text-text-body"
    >
      {SITE_LABELS[kind]}
    </span>
  );
}
