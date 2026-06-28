# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE
**Owner:** jbogaty

## ✅ Scaffold milestone SHIPPED (2026-06-27)
PR #1 (scaffold) + PR #3 (PWA icons) squash-merged to main. **Live in
production:** https://jonbogaty.com/illinois-jim-and-the-shrine-of-catastrophe/
— verified rendering with zero console errors. CI/release/cd all green;
Pages deploy working (fixed env branch policy to allow main). 100 unit + 23
browser + 12 e2e tests. Next milestone: gameplay expansion (sprite rendering
from the atlas + curated Gemini art, enemies, collectibles, mine-cart rails,
more levels).

Build **Illinois Jim and the Shrine of Catastrophe** — an original, mobile-first
2D arcade adventure — in the arcade-game dialect: Vite + TypeScript + Capacitor +
Biome + Playwright + release-please. Ships to **GitHub Pages (web, primary)** and
**Android APK (Capacitor)**.

## Locked decisions
- **Genre: side-scroll platformer + mine-cart.** Run/jump/whip platforming
  through temple levels with mine-cart rail segments. Gravity + AABB collision,
  tile-based levels, hazards, collectibles, enemies. Touch-first controls
  (virtual d-pad/swipe + action buttons).
- **UI = SolidJS** (signals bridge engine→HUD). **Device profiles** via
  `@capacitor/device` + `screen-orientation` drive the responsive scaler;
  `@capacitor/app` pauses the loop on background; `@capacitor/status-bar` for immersion.
- **Engine foundation done:** `createRng(seed)` (mulberry32) + `createClock()`
  (fixed-timestep) — sim uses these, never `Math.random`/`performance.now`.
- **Build fresh.** The original POC HTML is NOT migrated. It lives local-only at
  `raw-assets/reference/poc_original.html` (gitignored) as inspiration/floor only.
  The game must EXPAND well beyond the POC.
- **Original IP.** "Illinois Jim and the Shrine of Catastrophe" — not Indiana Jones.
  Unique branding, palette, fontography (Gemini-generated where useful).
- **2D**, canvas/WebGL2 sprites. Render target stays 2D.
- **Mobile-first.** Touch/mouse primary. Responsive resolution scaling to phones
  (both rotations), tablets, unfolded foldables — NOT a fixed canvas.
- **Assets:** primary = `/Volumes/home/assets/2DLowPoly` Kenney packs (Pixel
  Platformer + expansions, Character Pack, Monster Builder, Explosion Pack, tiles);
  itch.io downloads (ITCH_API_KEY) → `raw-assets/itch/` (local only); Gemini genai
  (GEMINI_API_KEY) for unique sprites + branding. Creds pattern from `../martian-trails/.env`.
- **Repo:** public `jbcom/illinois-jim-and-the-shrine-of-catastrophe`, Pages enabled
  (workflow build source). gh authed as jbdevprimary.
- `raw-assets/` is gitignored (POC + raw downloads); processed/atlased assets under
  `src/` or `public/` are tracked.

## Scaffold the arcade-game stack — make reality match the profiles

- [x] `git init`; import commit on main; public jbcom repo created; Pages enabled
- [x] `package.json` (pnpm only) with vite, typescript, @biomejs/biome, @playwright/test, vitest — all latest
- [x] `vite.config.ts`, `tsconfig.json`, `biome.json`, `capacitor.config.ts`, `vitest.config.ts`, `playwright.config.ts`
- [x] `release-please-config.json` + `.release-please-manifest.json` (node)
- [x] `index.html` + `src/` entry — building the game FRESH (POC is reference only)
- [x] `src/sim/` + `src/engine/` + `src/audio/` + `src/render/` + `src/ui/` all landed
  - [x] engine: rng + fixed-timestep clock facades (17 tests)
  - [x] sim physics: vec2, AABB, tilemap, swept collision (32 tests cumulative)
  - [x] sim player: controller (run/jump/whip, coyote, buffer, variable height) (10 tests)
  - [x] sim world: deadzone camera + level parser + demo level (12 tests)
  - [x] audio: Web Audio engine + procedural sfx bank (19 browser tests)
  - [x] engine/viewport: device-profile responsive scaler (47 tests)
  - [x] render: canvas2d renderer + interpolation + sprite atlas (7 browser/unit tests)
  - [x] input: touch virtual controls + keyboard → PlayerIntent (7 tests)
  - [x] engine: main game loop wiring sim+render+audio+viewport+input
  - [x] ui: SolidJS HUD bridged via signals; verified running in mobile browser
- [x] Responsive resolution (phone both rotations / tablet / foldable); touch+mouse primary
- [x] Original branding + fontography (BRAND tokens, src/brand.ts)
- [x] Asset pipeline: 2DLowPoly CC0 copy + itch.io fetch + Gemini gen (all 3 run)
- [x] `tests/unit/` + `tests/browser/` + `tests/e2e/` matching the gates (99 + 23 + 12)
- [x] Capacitor: `android/` platform added; `assembleRelease` builds an APK locally (verified)
- [x] `.github/workflows/` ci → release → cd (Pages deploy + Android APK), dependabot.yml
- [x] standard-repo root files: AGENTS.md, README.md, CHANGELOG.md, STANDARDS.md, docs/

## Scaffold complete — next: open PR, merge, then gameplay expansion
(enemies, collectibles, mine-cart rail segments, more levels, sprite rendering
from the atlas, curated Gemini sprites sliced into animation frames)

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — task-batch + PreCompact handle it.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: implement → verify → commit → dispatch reviewers → mark [x] → next.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
