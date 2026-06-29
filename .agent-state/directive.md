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

### Queue
- [ ] LEVEL 1 ASSEMBLY: a browser test composing the FULL scene — parallax + baked
      props (painting) + baked actors (Jim + elder-mara + watchman-pell + a goblin) on
      their surfaces; live-verify the screenshot reads like an old SNES adventure with
      zero asset loss. [TOP]
- [ ] Mushroom + flyingEye enemies are non-humanoid — image-to-3d (or keep strip art).
- [ ] Bake hurt/death clips for the goblin (author non-loop poses) so enemies don't
      fall back to idle on hit/death; extend author_anim.py with those clip types.
- [ ] Mushroom + flyingEye are non-humanoid — image-to-3d (or keep strip art); decide
      per-enemy. Props/buildings/cave GLBs via Meshy → bake (static) for Level 1.
- [ ] NPCs + humanoid enemies via Meshy (T-pose → rig → custom animate attack) → bake.
- [ ] PROPS / BUILDINGS / CAVE / obstacle / collectible GLBs via Meshy → bake to webp
      (static or simple anims) for Level 1.
- [ ] Extend the schema/manifest + genai-level pipeline: art entries = parallax (gemini
      image) vs model (meshy GLB → baked sprite); generate both.
- [ ] Assemble + live-verify Level 1 (baked actors + props on the gemini parallax) —
      READ the screenshot, zero asset loss, reads crafted.
- [ ] Levels 2-10 once the path is solid; per-level mechanic types as built.

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
