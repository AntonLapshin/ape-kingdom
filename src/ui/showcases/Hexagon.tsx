import { Hexagon } from "../components/Hexagon";
import { Unit } from "../components/Unit";

/**
 * Showcase demos for the `Hexagon` atom component (M17-T3, #116).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 */
export const name = "Hexagon";

/** A stage wrapper providing the relative-positioning look of the dark board. */
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-board-dark">
    {children}
  </div>
);

/** A neutral land hexagon. */
export const Land = () => (
  <Stage>
    <Hexagon bgClass="bg-terrain-land" />
  </Stage>
);

/** A water hexagon. */
export const Water = () => (
  <Stage>
    <Hexagon bgClass="bg-terrain-water" />
  </Stage>
);

/** A mountain hexagon. */
export const Mountain = () => (
  <Stage>
    <Hexagon bgClass="bg-terrain-mountain" />
  </Stage>
);

/** A p1-owned hexagon. */
export const PlayerOne = () => (
  <Stage>
    <Hexagon bgClass="bg-owner-p1" />
  </Stage>
);

/** A p2-owned hexagon. */
export const PlayerTwo = () => (
  <Stage>
    <Hexagon bgClass="bg-owner-p2" />
  </Stage>
);

/** A p1-owned hexagon hosting a Monkey unit badge (preview style). */
export const WithUnit = () => (
  <Stage>
    <Hexagon bgClass="bg-owner-p1" size={88}>
      <Unit kind="Monkey" rank={1} owner="p1" />
    </Hexagon>
  </Stage>
);
