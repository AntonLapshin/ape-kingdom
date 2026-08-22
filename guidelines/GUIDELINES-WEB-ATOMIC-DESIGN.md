# Web Atomic Design & Showcases — Guidelines

Generic, reusable guidance for structuring a React + TypeScript + Tailwind
web client around a strict **Atoms → Molecules → Pages** architecture, with
a hand-rolled **Showcase** component browser (a self-contained Storybook
substitute) that demos every component. Project-agnostic: swap the example
component names for your own.

---

## 1. The one rule: components in `components/`, demos in `showcase/`

- **`src/components/` is the only place component source code lives — and
  it is flat:** every component is a top-level file directly in
  `src/components/` (`Button.tsx`, `ChatBar.tsx`). No per-component
  subfolders, no `avatar/` nesting. If a component is real, reusable UI
  (a button, an input bar, an avatar), its implementation goes in
  `src/components/` — never in a showcase file.
- **Showcase files are demo scenarios, not source code.** A file in
  `src/showcase/showcases/` contains nothing but imports plus tiny render
  functions that show the component in a state. Think of it like a
  Storybook story: `export const Primary = () => <Button>Primary</Button>`.
- If a showcase needs more than a couple of lines of markup to set a scene
  (a stage, a gradient backdrop, a wrapper), that's fine — but as soon as
  something looks like *component implementation* (props handling,
  variants, real UI structure the app itself would use), it belongs in
  `src/components/` and the showcase imports it.
- **Pages** (`src/pages/`) compose components into screens. A page may own
  state and logic — the components it renders stay pure presentation. A
  showcase file may import a page to demo it.
- **Never import from `src/showcase/` inside `src/components/`.**
  Dependencies point one way: `components ← pages ← showcases ← the Showcase page`.

---

## 2. The three-layer architecture

Every file in `src/components/` is tagged with a comment (`// Atom:`,
`// Molecule:`, or `// Lab —` for demo labs) so the layer is
self-documenting.

### Atom — pure presentation
- No hooks, no context, no side effects.
- Dumb display/event props.
- Examples: `Button`, `Input`, `NameChip`, `MessageBubble`, `Spinner`.

### Molecule — pure structural composition
- Composes atoms and exposes **slots** (`ReactNode`).
- Uses **no hooks, no context, no side effects**.
- Shells (`PageLayout`, `Panel`, `ChatPanel`) are **headless**: they expose
  slots, not prop-drilled props.
- Examples: `Header`, `ChatPanel`, `ChatComposer`, `UserMenu`, `SuggestionRow`.

### Hook — shared stateful/side-effectful logic a page consumes
- Lives in `src/hooks/*.ts`.
- Examples: `useChatBar`, `useUserMenu`, `useSignOut`.

### Page — the only layer that uses context hooks / side effects / state
- The **source of truth for logic**: it wires molecules, injects atoms into
  their slots, and owns state.
- Examples: `Home`, `Login`, `Planner`.

---

## 3. Rules

1. **No prop drilling through shells** — pass **slots** (`ReactNode`), not
   `userName`/`onSignOut`/`navItems` chains.
2. **Atoms never import context or call hooks.**
3. **Molecules never use context hooks / side effects / state**, and never
   import other molecules — they compose atoms + slots only.
4. **Pages are the source of truth for logic:** they use context hooks,
   wire molecules, and inject atoms into molecule slots.
5. **Reusable chrome becomes its own molecule** (e.g. `Header`) — don't
   inline it per page.
6. **Duplicated logic → extract a hook** (page-consumed) or a component.
7. **Every component in `src/components/` has a showcase** in
   `src/showcase/showcases/<Name>.tsx` registered in `showcase.tsx`.

**Stateful components get split:** a pure structural molecule + a
page-consumed hook. E.g. `UserMenu` renders from `useUserMenu`'s `open`
state; `ChatComposer` renders from `useChatBar`'s text state.

---

## 4. The Showcase page (`src/showcase/showcase.tsx`)

The component browser is a **hand-rolled, in-repo** tool — deliberately not
Storybook (the external tool), with no dependency on it. It is called
**Showcase** and its entries are **showcases**; never refer to it as
"Storybook."

It renders a 2×2 grid (sidebar header / breadcrumbs / nav list / canvas)
and:

- reads the selection from the URL query (`?file=..&showcase=..`) via
  `use-state-in-url`, so showcases are **deep-linkable** and browser
  back/forward steps through selections,
- lists registered showcase files in a collapsible sidebar,
- renders the selected showcase component in the canvas.

Registration is manual: a `showcaseFiles` array of `{ meta, showcases }`
where `meta.name` is the display name and `showcases` is a map of named
render functions.

---

## 5. Adding a showcase (two steps)

For a component like `Button`:

1. Create `src/showcase/showcases/Button.tsx`:

```tsx
import { Button } from '../../components/Button'

// meta.name is the display name shown in the sidebar
export const meta = { name: 'Button' }

// every other export is a showcase: name it, render the component in that state
export const Primary = () => <Button>Primary</Button>
export const Secondary = () => <Button variant="secondary">Secondary</Button>
```

2. Register it in `src/showcase/showcase.tsx`:

```tsx
import { meta as MetaButton, Primary, Secondary } from './showcases/Button'

const showcaseFiles: ShowcaseFile[] = [
  { meta: MetaButton, showcases: { Primary, Secondary } },
]
```

Then open `/showcase`, expand the component, and click a showcase to render
it.

### Showcase scene-setting patterns

- **Stage wrappers:** a component that fills its flex parent is staged in a
  sized flex box: `const Stage = ({ children }) => <div className="flex h-[440px] w-80 flex-col">{children}</div>`.
- **Stateful demos:** use `useState` inside the showcase file for
  interactive scenarios (append a message on click, toggle typing). Reply
  timing / simulated replies are *scene-setting* — the real conversation
  engine lives in the app and is driven by the page.
- **Slots are caller-owned:** showcase a molecule's slot flexibility by
  swapping different children into the same slot (e.g. a custom footer, a
  custom suggestion row) to prove the shell is truly headless.
- **Context injection:** a showcase wraps its scene in
  `<ContextApp.Provider value={...}>` to override exactly the side effects
  its scenario needs (see the context-injection guidelines). The provider
  wrapper is scene-setting — allowed in a showcase file; the mock
  implementation itself is not (it belongs in the `.mock.ts` file).
- **Fresh mock per mount:** an interactive e2e showcase creates a fresh
  mock inside `useState(() => createE2EMock(...))` so leaving and
  re-entering resets the demo.

---

## 6. Code conventions

- **Never use default exports — ever.** Every module uses named exports
  only (`export function Button(...)`, `import { Button } from './Button'`).
  The single exception is `vite.config.ts`, where Vite requires
  `export default defineConfig`.
- Always import explicitly by name — `import { Name } from '...'`, never
  `import Name from '...'`.

---

## 7. Project structure recap

```
src/
  api/          # network side effects (real + .mock.ts twins)
  auth/         # auth side effect (real + .mock.ts twins) + AuthGuard
  memory/       # local side effect (real + .mock.ts twins)
  components/   # component SOURCE CODE, flat at the top level
  context/      # ContextApp (the single side-effect door)
  config/       # static, tunable content
  hooks/        # shared page-consumed hooks
  pages/        # page-level composition (the only stateful layer)
  showcase/
    showcase.tsx    # the Showcase page — registers + renders
    showcases/      # one thin demo file per component
  utils/        # pure helpers
  App.tsx       # routes
  main.tsx      # entry point
```
