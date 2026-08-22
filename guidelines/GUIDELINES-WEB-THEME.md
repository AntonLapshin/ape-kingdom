# Web Theme Implementation — Guidelines

Generic, reusable guidance for implementing a design-token theming system in
a React + Tailwind CSS v4 project. The system separates **theme-independent
brand tokens** from **theme (semantic) tokens**, and re-exposes both to
Tailwind so components use semantic utilities (`bg-panel`,
`text-text-primary`, `border-line`) instead of raw colors.

---

## 1. The two-layer token model

All colors come from design tokens in a single `src/theme.css`. There are
two layers:

### Layer 1 — Theme-independent (the raw brand palette)
Never changes between themes. This is the brand's identity:

- the brand tri-gradient family (e.g. amber → rose → violet),
- the accent family,
- semantic state colors (`success` / `danger` / `premium`),
- any dark surface's own palette,
- pure neutrals (`white` / `black` / `inverted`),
- any fixed brand asset palette (e.g. an avatar/illustration palette).

### Layer 2 — Theme (semantic roles)
Maps a UI role onto a concrete color:

- `canvas` (page background), `panel`, `line`,
- text roles (`text-primary`, `text-body`, `text-muted`, `text-faint`,
  `text-on-accent`),
- shadows (`shadow`, `shadow-accent`, `shadow-input`),
- frosted-glass surfaces (`glass*`),
- `stage` (a backdrop),
- dark gradient stops.

**Only this layer should change** when a theme is added or the look is
re-skinned. Components must reference these, never raw hex.

---

## 2. File structure

- **`src/theme.css`** — the token definitions. The only file allowed to
  hold literal color values.
- **`src/index.css`** — the Tailwind entry. Imports `theme.css`, then
  defines reusable **utilities** (`@utility`) that reference tokens via
  `var(--color-…)`. It may hold literal values only inside token-referencing
  utilities and keyframes.
- **Components / pages / showcases** — reference tokens only via Tailwind
  utilities; never raw colors.

---

## 3. Defining tokens (`src/theme.css`)

Tokens are declared as CSS custom properties on `:root`, grouped by layer:

```css
@import "tailwindcss";

/* ---- 1. Theme-independent base palette ---- */
:root {
  --color-brand-amber: #e8b06c;
  --color-accent: #c06b3e;
  --color-success: #4a8a5e;
  --color-danger: #c05c4a;
  --color-white: #fff;
  --color-black: #000;
  --color-inverted: #fff;
  /* ... */
}

/* ---- 2. Theme (semantic) tokens ---- */
:root {
  --color-canvas: #ffd7ae;
  --color-panel: #fbf7f4;
  --color-line: #f0e9e3;
  --color-text-primary: #4d3a2a;
  --color-text-muted: #a08b7c;
  --color-shadow: rgba(120, 80, 70, 0.12);
  /* ... */
}

/* ---- Theme-independent, non-color tokens ---- */
:root {
  --radius-control: 0.75rem;
}
```

---

## 4. Exposing tokens to Tailwind (`@theme inline`)

Both layers are re-exposed to Tailwind via `@theme inline` so they become
usable utilities:

```css
@theme inline {
  --color-brand-amber: var(--color-brand-amber);
  --color-canvas: var(--color-canvas);
  --color-panel: var(--color-panel);
  --color-line: var(--color-line);
  --color-text-primary: var(--color-text-primary);
  /* ... every token ... */
}
```

This makes them usable as utilities: `bg-panel`, `text-text-primary`,
`border-line`, `text-accent`, `bg-dark-canvas`, `ring-white/60`,
`bg-stage`, `shadow-[0_18px_50px_var(--color-shadow)]`.

The `inline` keyword keeps the utility pointing at the CSS variable, so a
theme swap that redefines `--color-panel` re-skins the whole app without
touching any component.

---

## 5. Reusable utilities (`src/index.css`)

Design-system surfaces are defined as Tailwind v4 `@utility` rules so they
participate in the engine (variants like `hover:`/`active:` work, and
they're only emitted when used):

```css
@utility glass {
  background: var(--color-glass);
  border: 1px solid var(--color-glass-line);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 8px 24px var(--color-shadow), inset 0 1px 0 var(--color-glass-inner);
}
```

Common surface utilities: `glass`, `glass-strong`, `glass-soft`,
`glass-dark`, `glass-panel` (the big content sheet), `glass-input`
(recessed input well), `surface` (solid warm surface).

`index.css` also holds page-level keyframes and animation classes
(`.login-bg`, `.orb`, `.btn-shine`, `.menu-pop`, custom scrollbars, etc.),
all referencing tokens via `var(--color-…)`.

---

## 6. Rules

1. **Never use raw colors in components, pages, or showcases** — no hex
   (`#fff`), no `rgba(...)`, and no default Tailwind palettes (`slate-*`,
   `indigo-*`). Every color is a token.
2. `white` / `black` are themselves tokens (`--color-white` /
   `--color-black`), so `bg-white`, `text-white`, `ring-white/60`,
   `border-white/50` etc. are token-backed and allowed. For white
   text/icons on a colored surface use `text-inverted`.
3. A fixed brand asset (e.g. an avatar illustration) is theme-independent:
   its colors are the theme-independent `avatar-*`-style tokens.
4. **The only files that may hold literal color values** are `theme.css`
   (token definitions) and `index.css` (utilities that reference tokens via
   `var(--color-…)`).

---

## 7. Adding a theme

To add a new theme or re-skin:

1. Add a new block of semantic token overrides (a `[data-theme="dark"]` or
   `.dark` selector redefining the `--color-*` semantic variables).
2. Leave the theme-independent layer untouched.
3. Because every component references semantic utilities, the re-skin
   applies everywhere with zero component changes.

The two-layer split is what makes this cheap: the brand identity is fixed,
the semantic mapping is swappable.
