/**
 * The campaign — the SINGLE source of truth for the game's level order and the
 * cutscenes that bridge them. Everything else derives from this array:
 *   - the playable level order + "first level" + "next level" (registry.ts)
 *   - the cutscene chain intro → bridge → … → cliffhanger (cutscenes.ts)
 *   - the gameMachine's cutscene↔level routing
 *
 * Shipping a complete arc is a slice of this array; EXPANDING the game is a one-line
 * append. Each chapter pairs a live GenAI level bundle id with the cutscene shown
 * BEFORE it (its "intro"). The story runs:
 *
 *   introCutscene(ch0) → level(ch0) → introCutscene(ch1) → level(ch1) → … →
 *   level(chLast) → CLIFFHANGER cutscene → win.
 *
 * The cliffhanger is defined as "the cutscene after the final chapter" (CLIFFHANGER_ID),
 * NOT a hardcoded level — so appending chapter N+1 automatically relocates the ending to
 * the new last level. Today the arc ends at The Crystal Cavern; levels 6-10 append here.
 *
 * Pure data — no DOM, no engine imports. The narration mirrors each level's brief beat
 * (scripts/levelBriefs.ts) so authoring a level already authors its bridge.
 */

export interface CampaignChapter {
  /** The live GenAI level bundle id (registry.ts REGISTRY key). */
  readonly levelId: string;
  /** The cutscene id shown immediately BEFORE this chapter's level. */
  readonly introCutscene: string;
  /** Narration lines for that intro cutscene (mirrors the level brief beat). */
  readonly lines: readonly string[];
  /** Base path of the cutscene scene image (no extension / aspect variant). */
  readonly image: string;
}

/** The cutscene id for the "to be continued" ending after the final chapter. */
export const CLIFFHANGER_ID = "cliffhanger";

const CUT = "assets/cutscenes";

/**
 * The ordered campaign. APPEND a chapter to extend the game — the order, the chain,
 * and the cliffhanger placement all follow automatically.
 */
export const CAMPAIGN: readonly CampaignChapter[] = [
  {
    levelId: "halward-s-reach",
    introCutscene: "intro",
    image: `${CUT}/cut-intro-village`,
    lines: [
      "The village of Halward's Reach has feared the mountain for a hundred years.",
      "Elder Mara says the last seal has cracked. The Shrine of Catastrophe is waking.",
      "Illinois Jim came for the idol's gold. He is starting to wish he hadn't.",
    ],
  },
  {
    levelId: "the-whispering-jungle",
    introCutscene: "jungle",
    image: `${CUT}/cut-jungle`,
    lines: [
      "The trail plunges into a humid, ancient jungle that swallows sound.",
      "The trees are older than the village. Something watches from the canopy.",
      "The birds have stopped singing. To go on, Jim must climb.",
    ],
  },
  {
    levelId: "the-rushing-gorge",
    introCutscene: "gorge",
    image: `${CUT}/cut-gorge`,
    lines: [
      "The jungle breaks at a roaring river gorge.",
      "The only way on is down — and through the white water.",
      "A stranded boatman points at the rocks and shakes his head.",
    ],
  },
  {
    levelId: "the-abandoned-mine",
    introCutscene: "mine",
    image: `${CUT}/cut-mine`,
    lines: [
      "Past the gorge, an old expedition's mine bores into the mountain.",
      "Their rusted cart still sits on the rails where they left it.",
      "Jim takes it. The dark takes him.",
    ],
  },
  {
    levelId: "the-crystal-cavern",
    introCutscene: "crystal",
    image: `${CUT}/cut-crystal`,
    lines: [
      "The cart derails into a vast cavern of glowing crystal — beautiful and lethal.",
      "The crystals sing. The song is a warning.",
      "A lost miner whispers: 'Don't listen. And don't touch the bridges.'",
    ],
  },
];

/** The cliffhanger ending cutscene — shown after the final chapter's level is cleared. */
export const CLIFFHANGER: { readonly id: string; readonly image: string; readonly lines: readonly string[] } = {
  id: CLIFFHANGER_ID,
  image: `${CUT}/cut-cliffhanger`,
  lines: [
    "Beyond the singing crystal, the cavern floor falls away into a drowned dark.",
    "Far below, half-flooded ruins older than any map — and past them, a red glow.",
    "The Shrine of Catastrophe is still waking. Jim wipes the dust from his hat.",
    "He has come too far to turn back now. The descent continues…",
  ],
};

/** The level the story opens on (the first chapter's level). */
export function firstLevelId(): string {
  return CAMPAIGN[0]?.levelId ?? "";
}

/** The play order of the campaign's levels (drives "next level"). */
export function campaignLevelOrder(): readonly string[] {
  return CAMPAIGN.map((c) => c.levelId);
}

/** The level that FOLLOWS `id` in the campaign (undefined if it's the last). */
export function nextCampaignLevelId(id: string): string | undefined {
  const i = CAMPAIGN.findIndex((c) => c.levelId === id);
  return i >= 0 && i < CAMPAIGN.length - 1 ? CAMPAIGN[i + 1]?.levelId : undefined;
}

/** The chapter whose level is `id` (undefined if not a campaign level). */
export function chapterForLevel(id: string): CampaignChapter | undefined {
  return CAMPAIGN.find((c) => c.levelId === id);
}

/** The chapter introduced by cutscene `cutsceneId` (undefined for the cliffhanger). */
export function chapterForIntro(cutsceneId: string): CampaignChapter | undefined {
  return CAMPAIGN.find((c) => c.introCutscene === cutsceneId);
}
