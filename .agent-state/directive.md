# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE
**Owner:** jbogaty

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
- [ ] `index.html` + `src/` entry — build the game FRESH (POC is reference only)
- [ ] `src/sim/` (pure, deterministic), `src/engine/` (clock+rng facades, loop), `src/render/`, `src/ui/` (TSX), `src/audio/`
- [ ] Responsive resolution (phone both rotations / tablet / foldable); touch+mouse primary
- [ ] Original branding + fontography for "Illinois Jim and the Shrine of Catastrophe"
- [ ] Asset pipeline: 2DLowPoly copy + itch.io fetch + Gemini gen
- [ ] `tests/unit/`, `tests/browser/`, `tests/visual/`, `tests/e2e/` matching the gates
- [ ] Capacitor: `android/` via `pnpm cap:add android`
- [ ] `.github/workflows/` ci → release → cd (Pages deploy + Android APK), dependabot.yml
- [ ] standard-repo root files: AGENTS.md, README.md, CHANGELOG.md, STANDARDS.md, docs/

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
