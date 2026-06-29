---
title: Level Outline — the 10-level adventure spine
updated: 2026-06-29
status: current
domain: creative
---

# Illinois Jim and the Shrine of Catastrophe — the 10-level spine

The campaign Gemini crafts (art + layout + entities), one `Level` object per level
conforming to `src/sim/world/levelSchema.ts`. This document is the STORY SPINE +
per-level brief Gemini works from: the beat, the biome, the mechanic, the setpiece,
and the rough content budget. Ten **unique, long, fun** levels — each ~10 minutes
(range 5–15), **~120 minutes total**. No two biomes or mechanics feel the same.

**The arc:** a treasure-hunter answers a doomed village's plea, crosses a wild
continent of jungles, rivers, and mines to reach the Shrine of Catastrophe, takes
the cursed idol, and outruns the apocalypse he unleashes back to daylight.

Pacing rule of thumb: ~10 min ≈ a long, dense level with several distinct
sub-areas, a midpoint setpiece, and a climb in difficulty. Length scales with
`targetMinutes`. Every level has its OWN parallax stack, midground structures,
props, NPCs, obstacles, and collectibles — all generated.

---

> **Level types blend.** Each level lists a SET of mechanics (schema `types`),
> first = dominant. Researched archetypes (Wikipedia/GameDeveloper): platformer,
> autoscroller (forced-pace camera), minecart, swim, chase, boss, puzzle
> (light-beams/switches/water-levels — Fez/Lost Vikings/Wario Land), run-and-gun
> (Contra/Metal Slug), cinematic (Prince-of-Persia ledge-grabs + trap rooms),
> multidirectional (vertical scroll — Strider/Sonic). A type can recur across
> levels and several can combine in one. No three consecutive levels share a
> dominant type.

## 1 — Halward's Reach  ·  biome: clifftop-village  ·  [platformer]  ·  ~8 min
**Beat:** Dusk over a windswept clifftop village that has feared the mountain for a
hundred years. Elder Mara begs Jim to end the curse before the last seal breaks.
**Content:** A gentle teaching level — run, jump, whip, talk. Rooftop platforms
over the village street (jump the houses for hidden relics), a clothesline-strung
market, the cliff-edge trail east. First weak foes. Ends at the forest treeline.
**Setpiece:** the village square farewell (NPC dialogue cluster).
**Art:** sea-and-mountain parallax, pitched-roof houses, tents, market stalls,
villagers (Mara, the watchman, the ferryman), crows, the cliff trailhead.

## 2 — The Whispering Jungle  ·  biome: deep-jungle  ·  [platformer, multidirectional]  ·  ~11 min
**Beat:** The trail plunges into a humid, ancient jungle that swallows sound. The
trees are older than the village; something watches from the canopy.
**Content:** Vertical canopy platforming — vine bridges, broken boughs, mushroom
shelves. Carnivorous plants + jungle predators. A long climb up a strangler-fig
tower, then a descent into root-tangled dark. Dense, layered foliage parallax.
**Setpiece:** a collapsing log bridge over a ravine (timed crossing).
**Art:** 4-layer jungle parallax (canopy→trunks→ferns→foreground leaves), giant
roots, vine platforms, glowing flora, a jungle-guardian NPC, snapping plants.

## 3 — The Rushing Gorge  ·  biome: river-gorge  ·  [swim, autoscroller]  ·  ~9 min
**Beat:** The jungle breaks at a roaring river gorge. The only way on is down — and
through the water.
**Content:** A water-traversal level: ride the current, dodge rapids + rocks, dive
under waterfalls, surface for air. Log rafts as moving platforms. Real change of
pace + physics from the platforming levels.
**Setpiece:** a waterfall plunge (controlled fall through cascading water).
**Art:** river-canyon parallax with mist + spray, white-water surface, rafts,
river serpents, a stranded boatman NPC, jutting wet rocks.

## 4 — The Abandoned Mine  ·  biome: collapsing-mine  ·  [minecart, autoscroller]  ·  ~7 min
**Beat:** Past the gorge, an old expedition's mine bores into the mountain. Their
rusted cart still sits on the rails. Jim takes it.
**Content:** The iconic MINE-CART ride — rails with gaps to jump, low beams to duck,
switches, branching tracks, runaway-cart speed. Pure adrenaline, shorter.
**Setpiece:** a broken-track leap across a lava-lit chasm.
**Art:** mine-shaft parallax (timber supports, ore veins, distant glow), the rusted
cart, rails, support beams, falling debris, cave bats, dynamite crates.

## 5 — The Crystal Cavern  ·  biome: crystal-cavern  ·  [puzzle, platformer]  ·  ~12 min
**Beat:** The cart derails into a vast cavern of glowing crystal — beautiful and
lethal. The crystals sing; the song is a warning.
**Content:** A long, ornate level. Reflective crystal platforms, light-beam puzzles
(redirect a beam to open a way), fragile crystal bridges that shatter underfoot.
Sparkling, luminous parallax. The richest collectibles cluster here.
**Setpiece:** a crystal collapse — the floor shatters in a chain you outrun.
**Art:** luminous crystal parallax, crystal formations + platforms, geode props,
crystal-spider foes, a lost-miner NPC, glowing shards (collectibles).

