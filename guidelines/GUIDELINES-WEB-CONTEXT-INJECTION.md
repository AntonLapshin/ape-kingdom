# Web Context Injection — Guidelines

Generic, reusable guidance for wiring **side effects** (API calls, auth,
local storage, any external interaction) into a React app through a single
React context, with a **real implementation** as the context default and a
**mock twin** for the Showcase/dev mode. This lets the UI be built and
demoed with zero backend, and lets any single side effect be swapped per
showcase.

---

## 1. The one rule

> **Nothing imports a side-effect function directly. Every side effect
> enters components through a single React context.**

A component, page, or showcase does:

```tsx
const { sendMessage } = useContext(ContextApp)
```

and **never** `import { sendMessage } from '../api/...'`. Direct
side-effect imports are allowed only inside the two context files.

The division of labor is strict:

> **Real pages use the real implementations; the Showcase uses mocks.**
> The app at `/` calls the real auth and the real API — they fail loudly
> until the backend exists. The Showcase is the mock e2e experience:
> `defaultValueMock` and per-showcase overrides give every screen a fully
> simulated, deterministic run with zero network. Simulation lives in
> `.mock.ts` files only, never in the real side-effect modules.

---

## 2. The two context files

### `src/context/ContextApp.tsx` — the real default

```tsx
export interface SideEffects {
  signIn: (opts?) => Promise<void>
  signOut: () => Promise<void>
  fetchAuthSession: () => Promise<AuthSession>
  sendMessage: (req) => Promise<ChatResult>
  fetchCredits: () => Promise<CreditsState>
  // ...
}

export const defaultValue: SideEffects = {
  signIn,
  signOut,
  fetchAuthSession,
  sendMessage: chatService.sendMessage,
  // ...
}

export const ContextApp = createContext(defaultValue)
```

- `createContext(defaultValue)` — the **real** implementation is the
  default, so the real app needs **no provider**.
- Services are created once at module scope (stateless beyond their local
  store); dependent services share the same store (e.g. the chat service
  shares the memory service so recall-at-send and saved-memories hit the
  same store).

### `src/context/ContextApp.mock.tsx` — the ready-made all-mock value

```tsx
export const defaultValueMock = {
  ...defaultValue,
  signIn: signInMock,
  signOut: signOutMock,
  sendMessage: chatServiceMock.sendMessage,
  // ...
}
```

- Every real method swapped for its **mock twin** (fake data + a short
  simulated latency, e.g. `await new Promise(r => setTimeout(r, 200))`).
- Showcases spread it and override only what their scenario needs.

---

## 3. The `.mock.ts` twin pattern

Each side effect is a **file pair**: the real implementation and a mock
twin.

- **Real file** (`src/api/chat.ts`): types, the real transport (e.g. an
  Amplify REST call authorized with the id token, unwrapped by a shared
  response helper), and a service factory. No simulated replies live here —
  the real transport fails loudly until the backend exists.
- **Mock twin** (`src/api/chat.mock.ts`): the mock service + the simulated
  logic (canned replies, keyword rules, a simulated ledger). Simulation
  lives in `.mock.ts` files **only**.

**Grouping rule:** one method per file + one mock twin per method — for
**network** side effects (auth, chat, any future API). A cohesive **local**
side effect (e.g. a memory service sharing a single storage adapter) may
group its methods in one file pair (`memory.ts` + `memory.mock.ts`) to
avoid a dozen near-empty files.

**E2E mocks:** for a scenario that needs two side effects wired over ONE
shared store (e.g. chat + credits where the chat is gated on the credits
bucket), a dedicated e2e mock factory (`creditsE2E.mock.ts`) wires them
together so the full loop works end to end. The interactive lab component
consumes it through the context; tests assert on the returned store/service
handles.

---

## 4. Rules

1. **Consume via `useContext(ContextApp)` only.** Never import a
   side-effect function directly; direct imports are allowed only inside
   `ContextApp.tsx` / `ContextApp.mock.tsx`.
2. **One method per file, one mock twin per method** — for network side
   effects. Adding a side effect means touching the real file, the `.mock.ts`
   file, `defaultValue`, and `defaultValueMock` together.
3. **Showcases inject.** A showcase wraps its component with
   `<ContextApp.Provider value={{ ...defaultValueMock, sendMessage: myMock }}>`
   to override exactly the side effects its scenario needs. The provider
   wrapper is scene-setting — allowed in a showcase file; the mock
   implementation itself is not (it belongs in the `.mock.ts` file).
4. **The real app uses the context default** — `createContext(defaultValue)`
   means no provider is needed outside showcases.

---

## 5. What counts as a side effect

Any external interaction: auth (sign-in, sign-out, session), API calls
(chat, credits, suggestions), and local persistent stores (memory, planner).
Each is a file pair with a real + mock twin, all exposed on the context.

Stateful logic that isn't a side effect (e.g. a conversation state machine)
stays **React-free** in its own module and is consumed by the page via
`useSyncExternalStore`; the page passes the context's `sendMessage` into it.

---

## 6. Worked example — a showcase injecting context

```tsx
function Demo({ startAuthed }: { startAuthed: boolean }) {
  const [authed, setAuthed] = useState(startAuthed)
  const value = {
    ...defaultValueMock,
    fetchAuthSession: async () => (authed ? AUTHED_SESSION : GUEST_SESSION),
    signIn: async () => {
      await new Promise((r) => setTimeout(r, 400))
      setAuthed(true)
    },
  }
  return (
    <ContextApp.Provider value={value}>
      {/* ...component... */}
    </ContextApp.Provider>
  )
}
```

This walks the whole auth guard (Login → Home) inside the showcase with
zero network.

---

## 7. Why this pattern

- **UI is built and demoed with zero backend.**
- **Any single side effect can be swapped per showcase** — deterministic,
  simulated scenarios.
- **Real pages fail loudly** until the backend exists, rather than silently
  degrading.
- The real implementation is the default, so production wiring is a
  no-op — no provider ceremony in the app.
