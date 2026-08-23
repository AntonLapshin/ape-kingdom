import { PlayableGame } from "../components/PlayableGame";

/**
 * Showcase demos for the full-screen playable game composition (M11-T3 / #76).
 *
 * `PlayableGame` is the composition/page layer that wires the `useGameSession`
 * view model to the dumb board / action / status components and floats the
 * info panels over the full-screen map. This demo stages the real component at
 * full viewport so reviewers can see the polished floating HUD (token
 * `glass-panel` surfaces + `menu-pop` animation) over the full-screen board.
 *
 * Each named export is a tiny render function showing the screen in one state.
 * There is no component implementation or business logic here — only imports
 * plus the scene-setting render functions. The `name` constant is the display
 * name shown in the Showcase sidebar.
 */
export const name = "PlayableGame";

/** The full-screen playable HUD: floating panels over the full-viewport board. */
export const FullScreenHud = () => <PlayableGame />;
