import type { PlayerId } from "../../core/game";
import { gameIcons } from "../../assets/icons";

export interface GraveProps {
  /**
   * The kingdom that owned the dead unit this grave marks (drives the
   * `data-owner` attribute for legibility/testing). Purely presentational —
   * the owner is derived by the view model from the core grave marker.
   */
  owner: PlayerId;
}

/**
 * Thin, dumb `Grave` atom component (M21-T2, #191).
 *
 * Renders a single grave marker: the pixel-art Grave icon on a small glass
 * surface, shown on the cell where a bankrupt kingdom's unit died. It is
 * purely presentational — it receives the grave's owning kingdom as a prop and
 * renders the icon via the `gameIcons` barrel (no mapping logic). No hooks, no
 * context, no side effects, no business logic.
 */
export function Grave({ owner }: GraveProps) {
  return (
    <span
      data-testid="board-grave"
      data-owner={owner}
      className="mt-0.5 flex flex-col items-center rounded-xl border border-line bg-panel/80 px-1 py-0.5 text-[10px] font-bold text-text-primary backdrop-blur-sm"
    >
      <img
        src={gameIcons.grave}
        alt="Grave"
        className="h-8 w-8 object-contain"
      />
      <span className="mt-0.5 leading-none">👻</span>
    </span>
  );
}
