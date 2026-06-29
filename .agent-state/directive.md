# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE — ENDLESS (never flips to RELEASED)
**Owner:** jbogaty

Shipped-milestone history lives in `docs/STATE.md`; the campaign/story architecture in
`docs/STORY.md`. This file = operating mode + the LIVE queue only.

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
  ALPHA channel → TRANSPARENT WEBP sprite frames (Blender bpy; `bake-prop.py` for static
  props, `bake-character.sh` for rigged actors).
- RUNTIME: the EXISTING PixiJS 2D sprite engine renders the sprite sheets over the
  parallax. NO Three.js in the game. Keeps the proven engine + gives real animation.
The Zod Level schema + 10-level outline + old-school/brutal thesis + relative-surface
layout all still apply. [[pivot-3d-glb-on-parallax]] [[gemini-crafts-whole-levels]]
[[genai-level-pipeline-workflow]] [[props-buildings-also-3d]] [[character-bake-pipeline]]

## Where things stand (one line)
A complete 5-level campaign ships LIVE (Halward → jungle → gorge → mine → crystal →
cliffhanger), all baked-3D-on-parallax, Chrome-verified. `CAMPAIGN` (src/sim/story/
campaign.ts) is the single source of truth — appending a chapter extends the game.
Mobile UX is solid: portrait serpentine slice-wrap (both orientations playable, no
landscape lock, seamless band tiling), pulp-relic 16-bit HUD, and touch zones sized
from the container CSS box (unfolded-foldable bottom controls reachable). The fake
"SCORE: ILLINOIS JIM" HUD bar Gemini baked into jungle parallax is stripped, and the
parallax gen prompt now hard-forbids chrome/text. Full detail: `docs/STATE.md` +
`docs/STORY.md`.

## Queue — LIVE

### Render polish (agent-doable, NOT Meshy-gated)
- [x] Gorge bottom-right transparency CHECKERBOARD — FIXED (0eea22d). Root cause (via
      stuck-loop-debugger): portrait band RenderTextures were created at resolution:1 while
      the app runs at resolution:2, so each band buffer was half-density and 2×-upscaled on
      blit (antialias:false), dithering the waterfall foam's semi-transparent texels into a
      checkerboard. Fix: create band RTs at app.renderer.resolution (+ reallocate on dpr
      change). Gross checkerboard gone, render crisp; browser test asserts RT res == app res.
- [ ] [WAIT-CI] PR #25 (band-resolution checkerboard fix) — CI green, ready to squash-merge.
- [x] Live deploy VERIFIED. The production site (jonbogaty.com/illinois-jim-…) serves the
      current GenAI build: live index-BTEG_bK-.js references bandStack (slice-wrap),
      jungle-leaves-parallax (the regenerated clean art), the-rushing-gorge/the-whispering-jungle;
      the level WEBP returns HTTP 200. The "old blocky render" seen earlier was local BROWSER
      CACHE, not a stale deploy (live hash == CI build hash for b2ee2d8; x-cache MISS, age 0).

### Next chapter — levels 6–10 (gated on Meshy credit)
- [ ] [WAIT-USER] **Meshy credits exhausted (balance 3; a prop preview costs 20).** Each of
      levels 6–10 needs ~10 baked 3D props — generating them needs credits I can't purchase
      without the user's payment authorization. When topped up, per the proven cycle
      ([[genai-level-pipeline-workflow]]): `pnpm level:gen --level N` → validate (0 dangling,
      0 broken gates) → bake props (Meshy → bake-prop.py → pack) + `gen-level-parallax` →
      register the bundle → append a CampaignChapter to CAMPAIGN → live-verify in Chrome.
      Levels 6–10 = sunken-ruins → lava-temple → the-shrine → catastrophe → the-long-way-up
      (briefs in scripts/levelBriefs.ts). ALSO swap the 4 Level-5 reuse props for dedicated bakes.

### Polish (also Meshy-gated)
- [ ] [WAIT-USER] (Meshy-blocked) Dedicated baked enemy characters to replace the visual
      stand-ins: jungle canopy-panther (image-to-3d quadruped, not the humanoid rig) +
      carnivorous-plant (animated snapping prop) + river-serpent + crystal-spider; wire new
      visual kinds. Currently they render as goblin/mushroom/flyingEye. Needs Meshy credits.
- [ ] [WAIT-USER] (Meshy-blocked) Goblin hurt/death clips (author non-loop poses) so enemies
      don't fall back to idle on hit/death; extend author_anim.py + re-bake. Needs credits.

## What CONTINUOUS means
1 never stop for status reports · 2 never stop for scope caution · 3 never stop to
summarize (git log is the summary) · 4 never stop on context pressure · 5 never stop
because a task feels big · 6 only stop on explicit user halt / red CI / genuine STOP_FAIL.
Items prefixed `[WAIT-USER]` are legitimate yields (blocked on the user's payment/input).

## Operating loop
while queue has actionable (non-WAIT) items: implement → verify (prove live) → commit →
dispatch reviewers → mark done → append discoveries → next. When only WAIT items remain,
the queue is parked on the user.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "follow-up" | "TODO" | "FIXME" |
"stub" | "placeholder" | "mock for now" | "pause point" | "natural pause" | "next session"
| "stopping point" | "clean handoff" | "ready to hand off" | "where things stand" (as a stop)
