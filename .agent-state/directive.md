# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE — ENDLESS (never flips to RELEASED)
**Owner:** jbogaty

Shipped-milestone history lives in `docs/STATE.md` (kept out of here so the directive
stays lean). This file = operating mode + the LIVE queue only.

## ♾️ OPERATING MODE — ENDLESS SELF-DISCOVERY (user directive, NON-NEGOTIABLE)
"fix your directives to be a loop endlessly of self-discovery. always find new
features to add or polish. no more 'we released!'. i will tell you when to end."
- Never reaches RELEASED; only the user ends it. Each turn: take the next queue item,
  build it, PROVE it live (READ the screenshot, zero asset loss), commit, then append
  1-3 newly-discovered items. The backlog grows faster than it drains — the point.
- **Look CRITICALLY at every visual; name the defects yourself, fix them before the
  user has to.** No performing satisfaction on screenshots.

## 🚀 ACTIVE MILESTONE — 3D BAKED TO 2D WEBP SPRITES (user, 2026-06-29, NON-NEGOTIABLE)
A 2D side-scroller where 3D is a PRODUCTION TOOL, not the runtime. The Gemini API
outputs JPEG-only (no alpha), so:
- PARALLAX BACKGROUNDS = full-screen images via gemini-3.1-flash-image (opaque — fine).
- CHARACTERS (Jim, NPCs, humanoid enemies) + PROPS/buildings/cave = 3D GLB via Meshy
  (meshy-6, T-POSE for characters — REQUIRES should_remesh:true or the pose is ignored
  [[meshy-tpose-needs-should-remesh]]) → texture → rig (free walk/run) → animate.
- BAKE: render each rigged GLB's animations from a fixed SIDE ortho camera with a real
  ALPHA channel (Three.js WebGLRenderer alpha:true → canvas → WebP) → TRANSPARENT WEBP
  sprite frames. THIS is how we stage perfect transparent webp ourselves.
- RUNTIME: the EXISTING PixiJS 2D sprite engine renders the sprite sheets over the
  parallax. NO Three.js in the game. Keeps the proven engine + gives real animation.
The Zod Level schema + 10-level outline + old-school/brutal thesis + relative-surface
layout all still apply. [[pivot-3d-glb-on-parallax]] [[gemini-crafts-whole-levels]]

### Done
- [x] Zod Level schema + validators, 10-level outline + balance + thesis, gemini-3.1-
      flash-image proven for parallax. Three.js installed; dev/viewer model inspector
      (orbit/zoom/animation playback, DevTools-drivable). Jim: T-pose GLB (should_remesh
      fix) → textured → rigging (walk/run). Meshy pipeline learnings captured.
- [x] BAKER (Blender bpy, not Three.js — more robust + scriptable): author_anim.py poses
      real idle/walk/run/jump cycles on Jim's rig (Meshy's free clips were degenerate
      T-pose jitter), bake.py renders an ortho side cam with film_transparent → alpha
      frames, pack-sheet.ts → one WebP sheet + manifest (shared feet anchor). All driven
      by bake-character.sh / `pnpm bake:jim` at one shared scale. 4 clips shipped to
      public/assets/sprites/jim/. Contract test tests/unit/spriteSheets.test.ts (4 pass).
      Screenshot-verified: clean side profile facing right, real stride, arms at sides.

### Done (continued)
- [x] Jim whip-attack clip baked + wired; orphaned old player PNGs deleted; bake +
      renderer reviewer fixes folded forward. Player ships idle/walk/run/jump/attack.
- [x] GOBLIN enemy: Meshy 3D (t-pose→texture→rig, same 24-bone humanoid) baked with
      the SAME pipeline (zero script changes) → 5 WebP clips, wired into enemySprites
      via a BAKED backend, screenshot-verified in-engine. Pipeline proven reusable.

- [x] SKELETON enemy: Meshy → bake → wired into the enemySprites BAKED backend
      (move→walk shamble). Both humanoid enemies now baked-3D. Reusable pipeline
      captured in [[character-bake-pipeline]] memory.

- [x] ELDER MARA (story NPC) via Meshy → baked idle+walk → createBakedNpcSprite +
      BAKED_NPCS registry; ensureNpc picks baked vs paper-doll by dialogueId.
      Screenshot-verified in-engine. Baked actors now cover player + 2 enemies + 1 NPC.

