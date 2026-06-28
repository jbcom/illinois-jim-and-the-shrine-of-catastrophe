---
title: Level Design Reference
updated: 2026-06-28
status: current
domain: creative
---

# Level Design Reference

Concrete, sourced numbers for authoring Illinois Jim levels, derived from classic
late-80s/early-90s 16-bit + arcade side-scrollers (Sonic Retro SPG, copetti.org
SNES/Genesis hardware analyses, MarioWiki/Wikipedia game pages). The painting
engine authors each level as composed organic shape stamps over a parallax stack,
backed by a separate invisible collision tilemap — these numbers set the SCALE.

## Units

- **Tile = 32px** (a clean 2× of the classic 16×16 logical metatile; collision is
  authored one 32px tile = one collision cell, the Sonic/SMW convention scaled up).
- **1 screen-width = 17 tiles = 544 world-px** (the camera shows ~17 tiles across).
- **Camera height ≈ 10 tiles = 320 world-px** (mobile-first landscape).

## Level dimensions (the authoring table)

| Level type   | Screens | **Width (world-px)** | Width (tiles) | Vertical band      | Enemies/screen | Setpieces |
|--------------|---------|----------------------|---------------|--------------------|----------------|-----------|
| Short intro  | 3–4     | **1,600–2,200**      | 51–68         | flat **320** (10t) | 1–2            | 0–1 teach |
| Standard     | 6–8     | **3,300–4,400**      | 102–136       | mild **480** (15t) | 2–4            | 1 hook    |
| Long climax  | 11–14   | **6,000–7,600**      | 187–238       | multi **800** (25t)| 3–5            | 2–3       |

Supporting targets:
- **Hazards/screen:** 1–2 early → 2–4 late. **Platforms/screen:** 3–6 in platforming stretches.
- **Secrets:** ~1 per 2–3 screens (1–2 short, 4–5 climax).
- **Clear time:** intro ~45–70s; standard ~80–110s; climax ~2–2.5min (~12s/screen walking pace).
- **Checkpoint** at ~50% width on standard/climax levels.

## Beat structure (mirror this per level)

1. **Safe runway** (½–1 screen): no threats; establish the biome, let the player move.
2. **First threat** introduced in isolation (1 screen).
3. **Escalation**: that threat combined with a hazard / verticality (2–3 screens).
4. **Setpiece** — the iconic moment (mine-cart rail, chase, collapsing room) — 1 per standard level.
5. **Cooldown + miniboss/gate** before the exit. Checkpoint ~halfway.

## Vertical complexity by biome

- **Cave (combat gauntlet):** flat-ish, 1–1.5 screen-heights, dense — Castlevania/Contra feel.
- **Overworld (exploration):** mild verticality (1.5–2 screen-heights), upper/lower routes,
  NPCs + secrets — Super Mario World feel.
- **Shrine (climax):** multi-tier (2.5 screen-heights), escalating setpieces ending on a boss/gate.

## Game shape

~12–18 distinct levels across **overworld → cave → shrine**, one setpiece-defining
hook per standard level, each split by a full-screen GenAI cutscene. Difficulty ramps
within a level (safe → combine → setpiece) and across the game (more types + density late).

Sources: Sonic Retro SPG (Camera/Solid Tiles/Basics), copetti.org SNES & Genesis
architecture, Wikipedia/MarioWiki (Sonic 1, SMW, Castlevania, Contra, Ghosts 'n
Goblins, Strider, Shinobi, Prince of Persia, Metal Slug).
