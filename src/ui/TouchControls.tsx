/**
 * TouchControls — the VISIBLE on-screen controls for touch play: a joystick ring
 * on the left + JUMP / ATTACK buttons on the bottom-right. The actual input is
 * read by the invisible pointer zones on the game surface (engine/input/touch.ts);
 * this overlay just SHOWS the player where to touch (it's `pointer-events-none`, so
 * taps pass straight through to those zones — the buttons are a hint, not handlers).
 *
 * Mirrors the zones in sim/input/touchModel.ts (defaultTouchLayout): left half =
 * relative joystick, bottom-right = jump button, left-of-it = whip/attack button.
 * Only shown on touch-capable devices, and padded for safe-area insets so it never
 * sits under a notch / home bar / rounded corner.
 */
import { useEffect, useState } from "react";

/** A device with a coarse (touch) pointer — where on-screen controls belong. */
function isTouchDevice(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

export function TouchControls() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(isTouchDevice());
  }, []);
  if (!touch) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        paddingLeft: "max(env(safe-area-inset-left), 16px)",
        paddingRight: "max(env(safe-area-inset-right), 16px)",
      }}
      aria-hidden="true"
    >
      {/* LEFT: the movement joystick ring (drag anywhere on the left to steer). */}
      <div className="absolute bottom-[8%] left-[6%]">
        <div className="relative flex items-center justify-center rounded-full border-2 border-[#e3b341]/50 bg-[#1a120b]/35 backdrop-blur-[1px] h-[clamp(84px,17vmin,150px)] w-[clamp(84px,17vmin,150px)]">
          {/* The knob hint in the center. */}
          <div className="rounded-full border-2 border-[#e3b341]/70 bg-[#e3b341]/25 h-[42%] w-[42%]" />
          {/* Directional ticks. */}
          <span className="absolute top-1 font-pixel text-[#e3b341]/70 text-xs">▲</span>
          <span className="absolute bottom-1 font-pixel text-[#e3b341]/70 text-xs">▼</span>
          <span className="absolute left-1 font-pixel text-[#e3b341]/70 text-xs">◀</span>
          <span className="absolute right-1 font-pixel text-[#e3b341]/70 text-xs">▶</span>
        </div>
      </div>

      {/* RIGHT: action buttons. ATTACK sits left of JUMP, matching the input zones
          (whipButton is left-of + slightly above jumpButton in defaultTouchLayout). */}
      <div className="absolute right-[6%] bottom-[8%] flex items-end gap-[clamp(12px,3vmin,28px)]">
        <ActionButton label="ATK" sub="attack" />
        <ActionButton label="JMP" sub="jump" big />
      </div>
    </div>
  );
}

function ActionButton({ label, sub, big = false }: { label: string; sub: string; big?: boolean }) {
  const size = big ? "h-[clamp(72px,15vmin,128px)] w-[clamp(72px,15vmin,128px)]" : "h-[clamp(60px,12vmin,104px)] w-[clamp(60px,12vmin,104px)] mb-[clamp(6px,2vmin,18px)]";
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-full border-2 border-[#5a3a12] bg-[#e3b341]/85 shadow-[0_3px_0_#5a3a12] ${size}`}
    >
      <span className="font-display font-extrabold tracking-wider text-[#1a120b] text-[clamp(0.8rem,2.6vmin,1.2rem)]">{label}</span>
      <span className="font-pixel text-[#5a3a12] text-[clamp(0.5rem,1.4vmin,0.7rem)] opacity-80">{sub}</span>
    </div>
  );
}
