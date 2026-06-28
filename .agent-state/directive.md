# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE
**Owner:** jbogaty

## 🎮 Milestone 2 — Complete the game (ACTIVE, 2026-06-28)
Full-autonomy build-out. **Guiding principle (user directive):** custom code is
INCREMENTAL scaffolding — replace it with proper, well-maintained libraries for
every aspect (ECS, physics, tween/easing, state machine, particles, persistence,
audio). Don't hand-roll what a battle-tested library does better. Determinism
still matters for replays, so prefer libraries that allow a fixed-step,
seeded-RNG integration (drive them from our clock + rng) over ones that bury
wall-clock/Math.random internally. Keep expanding this queue as work surfaces.

### Library adoption plan (custom code → proper libs) — DECIDED
- **UI framework: React 19** (replaces SolidJS) — unifies the stack so @pixi/react
  and koota/react bindings work natively.
- **Game canvas: @pixi/react** (PixiJS 8 as React components).
- ECS: **koota** (replaces miniplex) — `koota/react` `WorldProvider`/`useQuery`/
  `useTrait` drive the HUD reactively, replacing the manual Solid signal bridge.
  Plain-trait entities stay serializable for replays; systems run in the fixed loop.
- **UI components: Tailwind CSS + Radix UI / shadcn** — arcade-styled HUD, menus,
  title/pause/win-lose/level-select screens. Max control, minimal runtime.
- PRNG: **seedrandom** — **dual-layer**: a `sim` stream (gameplay, replay-critical)
  and a separate `fx` stream (cosmetic/particles) so visual variation never
  desyncs the deterministic sim. Replaces the custom mulberry32 facade (keep the
  Rng interface, swap the engine).
- State machine: **xstate** v5 (typed FSM for title/play/win/lose game states).
- Tween/easing: **popmotion** (clock-driven; never self-animates off wall-clock).
- IDs: **nanoid** (entity + save-slot ids).
- Persistence: **@capacitor/preferences** (native) + localStorage (web) behind one facade.
- Audio: keep the custom Web Audio bus (already solid); wire sfx to events.
- **Renderer: PixiJS 8 (WebGL/WebGPU)** — replaces the hand-rolled canvas2d
  renderer. Proper sprite batching, container/scene graph, particles, filters.
  Render is a VIEW of the deterministic sim (sim stays pure; Pixi only draws).
  Local reference: ~/src/reference-codebases/pixijs.
- **Enemy AI: Yuka** — steering behaviors (seek/flee/patrol/path) for enemies,
  driven by our fixed-step clock + seeded sim stream. Local ref: ~/src/reference-codebases/yuka.
- Physics: keep our AABB swept resolver as the deterministic substrate (tile
  collision); layer Yuka steering + ECS on top. Full engines (matter/box2d) rejected.
- Reference codebases (docs/examples cloned locally): ~/src/reference-codebases/
  {pixijs, yuka, bitECS, matter-js, phaser, pixi-react} — consult before building.

### Queue
- [x] Research: pick the concrete libs (miniplex/seedrandom/xstate/popmotion/nanoid/preferences)
- [x] PRNG v2: dual-layer seedrandom (sim + fx streams); createRngPair + restoreRng (16 tests)
- [x] Adopt ECS (koota): traits + world + playerSystem + collectibleSystem; level
  parses `*`/`o`/`x` for relics/enemies; 7 ECS tests (player feel preserved, pickup, determinism)
- [x] Physics v2: generic gravity/collision integration system for non-player bodies
  + enemySystem (patrol/chase) + lifetimeSystem (particles); enemies spawned from level
- [x] Enemies: patrol/chase AI + combatSystem (whip kill, stomp+bounce, side-hit hurts);
  120 tests. NOTE: koota caps 16 live worlds — the loop must world.destroy() on level restart.
- [x] Combat PR #8 MERGED to main (whip/stomp + robust stomp fix from review).
- [x] Scoring: Score trait (points/combo/comboTimer/lives) + award() (combo-scaled) +
  scoreSystem (decay) + collectibleSystem awards through combo. 124 tests.
- [x] Wire HUD to score: gameEcs onHud pipes Score → hudStore → React HUD (points/lives).
- [x] Mine-cart rail segments: MineCart trait + mineCartSystem (ride/dismount), rails
  one-way standable. 127 tests.
