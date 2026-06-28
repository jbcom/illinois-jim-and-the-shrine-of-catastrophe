/**
 * Landing — the dedicated title scene (React + Tailwind), a SEPARATE static page,
 * NOT the live game engine. It paints the GenAI key-art of Illinois Jim over the
 * overworld (teal vest, brass goggles, raised relic-lantern, the village below
 * and the red-lit shrine on the dark mountain) and overlays the curated wordmark,
 * the story hook, and PLAY. The engine canvas stays hidden behind it until play
 * begins, so the title is a crafted illustration — not a paused gameplay frame.
 */
import { assetUrl } from "@/assetUrl.ts";
import { TITLE } from "@/brand.ts";
import { aspectImagePath, useViewportAspect } from "@ui/aspectImage.ts";

const HERO_BASE = assetUrl("assets/branding/landing-hero");
const WORDMARK = assetUrl("assets/branding/title-wordmark.png");

export function Landing(props: { onStart: () => void }) {
  const aspect = useViewportAspect();
  return (
    <section className="absolute inset-0 overflow-hidden bg-[#1a120b]">
      {/* GenAI hero key-art — the aspect variant composed for this viewport, so a
          portrait phone gets the portrait crop (full-body hero) not a side-cropped
          landscape. */}
      <img
        src={aspectImagePath(HERO_BASE, aspect)}
        alt="Illinois Jim raising his relic-lantern toward the shrine on the mountain"
        className="absolute inset-0 h-full w-full object-cover object-center"
        style={{ imageRendering: "pixelated" }}
      />
      {/* Legibility scrim — darkens the top + bottom so text reads over the art. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a120b]/85 via-transparent to-[#1a120b]/90" />

      {/* Content column — wordmark up top, hook + PLAY anchored to the bottom.
          Safe-area padding so the controls line never clips under the home bar. */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-between"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 3vh)",
          paddingBottom: "max(env(safe-area-inset-bottom), 3vh)",
          // Landscape phones notch on the sides — pad left/right too.
          paddingLeft: "max(env(safe-area-inset-left), 4vw)",
          paddingRight: "max(env(safe-area-inset-right), 4vw)",
        }}
      >
        {/* The curated GenAI wordmark (carved-stone gold, transparent) — pinned in
            its own scrim panel at the very top so it always reads cleanly and never
            sits over the hero's FACE across aspects (the portrait art puts the face
            high). Narrower on tall viewports so it stays in the sky band above Jim. */}
        <div
          className="flex w-full justify-center rounded-b-xl bg-gradient-to-b from-[#1a120b]/80 to-transparent px-4 pb-6"
          style={{
            // Pull the scrim to the absolute top (cancel the parent's top padding)
            // and re-add the safe-area inset inside, so the gradient starts at the
            // very edge with no seam below a notch.
            marginTop: "calc(-1 * max(env(safe-area-inset-top), 3vh))",
            paddingTop: "max(env(safe-area-inset-top), 3vh)",
          }}
        >
          <img
            src={WORDMARK}
            alt={TITLE}
            className="w-[min(78vw,640px)] portrait:w-[min(66vw,520px)] drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="flex flex-col items-center gap-5 px-6">
          <p
            className="font-body max-w-2xl text-center text-[#f3e9d2] leading-relaxed"
            style={{ fontSize: "clamp(0.95rem, 3.4vw, 1.4rem)", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
          >
            The village of Halward's Reach has feared the mountain for a hundred years.
            The last seal has cracked — and the Shrine of Catastrophe is waking. Take up
            the lantern, grab the idol, and outrun the dark.
          </p>
          <button
            type="button"
            onClick={props.onStart}
            className="font-display pointer-events-auto rounded-lg border-2 border-[#5a3a12] bg-[#e3b341] px-10 py-3 font-extrabold tracking-[0.2em] text-[#1a120b] shadow-[0_4px_0_#5a3a12,0_8px_20px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-[0_1px_0_#5a3a12]"
            style={{ fontSize: "clamp(1.1rem, 5vw, 1.6rem)" }}
          >
            PLAY
          </button>
          <p className="font-pixel text-center text-[#c9a14a] text-xs opacity-80 sm:text-sm">
            A 16-bit pulp adventure · arrow keys / touch to move · ↑ jump · attack to smash
          </p>
        </div>
      </div>
    </section>
  );
}
