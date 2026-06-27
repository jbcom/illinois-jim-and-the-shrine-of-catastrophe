<!-- profile: arcade-game agent-state mobile-android standard-repo v1 -->
# illinois-jim-and-the-shrine-of-catastrophe

An original mobile-first 2D arcade adventure, built fresh in the arcade-game
dialect (Vite + TypeScript + Capacitor + Biome + Playwright + release-please).
Ships to **GitHub Pages** (web, primary) and **Android APK** (Capacitor).
UI/HUD layer is **SolidJS** (fine-grained reactivity, no VDOM) bridged to an
imperative canvas engine via signals. Responsive scaling is driven by
**Capacitor Device profiles** (`@capacitor/device` + `screen-orientation`),
not CSS media queries alone — phones (both rotations), tablets, foldables.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/agent-state.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

Current state: a single self-contained `indiana_jones_and_the_temple_of_doom_arcade_clone.html`
(~2,376 lines, canvas + requestAnimationFrame). The active directive
(`.agent-state/directive.md`) migrates this into the full arcade-game stack —
the profiles above describe the *target*, which the scaffold work brings reality
up to match.

- **Run:** `pnpm dev` *(after scaffold; today: open the HTML file in a browser)*
- **Test:** `pnpm test` / `pnpm test:browser` / `pnpm test:e2e` *(after scaffold)*
- **Build:** `pnpm build` *(after scaffold)*
- **Deploy:** Android APK via `pnpm cap:sync` + CI release.yml *(see DEPLOYMENT.md once written)*

## Notes

- pnpm only — no `npm install`, no `yarn`, no lockfile churn (commit-gate enforces).
- Develop against the **latest** of everything (deps + Actions pinned to latest SHAs).
- Sim purity: `src/sim/**` stays pure TS — no DOM, no `Math.random()`, no `performance.now()`.
- UI = SolidJS (`src/ui/**`, kebab-case style props, signals as the engine→HUD bridge).
  The engine stays framework-agnostic; only the HUD imports `solid-js`.
- Device profiles: `@capacitor/device` + `@capacitor/screen-orientation` feed the responsive
  scaler; `@capacitor/app` pauses the loop on background; `@capacitor/status-bar` for immersion.
- POC retired to local-only `raw-assets/reference/poc_original.html` (gitignored) — built fresh.
