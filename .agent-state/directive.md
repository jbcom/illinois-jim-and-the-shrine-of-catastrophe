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

## 🚀 ACTIVE MILESTONE — FULL GENAI PIVOT (user, 2026-06-29, NON-NEGOTIABLE)
Gemini crafts each level START TO FINISH — art (parallax, structures, props, NPCs,
obstacles, collectibles) AND layout — and I RENDER the structured contract. An
OLD-SCHOOL, BRUTAL, problem-solving adventure (commitment, not disposable mobile; no
month-one speedrun exploits) across 10 unique long levels (~120 min), diverse biomes.
[[gemini-crafts-whole-levels]] [[old-school-commitment-not-mobile]]
[[genai-latest-models-native-transparency]] [[levels-relative-surface-positioning]]

### Done (the pipeline foundation)
- [x] Zod `Level` schema (levelSchema.ts) — art manifest + relative surfaces +
      entities + problem-solving layer (switches/gates/keys/moving-platforms/secrets/
      checkpoints) + blended `types` + biome; parse/dangling/brokenGates/before-goal
      validators (12 tests). 10-level OUTLINE + paper-playtested ~117-min balance +
      the governing thesis (docs/LEVEL_OUTLINE.md, scripts/levelBriefs.ts).
- [x] LATEST models (live-API-verified): Nano Banana (gemini-3.1-flash-image /
      gemini-3-pro-image) via generateContent with NATIVE TRANSPARENCY (no magenta) +
      gemini-3.5-flash for the JSON. WebP curation (mobile, full-res).
- [x] PIPELINE: genai-level.ts (Gemini→valid Level→art) + prep-level.ts (trim+WebP) +
      buildFromLevel.ts (sim collision+spawns) + render/levels/fromLevel.ts (parallax+
      painting) + composition.paintArt. Level 1 generated + proven (clean art, alpha).

### Queue
- [ ] WIRE the schema-Level into the running engine: gameEcs/App load a `Level` →
      buildFromLevel + fromLevel + paintArt + spawn entities by art key. Make Level 1
      PLAYABLE on screen, live-verify (READ the screenshot), zero asset loss. [TOP]
- [ ] RETIRE the old level system once Level 1 plays via the schema path: delete the
      hand-built registry/levelSpec/specs/* + their render levels + vendor-pack shape
      catalogs + dead biome assets. One level system (the schema).
- [ ] CURATION sizing: trim isn't shrinking 2048² sprites; size source to ~2-3×
      worldHeight (match display × DPR headroom, NOT a dev downscale) — sane bundle.
- [ ] REGENERATE hero / cutscenes / wordmark / landing through Nano Banana (old
      Imagen). "all text all images go through the LATEST."
- [ ] Generate levels 2-10 once the engine path + curation are solid; live-playtest +
      re-tune lengths to the budget.
- [ ] Per-level types beyond platformer (autoscroller/minecart/swim/chase/puzzle/boss/
      run-and-gun/cinematic/multidirectional) need engine support — add per level built.

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
