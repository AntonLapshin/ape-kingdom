import { Cell } from "../components/Cell";

/**
 * Showcase demos for the `Cell` atom component (M8-T1).
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

/** A neutral (unowned) terrain cell. */
export const Neutral = () => (
  <Stage>
    <Cell q={0} r={0} owner={null} x={0} y={0} />
  </Stage>
);

/** A p1-owned cell. */
export const PlayerOne = () => (
  <Stage>
    <Cell q={0} r={0} owner="p1" x={0} y={0} />
  </Stage>
);

/** A p2-owned cell. */
export const PlayerTwo = () => (
  <Stage>
    <Cell q={0} r={0} owner="p2" x={0} y={0} />
  </Stage>
);

/** A p1-owned cell highlighted as the current player's territory. */
export const PlayerOneCurrent = () => (
  <Stage>
    <Cell q={0} r={0} owner="p1" isCurrent x={0} y={0} />
  </Stage>
);
