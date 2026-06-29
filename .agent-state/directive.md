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

### Queue
- [ ] NPCs + humanoid enemies via Meshy (T-pose → rig → custom animate attack) → bake.
      Also bake Jim's WHIP-ATTACK clip (attack currently falls back to idle) and delete
      the orphaned public/assets/player/*.png (superseded by baked sheets). [TOP]
- [ ] Reviewer fixes for the bake pipeline (commit 489c667): (#1) pack-sheet.ts guard
      all-transparent bbox → throw not anchorY=0; (#2) bake.py use evaluated/deformed
      bounds across anim frames so jump doesn't clip; (#3) view_layer.update() right
      after NLA promote; (#4/#5) bake-character.sh: don't double-bake walk, log Blender
      stderr instead of 2>/dev/null; (#7) spriteSheets.test anchor-consistency assert.
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
