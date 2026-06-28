/**
 * RotatePrompt — a full-screen overlay shown on phone-class WEB devices held in
 * portrait, asking the player to rotate to landscape (where the side-scroller
 * fills the screen). Native phones hard-lock instead, so this never shows there;
 * tablets / unfolded foldables / desktop are never lock-required, so it never
 * shows for them either.
 */
export function RotatePrompt() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#1a120b] px-8 text-center">
      <div className="animate-pulse text-6xl" aria-hidden>
        ⟳📱
      </div>
      <h2 className="font-display text-3xl text-[#e3b341]" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
        Rotate your device
      </h2>
      <p className="font-body max-w-sm text-[#f3e9d2] text-lg leading-relaxed">
        Illinois Jim is a side-scrolling adventure — turn your phone sideways to
        play in landscape.
      </p>
    </div>
  );
}
