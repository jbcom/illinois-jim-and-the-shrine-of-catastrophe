# Feature: 5-Level Campaign Restructure + Directive Compression

**Created**: 2026-06-29
**Version**: 2.88
**Timeframe**: Single session
**Config**: stop_on_failure=true, auto_commit=true

## Priority: Critical (ship a complete 5-level game; keep expansion to 10 frictionless)

## Overview

Two intertwined goals:

1. **Ship a complete 5-level story arc now** using the five live GenAI baked levels
   (Halward's Reach → Whispering Jungle → Rushing Gorge → Abandoned Mine → Crystal
   Cavern), bridged by cutscenes, ending on a cliffhanger that frames levels 6–10 as
   the next chapter. Expanding to 10 next month must be a one-line append.

2. **Compress the agent-state directive**: move all 37 completed `[x]` items into
   durable pillar docs (`docs/STATE.md` + a new `docs/STORY.md`/`docs/PIPELINE.md` as
   fits) and strip `.agent-state/directive.md` down to only the live/wait items + the
   campaign plan. The directive is the running queue, not a history log.

Approved design: a single ordered `CAMPAIGN` array is the source of truth; `LEVEL_ORDER`,
`FIRST_LEVEL_ID`, `nextLevelId`, and the cutscene chain all derive from it. Legacy
shape-stamp levels are deleted fully. Fresh cutscene art via the Gemini parallax path
(no Meshy — no credit blocker).

## Tasks

- [ ] P1: Create the CAMPAIGN single-source-of-truth (src/sim/story/campaign.ts)
- [ ] P1: Rewrite cutscenes.ts for the 5-level chain + cliffhanger, beats from briefs
- [ ] P1: Derive registry LEVEL_ORDER / FIRST_LEVEL_ID / nextLevelId from CAMPAIGN
- [ ] P1: Simplify gameMachine cutscene↔level chaining to CAMPAIGN lookups
- [ ] P2: Delete legacy shape-stamp levels (render + sim specs + exports) and callers
- [ ] P2: Remove/rewrite the 7 legacy-level test files; keep suite green
- [ ] P2: Generate + curate 6 fresh cutscene scenes (Gemini, 3 aspect variants each)
- [ ] P1: Live-verify the full 5-level campaign chain end-to-end in Chrome
- [ ] P3: Compress directive — completed [x] items → pillar docs; trim directive to live items

## Dependencies

- "Derive registry from CAMPAIGN" depends on "Create CAMPAIGN"
- "Rewrite cutscenes" depends on "Create CAMPAIGN"
- "Simplify gameMachine" depends on "Derive registry from CAMPAIGN" + "Rewrite cutscenes"
- "Remove legacy test files" depends on "Delete legacy levels"
- "Live-verify campaign" depends on all P1/P2 implementation tasks
- "Compress directive" depends on "Live-verify campaign" (record the shipped state accurately)

## Acceptance Criteria

### Create CAMPAIGN single source of truth
- `src/sim/story/campaign.ts` exists, exports `CAMPAIGN: CampaignChapter[]` with the 5
  GenAI level ids in story order, each paired with its intro cutscene id.
- Exports derived helpers OR the registry/cutscenes import CAMPAIGN to derive order.
- `pnpm exec tsc -b --noEmit` exits 0.

### Rewrite cutscenes for the 5-level chain
- `CUTSCENES` contains exactly: intro + 4 bridge beats (jungle/gorge/mine/crystal) +
  cliffhanger; no references to legacy level ids (village-approach/cave-descent/…).
- Each bridge cutscene's narration derives from / matches the corresponding level brief
  `beat`. The cliffhanger has no `nextLevel` (it is the ending for the 5-level cut).
- Unit test asserts every cutscene's `nextLevel` (when present) is a real CAMPAIGN level id.

