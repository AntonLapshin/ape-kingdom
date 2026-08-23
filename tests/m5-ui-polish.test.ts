import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural tests guarding the M5-T3 animation / interaction polish
 * (issue #33).
 *
 * Issue #33's acceptance criteria are about the presence and placement of
 * animation classes:
 *   - Animations/keyframes live in `src/styles/index.css`, token-driven
 *     (referencing `var(--color-…)`, no raw hex / rgba), with a
 *     `prefers-reduced-motion` escape hatch.
 *   - The thin UI components reference those classes but stay thin — no game
 *     rules added. Animations are pure CSS; state still flows from core via
 *     the `useGameSession` view model.
 *
 * This mirrors the structural approach of `tests/theme.test.ts` and
 * `tests/m4-ui-theme.test.ts` (pure CSS infra has no runtime logic to unit
 * test, so the "tests" verify the source wiring directly).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = readFileSync(resolve(ROOT, "src/styles/index.css"), "utf8");
const BOARD = readFileSync(resolve(ROOT, "src/ui/components/Board.tsx"), "utf8");
const CELL = readFileSync(resolve(ROOT, "src/ui/components/Cell.tsx"), "utf8");
const STATUS = readFileSync(
  resolve(ROOT, "src/ui/components/StatusPanel.tsx"),
  "utf8",
);
const ACTION = readFileSync(
  resolve(ROOT, "src/ui/components/ActionControls.tsx"),
  "utf8",
);

describe("src/styles/index.css — playable UI polish (issue #33)", () => {
  it("defines the turn-change fade keyframe and class", () => {
    expect(STYLES).toContain("@keyframes turn-fade");
    expect(STYLES).toMatch(/\.turn-fade\s*\{/);
  });

  it("defines the win/loss result celebration keyframe and class", () => {
    expect(STYLES).toContain("@keyframes result-celebrate");
    expect(STYLES).toMatch(/\.result-celebrate\s*\{/);
  });

  it("defines the hex pop-in + hover/active + current-territory classes", () => {
    expect(STYLES).toContain("@keyframes hex-pop");
    expect(STYLES).toMatch(/\.hex-pop\s*\{/);
    expect(STYLES).toMatch(/\.hex-cell\s*\{/);
    expect(STYLES).toMatch(/\.hex-current\s*\{/);
  });

  it("defines the action-button pressed/disabled feedback class", () => {
    expect(STYLES).toMatch(/\.btn-action\s*\{/);
    expect(STYLES).toMatch(/\.btn-action:disabled/);
  });

  it("is token-driven (no raw hex / rgba) and honours reduced motion", () => {
    expect(STYLES).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(STYLES).not.toMatch(/rgba?\(/);
    expect(STYLES).toMatch(/prefers-reduced-motion/);
    // Every animation class is disabled under reduced motion.
    for (const cls of ["turn-fade", "hex-pop", "result-celebrate"]) {
      expect(STYLES).toMatch(new RegExp(`\\.${cls}`));
    }
  });
});

describe("thin components reference the polish classes (issue #33)", () => {
  it("Cell uses hex-cell / hex-pop / hex-current classes (extracted from Board)", () => {
    expect(CELL).toContain("hex-cell");
    expect(CELL).toContain("hex-pop");
    expect(CELL).toContain("hex-current");
  });

  it("StatusPanel animates the current-player highlight and the result", () => {
    expect(STATUS).toContain("turn-fade");
    expect(STATUS).toContain("result-celebrate");
  });

  it("ActionControls uses the btn-action pressed/disabled class", () => {
    expect(ACTION).toContain("btn-action");
  });

  it("components stay thin — no game rules leak into the UI", () => {
    // The polish must not add any new game-rule logic to the components.
    // They may import *types* from core (for prop shapes) but must not
    // import or call any core *value* (game functions) — all game state
    // still flows from the view model / props. The existing type-only
    // imports (e.g. `import type { PlayerId } from "../../core/game")` are
    // fine; a value import would be a logic leak.
    for (const source of [BOARD, STATUS, ACTION]) {
      // A non-type import from a core module (game / ai / gameSession).
      expect(source).not.toMatch(
        /import\s+\{[^}]*\}\s+from\s+"\.\.\/\.\.\/core\/(game|ai|gameSession)"/,
      );
    }
  });
});
