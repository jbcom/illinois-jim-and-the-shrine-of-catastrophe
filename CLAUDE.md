<!-- profile: arcade-game agent-state mobile-android standard-repo v1 -->
# illinois-jim-and-the-shrine-of-catastrophe

A retro arcade game — an Indiana Jones / *Temple of Doom* clone rendered on an
HTML5 canvas — being scaffolded into the arcade-game dialect (Vite + TypeScript +
Capacitor + Biome + Playwright + release-please) and shipped to Android.

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
- Sim purity: `src/sim/**` stays pure TS — no DOM, no `Math.random()`, no `performance.now()`.
- Not yet a git repo / no `package.json` at profile-init time; scaffolding is the first directive block.
