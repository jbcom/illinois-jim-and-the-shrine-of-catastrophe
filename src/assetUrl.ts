/**
 * Resolve a public-asset path against the app's base URL.
 *
 * Vite serves the app under `import.meta.env.BASE_URL` ("/" for local/Capacitor,
 * "/illinois-jim-and-the-shrine-of-catastrophe/" for the GitHub Pages build).
 * Hardcoded absolute paths like "/assets/foo.png" 404 on Pages because they
 * ignore that base. EVERY asset URL the app loads must go through this helper so
 * it resolves correctly in all deploy targets.
 *
 * `BASE_URL` is a build-time string constant — safe to use anywhere, including
 * the pure sim layer (no DOM, no clock, no randomness).
 *
 * @param path asset path WITHOUT a leading slash, e.g. "assets/sprites/jim/idle.webp"
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL; // always ends with "/"
  const clean = path.replace(/^\/+/, "");
  return `${base}${clean}`;
}
