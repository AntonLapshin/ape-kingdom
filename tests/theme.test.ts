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

  it("turns the hexagon's inner glass edge blue when the cell is selected (M32-T1/#221)", () => {
    // Issue #214 item 1 / #221: the selected cell's hexagon inner border (the
    // `.hex-glass-edge` outline that surrounds the hexagon) must render blue,
    // distinct from the unselected white glass rim. The rule is a descendant
    // of the selected shell and must draw from the blue selection token — no
    // raw color — while the unselected `.hex-glass-edge` keeps its white glass
    // line token (asserted by the M18-T3 test above).
    const inner = STYLES.match(
      /\.hex-cell\.hex-selected\s+\.hex-glass-edge\s*\{([^}]*)\}/,
    )?.[1];
    expect(inner).toBeTruthy();
    expect(inner).toContain("stroke: var(--color-selection)");
    expect(inner).toContain("var(--color-selection)");
    expect(inner).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(inner).not.toMatch(/rgba?\(/);
  });

  it("keeps the unselected hexagon inner edge on the white glass token (M32-T1/#221)", () => {
    // An unselected cell must keep its current white glass edge (M18-T3). The
    // base `.hex-glass-edge` rule still draws from `--color-glass-line`; only
    // the selected descendant flips it to blue.
    const edge = STYLES.match(/\.hex-glass-edge\s*\{([^}]*)\}/)?.[1];
    expect(edge).toBeTruthy();
    expect(edge).toContain("var(--color-glass-line)");
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
    // The floating HUD panels (status, cell-info) in PlayableGame must carry
    // the token-backed `glass` frosted surface — the acceptance criterion that
    // the panels use a tokenized frosted-glass surface with no raw hex in the
    // component. The bottom-right corner is now the standalone circular End
    // Turn button (M17-T2), not a glass panel card (issue 113-2), so only the
    // two card-based panels remain.
    const GAME = readFileSync(
      resolve(ROOT, "src/ui/components/PlayableGame.tsx"),
      "utf8",
    );
    const overlayCards = [
      /className="glass menu-pop pointer-events-auto rounded-2xl p-4"/g,
      /className="glass menu-pop pointer-events-auto w-72 rounded-2xl p-4"/g,
    ];
    // Two floating HUD panels (status, cell-info) use the glass surface: count
    // the two distinct glass card class strings. The bottom-right corner hosts
    // the circular End Turn button (a native button) instead of a third card.
    let glassCards = 0;
    for (const re of overlayCards) {
      glassCards += (GAME.match(re) || []).length;
    }
    expect(glassCards).toBe(2);
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

describe("src/theme.css + index.css — cell & terrain overhaul (M17-T3/#116)", () => {
  it("defines a dark board canvas token exposed to Tailwind", () => {
    // The map canvas behind the surrounding ocean is dark (close to black),
    // expressed as the `--color-board-dark` semantic token so the board layer
    // can use `bg-board-dark`.
    expect(THEME).toContain("--color-board-dark:");
    expect(THEME).toMatch(
      /--color-board-dark:\s*var\(--color-board-dark\)/,
    );
    const darkMatch = THEME.match(/--color-board-dark:\s*(#[0-9a-fA-F]{3,8})\s*;?/);
    const dark = darkMatch?.[1] ?? "";
    expect(dark).toBeTruthy();
    // A dark (near-black) backdrop: its numeric intensity is low.
    const r = parseInt(dark.slice(1, 3), 16);
    const g = parseInt(dark.slice(3, 5), 16);
    const b = parseInt(dark.slice(5, 7), 16);
    expect(Math.max(r, g, b)).toBeLessThanOrEqual(0x28);
  });

  it("defines a neutral green default land colour token", () => {
    // The default neutral land is a neutral green (M17-T3/#116).
    const landMatch = THEME.match(/--color-terrain-land:\s*(#[0-9a-fA-F]{3,8})\s*;?/);
    const land = landMatch?.[1] ?? "";
    expect(land).toBeTruthy();
    // Green-dominant: G channel exceeds R and B.
    const r = parseInt(land.slice(1, 3), 16);
    const g = parseInt(land.slice(3, 5), 16);
    const b = parseInt(land.slice(5, 7), 16);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("defines a distinct neutral-owner tint token for neutral unit badges (M30-T5/#234)", () => {
    // The neutral guardian badge needs its own semantic tint token so it reads
    // apart from p1/p2 units. It must be defined as a real colour and
    // re-exposed to Tailwind via @theme inline.
    const tintMatch = THEME.match(/--color-owner-neutral:\s*(#[0-9a-fA-F]{3,8})\s*;?/);
    const tint = tintMatch?.[1] ?? "";
    expect(tint).toBeTruthy();
    expect(THEME).toMatch(
      /--color-owner-neutral:\s*var\(--color-owner-neutral\)/,
    );
    // A desaturated warm taupe — distinct from the soft rose (p1) and violet
    // (p2) owner tints, and not a green like the terrain-land below.
    const r = parseInt(tint.slice(1, 3), 16);
    const g = parseInt(tint.slice(3, 5), 16);
    const b = parseInt(tint.slice(5, 7), 16);
    expect(Math.max(r, g, b)).toBeGreaterThan(150);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(100);
  });

  it("provides a glass hexagon treatment in index.css", () => {
    // Both the board cells and the selector panel hexagon preview use a glass
    // effect (`.hex-glass`) backed only by tokens.
    expect(STYLES).toMatch(/\.hex-glass\s*\{/);
    expect(STYLES).toMatch(/var\(--color-glass-inner\)/);
  });
});

describe("src/styles/index.css — SVG hexagon glass edge (M18-T3/#125)", () => {
  it("defines a token-backed glass-edge highlight for the SVG hexagon layer", () => {
    // The new SVG hexagon render (M18-T3) draws a glass edge along the true
    // hexagon edges. The `.hex-glass-edge` rule must reference only tokens
    // (no raw color) and render an outline-style stroke that reads as a rim.
    const edge = STYLES.match(/\.hex-glass-edge\s*\{([^}]*)\}/)?.[1];
    expect(edge).toBeTruthy();
    expect(edge).toContain("var(--color-glass-line)");
    expect(edge).toContain("var(--color-glass-inner)");
    expect(edge).toContain("stroke");
    expect(edge).toContain("fill: none");
    expect(edge).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(edge).not.toMatch(/rgba?\(/);
  });

  it("keeps index.css free of raw hex for the new SVG glass-edge rules", () => {
    // Global guard: the new SVG glass-edge / hexagon-svg rules add no raw
    // color, consistent with the token-only theme model.
    expect(STYLES).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(STYLES).not.toMatch(/rgba?\(/);
  });
});

/* ------------------------------------------------------------------ */
/* End Turn button frosted-glass polish (M29-T1 / #186)               */
/* ------------------------------------------------------------------ */
describe("src/styles/index.css — End Turn frosted-glass effect (M29-T1/#186)", () => {
  it("applies a translucent accent-tinted frosted fill via color-mix tokens", () => {
    // The .end-turn-btn disc must layer its warm accent fill over the `glass`
    // backdrop blur as a translucent surface (so the map shows through as
    // genuine frosted glass) rather than an opaque flat disc. The translucency
    // is expressed with `color-mix` over the `--color-accent*` and
    // `--color-glass-soft` tokens — no raw hex / rgba.
    const btn = STYLES.match(/\.end-turn-btn\s*\{([^}]*)\}/)?.[1];
    expect(btn).toBeTruthy();
    expect(btn).toMatch(/linear-gradient\(/);
    expect(btn).toMatch(/color-mix\(in srgb, var\(--color-accent\)/);
    expect(btn).toMatch(/var\(--color-glass-soft\)/);
  });

  it("keeps the bordered-rim highlight and soft accented shadow, token-only", () => {
    // A subtle border highlight plus a soft inner highlight / accented drop
    // shadow complete the glass edge — all referencing tokens, no raw colors.
    const btn = STYLES.match(/\.end-turn-btn\s*\{([^}]*)\}/)?.[1];
    expect(btn).toContain("var(--color-glass-line)");
    expect(btn).toContain("var(--color-glass-inner)");
    expect(btn).toContain("var(--color-shadow-accent)");
    expect(btn).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(btn).not.toMatch(/rgba?\(/);
  });

  it("distinguishes the frosted End Turn disc from the plain glass utility", () => {
    // Acceptance criterion: the effect is clearly visible — not just the plain
    // `glass` class alone. The .end-turn-btn rule must carry its own
    // translucent accent-tinted glass layer (color-mix + glass-soft) on top of
    // the generic `glass` surface, and must pull the glassy inner highlights.
    const btn = STYLES.match(/\.end-turn-btn\s*\{([^}]*)\}/)?.[1];
    expect(btn).toMatch(/color-mix\(in srgb, var\(--color-accent\)/);
    expect(btn).toMatch(/var\(--color-accent-strong\)/);
    expect(btn).toContain("var(--color-glass-inner)");
    // The End Turn button component must continue to carry the `glass` surface
    // so the backdrop blur applies (readers clearly visible glassmorphism).
    const BUTTON = readFileSync(
      resolve(ROOT, "src/ui/components/EndTurnButton.tsx"),
      "utf8",
    );
    expect(BUTTON).toMatch(/glass\b/);
    expect(BUTTON).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});


/* ------------------------------------------------------------------ */
/* Brightened fog-of-war shroud (M32-T3 / #241)                       */
/* ------------------------------------------------------------------ */
describe("src/theme.css — brightened fog-of-war shroud (M32-T3/#241)", () => {
  // Acceptance criterion: the --color-fog token must be a clear grayish/silver
  // tone — visibly lighter than the old #1a1e24 near-black — while still
  // clearly distinct from revealed land (#7f9d6b green) and water (#4e6f86
  // blue) so fog still reads as hidden.

  const fogMatch = THEME.match(/--color-fog:\s*(#[0-9a-fA-F]{3,8})\s*;/);
  const fog = fogMatch?.[1] ?? "";

  it("defines a concrete fog token re-exposed to Tailwind", () => {
    expect(fog).toBeTruthy();
    expect(THEME).toMatch(/--color-fog:\s*var\(--color-fog\)/);
  });

  it("is visibly lighter (brighter) than the old near-black shroud", () => {
    // Grayish/silver: channels are approximately equal (a muted, low-chroma
    // gray rather than a saturated green/blue like the terrain tokens).
    const r = parseInt(fog.slice(1, 3), 16);
    const g = parseInt(fog.slice(3, 5), 16);
    const b = parseInt(fog.slice(5, 7), 16);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    expect(spread).toBeLessThan(20);
    // Brighter than the old shroud: peak channel clears #1a1e24's peak (0x24)
    // by a wide margin so the cells no longer read as a near-black void.
    expect(Math.max(r, g, b)).toBeGreaterThan(0x24 + 0x2a);
  });

  it("stays clearly distinct from revealed land and water", () => {
    // Land (#7f9d6b) is green-dominant, water (#4e6f86) blue-dominant; the
    // fog gray must read apart from both — its chromatic spread stays low
    // while land's and water's stay high.
    const land = THEME.match(/--color-terrain-land:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
    const water = THEME.match(/--color-terrain-water:\s*(#[0-9a-fA-F]{3,8})\s*;/)?.[1];
    const spread = (hex: string) =>
      Math.max(
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ) -
      Math.min(
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      );
    const fogSpread = spread(fog);
    expect(land && spread(land)).toBeGreaterThan(fogSpread);
    expect(water && spread(water)).toBeGreaterThan(fogSpread);
  });
});

/* ------------------------------------------------------------------ */
/* Neutral-gray text palette (M32-T4 / #240)                          */
/* ------------------------------------------------------------------ */
describe("src/theme.css — neutral-gray text roles (M32-T4/#240)", () => {
  // The four ordered text roles (primary > body > muted > faint) must read as
  // neutral grays — no warm cocoa/brown cast — while keeping the same
  // relative luminance hierarchy so heading/body/muted hierarchy still reads.

  // Extract each role's hex value and its relative luminance, and assert the
  // role is a *neutral* gray (R === G === B, i.e. no chromatic/warm cast).
  it("uses neutral gray (achromatic) text roles with the hierarchy intact", () => {
    const luminances: number[] = [];
    for (const role of ["primary", "body", "muted", "faint"]) {
      const key = `--color-text-${role}`;
      const m = THEME.match(new RegExp(`${key}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
      expect(m, `missing ${key}`).toBeTruthy();
      const hex = (m as RegExpMatchArray)[1];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Neutral gray: channels are equal (no warm/chromatic cast). Allow a
      // tiny ±1 tolerance so a near-neutral gray isn't rejected.
      expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
      expect(Math.abs(r - b)).toBeLessThanOrEqual(1);
      // Relative luminance of the gray (sRGB-linearized).
      const c = r / 255;
      const lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      luminances.push(0.2126 * lin + 0.7152 * lin + 0.0722 * lin);
    }
    // Hierarchy preserved: primary is darkest, faint is lightest, and each
    // successive role is lighter than the previous one.
    expect(luminances[0]).toBeLessThan(luminances[1]);
    expect(luminances[1]).toBeLessThan(luminances[2]);
    expect(luminances[2]).toBeLessThan(luminances[3]);
  });

  it("keeps on-accent / inverted text light so contrast on accent surfaces holds", () => {
    // The light-on-accent role must remain a near-white (high-luminance) so
    // text on the accent/strong surfaces keeps readable contrast — unchanged
    // by the neutralization.
    const m = THEME.match(/--color-text-on-accent:\s*(#[0-9a-fA-F]{3,8})\s*;?/);
    expect(m, "missing --color-text-on-accent").toBeTruthy();
    const hex = (m as RegExpMatchArray)[1];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Near-white: every channel is high (>= 0xE0).
    expect(r).toBeGreaterThanOrEqual(0xe0);
    expect(g).toBeGreaterThanOrEqual(0xe0);
    expect(b).toBeGreaterThanOrEqual(0xe0);
  });
});