## 6 — The Sunken Ruins  ·  biome: sunken-ruins  ·  [puzzle, cinematic, swim]  ·  ~11 min
**Beat:** Below the crystal lies a drowned city older than any map — the shrine's
forgotten outer temple. Half-flooded, trap-laden, watched by stone guardians.
**Content:** Flooded platforming — submerged corridors, rising/falling water levels
that change the route, pressure-plate traps, dart walls, collapsing floors. Cerebral
and tense. Statue guardians that wake.
**Setpiece:** a rising-water escape up a temple shaft.
**Art:** drowned-temple parallax, mossy columns + arches, waterline, trap props
(darts, blades), animated stone guardians, an awakened-warden NPC, gold idols.

## 7 — The Lava Temple  ·  biome: lava-temple  ·  [platformer, run-and-gun]  ·  ~13 min
**Beat:** Heat rises. The ruins give way to a temple built into a magma vein — the
shrine's furnace heart. The seal-keepers' last defenses are here.
**Content:** The hardest standard level. Moving stone platforms over lava, fire
jets on timers, crumbling obsidian, fire-elemental foes, a gauntlet of trials. Long
and punishing, with checkpily dense reward.
**Setpiece:** a moving-platform gauntlet across a lava lake under fire-jet barrages.
**Art:** magma-glow parallax, obsidian temple structures, lava lake, fire-jet props,
fire-elemental + salamander foes, a doomed seal-keeper NPC, ember collectibles.

## 8 — The Shrine of Catastrophe  ·  biome: shrine-of-catastrophe  ·  [platformer, multidirectional]  ·  ~10 min
**Beat:** The Shrine itself. A cracked grand staircase climbs to the golden idol on
its altar. The Warden gives one last warning: the idol is not treasure — it is a
door. Jim takes it anyway.
**Content:** The climactic ascent — a vertical climb through the inner sanctum of
broken pillars, braziers, and guardian Wardens to the idol at the summit. Reaching
it triggers the catastrophe.
**Setpiece:** the idol-grab (the goal IS taking the idol).
**Art:** sanctum parallax (vine-draped green stone, blood-red sky), the cracked
staircase, the golden idol-altar, braziers, broken pillars, skeleton Wardens.

## 9 — Catastrophe  ·  biome: collapsing-shrine  ·  [chase, autoscroller, minecart]  ·  ~8 min
**Beat:** The instant his fingers close on the idol, the shrine answers. Red light.
Splitting stone. The catastrophe the name promised. RUN.
**Content:** A forced-scroll CHASE — the camera drags right (or up), the shrine
collapses behind a wall of red light Jim must outrun. No stopping; jump the rifts,
duck the falling masonry, ride a final cart out. High-intensity, shorter.
**Setpiece:** the wall-of-light pursuit (death from behind if you slow).
**Art:** collapsing-temple parallax with red eruption light, falling masonry,
rifts opening, the pursuing light wall, panic-flock bats, no foes to fight (the
shrine IS the enemy).

## 10 — The Long Way Up  ·  biome: storm-peaks  ·  [multidirectional, platformer, boss]  ·  ~15 min
**Beat:** Jim bursts from the mountain into a storm at the summit — but the idol's
curse has woken the mountain's guardian, a colossus of stone and red light, between
him and the dawn. The final stand, then the long climb down into daylight.
**Content:** The longest level + the campaign BOSS. A storm-lashed peak ascent, then
a multi-phase boss fight against the awakened colossus (dodge, exploit openings,
climb its body), then a triumphant descent to the dawn and freedom.
**Setpiece:** the colossus boss (3 phases) + the dawn-break escape run.
**Art:** storm-peak parallax (lightning, churning cloud, dawn breaking), the stone
colossus boss (multi-part), summit ruins, the idol glowing, the final dawn vista.

---

## Cross-campaign notes for Gemini
- **Each level is self-contained**: its own art manifest (parallax + structures +
  props + NPCs + obstacles + collectibles), surfaces, and entities. No shared
  vendor packs — generate everything in the consistent 16-bit pulp-adventure style.
- **Style anchor:** limited retro palette of obsidian, tarnished gold, blood red,
  parchment, teal; dramatic lighting; the mood of an early-90s SNES/Genesis pulp
  adventure. Jim is the warm, devil-may-care hero already established.
- **Mechanic variety** keeps 120 min fresh: platformer (1,2,5,6,7,8,10), swim (3),
  minecart (4), chase (9), boss (10). No three consecutive levels share a mechanic.
- **Difficulty curve:** gentle teach (1) → rising (2-7) → climax (8) → panic (9) →
  hardest + boss (10). Reward density rises with difficulty.
- **Length:** size each level's surfaces so a careful playthrough fills its
  `targetMinutes`; the sum targets ~120 min.
