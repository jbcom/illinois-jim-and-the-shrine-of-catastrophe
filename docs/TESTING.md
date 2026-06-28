---
title: Testing Strategy
updated: 2026-06-28
status: current
domain: quality
---

# Testing Strategy

Three tiers of tests, each covering a distinct concern. The gate rules in
`.claude/gates.json` tie tier requirements to source paths so the right tests
run for every change.

---

## Tier 1 — Unit tests (Node, pure sim)

**Location:** `tests/unit/`
**Runner:** `vitest run --project unit`
**Command:** `pnpm test`

These tests run in Node (no browser, no DOM). They cover every module in
`src/sim/**` and the pure sub-modules of `src/engine/**`:

| Test file | Module(s) covered |
|---|---|
| `vec2.test.ts` | `src/sim/math/vec2.ts` |
| `collide.test.ts` | `src/sim/physics/aabb.ts`, `src/sim/physics/collide.ts` |
| `level.test.ts` | `src/sim/world/level.ts`, `src/sim/world/tilemap.ts` |
| `camera.test.ts` | `src/sim/world/camera.ts` |
| `player.test.ts` | `src/sim/player/player.ts`, `src/sim/player/tuning.ts` |
| `touchModel.test.ts` | `src/sim/input/touchModel.ts` |
| `ecs.test.ts` | `src/sim/ecs/traits.ts`, `src/sim/ecs/systems.ts` — physics, combat, scoring, pots |
| `gameMachine.test.ts` | `src/ui/gameMachine.ts` — FSM state transitions |
| `dialogue.test.ts` | `src/sim/story/dialogue.ts` |
| `cutscenes.test.ts` | `src/sim/story/cutscenes.ts` |
| `pots.test.ts` | `src/sim/ecs/traits.ts` (Pot) + `potSystem` |
| `steering.test.ts` | `src/sim/ai/steering.ts` |
| `atlas.test.ts` | Texture atlas / strip slicing |
| `brand.test.ts` | `src/brand.ts` palette constants |
| `rng.test.ts` | `src/engine/rng.ts` |
| `clock.test.ts` | `src/engine/clock.ts` |
| `deviceProfile.test.ts` | `src/engine/viewport/deviceProfile.ts` |
| `scaler.test.ts` | `src/engine/viewport/scaler.ts` |

### Determinism tests

`ecs.test.ts` includes replay tests: a fixed intent sequence is applied from a
known world seed, and the resulting entity state is compared against a snapshot.
These tests catch any accidental introduction of non-determinism (floating-point
divergence, hidden state, `Math.random` calls in sim code, etc.).

---

## Tier 2 — Browser tests (real Chromium, PixiJS + audio)

**Location:** `tests/browser/`
**Runner:** `vitest run --project browser` via `@vitest/browser-playwright`
**Command:** `pnpm test:browser`

These tests run in a real Chromium process (not JSDOM). They cover code that
requires actual browser APIs — WebGL (PixiJS), Web Audio, and DOM persistence:

| Test file | Module(s) covered |
|---|---|
| `paintingRenderer.test.ts` | `src/render/paintingRenderer.ts` — PixiJS Application, canvas init, render call |
| `composition.test.ts` | `src/render/composition.ts` — shape stamp placement |
| `parallax.test.ts` | `src/render/parallax.ts` — TilingSprite depth stack |
| `playerSprite.test.ts` | `src/render/playerSprite.ts` — Illinois Jim states, facing flip |
| `enemySprites.test.ts` | `src/render/enemySprites.ts` — 4 enemy kinds × 5 states |
| `npc.test.ts` | `src/render/npc.ts` — paper-doll NPC compositor |
| `pots.test.ts` | `src/render/pots.ts` — 4-colour breakable pot frame slicing |
| `hpBar.test.ts` | `src/render/hpBar.ts` — HP bar render states |
| `scene.test.ts` | `src/render/scene.ts` — full layered scene builder |
| `sprites.test.ts` | `src/render/sprites.ts` — sliceStrip, animatedFromStrip |
| `tileLayer.test.ts` | `src/render/tileLayer.ts` — @pixi/tilemap grid paint |
| `audio.test.ts` | `src/audio/audioEngine.ts`, `src/audio/sfxBank.ts` — AudioContext state, buffer rendering |
| `gameAudio.test.ts` | `src/audio/gameAudio.ts` — SFX event wiring, ambience |
| `persistence.test.ts` | `src/ui/persistence.ts` — @capacitor/preferences load/save |
| `pixiStrictMode.test.ts` | React StrictMode Pixi init/teardown safety |

Every render component test captures a screenshot (`*.png` files in `tests/browser/`)
for visual review. Screenshot files are gitignored proof artifacts, not committed assets.

Browser tests are required whenever `src/render/**`, `src/ui/**`, or
`src/audio/**` changes (gate rule). CI installs Playwright Chromium with
`--with-deps` before running them.

### Visual regression

`pnpm test:visual` runs the `browser` project scoped to `tests/visual/`.
Screenshot baselines are stored in `tests/browser/__screenshots__/`. Regenerate
with `vitest --project browser --update-snapshots`.

---

## Tier 3 — E2E tests (Playwright, multi-form-factor)

**Location:** `tests/e2e/`
**Runner:** `playwright test`
**Command:** `pnpm test:e2e`

Full Playwright tests that load the built app in a browser and interact with it.
`playwright.config.ts` defines viewport projects covering:

- Phone portrait (e.g. 390 × 844)
- Phone landscape (e.g. 844 × 390)
- Tablet (e.g. 1024 × 768)
- Desktop (1280+)

E2E tests verify that the game loads, the canvas is rendered, the React HUD mounts,
the title screen appears, and touch + keyboard controls produce expected game
responses across all form factors.

**Status:** E2E test suite is in progress (see `.agent-state/directive.md`).

---

## Running the full suite

```bash
pnpm test                   # unit only (fast, runs in CI on every PR)
pnpm test:watch             # unit in watch mode during development
pnpm test:browser           # browser tests (requires Playwright Chromium installed)
pnpm test:visual            # visual regression subset
pnpm test:e2e               # Playwright E2E
pnpm typecheck              # TypeScript across all tsconfigs
```

Install Playwright browsers once before running browser or E2E tests:
```bash
pnpm exec playwright install --with-deps chromium
```

---

## Gate-enforced coverage rules

From `.claude/gates.json`:

| Changed paths | Required test update | Required pass |
|---|---|---|
| `src/sim/**` or `src/engine/**` | `tests/unit/**` or `tests/browser/**` | — |
| `src/render/**` or `src/ui/**` | `tests/visual/**` or `tests/harness/**` | `pnpm test:browser` |
| `src/audio/**` | `tests/audio/**` or `tests/browser/**` | — |
| `capacitor.config.ts` or `android/**` | — | `pnpm cap:sync` with evidence |

Override a coverage gate with `// no-visual-impact: <≥10 word justification>` in
the diff.

---

## CI integration

The `ci.yml` workflow runs on every PR and push to `main`:

1. `pnpm lint` (Biome)
2. `pnpm typecheck`
3. `pnpm test` (unit, Node)
4. Playwright Chromium install (`--with-deps`)
5. `pnpm test:browser`
6. `pnpm build`

All steps must pass before merge.
