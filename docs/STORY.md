---
title: Story & Campaign Structure
updated: 2026-06-29
status: current
domain: creative
---

# Story & Campaign Structure

How the adventure is sequenced, and how it expands. The shipped game is a complete
**5-level arc** ending on a cliffhanger that frames levels 6–10 as the next chapter.

## Single source of truth — `src/sim/story/campaign.ts`

The `CAMPAIGN` array is the ONE place the story order lives. Everything derives from it:

- **Level order / first level / next level** — `src/render/levels/registry.ts` derives
  `LEVEL_ORDER`, `FIRST_LEVEL_ID`, and `nextLevelId` from `campaignLevelOrder()` /
  `firstLevelId()` / `nextCampaignLevelId()`.
- **Cutscene chain** — `src/sim/story/cutscenes.ts` builds `CUTSCENES` from the campaign:
  one intro cutscene per chapter (leading into its level) + the `CLIFFHANGER` ending.
- **Flow routing** — `src/ui/gameMachine.ts` resolves cutscene↔level transitions through
  the campaign; the `won` state is reached when the `CLIFFHANGER` cutscene completes.

Each `CampaignChapter` = `{ levelId, introCutscene, lines, image }`. The narration
mirrors the level brief `beat` (`scripts/levelBriefs.ts`).

### To add a level (6–10)

1. Author + bake the level (see `docs/PIPELINE.md` / the genai-level-pipeline memory),
   register its bundle in `registry.ts`.
2. Append one `CampaignChapter` to `CAMPAIGN`.

That's it. The level order, its intro cutscene, and the cliffhanger placement all follow
automatically — the cliffhanger is defined as "the cutscene after the final chapter", so
it relocates to the new last level with no edits.

## The shipped 5-level arc

| # | Level | Biome | Cutscene before it |
|---|-------|-------|--------------------|
| 1 | Halward's Reach | clifftop village | `intro` (cut-intro-village) |
| 2 | The Whispering Jungle | deep jungle | `jungle` (cut-jungle) |
| 3 | The Rushing Gorge | river gorge | `gorge` (cut-gorge) |
| 4 | The Abandoned Mine | collapsing mine | `mine` (cut-mine) |
| 5 | The Crystal Cavern | crystal cavern | `crystal` (cut-crystal) |
| — | *(ending)* | — | `cliffhanger` (cut-cliffhanger) |

Each level: Gemini-authored schema JSON (validated — 0 dangling art / 0 broken gates) +
curated 2D parallax + baked transparent 3D props + a registered live bundle, all
Chrome-verified with zero console errors. The full chain is locked by
`tests/unit/gameMachine.test.ts` and `tests/unit/campaign.test.ts`.

## Cutscene art

Six scenes, each painted in three aspect crops (`-16x9` / `-9x16` / `-1x1`.png) via
`scripts/gen-cutscenes.ts` (Gemini PRO image path — no Meshy). `src/ui/aspectImage.ts`
picks the crop for the viewport; `src/ui/CutscenePlayer.tsx` fades through the narration.

## The 10-level vision

The full outline lives in `docs/LEVEL_OUTLINE.md` + `scripts/levelBriefs.ts` (briefs for
all 10). Levels 6–10 (sunken ruins → lava temple → the shrine → catastrophe → the long
way up) are authored the same way and appended to `CAMPAIGN`. They are currently gated
only by Meshy credit (each needs ~10 baked 3D props) — see `.agent-state/directive.md`.