### Derive registry order from CAMPAIGN
- `LEVEL_ORDER`, `FIRST_LEVEL_ID`, `nextLevelId` are derived from CAMPAIGN (no hardcoded
  legacy ids). `FIRST_LEVEL_ID === "halward-s-reach"`; `nextLevelId("the-crystal-cavern")`
  is `undefined` (last of the 5).
- genaiBundle.test still green; add an assertion that LEVEL_ORDER === the 5 GenAI ids.

### Simplify gameMachine chaining
- `levelAfterCutscene` / `cutsceneAfterLevel` resolve via CAMPAIGN; the full chain
  intro→…→crystal→cliffhanger→won is covered by gameMachine.test (rewrite the existing
  village→cave→shrine chain test to the new 5-level chain).
- `pnpm test` green.

### Delete legacy shape-stamp levels
- `src/render/levels/{caveDescent,escapeRun,shrineApproach,shrineHeart,villageApproach}.ts`
  and `src/sim/world/specs/{same}.ts` removed; their exports in gameLevel.ts and any
  now-unused overworldShapes.ts removed; registry has no legacy entries.
- `grep -rn "village-approach\|cave-descent\|shrine-approach\|shrine-heart\|escape-run"
  src/` returns nothing (outside historical comments).
- `pnpm exec tsc -b --noEmit` exits 0.

### Remove/rewrite legacy test files
- The 7 legacy-coupled test files (villageRenderer, shrineRenderer, climaxRenderer,
  composition, villageFrameGeometry, levelSpec, the legacy parts of gameLevel.test) are
  deleted or rewritten to target the GenAI levels.
- `pnpm test` AND `pnpm test:browser` both green.

### Generate fresh cutscene art
- 6 cutscene scenes generated via the Gemini path (scripts/gen-level-parallax style or a
  cutscene variant) and curated to `public/assets/cutscenes/<id>-{16x9,9x16,1x1}.webp`
  for intro/jungle/gorge/mine/crystal/cliffhanger.
- CutscenePlayer resolves each cutscene image with no 404 (verified in Chrome console).

### Live-verify the full campaign
- `pnpm dev`; play (or `?level=` + cutscene flow) shows intro→jungle→gorge→mine→crystal→
  cliffhanger with zero console errors; screenshot read and confirmed to read as a
  cohesive 5-level arc.
- `pnpm build` exits 0.

### Compress the directive
- All 37 completed `[x]` items are summarized into pillar docs (`docs/STATE.md` updated
  with the shipped 5-level state + pipeline learnings; story/campaign structure documented).
- `.agent-state/directive.md` trimmed to: the mandate/preamble + the live CAMPAIGN plan +
  the 3 `[WAIT-USER]` Meshy items + the next-chapter (levels 6–10) plan. No completed-item
  history remains in the directive (it lives in the pillar docs / git history).
- `decisions.ndjson` untouched (append-only audit trail).

## Technical Notes

- Cutscene art generation must NOT use Meshy (credits exhausted). Use the Gemini image
  path only — extend scripts/gen-level-parallax.ts or add a small cutscene generator.
- Keep all changes on the current feature branch `feat/shrine-heart`; one commit per task.
- The cliffhanger is defined as "the cutscene after the final CAMPAIGN chapter" so that
  appending level 6 next month auto-relocates it — verify this is data-derived, not hardcoded.
- Commit-gate: render/UI changes need a visual-test update or a ≥10-word `// no-visual-impact`
  override + a `pnpm test:browser` pass; sim/engine changes need a unit test.

## Risks

- Legacy deletion is wide (≈20 files incl. 7 test files) — risk of a dangling import or a
  test that secretly depended on a legacy spec. Mitigate: move every caller same pass, run
  full tsc + test + test:browser after the deletion task before proceeding.
- Cutscene aspect-variant naming must match aspectImage.ts exactly or images 404.
- Directive compression must not lose a still-live obligation — only `[x]` items move out;
  every `[ ]`/`[WAIT-USER]` item stays.
