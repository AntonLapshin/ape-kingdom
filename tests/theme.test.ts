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

describe("src/styles/index.css — frosted-glass HUD surface (M14-T1/#96)", () => {
  it("defines the translucent frosted-glass `glass` utility backed by glass tokens", () => {
    // The `glass` surface is the translucent frosted-glass utility the
    // floating HUD panels use. It must pull its translucent fill, border and
    // inner highlight from the `--color-glass*` token family (no raw color)
    // and provide a backdrop blur so the glassmorphism reads over the map.
    const glass = STYLES.match(/@utility glass\s*\{([^}]*)\}/)?.[1];
    expect(glass).toBeTruthy();
    expect(glass).toContain("var(--color-glass)");
    expect(glass).toContain("var(--color-glass-line)");
    expect(glass).toContain("var(--color-glass-inner)");
    expect(glass).toMatch(/backdrop-filter\s*:/);
    expect(glass).toMatch(/-webkit-backdrop-filter\s*:/);
  });

  it("uses a translucent glass fill so the glassmorphism is visible over the map", () => {
    // The HUD needs the frosted-glass effect visible over the map (per the
    // glass-design polish #94), which requires a genuinely translucent fill
    // (`glass`) rather than the near-opaque content sheet (`glass-panel`).
    expect(THEME).toContain("--color-glass: rgba(251, 247, 244, 0.72);");
    // glass-panel stays available for the heavy primary-content sheet, but
    // the HUD panels must not use it (they use `glass`, asserted below).
    expect(THEME).toContain("--color-glass-panel:");
  });

  it("floats the HUD panels on the token-backed translucent glass surface", () => {
    // The floating HUD panels (status, cell-info, actions) in PlayableGame
    // must carry the token-backed `glass` frosted surface — the acceptance
    // criterion that the panels use a tokenized frosted-glass surface with no
    // raw hex in the component.
    const GAME = readFileSync(
      resolve(ROOT, "src/ui/components/PlayableGame.tsx"),
      "utf8",
    );
    const overlayCards = [
      /className="glass menu-pop pointer-events-auto rounded-2xl p-4"/g,
      /className="glass menu-pop pointer-events-auto w-72 rounded-2xl p-4"/g,
    ];
    // Three floating HUD panels (status, cell-info, actions) use the glass
    // surface: count the two distinct glass card class strings.
    let glassCards = 0;
    for (const re of overlayCards) {
      glassCards += (GAME.match(re) || []).length;
    }
    expect(glassCards).toBe(3);
    expect(GAME).not.toMatch(/className="glass-panel/);
  });
});

