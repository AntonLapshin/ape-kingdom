import { PlayableGame } from "../components/PlayableGame";

/**
 * Showcase demo for the full-screen playable HUD (M11-T3).
 *
 * `PlayableGame` is the thin composition page that wires the full-screen map,
 * drag-to-pan, wheel zoom, click-to-select, movement, and the floating
 * overlay HUD panels (status, cell info, action controls) together. Issue
 * #76 (M11-T3) asks for a full-screen board / floating HUD demo, so this
 * showcase stages the complete playable overlay so reviewers can inspect the
 * polished HUD over the full-screen board.
 *
 * Each named export is a tiny render function showing the full HUD in one
 * starting state (via the deterministic AI seed). There is no component
 * implementation or business logic here — only imports plus scene-setting
 * render functions. The `name` constant is the display name shown in the
 * Showcase sidebar.
 */
export const name = "PlayableGame";

/** The full-screen board with all floating HUD panels, seeded opening game. */
export const FullScreenHud = () => <PlayableGame aiSeed={0} />;

/** The same full-screen HUD with a different deterministic seed. */
export const FullScreenHudSeedSeven = () => <PlayableGame aiSeed={7} />;