- [x] ALL FOUR story NPCs baked-3D + wired (elder-mara, watchman-pell, ferryman-cole,
      shrine-warden). Registry-driven npc test. Warden needed an arms-out re-gen (crossed
      arms fail Meshy rigging — captured in [[character-bake-pipeline]]). Full baked cast:
      player(5) + 2 enemies + 4 NPCs.

- [x] Goblin + skeleton hurt + death clips authored + baked + wired (enemies animate on
      hit/death, no idle fallback). author_anim.py CLIP_AUTHORS; bake-character.sh takes
      an optional clip-set arg. 5-state enemy test asserts each clip non-blank.

- [x] STATIC-PROP bake pipeline (bake-prop.py + pack-prop.ts) + first baked building
      (clifftop pitched-house, transparent WebP). Proven compositing over the Level 1
      parallax — fixes the Gemini-checkerboard buildings [[props-buildings-also-3d]].
      Level 1 parallax backgrounds already exist (Gemini, opaque — fine).

- [x] Baked 5 transparent Level 1 props (pitched-house, pitched-house-2, market-stall,
      cliff-ledge, pot) → public/assets/props/. propBake.test composites all on the
      parallax. Buildings read like an old SNES village at dusk.

- [x] Baked the last Level 1 props (switch-lever, gate-trailhead, relic-coin). All 8
      transparent baked-3D props shipped to public/assets/props/, covered by propBake.test.

- [x] Level 1 structure/prop art pointed at the baked transparent props (fromLevel
      BAKED_PROP map). levelRenderer.test now renders the baked cottage on the parallax,
      no checkerboard — the broken Gemini building art is replaced.

- [x] LEVEL 1 FULL SCENE assembled + verified (level1Scene.test): parallax + baked
      props + baked actors (Jim, Mara, Pell, Cole, goblin) compose into a crafted
      dusk-village scene, no checkerboard. The 3D-bake art pipeline is proven end to end.

- [x] Baked the last 3 Level 1 props (hazard-spikes, moving-platform, secret-relic).
      ALL 11 Level 1 structure/prop art keys are now transparent baked-3D — zero Gemini
      checkerboard art remains in the level.

- [x] DECISION: mushroom + flyingEye keep their vendor strip art — verified genuinely
      transparent (alpha 0–255), real animated sprites, NOT the broken Gemini checkerboard.
      Replacing working transparent art with Meshy 3D isn't worth the spend; the strip
      path already serves them correctly. (Revisit only if their style clashes in-scene.)

- [x] The GenAI Level 1 now renders through the REAL painting renderer
      (paintingRenderer.artPainting branch) — level1Live.test drives it with sim actors
      over the baked props + parallax. Fixed baked-actor scale (CONTENT_H was old
      small-frame values; updated to 256-tile baked heights — actors were 2.5× too big).

- [x] GenAI Level 1 is now the LIVE first level (genaiBundle adapter + artPainting
      through gameEcs; FIRST_LEVEL_ID = halward-s-reach). VERIFIED RUNNING IN CHROME:
      PLAY → Jim, Elder Mara, baked house, tent, coin, spikes, HUD on the parallax,
      zero console errors. genaiBundle.test locks the adapter. The 3D-bake art pipeline
      is now end-to-end LIVE in the actual game.