describe("src/theme.css + index.css — palette & visual-detail refinement (M14-T3/#97)", () => {
  it("keeps the semantic token roles intact (all layer-2 roles still defined)", () => {
    // The palette refinement must strengthen the brand family without
    // renaming/removing any semantic role token — a re-skinable cohesive set.
    for (const token of LAYER2_TOKENS) {
      expect(THEME, `missing semantic role token ${token}`).toContain(`${token}:`);
    }
  });

  it("refines the brand + parchment palette into a cohesive warm set", () => {
    // The three brand hues are tuned to share a warm undertone and balanced
    // lightness (amber → rose → violet ramp), and the warm neutrals (canvas /
    // text-muted / text-faint) are harmonized to the same family. The roles
    // keep their names; only the concrete values are refined.
    expect(THEME).toContain("--color-brand-amber: #eda25c;");
    expect(THEME).toContain("--color-brand-rose: #da838a;");
    expect(THEME).toContain("--color-brand-rose-deep: #b25868;");
    expect(THEME).toContain("--color-brand-violet-deep: #6d4da8;");
    expect(THEME).toContain("--color-canvas: #fcd3a8;");
    // The stage dark stops follow the refined brand ramp so the bg gradient
    // matches the board/panel family.
    expect(THEME).toContain("--color-stage-dark-start: #b25868;");
    expect(THEME).toContain("--color-stage-dark-mid: #6d4da8;");
  });

  it("adds the hover-elevation + focus ring tokens and re-exposes them", () => {
    // New tokens drive the visual-detail polish: a hover shadow for the
    // control lift and a warm focus ring. Both must be in the token set and
    // re-exposed to Tailwind via `@theme inline` (their mapping to the CSS
    // variable must match, like every other token).
    for (const token of ["--color-shadow-hover", "--color-ring"]) {
      expect(THEME, `missing token ${token}`).toContain(`${token}:`);
      expect(THEME, `${token} not in @theme inline`).toMatch(
        new RegExp(`${token}:\\s*var\\(${token}\\)`),
      );
    }
  });

  it("lifts action buttons on hover with the shadow-hover + accent border tokens", () => {
    // Visual detail: the hover/transition states of the controls. The button
    // hover must reference the new `--color-shadow-hover` (token) and the
    // accent border — no raw colors — and the pressed/disabled states must
    // stay token-free of raw values.
    const btn = STYLES.match(/\.btn-action\s*\{([^}]*)\}/)?.[1];
    const hover = STYLES.match(
      /\.btn-action:hover:not\(:disabled\)\s*\{([^}]*)\}/,
    )?.[1];
    const focus = STYLES.match(
      /\.btn-action:focus-visible\s*\{([^}]*)\}/,
    )?.[1];
    expect(btn).toBeTruthy();
    expect(hover).toBeTruthy();
    expect(hover).toContain("var(--color-shadow-hover)");
    expect(hover).toContain("var(--color-accent)");
    expect(focus).toBeTruthy();
    expect(focus).toContain("var(--color-ring)");
  });

  it("shares the warm focus ring with keyboard-focussed hex cells", () => {
    // The hex cells get the same cohesive focus treatment so keyboard focus
    // matches the buttons — no raw colors, token only.
    const focus = STYLES.match(
      /\.hex-cell:focus-visible\s*\{([^}]*)\}/,
    )?.[1];
    expect(focus).toBeTruthy();
    expect(focus).toContain("var(--color-ring)");
  });

  it("gives the primary content sheet a layered, more polished shadow", () => {
    // Visual detail: the glass-panel surface now stacks a soft contact shadow
    // under a deeper ambient one (still token-driven) for a more cohesive,
    // flatter-feeling float.
    const panel = STYLES.match(/@utility glass-panel\s*\{([^}]*)\}/)?.[1];
    expect(panel).toBeTruthy();
    // Two distinct shadow drops on separate lines = layered shadow.
    const drops = (panel as string).match(/0 \d+px \d+px var\(--color-shadow\)/g) || [];
    expect(drops.length).toBeGreaterThanOrEqual(2);
  });

  it("adds no raw colors to the playable UI components", () => {
    // The refinement must not introduce raw hex into components (m4 rule).
    // The components only reference existing token-based utilities.
    const GAME = readFileSync(
      resolve(ROOT, "src/ui/components/PlayableGame.tsx"),
      "utf8",
    );
    expect(GAME).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("src/theme.css + index.css — game-backdrop gradients & animation polish (M14-T2/#98)", () => {
  it("defines token-backed game-backdrop gradient stops and re-exposes them", () => {
    // The game-view background needs its own subtle gradient stop tokens in
    // theme.css (the only file allowed to hold literal colors), which are
    // then re-exposed to Tailwind via `@theme inline` like every other token.
    const stops = [
      "--color-game-bg-top",
      "--color-game-bg-mid",
      "--color-game-bg-bottom",
    ];
    for (const token of stops) {
      expect(THEME, `missing game-bg token ${token}`).toContain(`${token}:`);
      expect(THEME, `${token} not in @theme inline`).toMatch(
        new RegExp(`${token}:\\s*var\\(${token}\\)`),
      );
    }
  });

  it("renders the game backdrop as a token-driven subtle gradient utility", () => {
    // The game-view background must be a `.game-bg` utility whose gradient
    // draws from the `--color-game-bg-*` token stops (no raw hex / rgba),
    // with a smooth transition so re-skins fade instead of snapping.
    const bg = STYLES.match(/\.game-bg\s*\{([^}]*)\}/)?.[1];
    expect(bg).toBeTruthy();
    expect(bg).toContain("var(--color-game-bg-top)");
    expect(bg).toContain("var(--color-game-bg-mid)");
    expect(bg).toContain("var(--color-game-bg-bottom)");
    expect(bg).toMatch(/linear-gradient\(/);
    expect(bg).toMatch(/transition/);
  });

  it("adds panel entrance/exit keyframes and classes", () => {
    // Animation polish: floating panels should have both a smooth entrance
    // (`menu-in`) and exit (`menu-out`) so entering/exiting feels
    // intentional. The keyframes and the classes that reference them must be
    // present.
    expect(STYLES).toMatch(/@keyframes menu-in\s*\{/);
    expect(STYLES).toMatch(/@keyframes menu-out\s*\{/);
    const cls = STYLES.match(/\.menu-in\s*\{([^}]*)\}/)?.[1];
    const out = STYLES.match(/\.menu-out\s*\{([^}]*)\}/)?.[1];
    expect(cls).toBeTruthy();
    expect(out).toBeTruthy();
    expect(cls).toMatch(/animation:\s*menu-in/);
    expect(out).toMatch(/animation:\s*menu-out/);
  });

  it("applies the token backdrop to the game route and keeps components raw-color-free", () => {
    // The game route must switch to the token-driven `game-bg` backdrop
    // (not the showcase `login-bg`), and the app root must stay free of raw
    // hex so the gradient stops live only in theme.css.
    const APP = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
    expect(APP).toMatch(/game-bg/);
    expect(APP).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("keeps index.css free of raw hex for the new backdrop rules", () => {
    // New gradient/backdrop rules must reference tokens only (the global
    // no-raw-hex rule already guards this, re-asserted here per the M14-T2
    // requirement that no raw hex appears in the backdrop/animation CSS).
    expect(STYLES).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(STYLES).not.toMatch(/rgba?\(/);
  });
});
