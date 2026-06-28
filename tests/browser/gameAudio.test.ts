import { createGameAudio, type GameSound } from "@audio/gameAudio.ts";
import { afterEach, describe, expect, it } from "vitest";

describe("game audio (event → sfx wiring)", () => {
  let audio: ReturnType<typeof createGameAudio> | undefined;
  afterEach(() => {
    audio?.destroy();
    audio = undefined;
  });

  it("creates without throwing and pre-renders the bank", () => {
    audio = createGameAudio();
    expect(audio).toBeTruthy();
  });

  it("plays every gameplay sound without error", async () => {
    audio = createGameAudio();
    await audio.unlock();
    const sounds: GameSound[] = ["jump", "land", "hurt", "pickup", "whip", "potSmash", "win"];
    for (const s of sounds) {
      expect(() => audio?.play(s)).not.toThrow();
    }
  });

  it("mute/unmute toggles without error", () => {
    audio = createGameAudio();
    expect(() => {
      audio?.setMuted(true);
      audio?.setMuted(false);
    }).not.toThrow();
  });
});
