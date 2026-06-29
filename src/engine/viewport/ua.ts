/**
 * User-agent hints — the ONLY signal the deployed web build has to tell an
 * unfolded foldable / tablet browser from a phone browser (the Pages build is
 * always Capacitor platform:"web"). Kept tiny + dependency-free so both the
 * responsive scaler and the orientation policy can read it without pulling in
 * Capacitor. DOM read, so it lives outside the pure deviceProfile module.
 */

/** True when running inside an Android browser (a phone OR an unfolded foldable). */
export function isAndroidUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