- [x] Live Level 1 polish-verified in Chrome: fresh PLAY shows Halward's Reach with
      Jim's run animation PLAYING, Elder Mara, baked house/tent/coin/spikes/torch on the
      grass+parallax, HUD, zero console errors — actors + props read at correct scale.
      (Baked goblin walk also seen animating live on the next level's cave parallax.)

- [x] HAZARDS implemented (review P0 #1): buildCollision lays TileKind.Hazard tiles
      across each schema hazard's width; systems.ts already kills on Hazard contact, so
      the baked spikes are now actually deadly. buildFromLevel.test locks it.

- [x] GATES + SWITCHES (review P0 #2): Switch/Gate traits + gateSwitchSystem (overlap
      latches a lever on, gate opens, closed gate blocks the player) wired through
      buildFromLevel→GameLevel→createSimWorld→gameEcs + genaiBundle. The lever-opens-gate
      hook works live. gateSwitch.test (4 pass).

- [x] MOVING PLATFORMS implemented (oscillate + carry the rider) — movingPlatformSystem
      through the full chain. movingPlatform.test (3 pass).
- [x] SECRETS implemented (folded into the collectible pickup path as 500+ rewards).
      The WHOLE problem-solving layer (hazards/gates/switches/platforms/secrets) is now
      live — no baked puzzle art is inert. genaiBundle.test asserts the full layer.

- [x] Live-verified the full problem-solving layer runs clean in Chrome (PLAY → Level 1
      boots + runs with switch/gate/platform/secret systems active every tick, zero
      console errors). Each mechanic proven deterministically by unit tests
      (hazards kill, switches latch, gates open/block, platforms carry, secrets reward).

- [x] Puzzle-layer art now PAINTS (it was never emitted — hazards/switches/gates/
      platforms/secrets live in their own schema arrays, not `placements`) + an OPEN gate
      fades to alpha 0.15 via a sim Gate→`gate:<i>` sprite bridge. Verified live in Chrome
      (gate barrier visible, baked goblin walking, zero errors). paintingFromLevel.test.

- [x] LEVEL 2 DESIGN generated — The Whispering Jungle (deep-jungle), validated (0
      dangling/broken, entitiesBeforeGoal). pnpm level:gen wrapper added (sets the app
      tsconfig path for @sim aliases). Parallax + reference art generating via Gemini.

### Queue
- [x] Bake Level 2's transparent jungle props as static Meshy 3D (giant-root/strangler-fig
      platforms, vine-bridge, canopy-walkway, mushroom-shelf, carnivorous-plant, glow-fruit,
      jungle-thorns, vine-tangle-gate, jungle-weight-lever, totem, urn, foundation, orchid,
      collapsing-log = 15) → public/assets/props + BAKED_PROP map. Registered the-whispering-
      jungle bundle in registry + LEVEL_ORDER (2nd); live-verified baked-3D in Chrome, zero
      errors. Fixed: Gemini ground-tile is a parallax floor, not a foreground placement
      (groundFill on the bundle). Added DEV `?level=<id>` boot override for level verify.
- [x] Level 3 (The Rushing Gorge — river-gorge) authored, validated (0 dangling/broken),
      9 props baked (added bake-prop.py --pitch for flat-lying disks), river parallax curated
      via the new gen-level-parallax tool, bundle registered (3rd), live-verified in Chrome.
      Rule established: role:ground/decor art (riverbed/water/waterfall) is parallax/groundFill,
      NEVER a foreground placement sprite (Gemini 2D is opaque; chroma-key is forbidden).
- [x] Level 4 (The Abandoned Mine — collapsing-mine) authored, validated, 9 props baked
      (incl. a transparent rail-segment prop — a unit assertion caught the rail anchorArt
      opaque-trap), parallax curated, bundle registered (4th), live-verified in Chrome.
      cave-bat→flyingEye. Rule extended: role:ground reaches the painting via SURFACE
      anchorArt too (not just placements) — bake it transparent or it stamps rectangles.
- [x] Level 5 (The Crystal Cavern — crystal-cavern) authored, validated, 6 crystal props
      baked + 4 reused (Meshy credits ran dry mid-batch), parallax curated, bundle registered
      (5th), live-verified in Chrome. crystal-spider→goblin, lost-miner→watchman-pell.

- [x] Switch ON/OFF visual state shipped — paintingFromLevel tags each switch `switch:<i>`,
      paintingRenderer lights the lever white-hot when latched (mirrors the gate-fade pass).
      The problem-solving-layer feedback loop is now complete (gate fade + switch light).

- [x] Enemy authored `range` threaded end-to-end (schema → buildFromLevel → genaiBundle →
      EnemySpawn → createSimWorld): spawnX ± range patrol bounds when authored, ±3-4 tile
      default otherwise. Improves all 5 live levels' patrol read. Unit-tested.
- [ ] [WAIT-USER] **Meshy credits exhausted (balance 3; a prop preview costs 20).** Levels
      6-10 each need ~10 baked 3D props — generating them needs credits I can't purchase
      without the user's payment authorization. When topped up: author Levels 6-10 (sunken-
      ruins, lava-temple, … per briefs) → bake props → gen-level-parallax → register → live-
      verify, one per cycle. ALSO swap the 4 Level-5 reuse props for dedicated bakes.
