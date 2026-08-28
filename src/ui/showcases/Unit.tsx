import { Unit } from "../components/Unit";

/**
 * Showcase demos for the `Unit` atom component (M8-T2).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 *
 * Since M16-T2 (#111) each `Unit` renders its pixel-art ape icon instead of a
 * text badge, so the demos below show the four kinds with their image assets.
 */
export const name = "Unit";

/** The four ape kinds, each owned by p1. (The unit badge is a neutral glass
    chip — ownership is shown only by the host hexagon, M17-T3.) */
export const PlayerOneKinds = () => (
  <div className="flex flex-wrap gap-2">
    <Unit kind="Monkey" rank={1} owner="p1" />
    <Unit kind="Gibbon" rank={2} owner="p1" />
    <Unit kind="Chimpanzee" rank={3} owner="p1" />
    <Unit kind="Gorilla" rank={4} owner="p1" />
  </div>
);

/** The four ape kinds, each owned by p2. */
export const PlayerTwoKinds = () => (
  <div className="flex flex-wrap gap-2">
    <Unit kind="Monkey" rank={1} owner="p2" />
    <Unit kind="Gibbon" rank={2} owner="p2" />
    <Unit kind="Chimpanzee" rank={3} owner="p2" />
    <Unit kind="Gorilla" rank={4} owner="p2" />
  </div>
);

/** Neutral guardian units (owner null, M30-T5 #234) render distinctly — a
    neutral taupe tint plus a "Neutral" label — so they read apart from the
    p1/p2 units above and from the neutral Groves/Nests site markers. */
export const NeutralGuardians = () => (
  <div className="flex flex-wrap gap-2">
    <Unit kind="Monkey" rank={1} owner={null} />
    <Unit kind="Gibbon" rank={2} owner={null} />
    <Unit kind="Chimpanzee" rank={3} owner={null} />
    <Unit kind="Gorilla" rank={4} owner={null} />
  </div>
);
