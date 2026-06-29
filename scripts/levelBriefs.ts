/**
 * Per-level briefs — the structured form of docs/LEVEL_OUTLINE.md the genai-level
 * pipeline feeds Gemini (one object per level). The outline is the human-readable
 * spine; this is the machine-readable handoff. Keep in sync with the outline.
 */
export interface LevelBrief {
  readonly order: number;
  readonly title: string;
  readonly biome: string;
  readonly types: readonly string[];
  readonly targetMinutes: number;
  readonly beat: string;
  readonly content: string;
  readonly setpiece: string;
  readonly art: string;
}

export const LEVEL_BRIEFS: readonly LevelBrief[] = [
  {
    order: 1,
    title: "Halward's Reach",
    biome: "clifftop-village",
    types: ["platformer"],
    targetMinutes: 7,
    beat: "Dusk over a windswept clifftop village that has feared the mountain for a hundred years. Elder Mara begs Jim to end the curse before the last seal breaks.",
    content:
      "A gentle TEACHING level — run, jump, whip, talk — but already old-school: rooftop platforms over the village street (jump the houses for hidden relics), a clothesline-strung market, the cliff-edge trail east. First weak foes. A small switch-and-gate puzzle to open the trailhead. Ends at the forest treeline. Lean into vertical rooftop platforming over a contiguous-ground street.",
    setpiece: "the village square farewell (an NPC dialogue cluster — Mara, the watchman, the ferryman).",
    art: "a sea-and-mountain parallax stack (sky, distant sea+mountain, near cliffs), pitched-roof houses, tents, market stalls, the three villager NPCs, crows, the cliff trailhead gate, a relic coin, a hidden rare-relic secret.",
  },
  {
    order: 2,
    title: "The Whispering Jungle",
    biome: "deep-jungle",
    types: ["platformer", "multidirectional"],
    targetMinutes: 12,
    beat: "The trail plunges into a humid, ancient jungle that swallows sound. The trees are older than the village; something watches from the canopy.",
    content:
      "Long VERTICAL canopy platforming — vine bridges, broken boughs, mushroom shelves — a big climb up a strangler-fig tower then a descent into root-tangled dark. Carnivorous plants + jungle predators. A vine-and-weight puzzle to lower a bridge. Hidden routes through the foliage to secrets.",
    setpiece: "a collapsing log bridge over a ravine (a timed crossing).",
    art: "a 4-layer jungle parallax (canopy, trunks, ferns, foreground leaves), giant roots, vine platforms, glowing flora, a jungle-guardian NPC, snapping carnivorous plants, glow-fruit collectibles.",
  },
  {
    order: 3,
    title: "The Rushing Gorge",
    biome: "river-gorge",
    types: ["swim", "autoscroller"],
    targetMinutes: 9,
    beat: "The jungle breaks at a roaring river gorge. The only way on is down — and through the water.",
    content:
      "A water-traversal level: ride the current (gentle forced scroll), dodge rapids + rocks, dive under waterfalls, surface for air. Log rafts as moving platforms. A real change of pace + physics. Branch routes for the brave.",
    setpiece: "a waterfall plunge (a controlled fall through cascading water).",
    art: "a river-canyon parallax with mist + spray, white-water surface strips, log rafts, river serpents, a stranded boatman NPC, jutting wet rocks, floating relic collectibles.",
  },
  {
    order: 4,
    title: "The Abandoned Mine",
    biome: "collapsing-mine",
    types: ["minecart", "autoscroller"],
    targetMinutes: 7,
    beat: "Past the gorge, an old expedition's mine bores into the mountain. Their rusted cart still sits on the rails. Jim takes it.",
    content:
      "The iconic MINE-CART ride — rail surfaces with gaps to jump, low beams to duck, switches that throw branching tracks, runaway speed. Pure adrenaline, shorter. The branch choice rewards the bold with a faster, riskier line.",
    setpiece: "a broken-track leap across a lava-lit chasm.",
    art: "a mine-shaft parallax (timber supports, ore veins, distant glow), the rusted cart, rail segments, support beams, falling debris, cave bats, dynamite-crate obstacles, ore collectibles.",
  },
  {
    order: 5,
    title: "The Crystal Cavern",
    biome: "crystal-cavern",
    types: ["puzzle", "platformer"],
    targetMinutes: 13,
    beat: "The cart derails into a vast cavern of glowing crystal — beautiful and lethal. The crystals sing; the song is a warning.",
    content:
      "A long, ORNATE puzzle-platformer. Light-beam puzzles (redirect a beam through crystal receivers to open gates), reflective crystal platforms, fragile crystal bridges that shatter underfoot. The richest secrets hide here. Genuinely require the puzzles — no skipping.",
    setpiece: "a crystal collapse — the floor shatters in a chain you outrun.",
    art: "a luminous crystal parallax, crystal formations + standable platforms, geode props, light-receiver crystals (switches), crystal gates, crystal-spider foes, a lost-miner NPC, glowing shard collectibles, a rare-geode secret.",
  },
  {
    order: 6,
    title: "The Sunken Ruins",
    biome: "sunken-ruins",
    types: ["puzzle", "cinematic", "swim"],
    targetMinutes: 11,
    beat: "Below the crystal lies a drowned city older than any map — the shrine's forgotten outer temple. Half-flooded, trap-laden, watched by stone guardians.",
    content:
      "Cerebral + tense flooded platforming — rising/falling water levels (a switch raises/lowers water to change the route), pressure-plate traps, dart walls, collapsing floors, ledge-grabs. Statue guardians that wake. Deliberate, weighty, trial-and-error trap rooms.",
    setpiece: "a rising-water escape up a temple shaft.",
    art: "a drowned-temple parallax, mossy columns + arches, a waterline strip, trap props (dart walls, blades), pressure-plate switches, water-gates, animated stone-guardian foes, an awakened-warden NPC, gold-idol collectibles.",
  },
  {
    order: 7,
    title: "The Lava Temple",
    biome: "lava-temple",
    types: ["platformer", "run-and-gun"],
    targetMinutes: 13,
    beat: "Heat rises. The ruins give way to a temple built into a magma vein — the shrine's furnace heart. The seal-keepers' last defenses are here.",
    content:
      "The hardest STANDARD level — moving stone platforms over lava, fire jets on timers, crumbling obsidian, waves of fire-elemental foes (heavier combat), a gauntlet of trials. Long and punishing; a checkpoint or two so deaths cost progress but aren't cruel.",
    setpiece: "a moving-platform gauntlet across a lava lake under fire-jet barrages.",
    art: "a magma-glow parallax, obsidian temple structures, a lava-lake hazard strip, fire-jet props, moving stone platforms, fire-elemental + salamander foes, a doomed seal-keeper NPC, ember collectibles, a checkpoint shrine.",
  },
  {
    order: 8,
    title: "The Shrine of Catastrophe",
    biome: "shrine-of-catastrophe",
    types: ["platformer", "multidirectional"],
    targetMinutes: 9,
    beat: "The Shrine itself. A cracked grand staircase climbs to the golden idol on its altar. The Warden gives one last warning: the idol is not treasure — it is a door. Jim takes it anyway.",
    content:
      "The climactic ASCENT — a vertical climb through the inner sanctum of broken pillars, braziers, and guardian Wardens to the idol at the summit. Story-heavy, slightly easier (a rest valley before the finale). Reaching the idol IS the goal and triggers the catastrophe.",
    setpiece: "the idol-grab (the goal is taking the idol).",
    art: "a sanctum parallax (vine-draped green stone, blood-red sky), the cracked staircase structure, the golden idol-altar (the goal), braziers, broken pillars, skeleton-Warden foes, the Warden NPC, relic collectibles.",
  },
  {
    order: 9,
    title: "Catastrophe",
    biome: "collapsing-shrine",
    types: ["chase", "autoscroller", "minecart"],
    targetMinutes: 6,
    beat: "The instant his fingers close on the idol, the shrine answers. Red light. Splitting stone. The catastrophe the name promised. RUN.",
    content:
      "A pure-panic forced-scroll CHASE — the camera drags forward, the shrine collapses behind a wall of red light Jim must outrun. No stopping; jump the rifts, duck the falling masonry, ride a final cart out. High intensity, short, learnable on the second try (telegraphed, not memorize-or-die).",
    setpiece: "the wall-of-light pursuit (death from behind if you slow).",
    art: "a collapsing-temple parallax with red eruption light, falling-masonry obstacles, opening rifts (gap hazards), the pursuing light-wall, panic-flock bats, a final escape cart and rails.",
  },
  {
    order: 10,
    title: "The Long Way Up",
    biome: "storm-peaks",
    types: ["multidirectional", "platformer", "boss"],
    targetMinutes: 20,
    beat: "Jim bursts from the mountain into a storm at the summit — but the idol's curse has woken the mountain's guardian, a colossus of stone and red light, between him and the dawn.",
    content:
      "The LONGEST level + the campaign BOSS. A storm-lashed peak ascent (vertical), then a multi-phase boss fight against the awakened colossus (dodge, exploit openings, climb its body), then a triumphant descent to the dawn and freedom. Earns its length; the climax of two hours.",
    setpiece: "the colossus boss (3 phases) + the dawn-break escape run.",
    art: "a storm-peak parallax (lightning, churning cloud, dawn breaking), the multi-part stone-colossus boss, summit-ruin structures, the glowing idol, the final dawn vista, lightning-strike hazards, summit collectibles.",
  },
];
