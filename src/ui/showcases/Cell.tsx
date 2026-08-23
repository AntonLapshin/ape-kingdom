import { Cell } from "../components/Cell";

/**
 * Showcase demos for the `Cell` atom component (M8-T1, M9-T3).
 *
 * Each named export is a tiny render function showing the component in one
 * state. There is no component implementation or business logic here — only
 * imports plus the scene-setting render functions. The `name` constant is the
 * display name shown in the Showcase sidebar.
 *
 * The `Cell` is absolutely positioned, so each demo is staged inside a
 * relatively-positioned wrapper sized to the hex dimensions.
 */
export const name = "Cell";

/** A stage wrapper providing the relative positioning context the absolute hex needs. */
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="relative h-24 w-24">{children}</div>
);

/** A land terrain cell (the default). */
export const Land = () => (
  <Stage>
    <Cell q={0} r={0} owner={null} terrain="land" x={0} y={0} />
  </Stage>
);

/** A water terrain cell. */
export const Water = () => (
  <Stage>
    <Cell q={0} r={0} owner={null} terrain="water" x={0} y={0} />
  </Stage>
);

/** A mountain terrain cell. */
export const Mountain = () => (
  <Stage>
    <Cell q={0} r={0} owner={null} terrain="mountain" x={0} y={0} />
  </Stage>
);

/** A p1-owned land cell. */
export const PlayerOne = () => (
  <Stage>
    <Cell q={0} r={0} owner="p1" terrain="land" x={0} y={0} />
  </Stage>
);

/** A p2-owned land cell. */
export const PlayerTwo = () => (
  <Stage>
    <Cell q={0} r={0} owner="p2" terrain="land" x={0} y={0} />
  </Stage>
);

/** A p1-owned land cell highlighted as the current player's territory. */
export const PlayerOneCurrent = () => (
  <Stage>
    <Cell q={0} r={0} owner="p1" terrain="land" isCurrent x={0} y={0} />
  </Stage>
);
