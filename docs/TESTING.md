---
title: Testing Strategy
updated: 2026-06-27
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
| `rng.test.ts` | `src/engine/rng.ts` |
| `clock.test.ts` | `src/engine/clock.ts` |
| `deviceProfile.test.ts` | `src/engine/viewport/deviceProfile.ts` |
| `scaler.test.ts` | `src/engine/viewport/scaler.ts` |

**Current count:** 99 tests passing.

### Determinism tests

`player.test.ts` includes replay tests: a fixed intent sequence is applied from
a known `PlayerState`, and the resulting state is compared against a snapshot.
These tests catch any accidental introduction of non-determinism (floating-point
divergence, hidden state, etc.).

---

## Tier 2 — Browser tests (real Chromium, canvas + audio)

**Location:** `tests/browser/`
**Runner:** `vitest run --project browser` via `@vitest/browser-playwright`
**Command:** `pnpm test:browser`

These tests run in a real Chromium process (not JSDOM). They cover code that
requires actual browser APIs:

| Test file | Module(s) covered |
|---|---|
| `renderer.test.ts` | `src/render/renderer.ts` — canvas 2D draw, colour sampling |
| `audio.test.ts` | `src/audio/audioEngine.ts`, `src/audio/sfxBank.ts` — AudioContext state, buffer rendering |

**Current count:** 23 tests passing.

Browser tests are required whenever `src/render/**` or `src/audio/**` changes
(gate rule). CI installs Playwright Chromium with `--with-deps` before running
them.

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

E2E tests verify that the game loads, the canvas is rendered, the HUD mounts, and
touch + keyboard controls produce expected game responses across all form factors.

**Status:** E2E test suite is next in the work queue (see `.agent-state/directive.md`).

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
4. Playwright Chromium install
5. `pnpm test:browser`
6. `pnpm build`

All steps must pass before merge.
