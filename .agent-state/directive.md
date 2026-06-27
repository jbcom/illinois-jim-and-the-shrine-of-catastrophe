# Continuous Work Directive — illinois-jim-and-the-shrine-of-catastrophe

**Status:** ACTIVE
**Owner:** jbogaty

A standalone HTML5 canvas arcade game (Indiana Jones / Temple of Doom clone)
must be scaffolded into the arcade-game dialect: Vite + TypeScript + Capacitor +
Biome + Playwright + release-please, shipped to Android. The current single
`indiana_jones_and_the_temple_of_doom_arcade_clone.html` is the seed; reality
must be brought up to match the profiles already included in CLAUDE.md.

## Scaffold the arcade-game stack — make reality match the profiles

- [ ] `git init`, initial commit of the existing HTML on a feature branch (never main directly)
- [ ] `package.json` (pnpm only) with vite, typescript, @biomejs/biome, @playwright/test, vitest
- [ ] `vite.config.ts`, `tsconfig.json`, `biome.json`
- [ ] `release-please-config.json` + `.release-please-manifest.json` (node)
- [ ] `index.html` + `src/` entry; migrate game logic out of the monolithic HTML into TS modules
- [ ] Decompose into `src/sim/` (pure, deterministic), `src/render/`, `src/ui/`, `src/audio/`, `src/engine/`
- [ ] `tests/unit/`, `tests/browser/`, `tests/visual/`, `tests/e2e/` matching the gates
- [ ] Capacitor: `capacitor.config.ts`, `android/` via `pnpm cap:add android`
- [ ] `.github/workflows/` ci → release → cd (release.yml builds APK, cd deploys)
- [ ] standard-repo root files: AGENTS.md, README.md, CHANGELOG.md, STANDARDS.md, docs/
- [ ] mobile-android: APK in CI, mobile-first controls (touch + landscape)

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — task-batch + PreCompact handle it.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: implement → verify → commit → dispatch reviewers → mark [x] → next.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