- [ ] [WAIT-USER] (Meshy-blocked) Jungle enemies (canopy-panther, carnivorous-plant) render
      as goblin/mushroom stand-ins. Bake dedicated jungle-enemy characters: panther via
      image-to-3d (quadruped, not the humanoid rig) + carnivorous-plant as an animated
      snapping prop; wire new visual kinds. Needs Meshy credits.
- [ ] [WAIT-USER] (Meshy-blocked) Bake hurt/death clips for the goblin (author non-loop
      poses) so enemies don't fall back to idle on hit/death; extend author_anim.py with
      those clip types. Needs the rigged goblin GLB re-baked → Meshy credits.
- [x] Mushroom + flyingEye non-humanoid: kept strip art (decided per-enemy). Level 1
      props/buildings/cave GLBs via Meshy → baked static. (Level 1 ships live.)
- [x] NPCs + humanoid enemies via Meshy (T-pose → rig → custom animate attack) → baked.
- [x] PROPS / BUILDINGS / CAVE / obstacle / collectible GLBs via Meshy → baked to webp.
- [x] Schema/manifest + genai-level pipeline: art entries = parallax (gemini) vs model
      (meshy GLB → baked sprite); both generated.
- [x] Assembled + live-verified Level 1 (baked actors + props on the gemini parallax) —
      zero asset loss, reads crafted.
- [x] Levels 2-5 live on the baked pipeline (jungle/gorge/mine/crystal), each per-level
      mechanic type built + Chrome-verified. Levels 6-10 tracked under the [WAIT-USER]
      Meshy-credit item above (the only thing gating them).

## What CONTINUOUS means
1 never stop for status reports · 2 never stop for scope caution · 3 never stop to
summarize (git log is the summary) · 4 never stop on context pressure · 5 never stop
because a task feels big · 6 only stop on explicit user halt / red CI / genuine STOP_FAIL.

## Operating loop
while queue has open items: implement → verify (prove live) → commit → dispatch
reviewers → mark done → append discoveries → next.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "follow-up" | "TODO" | "FIXME" |
"stub" | "placeholder" | "mock for now" | "pause point" | "natural pause" | "next session"
| "stopping point" | "clean handoff" | "ready to hand off" | "where things stand"

## Batch — five-level-campaign-and-directive-compression (batch-20260629-065501)

Source: docs/plans/five-level-campaign-and-directive-compression.prq.md
Started: 2026-06-29T11:55:58Z

### task-001 Create CAMPAIGN single-source-of-truth
- [x] task-001 src/sim/story/campaign.ts exports CAMPAIGN (5 GenAI levels + intro cutscene each); tsc 0
### task-002 Rewrite cutscenes for the 5-level chain + cliffhanger
- [x] task-002 CUTSCENES = intro + 4 bridges + cliffhanger; no legacy ids; beats from briefs; unit test
### task-003 Derive registry order from CAMPAIGN
- [x] task-003 LEVEL_ORDER/FIRST_LEVEL_ID/nextLevelId derive from CAMPAIGN; genaiBundle.test asserts the 5 ids
### task-004 Simplify gameMachine chaining to CAMPAIGN lookups
- [x] task-004 levelAfterCutscene/cutsceneAfterLevel via CAMPAIGN; gameMachine.test covers intro→…→crystal→cliffhanger→won
### task-005 Delete legacy shape-stamp levels + callers
- [x] task-005 remove render+sim legacy level modules/exports; no legacy id refs in src/; tsc 0
### task-006 Remove/rewrite the 7 legacy-level test files
- [x] task-006 legacy test files deleted/retargeted; pnpm test + test:browser green
### task-007 Generate + curate 6 fresh cutscene scenes (Gemini)
- [x] task-007 intro/jungle/gorge/mine/crystal/cliffhanger art curated to public/assets/cutscenes (3 aspects); no 404
### task-008 Live-verify the full 5-level campaign in Chrome
- [x] task-008 intro→jungle→gorge→mine→crystal→cliffhanger, zero console errors; pnpm build 0
### task-009 Compress directive — completed items → pillar docs
- [ ] task-009 37 [x] items → docs pillar; directive trimmed to live CAMPAIGN plan + WAIT items + levels 6-10