- [x] Adopt PixiJS 8 renderer: pixiRenderer.ts (ECS world → Graphics) + gameEcs.ts
  (ECS-driven loop replacing canvas2d). TWO bugs fixed + verified on real Safari GPU:
  (1) StrictMode double-init hang — serialize create/dispose on a ref promise (debugger);
  (2) `app.destroy(true)` removed React's canvas — use `{removeView:false}`. Safari
  evaluate confirms responsive + canvas present + HUD renders; pixiStrictMode browser
  test passes. NOTE: chrome-devtools-mcp hung; Safari MCP screenshot targets wrong
  window but evaluate works — use safari_evaluate for verification, not screenshot.
- [ ] [WAIT-CI] PR #9 (renderer) — merge once build-test green
- [x] Enemy steering AI: ported Yuka's force-based seek/flee/arrive into pure 2D
  `src/sim/ai/steering.ts` (Yuka is 3D + Math.random — can't run in the pure sim).
  Chase now uses arrive (accel toward player, decel when close) — smoother than
  bang-bang. 6 steering tests, 133 total. Determinism preserved.
- [x] Particles: Particle trait + spawnBurst (FX rng stream) + particleSystem; bursts
  on kills (red) + pickups (gold), rendered by pixiRenderer. 3 tests incl. FX-no-desync proof. 136 total.
- [ ] Game-state machine (xstate): title → play → win/lose → restart; React screens
- [ ] Persistence: best score / progress via @capacitor/preferences (web localStorage fallback)
- [ ] Levels: 3+ hand-authored levels + a level-select
- [ ] Audio: wire sfx to events (jump/coin/hurt/whip), simple music loop
- [x] Pivot stack to React: SolidJS → React 19 + Tailwind v4; @pixi/react + koota wired next
  (engine/sim untouched, all 123 tests green, verified in browser)
- [ ] Landing page (React route): hero, the Gemini title wordmark, play CTA, screenshots, about
- [ ] Cutscenes: GenAI-generated cutscene art (Gemini) + a React cutscene player
  (intro: Jim enters the shrine; win/lose stingers) driven by the FSM
- [ ] Tests at every step (unit for sim, browser for render, e2e for flows)
- [ ] Docs kept in lockstep (ARCHITECTURE/STATE/CHANGELOG)
- [ ] Self-improve: refine this directive + capture decisions as work surfaces

### Learnings captured this milestone
- **Run `pnpm lint` (not just `pnpm check`/build) before every commit** — `check`
  auto-fixes and can mask hard lint errors (Tailwind `@theme` tripped CI lint
  while local build was green). Lint is the CI gate; reproduce it locally.
- **Biome needs `css.parser.tailwindDirectives: true`** for Tailwind v4 at-rules.
- **Cognitive-complexity max is 15** — keep `updateEach` bodies thin by extracting
  per-entity helpers (applyPlayer*, steerPatrol/steerChase, recordActor).
- **koota**: `world.query(...)` returns `readonly Entity[]` + `.updateEach((state,
  entity)=>)`; `entity.destroy()` / `entity.get(Trait)` / `entity.has(Trait)`.
  Single-subject lookups: `world.query(T)[0]?.get(T)` — guard null (no player on menus).
- **koota `entity.get()` returns a SNAPSHOT copy** — mutating it is lost; persist
  via `entity.set(Trait, {...})`. `updateEach`/`readEach` are the in-place paths
  (updateEach writes back, readEach is read-only — use readEach in the renderer).
- **PixiJS v8 + React**: `app.destroy(true)` removes the canvas from the DOM
  (removeView:true) — when React owns the `<canvas>`, use `app.destroy({removeView:false},...)`.
  Under StrictMode, serialize async create/dispose on a `useRef` promise so one
  Pixi Application owns the canvas at a time (else a shared GL context infinite-loops
  in checkMaxIfStatementsInShader → silent main-thread hang, no console error).
- **Browser verification: chrome-devtools-mcp hung on the WebGL page; Safari MCP
  works** — but `safari_screenshot` targeted the wrong window. Use `safari_evaluate`
  (responsive check + DOM/canvas/HUD assertions) for headed-GPU verification.
- **Determinism preserved through the lib swaps**: seedrandom dual-stream + koota
  plain-trait entities + fixed-step systems = replayable. No lib reads wall-clock.

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
