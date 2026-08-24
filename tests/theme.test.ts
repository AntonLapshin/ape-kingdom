import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural tests for the design-token theme system (M5-T1).
 *
 * The theme system is pure CSS infrastructure (no runtime logic), so the
 * "tests" here verify the two-layer token model and the Tailwind wiring
 * directly against the source files. This makes the acceptance criteria for
 * issue #31 testable:
 *   - `src/theme.css` is the only file allowed to hold literal colors.
 *   - `src/styles/index.css` imports it, defines reusable `@utility` surfaces,
 *     and references tokens via `var(--color-…)` (no raw hex).
 *   - Tokens are re-exposed to Tailwind via `@theme inline`.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const THEME = readFileSync(resolve(ROOT, "src/theme.css"), "utf8");
const STYLES = readFileSync(resolve(ROOT, "src/styles/index.css"), "utf8");

/** A layer-1 (theme-independent) token that must be defined in theme.css. */
const LAYER1_TOKENS = [
  "--color-brand-amber",
  "--color-brand-rose",
  "--color-brand-violet",
  "--color-accent",
  "--color-success",
  "--color-danger",
  "--color-premium",
  "--color-white",
  "--color-black",
  "--color-inverted",
];

/** A layer-2 (semantic) token that must be defined in theme.css. */
const LAYER2_TOKENS = [
  "--color-canvas",
  "--color-panel",
  "--color-line",
  "--color-text-primary",
  "--color-text-body",
  "--color-text-muted",
  "--color-text-faint",
  "--color-text-on-accent",
  "--color-shadow",
  "--color-shadow-accent",
  "--color-glass",
  "--color-glass-strong",
  "--color-glass-soft",
  "--color-glass-dark",
  "--color-glass-panel",
  "--color-stage",
  "--color-stage-dark-start",
  "--color-stage-dark-mid",
  "--color-stage-dark-end",
];

describe("src/theme.css — two-layer token model", () => {
  it("defines the theme-independent brand palette (layer 1)", () => {
    for (const token of LAYER1_TOKENS) {
      expect(THEME, `missing layer-1 token ${token}`).toContain(`${token}:`);
    }
  });

  it("defines the semantic role tokens (layer 2)", () => {
    for (const token of LAYER2_TOKENS) {
      expect(THEME, `missing layer-2 token ${token}`).toContain(`${token}:`);
    }
  });

  it("defines the blue selection-highlight tokens (M13-T3/#90)", () => {
    // The selected-hex ring must use a dedicated blue selection token family
    // instead of the amber brand token, so the selected cell reads clearly.
    for (const token of ["--color-selection", "--color-selection-soft"]) {
      expect(THEME, `missing selection token ${token}`).toContain(`${token}:`);
    }
  });

  it("re-exposes every token to Tailwind via @theme inline", () => {
    expect(THEME).toContain("@theme inline");
    for (const token of [...LAYER1_TOKENS, ...LAYER2_TOKENS]) {
      // The @theme inline block maps the Tailwind theme name to the CSS var.
      expect(THEME, `token ${token} not re-exposed in @theme inline`).toMatch(
        new RegExp(`${token}:\\s*var\\(${token}\\)`),
      );
    }
  });
});

describe("src/styles/index.css — reusable surfaces & keyframes", () => {
  it("imports the theme tokens", () => {
    expect(STYLES).toContain('@import "../theme.css"');
  });

  it("defines the reusable surface utilities", () => {
    for (const util of [
      "glass",
      "glass-strong",
      "glass-soft",
      "glass-dark",
      "glass-panel",
      "glass-input",
      "surface",
    ]) {
      expect(STYLES, `missing @utility ${util}`).toContain(`@utility ${util}`);
    }
  });

  it("references tokens via var(--color-…) and uses no raw hex", () => {
    // Every rule in index.css must reference tokens by variable; no literal
    // hex / rgba colors are allowed outside token definitions.
    expect(STYLES).toMatch(/var\(--color-/);
    expect(STYLES).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(STYLES).not.toMatch(/rgba?\(/);
  });
});

describe("src/styles/index.css — selected-hex blue border (M13-T3/#90)", () => {
  it("uses the blue selection tokens (not amber) for the selected hex border", () => {
    // The .hex-selected rule must draw its border from the blue selection
    // token family, and must no longer reference the amber brand token that
    // was previously used.
    const selected = STYLES.match(/\.hex-cell\.hex-selected\s*\{([^}]*)\}/)?.[1];
    expect(selected).toBeTruthy();
    expect(selected).toContain("var(--color-selection)");
    expect(selected).toContain("var(--color-selection-soft)");
    expect(selected).not.toMatch(/brand-amber/);
  });

  it("uses the blue selection tokens in the combined current+selected case", () => {
    // The hex-current.hex-selected combination is updated to match: blue
    // selection ring (plus the accent current-territory outer ring).
    const combined = STYLES.match(
      /\.hex-cell\.hex-current\.hex-selected\s*\{([^}]*)\}/,
    )?.[1];
    expect(combined).toBeTruthy();
    expect(combined).toContain("var(--color-selection)");
    expect(combined).toContain("var(--color-selection-soft)");
    expect(combined).not.toMatch(/brand-amber/);
  });
});
