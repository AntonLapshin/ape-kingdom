import type { SiteKind } from "../../core/game";
import { gameIcons } from "../../assets/icons";
import { SITE_LABELS, siteKindIcon } from "../presentation";

export interface ContentProps {
  /** Which site kind to render (Grove, Nest, or Home Tree). */
  kind: SiteKind;
}

/**
 * Thin, dumb `Content` atom component (M8-T3).
 *
 * Renders a single site content marker (Home Tree, Nest, Grove). The site
 * kinds that have a dedicated pixel-art icon (Home Tree, Monkey Nest) render
 * that image via the `gameIcons` barrel (M16-T2, #111); Grove has no asset in
 * the icon set, so it falls back to its text label via `SITE_LABELS`. The
 * kind → icon-name mapping is delegated to the pure `siteKindIcon`
 * presentation helper — the component holds no mapping logic. It is purely
 * presentational — it receives the site kind as a prop and renders it. No
 * hooks, no context, no side effects, no business logic.
 */
export function Content({ kind }: ContentProps) {
  const icon = siteKindIcon(kind);
  if (icon !== null) {
    return (
      <img
        src={gameIcons[icon]}
        alt={`${SITE_LABELS[kind]} site`}
        data-testid="board-site"
        data-kind={kind}
        className="h-8 w-8 object-contain"
      />
    );
  }
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
