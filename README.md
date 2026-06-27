# Illinois Jim and the Shrine of Catastrophe

A mobile-first 2D side-scroll platformer and mine-cart arcade adventure. Original IP — Jim is an
intrepid explorer, not a cinematic reference. Guide him through crumbling temple levels, crack your
whip, ride mine-cart rails, and survive the shrine.

**Live:** http://jonbogaty.com/illinois-jim-and-the-shrine-of-catastrophe/

---

## What it is

Tile-based side-scrolling platformer with gravity, swept AABB collision, variable-height jumps,
coyote time, jump buffering, and mine-cart rail segments. The game runs in a browser (GitHub Pages,
PWA-installable) and ships as an Android APK via Capacitor. Touch controls are first-class; keyboard
works on desktop.

---

## Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Run left / right | Virtual d-pad (left zone) | Arrow keys or A / D |
| Jump | Jump button (right zone) | Space, Z, or K |
| Whip | Whip button (right zone) | X, J, or Left Shift |
| Crouch / ladder | D-pad down | S or Arrow Down |

Touch input and keyboard are merged each frame — both work simultaneously.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 8, TypeScript 6 |
| UI / HUD | SolidJS (fine-grained reactivity, no VDOM) |
| Mobile native | Capacitor 8 (Android) |
| Linter / formatter | Biome 2 |
| Unit tests | Vitest 4 (Node, pure sim) |
| Browser tests | Vitest 4 + @vitest/browser-playwright (real Chromium) |
| E2E tests | Playwright 1.61 |
| Release automation | release-please v5 |
| Package manager | pnpm 9 |

---

## Project layout

```
src/
  sim/          Pure deterministic TypeScript — math, physics, world, player, input model
  engine/       Browser glue — clock, RNG facade, input adapters, viewport scaler, game loop
  render/       Canvas 2D renderer (camera projection + interpolation)
  audio/        Web Audio engine + procedural SFX bank
  ui/           SolidJS App + HUD components + engine→HUD signal bridge
tests/
  unit/         Node tests for pure sim + engine (99 tests)
  browser/      Chromium tests for renderer + audio (23 tests)
  e2e/          Playwright form-factor tests (phone / tablet / desktop)
.github/
  workflows/
    ci.yml      lint → typecheck → unit tests → browser tests → build
    release.yml release-please PR + Android APK build + attestation
    cd.yml      GitHub Pages deploy on push to main
```

---

## Running locally

Requires Node ≥ 20 and pnpm 9.

```bash
pnpm install
pnpm dev          # Vite dev server at http://localhost:5173
pnpm build        # Production build → dist/
pnpm preview      # Serve the dist/ build locally
```

## Testing

```bash
pnpm test               # Unit tests (Node, fast)
pnpm test:browser       # Browser tests (Chromium via Playwright)
pnpm test:e2e           # Playwright end-to-end
pnpm typecheck          # tsc --noEmit across all tsconfigs
pnpm lint               # Biome lint
```

## Android

```bash
pnpm cap:add:android    # One-time: scaffold android/ directory
pnpm build && pnpm cap:sync
pnpm cap:run:android    # Build and run on a connected device / emulator
```

---

## Contributing

See [AGENTS.md](AGENTS.md) for architecture boundaries, determinism rules, commit conventions, and
the test gate requirements before opening a PR.
