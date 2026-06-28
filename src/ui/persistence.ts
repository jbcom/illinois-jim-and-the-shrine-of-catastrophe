/**
 * Persistence — durable best-score + story progress via @capacitor/preferences
 * (backed by localStorage on web, native KV on Android). Small async wrapper;
 * the UI loads on mount and saves on result screens.
 */
import { Preferences } from "@capacitor/preferences";

const BEST_SCORE = "shrine.bestScore";
const PROGRESS = "shrine.progress"; // highest level index reached

/** Read the saved best score (0 if none / unreadable). */
export async function loadBestScore(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: BEST_SCORE });
    const n = value ? Number.parseInt(value, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist the best score if it beats the stored one; returns the stored best. */
export async function saveBestScore(score: number): Promise<number> {
  const prev = await loadBestScore();
  const best = Math.max(prev, score);
  if (best !== prev) {
    try {
      await Preferences.set({ key: BEST_SCORE, value: String(best) });
    } catch {
      /* best-effort; in-memory bestScore still reflects this run */
    }
  }
  return best;
}

/** Read the highest level index the player has reached (0 if none). */
export async function loadProgress(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: PROGRESS });
    const n = value ? Number.parseInt(value, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist that the player has reached at least `levelIndex`. */
export async function saveProgress(levelIndex: number): Promise<void> {
  const prev = await loadProgress();
  if (levelIndex <= prev) return;
  try {
    await Preferences.set({ key: PROGRESS, value: String(levelIndex) });
  } catch {
    /* best-effort */
  }
}
