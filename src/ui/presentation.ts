import type { GameAction } from "../core/ai";
import type { TurnStep } from "../core/gameSession";
import type { PlayerId } from "../core/game";

/**
 * Pure presentation helpers shared by the thin UI components.
 *
 * These functions/constants only shape core data into human-readable display
 * strings and geometry — no game rules, no business logic, no React. They are
 * kept out of the component files so the components stay pure and dumb (and
 * the fast-refresh lint rule stays happy). They are exported so they can be
 * unit-tested directly.
 */

/** A friendly display label for each turn step. */
export const STEP_LABELS: Record<TurnStep, string> = {
  income: "Income",
  recruit: "Recruit / Act",
  movefight: "Move / Fight",
  done: "Game Over",
};

/** A short display name for a player id. */
export function playerName(id: PlayerId): string {
  return id === "p1" ? "You" : "AI";
}

/** A short display label for each site kind. */
export const SITE_LABELS: Record<string, string> = {
  Grove: "Grove",
  Nest: "Nest",
  HomeTree: "Home Tree",
};

/**
 * Build a short human-readable label for a `GameAction` so the action
 * controls can show a friendly button. No game logic — just a text
 * description of an action descriptor.
 */
export function actionLabel(action: GameAction): string {
  switch (action.type) {
    case "collectIncome":
      return "Collect Income";
    case "recruit":
      return `Recruit ${action.kind} @ (${action.hex.q},${action.hex.r})`;
    case "move":
      return `Move (${action.unitHex.q},${action.unitHex.r}) → (${action.targetHex.q},${action.targetHex.r})`;
    case "attack":
      return `Attack (${action.attackerHex.q},${action.attackerHex.r}) → (${action.targetHex.q},${action.targetHex.r})`;
  }
}

/** The size (pointy-top hex "radius") of each board hex cell in pixels. */
export const HEX_SIZE = 44;

/** A CSS clip-path polygon that draws a pointy-top hexagon. */
export const HEX_CLIP =
  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";
/** Horizontal spacing between adjacent hex columns. */
const W = Math.sqrt(3) * HEX_SIZE;
/** Vertical spacing between hex rows. */
const H = 1.5 * HEX_SIZE;

/**
 * Convert axial hex coordinates (q, r) to a pixel offset used to absolutely
 * position the hex cell on the board. No game logic — just geometry.
 */
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: W * (q + r / 2), y: H * r };
}
